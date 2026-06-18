// ═══════════════════════════════════════════════════════════════════
// SauvegardeTab — onglet Sauvegarde & synchronisation
// ═══════════════════════════════════════════════════════════════════

export default function SauvegardeTab({
  th, FONT, FONT_B,
  exportOpen, setExportOpen,
  githubPat, githubRepo,
  githubSave, githubLoad,
  syncLoading, syncStatus, syncDate,
  syncDailySnapshot, setSyncDailySnapshot,
  loadSnapshotList, snapshotLoading,
  onFullBackup, onOpenRestore, backupBusy,
  linkedFileSupported, linkedFileName, linkedFilePerm, linkedFileBusy,
  onLinkFile, onUnlinkFile, onReauthorize,
}) {
  function Section(props) {
    var key = props.skey;
    var isOpen = exportOpen[key] !== false;
    return (
      <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, marginBottom: 10, boxShadow: th.shadow, overflow: "hidden" }}>
        <div onClick={function() { setExportOpen(function(prev) { var n = Object.assign({}, prev); n[key] = !isOpen; return n; }); }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", cursor: "pointer", userSelect: "none" }}>
          <span style={{ fontSize: 16 }}>{props.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT, flex: 1 }}>{props.title}</span>
          <span style={{ fontSize: 11, color: th.textMuted, display: "inline-block", transition: "transform 0.28s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>{"▼"}</span>
        </div>
        <div style={{ maxHeight: isOpen ? 1200 : 0, overflow: "hidden", transition: "max-height 0.38s ease" }}>
          <div style={{ borderTop: "1px solid " + th.border, padding: "0 16px 16px" }}>
            {props.children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* ── Section Synchronisation ── */}
      {(function() {
        var syncOk = !!(githubPat && githubRepo);
        var btnStyle = function(active) { return { flex: 1, padding: "11px", borderRadius: th.radiusSm, cursor: active ? "pointer" : "not-allowed", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: active ? th.accentBg : th.surface, border: "1px solid " + (active ? th.accent + "55" : th.border), color: active ? th.accent : th.textDim, opacity: syncLoading ? 0.6 : 1 }; };
        return (
          <Section skey="sync" icon="☁️" title="Synchronisation">
            <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, padding: "10px 0 6px", lineHeight: 1.6 }}>
              {"Sauvegarde et restauration via un dépôt GitHub privé. Configurez votre PAT et le dépôt dans Réglages → ☁️ Sauvegarde."}
            </div>
            {!syncOk && <div style={{ fontSize: 11, color: th.warning, fontFamily: FONT_B, padding: "6px 10px", background: th.warningBg, borderRadius: th.radiusSm, marginBottom: 10, border: "1px solid " + th.warning + "33" }}>
              {"⚠ Configurez d'abord votre PAT GitHub et le nom de votre dépôt dans Réglages → ☁️ Sauvegarde."}
            </div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={githubSave} disabled={!syncOk || syncLoading} style={btnStyle(syncOk && !syncLoading)}>
                {syncLoading ? "⏳ En cours…" : "☁️ Sauvegarder"}
              </button>
              <button onClick={githubLoad} disabled={!syncOk || syncLoading} style={btnStyle(syncOk && !syncLoading)}>
                {syncLoading ? "⏳ En cours…" : "☁️ Charger"}
              </button>
            </div>
            {syncStatus && <div style={{ fontSize: 11, fontFamily: FONT_B, color: syncStatus.startsWith("✅") ? th.success : th.danger, marginTop: 4 }}>{syncStatus}</div>}
            {syncDate && !syncStatus && <div style={{ fontSize: 10, fontFamily: FONT_B, color: th.textDim, marginTop: 4 }}>{"Dernier snapshot : " + syncDate}</div>}
            {syncOk && <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid " + th.border }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: th.text, fontFamily: FONT_B }}>{"🕐 Snapshots quotidiens"}</div>
                  <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginTop: 2 }}>{"Sauvegarde auto après chaque push (hier / −3j / −7j / −14j)."}</div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!syncDailySnapshot} onChange={function(e) { setSyncDailySnapshot && setSyncDailySnapshot(e.target.checked); }} />
                  <span style={{ fontSize: 11, fontFamily: FONT_B, color: th.textMuted }}>{syncDailySnapshot ? "Activé" : "Désactivé"}</span>
                </label>
              </div>
              {syncDailySnapshot && <button onClick={loadSnapshotList} disabled={snapshotLoading || syncLoading} style={{ padding: "6px 12px", borderRadius: th.radiusSm, cursor: snapshotLoading ? "not-allowed" : "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, background: th.surface, border: "1px solid " + th.border, color: th.text }}>
                {snapshotLoading ? "⏳ Chargement…" : "📋 Voir les snapshots disponibles"}
              </button>}
            </div>}
          </Section>
        );
      })()}

      {/* ── 💾 Sauvegarde & restauration (filet universel multi-profils) ── */}
      <Section skey="backup" icon="💾" title="Sauvegarde & restauration">
        <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, padding: "10px 0 6px", lineHeight: 1.6 }}>
          {"Filet de sécurité local, indépendant de la synchronisation GitHub. Un seul fichier JSON contient tous vos profils."}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={onFullBackup} disabled={!!backupBusy}
            style={{ flex: 1, padding: "11px", borderRadius: th.radiusSm, cursor: backupBusy ? "not-allowed" : "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.accentBg, border: "1px solid " + th.accent + "55", color: th.accent, opacity: backupBusy ? 0.6 : 1 }}>
            {backupBusy ? "⏳ En cours…" : "💾 Sauvegarde complète"}
          </button>
          <button onClick={onOpenRestore} disabled={!!backupBusy}
            style={{ flex: 1, padding: "11px", borderRadius: th.radiusSm, cursor: backupBusy ? "not-allowed" : "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.surface, border: "1px solid " + th.border, color: th.text, opacity: backupBusy ? 0.6 : 1 }}>
            {"📂 Restaurer une sauvegarde"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: th.textDim, fontFamily: FONT_B, marginTop: 8 }}>
          {"La restauration propose deux modes : Remplacer (efface tout) ou Fusionner (le fichier gagne en cas de collision)."}
        </div>
      </Section>

      {/* ── 🔗 Fichier lié (Chrome/Edge uniquement) ── */}
      {linkedFileSupported && (
        <Section skey="filelink" icon="🔗" title="Fichier lié (sauvegarde automatique)">
          <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, padding: "10px 0 6px", lineHeight: 1.6 }}>
            {"Lie un fichier sur ton disque (ou un dossier synchronisé). CHECK le réécrit automatiquement à chaque modification."}
          </div>

          {/* Pas de handle lié */}
          {!linkedFileName && (
            <button onClick={onLinkFile} disabled={!!linkedFileBusy}
              style={{ padding: "11px", width: "100%", borderRadius: th.radiusSm, cursor: linkedFileBusy ? "not-allowed" : "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.surface, border: "1px solid " + th.border, color: th.text, opacity: linkedFileBusy ? 0.6 : 1 }}>
              {linkedFileBusy ? "⏳ En cours…" : "🔗 Choisir un fichier à lier"}
            </button>
          )}

          {/* Handle lié — permission accordée */}
          {linkedFileName && linkedFilePerm === "granted" && (
            <div>
              <div style={{ fontSize: 12, color: th.success, fontFamily: FONT_B, marginBottom: 8 }}>
                {"✅ Lié à : "}<strong>{linkedFileName}</strong>
              </div>
              <div style={{ fontSize: 10, color: th.textDim, fontFamily: FONT_B, marginBottom: 10 }}>
                {"Réécrit automatiquement à chaque sauvegarde."}
              </div>
              <button onClick={onUnlinkFile}
                style={{ padding: "7px 14px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, background: "transparent", border: "1px solid " + th.border, color: th.textMuted }}>
                {"🔓 Délier"}
              </button>
            </div>
          )}

          {/* Handle lié — permission à réautoriser */}
          {linkedFileName && linkedFilePerm === "prompt" && (
            <div>
              <div style={{ fontSize: 12, color: th.warning, fontFamily: FONT_B, marginBottom: 8 }}>
                {"⚠ Réautorisation requise : "}<strong>{linkedFileName}</strong>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onReauthorize}
                  style={{ flex: 1, padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 700, background: th.accentBg, border: "1px solid " + th.accent + "55", color: th.accent }}>
                  {"🔑 Réautoriser"}
                </button>
                <button onClick={onUnlinkFile}
                  style={{ padding: "9px 14px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, background: "transparent", border: "1px solid " + th.border, color: th.textMuted }}>
                  {"Délier"}
                </button>
              </div>
            </div>
          )}

          {/* Handle lié — permission refusée */}
          {linkedFileName && linkedFilePerm === "denied" && (
            <div>
              <div style={{ fontSize: 12, color: th.danger, fontFamily: FONT_B, marginBottom: 8 }}>
                {"❌ Permission refusée pour : "}<strong>{linkedFileName}</strong>
              </div>
              <button onClick={onLinkFile}
                style={{ padding: "7px 14px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, background: "transparent", border: "1px solid " + th.border, color: th.textMuted }}>
                {"🔗 Choisir un autre fichier"}
              </button>
            </div>
          )}
        </Section>
      )}

    </div>
  );
}
