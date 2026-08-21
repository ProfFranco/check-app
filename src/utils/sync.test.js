// ═══════════════════════════════════════════════════════════════════
// TESTS UNITAIRES — sync.js
// ═══════════════════════════════════════════════════════════════════
//
// Exécution Jest :  npx react-scripts test -- --watchAll=false sync.test
// Exécution Node :  node --experimental-vm-modules node_modules/.bin/jest src/utils/sync.test.js
//
// ═══════════════════════════════════════════════════════════════════

import assert from "assert";
import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import { contentHash, createSyncAdapter, diagnoseSyncStatus } from "./sync";

// jsdom n'expose ni WebCrypto ni TextEncoder/TextDecoder (cf. crypto.test.js) :
// rustine d'environnement de test uniquement, les navigateurs les fournissent.
if (!globalThis.crypto || !globalThis.crypto.subtle) globalThis.crypto = webcrypto;
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder;

// ─── diagnoseSyncStatus ──────────────────────────────────────────

test("diagnose: jamais synchronisé, pas de remote → synced", function() {
  assert.strictEqual(diagnoseSyncStatus("abc", null, null, null), "synced");
});

test("diagnose: jamais synchronisé, remote existe → remote-ahead", function() {
  assert.strictEqual(diagnoseSyncStatus("abc", null, null, "sha1"), "remote-ahead");
});

test("diagnose: tout égal → synced", function() {
  assert.strictEqual(diagnoseSyncStatus("abc", "sha1", "abc", "sha1"), "synced");
});

test("diagnose: local modifié seul → local-ahead", function() {
  assert.strictEqual(diagnoseSyncStatus("xyz", "sha1", "abc", "sha1"), "local-ahead");
});

test("diagnose: remote modifié seul → remote-ahead", function() {
  assert.strictEqual(diagnoseSyncStatus("abc", "sha1", "abc", "sha2"), "remote-ahead");
});

test("diagnose: les deux ont changé → conflict", function() {
  assert.strictEqual(diagnoseSyncStatus("xyz", "sha1", "abc", "sha2"), "conflict");
});

// ─── contentHash ────────────────────────────────────────────────

test("contentHash: même snapshot → même hash", function() {
  const s = { exams: [], students: [{ id: "a", nom: "X", prenom: "Y" }] };
  assert.strictEqual(contentHash(s), contentHash(s));
});

test("contentHash: snapshots sémantiquement égaux mais ordre différent → même hash", function() {
  const a = { exams: [], students: [] };
  const b = { students: [], exams: [] };
  assert.strictEqual(contentHash(a), contentHash(b));
});

test("contentHash: ignore settingsTab", function() {
  const a = { exams: [], students: [], settingsTab: "calcul" };
  const b = { exams: [], students: [], settingsTab: "export" };
  assert.strictEqual(contentHash(a), contentHash(b));
});

test("contentHash: ignore _syncMeta", function() {
  const a = { exams: [], _syncMeta: { pushedAt: "2026-01-01" } };
  const b = { exams: [], _syncMeta: { pushedAt: "2026-12-31" } };
  assert.strictEqual(contentHash(a), contentHash(b));
});

test("contentHash: détecte un changement dans exams", function() {
  const a = { exams: [{ id: "e1", name: "DS1" }] };
  const b = { exams: [{ id: "e1", name: "DS2" }] };
  assert.notStrictEqual(contentHash(a), contentHash(b));
});

test("contentHash: ignore toutes les clés UI éphémères", function() {
  const base = { exams: [], students: [] };
  const withUi = Object.assign({}, base, {
    uiScale: 1.2, mode: "correct", showSettings: true, showMore: false,
    showDebug: true, showApropos: false, showChangelog: false, featOpen: true,
    collapsed: { ex1: true }, collapsedExams: {}, showGroupes: true,
    showSearch: false, searchTerm: "toto", confirmDelete: null,
    showDsMenu: false, showProfileMenu: false, editingProfileId: "abc",
    editingProfileName: "test", newProfileName: "", newRemLabel: "",
    newRemIcon: "📌", newRemMalus: true, syncStatus: "ok",
    syncDate: "2026-01-01", syncLoading: false, dbLoaded: true,
  });
  assert.strictEqual(contentHash(base), contentHash(withUi));
});

test("contentHash: détecte un changement dans students", function() {
  const a = { students: [{ id: "s1", nom: "Dupont", prenom: "Alice" }] };
  const b = { students: [{ id: "s1", nom: "Dupont", prenom: "Bob" }] };
  assert.notStrictEqual(contentHash(a), contentHash(b));
});

// ─── Adapter Sycomore ────────────────────────────────────────────

const SYCO_CONFIG = {
  backend: "sycomore",
  token: "jeton-test",
  passphrase: "phrase-secrete-de-test",
  deviceName: "MacBook",
};

