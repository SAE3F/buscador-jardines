// LÓGICA MÓVIL - mobile.js
// Utiliza SAE_DATA cargado de data.js

let activeSchool = null;
let activeService = 'DM';
let activeDay = 'Viernes';
let dayNumberIndex = 5;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    initDarkMode();
    updateTotalEscuelas();
    setupSearch();
    setupTabs();
    setupServiceTabs();
    setupDayButtons();
    setupCalculatorListeners();
    setCurrentDate();
    // Escuela precargada desde otra página: mobile.html?escuela=EP%2011
    try {
        const pre = new URLSearchParams(location.search).get('escuela');
        if (pre) {
            const m = pre.trim().toUpperCase();
            const e = SAE_DATA.escuelas.find(x => (x.nombre || '').toUpperCase() === m ||
                (x.alias || []).some(a => String(a).toUpperCase() === m));
            if (e) selectSchool(e);
        }
    } catch (err) { /* sin escuela precargada */ }
}

// 1. UTILIDADES Y FECHAS
function updateTotalEscuelas() {
    const total = SAE_DATA.escuelas.length;
    document.getElementById('statsTotalEscuelas').innerHTML = `<strong>${total}</strong> establecimientos en la base de datos.`;
}

function setCurrentDate() {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const today = new Date();
    const dName = dayNames[today.getDay()];
    
    // Si es fin de semana, forzamos Viernes
    if (dName === 'Sábado' || dName === 'Domingo') {
        activeDay = 'Viernes';
        dayNumberIndex = 5;
    } else {
        activeDay = dName;
        dayNumberIndex = today.getDay();
    }
    
    document.getElementById('headerDateDisplay').textContent = activeDay;
    updateDayButtonsUI();
    actualizarAvisoDia();
}

// Cartelito de fin de semana / feriado
function actualizarAvisoDia() {
    if (typeof SAE_EXTRAS === 'undefined') return;
    SAE_EXTRAS.actualizarAviso(document.getElementById('avisoDia'), getTodayStr(), activeDay);
}

function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Obtener el cupo más reciente de un servicio
function getLatestCupo(servicio) {
    // (2.10.0) El mismo cálculo que la compu: el último cupo cargado hasta hoy
    return SAE_MENUS.cupoEnFecha(servicio, getTodayStr());
}

// 2. BUSCADOR CON AUTOCOMPLETADO
function setupSearch() {
    const searchInput = document.getElementById('mobileSearchInput');
    const autocompleteList = document.getElementById('autocompleteList');
    const btnClear = document.getElementById('btnClearSearch');

    // Historial: al tocar el buscador vacío, mostrar las últimas escuelas consultadas
    function mostrarHistorial() {
        if (typeof SAE_EXTRAS === 'undefined') return;
        SAE_EXTRAS.mostrarRecientes(autocompleteList, (esc) => {
            selectSchool(esc);
            searchInput.value = esc.nombre;
            btnClear.style.display = 'block';
            searchInput.blur(); // cierra el teclado en el celular
        });
    }
    searchInput.addEventListener('focus', () => {
        if (!searchInput.value.trim()) mostrarHistorial();
    });
    if (window.SAE_TECLADO) SAE_TECLADO.lista(searchInput, autocompleteList);

    searchInput.addEventListener('input', function() {
        const val = this.value;
        if (!val) {
            closeAutocomplete();
            btnClear.style.display = 'none';
            mostrarHistorial();
            return;
        }
        btnClear.style.display = 'block';
        
        const term = val.toLowerCase();
        // "EP11" encuentra "EP 11" y "ep 8" encuentra "EP 08"
        const compacto = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Z0-9]/g, '').replace(/([A-Z])0+(\d)/g, '$1$2');
        const tc = compacto(val);
        const results = SAE_DATA.escuelas.filter(esc => {
            // Excluir registros agregados (BOLSON ACTUAL, TODAS LAS ESCUELAS)
            if (esc.nombre === 'BOLSON ACTUAL' || esc.nombre === 'TODAS LAS ESCUELAS') return false;
            return (esc.nombre && esc.nombre.toLowerCase().includes(term)) ||
                   (tc.length >= 2 && [esc.nombre].concat(esc.alias || []).some(n => compacto(n).includes(tc))) ||
                   (esc.alias || []).some(a => a.toLowerCase().includes(term)) ||
                   (esc.cue && esc.cue.toString().includes(term)) ||
                   (esc.direccion && esc.direccion.toLowerCase().includes(term)) ||
                   (esc.directora && esc.directora.toLowerCase().includes(term));
        }).slice(0, 10);

        autocompleteList.innerHTML = '';
        if (results.length === 0) {
            autocompleteList.innerHTML = '<div class="autocomplete-item" data-no-elegible><span class="ac-desc">No se encontraron escuelas</span></div>';
        } else {
            results.forEach(esc => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = `
                    <span class="ac-title">${esc.nombre}</span>
                    <span class="ac-desc">${esc.direccion || ''} - ${esc.localidad || ''}</span>
                `;
                div.addEventListener('click', () => {
                    selectSchool(esc);
                    searchInput.value = esc.nombre;
                    closeAutocomplete();
                });
                autocompleteList.appendChild(div);
            });
        }
        autocompleteList.style.display = 'block';
    });

    btnClear.addEventListener('click', () => {
        searchInput.value = '';
        btnClear.style.display = 'none';
        closeAutocomplete();
        document.getElementById('schoolProfile').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'block';
        activeSchool = null;
    });

    document.addEventListener('click', function(e) {
        if (e.target !== searchInput && !autocompleteList.contains(e.target)) {
            closeAutocomplete();
        }
    });
}

