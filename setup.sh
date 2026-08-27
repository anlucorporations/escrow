#!/usr/bin/env bash
#
# setup.sh — Despliegue local con roles preconfigurados (SuperUsuario, Particulares, Comerciantes, Socios)
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$ROOT/deploy-local.sh"
