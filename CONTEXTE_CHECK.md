# CONTEXTE_CHECK

# Contexte projet — C.H.E.C.K.

Je suis enseignant en MP2I au Lycée Joffre (Montpellier) et je développe **C.H.E.C.K.** (Correcteur Hautement Efficace avec Cases à Kocher), une application web React pour corriger des copies et générer des rapports individuels en PDF via LaTeX/XeLaTeX.

Je suis un "iArchitecte" : je conçois, arbitre et valide — je construis par itérations avec l'aide de l'IA, sans formation formelle en programmation.

---

## Stack technique

- **React** (create-react-app, architecture multi-composants — `App.jsx` + composants extraits)
- **JavaScript** vanilla dans les utils (`calculs.js`, `latex.js`, `html.js`)
- **Persistance** : IndexedDB (pas de backend)
- **Export** : fichiers `.tex` compilables avec `xelatex` ; fichiers `.html` autonomes ; `.csv`, `.zip`
- **PWA** : installable sur tablette, fonctionne hors ligne
- **Environnement** : macOS, Node.js, `npm start` pour développer

---

## Structure du projet

```other
check-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js                  ← Service Worker PWA
│   ├── CHANGELOG.md           ← Journal des mises à jour (fetché dans le modal À propos)
│   └── logos/
│       ├── splash.png
│       ├── logo-light.png
│       ├── logo-dark.png
│       └── logo-young.png
└── src/
    ├── index.js
    ├── App.jsx                ← Composant principal (~2775 lignes, dont hook useSyncStatus, StarMapModal, showLayoutModal)
    ├── AccueilTab.jsx         ← Tableau de bord (accueil au clic logo, carte Perle du moment)
    ├── SettingsModal.jsx      ← Modale Réglages (5 onglets, ~723 lignes)
    ├── ExportTab.jsx          ← Onglet Export (sync GitHub, exports, synthèse, rapport classe)
    ├── HelpTab.jsx            ← Onglet Aide (tutoriel + référence)
    ├── OverviewTab.jsx        ← Onglet Vue d'ensemble (tableau croisé)
    ├── components/
    │   ├── Charts.jsx         ← RadarChart, MiniRadar, MiniRadarEx, Histo, PBar, ProgressionChart, ProgressionRadar
    │   ├── AudioRecorder.jsx  ← Enregistrement audio par question
    │   ├── DebugModal.jsx     ← Modal debug (état complet)
    │   └── SyncIndicator.jsx  ← Pastille de sync dans le header (statut + popover + toast)
    ├── config/
    │   ├── settings.js        ← Compétences, remarques, seuils, groupes, FEATURE_PRESETS
    │   └── theme.js           ← Thème clair/sombre/jeune (palettes)
    └── utils/
        ├── calculs.js         ← Scores, compétences, normalisation, malus, validation
        ├── calculs.test.js    ← Tests unitaires calculs (71 tests, 10 blocs)
        ├── db.js              ← Couche persistance IndexedDB (open, load, save, profiles)
        ├── helpers.js         ← Utilitaires partagés (slugify, buildAudioFilename)
        ├── latex.js           ← Générateur de rapports LaTeX individuels
        ├── html.js            ← Générateur de rapports HTML autonomes + rapport classe
        ├── starmap.js         ← Visualisation canvas carte stellaire (renderStarMap, createAnimatedStarMap)
        ├── sync.js            ← Synchronisation inter-appareils (adapter GitHub, hash, push/pull, snapshots)
        └── sync.test.js       ← Tests unitaires sync (13 tests, node:test / Jest)
```

> **Note :** `src/useAppState.js` est présent dans le dépôt mais n'est pas utilisé — artefact d'une piste explorée et abandonnée.

---

## Fonctionnalités actuelles