function closeAutocomplete() {
    document.getElementById('autocompleteList').style.display = 'none';
}

// 3. SELECCIÓN Y RENDERIZADO DE ESCUELA
function selectSchool(escuela) {
    activeSchool = escuela;
    if (typeof SAE_EXTRAS !== 'undefined') SAE_EXTRAS.guardarReciente(escuela);
    if (window.SAE_NAV) SAE_NAV.recordarEscuela(escuela.nombre);
    
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('schoolProfile').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Cabecera
    document.getElementById('cardSchoolName').textContent = escuela.nombre;
    document.getElementById('cardSchoolCue').textContent = `CUE: ${escuela.cue || '-'}`;
    
    // Badges - usar "tipo" que es el campo real del data.js
    const badgesContainer = document.getElementById('cardSchoolBadges');
    badgesContainer.innerHTML = `
        <span class="badge badge-level">${escuela.tipo || '-'}</span>
        <span class="badge badge-zone">Zona ${escuela.zona || '-'}</span>
        <span class="badge badge-provider">${window.SAE_PROV ? SAE_PROV.punto(escuela.proveedor) : ''}${escuela.proveedor || '-'}</span>
    `;

    // Resumen SAE
    renderSaeSummary(escuela);

    // Datos Contacto
    document.getElementById('cardAddress').textContent = escuela.direccion || '-';
    document.getElementById('cardLocality').textContent = escuela.localidad || '-';
    
    const rowComparte = document.getElementById('rowComparteEdificio');
    if (escuela.comparte_edificio && escuela.comparte_edificio.trim() !== '' && escuela.comparte_edificio.trim().toUpperCase() !== 'NO') {
        document.getElementById('cardComparte').textContent = escuela.comparte_edificio;
        rowComparte.style.display = 'block';
    } else {
        rowComparte.style.display = 'none';
    }

    document.getElementById('cardDirectoraCargo').textContent = (escuela.cargo || 'Directora') + ':';
    document.getElementById('cardDirectoraNombre').textContent = escuela.directora || '-';
    document.getElementById('cardTelefono').textContent = escuela.telefono || '-';
    document.getElementById('cardEmail').textContent = escuela.email || '-';

    // Acciones contacto
    const btnWa = document.getElementById('btnWhatsApp');
    if (escuela.telefono) {
        const num = escuela.telefono.replace(/\D/g, '');
        btnWa.href = `https://wa.me/549${num}`;
        btnWa.style.display = 'flex';
    } else {
        btnWa.style.display = 'none';
    }

    const btnMaps = document.getElementById('btnGoogleMaps');
    if (escuela.direccion) {
        const query = encodeURIComponent(`${escuela.direccion}, ${escuela.localidad || ''}, Tres de Febrero, Buenos Aires`);
        btnMaps.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    // Botón "Ver en el Mapa de Escuelas": abre el mapa posicionado en esta escuela
    const btnMapaEscuela = document.getElementById('btnMapaEscuela');
    if (btnMapaEscuela) {
        btnMapaEscuela.href = 'mapa/index.html?escuela=' + encodeURIComponent(escuela.nombre || '');
    }
    const btnReclamo = document.getElementById('btnReclamoEscuelaMobile');
    if (btnReclamo) btnReclamo.href = 'reclamos.html?escuela=' + encodeURIComponent(escuela.nombre || '');

    // Configurar Comedor Tab
    const tabComedor = document.getElementById('tabComedor');
    const hasComedor = SAE_MENUS.tieneComedor(escuela);
    if (hasComedor) {
        tabComedor.style.display = 'block';
        const etiqueta = SAE_MENUS.etiquetaComedor(escuela);
        tabComedor.textContent = (etiqueta === 'Refuerzo' ? '🥪 ' : '🍲 ') + etiqueta;
    } else {
        tabComedor.style.display = 'none';
        if (activeService === 'COMEDOR') {
            activeService = 'DM';
            document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('tabDM').classList.add('active');
        }
    }

    // Actualizar Calculadora
    updateCalculatorInputs();
    renderLists();
    renderEntregaMovil();   // (2.9.0) después de la calculadora: usa el nivel de ración elegido

    // Reclamos de la escuela (se cargan en segundo plano)
    if (typeof SAE_SYNC !== 'undefined') SAE_SYNC.pintarReclamosFicha(document.getElementById('reclamosFicha'), escuela);
}

function renderSaeSummary(escuela) {
    const container = document.getElementById('servicesCardsContainer');
    container.innerHTML = '';
    
    let hasServices = false;
    if (escuela.servicios && escuela.servicios.length > 0) {
        escuela.servicios.forEach(serv => {
            const cupoVal = getLatestCupo(serv);
            if (cupoVal && cupoVal > 0) {
                hasServices = true;
                const isComedor = SAE_MENUS.grupoDeServicio(serv.servicio) === 'COMEDOR';
                const nom = serv.servicio.toUpperCase().trim();
                let icon = nom === 'PATIOS' ? '🌳' : nom === 'REFUERZO' ? '🥪' : isComedor ? '🍲' : '☕';
                let shortName = nom === 'PATIOS' ? 'Patios' : nom === 'REFUERZO' ? 'Refuerzo'
                    : isComedor ? 'Comedor' : 'Desayuno/Merienda';
                
                const div = document.createElement('div');
                div.className = 'service-compact-item';
                div.innerHTML = `
                    <span class="serv-name">${icon} ${shortName}</span>
                    <span class="serv-val">${Math.round(cupoVal)} <small style="font-size:0.6rem; font-weight:normal;">rac.</small></span>
                    ${puedeCambiarCupoMovil() ? '<button type="button" class="m-cupo-editar" title="Cambiar el cupo de este servicio en la hoja">✏️ Cambiar</button>' : ''}
                `;
                // (2.9.0) Cambiar el cupo desde el celular (la misma ventana que en la compu)
                const bc = div.querySelector('.m-cupo-editar');
                if (bc) bc.addEventListener('click', () => SAE_CUPOS.abrirCambio(escuela, serv.servicio, getTodayStr()));
                container.appendChild(div);
            }
        });
    }

    if (!hasServices) {
        container.innerHTML = '<div style="grid-column: span 2; text-align:center; color:#6b7280; font-size:0.85rem;">No hay cupos SAE registrados</div>';
    }
}

function puedeCambiarCupoMovil() {
    return typeof SAE_CUPOS !== 'undefined' && typeof SAE_SYNC !== 'undefined' && SAE_SYNC.hayScript && SAE_SYNC.hayScript();
}

/* (2.9.0) QUÉ SE ENTREGA HOY en el celular: lo que cada proveedor le lleva a la escuela hoy
 * (el menú del día o días que corresponden según el proveedor), con el total de cada alimento.
 * Usa las mismas reglas que la compu (SAE_ENTREGAS) y los ajustes de ⚙️. Se puede achicar
 * (se recuerda, igual que en la compu). */
const LS_ENTREGA_PLEGADA = 'sae-entrega-plegada';
const LS_SEMANA_CICLO = 'sae-totales-semana';
function escM(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function numM(n) { return Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 }); }
function leerLSm(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function guardarLSm(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }

function renderEntregaMovil() {
    const card = document.getElementById('entregaMovil');
    if (!card) return;
    const E = window.SAE_ENTREGAS;
    const school = activeSchool;
    if (!school || !E || typeof SAE_MENUS === 'undefined') { card.style.display = 'none'; return; }
    card.style.display = '';
    const hoy = getTodayStr();
    const semana = leerLSm(LS_SEMANA_CICLO) === '1' ? 1 : 0;
    const plegada = leerLSm(LS_ENTREGA_PLEGADA) === '1';
    const nivelSel = document.getElementById('selectNivelGramaje');
    const nivel = nivelSel ? nivelSel.value : 'jardin';
    const feriados = (typeof SAE_EXTRAS !== 'undefined' && SAE_EXTRAS.FERIADOS) || {};
    const notas = [];
    const nota = (t) => { if (!notas.includes(t)) notas.push(t); };
    const porDia = {};
    const wd = E.fechaDe(hoy).getDay();
    if (wd === 0 || wd === 6) nota('Hoy es fin de semana: no hay entregas.');
    else (school.servicios || []).forEach(sv => {
        if (SAE_MENUS.sinMenu(sv.servicio)) return;
        const grupo = SAE_MENUS.grupoDeServicio(sv.servicio);
        const prov = sv.proveedor || school.proveedor || '';
        const provTxt = (window.SAE_PROV && SAE_PROV.nombre) ? SAE_PROV.nombre(prov) : prov;
        const ds = E.destinos(prov, hoy);
        if (ds === null) { if (prov) nota(`${provTxt} ya no entrega (${sv.servicio}).`); return; }
        if (!ds.length) {
            const exc = window.SAE_AJUSTES && SAE_AJUSTES.excepcionEntrega && SAE_AJUSTES.excepcionEntrega(prov, hoy);
            nota(exc ? `${provTxt} no entrega hoy (cambio de días cargado en ⚙️ Ajustes).` : `${provTxt} no entrega los ${E.nombreDia(hoy).toLowerCase()}.`);
            return;
        }
        ds.forEach(T => {
            if (feriados[T]) { nota(`${E.diaTexto(T)}: ${feriados[T].nombre} (no se cuenta).`); return; }
            const cupo = Math.round(SAE_MENUS.cupoEnFecha(sv, T));
            if (cupo <= 0) return;
            const b = SAE_MENUS.bloques(Object.assign({}, school, { servicios: [sv] }), grupo, E.nombreDia(T), T)[0];
            if (!b || b.sinEntrega) return;
            const listas = b.listas.filter(Boolean);
            const sem = E.otraSemana(hoy, T) ? 1 - semana : semana;
            const lista = listas[Math.min(sem, listas.length - 1)];
            if (lista) (porDia[T] = porDia[T] || []).push({ b, lista, cupo, prov: provTxt });
        });
    });

    const dias = Object.keys(porDia).sort();
    const resumen = dias.length ? `Hoy, ${E.diaTexto(hoy)}, lleva el menú del ${dias.map(E.diaTexto).join(' y del ')}` : `Hoy, ${E.diaTexto(hoy)}, no hay entregas`;
    let cuerpo = notas.map(t => `<div class="m-entrega-nota">📅 ${escM(t)}</div>`).join('');
    dias.forEach(T => {
        cuerpo += `<div class="m-entrega-dia">Para el ${escM(E.diaTexto(T))}</div>`;
        porDia[T].forEach(e => {
            const filas = (e.lista.ingredientes || []).map(ing => {
                const crudo = (ing[nivel] !== undefined && ing[nivel] !== null && !e.b.gramajeFijo) ? ing[nivel] : ing.jardin;
                if (SAE_MENUS.esCantidadNecesaria(crudo)) return `<tr><td>${escM(ing.alimento)}</td><td class="m-num">a granel</td></tr>`;
                const r = Number(crudo) || 0;
                if (!r) return '';
                const unid = ing.unidad === 'u' || ing.unidad === 'saquito';
                const tot = unid ? r * e.cupo : r * e.cupo / 1000;
                const u = ing.unidad === 'ml' ? 'L' : unid ? 'u' : 'kg';
                return `<tr><td>${escM(ing.alimento)}</td><td class="m-num">${numM(tot)} ${u}</td></tr>`;
            }).join('');
            cuerpo += `<div class="m-entrega-prest"><div class="m-entrega-cab"><strong>${escM(e.b.prestacion)}</strong>
                <span>${escM(e.prov)} · ${escM(e.lista.lista || '')} · <strong>${numM(e.cupo)}</strong> rac.</span></div>
                <table class="m-entrega-tabla"><tbody>${filas || '<tr><td colspan="2">Sin alimentos cargados</td></tr>'}</tbody></table></div>`;
        });
    });
    if (!cuerpo) cuerpo = '<div class="m-entrega-nota">Hoy no hay entregas para esta escuela.</div>';

    card.innerHTML = `<div class="m-entrega-top">
        <div class="card-title" style="margin:0"><span class="icon">🚚</span> Qué se entrega hoy</div>
        <button type="button" class="m-entrega-plegar" aria-expanded="${!plegada}" title="${plegada ? 'Mostrar' : 'Achicar'}">${plegada ? '▾' : '▴'}</button>
      </div>
      <div class="m-entrega-sub">${escM(resumen)}</div>` +
      (plegada ? '' : `<div class="m-entrega-ctrl"><select class="m-entrega-semana" aria-label="Semana del ciclo de menús">
          <option value="0"${semana === 0 ? ' selected' : ''}>Semana 1 (L1–5)</option>
          <option value="1"${semana === 1 ? ' selected' : ''}>Semana 2 (L6–10)</option>
        </select><small>Ración: ${escM(nivelSel ? nivelSel.options[nivelSel.selectedIndex].text : 'Jardín')} (se cambia en la calculadora)</small></div>${cuerpo}`);
    card.querySelector('.m-entrega-plegar').addEventListener('click', () => { guardarLSm(LS_ENTREGA_PLEGADA, plegada ? '0' : '1'); renderEntregaMovil(); });
    const ss = card.querySelector('.m-entrega-semana');
    if (ss) ss.addEventListener('change', () => { guardarLSm(LS_SEMANA_CICLO, ss.value); renderEntregaMovil(); });
}

// 4. PESTAÑAS (TABS)
function setupTabs() {
    const tabs = document.querySelectorAll('.mobile-tabs .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

function setupServiceTabs() {
    const btns = document.querySelectorAll('.service-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeService = btn.getAttribute('data-service');
            updateCalculatorInputs();
            updateDayHints();
            renderLists();
        });
    });
}

