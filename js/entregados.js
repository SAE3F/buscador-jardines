/**
 * ==========================================================================
 * (2.16.0) ENTREGAS Y ARREGLOS de cada escuela
 * Lo trae el script (acción "entregas", v38): el historial del Tablero ("BUSCADOR ENTREGAS", 2022–2025) y la
 * planilla "Facturación SAE 2026" (arreglos de FACTURACION ITEMS y lo que va a una escuela en FACTURACION
 * UNIDADES). Sin montos ni facturas. Los repetidos (misma escuela, misma fecha, misma causa) ya vienen sacados.
 *  - SAE_ENTREGADO.pintarFicha(contenedor, escuela): tarjeta con los últimos 5, por colores, como los reclamos.
 *  - SAE_ENTREGADO.abrirTodo(escuela): ventana con todo lo hecho en la escuela (filtros por tipo y año, Excel).
 *  - SAE_ENTREGADO.paraPdf(escuela, n): filas para el PDF de la escuela.
 * (2.23.0) "Entregas, obras y arreglos": desplegable propio debajo de la Calculadora (ya no en la ficha).
 *  Suma la planilla "BASE DE DATOS" (pestañas ENTREGAS y OBRAS-INFRAESTRUCTURA, script v43).
 *  Tres grupos: Entregas, Obras y Arreglos. TODAS las instituciones se ven (también las que no son del
 *  SAE): en la escuela abierta las suyas, y en "Todas las instituciones" todo, con filtros y Excel.
 *  - SAE_ENTREGADO.pintarPanel(cuerpo, escuela, subtitulo): contenido del desplegable.
 *  - SAE_ENTREGADO.abrirGeneral(): ventana con todas las instituciones.
 * ==========================================================================
 */
