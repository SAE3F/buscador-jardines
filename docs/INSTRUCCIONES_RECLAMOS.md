# Conectar el apartado de Reclamos con Google Sheets

La página no puede escribir sola en Google Sheets. Para eso se usa un pequeño
script de Google (Apps Script) que se pega **dentro de la planilla** y funciona
como puente. Se hace una sola vez y lleva unos 5 minutos.

> Hacé todo esto primero en la **copia de prueba**. Cuando funcione bien, se
> repite en la hoja original (ver el final).

---

## 1. Pegar el script en la planilla

1. Abrí la planilla de reclamos.
2. Menú **Extensiones → Apps Script**. Se abre una pestaña nueva con un archivo `Código.gs`.
3. Borrá todo lo que tenga ese archivo y pegá el contenido completo de
   `apps-script/Codigo.gs`.
4. Revisá la línea `var GID_RECLAMOS = 1036384707;`. Ese número tiene que ser el
   que aparece después de `gid=` en el link de la pestaña de reclamos.
5. Guardá con el ícono del disquete (o Ctrl + S).

## 2. Elegir la clave del equipo (recomendado)

La clave evita que cualquiera que consiga el link pueda leer o escribir en la hoja.
Es opcional: si no se carga la propiedad `CLAVE`, la página entra directo sin pedir nada.

1. En Apps Script, a la izquierda, tocá el engranaje **⚙️ Configuración del proyecto**.
2. Bajá hasta **Propiedades de la secuencia de comandos** → **Agregar propiedad**.
3. En *Propiedad* escribí `CLAVE` (en mayúsculas) y en *Valor* la clave que quieras
   (por ejemplo `Reclamos3F-2026`).
4. **Guardar propiedades de la secuencia de comandos**.

Esa es la clave que el equipo va a ingresar la primera vez que abra Reclamos.

## 3. Publicar el script

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En *Seleccionar tipo* (engranaje) elegí **Aplicación web**.
3. Completá:
   - **Descripción:** Reclamos SAE
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier persona
4. **Implementar**. Google va a pedir permisos:
   - **Autorizar acceso** → elegí tu cuenta.
   - Si aparece *"Google no verificó esta app"*: **Configuración avanzada** →
     **Ir a … (no seguro)** → **Permitir**. Es normal: la "app" es tu propio script.
5. Copiá el link que termina en **`/exec`**.

> "Cualquier persona" es necesario porque la página no inicia sesión con Google.
> Lo que protege la hoja es la clave del paso 2: sin ella el script no lee ni escribe nada.

## 4. Pegar el link en la página

1. Abrí el archivo `datos/reclamos-config.js` con el Bloc de notas.
2. Pegá el link entre las comillas:
   ```js
   urlScript: 'https://script.google.com/macros/s/XXXXXXXX/exec'
   ```
3. Guardá.

## 5. Probar

1. Abrí el buscador y tocá **📝 Reclamos** (o abrí `reclamos.html`).
2. Ingresá la clave. Arriba tiene que aparecer **"Conectado · N reclamos"**.
3. Cargá un reclamo de prueba y fijate que aparezca al final de la hoja.

---

## Si después cambio el script

Si hay que modificar `Codigo.gs`, después de pegar la versión nueva:
**Implementar → Administrar implementaciones → ✏️ (editar) → Versión: Nueva versión → Implementar.**
Así el link `/exec` sigue siendo el mismo y no hay que tocar la página.

## Pasar a la hoja original

1. Repetí los pasos 1 a 3 en la planilla original (con la misma clave u otra).
2. En el paso 1.4 poné el `gid` de la pestaña de reclamos de la hoja original.
3. Reemplazá el link en `datos/reclamos-config.js` por el nuevo `/exec`.

Recomendado: antes de conectarla, hacé una copia de la hoja original
(Archivo → Hacer una copia) como respaldo.

## Qué hace y qué no hace el script

- **Agrega** cada reclamo nuevo en la primera fila libre al final de la hoja.
- **Crea solas** las columnas nuevas **PROBLEMA** (P) y **PATOLOGÍA** (Q) si no existen.
- **Modifica** solo ESTADO, Responsable, Fecha resolución y ACCIONES cuando se
  cambia el seguimiento desde la página.
