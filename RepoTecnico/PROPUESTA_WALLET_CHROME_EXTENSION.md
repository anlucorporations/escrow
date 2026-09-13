# Propuesta: incorporar CodeCrypto Wallet (extensión de Chrome) a TrueKeate

> **Fecha:** 12 de septiembre de 2026
> **Objeto analizado:** `codecrypto_wallet_entrega.zip` (468 KB, 81 archivos, `codecrypto_wallet/`)
> — idéntico en `escrow/` y en `chrome-wallet/` (mismo MD5 `61527804…`).
> **Objetivo:** estudiar la integración para **sustituir a MetaMask** sin romper el funcionamiento actual del proyecto.
> **Restricciones vigentes:** no se sube a repositorios ni se despliega en GCP hasta orden explícita.
> **Método:** análisis estático del contenido del zip. Este documento es un plan; **no se ha modificado ni desplegado nada**.

---

## 0. Resumen ejecutivo

La extensión **es técnicamente compatible con TrueKeate en la capa de descubrimiento** (se inyecta y se anuncia por EIP-6963, que es justo el mecanismo que el proyecto ya usa), pero **hoy no puede sustituir a MetaMask** por un motivo concreto y localizado: **no implementa `personal_sign`**, y de ahí dependen el inicio de sesión y la firma por acción del proyecto.

| Veredicto | Valoración |
|---|---|
| ¿Se puede cargar como wallet en la dApp? | **Sí**, sin cambios: el proyecto ya soporta EIP-6963 y la cadena por defecto de la extensión es 31337 |
| ¿Puede sustituir a MetaMask hoy? | **No**: sin `personal_sign` el login es imposible (1 método faltante) |
| ¿Rompe algo si se instala junto a MetaMask? | **Riesgo bajo**, pero el proyecto adopta el primer proveedor anunciado: hay que decidir la prioridad |
| Esfuerzo de la vía recomendada | **Fase 1: 8–14 h** (extensión + pruebas del proyecto), sin tocar el backend |
| Riesgo para el proyecto actual | **Bajo si se hace por fases** y con un doble de pruebas que reproduzca la superficie RPC de la extensión |

---

## 1. Qué trae el zip (verificado)

### 1.1 Composición

| Elemento | Detalle |
|---|---|
| Tipo | Extensión **Manifest V3** para Chrome, nombre **CodeCrypto Wallet** v1.0.0 |
| Stack | **Vite 7 + React 19 + TypeScript 5.9 + ethers 6.15**; manifest escrito en TS y generado en el build (`src/manifest.ts` → `dist/manifest.json`), de modo que no se desincronizan |
| Fuentes | `src/` (~1.300 líneas de las cuales 1.259 son `background.ts`); 3 popups (`index.html`, `connect.html`, `notification.html`) |
| Build | **`dist/` ya compilado** y cargable como extensión desempaquetada; 81 archivos en total |
| Documentación | `README.md`, `INSTRUCCIONES.md`, `CHANGELOG.md`, `GUIA_RAPIDA_TESTING.md`, `documentacion/PLAN_MEJORA.md` y `AUTOEVALUACION.md` |
| Pruebas propias | `npm test` (amount + contratos Foundry + background) y `npm run test:acceptance` / `test:extension` |
| Contrato auxiliar | `contracts/WalletPlayground.sol` (solo para las pruebas de la extensión) |
| Enunciado de origen | `TAREA_PARA_ESTUDIANTE.md` (87 KB): 36 especificaciones funcionales + 11 casos de prueba |

### 1.2 Arquitectura (4 piezas)

```
inject.js  ──►  window.codecrypto   (proveedor EIP-1193 + anuncio EIP-6963)
    ▲                   │
    │ postMessage       │ CODECRYPTO_REQUEST / RESPONSE / EVENT
content-script.js ──────┘  (puente página ⇄ extensión; inyecta inject.js con run_at document_start)
    ▲
background.js (service worker)  ──  custodia el mnemonic, deriva cuentas, firma y envía
    ▲
popups: index.html (wallet) · connect.html (autorizar sitio) · notification.html (aprobar firma/tx)
```

Detalles con impacto en la integración:

