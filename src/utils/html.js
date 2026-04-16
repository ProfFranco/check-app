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
  notesParCompetence, malusTotal,
  ratioJustesse, ratioEfficacite,
} from "./calculs";
import { slugify, buildAudioFilename } from "./helpers";

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
  histogramme: true,
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
      danger: "#d06050", ruled: 0.15, radius: 8,
      headerFont: "'Lora', Georgia, serif",
      bodyFont: "'Segoe UI', system-ui, sans-serif",
      compColors: { A: "#5b9bd5", N: "#a882c8", R: "#7bc67e", V: "#e8a838" },
    };
  }
  if (theme === "young") {
    return {
      bg: "#f0f4ff", card: "#ffffff", border: "#c8d5f8", surface: "#e4ecff",
      text: "#1e1b4b", textMuted: "#6b7280", textDim: "#9ca3af",
      accent: "#4f46e5", success: "#059669", warning: "#d97706",
      danger: "#dc2626", ruled: 0, ruledLine: "#c8d5f8", radius: 14,
      headerFont: "'Nunito', 'Quicksand', system-ui, sans-serif",
      bodyFont: "'Nunito', 'Quicksand', system-ui, sans-serif",
      compColors: { A: "#e05a9e", N: "#8b5cf6", R: "#10b981", V: "#f59e0b" },
    };
  }
  // light (défaut)
  return {
    bg: "#faf7f2", card: "#ffffff", border: "#e0d8cc", surface: "#f2ede4",
    text: "#2c2416", textMuted: "#7a7060", textDim: "#b0a898",
    accent: "#2855a0", success: "#2a7a3a", warning: "#c07a10",
    danger: "#b83030", ruled: 0.45, radius: 8,
    headerFont: "'Lora', Georgia, serif",
    bodyFont: "'Segoe UI', system-ui, sans-serif",
    compColors: { A: "#2855a0", N: "#6a3a9a", R: "#2a7a3a", V: "#c07a10" },
  };
}

// ─── Google Fonts à injecter selon le thème ───────────────────────

function googleFontsUrl(theme) {
  if (theme === "young") {
    return "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Quicksand:wght@600;700&display=swap";
  }
  return "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,700&display=swap";
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

function couleurNote(note, p) {
  if (note >= 14) return p.success;
  if (note >= 10) return p.warning;
  return p.danger;
}

function couleurRang(rang, effectif, p) {
  var ratio = rang / effectif;
  return couleurNote(ratio <= 0.25 ? 15 : ratio <= 0.5 ? 11 : 8, p);
}

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
      'font-size="9" font-weight="700" fill="' + col + '" font-family="system-ui,sans-serif">' + esc(c.id) + '</text>';
  }).join("");

  return '<svg width="' + total + '" height="' + total + '" viewBox="0 0 ' + total + ' ' + total + '" ' +
    'xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0;">' +
    grids + surf + dotsAndLabels + '</svg>';
}

function svgRadarGrand(compPcts, p) {
  var total = 220, r = 86, cx = total / 2, cy = total / 2;
  var angles = COMPETENCES.map(function(_, i) {
    return (Math.PI * 2 * i / COMPETENCES.length) - Math.PI / 2;
  });
  function pt(val, i, rr) {
    return [(cx + rr * val * Math.cos(angles[i])).toFixed(1),
            (cy + rr * val * Math.sin(angles[i])).toFixed(1)];
  }
  var grids = [0.5, 1].map(function(lv) {
    var pts = COMPETENCES.map(function(_, i) { return pt(lv, i, r).join(","); }).join(" ");
    return '<polygon points="' + pts + '" fill="none" stroke="' + p.border + '" stroke-width="' + (lv === 1 ? 1 : 0.5) + '"/>';
  }).join("");
  var surfPts = COMPETENCES.map(function(c, i) {
    return pt(compPcts[c.id] || 0, i, r).join(",");
  }).join(" ");
  var surf = '<polygon points="' + surfPts + '" fill="' + p.accent + '33" stroke="' + p.accent + '" stroke-width="1.5"/>';
  var dotsAndLabels = COMPETENCES.map(function(c, i) {
    var pp = pt(compPcts[c.id] || 0, i, r);
    var lp = pt(1.22, i, r);
    return '<circle cx="' + pp[0] + '" cy="' + pp[1] + '" r="3" fill="' + p.accent + '"/>' +
      '<text x="' + lp[0] + '" y="' + lp[1] + '" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="' + (p.compColors[c.id] || p.accent) + '">' + c.id + '</text>';
  }).join("");
  return '<svg width="' + total + '" height="' + total + '" viewBox="0 0 ' + total + ' ' + total + '" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0;">' +
    grids + surf + dotsAndLabels + '</svg>';
}

