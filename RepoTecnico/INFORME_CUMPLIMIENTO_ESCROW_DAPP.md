# Informe de cumplimiento — Proyecto TrueKeate frente al enunciado `README_ESTUDIANTE.md`

> **Enunciado de referencia:** `RepoTecnico/README_ESTUDIANTE.md` (364 líneas) — "Proyecto Escrow DApp - Guía para Estudiantes".
> **Objeto auditado:** repositorio `escrow` completo (`sc/`, `web/`, `backend/`, `scripts/`, `RepoTecnico/`).
> **Rama y commit auditados:** `main` @ `1ea7085` (árbol `4f832c7`).
> **Fecha:** 11 de septiembre de 2026.
> **Método:** inspección estática de solo lectura del código y la documentación. No se ejecutaron builds ni suites de pruebas; los conteos son estáticos y están indicados como tales.

---

## 0. Resumen ejecutivo

El repositorio **no es el proyecto del enunciado**: es un producto real, **TrueKeate**, una plataforma Web3 de trueque de bienes y servicios con custodia atómica, que nació del ejercicio `90_escrow` y lo desbordó en alcance, arquitectura y estándares.

En consecuencia, la comparación tiene tres lecturas que dan resultados muy distintos:

| Lectura | Qué mide | Resultado |
|---|---|---|
| **Global ponderada** | La rúbrica completa de la §1 (capacidades + estructura + stack + fases + mejoras + calidad) | **67 %** |
| **Literal** | Que los 22 artefactos nombrados en el enunciado (archivos, componentes, funciones y eventos) existan **con ese nombre exacto** | **27 %** (6 de 22) |
| **Mejoras opcionales** | Los 10 "siguientes pasos" que el enunciado listaba como deseables | **45 %** |

El motivo de la brecha es concreto y está cuantificado en este informe: **ninguna** de las 6 funciones ni de los 4 eventos exigidos existe con el nombre pedido, y **ninguno** de los 5 componentes de React exigidos existe; a cambio, el proyecto implementa el mismo dominio con una máquina de estados de 9 fases, 9 contratos en lugar de 1, 84 pruebas de contrato en lugar de las "pruebas completas" genéricas, y una plataforma con 16 pantallas.

**Dónde el proyecto suspende de verdad** (no por nombres, sino por capacidad ausente o por código roto):

1. **Los scripts de despliegue están rotos**: `deploy-local.sh` referencia 9 de los 11 contratos que invoca **que ya no existen** y aborta en su línea 92; `deploy.sh` no existe; `verify-setup.sh` consulta funciones inexistentes. El único artefacto que despliega los contratos reales es `sc/script/Deploy.s.sol`, que no cubre los 6 pasos pedidos.
2. **La lista de tokens permitidos** (`addToken`) no existe en el contrato ni en la UI.
3. **El panel de depuración de balances** (`BalanceDebug`) no existe ni tiene equivalente.
4. **La actualización automática de `web/lib/contracts.ts`** no existe, y además los nombres de variable que generan los scripts (`NEXT_PUBLIC_ESCROW_ADDRESS`) **no coinciden** con los que lee el frontend (`NEXT_PUBLIC_ESCROW`): el mismo fallo se repite en los `--build-arg` de Cloud Build.
5. **Ofertas parciales, filtros por token, multi-chain y subgraph**: ausentes (el subgraph, por decisión explícita D25).
6. **Pruebas unitarias de frontend**: no existen, y la suite de backend tiene 4 pruebas en rojo.
7. **Tratamiento del rechazo de MetaMask (4001)** y escucha de `chainChanged`: ausentes.

---

## 1. Rúbrica de evaluación (para que el porcentaje sea auditable)

Cada bloque del enunciado se puntúa sobre su propio total; el porcentaje global es la media ponderada.

| Bloque | Peso | Qué incluye |
|---|---:|---|
| A. Funcionalidades principales | 25 % | Los 5 puntos de "Funcionalidades Principales" |
| B. Estructura de archivos exigida | 20 % | Las rutas y nombres de archivo del árbol de la §"Arquitectura del Proyecto" |
| C. Stack tecnológico | 15 % | Los 8 elementos de "Tecnologías Utilizadas" |
| D. Fases 1–12 del proceso guiado | 15 % | Cada fase se evalúa como cumplida / parcial / no cumplida |
| E. Mejoras posibles (§"Siguientes Pasos") | 10 % | Los 10 ítems opcionales |
| F. Calidad y verificación | 15 % | Pruebas, despliegue reproducible, documentación y evidencia de funcionamiento |

Valores: **cumplido = 1**, **parcial = 0,5**, **no cumplido = 0**. Los parciales siempre van acompañados de la evidencia que los justifica.

---

## 2. Métricas del proyecto auditado

| Métrica | Valor | Fuente |
|---|---:|---|
| Contratos propios en `sc/src` | 9 (+2 mocks) | `ls sc/src` |
| Líneas de Solidity de producción | 1.674 | `wc -l sc/src/*.sol sc/src/mocks/*.sol` |
| Líneas de pruebas de contrato | 1.629 | `wc -l sc/test/**/*.sol` |
| Funciones de prueba (`test`) | 75 | `grep -c 'function test' sc/test/*.sol` |
| Pruebas de fuzzing (`testFuzz`) | 4 | idem |
| Invariantes (`invariant`) | 5 | `sc/test/invariantes/` |
| **Total pruebas de contrato** | **84** | suma |
| Endpoints HTTP del backend | 77 (76 de routers + `/healthz`) en 13 routers | `backend/api/routes/*.js`, `backend/api/app.js:76` |
| Pantallas del frontend (App Router) | 16 páginas + 2 layouts | `find web/app -name page.tsx` |
| Líneas de frontend (TS/TSX) | 13.902 | `web/app`, `web/components`, `web/lib` |
| Líneas de backend (JS) | 5.309 | `backend/` |
| Líneas de documentación técnica | 15.372 | `RepoTecnico/**/*.md` |
| Requisitos funcionales y no funcionales | 110 RF + 37 RNF | `RepoTecnico/requerimientos.md` |
| Decisiones de diseño registradas | D1–D41 (41) | idem |
| Servicios desplegados en GCP Cloud Run | web, api, anvil, pgadmin | URLs citadas en la documentación |

---

## 3. Bloque A — Funcionalidades principales (25 %)

El enunciado pedía 5 funciones. La tabla compara la exigencia literal con lo que existe.

