// ═══════════════════════════════════════════════════════════════════
// UTILITAIRES PARTAGÉS
// ═══════════════════════════════════════════════════════════════════

/**
 * Construit le nom de fichier audio pour un commentaire question/élève.
 * Logique identique à la fonction slug() locale de AudioRecorder.
 * Résultat : {nomDS}_{NOM_ELEVE}_{exTitle}_{qLabel}.{ext}
 */
export function buildAudioFilename(nomDS, studentNom, exTitle, qLabel, ext) {
  function slug(s) {
    if (!s) return "x";
    return s.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 20);
  }
  return slug(nomDS || "DS") + "_" +
         slug(studentNom || "eleve").toUpperCase() + "_" +
         slug(exTitle || "Ex") + "_" +
         slug(qLabel || "Q") + "." + ext;
}

/**
 * Transforme une chaîne en slug ASCII sûr pour les noms de fichiers.
 * Utilisé par les générateurs LaTeX et HTML pour nommer les rapports.
 */
export function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
}

/**
 * Cl\u00e9 de rapprochement d'une identit\u00e9 : minuscules, sans accents ni
 * ponctuation ni espaces. \u00ab Le Goff \u00bb et \u00ab LEGOFF \u00bb donnent la m\u00eame cl\u00e9,
 * de m\u00eame que \u00ab Jean-Luc \u00bb et \u00ab jean luc \u00bb.
 */
export function cleIdentite(nom, prenom) {
  function norm(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }
  return norm(nom) + "|" + norm(prenom);
}

/**
 * Rapproche les \u00e9l\u00e8ves CHECK des identit\u00e9s d'un pack Sycomore.
 *
 * students : [{ id, nom, prenom }]  (c\u00f4t\u00e9 CHECK)
 * pack     : { identities: { "<etudiantId>": { nom, prenom } } }  (c\u00f4t\u00e9 Sycomore)
 *
 * Retourne { map, nonApparies, ambigus } :
 *   map         \u2192 { checkStudentId: etudiantIdServeur }
 *   nonApparies \u2192 \u00e9l\u00e8ves CHECK sans correspondance
 *   ambigus     \u2192 \u00e9l\u00e8ves CHECK dont la cl\u00e9 correspond \u00e0 plusieurs identit\u00e9s
 *                 (jamais rapproch\u00e9s automatiquement : \u00e0 trancher \u00e0 la main)
 */
// ═══════════════════════════════════════════════════════════════════
// DÉSHYDRATATION / RÉHYDRATATION DES IDENTITÉS (P-H4)
// ═══════════════════════════════════════════════════════════════════
// Le serveur Sycomore ne doit jamais recevoir de nom d'élève. Plutôt que de
// changer la forme de `students` partout (64 sites de lecture de .nom/.prenom
// répartis sur 10 fichiers), on ne touche QUE la frontière de persistance :
//
//   buildPersistedState()  →  deshydraterEtat()  →  IndexedDB / blob serveur
//   IndexedDB / pull       →  rehydraterEtat()   →  état React (forme intacte)
//
// La forme en mémoire est donc rigoureusement identique à avant : exports,
// LaTeX, HTML, noms de fichiers audio et carte stellaire ne changent pas.
//
// ─── RÈGLE DE SÛRETÉ, NON NÉGOCIABLE ────────────────────────────────
// Un nom n'est retiré QUE s'il est récupérable, c'est-à-dire si l'élève est
// rapproché (sycomoreMap) ET que cet identifiant résout dans le trousseau.
// Sinon le nom reste inline, en clair. Un élève saisi à la main, absent du
// pack, ou d'un profil non rattaché à Sycomore garde donc toujours son nom :
// aucune perte de donnée n'est possible par construction. C'est aussi ce qui
// rend inutile une notion de « profil autonome » — la règle est par élève.
//
// Les deux fonctions renvoient l'objet d'origine PAR RÉFÉRENCE quand rien ne
// change : la stabilité référentielle évite les rendus inutiles et empêche
// l'effet de réhydratation de boucler sur lui-même.
// ═══════════════════════════════════════════════════════════════════

/**
 * Identité {nom, prenom} d'un etudiantId serveur dans le trousseau, ou null.
 * null couvre indifféremment : pas de trousseau, élève non rapproché,
 * identifiant absent du trousseau, entrée malformée.
 */
