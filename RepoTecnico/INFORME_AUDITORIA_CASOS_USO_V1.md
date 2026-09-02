# INFORME DE AUDITORÍA DE CASOS DE USO — TrueKeate
**Versión:** V1 · **Alcance:** `RepoTecnico/casos_uso.md` (v2, criterio analista funcional) · **Fecha:** Fase 2 — auditoría de casos de uso (skill asistente-proyecto, paso 4)

> ## ⚠️ Estado del informe: HISTÓRICO — SUPERADO
> Las dudas de la sección 6 fueron **resueltas por las decisiones D26–D31** y aplicadas en
> `casos_uso.md` (CU-11/18/20/23/26, entre otros) y en `requerimientos.md`. La sincronía de
> documentos se verificó posteriormente con la auditoría de coherencia (lentes C1–C6). Este
> informe queda como registro histórico de la auditoría de casos de uso v2.

---

## 1) Resumen ejecutivo — Veredicto

**VEREDICTO: los casos de uso NO están listos para Fase 3** sin resolver antes 1 hallazgo CRÍTICO y 5 decisiones de negocio ALTAS que hoy dejan criterios sin oráculo de test determinista. La base documental es sólida y verificada (0 referencias a RF/R/D/RNF inexistentes; 0 falsos positivos entre los confirmados).

**Síntesis:**
- **1 CRÍTICA (U-01):** la "resolución por defecto" del escrow al vencer los 5 días sin quórum (CU-18 A1/Criterio 4 → CU-19) **no define el resultado terminal**, dejando el escrow sin cierre en tiempo finito.
- **5 ALTAS (U-02…U-06):** adjudicación de subasta sin precedencia nivel/valor definida; estado Certificado sin vía de obtención especificada; RF sin CU ni exclusión documentada (RF-14.5/16.3/18.7, cancelación RF-05.3); doble regla de la medalla Oro sin reconciliar.
- **~17 MEDIA y ~8 BAJA** (higiene documental, nomenclatura, trazabilidad incompleta).

**Conclusión:** se requieren decisiones de negocio (bloque de preguntas al usuario) + reescritura puntual de ~8-10 criterios afectados, y alineación de `requerimientos.md`/`diccionario_datos.md` con los CU, antes de derivar la matriz de tests 1:1 para la Fase 3.

---

## 2) Metodología

| Fase | Descripción |
|---|---|
| **F1 — Revisar** | 5 revisores en paralelo sobre `casos_uso.md` v2 (31 CU, 170 criterios): Gherkin (L1), EARS (L2), cobertura/trazabilidad (L3), flujos y casos límite (L4), reglas de negocio/consistencia (L5). Máx. 12 hallazgos por lente con evidencia `ruta:línea`. |
| **F2 — Verificar** | 5 verificadores adversariales contrastan cada hallazgo contra `casos_uso.md`, `requerimientos.md` y `diccionario_datos.md`. **Regla: ante la duda, se descarta.** |
| **F3 — Sintetizar** | Este informe: deduplicación cruzada entre dimensiones, IDs U-01…, priorización, dudas accionables para el usuario y plan de acción. |

**Lentes:** L1 Gherkin · L2 EARS · L3 Cobertura/trazabilidad · L4 Flujos/casos límite · L5 Reglas de negocio.

---

## 3) Métricas

- Documento auditado: `casos_uso.md` — **31 casos de uso (CU-01…CU-31)** en 1.336 líneas.
- Criterios de aceptación: **170 totales** — **72 [Gherkin]** + **98 [EARS]** (verificados por grep).
- Referencias a RF/R/D/RNF **inexistentes: 0** (todas las trazabilidades apuntan a IDs reales).
- Hallazgos revisados: ~60 → **supervivientes verificados: 31** → tras deduplicación cruzada: **1 CRITICA · 5 ALTA · 17 MEDIA · 8 BAJA**.
- Descartados en F2: ~29 (motivos: duplicación entre lentes, pertenencia a otra dimensión, duda → descartado).

---

## 4) Tabla de hallazgos por severidad

### CRÍTICA (1)

