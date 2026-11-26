// Carga de datos: copia guardada en el navegador (abre al instante) + datos frescos del Apps Script.
(function () {
  var C = window.CONFIG;
  var Datos = { listo: false, regs: [], inst: new Map(), avisos: [], hojas: {}, meta: null, oyentes: [] };

  function normClave(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim().replace(/^([A-Z]+)\s*0*(\d+)/, '$1 $2');
  }
  function buscarExtra(i) {
    var ex = window.ESCUELAS_EXTRA;
    if (!ex) return null;
    return ex[normClave(i.id)] || ex[normClave(i.nombre)] || ex[normClave(i.completo)] || null;
  }
  // Localidad siempre en MAYÚSCULAS y sin tildes (la Ñ se conserva): "Saenz Peña" y "SAENZ PEÑA" quedan iguales
  function mayus(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toUpperCase().replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I').replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U');
  }
  function coords(i) {
    var c = window.ESCUELAS_COORDS;
    return c ? (c[normClave(i.id)] || c[normClave(i.nombre)] || c[normClave(i.completo)] || null) : null;
  }
  function enriquecer(i) {
    var ex = buscarExtra(i);
    if (ex) {
      i.direccion = i.direccion || ex.direccion || '';
      i.directora = i.directora || ex.directora || '';
      i.cargo = i.cargo || ex.cargo || '';
      i.localidad = i.localidad || ex.localidad || '';
      i.cue = i.cue || ex.cue || '';
    } else {
      i.direccion = i.direccion || '';
      i.directora = i.directora || '';
      i.cargo = i.cargo || '';
    }
    i.localidad = mayus(i.localidad);
    i.cue = String(i.cue || '').replace(/\.0+$/, '');
    var co = coords(i);
    i.lat = co ? co[0] : null; i.lng = co ? co[1] : null; i.nombreMapa = co ? co[2] : '';
    i.busca = U.norm([i.id, i.nombre, i.completo, i.localidad, i.direccion, i.directora].concat(i.alias || []).join(' '));
  }

  function preparar(j) {
    var inst = new Map();
    (j.instituciones || []).forEach(function (i) {
      i.E = 0; i.O = 0; i.A = 0; i.uE = 0; i.ultimo = ''; i.ultimoAnio = 0;
      enriquecer(i);
      inst.set(i.id, i);
    });
    var regs = (j.registros || []).map(function (r, k) {
      var o = { k: k, t: r[0], anio: r[1] || null, fecha: r[2] || '', inst: r[3], cat: r[4] || 'Sin categoría', det: r[5] || '',
        cant: Number(r[6]) || 0, prov: r[7] || '', fuente: r[8] || '', serv: r[9] || '', estado: r[10] || '', monto: r[11], fact: r[12],
        ref: r[13] ? [r[13], r[14], r[15]] : null };
      var i = inst.get(o.inst);
      if (!i) { i = { id: o.inst, nombre: o.inst, completo: '', nivel: '', gestion: '', localidad: '', enBase: false, alias: [], aliasRef: {}, ref: null, E: 0, O: 0, A: 0, uE: 0, ultimo: '', ultimoAnio: 0 }; enriquecer(i); inst.set(o.inst, i); }
      o.I = i;
      i[o.t]++;
      if (o.t === 'E') i.uE += o.cant;
      var orden = o.fecha || (o.anio ? o.anio + '-00-00' : '');
      if (orden > i.ultimo) i.ultimo = orden;
      if (o.anio > i.ultimoAnio) i.ultimoAnio = o.anio;
      o.orden = orden;
      o.busca = U.norm([o.inst, i.nombre, o.cat, o.det, o.prov, o.serv].join(' '));
      return o;
    });
    regs.sort(function (a, b) { return a.orden < b.orden ? 1 : a.orden > b.orden ? -1 : 0; });
    Datos.regs = regs; Datos.inst = inst; Datos.avisos = j.avisos || []; Datos.hojas = j.hojas || {};
    Datos.recPrueba = j.reclamosPrueba || null; Datos.recCache = new Map();
    Datos.meta = { version: j.version, generado: j.generado, montos: !!j.montos, resumen: j.resumen, auto: !!j.auto };
    Datos.listo = true;
    Datos.oyentes.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  }

  function estado(clase, texto, titulo) {
    var e = U.$('#estadoDatos'); e.className = 'estado-datos ' + clase;
    U.$('.txt', e).textContent = texto; e.title = titulo || texto;
    var g = Datos.meta && Datos.meta.generado, m = g ? Math.round((Date.now() - new Date(g)) / 60000) : null;   // versión corta para el celular
    e.dataset.corto = clase === 'cargando' ? '…' : clase === 'error' ? '!' : m == null ? '' : m < 1 ? 'recién' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : new Date(g).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  }
  function cuando(iso) {
    if (!iso) return '';
    var d = new Date(iso), min = Math.round((Date.now() - d) / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return 'hace ' + min + ' min';
    if (min < 24 * 60) return 'hace ' + Math.round(min / 60) + ' h';
    return 'del ' + d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  Datos.cuando = cuando;
  Datos.sinInternet = false;
  /** "Actualizado hace 3 h": verde hasta 2 h, naranja si son más viejos (conviene 🔄 Actualizar), gris sin internet */
  function mostrarEstado() {
    if (!Datos.meta) return;
    var g = Datos.meta.generado, min = g ? (Date.now() - new Date(g)) / 60000 : 1e9;
    var largo = 'Datos leídos de las planillas: ' + (g ? new Date(g).toLocaleString('es-AR') : '—') + ' · script v' + Datos.meta.version +
      (Datos.meta.auto ? ' · se actualizan solos cada hora' : '');
    if (Datos.sinInternet) { estado('offline', 'Sin internet · datos ' + cuando(g), 'Sin conexión: estás viendo la copia guardada en este dispositivo. ' + largo); return; }
    if (min > 120) estado('viejo', 'Actualizado ' + cuando(g), largo + ' · Tocá 🔄 Actualizar para traer lo último');
    else estado('ok', 'Actualizado ' + cuando(g), largo);
  }

  function avisoGlobal(html, clase) {
    U.$('#avisoGlobal').innerHTML = html ? '<div class="aviso ' + (clase || 'naranja') + '" style="margin-bottom:1rem">' + html + '</div>' : '';
  }

  function leerCopia() {
    try { var t = localStorage.getItem(C.CLAVE_COPIA); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function guardarCopia(j) {
    try { localStorage.setItem(C.CLAVE_COPIA, JSON.stringify(j)); } catch (e) {}
  }

  // ?datos=archivo.json → solo para probar en la compu con un archivo de la misma carpeta
  function urlDatos(forzar) {
    var p = new URLSearchParams(location.search).get('datos');
    if (p && /^[\w\-\/.]+\.json$/.test(p) && p.indexOf('..') < 0) return p;
    if (!C.SCRIPT_URL) return null;
    return C.SCRIPT_URL + (C.SCRIPT_URL.indexOf('?') < 0 ? '?' : '&') + (forzar ? 'actualizar=1&' : '') + 't=' + Date.now();
  }

  Datos.cargar = function (forzar) {
    var url = urlDatos(forzar);
    var esPrueba = /\.json$/.test(url || '') && url.indexOf('http') !== 0;
    if (!url) {
      estado('error', 'Sin conexión configurada');
      avisoGlobal('⚙️ <b>Falta conectar la página con las planillas.</b> Publicá el Apps Script (ver <code>apps-script/PUBLICAR.md</code>) y pegá su URL en <code>js/config.js</code> → <code>SCRIPT_URL</code>.', 'naranja');
      return Promise.resolve();
    }
    if (!Datos.listo && !esPrueba) {
      var copia = leerCopia();
      if (copia && copia.ok) { preparar(copia); mostrarEstado(); }
    }
    estado('cargando', Datos.listo ? 'Actualizando…' : 'Leyendo planillas…');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, C.TIEMPO_ESPERA_MS);
    return fetch(url, { signal: ctrl && ctrl.signal, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        if (!j || !j.ok) throw new Error((j && j.error) || 'Respuesta inválida del script');
        if (!esPrueba) guardarCopia(j);
        Datos.sinInternet = false;
        preparar(j); mostrarEstado(); avisoGlobal('');
        var cmp = compararVersion(j.version, C.VERSION_SCRIPT_ESPERADA);
        if (cmp < 0) {
          avisoGlobal('⚠️ <b>El Apps Script quedó atrasado:</b> está en la versión <b>' + U.esc(j.version) + '</b> y la página necesita la <b>' + U.esc(C.VERSION_SCRIPT_ESPERADA) +
            '</b>. Pegá el <code>Codigo.gs</code> de esta actualización en script.google.com y publicalo (Implementar → Administrar implementaciones → ✏️ → Nueva versión).', 'naranja');
        } else if (cmp > 0) {
          avisoGlobal('⚠️ <b>La página quedó atrasada:</b> el Apps Script ya está en la versión <b>' + U.esc(j.version) + '</b> y estos archivos esperan la <b>' + U.esc(C.VERSION_SCRIPT_ESPERADA) +
            '</b>. Subí los archivos de la última actualización de la página (incluido <code>js/version.js</code>).', 'naranja');
        }
        if (forzar) U.toast('✅ Datos actualizados');
      })
      .catch(function (err) {
        clearTimeout(timer);
        console.error(err);
        if (Datos.listo && navigator.onLine === false) {
          Datos.sinInternet = true; mostrarEstado();
          avisoGlobal('📴 <b>Sin internet.</b> Estás viendo la copia guardada en este dispositivo (datos ' + U.esc(cuando(Datos.meta.generado)) + '). Cuando vuelva la señal, tocá 🔄 Actualizar.', 'naranja');
        } else if (Datos.listo) {
          estado('error', 'Sin actualizar', 'No se pudieron leer las planillas: ' + err.message);
          avisoGlobal('⚠️ No se pudieron leer las planillas ahora (' + U.esc(err.message) + '). Estás viendo la última copia guardada. Probá con 🔄 Actualizar en un rato.', 'naranja');
        } else {
          estado('error', 'Error');
          avisoGlobal('❌ No se pudieron leer las planillas (' + U.esc(err.message) + '). Revisá que el Apps Script esté publicado con acceso "Cualquier persona" y que la URL de <code>js/config.js</code> sea la correcta.', 'rojo');
        }
      });
  };
  function compararVersion(a, b) {
    var x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number);
    for (var i = 0; i < 3; i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
    return 0;
  }
  /** Reclamos de una institución (se piden al script recién cuando se abre la ficha). Devuelve una promesa. */
  Datos.reclamos = function (id) {
    if (Datos.recCache && Datos.recCache.has(id)) return Promise.resolve(Datos.recCache.get(id));
    var vacio = { total: 0, abiertos: 0, abiertoMasViejo: '', items: [] };
    function guardar(r) {
      r = r || vacio;
      r.items = (r.items || []).map(function (x) {
        return { fecha: x[0], estado: x[1], tipo: x[2], cat: x[3], sub: x[4], det: x[5], prod: x[6], serv: x[7], prov: x[8], resp: x[9], fres: x[10], acc: x[11], prob: x[12], ref: ['RE', x[13], 1] };
      });
      Datos.recCache.set(id, r); return r;
    }
    if (Datos.recPrueba) return Promise.resolve(guardar(Datos.recPrueba[id]));
    if (!C.SCRIPT_URL) return Promise.reject(new Error('Falta la URL del script'));
    var url = C.SCRIPT_URL + (C.SCRIPT_URL.indexOf('?') < 0 ? '?' : '&') + 'accion=reclamos&inst=' + encodeURIComponent(id) + '&t=' + Date.now();
    var clave = 'sae-rec-' + id;          // copia por escuela para poder verlos sin internet
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'El script no devolvió reclamos (¿está en la versión 1.2.0 o más nueva?)');
      try { localStorage.setItem(clave, JSON.stringify({ t: Date.now(), r: j.reclamos })); } catch (e) {}
      return guardar(j.reclamos);
    }).catch(function (err) {
      var c = null; try { c = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) {}
      if (!c) throw err;
      var r = guardar(c.r); r.copia = c.t; Datos.recCache.delete(id);   // no se fija: la próxima vez vuelve a intentar
      return r;
    });
  };
  /** Pide los reclamos una vez apenas carga la página: el script arma su copia y después cada ficha abre al instante */
  var precalentado = false;
  Datos.precalentarReclamos = function () {
    if (precalentado || Datos.recPrueba || !C.SCRIPT_URL) return; precalentado = true;
    setTimeout(function () {
      fetch(C.SCRIPT_URL + (C.SCRIPT_URL.indexOf('?') < 0 ? '?' : '&') + 'accion=reclamos&inst=_&t=' + Date.now(), { cache: 'no-store' }).catch(function () {});
    }, 1500);
  };
    Datos.alCambiar = function (f) { Datos.oyentes.push(f); };
  setInterval(mostrarEstado, 60000);
  // Volvió la señal: se traen los datos nuevos solos
  window.addEventListener('online', function () { if (Datos.sinInternet) Datos.cargar(false); });
  window.addEventListener('offline', function () { if (Datos.listo) { Datos.sinInternet = true; mostrarEstado(); } });
  window.Datos = Datos;
})();
