/**
 * ==========================================================================
 * APLICACIÓN BUSCADOR & GESTIÓN SAE - TRES DE FEBRERO
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Estado global de la aplicación
  const state = {
    escuelas: (typeof SAE_DATA !== 'undefined' && SAE_DATA.escuelas) ? SAE_DATA.escuelas : [],
    dmLists: (typeof SAE_DATA !== 'undefined' && SAE_DATA.dmLists) ? SAE_DATA.dmLists : {},
    comedorDays: (typeof SAE_DATA !== 'undefined' && SAE_DATA.comedorDays) ? SAE_DATA.comedorDays : {},
    envases: (typeof SAE_DATA !== 'undefined' && SAE_DATA.envasesDefault) ? { ...SAE_DATA.envasesDefault } : {
      galletitas_gramos: 400,
      dulce_leche_gramos: 400,
      mermelada_gramos: 400,
      matecocido_saquitos: 25,
      cacao_gramos: 180
    },
    currentSchool: null,
    currentDate: (function() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(), // Hoy
    currentDayName: 'Viernes',  // 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'
    currentService: 'DM',       // 'DM' o 'COMEDOR'
    currentLevel: 'jardin',     // 'jardin', 'primaria', 'secundaria'
    activeLevelFilter: 'TODOS',
    activeZonaFilter: 'TODAS',
    activeProvFilter: 'TODOS',
    activeLocFilter: 'TODAS',
    currentView: 'ficha'        // 'ficha' o 'directorio'
  };

  // Mapeo numérico de días de semana a nombre y número de lista DM
  // 1=Lunes (Lista 1), 2=Martes (Lista 2), 3=Miércoles (Lista 3), 4=Jueves (Lista 4), 5=Viernes (Lista 5)
  const DAY_INFO = {
    'Lunes': { num: '1', dm: 'Lista 1', comedor: 'Lista 1 y 6' },
    'Martes': { num: '2', dm: 'Lista 2', comedor: 'Lista 2 y 7' },
    'Miércoles': { num: '3', dm: 'Lista 3', comedor: 'Lista 3 y 8' },
    'Jueves': { num: '4', dm: 'Lista 4', comedor: 'Lista 4 y 9' },
    'Viernes': { num: '5', dm: 'Lista 5', comedor: 'Lista 5 y 10' }
  };

  // Referencias a elementos del DOM
  const elements = {
    // Header & Stats
    statsTotalEscuelas: document.getElementById('statsTotalEscuelas'),
    btnToggleView: document.getElementById('btnToggleView'),
    btnSyncModal: document.getElementById('btnSyncModal'),
    
    // Controles principales
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    autocompleteList: document.getElementById('autocompleteList'),
    dateInput: document.getElementById('dateInput'),
    quickDateBtns: document.querySelectorAll('.btn-quick-date'),
    levelChips: document.querySelectorAll('.filter-chips .chip'),
    filterZona: document.getElementById('filterZona'),
    filterProveedor: document.getElementById('filterProveedor'),
    filterLocalidad: document.getElementById('filterLocalidad'),
    schoolSelect: document.getElementById('schoolSelect'),
    
    // Vistas
    viewFicha: document.getElementById('viewFicha'),
    viewDirectorio: document.getElementById('viewDirectorio'),
    desktopWelcomeScreen: document.getElementById('desktopWelcomeScreen'),
    fichaDashboardGrid: document.getElementById('fichaDashboardGrid'),
    welcomeTotalEscuelas: document.getElementById('welcomeTotalEscuelas'),
    welcomeTotalProveedores: document.getElementById('welcomeTotalProveedores'),
    welcomeTotalRaciones: document.getElementById('welcomeTotalRaciones'),
    
    // Ficha de la Escuela
    cardSchoolName: document.getElementById('cardSchoolName'),
    cardSchoolBadges: document.getElementById('cardSchoolBadges'),
    cardSchoolCue: document.getElementById('cardSchoolCue'),
    cardAddress: document.getElementById('cardAddress'),
    cardLocality: document.getElementById('cardLocality'),
    rowComparteEdificio: document.getElementById('rowComparteEdificio'),
    cardComparte: document.getElementById('cardComparte'),
    cardDirectoraCargo: document.getElementById('cardDirectoraCargo'),
    cardDirectoraNombre: document.getElementById('cardDirectoraNombre'),
    cardTelefono: document.getElementById('cardTelefono'),
    cardEmail: document.getElementById('cardEmail'),
    
    // Botones de acción rápida
    btnGoogleMaps: document.getElementById('btnGoogleMaps'),
    btnRecorrido: document.getElementById('btnRecorrido'),
    btnWhatsApp: document.getElementById('btnWhatsApp'),
    btnLlamar: document.getElementById('btnLlamar'),
    btnEmail: document.getElementById('btnEmail'),
    btnCopyWhatsApp: document.getElementById('btnCopyWhatsApp'),
    btnPrintFicha: document.getElementById('btnPrintFicha'),
    btnPdfFicha: document.getElementById('btnPdfFicha'),
    avisoDia: document.getElementById('avisoDia'),
    
    // Servicios y Cupos
    badgeFechaServicio: document.getElementById('badgeFechaServicio'),
    servicesCardsContainer: document.getElementById('servicesCardsContainer'),
    
    // Calculadora
    serviceTabs: document.querySelectorAll('#serviceTabs .tab-btn'),
    tabDM: document.getElementById('tabDM'),
    tabComedor: document.getElementById('tabComedor'),
    dayButtons: document.querySelectorAll('#dayButtons .btn-day'),
    activeDayDisplay: document.getElementById('activeDayDisplay'),
    inputCupoManual: document.getElementById('inputCupoManual'),
    selectNivelGramaje: document.getElementById('selectNivelGramaje'),
    calcSubtitle: document.getElementById('calcSubtitle'),
    listsContainer: document.getElementById('listsContainer'),
    
    // Configuración de envases
    cfgDdl: document.getElementById('cfgDdl'),
    cfgMermelada: document.getElementById('cfgMermelada'),
    cfgGalletitas: document.getElementById('cfgGalletitas'),
    cfgMatecocido: document.getElementById('cfgMatecocido'),
    cfgCacao: document.getElementById('cfgCacao'),
    
    // Directorio
    dirSearchInput: document.getElementById('dirSearchInput'),
    directoryTableBody: document.getElementById('directoryTableBody'),
    btnExportCsv: document.getElementById('btnExportCsv'),
    
    // Modal & Toast
    syncModal: document.getElementById('syncModal'),
    btnCloseSyncModal: document.getElementById('btnCloseSyncModal'),
    btnDoneSync: document.getElementById('btnDoneSync'),
    btnFetchOnline: document.getElementById('btnFetchOnline'),
    syncStatusMsg: document.getElementById('syncStatusMsg'),
    fileUpload: document.getElementById('fileUpload'),
    toastMessage: document.getElementById('toastMessage')
  };

  /**
   * ========================================================================
   * INICIALIZACIÓN
   * ========================================================================
   */
  function init() {
    // 1. Configurar fecha y día inicial
    elements.dateInput.value = state.currentDate;
    syncDayFromDate(state.currentDate);

    // 2. Poblar selector directo de escuelas
    populateSchoolSelect();

    // 3. Arrancar sin escuela seleccionada — mostrar estado vacío
    showEmptyState();

    // 4. Poblar tabla del directorio
    renderDirectoryTable();

    // 5. Configurar Event Listeners
    setupEventListeners();

    // Contadores con la cantidad real de establecimientos
    const total = state.escuelas.length;
    const txtTotal = elements.statsTotalEscuelas && elements.statsTotalEscuelas.querySelector('.text');
    if (txtTotal) txtTotal.textContent = `${total} Establecimientos`;
    const sub = document.getElementById('dirSubtitulo');
    if (sub) sub.textContent = `Listado de las ${total} instituciones del distrito de Tres de Febrero`;

    // Escuela precargada desde otra página: index.html?escuela=EP%2011
    try {
      const pre = new URLSearchParams(location.search).get('escuela');
      if (pre) {
        const m = pre.trim().toUpperCase();
        const e = state.escuelas.find(x => (x.nombre || '').toUpperCase() === m ||
          (x.alias || []).some(a => String(a).toUpperCase() === m));
        if (e) selectSchool(e);
      }
    } catch (err) { /* sin escuela precargada */ }

    console.log('App SAE iniciada con éxito. Escuelas cargadas:', state.escuelas.length);
  }

  /**
   * Muestra la ficha en estado vacío (sin escuela seleccionada)
   */
  function showEmptyState() {
    elements.cardSchoolName.textContent = 'Buscá un establecimiento';
    elements.cardSchoolCue.textContent = '';
    elements.cardSchoolBadges.innerHTML = '';
    elements.cardAddress.textContent = '-';
    elements.cardLocality.textContent = '-';
    elements.rowComparteEdificio.style.display = 'none';
    elements.cardDirectoraCargo.textContent = 'Directora:';
    elements.cardDirectoraNombre.textContent = '-';
    elements.cardTelefono.textContent = '-';
    elements.cardEmail.textContent = '-';
    elements.servicesCardsContainer.innerHTML =
      '<p style="color:var(--text-muted);font-size:0.88rem;padding:0.5rem 0;">Seleccioná una escuela para ver sus servicios.</p>';
    elements.listsContainer.innerHTML =
      '<p style="color:var(--text-muted);font-size:0.88rem;padding:1rem 0;text-align:center;">🔍 Usá el buscador para ver el menú y los gramajes de una escuela.</p>';
    // Limpiar buscador y select
    elements.searchInput.value = '';
    elements.btnClearSearch.style.display = 'none';
    elements.schoolSelect.value = '';
    // Deshabilitar botones de acción hasta tener escuela
    [elements.btnWhatsApp, elements.btnLlamar, elements.btnEmail,
     elements.btnCopyWhatsApp, elements.btnPrintFicha, elements.btnPdfFicha, elements.btnGoogleMaps,
     elements.btnRecorrido].forEach(btn => {
      if (btn) {
        btn.style.opacity = '0.4';
        btn.style.pointerEvents = 'none';
      }
    });
  }

  /**
   * Sincronizar día de la semana a partir de la fecha seleccionada
   */
  function syncDayFromDate(dateStr) {
    state.currentDate = dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      let dayName = days[d.getDay()];
      // Si cae fin de semana, normalizar al día hábil más cercano (Viernes o Lunes)
      if (dayName === 'Sábado' || dayName === 'Domingo') dayName = 'Viernes';
      state.currentDayName = dayName;
    }
    updateDayButtonsUI();
    updateDateBadge();
  }

  function updateDayButtonsUI() {
    elements.dayButtons.forEach(btn => {
      if (btn.dataset.day === state.currentDayName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    if (elements.activeDayDisplay) {
      elements.activeDayDisplay.textContent = state.currentDayName;
    }
    if (typeof SAE_EXTRAS !== 'undefined') {
      SAE_EXTRAS.actualizarAviso(elements.avisoDia, state.currentDate, state.currentDayName);
    }
  }

  function updateDateBadge() {
    if (elements.badgeFechaServicio) {
      elements.badgeFechaServicio.textContent = `Servicio activo: ${state.currentDate} (${state.currentDayName})`;
    }
  }

  /**
   * Poblar select desplegable de escuelas
   */
  function populateSchoolSelect() {
    elements.schoolSelect.innerHTML = '';
    const filtered = getFilteredSchools();
    
    filtered.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.nombre} (${e.tipo})`;
      elements.schoolSelect.appendChild(opt);
    });

    if (state.currentSchool) {
      elements.schoolSelect.value = state.currentSchool.id;
    }
  }

  /**
   * Filtrar escuelas según chips, zona y proveedor
   */
  function getFilteredSchools() {
    return state.escuelas.filter(e => {
      if (state.activeLevelFilter !== 'TODOS' && e.tipo !== state.activeLevelFilter) {
        return false;
      }
      if (state.activeZonaFilter !== 'TODAS' && e.zona !== state.activeZonaFilter) {
        return false;
      }
      if (state.activeProvFilter !== 'TODOS') {
        const provs = (e.proveedor || '') + ' ' + (e.servicios || []).map(s => s.proveedor).join(' ');
        if (!provs.toUpperCase().includes(state.activeProvFilter.toUpperCase())) {
          return false;
        }
      }
      if (state.activeLocFilter !== 'TODAS' && (e.localidad || '') !== state.activeLocFilter) {
        return false;
      }
      return true;
    });
  }

  /**
   * ========================================================================
   * SELECCIONAR ESCUELA Y ACTUALIZAR VISTAS
   * ========================================================================
   */
  function selectSchool(school) {
    if (!school) return;
    state.currentSchool = school;
    if (typeof SAE_EXTRAS !== 'undefined') SAE_EXTRAS.guardarReciente(school);

    // Ocultar pantalla de bienvenida y mostrar grid
    if (elements.desktopWelcomeScreen) elements.desktopWelcomeScreen.style.display = 'none';
    if (elements.fichaDashboardGrid) elements.fichaDashboardGrid.style.display = 'grid';

    // Re-habilitar botones de acción (pueden haber sido deshabilitados en estado vacío)
    [elements.btnWhatsApp, elements.btnLlamar, elements.btnEmail,
     elements.btnCopyWhatsApp, elements.btnPrintFicha, elements.btnPdfFicha, elements.btnGoogleMaps,
     elements.btnRecorrido].forEach(btn => {
      if (btn) {
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
      }
    });

    // Actualizar valor en select y buscador
    elements.schoolSelect.value = school.id;
    elements.searchInput.value = school.nombre;
    elements.btnClearSearch.style.display = 'block';
    elements.autocompleteList.style.display = 'none';

    // 1. Actualizar Ficha Institucional
    elements.cardSchoolName.textContent = school.nombre;
    elements.cardSchoolCue.textContent = school.cue ? `CUE: ${school.cue}` : 'CUE: Sin asignar';
    
    // Badges
    elements.cardSchoolBadges.innerHTML = `
      <span class="badge badge-level">${school.tipo}</span>
      ${school.zona ? `<span class="badge badge-zona">Zona ${school.zona}</span>` : ''}
      ${school.proveedor ? `<span class="badge badge-prov">${school.proveedor}</span>` : ''}
    `;

    // Localización
    elements.cardAddress.textContent = school.direccion || '-';
    elements.cardLocality.textContent = school.localidad || 'Tres de Febrero';
    
    if (school.comparte_edificio) {
      elements.rowComparteEdificio.style.display = 'flex';
      elements.cardComparte.textContent = school.comparte_edificio;
    } else {
      elements.rowComparteEdificio.style.display = 'none';
    }

    // Directivos & Contacto
    elements.cardDirectoraCargo.textContent = `${school.cargo || 'Directora'}:`;
    elements.cardDirectoraNombre.textContent = school.directora || 'No registrada';
    elements.cardTelefono.textContent = formatPhone(school.telefono) || '-';
    elements.cardEmail.textContent = school.email || '-';

    // 2. Configurar Botones de Acción
    setupActionButtons(school);

    // 3. Ajustar Nivel para Gramaje automáticamente
    const nombreMayus = (school.nombre || '').toUpperCase();
    if (school.tipo === 'Dispositivo') {
      // UDI y EPI: primera infancia · Envión: adolescentes · Centros Esperanza: primaria
      state.currentLevel = /^(UDI|EPI)\s/.test(nombreMayus) ? 'jardin'
        : /^ENVI[OÓ]N/.test(nombreMayus) ? 'secundaria' : 'primaria';
    } else if (school.tipo.includes('Jardín') || school.tipo === 'Escuela Municipal') {
      state.currentLevel = 'jardin';
    } else if (school.tipo.includes('Primaria') || school.tipo.includes('Centro')) {
      state.currentLevel = 'primaria';
    } else {
      state.currentLevel = 'secundaria';
    }
    elements.selectNivelGramaje.value = state.currentLevel;

    // 4. VERIFICAR SI TIENE COMEDOR Y CONDICIONAR LA PESTAÑA COMEDOR
    updateComedorTabVisibility(school);

    // 5. Renderizar Servicios y Cupos
    renderServicesAndCupos();

    // 6. Actualizar Calculadora con las listas exactas
    renderCalculator();

    // 7. Reclamos de la escuela (se cargan en segundo plano)
    if (typeof SAE_SYNC !== 'undefined') SAE_SYNC.pintarReclamosFicha(document.getElementById('reclamosFicha'), school);
  }

  /**
   * REQUISITO: Si la escuela/jardín no tiene comedor, la opción de comedor (almuerzo) NO figura.
   */
  function updateComedorTabVisibility(school) {
    const hasComedor = SAE_MENUS.tieneComedor(school);
    
    if (hasComedor) {
      elements.tabComedor.style.display = 'inline-flex';
      const etiqueta = SAE_MENUS.etiquetaComedor(school);
      elements.tabComedor.textContent = (etiqueta === 'Refuerzo' ? '🥪 ' : '🍲 ') + etiqueta;
    } else {
      // Ocultar pestaña Comedor por completo
      elements.tabComedor.style.display = 'none';
      // Si estaba en Comedor, forzar cambio a DM
      if (state.currentService === 'COMEDOR') {
        state.currentService = 'DM';
      }
    }
    updateServiceTabsUI();
  }

  /**
   * Configurar enlaces directos (Maps, WhatsApp, Tel, Mail)
   */
  function setupActionButtons(school) {
    const addressQuery = encodeURIComponent(`${school.direccion || school.nombre}, Tres de Febrero, Buenos Aires`);
    
    // Mapa de Escuelas (botón de la ficha) -> abre el mapa posicionado en la escuela seleccionada
    const nombreEscuela = school.nombre || '';
    const tieneSae = (school.servicios || []).length > 0;
    elements.btnGoogleMaps.href = 'mapa/index.html?escuela=' + encodeURIComponent(nombreEscuela);
    const btnReclamoEscuela = document.getElementById('btnReclamoEscuela');
    if (btnReclamoEscuela) btnReclamoEscuela.href = 'reclamos.html?escuela=' + encodeURIComponent(nombreEscuela);
    if (!tieneSae) {
      elements.btnGoogleMaps.setAttribute('title', 'Esta escuela no tiene SAE registrado en el mapa. Se abrirá la vista general.');
      elements.btnGoogleMaps.style.opacity = '0.65';
    } else {
      elements.btnGoogleMaps.setAttribute('title', 'Abrir el mapa de escuelas');
      elements.btnGoogleMaps.style.opacity = '';
    }
    
    // Recorrido desde Municipalidad
    elements.btnRecorrido.href = `https://www.google.com/maps/dir/?api=1&origin=Municipalidad+de+Tres+de+Febrero,+Alberdi+4840,+Caseros&destination=${addressQuery}`;

    // WhatsApp
    const rawTel = (school.telefono || '').replace(/\D/g, '');
    if (rawTel.length >= 8) {
      let waNumber = rawTel;
      if (!waNumber.startsWith('549') && !waNumber.startsWith('54')) {
        if (waNumber.startsWith('11') || waNumber.startsWith('15')) {
          waNumber = '549' + waNumber.replace(/^15/, '11');
        } else {
          waNumber = '54911' + waNumber;
        }
      }
      const defaultMsg = encodeURIComponent(`Hola ${school.directora || 'Directora'}, le escribo desde el Servicio Alimentario Escolar (SAE) de Tres de Febrero respecto a ${school.nombre}.`);
      elements.btnWhatsApp.href = `https://api.whatsapp.com/send?phone=${waNumber}&text=${defaultMsg}`;
      elements.btnWhatsApp.style.opacity = '1';
      elements.btnWhatsApp.style.pointerEvents = 'auto';
    } else {
      elements.btnWhatsApp.href = '#';
      elements.btnWhatsApp.style.opacity = '0.5';
      elements.btnWhatsApp.style.pointerEvents = 'none';
    }

    // Teléfono
    if (school.telefono) {
      elements.btnLlamar.href = `tel:${school.telefono}`;
      elements.btnLlamar.style.opacity = '1';
      elements.btnLlamar.style.pointerEvents = 'auto';
    } else {
      elements.btnLlamar.href = '#';
      elements.btnLlamar.style.opacity = '0.5';
      elements.btnLlamar.style.pointerEvents = 'none';
    }

    // Email
    if (school.email) {
      elements.btnEmail.href = `mailto:${school.email}?subject=Consulta%20SAE%20-%20${encodeURIComponent(school.nombre)}`;
      elements.btnEmail.style.opacity = '1';
      elements.btnEmail.style.pointerEvents = 'auto';
    } else {
      elements.btnEmail.href = '#';
      elements.btnEmail.style.opacity = '0.5';
      elements.btnEmail.style.pointerEvents = 'none';
    }
  }

  /**
   * Renderizar tarjetas de servicios activos y sus cupos para la fecha
   */
  function renderServicesAndCupos() {
    const school = state.currentSchool;
    elements.servicesCardsContainer.innerHTML = '';

    if (!school || !school.servicios || school.servicios.length === 0) {
      elements.servicesCardsContainer.innerHTML = `
        <div class="service-card-item active-calc">
          <div class="service-info">
            <h4>Desayuno / Merienda (DM)</h4>
            <div class="service-provider">Proveedor: ${school.proveedor || 'Sin asignar'}</div>
          </div>
          <div class="service-cupo-box">
            <div class="cupo-number">0</div>
            <div class="cupo-label">Cupo activo</div>
          </div>
        </div>
      `;
      elements.inputCupoManual.value = 0;
      return;
    }

    let defaultCupoForCalc = 0;
    let foundServiceForTab = false;

    school.servicios.forEach(s => {
      const isComedor = SAE_MENUS.grupoDeServicio(s.servicio) === 'COMEDOR';
      const isDM = !isComedor;
      const conMenu = !SAE_MENUS.sinMenu(s.servicio);
      
      const cupoVal = Math.round(SAE_MENUS.cupoEnFecha(s, state.currentDate));

      // El cupo de la calculadora es el del primer servicio (con menú) de la pestaña activa
      if (conMenu && !foundServiceForTab &&
          ((state.currentService === 'COMEDOR' && isComedor) || (state.currentService === 'DM' && isDM))) {
        defaultCupoForCalc = cupoVal;
        foundServiceForTab = true;
      }

      const card = document.createElement('div');
      card.className = `service-card-item ${((state.currentService === 'COMEDOR' && isComedor) || (state.currentService === 'DM' && isDM)) ? 'active-calc' : ''}`;
      card.innerHTML = `
        <div class="service-info">
          <h4>${s.servicio}</h4>
          <div class="service-provider">Proveedor: <strong>${s.proveedor || school.proveedor || 'Oficial'}</strong></div>
          ${s.cupo_especial ? `<div class="text-xs text-muted">Cupo Especial: ${s.cupo_especial}</div>` : ''}
        </div>
        <div class="service-cupo-box">
          <div class="cupo-number">${cupoVal}</div>
          <div class="cupo-label">Raciones / Día</div>
        </div>
      `;

      card.addEventListener('click', () => {
        state.currentService = isComedor ? 'COMEDOR' : 'DM';
        updateServiceTabsUI();
        renderServicesAndCupos();
        renderCalculator();
      });

      elements.servicesCardsContainer.appendChild(card);
    });

    if (!foundServiceForTab && school.servicios.length > 0) {
      const firstServ = school.servicios.find(x => !SAE_MENUS.sinMenu(x.servicio)) || school.servicios[0];
      const isComedor = SAE_MENUS.grupoDeServicio(firstServ.servicio) === 'COMEDOR';
      state.currentService = isComedor ? 'COMEDOR' : 'DM';
      updateServiceTabsUI();
      defaultCupoForCalc = Math.round(SAE_MENUS.cupoEnFecha(firstServ, state.currentDate));
    }

    elements.inputCupoManual.value = defaultCupoForCalc;
  }

  function updateServiceTabsUI() {
    elements.serviceTabs.forEach(t => {
      if (t.dataset.service === state.currentService) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
  }

  /**
   * ========================================================================
   * CALCULADORA: RENDERIZAR LISTAS SEGÚN SERVICIO Y DÍA DE LA SEMANA
   * ========================================================================
   */
  function renderCalculator() {
    elements.listsContainer.innerHTML = '';
    const day = state.currentDayName;
    const cupoManual = parseFloat(elements.inputCupoManual.value) || 0;
    const nivel = state.currentLevel;
    const school = state.currentSchool;
    if (!school) return;

    let bloques = SAE_MENUS.bloques(school, state.currentService, day);

    // Escuela sin servicios cargados: se muestra la lista general de DM como referencia
    if (!bloques.length && state.currentService === 'DM') {
      const l = state.dmLists[DAY_INFO[day].num];
      bloques = [{ prestacion: 'Desayuno / Merienda', fuente: 'DM escuelas', servicio: 'DM',
        proveedor: school.proveedor || '', servicioRef: null, listas: l ? [l] : [], sinEntrega: '', gramajeFijo: false }];
    }

    const nombres = [...new Set(bloques.map(b => b.prestacion))];
    elements.calcSubtitle.textContent = `${nombres.join(' + ') || 'Sin prestaciones'} - Día ${day}`;

    if (!bloques.length) {
      elements.listsContainer.innerHTML = '<p class="prest-vacio">Esta escuela no tiene prestaciones de este tipo.</p>';
      return;
    }

    bloques.forEach((b, i) => {
      // El primer bloque usa el cupo editable; los demás, el cupo de su propio servicio
      const cupo = i === 0 ? cupoManual
        : Math.round(SAE_MENUS.cupoEnFecha(b.servicioRef, state.currentDate));

      const cab = document.createElement('div');
      cab.className = 'prest-header' + (i > 0 ? ' prest-header-sep' : '');
      const listasTxt = b.listas.map(l => l.lista).join(' y ');
      cab.innerHTML = `
        <div class="prest-titulo">
          <span class="prest-nombre">${b.prestacion}</span>
          <span class="prest-fuente">${b.fuente}${listasTxt ? ' · ' + listasTxt : ''}</span>
        </div>
        <div class="prest-cupo"><strong>${formatNumber(cupo)}</strong> raciones${i === 0 ? ' <small>(editable arriba)</small>' : ''}</div>
        ${b.gramajeFijo ? '<div class="prest-nota">Gramaje propio de esta prestación (no depende de “Ración según Nivel”).</div>' : ''}
      `;
      elements.listsContainer.appendChild(cab);

      if (b.sinEntrega) {
        const aviso = document.createElement('div');
        aviso.className = 'prest-sin-entrega';
        aviso.textContent = '📅 ' + b.sinEntrega;
        elements.listsContainer.appendChild(aviso);
        return;
      }
      b.listas.forEach((l, j) => {
        renderListCard(l.lista, l.nombre, l.ingredientes, cupo, nivel,
          j === 0 ? 'list-variant-a' : 'list-variant-b',
          j === 0 ? 'badge-tag-primary' : 'badge-tag-purple');
      });
    });
  }

  /**
   * Renderizar una tarjeta de Lista individual con su tabla de ingredientes
   */
  function renderListCard(listaTag, menuNombre, ingredientes, cupo, nivel, variantClass, badgeTagClass) {
    const cardBlock = document.createElement('div');
    cardBlock.className = `single-list-block ${variantClass}`;

    // Header del bloque de lista
    const header = document.createElement('div');
    header.className = 'list-block-header';
    header.innerHTML = `
      <span class="list-badge-tag ${badgeTagClass}">${listaTag}</span>
      <h3 class="list-title-text">${menuNombre}</h3>
    `;
    cardBlock.appendChild(header);

    // Tabla de ingredientes
    const tableResp = document.createElement('div');
    tableResp.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'calc-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Ingrediente / Alimento</th>
          <th class="text-center">Gramaje x Ración</th>
          <th class="text-right">Total en Kg / L / U</th>
          <th class="text-right">Bultos / Envases Estimados</th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2">TOTAL PROYECTADO (${listaTag}):</td>
          <td class="text-right total-kg-cell">-</td>
          <td class="text-right text-muted">${ingredientes.length} alimentos</td>
        </tr>
      </tfoot>
    `;

    const tbody = table.querySelector('tbody');
    let totalKgSum = 0;

    ingredientes.forEach(ing => {
      const racion = ing[nivel] || ing.jardin || 0;
      let totalCalculadoStr = '-';
      let totalNum = 0;

      if (ing.unidad === 'ml') {
        totalNum = (racion * cupo) / 1000;
        totalCalculadoStr = `${formatNumber(totalNum)} L`;
      } else if (ing.unidad === 'saquito' || ing.unidad === 'u') {
        totalNum = racion * cupo;
        totalCalculadoStr = `${formatNumber(totalNum)} u`;
      } else {
        totalNum = (racion * cupo) / 1000;
        totalCalculadoStr = `${formatNumber(totalNum)} kg`;
        totalKgSum += totalNum;
      }

      // Cálculo de Bultos / Envases
      let envasesEstimadosStr = '-';
      const alimLower = ing.alimento.toLowerCase();

      if (alimLower.includes('leche fluida')) {
        const sachets = Math.ceil(totalNum);
        envasesEstimadosStr = `<span class="pkg-badge">${sachets} sachets (1L)</span>`;
      } else if (alimLower.includes('azúcar') || alimLower.includes('azucar')) {
        const paquetes = Math.ceil(totalNum);
        envasesEstimadosStr = `<span class="pkg-badge">${paquetes} paq. (1kg)</span>`;
      } else if (alimLower.includes('matecocido') || alimLower.includes('infusión') || alimLower.includes('infusion')) {
        const saquitosPorCaja = state.envases.matecocido_saquitos || 25;
        const cajas = Math.ceil(totalNum / saquitosPorCaja);
        envasesEstimadosStr = `<span class="pkg-badge">${cajas} cajas (${saquitosPorCaja}u)</span>`;
      } else if (alimLower.includes('dulce de leche')) {
        const gramosPote = state.envases.dulce_leche_gramos || 400;
        const potes = Math.ceil((totalNum * 1000) / gramosPote);
        envasesEstimadosStr = `<span class="pkg-badge">${potes} potes (${gramosPote}g)</span>`;
      } else if (alimLower.includes('mermelada')) {
        const gramosPote = state.envases.mermelada_gramos || 400;
        const potes = Math.ceil((totalNum * 1000) / gramosPote);
        envasesEstimadosStr = `<span class="pkg-badge">${potes} potes (${gramosPote}g)</span>`;
      } else if (alimLower.includes('galletitas')) {
        const gramosPaq = state.envases.galletitas_gramos || 400;
        const paqs = Math.ceil((totalNum * 1000) / gramosPaq);
        envasesEstimadosStr = `<span class="pkg-badge">${paqs} paq. (${gramosPaq}g)</span>`;
      } else if (alimLower.includes('cacao')) {
        const gramosPaq = state.envases.cacao_gramos || 180;
        const paqs = Math.ceil((totalNum * 1000) / gramosPaq);
        envasesEstimadosStr = `<span class="pkg-badge">${paqs} paq. (${gramosPaq}g)</span>`;
      } else if (alimLower.includes('huevo')) {
        // Si el gramaje viene en gramos se estima 50 g por huevo
        const unidades = (ing.unidad === 'u') ? Math.ceil(totalNum) : Math.ceil((totalNum * 1000) / 50);
        const maples = Math.ceil(unidades / 30);
        envasesEstimadosStr = `<span class="pkg-badge">${unidades} u (${maples} maples)</span>`;
      } else if (alimLower.includes('aceite')) {
        envasesEstimadosStr = `<span class="pkg-badge">${Math.ceil(totalNum)} botellas (1L)</span>`;
      } else if (alimLower.includes('harina')) {
        envasesEstimadosStr = `<span class="pkg-badge">${Math.ceil(totalNum)} paquetes (1kg)</span>`;
      } else {
        const u = ing.unidad === 'ml' ? 'L' : (ing.unidad === 'u' || ing.unidad === 'saquito') ? 'u' : 'kg';
        envasesEstimadosStr = `<span class="pkg-badge">${formatNumber(totalNum)} ${u}</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="ingredient-name">${ing.alimento}</td>
        <td class="text-center">${racion} ${ing.unidad}</td>
        <td class="text-right total-calc">${totalCalculadoStr}</td>
        <td class="text-right">${envasesEstimadosStr}</td>
      `;
      tbody.appendChild(tr);
    });

    const totalKgCell = table.querySelector('.total-kg-cell');
    if (totalKgCell) {
      totalKgCell.textContent = totalKgSum > 0 ? `${formatNumber(totalKgSum)} kg aprox.` : '-';
    }

    tableResp.appendChild(table);
    cardBlock.appendChild(tableResp);
    elements.listsContainer.appendChild(cardBlock);
  }

  /**
   * ========================================================================
   * DIRECTORIO COMPLETO (TABLA)
   * ========================================================================
   */
  function renderDirectoryTable() {
    elements.directoryTableBody.innerHTML = '';
    const filtered = getFilteredSchools();

    filtered.forEach(e => {
      const tr = document.createElement('tr');
      const servNombres = (e.servicios || []).map(s => s.servicio).join(', ') || 'DM';
      
      tr.innerHTML = `
        <td><strong>${e.nombre}</strong></td>
        <td><span class="badge badge-level">${e.tipo}</span></td>
        <td>Zona ${e.zona || '-'}</td>
        <td>${e.proveedor || '-'}</td>
        <td>${e.directora || '-'}</td>
        <td>${formatPhone(e.telefono) || '-'}</td>
        <td>${e.direccion || '-'}</td>
        <td>${e.localidad || '-'}</td>
        <td><span class="text-xs text-muted">${servNombres}</span></td>
        <td>
          <button class="btn btn-primary btn-sm btn-table-ver" data-id="${e.id}">Ver Ficha</button>
        </td>
      `;

      tr.addEventListener('click', (evt) => {
        if (!evt.target.classList.contains('btn-table-ver')) {
          selectSchool(e);
          switchView('ficha');
        }
      });

      const btnVer = tr.querySelector('.btn-table-ver');
      btnVer.addEventListener('click', (evt) => {
        evt.stopPropagation();
        selectSchool(e);
        switchView('ficha');
      });

      elements.directoryTableBody.appendChild(tr);
    });
  }

  /**
   * Cambiar entre vista Ficha y Directorio
   */
  function switchView(viewName) {
    state.currentView = viewName;
    if (viewName === 'ficha') {
      elements.viewFicha.style.display = 'block';
      elements.viewDirectorio.style.display = 'none';
      if (elements.btnToggleView) elements.btnToggleView.textContent = '📋 Ver Directorio';
    } else {
      elements.viewFicha.style.display = 'none';
      elements.viewDirectorio.style.display = 'block';
      if (elements.btnToggleView) elements.btnToggleView.textContent = '🔍 Ver Ficha';
    }
  }

  /**
   * ========================================================================
   * BÚSQUEDA Y AUTOCOMPLETE
   * ========================================================================
   */
  /**
   * Historial: muestra las últimas escuelas consultadas en el desplegable
   */
  function showRecentSearches() {
    if (typeof SAE_EXTRAS === 'undefined') return;
    SAE_EXTRAS.mostrarRecientes(elements.autocompleteList, (school) => {
      selectSchool(school);
      switchView('ficha');
    });
  }

  function handleSearchInput() {
    const q = elements.searchInput.value.trim().toLowerCase();
    if (!q) {
      elements.autocompleteList.style.display = 'none';
      elements.btnClearSearch.style.display = 'none';
      showRecentSearches();
      return;
    }

    elements.btnClearSearch.style.display = 'block';

    const matches = state.escuelas.filter(e => {
      return e.nombre.toLowerCase().includes(q) ||
             (e.alias || []).some(a => a.toLowerCase().includes(q)) ||
             (e.direccion && e.direccion.toLowerCase().includes(q)) ||
             (e.directora && e.directora.toLowerCase().includes(q)) ||
             (e.localidad && e.localidad.toLowerCase().includes(q)) ||
             (e.cue && e.cue.includes(q));
    }).slice(0, 10);

    if (matches.length === 0) {
      elements.autocompleteList.innerHTML = `
        <div class="autocomplete-item" style="cursor:default; color:var(--text-muted);">
          No se encontraron escuelas con "${q}"
        </div>
      `;
      elements.autocompleteList.style.display = 'block';
      return;
    }

    elements.autocompleteList.innerHTML = '';
    matches.forEach(e => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      const qLow = q.toLowerCase();
      let matchHint = '';
      if (e.direccion && e.direccion.toLowerCase().includes(qLow)) matchHint = '📍 ' + e.direccion;
      else if (e.localidad && e.localidad.toLowerCase().includes(qLow)) matchHint = '🏘️ ' + e.localidad;
      else if (e.directora && e.directora.toLowerCase().includes(qLow)) matchHint = '👤 ' + e.directora;
      else if (e.cue && e.cue.includes(qLow)) matchHint = '🔢 CUE: ' + e.cue;
      item.innerHTML = `
        <div>
          <span class="item-title">${e.nombre}</span>
          <span class="badge badge-level" style="margin-left:6px;">${e.tipo}</span>
          <div class="item-desc">${matchHint || (e.direccion ? e.direccion + ' (' + e.localidad + ')' : 'Tres de Febrero')} • Zona ${e.zona || '-'}</div>
        </div>
        <div class="text-xs text-muted">${e.directora && !matchHint.includes(e.directora) ? 'Dir: ' + e.directora : ''}</div>
      `;
      item.addEventListener('click', () => {
        selectSchool(e);
        elements.autocompleteList.style.display = 'none';
      });
      elements.autocompleteList.appendChild(item);
    });

    elements.autocompleteList.style.display = 'block';
  }

  /**
   * Funciones auxiliares de formateo
   */
  function formatNumber(num) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatPhone(phoneStr) {
    if (!phoneStr) return '';
    return phoneStr;
  }

  /**
   * ========================================================================
   * EVENT LISTENERS
   * ========================================================================
   */
  function setupEventListeners() {
    // Buscador
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('focus', () => {
      if (!elements.searchInput.value.trim()) showRecentSearches();
    });
    elements.btnClearSearch.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.btnClearSearch.style.display = 'none';
      elements.autocompleteList.style.display = 'none';
      elements.searchInput.focus();
      showRecentSearches();
    });

    document.addEventListener('click', (e) => {
      if (!elements.searchInput.contains(e.target) && !elements.autocompleteList.contains(e.target) &&
          !elements.btnClearSearch.contains(e.target)) {
        elements.autocompleteList.style.display = 'none';
      }
    });

    // Toggle Vista (Ficha / Directorio)
    if (elements.btnToggleView) {
      elements.btnToggleView.addEventListener('click', () => {
        switchView(state.currentView === 'ficha' ? 'directorio' : 'ficha');
      });
    }

    // Selector directo de escuela
    elements.schoolSelect.addEventListener('change', (e) => {
      const school = state.escuelas.find(s => s.id === e.target.value);
      if (school) selectSchool(school);
    });

    // Selector de Fecha
    elements.dateInput.addEventListener('change', (e) => {
      syncDayFromDate(e.target.value);
      elements.quickDateBtns.forEach(b => b.classList.remove('active'));
      renderServicesAndCupos();
      renderCalculator();
    });

    // Botones rápidos de fecha (Hoy, 7 Ago)
    elements.quickDateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.quickDateBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const val = btn.dataset.days;
        if (val === 'default') {
          syncDayFromDate('2026-08-07');
        } else if (val === '0') {
          const d = new Date();
          const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          syncDayFromDate(localDate);
        }
        elements.dateInput.value = state.currentDate;
        renderServicesAndCupos();
        renderCalculator();
      });
    });

    // Botones de Días de la semana (Lunes a Viernes)
    elements.dayButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentDayName = btn.dataset.day;
        updateDayButtonsUI();
        renderCalculator();
      });
    });

    // Tabs Servicio (DM / Comedor)
    elements.serviceTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        state.currentService = tab.dataset.service;
        updateServiceTabsUI();
        renderServicesAndCupos();
        renderCalculator();
      });
    });

    // Cambio manual de cupo y nivel
    elements.inputCupoManual.addEventListener('input', renderCalculator);
    elements.selectNivelGramaje.addEventListener('change', (e) => {
      state.currentLevel = e.target.value;
      renderCalculator();
    });

    // Chips de Nivel Educativo
    elements.levelChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.levelChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeLevelFilter = chip.dataset.level;
        populateSchoolSelect();
        renderDirectoryTable();
        const filtered = getFilteredSchools();
        if (filtered.length > 0 && (!state.currentSchool || !filtered.find(s => s.id === state.currentSchool.id))) {
          selectSchool(filtered[0]);
        }
      });
    });

    // Filtros de Zona y Proveedor
    elements.filterZona.addEventListener('change', (e) => {
      state.activeZonaFilter = e.target.value;
      populateSchoolSelect();
      renderDirectoryTable();
    });

    elements.filterProveedor.addEventListener('change', (e) => {
      state.activeProvFilter = e.target.value;
      populateSchoolSelect();
      renderDirectoryTable();
    });
    elements.filterLocalidad.addEventListener('change', (e) => {
      state.activeLocFilter = e.target.value;
      populateSchoolSelect();
      renderDirectoryTable();
    });
  
    // Pestañas de Servicios en Calculadora (DM vs Comedor)
    elements.serviceTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        state.currentService = tab.dataset.service;
        updateServiceTabsUI();
        renderServicesAndCupos();
        renderCalculator();
      });
    });

    // Cambio en cupo manual
    elements.inputCupoManual.addEventListener('input', () => {
      renderCalculator();
    });

    // Cambio en nivel de ración
    elements.selectNivelGramaje.addEventListener('change', (e) => {
      state.currentLevel = e.target.value;
      renderCalculator();
    });

    // Ajustes de envases configurables
    [elements.cfgDdl, elements.cfgMermelada, elements.cfgGalletitas, elements.cfgMatecocido, elements.cfgCacao].forEach(input => {
      input.addEventListener('input', () => {
        state.envases.dulce_leche_gramos = parseFloat(elements.cfgDdl.value) || 400;
        state.envases.mermelada_gramos = parseFloat(elements.cfgMermelada.value) || 400;
        state.envases.galletitas_gramos = parseFloat(elements.cfgGalletitas.value) || 400;
        state.envases.matecocido_saquitos = parseFloat(elements.cfgMatecocido.value) || 25;
        state.envases.cacao_gramos = parseFloat(elements.cfgCacao.value) || 180;
        renderCalculator();
      });
    });

    // Filtrar tabla del directorio
    elements.dirSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const rows = elements.directoryTableBody.querySelectorAll('tr');
      rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    });

    // Exportar CSV del directorio
    elements.btnExportCsv.addEventListener('click', exportDirectoryCsv);

    // Botón Copiar Resumen para WhatsApp
    elements.btnCopyWhatsApp.addEventListener('click', copySummaryToClipboard);

    // Botón Guardar como PDF
    elements.btnPdfFicha.addEventListener('click', downloadPdf);

    // Botón Imprimir Ficha
    elements.btnPrintFicha.addEventListener('click', () => {
      window.print();
    });

    // Modal de Sincronización
    elements.btnSyncModal.addEventListener('click', () => {
      elements.syncModal.style.display = 'flex';
      elements.syncStatusMsg.textContent = '';
      pintarEstadoSync();
    });
    elements.btnCloseSyncModal.addEventListener('click', () => {
      elements.syncModal.style.display = 'none';
    });
    elements.btnDoneSync.addEventListener('click', () => {
      elements.syncModal.style.display = 'none';
    });

    // Sincronizar en vivo
    elements.btnFetchOnline.addEventListener('click', fetchOnlineData);
  }

  /**
   * Cambiar entre vista Ficha y Directorio
   */
  function switchView(viewName) {
    state.currentView = viewName;
    if (viewName === 'ficha') {
      elements.viewFicha.style.display = 'block';
      elements.viewDirectorio.style.display = 'none';
      elements.btnToggleView.querySelector('.btn-text').textContent = 'Ver Directorio';
      elements.btnToggleView.querySelector('.btn-icon').textContent = '📋';
    } else {
      elements.viewFicha.style.display = 'none';
      elements.viewDirectorio.style.display = 'block';
      elements.btnToggleView.querySelector('.btn-text').textContent = 'Ver Ficha';
      elements.btnToggleView.querySelector('.btn-icon').textContent = '🏫';
      renderDirectoryTable();
    }
  }

  /**
   * Actualizar texto del badge de fecha
   */
  function updateDateBadge() {
    const parts = state.currentDate.split('-');
    if (parts.length === 3) {
      elements.badgeFechaServicio.textContent = `Fecha: ${parts[2]}/${parts[1]}/${parts[0]} (${state.currentDayName})`;
    }
  }

  /**
   * Copiar resumen formateado al portapapeles
   */
  function copySummaryToClipboard() {
    const s = state.currentSchool;
    if (!s) return;

    const servsText = (s.servicios || []).map(serv => {
      const c = (serv.cupos && serv.cupos[state.currentDate]) || '-';
      return `• ${serv.servicio}: ${c} cupos (${serv.proveedor || s.proveedor})`;
    }).join('\n');

    const msg = `🏫 *${s.nombre}* (${s.tipo})
📍 Dirección: ${s.direccion || '-'} (${s.localidad || 'Tres de Febrero'})
👤 Directivo: ${s.directora || '-'} (${s.cargo || 'Directora'})
📞 Teléfono: ${s.telefono || '-'}
✉️ Email: ${s.email || '-'}
🏛️ CUE: ${s.cue || '-'} | Zona: ${s.zona || '-'}
🥪 *Servicios SAE (${state.currentDate} - ${state.currentDayName}):*
${servsText || '• DM: Activo'}

🗺️ *Ubicación Maps:* https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion + ', Tres de Febrero')}
_Generado desde el Tablero SAE Tres de Febrero_`;

    navigator.clipboard.writeText(msg).then(() => {
      showToast('✅ ¡Resumen copiado! Podés pegarlo en WhatsApp', 'success');
      // Feedback visual en el botón
      const btn = elements.btnCopyWhatsApp;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<span class="btn-icon">✅</span><span>¡Copiado!</span>';
      btn.style.background = '#059669';
      btn.style.color = 'white';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        btn.style.color = '';
      }, 2500);
    }).catch(() => {
      showToast('⚠️ No se pudo copiar automáticamente', 'error');
    });
  }

  /**
   * Descargar la ficha de la escuela en PDF (una página)
   */
  async function downloadPdf() {
    if (!state.currentSchool || typeof SAE_EXTRAS === 'undefined') return;
    const btn = elements.btnPdfFicha;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>Generando PDF...</span>';
    try {
      const modo = await SAE_EXTRAS.descargarFichaPDF({
        escuela: state.currentSchool,
        fecha: state.currentDate,
        dia: state.currentDayName,
        servicio: state.currentService,
        cupo: parseFloat(elements.inputCupoManual.value) || 0,
        nivel: state.currentLevel
      });
      showToast(modo === 'pdf'
        ? '📄 Ficha descargada en PDF'
        : '🖨️ Sin conexión: elegí "Guardar como PDF" en la ventana de impresión', modo === 'pdf' ? 'success' : 'info');
    } catch (err) {
      console.error(err);
      showToast('⚠️ No se pudo generar el PDF', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }

  /**
   * Exportar CSV del directorio
   */
  function exportDirectoryCsv() {
    const filtered = getFilteredSchools();
    let csv = 'Escuela,Tipo,Zona,Proveedor,Directora,Telefono,Direccion,Localidad,CUE,Email\n';
    
    filtered.forEach(e => {
      csv += `"${e.nombre}","${e.tipo}","${e.zona}","${e.proveedor}","${e.directora}","${e.telefono}","${e.direccion}","${e.localidad}","${e.cue}","${e.email}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Directorio_SAE_TresDeFebrero_${state.currentDate}.csv`;
    link.click();
    showToast('📥 Directorio descargado en formato CSV', 'success');
  }

  /**
   * Sincronizar con las planillas (CUPOS 2026 y menús) a través del script de Google
   */
  function textoFecha(iso) {
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] + ':' + m[5] : ''}` : iso;
  }

  function pintarEstadoSync() {
    const el = document.getElementById('syncEstadoTexto');
    if (!el || typeof SAE_SYNC === 'undefined') return;
    const st = SAE_SYNC.estado();
    if (!SAE_SYNC.hayScript()) {
      el.innerHTML = 'Falta configurar el link del script en <code>reclamos-config.js</code>. Se usan los datos incluidos en la página.';
    } else if (st.origen === 'planilla') {
      el.innerHTML = `✅ Actualizados desde la planilla el <strong>${textoFecha(st.actualizado)}</strong>.`;
    } else if (st.origen === 'guardado') {
      el.innerHTML = `Usando los últimos datos descargados (<strong>${textoFecha(st.actualizado)}</strong>). Buscando cambios…`;
    } else {
      el.innerHTML = 'Usando los datos incluidos en la página (sin conexión con la planilla todavía).';
    }
    if (st.ultimoError) el.innerHTML += `<br><span style="color:var(--danger);">⚠️ ${st.ultimoError}</span>`;
  }

  async function fetchOnlineData() {
    if (typeof SAE_SYNC === 'undefined') return;
    const btn = elements.btnFetchOnline;
    btn.disabled = true;
    elements.syncStatusMsg.innerHTML = '<span style="color:var(--accent);">Leyendo CUPOS 2026 y menús desde Google… (puede tardar unos segundos)</span>';
    try {
      const c = await SAE_SYNC.sincronizar();
      const partes = [`${c.escuelas} establecimientos con cupos`];
      partes.push(c.valores ? `${c.valores} cupos cambiaron` : 'sin cambios en los cupos');
      if (c.servicios) partes.push(`${c.servicios} servicios nuevos`);
      if (c.nuevas.length) partes.push(`escuelas nuevas: ${c.nuevas.join(', ')}`);
      partes.push(c.menus ? 'menús actualizados' : 'menús sin actualizar');
      elements.syncStatusMsg.innerHTML = `<span style="color:var(--success);">✅ Sincronizado: ${partes.join(' · ')}.</span>` +
        (c.avisos.length ? `<br><span style="color:var(--accent);">⚠️ ${c.avisos.join(' · ')}</span>` : '');
      showToast('🔄 Datos actualizados desde la planilla', 'success');
    } catch (err) {
      elements.syncStatusMsg.innerHTML = `<span style="color:var(--danger);">⚠️ No se pudo sincronizar: ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      pintarEstadoSync();
    }
  }

  /** Cuando llegan datos nuevos de la planilla se refrescan las vistas. */
  window.addEventListener('sae-datos-actualizados', () => {
    state.escuelas = SAE_DATA.escuelas;
    const total = state.escuelas.length;
    const txtTotal = elements.statsTotalEscuelas && elements.statsTotalEscuelas.querySelector('.text');
    if (txtTotal) txtTotal.textContent = `${total} Establecimientos`;
    const sub = document.getElementById('dirSubtitulo');
    if (sub) sub.textContent = `Listado de las ${total} instituciones del distrito de Tres de Febrero`;
    populateSchoolSelect();
    renderDirectoryTable();
    if (state.currentSchool) {
      const actual = state.escuelas.find(e => e.id === state.currentSchool.id) || state.currentSchool;
      state.currentSchool = actual;
      updateComedorTabVisibility(actual);
      renderServicesAndCupos();
      renderCalculator();
    }
    pintarEstadoSync();
  });

  function showToast(msg, type = 'info') {
    const toast = elements.toastMessage;
    toast.textContent = msg;
    toast.className = `toast-notification toast-${type}`;
    toast.style.display = 'flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  function formatPhone(num) {
    if (!num) return '';
    const clean = num.toString().replace(/\D/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return num;
  }

  function formatNumber(num) {
    if (num % 1 === 0) return num.toString();
    return num.toFixed(2).replace(/\.00$/, '').replace(/\.(\d)0$/, '.$1');
  }

  /**
   * ========================================================================
   * MODO OSCURO — Toggle + persistencia en localStorage
   * ========================================================================
   */
  function initDarkMode() {
    const html = document.documentElement;
    const btnDark = document.getElementById('btnDarkMode');
    const icon = document.getElementById('darkModeIcon');

    // Aplicar preferencia guardada (o preferencia del sistema)
    const saved = localStorage.getItem('sae-darkmode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved !== null ? saved === 'true' : prefersDark;

    if (isDark) {
      html.classList.add('dark');
      icon.textContent = '☀️';
    }

    btnDark.addEventListener('click', () => {
      const nowDark = html.classList.toggle('dark');
      icon.textContent = nowDark ? '☀️' : '🌙';
      localStorage.setItem('sae-darkmode', nowDark);
      showToast(nowDark ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado', 'info');
    });
  }

  // Ejecutar inicialización
  initDarkMode();
  init();
});
