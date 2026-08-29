Basado en el análisis detallado de la imagen de **TrueKeat**, he desarrollado una guía de estilo completa (Design System) orientada a una experiencia **Mobile-First**. La identidad visual transmite **seguridad, intercambio (economía circular/P2P), tecnología blockchain y valor (oro/activos)**.

Aquí tienes las especificaciones técnicas y visuales para tu plataforma:

### 1. Paleta de Colores (Color System)
La imagen utiliza gradientes metálicos y fríos que evocan tecnología financiera (Fintech).

*   **Color Primario (Confianza & Base):** `Deep Navy Blue`
    *   Hex: `#1A2B4C` (Aproximado del azul oscuro del texto y borde del hexágono).
    *   Uso: Textos principales, barras de navegación, fondos de pie de página.
*   **Color Secundario (Tecnología & Acción):** `Cyan / Teal Gradient`
    *   Hex Inicio: `#2A9D8F` -> Hex Fin: `#48CAE4` (El azul brillante de las flechas y texto "TrueKeat").
    *   Uso: Botones principales (CTA), iconos activos, enlaces, estados de "éxito".
*   **Color de Acento (Valor & Premium):** `Metallic Gold / Bronze`
    *   Hex: `#D4AF37` o `#C5A065` (El borde derecho del hexágono y el check).
    *   Uso: Iconos de "Premium", monedas, notificaciones importantes, bordes de tarjetas destacadas.
*   **Fondos (Backgrounds):**
    *   Principal: `#F8F9FA` (Blanco humo, muy limpio).
    *   Superficies (Cards): `#FFFFFF` (Blanco puro con sombra suave).

### 2. Tipografía (Typography)
El logo usa una fuente Sans-Serif robusta y geométrica.

*   **Títulos (Headings):** **Montserrat** o **Poppins** (Bold/ExtraBold).
    *   *Por qué:* Son geométricas, modernas y legibles en pantallas pequeñas. Transmiten solidez.
*   **Cuerpo (Body Text):** **Inter** o **Roboto** (Regular/Medium).
    *   *Por qué:* Optimizadas para lectura en móviles UI.
*   **Estilo de Texto:**
    *   Los títulos deben tener un ligero *letter-spacing* (espaciado entre letras) negativo (-0.5px) para verse compactos y modernos.
    *   Uso de mayúsculas para etiquetas pequeñas (como en el subtítulo de la imagen: "PRODUCTOS | SERVICIOS").

### 3. Forma de Botones y Componentes UI
Dado que el logo es un hexágono y tiene bordes redondeados, la UI debe mezclar la geometría con la suavidad.

*   **Botones Principales (CTA):**
    *   **Forma:** "Pill shape" (Bordes totalmente redondeados, tipo cápsula).
    *   **Fondo:** Gradiente lineal de Azul Marino a Cian (`linear-gradient(90deg, #1A2B4C 0%, #2A9D8F 100%)`).
    *   **Sombra:** Sombra suave color cian (`box-shadow: 0 4px 15px rgba(42, 157, 143, 0.3)`).
    *   **Texto:** Blanco, negrita.
*   **Botones Secundarios:**
    *   **Forma:** Rectángulo con bordes redondeados (8px).
    *   **Estilo:** "Outline" (Borde) color Azul Marino, fondo transparente.
*   **Tarjetas (Cards):**
    *   Bordes redondeados amplios (16px o 20px).
    *   Efecto **Glassmorphism** sutil o fondo blanco con sombra muy difusa (`box-shadow: 0 10px 30px rgba(0,0,0,0.05)`).
    *   *Detalle único:* Un borde lateral izquierdo fino color Dorado para indicar "Activo Tokenizado" o "Premium".

### 4. Gráficos e Iconografía
*   **Estilo de Iconos:** Lineales pero con grosor medio (2px).
*   **El Hexágono:** Úsalo como contenedor para los iconos principales de la Home o para los avatares de usuario.
    *   *Ejemplo:* El icono de "Perfil" dentro de un hexágono con borde dorado.