function setupDayButtons() {
    const btns = document.querySelectorAll('.btn-day');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeDay = btn.getAttribute('data-day');
            
            const daysMap = {'Lunes':1, 'Martes':2, 'Miércoles':3, 'Jueves':4, 'Viernes':5};
            dayNumberIndex = daysMap[activeDay] || 1;
            
            document.getElementById('headerDateDisplay').textContent = activeDay;
            actualizarAvisoDia();
            renderLists();
        });
    });
    updateDayHints();
}

function updateDayButtonsUI() {
    const btns = document.querySelectorAll('.btn-day');
    btns.forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(btns).find(b => b.getAttribute('data-day') === activeDay);
    if(activeBtn) activeBtn.classList.add('active');
}

function updateDayHints() {
    const isComedor = activeService === 'COMEDOR';
    document.getElementById('hintLunes').textContent = isComedor ? 'L1 y 6' : 'L1';
    document.getElementById('hintMartes').textContent = isComedor ? 'L2 y 7' : 'L2';
    document.getElementById('hintMiercoles').textContent = isComedor ? 'L3 y 8' : 'L3';
    document.getElementById('hintJueves').textContent = isComedor ? 'L4 y 9' : 'L4';
    document.getElementById('hintViernes').textContent = isComedor ? 'L5 y 10' : 'L5';
}

