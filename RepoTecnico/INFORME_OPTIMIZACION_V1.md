# INFORME DE OPTIMIZACIÓN — TrueKeate (Escrow DApp)
**Versión:** V1 · **Alcance:** RepoTecnico/ (Fase 2 — Auditoría documental) · **Fecha:** generado por Equipo de Auditoría (3 fases)

> ## ⚠️ Estado del informe: HISTÓRICO — PARCIALMENTE SUPERADO
> Los hallazgos H-01…H-05 y los principales H-06…H-45 fueron **resueltos por las decisiones
> D12–D40** (rondas de auditoría Fase 2 y arquitectura; ver `requerimientos.md` §8 y
> `estado_proyecto.md`). Este informe conserva su valor como registro de la auditoría inicial y
> referencia de "no repetir errores" (`arquitectura_tecnica.md` lo cita como tal).

---

## 1) Resumen ejecutivo — Veredicto

**VEREDICTO: NO APTO para producción.** La documentación de Fase 1 (Concepto) tiene una base sólida —requerimientos por módulos, diccionario de datos, entornos, decisiones D1–D11— pero **no está apta ni siquiera para pasar a la Fase 3 (desarrollo)** sin cerrar primero:

- **5 hallazgos CRÍTICOS**: (H-01) la regla central de niveles/medallas que autoriza toda la plataforma no tiene fórmula ni definición operativa; (H-02/H-03) el **relayer**, único punto de fallo del que depende el trueque sin gas de todos los particulares, no tiene operador, ni resiliencia, ni presupuesto de gas, ni protección anti-abuso; (H-04) se procesan datos biométricos (selfie + documento de identidad) con **cero cumplimiento GDPR** y sin backup/recuperación; (H-05) el escrow no define quién ni cómo libera/anula fondos custodiados on-chain.
- **Contradicciones ALTAS sin resolver**: acceso de "Particular Inscrito" vs "inscritos y verificados" (H-09), límite de 5 vs 50 artículos (H-10) y estados del escrow incompletos (H-11).
- **Decisiones de entrevista sin acta verificable** (D3–D7: mapeo medallas↔niveles, comisión 1%, emisión BRLT) — la única evidencia es la tabla de decisiones; no existe transcripción en el repo (H-13, H-19, H-42).
- **Categorías completas de RNF ausentes** (accesibilidad, backup, observabilidad, disponibilidad/SLA, seguridad off-chain, cumplimiento) y **stakeholders operativos sin definir** (operador de infraestructura, moderación, KYC, custodia de claves, soporte, auditoría, compliance).

**Conclusión**: se requiere una ronda de aclaración con el cliente (D12+) que deje acta verificable, cierre de las ambigüedades núcleo, resolución de contradicciones y definición de actores **antes de modelar PostgreSQL y el contrato escrow en Fase 3**. La declaración "Sin pendientes funcionales" (requerimientos.md:261) es prematura y debe retirarse.

---

## 2) Metodología — 3 fases, 7 lentes

| Fase | Descripción |
|---|---|
| **F1 — Revisar** | 7 revisores en paralelo, uno por lente, sobre los 5 documentos canónicos (escrow-TrueKeate.md, requerimientos.md, diccionario_datos.md, entornos_globales.md, estado_proyecto.md) + greps de ausencia en todo el repo. Máx. 12 hallazgos por lente con evidencia `ruta:línea`. |
| **F2 — Verificar** | 7 verificadores adversariales (uno por lente) contrastan cada hallazgo línea a línea contra los archivos reales: filtran falsos positivos, deduplican y ajustan severidades. **Regla: ante la duda, se descarta.** |
| **F3 — Sintetizar** | Este informe: consolidación cruzada entre dimensiones, IDs únicos H-01…H-48, priorización por severidad, plan de acción. |

**Lentes (dimensiones):**
| Lente | Dimensión | Hallazgos supervivientes |
|---|---|---|
| R1 | Ambigüedad y testabilidad | 10 |
| R2 | Consistencia | 10 |
| R3 | Completitud RNF (ISO 25010) | 10 |
| R4 | Stakeholders | 10 |
| R5 | Trazabilidad con el brief | 7 |
| R6 | Riesgos técnicos (SPOF/escala) | 9 |
| R7 | Seguridad y legal | 10 |

---

## 3) Estado de calidad — Métricas

- **Hallazgos revisados en Fase 2:** ~84 (12 por lente).
- **Supervivientes verificados:** **66** (0 falsos positivos factuales; todas las citas `ruta:línea` confirmadas contra los archivos reales).
- **Descartados en Fase 2 con justificación:** 9 (R1: 2 fusionados; R2: 2; R3: 2; R5: 1; R6: 1; R7: 2). Motivos: duplicación interna, falso positivo parcial, ambigüedad redaccional sin impacto, inferencia no demostrada, solapamiento con otro hallazgo.
- **Tras deduplicación cruzada entre dimensiones:** **48 hallazgos únicos** → **5 CRITICA · 24 ALTA · 17 MEDIA · 2 BAJA**.
- **Cobertura de verificación:** lectura completa de los 5 documentos + greps de ausencia (p. ej. `moder|denuncia`, `GDPR|consentimiento`, `bundler|paymaster`, `backup|RPO`) con 0 coincidencias donde se declara ausencia.
- **Métricas de código:** no aplican — el workspace no contiene código (TrueKeate/ solo assets; RepoTecnico/ solo documentos); la afirmación de "frontend funcional" no es verificable localmente (H-38).