- **Inyecta `window.codecrypto`, NO `window.ethereum`**, con `isCodeCrypto: true` e `isMetaMask: false` (deliberado, para no chocar con MetaMask).
- **Se anuncia por EIP-6963** con `name: 'CodeCrypto Wallet'` y `rdns: 'io.codecrypto.wallet'`, y **re-anuncia** al recibir `eip6963:requestProvider`. Este es el mecanismo que TrueKeate ya implementa.
- **Permisos por origen**: la autorización de un sitio se guarda por *origin* (`codecrypto_connected_sites`) y `eth_accounts` solo responde a sitios ya autorizados; cada `eth_requestAccounts` abre la ventana de conexión.
- **Almacenamiento**: el **mnemonic se guarda sin cifrar** en `chrome.storage.local` y la wallet no pide contraseña. El propio README lo declara: *"Proyecto educativo. No cifra el mnemonic y no debe usarse con fondos reales"*.
- **Permisos de host**: `http://localhost:8545/*`, `http://127.0.0.1:8545/*` y `https://rpc.sepolia.org/*`; las redes personalizadas se piden en tiempo de ejecución (`chrome.permissions.request`) al añadirlas.
- **Errores EIP-1193** propagados con su código (4001 rechazo, 4902 red desconocida, 4100 no autorizado, -32603 interno).
- **Aprobaciones con timeout**: 120 s para firmas (el proveedor espera 130 s) y 60 s para conexión, con rehidratación de solicitudes pendientes si el service worker se duerme.

### 1.3 Superficie RPC exacta (inventario verificado en `src/background.ts`)

| Método | ¿Implementado? |
|---|---|
| `eth_requestAccounts`, `eth_accounts` | ✅ (con aprobación por sitio) |
| `eth_chainId` | ✅ (por defecto `0x7a69` = **31337**, la cadena del proyecto) |
| `eth_getBalance` | ✅ (proxy al RPC de la red) |
| `eth_sendTransaction` | ✅ (EIP-1559 tipo 2) |
| `eth_signTypedData_v4` (**EIP-712**) | ✅ |
| `wallet_switchEthereumChain`, `wallet_addEthereumChain` | ✅ (valida que el RPC responda el `chainId` declarado) |
| `personal_sign` (**EIP-191**) | ❌ **no existe en ninguna parte** |
| `eth_sign` | ❌ |
| `eth_call`, `eth_estimateGas`, `eth_getCode`, `eth_blockNumber`, `eth_getTransactionReceipt`, `eth_getLogs` | ❌ |
| `wallet_revokePermissions` | ❌ |
| Propias: `wallet_generateMnemonic`, `wallet_validateMnemonic`, `wallet_deriveAccounts`, `wallet_getChains` | ✅ |
| Eventos emitidos | ✅ `accountsChanged`, `chainChanged` |

---

## 2. Contraste con lo que TrueKeate espera hoy

### 2.1 Matriz de compatibilidad

| Necesidad del proyecto | Dónde | Estado con CodeCrypto Wallet |
|---|---|---|
| Descubrir la wallet sin `window.ethereum` | `web/lib/ethereum.tsx:60-75,126-138` (EIP-6963) | ✅ **Compatible tal cual**: la app espera 1.200 ms un anuncio EIP-6963 y adopta el proveedor |
| Conectar y pedir cuentas | `lib/ethereum.tsx:186-189` (`eth_requestAccounts`) | ✅ |
| Auto-reconexión al refrescar (RF-16.2) | `lib/ethereum.tsx:140-154` (`BrowserProvider` + `getSigner`) | ⚠️ Depende de `eth_accounts`, que la extensión responde **solo a sitios ya autorizados**; si no, queda sin cuenta |
| Escuchar cambios de cuenta | `accountsChanged` | ✅ |
| Detectar cambio de red | `chainChanged` | ✅ (el proyecto lo empezó a usar en la última entrega) |
| **Iniciar sesión (firma EIP-191)** | `web/lib/sesion.tsx` → `signMessage("TrueKeate: iniciar sesión")` | ❌ **BLOQUEANTE**: ethers envía `personal_sign`, no implementado |
| **Firma por acción (EIP-191 con `ts`)** | `web/lib/firma.ts` → `signMessage("TrueKeate: <acción> (ts=…)")`; 13 puntos de la UI | ❌ **BLOQUEANTE**: mismo motivo |
| Cambiar de red desde la app | `lib/ethereum.tsx` (`wallet_switchEthereumChain`, `wallet_addEthereumChain`) | ✅ |
| Desconectar | `lib/ethereum.tsx:208-227` (`wallet_revokePermissions`) | ⚠️ La extensión no lo implementa; la app tolera el error y limpia su estado, pero **el sitio sigue autorizado** en la extensión |
| Panel de balances (lectura de contratos) | `components/BalanceDebug.tsx` (`balanceOf`, `owner()`, `siguienteId()`) | ⚠️ Requiere `eth_call`, no implementado: el panel degrada a "no responde" (ya está preparado para ello) |
| Enviar transacciones desde el navegador | hoy **no se usa** (el backend/relayer escribe) | ⚠️ Si algún día se usa: sin `eth_getTransactionReceipt` ni `eth_blockNumber`, `tx.wait()` de ethers fallaría |
| Firmar intents EIP-712 (diseño SmartAccount/relayer) | `sc/src/SmartAccount.sol` (EIP-712) | ✅ **La extensión sí firma EIP-712**; es una oportunidad, no un problema |