// 5. CALCULADORA Y GRAMAJES
function updateCalculatorInputs() {
    if (!activeSchool) return;
    
    // Buscar el servicio actual en la escuela
    let cupo = 0;
    if (activeSchool.servicios) {
        const servObj = activeSchool.servicios.find(s =>
            !SAE_MENUS.sinMenu(s.servicio) && SAE_MENUS.grupoDeServicio(s.servicio) === activeService);
        if (servObj) cupo = SAE_MENUS.cupoEnFecha(servObj, getTodayStr());
    }
    
    document.getElementById('inputCupoManual').value = Math.round(cupo);

    // Nivel de ración según la escuela (2.10.0: el mismo criterio que la compu y Totales, SAE_CALC)
    document.getElementById('selectNivelGramaje').value = SAE_CALC.nivelDe(activeSchool);
}

function setupCalculatorListeners() {
    const inputs = ['inputCupoManual', 'selectNivelGramaje', 'cfgDdl', 'cfgMermelada', 'cfgGalletitas', 'cfgMatecocido', 'cfgCacao'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', renderLists);
    });
    document.getElementById('selectNivelGramaje').addEventListener('change', () => renderEntregaMovil());

    document.getElementById('btnCopyWhatsApp').addEventListener('click', generateWhatsAppSummary);
    document.getElementById('btnPdfFicha').addEventListener('click', descargarPDF);
}

