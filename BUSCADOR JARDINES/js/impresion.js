/**
 * IMPRESIÓN EN COLOR O BLANCO Y NEGRO — SAE Tres de Febrero
 * Antes de imprimir (o de bajar la ficha en PDF) pregunta cómo se quiere:
 *   - Color: como siempre.
 *   - Blanco y negro: todo en grises y, en los gráficos, cada serie con un trazo
 *     distinto (continuo, rayado, punteado) para que se distingan sin color.
 * Recuerda la última elección en este navegador (queda marcada por defecto).
 *
 * Uso:
 *   const modo = await SAE_IMPRESION.elegir('Imprimir el informe');   // 'color' | 'byn' | null (canceló)
 *   SAE_IMPRESION.imprimir(modo, () => { ...preparar... }, () => { ...limpiar... });
 */
const SAE_IMPRESION = (() => {
  'use strict';
  const CLAVE = 'sae-impresion-modo';
  const leer = () => { try { return localStorage.getItem(CLAVE) === 'byn' ? 'byn' : 'color'; } catch (e) { return 'color'; } };
  const guardar = (m) => { try { localStorage.setItem(CLAVE, m); } catch (e) { /* nada */ } };

  /* Estilos del cuadro de elección y de la impresión en blanco y negro (se agregan solos) */
  const CSS = `
  .sae-imp-fondo { position: fixed; inset: 0; background: rgba(15, 23, 42, .55); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .sae-imp-caja { background: #fff; color: #0f172a; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.35); width: 100%; max-width: 380px; padding: 18px 18px 14px; font-family: 'Inter', system-ui, sans-serif; }
  html.dark .sae-imp-caja { background: #1e293b; color: #e2e8f0; }
  .sae-imp-caja h3 { margin: 0 0 4px; font-size: 1.05rem; }
  .sae-imp-caja p { margin: 0 0 14px; font-size: .84rem; opacity: .75; }
  .sae-imp-ops { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sae-imp-op { border: 2px solid #d5dbe3; background: transparent; color: inherit; border-radius: 12px; padding: 14px 8px 12px; cursor: pointer; font: 600 .9rem 'Inter', system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .sae-imp-op:hover, .sae-imp-op:focus-visible { border-color: #2a78d6; outline: none; }
  .sae-imp-op.preferido { border-color: #2a78d6; box-shadow: 0 0 0 3px rgba(42,120,214,.18); }
  html.dark .sae-imp-op { border-color: #334155; }
  .sae-imp-muestra { width: 64px; height: 30px; border-radius: 6px; display: flex; overflow: hidden; }
  .sae-imp-muestra i { flex: 1; }
  .sae-imp-op small { font-weight: 400; font-size: .72rem; opacity: .7; }
  .sae-imp-pie { display: flex; justify-content: flex-end; margin-top: 12px; }
  .sae-imp-cancelar { background: none; border: none; color: inherit; opacity: .7; font: 500 .82rem 'Inter', system-ui, sans-serif; cursor: pointer; padding: 6px 8px; }
  .sae-imp-cancelar:hover { opacity: 1; text-decoration: underline; }

  @media print {
    /* Todo en grises */
    html.imprimir-byn body { filter: grayscale(1) !important; }
    /* Gráficos: series distinguibles sin color */
    html.imprimir-byn, html.imprimir-byn #resInforme, html.imprimir-byn.rec-imprimiendo-resumen #resInforme {
      --g-s1: #111 !important; --g-s2: #6b6b6b !important; --g-otro: #9a9a9a !important;
      --g-o1: #444 !important; --g-o2: #777 !important; --g-o3: #555 !important; --g-o4: #888 !important; --g-o5: #333 !important;
      --g-ok: #222 !important; --g-gestion: #666 !important; --g-pend: #9a9a9a !important; --g-sin: #d0d0d0 !important;
    }
    html.imprimir-byn .g-linea.g-s2 { stroke-dasharray: 7 4 !important; }
    html.imprimir-byn .g-linea.g-o1 { stroke-dasharray: 2 3 !important; }
    html.imprimir-byn .g-linea.g-o2 { stroke-dasharray: 10 3 2 3 !important; }
    html.imprimir-byn .g-linea.g-o3 { stroke-dasharray: 1 3 !important; stroke-width: 2.5 !important; }
    html.imprimir-byn .g-linea.g-o4 { stroke-dasharray: 12 5 !important; }
    html.imprimir-byn .g-linea.g-o5 { stroke-dasharray: 4 2 1 2 !important; }
    html.imprimir-byn .g-linea.g-s1.g-parcial { stroke-dasharray: 2 3 !important; }
    html.imprimir-byn .g-punto.g-s2 { fill: #fff !important; stroke: #6b6b6b !important; stroke-width: 2 !important; }
    html.imprimir-byn .g-rotulo { fill: #000 !important; }
    html.imprimir-byn .g-marca { background: #000 !important; box-shadow: 0 0 0 2px #fff !important; width: 4px !important; }
    html.imprimir-byn .g-barra { background: #555 !important; }
    html.imprimir-byn .res-ley::before { background: #111 !important; }
    html.imprimir-byn .res-ley.s2::before { background: repeating-linear-gradient(90deg, #6b6b6b 0 5px, transparent 5px 8px) !important; }
    /* Pastillas de estado y otros fondos de color: con borde para que se lean */
    html.imprimir-byn .rec-pill { border: 1px solid #555 !important; }
    html.imprimir-byn .res-reinc-meses i.si { background: #222 !important; }
    html.imprimir-byn .res-reinc-meses i { background: #ddd !important; }
  }`;
  function asegurarEstilos() {
    if (document.getElementById('saeImpresionCSS')) return;
    const st = document.createElement('style');
    st.id = 'saeImpresionCSS';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /** Muestra el cuadro de elección. Devuelve 'color', 'byn' o null si se canceló. */
  function elegir(titulo) {
    asegurarEstilos();
    return new Promise((resolve) => {
      const pref = leer();
      const fondo = document.createElement('div');
      fondo.className = 'sae-imp-fondo';
      fondo.setAttribute('role', 'dialog');
      fondo.setAttribute('aria-modal', 'true');
      fondo.innerHTML = `<div class="sae-imp-caja">
        <h3>${titulo || 'Imprimir'}</h3>
        <p>¿Cómo lo querés imprimir?</p>
        <div class="sae-imp-ops">
          <button type="button" class="sae-imp-op${pref === 'color' ? ' preferido' : ''}" data-modo="color">
            <span class="sae-imp-muestra"><i style="background:#2a78d6"></i><i style="background:#eb6834"></i><i style="background:#1a9e5f"></i></span>
            🎨 Color<small>Como se ve en pantalla</small></button>
          <button type="button" class="sae-imp-op${pref === 'byn' ? ' preferido' : ''}" data-modo="byn">
            <span class="sae-imp-muestra"><i style="background:#111"></i><i style="background:#777"></i><i style="background:#ccc"></i></span>
            ⚫ Blanco y negro<small>Ahorra tinta de color</small></button>
        </div>
        <div class="sae-imp-pie"><button type="button" class="sae-imp-cancelar">Cancelar</button></div>
      </div>`;
      const cerrar = (m) => {
        document.removeEventListener('keydown', tecla, true);
        fondo.remove();
        if (m) guardar(m);
        resolve(m);
      };
      const tecla = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(null); } };
      fondo.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-modo]');
        if (b) return cerrar(b.dataset.modo);
        if (ev.target.closest('.sae-imp-cancelar') || ev.target === fondo) cerrar(null);
      });
      document.addEventListener('keydown', tecla, true);
      document.body.appendChild(fondo);
      setTimeout(() => { const b = fondo.querySelector('.preferido'); if (b) b.focus(); }, 30);
    });
  }

  /** Imprime en el modo elegido. preparar() y limpiar() son opcionales. */
  function imprimir(modo, preparar, limpiar) {
    asegurarEstilos();
    const html = document.documentElement;
    if (preparar) preparar();
    html.classList.toggle('imprimir-byn', modo === 'byn');
    let hecho = false;
    const fin = () => {
      if (hecho) return;
      hecho = true;
      html.classList.remove('imprimir-byn');
      window.removeEventListener('afterprint', fin);
      if (limpiar) limpiar();
    };
    window.addEventListener('afterprint', fin);
    setTimeout(() => { window.print(); setTimeout(fin, 1500); }, 60);
  }

  /** Para la ficha en PDF: colores del documento en grises. */
  function aGris(rgb) {
    const g = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
    return [g, g, g];
  }

  return { elegir, imprimir, aGris, preferido: leer };
})();
if (typeof window !== 'undefined') window.SAE_IMPRESION = SAE_IMPRESION;