| ID | CU | Título | Lente |
|---|---|---|---|
| U-01 | CU-18/CU-19 | Resolución "por defecto" del escrow a los 5 días sin quórum: sin estado terminal definido → escrow sin cierre en tiempo finito | L4 |

### ALTA (5)

| ID | CU | Título | Lente |
|---|---|---|---|
| U-02 | CU-26 | Adjudicación de subasta: "mejor postor según prioridad de nivel y valor" sin orden de precedencia (¿nivel primero? ¿valor?) | L5 |
| U-03 | CU-03/CU-05 | Estado "Certificado": sin vía de obtención definida (¿se certifica al superar umbral de nivel? ¿por trámite?) | L3 |
| U-04 | RF-14.5/16.3/18.7 | Requisitos sin CU ni exclusión documentada (detalles de Certificado, firma móvil APK, cumplimiento legal) | L3 |
| U-05 | RF-05.3 | Cancelación de swap declarada en RF-05.3 sin CU de salida propio (solo referenciada en alternativas A4) | L3 |
| U-06 | CU-20/CU-15 | Doble regla de la medalla Oro (fórmula D12 vs +1000 efectivos/90%) sin reconciliar en criterios | L5 |

### MEDIA (17) — resumen

| ID | Tema | Detalle |
|---|---|---|
| U-07…U-10 | Parámetros sin valor | Límite diario de meta-tx, "falla reiterada" del relayer, umbrales de campañas, "revisión humana KYC" sin plazos |
| U-11…U-13 | Fórmula D12 | Normalización y escala de los 3 insumos (reputación, volumen, ratio apelaciones) no especificada |
| U-14 | Apertura anticipada | Destino del escrow si una parte abre >10 min antes de la hora pautada |
| U-15 | Cierre irregular | Destino de activos en cierre irregular (RF-05.8): devolución, quema o disputa no definido en criterios |
| U-16…U-23 | Trazabilidad incompleta | R7, R9, R12, R13 y varias decisiones D no citadas en CU donde aplican |

### BAJA (8)

| ID | Tema |
|---|---|
| U-24 | Cabecera residual "parte 1 de 2" / "Parte 2 (CU-17…CU-31)" tras fusión |
| U-25…U-31 | Nomenclatura inconsistente de criterios ("CA-nn" vs "Criterio n"); notas de exclusión ausentes; formato menor |

---

## 5) Hallazgos críticos y altos detallados (evidencia)

### U-01 — CRÍTICA · Resolución por defecto sin estado terminal
**Evidencia:** `casos_uso.md:787` (A1: "si vencen los 5 días sin alcanzar quórum, la solicitud se resuelve por defecto según el flujo de disputas (RF-05.2b → CU-19)") y `casos_uso.md:799` (Criterio 4 EARS idéntico). El flujo de CU-19 (`casos_uso.md:816`) no define qué ocurre **concretamente** (¿se anula? ¿se libera a la parte solicitante? ¿se fuerza COMPLETADO?).
**Recomendación:** Definir el resultado por defecto al vencer los 5 días sin quórum (propuesta: **devolución de NFTs a ambas partes — estado ANULADO por defecto**), con criterio EARS testeable y aserción de invariante de cierre en tiempo finito.

### U-02 — ALTA · Precedencia nivel vs valor en subastas
**Evidencia:** `casos_uso.md:1097` ("el Sistema determina el mejor postor según prioridad de nivel y valor") sin orden definido.
**Recomendación:** Fijar orden lexicográfico (propuesta: **primero nivel del postor (mayor → mejor), luego valor ofrecido**), con criterio Gherkin de empate resuelto.

### U-03 — ALTA · Vía de obtención del estado Certificado
**Evidencia:** `casos_uso.md` CU-05 (clasificación Empresa exige "certificado + Oro") sin CU que defina cómo un Verificado llega a Certificado.
**Recomendación:** Definir tránsito Verificado→Certificado (propuesta: **Certificado = Verificado con nivel Común o superior y N trueques efectivos**), o declararlo exclusión documentada.

### U-04 — ALTA · RF sin CU ni exclusión
**Evidencia:** RF-14.5 (todas las operaciones del Certificado), RF-16.3 (firma móvil APK), RF-18.7 (cumplimiento legal) sin CU propio ni nota de exclusión.
**Recomendación:** Añadir nota de exclusiones (R9 open source, RF-16.3, RF-18.7, D1/D8–D11) o crear CU de soporte.

