// ═══════════════════════════════════════════════════════════════════
// BACKUP — Sauvegarde / restauration complète multi-profils
// ═══════════════════════════════════════════════════════════════════
// Filet de sécurité universel (palier 2-a). Indépendant de la sync.
// Les fonctions pures (wrap/parse/validate) sont testables en Node.
// Les fonctions d'agrégation (collect/restore) dépendent de db.js.
// ═══════════════════════════════════════════════════════════════════

import {
  loadMeta, saveMeta, loadDB, saveDB, profileDBName, openNamedDB,
} from "./db";

// ─── Constantes d'enveloppe ──────────────────────────────────────
export const BACKUP_FORMAT_VERSION = 1;
const BACKUP_MARKER = "_checkBackup";

// ═══════════════════════════════════════════════════════════════════
// FONCTIONS PURES (testables en Node, sans IndexedDB)
// ═══════════════════════════════════════════════════════════════════

// ─── Construit l'enveloppe de backup ─────────────────────────────
// meta    : { profiles: [{id, name, createdAt}], activeId }
// states  : { [profileId]: appState }  (résultat de buildAppState par profil)
// appVersion : chaîne de version de l'app (pour info / migration future)
export function wrapBackup(meta, states, appVersion) {
  var profiles = (meta && meta.profiles) ? meta.profiles : [];
  var packed = profiles.map(function(p) {
    return {
      meta: { id: p.id, name: p.name, createdAt: p.createdAt || null },
      state: states[p.id] || null,
    };
  });
  var envelope = {};
  envelope[BACKUP_MARKER] = {
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    profileCount: packed.length,
    activeId: (meta && meta.activeId) ? meta.activeId : null,
    appVersion: appVersion || null,
  };
  envelope.profiles = packed;
  return envelope;
}

// ─── Détecte et normalise un fichier importé ─────────────────────
// Retourne une forme unifiée :
//   { kind: "multi", profiles: [{meta, state}], activeId, info }
//   { kind: "mono",  state: <appState> }          (ancien format mono-profil)
//   { kind: "invalid" }
export function parseBackup(raw) {
  if (!raw || typeof raw !== "object") return { kind: "invalid" };

  // Format multi-profils : présence du marqueur _checkBackup + tableau profiles
  if (raw[BACKUP_MARKER] && Array.isArray(raw.profiles)) {
    return {
      kind: "multi",
      profiles: raw.profiles,
      activeId: raw[BACKUP_MARKER].activeId || null,
      info: raw[BACKUP_MARKER],
    };
  }

  // Ancien format mono-profil : un appState direct (présence de exams/students)
  if (Array.isArray(raw.exams) || Array.isArray(raw.students)) {
    return { kind: "mono", state: raw };
  }

  return { kind: "invalid" };
}

// ─── Valide un backup parsé ──────────────────────────────────────
// Retourne { valid, errors[], warnings[], summary }
// summary : pour affichage dans la modale (nb profils, noms, vides…)
export function validateBackup(parsed, currentIsEmpty) {
  var errors = [];
  var warnings = [];

  if (!parsed || parsed.kind === "invalid") {
    errors.push("Fichier non reconnu (ni backup multi-profils, ni export CHECK).");
    return { valid: false, errors: errors, warnings: warnings, summary: null };
  }

  if (parsed.kind === "mono") {
    var monoVide = !(parsed.state.exams || []).length && !(parsed.state.students || []).length;
    if (monoVide && !currentIsEmpty) {
      warnings.push("Ce fichier ne contient ni DS ni élève. La restauration effacerait le travail actuel.");
    }
    return {
      valid: true,
      errors: errors,
      warnings: warnings,
      summary: { kind: "mono", profileCount: 1, profiles: [{ name: "(import simple)", empty: monoVide }] },
    };
  }

  // kind === "multi"
  if (parsed.profiles.length === 0) {
    errors.push("Le backup ne contient aucun profil.");
    return { valid: false, errors: errors, warnings: warnings, summary: null };
  }

  var profilesSummary = parsed.profiles.map(function(p) {
    var st = p.state || {};
    var empty = !((st.exams || []).length) && !((st.students || []).length);
    var dsCount = (st.exams || []).length;
    return {
      id: p.meta ? p.meta.id : null,
      name: (p.meta && p.meta.name) ? p.meta.name : "(sans nom)",
      dsCount: dsCount,
      empty: empty,
    };
  });

  var tousVides = profilesSummary.every(function(p) { return p.empty; });
  if (tousVides && !currentIsEmpty) {
    warnings.push("Tous les profils du backup sont vides. La restauration effacerait le travail actuel.");
  }

  // Détection d'IDs manquants (peut gêner la fusion)
  var sansId = profilesSummary.filter(function(p) { return !p.id; }).length;
  if (sansId > 0) {
    warnings.push(sansId + " profil(s) sans identifiant — un nouvel id sera généré à la restauration.");
  }

  return {
    valid: true,
    errors: errors,
    warnings: warnings,
    summary: { kind: "multi", profileCount: profilesSummary.length, profiles: profilesSummary },
  };
}

