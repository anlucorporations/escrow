# Manual Técnico 07 — Frontend (Next.js 16 App Router)

> **Alcance**: implementación real del frontend de TrueKeate: rutas de `web/app`, contexto de Ethereum/MetaMask (RF-16), capa de contratos (ABIs), componentes de UI y sistema de diseño "Bóveda Digital Moderna" (RNF-08).
> **Fuentes leídas**: `web/app/**/*.{tsx,css}`, `web/components/*.tsx`, `web/lib/*.{ts,tsx}`, `web/lib/abis/*.json` (artefactos), `web/e2e/*.spec.ts`, `web/playwright.config.ts`, `web/public/`, `RepoTecnico/arquitectura_tecnica.md` §8 (diseño de referencia).
> **Convención**: referencias `ruta:línea` al código real. Lo que el código no implementa (o implementa de forma simulada) se marca **"pendiente de confirmar"** o se describe como estado actual.

---

## 1. Estructura de rutas reales (App Router)

### 1.1 Árbol de páginas implementado

| Ruta | Archivo | Estado |
|---|---|---|
| `/` | `web/app/page.tsx` | Landing pública (RF-14.1), funcional |
| `/suite` | `web/app/suite/layout.tsx` | Layout de la suite (barra superior + BottomNav) |
| `/suite/dashboard` | `web/app/suite/dashboard/page.tsx` | "Mi Trueke Central": dashboard por estado D28 (RF-14.2) |
| `/suite/inventario` | `web/app/suite/inventario/page.tsx` | **Placeholder** ("módulo en construcción — Ciclo 8") |
| `/suite/intercambio` | `web/app/suite/intercambio/page.tsx` | **Placeholder** |
| `/suite/gobernanza` | `web/app/suite/gobernanza/page.tsx` | **Placeholder** (Gobernanza/Socios) |
| `/suite/perfil` | `web/app/suite/perfil/page.tsx` | **Placeholder** |

- Las páginas `inventario`, `intercambio`, `gobernanza` y `perfil` son idénticas en estructura: una `Card` con título y el aviso "Este módulo se completa en la integración final (Ciclo 8). Acceso según rol y estado (RF-14)" (p. ej. `web/app/suite/inventario/page.tsx:1-12`).
- Rutas del diseño §8 que **no existen** en el código actual: `(suite)/historial`, `(suite)/empresa`, `(suite)/socio`, `(suite)/admin`, `subastas/`, `campanas/`, `intercambio/sala` → no prometidas; pendientes de ciclos posteriores.

### 1.2 Layout raíz (web/app/layout.tsx)

- Fuentes tipográficas con `next/font/google`: `Geist` (sans) y `Geist_Mono`, expuestas como variables CSS `--font-geist-sans/--font-geist-mono` (`web/app/layout.tsx:6-14`).
- Metadatos: título "TrueKeate — El Universo del Intercambio Descentralizado", descripción, icono `/brand/TrueKeate_logo.ico`, **manifest `/manifest.json` (PWA instalable — D40)** y `themeColor: "#1a2b4c"` (`web/app/layout.tsx:16-23`).
- El `body` envuelve toda la app en `<EthereumProvider>` (contexto de wallet) (`web/app/layout.tsx:25-35`).
- **PWA**: existe `web/public/manifest.json` y el icono de marca, pero **no se observó service worker** en `web/public/` → la instalabilidad completa (offline/actualizaciones) queda **pendiente de confirmar**.

### 1.3 Landing pública (web/app/page.tsx, RF-14.1)

- **Hero** con fondo de marca (`/hero/hero-1.jpg`), logo (`/brand/TrueKeate_logo.svg`), titular con `text-gradient-gold` y estadísticas de la plataforma (Usuarios +2,4k · Truekes +18k · Volumen $1,2M · Sin gas 100%) en una `Card destacada` (`web/app/page.tsx:23-86`).
- Sección **"¿Qué es un Trueke Digital?"** con 4 ventajas (Custodia atómica, Trueke sin gas, Reputación real, Economía circular) definidas en el arreglo `ventajas` (`web/app/page.tsx:12-17`, render 100-108).
- Sección **Filosofía** (Confianza recompensada, Seguridad por diseño, Sin barreras) (`web/app/page.tsx:112-138`).
- **CTA final** con `Button` y `Link` a `/suite/dashboard` (`web/app/page.tsx:141-151`).
- El botón "Comenzar a truequear" enlaza a `/suite/dashboard` (`web/app/page.tsx:46-48`). El hero usa `Image` con `fill` + `priority` (`web/app/page.tsx:25`).

