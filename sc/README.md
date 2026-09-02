# TrueKeate — Smart Contracts (sc/)

Contratos inteligentes del proyecto **TrueKeate** (Fase 3 — Desarrollo), construidos con
[Foundry](https://book.getfoundry.sh/).

## Estado — Ciclos 1-3 completados ✅

**Escrow base** operativo y probado:

- `src/Escrow.sol` — máquina de estados del escrow (Ciclo 1):
  `CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO`
  - Custodia de NFTs (ERC721) y criptos (ERC20) ofrecidos en trueques AtoA (RF-05.2).
  - Apertura dual con ventanas: **±10 min** de la hora pautada y **≤10 min** de diferencia
    entre aperturas (RF-05.7, invariante I3).
  - Liberación solo con **firmas de recepción de ambas partes** (invariante I1).
  - Cierre `COMPLETADO` exige **marcador de valoración de ambas partes** (D36; detalle
    off-chain en PostgreSQL, marcador on-chain).
  - **Cancelación unilateral solo antes de custodiar** (D31, invariante I2).
  - Eventos para el indexador (listener Node.js — D25): `TruekeCreado`, `CustodiaA/B`,
    `AperturaA/B`, `RecepcionFirmadaA/B`, `ValoracionMarcadaA/B`, `TruekeCompletado`, `TruekeCancelado`.
- `src/mocks/TrueKeateToken.sol`, `src/mocks/TrueKeateNFT.sol` — tokens/NFTs de prueba.

## Pruebas (RNF-04.1)

```bash
forge test          # 18/18 verdes (unit + fuzz)
forge coverage      # 94.96 % líneas (gate D38 ≥ 80 %)
```

Cobertura de invariantes del Ciclo 1: **I1** (no liberación sin firmas duales + valoraciones),
**I2** (sin cancelación unilateral post-custodia), **I3** (ventanas de apertura 10 min/10 min).

## Despliegue en anvil (RF-15.1: cuenta 0 = EO owner)

```bash
anvil                                    # terminal 1: nodo local chain 31337
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 \
  --private-key <cuenta0> --broadcast
```

Despliegue del Ciclo 1 (anvil, cuenta 0 `0xf39F…2266`):

| Contrato | Dirección (anvil) |
|---|---|
| `Escrow` | `0xdc64a140aa3e981100a9beca4e685f962f0cf6c9` |
| `TrueKeateToken` TKA | `0x5fc8d32690cc91d4c39d9d3abcbd16989f875707` |
| `TrueKeateToken` TKB | `0x0165878a594ca255338adfa4d48449f69242eb8f` |
| `TrueKeateNFT` | `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853` |

## Ciclos completados

| Ciclo | Contratos | Estado |
|---|---|---|
| C1 | `Escrow.sol` (máquina de estados base) | ✅ 18 tests |
| C2 | `SmartAccount.sol`, `SmartAccountFactory.sol` (ERC-4337 inspirado, D35) | ✅ 14 tests |
| C3 | `BRLT.sol`, `SociosRegistry.sol`, `FondoDeValor.sol`, `SuscripcionEmpresa.sol` | ✅ 20 tests |

Suite total: **52/52 tests verdes**. Cobertura de líneas (gate D38 ≥80 %): Escrow 94.64%,
SmartAccount 95.12%, Factory 100%, BRLT 90%, FondoDeValor 100%, SociosRegistry 94.03%,
SuscripcionEmpresa 81.82% — **Total 89.72%**.

## Roadmap (ciclos siguientes)

| Ciclo | Contenido |
|---|---|
| C4 | Indexador Node.js (D25) + PostgreSQL + PostGIS (en `../backend`) |
| C5 | Relayer EIP-712 (4 protecciones D16, límite 20/día D29, fallback D39) |
| C6 | Backend API (Node.js) |
| C7 | Frontend Next.js 16 (sistema de diseño RNF-08, assets RF-19) |
| C8 | Disputas/anulación quórum 2/3 (D13/D26), subastas (D27), sanciones timelock 6h (D21), dashboard Owner |

> Referencia completa: `../RepoTecnico/arquitectura_tecnica.md` (§3 contratos, §10 ciclos).