// RENDERIZADO DE LISTAS Y CÁLCULOS
function renderLists() {
    const container = document.getElementById('listsContainer');
    container.innerHTML = '';
    if (!activeSchool) return;

    // (2.6.0) Fecha del día elegido en esta semana: se aplican los ajustes de menú cargados desde la computadora
    const fechaMenu = window.SAE_AJUSTES ? SAE_AJUSTES.fechaDeDia(activeDay, getTodayStr()) : '';
    let bloques = SAE_MENUS.bloques(activeSchool, activeService, activeDay, fechaMenu);
    // Escuela sin servicios cargados: lista general de DM como referencia
    if (!bloques.length && activeService === 'DM') {
        const l = SAE_DATA.dmLists[String(dayNumberIndex)];
        bloques = [{ prestacion: 'Desayuno / Merienda', fuente: 'DM escuelas', servicioRef: null,
            listas: l ? [l] : [], sinEntrega: '', gramajeFijo: false }];
    }

    const cupoManual = parseInt(document.getElementById('inputCupoManual').value) || 0;
    const nivelSelected = document.getElementById('selectNivelGramaje').value;

    const envases = {
        ddl: parseFloat(document.getElementById('cfgDdl').value) || 400,
        mermelada: parseFloat(document.getElementById('cfgMermelada').value) || 400,
        galletitas: parseFloat(document.getElementById('cfgGalletitas').value) || 400,
        matecocido: parseFloat(document.getElementById('cfgMatecocido').value) || 25,
        cacao: parseFloat(document.getElementById('cfgCacao').value) || 180
    };

    if (!bloques.length) {
        container.innerHTML = '<div class="prest-vacio">Esta escuela no tiene prestaciones de este tipo.</div>';
        return;
    }

    let html = '';
    bloques.forEach((b, i) => {
        // El primer bloque usa el cupo editable; los demás, el de su propio servicio
        const cupo = i === 0 ? cupoManual : Math.round(SAE_MENUS.cupoEnFecha(b.servicioRef, getTodayStr()));
        const listasTxt = b.listas.map(l => l.lista).join(' y ');
        html += `
        <div class="prest-header${i > 0 ? ' prest-header-sep' : ''}">
            <div class="prest-titulo">
                <span class="prest-nombre">${b.prestacion}</span>
                <span class="prest-fuente">${b.fuente}${listasTxt ? ' · ' + listasTxt : ''}</span>
            </div>
            <div class="prest-cupo"><strong>${cupo}</strong> rac.</div>
            ${b.gramajeFijo ? '<div class="prest-nota">Gramaje propio de esta prestación (no depende del nivel).</div>' : ''}
            ${b.edades ? `<div class="edad-selector" role="group" aria-label="Edad de la sección maternal"><span class="edad-label">Edad:</span>${b.edades.map(o =>
                `<button type="button" class="edad-chip${o.valor === b.edad ? ' activo' : ''}" data-edad="${o.valor}" aria-pressed="${o.valor === b.edad}">${o.etiqueta}</button>`).join('')}</div>` : ''}
        </div>`;
        if (b.sinEntrega) {
            html += `<div class="prest-sin-entrega">📅 ${b.sinEntrega}</div>`;
            return;
        }
        b.listas.forEach(menuObj => {
            html += generateListHTML(menuObj, cupo, nivelSelected, envases);
        });
    });
    container.innerHTML = html;
    container.querySelectorAll('.edad-chip').forEach(btn => btn.addEventListener('click', () => {
        SAE_MENUS.elegirEdadMaternal(activeSchool, btn.dataset.edad);
        renderLists();
    }));
}

