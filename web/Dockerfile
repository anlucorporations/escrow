# ============================================================================
# TrueKeate — Dockerfile para Google Cloud Run (Next.js standalone)
# ============================================================================
# Build multi-etapa. Las direcciones NEXT_PUBLIC_* se inlinean en el bundle del
# cliente durante `next build`, por eso se reciben como ARG (las entrega
# deploy-gcp.sh tras desplegar los contratos en el nodo Foundry remoto).
#
# Los secretos (DATABASE_URL, RPC_URL, KYC_SECRET, RELAYER_PRIVATE_KEY) NO se
# hornean en la imagen: Cloud Run los inyecta en runtime vía Secret Manager
# (--set-secrets). La imagen es segura por sí misma.
# ============================================================================

# ---------- Etapa 1: dependencias ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# NOTA: no usar --omit=optional — lightningcss (Tailwind v4) se instala como
# optionalDependency nativa (variante musl para alpine) y sin ella el build falla.
RUN npm ci

# ---------- Etapa 2: build ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Direcciones de contratos desplegados en el nodo remoto (build-time).
ARG NEXT_PUBLIC_ESCROW_ADDRESS
ARG NEXT_PUBLIC_USER_REGISTRY_ADDRESS
ARG NEXT_PUBLIC_EXCHANGE_ADDRESS
ARG NEXT_PUBLIC_GOVERNANCE_ADDRESS
ARG NEXT_PUBLIC_SUBSCRIPTION_ADDRESS
ARG NEXT_PUBLIC_TOKEN_A_ADDRESS
ARG NEXT_PUBLIC_TOKEN_B_ADDRESS
ARG NEXT_PUBLIC_USDT_ADDRESS
ARG NEXT_PUBLIC_DELIVERY_ADDRESS
ARG NEXT_PUBLIC_BRLT_ADDRESS
ARG NEXT_PUBLIC_SBT_REGISTRY_ADDRESS
ARG NEXT_PUBLIC_TRUEKE_SBT_ADDRESS
ARG NEXT_PUBLIC_TRUEKE_RWA_ADDRESS
ARG NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS
ARG NEXT_PUBLIC_CHAIN_ID=31337
ARG NEXT_PUBLIC_RPC_URL

ENV NEXT_PUBLIC_ESCROW_ADDRESS=$NEXT_PUBLIC_ESCROW_ADDRESS \
    NEXT_PUBLIC_USER_REGISTRY_ADDRESS=$NEXT_PUBLIC_USER_REGISTRY_ADDRESS \
    NEXT_PUBLIC_EXCHANGE_ADDRESS=$NEXT_PUBLIC_EXCHANGE_ADDRESS \
    NEXT_PUBLIC_GOVERNANCE_ADDRESS=$NEXT_PUBLIC_GOVERNANCE_ADDRESS \
    NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=$NEXT_PUBLIC_SUBSCRIPTION_ADDRESS \
    NEXT_PUBLIC_TOKEN_A_ADDRESS=$NEXT_PUBLIC_TOKEN_A_ADDRESS \
    NEXT_PUBLIC_TOKEN_B_ADDRESS=$NEXT_PUBLIC_TOKEN_B_ADDRESS \
    NEXT_PUBLIC_USDT_ADDRESS=$NEXT_PUBLIC_USDT_ADDRESS \
    NEXT_PUBLIC_DELIVERY_ADDRESS=$NEXT_PUBLIC_DELIVERY_ADDRESS \
    NEXT_PUBLIC_BRLT_ADDRESS=$NEXT_PUBLIC_BRLT_ADDRESS \
    NEXT_PUBLIC_SBT_REGISTRY_ADDRESS=$NEXT_PUBLIC_SBT_REGISTRY_ADDRESS \
    NEXT_PUBLIC_TRUEKE_SBT_ADDRESS=$NEXT_PUBLIC_TRUEKE_SBT_ADDRESS \
    NEXT_PUBLIC_TRUEKE_RWA_ADDRESS=$NEXT_PUBLIC_TRUEKE_RWA_ADDRESS \
    NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS=$NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS \
    NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL

RUN npm run build

# ---------- Etapa 3: runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8080

# Solo la app, sus dependencias traceadas (incluye pg vía outputFileTracingIncludes)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER node
EXPOSE 8080
CMD ["node", "server.js"]