---

## 4) Tabla de hallazgos por severidad

### CRÍTICA (5)

| ID | Área | Título | Dimensión |
|---|---|---|---|
| H-01 | RF-03 / RF-07.4 (R12) | Regla central de niveles/medallas no especificada: fórmula sin pesos ni umbrales y "intercambio efectivo" sin definición operativa | R1 |
| H-02 | Relayer / Operación | Relayer SPOF sin operador, sin resiliencia ni presupuesto de gas (depende de infraestructura huérfana) | R4+R6+R3 |
| H-03 | Relayer / Seguridad | Abuso del relayer: sin nonce, allowlist, límites ni verificación de tipo de usuario; una sola clave paga todo el gas | R7+R3 |
| H-04 | Privacidad / Datos | PII biométrica (KYC) sin cumplimiento GDPR ni backup/recuperación/retención | R7+R3 |
| H-05 | Escrow (fondos) | Autoridad y mecanismo on-chain de liberación/anulación de fondos custodiados no definidos | R7 |

### ALTA (24)

| ID | Área | Título | Dimensión |
|---|---|---|---|
| H-06 | RF-07 / RNF-06.1 | Escala y agregación de las valoraciones (5 renglones) sin especificar: el cierre obligatorio no es calculable | R1 |
| H-07 | RF-03.4 (R10) | Nivel Iniciado: "alta disponibilidad" y "3% del rubro" sin criterios computables | R1 |
| H-08 | RF-03.5 (R11) | "Período prolongado de inactividad" sin duración y penalización sin especificar | R1 |
| H-09 | Acceso | Contradicción: "Particular Inscrito" puede completar un intercambio pero solo "inscritos y verificados" acuerdan | R2 |
| H-10 | Límites | Límite de artículos contradictorio: Particular "hasta 5" vs nivel Común "máximo 50" | R2 |
| H-11 | Escrow (modelo) | Estados del escrow incompletos: bloqueo irregular (RF-05.8/R6) y anulación justificada (RF-06.1) sin estado | R2 |
| H-12 | Subastas | Subastas de empresa: deseo del brief sin desarrollo funcional, contradictorio con AtoA y con criterio subjetivo | R5+R1+R2 |
| H-13 | Trazabilidad (D7) | Comisión 1%/10%/5% y configuración del fondo por el Owner: regla económica sin base en el brief, sin acta | R5 |
| H-14 | Pagos / Royalties | Enforcement on-chain de la comisión del fondo no especificado (riesgo de bypass) | R7 |
| H-15 | RNF Accesibilidad | Categoría accesibilidad (ISO 25010) ausente por completo de los RNF | R3 |
| H-16 | Indexador | Indexador sin idempotencia, reproceso ni reconciliación; invariantes off-chain sin verificación | R3+R6 |
| H-17 | RNF Observabilidad | Sin logs estructurados, métricas ni alertas para indexador, relayer, contratos o API | R3 |
| H-18 | ERC-4337 (RF-02.2) | Recuperación de cuenta vinculada al KYC: datos no secretos = vector de robo de fondos | R7 |
| H-19 | BRLT | Emisión/valor de BRLT por Socios sin respaldo ni límites; D5/D6 sin base y en tensión con el nivel Frecuente | R7+R5 |
| H-20 | Gobernanza / Disputas | Socios jueces con conflicto de interés, voto ponderado manipulable; disputas y votación sin quórum, umbrales ni ejecución | R7+R1+R4 |
| H-21 | Moderación | Sin rol de moderación ni responsable del bloqueo por "violación de norma" (RF-05.8/R6) | R4 |
| H-22 | KYC | Verificación KYC sin autoridad verificadora ni proceso (automática/humana, plazos, apelación) | R4 |
| H-23 | Claves | Custodia de claves sin custodio, rotación ni separación de funciones; cuenta única con roles mezclados; Owner sin multisig/timelock | R4+R6+R7 |
| H-24 | Soporte | Sin rol de soporte al usuario (canal, SLA, escalamiento) | R4 |
| H-25 | Auditoría | Auditoría solo nominal: nadie audita las acciones de Socios ni del Owner | R4 |
| H-26 | Cumplimiento | Sin RNF ni rol de cumplimiento legal/regulatorio (privacidad, términos, BRLT, facturas) | R4+R3 |
| H-27 | Evidencia | Integridad de la evidencia de imágenes: IPFS sin pinning y hash no anclado on-chain ("inmutabilidad" no garantizada) | R6+R7 |
| H-28 | Licencias / SaaS | Dependencia de SaaS comerciales (Biconomy/OZ Defender/Pinata) que contradice RNF-05.1, sin plan de salida | R6 |
| H-29 | Arquitectura | Conflación ERC-4337 (bundler/paymaster) con EIP-712 (relayer): sin resolver quién opera el bundler ni cómo se paga el gas | R6 |

