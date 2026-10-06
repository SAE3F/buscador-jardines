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
    if (!servicio || !servicio.cupos) return 0;
    const today = getTodayStr();
    
    // Si existe cupo para hoy, usarlo
    if (servicio.cupos[today] !== undefined) return servicio.cupos[today];
    
    // Si no, buscar el cupo más reciente (última fecha disponible)
    const fechas = Object.keys(servicio.cupos).filter(k => {
        // Filtrar solo fechas con formato YYYY-MM-DD
        return /^\d{4}-\d{2}-\d{2}$/.test(k);
    }).sort();
    
    if (fechas.length > 0) {
        return servicio.cupos[fechas[fechas.length - 1]];
    }
    return 0;
}

// 2. BUSCADOR CON AUTOCOMPLETADO
function setupSearch() {
    const searchInput = document.getElementById('mobileSearchInput');
    const autocompleteList = document.getElementById('autocompleteList');
    const btnClear = document.getElementById('btnClearSearch');

    searchInput.addEventListener('input', function() {
        const val = this.value;
        if (!val) {
            closeAutocomplete();
            btnClear.style.display = 'none';
            return;
        }
        btnClear.style.display = 'block';
        
        const term = val.toLowerCase();
        const results = SAE_DATA.escuelas.filter(esc => {
            // Excluir registros agregados (BOLSON ACTUAL, TODAS LAS ESCUELAS)
            if (esc.nombre === 'BOLSON ACTUAL' || esc.nombre === 'TODAS LAS ESCUELAS') return false;
            return (esc.nombre && esc.nombre.toLowerCase().includes(term)) ||
                   (esc.cue && esc.cue.toString().includes(term)) ||
                   (esc.direccion && esc.direccion.toLowerCase().includes(term)) ||
                   (esc.directora && esc.directora.toLowerCase().includes(term));
        }).slice(0, 10);

        autocompleteList.innerHTML = '';
        if (results.length === 0) {
            autocompleteList.innerHTML = '<div class="autocomplete-item"><span class="ac-desc">No se encontraron escuelas</span></div>';
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
        <span class="badge badge-provider">${escuela.proveedor || '-'}</span>
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

    // Configurar Comedor Tab
    const tabComedor = document.getElementById('tabComedor');
    const hasComedor = escuela.servicios && escuela.servicios.some(s => s.servicio.toUpperCase().includes('COMEDOR'));
    if (hasComedor) {
        tabComedor.style.display = 'block';
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
                const isComedor = serv.servicio.toUpperCase().includes('COMEDOR');
                let icon = isComedor ? '🍲' : '☕';
                let shortName = isComedor ? 'Comedor' : 'Desayuno/Merienda';
                
                const div = document.createElement('div');
                div.className = 'service-compact-item';
                div.innerHTML = `
                    <span class="serv-name">${icon} ${shortName}</span>
                    <span class="serv-val">${Math.round(cupoVal)} <small style="font-size:0.6rem; font-weight:normal;">rac.</small></span>
                `;
                container.appendChild(div);
            }
        });
    }

    if (!hasServices) {
        container.innerHTML = '<div style="grid-column: span 2; text-align:center; color:#6b7280; font-size:0.85rem;">No hay cupos SAE registrados</div>';
    }
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
        const servObj = activeSchool.servicios.find(s => {
            if (activeService === 'COMEDOR') return s.servicio.toUpperCase().includes('COMEDOR');
            return !s.servicio.toUpperCase().includes('COMEDOR'); // DM
        });
        if (servObj) cupo = getLatestCupo(servObj);
    }
    
    document.getElementById('inputCupoManual').value = Math.round(cupo);

    // Setear nivel preferido según el "tipo" de escuela
    const tipo = (activeSchool.tipo || '').toLowerCase();
    const selNivel = document.getElementById('selectNivelGramaje');
    if (tipo.includes('maternal') || tipo.includes('jardín') || tipo.includes('jardin') || tipo.includes('infantes')) {
        selNivel.value = 'jardin';
    } else if (tipo.includes('secundaria') || tipo.includes('técnica') || tipo.includes('tecnica')) {
        selNivel.value = 'secundaria';
    } else {
        selNivel.value = 'primaria';
    }
}

function setupCalculatorListeners() {
    const inputs = ['inputCupoManual', 'selectNivelGramaje', 'cfgDdl', 'cfgMermelada', 'cfgGalletitas', 'cfgMatecocido', 'cfgCacao'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', renderLists);
    });

    document.getElementById('btnCopyWhatsApp').addEventListener('click', generateWhatsAppSummary);
}

