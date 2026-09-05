# Manual Técnico 07 · Wallets y cuentas — 06 · Interacción con la wallet en la plataforma

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Flujo real de conexión, firma de sesión (EIP-191), autorización de intents (EIP-712 vía relayer)
> y confirmación de pasos del escrow, según el código de `web/`, `backend/` y `sc/`.
> Referencias `ruta:línea`. Lo no verificable se marca **"pendiente de confirmar"**; no se
> prometen funciones inexistentes (varias piezas on-chain existen, pero su UI de firma aún no).

## Interacción de la wallet con la plataforma

### 1. Conectar la wallet (paso 1 del flujo)

#### 1.1 Botones reales de conexión

- **Público/suite sin wallet**: el guard de acceso muestra la pantalla *"Conecta tu billetera para
  continuar"* con el botón **"🔗 Conectar MetaMask e iniciar sesión"**
  (`web/components/SuiteGuard.tsx:27-51`, botón en `SuiteGuard.tsx:41`; el guard envuelve toda la
  suite en `web/app/suite/layout.tsx:25`).
- **Barra PC**: el mismo botón aparece en la navegación superior (`web/components/TopNavPc.tsx:42`).
- **Mi Trueke Central**: si no hay wallet conectada muestra el botón **"Conectar MetaMask"**
  (`web/app/suite/dashboard/page.tsx:38-41`) que solo conecta (sin firmar sesión).

#### 1.2 Qué ocurre al pulsar conectar (orden exacto)

El botón oficial hace tres cosas en orden (`web/components/BotonConectarLogin.tsx:22-33`):

1. **`conectar()`** → MetaMask abre el diálogo *"Conectar con TrueKeate"* (método
   `eth_requestAccounts`, `web/lib/ethereum.tsx:96-101`). Es un **permiso para ver tus cuentas**,
   no una firma ni una transacción.
2. **`refrescar()`** → consulta `GET /auth/estado?wallet=0x…` para saber si esa wallet está
   inscrita (`web/lib/sesion.tsx:72-84`; endpoint `backend/api/routes/auth.js:26-37`).
3. **Si está inscrita → `autenticar()`** → pide la **única firma de sesión** (§3).

- Si la wallet NO está inscrita, la suite solo deja ver catálogo e inscripción
  (`SuiteGuard.tsx:105-109`); para operar hay que completar la inscripción formal (correo,
  teléfono, dirección, consentimiento GDPR — `backend/api/routes/auth.js:54-79`).

### 2. Auto-reconexión y persistencia (RF-16.2)

- Al recargar la página, la app restaura la cuenta guardada (`truekeate.account` en
  `localStorage`, `web/lib/ethereum.tsx:41,63-77`) y, si el token de sesión guardado
  (`truekeate.token`) pertenece a esa misma cuenta, lo restaura también
  (`web/lib/sesion.tsx:88-98`).
- Si la wallet está bloqueada, la cuenta se conserva pero sin signer: se pedirá desbloqueo al
  firmar (`web/lib/ethereum.tsx:69-76`).

### 3. Firma de sesión: el mensaje EIP-191 "TrueKeate: iniciar sesión"

#### 3.1 Qué se firma y cómo

- La sesión se obtiene firmando el **mensaje personal (EIP-191) exacto**:
  `TrueKeate: iniciar sesión`. En el frontend: `signer.signMessage("TrueKeate: iniciar sesión")`
  (`web/lib/sesion.tsx:105`; constante en `web/lib/api.ts:82`).
- La firma se envía a `POST /auth/session` con `{ mensaje, firma }`
  (`web/lib/api.ts:85-90`). El backend recupera la wallet firmante con
  `ethers.verifyMessage` (`backend/api/lib/auth.js:10-15`) y emite un **token de sesión opaco**
  (`backend/api/routes/auth.js:81-95`).
- El token (Bearer) queda en `localStorage` (`web/lib/sesion.tsx:106-109`) y se usa en todas las
  llamadas autenticadas de la suite (cabecera `Authorization: Bearer <token>`,
  `web/lib/api.ts:93-106`).

#### 3.2 Qué ve el usuario en MetaMask al firmar la sesión

