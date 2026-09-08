# Manual Técnico 09 — Certificación con SBT (escalera D28, etapa 2)

> **Alcance**: implementación real (2026-09) de la **certificación de identidad** de TrueKeate: contrato
> `TrueKeateSBT` (credencial soulbound), helper on-chain del backend, rutas `/kyc/*` (SBT + imágenes),
> migración de BD, página `/suite/certificacion` y revisión del Owner. Decide el director (2026-09):
> si la wallet posee un SBT de certificación (nativo o externo reconocido) la certificación es
> **automática**; si no, se suben imágenes reales (DNI/cédula + selfie) y un humano (Owner) aprueba.
> Referencias `ruta:línea`. Lo no verificable se marca **pendiente de confirmar**.
>
> Trazabilidad: D28 / CU-02 / RF-01.5 / RF-18.4 (`RepoTecnico/requerimientos.md`); decisión y
> despliegue registrados en `RepoTecnico/estado_proyecto.md:450-488`.

---

## 1. Panorama del flujo (decisión 2026-09)

### 1.1 Piezas y responsables

| Pieza | Archivo | Rol |
|---|---|---|
| Contrato `TrueKeateSBT` | `sc/src/TrueKeateSBT.sol` | Credencial no transferible; 1 SBT por wallet |
| Helper SBT | `backend/api/lib/sbt.js` | Chequeo on-chain (nativo + allowlist) y minteo por la plataforma |
| Router `/kyc` | `backend/api/routes/kyc.js` | Verificación (etapa 1), certificación (etapa 2), revisión Owner |
| Almacén (PostgreSQL) | `backend/api/lib/almacen-pg.js` | `kyc`, `imagenes_certificadas` (KYC_DNI/KYC_SELFIE) |
| Migración | `backend/db/migracion_sbt.sql` | Columnas SBT/imágenes + enum + firma opcional |
| Página de certificación | `web/app/suite/certificacion/page.tsx` | Auto por SBT o subida DNI+selfie |
| Revisión del Owner | `web/components/KycPendientesOwner.tsx` | Aprobar/rechazar con imágenes (RF-18.4) |

### 1.2 Camino de decisión (nuevo, 2026-09)

1. La wallet **posee un SBT** (nativo `TrueKeateSBT` o externo de la allowlist) → `POST /kyc/auto-certificar`
   certifica al instante y la plataforma mintea el **SBT nativo** como credencial propia.
2. La wallet **no posee SBT** → `POST /kyc/submit` guarda **DNI/cédula + selfie** (imágenes reales,
   base64) y deja el KYC en `PENDIENTE` → el **Owner** revisa con imágenes (`GET /kyc/pendientes` +
   `GET /kyc/imagen/:id`) y aprueba/rechaza (`POST /kyc/review`); al aprobar se mintea el SBT nativo.

---

## 2. Contrato `TrueKeateSBT` (sc/src/TrueKeateSBT.sol)

### 2.1 Diseño: ERC-721 soulbound con ERC-5192

- Hereda `ERC721` + `Ownable` (OZ v5) (`TrueKeateSBT.sol:23`); símbolo `TKSBT`, nombre
  `"TrueKeate SBT"` (`TrueKeateSBT.sol:43`).
- **No transferible**: `_update` revierte con `Soulbound(tokenId)` si hay dueño previo y destino no nulo
  (solo `mint`/`burn` mueven el token) (`TrueKeateSBT.sol:86-94`). `locked()` devuelve **siempre true**
  y `supportsInterface` acepta el selector ERC-5192 `0xb45a3c0e` (`TrueKeateSBT.sol:75-82`).

### 2.2 Estado y mapeo 1:1

- `minter` (dirección emisora) y `siguienteTokenId` (`TrueKeateSBT.sol:25-26`).
- `sbtDe[wallet] → tokenId` garantiza **1 SBT por wallet**; `_uris[tokenId]` guarda la URI de
  metadatos (`TrueKeateSBT.sol:28-29`).

### 2.3 Administración del `minter` (onlyOwner)

- `setMinter(address)` solo `onlyOwner`; emite `MinterActualizado` (`TrueKeateSBT.sol:48-51`). El
  owner del contrato es quien lo desplegó; el **minter** operativo es la **plataforma/relayer**
  (cuenta 1 en producción — `RepoTecnico/estado_proyecto.md:471-472`).

