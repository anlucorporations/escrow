# Manual técnico · Stack Frontend (Next.js 16)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: frontend de TrueKeate — Next.js 16
> App Router, TypeScript, Tailwind v4, ethers v6 y PWA instalable (D40/RNF-02.3).
> Referencias `ruta:línea` al código real. Lo no verificable se marca **pendiente de confirmar**.

---

## 1. Resumen del stack frontend

| Componente | Valor verificado | Fuente |
|---|---|---|
| Framework | **Next.js 16.3.4** (App Router) | `web/package.json:13` (rangos) · lockfile: 16.3.4 exacta · `web/README.md:3` |
| Lenguaje | **TypeScript** (^5; lockfile 5.9.3) | `web/package.json:26` |
| Estilos | **Tailwind CSS v4** (^4; lockfile 4.3.3) + `@tailwindcss/postcss` | `web/package.json:19,25` |
| Blockchain cliente | **ethers v6** (6.17.0) | `web/package.json:12` |
| React | **19.2.8** (react/react-dom) | `web/package.json:14-15` |
| UI/E2E | Playwright ^1.62.1 (lockfile 1.62.1) | `web/package.json:18`, `web/playwright.config.ts` |
| PWA | Manifest instalable (D40); sin service worker verificado | `web/public/manifest.json`, `web/app/layout.tsx:21` |

Referencias de diseño: stack fijado por RT-01/D1/RT-04 (`arquitectura_tecnica.md:419-423`) y
sistema de diseño RNF-08 "Bóveda Digital Moderna" (`arquitectura_tecnica.md:425-431`).

---

## 2. Next.js 16 (App Router)

### 2.1 Dependencias y scripts

`web/package.json`:

- Scripts: `dev` (next dev), `build` (next build), `start` (next start), `lint` (eslint)
  (`package.json:6-9`).
- Runtime: `ethers ^6.17.0`, `next 16.3.4`, `react/react-dom 19.2.8` (`package.json:12-15`).
- Dev: `@playwright/test`, `@tailwindcss/postcss ^4`, `@types/*`, `eslint ^9`,
  `eslint-config-next 16.3.4`, `tailwindcss ^4`, `typescript ^5` (`package.json:18-27`).

### 2.2 Configuración

- `web/next.config.ts` — objeto mínimo sin opciones extra (`next.config.ts:1-7`).
- `web/tsconfig.json` — `strict: true`, `jsx: react-jsx`, `resolveJsonModule`, alias `@/*` → `./*`
  (`tsconfig.json` paths), incluye `**/*.ts(x)`, `.next/types`.
- `web/postcss.config.mjs` y `web/eslint.config.mjs` presentes en el árbol.

### 2.3 Layout raíz (`web/app/layout.tsx`)

- Metadata de la app: título "TrueKeate — El Universo del Intercambio Descentralizado"
  (`layout.tsx:16-19`); favicon `/brand/TrueKeate_logo.ico` (`layout.tsx:20`); **manifest PWA**
  `/manifest.json` (`layout.tsx:21`); `themeColor: "#1a2b4c"` (`layout.tsx:22`).
- Fuentes Geist/Geist Mono de `next/font/google` (`layout.tsx:6-14`).
- Envuelve toda la app en `<EthereumProvider>` (`layout.tsx:32`; componente en `web/lib/ethereum.tsx`).

---

## 3. Rutas y páginas reales (`web/app/`)

### 3.1 Landing pública — `/` (`web/app/page.tsx`, 154 líneas)

- Objetivo documentado: landing pública RF-14.1 sin autenticación (`page.tsx:1-6`).
- Hero con assets de marca (`/hero/hero-1.jpg`, `/brand/TrueKeate_logo.svg`,
  `/brand/TrueKeate_titulo.svg`) (`page.tsx:23-36`).
- Ventajas del Trueke Digital (custodia atómica, trueke sin gas, reputación real, economía
  circular) (`page.tsx:12-17`).
- CTA "Comenzar a truequear" → `/suite/dashboard` (`page.tsx:46-48`).

### 3.2 Suite por estado/rol — `/suite` (`web/app/suite/`)

