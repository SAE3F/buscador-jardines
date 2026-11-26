# Contexto para seguir el proyecto "SAE Entregas" en otro chat de Claude

> **Cómo usar este archivo:** abrí un chat nuevo, adjuntá este archivo **y** el zip completo del repo
> (`sae-entregas-completo-v0.3.0.zip`, o el que tengas más nuevo desde GitHub) y escribí algo como:
> *"Leé CONTEXTO_SAE_ENTREGAS.md y el zip. Seguimos con la página SAE Entregas desde donde quedó."*
> Si tenés el kit de diseño (`KIT_DISENO_3F.zip`), adjuntalo también.

---

## 1. Cómo se trabaja (reglas acordadas)

- Idioma: **español rioplatense con voseo**. Respuestas cortas, claras y sinceras.
- **Regla principal:** salvo que diga **"hazlo"**, **"hazlo ahora"** o **"arrancá"**, **no se programa nada**:
  lo que pida se **anota para la próxima actualización**. Si solo pregunto algo, se contesta corto, sin programar.
- **Entregas:** un `.zip` con **solo los archivos que cambiaron**, con rutas desde la raíz del repo. Decir siempre:
  qué versión tiene que aparecer abajo en la página y **si hay que volver a publicar el Apps Script**.
- **Nunca mandar `js/config.js` en las actualizaciones** (tiene mi URL del script). Las versiones van en `js/version.js`.
- **Nunca hacer push al repo**: lo subo yo (GitHub → Vercel).
- La página es **solo de lectura**: no escribe ni modifica planillas hasta nueva orden.
- Antes de escribir en cualquier planilla real del equipo: decir exactamente qué se cambia y esperar mi OK.
- **Repo público:** nada de teléfonos, mails personales, CUIT, montos, N° de factura/remito ni claves en el código.
- Probar siempre: compu y celular, modo claro y oscuro, sin scroll hacia el costado.
- Todo lo que diga **"Sin tipo" / "Sin categoría" / "Sin rubro" / "Sin dato"** va **siempre al final** (filtros, gráficos, tablas, Excel). Si hay "Otras", va anteúltimo.
- **Este archivo es el hilo del trabajo:** cada vez que haya algo que otro Claude necesite saber (una actualización entregada,
  un pendiente anotado o resuelto, una decisión, una regla nueva, un cambio en planillas o en el script), **se actualiza este
  archivo**, con la fecha en la sección 8 (Registro). **Va DENTRO del zip de cada actualización** (en la raíz, `CONTEXTO_SAE_ENTREGAS.md`),
  no como archivo suelto ni en cada mensaje.

## 2. Qué es la página

Proyecto del equipo **SAE · Municipalidad de Tres de Febrero** (ecosistema **Portal Educación 3F**).

**SAE Entregas** (`SAE <naranja>Entregas</naranja>`): buscador y tablero de **entregas, obras y arreglos** de cada
institución, más completo y profesional que la sección "Entregas, obras y arreglos" de **SAE Gestión 3F**
(`https://sae-gestion3f.vercel.app`, repo `SAE3F/buscador-jardines`), que fue la referencia.

- HTML/CSS/JS estático, **sin librerías** (gráficos SVG propios, Excel `.xlsx` generado en el navegador).
- Hosting: **GitHub + Vercel** (página estática, sin build).
- Diseño: **kit 3F** (`css/tokens-3f.css` sin cambios; Inter + Montserrat; azul `#163C68`, naranja `#F69321`; modo oscuro con clase `dark` en `<html>`).
- **Todavía NO está en el Portal Educación 3F** (sin guardián SSO). Se suma cuando esté estable: pedir a **Matías** el alta y el `APP_ID`
  y pegar el guardián SSO de la plantilla del kit al principio del `<head>`.

