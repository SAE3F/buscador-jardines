/**
 * ==========================================================================
 * CUPOS: FRANJA DE TOTALES Y CAMBIO DE CUPO - cupos.js
 *  - Franja chica arriba (buscador y reclamos): por proveedor, cupo actual
 *    contra el límite de DM y comedor, con una barrita (ámbar desde el 95%,
 *    roja si pasa el límite). El "actual" lo calcula el script sumando los
 *    cupos de las escuelas el último día cargado; si la fila ACTUAL de la hoja
 *    dice otra cosa, se muestra al lado.
 *  - SAE_CUPOS.abrirCambio(escuela, servicio): ventana para cambiar el cupo de
 *    una escuela desde un día (con previa, control de límite y confirmación).
 *  - Botón 👁 para ver la clave en los campos con data-ver-clave.
 * Necesita js/sync.js (y el script de Google v11).
 * ==========================================================================
 */
const SAE_CUPOS = (function () {
  'use strict';
  const LS_PLEGADA = 'sae-cupos-franja-plegada';
  const LS_CLAVE = 'sae-reclamos-clave';
  const GRUPOS = [['DM', 'DM'], ['COMEDOR', 'Comedor'], ['BOLSON', 'Bolsón']];

  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nf = (n) => Number(n || 0).toLocaleString('es-AR');
  const pad = (n) => String(n).padStart(2, '0');
  const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const corta = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}` : (iso || ''); };
  const larga = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || ''); };
  const titulo = (t) => String(t || '').toLowerCase().replace(/(^|[\s.])\S/g, x => x.toUpperCase());
  const hay = () => typeof SAE_SYNC !== 'undefined';

  /* ------------------------------------------------------------- estilos */
  const CSS = `
  .sae-cupos-franja { --cf-fondo: #f4f7fb; --cf-borde: #d9e1ec; --cf-texto: #1e293b; --cf-suave: #5b6b80; --cf-pista: #dde5ef;
    --cf-ok: #2a78d6; --cf-alerta: #d18a00; --cf-pasado: #c62f2f;
    display: flex; align-items: center; flex-wrap: wrap; gap: 6px 18px; background: var(--cf-fondo); color: var(--cf-texto);
    border: 1px solid var(--cf-borde); border-radius: 12px; padding: 7px 12px; margin: 0 0 14px; font: 500 .8rem/1.3 'Inter', system-ui, sans-serif; }
  html.dark .sae-cupos-franja { --cf-fondo: #1a2433; --cf-borde: #2d3b50; --cf-texto: #e2e8f0; --cf-suave: #9fb0c6; --cf-pista: #33445c;
    --cf-ok: #5a9ee8; --cf-alerta: #e6a532; --cf-pasado: #ef6b6b; }
  .sae-cupos-franja .cf-tit { font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
  .sae-cupos-franja .cf-tit small { font-weight: 500; color: var(--cf-suave); }
  .sae-cupos-franja .cf-prueba { background: #fde7c2; color: #6b4300; border-radius: 6px; padding: 1px 6px; font-size: .7rem; font-weight: 700; }
  html.dark .sae-cupos-franja .cf-prueba { background: #4a3812; color: #fde7c2; }
  .sae-cupos-franja .cf-prov { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sae-cupos-franja .cf-prov > b { font-weight: 700; }
  .sae-cupos-franja .cf-g { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
  .sae-cupos-franja .cf-g .cf-n { font-variant-numeric: tabular-nums; }
  .sae-cupos-franja .cf-g .cf-hoja { color: var(--cf-suave); font-size: .72rem; }
  .sae-cupos-franja .cf-barra { width: 46px; height: 6px; background: var(--cf-pista); border-radius: 3px; overflow: hidden; display: inline-block; }
  .sae-cupos-franja .cf-barra i { display: block; height: 100%; background: var(--cf-ok); border-radius: 3px; }
  .sae-cupos-franja .cf-g.alerta .cf-barra i { background: var(--cf-alerta); }
  .sae-cupos-franja .cf-g.pasado .cf-barra i { background: var(--cf-pasado); }
  .sae-cupos-franja .cf-g.pasado .cf-pct { color: var(--cf-pasado); font-weight: 700; }
  .sae-cupos-franja .cf-g.alerta .cf-pct { font-weight: 700; }
  .sae-cupos-franja .cf-pct { color: var(--cf-suave); font-size: .74rem; }
  .sae-cupos-franja .cf-plegar { margin-left: auto; background: none; border: 1px solid var(--cf-borde); color: var(--cf-suave); border-radius: 7px;
    padding: 1px 8px; cursor: pointer; font: 600 .74rem 'Inter', system-ui, sans-serif; }
  .sae-cupos-franja .cf-plegar:hover, .sae-cupos-franja .cf-plegar:focus-visible { color: var(--cf-texto); border-color: var(--cf-suave); outline: none; }
  .sae-cupos-franja.plegada { padding: 4px 12px; }
  @media print { .sae-cupos-franja { display: none !important; } }

  /* Botón del cupo en la ficha */
  .sae-cupo-editar { margin-top: 4px; background: none; border: 1px dashed currentColor; color: inherit; opacity: .75; border-radius: 6px;
    padding: 1px 6px; font: 600 .7rem 'Inter', system-ui, sans-serif; cursor: pointer; }
  .sae-cupo-editar:hover, .sae-cupo-editar:focus-visible { opacity: 1; outline: none; border-style: solid; }

  /* Ventana de cambio de cupo */
  .sae-cc-fondo { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 99990; display: flex; align-items: center; justify-content: center; padding: 14px; }
  .sae-cc { background: #fff; color: #0f172a; width: 100%; max-width: 470px; max-height: 92vh; overflow: auto; border-radius: 14px; padding: 18px 18px 14px;
    box-shadow: 0 20px 50px rgba(0,0,0,.35); font: 400 .88rem/1.45 'Inter', system-ui, sans-serif; }
  html.dark .sae-cc { background: #1e293b; color: #e2e8f0; }
  .sae-cc h3 { margin: 0 0 2px; font-size: 1.05rem; }
  .sae-cc .cc-sub { margin: 0 0 12px; font-size: .8rem; opacity: .75; }
  .sae-cc label { display: block; font-weight: 600; font-size: .8rem; margin: 10px 0 4px; }
  .sae-cc input, .sae-cc select { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; background: #fff; color: inherit; }
  html.dark .sae-cc input, html.dark .sae-cc select { background: #0f172a; border-color: #334155; }
  .sae-cc .cc-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sae-cc .cc-actual { font-size: .8rem; opacity: .8; margin-top: 4px; }
  .sae-cc .cc-previa { margin-top: 12px; border-radius: 10px; padding: 10px 12px; background: #f1f5f9; font-size: .84rem; }
  html.dark .sae-cc .cc-previa { background: #0f172a; }
  .sae-cc .cc-previa p { margin: 0 0 6px; }
  .sae-cc .cc-previa p:last-child { margin-bottom: 0; }
  .sae-cc .cc-alerta { color: #8a5300; font-weight: 600; }
  html.dark .sae-cc .cc-alerta { color: #f3c063; }
  .sae-cc .cc-error { color: #b42318; font-weight: 600; }
  html.dark .sae-cc .cc-error { color: #ff8a80; }
  .sae-cc .cc-ok { color: #11743f; font-weight: 600; }
  html.dark .sae-cc .cc-ok { color: #5fd49a; }
  .sae-cc .cc-check { display: flex; gap: 8px; align-items: flex-start; font-weight: 500; margin-top: 6px; }
  .sae-cc .cc-check input { width: auto; margin-top: 3px; }
  .sae-cc .cc-prueba { font-size: .76rem; background: #fde7c2; color: #6b4300; border-radius: 8px; padding: 4px 8px; margin: 0 0 8px; }
  .sae-cc .cc-pie { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; flex-wrap: wrap; }
  .sae-cc .cc-btn { border-radius: 9px; padding: 8px 14px; font: 600 .85rem 'Inter', system-ui, sans-serif; cursor: pointer; border: 1px solid #cbd5e1; background: transparent; color: inherit; }
  .sae-cc .cc-btn.primario { background: #16365f; border-color: #16365f; color: #fff; }
  .sae-cc .cc-btn:disabled { opacity: .5; cursor: default; }
  html.dark .sae-cc .cc-btn { border-color: #475569; }
  html.dark .sae-cc .cc-btn.primario { background: #2a78d6; border-color: #2a78d6; }

  /* Ver clave */
  .sae-clave-envoltura { position: relative; display: block; flex: 1; min-width: 0; }
  .sae-clave-envoltura input { width: 100%; padding-right: 40px !important; box-sizing: border-box; }
  .sae-ver-clave { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;
    font-size: 1rem; padding: 4px 6px; border-radius: 6px; line-height: 1; opacity: .7; color: inherit; }
  .sae-ver-clave:hover, .sae-ver-clave:focus-visible { opacity: 1; outline: 2px solid #2a78d6; outline-offset: 0; }`;
  function asegurarEstilos() {
    if (document.getElementById('saeCuposCSS')) return;
    const st = document.createElement('style');
    st.id = 'saeCuposCSS';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------------------------------------------------------- ver clave */
  /** Agrega un botón 👁 que muestra u oculta lo escrito en un campo de clave. */
  function botonVerClave(input) {
    if (!input || input.dataset.conOjo) return;
    asegurarEstilos();
    input.dataset.conOjo = '1';
    const env = document.createElement('span');
    env.className = 'sae-clave-envoltura';
    input.parentNode.insertBefore(env, input);
    env.appendChild(input);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sae-ver-clave';
    const pintar = () => {
      const visible = input.type === 'text';
      b.textContent = visible ? '🙈' : '👁';
      b.title = visible ? 'Ocultar la clave' : 'Mostrar la clave';
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', visible ? 'true' : 'false');
    };
    b.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; pintar(); input.focus(); });
    env.appendChild(b);
    pintar();
  }

  /* -------------------------------------------------------------- franja */
  function contenedorFranja() {
    let caja = document.getElementById('saeCuposFranja');
    if (caja) return caja;
    const main = document.querySelector('main');
    if (!main) return null;
    caja = document.createElement('section');
    caja.id = 'saeCuposFranja';
    caja.className = 'sae-cupos-franja';
    caja.setAttribute('aria-label', 'Cupos por proveedor');
    // Debajo del cartel de avisos, si está
    const avisos = document.getElementById('saeAvisos');
    if (avisos && avisos.parentNode === main) main.insertBefore(caja, avisos.nextSibling);
    else main.insertBefore(caja, main.firstChild);
    return caja;
  }

  function pintarFranja() {
    if (!hay()) return;
    asegurarEstilos();
    const lim = SAE_SYNC.limites();
    const caja = contenedorFranja();
    if (!caja) return;
    const provs = lim && Array.isArray(lim.proveedores)
      ? lim.proveedores.filter(p => GRUPOS.some(([g]) => p.grupos[g] && p.grupos[g].limite)) : [];
    if (!provs.length) { caja.style.display = 'none'; return; }
    caja.style.display = '';
    const plegada = leerLS(LS_PLEGADA) === '1';
    caja.classList.toggle('plegada', plegada);
    const prueba = (SAE_SYNC.estado().cuposOrigen === 'prueba') ? '<span class="cf-prueba" title="Los cupos se leen y se cambian en la copia de prueba (HOJA RECLAMOS)">hoja de prueba</span>' : '';
    const cab = `<span class="cf-tit">👥 Cupos${lim.dia ? ` <small>al ${corta(lim.dia)}</small>` : ''}${prueba}</span>`;
    const boton = `<button type="button" class="cf-plegar" aria-expanded="${plegada ? 'false' : 'true'}" title="${plegada ? 'Mostrar' : 'Achicar'} los cupos por proveedor">${plegada ? 'Ver ▾' : '▴'}</button>`;
    if (plegada) {
      const alerta = provs.some(p => GRUPOS.some(([g]) => p.grupos[g] && p.grupos[g].limite && p.grupos[g].actual > p.grupos[g].limite));
      caja.innerHTML = cab + (alerta ? '<span class="cf-g pasado"><span class="cf-pct">⚠ un proveedor pasa su límite</span></span>' : '') + boton;
    } else {
      caja.innerHTML = cab + provs.map(p => `<span class="cf-prov"><b>${esc(titulo(p.proveedor))}</b>` + GRUPOS.map(([g, nombre]) => {
        const d = p.grupos[g];
        if (!d || !d.limite) return '';
        const pct = Math.round(d.actual / d.limite * 100);
        const clase = d.actual > d.limite ? 'pasado' : pct >= 95 ? 'alerta' : '';
        const difiere = d.actualHoja != null && d.actualHoja !== d.actual;
        const tip = `${titulo(p.proveedor)} · ${nombre}: ${nf(d.actual)} de ${nf(d.limite)} (${pct}%).\n` +
          `Suma de los cupos de las escuelas${lim.dia ? ' al ' + larga(lim.dia) : ''}.` +
          (difiere ? `\nEn la hoja (fila ${g} ACTUAL) figura ${nf(d.actualHoja)}.` : '') +
          (d.actual > d.limite ? `\nPasa el límite por ${nf(d.actual - d.limite)}.` : `\nMargen: ${nf(d.limite - d.actual)}.`);
        return `<span class="cf-g ${clase}" title="${esc(tip)}">${nombre} <span class="cf-barra" aria-hidden="true"><i style="width:${Math.min(100, pct)}%"></i></span>` +
          `<span class="cf-n">${nf(d.actual)} / ${nf(d.limite)}</span> <span class="cf-pct">${d.actual > d.limite ? '⚠ ' : ''}${pct}%</span>` +
          (difiere ? ` <span class="cf-hoja">(hoja: ${nf(d.actualHoja)})</span>` : '') + `</span>`;
      }).join('') + `</span>`).join('') + boton;
    }
    caja.querySelector('.cf-plegar').addEventListener('click', () => { guardarLS(LS_PLEGADA, plegada ? null : '1'); pintarFranja(); });
  }

  /* -------------------------------------------------- ventana cambio cupo */
  function cupoEnFecha(servicio, fechaISO) {
    if (typeof SAE_MENUS !== 'undefined' && SAE_MENUS.cupoEnFecha) {
      try { return Math.round(SAE_MENUS.cupoEnFecha(servicio, fechaISO)); } catch (e) { /* nada */ }
    }
    const c = servicio.cupos || {};
    const fechas = Object.keys(c).filter(f => f <= fechaISO).sort();
    return fechas.length ? c[fechas[fechas.length - 1]] : 0;
  }

  function mensajeError(err) {
    const m = String(err && err.message || err);
    if (m.includes('CLAVE_INCORRECTA')) return 'CLAVE';
    if (/Acción desconocida/.test(m)) return 'El script de Google todavía es una versión anterior: para cambiar cupos hay que pegar el Codigo.gs nuevo (versión 11) y volver a implementarlo.';
    return hay() ? SAE_SYNC.mensajeError(err) : m;
  }

  /**
   * Abre la ventana para cambiar un cupo.
   * escuela: objeto de SAE_DATA.escuelas · servicio: nombre del servicio a elegir primero (opcional)
   */
  function abrirCambio(escuela, servicioInicial, fechaInicial) {
    if (!escuela || !hay()) return;
    asegurarEstilos();
    const servicios = (escuela.servicios || []).filter(s => s && s.servicio);
    if (!servicios.length) { alert('Esta escuela no tiene servicios cargados en la hoja de cupos.'); return; }
    if (!SAE_SYNC.hayScript()) { alert('Falta configurar el link del script (reclamos-config.js).'); return; }
    const fondo = document.createElement('div');
    fondo.className = 'sae-cc-fondo';
    fondo.innerHTML = `<div class="sae-cc" role="dialog" aria-modal="true" aria-labelledby="ccTitulo">
      <h3 id="ccTitulo">✏️ Cambiar cupo · ${esc(escuela.nombre)}</h3>
      <p class="cc-sub">Se escribe en la hoja de cupos desde el día que elijas y queda anotado en "CAMBIOS CUPOS".</p>
      ${SAE_SYNC.estado().cuposOrigen === 'prueba' ? '<p class="cc-prueba">🧪 Se guarda en la <strong>hoja de prueba</strong> (Copia de CUPOS 2026), no en el Tablero real.</p>' : ''}
      <label for="ccServicio">Servicio</label>
      <select id="ccServicio">${servicios.map((s, i) => `<option value="${i}">${esc(s.servicio)}${s.proveedor ? ' · ' + esc(titulo(s.proveedor)) : ''}</option>`).join('')}</select>
      <div class="cc-actual" id="ccActual"></div>
      <div class="cc-fila">
        <div><label for="ccValor">Nuevo cupo</label><input type="number" id="ccValor" min="0" step="1" inputmode="numeric" placeholder="Ej: 120"></div>
        <div><label for="ccDesde">Desde el día</label><input type="date" id="ccDesde"></div>
      </div>
      <div id="ccClaveCaja" style="display:none;"><label for="ccClave">Clave del equipo</label><input type="password" id="ccClave" autocomplete="off" placeholder="La misma de Reclamos"></div>
      <div class="cc-previa" id="ccPrevia" style="display:none;" aria-live="polite"></div>
      <div class="cc-pie">
        <button type="button" class="cc-btn" data-cc="cancelar">Cancelar</button>
        <button type="button" class="cc-btn primario" data-cc="revisar">Revisar cambio</button>
        <button type="button" class="cc-btn primario" data-cc="guardar" style="display:none;">Confirmar y guardar</button>
      </div></div>`;
    document.body.appendChild(fondo);
    const $c = (id) => fondo.querySelector('#' + id);
    const bRevisar = fondo.querySelector('[data-cc="revisar"]'), bGuardar = fondo.querySelector('[data-cc="guardar"]');
    const previa = $c('ccPrevia');
    let ultimaPrevia = null, ocupado = false;

    const idxInicial = Math.max(0, servicios.findIndex(s => s.servicio === servicioInicial));
    $c('ccServicio').value = String(idxInicial);
    $c('ccDesde').value = fechaInicial || hoyISO();
    botonVerClave($c('ccClave'));
    if (!SAE_SYNC.hayClave()) $c('ccClaveCaja').style.display = '';

    const servicio = () => servicios[Number($c('ccServicio').value)] || servicios[0];
    function pintarActual() {
      const f = $c('ccDesde').value || hoyISO();
      $c('ccActual').textContent = `Cupo cargado al ${larga(f)}: ${nf(cupoEnFecha(servicio(), f))}`;
    }
    function invalidar() {
      ultimaPrevia = null;
      bGuardar.style.display = 'none';
      bRevisar.style.display = '';
      previa.style.display = 'none';
      pintarActual();
    }
    ['ccServicio', 'ccValor', 'ccDesde'].forEach(id => { $c(id).addEventListener('input', invalidar); $c(id).addEventListener('change', invalidar); });
    pintarActual();
    setTimeout(() => $c('ccValor').focus(), 30);

    function cerrar() { document.removeEventListener('keydown', tecla, true); fondo.remove(); }
    const tecla = (ev) => {
      if (ev.key === 'Escape' && !ocupado) { ev.stopPropagation(); cerrar(); }
      if (ev.key === 'Enter' && ev.target && ev.target.tagName === 'INPUT' && !ocupado) {
        ev.preventDefault();
        (bGuardar.style.display !== 'none' ? bGuardar : bRevisar).click();
      }
    };
    document.addEventListener('keydown', tecla, true);
    fondo.addEventListener('click', (ev) => { if (ev.target === fondo && !ocupado) cerrar(); });
    fondo.querySelector('[data-cc="cancelar"]').addEventListener('click', () => { if (!ocupado) cerrar(); });

    function mostrar(html) { previa.innerHTML = html; previa.style.display = ''; }
    function cuerpo(accion) {
      const s = servicio();
      return { accion, escuela: escuela.nombre, alias: escuela.alias || [], servicio: s.servicio,
        valor: $c('ccValor').value.trim(), desde: $c('ccDesde').value };
    }
    function prepararClave() {
      const clave = $c('ccClave').value.trim();
      if (clave) guardarLS(LS_CLAVE, clave);
    }
    function errorDe(err) {
      const m = mensajeError(err);
      if (m === 'CLAVE') {
        $c('ccClaveCaja').style.display = '';
        $c('ccClave').focus();
        return '🔐 La clave no es correcta o falta. Escribila (es la misma de Reclamos) y volvé a intentar.';
      }
      return '⚠️ ' + m;
    }

    bRevisar.addEventListener('click', async () => {
      const valor = $c('ccValor').value.trim();
      if (valor === '' || !/^\d+$/.test(valor)) { mostrar('<p class="cc-error">Escribí el nuevo cupo (un número entero, 0 o más).</p>'); $c('ccValor').focus(); return; }
      if (!$c('ccDesde').value) { mostrar('<p class="cc-error">Elegí desde qué día rige.</p>'); return; }
      prepararClave();
      const v = SAE_SYNC.versionScript();
      if (v && v < 11) { mostrar(`<p class="cc-error">${esc(mensajeError(new Error('Acción desconocida')))}</p>`); return; }
      ocupado = true; bRevisar.disabled = true;
      mostrar('<p>Revisando en la hoja…</p>');
      try {
        const r = await SAE_SYNC.enviar(cuerpo('cupoPrevia'));
        if (!r.escuela || r.valor === undefined) throw new Error('Acción desconocida');   // script anterior a la v11
        ultimaPrevia = r;
        let html = `<p><strong>${esc(r.escuela)} · ${esc(r.servicio)}</strong>${r.proveedor ? ' (' + esc(titulo(r.proveedor)) + ')' : ''}: ` +
          `<strong>${r.antes == null ? 'sin cupo' : nf(r.antes)} → ${nf(r.valor)}</strong></p>`;
        if (r.desde === r.hasta) html += `<p>Se cambia solo el <strong>${larga(r.desde)}</strong>${r.ultimoDia && r.desde > r.ultimoDia ? ` (la hoja tiene días cargados hasta el ${larga(r.ultimoDia)}; los siguientes los completan ustedes como siempre)` : ''}.</p>`;
        else html += `<p>Se cambian <strong>${r.dias} ${r.dias === 1 ? 'día' : 'días'}</strong>: del ${larga(r.desde)} al ${larga(r.hasta)} (último día cargado). Los días vacíos no se tocan.</p>`;
        if (r.desde !== $c('ccDesde').value) html += `<p class="cc-alerta">El ${larga($c('ccDesde').value)} no tiene cupos cargados (fin de semana o feriado): rige desde el ${larga(r.desde)}.</p>`;
        if (r.antes === r.valor) html += '<p class="cc-alerta">Es el mismo cupo que ya tiene.</p>';
        if (r.especiales && r.especiales.length) {
          const lista = r.especiales.slice(0, 4).map(e => `${corta(e.fecha)} (${esc(e.valor)})`).join(', ') + (r.especiales.length > 4 ? ` y ${r.especiales.length - 4} más` : '');
          html += `<p class="cc-alerta">⚠️ ${r.especiales.length === 1 ? 'Un día tiene' : r.especiales.length + ' días tienen'} una nota o fórmula en la celda: ${lista}.</p>` +
            `<label class="cc-check"><input type="checkbox" id="ccPisar"> Reemplazar también ${r.especiales.length === 1 ? 'esa celda' : 'esas celdas'} por ${nf(r.valor)} (si no, quedan como están)</label>`;
        }
        if (r.limite) {
          const L = r.limite, pct = Math.round(L.despues / L.limite * 100);
          const clase = L.despues > L.limite ? 'cc-error' : pct >= 95 ? 'cc-alerta' : '';
          html += `<p class="${clase}">${L.despues > L.limite ? '⚠️ ' : ''}${esc(titulo(L.proveedor))} · ${L.grupo === 'DM' ? 'DM' : titulo(L.grupo)} quedaría en ` +
            `<strong>${nf(L.despues)} de ${nf(L.limite)}</strong> (${pct}%)${L.despues > L.limite ? ': <strong>pasa el límite</strong> por ' + nf(L.despues - L.limite) : ''}.</p>`;
        }
        if (!r.dias && !(r.especiales && r.especiales.length)) html += '<p class="cc-error">No hay ningún día para cambiar.</p>';
        mostrar(html);
        bRevisar.style.display = 'none';
        bGuardar.style.display = '';
        bGuardar.disabled = !r.dias && !(r.especiales && r.especiales.length);
        $c('ccClaveCaja').style.display = SAE_SYNC.hayClave() ? 'none' : '';
        bGuardar.focus();
      } catch (err) {
        mostrar(`<p class="cc-error">${esc(errorDe(err))}</p>`);
      } finally {
        ocupado = false; bRevisar.disabled = false;
      }
    });

    bGuardar.addEventListener('click', async () => {
      if (!ultimaPrevia) return;
      prepararClave();
      const pisar = !!(fondo.querySelector('#ccPisar') && fondo.querySelector('#ccPisar').checked);
      ocupado = true; bGuardar.disabled = true;
      const anterior = previa.innerHTML;
      mostrar(anterior + '<p>Guardando…</p>');
      try {
        const r = await SAE_SYNC.enviar(Object.assign(cuerpo('cupoGuardar'), { antes: ultimaPrevia.antes, especiales: pisar ? 'pisar' : 'saltear' }));
        if (!r.guardado) { mostrar(`<p class="cc-alerta">${esc(r.mensaje || 'No se cambió nada.')}</p>`); ocupado = false; return; }
        mostrar(`<p class="cc-ok">✅ Listo: ${esc(r.escuela)} · ${esc(r.servicio)} ahora tiene ${nf(r.valor)} desde el ${larga(r.desde)} (${r.dias} ${r.dias === 1 ? 'día' : 'días'}).</p><p>Actualizando los datos de la página…</p>`);
        bGuardar.style.display = 'none';
        fondo.querySelector('[data-cc="cancelar"]').textContent = 'Cerrar';
        ocupado = false;
        try { await SAE_SYNC.sincronizar(); mostrar(previa.innerHTML.replace('<p>Actualizando los datos de la página…</p>', '<p>La página ya muestra el cupo nuevo.</p>')); }
        catch (e) { mostrar(previa.innerHTML.replace('<p>Actualizando los datos de la página…</p>', '<p class="cc-alerta">Se guardó en la hoja, pero no se pudo actualizar la página. Tocá "Sincronizar".</p>')); }
      } catch (err) {
        mostrar(anterior + `<p class="cc-error">${esc(errorDe(err))}</p>`);
        bGuardar.disabled = false;
        ocupado = false;
      }
    });
  }

  /* --------------------------------------------------------------- inicio */
  function iniciar() {
    document.querySelectorAll('input[data-ver-clave]').forEach(botonVerClave);
    if (!document.body.hasAttribute('data-sin-franja-cupos')) {
      pintarFranja();
      window.addEventListener('sae-datos-actualizados', pintarFranja);
      // Se piden los datos una vez por sesión si faltan los límites (datos guardados de antes de la v11)
      // o, en Reclamos (que no sincroniza sola), si tienen más de 30 minutos.
      const sinAuto = window.SAE_SYNC_AUTO === false;
      const ultima = Number(leerLS('sae-sync-ultima')) || 0;
      const faltan = !SAE_SYNC.limites() && (sinAuto || SAE_SYNC.versionScript() >= 11);
      const viejos = sinAuto && Date.now() - ultima > 30 * 60 * 1000;
      if (hay() && SAE_SYNC.hayScript() && (faltan || viejos)) {
        let pedido = null;
        try { pedido = sessionStorage.getItem('sae-cupos-limites-pedidos'); sessionStorage.setItem('sae-cupos-limites-pedidos', '1'); } catch (e) { /* nada */ }
        if (!pedido) SAE_SYNC.sincronizar().catch(() => { /* nada */ });
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  return { abrirCambio, pintarFranja, botonVerClave };
})();
if (typeof window !== 'undefined') window.SAE_CUPOS = SAE_CUPOS;