### MEDIA (17)

| ID | Área | Título | Dimensión |
|---|---|---|---|
| H-30 | Rendimiento | Rendimiento sin métricas cuantitativas ni criterios de aceptación | R3 |
| H-31 | Portabilidad | Sin RNF de portabilidad y red EVM de producción sin decidir (solo chain 31337) | R3 |
| H-32 | Mantenibilidad | RNF-04 incompleto: sin gates de CI/CD, documentación técnica ni estrategia de upgrade de contratos | R3 |
| H-33 | Usabilidad | Criterios de usabilidad subjetivos ("amigable", "colores vivos") sin aceptación medible | R1 |
| H-34 | Publicaciones | "Toda la información que dé confianza" no enumerada: requisito no validable | R1 |
| H-35 | Estado de completitud | Declaración "Sin pendientes funcionales" prematura (requerimientos.md:261) | R1 |
| H-36 | Trazabilidad | Ningún RF tiene hito, fase objetivo ni plazo asignado | R2 |
| H-37 | Stack | Next.js 14 vs 16 contradictorio en el brief fuente y en escrow_base.md | R2 |
| H-38 | Estado del proyecto | "Fase 1 sin desarrollo" vs "Frontend Next.js 16 ✅ Funcional" (no verificable localmente) | R2 |
| H-39 | Identidad/KYC | Merkle root "certifica el estado de verificación" usando nombres de niveles de confianza ("Iniciado", "Común") | R2 |
| H-40 | Entornos/GCP | GCP_PROJECT_ID global (mcc-ecommerce) vs proyecto (truekeate-main): override no implementado | R2 |
| H-41 | Encargo | Encargo de particulares: deseo del brief sin proceso definido (publicación, emparejamiento, escrow) | R5 |
| H-42 | Trazabilidad (D3/D4) | Mapeo unificado Bronce=Iniciado… sin base textual en el brief (necesita verificación) | R5 |
| H-43 | Geocodificación | Regla ≤10 km dependiente de geocodificación externa sin fallback ni manejo de errores en requerimientos.md | R6 |
| H-44 | PostgreSQL | Reuso de mcc-postgres sin decisión documentada y sin réplica, backup ni dimensionamiento | R5+R6 |
| H-45 | Suscripciones | EIP-1337 no finalizado (Draft) y decisión abierta; cobro de empresas dependiente del relayer | R6 |
| H-46 | Gobernanza | Owner sin límites formales, sucesión ni separación de funciones con los Socios | R4 |

### BAJA (2)

| ID | Área | Título | Dimensión |
|---|---|---|---|
| H-47 | Nomenclatura | Capitalización inconsistente del nombre del proyecto: "Truekeate" vs "TrueKeate" | R2 |
| H-48 | Brief | Invitación del brief a proponer actividades de bienestar/confort nunca atendida | R5 |

---

## 5) Hallazgos críticos detallados (evidencia + recomendación)

### H-01 — CRÍTICA · Regla central de niveles/medallas no especificada
**Área:** RF-03 Niveles de confianza / RF-07.4 medalla Oro (regla dura R12) · **Dimensión:** R1

El nivel (Iniciado/Común/Frecuente/Socio) es el eje de autorización de la plataforma (límites de rubros y artículos, capacidad de fijar lugares, sanciones, requisito Oro para Empresa), pero **RF-03.3 solo enumera insumos sin función**: "nivel de reputación (medalla) + volumen de transacciones efectivas + volumen de intercambios en apelación" — sin pesos relativos, normalización, umbrales por nivel ni regla de ascenso/descenso. A la vez, el criterio **Oro = "más de 1000 intercambios y 90% de intercambios efectivos"** (RF-07.4) usa "efectivo" sin definir, sin aclarar si el 1000 es sobre el total o solo efectivos, ni el período de cómputo. El diccionario modela los campos (`nivel`, `medalla`) pero no el algoritmo. Sin esto no se pueden implementar ni escribir tests de promoción/descenso ni de clasificación Oro.

**Evidencia:** requerimientos.md:45 (RF-03.3 combinación sin pesos); requerimientos.md:104 (RF-07.4 "Oro: más de 1000 intercambios y 90% de intercambios efectivos"); escrow-TrueKeate.md:36 y :68 (misma redacción en la fuente); diccionario_datos.md:29 (`nivel`/`medalla` sin origen de cálculo) y :48 ("Medalla Oro = +1000 intercambios y 90% efectivos"); requerimientos.md:35 (RF-01.8 Empresa requiere Oro).

**Recomendación:** Definir en requerimientos.md una especificación matemática del nivel: pesos (w1, w2, w3), normalización de cada insumo, umbrales numéricos por nivel, ventana (acumulativa o móvil) y regla de ascenso/descenso; y la definición operativa de "intercambio efectivo" (p. ej. estado COMPLETED con firmas de recepción de ambas partes y valoración registrada, excluyendo CANCELLED/DISPUTED no resueltos), la base del umbral 1000 y el período. Cada transición debe tener aserción testeable en Foundry/tests.

