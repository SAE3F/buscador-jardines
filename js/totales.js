/**
 * ==========================================================================
 * TOTALES POR PROVEEDOR - totales.js
 * Suma lo que cada proveedor tiene que entregar en un día:
 * para cada escuela y servicio toma el menú del día (mismo criterio que la
 * calculadora del buscador) y multiplica el gramaje por el cupo vigente.
 * ==========================================================================
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const LS_SEMANA = 'sae-totales-semana';
  const LS_PROV = 'sae-totales-proveedor';
  const ORDEN_PROV = ['GRUPO L', 'GYULAND', 'EDEAL', 'TINTENFISCH'];

  const estado = {
    fecha: '',
    semana: 0,
    grupo: '',            // '' = todos | 'DM' | 'COMEDOR'
    proveedor: '',
    calculo: null
  };

  /* ------------------------------------------------------------ utilidades */
  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }
  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  const mayus = (t) => String(t || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const nf = (n, dec) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: dec == null ? 1 : dec });
  function isoDe(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function fechaDe(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function fechaTexto(iso) {
    const d = fechaDe(iso);
    return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  function toast(msg) {
    const t = $('toastRec');
    t.textContent = msg;
    t.className = 'rec-toast visible';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = 'rec-toast'; }, 3000);
  }

  /** Día hábil (lunes a viernes) a partir de una fecha, moviéndose en la dirección indicada. */
  function diaHabil(d, paso) {
    const x = new Date(d);
    while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + paso);
    return x;
  }

  function nombreProveedor(p) {
    const s = mayus(p);
    if (!s) return 'Sin proveedor';
    for (const k of ORDEN_PROV) if (s.indexOf(k) >= 0) return k;
    return s.replace(/\s+(S\.?A\.?|S\.?R\.?L\.?)$/, '').trim();
  }

  /** Mismo criterio que la calculadora del buscador para elegir la columna de gramaje. */
  function nivelDe(escuela) {
    const n = mayus(escuela.nombre);
    const tipo = escuela.tipo || '';
    if (tipo === 'Dispositivo') return /^(UDI|EPI)\s/.test(n) ? 'jardin' : /^ENVI[OÓ]N/.test(n) ? 'secundaria' : 'primaria';
    if (tipo.includes('Jardín') || tipo === 'Escuela Municipal') return 'jardin';
    if (tipo.includes('Primaria') || tipo.includes('Centro')) return 'primaria';
    return 'secundaria';
  }

  /* --------------------------------------------------------------- cálculo */
  function calcular() {
    const fecha = estado.fecha;
    const dia = DIAS[fechaDe(fecha).getDay()];
    const provs = {};
    const nuevoProv = (p) => provs[p] || (provs[p] = {
      nombre: p, escuelas: new Set(), racDM: 0, racCOM: 0, kg: 0, litros: 0,
      items: {}, filas: [], sinEntrega: 0, sinMenu: 0
    });

    (SAE_DATA.escuelas || []).forEach(escuela => {
      const nivel = nivelDe(escuela);
      (escuela.servicios || []).forEach(sv => {
        if (SAE_MENUS.sinMenu(sv.servicio)) return;
        const grupo = SAE_MENUS.grupoDeServicio(sv.servicio);
        const cupo = Math.round(SAE_MENUS.cupoEnFecha(sv, fecha));
        if (cupo <= 0) return;
        const prov = nuevoProv(nombreProveedor(sv.proveedor || escuela.proveedor));
        // Un servicio por vez: así cada servicio usa su propio cupo
        const b = SAE_MENUS.bloques(Object.assign({}, escuela, { servicios: [sv] }), grupo, dia)[0];
        const fila = {
          escuela: escuela.nombre, servicio: sv.servicio, grupo, cupo, nivel,
          prestacion: b ? b.prestacion : (grupo === 'DM' ? 'Desayuno / Merienda' : 'Comedor'),
          fuente: b ? b.fuente : '', lista: '', menu: '', nota: ''
        };
        prov.filas.push(fila);
        if (!b) { fila.nota = 'Sin menú para este servicio'; prov.sinMenu++; return; }
        if (b.sinEntrega) { fila.nota = 'Sin entrega este día'; prov.sinEntrega++; return; }
        const listas = b.listas.filter(Boolean);
        const lista = listas[Math.min(estado.semana, listas.length - 1)];
        if (!lista) { fila.nota = 'Sin menú para este día'; prov.sinMenu++; return; }
        fila.lista = lista.lista || '';
        fila.menu = lista.nombre || '';

        prov.escuelas.add(escuela.nombre);
        if (grupo === 'DM') prov.racDM += cupo; else prov.racCOM += cupo;

        (lista.ingredientes || []).forEach(ing => {
          const racion = Number(ing[nivel] || ing.jardin || 0);
          if (!racion) return;
          let cant, unidad;
          if (ing.unidad === 'ml') { cant = racion * cupo / 1000; unidad = 'L'; prov.litros += cant; }
          else if (ing.unidad === 'g') { cant = racion * cupo / 1000; unidad = 'kg'; prov.kg += cant; }
          else { cant = racion * cupo; unidad = ing.unidad === 'saquito' ? 'saquitos' : 'u'; }
          const k = grupo + '|' + mayus(ing.alimento) + '|' + unidad;
          const it = prov.items[k] || (prov.items[k] = { grupo, alimento: ing.alimento, unidad, cant: 0, escuelas: new Set() });
          it.cant += cant;
          it.escuelas.add(escuela.nombre);
        });
      });
    });

    const lista = Object.values(provs).sort((a, b) => {
      const ia = ORDEN_PROV.indexOf(a.nombre), ib = ORDEN_PROV.indexOf(b.nombre);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.nombre.localeCompare(b.nombre);
    });
    return { fecha, dia, proveedores: lista };
  }

  /** Estimación de envases sobre el total (mismos tamaños que la calculadora). */
  function envases(alimento, cant, unidad) {
    const env = SAE_DATA.envasesDefault || {};
    const a = alimento.toLowerCase();
    if (a.includes('leche') && unidad === 'L') return `${nf(Math.ceil(cant), 0)} sachets (1 L)`;
    if ((a.includes('azúcar') || a.includes('azucar')) && unidad === 'kg') return `${nf(Math.ceil(cant), 0)} paq. (1 kg)`;
    if ((a.includes('matecocido') || a.includes('infusión') || a.includes('infusion')) && unidad === 'saquitos') {
      const n = env.matecocido_saquitos || 25;
      return `${nf(Math.ceil(cant / n), 0)} cajas (${n} u)`;
    }
    const porGramos = (g, nombre) => `${nf(Math.ceil(cant * 1000 / g), 0)} ${nombre} (${g} g)`;
    if (unidad !== 'kg') return '';
    if (a.includes('dulce de leche')) return porGramos(env.dulce_leche_gramos || 400, 'potes');
    if (a.includes('mermelada')) return porGramos(env.mermelada_gramos || 400, 'potes');
    if (a.includes('galletitas')) return porGramos(env.galletitas_gramos || 400, 'paq.');
    if (a.includes('cacao')) return porGramos(env.cacao_gramos || 180, 'paq.');
    return '';
  }

  /* ---------------------------------------------------------------- pintar */
  function pasaGrupo(g) { return !estado.grupo || estado.grupo === g; }

  function pintarAviso() {
    const d = fechaDe(estado.fecha);
    const fer = typeof SAE_EXTRAS !== 'undefined' && SAE_EXTRAS.FERIADOS ? SAE_EXTRAS.FERIADOS[estado.fecha] : null;
    const av = $('tAviso');
    if (d.getDay() === 0 || d.getDay() === 6) {
      av.innerHTML = '📅 Es fin de semana: no hay entregas. Elegí un día hábil.';
    } else if (fer) {
      av.innerHTML = `📅 <strong>${esc(fer.nombre)}</strong> (${fer.tipo === 'feriado' ? 'feriado' : 'día no laborable'}): normalmente no hay entrega. Los totales se muestran igual como referencia.`;
    } else { av.style.display = 'none'; return; }
    av.style.display = '';
  }

  function pintar() {
    if (!estado.fecha) return;
    pintarAviso();
    const c = estado.calculo = calcular();
    $('tTituloPrint').textContent = `Totales por proveedor · ${fechaTexto(c.fecha)} · Semana ${estado.semana + 1} del ciclo`;
    $('tTituloGeneral').textContent = `Resumen del ${fechaTexto(c.fecha).toLowerCase()}`;

    // ---------- Tabla general ----------
    const racTot = (p) => (pasaGrupo('DM') ? p.racDM : 0) + (pasaGrupo('COMEDOR') ? p.racCOM : 0);
    const maxRac = Math.max(1, ...c.proveedores.map(racTot));
    const kgDe = (p) => Object.values(p.items).filter(i => pasaGrupo(i.grupo) && i.unidad === 'kg').reduce((s, i) => s + i.cant, 0);
    const ltDe = (p) => Object.values(p.items).filter(i => pasaGrupo(i.grupo) && i.unidad === 'L').reduce((s, i) => s + i.cant, 0);
    const escDe = (p) => new Set(p.filas.filter(f => pasaGrupo(f.grupo) && f.lista).map(f => f.escuela)).size;
    const tot = { esc: 0, dm: 0, com: 0, kg: 0, lt: 0 };
    $('tGeneral').innerHTML = `<table class="rec-res-tabla tot-general">
      <thead><tr><th>Proveedor</th><th class="num">Escuelas</th>
        ${pasaGrupo('DM') ? '<th class="num">Raciones DM</th>' : ''}${pasaGrupo('COMEDOR') ? '<th class="num">Raciones comedor</th>' : ''}
        <th class="rec-res-col-barra"></th><th class="num">Secos (kg)</th><th class="num">Líquidos (L)</th></tr></thead>
      <tbody>${c.proveedores.map(p => {
        const e = escDe(p), kg = kgDe(p), lt = ltDe(p);
        tot.esc += e; tot.dm += p.racDM; tot.com += p.racCOM; tot.kg += kg; tot.lt += lt;
        return `<tr class="tot-fila-prov${p.nombre === estado.proveedor ? ' activa' : ''}" data-prov="${esc(p.nombre)}" tabindex="0">
          <th scope="row">${esc(p.nombre)}</th><td class="num">${nf(e, 0)}</td>
          ${pasaGrupo('DM') ? `<td class="num">${p.racDM ? nf(p.racDM, 0) : '–'}</td>` : ''}
          ${pasaGrupo('COMEDOR') ? `<td class="num">${p.racCOM ? nf(p.racCOM, 0) : '–'}</td>` : ''}
          <td class="rec-res-col-barra"><span class="rec-res-barra" title="${esc(p.nombre)}: ${nf(racTot(p), 0)} raciones"><span style="width:${Math.round(racTot(p) / maxRac * 100)}%"></span></span></td>
          <td class="num">${kg ? nf(kg) : '–'}</td><td class="num">${lt ? nf(lt) : '–'}</td></tr>`;
      }).join('')}</tbody>
      <tfoot><tr><th scope="row">Total</th><td class="num">${nf(tot.esc, 0)}</td>
        ${pasaGrupo('DM') ? `<td class="num">${nf(tot.dm, 0)}</td>` : ''}${pasaGrupo('COMEDOR') ? `<td class="num">${nf(tot.com, 0)}</td>` : ''}
        <td class="rec-res-col-barra"></td><td class="num">${nf(tot.kg)}</td><td class="num">${nf(tot.lt)}</td></tr></tfoot>
    </table>`;

    // ---------- Pestañas de proveedor ----------
    if (!c.proveedores.some(p => p.nombre === estado.proveedor)) estado.proveedor = c.proveedores.length ? c.proveedores[0].nombre : '';
    $('tTabs').innerHTML = c.proveedores.map(p =>
      `<button type="button" class="rec-tab${p.nombre === estado.proveedor ? ' active' : ''}" data-prov="${esc(p.nombre)}" role="tab">${esc(p.nombre)}</button>`).join('');
    pintarProveedor();
  }

  function pintarProveedor() {
    const c = estado.calculo;
    const p = c && c.proveedores.find(x => x.nombre === estado.proveedor);
    document.querySelectorAll('.tot-fila-prov').forEach(tr => tr.classList.toggle('activa', tr.dataset.prov === estado.proveedor));
    document.querySelectorAll('#tTabs .rec-tab').forEach(b => b.classList.toggle('active', b.dataset.prov === estado.proveedor));
    if (!p) {
      $('tTiles').innerHTML = '';
      $('tMercaderia').innerHTML = '<p class="rec-res-vacio">No hay datos para esa fecha.</p>';
      $('tDetalle').innerHTML = '';
      return;
    }
    const filas = p.filas.filter(f => pasaGrupo(f.grupo));
    const entregan = filas.filter(f => f.lista);
    const escuelas = new Set(entregan.map(f => f.escuela));
    const sinEntrega = filas.filter(f => !f.lista);

    $('tTiles').innerHTML = [
      ['Escuelas con entrega', nf(escuelas.size, 0), `${nf(entregan.length, 0)} servicios`],
      ['Raciones DM', pasaGrupo('DM') ? nf(p.racDM, 0) : '—', ''],
      ['Raciones comedor', pasaGrupo('COMEDOR') ? nf(p.racCOM, 0) : '—', 'Incluye refuerzo'],
      ['Sin entrega este día', nf(sinEntrega.length, 0), sinEntrega.length ? 'Ver detalle por escuela' : '']
    ].map(([t, v, s]) => `<div class="rec-res-tile"><span class="rec-res-tile-t">${t}</span>` +
      `<strong class="rec-res-tile-v">${v}</strong>${s ? `<span class="rec-res-tile-s">${s}</span>` : ''}</div>`).join('');

    // ---------- Mercadería ----------
    $('tTituloMerc').textContent = `Mercadería del día · ${p.nombre}`;
    const grupos = [['DM', 'Desayuno / Merienda'], ['COMEDOR', 'Comedor y refuerzo']].filter(([g]) => pasaGrupo(g));
    const html = grupos.map(([g, titulo]) => {
      const items = Object.values(p.items).filter(i => i.grupo === g)
        .sort((a, b) => (a.unidad === b.unidad ? 0 : a.unidad === 'L' ? -1 : b.unidad === 'L' ? 1 : a.unidad === 'kg' ? -1 : 1) || b.cant - a.cant);
      if (!items.length) return '';
      return `<h4 class="tot-grupo">${titulo}</h4>
        <table class="rec-res-tabla tot-merc">
          <thead><tr><th>Alimento</th><th class="num">Cantidad</th><th>Envases estimados</th><th class="num">Escuelas</th></tr></thead>
          <tbody>${items.map(i => `<tr><th scope="row">${esc(i.alimento)}</th>
            <td class="num fuerte">${nf(i.cant, i.unidad === 'kg' || i.unidad === 'L' ? 1 : 0)} ${i.unidad}</td>
            <td>${esc(envases(i.alimento, i.cant, i.unidad)) || '<span class="tot-muted">–</span>'}</td>
            <td class="num">${nf(i.escuelas.size, 0)}</td></tr>`).join('')}</tbody>
        </table>`;
    }).join('');
    $('tMercaderia').innerHTML = html || '<p class="rec-res-vacio">Este proveedor no tiene entregas ese día para el servicio elegido.</p>';

    pintarDetalle();
  }

  function pintarDetalle() {
    const c = estado.calculo;
    const p = c && c.proveedores.find(x => x.nombre === estado.proveedor);
    if (!p) return;
    const q = mayus($('tBuscarEsc').value);
    const filas = p.filas.filter(f => pasaGrupo(f.grupo) && (!q || mayus(f.escuela).includes(q)))
      .sort((a, b) => a.escuela.localeCompare(b.escuela, 'es', { numeric: true }) || a.grupo.localeCompare(b.grupo));
    $('tDetalleN').textContent = `(${nf(filas.length, 0)} servicios)`;
    $('tDetalle').innerHTML = filas.length ? `<table class="rec-res-tabla tot-detalle">
      <thead><tr><th>Escuela</th><th>Servicio</th><th>Menú</th><th class="num">Cupo</th></tr></thead>
      <tbody>${filas.map(f => `<tr${f.lista ? '' : ' class="tot-sin"'}>
        <th scope="row"><a href="index.html?escuela=${encodeURIComponent(f.escuela)}" class="tot-link">${esc(f.escuela)}</a></th>
        <td>${esc(f.servicio)}<span class="tot-sub">${esc(f.fuente)}</span></td>
        <td>${f.lista ? `<span class="tot-lista">${esc(f.lista)}</span> ${esc(f.menu)}` : `<span class="tot-muted">${esc(f.nota)}</span>`}</td>
        <td class="num">${nf(f.cupo, 0)}</td></tr>`).join('')}</tbody>
    </table>` : '<p class="rec-res-vacio">No hay escuelas con ese filtro.</p>';
  }

  /* ---------------------------------------------------------- exportación */
  function exportarCSV() {
    const c = estado.calculo;
    if (!c || !c.proveedores.length) { toast('No hay datos para exportar'); return; }
    const celda = (x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`;
    const num = (n, d) => String(Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).replace('.', ',');
    const filas = [[`Totales por proveedor - ${fechaTexto(c.fecha)} - Semana ${estado.semana + 1} del ciclo`], [],
      ['Proveedor', 'Servicio', 'Alimento', 'Cantidad', 'Unidad', 'Envases estimados', 'Escuelas']];
    c.proveedores.forEach(p => Object.values(p.items).filter(i => pasaGrupo(i.grupo))
      .sort((a, b) => a.grupo.localeCompare(b.grupo) || a.alimento.localeCompare(b.alimento))
      .forEach(i => filas.push([p.nombre, i.grupo === 'DM' ? 'Desayuno / Merienda' : 'Comedor y refuerzo', i.alimento,
        num(i.cant, i.unidad === 'kg' || i.unidad === 'L' ? 2 : 0), i.unidad, envases(i.alimento, i.cant, i.unidad), i.escuelas.size])));
    filas.push([], ['Detalle por escuela'], ['Proveedor', 'Escuela', 'Servicio', 'Lista', 'Menú', 'Cupo', 'Observación']);
    c.proveedores.forEach(p => p.filas.filter(f => pasaGrupo(f.grupo))
      .forEach(f => filas.push([p.nombre, f.escuela, f.servicio, f.lista, f.menu, f.cupo, f.nota])));
    const blob = new Blob(['﻿' + filas.map(f => f.map(celda).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Totales_proveedores_${c.fecha}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function imprimir() {
    const det = $('tDetalleCaja');
    const estabaAbierto = det.open;
    det.open = true;
    const volver = () => { det.open = estabaAbierto; window.removeEventListener('afterprint', volver); };
    window.addEventListener('afterprint', volver);
    window.print();
  }

  /* ------------------------------------------------------- sincronización */
  function marcarSync(tipo, texto) {
    const el = $('estadoSync');
    el.className = 'rec-conexion ' + tipo;
    el.querySelector('.txt').textContent = texto;
  }

  function pintarSync() {
    if (typeof SAE_SYNC === 'undefined') { marcarSync('', 'Datos del archivo'); return; }
    const e = SAE_SYNC.estado();
    if (e.sincronizando) {
      marcarSync('cargando', 'Actualizando…');
      e.sincronizando.then(pintarSync, pintarSync);
      return;
    }
    if (e.ultimoError) { marcarSync('error', 'Sin conexión · datos guardados'); $('estadoSync').title = e.ultimoError; return; }
    if (e.origen === 'planilla') marcarSync('ok', 'Cupos al día');
    else if (e.origen === 'guardado') marcarSync('ok', 'Datos guardados');
    else marcarSync('', 'Datos del archivo');
    $('estadoSync').title = e.actualizado ? `Datos de la planilla del ${e.actualizado}` : 'Cupos y menús cargados en la página';
  }

  /* ---------------------------------------------------------------- inicio */
  function cambiarFecha(iso) {
    estado.fecha = iso;
    $('tFecha').value = iso;
    pintar();
  }

  function iniciar() {
    // Modo oscuro
    const icono = $('darkModeIcon');
    const pintarIcono = () => { icono.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙'; };
    pintarIcono();
    $('btnDarkMode').addEventListener('click', () => {
      const oscuro = document.documentElement.classList.toggle('dark');
      guardarLS('sae-darkmode', oscuro ? 'true' : 'false');
      pintarIcono();
    });

    estado.semana = leerLS(LS_SEMANA) === '1' ? 1 : 0;
    $('tSemana').value = String(estado.semana);
    estado.proveedor = leerLS(LS_PROV) || '';

    const pre = new URLSearchParams(location.search).get('fecha');
    const inicial = pre && /^\d{4}-\d{2}-\d{2}$/.test(pre) ? pre : isoDe(diaHabil(new Date(), 1));

    $('tFecha').addEventListener('change', () => { if ($('tFecha').value) cambiarFecha($('tFecha').value); });
    $('btnDiaAnt').addEventListener('click', () => {
      const d = fechaDe(estado.fecha); d.setDate(d.getDate() - 1); cambiarFecha(isoDe(diaHabil(d, -1)));
    });
    $('btnDiaSig').addEventListener('click', () => {
      const d = fechaDe(estado.fecha); d.setDate(d.getDate() + 1); cambiarFecha(isoDe(diaHabil(d, 1)));
    });
    $('tSemana').addEventListener('change', () => {
      estado.semana = Number($('tSemana').value) || 0;
      guardarLS(LS_SEMANA, String(estado.semana));
      pintar();
    });
    document.querySelectorAll('#tGrupo button').forEach(b => b.addEventListener('click', () => {
      estado.grupo = b.dataset.grupo;
      document.querySelectorAll('#tGrupo button').forEach(x => x.classList.toggle('activo', x === b));
      pintar();
    }));
    const elegirProv = (p) => { estado.proveedor = p; guardarLS(LS_PROV, p); pintarProveedor(); };
    $('tTabs').addEventListener('click', (ev) => { const b = ev.target.closest('.rec-tab'); if (b) elegirProv(b.dataset.prov); });
    $('tGeneral').addEventListener('click', (ev) => {
      const tr = ev.target.closest('.tot-fila-prov');
      if (tr) { elegirProv(tr.dataset.prov); $('tTabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    $('tGeneral').addEventListener('keydown', (ev) => {
      const tr = ev.target.closest('.tot-fila-prov');
      if (tr && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); elegirProv(tr.dataset.prov); }
    });
    let tB;
    $('tBuscarEsc').addEventListener('input', () => { clearTimeout(tB); tB = setTimeout(pintarDetalle, 150); });
    $('btnCSV').addEventListener('click', exportarCSV);
    $('btnImprimir').addEventListener('click', imprimir);

    window.addEventListener('sae-datos-actualizados', () => { pintar(); pintarSync(); });
    window.addEventListener('load', () => setTimeout(pintarSync, 50));
    pintarSync();

    cambiarFecha(inicial);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
