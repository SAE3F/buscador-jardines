# Contexto para Claude — Sistema SAE Tres de Febrero

> **Para Claude:** este archivo resume todo lo que se hizo en este proyecto hasta octubre de 2026,
> cómo está armado, qué se decidió y por qué, y cómo trabajar con el equipo. Leelo completo antes
> de proponer o cambiar algo. Si algo de acá no coincide con el código, manda el código: avisalo
> y actualizá este archivo.
>
> **Para el equipo:** para retomar en un chat nuevo, escribí algo como:
> *"Leé docs/CONTEXTO_PARA_CLAUDE.md del repo SAE3F/buscador-jardines y seguimos desde ahí."*
> Si algo falla, abrí **🩺 Estado del sistema** (botón en el Buscador), tocá "Copiar informe" y
> pegalo en el chat.

---

## 1. Qué es y quién lo usa

Página web estática del equipo **SAE (Servicio Alimentario Escolar) de la Municipalidad de Tres de
Febrero** (Argentina). Sirve para:

- **Buscador** (`index.html`, y `mobile.html` en celular): ficha de cada escuela con sus servicios
  (Desayuno/Merienda "DM", Comedor, Refuerzo, DM Maternal…), cupos del día, menú y gramajes por
  proveedor, calculadora de mercadería, PDF y texto para WhatsApp, directorio con exportación a Excel.
- **Reclamos** (`reclamos.html`): carga, búsqueda, seguimiento y tablero ("Resumen") de reclamos.
- **Totales** (`totales.html`): lo que cada proveedor tiene que entregar en un día.
- **Mapa** (`mapa/index.html`): mapa de escuelas con filtros ocultables y ficha de la escuela minimizable/cerrable (Leaflet).
- **Estado del sistema** (`estado.html`): diagnóstico (archivos, script, datos, navegador, prueba de páginas).

Publicada en **Vercel** (buscador-jardines.vercel.app) desde el repo **SAE3F/buscador-jardines** (público).

## 2. Cómo trabaja el equipo (importante)

- Escriben en **español rioplatense (voseo)**. Responder igual, claro y sin tecnicismos innecesarios.
- Quieren **opiniones sinceras y críticas**, no aprobación: si una idea es mala o hay algo mejor,
  decirlo, y buscarle el lado malo a las propias propuestas.
- **"Luz verde":** cuando piden opinión o hacen preguntas, **responder primero y no tocar nada**
  hasta que digan "luz verde" (o "hacelo"). Para cambios chicos y claros, se puede hacer directo.
- **No tienen consola ni git.** Suben archivos desde la web de GitHub
  (*Add file → Upload files* en la raíz del repo) y a veces usan github.dev para borrar.
  Por eso los cambios se entregan en un **.zip con las carpetas tal cual** (`js/…`, `css/…`,
  `mapa/…`) para arrastrar desde la **raíz** del repo. Prefieren **un solo zip acumulado** en vez
  de varios. **Los zips se nombran por lo que traen** (ej. `SAE_flechas_buscadores.zip`), **sin número
  de entrega** (lo pidió el equipo).
- Claude **no tiene permiso para hacer push** al repo: solo lo lee (clonándolo) para revisar.
- El Apps Script lo pegan a mano (Extensiones → Apps Script) y reimplementan
  (Implementar → Administrar implementaciones → ✏️ → Nueva versión).
- Hoy trabajan con una **hoja de PRUEBA**. Más adelante pasan a la hoja original (ver §8).

### Errores que ya pasaron al subir (para prevenir)
- Se subió el **contenido** de la carpeta `mapa` en la raíz en vez de la carpeta: el `index.html`
  y `js/app.js` de la raíz quedaron reemplazados por los del mapa (página en blanco) y quedaron
  archivos sueltos (`js/data_escuelas.js`, `js/datos-buscador.js`, `js/mapa-filtros.js`).
- Un archivo del zip no se subió (quedó `estado.html` viejo con `js/estado.js` nuevo) y la página
  se colgaba. `js/estado.js` ahora tolera eso.
- Un archivo tenía caracteres de control (`\b` convertido en "backspace") y la sugerencia de
  clasificación no reconocía "gas", "cocina", "luz"… Estado del sistema lo detecta.
→ **Estado del sistema** revisa todo esto: archivos faltantes, viejos ("marcas" de versión),
sobrantes y dañados.