- **Onglet Préparation** : nom et date du DS éditables directement dans le header du DS actif (inputs inline, label "Date :" affiché avant le champ date) ; créer exercices/questions/items avec points, assigner compétences (A/N/R/V), importer élèves CSV, gérer groupes (tiers-temps fixe + groupes pédagogiques éditables), coefficient par exercice (champ `×`), question bonus 🎁, toggle bonus exercice complet 🏆 (seuil configurable), confirmation avant toute suppression (exercice, question, item, DS, élève), réordonnancement exercices/questions via boutons ↑/↓. **Bloc "Fonctionnalités du devoir"** : sélecteur de preset (Simple ♙ / Standard ♜ / Complet ♔ / Personnalisé ♞) avec chips récapitulatives ou toggles avec infobulles, collapsable, conditionne l'affichage de toute l'UI.
- **Onglet Correction** : navigation élève par élève (swipe sur tablette), cochage des items, badge 🎁 sur les questions bonus, remarques de présentation configurables (activer/désactiver, créer, réordonner ↑/↓, participation au malus), case "traitée (0 pt)", malus automatique et manuel, radar de compétences, commentaire libre par élève, bouton 🎙️ par question (commentaire audio). **Bandeau toggle `▾/▸ Commentaires & notes`** : masque/révèle en un clic les trois blocs de commentaires (commentaire élève, note privée, perles) ; quand replié, badge discret indique le contenu présent (💬 🔒 💎N). **🔒 Note privée** : zone texte enseignant persistée, non exportée (badge orange, `notesPrivees[studentId]`). **💎 Perles** : liste de citations sauvegardées par élève (`perles[studentId]`), chacune avec texte + contexte optionnel ; formulaire d'ajout inline, suppression directe ; non exportées.
- **Onglet Résultats individuels** (🧑) : sélecteur enrichi avec option **"📊 Toute la classe"** en tête (affiche le rapport de classe dans l'iframe) + séparateur + liste élèves triée alphabétiquement. Quand mode classe actif : panel de checkboxes de configuration visible sous le sélecteur. Quand un élève est sélectionné : note et rang affichés. Aperçu live via `<iframe key="preview-iframe" srcdoc=...>` (clé fixe pour éviter rechargement au changement d'onglet). `htmlSrc` et `htmlClasseSrc` mémoïsés via `useMemo`. L'élève sélectionné est persisté en IndexedDB (`htmlStudentId`, valeur `"__classe__"` valide). **Bouton "⊞ Mise en page"** (mode individuel uniquement) : ouvre `showLayoutModal` — réordonnancement ▲▼ et toggle Plein/Demi par bloc. Bouton "⚙ Réglages export" dans le modal → ouvre SettingsModal sur l'onglet export.
- **Onglet Vue d'ensemble** (📋) : tableau croisé élèves × questions (toggle items), en-tête 2 niveaux (exercice fusionné + question), colonnes Nom et Total sticky, code couleur ratio pts/max (≥75% vert / ≥50% orange / <50% rouge), tri par clic, bulles de navigation par exercice, clic sur cellule → bascule vers Correction positionné sur l'élève et l'exercice.
- **Onglet Stats** : distribution /20 (traits moy/médiane), compétences, stats par exercice et par question (taux de réussite, questions difficiles en rouge, questions pièges en orange ⚠️), classement avec radar exercices (vert), tri par rang ou alphabétique. **Sous-onglet Progression** : courbe note élève (trait plein) + moyenne classe (pointillés) par DS, ou radar multi-DS ; toggle brut/normalisé ; bascule automatique vers courbe si n > 8 DS.
- **Onglet Export** — sections déroulables (animation `max-height`), dans cet ordre : ☁️ **Synchronisation** (sauvegarde/restauration JSON via API GitHub REST, bouton 🔓 Dissocier) · 📄 **Pour les élèves** (HTML individuel, ZIP HTML, `.tex` individuel, ZIP `.tex` + script) · 🗂️ **Pour l'enseignant** (`.tex` complet, CSV récapitulatif, gabarit LaTeX, sous-accordéon **📊 Rapport de classe** : textarea commentaire DS + checkboxes blocs + bouton HTML) · 📊 **Synthèse multi-DS** (CSV cumulatif).
- **Persistance** : IndexedDB multi-profils, sauvegarde/chargement JSON, PWA hors ligne.
- **Normalisation** : aucune / proportionnelle (moy) / proportionnelle (max) / affine (moy+σ) / affine (max+σ) / gaussienne — avec infobulles contextuelles.
- **Zoom interface** : boutons `−/+` dans la nav, propriété CSS `zoom` sur `<main>` (la nav reste fixe), valeur persistée en IndexedDB.
- **Thème** : trois thèmes — ☀️ Clair / 🌙 Sombre / 🌈 Jeune. Sélecteur dans le menu ⋯. `youngTheme` dans `theme.js` (lavande, Nunito, radius 14px).
- **Réglages** : panneau modal (540 px) avec 5 onglets : 🏫 Établissement · 🎓 Évaluation · 📊 Notes · ✏️ Correction · 📤 Export. Flash **"✓ Sauvegardé"** après toute modification (prop `onSave`, état local `savedFlash` 1500ms, footer du modal). Onglet Correction : deux accordéons (Remarques ouvert, Groupes fermé). **Onglets Évaluation et Notes** : deux accordéons chacun — "DS actif" (ouvert par défaut, modifie `exam.settings` via `onExamSetting`, bouton ↺ Réinitialiser) et "Valeurs par défaut (nouveaux DS)" (fermé par défaut, modifie les états `defaultX` du profil). L'onglet Évaluation couvre seuils compétences, seuil difficulté, seuil réussite, seuil piège, bonus exercice complet. L'onglet Notes couvre normalisation, paliers malus, application du malus (avant/après normalisation).
- **Navigation correction** : boutons bas → exercice préc./suiv. avec wrap ; raccourcis clavier `←/→` (exercices), `1–9` (saut direct exercice), `S` (ouvre/ferme la Carte Stellaire de l'élève courant).
- **Carte Stellaire** (`StarMapModal`) : popup canvas 660×460 px animé via `requestAnimationFrame`. Chaque étoile = une question (luminosité = score élève, taille = difficulté classe, couleur = compétence(s)). Constellations = MST Kruskal par exercice. Survol → tooltip détaillé. Raccourci `S`, `Escape` pour fermer. Disponible uniquement en onglet Correction si des élèves sont chargés. Peut aussi être incluse dans le rapport HTML individuel via `htmlConfig.starMap` (rendu statique PNG via canvas offscreen, `max-width:660px;width:100%;margin:0 auto` — taille cohérente en mode plein et demi-largeur).
- **Barre de progression** sous le header (correction uniquement).
- **Copies non corrigées** exclues des stats et de la normalisation.
- **Mode debug** 🔬 : modal depuis les Réglages, sections repliables (toutes les clés de `buildAppState()`, ~40 entrées), bouton "Tout copier".
- **Menu ⋯** : zoom −/%/+ · sélecteur thème · ❓ À propos.
- **Onglet Aide** : guide complet par section + référence en accordéons.
- **Tableau de bord** (`AccueilTab`) : accessible au clic sur le logo. Header avec pill-profil et dropdown inline (switchProfile + "Gérer les profils…"). 4 cartes de stats : DS archivés, élèves suivis, moyenne générale (tous DS), taux de correction (DS courant). Deux colonnes : dernier DS (mini-stats, barres A/N/R/V, 3 boutons) + historique 5 DS précédents (date, élèves, moyenne, pastille complet/incomplet). **Carte 💎 Perle du moment** : tirée aléatoirement depuis toutes les perles du profil, affichée juste avant le pied de page ; bouton 🔀 pour passer à une autre perle (état local `perleIdx`). Pied de page : version + établissement à gauche, lien CHANGELOG (ouvre la modale À propos) à droite. Couleur d'accent dérivée de `PROFILE_COLORS[profileIndex]` — palette de 5 couleurs indexées sur le profil actif.

---

## Modèle de données (état React)

```other
exams        : [{ id, name, nomDS, dateDS,
               features: { preset: "simple"|"standard"|"complet"|"custom",
                 competences, coefficients, questionBonus, bonusComplet, malusAuto, questionPiege },
               settings: { normMethod, normParams, seuilDifficile, seuilPiege, seuilReussite,
                 malusPaliers, malusMode, seuilsComp, bonusCompletConfig },
               exercises: [{ id, title, coeff: number,
               bonusComplet: bool,
               questions: [{ id, label, bonus: bool,
               competences: [...], items: [{ id, label, points }] }] }] }]
students     : [{ id, nom, prenom }]
grades       : { "studentId__itemId": true }
remarks      : { "studentId__questionId": ["r","h"…] }
absents      : { "studentId": true }
groupes      : { "nsi": [studentId…], "tt": [studentId…] }
malusManuel  : { "studentId": number }
commentaires : { "studentId": string }
notesPrivees : { "studentId": string }           ← note privée enseignant, non exportée
perles       : { "studentId": [{ id, texte, contexte }] }  ← citations, non exportées

collapsed        : { exerciceId: bool }     ← éphémère, non persisté
collapsedExams   : { examId: bool }         ← éphémère, non persisté
featOpen         : bool                     ← éphémère, non persisté

Persistés en IndexedDB uniquement :
remarquesActives    : [id…]
remarquesCustom     : [{ id, label, icon, malus }]
remarquesOrdre      : [id…]
settingsTab         : string
── Valeurs par défaut pour les nouveaux DS (profil) :
defaultNormMethod       : string            ← défaut "none"
defaultNormParams       : { moyenneCible, maxCible, sigmaCible }
defaultSeuilDifficile   : number            ← défaut 33
defaultSeuilPiege       : number            ← défaut 30
defaultSeuilReussite    : number            ← défaut 50
defaultMalusPaliers     : [{ seuil, pct }]
defaultMalusMode        : "avant"|"apres"   ← défaut "apres"
defaultSeuilsComp       : { nonNote, D, C, B }
defaultBonusCompletConfig : { seuil, mode, valeur }
htmlConfig          : { theme, noteNorm, noteBrute, rang,
                        statsEleve: { justesse, efficacite, malus },
                        statsClasse: { moy, minMax, sigma },
                        competences,        ← "grid" | "none"
                        commentaire, detailExercices, bareme, histogramme,
                        starMap,            ← bool, rendu PNG offscreen via starmap.js
                        blockOrder: ["stats","competences","commentaire","histogramme","starMap"],
                        blockLayout: { stats, competences, commentaire, histogramme, starMap }
                        }                   ← "full" | "half" par bloc
htmlPresets         : [{ name, config }]
htmlStudentId       : string | null         ← "__classe__" pour rapport de classe
commentaireDS       : { [examId]: string }  ← commentaire enseignant par DS
rapportClasseConfig : { commentaire, statsGlobales, distribution,
                        parCompetence, parExercice }
csvConfig           : { sep, dec, cols: { rang, nom, prenom, absent, note,
                        noteNorm, groupe, competences, malus } }
synthese            : [{ examId, dsNom, dsDate, studentId, nom, prenom, groupe,
                        noteBrute, noteNorm, rang, compA, compN, compR, compV }]
etablissement       : { nom, classe, matricule, promotion, anneeScolaire }

Meta-base check-app-profiles (séparée) :
profiles        : [{ id, name, createdAt }]
activeProfileId : string
```

Tout est persisté en IndexedDB via `saveDB(state, profileId)` / `loadDB(profileId)`. Sauvegarde déclenchée avec debounce 500 ms.

**Attention** : pour les mises à jour critiques (ex. ajout de remarque custom), appeler `saveDB` immédiatement avec les nouvelles valeurs locales (pas les variables d'état React, qui sont asynchrones).

### Merge défensif au chargement

```other
// htmlConfig
if (saved.htmlConfig) {
  var sc2 = saved.htmlConfig;
  setHtmlConfig(Object.assign({}, DEFAULT_HTML_CONFIG, sc2, {
    statsEleve:  Object.assign({}, DEFAULT_HTML_CONFIG.statsEleve,  sc2.statsEleve),
    statsClasse: Object.assign({}, DEFAULT_HTML_CONFIG.statsClasse, sc2.statsClasse),
    blockLayout: Object.assign({}, DEFAULT_HTML_CONFIG.blockLayout, sc2.blockLayout),
    blockOrder:  Array.isArray(sc2.blockOrder) && sc2.blockOrder.length
                   ? sc2.blockOrder : DEFAULT_HTML_CONFIG.blockOrder,
  }));
}
if (saved.commentaireDS) setCommentaireDS(saved.commentaireDS);
if (saved.rapportClasseConfig) setRapportClasseConfig(Object.assign({}, DEFAULT_RAPPORT_CLASSE_CONFIG, saved.rapportClasseConfig));

// features + settings (dans restoreState, lors du chargement des exams)
if (d.exams) setExams(d.exams.map(function(ex) {
  return Object.assign({}, ex, {
    features: Object.assign({}, DEFAULT_FEATURES, ex.features || {}),
    settings: Object.assign({}, DEFAULT_EXAM_SETTINGS, ex.settings || {}),
  });
}));
// Valeurs par défaut profil — rétrocompat (anciennes clés sans préfixe "default")
if (d.defaultNormMethod) setDefaultNormMethod(d.defaultNormMethod);
else if (d.normMethod) setDefaultNormMethod(d.normMethod);
// …idem pour les 8 autres états defaultX
if (d.defaultMalusMode) setDefaultMalusMode(d.defaultMalusMode);
else if (d.malusMode) setDefaultMalusMode(d.malusMode);
```

`DEFAULT_FEATURES` utilise le preset `"complet"` — les DS existants sans champ `features` utilisent déjà toutes les fonctionnalités. `DEFAULT_EXAM_SETTINGS` (dans `settings.js`) fournit les valeurs canoniques pour `exam.settings`.

### `activeExamSettings` et helpers par DS

```js
// Variable calculée (pas un état React) :
var activeExam = exams.find(function(e) { return e.id === activeExamId; });
var activeExamSettings = (activeExam && activeExam.settings)
  ? Object.assign({}, DEFAULT_EXAM_SETTINGS, activeExam.settings)
  : DEFAULT_EXAM_SETTINGS;

// Modifier un réglage du DS actif :
function setExamSetting(key, value) { /* met à jour exam.settings[key] */ }

// Réinitialiser depuis les valeurs par défaut du profil :
function resetExamSettings() { /* copie les defaultX vers exam.settings */ }
```

Tous les calculs (normalisation, malus, seuils) utilisent `activeExamSettings.X` — jamais les états `defaultX` directement.

### `exportOpen` (éphémère, non persisté)

```other
{ eleves: true, enseignant: true, gabarit: false, synthese: false,
  github: false, sync: true, sound: false, rapportClasse: false }
```

### Champs de compatibilité ascendante

- `exercise.coeff` : lu via `ex.coeff !== undefined ? ex.coeff : 1`
- `question.bonus` : booléen, défaut `false`/absent
- `exercise.bonusComplet` : booléen, défaut `false`/absent
- `exam.features` : merge défensif avec `DEFAULT_FEATURES` au chargement
- `exam.settings` : merge défensif avec `DEFAULT_EXAM_SETTINGS` au chargement
- Clés IndexedDB anciennes (`normMethod`, `malusMode`…) → lues avec fallback `else if` vers les nouveaux `defaultX`

---

## Fonctionnalités par DS — `features`

Chaque DS porte un objet `features` qui conditionne l'affichage de toute l'UI et les exports.

### Presets (`FEATURE_PRESETS` dans `settings.js`)

| **Fonctionnalité**    | **♙ Simple** | **♜ Standard** | **♔ Complet** |
| --------------------- | ------------ | -------------- | ------------- |
| `competences` A/N/R/V | ✗            | ✓              | ✓             |
| `coefficients` ×      | ✗            | ✗              | ✓             |
| `questionBonus` 🎁    | ✗            | ✓              | ✓             |
| `bonusComplet` 🏆     | ✗            | ✗              | ✓             |
| `malusAuto`           | ✗            | ✓              | ✓             |
| `questionPiege` ⚠️    | ✗            | ✗              | ✓             |

♞ **Personnalisé** : preset `"custom"`, valeurs libres via toggles avec infobulles.

### Propagation du masquage

| **`features.X = false`** | **Masqué dans**                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `competences`            | Boutons A/N/R/V (Prep) · badges (Correction) · radar + stats (Stats) · bloc HTML · tableau LaTeX |
| `coefficients`           | Champ `×` par exercice (Prep)                                                                    |
| `questionBonus`          | Bouton 🎁 (Prep)                                                                                 |
| `bonusComplet`           | Toggle 🏆 (Prep)                                                                                 |
| `malusAuto`              | Barre de malus (Correction)                                                                      |
| `questionPiege`          | Marqueur ⚠️ (Stats · HTML · LaTeX · rapport classe)                                              |

**Variable de commodité** dans `App()` : `var ft = exam ? Object.assign({}, DEFAULT_FEATURES, exam.features || {}) : DEFAULT_FEATURES;`

---

## Compétences (ARNV)

| **Id** | **Nom**   | **Abrév.** |
| ------ | --------- | ---------- |
| A      | Apprendre | Ap.        |
| N      | Analyser  | An.        |
| R      | Réaliser  | R.         |
| V      | Valider   | V.         |

Note lettre par compétence : **NN / D / C / B / A**. Seuils configurables dans Réglages (nonNote / D / C / B en %).

---

## Points techniques importants

### Hooks React — règle fondamentale

Les hooks doivent être appelés **au niveau racine du composant**, jamais dans une condition, une boucle ou une IIFE. → Tout nouvel état déclaré en haut de `App()` avec les autres `useState`.

**Ne jamais insérer un `useState` entre deux états existants sans vérifier que toutes les destructurations (`var x = _x[0]; var setX = _x[1]`) sont bien présentes sur la même ligne.** Un `var _si = useState(0)` sans `var si = _si[0]` provoque une erreur `si is not defined` à la compilation.

### Zoom interface

```other
<div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
  <div style={{ zoom: isMobile ? 1 : sc }}>
    <main ...>
```

La nav (`<header>`) est hors du wrapper → reste à taille fixe. Pas de `minHeight` sur le div racine — utiliser `height: 100vh` (sinon `position: sticky` casse).

### `saveDB` — pas de Promise chainable

`saveDB` se termine par `.catch(() => {})` terminal — impossible d'utiliser `.then()` pour un retour UI post-sauvegarde. Solution : signal via prop `onSave` (compteur React) observé via `useEffect` dans `SettingsModal`.

### Flash "✓ Sauvegardé" dans SettingsModal

- `App.jsx` : `settingsSaveSignal` (compteur) incrémenté via `useEffect` sur les états de réglages
- `SettingsModal.jsx` : prop `onSave={settingsSaveSignal}`, état local `savedFlash`, `useEffect` → `setSavedFlash(true)` + timeout 1500ms
- Affiché dans le footer du modal à gauche du bouton Fermer

### iframe rapport — panneau persistant

Le panneau Résultats est placé **hors de `<main>`**, dans un `<div>` frère toujours monté, affiché/masqué par CSS (`display: mode === "resultats" ? "flex" : "none"`). L'iframe n'est jamais détruite au changement d'onglet (les navigateurs préservent le document iframe sous `display:none`). `<main>` n'est rendu que si `mode !== "resultats"` (`key={mode}` sans cas spécial). `htmlSrc` et `htmlClasseSrc` sont des `useMemo` distincts avec dépendances complètes.

### Export ZIP individuel

JSZip chargé dynamiquement depuis cdnjs au moment du clic. Même mécanique dans `html.js` via `genererHtmlTous()`.

### Multi-profils

- Meta-base `check-app-profiles` → `{ profiles: [{ id, name, createdAt }], activeId }`
- Migration au premier lancement : détection absence meta-base → `initProfiles()` lit l'ancienne base `check-app`, crée "Profil 1", copie les données.
- `switchProfile` : sauvegarde immédiate → `resetAppState()` → `loadDB(newId)` → mise à jour meta

### `buildAppState` / `restoreState`

Deux fonctions uniques dans `App()` pour construire/restaurer l'état complet. Utilisées dans les 4 sites d'appel (useEffect sauvegarde, `switchProfile`, `buildSnapshot`, `exporterVersSynthese`).

**Fragilité connue (F1 audit, partiellement résolue)** : deux listes synchronisées manuellement — les states dans `buildAppState` et le tableau de deps du `useEffect`. Tout nouvel état persisté doit être ajouté aux deux endroits. `notesPrivees` et `perles` sont inclus dans `buildAppState` et dans les deps, mais **exclus de tous les exports élèves** (HTML, LaTeX, CSV). `DebugModal` est désormais auto-généré depuis `buildAppState()` (N12, AE). Consolidation via `PERSISTED_KEYS` (Ω3, reporté).

### nomDS / dateDS

Chaque `exam` possède `exam.nomDS` et `exam.dateDS`. Dans `App()`, `examNomDS`/`examDateDS` lisent depuis l'exam actif avec repli sur les états globaux pour rétrocompatibilité. `setExamNomDS(val)` / `setExamDateDS(val)` écrivent dans l'exam.

### Modale de confirmation suppression

État `confirmDelete = null | { label: string, onConfirm: () => void }`. Déclenchée via `askConfirm(label, fn)`. `zIndex: 300`.

### Composants radar (`Charts.jsx`)

- `RadarChart` : radar interactif complet (correction)
- `MiniRadar` : radar miniature compétences (`compValues` objet `{A,N,R,V}`) — export présent dans Charts.jsx mais non importé dans App.jsx (N4)
- `MiniRadarEx` : radar miniature exercices (`values` tableau `[0..1]`), couleur `th.success`
- `ProgressionChart` : courbe élève (trait plein) + moyenne classe (pointillés), gestion trous (null) ; labels X tronqués à 10 car. avec `<title>` SVG tooltip (F7, AE)
- `ProgressionRadar` : radar multi-DS (max 8), bascule automatique vers courbe si n > 8 ; labels tronqués avec `<title>` SVG tooltip (F7, AE)

### calculs.js — fonctions clés

- `studentTotal` / `studentTotalWeighted` → points bruts / pondérés
- `examTotal` / `examTotalWeighted` → total hors bonus
- `exerciseScore(grades, studentId, exercise, bonusConfig?)` → `{ earned, total, bonus }`
- `bonusCompletPoints(grades, studentId, exercise, config)` → 0 si non déclenché
- `notesParCompetence` → `{ A, N, R, V }` lettres
- `ratioJustesse` / `ratioEfficacite` → métriques qualité (utilisées dans `html.js`)
- `malusTotal(remarks, studentId, exam, paliers, malusManuel, allRemarques)` → % malus
- `normaliser(notes, method, params)` → tableau normalisé (6 méthodes)
- `validateState(d)` → `{ valid, data, warnings, errors }` — validation imports JSON/GitHub
- `treatedKey(studentId, questionId)` → clé pour case "traitée 0pt"

`studentTotalWeighted(grades, studentId, exam, bonusConfig)` : accepte `bonusConfig` depuis Ω2 — score correct si bonus exercice complet activé.

### html.js — exports et fonctions SVG

**Exports :**

- `DEFAULT_HTML_CONFIG` — config rapports individuels
- `DEFAULT_RAPPORT_CLASSE_CONFIG` — `{ commentaire, statsGlobales, distribution, parCompetence, parExercice }` tous `true`
- `genererHtmlEleve(opts)` — rapport individuel HTML autonome
- `genererHtmlTous(opts)` — ZIP tous élèves
- `genererRapportClasse(opts)` — rapport de classe HTML (projection paysage A4)

**Fonctions SVG internes :**

- `svgRadar(compPcts, p)` — radar 160px (rapports individuels)
- ~~`svgRadarGrand`~~ — supprimée (N1, Ω1)
- `svgHisto(allNotes, studentNote, p)` — histogramme individuel
- `svgHistoClasse(allNotes, moyenneNote, p)` — histogramme classe, `width="100%"`, trait moyenne
- `svgHistoExercice(ex, p)` — histogramme vertical par exercice, `width="100%"`, badges ⚠️●

**Structure `genererRapportClasse`** : format paysage A4, grille bento CSS (`repeat(auto-fit, minmax(280px, 1fr))`). Tous les blocs sont `bento-full`. Blocs conditionnels selon `rapportClasseConfig` : commentaire · stats KPI cards · distribution · compétences (barres horizontales colorées) · exercices (un bloc par exercice, `svgHistoExercice`). Stats globales (moy/med/min/max) calculées sur `corriges` (copies non vides) pour éviter min=0. Bouton 🖨️ masqué dans l'iframe (`window.self !== window.top`).

**Thèmes** : `"light"` (Cahier, Lora), `"dark"` (Ardoise, Lora), `"young"` (Lavande, Nunito). Chaque palette expose : `bg, card, border, surface, text, textMuted, textDim, accent, success, warning, danger, violet, ruled, ruledLine, radius, radiusSm, headerFont, bodyFont, compColors { A, N, R, V }`. **`ruledLine` obligatoire** — son absence casse tout le CSS. **`violet` et `radiusSm`** ont été ajoutés aux trois palettes `paletteTheme()` pour `starmap.js` (`exColor` utilise `violet`, `StarMapModal` utilise `radiusSm`).

~~`blocParExercice`~~ — supprimée (N2, Ω1). Seule `blocsParExercice` subsiste.

### starmap.js — Carte Stellaire

Module **autonome** (zéro import React ni externe). Deux exports :

```js
renderStarMap(canvas, exam, gradesForStudent, classRates, theme, options)
// → canvas.toDataURL("image/png")  — rendu statique (utilisé dans html.js)

createAnimatedStarMap(canvas, exam, gradesForStudent, classRates, theme, options)
// → { stop(), getStars() }  — boucle RAF (utilisé dans StarMapModal / App.jsx)
```

**Paramètres :**
- `canvas` : `HTMLCanvasElement` 660×460 (taille fixée côté appelant)
- `exam` : objet DS complet (`exercises[].questions[].items[].points`, `competences`)
- `gradesForStudent` : `{ itemId: true }` — filtré pour un seul élève
- `classRates` : `{ questionId: 0..1 }` — taux de réussite par question (proportion ≥ 50% pts)
- `theme` : objet palette CHECK (`bg, border, accent, success, warning, danger, violet, radius, radiusSm, text, textDim`)
- `options` : `{ varBright = 0.05, jitterSeed = "" }`

**Pipeline `computeStars()` :**
- Position angulaire : arc `(exIdx / N) * 2π − π/2`, jitter reproductible par PRNG seedé sur `q.id`
- Rayon : `RMAX × (0.15 + 0.78 × totalPts/maxTotalPts)` + jitter ±11%
- `coreR` (taille noyau) : log-scale sur difficulté — `3.5 + 9.5 × log(1 + diff × (e−1))`
- `lumMax` = `pointsObtenus / totalPts` (luminosité max de l'élève)
- Paramètres oscillation `f1/f2/f3/ph1/ph2/ph3` : seedés sur `q.id` via LCG

**Rendu `drawStar()` :**
- Glow : gradient radial, `alphaHex = lum × 140`
- Noyau plein : `globalAlpha = lum`
- Reflet spéculaire : cercle blanc si `lum > 0.38`
- Étoile fantôme (lumMax < 0.01) : contour seul, `col + "33"`

**Constellations `drawConstellations()` :** MST Kruskal (Union-Find) par exercice, uniquement les questions avec `pointsObtenus > 0`. Couleur par exercice : `[violet, accent, success, warning, danger][ei % 5]`.

**PRNG :** `hashInt(s)` djb2 + `lcg(seed)` LCG — reproductible, même rendu à chaque appel si `jitterSeed` identique.

**Couleur compétences :** `{ A: danger, N: accent, R: success, V: warning }`. Multi-compétences → blend RGB moyen.

### latex.js — points d'attention

- `encodeRemarks()` : prend `allRemarques` en second paramètre pour résoudre les labels custom
- Condition d'affichage d'une question : vérifier aussi `grades["treated_" + student.id + "_" + q.id]`
- Stats min/max/moy dans le PDF : points bruts (`studentTotal`), pas normalisés
- Question piège : `\color{orange}\bfseries` + marqueur ⚠️
- Si `features.competences = false` : tableau 2 colonnes (Note + Rang)

### Synchronisation inter-appareils (depuis Z1, étendu en Z2)

**Architecture** : `sync.js` (aucune dépendance React) + hook `useSyncStatus` dans `App.jsx` + `SyncIndicator.jsx` dans le header.

**Adapter GitHub** (`createSyncAdapter({ backend: "github", pat, repo })`) :
- `head(profileId)` → SHA courant (fast check, pas de décodage)
- `pull(profileId)` → snapshot décodé + SHA + `_syncMeta`
- `push(profileId, snapshot, expectedSHA)` → PUT avec SHA ; 409/422 → `{ conflict: true }`
- `_repo` et `_headers` exposés sur l'objet adapter (Z2, pour les fonctions snapshot)
- Fichier principal : `check-data/profil-{profileId}.json`
- Fichiers snapshots : `check-data/snapshots/profil-{profileId}-{YYYY-MM-DD}.json`
- Pattern UTF-8 : `btoa(unescape(encodeURIComponent(...)))` / `decodeURIComponent(escape(atob(...)))`

**Clés localStorage** (par profil) :
```
check_sync_{profileId}_lastKnownVersion    ← SHA du dernier pull/push connu
check_sync_{profileId}_lastKnownPushedAt   ← ISO date
check_sync_{profileId}_lastPushedHash      ← contentHash au dernier push
check_sync_{profileId}_deviceId            ← généré au premier accès, permanent
check_sync_{profileId}_deviceName          ← "Appareil XXXX", éditable dans Réglages → Export
```

**`_syncMeta`** injecté dans le snapshot poussé, retiré avant `restoreState` :
```js
{ version: 1, pushedAt: ISO, pushedBy: deviceId, pushedByName: string, contentHash: string }
```

**`contentHash(snapshot)`** : djb2 en base36, clés triées alphabétiquement, 28 champs UI exclus (tout ce qui est éphémère : `uiScale`, `mode`, `showSettings`, `collapsed`, `syncStatus`, `dbLoaded`, etc.).

**`diagnoseSyncStatus(localHash, lastKnownVersion, lastPushedHash, remoteVersion)`** :
- `lastKnownVersion === null` → `"synced"` (jamais sync) ou `"remote-ahead"` (remote existe)
- Sinon : `localDiverged = localHash !== lastPushedHash` ; `remoteDiverged = remoteVersion !== lastKnownVersion`
- → `"synced"` / `"local-ahead"` / `"remote-ahead"` / `"conflict"`

**Hook `useSyncStatus`** (défini au niveau module dans `App.jsx`, avant `export default function App()`) :
- Paramètres : `{ buildAppState, activeProfileId, githubConfig, restoreState, dbLoaded, dailySnapshot }`
- Heartbeat 30s (skip si `document.hidden`)
- Auto-pull initial si `remote-ahead` au démarrage → toast 3s `"✓ Mise à jour depuis {deviceName}"`
- Auto-save si `status === "local-ahead"` : délai de grâce 2 min après montage, puis 30s
- Après push réussi : si `dailySnapshot` actif, appelle `maintainSnapshots(adapter, profileId, state)` (best-effort, silencieux)
- Mutex `inFlightRef` — libéré dans `finally` systématiquement
- Retourne : `{ status, remoteMeta, lastSyncAt, error, toast, push, pull, forceLocal, forceRemote, checkNow }`

**Statuts** : `unconfigured` · `checking` · `synced` · `local-ahead` · `remote-ahead` · `conflict` · `error` · `pushing` · `pulling`

**PAT + repo** : `localStorage` `check_github_pat` / `check_github_repo`. **Nom d'appareil** : champ texte dans Réglages → Export → Synchronisation GitHub (appelle `setDeviceName(profileId, val)` de sync.js + `setDeviceName` React). Chargé au montage et à chaque `switchProfile` via `getLocalSyncState(profileId).deviceName`.

**Modale résolution de conflit** (Z2) : overlay non-closable `zIndex: 250`, s'ouvre automatiquement via `useEffect` quand `syncHook.status === "conflict"`, ou via bouton "🔀 Résoudre le conflit" dans le popover SyncIndicator. Affiche version locale (nom d'appareil) vs distante (pushedByName + date). Trois actions :
- `⬇ Télécharger la version distante (JSON)` : appelle `downloadRemoteSnapshot()` qui fait `syncPull` + déclenche un téléchargement de fichier
- `⬇ Garder la distante` : `syncHook.forceRemote()` + ferme
- `☁ Garder la locale` : `syncHook.forceLocal()` → `doPush({ force: true })` + ferme

**Snapshots quotidiens** (Z2) : activé via toggle `syncDailySnapshot` (persisté en IndexedDB). Quand actif, `maintainSnapshots(adapter, profileId, state)` est appelé après chaque push réussi. Rétention glissante : cibles `[hier, −3j, −7j, −14j]` (slugs YYYY-MM-DD) ; fichiers hors cible supprimés ; snapshot "hier" toujours (ré)écrit. Fonctions exportées : `maintainSnapshots`, `listAvailableSnapshots`, `readSnapshot`. UI dans ExportTab (section Synchronisation) : toggle + bouton "📋 Voir les snapshots disponibles". Modale de restauration (`zIndex: 240`, closable) : liste des slugs disponibles, confirmation avant restauration, appelle `readSnapshot` + `restoreState`.

### GitHub Pages / CI-CD

`.github/workflows/deploy.yml` : `npm ci` → `npm run build` → `peaceiris/actions-gh-pages@v4`. `PUBLIC_URL: /check-app`.

---

## Décisions de design arrêtées

- **Coefficients** → appliqués aux points bruts (avant normalisation)
- **Questions bonus** → points ajoutés au score, exclus du maximum
- **Bonus exercice complet 🏆** → déclenché si toutes les questions non-bonus traitées ET score ≥ seuil%
- **Questions difficiles** → `tauxTraitement < seuilDifficile%` → rouge + gras
- **Questions pièges** → `tauxTraitement ≥ 50% ET tauxReussite < seuilPiege%` → orange + ⚠️
- **Rapport HTML — thèmes** → `light`, `dark`, `young`
- **Rapport HTML — compétences** → `"grid"` ou `"none"`
- **Rapport classe** → projection paysage, aucun nom d'élève, blocs bento configurables, compétences en barres horizontales, exercices en histogrammes verticaux pleine largeur
- **Duplication d'exercice/question** → écarté (avril 2026)
- **`useReducer`** → différé indéfiniment
- **Preset par défaut** à la création d'un DS → `"standard"`. DS existants sans `features` → merge défensif vers `"complet"`.

---

## Sur l'horizon — prochaines sessions

### Sessions de correction (Audit Opus, avril 2026)

**Ω1 ✅ et Ω2 ✅** — voir tableau historique. Tous les bugs listés corrigés.

**Ω3 — Refactor d'architecture** : intentionnellement ignoré pour Z1 (non bloquant en pratique). F1 (PERSISTED_KEYS) reste à faire si on consolide la liste des états persistés.

**Session PWA (≈ 2h, indépendante)** :

- B5 + F11 + F12 : Service Worker versioning + pré-cache + fallback offline

### Nouvelles fonctionnalités planifiées

**F2-b — Rapport de classe LaTeX** Fonction `genererRapportClasseTex(...)` dans `latex.js`. Même structure que le HTML : paysage, blocs `tcolorbox`, histogrammes `pgfplots`, barres compétences `tikz`. Bouton `.tex` dans le sous-accordéon ExportTab existant (clé `"rapportClasse"`).

**Autres items en attente**

- Mise à jour `HelpTab.jsx` : documenter fonctionnalités par DS, liens audio, bonus exercice complet, rapport de classe, sync
- Service Worker versionnement (mises à jour automatiques chez les collègues) — couplé session PWA
- Découpage `StatsTab`, `CorrectionTab`, `PrepTab` — explicitement différé, couplage fort

---

## Intégration tracker DS en ligne

Le tracker (`https://github.com/ProfFranco/tracker`) affiche l'avancement de correction. Source de vérité : **GitHub Gist public** `ProfFranco/092f02b8ae7c0edeffe8e68f9a5cb0c3` (fichiers `statut.csv` + `remarques.csv`), mis à jour depuis `tracker-updater.html`.

**Format `statut.csv`** (clé/valeur, une paire par ligne) :

```other
dsNumber,4 | currentStepIndex,3 | copiesCorrigées,18 | totalCopies,24
currentAverage,11.4 | currentMood,Concentré | estimatedReturnDate,15/04/2026
hasRemarks,true | quoteText,… | reportUrl,…
```

**Format `remarques.csv`** : `Titre,Contenu,Priorité` (NORMAL / IMPORTANT)

**`tracker-updater.html`** : import drag & drop JSON CHECK → calcul auto → push Gist via PAT localStorage.

**`tracker.html`** : lit depuis le Gist raw. Parsing CSV robuste (`indexOf(',')` sur premier séparateur + test `String(num) === value`). Cache localStorage hors-ligne, auto-rafraîchissement 5 min.

| **Donnée tracker** | **Source CHECK**              |
| ------------------ | ----------------------------- |
| `copiesCorrigées`  | `corriges.length`             |
| `totalCopies`      | `students.length`             |
| `currentAverage`   | Moyenne des notes normalisées |
| `hasRemarks`       | `true` si remarques non vides |
| Autres             | Saisie manuelle               |

---

## Note RGPD

Les données élèves ne transitent par GitHub que dans le dépôt **privé** de l'enseignant (synchro personnelle). Les collègues utilisant GitHub Pages ne font transiter aucune donnée.

---

## Historique des sessions

| **Session** | **Fichiers principaux**                                                                           | **Résumé**                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** ✅     | App.jsx, settings.js, latex.js                                                                    | Commentaire libre · Remarques configurables (activer/désactiver, créer, réordonner, malus)                                                                                                                                                                                                                                                                  |
| **B** ✅     | App.jsx                                                                                           | Confirmation avant suppression · Question bonus 🎁 (UI) · Coefficient par exercice (UI)                                                                                                                                                                                                                                                                     |
| **C** ✅     | calculs.js, latex.js                                                                              | Calcul score avec coefficients/bonus · Marqueurs 🎁 ✨ · Barème détaillé                                                                                                                                                                                                                                                                                     |
| **D** ✅     | App.jsx                                                                                           | CSV récapitulatif · Mode debug 🔬                                                                                                                                                                                                                                                                                                                           |
| **E** ✅     | App.jsx, html.js (nouveau)                                                                        | Onglet Résultats individuels · Aperçu HTML live · Export HTML + ZIP · Réglages HTML                                                                                                                                                                                                                                                                         |
| **E-bis** ✅ | html.js, App.jsx                                                                                  | Refonte html.js : 3 thèmes, nouvelle structure, stats deux colonnes, grille compétences, polices                                                                                                                                                                                                                                                            |
| **F** ✅     | App.jsx                                                                                           | Synthèse multi-DS (CSV cumulatif, `nomDS`/`dateDS` par exam)                                                                                                                                                                                                                                                                                                |
| **G** ✅     | App.jsx                                                                                           | Modal À propos · Onglet Aide · Réordonnancement exercices/questions · Refonte Export                                                                                                                                                                                                                                                                        |
| **H** ✅     | App.jsx, theme.js                                                                                 | Thème "Jeune" interface · Groupes éditables                                                                                                                                                                                                                                                                                                                 |
| **I** ✅     | App.jsx, IndexedDB                                                                                | Multi-profils (bases séparées, migration auto, sélecteur header) · CHANGELOG.md                                                                                                                                                                                                                                                                             |
| **J** ✅     | App.jsx                                                                                           | `tracker-updater.html` + `tracker.html` refondu (GitHub Gist)                                                                                                                                                                                                                                                                                               |
| **K** ✅     | App.jsx                                                                                           | Commentaires audio par question (AudioRecorder)                                                                                                                                                                                                                                                                                                             |
| **L** ✅     | Discussion                                                                                        | Distribution, licence, synchro inter-appareils, organisation header                                                                                                                                                                                                                                                                                         |
| **L bis** ✅ | App.jsx, nouveaux fichiers                                                                        | GitHub Pages CI/CD · Synchro JSON GitHub privé · Menu ⋯ header · LICENSE MIT · README                                                                                                                                                                                                                                                                       |
| **M** ✅     | Discussion                                                                                        | Logos et graphisme : splash, logo-light/dark/young, charte graphique                                                                                                                                                                                                                                                                                        |
| **M bis** ✅ | App.jsx, html.js, latex.js, helpers.js                                                            | Liens audio dans exports (HTML cliquable + LaTeX `\href`) · `buildAudioFilename` · réglages URL/extension                                                                                                                                                                                                                                                   |
| **N** ✅     | App.jsx, calculs.js, latex.js, html.js, helpers.js, calculs.test.js                               | Revue Opus : `buildAppState`, `restoreState`, `slugify`, `validateState`, 45 tests unitaires, avertissement PAT                                                                                                                                                                                                                                             |
| **O** ✅     | App.jsx, latex.js                                                                                 | Onglet 🏫 Établissement · Accordéons Correction · Modal Réglages 540px · Pied de page LaTeX dynamique                                                                                                                                                                                                                                                       |
| **P** ✅     | App.jsx, HelpTab.jsx (nouveau)                                                                    | HelpTab extrait · Tutoriel 7 étapes + référence accordéons · correctif scroll                                                                                                                                                                                                                                                                               |
| **Q** ✅     | App.jsx, index.js                                                                                 | Animation fadeSlideIn · Logo jeune · Bug bulles DS corrigé                                                                                                                                                                                                                                                                                                  |
| **R** ✅     | App.jsx, OverviewTab.jsx (nouveau)                                                                | Onglet 📋 Vue d'ensemble · Dropdown sélecteur DS · Bug note correction · Bug option Brute /20                                                                                                                                                                                                                                                               |
| **S** ✅     | App.jsx                                                                                           | Bouton 🔓 Dissocier GitHub · Renommage `gk`→`gradeKey`, `rkk`→`remarkKey`, `cc`→`compColor`                                                                                                                                                                                                                                                                 |
| **T** ✅     | App.jsx → 6 fichiers (Claude Code)                                                                | Découpage God component : `db.js`, `Charts.jsx`, `AudioRecorder.jsx`, `DebugModal.jsx`, `SettingsModal.jsx`, `ExportTab.jsx`. App.jsx : 2930 → 1590 lignes (−46%)                                                                                                                                                                                           |
| **U** ✅     | App.jsx, settings.js, calculs.js, SettingsModal.jsx, html.js, latex.js, ExportTab.jsx, Charts.jsx | F1 question piège ⚠️ · F3 historique progression inter-DS (ProgressionChart + ProgressionRadar)                                                                                                                                                                                                                                                             |
| **V** ✅     | settings.js, calculs.js, App.jsx, SettingsModal.jsx, html.js, latex.js, ExportTab.jsx             | F — Bonus exercice complet 🏆 · bugfix blocDetailExercices · stats HTML centrées                                                                                                                                                                                                                                                                            |
| **W** ✅     | App.jsx (1 caractère), CONTEXTE_CHECK                                                             | Bugfix iframe aperçu HTML · Toilettage CONTEXTE_CHECK (950 → 431 lignes)                                                                                                                                                                                                                                                                                    |
| **X** ✅     | App.jsx, settings.js, ExportTab.jsx, html.js, latex.js                                            | Fonctionnalités par DS : sélecteur preset ♙♜♔♞ · `FEATURE_PRESETS` + `DEFAULT_FEATURES` · merge défensif · masquage UI · propagation exports                                                                                                                                                                                                                |
| **Y** ✅     | SettingsModal.jsx, App.jsx, html.js, ExportTab.jsx                                                | Améliorations Réglages : renommage "Notes", note contextuelle, flash "✓ Sauvegardé" · F2 Rapport de classe HTML : projection paysage, blocs bento, stats KPI, histo pleine largeur, compétences barres horizontales, histos exercices verticaux · Aperçu iframe "Toute la classe" · Fix note min/max (filtre corriges) · Fix iframe rechargement (clé fixe) |
| **Ω1** ✅    | App.jsx, AudioRecorder.jsx, SettingsModal.jsx, html.js, Charts.jsx                                | Corrections bugs rapides : B1/B2/B4/F8/F9/F10/N1/N2/N5/N6/N13 · iframe Résultats : panneau persistant (display CSS)                                                                                                                                                                                                                                        |
| **Ω2** ✅    | App.jsx, calculs.js, Charts.jsx, html.js                                                          | Bugs conséquents : B6 studentTotalWeighted+bonusConfig · F2b dépendances useMemo · F3 progressionStudentId · N7/N8/N9 nettoyage · piège HTML corrigé (taux classe vs score individuel)                                                                                                                                                                        |
| **Ω3** ⏭️   | —                                                                                                 | Ignoré (non bloquant) — F1 PERSISTED_KEYS reporté                                                                                                                                                                                                                                                                                                          |
| **Z1** ✅    | sync.js (nouveau), sync.test.js (nouveau), SyncIndicator.jsx (nouveau), App.jsx                   | Synchronisation intelligente : `contentHash`, `diagnoseSyncStatus`, adapter GitHub abstrait, hook `useSyncStatus` (heartbeat 30s · auto-pull initial · auto-save grâce 2min · mutex) · pastille header · toast · 13 tests Jest                                                                                                                               |
| **Z2** ✅    | sync.js, App.jsx, SyncIndicator.jsx, SettingsModal.jsx, ExportTab.jsx                             | Champ nom d'appareil éditable (Réglages → Export) · Modale résolution de conflit (non-closable, zIndex 250, téléchargement distant, forceLocal/forceRemote) · Snapshots quotidiens (4 paliers glissants, maintainSnapshots/listAvailableSnapshots/readSnapshot, UI ExportTab + modale restauration)                                                          |
| **AA** ✅    | settings.js, App.jsx, SettingsModal.jsx                                                           | Réglages par DS : `exam.settings` (normMethod, normParams, seuilDifficile/Piege/Reussite, malusPaliers, malusMode, seuilsComp, bonusCompletConfig) · `DEFAULT_EXAM_SETTINGS` dans settings.js · variable calculée `activeExamSettings` · helpers `setExamSetting` / `resetExamSettings` · états profil renommés `defaultX` · rétrocompat `else if` dans restoreState · onglets Évaluation et Notes restructurés en deux accordéons (DS actif / Valeurs par défaut) |
| **AB** ✅    | App.jsx                                                                                           | Modale création de profil avec import optionnel : champ inline dropdown remplacé par bouton "+" ouvrant une modale `zIndex: 280` · champ nom + section "Importer depuis un profil existant" (masquée si profil unique) · sélecteur profil source pré-rempli sur l'actif · 6 cases (élèves, export, remarques, établissement, calcul, évaluation) toutes décochées par défaut · `createProfileWithImport` async : crée le profil vide, charge l'état source via `loadDB(sourceId)`, copie les clés sélectionnées, sauvegarde dans la nouvelle base · profil non activé automatiquement |
| **AC** ✅    | starmap.js (nouveau), App.jsx, SettingsModal.jsx, html.js                                         | Carte Stellaire : module canvas autonome `starmap.js` (PRNG LCG seedé, MST Kruskal, glow/reflet/fantôme, oscillation animée) · `StarMapModal` dans App.jsx (RAF animé, tooltip survol, raccourci `S`/`Escape`) · `htmlConfig.starMap` → rendu PNG offscreen dans `genererHtmlEleve` · checkbox ✦ Carte Stellaire dans SettingsModal · `violet` + `radiusSm` ajoutés aux 3 palettes `paletteTheme()` de html.js |
| **AD** ✅    | AccueilTab.jsx (nouveau), App.jsx                                                                 | Tableau de bord : clic logo → `setMode("accueil")` · `PROFILE_COLORS` (5 couleurs) · `AccueilTab` : header pill-profil dropdown, 4 cartes stats, colonne "Dernier DS" (mini-stats/barres ARNV/3 boutons) + colonne "Historique" 5 DS, pied de page version+établissement+CHANGELOG · calculs inline (sans calculs.js) : moyenne classe, min/max, taux de correction DS courant, compétences, count corrigés |
| **AE** ✅    | Charts.jsx, App.jsx, DebugModal.jsx                                                               | Micro-correctifs audit : N3 (`studentTotalWeighted` utilisé → rien touché) · F7 tooltip `<title>` SVG sur labels X tronqués dans ProgressionChart et ProgressionRadar · N12 DebugModal auto-généré depuis `buildAppState()` (~40 clés au lieu de 8 codées en dur) + N13 fix `typeof count === "number" && count > 1` |
| **B3** ✅    | App.jsx, AccueilTab.jsx                                                                           | 🔒 Notes privées enseignant par élève (persistées, non exportées) · 💎 Perles : citations par élève avec contexte, ajout/suppression inline (non exportées) · Bandeau toggle `▾/▸ Commentaires & notes` pour masquer les 3 blocs (commentaire élève + note privée + perles), badge de contenu quand replié · Carte "Perle du moment" dans AccueilTab avec bouton 🔀 |
| **AF** ✅    | App.jsx, html.js                                                                                  | Mise en page rapport HTML : `blockOrder` + `blockLayout` dans `htmlConfig` · zone CSS Grid 2 colonnes dans `genererHtmlEleve` · règle anti-orphelin (half seul → promu full) · modal `showLayoutModal` (▲▼ réordonnancement, toggle Plein/Demi, blocs inactifs grisés) · bouton "⊞ Mise en page" dans barre Résultats (mode individuel) · bouton "⚙ Réglages export" dans le modal · image starmap : `max-width:660px;width:100%;margin:auto` |

---

## Instructions pour Claude

- Le fichier `CONTEXTE_CHECK.md` est fourni dans le projet Claude à chaque session — le lire en priorité.
- Les fichiers source sont uploadés à la demande (`App.jsx`, `calculs.js`, `latex.js`, `html.js`, `settings.js`, `theme.js`, `index.js`, composants extraits).
- Travaille directement sur le code — pas besoin de réexpliquer l'architecture.
- Fournis des patches chirurgicaux (blocs AVANT / APRÈS) plutôt que le fichier complet, sauf si les modifications sont trop nombreuses.
- **Les snippets de code doivent inclure l'indentation réelle** telle qu'elle apparaîtra dans le fichier.
- Je valide les changements en remplaçant le fichier et en observant le résultat dans le navigateur (`npm start` tourne en permanence).
- **Priorité du moment : aucune urgence.** Sessions AA–AE + B3 + AF terminées. Prochaine session probable : révision UI Mise en page (drag-and-drop ☰), F2-b (rapport classe LaTeX) ou session PWA (B5/F11/F12).