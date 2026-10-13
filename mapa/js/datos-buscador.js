/**
 * ==========================================================================
 * MAPA ⇄ BUSCADOR
 * El mapa toma los cupos, servicios y proveedores del buscador (datos/data.js
 * y, si hay, la última actualización desde Google), así los dos muestran
 * siempre lo mismo. Las coordenadas, direcciones y niveles siguen saliendo
 * de data_escuelas.js.
 * Se carga después de data_escuelas.js y antes de js/app.js.
 * ==========================================================================
 */
(function () {
  'use strict';
  if (typeof ESCUELAS_DATA === 'undefined' || typeof SAE_DATA === 'undefined' || typeof SAE_MENUS === 'undefined') return;

  // Nombres del mapa que en el buscador figuran distinto
  const EQUIVALENCIAS = {
    'CATDI (ATENCIÓN TEMPRANA DEL DESARROLLO INFANTIL)': 'CATDI',
    'ESTETICA': 'EST 01'
  };

  const mayus = (t) => String(t || '').trim().toUpperCase();
  const hoy = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  function escuelaDelBuscador(m) {
    const nombre = EQUIVALENCIAS[mayus(m.escuela)] || m.escuela;
    return (typeof SAE_SYNC !== 'undefined' && SAE_SYNC.buscarEscuela) ? SAE_SYNC.buscarEscuela(nombre) : null;
  }

  function aplicar() {
    const resumen = typeof RESUMEN_DATA !== 'undefined' ? RESUMEN_DATA : null;
    ESCUELAS_DATA.forEach(m => {
      const e = escuelaDelBuscador(m);
      if (!e) return;                       // no figura en el buscador: queda como estaba
      m.buscador = e.nombre;
      const servicios = [];
      (e.servicios || []).forEach(s => {
        const cupo = Math.round(SAE_MENUS.cupoEnFecha(s, hoy));
        if (cupo > 0) servicios.push({ servicio: s.servicio, proveedor: s.proveedor || e.proveedor || '', cupo, fecha: hoy, cupo_especial: s.cupo_especial || 0 });
      });
      m.servicios = servicios;
      m.total_cupos = servicios.reduce((a, s) => a + s.cupo, 0);
      m.has_sae = servicios.length > 0;
      if (servicios.length) m.proveedor = servicios[0].proveedor;
      // Servicios o proveedores nuevos: se agregan a los filtros para que no queden ocultos
      if (resumen) {
        servicios.forEach(s => {
          if (resumen.servicios.indexOf(s.servicio) < 0) resumen.servicios.push(s.servicio);
          if (resumen.proveedores.indexOf(s.proveedor) < 0) resumen.proveedores.push(s.proveedor);
          if (typeof AppState !== 'undefined') {
            AppState.selectedServices.add(s.servicio);
            AppState.selectedProviders.add(s.proveedor);
          }
        });
      }
    });
  }

  /** Busca una escuela del mapa por el nombre que usa el buscador (o cualquiera de sus alias). */
  window.MAPA_BUSCAR_ESCUELA = function (nombre) {
    const k = mayus(nombre);
    const directa = ESCUELAS_DATA.find(s => mayus(s.escuela) === k);
    if (directa) return directa;
    const e = (typeof SAE_SYNC !== 'undefined' && SAE_SYNC.buscarEscuela) ? SAE_SYNC.buscarEscuela(nombre) : null;
    if (!e) return null;
    return ESCUELAS_DATA.find(s => s.buscador === e.nombre) || null;
  };

  aplicar();

  // Si llegan cupos nuevos de Google mientras el mapa está abierto, se redibuja
  window.addEventListener('sae-datos-actualizados', () => {
    aplicar();
    if (typeof applyFilters === 'function') { try { applyFilters(); } catch (e) { /* nada */ } }
  });
})();
