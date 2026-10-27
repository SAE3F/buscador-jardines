/**
 * ==========================================================================
 * PUENTE RECLAMOS SAE  <->  GOOGLE SHEETS
 * Se pega dentro de la planilla (Extensiones > Apps Script) y se publica
 * como "Aplicación web". La página de reclamos le habla a este script para:
 *   - leer todos los reclamos (buscador)
 *   - agregar un reclamo nuevo (formulario)
 *   - cambiar estado / responsable / acciones de un reclamo (seguimiento)
 *
 *   - leer los cupos (CUPOS 2026) y los menús de las planillas del SAE,
 *     para que el buscador se actualice solo (acción "datos")
 *   - (v8) leer por años: "listar" y "compacto" aceptan desde=AÑO, y
 *     "historico" devuelve los años anteriores en versión resumida (en caché)
 *   - (v9) más rápido: las respuestas quedan unos minutos en la caché de Google
 *     (se renuevan solas al cargar o modificar un reclamo) y los cupos viajan
 *     comprimidos (solo las fechas en que cambian)
 *   - (v10) cambiar el estado de un reclamo es más rápido (una sola escritura)
 *   - (v11) avisos próximos (acción "avisos"), límites y cupos actuales por
 *     proveedor, y cambiar el cupo de una escuela desde el buscador
 *     (acciones "cupoPrevia" y "cupoGuardar"; cada cambio queda anotado en la
 *     pestaña "CAMBIOS CUPOS")
 *   - (v12) cambiar el estado de muchos reclamos en un solo pedido ("actualizarVarios",
 *     para los globos) y poder deshacer un cambio (vuelve a poner la fecha de resolución)
 *   - (v13) si un desplegable de la hoja rechaza el estado (ej. "En gestión"), se escribe
 *     igual en ese reclamo sin hacer fallar a los demás
 *   - (v14) reclasificar reclamos (TIPO, CATEGORIA y Subcategoria) desde "Revisar datos",
 *     de a uno o por tanda, con el desplegable de Subcategoria de la categoría nueva
 *   - (v15) reclasificar por tanda mucho más rápido (un solo guardado al final) y con
 *     límite de tiempo: lo que no llega se devuelve para reintentar solo
 *   - (v16) reclasificar ya no falla con "introduce un valor del intervalo": antes de escribir
 *     se pone el desplegable de Subcategoria correcto aunque cambie solo el motivo
 *   - (v17) un reclamo nuevo que llega dos veces (envío cortado y reintentado) no se carga
 *     dos veces: la página manda un número de envío y el script lo recuerda 6 horas
 *   - (v18) reclasificar ya no choca con los desplegables estrictos (TIPO y CATEGORIA): cada
 *     fila se escribe sin desplegables y se le vuelven a poner los mismos (como al agregar)
 *   - (v19) cambiar un cupo por un tiempo (solo ese día o hasta una fecha) con aviso el día que
 *     vuelve; acción "diagnostico" para la página Estado del sistema
 *   - (v20) HOJA ORIGINAL: reclamos y cupos en el Tablero (SAE| Tablero Gestión). La pestaña
 *     "CAMBIOS CUPOS" se crea ahí con formato para leerla fácil. La planilla de prueba no se toca.
 *   - (v21) cambios de estado en tanda mucho más rápidos en la hoja original (un solo guardado al
 *     final, sin que los desplegables rechacen nada) y, si la hoja está ocupada, se avisa "OCUPADO"
 *     para que la página reintente sola
 *   - (v22) copia de seguridad semanal del Tablero en Drive (activarCopiaSemanal, una sola vez)
 *
 * NO borra ni reordena filas. Solo agrega filas al final y modifica las
 * celdas de seguimiento (ESTADO, Responsable, Fecha resolución, ACCIONES) y, al reclasificar,
 * TIPO, CATEGORIA y Subcategoria.
 * En la pestaña de cupos solo cambia los números del cupo que se pidió cambiar.
 * ==========================================================================
 */

// ----------------------------- CONFIGURACIÓN -----------------------------

// Versión del script. La página avisa si el publicado es más viejo.
var VERSION_SCRIPT = 22;

// (v20) HOJA ORIGINAL. Los reclamos están en el Tablero ("SAE| Tablero Gestión"), pestaña
// "Reclamos". El script sigue viviendo en la planilla HOJA RECLAMOS (la de prueba, que queda
// como estaba) y abre el Tablero por su código: así el link de la página y la clave no cambian.
// Planilla de reclamos: el código del link docs.google.com/spreadsheets/d/CÓDIGO/edit
// (vacío = la planilla donde está pegado este script).
var ID_PLANILLA_RECLAMOS = '1P57PeQ8WeLJbEovcGNKsT-4K_2AmCXpWF1W-MrwYShQ';
// Número de la pestaña de reclamos: es lo que aparece después de "gid=" en el link.
// (Si no coincide con ninguna pestaña, se usa la pestaña llamada "Reclamos".)
var GID_RECLAMOS = 1684360253;
var NOMBRE_HOJA_RECLAMOS = 'Reclamos';
// Antes (prueba): planilla HOJA RECLAMOS, GID 1036384707.

// Planillas de donde el buscador toma cupos y menús (solo lectura).
// Son los códigos que aparecen en el link: docs.google.com/spreadsheets/d/CÓDIGO/edit
var ID_TABLERO = '1P57PeQ8WeLJbEovcGNKsT-4K_2AmCXpWF1W-MrwYShQ';   // SAE | Tablero Gestión
var HOJA_CUPOS = 'CUPOS 2026';

// ⚠️ CUPOS DE PRUEBA: mientras esté en true, el buscador LEE y ESCRIBE los cupos
// en la copia de prueba (planilla HOJA RECLAMOS, pestaña "Copia de CUPOS 2026").
// Para pasar al Tablero real: cambiar true por false, guardar y volver a implementar.
var CUPOS_DE_PRUEBA = false;   // (v20) ya se usa el Tablero real
var ID_CUPOS_PRUEBA = '12sgNZlGpkH-TaRrCiW-p4boSreihXkm3LfG4cJg03RY';   // HOJA RECLAMOS
var GID_CUPOS_PRUEBA = 1805940174;                                       // pestaña "Copia de CUPOS 2026"
var HOJA_CAMBIOS_CUPOS = 'CAMBIOS CUPOS';   // registro de cada cambio (se crea sola)
var ID_MENUS = '1SdKThe4n468YwCGRzXXMAdsqgRQKJ31ChzVBcQDKI_8';     // 2026 JM y Dispositivos
var HOJAS_MENUS = {
  'GR COMEDOR': 'A1:F90', 'JM REFUERZO': 'A1:I30', 'GR DM JM': 'A1:J30',
  'DM GR DISP': 'A1:I30', 'COM GR DISP': 'A1:I90', 'DM ESPERANZA': 'A1:L20'
};

// CLAVE (opcional): se guarda en Configuración del proyecto >
// Propiedades de la secuencia de comandos, con el nombre CLAVE.
// Si no se configura, la página entra sin pedir clave.
// (Así no queda visible para quien abra el código.)

// Columnas de la hoja, en orden. Las dos últimas son nuevas.
var COLUMNAS = [
  'FECHA', 'ESCUELA', 'PROVEEDOR SAE', 'SERVICIO', 'TIPO', 'CATEGORIA',
  'Subcategoria', 'DETALLE ', 'PRODUCTO', 'CUPO DEFECTUOSO', 'CUPO TOTAL',
  'ESTADO', 'Responsable ', 'Fecha resolución', 'ACCIONES',
  'PROBLEMA', 'PATOLOGÍA'
];
var COL = {
  FECHA: 1, ESCUELA: 2, PROVEEDOR: 3, SERVICIO: 4, TIPO: 5, CATEGORIA: 6,
  SUBCATEGORIA: 7, DETALLE: 8, PRODUCTO: 9, CUPO_DEFECTUOSO: 10, CUPO_TOTAL: 11,
  ESTADO: 12, RESPONSABLE: 13, FECHA_RESOLUCION: 14, ACCIONES: 15,
  PROBLEMA: 16, PATOLOGIA: 17
};
var FORMATO_FECHA = 'dd/MM/yy';

// ------------------------------- ENTRADAS --------------------------------

/** Lectura: devuelve todos los reclamos. */
function doGet(e) {
  return responder_(function () {
    verificarClave_(e && e.parameter ? e.parameter.clave : '');
    var accion = (e && e.parameter && e.parameter.accion) || 'listar';
    if (accion === 'ping') return { ok: true, hoja: obtenerHoja_().getName() };
    if (accion === 'diagnostico') return diagnostico_();
    var p = (e && e.parameter) || {};
    if (accion === 'datos') return conCache_('datos', 600, datos_);
    if (accion === 'avisos') return conCache_('avisos', 300, avisos_, true);
    if (accion === 'compacto') {
      var dc = Number(p.desde) || 0;
      return conCache_('compacto_' + dc, 300, function () { return compacto_(dc); }, true);
    }
    if (accion === 'historico') return historico_(Number(p.hasta) || new Date().getFullYear() - 1);
    var dl = Number(p.desde) || 0;
    return conCache_('listar_' + dl, 300, function () { return listar_(dl); }, true);
  });
}

/** Escritura: agregar o actualizar. El cuerpo llega como texto JSON. */
function doPost(e) {
  return responder_(function () {
    var datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    verificarClave_(datos.clave);

    // Un solo cambio a la vez, para que dos personas cargando juntas no se pisen
    var lock = LockService.getScriptLock();
    // (v21) Se espera hasta 60 s. Si otro pedido sigue ocupando la hoja, se avisa con "OCUPADO"
    // y la página lo reintenta sola un rato después (no es un error del reclamo).
    if (!lock.tryLock(60000)) throw new Error('OCUPADO: la hoja está guardando otro pedido. Se reintenta solo en unos segundos.');
    try {
      if (datos.accion === 'agregar') return agregarUnaVez_(datos.reclamo || {}, datos.idEnvio);
      if (datos.accion === 'actualizar') return actualizar_(datos);
      if (datos.accion === 'actualizarVarios') return actualizarVarios_(datos.items || []);
      if (datos.accion === 'reclasificar') return reclasificarVarios_(datos.items || []);
      if (datos.accion === 'cupoPrevia') return cambiarCupo_(datos, false);
      if (datos.accion === 'cupoGuardar') return cambiarCupo_(datos, true);
      throw new Error('Acción desconocida');
    } finally {
      lock.releaseLock();
    }
  });
}

