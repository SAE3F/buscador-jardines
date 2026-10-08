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
 *
 * NO borra ni reordena filas. Solo agrega filas al final y modifica las
 * celdas de seguimiento (ESTADO, Responsable, Fecha resolución, ACCIONES).
 * ==========================================================================
 */

// ----------------------------- CONFIGURACIÓN -----------------------------

// Versión del script. La página avisa si el publicado es más viejo.
var VERSION_SCRIPT = 7;

// Número de la pestaña de reclamos: es lo que aparece después de "gid=" en el link.
// Copia de prueba: 1036384707. Al pasar a la hoja original, cambiar este número.
var GID_RECLAMOS = 1036384707;

// Planillas de donde el buscador toma cupos y menús (solo lectura).
// Son los códigos que aparecen en el link: docs.google.com/spreadsheets/d/CÓDIGO/edit
var ID_TABLERO = '1P57PeQ8WeLJbEovcGNKsT-4K_2AmCXpWF1W-MrwYShQ';   // SAE | Tablero Gestión
var HOJA_CUPOS = 'CUPOS 2026';
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
    if (accion === 'datos') return datos_();
    if (accion === 'compacto') return compacto_();
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

// ------------------------- DATOS PARA EL BUSCADOR -------------------------

/** Cupos de CUPOS 2026 y celdas de las pestañas de menús. */
function datos_() {
  var tz = Session.getScriptTimeZone();
  var salida = { ok: true, generado: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm"), avisos: [] };

  // --- CUPOS 2026 ---
  var hc = buscarHojaPorNombre_(SpreadsheetApp.openById(ID_TABLERO), HOJA_CUPOS);
  var vals = hc.getRange(1, 1, hc.getLastRow(), hc.getLastColumn()).getValues();
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
  salida.cupos = { fechas: fechas, filas: filas };

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

/** Versión liviana de los reclamos (para la ficha de cada escuela). */
function compacto_() {
  var hoja = obtenerHoja_();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return { ok: true, filas: [] };
  var v = hoja.getRange(2, 1, ultima - 1, COLUMNAS.length).getDisplayValues();
  var filas = [];
  for (var i = 0; i < v.length; i++) {
    var f = v[i];
    if (!limpiar_(f[COL.ESCUELA - 1]) && !limpiar_(f[COL.DETALLE - 1])) continue;
    filas.push([i + 2, f[COL.FECHA - 1], f[COL.ESCUELA - 1], f[COL.PROVEEDOR - 1], f[COL.SERVICIO - 1],
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
