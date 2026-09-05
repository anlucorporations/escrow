# Manual Técnico 07 · Wallets y cuentas — 08 · Fichas didácticas (tarjetas de estudio)

> Complemento didáctico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Fichas de estudio cortas por tema, con los bloques **¿Qué es? · ¿Para qué sirve? · Pasos clave ·
> Errores comunes · Consejo de seguridad**. Cada ficha se apoya SOLO en datos auditados el
> **2026-09-04** contra el anvil remoto (RPC `https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app`,
> chain ID `31337`) y en los manuales hermanos 01–06 de esta carpeta (`ruta:línea` al código real).
> Lo no verificable se marca **"pendiente de confirmar"** — no se inventa ningún dato.
> Jerarquía: `## Tema` → `### Ficha`.

**Índice de fichas**

- **Wallet** → Ficha 1.1 (qué es) · Ficha 1.2 (conectar a TrueKeate)
- **Red RPC del proyecto** → Ficha 2.1 (qué es) · Ficha 2.2 (parámetros auditados) · Ficha 2.3 (verificar la red activa)
- **Cuentas anvil** → Ficha 3.1 (qué son y tabla de referencia) · Ficha 3.2 (roles Owner/Admin y Relayer) · Ficha 3.3 (cuentas con y sin fondos)
- **Token BRLT** → Ficha 4.1 (qué es) · Ficha 4.2 (saldo y transferencias)
- **NFTs de trueques** → Ficha 5.1 (qué es TrueKeateNFT) · Ficha 5.2 (verificar propiedad)
- **Interacción y firma** → Ficha 6.1 (login EIP-191) · Ficha 6.2 (intents EIP-712 + relayer) · Ficha 6.3 (firma vs. transacción)

---

## 1. Wallet

### Ficha 1.1 · ¿Qué es una wallet?

**¿Qué es?**
- Aplicación que guarda tus **claves privadas** y firma por ti sin exponerlas. En este proyecto la
  wallet usada es **MetaMask** (RF-16): extensión de navegador en PC y app en móvil; la plataforma
  web corre en Next.js y delega la conexión y la firma a MetaMask (RF-16; móvil-first PWA que
  delega la firma a la wallet móvil, D40).
- La wallet **no guarda los tokens**: guarda las claves; los saldos (ETH, BRLT, NFTs) viven en la
  blockchain y la wallet solo los **lee y muestra** cuando está conectada a la red correcta.

**¿Para qué sirve?**
- Conectarse a la plataforma TrueKeate, firmar la sesión de login, autorizar intents de trueque y
  ver los activos de la red de pruebas: moneda nativa **ETH**, token **BRLT** (ERC-20) y NFTs del
  contrato **TrueKeateNFT** (ERC-721).

**Pasos clave**
1. Instalar MetaMask (extensión para PC o app móvil).
2. Añadir **una vez** la red del proyecto (ficha 2.2) — la plataforma no la añade por ti.
3. Cargar una cuenta de prueba: importar su **clave privada** (o la frase semilla completa del
   anvil, que deriva en las mismas direcciones; ficha 3.1).
4. Entrar en la web `https://truekeate-web-593453426217.europe-west1.run.app` y pulsar
   **"Conectar MetaMask e iniciar sesión"** (ficha 6.1).

**Errores comunes**
- Tener seleccionada otra red (p. ej. Ethereum Mainnet) → los saldos de prueba "no aparecen".
- Confundir **permiso para ver cuentas** (conectar) con **firma** o **transacción** (ficha 6.3).
- Importar en MetaMask claves del anvil creyendo que valen para producción.

**Consejo de seguridad**
- El mnemónico del anvil (`test test test test test test test test test test test junk`) es
  **público** en la documentación de Foundry: **nunca** uses estas cuentas ni sus claves con
  fondos reales o en producción (`03-cuentas-anvil.md:129-130`). La frase semilla no se comparte
  jamás.

### Ficha 1.2 · Conectar la wallet a TrueKeate

