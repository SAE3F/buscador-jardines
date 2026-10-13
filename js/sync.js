/**
 * ==========================================================================
 * SINCRONIZACIÓN CON LAS PLANILLAS - sync.js
 * Trae CUPOS 2026 y los menús de jardines municipales / dispositivos desde
 * Google (a través del mismo script de Reclamos) y los aplica a la página.
 *
 *  - Al abrir la página se aplican al instante los últimos datos guardados
 *    en este navegador, y en segundo plano se piden los nuevos.
 *  - Si no hay internet o el script no responde, la página sigue funcionando
 *    con los datos incluidos en data.js y menus.js.
 *  - También trae una versión liviana de los reclamos para la ficha de cada
 *    escuela (SAE_SYNC.reclamosDeEscuela).
 *
 * Requiere: data.js, menus.js, extras.js y reclamos-config.js cargados antes.
 * Avisa con el evento "sae-datos-actualizados" cuando cambian los datos.
 * ==========================================================================
 */
const SAE_SYNC = (function () {
  'use strict';

  const CLAVE_CACHE = 'sae-sync-datos-v1';
  const CLAVE_RECLAMOS = 'sae-reclamos-clave';
  const VERSION_MINIMA = 7;

  const estado = {
    origen: 'archivo',          // 'archivo' (data.js) | 'guardado' | 'planilla'
    actualizado: '',            // fecha/hora de los datos de la planilla
    ultimoError: '',
    cambios: null,
    sincronizando: null
  };

  /* ------------------------------------------------------------ utilidades */
  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function urlScript() {
    return (typeof RECLAMOS_CONFIG !== 'undefined' && RECLAMOS_CONFIG.urlScript || '').trim();
  }
  function clave() { return leerLS(CLAVE_RECLAMOS) || ''; }

  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
  /** "EP 8" = "EP 08" = "ep 08" */
  const compactar = (t) => norm(t).replace(/N\s*[°º]\s*/g, '').replace(/[^A-Z0-9]/g, '').replace(/([A-Z])0+(\d)/g, '$1$2');

  async function pedir(accion) {
    const url = urlScript();
    if (!url) throw new Error('SIN_URL');
    const r = await fetch(url + '?' + new URLSearchParams({ accion, clave: clave() }).toString(), { redirect: 'follow' });
    const texto = await r.text();
    let json;
    try { json = JSON.parse(texto); } catch (e) { throw new Error('Google respondió con una página de error (revisá la publicación del script).'); }
    if (!json.ok) throw new Error(json.error || 'Error desconocido');
    if ((json.version || 0) < VERSION_MINIMA) throw new Error('VERSION_VIEJA');
    return json;
  }

  function mensajeError(err) {
    const m = String(err && err.message || err);
    if (m === 'SIN_URL') return 'Falta configurar el link del script (reclamos-config.js).';
    if (m.includes('CLAVE_INCORRECTA')) return 'Falta la clave: entrá una vez a Reclamos con la clave del equipo y volvé a intentar.';
    if (m === 'VERSION_VIEJA') return 'El script publicado en Google es una versión vieja: pegá el Codigo.gs nuevo y publicá una "Nueva versión".';
    if (/Failed to fetch|NetworkError|Load failed/.test(m)) return 'Sin conexión con Google.';
    return m;
  }

  /* ---------------------------------------------------------------- CUPOS */
  const NO_SON_ESCUELAS = ['BOLSON ACTUAL', 'BOLSON LIMITE', 'COMEDOR ACTUAL', 'COMEDOR LIMITE',
    'DIA', 'DM ACTUAL', 'DM LIMITE', 'TOTAL'];

  function limpiarProveedor(p) {
    return String(p || '').toUpperCase().replace(/\s+S\.?A\.?$|\s+S\.?R\.?L\.?$/, '').trim();
  }

  function tipoPorNombre(nombre) {
    const n = norm(nombre);
    if (/^JI\b/.test(n)) return 'Jardín de Infantes';
    if (/^JM\b/.test(n)) return 'Escuela Municipal';
    if (/^EP\b/.test(n)) return 'Primaria';
    if (/^EES\b/.test(n)) return 'Secundaria';
    if (/^TEC\b/.test(n)) return 'Técnica';
    if (/^(EE|CFI|CEC)\b/.test(n)) return 'Especial';
    if (/^(UDI|EPI|ENVION)\b/.test(n) || /^CENTRO .*ESPERANZA$/.test(n)) return 'Dispositivo';
    return 'Otro';
  }

  /** Aplica las filas de CUPOS 2026 a SAE_DATA.escuelas. Devuelve un resumen de cambios. */
  function aplicarCupos(cupos) {
    const res = { escuelas: 0, valores: 0, nuevas: [], servicios: 0 };
    if (!cupos || !Array.isArray(cupos.filas) || !cupos.filas.length) return res;
    const fechas = cupos.fechas || [];
    const E = SAE_DATA.escuelas;

    // índice por nombre (y alias)
    const indice = {};
    E.forEach(e => {
      indice[compactar(e.nombre)] = e;
      (e.alias || []).forEach(a => { indice[compactar(a)] = e; });
    });

    const porEscuela = new Map();
    cupos.filas.forEach(([nombre, servicio, proveedor, especial, valores]) => {
      if (NO_SON_ESCUELAS.indexOf(norm(nombre)) >= 0) return;
      let e = indice[compactar(nombre)];
      if (!e) {
        // Escuela nueva en la planilla: se agrega con los datos mínimos
        e = { id: nombre, nombre, tipo: tipoPorNombre(nombre), cue: '', zona: '', proveedor: '', direccion: '',
              localidad: '', directora: '', cargo: 'Directora', telefono: '', contacto_adicional: '',
              telefono_adicional: '', email: '', comparte_edificio: '', servicios: [] };
        E.push(e);
        indice[compactar(nombre)] = e;
        res.nuevas.push(nombre);
      }
      if (!porEscuela.has(e)) porEscuela.set(e, []);
      const c = {};
      (valores || []).forEach((v, i) => { if (v !== null && v !== '' && !isNaN(v) && fechas[i]) c[fechas[i]] = Number(v); });
      porEscuela.get(e).push({ servicio, proveedor, cupo_especial: Number(especial) || 0, cupos: c });
    });

    porEscuela.forEach((servicios, e) => {
      const antes = {};
      (e.servicios || []).forEach(s => { antes[norm(s.servicio)] = s; });
      servicios.forEach(s => {
        const v = antes[norm(s.servicio)];
        if (!v) { res.servicios++; return; }
        Object.keys(s.cupos).forEach(k => { if (v.cupos && v.cupos[k] !== s.cupos[k]) res.valores++; });
      });
      e.servicios = servicios;
      // Proveedor de la ficha: el de sus servicios
      const provs = [];
      servicios.forEach(s => {
        const p = limpiarProveedor(s.proveedor);
        if (/[A-Z]/.test(p) && !/^\d/.test(p) && provs.indexOf(p) < 0) provs.push(p);
      });
      if (provs.length) e.proveedor = provs.join(' / ');
      res.escuelas++;
    });
    SAE_DATA.totalEscuelas = E.length;
    return res;
  }

  /* ---------------------------------------------------------------- MENÚS
   * Misma interpretación que el extractor usado para generar menus.js
   * (mismos rangos que la fórmula del BUSCADOR del Tablero).
   */
  const txt = (v) => (v === null || v === undefined) ? '' : String(v).replace(/\s+/g, ' ').trim();
  function num(s) {
    const m = String(s).replace(/,/g, '.').match(/\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  const LIQUIDOS = /(?<!DULCE DE )LECHE|YOGUR|ACEITE|ESENCIA|JUGO|AGUA/i;
  const SIEMPRE_LIQUIDO = /^(?!DULCE)(LECHE|YOGUR)/i;

  function unidadNorm(u, alimento, gramTxt) {
    if (SIEMPRE_LIQUIDO.test(txt(alimento))) return 'ml';
    u = txt(u).toUpperCase();
    const g = txt(gramTxt).toUpperCase();
    if (!u) { const m = g.match(/[A-Z]+/); u = m ? m[0] : ''; }
    if (u.startsWith('UNID') || u === 'U' || u === 'UN' || u === 'UNI') return 'u';
    if (u === 'CC' || u === 'ML') return 'ml';
    if (u === 'G' || u === 'GR' || u === 'GRS') return 'g';
    return LIQUIDOS.test(alimento || '') ? 'ml' : 'g';
  }

  /** [valor, nota]. '130(80)' -> [130, 'neto 80']; 50 -> [50, '']. */
  function gramaje(v) {
    if (v === null || v === undefined || txt(v) === '') return [null, ''];
    if (typeof v === 'number') return [v, ''];
    const s = txt(v);
    const neto = s.match(/\(\s*(\d+(?:[.,]\d+)?)\s*\)/);
    const valor = neto ? num(s.replace(/\(.*?\)/g, '')) : num(s);
    let nota = '';
    if (neto) nota = 'neto ' + neto[1].replace('.', ',');
    else if ((s.match(/\d+/g) || []).length > 1) {
      nota = (s.match(/\d+(?:[.,]\d+)?\s*[A-Za-z]*/g) || []).join(' ó ').toLowerCase().replace(/unid/g, 'u.');
    }
    return [valor, nota];
  }

  const CORTAS = ['de', 'la', 'el', 'y', 'o', 'ó', 'en', 'a', 'un', 'al', 'lo', 'su'];
  function nombreAlimento(a) {
    let al = txt(a);
    const mayus = (al.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length, minus = (al.match(/[a-záéíóúñ]/g) || []).length;
    if (mayus && minus <= 1) {
      al = al.toLowerCase().split(' ').map(w => (w.length <= 2 && /^[a-zñáéíóú]+$/.test(w) && CORTAS.indexOf(w) < 0) ? w.toUpperCase() : w).join(' ');
      al = al.charAt(0).toUpperCase() + al.slice(1);
    }
    return al;
  }
  function item(alimento, unidad, valores, nota) {
    const d = Object.assign({ alimento: nombreAlimento(alimento), unidad }, valores);
    if (nota) d.nota = nota;
    return d;
  }

  /** Recorta un rango "A5:F10" de la matriz de la pestaña (que empieza en A1). */
  function rango(hoja, ref) {
    const m = ref.match(/^([A-Z])(\d+):([A-Z])(\d+)$/);
    const c1 = m[1].charCodeAt(0) - 65, r1 = +m[2] - 1, c2 = m[3].charCodeAt(0) - 65, r2 = +m[4] - 1;
    const out = [];
    for (let r = r1; r <= r2; r++) {
      const fila = (hoja[r] || []);
      const f = [];
      for (let c = c1; c <= c2; c++) f.push(fila[c] === undefined ? '' : fila[c]);
      out.push(f);
    }
    return out;
  }
  const menuDe = (filas, col) => { const f = filas.find(x => txt(x[col])); return f ? txt(f[col]) : ''; };

  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const COLS_DISP = { 'EPI': 5, 'UDI': 6, 'ENVIÓN': 7, 'TALLER PROTEGIDO': 8 };

  function parsearMenus(m) {
    const req = ['GR COMEDOR', 'JM REFUERZO', 'GR DM JM', 'DM GR DISP', 'COM GR DISP', 'DM ESPERANZA'];
    if (!m || req.some(k => !Array.isArray(m[k]))) return null;
    const out = {};

    // GR COMEDOR (maternales): columna F
    const RC = {
      'Lunes': [['A5:F10', 'Lista 1'], ['A41:F46', 'Lista 6']],
      'Martes': [['A11:F17', 'Lista 2'], ['A47:F52', 'Lista 7']],
      'Miércoles': [['A18:F23', 'Lista 3'], ['A53:F58', 'Lista 8']],
      'Jueves': [['A24:F30', 'Lista 4'], ['A59:F65', 'Lista 9']],
      'Viernes': [['A31:F40', 'Lista 5'], ['A66:F75', 'Lista 10']]
    };
    out.comedorJM = {};
    Object.keys(RC).forEach(dia => {
      out.comedorJM[dia] = RC[dia].map(([ref, nom]) => {
        const filas = rango(m['GR COMEDOR'], ref);
        const items = [];
        filas.forEach(f => {
          if (!txt(f[2])) return;
          const [val, nota] = gramaje(f[5]);
          if (val === null) return;
          items.push(item(f[2], unidadNorm(f[3], f[2]), { gramaje: val }, nota));
        });
        return { lista: nom, nombre: menuDe(filas, 1), ingredientes: items };
      });
    });

    // JM REFUERZO
    const armarRef = (ref, nom) => {
      const filas = rango(m['JM REFUERZO'], ref);
      const items = [];
      filas.forEach(f => {
        if (!txt(f[2])) return;
        const [val, nota] = gramaje(f[3]);
        if (val === null) return;
        items.push(item(f[2], unidadNorm('', f[2], f[3]), { gramaje: val }, nota));
      });
      return { lista: nom, nombre: menuDe(filas, 1), ingredientes: items };
    };
    out.refuerzo = {
      EDEAL: {
        'Lunes': [armarRef('A6:D7', 'Lista 1'), armarRef('A14:D16', 'Lista 4')],
        'Miércoles': [armarRef('A8:D10', 'Lista 2'), armarRef('A17:D19', 'Lista 5')],
        'Jueves': [armarRef('A11:D12', 'Lista 3'), armarRef('A20:D22', 'Lista 6')]
      },
      TINTENFISCH: {
        'Lunes': [armarRef('F7:I10', 'Lista 1')],
        'Miércoles': [armarRef('F11:I13', 'Lista 2')],
        'Jueves': [armarRef('F14:I16', 'Lista 3')]
      }
    };

    // GR DM JM
    const ED = ['F5:J7', 'F8:J13', 'F14:J17', 'F18:J23', 'F24:J26'];
    const TI = ['A5:D7', 'A8:D13', 'A14:D16', 'A17:D23', 'A24:D26'];
    out.dmJM = { EDEAL: {}, TINTENFISCH: {} };
    DIAS.forEach((dia, i) => {
      let filas = rango(m['GR DM JM'], ED[i]);
      out.dmJM.EDEAL[dia] = { lista: 'Lista ' + (i + 1), nombre: menuDe(filas, 1),
        ingredientes: filas.filter(f => txt(f[2]) && gramaje(f[4])[0] !== null)
          .map(f => item(f[2], unidadNorm(f[3], f[2]), { gramaje: gramaje(f[4])[0] }, gramaje(f[4])[1])) };
      filas = rango(m['GR DM JM'], TI[i]);
      out.dmJM.TINTENFISCH[dia] = { lista: 'Lista ' + (i + 1), nombre: menuDe(filas, 1),
        ingredientes: filas.filter(f => txt(f[2]) && gramaje(f[3])[0] !== null)
          .map(f => item(f[2], unidadNorm('', f[2]), { gramaje: gramaje(f[3])[0] }, gramaje(f[3])[1])) };
    });

    // DM GR DISP
    const RD = ['A5:I7', 'A8:I13', 'A14:I17', 'A18:I23', 'A24:I26'];
    out.dmDisp = {};
    DIAS.forEach((dia, i) => {
      const filas = rango(m['DM GR DISP'], RD[i]);
      const items = [];
      filas.forEach(f => {
        if (!txt(f[2])) return;
        const vals = {};
        Object.keys(COLS_DISP).forEach(t => { vals[t] = gramaje(f[COLS_DISP[t]])[0]; });
        items.push(item(f[2], unidadNorm(f[3], f[2]), { porTipo: vals }));
      });
      out.dmDisp[dia] = { lista: 'Lista ' + (i + 1), nombre: menuDe(filas, 1), ingredientes: items };
    });

    // COM GR DISP: listas marcadas en la columna A
    const listas = {};
    let actual = null;
    (m['COM GR DISP'] || []).forEach(fRaw => {
      const f = []; for (let c = 0; c < 9; c++) f.push(fRaw[c] === undefined ? '' : fRaw[c]);
      const mm = txt(f[0]).toUpperCase().match(/LISTA\s*(\d+)/);
      if (mm) { actual = +mm[1]; listas[actual] = { lista: 'Lista ' + actual, nombre: txt(f[1]), ingredientes: [] }; }
      if (actual === null || !txt(f[2]) || txt(f[2]).toUpperCase() === 'INGREDIENTES') return;
      const vals = {}, netos = {};
      Object.keys(COLS_DISP).forEach(t => {
        const [v, n] = gramaje(f[COLS_DISP[t]]);
        vals[t] = v; if (n) netos[t] = n;
      });
      if (Object.keys(vals).every(t => vals[t] === null)) return;
      const it = item(f[2], unidadNorm(f[3], f[2]), { porTipo: vals });
      if (Object.keys(netos).length) it.notaPorTipo = netos;
      listas[actual].ingredientes.push(it);
    });
    out.comDisp = {};
    DIAS.forEach((dia, i) => { out.comDisp[dia] = [listas[i + 1], listas[i + 6]].filter(Boolean); });

    // DM ESPERANZA
    const RE = { 'Lunes': ['I5:L8', 'Lista 1'], 'Miércoles': ['I9:L12', 'Lista 3'], 'Viernes': ['I13:L17', 'Lista 4'] };
    out.dmEsperanza = {};
    Object.keys(RE).forEach(dia => {
      const filas = rango(m['DM ESPERANZA'], RE[dia][0]);
      out.dmEsperanza[dia] = { lista: RE[dia][1], nombre: menuDe(filas, 1),
        ingredientes: filas.filter(f => txt(f[2]) && gramaje(f[3])[0] !== null)
          .map(f => item(f[2], unidadNorm('', f[2]), { gramaje: gramaje(f[3])[0] }, gramaje(f[3])[1])) };
    });

    // Control mínimo: si la planilla cambió de forma y no se reconoce nada, no se usa
    const vacio = !out.comedorJM['Lunes'][0].ingredientes.length || !out.dmDisp['Lunes'].ingredientes.length;
    return vacio ? null : out;
  }

  /* ------------------------------------------------------------- aplicar */
  function aplicar(datos, origen) {
    const res = aplicarCupos(datos.cupos);
    let menus = false;
    if (typeof SAE_MENUS_DATA !== 'undefined') {
      const nuevos = parsearMenus(datos.menus);
      if (nuevos) { Object.assign(SAE_MENUS_DATA, nuevos); menus = true; }
    }
    estado.origen = origen;
    estado.actualizado = datos.generado || '';
    estado.cambios = Object.assign(res, { menus, avisos: datos.avisos || [] });
    return estado.cambios;
  }

  /** Aplica los últimos datos guardados en este navegador (sin esperar a Google). */
  function aplicarGuardados() {
    const raw = leerLS(CLAVE_CACHE);
    if (!raw) return false;
    try {
      const datos = JSON.parse(raw);
      aplicar(datos, 'guardado');
      return true;
    } catch (e) { return false; }
  }

  /** Pide los datos a Google, los aplica y avisa a la página. */
  function sincronizar() {
    if (estado.sincronizando) return estado.sincronizando;
    estado.sincronizando = (async () => {
      try {
        const datos = await pedir('datos');
        const cambios = aplicar(datos, 'planilla');
        guardarLS(CLAVE_CACHE, JSON.stringify({ generado: datos.generado, cupos: datos.cupos, menus: datos.menus, avisos: datos.avisos }));
        estado.ultimoError = '';
        window.dispatchEvent(new CustomEvent('sae-datos-actualizados', { detail: cambios }));
        return cambios;
      } catch (err) {
        estado.ultimoError = mensajeError(err);
        throw new Error(estado.ultimoError);
      } finally {
        estado.sincronizando = null;
      }
    })();
    return estado.sincronizando;
  }

  /* ------------------------------------------------- reclamos por escuela */
  let promesaReclamos = null;
  function cargarReclamos(forzar) {
    if (promesaReclamos && !forzar) return promesaReclamos;
    promesaReclamos = pedir('compacto').then(r => r.filas.map(f => ({
      fila: f[0], fecha: f[1], escuela: f[2], proveedor: f[3], servicio: f[4], categoria: f[5],
      motivo: f[6], producto: f[7], estado: f[8], problema: f[9], detalle: f[10]
    }))).catch(err => { promesaReclamos = null; throw new Error(mensajeError(err)); });
    return promesaReclamos;
  }

  function parsearFecha(t) {
    let m = String(t || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) { let a = +m[3]; if (a < 100) a += 2000; return new Date(a, +m[2] - 1, +m[1]); }
    m = String(t || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  /** Reclamos de una escuela (más nuevos primero). */
  async function reclamosDeEscuela(escuela) {
    const todos = await cargarReclamos();
    const claves = [escuela.nombre].concat(escuela.alias || []).map(compactar);
    return todos.filter(r => claves.indexOf(compactar(r.escuela)) >= 0)
      .map(r => Object.assign({ fechaObj: parsearFecha(r.fecha) }, r))
      .sort((a, b) => ((b.fechaObj ? b.fechaObj.getTime() : 0) - (a.fechaObj ? a.fechaObj.getTime() : 0)) || (b.fila - a.fila));
  }

  /* ---------------------------------------- bloque de reclamos en la ficha */
  const escH = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cap = (t) => String(t || '').toLowerCase().replace(/(^|[\s/])\S/g, x => x.toUpperCase());
  const MOTIVOS = { 'FALTANTE': 'Faltante', 'CALIDAD': 'Calidad', 'FUERA DE HORARIO': 'Fuera de horario',
    'REEMPLAZOS S/A': 'Reemplazo sin aviso', 'OTROS': 'Otros' };

  /**
   * Muestra en "contenedor" los reclamos de la escuela: cuántos en el mes,
   * pendientes y los últimos 5. Se llama cada vez que se elige una escuela.
   */
  let pedidoFicha = 0;
  async function pintarReclamosFicha(contenedor, escuela) {
    if (!contenedor || !escuela) return;
    const id = ++pedidoFicha;
    const enlace = 'reclamos.html?escuela=' + encodeURIComponent(escuela.nombre);
    const pie = `<div class="rf-acciones"><a href="${enlace}#buscar" class="rf-link">Ver todos</a>` +
      `<a href="${enlace}" class="rf-link">+ Cargar reclamo</a></div>`;
    const cab = (extra) => `<div class="rf-cab"><span class="rf-titulo">📝 Reclamos</span>${extra || ''}</div>`;

    if (!urlScript()) { contenedor.innerHTML = ''; contenedor.style.display = 'none'; return; }
    contenedor.style.display = '';
    contenedor.innerHTML = cab() + '<p class="rf-msg">Cargando reclamos…</p>';
    let lista;
    try {
      lista = await reclamosDeEscuela(escuela);
    } catch (err) {
      if (id !== pedidoFicha) return;
      contenedor.innerHTML = cab() + `<p class="rf-msg">⚠️ ${escH(err.message)}</p>` + pie;
      return;
    }
    if (id !== pedidoFicha) return;   // se eligió otra escuela mientras cargaba

    const hoy = new Date();
    const delMes = lista.filter(r => r.fechaObj && r.fechaObj.getMonth() === hoy.getMonth() && r.fechaObj.getFullYear() === hoy.getFullYear());
    const pendientes = lista.filter(r => /PENDIENTE|GESTI/i.test(r.estado || ''));
    const resumen = `<span class="rf-cuenta"><strong>${delMes.length}</strong> este mes` +
      (pendientes.length ? ` · <strong class="rf-pend-n">${pendientes.length}</strong> sin resolver` : '') + `</span>`;

    if (!lista.length) {
      contenedor.innerHTML = cab(resumen) + '<p class="rf-msg">No tiene reclamos cargados.</p>' + pie;
      return;
    }
    const items = lista.slice(0, 5).map(r => {
      const motivo = MOTIVOS[String(r.motivo || '').toUpperCase().trim()] || cap(r.motivo || r.categoria) || '—';
      const est = String(r.estado || '').trim();
      const clase = /RESUELTO/i.test(est) ? 'ok' : /GESTI/i.test(est) ? 'gestion' : /PENDIENTE/i.test(est) ? 'pend' : 'sin';
      const fecha = r.fechaObj ? `${String(r.fechaObj.getDate()).padStart(2, '0')}/${String(r.fechaObj.getMonth() + 1).padStart(2, '0')}/${String(r.fechaObj.getFullYear()).slice(2)}` : escH(r.fecha);
      return `<li class="rf-item"><div class="rf-linea"><span class="rf-fecha">${fecha}</span>` +
        `<span class="rf-motivo">${escH(motivo)}${r.producto ? ' · ' + escH(cap(r.producto)) : ''}</span>` +
        `<span class="rf-estado rf-${clase}">${escH(est || 'Sin estado')}</span></div>` +
        `<div class="rf-detalle">${escH(r.detalle || '—')}</div></li>`;
    }).join('');
    contenedor.innerHTML = cab(resumen) + `<ul class="rf-lista">${items}</ul>` +
      (lista.length > 5 ? `<p class="rf-mas">y ${lista.length - 5} reclamos más</p>` : '') + pie;
  }

  /* --------------------------------------------------------------- inicio */
  aplicarGuardados();
  // Al terminar de cargar la página se piden los datos nuevos (en segundo plano)
  window.addEventListener('load', () => {
    if (urlScript() && window.SAE_SYNC_AUTO !== false) sincronizar().catch(() => { /* se sigue con los datos guardados */ });
  });

  return {
    sincronizar,
    estado: () => Object.assign({}, estado),
    hayScript: () => !!urlScript(),
    reclamosDeEscuela,
    cargarReclamos,
    pintarReclamosFicha,
    _parsearMenus: parsearMenus,   // para pruebas
    _aplicarCupos: aplicarCupos
  };
})();
