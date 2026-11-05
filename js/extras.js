/**
 * ==========================================================================
 * EXTRAS SAE - extras.js
 * Funciones compartidas por la versión de escritorio (app.js) y la móvil (mobile.js):
 *   1. Historial de búsquedas recientes (localStorage)
 *   2. Aviso de fin de semana / feriado
 *   3. Descarga de la ficha en PDF (jsPDF, con alternativa de impresión). (2.11.0) De varias hojas,
 *      con opciones (qué incluir), entregas y reclamos.
 * Requiere que data.js (SAE_DATA) esté cargado antes.
 * ==========================================================================
 */

const SAE_EXTRAS = (function () {

  // Limpieza de datos al cargar: CUE sin ".0" y localidades unificadas.
  if (typeof SAE_DATA !== 'undefined' && Array.isArray(SAE_DATA.escuelas)) {
    // Filas de sumas de la planilla que no son establecimientos
    const NO_SON_ESCUELAS = ['BOLSON ACTUAL', 'BOLSON LIMITE', 'COMEDOR ACTUAL', 'COMEDOR LIMITE',
      'DIA', 'DM ACTUAL', 'DM LIMITE', 'TOTAL'];
    SAE_DATA.escuelas = SAE_DATA.escuelas.filter(x => NO_SON_ESCUELAS.indexOf(String(x.nombre || '').trim().toUpperCase()) < 0);

    // Destinatarios generales de reclamos ("TODAS LAS ESCUELAS", "TODOS LOS JARDINES"…):
    // no son establecimientos, así que no se muestran en el buscador (sí en Reclamos)
    SAE_DATA.escuelas = SAE_DATA.escuelas.filter(x => !/^(TODAS LAS|TODOS LOS) /i.test(String(x.nombre || '').trim()) &&
      String(x.nombre || '').trim().toUpperCase() !== 'MEDIDA DE ABRIGO');

    // (Los registros duplicados de un mismo establecimiento se unen en sync.js,
    //  que lo cargan todas las páginas, incluida Reclamos)

    SAE_DATA.escuelas.forEach(e => {
      if (e.cue !== undefined && e.cue !== null) {
        e.cue = String(e.cue).trim().replace(/\.0+$/, '');
      }
      // Localidades unificadas (por si la planilla trae variantes)
      const loc = String(e.localidad || '').trim();
      const UNIFICAR = {
        'ejercito': 'Edla', 'ejército': 'Edla',
        'l. hermosa': 'Loma Hermosa', 'l hermosa': 'Loma Hermosa',
        'ciudadela sur': 'Ciudadela', 'ciudadela norte': 'Ciudadela'
      };
      if (UNIFICAR[loc.toLowerCase()]) e.localidad = UNIFICAR[loc.toLowerCase()];
      // Proveedor de la ficha: el de sus servicios en CUPOS 2026 (columna PROVEEDOR 2026)
      const provs = [];
      (e.servicios || []).forEach(sv => {
        const pv = String(sv.proveedor || '').toUpperCase().replace(/\s+S\.?A\.?$|\s+S\.?R\.?L\.?$/, '').trim();
        if (/[A-Z]/.test(pv) && !/^\d/.test(pv) && provs.indexOf(pv) < 0) provs.push(pv);
      });
      if (provs.length) e.proveedor = provs.join(' / ');
      // Nivel "Dispositivo": UDI, EPI, Envión y Centros Esperanza (no las filas de totales)
      const nom = String(e.nombre || '').toUpperCase();
      if (/^(UDI|EPI|ENVI[OÓ]N)\s/.test(nom) || /^CENTRO .*ESPERANZA$/.test(nom)) e.tipo = 'Dispositivo';
      // CFI pasan a Especiales; los jardines maternales se llaman Escuelas Municipales
      if (/^CFI\b/.test(nom)) e.tipo = 'Especial';
      if (e.tipo === 'Jardín Maternal') e.tipo = 'Escuela Municipal';
    });
  }

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const NUM_DIA = { 'Lunes': '1', 'Martes': '2', 'Miércoles': '3', 'Jueves': '4', 'Viernes': '5' };

  function escaparHTML(txt) {
    return String(txt == null ? '' : txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fechaHoyStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseFecha(fechaStr) {
    const p = (fechaStr || '').split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return new Date();
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function fechaCorta(fechaStr) {
    const p = (fechaStr || '').split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : fechaStr;
  }

  function fechaLarga(fechaStr) {
    const p = (fechaStr || '').split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fechaStr;
  }

  /* ========================================================================
   * 1. HISTORIAL DE BÚSQUEDAS RECIENTES
   * ======================================================================== */
  const CLAVE_HISTORIAL = 'sae-recientes';
  const MAX_RECIENTES = 5;

  function idEscuela(esc) {
    return esc ? (esc.id || esc.nombre) : null;
  }

  function leerHistorial() {
    try {
      const arr = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function guardarReciente(escuela) {
    const id = idEscuela(escuela);
    if (!id) return;
    const lista = leerHistorial().filter(x => x !== id);
    lista.unshift(id);
    try {
      localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista.slice(0, MAX_RECIENTES)));
    } catch (e) { /* almacenamiento no disponible: se ignora */ }
  }

  function obtenerRecientes() {
    if (typeof SAE_DATA === 'undefined') return [];
    return leerHistorial()
      .map(id => SAE_DATA.escuelas.find(e => idEscuela(e) === id))
      .filter(Boolean);
  }

  function borrarHistorial() {
    try { localStorage.removeItem(CLAVE_HISTORIAL); } catch (e) { /* nada */ }
  }

  /**
   * Muestra las últimas escuelas consultadas dentro del desplegable del buscador.
   * Devuelve true si había algo para mostrar.
   */
  function mostrarRecientes(contenedor, alElegir) {
    const lista = obtenerRecientes();
    if (!contenedor || lista.length === 0) return false;

    contenedor.innerHTML = '';

    const cabecera = document.createElement('div');
    cabecera.className = 'recientes-header';
    cabecera.innerHTML = `<span>🕘 Últimas escuelas consultadas</span>`;
    const btnBorrar = document.createElement('button');
    btnBorrar.type = 'button';
    btnBorrar.className = 'recientes-borrar';
    btnBorrar.textContent = 'Borrar';
    btnBorrar.title = 'Borrar historial de búsquedas';
    btnBorrar.addEventListener('click', (ev) => {
      ev.stopPropagation();
      borrarHistorial();
      contenedor.innerHTML = '';
      contenedor.style.display = 'none';
    });
    cabecera.appendChild(btnBorrar);
    contenedor.appendChild(cabecera);

    lista.forEach(esc => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item reciente-item';
      const detalle = [esc.direccion, esc.localidad].filter(Boolean).join(' - ') || esc.tipo || '';
      item.innerHTML = `
        <div class="reciente-texto">
          <span class="ac-title item-title">${escaparHTML(esc.nombre)}</span>
          <span class="ac-desc item-desc">${escaparHTML(detalle)}</span>
        </div>
        <span class="reciente-flecha" aria-hidden="true">↩</span>
      `;
      item.addEventListener('click', () => {
        contenedor.style.display = 'none';
        alElegir(esc);
      });
      contenedor.appendChild(item);
    });

    contenedor.style.display = 'block';
    return true;
  }

  /* ========================================================================
   * 2. FERIADOS Y FINES DE SEMANA
   * Fuente: calendario oficial 2026 (Ley 27.399, Decreto 614/2025 y
   * Resolución 164/2025). Para años siguientes, agregar las fechas acá.
   * tipo: 'feriado' | 'no-laborable'
   * ======================================================================== */
  const FERIADOS = {
    '2026-01-01': { nombre: 'Año Nuevo', tipo: 'feriado' },
    '2026-02-16': { nombre: 'Carnaval', tipo: 'feriado' },
    '2026-02-17': { nombre: 'Carnaval', tipo: 'feriado' },
    '2026-03-23': { nombre: 'Día no laborable con fines turísticos', tipo: 'no-laborable' },
    '2026-03-24': { nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'feriado' },
    '2026-04-02': { nombre: 'Día del Veterano y de los Caídos en Malvinas', tipo: 'feriado' },
    '2026-04-03': { nombre: 'Viernes Santo', tipo: 'feriado' },
    '2026-05-01': { nombre: 'Día del Trabajador', tipo: 'feriado' },
    '2026-05-25': { nombre: 'Día de la Revolución de Mayo', tipo: 'feriado' },
    '2026-06-15': { nombre: 'Paso a la Inmortalidad del Gral. Güemes', tipo: 'feriado' },
    '2026-06-20': { nombre: 'Paso a la Inmortalidad del Gral. Belgrano', tipo: 'feriado' },
    '2026-07-09': { nombre: 'Día de la Independencia', tipo: 'feriado' },
    '2026-07-10': { nombre: 'Día no laborable con fines turísticos', tipo: 'no-laborable' },
    '2026-08-17': { nombre: 'Paso a la Inmortalidad del Gral. San Martín', tipo: 'feriado' },
    '2026-10-12': { nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'feriado' },
    '2026-11-23': { nombre: 'Día de la Soberanía Nacional', tipo: 'feriado' },
    '2026-12-07': { nombre: 'Día no laborable con fines turísticos', tipo: 'no-laborable' },
    '2026-12-08': { nombre: 'Inmaculada Concepción de María', tipo: 'feriado' },
    '2026-12-25': { nombre: 'Navidad', tipo: 'feriado' }
  };

  /**
   * Analiza una fecha (YYYY-MM-DD) y dice qué tipo de día es y qué menú corresponde.
   */
  function infoDia(fechaStr) {
    const d = parseFecha(fechaStr);
    const nombreDia = DIAS[d.getDay()];
    const esFinde = d.getDay() === 0 || d.getDay() === 6;
    const feriado = FERIADOS[fechaStr] || null;
    return {
      nombreDia,
      esFinde,
      feriado,
      // Fin de semana -> Viernes. Feriado entre semana -> se mantiene ese día.
      diaMenu: esFinde ? 'Viernes' : nombreDia
    };
  }

  /**
   * Muestra u oculta el cartelito azul según la fecha y el día que se está mostrando.
   * Si el usuario elige a mano otro día de la semana, el aviso se oculta
   * (ya no estaría mostrando el menú "automático").
   */
  function actualizarAviso(elemento, fechaStr, diaMostrado) {
    if (!elemento) return;
    const fecha = fechaStr || fechaHoyStr();
    const info = infoDia(fecha);
    const esHoy = fecha === fechaHoyStr();
    const sujeto = esHoy ? 'Hoy es' : `El ${info.nombreDia.toLowerCase()} ${fechaCorta(fecha)} es`;
    let html = '';

    if (diaMostrado && diaMostrado !== info.diaMenu) {
      elemento.style.display = 'none';
      return;
    }

    if (info.esFinde) {
      const extra = info.feriado ? ` y feriado (${escaparHTML(info.feriado.nombre)})` : '';
      html = `<span class="aviso-icono">📅</span><span>${sujeto} fin de semana${extra}, mostrando menú del <strong>viernes</strong>.</span>`;
    } else if (info.feriado) {
      const tipoTxt = info.feriado.tipo === 'feriado' ? 'feriado' : 'día no laborable';
      html = `<span class="aviso-icono">🇦🇷</span><span>${sujeto} ${tipoTxt} (${escaparHTML(info.feriado.nombre)}): ` +
             `${info.feriado.tipo === 'feriado' ? 'no hay servicio' : 'puede no haber servicio'}. ` +
             `Mostrando el menú del <strong>${info.diaMenu.toLowerCase()}</strong> como referencia.</span>`;
    }

    if (html) {
      elemento.innerHTML = html;
      elemento.className = 'aviso-dia' + (info.feriado && !info.esFinde ? ' aviso-feriado' : '');
      elemento.style.display = 'flex';
    } else {
      elemento.style.display = 'none';
    }
  }

  /* ========================================================================
   * 3. FICHA EN PDF  (2.11.0: nueva, de varias hojas)
   *  - Antes de descargar se elige qué incluir (ficha, servicios, menú, entregas, reclamos), si va sin datos
   *    de contacto, el período del "tipo de reclamos" y cuántos de los últimos reclamos. Se recuerda.
   *  - Siempre en color (blanco y negro se elige solo al imprimir).
   *  - Hoja 1: datos, servicios con cupo y último cambio, avisos próximos, menú del día de todas las
   *    prestaciones y lo que se entrega ese día y en la entrega anterior (con los reclamos de esos días).
   *  - Hoja 2: reclamos (resumen, tipo de reclamos comparado con todas las escuelas, últimos reclamos).
   * ======================================================================== */
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  let promesaJsPDF = null;
  let jsPDFFallo = false; // si ya falló (sin internet), se va directo a la impresión

  function cargarJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPDFFallo) return Promise.reject(new Error('jsPDF no disponible (sin conexión)'));
    if (promesaJsPDF) return promesaJsPDF;
    promesaJsPDF = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSPDF_URL;
      s.async = true;
      const timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
      s.onload = () => {
        clearTimeout(timer);
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF no disponible'));
      };
      s.onerror = () => { clearTimeout(timer); reject(new Error('No se pudo cargar jsPDF')); };
      document.head.appendChild(s);
    }).catch(err => { promesaJsPDF = null; jsPDFFallo = true; throw err; });
    return promesaJsPDF;
  }

  // Precarga en segundo plano para que el botón responda al instante
  window.addEventListener('load', () => {
    setTimeout(() => { cargarJsPDF().catch(() => {}); }, 1500);
  });

  function formatoNum(n) {
    return Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoDe = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const corta = (iso) => { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : String(iso || ''); };
  const capi = (t) => String(t || '').toLowerCase().replace(/(^|[\s/(])\S/g, x => x.toUpperCase());
  const compactar = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/N\s*[°º]\s*/g, '').replace(/[^A-Z0-9]/g, '').replace(/([A-Z])0+(\d)/g, '$1$2');
  const ETQ_MOT = { 'REEMPLAZOS S/A': 'Reemplazo sin aviso', 'REEMPLAZOS C/A': 'Reemplazo con aviso', 'FUERA DE HORARIO': 'Fuera de horario',
    'ENTREGA EQUIVOCADA': 'Entrega equivocada', 'ESPECIALES - ALTA': 'Especiales (alta)', 'ESPECIALES - BAJA': 'Especiales (baja)',
    'CANCELACION': 'Cancelación', 'LOGISTICA': 'Logística', 'MENU': 'Menú', 'BOLSON': 'Bolsón', 'ELECTRODOMESTICOS': 'Electrodomésticos',
    'REFRIGERACION': 'Refrigeración', 'ELECTRICIDAD': 'Electricidad', 'MOBILIARIO': 'Mobiliario', 'PLOMERIA': 'Plomería' };
  const ETQ_CAT = { 'AVISO': 'Aviso', 'MANTENIMIENTO': 'Mantenimiento', 'EQUIPAMIENTO': 'Equipamiento', 'CUPOS': 'Cupos', 'OTROS': 'Otros',
    'REEMPLAZOS C/A': 'Reemplazos con aviso', 'CONSEJO ESCOLAR': 'Consejo Escolar' };
  const etqMotivo = (cat, mot) => {
    const c = ETQ_CAT[String(cat || '').toUpperCase()] || capi(cat || 'Sin categoría'), m = mot ? (ETQ_MOT[String(mot).toUpperCase()] || capi(mot)) : 'Sin motivo';
    return String(cat || '').toUpperCase() === 'ALIMENTOS' ? m : `${c} · ${m}`;
  };

  /* ---------------------------------------------------------------- opciones */
  const LS_OPC = 'sae-pdf-opciones';
  const OPC_DEF = { ficha: true, servicios: true, menu: true, entregas: true, reclamos: true, arreglos: true, sinContacto: false, meses: '12', cuantos: '10', cuantosArr: '10' };
  function leerOpciones() {
    try { return Object.assign({}, OPC_DEF, JSON.parse(localStorage.getItem(LS_OPC) || '{}')); } catch (e) { return Object.assign({}, OPC_DEF); }
  }
  const CSS_OPC = `
  .sae-pdfo-fondo { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .sae-pdfo { background: #fff; color: #0f172a; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.35); width: 100%; max-width: 440px; max-height: 92vh; overflow-y: auto; padding: 18px; font-family: 'Inter', system-ui, sans-serif; }
  html.dark .sae-pdfo { background: #1e293b; color: #e2e8f0; }
  .sae-pdfo h3 { margin: 0 0 2px; font-size: 1.05rem; }
  .sae-pdfo > p { margin: 0 0 12px; font-size: .82rem; opacity: .75; }
  .sae-pdfo fieldset { border: 1px solid #d5dbe3; border-radius: 10px; margin: 0 0 10px; padding: 8px 12px 10px; }
  html.dark .sae-pdfo fieldset { border-color: #334155; }
  .sae-pdfo legend { font-weight: 700; font-size: .82rem; padding: 0 4px; }
  .sae-pdfo label.ch { display: flex; align-items: center; gap: 8px; font-size: .86rem; padding: 4px 0; cursor: pointer; }
  .sae-pdfo label.ch input { width: 18px; height: 18px; }
  .sae-pdfo .fila { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
  .sae-pdfo .fila label { display: flex; flex-direction: column; gap: 3px; font-size: .76rem; font-weight: 600; opacity: .85; }
  .sae-pdfo select { padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 8px; font: 500 .85rem 'Inter', system-ui, sans-serif; background: #fff; color: inherit; }
  html.dark .sae-pdfo select { background: #0f172a; border-color: #334155; }
  .sae-pdfo small { display: block; font-size: .72rem; opacity: .7; margin-top: 4px; }
  .sae-pdfo .pie { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  .sae-pdfo .pie button { border-radius: 9px; padding: 8px 14px; font: 600 .86rem 'Inter', system-ui, sans-serif; cursor: pointer; border: 1px solid #cbd5e1; background: transparent; color: inherit; }
  .sae-pdfo .pie button.ok { background: var(--primary, var(--primary-color, #163c68)); border-color: transparent; color: #fff; }
  .sae-pdfo .pie button.ok:hover:not(:disabled) { background: var(--primary-hover, var(--primary-dark, #0e2a49)); }   /* (2.11.1) mismo color que "Sincronizar" */
  .sae-pdfo .pie button:disabled { opacity: .5; cursor: default; }`;
  /** Ventana para elegir qué incluir. Devuelve las opciones o null si se canceló. */
  function elegirOpciones(nombreEscuela, hayReclamos) {
    if (!document.getElementById('saePdfOpcCSS')) {
      const st = document.createElement('style'); st.id = 'saePdfOpcCSS'; st.textContent = CSS_OPC; document.head.appendChild(st);
    }
    const o = leerOpciones();
    return new Promise((resolve) => {
      const fondo = document.createElement('div');
      fondo.className = 'sae-pdfo-fondo';
      fondo.setAttribute('role', 'dialog'); fondo.setAttribute('aria-modal', 'true');
      const ch = (k, t) => `<label class="ch"><input type="checkbox" data-k="${k}"${o[k] ? ' checked' : ''}> ${t}</label>`;
      const sel = (k, ops) => `<select data-k="${k}">${ops.map(([v, t]) => `<option value="${v}"${String(o[k]) === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
      fondo.innerHTML = `<div class="sae-pdfo">
        <h3>📄 Ficha en PDF</h3><p>${escaparHTML(nombreEscuela)} · se descarga en color</p>
        <fieldset><legend>Qué incluir</legend>
          ${ch('ficha', 'Datos de la escuela')}
          <div style="padding-left:26px">${ch('sinContacto', 'Sin datos de contacto (directora, teléfono, mail)')}</div>
          ${ch('servicios', 'Servicios y cupos')}
          ${ch('menu', 'Menú del día')}
          ${ch('entregas', 'Qué se entrega ese día y la entrega anterior')}
          ${ch('reclamos', 'Reclamos')}
          ${window.SAE_ENTREGADO ? ch('arreglos', 'Entregas y arreglos (compras, equipamiento, gas, electricidad…)') : ''}
        </fieldset>
        <fieldset data-rec><legend>Reclamos</legend>
          <div class="fila">
            <label>Período para el tipo de reclamos ${sel('meses', [['3', 'últimos 3 meses'], ['6', 'últimos 6 meses'], ['12', 'últimos 12 meses'], ['anio', 'este año']])}</label>
            <label>Últimos reclamos ${sel('cuantos', [['5', '5'], ['10', '10'], ['20', '20'], ['todos', 'Todos los del período']])}</label>
          </div>
          ${hayReclamos ? '' : '<small>⚠️ En esta compu no se entró a Reclamos con la clave: esa parte va a decir que no está disponible.</small>'}
        </fieldset>
        ${window.SAE_ENTREGADO ? `<fieldset data-arr><legend>Entregas y arreglos</legend>
          <div class="fila"><label>Cuántos ${sel('cuantosArr', [['5', 'los últimos 5'], ['10', 'los últimos 10'], ['20', 'los últimos 20'], ['todos', 'todos']])}</label></div>
        </fieldset>` : ''}
        <div class="pie"><button type="button" data-a="cancelar">Cancelar</button><button type="button" class="ok" data-a="ok">Descargar PDF</button></div>
      </div>`;
      const q = (s) => fondo.querySelector(s);
      const leer = () => {
        const r = {};
        fondo.querySelectorAll('[data-k]').forEach(el => { r[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; });
        return r;
      };
      const pintar = () => {
        const r = leer();
        q('[data-rec]').style.opacity = r.reclamos ? '' : '.5';
        fondo.querySelectorAll('[data-rec] select').forEach(s => { s.disabled = !r.reclamos; });
        q('[data-k="sinContacto"]').disabled = !r.ficha;
        if (q('[data-arr]')) { q('[data-arr]').style.opacity = r.arreglos ? '' : '.5'; q('[data-arr] select').disabled = !r.arreglos; }
        q('[data-a="ok"]').disabled = !['ficha', 'servicios', 'menu', 'entregas', 'reclamos', 'arreglos'].some(k => r[k]);
      };
      const cerrar = (val) => { fondo.remove(); document.removeEventListener('keydown', tecla); resolve(val); };
      const tecla = (ev) => { if (ev.key === 'Escape') cerrar(null); };
      fondo.addEventListener('change', pintar);
      q('[data-a="cancelar"]').addEventListener('click', () => cerrar(null));
      q('[data-a="ok"]').addEventListener('click', () => {
        const r = leer();
        try { localStorage.setItem(LS_OPC, JSON.stringify(r)); } catch (e) { /* nada */ }
        cerrar(r);
      });
      let empezo = false;
      fondo.addEventListener('mousedown', (ev) => { empezo = ev.target === fondo; });
      fondo.addEventListener('click', (ev) => { if (empezo && ev.target === fondo) cerrar(null); });
      document.addEventListener('keydown', tecla);
      document.body.appendChild(fondo);
      pintar();
      setTimeout(() => q('[data-a="ok"]').focus(), 30);
    });
  }

  /* ------------------------------------------------------------ cálculos */
  /** Último cambio de cupo hasta la fecha: { desde: iso, antes: n } o null. */
  function ultimoCambioCupo(servicio, iso) {
    const c = (servicio && servicio.cupos) || {};
    const fechas = Object.keys(c).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= iso).sort();
    for (let i = fechas.length - 1; i > 0; i--) {
      const a = Number(c[fechas[i]]) || 0, b = Number(c[fechas[i - 1]]) || 0;
      if (Math.round(a) !== Math.round(b)) return { desde: fechas[i], antes: Math.round(b) };
    }
    return null;
  }

  /** Lo que se entrega a la escuela en la fecha iso (misma lógica que "Qué se entrega hoy"). */
  function entregaDelDia(esc, iso, nivel, semana) {
    const E = window.SAE_ENTREGAS;
    const out = { fecha: iso, dias: [], notas: [] };
    if (!E || typeof SAE_MENUS === 'undefined') return out;
    const wd = E.fechaDe(iso).getDay();
    if (wd === 0 || wd === 6) { out.notas.push('Fin de semana: no hay entregas.'); return out; }
    const porDia = {};
    (esc.servicios || []).forEach(sv => {
      if (SAE_MENUS.sinMenu(sv.servicio)) return;
      const grupo = SAE_MENUS.grupoDeServicio(sv.servicio);
      const prov = sv.proveedor || esc.proveedor || '';
      const provTxt = (window.SAE_PROV && SAE_PROV.nombre) ? SAE_PROV.nombre(prov) : prov;
      const ds = E.destinos(prov, iso);
      if (ds === null) return;
      if (!ds.length) { const t = `${provTxt} no entrega ese día.`; if (out.notas.indexOf(t) < 0) out.notas.push(t); return; }
      ds.forEach(T => {
        if (FERIADOS[T]) { const t = `${E.diaTexto(T)}: ${FERIADOS[T].nombre} (no se cuenta).`; if (out.notas.indexOf(t) < 0) out.notas.push(t); return; }
        const cupo = Math.round(SAE_MENUS.cupoEnFecha(sv, T));
        if (cupo <= 0) return;
        const b = SAE_MENUS.bloques(Object.assign({}, esc, { servicios: [sv] }), grupo, E.nombreDia(T), T)[0];
        if (!b || b.sinEntrega) return;
        const listas = b.listas.filter(Boolean);
        const sem = E.otraSemana(iso, T) ? 1 - semana : semana;
        const l = listas[Math.min(sem, listas.length - 1)];
        if (!l) return;
        const items = [];
        (l.ingredientes || []).forEach(ing => {
          const crudo = (ing[nivel] !== undefined && ing[nivel] !== null && !b.gramajeFijo) ? ing[nivel] : ing.jardin;
          if (SAE_MENUS.esCantidadNecesaria(crudo)) { items.push([ing.alimento, 'a granel', '']); return; }
          const r = Number(crudo) || 0;
          if (!r) return;
          const unid = ing.unidad === 'u' || ing.unidad === 'saquito';
          const tot = unid ? r * cupo : r * cupo / 1000;
          const u = ing.unidad === 'ml' ? 'L' : unid ? 'u' : 'kg';
          const env = typeof SAE_CALC !== 'undefined' ? SAE_CALC.envase(ing.alimento, tot, ing.unidad) : null;
          items.push([ing.alimento, `${formatoNum(tot)} ${u}`, env ? env.txt : '']);
        });
        (porDia[T] = porDia[T] || []).push({ titulo: `${b.prestacion} · ${provTxt} · ${l.lista || ''} (${cupo} raciones)`, items });
      });
    });
    out.dias = Object.keys(porDia).sort().map(T => ({ T, texto: E.diaTexto(T), prest: porDia[T] }));
    return out;
  }
  /** Fecha de la entrega anterior (el último día hábil antes de iso en que algún proveedor de la escuela entrega). */
  function entregaAnteriorFecha(esc, iso) {
    const E = window.SAE_ENTREGAS;
    if (!E) return '';
    const provs = (esc.servicios || []).filter(sv => typeof SAE_MENUS === 'undefined' || !SAE_MENUS.sinMenu(sv.servicio))
      .map(sv => sv.proveedor || esc.proveedor || '');
    const d = E.fechaDe(iso);
    for (let k = 1; k <= 12; k++) {
      d.setDate(d.getDate() - 1);
      const x = isoDe(d), wd = d.getDay();
      if (wd === 0 || wd === 6 || FERIADOS[x]) continue;
      if (provs.some(p => (E.destinos(p, x) || []).length)) return x;
    }
    return '';
  }

  /** Reclamos de la escuela y de todas (para comparar). null si no se pueden leer. */
  async function datosReclamos(esc, opc, iso, pedido) {
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript() || !SAE_SYNC.hayClave()) return { ok: false, msg: 'No disponible: en esta compu no se entró a Reclamos con la clave.' };
    let todos;
    // (2.11.2) Se espera a la hoja como mucho 10 s (con Reclamos marcado) o 2 s (solo para avisos y reincidente)
    const tope = opc.reclamos ? 10000 : 2000;
    try {
      todos = await Promise.race([pedido || SAE_SYNC.cargarReclamos(false, { rapido: true }),
        new Promise((res) => setTimeout(() => res('TARDE'), tope))]);
    } catch (e) { return { ok: false, msg: 'No se pudieron leer los reclamos (' + (e && e.message ? e.message : e) + ').' }; }
    if (todos === 'TARDE') return { ok: false, msg: 'La hoja de reclamos tardó demasiado en responder: este PDF salió sin los reclamos. Probá de nuevo en un rato.' };
    if (!Array.isArray(todos)) return { ok: false, msg: 'No se pudieron leer los reclamos.' };
    const fecha = (t) => { let m = String(t || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { let a = +m[3]; if (a < 100) a += 2000; return new Date(a, +m[2] - 1, +m[1]); } m = String(t || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const claves = [esc.nombre].concat(esc.alias || []).map(compactar);
    const lista = todos.map(r => Object.assign({ f: fecha(r.fecha) }, r)).filter(r => r.f);
    const deEsta = lista.filter(r => claves.indexOf(compactar(r.escuela)) >= 0).sort((a, b) => (b.f - a.f) || (b.fila - a.fila));
    const hoy = new Date(); hoy.setHours(23, 59, 59, 0);
    const ini = new Date(); ini.setHours(0, 0, 0, 0);
    let periodoTxt, meses;
    if (opc.meses === 'anio') { ini.setMonth(0, 1); periodoTxt = `este año (${ini.getFullYear()})`; meses = hoy.getMonth() + 1; }
    else { meses = Number(opc.meses) || 12; ini.setMonth(ini.getMonth() - meses); ini.setDate(ini.getDate() + 1); periodoTxt = `últimos ${meses} meses (desde ${corta(isoDe(ini))})`; }
    const hora = SAE_SYNC.horaReclamos ? SAE_SYNC.horaReclamos() : 0;
    if (hora && Date.now() - hora > 10 * 60 * 1000) { const d = new Date(hora); periodoTxt += ` · datos del ${corta(isoDe(d))} a las ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
    const enPer = (r) => r.f >= ini && r.f <= hoy && String(r.categoria || '').toUpperCase() !== 'AVISO';
    const mios = deEsta.filter(enPer), todasPer = lista.filter(enPer);
    const contar = (arr) => { const o = {}; arr.forEach(r => { const k = etqMotivo(r.categoria, r.motivo); o[k] = (o[k] || 0) + 1; }); return o; };
    const cM = contar(mios), cT = contar(todasPer);
    const tipos = Object.entries(cM).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ etq: k, n, pct: n / mios.length * 100, pctTodas: todasPer.length ? (cT[k] || 0) / todasPer.length * 100 : 0 }));
    const sinRes = deEsta.filter(r => /PENDIENTE|GESTI/i.test(r.estado || '') && String(r.categoria || '').toUpperCase() !== 'AVISO');
    // Reincidente: reclamos en 5 o más de los últimos 6 meses de clase (marzo a diciembre)
    const mesesClase = [];
    const m0 = new Date(); m0.setDate(1); m0.setMonth(m0.getMonth() - 1);   // meses completos (como en el Resumen)
    while (mesesClase.length < 6) { if (m0.getMonth() >= 2) mesesClase.push(`${m0.getFullYear()}-${m0.getMonth()}`); m0.setMonth(m0.getMonth() - 1); }
    const conRec = new Set(deEsta.filter(r => String(r.categoria || '').toUpperCase() !== 'AVISO').map(r => `${r.f.getFullYear()}-${r.f.getMonth()}`));
    const reinc = mesesClase.filter(k => conRec.has(k)).length;
    const n = opc.cuantos === 'todos' ? mios.length : Number(opc.cuantos) || 10;
    const ultimos = (opc.cuantos === 'todos' ? mios : deEsta.filter(r => String(r.categoria || '').toUpperCase() !== 'AVISO')).slice(0, n);
    // Avisos de los próximos 7 días y reclamos de los días de entrega
    const fin7 = new Date(); fin7.setDate(fin7.getDate() + 7);
    const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
    const avisos = deEsta.filter(r => String(r.categoria || '').toUpperCase() === 'AVISO' && r.f >= hoy0 && r.f <= fin7).sort((a, b) => a.f - b.f);
    const delDia = (x) => deEsta.filter(r => isoDe(r.f) === x && String(r.categoria || '').toUpperCase() !== 'AVISO');
    return { ok: true, periodoTxt, total: mios.length, porMes: mios.length / Math.max(1, meses), sinResolver: sinRes.length,
      tipos, ultimos, reincidente: reinc >= 5 ? reinc : 0, avisos, delDia, totalTodas: todasPer.length };
  }

  /** Arma toda la información que va en la ficha, independiente del formato. */
  async function armarContenido(datos, opc, pedido) {
    const esc = datos.escuela;
    const nivel = datos.nivel || (typeof SAE_CALC !== 'undefined' ? SAE_CALC.nivelDe(esc) : 'primaria');
    const nivelTxt = { jardin: 'Jardín', primaria: 'Primaria', secundaria: 'Secundaria' }[nivel] || nivel;
    const iso = datos.fecha;
    const fechaMenu = datos.fechaMenu || iso;
    const rec = opc.reclamos || opc.entregas || opc.ficha ? await datosReclamos(esc, opc, iso, pedido) : { ok: false };
    // (2.16.0) Entregas y arreglos (sin montos)
    const arreglos = opc.arreglos && window.SAE_ENTREGADO ? await SAE_ENTREGADO.paraPdf(esc, opc.cuantosArr || '10') : null;

    const servicios = (esc.servicios || []).map(s => {
      const cupo = Math.round(typeof SAE_MENUS !== 'undefined' ? SAE_MENUS.cupoEnFecha(s, iso) : 0);
      const ca = ultimoCambioCupo(s, iso);
      const cob = typeof SAE_CALC !== 'undefined' ? SAE_CALC.cobertura(cupo, esc) : null;
      return { nombre: s.servicio || '-', proveedor: s.proveedor || esc.proveedor || '-', cupo,
        cambio: ca ? `desde ${corta(ca.desde)} (antes ${ca.antes})` : '',
        cob: cob ? `${cob.pct} %${cob.clase === 'bajo' ? ' (bajo)' : cob.clase === 'alto' ? ' (alto)' : ''}` : '' };
    });

    // Menú del día: todas las prestaciones (DM, Comedor, Refuerzo…) con el cupo de cada una
    const menu = [];
    if (typeof SAE_MENUS !== 'undefined') {
      const grupos = ['DM'].concat(SAE_MENUS.tieneComedor(esc) ? ['COMEDOR'] : []);
      grupos.forEach(gr => {
        SAE_MENUS.bloques(esc, gr, datos.dia, fechaMenu).forEach(b => {
          const cupo = Math.round(SAE_MENUS.cupoEnFecha(b.servicioRef, iso));
          if (b.sinEntrega) { menu.push({ titulo: `${b.prestacion}: ${b.sinEntrega}`, filas: [] }); return; }
          b.listas.filter(Boolean).forEach(l => menu.push({
            titulo: `${b.prestacion} · ${l.lista || 'Lista'}: ${l.nombre || ''} (${cupo} raciones)${l._ajustado ? ' · con ajustes' : ''}`,
            filas: (l.ingredientes || []).filter(ing => ing[nivel] !== 0).map(ing => {
              let racion = (ing[nivel] !== undefined && !b.gramajeFijo) ? ing[nivel] : ing.jardin;
              if (racion === undefined) racion = ing.primaria !== undefined ? ing.primaria : 0;
              const unidad = ing.unidad || 'g';
              const nombre = (ing.alimento || ing.nombre || '-') + (ing._ajuste ? ' *' : '');
              if (typeof racion === 'string' && !/^\s*\d/.test(racion)) return [nombre, racion, 'a granel'];
              const bruto = racion * cupo;
              const total = unidad === 'g' ? `${formatoNum(bruto / 1000)} kg` : (unidad === 'ml' || unidad === 'cc') ? `${formatoNum(bruto / 1000)} L` : `${formatoNum(Math.ceil(bruto))} u.`;
              return [nombre, `${formatoNum(racion)} ${unidad}`, total];
            })
          }));
        });
      });
    }

    // Entregas: ese día y la anterior
    let semana = 0;
    try { semana = localStorage.getItem('sae-totales-semana') === '1' ? 1 : 0; } catch (e) { /* nada */ }
    const entregas = [];
    if (opc.entregas) {
      const E = window.SAE_ENTREGAS;
      const hoyE = entregaDelDia(esc, iso, nivel, semana);
      hoyE.titulo = `Entrega del ${E ? E.diaTexto(iso) : corta(iso)}`;
      entregas.push(hoyE);
      const ant = entregaAnteriorFecha(esc, iso);
      if (ant) {
        const semAnt = E && E.otraSemana(iso, ant) ? 1 - semana : semana;
        const a = entregaDelDia(esc, ant, nivel, semAnt);
        a.titulo = `Entrega anterior: ${E ? E.diaTexto(ant) : corta(ant)}`;
        entregas.push(a);
      }
      entregas.forEach(x => { x.reclamos = rec.ok ? rec.delDia(x.fecha).map(r => `${etqMotivo(r.categoria, r.motivo)}: ${String(r.detalle || '').slice(0, 110)}`) : []; });
    }

    // Horario de entrega acordado (excepciones cargadas en Reclamos)
    const horarios = [];
    try {
      const aj = (window.SAE_AJUSTES ? SAE_AJUSTES.todos() : []).filter(a => a.tipo === 'horario' && a.modo === 'exc' && (!a.hasta || a.hasta >= iso) &&
        ((a.alcance && (a.alcance.escuelas || []).some(n => compactar(n) === compactar(esc.nombre))) ||
         (a.alcance && a.alcance.modo === 'proveedor' && (esc.servicios || []).some(s => compactar(s.proveedor).indexOf(compactar(a.alcance.proveedor)) === 0))));
      aj.forEach(a => horarios.push(`${String(a.inicio).replace(/^0/, '')} a ${String(a.fin).replace(/^0/, '')} · ${!a.hasta ? 'desde el ' + corta(a.desde) : a.hasta === a.desde ? 'el ' + corta(a.desde) : 'del ' + corta(a.desde) + ' al ' + corta(a.hasta)}${a.alcance.modo === 'proveedor' ? ' (todas las de ' + a.alcance.proveedor + ')' : ''}`));
    } catch (e) { /* sin ajustes */ }

    const comparte = (esc.comparte_edificio || '').trim();
    const mat = typeof SAE_CALC !== 'undefined' ? SAE_CALC.matricula(esc) : null;   // (2.12.0)
    const etiquetas = [];
    if (rec.ok && rec.reincidente) etiquetas.push(`REINCIDENTE: reclamos en ${rec.reincidente} de los últimos 6 meses de clase`);
    return {
      opc,
      nombre: esc.nombre || '-',
      meta: [
        `CUE: ${esc.cue ? String(esc.cue).replace(/\.0+$/, '') : '-'}`,
        esc.tipo || null,
        esc.zona ? `Zona ${esc.zona}` : null,
        esc.proveedor ? `Proveedor: ${esc.proveedor}` : null,
        mat ? `${mat.texto}${mat.turnos ? ` (${mat.turnos})` : ''}` : null
      ].filter(Boolean).join('   |   '),
      matricula: mat,
      etiquetas,
      localizacion: [
        ['Dirección', esc.direccion || '-'],
        ['Localidad', esc.localidad || 'Tres de Febrero'],
        ...(comparte && comparte.toUpperCase() !== 'NO' ? [['Comparte con', comparte]] : [])
      ],
      contacto: opc.sinContacto ? null : [
        [esc.cargo || 'Directora', esc.directora || '-'],
        ['Teléfono', esc.telefono || '-'],
        ['Email', esc.email || '-']
      ],
      horarios,
      avisos: rec.ok ? rec.avisos.map(a => [corta(isoDe(a.f)), a.motivo ? (ETQ_MOT[String(a.motivo).toUpperCase()] || capi(a.motivo)) : 'Aviso', String(a.detalle || '')]) : [],
      servicios,
      menuTitulo: `Menú del ${String(datos.dia || '').toLowerCase()} ${corta(fechaMenu)}`,
      menuSub: `Raciones según el cupo vigente; gramaje de ${nivelTxt}. Totales estimativos.${menu.some(l => /\*/.test(JSON.stringify(l.filas))) ? ' * = con un ajuste de menú cargado.' : ''}`,
      menu,
      entregas,
      reclamos: rec.ok ? {
        ok: true, periodoTxt: rec.periodoTxt, total: rec.total, porMes: rec.porMes, sinResolver: rec.sinResolver, tipos: rec.tipos,
        totalTodas: rec.totalTodas,
        ultimosTitulo: opc.cuantos === 'todos' ? `Reclamos del período (${rec.ultimos.length})` : `Últimos ${rec.ultimos.length} reclamos`,
        // (2.11.4) Debajo del detalle, las acciones tomadas (si hay)
        ultimos: rec.ultimos.map(r => [corta(isoDe(r.f)), etqMotivo(r.categoria, r.motivo), capi(r.estado || 'Sin estado'),
          String(r.detalle || '').trim() + (String(r.acciones || '').trim() ? '\nAcción: ' + String(r.acciones).trim() : '')])
      } : { ok: false, msg: rec.msg || 'No disponible.' },
      arreglos,
      fechaConsulta: fechaLarga(iso),
      archivo: `Ficha_SAE_${(esc.nombre || 'escuela').replace(/[^\w\-]+/g, '_')}_${iso}.pdf`
    };
  }

  /* ------------------------------------------------------------ dibujo (jsPDF) */
  function dibujarPDF(JsPDF, c) {
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const AZUL = [22, 60, 104], AZUL_OSC = [14, 42, 73], NARANJA = [246, 147, 33];
    const TXT = [0, 13, 29], GRIS = [71, 85, 105], BORDE = [226, 230, 236], CLARO = [224, 238, 255], CLARO2 = [244, 247, 251];
    const M = 15, ANCHO = 210 - 2 * M, TOPE = 278;
    const lh = (t) => t * 0.42;
    const o = c.opc;
    let y;

    function cabeceraGrande() {
      doc.setFillColor(...AZUL); doc.rect(0, 0, 210, 20, 'F');
      doc.setFillColor(...NARANJA); doc.rect(0, 20, 210, 1.4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Servicio Alimentario Escolar', M, 9.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Municipalidad de Tres de Febrero', M, 15);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('FICHA DE ESTABLECIMIENTO', 210 - M, 9.5, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Fecha de consulta: ${c.fechaConsulta}`, 210 - M, 15, { align: 'right' });
      y = 30;
    }
    function cabeceraChica() {
      doc.setFillColor(...AZUL); doc.rect(0, 0, 210, 11, 'F');
      doc.setFillColor(...NARANJA); doc.rect(0, 11, 210, 0.9, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
      doc.text(doc.splitTextToSize(c.nombre, 120)[0], M, 7.3);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text(`Ficha SAE · ${c.fechaConsulta}`, 210 - M, 7.3, { align: 'right' });
      y = 20;
    }
    const nuevaPagina = () => { doc.addPage(); cabeceraChica(); };
    const necesito = (h) => { if (y + h > TOPE) { nuevaPagina(); return true; } return false; };
    /* (2.11.1) Se aprovecha el lugar: un bloque (menú, día de entrega) sigue en la hoja aunque no entre entero, y la
     * tabla se corta repitiendo el encabezado. Solo pasa a la hoja siguiente si en esta quedaría apenas el título y
     * un par de renglones (menos de 45 mm libres). */
    const mantenerJunto = (h) => { if (y + h > TOPE && TOPE - y < Math.min(h, 45)) nuevaPagina(); };
    const altoLineas = (t, tam, ancho) => { doc.setFontSize(tam); return doc.splitTextToSize(String(t), ancho).length * lh(tam); };
    /** Alto aproximado de una tabla (encabezado + filas, con las columnas de texto que pueden ocupar varias líneas). */
    const altoTabla = (cols, filas, tam) => {
      tam = tam || 8.6; doc.setFontSize(tam);
      let h = 6 + 3;
      filas.forEach(f => {
        let ls = 1;
        cols.forEach((cl, i) => { if (!cl.der) { let n = doc.splitTextToSize(String(f[i] == null ? '' : f[i]), cl.w - 4).length; if (cl.max) n = Math.min(n, cl.max); ls = Math.max(ls, n); } });
        h += Math.max(6, ls * lh(tam) + 2.4);
      });
      return h;
    };
    const COLS_MENU = [{ t: 'Alimento', w: 100 }, { t: 'Ración', w: 40, der: true }, { t: 'Total estimado', w: 40, der: true, neg: true }];
    const COLS_ENT = [{ t: 'Alimento', w: 92 }, { t: 'Total', w: 36, der: true, neg: true }, { t: 'Envases', w: 52 }];
    const COLS_ULT = [{ t: 'Fecha', w: 18 }, { t: 'Motivo', w: 38 }, { t: 'Estado', w: 22 }, { t: 'Detalle y acciones tomadas', w: 102, max: 6 }];
    const altoDia = (d) => altoLineas('Para el ' + d.texto, 9.2, ANCHO) + 1.5 +
      d.prest.reduce((a, p) => a + altoLineas(p.titulo, 8.6, ANCHO) + 1.5 + (p.items.length ? altoTabla(COLS_ENT, p.items, 8.2) : 0), 0);
    function titulo(t, sub) {
      necesito(18);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...AZUL);
      doc.text(t, M, y); y += 1.5;
      doc.setDrawColor(...NARANJA); doc.setLineWidth(0.6); doc.line(M, y, M + 22, y);
      y += 5;
      if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); const l = doc.splitTextToSize(sub, ANCHO); doc.text(l, M, y); y += l.length * lh(8.5) + 2.5; }
    }
    function texto(t, tam, estilo, color) {
      doc.setFont('helvetica', estilo || 'normal'); doc.setFontSize(tam || 9); doc.setTextColor(...(color || TXT));
      const l = doc.splitTextToSize(String(t), ANCHO);
      necesito(l.length * lh(tam || 9) + 1);
      doc.text(l, M, y); y += l.length * lh(tam || 9) + 1.5;
    }
    /** Tabla con corte de hoja (repite el encabezado). cols: [{ t, w, der, neg, max }] */
    function tabla(cols, filas, opcT) {
      opcT = opcT || {};
      const tam = opcT.tam || 8.6, filaH = 6;
      const cab = () => {
        doc.setFillColor(...CLARO); doc.rect(M, y - 4.2, ANCHO, filaH, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(tam); doc.setTextColor(...AZUL_OSC);
        let x = M + 2;
        cols.forEach(cl => { doc.text(cl.t, cl.der ? x + cl.w - 4 : x, y, cl.der ? { align: 'right' } : undefined); x += cl.w; });
        y += filaH;
      };
      necesito(filaH * 2 + 2);
      cab();
      doc.setFontSize(tam);
      filas.forEach((f, iF) => {
        const celdas = cols.map((cl, i) => {
          let tx = String(f[i] == null ? '' : f[i]);
          let ls = cl.der ? [tx] : doc.splitTextToSize(tx, cl.w - 4);
          if (cl.max && ls.length > cl.max) { ls = ls.slice(0, cl.max); ls[cl.max - 1] = ls[cl.max - 1].replace(/\s*\S*$/, '') + '…'; }
          return ls;
        });
        const lineas = Math.max(...celdas.map(x => x.length));
        const alto = Math.max(filaH, lineas * lh(tam) + 2.4);
        if (y - 4.2 + alto > TOPE) { nuevaPagina(); cab(); doc.setFontSize(tam); }
        if (opcT.cebra && iF % 2 === 1) { doc.setFillColor(...CLARO2); doc.rect(M, y - 4.2, ANCHO, alto, 'F'); }
        const colorF = opcT.colores ? opcT.colores[iF] : null;   // (2.16.0) franja de color por fila y el tipo en ese color
        if (colorF) { doc.setFillColor(...colorF); doc.rect(M, y - 4.2, 1.3, alto, 'F'); }
        let x = M + 2;
        cols.forEach((cl, i) => {
          doc.setFont('helvetica', cl.neg || (colorF && i === opcT.colorCol) ? 'bold' : 'normal');
          doc.setTextColor(...(colorF && i === opcT.colorCol ? colorF : TXT));
          doc.text(celdas[i], cl.der ? x + cl.w - 4 : x, y, cl.der ? { align: 'right' } : undefined);
          x += cl.w;
        });
        doc.setDrawColor(...BORDE); doc.setLineWidth(0.2);
        doc.line(M, y - 4.2 + alto, M + ANCHO, y - 4.2 + alto);
        y += alto;
      });
      y += 3;
    }

    cabeceraGrande();
    // ---------- Datos de la escuela
    doc.setTextColor(...TXT); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    const nl = doc.splitTextToSize(c.nombre, ANCHO);
    doc.text(nl, M, y + 2); y += nl.length * lh(18) + 3;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
    doc.text(doc.splitTextToSize(c.meta, ANCHO), M, y); y += lh(9.5) + 3;
    c.etiquetas.forEach(et => {
      doc.setFillColor(...NARANJA); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      const w = doc.getTextWidth(et) + 6;
      doc.roundedRect(M, y - 3.8, w, 5.6, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255); doc.text(et, M + 3, y); y += 7;
    });
    if (o.ficha) {
      const colW = c.contacto ? (ANCHO - 6) / 2 : ANCHO;
      const bloque = (x, tit, pares) => {
        let yy = y + 6;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...AZUL); doc.text(tit, x + 4, yy);
        yy += lh(10.5) + 1.5;
        pares.forEach(([k, v]) => {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRIS); doc.text(`${k}:`, x + 4, yy); yy += lh(9);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(...TXT);
          const ls = doc.splitTextToSize(String(v), colW - 8); doc.text(ls, x + 4, yy); yy += ls.length * lh(9) + 1.8;
        });
        return yy;
      };
      const pares1 = c.localizacion.concat(c.horarios.length ? [['Horario de entrega acordado', c.horarios.join(' · ')]] : []);
      const f1 = bloque(M, 'Localización', pares1);
      const f2 = c.contacto ? bloque(M + colW + 6, 'Directivos y contacto', c.contacto) : f1;
      const alto = Math.max(f1, f2) - y + 1;
      doc.setDrawColor(...BORDE); doc.setLineWidth(0.3);
      doc.roundedRect(M, y, colW, alto, 2, 2, 'S');
      doc.setFillColor(...NARANJA); doc.rect(M, y + 2, 1, alto - 4, 'F');
      if (c.contacto) { doc.roundedRect(M + colW + 6, y, colW, alto, 2, 2, 'S'); doc.rect(M + colW + 6, y + 2, 1, alto - 4, 'F'); }
      y += alto + 7;
    }
    // ---------- Avisos próximos
    if (c.avisos.length) {
      titulo('Avisos próximos', 'Avisos cargados en Reclamos para los próximos días.');
      tabla([{ t: 'Fecha', w: 20 }, { t: 'Aviso', w: 42 }, { t: 'Detalle', w: 118, max: 3 }], c.avisos);
    }
    // ---------- Servicios
    if (o.servicios) {
      titulo('Servicios Alimentarios (SAE)', `Cupo vigente al ${c.fechaConsulta}.` + (c.matricula ? ` "Cupo / matrícula": cupo contra los ${c.matricula.total} alumnos${c.matricula.fuente ? ' (' + c.matricula.fuente + ')' : ''}; bajo = menos del 90 %, alto = más del 120 %.` : ''));
      if (c.servicios.length) {
        if (c.matricula) tabla([{ t: 'Servicio', w: 52 }, { t: 'Proveedor', w: 34 }, { t: 'Cupo', w: 22, der: true, neg: true }, { t: 'Cupo / matrícula', w: 30, der: true }, { t: 'Último cambio', w: 42 }],
          c.servicios.map(s => [s.nombre, s.proveedor, `${s.cupo} rac.`, s.cob || '—', s.cambio || '—']));
        else tabla([{ t: 'Servicio', w: 62 }, { t: 'Proveedor', w: 40 }, { t: 'Cupo', w: 26, der: true, neg: true }, { t: 'Último cambio', w: 52 }],
          c.servicios.map(s => [s.nombre, s.proveedor, `${s.cupo} rac.`, s.cambio || '—']));
      } else texto('No hay cupos SAE registrados para este establecimiento.', 9.5, 'italic', GRIS);
    }
    // ---------- Menú del día
    if (o.menu) {
      y += 1;
      titulo(c.menuTitulo, c.menuSub);
      if (!c.menu.length) texto('Sin menú para ese día.', 9, 'italic', GRIS);
      c.menu.forEach(l => {
        mantenerJunto(altoLineas(l.titulo, 9.8, ANCHO) + 2.5 + (l.filas.length ? altoTabla(COLS_MENU, l.filas) : 0));
        necesito(16);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.8); doc.setTextColor(...TXT);
        const t = doc.splitTextToSize(l.titulo, ANCHO); doc.text(t, M, y); y += t.length * lh(9.8) + 2.5;
        if (l.filas.length) tabla(COLS_MENU, l.filas);
      });
    }
    // ---------- Entregas
    if (o.entregas && c.entregas.length) {
      y += 1;
      titulo('Qué se entrega', 'Lo que el proveedor tiene que llevar según el menú y los cupos (no lo que llegó). Al lado, los reclamos de ese día si hubo.');
      c.entregas.forEach(e => {
        mantenerJunto(5.5 + e.notas.length * 5 + (e.dias.length ? altoDia(e.dias[0]) : 6));   // el título va con su primer día
        necesito(14);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...AZUL_OSC); doc.text(e.titulo, M, y); y += 5.5;
        e.notas.forEach(n => texto(n, 8.8, 'italic', GRIS));
        if (!e.dias.length && !e.notas.length) texto('Ese día no hay entregas para esta escuela.', 8.8, 'italic', GRIS);
        e.dias.forEach(d => {
          mantenerJunto(altoDia(d));
          texto(`Para el ${d.texto}`, 9.2, 'bold', TXT);
          d.prest.forEach(p => {
            texto(p.titulo, 8.6, 'normal', GRIS);
            if (p.items.length) tabla(COLS_ENT, p.items, { tam: 8.2 });
          });
        });
        if (e.reclamos.length) {
          texto('Reclamos de ese día:', 8.8, 'bold', NARANJA);
          e.reclamos.forEach(r => texto('• ' + r, 8.4, 'normal', TXT));
        }
        y += 2;
      });
    }
    // ---------- Reclamos (hoja aparte)
    if (o.reclamos) {
      const R = c.reclamos;
      // (2.11.1) Si entra en lo que queda de la hoja, sigue ahí; si no, empieza en una hoja nueva
      if (R.ok) {
        const n = Math.min(12, R.tipos.length);
        const alto = 13 + 19 + 6 + (n ? 5 + n * 6.2 + (R.tipos.length > 12 ? 5 : 0) + 2 : 5) + 6 + (R.ultimos.length ? altoTabla(COLS_ULT, R.ultimos, 8.2) : 5);
        if (y > 40 && y + alto > TOPE) nuevaPagina(); else y += 4;
      } else y += 2;
      titulo('Reclamos', R.ok ? `Período: ${R.periodoTxt}. Sin contar los avisos.` : '');
      if (!R.ok) texto(R.msg, 9.5, 'italic', GRIS);
      else {
        // Números
        const nums = [[String(R.total), 'reclamos en el período'], [formatoNum(Math.round(R.porMes * 10) / 10), 'por mes en promedio'], [String(R.sinResolver), 'sin resolver (hoy)']];
        const w = (ANCHO - 8) / 3;
        necesito(20);
        nums.forEach(([v, t], i) => {
          const x = M + i * (w + 4);
          doc.setFillColor(...CLARO2); doc.setDrawColor(...BORDE); doc.roundedRect(x, y - 4, w, 16, 2, 2, 'FD');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...AZUL); doc.text(v, x + 4, y + 3.5);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(...GRIS); doc.text(t, x + 4, y + 9);
        });
        y += 19;
        // Tipo de reclamos
        texto('Tipo de reclamos', 10.5, 'bold', AZUL);
        if (!R.tipos.length) texto('No tuvo reclamos en el período.', 9, 'italic', GRIS);
        else {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...GRIS);
          necesito(6);
          doc.setFillColor(...AZUL); doc.rect(M, y - 2.4, 6, 2.6, 'F'); doc.text('esta escuela', M + 8, y);
          doc.setFillColor(...NARANJA); doc.rect(M + 34, y - 3, 1, 3.6, 'F'); doc.text(`promedio de todas las escuelas (${R.totalTodas} reclamos)`, M + 37, y);
          y += 5;
          const etqW = 62, barW = ANCHO - etqW - 30;
          const maxPct = Math.max(...R.tipos.map(t => Math.max(t.pct, t.pctTodas)), 1);
          R.tipos.slice(0, 12).forEach(t => {
            necesito(7);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...TXT);
            doc.text(doc.splitTextToSize(t.etq, etqW - 2)[0], M, y);
            doc.setFillColor(...CLARO2); doc.rect(M + etqW, y - 3.2, barW, 4.2, 'F');
            doc.setFillColor(...AZUL); doc.rect(M + etqW, y - 3.2, Math.max(0.6, barW * t.pct / maxPct), 4.2, 'F');
            doc.setFillColor(...NARANJA); doc.rect(M + etqW + barW * t.pctTodas / maxPct - 0.4, y - 4, 0.9, 5.8, 'F');
            doc.setFont('helvetica', 'bold'); doc.text(`${Math.round(t.pct)} %`, M + ANCHO - 14, y, { align: 'right' });
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS); doc.text(`(${t.n})`, M + ANCHO, y, { align: 'right' });
            y += 6.2;
          });
          if (R.tipos.length > 12) texto(`Y ${R.tipos.length - 12} tipos más.`, 8, 'italic', GRIS);
          y += 2;
        }
        // Últimos reclamos
        texto(R.ultimosTitulo, 10.5, 'bold', AZUL);
        if (!R.ultimos.length) texto('No tiene reclamos cargados.', 9, 'italic', GRIS);
        else tabla(COLS_ULT, R.ultimos, { tam: 8.2, cebra: true });
      }
    }
    // ---------- (2.16.0) Entregas y arreglos
    if (o.arreglos && c.arreglos) {
      const A = c.arreglos;
      const COLS_ARR = [{ t: 'Fecha', w: 18 }, { t: 'Tipo', w: 30 }, { t: 'Detalle', w: 112, max: 4 }, { t: 'Cant.', w: 20, der: true }];
      const alto = 18 + (A.ok && A.filas.length ? altoTabla(COLS_ARR, A.filas, 8.2) : 6);
      if (y > 40 && y + Math.min(alto, 90) > TOPE) nuevaPagina(); else y += 4;
      titulo('Entregas y arreglos', A.ok ? `${A.filas.length < A.total ? `Los últimos ${A.filas.length} de ${A.total}` : `Todos (${A.total})`} · ${A.esteAnio} este año. Compras, equipamiento y arreglos (gas, electricidad, plomería, refrigeración). Sin montos.` : '');
      if (!A.ok) texto(A.msg, 9.5, 'italic', GRIS);
      else if (!A.filas.length) texto('No hay entregas ni arreglos cargados para esta escuela.', 9, 'italic', GRIS);
      else tabla(COLS_ARR, A.filas, { tam: 8.2, cebra: true, colores: A.colores, colorCol: 1 });
    }
    // ---------- Pie en todas las hojas
    const ahora = new Date();
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BORDE); doc.setLineWidth(0.3); doc.line(M, 284, 210 - M, 284);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
      doc.text(`Generado desde el Buscador SAE el ${ahora.toLocaleDateString('es-AR')} a las ${pad2(ahora.getHours())}:${pad2(ahora.getMinutes())}. Totales estimativos.`, M, 289);
      doc.text(`Hoja ${i} de ${total}`, 210 - M, 289, { align: 'right' });
    }
    return doc;
  }

  /** Alternativa sin internet: arma la ficha en HTML y abre el diálogo de impresión ("Guardar como PDF"). */
  function imprimirComoPDF(c) {
    let area = document.getElementById('saeFichaImprimible');
    if (!area) { area = document.createElement('div'); area.id = 'saeFichaImprimible'; document.body.appendChild(area); }
    const h = escaparHTML, o = c.opc;
    const pares = (arr) => arr.map(([k, v]) => `<p><strong>${h(k)}:</strong> ${h(v)}</p>`).join('');
    const tabla = (cab, filas, der) => `<table><thead><tr>${cab.map((x, i) => `<th${(der || []).includes(i) ? ' class="der"' : ''}>${h(x)}</th>`).join('')}</tr></thead><tbody>${
      filas.map(f => `<tr>${f.map((x, i) => `<td${(der || []).includes(i) ? ' class="der"' : ''}>${h(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    let html = `<div class="fi-cabecera"><div><strong>Servicio Alimentario Escolar</strong><br><small>Municipalidad de Tres de Febrero</small></div>
        <div class="der"><strong>FICHA DE ESTABLECIMIENTO</strong><br><small>Fecha de consulta: ${h(c.fechaConsulta)}</small></div></div>
      <h1>${h(c.nombre)}</h1><p class="fi-meta">${h(c.meta)}</p>${c.etiquetas.map(e => `<p><strong>${h(e)}</strong></p>`).join('')}`;
    if (o.ficha) html += `<div class="fi-columnas"><div class="fi-bloque"><h3>Localización</h3>${pares(c.localizacion.concat(c.horarios.length ? [['Horario de entrega acordado', c.horarios.join(' · ')]] : []))}</div>
        ${c.contacto ? `<div class="fi-bloque"><h3>Directivos y contacto</h3>${pares(c.contacto)}</div>` : ''}</div>`;
    if (c.avisos.length) html += `<h2>Avisos próximos</h2>${tabla(['Fecha', 'Aviso', 'Detalle'], c.avisos)}`;
    if (o.servicios) html += `<h2>Servicios Alimentarios (SAE)</h2>${c.servicios.length ? (c.matricula ? tabla(['Servicio', 'Proveedor', 'Cupo', 'Cupo / matrícula', 'Último cambio'], c.servicios.map(s => [s.nombre, s.proveedor, `${s.cupo} rac.`, s.cob || '—', s.cambio || '—']), [2, 3])
      : tabla(['Servicio', 'Proveedor', 'Cupo', 'Último cambio'], c.servicios.map(s => [s.nombre, s.proveedor, `${s.cupo} rac.`, s.cambio || '—']), [2])) : '<p><em>No hay cupos SAE registrados.</em></p>'}`;
    if (o.menu) html += `<h2>${h(c.menuTitulo)}</h2><p class="fi-meta">${h(c.menuSub)}</p>` + c.menu.map(l => `<h4>${h(l.titulo)}</h4>${l.filas.length ? tabla(['Alimento', 'Ración', 'Total estimado'], l.filas, [1, 2]) : ''}`).join('');
    if (o.entregas && c.entregas.length) html += '<h2>Qué se entrega</h2>' + c.entregas.map(e => `<h3>${h(e.titulo)}</h3>${e.notas.map(n => `<p><em>${h(n)}</em></p>`).join('')}` +
      (!e.dias.length && !e.notas.length ? '<p><em>Ese día no hay entregas para esta escuela.</em></p>' : '') +
      e.dias.map(d => `<h4>Para el ${h(d.texto)}</h4>` + d.prest.map(p => `<p class="fi-meta">${h(p.titulo)}</p>${tabla(['Alimento', 'Total', 'Envases'], p.items, [1])}`).join('')).join('') +
      (e.reclamos.length ? `<p><strong>Reclamos de ese día:</strong></p>${e.reclamos.map(r => `<p>• ${h(r)}</p>`).join('')}` : '')).join('');
    if (o.reclamos) {
      const R = c.reclamos;
      html += '<h2 style="page-break-before:always">Reclamos</h2>' + (!R.ok ? `<p><em>${h(R.msg)}</em></p>` :
        `<p class="fi-meta">Período: ${h(R.periodoTxt)}.</p><p><strong>${R.total}</strong> reclamos · <strong>${formatoNum(Math.round(R.porMes * 10) / 10)}</strong> por mes · <strong>${R.sinResolver}</strong> sin resolver</p>` +
        `<h3>Tipo de reclamos</h3>${tabla(['Tipo', 'Esta escuela', 'Todas las escuelas'], R.tipos.map(t => [t.etq, `${Math.round(t.pct)} % (${t.n})`, `${Math.round(t.pctTodas)} %`]), [1, 2])}` +
        `<h3>${h(R.ultimosTitulo)}</h3>${tabla(['Fecha', 'Motivo', 'Estado', 'Detalle y acciones tomadas'], R.ultimos.map(f => f.slice(0, 3).concat([String(f[3]).replace(/\n/g, ' · ')])))}`);
    }
    if (o.arreglos && c.arreglos) {
      const A = c.arreglos;
      html += '<h2>Entregas y arreglos</h2>' + (!A.ok ? `<p><em>${h(A.msg)}</em></p>` : !A.filas.length ? '<p><em>No hay entregas ni arreglos cargados para esta escuela.</em></p>'
        : `<p class="fi-meta">${A.filas.length < A.total ? `Los últimos ${A.filas.length} de ${A.total}` : `Todos (${A.total})`} · ${A.esteAnio} este año. Sin montos.</p>` +
          tabla(['Fecha', 'Tipo', 'Detalle', 'Cant.'], A.filas.map(f => [f[0], f[1], String(f[2]).replace(/\n/g, ' · '), f[3]]), [3]));
    }
    html += `<p class="fi-pie">Generado desde el Buscador SAE el ${new Date().toLocaleString('es-AR')}. Los totales son estimativos.</p>`;
    area.innerHTML = html;
    const tituloOriginal = document.title;
    document.title = c.archivo.replace(/\.pdf$/, '');
    document.documentElement.classList.add('sae-imprimiendo');
    const limpiar = () => {
      document.documentElement.classList.remove('sae-imprimiendo');
      document.title = tituloOriginal;
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);
    setTimeout(() => { window.print(); setTimeout(limpiar, 1500); }, 50);
  }

  /**
   * Pregunta qué incluir y descarga la ficha en PDF (siempre en color).
   * datos = { escuela, fecha:'YYYY-MM-DD', fechaMenu?, dia:'Lunes'..'Viernes', nivel }
   * Devuelve 'pdf' (descarga directa), 'impresion' (alternativa sin internet) o null (se canceló).
   */
  async function descargarFichaPDF(datos) {
    if (!datos || !datos.escuela) throw new Error('No hay escuela seleccionada');
    const hayRec = typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript() && SAE_SYNC.hayClave();
    // (2.11.2) Mientras se eligen las opciones ya se empiezan a traer los reclamos y la librería del PDF
    const pedido = hayRec ? SAE_SYNC.cargarReclamos(false, { rapido: true }) : null;
    if (pedido) pedido.catch(() => { /* se avisa en el PDF */ });
    const pLib = cargarJsPDF(); pLib.catch(() => { /* se usa la impresión */ });
    const opc = await elegirOpciones(datos.escuela.nombre || '', hayRec);
    if (!opc) return null;
    const avisar = (t) => { try { if (datos.alProgreso) datos.alProgreso(t); } catch (e) { /* nada */ } };
    avisar(opc.reclamos && hayRec ? 'Leyendo reclamos…' : 'Armando el PDF…');
    const contenido = await armarContenido(datos, opc, pedido);
    avisar('Armando el PDF…');
    try {
      const JsPDF = await pLib;
      dibujarPDF(JsPDF, contenido).save(contenido.archivo);
      return 'pdf';
    } catch (err) {
      console.warn('PDF directo no disponible, se usa impresión:', err);
      imprimirComoPDF(contenido);
      return 'impresion';
    }
  }

  return {
    fechaHoyStr,
    infoDia,
    actualizarAviso,
    guardarReciente,
    obtenerRecientes,
    mostrarRecientes,
    borrarHistorial,
    descargarFichaPDF,
    FERIADOS
  };
})();

/**
 * ==========================================================================
 * (2.5.0) ENTREGAS: qué día entrega cada proveedor la mercadería de cada día de menú.
 *  - GYULAND, EDEAL y TINTENFISCH: el día hábil anterior (el lunes entregan lo del martes, listas
 *    2 y 7; …; el viernes entregan lo del lunes siguiente, listas 1 y 6).
 *  - GRUPO L (y TEYLEM, que es Grupo L): lunes → martes; martes → miércoles y jueves;
 *    jueves → viernes y lunes siguiente. Miércoles y viernes no entrega.
 *  - Los demás (distribuidoras viejas): sin regla (no se muestran).
 * SAE_ENTREGAS.destinos('GYULAND', '2026-10-27') -> ['2026-10-28']
 * ==========================================================================
 */
const SAE_ENTREGAS = (function () {
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const pad = (n) => String(n).padStart(2, '0');
  const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fechaDe = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); };
  const sumar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  /** 'grupoL', 'diaAnterior' o '' según el proveedor. */
  function tipo(proveedor) {
    const p = norm(proveedor);
    if (/^(GRUPO L|TEYLEM)\b/.test(p)) return 'grupoL';
    if (/^(GYULAND|EDEAL|TINTENFISCH)\b/.test(p)) return 'diaAnterior';
    return '';
  }
  // Regla de siempre: día que entrega (1 = lunes … 5 = viernes) -> días de menú que lleva.
  // Un día igual o anterior al que entrega es el de la semana siguiente (viernes -> lunes).
  const BASE = {
    diaAnterior: { 1: [2], 2: [3], 3: [4], 4: [5], 5: [1] },
    grupoL: { 1: [2], 2: [3, 4], 3: [], 4: [5, 1], 5: [] }
  };
  const AJ = () => (typeof window !== 'undefined' && window.SAE_AJUSTES) ? window.SAE_AJUSTES : null;

  /** (2.6.0) Regla de la semana vigente ese día (la cargada desde la página o la de siempre). */
  function semana(proveedor, iso) {
    const t = tipo(proveedor);
    if (!t) return null;
    const r = AJ() && AJ().reglaEntrega(proveedor, iso || isoDe(new Date()));
    return r ? r.semana : BASE[t];
  }
  /** Días (yyyy-mm-dd) cuyo menú entrega ese proveedor el día `iso`. [] = ese día no entrega; null = sin regla. */
  function destinos(proveedor, iso) {
    if (!tipo(proveedor)) return null;
    const d = fechaDe(iso), wd = d.getDay();
    if (wd === 0 || wd === 6) return [];
    const ex = AJ() && AJ().excepcionEntrega(proveedor, iso);     // (2.6.0) excepción por fecha
    if (ex) return ex.slice().sort();
    const sem = semana(proveedor, iso) || {};
    return (sem[wd] || []).map(t => isoDe(sumar(d, ((Number(t) - wd + 7) % 7) || 7)));
  }
  /** true si `b` cae en otra semana que `a` (para alternar la semana del ciclo de menús). */
  function otraSemana(a, b) {
    const lunes = (iso) => { const d = fechaDe(iso); return isoDe(sumar(d, -((d.getDay() + 6) % 7))); };
    return lunes(a) !== lunes(b);
  }
  /** "miércoles 29/10" */
  function diaTexto(iso) { const d = fechaDe(iso); return `${DIAS[d.getDay()].toLowerCase()} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; }
  function nombreDia(iso) { return DIAS[fechaDe(iso).getDay()]; }
  /** Explicación corta de los días de entrega de ese proveedor ("Entrega lunes (martes), martes (miércoles y jueves)…"). */
  function regla(proveedor, iso) {
    const sem = semana(proveedor, iso);
    if (!sem) return '';
    const partes = [1, 2, 3, 4, 5].filter(w => (sem[w] || []).length)
      .map(w => `${DIAS[w].toLowerCase()} (${sem[w].map(t => DIAS[t].toLowerCase()).join(' y ')})`);
    return partes.length ? `Entrega ${partes.join(', ')}.` : 'No tiene días de entrega cargados.';
  }
  return { tipo, semana, destinos, otraSemana, diaTexto, nombreDia, regla, isoDe, fechaDe };
})();
if (typeof window !== 'undefined') window.SAE_ENTREGAS = SAE_ENTREGAS;