// ------------------------------- ACCIONES --------------------------------

/**
 * Filas de reclamos desde un año (desde = 0: todas). Para no leer la hoja entera,
 * primero mira solo la columna FECHA y después trae las columnas completas
 * únicamente desde la primera fila que corresponde.
 */
function filasDesde_(hoja, desde) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return { inicio: 2, valores: [], fechas: [] };
  var fechas = hoja.getRange(2, COL.FECHA, ultima - 1, 1).getValues();
  var primera = 0;
  if (desde) {
    primera = fechas.length;
    for (var i = 0; i < fechas.length; i++) {
      var f = fechas[i][0];
      if (!(f instanceof Date) || f.getFullYear() >= desde) { if (f instanceof Date || limpiar_(f)) { primera = i; break; } }
    }
  }
  if (primera >= fechas.length) return { inicio: 2, valores: [], fechas: [] };
  var valores = hoja.getRange(2 + primera, 1, ultima - 1 - primera, COLUMNAS.length).getDisplayValues();
  return { inicio: 2 + primera, valores: valores, fechas: fechas.slice(primera) };
}

function listar_(desde) {
  var hoja = obtenerHoja_();
  asegurarColumnasNuevas_(hoja);
  var r = filasDesde_(hoja, desde);
  var filas = [];
  for (var i = 0; i < r.valores.length; i++) {
    var v = r.valores[i];
    // Saltear filas sin escuela ni detalle (vacías o con restos sueltos)
    if (!limpiar_(v[COL.ESCUELA - 1]) && !limpiar_(v[COL.DETALLE - 1])) continue;
    var f = r.fechas[i][0];
    if (desde && f instanceof Date && f.getFullYear() < desde) continue;
    filas.push({ fila: r.inicio + i, v: v });
  }
  return { ok: true, filas: filas, total: filas.length, desde: desde || 0 };
}

/**
 * Reclamos de los años anteriores a "hasta", resumidos (sin detalle) para los
 * gráficos: [fila, fecha AAAA-MM-DD (o el texto si no es fecha), escuela,
 * proveedor, servicio, categoría, subcategoría, estado, problema].
 * Queda en caché 6 horas porque esos años casi no cambian.
 */
function historico_(hasta) {
  var clave = 'hist_v20_' + hasta;
  var guardado = leerCacheGrande_(clave);
  if (guardado) return { ok: true, filas: guardado, hasta: hasta, cache: true };
  var hoja = obtenerHoja_();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return { ok: true, filas: [], hasta: hasta };
  var tz = Session.getScriptTimeZone();
  var fechas = hoja.getRange(2, COL.FECHA, ultima - 1, 1).getValues();
  var v = hoja.getRange(2, 1, ultima - 1, Math.max(COL.ESTADO, COL.PROBLEMA)).getDisplayValues();
  var filas = [];
  for (var i = 0; i < v.length; i++) {
    var f = v[i];
    if (!limpiar_(f[COL.ESCUELA - 1]) && !limpiar_(f[COL.DETALLE - 1])) continue;
    var d = fechas[i][0];
    if (d instanceof Date && d.getFullYear() >= hasta) continue;
    filas.push([i + 2, d instanceof Date ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : limpiar_(f[COL.FECHA - 1]),
                f[COL.ESCUELA - 1], f[COL.PROVEEDOR - 1], f[COL.SERVICIO - 1], f[COL.CATEGORIA - 1],
                f[COL.SUBCATEGORIA - 1], f[COL.ESTADO - 1], f[COL.PROBLEMA - 1] || '']);
  }
  guardarCacheGrande_(clave, filas, 21600);
  return { ok: true, filas: filas, hasta: hasta };
}

/**
 * Devuelve la respuesta guardada en la caché de Google, o la calcula y la guarda.
 * Las de reclamos llevan el número de "versión de reclamos", que cambia cada vez
 * que se carga o modifica un reclamo: así nunca se muestra algo viejo.
 */
function conCache_(nombre, segundos, calcular, deReclamos) {
  var clave = 'c20_' + nombre + (deReclamos ? '_v' + versionReclamos_() : '');
  var guardado = leerCacheGrande_(clave);
  if (guardado) { guardado.cache = true; return guardado; }
  var res = calcular();
  if (res && res.ok) guardarCacheGrande_(clave, res, segundos);
  return res;
}

function versionReclamos_() {
  return PropertiesService.getScriptProperties().getProperty('VERSION_RECLAMOS') || '0';
}

function marcarCambioReclamos_() {
  try { PropertiesService.getScriptProperties().setProperty('VERSION_RECLAMOS', String(new Date().getTime())); } catch (e) { /* nada */ }
}

/** La caché de Google guarda hasta ~100 KB por clave: los datos grandes se parten en pedazos. */
function guardarCacheGrande_(clave, obj, segundos) {
  try {
    var txt = JSON.stringify(obj), TAM = 40000, partes = {}, n = Math.ceil(txt.length / TAM);
    if (n > 200) return;
    for (var i = 0; i < n; i++) partes[clave + '_' + i] = txt.substr(i * TAM, TAM);
    partes[clave + '_n'] = String(n);
    CacheService.getScriptCache().putAll(partes, segundos);
  } catch (e) { /* sin caché: se vuelve a leer la próxima vez */ }
}

function leerCacheGrande_(clave) {
  try {
    var c = CacheService.getScriptCache();
    var n = Number(c.get(clave + '_n'));
    if (!n) return null;
    var claves = [];
    for (var i = 0; i < n; i++) claves.push(clave + '_' + i);
    var m = c.getAll(claves), txt = '';
    for (var k = 0; k < n; k++) { if (m[claves[k]] == null) return null; txt += m[claves[k]]; }
    return JSON.parse(txt);
  } catch (e) { return null; }
}

function borrarCacheHistorico_() {
  try {
    var c = CacheService.getScriptCache(), anio = new Date().getFullYear(), claves = [];
    [anio - 1, anio, anio + 1].forEach(function (h) { claves.push('hist_v20_' + h + '_n'); });
    c.removeAll(claves);
  } catch (e) { /* nada */ }
}

