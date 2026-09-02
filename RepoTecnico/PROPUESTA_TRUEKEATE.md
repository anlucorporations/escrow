# PROPUESTA DE MEJORAS — TrueKeate: Plataforma de Intercambio Web3

> Documento base: `RepoTecnico/escrow-TrueKeate.md`
> Proyecto actual: Escrow DApp (Foundry + Next.js 16 + React 19)
> Fecha: 2026-08-22
> **NOTA HISTÓRICA**: propuesta previa a `requerimientos.md`; superada por la documentación vigente en `RepoTecnico/` (Fase 1-2).

---

## 1. RESUMEN EJECUTIVO

El proyecto actual es una DApp de escrow para intercambio de tokens ERC20. El documento `escrow-TrueKeate.md` describe una visión mucho más amplia: **TrueKeate**, una plataforma Web3 para intercambiar **Activos, Bienes y Servicios** de forma segura, con reputación, niveles de confianza, geolocalización, base de datos PostgreSQL indexada por eventos, meta-transacciones (gas gratis para particulares), suscripciones empresariales y gobernanza comunitaria.

Esta propuesta presenta las mejoras organizadas en **6 fases** con prioridad, esfuerzo y criterios de éxito, aprovechando al máximo el código existente (Escrow.sol, UserRegistry.sol, frontend, tests).

---

## 2. ESTADO ACTUAL DEL PROYECTO (base aprovechable)

| Componente | Estado | Observaciones |
|---|---|---|
| `Escrow.sol` | ✅ Funcional | `enum Status`, deadline, `refundAfterExpiry`, árbitro, disputas, paginación |
| `UserRegistry.sol` | ✅ Funcional | Inscripción on-chain con username único (3-20 chars) |
| Frontend Next.js 16 | ✅ Funcional | Landing pública, AccessGate, menú de usuario, hooks compartidos |
| Tests Foundry | ✅ 40 tests | Escrow (26) + Demo (6) + Registry (8) |
| Tests Vitest | ✅ 19 tests | Utilidades + componentes |
| Scripts de despliegue | ✅ | `setup.sh`, `start.sh`, `stop.sh`, `verify-setup.sh`, `accounts.sh` |
| CI/CD | ✅ | Workflow Foundry + Web en GitHub Actions |
| **Base de datos** | ❌ No existe | No hay PostgreSQL ni indexador de eventos |
| **Reputación** | ❌ No existe | No hay valoraciones ni niveles |
| **Geolocalización** | ❌ No existe | No hay mapas ni PostGIS |
| **Meta-transacciones** | ❌ No existe | El usuario paga gas |
| **KYC / ERC-4337** | ❌ No existe | Solo wallet conectada |
| **Imágenes/IPFS** | ❌ No existe | No hay certificación de activos |

---

## 3. MEJORAS PROPUESTAS (priorizadas)

### PRIORIDAD 1 — CRÍTICA (sin esto TrueKeate no existe)

#### M1. Base de datos PostgreSQL + Indexador de Eventos
- **Descripción:** Implementar PostgreSQL como capa de lectura impulsada por eventos. Un indexador Node.js escucha los eventos de la blockchain (OperationCreated, OperationCompleted, UserRegistered, TokenAdded, etc.) y actualiza PostgreSQL en consecuencia. La blockchain sigue siendo la única fuente de verdad.
- **Componentes:**
  - Servicio `indexer/` en Node.js con ethers.js (WebSocket a Anvil o RPC).
  - Tablas: `operations`, `users`, `items`, `ratings`, `meetups`, `transactions`, `images`.
  - Migraciones SQL versionadas (`knex` o `prisma`).
- **Por qué:** Todo el resto de la plataforma (catálogo, reputación, geolocalización) depende de una capa de consulta rápida que la blockchain sola no puede ofrecer.
- **Esfuerzo:** Media (2-3 días). **Prioridad:** 1.

#### M2. Catálogo de Artículos (Bienes y Servicios)
- **Descripción:** Permitir publicar artículos (físicos o servicios) con nombre, descripción, rubro, imágenes, cantidad y estado. Los usuarios particulares hasta 5 artículos; empresas más de 5.
- **Componentes:**
  - Tabla `items` en PostgreSQL + contrato `ItemRegistry.sol` opcional para certificar on-chain.
  - Páginas web: listado, detalle, creación/edición de artículos, búsqueda por rubro.
  - Integración con IPFS para imágenes (ver M8).
