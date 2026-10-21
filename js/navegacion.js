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

  /* Versión de la página: se cambia en cada entrega (junto con version.json, que tiene el
     mismo número). Cambio chico (arreglos, agregados pequeños): 1.0.1, 1.0.2…
     Algo nuevo o un cambio interesante: 1.1.0, 1.2.0… El 2.0 será el paso a la hoja original.
     Se muestra chiquita al pie y, si la publicada es más nueva que la que tiene abierta el
     navegador, aparece un aviso para recargar. */
  const VERSION = '1.0.3';
  window.SAE_VERSION = VERSION;
  /** Compara "1.0.10" con "1.0.9" por partes (las versiones viejas con fecha cuentan como anteriores a 1.0). */
  function compararVersiones(a, b) {
    const partes = (v) => /^\d+(\.\d+)*$/.test(String(v || '').trim()) ? String(v).trim().split('.').map(Number) : [0];
    const x = partes(a), y = partes(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; }
    return 0;
  }
  window.SAE_COMPARAR_VERSIONES = compararVersiones;

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

  /* ---------- Versión: pie de página y aviso de versión nueva ---------- */
  const legible = (v) => v || '?';
  function pieVersion() {
    if (document.getElementById('saeVersionPie')) return;
    const st = document.createElement('style');
    st.textContent = `.sae-version-pie { text-align: center; font: 500 .7rem/1.4 'Inter', system-ui, sans-serif; color: #8a97a8; padding: 14px 12px 18px; }
      .sae-con-nav .sae-version-pie { padding-bottom: 18px; }
      @media (max-width: 768px) { .sae-con-nav .sae-version-pie { padding-bottom: 84px; } }
      .sae-version-nueva { position: fixed; z-index: 3000; top: 10px; left: 12px; right: 12px; margin: 0 auto; width: fit-content; display: flex; align-items: center; gap: 10px;
        background: #163c68; color: #fff; border-radius: 14px; padding: 7px 8px 7px 14px; font: 600 .82rem/1.3 'Inter', system-ui, sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,.25); }
      .sae-version-nueva small { font-weight: 500; opacity: .8; }
      .sae-version-nueva button { flex: none; }
      .sae-version-nueva button { border: none; border-radius: 999px; padding: 5px 12px; font: 700 .8rem 'Inter', system-ui, sans-serif; cursor: pointer; background: #f5a524; color: #1f1300; }
      .sae-version-nueva .sae-vn-x { background: transparent; color: #fff; padding: 5px 8px; }
      @media print { .sae-version-pie, .sae-version-nueva { display: none !important; } }`;
    document.head.appendChild(st);
    const pie = document.createElement('div');
    pie.id = 'saeVersionPie';
    pie.className = 'sae-version-pie';
    pie.textContent = `SAE Tres de Febrero · versión ${legible(VERSION)}`;
    pie.title = 'Si alguien te dice que hay una versión más nueva, recargá con Ctrl + F5';
    document.body.appendChild(pie);
  }
  async function revisarVersionPublicada() {
    try {
      const r = await fetch(base + 'version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const publicada = String((await r.json()).version || '');
      window.SAE_VERSION_PUBLICADA = publicada;
      if (!publicada || compararVersiones(publicada, VERSION) <= 0) return;   // misma (o más vieja: la publicación todavía no terminó)
      if (document.getElementById('saeVersionNueva')) return;
      const aviso = document.createElement('div');
      aviso.id = 'saeVersionNueva';
      aviso.className = 'sae-version-nueva';
      aviso.setAttribute('role', 'status');
      aviso.innerHTML = `<span>🔄 Hay una versión nueva de la página <small>(${legible(publicada)})</small></span>` +
        `<button type="button" class="sae-vn-ok">Actualizar</button><button type="button" class="sae-vn-x" aria-label="Cerrar">✕</button>`;
      aviso.querySelector('.sae-vn-ok').addEventListener('click', () => location.reload());
      aviso.querySelector('.sae-vn-x').addEventListener('click', () => aviso.remove());
      document.body.appendChild(aviso);
    } catch (e) { /* sin conexión: no se avisa nada */ }
  }
  function iniciarVersion() {
    if (pagina !== 'mapa') pieVersion();   // el mapa ocupa toda la pantalla: ahí la versión se ve en Estado del sistema
    revisarVersionPublicada();
    // Las páginas quedan abiertas mucho tiempo: se vuelve a revisar cada 10 minutos
    setInterval(revisarVersionPublicada, 10 * 60 * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarVersion);
  else iniciarVersion();

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
