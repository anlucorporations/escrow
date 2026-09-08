# TrueKeate — Certificación con SBT (decisión del director, 2026-09)

## Contexto

La **suite de Certificación** (`/suite/certificacion`, etapa 2 de la escalera D28)
solo ofrecía el flujo documento+selfie → PENDIENTE → revisión del Owner. El director
pidió incorporar **Soulbound Tokens (SBT)** como credencial de certificación:

1. Verificar si la wallet conectada posee un SBT para certificar.
2. Si existe un SBT → certificar **automáticamente**.
3. Si no tiene → solicitar subida de imágenes (cédula/DNI + selfie).
4. Usar un SBT que posea la wallet **o crear uno nativo del proyecto**.

## Decisiones acordadas (respuestas del director)

| Tema | Decisión |
|---|---|
| Fuente del SBT | **Crear SBT nativo TrueKeateSBT** (ERC-721 soulbound, ERC-5192) |
| Chequeo | **On-chain real** en el backend contra el nativo + allowlist configurable (`SBT_ALLOWLIST`) |
| Auto-certificación | **Sí, automática** (sin PENDIENTE) al detectar SBT; se registra evidencia (contrato/tokenId) en `kyc` |
| Sin SBT | **Subida real de imágenes** (DNI/cédula + selfie, base64, JPEG/PNG/WebP ≤4 MB) → PENDIENTE → Owner |

## Diseño

### Contrato `sc/src/TrueKeateSBT.sol`
- `mint(address,string uri)` solo `minter` (plataforma/relayer); **1 SBT por wallet** (`sbtDe`).
- No transferible ni aprobable (bloqueado en `_update`); `locked()` true (ERC-5192).
- `TrueKeateSBT.t.sol`: 6 tests Foundry ✅.

### Backend
- `backend/api/lib/sbt.js`: `detectarSbt` (nativo + allowlist) y `mintSbtNativo` (minter = relayer).
- `/kyc/sbt` (GET): info SBT de la wallet. `/kyc/auto-certificar` (POST): CERTIFICADO
  automático + mint del SBT nativo si la wallet no lo tenía (fuente externa).
- `/kyc/submit` (POST): imágenes `{ documento: {data,mime}, selfie: {data,mime} }` →
  `imagenes_certificadas` (`KYC_DNI`/`KYC_SELFIE`) → PENDIENTE.
- `/kyc/pendientes` (GET, Owner) y `/kyc/review` (POST, Owner): revisión con vista de
  imágenes; al aprobar mintea el SBT nativo. Guard Owner = dueño on-chain del SociosRegistry.
- Migración `backend/db/migracion_sbt.sql`: columnas `via_sbt/sbt_contrato/sbt_token_id/
  documento_img_id/selfie_img_id` en `kyc`, valores `KYC_DNI/KYC_SELFIE` en `tipo_imagen`,
  `firma_ecdsa` opcional.

### Web
- `/suite/certificacion`: al entrar comprueba `/kyc/sbt`; si hay SBT muestra tarjeta verde
  con botón "Certificarme automáticamente con mi SBT"; si no, formulario con preview de
  DNI+selfie y "Enviar KYC (DNI + selfie)".
- Panel del Owner (`/suite/admin`): componente `KycPendientesOwner` (lista, vistas de imagen
  con autorización y botones Aprobar/Rechazar).

## Pendientes de despliegue (requieren orden del director)

1. Aplicar `backend/db/migracion_sbt.sql` en Cloud SQL.
2. Desplegar `TrueKeateSBT` en el anvil GCP (owner cuenta 0; minter cuenta 1/relayer),
   registrar en `backend/contratos.json` y crear secreto `SBT_ADDRESS` (opcional).
3. Rebuild + deploy API y web (Cloud Run) y push a los repositorios.
