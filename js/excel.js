/**
 * EXPORTAR A EXCEL (.xlsx) — SAE Tres de Febrero
 * Arma un archivo de Excel de verdad (con títulos, encabezados de color, anchos de
 * columna, filtros, fechas y números con formato) sin depender de librerías externas.
 *
 * Uso:
 *   SAE_EXCEL.descargar('Reclamos_SAE_2026-10-14', [{
 *     nombre: 'Reclamos',                       // nombre de la pestaña
 *     titulo: 'Reclamos SAE',                   // fila 1
 *     subtitulo: ['Filtros: …', 'Generado …'],  // filas grises debajo
 *     bloques: [{                               // una o varias tablas, una debajo de otra
 *       titulo: 'Por proveedor',                // opcional
 *       columnas: [{ t: 'Fecha', tipo: 'fecha', ancho: 11 }, …],
 *       filas: [[new Date(), 'EP 1', 3], …],    // celda: valor o { v, estilo }
 *       total: ['Total', '', 10],               // opcional (fila en negrita)
 *       notas: ['…']                            // opcional (debajo de la tabla)
 *     }],
 *     filtro: true                              // flechas de filtro (solo si hay 1 bloque)
 *   }]);
 *
 * Tipos de columna: texto (por defecto), largo (texto con ajuste de línea), num (entero
 * con separador de miles), dec (2 decimales), dec1 (1 decimal), pct (porcentaje),
 * fecha, delta (+/- con color: rojo si sube, verde si baja), deltaPct.
 * Estilos de celda sueltos: 'negrita', 'pendiente', 'gestion', 'resuelto', 'sin'.
 */
