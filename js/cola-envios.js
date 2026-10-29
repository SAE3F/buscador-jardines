/**
 * COLA DE ENVÍOS A LA HOJA DE RECLAMOS (1.2.0)
 * ---------------------------------------------------------------------------
 * Todo lo que hay que guardar en la hoja (reclamos nuevos, cambios de estado,
 * reclasificaciones) pasa por esta cola. La cola se guarda en el navegador, así que:
 *   - se puede ir al Buscador, Totales o el Mapa y se sigue guardando desde ahí
 *     (esta misma cola está en todas las páginas, con una pastilla abajo);
 *   - si se cierra o se recarga la página, lo pendiente sigue al volver a abrir.
 * Si hay varias pestañas abiertas, envía una sola por vez (candado del navegador).
 *
 * Repetir un envío es seguro: los cambios de estado y las reclasificaciones dejan lo
 * mismo, y los reclamos nuevos llevan un número de envío que el script (v17) usa para no
 * cargarlos dos veces si un envío se cortó a la mitad.
 *
 * window.SAE_COLA: leer, encolar, encolarActualizacion, modificar, quitar, reintentar,
 *                  procesar, mensaje, pendientes. Eventos en window:
 *   'sae-cola'            → cambió la cola (en esta pestaña o en otra)
 *   'sae-cola-resultados' → detail: { tipo, resultados: [{ item, r }] } (lo que respondió la hoja)
 */
