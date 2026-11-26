// Ficha Escuelas · interfaz
(function () {
  var $ = U.$, $$ = U.$$, esc = U.esc, n = U.n, T = U.TIPOS;
  var TIPOS = ['E', 'O', 'A'];
  var anioActual = new Date().getFullYear();

  var S = {
    vista: 'buscador', inst: null,
    ficha: fichaNueva('E'),
    lista: { col: 'ultimo', dir: -1 },
    g: gNuevo('reg', 25),
    r: rNuevo(),
    cal: { q: '', inst: '', anio: '' }
  };
  function gNuevo(medida, calorN) {
    return { tipos: new Set(TIPOS), anios: new Set(), cat: '', nivel: '', gestion: '', localidad: '', prov: '', medida: medida || 'reg', rank: 'mas', calorN: calorN || 25,
      q: '', periodo: '', desde: '', hasta: '', sinFecha: true, meses: new Set(), servicio: '', fuente: '', insts: new Set() };
  }
  function rNuevo() {
    return { q: '', tipo: '', anio: '', cat: '', prov: '', fuente: '', col: 'orden', dir: -1, pag: 0,
      periodo: '', desde: '', hasta: '', sinFecha: true, mes: '', inst: '', nivel: '', gestion: '', localidad: '', cantMin: '', agrupar: true };
  }
  function fichaNueva(tab) {
    return { tab: tab || 'E', anio: '', mes: '', cat: '', prov: '', q: '', periodo: '', desde: '', hasta: '', orden: 'nuevo', sinFecha: true, escala: 'anio', anioMes: '' };
  }
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var IDX = { porInst: new Map(), provs: new Map() };   // índices que se arman cuando llegan los datos

  // ── fechas: los registros con solo año ("sin fecha exacta") entran por año si sinFecha está marcado
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function rangoPeriodo(p, desde, hasta) {
    var h = new Date(), y = h.getFullYear();
    if (p === 'mes') return [iso(new Date(y, h.getMonth(), 1)), iso(h)];
    if (p === '3m') return [iso(new Date(y, h.getMonth() - 3, h.getDate())), iso(h)];
    if (p === 'anio') return [y + '-01-01', y + '-12-31'];
    if (p === 'pasado') return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
    if (p === 'pers' && (desde || hasta)) return [desde || '0000-01-01', hasta || '9999-12-31'];
    return null;
  }
  function enRango(r, rg, sinFecha) {
    if (!rg) return true;
    if (r.fecha) return r.fecha >= rg[0] && r.fecha <= rg[1];
    return !!(sinFecha && r.anio && String(r.anio) >= rg[0].slice(0, 4) && String(r.anio) <= rg[1].slice(0, 4));
  }
  var POR_PAGINA = 100;

  // ───────────────────────── helpers
  function valores(arr, fn) { var s = new Set(); arr.forEach(function (x) { var v = fn(x); if (v != null && v !== '') s.add(v); }); return Array.from(s); }
  function ordenEs(a, b) { return String(a).localeCompare(String(b), 'es', { numeric: true }); }

  /* ---- v0.8.0: celular ---- */
  var MQ_CEL = window.matchMedia ? matchMedia('(max-width: 640px)') : { matches: false };
  function esCel() { return MQ_CEL.matches; }
  var POR_TANDA_CEL = 50;
  var PLEG_ABIERTOS = new Set();
  var REC_ABIERTOS = new Set();           // reclamos abiertos en el celular (no se cierran al repintar)          // qué cajas de filtros están abiertas en el celular (sobrevive a los repintados)
  function cuentaPleg(id, k) {
    var c = document.getElementById(id + 'Cuenta'); if (!c) return;
    c.textContent = k ? String(k) : '';
    var b = document.querySelector('[data-plegar="' + id + '"]'); if (b) b.classList.toggle('con-filtros', !!k);
  }
  function aplicarPleg(id) {
    var caja = document.getElementById(id), b = document.querySelector('[data-plegar="' + id + '"]'); if (!caja || !b) return;
    var ab = PLEG_ABIERTOS.has(id); caja.classList.toggle('abierto', ab); b.classList.toggle('abierto', ab); b.setAttribute('aria-expanded', String(ab));
  }
  /** "Ver 50 más": devuelve cuántos mostrar; si cambiaron los filtros vuelve a 50 */
  function tandaCel(obj, firma) {
    if (obj._firma !== firma) { obj._firma = firma; obj._ver = POR_TANDA_CEL; }
    return obj._ver;
  }
  function botonVerMas(mostrados, total) {
    return total > mostrados ? '<div class="ver-mas"><span class="chico muted">Mostrando ' + n(mostrados) + ' de ' + n(total) + '</span>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-ver-mas>Ver ' + n(Math.min(POR_TANDA_CEL, total - mostrados)) + ' más</button></div>' : '';
  }

  /* ---- v0.5.5: proveedor con rubro + campo tipeable ---- */
  var RUBROS = { regs: null, mapa: null };
  function rubrosDe(prov) {          // "Gas, Plomería" — de más a menos registros, de todos sus registros
    if (RUBROS.regs !== Datos.regs) {
      var m = new Map();
      Datos.regs.forEach(function (r) { if (!r.prov) return; var c = m.get(r.prov); if (!c) m.set(r.prov, c = new Map()); c.set(r.cat, (c.get(r.cat) || 0) + 1); });
      RUBROS = { regs: Datos.regs, mapa: m };
    }
    var c = RUBROS.mapa.get(prov); if (!c) return '';
    var l = Array.from(c.entries()).filter(function (e) { return e[0] && !/^sin /i.test(e[0]); })
      .sort(function (a, b) { return b[1] - a[1] || ordenEs(a[0], b[0]); }).map(function (e) { return e[0]; });
    return l.length > 3 ? l.slice(0, 3).join(', ') + ' +' + (l.length - 3) : l.join(', ');
  }
  function opcionesProv(sel, lista, actual) {
    U.opciones(sel, lista.sort(U.ordenTexto).map(function (p) { var r = rubrosDe(p); return [p, r ? p + ' — ' + r : p]; }), 'Todos', actual);
    combo(sel);
  }
  /** Convierte un <select> en un campo que se puede tipear y que igual despliega la lista. El select (oculto) sigue siendo el valor real. */
  function combo(sel) {
    if (!sel || sel.dataset.combo) return;
    sel.dataset.combo = '1';
    var caja = document.createElement('div'); caja.className = 'combo';
    sel.parentNode.insertBefore(caja, sel); caja.appendChild(sel);
    sel.classList.add('combo-oculto'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'combo-input'; inp.id = sel.id + 'Texto';
    inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-expanded', 'false'); inp.setAttribute('aria-autocomplete', 'list');
    var lab = document.querySelector('label[for="' + sel.id + '"]'); if (lab) lab.htmlFor = inp.id;
    var flecha = document.createElement('button'); flecha.type = 'button'; flecha.className = 'combo-flecha'; flecha.tabIndex = -1; flecha.setAttribute('aria-label', 'Ver opciones'); flecha.textContent = '▾';
    var x = document.createElement('button'); x.type = 'button'; x.className = 'combo-x'; x.setAttribute('aria-label', 'Quitar (Todos)'); x.textContent = '✕';
    var lista = document.createElement('ul'); lista.className = 'combo-lista'; lista.setAttribute('role', 'listbox'); lista.id = sel.id + 'Lista'; lista.hidden = true;
    inp.setAttribute('aria-controls', lista.id);
    caja.append(inp, x, flecha, lista);
    var items = [], activo = -1;
    function textoSel() { var o = sel.options[sel.selectedIndex]; return o && o.value ? o.value : ''; }   // en el campo va solo el nombre; el rubro se ve en la lista
    function sync() {
      if (document.activeElement !== inp) inp.value = textoSel();
      inp.placeholder = sel.options[0] ? sel.options[0].textContent : '';
      inp.disabled = sel.disabled; x.hidden = !sel.value || sel.disabled; caja.classList.remove('combo-error');
    }
    function pintar() {
      lista.innerHTML = items.length ? items.map(function (o, k) {
        var t = o.textContent, i = t.indexOf(' — ');
        var html = i > 0 ? '<b>' + esc(t.slice(0, i)) + '</b><span class="combo-rubro">' + esc(t.slice(i + 3)) + '</span>' : '<b>' + esc(t) + '</b>';
        return '<li role="option" id="' + sel.id + 'Op' + k + '" data-k="' + k + '" aria-selected="' + (o.value === sel.value) + '" class="' + (k === activo ? 'activo' : '') + '">' + html + '</li>';
      }).join('') : '<li class="combo-nada">Ningún proveedor coincide</li>';
      inp.setAttribute('aria-activedescendant', activo >= 0 ? sel.id + 'Op' + activo : '');
      var a = lista.querySelector('.activo'); if (a) a.scrollIntoView({ block: 'nearest' });
    }
    function abrir(filtrar) {
      if (sel.disabled) return;
      var q = filtrar ? U.norm(inp.value) : '', partes = q ? q.split(' ') : [];
      items = Array.from(sel.options).filter(function (o) { var t = U.norm(o.textContent); return partes.every(function (p) { return t.indexOf(p) >= 0; }); });
      activo = filtrar && q ? (items.length ? 0 : -1) : items.findIndex(function (o) { return o.value === sel.value; });
      pintar(); lista.hidden = false; caja.classList.add('abierto'); inp.setAttribute('aria-expanded', 'true');
    }
    function cerrar() { lista.hidden = true; caja.classList.remove('abierto'); inp.setAttribute('aria-expanded', 'false'); }
    function elegir(v) {
      cerrar();
      if (sel.value !== v) { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      inp.value = textoSel(); x.hidden = !sel.value; caja.classList.remove('combo-error');
    }
    function confirmar() {          // al salir del campo: vacío = Todos; si coincide uno, se elige; si no, avisa y vuelve atrás
      var q = U.norm(inp.value);
      if (!q) { elegir(''); return; }
      if (q === U.norm(textoSel())) { inp.value = textoSel(); return; }
      var exacto = Array.from(sel.options).filter(function (o) { return o.value && (U.norm(o.value) === q || U.norm(o.textContent) === q); });
      var parecidos = Array.from(sel.options).filter(function (o) { return o.value && q.split(' ').every(function (p) { return U.norm(o.textContent).indexOf(p) >= 0; }); });
      var o = exacto[0] || (parecidos.length === 1 ? parecidos[0] : null);
      if (o) { elegir(o.value); return; }
      inp.value = textoSel(); caja.classList.add('combo-error');
      U.toast(parecidos.length ? '⚠️ Hay varios proveedores que coinciden: elegí uno de la lista' : '⚠️ Ningún proveedor coincide con eso: no se filtró');
      setTimeout(function () { caja.classList.remove('combo-error'); }, 2500);
    }
    inp.addEventListener('focus', function () { inp.select(); abrir(false); });
    inp.addEventListener('click', function () { if (lista.hidden) abrir(false); });
    inp.addEventListener('input', function () { abrir(true); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (lista.hidden) { abrir(false); return; }
        if (!items.length) return;
        activo = (activo + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; pintar();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!lista.hidden && activo >= 0 && items[activo]) elegir(items[activo].value); else { cerrar(); confirmar(); }
      } else if (e.key === 'Escape') {
        if (!lista.hidden) { e.preventDefault(); e.stopPropagation(); cerrar(); inp.value = textoSel(); }
      } else if (e.key === 'Tab') { cerrar(); }
    });
    inp.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement === inp) return; cerrar(); confirmar(); }, 120); });
    lista.addEventListener('mousedown', function (e) { e.preventDefault(); });
    lista.addEventListener('click', function (e) { var li = e.target.closest('li[data-k]'); if (li) { elegir(items[+li.dataset.k].value); inp.blur(); } });
    flecha.addEventListener('mousedown', function (e) { e.preventDefault(); });
    flecha.addEventListener('click', function () { if (lista.hidden) { inp.focus(); abrir(false); } else cerrar(); });
    x.addEventListener('click', function () { elegir(''); });
    sel.addEventListener('change', sync);
    new MutationObserver(function () { Promise.resolve().then(sync); }).observe(sel, { childList: true, attributes: true, attributeFilter: ['disabled'] });
    document.addEventListener('mousedown', function fuera(e) { if (!caja.isConnected) { document.removeEventListener('mousedown', fuera); return; } if (!caja.contains(e.target) && !lista.hidden) cerrar(); });
    sync();
    sel._comboSync = sync;
  }
  function fechaReg(r) { return r.fecha ? U.fecha(r.fecha) : (r.anio || 's/f'); }
  function medida(r) { return S.g.medida === 'uni' ? (r.cant || 0) : 1; }
  function linkInst(id, texto) { return '<a data-inst="' + esc(id) + '">' + esc(texto || id) + '</a>'; }
  function botonIr(ref, texto) {
    if (!ref || !Datos.hojas[ref[0]]) return '';
    var t = 'Abrir ' + U.nombreHoja(ref[0]) + (ref[1] ? ' en la celda ' + U.celdaTexto(ref) : '');
    return '<button type="button" class="btn-ir' + (texto ? ' con-texto' : '') + '" data-ref="' + esc(ref.join('|')) + '" title="' + esc(t) + '" aria-label="' + esc(t) + '">↗' + (texto ? ' ' + esc(texto) : '') + '</button>';
  }
  function hayMontos() { return Datos.meta && Datos.meta.montos; }
  function etiquetaTipo(t) { return '<span class="tipo-cel tipo-' + t + '"><i class="marca-tipo"></i>' + T[t].uno + '</span>'; }
  function paraExcel(r) {
    var f = [T[r.t].uno, r.fecha ? U.fechaLarga(r.fecha) : '', r.anio || '', r.inst, r.I.nombre !== r.inst ? r.I.nombre : '', r.I.nivel || '', r.I.localidad || '',
      r.cat, r.det, r.cant, r.prov, r.serv, r.estado, r.fuente, U.celdaTexto(r.ref)];
    if (hayMontos()) f.push(r.monto == null ? '' : r.monto, r.fact || '');
    return f;
  }
  function colsExcel() {
    var c = [{ t: 'Tipo', ancho: 10 }, { t: 'Fecha', ancho: 11 }, { t: 'Año', ancho: 7 }, { t: 'Institución', ancho: 16 }, { t: 'Nombre en la base', ancho: 18 },
      { t: 'Nivel', ancho: 16 }, { t: 'Localidad', ancho: 16 }, { t: 'Categoría / rubro', ancho: 20 }, { t: 'Detalle', ancho: 55 }, { t: 'Cantidad', ancho: 9 },
      { t: 'Proveedor', ancho: 26 }, { t: 'Servicio / OC', ancho: 26 }, { t: 'Estado', ancho: 11 }, { t: 'Planilla', ancho: 22 }, { t: 'Celda', ancho: 9 }];
    if (hayMontos()) c.push({ t: 'Monto', ancho: 14 }, { t: 'N° factura', ancho: 12 });
    return c;
  }
  function hoy() { return new Date().toLocaleDateString('es-AR'); }
  function filtrosTexto() {
    var g = S.g, p = [];
    p.push(TIPOS.filter(function (t) { return g.tipos.has(t); }).map(function (t) { return T[t].nombre; }).join(', '));
    p.push(g.anios.size ? 'Años ' + Array.from(g.anios).sort().join(', ') : 'Todos los años');
    if (g.cat) p.push(g.cat); if (g.nivel) p.push(g.nivel); if (g.gestion) p.push(g.gestion); if (g.localidad) p.push(g.localidad); if (g.prov) p.push(g.prov);
    return p.join(' · ');
  }

  // ───────────────────────── navegación
  function irA(vista, push) {
    S.vista = vista;
    if (vista !== 'buscador') ocultarBarraFicha();
    $$('#nav button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.vista === vista)); });
    $$('main > section').forEach(function (s) { s.classList.toggle('oculto', s.dataset.vista !== vista); });
    guardarUrl(push);
    pintar();
  }
  function guardarUrl(push) {
    var p = new URLSearchParams(location.search);
    p.set('vista', S.vista); p.delete('f'); p.delete('app');
    if (S.vista === 'buscador' && S.inst) p.set('inst', S.inst); else p.delete('inst');
    var u = location.pathname + '?' + p.toString();
    try { (push ? history.pushState : history.replaceState).call(history, null, '', u); } catch (e) {}
  }
  function leerUrl() {
    var p = new URLSearchParams(location.search);
    var v = p.get('vista'); if (['buscador', 'general', 'registros', 'calidad'].indexOf(v) >= 0) S.vista = v;
    S.inst = p.get('inst') || null;
    if (p.get('app') === '1') { S.vista = 'buscador'; S.inst = null; }   // la app instalada (celular o compu) siempre abre en el Buscador
  }
  window.addEventListener('popstate', function () { leerUrl(); irA(S.vista, false); });

  function abrirFicha(id) {
    S.inst = id; S.ficha = fichaNueva('E');
    var i = Datos.inst.get(id); if (i && !i.E) S.ficha.tab = i.A ? 'A' : i.O ? 'O' : 'E';
    var cosa = $('#bCosa') && $('#bCosa').value.trim();
    if (cosa && i) {                 // vino de "Buscar por cosa": el detalle abre filtrado y en la pestaña donde más aparece
      var cu = { E: 0, O: 0, A: 0 }; (IDX.porInst.get(id) || []).forEach(function (r) { if (pasaCosa(r, cosa)) cu[r.t]++; });
      var mejor = ['E', 'A', 'O'].sort(function (a, b) { return cu[b] - cu[a]; })[0];
      if (cu[mejor]) { S.ficha.q = cosa; S.ficha.tab = mejor; }
    }
    $('#q').value = ''; cerrarSug();
    irA('buscador', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pintar() {
    if (!Datos.listo) { esqueleto(); return; }
    $('#cuentaRegistros').textContent = n(Datos.regs.length);
    var nAv = Datos.avisos.length + institucionesFuera().length;   // los nombres ya unificados no cuentan
    $('#cuentaAvisos').textContent = nAv ? n(nAv) : '';
    if (S.vista === 'buscador') { pintarFicha(); pintarLista(); }
    if (S.vista === 'general') pintarGeneral();
    if (S.vista === 'registros') pintarRegistros();
    if (S.vista === 'calidad') pintarCalidad();
    $('#pie').innerHTML = 'Ficha Escuelas · Tres de Febrero · Entregas, obras y arreglos · versión ' + esc(CONFIG.VERSION_PAGINA) +
      (Datos.meta ? ' · script ' + esc(Datos.meta.version) : '') + ' · <a href="estado.html">🩺 Estado del sistema</a>';
  }
  function esqueleto() {
    $('#tablaInst').innerHTML = '<div style="padding:1rem">' + [1, 2, 3, 4, 5, 6].map(function () { return '<div class="esqueleto" style="height:34px;margin-bottom:8px"></div>'; }).join('') + '</div>';
  }

  // ───────────────────────── BUSCADOR
  var sugIdx = -1, sugLista = [];
  var CAMPOS_B = ['bCosa', 'bNivel', 'bGestion', 'bLocalidad', 'bSolo', 'bOrden', 'bInactiva', 'bDesde', 'bHasta', 'bTieneModo', 'bTieneCat', 'bProv', 'bSinFecha'];
  var CLAVE_FILTROS = 'sae-entregas-filtros-buscador';
  function leerFiltrosB() {
    var f = {};
    CAMPOS_B.forEach(function (k) { var el = $('#' + k); f[k] = el.type === 'checkbox' ? el.checked : el.value; });
    return f;
  }
  function guardarFiltrosB() { try { localStorage.setItem(CLAVE_FILTROS, JSON.stringify(leerFiltrosB())); } catch (e) {} }
  function restaurarFiltrosB() {
    var f = null; try { f = JSON.parse(localStorage.getItem(CLAVE_FILTROS) || 'null'); } catch (e) {}
    if (!f) return;
    CAMPOS_B.forEach(function (k) {
      var el = $('#' + k); if (!el || f[k] == null) return;
      if (el.type === 'checkbox') el.checked = !!f[k];
      else if (el.tagName !== 'SELECT' || Array.prototype.some.call(el.options, function (o) { return o.value === String(f[k]); })) el.value = f[k];
      else el.dataset.pendiente = f[k];        // la opción todavía no existe (llega con los datos)
    });
  }
  function limpiarFiltrosB() {
    CAMPOS_B.forEach(function (k) { var el = $('#' + k); if (el.type === 'checkbox') el.checked = true; else el.value = ''; delete el.dataset.pendiente; });
    $('#bSolo').value = 'mov'; $('#bOrden').value = 'ultimo|-1'; $('#bTieneModo').value = 'tiene';
    S.lista = { col: 'ultimo', dir: -1 };
    guardarFiltrosB(); pintarLista();
  }
  function finDeMes(ym) { var p = ym.split('-'); return iso(new Date(+p[0], +p[1], 0)); }
  function filtroInstBuscador(i, f) {
    if (f.bNivel && i.nivel !== f.bNivel) return false;
    if (f.bGestion && i.gestion !== f.bGestion) return false;
    if (f.bLocalidad && i.localidad !== f.bLocalidad) return false;
    var tot = i.E + i.O + i.A;
    if (f.bSolo === 'mov' && !tot) return false;
    if (f.bSolo === 'sin' && tot) return false;
    if (f.bInactiva) {
      var h = new Date(), corte = iso(new Date(h.getFullYear(), h.getMonth() - Number(f.bInactiva), h.getDate()));
      var ult = i.ultimo ? i.ultimo.replace(/-00-00$/, '-12-31') : '';
      if (ult && ult >= corte) return false;
    }
    var regs = IDX.porInst.get(i.id) || [];
    if (f.bDesde || f.bHasta) {
      var rg = [f.bDesde ? f.bDesde + '-01' : '0000-01-01', f.bHasta ? finDeMes(f.bHasta) : '9999-12-31'];
      if (!regs.some(function (r) { return enRango(r, rg, f.bSinFecha); })) return false;
    }
    if (f.bTieneCat) {
      var tiene = regs.some(function (r) { return r.cat === f.bTieneCat; });
      if ((f.bTieneModo === 'nunca') === tiene) return false;
    }
    if (f.bProv && !regs.some(function (r) { return r.prov === f.bProv; })) return false;
    return true;
  }
  function buscarInst(q) {
    var t = U.norm(q); if (!t) return [];
    var partes = t.split(' ');
    var res = [];
    Datos.inst.forEach(function (i) {
      if (!partes.every(function (p) { return i.busca.indexOf(p) >= 0; })) return;
      var idn = U.norm(i.id), pts = idn === t ? 0 : idn.indexOf(t) === 0 ? 1 : i.busca.indexOf(t) === 0 ? 2 : 3;
      res.push({ i: i, pts: pts });
    });
    res.sort(function (a, b) { return a.pts - b.pts || (b.i.E + b.i.O + b.i.A) - (a.i.E + a.i.O + a.i.A) || ordenEs(a.i.id, b.i.id); });
    return res.slice(0, 12).map(function (x) { return x.i; });
  }
  function pintarSug() {
    var q = $('#q').value;
    sugLista = buscarInst(q); sugIdx = sugLista.length ? 0 : -1;
    var box = $('#sugerencias');
    if (!q.trim()) { cerrarSug(); return; }
    box.innerHTML = sugLista.length ? sugLista.map(function (i, k) {
      return '<div class="sug" role="option" data-id="' + esc(i.id) + '" aria-selected="' + (k === sugIdx) + '"><div><div class="nom">' + esc(i.id) + '</div>' +
        '<div class="det">' + esc([i.completo, i.direccion, i.nivel, i.localidad].filter(Boolean).join(' · ') || (i.enBase ? '' : 'No está en ESTABLECIMIENTOS')) + '</div></div>' +
        '<div class="cuentas"><span title="Entregas">📦 ' + i.E + '</span><span title="Obras">🏗️ ' + i.O + '</span><span title="Arreglos">🛠️ ' + i.A + '</span></div></div>';
    }).join('') : '<div class="vacio">No encontré instituciones con “' + esc(q) + '”</div>';
    box.classList.remove('oculto'); $('#q').setAttribute('aria-expanded', 'true');
    $$('.sug', box).forEach(function (el) { el.addEventListener('mousedown', function (e) { e.preventDefault(); abrirFicha(el.dataset.id); }); });
  }
  function cerrarSug() { $('#sugerencias').classList.add('oculto'); $('#q').setAttribute('aria-expanded', 'false'); }
  function moverSug(d) {
    if (!sugLista.length) return;
    sugIdx = (sugIdx + d + sugLista.length) % sugLista.length;
    $$('#sugerencias .sug').forEach(function (el, k) { el.setAttribute('aria-selected', String(k === sugIdx)); if (k === sugIdx) el.scrollIntoView({ block: 'nearest' }); });
  }

  /** "Buscar por cosa": busca en categoría, detalle y servicio (no en proveedor ni institución) */
  function pasaCosa(r, cosa) {
    var partes = U.norm(cosa).split(' ').filter(Boolean); if (!partes.length) return true;
    var t = r.bc || (r.bc = U.norm([r.cat, r.det, r.serv].join(' ')));
    return partes.every(function (p) { return t.indexOf(p) >= 0; });
  }
  function pintarLista() {
    var q = U.norm($('#q').value), f = leerFiltrosB(), cosa = (f.bCosa || '').trim();
    var arr = Array.from(Datos.inst.values()).filter(function (i) { return filtroInstBuscador(i, f) && (!q || q.split(' ').every(function (p) { return i.busca.indexOf(p) >= 0; })); });
    arr.forEach(function (i) { i.total = i.E + i.O + i.A; });
    if (cosa) {
      var rgC = (f.bDesde || f.bHasta) ? [f.bDesde ? f.bDesde + '-01' : '0000-01-01', f.bHasta ? finDeMes(f.bHasta) : '9999-12-31'] : null;
      arr = arr.filter(function (i) {
        var m = (IDX.porInst.get(i.id) || []).filter(function (r) { return pasaCosa(r, cosa) && (!rgC || enRango(r, rgC, f.bSinFecha)); });
        i.cN = m.length; i.cU = m.reduce(function (s, r) { return s + (r.t === 'E' ? r.cant : 0); }, 0);
        i.cUlt = m.reduce(function (mx, r) { return r.orden > mx ? r.orden : mx; }, '');
        i.cUltTxt = m.length ? fechaReg(m.reduce(function (a, b) { return b.orden > a.orden ? b : a; })) : '';
        return m.length > 0;
      });
      if (!/^c/.test(S.lista.col)) S.lista = { col: 'cUlt', dir: -1 };
    } else if (/^c/.test(S.lista.col)) S.lista = { col: 'ultimo', dir: -1 };
    var col = S.lista.col, dir = S.lista.dir;
    arr.sort(function (a, b) {
      var va = a[col], vb = b[col];
      if (typeof va === 'number') return (va - vb) * dir || ordenEs(a.id, b.id);
      if (!va !== !vb) return va ? -1 : 1;           // sin fecha / vacío: siempre al final
      return ordenEs(va || '', vb || '') * dir || ordenEs(a.id, b.id);
    });
    $$('#bOrden option.solo-cosa').forEach(function (o) { o.hidden = !cosa; o.disabled = !cosa; });
    var sel = col + '|' + dir; $('#bOrden').value = Array.prototype.some.call($('#bOrden').options, function (o) { return o.value === sel; }) ? sel : '';
    var nMas = ['bInactiva', 'bDesde', 'bHasta', 'bTieneCat', 'bProv'].filter(function (k) { return f[k]; }).length;
    $('#bMasCuenta').textContent = nMas ? nMas + ' activo' + (nMas > 1 ? 's' : '') : '';
    cuentaPleg('bPleg', nMas + ['bNivel', 'bGestion', 'bLocalidad'].filter(function (k) { return f[k]; }).length + (f.bSolo && f.bSolo !== 'mov' ? 1 : 0));
    $('#listaInstSub').textContent = cosa ? n(arr.length) + ' instituciones con “' + cosa + '” · tocá una para ver el detalle' : n(arr.length) + ' instituciones · tocá una para ver su ficha';
    var cols = cosa ? [['id', 'Institución'], ['nivel', 'Nivel'], ['localidad', 'Localidad'], ['cN', 'Veces', 1], ['cU', 'Unidades', 1], ['cUlt', 'Última vez']]
      : [['id', 'Institución'], ['nivel', 'Nivel'], ['localidad', 'Localidad'], ['E', 'Entregas', 1], ['uE', 'Unidades', 1], ['O', 'Obras', 1], ['A', 'Arreglos', 1], ['ultimo', 'Último']];
    var vis = arr.slice(0, 400);
    $('#tablaInst').innerHTML = arr.length ? '<table><thead><tr>' + cols.map(function (c) {
      return '<th class="ord' + (c[2] ? ' num' : '') + (/^(nivel|localidad)$/.test(c[0]) ? ' solo-pc' : '') + '" data-col="' + c[0] + '">' + c[1] + (col === c[0] ? ' <span class="flecha">' + (dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + vis.map(function (i) {
      if (cosa) return '<tr class="fila-inst" data-abrir="' + esc(i.id) + '"><td class="inst c-i">' + linkInst(i.id) + '</td><td class="solo-pc">' + esc(i.nivel) + '</td><td class="solo-pc">' + esc(i.localidad) + '</td><td class="num c-cN"><b>' + n(i.cN) + '</b></td><td class="num c-cU">' + (i.cU ? n(i.cU) : '—') +
        '</td><td class="fecha c-cUlt">' + esc(i.cUltTxt || '—') + '</td></tr>';
      return '<tr class="fila-inst" data-abrir="' + esc(i.id) + '"><td class="inst c-i">' + linkInst(i.id) + (i.enBase ? '' : ' <span title="No está en ESTABLECIMIENTOS">⚠️</span>') + '</td><td class="solo-pc">' + esc(i.nivel) + '</td><td class="solo-pc">' + esc(i.localidad) +
        '</td><td class="num c-E">' + n(i.E) + '</td><td class="num c-uE">' + n(i.uE) + '</td><td class="num c-O">' + n(i.O) + '</td><td class="num c-A">' + n(i.A) +
        '</td><td class="fecha c-ult">' + (i.ultimo ? (i.ultimo.slice(5) === '00-00' ? i.ultimo.slice(0, 4) : U.fecha(i.ultimo)) : '—') + '</td></tr>';
    }).join('') + '</tbody></table>' + (arr.length > vis.length ? '<div class="vacio chico">Mostrando 400 de ' + n(arr.length) + '. Usá el buscador o los filtros para achicar la lista.</div>' : '')
      : '<div class="vacio"><span class="grande">🔍</span>' + (cosa ? 'Ninguna institución tuvo “' + esc(cosa) + '” con esos filtros' : 'No hay instituciones con esos filtros') + '</div>';
    $$('#tablaInst th.ord').forEach(function (th) {
      th.addEventListener('click', function () {
        var c = th.dataset.col; if (S.lista.col === c) S.lista.dir *= -1; else { S.lista.col = c; S.lista.dir = /^(E|O|A|uE|total|ultimo|cN|cU|cUlt)$/.test(c) ? -1 : 1; }
        pintarLista();
      });
    });
    pintarLista.ultima = arr;
  }

  function pintarFicha() {
    var cont = $('#ficha');
    var i = S.inst && Datos.inst.get(S.inst);
    $('#listaInst').classList.toggle('oculto', !!i);
    if (!i) {
      ocultarBarraFicha();
      cont.innerHTML = S.inst ? '<div class="aviso naranja" style="margin-bottom:1rem">No encontré la institución “' + esc(S.inst) + '”. Buscala de nuevo arriba.</div>' : '';
      return;
    }
    var regs = Datos.regs.filter(function (r) { return r.inst === i.id; });
    var por = { E: [], O: [], A: [] }; regs.forEach(function (r) { por[r.t].push(r); });
    var u = por.E.reduce(function (s, r) { return s + r.cant; }, 0);
    var ult = regs[0];
    var esteAnio = regs.filter(function (r) { return r.anio === anioActual; }).length;

    var cargoTxt = i.cargo ? ' (' + i.cargo.charAt(0).toUpperCase() + i.cargo.slice(1).toLowerCase() + ')' : '';
    var direcTxt = i.directora ? i.directora + cargoTxt : '';
    var etiq = [
      ['📍 Dirección', i.direccion, true],
      ['👤 Directora', direcTxt, true],
      ['🎓 Nivel', i.nivel],
      ['🏛️ Gestión', i.gestion],
      ['🗺️ Localidad', i.localidad],
      ['🔢 CUE', i.cue],
      ['👥 Matrícula / cupo SAE', i.matricula ? n(i.matricula) : ''],
      ['🍽️ Servicio SAE', i.servicio]
    ].filter(function (e) { return e[1]; }).map(function (e) {
      return '<span class="etiqueta' + (e[2] ? ' destacada' : ' secundaria') + '">' + e[0] + ': <b>' + esc(e[1]) + '</b></span>';
    }).join('') + '<button type="button" class="btn btn-secondary btn-sm solo-cel-flex" id="fMasDatos" aria-expanded="' + !!S.masDatos + '">' + (S.masDatos ? '➖ Menos datos' : '➕ Más datos') + '</button>';
    var alias = (i.alias || []).length ? '<div class="chico muted" style="margin-top:.65rem">También aparece escrita como: ' + i.alias.map(esc).join(' · ') + '</div>' : '';

    var html = '<article class="card sec"><div class="card-body"><div class="ficha-cab"><div class="ficha-info">' +
      '<h2>🏫 ' + esc(i.id) + '</h2><div class="completo">' + esc(i.completo || (i.enBase ? '' : 'No está en la hoja ESTABLECIMIENTOS')) + '</div>' +
      '<div class="etiquetas">' + etiq + '</div>' + alias + '</div>' +
      '<div class="ficha-acciones no-print"><button class="btn btn-primary btn-sm" id="fVisita">📄 Ficha para visita</button>' +
      '<a class="btn btn-secondary btn-sm" href="' + esc(urlComoLlegar(i)) + '" target="_blank" rel="noopener" title="Ruta en Google Maps desde la Municipalidad (Alberdi 4840, Caseros)">🧭 Cómo llegar</a>' +
      '<a class="btn btn-secondary btn-sm solo-pc" href="' + esc(urlMapa(i)) + '" target="_blank" rel="noopener" title="Abrir el mapa de SAE Gestión en esta escuela">🗺️ Ver en el mapa</a>' +
      menuPlanillas(i, regs) + '<button class="btn btn-secondary btn-sm" id="fLink">🔗 Copiar link</button><button class="btn btn-secondary btn-sm solo-pc" id="fExcel">⬇️ Excel</button>' +
      '<button class="btn btn-secondary btn-sm" id="fCerrar" title="Volver a la lista">✕</button></div></div></div></article>';

    html += '<div class="kpis kpis-ficha">' +
      kpi('E', '📦 Entregas', n(por.E.length), n(u) + ' unidades') +
      kpi('O', '🏗️ Obras', n(por.O.length), resumenCats(por.O)) +
      kpi('A', '🛠️ Arreglos', n(por.A.length), resumenCats(por.A)) +
      '<div class="kpi kpi-ult"><div class="et">🕒 <span class="solo-pc">Último movimiento</span><span class="solo-cel">Último</span></div><div class="val" style="font-size:1.25rem">' + (ult ? fechaReg(ult) : '—') + '</div><div class="sub">' +
      (ult ? esc(T[ult.t].uno + ' · ' + ult.cat) : 'Sin registros') + '</div></div>' +
      '<div class="kpi kpi-anio"><div class="et">📅 En ' + anioActual + '</div><div class="val">' + n(esteAnio) + '</div><div class="sub">registros este año</div></div></div>';

    html += '<article class="card" id="fReclamos"><div class="card-header"><div><h2>📣 Últimos reclamos</h2><p class="card-subtitle" id="fRecSub">Cargando…</p></div>' +
      '<div class="fila"><span class="chico muted">Mostrar últimos</span><div class="pestanas chicas" id="fRecN" role="tablist">' + [5, 10, 20].map(function (k) {
        return '<button role="tab" data-n="' + k + '" aria-selected="' + (recN() === k) + '">' + k + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="card-body"><div id="fRecLista"><div class="esqueleto" style="height:60px"></div></div></div></article>';

    html += '<div class="grilla g2 solo-pc"><article class="card"><div class="card-header"><div><h2>📈 Línea de tiempo</h2><p class="card-subtitle" id="fAnualSub"></p></div>' +
      '<div class="fila"><select id="fAnioMes" aria-label="Año a ver por mes" class="' + (S.ficha.escala === 'mes' ? '' : 'oculto') + '"></select>' +
      '<div class="pestanas chicas" id="fEscala" role="tablist"><button role="tab" data-e="anio" aria-selected="' + (S.ficha.escala === 'anio') + '">Por año</button>' +
      '<button role="tab" data-e="mes" aria-selected="' + (S.ficha.escala === 'mes') + '">Por mes</button></div></div></div>' +
      '<div class="card-body"><div class="graf" id="fAnual"></div></div></article>' +
      '<article class="card"><div class="card-header"><div><h2>🗂️ Qué recibió</h2><p class="card-subtitle">Por categoría o rubro (registros)</p></div></div><div class="card-body"><div id="fCats"></div></div></article></div>';

    html += '<article class="card"><div class="card-header"><div><h2>📋 Detalle</h2><p class="card-subtitle" id="fSub"></p></div>' +
      '<div class="pestanas chicas" id="fTabs" role="tablist">' + TIPOS.map(function (t) {
        return '<button role="tab" data-t="' + t + '" aria-selected="' + (S.ficha.tab === t) + '">' + T[t].icono + ' ' + T[t].nombre + ' <span class="cuenta">' + por[t].length + '</span></button>';
      }).join('') + '</div></div><div class="card-body"><div class="filtros filtros-f-q">' +
      '<div class="campo ancho"><label for="fQ">Buscar en el detalle</label><input type="search" id="fQ" placeholder="ej. ventilador, termotanque" value="' + esc(S.ficha.q) + '"></div></div>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-filtros" data-plegar="fPleg" aria-expanded="false" aria-controls="fPleg">⚙️ Filtros <span class="cuenta" id="fPlegCuenta"></span><span class="flecha-pleg">▾</span></button>' +
      '<div class="plegable" id="fPleg"><div class="filtros" style="margin-bottom:.8rem">' +
      '<div class="campo"><label for="fPeriodo">Período</label><select id="fPeriodo">' + [['', 'Todo'], ['mes', 'Este mes'], ['3m', 'Últimos 3 meses'], ['anio', 'Este año'], ['pasado', 'Año pasado'], ['pers', 'Elegir fechas…']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.ficha.periodo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo' + (S.ficha.periodo === 'pers' ? '' : ' oculto') + '" id="fFechas"><label>Desde / hasta</label><div class="fila" style="gap:.3rem;flex-wrap:nowrap">' +
      '<input type="date" id="fDesde" value="' + esc(S.ficha.desde) + '" aria-label="Desde"><input type="date" id="fHasta" value="' + esc(S.ficha.hasta) + '" aria-label="Hasta"></div></div>' +
      '<div class="campo"><label for="fAnio">Año</label><select id="fAnio"></select></div>' +
      '<div class="campo"><label for="fMes">Mes</label><select id="fMes"></select></div>' +
      '<div class="campo"><label for="fCat">Categoría / rubro</label><select id="fCat"></select></div>' +
      '<div class="campo"><label for="fProv">Proveedor</label><select id="fProv"></select></div>' +
      '<div class="campo"><label for="fOrden">Ordenar</label><select id="fOrden">' + [['nuevo', 'Más nuevo primero'], ['viejo', 'Más viejo primero'], ['cant', 'Mayor cantidad']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.ficha.orden === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="fila" style="margin:-.2rem 0 .8rem;justify-content:space-between"><label class="check"><input type="checkbox" id="fSinFecha"' + (S.ficha.sinFecha ? ' checked' : '') +
      '> Incluir registros sin fecha exacta (solo año)</label><button type="button" class="btn btn-secondary btn-sm" id="fLimpiar">✖ Limpiar filtros</button></div></div>' +
      '<div class="tabla-caja alto-max" id="fTabla"></div></div></article>';
    cont.innerHTML = html;

    pintarLineaTiempo(i, regs, por);
    // Qué recibió
    var cats = new Map();
    regs.forEach(function (r) { var k = r.t + '|' + r.cat; var c = cats.get(k) || { t: r.t, cat: r.cat, reg: 0, cant: 0, ult: 0 }; c.reg++; c.cant += r.cant; c.ult = Math.max(c.ult, r.anio || 0); cats.set(k, c); });
    var citems = U.sinAlFinal(Array.from(cats.values()).sort(function (a, b) { return b.reg - a.reg; }), function (c) { return c.cat; }).map(function (c) {
      return { lab: U.icono(c.cat) + ' ' + esc(c.cat), titulo: T[c.t].uno + ' · ' + c.cat, total: c.reg, partes: [{ t: c.t, v: c.reg }],
        sub: (c.t === 'E' ? n(c.cant) + ' unidades · ' : '') + 'último: ' + (c.ult || 's/f'),
        onClick: function () { S.ficha.tab = c.t; S.ficha.cat = c.cat; pintarFicha(); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
    });
    G.barrasH($('#fCats'), citems, { vacio: 'Esta institución todavía no tiene registros' });

    $('#fLink').onclick = function () {
      var u = location.origin + location.pathname + '?vista=buscador&inst=' + encodeURIComponent(i.id);
      copiarTexto(u, '🔗 Link de ' + i.id + ' copiado');
    };
    $('#fCerrar').onclick = function () { S.inst = null; guardarUrl(true); pintar(); };
    $('#fExcel').onclick = function () { excelEscuela(i, regs, opcionesVisita(), false); };
    $('#fVisita').onclick = function () { abrirVisita(i, regs); };
    var mdC = $('#fMasDatos').closest('.etiquetas'); mdC.classList.toggle('ver-todo', !!S.masDatos);
    $('#fMasDatos').onclick = function () { S.masDatos = !S.masDatos; mdC.classList.toggle('ver-todo', S.masDatos); this.setAttribute('aria-expanded', String(S.masDatos)); this.textContent = S.masDatos ? '➖ Menos datos' : '➕ Más datos'; };
    aplicarPleg('fPleg');
    barraFicha(i, regs);
    $('#fRecN').onclick = function (ev) { var b = ev.target.closest('[data-n]'); if (!b) return; try { localStorage.setItem('sae-reclamos-n', b.dataset.n); } catch (e) {}
      $$('#fRecN button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); pintarReclamos(i); };
    pintarReclamos(i);
    $$('#fTabs button').forEach(function (b) { b.onclick = function () { S.ficha.tab = b.dataset.t; S.ficha.cat = ''; $$('#fTabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); pintarTablaFicha(regs); }; });
    $('#fQ').oninput = U.debounce(function () { S.ficha.q = $('#fQ').value; pintarTablaFicha(regs); }, 150);
    [['#fAnio', 'anio'], ['#fMes', 'mes'], ['#fCat', 'cat'], ['#fProv', 'prov'], ['#fOrden', 'orden'], ['#fDesde', 'desde'], ['#fHasta', 'hasta']].forEach(function (x) {
      $(x[0]).onchange = function () { S.ficha[x[1]] = this.value; pintarTablaFicha(regs); };
    });
    $('#fPeriodo').onchange = function () { S.ficha.periodo = this.value; $('#fFechas').classList.toggle('oculto', this.value !== 'pers'); pintarTablaFicha(regs); };
    $('#fSinFecha').onchange = function () { S.ficha.sinFecha = this.checked; pintarTablaFicha(regs); };
    $('#fLimpiar').onclick = function () { var t = S.ficha.tab, e = S.ficha.escala, am = S.ficha.anioMes; S.ficha = fichaNueva(t); S.ficha.escala = e; S.ficha.anioMes = am; pintarFicha(); };
    $('#fEscala').onclick = function (ev) { var b = ev.target.closest('[data-e]'); if (!b) return; S.ficha.escala = b.dataset.e; pintarFicha(); };
    $('#fAnioMes').onchange = function () { S.ficha.anioMes = this.value; pintarLineaTiempo(i, regs, por); };
    pintarTablaFicha(regs);
  }
  // ───────────────────────── Cómo llegar / mapa
  var MUNI = 'Municipalidad de Tres de Febrero, Alberdi 4840, Caseros';
  function destinoMaps(i) {
    if (i.lat && i.lng) return i.lat + ',' + i.lng;
    return [i.direccion || i.completo || i.id, i.localidad, 'Tres de Febrero, Buenos Aires'].filter(Boolean).join(', ');
  }
  function urlComoLlegar(i) {
    return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(MUNI) + '&destination=' + encodeURIComponent(destinoMaps(i));
  }
  function urlMapa(i) { return 'https://sae-gestion3f.vercel.app/mapa/index.html?escuela=' + encodeURIComponent(i.nombreMapa || i.id); }

  // ───────────────────────── Reclamos (solo lectura)
  function recN() { var v = 5; try { v = Number(localStorage.getItem('sae-reclamos-n')) || 5; } catch (e) {} return [5, 10, 20].indexOf(v) >= 0 ? v : 5; }
  function claseEstado(e) { e = U.norm(e); return /resuel/.test(e) ? 'ok' : /gestion|proceso|curso/.test(e) ? 'gestion' : /pend/.test(e) ? 'pend' : 'otro'; }
  function haceDias(iso) { return iso ? Math.max(0, Math.round((Date.now() - Date.parse(iso + 'T12:00:00')) / 86400000)) : null; }
  function resumenReclamos(R) {
    if (!R.total) return 'Esta institución no tiene reclamos cargados';
    var d = haceDias(R.abiertoMasViejo);
    return n(R.total) + ' reclamo' + (R.total === 1 ? '' : 's') + ' en total · ' + (R.abiertos ? n(R.abiertos) + ' sin resolver' + (d != null ? ' (el más viejo, hace ' + n(d) + ' días)' : '') : 'todos resueltos');
  }
  // ── Reclamo ↔ arreglo (v0.7.0): rubro del reclamo por palabras clave → registros de esa escuela de ese rubro en los 60 días siguientes
  var RUBROS_RECLAMO = [
    ['Gas', /\bgas\b|cocina|anafe|horno|calefon|termotanque|estufa|garrafa|quemador/],
    ['Electricidad', /electric|\bluz\b|luces|enchufe|toma ?corriente|tablero|\bcable|lampara|ilumin|disyuntor|termica|cortocircuito|tubo/],
    ['Plomería', /plomer|\bagua\b|canilla|caneria|perdida|desag|\bbano|inodoro|mochila|tanque|bomba|pileta|griferia|sifon/],
    ['Refrigeración', /refriger|helader|freezer|frezzer|congel|camara de frio|\bfrio\b|exhibidora/],
    ['Canaletas', /canalet|lluvia|filtra|gotera|\btecho|bajada pluvial/],
    ['Atmosférico', /atmosf|\bpozo|cloaca|camara septica|desagote|desborde/],
    ['Utensilios', /utensilio|\bolla|cuchar|\bplato|\bvaso|cubierto|jarra|bandeja|sarten|cacerola|colador/],
    ['Equipamiento', /equipamiento|multiproces|licuadora|microondas|batidora|\bpava\b|procesadora|balanza/]
  ];
  function relacionadosReclamo(r, instId) {
    if (!r.fecha || !instId) return [];
    var txt = U.norm([r.tipo, r.cat, r.sub, r.det, r.prod, r.prob].join(' '));
    var rub = RUBROS_RECLAMO.filter(function (x) { return x[1].test(txt); }).map(function (x) { return x[0]; });
    if (!rub.length) return [];
    var desde = r.fecha, d = new Date(r.fecha + 'T12:00:00'); d.setDate(d.getDate() + 60);
    var hasta = iso(d); if (r.fres && r.fres > hasta) hasta = r.fres;
    var por = new Map();
    (IDX.porInst.get(instId) || []).forEach(function (x) {
      if (!x.fecha || /-00/.test(x.fecha) || x.fecha < desde || x.fecha > hasta || rub.indexOf(x.cat) < 0 || x.t === 'O') return;
      var k = x.fecha + '|' + x.t + '|' + x.cat, g = por.get(k);
      if (!g) por.set(k, g = { fecha: x.fecha, t: x.t, cat: x.cat, items: [] });
      g.items.push(x);
    });
    return Array.from(por.values()).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).slice(0, 2);
  }
  function htmlRelacionados(r, instId) {
    var rel = relacionadosReclamo(r, instId); if (!rel.length) return '';
    return '<div class="rec-rel">' + rel.map(function (g) {
      var dias = diasEntre(r.fecha, g.fecha), det = g.items.slice(0, 2).map(function (x) { return x.det; }).join(' · ') + (g.items.length > 2 ? ' …' : '');
      return '<div>🔗 <span class="muted">Posible ' + (g.t === 'E' ? 'entrega relacionada' : 'arreglo relacionado') + ':</span> <b>' + U.fecha(g.fecha) + '</b>' +
        ' <span class="muted">(' + (dias === 0 ? 'el mismo día' : dias + ' día' + (dias === 1 ? '' : 's') + ' después') + ')</span> · ' + U.icono(g.cat) + ' ' + esc(g.cat) + ' · ' + esc(det) +
        (g.items.length > 1 ? ' <span class="muted">(' + g.items.length + ' ' + (g.t === 'E' ? 'ítems' : 'trabajos') + ')</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function htmlReclamo(r, instId) {
    var dias = r.fecha && r.fres ? diasEntre(r.fecha, r.fres) : null;
    var tema = [r.tipo, r.cat, r.sub].filter(Boolean).join(' › ');
    var clave = (instId || '') + '|' + (r.ref ? r.ref[1] : r.fecha + r.det);
    return '<div class="reclamo est-' + claseEstado(r.estado) + (REC_ABIERTOS.has(clave) ? ' abierto' : '') + '" data-rec="' + esc(clave) + '"><div class="rec-cab"><span class="estado-pill">' + esc(r.estado) + '</span>' +
      '<b class="num">' + (r.fecha ? U.fecha(r.fecha) : 's/f') + '</b><span>' + esc(tema) + '</span>' +
      '<span class="muted chico">' + esc([r.serv, r.prov].filter(Boolean).join(' · ')) + '</span><span class="espacio"></span>' + botonIr(r.ref) + '</div>' +
      '<div class="rec-det">' + esc(r.det) + (r.prod ? ' <span class="muted">(' + esc(r.prod) + ')</span>' : '') + '</div>' +
      ((r.fres || r.resp || r.acc) ? '<div class="rec-res chico muted">' + [r.fres ? '✅ Resuelto el ' + U.fechaLarga(r.fres) + (dias != null && dias >= 0 ? ' (en ' + n(dias) + ' días)' : '') : '',
        r.resp ? 'Responsable: ' + esc(r.resp) : '', r.acc ? esc(r.acc) : ''].filter(Boolean).join(' · ') + '</div>' : '') + (typeof instId === 'string' ? htmlRelacionados(r, instId) : '') + '</div>';
  }
  function pintarReclamos(i) {
    var lista = $('#fRecLista'), sub = $('#fRecSub'); if (!lista) return;
    Datos.reclamos(i.id).then(function (R) {
      if (S.inst !== i.id || !$('#fRecLista')) return;
      var k = recN(), items = R.items.slice(0, k);
      sub.textContent = resumenReclamos(R) + (R.copia ? ' · 📴 copia guardada ' + Datos.cuando(new Date(R.copia).toISOString()) : '');
      lista.innerHTML = items.length ? '<div class="lista-reclamos">' + items.map(function (r) { return htmlReclamo(r, i.id); }).join('') + '</div>' +
        (R.total > items.length ? '<div class="chico muted" style="margin-top:.6rem">Se muestran los últimos ' + items.length + ' de ' + n(R.total) + '.' +
          (R.total > 20 && k === 20 ? ' Los anteriores están en la hoja Reclamos (↗).' : '') + '</div>' : '')
        : '<div class="vacio"><span class="grande">✅</span>Sin reclamos cargados para esta institución</div>';
    }).catch(function (err) {
      if (S.inst !== i.id) return;
      sub.textContent = 'No se pudieron cargar';
      lista.innerHTML = '<div class="aviso naranja">No se pudieron leer los reclamos (' + esc(err.message) + '). Si recién se actualizó la página, falta publicar el Apps Script 1.2.0.</div>';
    });
  }

  // ───────────────────────── Ficha para visita (imprimir / PDF / Excel)
  var CLAVE_VISITA = 'sae-ficha-visita';
  var SECCIONES = [['datos', '🏫 Datos de la escuela'], ['resumen', '📊 Resumen'],
    ['E', '📦 Entregas'], ['O', '🏗️ Obras'], ['A', '🛠️ Arreglos'], ['reclamos', '📣 Últimos reclamos']];   // los reclamos van al final de la hoja
  var COLS_V = [['fecha', 'Fecha'], ['cat', 'Categoría / rubro'], ['det', 'Detalle'], ['cant', 'Cantidad'], ['prov', 'Proveedor'], ['fuente', 'Planilla']];
  var COLS_R = [['estado', 'Estado'], ['fecha', 'Fecha'], ['tema', 'Tipo y categoría'], ['det', 'Detalle'], ['res', 'Resolución'], ['resp', 'Responsable'], ['acc', 'Acciones']];
  function opcionesVisita() {
    var o = { sec: {}, cols: {}, recCols: {}, periodo: 'todo', desde: '', hasta: '', lim: { E: 'todos', O: 'todos', A: 'todos' }, resumir: true, recN: recN(), agrupar: true };
    SECCIONES.forEach(function (x) { o.sec[x[0]] = true; });
    COLS_V.forEach(function (x) { o.cols[x[0]] = x[0] !== 'fuente'; });
    COLS_R.forEach(function (x) { o.recCols[x[0]] = x[0] !== 'resp' && x[0] !== 'acc'; });
    try {
      var g = JSON.parse(localStorage.getItem(CLAVE_VISITA) || 'null');
      if (g) {
        ['sec', 'cols', 'recCols', 'lim'].forEach(function (k) { Object.assign(o[k], g[k] || {}); });
        ['periodo', 'desde', 'hasta', 'recN', 'agrupar', 'resumir'].forEach(function (k) { if (g[k] != null) o[k] = g[k]; });
        if (!g.lim && g.formato === 'resumida') o.lim = { E: 10, O: 10, A: 10 };   // venía del formato "Resumida" (0.8.0 y antes)
      }
    } catch (e) {}
    return o;
  }
  function fichaPasa(r) {          // los mismos filtros que la ficha (sin la pestaña)
    var F = S.ficha, rg = rangoPeriodo(F.periodo, F.desde, F.hasta), q = U.norm(F.q);
    if (F.anio && String(r.anio) !== F.anio) return false;
    if (F.mes && !pasaMes(r, F.mes, F.sinFecha)) return false;
    if (!enRango(r, rg, F.sinFecha)) return false;
    if (F.cat && r.cat !== F.cat) return false;
    if (F.prov && r.prov !== F.prov) return false;
    return !q || r.busca.indexOf(q) >= 0;
  }
  var MESES_VISITA = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 };
  function rangoVisita(o) {
    var h = new Date();
    if (MESES_VISITA[o.periodo]) return [iso(new Date(h.getFullYear(), h.getMonth() - MESES_VISITA[o.periodo], h.getDate())), iso(h)];
    if (o.periodo === 'pers') { var a = o.desde || '0000-01-01', b = o.hasta || '9999-12-31'; return a <= b ? [a, b] : [b, a]; }
    return null;
  }
  function textoPeriodoVisita(o) {
    if (o.periodo === 'pers') {
      var rg = rangoVisita(o), f = function (x) { return /^0000|^9999/.test(x) ? '…' : U.fecha(x); };
      return 'Del ' + f(rg[0]) + ' al ' + f(rg[1]);
    }
    return { todo: 'Todo el historial', '1m': 'Último mes', '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '12m': 'Último año', ficha: 'Filtrado en la ficha' }[o.periodo] || '';
  }
  function regsVisita(regs, o) {
    if (o.periodo === 'ficha') return regs.filter(fichaPasa);
    var rg = rangoVisita(o);
    return rg ? regs.filter(function (r) { return enRango(r, rg, true); }) : regs.slice();
  }
  /** Lo anterior al año actual, en un renglón por categoría: "Utensilios · 2023–2025: Cuchillos (94), Compotera (20)…" */
  function resumirViejos(rs, t) {
    var por = new Map();
    rs.forEach(function (r) {
      var g = por.get(r.cat);
      if (!g) por.set(r.cat, g = { cat: r.cat, a0: 9999, a1: 0, items: new Map(), cant: 0, n: 0, prov: new Map() });
      var a = Number(r.anio) || 0; if (a) { g.a0 = Math.min(g.a0, a); g.a1 = Math.max(g.a1, a); }
      var et = String(r.det || '(sin detalle)').replace(/:\s*$/, '').trim(), k = U.norm(et), it = g.items.get(k);
      if (!it) g.items.set(k, it = { et: et, c: 0 });
      it.c += t === 'E' ? (r.cant || 0) : 1;
      g.cant += r.cant || 0; g.n++;
      if (r.prov) g.prov.set(r.prov, (g.prov.get(r.prov) || 0) + 1);
    });
    return Array.from(por.values()).sort(function (a, b) { return b.a1 - a.a1 || U.ordenTexto(a.cat, b.cat); }).map(function (g) {
      var its = Array.from(g.items.values()).sort(function (a, b) { return b.c - a.c || ordenEs(a.et, b.et); });
      var txt = its.slice(0, 40).map(function (x) { return t === 'E' ? x.et + ' (' + n(x.c) + ')' : x.et + (x.c > 1 ? ' (×' + x.c + ')' : ''); }).join(', ') + (its.length > 40 ? ' y ' + n(its.length - 40) + ' más' : '');
      var pv = Array.from(g.prov.entries()).sort(function (a, b) { return b[1] - a[1]; }).map(function (e) { return e[0]; });
      return { anios: !g.a1 ? 's/f' : g.a0 === g.a1 ? String(g.a1) : g.a0 + '–' + g.a1, cat: g.cat, det: txt, cant: n(g.cant) + (t !== 'E' ? ' · ' + n(g.n) + ' trab.' : ''),
        prov: pv.slice(0, 2).join(', ') + (pv.length > 2 ? ' y ' + (pv.length - 2) + ' más' : '') };
    });
  }
  function listaTipo(regs, t, o) {   // (regs puede venir ya filtrado por tipo)
    var l = regs.filter(function (r) { return r.t === t; });
    if (t !== 'O' && o.agrupar) l = agruparArreglos(l);
    return l.sort(function (a, b) { return a.orden < b.orden ? 1 : a.orden > b.orden ? -1 : 0; });
  }
  function abrirVisita(i, regs) {
    var o = opcionesVisita(), m = $('#visita');
    function caja(nombre, lista, sel) { return lista.map(function (x) { return '<label class="check"><input type="checkbox" data-g="' + nombre + '" data-k="' + x[0] + '"' + (sel[x[0]] ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join(''); }
    function radio(nombre, lista, v) { return lista.map(function (x) { return '<label class="check"><input type="radio" name="v_' + nombre + '" value="' + x[0] + '"' + (String(v) === String(x[0]) ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join(''); }
    m.innerHTML = '<div class="modal card"><div class="card-header"><div><h2 id="visitaTitulo">📄 Ficha para visita · ' + esc(i.id) + '</h2><p class="card-subtitle">Elegí qué información llevar. Se recuerda para la próxima vez.</p></div>' +
      '<button class="btn btn-secondary btn-sm" data-cerrar aria-label="Cerrar">✕</button></div><div class="card-body modal-cuerpo">' +
      '<fieldset><legend>Apartados</legend><div class="opciones">' + caja('sec', SECCIONES, o.sec) + '</div></fieldset>' +
      '<fieldset><legend>Período</legend><div class="opciones">' + radio('periodo', [['todo', 'Todo'], ['1m', 'Último mes'], ['3m', '3 meses'], ['6m', '6 meses'], ['12m', '1 año'], ['pers', 'Elegir fechas'], ['ficha', 'Lo que tengo filtrado en la ficha']], o.periodo) + '</div>' +
      '<div class="opciones v-fechas" id="vFechas"' + (o.periodo === 'pers' ? '' : ' hidden') + '><label class="campo">Desde<input type="date" id="vDesde" value="' + esc(o.desde) + '"></label>' +
      '<label class="campo">Hasta<input type="date" id="vHasta" value="' + esc(o.hasta) + '"></label><span class="chico muted">Podés dejar una vacía (desde el principio / hasta hoy).</span></div></fieldset>' +
      '<fieldset><legend>Cuántos mostrar (los más recientes)</legend>' + TIPOS.map(function (t) {
        return '<div class="opciones v-lim"><span class="v-lim-et">' + T[t].icono + ' ' + T[t].nombre + '</span>' + radio('lim' + t, [[5, '5'], [10, '10'], [20, '20'], ['todos', 'Todos']], o.lim[t]) + '</div>';
      }).join('') + '<p class="chico muted" style="margin:.3rem 0 .4rem">Con “Agrupar” activado, en arreglos y facturación cada <b>día</b> cuenta como 1 (con todos sus trabajos adentro).</p>' +
      '<label class="check"><input type="checkbox" data-g="x" data-k="resumir"' + (o.resumir ? ' checked' : '') + '> Resumir lo anterior a ' + new Date().getFullYear() + ' en un renglón por categoría (ej. “Utensilios · 2023–2025: Cuchillos (94), Compotera (20)…”)</label></fieldset>' +
      '<fieldset><legend>Columnas de entregas, obras y arreglos</legend><div class="opciones">' + caja('cols', COLS_V, o.cols) +
      '<label class="check"><input type="checkbox" data-g="x" data-k="agrupar"' + (o.agrupar ? ' checked' : '') + '> Agrupar los trabajos de un mismo arreglo</label></div></fieldset>' +
      '<fieldset><legend>Reclamos</legend><div class="opciones">' + radio('recN', [[5, 'Últimos 5'], [10, 'Últimos 10'], [20, 'Últimos 20']], o.recN) + '</div><div class="opciones">' + caja('recCols', COLS_R, o.recCols) + '</div></fieldset>' +
      '</div><div class="modal-pie"><span class="chico muted" id="vEstado">El PDF se descarga directo. Imprimir abre la ventana de la impresora.</span>' +
      '<button class="btn btn-secondary btn-sm" data-cerrar>Cancelar</button><button class="btn btn-primary btn-sm solo-pc" id="vExcel">⬇️ Excel</button>' +
      '<button class="btn btn-primary btn-sm" id="vImprimir">🖨️ Imprimir</button><button class="btn btn-primary btn-sm" id="vPdf">⬇️ PDF</button></div></div>';
    m.classList.remove('oculto'); document.body.classList.add('con-modal');
    function leer() {
      var r = { sec: {}, cols: {}, recCols: {} };
      $$('input[type=checkbox][data-g]', m).forEach(function (c) { if (c.dataset.g === 'x') r[c.dataset.k] = c.checked; else r[c.dataset.g][c.dataset.k] = c.checked; });
      r.desde = $('#vDesde', m).value; r.hasta = $('#vHasta', m).value;
      r.periodo = $('input[name=v_periodo]:checked', m).value; r.recN = Number($('input[name=v_recN]:checked', m).value);
      r.lim = {}; TIPOS.forEach(function (t) { var v = $('input[name=v_lim' + t + ']:checked', m).value; r.lim[t] = v === 'todos' ? 'todos' : Number(v); });
      try { localStorage.setItem(CLAVE_VISITA, JSON.stringify(r)); } catch (e) {}
      return r;
    }
    function cerrar() { m.classList.add('oculto'); m.innerHTML = ''; document.body.classList.remove('con-modal'); }
    m.onclick = function (e) { if (e.target === m || e.target.closest('[data-cerrar]')) cerrar(); };
    m.onkeydown = function (e) { if (e.key === 'Escape') cerrar(); };
    // Los reclamos se piden apenas se abre la ventana (si no estaban ya), así imprimir es inmediato
    var listo = conReclamos(i, { sec: { reclamos: true } });
    $$('input[name=v_periodo]', m).forEach(function (x) { x.onchange = function () { $('#vFechas', m).hidden = x.value !== 'pers' || !x.checked; if (x.value === 'pers' && x.checked) $('#vDesde', m).focus(); }; });
    function accion(fn) {
      return function () {
        var r = leer(), est = $('#vEstado');
        if (r.periodo === 'pers' && !r.desde && !r.hasta) { if (est) est.textContent = '⚠️ Elegí al menos una fecha (desde o hasta).'; $('#vDesde', m).focus(); return; }
        $$('.modal-pie button', m).forEach(function (b) { b.disabled = true; });
        if (est) est.textContent = '⏳ Preparando…';
        listo.then(function () { cerrar(); fn(r); });
      };
    }
    $('#vPdf').onclick = accion(function (r) { pdfVisita(i, regs, r); });
    $('#vImprimir').onclick = accion(function (r) { imprimirVisita(i, regs, r); });
    $('#vExcel').onclick = accion(function (r) { excelEscuela(i, regs, r, true); });
    setTimeout(function () { var b = $('#vPdf'); if (b) b.focus(); }, 30);
  }
  function limVisita(o, t) { var v = o.lim && o.lim[t]; return v === 'todos' || !v ? Infinity : Number(v); }
  function conReclamos(i, o) {
    if (!o.sec.reclamos) return Promise.resolve(null);
    return Datos.reclamos(i.id).catch(function () { return { error: true, total: 0, abiertos: 0, items: [] }; });
  }
  /** Modelo de la ficha para visita (lo usan la impresión y el PDF) */
  function armarVisita(i, regs, o, R) {
    var sel = regsVisita(regs, o), cols = COLS_V.filter(function (c) { return o.cols[c[0]]; });
    var M = {
      titulo: i.id, sub: i.completo || '',
      fecha: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      periodo: textoPeriodoVisita(o),
      secciones: []
    };
    if (o.sec.datos) M.secciones.push({ tipo: 'datos', titulo: 'Datos de la escuela', icono: '🏫', items: [['Dirección', i.direccion], ['Localidad', i.localidad],
      ['Directora / director', i.directora ? i.directora + (i.cargo ? ' (' + i.cargo.toLowerCase() + ')' : '') : ''], ['Nivel', i.nivel], ['Gestión', i.gestion], ['CUE', i.cue],
      ['Matrícula / cupo SAE', i.matricula ? n(i.matricula) : ''], ['Servicio SAE', i.servicio]].filter(function (x) { return x[1]; }) });
    if (o.sec.resumen) {
      var por = { E: [], O: [], A: [] }; sel.forEach(function (r) { por[r.t].push(r); });
      var ult = sel.slice().sort(function (a, b) { return a.orden < b.orden ? 1 : -1; })[0];
      var k = TIPOS.map(function (t) { return [n(por[t].length), T[t].nombre + (t === 'E' ? ' · ' + n(por.E.reduce(function (s, r) { return s + r.cant; }, 0)) + ' u.' : ''), t]; });
      k.push([ult ? String(fechaReg(ult)) : '—', 'Último movimiento' + (ult ? ' · ' + T[ult.t].uno + ' · ' + ult.cat : '')]);
      if (R && !R.error) k.push([n(R.abiertos), 'Reclamos sin resolver']);
      M.secciones.push({ tipo: 'resumen', titulo: 'Resumen', icono: '📊', items: k });
    }
    TIPOS.forEach(function (t) {
      if (!o.sec[t]) return;
      var anioAct = new Date().getFullYear(), base = sel.filter(function (r) { return r.t === t; });
      var rgV = rangoVisita(o), resumir = o.resumir && (!rgV || rgV[1] >= anioAct + '-01-01');   // si todo el período es de años anteriores, va en detalle
      var viejos = resumir ? base.filter(function (r) { return (Number(r.anio) || 0) < anioAct; }) : [];
      var l = listaTipo(resumir ? base.filter(function (r) { return (Number(r.anio) || 0) >= anioAct; }) : base, t, o), vis = l.slice(0, limVisita(o, t));
      var res = resumirViejos(viejos, t);
      M.secciones.push({ tipo: 'tabla', t: t, titulo: T[t].nombre, icono: T[t].icono, total: base.length, cols: cols.map(function (c) { return { k: c[0], t: c[1], der: c[0] === 'cant' }; }),
        nota: base.length ? '' : 'Sin registros en este período.',
        filas: vis.map(function (r) {
          var v = { fecha: r.grupo ? fechaGrupo(r) : String(fechaReg(r)), cat: r.cat,
            det: r.grupo ? r.det + ': ' + r.items.map(function (x) { return x.det.replace(/:\s*$/, '') + (x.cant > 1 ? ' (' + x.cant + ')' : ''); }).join(' · ') : r.det,
            cant: n(r.cant), prov: r.prov, fuente: r.fuente };
          var f = cols.map(function (c) { return v[c[0]] || ''; }); f.grupo = !!r.grupo; f.un = !!r.un; return f;
        }).concat(res.map(function (g) {
          var v = { fecha: g.anios, cat: g.cat, det: g.det, cant: g.cant, prov: g.prov, fuente: 'Resumen' };
          var f = cols.map(function (c) { return v[c[0]] || ''; }); f.resumen = true; return f;
        })),
        mas: [l.length > vis.length ? 'Mostrando ' + n(vis.length) + ' de ' + n(l.length) + (resumir && res.length ? ' de ' + anioAct : '') + ' (los más recientes' + (t !== 'O' && o.agrupar && vis.some(function (x) { return x.grupo; }) ? '; cada día agrupado cuenta como 1' : '') + ').' : '',
          res.length ? 'Lo anterior a ' + anioAct + ' va resumido: un renglón por categoría con los años, lo ' + (t === 'E' ? 'entregado y la cantidad' : 'hecho y las veces') + '.' : ''].filter(Boolean).join(' ') });
    });
    if (o.sec.reclamos) {
      var rc = COLS_R.filter(function (c) { return o.recCols[c[0]]; }), S1 = { tipo: 'tabla', titulo: 'Últimos reclamos', icono: '📣', cols: rc.map(function (c) { return { k: c[0], t: c[1] }; }), filas: [] };
      if (!R || R.error) S1.nota = 'No se pudieron leer los reclamos.';
      else if (!R.items.length) S1.nota = 'Sin reclamos cargados.';
      else {
        S1.nota = resumenReclamos(R);
        S1.filas = R.items.slice(0, o.recN).map(function (r) {
          var v = { estado: r.estado, fecha: r.fecha ? U.fecha(r.fecha) : 's/f', tema: [r.tipo, r.cat, r.sub].filter(Boolean).join(' › '), det: r.det + (r.prod ? ' (' + r.prod + ')' : ''),
            res: r.fres ? U.fecha(r.fres) + (r.fecha && diasEntre(r.fecha, r.fres) >= 0 ? ' · ' + diasEntre(r.fecha, r.fres) + ' días' : '') : '', resp: r.resp, acc: r.acc };
          var f = rc.map(function (c) { return v[c[0]] || ''; }); f.estado = claseEstado(r.estado); return f;
        });
      }
      M.secciones.push(S1);
    }
    return M;
  }
  /** Imprimir: hoja en blanco y negro con el diálogo de la impresora */
  function imprimirVisita(i, regs, o) {
    conReclamos(i, o).then(function (R) {
      var M = armarVisita(i, regs, o, R);
      var h = '<header class="impr-cab"><img src="assets/logo_3f_96.png" alt=""><div><div class="impr-org">Municipalidad de Tres de Febrero · Ficha Escuelas</div>' +
        '<h1>' + esc(M.titulo) + '</h1><div class="impr-sub">' + esc(M.sub) + '</div></div><div class="impr-fecha">Impreso el ' + esc(M.fecha) + '<br>' + esc(M.periodo) + '</div></header>';
      M.secciones.forEach(function (S2) {
        h += '<section><h2>' + S2.icono + ' ' + esc(S2.titulo) + (S2.total != null ? ' <small>(' + n(S2.total) + ')</small>' : '') + '</h2>';
        if (S2.tipo === 'datos') h += '<dl class="impr-datos">' + S2.items.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>';
        else if (S2.tipo === 'resumen') h += '<div class="impr-kpis">' + S2.items.map(function (x) { return '<div><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>';
        else {
          if (S2.nota) h += '<p class="chico">' + esc(S2.nota) + '</p>';
          if (S2.filas.length) h += '<table><thead><tr>' + S2.cols.map(function (c) { return '<th' + (c.der ? ' class="num"' : '') + '>' + esc(c.t) + '</th>'; }).join('') + '</tr></thead><tbody>' +
            S2.filas.map(function (f) { return '<tr' + (f.grupo ? ' class="grupo' + (f.un ? ' un' : '') + '"' : f.resumen ? ' class="resumen"' : '') + '>' + f.map(function (v, k) { var c = S2.cols[k];
              return '<td' + (c.der ? ' class="num"' : c.k === 'fecha' || c.k === 'res' ? ' class="nw"' : '') + '>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
          if (S2.mas) h += '<p class="chico">' + esc(S2.mas) + '</p>';
        }
        h += '</section>';
      });
      var cont = $('#impresion');
      cont.innerHTML = '<style>@page { size: A4; margin: 14mm 12mm 16mm; @bottom-left { content: "Hoja " counter(page) " de " counter(pages); font: 9pt Inter, Arial, sans-serif; color: #444; } ' +
        '@bottom-right { content: "Ficha Escuelas · ' + String(i.id).replace(/["\\]/g, '') + '"; font: 9pt Inter, Arial, sans-serif; color: #444; } }</style><div class="impr">' + h + '</div>';
      document.body.classList.add('imprimiendo', 'bn');
      var fin = function () { document.body.classList.remove('imprimiendo', 'bn'); window.removeEventListener('afterprint', fin); };
      window.addEventListener('afterprint', fin);
      requestAnimationFrame(function () { window.print(); setTimeout(fin, 1500); });
    });
  }
  /** PDF a color, generado en el navegador y descargado directo (sin pasar por la impresora) */
  function pdfVisita(i, regs, o) {
    U.toast('⏳ Armando el PDF…');
    Promise.all([conReclamos(i, o), PDFsimple.logoJPEG('assets/logo_3f_96.png')]).then(function (x) {
      var M = armarVisita(i, regs, o, x[0]), logo = x[1];
      var AZUL = '#163c68', NAR = '#f69321', GRIS = '#555555', COLT = { E: '#2a78d6', O: '#eb6834', A: '#1baf7a' };
      var COLEST = { ok: '#e7f6ee', pend: '#fff1e2', gestion: '#e6effb', otro: '#f1f3f6' };
      var d = PDFsimple.nuevo({ pie: 'Ficha Escuelas · ' + M.titulo });
      if (logo) d.imagenJPEG(logo.bytes, logo.w, logo.h);
      // Encabezado
      d.dibujarImagen(d.M.izq, d.y, 38, 38);
      d.txt('MUNICIPALIDAD DE TRES DE FEBRERO · FICHA ESCUELAS', d.M.izq + 48, d.y + 9, 7.5, true, NAR);
      d.txt(M.titulo, d.M.izq + 48, d.y + 27, 18, true, AZUL);
      d.txt(M.sub, d.M.izq + 48, d.y + 39, 9, true, '#333333');
      d.txt('Impreso el ' + M.fecha, d.W - d.M.der, d.y + 12, 8, false, GRIS, 'der');
      d.txt(M.periodo, d.W - d.M.der, d.y + 23, 8, false, GRIS, 'der');
      d.y += 46; d.rect(d.M.izq, d.y, d.ancho, 2.2, AZUL); d.y += 10;
      function titulo(S2) {
        d.lugar(40); d.y += 4;
        var col = S2.t ? COLT[S2.t] : AZUL;
        d.rect(d.M.izq, d.y, 3.5, 13, col);
        d.txt(S2.titulo + (S2.total != null ? '  (' + n(S2.total) + ')' : ''), d.M.izq + 9, d.y + 10.5, 11.5, true, AZUL);
        d.y += 17; d.linea(d.M.izq, d.y, d.M.izq + d.ancho, d.y, '#d5dde8', 0.6); d.y += 5;
      }
      M.secciones.forEach(function (S2) {
        titulo(S2);
        if (S2.tipo === 'datos') {
          var colW = d.ancho / 2, lh = 13;
          for (var k = 0; k < S2.items.length; k += 2) {
            var pares = S2.items.slice(k, k + 2), alto = Math.max.apply(null, pares.map(function (p) { return PDFsimple.partir(p[1], colW - 112, 9, true).length; })) * lh;
            d.lugar(alto);
            pares.forEach(function (p, j) {
              var x0 = d.M.izq + j * colW; d.txt(p[0], x0, d.y + 9, 8.5, false, GRIS);
              PDFsimple.partir(p[1], colW - 112, 9, true).forEach(function (l, m) { d.txt(l, x0 + 104, d.y + 9 + m * lh, 9, true, '#1f2937'); });
            });
            d.y += alto;
          }
          d.y += 4;
        } else if (S2.tipo === 'resumen') {
          var nI = S2.items.length, g = 6, bw = (d.ancho - g * (nI - 1)) / nI, bh = 40;
          d.lugar(bh);
          S2.items.forEach(function (it, k) {
            var x0 = d.M.izq + k * (bw + g);
            d.rect(x0, d.y, bw, bh, '#f7f9fc', '#d5dde8');
            if (it[2]) d.rect(x0, d.y, bw, 3, COLT[it[2]]);
            d.txt(it[0], x0 + 7, d.y + 19, 13, true, AZUL);
            PDFsimple.partir(it[1], bw - 12, 7, false).slice(0, 2).forEach(function (l, m) { d.txt(l, x0 + 7, d.y + 29 + m * 8, 7, false, '#444444'); });
          });
          d.y += bh + 6;
        } else {
          if (S2.nota) d.parrafo(S2.nota, { tam: 8.5, color: '#444444' });
          if (S2.filas.length) {
            d.y += 2;
            var anchos = { fecha: 1.1, cat: 1.5, det: 4.2, cant: 0.75, prov: 1.7, fuente: 1.6, estado: 1, tema: 2.2, res: 1.3, resp: 1.1, acc: 2.2 };
            var filas = S2.filas.map(function (f) { var c = f.slice(); if (f.grupo) { c.fondo = f.un ? '#f1ecfb' : '#eaf7f1'; c.negrita = true; } if (f.resumen) c.fondo = '#f3f5f9'; if (f.estado) c.fondo = COLEST[f.estado]; return c; });
            d.tabla(S2.cols.map(function (c) { return { t: c.t, w: anchos[c.k] || 1.2, der: c.der }; }), filas, { tam: 7.8 });
          }
          if (S2.mas) d.parrafo(S2.mas, { tam: 8, color: '#555555' });
          d.y += 6;
        }
      });
      var url = URL.createObjectURL(d.blob()), a = document.createElement('a');
      a.href = url; a.download = 'Ficha Escuelas - ' + i.id.replace(/[\\\/:*?"<>|]/g, '-') + '.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      U.toast('📥 PDF descargado');
    }).catch(function (e) { console.error(e); U.toast('⚠️ No se pudo armar el PDF: ' + e.message); });
  }
  function excelEscuela(i, regs, o, desdeVisita) {
    conReclamos(i, o).then(function (R) {
      var sel = desdeVisita ? regsVisita(regs, o) : regs, hojas = [], sub = (i.completo || '') + ' · descargado el ' + hoy();
      if (o.sec.datos || !desdeVisita) hojas.push({ nombre: 'Datos', titulo: i.id + ' · datos de la escuela', subtitulo: sub, columnas: [{ t: 'Dato', ancho: 24 }, { t: 'Valor', ancho: 60 }],
        filas: [['Institución', i.id], ['Nombre completo', i.completo], ['Dirección', i.direccion], ['Localidad', i.localidad], ['Directora / director', i.directora], ['Cargo', i.cargo],
          ['Nivel', i.nivel], ['Gestión', i.gestion], ['CUE', i.cue], ['Matrícula / cupo SAE', i.matricula || ''], ['Servicio SAE', i.servicio], ['Cómo llegar (Google Maps)', urlComoLlegar(i)]].filter(function (x) { return x[1]; }) });
      TIPOS.forEach(function (t) {
        if (desdeVisita && !o.sec[t]) return;
        var l = listaTipo(sel, t, desdeVisita ? o : { agrupar: true }), tot = l.length;
        if (desdeVisita) l = l.slice(0, limVisita(o, t));
        hojas.push({ nombre: T[t].nombre, titulo: i.id + ' · ' + T[t].nombre, subtitulo: sub + (l.length < tot ? ' · mostrando ' + n(l.length) + ' de ' + n(tot) + ' (los más recientes)' : ''), columnas: colsExcel(), filas: filasExcel(l) });
      });
      if (R && !R.error && (o.sec.reclamos || !desdeVisita)) hojas.push({ nombre: 'Reclamos', titulo: i.id + ' · últimos reclamos', subtitulo: resumenReclamos(R) + ' · ' + sub,
        columnas: [{ t: 'Fecha', ancho: 11 }, { t: 'Estado', ancho: 12 }, { t: 'Tipo', ancho: 12 }, { t: 'Categoría', ancho: 16 }, { t: 'Subcategoría', ancho: 18 }, { t: 'Detalle', ancho: 60 },
          { t: 'Producto', ancho: 14 }, { t: 'Servicio', ancho: 18 }, { t: 'Proveedor', ancho: 16 }, { t: 'Responsable', ancho: 14 }, { t: 'Fecha resolución', ancho: 12 }, { t: 'Acciones', ancho: 40 }, { t: 'Fila', ancho: 7 }],
        filas: R.items.slice(0, desdeVisita ? o.recN : 20).map(function (r) { return [r.fecha ? U.fechaLarga(r.fecha) : '', r.estado, r.tipo, r.cat, r.sub, r.det, r.prod, r.serv, r.prov, r.resp, r.fres ? U.fechaLarga(r.fres) : '', r.acc, r.ref[1]]; }) });
      exportarExcel('Ficha Escuelas - ' + i.id, hojas);
    });
  }

  /** "📄 Ver en planillas": dónde aparece esta institución, con acceso directo a la primera fila de cada hoja */
  function menuPlanillas(i, regs) {
    var porHoja = new Map();
    regs.forEach(function (r) {
      if (!r.ref) return;
      var o = porHoja.get(r.ref[0]) || { n: 0, ref: r.ref, tipos: {} };
      o.n++; o.tipos[r.t] = 1; if (r.ref[1] < o.ref[1]) o.ref = r.ref; porHoja.set(r.ref[0], o);
    });
    var items = [];
    if (i.ref && i.ref[0] === 'ES') items.push(['ESTABLECIMIENTOS', 'Datos de la institución', i.ref]);
    ['EN', 'HI', 'UN', 'OB', 'IT'].forEach(function (h) {
      var o = porHoja.get(h); if (!o) return;
      items.push([U.nombreHoja(h), n(o.n) + ' ' + (o.n === 1 ? 'registro' : 'registros') + ' · ' + Object.keys(o.tipos).map(function (t) { return T[t].nombre.toLowerCase(); }).join(', '), o.ref]);
    });
    if (!items.length || !Object.keys(Datos.hojas).length) return '';
    return '<details class="menu-planillas solo-pc"><summary class="btn btn-secondary btn-sm">📄 Ver en planillas</summary><div class="menu-caja">' +
      '<div class="chico muted" style="padding:.2rem .3rem .4rem">Abre la planilla en la primera fila de esta institución. Cada registro del detalle tiene su propio ↗.</div>' +
      items.map(function (x) { return '<div class="menu-item"><div><b>' + esc(x[0]) + '</b><div class="chico muted">' + esc(x[1]) + '</div></div>' + botonIr(x[2], 'Abrir') + '</div>'; }).join('') + '</div></details>';
  }
  function kpi(t, et, val, sub) {
    return '<div class="kpi click tipo-' + t + '" data-kpi="' + t + '"><div class="et"><i class="marca-tipo"></i>' + et + '</div><div class="val">' + val + '</div><div class="sub">' + esc(sub) + '</div></div>';
  }
  function resumenCats(rs) {
    if (!rs.length) return 'Sin registros';
    var m = U.contar(rs, function (r) { return r.cat; });
    return Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 2).map(function (e) { return e[0] + ' ' + e[1]; }).join(' · ');
  }
  function pintarTablaFicha(regs) {
    var F = S.ficha, t = F.tab, base = regs.filter(function (r) { return r.t === t; });
    U.opciones($('#fAnio'), valores(base, function (r) { return r.anio; }).sort().reverse(), 'Todos', F.anio);
    U.opciones($('#fMes'), MESES.map(function (m, k) { return [String(k + 1).padStart(2, '0'), m]; }), 'Todos', F.mes);
    U.opciones($('#fCat'), valores(base, function (r) { return r.cat; }).sort(U.ordenTexto), 'Todas', F.cat);
    opcionesProv($('#fProv'), valores(base, function (r) { return r.prov; }), F.prov);
    $('#fProv').disabled = !$('#fProv').options[1];
    var q = U.norm(F.q), rg = rangoPeriodo(F.periodo, F.desde, F.hasta), sinF = 0;
    var rs = base.filter(function (r) {
      if (F.anio && String(r.anio) !== F.anio) return false;
      if (F.mes) { if (r.fecha) { if (r.fecha.slice(5, 7) !== F.mes) return false; } else if (!F.sinFecha) return false; }
      if (!enRango(r, rg, F.sinFecha)) return false;
      if (F.cat && r.cat !== F.cat) return false;
      if (F.prov && r.prov !== F.prov) return false;
      if (q && r.busca.indexOf(q) < 0) return false;
      if (!r.fecha && (F.mes || rg)) sinF++;
      return true;
    });
    var lista = t !== 'O' ? agruparArreglos(rs) : rs.slice();
    lista.sort(function (a, b) { return a.orden < b.orden ? 1 : a.orden > b.orden ? -1 : 0; });
    if (F.orden === 'viejo') lista.reverse();
    else if (F.orden === 'cant') lista.sort(function (a, b) { return b.cant - a.cant || (a.orden < b.orden ? 1 : -1); });
    var u = rs.reduce(function (s, r) { return s + r.cant; }, 0);
    $('#fSub').textContent = n(rs.length) + ' ' + T[t].nombre.toLowerCase() + (t !== 'O' ? ' · ' + n(u) + ' unidades' : '') + (rs.length !== base.length ? ' (filtrado de ' + n(base.length) + ')' : '') +
      (sinF ? ' · ' + n(sinF) + ' sin fecha exacta incluidos por año' : '') +
      (lista.length < rs.length ? ' · agrupados por día en ' + n(lista.length) + ' filas (tocá una para ver el detalle)' : '');
    $$('.kpi[data-kpi]').forEach(function (k) { k.onclick = function () { S.ficha.tab = k.dataset.kpi; S.ficha.cat = ''; S.ficha.prov = ''; pintarFicha(); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    cuentaPleg('fPleg', ['periodo', 'anio', 'mes', 'cat', 'prov'].filter(function (k) { return F[k]; }).length + (F.orden && F.orden !== 'nuevo' ? 1 : 0) + (F.sinFecha ? 0 : 1));
    var verF = esCel() ? tandaCel(F, [S.inst, t, F.q, F.periodo, F.desde, F.hasta, F.anio, F.mes, F.cat, F.prov, F.orden, F.sinFecha].join('|')) : lista.length;
    $('#fTabla').innerHTML = lista.length ? tablaRegs(lista.slice(0, verF), false) + botonVerMas(Math.min(verF, lista.length), lista.length) : '<div class="vacio"><span class="grande">' + T[t].icono + '</span>No hay ' + T[t].nombre.toLowerCase() + ' con estos filtros</div>';
    var vm = $('#fTabla [data-ver-mas]'); if (vm) vm.onclick = function () { F._ver += POR_TANDA_CEL; pintarTablaFicha(regs); };
  }

  /** Línea de tiempo de la ficha: por año (todo) o por mes (un año; solo registros con fecha exacta) */
  function pintarLineaTiempo(i, regs, por) {
    var F = S.ficha;
    if (F.escala === 'mes') {
      var conFecha = regs.filter(function (r) { return r.fecha; });
      var anios = valores(conFecha, function (r) { return r.fecha.slice(0, 4); }).sort().reverse();
      if (!F.anioMes || anios.indexOf(F.anioMes) < 0) F.anioMes = anios[0] || String(anioActual);
      U.opciones($('#fAnioMes'), anios, anios.length ? '—' : 'Sin fechas', F.anioMes);
      $('#fAnioMes').classList.remove('oculto');
      var sinF = regs.filter(function (r) { return !r.fecha && String(r.anio) === F.anioMes; }).length;
      $('#fAnualSub').textContent = 'Registros por mes en ' + F.anioMes + (sinF ? ' · ' + n(sinF) + ' de ese año no tienen fecha exacta y no se muestran' : '') + '. Tocá un mes para filtrar';
      G.columnas($('#fAnual'), {
        cats: MESES_CORTOS, aria: 'Registros por mes de ' + i.id,
        series: TIPOS.map(function (t) { return { id: t, nombre: T[t].nombre, color: 'var(--c-' + t + ')', valores: MESES_CORTOS.map(function (_, k) {
          var mm = F.anioMes + '-' + String(k + 1).padStart(2, '0'); return por[t].filter(function (r) { return r.fecha && r.fecha.slice(0, 7) === mm; }).length; }) }; }),
        onClick: function (m, k) { S.ficha.anio = F.anioMes; S.ficha.mes = String(k + 1).padStart(2, '0'); pintarFicha(); U.toast(MESES[k] + ' ' + F.anioMes); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      return;
    }
    $('#fAnioMes').classList.add('oculto');
    $('#fAnualSub').textContent = 'Registros por año. Tocá un año para ver solo ese';
    var an = valores(regs, function (r) { return r.anio; }).sort();
    if (an.length) { var a0 = an[0], a1 = an[an.length - 1]; an = []; for (var a = a0; a <= a1; a++) an.push(a); }
    G.columnas($('#fAnual'), {
      cats: an, aria: 'Registros por año de ' + i.id,
      series: TIPOS.map(function (t) { return { id: t, nombre: T[t].nombre, color: 'var(--c-' + t + ')', valores: an.map(function (a) { return por[t].filter(function (r) { return r.anio === a; }).length; }) }; }),
      onClick: function (a) { S.ficha.anio = String(a); S.ficha.mes = ''; pintarFicha(); U.toast('Año ' + a); $('#fTabla').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  }

  /** Copiar al portapapeles con respaldo: API moderna → método viejo → cajita para copiar a mano */
  function copiarTexto(texto, ok) {
    function viejo() {
      var ta = document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'; document.body.appendChild(ta); ta.select();
      var hecho = false; try { hecho = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (hecho) U.toast(ok); else cajaCopiar(texto);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(function () { U.toast(ok); }, viejo);
    else viejo();
  }
  function cajaCopiar(texto) {
    var d = document.createElement('div'); d.className = 'caja-copiar';
    d.innerHTML = '<div class="card"><div class="card-body"><b>Copiá el link</b><p class="chico muted">El navegador no dejó copiarlo solo. Está seleccionado: apretá Ctrl+C.</p>' +
      '<input type="text" readonly value="' + esc(texto) + '" style="width:100%"><div class="fila" style="justify-content:flex-end;margin-top:.6rem"><button class="btn btn-primary btn-sm">Listo</button></div></div></div>';
    document.body.appendChild(d);
    var inp = d.querySelector('input'); inp.focus(); inp.select();
    d.querySelector('button').onclick = function () { d.remove(); };
    d.onclick = function (e) { if (e.target === d) d.remove(); };
  }

  /** Tabla de registros (ficha y vista Registros) */
  // ── Agrupados (FACTURACION ITEMS en verde y FACTURACION UNIDADES en violeta), cada día por separado:
  //    · en la ficha (una escuela): día + rubro + proveedor → trabajos
  //    · en Registros (todas): día + rubro + proveedor → escuela → trabajos   (porEscuela = true)
  var ABIERTOS = new Set();          // grupos desplegados (se mantienen al refiltrar)
  function diasEntre(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  function hacerGrupo(items, key, extra) {
    var p = items[0];
    var g = { grupo: true, key: key, t: p.t, un: p.fuente === 'FACTURACION UNIDADES', inst: p.inst, I: p.I, cat: p.cat, prov: p.prov, fuente: p.fuente, fecha: p.fecha, desde: p.fecha, anio: p.anio, orden: p.fecha,
      cant: items.reduce(function (s, r) { return s + r.cant; }, 0), det: items.length + (items.length === 1 ? ' trabajo' : ' trabajos'), items: items, ref: p.ref, monto: null, fact: '' };
    return Object.assign(g, extra || {});
  }
  function agruparArreglos(rs, porEscuela) {
    var aparte = [], porDia = new Map();
    rs.forEach(function (r) {
      if (!r.fecha || (r.fuente !== 'FACTURACION ITEMS' && r.fuente !== 'FACTURACION UNIDADES')) { aparte.push(r); return; }
      var k = r.fecha + '|' + r.t + '|' + r.fuente + '|' + r.cat + '|' + r.prov + (porEscuela ? '' : '|' + r.inst);
      var l = porDia.get(k); if (!l) porDia.set(k, l = []); l.push(r);
    });
    var out = aparte.slice();
    porDia.forEach(function (l, k) {
      if (l.length === 1) { out.push(l[0]); return; }
      var porInst = new Map();
      l.forEach(function (r) { var x = porInst.get(r.inst); if (!x) porInst.set(r.inst, x = []); x.push(r); });
      if (!porEscuela || porInst.size === 1) { out.push(hacerGrupo(l, k)); return; }   // una sola escuela: abre directo los trabajos
      var subs = Array.from(porInst.entries()).sort(function (a, b) { return b[1].length - a[1].length || ordenEs(a[0], b[0]); }).map(function (e) {
        return e[1].length === 1 ? e[1][0] : hacerGrupo(e[1], k + '|' + e[0], { sub: true });
      });
      out.push(hacerGrupo(l, k, { subs: subs, nEsc: porInst.size, inst: porInst.size === 1 ? l[0].inst : '' }));
    });
    return out;
  }
  function fechaGrupo(g) {            // 05–06/10/25 · 30/09–01/10/25 · 31/12/25–01/01/26
    if (g.desde === g.fecha) return U.fecha(g.fecha);
    var a = U.fecha(g.desde), b = U.fecha(g.fecha);
    if (a.slice(3) === b.slice(3)) return a.slice(0, 2) + '–' + b;
    if (a.slice(6) === b.slice(6)) return a.slice(0, 5) + '–' + b;
    return a + '–' + b;
  }

  /** Tabla de registros (ficha y vista Registros). Acepta registros sueltos y grupos de arreglos. */
  function tablaRegs(rs, conInst, orden) {
    var m = hayMontos();
    // [clave, título, numérica, ancho en px (0 = el resto)] — anchos fijos: no cambian al filtrar
    var cols = [];
    if (conInst) cols.push(['t', 'Tipo', 0, 96]);
    cols.push(['orden', 'Fecha', 0, 118]);
    if (conInst) cols.push(['inst', 'Institución', 0, 150]);
    cols.push(['cat', 'Categoría', 0, 158], ['det', 'Detalle', 0, 0], ['cant', 'Cant.', 1, 64], ['prov', 'Proveedor', 0, 170]);
    if (m) cols.push(['monto', 'Monto', 1, 110], ['fact', 'Factura', 0, 90]);
    cols.push(['fuente', 'Planilla', 0, 140], ['ir', '', 0, 46]);
    var minimo = cols.reduce(function (s, c) { return s + (c[3] || 260); }, 0);
    function celda(clase, texto, html) { return '<td class="' + clase + '" title="' + esc(texto) + '">' + (html == null ? esc(texto) : html) + '</td>'; }
    function fila(r, clase, extra) {
      var detTitulo = r.det + (r.serv && r.t !== 'O' ? ' — ' + r.serv : '');
      return '<tr class="' + (clase || '') + '"' + (extra || '') + '>' + (conInst ? celda('c-t', T[r.t].uno, etiquetaTipo(r.t)) : '') + celda('fecha c-fecha', String(fechaReg(r))) +
        (conInst ? celda('inst c-inst', r.inst, linkInst(r.inst)) : '') +
        celda('c-cat', r.cat, U.icono(r.cat) + '&nbsp;' + esc(r.cat)) + celda('c-det', detTitulo, (clase && clase.indexOf('fila-hijo') === 0 ? '<span class="sangria">↳</span> ' : '') + esc(r.det)) +
        celda('num c-cant', n(r.cant)) + celda('chico c-prov', r.prov) +
        (m ? celda('num c-monto', r.monto == null ? '' : '$ ' + n(r.monto)) + celda('chico c-fact', r.fact || '') : '') +
        celda('fuente c-fuente', r.fuente) + '<td class="ir c-ir">' + botonIr(r.ref) + '</td></tr>';
    }
    function abierto(anc) { return anc.every(function (k) { return ABIERTOS.has(k); }); }
    function attrs(anc) { return anc.length ? ' data-anc="' + esc(anc.join('§')) + '"' + (abierto(anc) ? '' : ' hidden') : ''; }
    function resumenDe(items) { return items.slice(0, 3).map(function (r) { return r.det.replace(/:\s*$/, ''); }).join(' · ') + (items.length > 3 ? ' …' : ''); }
    function grupo(g, anc) {
      anc = anc || [];
      var ab = ABIERTOS.has(g.key), k = esc(g.key), hijos = g.subs || g.items;
      var titulo = g.subs ? (g.nEsc > 1 ? n(g.nEsc) + ' escuelas · ' : '') + g.det : g.det;
      var instHtml = g.subs ? (g.nEsc > 1 ? '<span class="muted">' + n(g.nEsc) + ' escuelas</span>' : linkInst(g.inst)) : linkInst(g.inst);
      var fila0 = '<tr class="' + (g.sub ? 'fila-sub' : 'fila-grupo') + (g.un ? ' un' : '') + (ab ? ' abierto' : '') + '" data-grupo="' + k + '"' + attrs(anc) + ' tabindex="0" aria-expanded="' + ab + '" title="Tocá para ' + (ab ? 'cerrar' : 'abrir') + '">' +
        (conInst ? celda('c-t', T[g.t].uno, etiquetaTipo(g.t)) : '') + celda('fecha c-fecha', fechaGrupo(g)) +
        (conInst ? celda('inst c-inst', g.inst || (g.nEsc + ' escuelas'), instHtml) : '') +
        celda('c-cat', g.cat, U.icono(g.cat) + '&nbsp;' + esc(g.cat)) +
        celda('c-det', titulo + ': ' + resumenDe(g.items), (g.sub ? '<span class="sangria">↳</span> ' : '') + '<span class="flecha-grupo">▸</span> <b>' + esc(titulo) + '</b> <span class="muted">· ' + esc(resumenDe(g.items)) + '</span>') +
        celda('num c-cant', n(g.cant)) + celda('chico c-prov', g.prov) + (m ? '<td class="c-monto"></td><td class="c-fact"></td>' : '') + celda('fuente c-fuente', g.fuente) + '<td class="ir c-ir"></td></tr>';
      var anc2 = anc.concat([g.key]);
      var cu = g.un ? ' un' : '';
      return fila0 + hijos.map(function (h) { return h.grupo ? grupo(h, anc2) : fila(h, (g.sub ? 'fila-hijo nivel2' : g.subs ? 'fila-hijo nivel1' : 'fila-hijo') + cu, attrs(anc2)); }).join('');
    }
    return '<table class="tabla-fija" style="min-width:' + minimo + 'px"><colgroup>' + cols.map(function (c) { return '<col' + (c[3] ? ' style="width:' + c[3] + 'px"' : '') + '>'; }).join('') +
      '</colgroup><thead><tr>' + cols.map(function (c) {
      var o = orden && orden.col === c[0];
      return '<th class="' + (orden && c[0] !== 'ir' ? 'ord' : '') + (c[2] ? ' num' : '') + '" data-col="' + c[0] + '">' + c[1] + (o ? ' <span class="flecha">' + (orden.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + rs.map(function (r) { return r.grupo ? grupo(r) : fila(r); }).join('') + '</tbody></table>';
  }
  function alternarGrupo(tr) {
    var k = tr.dataset.grupo, ab = !ABIERTOS.has(k);
    if (ab) ABIERTOS.add(k); else ABIERTOS.delete(k);
    tr.classList.toggle('abierto', ab); tr.setAttribute('aria-expanded', String(ab));
    $$('tr[data-anc]', tr.parentNode).forEach(function (h) { h.hidden = !h.dataset.anc.split('§').every(function (x) { return ABIERTOS.has(x); }); });
  }
  /** Excel: los grupos salen como una fila de resumen y sus trabajos abajo */
  function filasExcel(lista) {
    var out = [];
    function agregar(r, nivel) {
      var sang = new Array(nivel + 1).join('    ');
      if (!r.grupo) { var f0 = paraExcel(r); if (nivel) f0[8] = sang + '↳ ' + f0[8]; out.push(f0); return; }
      var f = paraExcel(r.items[0]); f[1] = U.fechaLarga(r.fecha); f[9] = r.cant; f[11] = ''; f[14] = '';
      f[8] = sang + '▸ ' + (r.subs && r.nEsc > 1 ? r.nEsc + ' escuelas · ' : '') + r.det;
      if (r.subs && r.nEsc > 1) { f[3] = ''; f[4] = ''; f[5] = ''; f[6] = ''; }
      out.push(f);
      (r.subs || r.items).forEach(function (h) { agregar(h, nivel + 1); });
    }
    lista.forEach(function (r) { agregar(r, 0); });
    return out;
  }

  // ───────────────────────── VISTA GENERAL
  function instPasa(i) {
    var g = S.g;
    return (!g.nivel || i.nivel === g.nivel) && (!g.gestion || i.gestion === g.gestion) && (!g.localidad || i.localidad === g.localidad) &&
      (!g.servicio || i.servicio === g.servicio) && (!g.insts.size || g.insts.has(i.id));
  }
  function pasaMes(r, mes, sinFecha) {          // mes: '01'..'12'
    if (r.fecha) return r.fecha.slice(5, 7) === mes;
    return !!sinFecha;
  }
  function filtrarGeneral() {
    var g = S.g, rg = rangoPeriodo(g.periodo, g.desde, g.hasta), q = U.norm(g.q), partesQ = q ? q.split(' ') : [];
    return Datos.regs.filter(function (r) {
      return g.tipos.has(r.t) && (!g.anios.size || g.anios.has(r.anio)) && (!g.cat || r.cat === g.cat) && (!g.prov || r.prov === g.prov) && instPasa(r.I) &&
        (!g.fuente || r.fuente === g.fuente) && enRango(r, rg, g.sinFecha) &&
        (!g.meses.size || Array.from(g.meses).some(function (m) { return pasaMes(r, m, g.sinFecha); })) &&
        (!partesQ.length || partesQ.every(function (p) { return r.busca.indexOf(p) >= 0; }));
    });
  }

  // ── Filtros activos como etiquetas con ✕ (todas las vistas)
  function pintarChips(cont, lista, alQuitar) {
    cont.innerHTML = lista.length ? '<span class="chico muted">Filtrando por:</span>' + lista.map(function (x, k) {
      return '<button type="button" class="chip activo" data-k="' + k + '" title="Quitar este filtro">' + esc(x[0]) + ' <span aria-hidden="true">✕</span></button>';
    }).join('') : '';
    cont.onclick = function (e) { var b = e.target.closest('[data-k]'); if (b) { lista[+b.dataset.k][1](); alQuitar(); } };
    if (cont.id === 'gChips' || cont.id === 'rChips') cuentaPleg(cont.id.charAt(0) + 'Pleg', lista.length);
  }
  var NOM_PERIODO = { mes: 'Este mes', '3m': 'Últimos 3 meses', anio: 'Este año', pasado: 'Año pasado' };
  function textoPeriodo(o) { return o.periodo === 'pers' ? 'Fechas: ' + (o.desde ? U.fechaLarga(o.desde) : '…') + ' a ' + (o.hasta ? U.fechaLarga(o.hasta) : '…') : NOM_PERIODO[o.periodo]; }
  function chipsGeneral() {
    var g = S.g, L = [];
    if (g.tipos.size < 3) L.push(['Tipo: ' + TIPOS.filter(function (t) { return g.tipos.has(t); }).map(function (t) { return T[t].nombre; }).join(', '), function () { g.tipos = new Set(TIPOS); }]);
    if (g.anios.size) L.push(['Años: ' + Array.from(g.anios).sort().join(', '), function () { g.anios.clear(); }]);
    if (g.periodo) L.push([textoPeriodo(g), function () { g.periodo = ''; g.desde = ''; g.hasta = ''; }]);
    if (g.meses.size) L.push(['Meses: ' + Array.from(g.meses).sort().map(function (m) { return MESES_CORTOS[+m - 1]; }).join(', '), function () { g.meses.clear(); }]);
    [['cat', 'Categoría'], ['nivel', 'Nivel'], ['gestion', 'Gestión'], ['localidad', 'Localidad'], ['prov', 'Proveedor'], ['servicio', 'Servicio SAE'], ['fuente', 'Planilla'], ['q', 'Texto']].forEach(function (x) {
      if (g[x[0]]) L.push([x[1] + ': ' + g[x[0]], function () { g[x[0]] = ''; }]);
    });
    g.insts.forEach(function (id) { L.push(['🏫 ' + id, function () { g.insts.delete(id); }]); });
    return L;
  }

  // ── Link con los filtros (vista general y registros)
  function aUrl(o) {
    var c = {}; Object.keys(o).forEach(function (k) { var v = o[k]; if (v instanceof Set) v = Array.from(v); if (v === '' || (Array.isArray(v) && !v.length)) return; c[k] = v; });
    return c;
  }
  function linkConFiltros(vista, o) {
    var u = location.origin + location.pathname + '?vista=' + vista + '&f=' + encodeURIComponent(JSON.stringify(aUrl(o)));
    copiarTexto(u, '🔗 Link con filtros copiado');
  }
  function leerFiltrosUrl() {
    var f = new URLSearchParams(location.search).get('f'); if (!f) return null;
    try { return JSON.parse(f); } catch (e) { return null; }
  }
  function aplicarFiltrosUrl() {
    var f = leerFiltrosUrl(); if (!f) return;
    if (S.vista === 'general') {
      var g = gNuevo(); Object.keys(f).forEach(function (k) { if (g[k] instanceof Set) g[k] = new Set(f[k]); else if (k in g) g[k] = f[k]; });
      if (Array.isArray(f.anios)) g.anios = new Set(f.anios.map(Number));
      S.g = g;
    } else if (S.vista === 'registros') {
      var r = rNuevo(); Object.keys(f).forEach(function (k) { if (k in r) r[k] = f[k]; }); S.r = r;
    }
  }
  function agrupar(rs, clave) {
    var m = new Map();
    rs.forEach(function (r) {
      var k = clave(r); if (k == null || k === '') return;
      var o = m.get(k); if (!o) { o = { k: k, E: 0, O: 0, A: 0, total: 0 }; m.set(k, o); }
      var v = medida(r); o[r.t] += v; o.total += v;
    });
    return Array.from(m.values());
  }
  function partes(o) { return TIPOS.filter(function (t) { return S.g.tipos.has(t); }).map(function (t) { return { t: t, v: o[t] }; }); }
  function topConOtros(arr, k, nombreOtros) {
    arr.sort(function (a, b) { return b.total - a.total; });
    var sin = arr.filter(function (x) { return U.esSin(x.k); });
    arr = arr.filter(function (x) { return !U.esSin(x.k); });
    k = k - sin.length;
    if (arr.length > k) {
      var resto = arr.slice(k - 1), o = { k: nombreOtros || 'Otros', E: 0, O: 0, A: 0, total: 0, otros: resto.length };
      resto.forEach(function (x) { TIPOS.forEach(function (t) { o[t] += x[t]; }); o.total += x.total; });
      arr = arr.slice(0, k - 1).concat([o]);
    }
    return arr.concat(sin);                   // "Sin tipo" / "Sin dato" siempre al final
  }

  function pintarControlesGeneral() {
    var g = S.g;
    $('#gTipos').innerHTML = TIPOS.map(function (t) {
      return '<button class="chip tipo-' + t + '" data-t="' + t + '" aria-pressed="' + g.tipos.has(t) + '"><i class="marca" style="background:var(--c)"></i>' + T[t].icono + ' ' + T[t].nombre + '</button>';
    }).join('');
    var anios = valores(Datos.regs, function (r) { return r.anio; }).sort();
    $('#gAnios').innerHTML = '<button class="chip" data-a="" aria-pressed="' + !g.anios.size + '">Todos</button>' + anios.map(function (a) {
      return '<button class="chip" data-a="' + a + '" aria-pressed="' + g.anios.has(a) + '">' + a + '</button>';
    }).join('');
    var base = Datos.regs.filter(function (r) { return g.tipos.has(r.t); });
    U.opciones($('#gCat'), valores(base, function (r) { return r.cat; }).sort(U.ordenTexto).map(function (c) { return [c, U.icono(c) + ' ' + c]; }), 'Todas', g.cat);
    var insts = Array.from(Datos.inst.values());
    U.opciones($('#gNivel'), valores(insts, function (i) { return i.nivel; }).sort(U.ordenTexto), 'Todos', g.nivel);
    U.opciones($('#gGestion'), valores(insts, function (i) { return i.gestion; }).sort(U.ordenTexto), 'Todas', g.gestion);
    U.opciones($('#gLocalidad'), valores(insts, function (i) { return i.localidad; }).sort(U.ordenTexto), 'Todas', g.localidad);
    opcionesProv($('#gProv'), valores(base, function (r) { return r.prov; }), g.prov);
    $$('#gMedida button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.m === g.medida)); });
    U.opciones($('#gServicio'), valores(insts, function (i) { return i.servicio; }).sort(U.ordenTexto), 'Todos', g.servicio);
    U.opciones($('#gFuente'), valores(Datos.regs, function (r) { return r.fuente; }).sort(), 'Todas', g.fuente);
    $('#gMeses').innerHTML = MESES_CORTOS.map(function (m, k) { var v = String(k + 1).padStart(2, '0');
      return '<button class="chip" data-mes="' + v + '" aria-pressed="' + g.meses.has(v) + '">' + m + '</button>'; }).join('');
    $('#gInsts').innerHTML = Array.from(g.insts).map(function (id) { return '<button class="chip activo" data-quitar="' + esc(id) + '" title="Quitar">🏫 ' + esc(id) + ' ✕</button>'; }).join('');
    if ($('#gQ') !== document.activeElement) $('#gQ').value = g.q;
    $('#gPeriodo').value = g.periodo; $('#gFechas').classList.toggle('oculto', g.periodo !== 'pers');
    $('#gDesde').value = g.desde; $('#gHasta').value = g.hasta; $('#gSinFecha').checked = g.sinFecha;
    var nMas = [g.q, g.periodo, g.servicio, g.fuente].filter(Boolean).length + (g.meses.size ? 1 : 0) + (g.insts.size ? 1 : 0);
    $('#gMasCuenta').textContent = nMas ? nMas + ' activo' + (nMas > 1 ? 's' : '') : '';
    if (nMas) $('#gMas').open = true;
  }

  function pintarGeneral() {
    pintarControlesGeneral();
    pintarChips($('#gChips'), chipsGeneral(), pintarGeneral);
    var g = S.g, rs = filtrarGeneral(), uni = g.medida === 'uni';
    var med = uni ? 'unidades' : 'registros';
    var totUni = rs.reduce(function (s, r) { return s + r.cant; }, 0);
    var instCon = new Set(rs.map(function (r) { return r.inst; }));
    var baseInst = Array.from(Datos.inst.values()).filter(function (i) { return i.enBase && instPasa(i); });
    var sinNada = baseInst.filter(function (i) { return !instCon.has(i.id); });
    var provs = new Set(rs.map(function (r) { return r.prov; }).filter(Boolean));
    var porT = { E: 0, O: 0, A: 0 }; rs.forEach(function (r) { porT[r.t]++; });
    $('#gKpis').innerHTML =
      '<div class="kpi"><div class="et">🧾 Registros</div><div class="val">' + n(rs.length) + '</div><div class="sub">' + TIPOS.filter(function (t) { return g.tipos.has(t); }).map(function (t) { return T[t].nombre + ' ' + n(porT[t]); }).join(' · ') + '</div></div>' +
      '<div class="kpi"><div class="et">📦 Unidades</div><div class="val">' + n(totUni) + '</div><div class="sub">sumando cantidades</div></div>' +
      '<div class="kpi"><div class="et">🏫 Instituciones alcanzadas</div><div class="val">' + n(instCon.size) + '</div><div class="sub">con al menos un registro</div></div>' +
      '<div class="kpi"><div class="et">🚚 Proveedores</div><div class="val">' + n(provs.size) + '</div><div class="sub">con facturación cargada</div></div>' +
      '<div class="kpi click" id="kSinNada"><div class="et">⚠️ Sin ningún registro</div><div class="val">' + n(sinNada.length) + '</div><div class="sub">de ' + n(baseInst.length) + ' en ESTABLECIMIENTOS · ver cuáles</div></div>';
    $('#kSinNada').onclick = function () { S.g.rank = 'sin'; S.g.rankTodas = false; pintarGeneral(); $('#gRank').scrollIntoView({ behavior: 'smooth', block: 'center' }); };

    // Evolución anual
    var anios = valores(rs, function (r) { return r.anio; }).sort();
    if (anios.length) { var a0 = anios[0], a1 = anios[anios.length - 1]; anios = []; for (var a = a0; a <= a1; a++) anios.push(a); }
    var porAnio = new Map(agrupar(rs, function (r) { return r.anio; }).map(function (o) { return [o.k, o]; }));
    G.columnas($('#gAnual'), {
      cats: anios, aria: 'Evolución por año',
      series: TIPOS.filter(function (t) { return g.tipos.has(t); }).map(function (t) { return { id: t, nombre: T[t].nombre, color: 'var(--c-' + t + ')', valores: anios.map(function (a) { var o = porAnio.get(a); return o ? o[t] : 0; }) }; }),
      onClick: function (a) { g.anios = new Set([a]); pintarGeneral(); U.toast('Filtrado: ' + a); }
    });

    // Categorías
    var cats = topConOtros(agrupar(rs, function (r) { return r.cat; }), 14, 'Otras');
    G.barrasH($('#gCats'), cats.map(function (o) {
      return { lab: (o.otros ? '' : U.icono(o.k) + ' ') + esc(o.k) + (o.otros ? ' (' + o.otros + ')' : ''), titulo: o.k, total: o.total, partes: partes(o), sub: med,
        onClick: o.otros ? null : function () { g.cat = o.k; pintarGeneral(); U.toast('Filtrado: ' + o.k); } };
    }));

    // Ranking instituciones: Más · Menos (1 o más) · Sin registros (0)
    var porInst = agrupar(rs, function (r) { return r.inst; });
    var conAlgo = porInst.filter(function (o) { return o.total > 0; });
    var lista, titulo;
    if (g.rank === 'mas') {
      lista = conAlgo.sort(function (a, b) { return b.total - a.total || ordenEs(a.k, b.k); });
      titulo = 'Las que más ' + med + ' tienen';
    } else if (g.rank === 'menos') {
      lista = conAlgo.sort(function (a, b) { return a.total - b.total || ordenEs(a.k, b.k); });
      titulo = 'Las que menos ' + med + ' tienen (con 1 o más)';
    } else {
      lista = sinNada.slice().sort(function (a, b) { return ordenEs(a.id, b.id); }).map(function (i) { return { k: i.id, E: 0, O: 0, A: 0, total: 0 }; });
      titulo = 'Instituciones de ESTABLECIMIENTOS sin ningún registro con estos filtros';
    }
    S.rankLista = lista;
    var mostrar = g.rankTodas ? lista : lista.slice(0, 15);
    $('#gRankSub').textContent = titulo + ' · ' + (g.rankTodas || lista.length <= 15 ? n(lista.length) : '15 de ' + n(lista.length));
    $('#gRankModo').innerHTML = [['mas', 'Más'], ['menos', 'Menos'], ['sin', 'Sin registros <span class="cuenta">' + n(sinNada.length) + '</span>']].map(function (b) {
      return '<button role="tab" data-m="' + b[0] + '" aria-selected="' + (g.rank === b[0]) + '">' + b[1] + '</button>';
    }).join('');
    if (g.rank === 'sin') {
      $('#gRank').innerHTML = lista.length ? '<div class="tabla-caja' + (g.rankTodas ? ' alto-max' : '') + '"><table><thead><tr><th>Institución</th><th>Nivel</th><th>Localidad</th><th>Gestión</th></tr></thead><tbody>' +
        mostrar.map(function (o) { var i = Datos.inst.get(o.k) || {}; return '<tr><td class="inst">' + linkInst(o.k) + '</td><td>' + esc(i.nivel) + '</td><td>' + esc(i.localidad) + '</td><td>' + esc(i.gestion) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="vacio"><span class="grande">✅</span>Todas tienen al menos un registro con estos filtros</div>';
    } else {
      var maxRank = Math.max.apply(null, lista.map(function (o) { return o.total; }).concat([1]));
      G.barrasH($('#gRank'), mostrar.map(function (o) {
        var i = Datos.inst.get(o.k) || {};
        return { lab: '<b>' + esc(o.k) + '</b>', titulo: o.k + (i.completo ? ' · ' + i.completo : ''), sub: [i.nivel, i.localidad].filter(Boolean).join(' · '), total: o.total, partes: partes(o),
          onClick: function () { abrirFicha(o.k); } };
      }), { max: maxRank });
      if (g.rankTodas) $('#gRank .barras-h').classList.add('alto-max');
    }
    $('#gRankPie').innerHTML = (lista.length > 15 ? '<button class="btn btn-secondary btn-sm" id="gRankTodas">' + (g.rankTodas ? '▴ Ver menos' : '▾ Ver todas (' + n(lista.length) + ')') + '</button>' : '') +
      (lista.length ? '<button class="btn btn-secondary btn-sm" id="gRankExcel">⬇️ Excel</button>' : '');
    if ($('#gRankTodas')) $('#gRankTodas').onclick = function () { g.rankTodas = !g.rankTodas; pintarGeneral(); };
    if ($('#gRankExcel')) $('#gRankExcel').onclick = function () {
      var nom = { mas: 'con más', menos: 'con menos', sin: 'sin registros' }[g.rank];
      exportarExcel('Ficha Escuelas - instituciones ' + nom, [{ nombre: 'Instituciones', titulo: 'Instituciones ' + nom + ' (' + med + ')', subtitulo: filtrosTexto() + ' · descargado el ' + hoy(),
        columnas: [{ t: 'Institución', ancho: 18 }, { t: 'Nombre completo', ancho: 40 }, { t: 'Nivel', ancho: 18 }, { t: 'Localidad', ancho: 18 }, { t: 'Gestión', ancho: 12 },
          { t: 'Entregas' }, { t: 'Obras' }, { t: 'Arreglos' }, { t: 'Total' }],
        filas: lista.map(function (o) { var i = Datos.inst.get(o.k) || {}; return [o.k, i.completo || '', i.nivel || '', i.localidad || '', i.gestion || '', o.E, o.O, o.A, o.total]; }) }]);
    };

    // Proveedores
    var pv = topConOtros(agrupar(rs, function (r) { return r.prov; }), 12);
    G.barrasH($('#gProvs'), pv.map(function (o) {
      var info = o.otros ? null : IDX.provs.get(o.k);
      return { lab: esc(o.k) + (o.otros ? ' (' + o.otros + ')' : '') + (info ? '<span class="lab-sub">' + esc(rubrosTexto(info, 2)) + '</span>' : ''), titulo: o.k, total: o.total, partes: partes(o), sub: med,
        tipHtml: info ? tipProveedor(o.k, info) : null,
        onClick: o.otros ? null : function () { mostrarProveedor(o.k); } };
    }), { vacio: 'Los registros filtrados no tienen proveedor (las obras y entregas de BASE DE DATOS no lo cargan)' });
    if (S.provAbierto && !IDX.provs.has(S.provAbierto)) S.provAbierto = null;
    pintarInfoProveedor();

    // Nivel y localidad
    var nv = U.sinAlFinal(agrupar(rs, function (r) { return r.I.nivel || 'Sin dato'; }).sort(function (a, b) { return b.total - a.total; }), function (o) { return o.k; });
    G.barrasH($('#gNiveles'), nv.map(function (o) {
      return { lab: esc(o.k), total: o.total, partes: partes(o), sub: med, onClick: o.k === 'Sin dato' ? null : function () { g.nivel = o.k; pintarGeneral(); } };
    }));
    var lc = topConOtros(agrupar(rs, function (r) { return r.I.localidad || 'Sin dato'; }), 16);
    G.barrasH($('#gLocs'), lc.map(function (o) {
      return { lab: esc(o.k) + (o.otros ? ' (' + o.otros + ')' : ''), total: o.total, partes: partes(o), sub: med,
        onClick: o.otros || o.k === 'Sin dato' ? null : function () { g.localidad = o.k; pintarGeneral(); } };
    }));

    pintarCalor(rs);
  }

  // ── Proveedores: qué hace cada uno, deducido de lo que tiene cargado
  function armarIndices() {
    IDX.porInst = new Map(); IDX.provs = new Map();
    Datos.regs.forEach(function (r) {
      var a = IDX.porInst.get(r.inst); if (!a) IDX.porInst.set(r.inst, a = []); a.push(r);
      if (!r.prov) return;
      var p = IDX.provs.get(r.prov);
      if (!p) IDX.provs.set(r.prov, p = { n: 0, rubros: new Map(), servicios: new Map(), insts: new Set(), anios: new Set(), tipos: {} });
      p.n++; p.rubros.set(r.cat, (p.rubros.get(r.cat) || 0) + 1); p.insts.add(r.inst); if (r.anio) p.anios.add(r.anio); p.tipos[r.t] = (p.tipos[r.t] || 0) + 1;
      var sv = String(r.serv || '').replace(/\s*·\s*ítem.*$/, ''); if (sv) p.servicios.set(sv, (p.servicios.get(sv) || 0) + 1);
    });
  }
  function ordenarMapa(m) { return U.sinAlFinal(Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; }), function (e) { return e[0]; }); }
  function rubrosTexto(p, k) { return ordenarMapa(p.rubros).slice(0, k).map(function (e) { return U.icono(e[0]) + ' ' + e[0]; }).join(' · ') + (p.rubros.size > k ? ' · +' + (p.rubros.size - k) : ''); }
  function aniosTexto(p) { var a = Array.from(p.anios).sort(); return a.length ? (a[0] === a[a.length - 1] ? String(a[0]) : a[0] + '–' + a[a.length - 1]) : 's/f'; }
  function tipProveedor(nom, p) {
    return '<div class="t">' + esc(nom) + '</div><div class="chico muted" style="margin-bottom:.3rem">' + n(p.n) + ' registros · ' + n(p.insts.size) + ' instituciones · ' + aniosTexto(p) + '</div>' +
      ordenarMapa(p.rubros).slice(0, 6).map(function (e) { return '<div class="r"><span>' + U.icono(e[0]) + ' ' + esc(e[0]) + '</span><b>' + n(e[1]) + '</b></div>'; }).join('') +
      (p.servicios.size ? '<div class="chico muted" style="margin-top:.3rem">Contratos: ' + esc(ordenarMapa(p.servicios).slice(0, 3).map(function (e) { return e[0]; }).join(' · ')) + '</div>' : '') +
      '<div class="chico muted" style="margin-top:.25rem">Tocá para ver el resumen</div>';
  }
  function mostrarProveedor(nom) { S.provAbierto = S.provAbierto === nom ? null : nom; pintarInfoProveedor(); if (S.provAbierto) $('#gProvInfo').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  function pintarInfoProveedor() {
    var cont = $('#gProvInfo'), nom = S.provAbierto, p = nom && IDX.provs.get(nom);
    if (!p) { cont.innerHTML = ''; return; }
    var insts = Array.from(p.insts).map(function (id) { return [id, (IDX.porInst.get(id) || []).filter(function (r) { return r.prov === nom; }).length]; }).sort(function (a, b) { return b[1] - a[1]; });
    cont.innerHTML = '<div class="info-prov"><div class="fila" style="justify-content:space-between;align-items:flex-start"><div><b>🚚 ' + esc(nom) + '</b>' +
      '<div class="chico muted">' + n(p.n) + ' registros (' + TIPOS.filter(function (t) { return p.tipos[t]; }).map(function (t) { return T[t].nombre.toLowerCase() + ' ' + n(p.tipos[t]); }).join(', ') + ') · ' +
      n(p.insts.size) + ' instituciones · ' + aniosTexto(p) + '</div></div><button class="btn btn-secondary btn-sm" id="pCerrar" aria-label="Cerrar">✕</button></div>' +
      '<div class="etiquetas">' + ordenarMapa(p.rubros).map(function (e) { return '<span class="etiqueta">' + U.icono(e[0]) + ' ' + esc(e[0]) + ': <b>' + n(e[1]) + '</b></span>'; }).join('') + '</div>' +
      (p.servicios.size ? '<div class="chico" style="margin-top:.5rem"><b>Contratos / órdenes de compra:</b> ' + ordenarMapa(p.servicios).map(function (e) { return esc(e[0]) + ' (' + n(e[1]) + ')'; }).join(' · ') + '</div>' : '') +
      '<div class="chico" style="margin-top:.4rem"><b>Donde más trabajó:</b> ' + insts.slice(0, 8).map(function (x) { return linkInst(x[0]) + ' (' + x[1] + ')'; }).join(' · ') + (insts.length > 8 ? ' …' : '') + '</div>' +
      '<div class="fila" style="margin-top:.7rem"><button class="btn btn-primary btn-sm" id="pFiltrar">📊 Filtrar los gráficos</button><button class="btn btn-secondary btn-sm" id="pRegs">📋 Ver sus registros</button></div></div>';
    $('#pCerrar').onclick = function () { S.provAbierto = null; pintarInfoProveedor(); };
    $('#pFiltrar').onclick = function () { S.g.prov = nom; pintarGeneral(); U.toast('Filtrado: ' + nom); };
    $('#pRegs').onclick = function () { S.r = { q: '', tipo: '', anio: '', cat: '', prov: nom, fuente: '', col: 'orden', dir: -1, pag: 0 }; $('#rTexto').value = ''; irA('registros', true); };
  }

  function datosCalor(rs) {
    var catsT = U.sinAlFinal(agrupar(rs, function (r) { return r.cat; }).sort(function (a, b) { return b.total - a.total; }).map(function (o) { return o.k; }));
    var filas = agrupar(rs, function (r) { return r.inst; }).sort(function (a, b) { return b.total - a.total; }).slice(0, S.g.calorN);
    var celdas = new Map();
    rs.forEach(function (r) { var k = r.inst + '|' + r.cat; celdas.set(k, (celdas.get(k) || 0) + medida(r)); });
    return { cats: catsT, filas: filas, celdas: celdas };
  }
  function pintarCalor(rs) {
    var d = datosCalor(rs), dark = document.documentElement.classList.contains('dark');
    if (!d.filas.length) { $('#gCalor').innerHTML = '<div class="vacio"><span class="grande">📭</span>Sin datos para estos filtros</div>'; return; }
    var max = 0; d.celdas.forEach(function (v) { if (v > max) max = v; });
    $('#gCalor').innerHTML = '<table><thead><tr><th>Institución</th>' + d.cats.map(function (c) { return '<th class="rot" title="' + esc(c) + '"><span class="ico">' + U.icono(c) + '</span> ' + esc(c) + '</th>'; }).join('') +
      '<th class="num">Total</th></tr></thead><tbody>' + d.filas.map(function (f) {
        return '<tr><td class="inst">' + linkInst(f.k) + '</td>' + d.cats.map(function (c) {
          var v = d.celdas.get(f.k + '|' + c) || 0, s = G.secuencial(v / max), i = s.bg.match(/\d/);
          var claro = dark ? (i && +i[0] >= 5) : (i && +i[0] >= 4);
          return '<td class="c' + (v ? '' : ' cero') + '" style="background:' + s.bg + ';color:' + (v ? (claro ? (dark ? '#0f172a' : '#fff') : 'var(--text-primary)') : '') + '" title="' + esc(f.k + ' · ' + c + ': ' + n(v)) + '">' + (v ? n(v) : '·') + '</td>';
        }).join('') + '<td class="num"><b>' + n(f.total) + '</b></td></tr>';
      }).join('') + '</tbody></table>';
    pintarCalor.ultimo = d;
  }

  // ───────────────────────── REGISTROS
  function filtrarRegistros() {
    var r = S.r, q = U.norm(r.q), partesQ = q ? q.split(' ') : [], rg = rangoPeriodo(r.periodo, r.desde, r.hasta), min = Number(r.cantMin) || 0;
    var inst = r.inst ? (Datos.inst.has(r.inst.trim().toUpperCase()) ? r.inst.trim().toUpperCase() : null) : '';
    var instQ = r.inst && inst === null ? U.norm(r.inst) : '';
    return Datos.regs.filter(function (x) {
      return (!r.tipo || x.t === r.tipo) && (!r.anio || String(x.anio) === r.anio) && (!r.cat || x.cat === r.cat) && (!r.prov || x.prov === r.prov) && (!r.fuente || x.fuente === r.fuente) &&
        enRango(x, rg, r.sinFecha) && (!r.mes || pasaMes(x, r.mes, r.sinFecha)) && (!min || x.cant >= min) &&
        (!inst || x.inst === inst) && (!instQ || x.I.busca.indexOf(instQ) >= 0) &&
        (!r.nivel || x.I.nivel === r.nivel) && (!r.gestion || x.I.gestion === r.gestion) && (!r.localidad || x.I.localidad === r.localidad) &&
        (!partesQ.length || partesQ.every(function (p) { return x.busca.indexOf(p) >= 0; }));
    });
  }
  var CLAVE_FILTROS_R = 'sae-filtros-registros';
  function guardarFiltrosR() { try { var o = aUrl(S.r); delete o.pag; localStorage.setItem(CLAVE_FILTROS_R, JSON.stringify(o)); } catch (e) {} }
  function restaurarFiltrosR() {
    try { var o = JSON.parse(localStorage.getItem(CLAVE_FILTROS_R) || 'null'); if (!o) return; var r = rNuevo(); Object.keys(o).forEach(function (k) { if (k in r) r[k] = o[k]; }); S.r = r; } catch (e) {}
  }
  function chipsRegistros() {
    var r = S.r, L = [];
    if (r.tipo) L.push(['Tipo: ' + T[r.tipo].nombre, function () { r.tipo = ''; r.cat = ''; }]);
    if (r.periodo) L.push([textoPeriodo(r), function () { r.periodo = ''; r.desde = ''; r.hasta = ''; }]);
    if (r.mes) L.push(['Mes: ' + MESES[+r.mes - 1], function () { r.mes = ''; }]);
    if (r.cantMin) L.push(['Cantidad ≥ ' + r.cantMin, function () { r.cantMin = ''; }]);
    [['q', 'Texto'], ['anio', 'Año'], ['cat', 'Categoría'], ['prov', 'Proveedor'], ['fuente', 'Planilla'], ['inst', 'Institución'], ['nivel', 'Nivel'], ['gestion', 'Gestión'], ['localidad', 'Localidad']].forEach(function (x) {
      if (r[x[0]]) L.push([x[1] + ': ' + r[x[0]], function () { r[x[0]] = ''; }]);
    });
    if (!r.agrupar) L.push(['Arreglos sin agrupar', function () { r.agrupar = true; }]);
    return L;
  }
  function pintarRegistros() {
    var r = S.r;
    U.opciones($('#rTipo'), TIPOS.map(function (t) { return [t, T[t].icono + ' ' + T[t].nombre]; }), 'Todos', r.tipo);
    var base = Datos.regs.filter(function (x) { return !r.tipo || x.t === r.tipo; });
    U.opciones($('#rAnio'), valores(Datos.regs, function (x) { return x.anio; }).sort().reverse(), 'Todos', r.anio);
    U.opciones($('#rCat'), valores(base, function (x) { return x.cat; }).sort(U.ordenTexto), 'Todas', r.cat);
    U.opciones($('#rFuente'), valores(Datos.regs, function (x) { return x.fuente; }).sort(), 'Todas', r.fuente);
    opcionesProv($('#rProv'), valores(base, function (x) { return x.prov; }), r.prov);
    var insts = Array.from(Datos.inst.values());
    U.opciones($('#rNivel'), valores(insts, function (i) { return i.nivel; }).sort(U.ordenTexto), 'Todos', r.nivel);
    U.opciones($('#rGestion'), valores(insts, function (i) { return i.gestion; }).sort(U.ordenTexto), 'Todas', r.gestion);
    U.opciones($('#rLocalidad'), valores(insts, function (i) { return i.localidad; }).sort(U.ordenTexto), 'Todas', r.localidad);
    U.opciones($('#rMes'), MESES.map(function (m, k) { return [String(k + 1).padStart(2, '0'), m]; }), 'Todos', r.mes);
    if ($('#rTexto') !== document.activeElement) $('#rTexto').value = r.q;
    if ($('#rInst') !== document.activeElement) $('#rInst').value = r.inst;
    if ($('#rCantMin') !== document.activeElement) $('#rCantMin').value = r.cantMin;
    $('#rPeriodo').value = r.periodo; $('#rFechas').classList.toggle('oculto', r.periodo !== 'pers'); $('#rDesde').value = r.desde; $('#rHasta').value = r.hasta;
    $('#rSinFecha').checked = r.sinFecha; $('#rAgrupar').checked = r.agrupar;
    var nMas = [r.periodo, r.mes, r.inst, r.nivel, r.gestion, r.localidad, r.cantMin].filter(Boolean).length + (r.agrupar ? 0 : 1);
    $('#rMasCuenta').textContent = nMas ? nMas + ' activo' + (nMas > 1 ? 's' : '') : '';
    if (nMas) $('#rMas').open = true;
    pintarChips($('#rChips'), chipsRegistros(), function () { S.r.pag = 0; pintarRegistros(); });
    guardarFiltrosR();
    var sueltos = filtrarRegistros();
    var rs = r.agrupar ? agruparArreglos(sueltos, true) : sueltos;
    var col = r.col, dir = r.dir;
    rs.sort(function (a, b) {
      var va = col === 'inst' ? a.inst : a[col], vb = col === 'inst' ? b.inst : b[col];
      if (typeof va === 'number' || typeof vb === 'number') return ((va || 0) - (vb || 0)) * dir;
      return ordenEs(va || '', vb || '') * dir;
    });
    var u = sueltos.reduce(function (s, x) { return s + x.cant; }, 0), nGr = rs.filter(function (x) { return x.grupo; }).length;
    $('#rSub').textContent = n(sueltos.length) + ' registros · ' + n(u) + ' unidades' + (sueltos.length !== Datos.regs.length ? ' (de ' + n(Datos.regs.length) + ')' : '') +
      (nGr ? ' · ' + n(nGr) + ' grupos por día (tocá uno para ver el detalle)' : '');
    var pags = Math.max(1, Math.ceil(rs.length / POR_PAGINA)); if (r.pag >= pags) r.pag = pags - 1;
    var cel = esCel(), verR = cel ? tandaCel(r, ['q', 'tipo', 'anio', 'cat', 'prov', 'fuente', 'col', 'dir', 'periodo', 'desde', 'hasta', 'sinFecha', 'mes', 'inst', 'nivel', 'gestion', 'localidad', 'cantMin', 'agrupar'].map(function (k) { return r[k]; }).join('|')) : 0;
    var vis = cel ? rs.slice(0, verR) : rs.slice(r.pag * POR_PAGINA, (r.pag + 1) * POR_PAGINA);
    $('#rTabla').innerHTML = vis.length ? tablaRegs(vis, true, { col: col, dir: dir }) : '<div class="vacio"><span class="grande">🔍</span>No hay registros con estos filtros</div>';
    $('#rPaginas').innerHTML = cel ? botonVerMas(vis.length, rs.length) : rs.length > POR_PAGINA ? '<span>Mostrando ' + n(r.pag * POR_PAGINA + 1) + '–' + n(r.pag * POR_PAGINA + vis.length) + ' de ' + n(rs.length) + '</span><span class="fila">' +
      '<button class="btn btn-secondary btn-sm" data-p="-1"' + (r.pag ? '' : ' disabled') + '>◀ Anterior</button><span>Página ' + (r.pag + 1) + ' de ' + pags + '</span>' +
      '<button class="btn btn-secondary btn-sm" data-p="1"' + (r.pag < pags - 1 ? '' : ' disabled') + '>Siguiente ▶</button></span>' : '';
    $$('#rPaginas button[data-p]').forEach(function (b) { b.onclick = function () { r.pag += +b.dataset.p; pintarRegistros(); $('#rTabla').scrollIntoView({ block: 'start', behavior: 'smooth' }); }; });
    var vmR = $('#rPaginas [data-ver-mas]'); if (vmR) vmR.onclick = function () { r._ver += POR_TANDA_CEL; pintarRegistros(); };
    $$('#rTabla th.ord').forEach(function (th) {
      th.onclick = function () { var c = th.dataset.col; if (r.col === c) r.dir *= -1; else { r.col = c; r.dir = c === 'orden' || c === 'cant' ? -1 : 1; } r.pag = 0; pintarRegistros(); };
    });
    pintarRegistros.ultimos = rs;
  }

  // ───────────────────────── CALIDAD
  function institucionesFuera() {
    return Array.from(Datos.inst.values()).filter(function (i) { return !i.enBase && i.id !== 'SIN DATOS' && (i.E + i.O + i.A); });
  }
  var PROBLEMAS = [
    ['fuera', '🏫', 'No está en ESTABLECIMIENTOS', 'Tiene registros pero no figura en la base. Si falta, agregala en ESTABLECIMIENTOS; si es otra institución escrita distinto, se suma en ALIAS del Apps Script.'],
    ['sin_inst', '❓', 'Fila sin institución', 'El registro no dice a qué institución va, así que no aparece en ninguna ficha. Completá la celda.'],
    ['otra_inst', '🔀', 'El detalle nombra otra institución', 'La obra está cargada en una escuela pero el detalle menciona otra. Revisá cuál es la correcta.'],
    ['sin_datos', '🚫', 'Cargada como "SIN DATOS"', 'La institución figura como SIN DATOS. Si se sabe cuál es, reemplazalo.'],
    ['sin_tipo', '🏗️', 'Obra sin tipo', 'La obra no tiene "Tipo de Obra". En la página aparece como "Sin tipo".'],
    ['repetida', '📑', 'Repetida en ESTABLECIMIENTOS', 'La misma institución está dos veces en la base; la página usa la primera.'],
    ['alias', '✏️', 'Escrita de otra forma (ya unificada)', 'La página ya la junta con la correcta. No hace falta hacer nada; si querés dejarlo prolijo, corregí el nombre en la planilla.'],
    ['hoja', '❌', 'Hoja que no se pudo leer', 'Revisá que la hoja exista con ese nombre y que la cuenta del Apps Script tenga acceso.'],
    ['otros', '⚠️', 'Otros avisos', 'Avisos de una versión anterior del Apps Script.']
  ];
  function problemasCalidad() {
    var L = [];
    institucionesFuera().forEach(function (i) {
      L.push({ tipo: 'fuera', h: i.ref ? i.ref[0] : '', ref: i.ref, inst: i.id,
        texto: i.id + ' · ' + [i.E ? i.E + ' entregas' : '', i.O ? i.O + ' obras' : '', i.A ? i.A + ' arreglos' : ''].filter(Boolean).join(', ') +
          ((i.alias || []).length ? ' · escrita como: ' + i.alias.join(' / ') : '') });
    });
    Datos.inst.forEach(function (i) {
      (i.alias || []).forEach(function (a) {
        var ref = i.aliasRef && Array.isArray(i.aliasRef[a]) ? i.aliasRef[a] : null;
        L.push({ tipo: 'alias', h: ref ? ref[0] : '', ref: ref, inst: i.id, texto: '“' + a + '” se tomó como ' + i.id });
      });
    });
    Datos.avisos.forEach(function (a) {
      var t = a.tipo && PROBLEMAS.some(function (p) { return p[0] === a.tipo; }) ? a.tipo : 'otros';
      L.push({ tipo: t, h: a.h || '', hojaNom: a.hoja, fila: a.fila, ref: a.h && a.fila ? [a.h, a.fila, a.col || 1] : null, texto: a.texto });
    });
    return L;
  }
  function pintarCalidad() {
    var L = problemasCalidad();
    var hojas = valores(L, function (x) { return x.h; });
    if (S.calHoja && hojas.indexOf(S.calHoja) < 0) S.calHoja = '';
    var cq = U.norm(S.cal.q), ci = U.norm(S.cal.inst);
    var aniosCal = valores(L, function (x) { var m = String(x.texto).match(/\b(20\d\d)\b/); return m ? m[1] : ''; }).sort().reverse();
    var Lf = L.filter(function (x) {
      return (!S.calHoja || x.h === S.calHoja) && (!cq || U.norm(x.texto).indexOf(cq) >= 0) &&
        (!ci || U.norm((x.inst || '') + ' ' + x.texto).indexOf(ci) >= 0) && (!S.cal.anio || String(x.texto).indexOf(S.cal.anio) >= 0);
    });
    var fuera = L.filter(function (x) { return x.tipo === 'fuera'; }).length, alias = L.filter(function (x) { return x.tipo === 'alias'; }).length;
    var html = '<div class="aviso" style="margin-bottom:1rem">🩺 <b>Qué es esto:</b> la lista de cosas que no cierran en las planillas, agrupadas por problema. ' +
      'La página <b>no corrige nada</b>: tocá <b>↗ Ir a la celda</b> para abrir la planilla justo donde hay que revisar. Cuando se corrige en la planilla, ' +
      'el aviso desaparece la próxima vez que tocás 🔄 Actualizar.</div>' +
      '<div class="kpis"><div class="kpi"><div class="et">🧾 Para revisar</div><div class="val">' + n(L.length - alias) + '</div><div class="sub">sin contar los nombres ya unificados</div></div>' +
      '<div class="kpi"><div class="et">🏫 Fuera de ESTABLECIMIENTOS</div><div class="val">' + n(fuera) + '</div><div class="sub">instituciones con registros</div></div>' +
      '<div class="kpi"><div class="et">✏️ Nombres unificados</div><div class="val">' + n(alias) + '</div><div class="sub">no hace falta hacer nada</div></div></div>';
    html += '<article class="card"><div class="card-header"><div><h2>🩺 Problemas por tipo</h2><p class="card-subtitle">' + n(Lf.length) + ' avisos' + (S.calHoja ? ' en ' + esc(U.nombreHoja(S.calHoja)) : '') + '</p></div>' +
      '<button class="btn btn-secondary btn-sm solo-pc" id="cExcel">⬇️ Excel</button></div><div class="card-body">' +
      '<div class="campo" style="margin-bottom:.8rem"><label>Planilla</label><div class="chips" id="cHojas"><button class="chip" data-h="" aria-pressed="' + !S.calHoja + '">Todas</button>' +
      hojas.sort(function (a, b) { return ordenEs(U.nombreHoja(a), U.nombreHoja(b)); }).map(function (h) {
        return '<button class="chip" data-h="' + esc(h) + '" aria-pressed="' + (S.calHoja === h) + '">' + esc(U.nombreHoja(h)) + ' <span class="n">' + L.filter(function (x) { return x.h === h; }).length + '</span></button>';
      }).join('') + '</div></div>' +
      '<div class="filtros" style="margin-bottom:.8rem"><div class="campo ancho"><label for="cQ">Buscar en los avisos</label><input type="search" id="cQ" placeholder="ej. termotanque, sin tipo" value="' + esc(S.cal.q) + '"></div>' +
      '<div class="campo"><label for="cInst">Institución</label><input type="search" id="cInst" list="dlInst" placeholder="EP 12…" value="' + esc(S.cal.inst) + '"></div>' +
      '<div class="campo"><label for="cAnio">Año</label><select id="cAnio"><option value="">Todos</option>' + aniosCal.map(function (a) { return '<option' + (S.cal.anio === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="chips filtros-activos" id="cChips" style="margin-bottom:.6rem"></div>';
    var grupos = PROBLEMAS.map(function (p) { return { p: p, items: Lf.filter(function (x) { return x.tipo === p[0]; }) }; }).filter(function (g) { return g.items.length; });
    html += grupos.length ? grupos.map(function (g) {
      return '<details class="grupo-avisos"><summary><span>' + g.p[1] + ' ' + esc(g.p[2]) + '</span> <span class="pill sin">' + n(g.items.length) + '</span></summary>' +
        '<div class="chico muted" style="margin:0 0 .6rem">' + esc(g.p[3]) + '</div><div class="lista-avisos" style="padding-bottom:.8rem">' +
        g.items.slice(0, 500).map(function (x) {
          var donde = x.ref ? U.nombreHoja(x.ref[0]) + (x.ref[1] ? ' · celda ' + U.celdaTexto(x.ref) : '') : (x.hojaNom ? x.hojaNom + (x.fila ? ' · fila ' + x.fila : '') : '');
          var ir = x.ref && Datos.hojas[x.ref[0]];
          return '<div class="aviso-fila' + (ir ? ' click' : '') + '"' + (ir ? ' data-ref="' + esc(x.ref.join('|')) + '" role="button" tabindex="0" title="Abrir ' + esc(donde) + '"' : '') + '><div><div>' + esc(x.texto) + '</div>' +
            '<div class="chico muted">' + esc(donde) + (x.inst ? ' · <a class="ver-ficha" data-inst="' + esc(x.inst) + '">Ver ficha</a>' : '') + '</div></div>' +
            (ir ? '<span class="btn-ir con-texto" aria-hidden="true">↗ Ir a la celda</span>' : '') + '</div>';
        }).join('') + (g.items.length > 500 ? '<div class="chico muted">Se muestran 500 de ' + n(g.items.length) + '. Bajá el Excel para verlos todos.</div>' : '') + '</div></details>';
    }).join('') : '<div class="vacio"><span class="grande">✅</span>Sin problemas' + (S.calHoja ? ' en esta planilla' : '') + '</div>';
    html += '</div></article>';
    $('#calidad').innerHTML = html;
    $('#cHojas').onclick = function (e) { var b = e.target.closest('[data-h]'); if (b) { S.calHoja = b.dataset.h; pintarCalidad(); } };
    $('#cQ').oninput = U.debounce(function () { S.cal.q = this.value; pintarCalidad(); var el = $('#cQ'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 300);
    $('#cInst').onchange = function () { S.cal.inst = this.value.trim(); pintarCalidad(); };
    $('#cAnio').onchange = function () { S.cal.anio = this.value; pintarCalidad(); };
    var cl = [];
    if (S.calHoja) cl.push(['Planilla: ' + U.nombreHoja(S.calHoja), function () { S.calHoja = ''; }]);
    if (S.cal.q) cl.push(['Texto: ' + S.cal.q, function () { S.cal.q = ''; }]);
    if (S.cal.inst) cl.push(['Institución: ' + S.cal.inst, function () { S.cal.inst = ''; }]);
    if (S.cal.anio) cl.push(['Año: ' + S.cal.anio, function () { S.cal.anio = ''; }]);
    pintarChips($('#cChips'), cl, pintarCalidad);
    $('#cExcel').onclick = function () {
      exportarExcel('Ficha Escuelas - calidad de datos', [{ nombre: 'Para revisar', titulo: 'Calidad de datos · para revisar', subtitulo: (S.calHoja ? U.nombreHoja(S.calHoja) + ' · ' : '') + 'descargado el ' + hoy(),
        columnas: [{ t: 'Problema', ancho: 34 }, { t: 'Planilla', ancho: 26 }, { t: 'Celda', ancho: 9 }, { t: 'Detalle', ancho: 90 }],
        filas: U.sinAlFinal(PROBLEMAS.map(function (p) { return p; })).reduce(function (acc, p) {
          return acc.concat(Lf.filter(function (x) { return x.tipo === p[0]; }).map(function (x) { return [p[2], x.ref ? U.nombreHoja(x.ref[0]) : (x.hojaNom || ''), x.ref ? U.celdaTexto(x.ref) : (x.fila || ''), x.texto]; }));
        }, []) }]);
    };
  }

  // ───────────────────────── eventos
  function iniciar() {
    leerUrl();
    restaurarFiltrosR();
    aplicarFiltrosUrl();
    $$('#nav button').forEach(function (b) { b.onclick = function () { irA(b.dataset.vista, true); }; });
    // celular: abrir/cerrar cajas de filtros, tarjetas de escuelas y reclamos
    document.addEventListener('click', function (e) {
      var pl = e.target.closest('[data-plegar]');
      if (pl) { var id = pl.dataset.plegar; if (PLEG_ABIERTOS.has(id)) PLEG_ABIERTOS.delete(id); else PLEG_ABIERTOS.add(id); aplicarPleg(id); return; }
      var rec = e.target.closest('.reclamo');
      if (rec && esCel() && !e.target.closest('a,button')) { var ab = rec.classList.toggle('abierto'); if (ab) REC_ABIERTOS.add(rec.dataset.rec); else REC_ABIERTOS.delete(rec.dataset.rec); return; }
      var fi = e.target.closest('tr.fila-inst');
      if (fi && !e.target.closest('a')) { abrirFicha(fi.dataset.abrir); }
    });
    // links a fichas desde cualquier tabla
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-inst]'); if (a) { e.preventDefault(); abrirFicha(a.dataset.inst); return; }
      var b = e.target.closest('[data-ref]');
      if (b) { e.preventDefault(); var p = b.dataset.ref.split('|'); U.abrirCelda([p[0], +p[1], +p[2]]); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.aviso-fila[data-ref]')) { e.preventDefault(); e.target.click(); }
    });

    var q = $('#q');
    q.addEventListener('input', U.debounce(function () { pintarSug(); pintarLista(); }, 120));
    q.addEventListener('focus', function () { if (q.value.trim()) pintarSug(); });
    q.addEventListener('blur', function () { setTimeout(cerrarSug, 150); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moverSug(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moverSug(-1); }
      else if (e.key === 'Enter') { if (sugIdx >= 0 && sugLista[sugIdx]) abrirFicha(sugLista[sugIdx].id); }
      else if (e.key === 'Escape') cerrarSug();
    });
    $('#bCosa').addEventListener('input', U.debounce(function () { guardarFiltrosB(); if (S.inst) { S.inst = null; guardarUrl(true); pintar(); } else pintarLista(); }, 250));
    CAMPOS_B.forEach(function (k) { if (k === 'bCosa') return; $('#' + k).addEventListener('change', function () { delete this.dataset.pendiente; if (k === 'bOrden' && this.value) { var p = this.value.split('|'); S.lista = { col: p[0], dir: +p[1] }; } guardarFiltrosB(); pintarLista(); }); });
    $('#bLimpiar').onclick = limpiarFiltrosB;
    restaurarFiltrosB();
    if ($('#bOrden').value) { var po = $('#bOrden').value.split('|'); S.lista = { col: po[0], dir: +po[1] }; }
    $('#btnExcelInst').onclick = function () {
      var arr = pintarLista.ultima || [];
      exportarExcel('Ficha Escuelas - instituciones', [{ nombre: 'Instituciones', titulo: 'Instituciones · entregas, obras y arreglos', subtitulo: 'Descargado el ' + hoy(),
        columnas: [{ t: 'Institución', ancho: 18 }, { t: 'Nombre completo', ancho: 40 }, { t: 'Nivel', ancho: 18 }, { t: 'Gestión', ancho: 12 }, { t: 'Localidad', ancho: 18 },
          { t: 'Entregas' }, { t: 'Unidades entregadas' }, { t: 'Obras' }, { t: 'Arreglos' }, { t: 'Último año', ancho: 10 }, { t: '¿En la base?', ancho: 11 }],
        filas: arr.map(function (i) { return [i.id, i.completo, i.nivel, i.gestion, i.localidad, i.E, i.uE, i.O, i.A, i.ultimoAnio || '', i.enBase ? 'Sí' : 'No']; }) }]);
    };

    // Vista general
    $('#gTipos').addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      var t = b.dataset.t; if (S.g.tipos.has(t)) { if (S.g.tipos.size > 1) S.g.tipos.delete(t); } else S.g.tipos.add(t);
      S.g.cat = ''; pintarGeneral();
    });
    $('#gAnios').addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a; if (!a) S.g.anios.clear(); else { a = +a; if (S.g.anios.has(a)) S.g.anios.delete(a); else S.g.anios.add(a); }
      pintarGeneral();
    });
    [['#gCat', 'cat'], ['#gNivel', 'nivel'], ['#gGestion', 'gestion'], ['#gLocalidad', 'localidad'], ['#gProv', 'prov']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { S.g[p[1]] = this.value; pintarGeneral(); });
    });
    $('#gMedida').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) { S.g.medida = b.dataset.m; pintarGeneral(); } });
    $('#gRankModo').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) { S.g.rank = b.dataset.m; S.g.rankTodas = false; pintarGeneral(); } });
    $('#gCalorN').addEventListener('change', function () { S.g.calorN = +this.value; pintarCalor(filtrarGeneral()); });
    $('#gLimpiar').onclick = function () { S.g = gNuevo(S.g.medida, S.g.calorN); pintarGeneral(); };
    $('#gLinkF').onclick = function () { var o = Object.assign({}, S.g); delete o.rankTodas; linkConFiltros('general', o); };
    $('#gQ').addEventListener('input', U.debounce(function () { S.g.q = this.value; pintarGeneral(); }, 250));
    [['#gServicio', 'servicio'], ['#gFuente', 'fuente'], ['#gDesde', 'desde'], ['#gHasta', 'hasta']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { S.g[p[1]] = this.value; pintarGeneral(); });
    });
    $('#gPeriodo').addEventListener('change', function () { S.g.periodo = this.value; if (this.value !== 'pers') { S.g.desde = ''; S.g.hasta = ''; } pintarGeneral(); });
    $('#gSinFecha').addEventListener('change', function () { S.g.sinFecha = this.checked; pintarGeneral(); });
    $('#gMeses').addEventListener('click', function (e) { var b = e.target.closest('[data-mes]'); if (!b) return; var m = b.dataset.mes;
      if (S.g.meses.has(m)) S.g.meses.delete(m); else S.g.meses.add(m); pintarGeneral(); });
    function agregarInst() {
      var v = $('#gInstAgregar').value.trim().toUpperCase(); if (!v) return;
      var id = Datos.inst.has(v) ? v : (buscarInst(v)[0] || {}).id;
      if (!id) { U.toast('No encontré “' + v + '”'); return; }
      S.g.insts.add(id); $('#gInstAgregar').value = ''; pintarGeneral();
    }
    $('#gInstAgregar').addEventListener('change', agregarInst);
    $('#gInstAgregar').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); agregarInst(); } });
    $('#gInsts').addEventListener('click', function (e) { var b = e.target.closest('[data-quitar]'); if (b) { S.g.insts.delete(b.dataset.quitar); pintarGeneral(); } });
    $('#gCalorExcel').onclick = function () {
      var d = pintarCalor.ultimo; if (!d) return;
      exportarExcel('Ficha Escuelas - institucion x categoria', [{ nombre: 'Institución x categoría', titulo: 'Institución × categoría (' + (S.g.medida === 'uni' ? 'unidades' : 'registros') + ')',
        subtitulo: 'Descargado el ' + hoy(), columnas: [{ t: 'Institución', ancho: 18 }].concat(d.cats.map(function (c) { return { t: c, ancho: 12 }; }), [{ t: 'Total', ancho: 10 }]),
        filas: d.filas.map(function (f) { return [f.k].concat(d.cats.map(function (c) { return d.celdas.get(f.k + '|' + c) || 0; }), [f.total]); }) }]);
    };

    // Registros
    $('#rTexto').addEventListener('input', U.debounce(function () { S.r.q = this.value; S.r.pag = 0; pintarRegistros(); }, 200));
    [['#rTipo', 'tipo'], ['#rAnio', 'anio'], ['#rCat', 'cat'], ['#rProv', 'prov'], ['#rFuente', 'fuente'], ['#rMes', 'mes'], ['#rNivel', 'nivel'], ['#rGestion', 'gestion'],
     ['#rLocalidad', 'localidad'], ['#rDesde', 'desde'], ['#rHasta', 'hasta']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { S.r[p[1]] = this.value; if (p[1] === 'tipo') S.r.cat = ''; S.r.pag = 0; pintarRegistros(); });
    });
    $('#rPeriodo').addEventListener('change', function () { S.r.periodo = this.value; if (this.value !== 'pers') { S.r.desde = ''; S.r.hasta = ''; } S.r.pag = 0; pintarRegistros(); });
    $('#rInst').addEventListener('change', function () { S.r.inst = this.value.trim(); S.r.pag = 0; pintarRegistros(); });
    $('#rCantMin').addEventListener('input', U.debounce(function () { S.r.cantMin = this.value; S.r.pag = 0; pintarRegistros(); }, 300));
    $('#rSinFecha').addEventListener('change', function () { S.r.sinFecha = this.checked; S.r.pag = 0; pintarRegistros(); });
    $('#rAgrupar').addEventListener('change', function () { S.r.agrupar = this.checked; S.r.pag = 0; pintarRegistros(); });
    $('#rLimpiar').onclick = function () { var c = S.r.col, d = S.r.dir; S.r = rNuevo(); S.r.col = c; S.r.dir = d; pintarRegistros(); };
    $('#rLinkF').onclick = function () { var o = Object.assign({}, S.r); delete o.pag; linkConFiltros('registros', o); };
    $('#rExcel').onclick = function () {
      var rs = pintarRegistros.ultimos || [];
      exportarExcel('Ficha Escuelas - registros', [{ nombre: 'Registros', titulo: 'Entregas, obras y arreglos', subtitulo: chipsRegistros().map(function (x) { return x[0]; }).join(' · ') + (chipsRegistros().length ? ' · ' : '') + 'descargado el ' + hoy(), columnas: colsExcel(), filas: filasExcel(rs) }]);
    };
    // Abrir / cerrar grupos de arreglos (cualquier tabla)
    document.addEventListener('click', function (e) {
      var tr = e.target.closest('tr.fila-grupo, tr.fila-sub'); if (!tr || e.target.closest('a, button')) return; alternarGrupo(tr);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr.fila-grupo, tr.fila-sub')) { e.preventDefault(); alternarGrupo(e.target); }
    });

    // Encabezado
    $('#btnActualizar').onclick = function () { Datos.cargar(true); };
    prepararApp();
    var bm = $('#btnModo'), h = document.documentElement;
    function pintarModo() { var o = h.classList.contains('dark'); bm.textContent = o ? '☀️' : '🌙'; bm.setAttribute('aria-label', o ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'); }
    bm.onclick = function () { var o = h.classList.toggle('dark'); try { localStorage.setItem('modo-oscuro', o); } catch (e) {} pintarModo(); if (S.vista === 'general') pintarCalor(filtrarGeneral()); };
    pintarModo();

    window.addEventListener('resize', U.debounce(function () { if (Datos.listo && (S.vista === 'general' || S.inst)) pintar(); }, 250));

    // Selectores del buscador (se llenan cuando llegan los datos)
    Datos.alCambiar(function () {
      var insts = Array.from(Datos.inst.values());
      U.opciones($('#bNivel'), valores(insts, function (i) { return i.nivel; }).sort(U.ordenTexto), 'Todos', $('#bNivel').value);
      U.opciones($('#bGestion'), valores(insts, function (i) { return i.gestion; }).sort(U.ordenTexto), 'Todas', $('#bGestion').value);
      U.opciones($('#bLocalidad'), valores(insts, function (i) { return i.localidad; }).sort(U.ordenTexto), 'Todas', $('#bLocalidad').value);
      U.opciones($('#bTieneCat'), valores(Datos.regs, function (r) { return r.cat; }).sort(U.ordenTexto).map(function (c) { return [c, U.icono(c) + ' ' + c]; }), 'Cualquiera', $('#bTieneCat').value);
      opcionesProv($('#bProv'), valores(Datos.regs, function (r) { return r.prov; }), $('#bProv').value);
      ['bNivel', 'bGestion', 'bLocalidad', 'bTieneCat', 'bProv'].forEach(function (k) { var el = $('#' + k); if (el.dataset.pendiente) { el.value = el.dataset.pendiente; if (el.value === el.dataset.pendiente) delete el.dataset.pendiente; } });
      if (['bInactiva', 'bDesde', 'bHasta', 'bTieneCat', 'bProv'].some(function (k) { return $('#' + k).value; })) $('#bMas').open = true;
      armarIndices();
      Datos.precalentarReclamos();
      $('#dlInst').innerHTML = insts.filter(function (i) { return i.E + i.O + i.A || i.enBase; }).sort(function (a, b) { return ordenEs(a.id, b.id); })
        .map(function (i) { return '<option value="' + esc(i.id) + '">' + esc(i.completo || '') + '</option>'; }).join('');
      pintar();
    });
    U.opciones($('#bNivel'), [], 'Todos'); U.opciones($('#bGestion'), [], 'Todas'); U.opciones($('#bLocalidad'), [], 'Todas');
    U.opciones($('#bTieneCat'), [], 'Cualquiera'); U.opciones($('#bProv'), [], 'Todos');
    irA(S.vista, false);
    Datos.cargar(false);
  }
  // ───────────────────────── Celular: barra fija de la ficha (v0.8.0)
  function barraFicha(i, regs) {
    var b = $('#barraFicha'); if (!b) return;
    b.innerHTML = '<button type="button" data-b="volver">←<span>Volver</span></button>' +
      '<a href="' + esc(urlComoLlegar(i)) + '" target="_blank" rel="noopener">🧭<span>Cómo llegar</span></a>' +
      '<button type="button" data-b="visita" class="principal">📄<span>Ficha / PDF</span></button>' +
      '<button type="button" data-b="link">🔗<span>Link</span></button>';
    b.hidden = false; document.body.classList.add('con-ficha');
    b.onclick = function (e) {
      var x = e.target.closest('[data-b]'); if (!x) return;
      if (x.dataset.b === 'volver') { S.inst = null; guardarUrl(true); pintar(); window.scrollTo({ top: 0 }); }
      else if (x.dataset.b === 'visita') abrirVisita(i, regs);
      else if (x.dataset.b === 'link') copiarTexto(location.origin + location.pathname + '?vista=buscador&inst=' + encodeURIComponent(i.id), '🔗 Link de ' + i.id + ' copiado');
    };
  }
  function ocultarBarraFicha() { var b = $('#barraFicha'); if (b) { b.hidden = true; b.innerHTML = ''; } document.body.classList.remove('con-ficha'); }

  // ───────────────────────── App instalable y sin internet (v0.7.0)
  function prepararApp() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Sin modo sin internet:', e); }); });
    }
    vigilarVersion();
    try {   // para "Estado del sistema": qué versión se abrió en este dispositivo
      localStorage.setItem('fe-version-abierta', JSON.stringify({ v: CONFIG.VERSION_PAGINA, t: Date.now(),
        app: (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true }));
    } catch (e) {}
    var btn = $('#btnInstalar'), pedido = null;
    var instalada = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (instalada) return;
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); pedido = e; btn.classList.remove('oculto'); });
    window.addEventListener('appinstalled', function () { pedido = null; btn.classList.add('oculto'); U.toast('✅ Listo: quedó instalada en este dispositivo'); });
    if (ios) btn.classList.remove('oculto');           // en iPhone no hay botón automático: se explica cómo
    btn.onclick = function () {
      if (pedido) { pedido.prompt(); pedido.userChoice.then(function () { pedido = null; btn.classList.add('oculto'); }); return; }
      if (ios) mostrarAyudaIOS();
    };
  }
  // ───────────────────────── Aviso de versión nueva (v0.8.4)
  // Cada 5 minutos, al volver a la pestaña y al volver la señal se fija en js/version.js del servidor.
  // Si la versión es distinta a la que está corriendo, aparece un cartel para actualizar.
  var VER_POSPUESTA = { v: '', hasta: 0 };
  function vigilarVersion() {
    function chequear() {
      if (navigator.onLine === false || document.hidden || $('#avisoVersion')) return;
      fetch('js/version.js?chequeo=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
        var m = /VERSION_PAGINA\s*=\s*['"]([^'"]+)['"]/.exec(t || ''); if (!m) return;
        var nueva = m[1], actual = CONFIG.VERSION_PAGINA;
        if (nueva === actual) return;
        if (VER_POSPUESTA.v === nueva && Date.now() < VER_POSPUESTA.hasta) return;
        avisoVersionNueva(actual, nueva);
      }).catch(function () {});
    }
    setTimeout(chequear, 8000);
    setInterval(chequear, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) chequear(); });
    window.addEventListener('online', function () { setTimeout(chequear, 2000); });
  }
  function avisoVersionNueva(actual, nueva) {
    var m = document.createElement('div'); m.className = 'modal-fondo aviso-version'; m.id = 'avisoVersion';
    m.innerHTML = '<div class="modal card" role="alertdialog" aria-labelledby="avTit" aria-describedby="avTxt" style="max-width:430px">' +
      '<div class="card-body"><div class="av-icono">🔄</div><h2 id="avTit">Hay una actualización</h2>' +
      '<p id="avTxt">Se subió una versión nueva de Ficha Escuelas (<b>' + esc(actual) + '</b> → <b>' + esc(nueva) + '</b>). Actualizá la página para ver los cambios.</p>' +
      '<div class="av-botones"><button type="button" class="btn btn-secondary" data-av="luego">Más tarde</button>' +
      '<button type="button" class="btn btn-primary" data-av="ya">🔄 Actualizar ahora</button></div></div></div>';
    document.body.appendChild(m);
    setTimeout(function () { var b = $('[data-av="ya"]', m); if (b) b.focus(); }, 30);
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-av]'); if (!b) return;
      if (b.dataset.av === 'luego') { VER_POSPUESTA = { v: nueva, hasta: Date.now() + 30 * 60 * 1000 }; m.remove(); return; }   // vuelve a avisar en 30 min
      b.disabled = true; b.textContent = '⏳ Actualizando…';
      var recargar = function () { location.reload(); };
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (r) { return r && r.update(); }).catch(function () {}).then(recargar);
      } else recargar();
    });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { VER_POSPUESTA = { v: nueva, hasta: Date.now() + 30 * 60 * 1000 }; m.remove(); } });
  }
  function mostrarAyudaIOS() {
    var m = document.createElement('div'); m.className = 'modal-fondo';
    m.innerHTML = '<div class="modal card" style="max-width:420px"><div class="card-header"><div><h2>📲 Instalar en iPhone</h2></div>' +
      '<button class="btn btn-secondary btn-sm" data-cerrar aria-label="Cerrar">✕</button></div><div class="card-body"><ol class="pasos-ios">' +
      '<li>Abrí esta página en <b>Safari</b>.</li><li>Tocá <b>Compartir</b> (el cuadrado con la flecha ⬆️).</li>' +
      '<li>Elegí <b>Agregar a inicio</b> y después <b>Agregar</b>.</li></ol>' +
      '<p class="chico muted">Queda como una app más y abre aunque no haya señal (con los últimos datos que viste).</p></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-cerrar]')) m.remove(); });
  }

  iniciar();
})();
