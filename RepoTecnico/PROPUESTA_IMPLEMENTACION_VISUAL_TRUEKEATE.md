# Propuesta de Implementación — Entorno Visual y UX/UI TrueKeate (Design System 2.0)

> **Base:** `PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md` (v2.1) + prototipo `truekeate_visual_design.html` (Antigravity Brain)
> **Fecha:** 28/08/2026 · **Estado:** Propuesta para revisión (sin aplicar aún)

---

## 1. Diagnóstico del estado actual (lo que YA está implementado)

El proyecto ya incorpora la base del Design System 2.0 en commits recientes:

| Elemento | Estado actual | Archivo |
|---|---|---|
| Tokens de color (navy/teal/cyan/gold/crimson/coral) | ✅ Implementados | `web/app/globals.css` (`@theme inline`) |
| Fuentes Inter + Montserrat | ✅ Implementadas | `web/app/layout.tsx` (`--font-inter`, `--font-montserrat`) |
| Botones pill (`btn-truekeat-primary`, `btn-gold-accent`, `btn-truekeat-secondary`) | ✅ Implementados | `web/app/globals.css` |
| Tarjetas `vault-card` (elevación + hover) | ✅ Implementado | `web/app/globals.css` |
| Geometría hexagonal (`hexagon-badge`, `clip-hexagon`) | ✅ Implementado | `web/app/globals.css` |
| Animaciones (`checkDraw`, loader orbital dual, `shakeError`) | ✅ CSS presente (sin componentes React) | `web/app/globals.css` |
| Inputs `input-truekeat` (52px, focus cian, success dorado, error) | ✅ Implementado | `web/app/globals.css` |
| Identidad `@username` en píldora con avatar hexagonal | ✅ Implementado | `web/components/UserMenu.tsx` |
| Notificaciones (dropdown dentro del menú) | ✅ Parcial (falta campana visible en la barra) | `web/components/UserMenu.tsx` |

---

## 2. Brechas detectadas (DELTAS a implementar)

### 🔴 2.1. Paleta antigua "Velvety" remanente (prioridad alta)

A pesar de los tokens, **~53 usos** de la paleta anterior persisten en páginas y componentes:

| Archivo | Elementos con paleta vieja |
|---|---|
| `web/app/page.tsx` (landing) | `indigo-*`, `#00E5FF`, `font-serif` (hero, features, CTA) |
| `web/app/(platform)/dashboard/page.tsx` | `#0A1128`, `#00E5FF`, `#00B4D8`, `#1C2541`, `font-serif` |
| `web/app/(platform)/items/page.tsx` | `#0A1128`, `#00E5FF`, `#1C2541` |
| `web/app/(platform)/profile/page.tsx` | `indigo-*` en inputs/badges/reputación |
| `web/app/(platform)/governance/socio-voting` · `treasury` · `company/*` | Links `indigo-600` |
| `web/components/BottomNav.tsx` | `#FAF8F5`, `#D4A373` (beige viejo), botón central circular |
| `web/components/PwaInstallBanner.tsx` | `#2D2A26`, `#D4A373` |
| Varias páginas | `font-serif` (Playfair/Georgia) en títulos — la propuesta exige Montserrat (`font-heading`) |

**Acción:** migrar todo a tokens oficiales (`navy-800/900`, `teal-500`, `cyan-400`, `gold-500`, `crimson-500`, `coral-500`) y reemplazar `font-serif` por `font-heading`.

### 🔴 2.2. Barra superior móvil con `@username` + campana de notificaciones

**Objetivo del prototipo:** `[⇄ TrueKeat☑] · [⬡ @usuario ✓] [🔔 n]`

- **Campana de notificaciones visible** con badge de contador en la top bar (móvil y desktop). Hoy las notificaciones solo viven dentro del menú de `UserMenu`.
  - Nuevo componente `web/components/NotificationBell.tsx` que consulta `GET /api/notifications?user=` y marca lectura (`POST /api/notifications`).
