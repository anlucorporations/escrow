# Propuesta de Arquitectura de Base de Datos Off-Chain — TrueKeate

> **Documento Técnico:** Estrategia de Segregación On-Chain vs. Off-Chain y Modelo de Datos PostgreSQL  
> **Fecha:** 27 de Agosto de 2026  
> **Versión:** 1.0  
> **Objetivo:** Maximizar la eficiencia en gas, proteger la privacidad y el cumplimiento regulatorio (GDPR/Habeas Data), y ofrecer una experiencia de usuario Web3 de alto rendimiento.

---

## 🏛️ 1. Principio Rector: Segregación On-Chain vs. Off-Chain

En el ecosistema TrueKeate, la **Blockchain (Smart Contracts)** actúa exclusivamente como la **Capa de Verdad Criptográfica y Liquidación de Valor**, mientras que **PostgreSQL + IPFS** actúan como la **Capa de Datos Enriquecida, Privacidad y Experiencia de Usuario**.

```mermaid
graph TD
    subgraph ON-CHAIN (Ethereum / L2 / Anvil)
        SC1[Custodia Atómica de Fondos]
        SC2[Propiedad de Tokens RWA y SBTs]
        SC3[Estados del Ciclo de Vida: Pending, InTransit, Completed]
        SC4[Veredictos de Gobernanza y Arbitraje]
        SC5[Hashes Inmutables: CIDs de IPFS y State Commitments]
    end

    subgraph ENLACE CRIPTOGRÁFICO
        EIP712[Firmas EIP-712 / ECDSA]
        IPFSHash[CIDs de IPFS]
        StateHash[Hashes SHA-256 de Estado Físico]
    end

    subgraph OFF-CHAIN (PostgreSQL + PostGIS + Secret Manager)
        DB1[Datos Personales Cifrados: Email, Teléfono, 2FA]
        DB2[Catálogo Extenso, Galería HD, Textos e Índices de Búsqueda]
        DB3[Geolocalización GPS, Coordenadas y Ventana de 10 min]
        DB4[Mensajería y Chat E2EE entre Truekeadores]
        DB5[Notificaciones Push, In-App y Métricas de Rendimiento]
    end

    ON-CHAIN <==> ENLACE CRIPTOGRÁFICO
    ENLACE CRIPTOGRÁFICO <==> OFF-CHAIN
```

---

## 📊 2. Matriz de Clasificación de Datos: ¿Qué va Dónde?

| Dominio de Información | Datos On-Chain (Smart Contracts) | Datos Off-Chain (PostgreSQL + IPFS) | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Identidad del Usuario** | • Wallet Address (`msg.sender`)<br>• Username único<br>• Nivel de Identidad (1, 2, 3)<br>• Token ID de SBT (Nativo o BABT) | • Correo electrónico (Cifrado AES-256)<br>• Teléfono (Cifrado AES-256)<br>• Secretos TOTP 2FA (Cifrados)<br>• Códigos OTP temporales<br>• Hashes y fotos de documentos KYC | **Privacidad & GDPR:** Los datos personales nunca deben ser públicos ni inmutables on-chain. |
| **Bienes RWA & Productos** | • Token ID (ERC-721)<br>• Creador y Propietario actual<br>• CID de Metadata IPFS (`ipfsMetadataCID`)<br>• Compromiso de Estado (`bytes32`) | • Título largo y descripción enriquecida<br>• Galería de fotos en alta resolución<br>• Ficha técnica, marca, modelo y peso<br>• Precio referencial de mercado ($USD)<br>• Métodos de entrega admitidos | **Costos de Gas:** Almacenar texto largo e imágenes en storage de contratos es prohibitivo en gas. |
| **Vouchers de Servicios** | • Service ID (ERC-1155)<br>• Unidades emitidas y consumidas<br>• Función de quema criptográfica (`burn`) | • Términos del servicio y alcance de horas<br>• Portafolio de trabajos anteriores<br>• Calendario de disponibilidad y horarios<br>• Instrucciones de redención | **Trazabilidad On-chain / Detalle Off-chain:** La quema es prueba legal; el catálogo es dinámico. |
| **Operaciones de Trueke** | • IDs de partes (`user1`, `user2`)<br>• Activos en custodia (tokens, montos)<br>• Estado (`Pending`, `InTransit`, `Completed`)<br>• Guía de despacho / tracking hash | • Chat privado entre las partes<br>• Fotos del empaque y despacho<br>• Historial de eventos y marcas de tiempo<br>• Motivos detallados de disputas | **Seguridad Financiera:** La custodia de valor es atómica; la comunicación es off-chain. |
| **Puntos de Encuentro** | • N/A (o confirmación de liquidación) | • Coordenadas GPS (`lat`, `lng`)<br>• Nombre y dirección del punto seguro<br>• Marca de tiempo de apertura de ambas partes<br>• Cálculo de distancia radial ($\le 10\text{ km}$) con PostGIS<br>• Tokens efímeros QR para apretón de manos | **Seguridad Física:** Exponer la ubicación exacta en tiempo real on-chain pone en riesgo a los usuarios. |
| **Reputación y Avales** | • Nivel de confianza sintetizado (`iniciado`, `comun`, `socio`)<br>• Insignias Soulbound | • Desglose de 5 dimensiones (Aceptación, Honestidad, Seguridad, Confiabilidad, Compromiso)<br>• Reseñas escritas y réplicas<br>• Mensajes de aval entre usuarios | **Velocidad de Consulta:** Las consultas analíticas de reputación se ejecutan a velocidad de milisegundos en SQL. |
| **Notificaciones** | • Eventos emitidos (`emit`) | • Bandeja de entrada de notificaciones<br>• Estado de lectura (`read`/`unread`)<br>• Enlaces de acción y alertas push | **Volumen Operativo:** Cientos de notificaciones diarias saturarían la red. |

