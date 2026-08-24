// ═══════════════════════════════════════════════════════════════════
// TROUSSEAU PARTAGÉ — lecture du trousseau Sycomore (P-H2)
// ═══════════════════════════════════════════════════════════════════
// Depuis P-F5, CHECK est servi sous /check/ sur la MÊME origine que Sycomore
// (même domaine, même port) — l'isolation IndexedDB étant par origine et non
// par chemin, les deux applications partagent naturellement la même base.
//
// Ce module lit/écrit le store IndexedDB déjà créé par Sycomore
// (frontend/src/identityPack.js, P-H1) : base "sycomore-local", store
// "identityPack", clé "pack". Les noms sont dupliqués ici en dur plutôt
// qu'importés — deux dépôts distincts — mais DOIVENT rester synchronisés
// avec l'autre côté si jamais ils changent là-bas.
//
// En développement (origine CHECK ≠ origine Sycomore) ou sur un éventuel
// build hébergé ailleurs (ex. GitHub Pages), cette base n'existe simplement
// pas sur cette origine : toutes les fonctions ci-dessous résolvent alors
// vers "absent", sans erreur — c'est le repli attendu, pas un cas spécial.
//
// Le pack lu ici est déjà en clair (déchiffré par Sycomore au déverrouillage
// du trousseau) : ce module ne fait aucune cryptographie lui-même pour la
// lecture. Seul le déverrouillage direct depuis CHECK (quand le cache est
// absent, cf. App.jsx) rechiffre/déchiffre via ./crypto.js.
// ═══════════════════════════════════════════════════════════════════

var DB_NAME = "sycomore-local";
var STORE_NAME = "identityPack";
var ENTRY_KEY = "pack";

function openDatabase() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function(e) {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME))
        e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

// Retourne le pack partagé (v2 uniquement — un v1 legacy n'a pas de secrets
// et n'a rien à offrir à CHECK) ou null si absent/inexistant/erreur.
export function lireTrousseauPartage() {
  return openDatabase().then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(STORE_NAME, "readonly");
      var req = tx.objectStore(STORE_NAME).get(ENTRY_KEY);
      req.onsuccess = function() {
        var pack = req.result;
        resolve(pack && pack.version === 2 ? pack : null);
      };
      req.onerror = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}

// Écrit le pack déchiffré dans le store partagé — utilisé uniquement après un
// déverrouillage fait depuis CHECK lui-même (App.jsx), pour que Sycomore en
// bénéficie aussi sur cet appareil sans redéverrouiller.
export function ecrireTrousseauPartage(pack) {
  return openDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(pack, ENTRY_KEY);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
  }).catch(function() {});
}