### 2.2 Diagnóstico

Los huecos se reducen a **tres**, ordenados por gravedad:

1. **`personal_sign` ausente (bloqueante).** El login y la firma por acción son la puerta de entrada: sin ellos, con esta única wallet la app no autentica. Es un método trivial de añadir en la extensión (ya custodia el mnemonic y firma EIP-712 y EIP-1559), porque ethers ya está dentro.
2. **Métodos de lectura ausentes (`eth_call` y compañía).** No afectan al núcleo (el proyecto lee y escribe por el backend/relayer, no por la wallet), pero dejan sin datos el panel de balances nuevo y cualquier lectura de contrato desde el navegador.
3. **`wallet_revokePermissions` ausente.** La desconexión local funciona, pero la autorización del sitio persiste en la extensión.

Y una **oportunidad estratégica**: la extensión firma **EIP-712** y el proyecto ya tiene EIP-712 en su diseño de SmartAccount. Adoptar EIP-712 como formato de firma de sesión y de acción **funcionaría con MetaMask y con CodeCrypto Wallet a la vez**, y es más seguro y legible que el mensaje de texto plano actual.

---

## 3. Opciones de integración

| Opción | Qué implica | Toca el proyecto | Riesgo | Esfuerzo |
|---|---|---|---|---|
| **A. Ampliar la extensión** | Añadir `personal_sign` (+ `wallet_revokePermissions`; opcionalmente `eth_call`) al zip. TrueKeate no cambia | **Nada** | Bajo | 4–6 h |
| **B. Migrar la firma del proyecto a EIP-712** | Cambiar login y firma por acción a `eth_signTypedData_v4`, y que el backend verifique el digest tipado | Backend (`auth`, `firma-accion`), frontend (`sesion.tsx`, `firma.ts`), pruebas | **Medio-alto**: toca la autenticación de toda la plataforma | 16–24 h |
| **C. Capa de compatibilidad** | El frontend detecta capacidades del proveedor y firma con EIP-191 o EIP-712 según lo que ofrezca; el backend acepta ambas | Backend + frontend + pruebas de las dos vías | Medio | 20–28 h |

**Recomendación: A ahora, B después.** La opción A cumple literalmente el encargo ("sustituir a MetaMask sin romper el funcionamiento actual"), no toca el proyecto y es reversible. La opción B es la buena a medio plazo (beneficia a ambas wallets y encaja con la arquitectura EIP-712 ya existente), pero es un cambio de autenticación y merece su propia fase con la plataforma estabilizada.

---

## 4. Plan por fases (plan inicial — **revisado en la §8** tras las decisiones del director)

### Fase 0 — Medición sin cambios (2–4 h)

1. **Doble de pruebas del proveedor CodeCrypto** en el proyecto: un `window.ethereum` falso que se anuncie por EIP-6963 y exponga **exactamente** la superficie RPC de la extensión (con `personal_sign` devolviendo `unsupported method`).
2. Correr las suites actuales contra ese doble: `web/test` (74 pruebas) y las de E2E que simulan wallet.
3. **Resultado esperado:** confirmar por escrito qué funciona y qué falla, con evidencia. Es el "antes" medido, sin tocar nada.

**Entregable:** informe de compatibilidad con la lista exacta de fallos.

### Fase 1 — Hacer la extensión usable como wallet única (8–14 h)

1. **Añadir `personal_sign` a la extensión** (reutilizando el firmado existente), con aprobación del usuario y el mismo formato de mensaje que ya usa el proyecto.
2. Añadir `wallet_revokePermissions` (borra la autorización del sitio solicitante).
3. Opcional recomendado: `eth_call` y `eth_getTransactionReceipt`, para que el panel de balances y `tx.wait()` funcionen.
4. **Reconstruir el zip** (`npm run build`) y verificar la extensión con sus propias pruebas.
5. **Prueba de integración real**: cargar la extensión desempaquetada, conectarla a TrueKeate en local (anvil) y ejecutar el recorrido completo: conectar → inscribirse → verificar → certificar → publicar → acordar → custodiar → firmar recepción → valorar.

**Entregable:** extensión v1.1 con firma EIP-191 y evidencia de la travesía completa. **El proyecto no se modifica.**

### Fase 2 — Convivir con MetaMask sin ambigüedad (4–6 h)

1. Definir la **prioridad de proveedores** cuando hay varias wallets: preferir la del usuario (selector) y no "la primera que se anuncie".
2. Ajustar `lib/ethereum.tsx` para **elegir entre proveedores EIP-6963** (hoy adopta el primero) y recordar la elección.
3. Añadir el **caso CodeCrypto** a las pruebas del frontend (con el doble de la Fase 0).

