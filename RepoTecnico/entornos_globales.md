# TrueKeate — Entornos Globales

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Documento | `RepoTecnico/entornos_globales.md` |
| Actualizado | Fase 1 — Concepto |

---

## 1. Repositorios remotos (Decisión D8)

| Plataforma | URL | Rama de trabajo |
|---|---|---|
| GitHub | `https://github.com/anlucorporations/escrow` | **`escrow-dsh-GCP`** (ya existe, apunta a `c9dc2d5`, = `main`) |
| GitLab.com | `https://gitlab.com/anlucorporations/escrow` | **`escrow-dsh-GCP`** (ya existe) |
| GitLab Codecrypto | `https://gitlab.codecrypto.academy/anlucorporations/escrow` | Pendiente (se resuelve luego — *Decisión D11*) |

### Claves SSH disponibles (`~/.ssh/`)
| Host | Key |
|---|---|
| `github.com` | `id_ed25519_github` |
| `gitlab.com` | `id_ed25519_gitlab` |
| `gitlab.codecrypto.academy` | `id_ed25519_codecrypto_gcp` (denegada) / `id_ed25519_codecrypto` (denegada) |

> ⚠️ **Pendiente**: restaurar acceso SSH a `gitlab.codecrypto.academy` (registrar la clave pública en la cuenta del usuario `git` de ese servidor).

---

## 2. Entorno GCP (Decisiones D9 → D10)

| Campo | Valor |
|---|---|
| Cuenta activa | `anlucorporations@gmail.com` |
| Billing account | `013B00-B9A67C-014A43` |
| Proyecto del proyecto | **`truekeate-main`** ("TrueKeate") — **reutilizado** ✅ *(Decisión D10)* |
| Estado proyecto | ACTIVE, con billing vinculado y servicios habilitados |
| Proyecto `truekeate-dsh` | **Creado y eliminado** (se descartó; el billing account ya tenía 5 proyectos vinculados y se reutilizó el existente) |
| Proyectos vinculados al billing | `barloventasv2`, `daovotacionv1`, `mcc-ecommerce`, `quantum-feat-503600-q6`, `truekeate-main` |

### Servicios globales a usar
- **Foundry/anvil** (nodo de pruebas interno, chain 31337).
- **PostgreSQL** (patrón vía pgadmin existente; contraseña desde Secret Manager).
- **GCP Secret Manager** para identidad y claves/datos esenciales.
- Restringir acceso a servicios no necesarios para uso público.

### Carga de entorno global (workspace)
```bash
source /home/dsh/workspace/gcp-env.sh
# Exporta: RPC_URL, CHAIN_ID=31337, DATABASE_URL, PGADMIN_*, RELAYER_PRIVATE_KEY, ADMIN_PRIVATE_KEY, DS_*
```
Archivos de referencia: `/home/dsh/workspace/.env.global`, `/home/dsh/workspace/gcp-env.sh`, `/home/dsh/workspace/gcp-setup.sh`.

---

## 3. Entorno de pruebas (anvil)

| Rol | Cuenta | Función |
|---|---|---|
| Owner / deploys | **Cuenta 0** del anvil | EO owner, despliega contratos |
| Relayer / plataforma | **Cuenta 1** del anvil | Relayer y cuenta general para pagos de gas y otros gastos |

---

## 4. Variables de entorno clave

| Variable | Descripción | Fuente |
|---|---|---|
| `RPC_URL` | RPC del nodo Foundry/Anvil (chain 31337) | `gcp-env.sh` ← `MCC_ANVIL_RPC_URL` |
| `CHAIN_ID` | `31337` | `gcp-env.sh` |
| `DATABASE_URL` | PostgreSQL (patrón pgadmin, `mcc-postgres-*.a.run.app:443`) | `gcp-env.sh` ← Secret `POSTGRES_PASSWORD` |
| `RELAYER_PRIVATE_KEY` | Clave del relayer | Secret Manager |
| `ADMIN_PRIVATE_KEY` | Clave del admin/owner | Secret Manager |
| `DS_*` | Secretos convención nuevos proyectos (RPC, DB, KYC, relayer, Pinata) | Secret Manager |
| `GCP_PROJECT_ID` | `mcc-ecommerce` (global) → **`truekeate-main`** (proyecto) | `.env.global` / decisión D10 |

---

## 5. Comandos útiles

```bash
# Estado del repositorio / ramas
git ls-remote git@github.com:anlucorporations/escrow.git

# GCP
gcloud projects list
gcloud billing projects list --billing-account=013B00-B9A67C-014A43
gcloud config set project truekeate-main

# Carga de entorno
source /home/dsh/workspace/gcp-env.sh
```
