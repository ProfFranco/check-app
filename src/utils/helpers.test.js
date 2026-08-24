// ═══════════════════════════════════════════════════════════════════
// TESTS UNITAIRES — helpers.js (rapprochement d'identités Sycomore)
// ═══════════════════════════════════════════════════════════════════
//
// Exécution Jest :  npx react-scripts test -- --watchAll=false helpers.test
//
// ═══════════════════════════════════════════════════════════════════

import assert from "assert";
import { apparierIdentites, cleIdentite, iosInstallationRecommandee } from "./helpers";

// ─── cleIdentite ─────────────────────────────────────────────────

test("cleIdentite: insensible à la casse, aux accents et aux espaces", function() {
  assert.strictEqual(cleIdentite("Dupont", "Élodie"), cleIdentite("DUPONT", "elodie"));
  assert.strictEqual(cleIdentite("Le Goff", "Jean-Luc"), cleIdentite("legoff", "jeanluc"));
});

test("cleIdentite: distingue deux personnes différentes", function() {
  assert.notStrictEqual(cleIdentite("Dupont", "Alice"), cleIdentite("Dupont", "Bob"));
});

test("cleIdentite: tolère les champs absents", function() {
  assert.strictEqual(cleIdentite(null, undefined), "|");
});

// ─── apparierIdentites ───────────────────────────────────────────

const PACK = {
  identities: {
    "12": { nom: "Dupont", prenom: "Alice" },
    "13": { nom: "Le Goff", prenom: "Jean-Luc" },
    "14": { nom: "Martin", prenom: "Bob" },
  },
};

test("apparier: rapprochement nominal, ids serveur en entiers", function() {
  const students = [
    { id: "s1", nom: "DUPONT", prenom: "alice" },
    { id: "s2", nom: "le goff", prenom: "Jean Luc" },
  ];
  const res = apparierIdentites(students, PACK);
  assert.deepStrictEqual(res.map, { s1: 12, s2: 13 });
  assert.strictEqual(res.nonApparies.length, 0);
  assert.strictEqual(res.ambigus.length, 0);
});

test("apparier: élève absent du pack → non apparié, jamais deviné", function() {
  const students = [{ id: "s9", nom: "Inconnu", prenom: "Zoé" }];
  const res = apparierIdentites(students, PACK);
  assert.deepStrictEqual(res.map, {});
  assert.deepStrictEqual(res.nonApparies.map(function(s) { return s.id; }), ["s9"]);
});

test("apparier: homonymes dans le pack → ambigu, jamais rapproché d'office", function() {
  const packHomonymes = {
    identities: {
      "20": { nom: "Martin", prenom: "Bob" },
      "21": { nom: "MARTIN", prenom: "bob" },
    },
  };
  const res = apparierIdentites([{ id: "s3", nom: "Martin", prenom: "Bob" }], packHomonymes);
  assert.deepStrictEqual(res.map, {});
  assert.deepStrictEqual(res.ambigus.map(function(s) { return s.id; }), ["s3"]);
});

test("apparier: pack vide ou absent → tout le monde non apparié", function() {
  const students = [{ id: "s1", nom: "Dupont", prenom: "Alice" }];
  assert.strictEqual(apparierIdentites(students, null).nonApparies.length, 1);
  assert.strictEqual(apparierIdentites(students, { identities: {} }).nonApparies.length, 1);
});

test("apparier: liste d'élèves vide → résultat vide, pas d'exception", function() {
  const res = apparierIdentites([], PACK);
  assert.deepStrictEqual(res.map, {});
  assert.deepStrictEqual(res.nonApparies, []);
});

// ─── iosInstallationRecommandee (P-H3) ────────────────────────────

test("iosInstallationRecommandee: plateforme non iOS (standalone undefined) → null", function() {
  assert.strictEqual(iosInstallationRecommandee({}), null);
});

test("iosInstallationRecommandee: iOS, déjà installé en PWA → false", function() {
  assert.strictEqual(iosInstallationRecommandee({ standalone: true }), false);
});

test("iosInstallationRecommandee: iOS, onglet Safari classique → true", function() {
  assert.strictEqual(iosInstallationRecommandee({ standalone: false }), true);
});