/**
 * ==========================================================================
 * (2.10.0) CÁLCULOS COMUNES - SAE_CALC
 * Lo que antes estaba repetido (y con pequeñas diferencias) en el buscador, el celular y Totales:
 *  - nivelDe(escuela): qué columna de gramaje usa (jardin / primaria / secundaria).
 *  - envase(alimento, total, unidad, cfg): cuántos envases son. "total" va en kg (unidad g),
 *    L (unidad ml/cc) o unidades (u / saquito). cfg: tamaños elegidos (si no, los de SAE_DATA).
 *    Devuelve { n, txt } (ej. { n: 12, txt: '12 potes (400 g)' }) o null si no hay un envase conocido.
 * ==========================================================================
 */
const SAE_CALC = (function () {
  'use strict';
  function nivelDe(escuela) {
    const n = String((escuela && escuela.nombre) || '').toUpperCase();
    const tipo = String((escuela && escuela.tipo) || '');
    if (tipo === 'Dispositivo') return /^(UDI|EPI)\s/.test(n) ? 'jardin' : /^ENVI[OÓ]N/.test(n) ? 'secundaria' : 'primaria';
    if (tipo.includes('Jardín') || tipo === 'Escuela Municipal' || /maternal/i.test(tipo)) return 'jardin';
    if (tipo.includes('Primaria') || tipo.includes('Centro')) return 'primaria';
    return 'secundaria';
  }
  const nf = (x) => Number(x).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  function envase(alimento, total, unidad, cfg) {
    const def = (typeof SAE_DATA !== 'undefined' && SAE_DATA.envasesDefault) || {};
    const c = Object.assign({}, def, cfg || {});
    const a = String(alimento || '').toLowerCase();
    const u = unidad === 'cc' ? 'ml' : (unidad === 'saquitos' ? 'saquito' : (unidad === 'unidades' ? 'u' : (unidad || 'g')));
    const t = Number(total) || 0;
    if (t <= 0) return null;
    const r = (n, txt) => ({ n, txt: `${nf(n)} ${txt}` });
    const porGramos = (g, nombre) => r(Math.ceil(t * 1000 / g), `${nombre} (${nf(g)} g)`);
    if (u === 'g') {
      if (a.includes('fórmula') || a.includes('formula')) return porGramos(800, 'latas');
      if (a.includes('dulce de leche')) return porGramos(c.dulce_leche_gramos || 400, 'potes');
      if (a.includes('mermelada')) return porGramos(c.mermelada_gramos || 400, 'potes');
      if (/galletita|cracker|pepas/.test(a)) return porGramos(c.galletitas_gramos || 400, 'paq.');
      if (a.includes('cacao')) return porGramos(c.cacao_gramos || 180, 'paq.');
      if (a.includes('azúcar') || a.includes('azucar')) return r(Math.ceil(t), 'paq. (1 kg)');
      if (a.includes('harina')) return r(Math.ceil(t), 'paq. (1 kg)');
      if (a.includes('aceite')) return r(Math.ceil(t), 'botellas (1 L)');
      if (a.includes('huevo')) { const un = Math.ceil(t * 1000 / 50); return r(un, `u (${nf(Math.ceil(un / 30))} maples)`); }
      return null;
    }
    if (u === 'ml') {
      if (a.includes('leche')) return r(Math.ceil(t), 'sachets (1 L)');
      if (a.includes('yogur') || a.includes('aceite')) return r(Math.ceil(t), 'botellas (1 L)');
      return null;
    }
    if (a.includes('huevo')) { const un = Math.ceil(t); return r(un, `u (${nf(Math.ceil(un / 30))} maples)`); }
    if (/infusi|mate ?cocido|(^|[^a-z])t[eé]([^a-z]|$)/.test(a)) { const k = c.matecocido_saquitos || 25; return r(Math.ceil(t / k), `cajas (${nf(k)} u)`); }
    return null;
  }
  /* (2.12.0) Matrícula (script v37): escuela.matricula = { t, tm, tt, f } */
  function matricula(escuela) {
    const m = escuela && escuela.matricula;
    if (!m || m.t == null) return null;
    const turnos = (m.tm != null || m.tt != null) ? [m.tm != null ? `TM ${m.tm}` : '', m.tt != null ? `TT ${m.tt}` : ''].filter(Boolean).join(' · ')
      : (m.f === 'por turno' ? 'sin dato por turno' : '');
    const fuente = m.f && m.f !== 'por turno' ? capiF(m.f) : '';
    return { total: m.t, turnos, fuente, texto: `Matrícula ${nf(m.t)}`,
      detalle: [turnos, fuente ? 'dato de ' + fuente : ''].filter(Boolean).join(' · ') };
  }
  const capiF = (t) => String(t || '').toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()).replace(/ - /g, '–');
  /** Cupo contra matrícula: { pct, clase: 'bajo' (menos del 90 %) | 'alto' (más del 120 %) | '' } */
  function cobertura(cupo, escuela) {
    const m = escuela && escuela.matricula;
    if (!m || !m.t || !cupo) return null;
    const pct = Math.round(cupo / m.t * 100);
    return { pct, alumnos: m.t, clase: pct < 90 ? 'bajo' : pct > 120 ? 'alto' : '' };
  }
  return { nivelDe, envase, matricula, cobertura };
})();
if (typeof window !== 'undefined') window.SAE_CALC = SAE_CALC;