| # | Funcionalidad exigida | API exigida | Estado literal | Equivalente real | Puntos |
|---|---|---|---|---|---:|
| 1 | **Agregar tokens**: el owner autoriza qué ERC20 se pueden intercambiar | `addToken(address)` | ❌ **No existe**. No hay lista de tokens permitidos en ningún contrato ni en la UI (`ActivoNoPermitido` solo valida que el token no sea la dirección cero) | Validación abierta: cualquier ERC20/ERC721 es aceptable; para NFTs se exige el NFT oficial (`Escrow.sol:514`) | 0 / 5 |
| 2 | **Crear operación**: U1 deposita Token A y pide Token B | `createOperation(tokenA,tokenB,amountA,amountB)` | ❌ nombre distinto | `crearTrueke(...)` (`Escrow.sol:192`) + depósito efectivo en custodia `custodiarA`/`custodiarB` (`:236`, `:252`) | 5 / 5 |
| 3 | **Completar operación**: U2 aporta Token B y recibe Token A | `completeOperation(id)` | ❌ nombre distinto | Apertura dual con ventana de ±10 min (`aperturaA`/`aperturaB`, `:272`, `:285`), firmas de recepción (`firmarRecepcionA/B`, `:338`, `:350`) y cierre en `_intentarCompletar` (`:358`) | 5 / 5 |
| 4 | **Cancelar operación**: U1 recupera sus tokens | `cancelOperation(id)` | ❌ nombre distinto | `cancelar(id)` (`Escrow.sol:380`) + anulación por quórum de socios (`solicitarAnulacion` `:407`, `votarSocio` `:424`) y resolución por defecto a 5 días (`:452`) | 5 / 5 |
| 5 | **Visualizar estado**: panel de debug con balances y operaciones activas | `getAllowedTokens()`, `getAllOperations()` | ❌ **No existe el panel**. No hay `BalanceDebug` ni lectura de `balanceOf`/`getBalance` en el navegador; los listados de operaciones están integrados en cada pantalla | Listados por estado en `/suite/intercambio`, `/suite/mercado`, `/suite/dashboard`; saldos contables del backend en `/suite/valor`. La inspección on-chain se hace con `cast` desde los manuales | 1 / 5 |

**Puntuación del bloque A: 16 / 25 = 64 %.**

> Nota de interpretación: los puntos 2, 3 y 4 se otorgan al 100 % porque la capacidad pedida existe y es **más estricta** que la pedida (custodia atómica real, ventana temporal de apertura, doble firma y gobernanza de disputas). El punto 1 se puntúa 0 porque la allowlist de tokens es una funcionalidad de control de acceso que simplemente no está; el punto 5 se puntúa 1/5 porque hay visualización de estado en la interfaz pero no el panel de depuración de balances pedido.

---

## 4. Bloque B — Estructura de archivos exigida (20 %)

| # | Ruta exigida por el enunciado | ¿Existe? | Realidad |
|---|---|---|---|
| 1 | `sc/src/Escrow.sol` | ✅ | 538 líneas, contrato `Escrow` |
| 2 | `sc/script/Deploy.s.sol` | ✅ | 75 líneas, despliega 9 contratos |
| 3 | `sc/test/Escrow.t.sol` | ✅ | 16 `test` + 2 `testFuzz` |
| 4 | `web/app/page.tsx` | ✅ | Existe, pero es la **landing pública** de TrueKeate, no el panel "Escrow DApp" |
| 5 | `web/components/ConnectButton.tsx` | ❌ | Equivalente: `web/components/BotonConectarLogin.tsx` |
| 6 | `web/components/AddToken.tsx` | ❌ | No existe ni equivalente |
| 7 | `web/components/CreateOperation.tsx` | ❌ | Equivalente embebido: `PublicarOferta()` en `app/suite/dashboard/page.tsx:31` |
| 8 | `web/components/OperationsList.tsx` | ❌ | Equivalente embebido en cada pantalla de listado |
| 9 | `web/components/BalanceDebug.tsx` | ❌ | No existe ni equivalente |
| 10 | `web/lib/ethereum.tsx` | ✅ | 255 líneas, con `provider`, `signer`, `account` y auto-reconexión |
| 11 | `web/lib/contracts.ts` | ⚠️ | Existe con el nombre exacto, pero es **código muerto**: ningún archivo lo importa |
| 12 | `deploy.sh` | ⚠️ | Nombre distinto: `deploy-local.sh` / `.py` / `.ps1` + `sc/script/Deploy.s.sol` |
| 13 | `README_ESTUDIANTE.md` | ✅ | Presente en `RepoTecnico/` |

**Puntuación del bloque B: 8,5 / 13 = 65 %** (se cuentan ✅ = 1, ⚠️ = 0,5).

---

## 5. Bloque C — Stack tecnológico (15 %)

| # | Tecnología exigida | Estado | Evidencia |
|---|---|---|---|
| 1 | Solidity **0.8.13** | ✅ con matiz | `pragma solidity ^0.8.24` en los 11 archivos; `solc_version = "0.8.24"` en `sc/foundry.toml`. Misma familia 0.8, versión superior |
| 2 | Foundry | ✅ | `foundry.toml` con perfiles de fuzzing (256 runs) e invariantes (64 × 100) |
| 3 | OpenZeppelin | ✅ | v5.0.2 (`sc/lib/openzeppelin-contracts`); `Ownable`, `ReentrancyGuard`, `IERC20`, `SafeERC20`, `ERC20`, `ERC721`, `ERC721URIStorage`, `EIP712`, `ECDSA`, `MerkleProof` |
| 4 | Next.js **16** | ✅ | `next@16.3.4` fijo en `web/package.json` |
| 5 | TypeScript | ✅ | `typescript@5.9.3`, `strict: true` |
| 6 | Ethers.js **v6** | ✅ | `ethers@6.17.0` en web y backend |
| 7 | Tailwind CSS **v4** | ✅ | `tailwindcss@4.3.3`, `@tailwindcss/postcss`, tokens en `@theme` (`app/globals.css:42`) |
| 8 | MetaMask | ✅ | `window.ethereum` + descubrimiento **EIP-6963** en `web/lib/ethereum.tsx:60-75,126-138` |

**Puntuación del bloque C: 8 / 8 = 100 %.**

---

## 6. Bloque D — Fases 1 a 12 del proceso guiado (15 %)

| Fase | Qué pedía | Estado | Evidencia / motivo |
|---|---|---|---|
| 1 | Setup inicial (estructura de carpetas) | ✅ | `sc/`, `web/`, `backend/`, `scripts/` |
| 2 | Contrato `Escrow.sol` con 6 funciones y 4 eventos | ❌ | **Ninguna** de las 6 funciones ni de los 4 eventos existe con ese nombre; hereda `Ownable` y `ReentrancyGuard` como se pedía |
| 3 | `deploy.sh` con 6 pasos (desplegar, 2 ERC20, agregarlos, mint 1000 a 3 cuentas, actualizar `web/lib/contracts.ts`, generar `deployment-info.txt`) | ❌ | **Ningún script cumple los 6 pasos y los existentes están rotos.** `deploy.sh` no existe. `deploy-local.sh` invoca `MockERC20`, `UserRegistry`, `Exchange`, `Subscription`, `Governance`, `TruekeSBT`, `SBTRegistry`, `TruekeRWA` y `TruekeService` — **9 contratos que ya no existen** — y aborta en su línea 92 (`set -euo pipefail` + `pipefail` en el helper `deploy()`). El paso 3 llama a `addToken(address)`, que no existe. El paso 5 no lo hace ningún script. El único que despliega los contratos reales es `sc/script/Deploy.s.sol` (Escrow + TKA/TKB + 6 más), que no mintea ni registra nada |
| 4 | Setup base del frontend (Next 16, TS, ethers 6, Tailwind 4, provider Ethereum) | ✅ | `web/lib/ethereum.tsx` cumple todo lo pedido |
| 5 | `ConnectButton.tsx` | ⚠️ | Existe equivalente (`BotonConectarLogin.tsx`) con requisito extra de login por firma |
| 6 | `AddToken.tsx` | ❌ | No existe; no hay concepto de tokens permitidos |
| 7 | `CreateOperation.tsx` (approve + createOperation en un paso) | ⚠️ | El alta existe en `dashboard`/`mercado`, pero el navegador no ejecuta transacciones: firma y delega en el backend |
| 8 | `OperationsList.tsx` (listado, cancelar/completar, auto-refresh 5 s) | ⚠️ | Listados por pantalla, sin auto-refresh de 5 s (el único polling es de 30 s en la campana de notificaciones) |
| 9 | `BalanceDebug.tsx` | ❌ | No existe |
| 10 | Página principal con grid de 3 columnas | ⚠️ | Existe página principal, pero es una landing de producto |
| 11 | Manejo de errores robusto | ⚠️ | Arrays vacíos como fallback: ✅ en 12 puntos. Errores de MetaMask: ❌ no se trata el código 4001 ni se avisa al usuario |
| 12 | Testing end-to-end documentado | ✅ | 31 pruebas Playwright (62 ejecuciones en 2 dispositivos) + manuales de uso publicados |

