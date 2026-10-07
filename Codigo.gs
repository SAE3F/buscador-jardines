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
var VERSION_SCRIPT = 5;

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

  // Si alguna columna tiene lista desplegable (validación de datos), se usa
  // el valor exacto de esa lista (mayúsculas, acentos y espacios incluidos).
  for (var c = 0; c < COLUMNAS.length; c++) {
    if (typeof fila[c] === 'string' && fila[c] !== '') {
      fila[c] = ajustarALista_(hoja, destino, c + 1, fila[c]);
    }
  }
  var rangoFila = hoja.getRange(destino, 1, 1, COLUMNAS.length);
  var advertencia = '';
  try {
    rangoFila.setValues([fila]);
    // Sheets aplica los cambios más tarde: se fuerzan ahora para que, si la
    // lista desplegable los rechaza, el error salte acá y no al final.
    SpreadsheetApp.flush();
  } catch (err) {
    // Alguna lista desplegable de la hoja rechazó un valor (pasa cuando la lista
    // está incompleta o apunta a un rango que ya no existe). Se escribe la fila
    // sin validación y después se le copian los desplegables de la fila de arriba,
    // igual que las filas que ya existen.
    rangoFila.clearDataValidations();
    rangoFila.setValues([fila]);
    SpreadsheetApp.flush();
    copiarValidacionDeArriba_(hoja, destino);
    advertencia = 'Se guardó, pero la hoja marca algún valor como fuera de su lista desplegable ' +
      '(triangulito rojo). Conviene revisar las listas de la hoja.';
  }
  hoja.getRange(destino, COL.FECHA).setNumberFormat(FORMATO_FECHA);
  hoja.getRange(destino, COL.FECHA_RESOLUCION).setNumberFormat(FORMATO_FECHA);

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
    if (estado) estado = ajustarALista_(hoja, nro, COL.ESTADO, estado);
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
    if (resp) resp = ajustarALista_(hoja, nro, COL.RESPONSABLE, resp);
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

/** Última fila con ESCUELA o DETALLE cargados + 1 (ignora filas con restos sueltos). */
function primeraFilaLibre_(hoja) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return 2;
  var bloque = hoja.getRange(2, 1, ultima - 1, COL.DETALLE).getDisplayValues();
  for (var i = bloque.length - 1; i >= 0; i--) {
    var f = bloque[i];
    if (limpiar_(f[COL.ESCUELA - 1]) || limpiar_(f[COL.DETALLE - 1])) return i + 3;
  }
  return 2;
}

/**
 * Si la celda tiene una lista desplegable, devuelve el valor de la lista que
 * corresponde a "valor" sin importar mayúsculas, acentos, espacios o "N°".
 * Si no está en la lista y la hoja rechaza valores inválidos, avisa cuál es.
 */
function ajustarALista_(hoja, filaNro, col, valor) {
  var info = opcionesDeLaCelda_(hoja, filaNro, col);
  if (!info) return valor;                 // La columna no tiene lista desplegable
  var opciones = info.opciones;
  if (!opciones.length) return valor;

  if (opciones.indexOf(valor) >= 0) return valor;
  var n1 = normalizar_(valor), n2 = compactar_(valor);
  for (var k = 0; k < opciones.length; k++) if (normalizar_(opciones[k]) === n1) return opciones[k];
  for (var m = 0; m < opciones.length; m++) if (compactar_(opciones[m]) === n2) return opciones[m];

  // Si la lista no se pudo leer (se usaron los valores de la columna) o la hoja
  // solo advierte, se escribe igual y decide la hoja.
  if (info.aproximada || info.permiteInvalidos) return valor;

  var encabezado = limpiar_(hoja.getRange(1, col).getDisplayValue()) || ('columna ' + col);
  var nums = (valor.match(/\d+/g) || []).join(' ');
  var primera = n1.split(' ')[0];
  var parecidas = opciones.filter(function (o) {
    var no = normalizar_(o);
    return (nums && (no.match(/\d+/g) || []).join(' ') === nums) || no.indexOf(primera) === 0;
  }).slice(0, 5);
  throw new Error('"' + valor + '" no está en la lista de ' + encabezado + ' de la hoja.' +
    (parecidas.length ? ' Parecidas: ' + parecidas.join(', ') + '.' : ' Agregalo a la lista desplegable de esa columna.'));
}

/**
 * Devuelve { opciones, permiteInvalidos, aproximada } con los valores permitidos
 * por la lista desplegable de la celda, o null si no tiene lista.
 * Si la lista apunta a un rango que no se puede abrir (pasa en las copias),
 * usa como referencia los valores ya cargados en esa columna.
 */
var CACHE_COLUMNAS_ = {};
function opcionesDeLaCelda_(hoja, filaNro, col) {
  var regla;
  try {
    regla = hoja.getRange(filaNro, col).getDataValidation();
  } catch (e) {
    return { opciones: valoresDeColumna_(hoja, col), permiteInvalidos: true, aproximada: true };
  }
  if (!regla) return null;
  var permite = false;
  try { permite = regla.getAllowInvalid(); } catch (e) { /* nada */ }
  try {
    var tipo = regla.getCriteriaType();
    var criterio = regla.getCriteriaValues();
    var opciones = [];
    if (tipo === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
      opciones = criterio[0] || [];
    } else if (tipo === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
      var valores = criterio[0].getDisplayValues();
      for (var i = 0; i < valores.length; i++) for (var j = 0; j < valores[i].length; j++) opciones.push(valores[i][j]);
    } else {
      return null; // Otro tipo de validación (números, fórmulas): no se toca
    }
    opciones = opciones.map(function (o) { return String(o); }).filter(function (o) { return limpiar_(o) !== ''; });
    return { opciones: opciones, permiteInvalidos: permite, aproximada: false };
  } catch (e) {
    return { opciones: valoresDeColumna_(hoja, col), permiteInvalidos: permite, aproximada: true };
  }
}

function valoresDeColumna_(hoja, col) {
  if (CACHE_COLUMNAS_[col]) return CACHE_COLUMNAS_[col];
  var ultima = hoja.getLastRow();
  var vistos = {}, lista = [];
  if (ultima >= 2) {
    var vals = hoja.getRange(2, col, ultima - 1, 1).getDisplayValues();
    for (var i = 0; i < vals.length; i++) {
      var v = String(vals[i][0]);
      if (limpiar_(v) && !vistos[v]) { vistos[v] = true; lista.push(v); }
    }
  }
  CACHE_COLUMNAS_[col] = lista;
  return lista;
}

/** Copia solo los desplegables (validación) de la fila anterior a la fila indicada. */
function copiarValidacionDeArriba_(hoja, filaNro) {
  if (filaNro <= 2) return;
  try {
    hoja.getRange(filaNro - 1, 1, 1, COLUMNAS.length).copyTo(
      hoja.getRange(filaNro, 1, 1, COLUMNAS.length),
      SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
    SpreadsheetApp.flush();
  } catch (e) { /* si no se puede, la fila queda sin desplegable */ }
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