### 2.4 Minteo (`mint`)

- `mint(cuenta, uri)` (`TrueKeateSBT.sol:58-67`): solo `msg.sender == minter` (error `SoloMinter`),
  revierte `YaTieneSbt(cuenta)` si ya posee; incrementa `siguienteTokenId`, hace `_mint`, guarda la
  URI y el mapeo, y emite `SbtMinteado(tokenId, cuenta, uri)` + `Locked(tokenId)` (ERC-5192).

### 2.5 Lecturas on-chain

- `tokenURI(tokenId)` devuelve la URI guardada (`TrueKeateSBT.sol:69-72`); `locked(tokenId)` devuelve
  `true` (`TrueKeateSBT.sol:75-78`); ambos revierten con token inexistente.

### 2.6 Pruebas Foundry (6/6 verdes)

`sc/test/TrueKeateSBT.t.sol`: `test_MinteenSoloMinter` (:18), `test_RevertSiNoEsMinter` (:28),
`test_NoPermiteSegundoSbtParaLaMismaWallet` (:34), `test_SoulboundNoPermiteTransferir` (:42),
`test_OwnerCambiaMinter` (:63), `test_SupportsERC5192` (:69). Registro: `estado_proyecto.md:455-456`.

### 2.7 Despliegue y registro

- **No se despliega en `sc/script/Deploy.s.sol`** (verificado: el script solo crea Escrow,
  SmartAccountFactory, tokens, NFT, BRLT/Fondo/Registry/Suscripción — `Deploy.s.sol:33-60`) → el
  comando exacto de despliegue de `TrueKeateSBT` es **pendiente de confirmar**.
- En producción (2026-09-08) está desplegado en el **anvil de GCP** en
  `0x870526b7973b56163a6997bB7C886F5E4EA53638` (minter = cuenta 1) y registrado en
  `backend/contratos.json` → clave `TrueKeateSBT` (`estado_proyecto.md:471-472`).

---

## 3. Helper SBT del backend (backend/api/lib/sbt.js)

### 3.1 ABIs mínimos y allowlist (`SBT_ALLOWLIST`)

- `ABI_SBT_NATIVO` (sbtDe/mint/minter/tokenURI/SbtMinteado) y `ABI_ERC721_MIN` (balanceOf)
  (`sbt.js:11-20`).
- `leerAllowlist()` (`sbt.js:22-27`): lee la env **`SBT_ALLOWLIST`** (direcciones separadas por coma,
  minúsculas, filtradas por regex `0x…` de 40 hex). Vacía por defecto → sin SBTs externos reconocidos.

### 3.2 `detectarSbt({provider, nativoDir, wallet})` — chequeo on-chain

`backend/api/lib/sbt.js:33-58`. Devuelve `{ tieneSbt, fuente, contrato, tokenId }`:
1. **SBT nativo**: consulta `sbtDe(wallet)` en `nativoDir`; si `> 0` → `fuente: 'nativo'` con
   `contrato` y `tokenId` (`sbt.js:37-45`). Los errores de red/contrato se ignoran.
2. **SBTs externos**: recorre la allowlist y consulta `balanceOf(wallet)` (`ABI_ERC721_MIN`); si
   `> 0` → `fuente: 'externa'` con `tokenId: null` (`sbt.js:47-56`). Contrato sin respuesta se ignora.

### 3.3 `mintSbtNativo(...)` — minteo por la plataforma

`backend/api/lib/sbt.js:64-87`. Firma con `pkMinter` (wallet de la plataforma). Si falta
`nativoDir` o `pkMinter` devuelve `{ simulado: true }` (**minteo simulado**, sin tx). Si la wallet
ya tiene SBT devuelve `{ yaExistia: true, tokenId }`. En el éxito parsea el log `SbtMinteado` para
devolver `tokenId` y `txHash` del recibo (`sbt.js:76-81`).

### 3.4 `uriCertificacion(wallet, fuente, tokenId)`

`backend/api/lib/sbt.js:90-97`: genera una **data URI** JSON (`data:application/json,…`) con
`name: 'TrueKeate · Certificación de identidad (KYC)'` y `esquema: 'D28-CERTIFICADO'`.