- **Por qué:** El intercambio de bienes reales es el corazón de TrueKeate; hoy solo se intercambian tokens.
- **Esfuerzo:** Alta (1 semana). **Prioridad:** 1.

#### M3. Sistema de Reputación (5 dimensiones)
- **Descripción:** Valoraciones post-intercambio en 5 renglones: Aceptación del producto, Honestidad publicitaria, Seguridad, Confiabilidad, Compromiso.
- **Componentes:**
  - Tabla `ratings` (user_id, rated_by, operation_id, 5 puntuaciones 1-5, comentario).
  - API para emitir valoraciones solo tras operaciones completadas.
  - Contrato `Reputation.sol` (opcional) para registrar el hash de la valoración on-chain (certificación).
- **Por qué:** Es la base de los niveles de confianza y del modelo "la honestidad se recompensa".
- **Esfuerzo:** Media (3-4 días). **Prioridad:** 1.

#### M4. Niveles de Confianza (Iniciado, Común, Frecuente, Socio)
- **Descripción:** Calcular el nivel según combinación de reputación, volumen de transacciones efectivas y volumen de apelaciones.
- **Reglas clave del documento:**
  - **Iniciado:** solo artículos de su rubro con alta disponibilidad; requiere 3% del total de transacciones del rubro; máx 5 rubros; no determina lugares de intercambio.
  - **Común:** puede proponer lugares de intercambio cercanos; máx 20 rubros / 50 artículos; penalización por inactividad >5% de artículos en mercado.
  - **Frecuente:** orientado a empresas; campañas masivas, establecimiento de retiro, envíos/delivery, intercambio por BRLT.
  - **Socio:** mediadores y jueces de disputas; administran emisión de BRLT; aprueban establecimientos y campañas; fondo de operaciones.
- **Componentes:** Tabla `users.trust_level`, función de cálculo batch (cron) o bajo demanda; UI de perfil con nivel.
- **Esfuerzo:** Media (3-4 días). **Prioridad:** 1.

---

### PRIORIDAD 2 — ALTA (funcionalidades diferenciadoras)

#### M5. Meta-Transacciones (EIP-712) + Relayer — gas gratis para particulares
- **Descripción:** Los particulares firman intenciones off-chain (EIP-712) sin pagar gas; un relayer (backend Node.js) envía la transacción asumiendo el costo. Las empresas pagan su gas.
- **Componentes:**
  - Funciones `createOperation`/`completeOperation` con variante meta: `createOperationWithPermit` o firma EIP-712 + `executeMetaTx`.
  - Servicio `relayer/` con cola de tareas, validación de nonce y firma, reenvío con clave del operador.
  - Whitelist de relayer en el contrato (`onlyRelayer`) + verificación de firmas.
- **Por qué:** Es una limitación explícita del documento: "las transacciones entre particulares no deberán generar coste de gas".
- **Esfuerzo:** Alta (1 semana). **Prioridad:** 2.

#### M6. Abstracción de Cuentas (ERC-4337) + KYC
- **Descripción:** Los usuarios se registran con correo/teléfono; el sistema despliega un Smart Account (contrato wallet) con recuperación social. La metadata KYC se guarda cifrada en PostgreSQL; un hash/merkle root certifica el estado de verificación on-chain sin revelar identidad.
- **Componentes:**
  - Contrato `TrueKeateAccount.sol` (entrypoint ERC-4337 compatible) o integración con librería (e.g. `account-abstraction` de eth-infinitism).
  - Servicio KYC: captura correo, teléfono, documento, selfie → cifrado AES-GCM en BD → hash merkle on-chain.
  - Integración con bundler local (en desarrollo) o público (Stackup/Biconomy) en producción.
- **Por qué:** Permite recuperación de cuenta y verificación sin exponer identidad; es requisito explícito del documento.
- **Esfuerzo:** Muy alta (2-3 semanas). **Prioridad:** 2.

