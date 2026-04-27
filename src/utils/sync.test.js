// ═══════════════════════════════════════════════════════════════════
// TESTS UNITAIRES — sync.js
// ═══════════════════════════════════════════════════════════════════
//
// Exécution Jest :  npx react-scripts test -- --watchAll=false sync.test
// Exécution Node :  node --experimental-vm-modules node_modules/.bin/jest src/utils/sync.test.js
//
// ═══════════════════════════════════════════════════════════════════

import assert from "assert";
import { contentHash, diagnoseSyncStatus } from "./sync";

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