### H-02 — CRÍTICA · Relayer SPOF sin operador, resiliencia ni presupuesto de gas
**Área:** Relayer / Meta-transacciones (RF-09, RF-15.2) · **Dimensión:** R4+R6+R3

Las transacciones de particulares sin costo de gas dependen **100% del relayer** (RF-09.1/RF-09.2: el usuario firma EIP-712 y el backend envía la transacción asumiendo el gas); la cuenta 1 del anvil actúa como relayer y además como "cuenta general de la plataforma para pagos de gas y otros gastos" (RF-15.2). **Ningún documento define el actor que opera, monitorea, financia y responde por relayer + indexador + backend**, ni hay RNF de disponibilidad/SLA, redundancia, failover, health-check, presupuesto/cuota de gas, límite por usuario ni alerta de saldo (grep verificado). El fondo de valor de Socios (RF-03.7) cubre el origen de fondos pero no la gestión de cuota ni la resiliencia. En anvil el gas es gratuito (mitiga el agotamiento en el preview), pero la arquitectura documentada concentra coste y disponibilidad en un único punto. Se agrava porque requerimientos.md:261 declara "Sin pendientes funcionales".

**Evidencia:** requerimientos.md:113-114 (RF-09.1/09.2), :154 (RF-15.2), :69-70 (RF-03.7), :178-180 (RNF-03 sin contenido de disponibilidad); entornos_globales.md:60-61 (Cuenta 1 = relayer/plataforma); escrow-TrueKeate.md:43, :62; RT-02.4 (indexador) sin operador; grep "operador|SLA|uptime" sin rol definido.

**Recomendación:** Definir el rol de **Operador de Infraestructura** (relayer + indexador + backend) con responsable nominal, financiamiento del gas desde el fondo de valor, monitoreo, RNF de disponibilidad (uptime/SLA) y plan de contingencia. Añadir RNF de resiliencia: mínimo 2 instancias/relayers, cola de transacciones con reintentos y backoff, health-check y failover, presupuesto de gas con umbrales y alertas, límite por usuario/día y estimación de coste por meta-tx; documentar fallback (p. ej. el usuario paga el gas directamente ante indisponibilidad prolongada).

### H-03 — CRÍTICA · Abuso del relayer: sin nonce, allowlist, límites ni verificación de tipo de usuario
**Área:** Relayer / Meta-transacciones (RF-09) · **Dimensión:** R7+R3

Los particulares no pagan gas y "el backend enviará la transacción asumiendo el costo del gas", mientras "los usuarios Empresas deberán pagar el gas de todas sus transacciones" (brief). Los requerimientos (RF-09.1-09.3) no exigen: validación de nonce/anti-replay (EIP-712 es solo el estándar de firma; el nonce es un diseño aparte), allowlist de signers verificados, rate limiting, límite de gas por intención, ni verificación on-chain de que el signer es un PARTICULAR antes de pagar gas (riesgo de **bypass de la regla R1**: una empresa usa el relayer para no pagar). Solo se define UNA clave relayer en Secret Manager. RNF-01 (seguridad) protege contratos y PII pero nada cubre la API del relayer: sin autenticación de endpoints, sin rate limiting, sin rotación de claves. Riesgo: drenaje del fondo de gas (DoS), replay de firmas.

**Evidencia:** escrow-TrueKeate.md:43-44; requerimientos.md:113-115 (RF-09.1-09.3), :243 (R1), :166-171 (RNF-01 sin backend); entornos_globales.md:72 (RELAYER_PRIVATE_KEY, sin política de rotación).

**Recomendación:** Añadir requisitos duros: EIP-712 con dominio (chainId) y **nonce único por cuenta** para todo meta-tx; el relayer solo acepta intents de Smart Accounts de particulares verificados (chequeo on-chain del estado de verificación); límites de gas/velocidad por signer; autenticación/autorización de endpoints, rate limiting, análisis estático/auditoría de seguridad previos a producción; monitoreo del saldo y rotación de claves.

### H-04 — CRÍTICA · PII biométrica (KYC) sin cumplimiento GDPR ni backup/recuperación
**Área:** Privacidad / Datos (RNF-01.3/01.4) · **Dimensión:** R7+R3

Se recopilan correo, teléfono, documento de identidad, selfie y dirección de inscripción. La selfie y el documento son **datos biométricos/categoría especial (GDPR Art. 9)** que exigen base legal explícita, consentimiento, minimización y medidas reforzadas. Grep verificado: **0 coincidencias** de GDPR/RGPD, consentimiento, base legal, retención, supresión o DPO en los 5 documentos. Además, solo la "metadata del KYC" se especifica cifrada; correo, teléfono y dirección en `usuarios` no indican cifrado ni política de acceso. En paralelo, **no existe ningún RNF de backup, RTO/RPO, cifrado en reposo ni retención/borrado** para PostgreSQL (que alberga esta PII y alimenta reputación, puntos de encuentro y disputas), ni recuperación del indexador ante pérdida/corrupción.

