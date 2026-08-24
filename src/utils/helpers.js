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