// ─── Génère un id de profil (même schéma que db.js) ──────────────
export function genProfileId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Nom de fichier de backup horodaté ───────────────────────────
export function backupFilename() {
  var d = new Date();
  var p = function(n) { return String(n).padStart(2, "0"); };
  var stamp = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate())
            + "_" + p(d.getHours()) + "h" + p(d.getMinutes());
  return "check_backup_" + stamp + ".json";
}

// ═══════════════════════════════════════════════════════════════════
// AGRÉGATION (dépend de db.js — non testable en Node sans IndexedDB)
// ═══════════════════════════════════════════════════════════════════

// ─── Collecte tous les profils en un objet de backup ─────────────
// activeFlush : { id, state } — le profil actif AVANT collecte, déjà
//   écrit en base synchroniquement par l'appelant (cf. anti-pattern 2.1).
//   On le passe ici uniquement pour garantir qu'il est inclus même si
//   loadDB renvoyait une version legèrement en retard.
export async function collectAllProfiles(appVersion, activeFlush) {
  var meta = await loadMeta();
  if (!meta || !Array.isArray(meta.profiles)) {
    meta = { profiles: [], activeId: null };
  }

  var states = {};
  for (var i = 0; i < meta.profiles.length; i++) {
    var id = meta.profiles[i].id;
    if (activeFlush && activeFlush.id === id && activeFlush.state) {
      states[id] = activeFlush.state;
    } else {
      states[id] = await loadDB(id);
    }
  }

  return wrapBackup(meta, states, appVersion);
}

// ─── Restauration : REMPLACER ────────────────────────────────────
// Efface la méta et réécrit profils + états depuis le backup.
// Retourne { activeId, profiles } (nouvelle méta à pousser dans React).
export async function restoreReplace(parsedMulti) {
  var newProfiles = [];
  for (var i = 0; i < parsedMulti.profiles.length; i++) {
    var p = parsedMulti.profiles[i];
    var id = (p.meta && p.meta.id) ? p.meta.id : genProfileId();
    var name = (p.meta && p.meta.name) ? p.meta.name : "Profil " + (i + 1);
    var createdAt = (p.meta && p.meta.createdAt) ? p.meta.createdAt : Date.now();

    if (p.state) {
      await saveDB(p.state, id);
    }
    newProfiles.push({ id: id, name: name, createdAt: createdAt });
  }

  var activeId = parsedMulti.activeId;
  var activeStillThere = newProfiles.some(function(p) { return p.id === activeId; });
  if (!activeStillThere) {
    activeId = newProfiles.length ? newProfiles[0].id : null;
  }

  var meta = { profiles: newProfiles, activeId: activeId };
  await saveMeta(meta);
  return meta;
}

// ─── Restauration : FUSIONNER ────────────────────────────────────
// Le fichier gagne en cas de collision d'id (last-write-wins,
// cohérent avec la sync GitHub). Les profils locaux absents du
// fichier sont conservés tels quels.
export async function restoreMerge(parsedMulti) {
  var existing = await loadMeta();
  if (!existing || !Array.isArray(existing.profiles)) {
    existing = { profiles: [], activeId: null };
  }

  var byId = {};
  existing.profiles.forEach(function(p) { byId[p.id] = p; });

  for (var i = 0; i < parsedMulti.profiles.length; i++) {
    var p = parsedMulti.profiles[i];
    var id = (p.meta && p.meta.id) ? p.meta.id : genProfileId();
    var name = (p.meta && p.meta.name) ? p.meta.name : "Profil importé " + (i + 1);
    var createdAt = (p.meta && p.meta.createdAt) ? p.meta.createdAt
                  : (byId[id] ? byId[id].createdAt : Date.now());

    if (p.state) {
      await saveDB(p.state, id);   // écrase l'état si l'id existait
    }
    byId[id] = { id: id, name: name, createdAt: createdAt };
  }

  var mergedProfiles = Object.keys(byId).map(function(k) { return byId[k]; });
  var activeId = existing.activeId
              || (mergedProfiles.length ? mergedProfiles[0].id : null);

  var meta = { profiles: mergedProfiles, activeId: activeId };
  await saveMeta(meta);
  return meta;
}