**Evidencia:** escrow-TrueKeate.md:47-49; diccionario_datos.md:29-30 (`kyc.documentoIdentidad` cifrado, resto sin cifrado); requerimientos.md:168-169 (RNF-01.3/01.4), :209-210 (RT-02.2/RT-02.4); grep "backup|RPO|RTO|restauración|retención|GDPR" = 0 en los 5 documentos.

**Recomendación:** Incorporar RNF de cumplimiento: análisis de base legal y consentimiento para KYC (biometría), cifrado en reposo de TODOS los campos PII (no solo KYC), gestión de claves de cifrado, plazos de retención/borrado (derecho al olvido), derechos ARCO, notificación de brechas, DPO; evaluar proveedor de KYC tercero certificado. Añadir RNF de backup (frecuencia, RPO/RTO), pruebas de restauración y recuperación del indexador (reproceso desde bloque N).

### H-05 — CRÍTICA · Autoridad y mecanismo on-chain de liberación/anulación del escrow no definidos
**Área:** Escrow (fondos custodiados, RF-05.2 / RF-06.1) · **Dimensión:** R7

Los NFTs/criptos quedan custodiados hasta que AMBAS partes firmen la recepción, pero la anulación solo se describe como "solicitar anulación justificando la anulación y los NFTs ofrecidos vuelven a las billeteras" **sin especificar quién la aprueba, con qué umbral (unilateral/bilateral) ni el mecanismo on-chain** (timelock, periodo de disputa, rol de Socios ejecutando la decisión). La entidad Escrow solo tiene `estado` (ACTIVE/COMPLETED/CANCELLED/DISPUTED) sin campos de aprobador ni plazos de liberación. Riesgo: drenaje unilateral de fondos custodiados, fondos atascados si una parte no firma, o liberación arbitraria por un rol central.

**Evidencia:** escrow-TrueKeate.md:7, :10; requerimientos.md:81 (RF-05.2), :90 (RF-06.1); diccionario_datos.md:19.

**Recomendación:** Definir en requerimientos: flujo on-chain de liberación (bilateral firmada), devolución por anulación con autoridad explícita (ambas partes o quórum de Socios tras votación), timelock de espera, periodo de disputa antes de ejecutar, y funciones on-chain de los Socios como jueces con límites (nunca liberación unilateral). Incluir invariantes de no-liberación en Fase 3.

---

### Hallazgos ALTOS — resumen de evidencia y recomendación