// ─── SVG Histogramme ─────────────────────────────────────────────

function svgHisto(allNotes, studentNote, p) {
  var width = 340, height = 110;
  var nbBins = 21;
  var bins = [];
  for (var i = 0; i < nbBins; i++) bins.push(0);
  allNotes.forEach(function(n) { bins[Math.min(20, Math.max(0, Math.round(n)))]++; });
  var maxCount = Math.max.apply(null, bins.concat([1]));

  var padL = 24, padR = 8, padT = 8, padB = 20;
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
      '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (y - 2).toFixed(1) + '" text-anchor="middle" font-size="7" fill="' + p.textMuted + '" font-family="monospace">' + count + '</text>';
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

// ─── Blocs HTML ───────────────────────────────────────────────────

// Titre du DS (au-dessus du header card)
function blocTitreDS(nomDS, dateDS, p) {
  var date = dateDS ? '<span style="font-weight:400;font-size:16px;color:' + p.textMuted + ';margin-left:8px;">· ' + esc(dateDS) + '</span>' : "";
  return '<div style="font-family:' + p.headerFont + ';font-size:22px;font-weight:700;color:' + p.text + ';margin-bottom:10px;">' +
    esc(nomDS || "Devoir surveillé") + date + '</div>';
}

// Header card : nom élève + boîtes note/rang
function blocHeader(student, noteNorm, noteBrute, rang, effectif, cfg, p) {
  var br = p.radius + "px";
  var hp = 18; // padding header

  // Fond teinté (accent du bandeau)
  var accentBg = 'background:' + p.accent + '0c;';

  // Boîte note
  var noteVal = cfg.noteNorm ? noteNorm : noteBrute;
  var noteCol = couleurNote(noteVal, p);
  var noteBruteHtml = (cfg.noteNorm && cfg.noteBrute)
    ? '<div style="font-size:10px;color:' + p.textMuted + ';margin-top:2px;">brute ' + fmt1(noteBrute) + '</div>'
    : "";
  var boxHeight = Math.round(32 * 2.4); // taille note px * 2.4
  var nboxStyle = 'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'border:2px solid ' + noteCol + '55;border-radius:' + br + ';background:' + noteCol + '14;' +
    'padding:0 14px;min-width:' + (32 + 28) + 'px;flex:1;height:' + boxHeight + 'px;';
  var noteBox = '<div style="' + nboxStyle + '">' +
    '<span style="font-weight:800;font-family:monospace;font-size:32px;color:' + noteCol + ';line-height:1;">' + fmt1(noteVal) + '</span>' +
    '<span style="font-size:11px;font-weight:600;color:' + noteCol + ';opacity:.75;">/20</span>' +
    noteBruteHtml + '</div>';

  // Boîte rang
  var rangHtml = "";
  if (cfg.rang) {
    var rangCol = couleurRang(rang, effectif, p);
    var rboxStyle = 'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'border:2px solid ' + rangCol + '55;border-radius:' + br + ';background:' + rangCol + '14;' +
      'padding:0 14px;min-width:' + (32 + 28) + 'px;flex:1;height:' + boxHeight + 'px;';
    rangHtml = '<div style="' + rboxStyle + '">' +
      '<span style="font-weight:800;font-family:monospace;font-size:32px;color:' + rangCol + ';line-height:1;">' + fmt0(rang) + '</span>' +
      '<span style="font-size:11px;font-weight:600;color:' + rangCol + ';opacity:.75;">/' + effectif + '</span>' +
      '</div>';
  }

  var etab = ETABLISSEMENT.nom + ' · ' + ETABLISSEMENT.classe + ' · ' + ETABLISSEMENT.matricule;
  var inner = '<div style="display:flex;align-items:center;gap:14px;padding:' + hp + 'px ' + (hp + 4) + 'px;' + accentBg + '">' +
    '<div style="flex:1;min-width:0;">' +
      '<div style="font-family:' + p.headerFont + ';font-size:22px;font-weight:700;color:' + p.text + ';line-height:1.15;">' +
        esc(student.prenom) + ' <em>' + esc(student.nom) + '</em>' +
      '</div>' +
      '<div style="font-size:10px;color:' + p.textDim + ';margin-top:4px;">' + esc(etab) + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;align-items:stretch;flex-shrink:0;">' + noteBox + rangHtml + '</div>' +
    '</div>';

  return '<div style="background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + br + ';overflow:hidden;margin-bottom:10px;">' +
    inner + '</div>';
}

// Bande stats : deux colonnes Élève / Classe
function blocStats(student, presents, getNote20, ratioJ, ratioE, stuMalus, cfg, p) {
  var se = cfg.statsEleve || {};
  var sc = cfg.statsClasse || {};
  var hp = 18;
  var br = p.radius + "px";

  var hasEleve = se.justesse || se.efficacite || se.malus;
  var hasClasse = sc.moy || sc.minMax || sc.sigma;
  if (!hasEleve && !hasClasse) return "";

  var notes = presents.map(function(s) { return getNote20(s.id); });
  var moy = notes.length ? notes.reduce(function(a, b) { return a + b; }, 0) / notes.length : 0;
  var sorted = notes.slice().sort(function(a, b) { return a - b; });
  var sigma = Math.sqrt(notes.reduce(function(s, n) { return s + (n - moy) * (n - moy); }, 0) / (notes.length || 1));

  var bothPresent = hasEleve && hasClasse;
  var colAlign = bothPresent ? 'flex:1;align-items:center;text-align:center;' : 'align-items:flex-start;text-align:left;';

  function statLine(label, val, color) {
    return '<div style="font-size:11px;font-family:monospace;color:' + p.textMuted + ';">' +
      label + ' <strong style="color:' + (color || p.text) + ';">' + val + '</strong></div>';
  }

  var eleveCol = "";
  if (hasEleve) {
    eleveCol = '<div style="display:flex;flex-direction:column;gap:2px;' + colAlign + '">' +
      '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:' + p.textDim + ';margin-bottom:3px;">Élève</div>' +
      (se.justesse ? statLine("Justesse", fmtPct(ratioJ)) : "") +
      (se.efficacite ? statLine("Efficacité", fmtPct(ratioE)) : "") +
      (se.malus && stuMalus > 0 ? statLine("Malus", "−" + stuMalus + " %", p.danger) : "") +
      (se.malus && stuMalus === 0 ? statLine("Malus", "aucun") : "") +
      '</div>';
  }

  var sep = bothPresent
    ? '<div style="width:1px;background:' + p.border + ';margin:0 16px;align-self:stretch;"></div>'
    : "";

  var classeCol = "";
  if (hasClasse) {
    classeCol = '<div style="display:flex;flex-direction:column;gap:2px;' + colAlign + '">' +
      '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:' + p.textDim + ';margin-bottom:3px;">Classe</div>' +
      (sc.moy ? statLine("Moyenne", fmt1(moy)) : "") +
      (sc.moy ? statLine("Médiane", fmt1(sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)])) : "") +
      (sc.minMax ? statLine("Minimum", fmt1(sorted[0] || 0)) : "") +
      (sc.minMax ? statLine("Maximum", fmt1(sorted[sorted.length - 1] || 0)) : "") +
      (sc.sigma ? statLine("Écart-type", fmt1(sigma)) : "") +
      '</div>';
  }

  return '<div style="background:' + p.surface + ';border:1px solid ' + p.border + ';border-radius:' + br + ';padding:' + Math.round(hp * 0.65) + 'px ' + (hp + 4) + 'px;margin-bottom:10px;display:flex;justify-content:space-between;gap:0;">' +
    eleveCol + sep + classeCol + '</div>';
}

