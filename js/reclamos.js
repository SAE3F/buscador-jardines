/**
 * ==========================================================================
 * RECLAMOS SAE - reclamos.js
 * Formulario de carga, buscador y seguimiento de reclamos, conectado a la
 * hoja de Google Sheets mediante el script puente (apps-script/Codigo.gs).
 * Requiere: data.js, reclamos-config.js, reclamos-clasificacion.js
 * ==========================================================================
 */
(function () {
  'use strict';

  // Índices de columnas en cada fila que devuelve el script
  const C = {
    FECHA: 0, ESCUELA: 1, PROVEEDOR: 2, SERVICIO: 3, TIPO: 4, CATEGORIA: 5,
    SUBCATEGORIA: 6, DETALLE: 7, PRODUCTO: 8, CUPO_DEF: 9, CUPO_TOTAL: 10,
    ESTADO: 11, RESPONSABLE: 12, FECHA_RES: 13, ACCIONES: 14, PROBLEMA: 15, PATOLOGIA: 16,
    HORA: 17   // (2.9.0) columna R "HORA LLEGADA" (script v34)
  };
  const CLAVE_LS = 'sae-reclamos-clave';
  const POR_PAGINA = 50;

  const $ = (id) => document.getElementById(id);
  const ESCUELAS = (typeof SAE_DATA !== 'undefined' && SAE_DATA.escuelas) ? SAE_DATA.escuelas : [];

  const estado = {
    url: (typeof RECLAMOS_CONFIG !== 'undefined' && RECLAMOS_CONFIG.urlScript || '').trim(),
    clave: leerLS(CLAVE_LS) || '',
    reclamos: [],        // { fila, v:[...], fecha:Date|null, est:{...} }
    cargado: false,
    escuela: null,       // escuela elegida en el formulario
    form: { categoria: '', motivo: '', problema: '', estado: 'Pendiente' },
    sugerencia: null,
    filtroRapido: '',
    mostrados: POR_PAGINA,
    filtrados: [],
    modal: null,
    modalEstado: '',
    // Se cargan completos este año y el anterior; los anteriores, resumidos y solo para el Resumen
    desde: new Date().getFullYear() - 1,
    todosLosAnios: false
  };
  // Los reclamos hasta este año (inclusive) se muestran como "Resuelto" (la hoja no se modifica)
  const ANIO_CIERRE_RESUELTOS = 2025;

  /* ======================================================================
   * UTILIDADES
   * ====================================================================== */
  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }
  function borrarLS(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }

  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  const norm = (t) => ASISTENTE.normalizar(t).trim();
  const mayus = (t) => String(t || '').replace(/\s+/g, ' ').trim().toUpperCase();

  function hoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function isoDe(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Interpreta las fechas en los distintos formatos que tiene la hoja. */
  function parsearFecha(txt) {
    const s = String(txt || '').trim();
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
    if (m) {
      let a = Number(m[3]);
      if (a < 100) a += 2000;
      const d = new Date(a, Number(m[2]) - 1, Number(m[1]));
      return isNaN(d) ? null : d;
    }
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return null;
  }
  function fechaCorta(d) {
    return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}` : '';
  }

  function etiquetaDe(lista, valor) {
    const o = (lista || []).find(x => x.valor === valor);
    return o ? o.etiqueta : valor;
  }
  function todasLasEtiquetas(grupo) {
    const mapa = {};
    Object.values(grupo).forEach(lista => lista.forEach(o => { mapa[o.valor] = o.etiqueta; }));
    return mapa;
  }
  const ETQ_MOTIVO = todasLasEtiquetas(CLASIFICACION.motivos);
  ETQ_MOTIVO.OTROS = 'Otros';   // genérico; según la categoría puede llamarse distinto (ver etqMotivo)
  /** Nombre del motivo según su categoría: "OTROS" es "Cambio de cupo" en Cupos y "Producto" en Reemplazos C/A. */
  function etqMotivo(mot, cat) {
    const lista = cat && CLASIFICACION.motivos[cat];
    const o = lista && lista.find(x => x.valor === mot);
    return o ? o.etiqueta : (ETQ_MOTIVO[mot] || capitalizar(mot));
  }
  const ETQ_PROBLEMA = todasLasEtiquetas(CLASIFICACION.problemas);
  const ETQ_CATEGORIA = {};
  CLASIFICACION.categorias.forEach(c => { ETQ_CATEGORIA[c.valor] = c.etiqueta; });
  const etqCategoria = (v) => ETQ_CATEGORIA[v] || capitalizar(v);

  /** Alimentos se carga ya resuelto (se puede cambiar); el resto queda pendiente. */
  function estadoPorDefecto(cat) {
    return cat === 'ALIMENTOS' ? 'Resuelto' : 'Pendiente';
  }
  function fijarCategoria(cat) {
    if (estado.form.categoria !== cat) {
      estado.form.motivo = '';
      estado.form.problema = '';
      estado.form.estado = estadoPorDefecto(cat);
    }
    estado.form.categoria = cat;
    pintarEstadoForm();
    // Los avisos pueden ser de días que todavía no llegaron (se muestran en el cartel de avisos próximos)
    const f = $('fFecha');
    if (f) { f.max = cat === 'AVISO' ? isoDe(new Date(Date.now() + 365 * 86400000)) : hoyISO(); mostrarControles(); }
  }
  /** Le pasa la lista al cartel de avisos próximos (js/avisos.js), así un aviso recién cargado aparece al instante. */
  function avisarAvisos() {
    try { if (window.SAE_AVISOS) SAE_AVISOS.desdeReclamos(estado.reclamos.map(r => ({ fila: r.fila, v: r.v }))); } catch (e) { /* nada */ }
  }
  const capitalizar = (t) => String(t || '').toLowerCase().replace(/(^|[\s/])\S/g, s => s.toUpperCase());

  function toast(msg, tipo) {
    const t = $('toastRec');
    t.textContent = msg;
    t.className = 'rec-toast visible ' + (tipo || '');
    clearTimeout(toast._t);
    // Los errores quedan más tiempo para poder leerlos (se cierran tocándolos)
    toast._t = setTimeout(() => { t.className = 'rec-toast'; }, tipo === 'error' ? 12000 : 3500);
    t.onclick = () => { t.className = 'rec-toast'; };
  }

  function limpiarProveedor(p) {
    return mayus(p).replace(/\s+(S\.?A\.?|S\.?R\.?L\.?)$/, '').trim();
  }

  /* ======================================================================
   * CONEXIÓN CON EL SCRIPT
   * ====================================================================== */
  function marcarConexion(tipo, texto) {
    const el = $('estadoConexion');
    el.className = 'rec-conexion ' + tipo;
    el.querySelector('.txt').textContent = texto;
  }

  /**
   * Lee la respuesta del script. Si Google devolvió una página de error (HTML)
   * en lugar de datos, extrae el motivo para mostrarlo claro.
   */
  const VERSION_SCRIPT_ESPERADA = 8;
  let avisoVersionMostrado = false;

  async function leerRespuesta(r) {
    const texto = await r.text();
    let json = null;
    try { json = JSON.parse(texto); } catch (e) { /* no es JSON */ }
    if (json) {
      if (json.version) { estado.versionScript = json.version; guardarLS('sae-script-version', String(json.version)); }
      // Si el script publicado es viejo, se avisa (una vez) cómo actualizarlo
      if (!avisoVersionMostrado && (json.version || 0) < VERSION_SCRIPT_ESPERADA) {
        avisoVersionMostrado = true;
        mostrarAvisoVersion(json.version || 1);
      }
      return json;
    }
    let motivo = '';
    try {
      const doc = new DOMParser().parseFromString(texto, 'text/html');
      doc.querySelectorAll('script, style').forEach(n => n.remove());
      const cuerpo = (doc.body ? doc.body.textContent : '').replace(/\s+/g, ' ').trim();
      motivo = cuerpo || (doc.title || '').trim();
    } catch (e) { /* nada */ }
    const t = motivo.toLowerCase();
    let pista = '';
    if (/iniciar sesi|sign in|accounts\.google/.test(t) || /accounts\.google/.test(r.url || '')) {
      pista = 'El script pide iniciar sesión: en "Administrar implementaciones", "Quién tiene acceso" tiene que ser "Cualquier persona" y "Ejecutar como" tiene que ser "Yo".';
    } else if (/no se encontr|not found|function not found|no se puede abrir/.test(t)) {
      pista = 'Google no encontró el script: revisá que el link de reclamos-config.js sea el de la implementación actual y termine en /exec.';
    } else if (/autoriz|authoriz|permis/.test(t)) {
      pista = 'Falta autorizar el script: abrí Apps Script, ejecutá cualquier función con ▶ y aceptá los permisos; después volvé a implementar.';
    }
    throw new Error((pista || 'Google respondió con una página de error en lugar de datos.') +
      (motivo ? ' Detalle de Google: ' + motivo.slice(0, 220) : ''));
  }

  function mostrarAvisoVersion(v) {
    let caja = document.getElementById('avisoVersion');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'avisoVersion';
      caja.className = 'rec-alerta rec-aviso-version';
      const main = document.querySelector('.rec-main');
      main.insertBefore(caja, main.firstChild);
    }
    caja.innerHTML = `⚠️ <strong>El script publicado en Google es una versión vieja</strong> (versión ${v}; esta página necesita la ${VERSION_SCRIPT_ESPERADA}). ` +
      `En Apps Script: pegá el <code>Codigo.gs</code> nuevo, guardá y andá a <strong>Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar</strong>. ` +
      `Revisá también que el link de esa implementación sea el mismo que está en <code>reclamos-config.js</code>.`;
  }

  async function llamarGet(params) {
    const url = estado.url + '?' + new URLSearchParams(Object.assign({ clave: estado.clave }, params)).toString();
    const r = await fetch(url, { method: 'GET', redirect: 'follow' });
    const json = await leerRespuesta(r);
    if (!json.ok) throw new Error(json.error || 'Error desconocido');
    return json;
  }

  async function llamarPost(cuerpo) {
    // text/plain evita la verificación previa (CORS) que Apps Script no admite
    const r = await fetch(estado.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ clave: estado.clave }, cuerpo))
    });
    const json = await leerRespuesta(r);
    if (!json.ok) throw new Error(json.error || 'Error desconocido');
    return json;
  }

  function mensajeError(err) {
    const m = String(err && err.message || err);
    if (m.includes('CLAVE_INCORRECTA')) return 'La clave no es correcta.';
    if (m.includes('Failed to fetch') || m.includes('NetworkError') || m.includes('Load failed')) {
      return 'No se pudo conectar con la hoja. Revisá la conexión a internet o el link del script.';
    }
    return m;
  }

  /** Aviso en "Buscar": qué años se están mostrando, con opción de traer todos. */
  function pintarAvisoAnios() {
    let el = $('avisoAnios');
    if (!el) {
      el = document.createElement('p');
      el.id = 'avisoAnios';
      el.className = 'rec-aviso-anios';
      $('resultadosConteo').parentNode.parentNode.insertBefore(el, $('resultadosConteo').parentNode);
    }
    if (estado.todosLosAnios) { el.innerHTML = 'Mostrando reclamos de todos los años.'; return; }
    el.innerHTML = `Mostrando reclamos desde ${estado.desde}. <button type="button" class="rec-link" id="btnTodosAnios">Ver también años anteriores</button>`;
    $('btnTodosAnios').addEventListener('click', () => cargarTodosLosAnios());
  }

  async function cargarTodosLosAnios() {
    estado.todosLosAnios = true;
    const ok = await cargarReclamos();
    if (!ok) estado.todosLosAnios = false;
    pintarAvisoAnios();
    return ok;
  }

  /* Copia local de la última lista: la página la muestra al instante mientras
     trae la versión nueva de la hoja (si no entra en el navegador, no se guarda). */
  const CACHE_LISTA = 'sae-reclamos-lista-v1';
  function leerCopiaLocal() {
    try {
      const c = JSON.parse(leerLS(CACHE_LISTA) || 'null');
      if (c && c.desde === (estado.todosLosAnios ? 0 : estado.desde) && Array.isArray(c.filas)) return c;
    } catch (e) { /* copia dañada: se ignora */ }
    return null;
  }
  function guardarCopiaLocal(filas, desde) {
    try { localStorage.setItem(CACHE_LISTA, JSON.stringify({ desde, guardado: Date.now(), filas })); }
    catch (e) { borrarLS(CACHE_LISTA); }
  }

  function mostrarLista(filas) {
    estado.reclamos = filas.map(prepararReclamo);
    superponerPendientes();
    estado.versionDatos = (estado.versionDatos || 0) + 1;
    estado.cargado = true;
    llenarFiltrosDesdeDatos();
    aplicarFiltros();
    actualizarBadge();
    revisarDuplicado();
    avisarAvisos();
  }

  /* ---------- (2.8.8) La lista se actualiza sola ----------
   * Cada 1 minuto se le pregunta al script si cambió algo (acción "cambios": una respuesta mínima).
   * Solo si cambió (reclamos nuevos, estados, filas eliminadas desde la página o a mano) se vuelve a
   * leer la lista, sin cartel de "Cargando…". No se hace con una ventana abierta, eligiendo varios,
   * clasificando a mano o con la pestaña escondida (se hace apenas se vuelve). */
  const REFRESCO_MS = 60000;
  function puedeRefrescar() {
    return estado.cargado && !document.hidden && !estado.modal && !estado.seleccion && !editorEnUso() && !estado.refrescando &&
      (estado.versionScript || Number(leerLS('sae-script-version')) || 0) >= 33;
  }
  async function chequearCambios(forzar) {
    if (!puedeRefrescar()) { estado.refrescoPendiente = estado.refrescoPendiente || !!forzar; return; }
    estado.refrescando = true;
    try {
      const c = await llamarGet({ accion: 'cambios' });
      const firma = `${c.marca}|${c.filas}`;
      const cambio = estado.firmaHoja !== undefined && firma !== estado.firmaHoja;
      estado.firmaHoja = firma;
      if (cambio || forzar) await cargarReclamos(true);
    } catch (e) { /* sin conexión: se prueba en el próximo minuto */ }
    finally { estado.refrescando = false; estado.refrescoPendiente = false; }
  }
  /** Después de un cambio que mueve filas: se actualiza en unos segundos (o apenas se pueda). */
  function refrescarPronto() {
    clearTimeout(refrescarPronto._t);
    refrescarPronto._t = setTimeout(() => chequearCambios(true), 2500);
  }
  setInterval(() => chequearCambios(estado.refrescoPendiente), REFRESCO_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && estado.cargado) chequearCambios(estado.refrescoPendiente); });

  async function cargarReclamos(silencioso) {
    const desde = estado.todosLosAnios ? 0 : estado.desde;
    const copia = !estado.cargado ? leerCopiaLocal() : null;
    if (copia) {
      mostrarLista(copia.filas);
      pintarAvisoAnios();
      marcarConexion('cargando', `Mostrando lo guardado · actualizando…`);
    } else {
      marcarConexion('cargando', 'Leyendo la hoja…');
      if (!silencioso) $('resultadosConteo').textContent = 'Cargando reclamos de la hoja…';
    }
    try {
      const res = await llamarGet({ accion: 'listar', desde });
      if (res.autoDesde) { estado.autoDesde = res.autoDesde; guardarLS('sae-auto-desde', res.autoDesde); }   // (2.8.0)
      if (!estado.opcionesPedidas) { estado.opcionesPedidas = true; setTimeout(cargarOpciones, 500); }
      guardarCopiaLocal(res.filas, desde);
      // (2.8.8) Si se estaba mirando la lista, se conserva cuántos se mostraban
      if (silencioso) estado.conservarMostrados = estado.mostrados || 0;
      estado.reclamos = res.filas.map(prepararReclamo);
      superponerPendientes();
      estado.versionDatos = (estado.versionDatos || 0) + 1;
      // Script viejo (sin filtro por año): llegan todos los años
      if (!res.desde && !estado.todosLosAnios) estado.todosLosAnios = estado.reclamos.some(r => r.fecha && r.fecha.getFullYear() < estado.desde);
      pintarAvisoAnios();
      estado.cargado = true;
      marcarConexion('ok', `Conectado · ${estado.reclamos.length.toLocaleString('es-AR')} reclamos`);
      llenarFiltrosDesdeDatos();
      aplicarFiltros();
      actualizarBadge();
      revisarDuplicado();
      if (!estado._horariosPedidos) { estado._horariosPedidos = true; cargarHorarios().then(() => { if (estado.horarios && estado.horarios.length) aplicarFiltros(); }); }   // (2.9.0)
      return true;
    } catch (err) {
      const msg = mensajeError(err);
      marcarConexion('error', copia ? 'Sin conexión · mostrando lo guardado' : 'Sin conexión');
      if (msg === 'La clave no es correcta.') {
        borrarLS(CACHE_LISTA);
        borrarLS(CLAVE_LS);
        estado.clave = '';
        mostrarConexion(msg);
      } else {
        $('resultadosConteo').textContent = '⚠️ ' + msg;
        toast('⚠️ ' + msg, 'error');
      }
      return false;
    }
  }

  /** Agrega a cada fila los datos derivados que usan los filtros. */
  function prepararReclamo(item) {
    const v = item.v;
    const fecha = parsearFecha(v[C.FECHA]);
    const motivo = mayus(v[C.SUBCATEGORIA]);
    let problema = mayus(v[C.PROBLEMA]);
    let estimado = false;
    let sugerida = null;   // se calcula una sola vez por fila (es lo que más tarda al cargar)
    const sugerir = () => sugerida || (sugerida = ASISTENTE.sugerir(v[C.DETALLE]));
    if (!problema && motivo) {
      // Reclamos sin "Problema" cargado: se estima a partir del detalle si coincide la clasificación
      const s = sugerir();
      if (s.categoria === mayus(v[C.CATEGORIA]) && s.motivo === motivo && s.problema) { problema = s.problema; estimado = true; }
    }
    let patologia = mayus(v[C.PATOLOGIA]);
    let patEstimada = false;
    if (!patologia) {
      const p = sugerir().patologia;
      if (p) { patologia = p; patEstimada = true; }
    }
    const escNombre = mayus(v[C.ESCUELA]);
    const escData = ESCUELAS.find(e => mayus(e.nombre) === escNombre || (e.alias || []).some(a => mayus(a) === escNombre));
    const estadoTxt = String(v[C.ESTADO] || '').trim();
    return {
      fila: item.fila,
      v,
      fecha,
      sugerir,   // sugerencia del ASISTENTE para el detalle (se calcula una vez)
      est: {
        escuela: escNombre,
        // Nombre actual del establecimiento (si el reclamo se cargó con un nombre viejo o alias)
        escuelaBase: escData ? mayus(escData.nombre) : escNombre,
        escuelaConocida: !!escData || /^(TODAS LAS|TODOS LOS) /.test(escNombre),
        proveedor: limpiarProveedor(v[C.PROVEEDOR]),
        servicio: mayus(v[C.SERVICIO]),
        categoria: mayus(v[C.CATEGORIA]),
        motivo,
        producto: mayus(v[C.PRODUCTO]),
        problema,
        problemaEstimado: estimado,
        patologia,
        patologiaEstimada: patEstimada,
        estado: (fecha && fecha.getFullYear() <= ANIO_CIERRE_RESUELTOS) ? 'Resuelto'
          : (estadoTxt ? capitalizar(estadoTxt).replace('En Gestión', 'En gestión') : 'Sin estado'),
        zona: escData && escData.zona ? String(escData.zona) : '',
        texto: norm([v[C.ESCUELA], escData ? escData.nombre : '', v[C.DETALLE], v[C.PRODUCTO], v[C.PROVEEDOR], v[C.ACCIONES]].join(' '))
      }
    };
  }

  /* ======================================================================
   * PANTALLA DE CONEXIÓN
   * ====================================================================== */
  function mostrarConexion(error) {
    $('app').style.display = 'none';
    $('panelConexion').style.display = 'block';
    $('avisoSinUrl').style.display = estado.url ? 'none' : 'block';
    $('formClave').style.display = estado.url ? 'flex' : 'none';
    $('conexionTexto').textContent = error
      ? '⚠️ ' + error + (error.includes('clave') ? ' Volvé a ingresarla.' : '')
      : 'Ingresá la clave del equipo para cargar y ver los reclamos.';
    marcarConexion(error ? 'error' : '', error ? 'Sin conexión' : 'Sin conectar');
    if (estado.url) setTimeout(() => $('inputClave').focus(), 50);
  }

  async function conectar(clave) {
    estado.clave = clave;
    const btn = $('formClave').querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Conectando…';
    try {
      await llamarGet({ accion: 'ping' });
      guardarLS(CLAVE_LS, clave);
      mostrarApp();
    } catch (err) {
      estado.clave = '';
      mostrarConexion(mensajeError(err));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Conectar';
    }
  }

  /** Si el script no tiene clave configurada, se entra directo. */
  async function probarSinClave() {
    marcarConexion('cargando', 'Conectando…');
    try {
      await llamarGet({ accion: 'ping' });
      estado.sinClave = true;
      $('btnCerrarSesion').style.display = 'none';
      mostrarApp();
    } catch (err) {
      const msg = mensajeError(err);
      // Si pide clave, se muestra la pantalla de clave; si es otro error, se avisa
      mostrarConexion(msg === 'La clave no es correcta.' ? '' : msg);
    }
  }

  function mostrarApp() {
    $('panelConexion').style.display = 'none';
    $('app').style.display = 'block';
    cargarReclamos();
  }

  /* ======================================================================
   * FORMULARIO: OPCIONES
   * ====================================================================== */
  function llenarSelect(sel, opciones, conVacio, textoVacio) {
    const actual = sel.value;
    sel.innerHTML = '';
    if (conVacio) sel.appendChild(new Option(textoVacio || 'Todos', ''));
    opciones.forEach(o => {
      const op = typeof o === 'string' ? new Option(o, o) : new Option(o.etiqueta, o.valor);
      sel.appendChild(op);
    });
    if ([...sel.options].some(o => o.value === actual)) sel.value = actual;
  }

  function botonesOpciones(cont, opciones, seleccionado, alElegir) {
    cont.innerHTML = '';
    opciones.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rec-opcion' + (o.valor === seleccionado ? ' activa' : '');
      b.dataset.valor = o.valor;
      b.setAttribute('aria-pressed', o.valor === seleccionado ? 'true' : 'false');
      b.innerHTML = (o.icono ? `<span class="rec-opcion-icono">${o.icono}</span>` : '') + `<span>${esc(o.etiqueta)}</span>`;
      if (o.ayuda) b.title = o.ayuda;
      b.addEventListener('click', () => alElegir(o.valor));
      cont.appendChild(b);
    });
  }

  /* ======================================================================
   * (2.8.0) MOTIVOS Y PRODUCTOS ESCRITOS A MANO (script v26)
   * - Motivo: "✏️ Otro…" para escribirlo; con la tilde se suma como opción para todos
   *   (pestaña Lista del Tablero).
   * - Producto: se escribe directo; si no existe se crea en la lista del Tablero.
   * - Antes de crear algo, avisa si ya hay una opción igual o parecida.
   * ====================================================================== */
  const LS_OPCIONES = 'sae-opciones-v1';
  const VERSION_OPCIONES = 26;
  const normOp = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  // Plurales: "faltantes" = "faltante", "panes" = "pan" (se prueban las dos formas)
  const sinS = (t) => t.split(' ').map(w => w.length > 3 && /S$/.test(w) ? w.slice(0, -1) : w).join(' ');
  const sinES = (t) => t.split(' ').map(w => w.length > 4 && /ES$/.test(w) ? w.slice(0, -2) : w).join(' ');
  const formas = (t) => [t, sinS(t), sinES(t)];
  const mismaPalabra = (a, b) => { const fa = formas(a), fb = formas(b); return fa.some(x => fb.includes(x)); };
  function distancia(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  /** Opciones iguales o parecidas a `texto`: [{ valor, igual }] (las iguales primero). */
  function parecidas(texto, opciones) {
    const t0 = normOp(texto), t = sinS(t0);
    if (!t0) return [];
    const out = [];
    opciones.forEach(o => {
      const v = typeof o === 'string' ? o : o.valor;
      const n0 = normOp(v), n = sinS(n0);
      if (!n0) return;
      if (mismaPalabra(n0, t0)) { out.push({ valor: v, igual: true }); return; }
      const corto = Math.min(n.length, t.length);
      if ((corto >= 4 && (n.includes(t) || t.includes(n))) || (corto >= 4 && distancia(n, t) <= (corto >= 8 ? 2 : 1))) out.push({ valor: v, igual: false });
    });
    return out.sort((a, b) => (b.igual ? 1 : 0) - (a.igual ? 1 : 0)).slice(0, 4);
  }
  /** Suma a CLASIFICACION los motivos agregados desde la página y los productos de la hoja. */
  function aplicarOpciones(o) {
    if (!o) return;
    const me = o.motivosExtra || {};
    Object.keys(me).forEach(cat => {
      const lista = CLASIFICACION.motivos[cat];
      if (!lista) return;
      (me[cat] || []).forEach(m => {
        if (lista.some(x => normOp(x.valor) === normOp(m))) return;
        const iOtros = lista.findIndex(x => x.valor === 'OTROS');
        const op = { valor: m, etiqueta: capitalizar(m), ayuda: 'Motivo agregado desde la página.' };
        if (iOtros >= 0) lista.splice(iOtros, 0, op); else lista.push(op);
      });
    });
    (o.productos || []).forEach(p => { if (p && !CLASIFICACION.productos.some(x => normOp(x) === normOp(p))) CLASIFICACION.productos.push(p); });
    pintarListaProductos();
  }
  try { aplicarOpciones(JSON.parse(leerLS(LS_OPCIONES) || 'null')); } catch (e) { /* nada */ }
  async function cargarOpciones() {
    if ((estado.versionScript || Number(leerLS('sae-script-version')) || 0) < VERSION_OPCIONES) return;
    try {
      const o = await llamarGet({ accion: 'opciones' });
      guardarLS(LS_OPCIONES, JSON.stringify({ motivosExtra: o.motivosExtra, productos: o.productos }));
      aplicarOpciones(o);
      if (estado.form && estado.form.categoria) pintarMotivos();
    } catch (e) { /* se queda con lo guardado */ }
  }
  const puedeCrearOpciones = () => (estado.versionScript || Number(leerLS('sae-script-version')) || 0) >= VERSION_OPCIONES;

  /**
   * Cuadrito para escribir un motivo a mano. `alUsar(valor)` recibe el motivo (en mayúsculas).
   * Si hay uno igual o parecido en esa categoría, lo ofrece antes.
   */
  function cajaMotivoLibre(contenedor, categoria, alUsar, alCancelar) {
    const caja = document.createElement('div');
    caja.className = 'rec-libre';
    caja.innerHTML = `<div class="rec-libre-fila">
        <input type="text" maxlength="60" placeholder="Escribí el motivo…" aria-label="Motivo escrito a mano">
        <button type="button" class="btn btn-primary btn-sm" data-l="usar">Usar</button>
        <button type="button" class="btn btn-secondary btn-sm" data-l="cancelar">Cancelar</button></div>
      <label class="rec-libre-check"><input type="checkbox" data-l="sumar"> Agregarlo como opción para todos (queda en la lista de ${esc(etqCategoria(categoria))})</label>
      <div class="rec-libre-aviso" aria-live="polite"></div>`;
    contenedor.after(caja);
    const inp = caja.querySelector('input');
    const aviso = caja.querySelector('.rec-libre-aviso');
    const opciones = () => CLASIFICACION.motivos[categoria] || [];
    let confirmado = '';
    const usar = async (valor, crear) => {
      const v = mayus(valor);
      if (crear) {
        if (!puedeCrearOpciones()) { toast('⚠️ Para agregar motivos a la lista hay que actualizar el script de Google (versión 26). Se usa solo en este reclamo.', 'error'); }
        else {
          try {
            const o = await llamarPost({ accion: 'motivoNuevo', categoria, motivo: v });
            guardarLS(LS_OPCIONES, JSON.stringify({ motivosExtra: o.motivosExtra, productos: o.productos }));
            aplicarOpciones(o);
            toast(`✔️ "${capitalizar(v)}" quedó como opción de ${etqCategoria(categoria)} para todos.`, 'ok');
          } catch (err) { toast('⚠️ No se pudo agregar a la lista: ' + mensajeError(err) + '. Se usa solo en este reclamo.', 'error'); }
        }
      }
      caja.remove();
      alUsar(v);
    };
    const intentar = () => {
      const t = inp.value.trim();
      if (!t) { inp.focus(); return; }
      const crear = caja.querySelector('[data-l="sumar"]').checked;
      const par = parecidas(t, opciones());
      const igual = par.find(x => x.igual);
      if (igual) { usar(igual.valor, false); return; }   // ya existe: se usa ese
      if (par.length && confirmado !== normOp(t)) {
        aviso.innerHTML = `⚠️ Ya hay ${par.length === 1 ? 'una opción parecida' : 'opciones parecidas'}: ` +
          par.map(x => `<button type="button" class="rec-libre-sug" data-v="${esc(x.valor)}">${esc(etqMotivo(x.valor, categoria))}</button>`).join(' ') +
          `<br>¿Estás seguro de usar <strong>"${esc(t)}"</strong>? <button type="button" class="rec-libre-si">Sí, usar "${esc(t)}"</button>`;
        aviso.querySelectorAll('.rec-libre-sug').forEach(b => b.addEventListener('click', () => usar(b.dataset.v, false)));
        aviso.querySelector('.rec-libre-si').addEventListener('click', () => { confirmado = normOp(t); intentar(); });
        return;
      }
      usar(t, crear);
    };
    caja.querySelector('[data-l="usar"]').addEventListener('click', intentar);
    caja.querySelector('[data-l="cancelar"]').addEventListener('click', () => { caja.remove(); if (alCancelar) alCancelar(); });
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); intentar(); } if (ev.key === 'Escape') { ev.stopPropagation(); caja.remove(); if (alCancelar) alCancelar(); } });
    inp.addEventListener('input', () => { aviso.innerHTML = ''; confirmado = ''; });
    setTimeout(() => inp.focus(), 20);
    return caja;
  }

  /* ---------- Producto: se escribe directo (con sugerencias) y, si no existe, se crea ---------- */
  function pintarListaProductos() {
    const dl = $('listaProductos');
    if (!dl) return;
    dl.innerHTML = CLASIFICACION.productos.map(p => `<option value="${esc(capitalizar(p))}">`).join('');
  }
  /** Valor del producto listo para guardar ('' si no hay; null si es uno nuevo sin crear). */
  function productoElegido() {
    const t = ($('fProducto').value || '').trim();
    if (!t) return '';
    const igual = CLASIFICACION.productos.find(p => normOp(p) === normOp(t));
    return igual || null;
  }
  function revisarProducto() {
    const caja = $('productoAviso');
    if (!caja) return;
    const t = ($('fProducto').value || '').trim();
    $('fProducto').classList.remove('invalido');
    if (!t || productoElegido() !== null) { caja.innerHTML = ''; return; }
    const par = parecidas(t, CLASIFICACION.productos).filter(x => !x.igual);
    caja.innerHTML = `<div class="rec-libre-aviso">` +
      (par.length ? `⚠️ "${esc(t)}" no está en la lista, pero hay ${par.length === 1 ? 'uno parecido' : 'parecidos'}: ` +
        par.map(x => `<button type="button" class="rec-libre-sug" data-v="${esc(x.valor)}">${esc(capitalizar(x.valor))}</button>`).join(' ') + '<br>¿Estás seguro de crear uno nuevo? '
        : `"${esc(t)}" no está en la lista de productos. `) +
      `<button type="button" class="rec-libre-si" data-crear>＋ Crear "${esc(capitalizar(t))}" como producto nuevo</button></div>`;
    caja.querySelectorAll('.rec-libre-sug').forEach(b => b.addEventListener('click', () => { $('fProducto').value = capitalizar(b.dataset.v); caja.innerHTML = ''; actualizarResumen(); }));
    caja.querySelector('[data-crear]').addEventListener('click', async (ev) => {
      if (!puedeCrearOpciones()) { toast('⚠️ Para crear productos hay que actualizar el script de Google (versión 26).', 'error'); return; }
      ev.target.disabled = true; ev.target.textContent = 'Creando…';
      try {
        const o = await llamarPost({ accion: 'productoNuevo', producto: t });
        guardarLS(LS_OPCIONES, JSON.stringify({ motivosExtra: o.motivosExtra, productos: o.productos }));
        aplicarOpciones(o);
        if (!CLASIFICACION.productos.some(p => normOp(p) === normOp(t))) CLASIFICACION.productos.push(mayus(t));
        pintarListaProductos();
        caja.innerHTML = '';
        toast(`✔️ Producto "${capitalizar(t)}" creado en la lista para todos.`, 'ok');
        actualizarResumen();
      } catch (err) {
        ev.target.disabled = false; ev.target.textContent = `＋ Crear "${capitalizar(t)}" como producto nuevo`;
        toast('⚠️ No se pudo crear el producto: ' + mensajeError(err), 'error');
      }
    });
  }

  function proveedoresConocidos() {
    const set = new Set(CLASIFICACION.proveedoresBase);
    ESCUELAS.forEach(e => {
      [e.proveedor, ...(e.servicios || []).map(s => s.proveedor)].forEach(p => {
        const l = limpiarProveedor(p);
        if (l && /[A-Z]/.test(l) && !/^\d/.test(l)) set.add(l);
      });
    });
    estado.reclamos.forEach(r => { if (r.est.proveedor && /[A-Z]/.test(r.est.proveedor)) set.add(r.est.proveedor); });
    return [...set].sort();
  }

  function iniciarFormulario() {
    $('fFecha').value = hoyISO();
    $('fFecha').max = hoyISO();
    llenarSelect($('fServicio'), CLASIFICACION.servicios);
    llenarSelect($('fProveedor'), proveedoresConocidos(), true, 'Elegí el proveedor…');
    pintarListaProductos();   // (2.8.0) el producto se escribe (con sugerencias de la lista)
    llenarSelect($('fPatologia'), CLASIFICACION.patologias.map(p => ({ valor: p, etiqueta: capitalizar(p) })), true, 'No');
    llenarSelect($('fResponsable'), CLASIFICACION.responsables);
    $('fResponsable').value = 'Muni';
    pintarCategorias();
    pintarEstadoForm();
    actualizarResumen();
  }

  function pintarCategorias() {
    botonesOpciones($('opcCategoria'), CLASIFICACION.categorias, estado.form.categoria, (v) => {
      // Tocar la categoría que ya está elegida la deselecciona
      fijarCategoria(estado.form.categoria === v ? '' : v);
      pintarCategorias();
      pintarMotivos();
      actualizarResumen();
      revisarDuplicado();
    });
  }

  function pintarMotivos() {
    const cat = estado.form.categoria;
    $('campoMotivo').style.display = cat ? '' : 'none';
    $('filaProducto').style.display = cat === 'ALIMENTOS' ? '' : 'none';
    const lista = (CLASIFICACION.motivos[cat] || []).slice();
    // (2.8.0) Un motivo escrito a mano (que no está en la lista) se muestra como una opción más
    if (estado.form.motivo && !lista.some(o => o.valor === estado.form.motivo)) lista.push({ valor: estado.form.motivo, etiqueta: capitalizar(estado.form.motivo) + ' ✏️', ayuda: 'Escrito a mano (solo en este reclamo).' });
    botonesOpciones($('opcMotivo'), lista, estado.form.motivo, (v) => {
      // Tocar el motivo que ya está elegido lo deselecciona
      estado.form.problema = '';
      estado.form.motivo = estado.form.motivo === v ? '' : v;
      pintarMotivos();
      actualizarResumen();
      revisarDuplicado();
    });
    if (cat) {
      const otro = document.createElement('button');
      otro.type = 'button';
      otro.className = 'rec-opcion rec-opcion-otro';
      otro.innerHTML = '<span>✏️ Otro…</span>';
      otro.title = 'Escribir un motivo que no está en la lista';
      otro.addEventListener('click', () => {
        if ($('campoMotivo').querySelector('.rec-libre')) return;
        cajaMotivoLibre($('opcMotivo'), cat, (v) => {
          estado.form.problema = '';
          estado.form.motivo = v;
          pintarMotivos(); actualizarResumen(); revisarDuplicado();
        });
      });
      $('opcMotivo').appendChild(otro);
    }
    const m = lista.find(o => o.valor === estado.form.motivo);
    $('ayudaMotivo').textContent = m ? m.ayuda : 'Pasá el mouse sobre cada opción para ver cuándo usarla.';
    pintarProblemas();
  }

  function pintarProblemas() {
    // Alimentos (faltante / calidad), mantenimiento y equipamiento tienen su lista de problemas
    const lista = (estado.form.motivo && estado.form.motivo !== 'OTROS' && CLASIFICACION.problemas[estado.form.motivo]) || null;
    $('campoProblema').style.display = lista ? '' : 'none';
    if (!lista) { estado.form.problema = ''; return; }
    botonesOpciones($('opcProblema'), lista, estado.form.problema, (v) => {
      estado.form.problema = estado.form.problema === v ? '' : v;
      pintarProblemas();
      actualizarResumen();
    });
    const p = lista.find(o => o.valor === estado.form.problema);
    $('ayudaProblema').textContent = p ? p.ayuda : 'Ayuda a saber qué pasó exactamente. Se puede dejar sin marcar.';
  }

  function pintarEstadoForm() {
    botonesOpciones($('opcEstado'), CLASIFICACION.estados.map(e => ({ valor: e, etiqueta: e })), estado.form.estado, (v) => {
      estado.form.estado = v;
      pintarEstadoForm();
      actualizarResumen();
    });
  }

  /* ======================================================================
   * FORMULARIO: ESCUELA (autocompletado)
   * ====================================================================== */
  function buscarEscuelas(q) {
    const t = norm(q);
    if (!t) return [];
    const compacto = t.replace(/\s+/g, '');
    return ESCUELAS.filter(e => {
      const n = norm(e.nombre);
      return n.includes(t) || n.replace(/\s+/g, '').includes(compacto) ||
             (e.alias || []).some(a => norm(a).includes(t)) ||
             norm(e.direccion).includes(t) || String(e.cue || '').includes(t);
    }).sort((a, b) => {
      const an = norm(a.nombre), bn = norm(b.nombre);
      return (bn.startsWith(t) - an.startsWith(t)) || an.localeCompare(bn, 'es', { numeric: true });
    }).slice(0, 12);
  }

  /* ---------- Mismo reclamo para varias escuelas ----------
   * estado.multi: Map nombre → escuela. Mientras está activo, el campo "Escuela"
   * queda bloqueado y al guardar se crea un reclamo por cada escuela de la lista. */
  const esPseudoEscuela = (e) => /^(TODAS LAS|TODOS LOS) /i.test(String(e.nombre || '').trim()) || mayus(e.nombre) === 'MEDIDA DE ABRIGO';
  function multiActivo() { return !!estado.multi; }
  function abrirMulti() {
    estado.multi = new Map();
    if (estado.escuela) estado.multi.set(estado.escuela.nombre, estado.escuela);
    $('panelMulti').style.display = '';
    $('btnMulti').style.display = 'none';
    $('fEscuela').disabled = true;
    $('infoEscuela').style.display = 'none';
    $('abiertosEscuela').style.display = 'none';
    $('avisoDuplicado').style.display = 'none';
    llenarGruposMulti();
    pintarMulti();
    setTimeout(() => $('multiBuscar').focus(), 30);
  }
  function salirMulti(mantener) {
    const primera = estado.multi && estado.multi.size ? [...estado.multi.values()][0] : null;
    estado.multi = null;
    $('panelMulti').style.display = 'none';
    $('btnMulti').style.display = '';
    $('fEscuela').disabled = false;
    $('multiChips').innerHTML = '';
    if (mantener && primera) elegirEscuela(primera);
    else if (!mantener) { estado.escuela = null; $('fEscuela').value = ''; }
    actualizarResumen();
    revisarDuplicado();
  }
  /** (2.8.7) Opciones de grupos (proveedor, tipo, zona, todas) para un desplegable. */
  function htmlGrupos(serv) {
    const reales = ESCUELAS.filter(e => !esPseudoEscuela(e));
    const provs = [...new Set(reales.map(e => proveedorDeServicio(e, serv)).filter(Boolean))].sort();
    const tipos = [...new Set(reales.map(e => e.tipo).filter(Boolean))].sort();
    const zonas = [...new Set(reales.map(e => String(e.zona || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    const servTxt = serv === 'COMEDOR' ? 'comedor' : 'desayuno/merienda';
    return '<option value="">Agregar un grupo…</option>' +
      `<optgroup label="Por proveedor (${servTxt})">${provs.map(p => `<option value="prov:${esc(p)}">Todas las de ${esc(p)}</option>`).join('')}</optgroup>` +
      `<optgroup label="Por tipo">${tipos.map(t => `<option value="tipo:${esc(t)}">${esc(t)}</option>`).join('')}</optgroup>` +
      `<optgroup label="Por zona">${zonas.map(z => `<option value="zona:${esc(z)}">${/^\d+$/.test(z) ? 'Zona ' + esc(z) : esc(capitalizar(z))}</option>`).join('')}</optgroup>` +
      '<option value="todas">Todas las escuelas</option>';
  }
  function escuelasDeGrupo(valor, serv) {
    const [tipo, ...resto] = valor.split(':');
    const v = resto.join(':');
    return ESCUELAS.filter(e => !esPseudoEscuela(e) && (
      tipo === 'todas' ||
      (tipo === 'prov' && proveedorDeServicio(e, serv) === v) ||
      (tipo === 'tipo' && e.tipo === v) ||
      (tipo === 'zona' && String(e.zona || '') === v)));
  }
  function llenarGruposMulti() {
    const serv = $('fServicio').value === 'COMEDOR' ? 'COMEDOR' : 'DM';
    const reales = ESCUELAS.filter(e => !esPseudoEscuela(e));
    const provs = [...new Set(reales.map(e => proveedorDeServicio(e, serv)).filter(Boolean))].sort();
    const tipos = [...new Set(reales.map(e => e.tipo).filter(Boolean))].sort();
    const zonas = [...new Set(reales.map(e => String(e.zona || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    const servTxt = serv === 'COMEDOR' ? 'comedor' : 'desayuno/merienda';
    $('multiGrupo').innerHTML = '<option value="">Agregar un grupo…</option>' +
      `<optgroup label="Por proveedor (${servTxt})">${provs.map(p => `<option value="prov:${esc(p)}">Todas las de ${esc(p)}</option>`).join('')}</optgroup>` +
      `<optgroup label="Por tipo">${tipos.map(t => `<option value="tipo:${esc(t)}">${esc(t)}</option>`).join('')}</optgroup>` +
      `<optgroup label="Por zona">${zonas.map(z => `<option value="zona:${esc(z)}">${/^\d+$/.test(z) ? 'Zona ' + esc(z) : esc(capitalizar(z))}</option>`).join('')}</optgroup>` +
      '<option value="todas">Todas las escuelas</option>';
  }
  function agregarGrupoMulti(valor) {
    const serv = $('fServicio').value === 'COMEDOR' ? 'COMEDOR' : 'DM';
    const [tipo, ...resto] = valor.split(':');
    const v = resto.join(':');
    const lista = ESCUELAS.filter(e => !esPseudoEscuela(e) && (
      tipo === 'todas' ||
      (tipo === 'prov' && proveedorDeServicio(e, serv) === v) ||
      (tipo === 'tipo' && e.tipo === v) ||
      (tipo === 'zona' && String(e.zona || '') === v)));
    const antes = estado.multi.size;
    lista.forEach(e => estado.multi.set(e.nombre, e));
    toast(`➕ ${estado.multi.size - antes} escuelas agregadas`, 'ok');
    pintarMulti();
  }
  function pintarMulti() {
    if (!estado.multi) return;
    const n = estado.multi.size;
    $('multiN').textContent = n ? `${n} escuela${n === 1 ? '' : 's'}` : 'ninguna todavía';
    $('fEscuela').value = n ? `Varias escuelas (${n})` : '';
    const nombres = [...estado.multi.keys()].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    $('multiChips').innerHTML = nombres.map(nm => `<span class="rec-multi-chip">${esc(nm)}<button type="button" data-quitar="${esc(nm)}" aria-label="Quitar ${esc(nm)}" title="Quitar">✕</button></span>`).join('');
    $('multiChips').querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => { estado.multi.delete(b.dataset.quitar); pintarMulti(); }));
    // (2.8.0) "Quitar todas" arriba, al lado de la cantidad
    const vaciar = $('btnMultiVaciar');
    if (vaciar) {
      vaciar.style.display = n > 1 ? '' : 'none';
      if (!vaciar.dataset.conectado) { vaciar.dataset.conectado = '1'; vaciar.addEventListener('click', () => { estado.multi.clear(); pintarMulti(); }); }
    }
    actualizarResumen();
    revisarDuplicado();   // (2.9.0) también con varias escuelas
  }
  function mostrarListaMulti() {
    const lista = $('multiLista');
    const res = buscarEscuelas($('multiBuscar').value).filter(e => !estado.multi.has(e.nombre));
    lista.innerHTML = res.length ? '' : '<div class="rec-dropdown-vacio">No hay más escuelas con ese nombre</div>';
    res.forEach((e, i) => {
      const it = document.createElement('div');
      it.className = 'rec-dropdown-item' + (i === 0 ? ' activo' : '');
      it.innerHTML = `<strong>${esc(e.nombre)}</strong><small>${esc([e.tipo, e.direccion].filter(Boolean).join(' · '))}</small>`;
      it.addEventListener('mousedown', (ev) => { ev.preventDefault(); estado.multi.set(e.nombre, e); $('multiBuscar').value = ''; lista.style.display = 'none'; pintarMulti(); $('multiBuscar').focus(); });
      lista.appendChild(it);
    });
    lista.style.display = 'block';
  }
  /* ---------- (2.8.7) Escuela en la ventana del reclamo: corregirla o repartir en varias ---------- */
  const grupoDeServ = (serv) => mayus(serv) === 'COMEDOR' ? 'COMEDOR' : 'DM';
  /** Autocompletado de escuelas sobre un campo (input + lista desplegable). */
  function autocompletarEscuela(input, lista, alElegir) {
    const cerrar = () => { lista.style.display = 'none'; lista.innerHTML = ''; };
    const pintar = () => {
      const res = buscarEscuelas(input.value);
      if (!res.length) { cerrar(); return; }
      lista.innerHTML = res.map((e, i) => `<button type="button" class="rec-opcion-esc${i === 0 ? ' sae-tecla-activo' : ''}" data-i="${i}">${esc(e.nombre)}<small>${esc([e.tipo, e.proveedor].filter(Boolean).join(' · '))}</small></button>`).join('');
      lista.style.display = '';
      lista.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', (ev) => { ev.preventDefault(); alElegir(res[Number(b.dataset.i)]); cerrar(); }));
      lista._res = res;
    };
    input.addEventListener('input', pintar);
    input.addEventListener('focus', () => { if (input.value.trim()) pintar(); });
    input.addEventListener('blur', () => setTimeout(cerrar, 150));
    input.addEventListener('keydown', (ev) => {
      const bs = [...lista.querySelectorAll('button')];
      if (!bs.length) return;
      let i = bs.findIndex(b => b.classList.contains('sae-tecla-activo'));
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        i = ev.key === 'ArrowDown' ? Math.min(bs.length - 1, i + 1) : Math.max(0, i - 1);
        bs.forEach((b, k) => b.classList.toggle('sae-tecla-activo', k === i));
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        alElegir(lista._res[Math.max(0, i)]); cerrar();
      } else if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); }
    });
  }
  function prepararEscuelaModal(r) {
    estado.modalEscuela = null;
    estado.modalMulti = null;
    $('mEscuela').value = r.v[C.ESCUELA] || '';
    $('mEscuela').disabled = false;
    $('mMulti').style.display = 'none';
    $('btnMMulti').style.display = '';
  }
  function pintarMultiModal() {
    const m = estado.modalMulti;
    if (!m) return;
    const n = m.size;
    $('mMultiN').textContent = n ? `${n} escuela${n === 1 ? '' : 's'}` : 'ninguna todavía';
    $('mEscuela').value = n ? `Varias escuelas (${n})` : '';
    $('mMultiVaciar').style.display = n > 1 ? '' : 'none';
    const nombres = [...m.keys()];
    $('mMultiChips').innerHTML = nombres.map((nm, i) => `<span class="rec-multi-chip${i === 0 ? ' primera' : ''}" title="${i === 0 ? 'Esta queda en la fila del reclamo' : 'Se crea una fila nueva'}">${esc(nm)}<button type="button" data-quitar="${esc(nm)}" aria-label="Quitar ${esc(nm)}" title="Quitar">✕</button></span>`).join('');
    $('mMultiChips').querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => { m.delete(b.dataset.quitar); pintarMultiModal(); }));
  }
  function abrirMultiModal() {
    const r = estado.modal;
    if (!r) return;
    estado.modalMulti = new Map();
    const actual = estado.modalEscuela || ESCUELAS.find(e => mayus(e.nombre) === mayus(r.v[C.ESCUELA]) || (e.alias || []).some(a => mayus(a) === mayus(r.v[C.ESCUELA])));
    if (actual && !esPseudoEscuela(actual)) estado.modalMulti.set(actual.nombre, actual);
    $('mMulti').style.display = '';
    $('btnMMulti').style.display = 'none';
    $('mEscuela').disabled = true;
    $('mMultiGrupo').innerHTML = htmlGrupos(grupoDeServ($('mServicio').value || r.v[C.SERVICIO]));
    pintarMultiModal();
    setTimeout(() => $('mMultiBuscar').focus(), 30);
  }
  function salirMultiModal() {
    estado.modalMulti = null;
    $('mMulti').style.display = 'none';
    $('btnMMulti').style.display = '';
    $('mEscuela').disabled = false;
    const r = estado.modal;
    $('mEscuela').value = estado.modalEscuela ? estado.modalEscuela.nombre : (r ? r.v[C.ESCUELA] || '' : '');
  }
  /** Proveedor y cupo total de una escuela para el servicio y la fecha del reclamo. */
  function datosEscuelaPara(e, servHoja, r) {
    const fecha = r.fecha ? isoDe(r.fecha) : hoyISO();
    const ambos = mayus(servHoja) === 'DM/COMEDOR';
    const g = grupoDeServ(servHoja);
    const cupo = ambos ? (cupoDeServicio(e, 'DM', fecha) || 0) + (cupoDeServicio(e, 'COMEDOR', fecha) || 0) : cupoDeServicio(e, g, fecha);
    return { proveedor: proveedorDeServicio(e, g) || '', cupo: cupo || '' };
  }
  /** Datos para crear un reclamo igual a r en otra escuela (cola 'agregar'). */
  function copiaParaEscuela(r, e, servHoja) {
    const v = r.v, x = datosEscuelaPara(e, servHoja, r);
    return {
      fecha: r.fecha ? isoDe(r.fecha) : hoyISO(), escuela: e.nombre, proveedor: x.proveedor || v[C.PROVEEDOR] || '',
      servicio: servHoja || v[C.SERVICIO] || '', tipo: v[C.TIPO] || '', categoria: v[C.CATEGORIA] || '', subcategoria: v[C.SUBCATEGORIA] || '',
      detalle: v[C.DETALLE] || '', producto: v[C.PRODUCTO] || '', cupoDefectuoso: v[C.CUPO_DEF] || '', cupoTotal: x.cupo,
      estado: ['Pendiente', 'En gestión', 'Resuelto'].includes(r.est.estado) ? r.est.estado : '', responsable: v[C.RESPONSABLE] || '',
      acciones: v[C.ACCIONES] || '', problema: v[C.PROBLEMA] || '', patologia: v[C.PATOLOGIA] || ''
    };
  }
  function conectarEscuelaModal() {
    autocompletarEscuela($('mEscuela'), $('mEscuelaLista'), (e) => {
      estado.modalEscuela = e;
      $('mEscuela').value = e.nombre;
      // El proveedor de esa escuela para el servicio del reclamo (si lo tiene)
      const r = estado.modal;
      if (r) {
        const x = datosEscuelaPara(e, $('mServicio').value || r.v[C.SERVICIO], r);
        if (x.proveedor) {
          if (![...$('mProveedor').options].some(o => o.value === x.proveedor)) $('mProveedor').appendChild(new Option(x.proveedor, x.proveedor));
          $('mProveedor').value = x.proveedor;
        }
      }
      const c = $('campoMEscuela'); if (c) c.classList.remove('rec-falta');
    });
    autocompletarEscuela($('mMultiBuscar'), $('mMultiLista'), (e) => {
      if (!estado.modalMulti) return;
      estado.modalMulti.set(e.nombre, e);
      $('mMultiBuscar').value = '';
      pintarMultiModal();
    });
    $('btnMMulti').addEventListener('click', abrirMultiModal);
    $('mMultiSalir').addEventListener('click', salirMultiModal);
    $('mMultiVaciar').addEventListener('click', () => { if (estado.modalMulti) { estado.modalMulti.clear(); pintarMultiModal(); } });
    $('mMultiGrupo').addEventListener('change', (ev) => {
      const val = ev.target.value;
      ev.target.value = '';
      if (!val || !estado.modalMulti || !estado.modal) return;
      const antes = estado.modalMulti.size;
      escuelasDeGrupo(val, grupoDeServ($('mServicio').value || estado.modal.v[C.SERVICIO])).forEach(e => estado.modalMulti.set(e.nombre, e));
      toast(`➕ ${estado.modalMulti.size - antes} escuelas agregadas`, 'ok');
      pintarMultiModal();
    });
  }

  /** Un reclamo por escuela, con su proveedor y su cupo.
   *  asignados: (1.4.0) proveedor elegido a mano para las escuelas que no tienen ('' = saltearla). */
  function guardarMulti(d, asignados) {
    const escuelas = [...estado.multi.values()];
    const serv = d.servicio === 'COMEDOR' ? 'COMEDOR' : 'DM';
    const fecha = d.fecha || hoyISO();
    const items = escuelas.map(e => Object.assign({}, d, {
      escuela: e.nombre,
      proveedor: proveedorDeServicio(e, serv) || d.proveedor,
      cupoTotal: (d.servicio === 'DM/COMEDOR'   // (2.8.6) los dos servicios: se suman los cupos
        ? (cupoDeServicio(e, 'DM', fecha) || 0) + (cupoDeServicio(e, 'COMEDOR', fecha) || 0)
        : cupoDeServicio(e, serv, fecha)) || ''
    }));
    // (1.4.0) Escuelas sin proveedor para ese servicio: se elige uno para cada una (o varias a la vez)
    const sinProv = items.filter(x => !x.proveedor && !(asignados && asignados.has(x.escuela))).map(x => x.escuela);
    if (sinProv.length) {
      elegirProveedoresFaltantes(sinProv, serv === 'COMEDOR' ? 'comedor' : 'desayuno/merienda', (mapa) => guardarMulti(d, mapa));
      return false;
    }
    if (asignados) {
      items.forEach(x => { if (!x.proveedor && asignados.get(x.escuela)) x.proveedor = asignados.get(x.escuela); });
      items.splice(0, items.length, ...items.filter(x => x.proveedor));
      if (!items.length) { toast('No quedó ninguna escuela para cargar (se saltearon todas).', 'error'); return false; }
    }
    // No cargar dos veces lo mismo: escuelas que ya tienen este reclamo (cargado o esperando en la cola) se saltean
    const yaCargados = new Set(estado.reclamos.map(claveDuplicadoDe).filter(Boolean));
    COLA.leer().filter(x => x.tipo === 'agregar' && x.datos).forEach(x => {
      const k = claveDuplicado(x.datos.escuela, x.datos.fecha, x.datos.categoria, x.datos.subcategoria, x.datos.detalle);
      if (k) yaCargados.add(k);
    });
    const vistos = new Set();
    const repetidas = [];
    const nuevos = items.filter(x => {
      const k = claveDuplicado(x.escuela, fecha, x.categoria, x.subcategoria, x.detalle);
      if (k && (yaCargados.has(k) || vistos.has(k))) { repetidas.push(x.escuela); return false; }
      if (k) vistos.add(k);
      return true;
    });
    const notaRep = repetidas.length ? `\n\n⚠️ ${repetidas.length === 1 ? 'Esta escuela ya tiene' : `Estas ${repetidas.length} escuelas ya tienen`} este mismo reclamo y se saltean: ${repetidas.slice(0, 12).join(', ')}${repetidas.length > 12 ? '…' : ''}` : '';
    // (2.9.0) Las que ya tienen un reclamo con el mismo motivo ese día (con otro texto): se avisa, no se saltean
    const conMismoMotivo = [...new Set(duplicadosMulti(d).map(x => x.escuela))].filter(n => nuevos.some(x => x.escuela === n));
    const notaMot = conMismoMotivo.length ? `\n\nℹ️ ${conMismoMotivo.length === 1 ? 'Esta escuela ya tiene' : `Estas ${conMismoMotivo.length} escuelas ya tienen`} un reclamo con el mismo motivo ese día (con otro texto): ${conMismoMotivo.slice(0, 12).join(', ')}${conMismoMotivo.length > 12 ? '…' : ''}` : '';
    if (!nuevos.length) { alert('Todas las escuelas elegidas ya tienen este mismo reclamo cargado. No se cargó nada.' + notaRep.replace('\n\n', '\n\n')); return false; }
    if (!confirm(`Vas a crear ${nuevos.length} reclamo${nuevos.length === 1 ? '' : 's'}, uno por escuela, con el mismo detalle:\n\n“${d.detalle.slice(0, 120)}”${notaRep}${notaMot}\n\n¿Seguir?`)) return false;
    COLA.encolar(nuevos.map(x => ({ tipo: 'agregar', datos: x })));
    avisoBorrador(false);
    toast(`⏳ Guardando ${nuevos.length} reclamos… podés seguir cargando (se guardan de a uno)`, 'ok');
    salirMulti(false);
    limpiarFormulario(false);
    pintarCola();
    return true;
  }

  /** (1.4.0) Ventana para elegir el proveedor de cada escuela que no tiene (o saltearla).
   *  Se pueden marcar varias y ponerles el mismo de una vez. listo(mapa escuela -> proveedor | ''). */
  function elegirProveedoresFaltantes(nombres, servTxt, listo) {
    const provs = proveedoresConocidos();
    const SALTEAR = '__saltear';
    const opciones = `<option value="">Elegí…</option>${provs.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}` +
      `<option value="${SALTEAR}">— Saltear esta escuela —</option>`;
    const fondo = document.createElement('div');
    fondo.className = 'rec-pf-fondo';
    fondo.innerHTML = `<div class="rec-pf" role="dialog" aria-modal="true" aria-labelledby="pfTitulo">
      <h3 id="pfTitulo">${nombres.length === 1 ? 'Una escuela no tiene' : `${nombres.length} escuelas no tienen`} proveedor de ${esc(servTxt)}</h3>
      <p class="rec-pf-sub">Elegí el proveedor de cada una, o "Saltear" para no cargarle el reclamo.${nombres.length > 1 ? ' Para poner el mismo a varias: marcalas, elegí el proveedor y tocá <strong>Aplicar a las marcadas</strong>.' : ''}</p>
      ${nombres.length > 1 ? `<div class="rec-pf-barra">
        <label class="rec-pf-todas"><input type="checkbox" id="pfTodas"> Marcar todas</label>
        <select id="pfMasivo" aria-label="Proveedor para las marcadas">${opciones}</select>
        <button type="button" class="btn btn-secondary btn-sm" id="pfAplicar" disabled>Aplicar a las marcadas</button>
      </div>` : ''}
      <ul class="rec-pf-lista">${nombres.map((n, i) => `<li>
        ${nombres.length > 1 ? `<input type="checkbox" class="pf-marca" data-i="${i}" aria-label="Marcar ${esc(n)}">` : ''}
        <span class="rec-pf-esc">${esc(n)}</span>
        <select class="pf-prov" data-i="${i}" aria-label="Proveedor de ${esc(n)}">${opciones}</select>
      </li>`).join('')}</ul>
      <p class="rec-pf-falta" id="pfFalta" aria-live="polite"></p>
      <div class="rec-pf-pie">
        <button type="button" class="btn btn-secondary" data-pf="cancelar">Cancelar</button>
        <button type="button" class="btn btn-primary" data-pf="seguir">Continuar</button>
      </div></div>`;
    document.body.appendChild(fondo);
    const q = (sel) => fondo.querySelector(sel), qa = (sel) => [...fondo.querySelectorAll(sel)];
    const selects = qa('.pf-prov');
    function revisar() {
      const faltan = selects.filter(x => !x.value).length;
      selects.forEach(x => {
        x.classList.toggle('pf-falta', !x.value);
        x.closest('li').classList.toggle('pf-salteada', x.value === SALTEAR);
        const pv = x.value && x.value !== SALTEAR ? (window.SAE_PROV ? SAE_PROV.color(x.value) : '') : '';
        x.style.borderLeft = pv ? `5px solid ${pv}` : '';
      });
      q('#pfFalta').textContent = faltan ? `Falta${faltan === 1 ? '' : 'n'} ${faltan} escuela${faltan === 1 ? '' : 's'} por elegir.` : '';
      q('[data-pf="seguir"]').disabled = !!faltan;
      const marcadas = qa('.pf-marca:checked').length;
      if (q('#pfAplicar')) {
        q('#pfAplicar').disabled = !marcadas || !q('#pfMasivo').value;
        q('#pfAplicar').textContent = marcadas ? `Aplicar a las marcadas (${marcadas})` : 'Aplicar a las marcadas';
        q('#pfTodas').checked = marcadas === nombres.length;
        q('#pfTodas').indeterminate = marcadas > 0 && marcadas < nombres.length;
      }
    }
    function cerrar() { document.removeEventListener('keydown', tecla, true); fondo.remove(); }
    const tecla = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } };
    document.addEventListener('keydown', tecla, true);
    fondo.addEventListener('click', (ev) => { if (ev.target === fondo) cerrar(); });
    selects.forEach(x => x.addEventListener('change', revisar));
    qa('.pf-marca').forEach(x => x.addEventListener('change', revisar));
    if (q('#pfTodas')) {
      q('#pfTodas').addEventListener('change', () => { qa('.pf-marca').forEach(x => { x.checked = q('#pfTodas').checked; }); revisar(); });
      q('#pfMasivo').addEventListener('change', revisar);
      q('#pfAplicar').addEventListener('click', () => {
        const v = q('#pfMasivo').value;
        if (!v) return;
        qa('.pf-marca:checked').forEach(x => { selects[Number(x.dataset.i)].value = v; x.checked = false; });
        revisar();
      });
    }
    q('[data-pf="cancelar"]').addEventListener('click', cerrar);
    q('[data-pf="seguir"]').addEventListener('click', () => {
      if (selects.some(x => !x.value)) return;
      const mapa = new Map(nombres.map((n, i) => [n, selects[i].value === SALTEAR ? '' : selects[i].value]));
      cerrar();
      listo(mapa);
    });
    revisar();
    setTimeout(() => (q('#pfTodas') || selects[0]).focus(), 30);
  }

  function mostrarListaEscuelas() {
    const lista = $('listaEscuelas');
    const res = buscarEscuelas($('fEscuela').value);
    lista.innerHTML = '';
    if (!res.length) {
      lista.innerHTML = `<div class="rec-dropdown-vacio">No hay escuelas con ese nombre</div>`;
    }
    res.forEach((e, i) => {
      const it = document.createElement('div');
      it.className = 'rec-dropdown-item' + (i === 0 ? ' activo' : '');
      it.innerHTML = `<strong>${esc(e.nombre)}</strong><small>${esc([e.tipo, e.direccion, e.localidad].filter(Boolean).join(' · '))}</small>`;
      it.addEventListener('mousedown', (ev) => { ev.preventDefault(); elegirEscuela(e); });
      lista.appendChild(it);
    });
    lista.style.display = 'block';
  }

  function serviciosDeEscuela(e) {
    const s = new Set();
    (e.servicios || []).forEach(x => {
      const n = mayus(x.servicio);
      if (/^(DM|LC DM)/.test(n)) s.add('DESAYUNO/MERIENDA');
      else if (/^(COMEDOR|CM )/.test(n)) s.add('COMEDOR');
      else if (n === 'PATIOS') s.add('PATIOS');
    });
    return s;
  }

  function proveedorDeServicio(e, servicioHoja) {
    const busca = servicioHoja === 'COMEDOR' ? /^(COMEDOR|CM )/ : /^(DM|LC DM)/;
    const s = (e.servicios || []).find(x => busca.test(mayus(x.servicio)) && x.proveedor);
    return limpiarProveedor((s && s.proveedor) || e.proveedor);
  }

  function cupoDeServicio(e, servicioHoja, fechaISO) {
    const busca = servicioHoja === 'COMEDOR' ? /^(COMEDOR|CM )/ : /^(DM|LC DM)/;
    const s = (e.servicios || []).find(x => busca.test(mayus(x.servicio)));
    if (!s || !s.cupos) return null;
    if (s.cupos[fechaISO] !== undefined) return Math.round(s.cupos[fechaISO]);
    const fechas = Object.keys(s.cupos).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= fechaISO).sort();
    return fechas.length ? Math.round(s.cupos[fechas[fechas.length - 1]]) : null;
  }

  function elegirEscuela(e) {
    estado.escuela = e;
    $('fEscuela').value = e.nombre;
    $('listaEscuelas').style.display = 'none';
    $('fEscuela').classList.remove('invalido');
    marcarError('escuela', '');

    const servs = serviciosDeEscuela(e);
    const info = [e.tipo, e.zona ? `Zona ${e.zona}` : '', e.direccion, e.localidad].filter(Boolean);
    const servTxt = servs.size ? [...servs].map(capitalizar).join(' + ') : 'sin servicios registrados';
    $('infoEscuela').innerHTML = `📍 ${esc(info.join(' · '))}<br>🥪 ${esc(servTxt)}`;
    $('infoEscuela').style.display = 'block';

    // Servicio por defecto: el que tenga la escuela (DM primero)
    if (servs.has('DESAYUNO/MERIENDA')) $('fServicio').value = 'DESAYUNO/MERIENDA';
    else if (servs.has('COMEDOR')) $('fServicio').value = 'COMEDOR';
    alCambiarServicio();
    actualizarResumen();
    revisarDuplicado();
    pintarAbiertosEscuela();
  }

  /** Al elegir la escuela: sus reclamos sin resolver (para actualizar uno en vez de cargar otro). */
  function pintarAbiertosEscuela() {
    const caja = $('abiertosEscuela');
    if (!caja) return;
    const e = estado.escuela;
    if (!e || !estado.cargado || estado.multi) { caja.style.display = 'none'; caja.innerHTML = ''; return; }
    const base = mayus(e.nombre);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const lista = estado.reclamos.filter(r => r.est.escuelaBase === base && (r.est.estado === 'Pendiente' || r.est.estado === 'En gestión'))
      .sort((a, b) => ((a.fecha ? a.fecha.getTime() : 0) - (b.fecha ? b.fecha.getTime() : 0)) || (a.fila - b.fila));
    if (!lista.length || estado.abiertosCerrado === base) { caja.style.display = 'none'; caja.innerHTML = ''; return; }
    const MAX = 3;
    const que = (r) => [r.est.categoria ? etqCategoria(r.est.categoria) : '', r.est.motivo ? etqMotivo(r.est.motivo, r.est.categoria) : '',
      r.est.problema ? (ETQ_PROBLEMA[r.est.problema] || capitalizar(r.est.problema)) : ''].filter(Boolean).join(' › ') || 'Sin clasificar';
    caja.innerHTML = `<button type="button" class="rec-cerrar-aviso" title="Cerrar" aria-label="Cerrar">✕</button><div class="rec-abiertos-t">📌 ${lista.length === 1 ? 'Tiene 1 reclamo sin resolver' : `Tiene ${lista.length} reclamos sin resolver`}
        <span>Si es el mismo tema, actualizá ese en vez de cargar otro.</span></div>
      <ul>${lista.slice(0, MAX).map((r, i) => {
        const d = r.fecha ? Math.round((hoy - r.fecha) / DIA_MS) : null;
        return `<li><button type="button" class="rec-abiertos-item" data-i="${i}" title="Abrir el reclamo">
          <span class="rec-abiertos-dias">${d == null ? '—' : d === 0 ? 'hoy' : `hace ${nf(d)} día${d === 1 ? '' : 's'}`}</span>
          <span class="rec-abiertos-que">${esc(que(r))}</span>
          <span class="rec-abiertos-det">“${esc(String(r.v[C.DETALLE] || 'sin detalle').slice(0, 70))}”</span>
          <span class="rec-pill ${claseEstado(r.est.estado)}">${esc(r.est.estado)}</span>
        </button></li>`;
      }).join('')}</ul>` +
      (lista.length > MAX ? `<button type="button" class="rec-link" id="btnVerAbiertos">Ver los ${nf(lista.length)} en Buscar</button>` : '');
    caja.querySelector('.rec-cerrar-aviso').addEventListener('click', () => { estado.abiertosCerrado = base; pintarAbiertosEscuela(); });
    caja.querySelectorAll('.rec-abiertos-item').forEach(b => b.addEventListener('click', () => abrirModal(lista[Number(b.dataset.i)])));
    const ver = $('btnVerAbiertos');
    if (ver) ver.addEventListener('click', () => {
      limpiarFiltros();
      $('bTexto').value = e.nombre;
      document.querySelector('[data-tab="tabBuscar"]').click();
      aplicarFiltros();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    caja.style.display = '';
  }

  function alCambiarServicio() {
    const e = estado.escuela;
    if (!e) return;
    const serv = $('fServicio').value;
    const ambos = serv === 'DM/COMEDOR';   // (2.8.6) reclamo que toca los dos servicios
    const prov = proveedorDeServicio(e, serv === 'COMEDOR' ? 'COMEDOR' : 'DM');
    if (prov) {
      if (![...$('fProveedor').options].some(o => o.value === prov)) $('fProveedor').appendChild(new Option(prov, prov));
      $('fProveedor').value = prov;
      $('hintProveedor').textContent = `Según el buscador, ${capitalizar(serv)} de ${e.nombre} lo da ${prov}.`;
    } else {
      $('hintProveedor').textContent = '';
    }
    const fechaC = $('fFecha').value || hoyISO();
    const cupo = ambos ? (cupoDeServicio(e, 'DM', fechaC) || 0) + (cupoDeServicio(e, 'COMEDOR', fechaC) || 0)
      : cupoDeServicio(e, serv === 'COMEDOR' ? 'COMEDOR' : 'DM', fechaC);
    if (cupo) {
      $('fCupoTotal').value = cupo;
      $('hintCupoTotal').textContent = ambos ? 'Cupo de DM + Comedor para esa fecha (cambialo si hace falta).' : `Cupo de ${capitalizar(serv)} para esa fecha.`;
    } else {
      $('fCupoTotal').value = '';
      $('hintCupoTotal').textContent = '';
    }
    mostrarControles();
  }

  /* ======================================================================
   * FORMULARIO: SUGERENCIA
   * ====================================================================== */
  function actualizarSugerencia() {
    const s = ASISTENTE.sugerir($('fDetalle').value);
    estado.sugerencia = s;
    const caja = $('sugerencia');
    if (!s.categoria) { caja.style.display = 'none'; return; }

    const partes = [etqCategoria(s.categoria)];
    if (s.motivo) partes.push(etqMotivo(s.motivo, s.categoria));
    if (s.problema) partes.push(ETQ_PROBLEMA[s.problema] || s.problema);
    let extra = [];
    if (s.producto) extra.push('Producto: ' + capitalizar(s.producto));
    if (s.patologia) extra.push('Patología: ' + capitalizar(s.patologia));

    const yaAplicada = s.categoria === estado.form.categoria && s.motivo === estado.form.motivo &&
      (s.problema || '') === (estado.form.problema || '') &&
      normOp(s.producto || '') === normOp($('fProducto').value) && (s.patologia || '') === $('fPatologia').value;

    $('sugerenciaResumen').innerHTML = `<strong>${esc(partes.join(' › '))}</strong>${extra.length ? ' · ' + esc(extra.join(' · ')) : ''}`;
    $('sugerenciaRazon').textContent = s.razones.length ? 'Porque ' + s.razones.join(', ') + '.' : '';
    $('btnAplicarSugerencia').textContent = yaAplicada ? '✓ Aplicada' : 'Aplicar';
    $('btnAplicarSugerencia').disabled = yaAplicada;
    caja.classList.toggle('aplicada', yaAplicada);
    caja.style.display = 'flex';
  }

  function aplicarSugerencia() {
    const s = estado.sugerencia;
    if (!s || !s.categoria) return;
    fijarCategoria(s.categoria);
    estado.form.motivo = s.motivo || '';
    estado.form.problema = s.problema || '';
    pintarCategorias();
    pintarMotivos();
    if (s.categoria === 'ALIMENTOS') {
      if (s.producto) { $('fProducto').value = capitalizar(s.producto); revisarProducto(); }
      if (s.patologia) $('fPatologia').value = s.patologia;
    }
    actualizarSugerencia();
    actualizarResumen();
    revisarDuplicado();
  }

  /* ======================================================================
   * FORMULARIO: RESUMEN, DUPLICADOS Y GUARDADO
   * ====================================================================== */
  function datosFormulario() {
    const cat = estado.form.categoria;
    return {
      fecha: $('fFecha').value,
      escuela: estado.multi ? (estado.multi.size ? `Varias escuelas (${estado.multi.size})` : '') : (estado.escuela ? estado.escuela.nombre : ''),
      proveedor: $('fProveedor').value,
      servicio: $('fServicio').value,
      tipo: ((CLASIFICACION.categorias.find(c => c.valor === cat) || {}).tipo) || 'diaria',
      categoria: cat,
      subcategoria: estado.form.motivo,
      detalle: $('fDetalle').value.trim(),
      producto: cat === 'ALIMENTOS' ? (productoElegido() || mayus($('fProducto').value)) : '',
      cupoDefectuoso: $('fCupoDefectuoso').value,
      cupoTotal: $('fCupoTotal').value,
      estado: estado.form.estado,
      responsable: $('fResponsable').value,
      acciones: $('fAcciones').value.trim(),
      problema: estado.form.problema,
      patologia: cat === 'ALIMENTOS' ? $('fPatologia').value : '',
      horaLlegada: horaDelFormulario()   // (2.9.0)
    };
  }

  function actualizarResumen() {
    programarBorrador();
    pintarCampoHora();   // (2.9.0)
    // (1.3.0) El Mapa abre en la escuela del reclamo que se está cargando (si es una sola)
    if (window.SAE_NAV && SAE_NAV.escuelaParaMapa) SAE_NAV.escuelaParaMapa(!estado.multi && estado.escuela ? estado.escuela.nombre : '');
    const d = datosFormulario();
    if (!d.escuela && !d.categoria) {
      $('resumenTexto').textContent = 'Completá los pasos para ver el resumen.';
      return;
    }
    const f = parsearFecha(d.fecha.split('-').reverse().join('/'));
    const clas = [d.categoria && etqCategoria(d.categoria), d.subcategoria && etqMotivo(d.subcategoria, d.categoria),
      d.problema && (ETQ_PROBLEMA[d.problema] || d.problema)].filter(Boolean).join(' › ');
    $('resumenTexto').innerHTML =
      `<strong>${esc(d.escuela || 'Sin escuela')}</strong> · ${esc(fechaCorta(f))} · ${esc(capitalizar(d.servicio))}` +
      `${d.proveedor ? ' · ' + puntoProv(d.proveedor) + esc(d.proveedor) : ''}<br>` +
      `<span class="rec-resumen-clas">${esc(clas || 'Sin clasificar')}${d.producto ? ' · ' + esc(capitalizar(d.producto)) : ''}` +
      `${d.patologia ? ' · ' + esc(capitalizar(d.patologia)) : ''}${d.horaLlegada ? ' · ⏰ llegó ' + esc(horaVer(d.horaLlegada)) + (/especial/.test(d.horaLlegada) ? ' (especial)' : '') : ''}</span> · <span class="rec-pill ${claseEstado(d.estado)}">${esc(d.estado)}</span>`;
  }

  /* ---------- Posibles duplicados ----------
   * Mismo establecimiento (o alias), fecha a 3 días o menos y, si ya se eligió,
   * el mismo motivo (o la misma categoría). También mira los que están en la
   * cola guardándose. No bloquea: avisa y, al guardar, pide confirmación.
   */
  // Días de diferencia para considerarlo el mismo reclamo: alimentos ±1 día; mantenimiento, equipamiento y el resto ±5
  const diasDup = (categoria) => categoria === 'ALIMENTOS' ? 1 : 5;
  function posiblesDuplicados(d) {
    // Recién se compara cuando eligieron la categoría (antes avisaba de cualquier reclamo de la escuela)
    if (estado.multi) return duplicadosMulti(d);
    if (!estado.cargado || !d.escuela || !d.fecha || !d.categoria) return [];
    const f = parsearFecha(d.fecha.split('-').reverse().join('/'));
    if (!f) return [];
    const base = escuelaBase(d.escuela);
    const parecido = (escuela, fecha, cat, mot) => escuelaBase(escuela) === base && fecha &&
      Math.abs(Math.round((fecha - f) / DIA_MS)) <= diasDup(d.categoria) &&
      mayus(cat) === d.categoria && (!d.subcategoria || mayus(mot) === d.subcategoria);
    const lista = estado.reclamos.filter(r => parecido(r.est.escuela, r.fecha, r.est.categoria, r.est.motivo))
      .map(r => ({ r, fecha: r.fecha, detalle: r.v[C.DETALLE], motivo: r.est.motivo, estado: r.est.estado, fila: r.fila }));
    COLA.leer().filter(x => x.tipo === 'agregar' && x.datos).forEach(x => {
      const fx = parsearFecha(String(x.datos.fecha).split('-').reverse().join('/'));
      if (parecido(x.datos.escuela, fx, x.datos.categoria, x.datos.subcategoria)) {
        lista.push({ r: null, fecha: fx, detalle: x.datos.detalle, motivo: x.datos.subcategoria, estado: 'Guardándose', fila: null });
      }
    });
    // Primero los de la misma fecha, después los más cercanos
    return lista.sort((a, b) => Math.abs(a.fecha - f) - Math.abs(b.fecha - f) || (b.fila || 1e9) - (a.fila || 1e9));
  }

  /* (2.9.0) Varias escuelas: cuáles ya tienen un reclamo con el mismo motivo ese mismo día
   * (aunque el texto sea otro). Mira también lo que está en la cola guardándose. */
  function duplicadosMulti(d) {
    if (!estado.cargado || !estado.multi.size || !d.fecha || !d.categoria || !d.subcategoria) return [];
    const dia = d.fecha;   // AAAA-MM-DD
    const bases = new Map();
    estado.multi.forEach((e, nombre) => bases.set(escuelaBase(nombre), nombre));
    const mismo = (cat, mot) => mayus(cat) === d.categoria && mayus(mot) === d.subcategoria;
    const lista = [];
    estado.reclamos.forEach(r => {
      if (!r.fecha || isoDe(r.fecha) !== dia || !mismo(r.est.categoria, r.est.motivo)) return;
      const nombre = bases.get(escuelaBase(r.est.escuela));
      if (nombre) lista.push({ r, escuela: nombre, fecha: r.fecha, detalle: r.v[C.DETALLE], motivo: r.est.motivo, estado: r.est.estado, fila: r.fila });
    });
    COLA.leer().filter(x => x.tipo === 'agregar' && x.datos && String(x.datos.fecha) === dia && mismo(x.datos.categoria, x.datos.subcategoria)).forEach(x => {
      const nombre = bases.get(escuelaBase(x.datos.escuela));
      if (nombre) lista.push({ r: null, escuela: nombre, fecha: parsearFecha(dia.split('-').reverse().join('/')), detalle: x.datos.detalle, motivo: x.datos.subcategoria, estado: 'Guardándose', fila: null });
    });
    return lista.sort((a, b) => a.escuela.localeCompare(b.escuela, 'es', { numeric: true }));
  }
  function pintarDuplicadosMulti(aviso, lista, d, clave) {
    const MAX = 5;
    const escuelas = [...new Set(lista.map(x => x.escuela))];
    aviso.innerHTML = `⚠️ <strong>${escuelas.length === 1 ? '1 de las escuelas elegidas ya tiene' : escuelas.length + ' de las escuelas elegidas ya tienen'}</strong> ` +
      `un reclamo con el mismo motivo el ${esc(fechaCorta(lista[0].fecha))}:` +
      `<ul class="rec-dup-lista">${lista.slice(0, MAX).map((x, i) => `<li>
        <span class="rec-dup-fecha">${esc(x.escuela)}</span>
        <span class="rec-dup-det">“${esc(String(x.detalle || 'sin detalle').slice(0, 100))}”</span>
        ${x.r ? `<button type="button" class="rec-link" data-dup="${i}">Ver ese reclamo</button>` : `<small>${esc(x.estado)}…</small>`}
      </li>`).join('')}</ul>` +
      (lista.length > MAX ? `<small>Y ${lista.length - MAX} más.</small> ` : '') +
      '<small>Si es otro problema, guardalo igual. Si es el mismo, podés sacarlas de la lista.</small> ' +
      `<button type="button" class="btn btn-secondary btn-sm rec-dup-quitar">Sacar ${escuelas.length === 1 ? 'esa escuela' : 'esas ' + escuelas.length + ' escuelas'}</button>` +
      '<button type="button" class="rec-cerrar-aviso" title="Cerrar este aviso" aria-label="Cerrar este aviso">✕</button>';
    aviso.querySelector('.rec-cerrar-aviso').addEventListener('click', () => { estado.dupCerrado = clave; revisarDuplicado(); });
    aviso.querySelector('.rec-dup-quitar').addEventListener('click', () => {
      escuelas.forEach(n => estado.multi.delete(n));
      toast(`➖ ${escuelas.length} escuela${escuelas.length === 1 ? '' : 's'} sacada${escuelas.length === 1 ? '' : 's'} de la lista`, 'ok');
      pintarMulti();
    });
    aviso.querySelectorAll('[data-dup]').forEach(b => b.addEventListener('click', () => abrirModal(lista[Number(b.dataset.dup)].r)));
    aviso.style.display = 'block';
  }

  /** Avisa si ya hay un reclamo parecido (misma escuela, fechas cercanas y mismo motivo). */
  function revisarDuplicado() {
    const aviso = $('avisoDuplicado');
    const d = datosFormulario();
    const lista = posiblesDuplicados(d);
    estado.duplicados = lista;
    // Si lo cerraron con la ✕, no vuelve a aparecer mientras no cambie la escuela, la fecha o la categoría
    const clave = [d.escuela, d.fecha, d.categoria, d.subcategoria].join('|');
    if (!lista.length || estado.dupCerrado === clave) { aviso.style.display = 'none'; aviso.innerHTML = ''; return; }
    if (estado.multi) { pintarDuplicadosMulti(aviso, lista, d, clave); return; }
    const MAX = 3;
    const que = d.subcategoria ? 'con el mismo motivo' : (d.categoria ? 'de la misma categoría' : '');
    aviso.innerHTML = `⚠️ <strong>¿Es el mismo reclamo?</strong> ${lista.length === 1 ? 'Ya hay uno' : 'Ya hay ' + lista.length} de <strong>${esc(d.escuela)}</strong> ` +
      `${que} ${diasDup(d.categoria) === 1 ? 'entre el día anterior y el siguiente' : `entre ${diasDup(d.categoria)} días antes y ${diasDup(d.categoria)} días después`}:` +
      `<ul class="rec-dup-lista">${lista.slice(0, MAX).map((x, i) => `<li>
        <span class="rec-dup-fecha">${esc(fechaCorta(x.fecha))}</span>
        <span class="rec-dup-det">“${esc(String(x.detalle || 'sin detalle').slice(0, 120))}”${x.motivo ? ` <small>· ${esc(ETQ_MOTIVO[x.motivo] || capitalizar(x.motivo))}</small>` : ''}</span>
        ${x.r ? `<button type="button" class="rec-link" data-dup="${i}">Ver${x.fila ? ' (fila ' + x.fila + ')' : ''}</button>` : `<small>${esc(x.estado)}…</small>`}
      </li>`).join('')}</ul>` +
      (lista.length > MAX ? `<small>Y ${lista.length - MAX} más.</small> ` : '') +
      '<small>Si es otro problema, guardalo igual. Si es el mismo, mejor actualizá el que ya está.</small>' +
      '<button type="button" class="rec-cerrar-aviso" title="Cerrar este aviso" aria-label="Cerrar este aviso">✕</button>';
    aviso.querySelector('.rec-cerrar-aviso').addEventListener('click', () => { estado.dupCerrado = clave; revisarDuplicado(); });
    aviso.querySelectorAll('[data-dup]').forEach(b => b.addEventListener('click', () => abrirModal(lista[Number(b.dataset.dup)].r)));
    aviso.style.display = 'block';
  }

  function marcarError(campo, msg) {
    const el = document.querySelector(`[data-error="${campo}"]`);
    if (el) el.textContent = msg;
  }

  /* ---------- Controles de fecha y cupos ----------
   * Errores (no deja guardar): fecha posterior a hoy o anterior a 2015, cantidades negativas.
   * Avisos (pide confirmación): fecha de hace más de 30 días, cupo afectado mayor al total.
   */
  const DIAS_FECHA_VIEJA = 30;
  const DIAS_AVISO_FUTURO = 60;   // un aviso con fecha más adelante que esto pide confirmación
  function controlesFormulario(d) {
    const errores = { fecha: '', cupo: '' }, avisos = [];
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const f = d.fecha ? parsearFecha(d.fecha) : null;
    if (!d.fecha || !f) errores.fecha = 'Elegí la fecha del reclamo.';
    else if (f > hoy && d.categoria === 'AVISO') {
      const adelante = Math.round((f - hoy) / DIA_MS);
      if (adelante > DIAS_AVISO_FUTURO) avisos.push({ campo: 'fecha', txt: `La fecha es dentro de ${adelante} días (${fechaCorta(f)}). ¿Es correcta?` });
    }
    else if (f > hoy) errores.fecha = 'La fecha es posterior a hoy. Revisala (solo los avisos pueden tener fecha futura).';
    else if (f < FECHA_MIN) errores.fecha = `La fecha es anterior a ${FECHA_MIN.getFullYear()}. Revisá el año.`;
    else {
      const dias = Math.round((hoy - f) / DIA_MS);
      if (dias > DIAS_FECHA_VIEJA) avisos.push({ campo: 'fecha', txt: `La fecha es de hace ${dias} días (${fechaCorta(f)}).` });
    }
    const def = d.cupoDefectuoso === '' ? null : Number(d.cupoDefectuoso);
    const tot = d.cupoTotal === '' ? null : Number(d.cupoTotal);
    if ((def != null && (isNaN(def) || def < 0)) || (tot != null && (isNaN(tot) || tot < 0))) errores.cupo = 'Las cantidades no pueden ser negativas.';
    else if (def != null && tot != null && tot > 0 && def > tot) {
      avisos.push({ campo: 'cupo', txt: `El cupo afectado (${nf(def)}) es mayor que el cupo total (${nf(tot)}).` });
    }
    // (2.9.0) La hora de llegada está dentro (o antes) del horario esperado
    if (d.horaLlegada && !/especial/.test(d.horaLlegada)) {
      const ev = evaluarLlegada(d.horaLlegada, d.escuela, d.proveedor, f);
      if (ev && ev.cuando !== 'tarde') avisos.push({ campo: 'hora', txt: `Llegó ${horaVer(ev.hora)}: está ${ev.cuando === 'antes' ? 'antes del' : 'dentro del'} horario esperado (${textoHorario(ev.horario)}). ¿Es correcto?` });
    }
    return { errores, avisos };
  }
  /** Muestra los errores y avisos debajo de cada campo mientras se completa el formulario. */
  function mostrarControles() {
    const { errores, avisos } = controlesFormulario(datosFormulario());
    ['fecha', 'cupo'].forEach(c => {
      const el = document.querySelector(`[data-error="${c}"]`);
      if (!el) return;
      const av = avisos.filter(a => a.campo === c).map(a => '⚠️ ' + a.txt + (c === 'cupo' ? ' Si son unidades (no raciones) puede estar bien.' : ''));
      el.textContent = errores[c] || av.join(' ');
      el.classList.toggle('aviso', !errores[c] && av.length > 0);
    });
    $('fFecha').classList.toggle('invalido', !!errores.fecha);
    $('fCupoDefectuoso').classList.toggle('invalido', !!errores.cupo);
  }

  function validar(d) {
    let ok = true;
    const ctrl = controlesFormulario(d);
    mostrarControles();
    if (ctrl.errores.fecha || ctrl.errores.cupo) ok = false;
    marcarError('escuela', ''); marcarError('detalle', ''); marcarError('motivo', '');
    $('fEscuela').classList.remove('invalido'); $('fDetalle').classList.remove('invalido');
    if (!d.escuela) {
      marcarError('escuela', 'Elegí una escuela de la lista.');
      $('fEscuela').classList.add('invalido'); ok = false;
    }
    if (!d.detalle) {
      marcarError('detalle', 'Escribí qué pasó.');
      $('fDetalle').classList.add('invalido'); ok = false;
    }
    if (!d.categoria || !d.subcategoria) {
      marcarError('motivo', 'Elegí la categoría y el motivo.');
      $('campoMotivo').style.display = '';
      ok = false;
    }
    if (!d.proveedor) { toast('⚠️ Elegí el proveedor', 'error'); ok = false; }
    // (2.8.0) Un producto que no está en la lista primero se crea
    if (d.categoria === 'ALIMENTOS' && productoElegido() === null) {
      revisarProducto();
      $('fProducto').classList.add('invalido');
      toast('⚠️ El producto no está en la lista: creálo con "＋ Crear" o elegí uno parecido.', 'error');
      ok = false;
    }
    return ok;
  }

  /* ---------- Guardado en segundo plano ----------
   * Al tocar Guardar, el reclamo pasa a la cola (js/cola-envios.js) y el formulario queda
   * libre al instante. (1.2.0) La cola se guarda en el navegador y se sigue enviando desde
   * cualquier página (Buscador, Totales, Mapa) y aunque se cierre: lo pendiente sigue al volver.
   * Si algo falla, queda en un recuadro con "Reintentar" para no perderlo.
   */
  const COLA = window.SAE_COLA;
  // (1.3.0) Color de cada proveedor (el mismo del mapa)
  const colorProv = (p) => (window.SAE_PROV ? SAE_PROV.color(p) : '');
  const puntoProv = (p) => (window.SAE_PROV ? SAE_PROV.punto(p) : '');

  /** Columnas que cambia cada tipo de envío (para "Descartar" y para mostrar lo pendiente). */
  const colsDe = (tipo) => tipo === 'reclasificar' ? [C.TIPO, C.CATEGORIA, C.SUBCATEGORIA] : [C.ESTADO, C.RESPONSABLE, C.FECHA_RES, C.ACCIONES, C.PROVEEDOR, C.SERVICIO, C.ESCUELA, C.CUPO_TOTAL, C.HORA];
  function tomarAntes(v, tipo) { const o = {}; colsDe(tipo).forEach(i => { o[i] = v[i] === undefined ? '' : v[i]; }); return o; }
  // (2.8.8) Proveedor, servicio y clasificación ayudan al script a encontrar el reclamo si se movió de fila
  // y hay otro igual (misma escuela, fecha y detalle). El control sigue siendo escuela + detalle + fecha.
  const huellaDe = (v) => ({ escuela: v[C.ESCUELA], detalle: v[C.DETALLE], fecha: v[C.FECHA],
    proveedor: v[C.PROVEEDOR] || '', servicio: v[C.SERVICIO] || '', categoria: v[C.CATEGORIA] || '', subcategoria: v[C.SUBCATEGORIA] || '' });
  /** Los valores de una fila con un cambio pendiente aplicado. */
  function aplicarCambiosV(v, item) {
    const c = (item.pedido && item.pedido.cambios) || {};
    const n = v.slice();
    if (item.tipo === 'reclasificar') {
      if (c.tipo !== undefined) n[C.TIPO] = c.tipo;
      if (c.categoria !== undefined) n[C.CATEGORIA] = c.categoria;
      if (c.subcategoria !== undefined) n[C.SUBCATEGORIA] = c.subcategoria;
      return n;
    }
    if (c.estado !== undefined) {
      n[C.ESTADO] = c.estado;
      if (c.fechaResolucion === undefined) {
        if (c.estado === 'Resuelto') { if (!n[C.FECHA_RES]) n[C.FECHA_RES] = fechaCorta(new Date()); }
        else n[C.FECHA_RES] = '';
      }
    }
    if (c.fechaResolucion !== undefined) n[C.FECHA_RES] = c.fechaResolucion;
    if (c.responsable !== undefined) n[C.RESPONSABLE] = c.responsable;
    if (c.acciones !== undefined) n[C.ACCIONES] = c.acciones;
    if (c.proveedor !== undefined) n[C.PROVEEDOR] = c.proveedor;   // (2.4.0)
    if (c.escuela !== undefined) n[C.ESCUELA] = c.escuela;         // (2.8.7)
    if (c.cupoTotal !== undefined) n[C.CUPO_TOTAL] = String(c.cupoTotal);
    if (c.servicio !== undefined) n[C.SERVICIO] = c.servicio;
    if (c.horaLlegada !== undefined) n[C.HORA] = c.horaLlegada;   // (2.9.0)
    return n;
  }
  const t_ = (x) => String(x == null ? '' : x).trim();
  const mismaHuella = (r, h) => r && h && t_(r.v[C.ESCUELA]) === t_(h.escuela) && t_(r.v[C.DETALLE]) === t_(h.detalle);
  /** Al leer la hoja: los cambios que todavía están en la cola se muestran ya aplicados. */
  function superponerPendientes() {
    // (2.8.6) Los reclamos con un borrado esperando no se muestran (el borrado ya se ve)
    const borrando = new Set(COLA.leer().filter(x => x.tipo === 'borrar' && x.estado !== 'error' && x.pedido).map(x => x.pedido.fila));
    const antesB = estado.reclamos.length;
    if (borrando.size) estado.reclamos = estado.reclamos.filter(r => !borrando.has(r.fila));
    const items = COLA.leer().filter(x => (x.tipo === 'actualizar' || x.tipo === 'reclasificar') && x.pedido);
    let n = estado.reclamos.length !== antesB ? 1 : 0;
    items.forEach(x => {
      const i = estado.reclamos.findIndex(r => r.fila === x.pedido.fila);
      if (i < 0 || !mismaHuella(estado.reclamos[i], x.pedido.huella)) return;
      estado.reclamos[i] = prepararReclamo({ fila: x.pedido.fila, v: aplicarCambiosV(estado.reclamos[i].v, x) });
      n++;
    });
    if (n) estado.versionDatos = (estado.versionDatos || 0) + 1;
  }
  /** "Descartar": el reclamo vuelve a como estaba (si no quedó otro cambio del mismo tipo esperando). */
  function revertirItem(item) {
    if (item.tipo === 'borrar') { volverAMostrar(item); return; }   // (2.8.6) el borrado se descartó: el reclamo vuelve
    if ((item.tipo !== 'actualizar' && item.tipo !== 'reclasificar') || !item.antes || !item.pedido) return;
    if (COLA.leer().some(x => x.tipo === item.tipo && x.pedido && x.pedido.fila === item.pedido.fila)) return;
    const i = estado.reclamos.findIndex(r => r.fila === item.pedido.fila);
    if (i < 0) return;
    const v = estado.reclamos[i].v.slice();
    Object.keys(item.antes).forEach(k => { v[k] = item.antes[k]; });
    estado.reclamos[i] = prepararReclamo({ fila: item.pedido.fila, v });
    estado.versionDatos = (estado.versionDatos || 0) + 1;
  }
  function procesarCola() { COLA.procesar(); }
  const encolarActualizacion = (item) => COLA.encolarActualizacion(item);

  /** Lo que respondió la hoja (en esta pestaña o en otra): se actualiza la lista. */
  window.addEventListener('sae-cola-resultados', (ev) => {
    const d = ev.detail || {};
    const res = d.resultados || [];
    if (!estado.cargado) { pintarCola(); return; }
    const cola = COLA.leer();
    let fallos = 0, nuevos = 0, cambios = 0;
    res.forEach(({ item, r }) => {
      if (!r || r.reintentar) return;
      if (r.movida || r.eliminada) refrescarPronto();   // (2.8.8) cambiaron números de fila: se actualiza la lista sola
      if (item.tipo === 'borrar') {   // (2.8.6)
        if (!r.ok) { fallos++; if (volverAMostrar(item)) cambios++; return; }
        // (2.8.8) Dónde estaba de verdad al borrarse (para poder deshacerlo aunque se haya movido)
        if (r.fila) { estado.filaBorrada = estado.filaBorrada || new Map(); estado.filaBorrada.set(item.id, r.fila); }
        const i = estado.reclamos.findIndex(x => x.fila === item.pedido.fila && mismaHuella(x, item.pedido.huella));
        if (i >= 0) { estado.reclamos.splice(i, 1); cambios++; }
        // Se tocó "Deshacer" mientras se estaba borrando: ahora que terminó, se restaura
        if (estado.restaurarAlTerminar && estado.restaurarAlTerminar.delete(item.pedido.fila)) restaurarEnHoja([item]);
        return;
      }
      if (!r.ok) { fallos++; return; }
      if (item.tipo === 'agregar') {
        if (r.fila && Array.isArray(r.v) && !estado.reclamos.some(x => x.fila === r.fila)) {
          estado.reclamos.push(prepararReclamo({ fila: r.fila, v: r.v }));
          nuevos++;
        }
        if (item.datos && item.datos.categoria === 'AVISO') avisarAvisos();
        if (!d.remoto) {
          if (r.advertencia) toast(`✅ ${item.datos.escuela}: guardado en la fila ${r.fila}. ⚠️ ${r.advertencia}`, 'error');
          else toast(r.repetido ? `✅ ${item.datos.escuela}: ya estaba guardado (fila ${r.fila})` : `✅ ${item.datos.escuela}: guardado en la fila ${r.fila}`, 'ok');
        }
      } else if (Array.isArray(r.v) && item.pedido) {
        const fila = r.fila || item.pedido.fila;
        // Si después hubo otro cambio del mismo reclamo, se respeta el último
        if (cola.some(x => x.pedido && x.pedido.fila === fila)) return;
        const i = estado.reclamos.findIndex(x => x.fila === fila);
        if (i >= 0) { estado.reclamos[i] = prepararReclamo({ fila, v: r.v }); cambios++; }
      }
    });
    if (nuevos || cambios) estado.versionDatos = (estado.versionDatos || 0) + 1;
    if (nuevos) llenarFiltrosDesdeDatos();
    aplicarFiltros();
    actualizarBadge();
    if (nuevos) revisarDuplicado();
    if (fallos && !d.remoto && !d.silencioso) {
      const tipo = res[0] && res[0].item.tipo;
      if (tipo === 'agregar') toast(`⚠️ No se guardó el reclamo de ${res[0].item.datos.escuela}. Quedó arriba para reintentar.`, 'error');
      else if (tipo === 'reclasificar') toast(`⚠️ ${fallos === 1 ? 'Una reclasificación no se guardó' : fallos + ' reclasificaciones no se guardaron'}. Quedaron arriba para reintentar.`, 'error');
      else if (tipo === 'borrar') toast(`⚠️ ${fallos === 1 ? 'Un reclamo no se pudo borrar' : fallos + ' reclamos no se pudieron borrar'}: volvieron a la lista. El detalle quedó arriba.`, 'error');
      else toast(`⚠️ ${fallos === 1 ? 'Un cambio no se guardó' : fallos + ' cambios no se guardaron'}. Quedaron arriba para reintentar.`, 'error');
    }
    pintarCola();
  });
  let tPintarCola = null;
  window.addEventListener('sae-cola', () => { clearTimeout(tPintarCola); tPintarCola = setTimeout(pintarCola, 60); });

  function guardarReclamo(ev) {
    ev.preventDefault();
    const d = datosFormulario();
    if (multiActivo()) {
      if (!estado.multi.size) { marcarError('escuela', 'Agregá al menos una escuela.'); $('multiBuscar').focus(); return; }
      const sinProv = !d.proveedor;
      if (sinProv) d.proveedor = '—';                 // en varias escuelas, el proveedor sale de cada una
      const ok = validar(d);
      if (sinProv) d.proveedor = '';
      if (!ok) return;
      const avisos = controlesFormulario(d).avisos.filter(a => a.campo !== 'cupo');
      if (avisos.length && !confirm('Revisá antes de guardar:\n\n• ' + avisos.map(x => x.txt).join('\n• ') + '\n\n¿Guardar igual?')) return;
      guardarMulti(d);
      return;
    }
    if (!validar(d)) {
      const primero = document.querySelector('.rec-error:not(:empty):not(.aviso)');
      if (primero) (primero.closest('.rec-campo') || primero).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // Avisos de fecha vieja o cupo mayor al total: se pide confirmación
    const avisos = controlesFormulario(d).avisos;
    if (avisos.length && !confirm('Revisá antes de guardar:\n\n• ' + avisos.map(x => x.txt).join('\n• ') + '\n\n¿Guardar igual? (Aceptar = está bien · Cancelar = corregir)')) return;
    // Posible duplicado con el mismo motivo: se pide confirmación (no se bloquea)
    const dup = d.subcategoria ? posiblesDuplicados(d) : [];
    if (dup.length) {
      const x = dup[0];
      const ok = confirm(`Ya hay ${dup.length === 1 ? 'un reclamo' : dup.length + ' reclamos'} de ${d.escuela} con el mismo motivo ` +
        `(${fechaCorta(x.fecha)}: "${String(x.detalle || 'sin detalle').slice(0, 80)}").\n\n` +
        '¿Guardar este de todas formas? (Aceptar = es otro reclamo · Cancelar = revisar)');
      if (!ok) { revisarDuplicado(); $('avisoDuplicado').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    }
    if (d.horaLlegada && versionScriptActual() && versionScriptActual() < VERSION_HORA &&
      !confirm(`El script de Google todavía no guarda la hora de llegada (hay que actualizarlo a la versión ${VERSION_HORA}).\n\n¿Guardar el reclamo sin la hora?`)) return;
    COLA.encolar([{ tipo: 'agregar', datos: d }]);
    avisoBorrador(false);
    toast(`⏳ Guardando el reclamo de ${d.escuela}… podés seguir cargando (también podés ir a otras secciones)`, 'ok');
    limpiarFormulario(true);
    pintarCola();
  }

  function pintarCola() {
    const cola = COLA.leer();
    let caja = document.getElementById('colaEnvios');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'colaEnvios';
      caja.className = 'rec-cola';
      const tabs = document.querySelector('.rec-tabs');
      tabs.parentNode.insertBefore(caja, tabs.nextSibling);
    }
    const pendientes = cola.filter(x => x.estado !== 'error');
    const errores = cola.filter(x => x.estado === 'error');
    if (!cola.length) {
      caja.style.display = 'none'; caja.innerHTML = '';
      // Sin nada pendiente: el indicador de arriba vuelve a "Conectado"
      marcarConexion('ok', `Conectado · ${estado.reclamos.length.toLocaleString('es-AR')} reclamos`);
      return;
    }
    caja.style.display = 'block';
    let html = '';
    if (pendientes.length) {
      html += `<div class="rec-cola-fila enviando"><span class="rec-spinner" aria-hidden="true"></span>` +
        `Guardando ${pendientes.length === 1 ? '1 cambio' : pendientes.length + ' cambios'} en la hoja… ` +
        `<small>(${esc(pendientes.slice(0, 6).map(x => x.datos.escuela).join(', ') + (pendientes.length > 6 ? ` y ${pendientes.length - 6} más` : ''))})</small></div>`;
    }
    // Muchos errores juntos (un globo entero): un resumen con "Reintentar todos" / "Descartar todos"
    const MUCHOS = 3;
    if (errores.length > MUCHOS) {
      const motivos = [...new Set(errores.map(x => x.error).filter(Boolean))];
      html += `<div class="rec-cola-fila error rec-cola-resumen">
        <div><strong>⚠️ ${errores.length} cambios no se guardaron</strong>${motivos.length ? `<br><small>${esc(motivos.slice(0, 2).join(' · '))}</small>` : ''}</div>
        <div class="rec-cola-botones">
          <button type="button" class="btn btn-primary btn-sm" data-todos="reintentar">Reintentar todos</button>
          <button type="button" class="btn btn-secondary btn-sm" data-todos="descartar">Descartar todos</button>
          <button type="button" class="btn btn-secondary btn-sm" data-todos="ver">${estado.colaDetalle ? 'Ocultar detalle ▴' : 'Ver detalle ▾'}</button>
        </div></div>`;
    }
    (errores.length > MUCHOS && !estado.colaDetalle ? [] : errores).forEach(x => {
      const act = x.tipo === 'actualizar' || x.tipo === 'reclasificar' || x.tipo === 'borrar';
      html += `<div class="rec-cola-fila error" data-id="${x.id}">
        <div><strong>⚠️ ${x.tipo === 'borrar' ? 'No se pudo borrar' : 'No se guardó ' + (act ? 'el cambio de seguimiento' : '')}: ${esc(x.datos.escuela)}</strong> · “${esc(String(x.datos.detalle || '').slice(0, 80))}”<br><small>${esc(x.error)}</small></div>
        <div class="rec-cola-botones">
          <button type="button" class="btn btn-primary btn-sm" data-accion="reintentar">Reintentar</button>
          ${act ? '' : '<button type="button" class="btn btn-secondary btn-sm" data-accion="editar" title="Volver a cargarlo en el formulario">Editar</button>'}
          <button type="button" class="btn btn-secondary btn-sm" data-accion="descartar">Descartar</button>
        </div></div>`;
    });
    caja.innerHTML = html;
    caja.querySelectorAll('[data-todos]').forEach(b => b.addEventListener('click', () => {
      const lista = COLA.leer().filter(x => x.estado === 'error');
      if (b.dataset.todos === 'ver') estado.colaDetalle = !estado.colaDetalle;
      if (b.dataset.todos === 'reintentar') COLA.reintentar(lista.map(x => x.id));
      if (b.dataset.todos === 'descartar' && confirm(`¿Descartar los ${lista.length} cambios que no se guardaron? Esos reclamos vuelven a como estaban en la hoja (los reclamos nuevos sin guardar se pierden).`)) {
        COLA.quitar(lista.map(x => x.id)).forEach(revertirItem);
        aplicarFiltros(); actualizarBadge();
      }
      pintarCola();
    }));
    caja.querySelectorAll('[data-accion]').forEach(b => b.addEventListener('click', () => {
      const id = b.closest('[data-id]').dataset.id;
      const item = COLA.leer().find(x => String(x.id) === id);
      if (!item) return;
      if (b.dataset.accion === 'reintentar') {
        if (item.dudoso && !confirm('Este reclamo se cortó mientras se guardaba y puede que ya esté en la hoja. ¿Lo revisaste en Buscar? (Aceptar = reintentar igual)')) return;
        COLA.reintentar([item.id]);
      }
      if (b.dataset.accion === 'descartar' && confirm(item.tipo === 'borrar' ? '¿Descartar el borrado? El reclamo queda en la hoja como está.' : item.tipo === 'actualizar' || item.tipo === 'reclasificar' ? '¿Descartar este cambio? El reclamo vuelve a como estaba en la hoja.' : '¿Descartar este reclamo sin guardarlo?')) {
        COLA.quitar([item.id]).forEach(revertirItem);
        aplicarFiltros(); actualizarBadge();
      }
      if (b.dataset.accion === 'editar') { COLA.quitar([item.id]); cargarEnFormulario(item.datos); }
      pintarCola();
    }));
    // Pestaña: indicar si hay envíos en curso
    marcarConexion(pendientes.length ? 'cargando' : (errores.length ? 'error' : 'ok'),
      pendientes.length ? `Guardando ${pendientes.length}…` : (errores.length ? `${errores.length} sin guardar` : `Conectado · ${estado.reclamos.length.toLocaleString('es-AR')} reclamos`));
  }

  /** Vuelve a poner en el formulario un reclamo que no se pudo guardar. */
  function cargarEnFormulario(d) {
    document.querySelector('[data-tab="tabNuevo"]').click();
    const e = ESCUELAS.find(x => x.nombre === d.escuela);
    if (e) elegirEscuela(e);
    $('fFecha').value = d.fecha;
    $('fServicio').value = d.servicio;
    if (![...$('fProveedor').options].some(o => o.value === d.proveedor)) $('fProveedor').appendChild(new Option(d.proveedor, d.proveedor));
    $('fProveedor').value = d.proveedor;
    $('fDetalle').value = d.detalle;
    estado.form = { categoria: d.categoria, motivo: d.subcategoria, problema: d.problema, estado: d.estado };
    pintarCategorias(); pintarMotivos(); pintarEstadoForm();
    $('fProducto').value = d.producto || '';
    $('fPatologia').value = d.patologia || '';
    $('fCupoDefectuoso').value = d.cupoDefectuoso || '';
    $('fCupoTotal').value = d.cupoTotal || '';
    $('fResponsable').value = d.responsable || 'Muni';
    $('fAcciones').value = d.acciones || '';
    const hl = leerHora(d.horaLlegada);
    $('fHora').value = hl ? hl.hora : ''; $('fHoraEspecial').checked = !!(hl && hl.especial);
    actualizarSugerencia(); actualizarResumen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // (1.2.0) Ya no hace falta avisar al cerrar: la cola queda guardada en el navegador y sigue
  // al volver (cola-envios.js avisa solo si el navegador no la deja guardar).


  /** Deja el formulario listo para otro reclamo. Si mantenerEscuela, conserva escuela/fecha/servicio. */
  function limpiarFormulario(mantenerEscuela) {
    $('fDetalle').value = '';
    $('fCupoDefectuoso').value = '';
    $('fAcciones').value = '';
    $('fProducto').value = '';
    $('fPatologia').value = '';
    $('fHora').value = ''; $('fHoraEspecial').checked = false;   // (2.9.0)
    estado.form = { categoria: '', motivo: '', problema: '', estado: 'Pendiente' };
    if (!mantenerEscuela) {
      estado.escuela = null;
      $('fEscuela').value = '';
      $('infoEscuela').style.display = 'none';
      $('fFecha').value = hoyISO();
      $('fCupoTotal').value = '';
      $('hintCupoTotal').textContent = '';
      $('hintProveedor').textContent = '';
      $('fProveedor').value = '';
      pintarAbiertosEscuela();
    }
    $('fResponsable').value = 'Muni';
    ['escuela', 'detalle', 'motivo', 'fecha', 'cupo'].forEach(c => marcarError(c, ''));
    $('fFecha').classList.remove('invalido'); $('fCupoDefectuoso').classList.remove('invalido');
    pintarCategorias();
    pintarMotivos();
    pintarEstadoForm();
    actualizarSugerencia();
    actualizarResumen();
    revisarDuplicado();
    if (mantenerEscuela) $('fDetalle').focus();
  }

  /* ---------- (1.2.0) Borrador del reclamo que se está cargando ----------
   * Mientras se completa el formulario se va guardando solo (en esta pestaña y, de respaldo,
   * en el navegador). Si se va a otra sección o se recarga, al volver aparece como estaba,
   * con un aviso y el botón "Empezar de cero". Vence al terminar el día. */
  const BORRADOR = 'sae-borrador-reclamo';
  let borradorListo = false, tBorrador = null;
  function borrarBorrador() {
    try { sessionStorage.removeItem(BORRADOR); } catch (e) { /* nada */ }
    try { localStorage.removeItem(BORRADOR); } catch (e) { /* nada */ }
  }
  function leerBorrador() {
    let b = null;
    try { b = JSON.parse(sessionStorage.getItem(BORRADOR) || 'null'); } catch (e) { /* nada */ }
    if (!b) { try { b = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch (e) { /* nada */ } }
    if (b && b.dia !== hoyISO()) { borrarBorrador(); return null; }   // de otro día: se descarta
    return b;
  }
  const borradorConContenido = (b) => !!(b && (b.detalle || b.categoria || (b.multi && b.multi.length) || b.acciones));
  function guardarBorrador() {
    if (!borradorListo) return;
    const d = datosFormulario();
    const b = { dia: hoyISO(), escuela: estado.escuela ? estado.escuela.nombre : '', multi: estado.multi ? [...estado.multi.keys()] : null,
      fecha: d.fecha, servicio: d.servicio, proveedor: d.proveedor, detalle: $('fDetalle').value,
      producto: $('fProducto').value, patologia: $('fPatologia').value, cupoDefectuoso: d.cupoDefectuoso, cupoTotal: d.cupoTotal,
      responsable: d.responsable, acciones: $('fAcciones').value,
      categoria: estado.form.categoria, motivo: estado.form.motivo, problema: estado.form.problema, estado: estado.form.estado,
      hora: $('fHora').value, horaEspecial: $('fHoraEspecial').checked };
    if (!b.escuela && !borradorConContenido(b)) { borrarBorrador(); return; }
    const t = JSON.stringify(b);
    try { sessionStorage.setItem(BORRADOR, t); } catch (e) { /* nada */ }
    try { localStorage.setItem(BORRADOR, t); } catch (e) { /* nada */ }
  }
  function programarBorrador() {
    if (!borradorListo) return;
    clearTimeout(tBorrador);
    tBorrador = setTimeout(guardarBorrador, 300);
  }
  /** Vuelve a poner el borrador en el formulario. Devuelve true si tenía algo más que la escuela. */
  function restaurarBorrador() {
    const b = leerBorrador();
    if (!b) return false;
    if (b.multi && b.multi.length) {
      abrirMulti();
      estado.multi.clear();
      b.multi.forEach(n => { const e = ESCUELAS.find(x => x.nombre === n); if (e) estado.multi.set(e.nombre, e); });
      pintarMulti();
    } else if (b.escuela) {
      const e = ESCUELAS.find(x => x.nombre === b.escuela);
      if (e) elegirEscuela(e);
    }
    if (b.fecha) $('fFecha').value = b.fecha;
    if (b.servicio && [...$('fServicio').options].some(o => o.value === b.servicio)) $('fServicio').value = b.servicio;
    if (b.proveedor) {
      if (![...$('fProveedor').options].some(o => o.value === b.proveedor)) $('fProveedor').appendChild(new Option(b.proveedor, b.proveedor));
      $('fProveedor').value = b.proveedor;
    }
    $('fDetalle').value = b.detalle || '';
    estado.form = { categoria: b.categoria || '', motivo: b.motivo || '', problema: b.problema || '', estado: b.estado || 'Pendiente' };
    pintarCategorias(); pintarMotivos(); pintarEstadoForm();
    $('fProducto').value = b.producto ? capitalizar(b.producto) : '';
    $('fPatologia').value = b.patologia || '';
    $('fCupoDefectuoso').value = b.cupoDefectuoso || '';
    if (b.cupoTotal) $('fCupoTotal').value = b.cupoTotal;
    $('fResponsable').value = b.responsable || 'Muni';
    $('fAcciones').value = b.acciones || '';
    $('fHora').value = b.hora || ''; $('fHoraEspecial').checked = !!b.horaEspecial;
    actualizarSugerencia(); actualizarResumen(); mostrarControles();
    return borradorConContenido(b);
  }
  function avisoBorrador(mostrar) {
    let el = $('avisoBorrador');
    if (!mostrar) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'avisoBorrador';
      el.className = 'rec-borrador';
      el.setAttribute('role', 'status');
      $('formReclamo').insertBefore(el, $('formReclamo').firstChild);
    }
    el.innerHTML = '📝 <span>Recuperamos el reclamo que estabas cargando.</span>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnBorradorCero">Empezar de cero</button>' +
      '<button type="button" class="rec-cerrar-aviso" id="btnBorradorOk" title="Cerrar el aviso" aria-label="Cerrar el aviso">✕</button>';
    $('btnBorradorCero').addEventListener('click', () => {
      if (estado.multi) salirMulti(false);
      limpiarFormulario(false);
      borrarBorrador();
      avisoBorrador(false);
    });
    $('btnBorradorOk').addEventListener('click', () => avisoBorrador(false));
  }

  /* ======================================================================
   * BUSCADOR Y FILTROS
   * ====================================================================== */
  function valoresUnicos(fn) {
    const s = new Set();
    estado.reclamos.forEach(r => { const v = fn(r); if (v) s.add(v); });
    return [...s].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }

  function llenarFiltrosDesdeDatos() {
    llenarSelect($('bProveedor'), valoresUnicos(r => r.est.proveedor), true);
    llenarSelect($('bServicio'), valoresUnicos(r => r.est.servicio).map(v => ({ valor: v, etiqueta: capitalizar(v) })), true);
    llenarSelect($('bCategoria'), valoresUnicos(r => r.est.categoria).map(v => ({ valor: v, etiqueta: etqCategoria(v) })), true);
    llenarSelect($('bMotivo'), valoresUnicos(r => r.est.motivo).map(v => ({ valor: v, etiqueta: ETQ_MOTIVO[v] || capitalizar(v) })), true);
    llenarSelect($('bProblema'), valoresUnicos(r => r.est.problema).map(v => ({ valor: v, etiqueta: ETQ_PROBLEMA[v] || capitalizar(v) })), true);
    llenarSelect($('bProducto'), valoresUnicos(r => r.est.producto).map(v => ({ valor: v, etiqueta: capitalizar(v) })), true);
    llenarSelect($('bEstado'), ['Pendiente', 'En gestión', 'Resuelto', 'Sin estado'], true);
    llenarSelect($('bZona'), valoresUnicos(r => r.est.zona).map(z => ({ valor: z, etiqueta: 'Zona ' + z })), true);
    llenarSelect($('bPatologia'), valoresUnicos(r => r.est.patologia).map(v => ({ valor: v, etiqueta: capitalizar(v) })), true);
    const prov = $('fProveedor').value;
    llenarSelect($('fProveedor'), proveedoresConocidos(), true, 'Elegí el proveedor…');
    $('fProveedor').value = prov;
  }

  function filtrosActivos() {
    return {
      texto: norm($('bTexto').value),
      desde: $('bDesde').value, hasta: $('bHasta').value,
      proveedor: $('bProveedor').value, servicio: $('bServicio').value,
      categoria: $('bCategoria').value,
      motivo: $('bMotivo').value, problema: $('bProblema').value,
      producto: $('bProducto').value, estado: $('bEstado').value,
      zona: $('bZona').value, patologia: $('bPatologia').value,
      estimado: $('bEstimado').checked
    };
  }

  function aplicarFiltros() {
    if (!estado.cargado) return;
    const f = filtrosActivos();
    const palabras = f.texto.split(' ').filter(Boolean);
    const estancados = estado.filtroRapido === 'estancados';
    const revisar = estado.filtroRapido === 'revisar';
    const limite = limiteEstancado();
    // (2.9.0) Horas de llegada que se pueden completar desde el texto
    estado._propHora = revisar ? new Map(propuestasHora().map(x => [x.r.fila, x.hora])) : null;
    const res = estado.reclamos.filter(r => {
      const e = r.est;
      if (palabras.length && !palabras.every(p => e.texto.includes(p))) return false;
      const iso = r.fecha ? isoDe(r.fecha) : '';
      if (f.desde && (!iso || iso < f.desde)) return false;
      if (f.hasta && (!iso || iso > f.hasta)) return false;
      if (f.proveedor && e.proveedor !== f.proveedor) return false;
      if (f.servicio && e.servicio !== f.servicio) return false;
      if (f.categoria && e.categoria !== f.categoria) return false;
      if (f.motivo && e.motivo !== f.motivo) return false;
      if (f.problema && (e.problema !== f.problema || (!f.estimado && e.problemaEstimado))) return false;
      if (f.producto && e.producto !== f.producto) return false;
      if (f.estado && e.estado !== f.estado) return false;
      if (f.zona && e.zona !== f.zona) return false;
      if (f.patologia && (e.patologia !== f.patologia || (!f.estimado && e.patologiaEstimada))) return false;
      if (estancados && !esEstancado(r, limite)) return false;
      if (revisar && estado.tipoRevision === 'hora') {
        if (!estado._propHora.has(r.fila)) return false;
      } else if (revisar && estado.tipoRevision === 'reclasificar') {
        const pr = propuestaReclasif(r);
        if (!pr || (estado.reclasVista === 'seguras' && !pr.segura) || (estado.reclasVista === 'revisar' && pr.segura)) return false;
      } else if (revisar) {
        const p = problemasDato(r);
        if (!p.length || (estado.tipoRevision && !p.includes(estado.tipoRevision))) return false;
        // (2.2.0) Sin estado: ver solo los que se pueden dar por resueltos, o solo los que quedan
        if (estado.tipoRevision === 'estado' && estado.sinEstVista && grupoSinEstado(r) !== estado.sinEstVista) return false;
      }
      return true;
    });
    // Más nuevos primero (por fecha y, a igual fecha, por fila), salvo que se elija lo contrario con el botón.
    // Sin elección: los estancados van del más viejo al más nuevo.
    // (los que no tienen fecha válida quedan siempre al final)
    const signo = ordenActual() === 'viejos' ? 1 : -1;
    const t = (r) => r.fecha && !isNaN(r.fecha) && r.fecha.getFullYear() >= 2015 ? r.fecha.getTime() : null;
    res.sort((a, b) => {
      const ta = t(a), tb = t(b);
      if (ta == null || tb == null) return (ta == null) - (tb == null) || signo * (a.fila - b.fila);
      return signo * (ta - tb) || signo * (a.fila - b.fila);
    });
    pintarBotonOrden();
    pintarEstancados();
    pintarRevision();
    pintarAbiertosEscuela();
    estado.filtrados = res;
    estado.mostrados = Math.max(POR_PAGINA, estado.conservarMostrados || 0);   // (2.8.8) al refrescar solo, no se achica la lista
    estado.conservarMostrados = 0;
    pintarResumenMotivos();
    pintarResultados();
    if ($('tabResumen').classList.contains('active')) pintarResumen();
  }

  /* ---------- Reclamos estancados: sin resolver hace más de X días ---------- */
  const CLAVE_DIAS_EST = 'sae-estancados-dias';
  const OPCIONES_DIAS_EST = [3, 7, 15, 30];
  function diasEstancado() {
    const n = Number(leerLS(CLAVE_DIAS_EST));
    return OPCIONES_DIAS_EST.includes(n) ? n : 7;
  }
  /** Fecha a partir de la cual un reclamo abierto se considera estancado (los anteriores lo están). */
  function limiteEstancado() {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - diasEstancado());
    return d;
  }
  /* (2.8.7) Inclusive: con "3 días", un reclamo de hace justo 3 días ya cuenta. */
  function esEstancado(r, limite) {
    return (r.est.estado === 'Pendiente' || r.est.estado === 'En gestión') && r.fecha && r.fecha >= FECHA_MIN && r.fecha <= limite;
  }
  /* (2.8.7) El aviso aparece en Buscar y en Nuevo reclamo. Se puede achicar (▴); se recuerda en
   * esta compu y vuelve a abrirse solo si aparece un reclamo estancado nuevo.
   * (2.9.0) Achicarlo en un apartado lo achica también en el otro (una sola clave). */
  const LS_EST_OCULTO = 'sae-estancados-oculto';
  function pintarEstancados() {
    if (!estado.cargado) return;
    const dias = diasEstancado(), limite = limiteEstancado();
    const lista = estado.reclamos.filter(r => esEstancado(r, limite))
      .sort((a, b) => (a.fecha - b.fecha) || (a.fila - b.fila));
    // Los de este año sin ESTADO cargado no se pueden saber si están resueltos: se avisa cuántos son
    const sinEstado = estado.reclamos.filter(r => r.est.estado === 'Sin estado' && r.fecha &&
      r.fecha.getFullYear() > ANIO_CIERRE_RESUELTOS && r.fecha <= limite).length;
    ['avisoEstancados', 'avisoEstancadosNuevo'].forEach(id => { const caja = $(id); if (caja) pintarCajaEstancados(caja, lista, dias, sinEstado); });
  }
  function pintarCajaEstancados(caja, lista, dias, sinEstado) {
    const lugar = caja.dataset.lugar || caja.id;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const selDias = `<select class="sel-dias-est" aria-label="Días sin resolver">${OPCIONES_DIAS_EST.map(n => `<option value="${n}"${n === dias ? ' selected' : ''}>${n} días</option>`).join('')}</select>`;
    const activo = estado.filtroRapido === 'estancados';
    const notaSinEstado = sinEstado ? `<p class="rec-est-mas">Además hay ${nf(sinEstado)} reclamo${sinEstado === 1 ? '' : 's'} de hace ${dias} días o más con la columna ESTADO vacía: no se cuentan porque no se sabe si están resueltos.</p>` : '';
    // Achicado: se recuerdan las filas que había; si aparece una nueva, se vuelve a abrir solo
    let oculto = null;
    try { oculto = JSON.parse(leerLS(LS_EST_OCULTO) || 'null'); } catch (e) { oculto = null; }
    const filas = lista.map(r => r.fila);
    if (oculto && filas.some(f => !oculto.includes(f))) { oculto = null; guardarLS(LS_EST_OCULTO, ''); }
    const achicado = !!oculto && lista.length > 0;
    const plegar = lista.length ? `<button type="button" class="rec-est-plegar" aria-expanded="${!achicado}" title="${achicado ? 'Mostrar la lista' : 'Achicar (vuelve a abrirse si aparece uno nuevo)'}">${achicado ? '▾ Mostrar' : '▴'}</button>` : '';
    caja.className = 'rec-estancados' + (lista.length ? ' hay' : ' ok') + (achicado ? ' achicado' : '');
    if (!lista.length) {
      caja.innerHTML = `<div class="rec-est-cab"><span>✅ No hay reclamos pendientes ni en gestión de hace ${selDias} o más</span></div>` + notaSinEstado;
    } else {
      const MAX = 5;
      caja.innerHTML = `<div class="rec-est-cab">
          <span>⏰ <strong>${nf(lista.length)}</strong> reclamo${lista.length === 1 ? '' : 's'} sin resolver hace ${selDias} o más</span>
          <span class="rec-est-botones">${achicado ? '' : `<button type="button" class="btn btn-secondary btn-sm rec-est-ver">${activo && lugar === 'buscar' ? 'Quitar filtro' : 'Ver todos'}</button>`}${plegar}</span>
        </div>` + (achicado ? '' : `
        <ul class="rec-est-lista">${lista.slice(0, MAX).map((r, i) => {
          const d = Math.round((hoy - r.fecha) / DIA_MS);
          return `<li><button type="button" class="rec-est-item" data-i="${i}">
            <span class="rec-est-dias" title="Días desde la fecha del reclamo">${nf(d)} días</span>
            <span class="rec-est-esc">${esc(r.v[C.ESCUELA] || 'Sin escuela')}</span>
            <span class="rec-est-det">${esc(fechaCorta(r.fecha))} · ${esc((r.est.motivo ? etqMotivo(r.est.motivo, r.est.categoria) : 'Sin motivo'))}${r.est.proveedor ? ' · ' + puntoProv(r.est.proveedor) + esc(r.est.proveedor) : ''}</span>
            <span class="rec-pill ${claseEstado(r.est.estado)}">${esc(r.est.estado)}</span>
          </button></li>`;
        }).join('')}</ul>` +
        (lista.length > MAX ? `<p class="rec-est-mas">Los ${MAX} más viejos. Tocá “Ver todos” para la lista completa.</p>` : '') + notaSinEstado);
      caja.querySelectorAll('.rec-est-item').forEach(b => b.addEventListener('click', () => abrirModal(lista[Number(b.dataset.i)])));
      const ver = caja.querySelector('.rec-est-ver');
      if (ver) ver.addEventListener('click', () => {
        if (lugar === 'nuevo') {   // desde Nuevo reclamo: se va a Buscar con el filtro puesto
          const t = document.querySelector('.rec-tab[data-tab="tabBuscar"]'); if (t) t.click();
          if (estado.filtroRapido !== 'estancados') filtroRapido('estancados');
          return;
        }
        filtroRapido('estancados');
      });
      const pl = caja.querySelector('.rec-est-plegar');
      if (pl) pl.addEventListener('click', () => {
        guardarLS(LS_EST_OCULTO, achicado ? '' : JSON.stringify(filas));
        pintarEstancados();
      });
    }
    const sel = caja.querySelector('.sel-dias-est');
    if (sel) sel.addEventListener('change', (ev) => { guardarLS(CLAVE_DIAS_EST, ev.target.value); aplicarFiltros(); });
  }

  function pintarResumenMotivos() {
    const cont = $('resumenMotivos');
    const cuenta = {};
    estado.filtrados.forEach(r => { const k = r.est.motivo || 'SIN MOTIVO'; cuenta[k] = (cuenta[k] || 0) + 1; });
    const total = estado.filtrados.length || 1;
    const orden = Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const actual = $('bMotivo').value;
    cont.innerHTML = orden.map(([m, n]) =>
      `<button type="button" class="rec-motivo-chip${m === actual ? ' activo' : ''}" data-motivo="${esc(m === 'SIN MOTIVO' ? '' : m)}">` +
      `<span class="rec-motivo-nombre">${esc(ETQ_MOTIVO[m] || capitalizar(m))}</span>` +
      `<span class="rec-motivo-n">${n.toLocaleString('es-AR')}</span>` +
      `<span class="rec-motivo-barra"><span style="width:${Math.max(4, Math.round(n / total * 100))}%"></span></span></button>`
    ).join('');
    cont.querySelectorAll('.rec-motivo-chip').forEach(b => b.addEventListener('click', () => {
      $('bMotivo').value = $('bMotivo').value === b.dataset.motivo ? '' : b.dataset.motivo;
      aplicarFiltros();
    }));
  }

  function claseEstado(e) {
    return { 'Pendiente': 'pendiente', 'En gestión': 'gestion', 'Resuelto': 'resuelto' }[e] || 'sin';
  }

  function pintarResultados() {
    const lista = $('listaResultados');
    // (2.3.1) No se redibuja mientras se está eligiendo una clasificación a mano
    if (editorEnUso()) { estado.pintarPendiente = true; return; }
    const total = estado.filtrados.length;
    $('resultadosConteo').innerHTML = total
      ? `<strong>${total.toLocaleString('es-AR')}</strong> reclamo${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}` +
        (estado.filtroRapido === 'estancados' ? ` · sin resolver hace ${diasEstancado()} días o más` : '') +
        (total > 1 ? ` · ${ordenActual() === 'viejos' ? 'del más viejo al más nuevo' : 'del más nuevo al más viejo'}` : '')
      : 'No hay reclamos con esos filtros.';
    // Los reclamos iguales cargados para muchas escuelas (10 o más) se muestran en un solo globo por proveedor
    const entradas = estado.filtroRapido === 'revisar' ? estado.filtrados.map(r => ({ tipo: 'uno', r })) : armarEntradas(estado.filtrados);
    const visE = entradas.slice(0, estado.mostrados);
    const vis = [];
    lista.innerHTML = visE.map((en) => {
      if (en.tipo === 'grupo') return htmlGrupo(en);
      const r = en.r, i = vis.push(r) - 1;
      const e = r.est, v = r.v;
      const etiquetas = [
        e.motivo && `<span class="rec-tag motivo">${esc(etqMotivo(e.motivo, e.categoria))}</span>`,
        e.problema && `<span class="rec-tag${e.problemaEstimado ? ' estimado' : ''}" ${e.problemaEstimado ? 'title="Clasificación estimada a partir del detalle"' : ''}>${esc(ETQ_PROBLEMA[e.problema] || capitalizar(e.problema))}${e.problemaEstimado ? ' ~' : ''}</span>`,
        e.producto && `<span class="rec-tag">${esc(capitalizar(e.producto))}</span>`,
        e.patologia && `<span class="rec-tag pat${e.patologiaEstimada ? ' estimado' : ''}">${esc(capitalizar(e.patologia))}${e.patologiaEstimada ? ' ~' : ''}</span>`,
        (() => { const ev = r.v[C.HORA] ? evaluarReclamo(r) : null; return ev ? `<span class="rec-tag rec-tag-hora${ev.cuando === 'tarde' ? ' tarde' : ''}" title="${esc(textoEvaluacion(ev))}">⏰ ${esc(horaVer(ev.hora))}${ev.cuando === 'tarde' ? ' · ' + esc(textoDemora(ev.demora)) + ' tarde' : ''}${ev.especial ? ' · especial' : ''}</span>` : ''; })()
      ].filter(Boolean).join('') + (estado.filtroRapido === 'revisar' && estado.tipoRevision === 'hora' && estado._propHora && estado._propHora.has(r.fila)
        ? `<span class="rec-tag rec-tag-reclas segura">⏰ ${esc(horaVer(estado._propHora.get(r.fila)))} · dice el texto</span>` +
          `<button type="button" class="rec-reclas-btn" data-hora="aplicar" data-fila="${r.fila}">Aplicar</button><button type="button" class="rec-reclas-btn secundario" data-hora="descartar" data-fila="${r.fila}">Descartar</button>` +
          `<button type="button" class="rec-reclas-btn editar" data-hora="elegir" data-fila="${r.fila}" title="Abrir el reclamo y poner otra hora">✏️ Otra hora</button> <span class="rec-tag rec-tag-fila">Fila ${r.fila}</span>`
        : '') + (estado.filtroRapido === 'revisar' && estado.tipoRevision === 'reclasificar' && propuestaReclasif(r)
        ? (() => { const p = propuestaReclasif(r); return `<span class="rec-tag rec-tag-reclas${p.segura ? ' segura' : ''}" title="${esc(p.razon ? 'Motivo de la sugerencia: ' + p.razon : '')}">→ ${esc(etqClas(p.categoria, p.motivo))} · ${p.segura ? 'segura' : 'para revisar'}</span>` +
            `<button type="button" class="rec-reclas-btn" data-reclas="aplicar" data-fila="${r.fila}">Aplicar</button><button type="button" class="rec-reclas-btn secundario" data-reclas="descartar" data-fila="${r.fila}">Descartar</button>` +
            `<button type="button" class="rec-reclas-btn editar" data-reclas="elegir" data-fila="${r.fila}" title="Elegir vos la categoría y el motivo">✏️ Elegir yo</button>` +
            ` <span class="rec-tag rec-tag-fila">Fila ${r.fila}</span>`; })()
        : '') + (estado.filtroRapido === 'revisar' && estado.tipoRevision !== 'reclasificar' && estado.tipoRevision !== 'hora'
        ? problemasDato(r).map(t => `<span class="rec-tag rec-tag-rev">⚠ ${t === 'duplicado' ? `Duplicado de la fila ${filaOriginalDe(r)}` : esc((TIPOS_REVISION.find(x => x.id === t) || {}).txt || t)}</span>`).join('') + ` <span class="rec-tag rec-tag-fila">Fila ${r.fila}</span>` +
          (camposACompletar(r).length ? `<button type="button" class="rec-reclas-btn editar" data-completar="${r.fila}" title="Completar los datos que faltan sin abrir el reclamo">✏️ Completar acá</button>` : '')
        : '');
      const elegido = estado.seleccion && estado.seleccion.has(r.fila);
      return `<article class="rec-item${estado.seleccion ? ' rec-item-sel' : ''}${elegido ? ' elegido' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${estado.seleccion ? (elegido ? 'Quitar de los elegidos: ' : 'Elegir: ') : 'Ver reclamo de '}${esc(v[C.ESCUELA])}"${estado.seleccion ? ` aria-pressed="${elegido}"` : ''}>
        <div class="rec-item-cab">${estado.seleccion ? `<span class="rec-sel-check" aria-hidden="true">${elegido ? '☑' : '☐'}</span>` : ''}
          <span class="rec-item-fecha">${esc(r.fecha ? fechaCorta(r.fecha) : v[C.FECHA])}</span>
          <strong class="rec-item-escuela">${esc(v[C.ESCUELA] || 'Sin escuela')}</strong>
          <span class="rec-item-meta">${puntoProv(e.proveedor)}${esc([e.proveedor, capitalizar(e.servicio)].filter(Boolean).join(' · '))}</span>
          <span class="rec-pill ${claseEstado(e.estado)}">${esc(e.estado)}</span>
        </div>
        <p class="rec-item-detalle">${esc(v[C.DETALLE] || '—')}</p>
        <div class="rec-item-tags">${etiquetas}</div>
      </article>`;
    }).join('');
    lista.querySelectorAll('[data-reclas]').forEach(b => b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = estado.reclamos.find(x => x.fila === Number(b.dataset.fila));
      if (!r) return;
      if (b.dataset.reclas === 'elegir') { abrirEditorClasif(b.closest('.rec-item'), r); return; }
      if (b.dataset.reclas === 'aplicar') aplicarReclasif([r]); else descartarReclasif(r);
    }));
    lista.querySelectorAll('[data-hora]').forEach(b => b.addEventListener('click', (ev) => {   // (2.9.0)
      ev.stopPropagation();
      const r = estado.reclamos.find(x => x.fila === Number(b.dataset.fila));
      if (!r) return;
      if (b.dataset.hora === 'elegir') { abrirModal(r); return; }
      if (b.dataset.hora === 'descartar') {
        descartadasHora().add(r.fila); guardarLS(CLAVE_DESC_HORA, JSON.stringify([...descartadasHora()]));
        aplicarFiltros(); return;
      }
      guardarHoras([{ r, hora: estado._propHora.get(r.fila) }], `${r.v[C.ESCUELA]}: llegó ${horaVer(estado._propHora.get(r.fila))}`);
    }));
    lista.querySelectorAll('[data-completar]').forEach(b => b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = estado.reclamos.find(x => x.fila === Number(b.dataset.completar));
      if (r) abrirCompletar(b.closest('.rec-item'), r);
    }));
    lista.querySelectorAll('.rec-item:not(.rec-grupo)').forEach(el => {
      const abrir = () => {
        const r = vis[Number(el.dataset.i)];
        if (estado.seleccion) { alternarSeleccion(r, el); return; }   // (2.8.0) en "Elegir varios" se marca
        abrirModal(r);
      };
      el.addEventListener('click', abrir);
      el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
    });
    lista.querySelectorAll('.rec-grupo').forEach(el => conectarGrupo(el, visE.find(x => x.tipo === 'grupo' && x.clave === el.dataset.clave)));
    // (2.3.1) El editor de "Elegir yo" que estaba abierto vuelve a aparecer con lo elegido
    if (estado.editorClasif) {
      const b = lista.querySelector(`[data-reclas="elegir"][data-fila="${estado.editorClasif.fila}"]`);
      const r = b && estado.reclamos.find(x => x.fila === estado.editorClasif.fila);
      if (b && r) abrirEditorClasif(b.closest('.rec-item'), r, true);
      else estado.editorClasif = null;
    }
    // (2.9.0) Lo mismo con "Completar acá"
    if (estado.editorCompletar) {
      const b = lista.querySelector(`[data-completar="${estado.editorCompletar.fila}"]`);
      const r = b && estado.reclamos.find(x => x.fila === estado.editorCompletar.fila);
      if (b && r) abrirCompletar(b.closest('.rec-item'), r, true);
      else estado.editorCompletar = null;
    }
    if (estado.seleccion) pintarBarraSeleccion();
    const restantes = entradas.length - estado.mostrados;
    $('btnVerMas').style.display = restantes > 0 ? '' : 'none';
    $('btnVerMas').textContent = `Ver más (${restantes.toLocaleString('es-AR')} restantes)`;
  }

  /* ---------- Globos: el mismo reclamo para muchas escuelas ----------
   * Mismo día, categoría, motivo, texto de "¿Qué pasó?" y proveedor, en 5 o más escuelas
   * (cargados con "varias escuelas" o a mano). Es solo visual: en la hoja siguen siendo
   * un reclamo por escuela, y los conteos, filtros y Excel no cambian. */
  const MIN_GRUPO = 5;
  function claveGrupo(r) {
    const det = norm(r.v[C.DETALLE] || '').replace(/\s+/g, ' ');
    if (!det) return '';
    const dia = r.fecha ? isoDe(r.fecha) : String(r.v[C.FECHA] || '').trim();
    return [dia, r.est.categoria, r.est.motivo, det, r.est.proveedor].join('|');
  }
  function armarEntradas(lista) {
    const cuenta = new Map();
    lista.forEach(r => { const k = claveGrupo(r); if (k) cuenta.set(k, (cuenta.get(k) || 0) + 1); });
    const grupos = new Map(), entradas = [];
    lista.forEach(r => {
      const k = claveGrupo(r);
      if (k && cuenta.get(k) >= MIN_GRUPO) {
        let g = grupos.get(k);
        if (!g) { g = { tipo: 'grupo', clave: k, reclamos: [] }; grupos.set(k, g); entradas.push(g); }
        g.reclamos.push(r);
      } else entradas.push({ tipo: 'uno', r });
    });
    grupos.forEach(g => g.reclamos.sort((a, b) => String(a.v[C.ESCUELA]).localeCompare(String(b.v[C.ESCUELA]), 'es', { numeric: true })));
    return entradas;
  }
  function seleccionGrupo(clave) {
    if (!estado.gruposSel) estado.gruposSel = new Map();
    if (!estado.gruposSel.has(clave)) estado.gruposSel.set(clave, new Set());
    return estado.gruposSel.get(clave);
  }
  function htmlGrupo(g) {
    const r0 = g.reclamos[0], e = r0.est, v = r0.v, n = g.reclamos.length;
    if (!estado.gruposAbiertos) estado.gruposAbiertos = new Set();
    const abierto = estado.gruposAbiertos.has(g.clave);
    const sel = seleccionGrupo(g.clave);
    const filas = new Set(g.reclamos.map(r => r.fila));
    [...sel].forEach(f => { if (!filas.has(f)) sel.delete(f); });   // las que ya no están en la lista
    const porEstado = {};
    g.reclamos.forEach(r => { porEstado[r.est.estado] = (porEstado[r.est.estado] || 0) + 1; });
    const pills = ['Pendiente', 'En gestión', 'Resuelto', 'Sin estado'].filter(k => porEstado[k])
      .map(k => `<span class="rec-pill ${claseEstado(k)}">${nf(porEstado[k])} ${esc(k === 'Sin estado' ? 'sin estado' : k)}</span>`).join('');
    const servicios = [...new Set(g.reclamos.map(r => capitalizar(r.est.servicio)).filter(Boolean))];
    const etiquetas = [
      e.motivo && `<span class="rec-tag motivo">${esc(etqMotivo(e.motivo, e.categoria))}</span>`,
      e.problema && `<span class="rec-tag${e.problemaEstimado ? ' estimado' : ''}">${esc(ETQ_PROBLEMA[e.problema] || capitalizar(e.problema))}${e.problemaEstimado ? ' ~' : ''}</span>`,
      e.producto && `<span class="rec-tag">${esc(capitalizar(e.producto))}</span>`
    ].filter(Boolean).join('');
    const items = g.reclamos.map(r => `<li class="rec-grupo-fila${sel.has(r.fila) ? ' marcada' : ''}">
        <label class="rec-grupo-check"><input type="checkbox" data-fila="${r.fila}"${sel.has(r.fila) ? ' checked' : ''}>
          <span class="rec-grupo-esc">${esc(r.v[C.ESCUELA] || 'Sin escuela')}</span></label>
        ${servicios.length > 1 ? `<span class="rec-grupo-serv">${esc(capitalizar(r.est.servicio))}</span>` : ''}
        <span class="rec-pill ${claseEstado(r.est.estado)}">${esc(r.est.estado)}</span>
        <button type="button" class="rec-grupo-abrir" data-fila="${r.fila}" title="Ver el reclamo de ${esc(r.v[C.ESCUELA])}">Abrir</button>
      </li>`).join('');
    const alcance = sel.size ? `Cambiar ${sel.size === 1 ? 'la marcada' : `las ${nf(sel.size)} marcadas`} a:` : `Cambiar las ${nf(n)} a:`;
    return `<article class="rec-item rec-grupo${abierto ? ' abierto' : ''}" data-clave="${esc(g.clave)}">
        <div class="rec-item-cab">
          <span class="rec-item-fecha">${esc(r0.fecha ? fechaCorta(r0.fecha) : v[C.FECHA])}</span>
          <strong class="rec-item-escuela">📦 ${nf(n)} escuelas</strong>
          <span class="rec-item-meta">${puntoProv(e.proveedor)}${esc([e.proveedor, servicios.slice(0, 2).join(' / ') + (servicios.length > 2 ? '…' : '')].filter(Boolean).join(' · '))}</span>
          <span class="rec-grupo-estados">${pills}</span>
        </div>
        <p class="rec-item-detalle">${esc(v[C.DETALLE] || '—')}</p>
        <div class="rec-item-tags">${etiquetas}<span class="rec-tag rec-tag-grupo">Mismo reclamo en ${nf(n)} escuelas</span></div>
        <button type="button" class="rec-grupo-ver" aria-expanded="${abierto}">${abierto ? '▾ Ocultar las escuelas' : `▸ Ver las ${nf(n)} escuelas`}</button>
        <div class="rec-grupo-cuerpo"${abierto ? '' : ' hidden'}>
          <div class="rec-grupo-barra">
            <label class="rec-grupo-check rec-grupo-todas"><input type="checkbox" class="rec-grupo-marcar-todas"${sel.size === n ? ' checked' : ''}> Marcar todas</label>
            <span class="rec-grupo-alcance">${alcance}</span>
            ${CLASIFICACION.estados.map(x => `<button type="button" class="rec-grupo-estado ${claseEstado(x)}" data-estado="${esc(x)}">${esc(x)}</button>`).join('')}
          </div>
          <ul class="rec-grupo-lista">${items}</ul>
        </div>
      </article>`;
  }
  function conectarGrupo(el, g) {
    if (!g) return;
    const sel = seleccionGrupo(g.clave), n = g.reclamos.length;
    const pintarAlcance = () => {
      el.querySelector('.rec-grupo-alcance').textContent = sel.size ? `Cambiar ${sel.size === 1 ? 'la marcada' : `las ${nf(sel.size)} marcadas`} a:` : `Cambiar las ${nf(n)} a:`;
      el.querySelector('.rec-grupo-marcar-todas').checked = sel.size === n;
      el.querySelector('.rec-grupo-marcar-todas').indeterminate = sel.size > 0 && sel.size < n;
    };
    el.querySelector('.rec-grupo-ver').addEventListener('click', () => {
      if (estado.gruposAbiertos.has(g.clave)) estado.gruposAbiertos.delete(g.clave); else estado.gruposAbiertos.add(g.clave);
      const abierto = estado.gruposAbiertos.has(g.clave);
      el.classList.toggle('abierto', abierto);
      el.querySelector('.rec-grupo-cuerpo').hidden = !abierto;
      const b = el.querySelector('.rec-grupo-ver');
      b.setAttribute('aria-expanded', String(abierto));
      b.textContent = abierto ? '▾ Ocultar las escuelas' : `▸ Ver las ${nf(n)} escuelas`;
    });
    el.querySelectorAll('.rec-grupo-lista input[type="checkbox"]').forEach(cb => cb.addEventListener('change', () => {
      const f = Number(cb.dataset.fila);
      if (cb.checked) sel.add(f); else sel.delete(f);
      cb.closest('.rec-grupo-fila').classList.toggle('marcada', cb.checked);
      pintarAlcance();
    }));
    el.querySelector('.rec-grupo-marcar-todas').addEventListener('change', (ev) => {
      sel.clear();
      if (ev.target.checked) g.reclamos.forEach(r => sel.add(r.fila));
      el.querySelectorAll('.rec-grupo-lista input[type="checkbox"]').forEach(cb => {
        cb.checked = ev.target.checked; cb.closest('.rec-grupo-fila').classList.toggle('marcada', cb.checked);
      });
      pintarAlcance();
    });
    el.querySelectorAll('.rec-grupo-abrir').forEach(b => b.addEventListener('click', () => {
      const r = g.reclamos.find(x => x.fila === Number(b.dataset.fila));
      if (r) abrirModal(r);
    }));
    el.querySelectorAll('.rec-grupo-estado').forEach(b => b.addEventListener('click', () => {
      const elegidos = sel.size ? g.reclamos.filter(r => sel.has(r.fila)) : g.reclamos;
      const nuevo = b.dataset.estado;
      const aCambiar = elegidos.filter(r => r.est.estado !== nuevo);
      if (!aCambiar.length) { toast(`Ya ${elegidos.length === 1 ? 'está' : 'están todas'} en "${nuevo}".`, 'ok'); return; }
      const texto = `¿Cambiar ${aCambiar.length === 1 ? '1 reclamo' : nf(aCambiar.length) + ' reclamos'} a "${nuevo}"?` +
        (elegidos.length !== aCambiar.length ? `\n(${nf(elegidos.length - aCambiar.length)} ya estaban así y no se tocan.)` : '');
      if (!confirm(texto)) return;
      sel.clear();
      cambiarEstadoVarios(aCambiar, nuevo);
    }));
    pintarAlcance();
  }

  /* ---------- (2.8.0) Elegir varios reclamos y cambiarles el estado juntos ---------- */
  function alternarSeleccion(r, el) {
    if (!estado.seleccion || !r) return;
    if (estado.seleccion.has(r.fila)) estado.seleccion.delete(r.fila); else estado.seleccion.add(r.fila);
    if (el) {
      const si = estado.seleccion.has(r.fila);
      el.classList.toggle('elegido', si);
      el.setAttribute('aria-pressed', String(si));
      const ch = el.querySelector('.rec-sel-check'); if (ch) ch.textContent = si ? '☑' : '☐';
    }
    pintarBarraSeleccion();
  }
  function pintarBarraSeleccion() {
    const on = !!estado.seleccion;
    $('barraSeleccion').style.display = on ? '' : 'none';
    $('btnElegirVarios').classList.toggle('activo', on);
    $('btnElegirVarios').setAttribute('aria-pressed', String(on));
    $('btnElegirVarios').textContent = on ? '✖ Terminar de elegir' : '☑ Elegir varios';
    document.body.classList.toggle('rec-eligiendo', on);
    if (!on) return;
    const n = estado.seleccion.size;
    $('selN').textContent = `${nf(n)} elegido${n === 1 ? '' : 's'}`;   // (2.8.7) barra compacta
    $('selTodos').textContent = `Todos (${nf(estado.filtrados.length)})`;
    document.querySelectorAll('#barraSeleccion .rec-sel-est, #selBorrar').forEach(b => { b.disabled = !n; });
  }
  function modoSeleccion(on) {
    estado.seleccion = on ? new Set() : null;
    pintarBarraSeleccion();
    pintarResultados();
  }
  /** (2.8.6) Borrar los elegidos (con confirmación fuerte; se puede deshacer). */
  function borrarElegidos() {
    if (!estado.seleccion || !estado.seleccion.size) return;
    if ((estado.versionScript || Number(leerLS('sae-script-version')) || 0) < 31) {
      toast('⚠️ Para borrar reclamos hay que actualizar el script de Google (versión 31).', 'error'); return;
    }
    const enCola = new Set(COLA.leer().filter(x => x.pedido).map(x => x.pedido.fila));
    const elegidos = estado.reclamos.filter(r => estado.seleccion.has(r.fila));
    const lista = elegidos.filter(r => !enCola.has(r.fila));
    const salteados = elegidos.length - lista.length;
    if (!lista.length) { toast('Los elegidos tienen cambios esperando para guardarse: esperá a que terminen.', 'error'); return; }
    const filas = lista.map(r => r.fila).sort((a, b) => a - b);
    const rango = filas.length === 1 ? `fila ${nf(filas[0])}` : (filas.length <= 6 ? 'filas ' + filas.map(nf).join(', ') : `filas ${nf(filas[0])} a ${nf(filas[filas.length - 1])}`);
    const texto = `🗑 Vas a BORRAR ${lista.length === 1 ? '1 reclamo' : nf(lista.length) + ' reclamos'} (${rango}).\n` +
      'Se eliminan esas filas de la hoja (las de abajo suben). Vas a poder deshacerlo durante 20 segundos.' +
      (salteados ? `\n(${nf(salteados)} no se borran porque tienen cambios esperando para guardarse.)` : '') + '\n\n¿Seguro?';
    if (!confirm(texto)) return;
    estado.seleccion = new Set();
    borrarLista(lista);
    pintarBarraSeleccion();
  }
  function cambiarEstadoElegidos(nuevo) {
    if (!estado.seleccion || !estado.seleccion.size) return;
    const elegidos = estado.reclamos.filter(r => estado.seleccion.has(r.fila));
    const aCambiar = elegidos.filter(r => r.est.estado !== nuevo);
    if (!aCambiar.length) { toast(`Ya ${elegidos.length === 1 ? 'está' : 'están todos'} en "${nuevo}".`, 'ok'); return; }
    const texto = `¿Pasar ${aCambiar.length === 1 ? '1 reclamo' : nf(aCambiar.length) + ' reclamos'} a "${nuevo}"?` +
      (elegidos.length !== aCambiar.length ? `\n(${nf(elegidos.length - aCambiar.length)} ya estaban así y no se tocan.)` : '');
    if (!confirm(texto)) return;
    estado.seleccion = new Set();
    cambiarEstadoVarios(aCambiar, nuevo);   // se ve al instante, se guarda en un envío y se puede deshacer
    pintarBarraSeleccion();
  }

  /** Cambia el estado de varios reclamos a la vez: se ve al instante y se envían de a uno en segundo plano. */
  function cambiarEstadoVarios(lista, nuevoEstado) {
    const anteriores = [];
    lista.forEach(r => {
      const v = r.v.slice();
      v[C.ESTADO] = nuevoEstado;
      if (nuevoEstado === 'Resuelto') { if (!v[C.FECHA_RES]) v[C.FECHA_RES] = fechaCorta(new Date()); }
      else v[C.FECHA_RES] = '';
      const nuevo = prepararReclamo({ fila: r.fila, v });
      const anterior = reemplazarReclamo(r, nuevo);
      anteriores.push(anterior);
      encolarActualizacion({ tipo: 'actualizar', antes: tomarAntes(r.v, 'actualizar'),
        datos: { escuela: r.v[C.ESCUELA], detalle: r.v[C.DETALLE] },
        pedido: { accion: 'actualizar', fila: r.fila, huella: huellaDe(r.v), cambios: { estado: nuevoEstado } } });
    });
    registrarDeshacer(anteriores, `${nf(lista.length)} reclamo${lista.length === 1 ? '' : 's'} → ${nuevoEstado}`);
    aplicarFiltros();
    actualizarBadge();
    const deUna = (estado.versionScript || Number(leerLS('sae-script-version')) || 0) >= 12;
    toast(`✔️ ${nf(lista.length)} reclamo${lista.length === 1 ? '' : 's'} → ${nuevoEstado}. ` +
      (deUna ? 'Se guardan en la hoja en un solo envío.' : 'Se guardan en la hoja de a uno (podés seguir trabajando).'), 'ok');
    pintarCola();
  }

  /* ---------- Revisar datos: reclamos incompletos o mal cargados ---------- */
  const TIPOS_REVISION = [
    { id: 'estado', txt: 'Sin estado', ayuda: 'Tocá "✏️ Completar acá" y elegí Pendiente, En gestión o Resuelto (o abrilo).' },
    { id: 'fecha', txt: 'Fecha inválida', ayuda: 'Sin fecha o con un año imposible. Se corrige en la hoja (la fila figura en cada reclamo).' },
    { id: 'escuela', txt: 'Escuela desconocida', ayuda: 'El nombre no coincide con ninguna escuela del buscador. Corregilo en la hoja con el nombre exacto.' },
    { id: 'proveedor', txt: 'Sin proveedor', ayuda: 'Falta el proveedor. Tocá "✏️ Completar acá" en cada reclamo (se propone el de la escuela).' },
    { id: 'clasificacion', txt: 'Sin categoría o motivo', ayuda: 'Falta la categoría o el motivo. Tocá "✏️ Completar acá" en cada reclamo.' },
    { id: 'servicio', txt: 'Sin servicio', ayuda: 'Falta el servicio (DM, comedor…). Tocá "✏️ Completar acá" en cada reclamo.' },
    { id: 'duplicado', txt: 'Duplicado', ayuda: 'Mismo día, escuela, categoría, motivo y texto que otro reclamo cargado antes (cada uno dice de qué fila es copia). Si se cargó dos veces por error, borrá la fila repetida en la hoja.' }
  ];
  /* Reclamos cargados dos veces: misma escuela, día, categoría, motivo y texto (sin mayúsculas ni espacios de más).
     El primero (fila más chica) es el "original"; los demás quedan marcados como duplicado de esa fila. */
  const compactoEsc = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/N\s*[°º]\s*/g, '').replace(/[^A-Z0-9]/g, '').replace(/([A-Z])0+(\d)/g, '$1$2');
  function claveDuplicado(escuela, dia, categoria, motivo, detalle) {
    const det = norm(detalle || '').replace(/\s+/g, ' ');
    if (!det || !dia || !compactoEsc(escuela)) return '';
    // Cupos y dietas especiales se repiten a propósito (una fila por chico o por cambio): no son duplicados.
    // Tampoco los destinatarios generales ("TODAS LAS ESCUELAS"…) ni el nombre genérico "ESCUELA".
    if (mayus(categoria) === 'CUPOS' || /ESPECIAL/.test(mayus(motivo))) return '';
    if (/^(TODAS LAS|TODOS LOS|MEDIDA DE ABRIGO)\b|^ESCUELA$/.test(mayus(escuela))) return '';
    return [compactoEsc(escuela), dia, mayus(categoria), mayus(motivo), det].join('|');
  }
  function claveDuplicadoDe(r) {
    return claveDuplicado(r.v[C.ESCUELA], r.fecha ? isoDe(r.fecha) : String(r.v[C.FECHA] || '').trim(), r.est.categoria, r.est.motivo, r.v[C.DETALLE]);
  }
  function mapaDuplicados() {
    if (estado.dupCache && estado.dupCache.version === estado.versionDatos) return estado.dupCache.mapa;
    const primero = new Map(), mapa = new Map();
    [...estado.reclamos].sort((a, b) => a.fila - b.fila).forEach(r => {
      const k = claveDuplicadoDe(r);
      if (!k) return;
      if (primero.has(k)) mapa.set(r.fila, primero.get(k)); else primero.set(k, r.fila);
    });
    estado.dupCache = { version: estado.versionDatos, mapa };
    return mapa;
  }
  const filaOriginalDe = (r) => mapaDuplicados().get(r.fila) || 0;
  function problemasDato(r) {
    const e = r.est, out = [];
    if (r.fecha && r.fecha.getFullYear() > ANIO_CIERRE_RESUELTOS && !String(r.v[C.ESTADO] || '').trim()) out.push('estado');
    if (!fechaValida(r.fecha)) out.push('fecha');
    if (!e.escuela || !e.escuelaConocida) out.push('escuela');
    if (!e.proveedor) out.push('proveedor');
    if (!e.categoria || !e.motivo) out.push('clasificacion');
    if (!e.servicio) out.push('servicio');
    if (filaOriginalDe(r)) out.push('duplicado');
    return out;
  }
  /* ---------- Reclasificar: reclamos con una clasificación mejor disponible ----------
   * Desde 2023. Los que están en "Otros" (de cualquier categoría), las cancelaciones que en
   * realidad son paros o calendario, y "Otros › Personal" que es del chofer (→ Alimentos › Reparto).
   * "Segura": misma categoría, o va a un motivo nuevo bien marcado (paro, calendario, entrega
   * equivocada, reparto, bolsón, viandas). El resto queda "para revisar" (lo decide una persona). */
  const ANIO_DESDE_RECLASIF = 2023;
  const MOTIVOS_SEGUROS = ['PARO', 'CALENDARIO', 'ENTREGA EQUIVOCADA', 'REPARTO', 'BOLSON', 'VIANDAS'];
  const CLAVE_DESCARTADAS = 'sae-reclasif-descartadas';
  function descartadas() {
    if (!estado._descartadas) { try { estado._descartadas = new Set(JSON.parse(leerLS(CLAVE_DESCARTADAS) || '[]')); } catch (e) { estado._descartadas = new Set(); } }
    return estado._descartadas;
  }
  function tipoDeCategoria(cat) { return ((CLASIFICACION.categorias.find(c => c.valor === cat) || {}).tipo) || 'diaria'; }
  function propuestaReclasif(r) {
    if (r._prop !== undefined) return r._prop;
    r._prop = null;
    if (!r.fecha || r.fecha.getFullYear() < ANIO_DESDE_RECLASIF || !r.sugerir || descartadas().has(r.fila)) return null;
    const cat = r.est.categoria, mot = r.est.motivo;
    const enOtros = mot === 'OTROS' || cat === 'OTROS' || !mot;
    const s = r.sugerir();
    if (!s || !s.categoria || !s.motivo || (s.categoria === cat && s.motivo === mot)) return null;
    if (s.motivo === 'OTROS' && s.categoria === cat) return null;
    const desdeCancel = mot === 'CANCELACION' && (s.motivo === 'PARO' || s.motivo === 'CALENDARIO');
    const desdePersonal = cat === 'OTROS' && mot === 'PERSONAL' && s.motivo === 'REPARTO';
    if (!enOtros && !desdeCancel && !desdePersonal) return null;
    // "Otros" de mantenimiento o equipamiento: solo dentro de la misma categoría
    if ((cat === 'MANTENIMIENTO' || cat === 'EQUIPAMIENTO') && s.categoria !== cat) return null;
    // Segura: va a un motivo nuevo bien marcado, o se queda en la misma categoría hacia un motivo
    // con reglas firmes. Faltante, calidad, menú o "especiales" a secas los decide una persona.
    const FIRMES = ['CANCELACION', 'LOGISTICA', 'ESPECIALES - ALTA', 'ESPECIALES - BAJA'];
    const segura = MOTIVOS_SEGUROS.includes(s.motivo) ||
      (s.categoria === cat && (FIRMES.includes(s.motivo) || cat === 'MANTENIMIENTO' || cat === 'EQUIPAMIENTO'));
    r._prop = { categoria: s.categoria, motivo: s.motivo, tipo: tipoDeCategoria(s.categoria), segura, razon: (s.razones || [])[0] || '' };
    return r._prop;
  }
  const etqClas = (cat, mot) => `${etqCategoria(cat)} › ${etqMotivo(mot, cat)}`;

  /** Aplica las reclasificaciones: se ven al instante y se guardan en la hoja en segundo plano (script v14). */
  function aplicarReclasif(lista) {
    const versionScript = estado.versionScript || Number(leerLS('sae-script-version')) || 0;
    if (versionScript && versionScript < 14) {
      toast('⚠️ Para reclasificar hay que actualizar el script de Google a la versión 14 (pegar el Codigo.gs nuevo y publicar una Nueva versión).', 'error');
      return;
    }
    const anteriores = [], items = [];
    lista.forEach(r => {
      const p = propuestaReclasif(r);
      if (!p) return;
      const v = r.v.slice();
      v[C.CATEGORIA] = p.categoria; v[C.SUBCATEGORIA] = p.motivo; v[C.TIPO] = p.tipo;
      const nuevo = prepararReclamo({ fila: r.fila, v });
      const anterior = reemplazarReclamo(r, nuevo);
      anteriores.push(anterior);
      items.push({ tipo: 'reclasificar', antes: tomarAntes(r.v, 'reclasificar'),
        datos: { escuela: r.v[C.ESCUELA], detalle: r.v[C.DETALLE] },
        pedido: { fila: r.fila, huella: huellaDe(r.v),
          cambios: { tipo: p.tipo, categoria: p.categoria, subcategoria: p.motivo } } });
    });
    if (!anteriores.length) return;
    COLA.encolar(items);
    registrarDeshacer(anteriores, `${nf(anteriores.length)} reclasificado${anteriores.length === 1 ? '' : 's'}`);
    aplicarFiltros();
    actualizarBadge();
    toast(`✔️ ${nf(anteriores.length)} reclamo${anteriores.length === 1 ? ' reclasificado' : 's reclasificados'}. Se guardan en la hoja en segundo plano (podés ir a otras secciones).`, 'ok');
    pintarCola();
  }
  function descartarReclasif(r) {
    descartadas().add(r.fila);
    guardarLS(CLAVE_DESCARTADAS, JSON.stringify([...descartadas()]));
    r._prop = null;
    aplicarFiltros();
  }

  /* ---------- (2.1.0) Clasificar a mano: cualquier categoría y motivo ---------- */
  /** Llena los desplegables de categoría y motivo (el motivo depende de la categoría). */
  function llenarClasif(selCat, selMot, cat, mot) {
    const cats = CLASIFICACION.categorias.map(c => ({ valor: c.valor, etiqueta: c.etiqueta }));
    if (cat && !cats.some(c => c.valor === cat)) cats.push({ valor: cat, etiqueta: etqCategoria(cat) + ' (de la hoja)' });
    selCat.innerHTML = '<option value="">Elegí la categoría…</option>' + cats.map(c => `<option value="${esc(c.valor)}">${esc(c.etiqueta)}</option>`).join('');
    selCat.value = cat || '';
    const pintarMot = (m) => {
      const c = selCat.value;
      const mots = (CLASIFICACION.motivos[c] || []).map(x => ({ valor: x.valor, etiqueta: etqMotivo(x.valor, c) }));
      if (m && c && !mots.some(x => x.valor === m)) mots.push({ valor: m, etiqueta: etqMotivo(m, c) + ' (de la hoja)' });
      selMot.innerHTML = `<option value="">${c ? 'Elegí el motivo…' : '—'}</option>` + mots.map(x => `<option value="${esc(x.valor)}">${esc(x.etiqueta)}</option>`).join('') +
        (c ? '<option value="__otro__">✏️ Otro (escribir)…</option>' : '');
      selMot.value = m && mots.some(x => x.valor === m) ? m : '';
      selMot.disabled = !c;
    };
    pintarMot(mot);
    selCat.onchange = () => { const v = selMot.nextElementSibling; if (v && v.classList.contains('rec-libre')) v.remove(); pintarMot(''); };
    // (2.8.0) "Otro (escribir)…": se escribe el motivo; con la tilde se suma como opción para todos
    let previo = selMot.value;
    selMot.onchange = () => {
      if (selMot.value !== '__otro__') { previo = selMot.value; return; }
      selMot.value = previo;
      const sig = selMot.nextElementSibling;
      if (sig && sig.classList.contains('rec-libre')) return;
      cajaMotivoLibre(selMot, selCat.value, (v) => {
        pintarMot(v);
        if (!selMot.value) {   // escrito solo para este reclamo
          const op = document.createElement('option');
          op.value = v; op.textContent = capitalizar(v) + ' ✏️';
          selMot.insertBefore(op, selMot.querySelector('option[value="__otro__"]'));
          selMot.value = v;
        }
        previo = selMot.value;
        selMot.dispatchEvent(new Event('change'));
      });
    };
  }
  /** Reclasifica a mano un reclamo (se ve al instante, se guarda en segundo plano, se puede deshacer).
   *  Devuelve el reclamo como estaba antes (para Deshacer) o null si no cambió nada. */
  function reclasificarManual(r, cat, mot, conDeshacer) {
    const versionScript = estado.versionScript || Number(leerLS('sae-script-version')) || 0;
    if (versionScript && versionScript < 14) { toast('⚠️ Para reclasificar hay que actualizar el script de Google.', 'error'); return null; }
    const tipo = tipoDeCategoria(cat);
    if (mayus(r.v[C.CATEGORIA]) === cat && mayus(r.v[C.SUBCATEGORIA]) === mot && String(r.v[C.TIPO] || '').trim() === tipo) return null;
    const v = r.v.slice();
    v[C.CATEGORIA] = cat; v[C.SUBCATEGORIA] = mot; v[C.TIPO] = tipo;
    const nuevo = prepararReclamo({ fila: r.fila, v });
    const anterior = reemplazarReclamo(r, nuevo);
    COLA.encolar([{ tipo: 'reclasificar', antes: tomarAntes(r.v, 'reclasificar'),
      datos: { escuela: r.v[C.ESCUELA], detalle: r.v[C.DETALLE] },
      pedido: { fila: r.fila, huella: huellaDe(r.v), cambios: { tipo, categoria: cat, subcategoria: mot } } }]);
    // Lo eligió una persona: el panel de sugerencias no lo vuelve a proponer
    descartadas().add(r.fila);
    guardarLS(CLAVE_DESCARTADAS, JSON.stringify([...descartadas()]));
    if (conDeshacer) registrarDeshacer([anterior], `${r.v[C.ESCUELA]} → ${etqClas(cat, mot)}`);
    return anterior;
  }
  /** Editor chico dentro de un reclamo del panel "Mejor clasificación". */
  /* (2.3.1) La lista se vuelve a dibujar sola cada vez que la hoja confirma un guardado: el editor
   * se recuerda (estado.editorClasif) y se vuelve a abrir con lo elegido. Si justo se está usando
   * (foco adentro), la lista espera a que se termine para redibujarse. */
  function editorEnUso() {
    const a = document.activeElement;
    return !!(a && a.closest && ((estado.editorClasif && a.closest('.rec-clas-editor')) || (estado.editorCompletar && a.closest('.rec-completar'))));
  }
  function cerrarEditorClasif(ed) {
    estado.editorClasif = null;
    if (ed) ed.remove();
    if (estado.pintarPendiente) { estado.pintarPendiente = false; aplicarFiltros(); }
  }
  function abrirEditorClasif(item, r, restaurar) {
    if (!item) return;
    const previo = item.querySelector('.rec-clas-editor');
    if (previo && !restaurar) { cerrarEditorClasif(previo); return; }
    if (previo) return;
    const p = propuestaReclasif(r);
    const guardado = restaurar && estado.editorClasif && estado.editorClasif.fila === r.fila ? estado.editorClasif : null;
    const ed = document.createElement('div');
    ed.className = 'rec-clas-editor';
    ed.innerHTML = `<select class="rec-clas-cat" aria-label="Categoría"></select><select class="rec-clas-mot" aria-label="Motivo"></select>` +
      `<button type="button" class="rec-reclas-btn" data-ed="guardar">Guardar</button><button type="button" class="rec-reclas-btn secundario" data-ed="cancelar">Cancelar</button>`;
    item.querySelector('.rec-item-tags').after(ed);
    const selCat = ed.querySelector('.rec-clas-cat'), selMot = ed.querySelector('.rec-clas-mot');
    // Arranca con lo que ya se había elegido, o con la sugerencia (si hay), o con lo que tiene ahora
    llenarClasif(selCat, selMot,
      guardado ? guardado.cat : (p ? p.categoria : r.est.categoria),
      guardado ? guardado.mot : (p ? p.motivo : r.est.motivo));
    const recordar = () => { estado.editorClasif = { fila: r.fila, cat: selCat.value, mot: selMot.value }; };
    recordar();
    selCat.addEventListener('change', recordar);
    selMot.addEventListener('change', recordar);
    ed.addEventListener('click', (ev) => ev.stopPropagation());
    ed.addEventListener('keydown', (ev) => ev.stopPropagation());
    // Al salir del editor, si la lista quedó esperando, se dibuja (el editor se vuelve a abrir solo)
    ed.addEventListener('focusout', () => setTimeout(() => {
      if (!editorEnUso() && estado.pintarPendiente) { estado.pintarPendiente = false; aplicarFiltros(); }
    }, 150));
    ed.querySelector('[data-ed="cancelar"]').addEventListener('click', () => cerrarEditorClasif(ed));
    ed.querySelector('[data-ed="guardar"]').addEventListener('click', () => {
      const cat = selCat.value, mot = selMot.value;
      if (!cat || !mot) { toast('Elegí la categoría y el motivo.', 'error'); return; }
      const actual = estado.reclamos.find(x => x.fila === r.fila) || r;
      const ant = reclasificarManual(actual, cat, mot, true);
      estado.editorClasif = null;
      estado.pintarPendiente = false;
      if (!ant) { toast('Ya tenía esa clasificación.', 'ok'); ed.remove(); return; }
      aplicarFiltros(); actualizarBadge(); pintarCola();
      toast(`✔️ ${r.v[C.ESCUELA]} → ${etqClas(cat, mot)}. Se guarda en la hoja en segundo plano.`, 'ok');
    });
    if (!restaurar) selCat.focus();
  }

  /* ---------- (2.9.0) Revisar datos: completar lo que falta sin abrir el reclamo ----------
   * En cada reclamo con estado, servicio, proveedor o clasificación vacíos aparece "✏️ Completar acá":
   * se abren solo esos desplegables. Se ve al instante, se guarda en segundo plano y se puede deshacer.
   * El proveedor se propone solo según la escuela y el servicio. */
  function camposACompletar(r) {
    const p = problemasDato(r);
    return ['estado', 'servicio', 'proveedor', 'clasificacion'].filter(t => p.includes(t));
  }
  function escuelaDeReclamo(r) {
    const base = escuelaBase(r.est.escuela);
    return ESCUELAS.find(e => mayus(e.nombre) === base) || null;
  }
  function abrirCompletar(item, r, restaurar) {
    if (!item) return;
    const previo = item.querySelector('.rec-completar');
    if (previo && !restaurar) { cerrarCompletar(previo); return; }
    if (previo) return;
    const faltan = camposACompletar(r);
    if (!faltan.length) return;
    const g = restaurar && estado.editorCompletar && estado.editorCompletar.fila === r.fila ? estado.editorCompletar : {};
    const ed = document.createElement('div');
    ed.className = 'rec-clas-editor rec-completar';
    const opc = (lista, txt) => `<option value="">${txt}</option>` + lista.map(x => `<option value="${esc(x)}">${esc(capitalizar(x))}</option>`).join('');
    ed.innerHTML =
      (faltan.includes('estado') ? `<select data-c="estado" aria-label="Estado">${opc(CLASIFICACION.estados, 'Estado…')}</select>` : '') +
      (faltan.includes('servicio') ? `<select data-c="servicio" aria-label="Servicio">${opc(CLASIFICACION.servicios, 'Servicio…')}</select>` : '') +
      (faltan.includes('proveedor') ? `<select data-c="proveedor" aria-label="Proveedor">${`<option value="">Proveedor…</option>` + proveedoresConocidos().map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select>` : '') +
      (faltan.includes('clasificacion') ? '<select class="rec-clas-cat" aria-label="Categoría"></select><select class="rec-clas-mot" aria-label="Motivo"></select>' : '') +
      '<button type="button" class="rec-reclas-btn" data-ed="guardar">Guardar</button><button type="button" class="rec-reclas-btn secundario" data-ed="cancelar">Cancelar</button>';
    item.querySelector('.rec-item-tags').after(ed);
    const sel = (c) => ed.querySelector(`[data-c="${c}"]`);
    const selCat = ed.querySelector('.rec-clas-cat'), selMot = ed.querySelector('.rec-clas-mot');
    if (selCat) llenarClasif(selCat, selMot, g.cat || r.est.categoria, g.mot || r.est.motivo);
    // Valores de arranque: lo ya elegido, o lo que tiene la fila
    if (sel('estado')) sel('estado').value = g.estado || '';
    if (sel('servicio')) sel('servicio').value = g.servicio || '';
    const servActual = () => (sel('servicio') ? sel('servicio').value : r.est.servicio) || '';
    const proponerProv = () => {
      const sp = sel('proveedor');
      if (!sp || sp.dataset.tocado) return;
      const e = escuelaDeReclamo(r);
      const prov = e && servActual() ? proveedorDeServicio(e, mayus(servActual()) === 'COMEDOR' ? 'COMEDOR' : 'DM') : '';
      if (prov && ![...sp.options].some(o => o.value === prov)) sp.add(new Option(prov, prov));
      sp.value = prov || '';
    };
    if (sel('proveedor')) {
      if (g.proveedor) { sel('proveedor').value = g.proveedor; sel('proveedor').dataset.tocado = '1'; } else proponerProv();
      sel('proveedor').addEventListener('change', () => { sel('proveedor').dataset.tocado = '1'; });
    }
    if (sel('servicio')) sel('servicio').addEventListener('change', proponerProv);
    const recordar = () => {
      estado.editorCompletar = { fila: r.fila,
        estado: sel('estado') ? sel('estado').value : '', servicio: sel('servicio') ? sel('servicio').value : '',
        proveedor: sel('proveedor') && sel('proveedor').dataset.tocado ? sel('proveedor').value : '',
        cat: selCat ? selCat.value : '', mot: selMot ? selMot.value : '' };
    };
    recordar();
    ed.addEventListener('change', recordar);
    ed.addEventListener('click', (ev) => ev.stopPropagation());
    ed.addEventListener('keydown', (ev) => ev.stopPropagation());
    ed.addEventListener('focusout', () => setTimeout(() => {
      if (!editorEnUso() && estado.pintarPendiente) { estado.pintarPendiente = false; aplicarFiltros(); }
    }, 150));
    ed.querySelector('[data-ed="cancelar"]').addEventListener('click', () => cerrarCompletar(ed));
    ed.querySelector('[data-ed="guardar"]').addEventListener('click', () => {
      const cambios = {};
      if (sel('estado') && sel('estado').value) cambios.estado = sel('estado').value;
      if (sel('servicio') && sel('servicio').value) cambios.servicio = sel('servicio').value;
      if (sel('proveedor') && sel('proveedor').value) cambios.proveedor = sel('proveedor').value;
      const cat = selCat ? selCat.value : '', mot = selMot ? selMot.value : '';
      if (selCat && (cat || mot) && !(cat && mot)) { toast('Elegí la categoría y el motivo (o dejá los dos vacíos).', 'error'); return; }
      if (!Object.keys(cambios).length && !cat) { toast('Elegí al menos un dato para completar.', 'error'); return; }
      let actual = estado.reclamos.find(x => x.fila === r.fila) || r;
      let original = null;
      if (Object.keys(cambios).length) {
        const v = actual.v.slice();
        if (cambios.estado) { v[C.ESTADO] = cambios.estado; v[C.FECHA_RES] = cambios.estado === 'Resuelto' ? (v[C.FECHA_RES] || fechaCorta(new Date())) : ''; }
        if (cambios.servicio) v[C.SERVICIO] = cambios.servicio;
        if (cambios.proveedor) v[C.PROVEEDOR] = cambios.proveedor;
        original = reemplazarReclamo(actual, prepararReclamo({ fila: r.fila, v }));
        encolarActualizacion({ tipo: 'actualizar', antes: tomarAntes(actual.v, 'actualizar'),
          datos: { escuela: actual.v[C.ESCUELA], detalle: actual.v[C.DETALLE] },
          pedido: { accion: 'actualizar', fila: r.fila, huella: huellaDe(actual.v), cambios } });
        actual = estado.reclamos.find(x => x.fila === r.fila) || actual;
      }
      if (cat && mot) {
        const ant = reclasificarManual(actual, cat, mot, false);
        if (!original) original = ant;
      }
      estado.editorCompletar = null;
      estado.pintarPendiente = false;
      if (!original) { toast('No había nada para cambiar.', 'ok'); ed.remove(); return; }
      registrarDeshacer([original], `${r.v[C.ESCUELA]}: datos completados`);
      aplicarFiltros(); actualizarBadge(); pintarCola();
      toast(`✔️ ${r.v[C.ESCUELA]}: datos completados. Se guarda en la hoja en segundo plano.`, 'ok');
    });
    if (!restaurar) { const primero = ed.querySelector('select'); if (primero) primero.focus(); }
  }
  function cerrarCompletar(ed) {
    estado.editorCompletar = null;
    if (ed) ed.remove();
    if (estado.pintarPendiente) { estado.pintarPendiente = false; aplicarFiltros(); }
  }

  /* ---------- (2.2.0) "Sin estado": dar por resueltos los de alimentos y los viejos ----------
   * 'resolver' = alimentos (cualquier fecha) o de otra categoría con más de 3 meses;
   * 'resto' = lo demás (de los últimos 3 meses o sin fecha válida): esos los revisa una persona. */
  function limiteSinEstado() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - 3); return d; }
  function grupoSinEstado(r) {
    if (r.est.categoria === 'ALIMENTOS') return 'resolver';
    const f = r.fecha && !isNaN(r.fecha) ? r.fecha : null;
    return f && f < limiteSinEstado() ? 'resolver' : 'resto';
  }
  /** Marca como "Resuelto" sin poner fecha de resolución (no se sabe cuándo se resolvió). Se puede deshacer. */
  function resolverSinEstado(lista) {
    const anteriores = [];
    lista.forEach(r => {
      const v = r.v.slice();
      v[C.ESTADO] = 'Resuelto';
      const nuevo = prepararReclamo({ fila: r.fila, v });
      anteriores.push(reemplazarReclamo(r, nuevo));
      encolarActualizacion({ tipo: 'actualizar', antes: tomarAntes(r.v, 'actualizar'),
        datos: { escuela: r.v[C.ESCUELA], detalle: r.v[C.DETALLE] },
        pedido: { accion: 'actualizar', fila: r.fila, huella: huellaDe(r.v), cambios: { estado: 'Resuelto', fechaResolucion: '' } } });
    });
    if (!anteriores.length) return;
    registrarDeshacer(anteriores, `${nf(anteriores.length)} sin estado → Resuelto`);
    estado.sinEstVista = 'resto';
    aplicarFiltros();
    actualizarBadge();
    toast(`✔️ ${nf(anteriores.length)} reclamos marcados como Resueltos. Se guardan en la hoja en segundo plano (podés ir a otras secciones).`, 'ok');
    pintarCola();
  }

  function pintarRevision() {
    const caja = $('panelRevision');
    if (!caja) return;
    if (estado.filtroRapido !== 'revisar') { caja.style.display = 'none'; caja.innerHTML = ''; return; }
    const cuenta = {};
    let total = 0;
    estado.reclamos.forEach(r => { const p = problemasDato(r); if (p.length) total++; p.forEach(t => { cuenta[t] = (cuenta[t] || 0) + 1; }); });
    const tipo = estado.tipoRevision || '';
    const actual = TIPOS_REVISION.find(t => t.id === tipo);
    // Reclasificaciones disponibles (aparte: no son datos mal cargados)
    const props = estado.reclamos.filter(r => propuestaReclasif(r));
    const seguras = props.filter(r => propuestaReclasif(r).segura);
    let extra = '';
    if (tipo === 'reclasificar') {
      const vista = estado.reclasVista || '';
      const resumenSeg = {};
      seguras.forEach(r => { const p = propuestaReclasif(r); const k = `${etqClas(r.est.categoria, r.est.motivo)} → ${etqClas(p.categoria, p.motivo)}`; resumenSeg[k] = (resumenSeg[k] || 0) + 1; });
      extra = `<div class="rec-reclas-panel">
          <p><strong>${nf(props.length)}</strong> reclamo${props.length === 1 ? '' : 's'} desde ${ANIO_DESDE_RECLASIF} con una clasificación mejor:
            <strong>${nf(seguras.length)} seguras</strong> y <strong>${nf(props.length - seguras.length)} para revisar</strong>.</p>
          ${seguras.length ? `<button type="button" class="btn btn-primary btn-sm" id="btnAplicarSeguras">✨ Aplicar las ${nf(seguras.length)} seguras</button>` : ''}
          <div class="rec-rev-tipos rec-reclas-vistas">
            <button type="button" class="rec-chip${!vista ? ' activo' : ''}" data-vista="">Todas (${nf(props.length)})</button>
            <button type="button" class="rec-chip${vista === 'seguras' ? ' activo' : ''}" data-vista="seguras">Seguras (${nf(seguras.length)})</button>
            <button type="button" class="rec-chip${vista === 'revisar' ? ' activo' : ''}" data-vista="revisar">Para revisar (${nf(props.length - seguras.length)})</button>
          </div>
          ${(estado.todosLosAnios || estado.desde <= ANIO_DESDE_RECLASIF) ? '' : `<p class="rec-rev-ayuda">Ahora se ven las de ${estado.desde} en adelante. <button type="button" class="rec-link" id="btnReclasTodos">Cargar también ${ANIO_DESDE_RECLASIF}–${estado.desde - 1}</button></p>`}
          <p class="rec-rev-ayuda">Cada reclamo muestra la clasificación propuesta, con botones para aplicarla o descartarla. Todo se puede deshacer.</p>
        </div>`;
      estado._resumenSeguras = resumenSeg;
    }
    // (2.9.0) Reclamos de "Fuera de horario" sin hora, con la hora escrita en el texto
    const propHora = estado._propHora || new Map();
    const nHoras = propHora.size;
    if (tipo === 'hora') {
      extra = `<div class="rec-reclas-panel">
          <p><strong>${nf(nHoras)}</strong> reclamo${nHoras === 1 ? '' : 's'} de entregas fuera de horario sin la hora cargada, que la dicen en el texto
            (ej.: “llegó a las 11:40”). Revisá cada uno: la hora propuesta figura al lado.</p>
          ${nHoras ? `<button type="button" class="btn btn-primary btn-sm" id="btnAplicarHoras">⏰ Aplicar las ${nf(nHoras)} horas</button>` : ''}
          <p class="rec-rev-ayuda">Si la hora que encontró no es la de llegada, tocá “Descartar” o “✏️ Otra hora”. Los que no dicen la hora no aparecen acá: se completan abriendo el reclamo. Todo se puede deshacer.</p>
        </div>`;
    }
    if (tipo === 'estado') {
      const sinEst = estado.reclamos.filter(r => problemasDato(r).includes('estado'));
      const resolver = sinEst.filter(r => grupoSinEstado(r) === 'resolver');
      const nAlim = resolver.filter(r => r.est.categoria === 'ALIMENTOS').length;
      const nResto = sinEst.length - resolver.length;
      const vista = estado.sinEstVista || '';
      extra = `<div class="rec-reclas-panel">
          <p><strong>${nf(sinEst.length)}</strong> reclamos sin estado: <strong>${nf(nAlim)}</strong> de alimentos y <strong>${nf(resolver.length - nAlim)}</strong> de otros temas de antes del ${fechaCorta(limiteSinEstado())} (más de 3 meses) se pueden dar por resueltos.
            Quedan <strong>${nf(nResto)}</strong> para revisar a mano (otros temas de los últimos 3 meses o sin fecha).</p>
          ${resolver.length ? `<button type="button" class="btn btn-primary btn-sm" id="btnResolverSinEstado">✅ Marcar ${nf(resolver.length)} como Resueltos</button>` : ''}
          <div class="rec-rev-tipos rec-reclas-vistas">
            <button type="button" class="rec-chip${!vista ? ' activo' : ''}" data-sinest="">Todos (${nf(sinEst.length)})</button>
            <button type="button" class="rec-chip${vista === 'resolver' ? ' activo' : ''}" data-sinest="resolver">Para dar por resueltos (${nf(resolver.length)})</button>
            <button type="button" class="rec-chip${vista === 'resto' ? ' activo' : ''}" data-sinest="resto">Para revisar a mano (${nf(nResto)})</button>
          </div>
          <p class="rec-rev-ayuda">Se marcan como "Resuelto" sin fecha de resolución (no se sabe cuándo se resolvieron). Se puede deshacer. Los de "Para revisar a mano" se abren y se les elige el estado.</p>
        </div>`;
      estado._resolverSinEstado = resolver;
      estado._resolverSinEstadoAlim = nAlim;
    }
    caja.innerHTML = `<div class="rec-rev-cab">🧹 <strong>${nf(total)}</strong> reclamo${total === 1 ? '' : 's'} con datos para revisar
        <small>(de los cargados${estado.todosLosAnios ? '' : ' desde ' + estado.desde})</small></div>
      <div class="rec-rev-tipos">
        <button type="button" class="rec-chip${!tipo ? ' activo' : ''}" data-rev="">Todos (${nf(total)})</button>
        ${TIPOS_REVISION.filter(t => cuenta[t.id]).map(t => `<button type="button" class="rec-chip${tipo === t.id ? ' activo' : ''}" data-rev="${t.id}">${t.txt} (${nf(cuenta[t.id])})</button>`).join('')}
        ${props.length || tipo === 'reclasificar' ? `<button type="button" class="rec-chip rec-chip-reclas${tipo === 'reclasificar' ? ' activo' : ''}" data-rev="reclasificar">✨ Mejor clasificación (${nf(props.length)})</button>` : ''}
        ${nHoras || tipo === 'hora' ? `<button type="button" class="rec-chip rec-chip-reclas${tipo === 'hora' ? ' activo' : ''}" data-rev="hora">⏰ Horas de llegada (${nf(nHoras)})</button>` : ''}
      </div>
      ${tipo === 'reclasificar' || tipo === 'estado' || tipo === 'hora' ? extra : `<p class="rec-rev-ayuda">${actual ? esc(actual.ayuda) : 'Elegí un tipo para ver cómo corregirlo. Cada reclamo muestra en qué fila de la hoja está.'}</p>`}`;
    caja.querySelectorAll('[data-rev]').forEach(b => b.addEventListener('click', () => { estado.tipoRevision = b.dataset.rev; estado.reclasVista = ''; estado.sinEstVista = ''; aplicarFiltros(); }));
    caja.querySelectorAll('[data-sinest]').forEach(b => b.addEventListener('click', () => { estado.sinEstVista = b.dataset.sinest; aplicarFiltros(); }));
    const bRes = caja.querySelector('#btnResolverSinEstado');
    if (bRes) bRes.addEventListener('click', () => {
      const l = estado._resolverSinEstado || [], a = estado._resolverSinEstadoAlim || 0;
      if (!confirm(`Se van a marcar ${nf(l.length)} reclamos como "Resuelto":\n\n• ${nf(a)} de alimentos\n• ${nf(l.length - a)} de otros temas con más de 3 meses\n\nSin fecha de resolución. Se guardan en la hoja y se puede deshacer. ¿Seguir?`)) return;
      resolverSinEstado(l);
    });
    caja.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => { estado.reclasVista = b.dataset.vista; aplicarFiltros(); }));
    const bTodos = caja.querySelector('#btnReclasTodos');
    if (bTodos) bTodos.addEventListener('click', () => cargarTodosLosAnios());
    const bHoras = caja.querySelector('#btnAplicarHoras');
    if (bHoras) bHoras.addEventListener('click', () => {
      const items = [...propHora.entries()].map(([fila, hora]) => ({ r: estado.reclamos.find(x => x.fila === fila), hora })).filter(x => x.r);
      const muestra = items.slice(0, 10).map(x => `• ${x.r.v[C.ESCUELA]} (${fechaCorta(x.r.fecha)}): ${horaVer(x.hora)}`).join('\n');
      if (!confirm(`Se va a cargar la hora de llegada de ${nf(items.length)} reclamos (la que dice el texto):\n\n${muestra}${items.length > 10 ? `\n… y ${nf(items.length - 10)} más` : ''}\n\nSe guarda en la hoja (columna HORA LLEGADA) y se puede deshacer. ¿Seguir?`)) return;
      guardarHoras(items, `${nf(items.length)} horas de llegada cargadas`);
    });
    const bSeg = caja.querySelector('#btnAplicarSeguras');
    if (bSeg) bSeg.addEventListener('click', () => {
      const lineas = Object.entries(estado._resumenSeguras || {}).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `• ${k}: ${nf(n)}`).join('\n');
      if (!confirm(`Se van a reclasificar ${nf(seguras.length)} reclamos:\n\n${lineas}\n\nSe guardan en la hoja y se puede deshacer. ¿Seguir?`)) return;
      aplicarReclasif(seguras);
    });
    caja.style.display = '';
  }

  /* ---------- Orden de la lista (se recuerda en este navegador) ---------- */
  const CLAVE_ORDEN = 'sae-reclamos-orden';
  function ordenActual() {
    const elegido = leerLS(CLAVE_ORDEN);
    if (elegido === 'viejos' || elegido === 'nuevos') return elegido;
    return estado.filtroRapido === 'estancados' ? 'viejos' : 'nuevos';
  }
  function pintarBotonOrden() {
    const b = $('btnOrden');
    if (!b) return;
    const viejos = ordenActual() === 'viejos';
    b.textContent = viejos ? '⇅ Más viejos primero' : '⇅ Más nuevos primero';
    b.title = viejos ? 'Ahora: del más viejo al más nuevo. Tocá para ver los más nuevos primero.'
      : 'Ahora: del más nuevo al más viejo. Tocá para ver los más viejos primero.';
    b.setAttribute('aria-label', b.title);
  }
  function cambiarOrden() {
    guardarLS(CLAVE_ORDEN, ordenActual() === 'viejos' ? 'nuevos' : 'viejos');
    aplicarFiltros();
  }

  function filtroRapido(tipo) {
    const ya = estado.filtroRapido === tipo;
    estado.filtroRapido = ya ? '' : tipo;
    document.querySelectorAll('[data-rapido]').forEach(b => b.classList.toggle('activo', b.dataset.rapido === estado.filtroRapido));
    const hoy = new Date();
    $('bEstado').value = ''; $('bDesde').value = ''; $('bHasta').value = '';
    if (!ya) {
      if (tipo === 'pendientes') $('bEstado').value = 'Pendiente';
      if (tipo === 'revisar') estado.tipoRevision = '';
      if (tipo === 'semana') { const d = new Date(hoy); d.setDate(d.getDate() - 6); $('bDesde').value = isoDe(d); }
      if (tipo === 'mes') $('bDesde').value = isoDe(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      if (tipo === 'anio') $('bDesde').value = isoDe(new Date(hoy.getFullYear(), 0, 1));
    }
    aplicarFiltros();
  }

  function limpiarFiltros() {
    ['bTexto', 'bDesde', 'bHasta', 'bProveedor', 'bServicio', 'bCategoria', 'bMotivo', 'bProblema', 'bProducto', 'bEstado', 'bZona', 'bPatologia']
      .forEach(id => { $(id).value = ''; });
    estado.filtroRapido = '';
    document.querySelectorAll('[data-rapido]').forEach(b => b.classList.remove('activo'));
    aplicarFiltros();
  }

  /* ---------- Exportar a Excel ---------- */
  const ESTILO_ESTADO = { 'Pendiente': 'pendiente', 'En gestión': 'gestion', 'Resuelto': 'resuelto', 'Sin estado': 'sin' };
  const numero = (x) => { const n = parseFloat(String(x == null ? '' : x).replace(',', '.')); return isNaN(n) ? (x || '') : n; };
  function textoFiltros() {
    const f = filtrosActivos(), partes = [];
    const etq = (id) => { const s = $(id); return s.value ? s.options[s.selectedIndex].text : ''; };
    if (estado.filtroRapido === 'estancados') partes.push(`Estancados (sin resolver hace ${diasEstancado()} días o más)`);
    if (f.texto) partes.push(`Búsqueda: “${$('bTexto').value.trim()}”`);
    if (f.desde || f.hasta) partes.push(`Fechas: ${f.desde ? fechaCorta(parsearFecha(f.desde.split('-').reverse().join('/'))) : '…'} al ${f.hasta ? fechaCorta(parsearFecha(f.hasta.split('-').reverse().join('/'))) : 'hoy'}`);
    [['bProveedor', 'Proveedor'], ['bServicio', 'Servicio'], ['bCategoria', 'Categoría'], ['bMotivo', 'Motivo'], ['bProblema', 'Problema'],
      ['bProducto', 'Producto'], ['bEstado', 'Estado'], ['bZona', 'Zona'], ['bPatologia', 'Patología']]
      .forEach(([id, n]) => { const t = etq(id); if (t) partes.push(`${n}: ${t}`); });
    return partes.length ? 'Filtros: ' + partes.join(' · ') : 'Sin filtros';
  }
  function contarPor(lista, fn) {
    const o = {};
    lista.forEach(x => { const k = fn(x) || '(sin dato)'; o[k] = (o[k] || 0) + 1; });
    return Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function exportarCSV() {
    if (!estado.filtrados.length) { toast('No hay reclamos para exportar'); return; }
    if (typeof SAE_EXCEL === 'undefined') { toast('⚠️ Falta el archivo js/excel.js en la página', 'error'); return; }
    const lista = estado.filtrados;
    const sub = [`${nf(lista.length)} reclamo${lista.length === 1 ? '' : 's'} · ${textoFiltros()}`, SAE_EXCEL.generadoEl()];
    const filas = lista.map(r => {
      const e = r.est, v = r.v;
      return [
        r.fecha || v[C.FECHA], v[C.ESCUELA], e.proveedor, capitalizar(e.servicio), e.categoria ? etqCategoria(e.categoria) : '',
        e.motivo ? etqMotivo(e.motivo, e.categoria) : '',
        e.problema ? (ETQ_PROBLEMA[e.problema] || capitalizar(e.problema)) + (e.problemaEstimado ? ' (estimado)' : '') : '',
        capitalizar(e.producto), e.patologia ? capitalizar(e.patologia) + (e.patologiaEstimada ? ' (estimado)' : '') : '',
        v[C.DETALLE], numero(v[C.CUPO_DEF]), numero(v[C.CUPO_TOTAL]),
        { v: e.estado, estilo: ESTILO_ESTADO[e.estado] || 'texto' }, v[C.RESPONSABLE],
        parsearFecha(v[C.FECHA_RES]) || v[C.FECHA_RES], v[C.ACCIONES], ...celdasHora(r), r.fila
      ];
    });
    const resumen = (titulo, fn) => {
      const filasR = contarPor(lista, fn).map(([k, n]) => [k, n, n / lista.length]);
      return { titulo, columnas: [{ t: titulo, ancho: 34 }, { t: 'Reclamos', tipo: 'num' }, { t: '% del total', tipo: 'pct' }],
        filas: filasR, total: ['Total', lista.length, 1] };
    };
    SAE_EXCEL.descargar(`Reclamos_SAE_${hoyISO()}`, [
      { nombre: 'Reclamos', titulo: 'Reclamos SAE', subtitulo: sub,
        columnas: [{ t: 'Fecha', tipo: 'fecha', ancho: 11 }, { t: 'Escuela', ancho: 22 }, { t: 'Proveedor', ancho: 14 }, { t: 'Servicio', ancho: 16 },
          { t: 'Categoría', ancho: 14 }, { t: 'Motivo', ancho: 16 }, { t: 'Problema', ancho: 18 }, { t: 'Producto', ancho: 12 }, { t: 'Patología', ancho: 12 },
          { t: 'Detalle del reclamo', tipo: 'largo', ancho: 55 }, { t: 'Cupo afectado', tipo: 'num' }, { t: 'Cupo total', tipo: 'num' },
          { t: 'Estado', ancho: 11 }, { t: 'Responsable', ancho: 12 }, { t: 'Fecha resolución', tipo: 'fecha', ancho: 11 },
          { t: 'Acciones tomadas', tipo: 'largo', ancho: 36 }, { t: 'Hora de llegada', ancho: 12 }, { t: 'Demora', ancho: 16 }, { t: 'Fila en la hoja', tipo: 'num' }],
        filas,
        notas: ['"(estimado)": el reclamo no tenía Problema o Patología cargado y se dedujo del detalle.',
          `Los reclamos hasta ${ANIO_CIERRE_RESUELTOS} figuran como Resuelto.`] },
      { nombre: 'Totales', titulo: 'Reclamos SAE · Totales', subtitulo: sub, bloques: [
        resumen('Estado', r => r.est.estado),
        resumen('Proveedor', r => r.est.proveedor),
        resumen('Motivo', r => `${r.est.categoria ? etqCategoria(r.est.categoria) : 'Sin categoría'} · ${r.est.motivo ? etqMotivo(r.est.motivo, r.est.categoria) : 'Sin motivo'}`),
        resumen('Escuela', r => r.est.escuelaBase)
      ] }
    ]).then(() => toast('📥 Excel descargado', 'ok')).catch(() => toast('⚠️ No se pudo armar el Excel', 'error'));
  }

  function actualizarBadge() {
    const n = estado.reclamos.filter(r => r.est.estado === 'Pendiente').length;
    const b = $('badgePendientes');
    b.textContent = n;
    b.style.display = n ? '' : 'none';
    b.title = `${n} reclamos pendientes`;
  }

  /* ======================================================================
   * RESUMEN (TABLERO DE GRÁFICOS)
   * Compara reclamos por mes, trimestre o año. Reglas acordadas:
   *  - enero y febrero se comparan con el mismo mes del año anterior;
   *  - marzo se compara con diciembre (fin del ciclo anterior);
   *  - el 1.er trimestre, con el 1.er trimestre del año anterior;
   *  - si el período está en curso, se compara "a la misma altura"
   *    (p. ej. 1 al 13 de octubre contra 1 al 13 de septiembre).
   * ====================================================================== */
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const TRIMESTRES = ['1.er trimestre', '2.º trimestre', '3.er trimestre', '4.º trimestre'];
  const MOTIVOS_ALIM = [
    { valor: 'FALTANTE', etiqueta: 'Faltante' },
    { valor: 'CALIDAD', etiqueta: 'Calidad' },
    { valor: 'FUERA DE HORARIO', etiqueta: 'Fuera de horario' },
    { valor: 'REEMPLAZOS S/A', etiqueta: 'Reemplazo s/aviso' },
    { valor: 'OTROS', etiqueta: 'Otros alimentos' }
  ];
  const SIN_PROV = 'Sin proveedor';
  const DIA_MS = 86400000;
  const nf = (n, d) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d == null ? 0 : d });

  const res = {
    gran: 'mes', periodo: '', comparar: 'auto', periodo2: '',
    proveedor: '', categoria: '', sinFecha: false, unidad: 'n', unidadEsc: 'n',
    // (1.4.0) Los gráficos cuentan solo los reclamos de alimentos (interruptor "Solo alimentos / Todo")
    soloAlimentos: leerLS('sae-res-alcance') !== 'todo',
    otrosAnios: new Set(), historico: null, cargandoHist: false, errorHist: '', hasta: 0
  };

  /* ---------- períodos ---------- */
  function clavePeriodo(gran, anio, idx) { return gran === 'anio' ? `anio:${anio}` : `${gran}:${anio}:${idx}`; }
  function leerPeriodo(k) {
    if (!k) return null;
    const [gran, a, i] = k.split(':');
    return { gran, anio: Number(a), idx: i == null ? 0 : Number(i) };
  }
  function rango(p) {
    if (p.gran === 'mes') return [new Date(p.anio, p.idx, 1), new Date(p.anio, p.idx + 1, 1)];
    if (p.gran === 'trim') return [new Date(p.anio, p.idx * 3, 1), new Date(p.anio, p.idx * 3 + 3, 1)];
    return [new Date(p.anio, 0, 1), new Date(p.anio + 1, 0, 1)];
  }
  function etiquetaPeriodo(p) {
    if (!p) return '';
    if (p.gran === 'mes') return `${MESES[p.idx]} ${p.anio}`;
    if (p.gran === 'trim') return `${TRIMESTRES[p.idx]} ${p.anio}`;
    return String(p.anio);
  }
  function periodoActual(gran) {
    const h = new Date();
    return { gran, anio: h.getFullYear(), idx: gran === 'mes' ? h.getMonth() : gran === 'trim' ? Math.floor(h.getMonth() / 3) : 0 };
  }
  function anteriorDe(p) {
    if (p.gran === 'anio') return { gran: 'anio', anio: p.anio - 1, idx: 0 };
    const n = p.gran === 'mes' ? 12 : 4;
    return p.idx === 0 ? { gran: p.gran, anio: p.anio - 1, idx: n - 1 } : { gran: p.gran, anio: p.anio, idx: p.idx - 1 };
  }
  function comparacionDe(p) {
    if (res.comparar === 'nada') return null;
    if (res.comparar === 'elegir') return leerPeriodo(res.periodo2);
    if (res.comparar === 'anioAnt') return { gran: p.gran, anio: p.anio - 1, idx: p.idx };
    if (res.comparar === 'anterior') return anteriorDe(p);
    // Automático
    if (p.gran === 'mes') {
      if (p.idx === 0 || p.idx === 1) return { gran: 'mes', anio: p.anio - 1, idx: p.idx };   // vacaciones
      if (p.idx === 2) return { gran: 'mes', anio: p.anio - 1, idx: 11 };                      // marzo ↔ diciembre
      return anteriorDe(p);
    }
    if (p.gran === 'trim' && p.idx === 0) return { gran: 'trim', anio: p.anio - 1, idx: 0 };
    return anteriorDe(p);
  }
  /** Rangos efectivos: si el período está en curso, ambos se cortan a la misma cantidad de días. */
  function rangosEfectivos(p, c) {
    const [i, f] = rango(p);
    const manana = new Date(); manana.setHours(0, 0, 0, 0); manana.setDate(manana.getDate() + 1);
    let dias = null, fp = f;
    if (manana < f) { fp = manana; dias = Math.round((manana - i) / DIA_MS); }
    let rc = null;
    if (c) {
      const [ci, cf] = rango(c);
      rc = [ci, dias ? new Date(Math.min(cf.getTime(), new Date(ci.getFullYear(), ci.getMonth(), ci.getDate() + dias).getTime())) : cf];
    }
    return { rp: [i, fp], rc, dias };
  }

  /* ---------- datos: reclamos de la página + años anteriores resumidos ---------- */
  let mapaEsc = null;
  function escuelaBase(nombre) {
    if (!mapaEsc) {
      mapaEsc = new Map();
      ESCUELAS.forEach(e => {
        mapaEsc.set(mayus(e.nombre), mayus(e.nombre));
        (e.alias || []).forEach(a => mapaEsc.set(mayus(a), mayus(e.nombre)));
      });
    }
    const k = mayus(nombre);
    return mapaEsc.get(k) || k;
  }
  function estadoNormal(txt, fecha) {
    if (fecha && fecha.getFullYear() <= ANIO_CIERRE_RESUELTOS) return 'Resuelto';
    const t = String(txt || '').trim().toLowerCase();
    if (!t) return 'Sin estado';
    if (t.startsWith('resuel')) return 'Resuelto';
    if (t.startsWith('pend')) return 'Pendiente';
    if (t.includes('gesti')) return 'En gestión';
    return capitalizar(t);
  }
  /* Fechas posibles: desde 2015 hasta dos meses después de hoy. Las demás
     (p. ej. 30/12/1899 de una celda en 0, o años mal tipeados) cuentan como
     "sin fecha válida". */
  const FECHA_MIN = new Date(2015, 0, 1);
  function fechaValida(f) {
    if (!f || isNaN(f)) return null;
    const max = new Date(); max.setDate(max.getDate() + 60);
    return f >= FECHA_MIN && f <= max ? f : null;
  }
  let memoPuntos = { clave: '', lista: [] };
  function puntos() {
    // Se recalcula solo cuando cambian los datos (no en cada cambio de filtro)
    const clave = `${estado.versionDatos || 0}|${estado.reclamos.length}|${res.historico ? res.historico.length : -1}`;
    if (memoPuntos.clave === clave) return memoPuntos.lista;
    const out = [], vistos = new Set();
    estado.reclamos.forEach(r => {
      vistos.add(r.fila);
      out.push({ f: fechaValida(r.fecha), esc: r.est.escuelaBase, prov: r.est.proveedor || SIN_PROV, cat: r.est.categoria,
        mot: r.est.motivo, prob: r.est.problema, est: r.est.estado,
        fres: r.est.estado === 'Resuelto' ? fechaValida(parsearFecha(r.v[C.FECHA_RES])) : null,
        lleg: esFueraHorario(r.est.motivo) && r.v[C.HORA] ? evaluarReclamo(r) : null });   // (2.9.0)
    });
    (res.historico || []).forEach(h => {
      if (vistos.has(h[0])) return;
      const f = fechaValida(parsearFecha(h[1]));
      out.push({ f, esc: escuelaBase(h[2]), prov: limpiarProveedor(h[3]) || SIN_PROV, cat: mayus(h[5]),
        mot: mayus(h[6]), prob: mayus(h[8]), est: estadoNormal(h[7], f) });
    });
    memoPuntos = { clave, lista: out };
    return out;
  }
  function pasaFiltros(pt) {
    if (res.proveedor && pt.prov !== res.proveedor) return false;
    if (res.soloAlimentos) return pt.cat === 'ALIMENTOS';
    if (res.categoria && pt.cat !== res.categoria) return false;
    return true;
  }
  /** Texto del filtro de categoría para títulos e informes. */
  const textoAlcance = () => res.soloAlimentos ? 'Solo reclamos de alimentos'
    : (res.categoria ? `Categoría: ${etqCategoria(res.categoria)}` : 'Todas las categorías');
  function pintarAlcance() {
    document.querySelectorAll('#rAlcance button').forEach(b => {
      const on = (b.dataset.alc === 'alim') === res.soloAlimentos;
      b.classList.toggle('activo', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const campo = $('rCategoria') && $('rCategoria').closest('.rec-campo');
    if (campo) campo.style.display = res.soloAlimentos ? 'none' : '';
  }
  const enRango = (pt, r) => pt.f && pt.f >= r[0] && pt.f < r[1];

  /* ---------- cupos por proveedor (para "cada 100 / 1.000 cupos") ---------- */
  let cuposMes = null;
  function cuposPorMes() {
    if (cuposMes) return cuposMes;
    cuposMes = Object.assign({}, typeof SAE_CUPOS_HISTORICOS !== 'undefined' ? SAE_CUPOS_HISTORICOS : {});
    // 2026 en adelante: desde los cupos diarios de data.js (CUPOS 2026)
    const porFecha = {};
    (typeof SAE_DATA !== 'undefined' ? SAE_DATA.escuelas : []).forEach(e => (e.servicios || []).forEach(s => {
      const p = limpiarProveedor(s.proveedor);
      Object.entries(s.cupos || {}).forEach(([f, v]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || f < '2026-01-01' || !(Number(v) > 0)) return;
        const o = porFecha[f] || (porFecha[f] = {});
        o[p] = (o[p] || 0) + Number(v);
      });
    }));
    const acum = {};
    Object.entries(porFecha).forEach(([f, provs]) => {
      const m = f.slice(0, 7);
      Object.entries(provs).forEach(([p, v]) => {
        const a = (acum[m] = acum[m] || {})[p] = acum[m][p] || { s: 0, n: 0 };
        a.s += v; a.n++;
      });
    });
    Object.entries(acum).forEach(([m, provs]) => {
      cuposMes[m] = {};
      Object.entries(provs).forEach(([p, a]) => { cuposMes[m][p] = Math.round(a.s / a.n); });
    });
    return cuposMes;
  }
  /** Promedio de cupos diarios del proveedor en los meses del rango (null si no hay datos). */
  function cuposDe(prov, r) {
    const cm = cuposPorMes(), vals = [];
    for (let d = new Date(r[0].getFullYear(), r[0].getMonth(), 1); d < r[1]; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (cm[k] && cm[k][prov]) vals.push(cm[k][prov]);
    }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  /* ---------- carga de años anteriores ---------- */
  async function cargarHistorico() {
    if (res.historico || res.cargandoHist || !estado.cargado) return;
    if (estado.todosLosAnios) { res.historico = []; return; }
    // Copia local de los años anteriores (casi no cambian): vale 12 horas
    const CACHE_HIST = 'sae-reclamos-historico-v1';
    try {
      const c = JSON.parse(leerLS(CACHE_HIST) || 'null');
      if (c && c.hasta === estado.desde && Date.now() - c.guardado < 12 * 3600 * 1000 && Array.isArray(c.filas)) {
        res.historico = c.filas;
        return;
      }
    } catch (e) { /* se vuelve a pedir */ }
    res.cargandoHist = true; res.errorHist = '';
    pintarEstadoCarga();
    try {
      const r = await llamarGet({ accion: 'historico', hasta: estado.desde });
      // Con el script viejo (sin "historico") llega la lista completa: se adapta
      res.historico = (r.filas || []).map(f => Array.isArray(f) ? f
        : [f.fila, f.v[C.FECHA], f.v[C.ESCUELA], f.v[C.PROVEEDOR], f.v[C.SERVICIO], f.v[C.CATEGORIA], f.v[C.SUBCATEGORIA], f.v[C.ESTADO], f.v[C.PROBLEMA] || '']);
      try { localStorage.setItem(CACHE_HIST, JSON.stringify({ hasta: estado.desde, guardado: Date.now(), filas: res.historico })); }
      catch (e) { borrarLS(CACHE_HIST); }
    } catch (err) {
      res.errorHist = mensajeError(err);
    } finally {
      res.cargandoHist = false;
      pintarResumen();
    }
  }
  function pintarEstadoCarga() {
    const el = $('resEstadoCarga');
    if (res.cargandoHist) el.innerHTML = '<span class="rec-spinner" aria-hidden="true"></span> Cargando reclamos de años anteriores para comparar…';
    else if (res.errorHist) el.innerHTML = `⚠️ No se pudieron cargar los años anteriores (${esc(res.errorHist)}). <button type="button" class="rec-link" id="btnReintentarHist">Reintentar</button>`;
    else el.textContent = '';
    const b = $('btnReintentarHist');
    if (b) b.addEventListener('click', () => { res.errorHist = ''; cargarHistorico(); });
  }

  /* ---------- selectores ---------- */
  let firmaPeriodos = '', firmaListas = '';
  function llenarPeriodos(pts) {
    const hoy = new Date();
    // Solo los años en los que hay reclamos (con fecha válida)
    let min = hoy.getFullYear();
    pts.forEach(p => { if (p.f && p.f.getFullYear() < min) min = p.f.getFullYear(); });
    const ops = [];
    for (let a = hoy.getFullYear(); a >= min; a--) {
      if (res.gran === 'anio') ops.push(clavePeriodo('anio', a));
      else {
        const n = res.gran === 'mes' ? 12 : 4;
        const tope = a === hoy.getFullYear() ? (res.gran === 'mes' ? hoy.getMonth() : Math.floor(hoy.getMonth() / 3)) : n - 1;
        for (let i = tope; i >= 0; i--) ops.push(clavePeriodo(res.gran, a, i));
      }
    }
    // Las listas se rearman solo si cambiaron (así no se cierran mientras se elige)
    const firma = ops.join(',');
    const rearmar = firma !== firmaPeriodos;
    firmaPeriodos = firma;
    [['rPeriodo', 'periodo'], ['rPeriodo2', 'periodo2']].forEach(([id, campo]) => {
      const sel = $(id);
      if (rearmar) sel.innerHTML = ops.map(k => `<option value="${k}">${esc(etiquetaPeriodo(leerPeriodo(k)))}</option>`).join('');
      if (!ops.includes(res[campo])) res[campo] = id === 'rPeriodo' ? clavePeriodo(res.gran, periodoActual(res.gran).anio, periodoActual(res.gran).idx) : (ops[1] || ops[0]);
      sel.value = res[campo];
    });
    $('campoComparar2').style.display = res.comparar === 'elegir' ? '' : 'none';
    // Proveedores y categorías presentes
    if (memoPuntos.clave !== firmaListas) {
      firmaListas = memoPuntos.clave;
      const provs = [...new Set(pts.map(p => p.prov))].filter(p => p !== SIN_PROV).sort();
      llenarSelect($('rProveedor'), provs, true, 'Todos');
      const cats = [...new Set(pts.map(p => p.cat).filter(Boolean))].sort();
      llenarSelect($('rCategoria'), cats.map(c => ({ valor: c, etiqueta: etqCategoria(c) })), true, 'Todas');
    }
    $('rProveedor').value = res.proveedor;
    $('rCategoria').value = res.categoria;
    const sinFecha = pts.filter(p => !p.f).length;
    $('rSinFechaN').textContent = `(${nf(sinFecha)})`;
  }

  /* ---------- pintar ---------- */
  function deltaHTML(a, b, etqComp) {
    if (b == null) return '';
    const d = a - b;
    if (!d) return `<span class="res-delta igual">= igual que ${esc(etqComp)}</span>`;
    const pct = b ? ` (${d > 0 ? '+' : ''}${nf(d / b * 100)}%)` : '';
    return `<span class="res-delta ${d > 0 ? 'sube' : 'baja'}">${d > 0 ? '▲' : '▼'} ${nf(Math.abs(d))}${pct} vs. ${esc(etqComp)}</span>`;
  }

  function pintarResumen() {
    pintarEstadoCarga();
    if (!estado.cargado) { $('resTiles').innerHTML = '<p class="rec-res-ayuda">Cargando reclamos…</p>'; return; }
    if (!res.historico && !res.cargandoHist && !res.errorHist) cargarHistorico();

    const todos = puntos();
    llenarPeriodos(todos);
    const p = leerPeriodo(res.periodo);
    const c = comparacionDe(p);
    const { rp, rc, dias } = rangosEfectivos(p, c);
    const pts = todos.filter(pasaFiltros);
    const sinFecha = res.sinFecha ? pts.filter(x => !x.f) : [];
    const actual = pts.filter(x => enRango(x, rp)).concat(sinFecha);
    const comp = rc ? pts.filter(x => enRango(x, rc)) : null;
    const etqP = etiquetaPeriodo(p), etqC = c ? etiquetaPeriodo(c) : '';
    const hoy = new Date();

    // Encabezado del informe
    $('resTitulo').textContent = `Reclamos SAE · ${etqP}`;
    const filtros = [res.proveedor ? `Proveedor: ${res.proveedor}` : 'Todos los proveedores', textoAlcance()];
    pintarAlcance();
    $('resSubtitulo').textContent = [c ? `Comparado con ${etqC}` : 'Sin comparación',
      dias ? `a la misma altura (primeros ${dias} días de cada período)` : '', ...filtros].filter(Boolean).join(' · ');
    $('resImpreso').textContent = `Municipalidad de Tres de Febrero · Generado el ${fechaCorta(hoy)} ${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`;

    // ---------- Números grandes ----------
    const cuenta = (arr, fn) => arr ? arr.filter(fn).length : null;
    const esAlim = x => x.cat === 'ALIMENTOS';
    const sinRes = x => x.est === 'Pendiente' || x.est === 'En gestión';
    const escuelas = (arr) => arr ? new Set(arr.map(x => x.esc).filter(Boolean)).size : null;
    const sinEstado = actual.filter(x => x.est === 'Sin estado').length;
    const resuelto = x => x.est === 'Resuelto';
    const tiles = res.soloAlimentos ? [
      ['Reclamos de alimentos', actual.length, comp ? comp.length : null, sinFecha.length ? `incluye ${nf(sinFecha.length)} sin fecha` : ''],
      ['Escuelas con reclamos', escuelas(actual), escuelas(comp), ''],
      ['Sin resolver', cuenta(actual, sinRes), cuenta(comp, sinRes), sinEstado ? `+ ${nf(sinEstado)} sin estado cargado` : 'Pendientes o en gestión'],
      ['Resueltos', cuenta(actual, resuelto), cuenta(comp, resuelto), actual.length ? `${nf(cuenta(actual, resuelto) / actual.length * 100)}% del período` : '']
    ] : [
      ['Reclamos', actual.length, comp ? comp.length : null, sinFecha.length ? `incluye ${nf(sinFecha.length)} sin fecha` : ''],
      ['De alimentos', cuenta(actual, esAlim), cuenta(comp, esAlim), actual.length ? `${nf(cuenta(actual, esAlim) / actual.length * 100)}% del total` : ''],
      ['Escuelas con reclamos', escuelas(actual), escuelas(comp), ''],
      ['Sin resolver', cuenta(actual, sinRes), cuenta(comp, sinRes), sinEstado ? `+ ${nf(sinEstado)} sin estado cargado` : 'Pendientes o en gestión']
    ];
    $('resTiles').innerHTML = tiles.map(([t, v, vc, sub]) => `<div class="res-tile"><span class="res-tile-t">${t}</span>` +
      `<strong class="res-tile-v">${nf(v)}</strong>${deltaHTML(v, vc, etqC)}${sub ? `<span class="res-tile-s">${esc(sub)}</span>` : ''}</div>`).join('');

    pintarEvolucion(pts, p, c);
    pintarProveedores(actual, comp, rp, rc, etqP, etqC);

    // ---------- Motivos ----------
    const motivoDe = x => `${etqCategoria(x.cat || 'SIN CATEGORÍA')} · ${x.mot ? etqMotivo(x.mot, x.cat) : 'Sin motivo'}`;
    const contar = (arr, fn) => { const o = {}; (arr || []).forEach(x => { const k = fn(x); if (k) o[k] = (o[k] || 0) + 1; }); return o; };
    const mA = contar(actual, motivoDe), mC = contar(comp, motivoDe);
    const topM = Object.entries(mA).sort((a, b) => b[1] - a[1]).slice(0, 8);
    $('resMotivos').innerHTML = SAE_GRAFICOS.barrasH(topM.map(([k, n]) => ({
      etiqueta: k, valor: n, comp: comp ? (mC[k] || 0) : null,
      tip: `${k}\n${etqP}: ${nf(n)}${comp ? `\n${etqC}: ${nf(mC[k] || 0)}` : ''}`
    })));

    // ---------- Estados ----------
    const est = contar(actual, x => x.est);
    $('resEstados').innerHTML = SAE_GRAFICOS.dona([
      { etiqueta: 'Resuelto', valor: est['Resuelto'] || 0, clase: 'est-ok' },
      { etiqueta: 'En gestión', valor: est['En gestión'] || 0, clase: 'est-gestion' },
      { etiqueta: 'Pendiente', valor: est['Pendiente'] || 0, clase: 'est-pend' },
      { etiqueta: 'Sin estado', valor: est['Sin estado'] || 0, clase: 'est-sin' }
    ], { titulo: 'Reclamos por estado' });
    $('resEstadoNota').textContent = sinEstado ? 'Los reclamos con la columna ESTADO vacía en la hoja figuran como "Sin estado".' : '';

    // ---------- Escuelas y problemas ----------
    pintarEscuelas(pts, actual, comp, rp, etqP, etqC);
    const probDe = x => x.prob ? `${ETQ_PROBLEMA[x.prob] || capitalizar(x.prob)}` : '';
    const pA = contar(actual, probDe), pC = contar(comp, probDe);
    $('resProblemas').innerHTML = SAE_GRAFICOS.barrasH(Object.entries(pA).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, n]) => ({ etiqueta: k, valor: n, comp: comp ? (pC[k] || 0) : null,
        tip: `${k}\n${etqP}: ${nf(n)}${comp ? `\n${etqC}: ${nf(pC[k] || 0)}` : ''}` })),
      { vacio: 'Sin problemas específicos clasificados en este período.' });

    pintarFueraHorario(actual, etqP);   // (2.9.0)
    // (1.4.0) Sin "Tiempo de resolución" (se sacó del resumen)
    pintarTabla(actual);
    SAE_GRAFICOS.activarTooltips($('tabResumen'));
  }

  /** Color fijo por año para las líneas agregadas (no cambia si se agregan o quitan otros años). */
  const colorAnio = (a) => 'o' + (((a - 2021) % 5 + 5) % 5 + 1);

  function pintarEvolucion(pts, p, c) {
    const hoy = new Date(), anioHoy = hoy.getFullYear();
    const conFecha = pts.filter(x => x.f);
    const anios = [...new Set(conFecha.map(x => x.f.getFullYear()))].sort();
    const anioComp = c && c.anio !== p.anio ? c.anio : p.anio - 1;
    let leyenda = '';
    if (p.gran === 'anio') {
      $('resEvoTitulo').textContent = 'Reclamos por año';
      const corteHoy = (a) => new Date(a, hoy.getMonth(), hoy.getDate() + 1);
      const items = anios.map(a => {
        const n = conFecha.filter(x => x.f.getFullYear() === a).length;
        const it = { etiqueta: String(a), valor: n, clase: a === p.anio ? 's1' : (c && a === c.anio ? 's2' : 'otro'), tip: `${a}: ${nf(n)} reclamos` };
        if (a === anioHoy) it.nota = `hasta ${fechaCorta(hoy).slice(0, 5)}`;
        if (a === anios[0] && a === 2021) it.nota = 'desde julio';
        if (a === anioHoy - 1 && anios.includes(anioHoy)) {
          const m = conFecha.filter(x => x.f.getFullYear() === a && x.f < corteHoy(a)).length;
          it.marca = m; it.marcaTexto = `${nf(m)} al ${fechaCorta(hoy).slice(0, 5)}`;
          it.tip += `\nHasta el ${fechaCorta(hoy).slice(0, 5)}: ${nf(m)}`;
        }
        return it;
      });
      $('resEvolucion').innerHTML = SAE_GRAFICOS.barrasV(items, { titulo: 'Reclamos por año' });
      $('resEvoNota').textContent = `El año en curso se compara con el anterior a la misma fecha (línea punteada dentro de la barra de ${anioHoy - 1}).`;
    } else {
      const porMes = p.gran === 'mes';
      $('resEvoTitulo').textContent = porMes ? 'Reclamos por mes' : 'Reclamos por trimestre';
      const n = porMes ? 12 : 4;
      const serie = (a) => {
        const v = new Array(n).fill(0);
        conFecha.forEach(x => { if (x.f.getFullYear() === a) v[porMes ? x.f.getMonth() : Math.floor(x.f.getMonth() / 3)]++; });
        if (a === anioHoy) { const actualIdx = porMes ? hoy.getMonth() : Math.floor(hoy.getMonth() / 3); for (let i = actualIdx + 1; i < n; i++) v[i] = null; return { v, parcial: actualIdx }; }
        if (!anios.includes(a)) return { v: v.map(() => null), parcial: null };
        // El primer año con datos empezó a mitad de año (2021: desde julio): antes no hay datos, no "cero"
        if (a === anios[0]) {
          const primero = v.findIndex(n => n > 0);
          for (let i = 0; i < primero; i++) v[i] = null;
        }
        return { v, parcial: null };
      };
      const series = [];
      const s1 = serie(p.anio);
      series.push({ nombre: String(p.anio), valores: s1.v, clase: 's1', parcialDesde: s1.parcial });
      if (anios.includes(anioComp)) {
        const s2 = serie(anioComp);
        series.push({ nombre: String(anioComp), valores: s2.v, clase: 's2', parcialDesde: s2.parcial });
      }
      res.otrosAnios.forEach(a => {
        if (a === p.anio || a === anioComp || !anios.includes(a)) return;
        const so = serie(a);
        series.push({ nombre: String(a), valores: so.v, clase: 'otro', color: colorAnio(a), parcialDesde: so.parcial });
      });
      const x = porMes ? MESES_CORTOS : ['T1', 'T2', 'T3', 'T4'];
      $('resEvolucion').innerHTML = SAE_GRAFICOS.lineas(x, series, {
        titulo: $('resEvoTitulo').textContent,
        sombras: porMes ? [{ desde: 0, hasta: 1, texto: 'Vacaciones' }] : []
      });
      const otros = anios.filter(a => a !== p.anio && a !== anioComp);
      leyenda = `<span class="res-ley s1">${p.anio}</span>` + (anios.includes(anioComp) ? `<span class="res-ley s2">${anioComp}</span>` : '') +
        otros.map(a => `<button type="button" class="res-ley-btn${res.otrosAnios.has(a) ? ' activo ' + colorAnio(a) : ''}" data-anio="${a}" aria-pressed="${res.otrosAnios.has(a)}" title="${res.otrosAnios.has(a) ? 'Quitar' : 'Agregar'} ${a} al gráfico">${a}</button>`).join('');
      $('resEvoNota').textContent = (porMes ? 'Enero y febrero son vacaciones: se comparan con el mismo mes del año anterior, y marzo con diciembre. ' : 'El 1.er trimestre (casi todo vacaciones) se compara con el del año anterior. ') +
        (s1.parcial != null ? 'El último punto de este año está en curso (punto hueco).' : '');
    }
    $('resEvoLeyenda').innerHTML = leyenda;
    $('resEvoLeyenda').querySelectorAll('.res-ley-btn').forEach(b => b.addEventListener('click', () => {
      const a = Number(b.dataset.anio);
      if (res.otrosAnios.has(a)) res.otrosAnios.delete(a); else res.otrosAnios.add(a);
      pintarResumen();
    }));
  }

  function pintarProveedores(actual, comp, rp, rc, etqP, etqC) {
    const cA = {}, cC = {};
    actual.forEach(x => { cA[x.prov] = (cA[x.prov] || 0) + 1; });
    (comp || []).forEach(x => { cC[x.prov] = (cC[x.prov] || 0) + 1; });
    const u = res.unidad;
    document.querySelectorAll('#rUnidad button').forEach(b => b.classList.toggle('activo', b.dataset.unidad === u));
    const provs = Object.keys(cA).filter(k => u === 'n' || k !== SIN_PROV);
    let sinDatos = [];
    const filas = provs.map(k => {
      if (u === 'n') {
        return { etiqueta: k, valor: cA[k], comp: comp ? (cC[k] || 0) : null, dato: k, color: colorProv(k),
          tip: `${k}\n${etqP}: ${nf(cA[k])} reclamos${comp ? `\n${etqC}: ${nf(cC[k] || 0)}` : ''}\nTocá para ver los reclamos` };
      }
      const base = Number(u);
      const cu = cuposDe(k, rp), cuc = rc ? cuposDe(k, rc) : null;
      if (!cu) { sinDatos.push(k); return { etiqueta: k, valor: 0, texto: 's/d', comp: null, dato: k, color: colorProv(k), tip: `${k}: sin datos de cupos para este período` }; }
      const tasa = cA[k] / cu * base, tasaC = cuc ? (cC[k] || 0) / cuc * base : null;
      return { etiqueta: k, valor: tasa, texto: nf(tasa, 2), comp: tasaC, dato: k, color: colorProv(k),
        tip: `${k}\n${etqP}: ${nf(cA[k])} reclamos · ${nf(cu)} cupos diarios promedio\n= ${nf(tasa, 2)} cada ${nf(base)} cupos` +
          (tasaC != null ? `\n${etqC}: ${nf(tasaC, 2)} cada ${nf(base)} cupos` : '') };
    }).sort((a, b) => b.valor - a.valor);
    $('resProveedores').innerHTML = SAE_GRAFICOS.barrasH(filas, { clicable: true });
    $('resProvNota').textContent = u === 'n' ? 'Cantidad de reclamos. Para comparar de forma justa entre proveedores grandes y chicos, usá "c/100" o "c/1.000 cupos".'
      : `Reclamos cada ${nf(Number(u))} cupos diarios del proveedor (promedio del período). Hay datos de cupos de 2023, 2025 y 2026.` +
        (sinDatos.length ? ` Sin datos de cupos: ${sinDatos.join(', ')}.` : '');
  }

  /* ---------- escuelas: ranking (cantidad o c/100 cupos) y reincidentes ---------- */
  let mapaEscObj = null;
  /** Suma de los cupos vigentes de la escuela en esa fecha (CUPOS 2026). null si no hay datos. */
  function cupoEscuela(nombre, fechaISO) {
    if (!mapaEscObj) {
      mapaEscObj = new Map();
      ESCUELAS.forEach(e => mapaEscObj.set(mayus(e.nombre), e));
    }
    const e = mapaEscObj.get(nombre);
    if (!e) return null;
    let total = 0, hay = false;
    (e.servicios || []).forEach(s => {
      if (!s._fechasCupo) s._fechasCupo = Object.keys(s.cupos || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
      const fs = s._fechasCupo;
      let f = null;
      for (let i = fs.length - 1; i >= 0; i--) if (fs[i] <= fechaISO) { f = fs[i]; break; }
      if (!f) return;
      hay = true;
      total += Number(s.cupos[f]) || 0;
    });
    return hay && total > 0 ? total : null;
  }
  const MIN_RECLAMOS_TASA = 3;
  const MESES_REINC = 6, UMBRAL_REINC = 5;   // con 3 o 4 entraban casi la mitad de las escuelas
  /** Últimos 6 meses de clase (sin enero ni febrero) hasta el final del período. */
  function mesesDeClase(hastaExcl) {
    const out = [];
    let d = new Date(hastaExcl.getTime() - DIA_MS);
    d = new Date(d.getFullYear(), d.getMonth(), 1);
    while (out.length < MESES_REINC) {
      if (d.getMonth() > 1) out.push(d);
      d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    }
    return out.reverse();
  }

  function calcularReincidentes(pts, rp) {
    const meses = mesesDeClase(rp[1]);
    const ini = meses[0], fin = rp[1];
    const claveMes = (d) => d.getFullYear() * 12 + d.getMonth();
    const idxMes = new Map(meses.map((m, i) => [claveMes(m), i]));
    const porEsc = {};
    pts.forEach(x => {
      if (!x.f || !x.esc || x.f < ini || x.f >= fin) return;
      const i = idxMes.get(claveMes(x.f));
      if (i == null) return;
      const o = porEsc[x.esc] || (porEsc[x.esc] = { meses: new Array(MESES_REINC).fill(0), total: 0 });
      o.meses[i]++; o.total++;
    });
    const lista = Object.entries(porEsc).map(([k, o]) => ({ esc: k, n: o.meses.filter(Boolean).length, total: o.total, meses: o.meses }))
      .filter(r => r.n >= UMBRAL_REINC).sort((a, b) => b.n - a.n || b.total - a.total || a.esc.localeCompare(b.esc));
    return { meses, ini, fin, lista };
  }

  function pintarEscuelas(pts, actual, comp, rp, etqP, etqC) {
    const contar = (arr) => { const o = {}; (arr || []).forEach(x => { if (x.esc) o[x.esc] = (o[x.esc] || 0) + 1; }); return o; };
    const eA = contar(actual), eC = contar(comp);
    const u = res.unidadEsc;
    document.querySelectorAll('#rUnidadEsc button').forEach(b => b.classList.toggle('activo', b.dataset.unidad === u));
    const hoy = new Date();
    const ref = new Date(Math.min(rp[1].getTime() - DIA_MS, hoy.getTime()));
    const refISO = isoDe(ref);
    let filas, nota;
    if (u === 'n') {
      filas = Object.entries(eA).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10)
        .map(([k, n]) => ({ etiqueta: k, valor: n, comp: comp ? (eC[k] || 0) : null, dato: k,
          tip: `${k}\n${etqP}: ${nf(n)}${comp ? `\n${etqC}: ${nf(eC[k] || 0)}` : ''}\nTocá para ver los reclamos` }));
      nota = 'Una escuela grande suele tener más reclamos solo por tamaño: con "c/100 cupos" se comparan en igualdad.';
    } else {
      let sinCupo = 0;
      filas = Object.entries(eA).filter(([, n]) => n >= MIN_RECLAMOS_TASA).map(([k, n]) => {
        const cu = cupoEscuela(k, refISO);
        if (!cu) { sinCupo++; return null; }
        const t = n / cu * 100, tc = comp ? (eC[k] || 0) / cu * 100 : null;
        return { etiqueta: k, valor: t, texto: nf(t, 1), comp: tc, dato: k,
          tip: `${k}\n${etqP}: ${nf(n)} reclamos · ${nf(cu)} cupos\n= ${nf(t, 1)} cada 100 cupos` +
            (tc != null ? `\n${etqC}: ${nf(tc, 1)} cada 100 cupos` : '') + '\nTocá para ver los reclamos' };
      }).filter(Boolean).sort((a, b) => b.valor - a.valor).slice(0, 10);
      nota = `Reclamos cada 100 cupos de la escuela (todos sus servicios, cupo vigente al ${fechaCorta(ref)}). ` +
        `Solo escuelas con ${MIN_RECLAMOS_TASA} reclamos o más en el período, para que una escuela chica con 1 reclamo no quede primera.` +
        (sinCupo ? ` ${nf(sinCupo)} sin datos de cupos (hay cupos por escuela desde 2026).` : '');
    }
    $('resEscuelas').innerHTML = SAE_GRAFICOS.barrasH(filas, { clicable: true,
      vacio: u === 'n' ? 'Sin reclamos en este período.' : `Ninguna escuela tiene ${MIN_RECLAMOS_TASA} reclamos o más con datos de cupos en este período.` });
    $('resEscNota').textContent = nota;

    // Reincidentes: reclamos en 5 o más de los últimos 6 meses de clase
    const { meses, ini, fin, lista: reinc } = calcularReincidentes(pts, rp);
    const etqMeses = `${MESES_CORTOS[meses[0].getMonth()]} ${meses[0].getFullYear()} a ${MESES_CORTOS[meses[MESES_REINC - 1].getMonth()]} ${meses[MESES_REINC - 1].getFullYear()}`;
    const MAX = 8;
    $('resReincidentes').innerHTML = `<h4 class="res-reinc-t">🔁 Reincidentes <span>reclamos en ${UMBRAL_REINC} o más de los últimos ${MESES_REINC} meses de clase (${esc(etqMeses)})</span></h4>` +
      (reinc.length ? `<ul class="res-reinc-lista">${reinc.slice(0, MAX).map(r => `<li><button type="button" class="res-reinc-item" data-esc="${esc(r.esc)}" title="Ver sus reclamos de ${esc(etqMeses)}">
          <span class="res-reinc-esc">${esc(r.esc)}</span>
          <span class="res-reinc-meses" aria-label="${r.n} de ${MESES_REINC} meses con reclamos">${r.meses.map((n, i) => `<i class="${n ? 'si' : ''}" title="${MESES_CORTOS[meses[i].getMonth()]}: ${n} reclamo${n === 1 ? '' : 's'}"></i>`).join('')}</span>
          <span class="res-reinc-n">${r.n} de ${MESES_REINC} meses · ${nf(r.total)} reclamo${r.total === 1 ? '' : 's'}</span>
        </button></li>`).join('')}</ul>` +
        (reinc.length > MAX ? `<p class="res-nota">Y ${nf(reinc.length - MAX)} escuela${reinc.length - MAX === 1 ? '' : 's'} más.</p>` : '')
      : `<p class="g-vacio">Ninguna escuela tuvo reclamos en ${UMBRAL_REINC} de los últimos ${MESES_REINC} meses de clase. 👍</p>`);
    $('resReincidentes').querySelectorAll('.res-reinc-item').forEach(b => b.addEventListener('click', () =>
      irABuscar({ bTexto: b.dataset.esc }, [ini, fin])));
  }

  /* ---------- tiempo de resolución ----------
   * Días entre la fecha del reclamo y la "Fecha resolución" (se completa sola al
   * marcarlo Resuelto desde la página). Solo cuenta reclamos con las dos fechas. */
  const DIAS_RAPIDO = 7;
  function datosResolucion(arr) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const por = {};
    const nuevo = () => ({ dias: [], abiertos: 0, maxAbierto: 0 });
    (arr || []).forEach(x => {
      if (!x.f) return;
      const o = por[x.prov] || (por[x.prov] = nuevo());
      if (x.est === 'Resuelto' && x.fres) {
        const d = Math.round((x.fres - x.f) / DIA_MS);
        if (d >= 0) o.dias.push(d);
      } else if (x.est === 'Pendiente' || x.est === 'En gestión') {
        o.abiertos++;
        o.maxAbierto = Math.max(o.maxAbierto, Math.round((hoy - x.f) / DIA_MS));
      }
    });
    const resumir = (o) => {
      const d = o.dias.slice().sort((a, b) => a - b), n = d.length;
      return { n, prom: n ? d.reduce((s, v) => s + v, 0) / n : null,
        mediana: n ? (n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2) : null,
        rapidos: n ? d.filter(v => v <= DIAS_RAPIDO).length / n : null, abiertos: o.abiertos, maxAbierto: o.maxAbierto };
    };
    const total = nuevo();
    Object.values(por).forEach(o => { total.dias.push(...o.dias); total.abiertos += o.abiertos; total.maxAbierto = Math.max(total.maxAbierto, o.maxAbierto); });
    const provs = Object.keys(por).map(k => Object.assign({ prov: k }, resumir(por[k])))
      .filter(r => r.n || r.abiertos)
      .sort((a, b) => (a.prov === SIN_PROV) - (b.prov === SIN_PROV) || (b.prom == null) - (a.prom == null) || (b.prom || 0) - (a.prom || 0));
    return { provs, total: resumir(total) };
  }
  function pintarResolucion(actual, comp, etqP, etqC) {
    const A = datosResolucion(actual), B = comp ? datosResolucion(comp) : null;
    const promC = {};
    if (B) B.provs.forEach(r => { promC[r.prov] = r.prom; });
    const dias = (v) => v == null ? '–' : nf(v, 1);
    if (!A.total.n && !A.total.abiertos) {
      $('resResolucion').innerHTML = '<p class="g-vacio">No hay reclamos resueltos con fecha de resolución ni reclamos abiertos en este período.</p>';
    } else {
      const maxP = Math.max(1, ...A.provs.map(r => r.prom || 0));
      const fila = (r, esTotal) => `<tr${esTotal ? ' class="res-resol-total"' : ''}><th scope="row">${esc(esTotal ? 'Total' : r.prov)}</th>
        <td class="num">${r.n ? nf(r.n) : '–'}</td>
        <td class="num fuerte">${dias(r.prom)}</td>
        <td class="rec-res-col-barra">${!esTotal && r.prom != null ? `<span class="rec-res-barra" title="${esc(r.prov)}: ${dias(r.prom)} días en promedio"><span style="width:${Math.round(r.prom / maxP * 100)}%"></span></span>` : ''}</td>
        ${B ? `<td class="num">${dias(esTotal ? B.total.prom : promC[r.prov])}</td>` : ''}
        <td class="num">${dias(r.mediana)}</td>
        <td class="num">${r.rapidos == null ? '–' : nf(r.rapidos * 100) + '%'}</td>
        <td class="num">${r.abiertos ? nf(r.abiertos) : '–'}</td>
        <td class="num">${r.abiertos ? nf(r.maxAbierto) : '–'}</td></tr>`;
      $('resResolucion').innerHTML = `<table class="rec-res-tabla res-resol">
        <thead><tr><th>Proveedor</th><th class="num">Resueltos</th><th class="num">Promedio (días)</th><th class="rec-res-col-barra"></th>
          ${B ? `<th class="num">Promedio ${esc(etqC)}</th>` : ''}<th class="num">Mediana (días)</th>
          <th class="num">En ${DIAS_RAPIDO} días o menos</th><th class="num">Sin resolver</th><th class="num">El más viejo sin resolver (días)</th></tr></thead>
        <tbody>${A.provs.map(r => fila(r)).join('')}</tbody>
        <tfoot>${fila(A.total, true)}</tfoot></table>`;
    }
    $('resResolNota').textContent = 'Días entre la fecha del reclamo y la fecha de resolución. Solo cuentan los reclamos resueltos que tienen "Fecha resolución" ' +
      '(se completa sola al marcarlos Resuelto desde la página), por eso al principio habrá pocos datos. ' +
      'La mediana es el valor del medio: si unos pocos reclamos tardaron muchísimo, la mediana no se deforma como el promedio.';
  }

  function pintarTabla(actual) {
    const porProv = {};
    actual.forEach(x => {
      const o = porProv[x.prov] || (porProv[x.prov] = { total: 0, alim: 0, otros: 0, pend: 0, motivos: {}, esc: new Set() });
      o.total++;
      if (x.esc) o.esc.add(x.esc);
      if (x.est === 'Pendiente' || x.est === 'En gestión') o.pend++;
      if (x.cat === 'ALIMENTOS') {
        o.alim++;
        const m = MOTIVOS_ALIM.some(z => z.valor === x.mot) ? x.mot : 'OTROS';
        o.motivos[m] = (o.motivos[m] || 0) + 1;
      } else o.otros++;
    });
    const provs = Object.keys(porProv).sort((a, b) => (a === SIN_PROV) - (b === SIN_PROV) || porProv[b].total - porProv[a].total);
    if (!provs.length) { $('resTabla').innerHTML = '<p class="g-vacio">No hay reclamos en este período.</p>'; return; }
    const tot = { total: 0, alim: 0, otros: 0, pend: 0, motivos: {} };
    provs.forEach(k => { const o = porProv[k]; ['total', 'alim', 'otros', 'pend'].forEach(c => { tot[c] += o[c]; });
      MOTIVOS_ALIM.forEach(m => { tot.motivos[m.valor] = (tot.motivos[m.valor] || 0) + (o.motivos[m.valor] || 0); }); });
    const celda = (n) => n ? `<td class="num">${nf(n)}</td>` : '<td class="num cero">–</td>';
    $('resTabla').innerHTML = `<table class="rec-res-tabla">
      <thead><tr><th>Proveedor</th>${MOTIVOS_ALIM.map(m => `<th class="num">${m.etiqueta}</th>`).join('')}
        <th class="num">Total alimentos</th><th class="num">Otros temas</th><th class="num">Total</th><th class="num">Sin resolver</th><th class="num">Escuelas</th></tr></thead>
      <tbody>${provs.map(k => { const o = porProv[k]; return `<tr><th scope="row">${esc(k)}</th>${MOTIVOS_ALIM.map(m => celda(o.motivos[m.valor] || 0)).join('')}
        <td class="num fuerte">${nf(o.alim)}</td>${celda(o.otros)}<td class="num fuerte">${nf(o.total)}</td>${celda(o.pend)}<td class="num">${nf(o.esc.size)}</td></tr>`; }).join('')}</tbody>
      <tfoot><tr><th scope="row">Total</th>${MOTIVOS_ALIM.map(m => `<td class="num">${nf(tot.motivos[m.valor] || 0)}</td>`).join('')}
        <td class="num">${nf(tot.alim)}</td><td class="num">${nf(tot.otros)}</td><td class="num">${nf(tot.total)}</td><td class="num">${nf(tot.pend)}</td><td class="num">${nf(new Set(actual.map(x => x.esc)).size)}</td></tr></tfoot>
    </table>`;
  }

  /* ---------- de un gráfico a "Buscar" ---------- */
  async function irABuscar(filtros, rangoForzado) {
    const p = leerPeriodo(res.periodo);
    const rp = rangoForzado || rangosEfectivos(p, null).rp;
    if (rp[0].getFullYear() < estado.desde && !estado.todosLosAnios) {
      toast('⏳ Cargando también los años anteriores…');
      await cargarTodosLosAnios();
    }
    ['bTexto', 'bDesde', 'bHasta', 'bProveedor', 'bServicio', 'bCategoria', 'bMotivo', 'bProblema', 'bProducto', 'bEstado', 'bZona', 'bPatologia']
      .forEach(id => { $(id).value = ''; });
    estado.filtroRapido = '';
    document.querySelectorAll('[data-rapido]').forEach(b => b.classList.remove('activo'));
    $('bDesde').value = isoDe(rp[0]);
    $('bHasta').value = isoDe(new Date(rp[1].getTime() - DIA_MS));
    if (res.soloAlimentos) filtros.bCategoria = filtros.bCategoria || 'ALIMENTOS';
    else if (res.categoria) filtros.bCategoria = filtros.bCategoria || res.categoria;
    if (res.proveedor) filtros.bProveedor = filtros.bProveedor || res.proveedor;
    Object.entries(filtros).forEach(([id, v]) => {
      const sel = $(id);
      if (sel.tagName === 'SELECT' && v && ![...sel.options].some(o => o.value === v)) sel.appendChild(new Option(capitalizar(v), v));
      sel.value = v || '';
    });
    document.querySelector('[data-tab="tabBuscar"]').click();
    aplicarFiltros();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exportarResumenCSV() {
    if (typeof SAE_EXCEL === 'undefined') { toast('⚠️ Falta el archivo js/excel.js en la página', 'error'); return; }
    const p = leerPeriodo(res.periodo), c = comparacionDe(p);
    const { rp, rc } = rangosEfectivos(p, c);
    const pts = puntos().filter(pasaFiltros);
    const A = pts.filter(x => enRango(x, rp)).concat(res.sinFecha ? pts.filter(x => !x.f) : []);
    const B = rc ? pts.filter(x => enRango(x, rc)) : [];
    const etqP = etiquetaPeriodo(p), etqC = c ? etiquetaPeriodo(c) : '';
    const sub = [$('resSubtitulo').textContent, SAE_EXCEL.generadoEl()];
    const grupo = (arr, fn) => { const o = {}; arr.forEach(x => { const k = fn(x); if (k) o[k] = (o[k] || 0) + 1; }); return o; };
    // Columnas de comparación: período | comparación | diferencia | variación
    const colsComp = (primera, ancho) => [{ t: primera, ancho: ancho || 30 }, { t: etqP, tipo: 'num' }]
      .concat(c ? [{ t: etqC, tipo: 'num' }, { t: 'Diferencia', tipo: 'delta' }, { t: 'Variación', tipo: 'deltaPct' }] : []);
    const filaComp = (k, a, b) => [k, a].concat(c ? [b, a - b, b ? (a - b) / b : ''] : []);
    const bloqueComp = (titulo, fn, max, extra) => {
      const ga = grupo(A, fn), gb = grupo(B, fn);
      const claves = Object.keys(Object.assign({}, ga, gb)).sort((x, y) => (ga[y] || 0) - (ga[x] || 0) || (gb[y] || 0) - (gb[x] || 0) || x.localeCompare(y));
      const filas = claves.slice(0, max || 1e9).map(k => filaComp(k, ga[k] || 0, gb[k] || 0));
      const tA = Object.values(ga).reduce((s, n) => s + n, 0), tB = Object.values(gb).reduce((s, n) => s + n, 0);
      return Object.assign({ titulo, columnas: colsComp(titulo), filas,
        total: max && claves.length > max ? null : filaComp('Total', tA, tB) }, extra || {});
    };
    const esAlim = x => x.cat === 'ALIMENTOS';
    const sinRes = x => x.est === 'Pendiente' || x.est === 'En gestión';
    const nEsc = (arr) => new Set(arr.map(x => x.esc).filter(Boolean)).size;
    const indicadores = {
      titulo: 'Números principales', columnas: colsComp('Indicador'),
      filas: [filaComp(res.soloAlimentos ? 'Reclamos de alimentos' : 'Reclamos', A.length, B.length)].concat(res.soloAlimentos ? [] : [filaComp('De alimentos', A.filter(esAlim).length, B.filter(esAlim).length)]).concat([
        filaComp('Escuelas con reclamos', nEsc(A), nEsc(B)), filaComp('Sin resolver (pendientes o en gestión)', A.filter(sinRes).length, B.filter(sinRes).length)]),
      notas: c ? ['Diferencia y variación en rojo = hubo más reclamos que en el período de comparación.'] : []
    };
    // Proveedores con tasa cada 100 y 1.000 cupos
    const gpA = grupo(A, x => x.prov), gpB = grupo(B, x => x.prov);
    const provs = Object.keys(Object.assign({}, gpA, gpB)).sort((x, y) => (gpA[y] || 0) - (gpA[x] || 0));
    const provBloque = {
      titulo: 'Por proveedor',
      columnas: colsComp('Proveedor', 22).concat([{ t: 'Cupos diarios (promedio)', tipo: 'num' }, { t: 'Reclamos c/100 cupos', tipo: 'dec' }, { t: 'Reclamos c/1.000 cupos', tipo: 'dec' }]),
      filas: provs.map(k => {
        const cu = k === SIN_PROV ? null : cuposDe(k, rp);
        const a = gpA[k] || 0;
        return filaComp(k, a, gpB[k] || 0).concat([cu ? Math.round(cu) : '', cu ? a / cu * 100 : '', cu ? a / cu * 1000 : '']);
      }),
      total: filaComp('Total', A.length, B.length).concat(['', '', '']),
      notas: ['"c/100 cupos": reclamos del período cada 100 cupos diarios del proveedor. Sirve para comparar proveedores grandes y chicos.']
    };
    const motivoDe = x => `${etqCategoria(x.cat || 'SIN CATEGORÍA')} · ${x.mot ? etqMotivo(x.mot, x.cat) : 'Sin motivo'}`;
    const probDe = x => x.prob ? (ETQ_PROBLEMA[x.prob] || capitalizar(x.prob)) : '';
    // Escuelas con cupos
    const hoy = new Date();
    const refISO = isoDe(new Date(Math.min(rp[1].getTime() - DIA_MS, hoy.getTime())));
    const geA = grupo(A, x => x.esc), geB = grupo(B, x => x.esc);
    const escBloque = {
      titulo: 'Escuelas con más reclamos (las 30 primeras)',
      columnas: colsComp('Escuela', 26).concat([{ t: 'Cupos de la escuela', tipo: 'num' }, { t: 'Reclamos c/100 cupos', tipo: 'dec1' }]),
      filas: Object.entries(geA).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 30).map(([k, a]) => {
        const cu = cupoEscuela(k, refISO);
        return filaComp(k, a, geB[k] || 0).concat([cu || '', cu ? a / cu * 100 : '']);
      })
    };
    const { meses, lista: reinc } = calcularReincidentes(pts, rp);
    const reincBloque = {
      titulo: `Escuelas reincidentes (reclamos en ${UMBRAL_REINC} o más de los últimos ${MESES_REINC} meses de clase)`,
      columnas: [{ t: 'Escuela', ancho: 26 }].concat(meses.map(m => ({ t: `${MESES_CORTOS[m.getMonth()]} ${m.getFullYear()}`, tipo: 'num' })))
        .concat([{ t: 'Meses con reclamos', tipo: 'num' }, { t: 'Total reclamos', tipo: 'num' }]),
      filas: reinc.map(r => [r.esc].concat(r.meses.map(n => n || '')).concat([r.n, r.total])),
      notas: reinc.length ? [] : ['Ninguna escuela cumple la condición.']
    };
    // Detalle por proveedor y motivo (igual que la tabla de la página)
    const porProv = {};
    A.forEach(x => {
      const o = porProv[x.prov] || (porProv[x.prov] = { total: 0, alim: 0, otros: 0, pend: 0, motivos: {}, esc: new Set() });
      o.total++; if (x.esc) o.esc.add(x.esc); if (sinRes(x)) o.pend++;
      if (x.cat === 'ALIMENTOS') { o.alim++; const m = MOTIVOS_ALIM.some(z => z.valor === x.mot) ? x.mot : 'OTROS'; o.motivos[m] = (o.motivos[m] || 0) + 1; } else o.otros++;
    });
    const provsT = Object.keys(porProv).sort((a, b) => (a === SIN_PROV) - (b === SIN_PROV) || porProv[b].total - porProv[a].total);
    const filasT = provsT.map(k => { const o = porProv[k]; return [k].concat(MOTIVOS_ALIM.map(m => o.motivos[m.valor] || '')).concat([o.alim, o.otros, o.total, o.pend, o.esc.size]); });
    const sumaCol = (i) => filasT.reduce((s, f) => s + (Number(f[i]) || 0), 0);
    const nM = MOTIVOS_ALIM.length;
    SAE_EXCEL.descargar(`Resumen_reclamos_${etqP.replace(/[^\wáéíóúñ]+/gi, '_')}`, [
      { nombre: 'Resumen', titulo: $('resTitulo').textContent, subtitulo: sub, bloques: [
        indicadores, provBloque,
        bloqueComp('Por motivo', motivoDe),
        bloqueComp('Por estado', x => x.est),
        bloqueComp('Problemas más frecuentes', probDe, 15),
        escBloque, reincBloque, bloqueFueraHorario(A)
      ] },
      { nombre: 'Proveedor y motivo', titulo: `Detalle por proveedor y motivo · ${etqP}`, subtitulo: sub,
        columnas: [{ t: 'Proveedor', ancho: 20 }].concat(MOTIVOS_ALIM.map(m => ({ t: m.etiqueta, tipo: 'num' })))
          .concat([{ t: 'Total alimentos', tipo: 'num' }, { t: 'Otros temas', tipo: 'num' }, { t: 'Total', tipo: 'num' }, { t: 'Sin resolver', tipo: 'num' }, { t: 'Escuelas', tipo: 'num' }]),
        filas: filasT,
        total: ['Total'].concat(MOTIVOS_ALIM.map((m, i) => sumaCol(i + 1))).concat([sumaCol(nM + 1), sumaCol(nM + 2), sumaCol(nM + 3), sumaCol(nM + 4), nEsc(A)]),
        notas: [`Los reclamos hasta ${ANIO_CIERRE_RESUELTOS} se cuentan como resueltos.`], filtro: false }
    ]).then(() => toast('📥 Excel descargado', 'ok')).catch(() => toast('⚠️ No se pudo armar el Excel', 'error'));
  }

  /* ---------- Excel "reclamos del período por proveedor" ----------
   * Una pestaña de resumen y una por proveedor con todos sus reclamos (con detalle),
   * listas para mandarle a cada uno o llevar a una reunión. Usa el período y la
   * categoría elegidos arriba; si hay un proveedor elegido, sale solo ese. */
  async function exportarPorProveedor() {
    if (typeof SAE_EXCEL === 'undefined') { toast('⚠️ Falta el archivo js/excel.js en la página', 'error'); return; }
    const p = leerPeriodo(res.periodo);
    const { rp } = rangosEfectivos(p, null);
    if (rp[0].getFullYear() < estado.desde && !estado.todosLosAnios) {
      toast('⏳ Cargando también los años anteriores…');
      await cargarTodosLosAnios();
    }
    const etqP = etiquetaPeriodo(p);
    const enPeriodo = estado.reclamos.filter(r => {
      const f = fechaValida(r.fecha);
      if (!f || f < rp[0] || f >= rp[1]) return false;
      if (res.soloAlimentos) { if (r.est.categoria !== 'ALIMENTOS') return false; }
      else if (res.categoria && r.est.categoria !== res.categoria) return false;
      if (res.proveedor && (r.est.proveedor || SIN_PROV) !== res.proveedor) return false;
      return true;
    }).sort((a, b) => (a.fecha - b.fecha) || (a.fila - b.fila));
    if (!enPeriodo.length) { toast('No hay reclamos en ese período'); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const porProv = {};
    enPeriodo.forEach(r => { const k = r.est.proveedor || SIN_PROV; (porProv[k] = porProv[k] || []).push(r); });
    const provs = Object.keys(porProv).sort((a, b) => (a === SIN_PROV) - (b === SIN_PROV) || porProv[b].length - porProv[a].length);
    const abierto = (r) => r.est.estado === 'Pendiente' || r.est.estado === 'En gestión';
    const filtros = [textoAlcance(), res.proveedor ? `Proveedor: ${res.proveedor}` : ''].filter(Boolean).join(' · ');
    const sub = [`Reclamos de ${etqP}${rp[1] > hoy ? ` (hasta el ${fechaCorta(new Date(rp[1].getTime() - DIA_MS))})` : ''} · ${filtros}`, SAE_EXCEL.generadoEl()];

    const resumenFilas = provs.map(k => {
      const l = porProv[k];
      const cu = k === SIN_PROV ? null : cuposDe(k, rp);
      return [k, l.length].concat(res.soloAlimentos ? [] : [l.filter(r => r.est.categoria === 'ALIMENTOS').length, l.filter(r => r.est.categoria !== 'ALIMENTOS').length])
        .concat([l.filter(abierto).length, l.filter(r => r.est.estado === 'Resuelto').length, new Set(l.map(r => r.est.escuelaBase)).size, cu ? l.length / cu * 100 : '']);
    });
    const suma = (i) => resumenFilas.reduce((t, f) => t + (Number(f[i]) || 0), 0);
    // (1.4.0) Sin "Días promedio para resolver"; con "Solo alimentos" tampoco van las columnas alimentos / otros temas
    const nAlc = res.soloAlimentos ? 0 : 2;
    // Motivos por proveedor (las 5 más frecuentes de cada uno)
    const motivoDe = (r) => `${r.est.categoria ? etqCategoria(r.est.categoria) : 'Sin categoría'} · ${r.est.motivo ? etqMotivo(r.est.motivo, r.est.categoria) : 'Sin motivo'}`;
    const filasMot = [];
    provs.forEach(k => {
      const c = {};
      porProv[k].forEach(r => { const m = motivoDe(r); c[m] = (c[m] || 0) + 1; });
      Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([m, n]) => filasMot.push([k, m, n, n / porProv[k].length]));
    });
    const hojas = [{
      nombre: 'Resumen', titulo: `Reclamos por proveedor · ${etqP}`, subtitulo: sub, bloques: [
        { titulo: 'Totales por proveedor',
          columnas: [{ t: 'Proveedor', ancho: 20 }, { t: res.soloAlimentos ? 'Reclamos de alimentos' : 'Reclamos', tipo: 'num' }]
            .concat(res.soloAlimentos ? [] : [{ t: 'De alimentos', tipo: 'num' }, { t: 'Otros temas', tipo: 'num' }])
            .concat([{ t: 'Sin resolver', tipo: 'num' }, { t: 'Resueltos', tipo: 'num' }, { t: 'Escuelas con reclamos', tipo: 'num' }, { t: 'Reclamos c/100 cupos', tipo: 'dec' }]),
          filas: resumenFilas,
          total: ['Total', suma(1)].concat(res.soloAlimentos ? [] : [suma(2), suma(3)])
            .concat([suma(2 + nAlc), suma(3 + nAlc), new Set(enPeriodo.map(r => r.est.escuelaBase)).size, '']),
          notas: ['Cada proveedor tiene su pestaña con el detalle de todos sus reclamos del período.'].concat(res.soloAlimentos ? ['Solo reclamos de alimentos (como los gráficos del resumen). Para ver todo, elegí "Todo" arriba.'] : []) },
        { titulo: 'Motivos más frecuentes de cada proveedor',
          columnas: [{ t: 'Proveedor', ancho: 20 }, { t: 'Motivo', ancho: 34 }, { t: 'Reclamos', tipo: 'num' }, { t: '% del proveedor', tipo: 'pct' }],
          filas: filasMot }
      ]
    }];
    provs.forEach(k => {
      const l = porProv[k];
      hojas.push({
        nombre: k, titulo: `${k} · Reclamos de ${etqP}`,
        subtitulo: [`${nf(l.length)} reclamo${l.length === 1 ? '' : 's'} · ${nf(l.filter(abierto).length)} sin resolver · ${filtros}`, SAE_EXCEL.generadoEl()],
        columnas: [{ t: 'Fecha', tipo: 'fecha', ancho: 11 }, { t: 'Escuela', ancho: 22 }, { t: 'Servicio', ancho: 16 }, { t: 'Categoría', ancho: 14 },
          { t: 'Motivo', ancho: 16 }, { t: 'Problema', ancho: 22 }, { t: 'Producto', ancho: 12 }, { t: 'Detalle del reclamo', tipo: 'largo', ancho: 55 },
          { t: 'Cupo afectado', tipo: 'num' }, { t: 'Estado', ancho: 11 }, { t: 'Fecha resolución', tipo: 'fecha', ancho: 11 },
          { t: 'Días abierto', tipo: 'num' }, { t: 'Acciones tomadas', tipo: 'largo', ancho: 34 }, { t: 'Hora de llegada', ancho: 12 }, { t: 'Demora', ancho: 16 }],
        filas: l.map(r => {
          const e = r.est, v = r.v;
          return [r.fecha, v[C.ESCUELA], capitalizar(e.servicio), e.categoria ? etqCategoria(e.categoria) : '',
            e.motivo ? etqMotivo(e.motivo, e.categoria) : '',
            e.problema ? (ETQ_PROBLEMA[e.problema] || capitalizar(e.problema)) + (e.problemaEstimado ? ' (estimado)' : '') : '',
            capitalizar(e.producto), v[C.DETALLE], numero(v[C.CUPO_DEF]),
            { v: e.estado, estilo: ESTILO_ESTADO[e.estado] || 'texto' }, parsearFecha(v[C.FECHA_RES]) || v[C.FECHA_RES],
            abierto(r) && r.fecha ? Math.round((hoy - r.fecha) / DIA_MS) : '', v[C.ACCIONES], ...celdasHora(r)];
        })
      });
    });
    const nombre = `Reclamos_por_proveedor_${etqP.replace(/[^\wáéíóúñ]+/gi, '_')}`;
    SAE_EXCEL.descargar(nombre, hojas).then(() => toast(`📥 Excel descargado (${provs.length} proveedor${provs.length === 1 ? '' : 'es'})`, 'ok'))
      .catch(() => toast('⚠️ No se pudo armar el Excel', 'error'));
  }

  async function imprimirResumen() {
    const html = document.documentElement;
    if (typeof SAE_IMPRESION === 'undefined') {   // por si falta js/impresion.js: imprime en color como antes
      html.classList.add('rec-imprimiendo-resumen');
      const quitar = () => { html.classList.remove('rec-imprimiendo-resumen'); window.removeEventListener('afterprint', quitar); };
      window.addEventListener('afterprint', quitar);
      setTimeout(() => { window.print(); setTimeout(quitar, 1500); }, 60);
      return;
    }
    const modo = await SAE_IMPRESION.elegir('Imprimir el informe');
    if (!modo) return;
    SAE_IMPRESION.imprimir(modo, () => html.classList.add('rec-imprimiendo-resumen'), () => html.classList.remove('rec-imprimiendo-resumen'));
  }

  /* ---------- mostrar / ocultar partes del resumen (se recuerda en este navegador) ---------- */
  const CLAVE_OCULTOS = 'sae-resumen-ocultos';
  function leerOcultos() { try { return new Set(JSON.parse(leerLS(CLAVE_OCULTOS) || '[]')); } catch (e) { return new Set(); } }
  function aplicarVisibles() {
    const ocultos = leerOcultos();
    const cards = [...document.querySelectorAll('#resInforme [data-card]')];
    cards.forEach(c => c.classList.toggle('res-oculto', ocultos.has(c.dataset.card)));
    // Si en una fila queda una sola tarjeta, ocupa todo el ancho
    document.querySelectorAll('#resInforme .res-grid-2, #resInforme .res-grid-3').forEach(g => {
      const vis = [...g.children].filter(x => !x.classList.contains('res-oculto')).length;
      g.dataset.visibles = vis;
      g.classList.toggle('res-oculto', vis === 0);
    });
    $('resVisibles').innerHTML = '<span class="res-vis-label">Mostrar:</span>' + cards.map(c =>
      `<button type="button" class="res-vis-chip${ocultos.has(c.dataset.card) ? '' : ' activo'}" data-card="${c.dataset.card}" aria-pressed="${!ocultos.has(c.dataset.card)}">` +
      `${ocultos.has(c.dataset.card) ? '' : '✓ '}${esc(c.dataset.nombre)}</button>`).join('') +
      (ocultos.size ? '<button type="button" class="rec-link res-vis-todos">Mostrar todo</button>' : '');
  }
  function alternarCard(id, visible) {
    const ocultos = leerOcultos();
    if (visible) ocultos.delete(id); else ocultos.add(id);
    guardarLS(CLAVE_OCULTOS, JSON.stringify([...ocultos]));
    aplicarVisibles();
  }
  function iniciarVisibles() {
    // Botón "ocultar" en el encabezado de cada tarjeta
    document.querySelectorAll('#resInforme .rec-card[data-card] .res-card-cab').forEach(cab => {
      const card = cab.closest('[data-card]');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'res-ocultar';
      b.title = `Ocultar "${card.dataset.nombre}"`;
      b.setAttribute('aria-label', b.title);
      b.textContent = '✕';
      b.addEventListener('click', () => alternarCard(card.dataset.card, false));
      cab.appendChild(b);
    });
    $('resVisibles').addEventListener('click', (ev) => {
      const chip = ev.target.closest('.res-vis-chip');
      if (chip) { alternarCard(chip.dataset.card, !chip.classList.contains('activo')); return; }
      if (ev.target.closest('.res-vis-todos')) { guardarLS(CLAVE_OCULTOS, '[]'); aplicarVisibles(); }
    });
    aplicarVisibles();
  }

  function iniciarResumen() {
    iniciarVisibles();
    res.periodo = clavePeriodo('mes', periodoActual('mes').anio, periodoActual('mes').idx);
    document.querySelectorAll('#rGran button').forEach(b => b.addEventListener('click', () => {
      const prev = leerPeriodo(res.periodo);
      res.gran = b.dataset.gran;
      document.querySelectorAll('#rGran button').forEach(x => x.classList.toggle('activo', x === b));
      // Se mantiene la misma época: octubre → 4.º trimestre → año
      const idx = res.gran === 'mes' ? (prev.gran === 'trim' ? prev.idx * 3 : prev.gran === 'anio' ? 0 : prev.idx)
        : res.gran === 'trim' ? (prev.gran === 'mes' ? Math.floor(prev.idx / 3) : prev.gran === 'trim' ? prev.idx : 0) : 0;
      res.periodo = clavePeriodo(res.gran, prev.anio, idx);
      const act = periodoActual(res.gran);
      // Desde "Año" del año en curso se pasa al mes/trimestre actual
      if (prev.anio === act.anio && (idx > act.idx || prev.gran === 'anio')) res.periodo = clavePeriodo(res.gran, act.anio, act.idx);
      res.periodo2 = '';
      pintarResumen();
    }));
    $('rPeriodo').addEventListener('change', () => { res.periodo = $('rPeriodo').value; pintarResumen(); });
    $('rPeriodo2').addEventListener('change', () => { res.periodo2 = $('rPeriodo2').value; pintarResumen(); });
    $('rComparar').addEventListener('change', () => { res.comparar = $('rComparar').value; pintarResumen(); });
    $('rProveedor').addEventListener('change', () => { res.proveedor = $('rProveedor').value; pintarResumen(); });
    $('rCategoria').addEventListener('change', () => { res.categoria = $('rCategoria').value; pintarResumen(); });
    document.querySelectorAll('#rAlcance button').forEach(b => b.addEventListener('click', () => {
      res.soloAlimentos = b.dataset.alc === 'alim';
      guardarLS('sae-res-alcance', res.soloAlimentos ? 'alim' : 'todo');
      pintarResumen();
    }));
    $('rSinFecha').addEventListener('change', () => { res.sinFecha = $('rSinFecha').checked; pintarResumen(); });
    document.querySelectorAll('#rUnidad button').forEach(b => b.addEventListener('click', () => { res.unidad = b.dataset.unidad; pintarResumen(); }));
    document.querySelectorAll('#rUnidadEsc button').forEach(b => b.addEventListener('click', () => { res.unidadEsc = b.dataset.unidad; pintarResumen(); }));
    $('btnResCSV').addEventListener('click', exportarResumenCSV);
    $('btnResProv').addEventListener('click', exportarPorProveedor);
    $('btnResImprimir').addEventListener('click', imprimirResumen);
    const abrir = (fila) => {
      if (!fila || !fila.dataset.dato) return;
      if (fila.closest('#resEscuelas')) irABuscar({ bTexto: fila.dataset.dato });
      else if (fila.closest('#resProveedores') && fila.dataset.dato !== SIN_PROV) irABuscar({ bProveedor: fila.dataset.dato });
    };
    $('tabResumen').addEventListener('click', (ev) => abrir(ev.target.closest('.g-clicable .g-fila')));
    $('tabResumen').addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const f = ev.target.closest('.g-clicable .g-fila');
      if (f) { ev.preventDefault(); abrir(f); }
    });
  }

  /* ======================================================================
   * DETALLE Y SEGUIMIENTO
   * ====================================================================== */
  function abrirModal(r) {
    estado.modal = r;
    const v = r.v, e = r.est;
    $('modalTitulo').textContent = `${v[C.ESCUELA] || 'Reclamo'} · ${r.fecha ? fechaCorta(r.fecha) : v[C.FECHA]}`;
    const fila = (k, val) => val ? `<div class="rec-dato"><span>${k}</span><strong>${esc(val)}</strong></div>` : '';
    // (2.4.0) Proveedor y servicio se muestran siempre: si faltan, marcados
    const filaFalta = (k, val) => `<div class="rec-dato${val ? '' : ' falta'}"><span>${k}</span><strong>${val ? esc(val) : '⚠️ Falta'}</strong></div>`;
    // (2.4.0) Qué le falta a este reclamo (lo mismo que marca "Revisar datos")
    const faltas = problemasDato(r);
    const QUE = { estado: 'Estado', clasificacion: 'Categoría o motivo', proveedor: 'Proveedor', servicio: 'Servicio' };
    const enPagina = faltas.filter(t => QUE[t]).map(t => QUE[t]);
    const notas = [];
    if (faltas.includes('escuela')) notas.push(`La escuela "${v[C.ESCUELA] || '(vacía)'}" no coincide con ninguna del buscador: se corrige en la hoja, fila ${r.fila}.`);
    if (faltas.includes('fecha')) notas.push(`La fecha no es válida: se corrige en la hoja, fila ${r.fila}.`);
    if (faltas.includes('duplicado')) notas.push(`Parece repetido de la fila ${filaOriginalDe(r)}: si se cargó dos veces, borrá una de las dos en la hoja.`);
    const cajaFalta = (enPagina.length || notas.length) ? `<div class="rec-modal-falta" role="note">
        ${enPagina.length ? `<strong>⚠️ Falta completar:</strong> ${esc(enPagina.join(' · '))} <small>(se completa acá abajo)</small>` : ''}
        ${notas.map(n => `<p>⚠️ ${esc(n)}</p>`).join('')}
      </div>` : '';
    // (2.8.0) Alimentos sin resolver: el script lo pasa solo a Resuelto a los 7 días
    let notaAuto = '';
    const autoDesde = estado.autoDesde || leerLS('sae-auto-desde') || '';
    if (autoDesde && e.categoria === 'ALIMENTOS' && r.fecha && !['Resuelto'].includes(e.estado)) {
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (iso(r.fecha) >= autoDesde) {
        const cuando = new Date(r.fecha); cuando.setDate(cuando.getDate() + 7);
        notaAuto = `<p class="rec-modal-auto">⏱️ Si no se resuelve antes, se marca solo como <strong>Resuelto</strong> el ${fechaCorta(cuando)} (7 días).</p>`;
      }
    }
    $('modalCuerpo').innerHTML = `
      ${cajaFalta}${notaAuto}
      <p class="rec-modal-detalle">${esc(v[C.DETALLE] || 'Sin detalle')}</p>
      <div class="rec-datos">
        ${filaFalta('Proveedor', e.proveedor)}
        ${filaFalta('Servicio', capitalizar(e.servicio))}
        ${fila('Categoría', etqCategoria(e.categoria))}
        ${fila('Motivo', e.motivo ? etqMotivo(e.motivo, e.categoria) : '')}
        ${fila('Problema', e.problema ? (ETQ_PROBLEMA[e.problema] || capitalizar(e.problema)) + (e.problemaEstimado ? ' (estimado)' : '') : '')}
        ${fila('Producto', capitalizar(e.producto))}
        ${fila('Patología', e.patologia ? capitalizar(e.patologia) + (e.patologiaEstimada ? ' (estimado)' : '') : '')}
        ${fila('Cupo afectado', v[C.CUPO_DEF])}
        ${fila('Cupo total', v[C.CUPO_TOTAL])}
        ${fila('Resuelto el', v[C.FECHA_RES])}
        ${fila('Hora de llegada', textoEvaluacion(evaluarReclamo(r)))}
        ${fila('Fila en la hoja', String(r.fila))}
      </div>`;
    estado.modalEstado = ['Pendiente', 'En gestión', 'Resuelto'].includes(e.estado) ? e.estado : '';
    pintarEstadoModal();
    const resp = v[C.RESPONSABLE] || '';
    llenarSelect($('mResponsable'), CLASIFICACION.responsables.includes(resp) || !resp
      ? CLASIFICACION.responsables : [...CLASIFICACION.responsables, resp], true, 'Sin asignar');
    $('mResponsable').value = resp;
    $('mAcciones').value = v[C.ACCIONES] || '';
    // (2.1.0) Clasificación a mano
    llenarClasif($('mCategoria'), $('mMotivo'), e.categoria, e.motivo);
    // (2.4.0) Proveedor y servicio (se pueden completar o corregir acá; script v23)
    const provs = proveedoresConocidos();
    const provAct = e.proveedor || '';
    llenarSelect($('mProveedor'), provAct && !provs.includes(provAct) ? [...provs, provAct] : provs, true, 'Sin proveedor');
    $('mProveedor').value = provAct;
    const servAct = mayus(v[C.SERVICIO]);
    const servs = CLASIFICACION.servicios.slice();
    if (servAct && !servs.includes(servAct)) servs.push(servAct);
    llenarSelect($('mServicio'), servs.map(x => ({ valor: x, etiqueta: capitalizar(x) })), true, 'Sin servicio');
    $('mServicio').value = servAct;
    // (2.4.0) Lo que falta, marcado en su lugar (se apaga al completarlo)
    const marcar = (id, falta) => { const el = $(id); if (el) el.classList.toggle('rec-falta', !!falta); };
    marcar('campoMEstado', faltas.includes('estado'));
    marcar('campoMClasif', faltas.includes('clasificacion'));
    marcar('campoMProvServ', faltas.includes('proveedor') || faltas.includes('servicio'));
    prepararEscuelaModal(r);                                   // (2.8.7)
    marcar('campoMEscuela', faltas.includes('escuela'));
    $('mProveedor').classList.toggle('rec-falta-sel', faltas.includes('proveedor'));
    $('mServicio').classList.toggle('rec-falta-sel', faltas.includes('servicio'));
    prepararHoraModal(r);                                      // (2.9.0)
    pintarBotonBorrar();
    $('modalDetalle').style.display = 'flex';
    document.body.classList.add('rec-modal-abierto');
    setTimeout(() => $('btnCerrarModal').focus(), 30);
  }

  function pintarEstadoModal() {
    botonesOpciones($('mEstado'), CLASIFICACION.estados.map(x => ({ valor: x, etiqueta: x })), estado.modalEstado, (v) => {
      estado.modalEstado = v;
      if ($('campoMEstado')) $('campoMEstado').classList.remove('rec-falta');
      pintarEstadoModal();
    });
  }

  function cerrarModal() {
    $('modalDetalle').style.display = 'none';
    document.body.classList.remove('rec-modal-abierto');
    estado.modal = null;
    if (estado.refrescoPendiente) setTimeout(() => chequearCambios(true), 300);   // (2.8.8)
  }

  /* El cambio de estado/responsable/acciones se ve al instante: la lista se
   * actualiza en el momento y el envío a la hoja sigue en segundo plano (misma
   * cola que los reclamos nuevos). Si falla, queda arriba con "Reintentar" y,
   * si se descarta, el reclamo vuelve a como estaba. */
  function guardarModal() {
    const r = estado.modal;
    if (!r) return;
    const cambios = {};
    const estAnterior = ['Pendiente', 'En gestión', 'Resuelto'].includes(r.est.estado) ? r.est.estado : '';
    if (estado.modalEstado !== estAnterior) cambios.estado = estado.modalEstado;
    if ($('mResponsable').value !== (r.v[C.RESPONSABLE] || '')) cambios.responsable = $('mResponsable').value;
    if ($('mAcciones').value.trim() !== (r.v[C.ACCIONES] || '').trim()) cambios.acciones = $('mAcciones').value.trim();
    // (2.4.0) Proveedor y servicio
    const nProv = $('mProveedor').value, nServ = $('mServicio').value;
    if (nProv !== (r.est.proveedor || '')) cambios.proveedor = nProv;
    if (nServ !== mayus(r.v[C.SERVICIO])) cambios.servicio = nServ;
    // (2.9.0) Hora de llegada
    const nHora = cambioHoraModal(r);
    if (nHora !== undefined) {
      if (versionScriptActual() && versionScriptActual() < VERSION_HORA) { toast(`⚠️ Para guardar la hora de llegada hay que actualizar el script de Google (versión ${VERSION_HORA}).`, 'error'); return; }
      cambios.horaLlegada = nHora;
    }
    // (2.8.7) Escuela corregida (una) o repartida en varias (la fila queda con la primera)
    let otrasEscuelas = [];
    const escTxt = $('mEscuela').value.trim();
    if (estado.modalMulti) {
      const lista = [...estado.modalMulti.values()];
      if (!lista.length) { toast('Elegí al menos una escuela (o tocá "Volver a una sola escuela").', 'error'); return; }
      const servHoja = nServ || mayus(r.v[C.SERVICIO]);
      const primera = lista[0], x = datosEscuelaPara(primera, servHoja, r);
      if (mayus(primera.nombre) !== mayus(r.v[C.ESCUELA])) cambios.escuela = primera.nombre;
      if (x.proveedor && cambios.proveedor === undefined && x.proveedor !== (r.est.proveedor || '')) cambios.proveedor = x.proveedor;
      if (x.cupo !== '' && String(x.cupo) !== String(r.v[C.CUPO_TOTAL] || '')) cambios.cupoTotal = x.cupo;
      otrasEscuelas = lista.slice(1).map(e => copiaParaEscuela(r, e, servHoja));
    } else if (estado.modalEscuela && mayus(estado.modalEscuela.nombre) !== mayus(r.v[C.ESCUELA])) {
      cambios.escuela = estado.modalEscuela.nombre;
      const x = datosEscuelaPara(estado.modalEscuela, nServ || mayus(r.v[C.SERVICIO]), r);
      if (x.cupo !== '' && String(x.cupo) !== String(r.v[C.CUPO_TOTAL] || '')) cambios.cupoTotal = x.cupo;
    } else if (escTxt && mayus(escTxt) !== mayus(r.v[C.ESCUELA]) && !estado.modalEscuela) {
      toast('Elegí la escuela de la lista que aparece al escribir.', 'error');
      return;
    }
    if ((cambios.escuela !== undefined || cambios.cupoTotal !== undefined || otrasEscuelas.length) && (estado.versionScript || Number(leerLS('sae-script-version')) || 0) < 32) {
      toast('⚠️ Para cambiar la escuela hay que actualizar el script de Google (versión 32).', 'error');
      return;
    }
    if (otrasEscuelas.length && !confirm(`Esta fila queda con ${[...estado.modalMulti.keys()][0]} y se crean ${otrasEscuelas.length} reclamo${otrasEscuelas.length === 1 ? '' : 's'} nuevo${otrasEscuelas.length === 1 ? '' : 's'} (uno por cada otra escuela), con el mismo detalle.\n\n¿Seguir?`)) return;
    if (otrasEscuelas.length) {
      COLA.encolar(otrasEscuelas.map(x => ({ tipo: 'agregar', datos: x })));
      toast(`⏳ Creando ${otrasEscuelas.length} reclamo${otrasEscuelas.length === 1 ? '' : 's'} nuevo${otrasEscuelas.length === 1 ? '' : 's'}…`, 'ok');
    }
    if ((cambios.proveedor !== undefined || cambios.servicio !== undefined) && (estado.versionScript || Number(leerLS('sae-script-version')) || 0) < 23) {
      toast('⚠️ Para cambiar el proveedor o el servicio hay que actualizar el script de Google (versión 23).', 'error');
      return;
    }
    // (2.1.0) Clasificación elegida a mano en la ventana
    const nCat = $('mCategoria').value, nMot = $('mMotivo').value;
    const cambiaClas = (nCat || nMot) && (nCat !== r.est.categoria || nMot !== r.est.motivo);
    if (cambiaClas && (!nCat || !nMot)) { toast('Elegí la categoría y el motivo (o dejalos como estaban).', 'error'); return; }
    if (cambiaClas) {
      const ant = reclasificarManual(r, nCat, nMot, false);
      const r2 = estado.reclamos.find(x => x.fila === r.fila) || r;
      if (!Object.keys(cambios).length) {
        if (ant) registrarDeshacer([ant], `${r.v[C.ESCUELA]} → ${etqClas(nCat, nMot)}`);
        cerrarModal(); aplicarFiltros(); actualizarBadge(); pintarCola();
        toast(`✔️ ${r.v[C.ESCUELA]} → ${etqClas(nCat, nMot)}`, 'ok');
        return;
      }
      estado.modal = r2;
      return guardarModalSeguimiento(r2, cambios, ant);
    }
    if (!Object.keys(cambios).length) { cerrarModal(); if (otrasEscuelas.length) pintarCola(); return; }
    return guardarModalSeguimiento(r, cambios, null);
  }

  /** Guarda estado / responsable / acciones (y arma el Deshacer, junto con la reclasificación si hubo). */
  function guardarModalSeguimiento(r, cambios, anteriorClas) {

    // Versión local con los cambios ya aplicados
    const v = r.v.slice();
    if (cambios.estado !== undefined) {
      v[C.ESTADO] = cambios.estado;
      if (cambios.estado === 'Resuelto') { if (!v[C.FECHA_RES]) v[C.FECHA_RES] = fechaCorta(new Date()); }
      else v[C.FECHA_RES] = '';
    }
    if (cambios.responsable !== undefined) v[C.RESPONSABLE] = cambios.responsable;
    if (cambios.acciones !== undefined) v[C.ACCIONES] = cambios.acciones;
    if (cambios.proveedor !== undefined) v[C.PROVEEDOR] = cambios.proveedor;
    if (cambios.servicio !== undefined) v[C.SERVICIO] = cambios.servicio;
    if (cambios.escuela !== undefined) v[C.ESCUELA] = cambios.escuela;          // (2.8.7)
    if (cambios.cupoTotal !== undefined) v[C.CUPO_TOTAL] = String(cambios.cupoTotal);
    if (cambios.horaLlegada !== undefined) v[C.HORA] = cambios.horaLlegada;     // (2.9.0)
    const nuevo = prepararReclamo({ fila: r.fila, v });
    const anterior = reemplazarReclamo(r, nuevo);

    encolarActualizacion({ tipo: 'actualizar', antes: tomarAntes(r.v, 'actualizar'),
      datos: { escuela: r.v[C.ESCUELA], detalle: r.v[C.DETALLE] },
      pedido: { accion: 'actualizar', fila: r.fila, huella: huellaDe(r.v), cambios } });
    registrarDeshacer([anteriorClas || anterior], cambios.estado ? `${r.v[C.ESCUELA]} → ${cambios.estado}` : `seguimiento de ${r.v[C.ESCUELA]}`);
    cerrarModal();
    aplicarFiltros();
    actualizarBadge();
    toast(cambios.estado ? `✔️ ${r.v[C.ESCUELA]} → ${cambios.estado}` : (Object.keys(cambios).length === 1 && cambios.horaLlegada !== undefined
      ? `✔️ ${r.v[C.ESCUELA]}: hora de llegada ${cambios.horaLlegada ? horaVer(cambios.horaLlegada) : 'quitada'}` : `✔️ ${r.v[C.ESCUELA]}: seguimiento actualizado`), 'ok');
    pintarCola();
  }

  /* ---------- (2.6.0) Borrar un reclamo (script v24) ----------
   * Se vacía su fila en la hoja (las demás no se corren). Se puede deshacer durante 20 s
   * con el mismo botón ↩ Deshacer; después queda solo en la copia semanal del Tablero. */
  function pintarBotonBorrar() {
    const b = $('btnBorrarReclamo');
    if (!b) return;
    clearTimeout(pintarBotonBorrar._t);
    b.disabled = false;
    b.dataset.confirmar = '';
    b.innerHTML = '🗑️ Borrar reclamo';
    b.classList.remove('rec-borrar-confirmar');
  }
  /* (2.8.6) Borrar es inmediato: el reclamo sale de la lista al confirmar y el borrado va a la hoja por
   * la cola de envíos (en tandas, script v31). Deshacer: si todavía no se mandó, se cancela; si ya se
   * borró, se restaura en la hoja. */
  function borrarReclamo() {
    const r = estado.modal;
    const b = $('btnBorrarReclamo');
    if (!r || !b) return;
    if ((estado.versionScript || Number(leerLS('sae-script-version')) || 0) < 31) {
      toast('⚠️ Para borrar reclamos hay que actualizar el script de Google (versión 31).', 'error');
      return;
    }
    if (b.dataset.confirmar !== '1') {
      b.dataset.confirmar = '1';
      b.innerHTML = `¿Seguro? Sí, borrar la fila ${r.fila}`;
      b.classList.add('rec-borrar-confirmar');
      pintarBotonBorrar._t = setTimeout(pintarBotonBorrar, 6000);
      return;
    }
    clearTimeout(pintarBotonBorrar._t);
    const enCola = (COLA ? COLA.leer() : []).some(x => x.pedido && x.pedido.fila === r.fila);
    if (enCola) { toast('Este reclamo tiene cambios esperando para guardarse: esperá a que se guarden (o descartalos) y volvé a intentar.', 'error'); pintarBotonBorrar(); return; }
    cerrarModal();
    borrarLista([r]);
  }

  /** Saca los reclamos de la lista al instante y manda el borrado a la cola (con Deshacer). */
  function borrarLista(lista) {
    const items = COLA.encolar(lista.map(r => ({ tipo: 'borrar', datos: { escuela: r.v[C.ESCUELA], detalle: r.v[C.DETALLE] },
      antesV: r.v.slice(), pedido: { fila: r.fila, huella: huellaDe(r.v) } })));
    const filas = new Set(lista.map(r => r.fila));
    estado.reclamos = estado.reclamos.filter(x => !filas.has(x.fila));
    estado.versionDatos = (estado.versionDatos || 0) + 1;
    const texto = lista.length === 1 ? `borrado de ${lista[0].v[C.ESCUELA]}` : `borrado de ${nf(lista.length)} reclamos`;
    estado.deshacer = { borrados: items, lista: [], texto, hasta: Date.now() + SEG_DESHACER * 1000 };
    pintarDeshacer();
    aplicarFiltros();
    actualizarBadge();
    pintarCola();
    toast(lista.length === 1
      ? `🗑️ Reclamo de ${lista[0].v[C.ESCUELA]} borrado (fila ${lista[0].fila}). Podés deshacerlo durante ${SEG_DESHACER} s.`
      : `🗑️ ${nf(lista.length)} reclamos borrados. Podés deshacerlo durante ${SEG_DESHACER} s.`, 'ok');
  }

  /** Vuelve a poner en la lista un reclamo cuyo borrado se canceló o falló. Devuelve true si lo agregó. */
  function volverAMostrar(item) {
    if (!item || !item.pedido || !Array.isArray(item.antesV)) return false;
    if (estado.reclamos.some(x => x.fila === item.pedido.fila)) return false;
    estado.reclamos.push(prepararReclamo({ fila: item.pedido.fila, v: item.antesV.slice() }));
    estado.versionDatos = (estado.versionDatos || 0) + 1;
    return true;
  }

  /** Restaura en la hoja los que ya se habían borrado. */
  async function restaurarEnHoja(items) {
    if (!items.length) return;
    try {
      const filaReal = (x) => (estado.filaBorrada && estado.filaBorrada.get(x.id)) || x.pedido.fila;   // (2.8.8)
      const res = await llamarPost({ accion: 'restaurarVarios', filas: items.map(filaReal) });
      refrescarPronto();
      let mal = 0;
      items.forEach((it, k) => {
        const r = (res.resultados || [])[k] || {};
        if (r.ok) {
          const i = estado.reclamos.findIndex(x => x.fila === it.pedido.fila);
          const nuevo = prepararReclamo({ fila: it.pedido.fila, v: Array.isArray(r.v) ? r.v : it.antesV.slice() });
          if (i >= 0) estado.reclamos[i] = nuevo; else estado.reclamos.push(nuevo);
        } else mal++;
      });
      estado.versionDatos = (estado.versionDatos || 0) + 1;
      aplicarFiltros(); actualizarBadge();
      if (mal) toast(`⚠️ ${mal === 1 ? 'Un reclamo no se pudo' : mal + ' reclamos no se pudieron'} restaurar: ${mensajeError(new Error(((res.resultados || []).find(x => !x.ok) || {}).error || ''))}`, 'error');
    } catch (err) {
      toast('⚠️ No se pudo deshacer el borrado: ' + mensajeError(err), 'error');
    }
  }

  function deshacerBorrados(items) {
    const cola = COLA.leer();
    const sinMandar = [], yaBorrados = [], enCurso = [];
    items.forEach(it => {
      const enC = cola.find(x => x.id === it.id);
      if (!enC) yaBorrados.push(it);                        // ya se guardó en la hoja
      else if (enC.estado === 'enviando') enCurso.push(it); // se está mandando justo ahora
      else sinMandar.push(it);                              // esperando o con error: se cancela
    });
    if (sinMandar.length) {
      COLA.quitar(sinMandar.map(x => x.id));
      sinMandar.forEach(volverAMostrar);
    }
    if (enCurso.length) {
      estado.restaurarAlTerminar = estado.restaurarAlTerminar || new Set();
      enCurso.forEach(it => { estado.restaurarAlTerminar.add(it.pedido.fila); volverAMostrar(it); });
    }
    yaBorrados.forEach(volverAMostrar);
    restaurarEnHoja(yaBorrados);
    aplicarFiltros(); actualizarBadge(); pintarCola();
    toast(items.length === 1 ? '↩ Deshecho: el reclamo volvió.' : `↩ Deshecho: ${nf(items.length)} reclamos volvieron.`, 'ok');
  }

  /* ---------- Deshacer el último cambio de seguimiento ----------
   * Un botón chico abajo a la izquierda, durante 20 segundos (o Ctrl+Z fuera de un campo).
   * Vuelve cada reclamo a como estaba: estado, responsable, acciones y (script v12) la
   * fecha de resolución. Se envía por la misma cola, así que también se ve al instante. */
  const SEG_DESHACER = 20;
  function registrarDeshacer(anteriores, texto) {
    const lista = anteriores.filter(Boolean);
    if (!lista.length) return;
    estado.deshacer = { lista, texto, hasta: Date.now() + SEG_DESHACER * 1000 };
    pintarDeshacer();
  }
  function pintarDeshacer() {
    let b = $('btnDeshacer');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.id = 'btnDeshacer';
      b.className = 'rec-deshacer';
      b.addEventListener('click', deshacer);
      document.body.appendChild(b);
    }
    clearTimeout(pintarDeshacer._t);
    const acc = estado.deshacer;
    const quedan = acc ? Math.ceil((acc.hasta - Date.now()) / 1000) : 0;
    if (!acc || quedan <= 0) { estado.deshacer = null; b.style.display = 'none'; return; }
    b.innerHTML = `↩ Deshacer <small>${quedan} s</small>`;
    b.title = `Deshacer: ${acc.texto} (también Ctrl+Z)`;
    b.setAttribute('aria-label', `Deshacer ${acc.texto}`);
    b.style.display = '';
    pintarDeshacer._t = setTimeout(pintarDeshacer, 1000);
  }
  function deshacer() {
    const acc = estado.deshacer;
    if (!acc) return;
    estado.deshacer = null;
    pintarDeshacer();
    if (acc.borrados) { deshacerBorrados(acc.borrados); return; }   // (2.6.0 / 2.8.6)
    const conFecha = (estado.versionScript || Number(leerLS('sae-script-version')) || 0) >= 12;
    let n = 0;
    acc.lista.forEach(anterior => {
      const actual = estado.reclamos.find(x => x.fila === anterior.fila);
      if (!actual) return;
      const pv = anterior.v, av = actual.v, cambios = {};
      const t = (x) => String(x || '').trim();
      if (t(pv[C.ESTADO]) !== t(av[C.ESTADO])) cambios.estado = t(pv[C.ESTADO]);
      if (t(pv[C.RESPONSABLE]) !== t(av[C.RESPONSABLE])) cambios.responsable = t(pv[C.RESPONSABLE]);
      if (t(pv[C.ACCIONES]) !== t(av[C.ACCIONES])) cambios.acciones = t(pv[C.ACCIONES]);
      if (conFecha && t(pv[C.FECHA_RES]) !== t(av[C.FECHA_RES])) cambios.fechaResolucion = t(pv[C.FECHA_RES]);
      if (t(pv[C.PROVEEDOR]) !== t(av[C.PROVEEDOR])) cambios.proveedor = t(pv[C.PROVEEDOR]);   // (2.4.0)
      if (t(pv[C.SERVICIO]) !== t(av[C.SERVICIO])) cambios.servicio = t(pv[C.SERVICIO]);
      if (t(pv[C.ESCUELA]) !== t(av[C.ESCUELA])) cambios.escuela = t(pv[C.ESCUELA]);          // (2.8.7)
      if (t(pv[C.CUPO_TOTAL]) !== t(av[C.CUPO_TOTAL])) cambios.cupoTotal = t(pv[C.CUPO_TOTAL]);
      if (t(pv[C.HORA]) !== t(av[C.HORA])) cambios.horaLlegada = t(pv[C.HORA]);                  // (2.9.0)
      // Reclasificación: vuelve la categoría, el motivo y el tipo de antes
      const clas = {};
      if (t(pv[C.CATEGORIA]) !== t(av[C.CATEGORIA])) clas.categoria = t(pv[C.CATEGORIA]);
      if (t(pv[C.SUBCATEGORIA]) !== t(av[C.SUBCATEGORIA])) clas.subcategoria = t(pv[C.SUBCATEGORIA]);
      if (t(pv[C.TIPO]) !== t(av[C.TIPO])) clas.tipo = t(pv[C.TIPO]);
      if (!Object.keys(cambios).length && !Object.keys(clas).length) return;
      const nuevo = prepararReclamo({ fila: anterior.fila, v: pv.slice() });
      const previo = reemplazarReclamo(actual, nuevo);
      if (Object.keys(clas).length) {
        COLA.encolar([{ tipo: 'reclasificar', antes: tomarAntes(previo.v, 'reclasificar'),
          datos: { escuela: pv[C.ESCUELA], detalle: pv[C.DETALLE] },
          pedido: { fila: anterior.fila, huella: huellaDe(av), cambios: clas } }]);
        n++;
        if (!Object.keys(cambios).length) return;
      }
      encolarActualizacion({ tipo: 'actualizar', antes: tomarAntes(previo.v, 'actualizar'),
        datos: { escuela: pv[C.ESCUELA], detalle: pv[C.DETALLE] },
        pedido: { accion: 'actualizar', fila: anterior.fila, huella: huellaDe(av), cambios } });
      n++;
    });
    if (!n) { toast('No había nada para deshacer.', 'ok'); return; }
    aplicarFiltros();
    actualizarBadge();
    toast(`↩ Deshecho: ${n === 1 ? 'el reclamo volvió' : nf(n) + ' reclamos volvieron'} a como estaba${n === 1 ? '' : 'n'}.`, 'ok');
    pintarCola();
  }
  document.addEventListener('keydown', (ev) => {
    if (!(ev.ctrlKey || ev.metaKey) || ev.key.toLowerCase() !== 'z' || ev.shiftKey || !estado.deshacer) return;
    const t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;   // ahí Ctrl+Z deshace lo escrito
    ev.preventDefault();
    deshacer();
  });

  /** Cambia un reclamo de la lista por otro (devuelve el que estaba). */
  function reemplazarReclamo(viejo, nuevo) {
    const idx = estado.reclamos.findIndex(x => x === viejo || x.fila === viejo.fila);
    const antes = idx >= 0 ? estado.reclamos[idx] : viejo;
    if (idx >= 0) estado.reclamos[idx] = nuevo;
    estado.versionDatos = (estado.versionDatos || 0) + 1;
    return antes;
  }

  /* ======================================================================
   * (2.9.0) HORA DE LLEGADA · ENTREGAS FUERA DE HORARIO (script v34)
   * Columna R "HORA LLEGADA" de la hoja: "11:40", o "11:40 (especial)" si es una entrega especial
   * que no se cuenta en las estadísticas. Se carga con el reclamo (Alimentos › Fuera de horario),
   * se corrige en la ventana del reclamo y, para los viejos, desde "Revisar datos" (la hora que
   * figura en el texto, confirmándola). El horario esperado (6 a 8 si no se cambió) y las
   * excepciones (por escuela, proveedor o fechas) se guardan como ajustes de tipo "horario".
   * ====================================================================== */
  const MOT_FUERA = 'FUERA DE HORARIO';
  const HORARIO_DEFECTO = { inicio: '06:00', fin: '08:00' };
  const LS_HORARIOS = 'sae-horarios-v1';
  const VERSION_HORA = 34;
  const esFueraHorario = (mot) => mayus(mot) === MOT_FUERA;
  const versionScriptActual = () => estado.versionScript || Number(leerLS('sae-script-version')) || 0;
  const aMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const deMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  /** "06:00" -> "6", "08:30" -> "8:30" (para leer rápido). */
  const horaCorta = (hhmm) => { const n = aMin(hhmm); if (n == null) return hhmm || ''; return n % 60 ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : String(Math.floor(n / 60)); };
  /** Hora de llegada para leer: "07:30" -> "7:30", "12:00" -> "12:00". */
  const horaVer = (hhmm) => String(hhmm || '').replace(/^0(\d)/, '$1');
  const textoDemora = (min) => min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ' ' + (min % 60) + ' min' : ''}`;

  /** Lo que dice la columna R: { hora: "11:40", min, especial } o null. */
  function leerHora(txt) {
    const t = String(txt || '').trim();
    const m = /^(\d{1,2})[:.](\d{2})/.exec(t);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
    const hora = `${m[1].padStart(2, '0')}:${m[2]}`;
    return { hora, min: aMin(hora), especial: /especial/i.test(t) };
  }
  const textoHora = (hora, especial) => hora ? hora + (especial ? ' (especial)' : '') : '';

  /** Hora que aparece en el texto del reclamo ("llegó a las 11:40", "10.30 hs"…). '' si no hay una clara. */
  function horaDelDetalle(texto) {
    const t = ASISTENTE.normalizar(texto);
    const re = /(^|[^\d\/])(\d{1,2})(?:\s*[:.,]\s*(\d{2}))?\s*(hs\b|h\b|hrs\b|horas\b|am\b|pm\b|a\.?\s?m\.?|p\.?\s?m\.?)?/g;
    const cands = [];
    let m;
    while ((m = re.exec(t))) {
      const ini = m.index + m[1].length;
      if (/^\s*\/|^\d/.test(t.slice(re.lastIndex, re.lastIndex + 3))) continue;   // fecha (12/10) o número más largo
      const antes = t.slice(Math.max(0, ini - 40), ini);
      const conMin = m[3] !== undefined, suf = m[4] || '';
      const pegado = /(a las|las|pasadas las|pasada las|despues de las|tipo|cerca de las|alrededor de las)\s*$/.test(antes);
      if (!conMin && !suf && !pegado) continue;   // "15 alumnos": no es una hora
      let h = Number(m[2]); const mi = conMin ? Number(m[3]) : 0;
      if (mi > 59) continue;
      if (/^p/.test(suf) && h < 12) h += 12;
      if (h < 5 || h > 20) continue;
      const llego = /(lleg|vino|vinieron|entreg|aparec|recib|trajeron|pasaron|paso el|dejaron|arrib)/.test(antes.slice(-35));
      const debia = /(antes de( las)?|hasta( las)?|deberia|debe|deben|tiene que|tienen que|horario (de recepcion|de entrega|es)( es)?( de| hasta)?( las)?|de las \d{1,2}( a)?|entre las|a partir de( las)?)\s*$/.test(antes.slice(-25));
      cands.push({ h, mi, llego: llego && !debia, debia });
    }
    const txt = (c) => `${String(c.h).padStart(2, '0')}:${String(c.mi).padStart(2, '0')}`;
    const buenos = cands.filter(c => c.llego);
    if (buenos.length) return txt(buenos[0]);
    // "No llegó", "todavía no vino"…: la hora del texto no es la de llegada (eso va en PROBLEMA)
    if (/\b(no|nunca|todavia no|aun no) (lleg|vino|vinieron|entreg|trajeron|aparec)/.test(t)) return '';
    const distintas = [...new Set(cands.filter(c => !c.debia).map(txt))];
    return distintas.length === 1 ? distintas[0] : '';
  }

  /* ---------- Horario esperado y excepciones ---------- */
  function horarios() {
    if (!estado.horarios) { try { estado.horarios = JSON.parse(leerLS(LS_HORARIOS) || '[]') || []; } catch (e) { estado.horarios = []; } }
    return estado.horarios;
  }
  function fijarHorarios(lista) {
    estado.horarios = (lista || []).filter(a => a && a.tipo === 'horario');
    guardarLS(LS_HORARIOS, JSON.stringify(estado.horarios));
    estado.versionDatos = (estado.versionDatos || 0) + 1;   // el Resumen se vuelve a calcular
  }
  async function cargarHorarios() {
    try { const r = await llamarGet({ accion: 'ajustes' }); if (Array.isArray(r.ajustes)) fijarHorarios(r.ajustes); }
    catch (e) { /* se queda con lo guardado en esta compu */ }
  }
  /** Proveedor "canónico" (Teylem = Grupo L) para comparar con las excepciones. */
  const canonProv = (p) => { const n = mayus(p).normalize('NFD').replace(/[̀-ͯ]/g, ''); return /^(GRUPO L|TEYLEM)\b/.test(n) ? 'GRUPO L' : n.replace(/\s+(S\.?A\.?|S\.?R\.?L\.?)$/, ''); };
  /** Horario que corresponde a ese reclamo: { inicio, fin, exc (la excepción que se usó, si hay) }. */
  function horarioPara(escuela, proveedor, iso) {
    const lista = horarios();
    const base = lista.filter(a => a.modo === 'base' && (!iso || a.desde <= iso))
      .sort((a, b) => (a.desde + a.creado).localeCompare(b.desde + b.creado)).pop();
    const escB = escuela ? escuelaBase(escuela) : '', prov = canonProv(proveedor);
    const exc = lista.filter(a => a.modo === 'exc' && iso && a.desde <= iso && (!a.hasta || iso <= a.hasta) && (
        (a.alcance && a.alcance.modo === 'proveedor' && prov && canonProv(a.alcance.proveedor) === prov) ||
        (a.alcance && (a.alcance.escuelas || []).some(n => escuelaBase(n) === escB))))
      .sort((a, b) => String(a.creado).localeCompare(String(b.creado))).pop();
    const h = exc || base || HORARIO_DEFECTO;
    return { inicio: h.inicio, fin: h.fin, exc: exc || null };
  }
  /** Cómo llegó: { hora, especial, horario, demora (min después del fin), cuando: 'tarde' | 'en horario' | 'antes' }. */
  function evaluarLlegada(horaTxt, escuela, proveedor, fecha) {
    const h = leerHora(horaTxt);
    if (!h) return null;
    const hor = horarioPara(escuela, proveedor, fecha ? isoDe(fecha) : '');
    const ini = aMin(hor.inicio), fin = aMin(hor.fin);
    const cuando = h.min > fin ? 'tarde' : (h.min < ini ? 'antes' : 'en horario');
    return Object.assign({}, h, { horario: hor, demora: Math.max(0, h.min - fin), cuando });
  }
  const evaluarReclamo = (r) => evaluarLlegada(r.v[C.HORA], r.v[C.ESCUELA], r.est.proveedor, r.fecha);
  const textoHorario = (hor) => `${horaCorta(hor.inicio)} a ${horaCorta(hor.fin)}${hor.exc ? ' (excepción)' : ''}`;
  function textoEvaluacion(ev) {
    if (!ev) return '';
    const base = ev.cuando === 'tarde' ? `${textoDemora(ev.demora)} tarde` : ev.cuando === 'antes' ? 'antes del horario' : 'dentro del horario';
    return `${horaVer(ev.hora)} · ${base} (horario ${textoHorario(ev.horario)})${ev.especial ? ' · especial, no se cuenta' : ''}`;
  }

  /* ---------- Campo en "Nuevo reclamo" ---------- */
  function horaVisibleForm() { return estado.form.categoria === 'ALIMENTOS' && esFueraHorario(estado.form.motivo) && !estado.multi; }
  function pintarCampoHora() {
    const fila = $('filaHora');
    if (!fila) return;
    const ver = horaVisibleForm();
    fila.style.display = ver ? '' : 'none';
    if (!ver) return;
    const esc0 = estado.escuela ? estado.escuela.nombre : '';
    const hor = horarioPara(esc0, $('fProveedor').value, $('fFecha').value);
    const hora = $('fHora').value;
    const det = horaDelDetalle($('fDetalle').value);
    const partes = [`Horario esperado: <strong>${esc(textoHorario(hor))}</strong>${hor.exc && hor.exc.nota ? ` · ${esc(hor.exc.nota)}` : ''} <button type="button" class="rec-link" data-horario>Cambiar</button>`];
    if (det && det !== hora) partes.push(`📝 En el texto dice <strong>${esc(horaVer(det))}</strong> <button type="button" class="rec-hora-usar" data-usar="${det}">Usar ${esc(horaVer(det))}</button>`);
    const ev = hora ? evaluarLlegada(hora, esc0, $('fProveedor').value, parsearFecha(String($('fFecha').value).split('-').reverse().join('/'))) : null;
    if (ev && $('fHoraEspecial').checked) partes.push('Entrega especial: no se cuenta en las estadísticas');
    else if (ev && ev.cuando === 'tarde') partes.push(`⏰ ${esc(textoDemora(ev.demora))} tarde`);
    else if (ev) partes.push(`<span class="rec-hora-ojo">⚠️ ${esc(horaVer(hora))} está ${ev.cuando === 'antes' ? 'antes del' : 'dentro del'} horario esperado (${esc(textoHorario(ev.horario))}). ¿Es correcto?</span>`);
    $('ayudaHora').innerHTML = partes.join('<br>');
    const u = $('ayudaHora').querySelector('[data-usar]');
    if (u) u.addEventListener('click', () => { $('fHora').value = u.dataset.usar; actualizarResumen(); mostrarControles(); });
    $('ayudaHora').querySelector('[data-horario]').addEventListener('click', () => abrirHorarios({ escuela: estado.escuela, proveedor: $('fProveedor').value, fecha: $('fFecha').value }));
  }
  function horaDelFormulario() {
    if (!horaVisibleForm() || !$('fHora').value) return '';
    return textoHora($('fHora').value, $('fHoraEspecial').checked);
  }

  /* ---------- Ventana del reclamo ---------- */
  function prepararHoraModal(r) {
    const h = leerHora(r.v[C.HORA]);
    $('mHora').value = h ? h.hora : '';
    $('mHoraEspecial').checked = !!(h && h.especial);
    pintarHoraModal();
  }
  function pintarHoraModal() {
    const r = estado.modal;
    if (!r || !$('campoMHora')) return;
    const mot = $('mMotivo').value || r.est.motivo;
    const ver = esFueraHorario(mot) || !!leerHora(r.v[C.HORA]) || !!$('mHora').value;
    $('campoMHora').style.display = ver ? '' : 'none';
    if (!ver) return;
    const hora = $('mHora').value;
    const det = horaDelDetalle(r.v[C.DETALLE]);
    const ev = hora ? evaluarLlegada(hora, r.v[C.ESCUELA], $('mProveedor').value || r.est.proveedor, r.fecha) : null;
    const hor = ev ? ev.horario : horarioPara(r.v[C.ESCUELA], r.est.proveedor, r.fecha ? isoDe(r.fecha) : '');
    const partes = [`Horario esperado: ${esc(textoHorario(hor))}`];
    if (ev && $('mHoraEspecial').checked) partes.push('Entrega especial: no se cuenta en las estadísticas');
    else if (ev) partes.push(ev.cuando === 'tarde' ? `⏰ ${esc(textoDemora(ev.demora))} tarde` : `<span class="rec-hora-ojo">⚠️ Está ${ev.cuando === 'antes' ? 'antes del' : 'dentro del'} horario. ¿Es correcto?</span>`);
    if (det && det !== hora) partes.push(`📝 En el texto dice ${esc(horaVer(det))} <button type="button" class="rec-hora-usar" data-usar="${det}">Usar</button>`);
    $('mAyudaHora').innerHTML = partes.join(' · ');
    const u = $('mAyudaHora').querySelector('[data-usar]');
    if (u) u.addEventListener('click', () => { $('mHora').value = u.dataset.usar; pintarHoraModal(); });
  }
  /** Cambio de hora elegido en la ventana (undefined si no cambió). */
  function cambioHoraModal(r) {
    if (!$('campoMHora') || $('campoMHora').style.display === 'none') return undefined;
    const nueva = $('mHora').value ? textoHora($('mHora').value, $('mHoraEspecial').checked) : '';
    const h = leerHora(r.v[C.HORA]);
    const antes = h ? textoHora(h.hora, h.especial) : '';
    return nueva === antes ? undefined : nueva;
  }

  /* ---------- Revisar datos: completar la hora de los reclamos viejos ---------- */
  /** Reclamos de Fuera de horario sin hora, con una hora clara en el texto (y no descartados). */
  function propuestasHora() {
    const desc = descartadasHora();
    return estado.reclamos.filter(r => esFueraHorario(r.est.motivo) && !leerHora(r.v[C.HORA]) && !desc.has(r.fila))
      .map(r => { const h = horaDelDetalle(r.v[C.DETALLE]); return h ? { r, hora: h } : null; }).filter(Boolean);
  }
  const CLAVE_DESC_HORA = 'sae-horas-descartadas';
  function descartadasHora() {
    if (!estado._descHora) { try { estado._descHora = new Set(JSON.parse(leerLS(CLAVE_DESC_HORA) || '[]')); } catch (e) { estado._descHora = new Set(); } }
    return estado._descHora;
  }
  /** Guarda la hora de varios reclamos (se ve al instante, se guarda en segundo plano, se puede deshacer). */
  function guardarHoras(items, texto) {
    if (versionScriptActual() && versionScriptActual() < VERSION_HORA) { toast(`⚠️ Para guardar la hora de llegada hay que actualizar el script de Google (versión ${VERSION_HORA}).`, 'error'); return; }
    const anteriores = [];
    items.forEach(({ r, hora }) => {
      const actual = estado.reclamos.find(x => x.fila === r.fila) || r;
      const v = actual.v.slice();
      v[C.HORA] = hora;
      anteriores.push(reemplazarReclamo(actual, prepararReclamo({ fila: actual.fila, v })));
      encolarActualizacion({ tipo: 'actualizar', antes: tomarAntes(actual.v, 'actualizar'),
        datos: { escuela: actual.v[C.ESCUELA], detalle: actual.v[C.DETALLE] },
        pedido: { accion: 'actualizar', fila: actual.fila, huella: huellaDe(actual.v), cambios: { horaLlegada: hora } } });
    });
    registrarDeshacer(anteriores, texto);
    aplicarFiltros(); actualizarBadge(); pintarCola();
    toast(`✔️ ${texto}. Se guarda en la hoja en segundo plano.`, 'ok');
  }

  /* ---------- Ventana "⏰ Horario de entrega" (horario esperado y excepciones) ---------- */
  function abrirHorarios(opc) {
    opc = opc || {};
    let caja = $('modalHorarios');
    if (caja) caja.remove();
    caja = document.createElement('div');
    caja.id = 'modalHorarios';
    caja.className = 'rec-modal';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.innerHTML = `<div class="rec-modal-caja rec-hor-caja">
      <div class="rec-modal-cabecera"><h3>⏰ Horario de entrega</h3><button type="button" class="rec-cerrar" aria-label="Cerrar">&times;</button></div>
      <div class="rec-modal-cuerpo" data-cuerpo></div>
      <div class="rec-modal-pie"><button type="button" class="btn btn-secondary" data-cerrar>Cerrar</button></div></div>`;
    document.body.appendChild(caja);
    document.body.classList.add('rec-modal-abierto');
    const cerrar = () => { caja.remove(); if (!estado.modal) document.body.classList.remove('rec-modal-abierto'); document.removeEventListener('keydown', tecla); if ($('tabResumen').classList.contains('active')) pintarResumen(); pintarCampoHora(); if (estado.modal) pintarHoraModal(); };
    const tecla = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } };
    document.addEventListener('keydown', tecla);
    caja.querySelector('.rec-cerrar').addEventListener('click', cerrar);
    caja.querySelector('[data-cerrar]').addEventListener('click', cerrar);
    let empezo = false;
    caja.addEventListener('mousedown', (ev) => { empezo = ev.target === caja; });
    caja.addEventListener('click', (ev) => { if (empezo && ev.target === caja) cerrar(); empezo = false; });
    const cuerpo = caja.querySelector('[data-cuerpo]');
    const hoy = hoyISO();
    let excEscuelas = new Map();
    if (opc.escuela && opc.escuela.nombre) excEscuelas.set(opc.escuela.nombre, opc.escuela);

    const pintar = () => {
      const base = horarioPara('', '', hoy);
      const lista = horarios();
      const bases = lista.filter(a => a.modo === 'base').sort((a, b) => b.desde.localeCompare(a.desde));
      const excs = lista.filter(a => a.modo === 'exc').sort((a, b) => b.desde.localeCompare(a.desde));
      const fechasTxt = (a) => !a.hasta ? `desde el ${fechaCorta(parsearFecha(a.desde.split('-').reverse().join('/')))}, sin fecha de fin`
        : a.hasta === a.desde ? `solo el ${fechaCorta(parsearFecha(a.desde.split('-').reverse().join('/')))}`
        : `del ${fechaCorta(parsearFecha(a.desde.split('-').reverse().join('/')))} al ${fechaCorta(parsearFecha(a.hasta.split('-').reverse().join('/')))}`;
      const paraTxt = (a) => a.alcance && a.alcance.modo === 'proveedor' ? `Todas las escuelas de ${a.alcance.proveedor}`
        : ((a.alcance && a.alcance.escuelas) || []).join(', ');
      const provs = [...new Set(proveedoresConocidos().map(canonProv))].filter(Boolean).sort();
      cuerpo.innerHTML = `
        <p class="rec-hor-ayuda">Contra este horario se mide cuánto tarde llegó cada entrega (en el Resumen y en cada reclamo). Lo cambia cualquiera con la clave y se ve en todas las compus.</p>
        <section class="rec-hor-sec">
          <h4>Horario esperado (para todas)</h4>
          <p class="rec-hor-actual">Ahora: <strong>${esc(horaCorta(base.inicio))} a ${esc(horaCorta(base.fin))}</strong>${bases.length ? '' : ' <small>(el de siempre, no se cambió)</small>'}</p>
          <div class="rec-hor-form">
            <label>De <input type="time" data-b-ini value="${esc(base.inicio)}"></label>
            <label>a <input type="time" data-b-fin value="${esc(base.fin)}"></label>
            <label>Vale desde <input type="date" data-b-desde value="${hoy}"></label>
            <button type="button" class="btn btn-primary btn-sm" data-b-guardar>Guardar horario</button>
          </div>
          <small class="rec-hint">Los reclamos de antes de esa fecha se siguen midiendo con el horario que había.</small>
          ${bases.length ? `<ul class="rec-hor-lista">${bases.map(a => `<li><span><strong>${esc(horaCorta(a.inicio))} a ${esc(horaCorta(a.fin))}</strong> · desde el ${esc(fechaCorta(parsearFecha(a.desde.split('-').reverse().join('/'))))}${a.nota ? ' · ' + esc(a.nota) : ''}</span><button type="button" class="rec-link" data-quitar="${esc(a.id)}">Quitar</button></li>`).join('')}</ul>` : ''}
        </section>
        <section class="rec-hor-sec">
          <h4>Excepciones (${excs.length})</h4>
          <small class="rec-hint">Para escuelas o proveedores que tienen otro horario acordado, o para un día especial (paro, acto, feriado puente…).</small>
          ${excs.length ? `<ul class="rec-hor-lista">${excs.map(a => `<li><span><strong>${esc(horaCorta(a.inicio))} a ${esc(horaCorta(a.fin))}</strong> · ${esc(paraTxt(a))} · ${esc(fechasTxt(a))}${a.nota ? ' · ' + esc(a.nota) : ''}</span><button type="button" class="rec-link" data-quitar="${esc(a.id)}">Quitar</button></li>`).join('')}</ul>` : ''}
          <div class="rec-hor-nueva">
            <div class="rec-hor-form">
              <label>Para <select data-e-para><option value="escuelas">Una o varias escuelas</option><option value="proveedor">Todas las de un proveedor</option></select></label>
              <label data-e-provcampo style="display:none;">Proveedor <select data-e-prov>${provs.map(p => `<option${canonProv(opc.proveedor) === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
            </div>
            <div data-e-esccampo>
              <div class="rec-hor-chips" data-e-chips></div>
              <div class="rec-hor-buscar"><input type="text" data-e-buscar placeholder="Buscar escuela para agregar…" autocomplete="off"><div class="rec-hor-res" data-e-res style="display:none;"></div></div>
            </div>
            <div class="rec-hor-form">
              <label>De <input type="time" data-e-ini value="08:00"></label>
              <label>a <input type="time" data-e-fin value="09:00"></label>
            </div>
            <div class="rec-hor-form">
              <label>Cuándo <select data-e-cuando><option value="dia">Un solo día</option><option value="periodo">Un período</option><option value="siempre">Sin fecha de fin</option></select></label>
              <label>Desde <input type="date" data-e-desde value="${esc(opc.fecha || hoy)}"></label>
              <label data-e-hastacampo style="display:none;">Hasta <input type="date" data-e-hasta value="${esc(opc.fecha || hoy)}"></label>
            </div>
            <label class="rec-hor-nota">Nota <span class="rec-opcional">opcional</span><input type="text" data-e-nota maxlength="200" placeholder="Ej.: horario acordado con la directora"></label>
            <button type="button" class="btn btn-primary btn-sm" data-e-guardar>＋ Agregar excepción</button>
          </div>
        </section>
        <div data-msj></div>`;
      const q = (s) => cuerpo.querySelector(s);
      const msj = (t, ok) => { q('[data-msj]').innerHTML = t ? `<p class="rec-hor-msj${ok ? ' ok' : ''}">${t}</p>` : ''; };
      const pintarChips = () => {
        q('[data-e-chips]').innerHTML = excEscuelas.size ? [...excEscuelas.keys()].map(n => `<span class="rec-multi-chip">${esc(n)}<button type="button" data-q="${esc(n)}" aria-label="Quitar ${esc(n)}">✕</button></span>`).join('')
          : '<small class="rec-hint">Todavía no elegiste escuelas.</small>';
        q('[data-e-chips]').querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { excEscuelas.delete(b.dataset.q); pintarChips(); }));
      };
      pintarChips();
      autocompletarEscuela(q('[data-e-buscar]'), q('[data-e-res]'), (e) => { excEscuelas.set(e.nombre, e); q('[data-e-buscar]').value = ''; pintarChips(); });
      q('[data-e-para]').addEventListener('change', (ev) => {
        const prov = ev.target.value === 'proveedor';
        q('[data-e-provcampo]').style.display = prov ? '' : 'none';
        q('[data-e-esccampo]').style.display = prov ? 'none' : '';
      });
      q('[data-e-cuando]').addEventListener('change', (ev) => { q('[data-e-hastacampo]').style.display = ev.target.value === 'periodo' ? '' : 'none'; });
      const puede = () => {
        if (!estado.clave && estado.url) { msj('Para cambiar el horario hay que entrar con la clave.'); return false; }
        if (versionScriptActual() && versionScriptActual() < VERSION_HORA) { msj(`Para guardar horarios hay que actualizar el script de Google (versión ${VERSION_HORA}).`); return false; }
        return true;
      };
      const enviar = async (boton, ajuste, okTxt) => {
        boton.disabled = true; const t0 = boton.textContent; boton.textContent = 'Guardando…';
        try {
          const r = await llamarPost({ accion: 'ajusteGuardar', ajuste });
          fijarHorarios(r.ajustes || horarios().concat([r.ajuste]));
          pintar(); msj(okTxt, true);
        } catch (err) {
          const m = String(err && err.message || err);
          msj(/desconocido/i.test(m) ? `Para guardar horarios hay que actualizar el script de Google (versión ${VERSION_HORA}).` : esc(mensajeError(err)));
          boton.disabled = false; boton.textContent = t0;
        }
      };
      q('[data-b-guardar]').addEventListener('click', (ev) => {
        if (!puede()) return;
        const ini = q('[data-b-ini]').value, fin = q('[data-b-fin]').value, desde = q('[data-b-desde]').value;
        if (!ini || !fin || aMin(fin) <= aMin(ini)) { msj('El horario no es válido: el "a" tiene que ser después del "De".'); return; }
        if (!desde) { msj('Elegí desde qué fecha vale.'); return; }
        enviar(ev.target, { tipo: 'horario', modo: 'base', inicio: ini, fin, desde, resumen: `Horario esperado de entrega: ${horaCorta(ini)} a ${horaCorta(fin)}` }, `✔️ Horario guardado: ${horaCorta(ini)} a ${horaCorta(fin)} desde el ${fechaCorta(parsearFecha(desde.split('-').reverse().join('/')))}.`);
      });
      q('[data-e-guardar]').addEventListener('click', (ev) => {
        if (!puede()) return;
        const porProv = q('[data-e-para]').value === 'proveedor';
        const ini = q('[data-e-ini]').value, fin = q('[data-e-fin]').value;
        const cuando = q('[data-e-cuando]').value, desde = q('[data-e-desde]').value;
        const hasta = cuando === 'dia' ? desde : cuando === 'periodo' ? q('[data-e-hasta]').value : '';
        if (!porProv && !excEscuelas.size) { msj('Agregá al menos una escuela (o elegí "Todas las de un proveedor").'); return; }
        if (!ini || !fin || aMin(fin) <= aMin(ini)) { msj('El horario no es válido: el "a" tiene que ser después del "De".'); return; }
        if (!desde || (cuando === 'periodo' && (!hasta || hasta < desde))) { msj('Revisá las fechas.'); return; }
        const alcance = porProv ? { modo: 'proveedor', proveedor: q('[data-e-prov]').value } : { modo: 'escuelas', escuelas: [...excEscuelas.keys()] };
        const quien = porProv ? `todas las de ${alcance.proveedor}` : (alcance.escuelas.length <= 3 ? alcance.escuelas.join(', ') : `${alcance.escuelas.length} escuelas`);
        enviar(ev.target, { tipo: 'horario', modo: 'exc', inicio: ini, fin, desde, hasta, alcance, nota: q('[data-e-nota]').value.trim(),
          resumen: `Horario ${horaCorta(ini)} a ${horaCorta(fin)} para ${quien}` }, `✔️ Excepción guardada: ${horaCorta(ini)} a ${horaCorta(fin)} para ${esc(quien)}.`);
        excEscuelas = new Map();
      });
      cuerpo.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', async () => {
        if (!puede() || !confirm('¿Quitar este horario? Los reclamos se vuelven a medir con el horario que corresponda.')) return;
        b.disabled = true; b.textContent = 'Quitando…';
        try { const r = await llamarPost({ accion: 'ajusteQuitar', id: b.dataset.quitar }); fijarHorarios(r.ajustes || horarios().filter(a => a.id !== b.dataset.quitar)); pintar(); msj('✔️ Quitado.', true); }
        catch (err) { msj(esc(mensajeError(err))); b.disabled = false; b.textContent = 'Quitar'; }
      }));
    };
    pintar();
    cargarHorarios().then(() => { if (document.body.contains(caja)) pintar(); });
  }

  /** Para el Excel: [hora, "3 h 40 min tarde" / "dentro del horario"]. */
  function celdasHora(r) {
    const ev = r.v[C.HORA] ? evaluarReclamo(r) : null;
    if (!ev) return ['', ''];
    return [ev.hora + (ev.especial ? ' (especial)' : ''), ev.especial ? 'no se cuenta' : ev.cuando === 'tarde' ? textoDemora(ev.demora) + ' tarde' : ev.cuando === 'antes' ? 'antes del horario' : 'dentro del horario'];
  }

  /** (2.9.0) Bloque del Excel del Resumen con la tarjeta de fuera de horario. */
  function bloqueFueraHorario(A) {
    const d = datosFueraHorario(A);
    const base = horarioPara('', '', hoyISO());
    return {
      titulo: `Entregas fuera de horario (horario esperado ${horaCorta(base.inicio)} a ${horaCorta(base.fin)})`,
      columnas: [{ t: 'Proveedor', ancho: 22 }, { t: 'Reclamos', tipo: 'num' }, { t: 'Con hora cargada', tipo: 'num' }, { t: 'Demora promedio (min)', tipo: 'num' }, { t: 'Peor demora (min)', tipo: 'num' }]
        .concat(FRANJAS_DEMORA.map(f => ({ t: f.txt, tipo: 'num' }))),
      filas: d.filas.map(p => [p.prov, p.total, p.conHora, p.promedio != null ? p.promedio : '', p.peor ? p.peor.demora : ''].concat(FRANJAS_DEMORA.map(f => p.franjas[f.id] || ''))),
      notas: [`La demora se cuenta desde el final del horario esperado (o de la excepción cargada para esa escuela, proveedor o día). ${d.especiales ? d.especiales + ' entrega(s) especial(es) no se cuentan. ' : ''}${d.enHorario ? d.enHorario + ' llegaron dentro del horario. ' : ''}`.trim()]
    };
  }

  /* ---------- Resumen: tarjeta "⏰ Entregas fuera de horario" ---------- */
  const FRANJAS_DEMORA = [
    { id: 'h1', txt: 'Hasta 1 h tarde', hasta: 60 },
    { id: 'h2', txt: '1 a 2 h', hasta: 120 },
    { id: 'h3', txt: '2 a 3 h', hasta: 180 },
    { id: 'h4', txt: 'Más de 3 h', hasta: Infinity }
  ];
  /** Datos de la tarjeta para los puntos del período (solo los reclamos cargados con todo su detalle). */
  function datosFueraHorario(actual) {
    const fuera = actual.filter(x => x.mot === MOT_FUERA);
    const porProv = {};
    let conHora = 0, especiales = 0, enHorario = 0;
    fuera.forEach(x => {
      const p = porProv[x.prov] || (porProv[x.prov] = { prov: x.prov, total: 0, conHora: 0, demoras: [], peor: null, franjas: {} });
      p.total++;
      const ev = x.lleg;
      if (!ev) return;
      if (ev.especial) { especiales++; return; }
      conHora++; p.conHora++;
      if (ev.cuando !== 'tarde') { enHorario++; p.enHorario = (p.enHorario || 0) + 1; return; }
      p.demoras.push(ev.demora);
      if (!p.peor || ev.demora > p.peor.demora) p.peor = ev;
      const f = FRANJAS_DEMORA.find(z => ev.demora <= z.hasta);
      p.franjas[f.id] = (p.franjas[f.id] || 0) + 1;
    });
    const filas = Object.values(porProv).map(p => Object.assign(p, {
      promedio: p.demoras.length ? Math.round(p.demoras.reduce((a, b) => a + b, 0) / p.demoras.length) : null
    })).sort((a, b) => b.total - a.total);
    return { total: fuera.length, conHora, especiales, enHorario, filas };
  }
  function pintarFueraHorario(actual, etqP) {
    const cont = $('resFueraHorario');
    if (!cont) return;
    const d = datosFueraHorario(actual);
    const base = horarioPara('', '', hoyISO());
    $('resFueraNota').innerHTML = `Horario esperado: <strong>${esc(horaCorta(base.inicio))} a ${esc(horaCorta(base.fin))}</strong>` +
      `${horarios().some(a => a.modo === 'exc') ? ' (con excepciones)' : ''}. La demora se cuenta desde el final del horario. ` +
      (d.total ? `${nf(d.conHora)} de ${nf(d.total)} reclamo${d.total === 1 ? '' : 's'} tienen la hora cargada` +
        `${d.especiales ? ` · ${nf(d.especiales)} especial${d.especiales === 1 ? '' : 'es'} (no se cuentan)` : ''}` +
        `${d.enHorario ? ` · ${nf(d.enHorario)} dentro del horario` : ''}.` : '') +
      ((d.total - d.conHora - d.especiales) > 0 ? ' Las que faltan se completan en Buscar › 🧹 Revisar datos › ⏰ Horas de llegada.' : '');
    if (!d.total) { cont.innerHTML = `<p class="g-vacio">No hay reclamos de entregas fuera de horario en ${esc(etqP)}.</p>`; return; }
    const celdaF = (p, f) => p.franjas[f.id] ? nf(p.franjas[f.id]) : '–';
    cont.innerHTML = `<div class="rec-res-scroll"><table class="rec-res-tabla res-fuera-tabla">
      <thead><tr><th>Proveedor</th><th class="num">Reclamos</th><th class="num">Con hora</th><th class="num">Demora promedio</th><th class="num">Peor</th>
        ${FRANJAS_DEMORA.map(f => `<th class="num">${esc(f.txt)}</th>`).join('')}</tr></thead>
      <tbody>${d.filas.map(p => `<tr><th scope="row">${puntoProv(p.prov)}${esc(p.prov)}</th><td class="num">${nf(p.total)}</td><td class="num">${nf(p.conHora)}</td>
        <td class="num">${p.promedio != null ? esc(textoDemora(p.promedio)) : '–'}</td>
        <td class="num">${p.peor ? `${esc(textoDemora(p.peor.demora))} <small>(llegó ${esc(horaVer(p.peor.hora))})</small>` : '–'}</td>
        ${FRANJAS_DEMORA.map(f => `<td class="num">${celdaF(p, f)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  /* ======================================================================
   * EVENTOS
   * ====================================================================== */
  function iniciarEventos() {
    // Pestañas
    document.querySelectorAll('.rec-tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.rec-tab').forEach(x => x.classList.toggle('active', x === t));
      document.querySelectorAll('.rec-tabpane').forEach(p => p.classList.toggle('active', p.id === t.dataset.tab));
      if (t.dataset.tab === 'tabResumen') pintarResumen();
    }));

    // Modo oscuro (mismo que el buscador)
    const icono = $('darkModeIcon');
    const pintarIcono = () => { icono.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙'; };
    pintarIcono();
    $('btnDarkMode').addEventListener('click', () => {
      const oscuro = document.documentElement.classList.toggle('dark');
      guardarLS('sae-darkmode', oscuro ? 'true' : 'false');
      pintarIcono();
    });

    // Conexión
    $('formClave').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const c = $('inputClave').value.trim();
      if (c) conectar(c);
    });
    $('btnCerrarSesion').addEventListener('click', () => {
      borrarLS(CLAVE_LS);
      estado.clave = '';
      $('inputClave').value = '';
      mostrarConexion();
    });

    // Escuela
    const inEsc = $('fEscuela');
    inEsc.addEventListener('input', () => {
      estado.escuela = null;
      $('infoEscuela').style.display = 'none';
      pintarAbiertosEscuela();
      if (inEsc.value.trim()) mostrarListaEscuelas(); else $('listaEscuelas').style.display = 'none';
      actualizarResumen();
    });
    inEsc.addEventListener('focus', () => { if (inEsc.value.trim() && !estado.escuela) mostrarListaEscuelas(); });
    inEsc.addEventListener('blur', () => setTimeout(() => {
      $('listaEscuelas').style.display = 'none';
      // Si escribió el nombre exacto, se toma sin necesidad de elegirlo
      if (!estado.escuela && inEsc.value.trim()) {
        const exacta = ESCUELAS.find(e => norm(e.nombre) === norm(inEsc.value));
        if (exacta) elegirEscuela(exacta);
      }
    }, 120));
    inEsc.addEventListener('keydown', (ev) => {
      const items = [...$('listaEscuelas').querySelectorAll('.rec-dropdown-item')];
      if (!items.length || $('listaEscuelas').style.display === 'none') return;
      let i = items.findIndex(x => x.classList.contains('activo'));
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        items[i] && items[i].classList.remove('activo');
        i = ev.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
        items[i].classList.add('activo');
        items[i].scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const res = buscarEscuelas(inEsc.value);
        if (res[Math.max(0, i)]) elegirEscuela(res[Math.max(0, i)]);
      } else if (ev.key === 'Escape') {
        $('listaEscuelas').style.display = 'none';
      }
    });

    $('fServicio').addEventListener('change', () => { alCambiarServicio(); actualizarResumen(); });
    $('fFecha').addEventListener('change', () => { alCambiarServicio(); actualizarResumen(); revisarDuplicado(); mostrarControles(); });
    ['fCupoDefectuoso', 'fCupoTotal'].forEach(id => $(id).addEventListener('input', mostrarControles));
    ['fProveedor', 'fProducto', 'fPatologia', 'fResponsable'].forEach(id =>
      $(id).addEventListener('change', () => { actualizarResumen(); actualizarSugerencia(); }));

    let tSug;
    $('fDetalle').addEventListener('input', () => {
      $('fDetalle').classList.remove('invalido'); marcarError('detalle', '');
      clearTimeout(tSug);
      tSug = setTimeout(() => { actualizarSugerencia(); pintarCampoHora(); }, 250);
    });
    $('btnAplicarSugerencia').addEventListener('click', aplicarSugerencia);
    // (2.9.0) Hora de llegada
    ['fHora', 'fHoraEspecial'].forEach(id => $(id).addEventListener('change', () => { actualizarResumen(); mostrarControles(); }));
    $('fHora').addEventListener('input', () => pintarCampoHora());
    ['mHora', 'mHoraEspecial', 'mProveedor'].forEach(id => $(id).addEventListener('change', pintarHoraModal));
    $('mHora').addEventListener('input', pintarHoraModal);
    $('mMotivo').addEventListener('change', pintarHoraModal);
    $('mCategoria').addEventListener('change', pintarHoraModal);
    $('mHoraBorrar').addEventListener('click', () => { $('mHora').value = ''; $('mHoraEspecial').checked = false; pintarHoraModal(); });
    const bHor = $('btnHorarios'); if (bHor) bHor.addEventListener('click', () => abrirHorarios({}));

    $('formReclamo').addEventListener('submit', guardarReclamo);
    $('btnMulti').addEventListener('click', abrirMulti);
    $('btnMultiSalir').addEventListener('click', () => salirMulti(true));
    $('multiGrupo').addEventListener('change', (ev) => { if (ev.target.value) agregarGrupoMulti(ev.target.value); ev.target.value = ''; });
    $('multiBuscar').addEventListener('input', () => { if ($('multiBuscar').value.trim()) mostrarListaMulti(); else $('multiLista').style.display = 'none'; });
    $('multiBuscar').addEventListener('blur', () => setTimeout(() => { $('multiLista').style.display = 'none'; }, 150));
    // ↑ ↓ para moverse y Enter para agregar la marcada (la primera, si no se movió)
    if (window.SAE_TECLADO) {
      SAE_TECLADO.lista($('multiBuscar'), $('multiLista'), { items: '.rec-dropdown-item', clase: 'activo',
        elegir: (it) => it.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) });
    }
    $('fServicio').addEventListener('change', () => { if (estado.multi) llenarGruposMulti(); });
    $('btnLimpiar').addEventListener('click', () => { limpiarFormulario(false); avisoBorrador(false); });
    // (1.2.0) Borrador: cualquier cosa que se escriba o elija en el formulario
    $('formReclamo').addEventListener('input', programarBorrador);
    $('formReclamo').addEventListener('change', programarBorrador);

    // Buscador
    let tBus;
    $('bTexto').addEventListener('input', () => { clearTimeout(tBus); tBus = setTimeout(aplicarFiltros, 200); });
    ['bDesde', 'bHasta', 'bProveedor', 'bServicio', 'bCategoria', 'bMotivo', 'bProblema', 'bProducto', 'bEstado', 'bZona', 'bPatologia', 'bEstimado']
      .forEach(id => $(id).addEventListener('change', () => {
        if (['bDesde', 'bHasta', 'bEstado'].includes(id)) {
          estado.filtroRapido = '';
          document.querySelectorAll('[data-rapido]').forEach(b => b.classList.remove('activo'));
        }
        aplicarFiltros();
      }));
    document.querySelectorAll('[data-rapido]').forEach(b => b.addEventListener('click', () => filtroRapido(b.dataset.rapido)));
    $('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
    $('btnOrden').addEventListener('click', cambiarOrden);
    $('btnExportar').addEventListener('click', exportarCSV);
    $('btnRecargar').addEventListener('click', () => cargarReclamos());
    $('btnVerMas').addEventListener('click', () => { estado.mostrados += POR_PAGINA; pintarResultados(); });

    // Modal
    $('btnCerrarModal').addEventListener('click', cerrarModal);
    $('btnCancelarModal').addEventListener('click', cerrarModal);
    if ($('btnBorrarReclamo')) $('btnBorrarReclamo').addEventListener('click', borrarReclamo);
    conectarEscuelaModal();   // (2.8.7)
    // (2.8.0) Elegir varios
    $('btnElegirVarios').addEventListener('click', () => modoSeleccion(!estado.seleccion));
    $('selSalir').addEventListener('click', () => modoSeleccion(false));
    $('selNinguno').addEventListener('click', () => { if (estado.seleccion) { estado.seleccion.clear(); pintarResultados(); pintarBarraSeleccion(); } });
    $('selTodos').addEventListener('click', () => { if (estado.seleccion) { estado.filtrados.forEach(r => estado.seleccion.add(r.fila)); pintarResultados(); pintarBarraSeleccion(); } });
    document.querySelectorAll('#barraSeleccion .rec-sel-est').forEach(b => b.addEventListener('click', () => cambiarEstadoElegidos(b.dataset.estado)));
    $('selBorrar').addEventListener('click', borrarElegidos);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && estado.seleccion && !estado.modal) modoSeleccion(false); });
    // (2.8.0) Producto escrito: al salir del campo se revisa si existe
    $('fProducto').addEventListener('change', () => { const ex = productoElegido(); if (ex) $('fProducto').value = capitalizar(ex); revisarProducto(); });
    $('fProducto').addEventListener('input', () => { if ($('productoAviso')) $('productoAviso').innerHTML = ''; });
    $('btnGuardarModal').addEventListener('click', guardarModal);
    // (2.4.0) Al completar lo que faltaba, se apaga la marca
    ['mCategoria', 'mMotivo'].forEach(id => $(id).addEventListener('change', () => {
      if ($('mCategoria').value && $('mMotivo').value) $('campoMClasif').classList.remove('rec-falta');
    }));
    ['mProveedor', 'mServicio'].forEach(id => $(id).addEventListener('change', () => {
      $(id).classList.toggle('rec-falta-sel', !$(id).value);
      if ($('mProveedor').value && $('mServicio').value) $('campoMProvServ').classList.remove('rec-falta');
    }));
    $('modalDetalle').addEventListener('click', (ev) => { if (ev.target === $('modalDetalle')) cerrarModal(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && estado.modal) cerrarModal(); });
  }

  /* ======================================================================
   * INICIO
   * ====================================================================== */
  function iniciar() {
    // En el celular los filtros arrancan cerrados para no ocupar toda la pantalla
    if (window.matchMedia('(max-width: 760px)').matches) document.querySelector('.rec-mas-filtros').removeAttribute('open');
    iniciarEventos();
    iniciarResumen();
    iniciarFormulario();
    // Abrir directo en una pestaña: reclamos.html#buscar
    if (location.hash === '#buscar') document.querySelector('[data-tab="tabBuscar"]').click();
    if (location.hash === '#resumen') document.querySelector('[data-tab="tabResumen"]').click();
    // Escuela precargada: reclamos.html?escuela=EP%2011
    const pre = new URLSearchParams(location.search).get('escuela');
    // (1.2.0) Si había un reclamo a medio cargar (hoy), vuelve tal cual; si no, la escuela precargada
    const conBorrador = restaurarBorrador();
    if (pre) {
      const e = ESCUELAS.find(x => norm(x.nombre) === norm(pre));
      if (e && !conBorrador) elegirEscuela(e);
      // Desde la ficha ("Ver todos"): la búsqueda arranca filtrada por esa escuela
      if (location.hash === '#buscar') $('bTexto').value = e ? e.nombre : pre;
    }
    borradorListo = true;
    if (conBorrador) avisoBorrador(true);
    pintarCola();
    if (estado.url && estado.clave) mostrarApp();
    else if (estado.url) probarSinClave();
    else mostrarConexion();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
