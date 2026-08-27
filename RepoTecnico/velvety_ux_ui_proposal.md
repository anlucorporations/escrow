# Propuesta de Rediseño UX/UI: TrueKeate "Velvety Style"

Esta propuesta adapta el sistema de diseño del kit UI de Figma **Velvety (Beauty & Wellness)** para transformar la interfaz de **TrueKeate** en una experiencia digital sofisticada, minimalista y de alta confianza (spa-like).

---

## 🎨 Paleta de Colores (Velvety Color Palette)

La paleta se centra en tonos orgánicos, suaves y de bajo contraste para transmitir paz, seguridad e inmutabilidad, alejándonos del clásico estilo agresivo "crypto/tech".

| Rol / Variable | Color Hex | Uso en la Plataforma |
| :--- | :--- | :--- |
| **Fondo Principal** (`--background`) | `#FAF8F5` | Fondo general de toda la aplicación (Alabastro/Crema) |
| **Texto/Contenido** (`--foreground`) | `#2D2A26` | Encabezados y textos principales (Charcoal / Taupe oscuro) |
| **Primario / Enlaces** (`--color-indigo-500`) | `#D4A373` | Botones de acción, enlaces activos, branding (Camel suave) |
| **Secundario** (`--color-purple-500`) | `#E5989B` | Estados de éxito, banners, destaques (Rosa viejo) |
| **Neutral Secundario** (`--color-indigo-100`)| `#F4ECE6` | Fondos de tarjetas, modales y barras de navegación |
| **Acento de Éxito / Estado** | `#A3B18A` | Badges de completado, verificación y estados activos (Verde Sabio) |

---

## ✍️ Tipografía (Typography)

Para lograr el aspecto de revista o boutique de bienestar de Velvety, se utiliza un contraste tipográfico marcado:

*   **Títulos y Encabezados (Serif):** `Playfair Display` (itálica por defecto en destaques). Aporta elegancia, tradición y un sentido de "contrato/palabra dada".
*   **Cuerpo de Texto (Sans-Serif):** `Inter`. Garantiza una legibilidad óptima en pantallas móviles, tablas de transacciones y formularios de depósitos.

---

## 📐 Componentes Rediseñados

### 1. Cabecera (Header) y Barra de Navegación Móvil
*   **Estilo:** Fondo semitransparente con efecto desenfoque (`backdrop-blur-md bg-background/90`) y un borde inferior ultradelgado en color `#E8E0D5`.
*   **Tipografía del Logo:** Se reemplaza el imagotipo geométrico por tipografía Serif itálica minimalista: *TrueKeate.*
*   **Acciones:** Botones en forma de píldora (`rounded-full`) con bordes finos.

### 2. Tarjetas de Truekes (Operations / Items)
*   **Layout:** Bordes muy redondeados (`rounded-3xl` o `rounded-2xl`) con sombras muy difusas y suaves (`shadow-2xl shadow-indigo-900/5`).
*   **Imágenes:** Contenedores con proporciones de retrato (`aspect-[4/5]`) y arcos decorativos inspirados en la arquitectura clásica de spa del kit Velvety.

### 3. Modales y Formularios
*   **Fondo:** Color `#F4ECE6` (Warm Nude) en lugar de blanco puro, creando contraste sobre el fondo principal.
*   **Campos de Entrada:** Bordes delgados, sin sombras pesadas, con etiquetas limpias en mayúsculas y tipografía `Inter` ligera.

---

## 🖼️ Visualización del Landing Page Rediseñado
Actualmente se ha desplegado la primera versión en la página principal:
*   **Hero:** Un titular estilizado a doble altura con el texto *"The art of mindful digital exchange"* en fuente serif itálica.
*   **Pilares de Confianza:** Bloques redondeados en tonos pastel que explican la bilateralidad, resolución de disputas y seguridad de la plataforma.
*   **Estética:** Formas de fondo orgánicas y circulares con opacidad baja que reemplazan los gráficos técnicos.
