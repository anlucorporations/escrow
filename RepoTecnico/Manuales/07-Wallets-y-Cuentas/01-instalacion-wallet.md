# Manual Técnico 07 · Wallets y cuentas — 01 · Instalación y creación de wallet

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Datos auditados el 2026-09-04 (anvil/Foundry remoto, chain **31337**; ver `02-conexion-red-rpc.md`).
> Referencias `ruta:línea` al código real del repositorio. Lo no verificable se marca
> **"pendiente de confirmar"**. No se prometen funciones inexistentes.
>
> Base normativa: **RF-16** (MetaMask/wallet) en `RepoTecnico/requerimientos.md:178-181`, **RT-01.7**
> (`requerimientos.md:276`) y **D40** (PWA instalable) en `requerimientos.md:400`.

## Instalación y creación de wallet

### 1. Qué wallet usa la plataforma (estado real)

#### 1.1 El mecanismo de conexión real: `window.ethereum`

- La plataforma **no lleva su propia wallet**: lee la wallet que el navegador inyecta como
  `window.ethereum` (MetaMask u otra compatible con el estándar EIP-1193). La declaración global
  está en `web/lib/ethereum.tsx:20-27`.
- Si no hay ninguna wallet instalada, el botón de conexión muestra el aviso exacto
  *"MetaMask no está instalado. Instálalo o usa una wallet compatible (RF-16.1)"*
  (`web/lib/ethereum.tsx:89-93`).
- La conexión pide permiso para **ver las cuentas** con el método `eth_requestAccounts`
  (`web/lib/ethereum.tsx:96-101`); no es una firma ni una transacción.
- Auto-reconexión al refrescar la página (RF-16.2): si ya había una cuenta guardada en
  `localStorage`, la app la restaura sola (`web/lib/ethereum.tsx:63-77`).

#### 1.2 El único proveedor implementado hoy es MetaMask

- En el repositorio **no hay** dependencias ni código de WalletConnect/wagmi en `web/package.json`
  ni llamadas a `wallet_addEthereumChain`/`wallet_switchEthereumChain` en `web/` (verificado con
  búsqueda en `web/app`, `web/components`, `web/lib`). Todo el cableado pasa por `window.ethereum`
  (`web/lib/ethereum.tsx:89-108`).
- En móvil, el diseño delega la firma a la **wallet móvil (MetaMask mobile)** en la PWA instalable
  (D40): es un comentario de cabecera (`web/lib/ethereum.tsx:6-8`) y de requisito
  (`requerimientos.md:181`, RF-16.3); **no hay código de deep-link** a la app móvil → la firma
  desde la app de MetaMask fuera del navegador queda **pendiente de confirmar** (ver §2.2 para el
  método práctico vigente).

### 2. MetaMask en PC (extensión del navegador)

#### 2.1 Descarga oficial

- Instalar la extensión **solo desde**:
  - Chrome/Edge/Brave: Chrome Web Store → buscar *"MetaMask"* (editor: *MetaMask* / Consensys).
  - Firefox: Add-ons de Firefox → *"MetaMask"*.
  - Página oficial del proyecto: `https://metamask.io/download/` (enlaza a las tiendas oficiales).
- ⚠️ Desconfiar de extensiones con nombres parecidos o de anuncios: la extensión oficial pide
  permisos limitados (leer sitios en los que la uses) y jamás pide tu frase semilla.

#### 2.2 Instalación y primer arranque

1. Clic en **"Añadir a Chrome"** (o el equivalente del navegador) y confirmar en el diálogo.
2. Fijar el icono del zorrito en la barra de extensiones (pin) para tener acceso rápido.
3. Abrir la extensión: se ofrece **"Empezar"** → *Crear una wallet* o *Importar una wallet*.
4. Si es la primera vez que usas cripto, MetaMask pide aceptar el aviso de uso (no es necesario
   compartir datos).

#### 2.3 Comprobar que la extensión quedó operativa

- Al abrir la extensión debe verse la interfaz con saldo **0 ETH** y el selector de red.
- En la plataforma TrueKeate, el botón "🔗 Conectar MetaMask e iniciar sesión"
  (`web/components/BotonConectarLogin.tsx:37`) dejará de mostrar el aviso de *"MetaMask no está
  instalado"*.
- La plataforma escucha en vivo el evento `accountsChanged` de MetaMask: si cambias de cuenta o la
  bloqueas, la app reacciona al instante (`web/lib/ethereum.tsx:49-61,79-87`).

### 3. MetaMask en móvil (app Android / iPhone)

#### 3.1 App oficial

- **Android**: Google Play → *"MetaMask – Blockchain Wallet"* (editor Consensys).
- **iPhone**: App Store → *"MetaMask – Crypto Wallet"* (editor Consensys).
- Después de instalarla hay que **crear o importar la wallet** dentro de la app (misma frase
  semilla que en PC si quieres la misma cuenta; ver `03-cuentas-anvil.md` para importar cuentas de
  prueba por clave privada).

#### 3.2 Método práctico vigente para firmar en móvil (PWA, D40)