### U-05 — ALTA · Cancelación de swap sin CU
**Evidencia:** RF-05.3 declarado en trazabilidad (`casos_uso.md:515`, `:638`) pero solo referenciado en alternativas (`casos_uso.md:702` A4).
**Recomendación:** Crear CU de "Cancelar trueque (RF-05.3)" con criterios Gherkin (cancelación unilateral pre-custodia vs post-custodia).

### U-06 — ALTA · Doble regla de la medalla Oro
**Evidencia:** CU-20 (fórmula D12) vs RF-07.4 (+1000 efectivos y ≥90%).
**Recomendación:** Reconciliar: la medalla Oro = fórmula D12 (51–75) **y además** +1000 efectivos/90% como condición de clasificación Empresa, o unificar en una sola regla con criterio testeable único.

---

## 6) DUDAS para el usuario (deben resolverse antes de avanzar a Fase 3)

1. **Escrow sin quórum (U-01):** al vencer los 5 días sin alcanzar 2/3, ¿qué resultado por defecto aplica: anulación con devolución de NFTs a ambas partes, o liberación a favor del solicitante?
2. **Subastas (U-02):** en la adjudicación, ¿manda primero el **nivel del postor** y luego el **valor ofrecido**, o al revés?
3. **Certificado (U-03):** ¿cómo pasa un usuario de Verificado a Certificado? ¿Se certifica al alcanzar nivel Común + N trueques efectivos, o es un trámite distinto?
4. **Meta-tx (U-07):** ¿cuál es el **límite diario de meta-transacciones por usuario** (propuesta: 20/día) y qué es "falla reiterada" del relayer (propuesta: 3 fallos en 10 min → bloqueo temporal 1 h)?
5. **Inactividad (U-11…U-13):** ¿la fórmula D12 normaliza sus 3 insumos a escala 0–100 antes de ponderar? ¿Los 3 insumos se recalculan mensualmente?
6. **Cancelación (U-05):** ¿la cancelación de un trueque es permitida **antes** de custodiar activos (unilateral) y **prohibida después** (solo por anulación con quórum)?

---

## 7) Plan de acción

### Quick wins (S — documental)
| Acción | Resuelve | Estado |
|---|---|---|
| Corregir cabecera residual de fusión ("parte 1 de 2" / "Parte 2") | U-24 | ✅ Aplicado (cabecera v2 única, CU-01…CU-31) |
| Unificar nomenclatura de criterios (`CU-XX-CAnn` consistente) | U-25…U-31 | ✅ Aplicado (módulos numerados 6–11; criterios con nomenclatura unificada) |
| Añadir nota de exclusiones (RF-16.3, RF-18.7, R9, D1/D8–D11) | U-04 | ✅ Parcial — RF-16.3 alineado a D40 (PWA); RF-18.7 documentado como requisito |
| Completar trazabilidad R7/R9/R12/R13 y decisiones faltantes | U-16…U-23 | ✅ Aplicado en revisión de coherencia (lentes C1–C6) |

### Mejoras (M — antes de Fase 3)
| Acción | Resuelve |
|---|---|
| Ronda de decisiones de negocio con el usuario (bloque de 3, sección 6) | U-01…U-06 |
| Reescritura puntual de ~8-10 criterios afectados tras las decisiones | U-01…U-15 |
| Alinear RF-05.2b/06.4 y `diccionario_datos.md` con los CU | U-01, U-06 |

### Roadmap (L — Fase 3)
| Acción | Resuelve |
|---|---|
| Derivar matriz de tests 1:1 CU→criterio → caso de prueba (Foundry/Jest) | Todos |
| Añadir invariantes de cierre en tiempo finito del escrow a las pruebas de invariantes | U-01 |

---

**Criterios de aceptación para la V2 de los casos de uso:** (1) cada criterio Gherkin/EARS tiene oráculo de test determinista; (2) escrow con cierre en tiempo finito en todos los caminos; (3) exclusiones documentadas; (4) trazabilidad 100% completa; (5) dudas de la sección 6 resueltas por el usuario.