- **H-06 Valoraciones (R1):** requerimientos.md:96-102 (RF-07.1/07.2) y :190 (RNF-06.1) exigen valoración obligatoria en 5 renglones sin escala (¿1-5? ¿1-10?) ni fórmula de agregación; diccionario_datos.md:33 sin tipos. → Especificar escala, fórmula de reputación (media simple vs ponderada) y rango de medalla, con aserciones de dominio testeables.
- **H-07 Nivel Iniciado (R1):** requerimientos.md:47-48 y :252 (R10): "alta disponibilidad" y "3% del total de las transacciones en su rubro" sin criterio objetivo; diccionario_datos.md:31 modela `altaDisponibilidad` booleano sin regla. → Definir criterios computables deterministas (p. ej. rubro con ≥N publicaciones activas de ≥M usuarios en 30 días; participación ≥3% del número de transacciones del rubro en 90 días) con tests de bloqueo para Iniciado.
- **H-08 Inactividad (R1):** requerimientos.md:55 y :253 (R11): "período prolongado" sin duración, base del 5% sin aclarar y "penalización" sin sanción definida. → Fijar ventana (p. ej. 180 días sin actividad), base del 5% y sanción concreta (degradación a Iniciado o suspensión de publicaciones), cada caso con test determinista.
- **H-09 Acceso contradictorio (R2):** requerimientos.md:29 (RF-01.2) y :249 (R7) exigen "inscritos y verificados" para acuerdos, pero :145 (RF-14.3) permite al "Particular Inscrito" completar un intercambio; brief escrow-TrueKeate.md:73-75 define 3 estados de interfaz nunca mapeados a niveles/medallas. → Definir el mapeo Inscrito/Verificado/Certificado ↔ nivel ↔ medalla y aclarar si completar exige verificación; ajustar RF-14.3 o RF-01.2/R7.
- **H-10 Límite 5 vs 50 (R2):** requerimientos.md:74 (RF-04.2: Particular hasta 5) vs :54 (RF-03.5: Común hasta 50) y :253 (R11); diccionario_datos.md:46 y brief replican la duplicidad. → Resolver con precedencia explícita del límite por nivel y actualizar RF-04.2, RF-03.5/R11 y diccionario.
- **H-11 Estados del escrow (R2):** diccionario_datos.md:19 (enum sin BLOCKED/IRREGULAR) no cubre RF-05.8/R6 (bloqueo por violación de norma) ni distingue anulación justificada de RF-06.1; sin mapeo on-chain↔off-chain pese a RNF-01.1 y RT-02.4. → Ampliar la máquina de estados y definir el mapeo para el indexador antes de modelar PostgreSQL y el contrato.
- **H-12 Subastas (R5+R1+R2):** deseo del brief (escrow-TrueKeate.md:2) sin desarrollo funcional (solo RF-04.4, requerimientos.md:76), sin entidad en el diccionario, sin acceso por rol (RF-14.7), contradictorio con el modo solo-AtoA (RF-04.1/D2) y con criterio subjetivo "considerados buscados". → Crear módulo RF propio de subastas (crear, pujar, cierre, custodia en escrow, devolución) o registrarlo como pendiente funcional explícito antes de Fase 2.
- **H-13 Comisión D7 (R5):** brief solo dice que los Socios "conformarán un fondo de valor" (escrow-TrueKeate.md:40); RF-03.7 añade 1%/10%/5% configurables por el Owner sin base textual; única evidencia es la tabla de decisiones (requerimientos.md:289) y **no existe acta/transcripción de la entrevista en el repo**. → Confirmar porcentajes y autoridad con el cliente dejando acta verificable; marcar RF-03.7 como "pendiente de confirmación".
- **H-14 Enforcement de comisión (R7):** no se especifica dónde se cobra el 1% (on-chain en la liquidación del escrow vs off-chain); si vive off-chain, se evade interactuando directo con el contrato; sin límites ni timelock para el cambio de porcentajes por el Owner. → Requerir liquidación on-chain del 1% en el cierre del trueque y cobro de 10%/5% en SuscripcionEmpresa/BRLT; documentar límites y timelock.
- **H-15 Accesibilidad (R3):** ningún RNF exige WCAG 2.1/2.2, contraste, teclado/foco ni lectores de pantalla (grep = 0); RNF-02 solo cubre usabilidad estética; onboarding exige selfie + documento. → Añadir RNF de accesibilidad con criterios de aceptación verificables por prueba.
- **H-16 Indexador (R3+R6):** RT-02.4 deja "The Graph o listener" sin reorgs/reproceso/idempotencia/checkpoints ni métricas de lag; invariantes duras (≤10 km, ventanas ≤10 min, penalización por inactividad) solo en PostgreSQL event-driven sin reconciliación con la cadena (única fuente de verdad, RNF-01.1). → Cerrar la decisión The Graph vs listener, añadir reproceso desde bloque, manejo de reorgs, idempotencia por txHash, métricas de lag y reconciliación periódica con alertas.
- **H-17 Observabilidad (R3):** sin logs estructurados, métricas ni alertas para indexador, relayer, contratos o API; RF-13.1 pide dashboard de rendimiento sin KPIs. → Añadir RNF de monitoreo (latencia del indexador, consumo de gas del relayer, tasa de errores, uptime, desincronización).
- **H-18 Recuperación por KYC (R7):** RF-02.2 exige "recuperación social o vinculada a su KYC"; el KYC (documento + selfie) no es un secreto y reside en la misma PostgreSQL comprometible; sin guardianes, umbrales ni timelock. → Exigir recuperación social con guardianes + timelock y aviso previo; prohibir la recuperación automática solo-KYC.
- **H-19 BRLT (R7+R5):** Socios "administrarán la emisión y valor" de la stablecoin (brief :40) con campo `valor` mutable on-chain (diccionario_datos.md:21) sin colateralización, límites, multisig ni marco regulatorio (MiCA/MTL); D5/D6 (saldo visible solo a Socios/Owner; emisión "desde el inicio") sin base textual y en tensión con el intercambio por BRLT del nivel Frecuente. → Definir respaldo o eliminar la fijación de valor on-chain, límites de emisión, multisig y asesoría legal antes de emitir.
- **H-20 Gobernanza/disputas (R7+R1+R4):** los Socios son mediadores/jueces y a la vez administran el fondo y BRLT (conflicto de interés); el voto se pondera por reputación manipulable; RF-06.4 ("mayor peso en las disputas") sin cuantificar; votación de Socios (RF-01.9/R13) sin quórum, mayoría, plazo ni administrador; nadie ejecuta las sanciones. → Separar roles (jueces sin administración del fondo) o abstención por interés; definir quórum/mayoría/plazo/empate/revocación, ejecución on-chain con timelock y apelación; acotar la ponderación del voto.
- **H-21 Moderación (R4):** RF-05.8/R6 ordenan bloquear por "violación de norma" sin actor que detecte/denuncie/ejecute; grep "moder|denuncia|reporte" = 0; sin moderación de publicaciones/campañas. → Definir rol de moderación con procedimiento de denuncia, revisión con evidencia y activación del bloqueo.
- **H-22 KYC sin autoridad (R4):** RF-01.2/01.5/01.7 definen medios y merkle root pero ningún actor realiza/aprueba la verificación; entidad `kyc` (diccionario_datos.md:30) sin responsable. → Definir responsable del proceso KYC (automático + revisión humana, plazos, apelación) y su trazabilidad.
- **H-23 Claves/custodia (R4+R6+R7):** RELAYER/ADMIN_PRIVATE_KEY en Secret Manager sin custodio, rotación ni separación; la cuenta 1 mezcla relayer + gastos generales (RF-15.2); el Owner (ADMIN) configura porcentajes y despliega sin multisig ni timelock (RNF-01.2 Ownable). → Separar cuentas por función, política de rotación, multisig para acciones privilegiadas y plan de respuesta ante compromiso de clave.
- **H-24 Soporte (R4):** única aparición de "soporte" = "soporte de mapas" (requerimientos.md:107); pérdida de acceso, penalizaciones y cobros de empresas sin canal ni responsable. → Definir rol de soporte con canal, SLA y escalamiento.
- **H-25 Auditoría nominal (R4):** "Auditoría" es atributo del nivel Socio y entidad técnica `auditoria` (diccionario_datos.md:40, registro de eventos) sin actor revisor de acciones de Socios/Owner (emisión BRLT, porcentajes del fondo). → Definir rol de auditoría independiente con revisión periódica del registro auditable.
- **H-26 Cumplimiento (R4+R3):** RNF-05.1 solo cubre licencias open source; sin RNF ni rol de privacidad, términos de uso, facturas/certificados (RF-01.6) ni evaluación regulatoria de BRLT y custodia (grep "regul|compliance|legal|GDPR|fisco" = 0 roles). → Añadir RNF de cumplimiento y rol compliance/legal con procesos de autorización de divulgación, facturación y requerimientos legales.
- **H-27 Evidencia de imágenes (R6+R7):** imágenes certificadas "idealmente en IPFS" (RF-11.2) sin pinning, redundancia, gateway de fallback ni retención; hash+firma solo en PostgreSQL mutable (RF-11.4 "garantiza inmutabilidad" — falsa, la BD es alterable y el hash no está anclado on-chain). → Requerir servicio de pinning con copia redundante y verificación de CIDs; anclar raíz merkle/acumulador de certificaciones en el contrato; corregir redacción de RF-11.4/RNF-01.5.
- **H-28 SaaS vs RNF-05.1 (R6):** Biconomy/OZ Defender (RF-09.2, RT-03.2) y Pinata (entornos_globales.md:74) contradicen RNF-05.1/R9 (código abierto, gratuito) sin excepción ni plan de salida; PROPUESTA_TRUEKEATE.md refuerza Stackup/Biconomy/web3.storage. → Decidir relayer/pinning propios de código abierto o documentar la excepción con plan de salida antes de Fase 3.
- **H-29 ERC-4337 vs EIP-712 (R6):** RF-02 exige ERC-4337 y RF-09 EIP-712 meta-tx: mecanismos distintos; grep "bundler|EntryPoint|paymaster" = 0 en los 5 documentos; no se define quién opera el bundler ni cómo se paga la UserOperation. → Cerrar la decisión de arquitectura (4337 con bundler/paymaster propios o EIP-712 con relayer propio), documentar componente que paga el gas y ciclo de vida de UserOps con fallback por flujo.