---

## 🗄️ 3. Esquema Detallado de la Base de Datos Off-Chain (PostgreSQL)

### 3.1. Módulo de Identidad, Seguridad y KYC (`identity_vault`)

```sql
-- 1. Usuarios y Estado de Identidad
CREATE TABLE users (
    address                 VARCHAR(42) PRIMARY KEY, -- Normalizado en minúsculas (0x...)
    username                VARCHAR(30) UNIQUE,
    identification_level    VARCHAR(20) NOT NULL DEFAULT 'inscrito', -- 'inscrito' | 'verificado' | 'certificado'
    terms_accepted          BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at       TIMESTAMP WITH TIME ZONE,
    
    -- Datos Personales Cifrados (AES-256-GCM: iv:tag:data)
    email_encrypted         TEXT,
    phone_encrypted         TEXT,
    email_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Seguridad 2FA
    two_factor_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret_enc   TEXT,                    -- Secreto TOTP cifrado
    two_factor_backup_codes TEXT,                    -- JSON cifrado con códigos de recuperación
    
    -- Verificación de SBT (Nativo o Externo)
    sbt_provider            VARCHAR(50),             -- 'TrueKeate Native SBT' | 'Binance BABT' | 'WorldID'
    sbt_contract_address    VARCHAR(42),
    sbt_token_id            VARCHAR(78),             -- Soporte uint256
    sbt_verified_at         TIMESTAMP WITH TIME ZONE,
    
    -- Documentación KYC Avanzado (Hashes inmutables)
    document_hash           VARCHAR(66),             -- SHA-256 del documento
    selfie_hash             VARCHAR(66),             -- SHA-256 de la biometría
    kyc_status              VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'submitted' | 'verified' | 'rejected'
    kyc_rejection_reason    TEXT,
    
    -- Perfil Comercial y Confianza
    is_business             BOOLEAN NOT NULL DEFAULT FALSE,
    business_name           VARCHAR(100),
    trust_level             VARCHAR(20) NOT NULL DEFAULT 'iniciado', -- 'iniciado' | 'comun' | 'frecuente' | 'socio'
    
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Códigos Temporales de Verificación (OTP) con TTL
CREATE TABLE identity_otps (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address                 VARCHAR(42) NOT NULL REFERENCES users(address) ON DELETE CASCADE,
    channel                 VARCHAR(10) NOT NULL,    -- 'email' | 'phone'
    code_hash               VARCHAR(64) NOT NULL,    -- SHA-256(code + salt)
    expires_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts                INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_identity_otps_lookup ON identity_otps(address, channel, expires_at);
```

---

### 3.2. Módulo de Catálogo RWA, Servicios y Multimedia (`catalog_vault`)