### Vistas
| Vista | Contenido |
|---|---|
| 🔎 Buscador | Autocompletado; lista de instituciones con filtros (nivel, gestión, localidad, mostrar, ordenar por, y en "➕ Más filtros": sin movimientos desde hace…, actividad desde/hasta, tiene/nunca recibió categoría, proveedor, incluir sin fecha exacta). Filtros recordados en `localStorage`. **Ficha**: datos de ESTABLECIMIENTOS, indicadores, línea de tiempo (por año / por mes), "Qué recibió", detalle E/O/A con filtros (buscar, período, desde/hasta, año, mes, categoría, proveedor, orden, sin fecha exacta), botones 📄 Ficha para visita (opciones + imprimir/PDF numerado + Excel), 🧭 Cómo llegar, 🗺️ Ver en el mapa (SAE Gestión), 📄 Ver en planillas, 🔗 Copiar link, ⬇️ Excel, ↗ por registro. Apartado 📣 Últimos reclamos (5/10/20). Arreglos agrupados desplegables |
| 📊 Vista general | Filtros (tipo, medir por registros/unidades, años, categoría, nivel, gestión, localidad, proveedor; en "➕ Más filtros": texto, período, servicio SAE, planilla, meses, comparar instituciones, sin fecha exacta; etiquetas ✕ y link con filtros). Indicadores (el de "Sin ningún registro" va último). Gráficos: por año, por categoría, ranking de instituciones (Más / Menos [≥1] / Sin registros, Ver todas, Excel), por proveedor (rubros debajo del nombre, tooltip y resumen al tocar), por nivel, por localidad, tabla institución × categoría (encabezados verticales, Institución y Total fijos) |
| 📋 Registros | Todos los registros: buscar, tipo, año, categoría, proveedor, planilla y en "➕ Más filtros" período, mes, institución, nivel, gestión, localidad, cantidad mínima, sin fecha exacta, agrupar arreglos; etiquetas ✕, link con filtros, filtros recordados, orden por columna, paginado, Excel. Columnas de ancho fijo, una línea por fila, ↗ por registro |
| 🩺 Calidad de datos | Avisos agrupados por problema (no está en ESTABLECIMIENTOS, fila sin institución, detalle nombra otra institución, SIN DATOS, obra sin tipo, repetida, escrita de otra forma ya unificada, hoja ilegible). Filtro por planilla. Tocar el aviso abre la planilla en la celda; "Ver ficha" aparte |

## 3. De dónde salen los datos (todo vía Apps Script propio, solo lectura)

| Planilla (ID) | Hoja | Código | Uso |
|---|---|---|---|
| **BASE DE DATOS** `1HHI99Y8T2MAII1cFBRV8sJ1rhSOwoel42qt_KeDAFuw` | ESTABLECIMIENTOS | ES | Datos de cada institución: INSTITUCION, NOMBRE COMPLETO, GESTIÓN, TIPO, NIVEL, CUE, MATRICULA / CUPO S.A.E 2026, SERVICIO SAE, LOCALIDAD (no tiene zona) |
| BASE DE DATOS | ENTREGAS | EN | Entregas: Fecha_Entrega, AÑO, INSTITUCION, Categoria, Descripcion_material, Cantidad, Tipo, Estado, Tipo de Institucion |
| BASE DE DATOS | OBRAS-INFRAESTRUCTURA | OB | Obras: Año, INSTITUCION, Tipo de Obra, Detalle _obra ("EP 07 \| REFACCION…"), Cantidad, Categoria. Sin fecha exacta |
| **SAE \| Tablero Gestión** `1P57PeQ8WeLJbEovcGNKsT-4K_2AmCXpWF1W-MrwYShQ` | HISTORICOENTREGAS | HI | Matriz AÑO \| TIPO \| DETALLE \| una columna por escuela (cantidades). 2022–2024, utensilios y equipamiento. (BUSCADOR ENTREGAS es solo una vista con fórmulas de esta hoja) |
| SAE \| Tablero Gestión | Reclamos | RE | Reclamos (solo lectura, por escuela, últimos 20): FECHA, ESCUELA, PROVEEDOR SAE, SERVICIO, TIPO, CATEGORIA, Subcategoria, DETALLE, PRODUCTO, ESTADO, Responsable, Fecha resolución, ACCIONES, PROBLEMA (no se usan PATOLOGÍA, cupos ni horarios). Los gestiona SAE Gestión (`reclamos.html`) |
| **Facturación SAE 2026** `1mku6iQQSy2Vjfa51QhXJ_WUMphHIlT3yYvMdB3baiIc` | FACTURACION ITEMS | IT | Arreglos: fecha ("Columna 1"), SERVICIO (GAS 2025/2026, ELECTRICIDAD 2026, PLOMERIA 2026, REFRIGERACION…), PROVEEDOR, OC, N°ITEM, DETALLE, UNIDADES, MONTO, N° FACTURA, ESCUELA. Las columnas N–P son un catálogo aparte (no se usan) |
| Facturación SAE 2026 | FACTURACION UNIDADES | UN | SERVICIO que empieza con UTENSILIOS/EQUIPAMIENTO → **entrega**; ATMOSFERICO/CANALETAS → **arreglo**; el resto (SAE/MESA/COLONIAS = servicio alimentario) **no entra**. Institución en OBSERVACIONES; cantidad en "UNIDADES A FACTURAR" |

- **ANEXO PROVEEDORES** (Facturación) solo tiene código, dirección, CUIT y estado: **no se usa** (no mostrar CUIT).
- **Montos y N° de factura:** preparados pero **apagados** (`INCLUIR_MONTOS = false` en `Codigo.gs`). Si se activan, la página agrega las columnas sola. Antes, conviene sumar la página al Portal.
- Totales de referencia en SAE Gestión (para comparar): 3.201 entregas, 323 obras, 794 arreglos.

## 4. Archivos del repo

