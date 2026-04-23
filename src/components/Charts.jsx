// ═══════════════════════════════════════════════════════════════════
// Composants visuels : RadarChart, MiniRadar, MiniRadarEx, Histo, PBar
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COMPETENCES } from "../config/settings";
import { compColor, clamp } from "../utils/calculs";
import { lightTheme, darkTheme, FONT_BODY, FONT_MONO } from "../config/theme";

const FONT_B = FONT_BODY;
const MONO = FONT_MONO;

const RADAR_MODES = [
  { id: "comp", label: "Comp\u00E9tences" },
  { id: "exAbs", label: "Exercices" },
  { id: "exRel", label: "vs. Classe" },
];

export function RadarChart({ compValues, exAbsValues, exRelValues, size = 90, dark = false, interactive = true, initialMode = "comp" }) {
  const [mode, setMode] = useState(initialMode);
  const th = dark ? darkTheme : lightTheme;

  const data = mode === "comp"
    ? COMPETENCES.map(c => ({ label: c.short, value: compValues[c.id] || 0, color: compColor(c, dark) }))
    : (mode === "exAbs" ? exAbsValues : exRelValues).map((v, i) => ({
        label: v.label, value: v.pct, color: [th.accent, th.violet, th.success, th.warning, th.danger][i % 5]
      }));

  // Padding around the SVG so labels don't get clipped
  const pad = 16;
  const vb = size + pad * 2;
  const cx = vb / 2, cy = vb / 2, r = size * 0.36;
  const n = data.length;
  if (n < 3) return null;
  const angles = data.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const pts = (vals) => vals.map((v, i) => `${cx + r * v * Math.cos(angles[i])},${cy + r * v * Math.sin(angles[i])}`).join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: interactive ? "pointer" : "default" }}
         onClick={interactive ? () => setMode(m => RADAR_MODES[(RADAR_MODES.findIndex(x => x.id === m) + 1) % RADAR_MODES.length].id) : undefined}>
      <svg width={size + pad} height={size + pad} viewBox={`0 0 ${vb} ${vb}`} style={{ overflow: "visible" }}>
        {[0.25, 0.5, 0.75, 1].map(l => <polygon key={l} points={pts(data.map(() => l))} fill="none" stroke={dark ? "#4a4438" : "#e0d8cc"} strokeWidth={l === 1 ? 0.8 : 0.4} />)}
        {angles.map((a, i) => <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={dark ? "#4a4438" : "#e0d8cc"} strokeWidth={0.4} />)}
        <polygon points={pts(data.map(d => d.value))} fill={th.accent + "20"} stroke={th.accent} strokeWidth={1.5} />
        {data.map((d, i) => {
          const x = cx + r * d.value * Math.cos(angles[i]);
          const y = cy + r * d.value * Math.sin(angles[i]);
          const lx = cx + (r + 13) * Math.cos(angles[i]);
          const ly = cy + (r + 13) * Math.sin(angles[i]);
          const labelSize = Math.max(8, size * 0.09);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={2.5} fill={d.color} />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={labelSize} fontWeight={700} fill={d.color} fontFamily={FONT_B}>{d.label}</text>
            </g>
          );
        })}
      </svg>
      {interactive && <div style={{ fontSize: Math.max(8, size * 0.08), color: th.textDim, fontFamily: FONT_B, marginTop: 0 }}>{(RADAR_MODES.find(m => m.id === mode) || {}).label} ▾</div>}
    </div>
  );
}

export function MiniRadar({ compValues, size = 36, dark = false }) {
  const n = COMPETENCES.length;
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const angles = COMPETENCES.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const pts = COMPETENCES.map((c, i) => `${cx + r * (compValues[c.id] || 0) * Math.cos(angles[i])},${cy + r * (compValues[c.id] || 0) * Math.sin(angles[i])}`).join(" ");
  const th = dark ? darkTheme : lightTheme;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={COMPETENCES.map((_, i) => `${cx + r * Math.cos(angles[i])},${cy + r * Math.sin(angles[i])}`).join(" ")} fill="none" stroke={dark ? "#4a4438" : "#e0d8cc"} strokeWidth={0.5} />
      <polygon points={pts} fill={th.accent + "25"} stroke={th.accent} strokeWidth={1} />
    </svg>
  );
}

