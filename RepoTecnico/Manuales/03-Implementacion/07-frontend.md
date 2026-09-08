# Manual Técnico 07 — Frontend (Next.js 16 App Router)

> **Alcance**: implementación real (2026-09) del frontend de TrueKeate: rutas de `web/app` (suite
> integrada con backend), barra superior única y navegación por rol (PC/móvil), contexto de
> Ethereum/MetaMask con soporte móvil (RF-16/D40), control de acceso de la suite, capa de contratos
> (ABIs) y sistema de diseño "Bóveda Digital Moderna" (RNF-08).
> **Fuentes leídas**: `web/app/**`, `web/components/*.tsx`, `web/lib/*.{ts,tsx}`, `web/e2e/*.spec.ts`,
> `web/playwright.config.ts`, `web/public/`.
> **Convención**: referencias `ruta:línea` al código real; lo no implementado o no verificable se
> marca **pendiente de confirmar**.

---

## 1. Estructura de rutas reales (App Router)

### 1.1 Árbol de páginas de la suite

| Ruta | Archivo | Contenido real |
|---|---|---|
| `/` | `web/app/page.tsx` | Landing pública (RF-14.1), funcional |
| `/suite` | `web/app/suite/layout.tsx` | Layout: `TopBar` + `SuiteGuard` + `BottomNav` |
| `/suite/dashboard` | `web/app/suite/dashboard/page.tsx` | "Mi Trueke Central": escalera D28 y accesos rápidos |
| `/suite/mercado` | `web/app/suite/mercado/page.tsx` | Catálogo de ofertas abiertas (observable con wallet) |
| `/suite/intercambio` | `web/app/suite/intercambio/page.tsx` | Crear/completar trueques (requiere Verificado/Certificado) |
| `/suite/inventario` | `web/app/suite/inventario/page.tsx` | "💼 Mi Inventario": publicar/despublicar artículos |
| `/suite/gobernanza` | `web/app/suite/gobernanza/page.tsx` | "🏛️ Gobernanza / Socios": propuestas y votación (Socio/Owner) |
| `/suite/disputas` | `web/app/suite/disputas/page.tsx` | "⚖️ Disputas" (certificado ve; Socio resuelve) |
| `/suite/finanzas` | `web/app/suite/finanzas/page.tsx` | "💰 Finanzas": saldos propios/globales (Empresa/Socio) |
| `/suite/admin` | `web/app/suite/admin/page.tsx` | **Panel del Owner** (RF-13.1) — ver manual 08-Suite-Sistemas |
| `/suite/perfil` | `web/app/suite/perfil/page.tsx` | "👤 Mi Perfil": @username, wallet completa, reputación |
| `/suite/inscripcion` | `web/app/suite/inscripcion/page.tsx` | Inscripción formal (correo/teléfono/dirección/GDPR) |
| `/suite/verificacion` | `web/app/suite/verificacion/page.tsx` | Verificación de correo (escalera D28, etapa 1) |
| `/suite/certificacion` | `web/app/suite/certificacion/page.tsx` | Certificación KYC/SBT (etapa 2) — manual 09-certificacion-sbt |
| `/help/manual` | `web/app/help/manual/page.tsx` | Sección de Ayuda con el manual (datos en `web/lib/manual-data.ts`) |

- La visibilidad de cada sección la decide la **matriz única** `web/lib/navegacion.ts` (§2.1), y el
  acceso real lo aplica `SuiteGuard` (§3) — ya **no** hay páginas placeholder de una sola Card.

### 1.2 Layout raíz (web/app/layout.tsx)

- Fuentes `next/font/google` `Geist`/`Geist_Mono` como variables `--font-geist-sans/mono`
  (`web/app/layout.tsx:7-15`); metadatos con icono `/brand/TrueKeate_logo.ico`, manifest PWA y
  `themeColor` (`web/app/layout.tsx:17-24`).
