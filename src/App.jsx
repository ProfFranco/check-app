// ═══════════════════════════════════════════════════════════════════
// C.H.E.C.K. — Application principale
// ═══════════════════════════════════════════════════════════════════
// Ce fichier contient l'application complète.
// La configuration est dans src/config/settings.js
// Les fonctions de calcul dans src/utils/calculs.js
// Le générateur LaTeX dans src/utils/latex.js
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Imports depuis les modules du projet ────────────────────────
import {
  APP_VERSION, COMPETENCES, REMARQUES, TYPES_GROUPES, TT_GROUPE, FEATURE_PRESETS, DEFAULT_FEATURES,
  DEFAULT_SEUILS, DEFAULT_SEUIL_DIFFICILE, DEFAULT_SEUIL_PIEGE,
  DEFAULT_MALUS_PALIERS, DEFAULT_MALUS_MODE,
  DEFAULT_NORM, TT_COEFF, DEFAULT_REMARQUES_ACTIVES, ETABLISSEMENT,
  DEFAULT_BONUS_COMPLET,
} from "./config/settings";
import { lightTheme, darkTheme, youngTheme, FONT_TITLE, FONT_BODY, FONT_MONO, FONTS_URL } from "./config/theme";
import {
  uid, gradeKey, remarkKey, clamp, compColor,
  questionScore, exerciseScore, bonusCompletPoints, studentTotal, examTotal, noteSur20,
  studentTotalWeighted, examTotalWeighted,
  ratioJustesse, ratioEfficacite,
  notesParCompetence, competencePct,
  exercisePctAbsolute, exercisePctRelative,
  countMalusRemarks, malusAuto, malusTotal,
  normaliser, importCSV, downloadFile, treatedKey, validateState
} from "./utils/calculs";
import { genererGabarit, genererDocumentComplet, genererDocumentsIndividuels, genererScriptCompilation } from "./utils/latex";
import { genererHtmlEleve, genererHtmlTous, DEFAULT_HTML_CONFIG, DEFAULT_RAPPORT_CLASSE_CONFIG, genererRapportClasse } from "./utils/html";
import { buildAudioFilename } from "./utils/helpers";
import { loadDB, saveDB, loadMeta, saveMeta, initProfiles, profileDBName, openNamedDB } from "./utils/db";
import { RadarChart, MiniRadar, MiniRadarEx, Histo, PBar, ProgressionChart, ProgressionRadar } from "./components/Charts";
import AudioRecorder from "./components/AudioRecorder";
import DebugModal from "./components/DebugModal";
import SettingsModal from "./SettingsModal";
import ExportTab from "./ExportTab";
import HelpTab from "./HelpTab";
import OverviewTab from "./OverviewTab";
// ─── Logos (dans public/logos/) ──────────────────────────────────
const LOGO_LIGHT  = process.env.PUBLIC_URL + "/logos/logo-light.png";
const LOGO_DARK   = process.env.PUBLIC_URL + "/logos/logo-dark.png";
const LOGO_YOUNG  = process.env.PUBLIC_URL + "/logos/logo-young.png";
const SPLASH_IMG = process.env.PUBLIC_URL + "/logos/splash.png";

// ─── Raccourcis ──────────────────────────────────────────────────

const FONT = FONT_TITLE;
const FONT_B = FONT_BODY;
const MONO = FONT_MONO;

// ─── Charts : voir src/components/Charts.jsx ─────────────────────

// ─── IndexedDB : voir src/utils/db.js ────────────────────────────