### Fase 3 — Migración a EIP-712 (opcional, 16–24 h)

Solo si se decide que la firma tipada sustituya al mensaje de texto: requiere cambios coordinados en backend, frontend, pruebas y manuales. Beneficio: una sola vía de firma para ambas wallets y alineada con `SmartAccount`.

### Fase 4 — Productivizar la wallet (fuera del alcance actual)

Cifrado del mnemonic con contraseña (hoy en claro), auditoría del service worker, empaquetado y distribución. **Sin esto, la extensión no debe usarse con valor real** ni exponerse en producción con datos de KYC.

---

## 5. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Mnemonic sin cifrar y sin contraseña** | Alto si se usa en producción | Es una wallet educativa: mantenerla en local/pruebas; cifrado en la Fase 4 antes de cualquier uso real |
| **Doble wallet instalada (MetaMask + CodeCrypto)** | Medio: comportamiento ambiguo al conectar | Fase 2: selector/prioridad explícita; hoy la app adopta el primer anuncio EIP-6963 o `window.ethereum` si existe |
| **La app "adopta" un proveedor y lo fija en `window.ethereum`** | Medio: mezcla de proveedores en la misma sesión | Revisar en la Fase 2 la asignación de `window.ethereum` en `lib/ethereum.tsx` |
| **`host_permissions` no cubre la cadena de GCP** | Medio: sin red, no hay firma | Añadir la red con `wallet_addEthereumChain` (pide permiso en tiempo de ejecución) y documentarlo; verificar el `chainId` 31337 |
| **Sin `eth_call`, el panel de balances queda vacío** | Bajo (degradación ya prevista) | Añadirlo en la Fase 1 o asumir la degradación |
| **E2E imposible en este entorno** | Medio: no puedo probar la extensión real aquí | Falta `libnspr4.so` para Chromium y no hay root. La verificación real se hará en la máquina del director; en el repositorio quedará el doble de pruebas |
| **La extensión no pide contraseña para firmar** | Medio: cualquiera con acceso al perfil de Chrome firma | Aceptable en pruebas; requisito para la Fase 4 |

---

## 6. Qué NO hacer

1. **No tocar la autenticación del proyecto en la Fase 1.** Migrar a EIP-712 es una decisión de arquitectura con su propia fase y pruebas; mezclarla con la adopción de la wallet multiplicaría el riesgo.
2. **No priorizar CodeCrypto sobre MetaMask de forma silenciosa.** Si el director prueba con MetaMask y el proyecto elige otro proveedor, el diagnóstico se vuelve confuso.
3. **No usar la extensión con datos reales de KYC** mientras el mnemonic esté sin cifrar.
4. **No dar por buena la integración por "carga y conecta".** El criterio es la travesía completa (login, firma por acción, trueque), que es donde están los huecos.
5. **No modificar el zip entregado sin versionarlo.** Si se amplía la extensión, el cambio va como v1.1 con su CHANGELOG, preservando el entregable original.

---

## 7. Preguntas para continuar (bloque de 3) — **respondidas el 2026-09-12, ver §8**

1. **Alcance de la sustitución:** ¿se busca que CodeCrypto Wallet **reemplace** a MetaMask (única wallet soportada) o que **conviva** con ella y el usuario elija?
2. **Margen sobre la extensión:** ¿se puede **modificar el código** de la extensión (añadir `personal_sign` y compañía) o hay que integrarla **tal como viene en el zip**?
3. **Entorno objetivo:** ¿el piloto es **local/educativo** (anvil en la máquina, sin valor real) o se pretende **producción en GCP** con esta wallet? De la respuesta depende si el cifrado del mnemonic entra en el alcance.

---

*Este documento es un análisis y un plan. No se ha modificado el código del proyecto, no se ha tocado la extensión y no se ha subido ni desplegado nada. El zip original permanece intacto.*


---

## 8. Decisiones del director y plan revisado (2026-09-12)

### 8.1 Decisiones recibidas

| # | Pregunta | Decisión | Consecuencia |
|---|---|---|---|
| 1 | Alcance de la sustitución | **Convivencia con MetaMask** | La selección de proveedor deja de ser opcional: **pasa a ser requisito del proyecto** |
| 2 | Margen sobre la extensión | **Se puede modificar su código** | Vía rápida habilitada: añadir los métodos que faltan sin tocar la arquitectura |
| 3 | Entorno objetivo | **Producción en GCP con esta wallet** | El cifrado del mnemonic deja de ser una mejora futura y pasa a ser **requisito bloqueante**; entran empaquetado, distribución y endurecimiento |

