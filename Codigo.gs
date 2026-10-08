/**
 * ==========================================================================
 * PUENTE RECLAMOS SAE  <->  GOOGLE SHEETS
 * Se pega dentro de la planilla (Extensiones > Apps Script) y se publica
 * como "Aplicación web". La página de reclamos le habla a este script para:
 *   - leer todos los reclamos (buscador)
 *   - agregar un reclamo nuevo (formulario)
 *   - cambiar estado / responsable / acciones de un reclamo (seguimiento)
 *
 * NO borra ni reordena filas. Solo agrega filas al final y modifica las
 * celdas de seguimiento (ESTADO, Responsable, Fecha resolución, ACCIONES).
 * ==========================================================================
 */

// ----------------------------- CONFIGURACIÓN -----------------------------

// Versión del script. La página avisa si el publicado es más viejo.
var VERSION_SCRIPT = 6;

// Número de la pestaña de reclamos: es lo que aparece después de "gid=" en el link.
// Copia de prueba: 1036384707. Al pasar a la hoja original, cambiar este número.
var GID_RECLAMOS = 1036384707;

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
    return listar_();
  });
}

/** Escritura: agregar o actualizar. El cuerpo llega como texto JSON. */
function doPost(e) {
  return responder_(function () {
    var datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    verificarClave_(datos.clave);

    // Un solo cambio a la vez, para que dos personas cargando juntas no se pisen
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (datos.accion === 'agregar') return agregar_(datos.reclamo || {});
      if (datos.accion === 'actualizar') return actualizar_(datos);
      throw new Error('Acción desconocida');
    } finally {
      lock.releaseLock();
    }
  });
}

// ------------------------------- ACCIONES --------------------------------

function listar_() {
  var hoja = obtenerHoja_();
  asegurarColumnasNuevas_(hoja);
  var ultima = hoja.getLastRow();
  if (ultima < 2) return { ok: true, filas: [] };

  var valores = hoja.getRange(2, 1, ultima - 1, COLUMNAS.length).getDisplayValues();
  var filas = [];
  for (var i = 0; i < valores.length; i++) {
    var v = valores[i];
    // Saltear filas sin escuela ni detalle (vacías o con restos sueltos)
    if (!limpiar_(v[COL.ESCUELA - 1]) && !limpiar_(v[COL.DETALLE - 1])) continue;
    filas.push({ fila: i + 2, v: v });
  }
  return { ok: true, filas: filas, total: filas.length };
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
  return { ok: true, fila: destino, v: mostrada, advertencia: advertencia };
}

function actualizar_(d) {
  var hoja = obtenerHoja_();
  var nro = parseInt(d.fila, 10);
  if (!nro || nro < 2 || nro > hoja.getLastRow()) throw new Error('Fila inválida');

  // Control de seguridad: la fila tiene que seguir siendo el mismo reclamo
  // (por si alguien ordenó o insertó filas en la hoja mientras tanto).
  var actual = hoja.getRange(nro, 1, 1, COLUMNAS.length).getDisplayValues()[0];
  var huella = d.huella || {};
  if (limpiar_(actual[COL.ESCUELA - 1]) !== limpiar_(huella.escuela) ||
      limpiar_(actual[COL.DETALLE - 1]) !== limpiar_(huella.detalle) ||
      limpiar_(actual[COL.FECHA - 1]) !== limpiar_(huella.fecha)) {
    throw new Error('La hoja cambió desde que se cargó la lista. Actualizá la lista y volvé a intentar.');
  }

  var cambios = d.cambios || {};
  if (cambios.estado !== undefined) {
    var estado = limpiar_(cambios.estado);
    if (estado) estado = buscarEnLista_(listasDeReferencia_(hoja)[COL.ESTADO] || [], estado) || estado;
    escribirCelda_(hoja, nro, COL.ESTADO, estado);
    var celdaRes = hoja.getRange(nro, COL.FECHA_RESOLUCION);
    if (estado === 'Resuelto') {
      if (!celdaRes.getValue()) celdaRes.setValue(new Date()).setNumberFormat(FORMATO_FECHA);
    } else {
      celdaRes.setValue('');
    }
  }
  if (cambios.responsable !== undefined) {
    var resp = limpiar_(cambios.responsable);
    if (resp) resp = buscarEnLista_(listasDeReferencia_(hoja)[COL.RESPONSABLE] || [], resp) || resp;
    escribirCelda_(hoja, nro, COL.RESPONSABLE, resp);
  }
  if (cambios.acciones !== undefined) hoja.getRange(nro, COL.ACCIONES).setValue(limpiar_(cambios.acciones));

  return { ok: true, fila: nro, v: hoja.getRange(nro, 1, 1, COLUMNAS.length).getDisplayValues()[0] };
}

// ------------------------------- AUXILIARES ------------------------------

function obtenerHoja_() {
  var hojas = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (hojas[i].getSheetId() === GID_RECLAMOS) return hojas[i];
  }
  throw new Error('No encontré la pestaña de reclamos (gid ' + GID_RECLAMOS + ')');
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
  var guardada = Number(PropertiesService.getScriptProperties().getProperty('ULTIMA_FILA') || 0);
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
  try { PropertiesService.getScriptProperties().setProperty('ULTIMA_FILA', String(fila)); } catch (e) { /* nada */ }
}

// ------------------------- LISTAS DE REFERENCIA (CACHÉ) -------------------------
// Columnas cuyos valores se ajustan a como ya figuran en la hoja.
var COLUMNAS_CON_LISTA = [COL.ESCUELA, COL.PROVEEDOR, COL.SERVICIO, COL.TIPO, COL.CATEGORIA,
                          COL.SUBCATEGORIA, COL.PRODUCTO, COL.ESTADO, COL.RESPONSABLE];
var CLAVE_CACHE = 'listas_v1';

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
