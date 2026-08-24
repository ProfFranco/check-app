// ═══════════════════════════════════════════════════════════════════
// SYNC — Synchronisation inter-appareils via adapter abstrait
// ═══════════════════════════════════════════════════════════════════
// Aucune dépendance React. Testable en Node avec node --test.
// ═══════════════════════════════════════════════════════════════════

import { decryptSnapshot, encryptSnapshot } from "./crypto";

// ─── Clés exclues du hash de contenu ────────────────────────────
const EXCLUDED = new Set([
  "_syncMeta", "settingsTab", "uiScale", "mode", "showSettings",
  "showMore", "showDebug", "showApropos", "showChangelog", "featOpen",
  "collapsed", "collapsedExams", "showGroupes", "showSearch",
  "searchTerm", "confirmDelete", "showDsMenu", "showProfileMenu",
  "editingProfileId", "editingProfileName", "newProfileName",
  "newRemLabel", "newRemIcon", "newRemMalus", "syncStatus",
  "syncDate", "syncLoading", "dbLoaded",
]);

// ─── Fonctions pures ─────────────────────────────────────────────

export function contentHash(snapshot) {
  const filtered = {};
  for (const key of Object.keys(snapshot).sort()) {
    if (!EXCLUDED.has(key)) filtered[key] = snapshot[key];
  }
  const str = JSON.stringify(filtered);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export function diagnoseSyncStatus(localHash, lastKnownVersion, lastPushedHash, remoteVersion) {
  if (lastKnownVersion === null) {
    return remoteVersion === null ? "synced" : "remote-ahead";
  }
  const localDiverged  = (localHash !== lastPushedHash);
  const remoteDiverged = (remoteVersion !== lastKnownVersion);
  if (!localDiverged && !remoteDiverged) return "synced";
  if ( localDiverged && !remoteDiverged) return "local-ahead";
  if (!localDiverged &&  remoteDiverged) return "remote-ahead";
  return "conflict";
}

// ─── Adapter GitHub ──────────────────────────────────────────────

function githubAdapter(config) {
  const { pat, repo } = config;
  if (!pat || !repo) throw new Error("Config GitHub incomplète");

  const baseUrl = "https://api.github.com/repos/" + repo + "/contents";
  const headers = {
    "Authorization": "token " + pat,
    "Accept": "application/vnd.github+json",
  };

  function pathFor(profileId) {
    return "check-data/profil-" + profileId + ".json";
  }

  return {
    backend: "github",
    _repo: repo,
    _headers: headers,
    describe: function() { return "GitHub · " + repo; },

    async head(profileId) {
      const r = await fetch(baseUrl + "/" + pathFor(profileId), { headers });
      if (r.status === 404) return { version: null, pushedAt: null };
      if (!r.ok) throw new Error("HEAD " + r.status);
      const data = await r.json();
      return { version: data.sha, pushedAt: null };
    },

    async pull(profileId) {
      const r = await fetch(baseUrl + "/" + pathFor(profileId), { headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("PULL " + r.status);
      const data = await r.json();
      const json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      const snapshot = JSON.parse(json);
      return {
        snapshot,
        version: data.sha,
        meta: snapshot._syncMeta || null,
      };
    },

    async push(profileId, snapshot, expectedVersion, pushOptions) {
      const body = {
        message: "CHECK sync " + new Date().toLocaleString("fr-FR"),
        content: btoa(unescape(encodeURIComponent(JSON.stringify(snapshot)))),
      };
      if (expectedVersion) body.sha = expectedVersion;

      const r = await fetch(baseUrl + "/" + pathFor(profileId), {
        method: "PUT",
        headers: Object.assign({}, headers, { "Content-Type": "application/json" }),
        body: JSON.stringify(body),
        keepalive: !!(pushOptions && pushOptions.keepalive),
      });

      if (r.status === 409 || r.status === 422) {
        return { ok: false, conflict: true };
      }
      if (!r.ok) throw new Error("PUSH " + r.status);
      const data = await r.json();
      return { ok: true, newVersion: data.content.sha };
    },
  };
}

// ─── Adapter Sycomore ────────────────────────────────────────────
//
// Même interface que githubAdapter, deux différences internes :
//   1. Le snapshot est chiffré côté client avant d'être poussé (le serveur
//      ne stocke qu'un opaque) et déchiffré au pull. Le cœur syncPush /
//      syncPull / contentHash reste inchangé : il ne voit que du clair.
//   2. Le serveur versionne par entier croissant là où GitHub versionne par
//      SHA. Les versions sont converties en chaîne à la frontière : le state
//      localStorage ne stocke que des chaînes, et diagnoseSyncStatus compare
//      avec !== — un entier y divergerait systématiquement de sa chaîne.

function sycomoreAdapter(config) {
  const { token, passphrase } = config;
  const apiBase = (config.apiBase || "").replace(/\/+$/, "");
  if (!token) throw new Error("Config Sycomore incomplète : jeton d'accès manquant");
  if (!passphrase) throw new Error("Config Sycomore incomplète : phrase secrète manquante");

  // apiBase vide = même origine que CHECK, servi derrière le nginx qui expose
  // l'API sous /api (cas de la production). Renseigné, il est pris tel quel
  // comme racine d'API — ce qui permet de viser un uvicorn local en dev.
  const root = (apiBase || "/api") + "/check-sync";
  const headers = { "Authorization": "Bearer " + token };

  function urlFor(profileId, suffix) {
    return root + "/" + encodeURIComponent(profileId) + (suffix || "");
  }

  async function request(url, options) {
    const r = await fetch(url, options);
    if (r.status === 401) {
      const err = new Error("Session Sycomore expirée — reconnexion nécessaire");
      err.authRequired = true;
      throw err;
    }
    return r;
  }

  return {
    backend: "sycomore",
    describe: function() { return "Sycomore · " + (apiBase || "même origine"); },

    async head(profileId) {
      const r = await request(urlFor(profileId, "/head"), { headers });
      if (!r.ok) throw new Error("HEAD " + r.status);
      const data = await r.json();
      // version 0 = aucune sauvegarde : équivalent du 404 GitHub
      return { version: data.version ? String(data.version) : null, pushedAt: null };
    },

    async pull(profileId) {
      const r = await request(urlFor(profileId), { headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("PULL " + r.status);
      const data = await r.json();
      const snapshot = await decryptSnapshot(JSON.parse(data.payload), passphrase);
      return {
        snapshot,
        version: String(data.version),
        meta: snapshot._syncMeta || null,
      };
    },

    async push(profileId, snapshot, expectedVersion, pushOptions) {
      const envelope = await encryptSnapshot(snapshot, passphrase);
      const r = await request(urlFor(profileId), {
        method: "PUT",
        headers: Object.assign({}, headers, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          payload: JSON.stringify(envelope),
          expected_version: expectedVersion ? parseInt(expectedVersion, 10) : 0,
          device_name: config.deviceName || null,
        }),
        keepalive: !!(pushOptions && pushOptions.keepalive),
      });

      if (r.status === 409) return { ok: false, conflict: true };
      if (!r.ok) throw new Error("PUSH " + r.status);
      const data = await r.json();
      return { ok: true, newVersion: String(data.version) };
    },

    // Snapshots : le serveur versionne et purge lui-même (rétention 30),
    // il n'y a donc pas d'équivalent de maintainSnapshots à appeler ici.
    async listSnapshots(profileId) {
      const r = await request(urlFor(profileId, "/snapshots"), { headers });
      if (!r.ok) return [];
      const data = await r.json();
      return data.map(function(s) {
        return {
          slug: String(s.version),
          version: s.version,
          date: s.created_at ? String(s.created_at).slice(0, 10) : null,
          deviceName: s.device_name || null,
        };
      });
    },

    async readSnapshot(profileId, slug) {
      const r = await request(urlFor(profileId) + "?version=" + encodeURIComponent(slug), { headers });
      if (!r.ok) return null;
      const data = await r.json();
      try {
        return await decryptSnapshot(JSON.parse(data.payload), passphrase);
      } catch (_e) { return null; }
    },
  };
}

// ─── Factory d'adapter ───────────────────────────────────────────

export function createSyncAdapter(config) {
  const { backend } = config;
  if (backend === "github") return githubAdapter(config);
  if (backend === "sycomore") return sycomoreAdapter(config);
  throw new Error("Backend inconnu : " + backend);
}

// ─── State localStorage ──────────────────────────────────────────

function lsPrefix(profileId) {
  return "check_sync_" + profileId + "_";
}

export function getLocalSyncState(profileId) {
  const p = lsPrefix(profileId);
  let deviceId = localStorage.getItem(p + "deviceId");
  if (!deviceId) {
    deviceId = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(p + "deviceId", deviceId);
    localStorage.setItem(p + "deviceName", "Appareil " + deviceId.slice(0, 4));
  }
  return {
    lastKnownVersion:   localStorage.getItem(p + "lastKnownVersion")   || null,
    lastKnownPushedAt:  localStorage.getItem(p + "lastKnownPushedAt")  || null,
    lastPushedHash:     localStorage.getItem(p + "lastPushedHash")     || null,
    deviceId,
    deviceName: localStorage.getItem(p + "deviceName") || ("Appareil " + deviceId.slice(0, 4)),
  };
}

function updateLocalSyncState(profileId, updates) {
  const p = lsPrefix(profileId);
  if (updates.lastKnownVersion !== undefined)
    localStorage.setItem(p + "lastKnownVersion", updates.lastKnownVersion);
  if (updates.lastKnownPushedAt !== undefined && updates.lastKnownPushedAt !== null)
    localStorage.setItem(p + "lastKnownPushedAt", updates.lastKnownPushedAt);
  if (updates.lastPushedHash !== undefined)
    localStorage.setItem(p + "lastPushedHash", updates.lastPushedHash);
}

export function setDeviceName(profileId, name) {
  localStorage.setItem(lsPrefix(profileId) + "deviceName", name);
}

export function clearLocalSyncState(profileId) {
  const p = lsPrefix(profileId);
  ["lastKnownVersion", "lastKnownPushedAt", "lastPushedHash", "deviceId", "deviceName"]
    .forEach(function(k) { localStorage.removeItem(p + k); });
}

// ─── Opérations async ────────────────────────────────────────────

export async function syncCheck(adapter, localState, profileId) {
  const { lastKnownVersion, lastPushedHash } = getLocalSyncState(profileId);
  const { version: remoteVersion } = await adapter.head(profileId);
  const localHash = contentHash(localState);
  const status = diagnoseSyncStatus(localHash, lastKnownVersion, lastPushedHash, remoteVersion);
  return { status, remoteVersion, lastKnownVersion, remoteMeta: null };
}

// `options.keepalive` (P-H3) : demande un fetch qui survit à la fermeture/mise
// en arrière-plan de l'onglet (flush sur pagehide/visibilitychange, cf. App.jsx).
// Limite du navigateur : un fetch keepalive plafonne le corps à ~64 Ko, très en
// dessous des 15 Mo autorisés côté serveur — sur un gros profil, ce push peut
// échouer silencieusement. Le filet reste le push debouncé normal au retour au
// premier plan ; ne pas compter sur keepalive comme garantie de livraison.
export async function syncPush(adapter, localState, profileId, options) {
  options = options || {};
  const { lastKnownVersion, deviceId, deviceName } = getLocalSyncState(profileId);

  // Retirer _syncMeta avant de calculer le hash
  const snapshotSansMeta = Object.assign({}, localState);
  delete snapshotSansMeta._syncMeta;
  const hash = contentHash(snapshotSansMeta);

  const snapshot = Object.assign({}, snapshotSansMeta, {
    _syncMeta: {
      version: 1,
      pushedAt: new Date().toISOString(),
      pushedBy: deviceId,
      pushedByName: deviceName,
      contentHash: hash,
    },
  });

  // Force : récupérer le SHA courant pour écraser sans conflit
  let expectedVersion = lastKnownVersion;
  if (options.force) {
    const head = await adapter.head(profileId);
    expectedVersion = head.version;
  }

  const result = await adapter.push(profileId, snapshot, expectedVersion, { keepalive: !!options.keepalive });

  if (result.ok) {
    updateLocalSyncState(profileId, {
      lastKnownVersion: result.newVersion,
      lastKnownPushedAt: new Date().toISOString(),
      lastPushedHash: hash,
    });
  }

  return result;
}

export async function syncPull(adapter, profileId) {
  const result = await adapter.pull(profileId);
  if (!result) return { ok: false, error: "Aucune sauvegarde distante" };

  const { snapshot, version, meta } = result;
  const snapshotSansMeta = Object.assign({}, snapshot);
  delete snapshotSansMeta._syncMeta;

  // Utiliser le hash enregistré dans _syncMeta si disponible, sinon le calculer
  const hash = (meta && meta.contentHash) ? meta.contentHash : contentHash(snapshotSansMeta);

  updateLocalSyncState(profileId, {
    lastKnownVersion: version,
    lastKnownPushedAt: meta ? meta.pushedAt : null,
    lastPushedHash: hash,
  });

  return { ok: true, snapshot: snapshotSansMeta, newVersion: version, remoteMeta: meta };
}

// ─── Snapshots quotidiens ─────────────────────────────────────────

function snapshotDateSlug(daysAgo) {
  var d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function snapshotFilePath(profileId, slug) {
  return "check-data/snapshots/profil-" + profileId + "-" + slug + ".json";
}

function targetSlugs() {
  return [1, 3, 7, 14].map(snapshotDateSlug);
}

async function listSnapshots(repo, headers, profileId) {
  var url = "https://api.github.com/repos/" + repo + "/contents/check-data/snapshots";
  var r = await fetch(url, { headers: headers });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error("LIST " + r.status);
  var data = await r.json();
  var prefix = "profil-" + profileId + "-";
  return data.filter(function(item) {
    return item.type === "file" && item.name.startsWith(prefix) && item.name.endsWith(".json");
  });
}

async function deleteSnapshotFile(repo, headers, filePath, sha) {
  await fetch("https://api.github.com/repos/" + repo + "/contents/" + filePath, {
    method: "DELETE",
    headers: Object.assign({}, headers, { "Content-Type": "application/json" }),
    body: JSON.stringify({ message: "CHECK snapshot cleanup", sha: sha }),
  });
}

async function writeSnapshotFile(repo, headers, profileId, slug, snapshot) {
  var path = snapshotFilePath(profileId, slug);
  var url = "https://api.github.com/repos/" + repo + "/contents/" + path;
  var headR = await fetch(url, { headers: headers });
  var body = {
    message: "CHECK snapshot " + slug,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(snapshot)))),
  };
  if (headR.ok) {
    var headData = await headR.json();
    body.sha = headData.sha;
  }
  var r = await fetch(url, {
    method: "PUT",
    headers: Object.assign({}, headers, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("WRITE " + r.status);
}

export async function maintainSnapshots(adapter, profileId, localState) {
  var repo = adapter._repo;
  var headers = adapter._headers;
  if (!repo || !headers) return;
  var slugs = targetSlugs();
  try {
    var existing = await listSnapshots(repo, headers, profileId);
    var prefix = "profil-" + profileId + "-";
    for (var i = 0; i < existing.length; i++) {
      var item = existing[i];
      var slug = item.name.slice(prefix.length, -5);
      if (slugs.indexOf(slug) === -1) {
        await deleteSnapshotFile(repo, headers, item.path, item.sha);
      }
    }
    await writeSnapshotFile(repo, headers, profileId, slugs[0], localState);
  } catch(_e) {}
}

export async function listAvailableSnapshots(adapter, profileId) {
  // Adapter fournissant sa propre liste (Sycomore) : on la lui délègue.
  if (adapter.listSnapshots) {
    try { return await adapter.listSnapshots(profileId); } catch(_e) { return []; }
  }
  var repo = adapter._repo;
  var headers = adapter._headers;
  if (!repo || !headers) return [];
  try {
    var items = await listSnapshots(repo, headers, profileId);
    var prefix = "profil-" + profileId + "-";
    return items.map(function(item) {
      return { slug: item.name.slice(prefix.length, -5), path: item.path, sha: item.sha };
    }).sort(function(a, b) { return b.slug.localeCompare(a.slug); });
  } catch(_e) { return []; }
}

export async function readSnapshot(adapter, profileId, slug) {
  if (adapter.readSnapshot) {
    try { return await adapter.readSnapshot(profileId, slug); } catch(_e) { return null; }
  }
  var repo = adapter._repo;
  var headers = adapter._headers;
  if (!repo || !headers) return null;
  try {
    var url = "https://api.github.com/repos/" + repo + "/contents/" + snapshotFilePath(profileId, slug);
    var r = await fetch(url, { headers: headers });
    if (!r.ok) return null;
    var data = await r.json();
    return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))));
  } catch(_e) { return null; }
}
