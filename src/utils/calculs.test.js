// ═══════════════════════════════════════════════════════════════════
// TESTS UNITAIRES — calculs.js
// ═══════════════════════════════════════════════════════════════════
//
// Exécution :  npx react-scripts test -- --watchAll=false calculs.test
//
// Ce fichier teste les fonctions pures de calculs.js (scores,
// compétences, malus, normalisation, import CSV).
//
// Convention : chaque section correspond à un bloc fonctionnel
// du fichier source, dans le même ordre.
// ═══════════════════════════════════════════════════════════════════

import {
  gradeKey, remarkKey, treatedKey, clamp,
  questionScore, exerciseScore, studentTotal, examTotal,
  studentTotalWeighted, examTotalWeighted, noteSur20,
  pointsTraites, ratioJustesse, ratioEfficacite,
  notesParCompetence, competencePct,
  exercisePctAbsolute, exercisePctRelative,
  countMalusRemarks, malusAuto, malusTotal,
  normaliser,
  importCSV,
} from "./calculs";

import { REMARQUES } from "../config/settings";

// ─── Helpers de test ────────────────────────────────────────────

/** Crée un item avec un id et un nombre de points */
function item(id, points) {
  return { id: id, points: points };
}

/** Crée une question minimale */
function question(id, items, opts) {
  return Object.assign(
    { id: id, label: "Q" + id, items: items, competences: [], bonus: false },
    opts || {}
  );
}

/** Crée un exercice minimal */
function exercise(id, questions, opts) {
  return Object.assign(
    { id: id, title: "Exercice " + id, questions: questions },
    opts || {}
  );
}

/** Crée un examen minimal */
function exam(exercises) {
  return { id: "exam1", exercises: exercises };
}

// ─── Fixtures réutilisables ─────────────────────────────────────

// Examen simple : 2 exercices, 3 questions, 5 items au total
//   Ex1: Q1 (2 items: 2pt + 1pt) + Q2 (1 item: 3pt)
//   Ex2: Q3 (2 items: 2pt + 2pt)
const ITEMS = {
  a: item("a", 2), b: item("b", 1),
  c: item("c", 3),
  d: item("d", 2), e: item("e", 2),
};
const Q1 = question("q1", [ITEMS.a, ITEMS.b], { competences: ["A", "R"] });
const Q2 = question("q2", [ITEMS.c],          { competences: ["N"] });
const Q3 = question("q3", [ITEMS.d, ITEMS.e], { competences: ["R", "V"] });
const EX1 = exercise("ex1", [Q1, Q2]);
const EX2 = exercise("ex2", [Q3]);
const EXAM = exam([EX1, EX2]);
// Total de l'examen : 2+1+3+2+2 = 10 pts

const SID = "stu1"; // identifiant élève par défaut

// ═════════════════════════════════════════════════════════════════
// 1. UTILITAIRES DE BASE
// ═════════════════════════════════════════════════════════════════