---

## 4. API REST `/kyc` (backend/api/routes/kyc.js)

Montado en `/kyc` (`backend/api/app.js:77`). Constantes: código con TTL **10 min**
(`kyc.js:20`), MIME permitidos `image/jpeg|png|webp` y máximo ~4 MB base64 por imagen (`kyc.js:21-22`).

### 4.1 Configuración y guard del Owner on-chain

- `sbtNativoDir()`: env `SBT_ADDRESS` o `deps.contratos.TrueKeateSBT.direccion`, en minúsculas
  (`kyc.js:76-77`). `pkPlataforma()`: `RELAYER_PRIVATE_KEY` o `MINTER_PRIVATE_KEY` (`kyc.js:78`).
- `esOwner(req)`: lee `SociosRegistry.owner()` on-chain (`kyc.js:83-94`) y lo compara con `req.wallet`.
  **Sin registry configurado (dev/tests) devuelve true** (verificación desactivada, `kyc.js:85-86`).

### 4.2 Etapa 1 — verificación de correo

- `POST /kyc/init` (`kyc.js:97-114`): requiere usuario con `correo` (400 `correo_requerido`); genera
  código de 6 dígitos, lo guarda en memoria (`Map codigos`, expira 10 min) y lo envía por email con
  **Nodemailer** si `KYC_EMAIL_USER/PASS` están configurados; si no, devuelve `codigoDemo`
  (modo demo). Crea la fila KYC con `initKyc`.
- `POST /kyc/verify-codes` (`kyc.js:117-133`): valida `codigoCorreo` (422 `codigo_expirado` /
  `codigo_invalido`); sube `usuarios.estado → VERIFICADO` y `kyc.etapa → 1`.

### 4.3 Chequeo on-chain `GET /kyc/sbt`

`kyc.js:136-145`: llama `detectarSbt` y responde `{ tieneSbt, fuente, contrato, tokenId, estado }`.

### 4.4 `POST /kyc/auto-certificar` (con SBT → CERTIFICADO automático)

`kyc.js:148-190`:
1. Si ya está `CERTIFICADO` responde `{ ok, yaCertificado }` (`kyc.js:151-154`).
2. Exige `VERIFICADO` (409 `estado_no_verificado`) y que `detectarSbt` sea positivo (422 `sin_sbt`).
3. Si el SBT es **externo**, la plataforma mintea el **SBT nativo** con `mintSbtNativo`
   (`kyc.js:164-172`); si ya era nativo se conserva su `tokenId`.
4. Actualiza `usuarios.estado → CERTIFICADO` y `kyc` con `{ estado: 'APROBADO', revisadoPor: <minter>,
   viaSbt: true, sbtContrato, sbtTokenId }` (`kyc.js:181-188`); responde `{ ok, usuario, kyc, sbt }`
   con `sbt.minteoNativo` (incluye `simulado: true` si no hay minter).

### 4.5 `POST /kyc/submit` (sin SBT → imágenes DNI + selfie)

`kyc.js:193-224`: exige `{ documento: { data(base64), mime }, selfie: { … } }` (400 si faltan o MIME no
JPEG/PNG/WebP; 413 si `data` supera ~4 MB). Guarda dos imágenes con `almacen.guardarImagen`
(tipo `KYC_DNI` / `KYC_SELFIE`, `refId = kyc.id`, `wallet` de la sesión) y marca el KYC
`{ estado: 'PENDIENTE', documentoImgId, selfieImgId }` (`kyc.js:212-222`). Respuesta: aviso de
revisión humana del Owner (RF-18.4).

### 4.6 `GET /kyc/imagen/:imagenId`

`kyc.js:227-238`: sirve el binario solo al **dueño** o al **Owner** (403 `no_autorizado`); `Content-Type`
= `img.mime`, `Cache-Control: private, max-age=600`.

### 4.7 Owner: `GET /kyc/pendientes` y `POST /kyc/review`

- `GET /kyc/pendientes` (`kyc.js:241-251`): solo Owner (403 `solo_owner`); lista KYC `PENDIENTE` y
  añade `urlDocumento`/`urlSelfie` (`/kyc/imagen/<id>`).
