// ═══════════════════════════════════════════════════════════════════
// THÈME VISUEL — Mode "Cahier de Notes"
// ═══════════════════════════════════════════════════════════════════
//
// Deux variantes : clair (papier crème) et sombre (ardoise chaude).
// Pour changer les couleurs globalement, modifiez les objets ci-dessous.
//
// Les polices sont chargées depuis Google Fonts dans index.js.
// ═══════════════════════════════════════════════════════════════════

// ─── Polices ─────────────────────────────────────────────────────
export const FONT_TITLE = "'Lora', Georgia, serif";            // Titres, noms d'élèves
export const FONT_BODY = "'Source Sans 3', 'Segoe UI', system-ui, sans-serif"; // Corps de texte
export const FONT_MONO = "'Source Code Pro', 'Fira Code', monospace";          // Notes, chiffres

// ─── URL Google Fonts ────────────────────────────────────────────
export const FONTS_URL = "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600;700&display=swap";

// ─── Thème clair ─────────────────────────────────────────────────
export const lightTheme = {
  bg: "#faf7f2",           // Fond papier crème
  surface: "#f2ede4",       // Surfaces surélevées
  card: "#ffffff",          // Cartes
  border: "#e0d8cc",        // Bordures
  borderDark: "#c8bfb0",    // Bordures appuyées
  text: "#2c2416",          // Texte principal (encre)
  textMuted: "#7a7060",     // Texte secondaire
  textDim: "#b0a898",       // Texte discret
  accent: "#2855a0",        // Couleur d'accent (bleu encre)
  accentBg: "#2855a012",    // Fond accent
  success: "#2a7a3a",       // Vert (validation, bons scores)
  successBg: "#2a7a3a10",
  warning: "#c07a10",       // Ambre (remarques, scores moyens)
  warningBg: "#c07a1010",
  danger: "#b83030",        // Rouge (erreurs, mauvais scores)
  dangerBg: "#b8303010",
  violet: "#6a3a9a",        // Violet (médiane, analyser)
  radius: "8px",
  radiusSm: "5px",
  ruledLine: "#c8bfb0",     // Lignes de cahier
  headerBorder: "#2c2416",  // Bordure basse de l'en-tête
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
};

// ─── Thème sombre ────────────────────────────────────────────────
export const darkTheme = {
  bg: "#1a1814",
  surface: "#242018",
  card: "#2a261e",
  border: "#3a3428",
  borderDark: "#4a4438",
  text: "#e8e4dc",
  textMuted: "#9e9a90",
  textDim: "#6b675f",
  accent: "#5b9bd5",
  accentBg: "#5b9bd515",
  success: "#7bc67e",
  successBg: "#7bc67e12",
  warning: "#e8a838",
  warningBg: "#e8a83812",
  danger: "#d06050",
  dangerBg: "#d0605012",
  violet: "#a882c8",
  radius: "8px",
  radiusSm: "5px",
  ruledLine: "#3a3428",
  headerBorder: "#e8e4dc",
  shadow: "0 1px 3px rgba(0,0,0,0.2)",
};

// ─── Thème Jeune ─────────────────────────────────────────────────
export const youngTheme = {
  bg: "#f0f4ff",           // Fond lavande doux
  surface: "#e6ecff",       // Surfaces surélevées
  card: "#ffffff",          // Cartes
  border: "#c8d4f8",        // Bordures
  borderDark: "#a8b8f0",    // Bordures appuyées
  text: "#1a1f3c",          // Texte principal
  textMuted: "#5a6080",     // Texte secondaire
  textDim: "#9aa0c0",       // Texte discret
  accent: "#5b5ef4",        // Violet-bleu vif
  accentBg: "#5b5ef415",    // Fond accent
  success: "#22c55e",       // Vert vif
  successBg: "#22c55e12",
  warning: "#f59e0b",       // Ambre vif
  warningBg: "#f59e0b12",
  danger: "#ef4444",        // Rouge vif
  dangerBg: "#ef444412",
  violet: "#a855f7",        // Violet (médiane)
  radius: "14px",
  radiusSm: "8px",
  ruledLine: "#c8d4f8",     // Lignes de cahier
  headerBorder: "#5b5ef4",  // Bordure basse de l'en-tête (accent)
  shadow: "0 2px 8px rgba(91,94,244,0.10)",
};