// Bloc compétences : radar gauche + grille 2×2 (ou ligne)
function blocCompetences(comps, compPcts, cfg, p) {
  if (cfg.competences === "none") return "";
  var br = p.radius + "px";
  var hp = 18;
  var cs = 64; // hauteur de case en px

  var radarHtml = '<div style="flex-shrink:0;">' + svgRadar(compPcts, p) + '</div>';

  var cells = COMPETENCES.map(function(c) {
    var lettre = comps[c.id] || "—";
    var col = p.compColors[c.id] || p.accent;
    var circleSize = Math.round(cs * 0.48);
    var letterSize = Math.round(cs * 0.28);
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;' +
      'background:' + col + '18;border:1.5px solid ' + col + '44;border-radius:' + (p.radius + 2) + 'px;' +
      'padding:7px 10px;height:' + cs + 'px;">' +
      '<div style="font-size:11px;font-weight:700;color:' + col + ';">' + esc(c.label) + '</div>' +
      '<div style="width:' + circleSize + 'px;height:' + circleSize + 'px;border-radius:50%;background:' + col + ';' +
        'display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<span style="font-weight:900;font-size:' + letterSize + 'px;color:#ffffff;line-height:1;font-family:monospace;">' + esc(lettre) + '</span>' +
      '</div>' +
    '</div>';
  });

  var grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:1;min-width:0;">' +
    cells.join("") + '</div>';

  return '<div style="display:flex;align-items:center;gap:12px;background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + br + ';padding:12px ' + (hp + 4) + 'px;margin-bottom:10px;">' +
    radarHtml + grid + '</div>';
}

