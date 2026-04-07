// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION GÉNÉRALE DE C.H.E.C.K.
// ═══════════════════════════════════════════════════════════════════
//
// Ce fichier centralise TOUS les paramètres modifiables de l'application.
// Pour ajouter une remarque, une compétence, changer un seuil, ou
// modifier les informations de l'établissement :
// → c'est ici et uniquement ici qu'il faut intervenir.
//
// Les valeurs par défaut sont celles utilisées en MP2I au Lycée Joffre.
// Elles peuvent être surchargées dans l'interface (onglet Réglages).
// ═══════════════════════════════════════════════════════════════════

// ─── Compétences évaluées ────────────────────────────────────────
// id       : identifiant interne (une lettre, utilisée dans les exports)
// label    : nom complet affiché dans les statistiques et rapports
// short    : abréviation affichée dans les tableaux compacts
// color    : couleur en mode clair (hex)
// colorDark: couleur en mode sombre (hex)
//
// Pour ajouter une compétence : ajoutez simplement un objet ici.
// L'app, les stats et l'export LaTeX s'adaptent automatiquement.
export const COMPETENCES = [
  { id: "A", label: "Apprendre", short: "Ap.", color: "#2855a0", colorDark: "#5b9bd5" },
  { id: "N", label: "Analyser",  short: "An.", color: "#6a3a9a", colorDark: "#a882c8" },
  { id: "R", label: "Réaliser",  short: "R.",  color: "#2a7a3a", colorDark: "#7bc67e" },
  { id: "V", label: "Valider",   short: "V.",  color: "#c07a10", colorDark: "#e8a838" },
];

// ─── Remarques prédéfinies (fixes) ───────────────────────────────
// Ces remarques sont toujours disponibles comme base.
// L'utilisateur peut en créer de nouvelles via les Réglages (persistées
// en IndexedDB dans `remarquesCustom`), et activer/désactiver n'importe
// laquelle via `remarquesActives` (ids des remarques visibles).
//
// id    : lettre utilisée dans l'export
// label : texte affiché sur le bouton
// icon  : emoji affiché à côté du texte
// malus : si true, comptée pour le calcul du malus
export const REMARQUES = [
  { id: "r", label: "Rédaction",     icon: "✏️",  malus: true },
  { id: "h", label: "Homogénéité",   icon: "⚖️",  malus: true },
  { id: "u", label: "Unités",        icon: "📐",  malus: true },
  { id: "s", label: "Soin",          icon: "🧹",  malus: true },
  { id: "!", label: "À reprendre",   icon: "⚠️",  malus: false },
];

// IDs des remarques fixes actives par défaut (toutes).
// Utilisé pour initialiser `remarquesActives` au premier lancement.
export const DEFAULT_REMARQUES_ACTIVES = REMARQUES.map(function(r) { return r.id; });

// ─── Seuils de notation par compétence (valeurs par défaut) ──────
// Modifiables aussi dans l'interface via Réglages > Seuils.
export const DEFAULT_SEUILS = {
  nonNote: 20,  // % minimum de points traités pour être noté
  D: 25,        // < 25% de réussite → D
  C: 50,        // < 50% → C
  B: 75,        // < 75% → B
                // ≥ 75% → A
};

// ─── Seuil question difficile (valeur par défaut) ────────────────
// Une question traitée par moins de ce % des présents est "difficile".
// Modifiable dans Réglages.
export const DEFAULT_SEUIL_DIFFICILE = 33; // %

// ─── Malus de présentation (valeurs par défaut) ──────────────────
// Paliers automatiques basés sur le nombre de remarques (malus: true).
// Le malus est un % retranché à la note.
export const DEFAULT_MALUS_PALIERS = [
  { seuil: 5,  pct: 5 },   // ≥ 5 remarques → -5%
  { seuil: 10, pct: 10 },  // ≥ 10 remarques → -10%
];

// Mode d'application : "avant" ou "apres" la normalisation.
// "avant" : le malus affecte la note brute → modifie la distribution
// "apres" : le malus est appliqué après normalisation → pénalité individuelle
export const DEFAULT_MALUS_MODE = "apres";

// ─── Coefficient tiers-temps ─────────────────────────────────────
export const TT_COEFF = 4 / 3;

// ─── Groupes d'élèves ───────────────────────────────────────────
// id         : identifiant interne
// label      : nom affiché
// color/Dark : couleurs
// isStatGroup: si true, les stats peuvent être filtrées sur ce groupe
//              si false (ex: tiers-temps), le groupe n'apparaît pas
//              comme filtre dans les statistiques (pas éthique de séparer)
// Groupe tiers-temps — fixe, non éditable (aménagement individuel, coefficient 4/3)
export const TT_GROUPE = { id: "tt", label: "Tiers-temps", color: "#c07a10", colorDark: "#e8a838", isStatGroup: false };

// Groupes pédagogiques — valeur par défaut uniquement (non utilisée à l'exécution,
// remplacée par l'état `groupesDef` persisté en IndexedDB)
export const DEFAULT_GROUPES_PED = [
  { id: "nsi", label: "NSI", color: "#2855a0", colorDark: "#5b9bd5", isStatGroup: true },
];

// Rétrocompatibilité — ne plus utiliser dans App.jsx (remplacé par [TT_GROUPE, ...groupesDef])
export const TYPES_GROUPES = [DEFAULT_GROUPES_PED[0], TT_GROUPE];

// ─── Informations de l'établissement (utilisées dans l'export LaTeX) ──
export const ETABLISSEMENT = {
  nom: "Lycée Joffre",
  classe: "MP2I",
  matricule: "HX VI",        // identité historique (optionnel)
  promotion: "232",          // numéro de promotion (optionnel)
  anneeScolaire: "2024-2025",
};

// ─── Normalisation par défaut ────────────────────────────────────
// method: "none", "proportional", "affine", "gaussienne"
export const DEFAULT_NORM = {
  method: "none",
  params: { moyenneCible: 10, maxCible: 20, sigmaCible: 3.5 },
};