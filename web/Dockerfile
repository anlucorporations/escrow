# =============================================================================
# TrueKeate — Frontend Web (Next.js 16 standalone → Cloud Run / GCP)
# Build: next build (output: standalone). Puerto: $PORT (Cloud Run → 8080).
# =============================================================================
FROM node:22-bookworm-slim AS base
WORKDIR /app

# --- dependencias (capa cacheable) ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# --- build ---
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Direcciones de contratos. Los valores por defecto son el despliegue GCP
# (anvil remoto MCC, 2026-09) y se pueden sobrescribir en el build pasando
# --build-arg con el MISMO nombre. Los nombres deben coincidir exactamente con
# las variables que lee web/lib/contracts.ts (DIRECCIONES) y con las que
# escribe deploy-local.sh.
ARG NEXT_PUBLIC_ESCROW=0x8a93d247134d91e0de6f96547cb0204e5be8e5d8
ARG NEXT_PUBLIC_FACTORY=0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849
ARG NEXT_PUBLIC_BRLT=0x6f6f570f45833e249e27022648a26f4076f48f78
ARG NEXT_PUBLIC_REGISTRY=0xb0f05d25e41fbc2b52013099ed9616f1206ae21b
ARG NEXT_PUBLIC_SUSCRIPCION=0x5feaebfb4439f3516c74939a9d04e95afe82c4ae
ARG NEXT_PUBLIC_CHAIN_ID=31337
ARG NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
ARG NEXT_PUBLIC_TRUEKE_NFT=0x6C2d83262fF84cBaDb3e416D527403135D757892
ARG NEXT_PUBLIC_TRUEKE_SBT=0x870526b7973b56163a6997bB7C886F5E4EA53638
ENV NEXT_PUBLIC_ESCROW=$NEXT_PUBLIC_ESCROW \
    NEXT_PUBLIC_FACTORY=$NEXT_PUBLIC_FACTORY \
    NEXT_PUBLIC_BRLT=$NEXT_PUBLIC_BRLT \
    NEXT_PUBLIC_REGISTRY=$NEXT_PUBLIC_REGISTRY \
    NEXT_PUBLIC_SUSCRIPCION=$NEXT_PUBLIC_SUSCRIPCION \
    NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_TRUEKE_NFT=$NEXT_PUBLIC_TRUEKE_NFT \
    NEXT_PUBLIC_TRUEKE_SBT=$NEXT_PUBLIC_TRUEKE_SBT
# URL del backend API (Cloud Run). Se puede sobrescribir en el build:
ARG NEXT_PUBLIC_API_URL=https://truekeate-api-593453426217.europe-west1.run.app
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# --- runtime standalone ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 8080
CMD ["node", "server.js"]
