/**
 * ==========================================================================
 * PÁGINA VISITAS - visitas-pagina.js  (2.20.0)
 * Una fila por escuela del buscador: visitada / planificada / sin visitar en el período elegido,
 * última visita, próxima planificada y cantidad. Al tocarla, su historial (con "Marcar realizada"
 * y "Modificar"). Filtros, Excel y "+ Nueva visita". Usa js/visitas.js (SAE_VISITAS).
 * ==========================================================================
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const V = window.SAE_VISITAS;
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoyISO = () => iso(new Date());
  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const nf = (n) => Number(n || 0).toLocaleString('es-AR');
  const capital = (t) => String(t || '').toLowerCase().replace(/(^|[\s/])\S/g, x => x.toUpperCase());

  const estado = { orden: 'estado', asc: true, abiertas: new Set(), error: '' };
  const ORDEN_ESTADO = { sin: 0, atrasada: 1, plan: 2, ok: 3 };

  function toast(msg) {
    const t = $('toastRec');
    t.textContent = msg;
    t.className = 'rec-toast visible';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = 'rec-toast'; }, 3000);
  }
  function conexion(clase, txt) {
    const c = $('estadoVis');
    c.className = 'rec-conexion' + (clase ? ' ' + clase : '');
    c.querySelector('.txt').textContent = txt;
  }

  /* ---------------------------------------------------------- escuelas y período */
  /** Escuelas del buscador con algún servicio SAE (las que se visitan). */
  function escuelas() {
    const todas = (typeof SAE_DATA !== 'undefined' && SAE_DATA.escuelas) ? SAE_DATA.escuelas : [];
    return todas.filter(e => (e.servicios || []).length);
  }
  function periodo() {
    const p = $('vPeriodo').value, h = new Date();
    if (p === 'mes') return { desde: iso(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: hoyISO(), txt: 'este mes' };
    if (p === '3m' || p === '6m') { const d = new Date(h); d.setMonth(d.getMonth() - (p === '3m' ? 3 : 6)); return { desde: iso(d), hasta: hoyISO(), txt: p === '3m' ? 'los últimos 3 meses' : 'los últimos 6 meses' }; }
    if (p === 'todo') return { desde: '0000', hasta: '9999', txt: 'todo el registro' };
    if (p === 'elegir') {
      const d = $('vDesde').value || '0000', x = $('vHasta').value || '9999';
      return { desde: d <= x ? d : x, hasta: d <= x ? x : d, txt: 'las fechas elegidas' };
    }
    return { desde: `${h.getFullYear()}-01-01`, hasta: `${h.getFullYear()}-12-31`, txt: `${h.getFullYear()}` };
  }
  /** Una visita con solo el mes ("2026-03") cuenta si el mes toca el período. */
  function enPeriodo(f, per) {
    if (!f) return false;
    if (f.length === 7) return f >= per.desde.slice(0, 7) && f <= per.hasta.slice(0, 7);
    return f >= per.desde && f <= per.hasta;
  }

  /* ---------------------------------------------------------- filas */
  function armarFilas() {
    const per = periodo(), hoy = hoyISO();
    const cat = $('vCategoria').value, eq = $('vEquipo').value;
    const pasaFiltroVisita = (v) => (!cat || String(v.categoria).toUpperCase() === cat) && (!eq || norm(v.equipo) === norm(eq));
    return escuelas().map(e => {
      const todas = V.deEscuela(e.nombre);
      const vs = todas.filter(pasaFiltroVisita);
      const hechas = vs.filter(v => v.estado === 'REALIZADA' && enPeriodo(v.fecha, per));
      const planes = vs.filter(v => v.estado === 'PLANIFICADA' && (!v.fecha || v.fecha >= per.desde.slice(0, v.fecha.length)))
        .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
      const ultima = vs.find(v => v.estado === 'REALIZADA') || null;
      const proxima = planes[0] || null;
      let est = hechas.length ? 'ok' : planes.length ? 'plan' : 'sin';
      if (est === 'plan' && proxima && proxima.fecha && proxima.fecha.length === 10 && proxima.fecha < hoy) est = 'atrasada';
      return { e, todas, est, hechas: hechas.length, ultima, proxima };
    });
  }
  function filtrar(filas) {
    const q = norm($('vBuscar').value), z = $('vZona').value, t = $('vTipo').value, st = $('vEstado').value;
    return filas.filter(f => (!q || norm(f.e.nombre).includes(q) || (f.e.alias || []).some(a => norm(a).includes(q)))
      && (!z || String(f.e.zona || '') === z) && (!t || f.e.tipo === t)
      && (!st || (st === 'plan' ? (f.est === 'plan' || f.est === 'atrasada') : f.est === st)));
  }
  function ordenar(filas) {
    const k = estado.orden, s = estado.asc ? 1 : -1;
    const nombre = (a, b) => a.e.nombre.localeCompare(b.e.nombre, 'es', { numeric: true });
    const cmp = {
      estado: (a, b) => (ORDEN_ESTADO[a.est] - ORDEN_ESTADO[b.est]) || nombre(a, b),
      escuela: nombre,
      zona: (a, b) => String(a.e.zona || '~').localeCompare(String(b.e.zona || '~'), 'es', { numeric: true }) || nombre(a, b),
      localidad: (a, b) => String(a.e.localidad || '~').localeCompare(String(b.e.localidad || '~')) || nombre(a, b),
      ultima: (a, b) => (a.ultima ? a.ultima.fecha : '').localeCompare(b.ultima ? b.ultima.fecha : '') || nombre(a, b),
      proxima: (a, b) => (a.proxima ? (a.proxima.fecha || '9999') : '~').localeCompare(b.proxima ? (b.proxima.fecha || '9999') : '~') || nombre(a, b),
      n: (a, b) => (a.hechas - b.hechas) || nombre(a, b)
    }[k] || nombre;
    return filas.slice().sort((a, b) => s * cmp(a, b));
  }

  /* ---------------------------------------------------------- dibujar */
  const CHIP = { ok: ['✅', 'Visitada'], plan: ['🕒', 'Planificada'], atrasada: ['⚠️', 'Planificada (atrasada)'], sin: ['⚪', 'Sin visitar'] };
  function chip(est) { const c = CHIP[est]; return `<span class="vis-chip ${est}">${c[0]} ${c[1]}</span>`; }
  function txtVisita(v) {
    if (!v) return '<span class="vis-muted">—</span>';
    return `<strong>${esc(V.fechaTxt(v.fecha))}</strong>${v.categoria ? `<span class="vis-sub">${esc(V.etqCategoria(v.categoria))}</span>` : ''}`;
  }
  function pintar() {
    const filas = armarFilas();
    const per = periodo();
    // Números de arriba (sobre todas las escuelas, con los filtros de zona y tipo)
    const z = $('vZona').value, t = $('vTipo').value;
    const delGrupo = filas.filter(f => (!z || String(f.e.zona || '') === z) && (!t || f.e.tipo === t));
    const cuenta = (k) => delGrupo.filter(f => k === 'plan' ? (f.est === 'plan' || f.est === 'atrasada') : f.est === k).length;
    const totalVis = delGrupo.reduce((s, f) => s + f.hechas, 0);
    const pct = delGrupo.length ? Math.round(cuenta('ok') / delGrupo.length * 100) : 0;
    $('vKpis').innerHTML =
      `<button type="button" class="vis-kpi ok" data-est="ok"><span>Visitadas</span><strong>${nf(cuenta('ok'))}</strong><small>${pct} % de ${nf(delGrupo.length)}</small></button>` +
      `<button type="button" class="vis-kpi plan" data-est="plan"><span>Planificadas</span><strong>${nf(cuenta('plan'))}</strong><small>${cuenta('atrasada') ? `${nf(cuenta('atrasada'))} atrasada${cuenta('atrasada') === 1 ? '' : 's'}` : 'por hacer'}</small></button>` +
      `<button type="button" class="vis-kpi sin" data-est="sin"><span>Sin visitar</span><strong>${nf(cuenta('sin'))}</strong><small>en ${esc(per.txt)}</small></button>` +
      `<div class="vis-kpi total"><span>Visitas hechas</span><strong>${nf(totalVis)}</strong><small>en ${esc(per.txt)}</small></div>`;
    $('vKpis').querySelectorAll('[data-est]').forEach(b => b.addEventListener('click', () => {
      $('vEstado').value = $('vEstado').value === b.dataset.est ? '' : b.dataset.est; pintar();
    }));
    const lista = ordenar(filtrar(filas));
    $('vTitulo').textContent = `${nf(lista.length)} escuela${lista.length === 1 ? '' : 's'}`;
    if (!lista.length) { $('vTabla').innerHTML = '<p class="rec-res-vacio">No hay escuelas con esos filtros.</p>'; return; }
    const th = (k, t, cls) => `<th class="${cls || ''}${estado.orden === k ? ' activo' : ''}" data-orden="${k}" tabindex="0" aria-sort="${estado.orden === k ? (estado.asc ? 'ascending' : 'descending') : 'none'}">${t}${estado.orden === k ? (estado.asc ? ' ▲' : ' ▼') : ''}</th>`;
    $('vTabla').innerHTML = `<table class="rec-res-tabla vis-tabla">
      <thead><tr>${th('estado', 'Estado')}${th('escuela', 'Escuela')}${th('zona', 'Zona', 'num')}${th('localidad', 'Localidad')}${th('ultima', 'Última visita')}${th('proxima', 'Próxima')}${th('n', 'Visitas', 'num')}<th aria-label="Acciones"></th></tr></thead>
      <tbody>${lista.map(f => {
        const abierta = estado.abiertas.has(f.e.nombre);
        return `<tr class="vis-fila${abierta ? ' abierta' : ''}" data-esc="${esc(f.e.nombre)}" tabindex="0" aria-expanded="${abierta}">
          <td data-t="Estado">${chip(f.est)}</td>
          <th scope="row" data-t="Escuela"><span class="vis-esc">${esc(f.e.nombre)}</span><span class="vis-sub">${esc(f.e.tipo || '')}</span></th>
          <td class="num" data-t="Zona">${esc(f.e.zona || '—')}</td>
          <td data-t="Localidad">${esc(f.e.localidad || '—')}</td>
          <td data-t="Última visita">${txtVisita(f.ultima)}</td>
          <td data-t="Próxima">${f.proxima ? txtVisita(Object.assign({}, f.proxima, { fecha: f.proxima.fecha || '' })) : '<span class="vis-muted">—</span>'}</td>
          <td class="num" data-t="Visitas">${nf(f.hechas)}</td>
          <td class="vis-acc"><button type="button" class="btn btn-secondary btn-sm vis-nueva" data-esc="${esc(f.e.nombre)}" title="Cargar una visita a ${esc(f.e.nombre)}">+ Visita</button></td>
        </tr>` + (abierta ? `<tr class="vis-detalle"><td colspan="8">${htmlHistorial(f)}</td></tr>` : '');
      }).join('')}</tbody></table>`;
    // Ordenar
    $('vTabla').querySelectorAll('th[data-orden]').forEach(h => {
      const ir = () => { if (estado.orden === h.dataset.orden) estado.asc = !estado.asc; else { estado.orden = h.dataset.orden; estado.asc = true; } guardarLS('sae-vis-orden', JSON.stringify([estado.orden, estado.asc])); pintar(); };
      h.addEventListener('click', ir);
      h.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ir(); } });
    });
    // Abrir / cerrar historial
    $('vTabla').querySelectorAll('tr.vis-fila').forEach(tr => {
      const alternar = () => { const n = tr.dataset.esc; if (estado.abiertas.has(n)) estado.abiertas.delete(n); else estado.abiertas.add(n); pintar(); };
      tr.addEventListener('click', (ev) => { if (ev.target.closest('button, a')) return; alternar(); });
      tr.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === tr) { ev.preventDefault(); alternar(); } });
    });
    $('vTabla').querySelectorAll('.vis-nueva').forEach(b => b.addEventListener('click', () => {
      V.abrirFormulario({ escuela: V.escuelaDe(b.dataset.esc) || b.dataset.esc, alGuardar: () => { estado.abiertas.add(b.dataset.esc); } });
    }));
    $('vTabla').querySelectorAll('[data-vis]').forEach(b => b.addEventListener('click', () => {
      const v = V.lista().find(x => String(x.fila) === b.dataset.vis);
      if (!v) return;
      if (b.dataset.a === 'hecha') V.marcarRealizada(v);
      else V.abrirFormulario({ visita: v });
    }));
  }
  function htmlHistorial(f) {
    if (!f.todas.length) return `<p class="vis-muted vis-hist-vacio">${esc(f.e.nombre)} no tiene visitas cargadas en la hoja de 2026.</p>`;
    const hoy = hoyISO();
    return `<div class="vis-hist"><table class="rec-res-tabla vis-hist-tabla">
      <thead><tr><th>Fecha</th><th>Estado</th><th>Categoría</th><th>Motivo</th><th>Equipo</th><th>Directivos</th><th>Observación</th><th></th></tr></thead>
      <tbody>${f.todas.map(v => {
        const atrasada = v.estado === 'PLANIFICADA' && v.fecha && v.fecha.length === 10 && v.fecha < hoy;
        return `<tr>
        <td data-t="Fecha">${esc(V.fechaTxt(v.fecha))}</td>
        <td data-t="Estado">${v.estado === 'PLANIFICADA' ? `<span class="vis-chip ${atrasada ? 'atrasada' : 'plan'}">${atrasada ? '⚠️ Atrasada' : '🕒 Planificada'}</span>` : '<span class="vis-chip ok">✅ Realizada</span>'}</td>
        <td data-t="Categoría">${esc(V.etqCategoria(v.categoria) || '—')}</td>
        <td data-t="Motivo">${esc(capital(v.motivo) || '—')}</td>
        <td data-t="Equipo">${esc(v.equipo || '—')}</td>
        <td data-t="Directivos">${v.directivos === 'SI' ? 'Sí' : v.directivos === 'NO' ? 'No' : '—'}</td>
        <td data-t="Observación" class="vis-obs">${esc(v.observacion || '—')}</td>
        <td class="vis-acc">${v.estado === 'PLANIFICADA' ? `<button type="button" class="btn btn-primary btn-sm" data-vis="${v.fila}" data-a="hecha">Marcar realizada</button>` : ''}
          <button type="button" class="btn btn-secondary btn-sm" data-vis="${v.fila}" data-a="mod">Modificar</button></td>
      </tr>`;
      }).join('')}</tbody></table></div>`;
  }

  /* ---------------------------------------------------------- filtros */
  function llenarSelect(sel, valores, todos) {
    const actual = sel.value;
    sel.innerHTML = `<option value="">${todos}</option>` + valores.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    if (valores.some(([v]) => v === actual)) sel.value = actual;
  }
  function llenarFiltros() {
    const es = escuelas();
    const zonas = [...new Set(es.map(e => String(e.zona || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    llenarSelect($('vZona'), zonas.map(z => [z, 'Zona ' + z]), 'Todas');
    const tipos = [...new Set(es.map(e => e.tipo).filter(Boolean))].sort();
    llenarSelect($('vTipo'), tipos.map(t => [t, t]), 'Todos');
    const cats = [...new Set(V.CATEGORIAS.concat(V.lista().map(v => String(v.categoria || '').toUpperCase()).filter(Boolean)))];
    llenarSelect($('vCategoria'), cats.map(c => [c, V.etqCategoria(c)]), 'Todas');
    const eqs = [...new Set((V.opciones().equipos || []).concat(V.lista().map(v => v.equipo).filter(Boolean)))].sort((a, b) => a.localeCompare(b));
    llenarSelect($('vEquipo'), eqs.map(x => [x, x]), 'Todos');
  }
  /** Visitas de escuelas que hoy no están en el buscador: se avisan, no se cuentan. */
  function avisoSinEscuela() {
    const sin = [...new Set(V.lista().filter(v => !V.escuelaDe(v.escuela)).map(v => v.escuela))];
    const av = $('vAviso');
    if (estado.error) { av.innerHTML = '⚠️ ' + esc(estado.error); av.style.display = ''; return; }
    if (!sin.length) { av.style.display = 'none'; return; }
    av.innerHTML = `ℹ️ ${sin.length === 1 ? 'Hay una visita de una escuela' : `Hay visitas de ${sin.length} escuelas`} que no están en el buscador y no se cuentan: ${esc(sin.slice(0, 12).join(', '))}${sin.length > 12 ? '…' : ''}.`;
    av.style.display = '';
  }

  /* ---------------------------------------------------------- Excel */
  function exportar() {
    if (typeof SAE_EXCEL === 'undefined') { toast('No se pudo cargar el exportador de Excel'); return; }
    const per = periodo();
    const filas = ordenar(filtrar(armarFilas()));
    const est = { ok: 'Visitada', plan: 'Planificada', atrasada: 'Planificada (atrasada)', sin: 'Sin visitar' };
    const fecha = (v) => v && v.fecha ? (v.fecha.length === 10 ? new Date(v.fecha + 'T00:00') : V.fechaTxt(v.fecha)) : '';
    const hoja1 = {
      nombre: 'Escuelas', titulo: 'SAE · Visitas por escuela', subtitulo: [`Período: ${per.txt}`, SAE_EXCEL.generadoEl ? SAE_EXCEL.generadoEl() : ''],
      bloques: [{ columnas: [{ t: 'Estado', ancho: 20 }, { t: 'Escuela', ancho: 16 }, { t: 'Tipo', ancho: 14 }, { t: 'Zona', ancho: 7 }, { t: 'Localidad', ancho: 18 },
        { t: 'Última visita', tipo: 'fecha', ancho: 13 }, { t: 'Categoría', ancho: 16 }, { t: 'Próxima planificada', tipo: 'fecha', ancho: 13 }, { t: 'Visitas en el período', tipo: 'num', ancho: 11 }],
      filas: filas.map(f => [est[f.est], f.e.nombre, f.e.tipo || '', f.e.zona || '', f.e.localidad || '', fecha(f.ultima), f.ultima ? V.etqCategoria(f.ultima.categoria) : '', fecha(f.proxima), f.hechas]) }],
      filtro: true
    };
    const nombres = new Set(filas.map(f => f.e.nombre));
    const visitas = V.lista().filter(v => { const e = V.escuelaDe(v.escuela); return e && nombres.has(e.nombre); })
      .sort((a, b) => (b.fecha || '9999').localeCompare(a.fecha || '9999'));
    const hoja2 = {
      nombre: 'Visitas', titulo: 'SAE · Visitas territoriales', subtitulo: ['Todas las visitas de esas escuelas (hoja VISITAS TERRITORIALES 2026)'],
      bloques: [{ columnas: [{ t: 'Fecha', tipo: 'fecha', ancho: 12 }, { t: 'Estado', ancho: 12 }, { t: 'Escuela', ancho: 14 }, { t: 'Zona', ancho: 6 }, { t: 'Categoría', ancho: 16 },
        { t: 'Motivo', ancho: 26 }, { t: 'Equipo', ancho: 12 }, { t: 'Directivos', ancho: 10 }, { t: 'Observación', tipo: 'largo', ancho: 50 }],
      filas: visitas.map(v => [fecha(v), v.estado === 'PLANIFICADA' ? 'Planificada' : 'Realizada', v.escuela, v.zona || '', V.etqCategoria(v.categoria), capital(v.motivo), v.equipo || '',
        v.directivos === 'SI' ? 'Sí' : v.directivos === 'NO' ? 'No' : '', v.observacion || '']) }],
      filtro: true
    };
    SAE_EXCEL.descargar(`Visitas_SAE_${hoyISO()}`, [hoja1, hoja2]).then(() => toast('📥 Excel descargado')).catch(() => toast('⚠️ No se pudo armar el Excel'));
  }

  /* ---------------------------------------------------------- inicio */
  async function traer(forzar) {
    conexion('cargando', 'Cargando…');
    try {
      await V.cargar(forzar);
      estado.error = '';
      conexion('ok', `${nf(V.lista().length)} visitas`);
    } catch (e) {
      estado.error = V.mensajeError(e);
      conexion('error', 'Sin conexión');
    }
    llenarFiltros();
    avisoSinEscuela();
    pintar();
  }
  function iniciar() {
    const icono = $('darkModeIcon');
    const pintarIcono = () => { icono.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙'; };
    pintarIcono();
    $('btnDarkMode').addEventListener('click', () => {
      const oscuro = document.documentElement.classList.toggle('dark');
      guardarLS('sae-darkmode', oscuro ? 'true' : 'false');
      pintarIcono();
    });
    try { const o = JSON.parse(leerLS('sae-vis-orden') || 'null'); if (Array.isArray(o)) { estado.orden = o[0]; estado.asc = !!o[1]; } } catch (e) { /* nada */ }
    const p = leerLS('sae-vis-periodo'); if (p && [...$('vPeriodo').options].some(x => x.value === p && p !== 'elegir')) $('vPeriodo').value = p;
    // ?escuela=EP 36 (desde "Ver todas" de la ficha): la busca y abre su historial
    const q = new URLSearchParams(location.search).get('escuela');
    if (q) { $('vBuscar').value = q; estado.abiertas.add((V.escuelaDe(q) || {}).nombre || q); }
    llenarFiltros();
    pintar();
    $('vPeriodo').addEventListener('change', () => {
      $('vFechas').style.display = $('vPeriodo').value === 'elegir' ? '' : 'none';
      if ($('vPeriodo').value !== 'elegir') guardarLS('sae-vis-periodo', $('vPeriodo').value);
      pintar();
    });
    ['vDesde', 'vHasta', 'vEstado', 'vZona', 'vTipo', 'vCategoria', 'vEquipo'].forEach(id => $(id).addEventListener('change', pintar));
    let t;
    $('vBuscar').addEventListener('input', () => { clearTimeout(t); t = setTimeout(pintar, 150); });
    $('btnNuevaVisita').addEventListener('click', () => V.abrirFormulario({}));
    $('btnActualizarVis').addEventListener('click', () => traer(true));
    $('btnExcelVis').addEventListener('click', exportar);
    window.addEventListener('sae-visitas-actualizadas', () => { llenarFiltros(); avisoSinEscuela(); pintar(); conexion('ok', `${nf(V.lista().length)} visitas`); });
    traer(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