```
index.html            vistas y estructura
css/tokens-3f.css     del kit, sin cambios
css/app.css           estilos propios (al final hay bloques "v0.2.0" y "v0.3.0")
js/escuelas-extra.js  (equipo) dirección, directora, cargo, localidad, CUE por escuela → window.ESCUELAS_EXTRA
js/coordenadas.js     lat/lng por escuela (de mapa/data_escuelas.js de SAE Gestión; solo nombre y coordenadas) → window.ESCUELAS_COORDS
js/pdf.js             PDF sin librerías (Helvetica, A4, "Hoja X de Y"): window.PDFsimple
js/config.js          SOLO CONFIG.SCRIPT_URL (de la persona usuaria; no viene en actualizaciones)
js/version.js         VERSION_PAGINA y VERSION_SCRIPT_ESPERADA (viene en cada actualización)
js/util.js            utilidades: esc, n (es-AR), norm, íconos por categoría, esSin/ordenTexto/sinAlFinal, urlCelda/abrirCelda
js/excel.js           exportarExcel(nombre, hojas) sin librerías
js/datos.js           carga (copia en localStorage + fetch al script), prepara registros, aviso de versiones
js/graficos.js        G.columnas (apiladas), G.barrasH, G.secuencial, tooltips
js/app.js             toda la interfaz (estado S, vistas, filtros, ficha, calidad, eventos)
apps-script/Codigo.gs   script de solo lectura (VERSION_SCRIPT)
apps-script/PUBLICAR.md pasos para publicarlo
estado.html + js/estado.js (0.9.0) 🩺 Estado del sistema (link en el pie de la página)
sw.js                 (0.7.0) service worker: red primero (espera 4 s) y copia guardada sin internet; no toca el Apps Script ni los .json
manifest.webmanifest  (0.7.0) app instalable ("Ficha Escuelas", azul #163C68); íconos assets/icono-192/512/maskable-512/apple-180.png
vercel.json, AGENTS.md, assets/ (del kit), README.md   (vercel.json: sw.js sin caché; manifest con su Content-Type)
```

### Contrato de datos (lo que devuelve el script)
`{ ok, version, generado, montos, resumen, hojas:{COD:{id,gid,hoja,planilla}}, instituciones:[…], registros:[…], avisos:[…] }`

- **Registro** (array): `[0 tipo E|O|A, 1 año, 2 fecha AAAA-MM-DD o '', 3 id institución, 4 categoría, 5 detalle, 6 cantidad, 7 proveedor, 8 fuente, 9 servicio/OC, 10 estado, 11 monto|null, 12 factura|null, 13 hoja, 14 fila, 15 columna]`
- **Institución:** `{ id, nombre, completo, gestion, tipo, nivel, cue, matricula, servicio, localidad, enBase, ref:[hoja,fila,col], alias:[…], aliasRef:{nombre:[hoja,fila,col]} }`
- **Aviso:** `{ tipo: sin_inst|sin_tipo|otra_inst|repetida|sin_datos|hoja, h, hoja, fila, col, texto }`
- **Reclamos (1.2.0):** `?accion=reclamos&inst=ID` → `{ ok, version, inst, reclamos:{ total, abiertos, abiertoMasViejo, items:[[fecha, estado, tipo, categoría, subcategoría, detalle, producto, servicio, proveedor, responsable, fecha resolución, acciones, problema, fila]] } }` (últimos 20; cache por escuela 10 min). Hoja con código `RE` en `hojas`.
- **Nombres de institución** normalizados con `idInst_()` (mayúsculas, sin acentos, "EP 8"→"EP 08", "SEC 2 (EES 02)"→"EES 02", EP/EES con 2 dígitos, el resto sin ceros). Equivalencias manuales en `ALIAS` dentro de `Codigo.gs`.
- **Botón ↗:** abre `https://docs.google.com/spreadsheets/d/ID/edit?r=<timestamp>#gid=GID&range=A1` en una pestaña con nombre fijo por planilla (`sae_planilla_<ID>`), así reusa la misma pestaña. No puede tomar una pestaña que el usuario abrió a mano (límite del navegador).
- Cache del script: CacheService 10 min en trozos; `?actualizar=1` lo rehace (botón 🔄 Actualizar).
- Prueba local: servir la carpeta (`python -m http.server 8000`) y usar `?datos=archivo.json` con un JSON del mismo formato.

## 5. Estado actual (24/11/2026)

- **Propósito:** buscador resumido de todo lo hecho en cada escuela, para ver, imprimir o descargar antes o durante una visita.
- **Página:** versión **0.9.0** entregada el 26/11/2026 como **zip completo** (todos los archivos menos `js/config.js`). Título: **Ficha Escuelas**.
  Necesita el **Apps Script 1.3.0** publicado (Nueva versión) y, una vez, ejecutar `activarActualizacionAutomatica` en el editor.
