# Publicar el Apps Script (una sola vez · ~5 minutos)

El script **solo lee** las 3 planillas (BASE DE DATOS, SAE | Tablero Gestión y Facturación SAE 2026).
No escribe ni borra nada. Hay que publicarlo con una cuenta de Google que **pueda abrir las 3**.

1. Entrá a <https://script.google.com> → **Nuevo proyecto**. Ponele de nombre `SAE Entregas – lector`.
2. Borrá lo que trae `Código.gs`, pegá todo el contenido de `apps-script/Codigo.gs` y guardá (💾).
3. Arriba, en el selector de funciones, elegí **`probar`** → **Ejecutar**.
   - La primera vez Google pide permiso: *Revisar permisos* → elegí tu cuenta → *Configuración avanzada* →
     *Ir a SAE Entregas (no seguro)* → *Permitir*. (Dice "no seguro" porque es un script propio, no de una empresa verificada.)
   - Abajo, en **Registro de ejecución**, tiene que aparecer algo como
     `Versión 1.3.0 · 4318 registros · 300 instituciones · 120 avisos`.
4. **Implementar → Nueva implementación** → engranaje ⚙️ → **Aplicación web**.
   - Descripción: `v1.3.0`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`).
5. Pegá esa URL en `js/config.js` → `SCRIPT_URL: '…/exec'`.

Para probar que anda: abrí la URL en el navegador. Tiene que mostrar texto que empieza con `{"ok":true,"version":"1.3.0"…`.

## Actualización automática cada hora (desde 1.3.0 · hacerlo una vez)
Así la página abre siempre rápido y los datos tienen como mucho 1 hora, aunque nadie toque 🔄 Actualizar.
1. En el editor, en el selector de funciones elegí **`activarActualizacionAutomatica`** → **▶ Ejecutar**.
2. Google pide un permiso nuevo (para crear el activador): aceptalo igual que la primera vez.
3. En **Registro de ejecución** tiene que decir `Listo: los datos se van a rehacer solos cada hora.`
4. Para verlo: menú izquierdo ⏰ **Activadores** → aparece `actualizarAutomatico` · *Basado en el tiempo* · *Cada hora*.
Para apagarla: ejecutar **`desactivarActualizacionAutomatica`** (vuelve a la copia de 10 minutos).

## Cuando cambie el script
Pegá el código nuevo, guardá y andá a **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar**.
La URL **no cambia**. Si el número de `VERSION_SCRIPT` no coincide con `VERSION_SCRIPT_ESPERADA` de `js/config.js`, la página avisa.

## Sobre "Cualquier persona"
Hace falta para que la página pueda pedir los datos sin que cada visitante inicie sesión en Google. Quien tenga la URL del
script puede ver los mismos datos que muestra la página (sin montos ni facturas mientras `INCLUIR_MONTOS = false`).
Por eso: no compartir la URL fuera del equipo, y sumar la página al Portal Educación 3F cuando esté lista.

## Reclamos (desde 1.2.0)
El script también lee la hoja **Reclamos** del Tablero (solo lectura). La cuenta que publica tiene que poder abrir el Tablero.
Para probar: `<URL>/exec?accion=reclamos&inst=EP 12` tiene que devolver `{"ok":true,…,"reclamos":{"total":…}}`.