#### M7. Geolocalización (OpenStreetMap + PostGIS)
- **Descripción:** API de mapas estrictamente open source (OpenStreetMap + Leaflet). Los lugares de intercambio se validan con distancia ≤ 10 km entre partes (lógica off-chain en PostgreSQL con PostGIS). La app móvil ofrece la ruta para llegar.
- **Componentes:**
  - Tabla `meetups` + `users.location` (lat/lng), índice PostGIS.
  - Servicio de geocodificación (Nominatim de OSM) y cálculo de distancia (`ST_DWithin`).
  - Mapa Leaflet en la web para seleccionar punto de encuentro; vista de ruta (OSRM o Leaflet Routing Machine).
  - Reglas por nivel: Iniciado no propone lugares; Común propone zonas conocidas; Frecuente establecimiento + delivery.
- **Esfuerzo:** Alta (1 semana). **Prioridad:** 2.

#### M8. Certificación de Imágenes (SHA-256 + IPFS + firma ECDSA)
- **Descripción:** Cada imagen de publicación/recepción genera un hash SHA-256 de la imagen + metadata + wallet del usuario; la wallet firma ese hash (ECDSA); la firma y el hash se almacenan en PostgreSQL para auditoría inmutable.
- **Componentes:**
  - Subida a IPFS (Pinata/web3.storage) → CID.
  - Frontend: generar hash del archivo (Web Crypto), pedir firma a la wallet (personal_sign o EIP-712), guardar en BD.
  - Endpoint de verificación pública (permite auditar que la imagen no fue alterada).
- **Esfuerzo:** Media (3-4 días). **Prioridad:** 2.

---

### PRIORIDAD 3 — MEDIA (modelo de negocio y gobernanza)

#### M9. Stablecoin BRLT + Suscripción de Empresas
- **Descripción:** Contrato ERC20 `BRLT` (stablecoin de la plataforma). Empresas pagan inscripción y mensualidad en BRLT; el cobro se automatiza con patrón de suscripción (staking bloqueado) sin requerir firma manual cada 30 días.
- **Componentes:**
  - Contrato `BRLT.sol` (ERC20 + mint/burn controlado por gobernanza).
  - Contrato `Subscription.sol` (suscripción con retiro automático de BRLT cada ciclo; estado activo/inactivo).
  - UI de planes (Inscripción + mensualidad), integración con wallet.
- **Esfuerzo:** Alta (1 semana). **Prioridad:** 3.

#### M10. Gobernanza (rol Socio) y Fondo de Operaciones
- **Descripción:** Los Socios administran: emisión/valor de BRLT, aprobación de establecimientos y campañas masivas, sanciones, campañas de recolección (artículos ↔ puntos de reputación), y un fondo común para gastos de operación (hosting, gas, red).
- **Componentes:**
  - Contrato `Governance.sol` (votación ponderada por nivel Socio).
  - Contrato `Treasury.sol` (multisig) para el fondo.
  - UI de administración (solo nivel Socio).
- **Esfuerzo:** Alta (1-2 semanas). **Prioridad:** 3.

#### M11. Campañas de Venta Masiva y Recolección
- **Descripción:** Empresas (nivel Frecuente) pueden lanzar campañas masivas de artículos (aprobadas por Socios). Campañas de recolección por causas (intercambio de artículos por puntos de reputación).
- **Componentes:** Tabla `campaigns`, contratos de aprobación, UI de campañas.
- **Esfuerzo:** Media (4-5 días). **Prioridad:** 3.

#### M12. Verificación de Usuarios (Avales 5 usuarios)
- **Descripción:** Los particulares deben estar respaldados por 5 usuarios verificados para operar.
- **Componentes:** Tabla `vouches` + contrato `VouchRegistry.sol` (opcional on-chain).
- **Esfuerzo:** Baja (2 días). **Prioridad:** 3.

---

### PRIORIDAD 4 — MEJORA CONTINUA

#### M13. Aplicación Móvil (PWA)
- **Descripción:** Convertir la web en PWA instalable + vistas móviles optimizadas con rutas al punto de encuentro (OSRM).
- **Esfuerzo:** Media. **Prioridad:** 4.

#### M14. Entorno remoto en GCP (preview)
- **Descripción:** Desplegar el proyecto en Google Cloud (Cloud Run para la web/API, Cloud SQL para PostgreSQL, Secret Manager para claves) conectado a Anvil remoto, con acceso restringido. Solicitar autorización antes de crear servicios.
- **Esfuerzo:** Alta. **Prioridad:** 4.

#### M15. Notificaciones (encuentros, disputas, vencimientos)
- **Descripción:** Email + push para recordatorios de intercambio (ventana de 10 min), novedades, disputas y resultados.
- **Esfuerzo:** Media. **Prioridad:** 4.

