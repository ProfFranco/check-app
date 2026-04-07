// ═══════════════════════════════════════════════════════════════════
// GÉNÉRATEUR LATEX
// ═══════════════════════════════════════════════════════════════════
//
// Génère le code LaTeX pour les rapports individuels.
// Le gabarit (préambule) est éditable dans l'interface.
// Les histogrammes par exercice sont en pgfplots (LaTeX pur).
//
// Pour modifier l'apparence des rapports :
// → Modifiez le gabarit dans l'onglet Export de l'app
// → Ou modifiez la fonction genererGabarit() ci-dessous
// ═══════════════════════════════════════════════════════════════════

import { COMPETENCES, REMARQUES, ETABLISSEMENT } from "../config/settings";
import {
  studentTotal, examTotal, noteSur20,
  questionScore, exerciseScore,
  ratioJustesse, ratioEfficacite,
  notesParCompetence, countMalusRemarks, malusTotal,
} from "./calculs";

// ─── Formatage LaTeX ─────────────────────────────────────────────

function num(value, precision = 1) {
  const v = typeof value === "number" ? value.toFixed(precision) : value;
  return `\\sisetup{round-mode=places,round-precision=${precision}}\\num{${v}}`;
}

function pct(value) {
  return `\\sisetup{round-mode=places,round-precision=0}\\SI{${(value * 100).toFixed(1)}}{\\percent}`;
}

function encodeRemarks(remarkIds, allRemarques) {
  if (!remarkIds || !remarkIds.length) return "";
  const source = allRemarques || REMARQUES;
  return remarkIds.map(id => {
    const rem = source.find(r => r.id === id);
    return rem ? rem.label + "," : "";
  }).join("");
}

function encodeCompetences(competenceIds) {
  return competenceIds.map(id => {
    const c = COMPETENCES.find(x => x.id === id);
    return c ? `{${c.short}}` : "";
  }).join("");
}

// Échappe les caractères LaTeX spéciaux dans un texte libre
function escapeTex(str) {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
}

// ─── Gabarit par défaut ──────────────────────────────────────────

export function genererGabarit(nomDS, dateDS) {
  return `\\documentclass[a4paper,12pt,twoside]{article}
\\usepackage[top=2cm,bottom=1.4cm,left=1cm,right=1cm,headheight=20pt]{geometry}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french]{babel}
\\usepackage{lastpage}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{fancyhdr}
\\usepackage[locale=FR]{siunitx}
\\usepackage{multicol, multirow}
\\usepackage{longtable}
\\usepackage{tcolorbox}
\\usepackage{libertine}
\\usepackage{pgfplots}
\\pgfplotsset{compat=newest}

\\tcbset{
  mybox/.style={colback=blue!10, colframe=black, boxrule=1pt, arc=4pt,
    left=1pt, right=1pt, top=13pt, bottom=13pt}
}
\\tcbset{
  mygbox/.style={colback=yellow!10, colframe=orange!10!yellow, boxrule=1pt, arc=4pt,
    left=1pt, right=1pt, top=13pt, bottom=13pt}
}

\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{${nomDS} du ${dateDS}}
\\lfoot{${ETABLISSEMENT.nom} - ${ETABLISSEMENT.classe} - ${ETABLISSEMENT.section}}
\\renewcommand{\\headrulewidth}{1pt}
\\renewcommand{\\footrulewidth}{1pt}
\\setlength{\\headheight}{15pt}
\\renewcommand{\\arraystretch}{1.2}

\\begin{document}
`;
}

// ─── Rapport d'un élève ──────────────────────────────────────────