(function () {
  'use strict';
  if (window.SAE_COLA) return;

  const LS_COLA = 'sae-cola-envios';
  const LS_CLAVE = 'sae-reclamos-clave';
  const LS_VERSION = 'sae-script-version';
  const LS_LISTA = 'sae-reclamos-lista-v2';      // copia de la lista de Reclamos: se libera si falta lugar
  const CANDADO = 'sae-cola-envios';
  const LOTE_RECLAS_MAX = 40, LOTE_RECLAS_MIN = 5;
  // (2.2.0) Cambios de estado en tandas de 40 (la hoja original es grande): se achican solas si Google no responde
  const LOTE_ACT_MAX = 40, LOTE_ACT_MIN = 5;
  const HUERFANO_MS = 3 * 60 * 1000;            // sin candado del navegador: "enviando" viejo = cortado

  const scriptNav = document.querySelector('script[data-pagina]');
  const PAGINA = scriptNav ? scriptNav.dataset.pagina : '';
  const BASE = scriptNav ? (scriptNav.dataset.base || '') : '';

  let memoria = [];          // por si el navegador no deja guardar
  let persistente = true;
  let ocupado = false;       // esta pestaña está enviando
  let enVuelo = [];          // lo que esta pestaña mandó y todavía no respondió
  let loteReclas = LOTE_RECLAS_MAX;
  let loteAct = LOTE_ACT_MAX;
  // (2.2.1) Hoja ocupada por otro pedido: se espera un rato y se reintenta (hasta ~3 minutos)
  let pausa = 0, vecesOcupado = 0;
  let sinLote = false;       // script anterior a la v12: los cambios van de a uno
  let reintento = null;

  /* ---------------- Guardado en el navegador ---------------- */
  function leer() {
    try {
      const t = localStorage.getItem(LS_COLA);
      const a = t ? JSON.parse(t) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) { return memoria.slice(); }
  }
  function escribir(a) {
    memoria = a.slice();
    try {
      if (a.length) localStorage.setItem(LS_COLA, JSON.stringify(a));
      else localStorage.removeItem(LS_COLA);
      persistente = true;
    } catch (e) {
      // Sin lugar: se libera la copia de la lista de reclamos (se vuelve a bajar sola) y se prueba de nuevo
      try { localStorage.removeItem(LS_LISTA); localStorage.setItem(LS_COLA, JSON.stringify(a)); persistente = true; }
      catch (e2) { persistente = false; }
    }
    avisar();
  }
  /** Lee, cambia y guarda la cola de una vez. fn recibe el arreglo y puede cambiarlo. */
  function modificar(fn) {
    const a = leer();
    const r = fn(a);
    escribir(a);
    return r;
  }
  const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const versionScript = () => Number(localStorage.getItem(LS_VERSION) || 0) || 0;
  const clave = () => { try { return localStorage.getItem(LS_CLAVE) || ''; } catch (e) { return ''; } };
  const urlScript = () => (typeof RECLAMOS_CONFIG !== 'undefined' && RECLAMOS_CONFIG.urlScript) || '';

  /* ---------------- Avisos entre pestañas ---------------- */
  const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sae-cola') : null;
  function avisar() {
    window.dispatchEvent(new CustomEvent('sae-cola'));
    pintarPastilla();
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key === LS_COLA || ev.key === null) { avisar(); programar(1500); }
  });
  if (canal) canal.onmessage = (ev) => {
    if (ev.data && ev.data.tipo === 'resultados') window.dispatchEvent(new CustomEvent('sae-cola-resultados', { detail: Object.assign({ remoto: true }, ev.data.detalle) }));
  };
  function emitir(detalle) {
    window.dispatchEvent(new CustomEvent('sae-cola-resultados', { detail: detalle }));
    if (canal) {
      try { canal.postMessage({ tipo: 'resultados', detalle: JSON.parse(JSON.stringify(detalle)) }); } catch (e) { /* nada */ }
    }
  }

  /* ---------------- API para encolar ---------------- */
  /** items: [{ tipo: 'agregar'|'actualizar'|'reclasificar', datos, pedido?, antes? }] */
  function encolar(items) {
    const nuevos = items.map(x => Object.assign({ id: nuevoId(), tipo: 'agregar', estado: 'esperando', error: '', creado: Date.now() }, x));
    modificar(a => { a.push(...nuevos); });
    programar(0);
    return nuevos;
  }
  /** Un cambio de seguimiento: si ese reclamo ya tenía otro esperando (o con error), se juntan. */
  function encolarActualizacion(item) {
    const it = Object.assign({ id: nuevoId(), tipo: 'actualizar', estado: 'esperando', error: '', creado: Date.now() }, item);
    modificar(a => {
      const viejos = a.filter(x => x.tipo === 'actualizar' && x.pedido && x.pedido.fila === it.pedido.fila && (x.estado === 'esperando' || x.estado === 'error'));
      if (viejos.length) {
        it.antes = viejos[0].antes || it.antes;
        // (2.8.7) La hoja todavía tiene la fila como estaba: se controla con la huella del primero
        // (importa si uno de los cambios es la escuela, que forma parte de la huella)
        if (viejos[0].pedido && viejos[0].pedido.huella) it.pedido.huella = viejos[0].pedido.huella;
        it.pedido.cambios = Object.assign({}, ...viejos.map(v => v.pedido.cambios), it.pedido.cambios);
        viejos.forEach(v => a.splice(a.indexOf(v), 1));
      }
      a.push(it);
    });
    programar(0);
    return it;
  }
  /** Saca de la cola (Descartar / Editar). Devuelve los que sacó. */
  function quitar(ids) {
    const set = new Set(ids);
    return modificar(a => {
      const fuera = a.filter(x => set.has(x.id) && x.estado !== 'enviando');
      fuera.forEach(x => a.splice(a.indexOf(x), 1));
      return fuera;
    });
  }
  function reintentar(ids) {
    const set = ids ? new Set(ids) : null;
    modificar(a => a.forEach(x => { if (x.estado === 'error' && (!set || set.has(x.id))) { x.estado = 'esperando'; x.error = ''; x.dudoso = false; } }));
    programar(0);
  }
  function pendientes() {
    const a = leer();
    return { esperando: a.filter(x => x.estado !== 'error').length, errores: a.filter(x => x.estado === 'error').length, total: a.length };
  }

  /* ---------------- Mensajes ---------------- */
  function mensaje(err) {
    const m = String(err && err.message || err || '');
    if (m.includes('CLAVE_INCORRECTA')) return 'La clave no es correcta.';
    if (/OCUPADO|bloqueo|lock/i.test(m)) return 'La hoja estuvo ocupada guardando otros cambios. Tocá "Reintentar" (repetir no duplica nada).';
    if (/Failed to fetch|NetworkError|Load failed/.test(m)) return 'No se pudo conectar con la hoja. Revisá la conexión a internet o el link del script.';
    return m || 'Error desconocido';
  }

  /* ---------------- Envío ---------------- */
  async function post(cuerpo) {
    const r = await fetch(urlScript(), {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // sin verificación previa (Apps Script no la admite)
      body: JSON.stringify(Object.assign({ clave: clave() }, cuerpo))
    });
    const texto = await r.text();
    let json = null;
    try { json = JSON.parse(texto); } catch (e) { /* no es JSON */ }
    if (!json) throw new Error('Google respondió con una página de error en lugar de datos.');
    if (json.version) { try { localStorage.setItem(LS_VERSION, String(json.version)); } catch (e) { /* nada */ } }
    if (!json.ok) throw new Error(json.error || 'Error desconocido');
    vecesOcupado = 0;
    return json;
  }

  function programar(ms) {
    clearTimeout(reintento);
    reintento = setTimeout(procesar, ms || 0);
  }

  async function procesar() {
    if (ocupado) return;
    if (!urlScript() || !clave()) { pintarPastilla(); return; }
    if (!leer().some(x => x.estado === 'esperando' || x.estado === 'enviando')) return;
    if (navigator.locks && navigator.locks.request) {
      let tomado = false;
      try {
        await navigator.locks.request(CANDADO, { ifAvailable: true }, async (candado) => {
          if (!candado) return;
          tomado = true;
          await bucle(true);
        });
      } catch (e) { /* nada */ }
      // Otra pestaña está enviando: se vuelve a mirar en un rato (por si termina y queda algo)
      if (!tomado) programar(4000);
    } else {
      await bucle(false);
    }
  }

  async function bucle(conCandado) {
    ocupado = true;
    try {
      recuperarCortados(conCandado);
      for (;;) {
        const lote = tomarLote();
        if (!lote) break;
        enVuelo = lote;
        await enviar(lote);
        enVuelo = [];
        if (pausa) { programar(pausa); pausa = 0; break; }
      }
    } finally {
      ocupado = false;
      enVuelo = [];
      pintarPastilla();
    }
  }

  /** Lo que quedó "enviando" porque se cerró la página a mitad de un envío. */
  function recuperarCortados(conCandado) {
    const ahora = Date.now();
    const v17 = versionScript() >= 17;
    modificar(a => a.forEach(x => {
      if (x.estado !== 'enviando') return;
      if (!conCandado && ahora - (x.desde || 0) < HUERFANO_MS) return;
      if (x.tipo !== 'agregar' || v17) { x.estado = 'esperando'; return; }
      // Script viejo: un reclamo nuevo cortado a la mitad puede haber llegado igual
      x.estado = 'error'; x.dudoso = true;
      x.error = 'Se cortó mientras se guardaba: puede que ya esté en la hoja. Fijate en Buscar antes de reintentar.';
    }));
  }

  function tomarLote() {
    return modificar(a => {
      const primero = a.find(x => x.estado === 'esperando');
      if (!primero) return null;
      let lote = [primero];
      if (primero.tipo === 'borrar') {
        // (2.8.6) Los borrados van juntos en un solo pedido (script v31)
        lote = a.filter(x => x.tipo === 'borrar' && x.estado === 'esperando').slice(0, LOTE_ACT_MAX);
      } else if (primero.tipo === 'reclasificar') {
        lote = a.filter(x => x.tipo === 'reclasificar' && x.estado === 'esperando').slice(0, loteReclas);
      } else if (primero.tipo === 'actualizar' && !sinLote && versionScript() >= 12) {
        // Los cambios de un mismo reclamo van en orden: uno por reclamo en cada tanda
        const filas = new Set();
        lote = a.filter(x => {
          if (x.tipo !== 'actualizar' || x.estado !== 'esperando' || filas.has(x.pedido.fila)) return false;
          filas.add(x.pedido.fila); return true;
        }).slice(0, loteAct);
      }
      const ahora = Date.now();
      lote.forEach(x => { x.estado = 'enviando'; x.desde = ahora; });
      return lote.map(x => JSON.parse(JSON.stringify(x)));
    });
  }

  /** Aplica las respuestas: saca lo guardado, marca errores y devuelve a "esperando" lo que se reintenta. */
  function cerrar(lote, resultados, extra) {
    const porId = new Map(lote.map((x, k) => [x.id, resultados[k]]));
    modificar(a => {
      for (let i = a.length - 1; i >= 0; i--) {
        const x = a[i];
        if (!porId.has(x.id)) continue;
        const r = porId.get(x.id);
        if (r.ok) a.splice(i, 1);
        else if (r.reintentar) { x.estado = 'esperando'; x.error = ''; }
        else { x.estado = 'error'; x.error = mensaje(r.error); }
      }
    });
    emitir(Object.assign({ tipo: lote[0].tipo, resultados: lote.map((item, k) => ({ item, r: resultados[k] })) }, extra || {}));
  }

  async function enviar(lote) {
    const tipo = lote[0].tipo;
    try {
      if (tipo === 'borrar') {
        const res = await post({ accion: 'borrarVarios', items: lote.map(x => ({ fila: x.pedido.fila, huella: x.pedido.huella })) });
        if (!Array.isArray(res.resultados)) throw new Error('Acción desconocida');
        cerrar(lote, lote.map((x, k) => res.resultados[k] || { ok: false, error: 'Google no respondió por este reclamo.' }));
      } else if (tipo === 'reclasificar') {
        const res = await post({ accion: 'reclasificar', items: lote.map(x => ({ fila: x.pedido.fila, huella: x.pedido.huella, cambios: x.pedido.cambios })) });
        if (!Array.isArray(res.resultados)) throw new Error('Acción desconocida');
        const rs = lote.map((x, k) => res.resultados[k] || { ok: false, error: 'Google no respondió por este reclamo.' });
        if (rs.some(r => r.reintentar)) loteReclas = Math.max(LOTE_RECLAS_MIN, Math.floor(loteReclas / 2));
        else loteReclas = Math.min(LOTE_RECLAS_MAX, loteReclas + 10);   // anduvo bien: vuelve a crecer de a poco
        cerrar(lote, rs);
      } else if (tipo === 'actualizar' && lote.length > 1) {
        const res = await post({ accion: 'actualizarVarios', items: lote.map(x => ({ fila: x.pedido.fila, huella: x.pedido.huella, cambios: x.pedido.cambios })) });
        if (!Array.isArray(res.resultados)) throw new Error('Acción desconocida');
        loteAct = Math.min(LOTE_ACT_MAX, loteAct + 10);
        cerrar(lote, lote.map((x, k) => res.resultados[k] || { ok: false, error: 'Google no respondió por este reclamo.' }));
      } else if (tipo === 'actualizar') {
        const res = await post(Object.assign({ accion: 'actualizar' }, lote[0].pedido));
        cerrar(lote, [Object.assign({ ok: true }, res)]);
      } else {
        const res = await post({ accion: 'agregar', reclamo: lote[0].datos, idEnvio: lote[0].id });
        cerrar(lote, [Object.assign({ ok: true }, res)]);
      }
    } catch (err) {
      const msg = String(err && err.message || err);
      const deRed = /Failed to fetch|NetworkError|Load failed/.test(msg);
      const ocupada = /OCUPADO|bloqueo|lock/i.test(msg);
      if (ocupada && vecesOcupado < 12) {
        // Otro pedido (de esta u otra computadora) está guardando: no es un error del reclamo
        vecesOcupado++;
        pausa = 15000;
        cerrar(lote, lote.map(() => ({ ok: false, reintentar: true })), { silencioso: true });
      } else if (/Acción desconocida/.test(msg) && tipo === 'actualizar' && lote.length > 1) {
        sinLote = true;   // script anterior a la v12: se mandan de a uno
        cerrar(lote, lote.map(() => ({ ok: false, reintentar: true })), { silencioso: true });
      } else if (deRed && tipo === 'actualizar' && lote.length > 1 && loteAct > LOTE_ACT_MIN) {
        // Igual que con las reclasificaciones: tandas más chicas y se reintenta solo (repetir no cambia nada)
        loteAct = Math.max(LOTE_ACT_MIN, Math.floor(loteAct / 2));
        cerrar(lote, lote.map(() => ({ ok: false, reintentar: true })), { silencioso: true });
      } else if (deRed && tipo === 'reclasificar' && loteReclas > LOTE_RECLAS_MIN) {
        // Casi siempre es Google cortando un pedido largo: se reintenta solo con tandas más chicas
        loteReclas = Math.max(LOTE_RECLAS_MIN, Math.floor(loteReclas / 2));
        cerrar(lote, lote.map(() => ({ ok: false, reintentar: true })), { silencioso: true });
      } else {
        let m = msg;
        if (/Acción desconocida/.test(msg) && tipo === 'reclasificar') m = 'El script de Google es anterior a la versión 14: hay que actualizarlo para reclasificar.';
        else if (/Acción desconocida/.test(msg) && tipo === 'borrar') m = 'Para borrar reclamos hay que actualizar el script de Google (versión 31).';
        else if (deRed && tipo === 'agregar' && versionScript() < 17) {
          m = 'No se pudo conectar con la hoja. Puede que igual se haya guardado: fijate en Buscar antes de reintentar.';
        }
        cerrar(lote, lote.map(() => ({ ok: false, error: m })), { fallaGeneral: mensaje(m) });
      }
    }
  }

  /* ---------------- Pastilla en las otras páginas ---------------- */
  function estilos() {
    if (document.getElementById('saeColaEstilos')) return;
    const s = document.createElement('style');
    s.id = 'saeColaEstilos';
    s.textContent = `
      .sae-cola-pastilla{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9000;display:flex;align-items:center;gap:8px;
        max-width:calc(100vw - 32px);padding:8px 12px;border-radius:999px;font:600 13px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
        background:#fff;color:#1f2937;border:1px solid #d1d5db;box-shadow:0 4px 14px rgba(0,0,0,.15)}
      .sae-cola-pastilla.error{border-color:#f87171;background:#fef2f2;color:#7f1d1d}
      .sae-cola-pastilla.ok{border-color:#86efac;background:#f0fdf4;color:#14532d}
      .sae-cola-pastilla a,.sae-cola-pastilla button{font:inherit;color:inherit;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer}
      .sae-cola-giro{width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:saeColaGiro .8s linear infinite;flex:none}
      @keyframes saeColaGiro{to{transform:rotate(360deg)}}
      html.dark .sae-cola-pastilla{background:#1f2937;color:#e5e7eb;border-color:#374151}
      html.dark .sae-cola-pastilla.error{background:#3b1414;color:#fecaca;border-color:#7f1d1d}
      html.dark .sae-cola-pastilla.ok{background:#12301d;color:#bbf7d0;border-color:#166534}
      @media print{.sae-cola-pastilla{display:none!important}}`;
    document.head.appendChild(s);
  }
  let habiaPendientes = false, tOk = null;
  function pintarPastilla() {
    if (PAGINA === 'reclamos' || !document.body) return;   // en Reclamos se ve el recuadro de la página
    let el = document.getElementById('saeColaPastilla');
    const p = pendientes();
    if (!p.total) {
      if (habiaPendientes && el) {
        habiaPendientes = false;
        el.className = 'sae-cola-pastilla ok';
        el.innerHTML = '✅ Reclamos guardados en la hoja';
        clearTimeout(tOk);
        tOk = setTimeout(() => { if (!pendientes().total && el) el.remove(); }, 3000);
      } else if (!habiaPendientes && el && !tOk) el.remove();
      return;
    }
    habiaPendientes = true;
    clearTimeout(tOk); tOk = null;
    estilos();
    if (!el) {
      el = document.createElement('div');
      el.id = 'saeColaPastilla';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
      el.addEventListener('click', (ev) => { if (ev.target.closest('[data-reintentar]')) reintentar(); });
    }
    const link = `<a href="${BASE}reclamos.html">Ver</a>`;
    if (!clave()) {
      el.className = 'sae-cola-pastilla error';
      el.innerHTML = `⚠️ ${p.total} cambio${p.total === 1 ? '' : 's'} de reclamos sin guardar: abrí Reclamos para terminar · ${link}`;
    } else if (p.esperando) {
      el.className = 'sae-cola-pastilla';
      el.innerHTML = `<span class="sae-cola-giro" aria-hidden="true"></span> Guardando ${p.esperando} cambio${p.esperando === 1 ? '' : 's'} de reclamos…` +
        (p.errores ? ` · ⚠️ ${p.errores} con error` : '');
    } else {
      el.className = 'sae-cola-pastilla error';
      el.innerHTML = `⚠️ ${p.errores} cambio${p.errores === 1 ? '' : 's'} de reclamos sin guardar · <button type="button" data-reintentar>Reintentar</button> · ${link}`;
    }
  }

  /* ---------------- Al salir de la página ---------------- */
  window.addEventListener('beforeunload', (ev) => {
    const a = leer();
    // Solo se avisa si salir haría perder algo: el navegador no deja guardar, o un reclamo
    // nuevo está viajando con un script viejo (sin control de repetidos)
    const riesgo = (!persistente && a.length) ||
      (enVuelo.some(x => x.tipo === 'agregar') && versionScript() < 17);
    if (riesgo) { ev.preventDefault(); ev.returnValue = ''; }
  });
  window.addEventListener('online', () => programar(500));

  window.SAE_COLA = { leer, modificar, encolar, encolarActualizacion, quitar, reintentar, procesar, mensaje, pendientes,
    get enviando() { return ocupado; }, get persistente() { return persistente; } };

  // Al abrir cualquier página: si quedó algo pendiente, se sigue guardando
  const arrancar = () => { pintarPastilla(); programar(PAGINA === 'reclamos' ? 1200 : 2000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
