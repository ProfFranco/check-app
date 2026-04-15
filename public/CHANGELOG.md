## v 1.0 — avril 2026

### Architecture
- Découpage du composant principal en modules indépendants (`db.js`, `Charts.jsx`, `AudioRecorder.jsx`, `DebugModal.jsx`, `SettingsModal.jsx`, `ExportTab.jsx`) — App.jsx allégé de 46 %
- Couverture de tests unitaires : 45 tests sur les fonctions de calcul (`calculs.test.js`)

### Fonctionnalités par devoir
- Sélecteur de preset ♙ Simple / ♜ Standard / ♔ Complet / ♞ Personnalisé
- Chaque devoir porte ses propres fonctionnalités : compétences A/N/R/V, coefficients, questions bonus 🎁, bonus exercice complet 🏆, malus automatique, questions pièges ⚠️
- L'interface s'adapte dynamiquement aux fonctionnalités activées

### Progression inter-DS
- Sous-onglet **Progression** dans les Stats : courbe note élève + moyenne classe par DS
- Radar multi-DS (basculement automatique vers courbe au-delà de 8 DS)
- Toggle brut / normalisé

### Bonus exercice complet 🏆
- Déclenché si toutes les questions non-bonus sont traitées et le score dépasse le seuil
- Configurable : mode fixe ou pourcentage, valeur du bonus, seuil de déclenchement

### Questions pièges ⚠️
- Détection automatique : taux de traitement ≥ 50 % mais taux de réussite sous le seuil
- Marquage dans les stats, les exports HTML et LaTeX

### Correctifs
- Aperçu HTML dans l'onglet Résultats : stabilisation de l'iframe (ne se recharge plus à chaque navigation)
- Nom des DS dans les bulles de navigation corrigé
- Coloration des notes dans l'onglet Correction corrigée

---

## v 0.91

### Correctifs
- toilettage du code et découpage en plusieurs fichiers pour une meilleure lisibilité
- variables mal nommées remplacées
- Dissociation GitHub possible

## v 0.9 - 9 avril 2026

### Nouvelle section : vue d'ensemble
- Ajout d'une section permettant de visualiser en un clin d'oeil les résultats des étudiants sous forme de tableau cliquable

### Enregistrements audio
- Possibilité de générer des liens url vers les enregistrements générés, si l'utilisateur donne la racine des liens en question

### Interface
- Le DS actuel devient cliquable pour sélectionner à la volée le DS analysé

### Correctifs
- Erreur de coloration des notes dans l'onglet "Correction"
- Nom des DS dans les bulles de navigation cohérent
- Mise à jour du fichier d'aide

## v 0.80 - avril 2026

### Section d'aide
- Section complètement remaniée, pour l'instant rédigée par IA
- Apparition d'un tutoriel

### Interface
- Ajout de l'onglet "Etablissement" pour paramétrer le nom de l'établissement, de la classe, des copies corrigées

### Correctifs
- Corrections nombreuses dans le code après revue
- Fichier de test des fonctions de calculs

## v 0.72  - avril 2026

### Distribution & infrastructure
- Déploiement automatique sur GitHub Pages via GitHub Actions
- Licence MIT ajoutée (`LICENSE`)
- `README.md` complet : guide d'installation en 3 étapes pour les utilisateurs (zéro terminal), documentation technique pour les développeurs, note RGPD

### Synchronisation inter-appareils ☁️
- Nouvelle section **Synchronisation** dans l'onglet Export : sauvegarde et restauration de l'état complet via un dépôt GitHub privé
- Configuration du PAT et du dépôt dans Réglages > Export > Synchronisation GitHub
- Les données restent dans votre propre dépôt privé ; elles ne transitent que par l'API GitHub

### Interface
- **Menu ⋯** dans le header (toujours visible, à droite) : regroupe le zoom, le sélecteur de thème et l'accès À propos
- Sélecteur de thème : 3 boutons icônes distincts (☀️ 🌙 🎨) avec indication de l'actif, dans le menu ⋯
- Boutons 💾 / 📂 toujours visibles (y compris sur mobile)

### Correctif
- Onglet Résultats : l'aperçu HTML ne disparaît plus de façon intempestive
- Onglet Réglages : erreurs corrigées dans le menu des normalisations

## v 0.7.1

### 🎙️ Commentaires audio par question

- Nouveau bouton **🎙️** dans le bandeau de chaque question (onglet Correction)
- Enregistrement via le microphone de l'appareil, directement dans l'interface
- Widget inline : Enregistrer · Arrêter · Réécouter · Télécharger
- Fichier nommé automatiquement : `DS_NOM_Exercice_Question.mp4` (ou `.webm`)
- Compatible Safari Mac, Chrome/Chromium, iOS Safari
- Aucune persistance : le fichier audio n'est pas stocké dans l'application

## v 0.7 — avril 2026

### Multi-profils

- Sélecteur de profil dans le header (👤)
- Isolation totale par profil (bases IndexedDB séparées)
- Créer, renommer, supprimer des profils
- Migration automatique des données existantes vers "Profil 1"

### Nouveautés récentes dans le modal À propos

- Ce journal des mises à jour 📋

## v 0.6 — avril 2026

### Interface

- Thème "Jeune" (lavande, Nunito, couleurs vives)
- Groupes pédagogiques éditables dans les Réglages
- Onglet Aide avec guide complet
- Modal "À propos" (ℹ️)

### Export

- Refonte de l'onglet Export (3 sections déroulables)
- Réordonnancement des exercices et questions (↑/↓)