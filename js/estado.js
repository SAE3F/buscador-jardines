// Ficha Escuelas · Estado del sistema (estado.html). Solo lee: archivos del sitio, versiones, Apps Script, datos y este dispositivo.
(function () {
  'use strict';
  var VERSION_ESTADO = '0.9.0';          // versión de la página con la que se armó esta revisión (las "marcas" son de esta versión)
  var C = window.CONFIG || {};

  /* Archivos que tiene que haber. "marcas": textos que solo están en la última versión (si falta alguno, el archivo quedó viejo). */
  var ARCHIVOS = [
    { ruta: 'index.html', marcas: ['barraFicha', 'bPleg', 'manifest.webmanifest', 'btnInstalar', 'bCosa', 'js/coordenadas.js', 'filtros-r-q'] },
    { ruta: 'estado.html', marcas: ['js/estado.js', 'estResumen'] },
    { ruta: 'manifest.webmanifest', marcas: ['app=1', 'icono-maskable-512'] },
    { ruta: 'sw.js', marcas: ['chequeo', 'redPrimero', 'estado.html'] },
    { ruta: 'css/tokens-3f.css', marcas: [':root'] },
    { ruta: 'css/app.css', marcas: ['aviso-version', 'barra-ficha', 'v-fechas', 'est-resumen'] },
    { ruta: 'js/config.js', marcas: ['SCRIPT_URL'], config: true },
    { ruta: 'js/version.js', marcas: ['VERSION_PAGINA', 'VERSION_SCRIPT_ESPERADA'], version: true },
    { ruta: 'js/util.js', marcas: ['window.U'] },
    { ruta: 'js/excel.js', marcas: ['exportarExcel'] },
    { ruta: 'js/pdf.js', marcas: ['PDFsimple'] },
    { ruta: 'js/datos.js', marcas: ['sae-rec-', 'sinInternet', 'precalentarReclamos'] },
    { ruta: 'js/graficos.js', marcas: ['window.G'] },
    { ruta: 'js/escuelas-extra.js', marcas: ['ESCUELAS_EXTRA'] },
    { ruta: 'js/coordenadas.js', marcas: ['ESCUELAS_COORDS'] },
    { ruta: 'js/app.js', marcas: ['vigilarVersion', 'resumirViejos', 'REC_ABIERTOS', 'barraFicha', 'opcionesProv', 'textoPeriodoVisita', 'estado.html', 'fe-version-abierta'] },
    { ruta: 'js/estado.js', marcas: ['VERSION_ESTADO'] },
    { ruta: 'assets/logo_3f_96.png', img: true }, { ruta: 'assets/logo_3f_chico.png', img: true },
    { ruta: 'assets/icono-192.png', img: true }, { ruta: 'assets/icono-512.png', img: true },
    { ruta: 'assets/icono-maskable-512.png', img: true }, { ruta: 'assets/icono-apple-180.png', img: true }
  ];
  // Lo que NO tendría que estar subido
  var SOBRANTES = [['LINK_APPSCRIPT_SAE_ENTREGAS.txt', 'tiene el link del script a la vista de cualquiera'], ['datos-prueba.json', 'es un archivo de prueba'],
    ['datos-prueba-rec.json', 'es un archivo de prueba'], ['sae-entregas.zip', 'zip viejo'], ['js/config.example.js', 'ejemplo viejo']];

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf = function (n) { return Number(n || 0).toLocaleString('es-AR'); };
  var ICONO = { ok: '✅', aviso: '⚠️', error: '❌', info: 'ℹ️' };
  var GRUPOS = [['gArchivos', '📁 Archivos de la página'], ['gVersiones', '🔢 Versiones'], ['gScript', '🔗 Script de Google'], ['gDatos', '📊 Datos'], ['gDispositivo', '💻 Este dispositivo']];
  var R = {}, revisando = false;

  function hace(t) {
    var min = Math.round((Date.now() - t) / 60000);
    if (min < 1) return 'recién'; if (min < 60) return 'hace ' + min + ' min'; if (min < 1440) return 'hace ' + Math.round(min / 60) + ' h';
    return 'hace ' + Math.round(min / 1440) + ' días';
  }
  function cmpVersion(a, b) {
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var k = 0; k < Math.max(x.length, y.length); k++) { var d = (x[k] || 0) - (y[k] || 0); if (d) return d > 0 ? 1 : -1; }
    return 0;
  }
  function traer(ruta, ms) {
    var ctrl = window.AbortController ? new AbortController() : null, t0 = performance.now();
    var tope = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 15000);
    return fetch(ruta + (ruta.indexOf('?') < 0 ? '?' : '&') + 'chequeo=' + Date.now(), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return { r: r, ms: Math.round(performance.now() - t0) }; })
      .finally(function () { clearTimeout(tope); });
  }
  function explicar(e) {
    var m = String(e && e.message || e);
    if (/abort/i.test(m)) return 'No respondió a tiempo.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return navigator.onLine === false ? 'Este dispositivo no tiene internet.' : 'No se pudo conectar (red, permisos del script o URL mal copiada).';
    return m;
  }

  // ─── pintar
  function armarGrupos() {
    $('estGrupos').innerHTML = GRUPOS.map(function (g) {
      return '<details class="card est-grupo" id="' + g[0] + 'Caja" open><summary><span class="est-tit">' + g[1] + '</span><span class="est-cuenta" id="' + g[0] + 'Cuenta"></span></summary>' +
        '<ul class="est-lista" id="' + g[0] + '"><li class="est-cargando">Revisando…</li></ul></details>';
    }).join('');
  }
  function pintar(g, items) {
    R[g] = items;
    $(g).innerHTML = items.map(function (it, i) {
      return '<li class="est-item ' + it.tipo + '" data-g="' + g + '" data-i="' + i + '"><span class="est-i">' + ICONO[it.tipo] + '</span><div><b>' + esc(it.titulo) + '</b>' +
        (it.detalle ? '<div class="est-det">' + it.detalle + '</div>' : '') + '</div></li>';
    }).join('');
    var e = items.filter(function (x) { return x.tipo === 'error'; }).length, a = items.filter(function (x) { return x.tipo === 'aviso'; }).length;
    $(g + 'Cuenta').innerHTML = e ? '<span class="est-badge error">' + e + ' ❌</span>' : a ? '<span class="est-badge aviso">' + a + ' ⚠️</span>' : '<span class="est-badge ok">✅</span>';
    $(g + 'Caja').open = !!(e || a);
    pintarResumen();
  }
  function pintarResumen() {
    var caja = $('estResumen');
    if (revisando) {
      var falta = GRUPOS.filter(function (g) { return !R[g[0]]; }).map(function (g) { return g[1].replace(/^\S+\s/, ''); });
      caja.className = 'card est-resumen'; caja.innerHTML = '<span class="est-ico">⏳</span><div><h2>Revisando…</h2><p>' + (falta.length ? 'Falta: ' + esc(falta.join(', ')) : 'Terminando…') + '</p></div>';
      return;
    }
    var todos = [];
    GRUPOS.forEach(function (g) { (R[g[0]] || []).forEach(function (it, i) { todos.push({ g: g, i: i, it: it }); }); });
    var malos = todos.filter(function (x) { return x.it.tipo === 'error' || x.it.tipo === 'aviso'; }).sort(function (a, b) { return (a.it.tipo === 'error' ? 0 : 1) - (b.it.tipo === 'error' ? 0 : 1); });
    var e = malos.filter(function (x) { return x.it.tipo === 'error'; }).length, a = malos.length - e;
    caja.className = 'card est-resumen ' + (e ? 'error' : a ? 'aviso' : 'ok');
    caja.innerHTML = '<span class="est-ico">' + (e ? '❌' : a ? '⚠️' : '✅') + '</span><div><h2>' +
      (e ? 'Hay ' + e + ' problema' + (e === 1 ? '' : 's') + ' para resolver' + (a ? ' y ' + a + ' aviso' + (a === 1 ? '' : 's') : '') : a ? 'Todo funciona, con ' + a + ' aviso' + (a === 1 ? '' : 's') : 'Todo en orden') +
      '</h2><p>Revisado el ' + new Date().toLocaleString('es-AR') + ' · página ' + esc(C.VERSION_PAGINA || '?') + '</p>' +
      (malos.length ? '<ul class="est-pendientes">' + malos.slice(0, 10).map(function (x) {
        return '<li><button type="button" class="est-pend" data-g="' + x.g[0] + '" data-i="' + x.i + '">' + ICONO[x.it.tipo] + ' ' + esc(x.it.titulo) + '<span>' + esc(x.g[1].replace(/^\S+\s/, '')) + '</span></button></li>';
      }).join('') + '</ul>' : '') + '</div>';
    caja.querySelectorAll('.est-pend').forEach(function (b) {
      b.onclick = function () {
        var el = document.querySelector('.est-item[data-g="' + b.dataset.g + '"][data-i="' + b.dataset.i + '"]'); if (!el) return;
        el.closest('details').open = true; el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('est-resaltar'); void el.offsetWidth; el.classList.add('est-resaltar');
      };
    });
  }

  // ─── 📁 Archivos
  var versionServidor = null;
  function revisarArchivos() {
    return Promise.all(ARCHIVOS.map(function (a) {
      return traer(a.ruta).then(function (x) { return (a.img ? x.r.blob() : x.r.text()).then(function (c) { return { a: a, ok: x.r.ok, st: x.r.status, c: c, tipo: x.r.headers.get('content-type') || '' }; }); })
        .catch(function (e) { return { a: a, ok: false, st: 0, err: e }; });
    })).then(function (res) {
      var items = [], bien = 0;
      res.forEach(function (x) {
        var a = x.a;
        if (!x.ok) { items.push({ tipo: 'error', titulo: 'Falta ' + a.ruta, detalle: x.st === 404 ? 'No está subido (o está en otra carpeta). Subilo en <code>' + esc(a.ruta) + '</code>.' : 'No se pudo leer: ' + esc(x.err ? explicar(x.err) : 'HTTP ' + x.st) }); return; }
        if (a.img) { if (!/^image\//.test(x.c.type || x.tipo)) items.push({ tipo: 'error', titulo: a.ruta + ' no es una imagen', detalle: 'Se subió otro archivo con ese nombre.' }); else bien++; return; }
        if (/^\s*(<!doctype html|<html)/i.test(x.c) && !/\.html$/.test(a.ruta)) { items.push({ tipo: 'error', titulo: 'Falta ' + a.ruta, detalle: 'En su lugar el servidor devuelve una página HTML.' }); return; }
        var faltan = (a.marcas || []).filter(function (m) { return x.c.indexOf(m) < 0; });
        if (a.version) { var m = /VERSION_PAGINA\s*=\s*['"]([^'"]+)['"]/.exec(x.c); versionServidor = m ? m[1] : null; }
        if (a.config) {
          var u = /SCRIPT_URL\s*[:=]\s*['"]([^'"]*)['"]/.exec(x.c);
          if (!u || !u[1]) { items.push({ tipo: 'error', titulo: 'js/config.js no tiene la URL del script', detalle: 'Pegá la URL de la implementación (termina en <code>/exec</code>).' }); return; }
          if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(u[1])) items.push({ tipo: 'aviso', titulo: 'La URL de js/config.js parece mal copiada', detalle: 'Tiene que empezar con <code>https://script.google.com/macros/s/</code> y terminar en <code>/exec</code>.' });
        }
        if (faltan.length) items.push({ tipo: 'aviso', titulo: a.ruta + ' quedó en una versión vieja', detalle: 'No tiene lo de la última versión (' + esc(faltan.join(', ')) + '). Volvé a subirlo desde el último zip.' });
        else bien++;
      });
      return Promise.all(SOBRANTES.map(function (s) { return traer(s[0], 8000).then(function (x) { return x.r.ok ? s : null; }).catch(function () { return null; }); })).then(function (sob) {
        sob.filter(Boolean).forEach(function (s) { items.push({ tipo: 'aviso', titulo: 'Sobra ' + s[0], detalle: 'Conviene borrarlo del repositorio: ' + esc(s[1]) + '.' }); });
        items.unshift({ tipo: bien === ARCHIVOS.length ? 'ok' : 'info', titulo: bien + ' de ' + ARCHIVOS.length + ' archivos en orden', detalle: bien === ARCHIVOS.length ? 'Están todos y en su última versión.' : 'Abajo, lo que hay que revisar.' });
        pintar('gArchivos', items);
      });
    });
  }

  // ─── 🔗 Script + 📊 Datos
  var urlScript = C.SCRIPT_URL || '';
  function pedirScript(params, ms) {
    var u = urlScript + (urlScript.indexOf('?') < 0 ? '?' : '&') + params + '&t=' + Date.now(), t0 = performance.now();
    var ctrl = window.AbortController ? new AbortController() : null, tope = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    return fetch(u, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return { j: j, ms: Math.round(performance.now() - t0) }; }).finally(function () { clearTimeout(tope); });
  }
  var infoScript = { version: null, datos: null };
  function revisarScript() {
    var items = [];
    if (!urlScript) { pintar('gScript', [{ tipo: 'error', titulo: 'Sin URL del script', detalle: 'Falta la URL en <code>js/config.js</code>.' }]); pintar('gDatos', [{ tipo: 'info', titulo: 'No se pudieron revisar los datos', detalle: 'Primero hay que conectar el script.' }]); return Promise.resolve(); }
    return pedirScript('accion=version', 20000).then(function (x) {
      infoScript.version = x.j.version;
      items.push({ tipo: 'ok', titulo: 'El script responde', detalle: 'Versión ' + esc(x.j.version) + ' · respondió en ' + (x.ms / 1000).toFixed(1).replace('.', ',') + ' s.' });
      return pedirScript('accion=reclamos&inst=_', 40000).then(function (y) {
        items.push(y.j && y.j.ok ? { tipo: 'ok', titulo: 'Los reclamos responden', detalle: 'Respondió en ' + (y.ms / 1000).toFixed(1).replace('.', ',') + ' s.' }
          : { tipo: 'aviso', titulo: 'Los reclamos no responden bien', detalle: esc((y.j && y.j.error) || 'Respuesta inesperada') + '. Las fichas se ven igual, pero sin reclamos.' });
      }).catch(function (e) { items.push({ tipo: 'aviso', titulo: 'Los reclamos no responden', detalle: esc(explicar(e)) }); });
    }).catch(function (e) {
      items.push({ tipo: 'error', titulo: 'El script no responde', detalle: esc(explicar(e)) + ' Revisá que esté publicado como “Cualquier persona” y que la URL de <code>js/config.js</code> sea la de la implementación.' });
    }).then(function () {
      if (infoScript.version == null) { pintar('gScript', items); pintar('gDatos', [{ tipo: 'info', titulo: 'No se pudieron revisar los datos', detalle: 'El script no respondió.' }]); return; }
      return pedirScript('', 90000).then(function (x) {
        var d = x.j; infoScript.datos = d;
        if (!d || !d.ok) throw new Error((d && d.error) || 'El script devolvió un error al armar los datos');
        var edad = d.generado ? (Date.now() - new Date(d.generado)) / 60000 : null;
        items.push({ tipo: x.ms > 20000 ? 'aviso' : 'ok', titulo: 'Datos completos: ' + (x.ms / 1000).toFixed(1).replace('.', ',') + ' s', detalle: x.ms > 20000 ? 'Tarda bastante: si la actualización automática está prendida, la próxima vez debería ser rápido.' : 'Se arman bien.' });
        items.push(d.auto ? { tipo: 'ok', titulo: 'Actualización automática prendida', detalle: 'El script rehace los datos solo cada hora.' }
          : { tipo: 'aviso', titulo: 'Actualización automática apagada', detalle: 'En el editor del script ejecutá una vez <code>activarActualizacionAutomatica</code> (ver <code>apps-script/PUBLICAR.md</code>). Sin eso, la primera carga de cada rato es lenta.' });
        if (edad != null) items.push({ tipo: edad > 180 ? 'aviso' : 'ok', titulo: 'Datos leídos de las planillas ' + hace(new Date(d.generado).getTime()), detalle: new Date(d.generado).toLocaleString('es-AR') + (edad > 180 ? ' · son viejos: revisá que la actualización automática esté prendida.' : '') });
        pintar('gScript', items);
        revisarDatos(d);
      }).catch(function (e) {
        items.push({ tipo: 'error', titulo: 'El script no pudo armar los datos', detalle: esc(explicar(e)) + ' Puede ser una hoja renombrada o un permiso.' });
        pintar('gScript', items); pintar('gDatos', [{ tipo: 'info', titulo: 'No se pudieron revisar los datos', detalle: 'El script no devolvió los datos.' }]);
      });
    });
  }
  function normClave(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim().replace(/^([A-Z]+)\s*0*(\d+)/, '$1 $2'); }
  function revisarDatos(d) {
    var items = [], regs = d.registros || [], inst = d.instituciones || [], av = d.avisos || [];
    var por = { E: 0, O: 0, A: 0 }; regs.forEach(function (r) { por[r[0]] = (por[r[0]] || 0) + 1; });
    items.push({ tipo: regs.length ? 'ok' : 'error', titulo: nf(regs.length) + ' registros', detalle: '📦 ' + nf(por.E) + ' entregas · 🏗️ ' + nf(por.O) + ' obras · 🛠️ ' + nf(por.A) + ' arreglos' });
    ['E', 'O', 'A'].forEach(function (t) { if (!por[t]) items.push({ tipo: 'aviso', titulo: 'No llegó ningún registro de ' + { E: 'entregas', O: 'obras', A: 'arreglos' }[t], detalle: 'Puede que una hoja se haya renombrado o movido.' }); });
    items.push({ tipo: 'ok', titulo: nf(inst.length) + ' instituciones', detalle: nf(inst.filter(function (i) { return i.enBase; }).length) + ' están en ESTABLECIMIENTOS.' });
    var hojas = d.hojas || {}, nh = Object.keys(hojas).length;
    items.push({ tipo: nh >= 7 ? 'ok' : 'aviso', titulo: nh + ' hojas conectadas', detalle: Object.keys(hojas).map(function (k) { return esc(hojas[k].hoja) + ' <span class="muted">(' + esc(hojas[k].planilla) + ')</span>'; }).join(' · ') });
    if (av.length) {
      var tipos = {}; av.forEach(function (a) { tipos[a.tipo] = (tipos[a.tipo] || 0) + 1; });
      items.push({ tipo: 'info', titulo: nf(av.length) + ' avisos de calidad de datos', detalle: 'Se ven y se corrigen en la pestaña <b>Calidad de datos</b> (en la compu). ' + Object.keys(tipos).map(function (k) { return esc(k.replace(/_/g, ' ')) + ': ' + tipos[k]; }).join(' · ') });
    } else items.push({ tipo: 'ok', titulo: 'Sin avisos de calidad de datos' });
    var co = window.ESCUELAS_COORDS || {}, ex = window.ESCUELAS_EXTRA || {};
    var base = inst.filter(function (i) { return i.enBase; });
    var buscar = function (m, i) { return m[normClave(i.id)] || m[normClave(i.nombre)] || m[normClave(i.completo)]; };
    var sinUb = base.filter(function (i) { return !buscar(co, i); }).map(function (i) { return i.id; });
    var sinEx = base.filter(function (i) { return !buscar(ex, i); }).map(function (i) { return i.id; });
    items.push(sinUb.length ? { tipo: 'info', titulo: sinUb.length + (sinUb.length === 1 ? ' escuela' : ' escuelas') + ' sin ubicación', detalle: '"Cómo llegar" usa la dirección en vez del punto exacto: ' + esc(sinUb.slice(0, 25).join(', ')) + (sinUb.length > 25 ? '…' : '') }
      : { tipo: 'ok', titulo: 'Todas las escuelas tienen ubicación' });
    items.push(sinEx.length ? { tipo: 'info', titulo: sinEx.length + (sinEx.length === 1 ? ' escuela' : ' escuelas') + ' sin dirección / directora', detalle: 'No están en <code>js/escuelas-extra.js</code>: ' + esc(sinEx.slice(0, 25).join(', ')) + (sinEx.length > 25 ? '…' : '') }
      : { tipo: 'ok', titulo: 'Todas las escuelas tienen dirección y directora' });
    pintar('gDatos', items);
  }

  // ─── 🔢 Versiones (después de archivos y script)
  function revisarVersiones() {
    var items = [], vS = versionServidor, vEsta = C.VERSION_PAGINA;
    if (vS) items.push({ tipo: cmpVersion(vS, VERSION_ESTADO) < 0 ? 'aviso' : 'ok', titulo: 'Versión subida: ' + vS, detalle: cmpVersion(vS, VERSION_ESTADO) < 0 ? 'Esta revisión es de la ' + VERSION_ESTADO + ': falta subir <code>js/version.js</code> nuevo.' : 'Es la que figura en <code>js/version.js</code>.' });
    var ab = null; try { ab = JSON.parse(localStorage.getItem('fe-version-abierta') || 'null'); } catch (e) {}
    if (ab && ab.v) {
      var vieja = vS && cmpVersion(ab.v, vS) < 0;
      items.push({ tipo: vieja ? 'aviso' : 'ok', titulo: 'En este dispositivo se abrió la ' + ab.v + ' (' + hace(ab.t) + ')' + (ab.app ? ' · app instalada' : ''),
        detalle: vieja ? 'Hay una más nueva subida: abrí la página y tocá “Actualizar ahora” en el cartel (o recargá).' : 'Está al día.' });
    } else items.push({ tipo: 'info', titulo: 'La página todavía no se abrió en este dispositivo (con la 0.9.0 o más nueva)' });
    var esp = C.VERSION_SCRIPT_ESPERADA, vs = infoScript.version;
    if (vs != null && esp) {
      var c = cmpVersion(vs, esp);
      items.push({ tipo: c < 0 ? 'error' : 'ok', titulo: 'Apps Script ' + vs + (c < 0 ? ' (la página necesita ' + esp + ')' : ''),
        detalle: c < 0 ? 'Pegá el <code>apps-script/Codigo.gs</code> del último zip y publicalo como <b>Nueva versión</b> (la URL no cambia).' : c > 0 ? 'Es más nueva que la que pide la página (' + esc(esp) + '): subí también los archivos de la página.' : 'Es la que pide la página.' });
    }
    return traer('apps-script/Codigo.gs', 10000).then(function (x) { return x.r.ok ? x.r.text() : ''; }).catch(function () { return ''; }).then(function (t) {
      var m = /VERSION_SCRIPT\s*=\s*'([^']+)'/.exec(t || '');
      if (m && vs != null && m[1] !== String(vs)) items.push({ tipo: 'aviso', titulo: 'El Codigo.gs del repositorio es ' + m[1] + ' y el publicado es ' + vs, detalle: cmpVersion(m[1], vs) > 0 ? 'Falta publicar en script.google.com la versión del repositorio.' : 'El repositorio tiene una copia vieja del script.' });
      if (!('serviceWorker' in navigator)) { items.push({ tipo: 'info', titulo: 'Este navegador no permite el modo sin internet' }); return; }
      return navigator.serviceWorker.getRegistration().then(function (r) {
        items.push(r && r.active ? { tipo: 'ok', titulo: 'Modo sin internet activo', detalle: 'La página se guarda en este dispositivo y abre sin señal.' }
          : { tipo: 'info', titulo: 'Modo sin internet todavía no activo en este dispositivo', detalle: 'Se activa solo la primera vez que se abre la página con señal.' });
      });
    }).then(function () { pintar('gVersiones', items); });
  }

  // ─── 💻 Este dispositivo
  function revisarDispositivo() {
    var items = [], online = navigator.onLine !== false;
    items.push({ tipo: online ? 'ok' : 'aviso', titulo: online ? 'Con internet' : 'Sin internet', detalle: online ? '' : 'Lo que necesita al script no se puede revisar.' });
    var copia = null; try { copia = JSON.parse(localStorage.getItem(C.CLAVE_COPIA || 'sae-entregas-datos-v1') || 'null'); } catch (e) {}
    items.push(copia && copia.generado ? { tipo: 'ok', titulo: 'Copia guardada de los datos (' + hace(new Date(copia.generado).getTime()) + ')', detalle: 'Es lo que se ve sin señal.' }
      : { tipo: 'info', titulo: 'Sin copia guardada de los datos', detalle: 'Se guarda al abrir la página con señal.' });
    var nRec = 0, bytes = 0;
    try { for (var k = 0; k < localStorage.length; k++) { var key = localStorage.key(k), v = localStorage.getItem(key) || ''; bytes += (key.length + v.length) * 2; if (/^sae-rec-/.test(key)) nRec++; } } catch (e) {}
    items.push({ tipo: 'info', titulo: 'Reclamos guardados de ' + nRec + ' escuela' + (nRec === 1 ? '' : 's'), detalle: 'Se guardan las que se abrieron con señal.' });
    var mb = bytes / 1048576;
    items.push({ tipo: mb > 4 ? 'aviso' : 'ok', titulo: 'Espacio usado: ' + mb.toFixed(1).replace('.', ',') + ' MB', detalle: mb > 4 ? 'Cerca del límite del navegador (~5 MB): si algo no se guarda, borrá los datos del sitio y volvé a abrir la página.' : 'Bien.' });
    var inst = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    items.push({ tipo: 'info', titulo: inst ? 'Abierta como app instalada' : 'Abierta en el navegador', detalle: inst ? '' : 'Se puede instalar con el botón 📲 de la página.' });
    items.push({ tipo: 'info', titulo: 'Navegador', detalle: esc(navigator.userAgent) });
    pintar('gDispositivo', items);
  }

  function revisar() {
    if (revisando) return;
    revisando = true; R = {}; versionServidor = null; infoScript = { version: null, datos: null };
    armarGrupos(); pintarResumen(); $('btnRevisar').disabled = true;
    revisarDispositivo();
    Promise.all([revisarArchivos().catch(function (e) { pintar('gArchivos', [{ tipo: 'error', titulo: 'No se pudieron revisar los archivos', detalle: esc(explicar(e)) }]); }),
      revisarScript().catch(function (e) { pintar('gScript', [{ tipo: 'error', titulo: 'No se pudo revisar el script', detalle: esc(explicar(e)) }]); })])
      .then(revisarVersiones)
      .catch(function (e) { pintar('gVersiones', [{ tipo: 'error', titulo: 'No se pudieron revisar las versiones', detalle: esc(explicar(e)) }]); })
      .then(function () { revisando = false; $('btnRevisar').disabled = false; pintarResumen(); });
  }

  function informe() {
    var l = ['Ficha Escuelas · Estado del sistema', new Date().toLocaleString('es-AR') + ' · página ' + (C.VERSION_PAGINA || '?'), ''];
    GRUPOS.forEach(function (g) {
      l.push(g[1]);
      (R[g[0]] || []).forEach(function (it) { l.push(ICONO[it.tipo] + ' ' + it.titulo + (it.detalle && it.tipo !== 'ok' ? ' — ' + it.detalle.replace(/<[^>]+>/g, '') : '')); });
      l.push('');
    });
    return l.join('\n');
  }
  function toast(t) { var c = $('toasts'), e = document.createElement('div'); e.className = 'toast'; e.textContent = t; c.appendChild(e); setTimeout(function () { e.remove(); }, 2600); }

  document.addEventListener('DOMContentLoaded', function () {
    var h = document.documentElement, bm = $('btnModo');
    var modo = function () { bm.textContent = h.classList.contains('dark') ? '☀️' : '🌙'; };
    modo(); bm.onclick = function () { var o = h.classList.toggle('dark'); try { localStorage.setItem('modo-oscuro', o); } catch (e) {} modo(); };
    $('btnRevisar').onclick = revisar;
    $('btnCopiar').onclick = function () {
      var t = informe();
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('📋 Informe copiado'); }).catch(function () { window.prompt('Copiá el informe:', t); });
    };
    $('btnWhatsApp').onclick = function () { window.open('https://wa.me/?text=' + encodeURIComponent(informe()), '_blank', 'noopener'); };
    revisar();
  });
})();
