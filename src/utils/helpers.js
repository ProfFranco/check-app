// ═══════════════════════════════════════════════════════════════════
// UTILITAIRES PARTAGÉS
// ═══════════════════════════════════════════════════════════════════

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