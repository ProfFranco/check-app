// ═══════════════════════════════════════════════════════════════════
// DebugModal — affiche l'état interne de l'application
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";

export default function DebugModal({ sections, fullState, th, FONT, FONT_B, MONO, onClose }) {
  var _open = useState({}); var setOpen = _open[1]; var open = _open[0];
  function toggle(key) { setOpen(function(o) { return Object.assign({}, o, { [key]: !o[key] }); }); }
  function copyAll() {
    try { navigator.clipboard.writeText(JSON.stringify(fullState, null, 2)); } catch(e) {}
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: th.card, borderRadius: 12, border: "1px solid " + th.border, padding: 20, width: 480, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, flex: 1 }}>{"🔬 Debug — État de l'application"}</span>
          <button onClick={copyAll} style={{ fontSize: 11, fontFamily: FONT_B, fontWeight: 700, padding: "4px 10px", borderRadius: 4, cursor: "pointer", background: th.accent, border: "none", color: "#fff", marginRight: 8 }}>
            {"Tout copier"}
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 16 }}>{"\u2715"}</button>
        </div>
        {sections.map(function(s) {
          var isOpen = !!open[s.key];
          var data = fullState[s.key];
          var count = Array.isArray(data) ? data.length : typeof data === "object" && data !== null ? Object.keys(data).length : "—";
          return (
            <div key={s.key} style={{ marginBottom: 6, border: "1px solid " + th.border, borderRadius: th.radiusSm, overflow: "hidden" }}>
              <button onClick={function() { toggle(s.key); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: th.surface, border: "none", cursor: "pointer", fontFamily: FONT_B, textAlign: "left" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: th.text, flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 10, color: th.textDim, fontFamily: MONO }}>{count + " entrée" + (count > 1 ? "s" : "")}</span>
                <span style={{ fontSize: 10, color: th.textDim }}>{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <pre style={{ margin: 0, padding: "10px", fontSize: 9, fontFamily: MONO, color: th.text, background: th.bg, overflowX: "auto", maxHeight: 200, lineHeight: 1.5 }}>
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
        <button onClick={onClose} style={{ width: "100%", padding: "8px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.accent, border: "none", color: "#fff", marginTop: 10 }}>
          {"Fermer"}
        </button>
      </div>
    </div>
  );
}