function agregar_(r) {
  var hoja = obtenerHoja_();
  asegurarColumnasNuevas_(hoja);

  if (!limpiar_(r.escuela)) throw new Error('Falta la escuela');
  if (!limpiar_(r.categoria)) throw new Error('Falta la categoría');

  var fecha = parsearFecha_(r.fecha) || new Date();
  var estado = limpiar_(r.estado) || 'Pendiente';
  var fila = [];
  fila[COL.FECHA - 1] = fecha;
  fila[COL.ESCUELA - 1] = limpiar_(r.escuela);
  fila[COL.PROVEEDOR - 1] = limpiar_(r.proveedor).toUpperCase();
  fila[COL.SERVICIO - 1] = limpiar_(r.servicio).toUpperCase();
  fila[COL.TIPO - 1] = limpiar_(r.tipo) || 'diaria';
  fila[COL.CATEGORIA - 1] = limpiar_(r.categoria).toUpperCase();
  fila[COL.SUBCATEGORIA - 1] = limpiar_(r.subcategoria).toUpperCase();
  fila[COL.DETALLE - 1] = limpiar_(r.detalle);
  fila[COL.PRODUCTO - 1] = limpiar_(r.producto).toUpperCase();
  fila[COL.CUPO_DEFECTUOSO - 1] = numeroOVacio_(r.cupoDefectuoso);
  fila[COL.CUPO_TOTAL - 1] = numeroOVacio_(r.cupoTotal);
  fila[COL.ESTADO - 1] = estado;
  fila[COL.RESPONSABLE - 1] = limpiar_(r.responsable);
  fila[COL.FECHA_RESOLUCION - 1] = estado === 'Resuelto' ? new Date() : '';
  fila[COL.ACCIONES - 1] = limpiar_(r.acciones);
  fila[COL.PROBLEMA - 1] = limpiar_(r.problema).toUpperCase();
  fila[COL.PATOLOGIA - 1] = limpiar_(r.patologia).toUpperCase();

  // Se escribe en la primera fila libre después del último dato real
  var destino = primeraFilaLibre_(hoja);

  // Los valores se ajustan a como figuran en la hoja (mayúsculas, acentos,
  // "EES 01"...), usando listas guardadas en caché para no releer la hoja.
  var listas = listasDeReferencia_(hoja);
  var fueraDeLista = [];
  COLUMNAS_CON_LISTA.forEach(function (col) {
    var v = fila[col - 1];
    if (typeof v !== 'string' || v === '') return;
    var ajustado = buscarEnLista_(listas[col] || [], v);
    if (ajustado) fila[col - 1] = ajustado;
    else if ((listas[col] || []).length) fueraDeLista.push(v);
  });

  // Escritura en un solo paso: sin validación, valores, y después los mismos
  // desplegables de la fila de arriba (así la hoja nunca rechaza la fila).
  var rangoFila = hoja.getRange(destino, 1, 1, COLUMNAS.length);
  rangoFila.clearDataValidations();
  rangoFila.setValues([fila]);
  if (destino > 2) {
    hoja.getRange(destino - 1, 1, 1, COLUMNAS.length).copyTo(
      rangoFila, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  }
  hoja.getRange(destino, COL.FECHA).setNumberFormat(FORMATO_FECHA);
  hoja.getRange(destino, COL.FECHA_RESOLUCION).setNumberFormat(FORMATO_FECHA);
  guardarUltimaFila_(destino);
  // Se suma a la caché lo nuevo, para que el próximo guardado ya lo conozca
  agregarALaCache_(fila);

  var advertencia = fueraDeLista.length
    ? 'Se guardó. Estos valores son nuevos para la hoja (todavía no figuran en su lista): ' + fueraDeLista.join(', ') + '.'
    : '';

  var mostrada = hoja.getRange(destino, 1, 1, COLUMNAS.length).getDisplayValues()[0];
  marcarCambioReclamos_();
  return { ok: true, fila: destino, v: mostrada, advertencia: advertencia };
}

/**
 * (v17) Agregar sin repetir: la página manda un número de envío con cada reclamo nuevo.
 * Si el mismo envío llega dos veces (la página se cerró o se cortó internet justo mientras
 * se guardaba y lo reintentó), no se carga otra fila: se devuelve la que ya se había cargado.
 * Se recuerda 6 horas (lo máximo de la caché de Google).
 */
function agregarUnaVez_(r, idEnvio) {
  var id = limpiar_(idEnvio);
  if (!id) return agregar_(r);
  var cache = CacheService.getScriptCache(), k = 'envio_' + id.slice(0, 60);
  var ya = parseInt(cache.get(k), 10);
  if (ya) {
    var hoja = obtenerHoja_();
    if (ya <= hoja.getLastRow()) {
      var v = hoja.getRange(ya, 1, 1, COLUMNAS.length).getDisplayValues()[0];
      if (limpiar_(v[COL.ESCUELA - 1]) && limpiar_(v[COL.DETALLE - 1]) === limpiar_(r.detalle)) {
        return { ok: true, fila: ya, v: v, repetido: true };
      }
    }
  }
  var res = agregar_(r);
  try { cache.put(k, String(res.fila), 21600); } catch (e) { /* sin caché: igual se guardó */ }
  return res;
}

function actualizar_(d) {
  var hoja = obtenerHoja_();
  var res = actualizarFila_(hoja, d, listasSoloCache_(), Session.getScriptTimeZone());
  marcarCambioReclamos_();
  borrarCacheHistorico_();   // el resumen de años anteriores se vuelve a leer con el cambio
  return res;
}

/**
 * (v12) Varios cambios en un solo pedido (cambiar el estado de un globo entero).
 * items: [{ fila, huella, cambios }, …]. Cada uno se controla por separado: si uno falla
 * (por ejemplo, la fila cambió), los demás se guardan igual y se informa cuál falló.
 */
function actualizarVarios_(items) {
  if (!items.length) return { ok: true, resultados: [] };
  if (items.length > 300) throw new Error('Demasiados cambios juntos (máximo 300).');
  var hoja = obtenerHoja_(), listas = listasSoloCache_(), tz = Session.getScriptTimeZone();
  // Se leen de una vez todas las filas involucradas (si están cerca), en vez de una por una
  var filas = items.map(function (d) { return parseInt(d.fila, 10) || 0; }).filter(function (n) { return n >= 2; });
  var pre = null;
  if (filas.length) {
    var min = Math.min.apply(null, filas), max = Math.min(Math.max.apply(null, filas), hoja.getLastRow());
    if (max >= min && max - min < 5000) {
      pre = { desde: min,
              display: hoja.getRange(min, 1, max - min + 1, COLUMNAS.length).getDisplayValues(),
              bloque: hoja.getRange(min, COL.ESTADO, max - min + 1, 4).getValues() };
      // (v21) Desplegables de esas columnas, para volver a ponerlos después de escribir
      try { pre.reglas = hoja.getRange(min, COL.ESTADO, max - min + 1, 4).getDataValidations(); } catch (e) { pre.reglas = null; }
    }
  }
  // (v21) Rápido en la hoja original (el Tablero es grande): sin "confirmar" fila por fila.
  // Cada fila se escribe sin desplegables y se le vuelven a poner los mismos, así ninguno puede
  // rechazar nada; se confirma una sola vez al final. Con límite de tiempo: lo que no llega vuelve
  // a la página para reintentar solo.
  var inicio = Date.now(), LIMITE_MS = 200000;
  var resultados = items.map(function (d) {
    if (Date.now() - inicio > LIMITE_MS) return { ok: false, fila: d.fila, reintentar: true, error: 'No llegó a guardarse (se reintenta solo).' };
    try { return actualizarFila_(hoja, d, listas, tz, pre, true); }
    catch (err) { return { ok: false, fila: d.fila, error: String(err && err.message ? err.message : err) }; }
  });
  try { SpreadsheetApp.flush(); }
  catch (errFlush) {
    var m = String(errFlush && errFlush.message ? errFlush.message : errFlush);
    resultados = resultados.map(function (r) { return r.ok ? { ok: false, fila: r.fila, reintentar: true, error: 'Google no confirmó el guardado: ' + m } : r; });
  }
  marcarCambioReclamos_();
  borrarCacheHistorico_();
  return { ok: true, resultados: resultados };
}

/**
 * (v14) Reclasificar: cambia TIPO, CATEGORIA y Subcategoria (columnas 5 a 7) de varios reclamos.
 * items: [{ fila, huella, cambios: { tipo, categoria, subcategoria } }]. Cada uno se controla por
 * separado (la fila tiene que seguir siendo el mismo reclamo). Si cambia la categoría, el
 * desplegable de Subcategoria de esa celda pasa a ser el de la categoría nueva (pestaña "Lista").
 */
function reclasificarVarios_(items) {
  if (!items.length) return { ok: true, resultados: [] };
  if (items.length > 300) throw new Error('Demasiados cambios juntos (máximo 300).');
  var hoja = obtenerHoja_();
  var filas = items.map(function (d) { return parseInt(d.fila, 10) || 0; }).filter(function (n) { return n >= 2; });
  var pre = null;
  if (filas.length) {
    var min = Math.min.apply(null, filas), max = Math.min(Math.max.apply(null, filas), hoja.getLastRow());
    if (max >= min && max - min < 5000) pre = { desde: min, display: hoja.getRange(min, 1, max - min + 1, COLUMNAS.length).getDisplayValues() };
  }
  // (v18) Para que ningún desplegable estricto pueda rechazar nada (y arrastrar al resto de la
  // tanda), cada fila se escribe como al agregar un reclamo: se sacan los desplegables de esas
  // 3 celdas, se escriben los valores y se vuelven a poner los mismos (el de Subcategoria, el de
  // la categoría nueva). Antes se controla que la categoría y el tipo sean valores válidos.
  // Sin flush por fila (con hojas grandes pasaba el límite de tiempo de Google): uno al final.
  var ctx = { reglas: {}, previas: null, desdePrevias: 0, categorias: categoriasValidas_(hoja) };
  if (pre) {
    try { ctx.previas = hoja.getRange(pre.desde, COL.TIPO, pre.display.length, 3).getDataValidations(); ctx.desdePrevias = pre.desde; }
    catch (e) { ctx.previas = null; }
  }
  var inicio = Date.now(), LIMITE_MS = 200000;
  var resultados = items.map(function (d) {
    if (Date.now() - inicio > LIMITE_MS) return { ok: false, fila: d.fila, reintentar: true, error: 'No llegó a guardarse (se reintenta solo).' };
    try { return reclasificarFila_(hoja, d, pre, ctx); }
    catch (err) { return { ok: false, fila: d.fila, error: String(err && err.message ? err.message : err) }; }
  });
  try { SpreadsheetApp.flush(); }
  catch (errFlush) {
    // No debería pasar (no hay desplegables activos al escribir), pero si pasa se avisa
    // y la página los reintenta: repetir no rompe nada.
    var m = String(errFlush && errFlush.message ? errFlush.message : errFlush);
    resultados = resultados.map(function (r) { return r.ok ? { ok: false, fila: r.fila, error: 'Google no confirmó el guardado: ' + m } : r; });
  }
  marcarCambioReclamos_();
  borrarCacheHistorico_();
  return { ok: true, resultados: resultados };
}

/** Categorías válidas: la fila 1 de la pestaña "Lista" (lo que acepta el desplegable de CATEGORIA). */
function categoriasValidas_(hoja) {
  var lista = buscarHojaPorNombre_(hoja.getParent(), 'Lista');
  if (!lista) return null;
  var enc = lista.getRange(1, 1, 1, lista.getLastColumn()).getValues()[0];
  var m = {};
  enc.forEach(function (x) { var t = limpiar_(x); if (t) m[normalizar_(t)] = t; });
  return m;
}

function reclasificarFila_(hoja, d, pre, ctx) {
  var nro = parseInt(d.fila, 10);
  if (!nro || nro < 2 || nro > hoja.getLastRow()) throw new Error('Fila inválida');
  var i = pre ? nro - pre.desde : -1;
  var actual = (pre && i >= 0 && i < pre.display.length) ? pre.display[i].slice() : hoja.getRange(nro, 1, 1, COLUMNAS.length).getDisplayValues()[0];
  var huella = d.huella || {};
  if (limpiar_(actual[COL.ESCUELA - 1]) !== limpiar_(huella.escuela) ||
      limpiar_(actual[COL.DETALLE - 1]) !== limpiar_(huella.detalle) ||
      limpiar_(actual[COL.FECHA - 1]) !== limpiar_(huella.fecha)) {
    throw new Error('La hoja cambió desde que se cargó la lista. Actualizá la lista y volvé a intentar.');
  }
  var c = d.cambios || {};
  var vals = [
    c.tipo !== undefined ? limpiar_(c.tipo) : actual[COL.TIPO - 1],
    c.categoria !== undefined ? limpiar_(c.categoria).toUpperCase() : actual[COL.CATEGORIA - 1],
    c.subcategoria !== undefined ? limpiar_(c.subcategoria).toUpperCase() : actual[COL.SUBCATEGORIA - 1]
  ];
  // Mismos valores que aceptan los desplegables de la hoja (si no, no se escribe)
  var tipoN = normalizar_(vals[0]);
  if (tipoN === 'DIARIA') vals[0] = 'diaria';
  else if (tipoN === 'ESTRUCTURAL') vals[0] = 'Estructural';
  else if (vals[0]) throw new Error('Tipo no válido: ' + vals[0]);
  if (vals[1] && ctx.categorias) {
    var cat = ctx.categorias[normalizar_(vals[1])];
    if (!cat) throw new Error('Categoría no válida (no está en la pestaña Lista): ' + vals[1]);
    vals[1] = cat;
  }
  var cambiaCategoria = normalizar_(vals[1]) !== normalizar_(actual[COL.CATEGORIA - 1]);

  var k = ctx.previas ? nro - ctx.desdePrevias : -1;
  var previas = (ctx.previas && k >= 0 && k < ctx.previas.length) ? ctx.previas[k] : null;
  if (!previas) { try { previas = hoja.getRange(nro, COL.TIPO, 1, 3).getDataValidations()[0]; } catch (e) { previas = [null, null, null]; } }

  var rango = hoja.getRange(nro, COL.TIPO, 1, 3);
  rango.clearDataValidations();
  rango.setValues([vals]);
  if (previas[0]) hoja.getRange(nro, COL.TIPO).setDataValidation(previas[0]);
  if (previas[1]) hoja.getRange(nro, COL.CATEGORIA).setDataValidation(previas[1]);
  var r3 = null;
  if (cambiaCategoria || !previas[2]) { try { r3 = reglaSubcategoria_(hoja, vals[1], ctx.reglas); } catch (e) { r3 = null; } }
  r3 = r3 || previas[2];
  if (r3) hoja.getRange(nro, COL.SUBCATEGORIA).setDataValidation(r3);

  actual[COL.TIPO - 1] = vals[0];
  actual[COL.CATEGORIA - 1] = vals[1];
  actual[COL.SUBCATEGORIA - 1] = vals[2];
  return { ok: true, fila: nro, v: actual };
}

/** Desplegable de Subcategoria para una categoría: la columna de esa categoría en la pestaña "Lista" (filas 3 a 11). */
function reglaSubcategoria_(hoja, categoria, cache) {
  var k = normalizar_(categoria);
  if (cache && cache.hasOwnProperty(k)) return cache[k];
  var regla = null;
  var lista = buscarHojaPorNombre_(hoja.getParent(), 'Lista');
  if (lista) {
    var enc = lista.getRange(1, 1, 1, lista.getLastColumn()).getValues()[0];
    for (var c = 0; c < enc.length; c++) {
      if (normalizar_(enc[c]) === k) {
        regla = SpreadsheetApp.newDataValidation().requireValueInRange(lista.getRange(3, c + 1, 9, 1), true).setAllowInvalid(true).build();
        break;
      }
    }
  }
  if (cache) cache[k] = regla;
  return regla;
}

/** Cambia ESTADO / Responsable / Fecha resolución / ACCIONES de una fila (sin tocar la caché). */
function actualizarFila_(hoja, d, listas, tz, pre, enTanda) {
  var nro = parseInt(d.fila, 10);
  if (!nro || nro < 2 || nro > hoja.getLastRow()) throw new Error('Fila inválida');
  var i = pre ? nro - pre.desde : -1;
  var leida = pre && i >= 0 && i < pre.display.length;

  // Control de seguridad: la fila tiene que seguir siendo el mismo reclamo
  // (por si alguien ordenó o insertó filas en la hoja mientras tanto).
  var actual = leida ? pre.display[i].slice() : hoja.getRange(nro, 1, 1, COLUMNAS.length).getDisplayValues()[0];
  var huella = d.huella || {};
  if (limpiar_(actual[COL.ESCUELA - 1]) !== limpiar_(huella.escuela) ||
      limpiar_(actual[COL.DETALLE - 1]) !== limpiar_(huella.detalle) ||
      limpiar_(actual[COL.FECHA - 1]) !== limpiar_(huella.fecha)) {
    throw new Error('La hoja cambió desde que se cargó la lista. Actualizá la lista y volvé a intentar.');
  }

  // (v10) Más rápido: ESTADO, Responsable, Fecha resolución y ACCIONES están una al
  // lado de la otra, así que se leen y se escriben de una sola vez, sin releer la hoja.
  var cambios = d.cambios || {};
  var bloque = hoja.getRange(nro, COL.ESTADO, 1, 4);   // columnas 12 a 15
  var vals = leida ? pre.bloque[i].slice() : bloque.getValues()[0];
  var I_EST = 0, I_RESP = COL.RESPONSABLE - COL.ESTADO, I_FRES = COL.FECHA_RESOLUCION - COL.ESTADO, I_ACC = COL.ACCIONES - COL.ESTADO;
  var fechaNueva = false;
  if (cambios.estado !== undefined) {
    var estado = limpiar_(cambios.estado);
    if (estado) estado = buscarEnLista_(listas[COL.ESTADO] || ESTADOS_CONOCIDOS, estado) || estado;
    vals[I_EST] = estado;
    if (estado === 'Resuelto') { if (!vals[I_FRES]) { vals[I_FRES] = new Date(); fechaNueva = true; } }
    else vals[I_FRES] = '';
  }
  if (cambios.responsable !== undefined) {
    var resp = limpiar_(cambios.responsable);
    if (resp) resp = buscarEnLista_(listas[COL.RESPONSABLE] || RESPONSABLES_CONOCIDOS, resp) || resp;
    vals[I_RESP] = resp;
  }
  if (cambios.acciones !== undefined) vals[I_ACC] = limpiar_(cambios.acciones);
  // (v12) Deshacer: vuelve a poner la fecha de resolución que tenía ("dd/mm/aa" o vacía)
  if (cambios.fechaResolucion !== undefined) {
    var fr = parsearFechaCorta_(cambios.fechaResolucion);
    vals[I_FRES] = fr || '';
    fechaNueva = !!fr;
  }

  if (enTanda) {
    // (v21) Sin desplegables mientras se escribe; después, los mismos que tenía
    var reglasFila = (leida && pre.reglas) ? pre.reglas[i] : null;
    if (!reglasFila) { try { reglasFila = bloque.getDataValidations()[0]; } catch (e) { reglasFila = null; } }
    bloque.clearDataValidations();
    bloque.setValues([vals]);
    if (reglasFila && reglasFila.some(function (x) { return !!x; })) bloque.setDataValidations([reglasFila]);
  } else try {
    bloque.setValues([vals]);
    // (v13) Google avisa recién al "confirmar" la escritura si un desplegable de la hoja rechaza el
    // valor (ej. la regla "Solo pendiente o resuelto" no admite "En gestión"). Se confirma acá,
    // así el error cae en este reclamo y se usa el camino de abajo, en vez de romper los siguientes.
    SpreadsheetApp.flush();
  } catch (err) {
    // Alguna celda tiene una validación que rechazó el valor: se escribe de a una (como antes)
    if (cambios.estado !== undefined) escribirCelda_(hoja, nro, COL.ESTADO, vals[I_EST]);
    if (cambios.responsable !== undefined) escribirCelda_(hoja, nro, COL.RESPONSABLE, vals[I_RESP]);
    if (cambios.estado !== undefined || cambios.fechaResolucion !== undefined) hoja.getRange(nro, COL.FECHA_RESOLUCION).setValue(vals[I_FRES]);
    if (cambios.acciones !== undefined) hoja.getRange(nro, COL.ACCIONES).setValue(vals[I_ACC]);
  }
  if (fechaNueva) hoja.getRange(nro, COL.FECHA_RESOLUCION).setNumberFormat(FORMATO_FECHA);

  // Se devuelve la fila como quedó, sin volver a leerla
  actual[COL.ESTADO - 1] = vals[I_EST];
  actual[COL.RESPONSABLE - 1] = vals[I_RESP];
  actual[COL.FECHA_RESOLUCION - 1] = vals[I_FRES] instanceof Date ? Utilities.formatDate(vals[I_FRES], tz, FORMATO_FECHA) : String(vals[I_FRES] || '');
  actual[COL.ACCIONES - 1] = vals[I_ACC];
  return { ok: true, fila: nro, v: actual };
}

var ESTADOS_CONOCIDOS = ['Pendiente', 'En gestión', 'Resuelto'];
var RESPONSABLES_CONOCIDOS = ['Muni', 'Proveedor', 'Escuela'];

/** Listas de valores ya guardadas en la caché (no lee la hoja si no están). */
function listasSoloCache_() {
  try {
    var g = CacheService.getScriptCache().get(CLAVE_CACHE);
    if (g) return JSON.parse(g);
  } catch (e) { /* nada */ }
  return {};
}

// ------------------------- DATOS PARA EL BUSCADOR -------------------------

/** Cupos de CUPOS 2026 y celdas de las pestañas de menús. */
function datos_() {
  var tz = Session.getScriptTimeZone();
  var salida = { ok: true, generado: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm"), avisos: [] };

  // --- CUPOS 2026 ---
  var hc = hojaCupos_();
  var vals = hc.getRange(1, 1, hc.getLastRow(), hc.getLastColumn()).getValues();
  salida.cuposOrigen = CUPOS_DE_PRUEBA ? 'prueba' : 'real';
  try { salida.limites = limitesCupos_(vals, tz); }
  catch (err) { salida.avisos.push('No se pudieron leer los límites de cupos: ' + (err && err.message ? err.message : err)); }
  var enc = vals[1] || [];                       // fila 2: ESCUELA, NOMENCLATURA, SERVICIO, PROVEEDOR, CUPO ESPECIAL, fechas…
  var colsFecha = [], fechas = [];
  for (var c = 0; c < enc.length; c++) {
    if (enc[c] instanceof Date) { colsFecha.push(c); fechas.push(Utilities.formatDate(enc[c], tz, 'yyyy-MM-dd')); }
  }
  var filas = [];
  for (var r = 2; r < vals.length; r++) {
    var f = vals[r];
    if (typeof f[0] !== 'string' || !limpiar_(f[0]) || typeof f[2] !== 'string' || !limpiar_(f[2])) continue;
    var cupos = colsFecha.map(function (ci) {
      var v = f[ci];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(v)) return Number(v);
      return null;
    });
    filas.push([limpiar_(f[0]), limpiar_(f[2]), typeof f[3] === 'string' ? limpiar_(f[3]) : '',
                typeof f[4] === 'number' ? f[4] : 0, cupos]);
  }
  // Cupos comprimidos: solo [posición de la fecha, valor] cuando el cupo cambia
  filas.forEach(function (f) {
    var pares = [], previo;
    f[4].forEach(function (v, i) { if (v !== null && v !== previo) { pares.push([i, v]); previo = v; } });
    f[4] = pares;
  });
  salida.cupos = { fechas: fechas, filas: filas, comprimido: true };

  // --- MENÚS ---
  salida.menus = {};
  try {
    var sm = SpreadsheetApp.openById(ID_MENUS);
    Object.keys(HOJAS_MENUS).forEach(function (nombre) {
      var h = buscarHojaPorNombre_(sm, nombre);
      if (!h) { salida.avisos.push('No encontré la pestaña de menús "' + nombre + '"'); return; }
      salida.menus[nombre] = h.getRange(HOJAS_MENUS[nombre]).getValues().map(function (fila) {
        return fila.map(function (v) {
          return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v;
        });
      });
    });
  } catch (err) {
    salida.avisos.push('No se pudieron leer los menús: ' + (err && err.message ? err.message : err));
  }
  return salida;
}

// --------------------------- CUPOS: LÍMITES Y CAMBIOS ---------------------------

/** Pestaña de cupos: la copia de prueba o la real del Tablero, según CUPOS_DE_PRUEBA. */
function hojaCupos_() {
  if (!CUPOS_DE_PRUEBA) return buscarHojaPorNombre_(SpreadsheetApp.openById(ID_TABLERO), HOJA_CUPOS);
  var ss = SpreadsheetApp.openById(ID_CUPOS_PRUEBA), hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) if (hojas[i].getSheetId() === GID_CUPOS_PRUEBA) return hojas[i];
  var h = buscarHojaPorNombre_(ss, 'Copia de CUPOS 2026');
  if (h) return h;
  throw new Error('No encontré la pestaña de cupos de prueba (gid ' + GID_CUPOS_PRUEBA + ')');
}