// ─── AudioRecorder, DebugModal : voir src/components/ ────────────

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  // ─── State ───
  var _appTheme = useState("light"); var setAppTheme = _appTheme[1]; var appTheme = _appTheme[0];
  var dark = appTheme === "dark";
  var _splash = useState(true); var setSplash = _splash[1]; var showSplash = _splash[0];
  var th = appTheme === "dark" ? darkTheme : appTheme === "young" ? youngTheme : lightTheme;
  var FONT_B = appTheme === "young" ? "'Nunito', 'Segoe UI', system-ui, sans-serif" : FONT_BODY;
  var _groupesDef = useState([]); var setGroupesDef = _groupesDef[1]; var groupesDef = _groupesDef[0];

  var _exams = useState([]); var setExams = _exams[1]; var exams = _exams[0];
  var _students = useState([]); var setStudents = _students[1]; var students = _students[0];
  var _grades = useState({}); var setGrades = _grades[1]; var grades = _grades[0];
  var _remarks = useState({}); var setRemarks = _remarks[1]; var remarks = _remarks[0];
  var _absents = useState({}); var setAbsents = _absents[1]; var absents = _absents[0];
  var _groupes = useState({}); var setGroupes = _groupes[1]; var groupes = _groupes[0];
  var _activeExamId = useState(null); var setActiveExamId = _activeExamId[1]; var activeExamId = _activeExamId[0];
  var _nomDS = useState(""); var setNomDS = _nomDS[1]; var nomDS = _nomDS[0];
  var _dateDS = useState(""); var setDateDS = _dateDS[1]; var dateDS = _dateDS[0];
  var _mode = useState("prep"); var setMode = _mode[1]; var mode = _mode[0];
  var _seuils = useState(DEFAULT_SEUILS); var setSeuils = _seuils[1]; var seuils = _seuils[0];
  var _normMethod = useState(DEFAULT_NORM.method); var setNormMethod = _normMethod[1]; var normMethod = _normMethod[0];
  var _normParams = useState(DEFAULT_NORM.params); var setNormParams = _normParams[1]; var normParams = _normParams[0];
  var _seuilDifficile = useState(DEFAULT_SEUIL_DIFFICILE); var setSeuilDifficile = _seuilDifficile[1]; var seuilDifficile = _seuilDifficile[0];
  var _seuilReussite = useState(50); var setSeuilReussite = _seuilReussite[1]; var seuilReussite = _seuilReussite[0];
  var _seuilPiege = useState(DEFAULT_SEUIL_PIEGE); var setSeuilPiege = _seuilPiege[1]; var seuilPiege = _seuilPiege[0];
  var _bonusCompletConfig = useState(DEFAULT_BONUS_COMPLET); var setBonusCompletConfig = _bonusCompletConfig[1]; var bonusCompletConfig = _bonusCompletConfig[0];
  var _gabaritTex = useState(""); var setGabaritTex = _gabaritTex[1]; var gabaritTex = _gabaritTex[0];
  var _malusPaliers = useState(DEFAULT_MALUS_PALIERS); var setMalusPaliers = _malusPaliers[1]; var malusPaliers = _malusPaliers[0];
  var _malusMode = useState(DEFAULT_MALUS_MODE); var setMalusMode = _malusMode[1]; var malusMode = _malusMode[0];
  var _malusManuel = useState({}); var setMalusManuel = _malusManuel[1]; var malusManuel = _malusManuel[0];
  var _commentaires = useState({}); var setCommentaires = _commentaires[1]; var commentaires = _commentaires[0];
  var _remarquesActives = useState(DEFAULT_REMARQUES_ACTIVES); var setRemarquesActives = _remarquesActives[1]; var remarquesActives = _remarquesActives[0];
  var _remarquesCustom = useState([]); var setRemarquesCustom = _remarquesCustom[1]; var remarquesCustom = _remarquesCustom[0];
  var allRemarquesBase = REMARQUES.concat(remarquesCustom);
  var _remarquesOrdre = useState([]); var setRemarquesOrdre = _remarquesOrdre[1]; var remarquesOrdre = _remarquesOrdre[0];
  var _newRemLabel = useState(""); var setNewRemLabel = _newRemLabel[1]; var newRemLabel = _newRemLabel[0];
  var _newRemIcon = useState("\uD83D\uDCCC"); var setNewRemIcon = _newRemIcon[1]; var newRemIcon = _newRemIcon[0];
  var _newRemMalus = useState(true); var setNewRemMalus = _newRemMalus[1]; var newRemMalus = _newRemMalus[0];
  var _showSettings = useState(false); var setShowSettings = _showSettings[1]; var showSettings = _showSettings[0];
  var _settingsTab = useState("calcul"); var setSettingsTab = _settingsTab[1]; var settingsTab = _settingsTab[0];
  var _correctionOpen = useState({ remarques: true, groupes: false }); var setCorrectionOpen = _correctionOpen[1]; var correctionOpen = _correctionOpen[0];
  var _showDebug = useState(false); var setShowDebug = _showDebug[1]; var showDebug = _showDebug[0];
  var _csvConfig = useState({ sep: ";", dec: ",", cols: { rang: true, nom: true, prenom: true, absent: true, note: true, noteNorm: true, groupe: false, competences: false, malus: false } }); var setCsvConfig = _csvConfig[1]; var csvConfig = _csvConfig[0];
  var _htmlPresets = useState([]); var setHtmlPresets = _htmlPresets[1]; var htmlPresets = _htmlPresets[0];
  var _htmlConfig = useState({ theme: "light", noteNorm: true, noteBrute: false, rang: true, statsEleve: { justesse: true, efficacite: true, malus: true }, statsClasse: { moy: true, minMax: true, sigma: false }, competences: "grid", commentaire: true, detailExercices: true, bareme: false, histogramme: true }); var setHtmlConfig = _htmlConfig[1]; var htmlConfig = _htmlConfig[0];  var _htmlStudentId = useState(null); var setHtmlStudentId = _htmlStudentId[1]; var htmlStudentId = _htmlStudentId[0];
  var _commentaireDS = useState({}); var setCommentaireDS = _commentaireDS[1]; var commentaireDS = _commentaireDS[0];
  var _rapportClasseConfig = useState(DEFAULT_RAPPORT_CLASSE_CONFIG); var setRapportClasseConfig = _rapportClasseConfig[1]; var rapportClasseConfig = _rapportClasseConfig[0];
  var _soundLinksEnabled = useState(false); var setSoundLinksEnabled = _soundLinksEnabled[1]; var soundLinksEnabled = _soundLinksEnabled[0];
  var _soundBaseUrl = useState(""); var setSoundBaseUrl = _soundBaseUrl[1]; var soundBaseUrl = _soundBaseUrl[0];
  var _soundAudioExt = useState("webm"); var setSoundAudioExt = _soundAudioExt[1]; var soundAudioExt = _soundAudioExt[0];

  var _si = useState(0); var setSi = _si[1]; var si = _si[0];
  var _ei = useState(0); var setEi = _ei[1]; var ei = _ei[0];
  var _uiScale = useState(1); var setUiScale = _uiScale[1]; var uiScale = _uiScale[0];
  var _showSearch = useState(false); var setShowSearch = _showSearch[1]; var showSearch = _showSearch[0];
  var _searchTerm = useState(""); var setSearchTerm = _searchTerm[1]; var searchTerm = _searchTerm[0];
  var _showMore = useState(false); var setShowMore = _showMore[1]; var showMore = _showMore[0];
  var _showDsMenu = useState(false); var setShowDsMenu = _showDsMenu[1]; var showDsMenu = _showDsMenu[0];
  var _tab = useState("general"); var setTab = _tab[1]; var tab = _tab[0];
  var _statGroup = useState("all"); var setStatGroup = _statGroup[1]; var statGroup = _statGroup[0];
  var _dbLoaded = useState(false); var setDbLoaded = _dbLoaded[1]; var dbLoaded = _dbLoaded[0];
  // Prep state
  var _collapsed = useState({}); var setCollapsed = _collapsed[1]; var collapsed = _collapsed[0];
  var _collapsedExams = useState({}); var setCollapsedExams = _collapsedExams[1]; var collapsedExams = _collapsedExams[0];
  var _showGroupes = useState(false); var setShowGroupes = _showGroupes[1]; var showGroupes = _showGroupes[0];
  var _csortMode = useState("rang"); var csortMode = _csortMode[0]; var setCsortMode = _csortMode[1];
  var _progressionStudentId = useState(null); var progressionStudentId = _progressionStudentId[0]; var setProgressionStudentId = _progressionStudentId[1];
  var _progressionShowNorm = useState(false); var progressionShowNorm = _progressionShowNorm[0]; var setProgressionShowNorm = _progressionShowNorm[1];
  var _progressionViewMode = useState("courbe"); var progressionViewMode = _progressionViewMode[0]; var setProgressionViewMode = _progressionViewMode[1];
  var _confirmDelete = useState(null); var setConfirmDelete = _confirmDelete[1]; var confirmDelete = _confirmDelete[0];
  var _featOpen = useState(true); var setFeatOpen = _featOpen[1]; var featOpen = _featOpen[0];
  var _exportOpen = useState({ eleves: true, enseignant: true, gabarit: false, rapportClasse: false, synthese: false, github: false, sync: true, sound: false }); var setExportOpen = _exportOpen[1]; var exportOpen = _exportOpen[0];
  var _showApropos = useState(false); var setShowApropos = _showApropos[1]; var showApropos = _showApropos[0];
  var _showChangelog = useState(false); var setShowChangelog = _showChangelog[1]; var showChangelog = _showChangelog[0];
  var _changelogText = useState(""); var setChangelogText = _changelogText[1]; var changelogText = _changelogText[0];
  var _githubPat = useState(""); var setGithubPat = _githubPat[1]; var githubPat = _githubPat[0];
  var _githubRepo = useState(""); var setGithubRepo = _githubRepo[1]; var githubRepo = _githubRepo[0];
  var _syncStatus = useState(""); var setSyncStatus = _syncStatus[1]; var syncStatus = _syncStatus[0];
  var _syncDate = useState(""); var setSyncDate = _syncDate[1]; var syncDate = _syncDate[0];
  var _syncLoading = useState(false); var setSyncLoading = _syncLoading[1]; var syncLoading = _syncLoading[0];
  var _profiles = useState([]); var setProfiles = _profiles[1]; var profiles = _profiles[0];
  var _activeProfileId = useState(null); var setActiveProfileId = _activeProfileId[1]; var activeProfileId = _activeProfileId[0];
  var _showProfileMenu = useState(false); var setShowProfileMenu = _showProfileMenu[1]; var showProfileMenu = _showProfileMenu[0];
  var _editingProfileId = useState(null); var setEditingProfileId = _editingProfileId[1]; var editingProfileId = _editingProfileId[0];
  var _editingProfileName = useState(""); var setEditingProfileName = _editingProfileName[1]; var editingProfileName = _editingProfileName[0];
  var _newProfileName = useState(""); var setNewProfileName = _newProfileName[1]; var newProfileName = _newProfileName[0];
  var _synthese = useState([]); var setSynthese = _synthese[1]; var synthese = _synthese[0];
  var _etablissement = useState({
    nom: ETABLISSEMENT.nom,
    classe: ETABLISSEMENT.classe,
    matricule: ETABLISSEMENT.matricule,
    promotion: ETABLISSEMENT.promotion,
    anneeScolaire: ETABLISSEMENT.anneeScolaire,
  }); var setEtablissement = _etablissement[1]; var etablissement = _etablissement[0];
  var searchInputRef = useRef();
  var fileRef = useRef();
  var csvRef = useRef();
  var touchRef = useRef({ x: 0, y: 0 });


  // ─── Persistence: load from IndexedDB on mount ───
  useEffect(function() {
    loadMeta().then(function(meta) {
      // Premier lancement : migration depuis l'ancienne base
      if (!meta) return initProfiles();
      return meta;
    }).then(function(meta) {
      setProfiles(meta.profiles);
      setActiveProfileId(meta.activeId);
      return loadDB(meta.activeId);
    }).then(function(saved) {
      if (saved) restoreState(saved);
      setDbLoaded(true);
      // Charger la config GitHub depuis localStorage (stockée séparément des données métier)
      var savedPat = localStorage.getItem("check_github_pat") || "";
      var savedRepo = localStorage.getItem("check_github_repo") || "";
      if (savedPat) setGithubPat(savedPat);
      if (savedRepo) setGithubRepo(savedRepo);
    });
  }, []);

  // ─── Construction de l'objet d'état complet (source unique) ────
  function buildAppState(overrides) {
    return Object.assign({
      exams: exams, students: students, grades: grades, remarks: remarks,
      absents: absents, groupes: groupes, activeExamId: activeExamId,
      nomDS: nomDS, dateDS: dateDS, seuils: seuils, normMethod: normMethod,
      normParams: normParams, seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, seuilPiege: seuilPiege, bonusCompletConfig: bonusCompletConfig,
      gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode,
      malusManuel: malusManuel, uiScale: uiScale, appTheme: appTheme, groupesDef: groupesDef,
      mode: mode, commentaires: commentaires, remarquesActives: remarquesActives,
      remarquesCustom: remarquesCustom, remarquesOrdre: remarquesOrdre,
      settingsTab: settingsTab, csvConfig: csvConfig, htmlPresets: htmlPresets,
      htmlConfig: htmlConfig, htmlStudentId: htmlStudentId,
      commentaireDS: commentaireDS, rapportClasseConfig: rapportClasseConfig,
      synthese: synthese, etablissement: etablissement,
      soundLinksEnabled: soundLinksEnabled, soundBaseUrl: soundBaseUrl, soundAudioExt: soundAudioExt,
    }, overrides || {});
  }

  // ─── Restauration de l'état depuis un objet sauvegardé (source unique) ────
  function restoreState(d) {
    if (d.exams) setExams(d.exams.map(function(ex) {
      return Object.assign({}, ex, { features: Object.assign({}, DEFAULT_FEATURES, ex.features || {}) });
    }));
    if (d.students) setStudents(d.students);
    if (d.grades) setGrades(d.grades);
    if (d.remarks) setRemarks(d.remarks);
    if (d.absents) setAbsents(d.absents);
    if (d.groupes) setGroupes(d.groupes);
    if (d.activeExamId) setActiveExamId(d.activeExamId);
    if (d.nomDS) setNomDS(d.nomDS);
    if (d.dateDS) setDateDS(d.dateDS);
    if (d.seuils) setSeuils(d.seuils);
    if (d.normMethod) setNormMethod(d.normMethod);
    if (d.normParams) setNormParams(d.normParams);
    if (d.seuilDifficile) setSeuilDifficile(d.seuilDifficile);
    if (d.seuilReussite !== undefined) setSeuilReussite(d.seuilReussite);
    if (d.seuilPiege !== undefined) setSeuilPiege(d.seuilPiege);
    if (d.bonusCompletConfig) setBonusCompletConfig(Object.assign({}, DEFAULT_BONUS_COMPLET, d.bonusCompletConfig));
    if (d.gabaritTex) setGabaritTex(d.gabaritTex);
    if (d.malusPaliers) setMalusPaliers(d.malusPaliers);
    if (d.malusMode) setMalusMode(d.malusMode);
    if (d.malusManuel) setMalusManuel(d.malusManuel);
    if (d.uiScale) setUiScale(d.uiScale);
    if (d.appTheme !== undefined) setAppTheme(d.appTheme);
    else if (d.dark !== undefined) setAppTheme(d.dark ? "dark" : "light"); // migration anciens profils
    if (d.groupesDef) setGroupesDef(d.groupesDef);
    if (d.mode) setMode(d.mode);
    if (d.commentaires) setCommentaires(d.commentaires);
    if (d.remarquesActives) setRemarquesActives(d.remarquesActives);
    if (d.remarquesCustom) setRemarquesCustom(d.remarquesCustom);
    if (d.remarquesOrdre) setRemarquesOrdre(d.remarquesOrdre);
    if (d.settingsTab) setSettingsTab(d.settingsTab);
    if (d.csvConfig) setCsvConfig(d.csvConfig);
    if (d.htmlPresets) setHtmlPresets(d.htmlPresets);
    if (d.htmlConfig) {
      var sc = d.htmlConfig;
      setHtmlConfig(Object.assign({}, DEFAULT_HTML_CONFIG, sc, {
        statsEleve: Object.assign({}, DEFAULT_HTML_CONFIG.statsEleve, sc.statsEleve),
        statsClasse: Object.assign({}, DEFAULT_HTML_CONFIG.statsClasse, sc.statsClasse),
      }));
    }
    if (d.commentaireDS) setCommentaireDS(d.commentaireDS);
    if (d.rapportClasseConfig) setRapportClasseConfig(Object.assign({}, DEFAULT_RAPPORT_CLASSE_CONFIG, d.rapportClasseConfig));
    if (d.htmlStudentId !== undefined) setHtmlStudentId(d.htmlStudentId);
    if (d.synthese) setSynthese(d.synthese);
    if (d.soundLinksEnabled !== undefined) setSoundLinksEnabled(d.soundLinksEnabled);
    if (d.soundBaseUrl !== undefined) setSoundBaseUrl(d.soundBaseUrl);
    if (d.soundAudioExt !== undefined) setSoundAudioExt(d.soundAudioExt);
    if (d.etablissement) setEtablissement(Object.assign({}, {
      nom: ETABLISSEMENT.nom, classe: ETABLISSEMENT.classe,
      matricule: ETABLISSEMENT.matricule, promotion: ETABLISSEMENT.promotion,
      anneeScolaire: ETABLISSEMENT.anneeScolaire,
    }, d.etablissement));
  }

  // ─── Persistence: save to IndexedDB on changes (debounced) ───
  useEffect(function() {
    if (!dbLoaded) return;
    var timer = setTimeout(function() {
      saveDB(buildAppState(), activeProfileId);
    }, 500);
    return function() { clearTimeout(timer); };
  }, [dbLoaded, exams, students, grades, remarks, absents, groupes, activeExamId, nomDS, dateDS, seuils, normMethod, normParams, seuilDifficile, seuilReussite, seuilPiege, bonusCompletConfig, gabaritTex, malusPaliers, malusMode, malusManuel, uiScale, appTheme, groupesDef, mode, commentaires, remarquesActives, remarquesCustom, remarquesOrdre, settingsTab, csvConfig, htmlPresets, htmlConfig, htmlStudentId, synthese, etablissement, soundLinksEnabled, soundBaseUrl, soundAudioExt, commentaireDS, rapportClasseConfig]);

  useEffect(function() { if (showSearch && searchInputRef.current) searchInputRef.current.focus(); }, [showSearch]);
  useEffect(function() { var t = setTimeout(function() { setSplash(false); }, 2000); return function() { clearTimeout(t); }; }, []);

  var _settingsSaveSignal = useState(0); var setSettingsSaveSignal = _settingsSaveSignal[1]; var settingsSaveSignal = _settingsSaveSignal[0];
  useEffect(function() {
    if (!dbLoaded) return;
    setSettingsSaveSignal(function(n) { return n + 1; });
  }, [seuils, normMethod, normParams, seuilDifficile, seuilReussite, seuilPiege,
      bonusCompletConfig, malusPaliers, malusMode, remarquesActives, remarquesCustom,
      remarquesOrdre, groupesDef, csvConfig, htmlConfig, soundLinksEnabled,
      soundBaseUrl, soundAudioExt, etablissement]);

  // ─── Raccourcis clavier (desktop, onglet Correction uniquement) ───
  useEffect(function() {
    if (isMobile) return;
    function handleKey(e) {
      if (mode !== "correct") return;
      var tag = document.activeElement ? document.activeElement.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      var numEx = exam ? exam.exercises.length : 0;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (ei > 0) { setEi(ei - 1); }
        else if (si > 0) { setSi(si - 1); setEi(numEx - 1); }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (ei < numEx - 1) { setEi(ei + 1); }
        else if (si < students.length - 1) { setSi(si + 1); setEi(0); }
      } else if (e.key >= "1" && e.key <= "9") {
        var idx = parseInt(e.key, 10) - 1;
        if (idx < numEx) setEi(idx);
      }
    }
    window.addEventListener("keydown", handleKey);
    return function() { window.removeEventListener("keydown", handleKey); };
  }, [mode, isMobile, ei, si, exam, students.length]);

  var exam = exams.find(function(e) { return e.id === activeExamId; }) || exams[0] || null;
  var ft = exam ? Object.assign({}, DEFAULT_FEATURES, exam.features || {}) : DEFAULT_FEATURES;
  var et = exam ? examTotal(exam) : 0;
  // Nom et date lus depuis l'exam actif (avec repli sur états globaux pour rétrocompatibilité)
  var examNomDS = exam ? (exam.nomDS !== undefined ? exam.nomDS : nomDS) : nomDS;
  var examDateDS = exam ? (exam.dateDS !== undefined ? exam.dateDS : dateDS) : dateDS;
  function setExamNomDS(val) { if (exam) updateExam(Object.assign({}, exam, { nomDS: val })); else setNomDS(val); }
  function setExamDateDS(val) { if (exam) updateExam(Object.assign({}, exam, { dateDS: val })); else setDateDS(val); }
  var presents = useMemo(function() { return students.filter(function(s) { return !absents[s.id]; }); }, [students, absents]);

  // ─── Gestion des profils ─────────────────────────────────────────

  function resetAppState() {
    setExams([]); setStudents([]); setGrades({}); setRemarks({});
    setAbsents({}); setGroupes({}); setActiveExamId(null);
    setNomDS(""); setDateDS(""); setCommentaires({});
    setMalusManuel({}); setSynthese([]);
  }

  function switchProfile(profileId) {
    // Sauvegarde immédiate du profil courant avant de switcher
    saveDB(buildAppState(), activeProfileId);
    setActiveProfileId(profileId);
    saveMeta({ profiles: profiles, activeId: profileId });
    resetAppState();
    loadDB(profileId).then(function(saved) {
      if (saved) restoreState(saved);
    });
    setShowProfileMenu(false);
  }

  function createProfile(name) {
    var newId = Math.random().toString(36).slice(2, 10);
    var newProfile = { id: newId, name: name.trim() || "Nouveau profil", createdAt: Date.now() };
    var newProfiles = profiles.concat([newProfile]);
    setProfiles(newProfiles);
    setNewProfileName("");
    saveMeta({ profiles: newProfiles, activeId: activeProfileId });
    // Crée immédiatement une base vide pour ce profil
    openNamedDB(profileDBName(newId)).catch(function() {});
  }

  function renameProfile(profileId, newName) {
    var updated = profiles.map(function(p) {
      return p.id === profileId ? Object.assign({}, p, { name: newName.trim() || p.name }) : p;
    });
    setProfiles(updated);
    saveMeta({ profiles: updated, activeId: activeProfileId });
    setEditingProfileId(null);
  }

  function deleteProfile(profileId) {
    if (profiles.length <= 1) return; // jamais supprimer le dernier
    var remaining = profiles.filter(function(p) { return p.id !== profileId; });
    setProfiles(remaining);
    var newActive = profileId === activeProfileId ? remaining[0].id : activeProfileId;
    saveMeta({ profiles: remaining, activeId: newActive });
    if (profileId === activeProfileId) switchProfile(newActive);
    // Suppression physique de la base IndexedDB (best effort)
    try { indexedDB.deleteDatabase(profileDBName(profileId)); } catch(e) {}
  }

  // ─── Élèves corrigés (au moins un item coché ou une case "traitée") ───
  var corriges = useMemo(function() {
    if (!exam) return [];
    return presents.filter(function(st) {
      for (var exz of exam.exercises) {
        for (var qz of exz.questions) {
          if (grades["treated_" + st.id + "_" + qz.id]) return true;
          for (var itz of qz.items) { if (grades[gradeKey(st.id, itz.id)]) return true; }
        }
      }
      return false;
    });
  }, [presents, grades, exam]);

  // ─── Normalised notes ───
  var normData = useMemo(function() {
    if (!exam || !corriges.length) return { map: {} };
    var etW = examTotalWeighted(exam);
    var raw20 = corriges.map(function(s) {
      // Score pondéré incluant le bonus exercice complet
      var totalPondere = exam.exercises.reduce(function(sum, ex) {
        var coeff = ex.coeff !== undefined ? ex.coeff : 1;
        return sum + exerciseScore(grades, s.id, ex, bonusCompletConfig).earned * coeff;
      }, 0);
      var note = etW > 0 ? noteSur20(totalPondere, etW) : 0;
      if ((groupes.tt || []).indexOf(s.id) >= 0) note = clamp(note * TT_COEFF, 0, 20);
      return note;
    });
    var getMT = function(sid) { return malusTotal(remarks, sid, exam, malusPaliers, malusManuel, allRemarquesBase); };
    var preNorm = malusMode === "avant" ? raw20.map(function(nn, i) { return clamp(nn * (1 - getMT(corriges[i].id) / 100), 0, 20); }) : raw20;
    var normed = normaliser(preNorm, normMethod, normParams);
    var final2 = malusMode === "apres" ? normed.map(function(nn, i) { return clamp(nn * (1 - getMT(corriges[i].id) / 100), 0, 20); }) : normed;
    var map = {};
    corriges.forEach(function(s, i) { map[s.id] = { brut: raw20[i], norm: final2[i] }; });
    return { map: map };
  }, [exam, corriges, grades, et, normMethod, normParams, groupes, malusPaliers, malusMode, malusManuel, remarks, bonusCompletConfig]);

  function getNote20(sid) { var e = normData.map[sid]; return e ? e.norm : 0; }
  function getBrut20(sid) { var e = normData.map[sid]; return e ? e.brut : 0; }
  var isNorm = normMethod !== "none";
  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }

  var inp = { background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "4px 8px", fontSize: 13, fontFamily: FONT_B, outline: "none" };

  // Responsive
  var _winW = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  var setWinW = _winW[1]; var winW = _winW[0];
  useEffect(function() { var h = function() { setWinW(window.innerWidth); }; window.addEventListener("resize", h); return function() { window.removeEventListener("resize", h); }; }, []);
  var isMobile = winW < 700;
  var sc = isMobile ? Math.min(uiScale, 1.1) : uiScale;

  // JSON save/load
  function saveJSON() {
    var today = new Date(); var dd = String(today.getFullYear()) + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
    var slug = (examNomDS || "data").replace(/\s+/g, "_");
    downloadFile(JSON.stringify({ exams: exams, students: students, grades: grades, remarks: remarks, absents: absents, groupes: groupes, nomDS: examNomDS, dateDS: examDateDS, seuils: seuils, seuilDifficile: seuilDifficile, normMethod: normMethod, normParams: normParams, uiScale: uiScale, gabaritTex: gabaritTex, malusPaliers: malusPaliers, malusMode: malusMode, malusManuel: malusManuel, commentaires: commentaires }, null, 2), "check_" + slug + "_" + dd + ".json", "application/json");
  }
  function exportCSV() {
    if (!exam) return;
    var sep = csvConfig.sep;
    var dec = csvConfig.dec;
    var cols = csvConfig.cols;
    var etW = examTotalWeighted(exam);

    // Rangement par note décroissante
    var ranked = corriges.slice().sort(function(a, b) { return getNote20(b.id) - getNote20(a.id); });
    var rangMap = {};
    ranked.forEach(function(s, i) { rangMap[s.id] = i + 1; });

    // Élèves à inclure
    var liste = cols.absent ? students : corriges;

    // En-tête
    var header = [];
    if (cols.rang)        header.push("Rang");
    if (cols.nom)         header.push("Nom");
    if (cols.prenom)      header.push("Prénom");
    if (cols.absent)      header.push("Absent");
    if (cols.note)        header.push("Note /20");
    if (cols.noteNorm)    header.push("Note normalisée");
    if (cols.groupe)      header.push("Groupe");
    if (cols.competences) COMPETENCES.forEach(function(c) { header.push("Comp. " + c.id); });
    if (cols.malus)       header.push("Malus %");

    function fmt(n) { return n.toFixed(2).replace(".", dec); }

    var rows = liste.map(function(s) {
      var isAbsent = !!absents[s.id];
      var note20 = isAbsent ? null : getNote20(s.id);
      var brut20 = isAbsent ? null : getBrut20(s.id);
      var compNotes = isAbsent ? {} : notesParCompetence(grades, s.id, exam, seuils);
      var malus = isAbsent ? 0 : malusTotal(remarks, s.id, exam, malusPaliers, malusManuel, allRemarquesBase);
      var grpObj = [TT_GROUPE].concat(groupesDef).find(function(g) { return (groupes[g.id] || []).indexOf(s.id) >= 0; });
      var grp = grpObj ? grpObj.label : "—";
      var row = [];
      if (cols.rang)        row.push(isAbsent ? "—" : String(rangMap[s.id] || "—"));
      if (cols.nom)         row.push(s.nom || "");
      if (cols.prenom)      row.push(s.prenom || "");
      if (cols.absent)      row.push(isAbsent ? "Oui" : "Non");
      if (cols.note)        row.push(isAbsent ? "—" : fmt(brut20));
      if (cols.noteNorm)    row.push(isAbsent ? "—" : fmt(note20));
      if (cols.groupe)      row.push(grp);
      if (cols.competences) COMPETENCES.forEach(function(c) { row.push(isAbsent ? "—" : (compNotes[c.id] || "NN")); });
      if (cols.malus)       row.push(isAbsent ? "—" : String(malus));
      return row.map(function(v) {
        var str = String(v);
        if (str.indexOf(sep) >= 0 || str.indexOf('"') >= 0) str = '"' + str.replace(/"/g, '""') + '"';
        return str;
      }).join(sep);
    });

    var csv = [header.join(sep)].concat(rows).join("\n");
    var slug = (examNomDS || "DS").replace(/\s+/g, "_");
    downloadFile(csv, slug + "_eleves.csv", "text/csv;charset=utf-8;");
  }

// ─── Synthèse multi-DS ───
function nomFichierSynthese() {
  var parts = [etablissement.classe, etablissement.matricule, etablissement.promotion]
    .map(function(p) { return (p || "").trim().replace(/\s+/g, "_"); })
    .filter(function(p) { return p.length > 0; });
  return "synthese_" + (parts.length > 0 ? parts.join("_") : "check") + ".csv";
}

function exporterVersSynthese() {
  if (!exam) return;
  var ranked = corriges.slice().sort(function(a, b) { return getNote20(b.id) - getNote20(a.id); });
  var rangMap = {};
  ranked.forEach(function(s, i) { rangMap[s.id] = i + 1; });

  var nouvelles = corriges.map(function(s) {
    var comps = notesParCompetence(grades, s.id, exam, seuils);
    var grpObj = [TT_GROUPE].concat(groupesDef).find(function(g) { return (groupes[g.id] || []).indexOf(s.id) >= 0; });
    var grp = grpObj ? grpObj.label : "";
    return {
      examId: exam.id,
      dsNom: examNomDS || "",
      dsDate: examDateDS || "",
      studentId: s.id,
      nom: s.nom || "",
      prenom: s.prenom || "",
      groupe: grp,
      noteBrute: Math.round(getBrut20(s.id) * 100) / 100,
      noteNorm: Math.round(getNote20(s.id) * 100) / 100,
      rang: rangMap[s.id] || 0,
      compA: comps["A"] || "NN",
      compN: comps["N"] || "NN",
      compR: comps["R"] || "NN",
      compV: comps["V"] || "NN",
    };
  });

  // Dedup : on retire les lignes du même exam, on ajoute les nouvelles
  var filtree = synthese.filter(function(row) { return row.examId !== exam.id; });
  var nouvellesSynthese = filtree.concat(nouvelles);
  setSynthese(nouvellesSynthese);
  saveDB(buildAppState({ synthese: nouvellesSynthese }), activeProfileId);
}

function telechargerSynthese() {
  if (!synthese.length) return;
  var sep = ";";
  var header = ["DS", "Date", "Nom", "Prénom", "Groupe",
                "Note Brute", "Note Normalisée", "Rang",
                "A", "N", "R", "V"].join(sep);
  var rows = synthese.map(function(row) {
    return [
      row.dsNom, row.dsDate, row.nom, row.prenom, row.groupe,
      row.noteBrute.toFixed(2), row.noteNorm.toFixed(2), String(row.rang),
      row.compA, row.compN, row.compR, row.compV,
    ].map(function(v) {
      var str = String(v);
      if (str.indexOf(sep) >= 0 || str.indexOf('"') >= 0)
        str = '"' + str.replace(/"/g, '""') + '"';
      return str;
    }).join(sep);
  });
  downloadFile([header].concat(rows).join("\n"), nomFichierSynthese(), "text/csv;charset=utf-8;");
}

function retirerDsSynthese(examId) {
  var filtree = synthese.filter(function(row) { return row.examId !== examId; });
  setSynthese(filtree);
}

  // ─── Fonctions de synchronisation GitHub ────────────────────────

  function githubSyncPath(profileId) {
    return "check-data/profil-" + (profileId || "default") + ".json";
  }

  function buildSnapshot() {
    return JSON.stringify(buildAppState());
  }

  function githubSave() {
    if (!githubPat || !githubRepo) return;
    setSyncLoading(true); setSyncStatus("");
    var path = githubSyncPath(activeProfileId);
    var content = buildSnapshot();
    var b64 = btoa(unescape(encodeURIComponent(content)));
    // Récupérer le SHA courant du fichier (obligatoire pour les mises à jour)
    fetch("https://api.github.com/repos/" + githubRepo + "/contents/" + path, {
      headers: { "Authorization": "token " + githubPat, "Accept": "application/vnd.github+json" }
    }).then(function(r) { return r.ok ? r.json() : null; }).then(function(existing) {
      var body = { message: "Sauvegarde CHECK " + new Date().toLocaleString("fr-FR"), content: b64 };
      if (existing && existing.sha) body.sha = existing.sha;
      return fetch("https://api.github.com/repos/" + githubRepo + "/contents/" + path, {
        method: "PUT",
        headers: { "Authorization": "token " + githubPat, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }).then(function(r) {
      if (r && r.ok) {
        var now = new Date().toLocaleString("fr-FR");
        setSyncDate(now); setSyncStatus("✅ Sauvegardé le " + now);
      } else {
        setSyncStatus("❌ Erreur lors de la sauvegarde.");
      }
      setSyncLoading(false);
    }).catch(function() { setSyncStatus("❌ Erreur réseau."); setSyncLoading(false); });
  }

  function githubLoad() {
    if (!githubPat || !githubRepo) return;
    if (!window.confirm("Charger la sauvegarde distante ? L'état actuel sera écrasé.")) return;
    setSyncLoading(true); setSyncStatus("");
    var path = githubSyncPath(activeProfileId);
    fetch("https://api.github.com/repos/" + githubRepo + "/contents/" + path, {
      headers: { "Authorization": "token " + githubPat, "Accept": "application/vnd.github+json" }
    }).then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
      if (!data || !data.content) { setSyncStatus("❌ Aucune sauvegarde trouvée."); setSyncLoading(false); return; }
      var json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      var d = JSON.parse(json);
      var v = validateState(d);
      if (!v.valid) {
        setSyncStatus("❌ Données distantes invalides : " + v.errors[0]);
        setSyncLoading(false);
        return;
      }
      if (v.warnings.length > 0) {
        console.warn("GitHub sync — avertissements :", v.warnings);
      }
      restoreState(v.data);
      var now = new Date().toLocaleString("fr-FR");
      setSyncDate(now); setSyncStatus("✅ Chargé le " + now);
      setSyncLoading(false);
    }).catch(function() { setSyncStatus("❌ Erreur réseau."); setSyncLoading(false); });
  }

  function loadJSONFile(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      try {
        var d = JSON.parse(ev.target.result);
        var v = validateState(d);
        if (!v.valid) {
          window.alert("Import impossible :\n" + v.errors.join("\n"));
          return;
        }
        if (v.warnings.length > 0) {
          console.warn("Import — avertissements :", v.warnings);
        }
        restoreState(v.data);
      } catch(err) {
        window.alert("Le fichier n'est pas un JSON valide.");
        console.error("Import JSON error:", err);
      }
    };
    r.readAsText(f); e.target.value = "";
  }

  // ─── Exam CRUD ───
  function createExam() {
    var id = uid();
    var newExam = { id: id, name: "Nouveau DS", nomDS: "", dateDS: "", features: { preset: "standard", competences: true, coefficients: false, questionBonus: true, bonusComplet: false, malusAuto: true, questionPiege: false }, exercises: [{ id: uid(), title: "Exercice 1", questions: [{ id: uid(), label: "1", competences: ["R"], items: [{ id: uid(), label: "Item 1", points: 1 }] }] }] };
    setExams(exams.concat([newExam]));
    setActiveExamId(id);
  }
  function updateExam(updated) { setExams(exams.map(function(e) { return e.id === updated.id ? updated : e; })); }
  function deleteExam(id) { setExams(exams.filter(function(e) { return e.id !== id; })); if (activeExamId === id) setActiveExamId(null); }

  // ─── Exam editor helpers ───
  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function updPath(exam2, path, val) {
    var n = deepClone(exam2); var t = n;
    for (var i = 0; i < path.length - 1; i++) t = t[path[i]];
    t[path[path.length - 1]] = val;
    return n;
  }
  function addExercise() {
    if (!exam) return;
    updateExam({ ...exam, exercises: exam.exercises.concat([{ id: uid(), title: "Exercice " + (exam.exercises.length + 1), questions: [] }]) });
  }
  function addQuestion(exIdx) {
    var n = deepClone(exam);
    n.exercises[exIdx].questions.push({ id: uid(), label: "" + (n.exercises[exIdx].questions.length + 1), competences: ["R"], items: [{ id: uid(), label: "Item 1", points: 1 }] });
    updateExam(n);
  }
  function addItem(exIdx, qIdx) {
    var n = deepClone(exam);
    var its = n.exercises[exIdx].questions[qIdx].items;
    its.push({ id: uid(), label: "Item " + (its.length + 1), points: 1 });
    updateExam(n);
  }
  function delAt(exIdx, qIdx, iIdx) {
    var n = deepClone(exam);
    if (iIdx !== undefined) n.exercises[exIdx].questions[qIdx].items.splice(iIdx, 1);
    else if (qIdx !== undefined) n.exercises[exIdx].questions.splice(qIdx, 1);
    else n.exercises.splice(exIdx, 1);
    updateExam(n);
  }
  function toggleComp(exIdx, qIdx, cid) {
    var n = deepClone(exam);
    var q = n.exercises[exIdx].questions[qIdx];
    var cs = q.competences.indexOf(cid) >= 0 ? q.competences.filter(function(c) { return c !== cid; }) : q.competences.concat([cid]);
    if (cs.length > 0) q.competences = cs;
    updateExam(n);
  }

  

  // Confirmation suppression
  function askConfirm(label, onConfirm) {
    setConfirmDelete({ label: label, onConfirm: onConfirm });
  }

  // Réordonnancement exercices et questions
  function moveExercise(exIdx, dir) {
    var j = exIdx + dir;
    if (!exam || j < 0 || j >= exam.exercises.length) return;
    var n = deepClone(exam);
    var tmp = n.exercises[exIdx]; n.exercises[exIdx] = n.exercises[j]; n.exercises[j] = tmp;
    updateExam(n);
  }
  function moveQuestion(exIdx, qIdx, dir) {
    var j = qIdx + dir;
    if (!exam || j < 0 || j >= exam.exercises[exIdx].questions.length) return;
    var n = deepClone(exam);
    var tmp = n.exercises[exIdx].questions[qIdx]; n.exercises[exIdx].questions[qIdx] = n.exercises[exIdx].questions[j]; n.exercises[exIdx].questions[j] = tmp;
    updateExam(n);
  }

  // CSV import
  function handleCSV(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      var parsed = importCSV(ev.target.result);
      if (parsed.length > 0) setStudents(parsed);
    };
    r.readAsText(f); e.target.value = "";
  }

  // Swipe
  var handleTouchStart = useCallback(function(e) { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, []);
  var handleTouchEnd = useCallback(function(e) {
    var dx = e.changedTouches[0].clientX - touchRef.current.x;
    var dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && si > 0) { setSi(si - 1); setEi(0); }
      if (dx < 0 && si < students.length - 1) { setSi(si + 1); setEi(0); }
    }
  }, [si, students.length]);


  // ─── Current student data (for correction mode) ───
  var safeIdx = si < students.length ? si : 0;
  var s = students[safeIdx] || { id: "none", nom: "", prenom: "" };
  // Réinitialiser si si dépasse le tableau (ajout/suppression d'élèves)
  useEffect(function() { if (students.length > 0 && si >= students.length) setSi(0); }, [students.length, si]);
  var exCur = exam && exam.exercises[ei] ? exam.exercises[ei] : null;
  var stuTot = exam ? studentTotal(grades, s.id, exam) : 0;
  var cpVals = exam ? competencePct(grades, s.id, exam) : {};
  var cnVals = exam ? notesParCompetence(grades, s.id, exam, seuils) : {};
  var eAbsVals = exam ? exercisePctAbsolute(grades, s.id, exam) : [];
  var eRelVals = exam ? exercisePctRelative(grades, s.id, exam, students, absents) : [];
  var curNote = getNote20(s.id);
  var curBrut = getBrut20(s.id);

  // Ranking
  var allNotesRanked = corriges.map(function(st) { return { id: st.id, note: getNote20(st.id) }; }).sort(function(a, b) { return b.note - a.note; });
  var rangMap = {}; var curRang = 1;
  allNotesRanked.forEach(function(item, i) { if (i > 0 && item.note < allNotesRanked[i - 1].note) curRang = i + 1; rangMap[item.id] = curRang; });
  var rang = rangMap[s.id] || "-";
  var gradedCount = corriges.length;

  // Malus for current student
  var remCount = exam && !absents[s.id] ? countMalusRemarks(remarks, s.id, exam, allRemarquesBase) : 0;
  var autoMalusVal = exam && !absents[s.id] ? malusAuto(remarks, s.id, exam, malusPaliers, allRemarquesBase) : 0;
  var manMalus = malusManuel[s.id] || 0;
  var totalMalusVal = exam && !absents[s.id] ? malusTotal(remarks, s.id, exam, malusPaliers, malusManuel, allRemarquesBase) : 0;
  var hasMalus = totalMalusVal > 0;
  var showMalusBar = !absents[s.id] && (remCount > 0 || manMalus > 0);

  // Toutes les remarques disponibles (fixes + custom), triées selon remarquesOrdre, filtrées par actives
  var allRemarquesSorted = remarquesOrdre.length
    ? allRemarquesBase.slice().sort(function(a, b) {
        var ia = remarquesOrdre.indexOf(a.id); var ib = remarquesOrdre.indexOf(b.id);
        if (ia < 0) ia = 999; if (ib < 0) ib = 999;
        return ia - ib;
      })
    : allRemarquesBase;
  var allRemarques = allRemarquesSorted.filter(function(r) { return remarquesActives.indexOf(r.id) >= 0; });

  // Search
  var searchResults = searchTerm.trim().length > 0
    ? students.map(function(st, idx) { return { st: st, idx: idx }; }).filter(function(o) { var term = searchTerm.toLowerCase(); return o.st.nom.toLowerCase().indexOf(term) >= 0 || o.st.prenom.toLowerCase().indexOf(term) >= 0; }).slice(0, 8)
    : [];

  // Stats
  var statGroups = [{ id: "all", label: "Toute la classe" }].concat(groupesDef.filter(function(g) { return g.isStatGroup && (groupes[g.id] || []).length > 0; }).map(function(g) { return { id: g.id, label: g.label }; }));
  var filteredCorriges = statGroup === "all" ? corriges : corriges.filter(function(ss) { return (groupes[statGroup] || []).indexOf(ss.id) >= 0; });
  var statNotes = filteredCorriges.map(function(ss) { return getNote20(ss.id); });
  var statMoy = statNotes.length ? statNotes.reduce(function(a, b) { return a + b; }, 0) / statNotes.length : 0;
  var statSorted = statNotes.slice().sort(function(a, b) { return a - b; });
  var statMed = statSorted.length % 2 === 0 && statSorted.length ? (statSorted[statSorted.length / 2 - 1] + statSorted[statSorted.length / 2]) / 2 : (statSorted[Math.floor(statSorted.length / 2)] || 0);
  var statMin = statSorted[0] || 0;
  var statMax = statSorted[statSorted.length - 1] || 0;
  var statSigma = statNotes.length ? Math.sqrt(statNotes.reduce(function(ss2, nn) { return ss2 + (nn - statMoy) * (nn - statMoy); }, 0) / statNotes.length) : 0;

  // Total points for exam editor display
  var totalPts = exam ? examTotal(exam) : 0;

  // Nav
  // ─── Génération HTML mémoïsée (évite le rechargement de l'iframe à chaque re-render) ───
  var htmlStudentForPreview = corriges.find(function(s) { return s.id === htmlStudentId; }) || corriges[0] || null;
  var htmlRankMapForPreview = useMemo(function() {
    var map = {};
    if (!corriges.length) return map;
    var ranked = corriges.slice().sort(function(a, b) { return getNote20(b.id) - getNote20(a.id); });
    var rg = 1;
    ranked.forEach(function(r, i) {
      if (i > 0 && getNote20(r.id) < getNote20(ranked[i - 1].id)) rg = i + 1;
      map[r.id] = rg;
    });
    return map;
  }, [corriges, grades, exam, normMethod, normParams, malusPaliers, malusManuel, groupes]);

  var htmlClasseSrc = useMemo(function() {
    if (!exam || !students.length) return "";
    var presents = students.filter(function(s) { return !absents[s.id]; });
    if (!presents.length) return "";
    return genererRapportClasse({
      exam: exam,
      students: students,
      grades: grades,
      absents: absents,
      seuils: seuils,
      seuilDifficile: seuilDifficile,
      seuilReussite: seuilReussite,
      seuilPiege: seuilPiege,
      getNote20: getNote20,
      htmlConfig: htmlConfig,
      rapportClasseConfig: rapportClasseConfig,
      commentaire: (commentaireDS && commentaireDS[activeExamId]) || "",
      bonusCompletConfig: bonusCompletConfig,
      features: ft,
    });
  }, [exam, students, grades, absents, seuils, seuilDifficile, seuilReussite, seuilPiege,
      getNote20, htmlConfig, rapportClasseConfig, commentaireDS, activeExamId, bonusCompletConfig, ft, corriges]);

  var htmlSrc = useMemo(function() {
    if (!exam || !htmlStudentForPreview) return "";
    return genererHtmlEleve({
      student: htmlStudentForPreview, exam: exam, grades: grades, remarks: remarks, absents: absents,
      allStudents: students, nomDS: examNomDS, dateDS: examDateDS, seuils: seuils,
      seuilDifficile: seuilDifficile, seuilReussite: seuilReussite, seuilPiege: seuilPiege,
      getNote20: getNote20, getBrut20: getBrut20,
      rankMap: htmlRankMapForPreview,
      malusPaliers: malusPaliers, malusManuel: malusManuel,
      commentaires: commentaires, allRemarques: allRemarques,
      htmlConfig: htmlConfig,
      soundLinksEnabled: soundLinksEnabled, soundBaseUrl: soundBaseUrl, soundAudioExt: soundAudioExt,
      bonusCompletConfig: bonusCompletConfig,
      features: ft,
    });
  }, [htmlStudentForPreview, htmlRankMapForPreview, exam, grades, remarks, absents, students,
      examNomDS, examDateDS, seuils, seuilDifficile, seuilReussite, malusPaliers, malusManuel,
      commentaires, allRemarques, htmlConfig, soundLinksEnabled, soundBaseUrl, soundAudioExt,
      bonusCompletConfig]);

  var navItems = [{ id: "prep", l: "Préparation", ic: "\u2699\uFE0F" }, { id: "correct", l: "Correction", ic: "\u270F\uFE0F" }, { id: "resultats", l: "Résultats", ic: "\uD83D\uDC64" }, { id: "overview", l: "Vue d\u2019ensemble", ic: "\uD83D\uDCCB" }, { id: "stats", l: "Stats", ic: "\uD83D\uDCCA" }, { id: "export", l: "Export", ic: "\uD83D\uDCC4" }, { id: "aide", l: "Aide", ic: "\u2139\uFE0F" }];  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // Splash screen
  if (showSplash) {
    return (
      <div style={{ fontFamily: FONT_B, background: "#faf7f2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={SPLASH_IMG} alt="C.H.E.C.K." style={{ maxWidth: "80%", maxHeight: "70vh", objectFit: "contain" }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_B, background: th.bg, color: th.text, height: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden", maxWidth: "100vw", fontSize: "14px" }}
         onTouchStart={isMobile && mode === "correct" ? handleTouchStart : undefined}
         onTouchEnd={isMobile && mode === "correct" ? handleTouchEnd : undefined}
         onClick={function() { if (showProfileMenu) setShowProfileMenu(false); if (showDsMenu) setShowDsMenu(false); }}>
      <link href={FONTS_URL} rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, opacity: dark ? 0.025 : 0.035, backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, " + th.ruledLine + " 31px, " + th.ruledLine + " 32px)", backgroundPosition: "0 8px", pointerEvents: "none", zIndex: 0 }} />

      {/* MODALE CONFIRMATION SUPPRESSION */}
      {confirmDelete && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function() { setConfirmDelete(null); }}>
        <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: "24px 28px", width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", textAlign: "center" }} onClick={function(e) { e.stopPropagation(); }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🗑️</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT, marginBottom: 6, color: th.text }}>Confirmer la suppression</div>
          <div style={{ fontSize: 12, color: th.textMuted, fontFamily: FONT_B, marginBottom: 20, lineHeight: 1.5 }}>
            {"Supprimer "}<strong>{confirmDelete.label}</strong>{" ?"}
            <br />{"Cette action est irréversible."}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function() { setConfirmDelete(null); }} style={{ flex: 1, padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 600, background: th.surface, border: "1px solid " + th.border, color: th.textMuted }}>Annuler</button>
            <button onClick={function() { confirmDelete.onConfirm(); setConfirmDelete(null); }} style={{ flex: 1, padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.dangerBg, border: "1px solid " + th.danger + "40", color: th.danger }}>Supprimer</button>
          </div>
        </div>
      </div>}

      {/* HEADER — escamotable au scroll, taille agrandie */}
      <header style={{ background: th.card, borderBottom: "2px solid " + th.headerBorder, padding: isMobile ? "8px 10px" : "10px 14px", display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, position: "sticky", top: 0, zIndex: 100, boxShadow: th.shadow, flexShrink: 0 }}>
        <img src={appTheme === "dark" ? LOGO_DARK : appTheme === "young" ? LOGO_YOUNG : LOGO_LIGHT} alt="C.H.E.C.K." style={{ height: isMobile ? 32 : 42, objectFit: "contain" }} />
        {/* Sélecteur de profil — toujours visible */}
        <div style={{ position: "relative" }}>
          <button onClick={function() { setShowProfileMenu(!showProfileMenu); setEditingProfileId(null); setNewProfileName(""); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 11 : 12, fontWeight: 600, background: showProfileMenu ? th.accentBg : "transparent", border: "1px solid " + (showProfileMenu ? th.accent + "40" : th.border), color: th.textMuted }}
            title="Changer de profil">
            {"\uD83D\uDC64"}
            {!isMobile && <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(profiles.find(function(p) { return p.id === activeProfileId; }) || {}).name || ""}</span>}
            <span style={{ fontSize: 9, opacity: 0.6 }}>{"▾"}</span>
          </button>
          {showProfileMenu && <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 4, background: th.card, border: "1px solid " + th.border, borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 120, minWidth: 210, overflow: "hidden" }} onClick={function(e) { e.stopPropagation(); }}>
            {profiles.map(function(p) {
              var isActive = p.id === activeProfileId;
              var isEditing = editingProfileId === p.id;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid " + th.border, background: isActive ? th.accentBg : "transparent" }}>
                  {isEditing
                    ? <input autoFocus value={editingProfileName} onChange={function(e) { setEditingProfileName(e.target.value); }}
                        onKeyDown={function(e) { if (e.key === "Enter") renameProfile(p.id, editingProfileName); if (e.key === "Escape") setEditingProfileId(null); }}
                        onBlur={function() { renameProfile(p.id, editingProfileName); }}
                        style={{ flex: 1, fontFamily: FONT_B, fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid " + th.accent, background: th.surface, color: th.text, outline: "none" }} />
                    : <button onClick={function() { if (!isActive) switchProfile(p.id); else setShowProfileMenu(false); }}
                        style={{ flex: 1, textAlign: "left", fontFamily: FONT_B, fontSize: 12, fontWeight: isActive ? 700 : 400, background: "transparent", border: "none", cursor: "pointer", color: isActive ? th.accent : th.text, padding: "2px 0" }}>
                        {(isActive ? "\u25CF " : "\u25CB ") + p.name}
                      </button>
                  }
                  <button onClick={function() { setEditingProfileId(p.id); setEditingProfileName(p.name); }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: th.textDim, padding: "2px 4px", flexShrink: 0 }} title="Renommer">{"✏️"}</button>
                  {!isActive && profiles.length > 1 &&
                    <button onClick={function() { askConfirm("Supprimer le profil \"" + p.name + "\" ?", function() { deleteProfile(p.id); }); setShowProfileMenu(false); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: th.danger, padding: "2px 4px", flexShrink: 0 }} title="Supprimer">{"\uD83D\uDDD1\uFE0F"}</button>
                  }
                </div>
              );
            })}
            {/* Créer un nouveau profil */}
            <div style={{ padding: "8px 10px", display: "flex", gap: 6, alignItems: "center" }}>
              <input value={newProfileName} onChange={function(e) { setNewProfileName(e.target.value); }}
                onKeyDown={function(e) { if (e.key === "Enter" && newProfileName.trim()) createProfile(newProfileName); }}
                placeholder="Nouveau profil…"
                style={{ flex: 1, fontFamily: FONT_B, fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid " + th.border, background: th.surface, color: th.text, outline: "none" }} />
              <button onClick={function() { if (newProfileName.trim()) createProfile(newProfileName); }}
                style={{ fontFamily: FONT_B, fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 4, cursor: "pointer", background: th.accent, border: "none", color: "#fff" }}>{"+"}</button>
            </div>
          </div>}
        </div>
        {!isMobile && examNomDS && (function() {
          if (exams.length <= 1) {
            return <span style={{ fontSize: 13, color: th.textMuted, fontFamily: FONT, fontStyle: "italic" }}>{"\u2014 " + examNomDS + (examDateDS ? " \u00B7 " + examDateDS : "")}</span>;
          }
          return (
            <div style={{ position: "relative" }}>
              <button
                onClick={function() { setShowMore(false); setShowProfileMenu(false); setShowDsMenu(function(v) { return !v; }); }}
                style={{ background: showDsMenu ? th.accentBg : "transparent", border: "1px solid " + (showDsMenu ? th.accent + "40" : th.border), borderRadius: th.radiusSm, padding: "3px 10px", cursor: "pointer", fontFamily: FONT, fontStyle: "italic", fontSize: 13, color: showDsMenu ? th.accent : th.textMuted }}
                title="Changer de devoir">
                {"\u2014 " + examNomDS + (examDateDS ? " \u00B7 " + examDateDS : "") + " \u25BE"}
              </button>
              {showDsMenu && (
                <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 4, background: th.card, border: "1px solid " + th.border, borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 120, minWidth: 200, overflow: "hidden" }}
                     onClick={function(e) { e.stopPropagation(); }}>
                  {exams.map(function(ex) {
                    var isActive = ex.id === activeExamId;
                    return (
                      <button key={ex.id}
                        onClick={function() { setActiveExamId(ex.id); setShowDsMenu(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: isActive ? th.accentBg : "transparent", border: "none", borderBottom: "1px solid " + th.border, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, color: isActive ? th.accent : th.text, textAlign: "left", fontWeight: isActive ? 700 : 400 }}>
                        <span style={{ fontSize: 9, color: isActive ? th.accent : th.textDim }}>{isActive ? "\u25CF" : "\u25CB"}</span>
                        <span style={{ flex: 1 }}>{ex.nomDS || ex.name}</span>
                        {ex.dateDS && <span style={{ fontSize: 10, color: th.textDim, fontFamily: MONO }}>{ex.dateDS}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        {exam && mode === "correct" && <span style={{ fontSize: isMobile ? 10 : 11, color: th.accent, fontWeight: 600, fontFamily: MONO, background: th.accentBg, padding: "3px 8px", borderRadius: 10, border: "1px solid " + th.accent + "25" }}>{gradedCount + "/" + presents.length}</span>}
        <div style={{ flex: 1 }} />
        {!isMobile && <div style={{ display: "flex", gap: 2 }}>
          {navItems.map(function(nn) { return (
            <button key={nn.id} onClick={function() { setMode(nn.id); }} style={{ display: "flex", alignItems: "center", gap: 3, padding: "6px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 600, border: "1px solid " + (mode === nn.id ? th.accent + "40" : "transparent"), background: mode === nn.id ? th.accent + "12" : "transparent", color: mode === nn.id ? th.accent : th.textMuted }}>
              {nn.ic} {nn.l}
            </button>
          ); })}
        </div>}
        {!isMobile && <div style={{ flex: 1 }} />}
        
        <button onClick={function() { setShowSettings(true); }} style={{ ...inp, cursor: "pointer", fontSize: 14, padding: "5px 9px" }}>{"\u2699\uFE0F"}</button>
        {!isMobile && <button onClick={saveJSON} style={{ ...inp, cursor: "pointer", fontSize: 12, padding: "5px 8px" }}>{"\uD83D\uDCBE"}</button>}
        {!isMobile && <button onClick={function() { fileRef.current && fileRef.current.click(); }} style={{ ...inp, cursor: "pointer", fontSize: 12, padding: "5px 8px" }}>{"\uD83D\uDCC2"}</button>}
        {/* Menu ⋯ — toujours à droite, contient zoom + thème + À propos */}
        <div style={{ position: "relative" }}>
          <button onClick={function() { setShowMore(function(v) { return !v; }); }}
            style={{ ...inp, cursor: "pointer", fontSize: 16, padding: "5px 9px", background: showMore ? th.accentBg : "transparent", border: "1px solid " + (showMore ? th.accent + "40" : th.border), color: showMore ? th.accent : th.textMuted }}
            title="Plus d'options">{"⋯"}</button>
          {showMore && <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: th.card, border: "1px solid " + th.border, borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 120, minWidth: 190, overflow: "hidden", padding: "6px 0" }} onClick={function(e) { e.stopPropagation(); }}>
            {/* Zoom */}
            <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", borderBottom: "1px solid " + th.border }}>
              <span style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, flex: 1 }}>{"Zoom"}</span>
              <button onClick={function() { setUiScale(function(v) { return Math.max(0.75, +(v - 0.05).toFixed(2)); }); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: th.textMuted, padding: "2px 7px", lineHeight: 1 }} title="Réduire">{"−"}</button>
              <span style={{ fontFamily: MONO, fontSize: 11, color: th.textDim, minWidth: 36, textAlign: "center", userSelect: "none" }}>{Math.round(uiScale * 100) + "%"}</span>
              <button onClick={function() { setUiScale(function(v) { return Math.min(1.5, +(v + 0.05).toFixed(2)); }); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: th.textMuted, padding: "2px 7px", lineHeight: 1 }} title="Agrandir">{"+"}</button>
            </div>
            {/* Thème */}
            <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid " + th.border, gap: 8 }}>
              <span style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, flex: 1 }}>{"Thème"}</span>
              {[{ v: "light", ic: "\u2600\uFE0F" }, { v: "dark", ic: "\uD83C\uDF19" }, { v: "young", ic: "\uD83C\uDF08" }].map(function(t) {
                return <button key={t.v} onClick={function() { setAppTheme(t.v); }}
                  style={{ background: appTheme === t.v ? th.accentBg : "transparent", border: "1px solid " + (appTheme === t.v ? th.accent + "55" : th.border), borderRadius: 4, cursor: "pointer", fontSize: 14, padding: "2px 6px", opacity: appTheme === t.v ? 1 : 0.5 }}
                  title={t.v}>{t.ic}</button>;
              })}
            </div>
            {/* À propos */}
            <button onClick={function() { setShowApropos(true); setShowMore(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "transparent", border: "none", cursor: "pointer", fontFamily: FONT_B, fontSize: 12, color: th.textMuted, textAlign: "left" }}>
              {"❓"} <span>{"À propos"}</span>
            </button>
          </div>}
        </div>
        {isMobile && <div style={{ position: "relative" }}>
          <button onClick={function() { setShowMore(!showMore); }} style={{ ...inp, cursor: "pointer", fontSize: 14, padding: "5px 9px" }}>{"\u22EF"}</button>
          {showMore && <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: th.card, border: "1px solid " + th.border, borderRadius: th.radiusSm, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 110, minWidth: 160, overflow: "hidden" }}>
            {[{ id: "prep", l: "Preparation", ic: "\u2699\uFE0F" }, { id: "export", l: "Export LaTeX", ic: "\uD83D\uDCC4" }].map(function(nn) { return (
              <button key={nn.id} onClick={function() { setMode(nn.id); setShowMore(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", cursor: "pointer", fontFamily: FONT_B, fontSize: 13, background: "transparent", border: "none", borderBottom: "1px solid " + th.border, color: th.text, textAlign: "left" }}>{nn.ic} {nn.l}</button>
            ); })}
            <button onClick={function() { saveJSON(); setShowMore(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", cursor: "pointer", fontFamily: FONT_B, fontSize: 13, background: "transparent", border: "none", borderBottom: "1px solid " + th.border, color: th.text, textAlign: "left" }}>{"\uD83D\uDCBE"} Sauver</button>
            <button onClick={function() { fileRef.current && fileRef.current.click(); setShowMore(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", cursor: "pointer", fontFamily: FONT_B, fontSize: 13, background: "transparent", border: "none", color: th.text, textAlign: "left" }}>{"\uD83D\uDCC2"} Charger</button>
          </div>}
        </div>}
        <input ref={fileRef} type="file" accept=".json" onChange={loadJSONFile} style={{ display: "none" }} />
      </header>
      {/* Barre de progression — correction uniquement */}
      {mode === "correct" && exam && presents.length > 0 && (
        <div style={{ height: 3, background: th.border, flexShrink: 0 }}>
          <div style={{ height: "100%", background: th.success, width: (gradedCount / presents.length * 100) + "%", transition: "width 0.4s" }} />
        </div>
      )}

      {/* MAIN — zoomé via la propriété CSS zoom (scroll natif, pas de compensation) */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ zoom: isMobile ? 1 : sc }}>
        <main key={mode === "resultats" ? "resultats-stable" : mode} className="tab-enter" style={{ padding: isMobile ? 6 : 10, maxWidth: isMobile ? "100%" : "840px", margin: "0 auto", width: "100%", boxSizing: "border-box", position: "relative", zIndex: 1, paddingBottom: isMobile ? 70 : 10 }}>


        {/* ═══ PREPARATION ═══ */}
        {mode === "prep" && <div>
          {/* Exam selector */}
          {exams.length > 1 && <div style={{ display: "flex", gap: 3, marginBottom: 10, flexWrap: "wrap" }}>
            {exams.map(function(ex) { return (
              <button key={ex.id} onClick={function() { setActiveExamId(ex.id); }} style={{ padding: "4px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 600, background: activeExamId === ex.id ? th.accentBg : th.surface, border: "1px solid " + (activeExamId === ex.id ? th.accent + "55" : th.border), color: activeExamId === ex.id ? th.accent : th.textMuted }}>{ex.nomDS || ex.name}</button>
            ); })}
          </div>}

          {/* Exam editor */}
          {exam && <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: collapsedExams[exam.id] ? "none" : "1px solid " + th.border, background: th.surface, cursor: "pointer" }} onClick={function() { setCollapsedExams(function(c) { var n2 = {}; for (var k in c) n2[k] = c[k]; n2[exam.id] = !c[exam.id]; return n2; }); }}>
              <span style={{ fontSize: 10, color: th.textDim, transform: collapsedExams[exam.id] ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>{"\u25BC"}</span>
              <input value={examNomDS} onChange={function(e) { e.stopPropagation(); setExamNomDS(e.target.value); }} onClick={function(e) { e.stopPropagation(); }} style={{ ...inp, flex: 2, fontSize: 16, fontWeight: 600, background: "transparent", border: "none" }} placeholder="Nom du DS (ex: DS 05)..." />
              <span style={{ fontSize: 11, color: th.textDim, fontFamily: FONT_B, flexShrink: 0 }}>{"Date :"}</span>
              <input value={examDateDS} onChange={function(e) { e.stopPropagation(); setExamDateDS(e.target.value); }} onClick={function(e) { e.stopPropagation(); }} style={{ ...inp, flex: 1, fontSize: 12, background: "transparent", border: "none", color: th.textMuted }} placeholder="jj/mm/aaaa..." />
              <span style={{ fontFamily: MONO, fontSize: 13, color: th.accent, fontWeight: 700, padding: "2px 8px", background: th.accentBg, borderRadius: th.radiusSm }}>{totalPts + " pts"}</span>
              <button onClick={function(e) { e.stopPropagation(); askConfirm("le devoir \u00AB\u00A0" + examNomDS + "\u00A0\u00BB", function() { deleteExam(exam.id); }); }} style={{ background: th.dangerBg, border: "none", color: th.danger, borderRadius: th.radiusSm, padding: "4px 6px", cursor: "pointer", fontSize: 12 }}>{"\u2717"}</button>
            </div>
            {!collapsedExams[exam.id] && <div style={{ padding: 10 }}>
              {/* ── Fonctionnalités du devoir ── */}
              {(function() {
                var ft = exam.features || DEFAULT_FEATURES;
                var PRESETS_UI = [
                  { key: "simple",   icon: "\u2659", name: "Simple",       desc: "Juste noter" },
                  { key: "standard", icon: "\u265C", name: "Standard",     desc: "+ comp\u00e9tences" },
                  { key: "complet",  icon: "\u2654", name: "Complet",      desc: "Tout activ\u00e9" },
                  { key: "custom",   icon: "\u265E", name: "Personnalis\u00e9", desc: "\u00c0 la carte" },
                ];
                var FEATURES_UI = [
                  { id: "competences",   label: "Comp\u00e9tences A/N/R/V",           tip: "Associe chaque question \u00e0 une comp\u00e9tence (Analyser, Nommer, Raisonner, V\u00e9rifier). Active le radar et les stats d\u00e9taill\u00e9es." },
                  { id: "coefficients",  label: "Coefficients \u00d7",               tip: "Pond\u00e8re chaque exercice par un coefficient multiplicateur. Utile pour des DS \u00e0 bar\u00e8me in\u00e9gal." },
                  { id: "questionBonus", label: "Questions bonus \uD83C\uDF81",       tip: "Les points de ces questions s\u2019ajoutent \u00e0 la note sans augmenter le maximum du DS." },
                  { id: "bonusComplet",  label: "Bonus exercice complet \uD83C\uDFC6", tip: "Accorde un bonus automatique si un \u00e9l\u00e8ve r\u00e9ussit tous les items d\u2019un exercice. Seuil configurable dans les R\u00e9glages." },
                  { id: "malusAuto",     label: "Malus automatiques",               tip: "Les remarques de pr\u00e9sentation d\u00e9comptent automatiquement des points selon les R\u00e9glages." },
                  { id: "questionPiege", label: "Questions pi\u00e8ges \u26a0",       tip: "Signale les questions o\u00f9 la majorit\u00e9 \u00e9choue malgr\u00e9 un bon score global. Mis en \u00e9vidence dans les Stats." },
                ];
                function setPreset(key) {
                  var n = deepClone(exam);
                  if (key !== "custom") {
                    n.features = Object.assign({ preset: key }, FEATURE_PRESETS[key]);
                  } else {
                    n.features = Object.assign({}, ft, { preset: "custom" });
                  }
                  updateExam(n);
                }
                function toggleFeat(id) {
                  var n = deepClone(exam);
                  var cur = Object.assign({}, DEFAULT_FEATURES, n.features || {});
                  cur[id] = !cur[id];
                  cur.preset = "custom";
                  n.features = cur;
                  updateExam(n);
                }
                return (
                  <div style={{ marginBottom: 10, border: "1px solid " + th.border, borderRadius: th.radiusSm, background: th.card, overflow: "hidden" }}>
                    <div onClick={function() { setFeatOpen(!featOpen); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: "pointer", background: th.surface }}>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT_B, color: th.text, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13 }}>{"\u2699"}</span>{"Fonctionnalit\u00e9s du devoir"}
                      </span>
                      <span style={{ fontSize: 10, color: th.textMuted, transform: featOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>{"\u25ba"}</span>
                    </div>
                    {featOpen && <div style={{ padding: "10px 12px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 10 }}>
                        {PRESETS_UI.map(function(p) {
                          var active = ft.preset === p.key;
                          return (
                            <div key={p.key} onClick={function() { setPreset(p.key); }} style={{ border: "1.5px solid " + (active ? th.accent : th.border), borderRadius: th.radiusSm, padding: "8px 4px", cursor: "pointer", textAlign: "center", background: active ? th.accentBg : th.surface }}>
                              <div style={{ fontSize: 18, color: th.text, marginBottom: 2, lineHeight: 1 }}>{p.icon}</div>
                              <div style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT_B, color: active ? th.accent : th.text, marginBottom: 1 }}>{p.name}</div>
                              <div style={{ fontSize: 9, color: th.textMuted, fontFamily: FONT_B }}>{p.desc}</div>
                            </div>
                          );
                        })}
                      </div>
                      {ft.preset !== "custom"
                        ? <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {FEATURES_UI.map(function(f) {
                              var on = ft[f.id];
                              return (
                                <span key={f.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, fontFamily: FONT_B, border: "1px solid " + (on ? th.accent + "35" : th.border), background: on ? th.accentBg : th.surface, color: on ? th.accent : th.textDim, textDecoration: on ? "none" : "line-through", opacity: on ? 1 : 0.6 }}>{f.label}</span>
                              );
                            })}
                          </div>
                        : <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {FEATURES_UI.map(function(f) {
                              var on = ft[f.id];
                              return (
                                <div key={f.id} onClick={function() { toggleFeat(f.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: th.radiusSm, border: "1px solid " + th.border, background: th.surface, cursor: "pointer", gap: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT_B, color: th.text }}>{f.label}</span>
                                    <span title={f.tip} style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid " + th.border, fontSize: 8, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", color: th.textMuted, background: th.surface, cursor: "help", flexShrink: 0 }}>{"i"}</span>
                                  </div>
                                  <div style={{ width: 28, height: 16, borderRadius: 8, background: on ? th.accent : th.border, position: "relative", flexShrink: 0 }}>
                                    <div style={{ position: "absolute", top: 2, left: on ? 12 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.18s" }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                      }
                    </div>}
                  </div>
                );
              })()}
              {exam.exercises.map(function(ex, exIdx) {
                var exPts = ex.questions.reduce(function(s2, q) { return s2 + q.items.reduce(function(si2, it) { return si2 + (+it.points || 0); }, 0); }, 0);
                var isCol = collapsed[ex.id];
                return (
                  <div key={ex.id} style={{ marginBottom: 8, background: th.surface, borderRadius: th.radiusSm, border: "1px solid " + th.border, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderBottom: isCol ? "none" : "1px solid " + th.border, cursor: "pointer" }} onClick={function() { setCollapsed(function(c) { var n2 = {}; for (var k in c) n2[k] = c[k]; n2[ex.id] = !c[ex.id]; return n2; }); }}>
                      <span style={{ fontSize: 10, color: th.textDim, transform: isCol ? "rotate(-90deg)" : "none", transition: "0.15s" }}>{"\u25BC"}</span>
                      <input value={ex.title} onChange={function(e) { e.stopPropagation(); updateExam(updPath(exam, ["exercises", exIdx, "title"], e.target.value)); }} onClick={function(e) { e.stopPropagation(); }} style={{ ...inp, flex: 1, fontWeight: 600, background: "transparent", border: "none" }} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: th.textMuted }}>{exPts + "pts"}</span>
                      {ft.coefficients && <input type="number" min="0" step="0.5" value={ex.coeff !== undefined ? ex.coeff : 1} onClick={function(e) { e.stopPropagation(); }} onChange={function(e) { e.stopPropagation(); var v = Math.max(0, parseFloat(e.target.value) || 0); updateExam(updPath(exam, ["exercises", exIdx, "coeff"], v)); }} style={{ ...inp, width: 46, fontSize: 10, fontFamily: MONO, textAlign: "center", color: th.accent, padding: "2px 3px" }} title={"Coefficient \u00D7 " + (ex.coeff !== undefined ? ex.coeff : 1)} />}
                      {ft.bonusComplet && <button onClick={function(e) { e.stopPropagation(); var n = deepClone(exam); n.exercises[exIdx].bonusComplet = !ex.bonusComplet; updateExam(n); }} title={"Bonus exercice complet : " + (ex.bonusComplet ? "activé" : "désactivé")} style={{ padding: "1px 5px", fontSize: 12, borderRadius: 3, cursor: "pointer", border: "1px solid " + (ex.bonusComplet ? th.success + "55" : th.border), background: ex.bonusComplet ? th.success + "18" : "transparent", color: ex.bonusComplet ? th.success : th.textDim }}>{"🏆"}</button>}
                      <button onClick={function(e) { e.stopPropagation(); moveExercise(exIdx, -1); }} disabled={exIdx === 0} style={{ background: "none", border: "none", color: exIdx === 0 ? th.textDim : th.textMuted, cursor: exIdx === 0 ? "default" : "pointer", fontSize: 10, padding: "0 2px" }} title="Monter">{"▲"}</button>
                      <button onClick={function(e) { e.stopPropagation(); moveExercise(exIdx, 1); }} disabled={exIdx === exam.exercises.length - 1} style={{ background: "none", border: "none", color: exIdx === exam.exercises.length - 1 ? th.textDim : th.textMuted, cursor: exIdx === exam.exercises.length - 1 ? "default" : "pointer", fontSize: 10, padding: "0 2px" }} title="Descendre">{"▼"}</button>
                      <button onClick={function(e) { e.stopPropagation(); askConfirm("l\u2019exercice \u00AB\u00A0" + ex.title + "\u00A0\u00BB", function() { delAt(exIdx); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 11 }}>{"\u2715"}</button>
                    </div>
                    {!isCol && <div style={{ padding: "4px 10px 8px" }}>
                      {ex.questions.map(function(q, qIdx) {
                        return (
                          <div key={q.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: qIdx < ex.questions.length - 1 ? "1px solid " + th.border + "22" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                              <span style={{ color: th.textMuted, fontSize: 10, fontWeight: 700, minWidth: 18 }}>Q.</span>
                              <input value={q.label} onChange={function(e) { updateExam(updPath(exam, ["exercises", exIdx, "questions", qIdx, "label"], e.target.value)); }} style={{ ...inp, width: 50 }} />
                              {ft.competences && <div style={{ display: "flex", gap: 2 }}>
                                {COMPETENCES.map(function(c) { return (
                                  <button key={c.id} onClick={function() { toggleComp(exIdx, qIdx, c.id); }} style={{ padding: "1px 6px", fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: "pointer", border: "1px solid " + (q.competences.indexOf(c.id) >= 0 ? compColor(c, dark) + "55" : th.border), background: q.competences.indexOf(c.id) >= 0 ? compColor(c, dark) + "22" : "transparent", color: q.competences.indexOf(c.id) >= 0 ? compColor(c, dark) : th.textDim, fontFamily: FONT_B }}>{c.short}</button>
                                ); })}
                              </div>}
                              {ft.questionBonus && <button onClick={function() { var n = deepClone(exam); n.exercises[exIdx].questions[qIdx].bonus = !q.bonus; updateExam(n); }} title="Question bonus (points hors maximum)" style={{ padding: "1px 5px", fontSize: 11, borderRadius: 3, cursor: "pointer", border: "1px solid " + (q.bonus ? th.warning + "55" : th.border), background: q.bonus ? th.warningBg : "transparent", color: q.bonus ? th.warning : th.textDim }}>{"\uD83C\uDF81"}</button>}
                              <div style={{ flex: 1 }} />
                              <span style={{ fontFamily: MONO, fontSize: 9, color: th.textMuted }}>{q.items.reduce(function(s2, it) { return s2 + (+it.points || 0); }, 0) + "pts"}</span>
                              <button onClick={function() { moveQuestion(exIdx, qIdx, -1); }} disabled={qIdx === 0} style={{ background: "none", border: "none", color: qIdx === 0 ? th.textDim : th.textMuted, cursor: qIdx === 0 ? "default" : "pointer", fontSize: 9, padding: "0 1px" }} title="Monter">{"▲"}</button>
                              <button onClick={function() { moveQuestion(exIdx, qIdx, 1); }} disabled={qIdx === ex.questions.length - 1} style={{ background: "none", border: "none", color: qIdx === ex.questions.length - 1 ? th.textDim : th.textMuted, cursor: qIdx === ex.questions.length - 1 ? "default" : "pointer", fontSize: 9, padding: "0 1px" }} title="Descendre">{"▼"}</button>
                              <button onClick={function() { askConfirm("la question \u00AB\u00A0Q.\u00A0" + q.label + "\u00A0\u00BB", function() { delAt(exIdx, qIdx); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                            </div>
                            <div style={{ marginLeft: 24 }}>
                              {q.items.map(function(it, iIdx) { return (
                                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                  <span style={{ color: th.textDim, fontSize: 8 }}>{"\u2022"}</span>
                                  <input value={it.label} onChange={function(e) { updateExam(updPath(exam, ["exercises", exIdx, "questions", qIdx, "items", iIdx, "label"], e.target.value)); }} style={{ ...inp, flex: 1, fontSize: 11, padding: "2px 6px" }} placeholder="Description..." />
                                  <input type="number" step="0.5" min="0" value={it.points} onChange={function(e) { updateExam(updPath(exam, ["exercises", exIdx, "questions", qIdx, "items", iIdx, "points"], parseFloat(e.target.value) || 0)); }} style={{ ...inp, width: 44, fontSize: 11, fontFamily: MONO, textAlign: "center", color: th.accent, padding: "2px 3px" }} />
                                  <button onClick={function() { askConfirm("l\u2019item \u00AB\u00A0" + (it.label || "sans nom") + "\u00A0\u00BB", function() { delAt(exIdx, qIdx, iIdx); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 9 }}>{"\u2715"}</button>
                                </div>
                              ); })}
                              <button onClick={function() { addItem(exIdx, qIdx); }} style={{ background: "none", border: "none", color: th.accent, cursor: "pointer", fontSize: 10, fontFamily: FONT_B }}>+ Item</button>
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={function() { addQuestion(exIdx); }} style={{ background: th.accentBg, border: "1px dashed " + th.accent + "33", color: th.accent, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT_B, width: "100%" }}>+ Question</button>
                    </div>}
                  </div>
                );
              })}
              <button onClick={addExercise} style={{ background: th.accentBg, border: "1px dashed " + th.accent + "44", color: th.accent, borderRadius: th.radiusSm, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT_B, width: "100%" }}>+ Exercice</button>
            </div>}
          </div>}

          <button onClick={createExam} style={{ background: th.accentBg, border: "1px dashed " + th.accent + "55", color: th.accent, borderRadius: th.radius, padding: "10px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT_B, width: "100%", marginBottom: 14 }}>+ Nouveau devoir</button>

          {/* Students */}
          <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT }}>{"Eleves (" + students.length + ")"}</span>
              <div style={{ flex: 1 }} />
              <button onClick={function() { setShowGroupes(!showGroupes); }} style={{ background: showGroupes ? th.accentBg : th.surface, border: "1px solid " + (showGroupes ? th.accent + "33" : th.border), color: showGroupes ? th.accent : th.textMuted, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT_B }}>Groupes</button>
              <button onClick={function() { csvRef.current && csvRef.current.click(); }} style={{ background: th.accentBg, border: "1px solid " + th.accent + "33", color: th.accent, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT_B }}>{"\uD83D\uDCC2 CSV"}</button>
              <input ref={csvRef} type="file" accept=".csv,.txt,.tsv" onChange={handleCSV} style={{ display: "none" }} />
            </div>
            <div style={{ fontSize: 10, color: th.textDim, marginBottom: 8, fontFamily: FONT_B }}>NOM;Prenom — un par ligne</div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {students.map(function(st, idx) { return (
                <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: th.textDim, minWidth: 18, textAlign: "right" }}>{idx + 1}</span>
                  <input value={st.nom} onChange={function(e) { var n2 = students.slice(); n2[idx] = { ...n2[idx], nom: e.target.value }; setStudents(n2); }} placeholder="NOM" style={{ ...inp, flex: 1, fontSize: 12 }} />
                  <input value={st.prenom} onChange={function(e) { var n2 = students.slice(); n2[idx] = { ...n2[idx], prenom: e.target.value }; setStudents(n2); }} placeholder="Prenom" style={{ ...inp, flex: 1, fontSize: 12 }} />
                  {showGroupes && [TT_GROUPE].concat(groupesDef).map(function(g) {
                    var inG = (groupes[g.id] || []).indexOf(st.id) >= 0;
                    return <button key={g.id} onClick={function() { var cur = groupes[g.id] || []; var n2 = {}; for (var k in groupes) n2[k] = groupes[k]; n2[g.id] = inG ? cur.filter(function(id) { return id !== st.id; }) : cur.concat([st.id]); setGroupes(n2); }} style={{ padding: "0px 5px", fontSize: 8, fontWeight: 700, borderRadius: 3, cursor: "pointer", fontFamily: FONT_B, border: "1px solid " + (inG ? compColor(g, dark) + "55" : th.border), background: inG ? compColor(g, dark) + "22" : "transparent", color: inG ? compColor(g, dark) : th.textDim }}>{g.label}</button>;
                  })}
                  <button onClick={function() { askConfirm((st.prenom + " " + st.nom).trim() || "cet élève", function() { setStudents(students.filter(function(_, j) { return j !== idx; })); }); }} style={{ background: "none", border: "none", color: th.textDim, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                </div>
              ); })}
            </div>
            <button onClick={function() { setStudents(students.concat([{ id: uid(), nom: "", prenom: "" }])); }} style={{ marginTop: 4, background: "none", border: "1px dashed " + th.border, color: th.textMuted, borderRadius: th.radiusSm, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontFamily: FONT_B, width: "100%" }}>+ Eleve</button>
          </div>
        </div>}

        {/* ═══ CORRECTION ═══ */}
        {mode === "correct" && exam && students.length > 0 && <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 80 }}>
          {/* Search overlay */}
          {showSearch && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 150, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }} onClick={function() { setShowSearch(false); setSearchTerm(""); }}>
            <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={function(e) { e.stopPropagation(); }}>
              <input ref={searchInputRef} value={searchTerm} onChange={function(e) { setSearchTerm(e.target.value); }} placeholder="Chercher un élève" style={{ background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, padding: "10px 12px", fontSize: 15, fontFamily: FONT_B, outline: "none", width: "100%", marginBottom: 6, boxSizing: "border-box" }} />
              {searchResults.map(function(o) { return (
                <button key={o.st.id} onClick={function() { setSi(o.idx); setEi(0); setShowSearch(false); setSearchTerm(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginBottom: 2, borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 14, textAlign: "left", background: o.idx === si ? th.accentBg : "transparent", border: "1px solid " + (o.idx === si ? th.accent + "30" : th.border), color: th.text }}>
                  <span style={{ fontWeight: 600 }}>{o.st.prenom}</span> <span style={{ fontVariant: "small-caps" }}>{o.st.nom}</span>
                  {absents[o.st.id] && <span style={{ fontSize: 10, color: th.danger, marginLeft: "auto" }}>absent</span>}
                </button>); })}
              {searchTerm.trim().length > 0 && searchResults.length === 0 && <div style={{ padding: 10, textAlign: "center", color: th.textDim, fontSize: 13 }}>Aucun r\u00E9sultat</div>}
            </div>
          </div>}

          {/* Student card */}
          <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: "14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: th.shadow, overflow: "hidden" }}>
            <div onClick={function() { if (si > 0) { setSi(si - 1); setEi(0); } }} style={{ fontSize: 18, color: si === 0 ? th.textDim : th.textMuted, cursor: "pointer", padding: "0 4px", userSelect: "none" }}>{"\u25C2"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT }}>{s.prenom} <span style={{ fontVariant: "small-caps", letterSpacing: "0.5px" }}>{s.nom}</span></div>
                <button onClick={function() { setShowSearch(true); }} style={{ background: "none", border: "1px solid " + th.border, borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10, color: th.textDim, fontFamily: FONT_B }}>{"\uD83D\uDD0D"}</button>
              </div>
              <div style={{ fontSize: 13, color: th.textMuted, fontFamily: FONT_B, marginTop: 2 }}>
                {"Rang "}<b style={{ color: th.accent }}>{rang}</b>{"/" + presents.length}
                {(groupes.tt || []).indexOf(s.id) >= 0 && <span style={{ color: th.warning, marginLeft: 6 }}>{"\u23F1 TT"}</span>}
              </div>
            </div>
            <RadarChart compValues={cpVals} exAbsValues={eAbsVals} exRelValues={eRelVals} size={105} dark={dark} />
            <div style={{ textAlign: "right", minWidth: 70 }}>
              <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: curNote >= 14 ? th.success : curNote >= 10 ? th.warning : th.danger }}>{curNote.toFixed(1)}<span style={{ fontSize: 11, color: th.textDim }}>/20</span></div>
              {isNorm && <div style={{ fontFamily: MONO, fontSize: 11, color: th.textDim }}>{"brut " + curBrut.toFixed(1)}</div>}
              <div style={{ fontFamily: MONO, fontSize: 12, color: th.textDim }}>{stuTot + "/" + et + " pts"}</div>
            </div>
            <div onClick={function() { if (si < students.length - 1) { setSi(si + 1); setEi(0); } }} style={{ fontSize: 18, color: si === students.length - 1 ? th.textDim : th.textMuted, cursor: "pointer", padding: "0 4px", userSelect: "none" }}>{"\u25B8"}</div>
          </div>

          {/* Competences */}
          {ft.competences && <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            {COMPETENCES.map(function(c) { return (
              <div key={c.id} style={{ flex: 1, padding: "5px", borderRadius: th.radiusSm, border: "2px solid " + compColor(c, dark), background: compColor(c, dark) + "08", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: th.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: FONT_B }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: compColor(c, dark), fontFamily: MONO }}>{cnVals[c.id]}</div>
              </div>); })}
            <button onClick={function() { setAbsents(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[s.id] = !p[s.id]; return n; }); }} style={{ padding: "4px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 600, background: absents[s.id] ? th.dangerBg : th.surface, border: "1px solid " + (absents[s.id] ? th.danger + "40" : th.border), color: absents[s.id] ? th.danger : th.textMuted }}>
              {absents[s.id] ? "\u2717 Abs." : "Abs.?"}
            </button>
          </div>}

          {/* Malus */}
          {ft.malusAuto && showMalusBar && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: th.radiusSm, background: hasMalus ? th.dangerBg : th.surface, border: "1px solid " + (hasMalus ? th.danger + "30" : th.border) }}>
            <span style={{ fontSize: 11, fontFamily: FONT_B, color: hasMalus ? th.danger : th.textMuted }}>
              {remCount + " remarque" + (remCount > 1 ? "s" : "")}
              {autoMalusVal > 0 && <span style={{ fontWeight: 700 }}>{" malus " + autoMalusVal + "%"}</span>}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>Manuel :</span>
            <input type="number" min="0" max="100" step="1" value={manMalus}
              onChange={function(e) { var v = Math.max(0, +e.target.value || 0); setMalusManuel(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[s.id] = v; return n; }); }}
              style={{ background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: 4, width: 40, textAlign: "center", fontFamily: MONO, fontSize: 11, padding: "2px 4px", outline: "none" }} />
            <span style={{ fontSize: 10, color: th.textDim }}>%</span>
            {totalMalusVal > 0 && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: MONO, color: th.danger }}>{"Total: -" + totalMalusVal + "%"}</span>}
          </div>}

          {/* Commentaire libre */}
          {!absents[s.id] && <div style={{ marginBottom: 8 }}>
            <textarea
              value={commentaires[s.id] || ""}
              onChange={function(e) {
                var v = e.target.value;
                setCommentaires(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[s.id] = v; return n; });
              }}
              placeholder={"Commentaire pour " + s.prenom + "\u2026"}
              rows={2}
              style={{ width: "100%", background: th.card, border: "1px solid " + th.border, color: th.text, borderRadius: th.radiusSm, padding: "7px 10px", fontSize: 12, fontFamily: FONT_B, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
            />
          </div>}

          {/* Exercise tabs */}
          <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
            {exam.exercises.map(function(x, i) {
              var sc = exerciseScore(grades, s.id, x, bonusCompletConfig);
              var xt = x.questions.reduce(function(ss, q) { return ss + q.items.reduce(function(si2, it) { return si2 + (+it.points || 0); }, 0); }, 0);
              return (
                <button key={x.id} onClick={function() { setEi(i); }} style={{ flex: 1, padding: "6px 3px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 600, background: i === ei ? th.accent + "15" : "transparent", border: "1.5px solid " + (i === ei ? th.accent + "50" : th.border), color: i === ei ? th.accent : th.textMuted }}>
                  <div>{x.title.length > 20 ? x.title.slice(0, 18) + "\u2026" : x.title}</div>
                  <div style={{ fontSize: 9, fontFamily: MONO, opacity: 0.7 }}>{sc.earned + "/" + xt}{sc.bonus > 0 ? " 🏆" : ""}</div>
                </button>); })}
          </div>

          {/* Questions */}
          {!absents[s.id] && exCur && exCur.questions.map(function(q) {
            var sc = questionScore(grades, s.id, q);
            var qr = remarks[remarkKey(s.id, q.id)] || [];
            return (
              <div key={q.id} style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, marginBottom: 6, overflow: "hidden", boxShadow: th.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderBottom: "1px solid " + th.border, background: th.surface }}>
                  <span style={{ fontWeight: 700, fontSize: 13, fontFamily: FONT }}>{"Q. " + q.label}</span>
                  {q.bonus && <span title="Question bonus" style={{ fontSize: 10, padding: "0 4px", borderRadius: 6, border: "1px solid " + th.warning + "55", background: th.warningBg, color: th.warning }}>{"\uD83C\uDF81 bonus"}</span>}
                  {ft.competences && q.competences.map(function(cid) { var c = COMPETENCES.find(function(x) { return x.id === cid; }); return c ? <span key={c.id} style={{ fontSize: 8, fontWeight: 700, padding: "0 4px", borderRadius: 6, border: "1.5px solid " + compColor(c, dark), color: compColor(c, dark), fontFamily: MONO }}>{c.short}</span> : null; })}
                  <div style={{ flex: 1 }} />
                  <AudioRecorder
                    nomDS={examNomDS}
                    studentNom={s.nom}
                    exTitle={exCur ? exCur.title : ""}
                    qLabel={q.label}
                    th={th}
                    FONT_B={FONT_B}
                    MONO={MONO}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: sc.earned === sc.total ? th.success : sc.earned > 0 ? th.warning : th.textDim }}>{sc.earned + "/" + sc.total}</span>
                </div>
                <div style={{ padding: 6 }}>
                  {q.items.map(function(it) {
                    var ch = !!grades[gradeKey(s.id, it.id)];
                    return (
                      <button key={it.id} onClick={function() { setGrades(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[gradeKey(s.id, it.id)] = !p[gradeKey(s.id, it.id)]; return n; }); }} style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 8, width: "100%", padding: isMobile ? "14px 12px" : "11px 10px", marginBottom: 2, borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 15 : 13, textAlign: "left", background: ch ? th.success + "0a" : "transparent", border: "1.5px solid " + (ch ? th.success + "35" : th.border), color: ch ? th.text : th.textMuted, WebkitTapHighlightColor: "transparent" }}>
                        <div style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 13, fontWeight: 800, background: ch ? th.success : "transparent", border: "2px solid " + (ch ? th.success : th.textDim), color: ch ? (dark ? "#1a1814" : "#fff") : "transparent", flexShrink: 0 }}>{"\u2713"}</div>
                        <span style={{ flex: 1, fontWeight: 500 }}>{it.label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: ch ? th.success : th.textDim }}>{it.points}</span>
                      </button>); })}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                    {allRemarques.map(function(rem) {
                      var act = qr.indexOf(rem.id) >= 0;
                      return <button key={rem.id} onClick={function() { setRemarks(function(p) { var k = remarkKey(s.id, q.id); var c = p[k] || []; var n = {}; for (var kk in p) n[kk] = p[kk]; n[k] = c.indexOf(rem.id) >= 0 ? c.filter(function(r) { return r !== rem.id; }) : c.concat([rem.id]); return n; }); }} style={{ padding: isMobile ? "8px 12px" : "5px 9px", borderRadius: 14, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 12 : 10, fontWeight: 600, background: act ? th.warningBg : "transparent", border: "1px solid " + (act ? th.warning + "40" : th.border), color: act ? th.warning : th.textMuted }}>{rem.icon + " " + rem.label}</button>; })}
                  </div>
                  {/* Case "traitée" — visible seulement si aucun item n'est coché */}
                  {sc.earned === 0 && (
                    <button
                      onClick={function() {
                        var key = treatedKey(s.id, q.id);
                        setGrades(function(g) {
                          var ng = Object.assign({}, g);
                          if (ng[key]) delete ng[key]; else ng[key] = true;
                          return ng;
                        });
                      }}
                      style={{
                        marginTop: 4,
                        padding: "2px 8px",
                        fontSize: 9,
                        borderRadius: 3,
                        cursor: "pointer",
                        border: "1px solid " + (grades[treatedKey(s.id, q.id)] ? th.warning + "66" : th.border),
                        background: grades[treatedKey(s.id, q.id)] ? th.warning + "22" : "transparent",
                        color: grades[treatedKey(s.id, q.id)] ? th.warning : th.textDim,
                        fontFamily: FONT_B,
                        fontWeight: 600,
                      }}
                    >
                      {grades[treatedKey(s.id, q.id)] ? "✓ traitée (0 pt)" : "marquer traitée"}
                    </button>
                  )}

                </div>
              </div>); })}

          

          {/* Bottom nav — navigation par exercice avec wrap vers élève suivant/précédent */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, position: "sticky", bottom: isMobile ? 64 : 8 }}>
            <button onClick={function() {
              if (ei > 0) {
                setEi(ei - 1);
              } else if (si > 0) {
                setSi(si - 1);
                setEi(exam.exercises.length - 1);
              }
            }} style={{ flex: 1, padding: isMobile ? "16px" : "14px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 14 : 13, fontWeight: 700, background: th.card, border: "1px solid " + th.border, color: (si === 0 && ei === 0) ? th.textDim : th.text, boxShadow: th.shadow }}>{"◄ Ex. pr\u00E9c."}</button>
            <button onClick={function() {
              if (ei < exam.exercises.length - 1) {
                setEi(ei + 1);
              } else if (si < students.length - 1) {
                setSi(si + 1);
                setEi(0);
              }
            }} style={{ flex: 1, padding: isMobile ? "16px" : "14px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: isMobile ? 14 : 13, fontWeight: 700, background: th.accent, border: "none", color: "#fff", boxShadow: th.shadow }}>{"Ex. suiv. \u25BA"}</button>
          </div>
        </div>}



        {/* ═══ RÉSULTATS INDIVIDUELS ═══ */}
        {mode === "resultats" && (function() {
          if (!exam) return <div style={{ textAlign: "center", padding: 40, color: th.textMuted }}>{"Créez d'abord un devoir dans l'onglet Préparation."}</div>;
          if (!corriges.length) return <div style={{ textAlign: "center", padding: 40, color: th.textMuted }}>{"Aucune copie corrigée pour l'instant."}</div>;

          var htmlStudent = htmlStudentForPreview;
          var modeClasse = htmlStudentId === "__classe__";
          if (!htmlStudent && !modeClasse) return null;

          return (
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", gap: 0 }}>
              {/* Barre de sélection */}
              <div style={{ background: th.card, borderBottom: "1px solid " + th.border, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: th.textMuted, fontFamily: FONT_B }}>{"Aperçu"}</span>
                <select
                  value={modeClasse ? "__classe__" : (htmlStudent ? htmlStudent.id : "")}
                  onChange={function(e) { setHtmlStudentId(e.target.value); }}
                  style={{ ...inp, fontSize: 13, padding: "5px 10px", minWidth: 200 }}>
                  <option value="__classe__">📊 Toute la classe</option>
                  <option disabled>──────────────</option>
                  {corriges.slice().sort(function(a, b) { return a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom); }).map(function(s) {
                    return <option key={s.id} value={s.id}>{s.nom + " " + s.prenom}</option>;
                  })}
                </select>
                {!modeClasse && htmlStudent && (
                  <span style={{ fontSize: 11, color: th.textDim, fontFamily: MONO }}>
                    {fmt1(getNote20(htmlStudent.id)) + "/20 · rang " + (htmlRankMapForPreview[htmlStudent.id] || "—") + "/" + corriges.length}
                  </span>
                )}
                <div style={{ flex: 1 }} />
              </div>
              {/* Panel config rapport classe */}
              {modeClasse && (
                <div style={{ background: th.surface || th.card, borderBottom: "1px solid " + th.border, padding: "6px 14px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
                  {[
                    { key: "commentaire",   label: "Commentaire" },
                    { key: "statsGlobales", label: "Stats" },
                    { key: "distribution",  label: "Distribution" },
                    { key: "parCompetence", label: "Compétences" },
                    { key: "parExercice",   label: "Exercices" },
                  ].map(function(item) {
                    return (
                      <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", color: th.textMuted, userSelect: "none" }}>
                        <input type="checkbox"
                          checked={!!(rapportClasseConfig && rapportClasseConfig[item.key])}
                          onChange={function(e) {
                            setRapportClasseConfig(Object.assign({}, rapportClasseConfig, { [item.key]: e.target.checked }));
                          }}
                        />
                        {item.label}
                      </label>
                    );
                  })}
                </div>
              )}
              {/* Iframe d'aperçu — htmlSrc est mémoïsé, pas de rechargement parasite */}
              <iframe
                key="preview-iframe"
                srcDoc={modeClasse ? htmlClasseSrc : htmlSrc}
                style={{ flex: 1, border: "none", width: "100%", background: htmlConfig.theme === "dark" ? "#1a1814" : htmlConfig.theme === "young" ? "#f0f4ff" : "#faf7f2" }}
                title={modeClasse ? "Aperçu rapport de classe" : "Aperçu rapport " + (htmlStudent ? htmlStudent.prenom + " " + htmlStudent.nom : "")}
              />
            </div>
          );
        })()}

        {/* ═══ STATS ═══ */}
        {mode === "stats" && exam && <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            {statGroups.length > 1 && statGroups.map(function(g) { return (
              <button key={g.id} onClick={function() { setStatGroup(g.id); }} style={{ padding: "4px 10px", borderRadius: 12, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 700, background: statGroup === g.id ? th.accent + "18" : "transparent", border: "1px solid " + (statGroup === g.id ? th.accent + "40" : th.border), color: statGroup === g.id ? th.accent : th.textMuted }}>
                {g.label}
              </button>); })}
            <div style={{ flex: 1 }} />
            {["general", "exercices", "classement", "progression"].map(function(t) { return (
              <button key={t} onClick={function() { setTab(t); }} style={{ padding: "6px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 600, background: tab === t ? th.accent + "18" : "transparent", border: "1px solid " + (tab === t ? th.accent + "40" : th.border), color: tab === t ? th.accent : th.textMuted }}>{t === "general" ? "G\u00E9n\u00E9ral" : t === "exercices" ? "Exercices" : t === "classement" ? "Classement" : "Progression"}</button>); })}
          </div>

          {tab === "general" && <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 8 }}>
            {[{ l: "Moy", v: statMoy, c: th.accent }, { l: "Méd", v: statMed, c: th.violet }, { l: "Min", v: statMin, c: th.danger }, { l: "Max", v: statMax, c: th.success }, { l: "σ", v: statSigma, c: th.textMuted }].map(function(x) { return (
                <div key={x.l} style={{ background: th.card, borderRadius: th.radiusSm, border: "1px solid " + th.border, padding: "7px 5px", textAlign: "center", boxShadow: th.shadow }}>
                  <div style={{ fontSize: 9, color: th.textMuted, fontFamily: FONT_B }}>{x.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: MONO, color: x.c }}>{x.v.toFixed(1)}<span style={{ fontSize: 9, color: th.textDim }}>/20</span></div>
                </div>); })}
            </div>
            <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, marginBottom: 8, boxShadow: th.shadow }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>{"Distribution /20" + (isNorm ? " (norm.)" : "")}</div>
              <Histo bins={Array.from({ length: 21 }, function(_, i) {
                return { note: i, count: statNotes.filter(function(nn) { return Math.min(20, Math.floor(nn)) === i; }).length };
              })} colorFn={function(nn) { return nn < 8 ? th.danger + "aa" : nn < 12 ? th.warning + "aa" : th.success + "aa"; }} th={th}
                moyLine={statMoy} medLine={statMed} />
            </div>
            {ft.competences && <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, boxShadow: th.shadow }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>{"Comp\u00E9tences"}</div>
              {COMPETENCES.map(function(c) {
                var tp = 0, ep = 0;
                exam.exercises.forEach(function(ex) { ex.questions.forEach(function(q) { if (q.competences.indexOf(c.id) < 0) return; q.items.forEach(function(it) { var pts = +it.points || 0; tp += pts * filteredCorriges.length; filteredCorriges.forEach(function(ss) { if (grades[ss.id + "__" + it.id]) ep += pts; }); }); }); });
                var pct = tp > 0 ? (ep / tp) * 100 : 0;
                return (
                  <div key={c.id} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2, fontFamily: FONT_B }}>
                      <span style={{ color: compColor(c, dark), fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontFamily: MONO, color: th.textMuted }}>{pct.toFixed(0) + "%"}</span>
                    </div>
                    <PBar value={pct} max={100} color={compColor(c, dark)} th={th} />
                  </div>); })}
            </div>}
          </div>}
          {tab === "exercices" && exam.exercises.map((exx, i) => {
            const exT = exx.questions.reduce((s, q) =>
              s + (q.items || []).reduce((si2, it) => si2 + (parseFloat(it.points) || 0), 0), 0);
            const enotes = filteredCorriges
              .map(s => exerciseScore(grades, s.id, exx).earned)
              .sort((a, b) => a - b);
            const copies = filteredCorriges.filter(s =>
              exx.questions.some(q =>
                !!grades[treatedKey(s.id, q.id)] ||
                (q.items || []).some(it => grades[gradeKey(s.id, it.id)])
              )
            ).length;
            const emoy = enotes.length ? enotes.reduce((a, b) => a + b, 0) / enotes.length : 0;
            const bins = Array.from({ length: Math.ceil(exT) + 1 }, (_, j) => ({ note: j, count: 0 }));
            filteredCorriges.forEach(s => {
              const sc = exerciseScore(grades, s.id, exx).earned;
              bins[Math.min(bins.length - 1, Math.floor(sc))].count++;
            });
            const qStats = exx.questions.map(q => {
              const tot = (q.items || []).reduce((s, it) => s + (parseFloat(it.points) || 0), 0);
              let nb = 0, obt = 0;
              for (const ss of filteredCorriges) {
                const qTraitee = !!grades[treatedKey(ss.id, q.id)]
                  || (q.items || []).some(it => grades[gradeKey(ss.id, it.id)]);
                if (qTraitee) {
                  nb++;
                  for (const it of (q.items || []))
                    if (grades[gradeKey(ss.id, it.id)]) obt += parseFloat(it.points) || 0;
                }
              }
              const n = filteredCorriges.length;
              const tauxTraitement = n > 0 ? (nb / n) * 100 : 0;
              const tauxReussite   = nb > 0 && tot > 0 ? (obt / (nb * tot)) * 100 : 0;
              return {
                q, tot, nb,
                tauxTraitement,
                tauxReussite,
                difficile: tauxTraitement < seuilDifficile,
                piege: tauxTraitement >= 50 && tauxReussite < seuilPiege,
              };
            });
            return (
              <div key={exx.id} style={{ background: th.card, borderRadius: th.radius, border: `1px solid ${th.border}`, padding: 12, marginBottom: 8, boxShadow: th.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT }}>{exx.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: th.textMuted }}>{"/" + exT}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: th.textMuted, fontFamily: FONT_B }}>{copies + " copies"}</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 11, fontFamily: FONT_B }}>
                  <span>Moy: <b style={{ fontFamily: MONO, color: th.accent }}>{emoy.toFixed(1)}</b></span>
                  <span>Min: <b style={{ fontFamily: MONO, color: th.danger }}>{enotes[0] != null ? enotes[0].toFixed(1) : "—"}</b></span>
                  <span>Max: <b style={{ fontFamily: MONO, color: th.success }}>{enotes[enotes.length - 1] != null ? enotes[enotes.length - 1].toFixed(1) : "—"}</b></span>
                </div>
                <Histo bins={bins} th={th} />
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 16, fontSize: 9, fontWeight: 600,
                      color: th.textMuted, marginBottom: 3, fontFamily: FONT_B }}>
                    <span style={{ minWidth: 28 }}></span>
                    <span style={{ flex: 1 }}>Traitement (% classe)</span>
                    <span style={{ flex: 1 }}>Réussite (parmi traités)</span>
                  </div>
                  {qStats.map((qs, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <span style={{ fontWeight: (qs.difficile || qs.piege) ? 700 : 500, fontSize: 10, minWidth: 28,
                          color: qs.difficile ? th.danger : qs.piege ? th.warning : th.text, fontFamily: FONT_B }}>
                        {"Q." + qs.q.label}{ft.questionPiege && qs.piege ? " ⚠️" : ""}
                      </span>
                      {/* Barre traitement — rouge si question difficile */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}>
                        <PBar value={qs.tauxTraitement} max={100}
                          color={qs.difficile ? th.danger : qs.piege ? th.warning : th.textMuted} h={5} th={th} />
                        <span style={{ fontFamily: MONO, fontSize: 9,
                            color: qs.diff ? th.danger : th.textMuted, minWidth: 26, textAlign: "right" }}>
                          {qs.tauxTraitement.toFixed(0) + "%"}
                        </span>
                      </div>
                      {/* Barre réussite — colorée selon le score */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}>
                        <PBar value={qs.tauxReussite} max={100}
                          color={qs.tauxReussite < 33 ? th.danger : qs.tauxReussite < 66 ? th.warning : th.success}
                          h={5} th={th} />
                        <span style={{ fontFamily: MONO, fontSize: 9, color: th.textMuted,
                            minWidth: 26, textAlign: "right" }}>
                          {qs.tauxReussite.toFixed(0) + "%"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}


        {tab === "classement" && (function() {
          var withNotes = filteredCorriges.map(function(ss) { return { student: ss, note20: getNote20(ss.id) }; });
          var byNote = withNotes.slice().sort(function(a, b) { return b.note20 - a.note20; });
          var rangMap2 = {}; var rr = 1;
          byNote.forEach(function(r, i) { if (i > 0 && r.note20 < byNote[i-1].note20) rr = i + 1; rangMap2[r.student.id] = rr; });
          var sorted = withNotes.slice().sort(csortMode === "alpha"
            ? function(a, b) { var na = (a.student.nom + a.student.prenom).toLowerCase(); var nb = (b.student.nom + b.student.prenom).toLowerCase(); return na < nb ? -1 : na > nb ? 1 : 0; }
            : function(a, b) { return b.note20 - a.note20; });
          return (
            <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, boxShadow: th.shadow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT, flex: 1 }}>{"Classement (" + filteredCorriges.length + " \u00E9l.)"}</div>
                {["rang", "alpha"].map(function(m) { return (
                  <button key={m} onClick={function() { setCsortMode(m); }}
                    style={{ padding: "3px 9px", borderRadius: 10, cursor: "pointer", fontFamily: FONT_B, fontSize: 10, fontWeight: 600, background: csortMode === m ? th.accent + "18" : "transparent", border: "1px solid " + (csortMode === m ? th.accent + "40" : th.border), color: csortMode === m ? th.accent : th.textMuted }}>
                    {m === "rang" ? "Par rang" : "A \u2192 Z"}
                  </button>); })}
              </div>
              {sorted.map(function(r, i) {
                var rang2 = rangMap2[r.student.id];
                var cn2 = notesParCompetence(grades, r.student.id, exam, seuils);
                var exVals = exam.exercises.map(function(ex) { var s = exerciseScore(grades, r.student.id, ex); return s.total > 0 ? s.earned / s.total : 0; });
                return (
                  <div key={r.student.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 2px", borderBottom: i < sorted.length - 1 ? "1px solid " + th.border : "none" }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: th.textDim, minWidth: 18, textAlign: "right" }}>{rang2}</span>
                    <MiniRadarEx values={exVals} size={30} dark={dark} />
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, fontFamily: FONT_B }}>{r.student.prenom} <span style={{ fontVariant: "small-caps" }}>{r.student.nom}</span></span>
                    <div style={{ display: "flex", gap: 1 }}>
                      {COMPETENCES.map(function(c) { return <span key={c.id} style={{ fontSize: 7, fontWeight: 700, padding: "0 3px", borderRadius: 2, background: compColor(c, dark) + "15", color: compColor(c, dark), fontFamily: MONO }}>{cn2[c.id]}</span>; })}
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: "right", color: r.note20 < 8 ? th.danger : r.note20 < 12 ? th.warning : th.success }}>{r.note20.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
        {tab === "progression" && (function() {
          if (!synthese.length) return (
            <div style={{ textAlign: "center", padding: 40, color: th.textMuted, fontFamily: FONT_B, fontSize: 13 }}>
              {"Aucune donnée de progression. Utilisez la Synthèse multi-DS dans l'onglet Export pour alimenter cet historique."}
            </div>
          );
          // Élèves ayant au moins une entrée dans synthese
          var progStudents = students.filter(function(s) {
            return synthese.some(function(r) { return r.studentId === s.id; });
          });
          var selId = progressionStudentId || (progStudents[0] ? progStudents[0].id : null);
          // Données de l'élève sélectionné : une entrée par DS (trié par date)
          var examIds = [];
          synthese.forEach(function(r) { if (examIds.indexOf(r.examId) < 0) examIds.push(r.examId); });
          // Trier les examIds par dsDate
          examIds.sort(function(a, b) {
            var ra = synthese.find(function(r) { return r.examId === a; });
            var rb = synthese.find(function(r) { return r.examId === b; });
            if (!ra || !rb) return 0;
            return (ra.dsDate || "").localeCompare(rb.dsDate || "");
          });
          var progData = examIds.map(function(eid) {
            var rowEleve = synthese.find(function(r) { return r.examId === eid && r.studentId === selId; });
            var rowsDS = synthese.filter(function(r) { return r.examId === eid; });
            var moyBrute = rowsDS.length ? rowsDS.reduce(function(s, r) { return s + (r.noteBrute || 0); }, 0) / rowsDS.length : null;
            var moyNorm = rowsDS.length ? rowsDS.reduce(function(s, r) { return s + (r.noteNorm || 0); }, 0) / rowsDS.length : null;
            var dsNom = rowsDS[0] ? (rowsDS[0].dsNom || eid) : eid;
            return {
              dsNom: dsNom,
              noteEleve: rowEleve ? (progressionShowNorm ? rowEleve.noteNorm : rowEleve.noteBrute) : null,
              moyClasse: progressionShowNorm ? moyNorm : moyBrute,
            };
          });
          return (
            <div>
              {/* Sélecteur élève + toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <select value={selId || ""} onChange={function(e) { setProgressionStudentId(e.target.value); }}
                  style={{ flex: 1, minWidth: 160, padding: "5px 8px", borderRadius: th.radiusSm, border: "1px solid " + th.border, background: th.card, color: th.text, fontFamily: FONT_B, fontSize: 12 }}>
                  {progStudents.map(function(s) { return (
                    <option key={s.id} value={s.id}>{s.nom + " " + s.prenom}</option>
                  ); })}
                </select>
                <button onClick={function() { setProgressionShowNorm(function(v) { return !v; }); }}
                  style={{ padding: "5px 12px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 11, fontWeight: 600, background: progressionShowNorm ? th.accent + "18" : "transparent", border: "1px solid " + (progressionShowNorm ? th.accent + "40" : th.border), color: progressionShowNorm ? th.accent : th.textMuted }}>
                  {progressionShowNorm ? "Normalisée" : "Brute"}
                </button>
                {["courbe", "radar"].map(function(m) { return (
                  <button key={m} onClick={function() { setProgressionViewMode(m); }}
                    style={{ padding: "5px 10px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, background: progressionViewMode === m ? th.accent + "18" : "transparent", border: "1px solid " + (progressionViewMode === m ? th.accent + "40" : th.border), color: progressionViewMode === m ? th.accent : th.textMuted }}>
                    {m === "courbe" ? "📈" : "🕸️"}
                  </button>); })}
              </div>
              {/* Graphe */}
              <div style={{ background: th.card, borderRadius: th.radius, border: "1px solid " + th.border, padding: 12, boxShadow: th.shadow }}>
                {progressionViewMode === "radar" && progData.length <= 8
                  ? <ProgressionRadar data={progData} th={th} FONT_B={FONT_B} MONO={MONO} />
                  : progressionViewMode === "radar"
                    ? <div style={{ textAlign: "center", padding: 16, color: th.textMuted, fontFamily: FONT_B, fontSize: 11 }}>{"Trop de DS pour un radar (> 8) — affichage en courbe."}<br /><ProgressionChart data={progData} th={th} FONT_B={FONT_B} MONO={MONO} /></div>
                    : <ProgressionChart data={progData} th={th} FONT_B={FONT_B} MONO={MONO} />
                }
              </div>
            </div>
          );
        })()}
        </div>}

        {/* ═══ VUE D'ENSEMBLE ═══ */}
        {mode === "overview" && (function() {
          if (!exam) return <div style={{ textAlign: "center", padding: 40, color: th.textMuted, fontFamily: FONT_B }}>{"Créez d'abord un devoir dans l'onglet Préparation."}</div>;
          return (
            <OverviewTab
              exam={exam}
              students={students}
              grades={grades}
              absents={absents}
              th={th}
              FONT={FONT}
              FONT_B={FONT_B}
              MONO={MONO}
              onNavigate={function(studentIdx, exIdx) { setSi(studentIdx); setEi(exIdx); setMode("correct"); }}
            />
          );
        })()}

        {/* ═══ AIDE ═══ */}
        {mode === "aide" && <HelpTab th={th} FONT={FONT} FONT_B={FONT_B} MONO={MONO} />}
       

        {/* ═══ EXPORT ═══ */}
        {mode === "export" && exam && <ExportTab
          th={th} FONT={FONT} FONT_B={FONT_B} MONO={MONO}
          exam={exam} et={et}
          examNomDS={examNomDS} examDateDS={examDateDS}
          presents={presents} corriges={corriges}
          students={students} grades={grades} remarks={remarks} absents={absents}
          seuils={seuils} seuilDifficile={seuilDifficile} seuilReussite={seuilReussite} seuilPiege={seuilPiege} bonusCompletConfig={bonusCompletConfig}
          features={ft}
          malusPaliers={malusPaliers} malusManuel={malusManuel}
          commentaires={commentaires} allRemarques={allRemarques}
          htmlConfig={htmlConfig} htmlStudentId={htmlStudentId}
          soundLinksEnabled={soundLinksEnabled} soundBaseUrl={soundBaseUrl} soundAudioExt={soundAudioExt}
          gabaritTex={gabaritTex} setGabaritTex={setGabaritTex}
          etablissement={etablissement}
          synthese={synthese}
          exportOpen={exportOpen} setExportOpen={setExportOpen}
          activeExamId={activeExamId}
          commentaireDS={commentaireDS} setCommentaireDS={setCommentaireDS}
          rapportClasseConfig={rapportClasseConfig} setRapportClasseConfig={setRapportClasseConfig}
          githubPat={githubPat} githubRepo={githubRepo}
          githubSave={githubSave} githubLoad={githubLoad}
          syncLoading={syncLoading} syncStatus={syncStatus} syncDate={syncDate}
          getNote20={getNote20} getBrut20={getBrut20}
          exportCSV={exportCSV}
          nomFichierSynthese={nomFichierSynthese}
          exporterVersSynthese={exporterVersSynthese}
          retirerDsSynthese={retirerDsSynthese}
          telechargerSynthese={telechargerSynthese}
        />}
        {mode === "export" && !exam && <div style={{ textAlign: "center", padding: 40, color: th.textMuted }}>{"Créez d'abord un devoir dans l'onglet Préparation."}</div>}

        </main>
        </div>{/* fin div scale */}
      </div>{/* fin div overflow wrapper */}

      {showMore && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={function() { setShowMore(false); }} />}

{/* MODAL À PROPOS */}
{showApropos && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function() { setShowApropos(false); }}>
        <div style={{ background: th.card, borderRadius: 12, border: "1px solid " + th.border, padding: "28px 32px", width: showChangelog ? 580 : 360, maxWidth: "95vw", transition: "width 0.2s", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", textAlign: "center" }} onClick={function(e) { e.stopPropagation(); }}>
          <div style={{ fontSize: 13, fontFamily: MONO, color: th.textDim, marginBottom: 4, letterSpacing: 2 }}>{"v\u00A0" + APP_VERSION}</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FONT, color: th.text, marginBottom: 6 }}>{"C.H.E.C.K."}</div>
          <div style={{ fontSize: 11, color: th.textMuted, fontFamily: FONT_B, lineHeight: 1.6, marginBottom: 20 }}>
            {"Correcteur Hautement Efficace avec Cases à Kocher"}
            <br />
            {"Application de correction de copies et de génération de rapports individuels, conçue pour les enseignants."}
          </div>
          <button onClick={function() {
            if (!changelogText) {
              fetch(process.env.PUBLIC_URL + "/CHANGELOG.md").then(function(r) { return r.text(); }).then(function(t) { setChangelogText(t); }).catch(function() { setChangelogText("_(changelog non disponible)_"); });
            }
            setShowChangelog(!showChangelog);
          }} style={{ width: "100%", padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 700, background: th.accentBg, border: "1px solid " + th.accent + "30", color: th.accent, marginBottom: 8 }}>
            {"📋 Nouveautés récentes"}
          </button>
          {showChangelog && <div style={{ textAlign: "left", background: th.surface, border: "1px solid " + th.border, borderRadius: th.radiusSm, padding: "10px 14px", marginBottom: 8, maxHeight: 260, overflowY: "auto", fontSize: 12, fontFamily: FONT_B, color: th.text, lineHeight: 1.7 }}>
            {changelogText.split("\n").map(function(line, i) {
              var inlineBold = function(s) {
                var parts = s.split(/\*\*(.+?)\*\*/g);
                return parts.map(function(p, j) { return j % 2 === 1 ? <strong key={j}>{p}</strong> : p; });
              };
              if (line.startsWith("### ")) return <div key={i} style={{ fontWeight: 700, color: th.accent, marginTop: 6, marginBottom: 1 }}>{line.slice(4)}</div>;
              if (line.startsWith("## "))  return <div key={i} style={{ fontWeight: 700, fontSize: 13, color: th.text, marginTop: 10, marginBottom: 2 }}>{line.slice(3)}</div>;
              if (line.startsWith("- "))   return <div key={i} style={{ paddingLeft: 12 }}>{"• "}{inlineBold(line.slice(2))}</div>;
              if (line.trim() === "" || line.trim() === "---") return <div key={i} style={{ height: 4 }} />;
              return <div key={i}>{inlineBold(line)}</div>;
            })}
          </div>}
          <button onClick={function() { setShowApropos(false); setMode("aide"); }} style={{ width: "100%", padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 12, fontWeight: 700, background: th.surface, border: "1px solid " + th.border, color: th.textMuted, marginBottom: 8 }}>
            {"ℹ️ Ouvrir le guide d'utilisation"}
          </button>
          <button onClick={function() { setShowApropos(false); }} style={{ width: "100%", padding: "9px", borderRadius: th.radiusSm, cursor: "pointer", fontFamily: FONT_B, fontSize: 13, fontWeight: 700, background: th.accent, border: "none", color: "#fff" }}>
            {"Fermer"}
          </button>
        </div>
      </div>}

      
{/* SETTINGS */}
{showSettings && <SettingsModal
        th={th} FONT={FONT} FONT_B={FONT_B} MONO={MONO}
        settingsTab={settingsTab} setSettingsTab={setSettingsTab}
        etablissement={etablissement} setEtablissement={setEtablissement}
        seuils={seuils} setSeuils={setSeuils}
        normMethod={normMethod} setNormMethod={setNormMethod}
        normParams={normParams} setNormParams={setNormParams}
        seuilDifficile={seuilDifficile} setSeuilDifficile={setSeuilDifficile}
        seuilReussite={seuilReussite} setSeuilReussite={setSeuilReussite}
        seuilPiege={seuilPiege} setSeuilPiege={setSeuilPiege}
        bonusCompletConfig={bonusCompletConfig} setBonusCompletConfig={setBonusCompletConfig}
        malusPaliers={malusPaliers} setMalusPaliers={setMalusPaliers}
        malusMode={malusMode} setMalusMode={setMalusMode}
        remarquesCustom={remarquesCustom} setRemarquesCustom={setRemarquesCustom}
        remarquesOrdre={remarquesOrdre} setRemarquesOrdre={setRemarquesOrdre}
        remarquesActives={remarquesActives} setRemarquesActives={setRemarquesActives}
        correctionOpen={correctionOpen} setCorrectionOpen={setCorrectionOpen}
        newRemIcon={newRemIcon} setNewRemIcon={setNewRemIcon}
        newRemLabel={newRemLabel} setNewRemLabel={setNewRemLabel}
        newRemMalus={newRemMalus} setNewRemMalus={setNewRemMalus}
        groupesDef={groupesDef} setGroupesDef={setGroupesDef}
        groupes={groupes} setGroupes={setGroupes}
        exportOpen={exportOpen} setExportOpen={setExportOpen}
        csvConfig={csvConfig} setCsvConfig={setCsvConfig}
        htmlConfig={htmlConfig} setHtmlConfig={setHtmlConfig}
        htmlPresets={htmlPresets} setHtmlPresets={setHtmlPresets}
        soundLinksEnabled={soundLinksEnabled} setSoundLinksEnabled={setSoundLinksEnabled}
        soundBaseUrl={soundBaseUrl} setSoundBaseUrl={setSoundBaseUrl}
        soundAudioExt={soundAudioExt} setSoundAudioExt={setSoundAudioExt}
        githubPat={githubPat} setGithubPat={setGithubPat}
        githubRepo={githubRepo} setGithubRepo={setGithubRepo}
        onSave={settingsSaveSignal}
        onClose={function() { setShowSettings(false); }}
        onOpenDebug={function() { setShowDebug(true); }}
      />}


      {/* DEBUG */}
      {showDebug && (function() {
        var sections = [
          { key: "exams",        label: "exams" },
          { key: "students",     label: "students" },
          { key: "grades",       label: "grades" },
          { key: "remarks",      label: "remarks" },
          { key: "commentaires", label: "commentaires" },
          { key: "absents",      label: "absents" },
          { key: "groupes",      label: "groupes" },
          { key: "malusManuel",  label: "malusManuel" },
        ];
        var fullState = { exams: exams, students: students, grades: grades, remarks: remarks, commentaires: commentaires, absents: absents, groupes: groupes, malusManuel: malusManuel };
        var _debugOpen = {};
        sections.forEach(function(s) { _debugOpen[s.key] = false; });
        return (
          <DebugModal
            sections={sections} fullState={fullState}
            th={th} FONT={FONT} FONT_B={FONT_B} MONO={MONO}
            onClose={function() { setShowDebug(false); }}
          />
        );
      })()}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: th.card, borderTop: "2px solid " + th.headerBorder, display: "flex", padding: "4px 0 4px 0", boxShadow: "0 -2px 8px rgba(0,0,0,0.1)" }}>
        {[{ id: "correct", l: "Correction", ic: "\u270F\uFE0F" }, { id: "stats", l: "Stats", ic: "\uD83D\uDCCA" }].map(function(nn) { return (
          <button key={nn.id} onClick={function() { setMode(nn.id); setShowMore(false); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 4px", cursor: "pointer", fontFamily: FONT_B, background: "transparent", border: "none", color: mode === nn.id ? th.accent : th.textMuted, fontSize: 18 }}>
            <span>{nn.ic}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{nn.l}</span>
          </button>); })}
      </nav>}
    </div>
  );
}