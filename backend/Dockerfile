# =============================================================================
# TrueKeate — Backend API (Cloud Run / GCP)
# Node 22: API Express + relayer EIP-712 + indexador de eventos.
# Puerto: $PORT (Cloud Run inyecta 8080).
# =============================================================================
FROM node:22-bookworm-slim AS base
WORKDIR /app

# --- dependencias (capa cacheable) ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY db ./db
COPY contratos.json ./
COPY indexador.js indexador-cli.js relayer.js ./
COPY api ./api

# Cloud Run: escucha en el puerto inyectado
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" || exit 1

CMD ["node", "api/index-gcp.js"]