function esFilaEscuela_(f) {
  return typeof f[0] === 'string' && !!limpiar_(f[0]) && typeof f[2] === 'string' && !!limpiar_(f[2]);
}

/** Número de una celda de cupo: 120, "120" o "43 (1 DIABETICO)" -> 43. Vacío o texto -> null. */
function numeroCupo_(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    var m = /^\s*(\d+(?:[.,]\d+)?)/.exec(v);
    if (m) return Number(m[1].replace(',', '.'));
  }
  return null;
}

/**
 * Forma de la pestaña de cupos: columnas de días (las fechas de la fila 2), hasta qué
 * fila llegan las escuelas (antes de TOTAL / DIA / LIMITE) y cuál es el último día con
 * cupos cargados (índice dentro de "cols", -1 si no hay ninguno).
 */
function estructuraCupos_(vals) {
  var enc = vals[1] || [], cols = [];
  for (var c = 0; c < enc.length; c++) if (enc[c] instanceof Date) cols.push(c);
  var fin = vals.length;
  for (var r = 2; r < vals.length; r++) {
    var a = normalizar_(vals[r][0]);
    if (a === 'TOTAL' || a === 'DIA' || /(LIMITE|ACTUAL)$/.test(a)) { fin = r; break; }
  }
  // Último día "cargado": el último con cupo en al menos la mitad de las escuelas que más
  // tuvieron (así un número suelto adelantado en un día futuro no cuenta como día cargado)
  var cuenta = cols.map(function (ci) {
    var n = 0;
    for (var f = 2; f < fin; f++) if (esFilaEscuela_(vals[f]) && numeroCupo_(vals[f][ci]) !== null) n++;
    return n;
  });
  var maximo = Math.max.apply(null, cuenta.concat([0])), ultimo = -1;
  for (var k = cols.length - 1; k >= 0; k--) if (maximo && cuenta[k] >= maximo * 0.5) { ultimo = k; break; }
  return { cols: cols, fin: fin, ultimo: ultimo, cuenta: cuenta, maximo: maximo };
}

