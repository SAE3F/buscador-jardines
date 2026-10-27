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
2. **Google Sheets a través de un Apps Script** (`apps-script/Codigo.gs`, versión **14**):
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
     **`reclasificar`** (v14): cambia TIPO, CATEGORIA y Subcategoria (col. 5–7) de varias filas con control de
     huella; si cambia la categoría, le pone a la celda de Subcategoria el desplegable de la categoría nueva.
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

**Numeración (pedido del equipo, 21/10):** la versión de la página es **1.0.x** (la actual es la
que dice `VERSION` en `js/navegacion.js`; la primera con número fue la **1.0.1**, 21/10):
arreglos o agregados chicos suman el último número (1.0 → 1.0.1 → 1.0.2…); algo nuevo o un cambio
interesante sube el del medio y reinicia el último (1.0.5 → 1.1.0). La entrega del 21/10 14:35 cuenta
como la 1.0. Al pasar a número hay que comparar versiones por partes (1.0.10 > 1.0.9), no como texto, y
tratar las viejas con fecha como anteriores a 1.0. El **2.0** queda reservado para un salto grande: pasar de la hoja de prueba a la hoja original.

**Versión de la página (21/10):** `js/navegacion.js` tiene `const VERSION = '1.0.1'` (y `compararVersiones`) y en la
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
- **Cola de envíos**: si un reclamo ya tiene un cambio esperando o con error y se lo vuelve a cambiar,
  se reemplaza (se juntan los cambios), así no se apilan pedidos repetidos. Con más de 3 errores se
  muestra un resumen con **Reintentar todos / Descartar todos / Ver detalle**.