export function MiniRadarEx({ values, size = 36, dark = false }) {
  const n = values.length;
  if (n < 3) return null;
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const th = dark ? darkTheme : lightTheme;
  const angles = values.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const pts = values.map((v, i) => `${cx + r * v * Math.cos(angles[i])},${cy + r * v * Math.sin(angles[i])}`).join(" ");
  const outline = values.map((_, i) => `${cx + r * Math.cos(angles[i])},${cy + r * Math.sin(angles[i])}`).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={outline} fill="none" stroke={dark ? "#4a4438" : "#e0d8cc"} strokeWidth={0.5} />
      <polygon points={pts} fill={th.success + "25"} stroke={th.success} strokeWidth={1} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HISTOGRAM / PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════
export function Histo({ bins, colorFn, label, th, moyLine, medLine }) {
  const mx = Math.max(...bins.map(b => b.count), 1);
  const total = bins.length;
  return (
    <div>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: th.textMuted, marginBottom: 6, fontFamily: FONT_B }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 130, position: "relative" }}>
        {/* Traits en arrière-plan */}
        {moyLine != null && (
          <div style={{ position: "absolute", top: 0, bottom: 18, left: `${(moyLine / (total - 1)) * 100}%`, width: 2, background: th.danger, opacity: 0.45, pointerEvents: "none", zIndex: 0 }} />
        )}
        {medLine != null && (
          <div style={{ position: "absolute", top: 0, bottom: 18, left: `${(medLine / (total - 1)) * 100}%`, width: 2, background: th.violet, opacity: 0.45, pointerEvents: "none", zIndex: 0 }} />
        )}
        {/* Barres au premier plan */}
        {bins.map((b, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 8, color: th.textMuted, marginBottom: 1, fontFamily: MONO }}>{b.count > 0 ? b.count : ""}</div>
            <div style={{ width: "100%", borderRadius: "2px 2px 0 0", height: b.count > 0 ? Math.max(4, (b.count / mx) * 110) : 0, background: colorFn ? colorFn(b.note) : th.accent + "88" }} />
            <div style={{ fontSize: 8, color: th.textDim, marginTop: 2, fontFamily: MONO }}>{b.note}</div>
          </div>
        ))}
      </div>
      {/* Légende sous le graphique */}
      {(moyLine != null || medLine != null) && (
        <div style={{ display: "flex", gap: 12, marginTop: 4, justifyContent: "flex-end" }}>
          {moyLine != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 12, height: 2, background: th.danger, opacity: 0.7 }} />
              <span style={{ fontSize: 9, color: th.danger, fontFamily: MONO }}>{"moy " + moyLine.toFixed(1)}</span>
            </div>
          )}
          {medLine != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 12, height: 2, background: th.violet, opacity: 0.7 }} />
              <span style={{ fontSize: 9, color: th.violet, fontFamily: MONO }}>{"méd " + medLine.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PBar({ value, max, color, h = 6, th }) {
  return <div style={{ background: th.border, borderRadius: h / 2, height: h, overflow: "hidden", width: "100%" }}><div style={{ height: "100%", borderRadius: h / 2, width: `${max > 0 ? clamp((value / max) * 100, 0, 100) : 0}%`, background: color, transition: "width 0.3s" }} /></div>;
}

// ─── ProgressionChart — courbe élève + moyenne classe ─────────────
//
// Props :
//   data    : [{ dsNom, noteEleve, moyClasse }]  — tableaux triés par date
//   th      : thème
//   FONT_B  : police corps
//   MONO    : police mono

export function ProgressionChart({ data, th }) {
  var W = 560, H = 220;
  var PAD = { top: 16, right: 20, bottom: 40, left: 36 };
  var chartW = W - PAD.left - PAD.right;
  var chartH = H - PAD.top - PAD.bottom;
  var n = data.length;

  if (n === 0) return (
    <div style={{ textAlign: "center", padding: 24, color: th.textMuted, fontFamily: FONT_B, fontSize: 12 }}>
      {"Aucune donnée."}
    </div>
  );

  // Axes
  var yMin = 0, yMax = 20;
  var xOf = function(i) { return PAD.left + (n === 1 ? chartW / 2 : i * chartW / (n - 1)); };
  var yOf = function(v) { return PAD.top + chartH - (v / yMax) * chartH; };

  // Lignes de grille horizontales
  var gridLines = [0, 5, 10, 15, 20];

  // Polyline points
  function pointsStr(arr) {
    return arr
      .map(function(d, i) { return d != null ? xOf(i) + "," + yOf(d) : null; })
      .filter(Boolean)
      .join(" ");
  }

  // Segments continus (gère les trous si noteEleve est null)
  function buildSegments(arr) {
    var segments = [], cur = [];
    arr.forEach(function(d, i) {
      if (d != null) {
        cur.push({ x: xOf(i), y: yOf(d), v: d, i: i });
      } else {
        if (cur.length > 1) segments.push(cur);
        cur = [];
      }
    });
    if (cur.length > 1) segments.push(cur);
    return segments;
  }

  var eleveVals = data.map(function(d) { return d.noteEleve; });
  var moyVals   = data.map(function(d) { return d.moyClasse; });
  var eleveSegs = buildSegments(eleveVals);
  var moySegs   = buildSegments(moyVals);

  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" style={{ display: "block", overflow: "visible" }}>

      {/* Grille */}
      {gridLines.map(function(v) { return (
        <g key={v}>
          <line x1={PAD.left} x2={PAD.left + chartW} y1={yOf(v)} y2={yOf(v)}
            stroke={th.border} strokeWidth={v === 0 ? 1.5 : 0.75} strokeDasharray={v === 0 ? "none" : "3,3"} />
          <text x={PAD.left - 5} y={yOf(v) + 4} textAnchor="end"
            fontSize={9} fontFamily={MONO} fill={th.textDim}>{v}</text>
        </g>
      ); })}

      {/* Courbe moyenne classe — pointillés */}
      {moySegs.map(function(seg, si) { return (
        <polyline key={"moy" + si}
          points={seg.map(function(p) { return p.x + "," + p.y; }).join(" ")}
          fill="none" stroke={th.textMuted} strokeWidth={1.5}
          strokeDasharray="5,4" strokeLinecap="round" strokeLinejoin="round" />
      ); })}

      {/* Points moyenne */}
      {data.map(function(d, i) {
        if (d.moyClasse == null) return null;
        return <circle key={"mc" + i} cx={xOf(i)} cy={yOf(d.moyClasse)} r={3}
          fill={th.surface} stroke={th.textMuted} strokeWidth={1.5} />;
      })}

      {/* Courbe élève — trait plein */}
      {eleveSegs.map(function(seg, si) { return (
        <polyline key={"elv" + si}
          points={seg.map(function(p) { return p.x + "," + p.y; }).join(" ")}
          fill="none" stroke={th.accent} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />
      ); })}

      {/* Points élève avec tooltip title */}
      {data.map(function(d, i) {
        if (d.noteEleve == null) return null;
        var above = d.noteEleve >= (d.moyClasse || 0);
        return (
          <g key={"ep" + i}>
            <circle cx={xOf(i)} cy={yOf(d.noteEleve)} r={5}
              fill={th.accent} stroke={th.card} strokeWidth={2} />
            <text x={xOf(i)} y={yOf(d.noteEleve) + (above ? -10 : 14)}
              textAnchor="middle" fontSize={9} fontFamily={MONO}
              fontWeight={700} fill={th.accent}>
              {d.noteEleve.toFixed(1)}
            </text>
            <title>{d.dsNom + " : " + (d.noteEleve != null ? d.noteEleve.toFixed(2) : "—") + "/20"}</title>
          </g>
        );
      })}

      {/* Labels X */}
      {data.map(function(d, i) { return (
        <text key={"xl" + i} x={xOf(i)} y={H - PAD.bottom + 14}
          textAnchor="middle" fontSize={9} fontFamily={FONT_B} fill={th.textMuted}>
          {d.dsNom.length > 10 ? d.dsNom.slice(0, 10) + "…" : d.dsNom}
        </text>
      ); })}

      {/* Légende */}
      <g transform={"translate(" + (PAD.left + chartW - 110) + "," + PAD.top + ")"}>
        <line x1={0} x2={18} y1={6} y2={6} stroke={th.accent} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={9} cy={6} r={4} fill={th.accent} stroke={th.card} strokeWidth={1.5} />
        <text x={22} y={10} fontSize={9} fontFamily={FONT_B} fill={th.text}>{"Élève"}</text>
        <line x1={0} x2={18} y1={22} y2={22} stroke={th.textMuted} strokeWidth={1.5} strokeDasharray="5,4" />
        <circle cx={9} cy={22} r={3} fill={th.surface} stroke={th.textMuted} strokeWidth={1.5} />
        <text x={22} y={26} fontSize={9} fontFamily={FONT_B} fill={th.textMuted}>{"Classe"}</text>
      </g>

    </svg>
  );
}