/** DM / COMEDOR / BOLSON según el nombre del servicio (patios, refuerzo, etc. no suman). */
function grupoServicio_(s) {
  var n = normalizar_(s);
  if (/\bLC\b/.test(n) && /\bDM\b/.test(n)) return '';   // LC DM no cuenta en el límite de DM (decisión del equipo)
  if (/BOLSON/.test(n)) return 'BOLSON';
  if (/COMEDOR/.test(n) || /^CM\b/.test(n)) return 'COMEDOR';
  if (/\bDM\b/.test(n)) return 'DM';
  return '';
}

/**
 * Bloque del final de la pestaña (DM LIMITE, DM ACTUAL, COMEDOR LIMITE…) por proveedor,
 * más el "actual" calculado: la suma de los cupos de las escuelas el último día cargado.
 */
function limitesCupos_(vals, tz) {
  var est = estructuraCupos_(vals);
  var salida = { dia: est.ultimo >= 0 ? Utilities.formatDate(vals[1][est.cols[est.ultimo]], tz, 'yyyy-MM-dd') : '', proveedores: [] };
  var filaDm = -1;
  for (var r = est.fin; r < vals.length; r++) if (normalizar_(vals[r][0]) === 'DM LIMITE') { filaDm = r; break; }
  if (filaDm < 0) return salida;
  // Fila con los nombres de los proveedores: la primera de arriba sin título en la columna A
  var filaProv = -1;
  for (var p = filaDm - 1; p >= Math.max(0, filaDm - 4) && filaProv < 0; p--) {
    if (limpiar_(vals[p][0])) continue;
    for (var c = 2; c < vals[p].length; c++) if (typeof vals[p][c] === 'string' && limpiar_(vals[p][c])) { filaProv = p; break; }
  }
  if (filaProv < 0) return salida;
  var etiquetas = {};
  for (var e = filaProv + 1; e < Math.min(vals.length, filaProv + 12); e++) {
    var t = normalizar_(vals[e][0]);
    if (t && etiquetas[t] === undefined) etiquetas[t] = e;
  }
  for (var col = 2; col < vals[filaProv].length; col++) {
    var nombre = vals[filaProv][col];
    if (typeof nombre !== 'string' || !limpiar_(nombre)) continue;
    var item = { proveedor: limpiar_(nombre), grupos: {} };
    ['DM', 'COMEDOR', 'BOLSON'].forEach(function (g) {
      var fl = etiquetas[g + ' LIMITE'], fa = etiquetas[g + ' ACTUAL'];
      item.grupos[g] = {
        limite: fl !== undefined ? numeroCupo_(vals[fl][col]) : null,
        actualHoja: fa !== undefined ? numeroCupo_(vals[fa][col]) : null,
        actual: 0
      };
    });
    salida.proveedores.push(item);
  }
  if (est.ultimo >= 0) {
    var cu = est.cols[est.ultimo];
    for (var f = 2; f < est.fin; f++) {
      var fila = vals[f];
      if (!esFilaEscuela_(fila)) continue;
      var v = numeroCupo_(fila[cu]), g = grupoServicio_(fila[2]);
      if (v === null || !g) continue;
      var pc = compactar_(fila[3]);
      salida.proveedores.forEach(function (it) { if (compactar_(it.proveedor) === pc) it.grupos[g].actual += v; });
    }
  }
  return salida;
}

/**
 * Cambiar el cupo de una escuela (un servicio) desde un día:
 * se escribe el número nuevo en ese día y en los días siguientes que ya tienen cupo
 * cargado, hasta el último día cargado de la pestaña. Los días vacíos (feriados, sin
 * servicio) no se tocan. Si el día elegido es posterior al último cargado, se escribe
 * solo ese día. Las celdas con fórmula o con texto (ej. "43 (1 DIABETICO)") se
 * informan en la previa y solo se pisan si se pide (especiales = 'pisar').
 * guardar = false: solo calcula qué cambiaría (previa). true: escribe y anota el cambio.
 */
