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
  questionScore, exerciseScore, bonusCompletPoints,
  ratioJustesse, ratioEfficacite,
  notesParCompetence, countMalusRemarks, malusTotal,
  competencePct, compColor,
} from "./calculs";
import { slugify, buildAudioFilename } from "./helpers";

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

// Pastilles compétences colorées, accolées au label de question dans les
// tableaux du gabarit papier (où la colonne Comp. dédiée a été supprimée
// pour tenir dans la largeur d'une colonne twocolumn).
function _compBadgesTex(competenceIds) {
  if (!competenceIds || !competenceIds.length) return "";
  return competenceIds.map(id => {
    const c = COMPETENCES.find(x => x.id === id);
    return c ? `\\textcolor{comp${c.id}}{\\scriptsize\\bfseries ${c.short}}` : "";
  }).join("\\,");
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

// Thèmes d'impression : couple accent + (police gérée dans le préambule).
// "encre" = ardoise sobre · "cobalt" = bleu (proche rendu historique) · "sepia" = chaud.
const LATEX_THEMES = {
  encre:  { accent: "30,41,59"   },
  cobalt: { accent: "37,99,235"  },
  sepia:  { accent: "146,109,67" },
};

// Construit les \definecolor{compA..V} depuis COMPETENCES (mode clair).
// Robuste : si Samuel change une couleur dans settings.js, le PDF suit.
function defCompColorsTex() {
  return COMPETENCES.map(c => {
    const hex = (compColor(c, false) || "#888888").replace(/^#/, "");
    return `\\definecolor{comp${c.id}}{HTML}{${hex.toUpperCase()}}`;
  }).join("\n");
}

export function genererGabarit(nomDS, dateDS, etab, theme) {
  var e = etab || ETABLISSEMENT;
  var piedPage = [e.nom, e.classe, e.matricule].filter(Boolean).join(" - ");
  var t = LATEX_THEMES[theme] || LATEX_THEMES.cobalt;
  return `\\documentclass[a4paper,11pt,oneside]{article}
\\usepackage[top=1.8cm,bottom=1.4cm,left=1.4cm,right=1.4cm,headheight=20pt]{geometry}
\\usepackage[french]{babel}
\\usepackage{fontspec}
\\setmainfont{Libertinus Serif}
\\setsansfont{Libertinus Sans}
\\usepackage{amsmath,amssymb}
\\usepackage[locale=FR]{siunitx}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\definecolor{accent}{RGB}{${t.accent}}
${defCompColorsTex()}
\\usepackage{tikz}
\\usepackage{pgfplots}\\pgfplotsset{compat=newest}
\\usepgfplotslibrary{polar}
\\usepackage{tcolorbox}\\tcbuselibrary{skins,raster,breakable}
\\usepackage{tabularray}\\UseTblrLibrary{booktabs}
\\usepackage{lastpage}
\\usepackage{fancyhdr}
\\usepackage[colorlinks=true,urlcolor=accent!70!black]{hyperref}

% — barre de plage min–moy–max pour un KPI (#1 min, #2 valeur élève, #3 max ; 0..1) —
\\newcommand{\\rangebar}[3]{\\begin{tikzpicture}[baseline=-0.6ex]
  \\draw[black!15,line width=3pt,line cap=round] (0,0)--(3.4,0);
  \\draw[black!35] (#1*3.4,-1.6mm)--(#1*3.4,1.6mm);
  \\draw[black!35] (#3*3.4,-1.6mm)--(#3*3.4,1.6mm);
  \\fill[accent] (#2*3.4,0) circle (2.4pt);
\\end{tikzpicture}}

% — barre horizontale colorée (#1 label, #2 valeur 0..1, #3 couleur) —
\\newcommand{\\compbar}[3]{\\makebox[2.7cm][l]{#1}%
  \\begin{tikzpicture}[baseline=-0.4ex]
    \\fill[black!8] (0,0) rectangle (6,0.26);
    \\fill[#3]      (0,0) rectangle (#2*6,0.26);
  \\end{tikzpicture}\\;\\small$#2$}

\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{${nomDS} du ${dateDS}}
\\lfoot{${piedPage}}
\\renewcommand{\\headrulewidth}{0.6pt}
\\renewcommand{\\footrulewidth}{0.6pt}
\\setlength{\\headheight}{15pt}
\\renewcommand{\\arraystretch}{1.15}

\\begin{document}
`;
}

// ─── Rapport d'un élève ──────────────────────────────────────────

export function genererRapportEleve({
  student, exam, grades, remarks, absents,
  allStudents, nomDS, dateDS, seuils, seuilDifficile, seuilReussite, seuilPiege,
  getNote20, rankMap, stats, malusPaliers, malusManuel,
  commentaires, allRemarques,
  soundLinksEnabled, soundBaseUrl, soundAudioExt,
  bonusCompletConfig, clampQuestion = true,
  features,
  baremeLatex = true,
}) {
  var ft = features || { competences: true, coefficients: true, questionBonus: true, bonusComplet: true, malusAuto: true, questionPiege: true };
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
  tex += `\\clearpage\n`;
  tex += `\\lhead{${student.prenom} \\textsc{${student.nom}}}\n`;

  // Stats de points bruts (calculées indépendamment de la normalisation)
  const brutsPts = presents.map(s => studentTotal(grades, s.id, exam));
  const brutsMin = Math.min(...brutsPts);
  const brutsMax = Math.max(...brutsPts);
  const brutsMoy = brutsPts.reduce((a, b) => a + b, 0) / brutsPts.length;

  // Min/moy/max classe pour justesse & efficacité (0..1, pour les \rangebar)
  const tjMin = Math.min(...tjAll), tjMax = Math.max(...tjAll);
  const tjMoy = tjAll.reduce((a, b) => a + b, 0) / tjAll.length;
  const teMin = Math.min(...teAll), teMax = Math.max(...teAll);
  const teMoy = teAll.reduce((a, b) => a + b, 0) / teAll.length;

  // Malus (affiché dans le héros si > 0)
  const stuMalus = malusTotal(remarks, student.id, exam, malusPaliers, malusManuel, allRemarques);

  // % de réussite par compétence (radar) — 0..1, jamais des lettres
  const compP = competencePct(grades, student.id, exam);

  // Top 10 → en-têtes dorés, sinon couleur accent normale
  const isTop10 = typeof rang === "number" && rang <= 10;
  const bentoFrame   = isTop10 ? "yellow!60!orange!80!black" : "accent!70!black";
  const bentoTitleBg = isTop10 ? "yellow!60!orange!80!black" : "accent!75!black";

  // ── Tableau de bord bento (tcbitemize) ──
  tex += `\\begin{tcbitemize}[raster columns=4, raster equal height=rows,\n`;
  tex += `  raster column skip=4mm, raster row skip=4mm,\n`;
  tex += `  colframe=${bentoFrame}, colback=white, boxrule=0.6pt, arc=3pt,\n`;
  tex += `  fonttitle=\\bfseries\\sffamily, coltitle=white, colbacktitle=${bentoTitleBg}]\n`;

  // ── Rangée 1 : héros (3 col) + note/rang empilés (1 col) ──
  tex += `\\tcbitem[raster multicolumn=3, colframe=white, boxrule=0pt]\n`;
  tex += `\\begin{center}\n`;
  tex += `{\\LARGE\\bfseries ${escapeTex(student.prenom)}~\\textsc{${escapeTex(student.nom)}}}\\\\[1.2mm]\n`;
  tex += `{\\large\\color{accent!80!black} ${escapeTex(nomDS || "")}${dateDS ? " \\textemdash\\ " + escapeTex(dateDS) : ""}}\n`;
  tex += `\\end{center}\n`;

  // Case droite : note /20 en haut + rang en bas, empilés dans une tcbitem sans titre
  tex += `\\tcbitem[boxsep=0pt, top=0pt, bottom=0pt, left=0pt, right=0pt]\n`;
  tex += `\\begin{tcolorbox}[colframe=${bentoFrame}, colback=white, boxrule=0.4pt, arc=3pt,\n`;
  tex += `  fonttitle=\\bfseries\\sffamily, coltitle=white, colbacktitle=${bentoTitleBg},\n`;
  tex += `  title={Note /20}, before skip=0pt, after skip=3pt]\n`;
  tex += `\\begin{center}{\\fontsize{28}{28}\\selectfont\\bfseries $${num(noteNorm)}$}{\\large\\,/20}\n`;
  if (stuMalus > 0) tex += `\\\\[1mm]{\\scriptsize\\textcolor{red}{Malus ${pct(stuMalus / 100)}}}\n`;
  tex += `\\end{center}\n`;
  tex += `\\end{tcolorbox}\n`;
  tex += `\\begin{tcolorbox}[colframe=${bentoFrame}, colback=white, boxrule=0.4pt, arc=3pt,\n`;
  tex += `  fonttitle=\\bfseries\\sffamily, coltitle=white, colbacktitle=${bentoTitleBg},\n`;
  tex += `  title={Rang}, before skip=0pt, after skip=0pt]\n`;
  tex += `\\begin{center}{\\Huge\\bfseries $${num(rang, 0)}$}\\\\[0.5mm]{\\normalsize /\\,${num(effectif, 0)}}\\end{center}\n`;
  tex += `\\end{tcolorbox}\n`;

  // ── Rangée 2 : diagnostic ──
  if (ft.competences) {
    // Radar (2 col) + colonne empilant Justesse / Efficacité / Total brut (2 col)
    tex += `\\tcbitem[raster multicolumn=2, title={Par comp\\'etence}]\n`;
    tex += `\\begin{center}\n`;
    tex += _radarCompetencesTex(compP);
    tex += `\\end{center}\n`;
    tex += `\\tcbitem[raster multicolumn=2, boxsep=0pt, top=0pt, bottom=0pt, left=0pt, right=0pt]\n`;
    tex += `\\begin{tcolorbox}[colframe=${bentoFrame}, colback=white, boxrule=0.4pt, arc=3pt,\n`;
    tex += `  fonttitle=\\bfseries\\sffamily, coltitle=white, colbacktitle=${bentoTitleBg},\n`;
    tex += `  title={Justesse}, before skip=0pt, after skip=1pt]\n`;
    tex += `\\begin{center}{\\Large ${pct(just)}}\\\\[0.8mm]\\rangebar{${tjMin.toFixed(3)}}{${just.toFixed(3)}}{${tjMax.toFixed(3)}}\\;{\\scriptsize moy ${pct(tjMoy)}}\\end{center}\n`;
    tex += `\\end{tcolorbox}\n`;
    tex += `\\begin{tcolorbox}[colframe=${bentoFrame}, colback=white, boxrule=0.4pt, arc=3pt,\n`;
    tex += `  fonttitle=\\bfseries\\sffamily, coltitle=white, colbacktitle=${bentoTitleBg},\n`;
    tex += `  title={Efficacit\\'e}, before skip=0pt, after skip=1pt]\n`;
    tex += `\\begin{center}{\\Large ${pct(effi)}}\\\\[0.8mm]\\rangebar{${teMin.toFixed(3)}}{${effi.toFixed(3)}}{${teMax.toFixed(3)}}\\;{\\scriptsize moy ${pct(teMoy)}}\\end{center}\n`;
    tex += `\\end{tcolorbox}\n`;
    tex += `\\begin{tcolorbox}[colframe=${bentoFrame}, colback=white, boxrule=0.4pt, arc=3pt,\n`;
    tex += `  fonttitle=\\bfseries\\sffamily, coltitle=white, colbacktitle=${bentoTitleBg},\n`;
    tex += `  title={Total brut}, before skip=0pt, after skip=0pt]\n`;
    tex += `\\begin{center}{\\Large\\bfseries $${num(scoreBrut)}$}{\\normalsize\\,/\\,${et}}\\\\[1mm]{\\scriptsize ${num(brutsMin)}\\,\\textbullet\\,${num(brutsMoy)}\\,\\textbullet\\,${num(brutsMax)}}\\end{center}\n`;
    tex += `\\end{tcolorbox}\n`;
  } else {
    // Sans radar : Justesse (2 col) + Efficacité (1 col) + Total brut (1 col)
    tex += `\\tcbitem[raster multicolumn=2, title={Justesse}]\n`;
    tex += `\\begin{center}{\\Huge ${pct(just)}}\\\\[1.5mm]\\rangebar{${tjMin.toFixed(3)}}{${just.toFixed(3)}}{${tjMax.toFixed(3)}}\\\\[0.5mm]{\\scriptsize moy ${pct(tjMoy)}}\\end{center}\n`;
    tex += `\\tcbitem[title={Efficacit\\'e}]\n`;
    tex += `\\begin{center}{\\Huge ${pct(effi)}}\\\\[1.5mm]\\rangebar{${teMin.toFixed(3)}}{${effi.toFixed(3)}}{${teMax.toFixed(3)}}\\\\[0.5mm]{\\scriptsize moy ${pct(teMoy)}}\\end{center}\n`;
    tex += `\\tcbitem[title={Total brut}]\n`;
    tex += `\\begin{center}{\\Large\\bfseries $${num(scoreBrut)}$}{\\normalsize\\,/\\,${et}}\\\\[1mm]{\\scriptsize ${num(brutsMin)}\\,\\textbullet\\,${num(brutsMoy)}\\,\\textbullet\\,${num(brutsMax)}}\\end{center}\n`;
  }

  // ── Rangée 3 : position dans la classe ──
  tex += `\\tcbitem[raster multicolumn=4, title={Distribution de la classe}]\n`;
  tex += `\\begin{center}\n`;
  tex += _distributionTex(presents, getNote20, noteNorm);
  tex += `\\end{center}\n`;
  tex += `\\tcbitem[raster multicolumn=4, title={Classement de la classe}]\n`;
  tex += `\\begin{center}\n`;
  tex += _rankBarTex(presents, getNote20, student.id);
  tex += `\\end{center}\n`;

  // ── Rangée 4 : commentaire (si non vide) ──
  if (commentaire) {
    tex += `\\tcbitem[raster multicolumn=4, title={Commentaire}]\n`;
    tex += `${escapeTex(commentaire)}\n`;
  }

  tex += `\\end{tcbitemize}\n`;

  // ── Blocs par exercice (table + histogramme) ──
  var legendeEmise = false;
  exam.exercises.forEach((ex) => {
    const exT = ex.questions.reduce((s, q) =>
      s + q.items.reduce((si, it) => it.negative ? si : si + (parseFloat(it.points) || 0), 0), 0);
    const copies = presents.filter(s =>
      ex.questions.some(q => q.items.some(it => grades[`${s.id}__${it.id}`]))).length;
    if (copies === 0) return;

    const enotes = presents.map(s => exerciseScore(grades, s.id, ex, bonusCompletConfig).earned);
    const emoy = enotes.reduce((a, b) => a + b, 0) / enotes.length;
    const emin = Math.min(...enotes);
    const emax = Math.max(...enotes);

    // Score de l'élève pour cet exercice (remonté ici pour le titre)
    const stuExScore = exerciseScore(grades, student.id, ex, bonusCompletConfig).earned;

    // Histogramme
    const nbBins = Math.ceil(exT) + 1;
    const histBins = Array.from({ length: nbBins }, () => 0);
    enotes.forEach(n => histBins[Math.min(nbBins - 1, Math.floor(n))]++);
    const maxBin = Math.max(...histBins, 1);

    // Légende des marqueurs (émise une seule fois, avant le premier exercice)
    if (!legendeEmise) {
      tex += `\\smallskip\\noindent{\\footnotesize\\sffamily\\textbf{L\\'egende~:}\\quad `;
      tex += `$\\bigstar$~r\\'eussite sur question difficile\\quad `;
      if (ft.questionPiege) tex += `$\\triangle$~question pi\\\`ege\\quad `;
      tex += `$\\dagger$~question bonus}\\par\\smallskip\n`;
      legendeEmise = true;
    }

    // Bloc exercice : tcolorbox titré, tableau tabularray à gauche, histo à droite
    tex += `\\begin{tcolorbox}[breakable, title={${escapeTex(ex.title)}\\hfill\\normalfont\\bfseries ${num(stuExScore)}\\,/\\,${num(exT)}},\n`;
    tex += `  colframe=accent!70!black, colback=accent!3, boxrule=0.6pt, arc=3pt,\n`;
    tex += `  fonttitle=\\bfseries\\sffamily, coltitle=white, colbacktitle=accent!75!black]\n`;
    tex += `\\noindent\\begin{minipage}[t]{0.52\\linewidth}\n`;
    tex += `\\vspace{0pt}\n`;
    tex += `\\begin{tblr}{colspec={Q[l,wd=1.5cm]Q[c,wd=1.7cm]Q[c,wd=1.5cm]X[l]},\n`;
    tex += `  row{1}={font=\\bfseries\\footnotesize}, row{odd}={bg=black!3},\n`;
    tex += `  rowsep=2pt, hline{1,2,Z}={0.4pt,black!40}}\n`;
    tex += `Q. & Comp. & Note & Commentaire \\\\\n`;

    ex.questions.forEach(q => {
      const sc = questionScore(grades, student.id, q, clampQuestion);
      const aTraite = q.items.some(it => grades[`${student.id}__${it.id}`])
        || grades["treated_" + student.id + "_" + q.id];
      if (!aTraite) return;

      // Question difficile ? (traitée par moins de seuilDifficile% des présents)
      const nbTraitants = presents.filter(s =>
        q.items.some(it => grades[`${s.id}__${it.id}`])
        || grades["treated_" + s.id + "_" + q.id]
      ).length;
      const tauxTraitement = presents.length > 0 ? (nbTraitants / presents.length) * 100 : 0;
      const estDifficile = tauxTraitement < seuilDifficile;
      const estPiege = tauxTraitement >= 50 && sc.total > 0 && (sc.earned / sc.total) * 100 < (seuilPiege || 30);

      // Marqueur ✨ : question difficile ET réussie par l'élève (score >= seuilReussite%)
      const pctReussite = sc.total > 0 ? (sc.earned / sc.total) * 100 : 0;
      const estReussie = pctReussite >= seuilReussite;
      const marqueurEtoile = estDifficile && estReussie ? " \\textbf{$\\bigstar$}" : "";
      const marqueurPiege = (ft.questionPiege && estPiege) ? " \\textbf{$\\triangle$}" : "";

      // Marqueur question bonus (dague : † )
      const marqueurBonus = q.bonus ? " \\textbf{$\\dagger$}" : "";

      const bold = estDifficile ? "\\bfseries " : estPiege ? "\\color{orange}\\bfseries " : "";
      const remKey = `${student.id}__${q.id}`;

      // Ligne question dans le tableau
      var qLabelTex;
      if (soundLinksEnabled && soundBaseUrl) {
        var audioUrl = soundBaseUrl + buildAudioFilename(nomDS, student.nom, ex.title, q.label, soundAudioExt || "webm");
        qLabelTex = `\\href{${audioUrl}}{\\textcolor{blue!50!black}{${escapeTex(q.label)}}}`;
      } else {
        qLabelTex = escapeTex(q.label);
      }
      tex += `${bold}${qLabelTex}${marqueurBonus}${marqueurEtoile}${marqueurPiege} & ${encodeCompetences(q.competences)} & ${num(sc.earned)}/${num(sc.total)} & ${encodeRemarks(remarks[remKey], allRemarques)} \\\\\n`;


    });

    tex += `\\end{tblr}\n`;
    tex += `\\end{minipage}\\hfill\n`;
    // Minipage droite : histogramme pgfplots
    tex += `\\begin{minipage}[t]{0.45\\linewidth}\n`;
    tex += `\\vspace{0pt}\n`;
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
    tex += `  height=6cm,\n`;
    tex += `  area style\n`;
    tex += `]\n`;
    tex += `\\addplot+[ybar interval,mark=no,fill=blue!40,draw=blue!60] coordinates {`;
    for (let k = 0; k < nbBins; k++) tex += `(${k},${histBins[k]})`;
    tex += `(${nbBins},0)};\n`;

    // Ligne rouge : score de l'élève (stuExScore calculé plus haut)
    tex += `\\draw[red, thick, dashed] (axis cs:${stuExScore.toFixed(1)},0) -- (axis cs:${stuExScore.toFixed(1)},${maxBin + 1});\n`;
    tex += `\\end{axis}\n`;
    tex += `\\end{tikzpicture}\n`;
    tex += `\\end{center}\n`;
    tex += `\\smallskip\\noindent{\\scriptsize\\sffamily Copies~${copies}\\;$\\bullet$\\;Min~${num(emin)}\\;$\\bullet$\\;Max~${num(emax)}\\;$\\bullet$\\;Moy~${num(emoy)}}\n`;
    tex += `\\end{minipage}\n`;
    tex += `\\end{tcolorbox}\n\n`;
  });

  // ── Barème détaillé global — toutes questions traitées, en 2 colonnes ──
  const tousItems = exam.exercises.flatMap(ex => {
    const qItems = ex.questions.flatMap(q => {
      const aTraite = q.items.some(it => grades[`${student.id}__${it.id}`])
        || grades["treated_" + student.id + "_" + q.id];
      if (!aTraite) return [];
      return q.items
        .filter(it => !it.negative || !!grades[`${student.id}__${it.id}`])
        .map(it => ({
          exTitle: ex.title,
          qLabel: q.label,
          bonus: q.bonus,
          label: it.label,
          earned: grades[`${student.id}__${it.id}`] ? (parseFloat(it.points) || 0) : 0,
          total: parseFloat(it.points) || 0,
          negative: !!it.negative,
          isBonusComplet: false,
        }));
    });
    // Ligne bonus exercice complet si déclenché
    if (ex.bonusComplet && bonusCompletConfig) {
      const bonusPts = bonusCompletPoints(grades, student.id, ex, bonusCompletConfig);
      if (bonusPts > 0) {
        qItems.push({
          exTitle: ex.title, qLabel: null, bonus: false,
          label: "Bonus exercice complet",
          earned: bonusPts, total: bonusPts, isBonusComplet: true,
        });
      }
    }
    return qItems;
  });

  if (baremeLatex && tousItems.length > 0) {
    tex += `\\newpage\n`;
    tex += `{\\footnotesize\\sffamily\\bfseries Bar\\'eme d\\'etaill\\'e}\\par\\smallskip\n`;
    tex += `\\begin{longtblr}{colspec={X[l]Q[c,wd=1.4cm]Q[c,wd=1.4cm]},\n`;
    tex += `  rowhead=1, row{1}={font=\\bfseries\\footnotesize, bg=accent!12},\n`;
    tex += `  row{even}={bg=black!3}, rowsep=1.5pt, hline{1,2,Z}={0.4pt,black!40}}\n`;
    tex += `{\\footnotesize Item} & {\\footnotesize /pts} & {\\footnotesize obt.} \\\\\n`;
    let lastEx = null;
    tousItems.forEach(it => {
      if (it.exTitle !== lastEx) {
        tex += `\\SetCell[c=3]{l, bg=accent!8} {\\footnotesize\\textbf{${escapeTex(it.exTitle)}}} & & \\\\\n`;
        lastEx = it.exTitle;
      }
      if (it.isBonusComplet) {
        tex += `{\\footnotesize \\textcolor{green!50!black}{\\textbf{$\\bigstar$\\ ${escapeTex(it.label)}}}} & {\\footnotesize +${num(it.total)}} & {\\footnotesize \\textcolor{green!50!black}{+${num(it.earned)}}} \\\\\n`;
      } else if (it.negative) {
        tex += `{\\footnotesize \\textcolor{red!60!black}{$-$\\ [Q.${escapeTex(it.qLabel)}] ${escapeTex(it.label)}}} & {\\footnotesize \\textcolor{red!60!black}{${num(it.total, 1)}}} & {\\footnotesize \\textcolor{red!60!black}{${num(it.earned, 1)}}} \\\\\n`;
      } else {
        const bonusMark = it.bonus ? " {\\small$\\dagger$}" : "";
        const check = it.earned > 0 ? "$\\surd$\\ " : "\\phantom{$\\surd$}\\ ";
        tex += `{\\footnotesize ${check}[Q.${escapeTex(it.qLabel)}${bonusMark}] ${escapeTex(it.label)}} & {\\footnotesize ${num(it.total)}} & {\\footnotesize ${num(it.earned)}} \\\\\n`;
      }
    });
    tex += `\\end{longtblr}\n`;
  }


  tex += `\\newpage\n`;
  return tex;
}

// ─── Document complet (tous élèves en un seul .tex) ───────────────

export function genererDocumentComplet({
  gabarit, exam, students, grades, remarks, absents,
  nomDS, dateDS, seuils, seuilDifficile, seuilReussite, seuilPiege, getNote20,
  malusPaliers, malusManuel, commentaires, allRemarques,
  soundLinksEnabled, soundBaseUrl, soundAudioExt,
  bonusCompletConfig, clampQuestion = true,
  features,
  baremeLatex = true,
  papierLatex = false,
  papierTextes = null,
}) {
  const presents = students.filter(s => !absents[s.id]);

  // Classement
  const { rankMap, stats } = _buildRankAndStats(presents, getNote20);

  // Gabarit
  let doc = gabarit || (papierLatex ? genererGabaritPapier(nomDS, dateDS) : genererGabarit(nomDS, dateDS));

  // Rapports individuels
  for (const student of presents) {
    doc += (papierLatex ? genererRapportElevePapier : genererRapportEleve)({
      student, exam, grades, remarks, absents,
      allStudents: students, nomDS, dateDS, seuils, seuilDifficile, seuilReussite, seuilPiege,
      getNote20, rankMap, stats, malusPaliers, malusManuel,
      commentaires, allRemarques,
      soundLinksEnabled, soundBaseUrl, soundAudioExt,
      bonusCompletConfig, clampQuestion,
      features,
      baremeLatex,
      papierTextes,
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
  nomDS, dateDS, seuils, seuilDifficile, seuilReussite, seuilPiege, getNote20,
  malusPaliers, malusManuel, commentaires, allRemarques,
  soundLinksEnabled, soundBaseUrl, soundAudioExt,
  bonusCompletConfig, clampQuestion = true,
  features,
  baremeLatex = true,
  papierLatex = false,
  papierTextes = null,
}) {
  const presents = students.filter(s => !absents[s.id]);
  const { rankMap, stats } = _buildRankAndStats(presents, getNote20);
  const gab = gabarit || (papierLatex ? genererGabaritPapier(nomDS, dateDS) : genererGabarit(nomDS, dateDS));

  return presents.map(student => {
    const slug = slugify(student.nom + "_" + student.prenom);
    const filename = `CR_${nomDS || "DS"}_${slug}.tex`.replace(/\s+/g, "_");
    const content =
      gab +
      (papierLatex ? genererRapportElevePapier : genererRapportEleve)({
        student, exam, grades, remarks, absents,
        allStudents: students, nomDS, dateDS, seuils, seuilDifficile, seuilReussite, seuilPiege,
        getNote20, rankMap, stats, malusPaliers, malusManuel,
        commentaires, allRemarques,
        soundLinksEnabled, soundBaseUrl, soundAudioExt,
        bonusCompletConfig, clampQuestion,
        features,
        baremeLatex,
        papierTextes,
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

// ─── Moteur de texte parodique ───────────────────────────────────

function _graine(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) { h = ((h << 5) + h) ^ str.charCodeAt(i); }
  return h >>> 0;
}

function _rng(seed) {
  var a = seed | 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function _pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

function _pickN(r, arr, n) {
  var a = arr.slice();
  for (var i = 0; i < Math.min(n, a.length); i++) {
    var j = i + Math.floor(r() * (a.length - i));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a.slice(0, n);
}

// Remplace les {placeholders} d'un gabarit par les valeurs fournies.
// Un placeholder inconnu est laissé tel quel. Les groupes LaTeX ne
// matchent pas : le contenu doit être un mot seul (\w+), donc
// \textit{Le cours}, \ref{fig:x} ou \og{} ne sont jamais touchés.
function _tpl(str, vars) {
  return str.replace(/\{(\w+)\}/g, function(m, k) {
    return (vars && vars[k] !== undefined && vars[k] !== null) ? String(vars[k]) : m;
  });
}

// Banques de gabarits. Chaque entrée est une phrase complète et
// autoporteuse ; les données s'injectent via des placeholders, jamais
// par concaténation (la syntaxe est garantie par construction).
// Placeholders disponibles : {sujet} {ds} {note} {rang} {effectif}
// {nTraitees} {totalQuestions} ({n}/{total} en alias) {moyenne}
// {just} {effi} {meilleurEx} {pctMeilleur} {pireEx} {pctPire}
// {compForte} {compFaible} {nEtoiles} {figOverview}
function _banquesDefaut() {
  return {
    ouverture: [
      "Nous rapportons l'étude expérimentale des performances de {sujet}, observées en conditions réelles à l'occasion du {ds}.",
      "Nous consignons ici, non sans un certain embarras méthodologique, les performances mesurées de {sujet} lors du {ds}.",
      "Cette note de recherche présente les résultats obtenus par {sujet} au {ds}, résultats que l'auteur s'est efforcé de traiter avec l'objectivité qui le caractérise.",
      "Nous portons à la connaissance de la communauté scientifique les données expérimentales recueillies sur {sujet} durant le {ds}.",
      "Il nous est agréable — dans une acception toute relative du terme — de documenter la campagne de mesures conduite sur {sujet} pendant le {ds}.",
      "La présente contribution s'inscrit dans la longue série d'études consacrées à {sujet}, dont le {ds} constitue le dernier point de mesure en date.",
      "Conformément aux exigences de transparence de la revue, nous publions l'intégralité des observations effectuées sur {sujet} à l'occasion du {ds}.",
    ],
    resume_protocole: [
      "Le protocole repose sur une épreuve écrite notée par items, administrée en une seule passation et sans groupe témoin.",
      "Les mesures ont été effectuées à l'aide d'un barème par items, selon une procédure en double aveugle où, en pratique, seul le correcteur voyait quelque chose.",
      "La méthodologie, détaillée en section~2, n'appelle aucun commentaire, ce qui ne l'empêchera pas d'en recevoir.",
      "Le dispositif expérimental, éprouvé sur plusieurs générations de sujets, n'a jamais été validé par un comité indépendant, aucun comité n'ayant souhaité s'en approcher.",
    ],
    resume_resultat: [
      "Le sujet obtient {note}/20 et se classe {rang}\\textsuperscript{e} sur {effectif}, avec {nTraitees} questions abordées sur {totalQuestions}.",
      "La mesure principale s'établit à {note}/20 (rang~{rang}/{effectif}), pour {nTraitees} questions traitées sur les {totalQuestions} proposées.",
      "On relève une note de {note}/20, plaçant le sujet au rang {rang} sur {effectif} au sein de la cohorte, pour un taux de couverture du sujet de {nTraitees}/{totalQuestions} questions.",
      "L'observable principale vaut {note}/20 (moyenne de cohorte~: {moyenne}/20), le sujet occupant le rang {rang} sur {effectif}.",
    ],
    verdict: [
      "jugés publiables faute de mieux",
      "d'un intérêt scientifique modéré mais réel",
      "soumis à réplication urgente",
      "compatibles avec l'hypothèse nulle, ce qui n'était pas le but",
      "conformes aux espérances de l'éditeur, qui étaient basses",
      "remarquables par leur reproductibilité (l'épreuve n'ayant eu lieu qu'une fois)",
      "en bon accord avec la littérature, hélas",
      "statistiquement significatifs au seuil que l'on voudra bien leur accorder",
    ],
    intro: [
      "L'évaluation des acquis demeure un problème ouvert, malgré des décennies d'efforts.",
      "La question de savoir si un élève a compris quelque chose reste entière après correction.",
      "Le DS constitue le paradigme expérimental central de cette étude.",
      "On notera que l'épreuve, d'une durée de 4~h, fournit un cadre reproductible — en principe.",
      "La littérature sur le sujet est abondante ; sa fréquentation par les principaux intéressés l'est moins.",
      "Depuis les travaux fondateurs [1], la question a peu progressé, et le présent rapport ne devrait pas bouleverser cet équilibre.",
      "L'étude s'inscrit dans un programme de recherche au long cours, dont les jalons sont posés à intervalles réguliers et sans consultation préalable des sujets.",
      "On rappelle que l'objectif affiché de l'épreuve est la mesure des acquis ; son objectif réel demeure un champ de recherche ouvert.",
    ],
    methode: [
      "Le barème suit un protocole par items, avec écrêtage par question.",
      "La notation obéit à un protocole par items soigneusement documenté, ici même.",
      "Chaque question est notée selon un barème dont l'auteur est seul juge.",
      "L'instrument de mesure (le sujet d'épreuve) a été étalonné sur un échantillon d'un correcteur, ce qui garantit une excellente reproductibilité inter-juges.",
      "Les données ont été acquises en salle, en environnement partiellement contrôlé (température, luminosité, motivation).",
      "L'écrêtage par question garantit qu'aucune question ne rapporte plus que ce qu'elle vaut — règle de calcul dont la portée philosophique n'a pas échappé à l'auteur.",
      "Le traitement statistique se limite à des outils que le lecteur peut vérifier de tête, par prudence méthodologique autant que par goût.",
    ],
    resultats_renvoi: [
      "La figure~\\ref{{figOverview}} donne la vue d'ensemble des performances du sujet relativement à la cohorte ; le détail par exercice est consigné dans les tableaux et histogrammes ci-dessous.",
      "Les résultats bruts sont rassemblés en figure~\\ref{{figOverview}}, puis détaillés exercice par exercice ; le lecteur pressé peut s'en tenir à la note, comme tout le monde.",
      "On trouvera en figure~\\ref{{figOverview}} la synthèse graphique des mesures ; les sections qui suivent en donnent le détail, avec le niveau de granularité qu'exige la revue.",
    ],
    obs_contraste: [
      "Le sujet manifeste une affinité marquée pour \\og {meilleurEx}\\fg{} ({pctMeilleur} des points), affinité qui s'estompe sensiblement sur \\og {pireEx}\\fg{} ({pctPire}) ; ce contraste appellerait une étude dédiée, que personne ne financera.",
      "L'écart de rendement entre \\og {meilleurEx}\\fg{} ({pctMeilleur}) et \\og {pireEx}\\fg{} ({pctPire}) suggère soit une préférence thématique assumée, soit une gestion du temps perfectible ; les deux écoles ont leurs partisans.",
      "On observe un pic de performance sur \\og {meilleurEx}\\fg{} ({pctMeilleur} des points) et un creux sur \\og {pireEx}\\fg{} ({pctPire}), configuration que la littérature interne du laboratoire désigne sous le nom de \\og relief\\fg.",
    ],
    obs_homogene: [
      "Le rendement est remarquablement homogène d'un exercice à l'autre, ce qui simplifie l'analyse et prive la discussion de son principal ressort dramatique.",
      "Aucun exercice ne se détache significativement : le sujet répartit ses moyens avec une constance que l'auteur qualifiera de méthodique, faute de terme plus prudent.",
    ],
    obs_etoiles: [
      "On relève {nEtoiles} réussite(s) sur des questions délaissées par la majorité de la cohorte (marqueur $\\bigstar$), ce qui suggère soit une compréhension profonde, soit un goût du risque statistiquement payant ; les deux hypothèses ne s'excluent pas.",
      "Le sujet s'est aventuré avec succès sur {nEtoiles} question(s) largement évitée(s) par la cohorte ; ce comportement exploratoire est relevé avec intérêt, et un brin de suspicion, au marqueur $\\bigstar$.",
    ],
    obs_justesse: [
      "La justesse ({just}) excède notablement l'efficacité ({effi}) : ce que le sujet entreprend, il le réussit, mais il entreprend avec parcimonie ; un élargissement du front d'attaque est recommandé.",
      "Le couple justesse/efficacité ({just} contre {effi}) dessine un profil de tireur d'élite : peu de munitions, peu de déchets ; la cadence, en revanche, gagnerait à être discutée en séance.",
    ],
    obs_efficacite: [
      "L'efficacité ({effi}) devance la justesse ({just}) : le sujet couvre large et engrange, au prix d'un taux de déchet que la section précédente n'avait pas anticipé ; un recentrage qualitatif est suggéré.",
      "Le profil ({effi} d'efficacité pour {just} de justesse) est celui d'un ratisseur : tout traiter, quitte à laisser des points en chemin ; la stratégie est défendable, et défendue chaque année.",
    ],
    obs_equilibre: [
      "Justesse ({just}) et efficacité ({effi}) évoluent de concert, signe d'une stratégie équilibrée ou d'une absence de stratégie ; l'expérience ne permet pas de trancher.",
      "L'équilibre entre justesse ({just}) et efficacité ({effi}) est notable ; l'auteur, qui cherchait un déséquilibre à commenter, en prend acte.",
    ],
    obs_comp: [
      "L'analyse par compétence (Fig.~\\ref{{figOverview}}) fait apparaître un point d'appui net en {compForte} et une marge de progression documentée en {compFaible}.",
      "Le profil de compétences présente un maximum en {compForte} et un minimum en {compFaible} ; l'exploitation pédagogique de cette anisotropie est laissée en exercice au lecteur.",
    ],
    disc_haute: [
      "Au regard de la cohorte, le sujet occupe le haut de la distribution (rang {rang}/{effectif}). L'auteur, tenu à la réserve statutaire, se bornera à qualifier la performance de reproductible — charge au sujet de le démontrer dès la prochaine campagne.",
      "Les performances placent le sujet dans le peloton de tête ({rang}/{effectif}). Ces valeurs, proches des limites hautes de l'instrument, posent la question de l'étalonnage du barème ; l'auteur se réserve le droit de le durcir.",
      "Avec {note}/20 pour une moyenne de cohorte de {moyenne}/20, le sujet tire la distribution vers la droite, au grand dam des théoriciens de la courbe en cloche.",
    ],
    disc_moyenne: [
      "Le sujet se situe au cœur de la distribution (rang {rang}/{effectif}, moyenne de cohorte {moyenne}/20), position dont la théorie prédit qu'elle offre le meilleur rapport signal sur bruit pour les progrès à venir.",
      "Avec un rang de {rang} sur {effectif}, le sujet évolue dans la zone centrale de la cohorte ; c'est là, d'expérience, que les gisements de points identifiés dans les tableaux ci-dessus sont les plus rentables.",
      "La note ({note}/20) s'écarte peu de la moyenne de cohorte ({moyenne}/20) ; le sujet constitue en cela un excellent point de calibration, rôle ingrat mais indispensable à la science.",
    ],
    disc_basse: [
      "La position du sujet dans la distribution (rang {rang}/{effectif}) doit davantage aux conditions du protocole qu'à ses aptitudes, que l'auteur a pu observer en environnement moins hostile. Les gisements de progression identifiés plus haut sont importants, donc encourageants.",
      "Les valeurs mesurées ({note}/20) sous-estiment vraisemblablement la grandeur vraie ; l'écart entre mesure et potentiel est un problème classique de métrologie, que la prochaine campagne devra réduire.",
      "L'échantillon recueilli lors du {ds} ne rend pas justice au sujet ; l'auteur recommande une réplication rapide en conditions d'entraînement, où le signal est traditionnellement meilleur.",
    ],
    limites: [
      "L'échantillon est de taille $n = 1$, ce qui limite la portée statistique.",
      "L'auteur correspondant est simultanément concepteur du sujet, correcteur et relecteur unique ; un biais ne saurait être exclu.",
      "Aucune réplication n'a été tentée, l'épreuve n'ayant lieu qu'une fois.",
      "Les conditions expérimentales (table, stylo, stress) n'ont pas été contrôlées.",
      "La population de contrôle (la classe) souffre du même biais de sélection que le sujet.",
      "Le sujet n'a pas eu accès au protocole expérimental avant l'épreuve, contrairement aux usages en vigueur dans certaines revues.",
      "La durée de l'épreuve n'a pas été optimisée pour minimiser la fatigue cognitive.",
    ],
    remerciements_sujet: [
      "d'avoir rendu une copie",
      "d'avoir traité {n}/{total} questions",
      "de sa présence le jour de l'épreuve",
      "de la lisibilité relative de son écriture",
    ],
    remerciements_divers: [
      "la machine à café du laboratoire pour son soutien indéfectible.",
      "les relecteurs anonymes, qui n'existent pas.",
      "l'établissement, pour la fourniture du papier de brouillon.",
      "le jury de la revue, dont la mansuétude est légendaire.",
      "l'inventeur du café soluble, sans qui cette correction n'aurait pas abouti.",
    ],
    conflit: [
      "L'auteur déclare noter ses propres sujets.",
      "L'auteur est en situation de conflit d'intérêts permanent avec ses sujets d'étude.",
      "Aucun conflit d'intérêts déclaré, ce qui est en soi suspect.",
    ],
    financement: [
      "Cette étude n'a bénéficié d'aucun financement, ce qui se ressent.",
      "Aucune source de financement. L'auteur travaille bénévolement, comme d'habitude.",
      "Financée par l'Éducation nationale, indirectement et involontairement.",
    ],
    conclusion: [
      "Ces résultats appellent des travaux futurs, notamment une réplication.",
      "L'auteur encourage le sujet à poursuivre ses efforts dans la direction indiquée.",
      "Une amélioration des performances est envisageable sous réserve de travail.",
      "Ces conclusions sont provisoires dans l'attente d'un prochain DS.",
      "La reproductibilité de ces observations sera mise à l'épreuve lors de la prochaine campagne de mesures, dont la date, par souci d'équité expérimentale, ne sera communiquée qu'au dernier moment.",
      "L'ensemble des données plaide pour la poursuite du programme expérimental, à effectifs constants et motivation croissante.",
    ],
    refs_fixes: [
      "[1] S.~Correcteur, \\textit{Le cours}, chap.~4, non publié (2024).",
      "[2] Id., \\textit{Les exercices du TD}, résultats non publiés, non traités.",
      "[3] Id., \\textit{Rapport du DS précédent}, archives internes (2024).",
      "[4] N.~Bourbaki, \\textit{Éléments de mathématique}, Hermann (1939--). Cité par déférence.",
    ],
  };
}

// Fusionne papierTextes (partiel, depuis l'UI) avec les banques par défaut.
function _mergeBanques(papierTextes) {
  var def = _banquesDefaut();
  if (!papierTextes) return def;
  var out = Object.assign({}, def);
  Object.keys(def).forEach(function(cle) {
    if (Array.isArray(papierTextes[cle]) && papierTextes[cle].length) out[cle] = papierTextes[cle];
  });
  return out;
}

// stats attendu : { note, rang, effectif, nTraitees, totalQuestions, moyenne }
// (note/rang/effectif/moyenne : texte LaTeX déjà formaté).
// obs (optionnel) : observations chiffrées calculées par le générateur
// { contraste, meilleurEx, pctMeilleur, pireEx, pctPire, nEtoiles,
//   just, effi, equilibre, compForte, compFaible, tranche, figOverview }.
function _assemblerTextes(student, exam, nomDS, stats, banques, obs) {
  var graine = _graine(student.id + (nomDS || ""));
  var r = _rng(graine);
  var o = obs || {};

  var vars = {
    sujet: escapeTex(student.prenom) + "~\\textsc{" + escapeTex(student.nom) + "}",
    ds: escapeTex(nomDS || "DS"),
    note: stats.note, rang: stats.rang, effectif: stats.effectif,
    moyenne: stats.moyenne || "",
    nTraitees: stats.nTraitees || 0, totalQuestions: stats.totalQuestions || 0,
    n: stats.nTraitees || 0, total: stats.totalQuestions || 0,
    just: o.just || "", effi: o.effi || "",
    meilleurEx: o.meilleurEx || "", pctMeilleur: o.pctMeilleur || "",
    pireEx: o.pireEx || "", pctPire: o.pctPire || "",
    compForte: o.compForte || "", compFaible: o.compFaible || "",
    nEtoiles: (o.nEtoiles !== undefined) ? o.nEtoiles : 0,
    figOverview: o.figOverview || "fig:overview",
  };
  var T = function(s) { return _tpl(s, vars); };

  // Résumé : ouverture + protocole + résultat chiffré + verdict (4 phrases)
  var resume = [
    T(_pick(r, banques.ouverture)),
    T(_pick(r, banques.resume_protocole)),
    T(_pick(r, banques.resume_resultat)),
    "Ces résultats sont " + T(_pick(r, banques.verdict)) + ".",
  ].join(" ");

  var motsExercices = (exam.exercises || []).map(function(ex) {
    return (ex.title || "").trim().split(/\s+/).slice(0, 2).join(" ");
  }).filter(Boolean);
  var motsCompetences = COMPETENCES.map(function(c) { return c.label; });
  var motsCles = motsExercices.concat(motsCompetences).slice(0, 5).map(escapeTex).join(" ; ");

  var intro = _pickN(r, banques.intro, 2).map(T).join(" ");
  var methode = _pickN(r, banques.methode, 2).map(T).join(" ");

  // Résultats : renvoi aux figures + relief inter-exercices s'il y en a un
  var resultats = T(_pick(r, banques.resultats_renvoi));
  if (o.contraste === "fort") resultats += " " + T(_pick(r, banques.obs_contraste));
  else if (o.contraste === "homogene") resultats += " " + T(_pick(r, banques.obs_homogene));

  // Discussion : position dans la cohorte, équilibre justesse/efficacité,
  // profil de compétences, prises de risque récompensées
  var discParts = [T(_pick(r, banques["disc_" + (o.tranche || "moyenne")] || banques.disc_moyenne))];
  if (o.equilibre === "justesse") discParts.push(T(_pick(r, banques.obs_justesse)));
  else if (o.equilibre === "efficacite") discParts.push(T(_pick(r, banques.obs_efficacite)));
  else if (o.equilibre === "equilibre") discParts.push(T(_pick(r, banques.obs_equilibre)));
  if (o.compForte && o.compFaible) discParts.push(T(_pick(r, banques.obs_comp)));
  if (vars.nEtoiles > 0) discParts.push(T(_pick(r, banques.obs_etoiles)));
  var discussion = discParts.join(" ");

  var limites = _pickN(r, banques.limites, 3).map(T).join("\\par\\smallskip\\noindent ");

  var phraseSujet = T(_pick(r, banques.remerciements_sujet));
  var remerciements = "L'auteur remercie le sujet " + phraseSujet + ", ainsi que " + T(_pick(r, banques.remerciements_divers));

  var conflit = T(_pick(r, banques.conflit));
  var financement = T(_pick(r, banques.financement));
  var conclusion = _pickN(r, banques.conclusion, 2).map(T).join(" ");

  var refs = banques.refs_fixes.slice(0, 3);
  var exercises = exam.exercises || [];
  if (exercises.length >= 1) {
    refs.push("[" + (refs.length + 1) + "] Id., \\textit{" + escapeTex(exercises[0].title) + "}, in " +
      escapeTex(nomDS || "le DS") + ", résultats partiels.");
  }
  if (exercises.length >= 2 && refs.length < 5) {
    var autre = _pick(r, exercises);
    refs.push("[" + (refs.length + 1) + "] Id., \\textit{" + escapeTex(autre.title) + "}, ibid., non concluant.");
  }
  refs = refs.slice(0, 5);

  return { resume, motsCles, intro, methode, resultats, discussion, limites, remerciements, conflit, financement, conclusion, refs };
}

// ─── Gabarit papier (article de recherche, deux colonnes) ────────

export function genererGabaritPapier(nomDS, dateDS, etab, theme) {
  var e = etab || ETABLISSEMENT;
  var piedPage = [e.nom, e.classe, e.matricule].filter(Boolean).join(" - ");
  var t = LATEX_THEMES[theme] || LATEX_THEMES.cobalt;
  return `\\documentclass[a4paper,10pt,twocolumn]{article}
\\usepackage[top=1.8cm,bottom=1.4cm,left=1.4cm,right=1.4cm,headheight=20pt]{geometry}
\\usepackage[french]{babel}
\\usepackage{fontspec}
\\setmainfont{Libertinus Serif}
\\setsansfont{Libertinus Sans}
\\usepackage{amsmath,amssymb}
\\usepackage[locale=FR]{siunitx}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\definecolor{accent}{RGB}{${t.accent}}
${defCompColorsTex()}
\\usepackage{tikz}
\\usepackage{pgfplots}\\pgfplotsset{compat=newest}
\\usepgfplotslibrary{polar}
\\usepackage{tcolorbox}\\tcbuselibrary{skins,raster,breakable}
\\usepackage{tabularray}\\UseTblrLibrary{booktabs}
\\usepackage{lastpage}
\\usepackage{fancyhdr}
\\usepackage[colorlinks=true,urlcolor=accent!70!black]{hyperref}
\\usepackage{subcaption}
\\usepackage{float}
\\usepackage{multicol}
\\usepackage{abstract}
\\abstitlestyle{\\bfseries\\sffamily}
\\setlength{\\absleftindent}{0pt}

% — barre de plage min–moy–max pour un KPI (#1 min, #2 valeur élève, #3 max ; 0..1) —
\\newcommand{\\rangebar}[3]{\\begin{tikzpicture}[baseline=-0.6ex]
  \\draw[black!15,line width=3pt,line cap=round] (0,0)--(3.4,0);
  \\draw[black!35] (#1*3.4,-1.6mm)--(#1*3.4,1.6mm);
  \\draw[black!35] (#3*3.4,-1.6mm)--(#3*3.4,1.6mm);
  \\fill[accent] (#2*3.4,0) circle (2.4pt);
\\end{tikzpicture}}

% — barre horizontale colorée (#1 label, #2 valeur 0..1, #3 couleur) —
\\newcommand{\\compbar}[3]{\\makebox[2.7cm][l]{#1}%
  \\begin{tikzpicture}[baseline=-0.4ex]
    \\fill[black!8] (0,0) rectangle (6,0.26);
    \\fill[#3]      (0,0) rectangle (#2*6,0.26);
  \\end{tikzpicture}\\;\\small$#2$}

\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{${nomDS} du ${dateDS}}
\\lfoot{${piedPage}}
\\renewcommand{\\headrulewidth}{0.6pt}
\\renewcommand{\\footrulewidth}{0.6pt}
\\setlength{\\headheight}{15pt}
\\renewcommand{\\arraystretch}{1.15}

\\begin{document}
`;
}

// ─── Rapport d'un élève — gabarit papier (article de recherche) ──

export function genererRapportElevePapier({
  student, exam, grades, remarks, absents, allStudents, nomDS, dateDS,
  seuils, seuilDifficile, seuilReussite, seuilPiege,
  getNote20, rankMap, stats, malusPaliers, malusManuel,
  commentaires, allRemarques,
  soundLinksEnabled, soundBaseUrl, soundAudioExt,
  bonusCompletConfig, clampQuestion = true,
  features,
  baremeLatex = true,
  papierTextes,
}) {
  var ft = features || { competences: true, coefficients: true, questionBonus: true, bonusComplet: true, malusAuto: true, questionPiege: true };
  const noteNorm = getNote20(student.id);
  const rang = rankMap[student.id] || "—";
  const presents = allStudents.filter(s => !absents[s.id]);
  const effectif = presents.length;
  const compP = competencePct(grades, student.id, exam);
  const e = ETABLISSEMENT;

  // Nombre de questions traitées / total (pour le moteur de texte)
  const totalQuestions = exam.exercises.reduce((s, ex) => s + ex.questions.length, 0);
  const nTraitees = exam.exercises.reduce((s, ex) => s + ex.questions.filter(q =>
    q.items.some(it => grades[`${student.id}__${it.id}`]) || grades["treated_" + student.id + "_" + q.id]
  ).length, 0);

  // ── Observations chiffrées pour le moteur de texte ──
  const moyClasse = presents.length ? presents.reduce((a, s) => a + getNote20(s.id), 0) / presents.length : 0;
  const just = ratioJustesse(grades, student.id, exam);
  const effi = ratioEfficacite(grades, student.id, exam);

  // Rendement par exercice (part des points obtenus), pour le relief
  const exPerf = [];
  exam.exercises.forEach((ex) => {
    const exT = ex.questions.reduce((s, q) =>
      s + q.items.reduce((si, it) => it.negative ? si : si + (parseFloat(it.points) || 0), 0), 0);
    const copies = presents.filter(s =>
      ex.questions.some(q => q.items.some(it => grades[`${s.id}__${it.id}`]))).length;
    if (!exT || !copies) return;
    exPerf.push({ title: ex.title, pct: exerciseScore(grades, student.id, ex, bonusCompletConfig).earned / exT });
  });
  exPerf.sort((a, b) => b.pct - a.pct);

  // Réussites sur questions difficiles (mêmes critères que le marqueur ★)
  let nEtoiles = 0;
  exam.exercises.forEach((ex) => ex.questions.forEach((q) => {
    const sc = questionScore(grades, student.id, q, clampQuestion);
    const aTraite = q.items.some(it => grades[`${student.id}__${it.id}`])
      || grades["treated_" + student.id + "_" + q.id];
    if (!aTraite) return;
    const nbTraitants = presents.filter(s =>
      q.items.some(it => grades[`${s.id}__${it.id}`])
      || grades["treated_" + s.id + "_" + q.id]
    ).length;
    const taux = presents.length > 0 ? (nbTraitants / presents.length) * 100 : 0;
    if (taux < seuilDifficile && sc.total > 0 && (sc.earned / sc.total) * 100 >= seuilReussite) nEtoiles++;
  }));

  // Compétence forte / faible (si le preset les affiche et le profil est contrasté)
  let compForte = null, compFaible = null;
  if (ft.competences) {
    const cvals = COMPETENCES.map(c => ({ label: c.label, v: typeof compP[c.id] === "number" ? compP[c.id] : 0 }));
    cvals.sort((a, b) => b.v - a.v);
    if (cvals.length >= 2 && cvals[0].v - cvals[cvals.length - 1].v >= 0.15) {
      compForte = cvals[0].label;
      compFaible = cvals[cvals.length - 1].label;
    }
  }

  // Tranche de performance (tiers de la cohorte), pilote le ton de la discussion
  const rangNum = typeof rang === "number" ? rang : Math.ceil(effectif / 2);
  const tranche = effectif >= 3
    ? (rangNum <= Math.ceil(effectif / 3) ? "haute"
      : (rangNum > effectif - Math.floor(effectif / 3) ? "basse" : "moyenne"))
    : "moyenne";

  // Label unique par élève : évite les \label dupliqués entre rapports
  const figOverview = "fig:ov" + _graine(student.id + (nomDS || ""));

  const obs = {
    contraste: exPerf.length >= 2
      ? (exPerf[0].pct - exPerf[exPerf.length - 1].pct >= 0.25 ? "fort" : "homogene")
      : null,
    meilleurEx: exPerf.length ? escapeTex(exPerf[0].title) : "",
    pctMeilleur: exPerf.length ? pct(exPerf[0].pct) : "",
    pireEx: exPerf.length ? escapeTex(exPerf[exPerf.length - 1].title) : "",
    pctPire: exPerf.length ? pct(exPerf[exPerf.length - 1].pct) : "",
    nEtoiles,
    just: pct(just), effi: pct(effi),
    equilibre: just - effi > 0.1 ? "justesse" : (effi - just > 0.1 ? "efficacite" : "equilibre"),
    compForte: compForte ? escapeTex(compForte) : null,
    compFaible: compFaible ? escapeTex(compFaible) : null,
    tranche,
    figOverview,
  };

  const banques = _mergeBanques(papierTextes);
  const textStats = {
    note: num(noteNorm),
    rang: typeof rang === "number" ? num(rang, 0) : rang,
    effectif: num(effectif, 0),
    moyenne: num(moyClasse),
    nTraitees, totalQuestions,
  };
  const textes = _assemblerTextes(student, exam, nomDS, textStats, banques, obs);

  let tex = "";
  tex += `\\clearpage\n`;
  // Remise à zéro des compteurs + numérotation arabe : chaque rapport est un
  // article autonome, et le \appendix du rapport précédent ne doit pas fuir.
  tex += `\\setcounter{section}{0}\\setcounter{figure}{0}\\setcounter{table}{0}\n`;
  tex += `\\renewcommand{\\thesection}{\\arabic{section}}\n`;
  tex += `\\lhead{${escapeTex(student.prenom)} ${escapeTex(student.nom)}}\n`;

  // ── Titre + résumé pleine largeur ──
  tex += `\\twocolumn[{%\n`;
  tex += `  \\centering\n`;
  tex += `  {\\fontsize{13}{15}\\selectfont\\bfseries\n`;
  tex += `    \\'Etude exp\\'erimentale des performances de ${escapeTex(student.prenom)}~\\textsc{${escapeTex(student.nom)}}\\par}\n`;
  tex += `  \\smallskip\n`;
  tex += `  {\\small S.~\\textsc{Correcteur}\\textsuperscript{1,$\\ast$}\\par}\n`;
  tex += `  {\\footnotesize\\itshape \\textsuperscript{1}${escapeTex(e.nom)}, ${escapeTex(e.classe)}\\par}\n`;
  tex += `  \\smallskip\n`;
  tex += `  {\\scriptsize Re\\c{c}u~: ${escapeTex(dateDS || "")} \\textperiodcentered\\ Accept\\'e~: ${escapeTex(dateDS || "")} (proc\\'edure acc\\'el\\'er\\'ee) \\textperiodcentered\\ Publi\\'e~: le soir m\\^eme\\par}\n`;
  tex += `  {\\scriptsize \\textsuperscript{$\\ast$}Auteur correspondant~: ${escapeTex(e.matricule || e.nom)}\\par}\n`;
  tex += `  \\smallskip\n`;
  tex += `  \\rule{0.85\\linewidth}{0.4pt}\\par\\smallskip\n`;
  tex += `  \\begin{minipage}{0.85\\linewidth}\n`;
  tex += `    \\small\\textbf{R\\'esum\\'e.}\\ \\itshape ${textes.resume}\\par\n`;
  tex += `    \\smallskip\n`;
  tex += `    \\upshape\\textbf{Mots-cl\\'es~:}\\ ${textes.motsCles}\n`;
  tex += `  \\end{minipage}\\par\\medskip\n`;
  // Figure d'ensemble non flottante, dans le bloc pleine largeur du titre :
  // placement garanti sous le résumé (figure* n'accepte pas [H] en twocolumn).
  tex += `  \\begin{minipage}{\\textwidth}\n`;
  if (ft.competences) {
    tex += `  \\begin{minipage}[b]{0.30\\textwidth}\\centering\n${_radarCompetencesTex(compP)}\\\\[1mm]{\\footnotesize (a) Par comp\\'etence}\\end{minipage}\\hfill\n`;
    tex += `  \\begin{minipage}[b]{0.33\\textwidth}\\centering\n${_distributionTex(presents, getNote20, noteNorm)}\\\\[1mm]{\\footnotesize (b) Distribution des notes}\\end{minipage}\\hfill\n`;
    tex += `  \\begin{minipage}[b]{0.33\\textwidth}\\centering\n${_rankBarTex(presents, getNote20, student.id)}\\\\[1mm]{\\footnotesize (c) Classement}\\end{minipage}\n`;
  } else {
    tex += `  \\begin{minipage}[b]{0.48\\textwidth}\\centering\n${_distributionTex(presents, getNote20, noteNorm)}\\\\[1mm]{\\footnotesize (a) Distribution des notes}\\end{minipage}\\hfill\n`;
    tex += `  \\begin{minipage}[b]{0.48\\textwidth}\\centering\n${_rankBarTex(presents, getNote20, student.id)}\\\\[1mm]{\\footnotesize (b) Classement}\\end{minipage}\n`;
  }
  tex += `  \\par\\smallskip\n`;
  tex += `  \\captionof{figure}{Vue d'ensemble des performances du sujet relativement \\\`a la cohorte.}\n`;
  tex += `  \\label{${figOverview}}\n`;
  tex += `  \\end{minipage}\\par\\medskip\n`;
  tex += `}]\n`;

  // ── Introduction ──
  tex += `\\section{Introduction}\n${textes.intro}\n\n`;

  // ── Matériel et méthodes ──
  tex += `\\section{Mat\\'eriel et m\\'ethodes}\n${textes.methode}\n\n`;

  // ── Résultats ──
  tex += `\\section{R\\'esultats}\n${textes.resultats}\n\n`;

  // ── Tableaux par exercice (logique identique au gabarit bento) ──
  // Les histogrammes sont collectés ici puis émis en une seule figure*
  // pleine largeur après les tableaux (option C1).
  var legendeEmise = false;
  var histFigs = [];
  exam.exercises.forEach((ex) => {
    const exT = ex.questions.reduce((s, q) =>
      s + q.items.reduce((si, it) => it.negative ? si : si + (parseFloat(it.points) || 0), 0), 0);
    const copies = presents.filter(s =>
      ex.questions.some(q => q.items.some(it => grades[`${s.id}__${it.id}`]))).length;
    if (copies === 0) return;

    const enotes = presents.map(s => exerciseScore(grades, s.id, ex, bonusCompletConfig).earned);
    const emoy = enotes.reduce((a, b) => a + b, 0) / enotes.length;
    const emin = Math.min(...enotes);
    const emax = Math.max(...enotes);
    const stuExScore = exerciseScore(grades, student.id, ex, bonusCompletConfig).earned;

    const nbBins = Math.ceil(exT) + 1;
    const histBins = Array.from({ length: nbBins }, () => 0);
    enotes.forEach(n => histBins[Math.min(nbBins - 1, Math.floor(n))]++);
    const maxBin = Math.max(...histBins, 1);

    if (!legendeEmise) {
      tex += `\\smallskip\\noindent{\\footnotesize\\sffamily\\textbf{L\\'egende~:}\\quad `;
      tex += `$\\bigstar$~r\\'eussite sur question difficile\\quad `;
      if (ft.questionPiege) tex += `$\\triangle$~question pi\\\`ege\\quad `;
      tex += `$\\dagger$~question bonus}\\par\\smallskip\n`;
      legendeEmise = true;
    }

    tex += `\\begin{table}[H]\n`;
    tex += `\\caption{${escapeTex(ex.title)} \\textemdash\\ ${num(stuExScore)}\\,/\\,${num(exT)}}\n`;
    tex += `\\centering\n`;
    tex += `\\begin{tblr}{colspec={Q[l,wd=2.1cm]Q[c,wd=1.4cm]X[l]},\n`;
    tex += `  row{1}={font=\\bfseries\\footnotesize}, row{odd}={bg=black!3},\n`;
    tex += `  rowsep=2pt, hline{1,2,Z}={0.4pt,black!40}}\n`;
    tex += `Q. & Note & Commentaire \\\\\n`;

    ex.questions.forEach(q => {
      const sc = questionScore(grades, student.id, q, clampQuestion);
      const aTraite = q.items.some(it => grades[`${student.id}__${it.id}`])
        || grades["treated_" + student.id + "_" + q.id];
      if (!aTraite) return;

      const nbTraitants = presents.filter(s =>
        q.items.some(it => grades[`${s.id}__${it.id}`])
        || grades["treated_" + s.id + "_" + q.id]
      ).length;
      const tauxTraitement = presents.length > 0 ? (nbTraitants / presents.length) * 100 : 0;
      const estDifficile = tauxTraitement < seuilDifficile;
      const estPiege = tauxTraitement >= 50 && sc.total > 0 && (sc.earned / sc.total) * 100 < (seuilPiege || 30);

      const pctReussite = sc.total > 0 ? (sc.earned / sc.total) * 100 : 0;
      const estReussie = pctReussite >= seuilReussite;
      const marqueurEtoile = estDifficile && estReussie ? " \\textbf{$\\bigstar$}" : "";
      const marqueurPiege = (ft.questionPiege && estPiege) ? " \\textbf{$\\triangle$}" : "";
      const marqueurBonus = q.bonus ? " \\textbf{$\\dagger$}" : "";

      const bold = estDifficile ? "\\bfseries " : estPiege ? "\\color{orange}\\bfseries " : "";
      const remKey = `${student.id}__${q.id}`;

      var qLabelTex;
      if (soundLinksEnabled && soundBaseUrl) {
        var audioUrl = soundBaseUrl + buildAudioFilename(nomDS, student.nom, ex.title, q.label, soundAudioExt || "webm");
        qLabelTex = `\\href{${audioUrl}}{\\textcolor{blue!50!black}{${escapeTex(q.label)}}}`;
      } else {
        qLabelTex = escapeTex(q.label);
      }
      const badges = ft.competences && q.competences && q.competences.length
        ? `\\;${_compBadgesTex(q.competences)}` : "";
      tex += `${bold}${qLabelTex}${marqueurBonus}${marqueurEtoile}${marqueurPiege}${badges} & ${num(sc.earned)}/${num(sc.total)} & ${encodeRemarks(remarks[remKey], allRemarques)} \\\\\n`;
    });

    tex += `\\end{tblr}\n`;
    tex += `\\end{table}\n\n`;

    histFigs.push({ title: ex.title, nbBins, histBins, maxBin, stuExScore, copies, emin, emax, emoy });
  });

  // ── Histogrammes par exercice, regroupés en une figure pleine largeur ──
  if (histFigs.length > 0) {
    tex += `\\begin{figure*}[!tp]\n\\centering\n`;
    histFigs.forEach((h, i) => {
      tex += `\\begin{subfigure}[t]{0.31\\textwidth}\\centering\n`;
      tex += `\\begin{tikzpicture}\n`;
      tex += `\\begin{axis}[\n`;
      tex += `  ybar, bar width=0.7,\n`;
      tex += `  ymin=0, ymax=${h.maxBin + 2},\n`;
      tex += `  xmin=-0.5, xmax=${h.nbBins - 0.5},\n`;
      tex += `  xlabel={Note}, ylabel={Effectif},\n`;
      tex += `  label style={font=\\footnotesize},\n`;
      tex += `  tick label style={font=\\scriptsize},\n`;
      tex += `  width=\\linewidth, height=3.8cm,\n`;
      tex += `  area style\n`;
      tex += `]\n`;
      tex += `\\addplot+[ybar interval,mark=no,fill=accent!35,draw=accent!60] coordinates {`;
      for (let k = 0; k < h.nbBins; k++) tex += `(${k},${h.histBins[k]})`;
      tex += `(${h.nbBins},0)};\n`;
      tex += `\\draw[red, thick, dashed] (axis cs:${h.stuExScore.toFixed(1)},0) -- (axis cs:${h.stuExScore.toFixed(1)},${h.maxBin + 1});\n`;
      tex += `\\end{axis}\n`;
      tex += `\\end{tikzpicture}\n`;
      tex += `\\caption{${escapeTex(h.title)} \\textemdash\\ moy~${num(h.emoy)}, min~${num(h.emin)}, max~${num(h.emax)} (${h.copies}~copies)}\n`;
      tex += `\\end{subfigure}`;
      tex += (i === histFigs.length - 1) ? `\n` : (i % 3 === 2 ? `\\\\[4mm]\n` : `\\hfill\n`);
    });
    tex += `\\caption{Scores par exercice au sein de la cohorte ; le trait pointill\\'e rouge marque le score du sujet.}\n`;
    tex += `\\end{figure*}\n\n`;
  }

  // ── Discussion ──
  tex += `\\section{Discussion}\n`;
  tex += `\\subsection{Interpr\\'etation}\n${textes.discussion}\n\n`;
  tex += `\\subsection{Limites de l'\\'etude}\n${textes.limites}\n\n`;

  // ── Conclusion ──
  tex += `\\section{Conclusion et perspectives}\n${textes.conclusion}\n\n`;

  // ── Remerciements / conflit / financement ──
  tex += `\\section*{Remerciements}\n${textes.remerciements}\n\n`;
  tex += `\\section*{Conflit d'int\\'er\\^ets}\n${textes.conflit}\n\n`;
  tex += `\\section*{Financement}\n${textes.financement}\n\n`;

  // ── Bibliographie ──
  tex += `\\begin{thebibliography}{9}\n`;
  textes.refs.forEach(ref => {
    const m = ref.match(/^\[(\d+)\]\s*(.*)$/);
    // Clé unique par élève : évite les \bibitem dupliqués entre rapports
    if (m) tex += `\\bibitem[${m[1]}]{ref${m[1]}x${_graine(student.id + (nomDS || ""))}} ${m[2]}\n`;
  });
  tex += `\\end{thebibliography}\n`;

  // ── Annexe : barème détaillé (hors twocolumn pour le longtblr) ──
  const tousItems = exam.exercises.flatMap(ex => {
    const qItems = ex.questions.flatMap(q => {
      const aTraite = q.items.some(it => grades[`${student.id}__${it.id}`])
        || grades["treated_" + student.id + "_" + q.id];
      if (!aTraite) return [];
      return q.items
        .filter(it => !it.negative || !!grades[`${student.id}__${it.id}`])
        .map(it => ({
          exTitle: ex.title,
          qLabel: q.label,
          bonus: q.bonus,
          label: it.label,
          earned: grades[`${student.id}__${it.id}`] ? (parseFloat(it.points) || 0) : 0,
          total: parseFloat(it.points) || 0,
          negative: !!it.negative,
          isBonusComplet: false,
        }));
    });
    if (ex.bonusComplet && bonusCompletConfig) {
      const bonusPts = bonusCompletPoints(grades, student.id, ex, bonusCompletConfig);
      if (bonusPts > 0) {
        qItems.push({
          exTitle: ex.title, qLabel: null, bonus: false,
          label: "Bonus exercice complet",
          earned: bonusPts, total: bonusPts, isBonusComplet: true,
        });
      }
    }
    return qItems;
  });

  if (baremeLatex && tousItems.length > 0) {
    tex += `\\newpage\\onecolumn\n`;
    tex += `\\appendix\n`;
    tex += `\\section{Bar\\\`eme d\\'etaill\\'e}\n`;
    tex += `\\begin{longtblr}{colspec={X[l]Q[c,wd=1.4cm]Q[c,wd=1.4cm]},\n`;
    tex += `  rowhead=1, row{1}={font=\\bfseries\\footnotesize, bg=accent!12},\n`;
    tex += `  row{even}={bg=black!3}, rowsep=1.5pt, hline{1,2,Z}={0.4pt,black!40}}\n`;
    tex += `{\\footnotesize Item} & {\\footnotesize /pts} & {\\footnotesize obt.} \\\\\n`;
    let lastEx = null;
    tousItems.forEach(it => {
      if (it.exTitle !== lastEx) {
        tex += `\\SetCell[c=3]{l, bg=accent!8} {\\footnotesize\\textbf{${escapeTex(it.exTitle)}}} & & \\\\\n`;
        lastEx = it.exTitle;
      }
      if (it.isBonusComplet) {
        tex += `{\\footnotesize \\textcolor{green!50!black}{\\textbf{$\\bigstar$\\ ${escapeTex(it.label)}}}} & {\\footnotesize +${num(it.total)}} & {\\footnotesize \\textcolor{green!50!black}{+${num(it.earned)}}} \\\\\n`;
      } else if (it.negative) {
        tex += `{\\footnotesize \\textcolor{red!60!black}{$-$\\ [Q.${escapeTex(it.qLabel)}] ${escapeTex(it.label)}}} & {\\footnotesize \\textcolor{red!60!black}{${num(it.total, 1)}}} & {\\footnotesize \\textcolor{red!60!black}{${num(it.earned, 1)}}} \\\\\n`;
      } else {
        const bonusMark = it.bonus ? " {\\small$\\dagger$}" : "";
        const check = it.earned > 0 ? "$\\surd$\\ " : "\\phantom{$\\surd$}\\ ";
        tex += `{\\footnotesize ${check}[Q.${escapeTex(it.qLabel)}${bonusMark}] ${escapeTex(it.label)}} & {\\footnotesize ${num(it.total)}} & {\\footnotesize ${num(it.earned)}} \\\\\n`;
      }
    });
    tex += `\\end{longtblr}\n`;
    tex += `\\twocolumn\n`;
  }

  tex += `\\newpage\n`;
  return tex;
}

// ─── Helpers privés ───────────────────────────────────────────────

// Radar compétences (pgfplots polaire). compP = { A:0..1, N, R, V }.
// Convention alignée sur Charts.jsx : ordre COMPETENCES, premier axe à midi,
// sens horaire. En polaire pgfplots, l'angle 90° = midi ; on décrémente de
// 360/n par compétence pour le sens horaire. Échelle 0..1.
function _radarCompetencesTex(compP) {
  const R = 1.85;    // rayon en cm (rempli à la hauteur de la colonne KPI)
  const pad = 0.55;  // distance des labels au-delà du rayon
  const n = COMPETENCES.length;
  const ang = (i) => 90 - i * (360 / n);                       // premier axe à midi, sens horaire
  const P = (i, f) => `(${ang(i)}:${(f * R).toFixed(3)}cm)`;  // coord. polaire TikZ

  let s = "";
  s += `\\begin{tikzpicture}\n`;
  // grille concentrique (0.25 / 0.5 / 0.75 / 1)
  [0.25, 0.5, 0.75, 1].forEach((lvl) => {
    const ring = COMPETENCES.map((_, i) => P(i, lvl)).join(" -- ");
    s += `\\draw[black!15, line width=${lvl === 1 ? "0.6" : "0.3"}pt] ${ring} -- cycle;\n`;
  });
  // axes radiaux
  COMPETENCES.forEach((_, i) => {
    s += `\\draw[black!15, line width=0.3pt] (0,0) -- ${P(i, 1)};\n`;
  });
  // polygone de données
  const data = COMPETENCES.map((c, i) => {
    const v = (typeof compP[c.id] === "number" ? compP[c.id] : 0);
    return P(i, v);
  }).join(" -- ");
  s += `\\draw[fill=accent!20, draw=accent, line width=1pt] ${data} -- cycle;\n`;
  // sommets + labels colorés par compétence
  COMPETENCES.forEach((c, i) => {
    const v = (typeof compP[c.id] === "number" ? compP[c.id] : 0);
    s += `\\fill[comp${c.id}] ${P(i, v)} circle (1.6pt);\n`;
    s += `\\node[comp${c.id}, font=\\footnotesize\\bfseries] at (${ang(i)}:${(R + pad).toFixed(2)}cm) {${c.short}};\n`;
  });
  s += `\\end{tikzpicture}\n`;
  return s;
}

// Histogramme de distribution des notes /20 de la classe (bins de largeur 2),
// avec la note de l'élève en pointillé rouge. notes via getNote20.
function _distributionTex(presents, getNote20, noteEleve) {
  const notes = presents.map(s => getNote20(s.id));
  // 20 classes de largeur 1 : [0,1), [1,2), … [19,20]
  const bins = Array.from({ length: 20 }, () => 0);
  notes.forEach(nt => {
    const idx = Math.max(0, Math.min(19, Math.floor(nt)));
    bins[idx]++;
  });
  const maxBin = Math.max(...bins, 1);

  let s = "";
  s += `\\begin{tikzpicture}\n`;
  s += `\\begin{axis}[\n`;
  s += `  ybar interval, width=0.97\\linewidth, height=5.2cm,\n`;
  s += `  xmin=0, xmax=20, ymin=0, ymax=${maxBin + 1},\n`;
  s += `  xtick={0,2,4,6,8,10,12,14,16,18,20},\n`;
  s += `  ytick=\\empty, axis y line=none,\n`;
  s += `  xlabel={Note /20}, xlabel style={font=\\footnotesize},\n`;
  s += `  tick label style={font=\\scriptsize},\n`;
  s += `  axis x line=bottom,\n`;
  s += `]\n`;
  s += `\\addplot+[ybar interval, mark=no, fill=accent!35, draw=accent!60]\n`;
  s += `  coordinates {`;
  for (let k = 0; k < 20; k++) s += `(${k},${bins[k]})`;
  s += `(20,0)};\n`;
  s += `\\draw[red, thick, dashed] (axis cs:${noteEleve.toFixed(2)},0) -- (axis cs:${noteEleve.toFixed(2)},${maxBin + 1});\n`;
  s += `\\end{axis}\n`;
  s += `\\end{tikzpicture}\n`;
  return s;
}

// Histogramme « Classement » : notes /20 triées (rang 1 = meilleur), escalier rempli,
// copie de l'élève marquée d'un trait rouge.
function _rankBarTex(presents, getNote20, studentId) {
  const ranked = presents.map(s => ({ id: s.id, note: getNote20(s.id) }))
    .sort((a, b) => b.note - a.note);
  const N = ranked.length;
  const myIdx = ranked.findIndex(r => r.id === studentId);
  const myRank = myIdx + 1;
  const myNote = myIdx >= 0 ? ranked[myIdx].note : 0;

  let s = "";
  s += `\\begin{tikzpicture}\n`;
  s += `\\begin{axis}[\n`;
  s += `  width=0.97\\linewidth, height=5.2cm,\n`;
  s += `  ymin=0, ymax=20, xmin=0.5, xmax=${(N + 0.5).toFixed(1)},\n`;
  s += `  ytick={0,5,10,15,20}, tick label style={font=\\scriptsize},\n`;
  s += `  xlabel={Rang (1 = meilleur)}, xlabel style={font=\\footnotesize},\n`;
  s += `  ylabel={Note /20}, ylabel style={font=\\footnotesize},\n`;
  s += `  axis x line=bottom, axis y line=left, enlarge x limits=0.02,\n`;
  s += `]\n`;
  s += `\\addplot[const plot, mark=no, draw=accent!60, fill=accent!20] coordinates {`;
  ranked.forEach((r, i) => { s += `(${i + 1},${r.note.toFixed(2)})`; });
  s += `} \\closedcycle;\n`;
  // marqueur de l'élève
  s += `\\draw[red, thick, dashed] (axis cs:${myRank},0) -- (axis cs:${myRank},20);\n`;
  s += `\\node[red, font=\\scriptsize\\bfseries, anchor=south] at (axis cs:${myRank},${Math.min(19.0, myNote + 0.4).toFixed(2)}) {${myRank}};\n`;
  s += `\\end{axis}\n`;
  s += `\\end{tikzpicture}\n`;
  return s;
}

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
