/**
 * ==========================================================================
 * GRÁFICOS DEL RESUMEN DE RECLAMOS - reclamos-graficos.js
 * Gráficos dibujados en la propia página (SVG y HTML), sin librerías externas:
 * se ven igual sin internet, salen nítidos al imprimir y respetan el modo oscuro.
 * Colores: "período elegido" = serie 1 (azul), "comparación" = serie 2 (naranja),
 * otros años = gris. Los colores se definen en reclamos.css (--g-*).
 * ==========================================================================
 */
const SAE_GRAFICOS = (function () {
  'use strict';

  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nf = (n, d) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d == null ? 0 : d });

  /** Escala "linda" para el eje: devuelve el máximo redondeado y el paso de las líneas. */
  function escala(max, marcas) {
    if (!max || max <= 0) return { max: 1, paso: 1 };
    const crudo = max / (marcas || 4);
    const pot = Math.pow(10, Math.floor(Math.log10(crudo)));
    const paso = [1, 2, 2.5, 5, 10].map(m => m * pot).find(p => p >= crudo) || 10 * pot;
    return { max: Math.ceil(max / paso) * paso, paso };
  }

  /* ------------------------------------------------------------------ BARRAS
   * Barras horizontales (HTML). filas: [{ etiqueta, valor, comp, texto, compTexto, tip, dato }]
   * "comp" se dibuja como una marca vertical (valor del período de comparación).
   */
  function barrasH(filas, opciones) {
    const op = opciones || {};
    if (!filas.length) return `<p class="g-vacio">${esc(op.vacio || 'Sin datos para este período.')}</p>`;
    const max = Math.max(1, ...filas.map(f => Math.max(f.valor || 0, f.comp || 0)));
    return `<div class="g-barras${op.clicable ? ' g-clicable' : ''}" role="list">` + filas.map((f, i) => {
      const ancho = f.valor ? Math.max(1.5, f.valor / max * 100) : 0;
      const marca = f.comp != null && f.comp > 0 ? `<span class="g-marca" style="left:${(f.comp / max * 100).toFixed(2)}%"></span>` : '';
      return `<div class="g-fila" role="listitem" tabindex="${op.clicable ? 0 : -1}" data-i="${i}" ${f.dato ? `data-dato="${esc(f.dato)}"` : ''} data-tip="${esc(f.tip || '')}">
        <span class="g-etq" title="${esc(f.etiqueta)}">${esc(f.etiqueta)}</span>
        <span class="g-pista"><span class="g-barra" style="width:${ancho.toFixed(2)}%"></span>${marca}</span>
        <span class="g-val">${esc(f.texto != null ? f.texto : nf(f.valor))}</span>
      </div>`;
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ LÍNEAS
   * x: etiquetas del eje; series: [{ nombre, valores:[n|null], clase:'s1'|'s2'|'otro', parcialDesde: índice }]
   * sombras: [{ desde, hasta, texto }] (franjas, p. ej. vacaciones)
   */
  function lineas(x, series, opciones) {
    const op = opciones || {};
    const W = 720, H = 270, M = { t: 18, r: 18, b: 34, l: 44 };
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const todos = series.flatMap(s => s.valores.filter(v => v != null));
    const { max, paso } = escala(Math.max(1, ...todos));
    const px = (i) => M.l + (x.length === 1 ? iw / 2 : i * iw / (x.length - 1));
    const py = (v) => M.t + ih - v / max * ih;
    let svg = `<svg class="g-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(op.titulo || 'Evolución')}">`;
    (op.sombras || []).forEach(s => {
      const x0 = px(s.desde) - (s.desde === 0 ? 0 : iw / (x.length - 1) / 2), x1 = px(s.hasta) + iw / (x.length - 1) / 2;
      svg += `<rect class="g-sombra" x="${x0}" y="${M.t}" width="${x1 - x0}" height="${ih}"/>` +
        `<text class="g-sombra-txt" x="${(x0 + x1) / 2}" y="${M.t + 12}" text-anchor="middle">${esc(s.texto)}</text>`;
    });
    for (let v = 0; v <= max + 1e-9; v += paso) {
      svg += `<line class="g-grilla" x1="${M.l}" x2="${W - M.r}" y1="${py(v)}" y2="${py(v)}"/>` +
        `<text class="g-eje" x="${M.l - 8}" y="${py(v) + 4}" text-anchor="end">${nf(v)}</text>`;
    }
    x.forEach((t, i) => { svg += `<text class="g-eje" x="${px(i)}" y="${H - 12}" text-anchor="middle">${esc(t)}</text>`; });
    // Primero los años "otros" (al fondo), después comparación y elegido
    const orden = series.slice().sort((a, b) => ({ otro: 0, s2: 1, s1: 2 }[a.clase] - { otro: 0, s2: 1, s1: 2 }[b.clase]));
    orden.forEach(s => {
      const pts = s.valores.map((v, i) => v == null ? null : [px(i), py(v), i]).filter(Boolean);
      if (!pts.length) return;
      const corte = s.parcialDesde != null ? s.parcialDesde : Infinity;
      const d1 = pts.filter(p => p[2] < corte).map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      if (d1) svg += `<path class="g-linea g-${s.clase}" d="${d1}"/>`;
      if (corte !== Infinity) {
        const tramo = pts.filter(p => p[2] >= corte - 1);
        if (tramo.length > 1) svg += `<path class="g-linea g-${s.clase} g-parcial" d="${tramo.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}"/>`;
      }
      if (s.clase !== 'otro') {
        pts.forEach(p => {
          svg += `<circle class="g-punto g-${s.clase}${p[2] >= corte ? ' g-hueco' : ''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4"/>`;
        });
        const ult = pts[pts.length - 1];
        svg += `<text class="g-rotulo g-txt-${s.clase}" x="${Math.min(ult[0] + 7, W - 4)}" y="${ult[1] - 7}" text-anchor="${ult[0] > W - 60 ? 'end' : 'start'}">${esc(s.nombre)}</text>`;
      }
    });
    // Zonas de hover por columna (muestran todos los valores de ese punto)
    x.forEach((t, i) => {
      const ancho = x.length === 1 ? iw : iw / (x.length - 1);
      const tip = [t].concat(series.filter(s => s.valores[i] != null)
        .sort((a, b) => ({ s1: 0, s2: 1, otro: 2 }[a.clase] - { s1: 0, s2: 1, otro: 2 }[b.clase]))
        .map(s => `${s.nombre}: ${nf(s.valores[i])}${s.parcialDesde != null && i >= s.parcialDesde ? ' (parcial)' : ''}`)).join('\n');
      svg += `<rect class="g-hover" x="${px(i) - ancho / 2}" y="${M.t}" width="${ancho}" height="${ih}" data-tip="${esc(tip)}" data-x="${px(i)}"/>`;
    });
    svg += `<line class="g-cruz" x1="0" x2="0" y1="${M.t}" y2="${M.t + ih}" style="display:none"/>`;
    return svg + '</svg>';
  }

  /* ----------------------------------------------------------- BARRAS POR AÑO
   * items: [{ etiqueta, valor, clase:'s1'|'s2'|'otro', nota, marca, marcaTexto, tip }]
   * "marca": línea horizontal sobre la barra (p. ej. el año anterior a la misma fecha).
   */
  function barrasV(items, opciones) {
    const op = opciones || {};
    const W = 720, H = 270, M = { t: 24, r: 14, b: 40, l: 44 };
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const { max, paso } = escala(Math.max(1, ...items.map(i => Math.max(i.valor || 0, i.marca || 0))));
    const banda = iw / items.length, ancho = Math.min(64, banda * 0.62);
    const py = (v) => M.t + ih - v / max * ih;
    let svg = `<svg class="g-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(op.titulo || 'Reclamos por año')}">`;
    for (let v = 0; v <= max + 1e-9; v += paso) {
      svg += `<line class="g-grilla" x1="${M.l}" x2="${W - M.r}" y1="${py(v)}" y2="${py(v)}"/>` +
        `<text class="g-eje" x="${M.l - 8}" y="${py(v) + 4}" text-anchor="end">${nf(v)}</text>`;
    }
    items.forEach((it, i) => {
      const cx = M.l + banda * i + banda / 2, x0 = cx - ancho / 2, y = py(it.valor || 0), h = M.t + ih - y;
      const r = Math.min(4, h);
      svg += `<path class="g-barra-v g-${it.clase}" d="M${x0} ${M.t + ih} V${y + r} Q${x0} ${y} ${x0 + r} ${y} H${x0 + ancho - r} Q${x0 + ancho} ${y} ${x0 + ancho} ${y + r} V${M.t + ih} Z"/>`;
      svg += `<text class="g-rotulo g-txt-num" x="${cx}" y="${y - 6}" text-anchor="middle">${nf(it.valor || 0)}</text>`;
      if (it.marca != null) {
        const ym = py(it.marca);
        // Marca dentro de la barra, con su texto debajo de la línea
        svg += `<line class="g-marca-h" x1="${x0 - 4}" x2="${x0 + ancho + 4}" y1="${ym}" y2="${ym}"/>` +
          `<text class="g-marca-txt" x="${cx}" y="${ym + 15}" text-anchor="middle">${esc(it.marcaTexto || '')}</text>`;
      }
      svg += `<text class="g-eje g-eje-fuerte" x="${cx}" y="${H - 22}" text-anchor="middle">${esc(it.etiqueta)}</text>`;
      if (it.nota) svg += `<text class="g-eje" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(it.nota)}</text>`;
      svg += `<rect class="g-hover" x="${cx - banda / 2}" y="${M.t}" width="${banda}" height="${ih}" data-tip="${esc(it.tip || '')}"/>`;
    });
    return svg + '</svg>';
  }

  /* -------------------------------------------------------------------- DONA
   * partes: [{ etiqueta, valor, clase }] (la clase define el color en reclamos.css)
   */
  function dona(partes, opciones) {
    const op = opciones || {};
    const total = partes.reduce((a, p) => a + p.valor, 0);
    if (!total) return `<p class="g-vacio">${esc(op.vacio || 'Sin datos para este período.')}</p>`;
    const R = 70, r = 46, C = 90;
    let ang = -Math.PI / 2, svg = `<svg class="g-dona" viewBox="0 0 180 180" role="img" aria-label="${esc(op.titulo || 'Distribución')}">`;
    const visibles = partes.filter(p => p.valor > 0);
    visibles.forEach(p => {
      const a = p.valor / total * Math.PI * 2;
      const tip = `${p.etiqueta}: ${nf(p.valor)} (${nf(p.valor / total * 100, 1)}%)`;
      if (visibles.length === 1) {
        svg += `<circle class="g-porcion g-${p.clase}" cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke-width="${R - r}" data-tip="${esc(tip)}"/>`;
      } else {
        const a0 = ang + 0.012, a1 = ang + a - 0.012, grande = a > Math.PI ? 1 : 0;
        const p0 = [C + R * Math.cos(a0), C + R * Math.sin(a0)], p1 = [C + R * Math.cos(a1), C + R * Math.sin(a1)];
        const q1 = [C + r * Math.cos(a1), C + r * Math.sin(a1)], q0 = [C + r * Math.cos(a0), C + r * Math.sin(a0)];
        svg += `<path class="g-porcion g-${p.clase}" data-tip="${esc(tip)}" d="M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${R} ${R} 0 ${grande} 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} L${q1[0].toFixed(2)} ${q1[1].toFixed(2)} A${r} ${r} 0 ${grande} 0 ${q0[0].toFixed(2)} ${q0[1].toFixed(2)} Z"/>`;
      }
      ang += a;
    });
    svg += `<text class="g-dona-total" x="${C}" y="${C + 2}" text-anchor="middle">${nf(total)}</text>` +
      `<text class="g-eje" x="${C}" y="${C + 18}" text-anchor="middle">${esc(op.centro || 'reclamos')}</text></svg>`;
    const leyenda = '<ul class="g-leyenda">' + partes.map(p =>
      `<li><span class="g-cuadro g-${p.clase}"></span><span class="g-ley-etq">${esc(p.etiqueta)}</span>` +
      `<strong>${nf(p.valor)}</strong><span class="g-ley-pct">${total ? nf(p.valor / total * 100, 0) : 0}%</span></li>`).join('') + '</ul>';
    return `<div class="g-dona-caja">${svg}${leyenda}</div>`;
  }

  /* ------------------------------------------------------------------ AYUDA
   * Tooltip único: muestra el data-tip del elemento bajo el mouse (o con foco).
   */
  function activarTooltips(contenedor) {
    let tip = contenedor.querySelector('.g-tooltip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'g-tooltip'; tip.setAttribute('role', 'tooltip'); contenedor.appendChild(tip); }
    const mostrar = (el, ev) => {
      const t = el.getAttribute('data-tip');
      if (!t) { ocultar(); return; }
      tip.textContent = t;
      tip.style.display = 'block';
      const cr = contenedor.getBoundingClientRect();
      let x, y;
      if (ev && ev.clientX != null) { x = ev.clientX - cr.left + 14; y = ev.clientY - cr.top + 14; }
      else { const r = el.getBoundingClientRect(); x = r.left - cr.left + r.width / 2; y = r.top - cr.top - 8; }
      const tw = tip.offsetWidth;
      if (x + tw > cr.width - 4) x = Math.max(4, x - tw - 28);
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
      // Línea guía en los gráficos de líneas
      const svg = el.closest('svg');
      const cruz = svg && svg.querySelector('.g-cruz');
      if (cruz && el.dataset.x) { cruz.setAttribute('x1', el.dataset.x); cruz.setAttribute('x2', el.dataset.x); cruz.style.display = ''; }
    };
    const ocultar = () => {
      tip.style.display = 'none';
      contenedor.querySelectorAll('.g-cruz').forEach(c => { c.style.display = 'none'; });
    };
    if (contenedor.dataset.tips) return;
    contenedor.dataset.tips = '1';
    contenedor.addEventListener('mousemove', (ev) => {
      const el = ev.target.closest('[data-tip]');
      if (el && contenedor.contains(el)) mostrar(el, ev); else ocultar();
    });
    contenedor.addEventListener('mouseleave', ocultar);
    contenedor.addEventListener('focusin', (ev) => { const el = ev.target.closest('[data-tip]'); if (el) mostrar(el); });
    contenedor.addEventListener('focusout', ocultar);
  }

  return { barrasH, lineas, barrasV, dona, activarTooltips, escala };
})();
