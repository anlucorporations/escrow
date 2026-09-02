# TrueKeate — Backend (Ciclos 4-5, Fase 3)

Backend off-chain del proyecto: base de datos PostgreSQL (lectura impulsada por eventos) e
**indexador de eventos propio** (listener Node.js — D25).

## Estructura

```
backend/
├─ db/schema.sql          # Esquema PostgreSQL completo (14 tablas + PostGIS + constraints)
├─ indexador.js           # Indexador: escucha eventos on-chain → actualiza PostgreSQL (D25)
├─ indexador-cli.js       # Punto de entrada (barrido único o modo servicio --watch)
├─ contratos.json         # Mapa contrato → {direccion, abi} (actualizar tras cada deploy)
└─ test/indexador.test.js # Tests de la lógica del indexador (node:test, pool en memoria)
```

## Esquema SQL (`db/schema.sql`)

- **14 tablas**: `usuarios`, `kyc`, `articulos`, `truekes` (espejo), `valoraciones`,
  `puntos_encuentro`, `disputas`, `imagenes_certificadas`, `suscripciones`, `campanas`,
  `subastas`, `finanzas`, `auditoria`, `indexador_checkpoint`.
- **PostGIS** (`geog GEOGRAPHY(Point,4326)`) para la regla **≤ 10 km** entre partes (RF-08.3).
- Enum canónico de 9 estados del escrow (diccionario de datos); escalera D28
  (INSCRITO/VERIFICADO/CERTIFICADO); cifrado en reposo de PII (D17).
- `auditoria` con **UNIQUE(tx_hash, log_index, entidad)** → idempotencia del indexador (RNF-07.4).
- BD objetivo: `mcc-postgres` (D25, RT-02.8). Backup RPO≤24h / RTO≤48h (RNF-07).

## Indexador (D25)

```bash
# Prepara el esquema en la BD (una vez):
psql "$DATABASE_URL" -f db/schema.sql

# Ejecución:
node indexador-cli.js           # barrido único desde DESDE_BLOQUE
node indexador-cli.js --watch   # modo servicio (checkpoints cada INTERVALO_MS)
```

Variables de entorno: `RPC_URL` (anvil/GCP), `DATABASE_URL`, `CONTRATOS_FILE`,
`DESDE_BLOQUE`, `INTERVALO_MS`.

Garantías implementadas (RNF-07.4 / H-16):
- **Idempotencia** por `(tx_hash, log_index, entidad)` — los eventos ya procesados no se re-aplican.
- **Checkpoints** por contrato (`indexador_checkpoint`) → reproceso desde bloque N.
- **Reconciliación** periódica del espejo contra la cadena (RNF-01.1: la blockchain es la única
  fuente de verdad; el indexador nunca escribe en cadena).
- **Métricas de lag** por contrato (H-17) para el dashboard del Owner.

## Tests

```bash
node --test test/           # 5/5: mapeo TruekeCreado→truekes, custodia→CUSTODIADO,
                            # idempotencia, barrerDesde+checkpoint, contrato desconocido
```

> Los tests usan un pool en memoria (sin PostgreSQL): validan la lógica de mapeo de eventos e
> idempotencia. La integración con `mcc-postgres` real se verifica en el entorno GCP (D25).

## Roadmap

## Relayer EIP-712 (`relayer.js` — Ciclo 5)

Envía meta-transacciones de particulares asumiendo el gas (RF-09.2) desde la **cuenta 1** del
anvil (RF-15.2). Protecciones (D16 + D29):

1. **Nonce único EIP-712 + chainId** (anti-replay) — validado localmente y on-chain.
2. **Allowlist**: solo Smart Accounts de particulares **VERIFICADOS** (chequeo on-chain del
   estado D28).
3. **Límite diario: 20 meta-tx por usuario/día** (D29).
4. **Endpoints autenticados + rate-limiting** (aplica en la capa API — C6).
5. **3 fallos en 10 min → bloqueo 1 h** del signer (D29).
6. Health-check y alerta de saldo bajo (D15, SLA ≥99%).

```js
const relayer = new RelayerEIP712({ provider, wallet: walletCuenta1, smartAccountFactory, abiSmartAccount });
const res = await relayer.procesarIntent({ signer, destino, valor, data, nonce, firma, chainId });
```

Integración E2E verificada en anvil: SmartAccount marcada VERIFICADO (D28) + meta-tx enviada por
la cuenta 1 con nonce incrementado ✅ (`test/integracion-relayer.js`).

## Roadmap

| Ciclo | Contenido backend |
|---|---|
| C6 | Backend API REST (auth, KYC, publicaciones, trueques, puntos de encuentro, etc.) |
| C8 | Integración E2E + reconciliación fina por trueke |

> Referencia: `../RepoTecnico/arquitectura_tecnica.md` §4 (modelo BD) y §5 (indexador).
