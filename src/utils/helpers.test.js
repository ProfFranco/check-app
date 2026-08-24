// ═══════════════════════════════════════════════════════════════════
// TESTS UNITAIRES — helpers.js (rapprochement d'identités Sycomore)
// ═══════════════════════════════════════════════════════════════════
//
// Exécution Jest :  npx react-scripts test -- --watchAll=false helpers.test
//
// ═══════════════════════════════════════════════════════════════════

import assert from "assert";
import {
  apparierIdentites,
  cleIdentite,
  deshydraterEtat,
  identiteTrousseau,
  iosInstallationRecommandee,
  rehydraterEtat,
} from "./helpers";

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

// ─── Déshydratation / réhydratation des identités (P-H4) ──────────

const TROUSSEAU = {
  version: 2,
  identities: {
    "42": { nom: "Testeau", prenom: "Alice" },
    "43": { nom: "Second", prenom: "Bob" },
  },
  secrets: { checkSyncPassphrase: "x" },
};

// s1 rapproché et présent au trousseau ; s2 rapproché mais absent du
// trousseau ; s3 pas rapproché du tout.
const ETAT_CLAIR = {
  students: [
    { id: "s1", nom: "Testeau", prenom: "Alice" },
    { id: "s2", nom: "Fantome", prenom: "Carol" },
    { id: "s3", nom: "Manuel", prenom: "Dave" },
  ],
  synthese: [
    { examId: "e1", studentId: "s1", nom: "Testeau", prenom: "Alice", noteNorm: 15 },
    { examId: "e1", studentId: "s3", nom: "Manuel", prenom: "Dave", noteNorm: 12 },
  ],
  sycomoreMap: { s1: 42, s2: 99 },
};

test("identiteTrousseau: résout un id rapproché, null partout ailleurs", function() {
  assert.deepStrictEqual(identiteTrousseau(TROUSSEAU, 42), { nom: "Testeau", prenom: "Alice" });
  assert.strictEqual(identiteTrousseau(TROUSSEAU, 99), null);
  assert.strictEqual(identiteTrousseau(TROUSSEAU, undefined), null);
  assert.strictEqual(identiteTrousseau(null, 42), null);
});

test("deshydrater: ne retire QUE les noms récupérables", function() {
  const out = deshydraterEtat(ETAT_CLAIR, TROUSSEAU);
  // s1 rapproché ET présent au trousseau → vidé
  assert.deepStrictEqual(out.students[0], { id: "s1", nom: "", prenom: "" });
  // s2 rapproché mais absent du trousseau → nom conservé (sinon perte sèche)
  assert.strictEqual(out.students[1].nom, "Fantome");
  // s3 non rapproché → nom conservé
  assert.strictEqual(out.students[2].nom, "Manuel");
});

test("deshydrater: traite aussi les lignes de synthese", function() {
  const out = deshydraterEtat(ETAT_CLAIR, TROUSSEAU);
  assert.strictEqual(out.synthese[0].nom, "");
  assert.strictEqual(out.synthese[0].prenom, "");
  assert.strictEqual(out.synthese[0].noteNorm, 15); // le reste de la ligne intact
  assert.strictEqual(out.synthese[1].nom, "Manuel"); // s3 non rapproché
});

test("deshydrater: aucun nom ne subsiste pour un élève récupérable", function() {
  const out = deshydraterEtat(ETAT_CLAIR, TROUSSEAU);
  const serialise = JSON.stringify(out);
  assert.strictEqual(serialise.includes("Alice"), false);
  assert.strictEqual(serialise.includes("Testeau"), false);
});

test("deshydrater: sans trousseau, l'état est rendu tel quel (par référence)", function() {
  assert.strictEqual(deshydraterEtat(ETAT_CLAIR, null), ETAT_CLAIR);
});

test("rehydrater: round-trip complet, égal à l'original", function() {
  const out = rehydraterEtat(deshydraterEtat(ETAT_CLAIR, TROUSSEAU), TROUSSEAU);
  assert.deepStrictEqual(out.students, ETAT_CLAIR.students);
  assert.deepStrictEqual(out.synthese, ETAT_CLAIR.synthese);
});

test("rehydrater: n'écrase jamais un nom déjà présent (backup nominatif)", function() {
  const backupNominatif = {
    students: [{ id: "s1", nom: "SaisiALaMain", prenom: "Zoé" }],
    synthese: [],
    sycomoreMap: { s1: 42 },
  };
  const out = rehydraterEtat(backupNominatif, TROUSSEAU);
  assert.strictEqual(out.students[0].nom, "SaisiALaMain");
  assert.strictEqual(out, backupNominatif); // rien à faire → même référence
});

test("rehydrater: stabilité référentielle quand rien ne change (anti-boucle)", function() {
  const deshydrate = deshydraterEtat(ETAT_CLAIR, TROUSSEAU);
  const une = rehydraterEtat(deshydrate, TROUSSEAU);
  const deux = rehydraterEtat(une, TROUSSEAU);
  assert.strictEqual(deux, une);
});

test("rehydrater: sans trousseau, l'état reste anonyme sans exception", function() {
  const deshydrate = deshydraterEtat(ETAT_CLAIR, TROUSSEAU);
  const out = rehydraterEtat(deshydrate, null);
  assert.strictEqual(out, deshydrate);
  assert.strictEqual(out.students[0].nom, "");
});

test("deshydrater/rehydrater: état vide ou champs absents, pas d'exception", function() {
  // Rien à changer → l'objet est rendu par référence, sans clés inventées.
  const vide = { sycomoreMap: {} };
  assert.strictEqual(deshydraterEtat(vide, TROUSSEAU), vide);
  assert.strictEqual(rehydraterEtat(vide, TROUSSEAU), vide);
  assert.strictEqual(deshydraterEtat(null, TROUSSEAU), null);
  assert.strictEqual(rehydraterEtat(undefined, TROUSSEAU), undefined);
});
