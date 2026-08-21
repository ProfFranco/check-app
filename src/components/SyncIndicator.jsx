import { useState, useRef } from "react";

const STATUS_CONFIG = {
  unconfigured:   { color: null,        label: "Non configuré" },
  synced:         { color: "success",   label: "Synchronisé" },
  "local-ahead":  { color: "accent",    label: "Modifications locales" },
  "remote-ahead": { color: "warning",   label: "Version distante plus récente" },
  conflict:       { color: "danger",    label: "Conflit" },
  error:          { color: "danger",    label: "Erreur réseau" },
  checking:       { color: null,        label: "Vérification…" },
  pushing:        { color: "accent",    label: "Envoi…" },
  pulling:        { color: "warning",   label: "Réception…" },
};

function formatAgo(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)  return "il y a " + diff + "s";
  if (diff < 3600) return "il y a " + Math.floor(diff / 60) + "min";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function SyncIndicator({ status, remoteMeta, lastSyncAt, error, onPush, onPull, onCheck, onResolveConflict, th, FONT_B, MONO, toast }) {
  var _open = useState(false); var setOpen = _open[1]; var open = _open[0];
  var _localToast = useState(null); var localToast = _localToast[0]; var setLocalToast = _localToast[1];
  var localToastTimerRef = useRef(null);
  var triggerRef = useRef(null);

  function showFeedback(msg) {
    if (localToastTimerRef.current) clearTimeout(localToastTimerRef.current);
    setLocalToast(msg);
    localToastTimerRef.current = setTimeout(function() { setLocalToast(null); }, 1500);
  }

  var cfg = STATUS_CONFIG[status] || STATUS_CONFIG.checking;
  var fillColor = cfg.color ? th[cfg.color] : th.textDim;

  function buildTitle() {
    if (status === "synced" && lastSyncAt) return "Synchronisé — " + formatAgo(lastSyncAt);
    if (status === "local-ahead") return "Modifications locales non synchronisées";
    if (status === "remote-ahead") return "Version distante plus récente";
    if (status === "conflict") return "Conflit détecté";
    if (status === "error") return "Erreur : " + (error || "inconnue");
    if (status === "unconfigured") return "Synchronisation non configurée";
    return cfg.label;
  }

  function handleDocClick(e) {
    if (triggerRef.current && !triggerRef.current.contains(e.target)) {
      setOpen(false);
      document.removeEventListener("click", handleDocClick);
    }
  }

  function toggleOpen(e) {
    e.stopPropagation();
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
      document.addEventListener("click", handleDocClick);
    }
  }

  // Popover content
  function renderPopoverContent() {
    var btnStyle = {
      display: "block", width: "100%", marginTop: 8,
      padding: "6px 10px", borderRadius: th.radiusSm, cursor: "pointer",
      fontFamily: FONT_B, fontSize: 11, fontWeight: 700,
      background: th.accent, border: "none", color: "#fff",
    };

    if (status === "synced") return (
      <div>
        <div style={{ fontSize: 12, color: th.text, fontWeight: 600 }}>{"Synchronisé"}</div>
        {lastSyncAt && <div style={{ fontSize: 11, color: th.textMuted, marginTop: 2 }}>{"Dernière synchro " + formatAgo(lastSyncAt)}</div>}
        <button style={btnStyle} onClick={function() { showFeedback("Vérification lancée…"); onCheck && onCheck(); setOpen(false); }}>{"⟳ Vérifier maintenant"}</button>
      </div>
    );

    if (status === "local-ahead") return (
      <div>
        <div style={{ fontSize: 12, color: th.text, fontWeight: 600 }}>{"Modifications non synchronisées"}</div>
        <div style={{ fontSize: 11, color: th.textMuted, marginTop: 2 }}>{"Auto-save dans ~2 min — ou forcer ci-dessous"}</div>
        <button style={btnStyle} onClick={function() { showFeedback("Envoi en cours…"); onPush && onPush(); setOpen(false); }}>{"☁️ Envoyer maintenant"}</button>
      </div>
    );

    if (status === "remote-ahead") return (
      <div>
        <div style={{ fontSize: 12, color: th.text, fontWeight: 600 }}>{"Version distante plus récente"}</div>
        {remoteMeta && <div style={{ fontSize: 11, color: th.textMuted, marginTop: 2 }}>
          {"Depuis " + (remoteMeta.pushedByName || remoteMeta.pushedBy || "un autre appareil")}
          {remoteMeta.pushedAt ? " · " + new Date(remoteMeta.pushedAt).toLocaleString("fr-FR") : ""}
        </div>}
        <button style={btnStyle} onClick={function() { showFeedback("Récupération en cours…"); onPull && onPull(); setOpen(false); }}>{"⬇ Récupérer"}</button>
      </div>
    );

    if (status === "conflict") return (
      <div>
        <div style={{ fontSize: 12, color: th.danger, fontWeight: 700 }}>{"⚠ Conflit détecté"}</div>
        <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, lineHeight: 1.5 }}>{"Deux versions divergentes existent. Résolvez manuellement."}</div>
        <button style={btnStyle} onClick={function() { onResolveConflict && onResolveConflict(); setOpen(false); }}>{"🔀 Résoudre le conflit"}</button>
      </div>
    );

    if (status === "error") return (
      <div>
        <div style={{ fontSize: 12, color: th.danger, fontWeight: 700 }}>{"❌ Erreur réseau"}</div>
        {error && <div style={{ fontSize: 11, color: th.textMuted, marginTop: 2, fontFamily: MONO, wordBreak: "break-all" }}>{error}</div>}
        <button style={btnStyle} onClick={function() { showFeedback("Nouvelle tentative…"); onCheck && onCheck(); setOpen(false); }}>{"⟳ Réessayer"}</button>
      </div>
    );

    if (status === "unconfigured") return (
      <div>
        <div style={{ fontSize: 12, color: th.text, fontWeight: 600 }}>{"Synchronisation non configurée"}</div>
        <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4 }}>{"Configurer dans Réglages → Export"}</div>
      </div>
    );

    return (
      <div style={{ fontSize: 12, color: th.textMuted }}>{cfg.label}</div>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }} ref={triggerRef}>
      {/* Disque de statut */}
      <button
        onClick={toggleOpen}
        title={buildTitle()}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, padding: 0,
          background: "transparent", border: "none", cursor: "pointer",
          flexShrink: 0,
        }}>
        <span style={{
          display: "inline-block",
          width: 10, height: 10,
          borderRadius: "50%",
          background: fillColor,
          flexShrink: 0,
          transition: "background 0.3s",
          boxShadow: status === "conflict" ? ("0 0 0 2px " + th.danger + "40") : "none",
        }} />
      </button>

      {/* Badge "Conflit" pour l'état conflict */}
      {status === "conflict" && (
        <span style={{
          fontSize: 10, fontFamily: FONT_B, fontWeight: 700,
          color: th.danger,
          background: th.dangerBg,
          border: "1px solid " + th.danger + "30",
          borderRadius: th.radiusSm,
          padding: "1px 5px",
          whiteSpace: "nowrap",
        }}>{"Conflit"}</span>
      )}

      {/* Popover */}
      {open && (
        <div
          style={{
            position: "absolute", left: 0, top: "100%", marginTop: 4,
            background: th.card, border: "1px solid " + th.border,
            borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            zIndex: 200, minWidth: 220, padding: "12px 14px",
            fontFamily: FONT_B,
          }}
          onClick={function(e) { e.stopPropagation(); }}>
          {renderPopoverContent()}
        </div>
      )}

      {/* Toast auto-pull */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 300,
          background: th.success, color: "#fff",
          padding: "10px 16px", borderRadius: th.radius,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          fontFamily: FONT_B, fontSize: 12, fontWeight: 600,
          pointerEvents: "none",
        }}>
          <div>{toast.message}</div>
          {toast.detail && <div style={{ fontSize: 10, opacity: 0.85 }}>{toast.detail}</div>}
        </div>
      )}

      {/* Toast feedback déclenchement manuel */}
      {localToast && (
        <div style={{
          position: "fixed", bottom: toast ? 64 : 16, right: 16, zIndex: 300,
          background: th.accent, color: "#fff",
          padding: "8px 14px", borderRadius: th.radius,
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          fontFamily: FONT_B, fontSize: 12, fontWeight: 600,
          pointerEvents: "none", opacity: 0.92,
        }}>
          {localToast}
        </div>
      )}
    </div>
  );
}