### 1.4 Layout de la suite (web/app/suite/layout.tsx)

- Barra superior **sticky** (`z-30`) navy con el logotipo textual `⇄ TrueKeat☑` y el chip `@usuario ✓` (check on-chain, RNF-08.4) más el icono de notificaciones con badge `2` **fijo** (`web/app/suite/layout.tsx:10-26`).
- Contenido centrado `max-w-3xl` y `BottomNav` fija al pie (`web/app/suite/layout.tsx:28-31`).
- Nota: `@usuario` y el contador de notificaciones son **estáticos** (sin datos reales del backend).

### 1.5 Dashboard de la suite (web/app/suite/dashboard/page.tsx)

- Página **cliente** (`"use client"`, `web/app/suite/dashboard/page.tsx:1`) que consume `useEthereum()` para mostrar wallet y conectar MetaMask (`web/app/suite/dashboard/page.tsx:18`).
- **Escalera D28** visual: pasos `["INSCRITO", "VERIFICADO", "CERTIFICADO"]` (`web/app/suite/dashboard/page.tsx:13-15`) renderizados como pasos circulares con gradiente navy→teal para los alcanzados (`web/app/suite/dashboard/page.tsx:43-71`).
- **Estado simulado**: `const estado: EstadoD28 = "INSCRITO"` — el comentario aclara que en la integración real proviene de `/auth/session` + `/kyc/status` del backend (`web/app/suite/dashboard/page.tsx:20-22`). No hay llamada HTTP real al backend → pendiente de confirmar la integración.
- **Módulos por estado (RF-14.3–14.5)**: "Explorar ofertas" (siempre activo, Inscrito puede ver — RF-14.3), "Mis truekes" (requiere VERIFICADO, atenuado con `opacity-50` si no — RF-14.4), "Reputación" (requiere CERTIFICADO — RF-14.5) y "Punto de encuentro" (`web/app/suite/dashboard/page.tsx:74-96`).
- **Botón "Conectar MetaMask"** visible solo sin sesión de wallet (`web/app/suite/dashboard/page.tsx:35-39`).
- La wallet se muestra truncada `0x1234…abcd` (`web/app/suite/dashboard/page.tsx:32`).

---

## 2. Contexto de Ethereum / MetaMask (RF-16)

### 2.1 Provider de contexto (web/lib/ethereum.tsx)

- **Estado expuesto** (`EstadoEthereum`): `account`, `provider` (`BrowserProvider`), `signer` (`JsonRpcSigner`), `conectando`, `conectado = Boolean(account && signer)`, `conectar()`, `desconectar()` (`web/lib/ethereum.tsx:29-37`).
- Declaración global de `window.ethereum` con `on/removeListener` opcionales (`web/lib/ethereum.tsx:20-27`).

### 2.2 Conectar wallet (RF-16.1)

- `conectar()`: si no hay `window.ethereum`, alerta "MetaMask no está instalado. Instálalo o usa una wallet compatible (RF-16.1)" y devuelve `null` (`web/lib/ethereum.tsx:89-93`).
- Solicita cuentas con `eth_requestAccounts` y actualiza el estado vía `alCambiarCuentas` (`web/lib/ethereum.tsx:96-101`).
- La cuenta se guarda en minúsculas en `localStorage` con clave `'truekeate.account'` (`web/lib/ethereum.tsx:41,57-59`).

### 2.3 Auto-reconexión al refrescar (RF-16.2)