- `<EthereumProvider>` envuelve `<SesionProvider>` y toda la app (`web/app/layout.tsx:33-35`); el
  proveedor de sesión (`SesionProvider`) se define en `web/lib/sesion.tsx:76-77`.

### 1.3 Landing pública (web/app/page.tsx)

- Hero con marca (`/brand/TrueKeate_logo.svg`), titular y estadísticas; secciones "¿Qué es un Trueke
  Digital?", Filosofía y CTA a `/suite/dashboard` (estructura estable del manual anterior:
  `page.tsx:12-151`). La **única** ruta pública: `/suite/**` queda detrás del guard (§3).

---

## 2. Navegación única por rol (PC/móvil)

### 2.1 Matriz de secciones — `web/lib/navegacion.ts`

- `Seccion = { href, label, icono, central?, descripcion? }` (`navegacion.ts:9-16`); contexto de
  visibilidad `{ tipo, nivel, estado }` (`navegacion.ts:22-26`) con reglas derivadas
  (`ES_EMPRESA/SOCIO/CERTIFICADO/VERIFICADO`, `navegacion.ts:28-32`).
- **Fuente única** de qué ve cada usuario: cada sección declara `visible(ctx)`
  (`SECCIONES`, `navegacion.ts:35-100`). Ejemplos: Dashboard y Mercado siempre; Intercambio e
  Inventario exigen `ES_VERIFICADO`; Gobernanza y Admin solo `SOCIO`; Disputas `CERTIFICADO|SOCIO`;
  Finanzas `EMPRESA|SOCIO`.
- `seccionesPara(ctx)` filtra y ordena (`navegacion.ts:103-105`);
  `seccionesParaMovil(ctx, max=5)` garantiza la **central** (Intercambio) y agrupa el excedente en
  "Más" (`navegacion.ts:111-127`).

### 2.2 PC (≥lg): barra superior ÚNICA — `web/components/TopBar.tsx`

Decisión del director (2026-09): la antigua fila de secciones (`TopNavPc`) y el menú de usuario se
**unificaron en una sola barra** `[marca] · [secciones] · [usuario]` (`TopBar.tsx:5-11,83-285`).

#### 2.2.1 Marca = logo + título (`TopBar.tsx:87-108`)

- Enlace a `/suite/dashboard` con **dos imágenes**: `TrueKeate_logo.svg` (h-7) y `TrueKeate_titulo.svg`
  (oculta en pantallas <sm; h-[18px]/lg:h-[22px]); al ser monocromas negras se invierten con
  `brightness-0 invert` sobre la barra navy (`TopBar.tsx:93-107`).

#### 2.2.2 Secciones SOLO iconos con tooltip (`TopBar.tsx:110-156`)

- `<nav>` visible solo `lg:flex`, con un `<Link>` por sección: **solo el icono** (emoji) en botón
  circular `h-9 w-9`; el **título aparece como tooltip** (`title`) y `aria-label`; activo =
  fondo `bg-gold-500 text-navy-900`, inactivo `text-white/75` (`TopBar.tsx:140-154`).
- Sin wallet: texto "Conecta tu billetera…" (`TopBar.tsx:117-120`); conectada sin inscribir: solo el
  icono 🛒 Mercado + aviso (`TopBar.tsx:121-138`).

#### 2.2.3 Menú de usuario: @username·nivel y tipo·medalla (`TopBar.tsx:158-283`)

- Botón del menú: **solo** `👤` + **emoji de estado** minimalista (INSCRITO 🟡 · VERIFICADO 🟢 ·
  CERTIFICADO 🥇, `TopBar.tsx:29-33,180-188`).