- **No borra ni reordena** filas. Antes de cambiar un seguimiento, comprueba que la
  fila siga siendo el mismo reclamo (por si alguien ordenó la hoja); si no coincide,
  pide actualizar la lista en lugar de escribir en la fila equivocada.

## Problemas frecuentes

| Mensaje | Qué hacer |
| --- | --- |
| "La clave no es correcta" | Revisá mayúsculas y espacios de la propiedad `CLAVE`. |
| "No encontré la pestaña de reclamos (gid …)" | El número `GID_RECLAMOS` no coincide con la pestaña. |
| "No se pudo conectar con la hoja" | Revisá internet y que el link en `datos/reclamos-config.js` termine en `/exec`. |
| Los cambios del script no se ven | Faltó publicar una *Nueva versión* (ver "Si después cambio el script"). |

## Versión 8 del script (carga por años y gráficos)

- La página trae completos solo **este año y el anterior**. Los años viejos llegan
  resumidos (sin el detalle) y solo cuando se abre el **Resumen**; quedan 6 horas
  en la caché de Google, así que la segunda vez cargan al instante.
- En **Buscar**, el botón "Ver también años anteriores" trae todos los años completos.
- Los reclamos **hasta 2025** se muestran como "Resuelto". La hoja no se modifica.
  (Se cambia en `js/reclamos.js` y `js/sync.js`: `ANIO_CIERRE_RESUELTOS`.)
- Para actualizar el script: pegar el `Codigo.gs` nuevo **dejando el mismo número de
  `GID_RECLAMOS` que tenías**, guardar, y **Implementar → Gestionar implementaciones →
  editar → Nueva versión**. El link `/exec` no cambia.
- Cupos para comparar "cada 100 / 1.000 cupos": 2023 y 2025 están en
  `datos/cupos-historicos.js`; 2026 sale solo de los cupos del buscador.

## Versión 9 del script (velocidad)

- Las respuestas quedan unos minutos en la caché de Google: reclamos 5 minutos,
  cupos y menús 10 minutos. Cuando alguien carga o modifica un reclamo, la caché de
  reclamos se renueva sola. Un cambio en CUPOS 2026 puede tardar hasta 10 minutos en verse.
- Los cupos viajan comprimidos (solo las fechas en que cambia el cupo).
- La página de Reclamos muestra al instante la última lista guardada en el navegador
  y la actualiza por detrás. Los años anteriores del Resumen se guardan 12 horas.
- El buscador, Totales y el Mapa piden cupos a Google como mucho cada 10 minutos
  (el botón "Sincronizar ahora" fuerza la actualización).
- Fechas fuera de 2015 → hoy+60 días (p. ej. 30/12/1899) cuentan como "sin fecha válida".

## Novedades (octubre 2026)
- **Reclamos estancados** (pestaña Buscar): recuadro con los reclamos *Pendiente* o *En gestión* de hace más de 3, 7, 15 o 30 días (se elige ahí mismo), del más viejo al más nuevo. Filtro rápido "⏰ Estancados". Los de este año con la columna ESTADO vacía no se cuentan (se avisa cuántos son).
- **Posibles duplicados** (Nuevo reclamo): avisa si la misma escuela ya tiene un reclamo del mismo motivo entre 3 días antes y 3 después (también mira los que se están guardando). Al guardar pide confirmación; no bloquea.
- **Escuelas** (Resumen): ranking por cantidad o cada 100 cupos de la escuela (solo escuelas con 3 reclamos o más), y lista de **reincidentes**: reclamos en 5 o más de los últimos 6 meses de clase (sin enero ni febrero).
- **Sugerencia para mantenimiento y equipamiento** (Nuevo reclamo): el recuadro de sugerencia reconoce plomería, electricidad, gas (cocina, horno, termotanque, estufa), refrigeración (incluye aires), desagües/cloacas, canaletas, electrodomésticos, utensilios y mobiliario, y propone también el **problema específico** (columna PROBLEMA). Motivos nuevos en Mantenimiento: PLOMERIA, ELECTRICIDAD, DESAGUES, CANALETAS; en Equipamiento: ELECTRODOMESTICOS. Conviene sumarlos a la lista desplegable de "Subcategoria" en la hoja.