- En el `useEffect` de montaje, si hay cuenta previa en `localStorage` y `window.ethereum`, crea un `BrowserProvider`, obtiene el signer y restaura la cuenta; si la wallet está bloqueada, conserva la cuenta sin signer (`web/lib/ethereum.tsx:63-77`).

### 2.4 Cambios de cuenta en vivo

- Escucha `accountsChanged` de MetaMask; con lista vacía desconecta (limpia `localStorage`), con cuentas nuevas actualiza account/signer (`web/lib/ethereum.tsx:49-61, 79-87`).
- `desconectar()` limpia estado y `localStorage` (`web/lib/ethereum.tsx:110-114`).
- `useEthereum()` lanza error si se usa fuera del provider (`web/lib/ethereum.tsx:132-135`); el único consumidor actual es `web/app/suite/dashboard/page.tsx:8`.
- **Firma móvil (RF-16.3/D40)**: comentada como delegación a la wallet móvil en la PWA (`web/lib/ethereum.tsx:6-8`); no hay código de deep-link a MetaMask mobile → pendiente de confirmar.

---

## 3. Capa de contratos (ABIs y direcciones)

### 3.1 Registro y direcciones (web/lib/contracts.ts)

- `DIRECCIONES` mapea 5 contratos a direcciones del **despliegue de desarrollo en anvil (chain 31337)** con posibilidad de sobrescritura por entorno (`NEXT_PUBLIC_ESCROW`, `NEXT_PUBLIC_FACTORY`, `NEXT_PUBLIC_BRLT`, `NEXT_PUBLIC_REGISTRY`, `NEXT_PUBLIC_SUSCRIPCION`) (`web/lib/contracts.ts:20-30`). En producción se cargan desde el backend `GET /admin/contratos` (RF-13.1) según el comentario (`web/lib/contracts.ts:3-5`) — pendiente de confirmar.
- `ContratoInfo = { direccion, abi, iface? }` (`web/lib/contracts.ts:14-18`).
- Los ABIs JSON existen en `web/lib/abis/` (`Escrow.json`, `SmartAccount.json`, `SmartAccountFactory.json`, `SociosRegistry.json`, `BRLT.json`, `SuscripcionEmpresa.json`).
- `cargarAbis()` importa dinámicamente cada `./abis/<Nombre>.json` (con `catch` a `null`) y llena el registro `contratos` con su `Interface` (`web/lib/contracts.ts:39-52`); `getContrato(nombre)` lo consulta (`web/lib/contracts.ts:55-57`).
- **Estado real**: `cargarAbis()` **no es invocado por ninguna página o componente** (el comentario de `contracts.ts:34` dice "se invoca una vez al arrancar la app (ver layout)", pero `web/app/layout.tsx` no la importa). Consecuencia: en runtime el registro `contratos` está vacío hasta que alguien llame a `cargarAbis()` → helpers listos, integración pendiente.
- `web/lib/tipos.ts` solo define `ContractInfo` (`direccion`, `abi`) (`web/lib/tipos.ts:5-8`).

### 3.2 Tipos compartidos

- No hay tipados de eventos/estados del escrow en el frontend aún; `tipos.ts` es mínimo (ver `web/lib/tipos.ts:1-9`).

---

## 4. Componentes de UI (RNF-08.4)

### 4.1 Button (web/components/Button.tsx)

- Variantes con estilo por mapa `estilos` (`web/components/Button.tsx:12-22`):
  - `pill-primary`: cápsula con gradiente `135deg #1a2b4c → #2a9d8f`, sombra teal.
  - `outline-navy`: borde navy de 2 px, fondo transparente, hover `#f0fdf4`.
  - `gold-accent`: cápsula gradiente dorado `#d4af37 → #c5a065`, para certificación/arbitraje.
- Interacción `active:scale-95` y transición 150 ms (`web/components/Button.tsx:33-34`). Default `pill-primary` (`web/components/Button.tsx:29`).
- Es componente **cliente** (`"use client"`) por las clases dinámicas (`web/components/Button.tsx:1`).

### 4.2 Card (web/components/Card.tsx)