- Desplegable (`w-72`, cierra al hacer clic fuera, `TopBar.tsx:54-60,191-280`):
  - Título: `@username` **· nivel D12** (dorado) (`TopBar.tsx:199-205`); sin username → wallet corta
    `0x1234…abcd` (`TopBar.tsx:42-44,66-70`).
  - Subtítulo: `tipo` **· medalla de reputación** (🥉/🥈/🥇 con etiqueta, `TopBar.tsx:36-40,206-210`).
  - Acciones: "Completar inscripción" si no inscrito (`TopBar.tsx:218-244`), Mi perfil,
    Gobernanza/Socios, Ayuda/Manuales y **"⏻ Desconectar billetera"** (desconecta + cierra sesión,
    `TopBar.tsx:268-277`).

### 2.3 Móvil (<lg): barra inferior flotante — `web/components/BottomNav.tsx`

- Fija y flotante (`fixed bottom-4`, `z-40`, `bg-white/80 backdrop-blur-[12px]`, `rounded-modal`,
  `lg:hidden`) (`BottomNav.tsx:44-47`), con ranuras rellenas por rol desde `seccionesParaMovil`
  (`BottomNav.tsx:28-36`).
- **Botón central hexagonal** dorado (Intercambio, `-translate-y-4`, gradiente `#d4af37→#f3e5ab→#c5a065`,
  `BottomNav.tsx:49-61`); ranura "⋯ Más" para el excedente (`BottomNav.tsx:77-105`).
- Sin wallet/no inscrito solo muestra Mercado (`BottomNav.tsx:33-36`).

---

## 3. Control de acceso de la suite — `SuiteGuard` y sesión

### 3.1 Guard de la suite (`web/components/SuiteGuard.tsx`)

Reglas del director (`SuiteGuard.tsx:3-13`):

1. **Sin billetera** → `PantallaConectar` (la suite es privada; solo la landing es pública).
2. **Conectada pero no inscrita** → solo `/suite/mercado` y `/suite/inscripcion`
   (`RUTAS_SIN_INSCRIPCION`, `SuiteGuard.tsx:27`); el resto muestra `PantallaRequiereInscripcion`.
3. **Inscrita** → **login único**: sin token de sesión se muestra `PantallaIniciarSesion` (una sola
   firma, nunca por página) (`SuiteGuard.tsx:176-177`); con token, se valida la URL contra
   `seccionesPara(usuario)` + rutas de proceso `/suite/verificacion` y `/suite/certificacion`
   (`SuiteGuard.tsx:181-193`); si no coincide → `PantallaSinPermiso` (`:199-218`).

### 3.2 Tarjetas de conexión según dispositivo (`SuiteGuard.tsx:29-87`)

- `errorConexion === 'app_movil'` (móvil sin extensión): tarjeta con **dos vías**: botón
  "📲 Abrir en la app de MetaMask" (deep link, §4.3) o pasos del **navegador interno** de la wallet
  con la URL del host actual (`SuiteGuard.tsx:49-68`).
- `errorConexion === 'sin_wallet'` (escritorio sin extensión): tarjeta para instalar la extensión
  (`SuiteGuard.tsx:69-77`).

### 3.3 Sesión y login único — `web/lib/sesion.tsx`

- `EstadoAcceso` = `sinWallet | verificando | conectadoNoInscrito | { inscrito, usuario }`
  (`sesion.tsx:40-44`); `refrescar(wallet?)` consulta `GET /auth/estado` con la wallet **explícita**
  (evita depender del estado de React, `sesion.tsx:93-119`); `autenticar()` firma EIP-191 el mensaje
  `'TrueKeate: iniciar sesión'` contra `POST /auth/session` y guarda el **token global**
  (`sesion.tsx:147-180`); `inscribir()` llama `POST /auth/register` (`sesion.tsx:187-197`).
- `BotonConectarLogin` (`web/components/BotonConectarLogin.tsx`) encadena: conectar wallet →
  `refrescar(cuenta)` → si está inscrito, `autenticar()` (una firma).
- El token de sesión persiste (backend `sesiones` con expiración 24 h — ver Manual 06) para que el
  login único no se repita al navegar entre secciones.

