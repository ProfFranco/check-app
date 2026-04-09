// ═══════════════════════════════════════════════════════════════════
// Composants visuels : RadarChart, MiniRadar, MiniRadarEx, Histo, PBar
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COMPETENCES } from "../config/settings";
import { compColor, clamp } from "../utils/calculs";
import { lightTheme, darkTheme, FONT_BODY, FONT_MONO } from "../config/theme";

const FONT_B = FONT_BODY;
const MONO = FONT_MONO;

export const RADAR_MODES = [
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
