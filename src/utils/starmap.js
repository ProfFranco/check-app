// ═══════════════════════════════════════════════════════════════════
// CARTE STELLAIRE — Visualisation canvas d'un DS
// ═══════════════════════════════════════════════════════════════════
// Module autonome : zéro dépendance React ni import externe.
//
// Exports :
//   renderStarMap(canvas, exam, gradesForStudent, classRates, theme, options)
//     → rendu statique, retourne canvas.toDataURL("image/png")
//
//   createAnimatedStarMap(canvas, exam, gradesForStudent, classRates, theme, options)
//     → rendu animé via requestAnimationFrame
//     → retourne { stop, getStars }
//
// Paramètres :
//   canvas           : HTMLCanvasElement 660×460
//   exam             : { exercises: [{ id, title, questions: [{ id, label, competences, items: [{ id, label, points }] }] }] }
//   gradesForStudent : { itemId: true } — filtrés pour un seul élève
//   classRates       : { questionId: 0..1 } — taux de réussite par question
//   theme            : objet thème CHECK (bg, border, accent, success, warning, danger, violet, radius, radiusSm, text, textDim)
//   options          : { varBright = 0.05, jitterSeed = "" }

// ─── PRNG (LCG seedé) ─────────────────────────────────────────────

function hashInt(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}

function lcg(seed) {
  var s = (seed ^ 0xdeadbeef) >>> 0;
  if (s === 0) s = 1;
  return function() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─── Utilitaires couleur ──────────────────────────────────────────

function hexToRgb(hex) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb) {
  return '#' + rgb.map(function(v) {
    return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
  }).join('');
}

// COMP_COLORS : mapping compétence → couleur thème
function COMP_COLORS(theme) {
  return { A: theme.danger, N: theme.accent, R: theme.success, V: theme.warning };
}

// Couleur par exercice (cycle sur 5)
function exColor(theme, ei) {
  return [theme.violet, theme.accent, theme.success, theme.warning, theme.danger][ei % 5];
}

// Couleur d'une étoile selon ses compétences (blend RGB si multi)
function starColor(q, theme) {
  var map = COMP_COLORS(theme);
  var comps = (q.competences || []).filter(function(c) { return map[c]; });
  if (comps.length === 0) return theme.accent;
  if (comps.length === 1) return map[comps[0]];
  var sum = [0, 0, 0];
  comps.forEach(function(c) {
    var rgb = hexToRgb(map[c]);
    sum[0] += rgb[0]; sum[1] += rgb[1]; sum[2] += rgb[2];
  });
  return rgbToHex([sum[0] / comps.length, sum[1] / comps.length, sum[2] / comps.length]);
}

// ─── Union-Find pour Kruskal MST ──────────────────────────────────

function makeUF(n) {
  var parent = [];
  for (var i = 0; i < n; i++) parent[i] = i;
  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(x, y) {
    var px = find(x), py = find(y);
    if (px === py) return false;
    parent[px] = py;
    return true;
  }
  return { find: find, union: union };
}

// ─── Calcul des positions et propriétés des étoiles ───────────────

