# 📚 Diccionario de Datos — Plataforma TrueKeat Web3

Este documento detalla la estructura completa de datos del ecosistema **TrueKeat**, organizados en dos capas arquitectónicas: **Capa On-Chain** (Contratos Inteligentes en EVM/Foundry) y **Capa Off-Chain** (PostgreSQL 18 & Almacenamiento Descentralizado IPFS).

---

## 1. Capa On-Chain (Smart Contracts)

### 1.1 Contrato: `Escrow.sol` (Custodia Bilateral Atómica)

| Estructura / Variable | Tipo Solidity | Descripción |
| :--- | :--- | :--- |
| `Operation.id` | `uint256` | Identificador secuencial único de la operación. |
| `Operation.user1` | `address` | Dirección de la billetera del creador/ofertante de la custodia. |
| `Operation.user2` | `address` | Dirección de la contraparte que acepta o completa el trueque. |
| `Operation.tokenA` | `address` | Contrato del token ofrecido en custodia por `user1`. |
| `Operation.tokenB` | `address` | Contrato del token solicitado a cambio a `user2`. |
| `Operation.amountA` | `uint256` | Cantidad en unidades mínimas (wei/base) de `tokenA`. |
| `Operation.amountB` | `uint256` | Cantidad en unidades mínimas (wei/base) de `tokenB`. |
| `Operation.status` | `enum Status` | Estado del contrato (`0: Active`, `1: Completed`, `2: Cancelled`, `3: Disputed`). |
| `Operation.deadline` | `uint256` | Timestamp UNIX límite para completar la operación ($0 = \text{sin expiración}$). |
| `Operation.createdAt` | `uint256` | Timestamp UNIX de creación del depósito. |
| `Operation.closedAt` | `uint256` | Timestamp UNIX de finalización (liquidación, cancelación o disputa). |
| `activeTradesCount` | `mapping(address => uint256)` | Contador de trueques activos concurrentes por usuario (validación de cuotas). |
| `userNonces` | `mapping(address => uint256)` | Contador anti-replay para meta-transacciones EIP-712 sin gas. |

---

### 1.2 Contrato: `UserRegistry.sol` (Identidad, Geoposicionamiento & Reputación)

| Campo | Tipo Solidity | Descripción |
| :--- | :--- | :--- |
| `UserProfile.wallet` | `address` | Billetera única asociada a la identidad. |
| `UserProfile.username` | `string` | Nombre de usuario público ($\ge 3$ y $\le 20$ caracteres alfanuméricos). |
| `UserProfile.email` | `string` | Correo electrónico de contacto único en el protocolo. |
| `UserProfile.phone` | `string` | Teléfono móvil de contacto con código de país. |
| `UserProfile.physicalAddress` | `string` | Dirección física o punto de referencia comunitario. |
| `UserProfile.utmEasting` | `int32` | Coordenada UTM Este (X) en metros. |
| `UserProfile.utmNorthing` | `int32` | Coordenada UTM Norte (Y) en metros. |
| `UserProfile.utmZone` | `uint8` | Zona del huso UTM ($1 \text{ a } 60$, ej. Zona 19 para Venezuela). |
| `UserProfile.isNorthernHemisphere`| `bool` | `true` si el hemisferio es Norte, `false` si es Sur. |
| `UserProfile.identificationLevel` | `enum IdentificationLevel` | Nivel de identidad (`0: Ninguno`, `1: Inscrito`, `2: Verificado`, `3: Certificado`). |
| `UserReputation.completedTrades` | `uint32` | Número acumulado de intercambios completados exitosamente. |
| `UserReputation.disputesLost` | `uint32` | Número de disputas perdidas en arbitraje comunitario. |

---

### 1.3 Contratos de Activos Digitales y Certificaciones

