// ═══════════════════════════════════════════════════════════════════
// TESTS UNITAIRES — statsClasse.js (article de classe)
// ═══════════════════════════════════════════════════════════════════
//
// Exécution :  npx react-scripts test -- --watchAll=false statsClasse.test
//
// ═══════════════════════════════════════════════════════════════════

import {
  moyenne, ecartType, quantile, resume, pearson, rangsMoyens, spearman,
  rangsCompetition, statsDS, serieDS, evolution,
} from "./statsClasse";

// ─── Fixtures ────────────────────────────────────────────────────

function item(id, points) { return { id: id, points: points }; }

// DS1 : un exercice, deux questions (4 pts + 6 pts), compétences R et V
function ds(id, prefixe) {
  return {
    id: id, nomDS: "DS " + id, dateDS: "",
    settings: { normMethod: "none", seuilDifficile: 40, seuilPiege: 30, malusPaliers: [] },
    exercises: [{
      id: prefixe + "ex", title: "Exercice " + id,
      questions: [
        { id: prefixe + "q1", label: "1", competences: ["R"], items: [item(prefixe + "a", 2), item(prefixe + "b", 2)] },
        { id: prefixe + "q2", label: "2", competences: ["V"], items: [item(prefixe + "c", 6)] },
      ],
    }],
  };
}

var ELEVES = [
  { id: "e1", nom: "Zola", prenom: "Émile" },
  { id: "e2", nom: "Arago", prenom: "François" },
  { id: "e3", nom: "Curie", prenom: "Marie" },
  { id: "e4", nom: "Borel", prenom: "Émile" },
  { id: "e5", nom: "Dirac", prenom: "Paul" },
  { id: "e6", nom: "Euler", prenom: "Leonhard" },
  { id: "e7", nom: "Fermat", prenom: "Pierre" },
];

// Coche une liste d'items pour un élève
function coche(grades, sid, items) {
  items.forEach(function(it) { grades[sid + "__" + it] = true; });
  return grades;
}

// ─── Outils statistiques ─────────────────────────────────────────