- **Desplegable de ESTADO en la hoja de prueba**: tiene una regla "Solo pendiente o resuelto" que no
  admite "En gestión". Google avisa recién al confirmar la escritura, y en el lote (v12) eso hacía fallar
  a los reclamos siguientes ("Solo pendiente o resuelto"; en uno solo, se perdía en silencio). El script
  **v13** confirma cada fila (`SpreadsheetApp.flush()`) y, si el desplegable lo rechaza, escribe igual
  (saca la regla de esa celda y la vuelve a poner). Recomendado al equipo: agregar "En gestión" a la regla.
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
- **"Otros" (1.1.0, 22/10)** — análisis de 2.999 reclamos en "Otros" (doc "Reclamos en Otros: análisis y
  propuesta"). Decidido por el equipo:
  - **Renombres** (solo en la página; en la hoja sigue `OTROS`): Cupos › Otros = **Cambio de cupo**;
    Reemplazos C/A › Otros = **Producto**. `etqMotivo(motivo, categoria)` da el nombre según la categoría.
  - **Motivos nuevos**: Aviso › `PARO` (Paro / sin clases: paro, cerrado, sin clases, asueto, jornada,
    desinfección; **aunque pidan cancelar**), Aviso › `CALENDARIO` (inicio/fin de ciclo, receso, último día,
    cupo al 50 %), Alimentos › `ENTREGA EQUIVOCADA` (de más, de otra escuela, prestación que no tiene),
    Alimentos › `REPARTO` (queja por el chofer o la descarga; **distinto de Aviso › Logística**, que es una
    indicación de la escuela), Cupos › `BOLSON` (bolsón, cajas, mensual). Otros › Personal = personal de la escuela.
  - **Hoja**: los desplegables de Subcategoria salen de la pestaña **"Lista"** (una columna por categoría,
    filas 3–11). Ahí se agregaron los motivos nuevos y los de mantenimiento/equipamiento (22/10, por el
    conector de Google Sheets). Para agregar uno: escribirlo en la columna de su categoría.
  - **Sugeridor**: reglas nuevas para todo eso; categoría 81,6 % → 82,9 % sobre ~10.800 reales (Alimentos
    96,8 → 97,2). Muchas "Cancelación" viejas pasan a sugerirse como Paro (decisión del equipo).
  - **Reclasificar**: en "🧹 Revisar datos" → "✨ Mejor clasificación", desde **2023** (para 2023–2024 hay que
    cargar los años anteriores; la página lo ofrece). Candidatos: Otros de cualquier categoría, Cancelación →
    Paro/Calendario, Otros › Personal → Reparto. **Seguras** (se aplican juntas con un botón, pidiendo
    confirmación): motivos nuevos y Viandas, o misma categoría hacia Cancelación, Logística, Especiales Alta/Baja,
    o dentro de Mantenimiento/Equipamiento. El resto queda **para revisar** (Aplicar / Descartar por reclamo;
    descartadas en LS `sae-reclasif-descartadas`). Con la hoja de prueba: 1.288 candidatos desde 2023, 1.054
    seguros. Se envían por la cola (`reclasificar`, hasta 200 por pedido) y se pueden deshacer.

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
proveedor · Estado del sistema con prueba de páginas (lo básico en segundos, páginas con botón aparte, compartir por WhatsApp) · (20/10) en el gráfico de evolución cada año agregado tiene su color fijo y su rótulo (2021 verde, 2022 violeta, 2023 rosa, 2024 ocre, 2025 turquesa si no es la comparación) y 2021 no muestra ceros antes de julio · **mismo reclamo para varias escuelas** (Nuevo reclamo → "➕ Cargar el mismo reclamo para varias escuelas": se agregan escuelas sueltas o grupos por proveedor/tipo/zona/todas; crea un reclamo por escuela con su proveedor y cupo; se guardan de a uno en la cola) · **🧹 Revisar datos** en Buscar (sin estado, fecha inválida, escuela desconocida, sin proveedor, sin categoría/motivo, sin servicio; muestra la fila) · en Buscar, botón **⇅ Más nuevos / Más viejos primero** (se recuerda; sin elección, los estancados van del más viejo; los sin fecha siempre al final) · al imprimir (informe del Resumen, Totales, ficha del buscador) o bajar la ficha en PDF se elige **color o blanco y negro** (`js/impresion.js`; en ByN todo gris y las líneas de cada año con distinto trazo; se recuerda la última elección) · ficha de escuela del mapa con botones minimizar (se recuerda) y cerrar (✕ o Esc; cerrada no se reabre al pasar el mouse, sí al hacer clic) · en el buscador ya no queda un cuadrado azul vacío abajo a la derecha (era el aviso `#toastMessage` visible sin texto; `css/styles.css` lo oculta si está vacío) · **(20/10) script v11**: cartel de **avisos próximos**, **franja de cupos** por proveedor (límite vs actual), **cambiar cupo** desde la ficha con registro en CAMBIOS CUPOS (en la copia de prueba), avisos con fecha futura, botón 👁 para ver la clave · (21/10) LC DM ya no suma en el DM de la franja · **flechas ↑ ↓ + Enter (y Esc) en todas las listas de búsqueda** (buscador escritorio y celular, varias escuelas en Reclamos, buscadores de los filtros del mapa; helper `SAE_TECLADO.lista` en `js/navegacion.js`, marca `.sae-tecla-activo` en `css/navegacion.css`; Enter sin marcar elige la primera) · en el mapa, hacer clic dentro de un filtro desplegable ya no lo cierra · **✉️ Enviar Mail** de la ficha abre **Gmail en el navegador** (pestaña nueva, destinatario y asunto completos) en vez de `mailto:` (no tienen programa de correo) · **2.0.1** (27/10): la página principal es **Reclamos**: `vercel.json` redirige `/` a `/reclamos.html` (redirección temporal, no permanente). El Buscador sigue en `index.html` (y en el celular `index.html` pasa a `mobile.html`) · · **2.0.0** (22/10): **PASO A LA HOJA ORIGINAL**. Script **v20**: `ID_PLANILLA_RECLAMOS` = Tablero (1P57PeQ8WeLJbEovcGNKsT-4K_2AmCXpWF1W-MrwYShQ), `GID_RECLAMOS = 1684360253` (pestaña "Reclamos" del Tablero), `CUPOS_DE_PRUEBA = false` (CUPOS 2026 gid 2065492594). El script sigue pegado en HOJA RECLAMOS (opción A: mismo link y clave) y abre el Tablero con `openById` — **no borrar HOJA RECLAMOS**. `obtenerHoja_` agrega las columnas P/Q (PROBLEMA, PATOLOGÍA) si la pestaña tiene menos de 17. Cachés y propiedades con nombres nuevos (`c20_`, `hist_v20_`, `listas_v20`, `ULTIMA_FILA_V20`). "CAMBIOS CUPOS" se crea en el Tablero con formato (`darFormatoCambiosCupos_`: encabezado azul, anchos, fechas reales dd/mm/aaaa, filas alternadas, filtro; una sola vez por pestaña). La página 2.0.0 borra una vez por navegador lo guardado de la prueba (`sae-hoja-en-uso` en navegacion.js). Desplegables de la hoja original: FECHA fecha válida estricta; ESCUELA `=Utilidades!$B:$B` estricto; PROVEEDOR lista estricta (GRUPO L, GYULAND, TEYLEM, VALBER, SURMARKET, EDEAL, TINTENFISCH, PAN JPAZ); SERVICIO lista estricta; TIPO diaria/Estructural; CATEGORIA `=Lista!$A$1:$H$1`; Subcategoria no estricto; PRODUCTO lista estricta (sin CACAO); ESTADO estricto Pendiente/Resuelto/vacío (sin "En gestión"); Responsable estricto Consejo/Muni (la página ofrece Muni/Proveedor/Escuela). La hoja de prueba (HOJA RECLAMOS) queda como estaba · · **1.4.0** (22/10): **varias escuelas sin proveedor**: ventana `elegirProveedoresFaltantes` con un desplegable por escuela (o "Saltear"), tildes + "Aplicar a las marcadas" para poner el mismo a varias (`guardarMulti(d, asignados)`) · **EET 01 (CATDI)**: tipo Especial, DM de GRUPO L, cupos en 0, alias "CATDI" (en la hoja de cupos figura como CATDI); se borró la escuela "CATDI" de data.js; `CUPOS_EN_CERO` en sync.js hace que al sincronizar no tome los números de la hoja (solo servicio y proveedor); el mapa la empareja (`datos-buscador.js`). TEYLEM = Grupo L (no es otro proveedor) · **Resumen solo con alimentos**: interruptor "Solo alimentos / Todo" (`res.soloAlimentos`, localStorage `sae-res-alcance`, arranca en alimentos); en `pasaFiltros` cuenta solo categoría ALIMENTOS (Reemplazos C/A no); con "Todo" vuelve el filtro de categoría. Se sacó "Tiempo de resolución" (tarjeta, Excel del resumen, columna "Días promedio para resolver" y "Días para resolver" del Excel por proveedor). El Excel por proveedor sigue al interruptor. Buscar y la hoja no cambian (se cargan y listan todos) · · **1.3.0** (22/10): **cupo por un tiempo** (ventana de cambiar cupo: "¿Hasta cuándo?" Sin fecha / Solo ese día / Hasta el día…; script **v19** `cambiarCupo_` con `hasta` = 'mismoDia' o fecha; después de esa fecha no se toca nada; CAMBIOS CUPOS suma columnas 12 "Por un tiempo: hasta" y 13 "Después vuelve a"; `avisosCupos_` agrega al cartel de avisos un aviso `tipo:'cupo'` el día siguiente al "hasta" — en avisos.js se conservan aparte (`avisosCupo`) porque Reclamos reemplaza la lista con `desdeReclamos`) · **colores de proveedor** del mapa en todas las páginas (`SAE_PROV.color/punto` en navegacion.js: Grupo L #f59e0b, Gyuland #0099da, Edeal #059669, Tintenfisch #7c3aed; puntito en ficha, franja de cupos, lista/globos/resumen de Reclamos, Totales; barras del gráfico por proveedor y de Totales con su color) · **logo 3F** como ícono de pestaña en todas las páginas (`mapa/assets/logo_3f_chico.png`; el del buscador estaba mal escrito y salía el globito) · Imprimir Ficha con el mismo estilo que los otros botones · **link al Mapa**: desde Buscador/Mapa con la ficha abierta (como antes), desde Reclamos con la escuela del formulario si es una sola (`SAE_NAV.escuelaParaMapa`), desde Totales/Estado el mapa completo; el link al Buscador no cambió · varias escuelas: las que no tienen proveedor para el servicio se nombran y se elige saltearlas o elegir el proveedor a mano · **Estado del sistema**: Envíos pendientes (cola de esta compu, con Reintentar), Chequeo de la hoja (acción `diagnostico` v19: planilla/pestaña/GID, cupos prueba o real, último día cargado, escuelas repetidas en cupos, pestaña Lista vs `CLASIFICACION`, último guardado en reclamos y último cambio de cupo), Datos del buscador (servicios sin proveedor, escuelas sin servicios), Últimos errores de cualquier página (`SAE_ERRORES`, localStorage `sae-errores`, últimos 30), el informe copiado incluye todo · · **1.2.1** (22/10): reclasificar seguía dando "Haz clic e introduce un valor del intervalo" con muchos a la vez. En la hoja real TIPO (lista diaria/Estructural) y CATEGORIA (`=Lista!$A$1:$H$1`) son **estrictos**; Subcategoria NO (el arreglo de la v16 apuntaba a la columna equivocada). Script **v18**: cada fila se escribe como `agregar_` (sin desplegables en E:G → valores → se vuelven a poner los mismos, leídos de una vez con `getDataValidations`; el de Subcategoria, el de la categoría nueva), un solo flush; antes controla tipo (diaria/Estructural) y categoría (fila 1 de Lista) · **1.2.0** (22/10): **cola de envíos persistente** (`js/cola-envios.js`, `window.SAE_COLA`, cargado en todas las páginas después de `reclamos-config.js`): todo lo que va a la hoja (agregar, actualizar, reclasificar) se guarda en localStorage `sae-cola-envios` y se sigue enviando desde cualquier página (Buscador, Totales, Mapa, Estado) con una **pastilla** abajo a la izquierda; al cerrar/recargar, sigue al volver. Una sola pestaña envía a la vez (`navigator.locks`, candado `sae-cola-envios`; lo que quedó "enviando" se reintenta). Eventos `sae-cola` y `sae-cola-resultados` (también por BroadcastChannel `sae-cola`). Ítems serializables: `{id, tipo, estado, error, datos, pedido, antes}` (`antes` = columnas a restaurar al Descartar); `superponerPendientes()` muestra los cambios pendientes al leer la hoja. Script **v17**: `agregar` con `idEnvio` (CacheService `envio_<id>`, 6 h) no repite filas. **Borrador del formulario** (`sae-borrador-reclamo` en sessionStorage + localStorage, vence al cambiar el día): `restaurarBorrador`, aviso "Recuperamos el reclamo…" con **Empezar de cero** · · **1.1.2** (22/10): reclasificar daba "Haz clic e introduce un valor del intervalo" en filas viejas con un desplegable de Subcategoria estricto y más corto. Script **v16**: pone el desplegable de la categoría (Lista, filas 3–11, permite inválidos) antes de escribir también cuando cambia solo el motivo; último recurso: saca los desplegables de las 3 celdas, escribe y los vuelve a poner · **1.1.1** (22/10): reclasificar en tanda fallaba con "No se pudo conectar" en la hoja real (50.000 filas: un flush por fila pasaba el límite de tiempo de Google). Script **v15**: escribe todo y confirma una sola vez (si falla, repite de a una), corta a los 200 s y devuelve el resto con `reintentar`; la página manda tandas de 40 que se achican solas (mín. 5) si Google no responde y vuelven a crecer; repetir es seguro · **1.1.0** (22/10): reorganización de "Otros" (renombres, 5 motivos nuevos, sugeridor, reclasificar desde 2023 en Revisar datos; script v14) · **1.0.3** (21/10): Totales ya no deja una hoja final solo con el borde de la tarjeta (pasaba con EDEAL y el detalle abierto: la última fila caía justo al final de la hoja; en impresión las tarjetas no tienen margen ni borde de abajo y las filas no se cortan); en modo oscuro se imprime con colores claros (`css/navegacion.css`) · **1.0.2** (21/10): al imprimir Totales, el "Detalle por escuela" solo sale si está abierto (antes quedaba una hoja con solo el título); el informe de Reclamos se reacomodó al imprimir (Estado y Problemas lado a lado, Escuelas a lo ancho con reincidentes al costado, la lista y la tabla pueden seguir en la hoja siguiente): 3 hojas sin huecos en vez de 4 · **1.0.1** (21/10): arreglado "Solo pendiente o resuelto" (script v13), la cola ya no apila cambios repetidos del mismo reclamo, Reintentar/Descartar todos, versión con número · **(21/10, script v12)** cambios de los globos en un solo envío, botón **↩ Deshacer** (20 s / Ctrl+Z), **duplicados** (Varias escuelas los saltea; tipo Duplicado en Revisar datos), **marca de versión** al pie + aviso de versión nueva (`version.json`) · la pastilla de avisos abre un **panel desplegable** visible desde cualquier parte de la página · en Nuevo reclamo, **tocar de nuevo la categoría o el motivo elegido lo deselecciona** (el estado no, siempre tiene uno) · instructivo "Cambio de año" (documento
aparte en la cuenta original de Claude; conviene tener una copia descargada).

## 8. Pendientes
- **Pasar a la hoja original**: cambiar `GID_RECLAMOS` en el Apps Script y, si cambia la
  implementación, `urlScript` en `datos/reclamos-config.js`. Agregar a la lista desplegable de
  "Subcategoria" los motivos nuevos (PLOMERIA, ELECTRICIDAD, DESAGUES, CANALETAS, ELECTRODOMESTICOS).
- **Actualizar el Apps Script a la versión 14** si Estado del sistema muestra una anterior.
- En la hoja original: agregar en la pestaña "Lista" los motivos nuevos (PARO, CALENDARIO, ENTREGA EQUIVOCADA,
  REPARTO, BOLSON y los de mantenimiento/equipamiento), como se hizo en la de prueba.
- En la hoja (prueba y original): **agregar "En gestión" a la regla del desplegable de ESTADO**.
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
