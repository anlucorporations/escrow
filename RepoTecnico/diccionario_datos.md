# TrueKeate — Diccionario de Datos

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** |
| Documento | `RepoTecnico/diccionario_datos.md` |
| Estado | Actualizado tras Fase 2 (decisiones D1–D41); **definitivo en la Fase 3** junto con el esquema PostgreSQL |
| Fuente | `RepoTecnico/requerimientos.md` (RF-01 a RF-19, RNF-01…RNF-08) · `arquitectura_tecnica.md` (§3–§5) |

> ⚠️ Inventario de entidades y campos. Los tipos, restricciones y relaciones definitivas se
> materializan en la Fase 3 con el esquema SQL, tomando como fuente maestra `arquitectura_tecnica.md` §4.

---

## 1. Entidades on-chain (contratos)

| Entidad | Descripción | Campos candidatos |
|---|---|---|
| `Escrow` | Custodia de NFTs/criptos durante el trueque | `id`, `truekeId`, `parteA`, `parteB`, `nftsCustodiados[]`, `estado` **ENUM canónico (9)** (CREADO/ACTIVO/CUSTODIADO/APERTURA/EN_DISPUTA/RESOLUCION_SOCIOS/COMPLETADO/ANULADO/BLOQUEADO), `horaPautada`, `aperturaA`, `aperturaB`, `firmaRecepcionA`, `firmaRecepcionB`, `solicitudAnulacion`, `solicitanteAnulacion`, `plazoResolucion` (≤5 días), `votacionSocios`, `quorum` (≥2/3, 1 voto por Socio — D21), `resolucion`, `motivoAnulacion`, `anulacionPorDefecto` (D26: vence plazo sin quórum → ANULADO), `rootMerkleImagenes` (D23: raíz merkle de certificaciones anclada on-chain), `timelockSanciones` (6 h — D21, solo sanciones) |
| `SmartAccount` (ERC-4337 inspirada — D35) | Wallet contrato de identidad | `owner`, `kycMerkleRoot`, `estadoVerificacion` **ENUM escalera D28** (INSCRITO/VERIFICADO/CERTIFICADO), `guardianes[]` (3 — D34), `umbralGuardianes` (2 de 3 — D34), `timelockRecuperacion` (48 h — D34), `recuperacionKyc` (solo con revisión humana del Owner) |
| `NivelesReputacion` | Algoritmo de nivel (D12, D30) | `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1−ratio_apelaciones)`; insumos **normalizados a 0–100** (reputación ×20; volumen relativo al máximo ×100; apelaciones 100×(1−ratio)); **recálculo mensual**; `intercambioEfectivo` (COMPLETED + firmas + valoración); `medallaOro` (≥1000 efectivos y ≥90% ratio) |
| `BRLT` (ERC-20) | Stablecoin BorloTokens | `totalSupply`, `balanceOf`, `admin` (contrato de Socios), `topeEmision` (**1.000.000 BRLT inicial — D32**), `emisionesRegistradas[]` (proposito, monto, quorum 2/3 — D32), `valor` |
| `SuscripcionEmpresa` | Cobro automático por **staking bloqueado** (D33) | `empresa`, `montoPlan` (base **100 BRLT/mes**, configurable por Owner — D33), `periodo` (30 días), `ultimoCobro`, `activa`, `estado` (ACTIVA/IRREGULAR/CANCELADA) |
| `Reputacion` (si on-chain) | Puntajes por renglón | `usuario`, `aceptacion`, `honestidad`, `seguridad`, `confiabilidad`, `compromiso`, `nivel`, `medalla` |

## 2. Entidades off-chain (PostgreSQL)

