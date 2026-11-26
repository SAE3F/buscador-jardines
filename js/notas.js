/* ==========================================================================
 * (2.27.0) NOTAS DEL EQUIPO (solo en Reclamos)
 * Notas propias: "falta que tal proveedor traiga la factura", "hablar con la directora de…".
 * - Del equipo (por defecto): se guardan en la pestaña "NOTAS" de HOJA RECLAMOS (script v46), nunca en el
 *   Tablero, y se ven desde cualquier compu.
 * - "🔒 Solo en esta compu" (casilla que arranca siempre destildada): la nota queda en este navegador
 *   (localStorage) y no viaja al script.
 * Se pueden marcar como hechas (se tachan) y borrar (en la hoja queda "Borrada", no se elimina la fila).
 * ========================================================================== */
(function () {
  'use strict';
  const LS_LOCALES = 'sae-notas-locales';
  const LS_COPIA = 'sae-notas-copia';
  const LS_PLEGADA = 'sae-notas-plegada';
  const MIN_SCRIPT = 46;

  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin lugar: queda en memoria */ } };
  const leerJSON = (k, def) => { try { const v = JSON.parse(leerLS(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } };
  const pad2 = (n) => String(n).padStart(2, '0');
  const ahoraISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const nuevoId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function cuando(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/.exec(iso || '');
    if (!m) return '';
    const hoy = new Date();
    const esHoy = +m[1] === hoy.getFullYear() && +m[2] === hoy.getMonth() + 1 && +m[3] === hoy.getDate();
    return (esHoy ? 'hoy' : `${m[3]}/${m[2]}`) + (m[4] ? ` ${m[4]}:${m[5]}` : '');
  }
  function autorActual() {
    const ok = (t) => { try { const p = JSON.parse(t || 'null'); return p && (!p.exp || p.exp > Date.now()) ? p : null; } catch (e) { return null; } };
    let p = ok(leerLS('portal3f_sso_session'));
    if (!p) { try { p = ok(sessionStorage.getItem('portal3f_sso_session')); } catch (e) { /* nada */ } }
    p = p || window.PORTAL_3F_USER || null;
    return p ? String(p.nombre || p.email || '').split(' · ')[0].slice(0, 80) : '';
  }

  /* ------------------------------------------------------------ script */
  const urlScript = () => (typeof RECLAMOS_CONFIG !== 'undefined' && RECLAMOS_CONFIG.urlScript || '').trim();
  const prueba = () => (window.SAE_PRUEBA && window.SAE_PRUEBA.activo) ? '1' : '';
  async function leerRespuesta(r) {
    const texto = await r.text();
    let json;
    try { json = JSON.parse(texto); } catch (e) { throw new Error('Google respondió con una página de error.'); }
    if (window.SAE_SCRIPT_RESPONDIO) window.SAE_SCRIPT_RESPONDIO(json);
    if (!json.ok) throw new Error(json.error || 'Error desconocido');
    if ((json.version || 0) < MIN_SCRIPT || !Array.isArray(json.notas)) throw new Error('VIEJO');
    return json;
  }
  async function pedirNotas() {
    const u = urlScript();
    if (!u) throw new Error('SIN_URL');
    const r = await fetch(u + '?' + new URLSearchParams({ accion: 'notas', prueba: prueba() }).toString(), { redirect: 'follow' });
    return leerRespuesta(r);
  }
  async function enviar(cuerpo) {
    const u = urlScript();
    if (!u) throw new Error('SIN_URL');
    const r = await fetch(u, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ prueba: prueba() }, cuerpo)) });
    return leerRespuesta(r);
  }
  const textoError = (err) => {
    const m = String(err && err.message || err);
    if (m === 'VIEJO') return 'Para las notas del equipo hay que publicar el script versión 46.';
    if (m === 'SIN_URL') return 'Falta el link del script.';
    if (/Failed to fetch|NetworkError|Load failed/.test(m)) return 'Sin conexión con Google.';
    return m;
  };

  /* ------------------------------------------------------------ estado */
  const est = {
    equipo: leerJSON(LS_COPIA, []),        // última lista conocida del equipo (para mostrar algo al toque)
    locales: leerJSON(LS_LOCALES, []),
    cargando: false, error: '', viejo: false,
    verHechas: false, confirmar: '', ocupado: {},
    plegada: leerLS(LS_PLEGADA) === '1'
  };
  const guardarLocales = () => guardarLS(LS_LOCALES, JSON.stringify(est.locales));
  function recibir(json) {
    est.equipo = json.notas;
    est.error = ''; est.viejo = false;
    guardarLS(LS_COPIA, JSON.stringify(est.equipo));
  }
  async function refrescar() {
    if (est.cargando) return;
    est.cargando = true; pintar();
    try { recibir(await pedirNotas()); }
    catch (err) { est.error = textoError(err); est.viejo = String(err && err.message) === 'VIEJO'; }
    finally { est.cargando = false; pintar(); }
  }

  /* ------------------------------------------------------------ acciones */
  async function agregar(form) {
    const texto = form.querySelector('[name=texto]').value.trim();
    if (!texto) { form.querySelector('[name=texto]').focus(); return; }
    const nota = { id: nuevoId(), texto: texto.slice(0, 1000), escuela: form.querySelector('[name=escuela]').value.trim().slice(0, 120),
      proveedor: form.querySelector('[name=proveedor]').value, autor: autorActual() };
    const local = form.querySelector('[name=local]').checked;
    if (local) {
      est.locales.unshift(Object.assign({ creada: ahoraISO(), hecha: false, local: true }, nota));
      guardarLocales();
      limpiarForm(form);
      pintar();
      return;
    }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      recibir(await enviar({ accion: 'notaAgregar', nota }));
      limpiarForm(form);
    } catch (err) {
      est.error = 'No se pudo guardar la nota: ' + textoError(err) + ' (lo escrito sigue ahí: probá de nuevo).';
    } finally {
      btn.disabled = false; btn.textContent = 'Agregar';
      pintar();
    }
  }
  function limpiarForm(form) {
    form.reset();   // la casilla "solo en esta compu" vuelve a quedar destildada
    form.querySelector('[name=texto]').focus();
  }
  async function cambiarEstado(id, estado) {
    const loc = est.locales.find(n => n.id === id);
    if (loc) {
      if (estado === 'Borrada') est.locales = est.locales.filter(n => n.id !== id);
      else { loc.hecha = estado === 'Hecha'; loc.hechaEl = loc.hecha ? ahoraISO() : ''; }
      guardarLocales(); est.confirmar = ''; pintar();
      return;
    }
    est.ocupado[id] = true; est.confirmar = ''; pintar();
    try { recibir(await enviar({ accion: 'notaEstado', id, estado })); }
    catch (err) { est.error = 'No se pudo cambiar la nota: ' + textoError(err); }
    finally { delete est.ocupado[id]; pintar(); }
  }

  /* ------------------------------------------------------------ dibujo */
  function opcionesProveedores() {
    const set = new Set();
    try { (SAE_DATA.escuelas || []).forEach(e => (e.servicios || []).forEach(s => { const p = String(s.proveedor || '').trim().toUpperCase(); if (p && !/SIN|NO TIENE/.test(p)) set.add(p.replace(/\s+S\.?A\.?$/, '')); })); } catch (e) { /* nada */ }
    return [...set].sort();
  }
  function nombresEscuelas() {
    try { return (SAE_DATA.escuelas || []).map(e => e.nombre).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })); } catch (e) { return []; }
  }
  function filaNota(n) {
    const chips = [n.escuela ? `<span class="nt-chip">🏫 ${esc(n.escuela)}</span>` : '', n.proveedor ? `<span class="nt-chip">🚚 ${esc(n.proveedor)}</span>` : '',
      n.local ? '<span class="nt-chip nt-local" title="Solo se ve en esta compu">🔒 Solo esta compu</span>' : ''].join('');
    const meta = [n.autor, cuando(n.creada)].filter(Boolean).join(' · ') + (n.hecha && n.hechaEl ? ` · hecha ${cuando(n.hechaEl)}` : '');
    const ocup = !!est.ocupado[n.id];
    const borrar = est.confirmar === n.id
      ? `<span class="nt-conf">¿Borrar? <button type="button" class="nt-si" data-borrar-si="${esc(n.id)}">Sí</button><button type="button" class="nt-no" data-borrar-no>No</button></span>`
      : `<button type="button" class="nt-btn" data-borrar="${esc(n.id)}" title="Borrar la nota" aria-label="Borrar la nota"${ocup ? ' disabled' : ''}>🗑️</button>`;
    return `<li class="nt-nota${n.hecha ? ' hecha' : ''}${n.local ? ' local' : ''}">
      <label class="nt-check" title="${n.hecha ? 'Volver a pendiente' : 'Marcar como hecha'}"><input type="checkbox" data-hecha="${esc(n.id)}"${n.hecha ? ' checked' : ''}${ocup ? ' disabled' : ''}><span class="sr-only">Hecha</span></label>
      <div class="nt-cuerpo"><div class="nt-texto">${esc(n.texto)}</div>${chips || meta ? `<div class="nt-meta">${chips}<span>${esc(meta)}</span></div>` : ''}</div>
      <div class="nt-acc">${ocup ? '<span class="rec-spinner" aria-hidden="true"></span>' : ''}${borrar}</div></li>`;
  }
  function pintar() {
    const caja = $('recNotas');
    if (!caja) return;
    const todas = est.locales.concat(est.equipo).sort((a, b) => String(b.creada).localeCompare(String(a.creada)));
    const pend = todas.filter(n => !n.hecha), hechas = todas.filter(n => n.hecha);
    // lo que se está escribiendo no se pierde al redibujar
    const f0 = caja.querySelector('form.nt-form');
    const borrador = f0 ? { texto: f0.texto.value, escuela: f0.escuela.value, proveedor: f0.proveedor.value, local: f0.local.checked, foco: document.activeElement && f0.contains(document.activeElement) ? document.activeElement.name : '' } : null;
    caja.classList.toggle('plegada', est.plegada);
    caja.innerHTML = `
      <div class="nt-cab">
        <h2>📌 Notas del equipo <span class="nt-cuenta">${pend.length ? pend.length + ' pendiente' + (pend.length === 1 ? '' : 's') : 'sin pendientes'}</span></h2>
        <span class="nt-sub">Solo para el equipo: no van al Tablero.${est.cargando ? ' <span class="rec-spinner" aria-hidden="true"></span>' : ''}</span>
        <button type="button" class="nt-plegar" aria-expanded="${!est.plegada}" title="${est.plegada ? 'Mostrar' : 'Achicar'}">${est.plegada ? '▾' : '▴'}</button>
      </div>
      <div class="nt-cont"${est.plegada ? ' hidden' : ''}>
        ${est.error ? `<div class="nt-error">⚠️ ${esc(est.error)}${est.viejo ? '' : ' <button type="button" class="nt-link" data-reintentar>Reintentar</button>'}</div>` : ''}
        <form class="nt-form" autocomplete="off">
          <textarea name="texto" rows="1" maxlength="1000" placeholder="Escribí una nota… (Enter para agregar)" aria-label="Nota nueva"></textarea>
          <input name="escuela" list="ntEscuelas" placeholder="Escuela (opcional)" aria-label="Escuela (opcional)">
          <select name="proveedor" aria-label="Proveedor (opcional)"><option value="">Proveedor (opcional)</option>${opcionesProveedores().map(p => `<option>${esc(p)}</option>`).join('')}</select>
          <label class="nt-loc" title="La nota queda solo en este navegador: no la ve nadie más"><input type="checkbox" name="local"> 🔒 Solo en esta compu</label>
          <button type="submit" class="btn btn-primary btn-sm">Agregar</button>
          <datalist id="ntEscuelas">${nombresEscuelas().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        </form>
        ${pend.length ? `<ul class="nt-lista">${pend.map(filaNota).join('')}</ul>` : '<p class="nt-vacio">No hay notas pendientes.</p>'}
        ${hechas.length ? `<button type="button" class="nt-link nt-ver-hechas" aria-expanded="${est.verHechas}">${est.verHechas ? '▴ Ocultar' : '▾ Ver'} hechas (${hechas.length})</button>
          ${est.verHechas ? `<ul class="nt-lista nt-hechas">${hechas.map(filaNota).join('')}</ul>` : ''}` : ''}
      </div>`;
    const f = caja.querySelector('form.nt-form');
    if (borrador) {
      f.texto.value = borrador.texto; f.escuela.value = borrador.escuela; f.proveedor.value = borrador.proveedor; f.local.checked = borrador.local;
      if (borrador.foco && f[borrador.foco]) f[borrador.foco].focus();
    }
    autoAlto(f.texto);
  }
  function autoAlto(t) { if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 160) + 'px'; }

  function iniciar() {
    const tab = $('recTablero');
    if (!tab || $('recNotas')) return;
    const caja = document.createElement('section');
    caja.id = 'recNotas';
    caja.className = 'rec-notas';
    caja.setAttribute('aria-label', 'Notas del equipo');
    tab.insertAdjacentElement('afterend', caja);
    caja.addEventListener('submit', (ev) => { ev.preventDefault(); agregar(ev.target); });
    caja.addEventListener('input', (ev) => { if (ev.target.name === 'texto') autoAlto(ev.target); });
    caja.addEventListener('keydown', (ev) => {   // Enter guarda; Shift+Enter hace otro renglón
      if (ev.target.name === 'texto' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ev.target.form.requestSubmit(); }
    });
    caja.addEventListener('change', (ev) => {
      const id = ev.target.dataset && ev.target.dataset.hecha;
      if (id) cambiarEstado(id, ev.target.checked ? 'Hecha' : 'Pendiente');
    });
    caja.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.classList.contains('nt-plegar')) { est.plegada = !est.plegada; guardarLS(LS_PLEGADA, est.plegada ? '1' : '0'); pintar(); }
      else if (b.classList.contains('nt-ver-hechas')) { est.verHechas = !est.verHechas; pintar(); }
      else if (b.dataset.borrar) { est.confirmar = b.dataset.borrar; pintar(); }
      else if (b.dataset.borrarSi) cambiarEstado(b.dataset.borrarSi, 'Borrada');
      else if (b.hasAttribute('data-borrar-no')) { est.confirmar = ''; pintar(); }
      else if (b.hasAttribute('data-reintentar')) refrescar();
    });
    pintar();
    refrescar();
    // Se actualiza sola cada 3 minutos (si la pestaña se ve) y al volver a la pestaña
    setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('#recNotas form :focus')) refrescar(); }, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refrescar(); });
    // Otra pestaña de esta compu cambió las notas "solo en esta compu"
    window.addEventListener('storage', (ev) => { if (ev.key === LS_LOCALES) { est.locales = leerJSON(LS_LOCALES, []); pintar(); } });
  }
  window.SAE_NOTAS = { refrescar, _estado: est };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
