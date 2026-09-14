-- =============================================================================
-- TrueKeate — Migración: retiros BRLT→fiat con Stripe Payouts (2026-09-09)
-- =============================================================================
-- El retiro de BRLT a fiat (VALOR 4.3) se ejecuta con Stripe Payouts. Requiere:
--   · STRIPE_SECRET_KEY (secreto) — ya configurado (test/live).
--   · STRIPE_PAYOUT_DESTINATION (env) — cuenta bancaria/tarjeta externa de la
--     cuenta Stripe (p. ej. ba_xxx o card_xxx) o una cuenta conectada.
-- Sin destino configurado el retiro queda REGISTRADO (saldo descontado y
-- auditable) hasta habilitar el desembolso real.
--
-- Estados: REGISTRADO (sin destino) → PENDIENTE (payout creado) → PAGADO | FALLIDO.
-- =============================================================================

CREATE TABLE IF NOT EXISTS payouts_brlt (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet        CHAR(42) NOT NULL,
    monto_brlt    NUMERIC NOT NULL,
    monto_fiat    NUMERIC,
    fiat_moneda   TEXT NOT NULL DEFAULT 'usd',
    stripe_payout TEXT,                    -- id del payout en Stripe (po_xxx)
    destino       TEXT,                    -- ba_xxx / card_xxx / acct_xxx
    estado        TEXT NOT NULL DEFAULT 'REGISTRADO', -- REGISTRADO|PENDIENTE|PAGADO|FALLIDO
    detalle       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmado_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_payouts_brlt_wallet ON payouts_brlt (wallet, estado);
CREATE INDEX IF NOT EXISTS ix_payouts_brlt_stripe ON payouts_brlt (stripe_payout);