export function genererRapportEleve({
  student, exam, grades, remarks, absents,
  allStudents, nomDS, seuils, seuilDifficile, seuilReussite,
  getNote20, rankMap, stats, malusPaliers, malusManuel,
  commentaires, allRemarques,
}) {
  const et = examTotal(exam);
  const scoreBrut = studentTotal(grades, student.id, exam);
  const noteNorm = getNote20(student.id);
  const comps = notesParCompetence(grades, student.id, exam, seuils);
  const rang = rankMap[student.id] || "—";
  const presents = allStudents.filter(s => !absents[s.id]);
  const effectif = presents.length;
  const just = ratioJustesse(grades, student.id, exam);
  const effi = ratioEfficacite(grades, student.id, exam);

  // Stats de justesse/efficacité pour la classe
  const tjAll = presents.map(s => ratioJustesse(grades, s.id, exam));
  const teAll = presents.map(s => ratioEfficacite(grades, s.id, exam));

  const couleur = rang <= 11 ? "mygbox" : "mybox";

  // Commentaire libre de l'élève (peut être vide)
  const commentaire = (commentaires && commentaires[student.id]) ? commentaires[student.id].trim() : "";

  let tex = "";

  // ── En-tête ──
  tex += `\\cleardoublepage\n`;
  tex += `\\lhead{${student.prenom} \\textsc{${student.nom}}}\n`;

  // ── Bloc principal ──
  tex += `\\tcbox{\\begin{minipage}{0.95\\linewidth}\n`;
  tex += `\\begin{center}\\Large{${nomDS}} \\\\\\ \\Large{${student.prenom} \\textsc{${student.nom}}}\\end{center}\n`;

  // Tableau note / rang / compétences
  tex += `\\begin{tabular}{|>{\\centering\\arraybackslash}m{0.3\\linewidth}|>{\\centering\\arraybackslash}m{0.3\\linewidth}|b{0.3\\linewidth}|}\\hline\n`;
  tex += `\\textbf{Note} & \\textbf{Rang} & {\\centering\\textbf{Notes par comp\\'etences}} \\\\ \\hline\n`;
  tex += `\\multirow{${COMPETENCES.length}}{*}{\\tcbox[${couleur}]{\\Huge{$${num(noteNorm)}_{/20}$}}}`;
  tex += ` & \\multirow{${COMPETENCES.length}}{*}{\\tcbox[${couleur}]{\\Huge{$${num(rang, 0)}_{/${effectif}}$}}}`;

  COMPETENCES.forEach((comp, i) => {
    const prefix = i === 0 ? " & " : "\\cline{3-3} & & ";
    tex += `${prefix}\\textbf{${comp.label} :} \\hfill {\\LARGE ${comps[comp.id]}} \\\\ `;
  });
  tex += `\\hline\\end{tabular}\n`;

// Stats de points bruts (calculées indépendamment de la normalisation)
  const brutsPts = presents.map(s => studentTotal(grades, s.id, exam));
  const brutsMin = Math.min(...brutsPts);
  const brutsMax = Math.max(...brutsPts);
  const brutsMoy = brutsPts.reduce((a, b) => a + b, 0) / brutsPts.length;

// Statistiques
  tex += `\\textbf{Total brut (/ ${et}) :} ${num(scoreBrut)}`;
  tex += ` (Min ${num(brutsMin)} Max ${num(brutsMax)} Moy ${num(brutsMoy)})\n`;
  tex += `\\\\ \\textbf{Rang :} ${num(rang, 0)} / ${num(effectif, 0)}\n`;
  tex += `\\\\ \\textbf{Justesse :} ${pct(just)}`;
  tex += ` (Min ${pct(Math.min(...tjAll))} Max ${pct(Math.max(...tjAll))} Moy ${pct(tjAll.reduce((a, b) => a + b, 0) / tjAll.length)})\n`;
  tex += `\\\\ \\textbf{Efficacit\\'e :} ${pct(effi)}`;
  tex += ` (Min ${pct(Math.min(...teAll))} Max ${pct(Math.max(...teAll))} Moy ${pct(teAll.reduce((a, b) => a + b, 0) / teAll.length)})\n`;

  // Malus
  const stuMalus = malusTotal(remarks, student.id, exam, malusPaliers, malusManuel);
  const stuRemCount = countMalusRemarks(remarks, student.id, exam);
  if (stuMalus > 0) {
    tex += `\\\\ \\textbf{\\textcolor{red}{Malus :}} ${pct(stuMalus / 100)}\n`;
  }

  // Commentaire libre (uniquement si non vide)
  if (commentaire) {
    tex += `\\\\ \\textbf{Commentaire :} ${escapeTex(commentaire)}\n`;
  }
  tex += `\\end{minipage}}\n`;

  // ── Blocs par exercice (table + histogramme) ──
  exam.exercises.forEach((ex) => {
    const exT = ex.questions.reduce((s, q) =>
      s + q.items.reduce((si, it) => si + (parseFloat(it.points) || 0), 0), 0);
    const copies = presents.filter(s =>
      ex.questions.some(q => q.items.some(it => grades[`${s.id}__${it.id}`]))).length;
    if (copies === 0) return;

    const enotes = presents.map(s => exerciseScore(grades, s.id, ex).earned);
    const emoy = enotes.reduce((a, b) => a + b, 0) / enotes.length;
    const emin = Math.min(...enotes);
    const emax = Math.max(...enotes);

    // Histogramme
    const nbBins = Math.ceil(exT) + 1;
    const histBins = Array.from({ length: nbBins }, () => 0);
    enotes.forEach(n => histBins[Math.min(nbBins - 1, Math.floor(n))]++);
    const maxBin = Math.max(...histBins, 1);

    // Minipage gauche : tableau
    tex += `\\noindent\\begin{minipage}{0.48\\linewidth}\n`;
    tex += `\\textbf{${ex.title} :}\n`;
    tex += `\\\\ Copies: ${copies}\\hfill Min ${num(emin)} Max ${num(emax)} Moy ${num(emoy)}\n`;
    tex += `\\begin{center}\\begin{tabular}{p{0.12\\linewidth}p{0.12\\linewidth}p{0.18\\linewidth}p{0.45\\linewidth}}\n`;
    tex += `\\hline Q. & Comp. & Note & Commentaire\\\\\\hline\n`;

    ex.questions.forEach(q => {
      const sc = questionScore(grades, student.id, q);
      const aTraite = q.items.some(it => grades[`${student.id}__${it.id}`])
        || grades["treated_" + student.id + "_" + q.id];
      if (!aTraite) return;

      // Question difficile ? (traitée par moins de seuilDifficile% des présents)
      const nbTraitants = presents.filter(s =>
        q.items.some(it => grades[`${s.id}__${it.id}`])
        || grades["treated_" + s.id + "_" + q.id]
      ).length;
      const estDifficile = nbTraitants < presents.length * seuilDifficile / 100;

      // Marqueur ✨ : question difficile ET réussie par l'élève (score >= seuilReussite%)
      const pctReussite = sc.total > 0 ? (sc.earned / sc.total) * 100 : 0;
      const estReussie = pctReussite >= seuilReussite;
      const marqueurEtoile = estDifficile && estReussie ? " \\textbf{\\large✨}" : "";

      // Marqueur 🎁 pour les questions bonus
      const marqueurBonus = q.bonus ? " \\textbf{\\large🎁}" : "";

      const bold = estDifficile ? "\\bfseries " : "";
      const remKey = `${student.id}__${q.id}`;

      // Ligne question dans le tableau
      tex += `${bold}${escapeTex(q.label)}${marqueurBonus}${marqueurEtoile} & ${encodeCompetences(q.competences)} & ${num(sc.earned)}/${num(sc.total)} & ${encodeRemarks(remarks[remKey], allRemarques)} \\\\\n`;


    });

    tex += `\\end{tabular}\\end{center}\n`;


    tex += `\\end{minipage}\n`;
    // Minipage droite : histogramme pgfplots
    tex += `\\hfill\n`;
    tex += `\\begin{minipage}{0.48\\linewidth}\n`;
    tex += `\\begin{center}\n`;
    tex += `\\begin{tikzpicture}\n`;
    tex += `\\begin{axis}[\n`;
    tex += `  ybar, bar width=0.7,\n`;
    tex += `  ymin=0, ymax=${maxBin + 2},\n`;
    tex += `  xmin=-0.5, xmax=${nbBins - 0.5},\n`;
    tex += `  xlabel={Note},\n`;
    tex += `  ylabel={Effectif},\n`;
    tex += `  title={Statistiques de classe},\n`;
    tex += `  title style={font=\\small},\n`;
    tex += `  label style={font=\\footnotesize},\n`;
    tex += `  tick label style={font=\\scriptsize},\n`;
    tex += `  minor y tick num=1,\n`;
    tex += `  width=0.95\\linewidth,\n`;
    tex += `  height=5cm,\n`;
    tex += `  area style\n`;
    tex += `]\n`;
    tex += `\\addplot+[ybar interval,mark=no,fill=blue!40,draw=blue!60] coordinates {`;
    for (let k = 0; k < nbBins; k++) tex += `(${k},${histBins[k]})`;
    tex += `(${nbBins},0)};\n`;

    // Ligne rouge : score de l'élève
    const stuExScore = exerciseScore(grades, student.id, ex).earned;
    tex += `\\draw[red, thick, dashed] (axis cs:${stuExScore.toFixed(1)},0) -- (axis cs:${stuExScore.toFixed(1)},${maxBin + 1});\n`;
    tex += `\\end{axis}\n`;
    tex += `\\end{tikzpicture}\n`;
    tex += `\\end{center}\n`;
    tex += `\\end{minipage}\n\n`;
  });

  // ── Barème détaillé global — toutes questions traitées, en 2 colonnes ──
  const tousItems = exam.exercises.flatMap(ex =>
    ex.questions.flatMap(q => {
      const aTraite = q.items.some(it => grades[`${student.id}__${it.id}`])
        || grades["treated_" + student.id + "_" + q.id];
      if (!aTraite) return [];
      return q.items.map(it => ({
        exTitle: ex.title,
        qLabel: q.label,
        bonus: q.bonus,
        label: it.label,
        earned: grades[`${student.id}__${it.id}`] ? (parseFloat(it.points) || 0) : 0,
        total: parseFloat(it.points) || 0,
      }));
    })
  );

  if (tousItems.length > 0) {
    tex += `\\newpage\n`;
    tex += `\\begin{longtable}{p{0.72\\linewidth}>{\\centering\\arraybackslash}p{0.10\\linewidth}>{\\centering\\arraybackslash}p{0.10\\linewidth}}\n`;
    tex += `\\hline {\\footnotesize\\textbf{Item}} & {\\footnotesize\\textbf{/pts}} & {\\footnotesize\\textbf{obt.}} \\\\\\hline\n`;
    tex += `\\endhead\n`;
    tex += `\\hline\\endfoot\n`;
    let lastEx = null;
    tousItems.forEach(it => {
      if (it.exTitle !== lastEx) {
        tex += `\\multicolumn{3}{l}{{\\footnotesize\\textbf{${escapeTex(it.exTitle)}}}} \\\\\n`;
        lastEx = it.exTitle;
      }
      const bonusMark = it.bonus ? " {\\tiny🎁}" : "";
      const check = it.earned > 0 ? "$\\surd$\\ " : "\\phantom{$\\surd$}\\ ";
      tex += `{\\footnotesize ${check}[Q.${escapeTex(it.qLabel)}${bonusMark}] ${escapeTex(it.label)}} & {\\footnotesize ${num(it.total)}} & {\\footnotesize ${num(it.earned)}} \\\\\n`;
    });
    tex += `\\end{longtable}\n`;
  }


  tex += `\\vfill\n`;

  tex += `\\newpage\n`;
  return tex;
}

