// ═══════════════════════════════════════════════════════════════════
// C.H.E.C.K. — Application principale
// ═══════════════════════════════════════════════════════════════════
// Ce fichier contient l'application complète.
// La configuration est dans src/config/settings.js
// Les fonctions de calcul dans src/utils/calculs.js
// Le générateur LaTeX dans src/utils/latex.js
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Imports depuis les modules du projet ────────────────────────
import {
  COMPETENCES, REMARQUES, TYPES_GROUPES, TT_GROUPE,
  DEFAULT_SEUILS, DEFAULT_SEUIL_DIFFICILE,
  DEFAULT_MALUS_PALIERS, DEFAULT_MALUS_MODE,
  DEFAULT_NORM, TT_COEFF, DEFAULT_REMARQUES_ACTIVES, ETABLISSEMENT,
} from "./config/settings";
import { lightTheme, darkTheme, youngTheme, FONT_TITLE, FONT_BODY, FONT_MONO, FONTS_URL } from "./config/theme";
import {
  uid, gradeKey, remarkKey, clamp, compColor,
  questionScore, exerciseScore, studentTotal, examTotal, noteSur20,
  studentTotalWeighted, examTotalWeighted,
  ratioJustesse, ratioEfficacite,
  notesParCompetence, competencePct,
  exercisePctAbsolute, exercisePctRelative,
  countMalusRemarks, malusAuto, malusTotal,
  normaliser, importCSV, downloadFile, treatedKey,
} from "./utils/calculs";
import { genererGabarit, genererDocumentComplet, genererDocumentsIndividuels, genererScriptCompilation } from "./utils/latex";
import { genererHtmlEleve, genererHtmlTous, DEFAULT_HTML_CONFIG } from "./utils/html";
// ─── Logos (dans public/logos/) ──────────────────────────────────
const LOGO_LIGHT = "/logos/logo-light.png";
const LOGO_DARK = "/logos/logo-dark.png";
const SPLASH_IMG = "/logos/splash.png";

// ─── Raccourcis ──────────────────────────────────────────────────
const gk = gradeKey;
const rkk = remarkKey;
const cc = compColor;
const FONT = FONT_TITLE;
const FONT_B = FONT_BODY;
const MONO = FONT_MONO;

const RADAR_MODES = [
  { id: "comp", label: "Comp\u00E9tences" },
  { id: "exAbs", label: "Exercices" },
  { id: "exRel", label: "vs. Classe" },
];

function RadarChart({ compValues, exAbsValues, exRelValues, size = 90, dark = false, interactive = true, initialMode = "comp" }) {
  const [mode, setMode] = useState(initialMode);
  const th = dark ? darkTheme : lightTheme;

  const data = mode === "comp"
    ? COMPETENCES.map(c => ({ label: c.short, value: compValues[c.id] || 0, color: cc(c, dark) }))
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

function MiniRadar({ compValues, size = 36, dark = false }) {
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

function MiniRadarEx({ values, size = 36, dark = false }) {
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
function Histo({ bins, colorFn, label, th, moyLine, medLine }) {
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
function PBar({ value, max, color, h = 6, th }) {
  return <div style={{ background: th.border, borderRadius: h / 2, height: h, overflow: "hidden", width: "100%" }}><div style={{ height: "100%", borderRadius: h / 2, width: `${max > 0 ? clamp((value / max) * 100, 0, 100) : 0}%`, background: color, transition: "width 0.3s" }} /></div>;
}

// ═══════════════════════════════════════════════════════════════════
// IndexedDB persistence
// ═══════════════════════════════════════════════════════════════════
// ─── IndexedDB — constantes ──────────────────────────────────────
const DB_VER = 1;
const STORE = "state";
const SKEY = "appState";

// Meta-base : stocke la liste des profils et l'id actif
const META_DB_NAME = "check-app-profiles";
const META_STORE = "profiles";
const META_KEY = "profilesMeta";

// ─── Ouvre une base par son nom ──────────────────────────────────
function openNamedDB(name) {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(name, DB_VER);
    req.onerror = function() { reject(req.error); };
    req.onsuccess = function() { resolve(req.result); };
    req.onupgradeneeded = function(e) {
      if (!e.target.result.objectStoreNames.contains(STORE))
        e.target.result.createObjectStore(STORE);
    };
  });
}

// ─── Meta-base : lire / écrire les profils ───────────────────────
function openMetaDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(META_DB_NAME, 1);
    req.onerror = function() { reject(req.error); };
    req.onsuccess = function() { resolve(req.result); };
    req.onupgradeneeded = function(e) {
      if (!e.target.result.objectStoreNames.contains(META_STORE))
        e.target.result.createObjectStore(META_STORE);
    };
  });
}
function loadMeta() {
  return openMetaDB().then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(META_STORE, "readonly");
      var req = tx.objectStore(META_STORE).get(META_KEY);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}
function saveMeta(meta) {
  return openMetaDB().then(function(db) {
    var tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(meta, META_KEY);
  }).catch(function() {});
}

// ─── Lit le contenu brut de l'ancienne base "check-app" ─────────
// Utilisé une seule fois pour la migration au premier lancement.
function readLegacyDB() {
  return new Promise(function(resolve) {
    var req = indexedDB.open("check-app", 1);
    req.onerror = function() { resolve(null); };
    req.onsuccess = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE)) { resolve(null); return; }
      var tx = db.transaction(STORE, "readonly");
      var r2 = tx.objectStore(STORE).get(SKEY);
      r2.onsuccess = function() { resolve(r2.result || null); };
      r2.onerror = function() { resolve(null); };
    };
    req.onupgradeneeded = function() { resolve(null); };
  }).catch(function() { return null; });
}

// ─── Nom de la base d'un profil ──────────────────────────────────
function profileDBName(profileId) {
  return "check-app-" + profileId;
}

// ─── Initialise les profils au premier lancement (migration) ─────
// Retourne { profiles, activeId } prêt à l'emploi.
function initProfiles() {
  return readLegacyDB().then(function(legacy) {
    var newId = Math.random().toString(36).slice(2, 10);
    var profile = { id: newId, name: "Profil 1", createdAt: Date.now() };
    var meta = { profiles: [profile], activeId: newId };
    // Copie les données legacy dans la nouvelle base du profil
    var savePromise = legacy
      ? openNamedDB(profileDBName(newId)).then(function(db) {
          var tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(legacy, SKEY);
        }).catch(function() {})
      : Promise.resolve();
    return savePromise.then(function() {
      return saveMeta(meta).then(function() { return meta; });
    });
  });
}

// ─── Charge l'état d'un profil ───────────────────────────────────
function loadDB(profileId) {
  return openNamedDB(profileDBName(profileId)).then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).get(SKEY);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}

// ─── Sauvegarde l'état d'un profil ───────────────────────────────
function saveDB(state, profileId) {
  if (!profileId) return Promise.resolve();
  return openNamedDB(profileDBName(profileId)).then(function(db) {
    var tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, SKEY);
  }).catch(function() {});
}

// ─── AudioRecorder ────────────────────────────────────────────────
// Enregistrement audio autonome par question/élève.
// Aucune persistance : le fichier vit en mémoire jusqu'au téléchargement.
// Nommage : {nomDS}_{NOM}_{ExTitle}_{QLabel}.{ext}

