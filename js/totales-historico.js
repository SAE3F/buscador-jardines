/**
 * ==========================================================================
 * CUPOS DE OTROS AÑOS - totales-historico.js  (2.20.0)
 * Compara los cupos de cada escuela entre 2021 y hoy, en la página Totales.
 * - 2021 a 2025: datos cerrados de datos/cupos-anios.js (se carga recién
 *   cuando se abre la sección, así la página no tarda más).
 * - Año actual: se calcula con los cupos de data.js (hoja CUPOS del año),
 *   promediando los días hábiles de cada mes hasta hoy.
 * Valor de cada mes = promedio de cupos por día. "Promedio del año" =
 * promedio de los meses de marzo a noviembre que tienen datos.
 * Se compara por escuela: el proveedor de cada año se muestra como dato.
 * ==========================================================================
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_DESDE = 1, MES_HASTA = 11;          // el gráfico va de febrero a diciembre
  const PROM_DESDE = 2, PROM_HASTA = 10;        // el promedio del año, de marzo a noviembre
  const GRUPOS = { '': 'Todos los servicios', DM: 'Desayuno / Merienda', COMEDOR: 'Comedor y refuerzo', PATIOS: 'Patios' };
  const LS_OCULTOS = 'sae-totales-hist-ocultos';

  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mayus = (t) => String(t || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const nf = (n, d) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d == null ? 0 : d });
  const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const colorAnio = (a) => 'o' + (((a - 2021) % 5 + 5) % 5 + 1);   // mismos colores que en Reclamos
  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }
  function toast(msg) {
    const t = $('toastRec');
    if (!t) return;
    t.textContent = msg; t.className = 'rec-toast visible';
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'rec-toast'; }, 3000);
  }

  const estado = {
    datos: null,          // { anio: { escuela: { grupo: { p, m:[12] } } } }
    anios: [],
    anioActual: new Date().getFullYear(),
    mesActual: new Date().getMonth(),
    grupo: '',
    mes: 'anio',          // 'anio' o índice de mes (1..11)
    q: '',
    orden: { col: 'escuela', dir: 1 },
    abierta: '',
    ocultos: new Set(String(leerLS(LS_OCULTOS) || '').split(',').filter(Boolean).map(Number))
  };

  /* ------------------------------------------------------------- carga */
  function versionDeArchivo() {
    const s = document.querySelector('script[src*="totales-historico.js"]');
    const m = s && /[?&]v=([^&]+)/.exec(s.getAttribute('src'));
    return m ? m[1] : (window.SAE_VERSION || '');
  }
  let promesa = null;
  function cargarArchivo() {
    if (window.SAE_CUPOS_ANIOS) return Promise.resolve(window.SAE_CUPOS_ANIOS);
    if (promesa) return promesa;
    promesa = new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'datos/cupos-anios.js?v=' + encodeURIComponent(versionDeArchivo());
      s.onload = () => (window.SAE_CUPOS_ANIOS ? ok(window.SAE_CUPOS_ANIOS) : mal(new Error('vacío')));
      s.onerror = () => { promesa = null; s.remove(); mal(new Error('No cargó datos/cupos-anios.js')); };
      document.head.appendChild(s);
    });
    return promesa;
  }

  /** Grupo del servicio: DM, COMEDOR o PATIOS (otros servicios sin cupo propio: null). */
  function grupoDe(servicio) {
    const s = mayus(servicio);
    if (s === 'PATIOS') return 'PATIOS';
    if (!s || s === 'GENERAL' || /^\d/.test(s)) return null;
    return SAE_MENUS.grupoDeServicio(servicio);
  }

  /** Año actual, con los cupos de data.js: promedio de los días hábiles de cada mes (hasta hoy). */
  function calcularActual() {
    const anio = estado.anioActual;
    const hoy = isoDe(new Date());
    const fer = (window.SAE_EXTRAS && SAE_EXTRAS.FERIADOS) || {};
    // Días hábiles por mes, hasta hoy
    const dias = [];
    for (let m = 0; m < 12; m++) {
      dias[m] = [];
      const d = new Date(anio, m, 1);
      while (d.getMonth() === m) {
        const iso = isoDe(d);
        if (iso > hoy) break;
        if (d.getDay() !== 0 && d.getDay() !== 6 && !fer[iso]) dias[m].push(iso);
        d.setDate(d.getDate() + 1);
      }
    }
    const salida = {};
    const vistas = new Set();
    (SAE_DATA.escuelas || []).forEach(e => {
      if (!e || !e.nombre || vistas.has(e.nombre)) return;     // si una escuela figura dos veces, se cuenta una
      vistas.add(e.nombre);
      (e.servicios || []).forEach(sv => {
        const g = grupoDe(sv.servicio);
        if (!g) return;
        const fechas = Object.keys(sv.cupos || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
        if (!fechas.length) return;
        const delAnio = fechas.find(f => f.slice(0, 4) === String(anio));
        const m12 = new Array(12).fill(null);
        for (let m = 0; m < 12; m++) {
          let suma = 0, n = 0, k = -1;
          dias[m].forEach(iso => {
            // Antes de marzo solo cuenta si ya se cargó un cupo de este año (en febrero casi no hay clases)
            if (m < 2 && !(delAnio && delAnio <= iso)) return;
            while (k + 1 < fechas.length && fechas[k + 1] <= iso) k++;
            if (k < 0) return;
            const v = Number(sv.cupos[fechas[k]]) || 0;
            if (v > 0) { suma += v; n++; }
          });
          if (n) m12[m] = Math.round(suma / n);
        }
        if (!m12.some(v => v)) return;
        const esc = salida[e.nombre] || (salida[e.nombre] = {});
        const prov = mayus(sv.proveedor || e.proveedor);
        if (!esc[g]) esc[g] = { p: prov, m: m12 };
        else {
          esc[g].m = esc[g].m.map((v, i) => (v == null && m12[i] == null) ? null : (v || 0) + (m12[i] || 0));
          if (prov && esc[g].p.indexOf(prov) < 0) esc[g].p = esc[g].p ? esc[g].p + ' / ' + prov : prov;
        }
      });
    });
    return salida;
  }

  /* ------------------------------------------------------------ valores */
  /** Cupo de la escuela en un mes (índice), según el servicio elegido. null = sin dato. */
  function valorMes(anio, escuela, m) {
    const e = estado.datos[anio] && estado.datos[anio][escuela];
    if (!e) return null;
    let suma = null;
    Object.keys(e).forEach(g => {
      if (estado.grupo && g !== estado.grupo) return;
      const v = e[g].m[m];
      if (v != null) suma = (suma || 0) + v;
    });
    return suma;
  }
  /** Promedio del año (marzo a noviembre, solo los meses con dato) o el mes elegido. */
  function valor(anio, escuela) {
    if (estado.mes !== 'anio') return valorMes(anio, escuela, estado.mes);
    let s = 0, n = 0;
    for (let m = PROM_DESDE; m <= PROM_HASTA; m++) {
      const v = valorMes(anio, escuela, m);
      if (v != null) { s += v; n++; }
    }
    return n ? Math.round(s / n) : null;
  }
  function proveedorDe(anio, escuela) {
    const e = estado.datos[anio] && estado.datos[anio][escuela];
    if (!e) return '';
    const ps = [];
    Object.keys(e).forEach(g => { if ((!estado.grupo || g === estado.grupo) && e[g].p && ps.indexOf(e[g].p) < 0) ps.push(e[g].p); });
    return ps.join(' / ');
  }
  function escuelasFiltradas() {
    const q = mayus(estado.q);
    const todas = new Set();
    estado.anios.forEach(a => Object.keys(estado.datos[a] || {}).forEach(n => todas.add(n)));
    return [...todas].filter(n => !q || mayus(n).includes(q))
      .filter(n => estado.anios.some(a => valor(a, n) != null));
  }
  const ultimo = () => estado.anios[estado.anios.length - 1];
  const anterior = () => estado.anios[estado.anios.length - 2];
  function diferencia(n) {
    const a = valor(ultimo(), n), b = valor(anterior(), n);
    if (a == null || b == null) return null;
    return { abs: a - b, pct: b ? (a - b) / b : null };
  }

  /* -------------------------------------------------------------- pintar */
  function textoPeriodo() {
    return estado.mes === 'anio' ? 'promedio de marzo a noviembre' : MESES_LARGO[estado.mes];
  }
  function pintarGrafico(escuelas) {
    const cont = $('tHisGrafico');
    if (typeof SAE_GRAFICOS === 'undefined') { cont.innerHTML = '<p class="g-vacio">Falta js/reclamos-graficos.js en la página.</p>'; return; }
    const x = MESES.slice(MES_DESDE, MES_HASTA + 1);
    const series = [];
    estado.anios.forEach(a => {
      const valores = x.map((_, i) => {
        const m = MES_DESDE + i;
        let s = null;
        escuelas.forEach(n => { const v = valorMes(a, n, m); if (v != null) s = (s || 0) + v; });
        return s;
      });
      if (!valores.some(v => v != null)) return;
      const clase = a === ultimo() ? 's1' : a === anterior() ? 's2' : 'otro';
      if (clase === 'otro' && estado.ocultos.has(a)) return;
      const s = { nombre: String(a), valores, clase };
      if (clase === 'otro') s.color = colorAnio(a);
      if (a === estado.anioActual && estado.mesActual >= MES_DESDE && estado.mesActual <= MES_HASTA) s.parcialDesde = estado.mesActual - MES_DESDE;
      series.push(s);
    });
    const titulo = escuelas.length === 1 ? escuelas[0] : (estado.q ? `${escuelas.length} escuelas filtradas` : 'Todas las escuelas');
    $('tHisGrafTit').textContent = `Cupos por día, mes a mes · ${titulo} · ${GRUPOS[estado.grupo]}`;
    cont.innerHTML = series.length ? SAE_GRAFICOS.lineas(x, series, { titulo: 'Cupos por día de cada mes, por año' })
      : '<p class="g-vacio">No hay datos con estos filtros.</p>';
    SAE_GRAFICOS.activarTooltips(cont);
    // Leyenda: los dos últimos años fijos; los anteriores se pueden sacar o poner
    const ley = $('tHisLeyenda');
    const otros = estado.anios.slice(0, -2);
    ley.innerHTML = `<span class="res-ley s1">${ultimo()}${ultimo() === estado.anioActual ? ' (hasta hoy)' : ''}</span>` +
      (anterior() ? `<span class="res-ley s2">${anterior()}</span>` : '') +
      otros.map(a => `<button type="button" class="res-ley-btn${estado.ocultos.has(a) ? '' : ' activo ' + colorAnio(a)}" data-anio="${a}" aria-pressed="${!estado.ocultos.has(a)}" title="${estado.ocultos.has(a) ? 'Mostrar' : 'Ocultar'} ${a} en el gráfico">${a}</button>`).join('');
  }

  function celdaDif(d) {
    if (!d) return '<td class="num tot-muted">—</td>';
    const cls = d.abs > 0 ? 'sube' : d.abs < 0 ? 'baja' : '';
    const pct = d.pct == null ? '' : ` <small>(${d.pct > 0 ? '+' : ''}${nf(d.pct * 100, 1)} %)</small>`;
    return `<td class="num"><span class="tot-his-dif ${cls}">${d.abs > 0 ? '+' : ''}${nf(d.abs)}${pct}</span></td>`;
  }

  function detalleEscuela(n) {
    const filas = estado.anios.slice().reverse().map(a => {
      const vals = [];
      for (let m = MES_DESDE; m <= MES_HASTA; m++) vals.push(valorMes(a, n, m));
      if (!vals.some(v => v != null)) return '';
      const p = proveedorDe(a, n);
      return `<tr><th scope="row">${a}</th><td>${p ? esc(p) : '<span class="tot-muted">—</span>'}</td>${vals.map(v => `<td class="num">${v == null ? '' : nf(v)}</td>`).join('')}<td class="num"><strong>${valor(a, n) == null ? '' : nf(valor(a, n))}</strong></td></tr>`;
    }).join('');
    return `<div class="tot-his-det">
      <table class="rec-res-tabla tot-his-mini">
        <thead><tr><th>Año</th><th>Proveedor</th>${MESES.slice(MES_DESDE, MES_HASTA + 1).map(m => `<th class="num">${m}</th>`).join('')}<th class="num">${estado.mes === 'anio' ? 'Prom.' : MESES[estado.mes]}</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <a class="tot-link" href="index.html?escuela=${encodeURIComponent(n)}">Ver la ficha de ${esc(n)} →</a>
    </div>`;
  }

  function ordenar(lista) {
    const { col, dir } = estado.orden;
    const val = (n) => col === 'escuela' ? null : col === 'dif' ? (diferencia(n) ? diferencia(n).abs : null)
      : col === 'difPct' ? (diferencia(n) && diferencia(n).pct != null ? diferencia(n).pct : null) : valor(Number(col), n);
    return lista.sort((a, b) => {
      if (col === 'escuela') return dir * a.localeCompare(b, 'es', { numeric: true });
      const va = val(a), vb = val(b);
      if (va == null && vb == null) return a.localeCompare(b, 'es', { numeric: true });
      if (va == null) return 1;
      if (vb == null) return -1;
      return dir * (va - vb) || a.localeCompare(b, 'es', { numeric: true });
    });
  }

  function pintarTabla(escuelas) {
    const lista = ordenar(escuelas.slice());
    const th = (col, txt, num, title) => {
      const act = estado.orden.col === col;
      return `<th${num ? ' class="num"' : ''} data-orden="${col}" ${act ? `aria-sort="${estado.orden.dir > 0 ? 'ascending' : 'descending'}"` : ''} title="${esc(title || 'Ordenar')}" tabindex="0">${txt}${act ? (estado.orden.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
    };
    const totales = estado.anios.map(a => {
      let s = null;
      lista.forEach(n => { const v = valor(a, n); if (v != null) s = (s || 0) + v; });
      return s;
    });
    const nCols = estado.anios.length + 3;
    $('tHisTabla').innerHTML = lista.length ? `<table class="rec-res-tabla tot-detalle tot-his-tabla">
      <thead><tr>${th('escuela', 'Escuela')}${estado.anios.map(a => th(String(a), String(a) + (a === estado.anioActual ? '*' : ''), true)).join('')}
        ${th('dif', `${ultimo()} vs ${anterior()}`, true, 'Ordenar por la diferencia (sube / baja)')}${th('difPct', '%', true, 'Ordenar por la diferencia en %')}</tr></thead>
      <tbody>${lista.map(n => {
        const d = diferencia(n);
        const abierta = estado.abierta === n;
        return `<tr class="tot-his-fila${abierta ? ' abierta' : ''}" data-esc="${esc(n)}" tabindex="0" aria-expanded="${abierta}">
          <th scope="row">${esc(n)}</th>${estado.anios.map(a => { const v = valor(a, n); return `<td class="num"${a === ultimo() ? ' data-ult="1"' : ''}>${v == null ? '<span class="tot-muted">—</span>' : nf(v)}</td>`; }).join('')}
          ${celdaDif(d).replace(/<small>.*<\/small>/, '')}<td class="num">${d && d.pct != null ? `<span class="tot-his-dif ${d.abs > 0 ? 'sube' : d.abs < 0 ? 'baja' : ''}">${d.pct > 0 ? '+' : ''}${nf(d.pct * 100, 1)} %</span>` : '<span class="tot-muted">—</span>'}</td>
        </tr>${abierta ? `<tr class="tot-his-detfila"><td colspan="${nCols}">${detalleEscuela(n)}</td></tr>` : ''}`;
      }).join('')}</tbody>
      <tfoot><tr><th scope="row">Total (${nf(lista.length)} escuelas)</th>${totales.map(t => `<td class="num">${t == null ? '' : nf(t)}</td>`).join('')}
        ${celdaDif(totales[totales.length - 1] != null && totales[totales.length - 2] ? { abs: totales[totales.length - 1] - totales[totales.length - 2], pct: (totales[totales.length - 1] - totales[totales.length - 2]) / totales[totales.length - 2] } : null).replace(/<small>.*<\/small>/, '')}<td></td></tr></tfoot>
    </table>` : '<p class="rec-res-vacio">No hay escuelas con ese filtro.</p>';
  }

  function pintarResumen(escuelas) {
    const tot = (a) => { let s = null; escuelas.forEach(n => { const v = valor(a, n); if (v != null) s = (s || 0) + v; }); return s; };
    const u = tot(ultimo()), p = tot(anterior());
    let txt = '';
    if (u != null) {
      txt = `<strong>${ultimo()}</strong>: ${nf(u)} cupos por día (${textoPeriodo()}${ultimo() === estado.anioActual && estado.mes === 'anio' ? ', hasta hoy' : ''})`;
      if (p) {
        const d = (u - p) / p;
        txt += ` · <strong>${anterior()}</strong>: ${nf(p)} · <span class="tot-his-dif ${u > p ? 'sube' : u < p ? 'baja' : ''}">${u > p ? '+' : ''}${nf(u - p)} (${d > 0 ? '+' : ''}${nf(d * 100, 1)} %)</span>`;
      }
    }
    $('tHisResumen').innerHTML = txt;
    $('tHisN').textContent = `(${estado.anios[0]} a ${ultimo()})`;
  }

  function pintar() {
    if (!estado.datos) return;
    const escuelas = escuelasFiltradas();
    pintarResumen(escuelas);
    pintarGrafico(escuelas);
    pintarTabla(escuelas);
  }

  /* ---------------------------------------------------------------- excel */
  function exportar() {
    if (!estado.datos) return;
    if (typeof SAE_EXCEL === 'undefined') { toast('⚠️ Falta el archivo js/excel.js en la página'); return; }
    const lista = ordenar(escuelasFiltradas());
    if (!lista.length) { toast('No hay escuelas con ese filtro'); return; }
    const sub = [`${GRUPOS[estado.grupo]} · ${textoPeriodo().replace(/^./, c => c.toUpperCase())}${estado.q ? ' · Filtro: ' + estado.q : ''}`, SAE_EXCEL.generadoEl()];
    const notas = ['Cupos por día: promedio de los días con cupo de cada mes. 2021 tiene solo el cupo mensual de Desayuno / Merienda (abril a agosto).',
      `${estado.anioActual} sale de la hoja CUPOS ${estado.anioActual} (los cupos cargados en la página), hasta hoy.`,
      'Se compara por escuela: los proveedores de cada año eran otros.'];
    const colsAnio = estado.anios.map(a => ({ t: String(a), tipo: 'num' }));
    const filas1 = lista.map(n => {
      const d = diferencia(n);
      return [n].concat(estado.anios.map(a => valor(a, n))).concat([d ? d.abs : '', d && d.pct != null ? d.pct : '']);
    });
    const sumaCol = (i) => { let s = null; filas1.forEach(f => { if (typeof f[i] === 'number') s = (s || 0) + f[i]; }); return s; };
    const tot = [`Total (${lista.length} escuelas)`].concat(estado.anios.map((_, i) => sumaCol(i + 1)));
    const tu = tot[tot.length - 1], tp = tot[tot.length - 2];
    tot.push(tu != null && tp != null ? tu - tp : '', tu != null && tp ? (tu - tp) / tp : '');
    const meses = MESES.slice(MES_DESDE, MES_HASTA + 1);
    const filas2 = [];
    lista.forEach(n => estado.anios.slice().reverse().forEach(a => {
      const vals = meses.map((_, i) => valorMes(a, n, MES_DESDE + i));
      if (!vals.some(v => v != null)) return;
      filas2.push([n, a, proveedorDe(a, n)].concat(vals).concat([valor(a, n)]));
    }));
    const filas3 = estado.anios.map(a => [a].concat(meses.map((_, i) => {
      let s = null; lista.forEach(n => { const v = valorMes(a, n, MES_DESDE + i); if (v != null) s = (s || 0) + v; }); return s;
    })));
    SAE_EXCEL.descargar(`Cupos_por_anio_${estado.anios[0]}-${ultimo()}`, [
      { nombre: 'Por escuela', titulo: 'Cupos por escuela, año por año', subtitulo: sub,
        columnas: [{ t: 'Escuela', ancho: 30 }].concat(colsAnio).concat([{ t: `Diferencia ${ultimo()} vs ${anterior()}`, tipo: 'delta' }, { t: 'Diferencia %', tipo: 'deltaPct' }]),
        filas: filas1, total: tot, notas },
      { nombre: 'Mes a mes', titulo: 'Cupos por día de cada mes', subtitulo: sub,
        columnas: [{ t: 'Escuela', ancho: 30 }, { t: 'Año', tipo: 'num' }, { t: 'Proveedor', ancho: 22 }].concat(meses.map(m => ({ t: m, tipo: 'num' }))).concat([{ t: estado.mes === 'anio' ? 'Promedio mar-nov' : MESES[estado.mes], tipo: 'num' }]),
        filas: filas2, notas },
      { nombre: 'Totales', titulo: 'Total de cupos por día, mes a mes', subtitulo: sub,
        columnas: [{ t: 'Año', tipo: 'num' }].concat(meses.map(m => ({ t: m, tipo: 'num' }))), filas: filas3, notas, filtro: false }
    ]).then(() => toast('📥 Excel descargado')).catch(() => toast('⚠️ No se pudo armar el Excel'));
  }

  /* --------------------------------------------------------------- inicio */
  async function abrir() {
    if (estado.datos) { pintar(); return; }
    $('tHisEstado').textContent = 'Cargando los cupos de otros años…';
    $('tHisEstado').style.display = '';
    try {
      const hist = await cargarArchivo();
      const datos = {};
      Object.keys(hist).map(Number).filter(a => a < estado.anioActual).forEach(a => { datos[a] = hist[a]; });
      datos[estado.anioActual] = calcularActual();
      estado.datos = datos;
      estado.anios = Object.keys(datos).map(Number).sort((a, b) => a - b);
      $('tHisEstado').style.display = 'none';
      $('tHisCuerpo').style.display = '';
      pintar();
    } catch (e) {
      $('tHisEstado').textContent = '⚠️ No se pudieron cargar los cupos de otros años. Revisá la conexión y volvé a abrir esta sección.';
      const caja = $('tHisCaja');
      if (caja) caja.open = false;
    }
  }

  function iniciar() {
    const caja = $('tHisCaja');
    if (!caja) return;
    caja.addEventListener('toggle', () => { if (caja.open) abrir(); });
    document.querySelectorAll('#tHisGrupo button').forEach(b => b.addEventListener('click', () => {
      estado.grupo = b.dataset.grupo;
      document.querySelectorAll('#tHisGrupo button').forEach(x => x.classList.toggle('activo', x === b));
      pintar();
    }));
    $('tHisMes').addEventListener('change', () => {
      const v = $('tHisMes').value;
      estado.mes = v === 'anio' ? 'anio' : Number(v);
      pintar();
    });
    let t;
    $('tHisBuscar').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { estado.q = $('tHisBuscar').value; pintar(); }, 150); });
    $('btnHisExcel').addEventListener('click', exportar);
    $('tHisLeyenda').addEventListener('click', (ev) => {
      const b = ev.target.closest('.res-ley-btn');
      if (!b) return;
      const a = Number(b.dataset.anio);
      if (estado.ocultos.has(a)) estado.ocultos.delete(a); else estado.ocultos.add(a);
      guardarLS(LS_OCULTOS, [...estado.ocultos].join(','));
      pintar();
    });
    const tabla = $('tHisTabla');
    const ordenarPor = (th) => {
      const col = th.dataset.orden;
      if (estado.orden.col === col) estado.orden.dir *= -1;
      else estado.orden = { col, dir: col === 'escuela' ? 1 : -1 };
      pintarTabla(escuelasFiltradas());
    };
    const abrirFila = (tr) => {
      estado.abierta = estado.abierta === tr.dataset.esc ? '' : tr.dataset.esc;
      pintarTabla(escuelasFiltradas());
      const f = tabla.querySelector(`.tot-his-fila[data-esc="${CSS.escape(tr.dataset.esc)}"]`);
      if (f) f.focus({ preventScroll: true });
    };
    tabla.addEventListener('click', (ev) => {
      if (ev.target.closest('a')) return;
      const th = ev.target.closest('th[data-orden]');
      if (th) { ordenarPor(th); return; }
      const tr = ev.target.closest('.tot-his-fila');
      if (tr) abrirFila(tr);
    });
    tabla.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const th = ev.target.closest('th[data-orden]');
      const tr = ev.target.closest('.tot-his-fila');
      if (th || tr) { ev.preventDefault(); if (th) ordenarPor(th); else abrirFila(tr); }
    });
    // Si cambian los cupos del año (sincronización), se recalcula el año actual
    window.addEventListener('sae-datos-actualizados', () => {
      if (!estado.datos) return;
      estado.datos[estado.anioActual] = calcularActual();
      pintar();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
  window.SAE_TOTALES_HIST = { abrir, calcularActual, estado };
})();