window.SAE_ENTREGADO = (function () {
  const LS = 'sae-entregados-v3';   // (2.23.1) v3: descarta copias guardadas de un script anterior al 43 (sin BASE DE DATOS)
  const FRESCO_MS = 60 * 60 * 1000;          // una hora: después se pide de nuevo (en segundo plano)
  const VIEJO_MS = 7 * 24 * 60 * 60 * 1000;  // sin internet o con el script caído, sirve la copia de hasta 7 días
  const TIPOS = {
    GAS: { t: 'Gas', i: '🔥' }, ELEC: { t: 'Electricidad', i: '⚡' }, PLOM: { t: 'Plomería', i: '🚰' },
    REFRI: { t: 'Refrigeración', i: '❄️' }, EQUIP: { t: 'Equipamiento', i: '🍳' }, UTEN: { t: 'Utensilios', i: '🥣' },
    SERV: { t: 'Servicios', i: '🧹' }, OTRO: { t: 'Otros', i: '📦' },
    // (2.23.0) Planilla "BASE DE DATOS": entregas
    ESCOLAR: { t: 'Material escolar', i: '📚' }, DEPORTE: { t: 'Material deportivo', i: '⚽' }, MOBIL: { t: 'Mobiliario', i: '🪑' },
    ELECTRO: { t: 'Equipos eléctricos', i: '🔌' }, TEXTIL: { t: 'Textiles y banderas', i: '🎌' },
    // (2.23.0) obras
    O_GAS: { t: 'Gas', i: '🔥' }, O_CUB: { t: 'Cubiertas', i: '🏠' }, O_VAL: { t: 'Puesta en valor', i: '🏗️' }, O_MANT: { t: 'Mantenimiento', i: '🔧' },
    O_PINT: { t: 'Pintura', i: '🎨' }, O_ENT: { t: 'Entornos escolares', i: '🌳' }, O_AULA: { t: 'Aulas', i: '🏫' }, O_OTRA: { t: 'Obra', i: '🏗️' }
  };
  const ORDEN_TIPOS = ['GAS', 'ELEC', 'PLOM', 'REFRI', 'SERV', 'EQUIP', 'UTEN', 'ESCOLAR', 'DEPORTE', 'MOBIL', 'ELECTRO', 'TEXTIL', 'OTRO',
    'O_VAL', 'O_CUB', 'O_GAS', 'O_MANT', 'O_PINT', 'O_ENT', 'O_AULA', 'O_OTRA'];
  // (2.16.1) Dos grupos: arreglos (gas, electricidad, plomería, refrigeración, canaletas/atmosférico) y entregas (equipamiento, utensilios)
  // (2.23.0) Tres grupos: Entregas, Obras (OBRAS-INFRAESTRUCTURA) y Arreglos
  const GRUPOS = {
    ENT: { t: 'Entregas', i: '📦', ver: 'Ver todas las entregas', vacio: 'No hay entregas cargadas para esta escuela.', tipos: ['EQUIP', 'UTEN', 'ESCOLAR', 'DEPORTE', 'MOBIL', 'ELECTRO', 'TEXTIL', 'OTRO'] },
    OBR: { t: 'Obras', i: '🏗️', ver: 'Ver todas las obras', vacio: 'No hay obras cargadas para esta escuela.', tipos: ['O_VAL', 'O_CUB', 'O_GAS', 'O_MANT', 'O_PINT', 'O_ENT', 'O_AULA', 'O_OTRA'] },
    ARR: { t: 'Arreglos', i: '🛠️', ver: 'Ver todos los arreglos', vacio: 'No hay arreglos cargados para esta escuela.', tipos: ['GAS', 'ELEC', 'PLOM', 'REFRI', 'SERV'] }
  };
  const ORDEN_GRUPOS = ['ENT', 'OBR', 'ARR'];
  const grupoDe = (tipo) => GRUPOS.ARR.tipos.includes(tipo) ? 'ARR' : /^O_/.test(tipo) ? 'OBR' : 'ENT';
  const LS_GRUPO = 'sae-ea-grupo';
  // Colores del PDF (los mismos de la página)
  const RGB = { GAS: [234, 88, 12], ELEC: [202, 138, 4], PLOM: [37, 99, 235], REFRI: [8, 145, 178], EQUIP: [124, 58, 237],
    UTEN: [22, 163, 74], SERV: [100, 116, 139], OTRO: [100, 116, 139],
    ESCOLAR: [219, 39, 119], DEPORTE: [5, 150, 105], MOBIL: [146, 64, 14], ELECTRO: [8, 145, 178], TEXTIL: [79, 70, 229],
    O_VAL: [30, 64, 175], O_CUB: [120, 53, 15], O_GAS: [234, 88, 12], O_MANT: [71, 85, 105], O_PINT: [190, 24, 93],
    O_ENT: [21, 128, 61], O_AULA: [109, 40, 217], O_OTRA: [30, 64, 175] };

  const escH = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const compactar = (t) => norm(t).replace(/N\s*[°º]\s*/g, '').replace(/[^A-Z0-9]/g, '').replace(/([A-Z])0+(\d)/g, '$1$2');
  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin lugar: se vuelve a pedir */ } };

  let datos = null, porEscuela = null, sinCruzar = [], todos = [], promesa = null;

  /* ------------------------------------------------------------------ datos */
  function usar(d) {
    datos = d; porEscuela = null;
  }
  (function copiaGuardada() {
    try {
      const g = JSON.parse(leerLS(LS) || 'null');
      if (g && g.d && Date.now() - g.t < VIEJO_MS) { usar(g.d); datos._t = g.d.conBase ? g.t : 0; }   // (2.23.1) sin BASE DE DATOS: se muestra pero se vuelve a pedir
    } catch (e) { /* nada */ }
  })();

  /** Trae los datos del script (una hora de copia en el navegador). */
  function cargar(forzar) {
    if (!forzar && datos && datos._t && Date.now() - datos._t < FRESCO_MS) return Promise.resolve(datos);
    if (promesa) return promesa;
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) return Promise.reject(new Error('SIN_URL'));
    promesa = SAE_SYNC.pedir('entregas', forzar ? { forzar: '1' } : {}).then(r => {
      if (!r.e) throw new Error('SCRIPT_VIEJO');   // un script anterior al 38 no conoce "entregas" (devuelve otra cosa)
      const conBase = !!(r.n && r.n.base !== undefined);   // (2.23.1) solo el script 43+ trae BASE DE DATOS
      const d = { e: r.e || {}, n: r.n || {}, errores: r.errores || [], generado: r.generado || '', conBase, _t: Date.now() };
      usar(d);
      if (!conBase) d._t = 0;   // de un script viejo: no se toma como fresca, se vuelve a pedir la próxima vez
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
    porEscuela = r.porEscuela; sinCruzar = r.sinCruzar; todos = r.todos;
  }
  /** Cruza los nombres de la planilla con las escuelas del buscador. */
  function indexar(eDatos) {
    const porEscuela = new Map(), sinCruzar = [], todos = [];   // todos: cada registro con su institución (SAE o no)
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
      const reg = (f, inst, sae) => ({ f: f[0] || '', tipo: TIPOS[f[1]] ? f[1] : 'OTRO', det: f[2] || '', cant: f[3], prov: f[4] || '', inst, sae });
      if (!destinos.length) {
        // (2.23.0) No es una escuela del buscador: igual se muestra en "Todas las instituciones"
        sinCruzar.push(raw);
        const nombre = String(raw).replace(/\s+/g, ' ').trim();
        eDatos[raw].forEach(f => todos.push(reg(f, nombre, false)));
        return;
      }
      destinos.forEach(e => {
        const l = porEscuela.get(e.nombre) || [];
        eDatos[raw].forEach(f => { const x = reg(f, e.nombre, true); l.push(x); todos.push(x); });
        porEscuela.set(e.nombre, l);
      });
    });
    // Más nuevo primero; los "sin fecha" al final. Al juntar nombres distintos de la misma escuela, otra vez sin repetidos.
    porEscuela.forEach((l, k) => {
      const vistos = new Set();
      porEscuela.set(k, l.filter(x => { const c = x.f + '|' + x.tipo + '|' + compactar(x.det); if (vistos.has(c)) return false; vistos.add(c); return true; })
        .sort((a, b) => (b.f || '0').localeCompare(a.f || '0')));
    });
    todos.sort((a, b) => (b.f || '0').localeCompare(a.f || '0') || a.inst.localeCompare(b.inst, 'es', { numeric: true }));
    return { porEscuela, sinCruzar, todos };
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

  /* ------------------------------------- (2.23.0) desplegable de la escuela */
  let pedidoPanel = 0;
  const LS_ANIO = 'sae-ea-anio';
  function itemHTML(x, conInst) {
    const T = TIPOS[x.tipo];
    const obra = grupoDe(x.tipo) === 'OBR';
    return `<li class="ea-item ea-${x.tipo.toLowerCase().replace('_', '-')}"><div class="ea-linea"><span class="ea-fecha">${escH(fechaTxt(x.f))}</span>` +
      `<span class="ea-tipo">${T.i} ${escH(T.t)}</span>${cantTxt(x) ? `<span class="ea-cant">${escH(cantTxt(x))}</span>` : ''}</div>` +
      (conInst ? `<div class="ea-inst${x.sae ? '' : ' otra'}">${escH(x.inst)}${x.sae ? '' : ' <small>(no es del SAE)</small>'}</div>` : '') +
      `<div class="ea-detalle">${escH(detalleTxt(x))}</div>${x.prov && !obra ? `<div class="ea-prov">${escH(x.prov)}</div>` : ''}</li>`;
  }
  /** Contenido del desplegable "Entregas, obras y arreglos" para la escuela abierta. */
  async function pintarPanel(cuerpo, escuela, subtitulo) {
    if (!cuerpo) return;
    const id = ++pedidoPanel;
    const sub = (txt) => { if (subtitulo) subtitulo.textContent = txt; };
    if (typeof SAE_SYNC === 'undefined' || !SAE_SYNC.hayScript()) {
      cuerpo.innerHTML = '<p class="rf-msg">Sin conexión con la hoja de Google: no se pueden ver las entregas, obras y arreglos.</p>'; sub(''); return;
    }
    if (!datos) { cuerpo.innerHTML = '<p class="rf-msg">Cargando entregas, obras y arreglos…</p>'; sub(escuela ? escuela.nombre : ''); }
    else pintarCuerpo(cuerpo, escuela, sub);
    try { await cargar(false); }
    catch (err) {
      if (id !== pedidoPanel) return;
      if (!datos) {
        const m = String(err && err.message || err);
        const txt = m === 'SCRIPT_VIEJO' ? 'Falta actualizar el script de Google (versión 43) para ver las entregas, obras y arreglos.'
          : 'No se pudieron leer las entregas, obras y arreglos. Probá de nuevo en un rato.';
        cuerpo.innerHTML = `<p class="rf-msg">⚠️ ${escH(txt)}</p>`;
      }
      return;
    }
    if (id !== pedidoPanel) return;
    pintarCuerpo(cuerpo, escuela, sub);
  }
  function pintarCuerpo(cuerpo, escuela, sub) {
    armarIndice();
    const general = `<div class="rf-acciones ea-gen"><a href="#" class="rf-link" data-ea="general">🏫 Ver todas las instituciones (${todos.length})</a></div>`;
    const conectar = () => {
      const bg = cuerpo.querySelector('[data-ea="general"]');
      if (bg) bg.addEventListener('click', (ev) => { ev.preventDefault(); abrirGeneral(); });
    };
    if (!escuela) {
      sub('Elegí una escuela para ver lo suyo');
      cuerpo.innerHTML = '<p class="rf-msg">Elegí una escuela arriba para ver sus entregas, obras y arreglos.</p>' + general;
      conectar(); return;
    }
    const lista = de(escuela);
    const esteAnio = String(new Date().getFullYear());
    const nAnio = lista.filter(x => anio(x.f) === esteAnio).length;
    sub(lista.length ? `${escuela.nombre} · ${nAnio} este año · último ${fechaTxt(lista[0].f)}` : `${escuela.nombre} · sin registros`);
    if (!lista.length) {
      cuerpo.innerHTML = '<p class="rf-msg">No hay entregas, obras ni arreglos cargados para esta escuela.</p>' + general;
      conectar(); return;
    }
    const porG = {}; ORDEN_GRUPOS.forEach(k => { porG[k] = lista.filter(x => grupoDe(x.tipo) === k); });
    let g = leerLS(LS_GRUPO);
    if (!GRUPOS[g] || !porG[g].length) g = ORDEN_GRUPOS.find(k => porG[k].length) || 'ENT';
    let anioSel = leerLS(LS_ANIO) || '';
    const pintarG = () => {
      const anios = [...new Set(porG[g].map(x => anio(x.f) || 'Sin fecha'))];
      if (anioSel && !anios.includes(anioSel)) anioSel = '';
      const l = porG[g].filter(x => !anioSel || (anio(x.f) || 'Sin fecha') === anioSel);
      cuerpo.innerHTML =
        `<div class="ea-tabs" role="tablist">${ORDEN_GRUPOS.map(k => `<button type="button" role="tab" class="ea-tab${k === g ? ' activo' : ''}" data-g="${k}" aria-selected="${k === g}">${GRUPOS[k].i} ${GRUPOS[k].t} <small>${porG[k].length}</small></button>`).join('')}</div>` +
        (porG[g].length ? `<div class="ea-fila ea-fila-panel"><select data-ea="anio" aria-label="Año"><option value="">Todos los años</option>${anios.map(a => `<option${a === anioSel ? ' selected' : ''}>${escH(a)}</option>`).join('')}</select></div>` : '') +
        (l.length ? `<ul class="rf-lista ea-lista">${l.slice(0, 6).map(x => itemHTML(x)).join('')}</ul>` : `<p class="rf-msg">${GRUPOS[g].vacio}</p>`) +
        (l.length > 6 ? `<p class="rf-mas">y ${l.length - 6} más</p>` : '') +
        `<div class="rf-acciones">${porG[g].length ? `<a href="#" class="rf-link" data-ea="todo">${GRUPOS[g].ver} de ${escH(escuela.nombre)} (${porG[g].length})</a>` : ''}` +
        `<a href="#" class="rf-link" data-ea="general">🏫 Todas las instituciones</a></div>`;
      cuerpo.querySelectorAll('.ea-tab').forEach(bt => bt.addEventListener('click', () => { g = bt.dataset.g; guardarLS(LS_GRUPO, g); pintarG(); }));
      const sa = cuerpo.querySelector('[data-ea="anio"]');
      if (sa) sa.addEventListener('change', () => { anioSel = sa.value; guardarLS(LS_ANIO, anioSel); pintarG(); });
      const b = cuerpo.querySelector('[data-ea="todo"]');
      if (b) b.addEventListener('click', (ev) => { ev.preventDefault(); abrirTodo(escuela, g); });
      conectar();
    };
    pintarG();
  }
  /** Compatibilidad: la tarjeta vieja de la ficha ya no se usa (2.23.0). */
  function pintarFicha(cont) { if (cont) { cont.innerHTML = ''; cont.style.display = 'none'; } }

  /* --------------------------------------------------- ventanas "Ver todo" */
  /**
   * Ventana con filtros. escuela = objeto del buscador (solo esa escuela) o null (todas las instituciones).
   */
  function abrirVentana(escuela, grupoIni) {
    armarIndice();
    const todas = escuela ? de(escuela) : todos.slice();
    const general = !escuela;
    const filtro = { g: GRUPOS[grupoIni] ? grupoIni : 'ENT', tipo: '', anio: '', q: '', inst: '' };
    const fondo = document.createElement('div');
    fondo.className = 'ea-fondo';
    const tituloTxt = general ? 'Entregas, obras y arreglos · todas las instituciones' : 'Entregas, obras y arreglos de ' + escuela.nombre;
    fondo.setAttribute('role', 'dialog'); fondo.setAttribute('aria-modal', 'true'); fondo.setAttribute('aria-label', tituloTxt);
    const anios = [...new Set(todas.map(x => anio(x.f) || 'Sin fecha'))].sort((a, b) => b.localeCompare(a));
    const nG = (k) => todas.filter(x => grupoDe(x.tipo) === k).length;
    // Instituciones: las del SAE primero (orden del buscador) y después las demás
    const insts = general ? (() => {
      const sae = [...new Set(todas.filter(x => x.sae).map(x => x.inst))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      const otras = [...new Set(todas.filter(x => !x.sae).map(x => x.inst))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      return { sae, otras };
    })() : null;
    fondo.innerHTML = `<div class="ea-caja${general ? ' ea-caja-ancha' : ''}">
      <div class="ea-caja-cab"><div><h3>🛠️ Entregas, obras y arreglos</h3><p>${general ? `Todas las instituciones · ${todas.length} registros${insts.otras.length ? ` · ${insts.otras.length} instituciones que no son del SAE` : ''}` : `${escH(escuela.nombre)} · ${todas.length} en total`}</p></div>
        <button type="button" class="ea-cerrar" data-a="cerrar" aria-label="Cerrar">✕</button></div>
      <div class="ea-filtros">
        <div class="ea-tabs" role="tablist">${ORDEN_GRUPOS.map(k => `<button type="button" role="tab" class="ea-tab" data-g="${k}">${GRUPOS[k].i} ${GRUPOS[k].t} <small>${nG(k)}</small></button>`).join('')}</div>
        <div class="ea-chips" data-a="chips"></div>
        <div class="ea-fila">
          ${general ? `<select data-a="inst" aria-label="Institución"><option value="">Todas las instituciones</option><option value="__sae">Solo escuelas del SAE</option><option value="__otras">Solo las que no son del SAE</option>
            <optgroup label="Escuelas del SAE">${insts.sae.map(n => `<option value="${escH(n)}">${escH(n)}</option>`).join('')}</optgroup>
            ${insts.otras.length ? `<optgroup label="Otras instituciones">${insts.otras.map(n => `<option value="${escH(n)}">${escH(n)}</option>`).join('')}</optgroup>` : ''}</select>` : ''}
          <select data-a="anio" aria-label="Año"><option value="">Todos los años</option>${anios.map(a => `<option>${escH(a)}</option>`).join('')}</select>
          <input type="search" data-a="q" placeholder="${general ? 'Buscar (ej. ventilador, EP 12)' : 'Buscar (ej. termotanque)'}" aria-label="Buscar">
          ${typeof SAE_EXCEL !== 'undefined' ? '<button type="button" class="ea-excel" data-a="excel">⬇️ Excel</button>' : ''}</div>
        <p class="ea-cuenta" data-a="cuenta"></p>
      </div>
      <div class="ea-cuerpo" data-a="cuerpo"></div>
    </div>`;
    const q = (s) => fondo.querySelector(s);
    const pasaInst = (x) => !filtro.inst || (filtro.inst === '__sae' ? x.sae : filtro.inst === '__otras' ? !x.sae : x.inst === filtro.inst);
    const lista = () => todas.filter(x => grupoDe(x.tipo) === filtro.g && pasaInst(x));
    const pintarChips = () => {
      const l = lista();
      const tipos = ORDEN_TIPOS.filter(t => l.some(x => x.tipo === t));
      fondo.querySelectorAll('.ea-tab').forEach(b => { b.classList.toggle('activo', b.dataset.g === filtro.g); b.setAttribute('aria-selected', b.dataset.g === filtro.g); });
      if (filtro.tipo && !tipos.includes(filtro.tipo)) filtro.tipo = '';
      q('[data-a="chips"]').innerHTML = tipos.length > 1 ? `<button type="button" class="ea-chip${filtro.tipo ? '' : ' activo'}" data-t="">Todos <small>${l.length}</small></button>${tipos.map(t =>
        `<button type="button" class="ea-chip ea-${t.toLowerCase().replace('_', '-')}${filtro.tipo === t ? ' activo' : ''}" data-t="${t}">${TIPOS[t].i} ${TIPOS[t].t} <small>${l.filter(x => x.tipo === t).length}</small></button>`).join('')}` : '';
    };
    const filtradas = () => lista().filter(x => (!filtro.tipo || x.tipo === filtro.tipo) && (!filtro.anio || (anio(x.f) || 'Sin fecha') === filtro.anio) &&
      (!filtro.q || norm(detalleTxt(x) + ' ' + x.prov + ' ' + TIPOS[x.tipo].t + ' ' + (general ? x.inst : '')).includes(norm(filtro.q))));
    const pintar = () => {
      const l = filtradas();
      const unidades = l.reduce((s, x) => s + (Number(x.cant) > 0 ? Number(x.cant) : 0), 0);
      q('[data-a="cuenta"]').textContent = l.length ? `${l.length} registro${l.length === 1 ? '' : 's'}${general ? ` · ${new Set(l.map(x => x.inst)).size} instituciones` : ''}${unidades ? ` · ${unidades.toLocaleString('es-AR')} unidades` : ''}` : '';
      if (!l.length) { q('[data-a="cuerpo"]').innerHTML = `<p class="rf-msg">${lista().length ? 'Nada con esos filtros.' : general ? 'No hay registros con esos filtros.' : GRUPOS[filtro.g].vacio}</p>`; return; }
      const grupos = [];
      const mostrar = l.slice(0, 400);
      mostrar.forEach(x => { const a = anio(x.f) || 'Sin fecha'; if (!grupos.length || grupos[grupos.length - 1].a !== a) grupos.push({ a, l: [] }); grupos[grupos.length - 1].l.push(x); });
      q('[data-a="cuerpo"]').innerHTML = grupos.map(gr => `<h4 class="ea-anio">${escH(gr.a)} <small>${gr.l.length}</small></h4><ul class="rf-lista ea-lista">${gr.l.map(x => itemHTML(x, general)).join('')}</ul>`).join('') +
        (l.length > mostrar.length ? `<p class="rf-mas">Se muestran los primeros ${mostrar.length} de ${l.length}. Usá los filtros o bajá el Excel para ver todo.</p>` : '');
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
    if (q('[data-a="inst"]')) q('[data-a="inst"]').addEventListener('change', (ev) => { filtro.inst = ev.target.value; pintarChips(); pintar(); });
    let t; q('[data-a="q"]').addEventListener('input', (ev) => { clearTimeout(t); t = setTimeout(() => { filtro.q = ev.target.value; pintar(); }, 150); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(fondo);
    document.documentElement.classList.add('ea-abierto');
    pintarChips();
    pintar();
    q('[data-a="cerrar"]').focus();
  }
  function abrirTodo(escuela, grupoIni) { abrirVentana(escuela, grupoIni); }
  /** (2.23.0) Todas las instituciones (también las que no son del SAE). */
  async function abrirGeneral(grupoIni) {
    if (!datos) { try { await cargar(false); } catch (e) { /* se muestra lo que haya */ } }
    abrirVentana(null, grupoIni || leerLS(LS_GRUPO) || 'ENT');
  }

  function exportar(escuela, filas, grupoTxt) {
    if (typeof SAE_EXCEL === 'undefined' || !filas.length) return;
    const hoy = new Date(), pad = (n) => String(n).padStart(2, '0');
    const quien = escuela ? escuela.nombre : 'Todas_las_instituciones';
    const cols = (escuela ? [] : [{ t: 'Institución', ancho: 26 }, { t: 'Del SAE', ancho: 9 }])
      .concat([{ t: 'Fecha', ancho: 11 }, { t: 'Tipo', ancho: 18 }, { t: 'Detalle', tipo: 'largo', ancho: 60 }, { t: 'Cantidad', tipo: 'num' }, { t: grupoTxt === 'Obras' ? 'Tipo de obra (planilla)' : 'Proveedor', ancho: 26 }]);
    SAE_EXCEL.descargar(`${grupoTxt || 'Entregas_obras_y_arreglos'}_${quien.replace(/[^\w\-]+/g, '_')}_${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`, [{
      nombre: grupoTxt || 'Entregas, obras y arreglos', titulo: `${grupoTxt || 'Entregas, obras y arreglos'} · ${escuela ? escuela.nombre : 'Todas las instituciones'}`, subtitulo: [SAE_EXCEL.generadoEl()],
      columnas: cols,
      filas: filas.map(x => (escuela ? [] : [x.inst, x.sae ? 'Sí' : 'No']).concat([fechaTxt(x.f), TIPOS[x.tipo].t, detalleTxt(x), Number(x.cant) > 0 ? Number(x.cant) : '', x.prov])),
      notas: ['Historial del Tablero (2022–2025), planilla "Facturación SAE 2026" y planilla "BASE DE DATOS" (ENTREGAS y OBRAS-INFRAESTRUCTURA). Sin montos ni números de factura.']
    }]).catch(() => { /* nada */ });
  }

  /* ------------------------------------------------------------------ PDF */
  /** { ok, filas: [[fecha, tipo, detalle, cantidad]], colores: [[r,g,b]], total, esteAnio } o { ok:false, msg } */
  async function paraPdf(escuela, n, grupo, anioSolo) {
    try { await cargar(false); } catch (err) { if (!datos) return { ok: false, msg: 'No se pudieron leer las entregas, obras y arreglos (revisá la conexión o el script de Google, versión 43).' }; }
    const lista = de(escuela).filter(x => !grupo || grupoDe(x.tipo) === grupo);
    // (2.17.0) "Todos los de este año": todos los del año pedido, sin tope
    const elegidos = anioSolo ? lista.filter(x => anio(x.f) === String(anioSolo)) : n === 'todos' ? lista : lista.slice(0, Number(n) || 5);
    const esteAnio = String(new Date().getFullYear());
    return {
      ok: true, total: lista.length, anio: anioSolo ? String(anioSolo) : '', esteAnio: lista.filter(x => anio(x.f) === esteAnio).length,
      filas: elegidos.map(x => [fechaTxt(x.f), TIPOS[x.tipo].t, detalleTxt(x) + (x.prov && grupoDe(x.tipo) !== 'OBR' ? '\n' + x.prov : ''), cantTxt(x)]),
      colores: elegidos.map(x => RGB[x.tipo] || RGB.OTRO)
    };
  }

  /* --------------------------------------------------------- inicio */
  // (2.23.0) Achicar el desplegable (se recuerda en esta compu) y, sin escuela elegida, igual se ofrece "Todas las instituciones"
  function iniciarPanel() {
    const card = document.getElementById('eaCard'), btn = document.getElementById('btnPlegarEA'), cuerpo = document.getElementById('eaCuerpo');
    if (!card || !btn) return;
    const pintar = (pl) => {
      card.classList.toggle('ea-plegada', pl);
      btn.textContent = pl ? '▾' : '▴';
      btn.setAttribute('aria-expanded', String(!pl));
      btn.title = pl ? 'Mostrar' : 'Achicar';
    };
    pintar(leerLS('sae-ea-plegada') === '1');
    btn.addEventListener('click', () => { const pl = !card.classList.contains('ea-plegada'); guardarLS('sae-ea-plegada', pl ? '1' : '0'); pintar(pl); });
    if (cuerpo && !cuerpo.innerHTML.trim()) setTimeout(() => { if (!cuerpo.innerHTML.trim()) pintarPanel(cuerpo, null, document.getElementById('eaSubtitulo')); }, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarPanel); else iniciarPanel();

  // En el Buscador se piden en segundo plano, así la ficha los muestra enseguida
  window.addEventListener('load', () => {
    if ((document.getElementById('eaCuerpo') || document.getElementById('entregasFicha')) && typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript() && SAE_SYNC.hayClave())
      setTimeout(() => cargar(false).catch(() => { /* se reintenta al usarla */ }), 1500);
  });

  return { cargar, de, indexar, grupoDe, GRUPOS, pintarFicha, pintarPanel, abrirTodo, abrirGeneral, paraPdf, fechaTxt, TIPOS, get sinCruzar() { armarIndice(); return sinCruzar.slice(); }, get todos() { armarIndice(); return todos.slice(); }, get datos() { return datos; } };
})();
