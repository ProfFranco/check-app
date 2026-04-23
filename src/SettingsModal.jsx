// ═══════════════════════════════════════════════════════════════════
// SettingsModal — modale Réglages (5 onglets)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { REMARQUES, TT_GROUPE } from "./config/settings";
import { DEFAULT_HTML_CONFIG } from "./utils/html";

export default function SettingsModal({
  th, FONT, FONT_B, MONO,
  settingsTab, setSettingsTab,
  etablissement, setEtablissement,
  seuils, setSeuils,
  normMethod, setNormMethod,
  normParams, setNormParams,
  seuilDifficile, setSeuilDifficile,
  seuilReussite, setSeuilReussite,
  seuilPiege, setSeuilPiege,
  bonusCompletConfig, setBonusCompletConfig,
  malusPaliers, setMalusPaliers,
  malusMode, setMalusMode,
  remarquesCustom, setRemarquesCustom,
  remarquesOrdre, setRemarquesOrdre,
  remarquesActives, setRemarquesActives,
  correctionOpen, setCorrectionOpen,
  newRemIcon, setNewRemIcon,
  newRemLabel, setNewRemLabel,
  newRemMalus, setNewRemMalus,
  groupesDef, setGroupesDef,
  groupes, setGroupes,
  exportOpen, setExportOpen,
  csvConfig, setCsvConfig,
  htmlConfig, setHtmlConfig,
  htmlPresets, setHtmlPresets,
  soundLinksEnabled, setSoundLinksEnabled,
  soundBaseUrl, setSoundBaseUrl,
  soundAudioExt, setSoundAudioExt,
  githubPat, setGithubPat,
  githubRepo, setGithubRepo,
  onClose,
  onSave,
  onOpenDebug,
}) {
  var _savedFlash = useState(false); var setSavedFlash = _savedFlash[1]; var savedFlash = _savedFlash[0];
  useEffect(function() {
    if (!onSave) return;
    setSavedFlash(true);
    var t = setTimeout(function() { setSavedFlash(false); }, 1500);
    return function() { clearTimeout(t); };
  }, [onSave]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: th.card, borderRadius: 12, border: "1px solid " + th.border, padding: 20, width: 540, maxWidth: "96vw", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={function(e) { e.stopPropagation(); }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, fontFamily: FONT }}>{"\u2699\uFE0F R\u00E9glages"}</h3>

        {/* Onglets */}
        {(function() {
          var tabs = [
            { id: "etablissement", label: "\uD83C\uDFEB \u00C9tablissement" },
            { id: "evaluation",    label: "\uD83C\uDF93 \u00C9valuation" },
            { id: "calcul",        label: "\uD83D\uDCCA Notes" },
            { id: "correction",    label: "\u270F\uFE0F Correction" },
            { id: "export",        label: "\uD83D\uDCE4 Export" },
          ];
          return (
            <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid " + th.border, paddingBottom: 0 }}>
              {tabs.map(function(t) {
                var active = settingsTab === t.id;
                return (
                  <button key={t.id} onClick={function() { setSettingsTab(t.id); }}
                    style={{ flex: 1, padding: "7px 4px", fontSize: 10, fontWeight: 700, fontFamily: FONT_B, cursor: "pointer", border: "none", borderBottom: active ? "2px solid " + th.accent : "2px solid transparent", marginBottom: -2, background: "transparent", color: active ? th.accent : th.textMuted, transition: "color 0.15s" }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* ── Onglet Établissement ── */}
        {settingsTab === "etablissement" && (function() {
          var etabFields = [
            { key: "nom",          label: "Nom de l'établissement", placeholder: "Lycée Joffre" },
            { key: "classe",       label: "Classe",                 placeholder: "MP2I" },
            { key: "matricule",    label: "Matricule / Identité (optionnel)", placeholder: "HX VI — laisser vide si inutile" },
            { key: "promotion",    label: "Promotion",              placeholder: "232" },
            { key: "anneeScolaire",label: "Année scolaire",         placeholder: "2024-2025" },
          ];
          return (
            <div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 14, lineHeight: 1.6 }}>
                {"Ces informations apparaissent dans les rapports LaTeX (pied de page) et HTML (en-tête). Elles sont liées au profil actif."}
              </div>
              {etabFields.map(function(f) {
                return (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      {f.label}
                    </label>
                    <input
                      value={etablissement[f.key] || ""}
                      placeholder={f.placeholder}
                      onChange={function(e) {
                        var newEtab = Object.assign({}, etablissement, { [f.key]: e.target.value });
                        setEtablissement(newEtab);
                      }}
                      style={{ width: "100%", background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: th.radiusSm, padding: "6px 10px", fontSize: 13, fontFamily: FONT_B, outline: "none" }}
                    />
                  </div>
                );
              })}
              <div style={{ marginTop: 14, padding: "10px 12px", background: th.accentBg, borderRadius: th.radiusSm, border: "1px solid " + th.accent + "30" }}>
                <div style={{ fontSize: 10, color: th.accent, fontFamily: FONT_B, fontWeight: 700, marginBottom: 2 }}>{"Aperçu pied de page LaTeX"}</div>
                <div style={{ fontSize: 11, fontFamily: MONO, color: th.text }}>
                  {[etablissement.nom || "—", etablissement.classe || "—", etablissement.matricule].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Onglet Évaluation ── */}
        {settingsTab === "evaluation" && (function() {
          return (
            <div>
              <p style={{ fontSize: '0.78em', color: 'var(--text-muted, #888)', fontStyle: 'italic', marginBottom: '0.8em' }}>
                ⓘ Ces réglages s'appliquent à tous les devoirs.
              </p>
              {/* Seuils de compétence */}
              <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Seuils de compétence</div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                {"Pourcentage de réussite minimum pour chaque niveau. En dessous de D : NN (non noté si points traités < nonNote%)."}
              </div>
              {[
                { key: "nonNote", label: "Seuil noté (min % traités)" },
                { key: "D", label: "Seuil D (min %)" },
                { key: "C", label: "Seuil C (min %)" },
                { key: "B", label: "Seuil B (min %)" },
              ].map(function(s) { return (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>{s.label}</label>
                  <input type="number" min={0} max={100} value={seuils[s.key]} onChange={function(e) { setSeuils(Object.assign({}, seuils, { [s.key]: Number(e.target.value) })); }}
                    style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                  <span style={{ fontSize: 10, color: th.textDim }}>%</span>
                </div>); })}

              {/* Question difficile */}
              <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>Question difficile</div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                {"Une question est difficile si moins de X% des présents l'ont réussie."}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>{"Seuil difficulté"}</label>
                <input type="number" min={0} max={100} value={seuilDifficile} onChange={function(e) { setSeuilDifficile(Number(e.target.value)); }}
                  style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                <span style={{ fontSize: 10, color: th.textDim }}>%</span>
              </div>

              {/* Seuil réussite ✨ */}
              <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>{"Seuil réussite ✨"}</div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                {"Un élève a réussi une question difficile (✨) s'il a obtenu au moins X% des points de cette question."}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>{"Seuil réussite question"}</label>
                <input type="number" min={0} max={100} value={seuilReussite} onChange={function(e) { setSeuilReussite(Number(e.target.value)); }}
                  style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                <span style={{ fontSize: 10, color: th.textDim }}>%</span>
              </div>

              {/* Question piège */}
              <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>{"Question piège ⚠️"}</div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                {"Une question traitée par ≥ 50% des élèves mais réussie par moins de X% des traitants."}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>{"Seuil piège"}</label>
                <input type="number" min={0} max={100} value={seuilPiege} onChange={function(e) { setSeuilPiege(Number(e.target.value)); }}
                  style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                <span style={{ fontSize: 10, color: th.textDim }}>%</span>
              </div>

              {/* Bonus exercice complet */}
              <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>{"Bonus exercice complet 🏆"}</div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 10, lineHeight: 1.5 }}>
                {"Récompense automatique quand un élève a traité toutes les questions d'un exercice (activé par 🏆 dans la Préparation) et atteint le seuil de réussite."}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>{"Seuil de réussite"}</label>
                <input type="number" min={0} max={100} value={bonusCompletConfig.seuil} onChange={function(e) { setBonusCompletConfig(Object.assign({}, bonusCompletConfig, { seuil: Number(e.target.value) })); }}
                  style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                <span style={{ fontSize: 10, color: th.textDim }}>%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>{"Type de bonus"}</label>
                {[{ id: "fixe", label: "Points fixes" }, { id: "pourcent", label: "% du barème" }].map(function(m) { return (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: bonusCompletConfig.mode === m.id ? th.text : th.textMuted }}>
                    <input type="radio" name="bonusMode" checked={bonusCompletConfig.mode === m.id} onChange={function() { setBonusCompletConfig(Object.assign({}, bonusCompletConfig, { mode: m.id })); }} />
                    {m.label}
                  </label>); })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>{"Valeur du bonus"}</label>
                <input type="number" min={0} step={0.5} value={bonusCompletConfig.valeur} onChange={function(e) { setBonusCompletConfig(Object.assign({}, bonusCompletConfig, { valeur: Number(e.target.value) })); }}
                  style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                <span style={{ fontSize: 10, color: th.textDim }}>{bonusCompletConfig.mode === "pourcent" ? "%" : "pts"}</span>
              </div>
            </div>
          );
        })()}

        {/* ── Onglet Calcul ── */}
        {settingsTab === "calcul" && (function() {
          return (
            <div>
              <p style={{ fontSize: '0.78em', color: 'var(--text-muted, #888)', fontStyle: 'italic', marginBottom: '0.8em' }}>
                ⓘ Ces réglages s'appliquent à tous les devoirs.
              </p>
              {/* Normalisation */}
              <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Normalisation</div>
              {[
                { id: "none",             label: "Brute /20 (aucune normalisation)", info: "La note affichée est directement le score ramené sur 20, sans transformation." },
                { id: "proportional",     label: "Proportionnelle (moy→cible)",   info: "Toutes les notes sont multipliées pour que la moyenne devienne la cible." },
                { id: "proportional_max", label: "Proportionnelle (max→cible)",   info: "Toutes les notes sont multipliées pour que la meilleure note devienne la cible." },
                { id: "affine",           label: "Affine (moy + σ)",               info: "Transformation affine : la moyenne devient moyenneCible et l'écart-type devient sigmaCible." },
                { id: "affine_max",       label: "Affine (max + σ)",               info: "La note max devient la cible, l'écart-type est normalisé vers sigmaCible." },
                { id: "gaussienne",       label: "Gaussienne",                     info: "Chaque note est transformée selon sa position dans la distribution (quantiles gaussiens)." },
              ].map(function(m) { return (
                <div key={m.id} style={{ marginBottom: 6 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <input type="radio" name="normMethod" checked={normMethod === m.id} onChange={function() { setNormMethod(m.id); }} style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 12, fontFamily: FONT_B, color: normMethod === m.id ? th.text : th.textMuted, fontWeight: normMethod === m.id ? 700 : 400 }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: th.textDim, fontFamily: FONT_B, lineHeight: 1.4 }}>{m.info}</div>
                    </div>
                  </label>
                </div>); })}

                {normMethod !== "none" && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border }}>
                    {/* Proportionnelle (moy) : moyenne cible seulement */}
                    {normMethod === "proportional" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Moyenne cible</label>
                        <input type="number" min={0} max={20} step={0.5} value={normParams.moyenneCible}
                          onChange={function(e) { setNormParams(Object.assign({}, normParams, { moyenneCible: Number(e.target.value) })); }}
                          style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        <span style={{ fontSize: 10, color: th.textDim }}>/20</span>
                      </div>
                    )}
                    {/* Proportionnelle (max) : note max cible seulement */}
                    {normMethod === "proportional_max" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Note max cible</label>
                        <input type="number" min={0} max={20} step={0.5} value={normParams.maxCible !== undefined ? normParams.maxCible : 20}
                          onChange={function(e) { setNormParams(Object.assign({}, normParams, { maxCible: Number(e.target.value) })); }}
                          style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        <span style={{ fontSize: 10, color: th.textDim }}>/20</span>
                      </div>
                    )}
                    {/* Affine (moy) : moyenne cible + sigma */}
                    {normMethod === "affine" && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Moyenne cible</label>
                          <input type="number" min={0} max={20} step={0.5} value={normParams.moyenneCible}
                            onChange={function(e) { setNormParams(Object.assign({}, normParams, { moyenneCible: Number(e.target.value) })); }}
                            style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Écart-type cible</label>
                          <input type="number" min={0} max={10} step={0.5} value={normParams.sigmaCible}
                            onChange={function(e) { setNormParams(Object.assign({}, normParams, { sigmaCible: Number(e.target.value) })); }}
                            style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        </div>
                      </div>
                    )}
                    {/* Affine (max) : note max cible + sigma */}
                    {normMethod === "affine_max" && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Note max cible</label>
                          <input type="number" min={0} max={20} step={0.5} value={normParams.maxCible !== undefined ? normParams.maxCible : 20}
                            onChange={function(e) { setNormParams(Object.assign({}, normParams, { maxCible: Number(e.target.value) })); }}
                            style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Écart-type cible</label>
                          <input type="number" min={0} max={10} step={0.5} value={normParams.sigmaCible}
                            onChange={function(e) { setNormParams(Object.assign({}, normParams, { sigmaCible: Number(e.target.value) })); }}
                            style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        </div>
                      </div>
                    )}
                    {/* Gaussienne : moyenne + sigma */}
                    {normMethod === "gaussienne" && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Moyenne cible</label>
                          <input type="number" min={0} max={20} step={0.5} value={normParams.moyenneCible}
                            onChange={function(e) { setNormParams(Object.assign({}, normParams, { moyenneCible: Number(e.target.value) })); }}
                            style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ flex: 1, fontSize: 11, fontFamily: FONT_B, color: th.text }}>Écart-type cible</label>
                          <input type="number" min={0} max={10} step={0.5} value={normParams.sigmaCible}
                            onChange={function(e) { setNormParams(Object.assign({}, normParams, { sigmaCible: Number(e.target.value) })); }}
                            style={{ width: 56, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Malus présentation */}
              <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 }}>Malus présentation</div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                {"Paliers de malus automatique selon le nombre de remarques (type malus). Le malus est un pourcentage retranché à la note."}
              </div>
              {malusPaliers.map(function(p, i) { return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>≥</span>
                  <input type="number" min={1} value={p.seuil} onChange={function(e) { setMalusPaliers(malusPaliers.map(function(pp, j) { return j === i ? { seuil: Number(e.target.value), pct: pp.pct } : pp; })); }}
                    style={{ width: 44, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                  <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>remarques →</span>
                  <input type="number" min={0} max={100} value={p.pct} onChange={function(e) { setMalusPaliers(malusPaliers.map(function(pp, j) { return j === i ? { seuil: pp.seuil, pct: Number(e.target.value) } : pp; })); }}
                    style={{ width: 44, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                  <span style={{ fontSize: 10, color: th.textDim }}>%</span>
                  <button onClick={function() { setMalusPaliers(malusPaliers.filter(function(_, j) { return j !== i; })); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 12 }}>{"\u2715"}</button>
                </div>); })}
              <button onClick={function() { setMalusPaliers(malusPaliers.concat([{ seuil: 15, pct: 15 }])); }} style={{ background: "none", border: "1px dashed " + th.border, color: th.textMuted, borderRadius: th.radiusSm, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: FONT_B, width: "100%", marginBottom: 8 }}>+ Palier</button>
              {[{ id: "avant", l: "Avant normalisation" }, { id: "apres", l: "Après normalisation" }].map(function(m) { return (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: malusMode === m.id ? th.text : th.textMuted }}>
                  <input type="radio" name="malusMode" checked={malusMode === m.id} onChange={function() { setMalusMode(m.id); }} /> {m.l}
                </label>); })}
            </div>
          );
        })()}

        {/* ── Onglet Correction ── */}
        {settingsTab === "correction" && (function() {
          var allR = remarquesOrdre.length
            ? REMARQUES.concat(remarquesCustom).slice().sort(function(a, b) {
                var ia = remarquesOrdre.indexOf(a.id); var ib = remarquesOrdre.indexOf(b.id);
                if (ia < 0) ia = 999; if (ib < 0) ib = 999; return ia - ib;
              })
            : REMARQUES.concat(remarquesCustom);
          function moveRem(idx, dir) {
            var ids = allR.map(function(r) { return r.id; });
            var j = idx + dir;
            if (j < 0 || j >= ids.length) return;
            var tmp = ids[idx]; ids[idx] = ids[j]; ids[j] = tmp;
            setRemarquesOrdre(ids);
          }
          function accordion(key, label, open, children) {
            return (
              <div style={{ marginBottom: 10, border: "1px solid " + th.border, borderRadius: th.radius, overflow: "hidden" }}>
                <button onClick={function() { setCorrectionOpen(function(prev) { return Object.assign({}, prev, { [key]: !prev[key] }); }); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: open ? th.accentBg : th.surface, border: "none", cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: open ? th.accent : th.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {label}
                  <span style={{ fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>{"▼"}</span>
                </button>
                <div style={{ maxHeight: open ? "1200px" : "0px", overflow: "hidden", transition: "max-height 0.25s ease" }}>
                  <div style={{ padding: "10px 12px" }}>
                    {children}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div>

              {/* ── Accordéon Remarques ── */}
              {accordion("remarques", "✏️ Remarques", correctionOpen.remarques, (
                <div>
                  <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, lineHeight: 1.5 }}>
                    {"Activez ou désactivez les remarques selon le DS. Les remarques personnalisées sont permanentes (disponibles pour tous les DS)."}
                  </div>
                  {allR.map(function(rem, idx) {
                    var active = remarquesActives.indexOf(rem.id) >= 0;
                    var isCustom = remarquesCustom.some(function(r) { return r.id === rem.id; });
                    return (
                      <div key={rem.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, padding: "5px 8px", borderRadius: th.radiusSm, background: active ? th.warningBg : th.surface, border: "1px solid " + (active ? th.warning + "30" : th.border) }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <button onClick={function() { moveRem(idx, -1); }} disabled={idx === 0}
                            style={{ background: "none", border: "none", color: idx === 0 ? th.textDim : th.textMuted, cursor: idx === 0 ? "default" : "pointer", fontSize: 8, lineHeight: 1, padding: "1px 2px" }}>{"▲"}</button>
                          <button onClick={function() { moveRem(idx, 1); }} disabled={idx === allR.length - 1}
                            style={{ background: "none", border: "none", color: idx === allR.length - 1 ? th.textDim : th.textMuted, cursor: idx === allR.length - 1 ? "default" : "pointer", fontSize: 8, lineHeight: 1, padding: "1px 2px" }}>{"▼"}</button>
                        </div>
                        <span style={{ fontSize: 14 }}>{rem.icon}</span>
                        <span style={{ flex: 1, fontSize: 12, fontFamily: FONT_B, color: active ? th.text : th.textMuted }}>{rem.label}</span>
                        <span style={{ fontSize: 9, color: rem.malus ? th.danger : th.textDim, fontFamily: MONO, marginRight: 2 }}>{rem.malus ? "malus" : "info"}</span>
                        <button onClick={function() {
                          setRemarquesActives(active
                            ? remarquesActives.filter(function(id) { return id !== rem.id; })
                            : remarquesActives.concat([rem.id]));
                        }} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 3, cursor: "pointer", fontFamily: FONT_B, border: "1px solid " + (active ? th.warning + "50" : th.border), background: active ? th.warning + "20" : "transparent", color: active ? th.warning : th.textDim }}>
                          {active ? "ON" : "OFF"}
                        </button>
                        {isCustom && <button onClick={function() {
                          setRemarquesCustom(remarquesCustom.filter(function(r) { return r.id !== rem.id; }));
                          setRemarquesActives(remarquesActives.filter(function(id) { return id !== rem.id; }));
                          setRemarquesOrdre(remarquesOrdre.filter(function(id) { return id !== rem.id; }));
                        }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 11 }}>{"\u2715"}</button>}
                      </div>
                    );
                  })}
                  {/* Formulaire ajout remarque custom */}
                  <div style={{ marginTop: 10, padding: "8px 10px", background: th.surface, borderRadius: th.radiusSm, border: "1px dashed " + th.border }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 6 }}>{"+ Nouvelle remarque"}</div>
                    <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                      <input value={newRemIcon} onChange={function(e) { setNewRemIcon(e.target.value); }} style={{ background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, width: 36, textAlign: "center", fontSize: 16, padding: "3px", outline: "none" }} maxLength={2} />
                      <input value={newRemLabel} onChange={function(e) { setNewRemLabel(e.target.value); }} placeholder={"Libellé\u2026"} style={{ background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, flex: 1, padding: "3px 7px", fontSize: 12, fontFamily: FONT_B, outline: "none" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: th.textMuted }}>
                        <input type="checkbox" checked={newRemMalus} onChange={function(e) { setNewRemMalus(e.target.checked); }} /> Compte pour le malus
                      </label>
                    </div>
                    <button onClick={function() {
                      var lbl = newRemLabel.trim();
                      if (!lbl) return;
                      var newId = "custom_" + Math.random().toString(36).slice(2, 7);
                      var newRem = { id: newId, label: lbl, icon: newRemIcon || "\uD83D\uDCCC", malus: newRemMalus };
                      var newCustom = remarquesCustom.concat([newRem]);
                      var newActives = remarquesActives.concat([newId]);
                      setRemarquesCustom(newCustom);
                      setRemarquesActives(newActives);
                      setNewRemLabel(""); setNewRemIcon("\uD83D\uDCCC"); setNewRemMalus(true);
                    }} style={{ width: "100%", padding: "5px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, background: th.accent, border: "none", color: "#fff" }}>
                      {"Ajouter"}
                    </button>
                  </div>
                </div>
              ))}

              {/* ── Accordéon Groupes ── */}
              {accordion("groupes", "👥 Groupes pédagogiques", correctionOpen.groupes, (
                <div>
                  <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 10, lineHeight: 1.5 }}>
                    {"Le groupe Tiers-temps est fixe (aménagement individuel). Vous pouvez créer ici des groupes pédagogiques (ex. NSI, option, classe)."}
                  </div>
                  {/* Groupe TT — lecture seule */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, padding: "5px 8px", borderRadius: th.radiusSm, background: th.surface, border: "1px solid " + th.border, opacity: 0.7 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: TT_GROUPE.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontFamily: FONT_B, color: th.textMuted }}>{TT_GROUPE.label}</span>
                    <span style={{ fontSize: 9, color: th.textDim, fontFamily: MONO }}>{"fixe · coeff " + (4/3).toFixed(2)}</span>
                  </div>
                  {/* Groupes éditables */}
                  {groupesDef.map(function(g, idx) {
                    return (
                      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, padding: "5px 8px", borderRadius: th.radiusSm, background: th.surface, border: "1px solid " + th.border }}>
                        <input type="color" value={g.color} onChange={function(e) {
                          var hex = e.target.value;
                          var r = parseInt(hex.slice(1,3),16), gg2 = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
                          var rD = Math.min(255, Math.round(r + (255-r)*0.45));
                          var gD = Math.min(255, Math.round(gg2 + (255-gg2)*0.45));
                          var bD = Math.min(255, Math.round(b + (255-b)*0.45));
                          var hexD = "#" + [rD,gD,bD].map(function(v){return v.toString(16).padStart(2,"0");}).join("");
                          var newDef = groupesDef.map(function(x, i) { return i === idx ? Object.assign({}, x, { color: hex, colorDark: hexD }) : x; });
                          setGroupesDef(newDef);
                        }} style={{ width: 26, height: 26, border: "none", cursor: "pointer", borderRadius: 4, padding: 0, background: "none" }} title={"Couleur du groupe"} />
                        <input value={g.label} onChange={function(e) {
                          var newDef = groupesDef.map(function(x, i) { return i === idx ? Object.assign({}, x, { label: e.target.value }) : x; });
                          setGroupesDef(newDef);
                        }} style={{ flex: 1, background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "3px 7px", fontSize: 12, fontFamily: FONT_B, outline: "none" }} />
                        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: FONT_B, color: th.textMuted, cursor: "pointer", whiteSpace: "nowrap" }}>
                          <input type="checkbox" checked={!!g.isStatGroup} onChange={function(e) {
                            var newDef = groupesDef.map(function(x, i) { return i === idx ? Object.assign({}, x, { isStatGroup: e.target.checked }) : x; });
                            setGroupesDef(newDef);
                          }} /> {"Stats"}
                        </label>
                        <button onClick={function() {
                          var gId = g.id;
                          var newDef = groupesDef.filter(function(x, i) { return i !== idx; });
                          var newGroupes = {}; for (var k in groupes) { if (k !== gId) newGroupes[k] = groupes[k]; }
                          setGroupesDef(newDef);
                          setGroupes(newGroupes);
                        }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 13 }}>{"\u2715"}</button>
                      </div>
                    );
                  })}
                  {/* Formulaire ajout groupe */}
                  <button onClick={function() {
                    var newId = "grp_" + Math.random().toString(36).slice(2, 7);
                    setGroupesDef(groupesDef.concat([{ id: newId, label: "Nouveau groupe", color: "#2855a0", colorDark: "#5b9bd5", isStatGroup: true }]));
                  }} style={{ width: "100%", padding: "5px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, background: th.accent, border: "none", color: "#fff", marginTop: 4 }}>
                    {"+ Ajouter un groupe"}
                  </button>
                </div>
              ))}

            </div>
          );
        })()}

        {/* ── Onglet Export ── */}
        {settingsTab === "export" && (function() {
          var colsDef = [
            { key: "rang",        label: "Rang" },
            { key: "nom",         label: "Nom" },
            { key: "prenom",      label: "Prénom" },
            { key: "absent",      label: "Absent" },
            { key: "note",        label: "Note /20" },
            { key: "noteNorm",    label: "Note normalisée" },
            { key: "groupe",      label: "Groupe" },
            { key: "competences", label: "Compétences (A N R V)" },
            { key: "malus",       label: "Malus %" },
          ];
          function SectionHeader(id, icon, label) {
            var open = exportOpen[id];
            return (
              <div onClick={function() { setExportOpen(function(o) { return Object.assign({}, o, { [id]: !o[id] }); }); }}
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "7px 0", borderBottom: "1px solid " + th.border, marginBottom: open ? 12 : 0, userSelect: "none" }}>
                <span style={{ fontSize: 10, color: th.textDim, display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}>▼</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, textTransform: "uppercase", letterSpacing: 1 }}>{icon + " " + label}</span>
              </div>
            );
          }
          return (
            <div>
              {/* ── CSV ── */}
              {SectionHeader("csv", "📊", "Export CSV")}
              {exportOpen.csv && <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4 }}>Séparateur</div>
                    {[{ v: ";", l: "Point-virgule  ;" }, { v: ",", l: "Virgule  ," }].map(function(s) { return (
                      <label key={s.v} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: csvConfig.sep === s.v ? th.text : th.textMuted }}>
                        <input type="radio" name="csvSep" checked={csvConfig.sep === s.v} onChange={function() { setCsvConfig(Object.assign({}, csvConfig, { sep: s.v })); }} /> {s.l}
                      </label>); })}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4 }}>Décimales</div>
                    {[{ v: ",", l: "Virgule  0,5" }, { v: ".", l: "Point  0.5" }].map(function(s) { return (
                      <label key={s.v} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: csvConfig.dec === s.v ? th.text : th.textMuted }}>
                        <input type="radio" name="csvDec" checked={csvConfig.dec === s.v} onChange={function() { setCsvConfig(Object.assign({}, csvConfig, { dec: s.v })); }} /> {s.l}
                      </label>); })}
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 6 }}>Colonnes exportées</div>
                {colsDef.map(function(c) { return (
                  <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: csvConfig.cols[c.key] ? th.text : th.textMuted }}>
                    <input type="checkbox" checked={!!csvConfig.cols[c.key]} onChange={function(e) { setCsvConfig(Object.assign({}, csvConfig, { cols: Object.assign({}, csvConfig.cols, { [c.key]: e.target.checked }) })); }} />
                    {c.label}
                  </label>); })}
              </div>}

              {/* ── HTML ── */}
              {SectionHeader("html", "🌐", "Export HTML")}
              {exportOpen.html && <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4 }}>Thème du rapport</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {[{ v: "light", l: "☀️ Clair" }, { v: "dark", l: "🌙 Sombre" }, { v: "young", l: "🎨 Jeune" }].map(function(t) { return (
                    <label key={t.v} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: htmlConfig.theme === t.v ? th.text : th.textMuted }}>
                      <input type="radio" name="htmlTheme" checked={htmlConfig.theme === t.v} onChange={function() { setHtmlConfig(Object.assign({}, htmlConfig, { theme: t.v })); }} /> {t.l}
                    </label>); })}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4 }}>Note affichée</div>
                {[
                  { key: "noteNorm",  label: "Note normalisée (principale)" },
                  { key: "noteBrute", label: "Note brute en complément" },
                  { key: "rang",      label: "Rang dans la classe" },
                ].map(function(it) { return (
                  <label key={it.key} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: htmlConfig[it.key] ? th.text : th.textMuted }}>
                    <input type="checkbox" checked={!!htmlConfig[it.key]} onChange={function(e) { setHtmlConfig(Object.assign({}, htmlConfig, { [it.key]: e.target.checked })); }} />
                    {it.label}
                  </label>); })}
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4, marginTop: 10 }}>Statistiques — élève</div>
                {[
                  { key: "justesse",   label: "Justesse" },
                  { key: "efficacite", label: "Efficacité" },
                  { key: "malus",      label: "Malus de présentation" },
                ].map(function(it) { return (
                  <label key={it.key} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: ((htmlConfig.statsEleve||{})[it.key]) ? th.text : th.textMuted }}>
                    <input type="checkbox" checked={!!((htmlConfig.statsEleve||{})[it.key])} onChange={function(e) { setHtmlConfig(Object.assign({}, htmlConfig, { statsEleve: Object.assign({}, htmlConfig.statsEleve, { [it.key]: e.target.checked }) })); }} />
                    {it.label}
                  </label>); })}
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4, marginTop: 10 }}>Statistiques — classe</div>
                {[
                  { key: "moy",    label: "Moyenne et médiane" },
                  { key: "minMax", label: "Min / Max" },
                  { key: "sigma",  label: "Écart-type σ" },
                ].map(function(it) { return (
                  <label key={it.key} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: ((htmlConfig.statsClasse||{})[it.key]) ? th.text : th.textMuted }}>
                    <input type="checkbox" checked={!!((htmlConfig.statsClasse||{})[it.key])} onChange={function(e) { setHtmlConfig(Object.assign({}, htmlConfig, { statsClasse: Object.assign({}, htmlConfig.statsClasse, { [it.key]: e.target.checked }) })); }} />
                    {it.label}
                  </label>); })}
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4, marginTop: 10 }}>Compétences</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {[{ v: "grid", l: "Grille 2×2" }, { v: "none", l: "Masqué" }].map(function(t) { return (                      <label key={t.v} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: htmlConfig.competences === t.v ? th.text : th.textMuted }}>
                      <input type="radio" name="htmlComp" checked={htmlConfig.competences === t.v} onChange={function() { setHtmlConfig(Object.assign({}, htmlConfig, { competences: t.v })); }} /> {t.l}
                    </label>); })}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4 }}>Autres blocs</div>
                {[
                  { key: "commentaire",     label: "Commentaire enseignant" },
                  { key: "detailExercices", label: "Détail par exercice (✨🎁)" },
                  { key: "bareme",          label: "Barème item par item" },
                  { key: "histogramme",     label: "Histogramme de la classe" },
                ].map(function(it) { return (
                  <label key={it.key} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, cursor: "pointer", fontSize: 11, fontFamily: FONT_B, color: htmlConfig[it.key] ? th.text : th.textMuted }}>
                    <input type="checkbox" checked={!!htmlConfig[it.key]} onChange={function(e) { setHtmlConfig(Object.assign({}, htmlConfig, { [it.key]: e.target.checked })); }} />
                    {it.label}
                  </label>); })}
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid " + th.border }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 6 }}>Preset</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={function() { setHtmlPresets([{ name: "preset", config: Object.assign({}, htmlConfig) }]); }}
                      style={{ flex: 1, padding: "6px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, background: th.accentBg, border: "1px solid " + th.accent + "30", color: th.accent }}>{"💾 Enregistrer"}</button>
                    <button onClick={function() { if (htmlPresets.length && htmlPresets[0].config) { var pc = htmlPresets[0].config; setHtmlConfig(Object.assign({}, DEFAULT_HTML_CONFIG, pc, { statsEleve: Object.assign({}, DEFAULT_HTML_CONFIG.statsEleve, pc.statsEleve), statsClasse: Object.assign({}, DEFAULT_HTML_CONFIG.statsClasse, pc.statsClasse) })); } }}
                      disabled={!htmlPresets.length}
                      style={{ flex: 1, padding: "6px", borderRadius: th.radiusSm, cursor: htmlPresets.length ? "pointer" : "not-allowed", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, background: th.surface, border: "1px solid " + th.border, color: htmlPresets.length ? th.text : th.textDim }}>{"↩ Restaurer"}</button>
                  </div>
                  {htmlPresets.length > 0 && <div style={{ fontSize: 9, color: th.textDim, fontFamily: FONT_B, marginTop: 4 }}>{"Preset enregistré."}</div>}
                </div>
              </div>}

              {/* ── Liens audio ── */}
              {SectionHeader("sound", "🔊", "Liens audio")}
              {exportOpen.sound && <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontFamily: FONT_B, fontWeight: 700, color: th.text }}>
                    <input type="checkbox" checked={soundLinksEnabled} onChange={function(e) { setSoundLinksEnabled(e.target.checked); }} />
                    {"Activer les liens audio dans les exports"}
                  </label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 3 }}>{"URL de base"}</div>
                  <input type="text" value={soundBaseUrl} disabled={!soundLinksEnabled}
                    onChange={function(e) { setSoundBaseUrl(e.target.value); }}
                    placeholder="https://monserveur.fr/sons/"
                    style={{ width: "100%", background: soundLinksEnabled ? th.card : th.surface, border: "1px solid " + th.border, color: soundLinksEnabled ? th.text : th.textDim, borderRadius: 4, padding: "5px 8px", fontSize: 12, fontFamily: MONO, outline: "none", opacity: soundLinksEnabled ? 1 : 0.5 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 3 }}>{"Extension audio"}</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[{ v: "webm", l: "webm (Chrome/Chromium)" }, { v: "mp4", l: "mp4 (Safari)" }].map(function(o) { return (
                      <label key={o.v} style={{ display: "flex", alignItems: "center", gap: 5, cursor: soundLinksEnabled ? "pointer" : "not-allowed", fontSize: 11, fontFamily: FONT_B, color: soundAudioExt === o.v && soundLinksEnabled ? th.text : th.textMuted, opacity: soundLinksEnabled ? 1 : 0.5 }}>
                        <input type="radio" name="soundAudioExt" value={o.v} checked={soundAudioExt === o.v} disabled={!soundLinksEnabled} onChange={function() { setSoundAudioExt(o.v); }} /> {o.l}
                      </label>
                    ); })}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, lineHeight: 1.6, marginBottom: 6 }}>
                  {"Choisissez l'extension selon votre navigateur d'enregistrement : "}<code>{"webm"}</code>{" pour Chrome/Chromium, "}<code>{"mp4"}</code>{" pour Safari."}
                </div>
                <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, lineHeight: 1.6 }}>
                  {"Si votre gabarit LaTeX est personnalisé, ajoutez "}<code>{"\\usepackage[colorlinks=true,urlcolor=blue!60!black]{hyperref}"}</code>{" dans le préambule."}
                </div>
              </div>}

              {/* ── Synchronisation GitHub ── */}
              {SectionHeader("github", "☁️", "Synchronisation GitHub")}
              {exportOpen.github && <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, marginBottom: 10, lineHeight: 1.6 }}>
                  {"Pour sauvegarder/restaurer vos données entre appareils via un dépôt GitHub privé."}
                  <br />{"Créez un PAT sur github.com → Settings → Developer settings → Personal access tokens → Tokens (classic), avec la portée "}
                  <strong>{"repo"}</strong>{"."}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 3 }}>{"Personal Access Token (PAT)"}</div>
                    <input type="password" value={githubPat} onChange={function(e) { setGithubPat(e.target.value); localStorage.setItem("check_github_pat", e.target.value); }}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      style={{ width: "100%", background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "5px 8px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                  </div>
                  <div style={{ fontSize: 11, color: th.warning, marginTop: 4, lineHeight: 1.4 }}>
                    {"⚠️ Ce token est stocké en clair dans le navigateur (localStorage). "}
                    {"Utilisez un "}
                      <a href="https://github.com/settings/personal-access-tokens/new"
                        target="_blank" rel="noopener noreferrer"
                         style={{ color: th.accent }}>
                        {"fine-grained token"}
                     </a>
                    {" avec accès limité à un seul dépôt privé (permission Contents: read & write uniquement)."}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 3 }}>{"Dépôt privé (compte/nom-du-dépôt)"}</div>
                    <input type="text" value={githubRepo} onChange={function(e) { setGithubRepo(e.target.value); localStorage.setItem("check_github_repo", e.target.value); }}
                      placeholder="moncompte/check-sauvegarde"
                      style={{ width: "100%", background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "5px 8px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                  </div>
                  <div style={{ fontSize: 9, color: th.textDim, fontFamily: FONT_B, lineHeight: 1.5 }}>
                    {"Le PAT et le dépôt sont stockés dans le localStorage de votre navigateur (séparé des données métier). Ils ne sont jamais envoyés à d'autres serveurs qu'api.github.com."}
                  </div>
                  {(githubPat || githubRepo) && <button onClick={function() { setGithubPat(""); setGithubRepo(""); localStorage.removeItem("check_github_pat"); localStorage.removeItem("check_github_repo"); }} style={{ marginTop: 6, padding: "5px 12px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, background: "transparent", border: "1px solid " + th.danger, color: th.danger }}>
                    {"🔓 Dissocier ce compte GitHub"}
                  </button>}
                </div>
              </div>}
            </div>
          );
        })()}

        {/* ── Bas du modal : debug + fermer ── */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid " + th.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onOpenDebug} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 10, fontFamily: FONT_B, padding: "2px 4px" }}>
            {"🔬 Debug"}
          </button>
          {savedFlash && (
            <span style={{ fontSize: 12, color: "var(--color-success, #4caf50)", fontStyle: "italic", opacity: 0.9, transition: "opacity 0.3s" }}>
              ✓ Sauvegardé
            </span>
          )}
          <button onClick={onClose} style={{ padding: "8px 24px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.accent, border: "none", color: "#fff" }}>
            {"Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}
