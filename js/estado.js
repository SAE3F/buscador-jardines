/**
 * ESTADO DEL SISTEMA
 * Revisa que estén todos los archivos (y en su última versión), que el script de
 * Google responda y que los datos de la hoja lleguen completos. Solo lee: no
 * cambia nada.
 */
(function () {
  'use strict';

  const VERSION_SCRIPT_ULTIMA = 10;   // la del Codigo.gs más nuevo
  const VERSION_SCRIPT_MINIMA = 8;    // con menos, la página de reclamos no anda bien

  /* Archivos que tiene que haber. "marcas": textos que solo están en la última versión
     (si faltan, el archivo quedó viejo). "no": textos que indican que se subió otro archivo encima. */
  const ARCHIVOS = [
    { ruta: 'index.html', marcas: ['viewDirectorio', 'js/excel.js'], no: ['leaflet'], nota: 'Si tiene "leaflet", en la raíz quedó el index del mapa.' },
    { ruta: 'reclamos.html', marcas: ['abiertosEscuela', 'btnResProv', 'js/excel.js'] },
    { ruta: 'totales.html', marcas: ['js/excel.js'] },
    { ruta: 'mobile.html' },
    { ruta: 'estado.html' },
    { ruta: 'js/app.js', marcas: ['getFilteredSchools', 'SAE_EXCEL'], no: ['L.map('], nota: 'Si tiene "L.map(", en js/ quedó el app.js del mapa.' },
    { ruta: 'js/mobile.js' },
    { ruta: 'js/extras.js' },
    { ruta: 'js/sync.js' },
    { ruta: 'js/navegacion.js' },
    { ruta: 'js/totales.js', marcas: ['SAE_EXCEL'] },
    { ruta: 'js/reclamos.js', marcas: ['pintarAbiertosEscuela', 'exportarPorProveedor'] },
    { ruta: 'js/reclamos-clasificacion.js', marcas: ['DESAGUES', 'solo un número'], noCaracterRaro: true },
    { ruta: 'js/reclamos-graficos.js' },
    { ruta: 'js/excel.js', marcas: ['SAE_EXCEL'] },
    { ruta: 'js/estado.js' },
    { ruta: 'css/styles.css' },
    { ruta: 'css/reclamos.css', marcas: ['rec-abiertos', 'res-reinc'] },
    { ruta: 'css/navegacion.css', marcas: ['sae-nav-encabezado'] },
    { ruta: 'css/totales.css' },
    { ruta: 'css/mobile.css' },
    { ruta: 'css/extras.css' },
    { ruta: 'datos/data.js', marcas: ['SAE_DATA'] },
    { ruta: 'datos/menus.js' },
    { ruta: 'datos/reclamos-config.js', marcas: ['urlScript'] },
    { ruta: 'datos/cupos-historicos.js' },
    { ruta: 'mapa/index.html', marcas: ['btnFiltros', '../js/excel.js'] },
    { ruta: 'mapa/data_escuelas.js' },
    { ruta: 'mapa/js/app.js', marcas: ['SAE_EXCEL'] },
    { ruta: 'mapa/js/datos-buscador.js' },
    { ruta: 'mapa/js/mapa-filtros.js' },
    { ruta: 'mapa/css/styles.css' }
  ];
  // Archivos que NO tienen que estar (quedan cuando se sube una carpeta en el lugar equivocado)
  const SOBRANTES = ['js/data_escuelas.js', 'js/datos-buscador.js', 'js/mapa-filtros.js', 'mapa/js/data_escuelas.js', 'data_escuelas.js', 'mapa/mapa/index.html'];

  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n) => Number(n).toLocaleString('es-AR');
  const ICONO = { ok: '✅', aviso: '⚠️', error: '❌', info: 'ℹ️' };
  let resultados = {};

  function pintar(grupo, items) {
    resultados[grupo] = items;
    $(grupo).innerHTML = items.map(it => `<li class="est-item ${it.tipo}"><span class="est-i">${ICONO[it.tipo]}</span>` +
      `<strong>${esc(it.titulo)}</strong><small>${esc(it.detalle || '')}</small></li>`).join('');
  }

  async function traer(ruta) {
    try {
      const r = await fetch(ruta + (ruta.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
      return { ok: r.ok, status: r.status, texto: r.ok ? await r.text() : '' };
    } catch (e) { return { ok: false, status: 0, texto: '' }; }
  }

  /* ---------------------------------------------------------- archivos */
  async function revisarArchivos() {
    const items = [];
    const res = await Promise.all(ARCHIVOS.map(a => traer(a.ruta)));
    let bien = 0;
    res.forEach((r, i) => {
      const a = ARCHIVOS[i];
      if (!r.ok) { items.push({ tipo: 'error', titulo: `Falta ${a.ruta}`, detalle: 'No está en GitHub (o está en otra carpeta). Subilo de nuevo en su lugar.' }); return; }
      const faltan = (a.marcas || []).filter(m => !r.texto.includes(m));
      const encima = (a.no || []).filter(m => r.texto.includes(m));
      if (encima.length) { items.push({ tipo: 'error', titulo: `${a.ruta} es otro archivo`, detalle: a.nota || 'Se subió otro archivo con el mismo nombre.' }); return; }
      if (a.noCaracterRaro && /\u0008/.test(r.texto)) { items.push({ tipo: 'error', titulo: `${a.ruta} está dañado`, detalle: 'Tiene caracteres raros: la sugerencia de clasificación no funciona bien. Subí la última versión.' }); return; }
      if (faltan.length) { items.push({ tipo: 'aviso', titulo: `${a.ruta} está desactualizado`, detalle: 'Le faltan partes de la última versión. Subí el archivo de la última entrega.' }); return; }
      bien++;
    });
    const sob = await Promise.all(SOBRANTES.map(s => traer(s)));
    sob.forEach((r, i) => {
      if (r.ok) items.push({ tipo: 'aviso', titulo: `Sobra ${SOBRANTES[i]}`, detalle: 'No se usa: seguramente quedó al subir una carpeta en el lugar equivocado. Se puede borrar desde github.dev.' });
    });
    items.unshift({ tipo: bien === ARCHIVOS.length ? 'ok' : 'info', titulo: `${bien} de ${ARCHIVOS.length} archivos en orden`, detalle: bien === ARCHIVOS.length ? 'Están todos y en su última versión.' : 'Abajo, lo que hay que revisar.' });
    pintar('gArchivos', items);
  }

  /* ---------------------------------------------------------- script */
  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  async function pedir(accion, extra) {
    const url = (typeof RECLAMOS_CONFIG !== 'undefined' && RECLAMOS_CONFIG.urlScript) || '';
    if (!url) throw new Error('SIN_URL');
    const q = new URLSearchParams(Object.assign({ accion, clave: leerLS('sae-reclamos-clave') || '' }, extra || {}));
    const t0 = performance.now();
    const r = await fetch(url + '?' + q.toString(), { redirect: 'follow' });
    const texto = await r.text();
    let json;
    try { json = JSON.parse(texto); } catch (e) { throw new Error('HTML'); }
    json._ms = Math.round(performance.now() - t0);
    if (!json.ok) throw new Error(json.error || 'Error');
    return json;
  }
  function explicar(err) {
    const m = String(err && err.message || err);
    if (m === 'SIN_URL') return 'No hay link del script en datos/reclamos-config.js.';
    if (m.includes('CLAVE_INCORRECTA')) return 'Falta la clave en este navegador: entrá una vez a Reclamos con la clave del equipo y volvé.';
    if (m === 'HTML') return 'Google respondió con una página de error: revisá que la implementación esté publicada para "Cualquier usuario".';
    if (m.includes('Failed to fetch') || m.includes('NetworkError')) return 'No hay conexión con Google (internet o bloqueo de la red).';
    return m;
  }

  async function revisarScript() {
    const items = [];
    let ok = false;
    try {
      const r = await pedir('ping');
      ok = true;
      const v = r.version || 0;
      items.push({ tipo: 'ok', titulo: 'El script responde', detalle: `Pestaña de reclamos: "${r.hoja || '?'}" · respondió en ${(r._ms / 1000).toFixed(1)} s` });
      if (v < VERSION_SCRIPT_MINIMA) items.push({ tipo: 'error', titulo: `Versión del script: ${v} (muy vieja)`, detalle: `Pegá el Codigo.gs nuevo en Apps Script y hacé Implementar → Administrar implementaciones → Nueva versión. La última es la ${VERSION_SCRIPT_ULTIMA}.` });
      else if (v < VERSION_SCRIPT_ULTIMA) items.push({ tipo: 'aviso', titulo: `Versión del script: ${v}`, detalle: `Anda, pero hay una más nueva (${VERSION_SCRIPT_ULTIMA}) que guarda los cambios de estado más rápido.` });
      else items.push({ tipo: 'ok', titulo: `Versión del script: ${v}`, detalle: 'Es la última.' });
    } catch (err) {
      items.push({ tipo: 'error', titulo: 'El script no responde', detalle: explicar(err) });
    }
    pintar('gScript', items);
    return ok;
  }

  /* ---------------------------------------------------------- datos */
  async function revisarDatos(scriptOk) {
    const items = [];
    const escuelas = (typeof SAE_DATA !== 'undefined' && SAE_DATA.escuelas) || [];
    const servicios = escuelas.reduce((t, e) => t + (e.servicios || []).length, 0);
    items.push({ tipo: escuelas.length ? 'ok' : 'error', titulo: `Datos guardados en la página: ${nf(escuelas.length)} escuelas`,
      detalle: escuelas.length ? `${nf(servicios)} servicios · extraídos el ${SAE_DATA.fechaExtraccion || '?'}` : 'datos/data.js no cargó.' });
    if (!scriptOk) {
      items.push({ tipo: 'info', titulo: 'No se pudo revisar la hoja', detalle: 'Primero tiene que responder el script.' });
      pintar('gDatos', items);
      return;
    }
    try {
      const d = await pedir('datos');
      const filas = (d.cupos && d.cupos.filas) || [];
      const fechas = (d.cupos && d.cupos.fechas) || [];
      const pct = servicios ? filas.length / servicios : 1;
      items.push({ tipo: pct < 0.5 ? 'error' : 'ok', titulo: `Hoja CUPOS 2026: ${nf(filas.length)} filas`,
        detalle: pct < 0.5 ? `Llegaron muchas menos filas que servicios (${nf(servicios)}): la hoja puede estar incompleta o filtrada. La página no la usa hasta que se arregle.`
          : `Hasta el ${fechas.length ? fechas[fechas.length - 1] : '?'} · leída el ${String(d.generado || '').replace('T', ' a las ')}` });
      const nMenus = d.menus ? Object.keys(d.menus).length : 0;
      items.push({ tipo: nMenus ? 'ok' : 'aviso', titulo: `Menús: ${nMenus} pestañas leídas`, detalle: nMenus ? '' : 'No llegaron menús: revisá los nombres de las pestañas de menús.' });
      (d.avisos || []).slice(0, 6).forEach(a => items.push({ tipo: 'aviso', titulo: 'Aviso de la hoja', detalle: String(a) }));
    } catch (err) {
      items.push({ tipo: 'error', titulo: 'No se pudieron leer cupos y menús', detalle: explicar(err) });
    }
    try {
      const anio = new Date().getFullYear();
      const r = await pedir('compacto', { desde: anio });
      const filas = r.filas || [];
      const fechas = filas.map(f => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(String(f[1] || '')); return m ? new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], m[2] - 1, m[1]) : null; }).filter(Boolean);
      const ultima = fechas.length ? new Date(Math.max(...fechas)) : null;
      const sinEstado = filas.filter(f => !String(f[8] || '').trim()).length;
      items.push({ tipo: filas.length ? 'ok' : 'aviso', titulo: `Reclamos de ${anio}: ${nf(filas.length)}`,
        detalle: ultima ? `El último es del ${ultima.toLocaleDateString('es-AR')}` : 'Todavía no hay reclamos este año.' });
      if (sinEstado) items.push({ tipo: 'aviso', titulo: `${nf(sinEstado)} reclamos de ${anio} sin estado`, detalle: 'Con la columna ESTADO vacía no se sabe si están resueltos (no cuentan en "estancados" ni en tiempo de resolución).' });
    } catch (err) {
      items.push({ tipo: 'error', titulo: 'No se pudieron leer los reclamos', detalle: explicar(err) });
    }
    pintar('gDatos', items);
  }

  /* ---------------------------------------------------------- navegador */
  function revisarNavegador() {
    const items = [];
    let lsOk = false;
    try { localStorage.setItem('sae-prueba', '1'); localStorage.removeItem('sae-prueba'); lsOk = true; } catch (e) { /* nada */ }
    items.push({ tipo: lsOk ? 'ok' : 'aviso', titulo: lsOk ? 'Puede guardar datos' : 'No puede guardar datos',
      detalle: lsOk ? '' : 'Ventana privada o almacenamiento bloqueado: la página anda, pero no recuerda la clave ni los filtros.' });
    const clave = !!leerLS('sae-reclamos-clave');
    items.push({ tipo: clave ? 'ok' : 'aviso', titulo: clave ? 'Clave del equipo guardada' : 'Sin clave guardada', detalle: clave ? '' : 'Entrá a Reclamos y poné la clave una vez.' });
    const ult = Number(leerLS('sae-sync-ultima')) || 0;
    items.push({ tipo: 'info', titulo: 'Última actualización de cupos en este navegador', detalle: ult ? new Date(ult).toLocaleString('es-AR') : 'Nunca (usa los datos guardados en la página).' });
    let total = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); total += (localStorage.getItem(k) || '').length; } } catch (e) { /* nada */ }
    items.push({ tipo: total > 4.5e6 ? 'aviso' : 'info', titulo: `Espacio usado: ${(total / 1e6).toFixed(1)} MB de ~5 MB`,
      detalle: total > 4.5e6 ? 'Casi lleno: puede no guardar la copia local de reclamos (anda igual, solo más lento al abrir).' : '' });
    pintar('gNavegador', items);
  }

  /* ---------------------------------------------------------- general */
  function pintarResumen() {
    const todos = Object.values(resultados).flat();
    const err = todos.filter(i => i.tipo === 'error').length, av = todos.filter(i => i.tipo === 'aviso').length;
    const caja = $('estResumen');
    caja.className = 'rec-card est-resumen ' + (err ? 'error' : av ? 'aviso' : 'ok');
    caja.innerHTML = `<span class="est-ico">${err ? '❌' : av ? '⚠️' : '✅'}</span><div><h2>${err ? `Hay ${err} problema${err === 1 ? '' : 's'} para resolver` : av ? `Todo funciona, con ${av} aviso${av === 1 ? '' : 's'}` : 'Todo en orden'}</h2>` +
      `<p>Revisado el ${new Date().toLocaleString('es-AR')}</p></div>`;
  }

  async function revisar() {
    resultados = {};
    ['gArchivos', 'gScript', 'gDatos', 'gNavegador'].forEach(g => { $(g).innerHTML = '<li class="est-cargando">Revisando…</li>'; });
    $('estResumen').innerHTML = '<span class="est-ico">⏳</span><div><h2>Revisando…</h2><p>Esto tarda unos segundos.</p></div>';
    revisarNavegador();
    const [, scriptOk] = await Promise.all([revisarArchivos(), revisarScript()]);
    await revisarDatos(scriptOk);
    pintarResumen();
  }

  function copiar() {
    const txt = ['Estado del sistema SAE · ' + new Date().toLocaleString('es-AR')].concat(
      [['gArchivos', 'Archivos'], ['gScript', 'Script'], ['gDatos', 'Datos'], ['gNavegador', 'Navegador']].map(([g, n]) =>
        `\n${n}:\n` + (resultados[g] || []).map(i => `${ICONO[i.tipo]} ${i.titulo}${i.detalle ? ' — ' + i.detalle : ''}`).join('\n'))).join('\n');
    const listo = () => { const b = $('btnCopiar'); b.textContent = '✓ Copiado'; setTimeout(() => { b.textContent = '📋 Copiar informe'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(listo, () => prompt('Copiá el informe:', txt));
    else prompt('Copiá el informe:', txt);
  }

  $('btnRevisar').addEventListener('click', revisar);
  $('btnCopiar').addEventListener('click', copiar);
  $('btnDarkMode').addEventListener('click', () => {
    const d = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('sae-darkmode', String(d)); } catch (e) { /* nada */ }
    $('darkModeIcon').textContent = d ? '☀️' : '🌙';
  });
  $('darkModeIcon').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  revisar();
})();