- **Apps Script:** versión **1.3.0** entregada el 25/11/2026 (actualización automática cada hora: `activarActualizacionAutomatica` / `desactivarActualizacionAutomatica` / `actualizarAutomatico`; con eso la copia dura 6 h en vez de 10 min; los datos traen `auto:true`). La 1.2.0 agregó reclamos. Hay que publicarla como Nueva versión. Antes estaba la 1.1.0 publicada como aplicación web ("Ejecutar como: Yo", "Cualquier persona"). La URL está en el `js/config.js` de la persona usuaria.
- Historial: 0.1.0 (primera versión) → 0.1.1 (tablas de ancho fijo, una línea) → 0.2.0 (script 1.1.0: ir a la celda, calidad por problema, ranking Menos/Sin registros, "Sin tipo" al final, encabezados verticales) → 0.3.0 (copiar link con respaldo, aviso clicable, version.js, 12 filtros nuevos, tabla institución × categoría con columnas fijas, info de proveedores) → 0.4.0 (equipo: "Ficha Escuelas", escuelas-extra.js) → 0.5.0 (script 1.2.0: reclamos en la ficha, cómo llegar y ver en el mapa, ficha para visita con opciones e impresión numerada, arreglos agrupados desplegables, filtros nuevos en Vista general / Registros / Calidad con etiquetas ✕ y link con filtros, localidades en mayúsculas, CUE sin ".0") → 0.5.1 (arreglos agrupados solo de FACTURACION ITEMS) → 0.5.2 (grupos en verde; Ficha para visita: botón **PDF a color** que descarga directo (js/pdf.js, sin librerías) y botón **Imprimir en blanco y negro**; sin "Cómo llegar" en impresión/PDF; reclamos pedidos de antemano para que sea rápido) → 0.5.3 (arreglos agrupados por día; en Registros con subgrupo por escuela) → 0.5.4 (FACTURACION UNIDADES agrupado en violeta; botones Excel/Imprimir/PDF en azul oscuro; día abierto resaltado con otro color) → 0.5.5 (Proveedor tipeable con rubro; día de una sola escuela sin subgrupo; Más/Menos filtros) → 0.6.0 (celulares: versión concisa, ver sección de celulares) → 0.6.1 (modo claro con colores más marcados) → 0.6.2 (modo claro: escuela en amarillo y trabajos en gris dentro del día) → 0.7.0 (script 1.3.0: sin internet + instalable, reclamo ↔ arreglo, buscar por cosa, actualización automática cada hora, "Actualizado hace…") → 0.8.0 (celular, segunda etapa: filtros plegados, escuelas en tarjetas, ficha corta con barra fija abajo, pestañas abajo, de a 50; la app abre en el Buscador) → 0.8.1 (Ficha para visita: 5/10/20/Todos por apartado; "Más datos" y reclamos abiertos ya no se cierran solos) → 0.8.2 (Ficha para visita: lo anterior al año actual resumido en un renglón por categoría; período último mes / 3 / 6 meses / 1 año / fechas a mano) → 0.8.3 (reclamos al final de la ficha descargada/impresa) → 0.8.4 (cartel "Hay una actualización" cuando se suben archivos nuevos) → 0.9.0 (página 🩺 Estado del sistema).

## 6. Pendientes y temas abiertos
- **Para revisar con el equipo:** (a) `js/escuelas-extra.js` tiene **nombres de directoras/es en el repo público** (el kit pide no
  publicar datos personales); lo prolijo sería traerlos desde una planilla vía Apps Script; (b) sacar del repo `LINK_APPSCRIPT_SAE_ENTREGAS.txt`,
  el zip y el contexto viejo; (c) `js/config.js` con la URL del script queda público (sin clave, decisión del equipo).
- **En consulta (NO anotado todavía):** cargar **remitos y facturas** enlazados a cada registro. Opciones conversadas:
  1. Link de Drive en una columna nueva de la planilla y botón 📎 en la página (simple, sigue siendo solo lectura).
  2. Subir el archivo desde la página → Apps Script lo guarda en Drive y escribe el link en la fila (deja de ser solo lectura; hacerlo con la página ya en el Portal).
  3. Servidor propio (no se recomienda por ahora).
  Está en consulta con sus superiores.
- **Más adelante:** sumar al Portal Educación 3F (Matías, `APP_ID`, guardián SSO); activar montos.

### Decisiones tomadas (para no volver a preguntar)
- Reclamos: **solo lectura**, en un **apartado propio de la ficha** ("📣 Últimos reclamos", no pestaña), últimos **5/10/20** a elección,
  **sin clave** en el script, **sin gráficos de reclamos** en la Vista general (la página es de entregas, obras y arreglos).