* **`TruekeSBT.sol` (ERC-5192 / ERC-721)**: Soulbound Token intransferible para miembros Nivel 3.
* **`TruekeRWA.sol` (ERC-721)**: Tokenización de bienes tangibles certificados (electrónica, vehículos, inmuebles, cosechas).
* **`TruekeService.sol` (ERC-1155)**: Vouchers fraccionables de servicios profesionales quemables al canjearse.
* **`BRLT.sol` (ERC-20)**: Token de utilidad de la comunidad de Barlovento y pago de suscripciones.
* **`Subscription.sol`**: Gestión de planes de membresía comercial mensual/anual en BRLT para empresas.
* **`Governance.sol`**: Votación de admisión de socios, sanciones comunitarias y gestión de fondos de tesorería.

---

## 2. Capa Off-Chain (Base de Datos PostgreSQL 18 & IPFS)

| Tabla | Clave Primaria | Campos Principales | Propósito |
| :--- | :--- | :--- | :--- |
| `users` | `wallet (TEXT)` | `username`, `email (AES-256)`, `phone (AES-256)`, `physical_address (AES-256)`, `level`, `rank`, `reputation_overall`, `reputation_acceptance`, `reputation_honesty`, `reputation_security`, `reputation_reliability`, `reputation_commitment` | Almacenamiento seguro y cifrado de perfiles de usuario y reputación multidimensional. |
| `items` | `id (TEXT)` | `title`, `description`, `category`, `owner (FK)`, `quantity`, `is_rwa`, `sbt_required`, `status`, `created_at` | Catálogo de productos físicos, servicios y criptoactivos en trueque. |
| `images` | `id (TEXT)` | `item_id (FK)`, `cid (IPFS)`, `url`, `is_primary` | Enlaces descentralizados IPFS a fotografías de alta resolución y evidencias RWA. |
| `meetups` | `id (TEXT)` | `operation_id (BIGINT)`, `requester (TEXT)`, `counterparty (TEXT)`, `scheduled_at`, `lat`, `lng`, `place_name`, `status`, `distance_km` | Coordinación de encuentros físicos presenciales con validación $\le 10\text{ km}$. |
| `ratings` | `id (TEXT)` | `operation_id (BIGINT)`, `rater (FK)`, `ratee (FK)`, `acceptance (1-5)`, `honesty (1-5)`, `security (1-5)`, `reliability (1-5)`, `commitment (1-5)`, `comment` | Registro de valoraciones cualitativas y cuantitativas en 5 dimensiones. |
| `vouches` | `id (TEXT)` | `voucher (FK)`, `vouchee (FK)`, `comment`, `created_at` | Avales de confianza cruzada entre usuarios y socios. |
| `company_stores` | `id (TEXT)` | `company_wallet (FK)`, `store_name`, `address`, `lat`, `lng`, `phone` | Registro de tiendas y locales comerciales físicos de empresas inscritas. |
| `company_finances` | `id (TEXT)` | `company_wallet (FK)`, `currency`, `amount`, `type`, `description`, `tx_hash` | Registro contable y conciliación de flujo de caja en BRLT/USDT. |
| `subscriptions` | `id (TEXT)` | `wallet (FK)`, `tier`, `months`, `starts_at`, `expires_at`, `is_active` | Control de suscripciones y facturación comercial off-chain. |
| `socio_applications` | `id (TEXT)` | `applicant (FK)`, `status`, `votes_for`, `votes_against`, `voting_deadline`, `deposit_amount` | Expedientes de postulación para nuevos socios en gobernanza. |
| `campaigns` | `id (TEXT)` | `title`, `description`, `target_amount`, `current_amount`, `creator (FK)`, `deadline` | Fondeo colectivo y campañas comunitarias de desarrollo regional. |
| `platform_treasury_logs`| `id (TEXT)`| `amount`, `token_symbol`, `type`, `destination`, `tx_hash` | Trazabilidad y auditoría de los gastos de gas de la tesorería comunitaria. |
| `notifications` | `id (TEXT)` | `user_wallet (TEXT)`, `title`, `message`, `type`, `read`, `created_at` | Mensajería y alertas en tiempo real (truekes, disputas, valoraciones). |
| `operations` | `id (BIGINT)` | `user1 (FK)`, `user2 (FK)`, `token_a`, `token_b`, `amount_a`, `amount_b`, `status`, `deadline` | Réplica indexada para búsquedas y filtros rápidos del historial de custodia. |