function computeStars(canvas, exam, gradesForStudent, classRates, theme, options) {
  var jitterSeed = (options && options.jitterSeed != null) ? String(options.jitterSeed) : "";
  var CX = canvas.width / 2;
  var CY = canvas.height / 2;
  var RMAX = Math.min(CX, CY) - 52;
  var N = exam.exercises.length;
  var TWO_PI = Math.PI * 2;

  // Angle de base de chaque exercice
  var EXA = exam.exercises.map(function(_, ei) {
    return (ei / N) * TWO_PI - Math.PI / 2;
  });

  // Max points parmi toutes les questions (pour normaliser le rayon)
  var maxTotalPts = 1;
  exam.exercises.forEach(function(ex) {
    ex.questions.forEach(function(q) {
      var t = q.items.reduce(function(s, it) { return s + (parseFloat(it.points) || 0); }, 0);
      if (t > maxTotalPts) maxTotalPts = t;
    });
  });

  var stars = [];

  exam.exercises.forEach(function(ex, exIdx) {
    var qn = ex.questions.length;
    var spread = (TWO_PI / Math.max(N, 1)) * 0.78;

    ex.questions.forEach(function(q, qIdx) {
      var totalPts = q.items.reduce(function(s, it) { return s + (parseFloat(it.points) || 0); }, 0);
      var pointsObtenus = q.items.reduce(function(s, it) {
        return s + (gradesForStudent[it.id] ? (parseFloat(it.points) || 0) : 0);
      }, 0);
      var lumMax = totalPts > 0 ? pointsObtenus / totalPts : 0;

      // Angle
      var qOff = qn > 1 ? (qIdx / (qn - 1) - 0.5) * spread * 0.72 : 0;
      var jAmt = 0.12;
      var jAngle = lcg(hashInt(jitterSeed + "|" + q.id + "|jangle"))() * 2 * jAmt - jAmt;
      var angle = EXA[exIdx] + qOff + jAngle;

      // Rayon (log sur le poids de la question, jitter reproductible)
      var rBase = RMAX * (0.15 + 0.78 * (totalPts / maxTotalPts));
      var rJit = RMAX * (lcg(hashInt(q.id + "|rjit"))() - 0.5) * 0.22;
      var r = Math.max(RMAX * 0.08, Math.min(RMAX * 0.96, rBase + rJit));

      var x = CX + r * Math.cos(angle);
      var y = CY + r * Math.sin(angle);

      // Taille du noyau (log-scale sur difficulté)
      var rate = (classRates && classRates[q.id] != null) ? classRates[q.id] : 0;
      var diff = 1 - rate;
      var coreR = 3.5 + 9.5 * Math.log(1 + diff * (Math.E - 1));

      // Couleur
      var col = starColor(q, theme);

      // Paramètres d'oscillation seedés sur q.id
      var wRng = lcg(hashInt(q.id + "|wave"));
      var f1 = 2 + wRng() * 2.5;
      var f2 = 0.2 + wRng() * 0.4;
      var f3 = 5 + wRng() * 4;
      var ph1 = wRng() * TWO_PI;
      var ph2 = wRng() * TWO_PI;
      var ph3 = wRng() * TWO_PI;

      stars.push({
        x: x, y: y, coreR: coreR, col: col,
        lumMax: lumMax, totalPts: totalPts, pointsObtenus: pointsObtenus,
        q: q, exIdx: exIdx, qIdx: qIdx,
        exNom: ex.title || ("Ex " + (exIdx + 1)),
        f1: f1, f2: f2, f3: f3, ph1: ph1, ph2: ph2, ph3: ph3,
      });
    });
  });

  return { stars: stars, CX: CX, CY: CY, RMAX: RMAX, N: N, EXA: EXA };
}

// ─── Fond : disque + cercles de référence + axes ──────────────────