**¿Qué es?**
- El botón **"Conectar MetaMask e iniciar sesión"** (`web/components/BotonConectarLogin.tsx:22-33`)
  hace tres cosas en orden: **conectar** (MetaMask pide permiso para ver tus cuentas vía
  `eth_requestAccounts`, sin firma), **consultar** el estado de inscripción de la wallet
  (`GET /auth/estado?wallet=0x…`) y, si está inscrita, **autenticar** pidiendo la firma de sesión.

**¿Para qué sirve?**
- La plataforma solo muestra y firma con las cuentas que MetaMask tiene cargadas: para que la web
  "vea" a un usuario de prueba (p. ej. Ana) hay que importar su cuenta en MetaMask
  (`03-cuentas-anvil.md:75-77`). Sin wallet conectada, la suite queda bloqueada en la pantalla
  *"Conecta tu billetera para continuar"* (`web/components/SuiteGuard.tsx:27-51`).

**Pasos clave**
1. Pulsar **"🔗 Conectar MetaMask e iniciar sesión"** (guard de la suite o barra superior PC).
2. En MetaMask, aprobar el diálogo **"Conectar con TrueKeate"** (permiso de cuentas; no firma).
3. Si la wallet está inscrita, MetaMask pedirá la **firma de sesión** EIP-191 (ficha 6.1).
4. Al recargar la página, la app restaura la cuenta y el token guardados en `localStorage`
   (`truekeate.account` / `truekeate.token`; `web/lib/ethereum.tsx:41,63-77`).

**Errores comunes**
- Conectarse solo desde "Mi Trueke Central" (botón "Conectar MetaMask") → conecta pero **no
  firma** la sesión (`web/app/suite/dashboard/page.tsx:38-41`).
- Cambiar de cuenta en MetaMask: la plataforma escucha `accountsChanged`, actualiza la cuenta y
  **descarta el token de la cuenta anterior** → hay que volver a firmar
  (`03-cuentas-anvil.md:105-114`).
- Si MetaMask está bloqueada, la cuenta se conserva pero sin poder firmar: se pedirá desbloqueo
  (`web/lib/ethereum.tsx:69-76`).

**Consejo de seguridad**
- Conectar (ver cuentas) no revela tu clave ni firma nada; la **única firma** que pide la app al
  entrar es el mensaje de sesión. Revisa siempre qué texto firmas (ficha 6.1).

---

## 2. Red RPC del proyecto

### Ficha 2.1 · ¿Qué es la red RPC y por qué configurarla?

**¿Qué es?**
- La red del proyecto es un nodo **anvil/Foundry remoto** (cadena Ethereum de pruebas) expuesto por
  RPC: `https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app`. Sus parámetros auditados: **chain ID
  `31337`** (hex `0x7a69`) y moneda nativa **ETH** (simbólico de pruebas, 18 decimales).
- En esa red viven los contratos desplegados: **Escrow** `0x8a93d247134d91e0de6f96547cb0204e5be8e5d8`,
  **SmartAccountFactory** `0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849`, **BRLT** (BorloTokens)
  `0x6f6f570f45833e249e27022648a26f4076f48f78`, **TrueKeateNFT**
  `0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f` y **SociosRegistry**
  `0xb0f05d25e41fbc2b52013099ed9616f1206ae21b`.

**¿Para qué sirve?**
- La wallet debe apuntar a esta red para leer saldos y firmar para la plataforma. Distínguense tres
  piezas: la **red** (anvil 31337), la **web** `https://truekeate-web-593453426217.europe-west1.run.app`
  y la **API** `https://truekeate-api-593453426217.europe-west1.run.app`.

**Pasos clave**
1. Añadir la red a MetaMask con los valores auditados (ficha 2.2) — se hace **una vez, a mano**:
   la plataforma no invoca `wallet_addEthereumChain`/`wallet_switchEthereumChain` en `web/`
   (`02-conexion-red-rpc.md:40-42`).
2. Seleccionarla antes de operar (ficha 2.3).

**Errores comunes**
- Escribir mal la URL del RPC → MetaMask no podrá validar la red.
- Confundir el RPC del anvil con las URLs de la web o de la API (son servicios distintos).

**Consejo de seguridad**
- En esta red el ETH es **simbólico de pruebas**, sin valor: nunca la confundas con Ethereum
  Mainnet (chain ID `1`) ni conectes a ella una wallet con fondos reales.