- `POST /kyc/review` (`kyc.js:254-282`): solo Owner; body `{ wallet, aprobar }`. Al **aprobar** mintea
  el SBT nativo (`uriCertificacion(w, 'documentos', …)`), sube al usuario a `CERTIFICADO` y registra
  `kyc { estado: 'APROBADO', revisadoPor: req.wallet, sbtContrato, sbtTokenId }`; al **rechazar**
  responde 422 `kyc_rechazado` con `kyc.estado = 'RECHAZADO'`.

### 4.8 `GET /kyc/status`

`kyc.js:285-289`: `{ estado, kyc }` con el objeto KYC normalizado (incluye `viaSbt`, `sbtContrato`,
`sbtTokenId`, `documentoImgId`, `selfieImgId` — `kyc.js:27-41`).

### 4.9 Límites y modos del estado actual

- El `Map codigos` es **en memoria**: se pierde al reiniciar la API (pendiente de confirmar su
  persistencia). SMTP real requiere `KYC_EMAIL_USER/PASS` (+ `KYC_EMAIL_HOST/PORT`); sin ellos el
  código viaja en la respuesta (`codigoDemo`) — modo demo (`kyc.js:43-68`).
- El minteo del SBT nativo **se simula** si la API no tiene `RELAYER_PRIVATE_KEY`/`MINTER_PRIVATE_KEY`
  o no hay `SBT_ADDRESS`/contrato registrado (`sbt.js:64-67`).

---

## 5. Persistencia (migración y esquema)

### 5.1 Migración `backend/db/migracion_sbt.sql` (idempotente)

1. Añade los valores **`KYC_DNI`** y **`KYC_SELFIE`** al enum `tipo_imagen` (`migracion_sbt.sql:6-11`).
2. Columnas nuevas en `kyc`: `via_sbt BOOLEAN DEFAULT FALSE`, `sbt_contrato CHAR(42)`,
   `sbt_token_id NUMERIC`, `documento_img_id BIGINT`, `selfie_img_id BIGINT` (`migracion_sbt.sql:14-18`).
3. `imagenes_certificadas.firma_ecdsa` pasa a **opcional** (`DROP NOT NULL`, `migracion_sbt.sql:22`).
4. `imagenes_certificadas` gana `contenido BYTEA` y `mime TEXT` si faltaban en esquemas antiguos
   (`migracion_sbt.sql:25-26`).

### 5.2 `kyc` en el esquema canónico (`backend/db/schema.sql:92-108`)

Incluye las columnas anteriores (con comentario "decisión del director 2026-09", `schema.sql:90-91`) y
mantiene las históricas `documento_identidad`/`selfie_ref`/`selfie_hash`/`merkle_root`
(`schema.sql:95-98`). El almacén PostgreSQL (`backend/api/lib/almacen-pg.js`) implementa:
`initKyc` (:117-128), `getKyc` (:130-152, JOIN con `usuarios` y normalización a camelCase),
`actualizarKyc` (:154-185, mapa camelCase→columna) y `listarKycPendientes` (:200-220, JOIN con
`tipo`/`nivel`/`medalla` del usuario). El almacén en memoria (`backend/api/lib/almacen.js:130,141`)
implementa la misma interfaz para desarrollo.

### 5.3 `imagenes_certificadas` para KYC (`backend/db/schema.sql:207-220`)

- `tipo` enum `tipo_imagen` con `PUBLICACION`/`RECEPCION`/`KYC_DNI`/`KYC_SELFIE` (`schema.sql:50,209`).
- Para KYC, `ref_id` apunta al **`kyc.id`** (no a artículos/trueques) y `firma_ecdsa` queda NULL
  (la imagen la sube la plataforma, sin firma del usuario).
- `guardarImagen` (`almacen-pg.js:188-197`) persiste `contenido` (BYTEA) + `mime` + `hash_sha256`;
  `getImagen` (`almacen-pg.js:317-324`) los devuelve para `/kyc/imagen/:id`.

---

## 6. Frontend (Next.js)

### 6.1 Página `/suite/certificacion` (`web/app/suite/certificacion/page.tsx`)