**Puntuación del bloque D: 5,5 / 12 = 46 %.**

---

## 7. Bloque E — Las 10 "mejoras posibles" (10 %)

El enunciado cerraba con una lista de 10 mejoras deseables. El proyecto las abordó casi todas, pero con otro vocabulario.

| # | Mejora del enunciado | Estado | Evidencia |
|---|---|---|---|
| 1 | **Agregar fees** (comisión por swap) | ⚠️ **Parcial** | `FondoDeValor.sol` (99 líneas) existe y define **1 % de los trueques, 10 % de las suscripciones y 5 % de la emisión** de BRLT, pero el **1 % por trueque completado no se cobra** (`estado_proyecto.md:290-291`); `plan_desarrollo.md:259` lo declara "fuera de alcance / opcional" |
| 2 | **Expiración temporal** de operaciones | ⚠️ **Parcial** | Hay ventana de apertura de ±10 min (`Escrow.sol:33-35,294-311`), plazo de anulación de 5 días (`:133`), resolución por defecto (`:452`), timelock de sanciones de 6 h (`:134`) y cierre perezoso de subastas vencidas; **no hay TTL genérico de un trueke activo** |
| 3 | **Ofertas parciales** | ❌ No existe | Las cantidades del trueke son fijas; no hay ejecución parcial ni campo de cantidad parcial en `Escrow.sol` ni en `backend/api/routes/truekes.js` |
| 4 | **Sistema de reputación** con rating | ✅ Implementada | Valoración de 1 a 5 en 5 dimensiones (`marcarValoracionA/B`, `Escrow.sol:318-333`; tabla `valoraciones`), fórmula D12/D30 en `backend/api/lib/reputacion.js`, pantalla `/suite/perfil` |
| 5 | **Notificaciones** al completarse una operación | ⚠️ **Parcial** | Existe la infraestructura completa (router `/notificaciones`, 3 endpoints, `CampanaNotificaciones.tsx` con sondeo cada 30 s), pero **los únicos emisores son del motor de disputas**: no hay aviso "operación completada" |
| 6 | **Filtros y búsqueda** por token | ❌ No existe | El mercado se organiza por 4 categorías (ARTICULO/SERVICIO/BIEN/CRIPTO), pero no hay buscador ni filtro por token. La única búsqueda del sistema es de direcciones (Nominatim, en los mapas) |
| 7 | **Historial** de operaciones completadas/canceladas | ✅ Implementada | Pestañas Activos/Histórico en `/suite/intercambio` y Ofertados/Activos/Cerrados en `/suite/dashboard`, con etiqueta de resultado (`estado_proyecto.md:695-697`) |
| 8 | **Multi-chain** | ❌ No existe | Una sola red: chain **31337** (Anvil en Cloud Run). Sin `chainChanged` en la UI ni configuración multi-red |
| 9 | **Tests E2E** con Playwright o Cypress | ✅ Implementada | Playwright 1.62.1, 31 pruebas en 6 archivos, 62 ejecuciones (Chromium + Pixel 5), 99 aserciones |
| 10 | **Subgraph** (indexación con The Graph) | ❌ No existe, **por decisión** | `requerimientos.md:388` (D25) elige explícitamente "listener en Node.js propio — no The Graph"; la indexación la hace `backend/indexador.js` sobre PostgreSQL |

**Puntuación del bloque E: 4,5 / 10 = 45 %.**

---

## 8. Bloque F — Calidad y verificación (15 %)

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Pruebas de contrato (el enunciado pedía "happy path, reverts, edge cases") | ✅ Excedido | **84 pruebas**: 75 `test`, 4 `testFuzz` (256 runs) y 5 `invariant` (64 runs × 100 depth) en 1.629 líneas |
| 2 | Pruebas end-to-end | ✅ Excedido | 31 pruebas Playwright que simulan MetaMask y el backend con `addInitScript` |
| 3 | Pruebas de backend | ⚠️ Parcial | 51 pruebas con `node --test` en 9 archivos; `npm test` ejecuta 28 y **pasa 28/28**, pero la suite completa da **47 correctas y 4 en rojo** (disputas y subastas). `node --test test/` —el comando que documenta el README— **falla** |
| 4 | Pruebas unitarias de frontend | ❌ | No existe `web/test/`, ni runner (`vitest`/`jest`), ni script `npm test` en `web/` |
| 5 | Despliegue reproducible de un solo paso | ⚠️ Parcial | `sc/script/Deploy.s.sol` despliega los contratos reales y `deploy-local.*` existe en 3 lenguajes, **pero los scripts están rotos** (referencian 9 contratos inexistentes y abortan); `deploy-gcp.sh` no puede completarse (le faltan `web/Dockerfile.indexer`, `web/.env.gcp` y `web/scripts/setup-gcp-db.mjs`). El despliegue real en GCP se hizo **a mano** con `gcloud` y configs en `/tmp` |
| 6 | Registro de direcciones desplegadas | ⚠️ Parcial | `deployment-info.txt` (86 líneas) existe pero es un **fósil**: lista 8 contratos que ya no existen, no está versionado (`.gitignore:5`) y lo generan solo `.py`/`.ps1` (que también están rotos); `deploy-local.sh` no lo genera; `deployment-info-gcp.txt` no existe |
| 7 | Documentación técnica y de usuario | ✅ Excedido | 15.372 líneas en `RepoTecnico/`, 8 temas de manuales, 29 PDF y una biblioteca de ayuda navegable en `/help/manual` |
| 8 | Evidencia de funcionamiento real | ✅ | Servicios desplegados en Cloud Run (`truekeate-web` rev. `00028-mwk`, `truekeate-api` rev. `00022-s24`, `mcc-foundry-anvil`, `mcc-pgadmin`) y contratos con ABI en `backend/contratos.json`. **Evidencia documental del propio repositorio**: no se comprobó en vivo durante esta auditoría |

**Puntuación del bloque F: 6 / 8 = 75 %.**

> **Límite de verificación:** este informe es una auditoría **estática** sobre los contratos, el frontend y la documentación; **no** se ejecutaron `forge test`, `npm test` ni `npx playwright test`. La única suite que sí se ejecutó durante la revisión fue la del backend (`node --test`), y su resultado real es el que figura en el criterio 3. Las cifras verdes que cita la documentación del proyecto ("backend 28/28", "62/62", "80/80") **no** fueron reproducidas en su totalidad y en el caso del backend están desactualizadas.

---

## 9. Estándares de contrato implementados

Inventario verificado sobre `sc/src` (no se audita la librería de OpenZeppelin, solo su uso).

