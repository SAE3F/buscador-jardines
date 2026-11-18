// Service Worker de caché estática versionada - SAE Gestión 3F
// Cachea recursos con ?v= en disco (0ms entre pestañas) y nunca intercepta Google Apps Script ni SSO del Portal.
const CACHE_NAME = 'sae-gestion-3f-v2.22.1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('sae-gestion-3f-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json') || url.pathname === '/version.json') return;

  // Activos estáticos con versión (?v=...): Cache-First instantáneo
  if (url.searchParams.has('v') && /\.(js|css|png|jpg|svg|webp)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return resp;
        });
      })
    );
    return;
  }
});
