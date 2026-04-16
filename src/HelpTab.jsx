// ═══════════════════════════════════════════════════════════════════
// HelpTab — Guide d'utilisation illustré de C.H.E.C.K.
// ═══════════════════════════════════════════════════════════════════
//
// Composant React défini HORS de App() — même pattern que DebugModal
// et AudioRecorder. Aucune logique métier, aucun hook d'état global.
//
// Props : { th, FONT, FONT_B, MONO }
//
// Usage dans App.jsx :
//   {mode === "aide" && <HelpTab th={th} FONT={FONT} FONT_B={FONT_B} MONO={MONO} />}
// ═══════════════════════════════════════════════════════════════════

// NOTE : useState est importé nommément dans App.jsx — ce composant
// en hérite via le même bundle. Pas besoin de ré-importer.

import { useState } from "react";
import { APP_VERSION } from "./config/settings";

function HelpTab({ th, FONT, FONT_B, MONO }) {
  var _aideTab = useState("tutoriel");
  var aideTab = _aideTab[0];
  var setAideTab = _aideTab[1];
  var _aideOpen = useState({});
  var aideOpen = _aideOpen[0];
  var setAideOpen = _aideOpen[1];

  // ─── Styles réutilisables ──────────────────────────────────────

  var card = {
    background: th.card,
    borderRadius: th.radius,
    border: "1px solid " + th.border,
    boxShadow: th.shadow,
    marginBottom: 10,
    overflow: "hidden",
  };

  var badge = function(label, color) {
    return (
      <span style={{
        display: "inline-block", fontSize: 9, fontWeight: 700,
        padding: "1px 6px", borderRadius: 10, fontFamily: MONO,
        background: (color || th.accent) + "20",
        border: "1px solid " + (color || th.accent) + "55",
        color: color || th.accent, marginRight: 3,
      }}>{label}</span>
    );
  };

  var kbd = function(key) {
    return (
      <span style={{
        display: "inline-block", fontFamily: MONO, fontSize: 10,
        padding: "1px 6px", borderRadius: 4, fontWeight: 700,
        background: th.surface, border: "1px solid " + th.borderDark,
        color: th.text, margin: "0 2px",
      }}>{key}</span>
    );
  };

  var tip = function(text, color) {
    return (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 7,
        padding: "8px 12px", borderRadius: th.radiusSm,
        background: (color || th.accent) + "10",
        border: "1px solid " + (color || th.accent) + "30",
        marginTop: 8,
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>
          {color === th.warning ? "💡" : color === th.success ? "✅" : color === th.danger ? "⚠️" : "ℹ️"}
        </span>
        <span style={{ fontSize: 11, fontFamily: FONT_B, color: th.textMuted, lineHeight: 1.6 }}>{text}</span>
      </div>
    );
  };

  // ─── Captures simulées ─────────────────────────────────────────

  var SimWindow = function({ children, label }) {
    return (
      <div style={{
        background: th.surface, borderRadius: th.radius,
        border: "1px solid " + th.border, overflow: "hidden",
        margin: "12px 0", fontSize: 11, fontFamily: FONT_B,
      }}>
        {label && (
          <div style={{
            background: th.card, borderBottom: "1px solid " + th.border,
            padding: "5px 10px", fontSize: 9, fontWeight: 700,
            color: th.textDim, fontFamily: MONO, letterSpacing: 1,
            textTransform: "uppercase",
          }}>{label}</div>
        )}
        <div style={{ padding: "10px 12px" }}>{children}</div>
      </div>
    );
  };

  var SimBtn = function({ label, color, small }) {
    var c = color || th.accent;
    return (
      <span style={{
        display: "inline-block", padding: small ? "2px 8px" : "5px 12px",
        borderRadius: th.radiusSm, background: c, color: "#fff",
        fontWeight: 700, fontSize: small ? 9 : 11, fontFamily: FONT_B,
        margin: "0 3px",
      }}>{label}</span>
    );
  };

  var SimBtnOutline = function({ label, color, small }) {
    var c = color || th.accent;
    return (
      <span style={{
        display: "inline-block", padding: small ? "2px 8px" : "5px 12px",
        borderRadius: th.radiusSm, background: c + "15",
        border: "1px solid " + c + "55", color: c,
        fontWeight: 700, fontSize: small ? 9 : 11, fontFamily: FONT_B,
        margin: "0 3px",
      }}>{label}</span>
    );
  };

  var SimCheck = function({ label, pts, checked }) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", marginBottom: 3, borderRadius: th.radiusSm,
        border: "1.5px solid " + (checked ? th.success + "50" : th.border),
        background: checked ? th.success + "08" : "transparent",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 3, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: checked ? th.success : "transparent",
          border: "2px solid " + (checked ? th.success : th.textDim),
          color: "#fff", fontSize: 11, fontWeight: 800,
        }}>{checked ? "✓" : ""}</div>
        <span style={{ flex: 1, color: checked ? th.text : th.textMuted }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: checked ? th.success : th.textDim, fontWeight: 700 }}>{pts}</span>
      </div>
    );
  };

  var SimComp = function({ id, lettre, color }) {
    return (
      <div style={{
        flex: 1, textAlign: "center", padding: "5px 4px",
        border: "2px solid " + color, borderRadius: th.radiusSm,
        background: color + "08",
      }}>
        <div style={{ fontSize: 8, color: th.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{id}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: color, fontFamily: MONO }}>{lettre}</div>
      </div>
    );
  };

  var SimRem = function({ label, active }) {
    return (
      <span style={{
        display: "inline-block", padding: "4px 10px", borderRadius: 12,
        fontSize: 10, fontWeight: 600, fontFamily: FONT_B,
        background: active ? th.warningBg : "transparent",
        border: "1px solid " + (active ? th.warning + "50" : th.border),
        color: active ? th.warning : th.textMuted, margin: "2px",
      }}>{label}</span>
    );
  };

  // ─── Accordéon de section Référence ───────────────────────────

  var RefSection = function({ id, icon, titre, children }) {
    var open = aideOpen[id];
    return (
      <div style={card}>
        <button
          onMouseDown={function(e) { e.preventDefault(); }}
          onClick={function() { setAideOpen(function(p) { return Object.assign({}, p, { [id]: !p[id] }); }); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "13px 16px", background: open ? th.accentBg : th.card,
            border: "none", cursor: "pointer", textAlign: "left",
          }}
        >
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, fontFamily: FONT, color: open ? th.accent : th.text }}>{titre}</span>
          <span style={{
            fontSize: 10, color: th.textMuted, display: "inline-block",
            transition: "transform 0.22s", transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}>{"▼"}</span>
        </button>
        <div style={{
          maxHeight: open ? "3600px" : "0px",
          overflow: "hidden", transition: "max-height 0.35s ease",
        }}>
          <div style={{ borderTop: "1px solid " + th.border, padding: "14px 16px" }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  var Li = function({ children }) {
    return (
      <div style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
        <span style={{ color: th.accent, fontSize: 10, marginTop: 4, flexShrink: 0 }}>▸</span>
        <span style={{ fontSize: 12, fontFamily: FONT_B, color: th.textMuted, lineHeight: 1.65 }}>{children}</span>
      </div>
    );
  };

  var H = function({ children }) {
    return (
      <div style={{
        fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B,
        textTransform: "uppercase", letterSpacing: 1, marginTop: 14, marginBottom: 6,
      }}>{children}</div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // DONNÉES DU TUTORIEL (8 étapes)
  // ═══════════════════════════════════════════════════════════════

  var etapes = [
    // ── Étape 1 : Profil ──────────────────────────────────────────
    {
      num: 1,
      titre: "Configurer votre profil",
      desc: "Avant toute chose, renseignez les informations de votre établissement. Elles apparaîtront dans tous vos rapports.",
      instruction: "Cliquez sur ⚙️ Réglages → onglet 🏫 Établissement, remplissez les champs, puis fermez.",
      sim: (
        <SimWindow label="⚙️ Réglages › Établissement">
          {[
            { l: "Nom de l'établissement", v: "Lycée Joffre" },
            { l: "Classe", v: "MP2I" },
            { l: "Année scolaire", v: "2024-2025" },
          ].map(function(f) {
            return (
              <div key={f.l} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: th.textDim, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>{f.l}</div>
                <div style={{
                  padding: "5px 9px", borderRadius: th.radiusSm,
                  border: "1px solid " + th.border, background: th.card,
                  fontSize: 12, fontFamily: FONT_B, color: th.text,
                }}>{f.v}</div>
              </div>
            );
          })}
          <div style={{ padding: "8px 10px", background: th.accentBg, borderRadius: th.radiusSm, border: "1px solid " + th.accent + "30", marginTop: 8 }}>
            <div style={{ fontSize: 9, color: th.accent, fontWeight: 700, marginBottom: 2 }}>Aperçu pied de page LaTeX</div>
            <div style={{ fontSize: 11, fontFamily: MONO, color: th.text }}>Lycée Joffre · MP2I</div>
          </div>
        </SimWindow>
      ),
    },

    // ── Étape 2 : Créer un DS ─────────────────────────────────────
    {
      num: 2,
      titre: "Créer un devoir surveillé",
      desc: "Un « DS » est le conteneur principal. Il regroupe la structure du sujet, les élèves et toutes les notes.",
      instruction: "Dans l'onglet ⚙️ Préparation, cliquez sur « + Nouveau devoir », puis saisissez le nom et la date directement dans le bandeau du DS.",
      sim: (
        <SimWindow label="⚙️ Préparation">
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
            background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border, marginBottom: 8,
          }}>
            <span style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT_B, color: th.text, flex: 2 }}>DS 01 — Mécanique</span>
            <span style={{ fontSize: 11, color: th.textDim, fontFamily: FONT_B }}>Date :</span>
            <span style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, flex: 1 }}>14/04/2025</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: th.accent, fontWeight: 700, padding: "2px 8px", background: th.accentBg, borderRadius: 8 }}>20 pts</span>
          </div>
          <div style={{
            border: "1px dashed " + th.accent + "55", borderRadius: th.radiusSm,
            padding: "8px", textAlign: "center", color: th.accent,
            fontSize: 12, fontWeight: 700, fontFamily: FONT_B, background: th.accentBg,
          }}>+ Nouveau devoir</div>
        </SimWindow>
      ),
    },

    // ── Étape 3 : Choisir le preset ───────────────────────────────
    {
      num: 3,
      titre: "Choisir les fonctionnalités du devoir",
      desc: "Chaque DS peut utiliser un jeu de fonctionnalités différent. Choisissez un preset adapté à la complexité de votre sujet — vous pourrez toujours l'ajuster.",
      instruction: "Dans le bloc « Fonctionnalités du devoir » (sous le nom du DS), sélectionnez un preset. Le preset conditionne tout l'affichage : correction, stats et exports.",
      sim: (
        <SimWindow label="Fonctionnalités du devoir">
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              { icon: "♙", label: "Simple", desc: "Notes brutes uniquement", active: false, color: th.textMuted },
              { icon: "♜", label: "Standard", desc: "Compétences + malus", active: false, color: th.accent },
              { icon: "♔", label: "Complet", desc: "Tout activer", active: true, color: th.success },
              { icon: "♞", label: "Personnalisé", desc: "Choix libre", active: false, color: th.warning },
            ].map(function(p) {
              return (
                <div key={p.label} style={{
                  flex: 1, minWidth: 60, padding: "7px 6px", textAlign: "center",
                  borderRadius: th.radiusSm, cursor: "pointer",
                  border: "2px solid " + (p.active ? p.color : th.border),
                  background: p.active ? p.color + "12" : "transparent",
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{p.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT_B, color: p.active ? p.color : th.textMuted }}>{p.label}</div>
                  <div style={{ fontSize: 8, color: th.textDim, fontFamily: FONT_B, marginTop: 2, lineHeight: 1.3 }}>{p.desc}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["✓ Compétences A/N/R/V", "✓ Coefficients ×", "✓ Questions bonus 🎁", "✓ Bonus complet 🏆", "✓ Malus auto", "✓ Questions pièges ⚠️"].map(function(chip) {
              return (
                <span key={chip} style={{ padding: "2px 8px", borderRadius: 10, fontSize: 9, fontWeight: 600, fontFamily: FONT_B, background: th.success + "15", border: "1px solid " + th.success + "40", color: th.success }}>{chip}</span>
              );
            })}
          </div>
        </SimWindow>
      ),
    },

    // ── Étape 4 : Structure du sujet ──────────────────────────────
    {
      num: 4,
      titre: "Saisir la structure du sujet",
      desc: "Ajoutez vos exercices, puis vos questions, puis vos items — chaque critère de notation est un item avec ses points. Assignez les compétences et les options spéciales.",
      instruction: "Cliquez sur « + Exercice », puis « + Question », puis « + Item » pour chaque critère. Assignez les compétences A/N/R/V à chaque question. Réordonnez avec ▲/▼.",
      sim: (
        <SimWindow label="Structure du sujet">
          <div style={{ background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border, overflow: "hidden" }}>
            <div style={{ padding: "6px 10px", borderBottom: "1px solid " + th.border, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, color: th.text, fontSize: 12 }}>Exercice 1 — Cinématique</span>
              <span style={{ fontSize: 9, color: th.textMuted, fontFamily: MONO, padding: "1px 5px", background: th.accentBg, borderRadius: 4 }}>× 1</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: th.textMuted, marginLeft: "auto" }}>8 pts</span>
            </div>
            <div style={{ padding: "8px 12px" }}>
              {[
                { label: "Q.1", comp: ["Ap.", "R."], items: ["Calculer la vitesse  2 pt", "Justifier le résultat  1 pt"], bonus: false, piege: false },
                { label: "Q.2 🎁", comp: ["An."], items: ["Réponse bonus  1 pt"], bonus: true, piege: false },
              ].map(function(q, qi) {
                return (
                  <div key={qi} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: "2px solid " + (q.bonus ? th.success + "60" : th.accent + "40") }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: q.bonus ? th.success : th.text, fontFamily: FONT_B }}>{q.label}</span>
                      {q.comp.map(function(c) { return badge(c, "#2855a0"); })}
                      {q.bonus && <span style={{ fontSize: 9, color: th.success, fontFamily: MONO, marginLeft: 2 }}>bonus</span>}
                    </div>
                    {q.items.map(function(item, ii) {
                      return (
                        <div key={ii} style={{ fontSize: 10, color: th.textMuted, fontFamily: MONO, paddingLeft: 8, marginBottom: 2 }}>
                          {"└ " + item}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: th.success + "08", borderRadius: th.radiusSm, border: "1px solid " + th.success + "30", marginTop: 4 }}>
                <span style={{ fontSize: 11 }}>🏆</span>
                <span style={{ fontSize: 10, color: th.success, fontFamily: FONT_B }}>Bonus exercice complet — +1 pt si score ≥ 70 %</span>
              </div>
            </div>
          </div>
        </SimWindow>
      ),
    },

    // ── Étape 5 : Importer les élèves ─────────────────────────────
    {
      num: 5,
      titre: "Importer la liste des élèves",
      desc: "Importez vos élèves depuis un fichier CSV, ou saisissez-les un par un. Assignez-les ensuite à des groupes si besoin.",
      instruction: "Cliquez sur « 📂 CSV » et sélectionnez votre fichier (format : NOM;Prénom, un élève par ligne). Vous pouvez aussi ajouter des élèves manuellement avec « + Élève ».",
      sim: (
        <SimWindow label="⚙️ Préparation › Élèves">
          <div style={{ fontFamily: MONO, fontSize: 10, color: th.textDim, padding: "6px 8px", background: th.card, borderRadius: th.radiusSm, marginBottom: 8, border: "1px solid " + th.border }}>
            <div style={{ fontSize: 8, color: th.accent, fontWeight: 700, marginBottom: 4 }}>EXEMPLE CSV</div>
            <div>DUPONT;Jean</div>
            <div>MARTIN;Claire</div>
            <div>LEROY;Thomas</div>
            <div style={{ color: th.textDim }}>… (un élève par ligne)</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <SimBtnOutline label="📂 CSV" />
            <SimBtnOutline label="+ Élève" />
            <SimBtnOutline label="Groupes" />
          </div>
          <div style={{ marginTop: 8 }}>
            {[
              { name: "DUPONT Jean", groupe: "tt" },
              { name: "MARTIN Claire", groupe: "" },
              { name: "LEROY Thomas", groupe: "nsi" },
            ].map(function(n, i) {
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid " + th.border + "44" }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: th.textDim, minWidth: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontFamily: FONT_B, color: th.text, flex: 1 }}>{n.name}</span>
                  {n.groupe === "tt" && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: th.warning + "20", color: th.warning, fontFamily: MONO }}>TT</span>}
                  {n.groupe === "nsi" && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: th.accent + "20", color: th.accent, fontFamily: MONO }}>NSI</span>}
                </div>
              );
            })}
          </div>
        </SimWindow>
      ),
    },

    // ── Étape 6 : Corriger les copies ─────────────────────────────
    {
      num: 6,
      titre: "Corriger les copies",
      desc: "Passez en onglet Correction. Naviguez d'élève en élève et cochez les items réussis. Le score se met à jour en temps réel. Ajoutez des remarques de présentation si nécessaire.",
      instruction: "Utilisez les flèches ◂/▸ pour changer d'élève (ou swipez sur tablette). Les boutons ◄/► en bas avancent exercice par exercice. Raccourcis clavier : ← → pour les exercices, 1–9 pour sauter directement.",
      sim: (
        <SimWindow label="✏️ Correction — DUPONT Jean">
          <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
            {[
              { id: "A", color: "#2855a0", lettre: "B" },
              { id: "N", color: "#6a3a9a", lettre: "A" },
              { id: "R", color: "#2a7a3a", lettre: "C" },
              { id: "V", color: "#c07a10", lettre: "B" },
            ].map(function(c) { return <SimComp key={c.id} id={c.id} lettre={c.lettre} color={c.color} />; })}
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: th.success }}>13.5<span style={{ fontSize: 10, color: th.textDim }}>/20</span></div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: th.textDim }}>11/20 pts bruts</div>
            </div>
          </div>
          <SimCheck label="Calculer la vitesse" pts="2" checked={true} />
          <SimCheck label="Justifier le résultat" pts="1" checked={true} />
          <SimCheck label="Analyser le graphe" pts="3" checked={false} />
          <SimCheck label="Conclure" pts="2" checked={true} />
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            <SimRem label="✏️ Rédaction" active={true} />
            <SimRem label="📐 Unités" active={false} />
            <SimRem label="🧹 Soin" active={false} />
          </div>
          <div style={{ marginTop: 8, padding: "5px 8px", background: th.danger + "10", border: "1px solid " + th.danger + "30", borderRadius: th.radiusSm, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: th.danger, fontFamily: MONO, fontWeight: 700 }}>−3 %</span>
            <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>malus présentation (1 remarque)</span>
          </div>
        </SimWindow>
      ),
    },

    // ── Étape 7 : Consulter les résultats ─────────────────────────
    {
      num: 7,
      titre: "Consulter les résultats",
      desc: "L'onglet Résultats individuels affiche un aperçu du rapport d'un élève sélectionné — ou le rapport de classe complet avec stats agrégées.",
      instruction: "Allez dans l'onglet 🧑 Résultats. Choisissez un élève dans le menu déroulant pour son rapport individuel, ou sélectionnez « 📊 Toute la classe » pour le rapport de classe en projection.",
      sim: (
        <SimWindow label="🧑 Résultats individuels">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B }}>Élève</span>
            <div style={{ flex: 1, padding: "5px 10px", border: "1px solid " + th.border, borderRadius: th.radiusSm, fontSize: 12, fontFamily: FONT_B, color: th.text, background: th.card }}>
              DUPONT Jean ▾
            </div>
            <span style={{ fontSize: 11, color: th.textDim, fontFamily: MONO }}>13.5/20 · rang 3/24</span>
          </div>
          <div style={{ padding: "6px 10px", background: th.accentBg, borderRadius: th.radiusSm, border: "1px solid " + th.accent + "30", marginBottom: 8, fontSize: 11, color: th.accent, fontFamily: FONT_B, display: "flex", alignItems: "center", gap: 6 }}>
            <span>📊</span>
            <span><strong>Toute la classe</strong> — rapport de classe en format projection (paysage A4)</span>
          </div>
          <div style={{ border: "1px solid " + th.border, borderRadius: th.radiusSm, overflow: "hidden" }}>
            <div style={{ background: th.accent + "0c", padding: "10px 14px", borderBottom: "1px solid " + th.border }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT, color: th.text }}>Jean <em>Dupont</em></div>
              <div style={{ fontSize: 9, color: th.textDim, marginTop: 2 }}>Lycée Joffre · MP2I</div>
            </div>
            <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: th.success }}>13.5</div>
                <div style={{ fontSize: 9, color: th.textDim }}>/ 20</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: th.warning }}>3</div>
                <div style={{ fontSize: 9, color: th.textDim }}>/ 24</div>
              </div>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>
                <div>Justesse : 72 %</div>
                <div>Efficacité : 85 %</div>
                <div>Malus : aucun</div>
              </div>
            </div>
          </div>
        </SimWindow>
      ),
    },

    // ── Étape 8 : Exporter ────────────────────────────────────────
    {
      num: 8,
      titre: "Exporter les rapports",
      desc: "Générez les rapports HTML autonomes pour vos élèves, les sources LaTeX, le CSV de classe et le rapport de classe — tout depuis l'onglet Export.",
      instruction: "Allez dans l'onglet 📄 Export. La section « Pour les élèves » génère les rapports HTML individuels (ou le ZIP complet). La section « Pour l'enseignant » donne accès au LaTeX, CSV, et au rapport de classe HTML.",
      sim: (
        <SimWindow label="📄 Export">
          {[
            { section: "📄 Pour les élèves", rows: [
              { label: "Rapport HTML — DUPONT Jean", btn: "Télécharger .html", color: th.accent },
              { label: "Tous les rapports HTML", btn: "Télécharger .zip", color: th.success },
            ]},
            { section: "🗂️ Pour l'enseignant", rows: [
              { label: "Document LaTeX complet", btn: "Télécharger .tex", color: th.textMuted },
              { label: "CSV récapitulatif", btn: "Télécharger .csv", color: th.textMuted },
            ]},
          ].map(function(sec, si) {
            return (
              <div key={si} style={{ marginBottom: si === 0 ? 10 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{sec.section}</div>
                {sec.rows.map(function(row, i) {
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 0", borderBottom: "1px solid " + th.border + "44", gap: 10,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT_B, color: th.text }}>{row.label}</div>
                      <SimBtn label={row.btn} color={row.color} small={true} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </SimWindow>
      ),
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>

      {/* En-tête */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: th.text, marginBottom: 4 }}>Guide d'utilisation</div>
        <div style={{ fontFamily: FONT_B, fontSize: 12, color: th.textMuted }}>{"C.H.E.C.K. v " + APP_VERSION}</div>
      </div>

      {/* Onglets internes */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid " + th.border }}>
        {[
          { id: "tutoriel", label: "🚀 Pour bien débuter" },
          { id: "reference", label: "📖 Référence complète" },
        ].map(function(t) {
          var active = aideTab === t.id;
          return (
            <button key={t.id} onClick={function() { setAideTab(t.id); }}
              style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: FONT_B,
                cursor: "pointer", border: "none", background: "transparent",
                borderBottom: active ? "2px solid " + th.accent : "2px solid transparent",
                marginBottom: -2, color: active ? th.accent : th.textMuted,
                transition: "color 0.15s",
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ONGLET TUTORIEL
      ═══════════════════════════════════════════════════════════ */}
      {aideTab === "tutoriel" && (
        <div>
          <div style={{
            padding: "12px 16px", background: th.accentBg,
            borderRadius: th.radius, border: "1px solid " + th.accent + "30",
            marginBottom: 16, fontSize: 12, fontFamily: FONT_B, color: th.textMuted, lineHeight: 1.7,
          }}>
            Ce tutoriel vous guide pas à pas de la création d'un devoir jusqu'à l'export des rapports pour vos élèves.
            Comptez <strong style={{ color: th.text }}>15 à 20 minutes</strong> pour configurer votre premier DS.
          </div>

          {etapes.map(function(etape) {
            return (
              <div key={etape.num} style={Object.assign({}, card, { padding: 0 })}>
                {/* En-tête de l'étape */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderBottom: "1px solid " + th.border,
                  background: th.surface,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: th.accent, color: "#fff",
                    fontFamily: MONO, fontSize: 14, fontWeight: 800,
                  }}>{etape.num}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: th.text }}>{etape.titre}</div>
                    <div style={{ fontFamily: FONT_B, fontSize: 11, color: th.textMuted, marginTop: 2, lineHeight: 1.5 }}>{etape.desc}</div>
                  </div>
                </div>

                {/* Capture simulée */}
                <div style={{ padding: "0 16px" }}>
                  {etape.sim}
                </div>

                {/* Instruction */}
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 16px 14px",
                  background: th.success + "08",
                  borderTop: "1px solid " + th.border,
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>👉</span>
                  <span style={{ fontSize: 12, fontFamily: FONT_B, color: th.text, lineHeight: 1.6, fontWeight: 600 }}>
                    {etape.instruction}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Carte de félicitations */}
          <div style={{
            ...card, padding: "20px 20px", textAlign: "center",
            background: th.success + "08", border: "1px solid " + th.success + "40",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: th.text, marginBottom: 6 }}>
              Votre premier DS est prêt !
            </div>
            <div style={{ fontFamily: FONT_B, fontSize: 12, color: th.textMuted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
              Les rapports HTML sont autonomes — aucune dépendance, aucun serveur.
              Vos élèves peuvent les ouvrir dans n'importe quel navigateur.
              Pour en savoir plus sur chaque fonctionnalité, consultez la <strong style={{ color: th.accent }}>Référence complète</strong>.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ONGLET RÉFÉRENCE
      ═══════════════════════════════════════════════════════════ */}
      {aideTab === "reference" && (
        <div>

          {/* ── Préparation ── */}
          <RefSection id="prep" icon="⚙️" titre="Préparation du sujet">
            <H>Structure d'un DS</H>
            <Li>Un DS contient un ou plusieurs <strong>exercices</strong>, chaque exercice contient des <strong>questions</strong>, chaque question contient des <strong>items</strong> (critères de notation individuels).</Li>
            <Li>Chaque item reçoit un nombre de points. La somme des items d'une question est son total, la somme des questions donne le total de l'exercice.</Li>
            <SimWindow label="Hiérarchie DS → Exercice → Question → Item">
              <div style={{ fontFamily: MONO, fontSize: 11, color: th.textMuted, lineHeight: 2 }}>
                <div>📋 <strong style={{ color: th.text }}>DS 01 — Mécanique</strong> <span style={{ color: th.accent }}>20 pts</span></div>
                <div style={{ paddingLeft: 16 }}>└─ 📂 <strong>Exercice 1</strong> <span style={{ color: th.textDim }}>8 pts</span></div>
                <div style={{ paddingLeft: 32 }}>├─ ❓ Q.1 <span style={{ color: th.textDim }}>[Ap. R.]  3 pts</span></div>
                <div style={{ paddingLeft: 48 }}>├─ • Item a <span style={{ color: th.accent }}>2 pts</span></div>
                <div style={{ paddingLeft: 48 }}>└─ • Item b <span style={{ color: th.accent }}>1 pt</span></div>
                <div style={{ paddingLeft: 32 }}>└─ ❓ Q.2 🎁 <span style={{ color: th.textDim }}>[An.]  2 pts bonus</span></div>
              </div>
            </SimWindow>

            <H>Fonctionnalités par DS — les presets</H>
            <Li>Chaque DS dispose d'un <strong>bloc « Fonctionnalités du devoir »</strong> qui conditionne toute l'interface, les statistiques et les exports. Choisissez le preset adapté à votre sujet.</Li>
            <SimWindow label="Les quatre presets">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {[
                  { icon: "♙", label: "Simple", color: th.textMuted, desc: "Notes brutes uniquement. Idéal pour un contrôle rapide sans compétences." },
                  { icon: "♜", label: "Standard", color: th.accent, desc: "Compétences A/N/R/V, questions bonus et malus automatique. Preset recommandé." },
                  { icon: "♔", label: "Complet", color: th.success, desc: "Toutes les fonctionnalités : coefficients, bonus exercice complet, questions pièges." },
                  { icon: "♞", label: "Personnalisé", color: th.warning, desc: "Activez ou désactivez chaque fonctionnalité individuellement avec des infobulles." },
                ].map(function(p) {
                  return (
                    <div key={p.label} style={{ padding: "8px 10px", border: "1px solid " + p.color + "40", borderRadius: th.radiusSm, background: p.color + "08" }}>
                      <div style={{ fontSize: 14, marginBottom: 3 }}>{p.icon} <strong style={{ color: p.color }}>{p.label}</strong></div>
                      <div style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B, lineHeight: 1.5 }}>{p.desc}</div>
                    </div>
                  );
                })}
              </div>
            </SimWindow>
            {tip("Le preset par défaut à la création est ♜ Standard. Les DS existants importés sans champ features utilisent automatiquement ♔ Complet pour ne rien perdre.", th.accent)}

            <H>Compétences A/N/R/V</H>
            <Li>Chaque question est associée à une ou plusieurs compétences : {badge("Ap.", "#2855a0")} {badge("An.", "#6a3a9a")} {badge("R.", "#2a7a3a")} {badge("V.", "#c07a10")} — Apprendre, Analyser, Réaliser, Valider.</Li>
            <Li>Les compétences déterminent la note lettre (A/B/C/D/NN) affichée dans les rapports et les statistiques. Les seuils sont configurables dans Réglages → 🎓 Évaluation.</Li>

            <H>Options spéciales par exercice ou question</H>
            <Li><strong>Coefficient ×</strong> : multiplie les points de l'exercice dans le total pondéré. Utile pour équilibrer des exercices de longueurs inégales. Actif avec preset ♔ Complet ou ♞ Personnalisé.</Li>
            <Li><strong>Question bonus 🎁</strong> : les points s'ajoutent au score de l'élève <em>sans</em> augmenter le maximum de l'examen. Les élèves peuvent donc dépasser 20/20 si la normalisation le permet.</Li>
            <Li><strong>Bonus exercice complet 🏆</strong> : déclenché automatiquement quand un élève traite toutes les questions non-bonus d'un exercice ET atteint le seuil de score configuré. Ajoute des points fixes ou un pourcentage. Actif avec preset ♔ Complet ou ♞ Personnalisé.</Li>
            <SimWindow label="Bonus exercice complet — déclenchement">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, padding: "6px 10px", borderRadius: th.radiusSm, background: th.success + "10", border: "1px solid " + th.success + "40", fontSize: 11, color: th.success, fontFamily: FONT_B }}>
                  <strong>🏆 Déclenché</strong> — toutes les questions traitées + score ≥ 70 %<br />
                  <span style={{ fontSize: 10, color: th.textMuted }}>→ +1 pt ajouté au score</span>
                </div>
                <div style={{ flex: 1, padding: "6px 10px", borderRadius: th.radiusSm, background: th.border + "30", border: "1px solid " + th.border, fontSize: 11, color: th.textMuted, fontFamily: FONT_B }}>
                  <strong>Non déclenché</strong> — une question non traitée<br />
                  <span style={{ fontSize: 10 }}>→ pas de bonus</span>
                </div>
              </div>
            </SimWindow>
            {tip("Le seuil et la valeur du bonus exercice complet se configurent dans Réglages → 🎓 Évaluation.", th.accent)}

            <H>Gestion des élèves</H>
            <Li>Format CSV accepté : <span style={{ fontFamily: MONO, fontSize: 11, background: th.surface, padding: "1px 5px", borderRadius: 3 }}>NOM;Prénom</span> — un élève par ligne. Séparateurs acceptés : <kbd>;</kbd> , <kbd>,</kbd> ou tabulation.</Li>
            <Li>Les groupes (tiers-temps, NSI…) se configurent dans Réglages → ✏️ Correction et s'assignent dans la liste des élèves. Le groupe tiers-temps applique automatiquement un coefficient de temps supplémentaire.</Li>
            {tip("Vous pouvez réordonner les exercices et les questions avec les boutons ▲/▼ dans l'en-tête de chaque bloc.", th.accent)}
          </RefSection>

          {/* ── Correction ── */}
          <RefSection id="correct" icon="✏️" titre="Correction des copies">
            <H>Navigation</H>
            <Li>Flèches <strong>◂/▸</strong> (ou swipe sur tablette) pour changer d'élève. Les onglets d'exercice permettent de sauter d'un exercice à l'autre.</Li>
            <Li>Les boutons <strong>◄ Ex. préc. / Ex. suiv. ►</strong> en bas avancent exercice par exercice et passent automatiquement à l'élève suivant en fin de sujet.</Li>
            <Li>Raccourcis clavier : {kbd("←")} {kbd("→")} pour les exercices, {kbd("1")}–{kbd("9")} pour sauter à l'exercice N.</Li>
            <Li>La <strong>barre de progression</strong> sous le header indique le nombre de copies corrigées parmi les élèves présents.</Li>

            <H>Saisie des notes</H>
            <SimWindow label="Question Q.1 — items">
              <SimCheck label="Calculer la vitesse correctement" pts="2 pts" checked={true} />
              <SimCheck label="Justifier la démarche" pts="1 pt" checked={false} />
              <div style={{ marginTop: 6 }}>
                <button style={{
                  padding: "2px 8px", fontSize: 9, borderRadius: 3, cursor: "pointer",
                  border: "1px solid " + th.warning + "55", background: th.warning + "18",
                  color: th.warning, fontFamily: FONT_B, fontWeight: 600,
                }}>marquer traitée (0 pt)</button>
                <span style={{ fontSize: 10, color: th.textDim, fontFamily: FONT_B, marginLeft: 8 }}>← si la question a été tentée sans succès</span>
              </div>
            </SimWindow>
            <Li>Si aucun item n'est coché mais que la question a été tentée, utilisez <strong>« marquer traitée »</strong> pour que l'élève ne soit pas pénalisé dans les ratios de justesse/efficacité.</Li>

            <H>Remarques de présentation</H>
            <Li>Les remarques sont attribuées question par question. Celles marquées <strong>« malus »</strong> déclenchent automatiquement une pénalité sur la note selon les paliers de Réglages → 📊 Notes.</Li>
            <SimWindow label="Remarques disponibles">
              <div>
                <SimRem label="✏️ Rédaction" active={true} />
                <SimRem label="⚖️ Homogénéité" active={false} />
                <SimRem label="📐 Unités" active={true} />
                <SimRem label="🧹 Soin" active={false} />
                <SimRem label="⚠️ À reprendre" active={false} />
              </div>
            </SimWindow>
            <Li>Les remarques disponibles, leur ordre et leur caractère « malus » se configurent dans Réglages → ✏️ Correction. Vous pouvez créer des remarques personnalisées persistantes pour tous vos DS.</Li>

            <H>Malus</H>
            <Li>Le malus automatique se déclenche selon le nombre de remarques « malus » accumulées. Un malus manuel (en %) peut être ajouté individuellement.</Li>
            <Li>Le malus peut être appliqué <strong>avant</strong> ou <strong>après</strong> la normalisation (Réglages → 📊 Notes).</Li>

            <H>Commentaire et audio</H>
            <Li>Un commentaire libre par élève peut être saisi dans le champ texte — il apparaît dans tous les rapports.</Li>
            <Li>Le bouton 🎙️ dans l'en-tête de chaque question permet d'enregistrer un commentaire audio téléchargeable. Le fichier est nommé automatiquement : <code style={{ fontFamily: MONO, fontSize: 10 }}>DS_ELEVE_Exercice_Question.ext</code>.</Li>
            <Li>Pour que les élèves puissent écouter ces enregistrements depuis leur rapport, activez les <strong>Liens audio</strong> dans Réglages → 📤 Export → 🔊. Renseignez l'URL de base du dossier où vous hébergez les fichiers, et choisissez l'extension selon votre navigateur (<code style={{ fontFamily: MONO, fontSize: 10 }}>webm</code> pour Chrome, <code style={{ fontFamily: MONO, fontSize: 10 }}>mp4</code> pour Safari).</Li>
          </RefSection>

          {/* ── Résultats ── */}
          <RefSection id="resultats" icon="🧑" titre="Résultats individuels">
            <H>Aperçu élève</H>
            <Li>Sélectionnez un élève dans le menu déroulant pour afficher son rapport HTML en aperçu temps réel — note, rang, compétences, histogramme, détail des exercices.</Li>
            <Li>L'élève sélectionné ici est également celui utilisé pour les exports individuels dans l'onglet Export → Pour les élèves.</Li>
            <SimWindow label="Rapport — aperçu en-tête">
              <div style={{ background: th.accent + "0c", padding: "12px 14px", borderRadius: th.radiusSm }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: th.text }}>Jean <em>Dupont</em></div>
                    <div style={{ fontSize: 9, color: th.textDim }}>Lycée Joffre · MP2I · 2024-2025</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ textAlign: "center", padding: "6px 14px", border: "2px solid " + th.success + "55", borderRadius: th.radiusSm, background: th.success + "14" }}>
                      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: th.success }}>13.5</div>
                      <div style={{ fontSize: 9, color: th.success }}>/ 20</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "6px 14px", border: "2px solid " + th.warning + "55", borderRadius: th.radiusSm, background: th.warning + "14" }}>
                      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: th.warning }}>3</div>
                      <div style={{ fontSize: 9, color: th.warning }}>/ 24</div>
                    </div>
                  </div>
                </div>
              </div>
            </SimWindow>

            <H>Rapport de classe</H>
            <Li>Sélectionnez <strong>« 📊 Toute la classe »</strong> en tête du menu pour afficher le rapport de classe — format paysage A4 adapté à la projection.</Li>
            <Li>Le rapport de classe agrège : statistiques globales (moy/méd/min/max), distribution des notes, performance par compétence, et histogrammes par exercice. Aucun nom d'élève n'apparaît.</Li>
            <Li>Les blocs affichés sont configurables via les checkboxes qui apparaissent sous le sélecteur en mode classe. Ajoutez un commentaire de DS dans le champ dédié.</Li>
            {tip("L'aperçu utilise la configuration de Réglages → Export (thème). Les polices Google Fonts peuvent ne pas se charger dans l'aperçu — le fichier exporté les inclut correctement.", th.accent)}
          </RefSection>

          {/* ── Vue d'ensemble ── */}
          <RefSection id="overview" icon="📋" titre="Vue d'ensemble">
            <H>Tableau élèves × questions</H>
            <Li>L'onglet 📋 affiche un tableau récapitulatif : une ligne par élève (absents exclus), une colonne par question ou item, avec le nombre de points obtenus et un code couleur de réussite.</Li>
            <SimWindow label="Extrait de tableau">
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 10, fontFamily: MONO }}>
                  <thead>
                    <tr>
                      {["Élève", "Q.1", "Q.2", "Q.3", "Total"].map(function(h) {
                        return <th key={h} style={{ padding: "3px 8px", background: th.surface, color: th.textMuted, borderBottom: "1px solid " + th.border, textAlign: h === "Élève" ? "left" : "center" }}>{h}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Dupont J.", vals: [2, 4, 0], totRatio: 0.6 },
                      { name: "Martin A.", vals: [2, 2, 3], totRatio: 0.7 },
                      { name: "Petit L.",  vals: [0, 1, 0], totRatio: 0.1 },
                    ].map(function(row, i) {
                      var ratios = [1, 0.8, 0];
                      return (
                        <tr key={i}>
                          <td style={{ padding: "3px 8px", fontFamily: FONT_B, color: th.text }}>{row.name}</td>
                          {row.vals.map(function(v, j) {
                            var r = ratios[j];
                            var bg = r >= 0.75 ? th.success + "22" : r >= 0.5 ? th.warning + "22" : th.danger + "22";
                            var col = r >= 0.75 ? th.success : r >= 0.5 ? th.warning : th.danger;
                            return <td key={j} style={{ padding: "3px 8px", textAlign: "center", background: bg, color: col, fontWeight: 700 }}>{v}</td>;
                          })}
                          <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700, color: row.totRatio >= 0.75 ? th.success : row.totRatio >= 0.5 ? th.warning : th.danger }}>{(row.totRatio * 10).toFixed(1) + "/10"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SimWindow>

            <H>Code couleur</H>
            <Li>🟢 Vert : ≥ 75 % des points. 🟡 Orange : ≥ 50 %. 🔴 Rouge : {"<"} 50 %. Les cases non tentées (aucun item coché, question non marquée « traitée ») restent neutres.</Li>

            <H>Tri</H>
            <Li>Cliquez sur l'en-tête <strong>Élève</strong> pour trier alphabétiquement. Cliquez sur une colonne question pour trier par taux de réussite. Un deuxième clic inverse le tri, un troisième revient à l'ordre par défaut.</Li>

            <H>Navigation vers la Correction</H>
            <Li>Un clic sur n'importe quelle cellule du tableau bascule directement vers l'onglet Correction, positionné sur l'élève et l'exercice correspondants — idéal pour rectifier une erreur de saisie.</Li>

            <H>Granularité</H>
            <Li>Par défaut, une colonne par <strong>question</strong>. Activez le mode <strong>⊞ Items</strong> pour détailler chaque critère de notation individuellement.</Li>
            {tip("Si vous repérez une colonne anormalement rouge ou verte par rapport aux autres, vérifiez la question correspondante — une erreur de barème est souvent à l'origine.", th.warning)}
          </RefSection>

          {/* ── Stats ── */}
          <RefSection id="stats" icon="📊" titre="Statistiques de classe">
            <H>Onglet Général</H>
            <Li>Distribution des notes /20 avec traits de moyenne et médiane, statistiques globales (moy, méd, min, max, σ), taux de réussite par compétence.</Li>
            <SimWindow label="Tuiles statistiques">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                {[{ l: "Moy", v: "11.4", c: th.accent }, { l: "Méd", v: "12.0", c: "#6a3a9a" }, { l: "Min", v: "4.5", c: th.danger }, { l: "Max", v: "18.5", c: th.success }, { l: "σ", v: "3.2", c: th.textMuted }].map(function(x) {
                  return (
                    <div key={x.l} style={{ textAlign: "center", padding: "6px 4px", background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border }}>
                      <div style={{ fontSize: 8, color: th.textMuted, fontFamily: FONT_B }}>{x.l}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: x.c }}>{x.v}</div>
                    </div>
                  );
                })}
              </div>
            </SimWindow>
            {tip("Les stats sont calculées uniquement sur les copies corrigées (non vides). Les absents et les copies vierges sont exclus.", th.accent)}

            <H>Onglet Exercices — questions difficiles et pièges</H>
            <Li>Taux de traitement et taux de réussite question par question.</Li>
            <Li><strong>Question difficile</strong> (rouge, gras) : traitée par moins de X % de la classe. Le seuil est configurable dans Réglages → 🎓 Évaluation. Le marqueur ✨ indique qu'un élève l'a réussie malgré tout.</Li>
            <Li><strong>Question piège ⚠️</strong> : traitée par au moins 50 % de la classe, mais avec un faible taux de réussite. Révèle une erreur conceptuelle répandue. Le seuil est configurable dans Réglages → 🎓 Évaluation.</Li>
            <SimWindow label="Légende questions">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: th.danger, fontFamily: FONT_B, minWidth: 80 }}>Q.3 (rouge)</span>
                  <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>Question difficile — peu d'élèves l'ont tentée</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: th.warning, fontFamily: FONT_B, minWidth: 80 }}>Q.5 ⚠️</span>
                  <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>Question piège — tentée par beaucoup, mais mal réussie</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: th.success, fontFamily: FONT_B, minWidth: 80 }}>Q.2 ✨</span>
                  <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>Difficile, mais réussie par cet élève</span>
                </div>
              </div>
            </SimWindow>

            <H>Onglet Classement</H>
            <Li>Liste des élèves par rang ou ordre alphabétique, avec notes de compétences et radar par exercice. Filtrable par groupe pédagogique.</Li>
            <Li>Si des groupes pédagogiques sont définis (NSI, option…), les stats peuvent être filtrées sur un sous-groupe. Le groupe Tiers-temps n'apparaît pas comme filtre (données personnelles).</Li>

            <H>Sous-onglet Progression inter-DS</H>
            <Li>Visualisez l'évolution de chaque élève sur <strong>plusieurs DS</strong> : courbe note élève (trait plein) + moyenne classe (pointillés).</Li>
            <Li>Deux modes de visualisation : <strong>courbe</strong> (évolution temporelle) et <strong>radar</strong> (comparaison multi-DS simultanée, jusqu'à 8 DS). Le mode bascule automatiquement vers la courbe au-delà de 8 DS.</Li>
            <Li>Toggle <strong>brut / normalisé</strong> pour comparer les notes selon la méthode de calcul active.</Li>
            <SimWindow label="Progression — courbe élève">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 9, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4 }}>DUPONT Jean — notes sur 20</div>
                <div style={{ position: "relative", height: 60, background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border, overflow: "hidden" }}>
                  {/* Courbe SVG simplifiée */}
                  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
                    <polyline points="20,40 60,28 100,35 140,20 180,22" fill="none" stroke={th.success} strokeWidth="2" />
                    <polyline points="20,38 60,36 100,34 140,33 180,32" fill="none" stroke={th.accent} strokeWidth="1.5" strokeDasharray="4,3" />
                    {[20, 60, 100, 140, 180].map(function(x, i) {
                      return <circle key={i} cx={x} cy={[40,28,35,20,22][i]} r="3" fill={th.success} />;
                    })}
                  </svg>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 14, height: 2, background: th.success }} />
                    <span style={{ fontSize: 9, color: th.textMuted, fontFamily: FONT_B }}>Élève</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 14, height: 2, background: th.accent, borderTop: "2px dashed " + th.accent }} />
                    <span style={{ fontSize: 9, color: th.textMuted, fontFamily: FONT_B }}>Moyenne classe</span>
                  </div>
                </div>
              </div>
            </SimWindow>
            {tip("La progression est alimentée automatiquement à chaque fois que vous utilisez « Exporter vers la synthèse » dans l'onglet Export.", th.warning)}
          </RefSection>

          {/* ── Export ── */}
          <RefSection id="export" icon="📄" titre="Export des données">
            <H>Pour les élèves</H>
            <Li><strong>Rapport HTML individuel</strong> : fichier autonome (.html), aucune dépendance, ouvrable dans tout navigateur. Thème (Cahier clair / Ardoise sombre / Lavande jeune) et blocs configurables dans Réglages → 📤 Export.</Li>
            <Li><strong>ZIP HTML</strong> : tous les rapports de la classe en une seule archive.</Li>
            <Li><strong>Rapport LaTeX individuel</strong> : source .tex compilable avec XeLaTeX. Inclut histogrammes pgfplots par exercice et barème détaillé.</Li>
            <Li><strong>ZIP LaTeX + script</strong> : tous les .tex individuels avec un script de compilation automatique.</Li>

            <H>Pour l'enseignant</H>
            <Li><strong>Document LaTeX complet</strong> : tous les élèves en un seul .tex (idéal pour impression recto-verso).</Li>
            <Li><strong>CSV récapitulatif</strong> : colonnes configurables (rang, note brute, normalisée, compétences, malus…).</Li>
            <Li><strong>Gabarit LaTeX</strong> : préambule personnalisable pour les rapports individuels.</Li>

            <H>Rapport de classe</H>
            <Li>Dans l'accordéon <strong>📊 Rapport de classe</strong> (section « Pour l'enseignant »), saisissez un commentaire de DS et choisissez les blocs à afficher, puis téléchargez le rapport HTML.</Li>
            <Li>Le rapport est conçu pour la <strong>projection en classe</strong> (format paysage A4) : stats globales, distribution, compétences en barres, histogrammes par exercice. Aucun nom d'élève.</Li>
            <SimWindow label="Blocs configurables du rapport de classe">
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { label: "📝 Commentaire de DS", checked: true },
                  { label: "📊 Statistiques globales (KPI)", checked: true },
                  { label: "📈 Distribution des notes", checked: true },
                  { label: "🎯 Performance par compétence", checked: true },
                  { label: "📂 Détail par exercice", checked: true },
                ].map(function(b) {
                  return (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: b.checked ? th.success : "transparent", border: "2px solid " + (b.checked ? th.success : th.border), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{b.checked ? "✓" : ""}</div>
                      <span style={{ fontSize: 11, fontFamily: FONT_B, color: th.textMuted }}>{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </SimWindow>

            <H>Synthèse multi-DS</H>
            <Li><strong>Synthèse multi-DS</strong> : CSV cumulatif de l'année, enrichi DS après DS. Chaque ligne est un élève × DS avec note brute, normalisée, rang et notes de compétences.</Li>
            {tip("Cliquez sur « Exporter vers la synthèse » après chaque DS pour alimenter le CSV annuel et la vue Progression.", th.warning)}

            <H>Sauvegarde et synchronisation</H>
            <Li>Les boutons 💾/📂 dans le header sauvegardent/chargent un fichier JSON complet (toutes les données du profil actif).</Li>
            <Li>La synchronisation ☁️ via GitHub permet de retrouver ses données sur un autre appareil — configurez votre PAT et dépôt privé dans Réglages → 📤 Export → Synchronisation GitHub. Le bouton 🔓 Dissocier efface la configuration sans toucher aux données.</Li>
            {tip("Le fichier JSON est la source de vérité. Sauvegardez-le régulièrement en début ou fin de séance de correction.", th.warning)}
          </RefSection>

          {/* ── Réglages ── */}
          <RefSection id="reglages" icon="⚙️" titre="Réglages">
            <H>🏫 Établissement</H>
            <Li>Nom, classe, matricule (optionnel), promotion, année scolaire. Ces informations apparaissent dans le pied de page des rapports LaTeX et dans l'en-tête des rapports HTML.</Li>

            <H>🎓 Évaluation</H>
            <Li>Seuils de compétence (% de réussite pour A/B/C/D/NN). Seuil de question difficile (% de la classe l'ayant traitée). Seuil de réussite pour le marqueur ✨.</Li>
            <Li>Seuil de <strong>question piège</strong> : taux de réussite en-dessous duquel une question très tentée est considérée comme un piège. Configurable indépendamment.</Li>
            <Li>Configuration du <strong>bonus exercice complet 🏆</strong> : seuil de déclenchement (% du score de l'exercice), mode (points fixes ou pourcentage), valeur du bonus.</Li>
            <SimWindow label="Seuils compétences par défaut">
              <div style={{ fontFamily: MONO, fontSize: 11, color: th.textMuted }}>
                <div>Non noté si traité {"<"} <strong style={{ color: th.text }}>20 %</strong></div>
                <div>D si réussite {"<"} <strong style={{ color: th.text }}>25 %</strong></div>
                <div>C si réussite {"<"} <strong style={{ color: th.text }}>50 %</strong></div>
                <div>B si réussite {"<"} <strong style={{ color: th.text }}>75 %</strong></div>
                <div>A si réussite ≥ <strong style={{ color: th.success }}>75 %</strong></div>
              </div>
            </SimWindow>

            <H>📊 Notes</H>
            <Li>Six méthodes de normalisation : aucune, proportionnelle (moy ou max), affine (moy+σ ou max+σ), gaussienne par quantiles. Des infobulles contextuelles expliquent chaque méthode.</Li>
            <Li>Paliers de malus automatique : au-delà de N remarques « malus », un % est retranché à la note. Le malus s'applique avant ou après la normalisation.</Li>

            <H>✏️ Correction</H>
            <Li>Activez/désactivez les remarques disponibles en correction. Créez des remarques personnalisées (persistantes pour tous les DS). Réordonnez-les avec ▲/▼.</Li>
            <Li>Créez et personnalisez les groupes pédagogiques (couleur, label, participation aux stats).</Li>

            <H>📤 Export</H>
            <Li>Configurez les colonnes du CSV, le thème et les blocs des rapports HTML (note brute, compétences, histogramme, barème…). Enregistrez un preset de configuration.</Li>
            <Li><strong>🔊 Liens audio</strong> : activez pour rendre les labels de questions cliquables dans les exports HTML et LaTeX. Renseignez l'URL de base (ex. <code style={{ fontFamily: MONO, fontSize: 10 }}>https://monserveur.fr/sons/</code>) et l'extension (<code style={{ fontFamily: MONO, fontSize: 10 }}>webm</code> ou <code style={{ fontFamily: MONO, fontSize: 10 }}>mp4</code>). En LaTeX, les liens apparaissent en bleu discret.</Li>
            {tip("Si vous utilisez un gabarit LaTeX personnalisé avec des liens audio, ajoutez \\usepackage[colorlinks=true,urlcolor=blue!60!black]{hyperref} dans votre préambule.", th.accent)}
          </RefSection>

          {/* ── Raccourcis ── */}
          <RefSection id="raccourcis" icon="⌨️" titre="Raccourcis clavier">
            <div style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, marginBottom: 10 }}>Actifs uniquement dans l'onglet Correction, quand aucun champ de saisie n'est focalisé.</div>
            {[
              { keys: ["←", "→"], desc: "Exercice précédent / suivant. Passe automatiquement à l'élève suivant en fin de sujet." },
              { keys: ["1", "–", "9"], desc: "Saut direct à l'exercice numéro N." },
            ].map(function(r, i) {
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i === 0 ? "1px solid " + th.border + "44" : "none" }}>
                  <div style={{ display: "flex", gap: 3, flexShrink: 0, minWidth: 80 }}>
                    {r.keys.map(function(k) { return kbd(k); })}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: FONT_B, color: th.textMuted, lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              );
            })}
          </RefSection>

          {/* ── Profils ── */}
          <RefSection id="profils" icon="👤" titre="Profils multiples">
            <Li>Chaque profil possède sa propre base de données IndexedDB — vos données sont totalement isolées entre profils.</Li>
            <Li>Cas d'usage typique : un profil par classe ou par année scolaire. Votre partenaire peut avoir son propre profil sur le même appareil.</Li>
            <SimWindow label="Sélecteur de profil (header)">
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[{ name: "MP2I 2024-25", active: true }, { name: "MPSI 2024-25", active: false }].map(function(p) {
                  return (
                    <div key={p.name} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                      background: p.active ? th.accentBg : "transparent",
                      borderRadius: th.radiusSm,
                    }}>
                      <span style={{ fontSize: 10, color: p.active ? th.accent : th.textDim, fontFamily: MONO }}>
                        {p.active ? "●" : "○"}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, fontFamily: FONT_B, color: p.active ? th.accent : th.text, fontWeight: p.active ? 700 : 400 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: th.textDim }}>✏️</span>
                    </div>
                  );
                })}
                <div style={{ padding: "7px 10px", display: "flex", gap: 6 }}>
                  <div style={{ flex: 1, fontSize: 11, color: th.textDim, fontFamily: FONT_B }}>Nouveau profil…</div>
                  <SimBtn label="+" small={true} />
                </div>
              </div>
            </SimWindow>
            <Li>La migration est automatique : si vous utilisiez CHECK avant la version multi-profils, vos données existantes ont été migrées dans « Profil 1 ».</Li>
            {tip("Renommez votre profil avec ✏️ pour le retrouver facilement — par exemple « Franco - MP2I 24/25 ».", th.accent)}
          </RefSection>

        </div>
      )}
    </div>
  );
}

export default HelpTab;