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
    ESTADO: 11, RESPONSABLE: 12, FECHA_RES: 13, ACCIONES: 14, PROBLEMA: 15, PATOLOGIA: 16
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
    modalEstado: ''
  };

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
  const VERSION_SCRIPT_ESPERADA = 6;
  let avisoVersionMostrado = false;

  async function leerRespuesta(r) {
    const texto = await r.text();
    let json = null;
    try { json = JSON.parse(texto); } catch (e) { /* no es JSON */ }
    if (json) {
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

  async function cargarReclamos(silencioso) {
    marcarConexion('cargando', 'Leyendo la hoja…');
    if (!silencioso) $('resultadosConteo').textContent = 'Cargando reclamos de la hoja…';
    try {
      const res = await llamarGet({ accion: 'listar' });
      estado.reclamos = res.filas.map(prepararReclamo);
      estado.cargado = true;
      marcarConexion('ok', `Conectado · ${estado.reclamos.length.toLocaleString('es-AR')} reclamos`);
      llenarFiltrosDesdeDatos();
      aplicarFiltros();
      actualizarBadge();
      revisarDuplicado();
      return true;
    } catch (err) {
      const msg = mensajeError(err);
      marcarConexion('error', 'Sin conexión');
      if (msg === 'La clave no es correcta.') {
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
    if (!problema && (motivo === 'CALIDAD' || motivo === 'FALTANTE')) {
      const s = ASISTENTE.sugerir(v[C.DETALLE]);
      if (s.motivo === motivo && s.problema) { problema = s.problema; estimado = true; }
    }
    let patologia = mayus(v[C.PATOLOGIA]);
    let patEstimada = false;
    if (!patologia) {
      const p = ASISTENTE.sugerir(v[C.DETALLE]).patologia;
      if (p) { patologia = p; patEstimada = true; }
    }
    const escNombre = mayus(v[C.ESCUELA]);
    const escData = ESCUELAS.find(e => mayus(e.nombre) === escNombre || (e.alias || []).some(a => mayus(a) === escNombre));
    const estadoTxt = String(v[C.ESTADO] || '').trim();
    return {
      fila: item.fila,
      v,
      fecha,
      est: {
        escuela: escNombre,
        proveedor: limpiarProveedor(v[C.PROVEEDOR]),
        servicio: mayus(v[C.SERVICIO]),
        categoria: mayus(v[C.CATEGORIA]),
        motivo,
        producto: mayus(v[C.PRODUCTO]),
        problema,
        problemaEstimado: estimado,
        patologia,
        patologiaEstimada: patEstimada,
        estado: estadoTxt ? capitalizar(estadoTxt).replace('En Gestión', 'En gestión') : 'Sin estado',
        zona: escData && escData.zona ? String(escData.zona) : '',
        texto: norm([v[C.ESCUELA], v[C.DETALLE], v[C.PRODUCTO], v[C.PROVEEDOR], v[C.ACCIONES]].join(' '))
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
    llenarSelect($('fProducto'), CLASIFICACION.productos.map(p => ({ valor: p, etiqueta: capitalizar(p) })), true, 'Sin producto específico');
    llenarSelect($('fPatologia'), CLASIFICACION.patologias.map(p => ({ valor: p, etiqueta: capitalizar(p) })), true, 'No');
    llenarSelect($('fResponsable'), CLASIFICACION.responsables);
    $('fResponsable').value = 'Muni';
    pintarCategorias();
    pintarEstadoForm();
    actualizarResumen();
  }

  function pintarCategorias() {
    botonesOpciones($('opcCategoria'), CLASIFICACION.categorias, estado.form.categoria, (v) => {
      fijarCategoria(v);
      pintarCategorias();
      pintarMotivos();
      actualizarResumen();
    });
  }

  function pintarMotivos() {
    const cat = estado.form.categoria;
    $('campoMotivo').style.display = cat ? '' : 'none';
    $('filaProducto').style.display = cat === 'ALIMENTOS' ? '' : 'none';
    const lista = CLASIFICACION.motivos[cat] || [];
    botonesOpciones($('opcMotivo'), lista, estado.form.motivo, (v) => {
      if (estado.form.motivo !== v) estado.form.problema = '';
      estado.form.motivo = v;
      pintarMotivos();
      actualizarResumen();
      revisarDuplicado();
    });
    const m = lista.find(o => o.valor === estado.form.motivo);
    $('ayudaMotivo').textContent = m ? m.ayuda : 'Pasá el mouse sobre cada opción para ver cuándo usarla.';
    pintarProblemas();
  }

  function pintarProblemas() {
    const lista = (estado.form.categoria === 'ALIMENTOS' && CLASIFICACION.problemas[estado.form.motivo]) || null;
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
  }

  function alCambiarServicio() {
    const e = estado.escuela;
    if (!e) return;
    const serv = $('fServicio').value;
    const prov = proveedorDeServicio(e, serv === 'COMEDOR' ? 'COMEDOR' : 'DM');
    if (prov) {
      if (![...$('fProveedor').options].some(o => o.value === prov)) $('fProveedor').appendChild(new Option(prov, prov));
      $('fProveedor').value = prov;
      $('hintProveedor').textContent = `Según el buscador, ${capitalizar(serv)} de ${e.nombre} lo da ${prov}.`;
    } else {
      $('hintProveedor').textContent = '';
    }
    const cupo = cupoDeServicio(e, serv === 'COMEDOR' ? 'COMEDOR' : 'DM', $('fFecha').value || hoyISO());
    if (cupo) {
      $('fCupoTotal').value = cupo;
      $('hintCupoTotal').textContent = `Cupo de ${capitalizar(serv)} para esa fecha.`;
    } else {
      $('fCupoTotal').value = '';
      $('hintCupoTotal').textContent = '';
    }
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
    if (s.motivo) partes.push(ETQ_MOTIVO[s.motivo] || s.motivo);
    if (s.problema) partes.push(ETQ_PROBLEMA[s.problema] || s.problema);
    let extra = [];
    if (s.producto) extra.push('Producto: ' + capitalizar(s.producto));
    if (s.patologia) extra.push('Patología: ' + capitalizar(s.patologia));

    const yaAplicada = s.categoria === estado.form.categoria && s.motivo === estado.form.motivo &&
      (s.problema || '') === (estado.form.problema || '') &&
      (s.producto || '') === $('fProducto').value && (s.patologia || '') === $('fPatologia').value;

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
      if (s.producto) $('fProducto').value = s.producto;
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
      escuela: estado.escuela ? estado.escuela.nombre : '',
      proveedor: $('fProveedor').value,
      servicio: $('fServicio').value,
      tipo: ((CLASIFICACION.categorias.find(c => c.valor === cat) || {}).tipo) || 'diaria',
      categoria: cat,
      subcategoria: estado.form.motivo,
      detalle: $('fDetalle').value.trim(),
      producto: cat === 'ALIMENTOS' ? $('fProducto').value : '',
      cupoDefectuoso: $('fCupoDefectuoso').value,
      cupoTotal: $('fCupoTotal').value,
      estado: estado.form.estado,
      responsable: $('fResponsable').value,
      acciones: $('fAcciones').value.trim(),
      problema: estado.form.problema,
      patologia: cat === 'ALIMENTOS' ? $('fPatologia').value : ''
    };
  }

  function actualizarResumen() {
    const d = datosFormulario();
    if (!d.escuela && !d.categoria) {
      $('resumenTexto').textContent = 'Completá los pasos para ver el resumen.';
      return;
    }
    const f = parsearFecha(d.fecha.split('-').reverse().join('/'));
    const clas = [d.categoria && etqCategoria(d.categoria), d.subcategoria && (ETQ_MOTIVO[d.subcategoria] || d.subcategoria),
      d.problema && (ETQ_PROBLEMA[d.problema] || d.problema)].filter(Boolean).join(' › ');
    $('resumenTexto').innerHTML =
      `<strong>${esc(d.escuela || 'Sin escuela')}</strong> · ${esc(fechaCorta(f))} · ${esc(capitalizar(d.servicio))}` +
      `${d.proveedor ? ' · ' + esc(d.proveedor) : ''}<br>` +
      `<span class="rec-resumen-clas">${esc(clas || 'Sin clasificar')}${d.producto ? ' · ' + esc(capitalizar(d.producto)) : ''}` +
      `${d.patologia ? ' · ' + esc(capitalizar(d.patologia)) : ''}</span> · <span class="rec-pill ${claseEstado(d.estado)}">${esc(d.estado)}</span>`;
  }

  /** Avisa si ya hay un reclamo igual (misma escuela, fecha y motivo). */
  function revisarDuplicado() {
    const aviso = $('avisoDuplicado');
    const d = datosFormulario();
    if (!estado.cargado || !d.escuela || !d.fecha) { aviso.style.display = 'none'; return; }
    const iguales = estado.reclamos.filter(r =>
      r.est.escuela === mayus(d.escuela) && r.fecha && isoDe(r.fecha) === d.fecha &&
      (!d.subcategoria || r.est.motivo === d.subcategoria));
    if (!iguales.length) { aviso.style.display = 'none'; return; }
    const r = iguales[iguales.length - 1];
    aviso.innerHTML = `⚠️ Ya hay ${iguales.length === 1 ? 'un reclamo' : iguales.length + ' reclamos'} de <strong>${esc(d.escuela)}</strong> ` +
      `para esa fecha${d.subcategoria ? ' con el mismo motivo' : ''}: “${esc(r.v[C.DETALLE] || 'sin detalle')}”. Revisá que no sea el mismo antes de guardar.`;
    aviso.style.display = 'block';
  }

  function marcarError(campo, msg) {
    const el = document.querySelector(`[data-error="${campo}"]`);
    if (el) el.textContent = msg;
  }

  function validar(d) {
    let ok = true;
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
    return ok;
  }

  /* ---------- Guardado en segundo plano ----------
   * Al tocar Guardar, el reclamo pasa a una cola y el formulario queda libre
   * al instante. Los envíos salen de a uno; si alguno falla, queda en un
   * recuadro con "Reintentar" para no perderlo.
   */
  const cola = [];          // { id, datos, estado: 'esperando'|'enviando'|'error', error }
  let enviando = false;
  let idCola = 0;

  function guardarReclamo(ev) {
    ev.preventDefault();
    const d = datosFormulario();
    if (!validar(d)) {
      const primero = document.querySelector('.rec-error:not(:empty)');
      if (primero) primero.closest('.rec-campo').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    cola.push({ id: ++idCola, datos: d, estado: 'esperando', error: '' });
    toast(`⏳ Guardando el reclamo de ${d.escuela}… podés seguir cargando`, 'ok');
    limpiarFormulario(true);
    pintarCola();
    procesarCola();
  }

  async function procesarCola() {
    if (enviando) return;
    const item = cola.find(x => x.estado === 'esperando');
    if (!item) { pintarCola(); return; }
    enviando = true;
    item.estado = 'enviando';
    pintarCola();
    try {
      const res = await llamarPost({ accion: 'agregar', reclamo: item.datos });
      cola.splice(cola.indexOf(item), 1);
      estado.reclamos.push(prepararReclamo({ fila: res.fila, v: res.v }));
      llenarFiltrosDesdeDatos();
      aplicarFiltros();
      actualizarBadge();
      revisarDuplicado();
      if (res.advertencia) toast(`✅ ${item.datos.escuela}: guardado en la fila ${res.fila}. ⚠️ ${res.advertencia}`, 'error');
      else toast(`✅ ${item.datos.escuela}: guardado en la fila ${res.fila}`, 'ok');
    } catch (err) {
      item.estado = 'error';
      item.error = mensajeError(err);
      toast(`⚠️ No se guardó el reclamo de ${item.datos.escuela}. Quedó arriba para reintentar.`, 'error');
    } finally {
      enviando = false;
      pintarCola();
      // Sigue con el próximo de la cola, si hay
      if (cola.some(x => x.estado === 'esperando')) procesarCola();
    }
  }

  function pintarCola() {
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
    if (!cola.length) { caja.style.display = 'none'; caja.innerHTML = ''; return; }
    caja.style.display = 'block';
    let html = '';
    if (pendientes.length) {
      html += `<div class="rec-cola-fila enviando"><span class="rec-spinner" aria-hidden="true"></span>` +
        `Guardando ${pendientes.length === 1 ? '1 reclamo' : pendientes.length + ' reclamos'} en la hoja… ` +
        `<small>(${esc(pendientes.map(x => x.datos.escuela).join(', '))})</small></div>`;
    }
    errores.forEach(x => {
      html += `<div class="rec-cola-fila error" data-id="${x.id}">
        <div><strong>⚠️ No se guardó: ${esc(x.datos.escuela)}</strong> · “${esc(x.datos.detalle.slice(0, 80))}”<br><small>${esc(x.error)}</small></div>
        <div class="rec-cola-botones">
          <button type="button" class="btn btn-primary btn-sm" data-accion="reintentar">Reintentar</button>
          <button type="button" class="btn btn-secondary btn-sm" data-accion="editar" title="Volver a cargarlo en el formulario">Editar</button>
          <button type="button" class="btn btn-secondary btn-sm" data-accion="descartar">Descartar</button>
        </div></div>`;
    });
    caja.innerHTML = html;
    caja.querySelectorAll('[data-accion]').forEach(b => b.addEventListener('click', () => {
      const id = Number(b.closest('[data-id]').dataset.id);
      const item = cola.find(x => x.id === id);
      if (!item) return;
      if (b.dataset.accion === 'reintentar') { item.estado = 'esperando'; item.error = ''; procesarCola(); }
      if (b.dataset.accion === 'descartar' && confirm('¿Descartar este reclamo sin guardarlo?')) cola.splice(cola.indexOf(item), 1);
      if (b.dataset.accion === 'editar') { cola.splice(cola.indexOf(item), 1); cargarEnFormulario(item.datos); }
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
    actualizarSugerencia(); actualizarResumen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Aviso si se intenta cerrar la página con reclamos sin guardar
  window.addEventListener('beforeunload', (ev) => {
    if (cola.length) { ev.preventDefault(); ev.returnValue = ''; }
  });


  /** Deja el formulario listo para otro reclamo. Si mantenerEscuela, conserva escuela/fecha/servicio. */
  function limpiarFormulario(mantenerEscuela) {
    $('fDetalle').value = '';
    $('fCupoDefectuoso').value = '';
    $('fAcciones').value = '';
    $('fProducto').value = '';
    $('fPatologia').value = '';
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
    }
    $('fResponsable').value = 'Muni';
    ['escuela', 'detalle', 'motivo'].forEach(c => marcarError(c, ''));
    pintarCategorias();
    pintarMotivos();
    pintarEstadoForm();
    actualizarSugerencia();
    actualizarResumen();
    revisarDuplicado();
    if (mantenerEscuela) $('fDetalle').focus();
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
      return true;
    });
    // Más nuevos primero (por fecha y, a igual fecha, por fila)
    res.sort((a, b) => ((b.fecha ? b.fecha.getTime() : 0) - (a.fecha ? a.fecha.getTime() : 0)) || (b.fila - a.fila));
    estado.filtrados = res;
    estado.mostrados = POR_PAGINA;
    pintarResumenMotivos();
    pintarResultados();
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
    const total = estado.filtrados.length;
    $('resultadosConteo').innerHTML = total
      ? `<strong>${total.toLocaleString('es-AR')}</strong> reclamo${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`
      : 'No hay reclamos con esos filtros.';
    const vis = estado.filtrados.slice(0, estado.mostrados);
    lista.innerHTML = vis.map((r, i) => {
      const e = r.est, v = r.v;
      const etiquetas = [
        e.motivo && `<span class="rec-tag motivo">${esc(ETQ_MOTIVO[e.motivo] || capitalizar(e.motivo))}</span>`,
        e.problema && `<span class="rec-tag${e.problemaEstimado ? ' estimado' : ''}" ${e.problemaEstimado ? 'title="Clasificación estimada a partir del detalle"' : ''}>${esc(ETQ_PROBLEMA[e.problema] || capitalizar(e.problema))}${e.problemaEstimado ? ' ~' : ''}</span>`,
        e.producto && `<span class="rec-tag">${esc(capitalizar(e.producto))}</span>`,
        e.patologia && `<span class="rec-tag pat${e.patologiaEstimada ? ' estimado' : ''}">${esc(capitalizar(e.patologia))}${e.patologiaEstimada ? ' ~' : ''}</span>`
      ].filter(Boolean).join('');
      return `<article class="rec-item" data-i="${i}" tabindex="0" role="button" aria-label="Ver reclamo de ${esc(v[C.ESCUELA])}">
        <div class="rec-item-cab">
          <span class="rec-item-fecha">${esc(r.fecha ? fechaCorta(r.fecha) : v[C.FECHA])}</span>
          <strong class="rec-item-escuela">${esc(v[C.ESCUELA] || 'Sin escuela')}</strong>
          <span class="rec-item-meta">${esc([e.proveedor, capitalizar(e.servicio)].filter(Boolean).join(' · '))}</span>
          <span class="rec-pill ${claseEstado(e.estado)}">${esc(e.estado)}</span>
        </div>
        <p class="rec-item-detalle">${esc(v[C.DETALLE] || '—')}</p>
        <div class="rec-item-tags">${etiquetas}</div>
      </article>`;
    }).join('');
    lista.querySelectorAll('.rec-item').forEach(el => {
      const abrir = () => abrirModal(vis[Number(el.dataset.i)]);
      el.addEventListener('click', abrir);
      el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
    });
    $('btnVerMas').style.display = total > estado.mostrados ? '' : 'none';
    $('btnVerMas').textContent = `Ver más (${(total - estado.mostrados).toLocaleString('es-AR')} restantes)`;
  }

  function filtroRapido(tipo) {
    const ya = estado.filtroRapido === tipo;
    estado.filtroRapido = ya ? '' : tipo;
    document.querySelectorAll('[data-rapido]').forEach(b => b.classList.toggle('activo', b.dataset.rapido === estado.filtroRapido));
    const hoy = new Date();
    $('bEstado').value = ''; $('bDesde').value = ''; $('bHasta').value = '';
    if (!ya) {
      if (tipo === 'pendientes') $('bEstado').value = 'Pendiente';
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

  function exportarCSV() {
    if (!estado.filtrados.length) { toast('No hay reclamos para exportar'); return; }
    const enc = ['FECHA', 'ESCUELA', 'PROVEEDOR SAE', 'SERVICIO', 'TIPO', 'CATEGORIA', 'Subcategoria', 'DETALLE', 'PRODUCTO',
      'CUPO DEFECTUOSO', 'CUPO TOTAL', 'ESTADO', 'Responsable', 'Fecha resolución', 'ACCIONES', 'PROBLEMA', 'PATOLOGÍA', 'FILA EN HOJA'];
    const celda = (x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`;
    const filas = estado.filtrados.map(r => [...r.v.slice(0, 15),
      r.est.problema + (r.est.problemaEstimado ? ' (estimado)' : ''),
      r.est.patologia + (r.est.patologiaEstimada ? ' (estimado)' : ''), r.fila].map(celda).join(';'));
    const blob = new Blob(['﻿' + [enc.map(celda).join(';'), ...filas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Reclamos_SAE_${hoyISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function actualizarBadge() {
    const n = estado.reclamos.filter(r => r.est.estado === 'Pendiente').length;
    const b = $('badgePendientes');
    b.textContent = n;
    b.style.display = n ? '' : 'none';
    b.title = `${n} reclamos pendientes`;
  }

  /* ======================================================================
   * DETALLE Y SEGUIMIENTO
   * ====================================================================== */
  function abrirModal(r) {
    estado.modal = r;
    const v = r.v, e = r.est;
    $('modalTitulo').textContent = `${v[C.ESCUELA] || 'Reclamo'} · ${r.fecha ? fechaCorta(r.fecha) : v[C.FECHA]}`;
    const fila = (k, val) => val ? `<div class="rec-dato"><span>${k}</span><strong>${esc(val)}</strong></div>` : '';
    $('modalCuerpo').innerHTML = `
      <p class="rec-modal-detalle">${esc(v[C.DETALLE] || 'Sin detalle')}</p>
      <div class="rec-datos">
        ${fila('Proveedor', e.proveedor)}
        ${fila('Servicio', capitalizar(e.servicio))}
        ${fila('Categoría', etqCategoria(e.categoria))}
        ${fila('Motivo', ETQ_MOTIVO[e.motivo] || capitalizar(e.motivo))}
        ${fila('Problema', e.problema ? (ETQ_PROBLEMA[e.problema] || capitalizar(e.problema)) + (e.problemaEstimado ? ' (estimado)' : '') : '')}
        ${fila('Producto', capitalizar(e.producto))}
        ${fila('Patología', e.patologia ? capitalizar(e.patologia) + (e.patologiaEstimada ? ' (estimado)' : '') : '')}
        ${fila('Cupo afectado', v[C.CUPO_DEF])}
        ${fila('Cupo total', v[C.CUPO_TOTAL])}
        ${fila('Resuelto el', v[C.FECHA_RES])}
        ${fila('Fila en la hoja', String(r.fila))}
      </div>`;
    estado.modalEstado = ['Pendiente', 'En gestión', 'Resuelto'].includes(e.estado) ? e.estado : '';
    pintarEstadoModal();
    const resp = v[C.RESPONSABLE] || '';
    llenarSelect($('mResponsable'), CLASIFICACION.responsables.includes(resp) || !resp
      ? CLASIFICACION.responsables : [...CLASIFICACION.responsables, resp], true, 'Sin asignar');
    $('mResponsable').value = resp;
    $('mAcciones').value = v[C.ACCIONES] || '';
    $('modalDetalle').style.display = 'flex';
    document.body.classList.add('rec-modal-abierto');
    setTimeout(() => $('btnCerrarModal').focus(), 30);
  }

  function pintarEstadoModal() {
    botonesOpciones($('mEstado'), CLASIFICACION.estados.map(x => ({ valor: x, etiqueta: x })), estado.modalEstado, (v) => {
      estado.modalEstado = v;
      pintarEstadoModal();
    });
  }

  function cerrarModal() {
    $('modalDetalle').style.display = 'none';
    document.body.classList.remove('rec-modal-abierto');
    estado.modal = null;
  }

  async function guardarModal() {
    const r = estado.modal;
    if (!r) return;
    const cambios = {};
    const estAnterior = ['Pendiente', 'En gestión', 'Resuelto'].includes(r.est.estado) ? r.est.estado : '';
    if (estado.modalEstado !== estAnterior) cambios.estado = estado.modalEstado;
    if ($('mResponsable').value !== (r.v[C.RESPONSABLE] || '')) cambios.responsable = $('mResponsable').value;
    if ($('mAcciones').value.trim() !== (r.v[C.ACCIONES] || '').trim()) cambios.acciones = $('mAcciones').value.trim();
    if (!Object.keys(cambios).length) { cerrarModal(); return; }

    const btn = $('btnGuardarModal');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const res = await llamarPost({
        accion: 'actualizar',
        fila: r.fila,
        huella: { escuela: r.v[C.ESCUELA], detalle: r.v[C.DETALLE], fecha: r.v[C.FECHA] },
        cambios
      });
      const actualizado = prepararReclamo({ fila: res.fila, v: res.v });
      const idx = estado.reclamos.indexOf(r);
      if (idx >= 0) estado.reclamos[idx] = actualizado;
      cerrarModal();
      aplicarFiltros();
      actualizarBadge();
      toast('✅ Seguimiento actualizado en la hoja', 'ok');
    } catch (err) {
      toast('⚠️ ' + mensajeError(err), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Guardar cambios';
    }
  }

  /* ======================================================================
   * EVENTOS
   * ====================================================================== */
  function iniciarEventos() {
    // Pestañas
    document.querySelectorAll('.rec-tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.rec-tab').forEach(x => x.classList.toggle('active', x === t));
      document.querySelectorAll('.rec-tabpane').forEach(p => p.classList.toggle('active', p.id === t.dataset.tab));
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
    $('fFecha').addEventListener('change', () => { alCambiarServicio(); actualizarResumen(); revisarDuplicado(); });
    ['fProveedor', 'fProducto', 'fPatologia', 'fResponsable'].forEach(id =>
      $(id).addEventListener('change', () => { actualizarResumen(); actualizarSugerencia(); }));

    let tSug;
    $('fDetalle').addEventListener('input', () => {
      $('fDetalle').classList.remove('invalido'); marcarError('detalle', '');
      clearTimeout(tSug);
      tSug = setTimeout(actualizarSugerencia, 250);
    });
    $('btnAplicarSugerencia').addEventListener('click', aplicarSugerencia);

    $('formReclamo').addEventListener('submit', guardarReclamo);
    $('btnLimpiar').addEventListener('click', () => limpiarFormulario(false));

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
    $('btnExportar').addEventListener('click', exportarCSV);
    $('btnRecargar').addEventListener('click', () => cargarReclamos());
    $('btnVerMas').addEventListener('click', () => { estado.mostrados += POR_PAGINA; pintarResultados(); });

    // Modal
    $('btnCerrarModal').addEventListener('click', cerrarModal);
    $('btnCancelarModal').addEventListener('click', cerrarModal);
    $('btnGuardarModal').addEventListener('click', guardarModal);
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
    iniciarFormulario();
    // Abrir directo en una pestaña: reclamos.html#buscar
    if (location.hash === '#buscar') document.querySelector('[data-tab="tabBuscar"]').click();
    // Escuela precargada: reclamos.html?escuela=EP%2011
    const pre = new URLSearchParams(location.search).get('escuela');
    if (pre) {
      const e = ESCUELAS.find(x => norm(x.nombre) === norm(pre));
      if (e) elegirEscuela(e);
    }
    if (estado.url && estado.clave) mostrarApp();
    else if (estado.url) probarSinClave();
    else mostrarConexion();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