---

## 4. Contexto de Ethereum / wallet (web/lib/ethereum.tsx)

### 4.1 Estado expuesto

`EstadoEthereum` incluye `account`, `provider`, `signer`, `conectando`, `conectado = Boolean(account)`,
`conectar()`, `desconectar()`, `errorConexion` (`'sin_wallet' | 'app_movil' | null`),
`abrirEnAppWallet()` y `esMovil` (detección por user-agent) (`ethereum.tsx:34-56,229-246`).

### 4.2 EIP-6963 (wallets que se anuncian por evento)

- `aguardarProveedor6963(1200)`: escucha `eip6963:announceProvider` y emite
  `eip6963:requestProvider`; adopta el primer provider anunciado si no hay `window.ethereum`
  (`ethereum.tsx:60-75`). Un `useEffect` global hace lo mismo al arrancar (`ethereum.tsx:126-138`).
- `conectar()` usa ese provider anunciado antes de rendirse; si no hay ninguno fija
  `errorConexion = esMovil ? 'app_movil' : 'sin_wallet'` (`ethereum.tsx:166-181`).

### 4.3 Conexión en móvil: deep link a la app de la wallet

- `abrirEnAppWallet()` navega a `https://metamask.app.link/dapp/<host>` usando
  `window.location.host` (fallback hardcodeado del Cloud Run) (`ethereum.tsx:201-206`). Así la dApp se
  abre dentro del **navegador interno de MetaMask**, que sí inyecta `window.ethereum` (RF-16/D40).
  Detalle operativo en `07-Wallets-y-Cuentas/09-conexion-wallet-movil.md`.
- WalletConnect universal queda documentado como mejora futura (requiere projectId) —
  `RepoTecnico/estado_proyecto.md:493-500`.

### 4.4 Auto-reconexión y cambios en vivo

- Al montar restaura la cuenta de `localStorage` (`truekeate.account`) creando un `BrowserProvider`
  nuevo (`ethereum.tsx:141-154`); escucha `accountsChanged` y actualiza cuenta/signer
  (`ethereum.tsx:157-164`); `fijarCuenta` siempre crea provider/signer frescos (`ethereum.tsx:92-122`).

### 4.5 Desconexión real (revocación de permisos)

- `desconectar()` limpia estado y `localStorage` y además pide a MetaMask
  `wallet_revokePermissions({ eth_accounts })` para que el siguiente `eth_requestAccounts` muestre el
  selector (fix "reconectar con OTRA wallet") (`ethereum.tsx:208-227`).

---

## 5. Capa de contratos (web/lib/contracts.ts)

- `DIRECCIONES` mapea 5 contratos con override `NEXT_PUBLIC_*` (Escrow, SmartAccountFactory, BRLT,
  SociosRegistry, SuscripcionEmpresa) apuntando al despliegue GCP anvil 31337
  (`contracts.ts:20-30`). En producción el Panel del Owner las muestra vía `GET /admin/contratos`
  (RF-13.1); el frontend no lee on-chain todavía.
- `cargarAbis()` importa los ABIs de `web/lib/abis/<Nombre>.json` (`contracts.ts:39-52`) pero **no es
  invocado por ninguna página/componente** (verificado con búsqueda en `web/app` y `web/components`):
  el registro `contratos` queda vacío en runtime → helpers listos, integración **pendiente de confirmar**.

---

## 6. Componentes de UI (RNF-08.4)

### 6.1 Button / Card / StatusBadge

- `Button` (`web/components/Button.tsx`): variantes `pill-primary` (gradiente navy→teal), `outline-navy`
  y `gold-accent` (gradiente dorado); `active:scale-95` (`Button.tsx:12-34`).
- `Card` (`web/components/Card.tsx`): variantes `premium` (borde dorado) y `destacada`
  (borde gradiente navy→teal→gold).
