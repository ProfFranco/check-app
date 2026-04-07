// ═══════════════════════════════════════════════════════════════════
// HOOK DE GESTION D'ÉTAT AVEC PERSISTANCE (IndexedDB)
// ═══════════════════════════════════════════════════════════════════
//
// Sauvegarde automatique dans IndexedDB pour fonctionner hors ligne.
// Les données persistent même si vous fermez le navigateur.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  DEFAULT_SEUILS, DEFAULT_SEUIL_DIFFICILE, DEFAULT_MALUS_PALIERS,
  DEFAULT_MALUS_MODE, DEFAULT_NORM,
} from "../config/settings";

const DB_NAME = "check-app";
const DB_VERSION = 1;
const STORE_NAME = "state";
const STATE_KEY = "appState";

// ─── IndexedDB helpers ───────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function loadState() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(STATE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function saveState(state) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(state, STATE_KEY);
  } catch { /* silencieux */ }
}

// ─── État initial ────────────────────────────────────────────────

const INITIAL = {
  exams: [],
  students: [],
  grades: {},
  remarks: {},
  absents: {},
  groupes: {},
  activeExamId: null,
  nomDS: "",
  dateDS: "",
  seuils: DEFAULT_SEUILS,
  seuilDifficile: DEFAULT_SEUIL_DIFFICILE,
  normMethod: DEFAULT_NORM.method,
  normParams: DEFAULT_NORM.params,
  malusPaliers: DEFAULT_MALUS_PALIERS,
  malusMode: DEFAULT_MALUS_MODE,
  malusManuel: {},
  gabaritTex: "",
  uiScale: 1,
  dark: false,
};

// ─── Hook ────────────────────────────────────────────────────────

export function useAppState() {
  const [state, setState] = useState(INITIAL);
  const [loaded, setLoaded] = useState(false);

  // Charger au montage
  useEffect(() => {
    loadState().then((saved) => {
      if (saved) setState({ ...INITIAL, ...saved });
      setLoaded(true);
    });
  }, []);

  // Sauvegarder avec debounce
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => saveState(state), 300);
    return () => clearTimeout(timer);
  }, [state, loaded]);

  // Setter générique
  const set = useCallback((key, value) => {
    setState(s => ({ ...s, [key]: typeof value === "function" ? value(s[key]) : value }));
  }, []);

  // Export / Import JSON
  const exportJSON = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importJSON = useCallback((json) => {
    try {
      const data = JSON.parse(json);
      setState({ ...INITIAL, ...data });
      return true;
    } catch { return false; }
  }, []);

  return { state, set, loaded, exportJSON, importJSON };
}
