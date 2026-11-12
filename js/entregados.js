/**
 * ==========================================================================
 * (2.16.0) ENTREGAS Y ARREGLOS de cada escuela
 * Lo trae el script (acción "entregas", v38): el historial del Tablero ("BUSCADOR ENTREGAS", 2022–2025) y la
 * planilla "Facturación SAE 2026" (arreglos de FACTURACION ITEMS y lo que va a una escuela en FACTURACION
 * UNIDADES). Sin montos ni facturas. Los repetidos (misma escuela, misma fecha, misma causa) ya vienen sacados.
 *  - SAE_ENTREGADO.pintarFicha(contenedor, escuela): tarjeta con los últimos 5, por colores, como los reclamos.
 *  - SAE_ENTREGADO.abrirTodo(escuela): ventana con todo lo hecho en la escuela (filtros por tipo y año, Excel).
 *  - SAE_ENTREGADO.paraPdf(escuela, n): filas para el PDF de la escuela.
 * Solo se muestran las escuelas del buscador (las que no son del SAE quedan afuera).
 * ==========================================================================
 */
window.SAE_ENTREGADO = (function () {
  const LS = 'sae-entregados-v1';
  const FRESCO_MS = 60 * 60 * 1000;          // una hora: después se pide de nuevo (en segundo plano)
  const VIEJO_MS = 7 * 24 * 60 * 60 * 1000;  // sin internet o con el script caído, sirve la copia de hasta 7 días
  const TIPOS = {
    GAS: { t: 'Gas', i: '🔥' }, ELEC: { t: 'Electricidad', i: '⚡' }, PLOM: { t: 'Plomería', i: '🚰' },
    REFRI: { t: 'Refrigeración', i: '❄️' }, EQUIP: { t: 'Equipamiento', i: '🍳' }, UTEN: { t: 'Utensilios', i: '🥣' },
    SERV: { t: 'Servicios', i: '🧹' }, OTRO: { t: 'Otros', i: '📦' }
  };
  const ORDEN_TIPOS = ['GAS', 'ELEC', 'PLOM', 'REFRI', 'SERV', 'EQUIP', 'UTEN', 'OTRO'];
  // (2.16.1) Dos grupos: arreglos (gas, electricidad, plomería, refrigeración, canaletas/atmosférico) y entregas (equipamiento, utensilios)
  const GRUPOS = { ARR: { t: 'Arreglos', i: '🛠️', ver: 'Ver todos los arreglos', vacio: 'No hay arreglos cargados para esta escuela.', tipos: ['GAS', 'ELEC', 'PLOM', 'REFRI', 'SERV'] }, ENT: { t: 'Entregas', i: '📦', ver: 'Ver todas las entregas', vacio: 'No hay entregas cargadas para esta escuela.', tipos: ['EQUIP', 'UTEN', 'OTRO'] } };
  const grupoDe = (tipo) => GRUPOS.ARR.tipos.includes(tipo) ? 'ARR' : 'ENT';
  const LS_GRUPO = 'sae-ea-grupo';
  // Colores del PDF (los mismos de la página)
  const RGB = { GAS: [234, 88, 12], ELEC: [202, 138, 4], PLOM: [37, 99, 235], REFRI: [8, 145, 178], EQUIP: [124, 58, 237],
    UTEN: [22, 163, 74], SERV: [100, 116, 139], OTRO: [100, 116, 139] };

  const escH = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const compactar = (t) => norm(t).replace(/N\s*[°º]\s*/g, '').replace(/[^A-Z0-9]/g, '').replace(/([A-Z])0+(\d)/g, '$1$2');
  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin lugar: se vuelve a pedir */ } };

  let datos = null, porEscuela = null, sinCruzar = [], promesa = null;

  /* ------------------------------------------------------------------ datos */
  function usar(d) {
    datos = d; porEscuela = null;
  }
  (function copiaGuardada() {
    try {
      const g = JSON.parse(leerLS(LS) || 'null');
      if (g && g.d && Date.now() - g.t < VIEJO_MS) { usar(g.d); datos._t = g.t; }
    } catch (e) { /* nada */ }
  })();

  /** Trae los datos del script (una hora de copia en el navegador). */
  function cargar(forzar) {
    if (!forzar && datos && datos._t && Date.now() - datos._t < FRESCO_MS) return Promise.resolve(datos);
    if (promesa) return promesa;
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) return Promise.reject(new Error('SIN_URL'));
    promesa = SAE_SYNC.pedir('entregas', forzar ? { forzar: '1' } : {}).then(r => {
      if (!r.e) throw new Error('SCRIPT_VIEJO');   // un script anterior al 38 no conoce "entregas" (devuelve otra cosa)
      const d = { e: r.e || {}, n: r.n || {}, errores: r.errores || [], generado: r.generado || '', _t: Date.now() };
      usar(d);
      guardarLS(LS, JSON.stringify({ t: d._t, d }));
      return d;
    }).finally(() => { promesa = null; });
    return promesa;
  }

  /* ------------------------------------------- nombres de la planilla → buscador */
  const PREFIJOS = /^(J\.?\s?I\.?\s?M\.?|J\.?\s?I\.?|J\.?\s?M\.?|JIM|EPI|UDI)\s+/;
  const ESPECIALES = { 'RDEESCALADA': 'REMEDIOSDEESCALADA' };
  function armarIndice() {
    if (porEscuela || !datos) return;
    const r = indexar(datos.e || {});
    porEscuela = r.porEscuela; sinCruzar = r.sinCruzar;
  }
  /** Cruza los nombres de la planilla con las escuelas del buscador. */
  function indexar(eDatos) {
    const porEscuela = new Map(), sinCruzar = [];
    const escuelas = (typeof SAE_DATA !== 'undefined' && SAE_DATA.escuelas) || [];
    const idx = new Map(), porNombre = new Map();
    escuelas.forEach(e => {
      [e.nombre].concat(e.alias || []).forEach(n => idx.set(compactar(n), e));
      const resto = compactar(norm(e.nombre).replace(/^(JM|JI|EPI|UDI)\s+/, ''));
      if (resto && !porNombre.has(resto)) porNombre.set(resto, e); else if (resto) porNombre.set(resto, null);   // null = ambiguo
    });
    const resolver = (raw) => {
      const k = compactar(raw);
      if (idx.has(k)) return idx.get(k);
      let n = norm(raw).replace(/^E\.?\s?TEC\s*/, 'TEC ').replace(/^E\.?E\.?E\.?\s*(\d)/, 'EE $1').replace(/^E\.?S\.?\s*(\d)/, 'EES $1');
      if (idx.has(compactar(n))) return idx.get(compactar(n));
      // "JI José Hernández", "JiM Nubecita", "MI CASITA": se busca por el nombre sin el tipo
      let resto = compactar(n.replace(PREFIJOS, ''));
      Object.keys(ESPECIALES).forEach(a => { resto = resto.replace(a, ESPECIALES[a]); });
      if (resto.length >= 4) {
        if (porNombre.get(resto)) return porNombre.get(resto);
        const cand = [...porNombre.entries()].filter(([r, e]) => e && (r.startsWith(resto) || resto.startsWith(r)) && Math.min(r.length, resto.length) >= 5);
        if (cand.length === 1) return cand[0][1];
      }
      return null;
    };
    Object.keys(eDatos).forEach(raw => {
      // "EP 31/ES27": va a las dos
      const partes = /\//.test(raw) && !/^J\.|^\d/.test(raw) ? raw.split('/') : [raw];
      const destinos = partes.map(resolver).filter(Boolean);
      if (!destinos.length) { sinCruzar.push(raw); return; }
      destinos.forEach(e => {
        const l = porEscuela.get(e.nombre) || [];
        eDatos[raw].forEach(f => l.push({ f: f[0] || '', tipo: TIPOS[f[1]] ? f[1] : 'OTRO', det: f[2] || '', cant: f[3], prov: f[4] || '' }));
        porEscuela.set(e.nombre, l);
      });
    });
    // Más nuevo primero; los "sin fecha" al final. Al juntar nombres distintos de la misma escuela, otra vez sin repetidos.
    porEscuela.forEach((l, k) => {
      const vistos = new Set();
      porEscuela.set(k, l.filter(x => { const c = x.f + '|' + x.tipo + '|' + compactar(x.det); if (vistos.has(c)) return false; vistos.add(c); return true; })
        .sort((a, b) => (b.f || '0').localeCompare(a.f || '0')));
    });
    return { porEscuela, sinCruzar };
  }

  /** Todo lo de una escuela (más nuevo primero). */
  function de(escuela) {
    armarIndice();
    return (porEscuela && escuela && porEscuela.get(escuela.nombre)) || [];
  }

  /* ---------------------------------------------------------------- textos */
  /** "2026-10-23" → "23/10/26" · "2024-08" → "08/24" · "2024" → "2024" */
  function fechaTxt(f) {
    let m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f))) return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
    if ((m = /^(\d{4})-(\d{2})$/.exec(f))) return `${m[2]}/${m[1].slice(2)}`;
    return f || 'Sin fecha';
  }
  /** Los textos en MAYÚSCULAS se muestran con mayúscula inicial. */
  function detalleTxt(x) {
    let d = String(x.det || '').trim().replace(/[:;,\s]+$/, '');
    d = d.split(' — ').map(p => (p === p.toUpperCase() && /[A-Z]{3}/.test(p)) ? p.charAt(0) + p.slice(1).toLowerCase() : p).join(' — ');
    if (!d) d = TIPOS[x.tipo].t + ' (sin detalle)';
    return d;
  }
  const cantTxt = (x) => (x.cant !== '' && x.cant != null && Number(x.cant) > 0) ? `${Number(x.cant).toLocaleString('es-AR')} u.` : '';   // (2.16.1) "13 u."
  const anio = (f) => (/^(\d{4})/.exec(f || '') || [])[1] || '';

  /* ----------------------------------------------------- tarjeta de la ficha */
  let pedidoFicha = 0;
  function itemHTML(x) {
    const T = TIPOS[x.tipo];
    return `<li class="ea-item ea-${x.tipo.toLowerCase()}"><div class="ea-linea"><span class="ea-fecha">${escH(fechaTxt(x.f))}</span>` +
      `<span class="ea-tipo">${T.i} ${escH(T.t)}</span>${cantTxt(x) ? `<span class="ea-cant">${escH(cantTxt(x))}</span>` : ''}</div>` +
      `<div class="ea-detalle">${escH(detalleTxt(x))}</div>${x.prov ? `<div class="ea-prov">${escH(x.prov)}</div>` : ''}</li>`;
  }
  async function pintarFicha(cont, escuela) {
    if (!cont || !escuela) return;
    const id = ++pedidoFicha;
    const cab = (extra) => `<div class="rf-cab"><span class="rf-titulo">🛠️ Entregas y arreglos</span>${extra || ''}</div>`;
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) { cont.innerHTML = ''; cont.style.display = 'none'; return; }
    cont.style.display = '';
    if (!datos) cont.innerHTML = cab() + '<p class="rf-msg">Cargando entregas y arreglos…</p>';
    else pintarLista(cont, escuela, cab);
    try { await cargar(false); }
    catch (err) {
      if (id !== pedidoFicha) return;
      if (!datos) {
        const m = String(err && err.message || err);
        const txt = m === 'SCRIPT_VIEJO' ? 'Falta actualizar el script de Google (versión 38) para ver las entregas y arreglos.'
          : /CLAVE/.test(m) ? 'El script de Google todavía pide la clave del equipo: hay que publicar la versión 40.'
          : 'No se pudieron leer las entregas y arreglos. Probá de nuevo en un rato.';
        cont.innerHTML = cab() + `<p class="rf-msg">⚠️ ${escH(txt)}</p>`;
      }
      return;
    }
    if (id !== pedidoFicha) return;
    pintarLista(cont, escuela, cab);
  }
  function pintarLista(cont, escuela, cab) {
    const lista = de(escuela);
    const esteAnio = String(new Date().getFullYear());
    const n = lista.filter(x => anio(x.f) === esteAnio).length;
    const resumen = lista.length ? `<span class="rf-cuenta"><strong>${n}</strong> este año · último ${escH(fechaTxt(lista[0].f))}</span>` : '';
    if (!lista.length) {
      cont.innerHTML = cab() + '<p class="rf-msg">No hay entregas ni arreglos cargados para esta escuela.</p>';
      return;
    }
    const porG = { ARR: lista.filter(x => grupoDe(x.tipo) === 'ARR'), ENT: lista.filter(x => grupoDe(x.tipo) === 'ENT') };
    let g = leerLS(LS_GRUPO) === 'ENT' ? 'ENT' : 'ARR';
    if (!porG[g].length) g = g === 'ARR' ? 'ENT' : 'ARR';   // si no hay de ese grupo, se muestra el otro
    const pintarG = () => {
      const l = porG[g];
      cont.innerHTML = cab(resumen) +
        `<div class="ea-tabs" role="tablist">${['ARR', 'ENT'].map(k => `<button type="button" role="tab" class="ea-tab${k === g ? ' activo' : ''}" data-g="${k}" aria-selected="${k === g}">${GRUPOS[k].i} ${GRUPOS[k].t} <small>${porG[k].length}</small></button>`).join('')}</div>` +
        (l.length ? `<ul class="rf-lista ea-lista">${l.slice(0, 5).map(itemHTML).join('')}</ul>` : `<p class="rf-msg">${GRUPOS[g].vacio}</p>`) +
        (l.length > 5 ? `<p class="rf-mas">y ${l.length - 5} más</p>` : '') +
        (l.length ? `<div class="rf-acciones"><a href="#" class="rf-link" data-ea="todo">${GRUPOS[g].ver} (${l.length})</a></div>` : '');
      cont.querySelectorAll('.ea-tab').forEach(bt => bt.addEventListener('click', () => { g = bt.dataset.g; guardarLS(LS_GRUPO, g); pintarG(); }));
      const b = cont.querySelector('[data-ea="todo"]');
      if (b) b.addEventListener('click', (ev) => { ev.preventDefault(); abrirTodo(escuela, g); });
    };
    pintarG();
  }

  /* --------------------------------------------------- ventana "Ver todo" */
  function abrirTodo(escuela, grupoIni) {
    const todas = de(escuela);
    const filtro = { g: grupoIni === 'ENT' ? 'ENT' : 'ARR', tipo: '', anio: '', q: '' };
    const fondo = document.createElement('div');
    fondo.className = 'ea-fondo';
    fondo.setAttribute('role', 'dialog'); fondo.setAttribute('aria-modal', 'true'); fondo.setAttribute('aria-label', 'Entregas y arreglos de ' + escuela.nombre);
    const anios = [...new Set(todas.map(x => anio(x.f) || 'Sin fecha'))];
    const nG = (k) => todas.filter(x => grupoDe(x.tipo) === k).length;
    fondo.innerHTML = `<div class="ea-caja">
      <div class="ea-caja-cab"><div><h3>🛠️ Entregas y arreglos</h3><p>${escH(escuela.nombre)} · ${todas.length} en total</p></div>
        <button type="button" class="ea-cerrar" data-a="cerrar" aria-label="Cerrar">✕</button></div>
      <div class="ea-filtros">
        <div class="ea-tabs" role="tablist">${['ARR', 'ENT'].map(k => `<button type="button" role="tab" class="ea-tab" data-g="${k}">${GRUPOS[k].i} ${GRUPOS[k].t} <small>${nG(k)}</small></button>`).join('')}</div>
        <div class="ea-chips" data-a="chips"></div>
        <div class="ea-fila"><select data-a="anio" aria-label="Año"><option value="">Todos los años</option>${anios.map(a => `<option>${escH(a)}</option>`).join('')}</select>
          <input type="search" data-a="q" placeholder="Buscar (ej. termotanque)" aria-label="Buscar">
          ${typeof SAE_EXCEL !== 'undefined' ? '<button type="button" class="ea-excel" data-a="excel">⬇️ Excel</button>' : ''}</div>
      </div>
      <div class="ea-cuerpo" data-a="cuerpo"></div>
    </div>`;
    const q = (s) => fondo.querySelector(s);
    const lista = () => todas.filter(x => grupoDe(x.tipo) === filtro.g);
    const pintarChips = () => {
      const l = lista();
      const tipos = ORDEN_TIPOS.filter(t => l.some(x => x.tipo === t));
      fondo.querySelectorAll('.ea-tab').forEach(b => { b.classList.toggle('activo', b.dataset.g === filtro.g); b.setAttribute('aria-selected', b.dataset.g === filtro.g); });
      q('[data-a="chips"]').innerHTML = tipos.length > 1 ? `<button type="button" class="ea-chip activo" data-t="">Todos <small>${l.length}</small></button>${tipos.map(t =>
        `<button type="button" class="ea-chip ea-${t.toLowerCase()}" data-t="${t}">${TIPOS[t].i} ${TIPOS[t].t} <small>${l.filter(x => x.tipo === t).length}</small></button>`).join('')}` : '';
    };
    const filtradas = () => lista().filter(x => (!filtro.tipo || x.tipo === filtro.tipo) && (!filtro.anio || (anio(x.f) || 'Sin fecha') === filtro.anio) &&
      (!filtro.q || norm(detalleTxt(x) + ' ' + x.prov + ' ' + TIPOS[x.tipo].t).includes(norm(filtro.q))));
    const pintar = () => {
      const l = filtradas();
      if (!l.length) { q('[data-a="cuerpo"]').innerHTML = `<p class="rf-msg">${lista().length ? 'Nada con esos filtros.' : GRUPOS[filtro.g].vacio}</p>`; return; }
      const grupos = [];
      l.forEach(x => { const a = anio(x.f) || 'Sin fecha'; if (!grupos.length || grupos[grupos.length - 1].a !== a) grupos.push({ a, l: [] }); grupos[grupos.length - 1].l.push(x); });
      q('[data-a="cuerpo"]').innerHTML = grupos.map(g => `<h4 class="ea-anio">${escH(g.a)} <small>${g.l.length}</small></h4><ul class="rf-lista ea-lista">${g.l.map(itemHTML).join('')}</ul>`).join('');
    };
    const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', tecla); document.documentElement.classList.remove('ea-abierto'); };
    const tecla = (ev) => { if (ev.key === 'Escape') cerrar(); };
    fondo.addEventListener('click', (ev) => {
      if (ev.target === fondo || ev.target.closest('[data-a="cerrar"]')) { cerrar(); return; }
      const tb = ev.target.closest('.ea-tab');
      if (tb) { filtro.g = tb.dataset.g; filtro.tipo = ''; guardarLS(LS_GRUPO, filtro.g); pintarChips(); pintar(); return; }
      const ch = ev.target.closest('.ea-chip');
      if (ch) { filtro.tipo = ch.dataset.t; fondo.querySelectorAll('.ea-chip').forEach(b => b.classList.toggle('activo', b === ch)); pintar(); }
      if (ev.target.closest('[data-a="excel"]')) exportar(escuela, filtradas(), GRUPOS[filtro.g].t);
    });
    q('[data-a="anio"]').addEventListener('change', (ev) => { filtro.anio = ev.target.value; pintar(); });
    let t; q('[data-a="q"]').addEventListener('input', (ev) => { clearTimeout(t); t = setTimeout(() => { filtro.q = ev.target.value; pintar(); }, 150); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(fondo);
    document.documentElement.classList.add('ea-abierto');
    pintarChips();
    pintar();
    q('[data-a="cerrar"]').focus();
  }

  function exportar(escuela, filas, grupoTxt) {
    if (typeof SAE_EXCEL === 'undefined' || !filas.length) return;
    const hoy = new Date(), pad = (n) => String(n).padStart(2, '0');
    SAE_EXCEL.descargar(`${grupoTxt || 'Entregas_y_arreglos'}_${escuela.nombre.replace(/[^\w\-]+/g, '_')}_${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`, [{
      nombre: grupoTxt || 'Entregas y arreglos', titulo: `${grupoTxt || 'Entregas y arreglos'} · ${escuela.nombre}`, subtitulo: [SAE_EXCEL.generadoEl()],
      columnas: [{ t: 'Fecha', ancho: 11 }, { t: 'Tipo', ancho: 15 }, { t: 'Detalle', tipo: 'largo', ancho: 60 }, { t: 'Cantidad', tipo: 'num' }, { t: 'Proveedor', ancho: 28 }],
      filas: filas.map(x => [fechaTxt(x.f), TIPOS[x.tipo].t, detalleTxt(x), Number(x.cant) > 0 ? Number(x.cant) : '', x.prov]),
      notas: ['Historial del Tablero (2022–2025) y planilla "Facturación SAE 2026". Sin montos ni números de factura.']
    }]).catch(() => { /* nada */ });
  }

  /* ------------------------------------------------------------------ PDF */
  /** { ok, filas: [[fecha, tipo, detalle, cantidad]], colores: [[r,g,b]], total, esteAnio } o { ok:false, msg } */
  async function paraPdf(escuela, n, grupo, anioSolo) {
    try { await cargar(false); } catch (err) { if (!datos) return { ok: false, msg: 'No se pudieron leer las entregas y arreglos (revisá la conexión o el script de Google, versión 38).' }; }
    const lista = de(escuela).filter(x => !grupo || grupoDe(x.tipo) === grupo);
    // (2.17.0) "Todos los de este año": todos los del año pedido, sin tope
    const elegidos = anioSolo ? lista.filter(x => anio(x.f) === String(anioSolo)) : n === 'todos' ? lista : lista.slice(0, Number(n) || 5);
    const esteAnio = String(new Date().getFullYear());
    return {
      ok: true, total: lista.length, anio: anioSolo ? String(anioSolo) : '', esteAnio: lista.filter(x => anio(x.f) === esteAnio).length,
      filas: elegidos.map(x => [fechaTxt(x.f), TIPOS[x.tipo].t, detalleTxt(x) + (x.prov ? '\n' + x.prov : ''), cantTxt(x)]),
      colores: elegidos.map(x => RGB[x.tipo] || RGB.OTRO)
    };
  }

  /* --------------------------------------------------------- inicio */
  // En el Buscador se piden en segundo plano, así la ficha los muestra enseguida
  window.addEventListener('load', () => {
    if (document.getElementById('entregasFicha') && typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript() && SAE_SYNC.hayClave())
      setTimeout(() => cargar(false).catch(() => { /* se reintenta al usarla */ }), 1500);
  });

  return { cargar, de, indexar, grupoDe, GRUPOS, pintarFicha, abrirTodo, paraPdf, fechaTxt, TIPOS, get sinCruzar() { armarIndice(); return sinCruzar.slice(); }, get datos() { return datos; } };
})();
