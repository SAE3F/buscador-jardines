# Tablero Dinámico de Escuelas y Cupos SAE 2026 - Tres de Febrero

Aplicación web interactiva y georreferenciada desarrollada para la **Municipalidad de Tres de Febrero**, que cruza la información geográfica del relevamiento escolar con los cupos, servicios y proveedores adjudicados del **Sistema Alimentario Escolar (SAE 2026)**.

---

## Características

- **Mapa Dinámico (Leaflet + MarkerCluster)**:
  - Foco en el distrito de Tres de Febrero con todas las escuelas mapeadas.
  - Colores distintivos según el proveedor asignado (`GRUPO L`, `GYULAND`, `EDEAL S.A`, `TINTENFISCH S.A`) y gris neutral para instituciones sin prestación SAE.
  - Despliegue tipo *spiderfy* para predios donde funcionan múltiples niveles educativos (32 ubicaciones).
- **Interacción al pasar el mouse (Hover)**:
  - Tooltip instantáneo con el nombre de la escuela, nivel educativo, dirección, gestión y listado completo de prestaciones SAE (servicio, proveedor, cupos del último registro y cupo total diario).
  - Tarjeta lateral de inspección detallada.
- **Filtros de Selección Múltiple**:
  - **Por Proveedor**: Selección múltiple con badges de color y contador.
  - **Por Tipo de Servicio**: Selección múltiple (`DM`, `COMEDOR`, `DM JARDINES`, `DM MATERNAL`, etc.).
  - **Por Nivel Educativo**: Primaria, Secundaria, Jardín, Especial, Adultos, Dispositivos.
  - **Por Escuela**: Selector con buscador en tiempo real para localizar cualquier escuela.
  - **Por Condición SAE**: "Todas", "Con SAE", "Sin SAE".
  - **Buscador global**: Búsqueda libre por texto.
- **Indicadores en Tiempo Real (KPIs)**:
  - Contador de escuelas visibles en el mapa.
  - Sumatoria en vivo de cupos SAE según los filtros aplicados.
  - Discriminación de escuelas con y sin SAE.
- **Tabla Completa y Exportación**:
  - Panel deslizable con el listado completo y botón para exportar a **CSV/Excel**.
  - Modal para consultar las instituciones que no poseen coordenadas geográficas registradas.

---

## Cómo Ejecutar Localmente

No se requiere ningún servidor complejo ni instalación de bases de datos:

1. **Doble clic directo**:
   - Puedes abrir directamente el archivo `index.html` en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).

2. **O mediante un servidor local ligero (opcional)**:
   ```bash
   # Con Python
   python -m http.server 8000
   # Luego abrir en el navegador: http://localhost:8000
   ```

---

## Cómo Hostear en Servicios Gratuitos (Netlify)

La aplicación es **100% estática (Client-Side)** y está optimizada con `netlify.toml`:

### Opción 1: Arrastrar y Soltar (Netlify Drop - Sin registrar cuenta previa o con cuenta)
1. Ingresa a [Netlify Drop](https://app.netlify.com/drop).
2. Arrastra la carpeta completa `escuelas mapeadas` a la ventana del navegador.
3. En segundos tendrás un enlace público permanente (ej. `https://sae-tres-de-febrero.netlify.app`).

### Opción 2: Desde GitHub
1. Sube este directorio a un repositorio de GitHub.
2. En Netlify, crea un "New site from Git".
3. Selecciona el repositorio. Deja los campos de build vacíos (publish directory: `.`).
4. ¡Listo! Netlify desplegará automáticamente cualquier actualización que hagas en el repositorio.

---

## Regenerar Datos

Si en el futuro se actualizan los archivos Excel de origen, puedes regenerar los datos ejecutando:

```bash
python generate_data.py
```
Esto actualizará automáticamente `data_escuelas.js` y `data_escuelas.json`.