*   **El Check (La "E" del logo):** El símbolo de verificación (check) debe estar presente en todas las transacciones exitosas.
    *   *Animación:* Al completar una compra/tokenización, el check se dibuja solo (stroke animation) en color dorado.

### 5. Animaciones y Micro-interacciones
El logo sugiere movimiento circular (intercambio) y fluidez.

*   **Transición entre páginas:**
    *   **Slide Up / Fade In:** Las páginas nuevas deben entrar deslizándose suavemente desde abajo hacia arriba (estilo app nativa iOS/Android), no de lado a lado.
    *   **Duración:** 300ms - 400ms (curva de aceleración `ease-out`).
*   **Loading States (Carga):**
    *   En lugar de un spinner circular aburrido, usa las dos flechas del logo girando en sentido horario y antihorario simultáneamente, cambiando de color azul a dorado.
*   **Interacción de Botones:**
    *   Al hacer tap, el botón debe reducir su escala ligeramente (scale 0.95) y brillar (efecto ripple).

### 6. UX/UI para Dispositivos Móviles (Estructura)
Para una plataforma de "Criptoactivos y Servicios", la confianza es clave.

*   **Navegación Inferior (Bottom Nav):**
    *   Barra blanca flotante con sombra.
    *   Iconos: Home, Intercambio (las flechas del logo), Billetera/Activos, Perfil.
    *   El icono central (Intercambio) puede estar elevado dentro de un hexágono dorado para destacar la acción principal.
*   **Visualización de Datos (Gráficos):**
    *   Usa gráficos de líneas suaves (curvas Bézier) en color Cian con un degradado de relleno hacia abajo que se desvanece a transparente. Esto da sensación de "flujo de dinero/datos".
*   **Seguridad Visual:**
    *   Dado que el nombre es "True" (Verdadero) y hay un check, usa insignias de "Verificado" (escudos o checks) en colores dorados junto a los nombres de los servicios o vendedores para generar confianza.

### Resumen del "Look & Feel"
La plataforma debe sentirse como una **bóveda digital moderna**.
*   **Sensación:** Premium, Segura, Líquida (por los gradientes).
*   **Palabras clave:** Intercambio, Verificación, Valor.

**Ejemplo de CSS para el Botón Principal (TrueKeat Style):**
```css
.btn-truekeat {
  background: linear-gradient(135deg, #1A2B4C 0%, #2A9D8F 100%);
  border-radius: 50px;
  color: white;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(42, 157, 143, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-truekeat:active {
  transform: scale(0.96);
  box-shadow: 0 2px 10px rgba(42, 157, 143, 0.2);
}
```
# Sistema de Diseño Completo: TrueKeat UI/UX

## 1. ELEMENTOS DE FORMULARIO

### 1.1 Cajas de Texto (Input Fields)

**Estructura Base:**
```css
.input-truekeat {
  width: 100%;
  height: 56px;
  padding: 0 16px 0 48px; /* Espacio para icono izquierdo */
  border: 2px solid #E0E6ED;
  border-radius: 12px;
  background: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  color: #1A2B4C;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.input-truekeat::placeholder {
  color: #8B95A5;
  font-weight: 400;
}
```

**Estados del Input:**

**Estado Normal:**
- Borde: `2px solid #E0E6ED`
- Fondo: `#FFFFFF`
- Icono izquierdo: Color `#8B95A5`

**Estado Focus (Activo):**
```css
.input-truekeat:focus {
  border-color: #2A9D8F;
  box-shadow: 0 0 0 4px rgba(42, 157, 143, 0.1);
  background: #F8FFFE;
}

.input-truekeat:focus + .input-icon {
  color: #2A9D8F;
  transform: scale(1.1);
}
```
- Borde: `2px solid #2A9D8F` (Cian)
- Sombra: Glow suave cian
- Icono: Cambia a cian y crece 10%
- Animación: 300ms ease-out