function mockFetch(routes) {
  const calls = [];
  globalThis.fetch = function(url, options) {
    calls.push({ url: url, options: options || {} });
    const handler = routes(url, options || {});
    return Promise.resolve(Object.assign(
      { ok: true, status: 200, json: function() { return Promise.resolve({}); } },
      handler
    ));
  };
  return calls;
}

test("createSyncAdapter: dispatch sur le backend", function() {
  assert.strictEqual(createSyncAdapter({ backend: "sycomore", token: "t", passphrase: "p" }).backend, "sycomore");
  assert.strictEqual(createSyncAdapter({ backend: "github", pat: "p", repo: "u/r" }).backend, "github");
  assert.throws(function() { createSyncAdapter({ backend: "inconnu" }); }, /Backend inconnu/);
});

test("adapter sycomore: config incomplète rejetée", function() {
  assert.throws(function() { createSyncAdapter({ backend: "sycomore", passphrase: "p" }); }, /jeton/);
  assert.throws(function() { createSyncAdapter({ backend: "sycomore", token: "t" }); }, /phrase secrète/);
});

test("adapter sycomore: head renvoie une version en chaîne, 0 → null", async function() {
  const adapter = createSyncAdapter(SYCO_CONFIG);

  mockFetch(function() { return { json: function() { return Promise.resolve({ version: 0 }); } }; });
  assert.strictEqual((await adapter.head("p1")).version, null);

  mockFetch(function() { return { json: function() { return Promise.resolve({ version: 4 }); } }; });
  const v = (await adapter.head("p1")).version;
  // Chaîne obligatoire : localStorage ne stocke que des chaînes et
  // diagnoseSyncStatus compare avec !== (un entier divergerait toujours).
  assert.strictEqual(v, "4");
  assert.strictEqual(typeof v, "string");
});

test("adapter sycomore: push chiffre le snapshot, aucun nominatif sur le réseau", async function() {
  const adapter = createSyncAdapter(SYCO_CONFIG);
  const calls = mockFetch(function() {
    return { status: 201, json: function() { return Promise.resolve({ version: 1 }); } };
  });

  const result = await adapter.push("p1", { students: [{ id: "s1", nom: "Dupont", prenom: "Alice" }] }, null);
  assert.deepStrictEqual(result, { ok: true, newVersion: "1" });

  const body = calls[0].options.body;
  assert.ok(body.indexOf("Dupont") === -1, "le nom ne doit jamais partir en clair");
  assert.ok(body.indexOf("Alice") === -1, "le prénom ne doit jamais partir en clair");
  const sent = JSON.parse(body);
  assert.strictEqual(sent.expected_version, 0);
  assert.strictEqual(sent.device_name, "MacBook");
  assert.strictEqual(JSON.parse(sent.payload).alg, "AES-256-GCM");
});

test("adapter sycomore: push convertit la version attendue en entier", async function() {
  const adapter = createSyncAdapter(SYCO_CONFIG);
  const calls = mockFetch(function() {
    return { status: 201, json: function() { return Promise.resolve({ version: 6 }); } };
  });
  await adapter.push("p1", { exams: [] }, "5");
  assert.strictEqual(JSON.parse(calls[0].options.body).expected_version, 5);
});

test("adapter sycomore: 409 → conflit signalé, pas d'exception", async function() {
  const adapter = createSyncAdapter(SYCO_CONFIG);
  mockFetch(function() { return { ok: false, status: 409 }; });
  assert.deepStrictEqual(await adapter.push("p1", { exams: [] }, "1"), { ok: false, conflict: true });
});

test("adapter sycomore: 401 → erreur marquée authRequired", async function() {
  const adapter = createSyncAdapter(SYCO_CONFIG);
  mockFetch(function() { return { ok: false, status: 401 }; });
  await assert.rejects(
    function() { return adapter.head("p1"); },
    function(err) { return err.authRequired === true; }
  );
});

test("adapter sycomore: pull déchiffre et remonte _syncMeta", async function() {
  const adapter = createSyncAdapter(SYCO_CONFIG);

  // On produit un vrai payload chiffré en passant par push.
  let payload = null;
  mockFetch(function(url, options) {
    payload = JSON.parse(options.body).payload;
    return { status: 201, json: function() { return Promise.resolve({ version: 2 }); } };
  });
  await adapter.push("p1", { exams: [{ id: "e1" }], _syncMeta: { contentHash: "abc" } }, null);

  mockFetch(function() {
    return { json: function() { return Promise.resolve({ payload: payload, version: 2 }); } };
  });
  const result = await adapter.pull("p1");
  assert.deepStrictEqual(result.snapshot.exams, [{ id: "e1" }]);
  assert.strictEqual(result.version, "2");
  assert.deepStrictEqual(result.meta, { contentHash: "abc" });
});

test("adapter sycomore: pull sur profil vide → null", async function() {
  const adapter = createSyncAdapter(SYCO_CONFIG);
  mockFetch(function() { return { ok: false, status: 404 }; });
  assert.strictEqual(await adapter.pull("p1"), null);
});
