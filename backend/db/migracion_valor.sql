-- =============================================================================
-- TrueKeate — Migración: sección VALOR (director, 2026-09-09)
-- =============================================================================
-- VALOR reemplaza a "Finanzas" con 3 subsecciones:
--   4.1 Gestión de criptos de cada socio (Recargar / Retirar / Convertir):
--       movimientos SOLO entre el usuario y la PLATAFORMA (contraparte = cuenta
--       de la plataforma). No hay transferencia P2P directa de cripto: entre
--       socios la cripto solo se mueve a través de un Trueke.
--   4.2 Reputación: puntaje D12/D30 + truekes COMPLETADOS sin valorar (con
--       valoración inline) + los últimos 10 truekes con su valoración.
--   4.3 BRLT (Recargar / Retirar / Convertir): compra con fiat vía Stripe
--       Checkout alojado (NO pasarela propia) + webhook de confirmación;
--       retiro a fiat vía Stripe Payouts (documentado). Solo Empresa/SOCIO/Owner.
--
-- Añade:
--   · movimientos_valor: auditoría append-only de cada movimiento (4.1/4.3).
--   · movimientos_brlt: detalle de pagos Stripe (sesión, estado) para 4.3.
--   · valoraciones: la tabla ya existe en schema.sql pero NO se usaba en pg;
--     el POST /truekes/:id/valoracion ahora persiste aquí (para 4.2).
-- =============================================================================

-- 1) Movimientos de VALOR (criptos y BRLT) — append-only ---------------------
CREATE TABLE IF NOT EXISTS movimientos_valor (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet     CHAR(42) NOT NULL,          -- usuario que opera
    tipo       TEXT NOT NULL,              -- RECARGA_CRIPTO|RETIRO_CRIPTO|CONVERSION|RECARGA_BRLT|RETIRO_BRLT
    moneda     TEXT NOT NULL,              -- 'ETH' | 'BRLT'
    monto      NUMERIC NOT NULL,           -- cantidad movida (signo en el detalle)
    contraparte CHAR(42) NOT NULL,         -- la PLATAFORMA (cuenta operativa)
    detalle    TEXT,                       -- descripción legible
    tx_hash    CHAR(66),                   -- si hubo tx on-chain real
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_movimientos_wallet ON movimientos_valor (wallet, created_at DESC);

-- 2) Pagos BRLT por fiat (Stripe Checkout) -----------------------------------
CREATE TABLE IF NOT EXISTS movimientos_brlt (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet         CHAR(42) NOT NULL,
    monto_brlt     NUMERIC NOT NULL,       -- BRLT acreditables al confirmar
    monto_fiat     NUMERIC,                -- monto en la moneda fiat (USD/EUR…)
    fiat_moneda    TEXT NOT NULL DEFAULT 'usd',
    stripe_session TEXT,                   -- id de la Stripe Checkout Session
    stripe_payment TEXT,                   -- PaymentIntent (cuando confirma)
    estado         TEXT NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE|PAGADO|FALLIDO
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmado_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_movimientos_brlt_wallet ON movimientos_brlt (wallet, estado);
