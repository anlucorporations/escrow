# TrueKeate — Estado del Proyecto

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Archivo | `RepoTecnico/estado_proyecto.md` |
| Fase actual | **3 — Desarrollo** (Ciclo 1 completado: Escrow base + tests verdes en anvil) |
| Última actualización | Fase 3 — Ciclo 1 terminado (18/18 tests, cobertura 94.96%, despliegue anvil OK) |

---

## Hitos completados

- [x] Extracción de requerimientos desde `escrow-TrueKeate.md` → `requerimientos.md`
  - RF: 19 módulos (RF-01 … RF-19)
  - RNF: 8 categorías (RNF-01 … RNF-08, incluida identidad visual)
  - RT: 5 grupos (stack, arquitectura, estándares, setup frontend, entornos)
  - Restricciones duras: R1–R13
- [x] Entrevista de aclaración **completa** — decisiones D1–D41
- [x] Repositorios verificados: rama `escrow-dsh-GCP` en GitHub y GitLab.com (apunta a `c9dc2d5`)
- [x] Proyecto GCP: **`truekeate-main`** reutilizado (billing vinculado, ACTIVE); `truekeate-dsh` creado y eliminado
- [x] Documentos generados en `RepoTecnico/`:
  - `requerimientos.md` (guía principal de desarrollo)
  - `diccionario_datos.md` (borrador de entidades on-chain/off-chain)
  - `entornos_globales.md` (repos, GCP, anvil, variables)
- [x] **Auditoría Fase 2 (@audita)** — `INFORME_OPTIMIZACION_V1.md`: 48 hallazgos verificados
  (5 CRITICA · 24 ALTA · 17 MEDIA · 2 BAJA); veredicto: **no apto para producción** sin cerrar
  H-01…H-05 y ronda de aclaración D12+.
- [x] **Ronda D12+ completada** (D12–D25): hallazgos críticos y altos del informe resueltos.
- [x] **Skill `asistente-proyecto` actualizada**: casos de uso bajo criterio de analista funcional
  (Gherkin/EARS + trazabilidad + testeabilidad) con auditoría de casos de uso antes de avanzar.
- [x] **Casos de uso v2**: `casos_uso.md` — 31 CU (CU-01…CU-31), 170 criterios testeables
  (72 Gherkin + 98 EARS). Backup v1: `casos_uso_v1_backup.md`. Diagramas en `CDU/` (13 PNG + 12 Mermaid).
- [x] **Auditoría de casos de uso** — `INFORME_AUDITORIA_CASOS_USO_V1.md`: dudas U-01…U-13
  resueltas con D26–D31 y aplicadas en los CU.
- [x] **Documento de Arquitectura Técnica** — `arquitectura_tecnica.md` (10 secciones, ciclos
  C1–C8); 11 pendientes de arquitectura resueltos con D32–D41.
- [x] **Estilo visual incorporado** — `PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md` → RNF-08 + activos
  `TrueKeate/` → RF-19 (D41), aplicados en `arquitectura_tecnica.md` §8/C7.
- [x] **Auditoría de coherencia (6 lentes C1–C6)** — sincronía entre documentos verificada y
  correcciones aplicadas (cabeceras, CU-04/18/23/24/31, diccionario, estados del escrow,
  nomenclatura unificada, informes marcados históricos).

## ✅ Cierre de la Fase 2 — Documentación sincronizada

Todos los documentos de la Fase 2 quedaron **coherentes entre sí** tras la auditoría de coherencia
(6 lentes) y las correcciones aplicadas: `requerimientos.md` (RF-01…RF-19, RNF-01…RNF-08,
RT-01…RT-05, D1–D41, estilo visual RNF-08 y activos RF-19), `diccionario_datos.md` (enum canónico
de 9 estados del escrow, decisiones D23/D26/D28/D32/D33/D34 aplicadas), `casos_uso.md` (31 CU con
criterios Gherkin/EARS alineados), `arquitectura_tecnica.md` (secciones 1–10, ciclos C1–C8),
`estado_proyecto.md` y los informes V1 marcados como históricos con seguimiento.

## Decisiones registradas (D1–D41)

