# Ficha Escuelas · Tres de Febrero

Buscador y tablero de **entregas, obras y arreglos** de cada institución.
Lee (sin modificar) tres planillas de Google a través de un Apps Script propio.

| Vista | Qué tiene |
|---|---|
| 🔎 Buscador | Búsqueda por institución, ficha con indicadores, línea de tiempo, qué recibió y detalle completo (Excel e impresión) |
| 📊 Vista general | Filtros combinables (tipo, años, categoría, nivel, gestión, localidad, proveedor) y gráficos; institución × categoría |
| 📋 Registros | Todos los registros con búsqueda, orden y Excel |
| 📄 Ficha para visita | Desde la ficha: elegir apartados, columnas, período y formato; imprimir / guardar PDF (hojas numeradas) o Excel |
| 🩺 Calidad de datos | Problemas agrupados por tipo, con botón **↗ Ir a la celda** que abre la planilla justo donde hay que revisar |

## De dónde salen los datos
| Planilla | Hoja | Va como |
|---|---|---|
| BASE DE DATOS | ESTABLECIMIENTOS | Datos de cada institución (nivel, gestión, localidad, CUE, matrícula) |
| BASE DE DATOS | ENTREGAS | Entregas |
| BASE DE DATOS | OBRAS-INFRAESTRUCTURA | Obras |
| SAE \| Tablero Gestión | HISTORICOENTREGAS | Entregas (utensilios y equipamiento 2022–2024) |
| Facturación SAE 2026 | FACTURACION UNIDADES | Utensilios y equipamiento → entregas · Atmosférico y canaletas → arreglos (el servicio alimentario no entra) |
| Facturación SAE 2026 | FACTURACION ITEMS | Arreglos (gas, electricidad, plomería, refrigeración) |

## Reclamos
Solo lectura. Salen de **SAE | Tablero Gestión → Reclamos**. El script (1.2.0+) los manda por escuela (`?accion=reclamos&inst=EP 12`, últimos 20)
cuando se abre una ficha. No se mandan patologías, cupos ni horarios.

## Archivos
- `index.html` · la página. `css/` estilos (`tokens-3f.css` es el del kit, sin cambios). `js/` lógica:
  `config.js` (solo la URL del script: se completa una vez y no viene en las actualizaciones), `version.js` (versiones: viene en cada actualización), `escuelas-extra.js` (dirección y directora, del equipo), `coordenadas.js` (lat/lng de cada escuela, del mapa de SAE Gestión: solo nombre y coordenadas), `datos.js` (carga y copia guardada), `app.js` (vistas), `graficos.js` (gráficos SVG sin librerías), `excel.js` (Excel sin librerías), `pdf.js` (PDF a color sin librerías, para la Ficha para visita).
- `apps-script/Codigo.gs` · el script que lee las planillas. Cómo publicarlo: `apps-script/PUBLICAR.md`.
- `vercel.json` · encabezados de seguridad del kit. `AGENTS.md` · reglas del ecosistema.

## Botones ↗ (abrir la planilla en la celda)
Cada registro trae su hoja, fila y columna de origen (Apps Script 1.1.0 o más). Todos los clics de una misma planilla usan
la misma pestaña del navegador. Si el navegador bloquea la ventana, hay que permitir las ventanas emergentes para la página.

## Probar en la compu
Sin servidor no anda (el navegador bloquea `fetch` con doble clic). Desde la carpeta: `python -m http.server 8000` y abrir <http://localhost:8000>.

## Versiones
Página: `VERSION_PAGINA` en `js/version.js` (aparece abajo). Script: `VERSION_SCRIPT` en `Codigo.gs`. Si no coinciden con `VERSION_SCRIPT_ESPERADA`, la página avisa cuál de los dos quedó atrasado.

## Pendiente para más adelante
- **Montos y N° de factura:** ya están preparados. Poner `INCLUIR_MONTOS = true` en `Codigo.gs` y publicar nueva versión: la página suma las columnas sola. Antes, sumar la página al Portal.
- **Sumar al Portal Educación 3F:** pedir a Matías el alta y el `APP_ID`, y pegar el guardián SSO de la plantilla del kit al principio del `<head>` de `index.html`.
- **Nombres que no coinciden:** se agregan en `ALIAS` dentro de `Codigo.gs` (ver pestaña 🩺 Calidad de datos).