Layout de la suite (`web/app/suite/layout.tsx`): barra superior con marca `TrueKeat☑` y badge
`@usuario ✓` (`layout.tsx:10-26`), contenido central y `BottomNav` (`layout.tsx:28-30`).

| Ruta | Página (archivo) | Estado real verificado |
|---|---|---|
| `/suite/dashboard` | `web/app/suite/dashboard/page.tsx` (99 líneas) | **Implementada**: conexión MetaMask, escalera D28 y módulos por estado (RF-14.3-14.5) |
| `/suite/intercambio` | `web/app/suite/intercambio/page.tsx` (12 líneas) | **Placeholder**: "módulo en construcción — se completa en el Ciclo 8" (`intercambio/page.tsx:1`) |
| `/suite/inventario` | `web/app/suite/inventario/page.tsx` (12 líneas) | **Placeholder**: ídem Ciclo 8 (`inventario/page.tsx:1`) |
| `/suite/gobernanza` | `web/app/suite/gobernanza/page.tsx` (12 líneas) | **Placeholder**: ídem Ciclo 8 (`gobernanza/page.tsx:1`) |
| `/suite/perfil` | `web/app/suite/perfil/page.tsx` (12 líneas) | **Placeholder**: ídem Ciclo 8 (`perfil/page.tsx:1`) |

### 3.3 Contenido del dashboard (única página funcional de la suite)

`web/app/suite/dashboard/page.tsx`:

- Estado simulado de la escalera D28: `const estado: EstadoD28 = "INSCRITO"` con comentario "En una
  integración real el estado proviene del backend (/auth/session + /kyc/status). Aquí se simula
  para demostrar el render por estado de la escalera (D28)" (`dashboard/page.tsx:20-22`).
- Botón "Conectar MetaMask" cuando no hay cuenta (`dashboard/page.tsx:35-39`).
- Visualización de la escalera INSCRITO → VERIFICADO → CERTIFICADO (`dashboard/page.tsx:43-71`).
- Módulos habilitados/atenuados según estado (Explorar ofertas, Mis truekes — máx. 3 activos
  RF-14.4 —, Reputación, Punto de encuentro) (`dashboard/page.tsx:74-96`).

> La integración real con el backend (sesión + KYC) es **pendiente de confirmar**; hoy el estado
> se simula en el cliente (`dashboard/page.tsx:20-22`).

### 3.4 Navegación (BottomNav)

`web/components/BottomNav.tsx:11-17` — rutas de la navegación inferior flotante:

| Ítem | Ruta | Ícono/rol |
|---|---|---|
| Mercado | `/suite/dashboard` | 🏠 |
| Inventario | `/suite/inventario` | 💼 |
| **Trueke** (central, hexagonal dorado) | `/suite/intercambio` | ⇄ |
| Socios | `/suite/gobernanza` | 🏛️ |
| Perfil | `/suite/perfil` | 👤 |

---

## 4. TypeScript

- `strict: true` y compilación sin emitir (`noEmit`) (`web/tsconfig.json`).
- Tipos compartidos en `web/lib/tipos.ts`: `ContractInfo { direccion: string; abi: unknown[] }`
  (`tipos.ts:5-9`).
- Tipado de ethers en el contexto: `BrowserProvider`, `JsonRpcSigner`, `Eip1193Provider`
  (`web/lib/ethereum.tsx:18`).
- El ABIs JSON se tipan con `resolveJsonModule` (`tsconfig.json`) e import dinámico
  (`web/lib/contracts.ts:39-52`).

---

## 5. Tailwind v4

### 5.1 Entrada de estilos (`web/app/globals.css`)

- `@import "tailwindcss";` (`globals.css:1`) — sintaxis Tailwind v4.
- Tokens de diseño en `:root` (`globals.css:12-40`): paleta RNF-08.1 (navy `#0a1128/#1a2b4c`,
  teal `#2a9d8f`, cyan `#48cae4`, gold `#d4af37` y derivados, smoke `#f8f9fa`, crimson `#e63946`,
  coral `#f4a261`), gradientes RNF-08.2 y curvas/duraciones RNF-08.5.