### 8.2 Qué cambia respecto del plan inicial

**a) La convivencia (antes Fase 2 opcional) es ahora imprescindible y tiene dos causas concretas en el proyecto.** Hoy, con MetaMask instalada, CodeCrypto Wallet **no se usa nunca**:

- `web/lib/ethereum.tsx:159` — el listener de EIP-6963 **aborta si ya existe `window.ethereum`**. Con MetaMask presente, la app ni siquiera escucha los anuncios de CodeCrypto.
- `web/lib/ethereum.tsx:227` — `conectar()` toma `window.ethereum` (MetaMask) y solo espera un anuncio EIP-6963 **si no hay** `window.ethereum`.

La solución pasa por **recolectar todos los proveedores EIP-6963** (no el primero), ofrecer un **selector** al usuario y recordar su elección entre sesiones. MetaMask también se anuncia por EIP-6963, así que ambas pueden listarse de forma uniforme.

**b) El cifrado del mnemonic asciende a requisito bloqueante de producción.** Hoy la frase vive **en claro** en `chrome.storage.local` y la wallet no pide contraseña. Con usuarios reales y datos de KYC en juego, eso no es asumible.

**c) Entran dos frentes que no estaban en el plan inicial:** distribución de la extensión (no se puede pedir a usuarios reales que la carguen desempaquetada) y definición de la cadena de producción.

### 8.3 Plan revisado (orientado a producción)

| Fase | Contenido | Esfuerzo | Bloquea a |
|---|---|---|---|
| **0. Medición** | Doble de pruebas que reproduzca la superficie RPC exacta de la extensión; correr las suites del proyecto contra él y documentar qué falla | 2–4 h | — |
| **1. Extensión ampliada** | `personal_sign` (EIP-191), `wallet_revokePermissions`, `eth_call`, `eth_getTransactionReceipt`/`eth_blockNumber`; pruebas propias de la extensión en verde; versión **v1.1** con CHANGELOG | 12–18 h | Fase 2 |
| **1.5. Bóveda cifrada** | Cifrado del mnemonic con contraseña (KDF fuerte), desbloqueo por sesión, autobloqueo por inactividad, migración desde el almacenamiento actual, y retirada del mnemonic de los logs | 10–16 h | **Producción** |
| **2. Coexistencia** | Selector de proveedor EIP-6963 en el proyecto, preferencia recordada, `window.ethereum` apuntando al elegido, y pruebas con dos proveedores simulados | 8–12 h | Fase 3 |
| **3. Integración real en GCP** | Alta de la red de GCP en la wallet (`wallet_addEthereumChain` + permiso de host), recorrido completo contra la plataforma desplegada, CORS y observabilidad de fallos de firma | 8–12 h | Fase 4 |
| **4. Endurecimiento y distribución** | Auditoría del service worker y del almacenamiento, empaquetado y canal de distribución, política de claves, actualización de manuales | 12–20 h | Entrega |
| **5. EIP-712 (opcional)** | Unificar la firma de sesión y de acción en EIP-712 (funciona con ambas wallets y encaja con `SmartAccount`) | 16–24 h | — |

**Total estimado: 52–82 h** hasta una entrega en producción con esta wallet (sin contar la Fase 5).

### 8.4 Requisitos nuevos que introduce "producción en GCP"

| # | Requisito | Motivo | Prioridad |
|---|---|---|---|
| P1 | **Cifrado del mnemonic + contraseña y desbloqueo por sesión** | Hoy está en claro y sin contraseña | **Bloqueante** |
| P2 | **Autobloqueo por inactividad y bloqueo al cerrar** | Un perfil de Chrome abierto no debe permitir firmar | Alta |
| P3 | **Nunca registrar el mnemonic ni material de clave en logs** | La propia extensión ya lo tenía en su plan de mejora | Alta |
| P4 | **Canal de distribución** (Chrome Web Store o autoalojada con política) | "Cargar desempaquetada" no sirve para usuarios reales | Alta |
| P5 | **Definir la cadena de producción** | Hoy la "producción" corre sobre un **anvil remoto en Cloud Run (31337)**: es una cadena de pruebas | **Bloqueante de decisión** |
| P6 | **Copiar/respaldar la frase de recuperación en la UX** | La wallet es del usuario: si pierde la contraseña o la frase, pierde el acceso | Alta |
| P7 | **Mostrar con claridad qué wallet y qué cuenta firman** | Con dos wallets instaladas, el usuario puede firmar con la que no cree | Media |
| P8 | **Versionado del entregable** (v1.1 con CHANGELOG) | El zip original es un entregable académico; no debe mutar sin registro | Media |
| P9 | **Revisión de tratamiento de datos** (KYC + wallet) | El proyecto ya declara GDPR; la wallet añade un punto de custodia | Media |