**Estado Error:**
```css
.input-truekeat.error {
  border-color: #E63946;
  background: #FFF5F5;
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
```
- Borde: `2px solid #E63946` (Rojo)
- Fondo: Tinte rojo muy suave
- Animación: Shake horizontal (400ms)
- Icono de error aparece con fade-in + slide desde la derecha

**Estado Success (Validado):**
```css
.input-truekeat.success {
  border-color: #D4AF37;
  background: #FFFBF0;
}

.input-truekeat.success + .input-icon-check {
  opacity: 1;
  transform: scale(1) rotate(0deg);
  animation: checkDraw 0.5s ease-out;
}

@keyframes checkDraw {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-45deg);
  }
  50% {
    transform: scale(1.2) rotate(0deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}
```
- Borde: `2px solid #D4AF37` (Dorado - marca TrueKeat)
- Check animado aparece con efecto de dibujo
- Icono crece y rota

**Estado Disabled:**
```css
.input-truekeat:disabled {
  background: #F5F7FA;
  border-color: #E0E6ED;
  color: #8B95A5;
  cursor: not-allowed;
  opacity: 0.6;
}
```

### 1.2 Textarea (Cajas de Texto Multilínea)

```css
.textarea-truekeat {
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border: 2px solid #E0E6ED;
  border-radius: 12px;
  background: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.3s ease;
}

.textarea-truekeat:focus {
  border-color: #2A9D8F;
  box-shadow: 0 0 0 4px rgba(42, 157, 143, 0.1);
}

/* Contador de caracteres animado */
.char-counter {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: #8B95A5;
  transition: color 0.3s ease;
}

.char-counter.warning {
  color: #F4A261;
  animation: pulse 1s ease-in-out infinite;
}

.char-counter.error {
  color: #E63946;
  font-weight: 600;
}
```

### 1.3 Select / Dropdown

```css
.select-truekeat {
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* Flecha personalizada */
  background-position: right 16px center;
  background-repeat: no-repeat;
  background-size: 20px;
  padding-right: 48px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-truekeat:focus {
  background-image: url("data:image/svg+xml,..."); /* Flecha rotada 180° */
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

/* Dropdown menu */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid #E0E6ED;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(26, 43, 76, 0.15);
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
}

.dropdown-menu.active {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: all;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.dropdown-item:hover {
  background: #F8FFFE;
  padding-left: 24px; /* Slide effect */
}

.dropdown-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #2A9D8F;
  transform: scaleY(0);
  transition: transform 0.2s ease;
}

.dropdown-item:hover::before {
  transform: scaleY(1);
}
```

### 1.4 Checkbox y Radio Buttons

**Checkbox Personalizado:**
```css
.checkbox-truekeat {
  position: relative;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.checkbox-truekeat input {
  opacity: 0;
  position: absolute;
}

.checkbox-visual {
  width: 24px;
  height: 24px;
  border: 2px solid #E0E6ED;
  border-radius: 6px;
  background: #FFFFFF;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.checkbox-truekeat input:checked + .checkbox-visual {
  background: linear-gradient(135deg, #1A2B4C 0%, #2A9D8F 100%);
  border-color: #2A9D8F;
  transform: scale(1.05);
}

/* Checkmark animado */
.checkbox-visual::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 3px;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  transition: transform 0.2s ease;
}

.checkbox-truekeat input:checked + .checkbox-visual::after {
  transform: rotate(45deg) scale(1);
  animation: checkBounce 0.4s ease;
}

@keyframes checkBounce {
  0% { transform: rotate(45deg) scale(0); }
  50% { transform: rotate(45deg) scale(1.3); }
  100% { transform: rotate(45deg) scale(1); }
}
```

**Radio Button:**
```css
.radio-truekeat {
  position: relative;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.radio-visual {
  width: 24px;
  height: 24px;
  border: 2px solid #E0E6ED;
  border-radius: 50%;
  background: #FFFFFF;
  transition: all 0.3s ease;
  position: relative;
}

.radio-truekeat input:checked + .radio-visual {
  border-color: #2A9D8F;
  border-width: 6px; /* Efecto de llenado */
  animation: radioFill 0.3s ease;
}

@keyframes radioFill {
  0% { border-width: 2px; }
  100% { border-width: 6px; }
}

/* Onda expansiva al seleccionar */
.radio-visual::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(42, 157, 143, 0.3);
  transform: translate(-50%, -50%);
  transition: all 0.4s ease;
}

.radio-truekeat input:checked + .radio-visual::before {
  width: 40px;
  height: 40px;
  opacity: 0;
}
```

