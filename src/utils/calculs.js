// ═══════════════════════════════════════════════════════════════════
// FONCTIONS DE CALCUL
// ═══════════════════════════════════════════════════════════════════
//
// Toutes les fonctions de calcul de scores, compétences, statistiques,
// normalisation et malus. Aucune dépendance React — utilisables
// aussi bien côté client que dans un script Node.js.
// ═══════════════════════════════════════════════════════════════════

import { COMPETENCES, REMARQUES } from "../config/settings";

// ─── Utilitaires de base ─────────────────────────────────────────

/** Génère un identifiant unique court */
export const uid = () => Math.random().toString(36).slice(2, 10);

/** Clé de stockage pour la note d'un item d'un élève */
export const gradeKey = (studentId, itemId) => studentId + "__" + itemId;

/** Clé de stockage pour les remarques d'une question d'un élève */
export const remarkKey = (studentId, questionId) => studentId + "__" + questionId;

/** Clé de stockage pour les points traités d'une question d'un élève */
export function treatedKey(studentId, questionId) {
  return "treated_" + studentId + "_" + questionId;
}


/** Borne une valeur entre min et max */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Couleur d'une compétence selon le mode clair/sombre */
export const compColor = (comp, isDark) => isDark ? comp.colorDark : comp.color;

// ─── Scores ──────────────────────────────────────────────────────

/** Score d'un élève sur une question : { earned, total } */
export function questionScore(grades, studentId, question) {
  let earned = 0, total = 0;
  for (const item of question.items) {
    const pts = parseFloat(item.points) || 0;
    total += pts;
    if (grades[gradeKey(studentId, item.id)]) earned += pts;
  }
   // La question est "traitée" si au moins un item est coché
  // OU si la case "traitée" est explicitement cochée
  const wasTreated = earned > 0
    || !!grades[treatedKey(studentId, question.id)];
  return { earned, total, treated: wasTreated };
}


/** Score d'un élève sur un exercice : { earned, total }
 *  total exclut les questions bonus (conformément au principe :
 *  les bonus s'ajoutent au score mais pas au maximum). */
export function exerciseScore(grades, studentId, exercise) {
  let earned = 0, total = 0;
  for (const q of exercise.questions) {
    const s = questionScore(grades, studentId, q);
    earned += s.earned;
    if (!q.bonus) total += s.total;
  }
  return { earned, total };
}

/** Score total d'un élève sur l'examen (points bruts, sans coefficients) */
export function studentTotal(grades, studentId, exam) {
  return exam.exercises.reduce((sum, ex) => sum + exerciseScore(grades, studentId, ex).earned, 0);
}

/** Total des points de l'examen (hors bonus, sans coefficients) */
export function examTotal(exam) {
  return exam.exercises.reduce((s, ex) =>
    s + ex.questions.reduce((sq, q) =>
      q.bonus ? sq : sq + q.items.reduce((si, it) => si + (parseFloat(it.points) || 0), 0), 0), 0);
}

/** Score pondéré d'un élève (coefficients appliqués, bonus inclus dans earned) */
export function studentTotalWeighted(grades, studentId, exam) {
  return exam.exercises.reduce((sum, ex) => {
    const coeff = ex.coeff !== undefined ? ex.coeff : 1;
    return sum + exerciseScore(grades, studentId, ex).earned * coeff;
  }, 0);
}

/** Maximum pondéré de l'examen (hors bonus) */
export function examTotalWeighted(exam) {
  return exam.exercises.reduce((s, ex) => {
    const coeff = ex.coeff !== undefined ? ex.coeff : 1;
    return s + ex.questions.reduce((sq, q) =>
      q.bonus ? sq : sq + q.items.reduce((si, it) => si + (parseFloat(it.points) || 0), 0) * coeff, 0);
  }, 0);
}

/** Note sur 20 */
export function noteSur20(earned, total) {
  return total === 0 ? 0 : (earned / total) * 20;
}

// ─── Points traités et ratios ────────────────────────────────────

