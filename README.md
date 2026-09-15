# TrueKeate

**TrueKeate** — Plataforma Web3 de intercambio (trueque) de Bienes, Productos, Servicios y Criptos
representados en NFTs, con **custodia atómica** mediante contrato escrow, **reputación comunitaria**,
**meta-transacciones sin gas (EIP-712)** y una **wallet nativa** propia (extensión de Chrome).

---

## Estado del proyecto

- **Fases 1–5 completas**: Concepto, Auditoría, Desarrollo, Pruebas y Manuales (decisiones D1–D41).
- **Sub-proyecto Wallet Nativa cerrado**: la plataforma incorpora su extensión nativa, instalable
  desde la propia web, con selección de billetera, firma exclusiva con la cuenta conectada y
  **cero interferencia** con MetaMask u otras wallets.
- **Desplegado en GCP (producción piloto)** — un único proyecto (`truekeate-main`) y un único
  despliegue:
  - Web: <https://truekeate-web-593453426217.europe-west1.run.app> — rev. **00051-m5q**
    (imagen `web:release-2cd4486`).
  - API: <https://truekeate-api-593453426217.europe-west1.run.app> — rev. **00033-cnt**
    (imagen `backend:release-07dc7fb`).
  - Se retiró el despliegue duplicado de `truekeate-web` en `southamerica-east1`.
- **Pruebas**: frontend **78/78** (Vitest) · wallet/E2E **42/42** (Playwright con la extensión real)
  · extensión `background` **45/45** y `vault` **25/25** · contratos con Foundry.
- **Rama de trabajo** `escrow-dsh-GCP`, sincronizada con `main` en los tres remotos.

---

## Estructura

| Carpeta | Contenido |
|---|---|
| `web/` | Plataforma Next.js 16 + React 19 (landing, suite, login con billetera, instalación de la wallet) |
| `backend/` | API Node/Express (Cloud Run) + indexador PostgreSQL y relayer EIP-712 |
| `sc/` | Contratos inteligentes en Foundry (Escrow, Socios, SBT, NFT, subastas…) |
| `wallet-extension/` | **Wallet nativa** (extensión Chrome MV3): popup, Tokens/NFT/Actividad, modos de vista, configuración/perfil |
| `RepoTecnico/` | Documentación: requerimientos, arquitectura, casos de uso, pruebas, manuales e informes |
| `TrueKeate/` | Activos de marca (logotipos, título, imágenes, guía SBT) |
| `scripts/` | Builds/despliegue en Cloud Build, contratos GCP, utilidades |
| `docs/` | Manuales literales y material de usuario |

---

## Arranque rápido (local)

Requisitos: **Node 22+**, **Foundry** (`anvil`/`forge`) y **Chrome/Chromium**.

```bash
# Todo en uno: anvil + despliegue de contratos + web
./start.sh

# O por partes
anvil                                   # nodo local (chain 31337)
cd web && npm install && npm run dev    # plataforma en http://localhost:3000
cd backend && npm install && npm start  # API en http://127.0.0.1:4000
```

Cuentas de prueba (anvil) y roles: `deployment-info.txt` / `RepoTecnico/BaseOperaciones/cuentas_anvil.md`.

---

## Wallet nativa

**Instalarla desde la plataforma** (recomendado): abrir
<https://truekeate-web-593453426217.europe-west1.run.app/instalar-wallet> → *Descargar wallet (.zip)*
→ descomprimir → `chrome://extensions` → *Modo de desarrollador* → *Cargar descomprimida*.

**Desde el repositorio**:

```bash
cd wallet-extension
npm install
npm run build            # genera dist/ (cargable como extensión desempaquetada)
python3 scripts/package-web.py   # opcional: publica el ZIP en web/public/wallet/
```

Al conectar en la plataforma, el botón **Conectar billetera** abre un popup con las wallets
detectadas (EIP-6963); elegir **TrueKeate Wallet**. Esa elección gobierna el login (EIP-191) y
**cada firma** de la sesión.

---

## Pruebas

```bash
# Plataforma (Vitest)
cd web && npm test

# E2E de la plataforma con la wallet nativa REAL (Playwright, 42 tests)
cd wallet-extension && npm run build
cd ../web && npm run test:wallet

# Pruebas propias de la extensión
cd wallet-extension && npm test            # importes + contratos + background + bóveda

# Contratos
cd sc && forge test
```

Checklist de aceptación (51 casos) y plantilla de informe:
`RepoTecnico/pruebas/checklist_wallet_nativa.md` e `INFORME_WALLET_NATIVA.md`.

---

## Despliegue (GCP)

- **Web**: `scripts/cloudbuild.yaml` + `gcloud run deploy truekeate-web`.
- **API**: `scripts/cloudbuild-backend.yaml` + `gcloud run deploy truekeate-api`.
- **Indexador**: `scripts/cloudbuild-indexer.yaml` (Cloud Run Job).
- **Contratos**: `scripts/deploy-contracts-gcp.sh`.
- Guía completa: `RepoTecnico/Manuales/04-Despliegue/` y `entornos_globales.md`.

---

## Documentación

| Documento | Contenido |
|---|---|
| `RepoTecnico/requerimientos.md` | Requerimientos RF/RNF/RT y decisiones D1–D41 |
| `RepoTecnico/estado_proyecto.md` | Estado, hitos y pendientes |
| `RepoTecnico/arquitectura_tecnica.md` | Arquitectura y ciclos de desarrollo |
| `RepoTecnico/requerimientos_wallet_nativa.md` | Requerimientos de la wallet nativa (RF-WN-01..27) |
| `RepoTecnico/INFORME_CIERRE_WALLET_NATIVA.md` | Informe de cierre del sub-proyecto wallet |
| `RepoTecnico/pruebas/` | Checklist E2E e informes de prueba |
| `RepoTecnico/Manuales/` | Manuales técnicos; `docs/Manuales/` literales |

---

## Ramas y flujo de trabajo

- `escrow-dsh-GCP` — rama de trabajo del proyecto.
- `main` — sincronizada con `escrow-dsh-GCP` al cierre de la entrega.
- Los commits se cargan a los repositorios remotos (GitHub, GitLab.com, GitLab CodeCrypto)
  cuando el director del proyecto lo indica.

> **Aviso**: el proyecto corre sobre una cadena de pruebas (anvil 31337). No usar con fondos reales.
