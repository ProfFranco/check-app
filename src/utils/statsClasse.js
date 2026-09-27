// ═══════════════════════════════════════════════════════════════════
// STATISTIQUES DE CLASSE (article de classe, étude longitudinale)
// ═══════════════════════════════════════════════════════════════════
//
// Fonctions pures, sans React : agrégats d'un DS pour toute la classe,
// série des DS précédents, évolution entre deux DS.
//
// Comme calculs.js, ce module est inconditionnel : il ne lit jamais
// exam.features (le masquage par preset se fait dans le générateur).
// Il ne reçoit aucune donnée privée (notesPrivees, perles, commentaires).
// ═══════════════════════════════════════════════════════════════════

import { COMPETENCES, DEFAULT_EXAM_SETTINGS } from "../config/settings";
import {
  gradeKey, treatedKey, examAbsents,
  questionScore, exerciseScore, ratioJustesse, ratioEfficacite,
  copieCorrigee, notesDS,
} from "./calculs";

// Rang maximal des co-auteurs honoraires (ex-aequo inclus)
export const RANG_COAUTEURS = 5;

// ─── Outils statistiques ─────────────────────────────────────────

function _pts(it) { return parseFloat(it.points) || 0; }

/** Barème d'une question (items négatifs exclus) */
function _qMax(q) {
  return (q.items || []).reduce((s, it) => it.negative ? s : s + _pts(it), 0);
}

function _traitee(grades, studentId, q) {
  return !!(grades[treatedKey(studentId, q.id)]
    || (q.items || []).some(it => grades[gradeKey(studentId, it.id)]));
}

export function moyenne(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/** Écart-type de population (même convention que normaliser) */
export function ecartType(arr) {
  if (!arr.length) return 0;
  const m = moyenne(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) * (x - m), 0) / arr.length);
}

/** Quantile par interpolation linéaire (p dans [0, 1]) sur un tableau trié */
export function quantile(sorted, p) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Résumé d'une série de notes /20 */
export function resume(notes) {
  const s = notes.slice().sort((a, b) => a - b);
  return {
    n: s.length,
    moy: moyenne(s),
    med: quantile(s, 0.5),
    sigma: ecartType(s),
    q1: quantile(s, 0.25),
    q3: quantile(s, 0.75),
    p10: quantile(s, 0.10),
    p90: quantile(s, 0.90),
    partSup10: s.length ? s.filter(x => x >= 10).length / s.length : 0,
  };
}