// ─── AudioRecorder ────────────────────────────────────────────────
function AudioRecorder({ nomDS, studentNom, exTitle, qLabel, th, FONT_B, MONO }) {
  var _open = useState(false); var open = _open[0]; var setOpen = _open[1];
  var _recording = useState(false); var recording = _recording[0]; var setRecording = _recording[1];
  var _audioUrl = useState(null); var audioUrl = _audioUrl[0]; var setAudioUrl = _audioUrl[1];
  var _audioExt = useState("webm"); var audioExt = _audioExt[0]; var setAudioExt = _audioExt[1];
  var mrRef = useRef(null);
  var chunksRef = useRef([]);
  var streamRef = useRef(null);

  function slug(s) {
    if (!s) return "x";
    return s.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 20);
  }

  function buildFilename(ext) {
    return slug(nomDS || "DS") + "_" +
           slug(studentNom || "eleve").toUpperCase() + "_" +
           slug(exTitle || "Ex") + "_" +
           slug(qLabel || "Q") + "." + ext;
  }

  function startRec() {
    chunksRef.current = [];
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      streamRef.current = stream;
      var mimeType = "audio/webm";
      var ext = "webm";
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
        ext = "mp4";
      }
      setAudioExt(ext);
      var opts = mimeType ? { mimeType: mimeType } : {};
      var mr = new MediaRecorder(stream, opts);
      mrRef.current = mr;
      mr.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = function() {
        var blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/mp4" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(function(t) { t.stop(); });
      };
      mr.start();
      setRecording(true);
    }).catch(function(err) {
      alert("Accès au microphone refusé ou indisponible.\n" + err.message);
    });
  }

  function stopRec() {
    if (mrRef.current && recording) { mrRef.current.stop(); setRecording(false); }
  }

  function handleDownload() {
    var fname = buildFilename(audioExt);
    var a = document.createElement("a");
    a.href = audioUrl;
    a.download = fname;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleClose() {
    stopRec();
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    setOpen(false);
  }

  var btnS = function(bg, col) { return {
    padding: "4px 10px", borderRadius: 4, border: "none",
    cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700,
    background: bg, color: col,
  }; };

  return (
    <span style={{ display: "inline" }}>
      <button
        style={{ background: open ? th.accentBg : "none", border: "1px solid " + (open ? th.accent + "55" : th.border), borderRadius: 4, padding: "1px 5px", cursor: "pointer", fontSize: 12, color: open ? th.accent : th.textDim, fontFamily: FONT_B, lineHeight: 1, marginLeft: 4 }}
        title="Commentaire audio"
        onClick={function() { setOpen(function(o) { return !o; }); }}
      >🎙️</button>
      {open && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, margin: "5px 0 3px 0", padding: "7px 10px", background: th.surface, border: "1px solid " + th.border, borderRadius: 6 }}>
          {recording && <span style={{ color: th.danger, fontWeight: 700, fontSize: 11, fontFamily: MONO, animation: "pulse 1s ease-in-out infinite" }}>⏺ REC</span>}
          {!recording
            ? <button style={btnS(th.danger, "#fff")} onClick={startRec}>⏺ Enregistrer</button>
            : <button style={btnS(th.warning, "#fff")} onClick={stopRec}>⏹ Arrêter</button>
          }
          {audioUrl && <audio src={audioUrl} controls style={{ height: 28, maxWidth: 200 }} />}
          {audioUrl && (
            <button style={btnS(th.accent, "#fff")} onClick={handleDownload} title={buildFilename(audioExt)}>
              {"⬇ " + buildFilename(audioExt)}
            </button>
          )}
          <button style={Object.assign({}, btnS(th.surface, th.textMuted), { border: "1px solid " + th.border, marginLeft: "auto" })} onClick={handleClose}>✕</button>
        </div>
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DEBUG MODAL
// ═══════════════════════════════════════════════════════════════════
function DebugModal({ sections, fullState, th, FONT, FONT_B, MONO, onClose }) {
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

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  // ─── State ───
  var _appTheme = useState("light"); var setAppTheme = _appTheme[1]; var appTheme = _appTheme[0];
  var dark = appTheme === "dark";
  var _splash = useState(true); var setSplash = _splash[1]; var showSplash = _splash[0];
  var th = appTheme === "dark" ? darkTheme : appTheme === "young" ? youngTheme : lightTheme;
  var FONT_B = appTheme === "young" ? "'Nunito', 'Segoe UI', system-ui, sans-serif" : FONT_BODY;
  var _groupesDef = useState([]); var setGroupesDef = _groupesDef[1]; var groupesDef = _groupesDef[0];

  var _exams = useState([]); var setExams = _exams[1]; var exams = _exams[0];
  var _students = useState([]); var setStudents = _students[1]; var students = _students[0];
  var _grades = useState({}); var setGrades = _grades[1]; var grades = _grades[0];
  var _remarks = useState({}); var setRemarks = _remarks[1]; var remarks = _remarks[0];
  var _absents = useState({}); var setAbsents = _absents[1]; var absents = _absents[0];
  var _groupes = useState({}); var setGroupes = _groupes[1]; var groupes = _groupes[0];
  var _activeExamId = useState(null); var setActiveExamId = _activeExamId[1]; var activeExamId = _activeExamId[0];
  var _nomDS = useState(""); var setNomDS = _nomDS[1]; var nomDS = _nomDS[0];
  var _dateDS = useState(""); var setDateDS = _dateDS[1]; var dateDS = _dateDS[0];
  var _mode = useState("prep"); var setMode = _mode[1]; var mode = _mode[0];
  var _seuils = useState(DEFAULT_SEUILS); var setSeuils = _seuils[1]; var seuils = _seuils[0];
  var _normMethod = useState(DEFAULT_NORM.method); var setNormMethod = _normMethod[1]; var normMethod = _normMethod[0];
  var _normParams = useState(DEFAULT_NORM.params); var setNormParams = _normParams[1]; var normParams = _normParams[0];
  var _seuilDifficile = useState(DEFAULT_SEUIL_DIFFICILE); var setSeuilDifficile = _seuilDifficile[1]; var seuilDifficile = _seuilDifficile[0];
  var _seuilReussite = useState(50); var setSeuilReussite = _seuilReussite[1]; var seuilReussite = _seuilReussite[0];
  var _gabaritTex = useState(""); var setGabaritTex = _gabaritTex[1]; var gabaritTex = _gabaritTex[0];
  var _malusPaliers = useState(DEFAULT_MALUS_PALIERS); var setMalusPaliers = _malusPaliers[1]; var malusPaliers = _malusPaliers[0];
  var _malusMode = useState(DEFAULT_MALUS_MODE); var setMalusMode = _malusMode[1]; var malusMode = _malusMode[0];
  var _malusManuel = useState({}); var setMalusManuel = _malusManuel[1]; var malusManuel = _malusManuel[0];
  var _commentaires = useState({}); var setCommentaires = _commentaires[1]; var commentaires = _commentaires[0];
  var _remarquesActives = useState(DEFAULT_REMARQUES_ACTIVES); var setRemarquesActives = _remarquesActives[1]; var remarquesActives = _remarquesActives[0];
  var _remarquesCustom = useState([]); var setRemarquesCustom = _remarquesCustom[1]; var remarquesCustom = _remarquesCustom[0];
  var _remarquesOrdre = useState([]); var setRemarquesOrdre = _remarquesOrdre[1]; var remarquesOrdre = _remarquesOrdre[0];
  var _newRemLabel = useState(""); var setNewRemLabel = _newRemLabel[1]; var newRemLabel = _newRemLabel[0];
  var _newRemIcon = useState("\uD83D\uDCCC"); var setNewRemIcon = _newRemIcon[1]; var newRemIcon = _newRemIcon[0];
  var _newRemMalus = useState(true); var setNewRemMalus = _newRemMalus[1]; var newRemMalus = _newRemMalus[0];
  var _showSettings = useState(false); var setShowSettings = _showSettings[1]; var showSettings = _showSettings[0];
  var _settingsTab = useState("calcul"); var setSettingsTab = _settingsTab[1]; var settingsTab = _settingsTab[0];
  var _showDebug = useState(false); var setShowDebug = _showDebug[1]; var showDebug = _showDebug[0];
  var _csvConfig = useState({ sep: ";", dec: ",", cols: { rang: true, nom: true, prenom: true, absent: true, note: true, noteNorm: true, groupe: false, competences: false, malus: false } }); var setCsvConfig = _csvConfig[1]; var csvConfig = _csvConfig[0];
  var _htmlPresets = useState([]); var setHtmlPresets = _htmlPresets[1]; var htmlPresets = _htmlPresets[0];
  var _htmlConfig = useState({ theme: "light", noteNorm: true, noteBrute: false, rang: true, statsEleve: { justesse: true, efficacite: true, malus: true }, statsClasse: { moy: true, minMax: true, sigma: false }, competences: "grid", commentaire: true, detailExercices: true, bareme: false, histogramme: true }); var setHtmlConfig = _htmlConfig[1]; var htmlConfig = _htmlConfig[0];  var _htmlStudentId = useState(null); var setHtmlStudentId = _htmlStudentId[1]; var htmlStudentId = _htmlStudentId[0];

  var _si = useState(0); var setSi = _si[1]; var si = _si[0];
  var _ei = useState(0); var setEi = _ei[1]; var ei = _ei[0];
  var _uiScale = useState(1); var setUiScale = _uiScale[1]; var uiScale = _uiScale[0];
  var _showSearch = useState(false); var setShowSearch = _showSearch[1]; var showSearch = _showSearch[0];
  var _searchTerm = useState(""); var setSearchTerm = _searchTerm[1]; var searchTerm = _searchTerm[0];
  var _showMore = useState(false); var setShowMore = _showMore[1]; var showMore = _showMore[0];
  var _tab = useState("general"); var setTab = _tab[1]; var tab = _tab[0];
  var _statGroup = useState("all"); var setStatGroup = _statGroup[1]; var statGroup = _statGroup[0];
  var _dbLoaded = useState(false); var setDbLoaded = _dbLoaded[1]; var dbLoaded = _dbLoaded[0];
  // Prep state
  var _collapsed = useState({}); var setCollapsed = _collapsed[1]; var collapsed = _collapsed[0];
  var _collapsedExams = useState({}); var setCollapsedExams = _collapsedExams[1]; var collapsedExams = _collapsedExams[0];
  var _showGroupes = useState(false); var setShowGroupes = _showGroupes[1]; var showGroupes = _showGroupes[0];
  var _csortMode = useState("rang"); var csortMode = _csortMode[0]; var setCsortMode = _csortMode[1];
  var _confirmDelete = useState(null); var setConfirmDelete = _confirmDelete[1]; var confirmDelete = _confirmDelete[0];
  var _exportOpen = useState({ eleves: true, enseignant: true, gabarit: false, synthese: false, github: false, sync: true }); var setExportOpen = _exportOpen[1]; var exportOpen = _exportOpen[0];
  var _showApropos = useState(false); var setShowApropos = _showApropos[1]; var showApropos = _showApropos[0];
  var _showChangelog = useState(false); var setShowChangelog = _showChangelog[1]; var showChangelog = _showChangelog[0];
  var _changelogText = useState(""); var setChangelogText = _changelogText[1]; var changelogText = _changelogText[0];
  var _githubPat = useState(""); var setGithubPat = _githubPat[1]; var githubPat = _githubPat[0];
  var _githubRepo = useState(""); var setGithubRepo = _githubRepo[1]; var githubRepo = _githubRepo[0];
  var _syncStatus = useState(""); var setSyncStatus = _syncStatus[1]; var syncStatus = _syncStatus[0];
  var _syncDate = useState(""); var setSyncDate = _syncDate[1]; var syncDate = _syncDate[0];
  var _syncLoading = useState(false); var setSyncLoading = _syncLoading[1]; var syncLoading = _syncLoading[0];
  var _profiles = useState([]); var setProfiles = _profiles[1]; var profiles = _profiles[0];
  var _activeProfileId = useState(null); var setActiveProfileId = _activeProfileId[1]; var activeProfileId = _activeProfileId[0];
  var _showProfileMenu = useState(false); var setShowProfileMenu = _showProfileMenu[1]; var showProfileMenu = _showProfileMenu[0];
  var _editingProfileId = useState(null); var setEditingProfileId = _editingProfileId[1]; var editingProfileId = _editingProfileId[0];
  var _editingProfileName = useState(""); var setEditingProfileName = _editingProfileName[1]; var editingProfileName = _editingProfileName[0];
  var _newProfileName = useState(""); var setNewProfileName = _newProfileName[1]; var newProfileName = _newProfileName[0];
  var _synthese = useState([]); var setSynthese = _synthese[1]; var synthese = _synthese[0];
  var _etablissement = useState({
    nom: ETABLISSEMENT.nom,
    classe: ETABLISSEMENT.classe,
    matricule: ETABLISSEMENT.matricule,
    promotion: ETABLISSEMENT.promotion,
    anneeScolaire: ETABLISSEMENT.anneeScolaire,
  }); var setEtablissement = _etablissement[1]; var etablissement = _etablissement[0];
  var searchInputRef = useRef();
  var fileRef = useRef();
  var csvRef = useRef();
  var touchRef = useRef({ x: 0, y: 0 });


  // ─── Persistence: load from IndexedDB on mount ───
  useEffect(function() {
    loadMeta().then(function(meta) {
      // Premier lancement : migration depuis l'ancienne base
      if (!meta) return initProfiles();
      return meta;
    }).then(function(meta) {
      setProfiles(meta.profiles);
      setActiveProfileId(meta.activeId);
      return loadDB(meta.activeId);
    }).then(function(saved) {
      if (saved) {
        if (saved.exams) setExams(saved.exams);
        if (saved.students) setStudents(saved.students);
        if (saved.grades) setGrades(saved.grades);
        if (saved.remarks) setRemarks(saved.remarks);
        if (saved.absents) setAbsents(saved.absents);
        if (saved.groupes) setGroupes(saved.groupes);
        if (saved.activeExamId) setActiveExamId(saved.activeExamId);
        if (saved.nomDS) setNomDS(saved.nomDS);
        if (saved.dateDS) setDateDS(saved.dateDS);
        if (saved.seuils) setSeuils(saved.seuils);
        if (saved.normMethod) setNormMethod(saved.normMethod);
        if (saved.normParams) setNormParams(saved.normParams);
        if (saved.seuilDifficile) setSeuilDifficile(saved.seuilDifficile);
        if (saved.seuilReussite !== undefined) setSeuilReussite(saved.seuilReussite);
        if (saved.gabaritTex) setGabaritTex(saved.gabaritTex);
        if (saved.malusPaliers) setMalusPaliers(saved.malusPaliers);
        if (saved.malusMode) setMalusMode(saved.malusMode);
        if (saved.malusManuel) setMalusManuel(saved.malusManuel);
        if (saved.uiScale) setUiScale(saved.uiScale);
        if (saved.appTheme !== undefined) setAppTheme(saved.appTheme);
        else if (saved.dark !== undefined) setAppTheme(saved.dark ? "dark" : "light"); // migration
        if (saved.groupesDef) setGroupesDef(saved.groupesDef);
        if (saved.mode) setMode(saved.mode);
        if (saved.commentaires) setCommentaires(saved.commentaires);
        if (saved.remarquesActives) setRemarquesActives(saved.remarquesActives);
        if (saved.remarquesCustom) setRemarquesCustom(saved.remarquesCustom);
        if (saved.remarquesOrdre) setRemarquesOrdre(saved.remarquesOrdre);
        if (saved.settingsTab) setSettingsTab(saved.settingsTab);
        if (saved.csvConfig) setCsvConfig(saved.csvConfig);
        if (saved.htmlPresets) setHtmlPresets(saved.htmlPresets);
        if (saved.htmlConfig) { var sc2 = saved.htmlConfig; setHtmlConfig(Object.assign({}, DEFAULT_HTML_CONFIG, sc2, { statsEleve: Object.assign({}, DEFAULT_HTML_CONFIG.statsEleve, sc2.statsEleve), statsClasse: Object.assign({}, DEFAULT_HTML_CONFIG.statsClasse, sc2.statsClasse) })); }
        if (saved.htmlStudentId !== undefined) setHtmlStudentId(saved.htmlStudentId);
        if (saved.synthese) setSynthese(saved.synthese);
        if (saved.etablissement) setEtablissement(Object.assign({}, {
          nom: ETABLISSEMENT.nom, classe: ETABLISSEMENT.classe,
          matricule: ETABLISSEMENT.matricule, promotion: ETABLISSEMENT.promotion,
          anneeScolaire: ETABLISSEMENT.anneeScolaire,
        }, saved.etablissement));
      }
      setDbLoaded(true);
      // Charger la config GitHub depuis localStorage (stockée séparément des données métier)
      var savedPat = localStorage.getItem("check_github_pat") || "";
      var savedRepo = localStorage.getItem("check_github_repo") || "";
      if (savedPat) setGithubPat(savedPat);
      if (savedRepo) setGithubRepo(savedRepo);
    });
  }, []);

  // ─── Persistence: save to IndexedDB on changes (debounced) ───
  useEffect(function() {
    if (!dbLoaded) return;
    var timer = setTimeout(function() {
      saveDB({ exams: exams, students: students, grades: grades, remarks: remarks, absents: absents, groupes: groupes, activeExamId: activeExamId, nomDS: nomDS, dateDS: dateDS, seuils: seuils, normMethod: normMethod, normParams: normParams, seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode, malusManuel: malusManuel, uiScale: uiScale, appTheme: appTheme, groupesDef: groupesDef, mode: mode, commentaires: commentaires, remarquesActives: remarquesActives, remarquesCustom: remarquesCustom, remarquesOrdre: remarquesOrdre, settingsTab: settingsTab, csvConfig: csvConfig, htmlPresets: htmlPresets, htmlConfig: htmlConfig, htmlStudentId: htmlStudentId,
        synthese: synthese, etablissement: etablissement }, activeProfileId);
    }, 500);
    return function() { clearTimeout(timer); };
  }, [dbLoaded, exams, students, grades, remarks, absents, groupes, activeExamId, nomDS, dateDS, seuils, normMethod, normParams, seuilDifficile, seuilReussite, gabaritTex, malusPaliers, malusMode, malusManuel, uiScale, appTheme, groupesDef, mode, commentaires, remarquesActives, remarquesCustom, remarquesOrdre, settingsTab, csvConfig, htmlPresets, htmlConfig, htmlStudentId]);  // Splash  useEffect(function() { if (showSearch && searchInputRef.current) searchInputRef.current.focus(); }, [showSearch]);
  useEffect(function() { var t = setTimeout(function() { setSplash(false); }, 2000); return function() { clearTimeout(t); }; }, []);



  // ─── Raccourcis clavier (desktop, onglet Correction uniquement) ───
  useEffect(function() {
    if (isMobile) return;
    function handleKey(e) {
      if (mode !== "correct") return;
      var tag = document.activeElement ? document.activeElement.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      var numEx = exam ? exam.exercises.length : 0;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (ei > 0) { setEi(ei - 1); }
        else if (si > 0) { setSi(si - 1); setEi(numEx - 1); }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (ei < numEx - 1) { setEi(ei + 1); }
        else if (si < students.length - 1) { setSi(si + 1); setEi(0); }
      } else if (e.key >= "1" && e.key <= "9") {
        var idx = parseInt(e.key, 10) - 1;
        if (idx < numEx) setEi(idx);
      }
    }
    window.addEventListener("keydown", handleKey);
    return function() { window.removeEventListener("keydown", handleKey); };
  }, [mode, isMobile, ei, si, exam, students.length]);

  var exam = exams.find(function(e) { return e.id === activeExamId; }) || exams[0] || null;
  var et = exam ? examTotal(exam) : 0;
  // Nom et date lus depuis l'exam actif (avec repli sur états globaux pour rétrocompatibilité)
  var examNomDS = exam ? (exam.nomDS !== undefined ? exam.nomDS : nomDS) : nomDS;
  var examDateDS = exam ? (exam.dateDS !== undefined ? exam.dateDS : dateDS) : dateDS;
  function setExamNomDS(val) { if (exam) updateExam(Object.assign({}, exam, { nomDS: val })); else setNomDS(val); }
  function setExamDateDS(val) { if (exam) updateExam(Object.assign({}, exam, { dateDS: val })); else setDateDS(val); }
  var presents = useMemo(function() { return students.filter(function(s) { return !absents[s.id]; }); }, [students, absents]);

  // ─── Gestion des profils ─────────────────────────────────────────

  function resetAppState() {
    setExams([]); setStudents([]); setGrades({}); setRemarks({});
    setAbsents({}); setGroupes({}); setActiveExamId(null);
    setNomDS(""); setDateDS(""); setCommentaires({});
    setMalusManuel({}); setSynthese([]);
  }

  function switchProfile(profileId) {
    // Sauvegarde immédiate du profil courant avant de switcher
    saveDB({ exams: exams, students: students, grades: grades, remarks: remarks, absents: absents, groupes: groupes, activeExamId: activeExamId, nomDS: nomDS, dateDS: dateDS, seuils: seuils, normMethod: normMethod, normParams: normParams, seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode, malusManuel: malusManuel, uiScale: uiScale, appTheme: appTheme, groupesDef: groupesDef, mode: mode, commentaires: commentaires, remarquesActives: remarquesActives, remarquesCustom: remarquesCustom, remarquesOrdre: remarquesOrdre, settingsTab: settingsTab, csvConfig: csvConfig, htmlPresets: htmlPresets, htmlConfig: htmlConfig, htmlStudentId: htmlStudentId, synthese: synthese, etablissement: etablissement }, activeProfileId);
    setActiveProfileId(profileId);
    saveMeta({ profiles: profiles, activeId: profileId });
    resetAppState();
    loadDB(profileId).then(function(saved) {
      if (saved) {
        if (saved.exams) setExams(saved.exams);
        if (saved.students) setStudents(saved.students);
        if (saved.grades) setGrades(saved.grades);
        if (saved.remarks) setRemarks(saved.remarks);
        if (saved.absents) setAbsents(saved.absents);
        if (saved.groupes) setGroupes(saved.groupes);
        if (saved.activeExamId) setActiveExamId(saved.activeExamId);
        if (saved.nomDS) setNomDS(saved.nomDS);
        if (saved.dateDS) setDateDS(saved.dateDS);
        if (saved.commentaires) setCommentaires(saved.commentaires);
        if (saved.malusManuel) setMalusManuel(saved.malusManuel);
        if (saved.synthese) setSynthese(saved.synthese);
        if (saved.seuils) setSeuils(saved.seuils);
        if (saved.normMethod) setNormMethod(saved.normMethod);
        if (saved.normParams) setNormParams(saved.normParams);
        if (saved.seuilDifficile) setSeuilDifficile(saved.seuilDifficile);
        if (saved.seuilReussite !== undefined) setSeuilReussite(saved.seuilReussite);
        if (saved.gabaritTex) setGabaritTex(saved.gabaritTex);
        if (saved.malusPaliers) setMalusPaliers(saved.malusPaliers);
        if (saved.malusMode) setMalusMode(saved.malusMode);
        if (saved.uiScale) setUiScale(saved.uiScale);
        if (saved.appTheme !== undefined) setAppTheme(saved.appTheme);
        if (saved.groupesDef) setGroupesDef(saved.groupesDef);
        if (saved.mode) setMode(saved.mode);
        if (saved.remarquesActives) setRemarquesActives(saved.remarquesActives);
        if (saved.remarquesCustom) setRemarquesCustom(saved.remarquesCustom);
        if (saved.remarquesOrdre) setRemarquesOrdre(saved.remarquesOrdre);
        if (saved.settingsTab) setSettingsTab(saved.settingsTab);
        if (saved.csvConfig) setCsvConfig(saved.csvConfig);
        if (saved.htmlPresets) setHtmlPresets(saved.htmlPresets);
        if (saved.htmlConfig) { var sc2 = saved.htmlConfig; setHtmlConfig(Object.assign({}, DEFAULT_HTML_CONFIG, sc2, { statsEleve: Object.assign({}, DEFAULT_HTML_CONFIG.statsEleve, sc2.statsEleve), statsClasse: Object.assign({}, DEFAULT_HTML_CONFIG.statsClasse, sc2.statsClasse) })); }
        if (saved.htmlStudentId !== undefined) setHtmlStudentId(saved.htmlStudentId);
        if (saved.etablissement) setEtablissement(Object.assign({}, { nom: ETABLISSEMENT.nom, classe: ETABLISSEMENT.classe, matricule: ETABLISSEMENT.matricule, promotion: ETABLISSEMENT.promotion, anneeScolaire: ETABLISSEMENT.anneeScolaire }, saved.etablissement));
      }
    });
    setShowProfileMenu(false);
  }

  function createProfile(name) {
    var newId = Math.random().toString(36).slice(2, 10);
    var newProfile = { id: newId, name: name.trim() || "Nouveau profil", createdAt: Date.now() };
    var newProfiles = profiles.concat([newProfile]);
    setProfiles(newProfiles);
    setNewProfileName("");
    saveMeta({ profiles: newProfiles, activeId: activeProfileId });
    // Crée immédiatement une base vide pour ce profil
    openNamedDB(profileDBName(newId)).catch(function() {});
  }

  function renameProfile(profileId, newName) {
    var updated = profiles.map(function(p) {
      return p.id === profileId ? Object.assign({}, p, { name: newName.trim() || p.name }) : p;
    });
    setProfiles(updated);
    saveMeta({ profiles: updated, activeId: activeProfileId });
    setEditingProfileId(null);
  }

  function deleteProfile(profileId) {
    if (profiles.length <= 1) return; // jamais supprimer le dernier
    var remaining = profiles.filter(function(p) { return p.id !== profileId; });
    setProfiles(remaining);
    var newActive = profileId === activeProfileId ? remaining[0].id : activeProfileId;
    saveMeta({ profiles: remaining, activeId: newActive });
    if (profileId === activeProfileId) switchProfile(newActive);
    // Suppression physique de la base IndexedDB (best effort)
    try { indexedDB.deleteDatabase(profileDBName(profileId)); } catch(e) {}
  }

  // ─── Élèves corrigés (au moins un item coché ou une case "traitée") ───
  var corriges = useMemo(function() {
    if (!exam) return [];
    return presents.filter(function(st) {
      for (var exz of exam.exercises) {
        for (var qz of exz.questions) {
          if (grades["treated_" + st.id + "_" + qz.id]) return true;
          for (var itz of qz.items) { if (grades[gk(st.id, itz.id)]) return true; }
        }
      }
      return false;
    });
  }, [presents, grades, exam]);

  // ─── Normalised notes ───
  var normData = useMemo(function() {
    if (!exam || !corriges.length) return { map: {} };
    var etW = examTotalWeighted(exam);
    var raw20 = corriges.map(function(s) {
      var note = etW > 0 ? noteSur20(studentTotalWeighted(grades, s.id, exam), etW) : 0;
      if ((groupes.tt || []).indexOf(s.id) >= 0) note = clamp(note * TT_COEFF, 0, 20);
      return note;
    });
    var getMT = function(sid) { return malusTotal(remarks, sid, exam, malusPaliers, malusManuel); };
    var preNorm = malusMode === "avant" ? raw20.map(function(nn, i) { return clamp(nn * (1 - getMT(corriges[i].id) / 100), 0, 20); }) : raw20;
    var normed = normaliser(preNorm, normMethod, normParams);
    var final2 = malusMode === "apres" ? normed.map(function(nn, i) { return clamp(nn * (1 - getMT(corriges[i].id) / 100), 0, 20); }) : normed;
    var map = {};
    corriges.forEach(function(s, i) { map[s.id] = { brut: raw20[i], norm: final2[i] }; });
    return { map: map };
  }, [exam, corriges, grades, et, normMethod, normParams, groupes, malusPaliers, malusMode, malusManuel, remarks]);

  function getNote20(sid) { var e = normData.map[sid]; return e ? e.norm : 0; }
  function getBrut20(sid) { var e = normData.map[sid]; return e ? e.brut : 0; }
  var isNorm = normMethod !== "none";
  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }

  var inp = { background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "4px 8px", fontSize: 13, fontFamily: FONT_B, outline: "none" };

  // Responsive
  var _winW = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  var setWinW = _winW[1]; var winW = _winW[0];
  useEffect(function() { var h = function() { setWinW(window.innerWidth); }; window.addEventListener("resize", h); return function() { window.removeEventListener("resize", h); }; }, []);
  var isMobile = winW < 700;
  var sc = isMobile ? Math.min(uiScale, 1.1) : uiScale;

  // JSON save/load
  function saveJSON() {
    var today = new Date(); var dd = String(today.getFullYear()) + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
    var slug = (examNomDS || "data").replace(/\s+/g, "_");
    downloadFile(JSON.stringify({ exams: exams, students: students, grades: grades, remarks: remarks, absents: absents, groupes: groupes, nomDS: examNomDS, dateDS: examDateDS, seuils: seuils, seuilDifficile: seuilDifficile, normMethod: normMethod, normParams: normParams, uiScale: uiScale, gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode, malusManuel: malusManuel, commentaires: commentaires }, null, 2), "check_" + slug + "_" + dd + ".json", "application/json");
  }
  function exportCSV() {
    if (!exam) return;
    var sep = csvConfig.sep;
    var dec = csvConfig.dec;
    var cols = csvConfig.cols;
    var etW = examTotalWeighted(exam);

    // Rangement par note décroissante
    var ranked = corriges.slice().sort(function(a, b) { return getNote20(b.id) - getNote20(a.id); });
    var rangMap = {};
    ranked.forEach(function(s, i) { rangMap[s.id] = i + 1; });

    // Élèves à inclure
    var liste = cols.absent ? students : corriges;

    // En-tête
    var header = [];
    if (cols.rang)        header.push("Rang");
    if (cols.nom)         header.push("Nom");
    if (cols.prenom)      header.push("Prénom");
    if (cols.absent)      header.push("Absent");
    if (cols.note)        header.push("Note /20");
    if (cols.noteNorm)    header.push("Note normalisée");
    if (cols.groupe)      header.push("Groupe");
    if (cols.competences) COMPETENCES.forEach(function(c) { header.push("Comp. " + c.id); });
    if (cols.malus)       header.push("Malus %");

    function fmt(n) { return n.toFixed(2).replace(".", dec); }

    var rows = liste.map(function(s) {
      var isAbsent = !!absents[s.id];
      var note20 = isAbsent ? null : getNote20(s.id);
      var brut20 = isAbsent ? null : getBrut20(s.id);
      var compNotes = isAbsent ? {} : notesParCompetence(grades, s.id, exam, seuils);
      var malus = isAbsent ? 0 : malusTotal(remarks, s.id, exam, malusPaliers, malusManuel);
      var grpObj = [TT_GROUPE].concat(groupesDef).find(function(g) { return (groupes[g.id] || []).indexOf(s.id) >= 0; });
      var grp = grpObj ? grpObj.label : "—";
      var row = [];
      if (cols.rang)        row.push(isAbsent ? "—" : String(rangMap[s.id] || "—"));
      if (cols.nom)         row.push(s.nom || "");
      if (cols.prenom)      row.push(s.prenom || "");
      if (cols.absent)      row.push(isAbsent ? "Oui" : "Non");
      if (cols.note)        row.push(isAbsent ? "—" : fmt(brut20));
      if (cols.noteNorm)    row.push(isAbsent ? "—" : fmt(note20));
      if (cols.groupe)      row.push(grp);
      if (cols.competences) COMPETENCES.forEach(function(c) { row.push(isAbsent ? "—" : (compNotes[c.id] || "NN")); });
      if (cols.malus)       row.push(isAbsent ? "—" : String(malus));
      return row.map(function(v) {
        var str = String(v);
        if (str.indexOf(sep) >= 0 || str.indexOf('"') >= 0) str = '"' + str.replace(/"/g, '""') + '"';
        return str;
      }).join(sep);
    });

    var csv = [header.join(sep)].concat(rows).join("\n");
    var slug = (examNomDS || "DS").replace(/\s+/g, "_");
    downloadFile(csv, slug + "_eleves.csv", "text/csv;charset=utf-8;");
  }

// ─── Synthèse multi-DS ───
function nomFichierSynthese() {
  var parts = [etablissement.classe, etablissement.matricule, etablissement.promotion]
    .map(function(p) { return (p || "").trim().replace(/\s+/g, "_"); })
    .filter(function(p) { return p.length > 0; });
  return "synthese_" + (parts.length > 0 ? parts.join("_") : "check") + ".csv";
}

function exporterVersSynthese() {
  if (!exam) return;
  var ranked = corriges.slice().sort(function(a, b) { return getNote20(b.id) - getNote20(a.id); });
  var rangMap = {};
  ranked.forEach(function(s, i) { rangMap[s.id] = i + 1; });

  var nouvelles = corriges.map(function(s) {
    var comps = notesParCompetence(grades, s.id, exam, seuils);
    var grpObj = [TT_GROUPE].concat(groupesDef).find(function(g) { return (groupes[g.id] || []).indexOf(s.id) >= 0; });
    var grp = grpObj ? grpObj.label : "";
    return {
      examId: exam.id,
      dsNom: examNomDS || "",
      dsDate: examDateDS || "",
      studentId: s.id,
      nom: s.nom || "",
      prenom: s.prenom || "",
      groupe: grp,
      noteBrute: Math.round(getBrut20(s.id) * 100) / 100,
      noteNorm: Math.round(getNote20(s.id) * 100) / 100,
      rang: rangMap[s.id] || 0,
      compA: comps["A"] || "NN",
      compN: comps["N"] || "NN",
      compR: comps["R"] || "NN",
      compV: comps["V"] || "NN",
    };
  });

  // Dedup : on retire les lignes du même exam, on ajoute les nouvelles
  var filtree = synthese.filter(function(row) { return row.examId !== exam.id; });
  var nouvellesSynthese = filtree.concat(nouvelles);
  setSynthese(nouvellesSynthese);
  saveDB(Object.assign({}, {
    exams: exams, students: students, grades: grades, remarks: remarks,
    absents: absents, groupes: groupes, activeExamId: activeExamId,
    nomDS: nomDS, dateDS: dateDS, seuils: seuils, normMethod: normMethod,
    normParams: normParams, seuilDifficile: seuilDifficile, seuilReussite: seuilReussite,
    gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode,
    malusManuel: malusManuel, uiScale: uiScale, appTheme: appTheme, groupesDef: groupesDef, mode: mode,
    commentaires: commentaires, remarquesActives: remarquesActives,
    remarquesCustom: remarquesCustom, remarquesOrdre: remarquesOrdre,
    settingsTab: settingsTab, csvConfig: csvConfig, htmlPresets: htmlPresets,
    htmlConfig: htmlConfig, htmlStudentId: htmlStudentId,
    synthese: nouvellesSynthese, etablissement: etablissement,
  }));
}

function telechargerSynthese() {
  if (!synthese.length) return;
  var sep = ";";
  var header = ["DS", "Date", "Nom", "Prénom", "Groupe",
                "Note Brute", "Note Normalisée", "Rang",
                "A", "N", "R", "V"].join(sep);
  var rows = synthese.map(function(row) {
    return [
      row.dsNom, row.dsDate, row.nom, row.prenom, row.groupe,
      row.noteBrute.toFixed(2), row.noteNorm.toFixed(2), String(row.rang),
      row.compA, row.compN, row.compR, row.compV,
    ].map(function(v) {
      var str = String(v);
      if (str.indexOf(sep) >= 0 || str.indexOf('"') >= 0)
        str = '"' + str.replace(/"/g, '""') + '"';
      return str;
    }).join(sep);
  });
  downloadFile([header].concat(rows).join("\n"), nomFichierSynthese(), "text/csv;charset=utf-8;");
}

function retirerDsSynthese(examId) {
  var filtree = synthese.filter(function(row) { return row.examId !== examId; });
  setSynthese(filtree);
}

  // ─── Fonctions de synchronisation GitHub ────────────────────────

  function githubSyncPath(profileId) {
    return "check-data/profil-" + (profileId || "default") + ".json";
  }

  function buildSnapshot() {
    return JSON.stringify({
      exams: exams, students: students, grades: grades, remarks: remarks,
      absents: absents, groupes: groupes, activeExamId: activeExamId,
      nomDS: nomDS, dateDS: dateDS, seuils: seuils, normMethod: normMethod,
      normParams: normParams, seuilDifficile: seuilDifficile, seuilReussite: seuilReussite,
      gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode,
      malusManuel: malusManuel, uiScale: uiScale, appTheme: appTheme, groupesDef: groupesDef,
      commentaires: commentaires, remarquesActives: remarquesActives,
      remarquesCustom: remarquesCustom, remarquesOrdre: remarquesOrdre,
      settingsTab: settingsTab, csvConfig: csvConfig, htmlPresets: htmlPresets,
      htmlConfig: htmlConfig, htmlStudentId: htmlStudentId,
      synthese: synthese, etablissement: etablissement,
    });
  }

  function githubSave() {
    if (!githubPat || !githubRepo) return;
    setSyncLoading(true); setSyncStatus("");
    var path = githubSyncPath(activeProfileId);
    var content = buildSnapshot();
    var b64 = btoa(unescape(encodeURIComponent(content)));
    // Récupérer le SHA courant du fichier (obligatoire pour les mises à jour)
    fetch("https://api.github.com/repos/" + githubRepo + "/contents/" + path, {
      headers: { "Authorization": "token " + githubPat, "Accept": "application/vnd.github+json" }
    }).then(function(r) { return r.ok ? r.json() : null; }).then(function(existing) {
      var body = { message: "Sauvegarde CHECK " + new Date().toLocaleString("fr-FR"), content: b64 };
      if (existing && existing.sha) body.sha = existing.sha;
      return fetch("https://api.github.com/repos/" + githubRepo + "/contents/" + path, {
        method: "PUT",
        headers: { "Authorization": "token " + githubPat, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }).then(function(r) {
      if (r && r.ok) {
        var now = new Date().toLocaleString("fr-FR");
        setSyncDate(now); setSyncStatus("✅ Sauvegardé le " + now);
      } else {
        setSyncStatus("❌ Erreur lors de la sauvegarde.");
      }
      setSyncLoading(false);
    }).catch(function() { setSyncStatus("❌ Erreur réseau."); setSyncLoading(false); });
  }

  function githubLoad() {
    if (!githubPat || !githubRepo) return;
    if (!window.confirm("Charger la sauvegarde distante ? L'état actuel sera écrasé.")) return;
    setSyncLoading(true); setSyncStatus("");
    var path = githubSyncPath(activeProfileId);
    fetch("https://api.github.com/repos/" + githubRepo + "/contents/" + path, {
      headers: { "Authorization": "token " + githubPat, "Accept": "application/vnd.github+json" }
    }).then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
      if (!data || !data.content) { setSyncStatus("❌ Aucune sauvegarde trouvée."); setSyncLoading(false); return; }
      var json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      var d = JSON.parse(json);
      if (d.exams) setExams(d.exams); if (d.students) setStudents(d.students);
      if (d.grades) setGrades(d.grades); if (d.remarks) setRemarks(d.remarks);
      if (d.absents) setAbsents(d.absents); if (d.groupes) setGroupes(d.groupes);
      if (d.activeExamId) setActiveExamId(d.activeExamId);
      if (d.nomDS) setNomDS(d.nomDS); if (d.dateDS) setDateDS(d.dateDS);
      if (d.seuils) setSeuils(d.seuils); if (d.normMethod) setNormMethod(d.normMethod);
      if (d.normParams) setNormParams(d.normParams);
      if (d.seuilDifficile) setSeuilDifficile(d.seuilDifficile);
      if (d.seuilReussite !== undefined) setSeuilReussite(d.seuilReussite);
      if (d.gabaritTex) setGabaritTex(d.gabaritTex);
      if (d.malusPaliers) setMalusPaliers(d.malusPaliers); if (d.malusMode) setMalusMode(d.malusMode);
      if (d.malusManuel) setMalusManuel(d.malusManuel);
      if (d.uiScale) setUiScale(d.uiScale); if (d.appTheme) setAppTheme(d.appTheme);
      if (d.groupesDef) setGroupesDef(d.groupesDef);
      if (d.commentaires) setCommentaires(d.commentaires);
      if (d.remarquesActives) setRemarquesActives(d.remarquesActives);
      if (d.remarquesCustom) setRemarquesCustom(d.remarquesCustom);
      if (d.remarquesOrdre) setRemarquesOrdre(d.remarquesOrdre);
      if (d.csvConfig) setCsvConfig(d.csvConfig); if (d.htmlPresets) setHtmlPresets(d.htmlPresets);
      if (d.htmlConfig) { var sc3 = d.htmlConfig; setHtmlConfig(Object.assign({}, DEFAULT_HTML_CONFIG, sc3, { statsEleve: Object.assign({}, DEFAULT_HTML_CONFIG.statsEleve, sc3.statsEleve), statsClasse: Object.assign({}, DEFAULT_HTML_CONFIG.statsClasse, sc3.statsClasse) })); }
      if (d.synthese) setSynthese(d.synthese);
      if (d.etablissement) setEtablissement(Object.assign({}, { nom: ETABLISSEMENT.nom, classe: ETABLISSEMENT.classe, matricule: ETABLISSEMENT.matricule, promotion: ETABLISSEMENT.promotion, anneeScolaire: ETABLISSEMENT.anneeScolaire }, d.etablissement));
      var now = new Date().toLocaleString("fr-FR");
      setSyncDate(now); setSyncStatus("✅ Chargé le " + now);
      setSyncLoading(false);
    }).catch(function() { setSyncStatus("❌ Erreur réseau."); setSyncLoading(false); });
  }

  function loadJSONFile(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      try {
        var d = JSON.parse(ev.target.result);
        if (d.exams) setExams(d.exams); if (d.students) setStudents(d.students);
        if (d.grades) setGrades(d.grades); if (d.remarks) setRemarks(d.remarks);
        if (d.absents) setAbsents(d.absents); if (d.groupes) setGroupes(d.groupes);
        if (d.nomDS) setNomDS(d.nomDS); if (d.dateDS) setDateDS(d.dateDS);
        if (d.seuils) setSeuils(d.seuils); if (d.normMethod) setNormMethod(d.normMethod);
        if (d.normParams) setNormParams(d.normParams); if (d.uiScale) setUiScale(d.uiScale);
        if (d.seuilDifficile) setSeuilDifficile(d.seuilDifficile);
        if (d.gabaritTex) setGabaritTex(d.gabaritTex);
        if (d.malusPaliers) setMalusPaliers(d.malusPaliers);
        if (d.malusMode) setMalusMode(d.malusMode);
        if (d.malusManuel) setMalusManuel(d.malusManuel);
        if (d.commentaires) setCommentaires(d.commentaires);
      } catch(err) { console.error("Import JSON error:", err); }
    };
    r.readAsText(f); e.target.value = "";
  }

  // ─── Exam CRUD ───
  function createExam() {
    var id = uid();
    var newExam = { id: id, name: "Nouveau DS", nomDS: "", dateDS: "", exercises: [{ id: uid(), title: "Exercice 1", questions: [{ id: uid(), label: "1", competences: ["R"], items: [{ id: uid(), label: "Item 1", points: 1 }] }] }] };
    setExams(exams.concat([newExam]));
    setActiveExamId(id);
  }
  function updateExam(updated) { setExams(exams.map(function(e) { return e.id === updated.id ? updated : e; })); }
  function deleteExam(id) { setExams(exams.filter(function(e) { return e.id !== id; })); if (activeExamId === id) setActiveExamId(null); }

  // ─── Exam editor helpers ───
  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function updPath(exam2, path, val) {
    var n = deepClone(exam2); var t = n;
    for (var i = 0; i < path.length - 1; i++) t = t[path[i]];
    t[path[path.length - 1]] = val;
    return n;
  }
  function addExercise() {
    if (!exam) return;
    updateExam({ ...exam, exercises: exam.exercises.concat([{ id: uid(), title: "Exercice " + (exam.exercises.length + 1), questions: [] }]) });
  }
  function addQuestion(exIdx) {
    var n = deepClone(exam);
    n.exercises[exIdx].questions.push({ id: uid(), label: "" + (n.exercises[exIdx].questions.length + 1), competences: ["R"], items: [{ id: uid(), label: "Item 1", points: 1 }] });
    updateExam(n);
  }
  function addItem(exIdx, qIdx) {
    var n = deepClone(exam);
    var its = n.exercises[exIdx].questions[qIdx].items;
    its.push({ id: uid(), label: "Item " + (its.length + 1), points: 1 });
    updateExam(n);
  }
  function delAt(exIdx, qIdx, iIdx) {
    var n = deepClone(exam);
    if (iIdx !== undefined) n.exercises[exIdx].questions[qIdx].items.splice(iIdx, 1);
    else if (qIdx !== undefined) n.exercises[exIdx].questions.splice(qIdx, 1);
    else n.exercises.splice(exIdx, 1);
    updateExam(n);
  }
  function toggleComp(exIdx, qIdx, cid) {
    var n = deepClone(exam);
    var q = n.exercises[exIdx].questions[qIdx];
    var cs = q.competences.indexOf(cid) >= 0 ? q.competences.filter(function(c) { return c !== cid; }) : q.competences.concat([cid]);
    if (cs.length > 0) q.competences = cs;
    updateExam(n);
  }

  

  // Confirmation suppression
  function askConfirm(label, onConfirm) {
    setConfirmDelete({ label: label, onConfirm: onConfirm });
  }

  // Réordonnancement exercices et questions
  function moveExercise(exIdx, dir) {
    var j = exIdx + dir;
    if (!exam || j < 0 || j >= exam.exercises.length) return;
    var n = deepClone(exam);
    var tmp = n.exercises[exIdx]; n.exercises[exIdx] = n.exercises[j]; n.exercises[j] = tmp;
    updateExam(n);
  }
  function moveQuestion(exIdx, qIdx, dir) {
    var j = qIdx + dir;
    if (!exam || j < 0 || j >= exam.exercises[exIdx].questions.length) return;
    var n = deepClone(exam);
    var tmp = n.exercises[exIdx].questions[qIdx]; n.exercises[exIdx].questions[qIdx] = n.exercises[exIdx].questions[j]; n.exercises[exIdx].questions[j] = tmp;
    updateExam(n);
  }

  // CSV import
  function handleCSV(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      var parsed = importCSV(ev.target.result);
      if (parsed.length > 0) setStudents(parsed);
    };
    r.readAsText(f); e.target.value = "";
  }

  // Swipe
  var handleTouchStart = useCallback(function(e) { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, []);
  var handleTouchEnd = useCallback(function(e) {
    var dx = e.changedTouches[0].clientX - touchRef.current.x;
    var dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && si > 0) { setSi(si - 1); setEi(0); }
      if (dx < 0 && si < students.length - 1) { setSi(si + 1); setEi(0); }
    }
  }, [si, students.length]);


  // ─── Current student data (for correction mode) ───
  var safeIdx = si < students.length ? si : 0;
  var s = students[safeIdx] || { id: "none", nom: "", prenom: "" };
  // Réinitialiser si si dépasse le tableau (ajout/suppression d'élèves)
  useEffect(function() { if (students.length > 0 && si >= students.length) setSi(0); }, [students.length, si]);
  var exCur = exam && exam.exercises[ei] ? exam.exercises[ei] : null;
  var stuTot = exam ? studentTotal(grades, s.id, exam) : 0;
  var cpVals = exam ? competencePct(grades, s.id, exam) : {};
  var cnVals = exam ? notesParCompetence(grades, s.id, exam, seuils) : {};
  var eAbsVals = exam ? exercisePctAbsolute(grades, s.id, exam) : [];
  var eRelVals = exam ? exercisePctRelative(grades, s.id, exam, students, absents) : [];
  var curNote = getNote20(s.id);
  var curBrut = getBrut20(s.id);

  // Ranking
  var allNotesRanked = corriges.map(function(st) { return { id: st.id, note: getNote20(st.id) }; }).sort(function(a, b) { return b.note - a.note; });
  var rangMap = {}; var curRang = 1;
  allNotesRanked.forEach(function(item, i) { if (i > 0 && item.note < allNotesRanked[i - 1].note) curRang = i + 1; rangMap[item.id] = curRang; });
  var rang = rangMap[s.id] || "-";
  var gradedCount = students.filter(function(st) { return absents[st.id] || (exam && exam.exercises.some(function(exz) { return exz.questions.some(function(qz) { return qz.items.some(function(itz) { return grades[gk(st.id, itz.id)]; }); }); })); }).length;

  // Malus for current student
  var remCount = exam && !absents[s.id] ? countMalusRemarks(remarks, s.id, exam) : 0;
  var autoMalusVal = exam && !absents[s.id] ? malusAuto(remarks, s.id, exam, malusPaliers) : 0;
  var manMalus = malusManuel[s.id] || 0;
  var totalMalusVal = exam && !absents[s.id] ? malusTotal(remarks, s.id, exam, malusPaliers, malusManuel) : 0;
  var hasMalus = totalMalusVal > 0;
  var showMalusBar = !absents[s.id] && (remCount > 0 || manMalus > 0);

  // Toutes les remarques disponibles (fixes + custom), triées selon remarquesOrdre, filtrées par actives
  var allRemarquesBase = REMARQUES.concat(remarquesCustom);
  var allRemarquesSorted = remarquesOrdre.length
    ? allRemarquesBase.slice().sort(function(a, b) {
        var ia = remarquesOrdre.indexOf(a.id); var ib = remarquesOrdre.indexOf(b.id);
        if (ia < 0) ia = 999; if (ib < 0) ib = 999;
        return ia - ib;
      })
    : allRemarquesBase;
  var allRemarques = allRemarquesSorted.filter(function(r) { return remarquesActives.indexOf(r.id) >= 0; });

  // Search
  var searchResults = searchTerm.trim().length > 0
    ? students.map(function(st, idx) { return { st: st, idx: idx }; }).filter(function(o) { var term = searchTerm.toLowerCase(); return o.st.nom.toLowerCase().indexOf(term) >= 0 || o.st.prenom.toLowerCase().indexOf(term) >= 0; }).slice(0, 8)
    : [];

  // Stats
  var statGroups = [{ id: "all", label: "Toute la classe" }].concat(groupesDef.filter(function(g) { return g.isStatGroup && (groupes[g.id] || []).length > 0; }).map(function(g) { return { id: g.id, label: g.label }; }));
  var filteredCorriges = statGroup === "all" ? corriges : corriges.filter(function(ss) { return (groupes[statGroup] || []).indexOf(ss.id) >= 0; });
  var statNotes = filteredCorriges.map(function(ss) { return getNote20(ss.id); });
  var statMoy = statNotes.length ? statNotes.reduce(function(a, b) { return a + b; }, 0) / statNotes.length : 0;
  var statSorted = statNotes.slice().sort(function(a, b) { return a - b; });
  var statMed = statSorted.length % 2 === 0 && statSorted.length ? (statSorted[statSorted.length / 2 - 1] + statSorted[statSorted.length / 2]) / 2 : (statSorted[Math.floor(statSorted.length / 2)] || 0);
  var statMin = statSorted[0] || 0;
  var statMax = statSorted[statSorted.length - 1] || 0;
  var statSigma = statNotes.length ? Math.sqrt(statNotes.reduce(function(ss2, nn) { return ss2 + (nn - statMoy) * (nn - statMoy); }, 0) / statNotes.length) : 0;

  // Total points for exam editor display
  var totalPts = exam ? examTotal(exam) : 0;

  // Nav
  // ─── Génération HTML mémoïsée (évite le rechargement de l'iframe à chaque re-render) ───
  var htmlStudentForPreview = corriges.find(function(s) { return s.id === htmlStudentId; }) || corriges[0] || null;
  var htmlRankMapForPreview = useMemo(function() {
    var map = {};
    if (!corriges.length) return map;
    var ranked = corriges.slice().sort(function(a, b) { return getNote20(b.id) - getNote20(a.id); });
    var rg = 1;
    ranked.forEach(function(r, i) {
      if (i > 0 && getNote20(r.id) < getNote20(ranked[i - 1].id)) rg = i + 1;
      map[r.id] = rg;
    });
    return map;
  }, [corriges, grades, exam, normMethod, normParams, malusPaliers, malusManuel, groupes]);

  var htmlSrc = useMemo(function() {
    if (!exam || !htmlStudentForPreview) return "";
    return genererHtmlEleve({
      student: htmlStudentForPreview, exam: exam, grades: grades, remarks: remarks, absents: absents,
      allStudents: students, nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
      seuilDifficile: seuilDifficile, seuilReussite: seuilReussite,
      getNote20: getNote20, getBrut20: getBrut20,
      rankMap: htmlRankMapForPreview,
      malusPaliers: malusPaliers, malusManuel: malusManuel,
      commentaires: commentaires, allRemarques: allRemarques,
      htmlConfig: htmlConfig,
    });
  }, [htmlStudentForPreview, htmlRankMapForPreview, exam, grades, remarks, absents, students,
      examNomDS, examDateDS, seuils, seuilDifficile, seuilReussite, malusPaliers, malusManuel,
      commentaires, allRemarques, htmlConfig]);

  var navItems = [{ id: "prep", l: "Préparation", ic: "\u2699\uFE0F" }, { id: "correct", l: "Correction", ic: "\u270F\uFE0F" }, { id: "resultats", l: "Résultats", ic: "\uD83D\uDC64" }, { id: "stats", l: "Stats", ic: "\uD83D\uDCCA" }, { id: "export", l: "Export", ic: "\uD83D\uDCC4" }, { id: "aide", l: "Aide", ic: "\u2139\uFE0F" }];  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // Splash screen
  if (showSplash) {
    return (
      <div style={{ fontFamily: FONT_B, background: "#faf7f2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={SPLASH_IMG} alt="C.H.E.C.K." style={{ maxWidth: "80%", maxHeight: "70vh", objectFit: "contain" }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_B, background: th.bg, color: th.text, height: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden", maxWidth: "100vw", fontSize: "14px" }}
         onTouchStart={isMobile && mode === "correct" ? handleTouchStart : undefined}
         onTouchEnd={isMobile && mode === "correct" ? handleTouchEnd : undefined}
         onClick={showProfileMenu ? function() { setShowProfileMenu(false); } : undefined}>
      <link href={FONTS_URL} rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, opacity: dark ? 0.025 : 0.035, backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, " + th.ruledLine + " 31px, " + th.ruledLine + " 32px)", backgroundPosition: "0 8px", pointerEvents: "none", zIndex: 0 }} />

      {/* MODALE CONFIRMATION SUPPRESSION */}
      {confirmDelete && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function() { setConfirmDelete(null); }}>
        <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: "24px 28px", width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", textAlign: "center" }} onClick={function(e) { e.stopPropagation(); }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🗑️</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT, marginBottom: 6, color: th.text }}>Confirmer la suppression</div>
          <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, marginBottom: 20, lineHeight: 1.5 }}>
            {"Supprimer "}<strong>{confirmDelete.label}</strong>{" ?"}
            <br />{"Cette action est irréversible."}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function() { setConfirmDelete(null); }} style={{ flex: 1, padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 600, background: th.surface, border: "1px solid " + th.border, color: th.textMuted }}>Annuler</button>
            <button onClick={function() { confirmDelete.onConfirm(); setConfirmDelete(null); }} style={{ flex: 1, padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.dangerBg, border: "1px solid " + th.danger + "40", color: th.danger }}>Supprimer</button>
          </div>
        </div>
      </div>}

      {/* HEADER — escamotable au scroll, taille agrandie */}
      <header style={{ background: th.card, borderBottom: "2px solid " + th.headerBorder, padding: isMobile ? "8px 10px" : "10px 14px", display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, position: "sticky", top: 0, zIndex: 100, boxShadow: th.shadow, flexShrink: 0 }}>
        <img src={appTheme === "dark" ? LOGO_DARK : LOGO_LIGHT} alt="C.H.E.C.K." style={{ height: isMobile ? 32 : 42, objectFit: "contain" }} />
        {/* Sélecteur de profil — toujours visible */}
        <div style={{ position: "relative" }}>
          <button onClick={function() { setShowProfileMenu(!showProfileMenu); setEditingProfileId(null); setNewProfileName(""); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 11 : 12, fontWeight: 600, background: showProfileMenu ? th.accentBg : "transparent", border: "1px solid " + (showProfileMenu ? th.accent + "40" : th.border), color: th.textMuted }}
            title="Changer de profil">
            {"\uD83D\uDC64"}
            {!isMobile && <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(profiles.find(function(p) { return p.id === activeProfileId; }) || {}).name || ""}</span>}
            <span style={{ fontSize: 9, opacity: 0.6 }}>{"▾"}</span>
          </button>
          {showProfileMenu && <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 4, background: th.card, border: "1px solid " + th.border, borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 120, minWidth: 210, overflow: "hidden" }} onClick={function(e) { e.stopPropagation(); }}>
            {profiles.map(function(p) {
              var isActive = p.id === activeProfileId;
              var isEditing = editingProfileId === p.id;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid " + th.border, background: isActive ? th.accentBg : "transparent" }}>
                  {isEditing
                    ? <input autoFocus value={editingProfileName} onChange={function(e) { setEditingProfileName(e.target.value); }}
                        onKeyDown={function(e) { if (e.key === "Enter") renameProfile(p.id, editingProfileName); if (e.key === "Escape") setEditingProfileId(null); }}
                        onBlur={function() { renameProfile(p.id, editingProfileName); }}
                        style={{ flex: 1, fontFamily: FONT_B, fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid " + th.accent, background: th.surface, color: th.text, outline: "none" }} />
                    : <button onClick={function() { if (!isActive) switchProfile(p.id); else setShowProfileMenu(false); }}
                        style={{ flex: 1, textAlign: "left", fontFamily: FONT_B, fontSize: 12, fontWeight: isActive ? 700 : 400, background: "transparent", border: "none", cursor: "pointer", color: isActive ? th.accent : th.text, padding: "2px 0" }}>
                        {(isActive ? "\u25CF " : "\u25CB ") + p.name}
                      </button>
                  }
                  <button onClick={function() { setEditingProfileId(p.id); setEditingProfileName(p.name); }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: th.textDim, padding: "2px 4px", flexShrink: 0 }} title="Renommer">{"✏️"}</button>
                  {!isActive && profiles.length > 1 &&
                    <button onClick={function() { askConfirm("Supprimer le profil \"" + p.name + "\" ?", function() { deleteProfile(p.id); }); setShowProfileMenu(false); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: th.danger, padding: "2px 4px", flexShrink: 0 }} title="Supprimer">{"\uD83D\uDDD1\uFE0F"}</button>
                  }
                </div>
              );
            })}
            {/* Créer un nouveau profil */}
            <div style={{ padding: "8px 10px", display: "flex", gap: 6, alignItems: "center" }}>
              <input value={newProfileName} onChange={function(e) { setNewProfileName(e.target.value); }}
                onKeyDown={function(e) { if (e.key === "Enter" && newProfileName.trim()) createProfile(newProfileName); }}
                placeholder="Nouveau profil…"
                style={{ flex: 1, fontFamily: FONT_B, fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid " + th.border, background: th.surface, color: th.text, outline: "none" }} />
              <button onClick={function() { if (newProfileName.trim()) createProfile(newProfileName); }}
                style={{ fontFamily: FONT_B, fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 4, cursor: "pointer", background: th.accent, border: "none", color: "#fff" }}>{"+"}</button>
            </div>
          </div>}
        </div>
        {!isMobile && examNomDS && <span style={{ fontSize: 13, color: th.textMuted, fontFamily: FONT, fontStyle: "italic" }}>{"\u2014 " + examNomDS + (examDateDS ? " \u00B7 " + examDateDS : "")}</span>}
        {exam && mode === "correct" && <span style={{ fontSize: isMobile ? 10 : 11, color: th.accent, fontWeight: 600, fontFamily: MONO, background: th.accentBg, padding: "3px 8px", borderRadius: 10, border: "1px solid " + th.accent + "25" }}>{gradedCount + "/" + students.length}</span>}
        <div style={{ flex: 1 }} />
        {!isMobile && <div style={{ display: "flex", gap: 2 }}>
          {navItems.map(function(nn) { return (
            <button key={nn.id} onClick={function() { setMode(nn.id); }} style={{ display: "flex", alignItems: "center", gap: 3, padding: "6px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 600, border: "1px solid " + (mode === nn.id ? th.accent + "40" : "transparent"), background: mode === nn.id ? th.accent + "12" : "transparent", color: mode === nn.id ? th.accent : th.textMuted }}>
              {nn.ic} {nn.l}
            </button>
          ); })}
        </div>}
        {!isMobile && <div style={{ flex: 1 }} />}
        
        <button onClick={function() { setShowSettings(true); }} style={{ ...inp, cursor: "pointer", fontSize: 14, padding: "5px 9px" }}>{"\u2699\uFE0F"}</button>
        {!isMobile && <button onClick={saveJSON} style={{ ...inp, cursor: "pointer", fontSize: 12, padding: "5px 8px" }}>{"\uD83D\uDCBE"}</button>}
        {!isMobile && <button onClick={function() { fileRef.current && fileRef.current.click(); }} style={{ ...inp, cursor: "pointer", fontSize: 12, padding: "5px 8px" }}>{"\uD83D\uDCC2"}</button>}
        {/* Menu ⋯ — toujours à droite, contient zoom + thème + À propos */}
        <div style={{ position: "relative" }}>
          <button onClick={function() { setShowMore(function(v) { return !v; }); }}
            style={{ ...inp, cursor: "pointer", fontSize: 16, padding: "5px 9px", background: showMore ? th.accentBg : "transparent", border: "1px solid " + (showMore ? th.accent + "40" : th.border), color: showMore ? th.accent : th.textMuted }}
            title="Plus d'options">{"⋯"}</button>
          {showMore && <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: th.card, border: "1px solid " + th.border, borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 120, minWidth: 190, overflow: "hidden", padding: "6px 0" }} onClick={function(e) { e.stopPropagation(); }}>
            {/* Zoom */}
            <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", borderBottom: "1px solid " + th.border }}>
              <span style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, flex: 1 }}>{"Zoom"}</span>
              <button onClick={function() { setUiScale(function(v) { return Math.max(0.75, +(v - 0.05).toFixed(2)); }); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: th.textMuted, padding: "2px 7px", lineHeight: 1 }} title="Réduire">{"−"}</button>
              <span style={{ fontFamily: MONO, fontSize: 11, color: th.textDim, minWidth: 36, textAlign: "center", userSelect: "none" }}>{Math.round(uiScale * 100) + "%"}</span>
              <button onClick={function() { setUiScale(function(v) { return Math.min(1.5, +(v + 0.05).toFixed(2)); }); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: th.textMuted, padding: "2px 7px", lineHeight: 1 }} title="Agrandir">{"+"}</button>
            </div>
            {/* Thème */}
            <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid " + th.border, gap: 8 }}>
              <span style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, flex: 1 }}>{"Thème"}</span>
              {[{ v: "light", ic: "\u2600\uFE0F" }, { v: "dark", ic: "\uD83C\uDF19" }, { v: "young", ic: "\uD83C\uDF08" }].map(function(t) {
                return <button key={t.v} onClick={function() { setAppTheme(t.v); }}
                  style={{ background: appTheme === t.v ? th.accentBg : "transparent", border: "1px solid " + (appTheme === t.v ? th.accent + "55" : th.border), borderRadius: 4, cursor: "pointer", fontSize: 14, padding: "2px 6px", opacity: appTheme === t.v ? 1 : 0.5 }}
                  title={t.v}>{t.ic}</button>;
              })}
            </div>
            {/* À propos */}
            <button onClick={function() { setShowApropos(true); setShowMore(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "transparent", border: "none", cursor: "pointer", fontFamily: FONT_B, fontSize: 12, color: th.textMuted, textAlign: "left" }}>
              {"❓"} <span>{"À propos"}</span>
            </button>
          </div>}
        </div>
        {isMobile && <div style={{ position: "relative" }}>
          <button onClick={function() { setShowMore(!showMore); }} style={{ ...inp, cursor: "pointer", fontSize: 14, padding: "5px 9px" }}>{"\u22EF"}</button>
          {showMore && <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: th.card, border: "1px solid " + th.border, borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 110, minWidth: 160, overflow: "hidden" }}>
            {[{ id: "prep", l: "Preparation", ic: "\u2699\uFE0F" }, { id: "export", l: "Export LaTeX", ic: "\uD83D\uDCC4" }].map(function(nn) { return (
              <button key={nn.id} onClick={function() { setMode(nn.id); setShowMore(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", cursor: "pointer", fontFamily: FONT_B, fontSize: 13, background: "transparent", border: "none", borderBottom: "1px solid " + th.border, color: th.text, textAlign: "left" }}>{nn.ic} {nn.l}</button>
            ); })}
            <button onClick={function() { saveJSON(); setShowMore(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", cursor: "pointer", fontFamily: FONT_B, fontSize: 13, background: "transparent", border: "none", borderBottom: "1px solid " + th.border, color: th.text, textAlign: "left" }}>{"\uD83D\uDCBE"} Sauver</button>
            <button onClick={function() { fileRef.current && fileRef.current.click(); setShowMore(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", cursor: "pointer", fontFamily: FONT_B, fontSize: 13, background: "transparent", border: "none", color: th.text, textAlign: "left" }}>{"\uD83D\uDCC2"} Charger</button>
          </div>}
        </div>}
        <input ref={fileRef} type="file" accept=".json" onChange={loadJSONFile} style={{ display: "none" }} />
      </header>
      {/* Barre de progression — correction uniquement */}
      {mode === "correct" && exam && students.length > 0 && (
        <div style={{ height: 3, background: th.border, flexShrink: 0 }}>
          <div style={{ height: "100%", background: th.success, width: (gradedCount / students.length * 100) + "%", transition: "width 0.4s" }} />
        </div>
      )}

      {/* MAIN — zoomé via la propriété CSS zoom (scroll natif, pas de compensation) */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ zoom: isMobile ? 1 : sc }}>
        <main style={{ padding: isMobile ? 6 : 10, maxWidth: isMobile ? "100%" : "840px", margin: "0 auto", width: "100%", boxSizing: "border-box", position: "relative", zIndex: 1, paddingBottom: isMobile ? 70 : 10 }}>


        {/* ═══ PREPARATION ═══ */}
        {mode === "prep" && <div>
          {/* Exam selector */}
          {exams.length > 1 && <div style={{ display: "flex", gap: 3, marginBottom: 10, flexWrap: "wrap" }}>
            {exams.map(function(ex) { return (
              <button key={ex.id} onClick={function() { setActiveExamId(ex.id); }} style={{ padding: "4px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 600, background: activeExamId === ex.id ? th.accentBg : th.surface, border: "1px solid " + (activeExamId === ex.id ? th.accent + "55" : th.border), color: activeExamId === ex.id ? th.accent : th.textMuted }}>{ex.name}</button>
            ); })}
          </div>}

          {/* Exam editor */}
          {exam && <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: collapsedExams[exam.id] ? "none" : "1px solid " + th.border, background: th.surface, cursor: "pointer" }} onClick={function() { setCollapsedExams(function(c) { var n2 = {}; for (var k in c) n2[k] = c[k]; n2[exam.id] = !c[exam.id]; return n2; }); }}>
              <span style={{ fontSize: 10, color: th.textDim, transform: collapsedExams[exam.id] ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>{"\u25BC"}</span>
              <input value={examNomDS} onChange={function(e) { e.stopPropagation(); setExamNomDS(e.target.value); }} onClick={function(e) { e.stopPropagation(); }} style={{ ...inp, flex: 2, fontSize: 16, fontWeight: 600, background: "transparent", border: "none" }} placeholder="Nom du DS (ex: DS 05)..." />
              <span style={{ fontSize: 11, color: th.textDim, fontFamily: FONT_B, flexShrink: 0 }}>{"Date :"}</span>
              <input value={examDateDS} onChange={function(e) { e.stopPropagation(); setExamDateDS(e.target.value); }} onClick={function(e) { e.stopPropagation(); }} style={{ ...inp, flex: 1, fontSize: 12, background: "transparent", border: "none", color: th.textMuted }} placeholder="jj/mm/aaaa..." />
              <span style={{ fontFamily: MONO, fontSize: 13, color: th.accent, fontWeight: 700, padding: "2px 8px", background: th.accentBg, borderRadius: th.radiusSm }}>{totalPts + " pts"}</span>
              <button onClick={function(e) { e.stopPropagation(); askConfirm("le devoir \u00AB\u00A0" + examNomDS + "\u00A0\u00BB", function() { deleteExam(exam.id); }); }} style={{ background: th.dangerBg, border: "none", color: th.danger, borderRadius: th.radiusSm, padding: "4px 6px", cursor: "pointer", fontSize: 12 }}>{"\u2717"}</button>
            </div>
            {!collapsedExams[exam.id] && <div style={{ padding: 10 }}>
              {exam.exercises.map(function(ex, exIdx) {
                var exPts = ex.questions.reduce(function(s2, q) { return s2 + q.items.reduce(function(si2, it) { return si2 + (+it.points || 0); }, 0); }, 0);
                var isCol = collapsed[ex.id];
                return (
                  <div key={ex.id} style={{ marginBottom: 8, background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderBottom: isCol ? "none" : "1px solid " + th.border, cursor: "pointer" }} onClick={function() { setCollapsed(function(c) { var n2 = {}; for (var k in c) n2[k] = c[k]; n2[ex.id] = !c[ex.id]; return n2; }); }}>
                      <span style={{ fontSize: 10, color: th.textDim, transform: isCol ? "rotate(-90deg)" : "none", transition: "0.15s" }}>{"\u25BC"}</span>
                      <input value={ex.title} onChange={function(e) { e.stopPropagation(); updateExam(updPath(exam, ["exercises", exIdx, "title"], e.target.value)); }} onClick={function(e) { e.stopPropagation(); }} style={{ ...inp, flex: 1, fontWeight: 600, background: "transparent", border: "none" }} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: th.textMuted }}>{exPts + "pts"}</span>
                      <input type="number" min="0" step="0.5" value={ex.coeff !== undefined ? ex.coeff : 1} onClick={function(e) { e.stopPropagation(); }} onChange={function(e) { e.stopPropagation(); var v = Math.max(0, parseFloat(e.target.value) || 0); updateExam(updPath(exam, ["exercises", exIdx, "coeff"], v)); }} style={{ ...inp, width: 46, fontSize: 10, fontFamily: MONO, textAlign: "center", color: th.accent, padding: "2px 3px" }} title={"Coefficient \u00D7 " + (ex.coeff !== undefined ? ex.coeff : 1)} />
                      <button onClick={function(e) { e.stopPropagation(); moveExercise(exIdx, -1); }} disabled={exIdx === 0} style={{ background: "none", border: "none", color: exIdx === 0 ? th.textDim : th.textMuted, cursor: exIdx === 0 ? "default" : "pointer", fontSize: 10, padding: "0 2px" }} title="Monter">{"▲"}</button>
                      <button onClick={function(e) { e.stopPropagation(); moveExercise(exIdx, 1); }} disabled={exIdx === exam.exercises.length - 1} style={{ background: "none", border: "none", color: exIdx === exam.exercises.length - 1 ? th.textDim : th.textMuted, cursor: exIdx === exam.exercises.length - 1 ? "default" : "pointer", fontSize: 10, padding: "0 2px" }} title="Descendre">{"▼"}</button>
                      <button onClick={function(e) { e.stopPropagation(); askConfirm("l\u2019exercice \u00AB\u00A0" + ex.title + "\u00A0\u00BB", function() { delAt(exIdx); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 11 }}>{"\u2715"}</button>
                    </div>
                    {!isCol && <div style={{ padding: "4px 10px 8px" }}>
                      {ex.questions.map(function(q, qIdx) {
                        return (
                          <div key={q.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: qIdx < ex.questions.length - 1 ? "1px solid " + th.border + "22" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                              <span style={{ color: th.textMuted, fontSize: 10, fontWeight: 700, minWidth: 18 }}>Q.</span>
                              <input value={q.label} onChange={function(e) { updateExam(updPath(exam, ["exercises", exIdx, "questions", qIdx, "label"], e.target.value)); }} style={{ ...inp, width: 50 }} />
                              <div style={{ display: "flex", gap: 2 }}>
                                {COMPETENCES.map(function(c) { return (
                                  <button key={c.id} onClick={function() { toggleComp(exIdx, qIdx, c.id); }} style={{ padding: "1px 6px", fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: "pointer", border: "1px solid " + (q.competences.indexOf(c.id) >= 0 ? cc(c, dark) + "55" : th.border), background: q.competences.indexOf(c.id) >= 0 ? cc(c, dark) + "22" : "transparent", color: q.competences.indexOf(c.id) >= 0 ? cc(c, dark) : th.textDim, fontFamily: FONT_B }}>{c.short}</button>
                                ); })}
                              </div>
                              <button onClick={function() { var n = deepClone(exam); n.exercises[exIdx].questions[qIdx].bonus = !q.bonus; updateExam(n); }} title="Question bonus (points hors maximum)" style={{ padding: "1px 5px", fontSize: 11, borderRadius: 3, cursor: "pointer", border: "1px solid " + (q.bonus ? th.warning + "55" : th.border), background: q.bonus ? th.warningBg : "transparent", color: q.bonus ? th.warning : th.textDim }}>{"\uD83C\uDF81"}</button>
                              <div style={{ flex: 1 }} />
                              <span style={{ fontFamily: MONO, fontSize: 9, color: th.textMuted }}>{q.items.reduce(function(s2, it) { return s2 + (+it.points || 0); }, 0) + "pts"}</span>
                              <button onClick={function() { moveQuestion(exIdx, qIdx, -1); }} disabled={qIdx === 0} style={{ background: "none", border: "none", color: qIdx === 0 ? th.textDim : th.textMuted, cursor: qIdx === 0 ? "default" : "pointer", fontSize: 9, padding: "0 1px" }} title="Monter">{"▲"}</button>
                              <button onClick={function() { moveQuestion(exIdx, qIdx, 1); }} disabled={qIdx === ex.questions.length - 1} style={{ background: "none", border: "none", color: qIdx === ex.questions.length - 1 ? th.textDim : th.textMuted, cursor: qIdx === ex.questions.length - 1 ? "default" : "pointer", fontSize: 9, padding: "0 1px" }} title="Descendre">{"▼"}</button>
                              <button onClick={function() { askConfirm("la question \u00AB\u00A0Q.\u00A0" + q.label + "\u00A0\u00BB", function() { delAt(exIdx, qIdx); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                            </div>
                            <div style={{ marginLeft: 24 }}>
                              {q.items.map(function(it, iIdx) { return (
                                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                  <span style={{ color: th.textDim, fontSize: 8 }}>{"\u2022"}</span>
                                  <input value={it.label} onChange={function(e) { updateExam(updPath(exam, ["exercises", exIdx, "questions", qIdx, "items", iIdx, "label"], e.target.value)); }} style={{ ...inp, flex: 1, fontSize: 11, padding: "2px 6px" }} placeholder="Description..." />
                                  <input type="number" step="0.5" min="0" value={it.points} onChange={function(e) { updateExam(updPath(exam, ["exercises", exIdx, "questions", qIdx, "items", iIdx, "points"], parseFloat(e.target.value) || 0)); }} style={{ ...inp, width: 44, fontSize: 11, fontFamily: MONO, textAlign: "center", color: th.accent, padding: "2px 3px" }} />
                                  <button onClick={function() { askConfirm("l\u2019item \u00AB\u00A0" + (it.label || "sans nom") + "\u00A0\u00BB", function() { delAt(exIdx, qIdx, iIdx); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 9 }}>{"\u2715"}</button>
                                </div>
                              ); })}
                              <button onClick={function() { addItem(exIdx, qIdx); }} style={{ background: "none", border: "none", color: th.accent, cursor: "pointer", fontSize: 10, fontFamily: FONT_B }}>+ Item</button>
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={function() { addQuestion(exIdx); }} style={{ background: th.accentBg, border: "1px dashed " + th.accent + "33", color: th.accent, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT_B, width: "100%" }}>+ Question</button>
                    </div>}
                  </div>
                );
              })}
              <button onClick={addExercise} style={{ background: th.accentBg, border: "1px dashed " + th.accent + "44", color: th.accent, borderRadius: th.radiusSm, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT_B, width: "100%" }}>+ Exercice</button>
            </div>}
          </div>}

          <button onClick={createExam} style={{ background: th.accentBg, border: "1px dashed " + th.accent + "55", color: th.accent, borderRadius: th.radius, padding: "10px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT_B, width: "100%", marginBottom: 14 }}>+ Nouveau devoir</button>

          {/* Students */}
          <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT }}>{"Eleves (" + students.length + ")"}</span>
              <div style={{ flex: 1 }} />
              <button onClick={function() { setShowGroupes(!showGroupes); }} style={{ background: showGroupes ? th.accentBg : th.surface, border: "1px solid " + (showGroupes ? th.accent + "33" : th.border), color: showGroupes ? th.accent : th.textMuted, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT_B }}>Groupes</button>
              <button onClick={function() { csvRef.current && csvRef.current.click(); }} style={{ background: th.accentBg, border: "1px solid " + th.accent + "33", color: th.accent, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT_B }}>{"\uD83D\uDCC2 CSV"}</button>
              <input ref={csvRef} type="file" accept=".csv,.txt,.tsv" onChange={handleCSV} style={{ display: "none" }} />
            </div>
            <div style={{ fontSize: 10, color: th.textDim, marginBottom: 8, fontFamily: FONT_B }}>NOM;Prenom — un par ligne</div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {students.map(function(st, idx) { return (
                <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: th.textDim, minWidth: 18, textAlign: "right" }}>{idx + 1}</span>
                  <input value={st.nom} onChange={function(e) { var n2 = students.slice(); n2[idx] = { ...n2[idx], nom: e.target.value }; setStudents(n2); }} placeholder="NOM" style={{ ...inp, flex: 1, fontSize: 12 }} />
                  <input value={st.prenom} onChange={function(e) { var n2 = students.slice(); n2[idx] = { ...n2[idx], prenom: e.target.value }; setStudents(n2); }} placeholder="Prenom" style={{ ...inp, flex: 1, fontSize: 12 }} />
                  {showGroupes && [TT_GROUPE].concat(groupesDef).map(function(g) {
                    var inG = (groupes[g.id] || []).indexOf(st.id) >= 0;
                    return <button key={g.id} onClick={function() { var cur = groupes[g.id] || []; var n2 = {}; for (var k in groupes) n2[k] = groupes[k]; n2[g.id] = inG ? cur.filter(function(id) { return id !== st.id; }) : cur.concat([st.id]); setGroupes(n2); }} style={{ padding: "0px 5px", fontSize: 8, fontWeight: 700, borderRadius: 3, cursor: "pointer", fontFamily: FONT_B, border: "1px solid " + (inG ? cc(g, dark) + "55" : th.border), background: inG ? cc(g, dark) + "22" : "transparent", color: inG ? cc(g, dark) : th.textDim }}>{g.label}</button>;
                  })}
                  <button onClick={function() { askConfirm((st.prenom + " " + st.nom).trim() || "cet \u00E9l\u00E8ve", function() { setStudents(students.filter(function(_, j) { return j !== idx; })); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                </div>
              ); })}
            </div>
            <button onClick={function() { setStudents(students.concat([{ id: uid(), nom: "", prenom: "" }])); }} style={{ marginTop: 4, background: "none", border: "1px dashed " + th.border, color: th.textMuted, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontFamily: FONT_B, width: "100%" }}>+ Eleve</button>
          </div>
        </div>}

        {/* ═══ CORRECTION ═══ */}
        {mode === "correct" && exam && students.length > 0 && <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 80 }}>
          {/* Search overlay */}
          {showSearch && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 150, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }} onClick={function() { setShowSearch(false); setSearchTerm(""); }}>
            <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={function(e) { e.stopPropagation(); }}>
              <input ref={searchInputRef} value={searchTerm} onChange={function(e) { setSearchTerm(e.target.value); }} placeholder="Chercher un \u00E9l\u00E8ve\u2026" style={{ background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "10px 12px", fontSize: 15, fontFamily: FONT_B, outline: "none", width: "100%", marginBottom: 6, boxSizing: "border-box" }} />
              {searchResults.map(function(o) { return (
                <button key={o.st.id} onClick={function() { setSi(o.idx); setEi(0); setShowSearch(false); setSearchTerm(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginBottom: 2, borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 14, textAlign: "left", background: o.idx === si ? th.accentBg : "transparent", border: "1px solid " + (o.idx === si ? th.accent + "30" : th.border), color: th.text }}>
                  <span style={{ fontWeight: 600 }}>{o.st.prenom}</span> <span style={{ fontVariant: "small-caps" }}>{o.st.nom}</span>
                  {absents[o.st.id] && <span style={{ fontSize: 10, color: th.danger, marginLeft: "auto" }}>absent</span>}
                </button>); })}
              {searchTerm.trim().length > 0 && searchResults.length === 0 && <div style={{ padding: 10, textAlign: "center", color: th.textDim, fontSize: 13 }}>Aucun r\u00E9sultat</div>}
            </div>
          </div>}

          {/* Student card */}
          <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: "14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: th.shadow, overflow: "hidden" }}>
            <div onClick={function() { if (si > 0) { setSi(si - 1); setEi(0); } }} style={{ fontSize: 18, color: si === 0 ? th.textDim : th.textMuted, cursor: "pointer", padding: "0 4px", userSelect: "none" }}>{"\u25C2"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT }}>{s.prenom} <span style={{ fontVariant: "small-caps", letterSpacing: "0.5px" }}>{s.nom}</span></div>
                <button onClick={function() { setShowSearch(true); }} style={{ background: "none", border: "1px solid " + th.border, borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10, color: th.textDim, fontFamily: FONT_B }}>{"\uD83D\uDD0D"}</button>
              </div>
              <div style={{ fontSize: 13, color: th.textMuted, fontFamily: FONT_B, marginTop: 2 }}>
                {"Rang "}<b style={{ color: th.accent }}>{rang}</b>{"/" + presents.length}
                {(groupes.tt || []).indexOf(s.id) >= 0 && <span style={{ color: th.warning, marginLeft: 6 }}>{"\u23F1 TT"}</span>}
              </div>
            </div>
            <RadarChart compValues={cpVals} exAbsValues={eAbsVals} exRelValues={eRelVals} size={105} dark={dark} />
            <div style={{ textAlign: "right", minWidth: 70 }}>
              <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: th.success }}>{curNote.toFixed(1)}<span style={{ fontSize: 11, color: th.textDim }}>/20</span></div>
              {isNorm && <div style={{ fontFamily: MONO, fontSize: 11, color: th.textDim }}>{"brut " + curBrut.toFixed(1)}</div>}
              <div style={{ fontFamily: MONO, fontSize: 12, color: th.textDim }}>{stuTot + "/" + et + " pts"}</div>
            </div>
            <div onClick={function() { if (si < students.length - 1) { setSi(si + 1); setEi(0); } }} style={{ fontSize: 18, color: si === students.length - 1 ? th.textDim : th.textMuted, cursor: "pointer", padding: "0 4px", userSelect: "none" }}>{"\u25B8"}</div>
          </div>

          {/* Competences */}
          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            {COMPETENCES.map(function(c) { return (
              <div key={c.id} style={{ flex: 1, padding: "5px", borderRadius: th.radiusSm, border: "2px solid " + cc(c, dark), background: cc(c, dark) + "08", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: th.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: FONT_B }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: cc(c, dark), fontFamily: MONO }}>{cnVals[c.id]}</div>
              </div>); })}
            <button onClick={function() { setAbsents(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[s.id] = !p[s.id]; return n; }); }} style={{ padding: "4px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 600, background: absents[s.id] ? th.dangerBg : th.surface, border: "1px solid " + (absents[s.id] ? th.danger + "40" : th.border), color: absents[s.id] ? th.danger : th.textMuted }}>
              {absents[s.id] ? "\u2717 Abs." : "Abs.?"}
            </button>
          </div>

          {/* Malus */}
          {showMalusBar && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: th.radiusSm, background: hasMalus ? th.dangerBg : th.surface, border: "1px solid " + (hasMalus ? th.danger + "30" : th.border) }}>
            <span style={{ fontSize: 11, fontFamily: FONT_B, color: hasMalus ? th.danger : th.textMuted }}>
              {remCount + " remarque" + (remCount > 1 ? "s" : "")}
              {autoMalusVal > 0 && <span style={{ fontWeight: 700 }}>{" malus " + autoMalusVal + "%"}</span>}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>Manuel :</span>
            <input type="number" min="0" max="100" step="1" value={manMalus}
              onChange={function(e) { var v = Math.max(0, +e.target.value || 0); setMalusManuel(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[s.id] = v; return n; }); }}
              style={{ background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, width: 40, textAlign: "center", fontFamily: MONO, fontSize: 11, padding: "2px 4px", outline: "none" }} />
            <span style={{ fontSize: 10, color: th.textDim }}>%</span>
            {totalMalusVal > 0 && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: MONO, color: th.danger }}>{"Total: -" + totalMalusVal + "%"}</span>}
          </div>}

          {/* Commentaire libre */}
          {!absents[s.id] && <div style={{ marginBottom: 8 }}>
            <textarea
              value={commentaires[s.id] || ""}
              onChange={function(e) {
                var v = e.target.value;
                setCommentaires(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[s.id] = v; return n; });
              }}
              placeholder={"Commentaire pour " + s.prenom + "\u2026"}
              rows={2}
              style={{ width: "100%", background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: th.radiusSm, padding: "7px 10px", fontSize: 12, fontFamily: FONT_B, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
            />
          </div>}

          {/* Exercise tabs */}
          <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
            {exam.exercises.map(function(x, i) {
              var sc = exerciseScore(grades, s.id, x);
              var xt = x.questions.reduce(function(ss, q) { return ss + q.items.reduce(function(si2, it) { return si2 + (+it.points || 0); }, 0); }, 0);
              return (
                <button key={x.id} onClick={function() { setEi(i); }} style={{ flex: 1, padding: "6px 3px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 600, background: i === ei ? th.accent + "15" : "transparent", border: "1.5px solid " + (i === ei ? th.accent + "50" : th.border), color: i === ei ? th.accent : th.textMuted }}>
                  <div>{x.title.length > 20 ? x.title.slice(0, 18) + "\u2026" : x.title}</div>
                  <div style={{ fontSize: 9, fontFamily: MONO, opacity: 0.7 }}>{sc.earned + "/" + xt}</div>
                </button>); })}
          </div>

          {/* Questions */}
          {!absents[s.id] && exCur && exCur.questions.map(function(q) {
            var sc = questionScore(grades, s.id, q);
            var qr = remarks[rkk(s.id, q.id)] || [];
            return (
              <div key={q.id} style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, marginBottom: 6, overflow: "hidden", boxShadow: th.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderBottom: "1px solid " + th.border, background: th.surface }}>
                  <span style={{ fontWeight: 700, fontSize: 13, fontFamily: FONT }}>{"Q. " + q.label}</span>
                  {q.bonus && <span title="Question bonus" style={{ fontSize: 10, padding: "0 4px", borderRadius: 6, border: "1px solid " + th.warning + "55", background: th.warningBg, color: th.warning }}>{"\uD83C\uDF81 bonus"}</span>}
                  {q.competences.map(function(cid) { var c = COMPETENCES.find(function(x) { return x.id === cid; }); return c ? <span key={c.id} style={{ fontSize: 8, fontWeight: 700, padding: "0 4px", borderRadius: 6, border: "1.5px solid " + cc(c, dark), color: cc(c, dark), fontFamily: MONO }}>{c.short}</span> : null; })}
                  <div style={{ flex: 1 }} />
                  <AudioRecorder
                    nomDS={examNomDS}
                    studentNom={s.nom}
                    exTitle={exCur ? exCur.title : ""}
                    qLabel={q.label}
                    th={th}
                    FONT_B={FONT_B}
                    MONO={MONO}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: sc.earned === sc.total ? th.success : sc.earned > 0 ? th.warning : th.textDim }}>{sc.earned + "/" + sc.total}</span>
                </div>
                <div style={{ padding: 6 }}>
                  {q.items.map(function(it) {
                    var ch = !!grades[gk(s.id, it.id)];
                    return (
                      <button key={it.id} onClick={function() { setGrades(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[gk(s.id, it.id)] = !p[gk(s.id, it.id)]; return n; }); }} style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 8, width: "100%", padding: isMobile ? "14px 12px" : "11px 10px", marginBottom: 2, borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 15 : 13, textAlign: "left", background: ch ? th.success + "0a" : "transparent", border: "1.5px solid " + (ch ? th.success + "35" : th.border), color: ch ? th.text : th.textMuted, WebkitTapHighlightColor: "transparent" }}>
                        <div style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 13, fontWeight: 800, background: ch ? th.success : "transparent", border: "2px solid " + (ch ? th.success : th.textDim), color: ch ? (dark ? "#1a1814" : "#fff") : "transparent", flexShrink: 0 }}>{"\u2713"}</div>
                        <span style={{ flex: 1, fontWeight: 500 }}>{it.label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: ch ? th.success : th.textDim }}>{it.points}</span>
                      </button>); })}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                    {allRemarques.map(function(rem) {
                      var act = qr.indexOf(rem.id) >= 0;
                      return <button key={rem.id} onClick={function() { setRemarks(function(p) { var k = rkk(s.id, q.id); var c = p[k] || []; var n = {}; for (var kk in p) n[kk] = p[kk]; n[k] = c.indexOf(rem.id) >= 0 ? c.filter(function(r) { return r !== rem.id; }) : c.concat([rem.id]); return n; }); }} style={{ padding: isMobile ? "8px 12px" : "5px 9px", borderRadius: 14, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 12 : 10, fontWeight: 600, background: act ? th.warningBg : "transparent", border: "1px solid " + (act ? th.warning + "40" : th.border), color: act ? th.warning : th.textMuted }}>{rem.icon + " " + rem.label}</button>; })}
                  </div>
                  {/* Case "traitée" — visible seulement si aucun item n'est coché */}
                  {sc.earned === 0 && (
                    <button
                      onClick={function() {
                        var key = treatedKey(s.id, q.id);
                        setGrades(function(g) {
                          var ng = Object.assign({}, g);
                          if (ng[key]) delete ng[key]; else ng[key] = true;
                          return ng;
                        });
                      }}
                      style={{
                        marginTop: 4,
                        padding: "2px 8px",
                        fontSize: 9,
                        borderRadius: 3,
                        cursor: "pointer",
                        border: "1px solid " + (grades[treatedKey(s.id, q.id)] ? th.warning + "66" : th.border),
                        background: grades[treatedKey(s.id, q.id)] ? th.warning + "22" : "transparent",
                        color: grades[treatedKey(s.id, q.id)] ? th.warning : th.textDim,
                        fontFamily: FONT_B,
                        fontWeight: 600,
                      }}
                    >
                      {grades[treatedKey(s.id, q.id)] ? "✓ traitée (0 pt)" : "marquer traitée"}
                    </button>
                  )}

                </div>
              </div>); })}

          

          {/* Bottom nav — navigation par exercice avec wrap vers élève suivant/précédent */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, position: "sticky", bottom: isMobile ? 64 : 8 }}>
            <button onClick={function() {
              if (ei > 0) {
                setEi(ei - 1);
              } else if (si > 0) {
                setSi(si - 1);
                setEi(exam.exercises.length - 1);
              }
            }} style={{ flex: 1, padding: isMobile ? "16px" : "14px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 14 : 13, fontWeight: 700, background: th.card, border: "1px solid " + th.border, color: (si === 0 && ei === 0) ? th.textDim : th.text, boxShadow: th.shadow }}>{"◄ Ex. pr\u00E9c."}</button>
            <button onClick={function() {
              if (ei < exam.exercises.length - 1) {
                setEi(ei + 1);
              } else if (si < students.length - 1) {
                setSi(si + 1);
                setEi(0);
              }
            }} style={{ flex: 1, padding: isMobile ? "16px" : "14px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 14 : 13, fontWeight: 700, background: th.accent, border: "none", color: "#fff", boxShadow: th.shadow }}>{"Ex. suiv. \u25BA"}</button>
          </div>
        </div>}



        {/* ═══ RÉSULTATS INDIVIDUELS ═══ */}
        {mode === "resultats" && (function() {
          if (!exam) return <div style={{ textAlign: "center", padding: 40, color: th.textMuted }}>{"Créez d'abord un devoir dans l'onglet Préparation."}</div>;
          if (!corriges.length) return <div style={{ textAlign: "center", padding: 40, color: th.textMuted }}>{"Aucune copie corrigée pour l'instant."}</div>;

          var htmlStudent = htmlStudentForPreview;
          if (!htmlStudent) return null;

          return (
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", gap: 0 }}>
              {/* Barre de sélection */}
              <div style={{ background: th.card, borderBottom: "1px solid " + th.border, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B }}>{"Élève"}</span>
                <select
                  value={htmlStudent.id}
                  onChange={function(e) { setHtmlStudentId(e.target.value); }}
                  style={{ ...inp, fontSize: 13, padding: "5px 10px", minWidth: 200 }}>
                  {corriges.slice().sort(function(a, b) { return a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom); }).map(function(s) {
                    return <option key={s.id} value={s.id}>{s.nom + " " + s.prenom}</option>;
                  })}
                </select>
                <span style={{ fontSize: 11, color: th.textDim, fontFamily: MONO }}>
                  {fmt1(getNote20(htmlStudent.id)) + "/20 · rang " + (htmlRankMapForPreview[htmlStudent.id] || "—") + "/" + corriges.length}
                </span>
                <div style={{ flex: 1 }} />
              </div>
              {/* Iframe d'aperçu — htmlSrc est mémoïsé, pas de rechargement parasite */}
              <iframe
                srcDoc={htmlSrc}
                style={{ flex: 1, border: "none", width: "100%", background: htmlConfig.theme === "dark" ? "#1a1814" : htmlConfig.theme === "young" ? "#f0f4ff" : "#faf7f2" }}
                title={"Aperçu rapport " + htmlStudent.prenom + " " + htmlStudent.nom}
              />
            </div>
          );
        })()}

        {/* ═══ STATS ═══ */}
        {mode === "stats" && exam && <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            {statGroups.length > 1 && statGroups.map(function(g) { return (
              <button key={g.id} onClick={function() { setStatGroup(g.id); }} style={{ padding: "4px 10px", borderRadius: 12, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 700, background: statGroup === g.id ? th.accent + "18" : "transparent", border: "1px solid " + (statGroup === g.id ? th.accent + "40" : th.border), color: statGroup === g.id ? th.accent : th.textMuted }}>
                {g.label}
              </button>); })}
            <div style={{ flex: 1 }} />
            {["general", "exercices", "classement"].map(function(t) { return (
              <button key={t} onClick={function() { setTab(t); }} style={{ padding: "6px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 600, background: tab === t ? th.accent + "18" : "transparent", border: "1px solid " + (tab === t ? th.accent + "40" : th.border), color: tab === t ? th.accent : th.textMuted }}>{t === "general" ? "G\u00E9n\u00E9ral" : t === "exercices" ? "Exercices" : "Classement"}</button>); })}
          </div>

          {tab === "general" && <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 8 }}>
            {[{ l: "Moy", v: statMoy, c: th.accent }, { l: "Méd", v: statMed, c: th.violet }, { l: "Min", v: statMin, c: th.danger }, { l: "Max", v: statMax, c: th.success }, { l: "σ", v: statSigma, c: th.textMuted }].map(function(x) { return (
                <div key={x.l} style={{ background: th.card, borderRadius: th.radiusSm, border: "1px solid " + th.border, padding: "7px 5px", textAlign: "center", boxShadow: th.shadow }}>
                  <div style={{ fontSize: 9, color: th.textMuted, fontFamily: FONT_B }}>{x.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: MONO, color: x.c }}>{x.v.toFixed(1)}<span style={{ fontSize: 9, color: th.textDim }}>/20</span></div>
                </div>); })}
            </div>
            <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, marginBottom: 8, boxShadow: th.shadow }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>{"Distribution /20" + (isNorm ? " (norm.)" : "")}</div>
              <Histo bins={Array.from({ length: 21 }, function(_, i) {
                return { note: i, count: statNotes.filter(function(nn) { return Math.min(20, Math.floor(nn)) === i; }).length };
              })} colorFn={function(nn) { return nn < 8 ? th.danger + "aa" : nn < 12 ? th.warning + "aa" : th.success + "aa"; }} th={th}
                moyLine={statMoy} medLine={statMed} />
            </div>
            <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, boxShadow: th.shadow }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>{"Comp\u00E9tences"}</div>
              {COMPETENCES.map(function(c) {
                var tp = 0, ep = 0;
                exam.exercises.forEach(function(ex) { ex.questions.forEach(function(q) { if (q.competences.indexOf(c.id) < 0) return; q.items.forEach(function(it) { var pts = +it.points || 0; tp += pts * filteredCorriges.length; filteredCorriges.forEach(function(ss) { if (grades[ss.id + "__" + it.id]) ep += pts; }); }); }); });
                var pct = tp > 0 ? (ep / tp) * 100 : 0;
                return (
                  <div key={c.id} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2, fontFamily: FONT_B }}>
                      <span style={{ color: cc(c, dark), fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontFamily: MONO, color: th.textMuted }}>{pct.toFixed(0) + "%"}</span>
                    </div>
                    <PBar value={pct} max={100} color={cc(c, dark)} th={th} />
                  </div>); })}
            </div>
          </div>}
          {tab === "exercices" && exam.exercises.map((exx, i) => {
            const exT = exx.questions.reduce((s, q) =>
              s + (q.items || []).reduce((si2, it) => si2 + (parseFloat(it.points) || 0), 0), 0);
            const enotes = filteredCorriges
              .map(s => exerciseScore(grades, s.id, exx).earned)
              .sort((a, b) => a - b);
            const copies = filteredCorriges.filter(s =>
              exx.questions.some(q =>
                !!grades[treatedKey(s.id, q.id)] ||
                (q.items || []).some(it => grades[gk(s.id, it.id)])
              )
            ).length;
            const emoy = enotes.length ? enotes.reduce((a, b) => a + b, 0) / enotes.length : 0;
            const bins = Array.from({ length: Math.ceil(exT) + 1 }, (_, j) => ({ note: j, count: 0 }));
            filteredCorriges.forEach(s => {
              const sc = exerciseScore(grades, s.id, exx).earned;
              bins[Math.min(bins.length - 1, Math.floor(sc))].count++;
            });
            const qStats = exx.questions.map(q => {
              const tot = (q.items || []).reduce((s, it) => s + (parseFloat(it.points) || 0), 0);
              let nb = 0, obt = 0;
              for (const ss of filteredCorriges) {
                const qTraitee = !!grades[treatedKey(ss.id, q.id)]
                  || (q.items || []).some(it => grades[gk(ss.id, it.id)]);
                if (qTraitee) {
                  nb++;
                  for (const it of (q.items || []))
                    if (grades[gk(ss.id, it.id)]) obt += parseFloat(it.points) || 0;
                }
              }
              const n = filteredCorriges.length;
              return {
                q, tot, nb,
                tauxTraitement: n > 0 ? (nb / n) * 100 : 0,
                tauxReussite:   nb > 0 && tot > 0 ? (obt / (nb * tot)) * 100 : 0,
                diff: nb > 0 && (obt / (nb * tot)) * 100 < seuilDifficile,
              };
            });
            return (
              <div key={exx.id} style={{ background: th.card, borderRadius: th.radius, border: `1px solid ${th.border}`, padding: 12, marginBottom: 8, boxShadow: th.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT }}>{exx.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: th.textMuted }}>{"/" + exT}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>{copies + " copies"}</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 11, fontFamily: FONT_B }}>
                  <span>Moy: <b style={{ fontFamily: MONO, color: th.accent }}>{emoy.toFixed(1)}</b></span>
                  <span>Min: <b style={{ fontFamily: MONO, color: th.danger }}>{enotes[0] != null ? enotes[0].toFixed(1) : "—"}</b></span>
                  <span>Max: <b style={{ fontFamily: MONO, color: th.success }}>{enotes[enotes.length - 1] != null ? enotes[enotes.length - 1].toFixed(1) : "—"}</b></span>
                </div>
                <Histo bins={bins} th={th} />
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 16, fontSize: 9, fontWeight: 600,
                      color: th.textMuted, marginBottom: 3, fontFamily: FONT_B }}>
                    <span style={{ minWidth: 28 }}></span>
                    <span style={{ flex: 1 }}>Traitement (% classe)</span>
                    <span style={{ flex: 1 }}>Réussite (parmi traités)</span>
                  </div>
                  {qStats.map((qs, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <span style={{ fontWeight: qs.diff ? 700 : 500, fontSize: 10, minWidth: 28,
                          color: qs.diff ? th.danger : th.text, fontFamily: FONT_B }}>
                        {"Q." + qs.q.label}
                      </span>
                      {/* Barre traitement — rouge si question difficile */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}>
                        <PBar value={qs.tauxTraitement} max={100}
                          color={qs.diff ? th.danger : th.textMuted} h={5} th={th} />
                        <span style={{ fontFamily: MONO, fontSize: 9,
                            color: qs.diff ? th.danger : th.textMuted, minWidth: 26, textAlign: "right" }}>
                          {qs.tauxTraitement.toFixed(0) + "%"}
                        </span>
                      </div>
                      {/* Barre réussite — colorée selon le score */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}>
                        <PBar value={qs.tauxReussite} max={100}
                          color={qs.tauxReussite < 33 ? th.danger : qs.tauxReussite < 66 ? th.warning : th.success}
                          h={5} th={th} />
                        <span style={{ fontFamily: MONO, fontSize: 9, color: th.textMuted,
                            minWidth: 26, textAlign: "right" }}>
                          {qs.tauxReussite.toFixed(0) + "%"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}


        {tab === "classement" && (function() {
          var withNotes = filteredCorriges.map(function(ss) { return { student: ss, note20: getNote20(ss.id) }; });
          var byNote = withNotes.slice().sort(function(a, b) { return b.note20 - a.note20; });
          var rangMap2 = {}; var rr = 1;
          byNote.forEach(function(r, i) { if (i > 0 && r.note20 < byNote[i-1].note20) rr = i + 1; rangMap2[r.student.id] = rr; });
          var sorted = withNotes.slice().sort(csortMode === "alpha"
            ? function(a, b) { var na = (a.student.nom + a.student.prenom).toLowerCase(); var nb = (b.student.nom + b.student.prenom).toLowerCase(); return na < nb ? -1 : na > nb ? 1 : 0; }
            : function(a, b) { return b.note20 - a.note20; });
          return (
            <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, boxShadow: th.shadow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT, flex: 1 }}>{"Classement (" + filteredCorriges.length + " \u00E9l.)"}</div>
                {["rang", "alpha"].map(function(m) { return (
                  <button key={m} onClick={function() { setCsortMode(m); }}
                    style={{ padding: "3px 9px", borderRadius: 10, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 600, background: csortMode === m ? th.accent + "18" : "transparent", border: "1px solid " + (csortMode === m ? th.accent + "40" : th.border), color: csortMode === m ? th.accent : th.textMuted }}>
                    {m === "rang" ? "Par rang" : "A \u2192 Z"}
                  </button>); })}
              </div>
              {sorted.map(function(r, i) {
                var rang2 = rangMap2[r.student.id];
                var cn2 = notesParCompetence(grades, r.student.id, exam, seuils);
                var exVals = exam.exercises.map(function(ex) { var s = exerciseScore(grades, r.student.id, ex); return s.total > 0 ? s.earned / s.total : 0; });
                return (
                  <div key={r.student.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 2px", borderBottom: i < sorted.length - 1 ? "1px solid " + th.border : "none" }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: th.textDim, minWidth: 18, textAlign: "right" }}>{rang2}</span>
                    <MiniRadarEx values={exVals} size={30} dark={dark} />
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, fontFamily: FONT_B }}>{r.student.prenom} <span style={{ fontVariant: "small-caps" }}>{r.student.nom}</span></span>
                    <div style={{ display: "flex", gap: 1 }}>
                      {COMPETENCES.map(function(c) { return <span key={c.id} style={{ fontSize: 7, fontWeight: 700, padding: "0 3px", borderRadius: 2, background: cc(c, dark) + "15", color: cc(c, dark), fontFamily: MONO }}>{cn2[c.id]}</span>; })}
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: "right", color: r.note20 < 8 ? th.danger : r.note20 < 12 ? th.warning : th.success }}>{r.note20.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
        </div>}

        {/* ═══ AIDE ═══ */}
        {mode === "aide" && <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: th.text, marginBottom: 4 }}>{"Guide d'utilisation"}</div>
          <div style={{ fontFamily: FONT_B, fontSize: 12, color: th.textMuted, marginBottom: 20 }}>{"C.H.E.C.K. v\u00A00.72 — Lycée Joffre, MP2I"}</div>

          {[
            {
              titre: "⚙️ Préparation",
              contenu: [
                "Créez un devoir surveillé (DS) via le bouton « + Nouveau devoir ». Donnez-lui un nom et une date directement dans l'en-tête.",
                "Ajoutez des exercices, des questions et des items (critères de notation). Chaque item a un nombre de points. Chaque question est associée à une ou plusieurs compétences (A, N, R, V).",
                "Un exercice peut recevoir un coefficient (champ ×). Une question peut être marquée bonus 🎁 : ses points s'ajoutent au score sans augmenter le maximum.",
                "Importez vos élèves via un fichier CSV (format NOM;Prénom) ou ajoutez-les manuellement. Assignez-les à des groupes (NSI, tiers-temps) si besoin.",
                "Les exercices et questions peuvent être réordonnés avec les boutons ▲/▼.",
              ]
            },
            {
              titre: "✏️ Correction",
              contenu: [
                "Naviguez d'élève en élève avec les flèches ◂/▸ ou par swipe sur tablette. La barre de progression en haut indique l'avancement global.",
                "Cochez les items réussis. Le score se met à jour en temps réel. Si une question a été traitée sans qu'aucun item ne soit coché, utilisez « marquer traitée » pour en tenir compte dans les statistiques.",
                "Ajoutez des remarques de présentation (rédaction, unités, soin…) par question. Les remarques comptant pour le malus déclenchent automatiquement une pénalité sur la note selon les paliers configurés dans Réglages → Calcul.",
                "Un commentaire libre par élève peut être saisi en bas de la fiche — il apparaîtra dans les rapports.",
              ]
            },
            {
              titre: "🧑 Résultats individuels",
              contenu: [
                "Sélectionnez un élève dans le menu déroulant pour afficher un aperçu en temps réel de son rapport HTML.",
                "Le thème du rapport (Clair, Sombre, Jeune) et les blocs affichés se configurent dans Réglages → 📤 Export.",
              ]
            },
            {
              titre: "📊 Stats",
              contenu: [
                "L'onglet Général affiche la distribution des notes, la moyenne, la médiane, le min, le max et l'écart-type.",
                "L'onglet Exercices détaille le taux de traitement et le taux de réussite question par question. Les questions difficiles (traitées par moins de X% de la classe) apparaissent en rouge — ce seuil est réglable dans Réglages → 🎓 Évaluation.",
                "L'onglet Classement liste les élèves par rang ou par ordre alphabétique, avec leurs notes de compétences et un radar par exercice.",
              ]
            },
            {
              titre: "📄 Export",
              contenu: [
                "Section « Pour les élèves » : rapport HTML individuel (distribuable par mail ou ENT, zéro dépendance), ZIP de tous les rapports HTML, rapport LaTeX individuel (.tex), ZIP de tous les .tex avec script de compilation.",
                "Section « Pour l'enseignant » : document LaTeX complet (tous élèves), CSV récapitulatif (colonnes configurables), gabarit LaTeX éditable.",
                "Section « Synthèse multi-DS » : CSV cumulatif de tous les DS de l'année, avec notes brutes, normalisées, rangs et compétences.",
                "La sauvegarde/chargement JSON se fait via les boutons 💾/📂 dans la barre de navigation.",
              ]
            },
            {
              titre: "⚙️ Réglages",
              contenu: [
                "🎓 Évaluation : seuils de compétence (A/B/C/D/NN), seuil de question difficile, seuil de réussite pour le marqueur ✨.",
                "📊 Calcul : méthode de normalisation des notes (6 options), paliers de malus automatique et mode d'application (avant/après normalisation).",
                "✏️ Correction : activer, désactiver, créer et réordonner les remarques de présentation.",
                "📤 Export : colonnes du CSV, thème et blocs des rapports HTML, preset sauvegardable.",
              ]
            },
            {
              titre: "⌨️ Raccourcis clavier (desktop, onglet Correction)",
              contenu: [
                "← / → : exercice précédent / suivant (avec passage automatique à l'élève suivant en fin d'exercices).",
                "1 à 9 : saut direct à l'exercice numéro N.",
                "Les raccourcis sont désactivés si un champ de saisie est actif.",
              ]
            },
          ].map(function(section, i) {
            return (
              <div key={i} style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: "14px 16px", marginBottom: 10, boxShadow: th.shadow }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT, color: th.text, marginBottom: 10 }}>{section.titre}</div>
                {section.contenu.map(function(ligne, j) {
                  return (
                    <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                      <span style={{ color: th.accent, fontSize: 10, marginTop: 3, flexShrink: 0 }}>{"▸"}</span>
                      <span style={{ fontSize: 12, fontFamily: FONT_B, color: th.textMuted, lineHeight: 1.6 }}>{ligne}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>}

        {/* ═══ EXPORT ═══ */}
        {mode === "export" && exam && (function() {
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
                    var currentGab = gabaritTex || genererGabarit(examNomDS, examDateDS);
                    var docs = genererDocumentsIndividuels({
                      gabarit: currentGab, exam: exam, students: students, grades: grades, remarks: remarks, absents: absents,
                      nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
                      seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, getNote20: getNote20,
                      malusPaliers: malusPaliers, malusManuel: malusManuel,
                      commentaires: commentaires, allRemarques: allRemarques,
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
                      var currentGab = gabaritTex || genererGabarit(examNomDS, examDateDS);
                      var docs = genererDocumentsIndividuels({
                        gabarit: currentGab, exam: exam, students: students, grades: grades, remarks: remarks, absents: absents,
                        nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
                        seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, getNote20: getNote20,
                        malusPaliers: malusPaliers, malusManuel: malusManuel,
                        commentaires: commentaires, allRemarques: allRemarques,
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
                    var currentGab = gabaritTex || genererGabarit(examNomDS, examDateDS);
                    var tex = genererDocumentComplet({
                      gabarit: currentGab, exam: exam, students: students, grades: grades, remarks: remarks, absents: absents,
                      nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
                      seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, getNote20: getNote20,
                      malusPaliers: malusPaliers, malusManuel: malusManuel,
                      commentaires: commentaires, allRemarques: allRemarques,
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
                            <button onClick={function() { setGabaritTex(genererGabarit(examNomDS, examDateDS)); }}
                              style={{ fontSize: 10, color: th.textMuted, background: "none", border: "1px solid " + th.border, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: FONT_B }}>
                              {"Réinitialiser"}
                            </button>
                          </div>
                          <textarea
                            value={gabaritTex || genererGabarit(examNomDS, examDateDS)}
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
        })()}
        {mode === "export" && !exam && <div style={{ textAlign: "center", padding: 40, color: th.textMuted }}>{"Créez d'abord un devoir dans l'onglet Préparation."}</div>}

        </main>
        </div>{/* fin div scale */}
      </div>{/* fin div overflow wrapper */}

      {showMore && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={function() { setShowMore(false); }} />}

{/* MODAL À PROPOS */}
{showApropos && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function() { setShowApropos(false); }}>
        <div style={{ background: th.card, borderRadius: 12, border: "1px solid " + th.border, padding: "28px 32px", width: showChangelog ? 580 : 360, maxWidth: "95vw", transition: "width 0.2s", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", textAlign: "center" }} onClick={function(e) { e.stopPropagation(); }}>
          <div style={{ fontSize: 13, fontFamily: MONO, color: th.textDim, marginBottom: 4, letterSpacing: 2 }}>{"v\u00A00.72"}</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FONT, color: th.text, marginBottom: 6 }}>{"C.H.E.C.K."}</div>
          <div style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, lineHeight: 1.6, marginBottom: 20 }}>
            {"Correcteur Hautement Efficace avec Cases à Kocher"}
            <br />
            {"Application de correction de copies et de génération de rapports individuels, conçue pour les enseignants."}
          </div>
          <button onClick={function() {
            if (!changelogText) {
              fetch("/CHANGELOG.md").then(function(r) { return r.text(); }).then(function(t) { setChangelogText(t); }).catch(function() { setChangelogText("_(changelog non disponible)_"); });
            }
            setShowChangelog(!showChangelog);
          }} style={{ width: "100%", padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 700, background: th.accentBg, border: "1px solid " + th.accent + "30", color: th.accent, marginBottom: 8 }}>
            {"📋 Nouveautés récentes"}
          </button>
          {showChangelog && <div style={{ textAlign: "left", background: th.surface, border: "1px solid " + th.border, borderRadius: th.radiusSm, padding: "10px 14px", marginBottom: 8, maxHeight: 260, overflowY: "auto", fontSize: 12, fontFamily: FONT_B, color: th.text, lineHeight: 1.7 }}>
            {changelogText.split("\n").map(function(line, i) {
              var inlineBold = function(s) {
                var parts = s.split(/\*\*(.+?)\*\*/g);
                return parts.map(function(p, j) { return j % 2 === 1 ? <strong key={j}>{p}</strong> : p; });
              };
              if (line.startsWith("## "))  return <div key={i} style={{ fontWeight: 700, fontSize: 13, color: th.text, marginTop: 10, marginBottom: 2 }}>{line.slice(3)}</div>;
              if (line.startsWith("### ")) return <div key={i} style={{ fontWeight: 700, color: th.accent, marginTop: 6, marginBottom: 1 }}>{line.slice(4)}</div>;
              if (line.startsWith("- "))   return <div key={i} style={{ paddingLeft: 12 }}>{"• "}{inlineBold(line.slice(2))}</div>;
              if (line.trim() === "")      return <div key={i} style={{ height: 4 }} />;
              return <div key={i}>{inlineBold(line)}</div>;
            })}
          </div>}
          <button onClick={function() { setShowApropos(false); setMode("aide"); }} style={{ width: "100%", padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 700, background: th.surface, border: "1px solid " + th.border, color: th.textMuted, marginBottom: 8 }}>
            {"ℹ️ Ouvrir le guide d'utilisation"}
          </button>
          <button onClick={function() { setShowApropos(false); }} style={{ width: "100%", padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.accent, border: "none", color: "#fff" }}>
            {"Fermer"}
          </button>
        </div>
      </div>}

      
{/* SETTINGS */}
{showSettings && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function() { setShowSettings(false); }}>
        <div style={{ background: th.card, borderRadius: 12, border: "1px solid " + th.border, padding: 20, width: 440, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={function(e) { e.stopPropagation(); }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, fontFamily: FONT }}>{"\u2699\uFE0F R\u00E9glages"}</h3>

          {/* Onglets */}
          {(function() {
            var tabs = [
              { id: "evaluation", label: "\uD83C\uDF93 \u00C9valuation" },
              { id: "calcul",     label: "\uD83D\uDCCA Calcul" },
              { id: "correction", label: "\u270F\uFE0F Correction" },
              { id: "export",     label: "\uD83D\uDCE4 Export" },
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

          {/* ── Onglet Évaluation ── */}
          {settingsTab === "evaluation" && (function() {
            return (
              <div>
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
              </div>
            );
          })()}

          {/* ── Onglet Calcul ── */}
          {settingsTab === "calcul" && (function() {
            return (
              <div>
                {/* Normalisation */}
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Normalisation</div>
                {[
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
            return (
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
                    saveDB({ exams: exams, students: students, grades: grades, remarks: remarks, absents: absents, groupes: groupes, activeExamId: activeExamId, nomDS: examNomDS, dateDS: examDateDS, seuils: seuils, normMethod: normMethod, normParams: normParams, seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode, malusManuel: malusManuel, uiScale: uiScale, appTheme: appTheme, groupesDef: groupesDef, mode: mode, commentaires: commentaires, remarquesActives: newActives, remarquesCustom: newCustom, remarquesOrdre: remarquesOrdre, settingsTab: settingsTab, csvConfig: csvConfig, htmlPresets: htmlPresets, htmlConfig: htmlConfig,htmlStudentId: htmlStudentId });
                  }} style={{ width: "100%", padding: "5px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 700, background: th.accent, border: "none", color: "#fff" }}>
                    {"Ajouter"}
                  </button>
                </div>
{/* ── Groupes pédagogiques éditables ── */}
<div style={{ marginTop: 18, borderTop: "1px solid " + th.border, paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{"Groupes pédagogiques"}</div>
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
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B, marginBottom: 3 }}>{"Dépôt privé (compte/nom-du-dépôt)"}</div>
                      <input type="text" value={githubRepo} onChange={function(e) { setGithubRepo(e.target.value); localStorage.setItem("check_github_repo", e.target.value); }}
                        placeholder="moncompte/check-sauvegarde"
                        style={{ width: "100%", background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "5px 8px", fontSize: 12, fontFamily: MONO, outline: "none" }} />
                    </div>
                    <div style={{ fontSize: 9, color: th.textDim, fontFamily: FONT_B, lineHeight: 1.5 }}>
                      {"Le PAT et le dépôt sont stockés dans le localStorage de votre navigateur (séparé des données métier). Ils ne sont jamais envoyés à d'autres serveurs qu'api.github.com."}
                    </div>
                  </div>
                </div>}
              </div>
            );
          })()}

          {/* ── Bas du modal : debug + fermer ── */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid " + th.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={function() { setShowDebug(true); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 10, fontFamily: FONT_B, padding: "2px 4px" }}>
              {"🔬 Debug"}
            </button>
            <button onClick={function() { setShowSettings(false); }} style={{ padding: "8px 24px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.accent, border: "none", color: "#fff" }}>
              {"Fermer"}
            </button>
          </div>
        </div>
      </div>}


      {/* DEBUG */}
      {showDebug && (function() {
        var sections = [
          { key: "exams",        label: "exams" },
          { key: "students",     label: "students" },
          { key: "grades",       label: "grades" },
          { key: "remarks",      label: "remarks" },
          { key: "commentaires", label: "commentaires" },
          { key: "absents",      label: "absents" },
          { key: "groupes",      label: "groupes" },
          { key: "malusManuel",  label: "malusManuel" },
        ];
        var fullState = { exams: exams, students: students, grades: grades, remarks: remarks, commentaires: commentaires, absents: absents, groupes: groupes, malusManuel: malusManuel };
        var _debugOpen = {};
        sections.forEach(function(s) { _debugOpen[s.key] = false; });
        return (
          <DebugModal
            sections={sections} fullState={fullState}
            th={th} FONT={FONT} FONT_B={FONT_B} MONO={MONO}
            onClose={function() { setShowDebug(false); }}
          />
        );
      })()}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: th.card, borderTop: "2px solid " + th.headerBorder, display: "flex", padding: "4px 0 4px 0", boxShadow: "0 -2px 8px rgba(0,0,0,0.1)" }}>
        {[{ id: "correct", l: "Correction", ic: "\u270F\uFE0F" }, { id: "stats", l: "Stats", ic: "\uD83D\uDCCA" }].map(function(nn) { return (
          <button key={nn.id} onClick={function() { setMode(nn.id); setShowMore(false); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 4px", cursor: "pointer", fontFamily: FONT_B, background: "transparent", border: "none", color: mode === nn.id ? th.accent : th.textMuted, fontSize: 18 }}>
            <span>{nn.ic}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{nn.l}</span>
          </button>); })}
      </nav>}
    </div>
  );
}