- MetaMask muestra el diálogo de **firma de mensaje** con el texto *"TrueKeate: iniciar sesión"*
  (prefijado con el encabezado EIP-191 `\x19Ethereum Signed Message:\n…`, invisible para el
  usuario).
- Es una **firma, no una transacción**: **no consume gas ni requiere saldo de ETH**. Rechazarla
  simplemente no emite el token (la app registra el fallo y deja el estado sin sesión —
  `web/lib/sesion.tsx:110-115`).

#### 3.3 Una sola firma para todo (login único)

- El token da acceso a todas las secciones según tipo/estado del usuario; las páginas ya no piden
  autenticación propia (`web/lib/useSesionAutenticada.ts:4-8`; decisión documentada en
  `web/lib/sesion.tsx:8-13`).
- Al **cambiar de cuenta** o **cerrar sesión** se invalida el token local
  (`web/lib/sesion.tsx:88-98,118-121`); con otra cuenta hay que volver a firmar (§4 de
  `03-cuentas-anvil.md`).

### 4. Autorización de intents de trueque (EIP-712, firma sin gas vía relayer)

#### 4.1 El mecanismo on-chain (existe y está probado a nivel de contrato/relayer)

- La ejecución on-chain de los trueques usa **meta-transacciones EIP-712** (RF-09.1/09.2,
  `requerimientos.md:128-129`): el usuario firma su intención y el **relayer paga el gas**
  (cuenta 1 del anvil, RF-15.2).
- El contrato **SmartAccount** valida la firma EIP-712 del owner con **nonce por cuenta**
  (anti-replay, D16): tipo `Execute(address to,uint256 value,bytes data,uint256 nonce)`
  (`sc/src/SmartAccount.sol:40`), dominio EIP-712 **"TrueKeate SmartAccount" versión "1"**
  (`sc/src/SmartAccount.sol:82`), verificación en `execute` (`sc/src/SmartAccount.sol:113-124`) y
  `domainSeparator()` expuesto (`sc/src/SmartAccount.sol:104-106`).
- El **relayer** (`backend/relayer.js`) recibe el intent `{ signer, destino, valor, data, nonce,
  firma, chainId }` y lo envía a la Smart Account con `execute(...)` (`backend/relayer.js:134-181`,
  envío en `162-167`), aplicando protecciones: **chainId correcto** (`138-143`), **bloqueo** por 3
  fallos en 10 min (`146-150`), **límite diario de 20 meta-tx** por usuario (D29, `152-156`), y
  **nonce + allowlist de cuentas verificadas** D28 (`93-115,158-160`).
- Hay una prueba E2E que demuestra el flujo completo contra anvil: la cuenta 0 firma un intent
  EIP-712 con su clave privada y el relayer (cuenta 1) envía la tx pagando el gas
  (`backend/test/integracion-relayer.js:30-45,63-90`).

#### 4.2 Estado real en la app (importante, no prometer lo inexistente)

- **Hoy la web NO pide firmar intents EIP-712**: no existe código de typed-data
  (`_signTypedData`/`TypedData`) en `web/` (verificado en `web/app`, `web/components`, `web/lib`).
- Las acciones de trueque del frontend (crear, custodiar, firmar recepción, valorar) se envían al
  backend con el **token de sesión** (`web/lib/api.ts:238-261`:
  `POST /truekes`, `/truekes/:id/custodiar`, `/truekes/:id/firma-recepcion`, `/truekes/:id/valoracion`).
- El backend, por ahora, **actualiza el espejo en la base de datos** (custodiar →
  `backend/api/routes/truekes.js:74-86`; firma-recepción → `91-103`). La cabecera de la ruta
  declara la intención de *"delegar on-chain vía EIP-712 (CU-23) cuando haya red configurada"*
  (`backend/api/routes/truekes.js:7-9`), y el relayer está instanciado en el arranque GCP
  (`backend/api/index-gcp.js:64-82`) pero **ninguna ruta lo invoca hoy** (solo el panel Owner usa
  su health/métricas — `backend/api/routes/admin.js:47-48`).