## 3. Arquitectura

Todo es HTML/CSS/JS sin compilación. Los datos vienen de dos lados:

1. **Archivos del repo** (respaldo, funcionan sin conexión): `datos/data.js` (escuelas, servicios y
   cupos), `datos/menus.js` (menús y gramajes), `datos/cupos-historicos.js` (cupos promedio
   2023/2025 por proveedor), `mapa/data_escuelas.js` (coordenadas).
2. **Google Sheets a través de un Apps Script** (`apps-script/Codigo.gs`, versión **12**):
   - Pestaña **Reclamos**: en la planilla donde está pegado el script (hoy "HOJA RECLAMOS", de
     prueba), por GID (`GID_RECLAMOS`) con respaldo por nombre "Reclamos".
   - **Cupos**: con `CUPOS_DE_PRUEBA = true` se leen **y se escriben** en la pestaña "Copia de CUPOS 2026"
     (planilla HOJA RECLAMOS `12sgNZ…`, gid 1805940174). Con `false`, en **CUPOS 2026** del
     "SAE | Tablero Gestión" (`ID_TABLERO`).
   - Planilla de menús "2026 JM y Dispositivos" (pestañas en `HOJAS_MENUS`).
   - Acciones GET: `ping`, `datos` (cupos comprimidos + menús + **límites por proveedor**, caché
     10 min), `listar` y `compacto` (reclamos desde un año, caché 5 min que se invalida al
     cargar/modificar), `historico` (años anteriores resumidos, caché 6 h), **`avisos`** (v11: reclamos
     AVISO de ayer a +4 días). POST: `agregar`, `actualizar` (v10: una sola escritura),
     **`cupoPrevia` / `cupoGuardar`** (v11: cambiar un cupo; ver §4 "Cupos"), **`actualizarVarios`**
     (v12: varios cambios de seguimiento en un pedido, cada uno con su control de huella; lee las
     filas de una vez). `actualizar` acepta `cambios.fechaResolucion` ("dd/mm/aa" o vacío) para deshacer.
   - **Clave del equipo**: propiedad `CLAVE` del script. Se pide para leer y escribir. En el
     navegador se guarda en `localStorage` (`sae-reclamos-clave`).
   - El link del script está en `datos/reclamos-config.js` (`urlScript`).

`js/sync.js` (SAE_SYNC) trae cupos y menús de la hoja (cada 10 min como mucho), une escuelas
duplicadas (tabla `DUPLICADOS`) y protege contra hojas incompletas (si llega <50% de filas, no
las usa).

### Mapa de archivos
| Archivo | Qué hace |
|---|---|
| `index.html` + `js/app.js` | Buscador de escritorio, directorio, PDF, WhatsApp |
| `mobile.html` + `js/mobile.js` | Buscador para celular |
| `js/extras.js` | Feriados, limpieza de pseudo-escuelas, PDF |
| `js/sync.js` | Sincronización con la hoja (SAE_SYNC) |
| `js/navegacion.js` + `css/navegacion.css` | Barra entre páginas (en el encabezado; abajo en celular) |
| `reclamos.html` + `js/reclamos.js` | Reclamos: formulario, buscar, seguimiento, Resumen |
| `js/reclamos-clasificacion.js` | Listas (categorías, motivos, problemas) y el **ASISTENTE** que sugiere la clasificación |
| `js/reclamos-graficos.js` | Gráficos SVG del Resumen (barras, líneas, dona) |
| `js/excel.js` | Arma .xlsx con formato sin librerías (SAE_EXCEL) |
| `js/impresion.js` | Cuadro "¿Color o blanco y negro?" antes de imprimir o bajar el PDF (SAE_IMPRESION) |
| `totales.html` + `js/totales.js` | Totales por proveedor |
| `estado.html` + `js/estado.js` | Estado del sistema |
| `js/avisos.js` | Cartel "📣 Avisos próximos" y pastilla en la barra (SAE_AVISOS) |
| `js/cupos.js` | Franja de cupos por proveedor, ventana "Cambiar cupo" y botón 👁 de la clave (SAE_CUPOS) |
| `mapa/…` | Mapa (usa `../datos/data.js` y `../js/sync.js` para tener los mismos cupos) |
| `apps-script/Codigo.gs` | Copia del script (lo que vale es lo pegado en Apps Script) |
| `docs/INSTRUCCIONES_RECLAMOS.md` | Instrucciones de reclamos y novedades |

