# Manual Técnico 07 · Wallets y cuentas — 09 · Conexión de wallet en móvil (deep link / navegador interno)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Datos auditados el 2026-09-08 (fix del director, validado en teléfono real — `RepoTecnico/estado_proyecto.md:490-507`).
> Referencias `ruta:línea` al código real. Lo no verificable se marca **"pendiente de confirmar"**.
>
> Base normativa: **RF-16** (`RepoTecnico/requerimientos.md:178-181`), **RF-16.3** (firma móvil) y
> **D40** (PWA instalable, `requerimientos.md:400`). Complementa a `01-instalacion-wallet.md`
> (escritorio) y `02-conexion-red-rpc.md` (red anvil 31337).

## Conexión de wallet en móvil

### 1. El problema: los navegadores móviles no tienen extensiones

#### 1.1 Diagnóstico (registrado por el director)

- En Android/iPhone **no existen extensiones de MetaMask**: `window.ethereum` no está inyectado y la
  app mostraba "MetaMask no está instalado…" (RF-16.1) bloqueando la suite en móvil
  (`estado_proyecto.md:490-494`).
- Solución adoptada (decisión del director, 2026-09-08): **deep link a la app de la wallet** +
  uso del **navegador interno** de la wallet (que sí inyecta el provider). WalletConnect universal
  queda documentado como mejora futura — requiere `projectId` de cloud.walletconnect.com
  (`estado_proyecto.md:493-494,500`).

#### 1.2 Mecanismo real en el código

| Pieza | Archivo | Rol |
|---|---|---|
| Detección móvil | `web/lib/ethereum.tsx:52-56` | `esDispositivoMovil()` por user-agent (`Android|iPhone|iPad|Mobile|Opera Mini|IEMobile`) |
| Espera EIP-6963 | `web/lib/ethereum.tsx:60-75` | Antes de rendirse espera 1,2 s a que una wallet se anuncie (`eip6963:announceProvider`) |
| Adopción del provider anunciado | `ethereum.tsx:126-138` | `useEffect` global: si no hay `window.ethereum`, adopta el `provider` anunciado por EIP-6963 |
| Deep link a la app | `ethereum.tsx:201-206` | `abrirEnAppWallet()` → `https://metamask.app.link/dapp/<host>` |
| Tarjeta móvil de ayuda | `web/components/SuiteGuard.tsx:49-68` | Dos vías: botón "Abrir en la app de MetaMask" o pasos del Navegador interno |

### 2. Cómo funciona la conexión en móvil

#### 2.1 Paso 1 — El usuario pulsa "Conectar" en el navegador

- En `/suite/**` sin wallet conectada, `SuiteGuard` muestra `PantallaConectar`
  (`web/components/SuiteGuard.tsx:29-87`): el botón llama a `BotonConectarLogin` (conectar + login
  único — `web/components/BotonConectarLogin.tsx`) → `conectar()` de `web/lib/ethereum.tsx:166-199`.

#### 2.2 Paso 2 — Sin `window.ethereum`, se espera un provider EIP-6963

- `conectar()` comprueba `window.ethereum`; si no existe llama `aguardarProveedor6963(1200)`
  (espera el evento `eip6963:announceProvider`, `ethereum.tsx:60-75,169-180`). Algunas apps de
  wallet (o el navegador interno de la propia wallet) anuncian su provider al cargar.
- Si no aparece ningún provider: en **móvil** fija `errorConexion = 'app_movil'` y en **escritorio**
  `'sin_wallet'` (en vez de la antigua `alert()`) (`ethereum.tsx:177-180`).

#### 2.3 Paso 3 — Deep link `metamask.app.link/dapp/<host>`

- `abrirEnAppWallet()` construye el deep link con `window.location.host`; si no hay host (caso raro)
  usa el dominio del Cloud Run de producción como fallback (`ethereum.tsx:201-206`).
- Al pulsar **"📲 Abrir en la app de MetaMask"** (`SuiteGuard.tsx:64-66`), MetaMask mobile abre la
  misma dApp dentro de su **navegador interno**: allí `window.ethereum` (o el provider EIP-6963) ya
  existe y el flujo continúa con `eth_requestAccounts` (`ethereum.tsx:186-192`).

#### 2.4 Paso 3' — Vía alternativa: Navegador interno de MetaMask

- La tarjeta móvil explica el camino manual: en la app MetaMask → menú **⋮ → Navegador** → escribir
  el **host** actual de la plataforma (se muestra el dominio en pantalla, `SuiteGuard.tsx:55-63`).
- La red debe ser la de la plataforma (anvil 31337 — ver `02-conexion-red-rpc.md`); si no está
  configurada, la wallet no podrá firmar ni ver saldos.

#### 2.5 Paso 4 — Firma y sesión

- Dentro del navegador interno la conexión pide ver cuentas (`eth_requestAccounts`) y luego el
  **login único** firma el mensaje `'TrueKeate: iniciar sesión'` (EIP-191 → `POST /auth/session`,
  `web/lib/sesion.tsx:147-180`). El diálogo de firma aparece en la wallet (botón "Firmar").
- Tras el token, el usuario ve sus secciones según tipo/nivel/estado (RF-14) con normalidad.

### 3. Comportamientos del código a tener en cuenta

#### 3.1 El provider se adopta de una sola vez

- El `useEffect` global de EIP-6963 solo actúa si **aún no** hay `window.ethereum`
  (`ethereum.tsx:127`); si el navegador interno de la wallet inyecta `window.ethereum` primero, ese
  es el proveedor usado.

#### 3.2 La tarjeta de escritorio es distinta

- Si el fallo ocurre en escritorio (`errorConexion === 'sin_wallet'`), la tarjeta pide instalar la
  **extensión** y recargar (`SuiteGuard.tsx:69-77`) — no hay deep link en PC.

#### 3.3 En la barra superior (móvil)

- En `TopBar` el botón de conectar/login completo solo se muestra en PC (`lg:block`);
  en móvil aparece la píldora "Sin billetera" (`web/components/TopBar.tsx:160-168`) y la navegación
  la cubre `BottomNav` (solo 🛒 Mercado sin sesión — `web/components/BottomNav.tsx:33-36`).

### 4. Validación real y pendientes

#### 4.1 Validado en dispositivo real (2026-09-08)

- El director probó en su **teléfono real** y confirmó: la tarjeta móvil aparece al pulsar Conectar,
  el botón "Abrir en la app de MetaMask" abre la app, y la sesión/operación dentro del navegador
  interno de la wallet completa el flujo (RF-16) (`estado_proyecto.md:502-507`).

#### 4.2 Pendientes de confirmar

- **WalletConnect universal** (funcionar con cualquier wallet móvil) requiere `projectId` de
  cloud.walletconnect.com — mejora futura (`estado_proyecto.md:500`).
- **Prueba local con el teléfono**: en desarrollo el host es `127.0.0.1:3000`, inalcanzable desde el
  móvil → para probar localmente hace falta exponer el host en la LAN o usar el despliegue de GCP
  (procedimiento exacto **pendiente de confirmar**).
- La detección de móvil es por user-agent (`ethereum.tsx:53-55`); tablets/escritorios con
  navegador interno de wallet pueden comportarse como `sin_wallet` (caso borde no probado).