describe("Outils statistiques", function() {
  test("moyenne, écart-type de population, quantiles", function() {
    expect(moyenne([2, 4, 6])).toBe(4);
    expect(ecartType([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([10], 0.9)).toBe(10);
    expect(moyenne([])).toBe(0);
  });

  test("resume — part des notes ≥ 10", function() {
    var r = resume([8, 10, 12, 14]);
    expect(r.n).toBe(4);
    expect(r.med).toBe(11);
    expect(r.partSup10).toBe(0.75);
  });

  test("pearson — série constante → null", function() {
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNull();
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  test("rangsMoyens — ex-aequo", function() {
    expect(rangsMoyens([10, 20, 20, 5])).toEqual([2, 3.5, 3.5, 1]);
  });

  test("spearman — ordre identique, inversé, avec ex-aequo", function() {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
    var rho = spearman([1, 2, 2, 3], [1, 2, 3, 4]);
    expect(rho).toBeGreaterThan(0.9);
    expect(rho).toBeLessThan(1);
  });

  test("rangsCompetition — ex-aequo au même rang, le suivant saute", function() {
    expect(rangsCompetition({ a: 15, b: 12, c: 15, d: 9 })).toEqual({ a: 1, c: 1, b: 3, d: 4 });
  });
});

// ─── statsDS ─────────────────────────────────────────────────────

describe("statsDS", function() {
  var DS1 = ds("ds1", "x");
  var grades = {};
  coche(grades, "e1", ["xa", "xb", "xc"]);   // 10/10 → 20
  coche(grades, "e2", ["xa", "xc"]);         // 8/10  → 16
  coche(grades, "e3", ["xa", "xb", "xc"]);   // 20 (ex-aequo avec e1)
  coche(grades, "e4", ["xc"]);               // 12
  coche(grades, "e5", ["xa"]);               // 4
  coche(grades, "e6", ["xb"]);               // 4
  // e7 : copie vide (non corrigée)
  var absents = { "ds1__e6": true };         // e6 absent malgré une case cochée

  var st = statsDS({ exam: DS1, students: ELEVES, grades: grades, absents: absents, groupes: {}, remarks: {}, malusManuel: {} });

  test("effectifs : absents et copies non corrigées exclus", function() {
    expect(st.nInscrits).toBe(7);
    expect(st.nAbsents).toBe(1);
    expect(st.nPresents).toBe(6);
    expect(st.nCorriges).toBe(5);
    expect(st.ids).not.toContain("e6");
    expect(st.ids).not.toContain("e7");
  });

  test("notes et résumé", function() {
    expect(st.notes.e2.brut).toBeCloseTo(16, 6);
    expect(st.brut.moy).toBeCloseTo((20 + 16 + 20 + 12 + 4) / 5, 6);
    expect(st.norm.moy).toBeCloseTo(st.brut.moy, 6); // normMethod none
  });

  test("co-auteurs : rang ≤ 5, ordre alphabétique", function() {
    // 5 copies corrigées → toutes de rang ≤ 5
    expect(st.coauteurs.map(function(s) { return s.nom; })).toEqual(["Arago", "Borel", "Curie", "Dirac", "Zola"]);
    expect(st.rangs.e1).toBe(1);
    expect(st.rangs.e3).toBe(1);
    expect(st.rangs.e2).toBe(3);
  });

  test("questions : traitement, réussite, délaissée", function() {
    var q1 = st.questions[0], q2 = st.questions[1];
    // Q1 traitée par e1, e2, e3, e5 (4/5)
    expect(q1.tauxTraitement).toBeCloseTo(0.8, 6);
    // réussite Q1 : (4 + 2 + 4 + 2) / (4 × 4)
    expect(q1.tauxReussite).toBeCloseTo(12 / 16, 6);
    expect(q1.delaissee).toBe(false);
    expect(q2.tauxTraitement).toBeCloseTo(0.8, 6);
  });

  test("compétences agrégées sur les questions traitées", function() {
    expect(st.comp.R).toBeCloseTo(12 / 16, 6);
    expect(st.comp.V).toBeCloseTo(1, 6);
    expect(st.comp.A).toBeNull(); // non évaluée dans ce DS
  });

  test("stratégies : un point anonyme par copie corrigée", function() {
    expect(st.strategies.length).toBe(5);
    expect(Object.keys(st.strategies[0]).sort()).toEqual(["efficacite", "justesse"]);
  });

  test("ex-aequo au 5e rang : tous inclus", function() {
    var g = {};
    coche(g, "e1", ["xa", "xb", "xc"]);
    coche(g, "e2", ["xa", "xb", "xc"]);
    coche(g, "e3", ["xa", "xc"]);
    coche(g, "e4", ["xa", "xc"]);
    coche(g, "e5", ["xc"]);
    coche(g, "e6", ["xc"]);
    coche(g, "e7", ["xa"]);
    var s2 = statsDS({ exam: DS1, students: ELEVES, grades: g, absents: {}, groupes: {}, remarks: {}, malusManuel: {} });
    // e5 et e6 ex-aequo au 5e rang → 6 co-auteurs
    expect(s2.coauteurs.length).toBe(6);
    expect(s2.coauteurs.map(function(s) { return s.id; })).not.toContain("e7");
  });
});

// ─── serieDS et evolution ────────────────────────────────────────

describe("serieDS et evolution", function() {
  var DS1 = ds("ds1", "x"), DS2 = ds("ds2", "y"), DS3 = ds("ds3", "z");
  var grades = {};
  // DS1 : classement e1 > e2 > e3 > e4 > e5 > e6
  coche(grades, "e1", ["xa", "xb", "xc"]);
  coche(grades, "e2", ["xa", "xc"]);
  coche(grades, "e3", ["xc"]);
  coche(grades, "e4", ["xa", "xb"]);
  coche(grades, "e5", ["xa"]);
  grades["treated_e6_xq2"] = true;            // copie corrigée à 0 (case « traitée »)
  // DS2 : aucune copie corrigée
  // DS3 : classement proche de DS1, e6 et e7 progressent
  coche(grades, "e1", ["za", "zb", "zc"]);
  coche(grades, "e2", ["za", "zc"]);
  coche(grades, "e3", ["zc"]);
  coche(grades, "e4", ["za"]);
  coche(grades, "e6", ["zc", "za", "zb"]);
  coche(grades, "e7", ["zb"]);

  var base = { exams: [DS1, DS2, DS3], students: ELEVES, grades: grades, absents: {}, groupes: {}, remarks: {}, malusManuel: {} };

  test("serieDS : DS antérieurs avec copies corrigées, du plus ancien au plus récent", function() {
    var serie = serieDS(Object.assign({ examId: "ds3" }, base));
    expect(serie.map(function(s) { return s.examId; })).toEqual(["ds1"]); // ds2 sans copie ignoré
    expect(serieDS(Object.assign({ examId: "ds1" }, base))).toEqual([]);
  });

  test("evolution : écarts, Spearman, co-auteurs retenus et entrants", function() {
    var serie = serieDS(Object.assign({ examId: "ds3" }, base));
    var prev = serie[serie.length - 1];
    var cur = statsDS(Object.assign({ exam: DS3 }, base));
    var evo = evolution(prev, cur);
    expect(evo.nCommuns).toBe(5); // e1, e2, e3, e4, e6
    expect(evo.rho).not.toBeNull();
    expect(evo.dMoyBrut).toBeCloseTo(cur.brut.moy - prev.brut.moy, 10);
    expect(evo.retenus + evo.entrants.length).toBe(cur.coauteurs.length);
    // e7 absent du DS1 → entrant ; les entrants sont des élèves nommés
    expect(evo.entrants.map(function(s) { return s.id; })).toContain("e7");
  });

  test("evolution : moins de 5 élèves communs → pas de Spearman", function() {
    var g = {};
    coche(g, "e1", ["xa"]); coche(g, "e2", ["xc"]);
    coche(g, "e1", ["za"]); coche(g, "e2", ["zc"]);
    var p = statsDS({ exam: DS1, students: ELEVES, grades: g, absents: {}, groupes: {}, remarks: {}, malusManuel: {} });
    var c = statsDS({ exam: DS3, students: ELEVES, grades: g, absents: {}, groupes: {}, remarks: {}, malusManuel: {} });
    expect(evolution(p, c).rho).toBeNull();
  });
});