/** Coefficient de corrélation de Pearson ; null si une série est constante */
export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = moyenne(xs), my = moyenne(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Rangs moyens (1 = plus petite valeur ; ex-aequo → moyenne des rangs) */
export function rangsMoyens(values) {
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = new Array(values.length);
  let k = 0;
  while (k < idx.length) {
    let j = k;
    while (j + 1 < idx.length && idx[j + 1].v === idx[k].v) j++;
    const rm = (k + j) / 2 + 1;
    for (let t = k; t <= j; t++) r[idx[t].i] = rm;
    k = j + 1;
  }
  return r;
}

/** Corrélation de rang de Spearman (ex-aequo gérés par rangs moyens) */
export function spearman(xs, ys) {
  return pearson(rangsMoyens(xs), rangsMoyens(ys));
}

/**
 * Classement « compétition » (1 = meilleure note ; ex-aequo au même rang,
 * le suivant saute) — même règle que les rapports individuels.
 * notes : { [id]: nombre }. Retourne { [id]: rang }.
 */
export function rangsCompetition(notes) {
  const ranked = Object.keys(notes).map(id => ({ id, note: notes[id] }))
    .sort((a, b) => b.note - a.note);
  const rangs = {};
  let rg = 1;
  ranked.forEach((r, i) => {
    if (i > 0 && r.note < ranked[i - 1].note) rg = i + 1;
    rangs[r.id] = rg;
  });
  return rangs;
}

function _ordreAlpha(a, b) {
  const opt = { sensitivity: "base" };
  return (a.nom || "").localeCompare(b.nom || "", "fr", opt)
    || (a.prenom || "").localeCompare(b.prenom || "", "fr", opt);
}

// ─── Statistiques d'un DS ────────────────────────────────────────

/**
 * Agrégats d'un DS pour toute la classe, calculés sur les copies corrigées
 * avec les réglages propres à ce DS (exam.settings, repli sur les défauts).
 * absents : store complet { examId__studentId: true }.
 */
export function statsDS({ exam, students, grades, absents, groupes, remarks, malusManuel, allRemarques }) {
  const settings = Object.assign({}, DEFAULT_EXAM_SETTINGS, exam.settings || {});
  const abs = examAbsents(absents || {}, exam.id);
  const presents = students.filter(s => !abs[s.id]);
  const corriges = presents.filter(s => copieCorrigee(grades, s.id, exam));
  const notes = notesDS(exam, corriges, grades, settings, groupes, remarks, malusManuel, allRemarques);
  const ids = corriges.map(s => s.id);
  const brut = ids.map(id => notes[id].brut);

  // Compétences : taux de réussite agrégé sur les questions traitées
  // (items négatifs exclus du barème, comme competencePct)
  const comp = {};
  COMPETENCES.forEach(c => {
    let max = 0, obt = 0, evaluee = false;
    exam.exercises.forEach(ex => ex.questions.forEach(q => {
      if ((q.competences || []).indexOf(c.id) < 0) return;
      evaluee = true;
      corriges.forEach(s => {
        if (!_traitee(grades, s.id, q)) return;
        max += _qMax(q);
        (q.items || []).forEach(it => { if (grades[gradeKey(s.id, it.id)]) obt += _pts(it); });
      });
    }));
    comp[c.id] = evaluee && max > 0 ? Math.max(0, obt) / max : null;
  });

  // Exercices
  const exercices = exam.exercises.map(ex => {
    const max = ex.questions.reduce((s, q) => q.bonus ? s : s + _qMax(q), 0);
    const pcts = max > 0
      ? corriges.map(s => exerciseScore(grades, s.id, ex, settings.bonusCompletConfig, settings.clampQuestion).earned / max)
      : [];
    const traitants = corriges.filter(s => ex.questions.some(q => _traitee(grades, s.id, q))).length;
    return {
      id: ex.id, title: ex.title || "", max,
      coeff: ex.coeff !== undefined ? ex.coeff : 1,
      moyPct: pcts.length ? moyenne(pcts) : null,
      tauxTraitement: corriges.length ? traitants / corriges.length : 0,
    };
  });

  // Questions
  const questions = [];
  exam.exercises.forEach(ex => ex.questions.forEach(q => {
    const qMax = _qMax(q);
    const traitants = corriges.filter(s => _traitee(grades, s.id, q));
    const tauxTraitement = corriges.length ? traitants.length / corriges.length : 0;
    const earned = traitants.reduce((s, st) => s + questionScore(grades, st.id, q, settings.clampQuestion).earned, 0);
    const tauxReussite = traitants.length && qMax > 0 ? earned / (traitants.length * qMax) : null;
    // Pouvoir discriminant : corrélation score à la question / note brute
    let discrimination = null;
    if (qMax > 0 && traitants.length >= 3) {
      const xs = corriges.map(s => questionScore(grades, s.id, q, settings.clampQuestion).earned / qMax);
      discrimination = pearson(xs, brut);
    }
    questions.push({
      id: q.id, label: q.label || "", exId: ex.id, exTitle: ex.title || "",
      competences: q.competences || [], bonus: !!q.bonus, max: qMax,
      tauxTraitement, tauxReussite, discrimination,
      delaissee: tauxTraitement * 100 < settings.seuilDifficile,
      piege: tauxTraitement >= 0.5 && tauxReussite !== null && tauxReussite * 100 < settings.seuilPiege,
    });
  }));

  // Classement et co-auteurs honoraires
  const noteFinale = {};
  ids.forEach(id => { noteFinale[id] = notes[id].norm; });
  const rangs = rangsCompetition(noteFinale);
  const coauteurs = corriges.filter(s => rangs[s.id] <= RANG_COAUTEURS).slice().sort(_ordreAlpha);

  // Stratégies (justesse × efficacité) : nuage anonyme, trié pour que
  // l'ordre des points ne suive pas celui de la liste d'élèves
  const strategies = corriges.map(s => ({
    justesse: ratioJustesse(grades, s.id, exam),
    efficacite: ratioEfficacite(grades, s.id, exam),
  })).sort((a, b) => (a.efficacite - b.efficacite) || (a.justesse - b.justesse));

  return {
    examId: exam.id, nomDS: exam.nomDS || exam.name || "", dateDS: exam.dateDS || "",
    settings,
    nInscrits: students.length, nAbsents: students.length - presents.length,
    nPresents: presents.length, nCorriges: corriges.length,
    ids, notes, rangs, coauteurs,
    norm: resume(ids.map(id => notes[id].norm)),
    brut: resume(brut),
    comp,
    justesse: moyenne(strategies.map(p => p.justesse)),
    efficacite: moyenne(strategies.map(p => p.efficacite)),
    strategies, exercices, questions,
  };
}

/**
 * Statistiques des DS qui précèdent examId dans la liste des DS du profil
 * (ordre du tableau : dateDS est du texte libre), limitées à ceux qui ont
 * au moins une copie corrigée. Du plus ancien au plus récent.
 */
export function serieDS({ exams, examId, students, grades, absents, groupes, remarks, malusManuel, allRemarques }) {
  const idx = exams.findIndex(e => e.id === examId);
  if (idx <= 0) return [];
  return exams.slice(0, idx)
    .map(exam => statsDS({ exam, students, grades, absents, groupes, remarks, malusManuel, allRemarques }))
    .filter(st => st.nCorriges > 0);
}

/**
 * Évolution entre deux DS (prev → cur) : écarts, stabilité du classement
 * (Spearman sur les élèves corrigés dans les deux, si au moins 5),
 * co-auteurs retenus (nombre) et entrants (élèves).
 */
export function evolution(prev, cur) {
  const communs = cur.ids.filter(id => prev.notes[id]);
  const rho = communs.length >= 5
    ? spearman(communs.map(id => prev.notes[id].norm), communs.map(id => cur.notes[id].norm))
    : null;
  const idsPrec = prev.coauteurs.map(s => s.id);
  const dComp = {};
  COMPETENCES.forEach(c => {
    dComp[c.id] = (cur.comp[c.id] !== null && prev.comp[c.id] !== null) ? cur.comp[c.id] - prev.comp[c.id] : null;
  });
  return {
    dMoyBrut: cur.brut.moy - prev.brut.moy,
    dMoyNorm: cur.norm.moy - prev.norm.moy,
    dSigmaBrut: cur.brut.sigma - prev.brut.sigma,
    dJustesse: cur.justesse - prev.justesse,
    dEfficacite: cur.efficacite - prev.efficacite,
    dComp,
    nCommuns: communs.length,
    rho,
    nCoauteursPrec: idsPrec.length,
    retenus: cur.coauteurs.filter(s => idsPrec.indexOf(s.id) >= 0).length,
    entrants: cur.coauteurs.filter(s => idsPrec.indexOf(s.id) < 0),
  };
}