| Estándar / EIP | ¿Implementado? | Evidencia |
|---|---|---|
| **ERC-20** | ✅ | `BRLT is ERC20` (`BRLT.sol:21`), `mocks/TrueKeateToken is ERC20` (`:9`), `IERC20` en Escrow, FondoDeValor, SociosRegistry, SuscripcionEmpresa |
| **ERC-721** | ✅ | `TrueKeateNFT is ERC721` (`TrueKeateNFT.sol:21`), `TrueKeateSBT is ERC721` (`TrueKeateSBT.sol:23`); `IERC721.transferFrom` en `Escrow.sol:522,533` |
| **ERC-721URIStorage** | ✅ | `TrueKeateNFT.sol:5,21,74,102-109` |
| **ERC-165** | ✅ | `supportsInterface` sobrescrito en `TrueKeateNFT.sol:111` y `TrueKeateSBT.sol:80` |
| **ERC-5192 (Soulbound)** | ✅ | `locked()` siempre `true` (`TrueKeateSBT.sol:75-78`), `interfaceId == 0xb45a3c0e` (`:81`), `event Locked` (`:35`, emitido en `:66`) |
| **EIP-712 (firmas tipadas)** | ✅ | `SmartAccount is EIP712` (`:24`), typehashes `Execute(...)` y `CambiarEstadoVerificacion(...)` (`:39-42`), `_hashTypedDataV4` (`:228,234`) |
| **EIP-191** | ⚠️ indirecto | Solo el prefijo `\x19\x01` que aporta el dominio EIP-712; **no** hay `personal_sign` on-chain. (El login del navegador sí usa firma EIP-191, pero se valida en el backend, no en el contrato) |
| **CREATE2** | ✅ | `SmartAccountFactory.sol:29-32` con `salt = keccak256(owner, root)` y predicción en `:38-53` |
| **ERC-1155** | ❌ | 0 ocurrencias en `sc/` |
| **ERC-2981 (royalties)** | ❌ | Sin `royaltyInfo`; los NFTs no pagan regalías |
| **ERC-1271 (firma de contrato)** | ❌ | Sin `isValidSignature`; la smart account solo valida ECDSA de EOA |
| **ERC-2771 (meta-tx por forwarder)** | ❌ | Sin `ERC2771Context` ni `trustedForwarder` |
| **ERC-4337 (account abstraction)** | ❌ | Sin `EntryPoint`/`UserOperation`; el propio código lo declara "inspirado, sin EntryPoint estándar (D35)" (`SmartAccount.sol:11`) |
| **UUPS / proxies / upgradeability** | ❌ | Despliegue directo con `new` (`Deploy.s.sol:34-51`); contratos inmutables |
| **Pausable / circuit breaker** | ❌ | 0 ocurrencias de `Pausable`/`whenNotPaused` |

**Contraste con el enunciado:** pedía `Ownable`, `ReentrancyGuard` e `IERC20`. Los tres están presentes, y el proyecto añade 6 estándares más, de los cuales **ERC-5192** y **EIP-712** son los más relevantes técnicamente.

**Patrones de seguridad observados:** `ReentrancyGuard` con 10 usos en `Escrow` y 2 en `SmartAccount`; `SafeERC20` en Escrow, FondoDeValor y SuscripcionEmpresa; orden checks-effects-interactions correcto en `_intentarCompletar` (`Escrow.sol:364-372`) y en el incremento de nonce previo al `call` (`SmartAccount.sol:122`); límites temporales explícitos (ventana de apertura 10 min, plazo de anulación 5 días, timelock de sanciones 6 h, timelock de recuperación 48 h) y quórum de socios 2/3.

---

## 10. Arquitectura real del frontend (contraste con el enunciado)

El enunciado describía un frontend que habla **directamente** con el contrato usando ethers. El frontend real hace lo contrario: **el navegador nunca crea un contrato ni envía una transacción**.

| Aspecto | Enunciado | Realidad |
|---|---|---|
| Comunicación con la cadena | `new Contract(...)` con ethers en el navegador | **Cero** `new Contract` en `web/`. El navegador habla con la API propia (`web/lib/api.ts`, 797 líneas, 66 funciones, 62 rutas) |
| Uso de ethers | Firmar y enviar transacciones | **Solo firma**: `BrowserProvider` + `eth_requestAccounts` + `signMessage`. Sin `sendTransaction` ni `writeContract` |
| Lectura de balances | `balanceOf` / `getBalance` en el panel de debug | **Cero** lecturas de balance en el navegador; se resuelven con `cast` fuera de la app |
| ABIs y direcciones | `lib/contracts.ts` usado por los componentes | Existe con 6 ABIs en `web/lib/abis/` y 5 direcciones, pero **ningún archivo lo importa**: es código muerto |
| Identidad | Conectar MetaMask y listo | Escalera D28 de 3 estados (INSCRITO → VERIFICADO → CERTIFICADO) + login por firma EIP-191 contra el backend + **firma por acción** con `ts` canónico en 13 puntos de la UI |
| Sesión | No aplicaba | Token Bearer en `localStorage["truekeate.token"]` |

**Propósito real de `web/lib/ethereum.tsx`** (255 líneas): gestionar la wallet como **identidad**, no como canal de escritura. Incluye descubrimiento **EIP-6963** (`:60-75`, `:126-138`), auto-reconexión al refrescar (`:140-154`), revocación de permisos al desconectar (`:208-227`) y deep link a MetaMask móvil (`:202-206`).

**Carencias técnicas detectadas en esta capa:**

1. **No se escucha `chainChanged`** ni se valida el `chainId`: la app nunca comprueba que la wallet esté en la chain 31337 ni ofrece cambiarla (`wallet_switchEthereumChain` ausente).
2. **El rechazo del usuario en MetaMask (código 4001) no produce ningún mensaje**: `conectar()` solo hace `console.error` y devuelve `null` (`ethereum.tsx:193-195`).
3. **No hay pruebas unitarias ni de componentes**: no existe `web/test/`, no hay `vitest`/`jest`/`@testing-library` y no hay script `npm test`. La única suite es E2E con Playwright.
4. **`web/lib/contracts.ts` es código muerto** y su comentario afirma algo falso ("`cargarAbis()` se invoca al arrancar la app (ver layout)"; `app/layout.tsx` no lo llama).
5. **La PWA es instalable pero no tiene service worker**: hay `manifest.json`, pero ni `sw.js`, ni `navigator.serviceWorker`, ni `next-pwa`/`workbox`; sin caché offline.
6. **El `README.md` de `web/` está desactualizado** (habla de "9 páginas estáticas" cuando hay 16 y su árbol de componentes está incompleto).

---

## 11. Nuevas funciones incorporadas (más allá del enunciado)

El enunciado pedía 5 funciones. El proyecto entrega **cuatro capas completas** sobre esas 5.

### 11.1 Capa de contratos — de 1 contrato a 9

