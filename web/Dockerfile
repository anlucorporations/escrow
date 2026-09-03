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
# Direcciones de contratos del despliegue GCP (anvil remoto MCC, 2026-09):
ENV NEXT_PUBLIC_ESCROW=0x8a93d247134d91e0de6f96547cb0204e5be8e5d8 \
    NEXT_PUBLIC_FACTORY=0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849 \
    NEXT_PUBLIC_BRLT=0x6f6f570f45833e249e27022648a26f4076f48f78 \
    NEXT_PUBLIC_REGISTRY=0xb0f05d25e41fbc2b52013099ed9616f1206ae21b \
    NEXT_PUBLIC_SUSCRIPCION=0x5feaebfb4439f3516c74939a9d04e95afe82c4ae
RUN npm run build

# --- runtime standalone ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 8080
CMD ["node", "server.js"]