Accesible a cualquier usuario inscrito (ruta de proceso de la escalera, `web/components/SuiteGuard.tsx:188`):
1. Al entrar consulta `GET /kyc/status` y `GET /kyc/sbt` (`page.tsx:46-61`, via `lib/api.ts`).
2. **Con SBT** muestra la fuente (nativo/externo) y el botón "Certificarme automáticamente con mi SBT"
   → `POST /kyc/auto-certificar` (`page.tsx:229-249,89-103`).
3. **Sin SBT** ofrece subir **documento (cédula/DNI)** y **selfie** con preview local (JPEG/PNG/WebP,
   ≤4 MB) y enviar → `POST /kyc/submit` (`page.tsx:250-308,67-87`).
4. Estados de salida: ya certificado con badge "Certificado automáticamente con tu SBT" (`page.tsx:140-143`),
   KYC enviado (PENDIENTE, revisión Owner) (`page.tsx:193-209`), o recordatorio de pasar por
   verificación si está `INSCRITO` (`page.tsx:158-173`).

### 6.2 Revisión del Owner — `KycPendientesOwner` (`web/components/KycPendientesOwner.tsx`)

- Lista `GET /kyc/pendientes` (`KycPendientesOwner.tsx:25-34`) y descarga las imágenes con
  `Authorization: Bearer` (`fetch` + `URL.createObjectURL`, `:41-55`) porque `/kyc/imagen/:id` exige sesión.
- Cada tarjeta muestra wallet, `tipo · nivel · medalla` del solicitante y las dos imágenes (DNI + selfie)
  (`:98-137`); botones **Aprobar**/**Rechazar** → `POST /kyc/review` (`:65-78`). Se incrusta en el
  Panel del Owner (`web/app/suite/admin/page.tsx:129`).

### 6.3 Cliente API (`web/lib/api.ts`)

- `estadoKyc` → `GET /kyc/status` (`api.ts:474-477`); `checkearSbt` → `GET /kyc/sbt`
  (`api.ts:479-482`); `autoCertificarSbt` → `POST /kyc/auto-certificar` (`api.ts:484-487`);
  `enviarKyc({documento, selfie})` → `POST /kyc/submit` (`api.ts:489-495`); `kycPendientes` →
  `GET /kyc/pendientes` (`api.ts:511-514`); `revisarKyc(token, wallet, aprobar)` → `POST /kyc/review`
  (`api.ts:516-521`). Tipos: `KycStatusResult` (incluye `viaSbt`, `sbtContrato`, `sbtTokenId`,
  `documentoImgId`, `selfieImgId`, `api.ts:432-445`), `InfoSbt` (`:447-453`) e `ImagenBase64` (`:456-459`).

---

## 7. Flujo completo (resumen)

1. Usuario inscrito entra en `/suite/certificacion` (verificación previa en `/suite/verificacion`).
2. `GET /kyc/sbt` comprueba on-chain (nativo `0x8705…3638` en producción o externo de `SBT_ALLOWLIST`).
3. ¿Tiene SBT? → `POST /kyc/auto-certificar`: usuario `CERTIFICADO`, `kyc.via_sbt = true`, mint del
   SBT nativo si venía de fuente externa.
4. ¿No tiene SBT? → sube DNI + selfie → `POST /kyc/submit`: KYC `PENDIENTE` con imágenes
   (`KYC_DNI`/`KYC_SELFIE` en `imagenes_certificadas`).
5. Owner (cuenta 0/SociosRegistry.owner()) revisa en `/suite/admin` → `POST /kyc/review` (aprueba →
   `CERTIFICADO` + mint del SBT nativo; rechaza → `RECHAZADO`).

---

## 8. Pendientes de confirmar

1. Comando/script exacto de despliegue de `TrueKeateSBT` (no está en `sc/script/Deploy.s.sol`; la
   dirección de producción sí está registrada: `backend/contratos.json` → `TrueKeateSBT`).
2. Persistencia de los códigos de verificación (hoy `Map` en memoria, `kyc.js:25`).
3. Columnas históricas `kyc.documento_identidad`/`selfie_ref` (BYTEA/texto) coexisten con el nuevo
   flujo de imágenes en `imagenes_certificadas`; su uso real queda **pendiente de confirmar**.
4. Detección "externa" valida solo `balanceOf > 0` (sin verificar tipo/emisor real del SBT externo).