- **Refinar la cápsula de identidad** en móvil: avatar hexagonal con gradiente teal→cyan, `@username` en `font-heading` y check dorado `✓` (estilo del prototipo §4.1). El `UserMenu` ya tiene la píldora; se ajusta su estilo y se compacta en móvil.

### 🔴 2.3. Navegación inferior flotante (BottomNav) — rediseño completo

**Prototipo §4.5:** barra flotante (`inset-x-3 bottom-3 rounded-3xl backdrop-blur shadow-lg`), botón central **hexagonal elevado** con gradiente navy→teal, y 5 destinos:

| Ítem propuesto | Ruta | Ítem actual |
|---|---|---|
| 🏠 Inicio | `/` | Inicio |
| 📦 Catálogo | `/items` | Catálogo |
| ⇄ **Trueke Central** (botón central elevado) | `/operations` | Publicar `/items/new` (circular beige) |
| 🏛️ Socios / Gobernanza | `/governance/socio-voting` | Truekes |
| 👤 Mi Perfil & Identidad | `/profile` | Identidad |

**Decisión de UX a validar:** se sustituye "Publicar" por "Trueke Central" (hexágono ⇄) y "Identidad" por "Perfil". `Publicar artículo` queda accesible desde Catálogo (`/items` → botón) y Perfil; `Identidad` desde el menú de usuario. Si se prefiere conservar la acción central "Publicar", el hexágono central apuntará a `/items/new`.

### 🟠 2.4. Asset Card con tratamiento premium (RWA / Servicio / P2P)

**Prototipo §4.4:** en `web/components/AssetCard.tsx`:
- Borde lateral izquierdo dorado (`border-l-4 border-l-gold-500`) para activos **RWA** o de emisores certificados.
- Header con gradiente navy (`from-navy-800 to-navy-900`) + badge "🛡️ RWA TOKENIZADO".
- Avatar hexagonal del propietario + `@username` con `✓` dorado + etiqueta "N3 Certificado".
- Caja "🔁 Busca a cambio" (info de la contraprestación deseada) y CTA pill `btn-truekeat-primary` "Proponer Intercambio".

### 🟠 2.5. Sala de Negociación Smart Escrow (OperationCard)

**Prototipo §6:** en `web/components/OperationCard.tsx`:
- **Stepper visual** de estados: `(1) Creado → (2) En Tránsito → (3) Liquidado` con puntos activos (reutiliza `currentStep` ya calculado).
- Bloque de **Punto de Encuentro** (lugar + ventana de 10 min) cuando hay meetup.
- CTA principal destacado: "✍️ Firmar y Completar Trueke (EIP-712 sin gas)" con `.btn-truekeat-primary` y el botón dorado para acciones de certificación/arbitraje.

### 🟡 2.6. Microinteracciones como componentes React

El CSS existe pero no se usa en componentes:
- `web/components/HexLoader.tsx` — loader hexagonal orbital dual (`.loader-outer`/`.loader-inner` + hexágono central ⇄), sustituyendo spinners genéricos en estados de carga (crear operación, confirmar 2FA, procesar).
- Check animado (`.checkmark-anim`) en inputs con estado `success` y tras confirmaciones (mensajes "Operación creada", "2FA activado").

### 🟡 2.7. Completar tokens y utilidades en `globals.css`

- Variables de gradientes: `--gradient-primary-cta`, `--gradient-cyan-glow`, `--gradient-gold-badge`, `--gradient-card-border`.
- Variables de easing/timing: `--ease-natural`, `--ease-bounce`, `--ease-out`, `--duration-{fast,normal,page,slow}`.
- Radios: `--radius-pill: 9999px`, `--radius-card: 16px`, `--radius-modal: 24px`.
- Inputs a 56px de altura táctil (hoy 52px) según el prototipo §4.3.

### 🟡 2.8. Landing page (hero) con la nueva identidad

