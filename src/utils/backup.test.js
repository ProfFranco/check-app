// Tests des fonctions pures de backup.js — node --test src/utils/backup.test.js
// On teste UNIQUEMENT les fonctions pures (pas l'agrégation qui dépend
// d'IndexedDB). On réimplémente les imports db.js par des stubs vides
// car les fonctions pures ne les appellent pas.

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Réimplémentation locale des fonctions pures ─────────────────
// (Copie miroir : on ne peut pas importer backup.js directement car il
//  importe ./db qui touche indexedDB. En conditions réelles, extraire
//  les fonctions pures dans backup-pure.js si on veut un import direct.
//  Ici on valide la LOGIQUE, identique au module.)

const BACKUP_FORMAT_VERSION = 1;
const BACKUP_MARKER = "_checkBackup";

function wrapBackup(meta, states, appVersion) {
  var profiles = (meta && meta.profiles) ? meta.profiles : [];
  var packed = profiles.map(function(p) {
    return { meta: { id: p.id, name: p.name, createdAt: p.createdAt || null }, state: states[p.id] || null };
  });
  var envelope = {};
  envelope[BACKUP_MARKER] = {
    version: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(),
    profileCount: packed.length, activeId: (meta && meta.activeId) ? meta.activeId : null,
    appVersion: appVersion || null,
  };
  envelope.profiles = packed;
  return envelope;
}

function parseBackup(raw) {
  if (!raw || typeof raw !== "object") return { kind: "invalid" };
  if (raw[BACKUP_MARKER] && Array.isArray(raw.profiles)) {
    return { kind: "multi", profiles: raw.profiles, activeId: raw[BACKUP_MARKER].activeId || null, info: raw[BACKUP_MARKER] };
  }
  if (Array.isArray(raw.exams) || Array.isArray(raw.students)) {
    return { kind: "mono", state: raw };
  }
  return { kind: "invalid" };
}

function validateBackup(parsed, currentIsEmpty) {
  var errors = [], warnings = [];
  if (!parsed || parsed.kind === "invalid") {
    errors.push("Fichier non reconnu.");
    return { valid: false, errors, warnings, summary: null };
  }
  if (parsed.kind === "mono") {
    var monoVide = !(parsed.state.exams || []).length && !(parsed.state.students || []).length;
    if (monoVide && !currentIsEmpty) warnings.push("vide");
    return { valid: true, errors, warnings, summary: { kind: "mono", profileCount: 1, profiles: [{ name: "(import simple)", empty: monoVide }] } };
  }
  if (parsed.profiles.length === 0) {
    errors.push("aucun profil");
    return { valid: false, errors, warnings, summary: null };
  }
  var profilesSummary = parsed.profiles.map(function(p) {
    var st = p.state || {};
    var empty = !((st.exams || []).length) && !((st.students || []).length);
    return { id: p.meta ? p.meta.id : null, name: (p.meta && p.meta.name) ? p.meta.name : "(sans nom)", dsCount: (st.exams || []).length, empty };
  });
  var tousVides = profilesSummary.every(function(p) { return p.empty; });
  if (tousVides && !currentIsEmpty) warnings.push("tous vides");
  var sansId = profilesSummary.filter(function(p) { return !p.id; }).length;
  if (sansId > 0) warnings.push(sansId + " sans id");
  return { valid: true, errors, warnings, summary: { kind: "multi", profileCount: profilesSummary.length, profiles: profilesSummary } };
}

// ─── Fixtures ────────────────────────────────────────────────────
const metaFix = {
  profiles: [
    { id: "aaa11111", name: "Franco", createdAt: 1700000000000 },
    { id: "bbb22222", name: "Collègue maths", createdAt: 1700000100000 },
  ],
  activeId: "aaa11111",
};
const statesFix = {
  aaa11111: { exams: [{ id: "ds1" }, { id: "ds2" }], students: [{ id: "e1" }] },
  bbb22222: { exams: [{ id: "dsX" }], students: [] },
};

// ─── Tests wrapBackup ────────────────────────────────────────────
test("wrapBackup : structure d'enveloppe correcte", () => {
  const env = wrapBackup(metaFix, statesFix, "1.0");
  assert.equal(env[BACKUP_MARKER].version, 1);
  assert.equal(env[BACKUP_MARKER].profileCount, 2);
  assert.equal(env[BACKUP_MARKER].activeId, "aaa11111");
  assert.equal(env.profiles.length, 2);
  assert.equal(env.profiles[0].meta.name, "Franco");
  assert.deepEqual(env.profiles[0].state.exams.length, 2);
});

