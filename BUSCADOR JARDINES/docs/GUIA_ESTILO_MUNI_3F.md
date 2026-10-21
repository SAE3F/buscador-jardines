# Guía de Estilo y Diseño: Municipalidad de Tres de Febrero (Muni 3F)

Esta guía documenta la paleta de colores, tipografías y reglas de estilo visual estándar para el desarrollo de sitios web y aplicaciones de la Municipalidad de Tres de Febrero.

---

## 1. Tipografía

Se utiliza Google Fonts con la siguiente combinación:

- **Titulares / Headings:** `Montserrat`
  - **Pesos recomendados:** 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold).
  - **Uso:** `h1`, `h2`, `h3`, `h4`, `h5`, `h6`.
- **Cuerpo de texto / Body:** `Inter`
  - **Pesos recomendados:** 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold).
  - **Uso:** Párrafos, textos de interfaz, botones, inputs y formularios.

---

## 2. Paleta de Colores

### Colores Institucionales / Marca (Brand)

| Rol | Nombre | HEX | Uso habitual |
| :--- | :--- | :--- | :--- |
| **Primario** | `Brand Primary` | `#163C68` | Azul oscuro principal. Barras superiores, fondos primarios, botones principales. |
| **Oscuro** | `Brand Dark` | `#0E2A49` | Azul profundo. Sidebars, footers o fondos oscuros. |
| **Suave** | `Brand Soft` | `#B8D0EB` | Azul pastel. Bordes sutiles, rings de foco. |
| **Claro** | `Brand Light` | `#E0EEFF` | Azul muy claro. Fondos secundarios, hovers suaves. |
| **Acento** | `Accent` | `#F69321` | Naranja institucional. Call to actions (CTA), íconos destacados, badges. |
| **Acento Oscuro** | `Accent Dark` | `#DB7A0B` | Naranja oscuro. Hover de botones de acento. |
| **Acento Suave** | `Accent Soft` | `#F6BF80` | Naranja pastel. Indicadores o tags. |
| **Acento Claro** | `Accent Light` | `#F6E6D4` | Naranja claro. Fondos de alertas o banners. |

### Colores Neutros

| Tono | HEX | Uso |
| :--- | :--- | :--- |
| **Neutro 900** | `#000D1D` | Color principal de textos / títulos. |
| **Neutro 700** | `#2F4054` | Color secundario de textos / subtítulos. |
| **Neutro 500** | `#B1B7BE` | Placeholders y elementos deshabilitados. |
| **Neutro 300** | `#E5E5E5` | Bordes, divisores y líneas. |
| **Neutro 100** | `#F8F8F8` | Fondos de sección o tarjetas grises claras. |
| **Neutro 0** | `#FDFDFD` | Fondo general de la aplicación / blanco puro. |

---

## 3. Implementación en CSS / Tailwind

### Variables CSS (`globals.css`)

```css
:root {
  /* Brand */
  --color-primary: #163C68;
  --color-primary-dark: #0E2A49;
  --color-primary-soft: #B8D0EB;
  --color-primary-light: #E0EEFF;

  /* Accent */
  --color-accent: #F69321;
  --color-accent-dark: #DB7A0B;
  --color-accent-soft: #F6BF80;
  --color-accent-light: #F6E6D4;

  /* Neutros */
  --color-text-main: #000D1D;
  --color-text-secondary: #2F4054;
  --color-disabled: #B1B7BE;
  --color-border: #E5E5E5;
  --color-bg-secondary: #F8F8F8;
  --color-bg-main: #FDFDFD;
}
```

### Componentes y Clases Útiles

```css
/* Barra de acento superior institucional (para headers/navbars) */
.topbar-accent {
  background: linear-gradient(90deg, #163C68 0%, #F69321 100%);
  height: 4px;
  width: 100%;
}

/* Gradiente de texto institucional */
.text-gradient {
  background: linear-gradient(135deg, #163C68, #F69321);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Tarjeta con efecto Glass institucional */
.card-glass {
  background: rgba(253, 253, 253, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(229, 229, 229, 0.8);
  box-shadow: 0 4px 12px rgba(0, 13, 29, 0.08);
  border-radius: 12px;
}
```