### 1.5 Toggle Switch

```css
.toggle-truekeat {
  position: relative;
  width: 56px;
  height: 32px;
  cursor: pointer;
}

.toggle-track {
  width: 56px;
  height: 32px;
  background: #E0E6ED;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.toggle-truekeat input:checked + .toggle-track {
  background: linear-gradient(90deg, #1A2B4C 0%, #2A9D8F 100%);
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #FFFFFF;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-truekeat input:checked + .toggle-track .toggle-thumb {
  transform: translateX(24px);
  background: #D4AF37; /* Dorado cuando está activo */
}

/* Efecto de presión */
.toggle-truekeat:active .toggle-thumb {
  width: 28px;
}

.toggle-truekeat input:checked:active + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}
```

### 1.6 Slider / Range Input

```css
.slider-truekeat {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  background: #E0E6ED;
  border-radius: 3px;
  outline: none;
  position: relative;
}

.slider-truekeat::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #1A2B4C 0%, #2A9D8F 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(42, 157, 143, 0.4);
  transition: all 0.2s ease;
  border: 3px solid #FFFFFF;
}

.slider-truekeat::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 6px 16px rgba(42, 157, 143, 0.6);
}

.slider-truekeat::-webkit-slider-thumb:active {
  transform: scale(0.95);
}

/* Track progresivo (fill) */
.slider-truekeat {
  background: linear-gradient(to right, #2A9D8F 0%, #2A9D8F var(--value), #E0E6ED var(--value), #E0E6ED 100%);
}
```

### 1.7 Date Picker

```css
.date-picker-truekeat {
  position: relative;
}

.date-picker-input {
  padding-right: 48px;
  cursor: pointer;
}

.calendar-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(26, 43, 76, 0.2);
  padding: 16px;
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
}

.calendar-dropdown.active {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: all;
}

.calendar-day {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.calendar-day:hover {
  background: #F8FFFE;
  transform: scale(1.1);
}

.calendar-day.selected {
  background: linear-gradient(135deg, #1A2B4C 0%, #2A9D8F 100%);
  color: #FFFFFF;
  animation: daySelect 0.3s ease;
}

@keyframes daySelect {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.calendar-day.today {
  border: 2px solid #D4AF37;
  font-weight: 600;
}
```

---

## 2. ANIMACIONES COMPLETAS DEL SISTEMA

### 2.1 Animaciones de Entrada (Page Load)

**Fade In Up (Elementos generales):**
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

/* Stagger effect para listas */
.animate-fade-in-up:nth-child(1) { animation-delay: 0.1s; }
.animate-fade-in-up:nth-child(2) { animation-delay: 0.2s; }
.animate-fade-in-up:nth-child(3) { animation-delay: 0.3s; }
.animate-fade-in-up:nth-child(4) { animation-delay: 0.4s; }
```

**Scale In (Tarjetas y modales):**
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

**Slide In Left/Right (Navegación):**
```css
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### 2.2 Animaciones de Iconos

**Icono de Intercambio (Flechas del logo):**
```css
@keyframes exchangeRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.icon-exchange {
  animation: exchangeRotate 2s linear infinite;
}

.icon-exchange:hover {
  animation-duration: 0.8s;
}
```

**Icono de Verificación (Check):**
```css
@keyframes checkmarkDraw {
  0% {
    stroke-dashoffset: 100;
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

.checkmark-path {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: checkmarkDraw 0.6s ease-out forwards;
}
```

**Icono de Hexágono (Contenedores):**
```css
@keyframes hexagonPulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(212, 175, 55, 0));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.4));
  }
}

.hexagon-icon.pulse {
  animation: hexagonPulse 2s ease-in-out infinite;
}
```