function cambiarCupo_(d, guardar) {
  var tz = Session.getScriptTimeZone();
  var fmt = function (x) { return Utilities.formatDate(x, tz, 'yyyy-MM-dd'); };
  var valor = Number(d.valor);
  if (d.valor === '' || d.valor === null || d.valor === undefined || isNaN(valor) || valor < 0 || Math.round(valor) !== valor || valor > 100000) {
    throw new Error('El cupo nuevo tiene que ser un número entero, 0 o más.');
  }
  var desde = parsearFecha_(d.desde);
  if (!desde) throw new Error('Falta el día desde el que rige el cupo.');
  var desdeTxt = fmt(desde);
  // (v19) Cambio por un tiempo: "hasta" = 'mismoDia' (solo ese día), una fecha, o vacío (definitivo)
  var hastaTxt = '';
  if (d.hasta === 'mismoDia') hastaTxt = 'MISMO';
  else if (d.hasta) {
    var hastaF = parsearFecha_(d.hasta);
    if (!hastaF) throw new Error('La fecha "hasta" no es válida.');
    hastaTxt = fmt(hastaF);
    if (hastaTxt < desdeTxt) throw new Error('La fecha "hasta" es anterior a la fecha "desde".');
  }

  var hoja = hojaCupos_();
  var vals = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
  var est = estructuraCupos_(vals);

  // Fila de la escuela y el servicio (por nombre o cualquiera de sus alias)
  var nombres = [d.escuela].concat(d.alias || []).map(compactar_);
  var ns = normalizar_(d.servicio), filas = [];
  for (var r = 2; r < est.fin; r++) {
    var f = vals[r];
    if (esFilaEscuela_(f) && nombres.indexOf(compactar_(f[0])) >= 0 && normalizar_(f[2]) === ns) filas.push(r);
  }
  if (!filas.length) throw new Error('No encontré "' + limpiar_(d.escuela) + ' · ' + limpiar_(d.servicio) + '" en la pestaña de cupos.');
  if (filas.length > 1) {
    throw new Error('"' + limpiar_(d.escuela) + ' · ' + limpiar_(d.servicio) + '" aparece ' + filas.length +
      ' veces en la pestaña de cupos (filas ' + filas.map(function (x) { return x + 1; }).join(', ') + '). Corregilo a mano en la hoja.');
  }
  var r0 = filas[0], fila = vals[r0];

  // Primer día de la pestaña igual o posterior al elegido. Hasta el último día cargado se
  // saltean los días que nadie tiene cargados (feriados): el cupo rige desde el siguiente.
  var k0 = -1;
  for (var k = 0; k < est.cols.length; k++) {
    if (fmt(vals[1][est.cols[k]]) < desdeTxt) continue;
    if (k <= est.ultimo && est.cuenta[k] < est.maximo * 0.5) continue;
    k0 = k; break;
  }
  if (k0 < 0) throw new Error('El día elegido es posterior al último día de la pestaña de cupos.');
  var kFin = Math.max(k0, est.ultimo);
  var hastaElegido = '';
  if (hastaTxt === 'MISMO') { kFin = k0; hastaElegido = fmt(vals[1][est.cols[k0]]); }
  else if (hastaTxt) {
    if (fmt(vals[1][est.cols[k0]]) > hastaTxt) throw new Error('Entre esas fechas no hay ningún día con cupos cargados (fin de semana o feriado).');
    var kh = k0;
    for (var q = k0; q < est.cols.length && fmt(vals[1][est.cols[q]]) <= hastaTxt; q++) kh = q;
    kFin = Math.min(kFin, kh);
    hastaElegido = hastaTxt;
  }
  var c0 = est.cols[k0], ancho = est.cols[kFin] - c0 + 1;
  var formulas = hoja.getRange(r0 + 1, c0 + 1, 1, ancho).getFormulas()[0];

  // Cupo anterior: el del día elegido o, si está vacío, el último número antes
  var antes = null;
  for (var a = k0; a >= 0 && antes === null; a--) antes = numeroCupo_(fila[est.cols[a]]);

  var celdas = [], especiales = [];
  for (var j = k0; j <= kFin; j++) {
    var c = est.cols[j], v = fila[c], fo = formulas[c - c0], vacia = (v === '' || v === null);
    if (j > k0 && vacia && !fo) continue;   // día sin cupo cargado: no se toca
    var especial = !!fo || (!vacia && typeof v !== 'number');
    var item = { c: c, fecha: fmt(vals[1][c]), especial: especial };
    if (especial) especiales.push({ fecha: item.fecha, valor: fo || String(v) });
    celdas.push(item);
  }
  var pisar = d.especiales === 'pisar';
  var aEscribir = celdas.filter(function (x) { return !x.especial || pisar; });

  // Cómo queda el proveedor respecto de su límite (con el cupo del último día cargado)
  var limite = null;
  try {
    var lim = limitesCupos_(vals, tz), g = grupoServicio_(fila[2]), pc = compactar_(fila[3]);
    lim.proveedores.forEach(function (it) {
      if (g && compactar_(it.proveedor) === pc && it.grupos[g].limite !== null) {
        var enUltimo = est.ultimo >= 0 ? (numeroCupo_(fila[est.cols[est.ultimo]]) || 0) : 0;
        limite = { proveedor: it.proveedor, grupo: g, limite: it.grupos[g].limite, actual: it.grupos[g].actual,
                   despues: it.grupos[g].actual - enUltimo + valor, dia: lim.dia };
      }
    });
  } catch (e) { /* sin límite */ }

  var res = {
    ok: true, escuela: limpiar_(fila[0]), servicio: limpiar_(fila[2]), proveedor: limpiar_(fila[3]),
    filaHoja: r0 + 1, antes: antes, valor: valor,
    desde: celdas.length ? celdas[0].fecha : desdeTxt,
    hasta: celdas.length ? celdas[celdas.length - 1].fecha : desdeTxt,
    dias: aEscribir.length, especiales: especiales, limite: limite,
    origen: CUPOS_DE_PRUEBA ? 'prueba' : 'real', ultimoDia: est.ultimo >= 0 ? fmt(vals[1][est.cols[est.ultimo]]) : ''
  };
  if (hastaElegido) {
    var hd = parsearFecha_(hastaElegido);
    res.temporal = true;
    res.hastaElegido = hastaElegido;
    res.vuelve = fmt(new Date(hd.getFullYear(), hd.getMonth(), hd.getDate() + 1));
    res.hastaFueraDeHoja = !!(res.ultimoDia && hastaElegido > res.ultimoDia);
  }
  if (!guardar) return res;

  // Control: que nadie lo haya cambiado entre la previa y el guardado
  if (d.antes !== undefined && d.antes !== null && d.antes !== '' && Number(d.antes) !== antes) {
    throw new Error('El cupo cambió mientras tanto (ahora es ' + antes + '). Cerrá y volvé a intentar.');
  }
  if (!aEscribir.length) { res.guardado = false; res.mensaje = 'No había ningún día para cambiar.'; return res; }

  // Se escribe el tramo de una sola vez, dejando igual lo que no se cambia (fórmulas incluidas)
  var tramo = [];
  for (var x = 0; x < ancho; x++) tramo.push(formulas[x] ? formulas[x] : fila[c0 + x]);
  aEscribir.forEach(function (it) { tramo[it.c - c0] = valor; });
  hoja.getRange(r0 + 1, c0 + 1, 1, ancho).setValues([tramo]);

  registrarCambioCupo_(hoja, res, pisar);
  try { CacheService.getScriptCache().removeAll(['c20_datos_n']); } catch (e) { /* nada */ }
  if (res.temporal) marcarCambioReclamos_();   // así el aviso de "vuelve el cupo" aparece enseguida
  res.guardado = true;
  return res;
}

function fechaCorta_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '');
}

/** Anota el cambio en la pestaña CAMBIOS CUPOS (de la misma planilla), creándola si hace falta. */
function registrarCambioCupo_(hoja, res, pisar) {
  try {
    var ss = hoja.getParent();
    var h = buscarHojaPorNombre_(ss, HOJA_CAMBIOS_CUPOS);
    if (!h) {
      h = ss.insertSheet(HOJA_CAMBIOS_CUPOS);
      h.getRange(1, 1, 1, ENCABEZADOS_CAMBIOS_CUPOS.length).setValues([ENCABEZADOS_CAMBIOS_CUPOS]);
    } else if (!limpiar_(h.getRange(1, 12).getValue())) {
      h.getRange(1, 12, 1, 2).setValues([['Por un tiempo: hasta', 'Después vuelve a']]);   // (v19) columnas nuevas
    }
    darFormatoCambiosCupos_(h);
    var fecha = function (iso) { return parsearFecha_(iso) || ''; };
    h.appendRow([new Date(), res.escuela, res.servicio, res.proveedor, res.antes === null ? '' : res.antes, res.valor,
                 fecha(res.desde), fecha(res.hasta), res.dias,
                 res.especiales.length ? (pisar ? 'Reemplazadas: ' : 'Sin tocar: ') + res.especiales.map(function (e) { return fechaCorta_(e.fecha) + ' (' + e.valor + ')'; }).join('; ') : '',
                 hoja.getName(),
                 res.temporal ? fecha(res.hastaElegido) : '', res.temporal ? (res.antes === null ? '' : res.antes) : '']);
  } catch (e) { /* el cambio ya se hizo; si no se pudo anotar no se frena */ }
}

var ENCABEZADOS_CAMBIOS_CUPOS = ['Fecha del cambio', 'Escuela', 'Servicio', 'Proveedor', 'Cupo anterior', 'Cupo nuevo',
  'Desde', 'Hasta (último día cambiado)', 'Días cambiados', 'Celdas con nota o fórmula', 'Pestaña', 'Por un tiempo: hasta', 'Después vuelve a'];

/** (v20) Deja la pestaña CAMBIOS CUPOS fácil de leer (una sola vez): encabezado de color, anchos,
 *  formatos de fecha y número, filas alternadas y filtro. No cambia ningún dato. */
function darFormatoCambiosCupos_(h) {
  var props = PropertiesService.getScriptProperties(), marca = 'FORMATO_CAMBIOS_CUPOS_' + h.getParent().getId() + '_' + h.getSheetId();
  if (props.getProperty(marca)) return;
  try {
    var n = ENCABEZADOS_CAMBIOS_CUPOS.length;
    h.getRange(1, 1, 1, n).setValues([ENCABEZADOS_CAMBIOS_CUPOS]);
    h.setFrozenRows(1);
    h.setFrozenColumns(2);
    var cab = h.getRange(1, 1, 1, n);
    cab.setFontWeight('bold').setFontColor('#ffffff').setBackground('#1e3a5f').setWrap(true)
       .setVerticalAlignment('middle').setHorizontalAlignment('center');
    h.setRowHeight(1, 40);
    [140, 190, 150, 120, 95, 95, 95, 120, 85, 260, 110, 115, 105].forEach(function (w, i) { h.setColumnWidth(i + 1, w); });
    var filas = Math.max(h.getMaxRows() - 1, 1);
    h.getRange(2, 1, filas, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    [7, 8, 12].forEach(function (c) { h.getRange(2, c, filas, 1).setNumberFormat('dd/mm/yyyy'); });
    [5, 6, 13].forEach(function (c) { h.getRange(2, c, filas, 1).setNumberFormat('#,##0'); });
    h.getRange(2, 9, filas, 1).setNumberFormat('0');
    h.getRange(2, 5, filas, 5).setHorizontalAlignment('center');
    h.getRange(2, 12, filas, 2).setHorizontalAlignment('center');
    h.getRange(2, 10, filas, 1).setWrap(true);
    h.getRange(2, 6, filas, 1).setFontWeight('bold');
    try {
      (h.getBandings() || []).forEach(function (b) { b.remove(); });
      var banda = h.getRange(1, 1, h.getMaxRows(), n).applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false);
      banda.setHeaderRowColor('#1e3a5f').setFirstRowColor('#ffffff').setSecondRowColor('#eef3f9');
    } catch (e) { /* sin filas alternadas */ }
    try { if (!h.getFilter()) h.getRange(1, 1, h.getMaxRows(), n).createFilter(); } catch (e) { /* sin filtro */ }
    props.setProperty(marca, '1');
  } catch (e) { /* el formato es solo para leer mejor */ }
}