### Ficha 2.2 · Parámetros auditados para añadir la red

**¿Qué es?**
- Los valores exactos para "Añadir una red manualmente" en MetaMask, auditados el 2026-09-04
  (`02-conexion-red-rpc.md:13-22`):

| Parámetro | Valor |
|---|---|
| Nombre de red (sugerido, libre) | `TrueKeate Anvil (pruebas)` |
| Nuevo RPC URL | `https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app` |
| Chain ID | `31337` (`0x7a69`) |
| Símbolo de moneda | `ETH` |
| Decimales | `18` |
| Explorador de bloques | *(dejar vacío)* — no hay explorador verificado |

**¿Para qué sirve?**
- Que MetaMask sepa a qué cadena conectarse; con estos valores exactos la wallet encuentra los
  contratos del proyecto (saldos BRLT, NFTs, etc.).

**Pasos clave**
1. MetaMask → selector de red (arriba) → **"Añadir red"** → **"Añadir una red manualmente"**
   (`02-conexion-red-rpc.md:45-55`).
2. Rellenar el formulario con los 5 valores de la tabla (explorador vacío).
3. **Guardar**: MetaMask validará el RPC y dejará la red seleccionada.

**Errores comunes**
- Poner `31337` como decimal en vez de entero, o copiar el chain ID de otra cadena.
- Rellenar el campo "Explorador de bloques" con una URL inventada.

**Consejo de seguridad**
- El nombre de red es solo visual; lo importante son **RPC URL** y **chain ID** — compáralos
  siempre con los auditados antes de guardar.

### Ficha 2.3 · Verificar que estás en la red correcta

**¿Qué es?**
- Comprobación rápida de que la wallet activa apunta al anvil de pruebas (chain ID `31337`) antes
  de conectar con la plataforma o importar tokens.

**¿Para qué sirve?**
- Los contratos del proyecto solo existen en la red `31337`: en cualquier otra cadena MetaMask no
  encontrará el BRLT ni los NFTs, y los saldos aparecerán vacíos aunque la cuenta sea la correcta.

**Pasos clave**
1. Abrir el **selector de red** de MetaMask: la red activa debe ser la del proyecto (p. ej.
   "TrueKeate Anvil (pruebas)").
2. Si dudas, entrar en **Ajustes → Redes** y editar la red: el **ID de cadena** debe ser `31337` y
   el RPC la URL auditada.
3. Si está seleccionada otra red (p. ej. Ethereum Mainnet), **cambiar** a la del proyecto antes de
   conectar con la web.

**Errores comunes**
- Creer que "perdiste" el BRLT o el NFT: casi siempre es que la wallet está en otra red.
- Firmar la sesión con la red equivocada: la firma funciona, pero luego la lectura de saldos y la
  interacción con los contratos fallan o muestran datos vacíos.

**Consejo de seguridad**
- Haz esta comprobación al inicio de cada sesión de pruebas: es la causa nº 1 de "no veo mis
  tokens".

---

## 3. Cuentas anvil

### Ficha 3.1 · ¿Qué son las cuentas del anvil?

**¿Qué es?**
- Anvil (Foundry) genera por defecto **20 cuentas** derivadas de un **mnemónico estándar conocido**
  y financia las primeras **10 (índices 0–9)** con ETH de prueba. Todas las direcciones y claves
  fueron **verificadas con ethers el 2026-09-04** (`03-cuentas-anvil.md`).
- Mnemónico: `test test test test test test test test test test test junk`
- Path de derivación HD: `m/44'/60'/0'/0/N` (N = índice). Es el mismo path por defecto de
  MetaMask: importar la frase semilla reproduce las mismas direcciones.

**¿Para qué sirve?**
- Son las cuentas de desarrollo/pruebas: despliegan contratos, opera el relayer y se prueban los
  flujos de la plataforma (usuarios de ejemplo "Ana"…"Karen").

**Tabla de referencia (direcciones auditadas)**