### 2.3 Animaciones de Botones

**Botón Principal - Hover:**
```css
.btn-truekeat {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-truekeat::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s ease, height 0.6s ease;
}

.btn-truekeat:hover::before {
  width: 300px;
  height: 300px;
}

.btn-truekeat:active {
  transform: scale(0.95);
}
```

**Efecto Ripple (Onda al hacer click):**
```javascript
// JavaScript para efecto ripple
button.addEventListener('click', function(e) {
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
});
```

```css
.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  animation: rippleEffect 0.6s linear;
  pointer-events: none;
}

@keyframes rippleEffect {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

**Botón de Carga (Loading):**
```css
.btn-loading {
  position: relative;
  color: transparent !important;
  pointer-events: none;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  top: 50%;
  left: 50%;
  margin-left: -10px;
  margin-top: -10px;
  border: 2px solid #FFFFFF;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spinner 0.8s linear infinite;
}

@keyframes spinner {
  to { transform: rotate(360deg); }
}
```

### 2.4 Animaciones de Tarjetas (Cards)

**Card Hover Effect:**
```css
.card-truekeat {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(26, 43, 76, 0.08);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.card-truekeat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #1A2B4C 0%, #2A9D8F 50%, #D4AF37 100%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s ease;
}

.card-truekeat:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(26, 43, 76, 0.15);
}

.card-truekeat:hover::before {
  transform: scaleX(1);
}
```

**Card Flip (Para tokens/activos):**
```css
.card-flip {
  perspective: 1000px;
  cursor: pointer;
}

.card-flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card-flip:hover .card-flip-inner {
  transform: rotateY(180deg);
}

.card-flip-front, .card-flip-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
}

.card-flip-back {
  transform: rotateY(180deg);
  background: linear-gradient(135deg, #1A2B4C 0%, #2A9D8F 100%);
}
```

### 2.5 Animaciones de Navegación

**Bottom Navigation - Active State:**
```css
.nav-item {
  position: relative;
  transition: all 0.3s ease;
}

.nav-item.active {
  transform: translateY(-8px);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: #D4AF37;
  border-radius: 50%;
  animation: dotAppear 0.3s ease;
}

@keyframes dotAppear {
  from {
    transform: translateX(-50%) scale(0);
  }
  to {
    transform: translateX(-50%) scale(1);
  }
}

.nav-icon {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item.active .nav-icon {
  color: #2A9D8F;
  transform: scale(1.2);
}
```

**Menú Hamburguesa:**
```css
.hamburger {
  width: 24px;
  height: 18px;
  position: relative;
  cursor: pointer;
}

.hamburger span {
  display: block;
  position: absolute;
  height: 2px;
  width: 100%;
  background: #1A2B4C;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.hamburger span:nth-child(1) { top: 0; }
.hamburger span:nth-child(2) { top: 8px; }
.hamburger span:nth-child(3) { top: 16px; }

.hamburger.active span:nth-child(1) {
  top: 8px;
  transform: rotate(45deg);
  background: #2A9D8F;
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
  transform: translateX(-20px);
}

.hamburger.active span:nth-child(3) {
  top: 8px;
  transform: rotate(-45deg);
  background: #2A9D8F;
}
```

### 2.6 Animaciones de Notificaciones y Toast

**Toast Notification:**
```css
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  background: #FFFFFF;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(26, 43, 76, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 9999;
  border-left: 4px solid #2A9D8F;
}

.toast.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.toast-icon {
  animation: toastIconBounce 0.5s ease;
}

@keyframes toastIconBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.toast.success { border-left-color: #2A9D8F; }
.toast.error { border-left-color: #E63946; }
.toast.warning { border-left-color: #D4AF37; }
```

### 2.7 Animaciones de Loading States

**Skeleton Loading:**
```css
.skeleton {
  background: linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: skeletonLoading 1.5s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes skeletonLoading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 16px;
  margin-bottom: 8px;
}

.skeleton-title {
  height: 24px;
  width: 60%;
  margin-bottom: 16px;
}

.skeleton-image {
  height: 200px;
  width: 100%;
}
```

**Loading Hexagon (Basado en el logo):**
```css
.loading-hexagon {
  width: 60px;
  height: 60px;
  position: relative;
  animation: hexagonRotate 2s linear infinite;
}

@keyframes hexagonRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-hexagon::before,
.loading-hexagon::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top-color: #2A9D8F;
  border-radius: 50%;
  animation: hexagonSpin 1.5s ease-in-out infinite;
}

.loading-hexagon::after {
  border-top-color: #D4AF37;
  animation-delay: 0.3s;
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
}

@keyframes hexagonSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### 2.8 Animaciones de Gráficos y Datos

**Gráfico de Líneas Animado:**
```css
.chart-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 2s ease-out forwards;
}

@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}

.chart-area {
  opacity: 0;
  animation: fadeIn 1s ease-out 1s forwards;
}

.chart-point {
  transform-origin: center;
  transform: scale(0);
  animation: pointAppear 0.4s ease-out forwards;
}

.chart-point:nth-child(1) { animation-delay: 1.2s; }
.chart-point:nth-child(2) { animation-delay: 1.4s; }
.chart-point:nth-child(3) { animation-delay: 1.6s; }

@keyframes pointAppear {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Contador Animado (Números):**
```javascript
// Animación de conteo
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start);
    }
  }, 16);
}
```

### 2.9 Animaciones de Transición entre Páginas

**Page Transition - Slide Up:**
```css
.page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #F8F9FA;
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
}