// RENDERIZADO DE LISTAS Y CÁLCULOS
function renderLists() {
    const container = document.getElementById('listsContainer');
    container.innerHTML = '';
    if (!activeSchool) return;

    let listasParaRenderizar = [];
    
    if (activeService === 'DM') {
        // dmLists es un objeto con claves "1", "2", etc.
        const dmData = SAE_DATA.dmLists[String(dayNumberIndex)];
        if (dmData) listasParaRenderizar.push(dmData);
    } else if (activeService === 'COMEDOR') {
        // comedorDays es un objeto con claves "Lunes", "Martes", etc.
        // Cada valor es un array de objetos de listas
        const comedorListas = SAE_DATA.comedorDays[activeDay];
        if (comedorListas && comedorListas.length > 0) {
            comedorListas.forEach(listaObj => {
                listasParaRenderizar.push(listaObj);
            });
        }
    }

    const cupo = parseInt(document.getElementById('inputCupoManual').value) || 0;
    const nivelSelected = document.getElementById('selectNivelGramaje').value;

    const envases = {
        ddl: parseFloat(document.getElementById('cfgDdl').value) || 400,
        mermelada: parseFloat(document.getElementById('cfgMermelada').value) || 400,
        galletitas: parseFloat(document.getElementById('cfgGalletitas').value) || 400,
        matecocido: parseFloat(document.getElementById('cfgMatecocido').value) || 25,
        cacao: parseFloat(document.getElementById('cfgCacao').value) || 180
    };

    listasParaRenderizar.forEach(menuObj => {
        const html = generateListHTML(menuObj, cupo, nivelSelected, envases);
        container.innerHTML += html;
    });
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

            // El nombre del ingrediente es "alimento"
            const nombreIng = ing.alimento || ing.nombre || 'Sin nombre';
            const unidad = ing.unidad || 'g';

            const totalBruto = gramajeUnitario * cupo;
            let presentacionInfo = '';
            let totalDisplay = '';

            if (totalBruto === 0) {
                totalDisplay = '0';
            } else {
                const nameLower = nombreIng.toLowerCase();
                if (unidad === 'g') {
                    totalDisplay = `${(totalBruto / 1000).toFixed(2)} kg`;
                    
                    if (nameLower.includes('dulce de leche')) {
                        const bultos = Math.ceil(totalBruto / envases.ddl);
                        presentacionInfo = `<span class="packaging-info">~ ${bultos} potes de ${envases.ddl}g</span>`;
                    } else if (nameLower.includes('mermelada')) {
                        const bultos = Math.ceil(totalBruto / envases.mermelada);
                        presentacionInfo = `<span class="packaging-info">~ ${bultos} potes de ${envases.mermelada}g</span>`;
                    } else if (nameLower.includes('galletita') || nameLower.includes('cracker') || nameLower.includes('pepas') || nameLower.includes('vainilla')) {
                        const bultos = Math.ceil(totalBruto / envases.galletitas);
                        presentacionInfo = `<span class="packaging-info">~ ${bultos} paq. de ${envases.galletitas}g</span>`;
                    } else if (nameLower.includes('cacao')) {
                        const bultos = Math.ceil(totalBruto / envases.cacao);
                        presentacionInfo = `<span class="packaging-info">~ ${bultos} paq. de ${envases.cacao}g</span>`;
                    }
                } else if (unidad === 'cc' || unidad === 'ml') {
                    totalDisplay = `${(totalBruto / 1000).toFixed(2)} L`;
                    if (nameLower.includes('leche') || nameLower.includes('yogur') || nameLower.includes('aceite')) {
                        const bultos = Math.ceil(totalBruto / 1000);
                        presentacionInfo = `<span class="packaging-info">~ ${bultos} sachet/botellas de 1L</span>`;
                    }
                } else if (unidad === 'saquito' || unidad === 'saquitos' || unidad === 'u' || unidad === 'unidades') {
                    totalDisplay = `${Math.ceil(totalBruto)} un.`;
                    if (nameLower.includes('infusi') || nameLower.includes('té') || nameLower.includes('matecocido')) {
                        const bultos = Math.ceil(totalBruto / envases.matecocido);
                        presentacionInfo = `<span class="packaging-info">~ ${bultos} cajas de ${envases.matecocido} u.</span>`;
                    }
                } else {
                    totalDisplay = `${totalBruto} ${unidad}`;
                }
            }

            html += `
                <tr>
                    <td>
                        ${nombreIng}
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