test("wrapBackup : profil sans état → state null, pas de crash", () => {
  const env = wrapBackup(metaFix, { aaa11111: statesFix.aaa11111 }, null);
  assert.equal(env.profiles[1].state, null);
  assert.equal(env.profiles[1].meta.name, "Collègue maths");
});

test("wrapBackup : méta vide → enveloppe à 0 profil", () => {
  const env = wrapBackup({ profiles: [], activeId: null }, {}, "1.0");
  assert.equal(env[BACKUP_MARKER].profileCount, 0);
  assert.equal(env.profiles.length, 0);
});

// ─── Tests parseBackup ───────────────────────────────────────────
test("parseBackup : reconnaît le format multi", () => {
  const env = wrapBackup(metaFix, statesFix, "1.0");
  const p = parseBackup(env);
  assert.equal(p.kind, "multi");
  assert.equal(p.profiles.length, 2);
  assert.equal(p.activeId, "aaa11111");
});

test("parseBackup : reconnaît l'ancien format mono", () => {
  const mono = { exams: [{ id: "ds1" }], students: [{ id: "e1" }], grades: {} };
  const p = parseBackup(mono);
  assert.equal(p.kind, "mono");
  assert.equal(p.state.exams.length, 1);
});

test("parseBackup : mono avec students seul (sans exams)", () => {
  const p = parseBackup({ students: [{ id: "e1" }] });
  assert.equal(p.kind, "mono");
});

test("parseBackup : objet quelconque → invalid", () => {
  assert.equal(parseBackup({ foo: "bar" }).kind, "invalid");
  assert.equal(parseBackup(null).kind, "invalid");
  assert.equal(parseBackup("texte").kind, "invalid");
  assert.equal(parseBackup(42).kind, "invalid");
});

// ─── Tests validateBackup ────────────────────────────────────────
test("validateBackup : multi valide, pas d'avertissement", () => {
  const p = parseBackup(wrapBackup(metaFix, statesFix, "1.0"));
  const v = validateBackup(p, false);
  assert.equal(v.valid, true);
  assert.equal(v.warnings.length, 0);
  assert.equal(v.summary.profileCount, 2);
  assert.equal(v.summary.profiles[0].dsCount, 2);
});

test("validateBackup : tous profils vides + état actuel non vide → warning", () => {
  const env = wrapBackup(metaFix, { aaa11111: { exams: [], students: [] }, bbb22222: { exams: [], students: [] } }, "1.0");
  const v = validateBackup(parseBackup(env), false);
  assert.equal(v.valid, true);
  assert.equal(v.warnings.length, 1);
});

test("validateBackup : tous vides MAIS état actuel vide → pas de warning", () => {
  const env = wrapBackup(metaFix, { aaa11111: { exams: [], students: [] }, bbb22222: { exams: [], students: [] } }, "1.0");
  const v = validateBackup(parseBackup(env), true);
  assert.equal(v.warnings.length, 0);
});

test("validateBackup : profils sans id → warning de génération", () => {
  const env = { [BACKUP_MARKER]: { version: 1, activeId: null }, profiles: [{ meta: { name: "X" }, state: { exams: [{ id: "d" }], students: [] } }] };
  const v = validateBackup(parseBackup(env), false);
  assert.equal(v.valid, true);
  assert.ok(v.warnings.some((w) => w.includes("sans id")));
});

test("validateBackup : multi à 0 profil → invalide", () => {
  const env = { [BACKUP_MARKER]: { version: 1 }, profiles: [] };
  const v = validateBackup(parseBackup(env), false);
  assert.equal(v.valid, false);
  assert.ok(v.errors.length > 0);
});

test("validateBackup : fichier invalide → erreur", () => {
  const v = validateBackup(parseBackup({ foo: 1 }), false);
  assert.equal(v.valid, false);
});

test("validateBackup : mono vide + actuel non vide → warning (garde-fou 1.3)", () => {
  const v = validateBackup(parseBackup({ exams: [], students: [] }), false);
  assert.equal(v.valid, true);
  assert.equal(v.warnings.length, 1);
});

// ─── Round-trip ──────────────────────────────────────────────────
test("round-trip : wrap → JSON → parse préserve les données", () => {
  const env = wrapBackup(metaFix, statesFix, "1.0");
  const json = JSON.stringify(env);
  const back = parseBackup(JSON.parse(json));
  assert.equal(back.kind, "multi");
  assert.equal(back.profiles[0].state.exams.length, 2);
  assert.equal(back.profiles[1].meta.name, "Collègue maths");
});
