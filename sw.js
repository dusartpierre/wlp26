// Service worker : l'app s'ouvre même sans réseau dans le hall.
// Incrémentez VERSION à chaque mise à jour du code pour forcer le rafraîchissement.
const VERSION = 'wlp26-v1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/store.js', 'js/config.js', 'js/stands.js',
  'img/plan-wlp26.webp', 'img/icon-192.png', 'img/icon-512.png', 'manifest.webmanifest'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // SDK Firebase (gstatic) : cache d'abord, versionné donc immuable
  if (u.hostname === 'www.gstatic.com') {
    e.respondWith(caches.open(VERSION).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; })));
    return;
  }
  if (u.origin !== location.origin) return;       // Firestore/Auth : jamais intercepté
  // fichiers de l'app : réseau d'abord (mises à jour), cache en secours
  e.respondWith(fetch(e.request).then(r => { const cl = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cl)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
