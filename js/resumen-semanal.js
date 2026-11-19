/**
 * (2.25.0) RESUMEN SEMANAL DE RECLAMOS (página Totales)
 * ------------------------------------------------------
 * Semana de lunes a domingo (por defecto, la anterior). Sale de la lista resumida de reclamos que ya usa la
 * ficha (SAE_SYNC.cargarReclamos): no hace pedidos nuevos al script ni toca la hoja.
 *  - Totales: reclamos de la semana (contra la anterior), resueltos, sin resolver y avisos.
 *  - Por proveedor: cuántos y de qué tipo.
 *  - Las 5 escuelas con más reclamos.
 *  - Sin resolver hace más de 7 días (de todo el año, no solo de la semana): para reclamarle al proveedor.
 *  - Avisos de la semana (paros, viandas, cierres).
 * Botones: copiar (texto para WhatsApp o mail), imprimir y Excel. Sin teléfonos ni montos.
 * Los avisos (categoría AVISO) no cuentan como reclamos. Hasta 2025 cuenta todo como resuelto (igual que en Reclamos).
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n) => Number(n || 0).toLocaleString('es-AR');
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const cap = (t) => String(t || '').toLowerCase().replace(/(^|[\s/(])\S/g, x => x.toUpperCase());
  const LS_ABIERTO = 'sae-resumen-semanal-abierto';
  const DIAS_SIN_RESOLVER = 7;
  const MOSTRAR_SIN_RESOLVER = 30;
  const ANIO_CIERRE = 2025;
  const MOTIVOS = { 'FALTANTE': 'Faltante', 'CALIDAD': 'Calidad', 'FUERA DE HORARIO': 'Fuera de horario', 'REEMPLAZOS S/A': 'Reemplazo sin aviso', 'OTROS': 'Otros' };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const estado = { semana: -1, reclamos: null, cargando: false, error: '', guardado: 0 };

  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }
  function toast(msg) {
    const t = $('toastRec');
    if (!t) return;
    t.textContent = msg; t.classList.add('visible');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('visible'), 2600);
  }

  /* ------------------------------------------------------------------ fechas */
  function parsear(t) {
    let m = String(t || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) { let a = +m[3]; if (a < 100) a += 2000; return new Date(a, +m[2] - 1, +m[1]); }
    m = String(t || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function hoy0() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function lunesDe(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function sumarDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const dma = (d) => `${dm(d)}/${String(d.getFullYear()).slice(2)}`;
  function rangoSemana(offset) {
    const desde = sumarDias(lunesDe(new Date()), 7 * offset);
    return { desde, hasta: sumarDias(desde, 6), fin: sumarDias(desde, 7) };   // fin: lunes siguiente (excluido)
  }
  function textoSemana(r, offset) {
    const base = `del lunes ${dm(r.desde)} al domingo ${dm(r.hasta)}`;
    return offset === 0 ? `Esta semana (${base}, hasta hoy)` : offset === -1 ? `Semana pasada (${base})` : `Semana ${base}`;
  }

  /* ---------------------------------------------------------------- datos */
  function estadoDe(r) {
    if (r.fechaObj && r.fechaObj.getFullYear() <= ANIO_CIERRE) return 'Resuelto';
    const e = norm(r.estado);
    if (/RESUEL/.test(e)) return 'Resuelto';
    if (/GESTION/.test(e)) return 'En gestión';
    if (/PEND/.test(e)) return 'Pendiente';
    return 'Sin estado';
  }
  const esAviso = (r) => norm(r.categoria) === 'AVISO';
  function tipoDe(r) {
    const m = norm(r.motivo), c = norm(r.categoria);
    if (MOTIVOS[m]) return MOTIVOS[m];
    if (m) return cap(m);
    return c ? cap(c) : 'Sin motivo';
  }
  const textoDe = (r) => String(r.problema || r.detalle || r.producto || '').trim();

  function preparar(lista) {
    return lista.map(r => {
      const fechaObj = parsear(r.fecha);
      const x = Object.assign({}, r, { fechaObj });
      x.est = estadoDe(x);
      x.tipo = tipoDe(x);
      x.aviso = esAviso(x);
      return x;
    }).filter(r => r.fechaObj);
  }

  function calcular(offset) {
    const todos = estado.reclamos || [];
    const r = rangoSemana(offset), ant = rangoSemana(offset - 1);
    const enRango = (x, rg) => x.fechaObj >= rg.desde && x.fechaObj < rg.fin;
    const semana = todos.filter(x => enRango(x, r));
    const rec = semana.filter(x => !x.aviso), avisos = semana.filter(x => x.aviso);
    const recAnt = todos.filter(x => enRango(x, ant) && !x.aviso);

    // Tipos más comunes de la semana (hasta 5 columnas; el resto, "Otros")
    const cuentaTipos = new Map();
    rec.forEach(x => cuentaTipos.set(x.tipo, (cuentaTipos.get(x.tipo) || 0) + 1));
    let tipos = [...cuentaTipos.entries()].sort((a, b) => b[1] - a[1]).map(t => t[0]);
    const hayOtros = tipos.length > 5;
    if (hayOtros) tipos = tipos.slice(0, 4);
    const colDe = (t) => tipos.indexOf(t) >= 0 ? t : 'Otros';
    const columnas = hayOtros ? tipos.concat('Otros') : tipos;

    const porProv = new Map();
    rec.forEach(x => {
      const p = String(x.proveedor || '').trim() || 'Sin proveedor';
      let o = porProv.get(p);
      if (!o) { o = { proveedor: p, total: 0, tipos: {}, resueltos: 0, abiertos: 0 }; porProv.set(p, o); }
      o.total++;
      const c = colDe(x.tipo); o.tipos[c] = (o.tipos[c] || 0) + 1;
      if (x.est === 'Resuelto') o.resueltos++; else o.abiertos++;
    });
    const proveedores = [...porProv.values()].sort((a, b) => b.total - a.total || a.proveedor.localeCompare(b.proveedor));

    const porEsc = new Map();
    rec.forEach(x => {
      const e = String(x.escuela || '').trim() || 'Sin escuela';
      let o = porEsc.get(e);
      if (!o) { o = { escuela: e, total: 0, tipos: new Map(), provs: new Set() }; porEsc.set(e, o); }
      o.total++; o.tipos.set(x.tipo, (o.tipos.get(x.tipo) || 0) + 1);
      if (x.proveedor) o.provs.add(String(x.proveedor).trim());
    });
    const escuelas = [...porEsc.values()].sort((a, b) => b.total - a.total || a.escuela.localeCompare(b.escuela, 'es', { numeric: true }))
      .map(o => Object.assign(o, { principal: [...o.tipos.entries()].sort((a, b) => b[1] - a[1])[0][0] }));

    // Sin resolver hace más de 7 días: de todo el año (no solo de esta semana), sin avisos
    const limite = sumarDias(hoy0(), -DIAS_SIN_RESOLVER), h = hoy0();
    const sinResolver = todos.filter(x => !x.aviso && (x.est === 'Pendiente' || x.est === 'En gestión') &&
      x.fechaObj.getFullYear() > ANIO_CIERRE && x.fechaObj <= limite)
      .map(x => Object.assign({ dias: Math.round((h - x.fechaObj) / 864e5) }, x))
      .sort((a, b) => b.dias - a.dias || String(a.escuela).localeCompare(String(b.escuela), 'es', { numeric: true }));

    return {
      offset, rango: r, rec, avisos: avisos.sort((a, b) => a.fechaObj - b.fechaObj || String(a.escuela).localeCompare(String(b.escuela), 'es', { numeric: true })),
      nAnt: recAnt.length, resueltos: rec.filter(x => x.est === 'Resuelto').length,
      abiertos: rec.filter(x => x.est === 'Pendiente' || x.est === 'En gestión').length,
      sinEstado: rec.filter(x => x.est === 'Sin estado').length,
      columnas, proveedores, escuelas, sinResolver
    };
  }

  /* -------------------------------------------------------------- pintar */
  const puntoProv = (p) => (window.SAE_PROV && SAE_PROV.punto) ? SAE_PROV.punto(p) : '';
  const linkEsc = (e) => `<a href="reclamos.html?escuela=${encodeURIComponent(e)}#buscar" class="tot-link">${esc(e)}</a>`;
  const pillEstado = (e) => `<span class="rs-est rs-est-${e === 'En gestión' ? 'gestion' : e === 'Pendiente' ? 'pend' : 'otro'}">${esc(e)}</span>`;

  function pintar() {
    const cuerpo = $('rsCuerpo');
    if (!cuerpo) return;
    const rg = rangoSemana(estado.semana);
    $('rsSemana').textContent = textoSemana(rg, estado.semana);
    $('rsSig').disabled = estado.semana >= 0;
    $('rsHoy').hidden = estado.semana === 0;
    if (estado.cargando && !estado.reclamos) { cuerpo.innerHTML = '<p class="rec-res-vacio">Cargando los reclamos…</p>'; return; }
    if (!estado.reclamos) {
      cuerpo.innerHTML = `<p class="rec-res-vacio">${esc(estado.error || 'No se pudieron traer los reclamos.')} <button type="button" class="btn btn-secondary btn-sm" data-rs="reintentar">Reintentar</button></p>`;
      return;
    }
    const c = estado.ultimo = calcular(estado.semana);
    const dif = c.rec.length - c.nAnt;
    const comp = c.nAnt || c.rec.length ? (dif === 0 ? 'igual que la semana anterior' : `${dif > 0 ? '▲' : '▼'} ${nf(Math.abs(dif))} ${dif > 0 ? 'más' : 'menos'} que la semana anterior (${nf(c.nAnt)})`) : '';
    const tiles = [
      ['Reclamos', nf(c.rec.length), comp, dif > 0 ? 'sube' : dif < 0 ? 'baja' : ''],
      ['Resueltos', nf(c.resueltos), c.rec.length ? `${Math.round(c.resueltos * 100 / c.rec.length)} % de la semana` : '', ''],
      ['Sin resolver', nf(c.abiertos), c.sinEstado ? `y ${nf(c.sinEstado)} sin estado cargado` : 'pendientes o en gestión', ''],
      ['Avisos', nf(c.avisos.length), 'paros, viandas, cierres…', '']
    ].map(([t, v, s, cl]) => `<div class="rec-res-tile"><span class="rec-res-tile-t">${t}</span><strong class="rec-res-tile-v">${v}</strong>` +
      (s ? `<span class="rec-res-tile-s rs-${cl}">${esc(s)}</span>` : '') + '</div>').join('');

    const tablaProv = c.proveedores.length ? `<table class="rec-res-tabla rs-tabla">
        <thead><tr><th>Proveedor</th><th class="num">Reclamos</th>${c.columnas.map(t => `<th class="num">${esc(t)}</th>`).join('')}<th class="num">Sin resolver</th></tr></thead>
        <tbody>${c.proveedores.map(p => `<tr><th scope="row">${puntoProv(p.proveedor)}${esc(p.proveedor)}</th><td class="num"><strong>${nf(p.total)}</strong></td>` +
          c.columnas.map(t => `<td class="num">${p.tipos[t] ? nf(p.tipos[t]) : '<span class="rs-cero">–</span>'}</td>`).join('') +
          `<td class="num">${p.abiertos ? `<strong class="rs-abiertos">${nf(p.abiertos)}</strong>` : '<span class="rs-cero">–</span>'}</td></tr>`).join('')}</tbody>
      </table>` : '<p class="rec-res-vacio">No hubo reclamos esa semana. 👍</p>';

    const top = c.escuelas.slice(0, 5);
    const listaEsc = top.length ? `<ol class="rs-top">${top.map(e => `<li>${linkEsc(e.escuela)} <strong>${nf(e.total)}</strong>` +
      `<span class="tot-muted"> · ${esc(e.principal)}${e.provs.size ? ' · ' + esc([...e.provs].join(', ')) : ''}</span></li>`).join('')}</ol>` : '<p class="rec-res-vacio">—</p>';

    const sr = c.sinResolver;
    const tablaSR = sr.length ? `<table class="rec-res-tabla rs-tabla rs-sr">
        <thead><tr><th>Escuela</th><th>Fecha</th><th class="num">Días</th><th>Proveedor</th><th>Motivo</th><th>Qué pasó</th><th>Estado</th></tr></thead>
        <tbody>${sr.slice(0, MOSTRAR_SIN_RESOLVER).map(x => `<tr><th scope="row">${linkEsc(x.escuela)}</th><td>${dma(x.fechaObj)}</td>` +
          `<td class="num"><strong class="${x.dias > 30 ? 'rs-muy' : ''}">${nf(x.dias)}</strong></td><td>${puntoProv(x.proveedor)}${esc(x.proveedor || '—')}</td>` +
          `<td>${esc(x.tipo)}</td><td class="rs-texto">${esc(textoDe(x)) || '—'}</td><td>${pillEstado(x.est)}</td></tr>`).join('')}</tbody>
      </table>${sr.length > MOSTRAR_SIN_RESOLVER ? `<p class="tot-cob-nota">Y ${nf(sr.length - MOSTRAR_SIN_RESOLVER)} más: están todos en el Excel.</p>` : ''}`
      : '<p class="rec-res-vacio">No hay reclamos sin resolver de hace más de una semana. 👍</p>';

    const tablaAv = c.avisos.length ? `<table class="rec-res-tabla rs-tabla">
        <thead><tr><th>Fecha</th><th>Escuela</th><th>Tipo</th><th>Detalle</th></tr></thead>
        <tbody>${c.avisos.map(x => `<tr><td>${DIAS[x.fechaObj.getDay()].slice(0, 3)} ${dm(x.fechaObj)}</td><th scope="row">${esc(x.escuela)}</th>` +
          `<td>${esc(x.tipo)}</td><td class="rs-texto">${esc(textoDe(x)) || '—'}</td></tr>`).join('')}</tbody>
      </table>` : '<p class="rec-res-vacio">No hubo avisos esa semana.</p>';

    const hora = estado.guardado ? new Date(estado.guardado).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
    cuerpo.innerHTML = `
      <div class="rec-res-tiles rs-tiles">${tiles}</div>
      <h4 class="rs-h">Por proveedor</h4><div class="rec-res-scroll">${tablaProv}</div>
      <h4 class="rs-h">Escuelas con más reclamos</h4>${listaEsc}
      <h4 class="rs-h">Sin resolver hace más de ${DIAS_SIN_RESOLVER} días <span class="tot-muted">(${nf(sr.length)}, de todo el año, del más viejo al más nuevo)</span></h4>
      <div class="rec-res-scroll">${tablaSR}</div>
      <h4 class="rs-h">Avisos de la semana</h4><div class="rec-res-scroll">${tablaAv}</div>
      <p class="tot-cob-nota">Sale de la hoja de reclamos${hora ? ` (datos de las ${hora})` : ''}. Los avisos no cuentan como reclamos. Tocá una escuela para verla en Reclamos.</p>`;
    $('rsN').textContent = `(${nf(c.rec.length)} reclamos · ${nf(sr.length)} sin resolver)`;
  }

  /* ------------------------------------------------------------- cargar */
  async function cargar(forzar) {
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.cargarReclamos || !SAE_SYNC.hayScript()) {
      estado.error = 'Falta la conexión con la hoja de reclamos.'; pintar(); return;
    }
    estado.cargando = true; pintar();
    try {
      const lista = await SAE_SYNC.cargarReclamos(!!forzar, { rapido: !forzar });
      estado.reclamos = preparar(lista || []);
      estado.guardado = (SAE_SYNC.horaReclamos && SAE_SYNC.horaReclamos()) || Date.now();
      estado.error = '';
    } catch (e) {
      estado.error = 'No se pudieron traer los reclamos (' + (e && e.message || 'sin conexión') + ').';
    } finally { estado.cargando = false; pintar(); }
  }

  /* --------------------------------------------------------- compartir */
  function texto() {
    const c = estado.ultimo;
    if (!c) return '';
    const l = [];
    l.push(`📊 RESUMEN DE RECLAMOS · ${textoSemana(c.rango, c.offset)}`);
    l.push(`Reclamos: ${c.rec.length}${c.nAnt || c.rec.length ? ` (semana anterior: ${c.nAnt})` : ''} · Resueltos: ${c.resueltos} · Sin resolver: ${c.abiertos} · Avisos: ${c.avisos.length}`);
    if (c.proveedores.length) {
      l.push('', 'POR PROVEEDOR');
      c.proveedores.forEach(p => l.push(`• ${p.proveedor}: ${p.total} (${c.columnas.filter(t => p.tipos[t]).map(t => `${t.toLowerCase()} ${p.tipos[t]}`).join(', ')})${p.abiertos ? ` · ${p.abiertos} sin resolver` : ''}`));
    }
    if (c.escuelas.length) {
      l.push('', 'ESCUELAS CON MÁS RECLAMOS');
      c.escuelas.slice(0, 5).forEach((e, i) => l.push(`${i + 1}. ${e.escuela}: ${e.total} (${e.principal.toLowerCase()})`));
    }
    l.push('', `SIN RESOLVER HACE MÁS DE ${DIAS_SIN_RESOLVER} DÍAS: ${c.sinResolver.length}`);
    c.sinResolver.slice(0, 15).forEach(x => l.push(`• ${x.escuela} · ${dma(x.fechaObj)} (${x.dias} días) · ${x.proveedor || '—'} · ${x.tipo}${textoDe(x) ? ': ' + textoDe(x) : ''}`));
    if (c.sinResolver.length > 15) l.push(`  … y ${c.sinResolver.length - 15} más.`);
    if (c.avisos.length) {
      l.push('', 'AVISOS DE LA SEMANA');
      c.avisos.forEach(x => l.push(`• ${DIAS[x.fechaObj.getDay()]} ${dm(x.fechaObj)} · ${x.escuela} · ${x.tipo}${textoDe(x) ? ': ' + textoDe(x) : ''}`));
    }
    return l.join('\n');
  }
  async function copiar() {
    const t = texto();
    if (!t) return;
    try { await navigator.clipboard.writeText(t); toast('📋 Resumen copiado: pegalo en WhatsApp o en un mail'); }
    catch (e) {
      const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
      try { document.execCommand('copy'); toast('📋 Resumen copiado'); } catch (e2) { toast('⚠️ No se pudo copiar'); }
      a.remove();
    }
  }
  function excel() {
    const c = estado.ultimo;
    if (!c) return;
    if (typeof SAE_EXCEL === 'undefined') { toast('⚠️ Falta el archivo js/excel.js en la página'); return; }
    const sub = [textoSemana(c.rango, c.offset), SAE_EXCEL.generadoEl()];
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    SAE_EXCEL.descargar(`Resumen_reclamos_${iso(c.rango.desde)}`, [
      { nombre: 'Por proveedor', titulo: 'Reclamos por proveedor', subtitulo: sub,
        columnas: [{ t: 'Proveedor', ancho: 22 }, { t: 'Reclamos', tipo: 'num' }].concat(c.columnas.map(t => ({ t, tipo: 'num' })), [{ t: 'Resueltos', tipo: 'num' }, { t: 'Sin resolver', tipo: 'num' }]),
        filas: c.proveedores.map(p => [p.proveedor, p.total].concat(c.columnas.map(t => p.tipos[t] || 0), [p.resueltos, p.abiertos])),
        notas: [`Semana anterior: ${c.nAnt} reclamos. Avisos de la semana: ${c.avisos.length} (no cuentan como reclamos).`] },
      { nombre: 'Escuelas', titulo: 'Reclamos por escuela', subtitulo: sub,
        columnas: [{ t: 'Escuela', ancho: 28 }, { t: 'Reclamos', tipo: 'num' }, { t: 'Motivo más común', ancho: 22 }, { t: 'Proveedores', ancho: 26 }],
        filas: c.escuelas.map(e => [e.escuela, e.total, e.principal, [...e.provs].join(', ')]) },
      { nombre: 'Sin resolver', titulo: `Sin resolver hace más de ${DIAS_SIN_RESOLVER} días`, subtitulo: [`Al ${dma(hoy0())} · de todo el año`, SAE_EXCEL.generadoEl()],
        columnas: [{ t: 'Escuela', ancho: 26 }, { t: 'Fecha', ancho: 10 }, { t: 'Días', tipo: 'num' }, { t: 'Proveedor', ancho: 18 }, { t: 'Servicio', ancho: 18 }, { t: 'Motivo', ancho: 20 }, { t: 'Qué pasó', ancho: 50 }, { t: 'Estado', ancho: 12 }],
        filas: c.sinResolver.map(x => [x.escuela, dma(x.fechaObj), x.dias, x.proveedor || '', cap(x.servicio || ''), x.tipo, textoDe(x),
          { v: x.est, estilo: x.est === 'Pendiente' ? 'pendiente' : 'gestion' }]) },
      { nombre: 'Avisos', titulo: 'Avisos de la semana', subtitulo: sub,
        columnas: [{ t: 'Fecha', ancho: 12 }, { t: 'Escuela', ancho: 26 }, { t: 'Tipo', ancho: 18 }, { t: 'Detalle', ancho: 60 }],
        filas: c.avisos.map(x => [dma(x.fechaObj), x.escuela, x.tipo, textoDe(x)]) }
    ]).then(() => toast('📥 Excel descargado')).catch(() => toast('⚠️ No se pudo armar el Excel'));
  }
  async function imprimir() {
    const html = document.documentElement;
    const preparar = () => html.classList.add('imprimir-resumen');
    const limpiar = () => html.classList.remove('imprimir-resumen');
    if (typeof SAE_IMPRESION === 'undefined') {
      preparar(); const fin = () => { limpiar(); window.removeEventListener('afterprint', fin); };
      window.addEventListener('afterprint', fin); window.print(); return;
    }
    const modo = await SAE_IMPRESION.elegir('Imprimir el resumen de la semana');
    if (!modo) return;
    SAE_IMPRESION.imprimir(modo, preparar, limpiar);
  }

  /* ------------------------------------------------------------ iniciar */
  function iniciar() {
    const caja = $('rsCaja');
    if (!caja) return;
    if (leerLS(LS_ABIERTO) === '1') caja.open = true;
    caja.addEventListener('toggle', () => {
      guardarLS(LS_ABIERTO, caja.open ? '1' : '0');
      if (caja.open && !estado.reclamos && !estado.cargando) cargar(false);
    });
    $('rsAnt').addEventListener('click', () => { estado.semana--; pintar(); });
    $('rsSig').addEventListener('click', () => { if (estado.semana < 0) { estado.semana++; pintar(); } });
    $('rsHoy').addEventListener('click', () => { estado.semana = 0; pintar(); });
    $('rsCopiar').addEventListener('click', copiar);
    $('rsExcel').addEventListener('click', excel);
    $('rsImprimir').addEventListener('click', imprimir);
    $('rsActualizar').addEventListener('click', () => cargar(true));
    $('rsCuerpo').addEventListener('click', (ev) => { if (ev.target.closest('[data-rs="reintentar"]')) cargar(true); });
    pintar();
    if (caja.open) cargar(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.SAE_RESUMEN_SEMANAL = { _calcular: calcular, _preparar: preparar, _texto: texto, _estado: estado };
})();
