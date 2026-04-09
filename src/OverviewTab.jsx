// ═══════════════════════════════════════════════════════════════════
// OverviewTab — Vue d'ensemble du DS (Session R)
// ═══════════════════════════════════════════════════════════════════
//
// Tableau élèves × questions (ou items) avec code couleur de réussite.
// Aucune persistance : tout l'état est éphémère.
//
// Props :
//   exam          — objet DS actif
//   students      — tableau de tous les élèves
//   grades        — objet { "studentId__itemId": true }
//   absents       — objet { "studentId": true }
//   th, FONT, FONT_B, MONO
//   onNavigate(studentIndex, exerciseIndex) — callback vers Correction
//
// Usage dans App.jsx :
//   {mode === "overview" && exam && (
//     <OverviewTab
//       exam={exam} students={students} grades={grades} absents={absents}
//       th={th} FONT={FONT} FONT_B={FONT_B} MONO={MONO}
//       onNavigate={function(si, ei) { setSi(si); setEi(ei); setMode("correct"); }}
//     />
//   )}
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef } from "react";

// ── Fonctions utilitaires locales ────────────────────────────────

// Clé de note d'un item
function gk(studentId, itemId) { return studentId + "__" + itemId; }

// Clé de case "traitée 0 pt"
function treatedKey(studentId, questionId) { return "treated_" + studentId + "_" + questionId; }

// Points obtenus par un étudiant sur une question
function questionObtenu(grades, studentId, question) {
  return (question.items || []).reduce(function(s, it) {
    return s + (grades[gk(studentId, it.id)] ? (parseFloat(it.points) || 0) : 0);
  }, 0);
}

// Points max d'une question (hors bonus — on les inclut quand même ici)
function questionMax(question) {
  return (question.items || []).reduce(function(s, it) {
    return s + (parseFloat(it.points) || 0);
  }, 0);
}

// Points obtenus par un étudiant sur un item
function itemObtenu(grades, studentId, item) {
  return grades[gk(studentId, item.id)] ? (parseFloat(item.points) || 0) : 0;
}

// Couleur de cellule selon ratio (0..1)
function cellColor(ratio, th) {
  if (ratio >= 0.75) return th.success;
  if (ratio >= 0.50) return th.warning;
  return th.danger;
}

// ── Composant principal ──────────────────────────────────────────