- Tarjeta blanca con `rounded-card`, sombra suave y hover con elevación `-translate-y-1.5` (`web/components/Card.tsx:22-34`).
- Variantes (`web/components/Card.tsx:17-20`):
  - `premium`: borde superior dorado sólido de 4 px vía clase `card-premium` (activos RWA certificados — D23).
  - `destacada`: borde superior con gradiente navy→teal→gold vía `gradient-card-border` y `pt-1`.

### 4.3 BottomNav (web/components/BottomNav.tsx)

- Barra de navegación inferior **fija y flotante** (`fixed bottom-4`, `z-40`, ancho `calc(100%-2rem)` máx. `max-w-md`) con `rounded-modal`, fondo blanco translúcido `bg-white/80` y `backdrop-blur-[12px]` (`web/components/BottomNav.tsx:22-25`).
- 5 ítems (`web/components/BottomNav.tsx:11-17`): Mercado `/suite/dashboard`, Inventario `/suite/inventario`, **Trueke Central `/suite/intercambio`** (central, botón hexagonal elevado `-translate-y-4` con gradiente dorado `#d4af37→#f3e5ab→#c5a065`), Socios `/suite/gobernanza`, Perfil `/suite/perfil`.
- Marca el ítem activo por `pathname?.startsWith(href)` con color teal (`web/components/BottomNav.tsx:27,44-47`).

### 4.4 StatusBadge (web/components/StatusBadge.tsx)

- Badges semánticos con 7 tonos (`navy`, `teal`, `cyan`, `gold`, `crimson`, `coral`, `smoke`) (`web/components/StatusBadge.tsx:9-20`).
- `tonoDeEstado(estado)` mapea estados de la escalera D28 y del escrow a tonos (`web/components/StatusBadge.tsx:22-33`):
  - VERIFICADO → teal; CERTIFICADO/COMPLETADO → gold; RECHAZADO/BLOQUEADO/ANULADO → crimson; APERTURA/PENDIENTE/EN_DISPUTA/RESOLUCION_SOCIOS → coral; INSCRITO/CREADO/ACTIVO/CUSTODIADO → navy; resto → smoke.
- Se usa en el dashboard para mostrar el estado D28 (`web/app/suite/dashboard/page.tsx:64`).

---

## 5. Sistema de diseño "Bóveda Digital Moderna" (RNF-08)

### 5.1 Tokens de color (RNF-08.1) — web/app/globals.css

- Paleta en `:root` (`web/app/globals.css:12-24`): `--navy-900: #0a1128`, `--navy-800: #1a2b4c`, `--teal-500: #2a9d8f`, `--cyan-400: #48cae4`, `--gold-500: #d4af37`, `--gold-300: #f3e5ab`, `--gold-600: #c5a065`, `--smoke: #f8f9fa`, `--crimson: #e63946`, `--coral: #f4a261`.
- **Gradientes** (RNF-08.2) (`globals.css:26-30`): `--gradient-cta` (navy→teal), `--gradient-cyan`, `--gradient-gold`, `--gradient-card-border`.
- **Curvas y duraciones** (RNF-08.5) (`globals.css:32-39`): `--ease-natural`, `--ease-bounce`, `--ease-out` y duraciones 150/300/400/600 ms.

### 5.2 Mapeo a utilidades Tailwind v4 (RNF-08.7)

- `@theme inline` convierte los tokens en utilidades (`web/app/globals.css:42-63`): `--color-navy-900/800`, `--color-teal-500`, `--color-cyan-400`, `--color-gold-500/300/600`, `--color-smoke`, `--color-crimson`, `--color-coral`; radios `--radius-pill: 9999px`, `--radius-card: 16px`, `--radius-modal: 24px` (RNF-08.4); fuentes `--font-sans`/`--font-display` (con fallback Inter/Roboto y Montserrat/Poppins).
- `body` con fondo `--smoke`, color navy y fuente sans (`globals.css:65-70`).

### 5.3 Utilidades propias y animación

- `.gradient-cta`, `.gradient-gold`, `.text-gradient-gold` (texto con gradiente dorado), `.card-premium` (borde superior dorado), `.anim-check-draw` con keyframes `checkDraw` (checkmark vectorial del `TrueKeat☑`, RNF-08.6) (`web/app/globals.css:72-99`).

