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

1. Abrí el archivo `reclamos-config.js` con el Bloc de notas.
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
3. Reemplazá el link en `reclamos-config.js` por el nuevo `/exec`.

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
| "No se pudo conectar con la hoja" | Revisá internet y que el link en `reclamos-config.js` termine en `/exec`. |
| Los cambios del script no se ven | Faltó publicar una *Nueva versión* (ver "Si después cambio el script"). |
