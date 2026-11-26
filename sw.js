/* Ficha Escuelas · service worker
 * Sirve para que la página abra sin internet y se pueda instalar como app.
 * Con internet siempre pide la versión nueva (red primero); si no hay señal o tarda, usa la copia guardada.
 * Los datos de las planillas NO pasan por acá: la página guarda su propia copia (localStorage).
 */
var CACHE = 'ficha-escuelas-v1';
var FUENTES = 'ficha-escuelas-fuentes-v1';
var ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/tokens-3f.css', 'css/app.css',
  'js/config.js', 'js/version.js', 'js/util.js', 'js/excel.js', 'js/pdf.js', 'js/escuelas-extra.js', 'js/coordenadas.js',
  'js/datos.js', 'js/graficos.js', 'js/app.js',
  'assets/logo_3f_96.png', 'assets/logo_3f_chico.png', 'assets/icono-192.png', 'assets/icono-512.png'
];
var ESPERA_MS = 4000;   // si la red tarda más que esto, se muestra la copia (y se actualiza igual por detrás)

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ARCHIVOS.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE && k !== FUENTES; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Tipografías de Google: se guardan la primera vez
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FUENTES).then(function (c) {
      return c.match(req).then(function (r) {
        var red = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return r; });
        return r || red;
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;          // Apps Script, Maps, etc.: van directo
  if (/\.json$/.test(url.pathname)) return;                  // archivos de prueba
  if (url.searchParams.has('chequeo')) return;               // aviso de versión nueva: siempre directo al servidor
  e.respondWith(redPrimero(req));
});

function redPrimero(req) {
  return caches.open(CACHE).then(function (c) {
    var clave = req.mode === 'navigate' ? (/estado\.html$/.test(new URL(req.url).pathname) ? 'estado.html' : 'index.html') : req;
    var red = fetch(req).then(function (res) {
      if (res && res.ok) c.put(clave, res.clone());
      return res;
    });
    var copia = c.match(clave, { ignoreSearch: true });
    var espera = new Promise(function (ok) { setTimeout(ok, ESPERA_MS); }).then(function () { return copia; });
    return Promise.race([red.catch(function () { return copia; }), espera.then(function (r) { return r || red; })])
      .then(function (r) { return r || red; })
      .catch(function () { return copia.then(function (r) { return r || Response.error(); }); });
  });
}