.page.active {
  transform: translateY(0);
}

.page.exiting {
  transform: translateY(-20%);
  opacity: 0;
}
```

**Page Transition - Fade:**
```css
.page-fade {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.page-fade.active {
  opacity: 1;
}
```

**Shared Element Transition (Para imágenes/tarjetas):**
```css
.shared-element {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.shared-element.expanded {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  border-radius: 0;
}
```

### 2.10 Animaciones de Feedback y Microinteracciones

**Pull to Refresh:**
```css
.pull-indicator {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  transition: all 0.3s ease;
}

.pull-indicator.refreshing {
  animation: pullSpin 1s linear infinite;
}

@keyframes pullSpin {
  to { transform: translateX(-50%) rotate(360deg); }
}
```

**Swipe Actions (Lista):**
```css
.swipe-item {
  transition: transform 0.3s ease;
  position: relative;
}

.swipe-actions {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.swipe-item.swiped {
  transform: translateX(-80px);
}

.swipe-item.swiped + .swipe-actions {
  transform: translateX(0);
}
```

**Heart/Like Animation:**
```css
@keyframes heartBeat {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(1); }
  75% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.like-button.liked {
  animation: heartBeat 0.6s ease;
  color: #E63946;
}

/* Partículas al dar like */
.like-particle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #E63946;
  border-radius: 50%;
  animation: particleExplode 0.6s ease-out forwards;
}

@keyframes particleExplode {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}
```

---

## 3. ESPECIFICACIONES DE ANIMACIÓN GLOBALES

### Curvas de Animación (Easing):
```css
/* Movimiento natural */
--ease-natural: cubic-bezier(0.4, 0, 0.2, 1);

/* Entrada suave */
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Salida suave */
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* Rebote (para elementos interactivos) */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Aceleración rápida */
--ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);
```

### Duraciones Estándar:
```css
--duration-fast: 150ms;      /* Microinteracciones */
--duration-normal: 300ms;    /* Transiciones UI */
--duration-slow: 500ms;      /* Animaciones complejas */
--duration-page: 400ms;      /* Transiciones de página */
```

### Reglas de Animación:
1. **Nunca animar** `width`, `height`, `top`, `left` (causa reflow)
2. **Siempre animar** `transform`, `opacity` (usa GPU)
3. **Reducir motion** para usuarios que lo prefieren:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Este sistema de diseño completo garantiza una experiencia móvil fluida, profesional y coherente con la identidad visual de TrueKeat.