// ------------------------------- COPIA DE SEGURIDAD (v22) -------------------------------
// Una copia completa del Tablero por semana en la carpeta de Drive "SAE - Copias del Tablero"
// (de la cuenta dueña del script). Se guardan las últimas 8 semanas; las más viejas van a la papelera.
// Para activarla: en el editor, elegir la función activarCopiaSemanal arriba y tocar ▶ Ejecutar (una sola vez).
var CARPETA_COPIAS = 'SAE - Copias del Tablero';
var SEMANAS_COPIAS = 8;

function copiaDeSeguridad() {
  var tz = Session.getScriptTimeZone();
  var id = ID_PLANILLA_RECLAMOS || SpreadsheetApp.getActiveSpreadsheet().getId();
  var original = DriveApp.getFileById(id);
  var carpetas = DriveApp.getFoldersByName(CARPETA_COPIAS);
  var carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(CARPETA_COPIAS);
  var copia = original.makeCopy(original.getName() + ' · copia ' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH.mm'), carpeta);
  // Las de más de 8 semanas, a la papelera (se pueden recuperar 30 días desde ahí)
  var limite = Date.now() - SEMANAS_COPIAS * 7 * 86400000, borradas = 0, it = carpeta.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getId() !== copia.getId() && f.getName().indexOf(' · copia ') >= 0 && f.getDateCreated().getTime() < limite) { f.setTrashed(true); borradas++; }
  }
  PropertiesService.getScriptProperties().setProperty('ULTIMA_COPIA', JSON.stringify({
    cuando: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm"), url: copia.getUrl(), nombre: copia.getName(), borradas: borradas }));
  Logger.log('Copia hecha: ' + copia.getUrl());
  return copia.getUrl();
}

/** Ejecutar UNA vez desde el editor: programa la copia todos los lunes a la mañana y hace la primera ya. */
function activarCopiaSemanal() {
  desactivarCopiaSemanal();
  ScriptApp.newTrigger('copiaDeSeguridad').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).create();
  return copiaDeSeguridad();
}

/** Para dejar de hacer copias automáticas (las que ya están quedan en Drive). */
function desactivarCopiaSemanal() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'copiaDeSeguridad') ScriptApp.deleteTrigger(t);
  });
}

// ------------------------------- DIAGNÓSTICO (v19) -------------------------------

/**
 * Chequeo para la página "Estado del sistema": qué hoja usa, la pestaña "Lista", escuelas
 * repetidas en la pestaña de cupos, último día cargado y cuándo se guardó algo por última vez.
 * Solo lee: no cambia nada.
 */
function diagnostico_() {
  var tz = Session.getScriptTimeZone();
  var fmtF = function (d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };
  var out = { ok: true, cuposDePrueba: CUPOS_DE_PRUEBA, gidReclamos: GID_RECLAMOS };
  var hoja = obtenerHoja_();
  out.hojaReclamos = { nombre: hoja.getName(), planilla: hoja.getParent().getName(), id: hoja.getParent().getId(), filas: hoja.getLastRow(),
                       ultimaFila: Number(PropertiesService.getScriptProperties().getProperty('ULTIMA_FILA_V20')) || null };
  // (v22) Copias de seguridad
  try { out.copia = JSON.parse(PropertiesService.getScriptProperties().getProperty('ULTIMA_COPIA') || 'null'); } catch (e) { out.copia = null; }
  try {
    out.copiaActiva = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'copiaDeSeguridad'; });
  } catch (e) { out.copiaActiva = null; }   // sin permiso todavía (falta ejecutar activarCopiaSemanal)
  var ultimoCambio = Number(versionReclamos_()) || 0;
  out.ultimoCambio = ultimoCambio ? Utilities.formatDate(new Date(ultimoCambio), tz, "yyyy-MM-dd'T'HH:mm") : '';

  // Pestaña "Lista": categorías (fila 1) y motivos de cada una (filas 3 a 11)
  try {
    var lista = buscarHojaPorNombre_(hoja.getParent(), 'Lista');
    if (lista) {
      var lv = lista.getRange(1, 1, 11, Math.max(1, lista.getLastColumn())).getValues();
      out.lista = {};
      lv[0].forEach(function (cat, c) {
        var k = limpiar_(cat);
        if (!k) return;
        out.lista[k] = [];
        for (var r = 2; r < 11; r++) { var m = limpiar_(lv[r][c]); if (m) out.lista[k].push(m); }
      });
    } else out.lista = null;
  } catch (e) { out.listaError = String(e && e.message || e); }

  // Pestaña de cupos: último día cargado y escuelas repetidas (escuela + servicio)
  try {
    var hc = hojaCupos_();
    var vals = hc.getRange(1, 1, hc.getLastRow(), hc.getLastColumn()).getValues();
    var est = estructuraCupos_(vals);
    out.cupos = { pestana: hc.getName(), planilla: hc.getParent().getName(),
                  ultimoDia: est.ultimo >= 0 ? fmtF(vals[1][est.cols[est.ultimo]]) : '', repetidas: [] };
    var vistos = {};
    for (var f = 2; f < est.fin; f++) {
      if (!esFilaEscuela_(vals[f])) continue;
      var k2 = compactar_(vals[f][0]) + '|' + normalizar_(vals[f][2]);
      if (vistos[k2]) out.cupos.repetidas.push({ escuela: limpiar_(vals[f][0]), servicio: limpiar_(vals[f][2]), filas: [vistos[k2], f + 1] });
      else vistos[k2] = f + 1;
    }
    var cc = buscarHojaPorNombre_(hc.getParent(), HOJA_CAMBIOS_CUPOS);
    if (cc && cc.getLastRow() >= 2) {
      var u = cc.getRange(cc.getLastRow(), 1, 1, 3).getValues()[0];
      out.cupos.ultimoCambio = { cuando: u[0] instanceof Date ? Utilities.formatDate(u[0], tz, "yyyy-MM-dd'T'HH:mm") : String(u[0]),
                                 escuela: limpiar_(u[1]), servicio: limpiar_(u[2]) };
    }
  } catch (e) { out.cuposError = String(e && e.message || e); }
  return out;
}

// ------------------------------- AVISOS PRÓXIMOS -------------------------------

/**
 * Reclamos de categoría AVISO con fecha entre ayer y dentro de 4 días (la página
 * se queda con los de hoy a 2 días; el margen es por diferencias de hora).
 */
function avisos_() {
  var tz = Session.getScriptTimeZone();
  var ahora = new Date();
  var hoyTxt = Utilities.formatDate(ahora, tz, 'yyyy-MM-dd');
  var dia = 86400000;
  var minTxt = Utilities.formatDate(new Date(ahora.getTime() - dia), tz, 'yyyy-MM-dd');
  var maxTxt = Utilities.formatDate(new Date(ahora.getTime() + 4 * dia), tz, 'yyyy-MM-dd');
  var hoja = obtenerHoja_();
  var r = filasDesde_(hoja, Number(minTxt.slice(0, 4)));
  var lista = [];
  for (var i = 0; i < r.valores.length; i++) {
    var f = r.valores[i], d = r.fechas[i][0];
    if (!(d instanceof Date)) continue;
    if (normalizar_(f[COL.CATEGORIA - 1]).indexOf('AVISO') !== 0) continue;
    var iso = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    if (iso < minTxt || iso > maxTxt) continue;
    lista.push({ fila: r.inicio + i, fecha: iso, escuela: limpiar_(f[COL.ESCUELA - 1]), proveedor: limpiar_(f[COL.PROVEEDOR - 1]),
                 servicio: limpiar_(f[COL.SERVICIO - 1]), motivo: limpiar_(f[COL.SUBCATEGORIA - 1]),
                 detalle: limpiar_(f[COL.DETALLE - 1]).slice(0, 400), estado: limpiar_(f[COL.ESTADO - 1]) });
  }
  // (v19) Cupos cambiados por un tiempo: aviso el día que vuelven a lo de antes
  try { lista = lista.concat(avisosCupos_(minTxt, maxTxt, tz)); } catch (e) { /* sin pestaña de cambios */ }
  return { ok: true, hoy: hoyTxt, avisos: lista };
}

/** Avisos "vuelve el cupo": cambios de CAMBIOS CUPOS con "Por un tiempo: hasta" (el día siguiente). */
function avisosCupos_(minTxt, maxTxt, tz) {
  var h = buscarHojaPorNombre_(hojaCupos_().getParent(), HOJA_CAMBIOS_CUPOS);
  if (!h || h.getLastRow() < 2 || h.getLastColumn() < 13) return [];
  var ini = Math.max(2, h.getLastRow() - 600 + 1);
  var v = h.getRange(ini, 1, h.getLastRow() - ini + 1, 13).getValues();
  var fechaDe = function (x) {
    if (x instanceof Date) return x;
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(limpiar_(x));
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  };
  var out = [];
  v.forEach(function (r) {
    var hd = fechaDe(r[11]);
    if (!hd) return;
    var vuelta = new Date(hd.getFullYear(), hd.getMonth(), hd.getDate() + 1);
    var iso = Utilities.formatDate(vuelta, tz, 'yyyy-MM-dd');
    if (iso < minTxt || iso > maxTxt) return;
    var antes = r[12] === '' || r[12] === null ? 'lo de antes' : r[12];
    out.push({ tipo: 'cupo', fecha: iso, escuela: limpiar_(r[1]), servicio: limpiar_(r[2]), proveedor: limpiar_(r[3]), motivo: 'CUPO',
               detalle: 'Vuelve el cupo de ' + limpiar_(r[2]) + ' a ' + antes + ' (estuvo en ' + r[5] + ' hasta el ' +
                 Utilities.formatDate(hd, tz, 'dd/MM') + '). Revisá que la hoja de cupos lo tenga así.', estado: '' });
  });
  return out;
}