// Commentaire enseignant
function blocCommentaire(commentaire, cfg, p) {
  if (!cfg.commentaire || !commentaire || !commentaire.trim()) return "";
  var br = p.radius + "px";
  return '<div style="border-left:3px solid ' + p.accent + ';background:' + p.accent + '0e;padding:10px 14px;border-radius:0 ' + br + ' ' + br + ' 0;margin-bottom:10px;">' +
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:' + p.accent + ';margin-bottom:4px;">Commentaire</div>' +
    '<div style="font-size:13px;line-height:1.5;white-space:pre-wrap;color:' + p.text + ';">' + esc(commentaire.trim()) + '</div>' +
    '</div>';
}

// Titre de section
function sectionTitle(label, p) {
  return '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:' + p.textMuted + ';' +
    'margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid ' + p.border + ';">' + label + '</div>';
}

// Histogramme
function blocHistogramme(allNotes, studentNote, cfg, p) {
  if (!cfg.histogramme) return "";
  var br = p.radius + "px";
  return sectionTitle("Distribution de la classe", p) +
    '<div style="background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + br + ';padding:12px 14px;margin-bottom:10px;">' +
    svgHisto(allNotes, studentNote, p) +
    '<div style="font-size:11px;color:' + p.textMuted + ';margin-top:4px;text-align:right;">' +
      '<span style="color:' + p.danger + ';">▏</span> votre note (' + fmt1(studentNote) + ')' +
    '</div></div>';
}

