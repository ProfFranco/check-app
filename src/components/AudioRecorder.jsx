// ═══════════════════════════════════════════════════════════════════
// AudioRecorder — enregistrement audio autonome par question/élève
// ═══════════════════════════════════════════════════════════════════
// Aucune persistance : le fichier vit en mémoire jusqu'au téléchargement.
// Nommage : {nomDS}_{NOM}_{ExTitle}_{QLabel}.{ext}

import { useState, useRef } from "react";
import { buildAudioFilename } from "../utils/helpers";

export default function AudioRecorder({ nomDS, studentNom, exTitle, qLabel, th, FONT_B, MONO }) {
  var _open = useState(false); var open = _open[0]; var setOpen = _open[1];
  var _recording = useState(false); var recording = _recording[0]; var setRecording = _recording[1];
  var _audioUrl = useState(null); var audioUrl = _audioUrl[0]; var setAudioUrl = _audioUrl[1];
  var _audioExt = useState("webm"); var audioExt = _audioExt[0]; var setAudioExt = _audioExt[1];
  var mrRef = useRef(null);
  var chunksRef = useRef([]);
  var streamRef = useRef(null);

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
    var fname = buildAudioFilename(nomDS, studentNom, exTitle, qLabel, audioExt);
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
            <button style={btnS(th.accent, "#fff")} onClick={handleDownload} title={buildAudioFilename(nomDS, studentNom, exTitle, qLabel, audioExt)}>
              {"⬇ " + buildAudioFilename(nomDS, studentNom, exTitle, qLabel, audioExt)}
            </button>
          )}
          <button style={Object.assign({}, btnS(th.surface, th.textMuted), { border: "1px solid " + th.border, marginLeft: "auto" })} onClick={handleClose}>✕</button>
        </div>
      )}
    </span>
  );
}