- Conclusión: la **firma de intents EIP-712 por el usuario en la UI queda pendiente de confirmar**;
  la pieza on-chain (SmartAccount + relayer) sí está implementada y testeada
  (`sc/src/SmartAccount.sol:107-124`, `backend/relayer.js:134-181`).

### 5. Confirmar pasos del escrow (custodiar / completar)

#### 5.1 Qué significa cada paso en la UI actual

- **Custodiar mi lado** (CU-12): botón en la pantalla del trueque que llama
  `POST /truekes/:id/custodiar` (`web/lib/api.ts:249-251`). Hoy marca el trueque como
  `CUSTODIADO` en el espejo (`backend/api/routes/truekes.js:74-86`). En el diseño on-chain
  (CU-23) correspondería a firmar un intent hacia el escrow → **pendiente de confirmar**.
- **Firmar recepción** (CU-14): `POST /truekes/:id/firma-recepcion` (`web/lib/api.ts:254-256`),
  marca `firmaA`/`firmaB` (`backend/api/routes/truekes.js:91-103`).
- **Valoración 1–5** (D18/D36): `POST /truekes/:id/valoracion` (`web/lib/api.ts:259-261`).
- Ninguno de estos pasos dispara hoy una ventana de firma en MetaMask ni una transacción: operan
  contra la API con el token de sesión. El avance **on-chain** de los trueques (escrow real con
  sus 9 estados) queda **pendiente de confirmar** en esta integración (los truekes actuales usan
  `escrow_id` sintético negativo en el espejo — `backend/api/routes/truekes.js:4-9`).

#### 5.2 Estado del escrow on-chain

- El contrato **Escrow** con sus estados está desplegado (`0x8a93d247134d91e0de6f96547cb0204e5be8e5d8`,
  `web/lib/contracts.ts:22`) y su máquina de estados está cubierta por tests en `sc/test/`
  (ver `RepoTecnico/Manuales/03-Implementacion/01-contratos-escrow.md`); la gestión desde la
  wallet (firma de intents para custodiar/completar) es la parte pendiente de la integración.

### 6. Resumen: qué significa cada solicitud de MetaMask

| Solicitud que ves en MetaMask | Qué es | ¿Firma o transacción? | ¿Consume gas / necesita ETH? |
|---|---|---|---|
| *"Conectar con TrueKeate"* (ver cuentas) | `eth_requestAccounts` | Permiso (sin firma) | No |
| *"TrueKeate: iniciar sesión"* (firma de mensaje) | Firma **EIP-191** de sesión | Firma de mensaje personal | **No** (sin gas) |
| *Firma de datos tipados "TrueKeate SmartAccount"* (Execute/execute con nonce) | Intent **EIP-712** de trueque (diseño) | Firma de datos tipados | **No** para el usuario: el **relayer paga el gas** (RF-09.1/09.2); hoy **sin UI** → pendiente de confirmar |
| *Confirmar transacción* (con estimación de gas en ETH) | Transacción on-chain directa | Transacción | **Sí**, gas en ETH de pruebas (casos: Empresas RF-09.3 o fallback D39 `backend/relayer.js:17-18`; sin UI verificada → pendiente de confirmar) |

### 7. Referencias de código citadas

- Conexión y auto-reconexión: `web/lib/ethereum.tsx:49-108`; guard de acceso:
  `web/components/SuiteGuard.tsx:88-131`; botón de login único:
  `web/components/BotonConectarLogin.tsx:22-33`; botón del dashboard: `web/app/suite/dashboard/page.tsx:38-41`;
  desconexión: `web/components/TopBar.tsx:141-149`.
- Sesión/firma EIP-191: `web/lib/sesion.tsx:100-121`; `web/lib/api.ts:82-90`;
  `backend/api/lib/auth.js:10-15`; `backend/api/routes/auth.js:81-95`.
- Intents EIP-712 on-chain: `sc/src/SmartAccount.sol:40,82,104-106,113-124`;
  relayer: `backend/relayer.js:134-181`; prueba E2E: `backend/test/integracion-relayer.js:30-90`.
- Acciones de trueque (UI→API→espejo): `web/lib/api.ts:238-261`;
  `backend/api/routes/truekes.js:74-103` (delegación on-chain declarada en `7-9`, sin invocar el
  relayer → pendiente de confirmar).
