# Manual Técnico 05 — Backend: Relayer EIP-712 (meta-transacciones)

> **Alcance**: implementación real del relayer de meta-transacciones de TrueKeate (Ciclo 5): envío de intents EIP-712 a la blockchain asumiendo el gas, protecciones anti-abuso D16/D29, health SLA (D15) y fallback D39.
> **Fuentes leídas**: `backend/relayer.js`, `backend/test/relayer.test.js`, `backend/test/integracion-relayer.js`, `backend/api/routes/truekes.js` (integración), `sc/src/SmartAccount.sol` (estado de verificación), `sc/src/SmartAccountFactory.sol` (mapping cuentas), `RepoTecnico/arquitectura_tecnica.md` §6 (diseño de referencia).
> **Convención**: referencias `ruta:línea` al código real. Lo no verificable se marca **"pendiente de confirmar"**.

---

## 1. Rol del relayer (RF-09.1/09.2)

### 1.1 Qué hace

- Envía **meta-transacciones de particulares** a la blockchain **asumiendo el gas** (RF-09.1/09.2), desde la cuenta configurada como wallet del relayer (cuenta 1 del anvil, RF-15.2, según cabecera) — `backend/relayer.js:1-19`.
- Las **empresas no pasan por el relayer**: pagan su propio gas (R1/RF-09.3) mediante transacciones directas — ver manual 06 (routes/truekes.js).
- El relayer se integra en la capa API como **función pura** `procesarIntent`; los endpoints autenticados y el rate-limiting se aplican en la capa API (C6) — `backend/relayer.js:13-15`.

### 1.2 Clase `RelayerEIP712` y constructor

- Constructor con dependencias inyectadas: `provider`, `wallet` (signer que paga el gas), `smartAccountFactory` (dirección de la factory para el chequeo de allowlist) y `abiSmartAccount`; crea `this.iface = new ethers.Interface(abiSmartAccount)` para codificar llamadas (`backend/relayer.js:34-40`).
- **Estado anti-abuso en memoria** (`backend/relayer.js:42-46`): `registro` es un `Map` por signer con `{ nonceLocal, contadorDia, dia, fallos: [], bloqueadoHasta }`; más contadores globales `enviadas` y `rechazadas` por motivo (nonce, noVerificado, limite, bloqueado, fallo).
- El comentario indica que el estado se persiste en producción en PostgreSQL/C6 (`backend/relayer.js:31-32,42`); en el código actual **sigue en memoria** → ver §8.

### 1.3 Configuración por entorno

| Variable | Default | Significado | Línea |
|---|---|---|---|
| `LIMITE_METATX_DIARIO` | `20` | Máx. meta-tx por usuario/día (D29) | `backend/relayer.js:22` |
| `UMBRAL_FALLOS` | `3` | Fallos en ventana que disparan bloqueo (D29) | `backend/relayer.js:23` |
| `VENTANA_FALLOS_MS` | `10 * 60 * 1000` (10 min) | Ventana deslizante de fallos | `backend/relayer.js:24` |
| `BLOQUEO_MS` | `60 * 60 * 1000` (1 h) | Duración del bloqueo temporal | `backend/relayer.js:25` |
| `GAS_MAXIMO` | `300000` | Gas limit de la tx enviada | `backend/relayer.js:26` |

---

## 2. Protecciones anti-abuso (D16 + D29)

### 2.1 Orden de validación en `procesarIntent`

`procesarIntent(intent)` recibe `{ signer, destino, valor, data, nonce, firma, chainId }` y valida en secuencia (`backend/relayer.js:128-181`):

1. **Dominio con chainId** (protección 4, D16) — `backend/relayer.js:138-143`.
2. **Bloqueo temporal** (protección 5, D29) — `backend/relayer.js:145-150`.
3. **Límite diario** (protección 3, D29) — `backend/relayer.js:152-156`.
4. **Nonce + allowlist on-chain** (protecciones 1+2, D16) — `backend/relayer.js:158-160`.
5. **Envío** y registro de éxito/fallo — `backend/relayer.js:162-181`.

### 2.2 Protección 1 — chainId del dominio (D16)

- Si el intent trae `chainId` y no coincide con `provider.getNetwork().chainId`, se rechaza con `chainId incorrecto` (`backend/relayer.js:138-143`). Es el anclaje del dominio EIP-712 a la red (31337 en dev).

### 2.3 Protección 2 — nonce único anti-replay (D16)

- `_validarCuenta(signer, nonceInt)` comprueba primero el **nonce local**: si `nonceInt <= e.nonceLocal` (con `nonceLocal` inicializado en `-1`) rechaza con `nonce repetido (anti-replay D16)` y cuenta en `rechazadas.nonce` (`backend/relayer.js:93-98`).
- Al éxito, el nonce aceptado se guarda en `nonceLocal` (`backend/relayer.js:171-172`), de modo que un intent con nonce antiguo no se reenvía.
- **Nota de fidelidad**: el diseño (D16, arquitectura §6.1) prevé la validación del nonce **contra la Smart Account on-chain**; el código lo hace con un registro local y menciona el chequeo on-chain como "opcional" (`backend/relayer.js:9-10, 89-92`). La validación estricta contra el nonce consumido en la Smart Account **no está implementada** → pendiente de confirmar.