---

## 6) RNF faltantes (categorías ISO 25010 ausentes)

| # | Categoría | Gap verificado | Hallazgo |
|---|---|---|---|
| 1 | **Accesibilidad** | Sin WCAG 2.1/2.2, contraste, teclado/foco ni lectores de pantalla | H-15 |
| 2 | **Backup / Recuperación** | Sin RNF de backup, RTO/RPO, cifrado en reposo, retención/borrado de PII ni recuperación del indexador | H-04 |
| 3 | **Observabilidad / Monitoreo** | Sin logs estructurados, métricas ni alertas para indexador, relayer, contratos o API | H-17 |
| 4 | **Fiabilidad del indexador** | Sin idempotencia, reproceso, reorgs, reconciliación on-chain↔off-chain ni métricas de lag | H-16 |
| 5 | **Disponibilidad / SLA** | RNF-03 titula "Rendimiento y disponibilidad" pero no contiene % de disponibilidad, RTO ni redundancia (relayer SPOF) | H-02 |
| 6 | **Seguridad off-chain** | Backend/relayer sin autenticación, rate-limit, validación EIP-712, límites de gas, rotación ni custodia de claves | H-03, H-23 |
| 7 | **Portabilidad** | Sin matriz de SO/navegadores/resoluciones ni red EVM de producción decidida (solo chain 31337) | H-31 |
| 8 | **Rendimiento** | Sin métricas cuantitativas (p95, TPS, lag evento→BD) ni criterios de carga | H-30 |
| 9 | **Cumplimiento** | Sin GDPR/privacidad, términos legales, ni requisitos regulatorios/contables de BRLT y facturas | H-04, H-26 |
| 10 | **Mantenibilidad** | Sin gates de CI/CD como requisito, documentación técnica ni estrategia de upgrade de contratos (proxy/UUPS o migración) | H-32 |

---

## 7) Stakeholders faltantes (roles sin definir)