- Cómo llegar: **desde la Municipalidad de Tres de Febrero (Alberdi 4840, Caseros)**, con coordenadas (respaldo: dirección).
- Agrupados: **FACTURACION ITEMS** (verde) y **FACTURACION UNIDADES** (violeta; incluye entregas Utensilios/Equipamiento y arreglos Canaletas/Atmosférico), **cada día por separado**. En **Registros**: día + rubro + proveedor → subgrupo por escuela → trabajos.
  En la **ficha** del buscador y en la **Ficha para visita** (una sola escuela): día + rubro + proveedor → trabajos. Desplegable. Al abrir un día: la fila del día se resalta (modo claro naranja suave con borde naranja; modo oscuro verde/violeta más intenso) y lo de adentro va en azul grisáceo con borde azul.
- Ficha para visita: se elige apartados, columnas, período (todo / 12 meses / lo filtrado) y formato (resumida = últimos 10 / completa);
  hojas numeradas abajo a la izquierda ("Hoja X de Y"). **PDF siempre a color** (descarga directa) e **Imprimir siempre en blanco y negro**. Botones: Cancelar (secundario) y **⬇️ Excel / 🖨️ Imprimir / ⬇️ PDF** en azul oscuro (primario).
  **Sin "Cómo llegar"** en impresión/PDF (el botón en pantalla y el Excel lo mantienen).
- **Proveedor** (Buscador, ficha, Vista general, Registros): campo **tipeable** (`combo()` en app.js; el `<select>` queda oculto y sigue siendo el valor real).
  Al hacer clic se despliega la lista; cada proveedor muestra debajo su **rubro** (de todos sus registros, de más a menos, hasta 3 + "+N").
  Tipear filtra por nombre o rubro; ↑↓ / Enter / Esc; ✕ vuelve a Todos; si no coincide, no filtra y avisa. En el campo queda solo el nombre.
- "➕ Más filtros" cambia a "➖ Menos filtros" cuando está abierto (solo CSS).
- Registros: si un día agrupado tiene **una sola escuela**, no hay subgrupo: abre directo los trabajos.
- **Celulares (≤ 640px, desde 0.6.0)** — pedido: que se vea "lo que pasa", la gente del celular ya sabe a quién pertenece cada cosa:
  sin gráficos (Línea de tiempo y Qué recibió en la ficha; todos los de Vista general, incluida Institución × categoría y "Medir por"),
  sin botones de Excel (también en la Ficha para visita), sin "Ver en planillas", sin botones ↗ a celdas, sin pestaña Calidad de datos.
  Detalle y Registros como **tarjetas**: tipo · fecha · institución … Cant. / rubro / **detalle completo sin cortar**; **sin Proveedor ni Planilla**.
  Grupos por día con el mismo color en toda la tarjeta; dentro de un grupo solo detalle y cantidad. Clases: `.solo-pc` / `.solo-cel`,
  columnas `c-t c-fecha c-inst c-cat c-det c-cant c-prov c-monto c-fact c-fuente c-ir` en `tablaRegs`. En PC no cambia nada.
- **Modo claro, colores marcados (0.6.1):** ITEMS `#c8ecd9` franja `#139166`; UNIDADES `#ddd0f7` franja `#6a45d1`; día abierto `#fbd3a0` franja `#F69321`;
  franjas de 5px; resumen gris más oscuro. Desde **0.6.2**, dentro del día abierto: **escuela (subgrupo) amarillo** `#fdeca6` franja `#c99a00`;
  **trabajos gris claro** `#eceff3` franja `#64748b`. Bloques "v0.6.1" y "v0.6.2" al final de app.css. El modo oscuro no cambió (azul grisáceo).
- **0.7.0 · Sin internet e instalable:** `sw.js` guarda los archivos; los datos ya se guardaban en localStorage (`CLAVE_COPIA`); los reclamos
  de cada escuela vista se guardan en `sae-rec-<ID>`. Sin señal: punto gris "Sin internet · datos hace…" y aviso; al volver la señal se actualiza solo.
  Botón **📲 Instalar** en el encabezado (aparece si el navegador lo permite; en iPhone abre los pasos de Safari → Agregar a inicio).
- **0.7.0 · Reclamo ↔ arreglo:** en cada reclamo, "🔗 Posible arreglo/entrega relacionada" = registros de esa escuela del mismo rubro entre la fecha
  del reclamo y 60 días después (o la fecha de resolución si es más tarde); máx. 2, agrupados por día. El rubro sale por palabras clave
  (`RUBROS_RECLAMO` en app.js: Gas, Electricidad, Plomería, Refrigeración, Canaletas, Atmosférico, Utensilios, Equipamiento). Es orientativo ("Posible").
- **0.7.0 · Buscar por cosa** (Buscador, con "?"): busca en categoría, detalle y servicio; la lista muestra Veces / Unidades / Última vez
  (orden "Última vez que lo tuvo" o "Más veces") y respeta los filtros. Al abrir una escuela, el detalle viene filtrado con esa palabra y en la
  pestaña donde más aparece. En celular la lista de escuelas no muestra Nivel ni Localidad.
