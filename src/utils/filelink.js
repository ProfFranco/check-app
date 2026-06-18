// ═══════════════════════════════════════════════════════════════════
// FILELINK — Fichier lié auto-réécrit (palier 2-b)
// ═══════════════════════════════════════════════════════════════════
// Disponible uniquement sur Chrome/Edge desktop (showSaveFilePicker).
// Sur Safari/Firefox : isFileLinkSupported() === false, rien n'est
// proposé à l'utilisateur. Dégradation silencieuse.
//
// Le handle FileSystemFileHandle est persisté dans une base IndexedDB
// dédiée "check-app-filelink" (séparée de db.js pour ne pas polluer
// les stores métier). Les handles sont les seuls objets sérialisables
// par IDB qui conservent les permissions accordées par l'utilisateur.
//
// Aucune dépendance React. Testable en Node pour les fonctions pures.
// ═══════════════════════════════════════════════════════════════════

// ─── Constantes de la base dédiée ───────────────────────────────
const FILELINK_DB_NAME  = "check-app-filelink";
const FILELINK_DB_VER   = 1;
const FILELINK_STORE    = "filelink";
const FILELINK_KEY      = "handle";

// ═══════════════════════════════════════════════════════════════════
// FONCTIONS PURES (testables en Node)
// ═══════════════════════════════════════════════════════════════════

// ─── Détection de support ────────────────────────────────────────
// Retourne true uniquement si showSaveFilePicker est disponible.
// Sur Safari/Firefox/mobile : false.
export function isFileLinkSupported() {
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}

// ─── Nom d'affichage depuis un handle ────────────────────────────
// Retourne le nom du fichier, ou "(fichier inconnu)" si null.
export function displayName(handle) {
  if (!handle || typeof handle.name !== "string") return "(fichier inconnu)";
  return handle.name;
}

// ═══════════════════════════════════════════════════════════════════
// COUCHE INDEXEDDB (non testable en Node sans mock)
// ═══════════════════════════════════════════════════════════════════

// ─── Ouvre la base dédiée ────────────────────────────────────────
function openFilelinkDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(FILELINK_DB_NAME, FILELINK_DB_VER);
    req.onerror   = function() { reject(req.error); };
    req.onsuccess = function() { resolve(req.result); };
    req.onupgradeneeded = function(e) {
      if (!e.target.result.objectStoreNames.contains(FILELINK_STORE)) {
        e.target.result.createObjectStore(FILELINK_STORE);
      }
    };
  });
}

// ─── Persiste le handle ──────────────────────────────────────────
export function saveHandle(handle) {
  return openFilelinkDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx  = db.transaction(FILELINK_STORE, "readwrite");
      var req = tx.objectStore(FILELINK_STORE).put(handle, FILELINK_KEY);
      req.onsuccess = function() { resolve(); };
      req.onerror   = function() { reject(req.error); };
    });
  }).catch(function(e) {
    console.warn("filelink: saveHandle failed", e);
  });
}

// ─── Relit le handle depuis IDB ──────────────────────────────────
// Retourne le handle ou null si absent / erreur.
export function loadHandle() {
  return openFilelinkDB().then(function(db) {
    return new Promise(function(resolve) {
      var tx  = db.transaction(FILELINK_STORE, "readonly");
      var req = tx.objectStore(FILELINK_STORE).get(FILELINK_KEY);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror   = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}

// ─── Supprime le handle (délier) ─────────────────────────────────
export function clearHandle() {
  return openFilelinkDB().then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(FILELINK_STORE, "readwrite");
      tx.objectStore(FILELINK_STORE).delete(FILELINK_KEY);
      tx.oncomplete = function() { resolve(); };
      tx.onerror    = function() { resolve(); };
    });
  }).catch(function() {});
}

// ═══════════════════════════════════════════════════════════════════
// GESTION DES PERMISSIONS
// ═══════════════════════════════════════════════════════════════════

// ─── Vérifie la permission sans la demander ───────────────────────
// Retourne "granted" | "prompt" | "denied".
// Si le handle ne supporte pas queryPermission (vieux navigateur),
// retourne "prompt" par sécurité.
export async function queryPermission(handle) {
  if (!handle || typeof handle.queryPermission !== "function") return "prompt";
  try {
    return await handle.queryPermission({ mode: "readwrite" });
  } catch (_e) {
    return "prompt";
  }
}

// ─── Demande la permission ───────────────────────────────────────
// DOIT être appelé dans un user gesture (onclick).
// Retourne "granted" | "prompt" | "denied".
export async function requestPermission(handle) {
  if (!handle || typeof handle.requestPermission !== "function") return "denied";
  try {
    return await handle.requestPermission({ mode: "readwrite" });
  } catch (_e) {
    return "denied";
  }
}

// ═══════════════════════════════════════════════════════════════════
// OPÉRATIONS FICHIER
// ═══════════════════════════════════════════════════════════════════

// ─── Ouvre le sélecteur et retourne le handle ────────────────────
// DOIT être appelé dans un user gesture.
// Retourne le handle ou null si l'utilisateur annule.
export async function pickSaveFile() {
  if (!isFileLinkSupported()) return null;
  try {
    var handle = await window.showSaveFilePicker({
      suggestedName: "check_sauvegarde_liee.json",
      types: [{
        description: "Sauvegarde CHECK",
        accept: { "application/json": [".json"] },
      }],
    });
    return handle;
  } catch (e) {
    // AbortError = l'utilisateur a annulé → pas une erreur à signaler
    if (e && e.name === "AbortError") return null;
    throw e;
  }
}

// ─── Écrit dans le fichier lié ───────────────────────────────────
// Retourne { ok: true } ou { ok: false, reason: "permission" | "error" }.
// N'affiche aucune alerte — c'est à l'appelant de décider quoi faire.
export async function writeToLinkedFile(handle, content) {
  if (!handle) return { ok: false, reason: "no-handle" };

  // Vérifie la permission sans la redemander (pas un user gesture ici)
  var perm = await queryPermission(handle);
  if (perm !== "granted") return { ok: false, reason: "permission" };

  try {
    var writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { ok: true };
  } catch (e) {
    console.warn("filelink: writeToLinkedFile failed", e);
    return { ok: false, reason: "error", detail: e && e.message };
  }
}
