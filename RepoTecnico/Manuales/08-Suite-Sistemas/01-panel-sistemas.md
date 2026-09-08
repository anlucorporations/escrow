# Manual Técnico 08 · Suite de Sistemas — 01 · Panel del Owner / Sistemas

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **08-Suite-Sistemas** — el panel
> operativo del **Owner** (RF-13.1) en producción: revisión de KYC con imágenes, KPIs, base de datos
> off-chain, contratos desplegados e infraestructura (relayer/indexador).
> Datos auditados 2026-09-08 (despliegue GCP api rev 00017 / web rev 00019 —
> `RepoTecnico/estado_proyecto.md:468-488`). Referencias `ruta:línea`. Lo no verificable se marca
> **"pendiente de confirmar"**. No se prometen funciones inexistentes.

---

## 1. Qué es el Panel del Owner

### 1.1 Propósito y alcance real

- Ruta web: **`/suite/admin`** (`web/app/suite/admin/page.tsx`) — "🛠️ Panel del Owner", dashboard
  operativo **real** (no maqueta) que consume 4 endpoints de solo lectura del backend
  (`web/app/suite/admin/page.tsx:12-21,56-61`): contratos, BD, KPIs de disputas e infraestructura,
  más la **revisión KYC** del Owner (RF-18.4).
- Accesible desde la barra superior solo para usuarios **SOCIO** (sección "Admin" en la matriz de
  navegación, `web/lib/navegacion.ts:86-92`; protección por URL en `SuiteGuard`,
  `web/components/SuiteGuard.tsx:181-193`).

### 1.2 Quién puede usarlo (guard del Owner)

| Capa | Comprobación | Código |
|---|---|---|
| Menú/URL (frontend) | `seccionesPara` incluye Admin solo si `tipo === 'SOCIO'` | `web/lib/navegacion.ts:86-92`; `SuiteGuard.tsx:181-192` |
| Aviso en la página | `esOwner = acceso.usuario.tipo === 'SOCIO'` (si no, aviso "el backend rechazará las consultas") | `web/app/suite/admin/page.tsx:48-49,111-115` |
| Endpoints `/admin/*` | `requiereSesion` + `u.tipo === 'SOCIO'` **o** `u.rol === 'OWNER'` (403 `solo_owner`) | `backend/api/routes/admin.js:13-19` |
| Endpoints `/kyc/*` Owner | `requiereSesion` + **Owner on-chain**: `SociosRegistry.owner()` == wallet (función `esOwner`; sin registry en dev → permitido) | `backend/api/routes/kyc.js:83-94` |
| Registro del Owner en BD | Script `backend/scripts/bootstrap-owner.sh` (cuenta 0): estado `CERTIFICADO` + `tipo/nivel SOCIO` + GDPR | `backend/scripts/bootstrap-owner.sh:8-16` (ver 04-Despliegue/02) |

> Nota de fidelidad: el frontend usa `tipo === 'SOCIO'` y el backend de KYC verifica el `owner()`
> on-chain del `SociosRegistry` (`backend/api/routes/kyc.js:83-94`) — dos comprobaciones
> complementarias; el registro `SOCIO` en BD lo alimenta el indexador con `SocioAdmitido`
> (`backend/indexador.js:126-135`).

---

## 2. La página `/suite/admin` (`web/app/suite/admin/page.tsx`)

### 2.1 Estructura del panel

- **Cabecera**: título + wallet corta del Owner conectado y botón "↻ Refrescar" (vuelve a llamar a
  los 4 endpoints, `admin/page.tsx:96-109`).
- Sin billetera conectada: tarjeta "Conecta la billetera del Owner" con `conectar()`
  (`admin/page.tsx:79-92`); con sesión de no-SOCIO: aviso en rojo (`admin/page.tsx:111-115`).
- Los datos se cargan con `Promise.all` de los 4 clientes y solo se pintan cuando los 4 responden
  (`activo`, `admin/page.tsx:56-61,77,118`).

### 2.2 Tarjetas de KPIs

