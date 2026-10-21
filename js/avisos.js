/**
 * ==========================================================================
 * AVISOS PRÓXIMOS - avisos.js
 * Muestra arriba de la página los reclamos de categoría AVISO cuya fecha es
 * hoy, mañana o pasado mañana. Al día siguiente de la fecha se borran solos.
 *
 *  - Buscador (computadora y celular) y Reclamos: el cartel aparece arriba al entrar.
 *    "Ocultar" lo saca; queda oculto al moverse entre páginas y vuelve con F5 o
 *    al abrir la página de nuevo (otra pestaña).
 *  - En todas las páginas, la pastilla "📣 N avisos" de la barra de navegación
 *    abre un panel desplegable debajo de ella (en el celular, arriba de la barra
 *    de abajo): se ve desde cualquier parte de la página, sin tener que subir.
 *    Se cierra con la pastilla, la ✕, Esc o haciendo clic afuera.
 *
 * De dónde salen los avisos:
 *  1) Script v11: acción "avisos" (solo los próximos, muy liviana).
 *  2) Script más viejo: la lista de reclamos ya guardada en este navegador
 *     (la deja la página de Reclamos) o, en el buscador, la lista resumida.
 * Uso: <script src="js/avisos.js" data-modo="abierto|pastilla" data-base=""></script>
 * ==========================================================================
 */