- Mapeo a utilidades con `@theme inline` (`globals.css:42-63`): `--color-navy-900`,
  `--color-gold-500`, etc., radios `pill/card/modal` (RNF-08.4) y fuentes `--font-sans` /
  `--font-display`.
- Utilidades propias: `.gradient-cta`, `.gradient-gold`, `.text-gradient-gold`, `.card-premium`
  (borde superior dorado para RWA) y animación `checkDraw` (`globals.css:73-99`).

### 5.2 Componentes con tokens

`Button`, `Card`, `BottomNav`, `StatusBadge` usan clases de los tokens:
`bg-navy-900`, `border-gold-500/60`, `rounded-pill`, `rounded-modal`, `backdrop-blur-[12px]`
(p. ej. `web/components/BottomNav.tsx:24`, `web/components/StatusBadge.tsx:12-20`).

---

## 6. Sistema de diseño RNF-08 ("Bóveda Digital Moderna")

- Referencia de diseño: `arquitectura_tecnica.md:425-431` y `RepoTecnico/PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md`.
- Paleta verificada en CSS (ver §5.1).
- Componentes reales en `web/components/`:

| Componente | Archivo | Función |
|---|---|---|
| `Button` | `web/components/Button.tsx` | Variantes pill-primary / outline-navy / gold-accent |
| `Card` | `web/components/Card.tsx` | Tarjetas (variante "premium" RWA con borde dorado) |
| `BottomNav` | `web/components/BottomNav.tsx` | Nav inferior flotante con botón central hexagonal dorado (RNF-08.5) |
| `StatusBadge` | `web/components/StatusBadge.tsx` | Badge semántico; `tonoDeEstado` mapea estados D28/escrow a colores (`StatusBadge.tsx:23-33`) |

- Assets de marca (RF-19): `web/public/brand/` (TrueKeate_logo/titulo en SVG/PNG/ICO) y
  `web/public/hero/` (hero-1..3.jpg) — usados por la landing (`page.tsx:25-36`) y el favicon
  (`layout.tsx:20`).

---

## 7. ethers v6 en el cliente

### 7.1 Contexto Ethereum (`web/lib/ethereum.tsx`, 136 líneas)

- `"use client"` (`ethereum.tsx:1`); declara `window.ethereum` como `Eip1193Provider` con
  `on/removeListener` (`ethereum.tsx:20-27`).
- Estado expuesto: `account`, `provider`, `signer`, `conectando`, `conectado`, `conectar`,
  `desconectar` (`ethereum.tsx:29-37`).
- **Auto-reconexión al refrescar** (RF-16.2): efecto que relee la cuenta de `localStorage`
  (`truekeate.account`, `ethereum.tsx:41`) y reconstruye `BrowserProvider` (`ethereum.tsx:64-77`).
- Escucha de `accountsChanged` de MetaMask (`ethereum.tsx:80-87`).
- `conectar()` usa `eth_requestAccounts` y guarda la cuenta en localStorage (`ethereum.tsx:89-108`).
- Hook `useEthereum()` para consumir el contexto (`ethereum.tsx:132-136`).
- Comentario de cabecera: "En móvil la firma se delega a la wallet móvil (MetaMask mobile) en la
  PWA instalable (D40)" (`ethereum.tsx:6-7`).

### 7.2 Contratos y ABIs (`web/lib/contracts.ts`)

- `DIRECCIONES` con direcciones del despliegue de desarrollo en anvil (chain 31337) y override por
  variables `NEXT_PUBLIC_ESCROW`, `NEXT_PUBLIC_FACTORY`, `NEXT_PUBLIC_BRLT`,
  `NEXT_PUBLIC_REGISTRY`, `NEXT_PUBLIC_SUSCRIPCION` (`contracts.ts:21-30`).
- ABIs reales presentes en `web/lib/abis/`: `Escrow.json`, `SmartAccount.json`,
  `SmartAccountFactory.json`, `BRLT.json`, `SociosRegistry.json`, `SuscripcionEmpresa.json`
  (listados del árbol). Se cargan dinámicamente con `cargarAbis()` (`contracts.ts:39-52`).