- `StatusBadge` (`web/components/StatusBadge.tsx`): `tonoDeEstado` mapea estados D28/escrow a 7 tonos
  (VERIFICADO→teal, CERTIFICADO/COMPLETADO→gold, RECHAZADO/BLOQUEADO/ANULADO→crimson, …).

### 6.2 Navegación y guard

- `TopBar`, `BottomNav`, `SuiteGuard`, `BotonConectarLogin` — descritos en §2-§3.
- Otros componentes de la suite: `MapaWidget` (puntos de encuentro en Intercambio), `KycPendientesOwner`
  (ver manual 09), `StatusBadge`.

---

## 7. Sistema de diseño "Bóveda Digital Moderna" (RNF-08)

- Tokens de color en `:root` (`web/app/globals.css:12-26`): `--navy-900: #0a1128`, `--navy-800: #1a2b4c`,
  `--teal-500: #2a9d8f`, `--cyan-400: #48cae4`, `--gold-500/300/600`, `--smoke`, `--crimson`,
  `--coral`; gradientes en `globals.css:27-30`.
- Mapeo Tailwind v4 con `@theme inline` (`globals.css:42-63`): `--color-*`, radios
  `--radius-pill: 9999px`, `--radius-card: 16px`, `--radius-modal: 24px` y fuentes `--font-sans/
  --font-display`; `body` sobre `--smoke` (`globals.css:65-70`).
- Utilidades propias: `.gradient-cta`, `.gradient-gold`, `.text-gradient-gold`, `.card-premium`,
  `.anim-check-draw` + `@keyframes checkDraw` (checkmark del `TrueKeat☑`) (`globals.css:72-100`).

---

## 8. Pruebas E2E (Playwright)

### 8.1 Configuración (`web/playwright.config.ts`)

- `testDir: ./e2e`, 2 proyectos `chromium` y `mobile-chrome` (Pixel 5); `baseURL` `http://127.0.0.1:3000`
  con `BASE_URL` sobrescribible; `webServer` con `npm run start` (`playwright.config.ts:9-28`).

### 8.2 Suites E2E actuales (`web/e2e/*.spec.ts`)

| Spec | Cubre |
|---|---|
| `landing.spec.ts` | Hero, métricas, ventajas y CTA de la landing (RF-14.1) |
| `suite.spec.ts` | Barra superior, escalera D28, módulos por estado y navegación inferior |
| `suite-escalera.spec.ts` | Escalera D28 en la suite |
| `suite-pantallas.spec.ts` | Pantallas de la suite (contenido por sección) |
| `login-unico.spec.ts` | Login único: la firma se pide solo al acceder, el token persiste |
| `desconectar-reconectar.spec.ts` | Desconexión real y reconexión con OTRA wallet |

Registro de ejecuciones en producción (E2E 4/4 del flujo SBT, suites de navegación, validación móvil
real) en `RepoTecnico/estado_proyecto.md:442-507`.

---

## 9. Limitaciones y pendientes observados (2026-09)

1. **`cargarAbis()` sin invocar**: el registro `contratos` del frontend queda vacío en runtime
   (`web/lib/contracts.ts:39-52`); no hay lecturas on-chain desde el navegador todavía.
2. **Estados de la escalera por página**: `dashboard` muestra módulos atenuados por estado; la
   verdad del estado la aplica el backend (`/auth/estado`, `/kyc/status`) — el frontend no decide.
3. **WalletConnect universal** (mobile, fuera de MetaMask): documentado como mejora futura con
   projectId (`estado_proyecto.md:500`).
4. **Tooltip/`title`**: en táctil (tablet en modo ≥lg) el tooltip de iconos no se muestra de forma
   nativa — la accesibilidad por `aria-label` está presente; mejora pendiente de confirmar.
5. **Service worker/PWA offline**: manifest presente (`web/public/manifest.json`); instalabilidad
   completa (offline) **pendiente de confirmar** (no se observó service worker).
