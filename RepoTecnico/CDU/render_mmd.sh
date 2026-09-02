#!/usr/bin/env bash
# Renderiza todos los .mmd de RepoTecnico/CDU/mmd a PNG en RepoTecnico/CDU/ vía Kroki
set -uo pipefail
cd "$(dirname "$0")/.."  # RepoTecnico
mkdir -p CDU
FAIL=0
for f in CDU/mmd/*.mmd; do
  base="$(basename "$f" .mmd)"
  python3 -c "
import json,sys
with open('$f') as src: s=src.read()
print(json.dumps({'diagram_source':s,'diagram_type':'mermaid','output_format':'png'}))
" > /tmp/mmd_body.json
  code=$(curl -s -m 90 -X POST "https://kroki.io/mermaid/png" \
    -H "Content-Type: application/json" -d @/tmp/mmd_body.json \
    -o "CDU/${base}.png" -w "%{http_code}")
  size=$(stat -c%s "CDU/${base}.png" 2>/dev/null || echo 0)
  echo "${base}: HTTP ${code} size ${size}"
  if [ "$code" != "200" ]; then FAIL=1; fi
done
echo "---"
[ $FAIL -eq 0 ] && echo "OK: todos los PNG generados" || echo "ERROR: al menos un PNG falló"
exit $FAIL
