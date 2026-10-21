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

  /**
   * Teclado en las listas de los buscadores: ↑ ↓ para moverse, Enter para elegir
   * (si no se marcó ninguna, elige la primera) y Esc para cerrar.
   * SAE_TECLADO.lista(campo, lista, { items, clase, abierta(), cerrar(), elegir(el) })
   */
  window.SAE_TECLADO = {
    lista(input, cont, o) {
      o = o || {};
      if (!input || !cont || input.dataset.saeTeclado) return;
      input.dataset.saeTeclado = '1';
      const sel = o.items || '.autocomplete-item';
      const clase = o.clase || 'sae-tecla-activo';
      const seVe = (el) => el.getClientRects().length > 0;   // (offsetParent falla con position: fixed)
      const abierta = o.abierta || (() => cont.style.display !== 'none' && seVe(cont));
      const visibles = () => Array.from(cont.querySelectorAll(sel))
        .filter(el => seVe(el) && !el.hasAttribute('data-no-elegible'));
      const marcar = (lista, i) => {
        Array.from(cont.querySelectorAll('.' + clase)).forEach(el => { el.classList.remove(clase); el.removeAttribute('aria-selected'); });
        if (!lista[i]) return;
        lista[i].classList.add(clase);
        lista[i].setAttribute('aria-selected', 'true');
        lista[i].scrollIntoView({ block: 'nearest' });
      };
      input.setAttribute('aria-autocomplete', 'list');
      input.addEventListener('keydown', (ev) => {
        if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].indexOf(ev.key) < 0 || ev.isComposing) return;
        if (!abierta()) return;
        const lista = visibles();
        if (ev.key === 'Escape') { ev.preventDefault(); if (o.cerrar) o.cerrar(); else cont.style.display = 'none'; return; }
        if (!lista.length) return;
        let i = lista.findIndex(el => el.classList.contains(clase));
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (ev.key === 'ArrowDown') i = i < 0 ? 0 : Math.min(lista.length - 1, i + 1);
          else i = i < 0 ? lista.length - 1 : Math.max(0, i - 1);
          marcar(lista, i);
          return;
        }
        // Enter
        ev.preventDefault();
        const el = lista[i < 0 ? 0 : i];
        if (o.elegir) o.elegir(el); else el.click();
        if (o.mantenerFoco) { input.focus(); marcar(visibles(), visibles().indexOf(el)); }
      });
      // Con el mouse, la marca sigue al puntero (así no quedan dos resaltadas)
      cont.addEventListener('mousemove', (ev) => {
        const el = ev.target.closest && ev.target.closest(sel);
        if (!el || el.classList.contains(clase) || el.hasAttribute('data-no-elegible')) return;
        const lista = visibles();
        marcar(lista, lista.indexOf(el));
      });
    }
  };
})();