- `TarjetaKpi` (icono + valor + etiqueta) con 4 métricas (`admin/page.tsx:26-34,121-126`):
  👥 **Usuarios inscritos** (`db.usuarios`) · 📦 **Artículos publicados** (`db.articulos`) ·
  ⇄ **Truekes (espejo)** (`kpis.totalTruekes`) · ⚖️ **Disputas abiertas** (`kpis.disputasAbiertas`).

### 2.3 Revisión de KYC con imágenes (RF-18.4)

- Bloque `<KycPendientesOwner token={token} />` (`admin/page.tsx:129`) — ver §3.

### 2.4 Base de datos off-chain

- Tarjeta "Base de datos off-chain": PostgreSQL (Cloud SQL) · espejo impulsado por eventos (RNF-01.1);
  muestra `db.usuarios` · `db.articulos` · `db.truekes` (`admin/page.tsx:132-140`).

### 2.5 Contratos desplegados

- Tarjeta "Contratos desplegados": lista las entradas de `contratos` **con dirección no nula**
  (filtra `0x0000…0000`, `admin/page.tsx:146-158`); alimentada por `GET /admin/contratos`, que
  devuelve `backend/contratos.json` (incluye `TrueKeateSBT` desde 2026-09).

### 2.6 Infraestructura (relayer / indexador)

- Tarjeta "Infraestructura (relayer / indexador)" (`admin/page.tsx:161-200`):
  - 🤖 **Relayer EIP-712**: estado `OK`/`caído` (`relayer.ok`), wallet (10 primeros caracteres) y
    aviso `Saldo bajo: SÍ (recargar)` (`relayer.saldoBajo`).
  - 👁️ **Indexador**: cabeza de bloque, procesados y fallidos (`indexador.cabeza/procesados/fallidos`).
  - Si el servicio no está inyectado en el despliegue: "No configurado en este despliegue".

---

## 3. Componente `KycPendientesOwner` (`web/components/KycPendientesOwner.tsx`)

### 3.1 Datos e imágenes

- Lista `GET /kyc/pendientes` (`KycPendientesOwner.tsx:25-34`; cliente `kycPendientes` en
  `web/lib/api.ts:511-514`) → solicitudes `kyc.estado = 'PENDIENTE'` con datos del usuario
  (`tipo · nivel · medalla`, `backend/api/lib/almacen-pg.js:200-220`).
- Las imágenes (`urlDocumento`/`urlSelfie` → `GET /kyc/imagen/:id`) **requieren Authorization**: se
  descargan con `fetch` + `Bearer` y `URL.createObjectURL` (`KycPendientesOwner.tsx:40-63`); la
  ruta de imagen solo la sirve el dueño o el Owner (`backend/api/routes/kyc.js:227-238`).

### 3.2 Aprobar / rechazar

- Botones "✅ Aprobar" / "Rechazar" → `POST /kyc/review` (`KycPendientesOwner.tsx:65-78,108-122`;
  cliente `revisarKyc` en `api.ts:516-521`). Al aprobar, el backend mintea el **SBT nativo**
  `TrueKeateSBT` y sube al usuario a `CERTIFICADO` (`kyc.js:262-277`) — ver Manual 03 · 09.

---

## 4. Endpoints del backend que alimentan el panel

### 4.1 Router `/admin` (`backend/api/routes/admin.js`)

| Método y ruta | Qué devuelve | Línea |
|---|---|---|
| `GET /admin/usuarios` | `{ total, usuarios }`; solo `SOCIO`/`OWNER` (403 `solo_owner`) | `admin.js:13-19` |
| `GET /admin/contratos` | `{ contratos }` = mapa `backend/contratos.json` | `admin.js:22-24` |
| `GET /admin/kpis-disputas` | `{ totalTruekes, disputasAbiertas }` (estados `EN_DISPUTA`/`RESOLUCION_SOCIOS` del espejo) | `admin.js:27-31` |
| `GET /admin/db` | `{ usuarios, articulos, truekes }` (conteos de BD) | `admin.js:34-41` |
| `GET /admin/infra/health` | `{ relayer?, relayerMetricas?, indexador? }` según deps inyectadas | `admin.js:44-50` |

### 4.2 Endpoints Owner del router `/kyc` (`backend/api/routes/kyc.js`)

