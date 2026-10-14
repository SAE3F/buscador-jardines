/**
 * ==========================================================================
 * MAPA: mostrar / ocultar los filtros
 * Botón "Filtros" en el encabezado. En el celular arrancan ocultos (más mapa);
 * en la computadora, visibles. La elección se recuerda en este navegador.
 * Con los filtros ocultos, el botón indica cuántos hay aplicados.
 * ==========================================================================
 */
(function () {
  'use strict';
  const CLAVE = 'sae-mapa-filtros';
  const btn = document.getElementById('btnFiltros');
  const badge = document.getElementById('filtrosN');
  if (!btn) return;

  function leer() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) { /* nada */ } }

  function aplicar(abiertos) {
    document.body.classList.toggle('filtros-ocultos', !abiertos);
    btn.setAttribute('aria-expanded', String(abiertos));
    btn.classList.toggle('activo', abiertos);
    // El mapa ocupa el lugar que dejan los filtros
    if (typeof AppState !== 'undefined' && AppState.map) {
      setTimeout(() => AppState.map.invalidateSize(), 60);
      setTimeout(() => AppState.map.invalidateSize(), 320);
    }
  }

  /** Cantidad de filtros aplicados (distintos de "todos"). */
  function contar() {
    if (typeof AppState === 'undefined') return 0;
    const s = AppState.summary || {};
    let n = 0;
    if (AppState.searchQuery) n++;
    if (AppState.saeStatus && AppState.saeStatus !== 'all') n++;
    if (s.proveedores && AppState.selectedProviders.size < s.proveedores.length) n++;
    if (s.servicios && AppState.selectedServices.size < s.servicios.length) n++;
    if (s.niveles && AppState.selectedLevels.size < s.niveles.length) n++;
    if (AppState.selectedSchools.size < AppState.allSchools.length) n++;
    return n;
  }
  function pintarCuenta() {
    const n = contar();
    badge.textContent = n;
    badge.style.display = n ? '' : 'none';
    btn.title = n ? `Mostrar u ocultar los filtros (${n} aplicado${n === 1 ? '' : 's'})` : 'Mostrar u ocultar los filtros';
  }

  // Cada vez que se filtra, se actualiza el número del botón
  if (typeof window.applyFilters === 'function') {
    const original = window.applyFilters;
    window.applyFilters = function () { const r = original.apply(this, arguments); pintarCuenta(); return r; };
  }

  const guardado = leer();
  const esCelular = window.matchMedia('(max-width: 768px)').matches;
  aplicar(guardado ? guardado === 'abiertos' : !esCelular);
  btn.addEventListener('click', () => {
    const abrir = document.body.classList.contains('filtros-ocultos');
    aplicar(abrir);
    guardar(abrir ? 'abiertos' : 'cerrados');
  });
  document.addEventListener('DOMContentLoaded', pintarCuenta);
  window.addEventListener('load', pintarCuenta);
})();
