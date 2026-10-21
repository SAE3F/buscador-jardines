/**
 * ==========================================================================
 * NAVEGACIÓN ENTRE PÁGINAS - navegacion.js
 * Agrega la barra Buscador · Reclamos · Totales · Mapa en todas las páginas.
 * En la computadora va dentro del encabezado; en el celular, fija abajo.
 * Uso: <script src="js/navegacion.js" data-pagina="buscador" data-base=""></script>
 * (en el mapa, data-base="../")
 * ==========================================================================
 */
(function () {
  'use strict';
  const script = document.currentScript;
  const pagina = (script && script.dataset.pagina) || '';
  const base = (script && script.dataset.base) || '';
  const CLAVE_ESCUELA = 'sae-escuela-actual';

  const PAGINAS = [
    { id: 'buscador', icono: '🔎', texto: 'Buscador', href: 'index.html', conEscuela: true },
    { id: 'reclamos', icono: '📝', texto: 'Reclamos', href: 'reclamos.html' },
    { id: 'totales', icono: '🚚', texto: 'Totales', href: 'totales.html' },
    { id: 'mapa', icono: '🗺️', texto: 'Mapa', href: 'mapa/index.html', conEscuela: true }
  ];

  function escuelaActual() {
    try { return sessionStorage.getItem(CLAVE_ESCUELA) || ''; } catch (e) { return ''; }
  }

  /** La ficha abierta en el buscador se recuerda, así al volver (o ir al mapa) sigue ahí. */
  window.SAE_NAV = {
    recordarEscuela(nombre) {
      try { if (nombre) sessionStorage.setItem(CLAVE_ESCUELA, nombre); } catch (e) { /* nada */ }
      actualizarEnlaces();
    }
  };

  function hrefDe(p) {
    let href = base + p.href;
    const esc = p.conEscuela ? escuelaActual() : '';
    if (esc && p.id !== pagina) href += '?escuela=' + encodeURIComponent(esc);
    return href;
  }

  function actualizarEnlaces() {
    document.querySelectorAll('.sae-nav a[data-pag]').forEach(a => {
      const p = PAGINAS.find(x => x.id === a.dataset.pag);
      if (p) a.href = hrefDe(p);
    });
  }

  function armar(clase) {
    const nav = document.createElement('nav');
    nav.className = 'sae-nav ' + clase;
    nav.setAttribute('aria-label', 'Secciones del sistema SAE');
    nav.innerHTML = '<div class="sae-nav-int">' + PAGINAS.map(p =>
      `<a data-pag="${p.id}" href="${hrefDe(p)}" title="${p.texto}"${p.id === pagina ? ' class="actual" aria-current="page"' : ''}>` +
      `<span class="sae-nav-ico" aria-hidden="true">${p.icono}</span><span class="sae-nav-txt">${p.texto}</span></a>`
    ).join('') + '</div>';
    return nav;
  }

  function crear() {
    if (document.querySelector('.sae-nav')) return;
    // Computadora: dentro del encabezado, junto a los otros botones (no ocupa una fila propia)
    const acciones = document.querySelector('body > header .header-actions, body > .app-header .header-actions, body > .header-municipal .header-actions');
    const enLinea = armar('sae-nav-encabezado');
    if (acciones) acciones.insertBefore(enLinea, acciones.firstChild);
    else {
      const header = document.querySelector('body > header, body > .app-header, body > .header-municipal');
      if (header && header.parentNode) header.parentNode.insertBefore(enLinea, header.nextSibling);
      else document.body.insertBefore(enLinea, document.body.firstChild);
      enLinea.classList.add('sae-nav-fila');
    }
    // Celular: barra fija abajo, tipo aplicación
    document.body.appendChild(armar('sae-nav-abajo'));
    document.documentElement.classList.add('sae-con-nav');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', crear);
  else crear();
})();