/** Points des questions auxquelles l'élève a répondu (au moins un item coché) */
/** Points des questions traitées par l'élève (hors bonus, pour ratioEfficacite) */
export function pointsTraites(grades, studentId, exam) {
  let traites = 0;
  for (const ex of exam.exercises) {
    for (const q of ex.questions) {
      if (q.bonus) continue; // bonus exclus du calcul d'efficacité
      const qTraitee = grades[treatedKey(studentId, q.id)]
        || (q.items || []).some(it => grades[gradeKey(studentId, it.id)]);
      if (qTraitee) {
        traites += (q.items || []).reduce((s, it) => s + (parseFloat(it.points) || 0), 0);
      }
    }
  }
  return traites;
}


/** Ratio de justesse : points obtenus / points traités */
export function ratioJustesse(grades, studentId, exam) {
  const traites = pointsTraites(grades, studentId, exam);
  return traites === 0 ? 0 : studentTotal(grades, studentId, exam) / traites;
}

/** Ratio d'efficacité : points traités / total examen */
export function ratioEfficacite(grades, studentId, exam) {
  const total = examTotal(exam);
  return total === 0 ? 0 : pointsTraites(grades, studentId, exam) / total;
}

// ─── Notes par compétence ────────────────────────────────────────

/**
 * Calcule la note lettre (A/B/C/D/NN) par compétence pour un élève.
 * Retourne un objet { A: "B", N: "C", R: "A", V: "NN" }
 */
export function notesParCompetence(grades, studentId, exam, seuils) {
  const result = {};
  for (const comp of COMPETENCES) {
    let totalComp = 0, maxTraite = 0, obtenu = 0;
    for (const ex of exam.exercises) {
      for (const q of ex.questions) {
        if (!q.competences.includes(comp.id)) continue;
        const pts = (q.items || []).reduce((s, it) => s + (parseFloat(it.points) || 0), 0);
        totalComp += pts;
        // ← MODIFICATION : case "traitée" OU au moins un item coché
        const qTraitee = grades[treatedKey(studentId, q.id)]
          || (q.items || []).some(it => grades[gradeKey(studentId, it.id)]);
        if (qTraitee) {
          maxTraite += pts;
          for (const it of (q.items || [])) {
            if (grades[gradeKey(studentId, it.id)]) obtenu += parseFloat(it.points) || 0;
          }
        }
      }
    }
    if (totalComp === 0) { result[comp.id] = "—"; continue; }
    if ((maxTraite / totalComp) * 100 <= seuils.nonNote) { result[comp.id] = "NN"; continue; }
    const pct = maxTraite > 0 ? (obtenu / maxTraite) * 100 : 0;
    result[comp.id] = pct < seuils.D ? "D" : pct < seuils.C ? "C" : pct < seuils.B ? "B" : "A";
  }
  return result;
}


/**
 * Pourcentages de réussite par compétence (pour le radar).
 * Retourne { A: 0.72, N: 0.45, R: 0.90, V: 0.60 }
 */
export function competencePct(grades, studentId, exam) {
  const result = {};
  for (const comp of COMPETENCES) {
    let maxTraite = 0, obtenu = 0;
    for (const ex of exam.exercises) {
      for (const q of ex.questions) {
        if (!q.competences.includes(comp.id)) continue;
        // ← MODIFICATION : case "traitée" OU au moins un item coché
        const qTraitee = grades[treatedKey(studentId, q.id)]
          || (q.items || []).some(it => grades[gradeKey(studentId, it.id)]);
        if (qTraitee) {
          maxTraite += (q.items || []).reduce((s, it) => s + (parseFloat(it.points) || 0), 0);
          for (const it of (q.items || [])) {
            if (grades[gradeKey(studentId, it.id)]) obtenu += parseFloat(it.points) || 0;
          }
        }
      }
    }
    result[comp.id] = maxTraite > 0 ? obtenu / maxTraite : 0;
  }
  return result;
}


// ─── Scores par exercice (pour le radar exercices) ───────────────

/** % de réussite absolu par exercice */
export function exercisePctAbsolute(grades, studentId, exam) {
  return exam.exercises.map(ex => {
    const s = exerciseScore(grades, studentId, ex);
    return {
      id: ex.id,
      label: ex.title.replace(/^Exercice\s*/i, "Ex.").slice(0, 12),
      pct: s.total > 0 ? s.earned / s.total : 0,
    };
  });
}

