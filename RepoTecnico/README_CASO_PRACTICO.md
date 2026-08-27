# README CASO PRÁCTICO — Escrow DApp

> Demo reproducible en < 10 minutos con **una sola plataforma de escrow** usada de
> dos formas distintas: **SWAP** (intercambio P2P) y **PAGO CON GARANTÍA**
> (freelancing / contratos). El contrato no cambia entre modos: solo cambia la
> configuración de los tokens.

---

## Requisitos

| Herramienta | Instalación |
|---|---|
| Foundry (forge + cast + anvil) | `curl -L https://foundry.paradigm.xyz | bash` |
| Node.js 20+ | https://nodejs.org |
| MetaMask | https://metamask.io (opcional, para probar desde el navegador) |

## Arranque (3 terminales, < 10 min)

```bash
# Terminal 1 — blockchain local
anvil

# Terminal 2 — despliegue + configuración
./setup.sh            # deploy Escrow + TKA/TKB/USDT/DELIVERY, addToken, árbitro, mint, env
./verify-setup.sh     # comprueba que todo está listo

# Terminal 3 — web
cd web && npm install && npm run dev   # http://localhost:3000
```

Cuentas (ver `./accounts.sh` para las claves):

| # | Rol | Dirección |
|---|---|---|
| 0 | **Admin/Owner** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| 1 | **User1 / Cliente** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| 2 | **User2 / Contraparte / Freelancer** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| 3 | **Árbitro** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |

---

## Escenario 1 — SWAP P2P (marketplace "cero confianza")

**Problema:** Ana (cuenta #1) quiere cambiar 100 TKA por 200 TKB con Luis
(cuenta #2). ¿Quién entrega primero? El contrato elimina la confianza.

| Paso | Acción | Verificación |
|---|---|---|
| 1 | Ana crea operación: TokenA=TKA, 100; TokenB=TKB, 200; tipo **SWAP** | Badge **Activa** en /operations |
| 2 | Ana podría cancelar y recuperar sus TKA (nadie pierde nada) | Badge **Cancelada**, saldo restaurado |
| 3 | Luis conecta su wallet y hace click en **Completar operación** | Una sola transacción atómica: Luis recibe 100 TKA, Ana 200 TKB |
| 4 | — | Badge **Completada** |

**Verificación CLI (opcional):**
```bash
cast balance <TKA> 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC --erc20
```

---

## Escenario 2 — PAGO CON GARANTÍA (freelancing)

**Problema:** Una empresa (cuenta #1) contrata a un freelancer (cuenta #2) por
**1.000 USDT**. TokenA = USDT (pago), TokenB = DELIVERY (recibo de entrega:
1 token = 1 entrega certificada).

| Paso | Acción | Verificación |
|---|---|---|
| 1 | Cliente crea operación: TokenA=USDT, 1.000; TokenB=DELIVERY, 1; tipo **PAGO**, deadline 7 días | Badge **Activa** con fecha de vencimiento |
| 2 | Freelancer entrega el trabajo y deposita su recibo DELIVERY | Cliente recibe el recibo, freelancer 1.000 USDT |
| 3 | — | Badge **Completada** |

**Si el deadline vence sin entrega** → el cliente ve **"Reclamar fondos (venció)"**
y recupera sus 1.000 USDT vía `refundAfterExpiry()` (sin árbitro, automático).

---

## Escenario 3 — DISPUTA + ARBITRAJE

| Paso | Acción | Verificación |
|---|---|---|
| 1 | Cliente crea la operación PAGO (1.000 USDT ↔ 1 DELIVERY) | Badge **Activa** |
| 2 | Cualquiera de las partes hace click en **Disputar operación** | Badge **En disputa**; nadie puede completarla ya |
| 3 | El **árbitro** (cuenta #3) ve el **Panel de árbitro** en la tarjeta | Botones de resolución visibles solo para él |
| 4a | Resuelve **a favor del creador** → refund de 1.000 USDT al cliente | Saldo del cliente restaurado |
| 4b | (Alternativa) Resuelve **a favor de la contraparte** indicando su dirección → pago liberado al freelancer | Saldo del freelancer +1.000 USDT |

---

## Verificación automática (sin frontend)

Los 8 escenarios están cubiertos por tests Foundry:

```bash
cd sc && forge test
```

Incluye: happy path SWAP, cancelación, expiración + refund, disputa a favor del
creador, disputa a favor de la contraparte, permisos del árbitro, reverts
(deadline pasado, token no autorizado, dirección sin contrato) y paginación.

Tests del frontend:

```bash
cd web && npm test        # Vitest (utilidades + componentes)
```

---

## Criterios de éxito

- ✅ `forge test` verde (26 tests) — cubre happy path + disputa + expiración + reverts
- ✅ `npm test` verde (19 tests) — utilidades de formato y componentes
- ✅ Demo completa en < 10 minutos con 3 terminales
- ✅ El mismo contrato sirve ambos casos de negocio sin cambios (solo configuración)
- ✅ Documentación y scripts idempotentes (`setup.sh`, `start.sh`, `stop.sh`, `verify-setup.sh`, `accounts.sh`)

## Por qué funciona (la lógica transferible)

> Ninguna parte entrega su contraprestación sin recibir la suya (intercambio
> atómico en una sola transacción), y ninguna parte puede quedar atrapada con
> sus fondos en custodia para siempre (cancelación + expiración + arbitraje).

Ese patrón es directamente aplicable a marketplaces P2P, pagos por servicios,
ventas con garantía, liquidación de contratos e intercambio de activos
tokenizados.