### 2.4 Protección 3 — allowlist: solo particulares VERIFICADOS on-chain (D16/D28)

- Dentro de `_validarCuenta`, tras el nonce, el relayer:
  1. Resuelve la Smart Account del signer vía la factory con `factory.cuentas(signer)` (`_cuentaDe`, `backend/relayer.js:117-126`); sin factory configurado devuelve `null`.
  2. Lee **on-chain** el estado de verificación con `provider.call` a `estadoVerificacion()` (`backend/relayer.js:102-104`); la función es un getter público de la Smart Account (`sc/src/SmartAccount.sol:52`).
  3. Si el estado parseado `< 1` (es decir, INSCRITO) rechaza con `signer no verificado (D28/D14)` (`backend/relayer.js:105-109`). Estado 1 = VERIFICADO, 2 = CERTIFICADO.
  4. Si la smart account no existe o la llamada falla, rechaza con `sin smart account verificada (allowlist D16)` (`backend/relayer.js:110-113`).
- **Matiz implementado vs. comentario**: la cabecera indica que sin RPC/factory configurado se acepta con chequeo local en modo test (`backend/relayer.js:89-92`), pero en la implementación la ausencia de factory (`_cuentaDe` → `null`) o un fallo de `provider.call` **siempre rechaza** por el `catch`. En los tests se mockea `_cuentaDe` para devolver una smart account existente (`backend/test/relayer.test.js:48`).

### 2.5 Protección 4 — límite diario de 20 meta-tx (D29)

- `_checkLimiteDiario(signer, ahora)` usa un día civil calculado como `Math.floor(ahora / 86_400_000)`; si cambia el día reinicia el contador; si `contadorDia >= LIMITE_DIARIO` devuelve `true` (rechazo) (`backend/relayer.js:77-86`).
- En `procesarIntent` el rechazo devuelve `límite diario de ${LIMITE_DIARIO} meta-tx superado (D29)` (`backend/relayer.js:152-156`).

### 2.6 Protección 5 — bloqueo temporal tras fallos (D29)

- `_registrarFallos(signer, ahora)` encola el timestamp del fallo, limpia los fuera de la ventana de 10 min y, si hay ≥ `UMBRAL_FALLOS` (3) fallos en la ventana, fija `bloqueadoHasta = ahora + BLOQUEO_MS` (1 h) (`backend/relayer.js:56-66`).
- `_checkBloqueo` devuelve el tiempo restante en ms si el bloqueo sigue activo, o 0 (`backend/relayer.js:69-74`).
- El disparo del bloqueo ocurre cuando una transacción **revierte en cadena** (`rc.status === 0`) (`backend/relayer.js:177-180`); los rechazos de las validaciones previas (nonce, allowlist, límite) NO cuentan como fallo de este mecanismo.

---

## 3. Envío de la meta-transacción

### 3.1 Construcción de la transacción

- El relayer envía desde `this.wallet` una tx **hacia la Smart Account del signer** con `data = iface.encodeFunctionData('execute', [destino, valor, data, nonce, firma])` y `gasLimit: GAS_MAXIMO` (`backend/relayer.js:162-167`).
- El destino del `to` se resuelve con `_cuentaDe(signer) ?? signer` (si no hay factory, cae al propio signer) (`backend/relayer.js:164`).
- La Smart Account es la encargada de verificar firma/nonce y ejecutar (patrón ERC-4337; ver manual 01-contratos-escrow / contratos de identidad).

### 3.2 Resultado

- **Éxito** (`rc.status === 1`): actualiza `nonceLocal`, incrementa `contadorDia` y `enviadas`, devuelve `{ ok: true, txHash, costoWei: rc.gasUsed.toString() }` (`backend/relayer.js:170-176`).
- **Fallo on-chain** (`rc.status === 0`): registra el fallo para el bloqueo D29, cuenta en `rechazadas.fallo` y devuelve `{ ok: false, motivo: tx revertida (hash) }` (`backend/relayer.js:177-180`).

### 3.3 Integración con la API (routes/truekes.js)

- La ruta de trueques delega en `relayer.procesarIntent({ signer, destino: contratoEscrow, valor: 0n, data, nonce, firma, chainId })` para particulares; si `rl.ok === false` responde `422 { error: 'meta_tx_rechazada', detalle: rl.motivo }` (`backend/api/routes/truekes.js:30-36`).
- **Estado real**: el helper `_enviar` de `backend/api/routes/truekes.js:17-40` está **definido pero no es invocado por ninguna ruta** del ciclo actual (las rutas actuales solo registran el intent en el almacén de memoria). La orquestación relayer ↔ API de trueques queda "preparada", no activa → pendiente de confirmar su cableado en la integración C8.