export function identiteTrousseau(trousseau, etudiantId) {
  if (!trousseau || !trousseau.identities || etudiantId === undefined || etudiantId === null) return null;
  var ident = trousseau.identities[String(etudiantId)];
  if (!ident || typeof ident.nom !== "string" || typeof ident.prenom !== "string") return null;
  return { nom: ident.nom, prenom: ident.prenom };
}

/**
 * Retire les noms récupérables de `students` ET des lignes de `synthese`
 * (elles portent aussi nom/prenom inline, cf. exporterVersSynthese).
 * Les champs sont vidés ("") plutôt que supprimés : la forme des objets reste
 * stable, ce qui évite les inputs React passant de contrôlés à non contrôlés.
 */
export function deshydraterEtat(state, trousseau) {
  if (!state || !trousseau) return state;
  var map = state.sycomoreMap || {};
  var change = false;

  var students = (state.students || []).map(function(s) {
    if (!s.nom && !s.prenom) return s;
    if (!identiteTrousseau(trousseau, map[s.id])) return s;
    change = true;
    return Object.assign({}, s, { nom: "", prenom: "" });
  });

  var synthese = (state.synthese || []).map(function(row) {
    if (!row.nom && !row.prenom) return row;
    if (!identiteTrousseau(trousseau, map[row.studentId])) return row;
    change = true;
    return Object.assign({}, row, { nom: "", prenom: "" });
  });

  if (!change) return state;
  return Object.assign({}, state, { students: students, synthese: synthese });
}

/**
 * Remplit les noms vides de `students` et `synthese` depuis le trousseau.
 * Ne touche jamais un nom déjà présent : un état restauré depuis une
 * sauvegarde nominative (backup .json, snapshot d'avant P-H4) traverse cette
 * fonction sans être modifié.
 */
export function rehydraterEtat(state, trousseau) {
  if (!state || !trousseau) return state;
  var map = state.sycomoreMap || {};
  var change = false;

  var students = (state.students || []).map(function(s) {
    if (s.nom || s.prenom) return s;
    var ident = identiteTrousseau(trousseau, map[s.id]);
    if (!ident) return s;
    change = true;
    return Object.assign({}, s, { nom: ident.nom, prenom: ident.prenom });
  });

  var synthese = (state.synthese || []).map(function(row) {
    if (row.nom || row.prenom) return row;
    var ident = identiteTrousseau(trousseau, map[row.studentId]);
    if (!ident) return row;
    change = true;
    return Object.assign({}, row, { nom: ident.nom, prenom: ident.prenom });
  });

  if (!change) return state;
  return Object.assign({}, state, { students: students, synthese: synthese });
}

/**
 * Détecte si l'app tourne dans Safari iOS/iPadOS hors mode PWA installé (P-H3).
 * `navigator.standalone` n'existe que sur iOS/iPadOS (Safari et WebViews basés
 * dessus) — undefined ailleurs (desktop, Android) signale "non concerné", pas
 * "non installé" : WebKit y évince le stockage inscriptible par script
 * (IndexedDB, localStorage) après 7 jours d'inactivité, sauf pour un site
 * ajouté à l'écran d'accueil, qui en est exempté.
 *
 * Retourne true (bandeau à afficher), false (installé, rien à afficher) ou
 * null (plateforme non concernée par cette éviction spécifique).
 */
export function iosInstallationRecommandee(nav) {
  var navigateur = nav || (typeof navigator !== "undefined" ? navigator : null);
  if (!navigateur || navigateur.standalone === undefined) return null;
  return navigateur.standalone !== true;
}

export function apparierIdentites(students, pack) {
  var identities = (pack && pack.identities) || {};
  var parCle = {};
  Object.keys(identities).forEach(function(etudiantId) {
    var ident = identities[etudiantId] || {};
    var cle = cleIdentite(ident.nom, ident.prenom);
    if (!parCle[cle]) parCle[cle] = [];
    parCle[cle].push(etudiantId);
  });

  var map = {};
  var nonApparies = [];
  var ambigus = [];
  (students || []).forEach(function(s) {
    var candidats = parCle[cleIdentite(s.nom, s.prenom)] || [];
    if (candidats.length === 1) map[s.id] = parseInt(candidats[0], 10);
    else if (candidats.length > 1) ambigus.push(s);
    else nonApparies.push(s);
  });

  return { map: map, nonApparies: nonApparies, ambigus: ambigus };
}