function generateListHTML(menuObj, cupo, nivel, envases) {
    const title = menuObj.lista || 'Lista';
    const desc = menuObj.nombre || '';
    
    let html = `
    <div class="menu-list-card">
        <div class="list-header">
            <h3>${title}</h3>
            <p>${desc}</p>
        </div>
        <table class="ing-table">
            <thead>
                <tr>
                    <th>Ingrediente</th>
                    <th>Total Estimado</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (menuObj.ingredientes) {
        menuObj.ingredientes.forEach(ing => {
            // Los gramajes están directamente como "jardin", "primaria", "secundaria"
            let gramajeUnitario = 0;
            if (nivel === 'jardin' && ing.jardin !== undefined) gramajeUnitario = ing.jardin;
            else if (nivel === 'secundaria' && ing.secundaria !== undefined) gramajeUnitario = ing.secundaria;
            else if (ing.primaria !== undefined) gramajeUnitario = ing.primaria;
            else if (ing.jardin !== undefined) gramajeUnitario = ing.jardin;
            // "c/n": cantidad necesaria, se envía a granel (sin total)
            if (SAE_MENUS.esCantidadNecesaria(gramajeUnitario)) {
                html += `<tr><td>${ing.alimento || ing.nombre || ''}<span style="font-size:0.7rem; color:#6b7280; display:block;">(${gramajeUnitario})</span></td>` +
                    `<td class="text-right"><span class="calc-val">a granel</span></td></tr>`;
                return;
            }
            // Un 0 significa que ese nivel no recibe ese alimento
            if (!gramajeUnitario) return;

            // El nombre del ingrediente es "alimento" ((2.6.0) con la marca si tiene un ajuste)
            const nombreIng = ing.alimento || ing.nombre || 'Sin nombre';
            const marcaAj = window.SAE_AJUSTES ? SAE_AJUSTES.marca(ing) : '';
            const unidad = ing.unidad || 'g';

            const totalBruto = gramajeUnitario * cupo;
            let presentacionInfo = '';
            let totalDisplay = '';

            if (totalBruto === 0) {
                totalDisplay = '0';
            } else {
                if (unidad === 'g') totalDisplay = `${(totalBruto / 1000).toFixed(2)} kg`;
                else if (unidad === 'cc' || unidad === 'ml') totalDisplay = `${(totalBruto / 1000).toFixed(2)} L`;
                else if (unidad === 'saquito' || unidad === 'saquitos' || unidad === 'u' || unidad === 'unidades') totalDisplay = `${Math.ceil(totalBruto)} un.`;
                else totalDisplay = `${totalBruto} ${unidad}`;
                // (2.10.0) Envases: el mismo cálculo que la compu y Totales (SAE_CALC)
                const porUnidad = unidad === 'saquito' || unidad === 'saquitos' || unidad === 'u' || unidad === 'unidades';
                const env = SAE_CALC.envase(nombreIng, porUnidad ? totalBruto : totalBruto / 1000, unidad, {
                    dulce_leche_gramos: envases.ddl, mermelada_gramos: envases.mermelada, galletitas_gramos: envases.galletitas,
                    cacao_gramos: envases.cacao, matecocido_saquitos: envases.matecocido });
                if (env) presentacionInfo = `<span class="packaging-info">~ ${env.txt}</span>`;
            }

            html += `
                <tr>
                    <td>
                        ${nombreIng}${marcaAj}
                        <span style="font-size:0.7rem; color:#6b7280; display:block;">(${gramajeUnitario} ${unidad} x rac.)</span>
                    </td>
                    <td>
                        <span class="calc-val">${totalDisplay}</span>
                        ${presentacionInfo}
                    </td>
                </tr>
            `;
        });
    }

    html += `
            </tbody>
        </table>
    </div>
    `;
    return html;
}

// 6. COPIAR RESUMEN A PORTAPAPELES
function generateWhatsAppSummary() {
    if (!activeSchool) return;

    let text = `*${activeSchool.nombre}*\n`;
    text += `📍 ${activeSchool.direccion || '-'}, ${activeSchool.localidad || '-'}\n`;
    text += `👤 ${activeSchool.cargo || 'Directora'}: ${activeSchool.directora || '-'}\n`;
    text += `📞 Tel: ${activeSchool.telefono || '-'}\n\n`;
    
    text += `*Cupos SAE:*\n`;
    let hasServs = false;
    if (activeSchool.servicios) {
        activeSchool.servicios.forEach(s => {
            const cupoVal = getLatestCupo(s);
            if (cupoVal && cupoVal > 0) {
                text += `- ${s.servicio}: ${Math.round(cupoVal)} raciones\n`;
                hasServs = true;
            }
        });
    }
    if (!hasServs) text += `Sin cupos registrados.\n`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ ¡Resumen copiado! Pegalo en WhatsApp', 'success');
        // Feedback visual en el botón
        const btn = document.getElementById('btnCopyWhatsApp');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="icon">✅</span> ¡Copiado!';
            btn.style.background = '#059669';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2500);
        }
    }).catch(err => {
        console.error('Error al copiar: ', err);
        showToast('⚠️ No se pudo copiar el texto', 'error');
    });
}

// 6b. DESCARGAR FICHA EN PDF
async function descargarPDF() {
    if (!activeSchool || typeof SAE_EXTRAS === 'undefined') return;
    const color = typeof SAE_IMPRESION !== 'undefined' ? await SAE_IMPRESION.elegir('Descargar la ficha en PDF') : 'color';
    if (!color) return;
    const btn = document.getElementById('btnPdfFicha');
    const htmlOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="icon">⏳</span> Generando PDF...';
    try {
        const modo = await SAE_EXTRAS.descargarFichaPDF({
            escuela: activeSchool,
            fecha: getTodayStr(),
            dia: activeDay,
            servicio: activeService,
            cupo: parseInt(document.getElementById('inputCupoManual').value) || 0,
            nivel: document.getElementById('selectNivelGramaje').value,
            color
        });
        if (modo === 'pdf') {
            showToast('📄 PDF descargado', 'success');
        } else {
            showToast('🖨️ Sin conexión: elegí "Guardar como PDF" en la impresión', 'info');
        }
    } catch (err) {
        console.error(err);
        showToast('⚠️ No se pudo generar el PDF', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = htmlOriginal;
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastMessage');
    toast.textContent = message;
    toast.className = `toast-notification toast-${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.className = toast.className.replace(' show', '');
    }, 3500);
}