---

## 4. Métricas y health (D15, H-17)

### 4.1 `metricas()`

- Devuelve `{ enviadas, rechazadas: {nonce, noVerificado, limite, bloqueado, fallo}, signersActivos: registro.size }` para el dashboard del Owner (RF-18.1/H-17) (`backend/relayer.js:183-190`).

### 4.2 `health()` — SLA ≥ 99 % (D15)

- Consulta en paralelo el **saldo** de la wallet (`provider.getBalance`) y la **red** (`provider.getNetwork`) (`backend/relayer.js:192-204`).
- Devuelve `{ ok: true, wallet, saldoWei, chainId, saldoBajo }`; `saldoBajo = balance < ethers.parseEther('0.5')` — alerta temprana al Owner de que el fondo de gas está bajo (D15/D7) (`backend/relayer.js:203`).
- El consumo de `health()` se expone vía `GET /admin/infra/health` (`backend/api/routes/admin.js:43-49`) — ver manual 06.

### 4.3 Resiliencia (diseño D15) vs. código

- La arquitectura §6 prevé **mínimo 2 instancias** con cola de reintentos y failover, SLA ≥ 99 % de uptime (D15/RNF-03.3). El código actual solo ofrece `health()` y `metricas()`; **no hay cola de reintentos ni multi-instancia en este archivo** → pendiente de confirmar (orquestación de despliegue).

---

## 5. Fallback ante indisponibilidad (D39)

- Política documentada en la cabecera (`backend/relayer.js:17-18`): ante indisponibilidad prolongada (> 1 h) se activa el **modo degradado** — el usuario paga el gas directamente con su wallet y la plataforma **reembolsa en BRLT** si la caída fue del operador.
- **Estado real**: no existe en el código un interruptor de "modo degradado" ni una lógica de reembolso BRLT; es una política operativa documentada (también en `arquitectura_tecnica.md` §6) → pendiente de confirmar su implementación (proceso operativo H-02).

---

## 6. Suite de pruebas del relayer (7/7)

- Archivo: `backend/test/relayer.test.js`; ejecución verificada en este análisis: **7/7 verdes** (backend total 26/26 — ver manual 08).
- El proveedor se simula (`proveedorMock`, `backend/test/relayer.test.js:23-36`): `getNetwork` devuelve chainId 31337, `getBalance` configurable, y `call` devuelve el estado de verificación configurado (0=INSCRITO, 1=VERIFICADO, 2=CERTIFICADO).
- `setupRelayer` inyecta una wallet con clave ficticia y mockea `_cuentaDe` (`backend/test/relayer.test.js:38-50`).
- Casos:
  1. Acepta intent de signer VERIFICADO (protecciones D16 ok) (`backend/test/relayer.test.js:65-72`).
  2. Rechaza signer NO VERIFICADO (INSCRITO, estado 0 — allowlist D16/D28) (`backend/test/relayer.test.js:74-81`).
  3. Rechaza nonce repetido (anti-replay D16) (`backend/test/relayer.test.js:83-91`).
  4. Rechaza chainId incorrecto (dominio D16) (`backend/test/relayer.test.js:93-100`).
  5. Límite diario: rechaza la meta-tx n.º 21 (D29) (`backend/test/relayer.test.js:102-114`).
  6. 3 fallos en 10 min → bloqueo temporal 1 h (D29) (`backend/test/relayer.test.js:116-135`).
  7. Health: saldo y red (D15) (`backend/test/relayer.test.js:137-143`).
- Existe además `backend/test/integracion-relayer.js` (script de integración, no parte de `npm test`) — ver manual 08.

---

## 7. Limitaciones y pendientes observados

- **Estado en memoria**: `registro` (nonces, contador diario, bloqueos) se pierde al reiniciar el proceso; la persistencia en PostgreSQL/`auditoria` está declarada como objetivo de producción (`backend/relayer.js:31-32`) pero no implementada.
- **Nonce on-chain no consumido**: la validación de replay es local (`nonceLocal`); el nonce real de la Smart Account no se lee ni se sincroniza (`backend/relayer.js:93-98`).
- **Sin cola de reintentos / backoff** ni segunda instancia en el código (diseño D15; `backend/relayer.js:192-205` solo expone health).
- **Fallback D39** documentado pero sin lógica implementada (`backend/relayer.js:17-18`).
- **Contabilización**: el rechazo por chainId incorrecto se suma a `rechazadas.nonce` (mismo contador que el anti-replay), lo que mezcla dos motivos en una métrica (`backend/relayer.js:141`).
- **Modo test vs. producción**: el matiz "aceptar con chequeo local si no hay RPC/factory" del comentario no se corresponde con el comportamiento real (siempre rechaza sin smart account verificada) (`backend/relayer.js:89-92` vs. `101-113`).
