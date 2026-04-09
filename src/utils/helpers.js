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