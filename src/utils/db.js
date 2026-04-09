// ═══════════════════════════════════════════════════════════════════
// IndexedDB persistence
// ═══════════════════════════════════════════════════════════════════

// ─── IndexedDB — constantes ──────────────────────────────────────
export const DB_VER = 1;
export const STORE = "state";
export const SKEY = "appState";

// Meta-base : stocke la liste des profils et l'id actif
export const META_DB_NAME = "check-app-profiles";
export const META_STORE = "profiles";
export const META_KEY = "profilesMeta";

// ─── Ouvre une base par son nom ──────────────────────────────────
export function openNamedDB(name) {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(name, DB_VER);
    req.onerror = function() { reject(req.error); };
    req.onsuccess = function() { resolve(req.result); };
    req.onupgradeneeded = function(e) {
      if (!e.target.result.objectStoreNames.contains(STORE))
        e.target.result.createObjectStore(STORE);
    };
  });
}

// ─── Meta-base : lire / écrire les profils ───────────────────────
export function openMetaDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(META_DB_NAME, 1);
    req.onerror = function() { reject(req.error); };
    req.onsuccess = function() { resolve(req.result); };
    req.onupgradeneeded = function(e) {
      if (!e.target.result.objectStoreNames.contains(META_STORE))
        e.target.result.createObjectStore(META_STORE);
    };
  });
}

export function loadMeta() {
  return openMetaDB().then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(META_STORE, "readonly");
      var req = tx.objectStore(META_STORE).get(META_KEY);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}

export function saveMeta(meta) {
  return openMetaDB().then(function(db) {
    var tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(meta, META_KEY);
  }).catch(function() {});
}

// ─── Lit le contenu brut de l'ancienne base "check-app" ─────────
// Utilisé une seule fois pour la migration au premier lancement.
export function readLegacyDB() {
  return new Promise(function(resolve) {
    var req = indexedDB.open("check-app", 1);
    req.onerror = function() { resolve(null); };
    req.onsuccess = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE)) { resolve(null); return; }
      var tx = db.transaction(STORE, "readonly");
      var r2 = tx.objectStore(STORE).get(SKEY);
      r2.onsuccess = function() { resolve(r2.result || null); };
      r2.onerror = function() { resolve(null); };
    };
    req.onupgradeneeded = function() { resolve(null); };
  }).catch(function() { return null; });
}

// ─── Nom de la base d'un profil ──────────────────────────────────
export function profileDBName(profileId) {
  return "check-app-" + profileId;
}

// ─── Initialise les profils au premier lancement (migration) ─────
// Retourne { profiles, activeId } prêt à l'emploi.
export function initProfiles() {
  return readLegacyDB().then(function(legacy) {
    var newId = Math.random().toString(36).slice(2, 10);
    var profile = { id: newId, name: "Profil 1", createdAt: Date.now() };
    var meta = { profiles: [profile], activeId: newId };
    // Copie les données legacy dans la nouvelle base du profil
    var savePromise = legacy
      ? openNamedDB(profileDBName(newId)).then(function(db) {
          var tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(legacy, SKEY);
        }).catch(function() {})
      : Promise.resolve();
    return savePromise.then(function() {
      return saveMeta(meta).then(function() { return meta; });
    });
  });
}

// ─── Charge l'état d'un profil ───────────────────────────────────
export function loadDB(profileId) {
  return openNamedDB(profileDBName(profileId)).then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).get(SKEY);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}

// ─── Sauvegarde l'état d'un profil ───────────────────────────────
export function saveDB(state, profileId) {
  if (!profileId) return Promise.resolve();
  return openNamedDB(profileDBName(profileId)).then(function(db) {
    var tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, SKEY);
  }).catch(function() {});
}