/** % relatif par exercice (par rapport au meilleur de la classe) */
export function exercisePctRelative(grades, studentId, exam, students, absents) {
  const presents = students.filter(s => !absents[s.id]);
  return exam.exercises.map(ex => {
    const maxScore = Math.max(...presents.map(s => exerciseScore(grades, s.id, ex).earned), 0.001);
    return {
      id: ex.id,
      label: ex.title.replace(/^Exercice\s*/i, "Ex.").slice(0, 12),
      pct: exerciseScore(grades, studentId, ex).earned / maxScore,
    };
  });
}

// ─── Malus ───────────────────────────────────────────────────────

/**
 * Compte les remarques d'un élève qui comptent pour le malus.
 * Ignore les remarques dont malus === false dans la config.
 */
export function countMalusRemarks(remarks, studentId, exam, allRemarques) {
  const source = allRemarques || REMARQUES;
  const malusIds = source.filter(r => r.malus).map(r => r.id);
  let total = 0;
  for (const ex of exam.exercises) {
    for (const q of ex.questions) {
      const r = remarks[remarkKey(studentId, q.id)];
      if (r) total += r.filter(rid => malusIds.includes(rid)).length;
    }
  }
  return total;
}

/** Malus automatique (%) basé sur les paliers */
export function malusAuto(remarks, studentId, exam, paliers, allRemarques) {
  const count = countMalusRemarks(remarks, studentId, exam, allRemarques);
  let pct = 0;
  const sorted = [...paliers].sort((a, b) => a.seuil - b.seuil);
  for (const p of sorted) {
    if (count >= p.seuil) pct = p.pct;
  }
  return pct;
}

/** Malus total (auto + manuel), plafonné à 100% */
export function malusTotal(remarks, studentId, exam, paliers, malusManuel, allRemarques) {
  return Math.min(100, malusAuto(remarks, studentId, exam, paliers, allRemarques) + (malusManuel[studentId] || 0));
}

// ─── Normalisation ───────────────────────────────────────────────

/**
 * Approximation de l'inverse de la fonction de répartition normale (Φ⁻¹).
 * Algorithme de Beasley-Springer-Moro.
 * Utilisée pour la normalisation gaussienne par quantiles.
 */