function drawBackground(ctx, canvas, theme, CX, CY, RMAX, N, EXA) {
  // Fond teinté
  ctx.fillStyle = theme.bg + "44";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Disque central (15 % opacité ≈ 0x26)
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, RMAX, 0, Math.PI * 2);
  ctx.fillStyle = theme.border + "26";
  ctx.fill();
  ctx.restore();

  // 3 cercles de référence (30 % ≈ 0x4d)
  ctx.save();
  ctx.strokeStyle = theme.border + "4d";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([]);
  [0.33, 0.66, 1.0].forEach(function(f) {
    ctx.beginPath();
    ctx.arc(CX, CY, RMAX * f, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();

  // Axes exercices en pointillés
  ctx.save();
  ctx.strokeStyle = theme.border + "4d";
  ctx.lineWidth = 0.4;
  ctx.setLineDash([4, 6]);
  EXA.forEach(function(angle) {
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + RMAX * Math.cos(angle), CY + RMAX * Math.sin(angle));
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Dessin d'une étoile ──────────────────────────────────────────

function drawStar(ctx, star, lum) {
  var cx = star.x, cy = star.y, coreR = star.coreR, col = star.col;

  // 1. Glow (gradient radial centré sur l'étoile)
  var glowR = coreR * (1 + 2 * lum);
  if (glowR > 0.5) {
    var grad = ctx.createRadialGradient(cx, cy, coreR * 0.25, cx, cy, glowR);
    var alphaHex = ('0' + Math.round(lum * 140).toString(16)).slice(-2);
    grad.addColorStop(0, col + alphaHex);
    grad.addColorStop(1, col + "00");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (star.lumMax < 0.01) {
    // 4. Fantôme : contour seul
    ctx.save();
    ctx.strokeStyle = col + "33";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    // 2. Noyau plein
    ctx.save();
    ctx.globalAlpha = lum;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Reflet spéculaire
    if (lum > 0.38) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255," + ((lum - 0.38) * 0.35).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx - 0.3 * coreR, cy - 0.32 * coreR, 0.27 * coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ─── Constellations MST (Kruskal) ─────────────────────────────────

function drawConstellations(ctx, stars, exam, theme) {
  exam.exercises.forEach(function(ex, ei) {
    // Étoiles de cet exercice ayant au moins 1 item validé
    var exStars = stars.filter(function(st) {
      return st.exIdx === ei && st.pointsObtenus > 0;
    });
    if (exStars.length < 2) return;

    // Toutes les arêtes possibles avec leur distance euclidienne
    var edges = [];
    for (var i = 0; i < exStars.length; i++) {
      for (var j = i + 1; j < exStars.length; j++) {
        var dx = exStars[i].x - exStars[j].x;
        var dy = exStars[i].y - exStars[j].y;
        edges.push({ i: i, j: j, dist: Math.sqrt(dx * dx + dy * dy) });
      }
    }
    edges.sort(function(a, b) { return a.dist - b.dist; });

    // Kruskal : N-1 arêtes pour N nœuds
    var uf = makeUF(exStars.length);
    var mstEdges = [];
    edges.forEach(function(e) {
      if (uf.union(e.i, e.j)) mstEdges.push(e);
    });

    var col = exColor(theme, ei);
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([]);
    mstEdges.forEach(function(e) {
      ctx.beginPath();
      ctx.moveTo(exStars[e.i].x, exStars[e.i].y);
      ctx.lineTo(exStars[e.j].x, exStars[e.j].y);
      ctx.stroke();
    });
    ctx.restore();
  });
}

// ─── Rendu statique ───────────────────────────────────────────────

export function renderStarMap(canvas, exam, gradesForStudent, classRates, theme, options) {
  var ctx = canvas.getContext("2d");
  var data = computeStars(canvas, exam, gradesForStudent, classRates, theme, options);
  var stars = data.stars, CX = data.CX, CY = data.CY, RMAX = data.RMAX, N = data.N, EXA = data.EXA;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(ctx, canvas, theme, CX, CY, RMAX, N, EXA);
  drawConstellations(ctx, stars, exam, theme);
  stars.forEach(function(star) {
    drawStar(ctx, star, star.lumMax);
  });

  return canvas.toDataURL("image/png");
}

// ─── Rendu animé ──────────────────────────────────────────────────

export function createAnimatedStarMap(canvas, exam, gradesForStudent, classRates, theme, options) {
  var varBright = (options && options.varBright != null) ? options.varBright : 0.05;
  var ctx = canvas.getContext("2d");
  var data = computeStars(canvas, exam, gradesForStudent, classRates, theme, options);
  var stars = data.stars, CX = data.CX, CY = data.CY, RMAX = data.RMAX, N = data.N, EXA = data.EXA;
  var TWO_PI = Math.PI * 2;

  var startTime = null;
  var rafId = null;
  var stopped = false;

  function frame(now) {
    if (stopped) return;
    if (startTime === null) startTime = now;
    var t = (now - startTime) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, canvas, theme, CX, CY, RMAX, N, EXA);
    drawConstellations(ctx, stars, exam, theme);

    stars.forEach(function(star) {
      var wave = 0.60 * Math.sin(TWO_PI * star.f1 * t + star.ph1)
               + 0.25 * Math.sin(TWO_PI * star.f2 * t + star.ph2)
               + 0.15 * Math.sin(TWO_PI * star.f3 * t + star.ph3);
      var lum = Math.max(0, Math.min(1, star.lumMax + varBright * wave));
      drawStar(ctx, star, lum);
    });

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    stop: function() { stopped = true; if (rafId) cancelAnimationFrame(rafId); },
    getStars: function() { return stars; },
  };
}
