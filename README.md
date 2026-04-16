# C.H.E.C.K.

**Correcteur Hautement Efficace avec Cases à Kocher**

Application web progressive (PWA) pour corriger des copies, calculer les notes et générer des rapports individuels (HTML et PDF via LaTeX). Conçue pour les enseignants du secondaire et du supérieur.

---

## Pour les collègues — installation en 3 étapes

**Aucun terminal, aucune installation à faire sur votre machine.**

1. **Ouvrez l'URL** dans votre navigateur (Chrome, Safari, Edge, Firefox).
2. **Installez l'application** : dans Chrome, cliquez sur l'icône ⊕ dans la barre d'adresse (ou « Installer C.H.E.C.K. ») ; dans Safari sur iPhone/iPad, utilisez le bouton Partager puis « Sur l'écran d'accueil ».
3. **Lancez C.H.E.C.K.** depuis votre bureau ou écran d'accueil — elle fonctionne **hors ligne**.

> **Vos données restent sur votre appareil.** Aucune information (noms d'élèves, notes, commentaires) ne transite par un serveur. Tout est stocké localement dans votre navigateur (IndexedDB). L'hébergement GitHub Pages sert uniquement à distribuer le code de l'application.

---

## Fonctionnalités principales

- **Préparation** : créer des devoirs (exercices, questions, items, compétences A/N/R/V), choisir un preset de fonctionnalités (♙ Simple / ♜ Standard / ♔ Complet / ♞ Personnalisé), importer une liste d'élèves en CSV, gérer les groupes (tiers-temps, groupes pédagogiques), définir coefficients et questions bonus 🎁
- **Correction** : cocher les items question par question, ajouter des remarques de présentation avec malus automatique, enregistrer un commentaire audio 🎙️ par question, gérer les absents, bonus exercice complet 🏆
- **Résultats** : aperçu live du rapport HTML de chaque élève ; option « 📊 Toute la classe » pour le rapport de classe en projection (paysage A4)
- **Vue d'ensemble** : tableau croisé élèves × questions avec code couleur, tri par colonne, navigation directe vers la correction
- **Stats** : distribution des notes, compétences, questions difficiles et pièges ⚠️, classement ; sous-onglet **Progression** inter-DS (courbe élève + moyenne classe, radar multi-DS)
- **Export** : rapports HTML individuels (ZIP), sources LaTeX compilables avec XeLaTeX, rapport de classe HTML, CSV récapitulatif, synthèse multi-DS annuelle
- **Multi-profils** : plusieurs enseignants peuvent utiliser l'app sur le même appareil avec des données séparées
- **Synchronisation** : sauvegarde/restauration vers un dépôt GitHub privé (optionnel)

---

## Pour les développeurs

### Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | React (Create React App) |
| Persistance | IndexedDB (zéro backend) |
| Export PDF | XeLaTeX (script bash fourni) |
| Export HTML | Générateur autonome (`html.js`) |
| PWA | Service Worker (`sw.js`) |
| CI/CD | GitHub Actions → GitHub Pages |

### Structure du projet

```
check-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js                  ← Service Worker PWA
│   ├── CHANGELOG.md
│   └── logos/
│       ├── splash.png
│       ├── logo-light.png
│       ├── logo-dark.png
│       └── logo-young.png
└── src/
    ├── index.js
    ├── App.jsx                ← Composant principal
    ├── SettingsModal.jsx      ← Modale Réglages (5 onglets)
    ├── ExportTab.jsx          ← Onglet Export
    ├── HelpTab.jsx            ← Onglet Aide
    ├── OverviewTab.jsx        ← Onglet Vue d'ensemble
    ├── components/
    │   ├── Charts.jsx         ← Composants graphiques (radar, histogramme, progression)
    │   ├── AudioRecorder.jsx  ← Enregistrement audio par question
    │   └── DebugModal.jsx     ← Modal debug
    ├── config/
    │   ├── settings.js        ← Compétences, remarques, seuils, groupes, presets
    │   └── theme.js           ← Palettes clair / sombre / jeune
    └── utils/
        ├── calculs.js         ← Scores, normalisation, malus
        ├── calculs.test.js    ← Tests unitaires (45 tests)
        ├── db.js              ← Persistance IndexedDB multi-profils
        ├── helpers.js         ← Utilitaires partagés
        ├── latex.js           ← Générateur LaTeX
        └── html.js            ← Générateur HTML autonome
```

### Développement local

```bash
# Cloner le dépôt
git clone https://github.com/<votre-compte>/check-app.git
cd check-app

# Installer les dépendances
npm install

# Lancer en développement (hot reload)
npm start
```

L'application est accessible sur `http://localhost:3000`.

### Déploiement

Le déploiement est automatisé par la GitHub Action `.github/workflows/deploy.yml`.
Il suffit de pousser sur `main` :

```bash
git add .
git commit -m "votre message"
git push
```

L'action construit l'application et met à jour la branche `gh-pages` automatiquement (2–3 minutes).

**Configuration requise :**

1. Dans les paramètres du dépôt GitHub → Pages → Source : sélectionner la branche `gh-pages`.
2. Dans `deploy.yml`, remplacer `/check-app` par le nom exact de votre dépôt dans la ligne `PUBLIC_URL`.

### Personnalisation

Tout ce qui concerne votre établissement et vos préférences pédagogiques est centralisé dans `src/config/settings.js` : nom de l'établissement, classe, compétences, remarques prédéfinies, seuils de notation, paliers de malus, presets de fonctionnalités.

---

## Licence

MIT © Samuel Franco — voir [LICENSE](LICENSE).

Le code est libre d'utilisation, de modification et de redistribution. Les contributions sont les bienvenues.

---

## Signaler un problème

Ouvrez une *issue* sur GitHub ou contactez l'auteur directement.