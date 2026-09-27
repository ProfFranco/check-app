// ═══════════════════════════════════════════════════════════════════
// GÉNÉRATEUR LATEX
// ═══════════════════════════════════════════════════════════════════
//
// Génère le code LaTeX pour les rapports individuels (gabarit bento)
// et pour l'article de classe (faux article de recherche, deux colonnes,
// un document par DS pour toute la classe : genererArticleClasse).
// Le gabarit bento (préambule) est éditable dans l'interface.
// Les graphiques sont en pgfplots/TikZ (LaTeX pur).
//
// Pour modifier l'apparence des rapports :
// → Modifiez le gabarit dans l'onglet Export de l'app
// → Ou modifiez la fonction genererGabarit() ci-dessous
// ═══════════════════════════════════════════════════════════════════

import { COMPETENCES, REMARQUES, ETABLISSEMENT, DEFAULT_FEATURES } from "../config/settings";
import {
  studentTotal, examTotal, noteSur20,
  questionScore, exerciseScore, bonusCompletPoints,
  ratioJustesse, ratioEfficacite,
  notesParCompetence, countMalusRemarks, malusTotal,
  competencePct, compColor, examTotalWeighted,
} from "./calculs";
import { slugify, buildAudioFilename } from "./helpers";
import { statsDS, serieDS, evolution } from "./statsClasse";

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
      allStudents: students, nomDS, dateDS, seuils, seuilDifficile, seuilReussite, seuilPiege,
      getNote20, rankMap, stats, malusPaliers, malusManuel,
      commentaires, allRemarques,
      soundLinksEnabled, soundBaseUrl, soundAudioExt,
      bonusCompletConfig, clampQuestion,
      features,
      baremeLatex,
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
}) {
  const presents = students.filter(s => !absents[s.id]);
  const { rankMap, stats } = _buildRankAndStats(presents, getNote20);
  const gab = gabarit || genererGabarit(nomDS, dateDS);

  return presents.map(student => {
    const slug = slugify(student.nom + "_" + student.prenom);
    const filename = `CR_${nomDS || "DS"}_${slug}.tex`.replace(/\s+/g, "_");
    const content =
      gab +
      genererRapportEleve({
        student, exam, grades, remarks, absents,
        allStudents: students, nomDS, dateDS, seuils, seuilDifficile, seuilReussite, seuilPiege,
        getNote20, rankMap, stats, malusPaliers, malusManuel,
        commentaires, allRemarques,
        soundLinksEnabled, soundBaseUrl, soundAudioExt,
        bonusCompletConfig, clampQuestion,
        features,
        baremeLatex,
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

// Permutation déterministe de [0, n) (Fisher-Yates sur _rng)
function _perm(n, seed) {
  var r = _rng(seed);
  var a = [];
  for (var i = 0; i < n; i++) a.push(i);
  for (var j = n - 1; j > 0; j--) {
    var k = Math.floor(r() * (j + 1));
    var t = a[j]; a[j] = a[k]; a[k] = t;
  }
  return a;
}

// Rotation sans répétition : chaque banque est parcourue, au fil des DS du
// profil, dans un ordre mélangé fixé une fois pour toutes (graine de profil
// + clé de banque). Deux DS consécutifs ne tirent donc jamais la même
// phrase, et un même DS redonne toujours le même texte. Un « autre tirage »
// décale la lecture d'un cran : chaque banque change alors de phrase.
// ctx : { graine, pas, tirage } — pas = rang du DS dans la série (0 = premier).
function _rotN(ctx, banques, cle, n) {
  var banque = banques[cle] || [];
  var m = Math.min(n, banque.length);
  if (!m) return [];
  var p = _perm(banque.length, _graine(ctx.graine + "|" + cle));
  var debut = (ctx.pas + (ctx.tirage || 0)) * m;
  var out = [];
  for (var i = 0; i < m; i++) out.push(banque[p[(debut + i) % banque.length]]);
  return out;
}

function _rot(ctx, banques, cle) { return _rotN(ctx, banques, cle, 1)[0] || ""; }

// Remplace les {placeholders} d'un gabarit par les valeurs fournies.
// Un placeholder inconnu est laissé tel quel. Les groupes LaTeX ne
// matchent pas : le contenu doit être un mot seul (\w+), donc
// \textit{Le cours}, \ref{fig:x} ou \og{} ne sont jamais touchés.
function _tpl(str, vars) {
  return str.replace(/\{(\w+)\}/g, function(m, k) {
    return (vars && vars[k] !== undefined && vars[k] !== null) ? String(vars[k]) : m;
  });
}

// Fusionne des surcharges partielles (depuis l'UI) avec les banques par défaut.
function _mergeBanques(defauts, surcharges) {
  if (!surcharges) return defauts;
  var out = Object.assign({}, defauts);
  Object.keys(defauts).forEach(function(cle) {
    if (Array.isArray(surcharges[cle]) && surcharges[cle].length) out[cle] = surcharges[cle];
  });
  return out;
}

// ─── Article de classe : seuils de ton et banques ────────────────

// Seuils qui pilotent le choix des banques (moyennes et σ en points /20)
var ARTICLE_SEUILS = {
  niveauHaut: 12, niveauBas: 8,          // moyenne brute de cohorte
  sigmaHomogene: 2.5, sigmaHeterogene: 4, // écart-type brut
  tendance: 1,                            // écart de moyenne brute entre deux DS
  rhoStable: 0.7, rhoBrassage: 0.4,       // corrélation de rang de Spearman
  contraste: 0.25,                        // écart de réussite meilleur/pire exercice
  strategie: 0.1,                         // écart justesse − efficacité
  compContraste: 0.15,                    // écart compétence forte/faible
  coauteursMin: 6,                        // copies corrigées pour publier les co-auteurs
};

// Banques personnalisables depuis Réglages → Export LaTeX (clé, libellé)
export var ARTICLE_TEXTES_EDITABLES = [
  ["ouverture", "Phrases d'ouverture du résumé"],
  ["verdict", "Verdicts du résumé (complètent « Ces résultats sont … »)"],
  ["limites", "Limites de l'étude"],
  ["conclusion", "Conclusions"],
  ["remerciements_divers", "Remerciements divers (complètent « … ainsi que … »)"],
  ["conflit", "Conflit d'intérêts"],
  ["financement", "Financement"],
  ["relecteur2", "Rapport du relecteur n°2"],
];

// Banques de gabarits. Chaque entrée est une phrase complète et
// autoporteuse ; les données s'injectent via des placeholders, jamais
// par concaténation. Placeholders : {classe} {ds} {n} {nEx} {nExTxt} {nQ} {rangDS}
// {moyenne} {mediane} {sigma} {moyBrute} {sigmaBrut} {partSup10}
// {dsPrec} {refPrec} {nPrec} {nPrecTxt} {delta} {deltaAbs} {moyCible} {maxCible}
// {sigmaCible} {nAbsents} {nAbsentsTxt} {attrition} {meilleurEx} {pctMeilleur} {pireEx}
// {pctPire} {qReussie} {pctReussie} {qDelaissee} {pctDelaissee} {qPieges}
// {nPieges} {nPiegesTxt} {qDiscri} {rDiscri} {compForte} {compFaible} {just} {effi}
// {rho} {nCommuns} {entrants} {secRes} {tirage}
function _banquesArticleDefaut() {
  return {
    revue: [
      "Annales de Docimologie Appliquée",
      "Cahiers de Métrologie Scolaire",
      "Revue Internationale des Copies Corrigées",
      "Acta Correctionis",
      "Bulletin de la Société Savante des Correcteurs",
      "Comptes Rendus de l'Académie des Copies",
      "Physical Review of Copies — Letters",
    ],
    type: [
      "Article de recherche",
      "Communication courte",
      "Lettre",
      "Rapport d'étape",
      "Note technique",
      "Prépublication (non relue)",
    ],
    titre: [
      "Étude expérimentale des performances collectives de la cohorte {classe} lors du {ds}",
      "Sur la distribution des acquis dans une population de {n} sujets soumis au {ds}",
      "Le {ds} : observation d'un phénomène collectif en conditions contrôlées",
      "Mesure des performances de la cohorte {classe} : résultats de la campagne {ds}",
      "Contribution à l'étude des copies de {classe} : le cas du {ds}",
      "Réponse collective d'une cohorte de {n} sujets à une sollicitation écrite de type {ds}",
      "Propriétés statistiques d'un échantillon de {n} copies ({ds})",
    ],
    ouverture: [
      "Nous rapportons l'étude expérimentale des performances d'une cohorte de {n} sujets, observés en conditions réelles lors du {ds}.",
      "Le présent article consigne, avec toute la rigueur que la situation autorise, les performances collectives mesurées au {ds}.",
      "Nous portons à la connaissance de la communauté scientifique les données recueillies sur une population de {n} copies à l'occasion du {ds}.",
      "Cette note présente la campagne de mesures n\\textsuperscript{o}~{rangDS}, conduite sur la cohorte {classe} durant le {ds}.",
      "Conformément aux exigences de transparence de la revue, nous publions l'ensemble des observations collectives effectuées lors du {ds}.",
      "Il nous est agréable, dans une acception toute relative du terme, de documenter la réponse de la cohorte {classe} au {ds}.",
    ],
    resume_protocole: [
      "Le protocole repose sur une épreuve écrite de {nExTxt} et {nQ}~questions, notée par items.",
      "Les mesures ont été effectuées à l'aide d'un barème par items, selon une procédure en double aveugle où, en pratique, seul le correcteur voyait quelque chose.",
      "Le dispositif expérimental, éprouvé sur plusieurs générations de sujets, n'a jamais été validé par un comité indépendant, aucun comité n'ayant souhaité s'en approcher.",
      "L'instrument de mesure comporte {nQ}~questions réparties en {nExTxt}, administrées en une seule passation et sans groupe témoin.",
    ],
    resume_resultat: [
      "La moyenne de cohorte s'établit à {moyenne}/20 (médiane {mediane}/20, écart-type {sigma}).",
      "L'observable principale, la note moyenne, vaut {moyenne}/20, pour une médiane de {mediane}/20 et un écart-type de {sigma}.",
      "On relève une moyenne de {moyenne}/20 et une médiane de {mediane}/20 ; {partSup10} des copies franchissent le seuil symbolique de 10/20.",
    ],
    resume_evolution_hausse: [
      "Par rapport au {dsPrec}, la moyenne brute progresse de {deltaAbs}~pt, résultat que l'auteur se garde d'attribuer à son seul enseignement.",
      "Une élévation de {deltaAbs}~pt de la moyenne brute est observée depuis le {dsPrec} ; l'hypothèse d'un réchauffement pédagogique ne peut être exclue.",
    ],
    resume_evolution_stable: [
      "La moyenne brute demeure stable par rapport au {dsPrec} ({delta}~pt), ce qui confirme la robustesse de l'instrument, ou celle de la cohorte.",
      "Aucune dérive significative n'est constatée depuis le {dsPrec} ({delta}~pt) : le système semble avoir atteint un régime stationnaire.",
    ],
    resume_evolution_baisse: [
      "La moyenne brute recule de {deltaAbs}~pt depuis le {dsPrec} ; l'auteur, qui a conçu les deux sujets, envisage sérieusement la piste de l'instrument.",
      "Un fléchissement de {deltaAbs}~pt est mesuré par rapport au {dsPrec}, écart que la théorie attribue d'ordinaire à la difficulté du sujet plutôt qu'à la cohorte.",
    ],
    verdict: [
      "jugés publiables faute de mieux",
      "d'un intérêt scientifique modéré mais réel",
      "soumis à réplication lors du prochain DS",
      "compatibles avec l'hypothèse nulle, ce qui n'était pas le but",
      "conformes aux espérances de l'éditeur",
      "statistiquement significatifs au seuil que l'on voudra bien leur accorder",
      "en bon accord avec la littérature, hélas",
      "remarquables par leur reproductibilité (l'épreuve n'ayant eu lieu qu'une fois)",
    ],
    intro: [
      "L'évaluation des acquis d'une cohorte demeure un problème ouvert, malgré des décennies d'efforts et de copies.",
      "La question de savoir si une classe a compris quelque chose reste entière après correction, mais elle est désormais mieux documentée.",
      "Le devoir surveillé constitue le paradigme expérimental central de cette étude ; il présente l'avantage d'être reproductible, en principe.",
      "La littérature sur le sujet est abondante ; sa fréquentation par les principaux intéressés l'est moins.",
      "L'étude des comportements collectifs face à une épreuve écrite a une longue histoire, que le présent article ne prétend pas clore.",
      "On rappelle que l'objectif affiché de l'épreuve est la mesure des acquis ; son objectif réel demeure un champ de recherche ouvert.",
      "Les phénomènes collectifs observés en salle d'examen présentent une richesse que seule une analyse statistique rigoureuse, ou à défaut celle-ci, permet d'apprécier.",
    ],
    intro_serie: [
      "Le présent travail constitue la {rangDS}\\textsuperscript{e}~campagne de mesures conduite sur la cohorte ; il prolonge directement l'étude du {dsPrec}~{refPrec}.",
      "Cette étude s'inscrit dans un programme de recherche au long cours, dont le {dsPrec}~{refPrec} constituait le dernier jalon publié.",
      "Après {nPrecTxt}, dont la plus récente est consacrée au {dsPrec}~{refPrec}, les conditions sont réunies pour une analyse longitudinale.",
    ],
    intro_premiere: [
      "Le présent article inaugure une série de campagnes de mesures ; faute de données antérieures, toute comparaison est reportée aux numéros suivants.",
      "Il s'agit de la première campagne documentée sur cette cohorte : l'auteur dispose donc d'un point de référence, ce qui est peu, mais non nul.",
    ],
    methode_attrition: [
      "L'attrition ({nAbsentsTxt}) est conforme aux standards du domaine et n'a pas été investiguée plus avant.",
      "Au total, {nAbsentsTxt} ont été perdus de vue le jour de la mesure ; leurs motivations n'ont pas été recueillies, par discrétion.",
      "Le taux d'attrition s'élève à {attrition} ; aucun biais de sélection n'est suspecté, faute d'avoir été cherché.",
    ],
    methode_complet: [
      "La cohorte a été observée au complet, fait suffisamment rare pour être signalé.",
      "Aucune attrition n'est à déplorer, ce que l'auteur tient pour un résultat en soi.",
    ],
    methode: [
      "Chaque question est notée selon un barème dont l'auteur est seul juge.",
      "L'instrument de mesure a été étalonné sur un échantillon d'un correcteur, ce qui garantit une excellente reproductibilité inter-juges.",
      "Les données ont été acquises en salle, en environnement partiellement contrôlé (température, luminosité, motivation).",
      "Le traitement statistique se limite à des outils que le lecteur peut vérifier de tête, par prudence méthodologique autant que par goût.",
      "L'écrêtage par question garantit qu'aucune question ne rapporte plus que ce qu'elle vaut, règle dont la portée philosophique n'a pas échappé à l'auteur.",
    ],
    methode_norm_none: [
      "Aucune normalisation n'a été appliquée : les notes publiées sont les notes mesurées, sans correction instrumentale d'aucune sorte.",
      "Les notes sont livrées brutes de décoffrage, l'auteur ayant renoncé à toute forme de retouche.",
    ],
    methode_norm_proportional: [
      "Les notes ont fait l'objet d'une correction proportionnelle calée sur une moyenne cible de {moyCible}/20, procédure que la littérature interne désigne sous le nom de \\og recalibrage homothétique\\fg.",
      "Une homothétie a ramené la moyenne de cohorte à {moyCible}/20, opération réversible en théorie et irréversible en pratique.",
    ],
    methode_norm_proportional_max: [
      "Une homothétie calée sur le maximum ({maxCible}/20) a été appliquée, de sorte que la meilleure copie définit l'étalon de la cohorte.",
      "Les notes ont été rapportées à la meilleure copie, portée à {maxCible}/20 : la cohorte est ainsi mesurée à l'aune de ses propres sommets.",
    ],
    methode_norm_affine: [
      "Une transformation affine (moyenne cible {moyCible}/20, écart-type cible {sigmaCible}) a été appliquée aux mesures brutes, opération que les métrologues nomment étalonnage et les sujets, miracle.",
      "Les mesures brutes ont subi une transformation affine visant une moyenne de {moyCible}/20 et un écart-type de {sigmaCible}, conformément aux usages de la profession.",
    ],
    methode_norm_affine_max: [
      "Les mesures ont subi une transformation affine ancrée sur le maximum ({maxCible}/20), avec un écart-type cible de {sigmaCible}.",
      "Une transformation affine a été appliquée, point fixe au sommet ({maxCible}/20) et dispersion cible de {sigmaCible}, afin de préserver l'ordre sans préserver les apparences.",
    ],
    methode_norm_gaussienne: [
      "Les notes ont été redistribuées selon une loi normale (moyenne {moyCible}/20, écart-type {sigmaCible}) par appariement des quantiles, hommage appuyé au prince des mathématiciens.",
      "Une normalisation gaussienne par quantiles (moyenne {moyCible}/20, écart-type {sigmaCible}) a été appliquée : la cohorte épouse désormais la cloche, qu'elle le veuille ou non.",
    ],
    res_niveau_haute: [
      "Ces valeurs placent la cohorte dans le haut de l'échelle, au grand dam des théoriciens de la courbe en cloche.",
      "Le niveau mesuré est élevé, au point que l'auteur s'interroge sur l'étalonnage du barème, qu'il se réserve le droit de durcir.",
      "La performance collective est remarquable ; l'auteur, tenu à la réserve statutaire, se bornera à la qualifier de reproductible, charge à la cohorte de le démontrer.",
    ],
    res_niveau_moyenne: [
      "Ces valeurs situent la cohorte dans la zone médiane de l'échelle, région où, d'expérience, les gisements de points sont les plus rentables.",
      "Le niveau mesuré est conforme aux attentes, ce qui, pour une expérience, est à la fois rassurant et légèrement décevant.",
      "La cohorte évolue dans une zone intermédiaire, position dont la théorie prédit qu'elle offre le meilleur rapport signal sur bruit pour les progrès à venir.",
    ],
    res_niveau_basse: [
      "Les valeurs mesurées sous-estiment vraisemblablement la grandeur vraie ; l'écart entre mesure et potentiel est un problème classique de métrologie, que la prochaine campagne devra réduire.",
      "Le niveau mesuré doit davantage aux conditions du protocole qu'aux aptitudes de la cohorte, que l'auteur a pu observer en environnement moins hostile.",
      "L'épreuve s'est révélée exigeante ; les gisements de progression identifiés ci-dessous sont donc importants, et par conséquent encourageants.",
    ],
    res_dispersion_homogene: [
      "La dispersion est faible (écart-type brut de {sigmaBrut}~pt) : la cohorte se comporte comme un corps pur, ce qui simplifie l'analyse et prive la discussion de son principal ressort dramatique.",
      "Les copies se distribuent de façon remarquablement resserrée (écart-type brut de {sigmaBrut}~pt), signe d'une cohésion que l'auteur saluera faute de pouvoir l'expliquer.",
    ],
    res_dispersion_heterogene: [
      "La dispersion est marquée (écart-type brut de {sigmaBrut}~pt) : la cohorte se comporte comme un mélange hétérogène, dont les phases gagneraient à être rapprochées.",
      "L'étendue de la distribution (écart-type brut de {sigmaBrut}~pt) suggère la coexistence de plusieurs régimes au sein de la cohorte ; le tutorat entre pairs est indiqué comme catalyseur.",
    ],
    res_contraste: [
      "La cohorte manifeste une affinité marquée pour \\og {meilleurEx}\\fg{} ({pctMeilleur} de réussite moyenne), affinité qui s'estompe sensiblement sur \\og {pireEx}\\fg{} ({pctPire}) ; ce contraste appellerait une étude dédiée, que personne ne financera.",
      "L'écart de rendement entre \\og {meilleurEx}\\fg{} ({pctMeilleur}) et \\og {pireEx}\\fg{} ({pctPire}) suggère soit une préférence thématique collective, soit une gestion du temps perfectible ; les deux écoles ont leurs partisans.",
      "On observe un pic de performance sur \\og {meilleurEx}\\fg{} ({pctMeilleur}) et un creux sur \\og {pireEx}\\fg{} ({pctPire}), configuration que la littérature interne du laboratoire désigne sous le nom de \\og relief\\fg.",
    ],
    res_homogene: [
      "Le rendement est remarquablement homogène d'un exercice à l'autre, ce qui simplifie l'analyse et prive la discussion de son principal ressort dramatique.",
      "Aucun exercice ne se détache significativement : la cohorte répartit ses moyens avec une constance que l'auteur qualifiera de méthodique, faute de terme plus prudent.",
    ],
    res_reussie: [
      "La {qReussie} détient le record de réussite ({pctReussie} des points chez les sujets l'ayant abordée), établissant un étalon que les questions voisines n'ont pas cherché à contester.",
      "Mention spéciale à la {qReussie}, réussie à {pctReussie} par ceux qui l'ont traitée : le signal est net, le bruit négligeable.",
    ],
    res_delaissee: [
      "La {qDelaissee}, abordée par {pctDelaissee} des sujets seulement, constitue une zone faiblement explorée de l'espace des réponses ; son exploration est vivement encouragée.",
      "Avec un taux de traitement de {pctDelaissee}, la {qDelaissee} demeure largement \\textit{terra incognita} ; l'auteur y voit un gisement plus qu'un échec.",
    ],
    res_piege: [
      "L'analyse révèle {nPiegesTxt} ({qPieges}) : massivement abordées, rarement réussies, ces questions exercent sur la cohorte une attraction comparable à celle d'une lampe sur les papillons de nuit.",
      "La signature caractéristique du piège (traitement élevé, réussite faible) est détectée sur {qPieges} ; un retour ciblé en séance est prescrit.",
    ],
    res_discriminante: [
      "La {qDiscri} présente le plus fort pouvoir discriminant ($r$~=~{rDiscri}) : elle sépare les copies avec une efficacité que l'auteur envie.",
      "La corrélation entre la réussite à la {qDiscri} et la note brute atteint $r$~=~{rDiscri}, ce qui en fait le meilleur prédicteur de la note, et donc la question la plus instructive à retravailler.",
    ],
    res_comp: [
      "Le profil de compétences présente un maximum en {compForte} et un minimum en {compFaible} ; l'exploitation pédagogique de cette anisotropie est laissée en exercice au lecteur.",
      "L'analyse par compétence fait apparaître un point d'appui collectif en {compForte} et une marge de progression documentée en {compFaible}.",
      "La cohorte excelle en {compForte} et peine davantage en {compFaible} ; cette asymétrie, bien connue de la littérature, n'est pas une fatalité.",
    ],
    res_comp_equilibre: [
      "Le profil de compétences est équilibré, ce qui interdit toute conclusion hâtive, et même lente.",
      "Aucune compétence ne se distingue nettement des autres ; l'auteur, privé d'anisotropie à commenter, s'incline.",
    ],
    res_strategie_ratisseurs: [
      "Le profil collectif est celui d'un ratisseur : tout aborder, quitte à laisser des points en chemin ; la stratégie est défendable, et défendue chaque année.",
      "La cohorte couvre large et engrange, au prix d'un taux de déchet que l'auteur recommande de réduire par un surcroît de rigueur.",
    ],
    res_strategie_tireurs: [
      "Le profil collectif est celui d'un tireur d'élite : peu de munitions, peu de déchets ; la cadence, en revanche, gagnerait à être discutée en séance.",
      "Ce que la cohorte entreprend, elle le réussit ; mais elle entreprend avec parcimonie, et un élargissement du front d'attaque est recommandé.",
    ],
    res_strategie_equilibre: [
      "Justesse et efficacité évoluent de concert, signe d'une stratégie équilibrée ou d'une absence de stratégie ; l'expérience ne permet pas de trancher.",
      "L'équilibre entre justesse et efficacité est notable ; l'auteur, qui cherchait un déséquilibre à commenter, en prend acte.",
    ],
    evo_prudence: [
      "La comparaison inter-campagnes suppose l'invariance de l'instrument de mesure, hypothèse que l'auteur, concepteur des deux sujets, n'est pas en mesure de garantir.",
      "On rappellera que deux sujets distincts ne sont pas deux mesures d'une même grandeur ; le lecteur est prié d'interpréter ces écarts avec la modération d'usage.",
      "Ces écarts intègrent à la fois l'évolution de la cohorte et celle de la difficulté des sujets, deux effets que le protocole ne permet pas de séparer, à la grande frustration de l'auteur.",
    ],
    evo_classement_stable: [
      "Le classement se révèle très stable d'une campagne à l'autre (corrélation de rang de Spearman $\\rho$~=~{rho} sur {nCommuns}~sujets communs) : les positions acquises tendent à se conserver, ce qui est une bonne nouvelle pour les uns et un défi pour les autres.",
      "La corrélation de rang entre les deux campagnes atteint $\\rho$~=~{rho} ({nCommuns}~sujets) : la hiérarchie observée présente une inertie remarquable, que seule une perturbation sérieuse (le travail) pourrait altérer.",
    ],
    evo_classement_modere: [
      "La corrélation de rang ($\\rho$~=~{rho}, {nCommuns}~sujets) indique une stabilité modérée du classement : les positions évoluent, sans révolution.",
      "Avec $\\rho$~=~{rho} ({nCommuns}~sujets), le classement conserve sa structure générale tout en admettant des réarrangements locaux, preuve que rien n'est jamais figé.",
    ],
    evo_classement_brassage: [
      "La corrélation de rang est faible ($\\rho$~=~{rho}, {nCommuns}~sujets) : le classement a été profondément brassé, démontrant que la hiérarchie d'un DS ne préjuge en rien de celle du suivant.",
      "Un brassage significatif du classement est observé ($\\rho$~=~{rho} sur {nCommuns}~sujets), résultat qui devrait encourager quiconque se croyait assigné à résidence.",
    ],
    evo_entrants: [
      "Font leur entrée dans la liste des co-auteurs honoraires : {entrants}, que la rédaction félicite chaleureusement.",
      "La rédaction salue l'arrivée de {entrants} parmi les co-auteurs honoraires, promotion obtenue sans piston ni pot-de-vin, à la connaissance de l'auteur.",
      "Nouveaux signataires de ce numéro : {entrants}. Leur contribution a été jugée décisive par un comité composé de l'auteur.",
    ],
    disc_hausse: [
      "L'ensemble des indicateurs dessine une dynamique favorable, que l'auteur attribue, par modestie, à la cohorte plutôt qu'à son enseignement ; il se réserve néanmoins le droit de changer d'avis.",
      "La progression observée plaide pour la poursuite du programme expérimental à effectifs constants et motivation croissante.",
    ],
    disc_stable: [
      "Le système étudié présente une stabilité remarquable ; l'auteur y voit la preuve d'un régime établi, que seul un apport d'énergie supplémentaire (le travail personnel) permettra de déplacer.",
      "En l'absence de variation significative, la discussion se concentre sur les gisements identifiés en {secRes}, qui constituent les leviers les plus accessibles.",
    ],
    disc_baisse: [
      "Le recul mesuré ne saurait être interprété sans tenir compte de la difficulté propre au sujet ; les meilleurs systèmes connaissent des fluctuations, et la prochaine campagne offrira une occasion de rebond.",
      "Les indicateurs sont en retrait par rapport à la campagne précédente ; la littérature enseigne que ce type de fluctuation précède souvent un redressement, pourvu que les causes identifiées en {secRes} soient traitées.",
    ],
    disc_neutre: [
      "La discussion se concentre sur les leviers de progression identifiés en {secRes}, qui constituent les gisements de points les plus accessibles pour la prochaine campagne.",
      "Au-delà des valeurs moyennes, ce sont les questions délaissées et les pièges mis en évidence en {secRes} qui offrent les marges de progression les plus immédiates.",
    ],
    disc_premiere: [
      "Faute de point de comparaison, la discussion se limite à l'identification des leviers de progression mis en évidence en {secRes} ; les campagnes suivantes diront s'ils ont été actionnés.",
      "Cette première campagne établit une ligne de base ; tout écart futur lui sera désormais rapporté, pour le meilleur et pour le reste.",
    ],
    limites: [
      "L'auteur correspondant est simultanément concepteur du sujet, correcteur et relecteur unique ; un biais ne saurait être exclu.",
      "Aucun groupe témoin n'a pu être constitué, la direction ayant refusé qu'une partie de la classe soit dispensée de DS.",
      "Les conditions expérimentales (table, stylo, stress, heure du déjeuner) n'ont pas été contrôlées.",
      "La cohorte n'a pas été tirée au sort, mais constituée par une procédure d'admission dont l'auteur décline toute responsabilité.",
      "La durée de l'épreuve n'a pas été optimisée pour minimiser la fatigue cognitive des sujets, ni celle du correcteur.",
      "Les sujets n'ont pas eu accès au protocole expérimental avant l'épreuve, contrairement aux usages en vigueur dans certaines revues.",
      "L'effet du café sur la sévérité du correcteur n'a pas été quantifié, faute de volontaires pour la condition sans café.",
    ],
    conclusion: [
      "Ces résultats appellent des travaux futurs, au premier rang desquels une réplication lors du prochain DS.",
      "L'auteur encourage la cohorte à poursuivre ses efforts dans la direction indiquée par la {secRes}.",
      "Une amélioration des performances est envisageable sous réserve de travail, hypothèse qui reste à tester expérimentalement.",
      "Ces conclusions sont provisoires dans l'attente de la prochaine campagne de mesures, dont la date ne sera communiquée qu'au dernier moment, par souci d'équité expérimentale.",
      "L'ensemble des données plaide pour la poursuite du programme expérimental, à effectifs constants et motivation croissante.",
      "La reproductibilité de ces observations sera mise à l'épreuve lors de la prochaine campagne ; les paris sont ouverts.",
    ],
    remerciements_divers: [
      "la machine à café du laboratoire pour son soutien indéfectible.",
      "les relecteurs anonymes, qui n'existent pas.",
      "l'établissement, pour la fourniture du papier de brouillon.",
      "le comité éditorial de la revue, dont la mansuétude est légendaire.",
      "l'inventeur du café soluble, sans qui cette correction n'aurait pas abouti.",
      "le stylo rouge, dont l'encre ne s'est pas tarie malgré les sollicitations.",
    ],
    credit_coauteurs: [
      "Les co-auteurs honoraires ont contribué à l'acquisition des données situées à l'extrémité droite de la distribution.",
      "Les co-auteurs honoraires ont assuré la validation expérimentale du barème, en démontrant qu'il était possible d'y obtenir des points.",
      "Les co-auteurs honoraires ont fourni les mesures les plus élevées de la campagne, contribution jugée décisive par le comité éditorial.",
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
      "Les travaux ont été financés sur fonds propres, principalement en café.",
    ],
    donnees: [
      "Les données brutes sont disponibles sur demande motivée auprès de l'auteur, qui déclinera poliment.",
      "Les copies originales sont archivées en lieu sûr, conformément au règlement général sur la protection des données.",
      "Les données individuelles ont été restituées à leurs propriétaires respectifs, seuls habilités à les commenter.",
    ],
    relecteur2: [
      "Le relecteur n\\textsuperscript{o}~2 estime que la moyenne aurait pu être plus élevée et suggère de refaire l'expérience avec une autre cohorte ; sa suggestion a été écartée.",
      "Le relecteur n\\textsuperscript{o}~2 regrette l'absence de groupe témoin et d'intervalle de confiance ; l'auteur lui transmet ses amitiés.",
      "Le relecteur n\\textsuperscript{o}~2 demande que l'article soit réduit de moitié et la moyenne augmentée d'autant ; seule la première requête a été jugée recevable, et rejetée.",
      "Le relecteur n\\textsuperscript{o}~2 conteste la pertinence du barème, de la normalisation et de la ponctuation ; ses remarques ont été versées au dossier.",
    ],
    erratum: [
      "Une version antérieure de cet article comportait des formulations jugées trop aimables par le comité éditorial ; elles ont été remplacées.",
      "Le présent article remplace une version antérieure, retirée à la demande de l'auteur pour des raisons stylistiques (tirage n\\textsuperscript{o}~{tirage}).",
      "Suite à une erreur de mise en page, une version préliminaire de cet article a circulé ; l'auteur prie ses lecteurs de l'oublier.",
    ],
    refs_fixes: [
      "S.~\\textsc{Correcteur}, \\textit{Le cours}, polycopié, non publié.",
      "S.~\\textsc{Correcteur}, \\textit{Les exercices du TD}, résultats non publiés, non traités.",
      "N.~\\textsc{Bourbaki}, \\textit{Éléments de mathématique}, Hermann (1939--). Cité par déférence.",
      "C.~F.~\\textsc{Gauss}, \\textit{Theoria motus corporum coelestium} (1809). Cité pour la courbe en cloche, dont il décline toute responsabilité.",
      "Anonyme, \\textit{Circulaire relative aux devoirs surveillés}, référence introuvable.",
    ],
  };
}

// ─── Gabarit papier (article de recherche, deux colonnes) ────────

export function genererGabaritPapier(nomDS, dateDS, etab, theme) {
  var e = etab || ETABLISSEMENT;
  var piedPage = [e.nom, e.classe, e.matricule].filter(Boolean).map(escapeTex).join(" - ");
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
\\definecolor{reussiteHaute}{HTML}{2A7A3A}
\\definecolor{reussiteMoyenne}{HTML}{C07A10}
\\definecolor{reussiteBasse}{HTML}{B03A2E}
${defCompColorsTex()}
\\usepackage{tikz}
\\usetikzlibrary{babel}
\\usepackage{pgfplots}\\pgfplotsset{compat=newest}
\\usepgfplotslibrary{polar,statistics}
\\usepackage{tcolorbox}\\tcbuselibrary{skins,breakable}
\\usepackage{tabularray}\\UseTblrLibrary{booktabs}
\\DefTblrTemplate{contfoot-text}{default}{Suite page suivante}
\\DefTblrTemplate{conthead-text}{default}{(suite)}
\\usepackage{fancyhdr}
\\usepackage[colorlinks=true,urlcolor=accent!70!black,linkcolor=accent!70!black,citecolor=accent!70!black]{hyperref}
\\usepackage{subcaption}
\\usepackage{float}
\\raggedbottom

\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{${escapeTex(nomDS || "")}${dateDS ? " du " + escapeTex(dateDS) : ""}}
\\lfoot{${piedPage}}
\\cfoot{\\thepage}
\\renewcommand{\\headrulewidth}{0.6pt}
\\renewcommand{\\footrulewidth}{0.6pt}
\\setlength{\\headheight}{15pt}
\\renewcommand{\\arraystretch}{1.15}

\\begin{document}
`;
}

// ─── Article de classe (un document pour toute la classe) ────────

function _signe(d, precision) {
  var p = precision === undefined ? 1 : precision;
  return (d >= 0 ? "+" : "$-$") + num(Math.abs(d), p);
}

// Nom court (« DS 05 ») rendu insécable pour éviter « DS / 05 » en fin de ligne
function _insecable(txt) {
  return txt.length <= 14 ? txt.replace(/ /g, "~") : txt;
}

// « 1~exercice », « 3~exercices »
function _pluriel(n, singulier, pluriel) {
  return n + "~" + (n > 1 ? pluriel : singulier);
}

// Liste à la française : « A », « A et B », « A, B et C »
function _listeFr(arr) {
  if (arr.length <= 1) return arr.join("");
  return arr.slice(0, -1).join(", ") + " et " + arr[arr.length - 1];
}

function _nomAuteur(s) {
  var p = (s.prenom || "").trim(), n = (s.nom || "").trim();
  if (!p && !n) return "co-auteur non identifié";
  if (!n) return escapeTex(p);
  return (p ? escapeTex(p) + "~" : "") + "\\textsc{" + escapeTex(n) + "}";
}

// Titre et revue d'un DS de la série : même rotation que dans son propre
// article, ce qui permet de citer exactement l'article du DS précédent.
function _enteteArticle(ctx, banques, vars) {
  return {
    titre: _tpl(_rot(ctx, banques, "titre"), vars),
    revue: _rot(ctx, banques, "revue"),
    type: _rot(ctx, banques, "type"),
  };
}

/**
 * Article pseudo-scientifique de classe pour un DS : document LaTeX complet
 * (gabarit papier deux colonnes), compilable avec xelatex (deux passes).
 * Aucune note ni aucun rang individuel ; seuls les co-auteurs honoraires
 * (rang ≤ 5, ex-aequo inclus) sont nommés, par ordre alphabétique.
 * absents : store complet { examId__studentId } ; allRemarques : toutes les
 * remarques (fixes + personnalisées), comme pour le calcul des notes.
 */
export function genererArticleClasse({
  exams, examId, students, grades, absents, groupes, remarks, malusManuel, allRemarques,
  etablissement, nomDS, dateDS, commentaire, config, articleTextes, theme,
}) {
  var exam = (exams || []).find(function(x) { return x.id === examId; });
  if (!exam) return "";
  var cfg = Object.assign({ commentaire: true, parCompetence: true, parExercice: true, coauteurs: true, evolution: true, annexe: false, tirages: {} }, config || {});
  var e = etablissement || ETABLISSEMENT;
  var ft = Object.assign({}, DEFAULT_FEATURES, exam.features || {});
  var B = _mergeBanques(_banquesArticleDefaut(), articleTextes);
  var S = ARTICLE_SEUILS;

  var base = { students: students, grades: grades, absents: absents, groupes: groupes, remarks: remarks, malusManuel: malusManuel, allRemarques: allRemarques };
  var cur = statsDS(Object.assign({ exam: exam }, base));
  var nomCur = (nomDS !== undefined && nomDS !== null && nomDS !== "") ? nomDS : cur.nomDS;
  var dateCur = (dateDS !== undefined && dateDS !== null && dateDS !== "") ? dateDS : cur.dateDS;
  var doc = genererGabaritPapier(nomCur, dateCur, e, theme);
  if (!cur.nCorriges) {
    return doc + "Aucune copie corrigée pour ce DS : l'article attendra des données.\n\\end{document}\n";
  }

  // La série (DS antérieurs corrigés) fixe toujours le numéro, la rotation
  // des textes et la référence au numéro précédent ; les comparaisons
  // (prev, evo) n'existent que si l'étude longitudinale est cochée.
  var serie = serieDS(Object.assign({ exams: exams, examId: examId }, base));
  var precedent = serie.length ? serie[serie.length - 1] : null;
  var prev = cfg.evolution ? precedent : null;
  var evo = prev ? evolution(prev, cur) : null;
  var tirages = cfg.tirages || {};
  var graine = (exams[0] && exams[0].id) || examId;
  var ctx = { graine: graine, pas: serie.length, tirage: tirages[examId] || 0 };

  // ── Observations qui pilotent le ton ──
  var niveau = cur.brut.moy >= S.niveauHaut ? "haute" : (cur.brut.moy < S.niveauBas ? "basse" : "moyenne");
  var dispersion = cur.brut.sigma < S.sigmaHomogene ? "homogene" : (cur.brut.sigma > S.sigmaHeterogene ? "heterogene" : null);
  var tendance = evo ? (evo.dMoyBrut > S.tendance ? "hausse" : (evo.dMoyBrut < -S.tendance ? "baisse" : "stable")) : null;
  var stabilite = evo && evo.rho !== null
    ? (evo.rho >= S.rhoStable ? "stable" : (evo.rho < S.rhoBrassage ? "brassage" : "modere")) : null;
  var ecartStrat = cur.justesse - cur.efficacite;
  var strategie = ecartStrat > S.strategie ? "tireurs" : (ecartStrat < -S.strategie ? "ratisseurs" : "equilibre");

  var exIndex = {};
  exam.exercises.forEach(function(ex, i) { exIndex[ex.id] = i + 1; });
  function qRef(q) { return "question~" + escapeTex(q.label) + " de l'exercice~" + exIndex[q.exId]; }

  var exOk = cur.exercices.filter(function(x) { return x.max > 0 && x.moyPct !== null; });
  var exTries = exOk.slice().sort(function(a, b) { return b.moyPct - a.moyPct; });
  var meilleur = exTries[0], pire = exTries[exTries.length - 1];
  var contraste = exTries.length >= 2 ? (meilleur.moyPct - pire.moyPct >= S.contraste ? "fort" : "homogene") : null;

  var qOk = cur.questions.filter(function(q) { return q.max > 0 && !q.bonus; });
  var qReussie = qOk.filter(function(q) { return q.tauxTraitement >= 0.3 && q.tauxReussite !== null; })
    .sort(function(a, b) { return b.tauxReussite - a.tauxReussite; })[0] || null;
  var qDelaissee = qOk.filter(function(q) { return q.delaissee; })
    .sort(function(a, b) { return a.tauxTraitement - b.tauxTraitement; })[0] || null;
  var qPieges = ft.questionPiege ? qOk.filter(function(q) { return q.piege; }) : [];
  var qDiscri = qOk.filter(function(q) { return q.discrimination !== null && q.tauxTraitement >= 0.2 && q.discrimination >= 0.3; })
    .sort(function(a, b) { return b.discrimination - a.discrimination; })[0] || null;

  var afficherComp = ft.competences && cfg.parCompetence;
  var compsEval = COMPETENCES.filter(function(c) { return cur.comp[c.id] !== null; });
  var compsTriees = compsEval.slice().sort(function(a, b) { return cur.comp[b.id] - cur.comp[a.id]; });
  var compForte = null, compFaible = null;
  if (compsTriees.length >= 2 && cur.comp[compsTriees[0].id] - cur.comp[compsTriees[compsTriees.length - 1].id] >= S.compContraste) {
    compForte = compsTriees[0]; compFaible = compsTriees[compsTriees.length - 1];
  }
  var ftPrev = prev ? Object.assign({}, DEFAULT_FEATURES, (exams.find(function(x) { return x.id === prev.examId; }) || {}).features || {}) : null;
  var compPrecDispo = !!(prev && ftPrev && ftPrev.competences);

  var afficherCo = cfg.coauteurs && cur.nCorriges >= S.coauteursMin && cur.coauteurs.length > 0;
  var coPrecAffiches = !!(prev && prev.nCorriges >= S.coauteursMin);
  var nomsCo = cur.coauteurs.map(_nomAuteur);

  var normMethod = cur.settings.normMethod || "none";
  var np = cur.settings.normParams || {};
  var nQuestions = exam.exercises.reduce(function(s, ex) { return s + ex.questions.length; }, 0);
  var nItems = exam.exercises.reduce(function(s, ex) { return s + ex.questions.reduce(function(sq, q) { return sq + (q.items || []).length; }, 0); }, 0);
  var classe = escapeTex(e.classe || "") || "la classe";

  var vars = {
    classe: classe,
    ds: _insecable(escapeTex(nomCur || "DS")),
    n: String(cur.nCorriges),
    nEx: String(exam.exercises.length),
    nExTxt: _pluriel(exam.exercises.length, "exercice", "exercices"),
    nQ: String(nQuestions),
    rangDS: String(serie.length + 1),
    moyenne: num(cur.norm.moy), mediane: num(cur.norm.med), sigma: num(cur.norm.sigma),
    moyBrute: num(cur.brut.moy), sigmaBrut: num(cur.brut.sigma),
    partSup10: pct(cur.norm.partSup10),
    dsPrec: precedent ? _insecable(escapeTex(precedent.nomDS || "DS précédent")) : "",
    refPrec: precedent ? "\\cite{refprec}" : "",
    nPrec: String(serie.length),
    nPrecTxt: _pluriel(serie.length, "campagne préliminaire", "campagnes préliminaires"),
    delta: evo ? _signe(evo.dMoyBrut) : "",
    deltaAbs: evo ? num(Math.abs(evo.dMoyBrut)) : "",
    moyCible: num(np.moyenneCible || 0), maxCible: num(np.maxCible || 20), sigmaCible: num(np.sigmaCible || 0),
    nAbsents: String(cur.nAbsents),
    nAbsentsTxt: _pluriel(cur.nAbsents, "sujet", "sujets"),
    attrition: pct(cur.nInscrits ? cur.nAbsents / cur.nInscrits : 0),
    meilleurEx: meilleur ? escapeTex(meilleur.title) : "", pctMeilleur: meilleur ? pct(meilleur.moyPct) : "",
    pireEx: pire ? escapeTex(pire.title) : "", pctPire: pire ? pct(pire.moyPct) : "",
    qReussie: qReussie ? qRef(qReussie) : "", pctReussie: qReussie ? pct(qReussie.tauxReussite) : "",
    qDelaissee: qDelaissee ? qRef(qDelaissee) : "", pctDelaissee: qDelaissee ? pct(qDelaissee.tauxTraitement) : "",
    qPieges: _listeFr(qPieges.map(qRef)), nPieges: String(qPieges.length),
    nPiegesTxt: _pluriel(qPieges.length, "question piège", "questions pièges"),
    qDiscri: qDiscri ? qRef(qDiscri) : "", rDiscri: qDiscri ? num(qDiscri.discrimination, 2) : "",
    compForte: compForte ? escapeTex(compForte.label) : "", compFaible: compFaible ? escapeTex(compFaible.label) : "",
    just: pct(cur.justesse), effi: pct(cur.efficacite),
    rho: evo && evo.rho !== null ? num(evo.rho, 2) : "", nCommuns: evo ? String(evo.nCommuns) : "",
    entrants: evo ? _listeFr(evo.entrants.map(_nomAuteur)) : "",
    secRes: "section~\\ref{sec:resultats}",
    tirage: String(ctx.tirage),
  };
  var T = function(s) { return _tpl(s, vars); };
  var R = function(cle) { return T(_rot(ctx, B, cle)); };
  var RN = function(cle, n) { return _rotN(ctx, B, cle, n).map(T); };

  var entete = _enteteArticle(ctx, B, vars);
  var dateTxt = dateCur ? escapeTex(dateCur) : "le jour de l'épreuve";
  var etabLigne = escapeTex([e.nom, e.classe].filter(Boolean).join(", "));
  var tex = "";

  // ── En-têtes de page ──
  tex += `\\lhead{\\small\\sffamily ${classe} \\textperiodcentered\\ ${vars.ds}}\n`;
  tex += `\\rhead{\\small\\sffamily\\itshape ${escapeTex(entete.revue)}}\n`;

  // ── Figure 1 : panneaux de la vue d'ensemble ──
  var panneaux = [];
  var notesFinales = cur.ids.map(function(id) { return cur.notes[id].norm; });
  panneaux.push({ tex: _histoClasseTex(notesFinales, cur.norm.moy, cur.norm.med), leg: "Distribution des notes" });
  var legendes = ["(a) distribution des notes /20 (trait plein : moyenne ; pointillés : médiane)"];
  if (afficherComp && compsEval.length) {
    panneaux.push({ tex: _radarCompetencesTex(cur.comp, compPrecDispo ? prev.comp : null), leg: "Par compétence" });
    legendes.push("(" + "abc"[panneaux.length - 1] + ") taux de réussite par compétence" + (compPrecDispo ? " (pointillés gris : " + vars.dsPrec + ")" : ""));
  }
  if (prev) {
    panneaux.push({ tex: _boitesSerieTex(serie.concat([cur]), nomCur), leg: "Campagnes successives" });
    legendes.push("(" + "abc"[panneaux.length - 1] + ") notes brutes par campagne (boîtes : quartiles ; moustaches : 10\\textsuperscript{e} et 90\\textsuperscript{e} centiles ; losanges : moyennes)");
  }
  var largeur = panneaux.length === 3 ? "0.31" : (panneaux.length === 2 ? "0.46" : "0.6");

  // ── Bloc titre pleine largeur ──
  tex += `\\twocolumn[{%\n`;
  tex += `  \\centering\n`;
  tex += `  {\\footnotesize\\sffamily\\color{accent!75!black}\\textsc{${escapeTex(entete.revue)}} \\textperiodcentered\\ ${escapeTex(entete.type)} \\textperiodcentered\\ Vol.~${escapeTex(e.anneeScolaire || "1")}, n\\textsuperscript{o}~${serie.length + 1} \\textperiodcentered\\ {\\NoAutoSpacing doi:10.0000/check.${_graine(examId + "#" + ctx.tirage) % 100000}}\\par}\n`;
  tex += `  \\vspace{1mm}\\rule{\\textwidth}{0.4pt}\\par\\medskip\n`;
  tex += `  {\\fontsize{15}{18}\\selectfont\\bfseries ${entete.titre}\\par}\n`;
  tex += `  \\medskip\n`;
  tex += `  {\\small S.~\\textsc{Correcteur}\\textsuperscript{1,$\\ast$}\\par}\n`;
  if (afficherCo) {
    tex += `  {\\footnotesize\\itshape avec la participation remarquée de\\par}\n`;
    tex += `  {\\small ${nomsCo.map(function(x) { return x + "\\textsuperscript{2}"; }).join(", ")}\\par}\n`;
  }
  tex += `  \\smallskip\n`;
  tex += `  {\\footnotesize\\itshape \\textsuperscript{1}${etabLigne}${afficherCo ? `\\quad \\textsuperscript{2}Cohorte ${classe}, co-auteurs honoraires (ordre alphabétique)` : ""}\\par}\n`;
  tex += `  {\\scriptsize Reçu~: ${dateTxt} \\textperiodcentered\\ Accepté~: ${dateTxt} (procédure accélérée) \\textperiodcentered\\ Publié~: le soir même\\par}\n`;
  tex += `  {\\scriptsize \\textsuperscript{$\\ast$}Auteur correspondant~: ${escapeTex(e.matricule || e.nom || "")}\\par}\n`;
  tex += `  \\smallskip\n`;
  tex += `  \\rule{0.85\\linewidth}{0.4pt}\\par\\smallskip\n`;

  // Résumé : ouverture + protocole + résultat + évolution + verdict
  var resume = [R("ouverture"), R("resume_protocole"), R("resume_resultat")];
  if (evo) resume.push(R("resume_evolution_" + tendance));
  resume.push("Ces résultats sont " + R("verdict") + ".");
  var mots = ["docimologie", "étude de cohorte"];
  if (prev) mots.push("étude longitudinale");
  exam.exercises.forEach(function(ex) {
    var w = (ex.title || "").replace(/^\s*exercice\s*\d*\s*[:.\-–—]?\s*/i, "").trim().split(/\s+/).slice(0, 3).join(" ");
    if (w) mots.push(w);
  });
  if (afficherComp) compsEval.forEach(function(c) { mots.push(c.label); });
  mots = mots.filter(function(m, i) { return mots.indexOf(m) === i; }).slice(0, 6);

  tex += `  \\begin{minipage}{0.85\\linewidth}\n`;
  tex += `    \\small\\textbf{Résumé.}\\ \\itshape ${resume.join(" ")}\\par\n`;
  tex += `    \\smallskip\n`;
  tex += `    \\upshape\\textbf{Mots-clés~:}\\ ${mots.map(escapeTex).join(" ; ")}\n`;
  tex += `  \\end{minipage}\\par\\medskip\n`;
  // Figure d'ensemble non flottante dans le bloc titre (placement garanti)
  tex += `  \\begin{minipage}{\\textwidth}\n`;
  panneaux.forEach(function(p, i) {
    tex += `  \\begin{minipage}[b]{${largeur}\\textwidth}\\centering\n${p.tex}\\\\[1mm]{\\footnotesize (${"abc"[i]}) ${p.leg}}\\end{minipage}`;
    tex += i < panneaux.length - 1 ? `\\hfill\n` : `\n`;
  });
  tex += `  \\par\\smallskip\n`;
  tex += `  \\captionof{figure}{Vue d'ensemble de la campagne : ${legendes.join(" ; ")}.}\n`;
  tex += `  \\label{fig:ensemble}\n`;
  tex += `  \\end{minipage}\\par\\medskip\n`;
  tex += `}]\n`;

  // ── Points clés ──
  var points = [];
  points.push(`Moyenne de cohorte~: ${vars.moyenne}/20 (médiane ${vars.mediane}/20)` +
    (evo ? `, soit ${vars.delta}~pt de moyenne brute depuis le ${vars.dsPrec}.` : "."));
  if (contraste) points.push(`Exercice le mieux réussi~: \\og ${vars.meilleurEx}\\fg{} (${vars.pctMeilleur}).`);
  if (cfg.parExercice) {
    if (qPieges.length) points.push(`${vars.nPiegesTxt[0].toUpperCase() + vars.nPiegesTxt.slice(1)}~: ${vars.qPieges}.`);
    else if (qDelaissee) points.push(`Question la plus délaissée~: ${vars.qDelaissee} (${vars.pctDelaissee} de traitement).`);
  }
  if (afficherComp && compForte) points.push(`Compétence la plus solide~: ${vars.compForte}~; la plus fragile~: ${vars.compFaible}.`);
  if (evo && evo.rho !== null) points.push(`Stabilité du classement~: $\\rho$~=~${vars.rho}.`);
  tex += `\\begin{tcolorbox}[colback=accent!4, colframe=accent!70!black, boxrule=0.5pt, arc=2pt, left=3pt, right=3pt, top=2pt, bottom=2pt,\n`;
  tex += `  title={Points clés}, fonttitle=\\bfseries\\sffamily\\small, coltitle=white, colbacktitle=accent!75!black]\n`;
  tex += `\\small\\begin{itemize}\\setlength{\\itemsep}{1pt}\\setlength{\\parskip}{0pt}\n`;
  points.slice(0, 4).forEach(function(p) { tex += `\\item ${p}\n`; });
  tex += `\\end{itemize}\n\\end{tcolorbox}\n\n`;

  // ── Note de l'éditeur (commentaire du DS) ──
  var com = (commentaire || "").trim();
  if (cfg.commentaire && com) {
    tex += `\\begin{tcolorbox}[colback=black!3, colframe=black!35, boxrule=0.4pt, arc=2pt, left=3pt, right=3pt, top=2pt, bottom=2pt,\n`;
    tex += `  title={Note de l'éditeur}, fonttitle=\\bfseries\\sffamily\\small, coltitle=black, colbacktitle=black!10]\n`;
    tex += `\\small\\itshape ${escapeTex(com).split(/\n+/).join("\\par ")}\n`;
    tex += `\\end{tcolorbox}\n\n`;
  }

  // ── 1. Introduction ──
  tex += `\\section{Introduction}\n${RN("intro", 2).join(" ")} ${R(precedent ? "intro_serie" : "intro_premiere")}\n\n`;

  // ── 2. Matériel et méthodes ──
  tex += `\\section{Matériel et méthodes}\n`;
  var pop = `\\paragraph{Population.} La population étudiée compte ${cur.nInscrits}~sujets inscrits, dont ${cur.nPresents}~présents le jour de l'épreuve ; ${cur.nCorriges}~copies ont été analysées`;
  pop += cur.nCorriges < cur.nPresents ? ` (les copies non encore corrigées sont exclues de l'analyse). ` : `. `;
  pop += cur.nAbsents > 0 ? R("methode_attrition") : R("methode_complet");
  tex += pop + `\n\n`;
  var coeffs = exam.exercises.some(function(ex) { return ex.coeff !== undefined && ex.coeff !== 1; });
  var bonus = exam.exercises.some(function(ex) { return ex.questions.some(function(q) { return q.bonus; }); });
  var proto = `\\paragraph{Protocole.} L'épreuve comporte ${vars.nExTxt}, ${_pluriel(nQuestions, "question", "questions")} et ${_pluriel(nItems, "item", "items")}, pour un barème total de ${num(examTotalWeighted(exam))}~points`;
  proto += coeffs ? ` après pondération des exercices par des coefficients.` : `.`;
  if (bonus) proto += ` Des questions bonus, hors barème, permettent aux sujets les plus audacieux de dépasser le maximum théorique.`;
  tex += `${proto} ${R("methode")}\n\n`;
  var trait = `\\paragraph{Traitement des données.} ${R("methode_norm_" + (B["methode_norm_" + normMethod] ? normMethod : "none"))}`;
  if (ft.malusAuto && (cur.settings.malusPaliers || []).length) {
    trait += ` Les manquements à la présentation sont sanctionnés par un malus appliqué ${cur.settings.malusMode === "avant" ? "avant" : "après"} la normalisation, conformément au règlement intérieur de la revue.`;
  }
  trait += ` Une question est dite \\textit{délaissée} lorsqu'elle est traitée par moins de ${pct(cur.settings.seuilDifficile / 100)} des sujets`;
  trait += ft.questionPiege
    ? `, et \\textit{piège} lorsqu'elle est traitée par au moins la moitié d'entre eux mais réussie à moins de ${pct(cur.settings.seuilPiege / 100)}.`
    : `.`;
  tex += trait + `\n\n`;

  // ── 3. Résultats ──
  tex += `\\section{Résultats}\\label{sec:resultats}\n`;
  tex += `\\subsection{Distribution des notes}\n`;
  var dist = `La moyenne de cohorte s'établit à ${vars.moyenne}/20 (médiane ${vars.mediane}/20, écart-type ${vars.sigma}~pt, quartiles ${num(cur.norm.q1)} et ${num(cur.norm.q3)}) ; ${vars.partSup10} des copies atteignent ou dépassent 10/20 (figure~\\ref{fig:ensemble}a).`;
  if (normMethod !== "none") dist += ` Avant normalisation, la moyenne brute était de ${vars.moyBrute}/20.`;
  dist += ` ${R("res_niveau_" + niveau)}`;
  if (dispersion) dist += ` ${R("res_dispersion_" + dispersion)}`;
  tex += dist + `\n\n`;

  if (cfg.parExercice) {
    tex += `\\subsection{Analyse par exercice}\n`;
    tex += `Le tableau~\\ref{tab:exercices} résume les indicateurs par exercice et la figure~\\ref{fig:questions} en détaille la réussite question par question.`;
    if (contraste === "fort") tex += ` ${R("res_contraste")}`;
    else if (contraste === "homogene") tex += ` ${R("res_homogene")}`;
    tex += `\n\n`;
    tex += `\\begin{table}[H]\n\\centering\n\\caption{Indicateurs par exercice (moyenne : part du barème obtenue ; traitement : part des copies ayant abordé l'exercice).}\\label{tab:exercices}\n`;
    tex += `\\begin{tblr}{colspec={X[l]Q[c]Q[c]Q[c]}, width=\\linewidth, rows={font=\\footnotesize}, row{1}={font=\\bfseries\\footnotesize},\n`;
    tex += `  row{even}={bg=black!3}, rowsep=1.5pt, hline{1,2,Z}={0.4pt,black!40}}\n`;
    tex += `Exercice & Barème & Moyenne & Traitement \\\\\n`;
    cur.exercices.forEach(function(x) {
      var bareme = num(x.max) + (x.coeff !== 1 ? `\\,($\\times$${num(x.coeff, 1)})` : "");
      tex += `${escapeTex(x.title)} & ${bareme} & ${x.moyPct !== null ? pct(x.moyPct) : "--"} & ${pct(x.tauxTraitement)} \\\\\n`;
    });
    tex += `\\end{tblr}\n\\end{table}\n\n`;

    tex += `\\subsection{Questions remarquables}\n`;
    var remarquables = [];
    if (qReussie) remarquables.push(R("res_reussie"));
    if (qDelaissee) remarquables.push(R("res_delaissee"));
    if (qPieges.length) remarquables.push(R("res_piege"));
    if (qDiscri) remarquables.push(R("res_discriminante"));
    tex += (remarquables.length ? remarquables.join(" ") : "Aucune question ne se distingue suffisamment pour mériter une mention, ce qui constitue en soi une forme de distinction.") + `\n\n`;

    // Figure 2 : réussite par question, un panneau par exercice
    var parEx = exam.exercises.map(function(ex) {
      return { title: ex.title || "", qs: cur.questions.filter(function(q) { return q.exId === ex.id; }) };
    }).filter(function(x) { return x.qs.length > 0; });
    if (parEx.length) {
      tex += `\\begin{figure*}[!tp]\n\\centering\n`;
      parEx.forEach(function(x, i) {
        tex += `\\begin{subfigure}[t]{0.48\\textwidth}\\centering\n${_barresQuestionsTex(x.qs, ft)}\\caption{${escapeTex(x.title)}}\n\\end{subfigure}`;
        tex += i === parEx.length - 1 ? `\n` : (i % 2 === 1 ? `\\\\[3mm]\n` : `\\hfill\n`);
      });
      tex += `\\caption{Réussite par question. Barres : part des points obtenus par les sujets ayant abordé la question ; losanges : taux de traitement. $\\bullet$~question délaissée${ft.questionPiege ? " ; $\\triangle$~question piège" : ""} ; $\\dagger$~question bonus.}\\label{fig:questions}\n`;
      tex += `\\end{figure*}\n\n`;
    }
  }

  if (afficherComp && compsEval.length) {
    tex += `\\subsection{Profil de compétences}\n`;
    tex += `Les taux de réussite par compétence (figure~\\ref{fig:ensemble}b) s'établissent comme suit~: ${_listeFr(compsEval.map(function(c) { return escapeTex(c.label) + " " + pct(cur.comp[c.id]); }))}. `;
    tex += (compForte ? R("res_comp") : R("res_comp_equilibre")) + `\n\n`;
  }

  tex += `\\subsection{Stratégies de composition}\n`;
  tex += `La figure~\\ref{fig:phase} représente chaque copie dans le plan efficacité--justesse~: l'efficacité mesure la part du barème abordée, la justesse la part des points obtenus sur ce qui a été abordé. En moyenne, la cohorte aborde ${vars.effi} du sujet avec une justesse de ${vars.just}. ${R("res_strategie_" + strategie)}\n\n`;
  tex += `\\begin{figure}[H]\n\\centering\n${_phaseTex(cur.strategies, cur.justesse, cur.efficacite)}`;
  tex += `\\caption{Diagramme de phase justesse--efficacité~: un point par copie, anonyme ; pointillés~: moyennes de la cohorte.}\\label{fig:phase}\n\\end{figure}\n\n`;

  // ── 4. Étude longitudinale ──
  if (prev) {
    tex += `\\section{Étude longitudinale}\n`;
    var longi = `Le tableau~\\ref{tab:serie} rassemble les indicateurs des ${serie.length + 1}~campagnes disponibles ; la figure~\\ref{fig:ensemble}${"abc"[panneaux.length - 1]} en donne une représentation graphique. `;
    longi += `Entre le ${vars.dsPrec} et le ${vars.ds}, la moyenne brute passe de ${num(prev.brut.moy)} à ${vars.moyBrute}/20 (${vars.delta}~pt) et la couverture moyenne du sujet de ${pct(prev.efficacite)} à ${vars.effi}.`;
    if (normMethod !== "none" || (prev.settings.normMethod || "none") !== "none") {
      longi += ` En notes normalisées, l'écart est de ${_signe(evo.dMoyNorm)}~pt.`;
    }
    longi += ` ${R("evo_prudence")}`;
    if (afficherComp && compPrecDispo) {
      var dComps = COMPETENCES.filter(function(c) { return evo.dComp[c.id] !== null; })
        .sort(function(a, b) { return Math.abs(evo.dComp[b.id]) - Math.abs(evo.dComp[a.id]); });
      if (dComps.length && Math.abs(evo.dComp[dComps[0].id]) >= 0.05) {
        longi += ` Côté compétences, l'évolution la plus marquée concerne ${escapeTex(dComps[0].label)} (${_signe(evo.dComp[dComps[0].id] * 100, 0)}~points de pourcentage).`;
      }
    }
    tex += longi + `\n\n`;
    if (stabilite) tex += `${R("evo_classement_" + stabilite)}\n\n`;
    if (afficherCo && coPrecAffiches) {
      tex += `${evo.retenus}~des ${evo.nCoauteursPrec}~co-auteurs honoraires du numéro précédent conservent leur signature.`;
      if (evo.entrants.length) tex += ` ${R("evo_entrants")}`;
      tex += `\n\n`;
    }
    tex += `\\begin{table}[H]\n\\centering\n\\caption{Indicateurs des campagnes successives (notes brutes /20 ; couverture : part du barème abordée).}\\label{tab:serie}\n`;
    tex += `\\begin{tblr}{colspec={X[l]Q[c]Q[c]Q[c]Q[c]Q[c]}, width=\\linewidth, rows={font=\\footnotesize}, row{1}={font=\\bfseries\\footnotesize},\n`;
    tex += `  row{Z}={font=\\bfseries\\footnotesize}, rowsep=1.5pt, hline{1,2,Z}={0.4pt,black!40}}\n`;
    tex += `DS & $n$ & Moy. & Méd. & $\\sigma$ & Couv. \\\\\n`;
    serie.concat([cur]).forEach(function(st, i) {
      var nom = i === serie.length ? nomCur : st.nomDS;
      tex += `${escapeTex(nom || "DS")} & ${st.nCorriges} & ${num(st.brut.moy)} & ${num(st.brut.med)} & ${num(st.brut.sigma)} & ${pct(st.efficacite)} \\\\\n`;
    });
    tex += `\\end{tblr}\n\\end{table}\n\n`;
  }

  // ── 5. Discussion ──
  tex += `\\section{Discussion}\n${R("disc_" + (tendance || (precedent ? "neutre" : "premiere")))}\n\n`;
  tex += `\\subsection{Limites de l'étude}\n${RN("limites", 3).join("\\par\\smallskip\\noindent ")}\n\n`;

  // ── 6. Conclusion ──
  tex += `\\section{Conclusion et perspectives}\n${RN("conclusion", 2).join(" ")}\n\n`;

  // ── Fin d'article (mentions compactes, comme dans une revue) ──
  var mention = function(titre, texte) { return `\\noindent\\textbf{${titre}.}~${texte}\\par\\smallskip\n`; };
  tex += `\\par\\medskip\\noindent\\rule{\\columnwidth}{0.4pt}\\par\\smallskip\n{\\small\n`;
  tex += mention("Remerciements", `L'auteur remercie les ${cur.nCorriges}~sujets de la cohorte pour leur participation à l'étude, ainsi que ${R("remerciements_divers")}`);
  tex += mention("Contributions des auteurs", `S.~\\textsc{Correcteur}~: conceptualisation, méthodologie, correction, rédaction, café.${afficherCo ? " " + R("credit_coauteurs") : ""}`);
  tex += mention("Conflit d'intérêts", R("conflit"));
  tex += mention("Financement", R("financement"));
  tex += mention("Disponibilité des données", R("donnees"));
  tex += mention("Rapport du relecteur n\\textsuperscript{o}~2", R("relecteur2"));
  if (ctx.tirage > 0) tex += mention("Erratum", R("erratum"));
  tex += `}\n\n`;

  // ── Références ──
  tex += `\\begin{thebibliography}{9}\n`;
  RN("refs_fixes", 2).forEach(function(ref, i) { tex += `\\bibitem{reffixe${i + 1}} ${ref}\n`; });
  if (precedent) {
    var ctxPrec = { graine: graine, pas: serie.length - 1, tirage: tirages[precedent.examId] || 0 };
    var varsPrec = Object.assign({}, vars, { ds: _insecable(escapeTex(precedent.nomDS || "DS")), n: String(precedent.nCorriges) });
    var entetePrec = _enteteArticle(ctxPrec, B, varsPrec);
    tex += `\\bibitem{refprec} S.~\\textsc{Correcteur}, \\og ${entetePrec.titre}\\fg, \\textit{${escapeTex(entetePrec.revue)}}, vol.~${escapeTex(e.anneeScolaire || "1")}, n\\textsuperscript{o}~${serie.length}.\n`;
  }
  if (exam.exercises.length) {
    tex += `\\bibitem{refex} S.~\\textsc{Correcteur}, \\textit{${escapeTex(exam.exercises[0].title || "Exercice 1")}}, in ${vars.ds}, résultats partiels.\n`;
  }
  tex += `\\end{thebibliography}\n`;

  // ── Annexe : indicateurs par question, groupés par exercice ──
  if (cfg.annexe && cur.questions.length) {
    var nCol = ft.competences ? 6 : 5;
    tex += `\\onecolumn\n\\appendix\n\\section{Données supplémentaires}\n`;
    tex += `Le tableau~\\ref{tab:annexe} détaille les indicateurs de chaque question. Le traitement est la part des copies ayant abordé la question ; la réussite, la part des points obtenus par les sujets qui l'ont abordée. $\\bullet$~question délaissée${ft.questionPiege ? " ; $\\triangle$~question piège" : ""} ; $\\dagger$~question bonus.\n\n`;
    tex += `\\begin{longtblr}[caption={Indicateurs par question.}, label={tab:annexe}]{colspec={Q[l]${ft.competences ? "Q[l]" : ""}Q[c]Q[c]Q[c]Q[c]},\n`;
    tex += `  rowhead=1, row{1}={font=\\bfseries\\footnotesize, bg=accent!12}, rows={font=\\footnotesize},\n`;
    tex += `  rowsep=1.5pt, hline{1,2,Z}={0.4pt,black!40}}\n`;
    tex += `Question & ${ft.competences ? "Comp. & " : ""}Barème & Traitement & Réussite & \\\\\n`;
    var exCourant = null;
    cur.questions.forEach(function(q) {
      if (q.exId !== exCourant) {
        exCourant = q.exId;
        tex += `\\SetCell[c=${nCol}]{l, bg=accent!8} \\textbf{${escapeTex(q.exTitle)}}${" &".repeat(nCol - 1)} \\\\\n`;
      }
      var marques = [];
      if (q.delaissee) marques.push("$\\bullet$");
      if (ft.questionPiege && q.piege) marques.push("$\\triangle$");
      if (q.bonus) marques.push("$\\dagger$");
      tex += `${escapeTex(q.label)} & ${ft.competences ? _compBadgesTex(q.competences) + " & " : ""}${num(q.max)} & ${pct(q.tauxTraitement)} & ${q.tauxReussite !== null ? pct(q.tauxReussite) : "--"} & ${marques.join("\\,")} \\\\\n`;
    });
    tex += `\\end{longtblr}\n`;
  }

  return doc + tex + `\\end{document}\n`;
}

// ─── Helpers privés ───────────────────────────────────────────────

// Radar compétences (pgfplots polaire). compP = { A:0..1, N, R, V }.
// Convention alignée sur Charts.jsx : ordre COMPETENCES, premier axe à midi,
// sens horaire. En polaire pgfplots, l'angle 90° = midi ; on décrémente de
// 360/n par compétence pour le sens horaire. Échelle 0..1.
// compPrec (optionnel) : profil de référence (DS précédent), en pointillés gris.
function _radarCompetencesTex(compP, compPrec) {
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
  // polygone de référence (DS précédent)
  if (compPrec) {
    const ref = COMPETENCES.map((c, i) => P(i, typeof compPrec[c.id] === "number" ? compPrec[c.id] : 0)).join(" -- ");
    s += `\\draw[black!45, dashed, line width=0.8pt] ${ref} -- cycle;\n`;
  }
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

// Histogramme des notes /20 de la classe (classes de largeur 1), avec la
// moyenne (trait plein) et la médiane (pointillés) — aucun marqueur individuel.
function _histoClasseTex(notes, moy, med) {
  const bins = Array.from({ length: 20 }, () => 0);
  notes.forEach(nt => { bins[Math.max(0, Math.min(19, Math.floor(nt)))]++; });
  const maxBin = Math.max(...bins, 1);

  let s = "";
  s += `\\begin{tikzpicture}\n`;
  s += `\\begin{axis}[\n`;
  s += `  ybar interval, xmajorgrids=false, width=0.97\\linewidth, height=5.2cm,\n`;
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
  s += `\\draw[accent!80!black, thick] (axis cs:${moy.toFixed(2)},0) -- (axis cs:${moy.toFixed(2)},${maxBin + 0.6});\n`;
  s += `\\draw[black!60, thick, dashed] (axis cs:${med.toFixed(2)},0) -- (axis cs:${med.toFixed(2)},${maxBin + 0.6});\n`;
  s += `\\end{axis}\n`;
  s += `\\end{tikzpicture}\n`;
  return s;
}

// Boîtes à moustaches des notes brutes /20 par campagne (quartiles,
// moustaches aux 10e et 90e centiles), moyennes en losanges. La campagne
// courante (dernière de la série) est mise en valeur.
function _boitesSerieTex(serie, nomCur) {
  const N = serie.length;
  const labels = serie.map((st, i) => {
    const nom = (i === N - 1 ? (nomCur || st.nomDS) : st.nomDS) || "DS";
    return "{" + escapeTex(String(nom).slice(0, 10)) + "}";
  }).join(",");

  let s = "";
  s += `\\begin{tikzpicture}\n`;
  s += `\\begin{axis}[\n`;
  s += `  width=0.97\\linewidth, height=5.2cm,\n`;
  s += `  ymin=0, ymax=20, ytick={0,5,10,15,20},\n`;
  s += `  xmin=0.4, xmax=${(N + 0.6).toFixed(1)}, xtick={${serie.map((_, i) => i + 1).join(",")}}, xticklabels={${labels}},\n`;
  s += `  x tick label style={font=\\scriptsize, rotate=30, anchor=north east, inner sep=1pt},\n`;
  s += `  y tick label style={font=\\scriptsize},\n`;
  s += `  ylabel={Note brute /20}, ylabel style={font=\\footnotesize},\n`;
  s += `  axis x line=bottom, axis y line=left, boxplot/draw direction=y,\n`;
  s += `]\n`;
  serie.forEach((st, i) => {
    const b = st.brut;
    const actif = i === N - 1;
    s += `\\addplot[boxplot prepared={draw position=${i + 1}, lower whisker=${b.p10.toFixed(2)}, lower quartile=${b.q1.toFixed(2)}, median=${b.med.toFixed(2)}, upper quartile=${b.q3.toFixed(2)}, upper whisker=${b.p90.toFixed(2)}, box extend=0.5}, draw=accent!${actif ? "90" : "60"}!black, fill=accent!${actif ? "40" : "15"}] coordinates {};\n`;
  });
  s += `\\addplot[only marks, mark=diamond*, mark size=2pt, color=red!70!black] coordinates {`;
  serie.forEach((st, i) => { s += `(${i + 1},${st.brut.moy.toFixed(2)})`; });
  s += `};\n`;
  s += `\\end{axis}\n`;
  s += `\\end{tikzpicture}\n`;
  return s;
}

// Réussite par question d'un exercice : barres colorées selon le taux de
// réussite des traitants (≥ 75 % vert, ≥ 50 % orange, sinon rouge),
// losanges pour le taux de traitement ; marqueurs • délaissée, △ piège,
// † bonus dans les étiquettes.
function _barresQuestionsTex(qs, ft) {
  const n = qs.length;
  const serre = n > 8;
  const labels = qs.map(q => {
    let l = escapeTex(String(q.label || "").slice(0, 6));
    if (q.bonus) l += "$^{\\dagger}$";
    if (q.delaissee) l += "\\,$\\bullet$";
    if (ft.questionPiege && q.piege) l += "\\,$\\triangle$";
    return "{" + l + "}";
  }).join(",");
  const classes = { reussiteHaute: [], reussiteMoyenne: [], reussiteBasse: [] };
  qs.forEach((q, i) => {
    if (q.tauxReussite === null) return;
    const t = Math.max(0, Math.min(1, q.tauxReussite));
    const c = t >= 0.75 ? "reussiteHaute" : (t >= 0.5 ? "reussiteMoyenne" : "reussiteBasse");
    classes[c].push(`(${i + 1},${t.toFixed(3)})`);
  });

  let s = "";
  s += `\\begin{tikzpicture}\n`;
  s += `\\begin{axis}[\n`;
  s += `  bar width=0.6, width=\\linewidth, height=3.8cm,\n`;
  s += `  ymin=0, ymax=1.08, ytick={0,0.5,1}, yticklabels={0,50,100}, ylabel={\\%},\n`;
  s += `  xmin=0.4, xmax=${(n + 0.6).toFixed(1)}, xtick={${qs.map((_, i) => i + 1).join(",")}}, xticklabels={${labels}},\n`;
  s += `  x tick label style={font=${serre ? "\\tiny, rotate=45, anchor=north east, inner sep=1pt" : "\\scriptsize"}},\n`;
  s += `  y tick label style={font=\\scriptsize}, ylabel style={font=\\footnotesize},\n`;
  s += `  axis x line*=bottom, axis y line*=left,\n`;
  s += `]\n`;
  Object.keys(classes).forEach(c => {
    if (classes[c].length) s += `\\addplot[ybar, bar shift=0pt, fill=${c}!70, draw=${c}] coordinates {${classes[c].join("")}};\n`;
  });
  s += `\\addplot[only marks, mark=diamond*, mark size=1.6pt, color=black!65] coordinates {`;
  qs.forEach((q, i) => { s += `(${i + 1},${q.tauxTraitement.toFixed(3)})`; });
  s += `};\n`;
  s += `\\end{axis}\n`;
  s += `\\end{tikzpicture}\n`;
  return s;
}

// Diagramme de phase justesse × efficacité : un point par copie (anonyme),
// moyennes de la cohorte en pointillés, quadrants nommés.
function _phaseTex(points, moyJ, moyE) {
  const c = v => Math.max(0, Math.min(1, v)).toFixed(3);

  let s = "";
  s += `\\begin{tikzpicture}\n`;
  s += `\\begin{axis}[\n`;
  s += `  width=\\linewidth, height=6.2cm,\n`;
  s += `  xmin=0, xmax=1, ymin=0, ymax=1.05,\n`;
  s += `  xtick={0,0.25,0.5,0.75,1}, xticklabels={0,25,50,75,100},\n`;
  s += `  ytick={0,0.25,0.5,0.75,1}, yticklabels={0,25,50,75,100},\n`;
  s += `  xlabel={Efficacité (\\%)}, ylabel={Justesse (\\%)},\n`;
  s += `  label style={font=\\footnotesize}, tick label style={font=\\scriptsize},\n`;
  s += `]\n`;
  s += `\\draw[black!35, dashed] (axis cs:${c(moyE)},0) -- (axis cs:${c(moyE)},1.05);\n`;
  s += `\\draw[black!35, dashed] (axis cs:0,${c(moyJ)}) -- (axis cs:1,${c(moyJ)});\n`;
  s += `\\addplot[only marks, mark=*, mark size=1.5pt, mark options={fill=accent!45, draw=accent!85!black}] coordinates {`;
  points.forEach(p => { s += `(${c(p.efficacite)},${c(p.justesse)})`; });
  s += `};\n`;
  s += `\\node[font=\\tiny\\itshape, text=black!55, anchor=north west] at (axis cs:0.02,1.03) {tireurs d'élite};\n`;
  s += `\\node[font=\\tiny\\itshape, text=black!55, anchor=north east] at (axis cs:0.98,1.03) {stratèges};\n`;
  s += `\\node[font=\\tiny\\itshape, text=black!55, anchor=south east] at (axis cs:0.98,0.02) {ratisseurs};\n`;
  s += `\\node[font=\\tiny\\itshape, text=black!55, anchor=south west] at (axis cs:0.02,0.02) {explorateurs prudents};\n`;
  s += `\\end{axis}\n`;
  s += `\\end{tikzpicture}\n`;
  return s;
}