- **0.7.0 · Datos al día:** "Actualizado hace X" (min / h / fecha). Verde hasta 2 h, naranja si es más viejo (conviene 🔄), gris sin internet.
  En celular se ve la versión corta ("3 h") y el botón Actualizar queda solo con 🔄.
- **0.8.0 · Celular (≤ 640px), segunda etapa:**
  - Filtros plegados detrás de **"⚙️ Filtros (n)"** en Buscador (quedan a la vista el buscador y "Buscar por cosa"), ficha (queda "Buscar en el detalle"),
    Registros (queda "Buscar") y Vista general (queda Tipo). Cajas `.plegable` + botón `[data-plegar]`; estado en `PLEG_ABIERTOS`; números con `cuentaPleg()`.
  - Lista de escuelas en **tarjetas** (nombre, último, 📦 (u.) 🏗️ 🛠️; con "Buscar por cosa": veces, unidades, última vez). Toda la tarjeta abre la ficha.
  - Ficha: a la vista **dirección y directora**; el resto con "➕ Más datos". Totales en **una franja** (Entregas · Obras · Arreglos · Último).
    Pestañas del detalle completas. Reclamos compactos (sin servicio/proveedor, 2 líneas; tocar uno lo abre entero).
  - **Barra fija abajo en la ficha:** ← Volver · 🧭 Cómo llegar · 📄 Ficha / PDF · 🔗 Link (sin "Ver en el mapa": la usuaria dijo que no hace falta;
    en la compu el botón sigue). Mientras la ficha está abierta reemplaza a las pestañas.
  - **Pestañas abajo** (Buscador · Vista · Registros), tipo app.
  - Registros y detalle de la ficha **de a 50** con "Ver 50 más" (en la compu siguen las páginas de 100).
  - Botones ≥ 38–44 px y campos con letra de 16 px (el iPhone no hace zoom).
- **La app instalada (celular y compu) siempre abre en el Buscador:** `start_url` = `index.html?vista=buscador&app=1`; con `app=1` se ignora la última vista/ficha.
- **0.8.1 · Ficha para visita, "Cuántos mostrar (los más recientes)":** Entregas, Obras y Arreglos con **5 · 10 · 20 · Todos** cada uno
  (`o.lim`, reemplaza al viejo "Formato resumida/completa"; si había "resumida" guardada pasa a 10). Vale para Imprimir, PDF y Excel; abajo de la
  tabla dice "Mostrando 10 de 32 (los más recientes)". Con "Agrupar" activado cada **día** agrupado cuenta como 1; obras y lo no agrupado, de a uno.
- **0.8.2 · Ficha para visita, resumen de años anteriores** (casilla "Resumir lo anterior a <año>", viene marcada; Imprimir y PDF, el Excel va en detalle):
  lo del año actual va en detalle (con su límite 5/10/20/Todos); lo anterior, **un renglón por categoría**: Fecha = "2021–2024", Detalle =
  "Vasos (94), Tenedores (53)…" (entregas: suma de cantidades; obras/arreglos: "(×n)" veces), Cantidad = total (+ "n trab."), Proveedor = los 2 principales,
  máx. 40 ítems + "y N más"; fondo gris claro (`resumirViejos()`). Si todo el período elegido es de años anteriores, NO se resume (va en detalle).
- **0.9.0 · 🩺 Estado del sistema** (`estado.html`, link "🩺 Estado del sistema" en el pie). Al estilo de la de SAE Reclamos: resumen ✅/⚠️/❌ con la lista
  de lo que hay que mirar (cada uno lleva a su renglón), grupos plegables (se abren solos si tienen algo), 🔄 Volver a revisar, 📋 Copiar informe,
  💬 WhatsApp. Solo lee. Grupos: **📁 Archivos** (`ARCHIVOS` en js/estado.js con "marcas" de la última versión: si falta una, "quedó en una versión
  vieja"; imágenes; config.js con URL bien formada; `SOBRANTES`: LINK_APPSCRIPT…txt, datos-prueba*.json, etc.) · **🔢 Versiones** (js/version.js
  subido vs. `VERSION_ESTADO`, la que se abrió en este dispositivo — `fe-version-abierta` que guarda app.js —, script publicado vs. esperado y vs. el
  Codigo.gs del repo, sw activo) · **🔗 Script** (accion=version, reclamos, datos completos y cuánto tardan, `auto`, de hace cuánto) · **📊 Datos**
  (registros por tipo, instituciones, hojas conectadas, avisos de calidad por tipo, escuelas sin ubicación / sin dirección-directora) ·
  **💻 Este dispositivo** (internet, copia guardada, reclamos guardados, espacio usado, instalada, navegador).
  **Al cambiar de versión: actualizar `VERSION_ESTADO` y las marcas de `ARCHIVOS` en js/estado.js** (si no, avisa de más o de menos).
  sw.js: la página de estado se guarda aparte (no pisa a index.html en la copia sin internet).