### 8.5 Riesgos nuevos

1. **Producción sobre una cadena de pruebas.** Si la cadena sigue siendo el anvil remoto, los activos no tienen valor: conviene decidir si esto es un **piloto productivo** (usuarios reales, valor simbólico) o **producción real** (testnet/mainnet). Cambia claves, RPC, permisos y el mensaje de riesgo al usuario.
2. **Recuperación de la contraseña.** Al cifrar la bóveda aparece el problema clásico: si el usuario olvida la contraseña, necesita la frase de 12 palabras. Hay que diseñarlo antes de cifrar, no después.
3. **Ambigüedad de firma con dos wallets.** Es el riesgo de UX más probable en producción: el usuario cree firmar con una cuenta y firma con otra. Se mitiga con el selector y con mostrar wallet y cuenta en cada aprobación.
4. **El entregable académico y el producto divergen.** Al modificar la extensión, el zip deja de ser el entregado. Se resuelve versionando (v1.1) y manteniendo el original intacto.

### 8.6 Siguiente bloque de 3 preguntas

1. **Cifrado y desbloqueo:** ¿contraseña por sesión (estilo keystore) o biometría/WebAuthn? ¿Y con qué autobloqueo por inactividad (5, 15, 30 minutos)?
2. **Distribución:** ¿Chrome Web Store, autoalojada con política de empresa, o de momento solo para el equipo con vistas a publicar?
3. **Cadena de producción:** ¿seguimos con el **anvil remoto de GCP (31337)** o se prevé una **testnet/mainnet real**? De esto depende el tratamiento de claves y el mensaje de riesgo que verá el usuario.


---

## 9. Avance de implementación (2026-09-13)

Primer incremento ejecutado, **sin subir a repositorios ni desplegar**, según la orden vigente.

### 9.1 Qué se hizo (extensión **v1.1.0**)

| Área | Cambio | Archivos |
|---|---|---|
| **Identidad visual** | Tokens del proyecto portados a la extensión (navy/teal/gold, gradientes, radios, curvas, tipografías) y aplicados al popup de la wallet, a la ventana de conexión y a la de confirmación | `src/theme.css` (nuevo), `src/index.css`, `src/App.css`, `connect.html`, `notification.html`, `src/connect-main.tsx`, `src/notification-main.tsx` |
| **Marca** | Activos de TrueKeate incorporados y anuncio EIP-6963 con el color de la marca | `public/brand/` (nuevo), `src/inject.ts` |
| **Iconos** | Generador adaptado: degradado navy→teal con anillo hexagonal dorado | `scripts/generate-icons.mjs`, `public/icon-{16,48,128}.png` |
| **Método bloqueante** | **`personal_sign` (EIP-191)** con aprobación del usuario; tolera el orden invertido de parámetros y firma bytes si el mensaje llega en hexadecimal | `src/background.ts` |
| **Otros métodos** | `wallet_revokePermissions`, `eth_call`, `eth_blockNumber`, `eth_estimateGas` | `src/background.ts` |
| **Página de pruebas** | Reescrita y **mantenida**: proveedores EIP-6963, conexión, cuenta/red/balance/bloque, firma EIP-191 y EIP-712, `eth_call`, revocación y panel de resultados por comprobación. Entra en el build (`dist/test.html`) | `test.html`, `src/test-page.ts` (nuevo), `vite.config.ts` |
| **Documentación** | README, CHANGELOG (entrada 1.1.0) y guía de pruebas | `README.md`, `CHANGELOG.md`, `GUIA_RAPIDA_TESTING.md`, `src/manifest.ts` |

### 9.2 Verificación realizada

- **Build de la extensión correcto** y `dist/manifest.json` en **1.1.0**.
- **Pruebas propias de la extensión: exit 0** — 20 comprobaciones (importes), 6 tests de contratos (Foundry) y 41 comprobaciones del background.
- **Lint sin errores** en los archivos nuevos y modificados.
- **Paquete comprobado**: `dist/test.html`, `dist/brand/TrueKeate_logo.svg`, los tres iconos PNG y el CSS de marca entran en el build.

### 9.3 Límites de esta verificación

- **No se pudo probar en un navegador real**: falta `libnspr4.so` para Chromium y no hay root en este entorno. La comprobación visual de los tres popups y la travesía completa en la página de pruebas quedan **pendientes en la máquina del director**.
- El popup cambia de ancho a 380 px (formato wallet, como MetaMask): conviene revisarlo visualmente.

### 9.4 Salvedad importante sobre el control de versiones

