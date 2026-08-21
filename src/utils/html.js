// ═══════════════════════════════════════════════════════════════════
// GÉNÉRATEUR HTML — Rapports individuels autonomes
// ═══════════════════════════════════════════════════════════════════
//
// Trois thèmes : "light" (Cahier), "dark" (Ardoise), "young" (Jeune)
// Police : Lora pour light/dark, Nunito pour young (Google Fonts)
// Structure :
//   - Titre DS (hors header)
//   - Header card : nom élève + boîtes note/rang + fond teinté accent
//   - Bande stats : deux colonnes Élève / Classe
//   - Bloc compétences : radar gauche + grille 2×2
//   - Histogramme de distribution
//   - Détail par exercice
//   - Barème détaillé (optionnel)
//   - Pied de page
// ═══════════════════════════════════════════════════════════════════

import { COMPETENCES, ETABLISSEMENT } from "../config/settings";
import {
  gradeKey, treatedKey,
  questionScore, exerciseScore, bonusCompletPoints,
  studentTotal, examTotal,
  notesParCompetence, malusTotal,
  ratioJustesse, ratioEfficacite,
} from "./calculs";
import { slugify, buildAudioFilename } from "./helpers";
import { renderStarMap } from "./starmap";

// ─── Configuration par défaut ────────────────────────────────────

export const DEFAULT_HTML_CONFIG = {
  theme: "light",
  noteNorm: true,
  noteBrute: false,
  rang: true,
  statsEleve: { justesse: true, efficacite: true, malus: true },
  statsClasse: { moy: true, minMax: true, sigma: false },
  competences: "grid",   // "grid" | "row" | "none"
  commentaire: true,
  detailExercices: true,
  bareme: false,
  baremeLatex: true,
  papierLatex: false,
  papierTextes: null,
  histogramme: true,
  starMap: false,
  blockOrder: ["stats", "starMap"],
  blockLayout: {
    stats:       "full",
    starMap:     "half",
  },
};

export const DEFAULT_RAPPORT_CLASSE_CONFIG = {
  commentaire:   true,
  statsGlobales: true,
  distribution:  true,
  parCompetence: true,
  parExercice:   true,
};

// ─── Palettes de thème ────────────────────────────────────────────
//
// Chaque palette expose :
//   bg, card, border, surface, text, textMuted, textDim
//   accent, success, warning, danger
//   ruled        : opacité des lignes de réglure (0 = aucune)
//   radius       : border-radius de base (px)
//   headerFont   : famille de polices pour le titre DS et le nom élève
//   bodyFont     : police du corps
//   compColors   : couleurs de compétence { A, N, R, V }

function paletteTheme(theme) {
  if (theme === "dark") {
    return {
      bg: "#1a1814", card: "#2a261e", border: "#3a3428", surface: "#242018",
      text: "#e8e4dc", textMuted: "#9e9a90", textDim: "#6b675f",
      accent: "#5b9bd5", success: "#7bc67e", warning: "#e8a838",
      danger: "#d06050", violet: "#a882c8", ruled: 0.15, ruledLine: "#3a3428", radius: 8,
      radiusSm: 5,
      headerFont: "'Newsreader', Georgia, serif",
      bodyFont: "'Hanken Grotesk', system-ui, sans-serif",
      labelFont: "'JetBrains Mono', monospace",
      compColors: { A: "#5b9bd5", N: "#a882c8", R: "#7bc67e", V: "#e8a838" },
      negBg: "#3d1f1f", negBorder: "#c0504f", negText: "#f09595", negCheckBg: "#5a2525",
    };
  }
  if (theme === "young") {
    return {
      bg: "#f0f4ff", card: "#ffffff", border: "#c8d5f8", surface: "#e4ecff",
      text: "#1e1b4b", textMuted: "#6b7280", textDim: "#9ca3af",
      accent: "#4f46e5", success: "#059669", warning: "#d97706",
      danger: "#dc2626", violet: "#a855f7", ruled: 0, ruledLine: "#c8d5f8", radius: 14,
      radiusSm: 8,
      headerFont: "'Nunito', 'Quicksand', system-ui, sans-serif",
      bodyFont: "'Nunito', 'Quicksand', system-ui, sans-serif",
      labelFont: "'JetBrains Mono', monospace",
      compColors: { A: "#e05a9e", N: "#8b5cf6", R: "#10b981", V: "#f59e0b" },
      negBg: "#fff0ee", negBorder: "#c8882a", negText: "#633806", negCheckBg: "#fac775",
    };
  }
  // light (défaut)
  return {
    bg: "#faf7f2", card: "#ffffff", border: "#e0d8cc", surface: "#f2ede4",
    text: "#2c2416", textMuted: "#7a7060", textDim: "#b0a898",
    accent: "#2855a0", success: "#2a7a3a", warning: "#c07a10",
    danger: "#b83030", violet: "#6a3a9a", ruled: 0.45, ruledLine: "#e0d8cc", radius: 8,
    radiusSm: 5,
    headerFont: "'Newsreader', Georgia, serif",
    bodyFont: "'Hanken Grotesk', system-ui, sans-serif",
    labelFont: "'JetBrains Mono', monospace",
    compColors: { A: "#2855a0", N: "#6a3a9a", R: "#2a7a3a", V: "#c07a10" },
    negBg: "#fcebeb", negBorder: "#e24b4a", negText: "#791f1f", negCheckBg: "#f7c1c1",
  };
}

// ─── Google Fonts à injecter selon le thème ───────────────────────

function googleFontsUrl(theme) {
  var base = "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600";
  if (theme === "young") {
    return base + "&family=Nunito:wght@400;600;700;800;900&display=swap";
  }
  return base + "&display=swap";
}

// ─── Utilitaires ─────────────────────────────────────────────────