Migrar `web/app/page.tsx` a la Bóveda Digital: hero con gradiente navy→teal, badge dorado "Bóveda P2P", CTA pill `btn-truekeat-primary`, estadísticas con tokens nuevos y loader/check de la marca.

---

## 3. Plan por fases (con archivos concretos)

### Fase 1 — Base de tokens y barrido de paleta vieja
- `web/app/globals.css`: añadir gradientes, easing, radii; inputs 56px.
- Barrido `font-serif → font-heading` y `indigo-* / #00E5FF / #00B4D8 / #0A1128 / #FAF8F5 / #D4A373 / #2D2A26 → tokens` en: `page.tsx`, `dashboard`, `items`, `profile`, `socio-voting`, `treasury`, `company/finances`, `company/inventory`, `PwaInstallBanner.tsx`.

### Fase 2 — Identidad en barra superior (móvil + desktop)
- Nuevo `web/components/NotificationBell.tsx` (badge + dropdown).
- Refinar `web/components/UserMenu.tsx` (cápsula estilo prototipo) y `web/components/Header.tsx` (top bar compacta móvil: logo + cápsula + campana + menú).

### Fase 3 — Navegación inferior flotante
- Rediseño `web/components/BottomNav.tsx`: barra flotante con blur, botón central hexagonal elevado (gradiente navy→teal) y los 5 destinos del prototipo (validar decisión "Trueke Central" vs "Publicar").

### Fase 4 — Componentes de activos y operaciones
- `web/components/AssetCard.tsx`: tratamiento RWA premium (borde dorado, header gradiente, avatar hexagonal, caja "Busca a cambio", CTA).
- `web/components/OperationCard.tsx`: stepper de 3 estados, bloque de encuentro, CTA gasless prominente.

### Fase 5 — Microinteracciones
- Nuevo `web/components/HexLoader.tsx` + aplicación en flujos de carga/éxito; check animado en confirmaciones.

### Fase 6 — QA y regresión
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `cd ../sc && forge test`.
- Re-correr la suite E2E visual: `node scripts/e2e/run-e2e.mjs` (las suites A–C validan rendering y consola; los cambios de clase no deben romper los `getByText` — verificar textos clave de la landing/dashboard).
- Inspección manual en navegador (móvil 390px y desktop) de: header, bottom nav, asset card, sala de trueque, landing.

---

## 4. Riesgos y decisiones a validar

| Riesgo / Decisión | Impacto | Mitigación |
|---|---|---|
| **Cambio de destinos en BottomNav** ("Publicar"→"Trueke Central"; "Identidad"→"Perfil") | Usuarios acostumbrados a la ubicación actual | Validar con el dueño del producto; mantener accesos alternativos (Catálogo → Publicar; Menú → Identidad) |
| **`font-serif` → `font-heading`** puede cambiar la percepción de tamaños (Montserrat vs serif) | Impacto visual en H1/H2 grandes | Revisar tamaños en landing/dashboard tras el cambio; ajustar `tracking` (propuesta: -0.02em) |
| Barrido masivo de clases (≈50 usos) | Riesgo de romper estilos puntuales | Fase 1 aislada + re-correr E2E A-C al terminar cada fase |
| Notificaciones con badge en tiempo real | Coste de polling | Reutilizar el endpoint existente; polling cada 30-60s o refresco al navegar |

---

## 5. Criterios de aceptación ("listo" = 100%)

1. Cero usos de la paleta antigua (`#FAF8F5`, `#D4A373`, `#2D2A26`, `#00E5FF`, `#00B4D8`, `indigo-*` y `font-serif`) en páginas y componentes.
2. Top bar móvil muestra `@username ✓` + campana con badge.
3. BottomNav flotante con botón central hexagonal y rutas correctas.
4. AssetCard con borde dorado para RWA y avatar hexagonal.
5. OperationCard con stepper y CTA gasless.
6. `tsc`/`lint`/`vitest`/`forge test` y suite E2E A–C en verde tras cada fase.