// 7. MODO OSCURO
function initDarkMode() {
    const html = document.documentElement;
    const btn = document.getElementById('btnDarkMode');
    const icon = document.getElementById('darkModeIcon');
    if (!btn || !icon) return;

    // Sincronizar ícono con el estado actual (ya aplicado por el script anti-flash)
    icon.textContent = html.classList.contains('dark') ? '☀️' : '🌙';

    btn.addEventListener('click', () => {
        const nowDark = html.classList.toggle('dark');
        icon.textContent = nowDark ? '☀️' : '🌙';
        localStorage.setItem('sae-darkmode', nowDark);
        showToast(nowDark ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado', 'info');
    });
}

// 8. DATOS NUEVOS DESDE LA PLANILLA (sync.js)
window.addEventListener('sae-datos-actualizados', () => {
    updateTotalEscuelas();
    if (activeSchool) {
        const actual = SAE_DATA.escuelas.find(e => e.nombre === activeSchool.nombre) || activeSchool;
        activeSchool = actual;
        renderSaeSummary(actual);
        renderEntregaMovil();
        updateCalculatorInputs();
        renderLists();
    }
});

// (2.6.0) Ajustes de menú nuevos: se recalcula la lista
window.addEventListener('sae-ajustes', () => { if (activeSchool) { renderLists(); renderEntregaMovil(); } });
