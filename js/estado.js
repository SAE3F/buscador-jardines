/**
 * ESTADO DEL SISTEMA
 * Revisa que estén todos los archivos (y en su última versión), que el script de
 * Google responda y que los datos de la hoja lleguen completos. Solo lee: no
 * cambia nada.
 */
(function () {
  'use strict';

  const VERSION_SCRIPT_ULTIMA = 13;   // la del Codigo.gs más nuevo
  const VERSION_SCRIPT_MINIMA = 8;    // con menos, la página de reclamos no anda bien

  /* Archivos que tiene que haber. "marcas": textos que solo están en la última versión
     (si faltan, el archivo quedó viejo). "no": textos que indican que se subió otro archivo encima. */
  const ARCHIVOS = [
    { ruta: 'index.html', marcas: ['viewDirectorio', 'js/excel.js', 'btnEstadoSistema', '__saeErrores', 'js/impresion.js', 'js/avisos.js', 'js/cupos.js'], no: ['leaflet'], nota: 'Si tiene "leaflet", en la raíz quedó el index del mapa.' },
    { ruta: 'reclamos.html', marcas: ['abiertosEscuela', 'btnResProv', 'js/excel.js', '__saeErrores', 'js/impresion.js', 'panelMulti', 'btnOrden', 'js/avisos.js', 'js/cupos.js', 'data-ver-clave'] },
    { ruta: 'totales.html', marcas: ['js/excel.js', '__saeErrores', 'js/impresion.js', 'js/avisos.js'] },
    { ruta: 'mobile.html', marcas: ['__saeErrores', 'js/impresion.js', 'js/avisos.js', 'js/cupos.js'] },
    { ruta: 'estado.html', marcas: ['btnPaginas', 'btnWhatsApp'] },
    { ruta: 'js/app.js', marcas: ['getFilteredSchools', 'SAE_EXCEL', 'sae-cupo-editar', 'mail.google.com'], no: ['L.map('], nota: 'Si tiene "L.map(", en js/ quedó el app.js del mapa.' },
    { ruta: 'js/mobile.js' },
    { ruta: 'js/extras.js' },
    { ruta: 'js/sync.js', marcas: ['versionScript', 'limites'] },
    { ruta: 'js/avisos.js', marcas: ['SAE_AVISOS', 'saeAvisosPanel'] },
    { ruta: 'js/cupos.js', marcas: ['SAE_CUPOS', 'botonVerClave'] },
    { ruta: 'js/navegacion.js', marcas: ['SAE_TECLADO', 'SAE_VERSION', 'compararVersiones'] },
    { ruta: 'version.json', marcas: ['version'] },
    { ruta: 'js/totales.js', marcas: ['SAE_EXCEL', 'SAE_IMPRESION'] },
    { ruta: 'js/reclamos.js', marcas: ['pintarAbiertosEscuela', 'exportarPorProveedor', 'SAE_IMPRESION', 'colorAnio', 'guardarMulti', 'problemasDato', 'avisarAvisos', 'DIAS_AVISO_FUTURO', 'armarEntradas', 'enviarLote', 'registrarDeshacer', 'mapaDuplicados', 'encolarActualizacion'] },
    { ruta: 'js/reclamos-clasificacion.js', marcas: ['DESAGUES', 'solo un número'], noCaracterRaro: true },
    { ruta: 'js/reclamos-graficos.js', marcas: ['rotulos'] },
    { ruta: 'js/excel.js', marcas: ['SAE_EXCEL'] },
    { ruta: 'js/impresion.js', marcas: ['SAE_IMPRESION'] },
    { ruta: 'js/estado.js', marcas: ['revisarPaginas', 'fetchConTope'] },
    { ruta: 'css/styles.css', marcas: ['toast-notification:empty'] },
    { ruta: 'css/reclamos.css', marcas: ['rec-abiertos', 'res-reinc', 'rec-grupo-lista', 'rec-deshacer'] },
    { ruta: 'css/navegacion.css', marcas: ['sae-nav-encabezado', 'sae-tecla-activo'] },
    { ruta: 'css/totales.css' },
    { ruta: 'css/mobile.css' },
    { ruta: 'css/extras.css' },
    { ruta: 'datos/data.js', marcas: ['SAE_DATA'] },
    { ruta: 'datos/menus.js' },
    { ruta: 'datos/reclamos-config.js', marcas: ['urlScript'] },
    { ruta: 'datos/cupos-historicos.js' },
    { ruta: 'docs/CONTEXTO_PARA_CLAUDE.md' },
    { ruta: 'mapa/index.html', marcas: ['btnFiltros', '../js/excel.js', '__saeErrores', 'btnInspCerrar', '../js/avisos.js'] },
    { ruta: 'mapa/data_escuelas.js' },
    { ruta: 'mapa/js/app.js', marcas: ['SAE_EXCEL', 'cerrarInspector', 'mantenerFoco'] },
    { ruta: 'mapa/js/datos-buscador.js' },
    { ruta: 'mapa/js/mapa-filtros.js' },
    { ruta: 'mapa/css/styles.css', marcas: ['inspector-btn'] }
  ];
  // Archivos que NO tienen que estar (quedan cuando se sube una carpeta en el lugar equivocado)
  const SOBRANTES = ['js/data_escuelas.js', 'js/datos-buscador.js', 'js/mapa-filtros.js', 'mapa/js/data_escuelas.js', 'data_escuelas.js', 'mapa/mapa/index.html'];

  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n) => Number(n).toLocaleString('es-AR');
  const ICONO = { ok: '✅', aviso: '⚠️', error: '❌', info: 'ℹ️' };
  let resultados = {};

  const TITULOS = { gPaginas: '🧪 Páginas', gArchivos: '📁 Archivos de la página', gScript: '🔗 Script de Google', gDatos: '📊 Datos (cupos, menús y reclamos)', gNavegador: '💻 Este navegador' };
  /** Devuelve la lista del grupo; si no existe (estado.html viejo), la crea. */
  function grupo(id) {
    let el = $(id);
    if (!el) {
      const card = document.createElement('div');
      card.className = 'rec-card est-grupo';
      card.innerHTML = `<h3>${TITULOS[id] || id}</h3><ul class="est-lista" id="${id}"></ul>`;
      document.querySelector('main').appendChild(card);
      el = $(id);
    }
    return el;
  }
  function pintar(grupoId, items) {
    resultados[grupoId] = items;
    grupo(grupoId).innerHTML = items.map(it => `<li class="est-item ${it.tipo}"><span class="est-i">${ICONO[it.tipo]}</span>` +
      `<strong>${esc(it.titulo)}</strong><small>${esc(it.detalle || '')}</small></li>`).join('');
    pintarResumen();
  }

  /** fetch con tope de tiempo: si no responde, corta y sigue con lo demás. */
  async function fetchConTope(url, opciones, ms) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), ms);
    try { return await fetch(url, Object.assign({}, opciones, ctrl ? { signal: ctrl.signal } : {})); }
    catch (e) { if (e && e.name === 'AbortError') throw new Error('TIEMPO'); throw e; }
    finally { clearTimeout(t); }
  }
  async function traer(ruta) {
    try {
      const r = await fetchConTope(ruta + (ruta.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' }, 10000);
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
    const r = await fetchConTope(url + '?' + q.toString(), { redirect: 'follow' }, accion === 'ping' ? 20000 : 45000);
    const texto = await r.text();
    let json;
    try { json = JSON.parse(texto); } catch (e) { throw new Error('HTML'); }
    json._ms = Math.round(performance.now() - t0);
    if (!json.ok) throw new Error(json.error || 'Error');
    return json;
  }
  function explicar(err) {
    const m = String(err && err.message || err);
    if (m === 'TIEMPO') return 'Google tardó demasiado en responder (puede pasar la primera vez del día). Probá "Volver a revisar" en un rato.';
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
      else if (v < VERSION_SCRIPT_ULTIMA) items.push({ tipo: 'aviso', titulo: `Versión del script: ${v}`, detalle: `Anda, pero hay una más nueva (${VERSION_SCRIPT_ULTIMA}): la 11 trae avisos y cupos, la 12 guarda los cambios de los globos en un solo envío y la 13 arregla los estados que rechaza el desplegable de la hoja.` });
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
      const L = d.limites || null;
      const hasta = L && L.dia ? L.dia.split('-').reverse().join('/') : (fechas.length ? fechas[fechas.length - 1] : '?');
      items.push({ tipo: pct < 0.5 ? 'error' : 'ok', titulo: `Hoja de cupos${d.cuposOrigen === 'prueba' ? ' (copia de PRUEBA)' : ' CUPOS 2026'}: ${nf(filas.length)} filas`,
        detalle: pct < 0.5 ? `Llegaron muchas menos filas que servicios (${nf(servicios)}): la hoja puede estar incompleta o filtrada. La página no la usa hasta que se arregle.`
          : `Días cargados hasta el ${hasta} · leída el ${String(d.generado || '').replace('T', ' a las ')}` });
      if (d.cuposOrigen === 'prueba') items.push({ tipo: 'aviso', titulo: 'Los cupos se leen y se cambian en la copia de prueba', detalle: 'Para pasar al Tablero real: en el Codigo.gs poner CUPOS_DE_PRUEBA = false y volver a implementar.' });
      if ((d.version || 0) >= 11) {
        const nProv = L && Array.isArray(L.proveedores) ? L.proveedores.length : 0;
        items.push({ tipo: nProv ? 'ok' : 'aviso', titulo: nProv ? `Límites de cupos: ${nProv} proveedores` : 'No se encontraron los límites de cupos',
          detalle: nProv ? L.proveedores.map(p => p.proveedor).join(', ') : 'Al final de la pestaña de cupos tiene que estar el bloque DM LIMITE / DM ACTUAL / COMEDOR LIMITE…, con los proveedores en la fila de arriba.' });
      }
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
    // Versión de la página que tiene abierta este navegador contra la publicada (version.json)
    const cargada = window.SAE_VERSION || '';
    fetchConTope('version.json?t=' + Date.now(), { cache: 'no-store' }, 10000).then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
      const publicada = j && j.version ? String(j.version) : '';
      let it;
      if (!cargada) it = { tipo: 'aviso', titulo: 'No se sabe qué versión de la página está abierta', detalle: 'Falta el js/navegacion.js nuevo.' };
      else if (!publicada) it = { tipo: 'aviso', titulo: `Versión de la página: ${cargada}`, detalle: 'No se encontró version.json en el repo (subilo junto con los demás archivos).' };
      else if ((window.SAE_COMPARAR_VERSIONES ? SAE_COMPARAR_VERSIONES(publicada, cargada) : (publicada > cargada ? 1 : publicada < cargada ? -1 : 0)) > 0) it = { tipo: 'aviso', titulo: `Versión de la página: ${cargada} (hay una más nueva: ${publicada})`, detalle: 'Recargá con Ctrl + F5 para ver la última.' };
      else if (publicada !== cargada) it = { tipo: 'aviso', titulo: `Versión de la página: ${cargada}`, detalle: `version.json dice ${publicada}: falta subir el version.json nuevo, o Vercel todavía está publicando.` };
      else it = { tipo: 'ok', titulo: `Versión de la página: ${cargada}`, detalle: 'Es la última publicada.' };
      items.unshift(it);
      pintar('gNavegador', items);
      pintarResumen();
    });
  }

  /* ---------------------------------------------------------- páginas
   * Cada página se abre en un marco invisible, se espera a que cargue y se prueba
   * lo principal (que aparezcan las escuelas, que el buscador encuentre, que el
   * mapa dibuje, etc.). También se juntan los errores que la página anotó. */
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  function abrirEnMarco(url) {
    return new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.className = 'est-marco';
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      let listo = false;
      const fin = (ok) => { if (listo) return; listo = true; resolve({ marco: f, ok }); };
      f.addEventListener('load', () => fin(true));
      setTimeout(() => fin(false), 15000);
      f.src = url + (url.includes('?') ? '&' : '?') + 'chequeo=' + Date.now();
      document.body.appendChild(f);
    });
  }
  async function esperarHasta(fn, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { const r = fn(); if (r) return r; } catch (e) { /* todavía no */ }
      await espera(250);
    }
    try { return fn(); } catch (e) { return null; }
  }
  function escribir(doc, win, sel, texto) {
    const el = doc.querySelector(sel);
    if (!el) return false;
    el.focus();
    el.value = texto;
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    el.dispatchEvent(new win.KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    return true;
  }
  const visible = (el) => !!el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';

  const PAGINAS = [
    { nombre: 'Buscador (computadora)', url: 'index.html', prueba: async (doc, win) => {
        const opciones = await esperarHasta(() => doc.querySelectorAll('#schoolSelect option').length > 10 && doc.querySelectorAll('#schoolSelect option').length, 8000);
        if (!opciones) return { tipo: 'error', detalle: 'No aparecen las escuelas en la lista.' };
        escribir(doc, win, '#searchInput', 'EP 1');
        const sug = await esperarHasta(() => doc.querySelectorAll('#autocompleteList > *').length, 3000);
        return sug ? { tipo: 'ok', detalle: `${nf(opciones - 1)} escuelas en la lista · la búsqueda "EP 1" encuentra ${nf(sug)}` }
          : { tipo: 'aviso', detalle: `Cargan las escuelas (${nf(opciones - 1)}), pero la búsqueda no mostró sugerencias.` };
      } },
    { nombre: 'Buscador (celular)', url: 'mobile.html', prueba: async (doc, win) => {
        const ok = await esperarHasta(() => doc.querySelector('#mobileSearchInput') && /\d/.test((doc.querySelector('#statsTotalEscuelas') || {}).textContent || ''), 8000);
        if (!ok) return { tipo: 'error', detalle: 'La versión para celular no terminó de cargar.' };
        escribir(doc, win, '#mobileSearchInput', 'EP 1');
        const sug = await esperarHasta(() => doc.querySelectorAll('#autocompleteList > *').length, 3000);
        return sug ? { tipo: 'ok', detalle: `Carga y la búsqueda encuentra ${nf(sug)} escuelas` } : { tipo: 'aviso', detalle: 'Carga, pero la búsqueda no mostró sugerencias.' };
      } },
    { nombre: 'Reclamos', url: 'reclamos.html', prueba: async (doc) => {
        const r = await esperarHasta(() => {
          if (visible(doc.getElementById('panelConexion'))) return 'clave';
          const c = doc.getElementById('resultadosConteo');
          return c && /\d/.test(c.textContent) && !/cargando/i.test(c.textContent) ? 'ok' : null;
        }, 30000);
        if (r === 'clave') return { tipo: 'aviso', detalle: 'Pide la clave: entrá una vez a Reclamos con la clave del equipo.' };
        if (!r) return { tipo: 'error', detalle: 'No terminó de cargar los reclamos (revisá el script de Google).' };
        const n = (doc.getElementById('estadoConexion') || {}).textContent || '';
        const motivos = doc.querySelectorAll('#opcCategoria button').length;
        return motivos ? { tipo: 'ok', detalle: `${n.trim()} · formulario listo (${motivos} categorías)` } : { tipo: 'aviso', detalle: 'Cargan los reclamos, pero el formulario no muestra las categorías.' };
      } },
    { nombre: 'Totales', url: 'totales.html', prueba: async (doc) => {
        const filas = await esperarHasta(() => doc.querySelectorAll('#tGeneral tbody tr').length, 10000);
        if (!filas) return { tipo: 'error', detalle: 'No se calculan los totales por proveedor.' };
        const merc = doc.querySelectorAll('#tMercaderia tbody tr').length;
        return { tipo: 'ok', detalle: `${nf(filas)} proveedores · ${nf(merc)} alimentos en la mercadería del primero` };
      } },
    { nombre: 'Mapa', url: 'mapa/index.html', prueba: async (doc, win) => {
        const ok = await esperarHasta(() => win.L && win.eval('typeof AppState !== "undefined" && !!AppState.map'), 12000);
        if (!ok) return { tipo: 'error', detalle: win.L ? 'El mapa no se dibujó.' : 'No cargó la librería del mapa (Leaflet): puede ser la conexión a internet.' };
        const n = await esperarHasta(() => { const v = win.eval('typeof AppState !== "undefined" && AppState.filteredSchools ? AppState.filteredSchools.length : 0'); return v || null; }, 6000);
        const filtros = !!doc.getElementById('btnFiltros');
        return n ? { tipo: filtros ? 'ok' : 'aviso', detalle: `${nf(n)} escuelas en el mapa${filtros ? '' : ' · falta el botón de filtros (mapa/index.html viejo)'}` }
          : { tipo: 'aviso', detalle: 'El mapa se dibujó, pero sin escuelas.' };
      } }
  ];

  async function revisarPaginas() {
    const items = [];
    pintar('gPaginas', [{ tipo: 'info', titulo: `Probando ${PAGINAS[0].nombre}…`, detalle: 'Se abren las páginas de a una (unos segundos cada una).' }]);
    for (const p of PAGINAS) {
      const { marco, ok } = await abrirEnMarco(p.url);
      let res;
      try {
        const win = marco.contentWindow, doc = marco.contentDocument;
        if (!ok || !doc || !doc.body) res = { tipo: 'error', detalle: 'La página no abrió.' };
        else if (/404|not found/i.test(doc.title || '') && !doc.querySelector('script')) res = { tipo: 'error', detalle: 'No existe (404).' };
        else res = await p.prueba(doc, win);
        const errs = (win && win.__saeErrores) || [];
        if (errs.length) {
          const unicos = [...new Set(errs)].slice(0, 3);
          res = { tipo: res.tipo === 'ok' ? 'aviso' : res.tipo, detalle: `${res.detalle} · Errores: ${unicos.join(' | ')}${errs.length > 3 ? ` (y ${errs.length - 3} más)` : ''}` };
        } else if (win && win.__saeErrores === undefined && res.tipo === 'ok') {
          res.detalle += ' (archivo sin el registro de errores: subí la última versión)';
        }
      } catch (e) {
        res = { tipo: 'error', detalle: 'No se pudo probar: ' + (e && e.message ? e.message : e) };
      }
      marco.remove();
      items.push(Object.assign({ titulo: p.nombre }, res));
      pintar('gPaginas', items.length < PAGINAS.length ? items.concat([{ tipo: 'info', titulo: `Probando ${PAGINAS[items.length].nombre}…`, detalle: '' }]) : items);
    }
    pintar('gPaginas', items);
  }

  /* ---------------------------------------------------------- general */
  let revisando = false;
  function pintarResumen() {
    if (!$('estResumen')) return;
    const todos = Object.values(resultados).flat();
    if (revisando) {
      const pend = ['gArchivos', 'gScript', 'gDatos', 'gNavegador'].filter(g => !resultados[g]).map(g => TITULOS[g].replace(/^\S+\s/, ''));
      $('estResumen').className = 'rec-card est-resumen';
      $('estResumen').innerHTML = `<span class="est-ico">⏳</span><div><h2>Revisando…</h2><p>${pend.length ? 'Falta: ' + esc(pend.join(', ')) : 'Terminando…'}</p></div>`;
      return;
    }
    const err = todos.filter(i => i.tipo === 'error').length, av = todos.filter(i => i.tipo === 'aviso').length;
    const caja = $('estResumen');
    caja.className = 'rec-card est-resumen ' + (err ? 'error' : av ? 'aviso' : 'ok');
    caja.innerHTML = `<span class="est-ico">${err ? '❌' : av ? '⚠️' : '✅'}</span><div><h2>${err ? `Hay ${err} problema${err === 1 ? '' : 's'} para resolver` : av ? `Todo funciona, con ${av} aviso${av === 1 ? '' : 's'}` : 'Todo en orden'}</h2>` +
      `<p>Revisado el ${new Date().toLocaleString('es-AR')}</p></div>`;
  }

  async function revisar() {
    const paginas = resultados.gPaginas;   // la prueba de páginas se conserva hasta que se vuelva a correr
    resultados = {};
    if (paginas) resultados.gPaginas = paginas;
    revisando = true;
    ['gArchivos', 'gScript', 'gDatos', 'gNavegador'].forEach(g => { grupo(g).innerHTML = '<li class="est-cargando">Revisando…</li>'; });
    pintarResumen();
    try {
      revisarNavegador();
      // Archivos y script a la vez; los datos apenas responde el script
      await Promise.all([
        revisarArchivos().catch(e => pintar('gArchivos', [{ tipo: 'error', titulo: 'No se pudieron revisar los archivos', detalle: explicar(e) }])),
        revisarScript().then(ok => revisarDatos(ok)).catch(e => pintar('gDatos', [{ tipo: 'error', titulo: 'No se pudieron revisar los datos', detalle: explicar(e) }]))
      ]);
    } finally {
      revisando = false;
      pintarResumen();
    }
  }

  let probandoPaginas = false;
  async function probarPaginas() {
    if (probandoPaginas) return;
    probandoPaginas = true;
    const b = $('btnPaginas');
    if (b) { b.disabled = true; b.textContent = '⏳ Probando…'; }
    try { await revisarPaginas(); }
    catch (e) { pintar('gPaginas', [{ tipo: 'error', titulo: 'No se pudo hacer la prueba', detalle: String(e && e.message || e) }]); }
    finally {
      probandoPaginas = false;
      if (b) { b.disabled = false; b.textContent = '🧪 Probar páginas'; }
      pintarResumen();
    }
  }

  function textoInforme() {
    return ['Estado del sistema SAE · ' + new Date().toLocaleString('es-AR') + ' · ' + location.host].concat(
      [['gArchivos', 'Archivos'], ['gScript', 'Script'], ['gDatos', 'Datos'], ['gNavegador', 'Navegador'], ['gPaginas', 'Páginas']]
        .filter(([g]) => resultados[g])
        .map(([g, n]) => `\n${n}:\n` + resultados[g].map(i => `${ICONO[i.tipo]} ${i.titulo}${i.detalle ? ' — ' + i.detalle : ''}`).join('\n'))).join('\n');
  }
  function compartirWhatsApp() {
    // Sin número guardado: WhatsApp abre y la persona elige a quién mandarlo
    window.open('https://wa.me/?text=' + encodeURIComponent(textoInforme()), '_blank', 'noopener');
  }
  function copiar() {
    const txt = textoInforme();
    const listo = () => { const b = $('btnCopiar'); b.textContent = '✓ Copiado'; setTimeout(() => { b.textContent = '📋 Copiar informe'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(listo, () => prompt('Copiá el informe:', txt));
    else prompt('Copiá el informe:', txt);
  }

  $('btnRevisar').addEventListener('click', revisar);
  $('btnCopiar').addEventListener('click', copiar);
  if ($('btnWhatsApp')) $('btnWhatsApp').addEventListener('click', compartirWhatsApp);
  if ($('btnPaginas')) $('btnPaginas').addEventListener('click', probarPaginas);
  $('btnDarkMode').addEventListener('click', () => {
    const d = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('sae-darkmode', String(d)); } catch (e) { /* nada */ }
    $('darkModeIcon').textContent = d ? '☀️' : '🌙';
  });
  $('darkModeIcon').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  revisar();
})();