function OverviewTab({ exam, students, grades, absents, th, FONT, FONT_B, MONO, onNavigate }) {
  // États éphémères locaux
  var _granularity = useState("question");
  var granularity = _granularity[0]; var setGranularity = _granularity[1];

  var _sort = useState({ col: null, dir: "none" });
  var sort = _sort[0]; var setSort = _sort[1];

  // Refs pour scroll vers exercice
  var exRefs = useRef({});

  // Élèves présents uniquement
  var presents = students.filter(function(s) { return !absents[s.id]; });

  if (!presents.length) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: th.textMuted, fontFamily: FONT_B }}>
        {"Aucun élève présent à corriger."}
      </div>
    );
  }

  // ── Colonnes selon granularité ───────────────────────────────
  // cols = [{ id, label, exIdx, qIdx, itemIdx?, questionId, max, type }]
  var cols = [];
  exam.exercises.forEach(function(ex, exIdx) {
    ex.questions.forEach(function(q, qIdx) {
      if (granularity === "question") {
        cols.push({
          id: "q_" + q.id,
          label: "Q." + q.label + (q.bonus ? " 🎁" : ""),
          exIdx: exIdx,
          qIdx: qIdx,
          questionId: q.id,
          question: q,
          max: questionMax(q),
          type: "question",
        });
      } else {
        (q.items || []).forEach(function(it, iIdx) {
          cols.push({
            id: "i_" + it.id,
            label: (it.label || "item") + " (" + (parseFloat(it.points) || 0) + "pt)",
            exIdx: exIdx,
            qIdx: qIdx,
            questionId: q.id,
            question: q,
            item: it,
            max: parseFloat(it.points) || 0,
            type: "item",
          });
        });
      }
    });
  });

  // ── Calcul des données par élève ─────────────────────────────
  function getColValue(studentId, col) {
    if (col.type === "question") {
      return questionObtenu(grades, studentId, col.question);
    } else {
      return itemObtenu(grades, studentId, col.item);
    }
  }

  function getStudentTotal(studentId) {
    var total = 0;
    exam.exercises.forEach(function(ex) {
      ex.questions.forEach(function(q) {
        total += questionObtenu(grades, studentId, q);
      });
    });
    return total;
  }

  function getExamMax() {
    var max = 0;
    exam.exercises.forEach(function(ex) {
      ex.questions.forEach(function(q) {
        if (!q.bonus) max += questionMax(q);
      });
    });
    return max;
  }

  var examMax = getExamMax();

  // ── Tri ──────────────────────────────────────────────────────
  function handleColClick(colId) {
    setSort(function(prev) {
      if (prev.col !== colId) return { col: colId, dir: "desc" };
      if (prev.dir === "desc") return { col: colId, dir: "asc" };
      return { col: null, dir: "none" };
    });
  }

  function handleNomClick() {
    setSort(function(prev) {
      if (prev.col !== "nom") return { col: "nom", dir: "asc" };
      if (prev.dir === "asc") return { col: "nom", dir: "desc" };
      return { col: null, dir: "none" };
    });
  }

  var sortedStudents = presents.slice().sort(function(a, b) {
    if (sort.col === null || sort.dir === "none") {
      // Tri alphabétique par défaut
      var na = (a.nom + a.prenom).toLowerCase();
      var nb = (b.nom + b.prenom).toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    }
    if (sort.col === "nom") {
      var na2 = (a.nom + a.prenom).toLowerCase();
      var nb2 = (b.nom + b.prenom).toLowerCase();
      return sort.dir === "asc" ? (na2 < nb2 ? -1 : 1) : (na2 > nb2 ? -1 : 1);
    }
    // Tri par colonne question/item
    var col = cols.find(function(c) { return c.id === sort.col; });
    if (!col) return 0;
    var va = col.max > 0 ? getColValue(a.id, col) / col.max : 0;
    var vb = col.max > 0 ? getColValue(b.id, col) / col.max : 0;
    return sort.dir === "desc" ? vb - va : va - vb;
  });

  // ── Groupement des colonnes par exercice ─────────────────────
  // Pour l'en-tête fusionné niveau 1
  var exGroups = exam.exercises.map(function(ex, exIdx) {
    var exCols = cols.filter(function(c) { return c.exIdx === exIdx; });
    return { ex: ex, exIdx: exIdx, count: exCols.length };
  });

  // ── Scroll vers un exercice ───────────────────────────────────
  function scrollToEx(exIdx) {
    var el = exRefs.current[exIdx];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  // ── Styles communs ─────────────────────────────────────────────
  var thBase = {
    padding: "5px 8px",
    fontFamily: FONT_B,
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
    userSelect: "none",
    borderBottom: "2px solid " + th.border,
    background: th.surface,
    color: th.textMuted,
    position: "sticky",
    top: 0,
    zIndex: 3,
  };

  var tdBase = {
    padding: "4px 6px",
    fontFamily: MONO,
    fontSize: 11,
    textAlign: "center",
    borderBottom: "1px solid " + th.border + "44",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };

  var sortArrow = function(colId) {
    if (sort.col !== colId) return " ↕";
    return sort.dir === "desc" ? " ↓" : " ↑";
  };

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>

      {/* ── Barre de contrôles ─────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        marginBottom: 10, padding: "10px 14px",
        background: th.card, borderRadius: th.radius, border: "1px solid " + th.border,
        boxShadow: th.shadow,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT, flex: 1 }}>
          {"📋 Vue d'ensemble — " + (exam.nomDS || exam.name || "DS")}
        </span>

        {/* Toggle granularité */}
        <div style={{ display: "flex", gap: 2 }}>
          {[{ v: "question", l: "☰ Questions" }, { v: "item", l: "⊞ Items" }].map(function(g) {
            var active = granularity === g.v;
            return (
              <button key={g.v} onClick={function() { setGranularity(g.v); }}
                style={{
                  padding: "5px 10px", borderRadius: th.radiusSm, cursor: "pointer",
                  fontFamily: FONT_B, fontSize: 11, fontWeight: 600,
                  background: active ? th.accentBg : th.surface,
                  border: "1px solid " + (active ? th.accent + "55" : th.border),
                  color: active ? th.accent : th.textMuted,
                }}>{g.l}</button>
            );
          })}
        </div>

        {/* Légende couleurs */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[
            { label: "≥ 75 %", color: th.success },
            { label: "≥ 50 %", color: th.warning },
            { label: "< 50 %", color: th.danger },
          ].map(function(item) {
            return (
              <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: FONT_B, color: th.textMuted }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: item.color + "33", border: "1px solid " + item.color + "77" }} />
                {item.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Bulles de navigation par exercice ──────────────────── */}
      {exam.exercises.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {exam.exercises.map(function(ex, exIdx) {
            return (
              <button key={ex.id} onClick={function() { scrollToEx(exIdx); }}
                style={{
                  padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                  fontFamily: FONT_B, fontSize: 11, fontWeight: 600,
                  background: th.accentBg, border: "1px solid " + th.accent + "44",
                  color: th.accent,
                }}>
                {ex.title || ("Ex " + (exIdx + 1))}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Tableau ─────────────────────────────────────────────── */}
      <div style={{
        overflowX: "auto",
        background: th.card,
        borderRadius: th.radius,
        border: "1px solid " + th.border,
        boxShadow: th.shadow,
      }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "auto" }}>

          {/* En-tête niveau 1 : exercices (fusionné) */}
          <thead>
            <tr>
              {/* Cellule Nom — sticky */}
              <th rowSpan={2} style={{ ...thBase, textAlign: "left", position: "sticky", left: 0, zIndex: 5, minWidth: 130, borderRight: "2px solid " + th.border, cursor: "pointer" }}
                onClick={handleNomClick}>
                {"Élève" + sortArrow("nom")}
              </th>

              {/* En-têtes exercices */}
              {exGroups.map(function(g) {
                if (g.count === 0) return null;
                return (
                  <th key={g.ex.id}
                    ref={function(el) { exRefs.current[g.exIdx] = el; }}
                    colSpan={g.count}
                    style={{
                      ...thBase,
                      textAlign: "center",
                      borderLeft: "2px solid " + th.border,
                      borderRight: "1px solid " + th.border + "44",
                      color: th.accent,
                      background: th.accentBg,
                      fontSize: 11,
                    }}>
                    {g.ex.title || ("Exercice " + (g.exIdx + 1))}
                  </th>
                );
              })}

              {/* Colonne Total — sticky droite */}
              <th rowSpan={2} style={{ ...thBase, textAlign: "right", position: "sticky", right: 0, zIndex: 5, minWidth: 60, borderLeft: "2px solid " + th.border }}>
                {"Total"}
              </th>
            </tr>

            {/* En-tête niveau 2 : questions (ou items) */}
            <tr>
              {cols.map(function(col, idx) {
                // Séparateur à gauche si première colonne d'un exercice
                var isFirstOfEx = idx === 0 || cols[idx - 1].exIdx !== col.exIdx;
                var active = sort.col === col.id;
                return (
                  <th key={col.id}
                    onClick={function() { handleColClick(col.id); }}
                    style={{
                      ...thBase,
                      textAlign: "center",
                      cursor: "pointer",
                      borderLeft: isFirstOfEx ? "2px solid " + th.border : "1px solid " + th.border + "22",
                      background: active ? th.accentBg : th.surface,
                      color: active ? th.accent : th.textMuted,
                      maxWidth: 90,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                    {col.label + sortArrow(col.id)}
                    <div style={{ fontSize: 8, fontWeight: 400, color: th.textDim, fontFamily: MONO }}>
                      {"/" + col.max}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Corps du tableau */}
          <tbody>
            {sortedStudents.map(function(student, rowIdx) {
              var total = getStudentTotal(student.id);
              var totalRatio = examMax > 0 ? total / examMax : 0;
              var totalColor = cellColor(totalRatio, th);

              return (
                <tr key={student.id} style={{ background: rowIdx % 2 === 0 ? "transparent" : th.surface + "55" }}>

                  {/* Nom — sticky gauche */}
                  <td style={{
                    ...tdBase,
                    textAlign: "left",
                    fontFamily: FONT_B,
                    fontSize: 11,
                    fontWeight: 600,
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    background: rowIdx % 2 === 0 ? th.card : th.surface,
                    borderRight: "2px solid " + th.border,
                    cursor: "default",
                    color: th.text,
                    minWidth: 130,
                  }}>
                    {student.prenom + " "}
                    <span style={{ fontVariant: "small-caps" }}>{student.nom}</span>
                  </td>

                  {/* Cellules questions/items */}
                  {cols.map(function(col, idx) {
                    var isFirstOfEx = idx === 0 || cols[idx - 1].exIdx !== col.exIdx;
                    var obtained = getColValue(student.id, col);
                    var ratio = col.max > 0 ? obtained / col.max : 0;

                    // Cas spécial : question traitée à 0 pt (ni items cochés ni non tentée)
                    var treated = !!grades[treatedKey(student.id, col.questionId)];
                    // Si aucun item coché et non traitée → case neutre (non tentée)
                    var anyItemChecked = col.type === "question"
                      ? (col.question.items || []).some(function(it) { return !!grades[gk(student.id, it.id)]; })
                      : !!grades[gk(student.id, col.item.id)];
                    var attempted = anyItemChecked || treated;

                    // Couleur de fond
                    var bg, borderColor, textColor;
                    if (!attempted) {
                      bg = "transparent";
                      borderColor = th.border + "22";
                      textColor = th.textDim;
                    } else {
                      bg = cellColor(ratio, th) + "22";
                      borderColor = cellColor(ratio, th) + "55";
                      textColor = cellColor(ratio, th);
                    }

                    // Index de l'étudiant dans le tableau original (pour navigation)
                    var studentIdx = students.indexOf(student);

                    return (
                      <td key={col.id}
                        onClick={function() {
                          if (onNavigate) onNavigate(studentIdx, col.exIdx);
                        }}
                        title={student.prenom + " " + student.nom + " — " + col.label + " : " + obtained + "/" + col.max}
                        style={{
                          ...tdBase,
                          background: bg,
                          borderLeft: isFirstOfEx ? "2px solid " + th.border : "1px solid " + borderColor,
                          color: textColor,
                          fontWeight: attempted ? 700 : 400,
                          minWidth: 48,
                        }}>
                        {attempted ? obtained : "—"}
                      </td>
                    );
                  })}

                  {/* Total — sticky droite */}
                  <td style={{
                    ...tdBase,
                    textAlign: "right",
                    position: "sticky",
                    right: 0,
                    zIndex: 2,
                    background: rowIdx % 2 === 0 ? th.card : th.surface,
                    borderLeft: "2px solid " + th.border,
                    fontWeight: 700,
                    color: totalColor,
                    cursor: "default",
                    minWidth: 60,
                  }}>
                    {total.toFixed(total % 1 === 0 ? 0 : 1)}
                    <span style={{ fontSize: 9, color: th.textDim, fontWeight: 400 }}>{"/" + examMax}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Note de bas de page ───────────────────────────────────── */}
      <div style={{ fontSize: 10, color: th.textDim, fontFamily: FONT_B, marginTop: 8, textAlign: "right" }}>
        {presents.length + " élèves · clic sur une cellule → Correction"}
      </div>
    </div>
  );
}

export default OverviewTab;