| Contrato | Líneas | Función nueva respecto al enunciado |
|---|---:|---|
| `Escrow.sol` | 538 | Máquina de **9 estados** (no un booleano activo/cerrado): custodia dual de activos, **ventana de apertura ±10 min** para evitar front-running, valoraciones de cierre, **disputa con votación de socios (quórum 2/3)**, cancelación, resolución por defecto a los 5 días, bloqueo por el owner y **sanción con timelock de 6 h**. Soporta ERC-20 **y** ERC-721 (exige el NFT oficial) |
| `SmartAccount.sol` | 264 | **Meta-transacciones EIP-712** con relayer propio y nonce anti-replay; **escalera KYC anclada por raíz de Merkle**; **recuperación social 2 de 3 guardianes con timelock de 48 h** |
| `SmartAccountFactory.sol` | 54 | Despliegue **CREATE2 determinista** (una cuenta por owner) con predicción de dirección |
| `SociosRegistry.sol` | 203 | **Padrón de socios** y propuestas económicas con quórum ≥ 2/3 |
| `BRLT.sol` | 111 | **Stablecoin** con emisión restringida al registry, **tope de 1.000.000** y 5 % derivado al fondo |
| `FondoDeValor.sol` | 99 | **Tesorería de la plataforma**: 1 % trueques, 10 % suscripciones, 5 % emisión |
| `SuscripcionEmpresa.sol` | 158 | **Suscripción de empresa**: 100 BRLT / 30 días con staking bloqueado |
| `TrueKeateNFT.sol` | 119 | **NFT de inventario** con 4 categorías validadas (ARTICULO / SERVICIO / BIEN / CRIPTO) |
| `TrueKeateSBT.sol` | 95 | **Credencial soulbound ERC-5192** (1 por wallet) como certificación de identidad |
| `mocks/` | 33 | `TrueKeateToken` (ERC-20) y `TrueKeateNFT` (ERC-721) para pruebas |

### 11.2 Capa de backend y datos (inexistente en el enunciado)

| Función nueva | Detalle |
|---|---|
| **Indexador de eventos propio** | `backend/indexador.js` escucha los eventos on-chain con ethers y los proyecta en PostgreSQL, con checkpoint de reanudación (`indexador_checkpoint`) |
| **Relayer EIP-712 sin gas** | `backend/relayer.js` firma meta-transacciones para que el usuario no pague gas |
| **API REST propia** | **76 endpoints** en 13 routers: `auth`, `kyc`, `catalog`, `truekes`, `admin`, `reputacion`, `subastas`, `finanzas`, `valor`, `disputas`, `notificaciones`, `gobernanza`, `puntos-encuentro` |
| **Base de datos relacional** | PostgreSQL 15 (Cloud SQL) con extensiones **PostGIS** y **pgcrypto**; **19 tablas** en `schema.sql` + 2 creadas por las 5 migraciones versionadas (`backend/db/migracion_*.sql`) |
| **Autenticación criptográfica** | Login por firma EIP-191 (`"TrueKeate: iniciar sesión"`) → token Bearer; **firma por acción** con marca de tiempo anti-replay (`"TrueKeate: <acción> (ts=…)"`) validada en el servidor, usada en 13 puntos de la UI |
| **Relayer con protecciones** | Cuota de 20 meta-tx por usuario y día, bloqueo de 1 h tras 3 fallos en 10 min, allowlist on-chain (solo estados VERIFICADO/CERTIFICADO), tope de gas y health-check con alerta de saldo bajo |
| **Pagos fiat** | Stripe Checkout alojado + webhook de confirmación para la compra de BRLT (`POST /valor/brlt/checkout`, `POST /valor/brlt/webhook`) |
| **Geolocalización** | Puntos de encuentro con PostGIS (radio ≤ 10 km), favoritos y reglas de quién puede proponer |
| **Motor de disputas** | Flujo REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA, con evidencias fotográficas protegidas por token y votación de socios |
| **Endurecimiento** | `express-rate-limit`, CORS por lista blanca, límite de cuerpo de 12 MB, manejador central de errores |
| **Subastas** | Creación por Empresa, pujas de usuarios Certificados y cierre con desempate por nivel (RF-17) |

### 11.3 Capa de frontend

| Función nueva | Detalle |
|---|---|
| **16 pantallas** frente a la "página principal con 3 columnas" | Escalera de identidad (inscripción, verificación, certificación), dashboard, mercado, intercambio, disputas, subastas, inventario, perfil, valor, gobernanza, administración y biblioteca de manuales |
| **Escalera de acceso D28** | Tres estados con guardas por URL (`SuiteGuard`), incluyendo protección probada por E2E sobre `/suite/admin` |
| **PWA instalable** | `manifest.json` con `display: standalone` y `start_url: /suite/dashboard` (D40). Sin service worker |
| **Mapas** | Leaflet + tiles OpenStreetMap + geocodificación Nominatim para fijar el punto de encuentro |
| **Subida y protección de imágenes** | DNI/selfie para KYC, 1–5 imágenes por artículo, evidencias de disputa leídas con `Authorization: Bearer` |
| **Sistema de diseño propio** | Tokens en `@theme` (navy/teal/cyan/gold), utilidades y componentes (`Button`, `Card`, `StatusBadge`) — RNF-08 "Bóveda Digital Moderna" |
| **Navegación por rol** | Matriz única de secciones (`lib/navegacion.ts`) que filtra la barra superior (PC) y la inferior flotante (móvil) |

### 11.4 Capa de operación y nube

| Función nueva | Detalle |
|---|---|
| **Despliegue en Google Cloud** | Cloud Run para `truekeate-web`, `truekeate-api`, el nodo `mcc-foundry-anvil` y `mcc-pgadmin`; Cloud SQL PostgreSQL 15; Secret Manager; Artifact Registry y Cloud Build. ⚠️ **El despliegue real se hizo a mano** con `gcloud` y configs en `/tmp`; `deploy-gcp.sh` existe pero no puede completarse hoy (ver §13) |
| **Automatización multiplataforma** | `deploy-local.sh` / `.py` / `.ps1`, `setup.sh`, arranque/parada de servicios y `verify-setup.sh`. ⚠️ **Los scripts están desincronizados del código**: invocan 9 contratos que ya no existen y abortan; `verify-setup.sh` consulta funciones inexistentes |
| **Inyección de datos operativos** | `scripts/inyectar_datos_operativos.mjs` (37 KB) con control de confirmación interactiva |
| **Generación documental** | `scripts/generate_manuals_pdf.py` (16 KB) produce los PDF de los manuales; `web/scripts/generar-pdfs.mjs` (729 líneas) los renderiza con Chromium |
| **Reinicio controlado de la plataforma** | `backend/scripts/reiniciar-plataforma.mjs` conservando contratos, extensiones y esquema. ⚠️ No limpia 5 de las tablas existentes |

### 11.5 Documentación y gobernanza del proyecto

19 módulos de requisitos funcionales (93 sub-requisitos), 8 categorías no funcionales (29 sub-requisitos), **41 decisiones de diseño (D1–D41)**, **31 casos de uso (CU-01…CU-31)** con 170 criterios testeables Gherkin/EARS, informes de auditoría (48 hallazgos: 5 críticos, 24 altos, 17 medios, 2 bajos), 8 temas de manuales con 29 PDF y una biblioteca de ayuda navegable dentro de la aplicación.

---

## 12. Tecnologías incorporadas

Comparativa entre lo exigido y lo realmente presente.