// ─── Document complet (tous élèves en un seul .tex) ───────────────

export function genererDocumentComplet({
  gabarit, exam, students, grades, remarks, absents,
  nomDS, dateDS, seuils, seuilDifficile, seuilReussite, getNote20,
  malusPaliers, malusManuel, commentaires, allRemarques,
}) {
  const presents = students.filter(s => !absents[s.id]);

  // Classement
  const { rankMap, stats } = _buildRankAndStats(presents, getNote20);

  // Gabarit
  let doc = gabarit || genererGabarit(nomDS, dateDS);

  // Rapports individuels
  for (const student of presents) {
    doc += genererRapportEleve({
      student, exam, grades, remarks, absents,
      allStudents: students, nomDS, seuils, seuilDifficile, seuilReussite,
      getNote20, rankMap, stats, malusPaliers, malusManuel,
      commentaires, allRemarques,
    });
  }

  doc += `\\end{document}\n`;
  return doc;
}

// ─── Documents individuels (un .tex autonome par élève) ───────────
//
// Retourne un tableau d'objets { filename, content } prêts à zipper.
// Chaque fichier est un document LaTeX complet compilable seul.

export function genererDocumentsIndividuels({
  gabarit, exam, students, grades, remarks, absents,
  nomDS, dateDS, seuils, seuilDifficile, seuilReussite, getNote20,
  malusPaliers, malusManuel, commentaires, allRemarques,
}) {
  const presents = students.filter(s => !absents[s.id]);
  const { rankMap, stats } = _buildRankAndStats(presents, getNote20);
  const gab = gabarit || genererGabarit(nomDS, dateDS);

  return presents.map(student => {
    const slug = _slugify(student.nom + "_" + student.prenom);
    const filename = `CR_${nomDS || "DS"}_${slug}.tex`.replace(/\s+/g, "_");
    const content =
      gab +
      genererRapportEleve({
        student, exam, grades, remarks, absents,
        allStudents: students, nomDS, seuils, seuilDifficile, seuilReussite,
        getNote20, rankMap, stats, malusPaliers, malusManuel,
        commentaires, allRemarques,
      }) +
      `\\end{document}\n`;
    return { filename, content };
  });
}