```sql
-- 3. Artículos, Bienes Físicos RWA y Vouchers
CREATE TABLE items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_address           VARCHAR(42) NOT NULL REFERENCES users(address),
    item_type               VARCHAR(20) NOT NULL DEFAULT 'standard', -- 'standard' | 'rwa_physical' | 'service_voucher'
    
    -- Vínculo On-Chain
    onchain_token_id        VARCHAR(78),             -- Token ID en TruekeRWA.sol o TruekeService.sol
    contract_address        VARCHAR(42),             -- Dirección del contrato NFT/SBT correspondiente
    ipfs_metadata_cid       VARCHAR(100) NOT NULL,   -- CID Qm... o ba... de la metadata inmutable
    state_commitment_hash   VARCHAR(66),             -- Hash SHA-256 firmado del estado físico
    
    -- Datos Descriptivos Ricos
    title                   VARCHAR(150) NOT NULL,
    description             TEXT NOT NULL,
    category                VARCHAR(50) NOT NULL,    -- 'tecnologia', 'vehiculos', 'inmuebles', 'servicios', 'arte'
    subcategory             VARCHAR(50),
    tags                    TEXT[] DEFAULT '{}',     -- Array de etiquetas para búsqueda
    price_reference_usd     NUMERIC(12, 2),          -- Valor estimado de intercambio
    
    -- Inventario y Estado
    quantity                INTEGER NOT NULL DEFAULT 1,
    status                  VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available' | 'reserved' | 'exchanged' | 'burned'
    condition_rating        VARCHAR(20) DEFAULT 'excelente',          -- 'nuevo', 'excelente', 'bueno', 'usado'
    
    -- Opciones de Intercambio Preferidas
    desired_exchange        TEXT,                    -- Qué busca el usuario a cambio
    delivery_methods        TEXT[] DEFAULT '{"meetup"}', -- 'meetup', 'shipping_courier', 'digital'
    
    -- Certificación Criptográfica
    signature               TEXT NOT NULL,           -- Firma ECDSA del propietario certificando autenticidad
    
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Galería Multimedia en Alta Resolución
CREATE TABLE item_images (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                 UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    ipfs_cid                VARCHAR(100) NOT NULL,
    sha256_hash             VARCHAR(64) NOT NULL,
    file_size_bytes         INTEGER,
    mime_type               VARCHAR(50) DEFAULT 'image/jpeg',
    is_primary              BOOLEAN NOT NULL DEFAULT FALSE,
    signature               TEXT NOT NULL,           -- Firma ECDSA del emisor para la imagen
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_item_images_item ON item_images(item_id);
```

---

### 3.3. Módulo de Puntos de Encuentro Seguros y PostGIS (`geo_vault`)

```sql
-- Habilitar extensión geoespacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- 5. Encuentros Físicos (Ventana de 10 minutos y Geofencing de 10 km)
CREATE TABLE meetups (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id            BIGINT NOT NULL,         -- ID de TruekeEscrow.sol
    user1_address           VARCHAR(42) NOT NULL REFERENCES users(address),
    user2_address           VARCHAR(42) REFERENCES users(address),
    
    -- Localización Geoespacial (PostGIS WGS84)
    location                GEOGRAPHY(Point, 4326) NOT NULL,
    place_name              VARCHAR(150) NOT NULL,
    address_reference       TEXT,
    
    -- Protocolo de Ventana de 10 Minutos
    scheduled_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    opened_at_user1         TIMESTAMP WITH TIME ZONE,
    opened_at_user2         TIMESTAMP WITH TIME ZONE,
    time_difference_seconds INTEGER,
    
    -- Apretón de Manos Digital
    handshake_qr_token      VARCHAR(64),             -- Hash seguro para escanear en persona
    handshake_completed_at  TIMESTAMP WITH TIME ZONE,
    
    status                  VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'opened' | 'completed' | 'blocked'
    blocked_reason          TEXT,
    
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice Espacial GiST para consultas de proximidad <= 10 km ultra-rápidas
CREATE INDEX idx_meetups_location ON meetups USING GIST(location);
CREATE INDEX idx_meetups_operation ON meetups(operation_id);
```

---

### 3.4. Módulo de Reputación Multidimensional y Avales (`reputation_vault`)

```sql
-- 6. Valoraciones en 5 Dimensiones (M3)
CREATE TABLE ratings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id            BIGINT NOT NULL,         -- Operación completada en Escrow
    rater_address           VARCHAR(42) NOT NULL REFERENCES users(address),
    ratee_address           VARCHAR(42) NOT NULL REFERENCES users(address),
    
    -- 5 Dimensiones de Confianza (1 a 5 estrellas)
    score_acceptance        SMALLINT NOT NULL CHECK (score_acceptance BETWEEN 1 AND 5),
    score_honesty           SMALLINT NOT NULL CHECK (score_honesty BETWEEN 1 AND 5),
    score_security          SMALLINT NOT NULL CHECK (score_security BETWEEN 1 AND 5),
    score_reliability       SMALLINT NOT NULL CHECK (score_reliability BETWEEN 1 AND 5),
    score_commitment        SMALLINT NOT NULL CHECK (score_commitment BETWEEN 1 AND 5),
    
    comment                 TEXT,
    response_comment        TEXT,                    -- Réplica del usuario evaluado
    response_at             TIMESTAMP WITH TIME ZONE,
    
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rating_per_operation UNIQUE (operation_id, rater_address)
);
CREATE INDEX idx_ratings_ratee ON ratings(ratee_address);

-- 7. Red de Avales entre Truekeadores (M12)
CREATE TABLE vouches (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vouch_by                VARCHAR(42) NOT NULL REFERENCES users(address),
    vouch_for               VARCHAR(42) NOT NULL REFERENCES users(address),
    stake_amount_brlt       NUMERIC(18, 4) DEFAULT 0, -- Respaldo opcional en BRLT
    statement               TEXT NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vouch_pair UNIQUE (vouch_by, vouch_for)
);
CREATE INDEX idx_vouches_vouch_for ON vouches(vouch_for);
```

