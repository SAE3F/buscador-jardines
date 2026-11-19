/**
 * ==========================================================================
 * VISITAS TERRITORIALES - visitas.js  (2.20.0 · script v41)
 * Lo comparten el Buscador (compu y celular) y la página Visitas:
 *  - trae las visitas de la hoja "VISITAS TERRITORIALES 2026" del Tablero (copia en el navegador);
 *  - "Nueva visita": formulario con las columnas de la hoja y sus desplegables
 *    (Fecha, Escuela, Zona, Dirección, Localidad, Maps, Categoría, Motivo, Equipo encargado,
 *    Directivos SI/NO, Observación y Estado: Realizada / Planificada);
 *    (2.21.2) el Motivo se elige según la Categoría (lista MOTIVOS) y el Equipo se escribe
 *    (2.22.0 el ejemplo del Equipo rota entre los nombres de EJEMPLO_EQUIPO);
 *  - en la ficha de la escuela: "Última visita … · Próxima … · Ver todas".
 * Uso: SAE_VISITAS.cargar(), .deEscuela(nombre), .abrirFormulario({ escuela, visita }), .pintarFicha(cont, escuela)
 * ==========================================================================
 */
const SAE_VISITAS = (function () {
  'use strict';
  const LS = 'sae-visitas-v1';
  const FRESCA_MS = 5 * 60 * 1000;
  const VERSION_SCRIPT = 41;
  const CATEGORIAS = ['INSPECCION DMC', 'MANTENIMIENTO', 'TALLER', 'URGENCIA', 'VISITA PBA', 'OTROS'];   // sin CAJAS
  const OTRO = '__otro__';
  /** (2.21.2) Motivos de cada categoría (lista fija; "Otro" para escribir uno distinto). */
  const MOTIVOS = {
    'INSPECCION DMC': ['Ver menú / consumo', 'Calidad del pan', 'Calidad de mercadería', 'Reclamos al proveedor', 'Menú festivo', 'Menú celíacos', 'Relevamiento comedor'],
    'MANTENIMIENTO': ['Entrega de anafe', 'Retiro de anafe', 'Termotanque', 'Heladera', 'Cocina / horno'],
    'TALLER': ['Charla de alimentación saludable', 'Charla de nutrición'],
    'URGENCIA': ['Faltante de mercadería', 'Problema sanitario (plagas, olor a gas, etc.)', 'Entrega urgente'],
    'VISITA PBA': ['Visita con PBA'],
    'OTROS': ['Entrega de utensilios', 'Entrega de pava', 'Llevar mercadería', 'Visita de seguimiento']
  };
  const valorMotivo = (m) => String(m || '').trim().toUpperCase();
  /** (2.22.0) Ejemplo del campo "Equipo encargado": va rotando cada vez que se abre el formulario. */
  const EJEMPLO_EQUIPO = ['Paula', 'Gime', 'Layla', 'Thomy', 'Mati'];
  function ejemploEquipo() {
    let i = Number(leerLS('sae-vis-ejemplo')) || 0;
    if (!(i >= 0)) i = 0;
    guardarLS('sae-vis-ejemplo', String((i + 1) % EJEMPLO_EQUIPO.length));
    const n = EJEMPLO_EQUIPO.length;
    return `Quién fue (ej.: ${EJEMPLO_EQUIPO[i % n]} y ${EJEMPLO_EQUIPO[(i + 1) % n]})`;
  }

  let datos = null;        // { visitas, opciones, guardado }
  let pidiendo = null;

  /* ------------------------------------------------------------ utilidades */
  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
  const pad = (n) => String(n).padStart(2, '0');
  const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  /** "2026-03-05" → "05/03/2026" · "2026-03" → "mar 2026" · '' → "sin fecha" */
  function fechaTxt(iso) {
    if (!iso) return 'sin fecha';
    const p = iso.split('-');
    if (p.length === 2) return `${MESES[Number(p[1]) - 1] || p[1]} ${p[0]}`;
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  const capital = (t) => String(t || '').toLowerCase().replace(/(^|[\s/])\S/g, x => x.toUpperCase());
  const etqCategoria = (c) => ({ 'INSPECCION DMC': 'Inspección DMC', 'VISITA PBA': 'Visita PBA' }[String(c || '').toUpperCase()] || capital(c));

  function escuelasBuscador() { return (typeof SAE_DATA !== 'undefined' && SAE_DATA.escuelas) ? SAE_DATA.escuelas : []; }
  /** La escuela del buscador que corresponde a un nombre de la hoja (con alias). */
  function escuelaDe(nombre) {
    try { if (typeof SAE_SYNC !== 'undefined' && SAE_SYNC.buscarEscuela) { const e = SAE_SYNC.buscarEscuela(nombre); if (e) return e; } } catch (e) { /* nada */ }
    const k = norm(nombre);
    return escuelasBuscador().find(e => norm(e.nombre) === k || (e.alias || []).some(a => norm(a) === k)) || null;
  }

  /* ------------------------------------------------------------ datos */
  function leerCopia() {
    if (datos) return datos;
    try { const c = JSON.parse(leerLS(LS) || 'null'); if (c && Array.isArray(c.visitas)) datos = c; } catch (e) { /* nada */ }
    return datos;
  }
  function avisar() { try { window.dispatchEvent(new CustomEvent('sae-visitas-actualizadas')); } catch (e) { /* nada */ } }
  /** Trae las visitas (si la copia tiene menos de 5 minutos, usa la copia). Error 'SCRIPT_VIEJO' si el script es anterior a la v41. */
  async function cargar(forzar) {
    const c = leerCopia();
    if (!forzar && c && Date.now() - (c.guardado || 0) < FRESCA_MS) return c;
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) { if (c) return c; throw new Error('SIN_URL'); }
    if (pidiendo) return pidiendo;
    pidiendo = (async () => {
      const r = await SAE_SYNC.pedir('visitas', forzar ? { forzar: '1' } : {});
      if (!Array.isArray(r.visitas)) throw new Error('SCRIPT_VIEJO');
      datos = { visitas: r.visitas, opciones: r.opciones || {}, hoja: r.hoja || '', guardado: Date.now() };
      guardarLS(LS, JSON.stringify(datos));
      avisar();
      return datos;
    })().finally(() => { pidiendo = null; });
    try { return await pidiendo; }
    catch (e) {
      if ((SAE_SYNC.versionScript() || 0) && SAE_SYNC.versionScript() < VERSION_SCRIPT) throw new Error('SCRIPT_VIEJO');
      if (c) return c;
      throw e;
    }
  }
  function mensajeError(e) {
    const m = String(e && e.message || e);
    if (m === 'SCRIPT_VIEJO' || /Acción desconocida/.test(m)) return `Para usar Visitas hay que actualizar el script de Google (versión ${VERSION_SCRIPT}).`;
    if (m === 'SIN_URL') return 'Falta configurar el link del script (datos/reclamos-config.js).';
    return (typeof SAE_SYNC !== 'undefined' && SAE_SYNC.mensajeError) ? SAE_SYNC.mensajeError(e) : m;
  }
  const lista = () => (leerCopia() || {}).visitas || [];
  const opciones = () => (leerCopia() || {}).opciones || {};
  /** Visitas de una escuela, la más nueva primero (las planificadas sin fecha, arriba de todo). */
  function deEscuela(nombre) {
    const e = escuelaDe(nombre), k = norm(nombre);
    return lista().filter(v => { const x = escuelaDe(v.escuela); return e && x ? x === e : norm(v.escuela) === k; })
      .sort((a, b) => (b.fecha || '9999').localeCompare(a.fecha || '9999') || b.fila - a.fila);
  }
  /** Última realizada y próxima planificada de una escuela. */
  function resumenEscuela(nombre) {
    const vs = deEscuela(nombre);
    const ultima = vs.find(v => v.estado === 'REALIZADA') || null;
    const plan = vs.filter(v => v.estado === 'PLANIFICADA').sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
    return { visitas: vs, ultima, proxima: plan[0] || null };
  }

  /* ------------------------------------------------------------ estilos */
  const CSS = `
  .sae-vis-fondo { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 99980; display: flex; align-items: center; justify-content: center; padding: 14px; }
  .sae-vis { background: #fff; color: #0f172a; width: 100%; max-width: 560px; max-height: 92vh; overflow: auto; border-radius: 14px; padding: 16px 18px 14px;
    box-shadow: 0 20px 50px rgba(0,0,0,.35); font: 400 .88rem/1.45 'Inter', system-ui, sans-serif; display: grid; gap: 10px; }
  html.dark .sae-vis { background: #1e293b; color: #e2e8f0; }
  .sae-vis-cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .sae-vis h3 { margin: 0; font: 800 1.08rem 'Montserrat', 'Inter', sans-serif; }
  .sae-vis-x { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: inherit; padding: 4px 8px; border-radius: 6px; }
  .sae-vis label, .sae-vis .sae-vis-lbl { display: grid; gap: 3px; font-weight: 600; font-size: .82rem; }
  .sae-vis small { font-weight: 400; opacity: .72; font-size: .76rem; }
  .sae-vis input[type="text"], .sae-vis input[type="date"], .sae-vis select, .sae-vis textarea { font: inherit; font-weight: 400; padding: 7px 9px;
    border: 1px solid #cbd5e1; border-radius: 8px; background: transparent; color: inherit; min-height: 38px; box-sizing: border-box; width: 100%; }
  html.dark .sae-vis input, html.dark .sae-vis select, html.dark .sae-vis textarea { border-color: #475569; color-scheme: dark; }
  html.dark .sae-vis select option { background: #1e293b; }
  .sae-vis-estado { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sae-vis-estado label { display: flex; align-items: center; gap: 8px; border: 2px solid #d5dbe3; border-radius: 10px; padding: 9px 12px; cursor: pointer; font-size: .86rem; }
  .sae-vis-estado label:has(input:checked) { border-color: #163c68; background: #e0eeff; }
  html.dark .sae-vis-estado label { border-color: #334155; }
  html.dark .sae-vis-estado label:has(input:checked) { border-color: #4d8cff; background: #17304d; }
  .sae-vis-estado input { margin: 0; }
  .sae-vis-fila { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; align-items: start; }
  .sae-vis-fila > label { align-content: start; }
  .sae-vis-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px 12px; background: #f4f7fb; border-radius: 10px; padding: 8px 10px; font-size: .8rem; }
  html.dark .sae-vis-auto { background: #0f172a; }
  .sae-vis-auto span { display: block; font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; opacity: .65; font-weight: 700; }
  .sae-vis-hist:empty { display: none; }
  .sae-vis-hist-nota { margin: 0; font-size: .78rem; opacity: .75; }
  .sae-vis-hist-caja { border: 1px solid #f3d27a; background: #fffbeb; border-radius: 10px; padding: 6px 10px; font-size: .8rem; }
  html.dark .sae-vis-hist-caja { border-color: #5f4c1c; background: #221d10; }
  .sae-vis-hist-caja summary { cursor: pointer; font-weight: 700; color: #8a5300; }
  html.dark .sae-vis-hist-caja summary { color: #fcd34d; }
  .sae-vis-hist-caja summary span { font-weight: 500; opacity: .8; margin-left: 4px; }
  .sae-vis-hist-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px 14px; margin-top: 8px; }
  .sae-vis-hist-g b { display: block; margin-bottom: 2px; }
  .sae-vis-hist-g ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; }
  .sae-vis-hist-g li { line-height: 1.3; overflow-wrap: anywhere; }
  .sae-vis-hist-f { font-variant-numeric: tabular-nums; opacity: .7; font-weight: 600; margin-right: 2px; }
  .sae-vis-hist-g small { opacity: .65; }
  .sae-vis-auto a { color: #2a78d6; font-weight: 600; }
  .sae-vis-radios { display: flex; gap: 14px; flex-wrap: wrap; font-weight: 500; }
  .sae-vis-radios label { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
  .sae-vis-msg { margin: 0; font-size: .82rem; min-height: 0; }
  .sae-vis-msg.error { color: #b91c1c; font-weight: 600; }
  html.dark .sae-vis-msg.error { color: #fca5a5; }
  .sae-vis-pie { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; align-items: center; }
  .sae-vis-pie button { border-radius: 8px; padding: 8px 16px; font: 700 .85rem 'Inter', system-ui, sans-serif; cursor: pointer; min-height: 40px; }
  .sae-vis-cancelar { background: transparent; border: 1px solid #cbd5e1; color: inherit; }
  .sae-vis-guardar { background: #163c68; border: none; color: #fff; }
  html.dark .sae-vis-guardar { background: #4d8cff; color: #0f172a; }
  .sae-vis-guardar:disabled { opacity: .6; cursor: wait; }
  .sae-vis-borrar { margin-right: auto; background: transparent; border: 1px solid #e3a3a3; color: #b91c1c; }
  html.dark .sae-vis-borrar { color: #fca5a5; border-color: #7f1d1d; }
  .sae-vis-ficha { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font-size: .84rem; padding: 8px 12px; border-radius: 10px;
    background: var(--bg-subtle, #f4f7fb); border: 1px solid var(--border, #e2e6ec); margin: 0 0 10px; }
  .sae-vis-ficha strong { font-weight: 700; }
  .sae-vis-ficha a { font-weight: 600; color: var(--primary, #163c68); }
  html.dark .sae-vis-ficha a { color: #8db8ff; }
  .sae-vis-ficha .plan { color: #9a5b00; }
  html.dark .sae-vis-ficha .plan { color: #f6bf80; }
  .sae-vis-listo { position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 20px); opacity: 0; transition: .25s; background: #065f46; color: #fff;
    padding: 9px 16px; border-radius: 10px; font: 600 .86rem 'Inter', system-ui, sans-serif; z-index: 99990; pointer-events: none; }
  .sae-vis-listo.visible { opacity: 1; transform: translate(-50%, 0); }
  @media (max-width: 760px) { .sae-vis-listo { bottom: 84px; } }
  @media print { .sae-vis-ficha { display: none !important; } }`;
  function estilos() {
    if (document.getElementById('saeVisitasCSS')) return;
    const st = document.createElement('style'); st.id = 'saeVisitasCSS'; st.textContent = CSS; document.head.appendChild(st);
  }
  function listo(t) {
    estilos();
    let el = document.getElementById('saeVisListo');
    if (!el) { el = document.createElement('div'); el.id = 'saeVisListo'; el.className = 'sae-vis-listo'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = '✔️ ' + t;
    el.classList.add('visible');
    clearTimeout(listo._t);
    listo._t = setTimeout(() => el.classList.remove('visible'), 3000);
  }

  /* ------------------------------------------- (2.25.0) historial en el formulario */
  const POR_GRUPO = 3;
  function textoReg(x) {
    let d = String(x.det || '').trim().replace(/[:;,\s]+$/, '');
    d = d.split(' — ').map(p => (p === p.toUpperCase() && /[A-Z]{3}/.test(p)) ? p.charAt(0) + p.slice(1).toLowerCase() : p).join(' — ');
    const T = SAE_ENTREGADO.TIPOS[x.tipo] || { t: 'Otros', i: '📦' };
    return { i: T.i, t: d || T.t, tipo: T.t };
  }
  function historialHTML(e) {
    let regs = [];
    try { regs = SAE_ENTREGADO.de(e) || []; } catch (err) { regs = []; }
    const G = SAE_ENTREGADO.GRUPOS;
    const grupos = ['ENT', 'OBR', 'ARR'].map(g => ({ g, l: regs.filter(x => SAE_ENTREGADO.grupoDe(x.tipo) === g) }));
    const total = grupos.reduce((a, x) => a + x.l.length, 0);
    if (!total) return SAE_ENTREGADO.datos ? `<p class="sae-vis-hist-nota">📋 ${esc(e.nombre)}: no tiene entregas, obras ni arreglos cargados.</p>` : '';
    const resumen = grupos.filter(x => x.l.length).map(x => `${x.l.length} ${G[x.g].t.toLowerCase()}`).join(' · ');
    const cols = grupos.map(x => `<div class="sae-vis-hist-g"><b>${G[x.g].i} ${esc(G[x.g].t)}</b>${x.l.length ? `<ul>${x.l.slice(0, POR_GRUPO).map(r => {
      const t = textoReg(r);
      return `<li><span class="sae-vis-hist-f">${esc(SAE_ENTREGADO.fechaTxt(r.f))}</span> ${t.i} ${esc(t.t)}</li>`;
    }).join('')}</ul>${x.l.length > POR_GRUPO ? `<small>y ${x.l.length - POR_GRUPO} más</small>` : ''}` : '<small>Sin datos cargados</small>'}</div>`).join('');
    return `<details class="sae-vis-hist-caja"><summary>📋 Historial de ${esc(e.nombre)} <span>${esc(resumen)}</span></summary><div class="sae-vis-hist-grid">${cols}</div></details>`;
  }

  /* ------------------------------------------------------------ formulario */
  let focoAntes = null;
  /**
   * Nueva visita o modificar una. o = { escuela (objeto del buscador o nombre), visita (para modificar), alGuardar() }
   */
  async function abrirFormulario(o) {
    o = o || {};
    estilos();
    cerrar();
    focoAntes = document.activeElement;
    // Las opciones de los desplegables vienen con las visitas: si no están, se piden (sin frenar el formulario)
    if (!leerCopia()) { try { await cargar(false); } catch (e) { /* se usan las de siempre */ } }
    const op = opciones();
    const v = o.visita || null;
    const escIni = v ? v.escuela : (o.escuela && (o.escuela.nombre || o.escuela)) || '';
    const cats = CATEGORIAS.slice();
    if (v && v.categoria && cats.indexOf(v.categoria.toUpperCase()) < 0) cats.push(v.categoria.toUpperCase());
    const est = v ? v.estado : 'REALIZADA';
    const fechaIni = v && v.fecha && v.fecha.length === 10 ? v.fecha : (v ? '' : (est === 'REALIZADA' ? hoyISO() : ''));
    const nombres = escuelasBuscador().map(e => e.nombre);
    const opt = (val, txt, sel) => `<option value="${esc(val)}"${sel ? ' selected' : ''}>${esc(txt)}</option>`;
    const fondo = document.createElement('div');
    fondo.className = 'sae-vis-fondo';
    fondo.id = 'saeVisitaForm';
    fondo.innerHTML = `<div class="sae-vis" role="dialog" aria-modal="true" aria-labelledby="saeVisTit">
      <div class="sae-vis-cab"><h3 id="saeVisTit">${v ? 'Modificar visita' : 'Nueva visita'}</h3><button type="button" class="sae-vis-x" aria-label="Cerrar">✕</button></div>
      <div class="sae-vis-lbl">¿Ya se hizo o se va a hacer?
        <div class="sae-vis-estado" role="radiogroup">
          <label><input type="radio" name="saeVisEst" value="REALIZADA"${est === 'REALIZADA' ? ' checked' : ''}> ✅ Ya se hizo</label>
          <label><input type="radio" name="saeVisEst" value="PLANIFICADA"${est === 'PLANIFICADA' ? ' checked' : ''}> 🕒 Se va a hacer</label>
        </div>
      </div>
      <div class="sae-vis-fila">
        <label><span data-c="fechaTit">Fecha de la visita</span><input type="date" data-c="fecha" value="${esc(fechaIni)}"></label>
        <label>Escuela<input type="text" data-c="escuela" list="saeVisEsc" value="${esc(escIni)}" autocomplete="off" placeholder="Escribí para buscar…"></label>
      </div>
      ${v && v.fecha && v.fecha.length === 7 ? `<small>En la hoja figuraba solo el mes (${esc(fechaTxt(v.fecha))}). Si no ponés el día, queda así.</small>` : ''}
      <datalist id="saeVisEsc">${nombres.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="sae-vis-auto" data-c="auto"></div>
      <div class="sae-vis-hist" data-c="hist"></div>
      <div class="sae-vis-fila">
        <label>Categoría<select data-c="categoria">${opt('', 'Elegí…', !v || !v.categoria)}${cats.map(c => opt(c, etqCategoria(c), v && c === String(v.categoria).toUpperCase())).join('')}</select></label>
        <label>Motivo<select data-c="motivo"></select>
          <input type="text" data-c="motivoOtro" placeholder="Escribí el motivo" style="display:none" maxlength="120"></label>
      </div>
      <div class="sae-vis-fila">
        <label>Equipo encargado<input type="text" data-c="equipo" value="${esc(v ? v.equipo : '')}" placeholder="${esc(ejemploEquipo())}" maxlength="80" autocomplete="off"></label>
        <div class="sae-vis-lbl">¿Estaban los directivos?
          <div class="sae-vis-radios">
            <label><input type="radio" name="saeVisDir" value="SI"${v && v.directivos === 'SI' ? ' checked' : ''}> Sí</label>
            <label><input type="radio" name="saeVisDir" value="NO"${v && v.directivos === 'NO' ? ' checked' : ''}> No</label>
            <label><input type="radio" name="saeVisDir" value=""${!v || !v.directivos ? ' checked' : ''}> Sin dato</label>
          </div>
        </div>
      </div>
      <label>Observación<textarea data-c="observacion" rows="3" placeholder="Sobrantes, lo que se vio, lo que quedó pendiente…">${esc(v ? v.observacion : '')}</textarea></label>
      <p class="sae-vis-msg" role="status"></p>
      <div class="sae-vis-pie">${v ? '<button type="button" class="sae-vis-borrar">Borrar</button>' : ''}<button type="button" class="sae-vis-cancelar">Cancelar</button><button type="button" class="sae-vis-guardar">${v ? 'Guardar cambios' : 'Guardar visita'}</button></div>
    </div>`;
    document.body.appendChild(fondo);
    const q = (c) => fondo.querySelector(`[data-c="${c}"]`);
    const msg = fondo.querySelector('.sae-vis-msg');
    const btn = fondo.querySelector('.sae-vis-guardar');
    const estado = () => (fondo.querySelector('input[name="saeVisEst"]:checked') || {}).value || 'REALIZADA';
    const error = (t, c) => { msg.textContent = '⚠️ ' + t; msg.className = 'sae-vis-msg error'; if (c && q(c)) q(c).focus(); };
    // Zona, dirección, localidad y Maps salen del buscador
    let auto = { zona: v ? v.zona : '', direccion: v ? v.direccion : '', localidad: v ? v.localidad : '' };
    const pintarAuto = () => {
      const e = escuelaDe(q('escuela').value.trim());
      if (e) auto = { zona: e.zona || '', direccion: e.direccion || '', localidad: e.localidad || '' };
      const url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([auto.direccion, auto.localidad, 'Tres de Febrero, Buenos Aires'].filter(Boolean).join(', '));
      q('auto').innerHTML = `<div><span>Zona</span>${esc(auto.zona || '—')}</div><div><span>Dirección</span>${esc(auto.direccion || '—')}</div>` +
        `<div><span>Localidad</span>${esc(auto.localidad || '—')}</div><div><span>Maps</span>${auto.direccion ? `<a href="${esc(url)}" target="_blank" rel="noopener">Ubicación ↗</a>` : '—'}</div>`;
    };
    pintarAuto();
    q('escuela').addEventListener('input', pintarAuto);
    q('escuela').addEventListener('change', pintarAuto);
    // (2.25.0) Historial de la escuela: últimas entregas, obras y arreglos (para ir con todo a mano)
    let histPedido = 0, histEsc = '';
    const pintarHist = async () => {
      const caja = q('hist');
      if (!caja) return;
      const e = escuelaDe(q('escuela').value.trim());
      if (!e || typeof SAE_ENTREGADO === 'undefined') { caja.innerHTML = ''; histEsc = ''; return; }
      if (histEsc === e.nombre) return;
      histEsc = e.nombre;
      const id = ++histPedido;
      caja.innerHTML = '<p class="sae-vis-hist-nota">Buscando entregas, obras y arreglos…</p>';
      try { await SAE_ENTREGADO.cargar(); } catch (err) { /* se usa lo que haya */ }
      if (id !== histPedido || !caja.isConnected) return;
      caja.innerHTML = historialHTML(e);
    };
    pintarHist();
    q('escuela').addEventListener('change', pintarHist);
    q('escuela').addEventListener('input', () => { clearTimeout(pintarHist._t); pintarHist._t = setTimeout(pintarHist, 350); });
    const pintarEstado = () => {
      const plan = estado() === 'PLANIFICADA';
      q('fechaTit').textContent = plan ? 'Fecha prevista (opcional)' : 'Fecha de la visita';
      q('fecha').max = plan ? '' : hoyISO();
      if (!plan && !q('fecha').value) q('fecha').value = hoyISO();
    };
    pintarEstado();
    fondo.querySelectorAll('input[name="saeVisEst"]').forEach(r => r.addEventListener('change', pintarEstado));
    const otro = (sel, inp) => { const ver = q(sel).value === OTRO; q(inp).style.display = ver ? '' : 'none'; if (ver) q(inp).focus(); };
    // (2.21.2) Motivo según la categoría elegida
    const pintarMotivos = (elegido) => {
      const cat = q('categoria').value;
      const sel = q('motivo');
      if (!cat && !valorMotivo(elegido)) {
        sel.innerHTML = opt('', 'Elegí primero la categoría', true);
        sel.disabled = true;
        q('motivoOtro').style.display = 'none';
        return;
      }
      sel.disabled = false;
      const lista = (MOTIVOS[cat] || []).slice();
      const val = valorMotivo(elegido);
      const enLista = lista.some(m => valorMotivo(m) === val);
      // Un motivo ya cargado que no está en la lista (visitas viejas) se muestra igual, para no perderlo
      if (val && !enLista) lista.unshift(capital(val));
      sel.innerHTML = opt('', 'Elegí…', !val) + lista.map(m => opt(valorMotivo(m), m, val && valorMotivo(m) === val)).join('') + opt(OTRO, 'Otro (escribirlo)…', false);
      q('motivoOtro').style.display = 'none';
      q('motivoOtro').value = '';
    };
    pintarMotivos(v ? v.motivo : '');
    q('categoria').addEventListener('change', () => pintarMotivos(''));
    q('motivo').addEventListener('change', () => otro('motivo', 'motivoOtro'));
    fondo.querySelector('.sae-vis-x').addEventListener('click', cerrar);
    fondo.querySelector('.sae-vis-cancelar').addEventListener('click', cerrar);
    let empezo = false;
    fondo.addEventListener('mousedown', (ev) => { empezo = ev.target === fondo; });
    fondo.addEventListener('click', (ev) => { if (empezo && ev.target === fondo) cerrar(); });
    fondo.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } });

    const enviar = async (cuerpo, texto) => {
      if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) { error('Sin conexión con la hoja de Google.'); return false; }
      if (SAE_SYNC.versionScript() && SAE_SYNC.versionScript() < VERSION_SCRIPT) { error(`Para guardar visitas hay que actualizar el script de Google (versión ${VERSION_SCRIPT}).`); return false; }
      fondo.querySelectorAll('.sae-vis-pie button').forEach(b => { b.disabled = true; });
      const t0 = btn.textContent; btn.textContent = 'Guardando…';
      msg.textContent = ''; msg.className = 'sae-vis-msg';
      try {
        await SAE_SYNC.enviar(cuerpo);
        cerrar();
        listo(texto);
        try { await cargar(true); } catch (e) { /* se ve al recargar */ }
        if (o.alGuardar) { try { o.alGuardar(); } catch (e) { /* nada */ } }
        return true;
      } catch (e) {
        fondo.querySelectorAll('.sae-vis-pie button').forEach(b => { b.disabled = false; });
        btn.textContent = t0;
        error(mensajeError(e));
        return false;
      }
    };
    btn.addEventListener('click', () => {
      const est2 = estado();
      let fecha = q('fecha').value;
      const escuela = q('escuela').value.trim();
      const motivo = q('motivo').value === OTRO ? q('motivoOtro').value.trim().toUpperCase() : q('motivo').value;
      const equipo = q('equipo').value.trim().replace(/\s+/g, ' ');
      if (est2 === 'REALIZADA' && !fecha && !(v && v.fecha && v.fecha.length === 7)) return error('Poné la fecha de la visita.', 'fecha');
      if (est2 === 'REALIZADA' && fecha > hoyISO()) return error('Una visita hecha no puede tener fecha futura: si se va a hacer, marcá "Se va a hacer".', 'fecha');
      if (!escuela) return error('Elegí la escuela.', 'escuela');
      if (!escuelaDe(escuela) && !(v && norm(v.escuela) === norm(escuela))) return error('Elegí la escuela de la lista que aparece al escribir.', 'escuela');
      if (!q('categoria').value) return error('Elegí la categoría.', 'categoria');
      if (q('motivo').value === OTRO && !motivo) return error('Escribí el motivo.', 'motivoOtro');
      const e = escuelaDe(escuela);
      // Visita vieja con solo el mes: si no se puso el día, se manda el mes tal cual ("03/2026")
      const fechaMandar = fecha || (v && v.fecha && v.fecha.length === 7 ? v.fechaTxt : '');
      const visita = { estado: est2, fecha: fechaMandar, escuela: e ? e.nombre : escuela, zona: auto.zona, direccion: auto.direccion, localidad: auto.localidad,
        categoria: q('categoria').value, motivo, equipo, directivos: (fondo.querySelector('input[name="saeVisDir"]:checked') || {}).value || '', observacion: q('observacion').value.trim() };
      const cuerpo = v ? { accion: 'visitaActualizar', fila: v.fila, huella: { escuela: v.escuela, fechaTxt: v.fechaTxt, categoria: v.categoria }, visita }
        : { accion: 'visitaAgregar', visita };
      enviar(cuerpo, v ? `Visita a ${visita.escuela} modificada.` : est2 === 'PLANIFICADA' ? `Visita a ${visita.escuela} planificada.` : `Visita a ${visita.escuela} guardada.`);
    });
    const bBorrar = fondo.querySelector('.sae-vis-borrar');
    if (bBorrar) bBorrar.addEventListener('click', () => {
      if (bBorrar.dataset.confirmar !== '1') { bBorrar.dataset.confirmar = '1'; bBorrar.textContent = '¿Seguro? Sí, borrar'; return; }
      enviar({ accion: 'visitaBorrar', fila: v.fila, huella: { escuela: v.escuela, fechaTxt: v.fechaTxt, categoria: v.categoria } }, `Visita a ${v.escuela} borrada.`);
    });
    setTimeout(() => { (q('escuela').value ? q('categoria') : q('escuela')).focus(); }, 30);
  }
  function cerrar() {
    const f = document.getElementById('saeVisitaForm');
    if (!f) return;
    f.remove();
    const o = focoAntes; focoAntes = null;
    if (o && o.focus && document.contains(o)) { try { o.focus({ preventScroll: true }); } catch (e) { /* nada */ } }
  }
  /** Marcar como realizada una planificada (fecha: hoy, o la que se elija en el formulario). */
  function marcarRealizada(v, alGuardar) {
    abrirFormulario({ visita: Object.assign({}, v, { estado: 'REALIZADA', fecha: v.fecha && v.fecha.length === 10 && v.fecha <= hoyISO() ? v.fecha : hoyISO() }), alGuardar });
  }

  /* ------------------------------------------------------------ ficha */
  /** En la ficha de la escuela: última visita, próxima planificada y "Ver todas". */
  function pintarFicha(cont, escuela) {
    if (!cont) return;
    const nombre = escuela && (escuela.nombre || escuela);
    if (!nombre || typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) { cont.style.display = 'none'; return; }
    estilos();
    const dibujar = () => {
      const r = resumenEscuela(nombre);
      const enlace = `visitas.html?escuela=${encodeURIComponent(nombre)}`;
      const partes = [];
      partes.push(r.ultima ? `📍 <strong>Última visita:</strong> ${esc(fechaTxt(r.ultima.fecha))} · ${esc(etqCategoria(r.ultima.categoria) || 'Visita')}`
        : '📍 <strong>Sin visitas cargadas</strong>');
      if (r.proxima) partes.push(`<span class="plan">🕒 Próxima: ${esc(r.proxima.fecha ? fechaTxt(r.proxima.fecha) : 'sin fecha')}${r.proxima.categoria ? ' · ' + esc(etqCategoria(r.proxima.categoria)) : ''}</span>`);
      if (r.visitas.length) partes.push(`<a href="${enlace}">Ver todas (${r.visitas.length})</a>`);
      cont.className = 'sae-vis-ficha';
      cont.innerHTML = partes.join('<span aria-hidden="true">·</span>');
      cont.style.display = '';
    };
    if (leerCopia()) dibujar(); else cont.style.display = 'none';
    cargar(false).then(dibujar).catch(() => { if (!leerCopia()) cont.style.display = 'none'; });
  }

  return { cargar, lista, opciones, deEscuela, resumenEscuela, escuelaDe, abrirFormulario, marcarRealizada, pintarFicha, fechaTxt, etqCategoria, mensajeError, CATEGORIAS, listo };
})();
if (typeof window !== 'undefined') window.SAE_VISITAS = SAE_VISITAS;