#### M16. Ventana estricta de intercambio (10 min)
- **Descripción:** Regla de negocio: el proceso debe abrirse por ambas partes a no más de 10 min de la hora pautada y con máx 10 min de diferencia entre aperturas; ante violación, el intercambio se bloquea y se solicita cierre autorizado.
- **Componentes:** Estados en BD (`scheduled_at`, `opened_at` por parte, `blocked_reason`), lógica en API, UI de flujo de encuentro.
- **Esfuerzo:** Media. **Prioridad:** 4.

---

## 4. ARQUITECTURA OBJETIVO

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16)                     │
│  Landing │ Catálogo │ Mapa │ Perfil/Reputación │ Admin │ Móvil │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────────┐
│                    API / Backend (Next.js API routes)         │
│  REST /api/*  │  Auth (JWT)  │  Geocodificación  │  IPFS     │
└──────┬───────────────────────┬───────────────────────────────┘
       │                       │
┌──────▼───────────────┐  ┌────▼───────────────────────────────┐
│  PostgreSQL + PostGIS │  │  Indexador de Eventos (Node.js)    │
│  (lectura: catálogo,  │◄─┤  ethers.js + WebSocket → RPC       │
│   reputación, mapas)  │  │  (la blockchain es fuente de verdad)│
└───────────────────────┘  └────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                 Blockchain (Anvil local / red real)           │
│  Escrow.sol │ UserRegistry.sol │ ItemRegistry.sol │ Reputation│
│  BRLT.sol │ Subscription.sol │ Governance.sol │ VouchRegistry│
│  Relayer (EIP-712) para gas gratis de particulares           │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. PLAN DE IMPLEMENTACIÓN SUGERIDO

| Fase | Contenido | Entregables | Tiempo estimado |
|---|---|---|---|
| **Fase 0** | M1 (PostgreSQL + Indexador) | BD, migraciones, indexador corriendo | 1 semana |
| **Fase 1** | M2 (Catálogo) + M3 (Reputación) + M4 (Niveles) | Catálogo funcional, valoraciones, niveles | 2 semanas |
| **Fase 2** | M5 (Meta-tx) + M7 (Mapas) + M8 (Imágenes) | Gas gratis, mapa, certificación de imágenes | 2 semanas |
| **Fase 3** | M6 (ERC-4337/KYC) + M12 (Avales) | Smart Accounts, KYC cifrado | 2-3 semanas |
| **Fase 4** | M9 (BRLT) + M10 (Gobernanza) + M11 (Campañas) | Stablecoin, suscripción, gobernanza | 2-3 semanas |
| **Fase 5** | M13-M16 (Móvil, GCP, notificaciones, ventana 10 min) | PWA, preview GCP | 2 semanas |

**Total estimado: 11-14 semanas** con 1-2 desarrolladores.

---

## 6. RIESGOS Y MITIGACIONES

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Complejidad de ERC-4337 (M6) | Alto | Empezar con entrypoint oficial y bundler local; validar con tests de integración |
| Coste de infraestructura (indexador, relayer, IPFS) | Medio | Usar planes gratuitos en desarrollo (web3.storage, Stackup) |
| Seguridad de meta-transacciones (replay, nonce) | Alto | Nonces estrictos, whitelist de relayer, tests de revert |
| PostGIS + geocodificación (límites de uso de Nominatim) | Medio | Caché de geocodificación, réplica local de datos OSM si escala |
| Privacidad KYC | Alto | Cifrado en reposo (AES-GCM), claves en Secret Manager, hash merkle on-chain sin datos personales |
| Reglas de nivel mal calculadas | Medio | Fórmula centralizada en API con tests unitarios + auditoría |

---

## 7. CONCLUSIÓN

TrueKeate es una evolución **grande pero incremental** del escrow actual. El código existente (contratos, frontend, tests, CI) cubre el núcleo transaccional; las mejoras propuestas añaden las capas de **datos (PostgreSQL), confianza (reputación, KYC, niveles), experiencia (mapas, móvil, imágenes) y negocio (BRLT, suscripciones, gobernanza)**.

**Se recomienda empezar por la Fase 0 (M1)** — el indexador de eventos — porque desbloquea las demás. Cada mejora debe seguir el ciclo del documento: conceptualización → planificación → codificación por módulos → tests → documentación → despliegue, registrando avances en `RepoTecnico/`.
