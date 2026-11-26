// PDF sin librerías (Helvetica estándar, A4). Lo usa la "Ficha para visita" para descargar el PDF a color.
// Medidas en puntos (1 pt = 1/72"). Las coordenadas se piensan desde ARRIBA (y crece hacia abajo).
(function () {
  var AN = { r: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 500, 556, 500, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 500, 611, 500, 500, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 500, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 552, 400, 549, 333, 333, 333, 576, 537, 333, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 549, 611, 556, 556, 556, 556, 500, 556, 500], b: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 500, 556, 500, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 500, 611, 500, 500, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 500, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 552, 400, 549, 333, 333, 333, 576, 556, 333, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 549, 611, 611, 611, 611, 611, 556, 611, 556] };   // anchos Helvetica / Helvetica-Bold (Windows-1252, códigos 32–255)
  var CP = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142,
    '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
  var REEMPLAZO = { '▸': '>', '↳': '-', '→': '->', '✓': 'v', '✅': '', '×': 'x', '≥': '>=', '≤': '<=', ' ': ' ' };
  function codigos(s) {           // texto → códigos Windows-1252 (los emojis se sacan)
    s = String(s == null ? '' : s).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️‍]/gu, '');
    var out = [];
    for (var ch of s) {
      if (REEMPLAZO[ch] != null) { for (var c2 of REEMPLAZO[ch]) out.push(c2.charCodeAt(0)); continue; }
      var c = ch.codePointAt(0);
      if (c === 10 || c === 13 || c === 9) { out.push(32); continue; }
      if (c >= 32 && c < 127) out.push(c); else if (c >= 160 && c <= 255) out.push(c); else if (CP[ch]) out.push(CP[ch]); else out.push(63);
    }
    return out;
  }
  function ancho(s, tam, negrita) { var t = negrita ? AN.b : AN.r, w = 0; codigos(s).forEach(function (c) { w += t[c - 32] || 500; }); return w * tam / 1000; }
  function cadena(cods) { var s = '('; cods.forEach(function (c) { s += c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c) : c < 128 ? String.fromCharCode(c) : '\\' + c.toString(8); }); return s + ')'; }
  function rgb(hex) { hex = (hex || '#000000').replace('#', ''); return [0, 2, 4].map(function (i) { return (parseInt(hex.substr(i, 2), 16) / 255).toFixed(3); }).join(' '); }
  function partir(s, maxW, tam, negrita) {      // corta en líneas que entren en maxW
    var palabras = String(s == null ? '' : s).split(/\s+/).filter(Boolean), lineas = [], act = '';
    palabras.forEach(function (p) {
      var prueba = act ? act + ' ' + p : p;
      if (ancho(prueba, tam, negrita) <= maxW) { act = prueba; return; }
      if (act) lineas.push(act);
      while (ancho(p, tam, negrita) > maxW && p.length > 1) {   // palabra muy larga: se corta
        var k = p.length; while (k > 1 && ancho(p.slice(0, k), tam, negrita) > maxW) k--;
        lineas.push(p.slice(0, k)); p = p.slice(k);
      }
      act = p;
    });
    if (act) lineas.push(act);
    return lineas.length ? lineas : [''];
  }

  function nuevo(op) {
    op = op || {};
    var W = 595.28, H = 841.89, M = { izq: 34, der: 34, arr: 36, aba: 46 };
    var paginas = [], pag = null, d = { W: W, H: H, M: M, ancho: W - M.izq - M.der, y: 0, imagen: null };
    function nuevaPagina() { pag = []; paginas.push(pag); d.y = M.arr; if (d.alNuevaPagina) d.alNuevaPagina(); }
    nuevaPagina();
    d.nuevaPagina = nuevaPagina;
    d.lugar = function (h) { if (d.y + h > H - M.aba) { nuevaPagina(); return true; } return false; };
    d.rect = function (x, y, w, h, relleno, borde) {
      pag.push((relleno ? rgb(relleno) + ' rg ' : '') + (borde ? rgb(borde) + ' RG 0.6 w ' : '') + x.toFixed(2) + ' ' + (H - y - h).toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re ' + (relleno && borde ? 'B' : relleno ? 'f' : 'S'));
    };
    d.linea = function (x1, y1, x2, y2, color, grosor) {
      pag.push(rgb(color || '#cccccc') + ' RG ' + (grosor || 0.6) + ' w ' + x1.toFixed(2) + ' ' + (H - y1).toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + (H - y2).toFixed(2) + ' l S');
    };
    // texto en una línea; y = línea de base
    d.txt = function (s, x, y, tam, negrita, color, alinear) {
      var c = codigos(s); if (!c.length) return;
      if (alinear === 'der') x -= ancho(s, tam, negrita); else if (alinear === 'centro') x -= ancho(s, tam, negrita) / 2;
      pag.push('BT /' + (negrita ? 'F2' : 'F1') + ' ' + tam + ' Tf ' + rgb(color) + ' rg ' + x.toFixed(2) + ' ' + (H - y).toFixed(2) + ' Td ' + cadena(c) + ' Tj ET');
    };
    // párrafo que avanza d.y
    d.parrafo = function (s, o) {
      o = o || {}; var tam = o.tam || 9, lh = tam * 1.3, x = o.x == null ? M.izq : o.x, w = o.w || d.ancho;
      partir(s, w, tam, o.negrita).forEach(function (l) { d.lugar(lh); d.txt(l, x, d.y + tam, tam, o.negrita, o.color || '#222222'); d.y += lh; });
    };
    d.imagenJPEG = function (bytes, ancho, alto) { d.imagen = { bytes: bytes, w: ancho, h: alto }; };
    d.dibujarImagen = function (x, y, w, h) { if (d.imagen) pag.push('q ' + w + ' 0 0 ' + h + ' ' + x.toFixed(2) + ' ' + (H - y - h).toFixed(2) + ' cm /Im1 Do Q'); };
    /** Tabla: cols = [{t, w (proporción), der}], filas = [[…]] · se repite el encabezado en cada hoja */
    d.tabla = function (cols, filas, o) {
      o = o || {}; var tam = o.tam || 8, pad = 3, lh = tam * 1.25;
      var tot = cols.reduce(function (s, c) { return s + c.w; }, 0), xs = [], x = M.izq;
      cols.forEach(function (c) { xs.push(x); c.px = c.w / tot * d.ancho; x += c.px; });
      function encabezado() {
        var h = lh + pad * 2; d.rect(M.izq, d.y, d.ancho, h, o.colorEnc || '#eef2f7');
        cols.forEach(function (c, i) { d.txt(c.t, c.der ? xs[i] + c.px - pad : xs[i] + pad, d.y + pad + tam, tam, true, o.colorTxtEnc || '#163c68', c.der ? 'der' : null); });
        d.y += h;
      }
      d.lugar(lh * 3); encabezado();
      filas.forEach(function (f, k) {
        var celdas = cols.map(function (c, i) { return partir(f[i], c.px - pad * 2, tam, f.negrita); });
        var h = Math.max.apply(null, celdas.map(function (l) { return l.length; })) * lh + pad * 2;
        if (d.lugar(h)) encabezado();
        if (f.fondo) d.rect(M.izq, d.y, d.ancho, h, f.fondo);
        celdas.forEach(function (lineas, i) {
          lineas.forEach(function (l, j) { d.txt(l, cols[i].der ? xs[i] + cols[i].px - pad : xs[i] + pad, d.y + pad + tam + j * lh, tam, f.negrita, f.color || '#1f2937', cols[i].der ? 'der' : null); });
        });
        d.y += h; d.linea(M.izq, d.y, M.izq + d.ancho, d.y, '#e3e8ef', 0.5);
      });
    };
    d.blob = function () {
      var objs = [], N = paginas.length;
      function add(s) { objs.push(s); return objs.length; }
      add('<< /Type /Catalog /Pages 2 0 R >>'); add('');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      var img = 0;
      if (d.imagen) img = add('<< /Type /XObject /Subtype /Image /Width ' + d.imagen.w + ' /Height ' + d.imagen.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
        d.imagen.bytes.length + ' >>\nstream\n' + d.imagen.bytes + '\nendstream');
      var kids = [];
      paginas.forEach(function (p, i) {
        var pie = [];
        var tmp = pag; pag = pie;
        d.txt('Hoja ' + (i + 1) + ' de ' + N, M.izq, H - 22, 8, false, '#666666');
        if (op.pie) d.txt(op.pie, W - M.der, H - 22, 8, false, '#666666', 'der');
        pag = tmp;
        var cont = p.concat(pie).join('\n');
        var c = add('<< /Length ' + cont.length + ' >>\nstream\n' + cont + '\nendstream');
        kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>' +
          (img ? ' /XObject << /Im1 ' + img + ' 0 R >>' : '') + ' >> /Contents ' + c + ' 0 R >>'));
      });
      objs[1] = '<< /Type /Pages /Kids [' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + '] /Count ' + N + ' >>';
      var out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', offs = [];
      objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
      var x = out.length;
      out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(function (o) { return ('0000000000' + o).slice(-10) + ' 00000 n \n'; }).join('') +
        'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
      var b = new Uint8Array(out.length); for (var k = 0; k < out.length; k++) b[k] = out.charCodeAt(k) & 255;
      return new Blob([b], { type: 'application/pdf' });
    };
    return d;
  }
  /** Imagen (png del logo) → JPEG en texto binario, para meter en el PDF */
  function logoJPEG(src) {
    return new Promise(function (ok) {
      var im = new Image();
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
          ok({ bytes: atob(c.toDataURL('image/jpeg', 0.92).split(',')[1]), w: c.width, h: c.height });
        } catch (e) { ok(null); }
      };
      im.onerror = function () { ok(null); };
      im.src = src;
    });
  }
  window.PDFsimple = { nuevo: nuevo, ancho: ancho, partir: partir, logoJPEG: logoJPEG };
})();
