/**
 * ==========================================================================
 * EXTRAS SAE - extras.js
 * Funciones compartidas por la versión de escritorio (app.js) y la móvil (mobile.js):
 *   1. Historial de búsquedas recientes (localStorage)
 *   2. Aviso de fin de semana / feriado
 *   3. Descarga de la ficha en PDF (jsPDF, con alternativa de impresión)
 * Requiere que data.js (SAE_DATA) esté cargado antes.
 * ==========================================================================
 */

const SAE_EXTRAS = (function () {

  // Limpieza de datos al cargar: CUE sin ".0" y localidades unificadas.
  if (typeof SAE_DATA !== 'undefined' && Array.isArray(SAE_DATA.escuelas)) {
    SAE_DATA.escuelas.forEach(e => {
      if (e.cue !== undefined && e.cue !== null) {
        e.cue = String(e.cue).trim().replace(/\.0+$/, '');
      }
      // Localidades unificadas (por si la planilla trae variantes)
      const loc = String(e.localidad || '').trim();
      const UNIFICAR = {
        'ejercito': 'Edla', 'ejército': 'Edla',
        'l. hermosa': 'Loma Hermosa', 'l hermosa': 'Loma Hermosa',
        'ciudadela sur': 'Ciudadela', 'ciudadela norte': 'Ciudadela'
      };
      if (UNIFICAR[loc.toLowerCase()]) e.localidad = UNIFICAR[loc.toLowerCase()];
      // Nivel "Dispositivo": UDI, EPI, Envión y Centros Esperanza (no las filas de totales)
      const nom = String(e.nombre || '').toUpperCase();
      if (/^(UDI|EPI|ENVI[OÓ]N)\s/.test(nom) || /^CENTRO .*ESPERANZA$/.test(nom)) e.tipo = 'Dispositivo';
    });
  }

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const NUM_DIA = { 'Lunes': '1', 'Martes': '2', 'Miércoles': '3', 'Jueves': '4', 'Viernes': '5' };

  function escaparHTML(txt) {
    return String(txt == null ? '' : txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fechaHoyStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseFecha(fechaStr) {
    const p = (fechaStr || '').split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return new Date();
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function fechaCorta(fechaStr) {
    const p = (fechaStr || '').split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : fechaStr;
  }

  function fechaLarga(fechaStr) {
    const p = (fechaStr || '').split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fechaStr;
  }

  /* ========================================================================
   * 1. HISTORIAL DE BÚSQUEDAS RECIENTES
   * ======================================================================== */
  const CLAVE_HISTORIAL = 'sae-recientes';
  const MAX_RECIENTES = 5;

  function idEscuela(esc) {
    return esc ? (esc.id || esc.nombre) : null;
  }

  function leerHistorial() {
    try {
      const arr = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function guardarReciente(escuela) {
    const id = idEscuela(escuela);
    if (!id) return;
    const lista = leerHistorial().filter(x => x !== id);
    lista.unshift(id);
    try {
      localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista.slice(0, MAX_RECIENTES)));
    } catch (e) { /* almacenamiento no disponible: se ignora */ }
  }

  function obtenerRecientes() {
    if (typeof SAE_DATA === 'undefined') return [];
    return leerHistorial()
      .map(id => SAE_DATA.escuelas.find(e => idEscuela(e) === id))
      .filter(Boolean);
  }

  function borrarHistorial() {
    try { localStorage.removeItem(CLAVE_HISTORIAL); } catch (e) { /* nada */ }
  }

  /**
   * Muestra las últimas escuelas consultadas dentro del desplegable del buscador.
   * Devuelve true si había algo para mostrar.
   */
  function mostrarRecientes(contenedor, alElegir) {
    const lista = obtenerRecientes();
    if (!contenedor || lista.length === 0) return false;

    contenedor.innerHTML = '';

    const cabecera = document.createElement('div');
    cabecera.className = 'recientes-header';
    cabecera.innerHTML = `<span>🕘 Últimas escuelas consultadas</span>`;
    const btnBorrar = document.createElement('button');
    btnBorrar.type = 'button';
    btnBorrar.className = 'recientes-borrar';
    btnBorrar.textContent = 'Borrar';
    btnBorrar.title = 'Borrar historial de búsquedas';
    btnBorrar.addEventListener('click', (ev) => {
      ev.stopPropagation();
      borrarHistorial();
      contenedor.innerHTML = '';
      contenedor.style.display = 'none';
    });
    cabecera.appendChild(btnBorrar);
    contenedor.appendChild(cabecera);

    lista.forEach(esc => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item reciente-item';
      const detalle = [esc.direccion, esc.localidad].filter(Boolean).join(' - ') || esc.tipo || '';
      item.innerHTML = `
        <div class="reciente-texto">
          <span class="ac-title item-title">${escaparHTML(esc.nombre)}</span>
          <span class="ac-desc item-desc">${escaparHTML(detalle)}</span>
        </div>
        <span class="reciente-flecha" aria-hidden="true">↩</span>
      `;
      item.addEventListener('click', () => {
        contenedor.style.display = 'none';
        alElegir(esc);
      });
      contenedor.appendChild(item);
    });

    contenedor.style.display = 'block';
    return true;
  }

  /* ========================================================================
   * 2. FERIADOS Y FINES DE SEMANA
   * Fuente: calendario oficial 2026 (Ley 27.399, Decreto 614/2025 y
   * Resolución 164/2025). Para años siguientes, agregar las fechas acá.
   * tipo: 'feriado' | 'no-laborable'
   * ======================================================================== */
  const FERIADOS = {
    '2026-01-01': { nombre: 'Año Nuevo', tipo: 'feriado' },
    '2026-02-16': { nombre: 'Carnaval', tipo: 'feriado' },
    '2026-02-17': { nombre: 'Carnaval', tipo: 'feriado' },
    '2026-03-23': { nombre: 'Día no laborable con fines turísticos', tipo: 'no-laborable' },
    '2026-03-24': { nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'feriado' },
    '2026-04-02': { nombre: 'Día del Veterano y de los Caídos en Malvinas', tipo: 'feriado' },
    '2026-04-03': { nombre: 'Viernes Santo', tipo: 'feriado' },
    '2026-05-01': { nombre: 'Día del Trabajador', tipo: 'feriado' },
    '2026-05-25': { nombre: 'Día de la Revolución de Mayo', tipo: 'feriado' },
    '2026-06-15': { nombre: 'Paso a la Inmortalidad del Gral. Güemes', tipo: 'feriado' },
    '2026-06-20': { nombre: 'Paso a la Inmortalidad del Gral. Belgrano', tipo: 'feriado' },
    '2026-07-09': { nombre: 'Día de la Independencia', tipo: 'feriado' },
    '2026-07-10': { nombre: 'Día no laborable con fines turísticos', tipo: 'no-laborable' },
    '2026-08-17': { nombre: 'Paso a la Inmortalidad del Gral. San Martín', tipo: 'feriado' },
    '2026-10-12': { nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'feriado' },
    '2026-11-23': { nombre: 'Día de la Soberanía Nacional', tipo: 'feriado' },
    '2026-12-07': { nombre: 'Día no laborable con fines turísticos', tipo: 'no-laborable' },
    '2026-12-08': { nombre: 'Inmaculada Concepción de María', tipo: 'feriado' },
    '2026-12-25': { nombre: 'Navidad', tipo: 'feriado' }
  };

  /**
   * Analiza una fecha (YYYY-MM-DD) y dice qué tipo de día es y qué menú corresponde.
   */
  function infoDia(fechaStr) {
    const d = parseFecha(fechaStr);
    const nombreDia = DIAS[d.getDay()];
    const esFinde = d.getDay() === 0 || d.getDay() === 6;
    const feriado = FERIADOS[fechaStr] || null;
    return {
      nombreDia,
      esFinde,
      feriado,
      // Fin de semana -> Viernes. Feriado entre semana -> se mantiene ese día.
      diaMenu: esFinde ? 'Viernes' : nombreDia
    };
  }

  /**
   * Muestra u oculta el cartelito azul según la fecha y el día que se está mostrando.
   * Si el usuario elige a mano otro día de la semana, el aviso se oculta
   * (ya no estaría mostrando el menú "automático").
   */
  function actualizarAviso(elemento, fechaStr, diaMostrado) {
    if (!elemento) return;
    const fecha = fechaStr || fechaHoyStr();
    const info = infoDia(fecha);
    const esHoy = fecha === fechaHoyStr();
    const sujeto = esHoy ? 'Hoy es' : `El ${info.nombreDia.toLowerCase()} ${fechaCorta(fecha)} es`;
    let html = '';

    if (diaMostrado && diaMostrado !== info.diaMenu) {
      elemento.style.display = 'none';
      return;
    }

    if (info.esFinde) {
      const extra = info.feriado ? ` y feriado (${escaparHTML(info.feriado.nombre)})` : '';
      html = `<span class="aviso-icono">📅</span><span>${sujeto} fin de semana${extra}, mostrando menú del <strong>viernes</strong>.</span>`;
    } else if (info.feriado) {
      const tipoTxt = info.feriado.tipo === 'feriado' ? 'feriado' : 'día no laborable';
      html = `<span class="aviso-icono">🇦🇷</span><span>${sujeto} ${tipoTxt} (${escaparHTML(info.feriado.nombre)}): ` +
             `${info.feriado.tipo === 'feriado' ? 'no hay servicio' : 'puede no haber servicio'}. ` +
             `Mostrando el menú del <strong>${info.diaMenu.toLowerCase()}</strong> como referencia.</span>`;
    }

    if (html) {
      elemento.innerHTML = html;
      elemento.className = 'aviso-dia' + (info.feriado && !info.esFinde ? ' aviso-feriado' : '');
      elemento.style.display = 'flex';
    } else {
      elemento.style.display = 'none';
    }
  }

  /* ========================================================================
   * 3. FICHA EN PDF
   * ======================================================================== */
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  let promesaJsPDF = null;
  let jsPDFFallo = false; // si ya falló (sin internet), se va directo a la impresión

  function cargarJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPDFFallo) return Promise.reject(new Error('jsPDF no disponible (sin conexión)'));
    if (promesaJsPDF) return promesaJsPDF;
    promesaJsPDF = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSPDF_URL;
      s.async = true;
      const timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000);
      s.onload = () => {
        clearTimeout(timer);
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF no disponible'));
      };
      s.onerror = () => { clearTimeout(timer); reject(new Error('No se pudo cargar jsPDF')); };
      document.head.appendChild(s);
    }).catch(err => { promesaJsPDF = null; jsPDFFallo = true; throw err; });
    return promesaJsPDF;
  }

  // Precarga en segundo plano para que el botón responda al instante
  window.addEventListener('load', () => {
    setTimeout(() => { cargarJsPDF().catch(() => {}); }, 1500);
  });

  function cupoDeServicio(servicio, fechaStr) {
    if (!servicio || !servicio.cupos) return 0;
    if (servicio.cupos[fechaStr] !== undefined) return servicio.cupos[fechaStr];
    const fechas = Object.keys(servicio.cupos).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    return fechas.length ? servicio.cupos[fechas[fechas.length - 1]] : 0;
  }

  function formatoNum(n) {
    return Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }

  /** Arma toda la información que va en la ficha, independiente del formato. */
  function armarContenido(datos) {
    const esc = datos.escuela;
    const nivelTxt = { jardin: 'Jardín', primaria: 'Primaria', secundaria: 'Secundaria' }[datos.nivel] || datos.nivel;
    const servicioTxt = datos.servicio === 'COMEDOR' ? 'Comedor' : 'Desayuno / Merienda';

    const servicios = (esc.servicios || []).map(s => ({
      nombre: s.servicio || '-',
      proveedor: s.proveedor || esc.proveedor || '-',
      cupo: Math.round(cupoDeServicio(s, datos.fecha) || 0)
    }));

    let listas = [];
    if (typeof SAE_DATA !== 'undefined') {
      if (datos.servicio === 'COMEDOR') {
        listas = (SAE_DATA.comedorDays && SAE_DATA.comedorDays[datos.dia]) || [];
      } else {
        const l = SAE_DATA.dmLists && SAE_DATA.dmLists[NUM_DIA[datos.dia]];
        if (l) listas = [l];
      }
    }

    const cupo = Number(datos.cupo) || 0;
    const menu = listas.map(l => ({
      titulo: `${l.lista || 'Lista'}: ${l.nombre || ''}`,
      filas: (l.ingredientes || []).map(ing => {
        let racion = ing[datos.nivel];
        if (racion === undefined) racion = ing.primaria !== undefined ? ing.primaria : (ing.jardin || 0);
        const unidad = ing.unidad || 'g';
        const bruto = racion * cupo;
        let total;
        if (unidad === 'g') total = `${formatoNum(bruto / 1000)} kg`;
        else if (unidad === 'ml' || unidad === 'cc') total = `${formatoNum(bruto / 1000)} L`;
        else total = `${formatoNum(Math.ceil(bruto))} u.`;
        return [ing.alimento || ing.nombre || '-', `${formatoNum(racion)} ${unidad}`, total];
      })
    }));

    const comparte = (esc.comparte_edificio || '').trim();
    return {
      nombre: esc.nombre || '-',
      meta: [
        `CUE: ${esc.cue ? String(esc.cue).replace(/\.0+$/, '') : '-'}`,
        esc.tipo || null,
        esc.zona ? `Zona ${esc.zona}` : null,
        esc.proveedor ? `Proveedor: ${esc.proveedor}` : null
      ].filter(Boolean).join('   |   '),
      localizacion: [
        ['Dirección', esc.direccion || '-'],
        ['Localidad', esc.localidad || 'Tres de Febrero'],
        ...(comparte && comparte.toUpperCase() !== 'NO' ? [['Comparte con', comparte]] : [])
      ],
      contacto: [
        [esc.cargo || 'Directora', esc.directora || '-'],
        ['Teléfono', esc.telefono || '-'],
        ['Email', esc.email || '-']
      ],
      servicios,
      menuTitulo: `Menú del ${datos.dia.toLowerCase()} - ${servicioTxt}`,
      menuSub: `Calculado para ${cupo} raciones, gramaje de ${nivelTxt}. Totales estimativos.`,
      menu,
      fechaConsulta: fechaLarga(datos.fecha),
      archivo: `Ficha_SAE_${(esc.nombre || 'escuela').replace(/[^\w\-]+/g, '_')}_${datos.fecha}.pdf`
    };
  }

  /** Dibuja la ficha con jsPDF. "e" es un factor de escala para que entre en una página. */
  function dibujarPDF(JsPDF, c, e) {
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const AZUL = [22, 60, 104], AZUL_OSC = [14, 42, 73], NARANJA = [246, 147, 33];
    const TXT = [0, 13, 29], GRIS = [47, 64, 84], BORDE = [229, 229, 229], CLARO = [224, 238, 255];
    const M = 15, ANCHO = 210 - 2 * M;
    const fs = (t) => doc.setFontSize(t * e);
    const lh = (t) => t * e * 0.42; // alto de línea en mm para un tamaño de fuente
    let y;

    // Encabezado institucional
    doc.setFillColor(...AZUL); doc.rect(0, 0, 210, 20, 'F');
    doc.setFillColor(...NARANJA); doc.rect(0, 20, 210, 1.4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Servicio Alimentario Escolar', M, 9.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Municipalidad de Tres de Febrero', M, 15);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('FICHA DE ESTABLECIMIENTO', 210 - M, 9.5, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Fecha de consulta: ${c.fechaConsulta}`, 210 - M, 15, { align: 'right' });

    // Nombre y datos básicos
    y = 32;
    doc.setTextColor(...TXT); doc.setFont('helvetica', 'bold'); fs(18);
    const nombreLineas = doc.splitTextToSize(c.nombre, ANCHO);
    doc.text(nombreLineas, M, y);
    y += nombreLineas.length * lh(18) + 1;
    doc.setFont('helvetica', 'normal'); fs(9.5); doc.setTextColor(...GRIS);
    doc.text(doc.splitTextToSize(c.meta, ANCHO), M, y);
    y += lh(9.5) + 4 * e;

    // Dos columnas: Localización | Directivos y contacto
    const colW = (ANCHO - 6) / 2;
    function bloque(x, titulo, pares) {
      let yy = y + 6 * e;
      doc.setFont('helvetica', 'bold'); fs(10.5); doc.setTextColor(...AZUL);
      doc.text(titulo, x + 4, yy);
      yy += lh(10.5) + 1.5 * e;
      pares.forEach(([k, v]) => {
        doc.setFont('helvetica', 'bold'); fs(9); doc.setTextColor(...GRIS);
        doc.text(`${k}:`, x + 4, yy);
        yy += lh(9);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...TXT);
        const lineas = doc.splitTextToSize(String(v), colW - 8);
        doc.text(lineas, x + 4, yy);
        yy += lineas.length * lh(9) + 1.8 * e;
      });
      return yy;
    }
    // Primero medimos (dibujando) y después el recuadro: se dibuja el borde al final
    const fin1 = bloque(M, 'Localización', c.localizacion);
    const fin2 = bloque(M + colW + 6, 'Directivos y contacto', c.contacto);
    const altoBloque = Math.max(fin1, fin2) - y + 1;
    doc.setDrawColor(...BORDE); doc.setLineWidth(0.3);
    doc.roundedRect(M, y, colW, altoBloque, 2, 2, 'S');
    doc.roundedRect(M + colW + 6, y, colW, altoBloque, 2, 2, 'S');
    doc.setFillColor(...NARANJA);
    doc.rect(M, y + 2, 1, altoBloque - 4, 'F');
    doc.rect(M + colW + 6, y + 2, 1, altoBloque - 4, 'F');
    y += altoBloque + 7 * e;

    // Servicios SAE
    function titulo(t) {
      doc.setFont('helvetica', 'bold'); fs(12); doc.setTextColor(...AZUL);
      doc.text(t, M, y);
      y += 1.5;
      doc.setDrawColor(...NARANJA); doc.setLineWidth(0.6);
      doc.line(M, y, M + 22, y);
      y += 5 * e;
    }
    function tabla(cabecera, filas, anchos, alineaDerecha) {
      const filaH = 6.2 * e;
      doc.setFillColor(...CLARO); doc.rect(M, y - filaH + 1.8 * e, ANCHO, filaH, 'F');
      doc.setFont('helvetica', 'bold'); fs(8.8); doc.setTextColor(...AZUL_OSC);
      let x = M + 2;
      cabecera.forEach((h, i) => {
        const der = alineaDerecha.includes(i);
        doc.text(h, der ? x + anchos[i] - 4 : x, y, der ? { align: 'right' } : undefined);
        x += anchos[i];
      });
      y += filaH;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...TXT);
      filas.forEach(f => {
        let xx = M + 2;
        const primera = doc.splitTextToSize(String(f[0]), anchos[0] - 4);
        f.forEach((celda, i) => {
          const der = alineaDerecha.includes(i);
          const txt = i === 0 ? primera : String(celda);
          if (i === f.length - 1) doc.setFont('helvetica', 'bold');
          doc.text(txt, der ? xx + anchos[i] - 4 : xx, y, der ? { align: 'right' } : undefined);
          doc.setFont('helvetica', 'normal');
          xx += anchos[i];
        });
        const alto = Math.max(filaH, primera.length * lh(8.8) + 2.6 * e);
        doc.setDrawColor(...BORDE); doc.setLineWidth(0.2);
        doc.line(M, y + alto - filaH + 2 * e, M + ANCHO, y + alto - filaH + 2 * e);
        y += alto;
      });
      y += 3 * e;
    }

    titulo('Servicios Alimentarios (SAE)');
    if (c.servicios.length) {
      tabla(['Servicio', 'Proveedor', 'Cupo diario'],
        c.servicios.map(s => [s.nombre, s.proveedor, `${s.cupo} raciones`]),
        [90, 50, 40], [2]);
    } else {
      doc.setFont('helvetica', 'italic'); fs(9.5); doc.setTextColor(...GRIS);
      doc.text('No hay cupos SAE registrados para este establecimiento.', M, y);
      y += 8 * e;
    }

    // Menú del día
    y += 2 * e;
    titulo(c.menuTitulo);
    doc.setFont('helvetica', 'normal'); fs(9); doc.setTextColor(...GRIS);
    doc.text(c.menuSub, M, y - 1.5 * e);
    y += 5 * e;
    c.menu.forEach(lista => {
      doc.setFont('helvetica', 'bold'); fs(10); doc.setTextColor(...TXT);
      const t = doc.splitTextToSize(lista.titulo, ANCHO);
      doc.text(t, M, y);
      y += t.length * lh(10) + 3 * e;
      tabla(['Alimento', 'Ración', 'Total estimado'], lista.filas, [100, 40, 40], [1, 2]);
    });

    // Pie
    const ahora = new Date();
    doc.setDrawColor(...BORDE); doc.setLineWidth(0.3); doc.line(M, 284, 210 - M, 284);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
    doc.text(`Generado desde el Buscador SAE el ${ahora.toLocaleDateString('es-AR')} a las ${ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.`, M, 289);
    doc.text('Los totales son estimativos y no reemplazan la documentación oficial.', 210 - M, 289, { align: 'right' });

    return { doc, yFinal: y };
  }

  /** Alternativa sin internet: arma la ficha en HTML y abre el diálogo de impresión ("Guardar como PDF"). */
  function imprimirComoPDF(c) {
    let area = document.getElementById('saeFichaImprimible');
    if (!area) {
      area = document.createElement('div');
      area.id = 'saeFichaImprimible';
      document.body.appendChild(area);
    }
    const pares = (arr) => arr.map(([k, v]) => `<p><strong>${escaparHTML(k)}:</strong> ${escaparHTML(v)}</p>`).join('');
    const servicios = c.servicios.length
      ? `<table><thead><tr><th>Servicio</th><th>Proveedor</th><th class="der">Cupo diario</th></tr></thead><tbody>${
          c.servicios.map(s => `<tr><td>${escaparHTML(s.nombre)}</td><td>${escaparHTML(s.proveedor)}</td><td class="der"><strong>${s.cupo} raciones</strong></td></tr>`).join('')
        }</tbody></table>`
      : '<p><em>No hay cupos SAE registrados para este establecimiento.</em></p>';
    const menu = c.menu.map(l => `
      <h4>${escaparHTML(l.titulo)}</h4>
      <table><thead><tr><th>Alimento</th><th class="der">Ración</th><th class="der">Total estimado</th></tr></thead><tbody>${
        l.filas.map(f => `<tr><td>${escaparHTML(f[0])}</td><td class="der">${escaparHTML(f[1])}</td><td class="der"><strong>${escaparHTML(f[2])}</strong></td></tr>`).join('')
      }</tbody></table>`).join('');

    area.innerHTML = `
      <div class="fi-cabecera">
        <div><strong>Servicio Alimentario Escolar</strong><br><small>Municipalidad de Tres de Febrero</small></div>
        <div class="der"><strong>FICHA DE ESTABLECIMIENTO</strong><br><small>Fecha de consulta: ${escaparHTML(c.fechaConsulta)}</small></div>
      </div>
      <h1>${escaparHTML(c.nombre)}</h1>
      <p class="fi-meta">${escaparHTML(c.meta)}</p>
      <div class="fi-columnas">
        <div class="fi-bloque"><h3>Localización</h3>${pares(c.localizacion)}</div>
        <div class="fi-bloque"><h3>Directivos y contacto</h3>${pares(c.contacto)}</div>
      </div>
      <h2>Servicios Alimentarios (SAE)</h2>${servicios}
      <h2>${escaparHTML(c.menuTitulo)}</h2><p class="fi-meta">${escaparHTML(c.menuSub)}</p>${menu}
      <p class="fi-pie">Generado desde el Buscador SAE el ${new Date().toLocaleString('es-AR')}. Los totales son estimativos.</p>
    `;

    const tituloOriginal = document.title;
    document.title = c.archivo.replace(/\.pdf$/, '');
    document.documentElement.classList.add('sae-imprimiendo');
    const limpiar = () => {
      document.documentElement.classList.remove('sae-imprimiendo');
      document.title = tituloOriginal;
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);
    setTimeout(() => { window.print(); setTimeout(limpiar, 1500); }, 50);
  }

  /**
   * Genera y descarga la ficha en PDF.
   * datos = { escuela, fecha:'YYYY-MM-DD', dia:'Lunes'..'Viernes', servicio:'DM'|'COMEDOR', cupo, nivel }
   * Devuelve una promesa que resuelve 'pdf' (descarga directa) o 'impresion' (alternativa).
   */
  async function descargarFichaPDF(datos) {
    if (!datos || !datos.escuela) throw new Error('No hay escuela seleccionada');
    const contenido = armarContenido(datos);
    try {
      const JsPDF = await cargarJsPDF();
      let resultado;
      // Si no entra en una hoja, se achica la letra hasta que entre
      for (const escala of [1, 0.92, 0.84, 0.76, 0.68, 0.6]) {
        resultado = dibujarPDF(JsPDF, contenido, escala);
        if (resultado.yFinal <= 280) break;
      }
      resultado.doc.save(contenido.archivo);
      return 'pdf';
    } catch (err) {
      console.warn('PDF directo no disponible, se usa impresión:', err);
      imprimirComoPDF(contenido);
      return 'impresion';
    }
  }

  return {
    fechaHoyStr,
    infoDia,
    actualizarAviso,
    guardarReciente,
    obtenerRecientes,
    mostrarRecientes,
    borrarHistorial,
    descargarFichaPDF,
    FERIADOS
  };
})();
