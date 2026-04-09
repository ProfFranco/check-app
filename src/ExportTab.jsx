// ═══════════════════════════════════════════════════════════════════
// ExportTab — onglet Export
// ═══════════════════════════════════════════════════════════════════

import { genererGabarit, genererDocumentComplet, genererDocumentsIndividuels, genererScriptCompilation } from "./utils/latex";
import { genererHtmlEleve, genererHtmlTous } from "./utils/html";
import { downloadFile } from "./utils/calculs";

export default function ExportTab({
  th, FONT, FONT_B, MONO,
  exam, et,
  examNomDS, examDateDS,
  presents, corriges,
  students, grades, remarks, absents,
  seuils, seuilDifficile, seuilReussite,
  malusPaliers, malusManuel,
  commentaires, allRemarques,
  htmlConfig, htmlStudentId,
  soundLinksEnabled, soundBaseUrl, soundAudioExt,
  gabaritTex, setGabaritTex,
  etablissement,
  synthese,
  exportOpen, setExportOpen,
  githubPat, githubRepo,
  githubSave, githubLoad,
  syncLoading, syncStatus, syncDate,
  getNote20, getBrut20,
  exportCSV,
  nomFichierSynthese,
  exporterVersSynthese,
  retirerDsSynthese,
  telechargerSynthese,
}) {
  // ── Helpers locaux ──────────────────────────────────────────
  var htmlStudent = corriges.find(function(s) { return s.id === htmlStudentId; }) || corriges[0];
  var htmlRankMap = {};
  if (corriges.length) {
    var htmlRanked = corriges.slice().sort(function(a, b) { return getNote20(b.id) - getNote20(a.id); });
    var htmlRg = 1;
    htmlRanked.forEach(function(r, i) {
      if (i > 0 && getNote20(r.id) < getNote20(htmlRanked[i - 1].id)) htmlRg = i + 1;
      htmlRankMap[r.id] = htmlRg;
    });
  }

  // ── Métadonnées du DS ───────────────────────────────────────
  var dsMeta = (
    <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, marginBottom: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <span>{examNomDS || "\u2014"}</span>
      <span>{"\u00B7"}</span>
      <span>{examDateDS || "\u2014"}</span>
      <span>{"\u00B7"}</span>
      <span>{presents.length + " \u00e9l\u00e8ves"}</span>
      <span>{"\u00B7"}</span>
      <span>{exam.exercises.length + " exercices"}</span>
      <span>{"\u00B7"}</span>
      <span>{et + " pts"}</span>
    </div>
  );

  // ── Accordéon générique ─────────────────────────────────────
  function Section(props) {
    var key = props.skey;
    var isOpen = exportOpen[key] !== false; // ouvert par défaut sauf synthèse
    return (
      <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, marginBottom: 10, boxShadow: th.shadow, overflow: "hidden" }}>
        <div onClick={function() { setExportOpen(function(prev) { var n = Object.assign({}, prev); n[key] = !isOpen; return n; }); }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", cursor: "pointer", userSelect: "none" }}>
          <span style={{ fontSize: 16 }}>{props.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT, flex: 1 }}>{props.title}</span>
          <span style={{ fontSize: 11, color: th.textMuted, display: "inline-block", transition: "transform 0.28s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>{"▼"}</span>
        </div>
        <div style={{
          maxHeight: isOpen ? 1200 : 0,
          overflow: "hidden",
          transition: "max-height 0.38s ease",
        }}>
          <div style={{ borderTop: "1px solid " + th.border, padding: "0 16px 16px" }}>
            {props.children}
          </div>
        </div>
      </div>
    );
  }

  // ── Ligne d'export ──────────────────────────────────────────
  function ExportRow(props) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid " + th.border + "66", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: th.text, fontFamily: FONT_B }}>{props.label}</div>
          {props.sub && <div style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, marginTop: 2 }}>{props.sub}</div>}
        </div>
        <button onClick={props.onClick} disabled={props.disabled}
          style={{ flexShrink: 0, padding: "6px 14px", borderRadius: th.radiusSm, cursor: props.disabled ? "not-allowed" : "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 700, background: props.disabled ? th.surface : props.color || th.accent, border: "none", color: props.disabled ? th.textDim : "#fff", whiteSpace: "nowrap" }}>
          {props.btnLabel}
        </button>
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
              {"Sauvegarde et restauration via un dépôt GitHub privé. Configurez votre PAT et le dépôt dans Réglages > Export."}
            </div>
            {!syncOk && <div style={{ fontSize: 11, color: th.warning, fontFamily: FONT_B, padding: "6px 10px", background: th.warningBg, borderRadius: th.radiusSm, marginBottom: 10, border: "1px solid " + th.warning + "33" }}>
              {"⚠ Configurez d'abord votre PAT GitHub et le nom de votre dépôt dans Réglages > Export > Synchronisation GitHub."}
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
          </Section>
        );
      })()}

      {/* ── 📄 Pour les élèves ── */}
      <Section skey="eleves" icon="📄" title="Pour les élèves">
        <div style={{ padding: "8px 0 0" }}>{dsMeta}</div>
        <ExportRow
          label={"Rapport HTML — " + (htmlStudent ? htmlStudent.prenom + " " + htmlStudent.nom : "—")}
          sub={"Élève affiché dans l'onglet Résultats"}
          btnLabel={"Télécharger .html"}
          color={th.accent}
          disabled={!htmlStudent}
          onClick={function() {
            if (!htmlStudent) return;
            var content = genererHtmlEleve({
              student: htmlStudent, exam: exam, grades: grades, remarks: remarks, absents: absents,
              allStudents: students, nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
              seuilDifficile: seuilDifficile, seuilReussite: seuilReussite,
              getNote20: getNote20, getBrut20: getBrut20, rankMap: htmlRankMap,
              malusPaliers: malusPaliers, malusManuel: malusManuel,
              commentaires: commentaires, allRemarques: allRemarques, htmlConfig: htmlConfig,
              soundLinksEnabled: soundLinksEnabled, soundBaseUrl: soundBaseUrl, soundAudioExt: soundAudioExt,
            });
            var slug = (htmlStudent.nom + "_" + htmlStudent.prenom).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_");
            downloadFile(content, "CR_" + (examNomDS || "DS").replace(/\s+/g, "_") + "_" + slug + ".html", "text/html;charset=utf-8;");
          }}
        />
        <ExportRow
          label={"Tous les rapports HTML"}
          sub={corriges.length + " fichiers compressés"}
          btnLabel={"Télécharger .zip"}
          color={th.success}
          disabled={!corriges.length}
          onClick={function() {
            if (!corriges.length) return;
            var docs = genererHtmlTous({
              exam: exam, students: students, grades: grades, remarks: remarks, absents: absents,
              nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
              seuilDifficile: seuilDifficile, seuilReussite: seuilReussite,
              getNote20: getNote20, getBrut20: getBrut20,
              malusPaliers: malusPaliers, malusManuel: malusManuel,
              commentaires: commentaires, allRemarques: allRemarques, htmlConfig: htmlConfig,
              soundLinksEnabled: soundLinksEnabled, soundBaseUrl: soundBaseUrl, soundAudioExt: soundAudioExt,
            });
            var el = document.createElement("script");
            el.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            el.onload = function() {
              var zip = new window.JSZip();
              docs.forEach(function(f) { zip.file(f.filename, f.content); });
              zip.generateAsync({ type: "blob" }).then(function(blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a"); a.href = url;
                a.download = "CR_" + (examNomDS || "DS").replace(/\s+/g, "_") + "_html.zip";
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
              });
            };
            el.onerror = function() { alert("Impossible de charger JSZip. Vérifiez votre connexion."); };
            document.head.appendChild(el);
          }}
        />
        <ExportRow
          label={"Rapport LaTeX — " + (htmlStudent ? htmlStudent.prenom + " " + htmlStudent.nom : "—")}
          sub={"Élève affiché dans l'onglet Résultats"}
          btnLabel={"Télécharger .tex"}
          color={th.accent}
          disabled={!htmlStudent}
          onClick={function() {
            if (!htmlStudent) return;
            var currentGab = gabaritTex || genererGabarit(examNomDS, examDateDS, etablissement);
            var docs = genererDocumentsIndividuels({
              gabarit: currentGab, exam: exam, students: students, grades: grades, remarks: remarks, absents: absents,
              nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
              seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, getNote20: getNote20,
              malusPaliers: malusPaliers, malusManuel: malusManuel,
              commentaires: commentaires, allRemarques: allRemarques,
              soundLinksEnabled: soundLinksEnabled, soundBaseUrl: soundBaseUrl, soundAudioExt: soundAudioExt,
            });
            var doc = docs.find(function(d) { return d.filename.indexOf(
              (htmlStudent.nom + "_" + htmlStudent.prenom).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)
            ) !== -1; }) || docs[0];
            if (doc) downloadFile(doc.content, doc.filename, "text/x-tex");
          }}
        />
        <div style={{ borderBottom: "none" }}>
          <ExportRow
            label={"Tous les rapports LaTeX individuels"}
            sub={corriges.length + " fichiers .tex + script de compilation"}
            btnLabel={"Télécharger .zip"}
            color={th.success}
            disabled={!corriges.length}
            onClick={function() {
              if (!corriges.length) return;
              var currentGab = gabaritTex || genererGabarit(examNomDS, examDateDS, etablissement);
              var docs = genererDocumentsIndividuels({
                gabarit: currentGab, exam: exam, students: students, grades: grades, remarks: remarks, absents: absents,
                nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
                seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, getNote20: getNote20,
                malusPaliers: malusPaliers, malusManuel: malusManuel,
                commentaires: commentaires, allRemarques: allRemarques,
                soundLinksEnabled: soundLinksEnabled, soundBaseUrl: soundBaseUrl, soundAudioExt: soundAudioExt,
              });
              var script = genererScriptCompilation(examNomDS);
              var el = document.createElement("script");
              el.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
              el.onload = function() {
                var zip = new window.JSZip();
                docs.forEach(function(f) { zip.file(f.filename, f.content); });
                var scriptName = "compiler_" + (examNomDS || "DS").replace(/\s+/g, "_") + ".sh";
                zip.file(scriptName, script);
                zip.generateAsync({ type: "blob" }).then(function(blob) {
                  var url = URL.createObjectURL(blob);
                  var a = document.createElement("a"); a.href = url;
                  a.download = "CR_" + (examNomDS || "DS") + "_individuels.zip";
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a); URL.revokeObjectURL(url);
                });
              };
              el.onerror = function() { alert("Impossible de charger JSZip. Vérifiez votre connexion."); };
              document.head.appendChild(el);
            }}
          />
        </div>
      </Section>

      {/* ── 🗂️ Pour l'enseignant ── */}
      <Section skey="enseignant" icon="🗂️" title="Pour l'enseignant">
        <div style={{ padding: "8px 0 0" }}>{dsMeta}</div>
        <ExportRow
          label={"Document LaTeX complet"}
          sub={"Tous les élèves en un seul fichier"}
          btnLabel={"Télécharger .tex"}
          color={th.accent}
          disabled={!corriges.length}
          onClick={function() {
            var currentGab = gabaritTex || genererGabarit(examNomDS, examDateDS, etablissement);
            var tex = genererDocumentComplet({
              gabarit: currentGab, exam: exam, students: students, grades: grades, remarks: remarks, absents: absents,
              nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
              seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, getNote20: getNote20,
              malusPaliers: malusPaliers, malusManuel: malusManuel,
              commentaires: commentaires, allRemarques: allRemarques,
              soundLinksEnabled: soundLinksEnabled, soundBaseUrl: soundBaseUrl, soundAudioExt: soundAudioExt,
            });
            downloadFile(tex, "CR_" + (examNomDS || "DS") + ".tex", "text/x-tex");
          }}
        />
        <ExportRow
          label={"Notes et compétences"}
          sub={"Récapitulatif CSV · colonnes configurables dans Réglages → 📤 Export"}
          btnLabel={"Télécharger .csv"}
          color={th.violet}
          disabled={!corriges.length}
          onClick={exportCSV}
        />

        {/* Sous-accordéon gabarit */}
        {(function() {
          var gabOpen = exportOpen["gabarit"] === true;
          return (
            <div style={{ marginTop: 10, border: "1px solid " + th.border, borderRadius: th.radiusSm, overflow: "hidden" }}>
              <div onClick={function() { setExportOpen(function(prev) { var n = Object.assign({}, prev); n["gabarit"] = !gabOpen; return n; }); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", background: th.surface, userSelect: "none" }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT_B, flex: 1, color: th.text }}>{"Gabarit LaTeX"}</span>
                <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>{"Préambule et mise en forme"}</span>
                <span style={{ fontSize: 10, color: th.textMuted, display: "inline-block", transition: "transform 0.25s ease", transform: gabOpen ? "rotate(180deg)" : "rotate(0deg)", marginLeft: 6 }}>{"▼"}</span>
              </div>
              <div style={{ maxHeight: gabOpen ? 600 : 0, overflow: "hidden", transition: "max-height 0.32s ease" }}>
                <div style={{ borderTop: "1px solid " + th.border, padding: "10px 12px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <button onClick={function() { setGabaritTex(genererGabarit(examNomDS, examDateDS, etablissement)); }}
                      style={{ fontSize: 10, color: th.textMuted, background: "none", border: "1px solid " + th.border, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: FONT_B }}>
                      {"Réinitialiser"}
                    </button>
                  </div>
                  <textarea
                    value={gabaritTex || genererGabarit(examNomDS, examDateDS, etablissement)}
                    onChange={function(e) { setGabaritTex(e.target.value); }}
                    style={{ width: "100%", minHeight: 200, background: th.surface, border: "1px solid " + th.border, borderRadius: th.radiusSm, padding: 10, fontSize: 10, fontFamily: MONO, color: th.text, resize: "vertical", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }}
                  />
                  <div style={{ fontSize: 9, color: th.textDim, fontFamily: FONT_B, marginTop: 4 }}>
                    {"Préambule du document LaTeX. Ajoutez des packages, modifiez les en-têtes, etc."}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Section>

      {/* ── 📊 Synthèse multi-DS ── */}
      {(function() {
        var dsDansSynthese = (function() {
          var seen = {}; var result = [];
          synthese.forEach(function(row) {
            if (!seen[row.examId]) {
              seen[row.examId] = true;
              result.push({ examId: row.examId, dsNom: row.dsNom, dsDate: row.dsDate, nb: synthese.filter(function(r) { return r.examId === row.examId; }).length });
            }
          });
          return result;
        })();
        var totalLignes = synthese.length;
        var dsActifDejaDedans = exam && dsDansSynthese.some(function(d) { return d.examId === exam.id; });
        return (
          <Section skey="synthese" icon="📊" title={"Synthèse multi-DS" + (totalLignes > 0 ? " · " + dsDansSynthese.length + " DS" : "")}>
            <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, padding: "10px 0 6px" }}>
              {"CSV cumulatif · colonnes fixes : DS · Date · Nom · Prénom · Groupe · Note brute · Note normalisée · Rang · A · N · R · V"}
            </div>

            {dsDansSynthese.length > 0 && (
              <div style={{ marginBottom: 10, padding: "8px 10px", background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border }}>
                {dsDansSynthese.map(function(d) { return (
                  <div key={d.examId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid " + th.border + "44" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT_B, color: th.text, flex: 1 }}>{d.dsNom || "—"}</span>
                    {d.dsDate && <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>{d.dsDate}</span>}
                    <span style={{ fontSize: 10, fontFamily: MONO, color: th.textDim }}>{d.nb + " él."}</span>
                    <button onClick={function() { retirerDsSynthese(d.examId); }}
                      style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 11, padding: "0 2px" }}
                      title={"Retirer " + (d.dsNom || "ce DS") + " de la synthèse"}>{"✕"}</button>
                  </div>
                ); })}
              </div>
            )}

            {totalLignes === 0 && (
              <div style={{ textAlign: "center", padding: "12px 0", color: th.textDim, fontSize: 12, fontFamily: FONT_B, fontStyle: "italic" }}>
                {"Aucun DS dans la synthèse. Commencez par ajouter le DS actuel."}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exporterVersSynthese} disabled={!corriges.length}
                style={{ flex: 1, padding: "11px", borderRadius: th.radiusSm, cursor: corriges.length ? "pointer" : "not-allowed", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: dsActifDejaDedans ? th.warningBg : th.accentBg, border: "1px solid " + (dsActifDejaDedans ? th.warning + "55" : th.accent + "55"), color: dsActifDejaDedans ? th.warning : th.accent }}>
                {dsActifDejaDedans ? "🔄 Remplacer le DS actuel" : "💾 Ajouter le DS actuel"}
              </button>
              <button onClick={telechargerSynthese} disabled={!totalLignes}
                style={{ flex: 1, padding: "11px", borderRadius: th.radiusSm, cursor: totalLignes ? "pointer" : "not-allowed", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: totalLignes ? th.success : th.surface, border: "1px solid " + (totalLignes ? th.success + "55" : th.border), color: totalLignes ? "#fff" : th.textDim }}>
                {"📥 Télécharger " + nomFichierSynthese()}
              </button>
            </div>
          </Section>
        );
      })()}



    </div>
  );
}