**Versión de la página (21/10):** `js/navegacion.js` tiene `const VERSION = 'AAAA-MM-DD HH:MM'` y en la
raíz está `version.json` con el mismo texto. Se muestra chiquita al pie ("versión de la página: 21/10
14:35", menos en el mapa) y, si `version.json` publicado es más nuevo que lo cargado, aparece arriba
"🔄 Hay una versión nueva… [Actualizar]" (se revisa al abrir y cada 10 min). Estado del sistema compara
las dos. **En cada entrega hay que actualizar los dos (`VERSION` y `version.json`) y meterlos en el zip**,
y decirle al equipo qué versión tiene que ver al pie.

Cada página tiene en el `<head>` un pequeño script que anota errores en `window.__saeErrores`
(lo lee la prueba de páginas de Estado del sistema).

## 4. Reglas y decisiones acordadas (con su porqué)

### Escuelas
- "JI 913/918/923 MATERNAL" se unen a su jardín; "CENTRO INFANTO JUVENIL ESPERANZA" se muestra como
  "CENTRO EDUCATIVO ESPERANZA" (alias interno). "JM ARDILLITAS TRAVIESAS" = "JM ARDILLITAS".
- "TODAS LAS…/TODOS LOS…" y "MEDIDA DE ABRIGO" no son escuelas: no se muestran en el buscador
  (sí existen como destinatarios en Reclamos).

### Menús
- DM con **gramajes por proveedor** (hoja "DM GR AGOSTO" de 2026_PRESTACIONES_PBA): GRUPO L y GYULAND.
- DM Maternal con tablas por **edad** (1–2 años y 7–12 meses), elegible por escuela.
- "c/n" (cantidad necesaria) se deja así, sin número.

### Reclamos — Resumen (tablero)
- Comparación por **mes, trimestre o año** (sin semanas). Reglas automáticas: **enero y febrero**
  contra el mismo mes del año anterior; **marzo contra diciembre**; **1.er trimestre** contra el del
  año anterior; julio normal. Si el período está en curso, se compara "a la misma altura".
- Tasas **cada 100 y cada 1.000 cupos** (no cada 10: se descartó por innecesario).
- Reclamos **hasta 2025 se muestran como Resuelto** sin modificar la hoja (`ANIO_CIERRE_RESUELTOS`).
- Fechas inválidas (fuera de 2015…hoy+60 días) se excluyen salvo que se tilde la opción.
- Carga por año (año actual y anterior completos; años previos resumidos con `historico`).
- Tarjetas ocultables; informe imprimible A4; Excel; **Excel por proveedor** (una pestaña por proveedor).
- **Reincidentes**: reclamos en **5 o más de los últimos 6 meses de clase** (sin enero/febrero).
  Con 3 o 4 entraba casi la mitad de las escuelas.
- **Tiempo de resolución**: días entre fecha del reclamo y "Fecha resolución" (se completa sola al
  marcar Resuelto desde la página). Promedio, mediana, % en ≤7 días.

### Reclamos — carga y seguimiento
- Cambiar estado es **instantáneo** (se actualiza en pantalla y se envía en segundo plano; si falla,
  queda arriba con Reintentar/Descartar).
- **Estancados**: Pendiente/En gestión hace más de 3/7/15/30 días (elegible). Los de este año con
  ESTADO vacío no cuentan (se avisa cuántos son).
- **Duplicados**: el aviso aparece **recién al elegir la categoría**, si la misma escuela tiene un
  reclamo de esa categoría a **±1 día (Alimentos)** o **±5 días (resto)**. Se cierra con ✕. Si
  coincide el motivo, al guardar pide confirmación (no bloquea).
- Al elegir la escuela: recuadro "📌 Tiene N reclamos sin resolver" (cerrable).
- **Globos** en Buscar (21/10): el mismo reclamo en **5 o más escuelas** (primero eran 10; el equipo lo bajó a 5) (misma fecha, categoría,
  motivo, texto de "¿Qué pasó?" sin mayúsculas, y **mismo proveedor**: un globo por proveedor) se
  muestra en una sola tarjeta resaltada "📦 N escuelas" con conteo por estado. "Ver las N escuelas"
  despliega la lista con casillas; "Cambiar las N a:" / "Cambiar las marcadas a:" + Pendiente / En
  gestión / Resuelto (pide confirmar; los que ya están en ese estado no se tocan). Se envían de a uno
  por la cola (49 tardan ~1 min, en segundo plano). Agrupa también los viejos (cargados a mano).
  Es solo visual: conteos, filtros, Resumen y Excel siguen por escuela. En "Revisar datos" no se agrupa.
  Con script v12 los cambios en cola se mandan **en un solo pedido** (`actualizarVarios`, hasta 200);
  con uno anterior, de a uno (si responde "Acción desconocida" se pasa solo a uno por uno).
- **Deshacer**: después de cambiar estado/seguimiento (uno o un globo) aparece abajo a la izquierda un
  botón chico "↩ Deshacer" por 20 s (o Ctrl+Z fuera de un campo). Vuelve estado, responsable, acciones y
  (v12) la fecha de resolución anteriores.
- **Duplicados**: "Varias escuelas" saltea (y avisa) las escuelas que ya tienen el mismo reclamo
  (misma escuela, día, categoría, motivo y texto; también los que esperan en la cola). En "🧹 Revisar
  datos" hay un tipo **Duplicado** ("Duplicado de la fila N"). No cuentan: categoría CUPOS, motivos
  ESPECIALES (una fila por chico), "TODAS LAS/TODOS LOS…", "MEDIDA DE ABRIGO" ni "ESCUELA". En la hoja de
  prueba quedan 14 reales desde 2025 (ej. EP 07 del 20/10, filas 10754 y 10796).
- **Controles**: no deja guardar fecha futura (salvo en Avisos), anterior a 2015 o cantidades negativas; avisa (y pide
  confirmar) si la fecha es de hace >30 días o el cupo afectado supera el total ("raciones o
  unidades": puede estar bien).
- **Sugerencia de clasificación** (ASISTENTE, reglas por palabras clave armadas con ~10.800
  reclamos reales): acierta la categoría en ~85% (antes 50%). Mantenimiento 93%, Cupos 90%,
  Avisos 71%, Alimentos 97%. Para mantenimiento usa el preciario de "Facturación SAE 2026"
  (gas, plomería, electricidad, refrigeración, desagües, canaletas). Si piden algo nuevo →
  Equipamiento; si hay que arreglarlo → Mantenimiento. Si habla de menú/comida sin pedir arreglo
  ("sin gas, pasar a chocolatada") es Aviso, no Mantenimiento.
- Motivos nuevos (2026): Mantenimiento → PLOMERIA, ELECTRICIDAD, DESAGUES, CANALETAS;
  Equipamiento → ELECTRODOMESTICOS. Columna PROBLEMA ahora también para mantenimiento/equipamiento.

### Avisos próximos (cartel)
- Reclamos de categoría **AVISO** con fecha de **hoy a 2 días** (incluye el día del aviso; al día
  siguiente se borra). Se muestran todos, agrupados por día (6 visibles + "ver los restantes").
- Cartel arriba al entrar en **Buscador** (`index`/`mobile`) y **Reclamos** (en Totales y Mapa no).
  **Ocultar** lo saca; queda oculto al moverse entre páginas (sessionStorage `sae-avisos-oculto`);
  **F5** o una pestaña nueva lo vuelven a abrir (pedido del equipo: por si lo ocultaron sin querer).
- La **pastilla "📣 N avisos"** de la barra (en todas las páginas) abre un **panel desplegable**
  pegado a ella (`#saeAvisosPanel`, fijo; en el celular se abre hacia arriba desde la barra de
  abajo), así se leen desde cualquier parte de la página sin subir. Se cierra con la pastilla,
  la ✕, Esc o clic afuera (21/10, elegido por el equipo en vez de "solo pastilla").
- Datos: acción `avisos` (v11, caché del navegador 5 min `sae-avisos-v1`); con script viejo usa la
  lista de Reclamos guardada o `compacto`. Reclamos le pasa la lista al cargar o guardar un aviso.
- En el formulario, solo la categoría **Aviso** admite **fecha futura** (más de 60 días pide confirmar).

### Cupos (franja y cambios)
- **Franja** arriba en Buscador (escritorio y celular) y Reclamos: por proveedor con límite
  (hoy Gyuland y Grupo L), DM y Comedor (y Bolsón si se carga), "actual / límite" con barrita
  (ámbar ≥95%, roja si pasa). Se puede achicar (se recuerda).
- El **actual lo calcula el script**: suma de los cupos de las escuelas el **último día cargado**
  (último día con cupo en al menos la mitad de las escuelas: un número suelto adelantado no cuenta).
  **DM = todo servicio con "DM" menos LC DM** (DM, DM MATERNAL, DM JARDINES, DM DISPOSITIVOS) y
  **Comedor = todo "COMEDOR"/"CM"** (decisión del equipo). La fila ACTUAL de la hoja está escrita a
  mano y suele estar desactualizada: si difiere se muestra al lado "(hoja: N)". **LC DM no entra**
  (21/10, lo confirmó el equipo: el LC DM de la EES 02, 1.000, hacía pasar a Gyuland de su límite).
- **Cambiar cupo**: botón "✏️ Cambiar" en cada servicio de la ficha (buscador de escritorio). Se elige
  servicio, nuevo cupo y "desde el día". Escribe en ese día y en **los días siguientes ya cargados
  hasta el último día cargado**; no toca días vacíos (feriados). Si el día elegido es feriado/fin de
  semana, rige desde el siguiente día cargado; si es posterior al último cargado, escribe solo ese día.
  Celdas con **fórmula o texto** ("43 (1 DIABETICO)", `=75*2`) se avisan y **solo se pisan si se
  tilda**. Muestra cómo queda el proveedor contra su límite. Control de concurrencia (`antes`).
  Cada cambio queda en la pestaña **CAMBIOS CUPOS** (se crea sola). Pide la clave de reclamos.
  No toca las columnas de meses del final (febrero…diciembre).

### Exportaciones
- Todas en **Excel (.xlsx)** con formato (título, filtros, encabezado fijo, colores de estado),
  generado por `js/excel.js`. El CSV se abandonó porque en Excel en español quedaba en una columna.

## 5. Datos sensibles (pendiente de decisión)
- `datos/data.js` tiene **nombre de directora y teléfono de ~171 escuelas** y es público (repo y
  página). Se propuso pasarlos a la hoja y servirlos solo con la clave + repo privado. El equipo
  lo **dejó para más adelante**. El Excel del Directorio los incluye.
- El repo es público: **no guardar teléfonos, mails personales, CUIT ni montos** en archivos nuevos.
  (Por eso de la planilla de facturación solo se usaron las descripciones de trabajos.)

## 6. Cómo probar cambios (lo que hace Claude)
- Se trabaja sobre una copia; se prueba con **Playwright** (Chromium) sirviendo la carpeta en local
  y **simulando el script de Google** (rutas a `script.google.com`) con datos reales exportados del
  Tablero. Leaflet se reemplaza por un stub si no hay internet.
- La sugerencia de clasificación se mide contra los reclamos reales (categoría y categoría+motivo)
  antes y después de cada cambio; no aceptar cambios que empeoren Alimentos.
- Revisar escritorio y celular (390 px), modo claro y oscuro, sin scroll horizontal.
- Para el script hay un **simulador de Apps Script en Node** (SpreadsheetApp, CacheService, etc.
  sobre los datos de la hoja de prueba exportada) que corre el `Codigo.gs` real; se usa también como
  servidor para las pruebas de punta a punta (avisos, franja, cambiar cupo).
- Después de que el equipo sube, **Estado del sistema** debería salir en verde.

## 7. Historial resumido (oct. 2026)
Reorganización en carpetas · modo oscuro del mapa · unificación de escuelas · corrección general ·
gramajes DM por proveedor y Maternal por edad · tablero de reclamos (Resumen) con comparaciones ·
navegación entre páginas · optimización de carga (caché, datos comprimidos) · mapa con filtros
ocultables y más liviano en celular · estancados, duplicados, reincidentes · cambio de estado
instantáneo (script v10) · exportaciones a Excel · tiempo de resolución y controles al cargar ·
sugerencia ampliada (mantenimiento, cupos, avisos) · reclamos abiertos por escuela · Excel por
proveedor · Estado del sistema con prueba de páginas (lo básico en segundos, páginas con botón aparte, compartir por WhatsApp) · (20/10) en el gráfico de evolución cada año agregado tiene su color fijo y su rótulo (2021 verde, 2022 violeta, 2023 rosa, 2024 ocre, 2025 turquesa si no es la comparación) y 2021 no muestra ceros antes de julio · **mismo reclamo para varias escuelas** (Nuevo reclamo → "➕ Cargar el mismo reclamo para varias escuelas": se agregan escuelas sueltas o grupos por proveedor/tipo/zona/todas; crea un reclamo por escuela con su proveedor y cupo; se guardan de a uno en la cola) · **🧹 Revisar datos** en Buscar (sin estado, fecha inválida, escuela desconocida, sin proveedor, sin categoría/motivo, sin servicio; muestra la fila) · en Buscar, botón **⇅ Más nuevos / Más viejos primero** (se recuerda; sin elección, los estancados van del más viejo; los sin fecha siempre al final) · al imprimir (informe del Resumen, Totales, ficha del buscador) o bajar la ficha en PDF se elige **color o blanco y negro** (`js/impresion.js`; en ByN todo gris y las líneas de cada año con distinto trazo; se recuerda la última elección) · ficha de escuela del mapa con botones minimizar (se recuerda) y cerrar (✕ o Esc; cerrada no se reabre al pasar el mouse, sí al hacer clic) · en el buscador ya no queda un cuadrado azul vacío abajo a la derecha (era el aviso `#toastMessage` visible sin texto; `css/styles.css` lo oculta si está vacío) · **(20/10) script v11**: cartel de **avisos próximos**, **franja de cupos** por proveedor (límite vs actual), **cambiar cupo** desde la ficha con registro en CAMBIOS CUPOS (en la copia de prueba), avisos con fecha futura, botón 👁 para ver la clave · (21/10) LC DM ya no suma en el DM de la franja · **flechas ↑ ↓ + Enter (y Esc) en todas las listas de búsqueda** (buscador escritorio y celular, varias escuelas en Reclamos, buscadores de los filtros del mapa; helper `SAE_TECLADO.lista` en `js/navegacion.js`, marca `.sae-tecla-activo` en `css/navegacion.css`; Enter sin marcar elige la primera) · en el mapa, hacer clic dentro de un filtro desplegable ya no lo cierra · **✉️ Enviar Mail** de la ficha abre **Gmail en el navegador** (pestaña nueva, destinatario y asunto completos) en vez de `mailto:` (no tienen programa de correo) · **(21/10, script v12)** cambios de los globos en un solo envío, botón **↩ Deshacer** (20 s / Ctrl+Z), **duplicados** (Varias escuelas los saltea; tipo Duplicado en Revisar datos), **marca de versión** al pie + aviso de versión nueva (`version.json`) · la pastilla de avisos abre un **panel desplegable** visible desde cualquier parte de la página · en Nuevo reclamo, **tocar de nuevo la categoría o el motivo elegido lo deselecciona** (el estado no, siempre tiene uno) · instructivo "Cambio de año" (documento
aparte en la cuenta original de Claude; conviene tener una copia descargada).

## 8. Pendientes
- **Pasar a la hoja original**: cambiar `GID_RECLAMOS` en el Apps Script y, si cambia la
  implementación, `urlScript` en `datos/reclamos-config.js`. Agregar a la lista desplegable de
  "Subcategoria" los motivos nuevos (PLOMERIA, ELECTRICIDAD, DESAGUES, CANALETAS, ELECTRODOMESTICOS).
- **Actualizar el Apps Script a la versión 12** si Estado del sistema muestra una anterior.
- **Pasar los cupos al Tablero real**: cuando terminen de probar, `CUPOS_DE_PRUEBA = false` en el
  script y reimplementar. Antes, confirmar que el bloque LÍMITE/ACTUAL del Tablero esté igual que en la
  copia.
- **Copia de seguridad semanal** de la planilla (Apps Script con activador): aprobada en idea, para
  cuando usen la hoja original.
- **Contactos públicos** en `datos/data.js` (ver §5).
- **Cambio de año (2027)**: seguir el instructivo "Cambio de año – Sistema SAE" (CUPOS 2027,
  `ANIO_CIERRE_RESUELTOS`, cupos históricos, etc.).
- Ideas descartadas o en espera: login por usuario, notificaciones, funcionar sin internet, mail
  automático mensual (no aportan para el tamaño del equipo); "quién cargó cada reclamo" y "mensaje
  para el proveedor" quedaron como opcionales.
