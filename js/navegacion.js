/**
 * ==========================================================================
 * NAVEGACIÓN ENTRE PÁGINAS - navegacion.js
 * Agrega la barra Buscador · Reclamos · Totales · Mapa en todas las páginas.
 * En la computadora va debajo del encabezado; en el celular, fija abajo.
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

  function crear() {
    if (document.querySelector('.sae-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'sae-nav';
    nav.setAttribute('aria-label', 'Secciones del sistema SAE');
    nav.innerHTML = '<div class="sae-nav-int">' + PAGINAS.map(p =>
      `<a data-pag="${p.id}" href="${hrefDe(p)}"${p.id === pagina ? ' class="actual" aria-current="page"' : ''}>` +
      `<span class="sae-nav-ico" aria-hidden="true">${p.icono}</span><span class="sae-nav-txt">${p.texto}</span></a>`
    ).join('') + '</div>';
    // Debajo del encabezado de la página (o al principio si no tiene)
    const header = document.querySelector('body > header, body > .app-header, body > .header-municipal');
    if (header && header.parentNode) header.parentNode.insertBefore(nav, header.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);
    document.documentElement.classList.add('sae-con-nav');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', crear);
  else crear();
})();
