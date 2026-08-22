import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ─── Reset CSS ───────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { opacity: 1; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .tab-enter { animation: fadeSlideIn 0.15s ease-out; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #c8bfb0; border-radius: 3px; }
  button { font-family: inherit; }
`;
document.head.appendChild(style);

// ─── Google Fonts (interface) ─────────────────────────────────────
var fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap";
document.head.appendChild(fontLink);

// ─── Rendu ───────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ─── Service Worker (PWA hors ligne) ─────────────────────────────
// Chemin relatif au dossier de déploiement : CHECK n'est jamais servi à la
// racine d'un domaine (GitHub Pages sous /check-app/, VPS sous /check/).
// Un "/sw.js" absolu viserait la racine du domaine et échouerait en 404,
// laissant le mode hors ligne inopérant.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(process.env.PUBLIC_URL + "/sw.js").catch(() => {});
  });
}
