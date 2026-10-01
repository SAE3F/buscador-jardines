/**
 * APLICACIÓN DE MAPEO ESCOLAR Y TABLERO SAE 2026
 * Municipalidad de Tres de Febrero
 */

// Estado global de la aplicación
const AppState = {
  allSchools: ESCUELAS_DATA || [],
  summary: RESUMEN_DATA || {},
  filteredSchools: [],
  selectedSchools: new Set(),
  selectedProviders: new Set(),
  selectedServices: new Set(),
  selectedLevels: new Set(),
  saeStatus: 'all', // 'all', 'con_sae', 'sin_sae'
  searchQuery: '',
  selectedSchoolItem: null,
  map: null,
  clusterGroup: null,
  markersMap: new Map(), // school.id -> marker
};

// Paleta de colores de proveedores
const PROVIDER_COLORS = {
  'GRUPO L': '#f59e0b', // Amarillo
  'GYULAND': '#0099da', // Celeste
  'EDEAL S.A': '#059669', // Verde
  'TINTENFISCH S.A': '#7c3aed' // Violeta
};

const PROVIDER_CLASSES = {
  'GRUPO L': 'grupo-l',
  'GYULAND': 'gyuland',
  'EDEAL S.A': 'edeal',
  'TINTENFISCH S.A': 'tintenfisch'
};

// Inicialización cuando carga el DOM
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initFiltersState();
  buildDropdowns();
  setupFilterListeners();
  applyFilters();
  setupUIInteractions();
  focusSchoolFromURL();
});

/* --------------------------------------------------------------------------
   1. INICIALIZACIÓN DEL MAPA (LEAFLET + CLUSTER)
   -------------------------------------------------------------------------- */
function initMap() {
  // Centro geográfico aproximado de Tres de Febrero
  const TRES_DE_FEBRERO_CENTER = [-34.598, -58.575];
  const DEFAULT_ZOOM = 13;

  // Capa base de calles ESRI ArcGIS (100% libre, sin API key, sin bloqueo de acceso)
  const esriStreets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Map data &copy; <a href="https://www.esri.com" target="_blank">Esri</a>, OpenStreetMap contributors'
  });

  // Capa alternativa Topográfica
  const esriTopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Map data &copy; <a href="https://www.esri.com" target="_blank">Esri</a>'
  });

  // Capa alternativa Gris Claro (ideal para contraste de pines)
  const esriGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Map data &copy; <a href="https://www.esri.com" target="_blank">Esri</a>'
  });

  // Crear mapa con ESRI Calles como capa predeterminada
  AppState.map = L.map('map', {
    center: TRES_DE_FEBRERO_CENTER,
    zoom: DEFAULT_ZOOM,
    layers: [esriStreets],
    zoomControl: false
  });

  // Controles de zoom y selector de capas
  L.control.zoom({ position: 'bottomright' }).addTo(AppState.map);
  L.control.layers({
    'Mapa de Calles (Esri / OSM)': esriStreets,
    'Mapa Claro Contraste': esriGray,
    'Mapa Topográfico': esriTopo
  }, null, { position: 'bottomright' }).addTo(AppState.map);

  // Capa de límites y localidades de Tres de Febrero
  if (typeof LOCALIDADES_3F !== 'undefined') {
    L.geoJSON(LOCALIDADES_3F, {
      style: {
        color: '#163c68',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#0099da',
        fillOpacity: 0.03
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.nombre) {
          layer.bindTooltip(feature.properties.nombre, {
            permanent: false,
            direction: 'center',
            className: 'locality-label'
          });
        }
      }
    }).addTo(AppState.map);
  }

  // Crear grupo de clusters con spiderfy para escuelas que comparten edificio
  AppState.clusterGroup = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 28,
    spiderLegPolylineOptions: { weight: 1.5, color: '#003865', opacity: 0.6 },
    iconCreateFunction: function(cluster) {
      const childCount = cluster.getChildCount();
      let c = 'small';
      if (childCount > 10) c = 'medium';
      if (childCount > 30) c = 'large';

      return new L.DivIcon({
        html: `<div style="background: #003865; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; border: 2px solid #0099da; box-shadow: 0 3px 8px rgba(0,0,0,0.3);">${childCount}</div>`,
        className: 'custom-cluster-marker',
        iconSize: new L.Point(34, 34)
      });
    }
  });

  AppState.map.addLayer(AppState.clusterGroup);
}

