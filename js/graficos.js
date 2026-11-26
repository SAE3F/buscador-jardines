// Gráficos propios en SVG/HTML (sin librerías). Colores por tipo: --c-E, --c-O, --c-A (css/app.css).
(function () {
  var G = {};
  var tip = function () { return document.getElementById('tooltip'); };

  G.mostrarTip = function (ev, html) {
    var t = tip(); t.innerHTML = html; t.classList.remove('oculto');
    var x = ev.clientX + 14, y = ev.clientY + 14, w = t.offsetWidth, h = t.offsetHeight;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > window.innerHeight - 8) y = ev.clientY - h - 14;
    t.style.left = Math.max(8, x) + 'px'; t.style.top = Math.max(8, y) + 'px';
  };
  G.ocultarTip = function () { tip().classList.add('oculto'); };
  document.addEventListener('scroll', G.ocultarTip, true);

  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function filaTip(color, nombre, valor) {
    return '<div class="r"><span><i class="marca-tipo" style="--c:' + color + '"></i>' + U.esc(nombre) + '</span><b>' + U.n(valor) + '</b></div>';
  }

  /** Columnas apiladas: opts = { cats:[…], series:[{id,nombre,color,valores:[…]}], alto, onClick(cat), unidad } */
  G.columnas = function (el, o) {
    var W = Math.max(320, el.clientWidth || 600), H = o.alto || 300, ml = 46, mr = 8, mt = 22, mb = 28;
    var n = o.cats.length;
    if (!n) { el.innerHTML = '<div class="vacio"><span class="grande">📭</span>Sin datos para estos filtros</div>'; return; }
    var tot = o.cats.map(function (_, i) { return o.series.reduce(function (s, se) { return s + (se.valores[i] || 0); }, 0); });
    var mx = Math.max.apply(null, tot), max = niceMax(mx), pw = W - ml - mr, ph = H - mt - mb;
    if (max % 4 && max < 40) max = Math.max(4, Math.ceil(mx / 4) * 4);   // marcas enteras y parejas (0, 1, 2, 3, 4…)
    var banda = pw / n, bw = Math.min(56, Math.max(6, banda * 0.62));
    var y = function (v) { return mt + ph - (v / max) * ph; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + U.esc(o.aria || 'Gráfico de columnas') + '">';
    for (var k = 0; k <= 4; k++) {
      var v = max * k / 4, yy = y(v);
      s += '<line class="' + (k ? 'grilla-linea' : 'eje-linea') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + yy + '" y2="' + yy + '"/>';
      s += '<text x="' + (ml - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + U.n(Math.round(v)) + '</text>';
    }
    var cada = Math.ceil(n / Math.floor(pw / 38));
    o.cats.forEach(function (c, i) {
      var x0 = ml + banda * i + (banda - bw) / 2, base = 0;
      s += '<g class="barra-grupo" data-i="' + i + '">';
      var visibles = o.series.filter(function (se) { return (se.valores[i] || 0) > 0; });
      visibles.forEach(function (se, j) {
        var v = se.valores[i], y1 = y(base + v), y0 = y(base), h = Math.max(0, y0 - y1 - (j ? 2 : 0));
        var ult = j === visibles.length - 1, r = ult ? Math.min(4, h / 2, bw / 2) : 0;
        var yTop = y1, yBot = y1 + h;
        // rectángulo con esquinas de arriba redondeadas solo en el último tramo
        s += '<path class="bar" fill="' + se.color + '" d="M' + x0 + ',' + yBot + 'V' + (yTop + r) + (r ? 'Q' + x0 + ',' + yTop + ' ' + (x0 + r) + ',' + yTop : '') +
          'H' + (x0 + bw - r) + (r ? 'Q' + (x0 + bw) + ',' + yTop + ' ' + (x0 + bw) + ',' + (yTop + r) : '') + 'V' + yBot + 'Z"/>';
        base += v;
      });
      if (n <= 14 && tot[i] > 0) s += '<text class="valor" x="' + (x0 + bw / 2) + '" y="' + (y(tot[i]) - 6) + '" text-anchor="middle">' + U.n(tot[i]) + '</text>';
      if (i % cada === 0) s += '<text x="' + (x0 + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + U.esc(c) + '</text>';
      s += '<rect class="hit" x="' + (ml + banda * i) + '" y="' + mt + '" width="' + banda + '" height="' + ph + '"/></g>';
    });
    s += '</svg>';
    var ley = o.series.length > 1 ? '<div class="leyenda">' + o.series.map(function (se) { return '<span><i class="marca-tipo" style="--c:' + se.color + '"></i>' + U.esc(se.nombre) + '</span>'; }).join('') + '</div>' : '';
    el.innerHTML = ley + s;
    U.$$('.barra-grupo', el).forEach(function (g) {
      var i = +g.dataset.i;
      var html = '<div class="t">' + U.esc(o.cats[i]) + '</div>' + o.series.map(function (se) { return filaTip(se.color, se.nombre, se.valores[i] || 0); }).join('') +
        (o.series.length > 1 ? '<div class="r" style="margin-top:.2rem;border-top:1px solid var(--border);padding-top:.2rem"><span>Total</span><b>' + U.n(tot[i]) + '</b></div>' : '') +
        (o.onClick ? '<div class="chico muted" style="margin-top:.25rem">Tocá para filtrar</div>' : '');
      g.addEventListener('mousemove', function (ev) { G.mostrarTip(ev, html); });
      g.addEventListener('mouseleave', G.ocultarTip);
      if (o.onClick) g.addEventListener('click', function () { G.ocultarTip(); o.onClick(o.cats[i], i); });
    });
  };

  /** Barras horizontales: items = [{lab, partes:[{t,v}], total, sub, onClick}] — partes apiladas por tipo */
  G.barrasH = function (el, items, o) {
    o = o || {};
    if (!items.length) { el.innerHTML = '<div class="vacio"><span class="grande">📭</span>' + (o.vacio || 'Sin datos para estos filtros') + '</div>'; return; }
    var max = o.max || Math.max.apply(null, items.map(function (x) { return x.total; })) || 1;
    var tipos = {};
    items.forEach(function (it) { (it.partes || []).forEach(function (p) { if (p.v) tipos[p.t] = 1; }); });
    var ley = Object.keys(tipos).length > 1 ? '<div class="leyenda">' + ['E', 'O', 'A'].filter(function (t) { return tipos[t]; }).map(function (t) { return '<span class="tipo-' + t + '"><i class="marca-tipo"></i>' + U.TIPOS[t].nombre + '</span>'; }).join('') + '</div>' : '';
    el.innerHTML = ley + '<div class="barras-h">' + items.map(function (it, i) {
      var pct = Math.max(0.5, it.total / max * 100);
      var segs = (it.partes || []).filter(function (p) { return p.v > 0; }).map(function (p) {
        return '<i class="tipo-' + p.t + '" style="background:var(--c);flex:' + p.v + ' 1 0"></i>';
      }).join('') || '<i style="background:var(--c-E);flex:1"></i>';
      return '<div class="bh' + (it.onClick ? ' click' : '') + '" data-i="' + i + '" ' + (it.onClick ? 'role="button" tabindex="0"' : '') + '>' +
        '<span class="lab" title="' + U.esc(it.titulo || it.lab) + '">' + it.lab + '</span>' +
        '<span class="pista"><span class="relleno" style="width:' + pct + '%">' + segs + '</span></span>' +
        '<span class="v">' + U.n(it.total) + '</span></div>';
    }).join('') + '</div>';
    U.$$('.bh', el).forEach(function (row) {
      var it = items[+row.dataset.i];
      var html = it.tipHtml || '<div class="t">' + U.esc(it.titulo || it.lab.replace(/<[^>]+>/g, '')) + '</div>' + (it.sub ? '<div class="chico muted">' + U.esc(it.sub) + '</div>' : '') +
        (it.partes || []).filter(function (p) { return p.v > 0; }).map(function (p) { return filaTip('var(--c-' + p.t + ')', U.TIPOS[p.t].nombre, p.v); }).join('') +
        ((it.partes || []).length > 1 ? '<div class="r"><span>Total</span><b>' + U.n(it.total) + '</b></div>' : '');
      row.addEventListener('mousemove', function (ev) { G.mostrarTip(ev, html); });
      row.addEventListener('mouseleave', G.ocultarTip);
      if (it.onClick) {
        row.addEventListener('click', function () { G.ocultarTip(); it.onClick(); });
        row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.onClick(); } });
      }
    });
  };

  /** Color de la escala secuencial (azul) para el mapa de calor: 0..1 */
  G.secuencial = function (f) {
    if (!(f > 0)) return { bg: 'transparent', claro: true };
    var i = Math.min(7, 1 + Math.floor(f * 6.999));
    return { bg: 'var(--seq-' + i + ')', claro: i <= 3 };
  };

  window.G = G;
})();