| Capa | Tecnología | Versión real | Estado frente al enunciado |
|---|---|---|---|
| Contratos | Solidity | `^0.8.24` (`solc 0.8.24`) | ✅ (el enunciado decía 0.8.13) |
| Contratos | Foundry (forge / anvil / cast) | perfil `default` con fuzzing e invariantes | ✅ |
| Contratos | OpenZeppelin Contracts | **5.0.2** | ✅ |
| Contratos | forge-std | **1.9.4** | ➕ nuevo |
| Frontend | Next.js | **16.3.4** | ✅ |
| Frontend | React | **19.2.8** | ➕ nuevo (implícito en Next 16) |
| Frontend | TypeScript | **5.9.3** (`strict`) | ✅ |
| Frontend | Tailwind CSS | **4.3.3** (`@theme`) | ✅ |
| Frontend | ethers.js | **6.17.0** | ✅ |
| Frontend | Leaflet + OpenStreetMap + Nominatim | 1.9.4 | ➕ nuevo |
| Frontend | Playwright | **1.62.1** (Chromium + Pixel 5) | ➕ nuevo (el enunciado lo listaba como mejora) |
| Backend | Node.js | imagen `node:22-bookworm-slim` | ➕ nuevo |
| Backend | Express | **5.2.1** | ➕ nuevo |
| Backend | pg | **8.23.0** | ➕ nuevo |
| Backend | express-rate-limit / supertest | 8.7.0 / 7.2.2 | ➕ nuevo |
| Backend | `node --test` (runner nativo) | — | ➕ nuevo |
| Backend | Stripe | **22.6.1** (Checkout + webhook) | ➕ nuevo |
| Datos | PostgreSQL + PostGIS + pgcrypto | 21 tablas, 6 migraciones | ➕ nuevo |
| Infra | Docker | `web/Dockerfile`, `backend/Dockerfile` (multi-stage) | ➕ nuevo |
| Infra | Google Cloud | Cloud Run, Cloud SQL, Secret Manager, Artifact Registry, Cloud Build | ➕ nuevo |
| Wallet | MetaMask + EIP-6963 | `window.ethereum` con descubrimiento de proveedores | ✅ (sin MetaMask SDK) |
| Estándares | EIP-712, EIP-191, ERC-5192, ERC-165, CREATE2 | — | ➕ nuevos |
| Repos | Git con 3 remotos (GitHub, GitLab.com, codecrypto) | ramas `main`, `escrow-dsh-GCP`, `escrow-Antigravity`, `escrow-deepseek` | ➕ nuevo |

**Resumen:** de las 8 tecnologías exigidas, **8 están presentes** (una con versión distinta: Solidity) y se incorporan **más de 15 tecnologías adicionales**, la mayoría concentradas en backend, datos e infraestructura, que el enunciado no contemplaba.

---

## 13. Documentación, trazabilidad e inconsistencias

El proyecto documenta su propio alcance con un detalle que excede cualquier expectativa del enunciado, pero esa misma extensión genera contradicciones internas que conviene registrar.

**Cifras que la documentación declara y no cuadran entre sí** (las dos fuentes enfrentadas):

| # | Afirmación | Fuente A | Fuente B |
|---|---|---|---|
| 1 | Pruebas de backend | 27/27 (`estado_proyecto.md:23`) | 26/26 (`:195`), 44/44 (`:457`), 50 con 47 OK (`plan_desarrollo.md:230`) |
| 2 | Pruebas de Foundry | ~80/80 (`estado_proyecto.md:23`) | 62/62 (`:193`), 79 + 5 invariantes (`plan_desarrollo.md:229`) |
| 3 | Pruebas E2E | 21 (`estado_proyecto.md:23`) | 18/18 (`:196`), 47 con 3 omitidas (`:457`) |
| 4 | Estados del escrow | 9 (`diccionario_datos.md:25`) | 10 con PROPUESTO (`:180`) |
| 5 | Tablas PostgreSQL | 14 tablas (`estado_proyecto.md:334`) | 21 tablas / 11 ENUM (`diccionario_datos.md:8,43`) |
| 6 | Manuales entregados | 16 técnicos, 16 literales, 16 PDF (`estado_proyecto.md:214-217`) | 27, 27 y 27 (`:587-589`) |
| 7 | Pantalla de subastas | "sin pantalla" (`estado_proyecto.md:296`) | "nueva página verificada en vivo" (`:772-786`) |
| 8 | Cobertura del Escrow | 94,96 % (`:319`) | 95,19 % (`:197`) |
| 9 | Numeración de requisitos | `RF-03.4` (`requerimientos.md:56`) | salta a `RF-03.6` (`:57`); **no existe `RF-03.5`** |

**Conteos propios sobre el repositorio** (verificación independiente): `requerimientos.md` contiene **110 códigos RF únicos** y **37 códigos RNF únicos**, mientras la propia documentación resume "19 módulos / 93 sub-requisitos" y "8 categorías / 29 sub-requisitos"; la diferencia proviene del criterio de agrupación, pero conviene unificarlo. En el código hay **75 funciones `test`** (no 79 ni 80: los otros 4 son `testFuzz`), **51 pruebas de backend** de las cuales el script `npm test` ejecuta **28**, y **31 pruebas E2E** (las cifras de la documentación, 21/18/47, corresponden a hitos anteriores).

**Riesgos técnicos concretos detectados en los contratos** (auditoría estática):

1. `Escrow._esQuorum` ignora los votos en contra y compara solo `aFavor*3 >= totalSocios*2`: con un padrón pequeño las abstenciones cuentan como rechazo, y `removerSocio` durante una votación mueve el umbral.
2. `Escrow.votarSocio` revierte con `QuorumNoAlcanzado` cuando el socio ya votó: error semánticamente incorrecto.
3. `marcarValoracionA/B` no llevan `nonReentrant` ni validan el estado: pueden marcarse en CREADO, BLOQUEADO o ANULADO.
4. `SmartAccountFactory` no tiene control de acceso: cualquiera puede desplegar la cuenta de otro owner fijando un `rootInicial` arbitrario y tomando el registro.
5. `SmartAccount.proponerRecuperacion`: mientras no hay aprobación, un segundo guardián puede cambiar el destinatario y la aprobación previa se reatribuye.
6. `SuscripcionEmpresa.cancelarSuscripcion` devuelve el importe completo del plan tras ciclos ya cobrados, y el neto acumulado no tiene función de retiro.
7. `TrueKeateSBT`: la transferencia está bloqueada, pero el `burn` heredado de OZ v5 sigue accesible al titular y no limpia `sbtDe`, de modo que el SBT puede quemarse y nunca re-mintearse.
8. No hay `Pausable`, ni `Ownable2Step`, ni mecanismo de actualización: no existe interruptor de emergencia.

**Riesgos de despliegue, backend y datos** (auditoría de la capa de operación):

| # | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| 1 | 🔴 Crítica | **Los scripts de despliegue son código muerto.** `deploy-local.sh` invoca 9 contratos que ya no existen y aborta en su línea 92; lo mismo ocurre en `.py` y `.ps1` (`MockERC20` no existe) | `deploy-local.sh:92-105`; `grep` de declaraciones en `sc/src/` |
| 2 | 🔴 Crítica | **`addToken(address)` no existe** en el Escrow real: el paso 3 del despliegue pedido es inejecutable con el contrato actual | `deploy-local.sh:130` vs `sc/src/Escrow.sol:141,147,192` |
| 3 | 🔴 Crítica | **Desalineación de nombres de variable de entorno** que rompe la inyección de direcciones: los scripts escriben `NEXT_PUBLIC_ESCROW_ADDRESS` y el frontend lee `NEXT_PUBLIC_ESCROW`. **Cero coincidencias**; el mismo error se repite en los `--build-arg` de Cloud Build, que el `Dockerfile` no consume | `deploy-local.sh:203-223` vs `web/lib/contracts.ts:21-30`; `scripts/cloudbuild.yaml:14-44` vs `web/Dockerfile:18-25` |
| 4 | 🟠 Alta | **`deploy-gcp.sh` no puede completarse**: `scripts/cloudbuild-indexer.yaml:12` apunta a `web/Dockerfile.indexer` (inexistente); faltan `web/.env.gcp` y `.env.gcp.example`; el paso de PostGIS invoca `web/scripts/setup-gcp-db.mjs` (inexistente). Tampoco hay script de despliegue para la API | `ls` de los 4 archivos → no existen |
| 5 | 🟠 Alta | **El despliegue real en GCP fue manual**: `gcloud builds submit --config /tmp/cb-backend.yaml` y `/tmp/cb-web.yaml`, con configs **fuera del repositorio**. No hay `deployment-info-gcp.txt` ni archivo de estado | `RepoTecnico/entornos_globales.md:165-190` |
| 6 | 🟠 Alta | **No hay `cloudbuild` para el backend** ni forma automatizada de desplegar la API, que es el servicio del que depende todo el frontend | ausencia verificada |
| 7 | 🟡 Media | **La suite de backend tiene 4 pruebas en rojo** (subastas y disputas) y el README declara cifras obsoletas ("5/5", "19/19") frente a las 28 de `npm test` y las 51 reales. `node --test test/`, el comando documentado, **falla** | ejecución verificada; `backend/README.md:52,98` |
| 8 | 🟡 Media | **`verify-setup.sh` consulta funciones inexistentes** (`getAllowedTokensCount()`, `arbiter()`): la verificación de entorno nunca puede pasar | `verify-setup.sh:64-65` |
| 9 | 🟡 Media | **`nodemailer` se importa pero no está declarado ni instalado**: el envío de códigos KYC por correo **nunca funciona** (siempre modo demo con el código en pantalla) | `backend/api/routes/kyc.js:50`; `backend/package.json` |
| 10 | 🟡 Media | **El estado del relayer vive en memoria** (nonces, cuota diaria, bloqueos): se pierde al reiniciar y **no se comparte entre instancias de Cloud Run**, aunque el comentario afirma que se persiste en PostgreSQL | `backend/relayer.js:31-32,43` |
| 11 | 🟡 Media | **El README afirma rate-limiting "global y por usuario"**, pero solo existe el global (120 req/min) | `grep -rn "rateLimit" backend/api/` → 1 sola llamada |
| 12 | 🟡 Media | **`deploy-gcp.sh` verifica `/api/stats`**, endpoint que no existe en ningún lugar del repositorio (no hay `web/app/api/`) | `grep -rn "api/stats"` → sin resultados |
| 13 | 🟡 Media | **El reinicio de plataforma no limpia 5 tablas** (`puntos_favoritos`, `evidencias_disputa`, `votos_disputa`, `notificaciones`, `sesiones`) y la documentación dice "14 tablas" cuando el esquema define 19 y las migraciones suman 21 | `backend/scripts/reiniciar-plataforma.mjs:20-35` vs `backend/db/schema.sql` |
| 14 | 🟡 Media | **`start-services.ps1` arranca `web/scripts/indexer.mjs`, que no existe** (el indexador vive en `backend/`); el proceso de parada busca ese mismo archivo | `start-services.ps1:139`; `ls web/scripts/` |
| 15 | 🟢 Baja | **IPFS no está implementado**: solo existe la columna `ipfs_cid` y menciones en manuales, pese a figurar como decisión D23 y requisito RF-11.2 | `grep -rniE "ipfs\|pinata" backend/` → esquema y JSDoc |
| 16 | 🟢 Baja | **Residuos de arquitecturas anteriores**: `data/truekeate.db` es una base **SQLite** con 16 tablas que el backend actual no usa; `web/lib/abis/` y `web/lib/contracts.ts` no se consumen; `deployment-info.txt` lista contratos que ya no existen | `data/truekeate.db`; `.gitignore:19` |
| 17 | 🟢 Baja | **`deployment-info.txt` contiene las 10 claves privadas de Anvil en claro** (no versionado, pero presente en el árbol de trabajo); `deploy-local.sh:220` asigna al relayer la clave de la cuenta 0 cuando la documentación y el código dicen cuenta 1 | `deployment-info.txt:28-85`; `backend/relayer.js:6` |

---

## 14. Veredicto final

### 14.1 Puntuación por bloque

| Bloque | Peso | Puntos | Porcentaje | Lectura |
|---|---:|---:|---:|---|
| A. Funcionalidades principales | 25 % | 16 / 25 | **64 %** | 3 de 5 capacidades cumplidas y superadas; 2 ausentes |
| B. Estructura de archivos | 20 % | 8,5 / 13 | **65 %** | Los archivos de contratos y librerías existen; los 5 componentes no |
| C. Stack tecnológico | 15 % | 8 / 8 | **100 %** | Todo el stack pedido está presente y actualizado |
| D. Fases 1–12 | 15 % | 5,5 / 12 | **46 %** | Las fases de infraestructura sí; las de componentes y despliegue literal, no |
| E. Mejoras posibles | 10 % | 4,5 / 10 | **45 %** | 3 implementadas, 3 parciales, 4 ausentes |
| F. Calidad y verificación | 15 % | 6 / 8 | **75 %** | Pruebas de contrato y documentación muy por encima de lo pedido; despliegue y frontend, por debajo |
| **TOTAL PONDERADO** | **100 %** | — | **≈ 67 %** | |

### 14.2 Las tres cifras que resumen el proyecto

- **67 %** de cumplimiento global ponderado frente al enunciado.
- **27 %** de coincidencia literal en nombres (6 de 22 artefactos nombrados).
- **100 %** del stack tecnológico exigido y **más de 15 tecnologías adicionales**.

El desglose revela un patrón claro: **el proyecto brilla donde el enunciado pedía poco** (stack tecnológico, pruebas, documentación, despliegue en nube) y **falla donde el enunciado pedía algo literal o de fontanería** (nombres de componentes, allowlist de tokens, script de despliegue de un paso, inyección de direcciones).

### 14.3 Por qué el número es 67 % y no 100 %

El proyecto no suspendió por falta de trabajo, sino por **cambio de alcance**: se construyó un producto real en lugar de la práctica guiada. Además, la capa de despliegue quedó **desincronizada del código**: los scripts siguen apuntando a una generación anterior de contratos, de modo que la reproducibilidad —que el enunciado pedía explícitamente— hoy no se sostiene.

Las carencias que explican la diferencia son concretas y acotadas:

| Carencia | Coste de resolverla | Valor |
|---|---|---|
| **Reparar los scripts de despliegue** (9 contratos inexistentes, `addToken`, nombres de variable) | Medio: reescribir la lista de contratos y unificar los nombres `NEXT_PUBLIC_*` | Recupera la fase 3 y sube los bloques D y F |
| **Bootstrap de GCP faltante** (`Dockerfile.indexer`, `.env.gcp`, `setup-gcp-db.mjs`) | Bajo: crear los 3 archivos o eliminar las referencias | Hace ejecutable `deploy-gcp.sh` |
| Allowlist de tokens (`addToken`) | Bajo: un `mapping` + `onlyOwner` en `Escrow` | Cierra el requisito 1 del bloque A |
| Panel `BalanceDebug` | Bajo: un componente con `provider.getBalance` y `balanceOf` | Cierra el requisito 5 del bloque A y la fase 9 |
| Ofertas parciales | Medio: cambia el modelo de datos del trueke | Mejora opcional 3 |
| Filtros y búsqueda por token | Bajo: endpoint con `ILIKE` + caja de búsqueda | Mejora opcional 6 |
| Pruebas unitarias de frontend | Medio: añadir `vitest` + `@testing-library` y un script `npm test` | Sube el bloque F |
| Arreglar las 4 pruebas de backend en rojo | Medio: son regresiones de subastas y disputas | Sube el bloque F y evita deuda oculta |
| Manejo del rechazo de MetaMask (4001) y `chainChanged` | Bajo: dos bloques `try/catch` y un listener | Cierra dos riesgos reales de UX |
| Reconciliar las cifras contradictorias de la documentación | Bajo: unificar criterio y regenerar los informes | Elimina 9 inconsistencias verificadas |

