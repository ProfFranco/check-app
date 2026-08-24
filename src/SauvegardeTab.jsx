// ═══════════════════════════════════════════════════════════════════
// SauvegardeTab — onglet Sauvegarde & synchronisation
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { iosInstallationRecommandee } from "./utils/helpers";

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
  syncBackend, syncConfigured, sycomore,
}) {
  // Bandeau d'installation PWA (P-H3) : WebKit évince le stockage inscriptible
  // par script (IndexedDB, localStorage) après 7 jours d'inactivité sur un site
  // non installé — sur iPad, ça peut faire disparaître des données locales non
  // encore synchronisées. Rejetable pour la session, réapparaît au prochain
  // lancement (pas de persistance à inventer pour un simple rappel).
  var _bandeauPwaMasque = useState(false); var bandeauPwaMasque = _bandeauPwaMasque[0]; var setBandeauPwaMasque = _bandeauPwaMasque[1];
  var installationRecommandee = iosInstallationRecommandee() === true && !bandeauPwaMasque;

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
        <div style={{ maxHeight: isOpen ? (props.maxH || 1200) : 0, overflow: "hidden", transition: "max-height 0.38s ease" }}>
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
        var estSycomore = syncBackend === "sycomore";
        var syncOk = syncConfigured !== undefined ? !!syncConfigured : !!(githubPat && githubRepo);
        var btnStyle = function(active) { return { flex: 1, padding: "11px", borderRadius: th.radiusSm, cursor: active ? "pointer" : "not-allowed", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: active ? th.accentBg : th.surface, border: "1px solid " + (active ? th.accent + "55" : th.border), color: active ? th.accent : th.textDim, opacity: syncLoading ? 0.6 : 1 }; };
        return (
          <Section skey="sync" icon="☁️" title="Synchronisation">
            {installationRecommandee && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: th.warning, fontFamily: FONT_B, padding: "8px 10px", background: th.warningBg, borderRadius: th.radiusSm, marginTop: 10, border: "1px solid " + th.warning + "33", lineHeight: 1.5 }}>
                <span style={{ flex: 1 }}>
                  {"📲 Installez CHECK sur l'écran d'accueil : sur iPad, Safari efface les données d'un site non installé après 7 jours sans ouverture — sauvegardes non synchronisées comprises. Partager → Sur l'écran d'accueil."}
                </span>
                <button onClick={function() { setBandeauPwaMasque(true); }}
                  style={{ background: "transparent", border: "none", color: th.warning, cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>
                  {"✕"}
                </button>
              </div>
            )}
            <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, padding: "10px 0 6px", lineHeight: 1.6 }}>
              {estSycomore
                ? "Sauvegarde et restauration sur votre serveur Sycomore. La sauvegarde est chiffrée dans ce navigateur avant l'envoi : le serveur ne stocke qu'un bloc illisible sans votre phrase secrète."
                : "Sauvegarde et restauration via un dépôt GitHub privé. Configurez votre PAT et le dépôt dans Réglages → ☁️ Sauvegarde."}
            </div>
            {!syncOk && <div style={{ fontSize: 11, color: th.warning, fontFamily: FONT_B, padding: "6px 10px", background: th.warningBg, borderRadius: th.radiusSm, marginBottom: 10, border: "1px solid " + th.warning + "33" }}>
              {estSycomore
                ? "⚠ Connectez-vous à Sycomore et définissez une phrase secrète (section 🌳 ci-dessous)."
                : "⚠ Configurez d'abord votre PAT GitHub et le nom de votre dépôt dans Réglages → ☁️ Sauvegarde."}
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

      {/* ── 🌳 Sycomore : connexion, rapprochement des élèves, envoi des résultats ── */}
      {sycomore && (function() {
        var s = sycomore;
        var champ = { width: "100%", padding: "8px 10px", borderRadius: th.radiusSm, border: "1px solid " + th.border, background: th.surface, color: th.text, fontFamily: FONT_B, fontSize: 12, boxSizing: "border-box" };
        var label = { fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 3 };
        var btn = function(actif, principal) {
          return {
            padding: "9px 14px", borderRadius: th.radiusSm, cursor: actif ? "pointer" : "not-allowed",
            fontFamily: FONT_B, fontSize: 12, fontWeight: 700,
            background: principal ? th.accentBg : th.surface,
            border: "1px solid " + (principal ? th.accent + "55" : th.border),
            color: principal ? th.accent : th.text, opacity: actif ? 1 : 0.5,
          };
        };
        var nbMappes = Object.keys(s.sycomoreMap || {}).length;
        var connecte = !!s.sycomoreToken;

        return (
          <Section skey="sycomore" icon="🌳" title="Sycomore" maxH={2600}>
            <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, padding: "10px 0 10px", lineHeight: 1.6 }}>
              {"Envoi des résultats de DS vers Sycomore pour le suivi par élève. Seuls les identifiants d'élèves et les notes sont transmis — aucun nom ne quitte ce navigateur."}
            </div>

            {/* Connexion */}
            <div style={{ marginBottom: 12 }}>
              <div style={label}>{"Racine de l'API (vide = /api sur ce serveur)"}</div>
              <input type="text" value={s.sycomoreUrl} placeholder="http://localhost:8000"
                onChange={function(e) { s.setSycomoreUrl(e.target.value); localStorage.setItem("check_sycomore_url", e.target.value); }}
                style={Object.assign({}, champ, { marginBottom: 8 })} />
              <div style={label}>{"Identifiant Sycomore"}</div>
              <input type="text" value={s.sycomoreUser} autoComplete="username"
                onChange={function(e) { s.setSycomoreUser(e.target.value); }}
                style={Object.assign({}, champ, { marginBottom: 8 })} />
              <div style={label}>{"Mot de passe"}</div>
              <input type="password" id="sycomore-pass" autoComplete="current-password"
                placeholder={connecte ? "déjà connecté" : ""}
                style={Object.assign({}, champ, { marginBottom: 8 })} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button disabled={s.sycomoreBusy} style={btn(!s.sycomoreBusy, true)}
                  onClick={function() {
                    var el = document.getElementById("sycomore-pass");
                    s.sycomoreLogin(el ? el.value : "").then(function(ok) { if (ok && el) el.value = ""; });
                  }}>
                  {s.sycomoreBusy ? "⏳…" : connecte ? "🔄 Se reconnecter" : "🔑 Se connecter"}
                </button>
                {connecte && <span style={{ fontSize: 11, color: th.success, fontFamily: FONT_B }}>{"✓ connecté"}</span>}
              </div>
            </div>

            {/* Phrase secrète de chiffrement — P-H2 : sourcée automatiquement depuis
                le trousseau partagé quand il est disponible sur cet appareil. */}
            <div style={{ marginBottom: 12, paddingTop: 10, borderTop: "1px solid " + th.border }}>
              {s.sycomoreTrousseauActif ? (
                <div style={{ fontSize: 11, fontFamily: FONT_B, color: th.success }}>
                  {"🔑 Phrase secrète : depuis le trousseau Sycomore de cet appareil."}
                </div>
              ) : (
                <div>
                  <div style={label}>{"Phrase secrète (chiffre la sauvegarde avant l'envoi)"}</div>
                  <input type="password" value={s.sycomorePass} autoComplete="new-password"
                    onChange={function(e) { s.setSycomorePass(e.target.value); localStorage.setItem("check_sycomore_passphrase", e.target.value); }}
                    style={champ} />
                  <div style={{ fontSize: 10, color: th.warning, fontFamily: FONT_B, marginTop: 6, lineHeight: 1.5 }}>
                    {"⚠ Sans cette phrase, une sauvegarde envoyée sur le serveur est définitivement illisible — y compris par vous. Notez-la ailleurs."}
                  </div>
                </div>
              )}
            </div>

            {/* Déverrouillage direct du trousseau (P-H2) : uniquement quand CHECK est
                connecté à Sycomore mais que le store partagé est vide sur cet appareil
                (Sycomore n'y a jamais tourné). Non bloquant — le reste de la section
                fonctionne normalement pendant ce temps via la saisie manuelle. */}
            {connecte && !s.sycomoreTrousseauActif && (
              <div style={{ marginBottom: 12, paddingTop: 10, borderTop: "1px solid " + th.border }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: th.text, fontFamily: FONT_B, marginBottom: 4 }}>
                  {"🔑 Trousseau non déverrouillé sur cet appareil"}
                </div>
                <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                  {"Si un trousseau existe sur ce compte Sycomore, sa phrase déverrouille aussi la phrase secrète et le rapprochement des élèves ci-dessous — sans re-saisie."}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="password" value={s.trousseauPhraseInput} autoComplete="off"
                    placeholder="Phrase du trousseau"
                    onChange={function(e) { s.setTrousseauPhraseInput(e.target.value); }}
                    style={Object.assign({}, champ, { flex: 1 })} />
                  <button disabled={s.trousseauDeverrouillageBusy || !s.trousseauPhraseInput} style={btn(!s.trousseauDeverrouillageBusy && !!s.trousseauPhraseInput, false)}
                    onClick={s.sycomoreDeverrouillerTrousseau}>
                    {s.trousseauDeverrouillageBusy ? "⏳…" : "Déverrouiller"}
                  </button>
                </div>
              </div>
            )}

            {/* Rapprochement des élèves */}
            <div style={{ marginBottom: 12, paddingTop: 10, borderTop: "1px solid " + th.border }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: th.text, fontFamily: FONT_B, marginBottom: 4 }}>
                {"🔗 Rapprochement des élèves"}
              </div>
              {s.sycomoreTrousseauActif ? (
                <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                  {"Fait automatiquement depuis le trousseau Sycomore de cet appareil."}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                    {"Importez le pack d'identités Sycomore pour associer chaque élève CHECK à son identifiant serveur. Le pack est lu en mémoire et n'est jamais envoyé nulle part."}
                  </div>
                  <input type="file" accept="application/json,.json"
                    onChange={function(e) { s.sycomoreImporterPack(e.target.files && e.target.files[0]); e.target.value = ""; }}
                    style={{ fontSize: 11, fontFamily: FONT_B, color: th.textMuted, marginBottom: 8 }} />
                </div>
              )}
              <div style={{ fontSize: 11, fontFamily: FONT_B, color: nbMappes ? th.success : th.textDim }}>
                {nbMappes + " élève(s) rapproché(s) sur " + (s.students || []).length}
              </div>
              {s.sycomoreAppariement && s.sycomoreAppariement.nonApparies.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: th.warning, fontFamily: FONT_B, marginBottom: 4 }}>
                    {"Sans correspondance automatique — à associer à la main :"}
                  </div>
                  {s.sycomoreAppariement.nonApparies.map(function(el) {
                    return (
                      <div key={el.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: FONT_B, color: th.text, flex: 1 }}>
                          {(el.prenom || "") + " " + (el.nom || "")}
                        </span>
                        <input type="number" placeholder="id Sycomore"
                          defaultValue={s.sycomoreMap[el.id] || ""}
                          onBlur={function(e) { s.sycomoreDefinirMapping(el.id, e.target.value); }}
                          style={Object.assign({}, champ, { width: 110, padding: "5px 8px", fontSize: 11 })} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Envoi de la synthèse */}
            <div style={{ paddingTop: 10, borderTop: "1px solid " + th.border }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: th.text, fontFamily: FONT_B, marginBottom: 6 }}>
                {"📤 Envoyer les résultats du DS actif"}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <select value={s.sycomoreClasseId} disabled={!connecte}
                  onChange={function(e) { s.setSycomoreClasseId(e.target.value); }}
                  style={Object.assign({}, champ, { flex: 1 })}>
                  <option value="">{"— choisir une classe —"}</option>
                  {(s.sycomoreClasses || []).map(function(c) {
                    return <option key={c.id} value={c.id}>{c.nom + " (" + c.niveau + ")"}</option>;
                  })}
                </select>
                <button onClick={s.sycomoreChargerClasses} disabled={!connecte || s.sycomoreBusy}
                  style={btn(connecte && !s.sycomoreBusy, false)}>{"↻"}</button>
              </div>
              <button onClick={s.sycomorePousserSynthese}
                disabled={!connecte || !s.sycomoreClasseId || s.sycomoreBusy || !s.examNomDS}
                style={Object.assign({}, btn(connecte && s.sycomoreClasseId && !s.sycomoreBusy, true), { width: "100%" })}>
                {s.sycomoreBusy ? "⏳ Envoi…" : "📤 Envoyer « " + (s.examNomDS || "DS sans nom") + " »"}
              </button>
            </div>

            {/* Message d'état */}
            {s.sycomoreMsg && (
              <div style={{
                marginTop: 10, padding: "8px 10px", borderRadius: th.radiusSm, fontSize: 11, fontFamily: FONT_B, lineHeight: 1.5,
                color: s.sycomoreMsg.type === "error" ? th.danger : s.sycomoreMsg.type === "warn" ? th.warning : th.success,
                background: th.surface,
                border: "1px solid " + (s.sycomoreMsg.type === "error" ? th.danger : s.sycomoreMsg.type === "warn" ? th.warning : th.success) + "44",
              }}>
                {s.sycomoreMsg.texte}
              </div>
            )}
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