// Détail par exercice
function blocDetailExercices(student, exam, grades, remarks, presents, allRemarques, cfg, p, seuilDifficile, seuilReussite, seuilPiege, bonusCompletConfig, ft) {
  if (!cfg.detailExercices) return "";
  var br = p.radius + "px";
  var html = sectionTitle("Détail par exercice", p);

  exam.exercises.forEach(function(ex) {
    var aTraiteEx = ex.questions.some(function(q) {
      return q.items.some(function(it) { return grades[gradeKey(student.id, it.id)]; })
        || grades[treatedKey(student.id, q.id)];
    });
    if (!aTraiteEx) return;

    var sc = exerciseScore(grades, student.id, ex, bonusCompletConfig);
    var eNotes = presents.map(function(s) { return exerciseScore(grades, s.id, ex, bonusCompletConfig).earned; });
    var eMoy = eNotes.reduce(function(a, b) { return a + b; }, 0) / eNotes.length;
    var eMin = Math.min.apply(null, eNotes);
    var eMax = Math.max.apply(null, eNotes);
    var coeff = ex.coeff !== undefined ? ex.coeff : 1;
    var coeffStr = coeff !== 1 ? ' <span style="font-size:11px;font-weight:600;margin-left:5px;color:' + p.textMuted + ';">×' + coeff + '</span>' : "";

    html += '<div style="background:' + p.card + ';border:1px solid ' + p.border + ';border-radius:' + br + ';padding:10px 14px;margin-bottom:8px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">' +
        '<span style="font-weight:700;font-size:13px;color:' + p.text + ';">' + esc(ex.title) + coeffStr + '</span>' +
        '<span style="font-family:monospace;font-weight:700;font-size:14px;color:' + p.accent + ';">' + fmt1(sc.earned) + ' / ' + fmt1(sc.total) + '</span>' +
      '</div>' +
      '<div style="font-size:11px;color:' + p.textMuted + ';margin-bottom:7px;">classe — moy ' + fmt1(eMoy) + ' · min ' + fmt1(eMin) + ' · max ' + fmt1(eMax) + '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
        '<thead><tr>' +
          ['Q.', 'Comp.', 'Note', 'Remarques'].map(function(h) {
            return '<th style="text-align:left;padding:3px 6px;color:' + p.textDim + ';font-weight:600;border-bottom:1px solid ' + p.border + ';">' + h + '</th>';
          }).join('') +
        '</tr></thead><tbody>';

    ex.questions.forEach(function(q) {
      var aTraite = q.items.some(function(it) { return grades[gradeKey(student.id, it.id)]; })
        || grades[treatedKey(student.id, q.id)];
      if (!aTraite) return;

      var qsc = questionScore(grades, student.id, q);
      var nbTraitants = presents.filter(function(s) {
        return q.items.some(function(it) { return grades[gradeKey(s.id, it.id)]; }) || grades[treatedKey(s.id, q.id)];
      }).length;
      var tauxTraitement = presents.length > 0 ? (nbTraitants / presents.length) * 100 : 0;
      var estDifficile = tauxTraitement < seuilDifficile;
      var estPiege = tauxTraitement >= 50 && qsc.total > 0 && (qsc.earned / qsc.total) * 100 < seuilPiege;
      var pctReussite = qsc.total > 0 ? (qsc.earned / qsc.total) * 100 : 0;
      var etoile = (estDifficile && pctReussite >= seuilReussite) ? " ✨" : "";
      var piegeMark = (ft && ft.questionPiege && estPiege) ? " ⚠️" : "";
      var bonusMark = q.bonus ? " 🎁" : "";

      var remLabels = (remarks[student.id + "__" + q.id] || []).map(function(id) {
        var rem = allRemarques.find(function(r) { return r.id === id; });
        return rem ? rem.label : id;
      }).join(", ");

      var compSpans = q.competences.map(function(cid) {
        var comp = COMPETENCES.find(function(c) { return c.id === cid; });
        var col = p.compColors[cid] || p.accent;
        return comp ? '<span style="display:inline-block;font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;margin-right:2px;font-family:monospace;color:' + col + ';background:' + col + '18;">' + esc(comp.short) + '</span>' : "";
      }).join("");

      var noteColor = qsc.total > 0
        ? (qsc.earned / qsc.total >= 0.75 ? p.success : qsc.earned / qsc.total >= 0.5 ? p.warning : p.danger)
        : p.textDim;

      var trColor = estDifficile ? p.danger : estPiege ? p.warning : p.text;
      var trStyle = (estDifficile || estPiege) ? 'font-weight:700;' : '';
      var qLabelHtml;
      if (cfg.soundLinksEnabled && cfg.soundBaseUrl) {
        var audioUrl = cfg.soundBaseUrl + buildAudioFilename(cfg.nomDS, cfg.studentNom, ex.title, q.label, cfg.soundAudioExt || "webm");
        qLabelHtml = '<a href="' + audioUrl + '" target="_blank" style="color:' + p.accent + ';text-decoration:none;border-bottom:1px solid ' + p.accent + '44;">' + esc(q.label) + '</a>';
      } else {
        qLabelHtml = esc(q.label);
      }
      html += '<tr style="' + trStyle + '">' +
        '<td style="padding:3px 6px;border-bottom:1px solid ' + p.border + '66;color:' + trColor + ';">' + qLabelHtml + bonusMark + etoile + piegeMark + '</td>' +
        '<td style="padding:3px 6px;border-bottom:1px solid ' + p.border + '66;">' + compSpans + '</td>' +
        '<td style="padding:3px 6px;border-bottom:1px solid ' + p.border + '66;color:' + noteColor + ';font-weight:700;font-family:monospace;white-space:nowrap;">' + fmt1(qsc.earned) + '/' + fmt1(qsc.total) + '</td>' +
        '<td style="padding:3px 6px;border-bottom:1px solid ' + p.border + '66;color:' + p.textMuted + ';font-size:10px;">' + esc(remLabels) + '</td>' +
        '</tr>';
    });

    // Ligne bonus exercice complet si déclenché
    if (ex.bonusComplet && bonusCompletConfig) {
      var bonusPts = bonusCompletPoints(grades, student.id, ex, bonusCompletConfig);
      if (bonusPts > 0) {
        html += '<tr>' +
          '<td colspan="3" style="padding:3px 6px;font-size:10px;font-weight:700;color:' + p.success + ';border-top:1px solid ' + p.border + '44;">🏆 Bonus exercice complet +' + fmt1(bonusPts) + ' pt' + (bonusPts > 1 ? 's' : '') + '</td>' +
          '<td style="padding:3px 6px;border-top:1px solid ' + p.border + '44;"></td>' +
          '</tr>';
      }
    }
    html += '</tbody></table></div>';
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
        items.push({
          exTitle: ex.title, qLabel: q.label, bonus: q.bonus, label: it.label,
          earned: grades[gradeKey(student.id, it.id)] ? (parseFloat(it.points) || 0) : 0,
          total: parseFloat(it.points) || 0,
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
    var check = it.earned > 0 ? "✓ " : "· ";
    var earnColor = it.earned > 0 ? p.success : p.textDim;
    var itemLabel = it.isBonusComplet
      ? esc(it.label)
      : check + '[Q.' + esc(it.qLabel) + (it.bonus ? " 🎁" : "") + '] ' + esc(it.label);
    var itemStyle = it.isBonusComplet
      ? 'padding:2px 8px;border-bottom:1px solid ' + p.border + '44;font-size:10px;color:' + p.success + ';font-weight:700;'
      : 'padding:2px 8px;border-bottom:1px solid ' + p.border + '44;font-size:10px;color:' + p.textMuted + ';';
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
    "@media (max-width: 500px) { .page { padding: 14px 10px 32px; } }",
    "@media print { body { background: #fff; } .page { padding: 0; } }",
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
  var commentaire = (commentaires && commentaires[student.id]) || "";

  var genDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  var body =
    blocTitreDS(nomDS, dateDS, p) +
    blocHeader(student, noteNorm, noteBrute, rang, effectif, cfg, p) +
    blocStats(student, presents, getNote20, ratioJ, ratioE, stuMalus, cfg, p) +
    (ft.competences ? blocCompetences(comps, compPcts, cfg, p) : "") +
    blocCommentaire(commentaire, cfg, p) +
    blocHistogramme(allNotes, noteNorm, cfg, p) +
    blocDetailExercices(student, exam, grades, remarks, presents, allRemarques, cfg, p, seuilDifficile, seuilReussite, opts.seuilPiege || 30, cfg.bonusCompletConfig, ft) +
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
    '</head>\n<body>\n<div class="page">\n' +
    body +
    '\n</div>\n</body>\n</html>';
}

// ─── Export tous élèves ───────────────────────────────────────────

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

    var taux = questions.map(function(q) {
      var qMax = q.items.reduce(function(s, it) { return s + (parseFloat(it.points) || 0); }, 0);
      if (qMax === 0) return 0;
      var nbTraitants = presents.filter(function(s) {
        return grades[treatedKey(s.id, q.id)] || q.items.some(function(it) { return grades[gradeKey(s.id, it.id)]; });
      }).length;
      if (nbTraitants === 0) return 0;
      var obt = presents.reduce(function(s, st) {
        return s + q.items.reduce(function(ss, it) {
          return ss + (grades[gradeKey(st.id, it.id)] ? (parseFloat(it.points) || 0) : 0);
        }, 0);
      }, 0);
      return obt / (nbTraitants * qMax);
    });

    var bars = questions.map(function(q, i) {
      var t = taux[i];
      var color = t >= 0.75 ? p.success : t >= 0.50 ? p.warning : p.danger;
      var bh = Math.max(3, t * innerH);
      var x = padL + i * (innerW / n) + (innerW / n - barW) / 2;
      var y = padT + innerH - bh;
      var pctLabel = Math.round(t * 100) + "%";

      var isDiff = t < (seuilDifficile / 100);
      var isPiege = ft.questionPiege && t > 0 && t < (seuilPiege / 100) && t >= 0.01;
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

  function blocParExercice() { return ""; } // remplacé par blocsParExercice

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
    '<button id="print-btn" class="no-print" onclick="window.print()" style="position:fixed;top:1rem;right:1rem;padding:8px 16px;background:' + p.accent + ';color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:100;">🖨️ Imprimer / PDF</button>';

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