### 14.4 Recomendaciones priorizadas

1. **Reparar la cadena de despliegue antes que nada**: mientras `deploy-local.sh` invoque contratos que no existen, el proyecto no es reproducible desde cero. Es el hallazgo de mayor severidad de todo el informe.
2. **Unificar la inyección de direcciones**: un solo juego de nombres `NEXT_PUBLIC_*` compartido por los scripts, el `Dockerfile`, Cloud Build y `web/lib/contracts.ts`. Hoy hay tres convenciones distintas y ninguna conecta.
3. **Cerrar los riesgos de gobernanza de la §13** (quórum del Escrow, control de acceso de `SmartAccountFactory`, recuperación social, `SuscripcionEmpresa`) antes de cualquier auditoría externa: son fallos de seguridad, no de estilo.
4. **Decidir qué es este repositorio**: si la entrega evaluada es la práctica `90_escrow`, conviene un documento que mapee cada requisito del enunciado a su equivalente TrueKeate (este informe sirve de base) y añadir los dos artefactos baratos que faltan (allowlist y panel de balances).
5. **Alinear la documentación con la realidad**: 4 pruebas en rojo, 3 archivos referenciados que no existen, cifras de tests contradictorias en 6 documentos y `README.md` que afirma funciones inexistentes. Un proyecto con este nivel de documentación merece que sus números sean ciertos.
6. **Borrar o conectar el código muerto**: `web/lib/contracts.ts`, `web/lib/abis/`, `data/truekeate.db` (SQLite), `deployment-info.txt` fósil y las ramas de los scripts que apuntan a la generación anterior.
7. **Añadir pruebas unitarias de frontend y el manejo del error 4001**, que son las dos deudas técnicas con impacto directo en el usuario.

---

## 15. Reparaciones aplicadas después de la auditoría

> **Fecha:** 11 de septiembre de 2026. Este apartado documenta los cambios hechos **después** del corte auditado (`1ea7085`); el resto del informe describe ese commit y no se modifica.

Se atacó primero el hallazgo crítico (§13, riesgo 1): la cadena de despliegue desincronizada.

| Archivo | Cambio | Verificación |
|---|---|---|
| `deploy-local.sh` | **Reescrito** sobre la arquitectura real. Ahora invoca `sc/script/Deploy.s.sol` como única fuente de verdad del despliegue y del cableado, lee las direcciones del broadcast de Foundry con `jq`, despliega el `TrueKeateSBT` con su minter, concede el rol de minter del NFT y del SBT a la cuenta del relayer, vincula el padrón de socios al Escrow, mintea 1000 TKA y 1000 TKB a las 10 cuentas, y escribe `web/.env.local` y `deployment-info.txt` con los **nombres de variable correctos**. Elimina las llamadas a `addToken`/`setArbiter`/`setUserRegistry` (inexistentes) y la matriz de roles on-chain (hoy vive en el backend). Añade `~/.foundry/bin` al `PATH` y verifica cada dirección antes de continuar. | ✅ **Ejecutado de extremo a extremo** contra un Anvil temporal aislado (puerto 8546): exit 0, 9 contratos con bytecode verificado con `cast code`, `owner()`, `trueKeateNft()`, `sociosRegistry()`, `minter()` del NFT y del SBT, y saldo de 1000e18 TKA comprobados on-chain |
| `verify-setup.sh` | **Reescrito**: consultaba `getAllowedTokensCount()` y `arbiter()`, que no existen. Ahora comprueba `owner()`, `trueKeateNft()`, `sociosRegistry()`, `siguienteId()`, los minters y el saldo de un token, acumula fallos y devuelve código de salida coherente. Acepta el nombre nuevo y el antiguo de la variable del Escrow. | ✅ Ejecutado contra el Anvil temporal: salida correcta, exit 0 |
| `web/Dockerfile` | Las 5 direcciones pasan de `ENV` fijo a `ARG` + `ENV`, de modo que los `--build-arg` del build **sí** llegan al bundle. Se añaden `NEXT_PUBLIC_CHAIN_ID` y `NEXT_PUBLIC_RPC_URL` con los mismos nombres que genera `deploy-local.sh`. | ⚠️ Validado por inspección; **no** se construyó la imagen (no hay Docker en el entorno de auditoría) |
| `scripts/cloudbuild.yaml` | Los `--build-arg` usaban `NEXT_PUBLIC_*_ADDRESS`, que no correspondían a ningún `ARG` del `Dockerfile` (solo producían avisos y el valor se perdía). Se alinean los 8 nombres con el `Dockerfile` y se añade el bloque `substitutions:` con los valores por defecto del despliegue vigente. | ✅ YAML validado con `yaml.safe_load` |
| `deploy-local.py` | Marcado como **obsoleto**: guarda al inicio que explica por qué no puede ejecutarse y remite al camino vigente. Se conserva como referencia histórica. | ✅ Ejecutado: mensaje correcto y salida 1 |
| `deploy-local.ps1` | Igual que el anterior. **No se reescribió** porque no hay PowerShell en este entorno y no se debe publicar código no verificable. | ⚠️ Solo revisión por inspección |

**Pendiente de la misma familia de fallos** (§13, riesgos 2 a 6), no abordado en esta ronda:

1. **`scripts/deploy-contracts-gcp.sh` sigue con la lista obsoleta** (líneas 124-137: `UserRegistry`, `Exchange`, `MockERC20`, `Subscription`, `Governance`, `TruekeSBT`, `SBTRegistry`, `TruekeRWA`, `TruekeService`) y con las llamadas a `addToken`. Es el camino de despliegue **de producción**, así que la reparación es la misma que en `deploy-local.sh` y conviene verificarla contra un nodo real o un Anvil temporal.
2. **Archivos que `deploy-gcp.sh` necesita y no existen**: `web/Dockerfile.indexer` (referenciado por `scripts/cloudbuild-indexer.yaml`), `web/.env.gcp.example` y el script de esquema/PostGIS (la referencia a `web/scripts/setup-gcp-db.mjs` es hoy solo un mensaje informativo; el esquema real es `backend/db/schema.sql`).
3. **`start-services.ps1` arranca `web/scripts/indexer.mjs`**, que no existe: el indexador vive en `backend/indexador-cli.js`.
4. **`verify-setup.sh` sigue sin cubrir el backend** (PostgreSQL, API y relayer), que es donde vive la lógica de negocio.
5. La **suite de backend con 4 pruebas en rojo** y la **ausencia de pruebas unitarias de frontend** no se tocaron.

---

*Informe generado por auditoría estática sobre el commit `1ea7085` (rama `main`); la §15 documenta las reparaciones posteriores. Todos los conteos son verificables con los comandos citados en cada sección; las afirmaciones que provienen de la documentación del proyecto se distinguen de las verificadas en el código. Las reparaciones ejecutadas y verificadas se indican como tales; las que solo se revisaron por inspección se marcan como no verificadas.*