### 5.4 Activos de marca (RF-19)

- En `web/public/`: `brand/` (logo SVG/ICO/título), `hero/` (imágenes), `manifest.json` (PWA — D40) y assets por defecto de Next.
- Consumidos en la landing (`web/app/page.tsx:25,30,59-61`) y en metadatos (`web/app/layout.tsx:20-21`).

---

## 6. Mapeo de acceso por estado (RF-14.3–14.8) — implementación actual

- La única página con gating real es el dashboard, con **lógica visual** (atenuación) según el índice de la escalera D28, no con protección de rutas:
  - INSCRITO: ve ofertas/catálogo (RF-14.3); "Mis truekes" atenuado ("Requiere estado Verificado.").
  - VERIFICADO: habilita trueques (máx. 3 activos RF-14.4) — texto en `dashboard/page.tsx:83`.
  - CERTIFICADO: habilita Reputación (RF-14.5) — `dashboard/page.tsx:89`.
- La escalera D28 se simula con `estado = "INSCRITO"` fijo (`web/app/suite/dashboard/page.tsx:22`); no existe ruteo de Empresa/Socio/Owner ni middleware de protección por rol en el frontend actual → pendiente de confirmar (integración C8).

---

## 7. Pruebas E2E del frontend (Playwright)

### 7.1 Configuración (web/playwright.config.ts)

- `testDir: "./e2e"`, timeout 30 s, `fullyParallel`, 1 reintento (`web/playwright.config.ts:9-13`).
- `baseURL: http://127.0.0.1:3000` con `BASE_URL` sobrescribible (`web/playwright.config.ts:15`).
- **2 proyectos** (RNF-02.3, móvil-first): `chromium` (Desktop Chrome) y `mobile-chrome` (Pixel 5) (`web/playwright.config.ts:19-22`).
- `webServer`: `npm run start` (servidor del build) en el puerto 3000 con `reuseExistingServer` (`web/playwright.config.ts:23-28`).
- Trazas y screenshots solo en fallo (`web/playwright.config.ts:16-17`).

### 7.2 Casos E2E

- `web/e2e/landing.spec.ts` (4 casos, RF-14.1): hero con marca y titular (`landing.spec.ts:9-15`), métricas (`17-22`), ventajas (`24-29`), CTA navega a la suite (`31-36`).
- `web/e2e/suite.spec.ts` (5 casos, RF-14.2): barra superior `@username` y `TrueKeat☑` (`suite.spec.ts:10-14`), escalera D28 (`16-23`), módulo bloqueado para INSCRITO con `opacity-50` (`25-31`), botón Conectar MetaMask sin sesión (RF-16) (`33-36`), navegación inferior con botón central (`38-44`).
- Total: **9 casos × 2 proyectos = 18 ejecuciones**; el resultado "18/18 verdes" de la Fase 4 está registrado en `RepoTecnico/estado_proyecto.md:47-58` (ver manual 08-pruebas).

---

## 8. Limitaciones y pendientes observados

- **Dashboard con estado D28 simulado** (`dashboard/page.tsx:20-22`): no consume `/auth/session` ni `/kyc/status` del backend.
- **Sin llamadas HTTP al backend** en ninguna página (no hay fetch de `/catalog`, `/reputacion`, etc.).
- **`cargarAbis()` sin invocar**: el registro de contratos queda vacío en runtime (`web/lib/contracts.ts:39-52`); no hay lectura on-chain funcional todavía.
- **4 módulos de la suite son placeholders** de una sola `Card` (inventario/intercambio/gobernanza/perfil).
- **Datos estáticos**: `@usuario`, notificaciones "2" y estadísticas de la landing son contenido estático/maqueta.
- **PWA (D40)**: manifest presente (`web/public/manifest.json`, referenciado en `layout.tsx:21`) sin service worker observado.
- **Firma móvil (RF-16.3)** y roles Empresa/Socio/Owner sin implementar en el frontend actual.