| ID | Decisión |
|---|---|
| D1 | **Next.js 16** |
| D2 | Publicación **solo AtoA** (se omite "Artículo por Rubro") |
| D3 | **Sistema unificado** niveles + medallas |
| D4 | Mapeo: **Bronce=Iniciado, Plata=Común, Oro=Frecuente, Socio=votación** |
| D5 | Finanzas de usuario: **NFTs/Criptos/BRLT** (BRLT solo Socios y Owner) |
| D6 | BRLT **emitida desde el inicio**, contrato de Socios |
| D7 | Fondo de valor: **1% trueque + 10% suscripciones + 5% emisión BRLT**, configurable por Owner |
| D8 | Repos: rama `escrow-dsh-GCP` en GitHub y GitLab.com |
| D9 | Proyecto GCP `truekeate-dsh` creado (ID minúsculas) |
| D10 | **Reutilizar `truekeate-main`**; `truekeate-dsh` eliminado |
| D11 | Acceso `gitlab.codecrypto.academy` se resuelve luego |
| D12 | **Fórmula de niveles aprobada** (H-01): `0,5·rep + 0,3·vol + 0,2·(1−ratioAp)`; umbrales 0–25 / 26–50 / 51–75 / ≥76+votación |
| D13 | **Anulación escrow**: quórum Socios ≥2/3, máx **5 días** (H-05) |
| D14 | **Verificado para truequear** (H-09); límites 5 / 50 por nivel (H-10) |
| D15 | **Relayer**: operador + 2 instancias + fondo financia gas + SLA ≥99% (H-02) |
| D16 | **4 protecciones anti-abuso relayer** (H-03): nonce, allowlist verificados, límite diario, rate-limiting |
| D17 | **GDPR + backup**: consentimiento, retención 24 meses, cifrado en reposo de PII, RPO≤24h/RTO≤48h (H-04) |
| D18 | **Valoración escala 1–5** (H-06) |
| D19 | **Definiciones operativas** (H-07/H-08): alta disponibilidad 10 pub/5 usr/30d; 3% en 90d; inactividad 180d → degradación |
| D20 | **Módulo Subastas** (H-12): solo Empresas crean; solo Certificados participan con prioridad por nivel |
| D21 | **Gobernanza** (H-20): quórum 2/3 un voto por Socio; sanciones on-chain con timelock 6h |
| D22 | **Arquitectura gas** (H-29): Smart Account ERC-4337 (identidad) + relayer propio EIP-712 (gas) |
| D23 | **Evidencia imágenes** (H-27): raíz merkle anclada on-chain + IPFS con pinning propio |
| D24 | **Roles operativos** (H-21…H-26): RF-18 asignados al Owner/equipo + auditoría externa Fase 4 |
| D25 | **Indexador/DB** (H-16/H-44): listener Node.js propio + reusar mcc-postgres |
| D26 | **Escrow sin quórum** (U-01): ANULADO por defecto a los 5 días, NFTs devueltos a ambas partes |
| D27 | **Subastas** (U-02): gana el mayor valor; empate → mayor nivel |
| D28 | **Escalera estados** (U-03): Inscrito → Verificado (códigos correo+teléfono) → Certificado (KYC completo) |
| D29 | **Meta-tx** (U-07): 20 transacciones/día; 3 fallos en 10 min → bloqueo 1 h |
| D30 | **Fórmula nivel** (U-11…13): insumos normalizados 0–100; recálculo mensual |
| D31 | **Cancelación** (U-05): unilateral solo pre-custodia; post-custodia solo anulación con quórum |
| D32 | **BRLT** (arquitectura): emisión con quórum 2/3; tope inicial 1M BRLT |
| D33 | **Suscripción** (H-45): staking bloqueado 30 días; plan 100 BRLT/mes configurable |
| D34 | **Recuperación social** (arquitectura): 3 guardianes, umbral 2/3, timelock 48 h |
| D35 | **EntryPoint**: NO se usa el estándar; Smart Account inspirada en 4337 + relayer propio |
| D36 | **Valoraciones off-chain** (5 renglones 1–5) + marcador on-chain "ambas valoraron" |
| D37 | **Proveedores open source**: OSM+Nominatim, OSRM, Nodemailer+SMTP, Kubo propio |
| D38 | **Cobertura**: forge coverage ≥80% líneas como gate por ciclo |
| D39 | **Fallback relayer**: modo degradado (usuario paga gas) + reembolso BRLT si caída del operador |
| D40 | **PWA instalable** en Fase 3; APK nativa como mejora futura |
| D41 | **Entorno visual aprobado**: PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md → RNF-08 + assets TrueKeate/ → RF-19 |

## Pendientes

- [ ] Acceso SSH a `gitlab.codecrypto.academy` (D11 — pospuesto)
- [x] **Ciclo 1 — Setup Foundry + Escrow base** ✅
  - [x] Instalar Foundry (forge/anvil 1.8.1)
  - [x] Proyecto Foundry en `sc/` + OpenZeppelin v5.0.2 + forge-std
  - [x] `Escrow.sol` base: CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO (ventanas 10 min/10 min, firmas duales, cancelación pre-custodia D31, marcador de valoración D36)
  - [x] Tests unit + fuzz: **18/18 verdes**; cobertura **94.96 % líneas** (gate D38 ≥80 % OK); invariantes I1/I2/I3 cubiertos
  - [x] Despliegue en anvil (cuenta 0 Owner): Escrow `0x5fbdb2…aa3` + mocks TKA/TKB/NFT
- [x] **Ciclo 2 — SmartAccount ERC-4337 + KYC estados** ✅
  - [x] `SmartAccount.sol`: wallet de identidad ERC-4337 inspirada (D35, sin EntryPoint), ejecución por firma EIP-712 con nonce (D16), escalera INSCRITO/VERIFICADO/CERTIFICADO por merkle root (D28, RF-01.7), recuperación social 3 guardianes / umbral 2/3 / timelock 48h (D34)
  - [x] `SmartAccountFactory.sol`: despliegue CREATE2 one-per-owner (CU-01)
  - [x] Tests: 14 nuevos (32/32 totales verdes); cobertura SmartAccount 95.12%, Factory 100%
  - [x] Despliegue anvil verificado: Factory + cuenta desplegada OK
- [ ] (Fase 3) **Ciclo 3 — BRLT + Suscripciones + Fondo** (pendiente de confirmación)
- [ ] (Fase 4) Pruebas E2E · (Fase 5) Manuales

## Próximos pasos

1. Confirmar los **Ciclos 1-2** y avanzar al **Ciclo 3** (BRLT + Suscripciones + Fondo, D32/D33/D7).
2. Ejecutar cada ciclo C3–C8 con unit + fuzz + invariantes + cobertura ≥80 % (D38) y preview en anvil/GCP.
3. Los commits se crean localmente en `escrow-dsh-GCP`; el push a GitHub/GitLab se hace solo por orden del director (`/push`).