describe("Utilitaires de base", function() {

  test("gradeKey concatène avec __", function() {
    expect(gradeKey("alice", "item42")).toBe("alice__item42");
  });

  test("remarkKey concatène avec __", function() {
    expect(remarkKey("bob", "q7")).toBe("bob__q7");
  });

  test("treatedKey préfixe treated_", function() {
    expect(treatedKey("charlie", "q3")).toBe("treated_charlie_q3");
  });

  test("clamp borne correctement", function() {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);   // bord inférieur
    expect(clamp(10, 0, 10)).toBe(10);  // bord supérieur
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. SCORES
// ═════════════════════════════════════════════════════════════════

describe("Scores", function() {

  test("questionScore — aucun item coché", function() {
    var s = questionScore({}, SID, Q1);
    expect(s).toEqual({ earned: 0, total: 3, treated: false });
  });

  test("questionScore — tous les items cochés", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true;
    g[gradeKey(SID, "b")] = true;
    var s = questionScore(g, SID, Q1);
    expect(s).toEqual({ earned: 3, total: 3, treated: true });
  });

  test("questionScore — un seul item coché → treated = true", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true;
    var s = questionScore(g, SID, Q1);
    expect(s.earned).toBe(2);
    expect(s.treated).toBe(true);
  });

  test("questionScore — treated via la case treated explicite", function() {
    var g = {};
    g[treatedKey(SID, "q1")] = true;
    var s = questionScore(g, SID, Q1);
    expect(s.earned).toBe(0);
    expect(s.treated).toBe(true);
  });

  test("exerciseScore — somme des questions", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true; // 2 pts
    g[gradeKey(SID, "c")] = true; // 3 pts
    var s = exerciseScore(g, SID, EX1);
    expect(s).toEqual({ earned: 5, total: 6 });
  });

  test("exerciseScore — les questions bonus n'augmentent pas le total", function() {
    var qBonus = question("qb", [item("xb", 5)], { bonus: true });
    var ex = exercise("exB", [Q1, qBonus]);
    var g = {};
    g[gradeKey(SID, "a")] = true;  // 2 pts
    g[gradeKey(SID, "xb")] = true; // 5 pts bonus
    var s = exerciseScore(g, SID, ex);
    expect(s.earned).toBe(7);  // 2 + 5
    expect(s.total).toBe(3);   // seulement Q1 (pas le bonus)
  });

  test("studentTotal — somme sur tous les exercices", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true; // 2
    g[gradeKey(SID, "d")] = true; // 2
    expect(studentTotal(g, SID, EXAM)).toBe(4);
  });

  test("examTotal — total hors bonus", function() {
    expect(examTotal(EXAM)).toBe(10);
  });

  test("examTotal — bonus exclus du total", function() {
    var qBonus = question("qb", [item("xb", 5)], { bonus: true });
    var e = exam([exercise("ex1", [Q1, qBonus])]);
    expect(examTotal(e)).toBe(3); // seulement Q1
  });

  test("noteSur20 — cas nominal", function() {
    expect(noteSur20(5, 10)).toBe(10);
    expect(noteSur20(10, 10)).toBe(20);
  });

  test("noteSur20 — total zéro → 0", function() {
    expect(noteSur20(5, 0)).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. SCORES PONDÉRÉS (coefficients exercices)
// ═════════════════════════════════════════════════════════════════

describe("Scores pondérés", function() {

  test("studentTotalWeighted — coeff par défaut = 1", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true; // 2
    g[gradeKey(SID, "d")] = true; // 2
    // Sans coeff explicite → coeff 1 partout
    expect(studentTotalWeighted(g, SID, EXAM)).toBe(4);
  });

  test("studentTotalWeighted — avec coefficients", function() {
    var ex1 = exercise("ex1", [Q1, Q2], { coeff: 2 });
    var ex2 = exercise("ex2", [Q3], { coeff: 0.5 });
    var e = exam([ex1, ex2]);
    var g = {};
    g[gradeKey(SID, "a")] = true; // 2 pts × coeff 2 = 4
    g[gradeKey(SID, "d")] = true; // 2 pts × coeff 0.5 = 1
    expect(studentTotalWeighted(g, SID, e)).toBe(5);
  });

  test("examTotalWeighted — cohérent avec les coefficients", function() {
    var ex1 = exercise("ex1", [Q1, Q2], { coeff: 2 });
    var ex2 = exercise("ex2", [Q3], { coeff: 0.5 });
    var e = exam([ex1, ex2]);
    // ex1 total = 6, × 2 = 12 ; ex2 total = 4, × 0.5 = 2 → 14
    expect(examTotalWeighted(e)).toBe(14);
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. POINTS TRAITÉS ET RATIOS
// ═════════════════════════════════════════════════════════════════

describe("Points traités et ratios", function() {

  test("pointsTraites — ne compte que les questions traitées (hors bonus)", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true; // Q1 traitée → 3 pts (a=2 + b=1)
    // Q2 non traitée, Q3 non traitée
    expect(pointsTraites(g, SID, EXAM)).toBe(3);
  });

  test("pointsTraites — la case treated compte aussi", function() {
    var g = {};
    g[treatedKey(SID, "q2")] = true; // Q2 traitée via checkbox → 3 pts
    expect(pointsTraites(g, SID, EXAM)).toBe(3);
  });

  test("pointsTraites — exclut les questions bonus", function() {
    var qBonus = question("qb", [item("xb", 5)], { bonus: true });
    var e = exam([exercise("ex1", [Q1, qBonus])]);
    var g = {};
    g[gradeKey(SID, "a")] = true;
    g[gradeKey(SID, "xb")] = true;
    // Seule Q1 compte (3 pts), le bonus est exclu
    expect(pointsTraites(g, SID, e)).toBe(3);
  });

  test("ratioJustesse — points obtenus / points traités", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true; // Q1 traitée, 2/3 obtenus
    // traités = 3, obtenus = 2
    expect(ratioJustesse(g, SID, EXAM)).toBeCloseTo(2 / 3);
  });

  test("ratioJustesse — rien traité → 0", function() {
    expect(ratioJustesse({}, SID, EXAM)).toBe(0);
  });

  test("ratioEfficacite — points traités / total examen", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true; // traités = 3, total = 10
    expect(ratioEfficacite(g, SID, EXAM)).toBeCloseTo(3 / 10);
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. NOTES PAR COMPÉTENCE
// ═════════════════════════════════════════════════════════════════

describe("Notes par compétence", function() {

  var seuils = { nonNote: 20, D: 25, C: 50, B: 75 };

  test("notesParCompetence — élève parfait → A partout (où la compétence est évaluée)", function() {
    var g = {};
    // Cocher tous les items
    ["a", "b", "c", "d", "e"].forEach(function(id) {
      g[gradeKey(SID, id)] = true;
    });
    var result = notesParCompetence(g, SID, EXAM, seuils);
    // A est évalué sur Q1 (comp A,R) → 100% → "A"
    expect(result["A"]).toBe("A");
    // N sur Q2 → 100% → "A"
    expect(result["N"]).toBe("A");
    // R sur Q1 + Q3 → 100% → "A"
    expect(result["R"]).toBe("A");
    // V sur Q3 → 100% → "A"
    expect(result["V"]).toBe("A");
  });

  test("notesParCompetence — rien traité → NN", function() {
    var result = notesParCompetence({}, SID, EXAM, seuils);
    // Aucune question traitée → ratio traité/total = 0% < nonNote(20%) → NN
    expect(result["A"]).toBe("NN");
    expect(result["R"]).toBe("NN");
  });

  test("notesParCompetence — seuils intermédiaires", function() {
    // Q3 : items d(2pt) + e(2pt), compétences R et V
    // Cocher seulement d → 2/4 = 50% de réussite
    var g = {};
    g[gradeKey(SID, "d")] = true;
    var result = notesParCompetence(g, SID, EXAM, seuils);
    // Pour V : seule Q3 compte, 50% → < B(75%) mais >= C(50%) → "C"
    expect(result["V"]).toBe("B");
  });

  test("notesParCompetence — compétence absente de l'examen → tiret", function() {
    // Examen sans aucune question avec compétence "A"
    var q = question("q1", [item("x", 3)], { competences: ["N"] });
    var e = exam([exercise("ex1", [q])]);
    var g = {};
    g[gradeKey(SID, "x")] = true;
    var result = notesParCompetence(g, SID, e, seuils);
    expect(result["A"]).toBe("—");
  });

  test("competencePct — pourcentages corrects", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true;  // Q1(A,R): 2/3
    g[gradeKey(SID, "d")] = true;  // Q3(R,V): 2/4
    var pct = competencePct(g, SID, EXAM);
    // A : Q1 traitée, 2/3
    expect(pct["A"]).toBeCloseTo(2 / 3);
    // R : Q1(2/3) + Q3(2/4) → obtenu=4, maxTraité=7
    expect(pct["R"]).toBeCloseTo(4 / 7);
    // V : Q3 2/4
    expect(pct["V"]).toBeCloseTo(2 / 4);
    // N : Q2 non traitée → 0
    expect(pct["N"]).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. SCORES PAR EXERCICE (radars)
// ═════════════════════════════════════════════════════════════════

describe("Scores par exercice", function() {

  test("exercisePctAbsolute — pourcentage absolu", function() {
    var g = {};
    g[gradeKey(SID, "a")] = true; // EX1: 2/6
    g[gradeKey(SID, "d")] = true; // EX2: 2/4
    var result = exercisePctAbsolute(g, SID, EXAM);
    expect(result).toHaveLength(2);
    expect(result[0].pct).toBeCloseTo(2 / 6);
    expect(result[1].pct).toBeCloseTo(2 / 4);
  });

  test("exercisePctRelative — par rapport au meilleur", function() {
    var stu2 = "stu2";
    var g = {};
    g[gradeKey(SID, "a")] = true;  // stu1 EX1: 2pts
    g[gradeKey(stu2, "a")] = true;
    g[gradeKey(stu2, "b")] = true;
    g[gradeKey(stu2, "c")] = true; // stu2 EX1: 6pts (max)
    var students = [{ id: SID }, { id: stu2 }];
    var absents = {};
    var result = exercisePctRelative(g, SID, EXAM, students, absents);
    // EX1 : stu1=2, max=6 → 2/6
    expect(result[0].pct).toBeCloseTo(2 / 6);
  });

  test("exercisePctRelative — les absents sont exclus du max", function() {
    var stu2 = "stu2";
    var g = {};
    g[gradeKey(SID, "a")] = true;  // stu1 EX1: 2pts
    g[gradeKey(stu2, "a")] = true;
    g[gradeKey(stu2, "b")] = true;
    g[gradeKey(stu2, "c")] = true; // stu2 EX1: 6pts mais absent
    var students = [{ id: SID }, { id: stu2 }];
    var absents = {}; absents[stu2] = true;
    var result = exercisePctRelative(g, SID, EXAM, students, absents);
    // stu2 absent → max = stu1 = 2 → ratio = 2/2 = 1
    expect(result[0].pct).toBeCloseTo(1);
  });
});

// ═════════════════════════════════════════════════════════════════
// 7. MALUS
// ═════════════════════════════════════════════════════════════════

describe("Malus", function() {

  // Remarques par défaut : r, h, u, s ont malus=true ; "!" a malus=false
  var paliers = [
    { seuil: 5, pct: 5 },
    { seuil: 10, pct: 10 },
  ];

  test("countMalusRemarks — compte uniquement les remarques avec malus=true", function() {
    var r = {};
    r[remarkKey(SID, "q1")] = ["r", "h", "!"];  // r et h comptent, ! non
    r[remarkKey(SID, "q2")] = ["s"];             // s compte
    expect(countMalusRemarks(r, SID, EXAM)).toBe(3);
  });

  test("countMalusRemarks — avec remarques custom", function() {
    var custom = [
      { id: "x", label: "Custom", malus: true },
      { id: "y", label: "Info", malus: false },
    ];
    var allRem = REMARQUES.concat(custom);
    var r = {};
    r[remarkKey(SID, "q1")] = ["r", "x", "y"]; // r et x comptent, y non
    expect(countMalusRemarks(r, SID, EXAM, allRem)).toBe(2);
  });

  test("countMalusRemarks — zéro remarques", function() {
    expect(countMalusRemarks({}, SID, EXAM)).toBe(0);
  });

  test("malusAuto — sous le premier palier → 0%", function() {
    var r = {};
    r[remarkKey(SID, "q1")] = ["r", "h"]; // 2 remarques < 5
    expect(malusAuto(r, SID, EXAM, paliers)).toBe(0);
  });

  test("malusAuto — entre les deux paliers → premier palier", function() {
    var r = {};
    r[remarkKey(SID, "q1")] = ["r", "h", "u", "s", "r"]; // 5 remarques ≥ 5 → 5%
    expect(malusAuto(r, SID, EXAM, paliers)).toBe(5);
  });

  test("malusAuto — au-dessus du dernier palier → dernier palier", function() {
    var r = {};
    // 10+ remarques malus
    r[remarkKey(SID, "q1")] = ["r", "h", "u", "s", "r", "h"];
    r[remarkKey(SID, "q2")] = ["r", "h", "u", "s"];
    expect(malusAuto(r, SID, EXAM, paliers)).toBe(10);
  });

  test("malusTotal — auto + manuel, plafonné à 100", function() {
    var r = {};
    r[remarkKey(SID, "q1")] = ["r", "h", "u", "s", "r"]; // 5 → 5%
    var manuel = {}; manuel[SID] = 3;
    expect(malusTotal(r, SID, EXAM, paliers, manuel)).toBe(8); // 5+3

    // Plafond
    var manuelMax = {}; manuelMax[SID] = 99;
    expect(malusTotal(r, SID, EXAM, paliers, manuelMax)).toBe(100); // 5+99 → 100
  });

  test("malusTotal — sans malus manuel → auto seul", function() {
    var r = {};
    r[remarkKey(SID, "q1")] = ["r", "h", "u", "s", "r"];
    expect(malusTotal(r, SID, EXAM, paliers, {})).toBe(5);
  });
});

// ═════════════════════════════════════════════════════════════════
// 8. NORMALISATION
// ═════════════════════════════════════════════════════════════════

describe("Normalisation", function() {

  test("none — retourne les notes inchangées", function() {
    var notes = [8, 12, 15];
    expect(normaliser(notes, "none", {})).toEqual([8, 12, 15]);
  });

  test("none — tableau vide → tableau vide", function() {
    expect(normaliser([], "proportional", { moyenneCible: 10 })).toEqual([]);
  });

  test("proportional — la moyenne atteint la cible", function() {
    var notes = [6, 10, 14]; // moy = 10
    var result = normaliser(notes, "proportional", { moyenneCible: 12 });
    var moy = result.reduce(function(a, b) { return a + b; }, 0) / result.length;
    expect(moy).toBeCloseTo(12);
  });

  test("proportional — moyenne zéro → retourne les notes telles quelles", function() {
    var notes = [0, 0, 0];
    expect(normaliser(notes, "proportional", { moyenneCible: 10 })).toEqual([0, 0, 0]);
  });

  test("proportional — les notes sont clampées [0, 20]", function() {
    var notes = [18, 19, 20]; // moy ≈ 19
    var result = normaliser(notes, "proportional", { moyenneCible: 20 });
    result.forEach(function(n) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(20);
    });
  });

  test("proportional_max — le max atteint la cible", function() {
    var notes = [4, 8, 12]; // max = 12
    var result = normaliser(notes, "proportional_max", { maxCible: 18 });
    expect(Math.max.apply(null, result)).toBeCloseTo(18);
  });

  test("affine — la moyenne atteint la cible", function() {
    var notes = [5, 8, 10, 12, 15]; // moy = 10
    var result = normaliser(notes, "affine", { moyenneCible: 12, sigmaCible: 3 });
    var moy = result.reduce(function(a, b) { return a + b; }, 0) / result.length;
    expect(moy).toBeCloseTo(12, 0);
  });

  test("affine — sigma zéro → tout le monde à la moyenne cible", function() {
    var notes = [10, 10, 10];
    var result = normaliser(notes, "affine", { moyenneCible: 14, sigmaCible: 3 });
    result.forEach(function(n) { expect(n).toBeCloseTo(14); });
  });

  test("affine_max — le meilleur obtient maxCible", function() {
    var notes = [4, 8, 12, 16]; // max = 16
    var result = normaliser(notes, "affine_max", { maxCible: 20, sigmaCible: 4 });
    expect(Math.max.apply(null, result)).toBeCloseTo(20);
  });

  test("gaussienne — la distribution est centrée sur la moyenne cible", function() {
    var notes = [2, 5, 7, 9, 11, 13, 15, 18];
    var result = normaliser(notes, "gaussienne", { moyenneCible: 10, sigmaCible: 3 });
    var moy = result.reduce(function(a, b) { return a + b; }, 0) / result.length;
    // La gaussienne par quantiles centre à peu près sur la cible
    expect(moy).toBeCloseTo(10, 0);
  });

  test("gaussienne — les notes restent dans [0, 20]", function() {
    var notes = [0, 1, 2, 3, 18, 19, 20];
    var result = normaliser(notes, "gaussienne", { moyenneCible: 10, sigmaCible: 5 });
    result.forEach(function(n) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(20);
    });
  });

  test("gaussienne — préserve l'ordre des notes", function() {
    var notes = [3, 7, 11, 15, 19];
    var result = normaliser(notes, "gaussienne", { moyenneCible: 10, sigmaCible: 3 });
    for (var i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
    }
  });

  test("méthode inconnue → retourne les notes inchangées", function() {
    var notes = [8, 12];
    expect(normaliser(notes, "trucmuche", {})).toEqual([8, 12]);
  });
});

// ═════════════════════════════════════════════════════════════════
// 9. IMPORT CSV
// ═════════════════════════════════════════════════════════════════

describe("Import CSV", function() {

  test("point-virgule", function() {
    var result = importCSV("DUPONT;Jean\nMARTIN;Claire");
    expect(result).toHaveLength(2);
    expect(result[0].nom).toBe("DUPONT");
    expect(result[0].prenom).toBe("Jean");
    expect(result[1].nom).toBe("MARTIN");
  });

  test("virgule", function() {
    var result = importCSV("DUPONT,Jean");
    expect(result[0].nom).toBe("DUPONT");
    expect(result[0].prenom).toBe("Jean");
  });

  test("tabulation", function() {
    var result = importCSV("DUPONT\tJean");
    expect(result[0].prenom).toBe("Jean");
  });

  test("espace", function() {
    var result = importCSV("DUPONT Jean");
    expect(result[0].nom).toBe("DUPONT");
    expect(result[0].prenom).toBe("Jean");
  });

  test("prénoms composés (point-virgule)", function() {
    var result = importCSV("DUPONT;Jean-Pierre Marie");
    expect(result[0].prenom).toBe("Jean-Pierre Marie");
  });

  test("lignes vides ignorées", function() {
    var result = importCSV("DUPONT;Jean\n\n\nMARTIN;Claire\n");
    expect(result).toHaveLength(2);
  });

  test("retours chariot Windows (\\r\\n)", function() {
    var result = importCSV("DUPONT;Jean\r\nMARTIN;Claire");
    expect(result).toHaveLength(2);
  });

  test("chaque élève a un id unique", function() {
    var result = importCSV("A;B\nC;D\nE;F");
    var ids = result.map(function(s) { return s.id; });
    expect(new Set(ids).size).toBe(3);
  });

  test("ligne avec un seul champ → ignorée", function() {
    var result = importCSV("DUPONT\nMARTIN;Claire");
    // "DUPONT" seul → split par espace donne 1 seul élément → null → filtré
    expect(result).toHaveLength(1);
    expect(result[0].nom).toBe("MARTIN");
  });
});

// ═════════════════════════════════════════════════════════════════
// 10. VALIDATION DES DONNÉES IMPORTÉES
// ═════════════════════════════════════════════════════════════════

import { validateState } from "./calculs";

describe("validateState", function() {

  function minimalValid() {
    return {
      exams: [{ id: "e1", exercises: [] }],
      students: [{ id: "s1", nom: "Dupont", prenom: "Jean" }],
      grades: {},
    };
  }

  test("données minimales valides", function() {
    var v = validateState(minimalValid());
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  test("null → invalide", function() {
    var v = validateState(null);
    expect(v.valid).toBe(false);
  });

  test("tableau → invalide", function() {
    var v = validateState([1, 2, 3]);
    expect(v.valid).toBe(false);
  });

  test("exams manquant → erreur bloquante", function() {
    var v = validateState({ students: [{ id: "s1", nom: "A", prenom: "B" }] });
    expect(v.valid).toBe(false);
    expect(v.errors.some(function(e) { return e.indexOf("exams") >= 0; })).toBe(true);
  });

  test("students manquant → erreur bloquante", function() {
    var v = validateState({ exams: [{ id: "e1", exercises: [] }] });
    expect(v.valid).toBe(false);
    expect(v.errors.some(function(e) { return e.indexOf("students") >= 0; })).toBe(true);
  });

  test("exam sans id → erreur", function() {
    var d = minimalValid();
    d.exams.push({ exercises: [] });
    var v = validateState(d);
    expect(v.valid).toBe(false);
  });

  test("élève sans nom → warning (pas bloquant)", function() {
    var d = minimalValid();
    d.students.push({ id: "s2", prenom: "Alice" });
    var v = validateState(d);
    expect(v.valid).toBe(true);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  test("grades invalide (string) → warning + reset à {}", function() {
    var d = minimalValid();
    d.grades = "oups";
    var v = validateState(d);
    expect(v.valid).toBe(true);
    expect(v.data.grades).toEqual({});
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  test("seuil non numérique → warning + supprimé", function() {
    var d = minimalValid();
    d.seuils = { nonNote: "vingt", D: 25, C: 50, B: 75 };
    var v = validateState(d);
    expect(v.valid).toBe(true);
    expect(v.data.seuils.nonNote).toBeUndefined();
    expect(v.data.seuils.D).toBe(25);
  });

  test("malusPaliers non-tableau → warning + supprimé", function() {
    var d = minimalValid();
    d.malusPaliers = "invalide";
    var v = validateState(d);
    expect(v.valid).toBe(true);
    expect(v.data.malusPaliers).toBeUndefined();
  });
});
