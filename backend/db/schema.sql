-- =============================================================================
-- TrueKeate — Esquema PostgreSQL (Ciclo 4, Fase 3)
-- Fuente: RepoTecnico/arquitectura_tecnica.md §4 (modelo off-chain)
-- Patrón: lectura impulsada por eventos (RNF-03.2); solo el indexador escribe en
-- tablas espejo del estado on-chain (RNF-01.1); el backend escribe tablas off-chain.
-- BD objetivo: mcc-postgres (D25/RT-02.8). Extensiones: postgis, pgcrypto.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------ ENUMs
DO $$ BEGIN
    CREATE TYPE tipo_usuario AS ENUM ('PARTICULAR','EMPRESA','SOCIO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE nivel_usuario AS ENUM ('INICIADO','COMUN','FRECUENTE','SOCIO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE medalla_usuario AS ENUM ('BRONCE','PLATA','ORO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Escalera de verificación (D28)
DO $$ BEGIN
    CREATE TYPE estado_verificacion AS ENUM ('INSCRITO','VERIFICADO','CERTIFICADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum canónico de 9 estados del escrow (diccionario de datos)
DO $$ BEGIN
    CREATE TYPE estado_escrow AS ENUM
        ('CREADO','ACTIVO','CUSTODIADO','APERTURA','EN_DISPUTA',
         'RESOLUCION_SOCIOS','COMPLETADO','ANULADO','BLOQUEADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_kyc AS ENUM ('PENDIENTE','APROBADO','RECHAZADO','APELACION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_imagen AS ENUM ('PUBLICACION','RECEPCION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_suscripcion AS ENUM ('ACTIVA','IRREGULAR','CANCELADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_campana AS ENUM ('VENTA','RECOLECTA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_subasta AS ENUM ('ABIERTA','CERRADA','ANULADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Tablas off-chain (escritas por el backend) y espejo (escritas por el indexador)
-- =============================================================================

-- Registro e identidad (CU-01/02)
CREATE TABLE IF NOT EXISTS usuarios (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet              CHAR(42) UNIQUE NOT NULL,
    correo              TEXT,               -- [PII†] cifrado en reposo (D17)
    telefono            TEXT,               -- [PII†]
    direccion_inscripcion TEXT,             -- [PII†]
    geog                GEOGRAPHY(Point,4326),
    tipo                tipo_usuario NOT NULL DEFAULT 'PARTICULAR',
    nivel               nivel_usuario NOT NULL DEFAULT 'INICIADO',
    medalla             medalla_usuario NOT NULL DEFAULT 'BRONCE',
    estado              estado_verificacion NOT NULL DEFAULT 'INSCRITO', -- D28
    smart_account       CHAR(42),
    consentimiento_gdpr BOOLEAN NOT NULL DEFAULT FALSE,   -- D17
    consentimiento_fecha TIMESTAMPTZ,
    actividad_ultima    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Metadata KYC cifrada (RF-01.7, D17)
CREATE TABLE IF NOT EXISTS kyc (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id          BIGINT NOT NULL REFERENCES usuarios(id),
    documento_identidad BYTEA,              -- [PII†] cifrado
    selfie_ref          TEXT,               -- [PII†] referencia (IPFS/cifrada)
    selfie_hash         BYTEA,
    merkle_root         BYTEA,              -- espejo del Smart Account on-chain
    estado              estado_kyc NOT NULL DEFAULT 'PENDIENTE',
    revisado_por        CHAR(42),           -- Owner (RF-18.4)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Publicaciones AtoA (CU-06)
CREATE TABLE IF NOT EXISTS articulos (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id              BIGINT NOT NULL REFERENCES usuarios(id),
    titulo                  TEXT NOT NULL,
    descripcion             TEXT,
    rubro                   TEXT NOT NULL,
    imagen_certificacion_id BIGINT,         -- FK 1—1 imagenes_certificadas (D23)
    nft_token_id            NUMERIC,
    disponible              BOOLEAN NOT NULL DEFAULT TRUE,
    alta_disponibilidad     BOOLEAN NOT NULL DEFAULT FALSE, -- D19 (computado)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Espejo del estado on-chain del escrow (solo indexador — RNF-01.1)
CREATE TABLE IF NOT EXISTS truekes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    escrow_id       NUMERIC UNIQUE NOT NULL,          -- id on-chain del escrow
    articulo_a_id   BIGINT REFERENCES articulos(id),
    articulo_b_id   BIGINT REFERENCES articulos(id),
    usuario_a       CHAR(42) NOT NULL,
    usuario_b       CHAR(42) NOT NULL,
    estado          estado_escrow NOT NULL DEFAULT 'CREADO',
    hora_pautada    TIMESTAMPTZ,
    apertura_a      TIMESTAMPTZ,
    apertura_b      TIMESTAMPTZ,
    punto_encuentro_id BIGINT,
    tx_hash         CHAR(66),
    bloque          BIGINT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Valoraciones off-chain (escala 1-5, D18/D36)
CREATE TABLE IF NOT EXISTS valoraciones (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trueke_id   BIGINT NOT NULL REFERENCES truekes(id),
    valorador   CHAR(42) NOT NULL,
    valorado    CHAR(42) NOT NULL,
    aceptacion  SMALLINT NOT NULL CHECK (aceptacion BETWEEN 1 AND 5),
    honestidad  SMALLINT NOT NULL CHECK (honestidad BETWEEN 1 AND 5),
    seguridad   SMALLINT NOT NULL CHECK (seguridad BETWEEN 1 AND 5),
    confiabilidad SMALLINT NOT NULL CHECK (confiabilidad BETWEEN 1 AND 5),
    compromiso  SMALLINT NOT NULL CHECK (compromiso BETWEEN 1 AND 5),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (trueke_id, valorador)
);

-- Puntos de encuentro (CU-16, PostGIS ≤10 km)
CREATE TABLE IF NOT EXISTS puntos_encuentro (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id),
    direccion       TEXT,                   -- [PII†]
    geog            GEOGRAPHY(Point,4326) NOT NULL,
    radio_km        NUMERIC NOT NULL DEFAULT 10,
    aprobado_socios BOOLEAN NOT NULL DEFAULT FALSE, -- establecimientos de retiro (CU-22)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disputas y apelaciones (CU-18/19)
CREATE TABLE IF NOT EXISTS disputas (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trueke_id           BIGINT NOT NULL REFERENCES truekes(id),
    solicitante         CHAR(42) NOT NULL,
    motivo              TEXT,
    estado              TEXT NOT NULL DEFAULT 'ABIERTA',
    resolucion          TEXT,
    sancion             TEXT,
    timelock_ejecuta_at TIMESTAMPTZ,        -- timelock 6h (D21, solo sanciones)
    registro_votos      JSONB,              -- espejo de votos on-chain (D21)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evidencia de imágenes certificadas (RF-11, D23)
CREATE TABLE IF NOT EXISTS imagenes_certificadas (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo                tipo_imagen NOT NULL,
    ref_id              BIGINT NOT NULL,    -- articulos.id o truekes.id según tipo
    hash_sha256         BYTEA NOT NULL,
    ipfs_cid            TEXT,
    wallet              CHAR(42) NOT NULL,
    firma_ecdsa         BYTEA NOT NULL,
    metadata            JSONB,
    root_merkle_anclada BYTEA,              -- raíz merkle anclada on-chain (D23)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suscripciones de empresa (CU-24, staking bloqueado D33)
CREATE TABLE IF NOT EXISTS suscripciones (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id   BIGINT NOT NULL REFERENCES usuarios(id),
    plan         TEXT,
    monto        NUMERIC NOT NULL,
    ciclo_inicio TIMESTAMPTZ,
    ciclo_fin    TIMESTAMPTZ,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
    tx_hash      CHAR(66),
    estado       estado_suscripcion NOT NULL DEFAULT 'ACTIVA'
);

-- Campañas (CU-09/10)
CREATE TABLE IF NOT EXISTS campanas (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo            tipo_campana NOT NULL,
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id),
    estado          TEXT NOT NULL DEFAULT 'ACTIVA',
    aprobada_socios BOOLEAN NOT NULL DEFAULT FALSE,
    articulos       JSONB,
    causa           TEXT,
    plazo_fin       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subastas de empresa (RF-17, CU-25/26)
CREATE TABLE IF NOT EXISTS subastas (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id       BIGINT NOT NULL REFERENCES usuarios(id),
    articulo_id      BIGINT REFERENCES articulos(id),
    escrow_id        NUMERIC,
    duracion         INTERVAL,
    puja_inicial     NUMERIC,
    incremento_minimo NUMERIC,
    pujas            JSONB,
    estado           estado_subasta NOT NULL DEFAULT 'ABIERTA',
    ganador_id       BIGINT REFERENCES usuarios(id),
    valor_ganador    NUMERIC,
    nivel_ganador    nivel_usuario,         -- desempate por nivel (D27)
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finanzas: saldos y fondo global (CU-30/31)
CREATE TABLE IF NOT EXISTS finanzas (
    usuario_id        BIGINT PRIMARY KEY REFERENCES usuarios(id),
    nfts_stock        JSONB,
    criptos           JSONB,
    brlt              NUMERIC NOT NULL DEFAULT 0,
    fondo_valor       NUMERIC NOT NULL DEFAULT 0,
    porcentajes_config JSONB NOT NULL DEFAULT
        '{"trueque":1,"suscripciones":10,"brlt":5}',  -- D7 (configurables Owner)
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registro auditable append-only (RF-18.6); idempotencia del indexador
CREATE TABLE IF NOT EXISTS auditoria (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entidad      TEXT NOT NULL,
    evento       TEXT NOT NULL,
    actor        CHAR(42),
    tx_hash      CHAR(66) NOT NULL,
    bloque       BIGINT NOT NULL,
    log_index    INT NOT NULL,
    payload      JSONB,
    procesado    BOOLEAN NOT NULL DEFAULT FALSE,
    procesado_at TIMESTAMPTZ,
    UNIQUE (tx_hash, log_index, entidad)     -- idempotencia (H-16, RNF-07.4)
);

-- Checkpoints del indexador (reproceso desde bloque N — RNF-07.4)
CREATE TABLE IF NOT EXISTS indexador_checkpoint (
    contrato       TEXT PRIMARY KEY,
    ultimo_bloque  BIGINT NOT NULL DEFAULT 0,
    ultimo_log_index INT NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sesiones de usuario (login con la billetera — firma EIP-191). Persistidas para
-- que el token sobreviva entre instancias de Cloud Run (RF-16, login único).
CREATE TABLE IF NOT EXISTS sesiones (
    token        TEXT PRIMARY KEY,
    wallet       CHAR(42) NOT NULL REFERENCES usuarios(wallet),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_sesiones_wallet ON sesiones(wallet);

-- =============================================================================
-- Índices y helpers
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_truekes_estado ON truekes(estado);
CREATE INDEX IF NOT EXISTS idx_truekes_usuario_a ON truekes(usuario_a);
CREATE INDEX IF NOT EXISTS idx_truekes_usuario_b ON truekes(usuario_b);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_articulos_rubro ON articulos(rubro);
CREATE INDEX IF NOT EXISTS idx_auditoria_tx ON auditoria(tx_hash, log_index);
CREATE INDEX IF NOT EXISTS idx_puntos_geog ON puntos_encuentro USING GIST(geog);
CREATE INDEX IF NOT EXISTS idx_imagenes_ref ON imagenes_certificadas(tipo, ref_id);

-- Distancia ≤ 10 km entre partes (RF-08.3/08.4, R3) — consulta PostGIS de ejemplo:
-- SELECT * FROM puntos_encuentro pe, usuarios u
--  WHERE ST_DWithin(pe.geog, u.geog, 10000);