const SAE_EXCEL = (() => {
  'use strict';

  /* ---------------------------------------------------------------- estilos */
  // Formatos de número propios (los ids desde 164 son "personalizados")
  const NUMFMTS = [
    [164, 'dd/mm/yyyy'],
    [165, '0.0%'],
    [166, '[Red]+#,##0;-#,##0;0'],
    [167, '[Red]+0.0%;-0.0%;0.0%'],
    [168, '#,##0.0']
  ];
  const AZUL = 'FF163C68', GRIS_TXT = 'FF64748B', GRIS_BORDE = 'FFD5DBE3';
  const FUENTES = [
    '<font><sz val="10"/><name val="Calibri"/><family val="2"/></font>',                                  // 0 normal
    `<font><b/><sz val="15"/><color rgb="${AZUL}"/><name val="Calibri"/><family val="2"/></font>`,         // 1 título
    `<font><i/><sz val="10"/><color rgb="${GRIS_TXT}"/><name val="Calibri"/><family val="2"/></font>`,     // 2 subtítulo
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>',        // 3 encabezado
    '<font><b/><sz val="10"/><name val="Calibri"/><family val="2"/></font>',                               // 4 negrita
    `<font><b/><sz val="12"/><color rgb="${AZUL}"/><name val="Calibri"/><family val="2"/></font>`,         // 5 título de bloque
    `<font><i/><sz val="9"/><color rgb="${GRIS_TXT}"/><name val="Calibri"/><family val="2"/></font>`       // 6 nota
  ];
  const RELLENOS = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    `<fill><patternFill patternType="solid"><fgColor rgb="${AZUL}"/><bgColor indexed="64"/></patternFill></fill>`, // 2 encabezado
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F7"/><bgColor indexed="64"/></patternFill></fill>', // 3 total
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFDE7CF"/><bgColor indexed="64"/></patternFill></fill>', // 4 pendiente
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCE8F8"/><bgColor indexed="64"/></patternFill></fill>', // 5 en gestión
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCF2E3"/><bgColor indexed="64"/></patternFill></fill>', // 6 resuelto
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>'  // 7 sin estado
  ];
  const BORDES = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    `<border><left style="thin"><color rgb="${GRIS_BORDE}"/></left><right style="thin"><color rgb="${GRIS_BORDE}"/></right><top style="thin"><color rgb="${GRIS_BORDE}"/></top><bottom style="thin"><color rgb="${GRIS_BORDE}"/></bottom><diagonal/></border>`,
    `<border><left style="thin"><color rgb="${GRIS_BORDE}"/></left><right style="thin"><color rgb="${GRIS_BORDE}"/></right><top style="medium"><color rgb="${AZUL}"/></top><bottom style="thin"><color rgb="${GRIS_BORDE}"/></bottom><diagonal/></border>`
  ];
  // [fuente, relleno, borde, numFmt, alineación]
  const XF = {};
  const XF_LISTA = [];
  function xf(nombre, f, r, b, n, al) { XF[nombre] = XF_LISTA.length; XF_LISTA.push([f, r, b, n, al || '']); }
  const TOP = '<alignment vertical="top"/>';
  const NUM = '<alignment horizontal="right" vertical="top" indent="1"/>';
  const TOP_WRAP = '<alignment vertical="top" wrapText="1"/>';
  xf('normal', 0, 0, 0, 0);
  xf('titulo', 1, 0, 0, 0);
  xf('subtitulo', 2, 0, 0, 0);
  xf('enc', 3, 2, 1, 0, '<alignment vertical="center" wrapText="1"/>');
  xf('encNum', 3, 2, 1, 0, '<alignment horizontal="right" vertical="center" wrapText="1" indent="1"/>');
  xf('texto', 0, 0, 1, 0, TOP);
  xf('largo', 0, 0, 1, 0, TOP_WRAP);
  xf('num', 0, 0, 1, 3, NUM);
  xf('dec', 0, 0, 1, 4, NUM);
  xf('dec1', 0, 0, 1, 168, NUM);
  xf('pct', 0, 0, 1, 165, NUM);
  xf('fecha', 0, 0, 1, 164, '<alignment horizontal="left" vertical="top"/>');
  xf('delta', 0, 0, 1, 166, NUM);
  xf('deltaPct', 0, 0, 1, 167, NUM);
  xf('totTexto', 4, 3, 2, 0, TOP);
  xf('totNum', 4, 3, 2, 3, NUM);
  xf('totDec', 4, 3, 2, 4, NUM);
  xf('totDec1', 4, 3, 2, 168, NUM);
  xf('totPct', 4, 3, 2, 165, NUM);
  xf('bloque', 5, 0, 0, 0);
  xf('nota', 6, 0, 0, 0);
  xf('negrita', 4, 0, 1, 0, TOP);
  xf('pendiente', 4, 4, 1, 0, TOP);
  xf('gestion', 4, 5, 1, 0, TOP);
  xf('resuelto', 4, 6, 1, 0, TOP);
  xf('sin', 0, 7, 1, 0, TOP);
  const TOTAL_DE = { num: 'totNum', dec: 'totDec', dec1: 'totDec1', pct: 'totPct', delta: 'delta', deltaPct: 'deltaPct' };

  function estilosXML() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<numFmts count="${NUMFMTS.length}">${NUMFMTS.map(([id, f]) => `<numFmt numFmtId="${id}" formatCode="${esc(f)}"/>`).join('')}</numFmts>` +
      `<fonts count="${FUENTES.length}">${FUENTES.join('')}</fonts>` +
      `<fills count="${RELLENOS.length}">${RELLENOS.join('')}</fills>` +
      `<borders count="${BORDES.length}">${BORDES.join('')}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${XF_LISTA.length}">${XF_LISTA.map(([f, r, b, n, al]) =>
        `<xf numFmtId="${n}" fontId="${f}" fillId="${r}" borderId="${b}" xfId="0"${n ? ' applyNumberFormat="1"' : ''}${f ? ' applyFont="1"' : ''}${r ? ' applyFill="1"' : ''}${b ? ' applyBorder="1"' : ''}${al ? ' applyAlignment="1">' + al + '</xf>' : '/>'}`).join('')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';
  }

  /* ---------------------------------------------------------------- hojas */
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      // caracteres de control que Excel no acepta
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }
  function col(n) { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function serialFecha(d) {
    // Excel cuenta días desde 30/12/1899 (fecha local, sin hora)
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
  }
  function celdaXML(ref, valor, estilo) {
    let v = valor, s = estilo;
    if (v && typeof v === 'object' && !(v instanceof Date)) { s = v.estilo ? v.estilo : s; v = v.v; }
    const sx = XF[s] != null ? XF[s] : XF.texto;
    if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return `<c r="${ref}" s="${sx}"/>`;
    if (v instanceof Date) return isNaN(v) ? `<c r="${ref}" s="${sx}"/>` : `<c r="${ref}" s="${sx === XF.texto ? XF.fecha : sx}"><v>${serialFecha(v)}</v></c>`;
    if (typeof v === 'number') return `<c r="${ref}" s="${sx}"><v>${v}</v></c>`;
    const t = String(v).slice(0, 32000);
    return `<c r="${ref}" s="${sx}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
  }

  /** Devuelve { xml, filtro: 'A3:K40' | null, fijas: n, encabezado: n } */
  function hojaXML(h) {
    const bloques = h.bloques || [{ columnas: h.columnas, filas: h.filas, total: h.total, notas: h.notas }];
    const nCols = Math.max(1, ...bloques.map(b => b.columnas.length));
    const anchos = new Array(nCols).fill(0);
    let r = 0;
    const filas = [];
    const fila = (celdas, alto) => { r++; filas.push(`<row r="${r}"${alto ? ` ht="${alto}" customHeight="1"` : ''}>${celdas.join('')}</row>`); };
    // Título y subtítulos
    if (h.titulo) fila([celdaXML('A' + (r + 1), h.titulo, 'titulo')], 22);
    [].concat(h.subtitulo || []).filter(Boolean).forEach(t => fila([celdaXML('A' + (r + 1), t, 'subtitulo')]));
    if (h.titulo || h.subtitulo) r++;   // fila en blanco
    let filtro = null, encabezado = 0;
    bloques.forEach((b, bi) => {
      if (bi > 0) r++;
      if (b.titulo) fila([celdaXML('A' + (r + 1), b.titulo, 'bloque')], 18);
      // Encabezado
      const fEnc = r + 1;
      fila(b.columnas.map((c, i) => celdaXML(col(i) + fEnc, c.t, ['num', 'dec', 'dec1', 'pct', 'delta', 'deltaPct'].includes(c.tipo) ? 'encNum' : 'enc')), 30);
      if (!encabezado) encabezado = fEnc;
      b.columnas.forEach((c, i) => {
        const largoEnc = Math.min(28, String(c.t).length + 2);
        anchos[i] = Math.max(anchos[i], c.ancho || 0, largoEnc);
      });
      // Datos
      (b.filas || []).forEach(f => {
        const n = r + 1;
        fila(b.columnas.map((c, i) => celdaXML(col(i) + n, f[i], c.tipo || 'texto')));
        b.columnas.forEach((c, i) => {
          if (c.ancho) return;
          let v = f[i]; if (v && typeof v === 'object' && !(v instanceof Date)) v = v.v;
          const largo = v instanceof Date ? 10 : typeof v === 'number' ? String(Math.round(v)).length + 3 : String(v == null ? '' : v).length;
          anchos[i] = Math.max(anchos[i], Math.min(c.tipo === 'largo' ? 60 : 45, largo + 1));
        });
      });
      const ultima = r;
      if (b.total) {
        const n = r + 1;
        fila(b.columnas.map((c, i) => celdaXML(col(i) + n, b.total[i], TOTAL_DE[c.tipo] || 'totTexto')));
      }
      if (bloques.length === 1 && h.filtro !== false && (b.filas || []).length > 1) filtro = `A${fEnc}:${col(b.columnas.length - 1)}${ultima}`;
      (b.notas || []).filter(Boolean).forEach(t => fila([celdaXML('A' + (r + 1), t, 'nota')]));
    });
    const congelar = bloques.length === 1 && encabezado ? encabezado : 0;
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      `<dimension ref="A1:${col(nCols - 1)}${Math.max(1, r)}"/>` +
      '<sheetViews><sheetView workbookViewId="0" zoomScale="100" showGridLines="0">' +
      (congelar ? `<pane ySplit="${congelar}" topLeftCell="A${congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${congelar + 1}" sqref="A${congelar + 1}"/>` : '') +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      `<cols>${anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(6, a + 1.5).toFixed(1)}" customWidth="1"/>`).join('')}</cols>` +
      `<sheetData>${filas.join('')}</sheetData>` +
      (filtro ? `<autoFilter ref="${filtro}"/>` : '') +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      `<headerFooter><oddFooter>&amp;L${esc(String(h.titulo || '').replace(/&/g, '&&'))}&amp;RPágina &amp;P de &amp;N</oddFooter></headerFooter>` +
      '</worksheet>';
    return { xml, filtro, encabezado: congelar };
  }

  function nombreHoja(n, usados) {
    let s = String(n || 'Hoja').replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31) || 'Hoja';
    let k = 2, base = s;
    while (usados.has(s.toLowerCase())) s = (base.slice(0, 28) + ' ' + k++);
    usados.add(s.toLowerCase());
    return s;
  }

  function armarArchivos(hojas) {
    const usados = new Set();
    const hs = hojas.map((h, i) => Object.assign({ idx: i + 1, nombreFinal: nombreHoja(h.nombre, usados) }, hojaXML(h)));
    const definidos = [];
    hs.forEach((h, i) => {
      const q = `'${h.nombreFinal.replace(/'/g, "''")}'`;
      if (h.filtro) {
        const abs = (ref) => ref.replace(/^([A-Z]+)(\d+)$/, (m, c, n) => `$${c}$${n}`);
        const [a, b] = h.filtro.split(':');
        definidos.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(q)}!${abs(a)}:${abs(b)}</definedName>`);
      }
      if (h.encabezado) definidos.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(q)}!$${h.encabezado}:$${h.encabezado}</definedName>`);
    });
    const archivos = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
        hs.map(h => `<Override PartName="/xl/worksheets/sheet${h.idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '</Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>',
      'docProps/core.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        `<dc:title>${esc(hojas[0].titulo || 'SAE')}</dc:title><dc:creator>SAE Tres de Febrero</dc:creator>` +
        `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created>` +
        '</cp:coreProperties>',
      'docProps/app.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SAE Tres de Febrero</Application></Properties>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<bookViews><workbookView activeTab="0"/></bookViews>' +
        `<sheets>${hs.map(h => `<sheet name="${esc(h.nombreFinal)}" sheetId="${h.idx}" r:id="rId${h.idx}"/>`).join('')}</sheets>` +
        (definidos.length ? `<definedNames>${definidos.join('')}</definedNames>` : '') +
        '</workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        hs.map(h => `<Relationship Id="rId${h.idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${h.idx}.xml"/>`).join('') +
        `<Relationship Id="rId${hs.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
      'xl/styles.xml': estilosXML()
    };
    hs.forEach(h => { archivos[`xl/worksheets/sheet${h.idx}.xml`] = h.xml; });
    return archivos;
  }

  /* ---------------------------------------------------------------- zip */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  async function comprimir(datos) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
      const cs = new CompressionStream('deflate-raw');
      const out = new Response(new Blob([datos]).stream().pipeThrough(cs));
      return new Uint8Array(await out.arrayBuffer());
    } catch (e) { return null; }
  }
  async function zip(archivos) {
    const enc = new TextEncoder();
    const partes = [], central = [];
    let offset = 0;
    const ahora = new Date();
    const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
    const dia = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
    for (const [nombre, texto] of Object.entries(archivos)) {
      const nom = enc.encode(nombre), datos = enc.encode(texto);
      const crc = crc32(datos);
      const comp = await comprimir(datos);
      const metodo = comp ? 8 : 0, cuerpo = comp || datos;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, metodo, true);
      lh.setUint16(10, hora, true); lh.setUint16(12, dia, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, cuerpo.length, true); lh.setUint32(22, datos.length, true); lh.setUint16(26, nom.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), nom, cuerpo);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, metodo, true);
      ch.setUint16(12, hora, true); ch.setUint16(14, dia, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, cuerpo.length, true); ch.setUint32(24, datos.length, true); ch.setUint16(28, nom.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nom);
      offset += 30 + nom.length + cuerpo.length;
    }
    const tamCentral = central.reduce((a, b) => a + b.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    const n = Object.keys(archivos).length;
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, n, true); fin.setUint16(10, n, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------------------------------------------------------------- API */
  async function generar(hojas) { return zip(armarArchivos(hojas)); }

  async function descargar(nombreArchivo, hojas) {
    const blob = await generar(hojas);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = String(nombreArchivo).replace(/[\\/:*?"<>|]+/g, '_') + '.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /** Texto "Generado el 14/10/2026 a las 12:30" para los subtítulos. */
  function generadoEl() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `Generado el ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} a las ${p(d.getHours())}:${p(d.getMinutes())} · SAE Municipalidad de Tres de Febrero`;
  }

  return { descargar, generar, generadoEl };
})();
if (typeof window !== 'undefined') window.SAE_EXCEL = SAE_EXCEL;
