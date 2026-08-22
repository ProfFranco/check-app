// ═══════════════════════════════════════════════════════════════════
// SERVICE WORKER — Fonctionnement hors ligne
// ═══════════════════════════════════════════════════════════════════
// Stratégie : Network first, fallback to cache.
// Les fichiers de l'application sont mis en cache pour usage hors ligne.
//
// Chemins RELATIFS obligatoires : CHECK n'est jamais servi à la racine d'un
// domaine (GitHub Pages sous /check-app/, VPS sous /check/). Une URL "/index.html"
// viserait la racine du domaine, hors du périmètre de l'application. Les chemins
// relatifs, eux, se résolvent contre l'emplacement de ce fichier.
//
// %PUBLIC_URL% n'est PAS interpolé ici : create-react-app ne substitue cette
// variable que dans public/index.html, les autres fichiers de public/ sont
// copiés tels quels.

const CACHE_NAME = "check-v2"; // v2 : purge les caches créés avec des chemins absolus

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["./", "./index.html", "./manifest.json"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ne jamais intercepter ce qui n'est pas une ressource de l'application :
  //   • méthodes autres que GET  → l'API Cache ne les accepte pas ;
  //   • autre origine            → API GitHub de la synchronisation, polices ;
  //   • chemin /api/             → backend Sycomore.
  // Sans ce filtre, un GET de synchronisation (/api/check-sync/…/head) serait
  // mis en cache et resservi périmé hors ligne, faisant croire à CHECK que
  // l'état distant n'a pas bougé — et le verrou optimiste partirait sur une
  // version obsolète.
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