| Entidad | Descripción | Campos candidatos |
|---|---|---|
| `usuarios` | Registro e identidad | `id`, `wallet`, `correo [PII]`, `telefono [PII]`, `tipo` (PARTICULAR/EMPRESA/SOCIO), `nivel` (INICIADO/COMUN/FRECUENTE/SOCIO), `medalla` (BRONCE/PLATA/ORO), `estado` (INSCRITO/VERIFICADO/CERTIFICADO — D28), `estadoKyc`, `direccion` (inscripción) [PII], `geog` (PostGIS), `smartAccount`, `consentimientoGdpr`, `consentimientoFecha`, `actividadUltima` |
| `kyc` | Metadata KYC cifrada | `usuarioId`, `documentoIdentidad` (cifrado), `selfieHash`, `merkleRoot`, `estado` (PENDIENTE/APROBADO/RECHAZADO/APELACION), `revisadoPor` (Owner — RF-18.4) |
| `articulos` | Publicaciones (AtoA) | `id`, `usuarioId`, `titulo`, `descripcion`, `rubro`, `nftTokenId`, `disponible`, `altaDisponibilidad`, `imagenCertificacionId` (FK 1—1 → `imagenes_certificadas`) |
| `encargos` | Pedidos de artículo fuera del mercado (RF-04.3/CU-07) | `id`, `solicitanteId`, `articuloDeseado`, `ofertaId` (lo que ofrece a cambio), `estado` (ACTIVO/TOMADO/CANCELADO), `fechas` |
| `truekes` | Intercambios | `id`, `articuloA`, `articuloB`, `usuarioA`, `usuarioB`, `escrowId`, `estado` (**espejo del enum on-chain de 9 estados**), `horaPautada`, `puntoEncuentroId`, `certificacionA`, `certificacionB`, `anulacionJustificada` |
| `valoraciones` | Evaluación al cierre (escala 1–5, D18; detalle **off-chain** — D36) | `id`, `truekeId`, `valorador`, `valorado`, `aceptacion` (1–5), `honestidad` (1–5), `seguridad` (1–5), `confiabilidad` (1–5), `compromiso` (1–5), `marcadorOnChain` (ambas partes valoraron — requisito COMPLETED) |
| `puntos_encuentro` | Zonas registradas | `id`, `usuarioId` (registró), `latitud`, `longitud`, `direccion`, `radioKm` |
| `disputas` | Conflictos y apelaciones | `id`, `truekeId`, `solicitante`, `motivo`, `estado`, `mediadores[]` (Socios), `sancion`, `decision` |
| `imagenes_certificadas` | Evidencia de publicación/recepción (D23) | `id`, `tipo` (PUBLICACION/RECEPCION), `refId`, `hashSha256`, `ipfsCid`, `wallet`, `firmaEcdsa`, `metadata`, `rootMerkleAnclada` (raíz merkle on-chain del escrow — D23) |
| `suscripciones` (off-chain) | Registro de cobros empresa (staking bloqueado — D33) | `id`, `empresaId`, `plan` (100 BRLT/mes configurable), `monto`, `fecha`, `txHash`, `estado` (ACTIVA/IRREGULAR/CANCELADA), `cicloInicio`, `cicloFin` |
| `campañas` | Venta masiva / recolecta | `id`, `tipo` (VENTA/RECOLECTA), `usuarioId`, `aprobadaPorSocios`, `articulos[]`, `causa` |
| `subastas` | Subastas de empresa (RF-17) | `id`, `empresaId`, `articuloId`, `escrowId`, `duracion`, `pujaInicial`, `incrementoMinimo`, `pujas[]`, `estado` (ABIERTA/CERRADA/ANULADA), `ganadorId`, `adjudicacion` (mayor valor; empate → mayor nivel — D27) |
| `finanzas` | Saldos de usuario y fondo global | `usuarioId`, `nftsStock`, `criptos`, `brlt`, `fondoValor`, `porcentajesConfig` (owner) |
| `auditoria` | Registro de eventos indexados (idempotencia) | `evento`, `txHash`, `logIndex`, `contrato`, `bloque`, `payload`, `procesado`, **UNIQUE(tx_hash, log_index, contrato)** |
| `indexador_checkpoint` | Reposición del indexador (RNF-07.4) | `bloqueUltimoProcesado`, `actualizadoEn` |

## 3. Reglas de datos destacadas

- `distanciaPuntoEncuentro` ≤ 10 km entre partes (PostGIS, off-chain).
- Ventanas de apertura: ≤ 10 min de la hora pautada y ≤ 10 min de diferencia entre aperturas.
- Límites por nivel: Iniciado (5 rubros, 3% del rubro, sin lugar de encuentro), Común (20 rubros, 50 artículos), Particular (5 artículos; el nivel manda sobre el tipo).
- Valoración **obligatoria** para cerrar un trueque (5 renglones).
- Medalla Oro = +1000 intercambios efectivos y 90% efectivos (requisito Empresa).
- **Verificación obligatoria para completar un trueque**: escalera Inscrito → Verificado (códigos correo+teléfono) → Certificado (KYC documento+selfie) — D28.
- Anulación del escrow: quórum de Socios ≥2/3, plazo máximo 5 días desde la solicitud; **sin quórum al vencer el plazo → ANULADO por defecto y NFTs devueltos a ambas partes** (D26).
- Subastas: gana el **mayor valor ofrecido**; empate → mayor nivel (D27).
- Cancelación: unilateral y sin penalización **solo antes de la custodia**; después, solo anulación con quórum (D31, RF-05.3).
- Relayer: **límite 20 meta-tx/usuario/día**; 3 fallos en 10 min → bloqueo 1 h (D29).
- **Gobernanza (D21)**: resoluciones de disputas y admisión de Socios con quórum 2/3 y un voto por Socio; sanciones ejecutadas on-chain con timelock 6h.
- **Imágenes (D23)**: raíz merkle de certificaciones anclada on-chain en el escrow; IPFS con pinning propio.
- `hashSha256 + firmaEcdsa` obligatorios para imágenes (inmutabilidad).