function normInv(p) {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

/**
 * Normalise un tableau de notes /20 selon la méthode choisie.
 *
 * Méthodes disponibles :
 * - "none"             : pas de normalisation
 * - "proportional"     : proportionnelle calee sur la moyenne  (note x moy_c / moy)
 * - "proportional_max" : proportionnelle calee sur le maximum  (note x max_c / max)
 * - "affine"           : affine calee sur moyenne + sigma      (ax+b, point fixe = moy)
 * - "affine_max"       : affine calee sur maximum  + sigma     (ax+b, point fixe = max)
 * - "gaussienne"       : distribution gaussienne par quantiles
 *
 * Parametres selon le mode :
 * - proportional     : { moyenneCible }
 * - proportional_max : { maxCible }
 * - affine           : { moyenneCible, sigmaCible }
 * - affine_max       : { maxCible, sigmaCible }
 * - gaussienne       : { moyenneCible, sigmaCible }
 */
export function normaliser(notes, method, params) {
  if (method === "none" || !notes.length) return notes;

  const moy = notes.reduce((a, b) => a + b, 0) / notes.length;
  const max = Math.max(...notes);

  if (method === "proportional") {
    if (moy === 0) return notes;
    return notes.map(n => clamp(n * params.moyenneCible / moy, 0, 20));
  }

  if (method === "proportional_max") {
    if (max === 0) return notes;
    return notes.map(n => clamp(n * (params.maxCible || 20) / max, 0, 20));
  }

  if (method === "affine") {
    const sigma = Math.sqrt(notes.reduce((s, n) => s + (n - moy) ** 2, 0) / notes.length);
    if (sigma === 0) return notes.map(() => params.moyenneCible);
    return notes.map(n => clamp(
      params.moyenneCible + params.sigmaCible * (n - moy) / sigma, 0, 20
    ));
  }

  if (method === "affine_max") {
    // Point fixe = max : le meilleur obtient exactement maxCible
    // Pente identique a l'affine classique : sigmaCible / sigma
    const sigma = Math.sqrt(notes.reduce((s, n) => s + (n - moy) ** 2, 0) / notes.length);
    if (sigma === 0) return notes.map(() => params.maxCible || 20);
    const mc = params.maxCible || 20;
    return notes.map(n => clamp(
      mc + params.sigmaCible * (n - max) / sigma, 0, 20
    ));
  }

  if (method === "gaussienne") {
    const sorted = notes.map((n, i) => ({ n, i })).sort((a, b) => a.n - b.n);
    const result = new Array(notes.length);
    sorted.forEach((item, rank) => {
      const percentile = clamp((rank + 0.5) / notes.length, 0.001, 0.999);
      result[item.i] = clamp(
        params.moyenneCible + params.sigmaCible * normInv(percentile), 0, 20
      );
    });
    return result;
  }

  return notes;
}

// ─── Import CSV d'élèves ─────────────────────────────────────────

/**
 * Parse un texte CSV et retourne un tableau d'élèves.
 * Formats acceptés :  NOM;Prénom  ou  NOM,Prénom  ou  NOM\tPrénom  ou  NOM Prénom
 */
export function importCSV(text) {
  return text.split(/\r?\n/).filter(l => l.trim()).map(line => {
    let parts;
    if (line.includes(";")) parts = line.split(";");
    else if (line.includes(",")) parts = line.split(",");
    else if (line.includes("\t")) parts = line.split("\t");
    else parts = line.split(/\s+/);
    if (parts.length >= 2) {
      return { id: uid(), nom: parts[0].trim(), prenom: parts.slice(1).join(" ").trim() };
    }
    return null;
  }).filter(Boolean);
}

// ─── Validation des données importées ────────────────────────────

/**
 * Vérifie la structure minimale d'un objet d'état importé.
 *
 * Champs critiques (bloquants si absents/invalides) :
 *   exams     — tableau, chaque exam a un id et un tableau exercises
 *   students  — tableau, chaque student a un id, nom, prenom
 *
 * Champs importants (warning si absents, valeurs par défaut utilisées) :
 *   grades, remarks, absents, groupes — objets
 *   seuils — objet avec nonNote, D, C, B
 *
 * Retourne { valid, data, warnings, errors }
 */
export function validateState(d) {
  var errors = [];
  var warnings = [];

  // — Type de base —
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    return { valid: false, data: null, errors: ["Le fichier n'est pas un objet JSON valide."], warnings: [] };
  }

  // — Champs critiques —
  if (!Array.isArray(d.exams)) {
    errors.push("Champ 'exams' manquant ou invalide (tableau attendu).");
  } else {
    d.exams.forEach(function(ex, i) {
      if (!ex || !ex.id) errors.push("Exam #" + (i + 1) + " : pas d'identifiant.");
      if (!Array.isArray(ex.exercises)) errors.push("Exam #" + (i + 1) + " : 'exercises' manquant.");
    });
  }

  if (!Array.isArray(d.students)) {
    errors.push("Champ 'students' manquant ou invalide (tableau attendu).");
  } else {
    d.students.forEach(function(s, i) {
      if (!s || !s.id) errors.push("Élève #" + (i + 1) + " : pas d'identifiant.");
      if (!s || !s.nom) warnings.push("Élève #" + (i + 1) + " : nom manquant.");
    });
  }

  if (errors.length > 0) {
    return { valid: false, data: d, errors: errors, warnings: warnings };
  }

  // — Champs importants (fallback silencieux) —
  if (d.grades && typeof d.grades !== "object") {
    warnings.push("'grades' ignoré (objet attendu, " + typeof d.grades + " reçu).");
    d.grades = {};
  }
  if (d.remarks && typeof d.remarks !== "object") {
    warnings.push("'remarks' ignoré (objet attendu).");
    d.remarks = {};
  }
  if (d.absents && typeof d.absents !== "object") {
    warnings.push("'absents' ignoré (objet attendu).");
    d.absents = {};
  }

  if (d.seuils && typeof d.seuils === "object") {
    ["nonNote", "D", "C", "B"].forEach(function(k) {
      if (d.seuils[k] !== undefined && typeof d.seuils[k] !== "number") {
        warnings.push("Seuil '" + k + "' ignoré (nombre attendu).");
        delete d.seuils[k];
      }
    });
  }

  if (d.malusPaliers && !Array.isArray(d.malusPaliers)) {
    warnings.push("'malusPaliers' ignoré (tableau attendu).");
    d.malusPaliers = undefined;
  }

  return { valid: true, data: d, errors: [], warnings: warnings };
}

// ─── Téléchargement de fichier ───────────────────────────────────

export function downloadFile(content, filename, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}