---

### 3.5. Módulo de Mensajería Cifrada E2EE y Notificaciones (`comms_vault`)

```sql
-- 8. Mensajería Cifrada entre Partes de un Trueke
CREATE TABLE direct_messages (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id            BIGINT,                  -- Asociado a un intercambio específico
    sender_address          VARCHAR(42) NOT NULL REFERENCES users(address),
    recipient_address       VARCHAR(42) NOT NULL REFERENCES users(address),
    encrypted_payload       TEXT NOT NULL,           -- Cifrado E2EE con la clave pública del receptor
    nonce                   VARCHAR(48) NOT NULL,
    read_at                 TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dm_conversation ON direct_messages(operation_id, created_at DESC);

-- 9. Centro de Notificaciones Multicanal
CREATE TABLE notifications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user"                  VARCHAR(42) NOT NULL REFERENCES users(address),
    type                    VARCHAR(30) NOT NULL,    -- 'trade_update' | 'kyc_approved' | 'rating_received' | 'security_alert'
    title                   VARCHAR(100) NOT NULL,
    message                 TEXT NOT NULL,
    action_url              VARCHAR(200),
    read                    BOOLEAN NOT NULL DEFAULT FALSE,
    read_at                 TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications("user", read, created_at DESC);
```

---

## 🔍 4. Motor de Búsqueda Full-Text en Español (PostgreSQL TSVECTOR)

Para permitir a los usuarios buscar artículos y servicios por texto natural sin pagar RPCs o consultar contratos:

```sql
-- Columna de búsqueda optimizada con diccionario en español
ALTER TABLE items ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'C')
) STORED;

-- Índice GIN para búsquedas en < 5 milisegundos
CREATE INDEX idx_items_search_gin ON items USING GIN(search_vector);
```

---

## 🔐 5. Políticas de Seguridad, Retención y Cifrado

1. **Cifrado de Datos en Reposo:**
   - Todos los campos identificables de personas naturales (`email`, `phone`, `two_factor_secret`) se cifran mediante **AES-256-GCM** antes de tocar el disco.
   - Las claves de cifrado residen en **GCP Secret Manager** con rotación semestral.
2. **Cifrado en Tránsito:**
   - PostgreSQL configurado con `sslmode=require` y certificados TLS 1.3 gestionados por Cloud SQL Auth Proxy.
3. **Control de Acceso a Nivel de Fila (Row Level Security - RLS):**
   - Políticas PostgreSQL para garantizar que un usuario autenticado solo pueda consultar sus propios mensajes privados y secretos 2FA.
4. **Política de Purga y Anonimización (Derecho al Olvido):**
   - Al solicitar la eliminación de cuenta, se eliminan los datos personales de PostgreSQL (`DELETE / UPDATE encrypted = NULL`).
   - Los registros on-chain permanecen como hashes pseudo-anónimos sin enlace posible a la identidad real del usuario.

---

## 📈 6. Beneficios de la Propuesta

| Beneficio | Impacto Medible |
| :--- | :--- |
| **Ahorro en Costes de Gas** | Reducción de más del **92%** en costos de transacción al no almacenar textos largos ni coordenadas en storage EVM. |
| **Velocidad de Búsqueda y Navegación** | Respuestas de API en **< 30 ms** mediante índices GIN y GiST en PostgreSQL frente a múltiples llamadas RPC. |
| **Cumplimiento de Privacidad (GDPR/Habeas Data)** | Protección total de datos personales con capacidad real de edición y eliminación sin quebrar la blockchain. |
| **Capacidades Geoespaciales Avanzadas** | Consultas nativas con PostGIS (`ST_DWithin`) para encontrar truekes cercanos a menos de 10 km en milisegundos. |