// ─── ProgressionRadar — radar DS (élève vs classe) ────────────────
//
// Props :
//   data    : [{ dsNom, noteEleve, moyClasse }]  — max 8 entrées
//   th      : thème
//   FONT_B  : police corps
//   MONO    : police mono

export function ProgressionRadar({ data, th }) {
  var n = data.length;
  if (n < 2) return (
    <div style={{ textAlign: "center", padding: 24, color: th.textMuted, fontFamily: FONT_B, fontSize: 12 }}>
      {"Au moins 2 DS nécessaires pour le radar."}
    </div>
  );

  var CX = 200, CY = 190, R = 140;
  var W = 400, H = 380;
  var levels = [5, 10, 15, 20];

  function angleOf(i) { return (Math.PI * 2 * i / n) - Math.PI / 2; }
  function polarX(i, val) { return CX + (val / 20) * R * Math.cos(angleOf(i)); }
  function polarY(i, val) { return CY + (val / 20) * R * Math.sin(angleOf(i)); }
  function toPoints(vals) {
    return vals.map(function(v, i) {
      return polarX(i, v != null ? v : 0) + "," + polarY(i, v != null ? v : 0);
    }).join(" ");
  }

  var eleveVals = data.map(function(d) { return d.noteEleve; });
  var moyVals   = data.map(function(d) { return d.moyClasse != null ? d.moyClasse : 0; });

  // Décalage label selon angle pour éviter les recouvrements
  function labelAnchor(i) {
    var a = angleOf(i);
    var cos = Math.cos(a);
    if (cos > 0.3) return "start";
    if (cos < -0.3) return "end";
    return "middle";
  }
  function labelDy(i) {
    var a = angleOf(i);
    var sin = Math.sin(a);
    if (sin < -0.3) return -8;
    if (sin > 0.3) return 14;
    return 4;
  }

  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" style={{ display: "block", overflow: "visible" }}>

      {/* Toiles de fond */}
      {levels.map(function(lv) {
        var pts = data.map(function(_, i) {
          return polarX(i, lv) + "," + polarY(i, lv);
        }).join(" ");
        return (
          <polygon key={lv} points={pts}
            fill="none" stroke={th.border}
            strokeWidth={lv === 20 ? 1.5 : 0.75}
            strokeDasharray={lv === 20 ? "none" : "3,3"} />
        );
      })}

      {/* Axes radiaux */}
      {data.map(function(_, i) { return (
        <line key={"ax" + i}
          x1={CX} y1={CY}
          x2={polarX(i, 20)} y2={polarY(i, 20)}
          stroke={th.border} strokeWidth={0.75} />
      ); })}

      {/* Valeurs sur l'axe vertical (premier axe) */}
      {levels.map(function(lv) { return (
        <text key={"lv" + lv}
          x={CX + 4} y={CY - (lv / 20) * R}
          fontSize={8} fontFamily={MONO} fill={th.textDim}>{lv}</text>
      ); })}

      {/* Polygone moyenne classe */}
      <polygon points={toPoints(moyVals)}
        fill={th.textMuted + "18"} stroke={th.textMuted}
        strokeWidth={1.5} strokeDasharray="5,4" />

      {/* Polygone élève */}
      <polygon points={toPoints(eleveVals.map(function(v) { return v != null ? v : 0; }))}
        fill={th.accent + "22"} stroke={th.accent} strokeWidth={2} />

      {/* Points élève */}
      {data.map(function(d, i) {
        if (d.noteEleve == null) return null;
        return (
          <g key={"ep" + i}>
            <circle cx={polarX(i, d.noteEleve)} cy={polarY(i, d.noteEleve)}
              r={4} fill={th.accent} stroke={th.card} strokeWidth={2} />
            <title>{d.dsNom + " : " + d.noteEleve.toFixed(2) + "/20"}</title>
          </g>
        );
      })}

      {/* Labels DS */}
      {data.map(function(d, i) {
        var lx = CX + (R + 18) * Math.cos(angleOf(i));
        var ly = CY + (R + 18) * Math.sin(angleOf(i));
        return (
          <text key={"lb" + i} x={lx} y={ly + labelDy(i)}
            textAnchor={labelAnchor(i)}
            fontSize={9} fontFamily={FONT_B} fill={th.textMuted}>
            {d.dsNom.length > 10 ? d.dsNom.slice(0, 10) + "…" : d.dsNom}
          </text>
        );
      })}

      {/* Légende */}
      <g transform={"translate(" + (W - 110) + ",16)"}>
        <line x1={0} x2={18} y1={6} y2={6} stroke={th.accent} strokeWidth={2} />
        <circle cx={9} cy={6} r={3} fill={th.accent} stroke={th.card} strokeWidth={1.5} />
        <text x={22} y={10} fontSize={9} fontFamily={FONT_B} fill={th.text}>{"Élève"}</text>
        <line x1={0} x2={18} y1={22} y2={22} stroke={th.textMuted} strokeWidth={1.5} strokeDasharray="5,4" />
        <text x={22} y={26} fontSize={9} fontFamily={FONT_B} fill={th.textMuted}>{"Classe"}</text>
      </g>

    </svg>
  );
}