function esc(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function fmt0(n) { return Math.round(n).toString(); }
function fmtPct(r) { return Math.round(r * 100) + " %"; }
function fmtFr(n) { return fmt1(n).replace('.', ','); }

// ─── SVG Radar ───────────────────────────────────────────────────
// Taille fixe : 100px (+ padding interne pour les labels)

function svgRadar(compPcts, p) {
  var size = 100;
  var cx = size / 2, cy = size / 2;
  var r = size * 0.34;
  var pad = size * 0.22;
  var total = size + pad * 2;
  var n = COMPETENCES.length;
  var angles = COMPETENCES.map(function(_, i) {
    return (Math.PI * 2 * i) / n - Math.PI / 2;
  });

  function pt(val, i, rr) {
    return [
      cx + pad + rr * val * Math.cos(angles[i]),
      cy + pad + rr * val * Math.sin(angles[i]),
    ];
  }

  var grids = [0.5, 1].map(function(lv) {
    var pts = COMPETENCES.map(function(_, i) { return pt(lv, i, r).join(","); }).join(" ");
    return '<polygon points="' + pts + '" fill="none" stroke="' + p.border + '" stroke-width="' + (lv === 1 ? 0.9 : 0.4) + '"/>';
  }).join("");

  var surfPts = COMPETENCES.map(function(c, i) {
    return pt(compPcts[c.id] || 0, i, r).join(",");
  }).join(" ");
  var surf = '<polygon points="' + surfPts + '" fill="' + p.accent + '20" stroke="' + p.accent + '" stroke-width="1.4"/>';

  var dotsAndLabels = COMPETENCES.map(function(c, i) {
    var xy = pt(compPcts[c.id] || 0, i, r);
    var lxy = pt(1.42, i, r);
    var col = p.compColors[c.id] || p.accent;
    return '<circle cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="3" fill="' + col + '"/>' +
      '<text x="' + lxy[0].toFixed(1) + '" y="' + lxy[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" ' +
      'font-size="9" font-weight="700" fill="' + col + '" font-family="JetBrains Mono, monospace">' + esc(c.id) + '</text>';
  }).join("");

  return '<svg viewBox="0 0 ' + total + ' ' + total + '" ' +
    'xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;max-width:200px;max-height:200px;">' +
    grids + surf + dotsAndLabels + '</svg>';
}

// ─── SVG Histogramme ─────────────────────────────────────────────

function svgHisto(allNotes, studentNote, p, compact) {
  var width = 340, height = compact ? 76 : 110;
  var nbBins = 21;
  var bins = [];
  for (var i = 0; i < nbBins; i++) bins.push(0);
  allNotes.forEach(function(n) { bins[Math.min(20, Math.max(0, Math.round(n)))]++; });
  var maxCount = Math.max.apply(null, bins.concat([1]));

  var padL = 24, padR = 8, padT = compact ? 5 : 8, padB = compact ? 14 : 20;
  var innerW = width - padL - padR;
  var innerH = height - padT - padB;
  var barW = innerW / nbBins;

  var bars = bins.map(function(count, i) {
    if (count === 0) return "";
    var bh = Math.max(3, (count / maxCount) * innerH);
    var x = padL + i * barW;
    var y = padT + innerH - bh;
    var fill = i === Math.round(studentNote) ? p.accent : p.accent + "55";
    return '<rect x="' + (x + 0.5).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (barW - 1).toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="' + fill + '" rx="2"/>' +
      (compact ? '' : '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (y - 2).toFixed(1) + '" text-anchor="middle" font-size="7" fill="' + p.textMuted + '" font-family="monospace">' + count + '</text>');
  }).join("");

  var xEleve = padL + studentNote * (innerW / 20);
  var trait = '<line x1="' + xEleve.toFixed(1) + '" y1="' + padT + '" x2="' + xEleve.toFixed(1) + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="' + p.danger + '" stroke-width="1.5" stroke-dasharray="3,2"/>';

  var ticks = [0, 5, 10, 15, 20].map(function(v) {
    var x = padL + v * (innerW / 20);
    return '<text x="' + x.toFixed(1) + '" y="' + (height - 4) + '" text-anchor="middle" font-size="8" fill="' + p.textMuted + '" font-family="monospace">' + v + '</text>';
  }).join("");

  var axis = '<line x1="' + padL + '" y1="' + (padT + innerH).toFixed(1) + '" x2="' + (width - padR) + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="' + p.border + '" stroke-width="0.8"/>';

  return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;">' +
    axis + bars + trait + ticks + '</svg>';
}

// ─── SVG Histogramme classe (agrandi, trait moyenne) ─────────────

function svgHistoClasse(allNotes, moyenneNote, p) {
  var width = 900, height = 180;
  var nbBins = 21;
  var bins = [];
  for (var i = 0; i < nbBins; i++) bins.push(0);
  allNotes.forEach(function(n) { bins[Math.min(20, Math.max(0, Math.round(n)))]++; });
  var maxCount = Math.max.apply(null, bins.concat([1]));

  var padL = 28, padR = 10, padT = 12, padB = 24;
  var innerW = width - padL - padR;
  var innerH = height - padT - padB;
  var barW = innerW / nbBins;

  var bars = bins.map(function(count, i) {
    if (count === 0) return "";
    var bh = Math.max(3, (count / maxCount) * innerH);
    var x = padL + i * barW;
    var y = padT + innerH - bh;
    return '<rect x="' + (x + 0.5).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (barW - 1.5).toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="' + p.accent + '99" rx="3"/>' +
      '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (y - 3).toFixed(1) + '" text-anchor="middle" font-size="9" fill="' + p.textMuted + '" font-family="monospace">' + count + '</text>';
  }).join("");

  var xMoy = padL + moyenneNote * (innerW / 20);
  var traitMoy = '<line x1="' + xMoy.toFixed(1) + '" y1="' + padT + '" x2="' + xMoy.toFixed(1) + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="' + p.accent + '" stroke-width="2" stroke-dasharray="4,3"/>' +
    '<text x="' + xMoy.toFixed(1) + '" y="' + (padT - 2) + '" text-anchor="middle" font-size="9" fill="' + p.accent + '" font-family="monospace">moy ' + fmt1(moyenneNote) + '</text>';

  var ticks = [0, 5, 10, 15, 20].map(function(v) {
    var x = padL + v * (innerW / 20);
    return '<text x="' + x.toFixed(1) + '" y="' + (height - 5) + '" text-anchor="middle" font-size="10" fill="' + p.textMuted + '" font-family="monospace">' + v + '</text>';
  }).join("");

  var axis = '<line x1="' + padL + '" y1="' + (padT + innerH).toFixed(1) + '" x2="' + (width - padR) + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="' + p.border + '" stroke-width="1"/>';

  return '<svg width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;">' +
    axis + bars + traitMoy + ticks + '</svg>';
}

// ─── SVG Ring gauge (note /20) ────────────────────────────────────

function svgRingGauge(noteNorm, p) {
  var rr = 60;
  var circ = 2 * Math.PI * rr;
  var frac = Math.min(1, Math.max(0, noteNorm / 20));
  var dash = (circ * frac).toFixed(2) + ' ' + circ.toFixed(2);
  return '<div style="position:relative;width:148px;height:148px;flex:none;">' +
    '<svg viewBox="0 0 148 148" style="position:absolute;top:0;left:0;right:0;bottom:0;width:148px;height:148px;" xmlns="http://www.w3.org/2000/svg">' +
      '<g transform="rotate(-90 74 74)">' +
      '<circle cx="74" cy="74" r="' + rr + '" fill="none" stroke="' + p.border + '" stroke-width="11"/>' +
      '<circle cx="74" cy="74" r="' + rr + '" fill="none" stroke="' + p.accent + '" stroke-width="11" stroke-linecap="round" stroke-dasharray="' + dash + '"/>' +
      '</g>' +
    '</svg>' +
    '<div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;">' +
      '<div style="font-family:' + p.headerFont + ';font-size:40px;font-weight:600;line-height:1;color:' + p.text + ';">' + fmtFr(noteNorm) + '</div>' +
      '<div style="font-family:' + p.labelFont + ';font-size:10px;color:' + p.textMuted + ';margin-top:3px;letter-spacing:.05em;">SUR 20</div>' +
    '</div>' +
    '</div>';
}

// ─── SVG barre KPI (position élève vs. moyenne classe) ────────────

function svgKpiBar(you, avg, p) {
  var clamp = function(v) { return Math.min(1, Math.max(0, v)); };
  var X = function(v) { return (5 + clamp(v) * 186).toFixed(1); };
  return '<svg viewBox="0 0 196 18" style="width:100%;height:18px;display:block" xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="5" y1="9" x2="191" y2="9" stroke="' + p.border + '" stroke-width="6" stroke-linecap="round"/>' +
    '<line x1="5" y1="9" x2="' + X(you) + '" y2="9" stroke="' + p.accent + '" stroke-width="6" stroke-linecap="round"/>' +
    '<line x1="' + X(avg) + '" y1="3" x2="' + X(avg) + '" y2="15" stroke="' + p.textDim + '" stroke-width="1.5"/>' +
    '<circle cx="' + X(you) + '" cy="9" r="4.5" fill="' + p.accent + '" stroke="' + p.card + '" stroke-width="1.5"/>' +
    '</svg>';
}

// ─── SVG Classement classe (notes triées décroissantes, staircase) ──

function svgRankChart(presents, getNote20, studentId, p) {
  var sorted = presents.map(function(s) {
    return { id: s.id, note: getNote20(s.id) };
  }).sort(function(a, b) { return b.note - a.note; });

  var n = sorted.length;
  if (n === 0) return '';

  var moy = sorted.reduce(function(acc, s) { return acc + s.note; }, 0) / n;

  var youIdx = -1;
  for (var i = 0; i < sorted.length; i++) {
    if (sorted[i].id === studentId) { youIdx = i; break; }
  }
  var youNote = youIdx >= 0 ? sorted[youIdx].note : 0;

  var W = 360, H = 140, pl = 10, pr = 10, pt = 14, pb = 22;
  var topV = Math.max(sorted[0].note, 1);
  var rx = function(idx) { return pl + (n > 1 ? idx / (n - 1) : 0) * (W - pl - pr); };
  var ry = function(v)   { return (H - pb) - (v / topV) * (H - pb - pt); };

  var pts = sorted.map(function(s, idx) {
    return rx(idx).toFixed(1) + ' ' + ry(s.note).toFixed(1);
  });
  var linePath  = 'M ' + pts.join(' L ');
  var areaPath  = linePath +
    ' L ' + rx(n - 1).toFixed(1) + ' ' + ry(0).toFixed(1) +
    ' L ' + rx(0).toFixed(1)     + ' ' + ry(0).toFixed(1) + ' Z';

  var parts = [
    '<path d="' + areaPath + '" fill="' + p.accent + '1a"/>',
    '<path d="' + linePath + '" fill="none" stroke="' + p.accent + '" stroke-width="1.6"/>',
    '<line x1="' + pl + '" y1="' + ry(0).toFixed(1) + '" x2="' + (W - pr) + '" y2="' + ry(0).toFixed(1) + '" stroke="' + p.border + '" stroke-width="1"/>',
    '<line x1="' + pl + '" y1="' + ry(moy).toFixed(1) + '" x2="' + (W - pr) + '" y2="' + ry(moy).toFixed(1) + '" stroke="' + p.warning + '" stroke-width="1" stroke-dasharray="4 3"/>',
    '<text x="' + (W - pr) + '" y="' + (ry(moy) - 4).toFixed(1) + '" text-anchor="end" font-family="monospace" font-size="9" fill="' + p.warning + '">moy. ' + fmtFr(moy) + '</text>',
  ];

  if (youIdx >= 0) {
    var youX = rx(youIdx), youY = ry(youNote);
    // Décaler le label vers la gauche si l'élève est dans le dernier tiers
    var lblAnchor = youIdx > n * 0.67 ? 'end' : 'start';
    var lblOffset = youIdx > n * 0.67 ? -7 : 7;
    parts.push(
      '<line x1="' + youX.toFixed(1) + '" y1="' + youY.toFixed(1) + '" x2="' + youX.toFixed(1) + '" y2="' + ry(0).toFixed(1) + '" stroke="' + p.accent + '" stroke-width="1" stroke-dasharray="3 2"/>',
      '<circle cx="' + youX.toFixed(1) + '" cy="' + youY.toFixed(1) + '" r="4.2" fill="' + p.accent + '" stroke="' + p.card + '" stroke-width="1.5"/>',
      '<text x="' + (youX + lblOffset).toFixed(1) + '" y="' + (youY - 6).toFixed(1) + '" text-anchor="' + lblAnchor + '" font-family="monospace" font-size="9.5" font-weight="700" fill="' + p.accent + '">Vous·' + fmtFr(youNote) + '</text>'
    );
  }

  parts.push(
    '<text x="' + pl + '" y="' + (H - 7) + '" font-family="monospace" font-size="9" fill="' + p.textMuted + '">1er</text>',
    '<text x="' + (W - pr) + '" y="' + (H - 7) + '" text-anchor="end" font-family="monospace" font-size="9" fill="' + p.textMuted + '">' + n + 'e</text>'
  );

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">' +
    parts.join('') + '</svg>';
}

// ─── Blocs HTML ───────────────────────────────────────────────────

// Header page : masthead + héros + ring gauge
function blocHeader(student, noteNorm, noteBrute, rang, effectif, cfg, p, nomDS, dateDS) {
  var etab = esc(ETABLISSEMENT.nom) + ' · ' + esc(ETABLISSEMENT.classe) +
    (ETABLISSEMENT.matricule ? ' · ' + esc(ETABLISSEMENT.matricule) : '');
  var dsStr = esc(nomDS || '') + (dateDS ? ' · ' + esc(dateDS) : '');

  // Masthead
  var masthead = '<div style="display:flex;justify-content:space-between;align-items:flex-end;' +
    'border-bottom:1.5px solid ' + p.text + ';padding-bottom:11px;margin-bottom:28px;">' +
    '<div style="font-family:' + p.labelFont + ';font-size:11px;letter-spacing:.13em;color:' + p.textMuted + ';text-transform:uppercase;">' + etab + '</div>' +
    '<div style="font-family:' + p.labelFont + ';font-size:11px;letter-spacing:.13em;color:' + p.textMuted + ';text-transform:uppercase;">' + dsStr + '</div>' +
    '</div>';

  // Pill rang
  var rangPill = cfg.rang
    ? '<div style="display:inline-flex;align-items:center;gap:8px;margin-top:16px;background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:99px;padding:6px 14px;">' +
        '<span style="font-family:' + p.labelFont + ';font-size:10px;color:' + p.textMuted + ';text-transform:uppercase;letter-spacing:.08em;">Rang</span>' +
        '<span style="font-family:' + p.headerFont + ';font-size:18px;font-weight:600;color:' + p.text + ';">' + rang + '<sup style="font-size:.6em;vertical-align:super;">e</sup></span>' +
        '<span style="font-size:12px;color:' + p.textMuted + ';">/ ' + effectif + '</span>' +
      '</div>'
    : '';

  // Héros
  var hero = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">' +
    '<div>' +
      '<div style="font-family:' + p.labelFont + ';font-size:11px;letter-spacing:.16em;color:' + p.accent + ';text-transform:uppercase;margin-bottom:12px;">Compte rendu de devoir surveillé</div>' +
      '<div style="font-family:' + p.headerFont + ';font-size:46px;line-height:1.02;color:' + p.text + ';font-weight:500;">' + esc(student.prenom) + '</div>' +
      '<div style="font-family:' + p.headerFont + ';font-size:46px;line-height:1.02;color:' + p.text + ';font-weight:600;letter-spacing:.02em;">' + esc(student.nom).toUpperCase() + '</div>' +
      rangPill +
    '</div>' +
    svgRingGauge(noteNorm, p) +
    '</div>';

  return masthead + hero;
}

// Band KPI : Justesse / Efficacité / Total brut (3 cartes avec barre positionnée)
function blocStats(student, presents, getNote20, ratioJ, ratioE, stuMalus, cfg, p, scoreBrut, examTot, tjMoy, teMoy, brutMoy) {
  var se = cfg.statsEleve || {};
  if (!se.justesse && !se.efficacite) return "";

  var br = p.radius + "px";

  function deltaStr(val, ref) {
    var d = Math.round((val - ref) * 10) / 10;
    return (d >= 0 ? '+' : '') + fmtFr(d);
  }
  function deltaColor(val, ref) {
    return val >= ref ? p.success : p.danger;
  }

  function kpiCard(labelTxt, valueTxt, barYou, barAvg, avgTxt, deltaTxt, dColor, malusLine) {
    return '<div style="border:1px solid ' + p.border + ';border-radius:' + br + ';padding:15px 17px;background:' + p.card + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
        '<div style="font-family:' + p.labelFont + ';font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:' + p.textMuted + ';">' + labelTxt + '</div>' +
        '<div style="font-family:' + p.labelFont + ';font-size:10px;font-weight:600;color:' + dColor + ';">' + deltaTxt + '</div>' +
      '</div>' +
      '<div style="font-family:' + p.headerFont + ';font-size:28px;font-weight:600;color:' + p.text + ';margin:7px 0 11px;line-height:1;">' + valueTxt + '</div>' +
      svgKpiBar(barYou, barAvg, p) +
      '<div style="font-family:' + p.labelFont + ';font-size:10px;color:' + p.textMuted + ';margin-top:8px;">' + avgTxt + '</div>' +
      (malusLine || '') +
    '</div>';
  }

  var ratioBrutYou = examTot > 0 ? scoreBrut / examTot : 0;
  var ratioBrutAvg = examTot > 0 ? brutMoy / examTot : 0;

  var deltaJStr = deltaStr(ratioJ * 100, tjMoy * 100) + ' pts';
  var deltaEStr = deltaStr(ratioE * 100, teMoy * 100) + ' pts';
  var deltaBStr = deltaStr(scoreBrut, brutMoy) + ' pts';

  var malusLine = (se.malus && stuMalus > 0)
    ? '<div style="font-family:' + p.labelFont + ';font-size:10px;color:' + p.danger + ';margin-top:3px;">Malus −' + stuMalus + ' %</div>'
    : '';

  return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px;">' +
    (se.justesse ? kpiCard(
      'Justesse',
      fmtFr(ratioJ * 100) + ' %',
      ratioJ, tjMoy,
      'moy. classe ' + fmtFr(tjMoy * 100) + ' %',
      deltaJStr, deltaColor(ratioJ, tjMoy),
      ''
    ) : '<div></div>') +
    (se.efficacite ? kpiCard(
      'Efficacité',
      fmtFr(ratioE * 100) + ' %',
      ratioE, teMoy,
      'moy. classe ' + fmtFr(teMoy * 100) + ' %',
      deltaEStr, deltaColor(ratioE, teMoy),
      ''
    ) : '<div></div>') +
    kpiCard(
      'Total brut',
      fmtFr(scoreBrut) + ' / ' + examTot,
      ratioBrutYou, ratioBrutAvg,
      'moy. classe ' + fmtFr(brutMoy),
      deltaBStr, deltaColor(scoreBrut, brutMoy),
      malusLine
    ) +
    '</div>';
}

// Bloc compétences : bascule radar / barres % (clic sur la case, CSS pur — pas de JS)
// compPcts = { A:0..1, N:0..1, R:0..1, V:0..1 } depuis genererHtmlEleve
function blocCompetences(comps, compPcts, cfg, p) {
  if (cfg.competences === "none") return "";
  var br = p.radius + "px";

  var radarHtml = '<div class="comp-view-radar" style="align-items:center;justify-content:center;padding:8px 0;">' + svgRadar(compPcts, p) + '</div>';

  var barsHtml = '<div class="comp-view-bars" style="flex-direction:column;justify-content:center;gap:13px;padding:8px 0;">' +
    COMPETENCES.map(function(c) {
      var pct = Math.round((compPcts[c.id] || 0) * 100);
      var col = p.compColors[c.id] || p.accent;
      return '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-family:' + p.labelFont + ';font-size:10px;font-weight:700;color:#fff;background:' + col + ';border-radius:4px;padding:2px 6px;flex:none;line-height:1.4;">' + esc(c.short) + '</span>' +
        '<div style="flex:1;min-width:0;font-size:12px;color:' + p.text + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(c.label) + '</div>' +
        '<div style="flex:2;height:6px;background:' + p.border + ';border-radius:99px;overflow:hidden;">' +
          '<div style="width:' + pct + '%;height:100%;background:' + p.accent + ';border-radius:99px;"></div>' +
        '</div>' +
        '<div style="font-family:' + p.labelFont + ';font-size:11px;color:' + p.textMuted + ';width:34px;flex:none;text-align:right;">' + pct + ' %</div>' +
      '</div>';
    }).join('') +
    '</div>';

  return '<style>' +
      '.comp-view-radar, .comp-view-bars { flex: 1; min-height: 0; }' +
      '.comp-view-radar { display: flex; } .comp-view-bars { display: none; }' +
      '#compToggle:checked ~ .comp-view-radar { display: none; }' +
      '#compToggle:checked ~ .comp-view-bars { display: flex; }' +
    '</style>' +
    '<label for="compToggle" style="cursor:pointer;display:flex;flex-direction:column;background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + br + ';padding:14px 16px;height:100%;box-sizing:border-box;">' +
    '<input type="checkbox" id="compToggle" style="position:absolute;opacity:0;width:0;height:0;">' +
    radarHtml + barsHtml +
    '<div class="no-print" style="text-align:center;font-family:' + p.labelFont + ';font-size:9px;color:' + p.textMuted + ';letter-spacing:.06em;text-transform:uppercase;flex:none;margin-top:6px;">cliquer pour basculer</div>' +
    '</label>';
}

// Rangée diagnostic : compétences (gauche) | distribution + classement (droite)
// Option B : colonnes 50/50, col. droite empilée
function blocDiagnosticRow(comps, compPcts, allNotes, studentNote, presents, getNote20, studentId, cfg, p, ft) {
  var br = p.radius + "px";

  // Colonne droite : labels section + graphiques compacts
  var rightContent = '';
  if (cfg.histogramme) {
    rightContent +=
      '<div style="font-family:' + p.labelFont + ';font-size:10px;font-weight:400;text-transform:uppercase;letter-spacing:.08em;color:' + p.textMuted + ';margin-bottom:6px;">Distribution de la classe</div>' +
      svgHisto(allNotes, studentNote, p, true);
  }
  rightContent +=
    '<div style="font-family:' + p.labelFont + ';font-size:10px;font-weight:400;text-transform:uppercase;letter-spacing:.08em;color:' + p.textMuted + ';margin-top:' + (cfg.histogramme ? '12px' : '0') + ';margin-bottom:4px;">Classement</div>' +
    svgRankChart(presents, getNote20, studentId, p);

  var rightCol = '<div style="flex:1;min-width:0;">' +
    '<div style="background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + br + ';padding:14px 16px;height:100%;box-sizing:border-box;">' +
    rightContent + '</div>' +
    '</div>';

  if (!ft.competences) {
    return '<div style="margin-bottom:14px;">' + rightCol + '</div>';
  }

  var leftCol = '<div style="flex:1;min-width:0;">' + blocCompetences(comps, compPcts, cfg, p) + '</div>';

  return '<div style="display:flex;gap:14px;margin-bottom:14px;align-items:stretch;">' + leftCol + rightCol + '</div>';
}

// Commentaire enseignant
function blocCommentaire(commentaire, cfg, p) {
  if (!cfg.commentaire || !commentaire || !commentaire.trim()) return "";
  var br = p.radius + "px";
  return '<div style="display:flex;gap:14px;border:1px solid ' + p.border + ';border-left:3px solid ' + p.accent + ';border-radius:0 ' + br + ' ' + br + ' 0;padding:16px 20px;margin-bottom:10px;background:' + p.card + ';">' +
    '<div style="font-family:' + p.headerFont + ';font-size:40px;line-height:0.7;color:' + p.accent + ';flex:none;">“</div>' +
    '<div>' +
      '<div style="font-family:' + p.labelFont + ';font-size:10px;font-weight:400;text-transform:uppercase;letter-spacing:.08em;color:' + p.textMuted + ';margin-bottom:7px;">Appréciation</div>' +
      '<div style="font-family:' + p.headerFont + ';font-size:15px;line-height:1.55;white-space:pre-wrap;color:' + p.text + ';">' + esc(commentaire.trim()) + '</div>' +
    '</div>' +
    '</div>';
}

// Titre de section
function sectionTitle(label, p) {
  return '<div style="font-family:' + p.labelFont + ';font-size:10px;font-weight:400;text-transform:uppercase;letter-spacing:.08em;color:' + p.textMuted + ';' +
    'margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid ' + p.border + ';">' + label + '</div>';
}

// Détail par exercice
function blocDetailExercices(student, exam, grades, remarks, presents, allRemarques, cfg, p, seuilDifficile, seuilReussite, seuilPiege, bonusCompletConfig, ft, clampQuestion) {
  if (!cfg.detailExercices) return "";
  var br = p.radius + "px";
  var html = sectionTitle("Détail par exercice", p);

  exam.exercises.forEach(function(ex, exIdx) {
    var aTraiteEx = ex.questions.some(function(q) {
      return q.items.some(function(it) { return grades[gradeKey(student.id, it.id)]; })
        || grades[treatedKey(student.id, q.id)];
    });
    if (!aTraiteEx) return;

    // ── Calculs exercice ──
    var sc = exerciseScore(grades, student.id, ex, bonusCompletConfig, clampQuestion);
    var eNotes = presents.map(function(s) {
      return exerciseScore(grades, s.id, ex, bonusCompletConfig, clampQuestion).earned;
    });
    var eMoy = eNotes.reduce(function(a, b) { return a + b; }, 0) / (eNotes.length || 1);
    var eMax = Math.max.apply(null, eNotes.concat([0]));
    var coeff = ex.coeff !== undefined ? ex.coeff : 1;
    var coeffStr = coeff !== 1
      ? ' <span style="font-size:11px;font-weight:600;margin-left:5px;color:' + p.textMuted + ';">×' + coeff + '</span>'
      : "";

    // Nombre de copies : élèves ayant traité au moins une question de cet exercice
    var nbCopies = presents.filter(function(s) {
      return ex.questions.some(function(q) {
        return q.items.some(function(it) { return grades[gradeKey(s.id, it.id)]; })
          || grades[treatedKey(s.id, q.id)];
      });
    }).length;

    var exRatio = sc.total > 0 ? sc.earned / sc.total : 0;
    var exColor = exRatio >= 0.75 ? p.success : exRatio >= 0.5 ? p.warning : p.danger;
    var pctEx = Math.round(exRatio * 100);

    // ── Header exercice : badge EX N + titre + score ──
    var headerHtml =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
        '<span style="font-family:' + p.labelFont + ';font-size:11px;font-weight:600;' +
          'color:#fff;background:' + p.accent + ';border-radius:4px;padding:3px 8px;flex:none;">EX ' + (exIdx + 1) + '</span>' +
        '<span style="font-family:' + p.headerFont + ';font-size:15px;font-weight:500;color:' + p.text + ';flex:1;">' +
          esc(ex.title) + coeffStr +
        '</span>' +
        '<span style="font-family:' + p.headerFont + ';font-size:16px;font-weight:600;color:' + p.accent + ';">' +
          fmtFr(sc.earned) +
        '</span>' +
        '<span style="font-family:' + p.labelFont + ';font-size:11px;color:' + p.textMuted + ';"> / ' + fmtFr(sc.total) + '</span>' +
      '</div>';

    // ── Barre de progression exercice ──
    var progHtml =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:13px;">' +
        '<div style="flex:1;height:5px;background:' + p.border + ';border-radius:99px;overflow:hidden;">' +
          '<div style="width:' + pctEx + '%;height:100%;background:' + exColor + ';border-radius:99px;"></div>' +
        '</div>' +
        '<span style="font-family:' + p.labelFont + ';font-size:10px;color:' + p.textMuted + ';flex:none;">' + pctEx + ' %</span>' +
      '</div>';

    // ── Lignes de questions ──
    var tbodyRows = '';
    ex.questions.forEach(function(q) {
      var aTraite = q.items.some(function(it) { return grades[gradeKey(student.id, it.id)]; })
        || grades[treatedKey(student.id, q.id)];
      if (!aTraite) return;

      var qsc = questionScore(grades, student.id, q, clampQuestion);
      var qMax = q.items.reduce(function(s, it) {
        return it.negative ? s : s + (parseFloat(it.points) || 0);
      }, 0);

      var nbTraitants = presents.filter(function(s) {
        return q.items.some(function(it) { return grades[gradeKey(s.id, it.id)]; })
          || grades[treatedKey(s.id, q.id)];
      }).length;
      var obtTotal = presents.reduce(function(s, st) {
        return s + q.items.reduce(function(ss, it) {
          return it.negative ? ss : ss + (grades[gradeKey(st.id, it.id)] ? (parseFloat(it.points) || 0) : 0);
        }, 0);
      }, 0);

      var tauxTraitement = presents.length > 0 ? (nbTraitants / presents.length) * 100 : 0;
      var tauxReussite   = nbTraitants > 0 && qMax > 0 ? (obtTotal / (nbTraitants * qMax)) * 100 : 0;
      var estDifficile   = tauxTraitement < seuilDifficile;
      var estPiege       = tauxTraitement >= 50 && tauxReussite < seuilPiege;
      var pctReussite    = qsc.total > 0 ? (qsc.earned / qsc.total) * 100 : 0;
      var etoile         = (estDifficile && pctReussite >= seuilReussite) ? " ✨" : "";
      var piegeMark      = (ft && ft.questionPiege && estPiege) ? " ⚠️" : "";
      var bonusMark      = q.bonus ? " 🎁" : "";

      var remLabels = (remarks[student.id + "__" + q.id] || []).map(function(id) {
        var rem = allRemarques.find(function(r) { return r.id === id; });
        return rem ? rem.label : id;
      }).join(", ");

      // Pills compétences (fond plein blanc sur couleur)
      var compSpans = q.competences.map(function(cid) {
        var comp = COMPETENCES.find(function(c) { return c.id === cid; });
        var col = p.compColors[cid] || p.accent;
        return comp
          ? '<span style="display:inline-block;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;margin-right:2px;' +
              'font-family:' + p.labelFont + ';color:#fff;background:' + col + ';">' + esc(comp.short) + '</span>'
          : "";
      }).join("");

      var qRatio    = qsc.total > 0 ? qsc.earned / qsc.total : 0;
      var noteColor = qsc.total > 0
        ? (qRatio >= 0.75 ? p.success : qRatio >= 0.5 ? p.warning : p.danger)
        : p.textDim;

      var trColor = estDifficile ? p.danger : estPiege ? p.warning : p.text;
      var trStyle = (estDifficile || estPiege) ? 'font-weight:600;' : '';

      // Lien audio (si activé)
      var qLabelHtml;
      if (cfg.soundLinksEnabled && cfg.soundBaseUrl) {
        var audioUrl = cfg.soundBaseUrl + buildAudioFilename(cfg.nomDS, cfg.studentNom, ex.title, q.label, cfg.soundAudioExt || "webm");
        qLabelHtml = '<a href="' + audioUrl + '" target="_blank" style="color:' + p.accent + ';text-decoration:none;border-bottom:1px solid ' + p.accent + '44;">' + esc(q.label) + '</a>';
      } else {
        qLabelHtml = esc(q.label);
      }

      // Barre de score par question (56 px de large, 4 px de haut)
      var scoreBarW = Math.round(qRatio * 56);
      var scoreCellHtml =
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<div style="width:56px;height:4px;background:' + p.border + ';border-radius:99px;overflow:hidden;flex:none;">' +
            '<div style="width:' + scoreBarW + 'px;height:100%;background:' + noteColor + ';border-radius:99px;"></div>' +
          '</div>' +
          '<span style="font-family:' + p.labelFont + ';font-size:11px;color:' + noteColor + ';font-weight:600;white-space:nowrap;">' +
            fmtFr(qsc.earned) + '/' + fmtFr(qsc.total) +
          '</span>' +
        '</div>';

      tbodyRows +=
        '<tr style="' + trStyle + '">' +
          '<td style="padding:4px 6px;border-bottom:1px solid ' + p.border + '44;color:' + trColor + ';white-space:nowrap;">' +
            qLabelHtml + bonusMark + etoile + piegeMark +
          '</td>' +
          '<td style="padding:4px 6px;border-bottom:1px solid ' + p.border + '44;">' + compSpans + '</td>' +
          '<td style="padding:4px 6px;border-bottom:1px solid ' + p.border + '44;">' + scoreCellHtml + '</td>' +
          '<td style="padding:4px 6px;border-bottom:1px solid ' + p.border + '44;color:' + p.textMuted + ';font-size:10px;font-style:italic;">' +
            esc(remLabels) +
          '</td>' +
        '</tr>';
    });

    // Ligne bonus exercice complet (si déclenché) — conservée dans la table
    if (ex.bonusComplet && bonusCompletConfig) {
      var bonusPts = bonusCompletPoints(grades, student.id, ex, bonusCompletConfig);
      if (bonusPts > 0) {
        tbodyRows +=
          '<tr>' +
            '<td colspan="3" style="padding:4px 6px;font-size:10px;font-weight:700;color:' + p.success + ';border-top:1px solid ' + p.border + '44;">' +
              '🏆 Bonus exercice complet +' + fmtFr(bonusPts) + ' pt' + (bonusPts > 1 ? 's' : '') +
            '</td>' +
            '<td style="padding:4px 6px;border-top:1px solid ' + p.border + '44;"></td>' +
          '</tr>';
      }
    }

    // ── Table questions ──
    var tableHtml =
      '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
        '<thead><tr>' +
          ['Q.', 'Comp.', 'Score', 'Commentaire'].map(function(h) {
            return '<th style="text-align:left;padding:3px 6px 6px;font-family:' + p.labelFont + ';font-size:10px;' +
              'font-weight:400;letter-spacing:.06em;text-transform:uppercase;color:' + p.textDim + ';border-bottom:1px solid ' + p.border + ';">' + h + '</th>';
          }).join('') +
        '</tr></thead>' +
        '<tbody>' + tbodyRows + '</tbody>' +
      '</table>';

    // ── Sidebar « Dans la classe » ──
    var SW = 118;
    var Xsb = function(v) {
      return (sc.total > 0 ? Math.min(SW, Math.max(0, (v / sc.total) * SW)) : 0).toFixed(1);
    };
    var moyX = Xsb(eMoy);
    var youX = Xsb(sc.earned);

    // Étiquette "Vous" : à gauche du point si l'élève est dans le dernier quart
    var youLblX  = sc.total > 0 && sc.earned / sc.total > 0.75 ? (parseFloat(youX) - 3).toFixed(1) : (parseFloat(youX) + 3).toFixed(1);
    var youAnchor = sc.total > 0 && sc.earned / sc.total > 0.75 ? 'end' : 'start';

    var sidebarSvg =
      '<svg viewBox="0 0 ' + SW + ' 34" style="width:100%;height:34px;display:block;margin-top:8px;" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="0" y="13" width="' + SW + '" height="4" rx="2" fill="' + p.border + '"/>' +
        '<rect x="' + moyX + '" y="9" width="1.5" height="12" rx="0.5" fill="' + p.textDim + '"/>' +
        '<circle cx="' + youX + '" cy="15" r="4.5" fill="' + p.accent + '" stroke="' + p.card + '" stroke-width="1.5"/>' +
        '<text x="0" y="32" font-family="monospace" font-size="8.5" fill="' + p.textMuted + '">0</text>' +
        '<text x="' + moyX + '" y="7" text-anchor="middle" font-family="monospace" font-size="7.5" fill="' + p.textDim + '">' + fmtFr(eMoy) + '</text>' +
        '<text x="' + SW + '" y="32" text-anchor="end" font-family="monospace" font-size="8.5" fill="' + p.textMuted + '">' + fmtFr(sc.total) + '</text>' +
      '</svg>';

    var sidebarHtml =
      '<div style="width:128px;flex:none;">' +
        '<div style="font-family:' + p.labelFont + ';font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:' + p.textMuted + ';margin-bottom:8px;">Dans la classe</div>' +
        '<table style="font-size:11px;border-collapse:collapse;width:100%;">' +
          '<tr>' +
            '<td style="padding:1px 0;color:' + p.textMuted + ';font-family:' + p.labelFont + ';font-size:10px;">Copies</td>' +
            '<td style="padding:1px 0;text-align:right;font-weight:600;color:' + p.text + ';">' + nbCopies + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:1px 0;color:' + p.textMuted + ';font-family:' + p.labelFont + ';font-size:10px;">Moyenne</td>' +
            '<td style="padding:1px 0;text-align:right;font-weight:600;color:' + p.text + ';">' + fmtFr(eMoy) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:1px 0;color:' + p.textMuted + ';font-family:' + p.labelFont + ';font-size:10px;">Maximum</td>' +
            '<td style="padding:1px 0;text-align:right;font-weight:600;color:' + p.text + ';">' + fmtFr(eMax) + '</td>' +
          '</tr>' +
        '</table>' +
        sidebarSvg +
      '</div>';

    // ── Carte exercice complète ──
    html +=
      '<div style="background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + br + ';padding:14px 16px;margin-bottom:10px;break-inside:avoid;">' +
        headerHtml +
        progHtml +
        '<div style="display:flex;gap:16px;align-items:flex-start;">' +
          '<div style="flex:1;min-width:0;">' + tableHtml + '</div>' +
          sidebarHtml +
        '</div>' +
      '</div>';
  });

  return html;
}

// Barème détaillé
function blocBareme(student, exam, grades, cfg, p) {
  if (!cfg.bareme) return "";
  var br = p.radius + "px";
  var items = [];
  exam.exercises.forEach(function(ex) {
    ex.questions.forEach(function(q) {
      var aTraite = q.items.some(function(it) { return grades[gradeKey(student.id, it.id)]; })
        || grades[treatedKey(student.id, q.id)];
      if (!aTraite) return;
      q.items.forEach(function(it) {
        var itChecked = !!grades[gradeKey(student.id, it.id)];
        if (it.negative && !itChecked) return;
        items.push({
          exTitle: ex.title, qLabel: q.label, bonus: q.bonus, label: it.label,
          earned: itChecked ? (parseFloat(it.points) || 0) : 0,
          total: parseFloat(it.points) || 0,
          negative: !!it.negative,
          isBonusComplet: false,
        });
      });
    });
    // Ligne bonus exercice complet si déclenché
    if (ex.bonusComplet && cfg.bonusCompletConfig) {
      var bonusPts = bonusCompletPoints(grades, student.id, ex, cfg.bonusCompletConfig);
      if (bonusPts > 0) {
        items.push({
          exTitle: ex.title, qLabel: null, bonus: false, label: "🏆 Bonus exercice complet",
          earned: bonusPts, total: bonusPts, isBonusComplet: true,
        });
      }
    }
  });
  if (!items.length) return "";

  var html = sectionTitle("Barème détaillé", p) +
    '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;">' +
    '<thead><tr>' +
    ['Item', '/pts', 'Obtenu'].map(function(h) {
      return '<th style="text-align:left;padding:3px 8px;color:' + p.textDim + ';font-weight:600;border-bottom:1px solid ' + p.border + ';">' + h + '</th>';
    }).join('') + '</tr></thead><tbody>';

  var lastEx = null;
  items.forEach(function(it) {
    if (it.exTitle !== lastEx) {
      html += '<tr><td colspan="3" style="padding:8px 8px 2px;color:' + p.accent + ';font-weight:700;">' + esc(it.exTitle) + '</td></tr>';
      lastEx = it.exTitle;
    }
    var check = it.negative ? "− " : (it.earned > 0 ? "✓ " : "· ");
    var earnColor = it.negative ? p.negText : (it.earned > 0 ? p.success : p.textDim);
    var itemLabelColor = it.negative ? p.negText : p.textMuted;
    var itemLabel = it.isBonusComplet
      ? esc(it.label)
      : check + '[Q.' + esc(it.qLabel) + (it.bonus ? " 🎁" : "") + '] ' + esc(it.label);
    var itemStyle = it.isBonusComplet
      ? 'padding:2px 8px;border-bottom:1px solid ' + p.border + '44;font-size:10px;color:' + p.success + ';font-weight:700;'
      : 'padding:2px 8px;border-bottom:1px solid ' + p.border + '44;font-size:10px;color:' + itemLabelColor + ';';
    html += '<tr>' +
      '<td style="' + itemStyle + '">' + itemLabel + '</td>' +
      '<td style="padding:2px 8px;border-bottom:1px solid ' + p.border + '44;text-align:center;font-family:monospace;">' + (it.isBonusComplet ? '+' : '') + fmt1(it.total) + '</td>' +
      '<td style="padding:2px 8px;border-bottom:1px solid ' + p.border + '44;text-align:center;font-family:monospace;color:' + earnColor + ';font-weight:700;">' + (it.isBonusComplet ? '+' : '') + fmt1(it.earned) + '</td>' +
      '</tr>';
  });
  return html + '</tbody></table>';
}

// ─── CSS global ───────────────────────────────────────────────────

function buildCSS(p) {
  var ruledBg = p.ruled > 0
    ? "background-image:repeating-linear-gradient(transparent,transparent 31px," + p.ruledLine + "55 31px," + p.ruledLine + "55 32px);background-position:0 8px;"
    : "";
  return [
    "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
    "body { font-family: " + p.bodyFont + "; background: " + p.bg + "; color: " + p.text + "; font-size: 14px; line-height: 1.5; " + ruledBg + " }",
    ".page { max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }",
    "@media screen and (max-width: 500px) { .page { padding: 14px 10px 32px; } }",
    "@page { size: A4; margin: 0; }",
    "@media print { body { background: #fff !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .page { padding: 10mm 8mm; width: 210mm; max-width: 210mm; margin: 0 auto; } .no-print { display: none !important; } .comp-view-radar { display: none !important; } .comp-view-bars { display: flex !important; } }",
  ].join("\n");
}

// ─── Assemblage principal ─────────────────────────────────────────

export function genererHtmlEleve(opts) {
  var student = opts.student, exam = opts.exam, grades = opts.grades;
  var remarks = opts.remarks, absents = opts.absents, allStudents = opts.allStudents;
  var nomDS = opts.nomDS, dateDS = opts.dateDS, seuils = opts.seuils;
  var seuilDifficile = opts.seuilDifficile, seuilReussite = opts.seuilReussite;
  var getNote20 = opts.getNote20, getBrut20 = opts.getBrut20, rankMap = opts.rankMap;
  var malusPaliers = opts.malusPaliers, malusManuel = opts.malusManuel;
  var commentaires = opts.commentaires, allRemarques = opts.allRemarques;

  var cfg = Object.assign({}, DEFAULT_HTML_CONFIG, opts.htmlConfig, {
    statsEleve: Object.assign({}, DEFAULT_HTML_CONFIG.statsEleve, ((opts.htmlConfig) || {}).statsEleve),
    statsClasse: Object.assign({}, DEFAULT_HTML_CONFIG.statsClasse, ((opts.htmlConfig) || {}).statsClasse),
    nomDS: opts.nomDS || "",
    studentNom: (opts.student && opts.student.nom) || "",
    soundLinksEnabled: !!opts.soundLinksEnabled,
    soundBaseUrl: opts.soundBaseUrl || "",
    soundAudioExt: opts.soundAudioExt || "webm",
    bonusCompletConfig: opts.bonusCompletConfig || null,
  });
  var ft = opts.features || { competences: true, coefficients: true, questionBonus: true, bonusComplet: true, malusAuto: true, questionPiege: true };

  var p = paletteTheme(cfg.theme);
  // Compatibilité ascendante : l'ancien champ "light"/"dark" devient "light"/"dark"/"young"
  // (pas de changement nécessaire, paletteTheme gère les trois)

  var presents = allStudents.filter(function(s) { return !absents[s.id]; });
  var effectif = presents.length;

  var noteNorm = getNote20(student.id);
  var noteBrute = getBrut20(student.id);
  var rang = rankMap[student.id] || effectif;

  var comps = notesParCompetence(grades, student.id, exam, seuils);

  var compPcts = {};
  COMPETENCES.forEach(function(c) {
    var maxT = 0, obt = 0;
    exam.exercises.forEach(function(ex) {
      ex.questions.forEach(function(q) {
        if (q.competences.indexOf(c.id) < 0) return;
        var qTraitee = grades[treatedKey(student.id, q.id)]
          || q.items.some(function(it) { return grades[gradeKey(student.id, it.id)]; });
        if (qTraitee) {
          maxT += q.items.reduce(function(s, it) { return s + (parseFloat(it.points) || 0); }, 0);
          q.items.forEach(function(it) {
            if (grades[gradeKey(student.id, it.id)]) obt += parseFloat(it.points) || 0;
          });
        }
      });
    });
    compPcts[c.id] = maxT > 0 ? obt / maxT : 0;
  });

  var allNotes = presents.map(function(s) { return getNote20(s.id); });
  var stuMalus = malusTotal(remarks, student.id, exam, malusPaliers, malusManuel, allRemarques);
  var ratioJ = ratioJustesse(grades, student.id, exam);
  var ratioE = ratioEfficacite(grades, student.id, exam);
  // Statistiques classe pour le band KPI
  var scoreBrut = studentTotal(grades, student.id, exam);
  var examTot = examTotal(exam);
  var tjAll = presents.map(function(s) { return ratioJustesse(grades, s.id, exam); });
  var tjMoy = tjAll.reduce(function(a, b) { return a + b; }, 0) / (tjAll.length || 1);
  var teAll = presents.map(function(s) { return ratioEfficacite(grades, s.id, exam); });
  var teMoy = teAll.reduce(function(a, b) { return a + b; }, 0) / (teAll.length || 1);
  var allBruts = presents.map(function(s) { return studentTotal(grades, s.id, exam); });
  var brutMoy = allBruts.reduce(function(a, b) { return a + b; }, 0) / (allBruts.length || 1);
  var commentaire = (commentaires && commentaires[student.id]) || "";

  var genDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  // ── Carte Stellaire (optionnelle) ────────────────────────────────
  var blocStarMapHtml = "";
  if (cfg.starMap && typeof document !== "undefined" && document.createElement) {
    try {
      var smCanvas = document.createElement("canvas");
      smCanvas.width = 660;
      smCanvas.height = 430;

      // classRates : proportion d'élèves ayant ≥50 % des pts de la question
      var smRates = {};
      exam.exercises.forEach(function(ex) {
        ex.questions.forEach(function(q) {
          var qMax = q.items.reduce(function(s, it) { return it.negative ? s : s + (parseFloat(it.points) || 0); }, 0);
          var thresh = qMax * 0.5;
          var ok = allStudents.filter(function(st) {
            var earned = q.items.reduce(function(sum, it) {
              return sum + (grades[gradeKey(st.id, it.id)] ? (parseFloat(it.points) || 0) : 0);
            }, 0);
            return earned >= thresh;
          }).length;
          smRates[q.id] = allStudents.length > 0 ? ok / allStudents.length : 0;
        });
      });

      // Grades filtrés pour cet élève : { itemId: true }
      var smGrades = {};
      exam.exercises.forEach(function(ex) {
        ex.questions.forEach(function(q) {
          q.items.forEach(function(it) {
            if (grades[gradeKey(student.id, it.id)]) smGrades[it.id] = true;
          });
        });
      });

      var smDataUrl = renderStarMap(smCanvas, exam, smGrades, smRates, p, { jitterSeed: student.id });
      blocStarMapHtml =
        '<div class="bento bento-full">' +
        '<div class="bento-title">✦ Carte Stellaire</div>' +
        '<img src="' + smDataUrl + '" style="max-width:660px;width:100%;border-radius:8px;display:block;margin:0 auto;">' +
        //'<p style="font-size:10px;color:' + p.textDim + ';margin:6px 0 0;">Luminosité = score · Taille = difficulté · Couleur = compétence(s)</p>' +
        '</div>';
    } catch (e) {
      // Canvas non disponible (Node.js ou erreur) : bloc ignoré silencieusement
    }
  }


  // ── Zone centrale : blocs ordonnables et redimensionnables ──
  var BLOC_RENDERERS = {
    stats:       function() { return blocStats(student, presents, getNote20, ratioJ, ratioE, stuMalus, cfg, p, scoreBrut, examTot, tjMoy, teMoy, brutMoy); },
    starMap:     function() { return blocStarMapHtml; },
  };

  var blockOrder  = (cfg.blockOrder  && cfg.blockOrder.length)  ? cfg.blockOrder  : DEFAULT_HTML_CONFIG.blockOrder;
  var blockLayout = cfg.blockLayout || DEFAULT_HTML_CONFIG.blockLayout;

  // Rendre chaque bloc et filtrer les vides
  var renderedBlocs = [];
  blockOrder.forEach(function(key) {
    var renderer = BLOC_RENDERERS[key];
    if (!renderer) return;
    var html = renderer();
    if (html && html.trim()) {
      renderedBlocs.push({ layout: (blockLayout[key] === "half") ? "half" : "full", html: html });
    }
  });

  // Anti-orphelin : un "half" seul dans sa rangée est promu "full"
  renderedBlocs.forEach(function(bloc, i) {
    if (bloc.layout !== "half") return;
    var prevHalf = i > 0 && renderedBlocs[i - 1].layout === "half";
    var nextHalf = i < renderedBlocs.length - 1 && renderedBlocs[i + 1].layout === "half";
    if (!prevHalf && !nextHalf) bloc.layout = "full";
  });

  // Conteneur CSS Grid 2 colonnes
  var zoneGrid =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:0;">' +
    renderedBlocs.map(function(bloc) {
      return '<div style="grid-column:span ' + (bloc.layout === "half" ? "1" : "2") + ';">' + bloc.html + '</div>';
    }).join("") +
    '</div>';

  var body =
    blocHeader(student, noteNorm, noteBrute, rang, effectif, cfg, p, nomDS, dateDS) +
    blocCommentaire(commentaire, cfg, p) +
    zoneGrid +
    blocDiagnosticRow(comps, compPcts, allNotes, noteNorm, presents, getNote20, student.id, cfg, p, ft) +
    blocDetailExercices(student, exam, grades, remarks, presents, allRemarques, cfg, p, seuilDifficile, seuilReussite, opts.seuilPiege || 30, cfg.bonusCompletConfig, ft, opts.clampQuestion !== false) +
    blocBareme(student, exam, grades, cfg, p) +
    '<div style="margin-top:32px;padding-top:10px;border-top:1px solid ' + p.border + ';font-size:10px;color:' + p.textDim + ';display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">' +
      '<span>' + esc(ETABLISSEMENT.nom) + ' — ' + esc(nomDS || "") + (dateDS ? " · " + esc(dateDS) : "") + '</span>' +
      '<span>Généré le ' + genDate + '</span>' +
    '</div>';

  return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n' +
    '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(nomDS || "Rapport") + ' — ' + esc(student.prenom) + ' ' + esc(student.nom) + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="' + googleFontsUrl(cfg.theme) + '" rel="stylesheet">\n' +
    '<style>\n' + buildCSS(p) + '\n</style>\n' +
    '</head>\n<body>\n' +
    '<button onclick="window.print()" class="no-print" title="Imprimer / Enregistrer en PDF&#10;Marges : aucune · Échelle : 100 % · Arrière-plans : activé" style="position:fixed;top:16px;right:16px;padding:8px;background:' + p.accent + ';color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.15);z-index:100;">🖨️</button>' +
    '<div class="page">\n' +
    body +
    '\n</div>\n</body>\n</html>';
}

// ─── Export tous élèves ───────────────────────────────────────────

export function genererHtmlTousPrintable(opts) {
  var nomDS = opts.nomDS;
  var students = opts.students;
  var absents = opts.absents;
  var htmlConfig = opts.htmlConfig || {};
  var theme = htmlConfig.theme || "light";

  var presents = students.filter(function(s) { return !absents[s.id]; });

  // Calcul du rankMap (même logique que genererHtmlTous)
  var ranked = presents.map(function(s) { return { id: s.id, note: opts.getNote20(s.id) }; })
    .sort(function(a, b) { return b.note - a.note; });
  var rg = 1;
  var rankMap = {};
  ranked.forEach(function(r, i) {
    if (i > 0 && r.note < ranked[i - 1].note) rg = i + 1;
    rankMap[r.id] = rg;
  });

  // Génère chaque rapport complet puis extrait le contenu <body>
  var bodies = presents.map(function(student) {
    var full = genererHtmlEleve(Object.assign({}, opts, {
      student: student,
      allStudents: students,
      rankMap: rankMap,
    }));
    var bodyMatch = full.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : full;
  });

  var p = paletteTheme(theme);

  // CSS : styles individuels + règles de saut de page + séparateur visuel écran
  var css = buildCSS(p) + '\n' +
    '.page-eleve { page-break-after: always; break-after: page; }\n' +
    '.page-eleve:last-child { page-break-after: avoid; break-after: avoid; }\n' +
    '@media screen { .page-eleve { border-bottom: 2px dashed ' + p.border + '; margin-bottom: 48px; padding-bottom: 32px; } }\n';

  var pages = bodies.map(function(body) {
    // Le bouton 🖨️ déjà présent dans chaque body est retiré
    // pour n'en garder qu'un seul sur le document global
    var cleanBody = body.replace(/<button[^>]*class="no-print"[^>]*>[\s\S]*?<\/button>/g, '');
    return '<div class="page-eleve">\n' + cleanBody + '\n</div>';
  }).join('\n');

  var printBtn = '<button onclick="window.print()" class="no-print"' +
    ' title="Imprimer / Enregistrer en PDF&#10;Marges : aucune · Échelle : 100 % · Arrière-plans : activé"' +
    ' style="position:fixed;top:16px;right:16px;padding:8px;background:' + p.accent + ';color:#fff;' +
    'border:none;border-radius:8px;cursor:pointer;font-size:16px;line-height:1;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.15);z-index:100;">🖨️</button>';

  return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n' +
    '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>Impression — ' + esc(nomDS || 'Rapports') + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="' + googleFontsUrl(theme) + '" rel="stylesheet">\n' +
    '<style>\n' + css + '\n</style>\n' +
    '</head>\n<body>\n' +
    printBtn + '\n' +
    pages + '\n' +
    '</body>\n</html>';
}

export function genererScriptsConversionPdf(nomDS) {
  var slug = (nomDS || "DS").replace(/\s+/g, "_");

  var sh = [
    '#!/bin/bash',
    '# Conversion des rapports HTML en PDF individuels',
    '# Prérequis : pip install weasyprint',
    'set -e',
    'echo "Conversion de ' + slug + '..."',
    'for f in CR_' + slug + '_*.html; do',
    '  [ -f "$f" ] || continue',
    '  out="${f%.html}.pdf"',
    '  echo "  → $out"',
    '  weasyprint "$f" "$out"',
    'done',
    'echo "Terminé."',
    '',
  ].join('\n');

  var py = [
    '#!/usr/bin/env python3',
    '# Conversion des rapports HTML en PDF individuels',
    '# Prérequis : pip install weasyprint',
    'import glob, subprocess, sys',
    'pattern = "CR_' + slug + '_*.html"',
    'files = sorted(glob.glob(pattern))',
    'if not files:',
    '    print(f"Aucun fichier trouvé ({pattern})")',
    '    sys.exit(1)',
    'print(f"{len(files)} fichier(s) à convertir...")',
    'for f in files:',
    '    out = f[:-5] + ".pdf"',
    '    print(f"  → {out}")',
    '    subprocess.run(["weasyprint", f, out], check=True)',
    'print("Terminé.")',
    '',
  ].join('\n');

  return { sh: sh, py: py };
}

export function genererHtmlTous(opts) {
  var exam = opts.exam, students = opts.students, grades = opts.grades;
  var remarks = opts.remarks, absents = opts.absents, nomDS = opts.nomDS;
  var presents = students.filter(function(s) { return !absents[s.id]; });

  var ranked = presents.map(function(s) { return { id: s.id, note: opts.getNote20(s.id) }; })
    .sort(function(a, b) { return b.note - a.note; });
  var rg = 1;
  var rankMap = {};
  ranked.forEach(function(r, i) {
    if (i > 0 && r.note < ranked[i - 1].note) rg = i + 1;
    rankMap[r.id] = rg;
  });

  return presents.map(function(student) {
    var slug = slugify(student.nom + "_" + student.prenom);
    var filename = "CR_" + (nomDS || "DS").replace(/\s+/g, "_") + "_" + slug + ".html";
    var content = genererHtmlEleve(Object.assign({}, opts, { student: student, allStudents: students, rankMap: rankMap }));
    return { filename: filename, content: content };
  });
}

// ─── Rapport de classe (projection) ──────────────────────────────

export function genererRapportClasse(opts) {
  var exam = opts.exam, students = opts.students, grades = opts.grades;
  var absents = opts.absents, seuils = opts.seuils;
  var seuilDifficile = opts.seuilDifficile, seuilReussite = opts.seuilReussite;
  var seuilPiege = opts.seuilPiege || 30;
  var getNote20 = opts.getNote20;
  var commentaire = opts.commentaire || "";
  var bonusCompletConfig = opts.bonusCompletConfig || null;
  var ft = opts.features || {};

  var cfg = Object.assign({}, DEFAULT_RAPPORT_CLASSE_CONFIG, opts.rapportClasseConfig);
  var theme = (opts.htmlConfig && opts.htmlConfig.theme) || "light";
  var p = paletteTheme(theme);

  var presents = students.filter(function(s) { return !absents[s.id]; });
  var effectif = presents.length;
  var corriges = presents.filter(function(s) {
    return exam.exercises.some(function(ex) {
      return ex.questions.some(function(q) {
        return grades[treatedKey(s.id, q.id)] || q.items.some(function(it) { return grades[gradeKey(s.id, it.id)]; });
      });
    });
  });
  var allNotes = corriges.map(function(s) { return getNote20(s.id); });
  var sorted = allNotes.slice().sort(function(a, b) { return a - b; });
  var moy = allNotes.length ? allNotes.reduce(function(a, b) { return a + b; }, 0) / allNotes.length : 0;
  var med = sorted.length ? (sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)]) : 0;
  var minN = sorted.length ? sorted[0] : 0;
  var maxN = sorted.length ? sorted[sorted.length - 1] : 0;

  // Compétences moyennes classe
  var compPcts = {};
  COMPETENCES.forEach(function(c) {
    var totalObt = 0, totalMax = 0;
    presents.forEach(function(s) {
      exam.exercises.forEach(function(ex) {
        ex.questions.forEach(function(q) {
          if (q.competences.indexOf(c.id) < 0) return;
          var qTraitee = grades[treatedKey(s.id, q.id)] || q.items.some(function(it) { return grades[gradeKey(s.id, it.id)]; });
          if (qTraitee) {
            totalMax += q.items.reduce(function(acc, it) { return acc + (parseFloat(it.points) || 0); }, 0);
            q.items.forEach(function(it) { if (grades[gradeKey(s.id, it.id)]) totalObt += parseFloat(it.points) || 0; });
          }
        });
      });
    });
    compPcts[c.id] = totalMax > 0 ? totalObt / totalMax : 0;
  });

  // ── Bloc commentaire ──
  function blocCommentaireDS() {
    if (!cfg.commentaire || !commentaire.trim()) return "";
    return '<div class="bento bento-full" style="background:' + p.accent + '18;border-left:4px solid ' + p.accent + ';">' +
      '<div class="bento-title">Commentaire</div>' +
      '<div style="font-size:1.05rem;line-height:1.7;color:' + p.text + ';white-space:pre-wrap;">' + esc(commentaire) + '</div>' +
      '</div>';
  }

  // ── Bloc stats globales ──
  function blocStatsGlobales() {
    if (!cfg.statsGlobales) return "";
    function kpiCard(label, val, color) {
      return '<div style="background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + p.radius + 'px;padding:1rem 1.2rem;text-align:center;min-width:110px;">' +
        '<div style="font-size:2.4rem;font-weight:700;color:' + color + ';line-height:1;">' + fmt1(val) + '</div>' +
        '<div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.09em;color:' + p.textMuted + ';margin-top:6px;">' + label + '</div>' +
        '</div>';
    }
    function kpiCardInt(label, val, color) {
      return '<div style="background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + p.radius + 'px;padding:1rem 1.2rem;text-align:center;min-width:110px;">' +
        '<div style="font-size:2.4rem;font-weight:700;color:' + color + ';line-height:1;">' + fmt0(val) + '</div>' +
        '<div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.09em;color:' + p.textMuted + ';margin-top:6px;">' + label + '</div>' +
        '</div>';
    }
    return '<div class="bento bento-full">' +
      '<div class="bento-title">Statistiques</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.8rem;margin-top:0.6rem;justify-content:flex-start;">' +
      kpiCard("Moyenne", moy, p.accent) +
      kpiCard("Médiane", med, p.success) +
      kpiCard("Min", minN, p.danger) +
      kpiCard("Max", maxN, p.success) +
      kpiCardInt("Élèves", effectif, p.textMuted) +
      '</div></div>';
  }

  // ── Bloc distribution ──
  function blocDistribution() {
    if (!cfg.distribution) return "";
    return '<div class="bento bento-full">' +
      '<div class="bento-title">Distribution</div>' +
      '<div style="margin-top:0.6rem;width:100%;">' + svgHistoClasse(allNotes, moy, p) + '</div>' +
      '</div>';
  }

  // ── Bloc compétences ──
  function blocCompetencesClasse() {
    if (!cfg.parCompetence || !ft.competences) return "";
    var barres = COMPETENCES.map(function(c) {
      var pct = compPcts[c.id] || 0;
      var color = pct >= 0.75 ? p.success : pct >= 0.50 ? p.warning : p.danger;
      var compColor = p.compColors[c.id] || p.accent;
      return '<div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:0.6rem;">' +
        '<span style="font-weight:700;font-size:1rem;color:' + compColor + ';min-width:1.6rem;text-align:center;">' + c.id + '</span>' +
        '<div style="flex:1;background:' + p.border + ';border-radius:6px;height:18px;overflow:hidden;">' +
          '<div style="width:' + Math.round(pct * 100) + '%;background:' + color + ';height:100%;border-radius:6px;transition:width 0.3s;"></div>' +
        '</div>' +
        '<span style="font-size:0.9rem;font-weight:700;color:' + color + ';min-width:3rem;text-align:right;">' + Math.round(pct * 100) + ' %</span>' +
        '</div>';
    }).join("");
    return '<div class="bento bento-full">' +
      '<div class="bento-title">Compétences</div>' +
      '<div style="margin-top:0.8rem;max-width:700px;">' + barres + '</div>' +
      '</div>';
  }

  // ── Bloc par exercice ──
  function svgHistoExercice(ex, p) {
    var questions = ex.questions;
    var n = questions.length;
    if (n === 0) return "";

    var width = Math.max(260, n * 60 + 40);
    var height = 160;
    var padL = 32, padR = 10, padT = 24, padB = 40;
    var innerW = width - padL - padR;
    var innerH = height - padT - padB;
    var barW = Math.min(44, innerW / n - 6);

    var qStats = questions.map(function(q) {
      var qMax = q.items.reduce(function(s, it) { return it.negative ? s : s + (parseFloat(it.points) || 0); }, 0);
      if (qMax === 0) return { tauxReussite: 0, tauxTraitement: 0 };
      var nbTraitants = presents.filter(function(s) {
        return grades[treatedKey(s.id, q.id)] || q.items.some(function(it) { return grades[gradeKey(s.id, it.id)]; });
      }).length;
      var tauxTraitement = presents.length > 0 ? (nbTraitants / presents.length) * 100 : 0;
      if (nbTraitants === 0) return { tauxReussite: 0, tauxTraitement: tauxTraitement };
      var obt = presents.reduce(function(s, st) {
        return s + q.items.reduce(function(ss, it) {
          return ss + (grades[gradeKey(st.id, it.id)] ? (parseFloat(it.points) || 0) : 0);
        }, 0);
      }, 0);
      return { tauxReussite: obt / (nbTraitants * qMax), tauxTraitement: tauxTraitement };
    });

    var bars = questions.map(function(q, i) {
      var t = qStats[i].tauxReussite;
      var tauxTr = qStats[i].tauxTraitement;
      var color = t >= 0.75 ? p.success : t >= 0.50 ? p.warning : p.danger;
      var bh = Math.max(3, t * innerH);
      var x = padL + i * (innerW / n) + (innerW / n - barW) / 2;
      var y = padT + innerH - bh;
      var pctLabel = Math.round(t * 100) + "%";

      var isDiff = t < (seuilDifficile / 100);
      var isPiege = ft.questionPiege && tauxTr >= 50 && t > 0 && t < (seuilPiege / 100);
      var badge = isPiege ? "⚠" : isDiff ? "●" : "";
      var badgeColor = isPiege ? p.warning : p.danger;

      var label = q.label.length > 6 ? q.label.substring(0, 6) + "…" : q.label;

      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW + '" height="' + bh.toFixed(1) + '" fill="' + color + '" rx="3"/>' +
        '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" font-size="9" fill="' + p.textMuted + '" font-family="monospace">' + pctLabel + '</text>' +
        '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (padT + innerH + 14) + '" text-anchor="middle" font-size="9" fill="' + p.text + '" font-family="monospace">' + esc(label) + '</text>' +
        (badge ? '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (padT + innerH + 26) + '" text-anchor="middle" font-size="10" fill="' + badgeColor + '">' + badge + '</text>' : '');
    }).join("");

    var axis = '<line x1="' + padL + '" y1="' + (padT + innerH).toFixed(1) + '" x2="' + (width - padR) + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="' + p.border + '" stroke-width="1"/>';

    var yTicks = [0, 0.5, 1].map(function(v) {
      var y = padT + innerH - v * innerH;
      return '<line x1="' + (padL - 4) + '" y1="' + y.toFixed(1) + '" x2="' + padL + '" y2="' + y.toFixed(1) + '" stroke="' + p.border + '" stroke-width="0.8"/>' +
        '<text x="' + (padL - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="8" fill="' + p.textMuted + '" font-family="monospace">' + Math.round(v * 100) + '%</text>';
    }).join("");

    return '<svg width="100%" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;">' +
      axis + yTicks + bars + '</svg>';
  }


  function blocsParExercice() {
    if (!cfg.parExercice) return "";
    return exam.exercises.map(function(ex) {
      var exMax = ex.questions.reduce(function(s, q) {
        return s + q.items.reduce(function(ss, it) { return ss + (parseFloat(it.points) || 0); }, 0);
      }, 0);
      var exMoy = presents.length ? presents.reduce(function(s, st) {
        return s + exerciseScore(grades, st.id, ex, bonusCompletConfig).earned;
      }, 0) / presents.length : 0;
      var exTaux = exMax > 0 ? exMoy / exMax : 0;
      var exColor = exTaux >= 0.75 ? p.success : exTaux >= 0.50 ? p.warning : p.danger;

      return '<div class="bento bento-full">' +
        '<div class="bento-title">' + esc(ex.title) +
          '<span style="margin-left:0.6rem;font-size:0.8rem;font-weight:700;color:' + exColor + ';">' + Math.round(exTaux * 100) + '%</span>' +
        '</div>' +
        '<div style="margin-top:0.4rem;">' + svgHistoExercice(ex, p) + '</div>' +
        '</div>';
    }).join("");
  }

  var nomDS = exam.nomDS || "";
  var dateDS = exam.dateDS || "";
  var genDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  var css = [
    "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
    "body { font-family: " + p.bodyFont + "; background: " + p.bg + "; color: " + p.text + "; font-size: 15px; line-height: 1.5; }",
    ".page { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1.5rem 3rem; }",
    "@page { size: A4 landscape; margin: 1.5cm; }",
    "@media print { .no-print { display: none !important; } body { background: #fff; } .page { padding: 0; } }",
    ".bento { background: " + p.card + "; border: 1px solid " + p.border + "; border-radius: " + p.radius + "px; padding: 1.2rem 1.4rem; }",
    ".bento-full { grid-column: 1 / -1; }",
    ".bento-wide { grid-column: span 2; }",
    ".bento-title { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: " + p.textMuted + "; font-weight: 700; margin-bottom: 0.3rem; }",
    ".grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem; margin-top: 1.2rem; }",
    "@media (max-width: 700px) { .bento-wide { grid-column: span 1; } }",
  ].join("\n");

  var header = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1.2rem;">' +
    '<div style="font-family:' + p.headerFont + ';font-size:1.6rem;font-weight:700;color:' + p.text + ';">' + esc(nomDS) + (dateDS ? '<span style="font-size:1rem;font-weight:400;color:' + p.textMuted + ';margin-left:0.6rem;">· ' + esc(dateDS) + '</span>' : '') + '</div>' +
    '<div style="font-size:0.8rem;color:' + p.textMuted + ';">Rapport de classe · Généré le ' + genDate + '</div>' +
    '</div>';

  var printBtn = '<script>if(window.self!==window.top){document.addEventListener("DOMContentLoaded",function(){var b=document.getElementById("print-btn");if(b)b.style.display="none";});}<\/script>' +
    '<button id="print-btn" class="no-print" onclick="window.print()" title="Imprimer / Enregistrer en PDF&#10;Marges : aucune · Échelle : 100 % · Arrière-plans : activé" style="position:fixed;top:1rem;right:1rem;padding:8px;background:' + p.accent + ';color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:100;">🖨️</button>';

  var grid = '<div class="grid">' +
    blocCommentaireDS() +
    blocStatsGlobales() +
    blocDistribution() +
    blocCompetencesClasse() +
    blocsParExercice() +
    '</div>';

  var footer = '<div style="margin-top:2rem;padding-top:0.8rem;border-top:1px solid ' + p.border + ';font-size:0.75rem;color:' + p.textDim + ';display:flex;justify-content:space-between;">' +
    '<span>' + esc(ETABLISSEMENT.nom || "") + '</span>' +
    '<span>C.H.E.C.K. — Rapport de classe</span>' +
    '</div>';

  return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n' +
    '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>Rapport de classe — ' + esc(nomDS) + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="' + googleFontsUrl(theme) + '" rel="stylesheet">\n' +
    '<style>\n' + css + '\n</style>\n' +
    '</head>\n<body>\n' +
    printBtn +
    '<div class="page">\n' +
    header + grid + footer +
    '\n</div>\n</body>\n</html>';
}
