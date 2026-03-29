// Service Worker BrazzaEats
// Géré automatiquement par vite-plugin-pwa (workbox).
// Ce fichier est le point d'entrée déclaré dans manifest.json ;
// le SW réel est injecté par le build à l'URL /sw.js.
// En développement, ce fichier est utilisé tel quel (no-op).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

// Les stratégies de cache (CacheFirst, NetworkFirst, etc.)
// sont configurées dans vite.config.js → VitePWA → workbox.