- Acceso por nombre con `getContrato(nombre)` (`contracts.ts:55-57`).
- Comentario de cabecera: "en producción se cargan desde el entorno (backend /admin/contratos —
  RF-13.1)" (`contracts.ts:4-5`).
- Nota: `DIRECCIONES` no incluye `FondoDeValor` ni `SmartAccount` individual → coherencia de
  direcciones con `backend/contratos.json` **pendiente de confirmar**.

### 7.3 El frontend no paga gas

- Los particulares firman intents EIP-712 y los envían al backend/relayer; solo las empresas envían
  transacciones directas pagando gas (`arquitectura_tecnica.md:480-481`; implementación del flujo
  en `backend/api/routes/truekes.js:19-36`).
- En el frontend actual **no se observa** código de construcción de intents EIP-712 hacia el
  relayer (el dashboard solo conecta la wallet) → **pendiente de confirmar** en la integración
  del Ciclo 8.

---

## 8. PWA instalable (D40 / RNF-02.3)

### 8.1 Manifest (`web/public/manifest.json`)

- `name`: "TrueKeate — Trueke Central", `short_name`: "TrueKeate" (`manifest.json:2-3`).
- `start_url`: `/suite/dashboard` (`manifest.json:5`); `display: standalone` (`manifest.json:6`);
  colores de fondo/tema (`manifest.json:7-8`); iconos logo PNG (983×881) e ICO
  (`manifest.json:9-20`).
- Referenciado desde el layout raíz (`web/app/layout.tsx:21`).

### 8.2 Alcance real de la PWA

- **Service worker**: no se encontró ningún `sw.js`/registro de service worker en `web/`
  (búsqueda en app/lib/components sin resultados) → la instalabilidad completa (offline/caché)
  es **pendiente de confirmar**; hoy solo existe el manifest.
- Firma móvil delegada a wallet (MetaMask mobile): decisión D40 (`requerimientos.md:400`) y
  `RF-16.3` (`requerimientos.md:181`); documentación de propuesta en
  `RepoTecnico/PROPUESTA_FRONTEND_MOVIL_PWA.md:1-6`.
- APK nativa: mejora futura (D40, `requerimientos.md:400`).

---

## 9. Pruebas E2E (Playwright)

### 9.1 Configuración (`web/playwright.config.ts`)

- `testDir: "./e2e"`, timeout 30 s, `fullyParallel`, 1 retry (`playwright.config.ts:9-12`).
- `baseURL`: `process.env.BASE_URL || "http://127.0.0.1:3000"` (`playwright.config.ts:15`).
- Proyectos: `chromium` (Desktop Chrome) y `mobile-chrome` (Pixel 5) para móvil-first RNF-02.3
  (`playwright.config.ts:19-22`).
- `webServer`: comando `npm run start`, puerto 3000, reutiliza servidor existente
  (`playwright.config.ts:23-28`).

### 9.2 Specs reales

- `web/e2e/landing.spec.ts` (37 líneas): valida hero/marca, métricas, ventajas y navegación del
  CTA a `/suite/dashboard` (`landing.spec.ts:8-36`).
- `web/e2e/suite.spec.ts`: barra superior `@username ✓`, escalera D28 y bloqueo del estado
  INSCRITO para crear trueques (`suite.spec.ts` describe).

---

## 10. Puertos y comandos

| Comando | Efecto | Puerto |
|---|---|---|
| `npm run dev` | Servidor de desarrollo Next.js | http://localhost:3000 (`web/README.md:32`) |
| `npm run build` | Build de producción (verificado: 9 páginas estáticas) | — (`web/README.md:33`) |
| `npm start` | Servir el build (también lo usa Playwright) | :3000 (`playwright.config.ts:24-27`) |
| `npx playwright test` | E2E (chromium + mobile-chrome) | baseURL :3000 (`playwright.config.ts:15`) |

---

## 11. Notas de verificación

- Páginas de la suite distintas de dashboard son placeholders del Ciclo 8 (ver §3.2).
- La integración real (sesión/KYC/intents EIP-712) y el service worker PWA son **pendiente de
  confirmar**.
- Las direcciones de contratos en `contracts.ts` son las del despliegue de desarrollo; en
  producción se cargan del entorno (`contracts.ts:4-5`).