- `GET /kyc/pendientes` (`kyc.js:241-251`), `GET /kyc/imagen/:imagenId` (`kyc.js:227-238`) y
  `POST /kyc/review` (`kyc.js:254-282`) — detalles y referencias en Manual 03 · 09 §4.6-4.7.

### 4.3 Cliente del frontend (`web/lib/api.ts`)

- `adminContratos` → `/admin/contratos` (`api.ts:142-145`); `adminDb` → `/admin/db`
  (`api.ts:147-150`); `adminKpis` → `/admin/kpis-disputas` (`api.ts:152-155`);
  `adminInfra` → `/admin/infra/health` (`api.ts:157-160`); `adminUsuarios` → `/admin/usuarios`
  (`api.ts:162-165`). Tipos `AdminDb`/`AdminKpis`/`AdminContratos`/`AdminInfra` en `api.ts:121-140`.

---

## 5. Operación guiada (Owner)

### 5.1 Prerrequisitos (una vez)

1. El Owner (cuenta 0 del anvil) registrado en BD como `CERTIFICADO` + `tipo/nivel SOCIO` vía
   `backend/scripts/bootstrap-owner.sh` (manual `04-Despliegue/02-reinicio-y-bootstrap.md`).
2. Que el Owner sea el `owner()` on-chain del `SociosRegistry` (para `/kyc/*`); la wallet del Owner
   conectada en el navegador y con sesión iniciada (una firma).

### 5.2 Revisar KYC pendientes (con imágenes)

1. Entrar en `/suite/admin` (menú 👤 → secciones → icono Admin, o URL directa).
2. En "KYC pendientes de revisión (DNI + selfie)" ver la lista de solicitudes con wallet,
   `tipo · nivel · medalla` y las **dos imágenes** (documento y selfie) cargadas desde
   `/kyc/imagen/:id` (`KycPendientesOwner.tsx:96-137`).
3. Pulsar **Aprobar** → el usuario pasa a `CERTIFICADO` y se mintea su SBT nativo (aviso en verde);
   o **Rechazar** → KYC `RECHAZADO` (422) (`KycPendientesOwner.tsx:65-78`; `kyc.js:254-282`).
4. Pulsar "↻ Refrescar" para recargar KPIs/BD/contratos/infra.

### 5.3 Leer KPIs, BD, contratos e infraestructura

- KPIs: usuarios inscritos, artículos, truekes espejo y disputas abiertas (`admin/page.tsx:121-126`).
- BD: conteos de la BD off-chain (Cloud SQL).
- Contratos: direcciones vivas (Escrow, SmartAccountFactory, SociosRegistry, BRLT,
  SuscripcionEmpresa, TrueKeateNFT, TrueKeateSBT… según `backend/contratos.json`).
- Infra: salud del relayer (estado/saldo bajo) e indexador (cabeza/procesados/fallidos)
  (`admin/page.tsx:161-200`); sin esos servicios inyectados el despliegue lo indica.

### 5.4 Verificación en producción registrada

- Prueba del flujo Owner con imágenes (2026-09-08): usuaria sin SBT sube DNI+selfie por la UI
  (PENDIENTE), el Owner aprueba desde `/suite/admin` → CERTIFICADO + mint del SBT nativo
  (`sbtDe=2`); Carlos CERTIFICADO vía auto-SBT (`sbtDe=1`). Capturas en
  `RepoTecnico/pruebas/1ra-prueba/owner-01..04*.png` (`estado_proyecto.md:477-488`).

---

## 6. Pendientes de confirmar

1. `GET /admin/contratos` no aplica control de rol (solo `requiereSesion`) — `backend/api/routes/admin.js:22-24`; solo expone direcciones públicas, pero conviene confirmar si debe restringirse a Owner.
2. Los KPIs de disputas se calculan sobre el **espejo** (`listarTruekes`), no sobre la cadena
   (`admin.js:27-31`).
3. El aviso de "rol OWNER" (`u.rol`) no existe como columna en BD (`usuarios` no tiene `rol`);
   la comprobación efectiva es `tipo = 'SOCIO'` (revisar consistencia con `esOwner` on-chain).