- **0.8.4 · Aviso de versión nueva:** la página lee `js/version.js?chequeo=<hora>` (sin caché; el sw.js no lo guarda) a los 8 s, cada 5 min,
  al volver a la pestaña y al volver la señal. Si `VERSION_PAGINA` del servidor es distinta a la que corre: cartel "🔄 Hay una actualización
  (0.8.4 → 0.8.5)" con **Actualizar ahora** (actualiza el sw y recarga) / **Más tarde** (vuelve a avisar en 30 min). Por eso **siempre hay que subir
  `js/version.js` con el número nuevo**. vercel.json: `js/`, `css/` e `index.html` con `Cache-Control: no-cache` (siempre revalidan).
  Solo funciona para quien ya tiene la 0.8.4 abierta: la primera vez hay que recargar a mano.
- **0.8.3 · Orden de la Ficha para visita:** Datos → Resumen → Entregas → Obras → Arreglos → **Reclamos al final** (Imprimir, PDF, Excel y la lista de
  apartados de la ventana). En la ficha de la página los reclamos siguen arriba del detalle.
- **0.8.2 · Período de la Ficha para visita:** Todo · Último mes · 3 meses · 6 meses · 1 año (hacia atrás desde hoy) · **Elegir fechas** (desde/hasta,
  una puede quedar vacía; si están al revés se acomodan) · Lo filtrado en la ficha. Se recuerda (`o.periodo/desde/hasta`). Vale también para el Excel.
- **0.8.1 · Estados que sobreviven al repintado:** "Más datos" (`S.masDatos`, sigue abierto al cambiar de escuela) y reclamos abiertos en el celular (`REC_ABIERTOS`).
- "Cantidad mínima" (Registros) tiene un **"?"** con la explicación (mouse, teclado o toque).
- Un arreglo de un solo trabajo queda como fila suelta (no hay nada que agrupar); en Registros, dentro del día, una escuela con un solo trabajo aparece directo.

## 7. Cosas a tener en cuenta

- En Windows, **no abrir los `.js` con doble clic** (los ejecuta Windows Script Host y da error "window no está definido"): abrir con Bloc de notas o VS Code.
- Obras, HISTORICOENTREGAS y parte de ENTREGAS **solo tienen año**: los filtros por mes/fecha usan la casilla "Incluir registros sin fecha exacta".
- Si Chrome bloquea los ↗, hay que permitir ventanas emergentes para la página.
- Si la página avisa de versiones, el cartel dice cuál quedó atrasado (script o página).

## 8. Registro de cambios de este contexto

