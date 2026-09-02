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
- [x] **Ciclo 3 — BRLT + Suscripciones + Fondo** ✅
  - [x] `SociosRegistry.sol`: padrón de Socios + votación de admisión con quórum ≥2/3 (D21, CU-03) + propuestas económicas (emisión/tope BRLT) con quórum 2/3 (D32)
  - [x] `BRLT.sol`: ERC-20 BorloTokens controlado por el registry (D6), tope inicial 1M (D32), registro con propósito, 5% al fondo (D7)
  - [x] `FondoDeValor.sol`: fondo de operación (D7), porcentajes 1%/10%/5% configurables por Owner, retiros para operación (D15)
  - [x] `SuscripcionEmpresa.sol`: staking bloqueado 30 días, plan 100 BRLT/mes configurable (D33), 10% al fondo (D7), cancelación con devolución (CU-24)
  - [x] Tests: 20 nuevos (52/52 totales verdes); cobertura líneas: BRLT 90%, Fondo 100%, Registry 94%, Suscripción 82%
  - [x] Despliegue anvil verificado: BRLT/Fondo/Registry/Suscripcion OK
- [x] **Ciclo 4 — Indexador + PostgreSQL + PostGIS** ✅
  - [x] `backend/db/schema.sql`: esquema PostgreSQL completo (14 tablas + PostGIS + enum canónico 9 estados + escalera D28 + cifrado PII D17 + idempotencia UNIQUE)
  - [x] `backend/indexador.js`: listener Node.js propio (D25) — idempotencia (tx_hash/log_index/entidad), checkpoints por contrato, reconciliación, métricas de lag
  - [x] `backend/indexador-cli.js`: barrido único / modo servicio --watch
  - [x] Tests: 5/5 (node:test, pool en memoria): mapeo TruekeCreado→truekes, custodia→CUSTODIADO, idempotencia, barrerDesde+checkpoint, contrato desconocido
  - [ ] Integración con `mcc-postgres` real (pendiente de entorno GCP — D25)
- [x] **Ciclo 5 — Relayer EIP-712** ✅
  - [x] `backend/relayer.js`: relayer que envía meta-tx asumiendo el gas (RF-09.2) desde la cuenta 1 (RF-15.2); 4 protecciones D16 (nonce+chainId, allowlist de verificados con chequeo on-chain D28, límite diario 20/día D29, endpoint autenticado — rate-limit en C6); bloqueo 1h tras 3 fallos/10 min (D29); health-check SLA (D15)
  - [x] Tests: 7/7 (node:test con provider mock): intent verificado, rechazo no-verificado, nonce repetido, chainId, límite diario, bloqueo por fallos, health
  - [x] Integración E2E real en anvil: SmartAccount marcada VERIFICADO (D28) + meta-tx enviada por cuenta 1 con nonce incrementado ✅
- [x] **Ciclo 6 — Backend API REST** ✅
  - [x] `api/app.js`: Express con rate-limiting global (D16/RF-09.6), /healthz, manejo de errores
  - [x] `api/routes/auth.js`: connect (inscripción RF-01.4), register (GDPR D17), session por firma EIP-191
  - [x] `api/routes/kyc.js`: escalera D28 (códigos→VERIFICADO; documento+selfie + revisión Owner→CERTIFICADO, RF-18.4)
  - [x] `api/routes/catalog.js`: publicaciones AtoA con límites por nivel (D14/RF-04.2), encargos (CU-07)
  - [x] `api/routes/truekes.js`: creación (Verificado, máx 3 activos RF-14.4), custodiar, firma, valoración 1-5 (D18/D36)
  - [x] `api/routes/admin.js`: dashboard Owner (RF-13.1): usuarios, contratos, KPIs disputas, db, infra/health
  - [x] Tests: 7/7 (supertest + almacén en memoria); suite backend **19/19**
- [x] **Ciclo 7 — Frontend suite + landing** ✅
  - [x] Next.js 16.3.4 + TypeScript + Tailwind v4 + ethers v6 (D1/RT-04)
  - [x] `lib/ethereum.tsx`: context provider MetaMask (RT-04.4): provider/signer/account + auto-reconexión (RF-16.2)
  - [x] `lib/contracts.ts`: ABIs de los 6 contratos + direcciones anvil (RT-04.5)
  - [x] Sistema de diseño RNF-08 en `globals.css`: tokens @theme (paleta Bóveda Digital, gradientes, curvas) + componentes Button/Card/BottomNav/StatusBadge
  - [x] Landing (RF-14.1) con assets hero + logo/título (RF-19)
  - [x] Suite por estado/rol (RF-14.2-14.8): dashboard con escalera D28 + 4 módulos
  - [x] Assets de marca copiados a `web/public/brand` y `web/public/hero` (RF-19)
  - [x] Manifest PWA instalable (D40); build OK (9 páginas estáticas)
- [x] **Ciclo 8 — Cierre vertical: disputas + reputación + subastas** ✅
  - [x] `Escrow.sol` ampliado: CU-17 bloqueo (RF-05.8), CU-18 anulación con quórum ≥2/3 (D13) y ANULADO por defecto a los 5 días (D26), CU-19 sanción con timelock 6h (D21); vinculación a SociosRegistry; 9/9 tests nuevos (suite Foundry 61/61)
  - [x] `api/lib/reputacion.js` + router `/reputacion`: fórmula D12/D30 (insumos 0–100, recálculo mensual), Oro histórico (RF-07.4), penalización inactividad (D19/CU-21)
  - [x] Router `/subastas`: solo Empresa crea (RF-17.1), solo Certificado puja (RF-17.2), mayor valor gana con desempate por nivel (D27/CU-25/26)
  - [x] Tests: 7/7 C8 (suite backend **26/26**; suite Foundry **61/61**; total plataforma 87 tests)
- [x] **Push realizado en los 3 repos** ✅: rama `escrow-dsh-GCP` en `0f5e521` publicada en **GitHub**, **GitLab.com** y **gitlab.codecrypto.academy** (token HTTPS configurado globalmente; contenido heredado reemplazado por lo construido con forced update)
- [x] **D11 resuelto**: acceso a `gitlab.codecrypto.academy` habilitado vía token (credential helper global)
- [ ] (Fase 4) Pruebas E2E · (Fase 5) Manuales

## Próximos pasos

1. **Fase 3 completa y publicada** (rama `escrow-dsh-GCP` en `2340fac` — GitHub + GitLab.com).
2. Siguiente: **Fase 4** (pruebas E2E con navegador + pruebas exhaustivas Forge) y **Fase 5** (manuales).
3. Pendiente operativo resuelto: los 3 remotos sincronizados (D11 cerrado).
3. Los commits se crean localmente en `escrow-dsh-GCP`; el push a GitHub/GitLab se hace solo por orden del director (`/push`).
