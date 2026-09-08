-- =============================================================================
-- TrueKeate — Migración: certificación vía SBT + imágenes KYC (decisión 2026-09)
-- Idempotente.
-- =============================================================================
-- 1) Tipos de imagen para KYC (DNI/cédula y selfie)
DO $$ BEGIN
  ALTER TYPE tipo_imagen ADD VALUE IF NOT EXISTS 'KYC_DNI';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE tipo_imagen ADD VALUE IF NOT EXISTS 'KYC_SELFIE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Columnas de certificación SBT e imágenes en kyc
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS via_sbt BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS sbt_contrato CHAR(42);
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS sbt_token_id NUMERIC;
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS documento_img_id BIGINT;
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS selfie_img_id BIGINT;

-- 3) La firma ECDSA de imagenes_certificadas pasa a ser opcional (las imágenes
--    KYC las almacena la plataforma sin firma del usuario)
ALTER TABLE imagenes_certificadas ALTER COLUMN firma_ecdsa DROP NOT NULL;

-- 4) Columnas de imagen (contenido binario + MIME) ausentes en esquemas antiguos
ALTER TABLE imagenes_certificadas ADD COLUMN IF NOT EXISTS contenido BYTEA;
ALTER TABLE imagenes_certificadas ADD COLUMN IF NOT EXISTS mime TEXT;
