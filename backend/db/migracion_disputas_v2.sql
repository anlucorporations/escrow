-- =============================================================================
-- TrueKeate — Migración: flujo de disputas afinado (director, 2026-09-08)
-- =============================================================================
-- Decide el director:
--   1. La disputa nace SOLO desde el cierre ✗ No Conforme: formulario con motivo
--      + fotos de evidencia del reclamante.
--   2. Si la contraparte está CONFORME → ESPERA_JUSTIFICATIVO: se le solicita
--      cargar justificativo con imágenes de evidencia (plazo 3 días).
--   3. Con las evidencias de ambas partes (o ambas No Conformes) → EN_VOTACION
--      y se notifica a TODOS los socios (padrón on-chain SociosRegistry).
--   4. Vota cada socio del padrón salvo los involucrados (partes A/B del trueke).
--   5. Veredicto por mayoría simple de votantes: ANULAR (devolución total de los
--      NFTs en custodia → trueke ANULADO) o VALIDO (trueke COMPLETADO, liberación
--      en cruz). Sin votos en 5 días → se ANULA por defecto.
--   6. Se notifica a los involucrados del resultado.
--
-- Estados de disputa: REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA
-- (los legados 'ABIERTA' se migran a REPORTADA).
-- =============================================================================

-- 1) Columnas nuevas en disputas ---------------------------------------------
ALTER TABLE disputas ADD COLUMN IF NOT EXISTS justificativo_vence_at TIMESTAMPTZ; -- plazo 3 días (conforme)
ALTER TABLE disputas ADD COLUMN IF NOT EXISTS votacion_vence_at TIMESTAMPTZ;       -- plazo 5 días (socios)
ALTER TABLE disputas ADD COLUMN IF NOT EXISTS veredicto TEXT;                      -- 'ANULAR' | 'VALIDO'
ALTER TABLE disputas ADD COLUMN IF NOT EXISTS resuelta_en TIMESTAMPTZ;             -- cuando se resolvió

-- Estados legados → nuevo modelo
UPDATE disputas SET estado = 'REPORTADA' WHERE estado IN ('ABIERTA', 'REPORTADA');

-- 2) Evidencias (fotos) de cada parte ----------------------------------------
CREATE TABLE IF NOT EXISTS evidencias_disputa (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    disputa_id BIGINT NOT NULL REFERENCES disputas(id) ON DELETE CASCADE,
    autor      CHAR(42) NOT NULL,          -- wallet de la parte que sube la foto
    tipo       TEXT NOT NULL CHECK (tipo IN ('RECLAMO','JUSTIFICATIVO')),
    contenido  BYTEA NOT NULL,             -- binario de la imagen
    mime       TEXT NOT NULL DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evidencias_disputa ON evidencias_disputa (disputa_id, tipo);

-- 3) Votos de los socios (1 voto por socio y disputa) -------------------------
CREATE TABLE IF NOT EXISTS votos_disputa (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    disputa_id BIGINT NOT NULL REFERENCES disputas(id) ON DELETE CASCADE,
    socio      CHAR(42) NOT NULL,
    voto       TEXT NOT NULL CHECK (voto IN ('ANULAR','VALIDO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (disputa_id, socio)
);
CREATE INDEX IF NOT EXISTS ix_votos_disputa ON votos_disputa (disputa_id);

-- 4) Notificaciones in-app (campana) -----------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet     CHAR(42) NOT NULL,          -- destinatario
    tipo       TEXT NOT NULL,              -- 'DISPUTA_REPORTADA'|'PEDIDO_JUSTIFICATIVO'|'VOTACION_ABIERTA'|'VEREDICTO'|'SISTEMA'
    titulo     TEXT NOT NULL,
    cuerpo     TEXT,
    ref_tipo   TEXT,                       -- 'disputa' | 'trueke'
    ref_id     BIGINT,
    leida      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notificaciones_wallet ON notificaciones (wallet, leida, created_at DESC);
