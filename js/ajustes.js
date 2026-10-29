/**
 * ==========================================================================
 * AJUSTES - ajustes.js  (2.6.0, necesita el script de Google v24)
 * Cambios que el equipo hace desde la página y que ven todos (se guardan en la
 * pestaña "AJUSTES SAE" del Tablero):
 *  - MENÚ: cambiar el gramaje de un alimento, sacarlo, reemplazarlo por otro o
 *    agregar uno nuevo. Para una escuela, varias elegidas o todas las del
 *    proveedor; en una lista o en todas las del menú; para un servicio o todos;
 *    por un día, un período o sin fecha de fin.
 *  - ENTREGAS: excepciones por fecha (qué entrega cada día un proveedor en un
 *    período) y la regla de la semana desde una fecha.
 * Se aplican en la calculadora, "Qué se entrega hoy", Totales, la ficha
 * impresa y el celular (SAE_MENUS.bloques(…, fecha) y SAE_ENTREGAS.destinos).
 * Para guardar hace falta haber entrado una vez a Reclamos con la clave.
 * ==========================================================================
 */
const SAE_AJUSTES = (function () {
  'use strict';
  const LS = 'sae-ajustes-v1';
  const VERSION_SCRIPT = 24;
  const NIVELES = [['jardin', 'Inicial'], ['primaria', 'Primario'], ['secundaria', 'Secundario']];
  const UNIDADES = [['g', 'g'], ['ml', 'ml'], ['u', 'unidades'], ['saquito', 'saquitos']];
  const PROVEEDORES = ['GRUPO L', 'GYULAND', 'EDEAL', 'TINTENFISCH'];
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  let lista = [];
  try { lista = JSON.parse(localStorage.getItem(LS) || '[]') || []; } catch (e) { lista = []; }

  /* ------------------------------------------------------------ utilidades */
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const pad = (n) => String(n).padStart(2, '0');
  const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fechaDe = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); };
  const sumar = (iso, n) => { const d = fechaDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
  const hoyISO = () => isoDe(new Date());
  const corta = (iso) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
  const diaCorto = (iso) => `${DIAS_CORTOS[fechaDe(iso).getDay()]} ${corta(iso)}`;
  const esHabil = (iso) => { const w = fechaDe(iso).getDay(); return w > 0 && w < 6; };
  const feriado = (iso) => (typeof SAE_EXTRAS !== 'undefined' && SAE_EXTRAS.FERIADOS) ? SAE_EXTRAS.FERIADOS[iso] : null;
  const fmtNum = (v) => (typeof v === 'number') ? String(v).replace('.', ',') : String(v == null ? '' : v);

  /** Proveedor "canónico" (Teylem = Grupo L). '' si no es uno de los que entregan. */
  function canonProv(p) {
    const n = norm(p);
    if (/^(GRUPO L|TEYLEM)\b/.test(n)) return 'GRUPO L';
    for (const k of PROVEEDORES) if (n.indexOf(k) === 0) return k;
    return n.replace(/\s+(S\.?A\.?|S\.?R\.?L\.?)$/, '');
  }

  function fijar(nueva, silencioso) {
    lista = Array.isArray(nueva) ? nueva : [];
    try { localStorage.setItem(LS, JSON.stringify(lista)); } catch (e) { /* nada */ }
    if (!silencioso) window.dispatchEvent(new CustomEvent('sae-ajustes'));
  }

  const hayScript = () => typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript();
  const puedeEditar = () => hayScript() && SAE_SYNC.hayClave();

  async function cargar() {
    if (!puedeEditar()) return lista;
    try {
      const r = await SAE_SYNC.pedir('ajustes');
      if (Array.isArray(r.ajustes)) fijar(r.ajustes);
    } catch (e) { /* se queda con lo guardado */ }
    return lista;
  }

  function errorDe(err) {
    const m = String(err && err.message || err);
    if (/Acci[oó]n desconocida/.test(m)) return `Para guardar ajustes hay que actualizar el script de Google (versión ${VERSION_SCRIPT}).`;
    return typeof SAE_SYNC !== 'undefined' ? SAE_SYNC.mensajeError(err) : m;
  }

  async function guardar(a) {
    const r = await SAE_SYNC.enviar({ accion: 'ajusteGuardar', ajuste: a });
    fijar(r.ajustes || lista.concat([r.ajuste]));
    return r.ajuste;
  }
  async function quitar(id) {
    const r = await SAE_SYNC.enviar({ accion: 'ajusteQuitar', id });
    fijar(r.ajustes || lista.filter(a => a.id !== id));
  }

  const vigenteEn = (a, iso) => a.desde <= iso && (!a.hasta || iso <= a.hasta);

  /* ---------------------------------------------------- MENÚ: aplicar */
  /** ¿El ajuste corresponde a esta escuela / bloque? (sin mirar fecha ni lista) */
  function correspondeA(a, escuela, b) {
    if (a.fuente !== b.fuente) return false;
    const al = a.alcance || {};
    if (al.modo === 'proveedor') {
      if (canonProv(b.proveedor || (escuela && escuela.proveedor)) !== al.proveedor) return false;
    } else if (!(al.escuelas || []).includes(escuela && escuela.nombre)) return false;
    if ((a.servicios || []).length && !a.servicios.includes(norm(b.servicio))) return false;
    return true;
  }

  function ajustesMenu(escuela, b, l, fecha) {
    return lista.filter(a => a.tipo === 'menu' && vigenteEn(a, fecha) && (!a.lista || a.lista === l.lista) && correspondeA(a, escuela, b))
      .sort((x, y) => String(x.creado).localeCompare(String(y.creado)));
  }

  function info(a, antes) { return { id: a.id, accion: a.accion, resumen: a.resumen, desde: a.desde, hasta: a.hasta, nota: a.nota, antes: antes || null }; }

  /** Devuelve la lista con los ajustes de ese día aplicados (la original no se toca). */
  function aplicarLista(l, escuela, b, fecha) {
    if (!l || !fecha || !lista.length) return l;
    const aps = ajustesMenu(escuela, b, l, fecha);
    if (!aps.length) return l;
    const ings = (l.ingredientes || []).map(i => Object.assign({}, i));
    const quitados = [];
    aps.forEach(a => {
      const k = norm(a.alimento);
      const idx = ings.findIndex(i => norm(i.alimento) === k);
      if (a.accion === 'agregar') {
        if (ings.some(i => norm(i.alimento) === norm(a.nuevo && a.nuevo.alimento))) return;
        ings.push(Object.assign({}, a.nuevo, { _ajuste: info(a) }));
        return;
      }
      if (idx < 0) return;
      const ant = ings[idx];
      if (a.accion === 'quitar') { quitados.push({ alimento: ant.alimento, unidad: ant.unidad, ajuste: info(a, ant) }); ings.splice(idx, 1); }
      else if (a.accion === 'gramaje') {
        const n = Object.assign({}, ant);
        NIVELES.forEach(([nv]) => { const v = a.nuevo && a.nuevo[nv]; if (v !== undefined && v !== null && v !== '') n[nv] = v; });
        n._ajuste = info(a, ant);
        ings[idx] = n;
      } else if (a.accion === 'reemplazar') {
        ings[idx] = Object.assign({}, a.nuevo, { _ajuste: info(a, ant) });
      }
    });
    return Object.assign({}, l, { ingredientes: ings, _quitados: quitados, _ajustado: true });
  }

  /** Para SAE_MENUS.bloques: aplica a todas las listas de los bloques. */
  function aplicarBloques(bloques, escuela, fecha) {
    if (!fecha || !lista.length) return bloques;
    bloques.forEach(b => { b.listas = (b.listas || []).map(l => aplicarLista(l, escuela, b, fecha)); b.fecha = fecha; });
    return bloques;
  }

  /* -------------------------------------------------- ENTREGAS: consultar */
  function excepcionEntrega(prov, iso) {
    const c = canonProv(prov);
    const ex = lista.filter(a => a.tipo === 'entregaExc' && a.proveedor === c && vigenteEn(a, iso))
      .sort((x, y) => String(y.creado).localeCompare(String(x.creado)))[0];
    return ex ? ((ex.dias || {})[iso] || []) : null;
  }
  function reglaEntrega(prov, iso) {
    const c = canonProv(prov);
    return lista.filter(a => a.tipo === 'entregaRegla' && a.proveedor === c && a.desde <= iso)
      .sort((x, y) => (y.desde.localeCompare(x.desde)) || String(y.creado).localeCompare(String(x.creado)))[0] || null;
  }

  /** Fecha (yyyy-mm-dd) de ese día de la semana ("Martes") en la semana de `isoBase`. */
  function fechaDeDia(dia, isoBase) {
    const base = fechaDe(isoBase || hoyISO());
    const lunes = new Date(base); lunes.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    const i = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].indexOf(dia);
    lunes.setDate(lunes.getDate() + Math.max(0, i));
    return isoDe(lunes);
  }

  /* ================================================================ VENTANAS */
  const CSS = `
  .sae-aj-fondo { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 3000; display: flex; align-items: flex-start; justify-content: center; padding: 4vh 12px; overflow-y: auto; }
  .sae-aj { background: var(--bg-card, #fff); color: var(--text-primary, #0f172a); border-radius: 14px; width: min(680px, 100%); box-shadow: 0 20px 50px rgba(0,0,0,.3);
    font: 400 .9rem/1.45 'Inter', system-ui, sans-serif; display: flex; flex-direction: column; max-height: none; }
  .sae-aj-cab { display: flex; align-items: flex-start; gap: 10px; padding: 16px 18px 10px; border-bottom: 1px solid var(--border, #e2e8f0); }
  .sae-aj-cab h3 { margin: 0; font-size: 1.05rem; }
  .sae-aj-cab p { margin: 2px 0 0; color: var(--text-muted, #64748b); font-size: .8rem; }
  .sae-aj-cab .sae-aj-x { margin-left: auto; background: none; border: none; font-size: 1.5rem; line-height: 1; cursor: pointer; color: var(--text-muted, #64748b); }
  .sae-aj-cuerpo { padding: 12px 18px; display: flex; flex-direction: column; gap: 14px; }
  .sae-aj-pie { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 18px 16px; border-top: 1px solid var(--border, #e2e8f0); flex-wrap: wrap; }
  .sae-aj-sec > .sae-aj-tit { font-weight: 700; font-size: .82rem; margin-bottom: 6px; display: block; }
  .sae-aj-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border, #cbd5e1); border-radius: 9px; overflow: hidden; }
  .sae-aj-seg button { border: none; background: transparent; padding: 6px 11px; cursor: pointer; font: 600 .8rem 'Inter', system-ui, sans-serif; color: var(--text-secondary, #334155); }
  .sae-aj-seg button + button { border-left: 1px solid var(--border, #cbd5e1); }
  .sae-aj-seg button.activo { background: var(--primary, #1e3a5f); color: #fff; }
  html.dark .sae-aj-seg button.activo { color: #0f172a; }
  .sae-aj-op { display: flex; flex-direction: column; gap: 5px; }
  .sae-aj-op label { display: flex; align-items: center; gap: 7px; cursor: pointer; font-size: .85rem; }
  .sae-aj-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
  .sae-aj-campo { display: flex; flex-direction: column; gap: 3px; font-size: .78rem; color: var(--text-secondary, #334155); }
  .sae-aj input[type=text], .sae-aj input[type=number], .sae-aj input[type=date], .sae-aj select, .sae-aj textarea {
    font: 500 .88rem 'Inter', system-ui, sans-serif; padding: 6px 8px; border: 1px solid var(--border, #cbd5e1); border-radius: 8px;
    background: var(--bg-input, var(--bg-card, #fff)); color: inherit; min-width: 0; }
  .sae-aj textarea { width: 100%; min-height: 44px; resize: vertical; box-sizing: border-box; }
  .sae-aj-antes { font-size: .74rem; color: var(--text-muted, #64748b); }
  .sae-aj-caja { border: 1px solid var(--border, #e2e8f0); border-radius: 10px; padding: 8px 10px; background: var(--bg-subtle, #f8fafc); }
  .sae-aj-escuelas { max-height: 220px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 2px 10px; margin-top: 6px; }
  .sae-aj-escuelas label { font-size: .8rem; display: flex; gap: 6px; align-items: center; cursor: pointer; }
  .sae-aj-mini { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: .78rem; }
  .sae-aj-mini button, .sae-aj-link { background: none; border: none; color: var(--primary, #1e3a5f); cursor: pointer; font: 600 .78rem 'Inter', system-ui, sans-serif; padding: 2px 4px; text-decoration: underline; }
  .sae-aj-btn { border: 1px solid var(--border, #cbd5e1); background: var(--bg-card, #fff); color: inherit; border-radius: 9px; padding: 7px 14px; cursor: pointer; font: 600 .85rem 'Inter', system-ui, sans-serif; }
  .sae-aj-btn.primario { background: var(--primary, #1e3a5f); border-color: var(--primary, #1e3a5f); color: #fff; }
  html.dark .sae-aj-btn.primario { color: #0f172a; }
  .sae-aj-btn.peligro { color: #b91c1c; border-color: #fca5a5; }
  .sae-aj-btn:disabled { opacity: .6; cursor: wait; }
  .sae-aj-msj { font-size: .84rem; border-radius: 8px; padding: 7px 10px; }
  .sae-aj-msj.error { background: #fee2e2; color: #991b1b; } .sae-aj-msj.ok { background: #dcfce7; color: #166534; } .sae-aj-msj.alerta { background: #fef3c7; color: #854d0e; }
  html.dark .sae-aj-msj.error { background: #4c1d1d; color: #fecaca; } html.dark .sae-aj-msj.ok { background: #14361f; color: #bbf7d0; } html.dark .sae-aj-msj.alerta { background: #44370f; color: #fde68a; }
  .sae-aj-item { border: 1px solid var(--border, #e2e8f0); border-radius: 10px; padding: 8px 10px; display: flex; gap: 10px; align-items: flex-start; }
  .sae-aj-item + .sae-aj-item { margin-top: 6px; }
  .sae-aj-item .sae-aj-txt { flex: 1; min-width: 0; }
  .sae-aj-acc { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
  .sae-aj-fform { margin-top: 6px; }
  .sae-aj-para { font-size: .82rem; color: var(--text-secondary, #334155); padding: 6px 10px; border-radius: 8px; background: var(--bg-subtle, #f1f5f9); }
  .sae-aj-mas { display: flex; flex-direction: column; gap: 14px; padding: 10px; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; }
  .sae-aj-fform input[type=date] { padding: 3px 6px; font-size: .8rem; }
  .sae-aj-item .sae-aj-txt strong { display: block; font-size: .86rem; }
  .sae-aj-item .sae-aj-txt span { display: block; font-size: .76rem; color: var(--text-muted, #64748b); }
  .sae-aj-chip { display: inline-block; font-size: .68rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; background: #dbeafe; color: #1e40af; margin-left: 4px; vertical-align: middle; }
  .sae-aj-chip.futuro { background: #f1f5f9; color: #475569; } .sae-aj-chip.vencido { background: #f1f5f9; color: #94a3b8; }
  html.dark .sae-aj-chip { background: #1e3a8a; color: #dbeafe; } html.dark .sae-aj-chip.futuro, html.dark .sae-aj-chip.vencido { background: #334155; color: #cbd5e1; }
  .sae-aj-tabla { width: 100%; border-collapse: collapse; font-size: .8rem; }
  .sae-aj-tabla th, .sae-aj-tabla td { padding: 5px 6px; border-bottom: 1px solid var(--border, #e2e8f0); text-align: left; vertical-align: middle; }
  .sae-aj-tabla td.c, .sae-aj-tabla th.c { text-align: center; }
  .sae-aj-chk { display: inline-flex; align-items: center; gap: 4px; margin: 2px 8px 2px 0; white-space: nowrap; cursor: pointer; }
  .sae-aj-fer { color: #b45309; font-size: .72rem; font-weight: 700; }
  /* Marcas en la calculadora */
  .aj-marca { display: inline-block; margin-left: 6px; font-size: .68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: #fef3c7; color: #854d0e; cursor: help; white-space: nowrap; }
  html.dark .aj-marca { background: #44370f; color: #fde68a; }
  .aj-editar { margin-left: 6px; background: none; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: .8rem; padding: 0 4px; opacity: .55; }
  .aj-editar:hover, .aj-editar:focus-visible { opacity: 1; border-color: var(--border, #cbd5e1); outline: none; }
  tr.aj-quitado td { text-decoration: line-through; color: var(--text-muted, #94a3b8); }
  tr.aj-quitado td.aj-sin-tachar { text-decoration: none; }
  .aj-agregar { margin: 6px 0 2px; background: none; border: 1px dashed var(--border, #cbd5e1); border-radius: 8px; padding: 4px 10px; cursor: pointer; font: 600 .78rem 'Inter', system-ui, sans-serif; color: var(--text-secondary, #334155); }
  .aj-agregar:hover { border-color: var(--primary, #1e3a5f); color: var(--primary, #1e3a5f); }
  .aj-barra { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: .8rem; color: var(--text-secondary, #334155); margin: 0 0 10px; }
  .aj-barra button { background: var(--bg-subtle, #f1f5f9); border: 1px solid var(--border, #cbd5e1); border-radius: 8px; padding: 4px 10px; cursor: pointer; font: 600 .78rem 'Inter', system-ui, sans-serif; color: inherit; }
  .aj-barra button:hover { border-color: var(--primary, #1e3a5f); }
  @media print { .aj-editar, .aj-agregar, .aj-barra button { display: none !important; } }
  `;
  function ponerCSS() {
    if (document.getElementById('sae-aj-css')) return;
    const st = document.createElement('style');
    st.id = 'sae-aj-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function ventana(titulo, sub) {
    ponerCSS();
    const fondo = document.createElement('div');
    fondo.className = 'sae-aj-fondo';
    fondo.innerHTML = `<div class="sae-aj" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="sae-aj-cab"><div><h3>${esc(titulo)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
        <button type="button" class="sae-aj-x" aria-label="Cerrar">&times;</button></div>
      <div class="sae-aj-cuerpo"></div><div class="sae-aj-pie"></div></div>`;
    const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (ev) => { if (ev.key === 'Escape') cerrar(); };
    // (2.7.1) Se cierra al hacer clic afuera, pero no al usar la barra para subir y bajar
    // (el clic tiene que empezar y terminar en el fondo, y no sobre la barra de desplazamiento)
    let empezoAfuera = false;
    fondo.addEventListener('mousedown', (ev) => { empezoAfuera = ev.target === fondo && ev.offsetX < fondo.clientWidth && ev.offsetY < fondo.clientHeight; });
    fondo.addEventListener('click', (ev) => { if (empezoAfuera && ev.target === fondo) cerrar(); empezoAfuera = false; });
    fondo.querySelector('.sae-aj-x').addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla);
    document.body.appendChild(fondo);
    return { fondo, cuerpo: fondo.querySelector('.sae-aj-cuerpo'), pie: fondo.querySelector('.sae-aj-pie'), cerrar };
  }

  function sinPermiso() {
    const v = ventana('Falta la clave');
    v.cuerpo.innerHTML = `<p>Para hacer ajustes hay que haber entrado una vez a <strong>Reclamos</strong> con la clave del equipo (en esta compu).</p>`;
    v.pie.innerHTML = '<button type="button" class="sae-aj-btn primario">Entendido</button>';
    v.pie.querySelector('button').addEventListener('click', v.cerrar);
  }

  function segmento(cont, opciones, actual, alCambiar) {
    cont.className = 'sae-aj-seg';
    cont.setAttribute('role', 'group');
    cont.innerHTML = opciones.map(([v, t]) => `<button type="button" data-v="${esc(v)}" class="${v === actual ? 'activo' : ''}" aria-pressed="${v === actual}">${esc(t)}</button>`).join('');
    cont.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      cont.querySelectorAll('button').forEach(x => { x.classList.toggle('activo', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      alCambiar(b.dataset.v);
    }));
  }

  function textoFechas(a) {
    if (a.tipo === 'entregaRegla') return `desde el ${corta(a.desde)}`;
    if (!a.hasta) return `desde el ${corta(a.desde)}, sin fecha de fin`;
    if (a.hasta === a.desde) return `solo el ${diaCorto(a.desde)}`;
    return `del ${corta(a.desde)} al ${corta(a.hasta)}`;
  }
  function textoEscuelas(a) {
    const al = a.alcance || {};
    if (al.modo === 'proveedor') return `todas las escuelas de ${al.proveedor}`;
    const e = al.escuelas || [];
    return e.length <= 3 ? e.join(', ') : `${e.slice(0, 3).join(', ')} y ${e.length - 3} más`;
  }
  const gramTxt = (o, unidad) => NIVELES.map(([nv]) => fmtNum(o && o[nv] !== undefined ? o[nv] : '–')).join('/') + ' ' + (unidad === 'saquito' ? 'saq.' : unidad || '');

  /* ------------------------------------------------ Editor de un alimento */
  /**
   * ctx: { escuela, bloque, lista (con ajustes aplicados), fecha, ing (null = agregar) }
   */
  function editarAlimento(ctx) {
    if (!puedeEditar()) { sinPermiso(); return; }
    const { escuela, bloque: b, fecha } = ctx;
    const l = ctx.lista;
    const ing = ctx.ing || null;
    const agregando = !ing;
    const base = ing && ing._ajuste && ing._ajuste.antes ? ing._ajuste.antes : ing;
    const prov = canonProv(b.proveedor || escuela.proveedor);
    const v = ventana(agregando ? '＋ Agregar un alimento' : `✏️ ${ing.alimento}`,
      `${b.prestacion} · ${b.fuente} · ${l.lista || ''}${l.nombre ? ' — ' + l.nombre : ''}`);

    // Ajustes que ya lo tocan (para poder quitarlos desde acá)
    const previos = agregando ? [] : lista.filter(a => a.tipo === 'menu' && correspondeA(a, escuela, b) && (!a.lista || a.lista === l.lista) &&
      (norm(a.alimento) === norm(base.alimento) || (a.nuevo && norm(a.nuevo.alimento) === norm(ing.alimento))) && (!a.hasta || a.hasta >= hoyISO()));

    const sem = escuelasDelMenu(b, escuela);
    const conocidos = alimentosConocidos();
    v.cuerpo.innerHTML = `
      ${previos.length ? `<div class="sae-aj-sec"><span class="sae-aj-tit">Ajustes que ya tiene</span><div data-previos></div></div>` : ''}
      <div class="sae-aj-sec"><span class="sae-aj-tit">¿Qué querés hacer?</span><div data-accion></div></div>
      <div class="sae-aj-sec" data-sec="gramaje">
        <span class="sae-aj-tit">Gramaje por ración <span class="sae-aj-antes">(ahora: ${esc(gramTxt(ing, ing && ing.unidad))})</span></span>
        <div class="sae-aj-grid">${NIVELES.map(([nv, t]) => `<label class="sae-aj-campo">${t}<input type="text" inputmode="decimal" data-g="${nv}" value="${esc(fmtNum(ing ? ing[nv] : ''))}"></label>`).join('')}</div>
      </div>
      <div class="sae-aj-sec" data-sec="nuevo">
        <span class="sae-aj-tit" data-tit-nuevo>${agregando ? 'Alimento nuevo' : 'Reemplazar por'}</span>
        <div class="sae-aj-grid">
          <label class="sae-aj-campo" style="grid-column: span 2;">Nombre<input type="text" data-n="alimento" list="saeAjAlimentos" placeholder="Ej.: Galletitas dulces"></label>
          <label class="sae-aj-campo">Unidad<select data-n="unidad">${UNIDADES.map(([u, t]) => `<option value="${u}">${t}</option>`).join('')}</select></label>
        </div>
        <div class="sae-aj-grid" style="margin-top:8px;">${NIVELES.map(([nv, t]) => `<label class="sae-aj-campo">${t}<input type="text" inputmode="decimal" data-n="${nv}" placeholder="0 = no lleva"></label>`).join('')}</div>
        <datalist id="saeAjAlimentos">${conocidos.map(a => `<option value="${esc(a)}">`).join('')}</datalist>
      </div>
      <div class="sae-aj-sec"><span class="sae-aj-tit">¿Cuándo?</span>
        <div class="sae-aj-op">
          <label><input type="radio" name="ajCuando" value="dia" checked> Solo el ${esc(diaCorto(fecha))}</label>
          <label><input type="radio" name="ajCuando" value="rango"> Varios días: del <input type="date" data-desde value="${fecha}"> al <input type="date" data-hasta value="${fecha}"></label>
          <label><input type="radio" name="ajCuando" value="siempre"> Desde el <input type="date" data-desde2 value="${fecha}"> sin fecha de fin</label>
        </div></div>
      <div class="sae-aj-para"><span data-para></span> <button type="button" class="sae-aj-link" data-mas aria-expanded="false">Cambiar</button></div>
      <div data-opciones-mas style="display:none;" class="sae-aj-mas">
      <div class="sae-aj-sec" data-sec="listas"><span class="sae-aj-tit">¿En qué días del menú?</span>
        <div class="sae-aj-op">
          <label><input type="radio" name="ajLista" value="una" checked> Solo en este menú (${esc(l.lista || 'lista')} — ${esc(DIAS[fechaDe(fecha).getDay()].toLowerCase())})${l.nombre ? ` <span class="sae-aj-antes">(${esc(l.nombre)})</span>` : ''}</label>
          <label><input type="radio" name="ajLista" value="todas"> ${agregando ? 'En todos los días del ciclo' : 'En todos los días del ciclo que lleven este alimento'}</label>
        </div></div>
      <div class="sae-aj-sec"><span class="sae-aj-tit">¿Para qué escuelas?</span>
        <div class="sae-aj-op">
          <label><input type="radio" name="ajEsc" value="una" checked> Solo ${esc(escuela.nombre)}</label>
          ${prov ? `<label><input type="radio" name="ajEsc" value="proveedor"> Todas las de ${esc(prov)} con este menú <span class="sae-aj-antes">(${sem.length} escuelas)</span></label>` : ''}
          <label><input type="radio" name="ajEsc" value="elegidas"> Elegir las escuelas…</label>
        </div>
        <div class="sae-aj-caja" data-elegir style="display:none;margin-top:6px;">
          <div class="sae-aj-mini"><input type="text" data-filtro placeholder="Buscar escuela…" style="flex:1;min-width:140px;">
            <button type="button" data-todas>Marcar todas</button><button type="button" data-ninguna>Ninguna</button><span data-cuenta></span></div>
          <div class="sae-aj-escuelas">${sem.map(n => `<label data-nombre="${esc(norm(n))}"><input type="checkbox" value="${esc(n)}"${n === escuela.nombre ? ' checked' : ''}> ${esc(n)}</label>`).join('')}</div>
        </div></div>
      <div class="sae-aj-sec"><span class="sae-aj-tit">¿Qué servicio?</span>
        <div class="sae-aj-op">
          <label><input type="radio" name="ajServ" value="todos" checked> Todos los servicios con este menú</label>
          <label><input type="radio" name="ajServ" value="uno"> Solo ${esc(b.servicio)}</label>
        </div></div>
      </div>
      <div class="sae-aj-sec"><button type="button" class="sae-aj-link" data-ver-nota>＋ Agregar una nota</button>
        <textarea data-nota maxlength="300" placeholder="Por qué se cambia (opcional)" style="display:none;"></textarea></div>
      <div data-msj></div>`;
    v.pie.innerHTML = '<button type="button" class="sae-aj-btn" data-cancelar>Cancelar</button><button type="button" class="sae-aj-btn primario" data-guardar>Guardar ajuste</button>';
    const q = (s) => v.cuerpo.querySelector(s);
    const msj = (t, tipo) => { q('[data-msj]').innerHTML = t ? `<div class="sae-aj-msj ${tipo || 'error'}">${t}</div>` : ''; };

    if (previos.length) pintarPrevios(q('[data-previos]'), previos, () => { v.cerrar(); });
    // (2.8.0) Más simple: escuelas, servicio y días del menú quedan resumidos en un renglón ("Cambiar")
    const pintarPara = () => {
      const cuando = (v.cuerpo.querySelector('input[name=ajCuando]:checked') || {}).value;
      const secL = q('[data-sec="listas"]');
      if (cuando === 'dia') { secL.style.display = 'none'; v.cuerpo.querySelector('input[name=ajLista][value=una]').checked = true; }
      else secL.style.display = '';
      const e = (v.cuerpo.querySelector('input[name=ajEsc]:checked') || {}).value;
      const nEl = caja ? caja.querySelectorAll('.sae-aj-escuelas input:checked').length : 0;
      const tE = e === 'proveedor' ? `todas las escuelas de ${prov}` : e === 'elegidas' ? `${nEl} escuela${nEl === 1 ? '' : 's'} elegida${nEl === 1 ? '' : 's'}` : escuela.nombre;
      const tS = (v.cuerpo.querySelector('input[name=ajServ]:checked') || {}).value === 'uno' ? `solo ${b.servicio}` : 'todos los servicios';
      const tL = cuando === 'dia' ? '' : ((v.cuerpo.querySelector('input[name=ajLista]:checked') || {}).value === 'todas' ? ' · todos los días del ciclo' : ` · solo ${l.lista || 'este menú'}`);
      q('[data-para]').innerHTML = `Para: <strong>${esc(tE)}</strong> · ${esc(tS)}${esc(tL)}`;
    };
    q('[data-mas]').addEventListener('click', () => {
      const m = q('[data-opciones-mas]'), abierto = m.style.display !== 'none';
      m.style.display = abierto ? 'none' : '';
      q('[data-mas]').textContent = abierto ? 'Cambiar' : 'Listo';
      q('[data-mas]').setAttribute('aria-expanded', String(!abierto));
    });
    q('[data-ver-nota]').addEventListener('click', () => { q('[data-ver-nota]').style.display = 'none'; const t = q('[data-nota]'); t.style.display = ''; t.focus(); });
    v.cuerpo.addEventListener('change', pintarPara);

    let accion = agregando ? 'agregar' : 'gramaje';
    const verSecciones = () => {
      q('[data-sec="gramaje"]').style.display = accion === 'gramaje' ? '' : 'none';
      q('[data-sec="nuevo"]').style.display = (accion === 'reemplazar' || accion === 'agregar') ? '' : 'none';
    };
    if (agregando) q('[data-accion]').innerHTML = '<div class="sae-aj-antes">Se suma a la lista con el gramaje que pongas.</div>';
    else segmento(q('[data-accion]'), [['gramaje', 'Cambiar gramaje'], ['quitar', 'Sacarlo'], ['reemplazar', 'Reemplazarlo por otro']], accion, (x) => { accion = x; verSecciones(); });
    verSecciones();
    if (ing) q('[data-n="unidad"]').value = ing.unidad === 'saquito' ? 'saquito' : (ing.unidad || 'g');

    // Elegir escuelas
    const caja = q('[data-elegir]');
    const contar = () => { q('[data-cuenta]').textContent = `${caja.querySelectorAll('input[type=checkbox]:checked').length} elegidas`; };
    v.cuerpo.querySelectorAll('input[name=ajEsc]').forEach(r => r.addEventListener('change', () => { caja.style.display = r.value === 'elegidas' && r.checked ? '' : (r.checked ? 'none' : caja.style.display); }));
    q('[data-filtro]').addEventListener('input', (ev) => {
      const t = norm(ev.target.value);
      caja.querySelectorAll('.sae-aj-escuelas label').forEach(lb => { lb.style.display = !t || lb.dataset.nombre.includes(t) ? '' : 'none'; });
    });
    q('[data-todas]').addEventListener('click', () => { caja.querySelectorAll('.sae-aj-escuelas label').forEach(lb => { if (lb.style.display !== 'none') lb.querySelector('input').checked = true; }); contar(); });
    q('[data-ninguna]').addEventListener('click', () => { caja.querySelectorAll('.sae-aj-escuelas input').forEach(i => { i.checked = false; }); contar(); });
    caja.addEventListener('change', contar);
    contar();
    pintarPara();
    // Al tocar una fecha se elige esa opción
    [['[data-desde]', 'rango'], ['[data-hasta]', 'rango'], ['[data-desde2]', 'siempre']].forEach(([s, val]) => q(s).addEventListener('focus', () => {
      v.cuerpo.querySelector(`input[name=ajCuando][value=${val}]`).checked = true;
      pintarPara();
    }));

    const leerNum = (t) => {
      const s = String(t || '').trim().replace(',', '.');
      if (s === '') return '';
      if (/^c\/?n$/i.test(s)) return 'c/n';
      const n = Number(s);
      return isNaN(n) || n < 0 ? null : n;
    };

    v.pie.querySelector('[data-cancelar]').addEventListener('click', v.cerrar);
    v.pie.querySelector('[data-guardar]').addEventListener('click', async () => {
      msj('');
      const a = { tipo: 'menu', accion, fuente: b.fuente, prestacion: b.prestacion, lista: '', alimento: agregando ? '' : base.alimento, nota: q('[data-nota]').value.trim() };
      a.lista = v.cuerpo.querySelector('input[name=ajLista]:checked').value === 'una' ? (l.lista || '') : '';
      // Qué cambia
      if (accion === 'gramaje') {
        a.nuevo = {};
        for (const [nv, t] of NIVELES) {
          const x = leerNum(q(`[data-g="${nv}"]`).value);
          if (x === null) { msj(`El gramaje de ${t} no es un número.`); return; }
          if (x !== '' && String(x) !== String(ing[nv])) a.nuevo[nv] = x;
        }
        if (!Object.keys(a.nuevo).length) { msj(previos.length ? 'No cambiaste ningún gramaje. Para cambiar solo las fechas, tocá <strong>📅 Fechas</strong> en "Ajustes que ya tiene" (arriba).' : 'No cambiaste ningún gramaje.'); return; }
      } else if (accion === 'reemplazar' || accion === 'agregar') {
        const nombre = q('[data-n="alimento"]').value.trim();
        if (!nombre) { msj('Escribí el nombre del alimento.'); return; }
        a.nuevo = { alimento: nombre, unidad: q('[data-n="unidad"]').value };
        for (const [nv, t] of NIVELES) {
          const x = leerNum(q(`[data-n="${nv}"]`).value);
          if (x === null || x === '') { msj(`Falta el gramaje de ${t} (poné 0 si ese nivel no lo lleva).`); return; }
          a.nuevo[nv] = x;
        }
        if (accion === 'agregar') a.alimento = nombre;
      }
      // Escuelas
      const modoEsc = v.cuerpo.querySelector('input[name=ajEsc]:checked').value;
      if (modoEsc === 'proveedor') a.alcance = { modo: 'proveedor', proveedor: prov };
      else if (modoEsc === 'elegidas') {
        const el = [...caja.querySelectorAll('.sae-aj-escuelas input:checked')].map(i => i.value);
        if (!el.length) { msj('Elegí al menos una escuela.'); return; }
        a.alcance = { modo: 'escuelas', escuelas: el };
      } else a.alcance = { modo: 'escuelas', escuelas: [escuela.nombre] };
      a.servicios = v.cuerpo.querySelector('input[name=ajServ]:checked').value === 'uno' ? [norm(b.servicio)] : [];
      // Fechas
      const cuando = v.cuerpo.querySelector('input[name=ajCuando]:checked').value;
      if (cuando === 'dia') { a.desde = fecha; a.hasta = fecha; }
      else if (cuando === 'rango') {
        a.desde = q('[data-desde]').value; a.hasta = q('[data-hasta]').value;
        if (!a.desde || !a.hasta) { msj('Elegí las dos fechas.'); return; }
        if (a.hasta < a.desde) { msj('La fecha "al" es anterior a la fecha "del".'); return; }
      } else { a.desde = q('[data-desde2]').value; a.hasta = ''; if (!a.desde) { msj('Elegí desde qué día.'); return; } }
      a.resumen = resumenMenu(a, ing);
      const btn = v.pie.querySelector('[data-guardar]');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        await guardar(a);
        v.cerrar();
        aviso(`⚙️ Ajuste guardado: ${a.resumen}`);
      } catch (err) {
        msj(esc(errorDe(err)));
        btn.disabled = false; btn.textContent = 'Guardar ajuste';
      }
    });
  }

  function resumenMenu(a, ing) {
    const donde = `${a.fuente}${a.lista ? ' · ' + a.lista : ' · todas las listas'}`;
    if (a.accion === 'gramaje') {
      const u = ing ? ing.unidad : '';
      const cambios = NIVELES.filter(([nv]) => a.nuevo[nv] !== undefined)
        .map(([nv, t]) => `${t.toLowerCase()} ${fmtNum(ing ? ing[nv] : '?')} → ${fmtNum(a.nuevo[nv])}`).join(', ');
      return `${a.alimento}: ${cambios} ${u === 'saquito' ? 'saq.' : u} (${donde})`;
    }
    if (a.accion === 'quitar') return `Sacar ${a.alimento} (${donde})`;
    if (a.accion === 'reemplazar') return `Reemplazar ${a.alimento} por ${a.nuevo.alimento} ${gramTxt(a.nuevo, a.nuevo.unidad)} (${donde})`;
    return `Agregar ${a.nuevo.alimento} ${gramTxt(a.nuevo, a.nuevo.unidad)} (${donde})`;
  }

  /** Escuelas que usan el mismo menú (misma fuente) que ese bloque. */
  function escuelasDelMenu(b, escuela) {
    const grupo = typeof SAE_MENUS !== 'undefined' ? SAE_MENUS.grupoDeServicio(b.servicio) : '';
    const out = [];
    (typeof SAE_DATA !== 'undefined' ? SAE_DATA.escuelas : []).forEach(e => {
      try {
        if (SAE_MENUS.bloques(e, grupo, 'Lunes').some(x => x.fuente === b.fuente) ||
            SAE_MENUS.bloques(e, grupo, 'Miércoles').some(x => x.fuente === b.fuente)) out.push(e.nombre);
      } catch (err) { /* nada */ }
    });
    if (!out.includes(escuela.nombre)) out.unshift(escuela.nombre);
    return out.sort((x, y) => x.localeCompare(y, 'es', { numeric: true }));
  }

  function alimentosConocidos() {
    const set = new Set();
    const recorrer = (o, prof) => {
      if (!o || prof > 6) return;
      if (Array.isArray(o)) { o.forEach(x => recorrer(x, prof + 1)); return; }
      if (typeof o === 'object') {
        if (typeof o.alimento === 'string') set.add(o.alimento.replace(/\s*\(.*\)\s*$/, ''));
        Object.values(o).forEach(x => recorrer(x, prof + 1));
      }
    };
    try { recorrer(typeof SAE_MENUS_DATA !== 'undefined' ? SAE_MENUS_DATA : null, 0); } catch (e) { /* nada */ }
    try { recorrer(typeof SAE_DATA !== 'undefined' ? [SAE_DATA.dmLists, SAE_DATA.comedorDays] : null, 0); } catch (e) { /* nada */ }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function estadoChip(a) {
    const hoy = hoyISO();
    if (a.desde > hoy) return '<span class="sae-aj-chip futuro">desde el ' + corta(a.desde) + '</span>';
    if (a.hasta && a.hasta < hoy) return '<span class="sae-aj-chip vencido">vencido</span>';
    return '<span class="sae-aj-chip">vigente</span>';
  }

  function pintarPrevios(cont, items, alQuitar) {
    cont.innerHTML = items.map(a => `<div class="sae-aj-item" data-id="${esc(a.id)}">
        <div class="sae-aj-txt"><strong>${esc(a.resumen || '')} ${estadoChip(a)}</strong>
          <span>${esc(a.tipo === 'menu' ? textoEscuelas(a) + ' · ' : '')}${esc(textoFechas(a))}${a.servicios && a.servicios.length ? ' · solo ' + esc(a.servicios.join(', ')) : ''}</span>
          ${a.nota ? `<span>📝 ${esc(a.nota)}</span>` : ''}
          <div data-fechas-form></div></div>
        <div class="sae-aj-acc">
          ${a.tipo !== 'entregaExc' ? '<button type="button" class="sae-aj-btn" data-fechas title="Cambiar desde / hasta cuándo vale">📅 Fechas</button>' : ''}
          <button type="button" class="sae-aj-btn peligro" data-quitar>Quitar</button></div></div>`).join('');
    cont.querySelectorAll('[data-quitar]').forEach(btn => btn.addEventListener('click', async () => {
      const item = btn.closest('.sae-aj-item');
      if (btn.dataset.confirmar !== '1') { btn.dataset.confirmar = '1'; btn.textContent = '¿Seguro? Quitar'; return; }
      btn.disabled = true; btn.textContent = 'Quitando…';
      try {
        await quitar(item.dataset.id);
        item.remove();
        aviso('⚙️ Ajuste quitado');
        if (alQuitar && !cont.querySelector('.sae-aj-item')) alQuitar();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Quitar'; btn.dataset.confirmar = '';
        item.insertAdjacentHTML('beforeend', `<div class="sae-aj-msj error">${esc(errorDe(err))}</div>`);
      }
    }));
    // (2.7.1) Cambiar solo las fechas de un ajuste (sin tocar lo demás)
    cont.querySelectorAll('[data-fechas]').forEach(btn => btn.addEventListener('click', () => {
      const item = btn.closest('.sae-aj-item');
      const a = items.find(x => x.id === item.dataset.id);
      const f = item.querySelector('[data-fechas-form]');
      if (!a) return;
      if (f.innerHTML) { f.innerHTML = ''; return; }
      const regla = a.tipo === 'entregaRegla';
      const modo = regla || !a.hasta ? 'siempre' : (a.hasta === a.desde ? 'dia' : 'rango');
      const n = 'ajF' + a.id;
      f.innerHTML = `<div class="sae-aj-caja sae-aj-fform">
          ${regla ? `<label class="sae-aj-mini">Desde el <input type="date" data-d value="${a.desde}"></label>` : `
          <div class="sae-aj-op">
            <label><input type="radio" name="${n}" value="dia"${modo === 'dia' ? ' checked' : ''}> Solo el <input type="date" data-dia value="${a.desde}"></label>
            <label><input type="radio" name="${n}" value="rango"${modo === 'rango' ? ' checked' : ''}> Del <input type="date" data-d value="${a.desde}"> al <input type="date" data-h value="${a.hasta || a.desde}"></label>
            <label><input type="radio" name="${n}" value="siempre"${modo === 'siempre' ? ' checked' : ''}> Desde el <input type="date" data-d2 value="${a.desde}"> sin fecha de fin</label>
          </div>`}
          <div class="sae-aj-mini" style="margin-top:6px;"><button type="button" class="sae-aj-btn primario" data-ok>Guardar fechas</button><button type="button" class="sae-aj-btn" data-no>Cancelar</button></div>
          <div data-m></div></div>`;
      const q = (x) => f.querySelector(x);
      [['[data-dia]', 'dia'], ['[data-d]', 'rango'], ['[data-h]', 'rango'], ['[data-d2]', 'siempre']].forEach(([sel, val]) => {
        const el = q(sel);
        if (el && !regla) el.addEventListener('focus', () => { const r = f.querySelector(`input[type=radio][value=${val}]`); if (r) r.checked = true; });
      });
      q('[data-no]').addEventListener('click', () => { f.innerHTML = ''; });
      q('[data-ok]').addEventListener('click', async () => {
        const m = (t) => { q('[data-m]').innerHTML = t ? `<div class="sae-aj-msj error">${esc(t)}</div>` : ''; };
        let desde, hasta;
        if (regla) { desde = q('[data-d]').value; hasta = ''; }
        else {
          const sel = (f.querySelector(`input[name=${n}]:checked`) || {}).value;
          if (sel === 'dia') { desde = hasta = q('[data-dia]').value; }
          else if (sel === 'rango') { desde = q('[data-d]').value; hasta = q('[data-h]').value; }
          else { desde = q('[data-d2]').value; hasta = ''; }
        }
        if (!desde) { m('Elegí la fecha.'); return; }
        if (hasta && hasta < desde) { m('La fecha "al" es anterior a la fecha "del".'); return; }
        if (desde === a.desde && (hasta || '') === (a.hasta || '')) { f.innerHTML = ''; return; }
        const b = q('[data-ok]');
        b.disabled = true; b.textContent = 'Guardando…';
        // Se guarda una copia con las fechas nuevas y se quita la anterior (en la hoja queda el registro de las dos)
        const nuevo = JSON.parse(JSON.stringify(a));
        delete nuevo.id; delete nuevo.creado;
        nuevo.desde = desde; nuevo.hasta = hasta;
        if (regla && nuevo.resumen) nuevo.resumen = nuevo.resumen.replace(/desde el \d{2}\/\d{2}/, 'desde el ' + corta(desde));
        try {
          const g = await guardar(nuevo);
          try { await quitar(a.id); } catch (e) { /* quedó la nueva; la vieja se puede quitar a mano */ }
          const i = items.findIndex(x => x.id === a.id);
          if (i >= 0) items[i] = g;
          pintarPrevios(cont, items, alQuitar);
          aviso('📅 Fechas cambiadas: ' + textoFechas(g));
        } catch (err) {
          b.disabled = false; b.textContent = 'Guardar fechas';
          m(errorDe(err));
        }
      });
    }));
  }

  /* ------------------------------------------------- Panel de ajustes */
  function abrirPanel(opc) {
    opc = opc || {};
    const v = ventana('⚙️ Ajustes', 'Cambios de menú y de días de entrega hechos desde la página (se ven en todas las compus)');
    let soloEsta = !!opc.escuela;
    let verViejos = false;
    const pintar = () => {
      const hoy = hoyISO();
      const items = lista.filter(a => verViejos || !a.hasta || a.hasta >= hoy)
        .filter(a => !soloEsta || a.tipo !== 'menu' || (a.alcance && (a.alcance.modo === 'proveedor'
          ? canonProv(opc.escuela.proveedor || ((opc.escuela.servicios || [])[0] || {}).proveedor) === a.alcance.proveedor ||
            (opc.escuela.servicios || []).some(s => canonProv(s.proveedor) === a.alcance.proveedor)
          : (a.alcance.escuelas || []).includes(opc.escuela.nombre))))
        .sort((x, y) => x.desde.localeCompare(y.desde));
      const menu = items.filter(a => a.tipo === 'menu'), ent = items.filter(a => a.tipo !== 'menu' && a.tipo !== 'horario');   // (2.9.0) el horario de entrega se ve en Reclamos
      v.cuerpo.innerHTML = `
        <div class="sae-aj-mini">
          ${opc.escuela ? `<label><input type="checkbox" data-solo${soloEsta ? ' checked' : ''}> Solo los que tocan a ${esc(opc.escuela.nombre)}</label>` : ''}
          <label><input type="checkbox" data-viejos${verViejos ? ' checked' : ''}> Ver también los vencidos</label>
          <button type="button" data-recargar>↻ Actualizar</button>
        </div>
        <div class="sae-aj-sec"><span class="sae-aj-tit">🍎 Menú (${menu.length})</span><div data-menu></div>
          ${menu.length ? '' : '<p class="sae-aj-antes">No hay ajustes de menú. Se hacen con el ✏️ de cada alimento en la calculadora.</p>'}</div>
        <div class="sae-aj-sec"><span class="sae-aj-tit">🚚 Entregas (${ent.length})</span><div data-ent></div>
          ${ent.length ? '' : '<p class="sae-aj-antes">No hay cambios de días de entrega.</p>'}</div>`;
      pintarPrevios(v.cuerpo.querySelector('[data-menu]'), menu);
      pintarPrevios(v.cuerpo.querySelector('[data-ent]'), ent);
      const s = v.cuerpo.querySelector('[data-solo]');
      if (s) s.addEventListener('change', () => { soloEsta = s.checked; pintar(); });
      v.cuerpo.querySelector('[data-viejos]').addEventListener('change', (ev) => { verViejos = ev.target.checked; pintar(); });
      v.cuerpo.querySelector('[data-recargar]').addEventListener('click', async (ev) => { ev.target.textContent = 'Actualizando…'; await cargar(); pintar(); });
    };
    pintar();
    v.pie.innerHTML = `${puedeEditar() ? '<button type="button" class="sae-aj-btn" data-entregas>📅 Cambiar días de entrega</button>' : ''}<button type="button" class="sae-aj-btn primario" data-cerrar>Cerrar</button>`;
    v.pie.querySelector('[data-cerrar]').addEventListener('click', v.cerrar);
    const be = v.pie.querySelector('[data-entregas]');
    if (be) be.addEventListener('click', () => { v.cerrar(); abrirEntregas({ fecha: opc.fecha, proveedor: opc.proveedor }); });
  }

  /* ------------------------------------------------- Días de entrega */
  function semanaEfectiva(prov, iso) {
    return (typeof SAE_ENTREGAS !== 'undefined' && SAE_ENTREGAS.semana) ? (SAE_ENTREGAS.semana(prov, iso) || {}) : {};
  }

  function abrirEntregas(opc) {
    if (!puedeEditar()) { sinPermiso(); return; }
    opc = opc || {};
    const base = opc.fecha || hoyISO();
    const lunes = fechaDeDia('Lunes', base);
    const v = ventana('📅 Días de entrega', 'Qué menú entrega cada proveedor cada día');
    let modo = 'exc';
    v.cuerpo.innerHTML = `
      <div class="sae-aj-sec"><div data-modo></div>
        <p class="sae-aj-antes" data-ayuda style="margin:6px 0 0;"></p></div>
      <div class="sae-aj-grid">
        <label class="sae-aj-campo">Proveedor<select data-prov>${PROVEEDORES.map(p => `<option${p === canonProv(opc.proveedor) ? ' selected' : ''}>${p}</option>`).join('')}</select></label>
        <label class="sae-aj-campo" data-c="desde">Desde<input type="date" data-desde value="${lunes}"></label>
        <label class="sae-aj-campo" data-c="hasta">Hasta<input type="date" data-hasta value="${sumar(lunes, 4)}"></label>
      </div>
      <div data-tabla></div>
      <div data-revision></div>
      <div class="sae-aj-sec"><span class="sae-aj-tit">Nota <span class="sae-aj-antes">(opcional: feriado, paro, pedido del proveedor…)</span></span><textarea data-nota maxlength="300"></textarea></div>
      <div data-msj></div>`;
    v.pie.innerHTML = '<button type="button" class="sae-aj-btn" data-cancelar>Cancelar</button><button type="button" class="sae-aj-btn primario" data-guardar>Guardar</button>';
    const q = (s) => v.cuerpo.querySelector(s);
    const msj = (t, tipo) => { q('[data-msj]').innerHTML = t ? `<div class="sae-aj-msj ${tipo || 'error'}">${t}</div>` : ''; };

    let marcado = {};   // exc: iso entrega -> Set(iso destino) | regla: wd -> Set(wd)
    const candidatos = (iso) => { const out = []; let x = iso; while (out.length < 5) { x = sumar(x, 1); if (esHabil(x)) out.push(x); } return out; };
    const diasRango = () => {
      const d = q('[data-desde]').value, h = q('[data-hasta]').value;
      const out = [];
      if (!d || !h || h < d) return out;
      for (let x = d; x <= h && out.length < 31; x = sumar(x, 1)) if (esHabil(x)) out.push(x);
      return out;
    };

    const pintarExc = (reiniciar) => {
      const prov = q('[data-prov]').value;
      const dias = diasRango();
      if (reiniciar) {
        marcado = {};
        dias.forEach(d => { marcado[d] = new Set(SAE_ENTREGAS.destinos(prov, d) || []); });
      }
      dias.forEach(d => { if (!marcado[d]) marcado[d] = new Set(SAE_ENTREGAS.destinos(prov, d) || []); });
      if (!dias.length) { q('[data-tabla]').innerHTML = '<p class="sae-aj-msj alerta">Elegí un período válido (hasta 31 días).</p>'; q('[data-revision]').innerHTML = ''; return; }
      q('[data-tabla]').innerHTML = `<table class="sae-aj-tabla"><thead><tr><th>El día que entrega…</th><th>…lleva el menú de</th></tr></thead><tbody>
        ${dias.map(d => `<tr><th scope="row">${esc(diaCorto(d))}${feriado(d) ? ` <span class="sae-aj-fer">${esc(feriado(d).nombre)}</span>` : ''}</th><td>
          ${candidatos(d).map(t => `<label class="sae-aj-chk"><input type="checkbox" data-d="${d}" data-t="${t}"${marcado[d].has(t) ? ' checked' : ''}> ${esc(diaCorto(t))}${feriado(t) ? ' <span class="sae-aj-fer">feriado</span>' : ''}</label>`).join('')}
          ${marcado[d].size ? '' : '<span class="sae-aj-antes">no entrega</span>'}</td></tr>`).join('')}
        </tbody></table>`;
      q('[data-tabla]').querySelectorAll('input[type=checkbox]').forEach(c => c.addEventListener('change', () => {
        const s = marcado[c.dataset.d];
        if (c.checked) s.add(c.dataset.t); else s.delete(c.dataset.t);
        pintarExc(false);
      }));
      revisar(prov, dias);
    };

    /** Avisa días que quedarían sin entrega o con dos entregas. */
    const revisar = (prov, dias) => {
      const cuenta = {};
      const desde = dias[0], hasta = dias[dias.length - 1];
      for (let d = sumar(desde, -7); d <= sumar(hasta, 7); d = sumar(d, 1)) {
        if (!esHabil(d)) continue;
        const ds = (d >= desde && d <= hasta) ? [...(marcado[d] || [])] : (SAE_ENTREGAS.destinos(prov, d) || []);
        ds.forEach(t => { (cuenta[t] = cuenta[t] || []).push(d); });
      }
      const sin = [], dobles = [];
      let fin = hasta; let n = 0;
      while (n < 2) { fin = sumar(fin, 1); if (esHabil(fin)) n++; }
      for (let t = sumar(desde, 1); t <= fin; t = sumar(t, 1)) {
        if (!esHabil(t) || feriado(t)) continue;
        const c = cuenta[t] || [];
        if (!c.length) sin.push(t);
        if (c.length > 1) dobles.push(`${diaCorto(t)} (lo entregan el ${c.map(diaCorto).join(' y el ')})`);
      }
      q('[data-revision]').innerHTML = (sin.length || dobles.length)
        ? `<div class="sae-aj-msj alerta">${sin.length ? `⚠️ Quedarían <strong>sin entrega</strong>: ${esc(sin.map(diaCorto).join(', '))}.<br>` : ''}${dobles.length ? `⚠️ Se entregarían <strong>dos veces</strong>: ${esc(dobles.join('; '))}.` : ''}<br><small>Podés guardarlo igual si es lo que corresponde.</small></div>`
        : '<div class="sae-aj-msj ok">✔️ Cada día queda con una sola entrega.</div>';
    };

    const pintarRegla = (reiniciar) => {
      const prov = q('[data-prov]').value;
      const desde = q('[data-desde]').value || hoyISO();
      if (reiniciar) {
        const sem = semanaEfectiva(prov, desde);
        marcado = {};
        for (let w = 1; w <= 5; w++) marcado[w] = new Set((sem[w] || []).map(Number));
      }
      q('[data-tabla]').innerHTML = `<table class="sae-aj-tabla"><thead><tr><th>Entrega el…</th>${[1, 2, 3, 4, 5].map(w => `<th class="c">menú del ${DIAS[w].toLowerCase()}</th>`).join('')}</tr></thead><tbody>
        ${[1, 2, 3, 4, 5].map(w => `<tr><th scope="row">${DIAS[w]}</th>${[1, 2, 3, 4, 5].map(t => `<td class="c"><input type="checkbox" aria-label="${DIAS[w]} entrega el menú del ${DIAS[t]}" data-w="${w}" data-t="${t}"${marcado[w].has(t) ? ' checked' : ''}>${t <= w ? '<br><small class="sae-aj-antes">sem. sig.</small>' : ''}</td>`).join('')}</tr>`).join('')}
        </tbody></table>`;
      q('[data-tabla]').querySelectorAll('input[type=checkbox]').forEach(c => c.addEventListener('change', () => {
        const s = marcado[c.dataset.w];
        if (c.checked) s.add(Number(c.dataset.t)); else s.delete(Number(c.dataset.t));
        revisarRegla();
      }));
      revisarRegla();
    };
    const revisarRegla = () => {
      const cuenta = {};
      for (let w = 1; w <= 5; w++) marcado[w].forEach(t => { cuenta[t] = (cuenta[t] || 0) + 1; });
      const sin = [1, 2, 3, 4, 5].filter(t => !cuenta[t]).map(t => DIAS[t].toLowerCase());
      const dob = [1, 2, 3, 4, 5].filter(t => cuenta[t] > 1).map(t => DIAS[t].toLowerCase());
      q('[data-revision]').innerHTML = (sin.length || dob.length)
        ? `<div class="sae-aj-msj alerta">${sin.length ? `⚠️ Nadie entrega el menú del ${esc(sin.join(', '))}.<br>` : ''}${dob.length ? `⚠️ El menú del ${esc(dob.join(', '))} se entregaría dos veces.` : ''}</div>`
        : '<div class="sae-aj-msj ok">✔️ Cada día de menú se entrega una sola vez.</div>';
    };

    const cambiarModo = (m) => {
      modo = m;
      q('[data-c="hasta"]').style.display = m === 'exc' ? '' : 'none';
      q('[data-ayuda]').innerHTML = m === 'exc'
        ? 'Para una semana o un período puntual (feriados, paros, cambios de último momento). Pasadas esas fechas vuelve solo a lo normal.'
        : 'Cambia la regla de todas las semanas desde la fecha elegida (las fechas anteriores siguen con la regla vieja). "sem. sig." = es el menú de la semana siguiente.';
      if (m === 'regla') { const d = q('[data-desde]'); if (d.value < hoyISO()) d.value = hoyISO(); }
      m === 'exc' ? pintarExc(true) : pintarRegla(true);
    };
    segmento(q('[data-modo]'), [['exc', 'Excepción por fechas'], ['regla', 'Regla de la semana']], modo, cambiarModo);
    q('[data-prov]').addEventListener('change', () => modo === 'exc' ? pintarExc(true) : pintarRegla(true));
    q('[data-desde]').addEventListener('change', () => modo === 'exc' ? pintarExc(false) : pintarRegla(true));
    q('[data-hasta]').addEventListener('change', () => pintarExc(false));
    cambiarModo('exc');

    v.pie.querySelector('[data-cancelar]').addEventListener('click', v.cerrar);
    v.pie.querySelector('[data-guardar]').addEventListener('click', async () => {
      msj('');
      const prov = q('[data-prov]').value;
      const a = { tipo: modo === 'exc' ? 'entregaExc' : 'entregaRegla', proveedor: prov, desde: q('[data-desde]').value, nota: q('[data-nota]').value.trim() };
      if (!a.desde) { msj('Elegí la fecha "desde".'); return; }
      if (modo === 'exc') {
        const dias = diasRango();
        if (!dias.length) { msj('Elegí un período válido.'); return; }
        a.hasta = q('[data-hasta]').value;
        a.dias = {};
        dias.forEach(d => { a.dias[d] = [...marcado[d]].sort(); });
        a.resumen = `${prov}: ` + dias.map(d => `${diaCorto(d)} → ${a.dias[d].length ? a.dias[d].map(diaCorto).join(' y ') : 'no entrega'}`).join('; ');
      } else {
        a.hasta = '';
        a.semana = {};
        for (let w = 1; w <= 5; w++) a.semana[w] = [...marcado[w]].sort((x, y) => ((x - w + 7) % 7 || 7) - ((y - w + 7) % 7 || 7));
        a.resumen = `${prov} desde el ${corta(a.desde)}: ` + [1, 2, 3, 4, 5].filter(w => a.semana[w].length)
          .map(w => `${DIAS_CORTOS[w]} → ${a.semana[w].map(t => DIAS_CORTOS[t]).join(' y ')}`).join('; ');
      }
      const btn = v.pie.querySelector('[data-guardar]');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        await guardar(a);
        v.cerrar();
        aviso('📅 Guardado: ' + a.resumen);
      } catch (err) {
        msj(esc(errorDe(err)));
        btn.disabled = false; btn.textContent = 'Guardar';
      }
    });
  }

  /* ------------------------------------------------------------- aviso */
  function aviso(texto) {
    ponerCSS();
    let t = document.getElementById('saeAjAviso');
    if (!t) {
      t = document.createElement('div');
      t.id = 'saeAjAviso';
      t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1e3a5f;color:#fff;padding:9px 16px;border-radius:10px;z-index:3100;font:600 .85rem Inter,system-ui,sans-serif;max-width:min(560px,92vw);box-shadow:0 8px 24px rgba(0,0,0,.25);';
      document.body.appendChild(t);
    }
    t.textContent = texto;
    t.style.display = '';
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => { t.style.display = 'none'; }, 4000);
  }

  /* ----------------------------------------- ayudas para la calculadora */
  /** HTML de la marca "⚙️ ajustado" para un ingrediente (o ''). */
  function marca(ing) {
    const a = ing && ing._ajuste;
    if (!a) return '';
    const etq = { gramaje: 'gramaje ajustado', reemplazar: 'reemplazo', agregar: 'agregado' }[a.accion] || 'ajustado';
    const tip = `${a.resumen || ''} · ${textoFechas(a)}${a.nota ? ' · ' + a.nota : ''}`;
    return `<span class="aj-marca" title="${esc(tip)}">⚙️ ${etq}</span>`;
  }
  /** Cuántos ajustes de menú tocan a esta escuela ese día. */
  function cuantosMenu(escuela, fecha) {
    if (!escuela || typeof SAE_MENUS === 'undefined') return 0;
    const ids = new Set();
    ['DM', 'COMEDOR'].forEach(g => {
      SAE_MENUS.bloques(escuela, g, DIAS[fechaDe(fecha).getDay()] || 'Lunes').forEach(b => (b.listas || []).forEach(l => {
        ajustesMenu(escuela, b, l, fecha).forEach(a => ids.add(a.id));
      }));
    });
    return ids.size;
  }
  function vigentesEn(fecha) { return lista.filter(a => vigenteEn(a, fecha)); }

  // Al abrir la página: traer los ajustes más nuevos (los que hizo otra persona)
  if (typeof window !== 'undefined') {
    const arrancar = () => { ponerCSS(); setTimeout(() => { cargar(); }, 300); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
  }

  return {
    todos: () => lista.slice(), fijar, cargar, guardar, quitar, puedeEditar,
    aplicarLista, aplicarBloques, excepcionEntrega, reglaEntrega, fechaDeDia, canonProv,
    editarAlimento, abrirPanel, abrirEntregas, marca, cuantosMenu, vigentesEn, PROVEEDORES, VERSION_SCRIPT
  };
})();
if (typeof window !== 'undefined') window.SAE_AJUSTES = SAE_AJUSTES;