El árbol de trabajo de la extensión **ya tenía cambios sin commitear** (de la sesión del 12-sep) antes de este incremento. Mis cambios se han aplicado **encima**, y en cuatro archivos (`src/background.ts`, `src/inject.ts`, `src/manifest.ts` y los `.md`) **quedan mezclados con ese trabajo previo** en un mismo diff.

Recomendación: **commitear por separado** el trabajo previo y este incremento antes de publicar, o revisar el diff archivo por archivo. La extensión está respaldada en `backups/codecrypto-wallet-backup-20260912-2021.zip`, así que nada de lo previo se ha perdido.

### 9.5 Siguiente paso del plan

Fase **1.5 (bóveda cifrada)**, que es el requisito bloqueante para producción, y Fase **2 (selector de proveedor EIP-6963 en el proyecto)** para la convivencia con MetaMask. Ambas esperan la decisión sobre cifrado y distribución planteada en la §8.6.


### 9.6 Segundo incremento — bóveda cifrada (Fase 1.5, núcleo)

Implementado y verificado el **núcleo** del requisito bloqueante P1–P3, sin subir ni desplegar:

- **`src/vault.ts` (nuevo)**: cifrado del mnemonic con **AES-GCM-256** y clave derivada
  por **PBKDF2-SHA256 (600 000 iteraciones + salt de 16 B)**; todo en base64 para
  `chrome.storage`. La clave derivada se guarda **solo en `chrome.storage.session`**
  (memoria, no disco) y hay **autobloqueo a los 15 minutos** de inactividad.
- **Métodos RPC**: `wallet_createVault`, `wallet_unlock`, `wallet_lock` y
  `wallet_vaultStatus`, con dos salvaguardas: **una dApp no puede invocarlos**
  (`sender.tab`) y la firma se rechaza con un mensaje claro cuando la bóveda está
  bloqueada, **sin abrir la ventana de aprobación**.
- **Migración**: al crear la bóveda se **borra el mnemonic en claro**; mientras no
  exista, la wallet sigue usando el heredado para no romper nada.
- **`scripts/test-vault.mjs` (nuevo), integrado en `npm test`**: **25 comprobaciones**,
  entre ellas que la bóveda almacenada **no contiene ni una palabra del mnemonic**,
  que la contraseña incorrecta no abre, que bloqueada no se firma y que una dApp no
  puede llamar a los métodos de la bóveda.

**Pendiente inmediato (UI):** el popup todavía no tiene la pantalla de **crear
contraseña** ni la de **desbloquear**, así que la bóveda es usable por RPC pero no
por el usuario final. Hasta que se cablee, el camino heredado (mnemonic en claro)
sigue activo: **es el siguiente paso obligado** para cerrar P1 de verdad.

**Hallazgo de seguridad preexistente:** las pruebas actuales invocan
`wallet_validateMnemonic`, `wallet_generateMnemonic` y `wallet_getChains` **simulando
una dApp**, es decir, hoy cualquier web puede llamarlos. No lo he cambiado porque
esos casos están fijados en la suite del entregable; requiere decisión y actualizar
esas pruebas.


### 9.7 Tercer incremento — interfaz de la bóveda (cierra P1 a nivel de código)

- **`VaultPassword.tsx` (nuevo)**: al crear o importar la wallet se pide una contraseña
  (mínimo 8 caracteres, con confirmación) y se cifra la frase en la bóveda. Mientras no
  exista bóveda, **la frase no se escribe en disco**.
- **`VaultUnlock.tsx` (nuevo)**: pantalla de desbloqueo cuando la bóveda está cerrada.
- **`App.tsx`**: arranque consciente de la bóveda (cerrada → desbloquear; abierta → cargar
  las cuentas ya derivadas **sin necesidad de la frase**), botón **🔒 Bloquear** y aviso de
  migración con botón «Cifrarla ahora» para frases heredadas en claro.
- **Corregido de raíz**: `applyWallet` escribía `codecrypto_mnemonic` en
  `chrome.storage.local` en **cada** carga del popup, incluso después de crear la bóveda.
  Ahora solo persiste cuentas, índice y red.
- **Verificación**: type-check, build y lint limpios; `npm test` **exit 0** con 20 + 6 + 41 +
  25 comprobaciones. La comprobación **interactiva en navegador sigue pendiente** (falta
  `libnspr4.so` en este entorno), por lo que los flujos de crear/desbloquear/migrar deben
  probarse en la máquina del director antes de dar P1 por cerrado.
- **Sigue vigente la compatibilidad**: una wallet con frase en claro y sin bóveda funciona,
  con aviso de migración. El respaldo heredado se eliminará cuando todas migren.


---

## 10. Cambio de alcance (2026-09-13): extensión académica, sin distribución

