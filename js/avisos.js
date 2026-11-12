/**
 * ==========================================================================
 * AVISOS PRÓXIMOS - avisos.js
 * Muestra arriba de la página los reclamos de categoría AVISO cuya fecha es
 * hoy, mañana o pasado mañana. Al día siguiente de la fecha se borran solos.
 * (2.18.0) Un aviso puede durar varios días (columna "AVISO HASTA", script v39): se ve
 * todos esos días. "Fechas" muestra los avisos de cualquier período (también pasados) y
 * "Modificar" deja corregir fecha, hasta cuándo, escuela, motivo, servicio, proveedor y texto.
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
  const MOTIVOS = { CANCELACION: 'Cancelación', VIANDAS: 'Viandas', MENU: 'Menú', LOGISTICA: 'Logística', OTROS: 'Otros',
    PARO: 'Paro', CALENDARIO: 'Calendario', CUPO: 'Vuelve el cupo' };

  let avisos = [];
  // (2.18.0) Avisos de un período elegido con "Fechas" (null = los próximos)
  let periodo = null;          // { desde, hasta, lista, cargando, error }
  let filtroAbierto = false;
  const filtroVal = { desde: '', hasta: '' };
  const porClave = new Map();  // clave -> aviso (para el botón Modificar)
  const VERSION_HASTA = 39;
  const SERVICIOS = ['DESAYUNO/MERIENDA', 'COMEDOR', 'DM/COMEDOR', 'BOLSON', 'PATIOS', 'VIANDAS', 'DM MATERNAL'];
  const PROVEEDORES = ['GRUPO L', 'GYULAND', 'EDEAL', 'TINTENFISCH', 'VALBER'];
  let avisosCupo = [];        // (1.3.0) "vuelve el cupo" (vienen del script, no de la lista de reclamos)
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

  /** Los que tocan algún día de hoy a dentro de 2 días (un aviso de varios días que empezó antes
   *  se muestra en "Hoy"), ordenados por día. */
  function vigentes(lista) {
    const desde = hoyISO(), hasta = iso(sumarDias(new Date(), DIAS));
    const vistos = {};
    return (lista || []).filter(a => a && a.fecha && a.fecha <= hasta && finDe(a) >= desde)
      .filter(a => { const k = a.fila || (a.fecha + a.escuela + a.detalle); if (vistos[k]) return false; vistos[k] = 1; return true; })
      .map(a => Object.assign({}, a, { _dia: a.fecha < desde ? desde : a.fecha }))
      .sort((a, b) => a._dia.localeCompare(b._dia) || String(a.escuela).localeCompare(String(b.escuela), 'es', { numeric: true }));
  }
  /** Último día del aviso (la fecha, si dura un solo día). */
  const finDe = (a) => (a.hasta && a.hasta > a.fecha) ? a.hasta : a.fecha;
  /** "12/11" */
  const dm = (f) => { const p = String(f || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : ''; };
  const diaSemana = (f) => { const [a, m, d] = f.split('-').map(Number); return new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''); };

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
  /* (2.18.0) Varios días, Fechas y Modificar */
  .sae-avisos-rango { color: var(--av-suave); font-weight: 600; font-size: .8rem; }
  .sae-avisos-editar { margin-left: 4px; background: transparent; border: 1px solid var(--av-linea); color: var(--av-texto); border-radius: 6px;
    padding: 1px 7px; font: 600 .72rem 'Inter', system-ui, sans-serif; cursor: pointer; vertical-align: 1px; }
  .sae-avisos-editar:hover, .sae-avisos-editar:focus-visible { background: var(--av-borde); color: #1f1300; border-color: var(--av-borde); outline: none; }
  .sae-avisos-fechas { margin-left: auto; background: transparent; border: 1px solid var(--av-borde); color: var(--av-texto); border-radius: 8px;
    padding: 3px 10px; font: 600 .78rem 'Inter', system-ui, sans-serif; cursor: pointer; }
  .sae-avisos-fechas.activo, .sae-avisos-fechas:hover, .sae-avisos-fechas:focus-visible { background: var(--av-borde); color: #1f1300; outline: none; }
  .sae-avisos-fechas + .sae-avisos-ocultar, .sae-avisos-fechas + .sae-avisos-cerrar { margin-left: 0; }
  .sae-avisos-filtro { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 8px 0 2px; padding: 8px 0 4px; border-top: 1px dashed var(--av-linea); }
  .sae-avisos-filtro label { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; font-size: .8rem; }
  .sae-avisos-filtro input[type="date"] { font: inherit; font-size: .82rem; padding: 3px 6px; border: 1px solid var(--av-borde); border-radius: 6px; background: transparent; color: var(--av-texto); }
  html.dark .sae-avisos-filtro input[type="date"] { color-scheme: dark; }
  .sae-avisos-ver, .sae-avisos-volver { background: var(--av-borde); color: #1f1300; border: none; border-radius: 6px; padding: 4px 12px; font: 700 .78rem 'Inter', system-ui, sans-serif; cursor: pointer; }
  .sae-avisos-volver { background: transparent; color: var(--av-texto); border: 1px solid var(--av-borde); font-weight: 600; }
  .sae-avisos-atajos { display: inline-flex; flex-wrap: wrap; gap: 4px; }
  .sae-avisos-atajos button { background: transparent; border: none; color: var(--av-texto); text-decoration: underline; text-decoration-color: var(--av-borde);
    text-underline-offset: 2px; font: 600 .76rem 'Inter', system-ui, sans-serif; cursor: pointer; padding: 2px 4px; }
  .sae-avisos-nota { margin: 8px 0 2px; color: var(--av-suave); }
  .sae-nav .sae-avisos-pastilla.vacia { background: transparent; color: inherit; box-shadow: inset 0 0 0 1px rgba(245,165,36,.7); font-weight: 600; }
  /* Ventanita "Modificar aviso" */
  .sae-av-ed-fondo { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 99980; display: flex; align-items: center; justify-content: center; padding: 14px; }
  .sae-av-ed { background: #fff; color: #0f172a; width: 100%; max-width: 520px; max-height: 92vh; overflow: auto; border-radius: 14px; padding: 16px 18px 14px;
    box-shadow: 0 20px 50px rgba(0,0,0,.35); font: 400 .88rem/1.45 'Inter', system-ui, sans-serif; display: grid; gap: 8px; }
  html.dark .sae-av-ed { background: #1e293b; color: #e2e8f0; }
  .sae-av-ed-cab { display: flex; align-items: center; justify-content: space-between; }
  .sae-av-ed h3 { margin: 0; font-size: 1.05rem; }
  .sae-av-ed-x { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: inherit; padding: 4px 8px; border-radius: 6px; }
  .sae-av-ed-sub { margin: -6px 0 0; font-size: .78rem; opacity: .7; }
  .sae-av-ed label { display: grid; gap: 3px; font-weight: 600; font-size: .82rem; }
  .sae-av-ed label small { font-weight: 400; opacity: .7; }
  .sae-av-ed input, .sae-av-ed select, .sae-av-ed textarea { font: inherit; font-weight: 400; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 8px;
    background: transparent; color: inherit; min-height: 38px; box-sizing: border-box; width: 100%; }
  html.dark .sae-av-ed input, html.dark .sae-av-ed select, html.dark .sae-av-ed textarea { border-color: #475569; color-scheme: dark; }
  html.dark .sae-av-ed select option { background: #1e293b; }
  .sae-av-ed-fechas, .sae-av-ed-fila { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
  .sae-av-ed-ayuda { margin-top: -4px; font-size: .76rem; opacity: .75; }
  .sae-av-ed-msg { margin: 0; min-height: 0; font-size: .82rem; }
  .sae-av-ed-msg.error { color: #b91c1c; font-weight: 600; }
  html.dark .sae-av-ed-msg.error { color: #fca5a5; }
  .sae-av-ed-pie { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .sae-av-ed-pie button { border-radius: 8px; padding: 8px 16px; font: 700 .85rem 'Inter', system-ui, sans-serif; cursor: pointer; min-height: 40px; }
  .sae-av-ed-cancelar { background: transparent; border: 1px solid #cbd5e1; color: inherit; }
  .sae-av-ed-guardar { background: #e0a526; border: none; color: #1f1300; }
  .sae-av-ed-guardar:disabled { opacity: .6; cursor: wait; }
  .sae-av-listo { position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 20px); opacity: 0; transition: .25s; background: #065f46; color: #fff;
    padding: 9px 16px; border-radius: 10px; font: 600 .86rem 'Inter', system-ui, sans-serif; z-index: 99990; pointer-events: none; }
  .sae-av-listo.visible { opacity: 1; transform: translate(-50%, 0); }
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
      const dia = a._dia || a.fecha;
      if (dia !== diaPrevio) { items += `<li class="sae-avisos-dia">${esc(cuando(dia))}</li>`; diaPrevio = dia; }
      // (2.18.0) Avisos de varios días y botón Modificar
      const fin = finDe(a);
      const rango = fin !== a.fecha ? (dia !== a.fecha ? `desde el ${dm(a.fecha)} hasta el ${diaSemana(fin)} ${dm(fin)}` : `hasta el ${diaSemana(fin)} ${dm(fin)}`) : '';
      const clave = `${a.fila || ''}|${a.fecha}|${a.escuela || ''}`;
      if (a.tipo !== 'cupo' && a.fila) porClave.set(clave, a);
      const motivo = MOTIVOS[norm(a.motivo)] || (a.motivo ? a.motivo.charAt(0) + a.motivo.slice(1).toLowerCase() : 'Aviso');
      const esCupo = a.tipo === 'cupo';
      const enlace = esCupo ? `${BASE}index.html?escuela=${encodeURIComponent(a.escuela || '')}` : `${BASE}reclamos.html?escuela=${encodeURIComponent(a.escuela || '')}#buscar`;
      const det = String(a.detalle || '').trim();
      const corto = det.length > 180 ? det.slice(0, 177) + '…' : det;
      items += `<li class="sae-avisos-item"><a href="${enlace}" title="${esCupo ? 'Ver la ficha de' : 'Ver los reclamos de'} ${esc(a.escuela)}">${esc(a.escuela || 'Sin escuela')}</a>` +
        ` · <span class="sae-avisos-motivo">${esc(motivo)}</span>` +
        (rango ? ` <span class="sae-avisos-rango">(${esc(rango)})</span>` : '') +
        (corto ? ` — <span class="sae-avisos-det"${det.length > 180 ? ` title="${esc(det)}"` : ''}>${esc(corto)}</span>` : '') +
        (a.tipo !== 'cupo' && a.fila ? ` <button type="button" class="sae-avisos-editar" data-aviso="${esc(clave)}" title="Modificar este aviso (fecha, hasta cuándo, texto…)">Modificar</button>` : '') + `</li>`;
    });
    return `<ul class="sae-avisos-lista">${items}</ul>`;
  }

  /* ------------------------------------------- (2.18.0) cabecera y período */
  /** Lo que se muestra: los próximos o los del período elegido. */
  const listaActual = () => periodo ? (periodo.lista || []) : avisos;
  function htmlCab(enPanel) {
    const lista = listaActual();
    const tit = periodo ? `📣 Avisos del ${dm(periodo.desde)} al ${dm(periodo.hasta)}` : '📣 Avisos próximos';
    const n = periodo && (periodo.cargando || periodo.error) ? '' :
      `<span class="sae-avisos-n" title="${periodo ? 'Avisos de ese período' : `Avisos de hoy a ${DIAS} días`}">${lista.length}</span>`;
    const cerrar = enPanel
      ? `<button type="button" class="sae-avisos-cerrar" title="Cerrar (Esc)" aria-label="Cerrar">✕</button>`
      : `<button type="button" class="sae-avisos-ocultar" title="Ocultar (los avisos se siguen viendo tocando la pastilla 📣 de la barra)">Ocultar ▲</button>`;
    return `<div class="sae-avisos-cab"><strong>${tit}</strong>${n}` +
      `<button type="button" class="sae-avisos-fechas${filtroAbierto ? ' activo' : ''}" aria-expanded="${filtroAbierto}" title="Ver los avisos de otras fechas">Fechas</button>` +
      cerrar + `</div>` + (filtroAbierto ? htmlFiltro() : '');
  }
  function htmlFiltro() {
    const d = filtroVal.desde || (periodo && periodo.desde) || hoyISO();
    const h = filtroVal.hasta || (periodo && periodo.hasta) || iso(sumarDias(new Date(), 7));
    return `<div class="sae-avisos-filtro">` +
      `<label>Desde <input type="date" data-f="desde" value="${d}"></label>` +
      `<label>Hasta <input type="date" data-f="hasta" value="${h}"></label>` +
      `<button type="button" class="sae-avisos-ver" data-f="ver">Ver</button>` +
      `<span class="sae-avisos-atajos"><button type="button" data-atajo="semana">Esta semana</button>` +
      `<button type="button" data-atajo="prox">Semana que viene</button><button type="button" data-atajo="mes">Este mes</button>` +
      `<button type="button" data-atajo="pasado">Mes pasado</button></span>` +
      (periodo ? `<button type="button" class="sae-avisos-volver" data-f="volver">Volver a los próximos</button>` : '') + `</div>`;
  }
  function htmlCuerpo(enPanel) {
    if (periodo && periodo.cargando) return `<p class="sae-avisos-nota">Buscando los avisos…</p>`;
    if (periodo && periodo.error) return `<p class="sae-avisos-nota">⚠️ ${esc(periodo.error)}</p>`;
    const lista = listaActual();
    if (!lista.length) return `<p class="sae-avisos-nota">${periodo ? 'No hay avisos en esas fechas.' : `No hay avisos de hoy a ${DIAS} días.`}</p>`;
    if (enPanel) return htmlLista(lista);
    const visibles = verTodos ? lista : lista.slice(0, MAX_VISIBLES);
    const resto = lista.length - visibles.length;
    return htmlLista(visibles) +
      (resto > 0 ? `<button type="button" class="sae-avisos-mas">Ver ${resto === 1 ? 'el aviso restante' : `los ${resto} avisos restantes`}</button>` :
        (verTodos && lista.length > MAX_VISIBLES ? `<button type="button" class="sae-avisos-mas">Ver menos</button>` : ''));
  }
  /** Botones de la cabecera, del filtro y "Modificar" (cartel y panel). */
  function conectar(caja) {
    const f = caja.querySelector('.sae-avisos-fechas');
    if (f) f.addEventListener('click', () => { filtroAbierto = !filtroAbierto; pintar(); enfocarFiltro(); });
    const leer = () => {
      const d = caja.querySelector('[data-f="desde"]'), h = caja.querySelector('[data-f="hasta"]');
      if (d) filtroVal.desde = d.value;
      if (h) filtroVal.hasta = h.value;
    };
    caja.querySelectorAll('.sae-avisos-filtro input').forEach(i => {
      i.addEventListener('change', leer);
      i.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { leer(); verPeriodo(filtroVal.desde, filtroVal.hasta); } });
    });
    const ver = caja.querySelector('[data-f="ver"]');
    if (ver) ver.addEventListener('click', () => { leer(); verPeriodo(filtroVal.desde, filtroVal.hasta); });
    const volver = caja.querySelector('[data-f="volver"]');
    if (volver) volver.addEventListener('click', () => { periodo = null; filtroAbierto = false; filtroVal.desde = filtroVal.hasta = ''; verTodos = false; pintar(); });
    caja.querySelectorAll('[data-atajo]').forEach(b => b.addEventListener('click', () => {
      const r = atajo(b.dataset.atajo);
      filtroVal.desde = r[0]; filtroVal.hasta = r[1];
      verPeriodo(r[0], r[1]);
    }));
    caja.querySelectorAll('.sae-avisos-editar').forEach(b => b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const a = porClave.get(b.dataset.aviso);
      if (a) modificar(a);
    }));
  }
  function enfocarFiltro() {
    if (!filtroAbierto) return;
    const i = document.querySelector((panelAbierto ? '#saeAvisosPanel' : '#saeAvisos') + ' [data-f="desde"]');
    if (i) i.focus({ preventScroll: true });
  }
  /** Lunes a domingo de esta semana o la que viene, este mes o el pasado. */
  function atajo(t) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (t === 'mes') return [iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))];
    if (t === 'pasado') return [iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)), iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0))];
    const lunes = sumarDias(hoy, -((hoy.getDay() + 6) % 7) + (t === 'prox' ? 7 : 0));
    return [iso(lunes), iso(sumarDias(lunes, 6))];
  }
  /** Trae los avisos de un período (script v39; con uno más viejo, de la lista de Reclamos guardada). */
  async function verPeriodo(desde, hasta) {
    if (!desde || !hasta) { periodo = { desde: desde || hoyISO(), hasta: hasta || hoyISO(), lista: [], error: 'Elegí las dos fechas.' }; pintar(); return; }
    if (hasta < desde) { const t = desde; desde = hasta; hasta = t; }
    const dias = Math.round((new Date(hasta) - new Date(desde)) / 86400000);
    if (dias > 400) { periodo = { desde, hasta, lista: [], error: 'Elegí un período de hasta un año.' }; pintar(); return; }
    filtroVal.desde = desde; filtroVal.hasta = hasta;
    periodo = { desde, hasta, lista: [], cargando: true };
    verTodos = false;
    pintar();
    const yo = periodo;
    try {
      let lista = null;
      const v = (typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript()) ? SAE_SYNC.versionScript() : 0;
      if (v >= VERSION_HASTA) {
        const r = await SAE_SYNC.pedir('avisos', { desde, hasta });
        lista = (r.avisos || []);
        if (r.cortado) yo.nota = 'Son muchos: se muestran los primeros 1.500.';
      } else {
        // Script viejo: la lista de Reclamos guardada en este navegador (este año y el anterior)
        const c = JSON.parse(leerLS('sae-reclamos-lista-v1') || 'null');
        if (c && Array.isArray(c.filas)) lista = desdeFilasReclamos(c.filas, desde, hasta);
        else throw new Error(typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript()
          ? 'Para ver otras fechas hay que actualizar el script de Google (versión 39), o abrir una vez la página de Reclamos.'
          : 'Sin conexión con la hoja de reclamos.');
      }
      if (periodo !== yo) return;   // eligieron otro período mientras tanto
      const vistos = {};
      yo.lista = lista.filter(a => a && a.fecha && a.fecha <= hasta && finDe(a) >= desde)
        .filter(a => { const k = a.fila ? a.fila + '|' + a.tipo : (a.fecha + a.escuela + a.detalle); if (vistos[k]) return false; vistos[k] = 1; return true; })
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.escuela).localeCompare(String(b.escuela), 'es', { numeric: true }));
    } catch (e) {
      if (periodo !== yo) return;
      yo.error = (typeof SAE_SYNC !== 'undefined' && SAE_SYNC.mensajeError) ? SAE_SYNC.mensajeError(e) : String(e && e.message || e);
    }
    yo.cargando = false;
    pintar();
  }

  function pintarCartel() {
    if (MODO === 'pastilla') return;
    const caja = contenedorCartel();
    if ((!avisos.length && !periodo) || !estaAbierto()) { caja.style.display = 'none'; caja.innerHTML = ''; return; }
    caja.innerHTML = htmlCab(false) + htmlCuerpo(false) + (periodo && periodo.nota ? `<p class="sae-avisos-nota">${esc(periodo.nota)}</p>` : '');
    caja.style.display = '';
    caja.querySelector('.sae-avisos-ocultar').addEventListener('click', ocultar);
    const mas = caja.querySelector('.sae-avisos-mas');
    if (mas) mas.addEventListener('click', () => { verTodos = !verTodos; pintarCartel(); });
    conectar(caja);
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
    if (!panelAbierto) { p.style.display = 'none'; p.innerHTML = ''; return; }
    p.innerHTML = htmlCab(true) + htmlCuerpo(true) + (periodo && periodo.nota ? `<p class="sae-avisos-nota">${esc(periodo.nota)}</p>` : '');
    p.style.display = '';
    p.querySelector('.sae-avisos-cerrar').addEventListener('click', () => cerrarPanel(true));
    conectar(p);
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
      // (2.18.0) Sin avisos próximos la pastilla queda (apagada), así se pueden buscar otras fechas
      const hay = avisos.length > 0;
      if (!hay && !(typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript())) { if (b) b.remove(); return; }
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
      const txt = !hay ? 'Avisos' : avisos.length === 1 ? '1 aviso' : `${avisos.length} avisos`;
      b.classList.toggle('vacia', !hay);
      const html = `<span class="sae-avisos-pico" aria-hidden="true">📣</span><span>${txt}</span>`;
      if (b.innerHTML !== html) b.innerHTML = html;
      b.title = abierta ? 'Cerrar los avisos' : hay ? 'Ver los avisos próximos (de hoy a 2 días) o buscar otras fechas' : 'No hay avisos de hoy a 2 días: tocá para buscar otras fechas';
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
    avisosCupo = (lista || []).filter(a => a && a.tipo === 'cupo');
    avisos = vigentes(lista);
    if (guardar) guardarLS(LS_CACHE, JSON.stringify({ guardado: Date.now(), dia: hoyISO(), avisos: lista }));
    pintar();
  }

  /* ------------------------------------------ (2.18.0) modificar un aviso */
  /** En Reclamos se abre la ventana del reclamo (con "Modificar aviso"); en las otras páginas, una ventanita propia. */
  function modificar(a) {
    if (window.SAE_RECLAMOS_AVISO && SAE_RECLAMOS_AVISO.abrir(a.fila, a.huella)) { cerrarPanel(false); return; }
    abrirEditor(a);
  }
  const opcion = (v, et, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(et)}</option>`;
  const capital = (t) => String(t || '').toLowerCase().replace(/(^|[\s/])\S/g, x => x.toUpperCase());
  function abrirEditor(a) {
    cerrarEditor();
    cerrarPanel(false);
    const escuelas = (typeof SAE_DATA !== 'undefined' && SAE_DATA.escuelas) ? SAE_DATA.escuelas.map(e => e.nombre) : [];
    const motivos = Object.keys(MOTIVOS).filter(k => k !== 'CUPO');
    const mot = norm(a.motivo);
    if (mot && motivos.indexOf(mot) < 0) motivos.push(mot);
    const serv = String(a.servicio || '').toUpperCase().trim(), servs = SERVICIOS.slice();
    if (serv && servs.indexOf(serv) < 0) servs.push(serv);
    const prov = String(a.proveedor || '').toUpperCase().trim(), provs = PROVEEDORES.slice();
    if (prov && provs.indexOf(prov) < 0) provs.push(prov);
    const det = (a.huella && a.huella.detalle != null) ? String(a.huella.detalle) : String(a.detalle || '');
    const fondo = document.createElement('div');
    fondo.className = 'sae-av-ed-fondo';
    fondo.id = 'saeAvisoEditor';
    fondo.innerHTML = `<div class="sae-av-ed" role="dialog" aria-modal="true" aria-labelledby="saeAvEdTit">
      <div class="sae-av-ed-cab"><h3 id="saeAvEdTit">Modificar aviso</h3><button type="button" class="sae-av-ed-x" aria-label="Cerrar">✕</button></div>
      <p class="sae-av-ed-sub">Fila ${esc(a.fila)} de la hoja de reclamos</p>
      <div class="sae-av-ed-fechas">
        <label><span>Desde</span><input type="date" data-c="fecha" value="${esc(a.fecha)}"></label>
        <label><span>Hasta <small>(opcional)</small></span><input type="date" data-c="hasta" value="${esc(a.hasta || '')}"></label>
      </div>
      <small class="sae-av-ed-ayuda">"Hasta" vacío = solo el día de la fecha. Con "hasta", el aviso se ve todos esos días.</small>
      <label>Escuela<input type="text" data-c="escuela" list="saeAvEdEsc" value="${esc(a.escuela || '')}" autocomplete="off"></label>
      <datalist id="saeAvEdEsc">${escuelas.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="sae-av-ed-fila">
        <label>Motivo<select data-c="motivo">${motivos.map(k => opcion(k, MOTIVOS[k] || capital(k), k === mot)).join('')}</select></label>
        <label>Servicio<select data-c="servicio">${opcion('', 'Sin servicio', !serv)}${servs.map(x => opcion(x, capital(x), x === serv)).join('')}</select></label>
        <label>Proveedor<select data-c="proveedor">${opcion('', 'Sin proveedor', !prov)}${provs.map(x => opcion(x, x, x === prov)).join('')}</select></label>
      </div>
      <label>Texto del aviso<textarea data-c="detalle" rows="4">${esc(det)}</textarea></label>
      <p class="sae-av-ed-msg" role="status"></p>
      <div class="sae-av-ed-pie"><button type="button" class="sae-av-ed-cancelar">Cancelar</button><button type="button" class="sae-av-ed-guardar">Guardar cambios</button></div>
    </div>`;
    document.body.appendChild(fondo);
    const q = (c) => fondo.querySelector(`[data-c="${c}"]`);
    const msg = fondo.querySelector('.sae-av-ed-msg');
    const ajustarMin = () => { const f = q('fecha').value; q('hasta').min = f ? iso(sumarDias(new Date(f + 'T00:00'), 1)) : ''; };
    ajustarMin();
    q('fecha').addEventListener('change', ajustarMin);
    fondo.querySelector('.sae-av-ed-x').addEventListener('click', cerrarEditor);
    fondo.querySelector('.sae-av-ed-cancelar').addEventListener('click', cerrarEditor);
    fondo.addEventListener('click', (ev) => { if (ev.target === fondo) cerrarEditor(); });
    fondo.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrarEditor(); } });
    const btn = fondo.querySelector('.sae-av-ed-guardar');
    btn.addEventListener('click', async () => {
      const val = { fecha: q('fecha').value, hasta: q('hasta').value, escuela: q('escuela').value.trim(), motivo: q('motivo').value,
        servicio: q('servicio').value, proveedor: q('proveedor').value, detalle: q('detalle').value.trim() };
      const error = (t, c) => { msg.textContent = '⚠️ ' + t; msg.className = 'sae-av-ed-msg error'; if (c && q(c)) q(c).focus(); };
      if (!val.fecha) return error('Elegí la fecha del aviso.', 'fecha');
      if (val.hasta && val.hasta <= val.fecha) return error('"Hasta" tiene que ser posterior a la fecha (para un solo día, dejalo vacío).', 'hasta');
      if (!val.escuela) return error('Elegí la escuela.', 'escuela');
      if (escuelas.length && escuelas.indexOf(val.escuela) < 0 && norm(val.escuela) !== norm(a.escuela)) return error('Elegí la escuela de la lista que aparece al escribir.', 'escuela');
      if (!val.detalle) return error('El aviso no puede quedar sin texto.', 'detalle');
      const cambios = {};
      if (val.fecha !== a.fecha) cambios.fecha = val.fecha;
      if (val.hasta !== (a.hasta || '')) cambios.avisoHasta = val.hasta;
      if (norm(val.escuela) !== norm(a.escuela)) cambios.escuela = val.escuela;
      if (val.motivo !== mot) cambios.subcategoria = val.motivo;
      if (val.servicio !== serv) cambios.servicio = val.servicio;
      if (val.proveedor !== prov) cambios.proveedor = val.proveedor;
      if (val.detalle !== det.trim()) cambios.detalle = val.detalle;
      if (!Object.keys(cambios).length) { cerrarEditor(); return; }
      if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) return error('Sin conexión con la hoja de reclamos.');
      if (SAE_SYNC.versionScript() && SAE_SYNC.versionScript() < VERSION_HASTA) return error(`Para modificar avisos hay que actualizar el script de Google (versión ${VERSION_HASTA}).`);
      if (!a.huella) return error('Este aviso vino de una copia vieja: recargá la página y volvé a intentar.');
      btn.disabled = true; btn.textContent = 'Guardando…';
      msg.textContent = ''; msg.className = 'sae-av-ed-msg';
      try {
        await SAE_SYNC.enviar({ accion: 'actualizar', fila: a.fila, huella: a.huella, cambios });
        cerrarEditor();
        avisoListo(`Aviso de ${val.escuela} modificado.`);
        // Se vuelven a pedir: los próximos y, si había, el período elegido
        traer().catch(() => { /* queda lo anterior */ });
        if (periodo && !periodo.cargando) verPeriodo(periodo.desde, periodo.hasta);
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Guardar cambios';
        error(SAE_SYNC.mensajeError ? SAE_SYNC.mensajeError(e) : String(e && e.message || e));
      }
    });
    setTimeout(() => q('detalle').focus(), 30);
  }
  function cerrarEditor() {
    const f = document.getElementById('saeAvisoEditor');
    if (f) f.remove();
  }
  /** Cartelito de "listo" abajo (3 segundos). */
  function avisoListo(t) {
    let el = document.getElementById('saeAvisoListo');
    if (!el) { el = document.createElement('div'); el.id = 'saeAvisoListo'; el.className = 'sae-av-listo'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = '✔️ ' + t;
    el.classList.add('visible');
    clearTimeout(avisoListo._t);
    avisoListo._t = setTimeout(() => el.classList.remove('visible'), 3000);
  }

  /* ---------------------------------------------------- traer los avisos */
  function desdeFilasReclamos(filas, desdeP, hastaP) {
    // filas: [{ fila, v: [FECHA, ESCUELA, PROVEEDOR, SERVICIO, TIPO, CATEGORIA, Subcategoria, DETALLE, …, ESTADO(11), …, AVISO HASTA(18)] }]
    const desde = desdeP || iso(sumarDias(new Date(), -1)), hasta = hastaP || iso(sumarDias(new Date(), DIAS + 2));
    const out = [];
    (filas || []).forEach(f => {
      const v = f && f.v;
      if (!v || norm(v[5]).indexOf('AVISO') !== 0) return;
      const fecha = aISO(v[0]);
      if (!fecha) return;
      let fin = aISO(v[18]);
      if (fin && fin <= fecha) fin = '';
      if (fecha > hasta || (fin || fecha) < desde) return;
      out.push({ fila: f.fila, fecha, hasta: fin, escuela: String(v[1] || '').trim(), proveedor: v[2], servicio: v[3],
        motivo: String(v[6] || '').trim(), detalle: String(v[7] || '').trim(), estado: v[11],
        huella: { escuela: v[1], detalle: v[7], fecha: v[0], proveedor: v[2] || '', servicio: v[3] || '', categoria: v[5] || '', subcategoria: v[6] || '' } });
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
      if (c && Array.isArray(c.avisos)) { avisosCupo = c.avisos.filter(a => a && a.tipo === 'cupo'); avisos = vigentes(c.avisos); fresco = c.dia === hoyISO() && Date.now() - (c.guardado || 0) < VIGENCIA; }
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
    desdeReclamos(filas) { usar(desdeFilasReclamos(filas).concat(avisosCupo), true); },
    actualizar: () => traer(),
    lista: () => avisos.slice(),
    _vigentes: vigentes
  };
})();
if (typeof window !== 'undefined') window.SAE_AVISOS = SAE_AVISOS;