| # | Rol | Por qué es necesario | Hallazgo |
|---|---|---|---|
| 1 | **Operador de Infraestructura** (relayer + indexador + backend) | El trueque sin gas depende 100% de esta infraestructura; nadie la opera, monitorea, financia ni responde por ella | H-02 |
| 2 | **Equipo de Moderación** | Nadie detecta/ejecuta el bloqueo por "violación de norma" (RF-05.8/R6) ni modera publicaciones/campañas | H-21 |
| 3 | **Autoridad verificadora KYC** | Quién aprueba la verificación (automática/humana), plazos, rechazos y apelaciones | H-22 |
| 4 | **Custodio de claves** | Sin custodio, rotación ni separación de funciones para RELAYER/ADMIN_PRIVATE_KEY | H-23 |
| 5 | **Soporte al usuario** | Canal, SLA y escalamiento para pérdida de acceso, penalizaciones y cobros de empresas | H-24 |
| 6 | **Auditoría independiente** | Nadie revisa las acciones de Socios (BRLT, sanciones) ni del Owner (porcentajes del fondo) | H-25 |
| 7 | **Compliance / Legal** | PII biométrica, stablecoin BRLT, custodia de fondos y divulgación de identidad sin dueño del proceso | H-26 |
| 8 | **Administrador de votación de Socios** | Sin administrador, quórum, mayoría, plazos ni revocación del estatus de Socio | H-20 |
| 9 | **Ejecutor de disputas/sanciones** | Quién aprueba anulaciones justificadas y ejecuta sanciones (p. ej. penalización por inactividad) | H-20 |

---

## 8) Plan de acción

### Quick wins (S — documental, 1 semana) · Responsable: Documentación / Product Owner
| Acción | Resuelve |
|---|---|
| Unificar capitalización a "TrueKeate" en títulos/cabeceras | H-47 |
| Retirar "Sin pendientes funcionales" y reabrir la lista de ambigüedades pendientes | H-35 |
| Corregir Next.js 14 → 16 en escrow-TrueKeate.md:15 (o anotar brief superado por D1); deprecar escrow_base.md | H-37 |
| Documentar el override GCP_PROJECT_ID=truekeate-main en gcp-env.sh del proyecto | H-40 |
| Añadir pendiente explícito para las actividades de bienestar del brief | H-48 |
| Alinear estado_proyecto.md con PROPUESTA_TRUEKEATE.md (verificar si el frontend existe en repos de D8) | H-38 |
| Crear matriz RF→fase/hito con fechas objetivo y plazo para D11 | H-36 |

### Mejoras (M — 2-4 semanas, ANTES de Fase 3) · Responsable: Product Owner + Arquitecto
| Acción | Resuelve |
|---|---|
| Ronda de aclaración D12+ con el cliente con acta verificable: fórmulas de nivel y valoración, definiciones operativas ("efectivo", "alta disponibilidad", 3%, inactividad, peso en disputas, quórum) | H-01, H-06, H-07, H-08 |
| Confirmar por escrito D3–D7 (mapeo medallas↔niveles, comisión 1%, emisión BRLT, subastas, encargo) | H-13, H-19, H-42, H-12, H-41 |
| Resolver contradicciones de acceso, límites y estados del escrow con precedencia explícita | H-09, H-10, H-11 |
| Incorporar los RNF faltantes (sección 6) con criterios de aceptación medibles | H-15, H-16, H-17, H-30, H-31, H-32 |
| Cerrar decisiones de infraestructura: The Graph vs listener, relayer propio vs SaaS, ERC-4337 vs EIP-712, geocodificador con fallback, PostgreSQL dedicado, EIP-1337 vs staking bloqueado | H-28, H-29, H-43, H-44, H-45 |
| Definir roles y procesos de stakeholders (sección 7) con RACI | H-02, H-21, H-22, H-24, H-25, H-26 |

### Roadmap (L — Fase 3 y pre-producción) · Responsable: Líder técnico + Seguridad + Auditoría externa
| Acción | Resuelve |
|---|---|
| Diseño de contratos con seguridad por diseño: máquina de estados completa, autoridad de liberación/anulación con timelock, liquidación on-chain de comisiones, nonce/allowlist del relayer, hash de evidencia anclado on-chain | H-03, H-05, H-11, H-14, H-27 |
| Modelo de gobernanza: separación de roles Socios/jueces, quórum/mayoría/plazo/revocación, ejecución on-chain de resoluciones con apelación, límites y sucesión del Owner | H-20, H-46 |
| Hardening operativo: multisig + timelock, rotación y custodia de claves, recuperación social con guardianes (sin KYC automático), monitorización y presupuesto de gas del relayer, pinning IPFS | H-18, H-23, H-02, H-27 |
| Programa de verificación: invariantes de no-liberación y de niveles en Foundry, auditoría de seguridad externa, pruebas de carga (p95, TPS, lag del indexador) y plan de cumplimiento GDPR/regulatorio BRLT | H-01, H-06, H-16, H-30, H-04, H-26 |

---

**Criterios de aceptación para la V2:** (1) cada regla núcleo (nivel, valoración, efectivo, disponibilidad, 3%, inactividad, disputas, quórum) tiene aserción testeable documentada; (2) contradicciones de acceso/límites/estados resueltas en los 3 documentos; (3) actas verificables de D3–D7 en RepoTecnico; (4) RNF faltantes incorporados con métricas; (5) roles de stakeholders definidos con RACI; (6) decisiones de infraestructura cerradas (relayer, bundler, indexador, IPFS, DB, red de producción).