/** Versión liviana de los reclamos (para la ficha de cada escuela). */
function compacto_(desde) {
  var hoja = obtenerHoja_();
  var r = filasDesde_(hoja, desde);
  var filas = [];
  for (var i = 0; i < r.valores.length; i++) {
    var f = r.valores[i];
    if (!limpiar_(f[COL.ESCUELA - 1]) && !limpiar_(f[COL.DETALLE - 1])) continue;
    var d = r.fechas[i][0];
    if (desde && d instanceof Date && d.getFullYear() < desde) continue;
    filas.push([r.inicio + i, f[COL.FECHA - 1], f[COL.ESCUELA - 1], f[COL.PROVEEDOR - 1], f[COL.SERVICIO - 1],
                f[COL.CATEGORIA - 1], f[COL.SUBCATEGORIA - 1], f[COL.PRODUCTO - 1], f[COL.ESTADO - 1],
                f[COL.PROBLEMA - 1], String(f[COL.DETALLE - 1]).slice(0, 160)]);
  }
  return { ok: true, filas: filas };
}

function buscarHojaPorNombre_(ss, nombre) {
  var buscado = String(nombre).trim().toUpperCase();
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (hojas[i].getName().trim().toUpperCase() === buscado) return hojas[i];
  }
  if (nombre === HOJA_CUPOS) throw new Error('No encontré la pestaña "' + nombre + '" en el Tablero');
  return null;
}

// ------------------------------- AUXILIARES ------------------------------

var hojaReclamosMemo_ = null;
function obtenerHoja_() {
  if (hojaReclamosMemo_) return hojaReclamosMemo_;
  var ss = ID_PLANILLA_RECLAMOS ? SpreadsheetApp.openById(ID_PLANILLA_RECLAMOS) : SpreadsheetApp.getActiveSpreadsheet();
  var hojas = ss.getSheets(), hoja = null;
  for (var i = 0; i < hojas.length && !hoja; i++) {
    if (hojas[i].getSheetId() === GID_RECLAMOS) hoja = hojas[i];
  }
  for (var k = 0; k < hojas.length && !hoja; k++) {
    if (hojas[k].getName().trim().toUpperCase() === NOMBRE_HOJA_RECLAMOS.toUpperCase()) hoja = hojas[k];
  }
  if (!hoja) throw new Error('No encontré la pestaña de reclamos (gid ' + GID_RECLAMOS + ' ni una llamada "' + NOMBRE_HOJA_RECLAMOS + '")');
  // (v20) La pestaña original tenía 15 columnas: se agregan PROBLEMA y PATOLOGÍA al final si faltan
  if (hoja.getMaxColumns() < COLUMNAS.length) hoja.insertColumnsAfter(hoja.getMaxColumns(), COLUMNAS.length - hoja.getMaxColumns());
  hojaReclamosMemo_ = hoja;
  return hoja;
}

/** Agrega los encabezados PROBLEMA y PATOLOGÍA si todavía no existen. */
function asegurarColumnasNuevas_(hoja) {
  var enc = hoja.getRange(1, COL.PROBLEMA, 1, 2).getValues()[0];
  if (!enc[0]) hoja.getRange(1, COL.PROBLEMA).setValue(COLUMNAS[COL.PROBLEMA - 1]);
  if (!enc[1]) hoja.getRange(1, COL.PATOLOGIA).setValue(COLUMNAS[COL.PATOLOGIA - 1]);
}

/**
 * Primera fila libre después del último reclamo (ignora filas con restos sueltos).
 * Para no leer toda la hoja, solo revisa el final.
 */
function primeraFilaLibre_(hoja) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return 2;
  var guardada = Number(PropertiesService.getScriptProperties().getProperty('ULTIMA_FILA_V20') || 0);
  var desde = Math.max(2, Math.min(guardada || ultima, ultima) - 50);
  // Si la hoja creció mucho por otro lado (carga a mano), se revisa un tramo mayor
  if (ultima - desde > 400) desde = Math.max(2, ultima - 400);
  var bloque = hoja.getRange(desde, COL.ESCUELA, ultima - desde + 1, COL.DETALLE - COL.ESCUELA + 1).getDisplayValues();
  for (var i = bloque.length - 1; i >= 0; i--) {
    var f = bloque[i];
    if (limpiar_(f[0]) || limpiar_(f[COL.DETALLE - COL.ESCUELA])) return desde + i + 1;
  }
  // Nada en el tramo: se revisa la hoja completa (caso raro)
  var todo = hoja.getRange(2, COL.ESCUELA, ultima - 1, COL.DETALLE - COL.ESCUELA + 1).getDisplayValues();
  for (var j = todo.length - 1; j >= 0; j--) {
    if (limpiar_(todo[j][0]) || limpiar_(todo[j][COL.DETALLE - COL.ESCUELA])) return j + 3;
  }
  return 2;
}

function guardarUltimaFila_(fila) {
  try { PropertiesService.getScriptProperties().setProperty('ULTIMA_FILA_V20', String(fila)); } catch (e) { /* nada */ }
}

// ------------------------- LISTAS DE REFERENCIA (CACHÉ) -------------------------
// Columnas cuyos valores se ajustan a como ya figuran en la hoja.
var COLUMNAS_CON_LISTA = [COL.ESCUELA, COL.PROVEEDOR, COL.SERVICIO, COL.TIPO, COL.CATEGORIA,
                          COL.SUBCATEGORIA, COL.PRODUCTO, COL.ESTADO, COL.RESPONSABLE];
var CLAVE_CACHE = 'listas_v20';

/**
 * Valores conocidos por columna: los que ya están cargados en la hoja.
 * Se leen una vez y quedan en caché 6 horas, así cada guardado no relee la hoja.
 */
function listasDeReferencia_(hoja) {
  var cache = CacheService.getScriptCache();
  var guardado = cache.get(CLAVE_CACHE);
  if (guardado) {
    try { return JSON.parse(guardado); } catch (e) { /* se recalcula */ }
  }
  var ultima = hoja.getLastRow();
  var listas = {};
  COLUMNAS_CON_LISTA.forEach(function (c) { listas[c] = []; });
  if (ultima >= 2) {
    var datos = hoja.getRange(2, 1, ultima - 1, COLUMNAS.length).getDisplayValues();
    var vistos = {};
    for (var i = 0; i < datos.length; i++) {
      for (var k = 0; k < COLUMNAS_CON_LISTA.length; k++) {
        var c = COLUMNAS_CON_LISTA[k];
        var v = String(datos[i][c - 1]);
        if (limpiar_(v) && !vistos[c + '|' + v]) { vistos[c + '|' + v] = true; listas[c].push(v); }
      }
    }
  }
  guardarCache_(listas);
  return listas;
}

function agregarALaCache_(fila) {
  var cache = CacheService.getScriptCache();
  var guardado = cache.get(CLAVE_CACHE);
  if (!guardado) return;
  try {
    var listas = JSON.parse(guardado);
    COLUMNAS_CON_LISTA.forEach(function (c) {
      var v = fila[c - 1];
      if (typeof v === 'string' && v && listas[c] && listas[c].indexOf(v) < 0) listas[c].push(v);
    });
    guardarCache_(listas);
  } catch (e) { /* nada */ }
}

function guardarCache_(listas) {
  try {
    var txt = JSON.stringify(listas);
    if (txt.length < 95000) CacheService.getScriptCache().put(CLAVE_CACHE, txt, 21600);
  } catch (e) { /* si no entra en la caché, se recalcula la próxima vez */ }
}

/** Devuelve el valor de la lista equivalente a "valor" (mayúsculas, acentos, espacios, ceros), o ''. */
function buscarEnLista_(opciones, valor) {
  if (opciones.indexOf(valor) >= 0) return valor;
  var n1 = normalizar_(valor), n2 = compactar_(valor);
  for (var k = 0; k < opciones.length; k++) if (normalizar_(opciones[k]) === n1) return opciones[k];
  for (var m = 0; m < opciones.length; m++) if (compactar_(opciones[m]) === n2) return opciones[m];
  return '';
}


/** Escribe una celda; si su desplegable rechaza el valor, lo escribe igual y restaura el desplegable. */
function escribirCelda_(hoja, filaNro, col, valor) {
  var celda = hoja.getRange(filaNro, col);
  try {
    celda.setValue(valor);
    SpreadsheetApp.flush();
  } catch (err) {
    var regla = null;
    try { regla = celda.getDataValidation(); } catch (e) { /* nada */ }
    celda.clearDataValidations();
    celda.setValue(valor);
    SpreadsheetApp.flush();
    try { if (regla) { celda.setDataValidation(regla); SpreadsheetApp.flush(); } } catch (e) { /* nada */ }
  }
}

function normalizar_(t) {
  return limpiar_(t).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function compactar_(t) {
  return normalizar_(t).replace(/N\s*[°º]\s*/g, '').replace(/[^A-Z0-9]/g, '').replace(/([A-Z])0+(\d)/g, '$1$2');
}

function verificarClave_(clave) {
  var guardada = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!guardada) return; // Sin clave configurada: acceso libre
  if (String(clave || '') !== guardada) throw new Error('CLAVE_INCORRECTA');
}

/** "21/10/26" o "21/10/2026" -> Date (null si no es una fecha). */
function parsearFechaCorta_(txt) {
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(txt || '').trim());
  if (!m) return null;
  var a = Number(m[3]); if (a < 100) a += 2000;
  return new Date(a, Number(m[2]) - 1, Number(m[1]));
}

function parsearFecha_(txt) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(txt || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function numeroOVacio_(x) {
  var n = parseFloat(x);
  return isNaN(n) ? '' : n;
}

function limpiar_(x) {
  return String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
}

function responder_(fn) {
  var salida;
  try {
    salida = fn();
  } catch (err) {
    salida = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  salida.version = VERSION_SCRIPT;
  return ContentService.createTextOutput(JSON.stringify(salida))
    .setMimeType(ContentService.MimeType.JSON);
}