/* --------------------------------------------------------------------------
   2. CREACIÓN DE MARCADORES Y TOOLTIPS
   -------------------------------------------------------------------------- */
function createSchoolMarker(school) {
  const provClass = PROVIDER_CLASSES[school.proveedor] || 'sin-sae';

  // Icono HTML personalizado
  const customIcon = L.divIcon({
    className: 'custom-pin-wrapper',
    html: `<div class="custom-pin ${provClass}" data-id="${school.id}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  const marker = L.marker([school.lat, school.lng], { icon: customIcon });

  // Tooltip al pasar el cursor (Hover)
  const tooltipContent = generateTooltipHTML(school);
  marker.bindTooltip(tooltipContent, {
    direction: 'top',
    offset: [0, -12],
    opacity: 0.98,
    className: 'custom-tooltip'
  });

  // Eventos del marcador
  marker.on('mouseover', () => {
    updateInspectorCard(school);
  });

  marker.on('click', () => {
    updateInspectorCard(school);
    AppState.map.setView([school.lat, school.lng], 16, { animate: true });
  });

  return marker;
}

function generateTooltipHTML(school) {
  let saeRowsHTML = '';
  if (school.has_sae && school.servicios.length > 0) {
    saeRowsHTML = `
      <div style="margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
        <div style="font-size: 0.7rem; text-transform: uppercase; color: #0284c7; font-weight: 700; margin-bottom: 3px;">
          Prestaciones SAE:
        </div>
        ${school.servicios.map(s => `
          <div class="tooltip-sae-row">
            <span><strong>${escapeHTML(s.servicio)}:</strong> ${s.cupo} cupos</span>
            <span style="color: #64748b; font-size: 0.68rem;">(${escapeHTML(s.proveedor)})</span>
          </div>
        `).join('')}
        <div class="tooltip-total-cupos">
          <span>Total Cupos SAE:</span>
          <span style="color: #003865; font-size: 0.85rem;">${school.total_cupos.toLocaleString('es-AR')}</span>
        </div>
      </div>
    `;
  } else {
    saeRowsHTML = `
      <div style="margin-top: 6px; padding: 4px 6px; background: #f1f5f9; border-radius: 4px; font-size: 0.72rem; color: #64748b; text-align: center;">
        Sin prestación SAE asignada
      </div>
    `;
  }

  return `
    <div class="tooltip-school-title">${escapeHTML(school.escuela)}</div>
    <div class="tooltip-school-subtitle">
      ${escapeHTML(school.nivel)} &bull; ${escapeHTML(school.gestion || 'ESTATAL')}
      ${school.direccion ? `<br>${escapeHTML(school.direccion)}` : ''}
    </div>
    ${saeRowsHTML}
  `;
}

/* --------------------------------------------------------------------------
   3. TARJETA FLOTANTE DE INSPECCIÓN (HOVER / CLICK)
   -------------------------------------------------------------------------- */
function updateInspectorCard(school) {
  const card = document.getElementById('inspectorCard');
  if (!card) return;

  card.classList.remove('empty');
  AppState.selectedSchoolItem = school;

  // Header
  document.getElementById('inspNivel').textContent = school.nivel || 'Institución';
  document.getElementById('inspTitle').textContent = school.escuela;
  document.getElementById('inspSubtitle').textContent = school.nombre ? `"${school.nombre}"` : (school.cueanexo ? `CUE: ${school.cueanexo}` : '');

  // Body
  document.getElementById('inspDireccion').textContent = school.direccion || 'Sin dirección registrada';
  document.getElementById('inspGestion').textContent = school.gestion ? `Gestión: ${school.gestion}` : 'Gestión Estatal';
  document.getElementById('inspTurno').textContent = school.turno ? `Turno: ${school.turno}` : 'Turno no especificado';
  document.getElementById('inspContacto').textContent = school.contacto || 'Sin contacto registrado';

  // Contenido SAE
  const saeContainer = document.getElementById('inspSaeContainer');
  if (school.has_sae && school.servicios.length > 0) {
    const provClass = PROVIDER_CLASSES[school.proveedor] || 'grupo-l';

    let tableRows = school.servicios.map(s => `
      <tr>
        <td><strong>${escapeHTML(s.servicio)}</strong></td>
        <td><span class="badge-provider-tag ${provClass}">${escapeHTML(s.proveedor)}</span></td>
        <td><span class="cupos-badge">${s.cupo.toLocaleString('es-AR')} cupos</span></td>
        <td style="color: #64748b; font-size: 0.72rem;">${s.fecha || '09/10/2026'}</td>
      </tr>
    `).join('');

    saeContainer.innerHTML = `
      <div class="inspector-section-title">
        <span>Prestaciones SAE Activas</span>
        <span class="badge-provider-tag ${provClass}">${escapeHTML(school.proveedor)}</span>
      </div>
      <table class="sae-table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Proveedor</th>
            <th>Cupos</th>
            <th>Últ. Registro</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="inspector-total-box">
        <span class="lbl">TOTAL CUPOS DIARIOS:</span>
        <span class="val">${school.total_cupos.toLocaleString('es-AR')}</span>
      </div>
    `;
  } else {
    saeContainer.innerHTML = `
      <div class="no-sae-alert">
        <svg style="width: 28px; height: 28px; fill: #94a3b8; margin-bottom: 6px;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <p><strong>Esta institución no registra cupos del SAE.</strong></p>
        <p style="font-size: 0.73rem; margin-top: 2px;">(Institución de gestión privada o no alcanzada por el servicio alimentario)</p>
      </div>
    `;
  }
}

/* --------------------------------------------------------------------------
   4. CONSTRUCCIÓN DE LOS FILTROS SUPERIORES DE SELECCIÓN MÚLTIPLE
   -------------------------------------------------------------------------- */
function initFiltersState() {
  // Inicialmente todas las opciones están seleccionadas
  AppState.summary.proveedores.forEach(p => AppState.selectedProviders.add(p));
  AppState.summary.servicios.forEach(s => AppState.selectedServices.add(s));
  AppState.summary.niveles.forEach(n => AppState.selectedLevels.add(n));
  AppState.allSchools.forEach(s => AppState.selectedSchools.add(s.id));
}

function buildDropdowns() {
  // 1. Dropdown Proveedores (Solo Proveedores SAE)
  buildMultiSelectDropdown({
    containerId: 'dropdownProviders',
    badgeId: 'badgeProviders',
    title: 'Proveedor',
    options: AppState.summary.proveedores.map(p => ({
      value: p,
      label: p,
      colorClass: PROVIDER_CLASSES[p],
      count: AppState.allSchools.filter(s => s.proveedor === p).length
    })),
    selectedSet: AppState.selectedProviders,
    onChange: () => applyFilters()
  });

  // 2. Dropdown Tipo de Servicio (Solo Servicios SAE)
  buildMultiSelectDropdown({
    containerId: 'dropdownServices',
    badgeId: 'badgeServices',
    title: 'Tipo de Servicio',
    options: AppState.summary.servicios.map(srv => ({
      value: srv,
      label: srv,
      count: AppState.allSchools.filter(s => s.servicios.some(x => x.servicio === srv)).length
    })),
    selectedSet: AppState.selectedServices,
    onChange: () => applyFilters()
  });

  // 3. Dropdown Nivel Educativo
  buildMultiSelectDropdown({
    containerId: 'dropdownLevels',
    badgeId: 'badgeLevels',
    title: 'Nivel',
    options: AppState.summary.niveles.map(lvl => ({
      value: lvl,
      label: lvl,
      count: AppState.allSchools.filter(s => s.nivel === lvl).length
    })),
    selectedSet: AppState.selectedLevels,
    onChange: () => applyFilters()
  });

  // 4. Dropdown Escuelas
  buildSchoolSelectDropdown();
}

function buildMultiSelectDropdown({ containerId, badgeId, title, options, selectedSet, onChange }) {
  const container = document.getElementById(containerId);
  const badge = document.getElementById(badgeId);
  if (!container) return;

  const trigger = container.querySelector('.filter-btn-trigger');
  const menu = container.querySelector('.filter-dropdown-menu');

  // Armar lista de opciones HTML
  let optionsHTML = '';
  options.forEach(opt => {
    const isChecked = selectedSet.has(opt.value);
    const dotHTML = opt.colorClass ? `<span class="provider-dot dot-${opt.colorClass}"></span>` : '';
    optionsHTML += `
      <label class="dropdown-option-item">
        <input type="checkbox" value="${escapeHTML(opt.value)}" ${isChecked ? 'checked' : ''}>
        ${dotHTML}
        <span class="item-label" title="${escapeHTML(opt.label)}">${escapeHTML(opt.label)}</span>
        <span class="item-count">${opt.count}</span>
      </label>
    `;
  });

  menu.innerHTML = `
    <div class="dropdown-header-tools">
      <span style="font-size: 0.76rem; font-weight: 700; color: #003865;">${escapeHTML(title)}</span>
      <div class="tools-actions">
        <button type="button" class="btn-select-all">Todos</button>
        <button type="button" class="btn-clear-all">Ninguno</button>
      </div>
    </div>
    <div class="dropdown-search-box">
      <span class="search-icon">&#128269;</span>
      <input type="text" placeholder="Filtrar opciones...">
    </div>
    <div class="dropdown-options-list">
      ${optionsHTML}
    </div>
  `;

  // Actualizar badge del trigger
  updateBadgeCounter(badge, selectedSet.size, options.length);

  // Eventos de checkboxes
  const checkboxes = menu.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        selectedSet.add(cb.value);
      } else {
        selectedSet.delete(cb.value);
      }
      updateBadgeCounter(badge, selectedSet.size, options.length);
      onChange();
    });
  });

  // Evento Seleccionar Todos
  menu.querySelector('.btn-select-all').addEventListener('click', () => {
    options.forEach(opt => selectedSet.add(opt.value));
    checkboxes.forEach(cb => cb.checked = true);
    updateBadgeCounter(badge, selectedSet.size, options.length);
    onChange();
  });

  // Evento Deseleccionar Todos
  menu.querySelector('.btn-clear-all').addEventListener('click', () => {
    selectedSet.clear();
    checkboxes.forEach(cb => cb.checked = false);
    updateBadgeCounter(badge, 0, options.length);
    onChange();
  });

  // Búsqueda en el dropdown
  const searchInput = menu.querySelector('.dropdown-search-box input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const items = menu.querySelectorAll('.dropdown-option-item');
    items.forEach(item => {
      const text = item.querySelector('.item-label').textContent.toLowerCase();
      item.style.display = text.includes(term) ? 'flex' : 'none';
    });
  });

  // Toggle de apertura
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns(container);
    container.classList.toggle('open');
  });
}

function buildSchoolSelectDropdown() {
  const container = document.getElementById('dropdownSchools');
  const badge = document.getElementById('badgeSchools');
  if (!container) return;

  const trigger = container.querySelector('.filter-btn-trigger');
  const menu = container.querySelector('.filter-dropdown-menu');

  // Ordenar escuelas alfabéticamente
  const sortedSchools = [...AppState.allSchools].sort((a, b) => a.escuela.localeCompare(b.escuela, 'es', { numeric: true }));

  let optionsHTML = '';
  sortedSchools.forEach(s => {
    const isChecked = AppState.selectedSchools.has(s.id);
    const saeBadge = s.has_sae ? `<span style="font-size: 0.68rem; color: #0284c7; font-weight: 700;">SAE</span>` : `<span style="font-size: 0.68rem; color: #94a3b8;">Sin SAE</span>`;
    optionsHTML += `
      <label class="dropdown-option-item school-option" data-id="${s.id}">
        <input type="checkbox" value="${s.id}" ${isChecked ? 'checked' : ''}>
        <span class="item-label" title="${escapeHTML(s.escuela)}">${escapeHTML(s.escuela)} <small style="color: #64748b;">(${escapeHTML(s.nivel)})</small></span>
        ${saeBadge}
      </label>
    `;
  });

  menu.innerHTML = `
    <div class="dropdown-header-tools">
      <span style="font-size: 0.76rem; font-weight: 700; color: #003865;">Escuelas (${sortedSchools.length})</span>
      <div class="tools-actions">
        <button type="button" class="btn-select-all">Todas</button>
        <button type="button" class="btn-clear-all">Ninguna</button>
      </div>
    </div>
    <div class="dropdown-search-box">
      <span class="search-icon">&#128269;</span>
      <input type="text" placeholder="Buscar escuela por nombre o código...">
    </div>
    <div class="dropdown-options-list" style="max-height: 280px;">
      ${optionsHTML}
    </div>
  `;

  updateBadgeCounter(badge, AppState.selectedSchools.size, sortedSchools.length);

  const checkboxes = menu.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        AppState.selectedSchools.add(cb.value);
      } else {
        AppState.selectedSchools.delete(cb.value);
      }
      updateBadgeCounter(badge, AppState.selectedSchools.size, sortedSchools.length);
      applyFilters();
    });
  });

  menu.querySelector('.btn-select-all').addEventListener('click', () => {
    sortedSchools.forEach(s => AppState.selectedSchools.add(s.id));
    checkboxes.forEach(cb => cb.checked = true);
    updateBadgeCounter(badge, AppState.selectedSchools.size, sortedSchools.length);
    applyFilters();
  });

  menu.querySelector('.btn-clear-all').addEventListener('click', () => {
    AppState.selectedSchools.clear();
    checkboxes.forEach(cb => cb.checked = false);
    updateBadgeCounter(badge, 0, sortedSchools.length);
    applyFilters();
  });

  const searchInput = menu.querySelector('.dropdown-search-box input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const items = menu.querySelectorAll('.school-option');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(term) ? 'flex' : 'none';
    });
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns(container);
    container.classList.toggle('open');
  });
}

function updateBadgeCounter(badgeEl, selectedCount, totalCount) {
  if (!badgeEl) return;
  if (selectedCount === totalCount) {
    badgeEl.textContent = `Todas (${totalCount})`;
    badgeEl.style.background = '#003865';
  } else if (selectedCount === 0) {
    badgeEl.textContent = 'Ninguna';
    badgeEl.style.background = '#991b1b';
  } else {
    badgeEl.textContent = `${selectedCount} sel.`;
    badgeEl.style.background = '#0099da';
  }
}

function closeAllDropdowns(except = null) {
  document.querySelectorAll('.filter-dropdown-group').forEach(group => {
    if (group !== except) {
      group.classList.remove('open');
    }
  });
}

// Cerrar dropdowns al hacer clic afuera
document.addEventListener('click', () => {
  closeAllDropdowns();
});

/* --------------------------------------------------------------------------
   5. APLICACIÓN DE FILTROS Y RENDERIZADO
   -------------------------------------------------------------------------- */
function setupFilterListeners() {
  // Buscador de texto libre
  const quickSearch = document.getElementById('quickSearch');
  const btnClearSearch = document.getElementById('btnClearSearch');

  quickSearch.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value.trim().toLowerCase();
    btnClearSearch.style.display = AppState.searchQuery ? 'block' : 'none';
    applyFilters();
  });

  btnClearSearch.addEventListener('click', () => {
    quickSearch.value = '';
    AppState.searchQuery = '';
    btnClearSearch.style.display = 'none';
    applyFilters();
  });

  // Pills de Estado SAE (Todas, Con SAE, Sin SAE)
  document.querySelectorAll('.status-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.saeStatus = pill.dataset.status;
      applyFilters();
    });
  });

  // Botón Restablecer Filtros
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    resetAllFilters();
  });
}

function resetAllFilters() {
  AppState.searchQuery = '';
  document.getElementById('quickSearch').value = '';
  document.getElementById('btnClearSearch').style.display = 'none';

  AppState.saeStatus = 'all';
  document.querySelectorAll('.status-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.status === 'all');
  });

  initFiltersState();
  buildDropdowns();
  applyFilters();
}

function applyFilters() {
  const query = AppState.searchQuery;

  // Filtrar escuelas según todos los criterios activos
  AppState.filteredSchools = AppState.allSchools.filter(school => {
    // 1. Filtro por Escuela individual seleccionada
    if (!AppState.selectedSchools.has(school.id)) return false;

    // 2. Filtro por Proveedor
    if (!AppState.selectedProviders.has(school.proveedor)) return false;

    // 3. Filtro por Nivel
    if (!AppState.selectedLevels.has(school.nivel)) return false;

    // 4. Filtro por Tipo de Servicio
    const hasMatchingService = school.servicios.some(s => AppState.selectedServices.has(s.servicio));
    if (!hasMatchingService) return false;

    // 5. Búsqueda por texto libre
    if (query) {
      const matchText = `${school.escuela} ${school.nombre} ${school.cueanexo} ${school.direccion} ${school.nivel} ${school.proveedor}`.toLowerCase();
      if (!matchText.includes(query)) return false;
    }

    return true;
  });

  // Actualizar marcadores en el mapa
  renderMapMarkers();

  // Actualizar KPIs superiores
  updateKPICounters();

  // Actualizar tabla si está abierta
  renderSchoolsTable();
}

function renderMapMarkers() {
  AppState.clusterGroup.clearLayers();
  const markersToAdd = [];

  AppState.filteredSchools.forEach(school => {
    if (school.has_coords && school.lat && school.lng) {
      const marker = createSchoolMarker(school);
      AppState.markersMap.set(school.id, marker);
      markersToAdd.push(marker);
    }
  });

  AppState.clusterGroup.addLayers(markersToAdd);

  // Si hay pocas escuelas filtradas (ej. por búsqueda directa), ajustar vista
  if (markersToAdd.length > 0 && markersToAdd.length <= 5) {
    const group = L.featureGroup(markersToAdd);
    AppState.map.fitBounds(group.getBounds().pad(0.3));
  }
}

function updateKPICounters() {
  const visible = AppState.filteredSchools;
  const totalVisible = visible.length;
  const totalCupos = visible.reduce((acc, s) => acc + (s.total_cupos || 0), 0);
  const totalPrestaciones = visible.reduce((acc, s) => acc + (s.servicios ? s.servicios.length : 0), 0);
  const distinctProviders = new Set(visible.map(s => s.proveedor)).size;

  const elEscuelas = document.getElementById('kpiTotalEscuelas');
  const elCupos = document.getElementById('kpiTotalCupos');
  const elPrestaciones = document.getElementById('kpiTotalPrestaciones');
  const elProveedores = document.getElementById('kpiProveedores');

  if (elEscuelas) elEscuelas.textContent = `${totalVisible}`;
  if (elCupos) elCupos.textContent = totalCupos.toLocaleString('es-AR');
  if (elPrestaciones) elPrestaciones.textContent = `${totalPrestaciones}`;
  if (elProveedores) elProveedores.textContent = `${distinctProviders}`;
}

/* --------------------------------------------------------------------------
   6. TABLA DETALLADA Y MODAL DE ESCUELAS SIN COORDENADAS
   -------------------------------------------------------------------------- */
function setupUIInteractions() {
  // Drawer de tabla completa
  const drawer = document.getElementById('tableDrawer');
  const btnToggleTable = document.getElementById('btnToggleTable');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');

  btnToggleTable.addEventListener('click', () => {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      renderSchoolsTable();
    }
  });

  btnCloseDrawer.addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  // Modal opcional
  const modal = document.getElementById('modalNoCoords');
  const btnShowNoCoords = document.getElementById('btnShowNoCoords');
  const btnCloseModal = document.getElementById('btnCloseModal');

  if (btnShowNoCoords && modal) {
    btnShowNoCoords.addEventListener('click', () => {
      if (typeof renderNoCoordsList === 'function') renderNoCoordsList();
      modal.classList.add('open');
    });
  }

  if (btnCloseModal && modal) {
    btnCloseModal.addEventListener('click', () => {
      modal.classList.remove('open');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  // Exportar a CSV
  document.getElementById('btnExportCSV').addEventListener('click', () => {
    exportToCSV();
  });
}

function renderSchoolsTable() {
  const tbody = document.getElementById('schoolsTableBody');
  if (!tbody) return;

  const schools = AppState.filteredSchools;
  document.getElementById('tableSchoolsCount').textContent = `(${schools.length} visibles)`;

  tbody.innerHTML = schools.map(s => `
    <tr data-id="${s.id}" onclick="selectSchoolFromTable('${s.id}')">
      <td><strong>${escapeHTML(s.escuela)}</strong></td>
      <td>${escapeHTML(s.nivel)}</td>
      <td>${escapeHTML(s.gestion || 'ESTATAL')}</td>
      <td>${escapeHTML(s.direccion || '-')}</td>
      <td><span class="badge-provider-tag ${PROVIDER_CLASSES[s.proveedor] || 'sin-sae'}">${escapeHTML(s.proveedor)}</span></td>
      <td><strong>${s.total_cupos > 0 ? s.total_cupos.toLocaleString('es-AR') : '-'}</strong></td>
      <td>${s.servicios.map(srv => `${escapeHTML(srv.servicio)} (${srv.cupo})`).join(', ') || 'Sin SAE'}</td>
    </tr>
  `).join('');
}

window.selectSchoolFromTable = function(schoolId) {
  const school = AppState.allSchools.find(s => s.id === schoolId);
  if (!school) return;

  if (school.has_coords && school.lat && school.lng) {
    AppState.map.setView([school.lat, school.lng], 17, { animate: true });
    updateInspectorCard(school);
    const marker = AppState.markersMap.get(schoolId);
    if (marker) {
      marker.openTooltip();
    }
  } else {
    updateInspectorCard(school);
    alert(`La institución "${school.escuela}" no posee coordenadas cargadas en el relevamiento geográfico.`);
  }
};

function renderNoCoordsList() {
  const container = document.getElementById('noCoordsListContainer');
  const noCoordsSchools = AppState.allSchools.filter(s => !s.has_coords);

  container.innerHTML = `
    <p style="font-size: 0.82rem; color: #475569; margin-bottom: 12px;">
      Las siguientes <strong>${noCoordsSchools.length} instituciones</strong> figuran en el listado educativo pero no cuentan con coordenadas de latitud/longitud en el archivo base (en su mayoría instituciones de gestión privada):
    </p>
    <table class="sae-table">
      <thead>
        <tr>
          <th>Institución</th>
          <th>Nivel</th>
          <th>Gestión</th>
          <th>Dirección</th>
        </tr>
      </thead>
      <tbody>
        ${noCoordsSchools.map(s => `
          <tr>
            <td><strong>${escapeHTML(s.escuela)}</strong></td>
            <td>${escapeHTML(s.nivel)}</td>
            <td>${escapeHTML(s.gestion || 'PRIVADA')}</td>
            <td>${escapeHTML(s.direccion || 'Sin dirección cargada')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function exportToCSV() {
  const schools = AppState.filteredSchools;
  const headers = ['ID', 'CUE', 'Escuela', 'Nombre', 'Nivel', 'Gestión', 'Dirección', 'Latitud', 'Longitud', 'Tiene SAE', 'Proveedor', 'Total Cupos', 'Prestaciones'];

  const rows = schools.map(s => [
    s.id,
    s.cueanexo,
    `"${s.escuela.replace(/"/g, '""')}"`,
    `"${(s.nombre || '').replace(/"/g, '""')}"`,
    s.nivel,
    s.gestion,
    `"${(s.direccion || '').replace(/"/g, '""')}"`,
    s.lat || '',
    s.lng || '',
    s.has_sae ? 'SI' : 'NO',
    s.proveedor,
    s.total_cupos,
    `"${s.servicios.map(x => `${x.servicio}: ${x.cupo} cupos (${x.proveedor})`).join('; ')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Escuelas_SAE_TresDeFebrero_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utilidad para escapar texto HTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --------------------------------------------------------------------------
   ENLACE DIRECTO A UNA ESCUELA (mapa/index.html?escuela=JI 921)
   Si la URL no trae el parámetro, el mapa se muestra completo como siempre.
   -------------------------------------------------------------------------- */
function focusSchoolFromURL() {
  const param = new URLSearchParams(window.location.search).get('escuela');
  if (!param) return;

  const wanted = param.trim().toUpperCase();
  const school = AppState.allSchools.find(s => String(s.escuela || '').trim().toUpperCase() === wanted);
  if (!school) return; // La escuela no figura en el mapa (p. ej. sin SAE): vista general

  updateInspectorCard(school);
  if (!(school.has_coords && school.lat && school.lng)) return;

  const marker = AppState.markersMap.get(school.id);
  const mostrar = () => {
    AppState.map.setView([school.lat, school.lng], 17, { animate: false });
    if (marker) marker.openTooltip();
  };
  if (marker && AppState.clusterGroup && AppState.clusterGroup.zoomToShowLayer) {
    // Abre el grupo (cluster) si el pin está agrupado con otros del mismo predio
    AppState.clusterGroup.zoomToShowLayer(marker, mostrar);
  } else {
    mostrar();
  }
}