| N | Usuario de ejemplo | Dirección (0x…) | Notas |
|---|---|---|---|
| 0 | Owner/Admin | `f39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Despliega contratos; panel Owner. Tiene fondos. |
| 1 | Relayer/plataforma | `70997970C51812dc3A010C7d01b50e0d17dc79C8` | Paga el gas de las meta-tx. Tiene fondos. |
| 2 | Ana | `3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Usuario de prueba. Tiene fondos. |
| 3 | Bruno | `90F79bf6EB2c4f870365E785982E1f101E93b906` | Usuario de prueba. Tiene fondos. |
| 4 | Carla | `15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | Usuario de prueba. Tiene fondos. |
| 5 | Diego | `9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | Usuario de prueba. Tiene fondos. |
| 6 | Elena | `976EA74026E726554dB657fA54763abd0C3a0aa9` | Usuario de prueba. Tiene fondos. |
| 7 | Fabián | `14dC79964da2C08b23698B3D3cc7Ca32193d9955` | Usuario de prueba. Tiene fondos. |
| 8 | Gisela | `23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | Usuario de prueba. Tiene fondos. |
| 9 | Héctor | `a0Ee7A142d267C1f36714E4a8F75612F20a79720` | Usuario de prueba. Tiene fondos. |
| 10 | Irene | `Bcd4042DE499D14e55001CcbB24a551F3b954096` | ⚠️ **SIN FONDOS** (solo se financian 0–9). |
| 11 | Javier | `71bE63f3384f5fb98995898A86B02Fb2426c5788` | Sin fondos por defecto. |
| 12 | Karen | `FABB0ac9d68B0B445fB7357272Ff202C5651694a` | Sin fondos por defecto. |

> Las **claves privadas** completas de cada índice están en
> `RepoTecnico/Manuales/07-Wallets-y-Cuentas/03-cuentas-anvil.md:45-59`. Ejemplo de comprobación
> con ethers: la clave de Ana (índice 2, `0x5de4…365a`) deriva en
> `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`.

**Pasos clave**
1. Elegir la cuenta por su índice N (0–12) en la tabla.
2. Importarla en MetaMask con su **clave privada** (o con la frase semilla completa): MetaMask →
   "Añadir cuenta o cuenta de hardware" → **"Importar cuenta"** → pegar la clave
   (`03-cuentas-anvil.md:79-91`).
3. Comprobar que la dirección resultante coincide con la de la tabla (la plataforma normaliza a
   minúsculas, `web/lib/ethereum.tsx:57-59`).

**Errores comunes**
- Mezclar claves entre cuentas: cada clave privada deriva en UNA dirección concreta.
- Asumir que las 20 cuentas tienen fondos: anvil solo financia por defecto los índices **0–9**.
- Usar estas cuentas en producción: son de dominio público.

**Consejo de seguridad**
- Cualquiera que conozca una clave privada puede firmar por esa cuenta: las claves de la tabla son
  **solo para el anvil de pruebas** y no deben reutilizarse en entornos con datos reales
  (`03-cuentas-anvil.md:133-134`).

### Ficha 3.2 · Roles: Owner/Admin y Relayer

**¿Qué es?**
- La **cuenta 0 (Owner/Admin)** — `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` — desplegó los
  contratos y es la autoridad del panel Owner.
- La **cuenta 1 (Relayer/plataforma)** — `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` — paga el
  gas de las meta-transacciones de los particulares (RF-09.2, RF-15.2); el relayer del backend se
  construye con `RELAYER_PRIVATE_KEY` (`backend/api/index-gcp.js:64-82`).

**¿Para qué sirve?**
- Distinguir quién actúa en cada flujo de prueba: el Owner firma y administra; el relayer ejecuta
  pagando el gas; las cuentas 2–9 son usuarios particulares de ejemplo.

**Pasos clave**
1. Para probar el **panel Owner**: conectar con la cuenta 0.
2. Para probar **meta-transacciones**: el firmante usa una cuenta de usuario y el relayer (cuenta 1)
   envía la tx — patrón demostrado en `backend/test/integracion-relayer.js:30-45` (cuenta 0 firma,
   cuenta 1 paga el gas).
3. Para flujos de usuario: usar cualquiera de las cuentas 2–9 (Ana…Héctor).

**Errores comunes**
- Operar el panel Owner con una cuenta que no sea la 0.
- Creer que el relayer es "un usuario": es la wallet del backend que paga el gas ajeno.

**Consejo de seguridad**
- En producción las claves de Owner y relayer viven en Secret Manager
  (`03-cuentas-anvil.md:131-132`); las de la tabla solo valen para el anvil de pruebas.

### Ficha 3.3 · Cuentas con y sin fondos

**¿Qué es?**
- El anvil remoto financia por defecto los índices **0–9** (Owner, Relayer, Ana…Héctor). Las
  cuentas **10–12** (Irene, Javier, Karen) existen y pueden importarse, pero **no reciben ETH por
  defecto**: Irene está verificada SIN FONDOS en este anvil.

**¿Para qué sirve?**
- Saber por qué una cuenta no puede ejecutar ciertas operaciones: **firmar un mensaje no consume
  gas** (login EIP-191 y firma de intents EIP-712), pero **enviar una transacción directa sí**
  requiere ETH de prueba en la cuenta.

**Pasos clave**
1. Identificar si la cuenta de prueba está en 0–9 (con fondos) o en 10–12 (sin fondos).
2. Si un flujo necesita que Irene/Javier/Karen paguen gas, **financiarlas primero**: enviarles ETH
  desde una cuenta con fondos (transacción normal de la red; no hay faucet automático verificado →
  mecanismo de financiación **pendiente de confirmar**).
3. Verificar el saldo de ETH en MetaMask con la red 31337 seleccionada.

**Errores comunes**
- Creer que todas las cuentas del anvil tienen ETH por defecto (solo 0–9).
- Confundir "puedo firmar" (sin gas) con "puedo enviar una transacción" (con gas).

**Consejo de seguridad**
- Las cuentas sin fondos (10–12) sirven para probar cómo se comporta la plataforma con usuarios
  sin saldo; no intentes "crear" ETH: es la red de pruebas la que decide qué se financia.

---

## 4. Token BRLT

### Ficha 4.1 · ¿Qué es BRLT?

**¿Qué es?**
- **BRLT** es el token del contrato **BorloTokens**, estándar **ERC-20** (`balanceOf`, `transfer`,
  …), desplegado en la red `31337` en la dirección
  `0x6f6f570f45833e249e27022648a26f4076f48f78`. Parámetros auditados: **símbolo `BRLT`** y
  **18 decimales** (`04-token-brlt.md:10-17`).
- Es la stablecoin interna de la plataforma (RF-12.1): se **emite** solo a través del padrón de
  Socios (`SociosRegistry`, que ya validó quórum ≥2/3) — no se "crea" BRLT desde la wallet ni desde
  la plataforma sin ese mecanismo (`04-token-brlt.md:27-38`).

**¿Para qué sirve?**
- Medio de valor/compensación interno de la plataforma. Regla de negocio importante (RF-14.7/14.8,
  D5): en la **plataforma**, el saldo BRLT solo es visible y gestionable para **Socios y Owner**;
  pero en la **blockchain** cualquier dirección con BRLT puede ver su propio saldo desde la wallet
  (`04-token-brlt.md:40-57`).

**Pasos clave**
1. Tener seleccionada la red del proyecto (chain `31337`).
2. En MetaMask → "Activos" → **"Importar tokens"** → **"Token personalizado"**.
3. Pegar la dirección `0x6f6f570f45833e249e27022648a26f4076f48f78`: MetaMask autocompleta símbolo
   (`BRLT`) y decimales (`18`) leyendo el contrato; si no, escribirlos a mano.
4. **Añadir token personalizado** → **Importar**.

**Errores comunes**
- Confundir BRLT (token ERC-20 de contrato) con **ETH** (moneda nativa de la red, la que paga el
  gas).
- Aceptar un token llamado "BRLT" desde otra dirección: siempre verificar la dirección del
  contrato.
- Olvidar que el saldo en la plataforma (módulo Finanzas) se muestra solo a Socios/Owner, aunque
  en MetaMask el tuyo sí se vea.

**Consejo de seguridad**
- Los tokens con mismo símbolo pero distinta dirección son un clásico del fraude: la dirección
  auditada `0x6f6f…48f78` es la única del contrato BorloTokens del proyecto.

### Ficha 4.2 · Saldo y transferencias BRLT (ERC-20)

**¿Qué es?**
- Leer un saldo ERC-20 = llamar a `balanceOf(dirección)` del contrato; mover tokens = llamar a
  `transfer(destino, cantidad)`. Al ser 18 decimales, **1 BRLT = 10^18 unidades base** si se lee el
  contrato directamente (las wallets ya hacen la conversión).

**¿Para qué sirve?**
- Comprobar con datos reales que una cuenta tiene BRLT (p. ej. tras una emisión aprobada por los
  Socios) o transferirlo entre cuentas de prueba de la red `31337`.

**Pasos clave**
1. Red `31337` seleccionada y BRLT importado en MetaMask (ficha 4.1): el saldo que muestra la
  wallet es el resultado de `balanceOf(tu dirección)`.
2. Para transferir: MetaMask → BRLT → **Enviar** → dirección destino + cantidad → confirmar
  (paga gas en ETH de prueba; mecanismo genérico ERC-20, sin UI propia auditada en la plataforma →
  **pendiente de confirmar**).
3. Verificación independiente: consultar `balanceOf` directamente sobre la dirección del contrato.

**Errores comunes**
- Leer el saldo con la red equivocada (fuera de `31337` el contrato no existe).
- Interpretar cantidades crudas sin aplicar los **18 decimales** al leer el contrato a mano.
- Esperar que la UI de la plataforma muestre BRLT a un PARTICULAR: por RF-14.7/14.8 solo
  Socios/Owner ven su saldo BRLT en la plataforma.

**Consejo de seguridad**
- Las transferencias son **irreversibles** en blockchain: verifica la dirección destino completa
  antes de enviar, incluso en pruebas.

---

## 5. NFTs de trueques

### Ficha 5.1 · ¿Qué es TrueKeateNFT?

**¿Qué es?**
- Contrato **TrueKeateNFT**, estándar **ERC-721** (`balanceOf`, `ownerOf`, `mint`, `transferFrom`,
  …), desplegado en la red `31337` en `0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f`. Nombre
  **"TrueKeate NFT"**, símbolo **TKANFT** (`05-nfts-trueques.md:12-26`).
- Es un **mock de pruebas** (carpeta `sc/src/mocks/`, `sc/src/mocks/TrueKeateNFT.sol:1-18`): en el
  entorno de desarrollo representa los NFTs/certificados de los objetos ofrecidos en trueques. El
  contrato productivo definitivo de representación de objetos es **pendiente de confirmar**
  (`05-nfts-trueques.md:28-40`).

**¿Para qué sirve?**
- Representar el objeto/certificado de un trueque como token **no fungible** (único) y poder
  comprobar quién lo posee en la cadena.

**Pasos clave**
1. Identificar el contrato (dirección auditada `0x99db…612f`) y el **token ID** (entero; los IDs
  son **secuenciales desde 1** porque el `mint` usa `_siguienteTokenId`).
2. Para verlo en MetaMask: red `31337` → pestaña **"NFTs"** → **"Importar NFTs"** → dirección del
  contrato + token ID (p. ej. `1`).
3. Comprobar la propiedad con `ownerOf(tokenId)` / `balanceOf(dirección)` (ficha 5.2).

**Errores comunes**
- Tratar el mock como el contrato definitivo de producción (no lo es: es un NFT de pruebas).
- Esperar imagen o metadatos: el mock **no define `tokenURI`** (sin `_baseURI`), así que MetaMask
  puede mostrar el NFT sin imagen ni descripción (`05-nfts-trueques.md:64-70`).
- Suponer qué token IDs existen ahora en el anvil remoto: depende de los mints hechos por
  pruebas/flujos → **pendiente de confirmar** (consultar con `balanceOf`/`ownerOf`).

**Consejo de seguridad**
- El `mint` del mock **no tiene control de acceso**: cualquiera puede acuñar un NFT de prueba a
  cualquier cuenta. Poseer un NFT de este contrato no prueba nada fuera del entorno de desarrollo
  (`05-nfts-trueques.md:36-40`).

### Ficha 5.2 · Verificar la propiedad de un NFT de trueque

**¿Qué es?**
- En ERC-721, `ownerOf(tokenId)` devuelve la dirección dueña de ese token y
  `balanceOf(dirección)` el número de NFTs que posee. Es la forma canónica de verificar propiedad.

**¿Para qué sirve?**
- Confirmar con datos reales a quién pertenece el NFT de un trueque (p. ej. qué cuenta de prueba
  posee el token ID `1` de TrueKeateNFT en la red `31337`).

**Pasos clave**
1. Red `31337` seleccionada.
2. En MetaMask: pestaña **"NFTs"** → **"Importar NFTs"** → dirección
   `0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f` + token ID (entero). MetaMask valida que el
   contrato es ERC-721 y que la cuenta activa posee ese token.
3. Verificación independiente: consultar `ownerOf(tokenId)` y `balanceOf(dirección)` sobre el
   contrato.

**Errores comunes**
- Importar el NFT en otra red → no aparece.
- No conocer el token ID: los IDs existentes dependen de los mints realizados en cada entorno
  (**pendiente de confirmar** cuáles hay ahora en el anvil remoto).
- Fiarse de una captura o de un tercero en vez de leer `ownerOf` del contrato.

**Consejo de seguridad**
- La fuente de verdad es la **blockchain** (`ownerOf`), no la interfaz: si una cuenta no es la
  dueña devuelta por el contrato, no es dueña, muestre lo que muestre la wallet.

---

## 6. Interacción y firma

### Ficha 6.1 · Login con firma EIP-191 ("TrueKeate: iniciar sesión")

**¿Qué es?**
- Para iniciar sesión, la plataforma pide firmar el **mensaje personal EIP-191 exacto**
  `TrueKeate: iniciar sesión` (`web/lib/sesion.tsx:105`). El backend recupera la wallet firmante
  con `ethers.verifyMessage` (`backend/api/lib/auth.js:10-15`) y emite un **token de sesión opaco**
  que viaja como `Authorization: Bearer <token>` en el resto de llamadas autenticadas
  (`backend/api/routes/auth.js:81-95`; `web/lib/api.ts:93-106`).

**¿Para qué sirve?**
- Probar que controlas la cuenta **sin enviar tu clave privada**, y dar acceso a las secciones de
  la suite según el tipo/estado del usuario (login único: una sola firma para todo).

**Pasos clave**
1. Pulsar **"Conectar MetaMask e iniciar sesión"**.
2. Aprobar el permiso de cuentas en MetaMask (sin firma).
3. Si la wallet está inscrita, MetaMask muestra el diálogo de firma con el texto
   *"TrueKeate: iniciar sesión"* (prefijado con el encabezado EIP-191 `\x19Ethereum Signed Message:\n…`,
   invisible para el usuario).
4. **Firmar**: es una firma de mensaje, **sin gas ni saldo de ETH requerido**.
5. El backend valida la firma y emite el token de sesión que la app guarda en `localStorage`.

**Errores comunes**
- **Rechazar la firma** → no se emite token y no hay sesión (la app registra el fallo y deja el
  estado sin sesión, `web/lib/sesion.tsx:110-115`).
- **Cambiar de cuenta** → el token de la cuenta anterior se descarta (está asociado a la wallet que
  lo firmó) y hay que volver a firmar (`06-interactuar-wallet.md:71-78`).
- Firmar un mensaje distinto al esperado: verifica siempre el texto exacto.

**Consejo de seguridad**
- Una firma es **vinculante**: solo firma mensajes cuyo texto entiendas (aquí, siempre
  `TrueKeate: iniciar sesión`) y comprueba la URL de la web (dominio
  `truekeate-web-593453426217.europe-west1.run.app`) para evitar sitios suplantadores.

### Ficha 6.2 · Intents EIP-712 y el relayer (firma sin gas)

**¿Qué es?**
- Los trueques se ejecutan on-chain con **meta-transacciones EIP-712** (RF-09.1/09.2): el usuario
  firma su **intención** y el **relayer paga el gas** (cuenta 1 del anvil, RF-15.2). El contrato
  **SmartAccount** valida la firma EIP-712 del owner con **nonce por cuenta** (anti-replay): tipo
  `Execute(address to,uint256 value,bytes data,uint256 nonce)`, dominio **"TrueKeate SmartAccount"
  versión "1"** (`sc/src/SmartAccount.sol:40,82`).
- El relayer (`backend/relayer.js:134-181`) recibe el intent `{ signer, destino, valor, data,
  nonce, firma, chainId }`, aplica protecciones (chainId correcto, bloqueo por 3 fallos en 10 min,
  límite diario de **20 meta-tx** por usuario D29, nonce + allowlist D28) y envía `execute(...)`
  pagando el gas.

**¿Para qué sirve?**
- Operar el escrow de un trueque **sin que el usuario pague gas**: el usuario solo firma datos
  tipados. Flujo demostrado por la prueba E2E `backend/test/integracion-relayer.js:30-45,63-90`
  (la cuenta 0 firma el intent; el relayer de la cuenta 1 envía la tx).

**Pasos clave (nivel on-chain probado)**
1. El usuario firma el intent EIP-712 (dominio "TrueKeate SmartAccount", versión "1", nonce
   correcto).
2. El intent con `chainId` correcto se envía al relayer.
3. El relayer valida protecciones y ejecuta `execute(...)` en la Smart Account pagando el gas.

**Errores comunes**
- **Asumir que la web ya pide esta firma**: hoy NO existe código de typed-data
  (`_signTypedData`) en `web/`; las acciones de trueque del frontend van a la API con el token de
  sesión y actualizan el espejo en la base de datos (`06-interactuar-wallet.md:101-116`). La UI de
  firma EIP-712 queda **pendiente de confirmar**.
- Firmar con chainId o nonce incorrectos → la Smart Account rechaza la firma (nonce anti-replay).

**Consejo de seguridad**
- Si algún día ves en MetaMask la firma de datos tipados **"TrueKeate SmartAccount"**, es una
  **firma sin gas para ti** (el relayer paga); verifica que el chainId sea `31337` y que el mensaje
  tipado describa exactamente la operación que quieres autorizar.

### Ficha 6.3 · ¿Firma o transacción? Resumen de lo que pide MetaMask

**¿Qué es?**
- Cuatro tipos de solicitud que puede mostrar MetaMask al operar con TrueKeate, según el flujo
  (`06-interactuar-wallet.md:141-148`):

| Solicitud en MetaMask | Qué es | ¿Firma o transacción? | ¿Gas / necesita ETH? |
|---|---|---|---|
| "Conectar con TrueKeate" (ver cuentas) | `eth_requestAccounts` | Permiso (sin firma) | No |
| "TrueKeate: iniciar sesión" | Firma **EIP-191** de sesión | Firma de mensaje | **No** (sin gas) |
| Firma de datos tipados "TrueKeate SmartAccount" | Intent **EIP-712** de trueque (diseño) | Firma de datos tipados | No para el usuario: **el relayer paga el gas**; hoy **sin UI** → pendiente de confirmar |
| Confirmar transacción (estimación de gas en ETH) | Transacción on-chain directa | Transacción | **Sí**, gas en ETH de pruebas (casos Empresas RF-09.3 o fallback D39; sin UI verificada → pendiente de confirmar) |

**¿Para qué sirve?**
- Saber en cada momento qué estás autorizando y si la operación consume ETH de prueba o no.

**Pasos clave**
1. Antes de aprobar, leer el título del diálogo de MetaMask: permiso / firma de mensaje / firma
   tipada / transacción.
2. Verificar el texto exacto que se firma (ficha 6.1) o el dominio EIP-712 (ficha 6.2).
3. Verificar la red activa (chain `31337`) antes de confirmar nada.

**Errores comunes**
- Confundir "firma de mensaje" (sin gas) con "transacción" (con gas) o al revés.
- Pensar que el login consume ETH: la firma de sesión EIP-191 **no consume gas**.
- Aprobar una transacción directa sin revisar la estimación de gas cuando aparezca (hoy la UI de
  esos casos no está verificada → **pendiente de confirmar**).

**Consejo de seguridad**
- Regla mnemotécnica: **permiso = ver, firma = autorizar sin gas (aquí el relayer paga),
  transacción = ejecutar y pagar gas**. En esta red el gas se paga con ETH simbólico de pruebas,
  pero el hábito de revisar cada diálogo se traslada a redes reales.