// ─── Script shell de compilation ─────────────────────────────────
//
// Génère un script bash qui compile tous les .tex individuels avec xelatex.

export function genererScriptCompilation(nomDS) {
  const slug = (nomDS || "DS").replace(/\s+/g, "_");
  return `#!/bin/bash
# Script de compilation des rapports individuels — ${nomDS || "DS"}
# Usage : bash compile_${slug}.sh
# Nécessite xelatex installé (TeX Live, MiKTeX…)

set -e
mkdir -p PDFS

for f in CR_${slug}_*.tex; do
  echo "Compilation de $f…"
  xelatex -interaction=nonstopmode -output-directory=PDFS "$f"
  xelatex -interaction=nonstopmode -output-directory=PDFS "$f"
  echo "  → PDFS/\${f%.tex}.pdf"
done

echo "Terminé. \${#}…"
echo "Tous les PDF sont dans le dossier PDFS/"
`;
}

// ─── Helpers privés ───────────────────────────────────────────────

function _buildRankAndStats(presents, getNote20) {
  const ranked = presents.map(s => ({ id: s.id, note: getNote20(s.id) }))
    .sort((a, b) => b.note - a.note);
  let rg = 1;
  const rankMap = {};
  ranked.forEach((r, i) => {
    if (i > 0 && r.note < ranked[i - 1].note) rg = i + 1;
    rankMap[r.id] = rg;
  });

  const notes = presents.map(s => getNote20(s.id));
  const moy = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
  const sortedN = [...notes].sort((a, b) => a - b);
  const stats = {
    moy,
    min: sortedN[0] || 0,
    max: sortedN[sortedN.length - 1] || 0,
  };

  return { rankMap, stats };
}

function _slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
}