- La versión móvil de la plataforma se entrega como **PWA instalable** (D40; RNF-02.3 en
  `requerimientos.md:222`): la web declara `manifest.json` en `web/public/manifest.json`
  (referenciado en `web/app/layout.tsx:16-23`).
- **Cómo funciona hoy en la práctica** (sin deep-link implementado): abrir la URL de la plataforma
  (https://truekeate-web-593453426217.europe-west1.run.app) **dentro del navegador interno de
  MetaMask móvil** — ese navegador inyecta `window.ethereum` y permite conectar y firmar con la
  wallet móvil. También puede añadirse la web al inicio como PWA, pero la firma delegada desde la
  PWA instalada (deep-link a MetaMask) está **pendiente de confirmar** (solo documentada como
  diseño en `web/lib/ethereum.tsx:6-8`).
- La instalabilidad completa (service worker/offline) también está **pendiente de confirmar** (no
  se observó service worker en `web/public/`).

### 4. Crear una billetera nueva

#### 4.1 Frase semilla (12/24 palabras)

- Al crear la billetera, MetaMask genera una **frase semilla (secret recovery phrase)**. Las
  cuentas nuevas de MetaMask usan 12 palabras; MetaMask también acepta **importar frases de 24
  palabras**.
- **La frase ES la wallet**: quien la tenga controla las cuentas derivadas. MetaMask pide
  confirmarla escribiendo varias palabras al azar.
- Reglas de custodia (aplican a producción; en el anvil de pruebas el riesgo es menor porque los
  fondos son simbólicos):
  1. Anotarla en papel, fuera de línea (nunca en capturas, notas del móvil ni correo).
  2. No compartirla con nadie, incluido "soporte técnico" de cualquier plataforma.
  3. Guardar una copia en lugar seguro adicional (caja física) — nadie puede recuperarla por ti.

#### 4.2 Contraseña local / PIN

- La contraseña (PC) o PIN/biometría (móvil) solo protege el acceso **local** a la extensión/app;
  **no** es la clave de la wallet y no sirve para recuperar la frase.
- En PC, si cierras sesión de MetaMask (bloqueo), la app guarda la cuenta pero no puede firmar
  hasta que desbloquees la extensión: la auto-reconexión restaura la cuenta sin `signer`
  (`web/lib/ethereum.tsx:69-76`), y al firmar la sesión MetaMask pedirá desbloqueo.

### 5. Red de pruebas vs mainnet

#### 5.1 Por qué TrueKeate hoy solo usa una red de pruebas

- Todos los contratos del proyecto están desplegados en el **anvil/Foundry remoto con chain ID
  31337** (entorno de desarrollo/pruebas; ver `02-conexion-red-rpc.md`). No hay despliegue en
  mainnet ni cadena de producción definida (`RepoTecnico/Manuales/04-Despliegue/01-despliegue.md:239`
  → **pendiente de confirmar**).
- En esa red, la moneda nativa es **ETH simbólico de pruebas**, sin valor real.

#### 5.2 Riesgo de usar fondos reales

- ⚠️ Configurar la wallet en esta red con una cuenta que contenga activos reales (de otras redes)
  no los pierde, pero **cualquier operación on-chain de prueba consume ETH de prueba** y las
  claves privadas de las cuentas de desarrollo son públicas (ver `03-cuentas-anvil.md`): **nunca
  usar en esta red cuentas con valor real**.
- Recomendación: crear cuentas de prueba dedicadas (las del anvil, §3 de `03-cuentas-anvil.md`) y
  no mezclarlas con la wallet personal.

### 6. Alternativas compatibles (WalletConnect)

#### 6.1 Estado real en la plataforma

- El mensaje de error de la app menciona *"usa una wallet compatible"* (`web/lib/ethereum.tsx:91`),
  lo que en la práctica significa **cualquier wallet que inyecte `window.ethereum`** en el
  navegador (Brave Wallet, Coinbase Wallet, etc.).
- **WalletConnect no está integrado en el código** (sin dependencias ni flujo QR en `web/`):
  usarlo para conectar a TrueKeate no es posible hoy → **pendiente de confirmar** como vía
  alternativa (los requisitos solo fijan MetaMask, `requerimientos.md:178-181`).
- En móvil, la vía WalletConnect equivalente y **sí disponible** es el navegador interno de la app
  de MetaMask (§3.2), que actúa como "wallet móvil" sin necesidad de integración adicional.

#### 6.2 Referencias de código citadas

- Declaración e inyección de la wallet: `web/lib/ethereum.tsx:20-27,89-108`.
- Persistencia de la cuenta conectada (`localStorage` `truekeate.account`):
  `web/lib/ethereum.tsx:41,57-59`.
- Auto-reconexión RF-16.2: `web/lib/ethereum.tsx:63-77`; cambios de cuenta en vivo:
  `web/lib/ethereum.tsx:49-61,79-87`.
- Botón oficial de conexión (conectar → comprobar inscripción → firmar sesión si está inscrito):
  `web/components/BotonConectarLogin.tsx:22-33,37`.
- PWA/D40: `web/app/layout.tsx:16-23` (manifest), `web/public/manifest.json`;
  `requerimientos.md:222,400`.