**Decisión del director:** la extensión **no se distribuye**; es un artefacto con fines
**académicos** (se carga desempaquetada desde `chrome://extensions`).

### 10.1 Qué se cae del plan

| Requisito | Estado anterior | Ahora |
|---|---|---|
| **P4 · Canal de distribución** (Web Store / autoalojada) | Alta prioridad | **Eliminado del alcance** |
| **P5 · Cadena de producción** (anvil vs testnet/mainnet) | Bloqueante de decisión | **Deja de ser decisión de producto**: la plataforma en GCP sigue con MetaMask y la wallet apunta al anvil remoto (31337) para prácticas |
| **P9 · Revisión de datos (KYC + wallet)** | Media | **No aplica**: sin usuarios reales |
| Fase 4 · Endurecimiento y distribución | 12–20 h | Se reduce a lo didáctico (~4–6 h): coherencia, lint y documentación. **Sin auditoría formal ni canal** |

### 10.2 Qué se mantiene (y por qué)

- **P1–P3 (bóveda cifrada, autobloqueo, no registrar el mnemonic)**: ya implementados y
  probados. Se conservan como **calidad didáctica** —enseñar cómo se protege una clave es
  parte del valor del ejercicio—, pero **dejan de ser requisito bloqueante**. No hay nada
  que revertir.
- **La página de pruebas**: pasa a ser el **artefacto didáctico principal**, porque es donde
  el estudiante ve funcionar la wallet sin depender de la plataforma. Mantenerla es ahora
  más importante que empaquetar la extensión.
- **La convivencia con MetaMask (Fase 2)**: sigue siendo necesaria —en un aula habrá
  estudiantes con MetaMask instalada— y ya está implementada.
- **Fase 3 (integración con GCP)**: sigue teniendo sentido como **práctica**: cargar la
  extensión desempaquetada y operar contra la plataforma desplegada. Es más sencillo sin
  usuarios reales de por medio.
- **El empaquetado como entregable académico** (`scripts/package-delivery.sh` → el zip de
  entrega) se mantiene; lo que desaparece es el **canal de distribución**.

### 10.3 Corrección de la lectura anterior

La decisión previa «producción en GCP con esta wallet» **queda sin efecto**: si la wallet no
se distribuye, no puede ser la que usen usuarios reales. La lectura vigente es:

> La plataforma TrueKeate mantiene **MetaMask** como wallet de producción; la wallet propia
> es un **artefacto académico paralelo** que se integra con la plataforma para prácticas y
> demostraciones, y se carga desempaquetada.

### 10.4 Plan vigente

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Extensión v1.1: identidad visual, `personal_sign`, página de pruebas | ✅ hecha |
| 1.5 | Bóveda cifrada + su interfaz | ✅ hecha (calidad didáctica) |
| 2 | Convivencia de wallets en el proyecto | ✅ hecha |
| 3 | Práctica de integración contra GCP (extensión desempaquetada) | pendiente |
| 4 | Cierre didáctico: coherencia, lint, documentación y zip de entrega | pendiente (~4–6 h) |
| 5 | EIP-712 unificado | opcional |


---

## 11. Fase 3 — práctica de integración contra GCP (entregable)

Con la extensión fuera del canal de distribución (§10), la Fase 3 queda como **práctica
académica**: cargar la extensión desempaquetada y operar contra la plataforma desplegada.

**Entregable:** `chrome-wallet/PRACTICA_INTEGRACION_GCP.md` — guía paso a paso (cargar
desempaquetada, crear la bóveda, añadir la red de GCP con su permiso de host, ejecutar la
página de pruebas y operar contra la plataforma), con la tabla de comprobaciones esperadas
y qué significa cada fallo.

**Comprobado desde el entorno de desarrollo:**

| Comprobación | Resultado |
|---|---|
| Cadena de GCP (anvil remoto) | **Viva**, `chainId = 0x7a69` (31337), bloque `0x113` |
| Plataforma desplegada | `truekeate-web` rev. `00032-t7x` · `truekeate-api` rev. `00025-484` |
| Permiso de host al añadir red | **Implementado**: `ChainManager.tsx:60` llama a `chrome.permissions.request` desde el popup (gesto de usuario) |
| Suite de la extensión | Verde: importes + contratos + service worker (41) + bóveda (25) |

**Hallazgo que afecta a la práctica:** la wallet identifica las redes por `chainId`, y el
anvil local y el de GCP **comparten el 31337**, así que no pueden coexistir como dos
entradas: hay que editar la red para cambiar de uno a otro. Queda documentado en la guía.

**Pendiente:** validar los pasos interactivos en la máquina del director (este entorno no
tiene navegador) y comprobar el selector de billetera con MetaMask y la wallet propia
instaladas a la vez.
