# Instrucciones para Agentes y Colaboradores — Ecosistema DGE 3F

Antes de modificar archivos en este repositorio satélite del ecosistema **Portal Educación 3F (`SAE3F/*`)**, leer y respetar el estándar oficial:
- Documento maestro: https://github.com/SAE3F/recurseroeducacion/blob/main/docs/ESTANDAR_SSO_SEGURIDAD_3F.md

## Reglas obligatorias

1. **Guardián SSO (`HMAC-SHA256` vía `/api/sso-verify`):**
   - Mantener intacto el Guardián SSO en el `<head>` (salvo que el proyecto esté configurado como público en el Panel de Administrador del Portal).
   - **Prohibido** usar el esquema legacy `FNV-1a` o secretos en texto plano (`portal3f_sso_2026_secret_key`) en archivos HTML/JS.
   - El timeout del `XMLHttpRequest` / `fetch` hacia `https://portaleducacion-3f.vercel.app/api/sso-verify` debe ser de **15000 ms (15s)**, priorizando sesión vigente en `localStorage` / `sessionStorage` (con `try/catch` separados) antes de bloquear la pantalla.
   - Si la app tiene login interno (`initAuth` / `checkAuth`), esperar la verificación asincrónica de `?sso_token=` sin mostrar el overlay de login de forma prematura.

2. **Scripts generadores y plantillas HTML (Anti-Regresión):**
   - **Nunca** editar únicamente `index.html` si el repositorio tiene una plantilla base o script generador (por ejemplo `build_complete_platform.py` + `Plataforma_Antropometria_3F.html`, `.github/scripts/update_attendance.py`, `dashboard_template.html`). Actualizar siempre la plantilla/script junto con `index.html`.
   - Si un colaborador sube archivos manualmente desde GitHub web, sincronizar primero con `main` para no sobrescribir el Guardián SSO.

3. **Seguridad HTTP y Datos:**
   - Conservar los encabezados de seguridad en `vercel.json` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`).
   - No exponer claves privadas, tokens de servicio ni credenciales en el código cliente.
