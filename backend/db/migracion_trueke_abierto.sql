-- =============================================================================
-- TrueKeate — Migración: modelo de trueque abierto-publicado (lógica maestra)
-- Aplica sobre BDs existentes (el schema.sql completo es para BDs nuevas).
-- Idempotente: se puede ejecutar varias veces sin error.
--
-- Cambios:
--   1) enum estado_escrow: + PROPUESTO (oferta abierta en el Mercado, off-chain).
--   2) enum categoria_item: ARTICULO|SERVICIO|BIEN|CRIPTO (tipos de trueke, punto 4).
--   3) articulos.categoria (+ nft_token_id ya existía).
--   4) truekes: usuario_b nullable; estado default PROPUESTO; descripcion_requerida,
--      tipo_requerido, cierre_a, cierre_b.
--   5) tabla puntos_favoritos (punto 7: últimos puntos usados como favoritos).
--
-- Uso:  psql "$DATABASE_URL" -f backend/db/migracion_trueke_abierto.sql
-- =============================================================================

-- 1) estado PROPUESTO en el enum estado_escrow (PG ≥ 9.1; IF NOT EXISTS PG ≥ 12? se
--    protege con el bloque DO para compatibilidad amplia)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'estado_escrow' AND e.enumlabel = 'PROPUESTO'
    ) THEN
        ALTER TYPE estado_escrow ADD VALUE 'PROPUESTO';
    END IF;
END $$;

-- 2) enum categoria_item
DO $$ BEGIN
    CREATE TYPE categoria_item AS ENUM ('ARTICULO','SERVICIO','BIEN','CRIPTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) articulos.categoria
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS categoria categoria_item NOT NULL DEFAULT 'ARTICULO';
-- 3b) articulos.usado_el — ítem consumido (NFT quemado, lógica post-trueke punto 2)
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS usado_el TIMESTAMPTZ;

-- 4) truekes: usuario_b nullable (oferta sin contraparte) y nuevas columnas
ALTER TABLE truekes ALTER COLUMN usuario_b DROP NOT NULL;
ALTER TABLE truekes ADD COLUMN IF NOT EXISTS descripcion_requerida TEXT;
ALTER TABLE truekes ADD COLUMN IF NOT EXISTS tipo_requerido categoria_item;
ALTER TABLE truekes ADD COLUMN IF NOT EXISTS cierre_a TEXT;
ALTER TABLE truekes ADD COLUMN IF NOT EXISTS cierre_b TEXT;

-- 5) tabla puntos_favoritos
CREATE TABLE IF NOT EXISTS puntos_favoritos (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id         BIGINT NOT NULL REFERENCES usuarios(id),
    punto_encuentro_id BIGINT NOT NULL REFERENCES puntos_encuentro(id),
    ultimo_uso         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, punto_encuentro_id)
);

-- índices útiles para el Mercado (PROPUESTO) y Mis Truekes
CREATE INDEX IF NOT EXISTS idx_truekes_propuestos ON truekes(estado) WHERE estado = 'PROPUESTO';
CREATE INDEX IF NOT EXISTS idx_puntos_favoritos_usuario ON puntos_favoritos(usuario_id, ultimo_uso DESC);