const SAE_AVISOS = (function () {
  'use strict';
  const script = document.currentScript;
  const MODO = (script && script.dataset.modo) || 'abierto';
  const BASE = (script && script.dataset.base) || '';
  const LS_CACHE = 'sae-avisos-v1';
  const SS_OCULTO = 'sae-avisos-oculto';
  const VIGENCIA = 5 * 60 * 1000;               // se vuelve a preguntar a Google cada 5 minutos
  const DIAS = 2;                               // hoy + 2 días
  const MAX_VISIBLES = 6;
  const MOTIVOS = { CANCELACION: 'Cancelación', VIANDAS: 'Viandas', MENU: 'Menú', LOGISTICA: 'Logística', OTROS: 'Otros' };

  let avisos = [];
  let verTodos = false;
  let panelAbierto = false;   // panel desplegable de la pastilla
  let pastillaOrigen = null;  // la pastilla que lo abrió (la de arriba o la de la barra de abajo)

  /* ------------------------------------------------------------ utilidades */
  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const leerSS = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const guardarSS = (k, v) => { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function sumarDias(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
  function hoyISO() { return iso(new Date()); }

  /** "dd/mm/aa", "dd/mm/aaaa" o "aaaa-mm-dd" -> "aaaa-mm-dd" ('' si no es fecha). */
  function aISO(t) {
    let m = String(t || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) { let a = +m[3]; if (a < 100) a += 2000; return `${a}-${pad(+m[2])}-${pad(+m[1])}`; }
    m = String(t || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` : '';
  }

  /** Solo los de hoy a dentro de 2 días, ordenados por fecha. */
  function vigentes(lista) {
    const desde = hoyISO(), hasta = iso(sumarDias(new Date(), DIAS));
    const vistos = {};
    return (lista || []).filter(a => a && a.fecha >= desde && a.fecha <= hasta)
      .filter(a => { const k = a.fila || (a.fecha + a.escuela + a.detalle); if (vistos[k]) return false; vistos[k] = 1; return true; })
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.escuela).localeCompare(String(b.escuela), 'es', { numeric: true }));
  }

  /* ----------------------------------------------------- estado del cartel */
  // F5 vuelve a abrirlo (por si lo ocultaron sin querer). Moverse entre páginas no.
  (function alCargar() {
    let tipo = '';
    try { const n = performance.getEntriesByType('navigation')[0]; tipo = n ? n.type : ''; } catch (e) { /* nada */ }
    if (tipo === 'reload') guardarSS(SS_OCULTO, null);
  })();
  /** El cartel de arriba (solo en buscador y reclamos, mientras no lo oculten). */
  function estaAbierto() {
    if (MODO === 'pastilla') return false;
    return leerSS(SS_OCULTO) !== '1';
  }
  function ocultar() { guardarSS(SS_OCULTO, '1'); pintar(); }

  /* ------------------------------------------------------------- estilos */
  const CSS = `
  .sae-avisos { --av-fondo: #fff8e6; --av-borde: #e0a526; --av-texto: #4a3300; --av-suave: #7a5a12; --av-linea: #f1dca6;
    background: var(--av-fondo); color: var(--av-texto); border: 1px solid var(--av-borde); border-left: 5px solid var(--av-borde);
    border-radius: 12px; padding: 10px 14px 10px; margin: 0 0 14px; font-family: 'Inter', system-ui, sans-serif; font-size: .86rem; line-height: 1.4;
    box-shadow: 0 2px 8px rgba(160, 110, 0, .10); }
  html.dark .sae-avisos { --av-fondo: #2a2212; --av-borde: #c08a1e; --av-texto: #fbe7b5; --av-suave: #e2c27a; --av-linea: #4a3c1c; }
  .sae-avisos-cab { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sae-avisos-cab strong { font-size: .95rem; }
  .sae-avisos-n { background: var(--av-borde); color: #1f1300; border-radius: 999px; padding: 0 8px; font-weight: 700; font-size: .78rem; }
  .sae-avisos-ocultar { margin-left: auto; background: transparent; border: 1px solid var(--av-borde); color: var(--av-texto); border-radius: 8px;
    padding: 3px 10px; font: 600 .78rem 'Inter', system-ui, sans-serif; cursor: pointer; }
  .sae-avisos-ocultar:hover, .sae-avisos-ocultar:focus-visible { background: var(--av-borde); color: #1f1300; outline: none; }
  .sae-avisos-lista { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 2px; }
  .sae-avisos-dia { margin-top: 6px; font-weight: 700; font-size: .74rem; text-transform: uppercase; letter-spacing: .04em; color: var(--av-suave); }
  .sae-avisos-dia:first-child { margin-top: 0; }
  .sae-avisos-item { padding: 4px 0 4px 10px; border-left: 2px solid var(--av-linea); overflow-wrap: anywhere; }
  .sae-avisos-item a { color: inherit; font-weight: 700; text-decoration: underline; text-decoration-color: var(--av-borde); text-underline-offset: 2px; }
  .sae-avisos-motivo { font-weight: 600; }
  .sae-avisos-det { color: var(--av-suave); }
  .sae-avisos-mas { margin-top: 6px; background: none; border: none; padding: 2px 0; color: var(--av-texto); font: 600 .8rem 'Inter', system-ui, sans-serif;
    text-decoration: underline; cursor: pointer; }
  /* Panel desplegable de la pastilla */
  .sae-avisos.sae-avisos-panel { position: fixed; z-index: 2600; margin: 0; width: min(440px, calc(100vw - 24px)); max-height: min(60vh, 520px);
    overflow: auto; overscroll-behavior: contain; box-shadow: 0 14px 36px rgba(0,0,0,.28); border-left-width: 1px; }
  .sae-avisos-panel .sae-avisos-cab { position: sticky; top: -10px; background: var(--av-fondo); margin: -10px -14px 0; padding: 10px 14px 6px; z-index: 1; }
  .sae-avisos-cerrar { margin-left: auto; background: transparent; border: none; color: var(--av-texto); font-size: 1rem; line-height: 1;
    padding: 4px 6px; border-radius: 6px; cursor: pointer; }
  .sae-avisos-cerrar:hover, .sae-avisos-cerrar:focus-visible { background: var(--av-borde); color: #1f1300; outline: none; }
  /* Pastilla en la barra de navegación */
  .sae-nav .sae-avisos-pastilla { display: inline-flex; align-items: center; gap: 5px; border: none; cursor: pointer; border-radius: 999px;
    background: #f5a524; color: #1f1300; font: 700 .8rem 'Inter', system-ui, sans-serif; padding: 5px 11px; margin-left: 4px; white-space: nowrap;
    box-shadow: 0 0 0 2px rgba(245,165,36,.25); }
  .sae-nav .sae-avisos-pastilla:hover, .sae-nav .sae-avisos-pastilla:focus-visible { background: #ffb938; outline: 2px solid #8a5a00; outline-offset: 1px; }
  .sae-nav .sae-avisos-pastilla.abierta { box-shadow: inset 0 0 0 2px #8a5a00; background: #ffb938; }
  .sae-nav-abajo .sae-avisos-pastilla { flex-direction: column; gap: 0; border-radius: 10px; padding: 3px 8px; margin: 4px 2px; font-size: .66rem; line-height: 1.15; }
  .sae-nav-abajo .sae-avisos-pastilla .sae-avisos-pico { font-size: 1.05rem; }
  @media print { .sae-avisos, .sae-avisos-pastilla { display: none !important; } }`;
  function asegurarEstilos() {
    if (document.getElementById('saeAvisosCSS')) return;
    const st = document.createElement('style');
    st.id = 'saeAvisosCSS';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* -------------------------------------------------------------- dibujar */
  function cuando(f) {
    const h = hoyISO();
    const [a, m, d] = f.split('-').map(Number);
    const dt = new Date(a, m - 1, d);
    const dia = dt.toLocaleDateString('es-AR', { weekday: 'long' });
    const corto = `${pad(d)}/${pad(m)}`;
    if (f === h) return `Hoy · ${dia} ${corto}`;
    if (f === iso(sumarDias(new Date(), 1))) return `Mañana · ${dia} ${corto}`;
    return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${corto}`;
  }

  function contenedorCartel() {
    let caja = document.getElementById('saeAvisos');
    if (caja) return caja;
    caja = document.createElement('section');
    caja.id = 'saeAvisos';
    caja.className = 'sae-avisos';
    caja.setAttribute('aria-label', 'Avisos próximos');
    const main = document.querySelector('main');
    if (main) main.insertBefore(caja, main.firstChild);
    else document.body.insertBefore(caja, document.body.firstChild);
    return caja;
  }

  /** Lista de avisos agrupada por día (la usan el cartel y el panel). */
  function htmlLista(visibles) {
    let diaPrevio = '', items = '';
    visibles.forEach(a => {
      if (a.fecha !== diaPrevio) { items += `<li class="sae-avisos-dia">${esc(cuando(a.fecha))}</li>`; diaPrevio = a.fecha; }
      const motivo = MOTIVOS[norm(a.motivo)] || (a.motivo ? a.motivo.charAt(0) + a.motivo.slice(1).toLowerCase() : 'Aviso');
      const enlace = `${BASE}reclamos.html?escuela=${encodeURIComponent(a.escuela || '')}#buscar`;
      const det = String(a.detalle || '').trim();
      const corto = det.length > 180 ? det.slice(0, 177) + '…' : det;
      items += `<li class="sae-avisos-item"><a href="${enlace}" title="Ver los reclamos de ${esc(a.escuela)}">${esc(a.escuela || 'Sin escuela')}</a>` +
        ` · <span class="sae-avisos-motivo">${esc(motivo)}</span>` +
        (corto ? ` — <span class="sae-avisos-det"${det.length > 180 ? ` title="${esc(det)}"` : ''}>${esc(corto)}</span>` : '') + `</li>`;
    });
    return `<ul class="sae-avisos-lista">${items}</ul>`;
  }

  function pintarCartel() {
    if (MODO === 'pastilla') return;
    const caja = contenedorCartel();
    if (!avisos.length || !estaAbierto()) { caja.style.display = 'none'; caja.innerHTML = ''; return; }
    const visibles = verTodos ? avisos : avisos.slice(0, MAX_VISIBLES);
    const resto = avisos.length - visibles.length;
    caja.innerHTML = `<div class="sae-avisos-cab"><strong>📣 Avisos próximos</strong>` +
      `<span class="sae-avisos-n" title="Avisos de hoy a ${DIAS} días">${avisos.length}</span>` +
      `<button type="button" class="sae-avisos-ocultar" title="Ocultar (los avisos se siguen viendo tocando la pastilla 📣 de la barra)">Ocultar ▲</button></div>` +
      htmlLista(visibles) +
      (resto > 0 ? `<button type="button" class="sae-avisos-mas">Ver ${resto === 1 ? 'el aviso restante' : `los ${resto} avisos restantes`}</button>` :
        (verTodos && avisos.length > MAX_VISIBLES ? `<button type="button" class="sae-avisos-mas">Ver menos</button>` : ''));
    caja.style.display = '';
    caja.querySelector('.sae-avisos-ocultar').addEventListener('click', ocultar);
    const mas = caja.querySelector('.sae-avisos-mas');
    if (mas) mas.addEventListener('click', () => { verTodos = !verTodos; pintarCartel(); });
  }

  /* --------------------------------------------- panel desplegable */
  function panel() {
    let p = document.getElementById('saeAvisosPanel');
    if (p) return p;
    p = document.createElement('section');
    p.id = 'saeAvisosPanel';
    p.className = 'sae-avisos sae-avisos-panel';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Avisos próximos');
    p.style.display = 'none';
    document.body.appendChild(p);
    return p;
  }
  /** Ubica el panel pegado a la pastilla: debajo si está arriba, encima si está en la barra de abajo. */
  function ubicarPanel() {
    const p = document.getElementById('saeAvisosPanel');
    if (!p || !panelAbierto || !pastillaOrigen) return;
    const r = pastillaOrigen.getBoundingClientRect();
    if (!r.width) { cerrarPanel(); return; }
    const ancho = p.offsetWidth, vw = document.documentElement.clientWidth;
    let izq = Math.min(Math.max(12, r.right - ancho), vw - ancho - 12);
    if (pastillaOrigen.closest('.sae-nav-abajo')) {
      p.style.top = 'auto';
      p.style.bottom = (window.innerHeight - r.top + 8) + 'px';
      izq = Math.max(12, (vw - ancho) / 2);
    } else {
      p.style.bottom = 'auto';
      p.style.top = (r.bottom + 8) + 'px';
    }
    p.style.left = Math.max(12, izq) + 'px';
  }
  function pintarPanel() {
    const p = panel();
    if (!panelAbierto || !avisos.length) { p.style.display = 'none'; p.innerHTML = ''; return; }
    p.innerHTML = `<div class="sae-avisos-cab"><strong>📣 Avisos próximos</strong>` +
      `<span class="sae-avisos-n" title="Avisos de hoy a ${DIAS} días">${avisos.length}</span>` +
      `<button type="button" class="sae-avisos-cerrar" title="Cerrar (Esc)" aria-label="Cerrar">✕</button></div>` + htmlLista(avisos);
    p.style.display = '';
    p.querySelector('.sae-avisos-cerrar').addEventListener('click', () => cerrarPanel(true));
    ubicarPanel();
  }
  function abrirPanel(boton) {
    panelAbierto = true;
    pastillaOrigen = boton;
    pintarPanel();
    pintarPastillas();
    const c = document.querySelector('#saeAvisosPanel .sae-avisos-cerrar');
    if (c) c.focus({ preventScroll: true });
  }
  function cerrarPanel(devolverFoco) {
    if (!panelAbierto) return;
    panelAbierto = false;
    pintarPanel();
    pintarPastillas();
    if (devolverFoco && pastillaOrigen) pastillaOrigen.focus({ preventScroll: true });
  }
  // Clic afuera, Esc, y reubicar si cambia el tamaño o se mueve la página
  document.addEventListener('click', (ev) => {
    if (!panelAbierto) return;
    // composedPath: el botón pudo redibujarse durante el mismo clic (el destino ya no está en la página)
    const camino = ev.composedPath ? ev.composedPath() : [ev.target];
    if (camino.some(el => el && el.id === 'saeAvisosPanel' || (el && el.classList && el.classList.contains('sae-avisos-pastilla')))) return;
    if (ev.target && !document.contains(ev.target)) return;
    cerrarPanel(false);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && panelAbierto) { ev.stopPropagation(); cerrarPanel(true); } }, true);
  window.addEventListener('resize', ubicarPanel);
  window.addEventListener('scroll', ubicarPanel, { passive: true });

  function pintarPastillas() {
    document.querySelectorAll('.sae-nav .sae-nav-int').forEach(int => {
      let b = int.querySelector('.sae-avisos-pastilla');
      if (!avisos.length) { if (b) b.remove(); return; }
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'sae-avisos-pastilla';
        b.setAttribute('aria-haspopup', 'dialog');
        b.setAttribute('aria-controls', 'saeAvisosPanel');
        b.addEventListener('click', () => { if (panelAbierto && pastillaOrigen === b) cerrarPanel(false); else abrirPanel(b); });
        int.appendChild(b);
      }
      const abierta = panelAbierto && pastillaOrigen === b;
      const txt = avisos.length === 1 ? '1 aviso' : `${avisos.length} avisos`;
      const html = `<span class="sae-avisos-pico" aria-hidden="true">📣</span><span>${txt}</span>`;
      if (b.innerHTML !== html) b.innerHTML = html;
      b.title = abierta ? 'Cerrar los avisos próximos' : 'Ver los avisos próximos (de hoy a 2 días)';
      b.setAttribute('aria-expanded', abierta ? 'true' : 'false');
      b.classList.toggle('abierta', abierta);
    });
  }

  function pintar() {
    asegurarEstilos();
    pintarCartel();
    pintarPanel();
    pintarPastillas();
  }

  function usar(lista, guardar) {
    avisos = vigentes(lista);
    if (guardar) guardarLS(LS_CACHE, JSON.stringify({ guardado: Date.now(), dia: hoyISO(), avisos: lista }));
    pintar();
  }

  /* ---------------------------------------------------- traer los avisos */
  function desdeFilasReclamos(filas) {
    // filas: [{ fila, v: [FECHA, ESCUELA, PROVEEDOR, SERVICIO, TIPO, CATEGORIA, Subcategoria, DETALLE, …, ESTADO(11)] }]
    const desde = iso(sumarDias(new Date(), -1)), hasta = iso(sumarDias(new Date(), DIAS + 2));
    const out = [];
    (filas || []).forEach(f => {
      const v = f && f.v;
      if (!v || norm(v[5]).indexOf('AVISO') !== 0) return;
      const fecha = aISO(v[0]);
      if (!fecha || fecha < desde || fecha > hasta) return;
      out.push({ fila: f.fila, fecha, escuela: String(v[1] || '').trim(), proveedor: v[2], servicio: v[3],
        motivo: String(v[6] || '').trim(), detalle: String(v[7] || '').trim(), estado: v[11] });
    });
    return out;
  }

  async function traer() {
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) return;
    let version = SAE_SYNC.versionScript();
    if (!version) {
      try { await SAE_SYNC.pedir('ping'); } catch (e) { /* sin clave o sin conexión */ }
      version = SAE_SYNC.versionScript();
    }
    if (version >= 11) {
      const r = await SAE_SYNC.pedir('avisos');
      usar(r.avisos || [], true);
      return;
    }
    // Script viejo: lista de reclamos guardada por la página de Reclamos…
    try {
      const c = JSON.parse(leerLS('sae-reclamos-lista-v1') || 'null');
      if (c && Array.isArray(c.filas) && Date.now() - (c.guardado || 0) < 30 * 60 * 1000) { usar(desdeFilasReclamos(c.filas), true); return; }
    } catch (e) { /* nada */ }
    // …o, en el buscador, la lista resumida que ya usa la ficha de cada escuela
    if (MODO !== 'abierto' || !SAE_SYNC.cargarReclamos) return;
    const lista = await SAE_SYNC.cargarReclamos();
    usar(desdeFilasReclamos(lista.map(r => ({ fila: r.fila, v: [r.fecha, r.escuela, r.proveedor, r.servicio, '', r.categoria, r.motivo, r.detalle, '', '', '', r.estado] }))), true);
  }

  function iniciar() {
    asegurarEstilos();
    // 1) Lo guardado en este navegador, al instante
    let fresco = false;
    try {
      const c = JSON.parse(leerLS(LS_CACHE) || 'null');
      if (c && Array.isArray(c.avisos)) { avisos = vigentes(c.avisos); fresco = c.dia === hoyISO() && Date.now() - (c.guardado || 0) < VIGENCIA; }
    } catch (e) { /* nada */ }
    pintar();
    // La barra de navegación puede crearse un instante después
    if (!document.querySelector('.sae-nav')) setTimeout(pintarPastillas, 300);
    // 2) Lo nuevo de Google (si lo guardado tiene más de 5 minutos)
    if (!fresco) traer().catch(() => { /* se queda con lo guardado */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  return {
    /** La página de Reclamos avisa cuando tiene la lista (o cargó un reclamo nuevo). */
    desdeReclamos(filas) { usar(desdeFilasReclamos(filas), true); },
    actualizar: () => traer(),
    lista: () => avisos.slice(),
    _vigentes: vigentes
  };
})();
if (typeof window !== 'undefined') window.SAE_AVISOS = SAE_AVISOS;