- **24/11/2026:** se crea el contexto (página 0.3.0, script 1.1.0).
- **25/11/2026:** regla nueva: este archivo se actualiza y se reentrega con cada cambio que otro Claude necesite saber.
- **25/11/2026:** se saca la sección "Quién soy" y los datos personales.
- **25/11/2026:** pendiente nuevo: mejores filtros en los apartados (propuesta enviada, a elegir).
- **25/11/2026:** el contexto se entrega solo junto con el zip de cada actualización, no en cada mensaje.
- **25/11/2026:** pendiente nuevo: localidades en mayúsculas y unificadas. Se detecta que la página ahora se llama "Ficha Escuelas": pedir el código actual antes de actualizar.
- **25/11/2026:** se recibe el repo actual (v0.4.0 del equipo, "Ficha Escuelas", `escuelas-extra.js`). Pasa a ser la base.
- **25/11/2026:** en consulta: botón "Cómo llegar" (se revisó cómo lo hace SAE Gestión).
- **25/11/2026:** "Cómo llegar" (desde la Municipalidad, con coordenadas) y "Ver en el mapa" pasan a pendientes de la próxima actualización.
- **25/11/2026:** pendiente nuevo: reclamos de cada escuela en la ficha (requiere script 1.2.0).
- **25/11/2026:** reclamos: apartado propio en la ficha, últimos 5/10/20 a elección, sin clave.
- **25/11/2026:** sin gráficos de reclamos. Pendiente nuevo: "Ficha para visita" (imprimir y descargar).
- **25/11/2026:** "Ficha para visita" aprobada: opciones de qué incluir, resumida/completa y hojas numeradas abajo a la izquierda.
- **25/11/2026:** pendiente nuevo: agrupar arreglos del mismo rubro/proveedor/escuela en días seguidos (fila desplegable).
- **25/11/2026:** se entrega la **0.5.0** (página) y el **Apps Script 1.2.0**. Todos los pendientes de esa fecha quedan hechos. Próximo: optimización para celulares.
- **25/11/2026:** pendiente: agrupar solo los arreglos de FACTURACION ITEMS (hoy también agrupa Atmosférico y Canaletas).
- **25/11/2026:** **0.5.1**: se agrupan solo los arreglos de FACTURACION ITEMS. Se entrega el repo completo.
- **25/11/2026:** el contexto va siempre dentro del zip de cada actualización (no suelto).
- **25/11/2026:** pendiente: color propio para los arreglos agrupados.
- **25/11/2026:** pendiente: sacar "Cómo llegar" de la ficha para visita (queda solo la dirección en Datos).
- **25/11/2026:** **0.5.2**: grupos en verde, PDF a color directo, Imprimir en B/N, sin "Cómo llegar" en lo impreso, reclamos precargados.
- **25/11/2026:** pendiente: agrupar arreglos por día (+ rubro + proveedor) con subgrupo por escuela; días separados.
- **25/11/2026:** **0.5.3**: arreglos agrupados por día (+ rubro + proveedor), en Registros con subgrupo por escuela; días separados.
- **25/11/2026:** pendiente: botones de la Ficha para visita sin "blanco y negro"/"a color" y todos en azul oscuro.
- **25/11/2026:** pendiente: agrupar FACTURACION UNIDADES por día (otro color).
- **25/11/2026:** **0.5.4**: FACTURACION UNIDADES agrupado igual que ITEMS en violeta (incluye entregas); botones de la Ficha para visita renombrados y en azul oscuro; día abierto resaltado (claro: naranja suave) y contenido en azul grisáceo. Script sigue 1.2.0.
- **25/11/2026:** pendiente: mostrar el rubro al lado de cada proveedor en los desplegables.
- **25/11/2026:** pendiente: poder tipear el proveedor (lista que igual se despliega para elegir).
- **25/11/2026:** pendiente: día con una sola escuela → sin subgrupo, abre directo los trabajos.
- **25/11/2026:** pendiente: el botón "Más filtros" pasa a "Menos filtros" cuando está abierto. Se explicó "Cantidad mínima" (filtra cada trabajo por su cantidad, no el total del grupo).
- **25/11/2026:** **0.5.5**: Proveedor tipeable con rubro en la lista; día con una sola escuela sin subgrupo; Más/Menos filtros. Script sigue 1.2.0.
- **25/11/2026:** pendiente: "?" con explicación al lado de "Cantidad mínima".
- **25/11/2026:** **0.6.0**: arranca la etapa de celulares (versión concisa: sin gráficos, Excel, proveedor ni planillas; detalle en tarjetas) y "?" en Cantidad mínima. Script sigue 1.2.0.
- **25/11/2026:** pendiente: colores más marcados en modo claro (grupos, día abierto, contenido).
- **25/11/2026:** **0.6.1**: colores más marcados en modo claro. Script sigue 1.2.0.
- **25/11/2026:** pendiente: escuela (subgrupo) y trabajos con colores distintos entre sí en modo claro.
- **25/11/2026:** **0.6.2**: modo claro, dentro del día la escuela va en amarillo y los trabajos en gris. Script sigue 1.2.0.
- **25/11/2026:** **0.7.0** + **Apps Script 1.3.0**: sin internet e instalable, reclamo ↔ arreglo, buscar por cosa, actualización automática cada hora, "Actualizado hace…". De la lista de propuestas se eligieron 4, 5, 7, 9 y 10; las otras (escuelas cerca mío, alertas en la ficha, marca de reclamos en la lista, qué nunca recibió, comparar escuelas, seguridad del repo, montos, Portal) quedan como ideas, no anotadas como pendientes.
- **25/11/2026:** **0.8.0**: celular, segunda etapa (los 11 puntos propuestos, sin botón de mapa en la barra) y la app instalada abre en el Buscador. Script sigue 1.3.0.
- **25/11/2026:** pendiente: "Más datos" se cierra solo una vez al abrir una escuela.
- **26/11/2026:** pendiente: elegir 5/10/20/Todos por sección en la Ficha para visita.
- **26/11/2026:** **0.8.1**: 5/10/20/Todos por apartado en la Ficha para visita (por días si está agrupado); arreglado "Más datos" que se cerraba solo. Script sigue 1.3.0.
- **26/11/2026:** **0.8.2**: Ficha para visita con años anteriores resumidos por categoría y períodos (último mes, 3, 6, 1 año, fechas a mano). Script sigue 1.3.0.
- **26/11/2026:** **0.8.3**: en la Ficha para visita (PDF, impresión y Excel) los reclamos van al final. Script sigue 1.3.0.
- **26/11/2026:** **0.8.4**: cartel de actualización disponible. Se entregó zip completo para no mezclar versiones. Script sigue 1.3.0 (sin cambios).
- **26/11/2026:** pendiente: página Estado del sistema (como la de SAE Reclamos).
- **26/11/2026:** **0.9.0**: página Estado del sistema (archivos, versiones, script, datos, dispositivo). Zip completo. Script sigue 1.3.0.
