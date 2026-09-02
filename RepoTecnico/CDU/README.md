# TrueKeate — Diagramas de Casos de Uso (CDU)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Carpeta | `RepoTecnico/CDU/` |
| Fuente | `RepoTecnico/casos_uso.md` (v2 — 31 CU con criterios Gherkin/EARS) |
| Generado | Fase 2 — modelado de casos de uso en gráficos |

## Contenido — Imágenes PNG

| Archivo | Formato | Descripción |
|---|---|---|
| `casos_uso_general.png` | PNG (PlantUML) | Diagrama general: actores y 22 casos de uso con reglas clave |
| `escrow_estados.png` | PNG (PlantUML) | Máquina de estados del escrow (CREADO→…→COMPLETADO/ANULADO/BLOQUEADO) |
| `actores.png` | PNG (Mermaid) | Actores y su jerarquía |
| `modulo_identidad.png` | PNG (Mermaid) | CU-01…CU-05 — escalera Inscrito→Verificado→Certificado, Socio, Empresa, recuperación |
| `modulo_catalogo.png` | PNG (Mermaid) | CU-06…CU-08 — publicaciones AtoA, encargo, catálogo |
| `modulo_campanas.png` | PNG (Mermaid) | CU-09…CU-10 — campañas de venta masiva y recolecta |
| `modulo_intercambios.png` | PNG (Mermaid) | CU-11…CU-17 — trueque, escrow, apertura dual, valoración, bloqueo |
| `modulo_disputas.png` | PNG (Mermaid) | CU-18…CU-19 — anulación (quórum 2/3, 5 días) y disputa (timelock 6h) |
| `modulo_reputacion.png` | PNG (Mermaid) | CU-20…CU-22 — nivel/medalla (fórmula D12), inactividad, establecimientos |
| `modulo_gas.png` | PNG (Mermaid) | CU-23…CU-24 — meta-tx EIP-712 y suscripción empresa |
| `modulo_subastas.png` | PNG (Mermaid) | CU-25…CU-26 — subastas (solo Empresa/Certificado) |
| `modulo_evidencia.png` | PNG (Mermaid) | CU-27 — evidencia de imagen on-chain (merkle) |
| `modulo_administracion.png` | PNG (Mermaid) | CU-28…CU-31 — dashboard Owner, moderación, finanzas, BRLT |

## Contenido — Código fuente Mermaid (`mmd/`)

| Archivo | Descripción |
|---|---|
| `mmd/actores.mmd` | Actores (graph LR) |
| `mmd/modulo_identidad.mmd` | CU-01…CU-05 |
| `mmd/modulo_catalogo.mmd` | CU-06…CU-08 |
| `mmd/modulo_campanas.mmd` | CU-09…CU-10 |
| `mmd/modulo_intercambios.mmd` | CU-11…CU-17 |
| `mmd/modulo_disputas.mmd` | CU-18…CU-19 |
| `mmd/modulo_reputacion.mmd` | CU-20…CU-22 |
| `mmd/modulo_gas.mmd` | CU-23…CU-24 |
| `mmd/modulo_subastas.mmd` | CU-25…CU-26 |
| `mmd/modulo_evidencia.mmd` | CU-27 |
| `mmd/modulo_administracion.mmd` | CU-28…CU-31 |
| `mmd/escrow_estados.mmd` | Máquina de estados del escrow (stateDiagram-v2) |

## Cómo renderizar Mermaid a PNG

Con [mermaid-cli](https://github.com/mermaid-js/mermaid-cli):
```bash
npx @mermaid-js/mermaid-cli -i RepoTecnico/CDU/mmd/modulo_identidad.mmd -o RepoTecnico/CDU/modulo_identidad.png
```
O con el servicio Kroki (POST `https://kroki.io/mermaid/png` con body JSON `{diagram_source, diagram_type:"mermaid", output_format:"png"}`).

## Reglas clave modeladas

- Escalera de estados: **Inscrito** (ve ofertas) → **Verificado** (códigos correo+teléfono: trueques, máx 3) → **Certificado** (KYC completo: todo + subastas) — D28.
- Anulación del escrow: quórum de Socios **≥2/3**, máx **5 días**; **ANULADO por defecto** sin quórum (D26).
- Subastas: gana **mayor valor**; empate → mayor nivel (D27).
- Meta-tx: **20/día**; 3 fallos/10 min → bloqueo 1 h (D29).
- Nivel: fórmula `0,5·rep + 0,3·vol + 0,2·(1−ratioAp)`, insumos 0–100, recálculo mensual (D12, D30).
- Cancelación de trueque: solo **pre-custodia** (D31).
