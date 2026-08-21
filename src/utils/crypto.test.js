// ═══════════════════════════════════════════════════════════════════
// TESTS UNITAIRES — crypto.js
// ═══════════════════════════════════════════════════════════════════
//
// Exécution Jest :  npx react-scripts test -- --watchAll=false crypto.test
//
// jsdom n'expose ni WebCrypto ni TextEncoder/TextDecoder : on injecte ceux de
// Node avant les tests. Les navigateurs, eux, les fournissent nativement — ce
// bloc est une rustine d'environnement de test, pas un polyfill de production.
// crypto.js résout globalThis.crypto paresseusement (dans ses fonctions, pas au
// chargement du module), donc l'injection ci-dessous prend effet.
// ═══════════════════════════════════════════════════════════════════

import assert from "assert";
import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import {
  base64ToBytes,
  bytesToBase64,
  decryptSnapshot,
  encryptSnapshot,
  isEnvelope,
} from "./crypto";

if (!globalThis.crypto || !globalThis.crypto.subtle) globalThis.crypto = webcrypto;
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder;

const PASS = "phrase-secrete-de-test";

// ─── Base64 ──────────────────────────────────────────────────────

test("base64: aller-retour sur des octets arbitraires", function() {
  const bytes = new Uint8Array([0, 1, 42, 127, 128, 255]);
  assert.deepStrictEqual(Array.from(base64ToBytes(bytesToBase64(bytes))), Array.from(bytes));
});

// ─── Aller-retour ────────────────────────────────────────────────

test("crypto: aller-retour d'un snapshot complet", async function() {
  const snapshot = {
    exams: [{ id: "e1", nomDS: "DS1" }],
    students: [{ id: "s1", nom: "Dupont", prenom: "Alice" }],
    grades: { "s1__i1": true },
  };
  const envelope = await encryptSnapshot(snapshot, PASS);
  const restored = await decryptSnapshot(envelope, PASS);
  assert.deepStrictEqual(restored, snapshot);
});

test("crypto: le nominatif n'apparaît jamais en clair dans l'enveloppe", async function() {
  const snapshot = { students: [{ id: "s1", nom: "Dupont", prenom: "Alice" }] };
  const envelope = await encryptSnapshot(snapshot, PASS);
  const serialise = JSON.stringify(envelope);
  assert.ok(serialise.indexOf("Dupont") === -1);
  assert.ok(serialise.indexOf("Alice") === -1);
});

test("crypto: deux chiffrements du même objet diffèrent (sel + IV aléatoires)", async function() {
  const snapshot = { exams: [] };
  const a = await encryptSnapshot(snapshot, PASS);
  const b = await encryptSnapshot(snapshot, PASS);
  assert.notStrictEqual(a.data, b.data);
  assert.notStrictEqual(a.salt, b.salt);
  assert.notStrictEqual(a.iv, b.iv);
});

// ─── Erreurs ─────────────────────────────────────────────────────

test("crypto: mauvaise phrase secrète → erreur explicite", async function() {
  const envelope = await encryptSnapshot({ exams: [] }, PASS);
  await assert.rejects(
    function() { return decryptSnapshot(envelope, "mauvaise-phrase"); },
    /incorrecte ou sauvegarde corrompue/
  );
});

test("crypto: enveloppe altérée → erreur explicite", async function() {
  const envelope = await encryptSnapshot({ exams: [{ id: "e1" }] }, PASS);
  const bytes = base64ToBytes(envelope.data);
  bytes[0] = bytes[0] ^ 0xff;
  const altere = Object.assign({}, envelope, { data: bytesToBase64(bytes) });
  await assert.rejects(
    function() { return decryptSnapshot(altere, PASS); },
    /incorrecte ou sauvegarde corrompue/
  );
});

test("crypto: enveloppe invalide rejetée avant tout déchiffrement", async function() {
  await assert.rejects(
    function() { return decryptSnapshot({ exams: [] }, PASS); },
    /enveloppe invalide/
  );
});

test("crypto: phrase secrète manquante rejetée", async function() {
  await assert.rejects(
    function() { return encryptSnapshot({ exams: [] }, ""); },
    /Phrase secrète manquante/
  );
});

// ─── isEnvelope ──────────────────────────────────────────────────

test("isEnvelope: reconnaît une enveloppe, rejette un snapshot clair", async function() {
  const envelope = await encryptSnapshot({ exams: [] }, PASS);
  assert.strictEqual(isEnvelope(envelope), true);
  assert.strictEqual(isEnvelope({ exams: [], students: [] }), false);
  assert.strictEqual(isEnvelope(null), false);
});
