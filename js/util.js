// Utilidades chicas compartidas
(function () {
  var U = {};
  U.$ = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  U.n = function (x) { return (Number(x) || 0).toLocaleString('es-AR'); };
  U.norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  U.fecha = function (iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0].slice(2); };
  U.fechaLarga = function (iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  U.TIPOS = { E: { nombre: 'Entregas', uno: 'Entrega', icono: '📦' }, O: { nombre: 'Obras', uno: 'Obra', icono: '🏗️' }, A: { nombre: 'Arreglos', uno: 'Arreglo', icono: '🛠️' } };
  U.ICONOS_CAT = {
    'Utensilios': '🥣', 'Equipamiento': '🍳', 'Equipos eléctricos': '🔌', 'Mobiliario': '🪑', 'Material escolar': '📚',
    'Material deportivo': '⚽', 'Textiles y ornamentos': '🎌', 'Gas': '🔥', 'Electricidad': '⚡', 'Plomería': '🚰',
    'Refrigeración': '❄️', 'Atmosférico': '🚛', 'Canaletas': '🌧️', 'Puesta en valor': '🏗️', 'Cubiertas': '🏠', 'Mantenimiento': '🔧',
    'Pintura': '🎨', 'Entornos escolares': '🌳', 'Aulas': '🏫', 'Renovación integral': '🏛️', 'Renovacion integral': '🏛️',
    'Refacción integral': '🔨', 'Refaccion integral': '🔨', 'Desde cero': '🧱',
    'Sin tipo': '❔', 'Sin categoría': '❔', 'Sin rubro': '❔', 'Sin dato': '❔'
  };
  U.icono = function (c) { return U.ICONOS_CAT[c] || '•'; };
  U.toast = function (t) {
    var d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
    U.$('#toasts').appendChild(d); setTimeout(function () { d.remove(); }, 2800);
  };
  // "Sin tipo", "Sin categoría", "Sin dato"… siempre al final de listas, gráficos y tablas
  U.esSin = function (s) { return /^sin( |$)/i.test(String(s || '').trim()); };
  U.ordenTexto = function (a, b) {
    var sa = U.esSin(a), sb = U.esSin(b);
    if (sa !== sb) return sa ? 1 : -1;
    return String(a).localeCompare(String(b), 'es', { numeric: true });
  };
  /** Mueve al final los "Sin …" (y después de ellos nada): respeta el orden que ya tenía el resto */
  U.sinAlFinal = function (arr, clave) {
    var f = clave || function (x) { return x; };
    return arr.filter(function (x) { return !U.esSin(f(x)); }).concat(arr.filter(function (x) { return U.esSin(f(x)); }));
  };

  // Abrir la planilla de Google justo en la celda: ref = [hoja, fila, columna]
  U.letra = function (c) { var s = ''; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  U.celdaTexto = function (ref) { return ref && ref[1] ? U.letra(ref[2] || 1) + ref[1] : ''; };
  U.urlCelda = function (ref) {
    var h = ref && window.Datos && Datos.hojas[ref[0]];
    if (!h || !h.id) return '';
    var rango = ref[1] ? '&range=' + U.celdaTexto(ref) : '';
    // el parámetro r cambia en cada clic: obliga a Google a ir a la celda aunque la pestaña ya esté abierta
    return 'https://docs.google.com/spreadsheets/d/' + h.id + '/edit?r=' + Date.now() + '#gid=' + (h.gid == null ? 0 : h.gid) + rango;
  };
  U.abrirCelda = function (ref) {
    var url = U.urlCelda(ref);
    if (!url) { U.toast('⚠️ No sé en qué planilla está (falta actualizar el Apps Script a 1.1.0)'); return; }
    var h = Datos.hojas[ref[0]];
    var w = window.open(url, 'sae_planilla_' + h.id);   // misma pestaña para todos los clics de una misma planilla
    if (w) { try { w.focus(); } catch (e) {} } else U.toast('⚠️ El navegador bloqueó la ventana: permití las ventanas emergentes para esta página');
  };
  U.nombreHoja = function (cod) { var h = window.Datos && Datos.hojas[cod]; return h ? h.hoja : cod; };

  U.debounce = function (f, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { f.apply(s, a); }, ms); }; };
  U.contar = function (arr, fn) { var m = new Map(); arr.forEach(function (x) { var k = fn(x); if (k == null || k === '') return; m.set(k, (m.get(k) || 0) + 1); }); return m; };
  U.opciones = function (sel, valores, todos, actual) {
    sel.innerHTML = '<option value="">' + U.esc(todos) + '</option>' + valores.map(function (v) {
      var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v;
      return '<option value="' + U.esc(val) + '"' + (String(val) === String(actual) ? ' selected' : '') + '>' + U.esc(lab) + '</option>';
    }).join('');
  };
  window.U = U;
})();
