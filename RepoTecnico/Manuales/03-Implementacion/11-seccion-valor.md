# Manual Técnico 11 — Sección VALOR: criptos · reputación · BRLT

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **03-Implementacion / 11 — Sección VALOR**
> (ex "Finanzas", rediseño del director 2026-09-09): las 3 subsecciones del usuario
> (**4.1 Criptos**, **4.2 Reputación**, **4.3 BRLT**), la restricción por rol y la regla de que los
> movimientos de cripto ocurren **siempre contra la PLATAFORMA** (sin P2P directo entre socios).
> Complementa a **06-backend-api.md §14** con foco en la sección del usuario.
> **Fuentes leídas**: `backend/api/routes/valor.js` (291 líneas), `backend/api/lib/es-owner.js`,
> `backend/api/lib/reputacion.js`, `web/app/suite/valor/page.tsx` (553 líneas), `backend/db/schema.sql`
> (`finanzas`), `backend/db/migracion_valor.sql` (movimientos), `backend/api/lib/almacen-pg.js`.
> **Convención**: referencias `ruta:línea` al código real. Lo no verificado se marca **pendiente de confirmar**.

---

## 1. Modelo general de VALOR

### 1.1 Qué es y qué NO es

- VALOR reemplaza a "Finanzas" en la suite con **3 subsecciones** (4.1 criptos, 4.2 reputación,
  4.3 BRLT) (`backend/api/routes/valor.js:2-19`).
- **Regla de diseño**: los movimientos de cripto ocurren **siempre entre el usuario y la PLATAFORMA**
  como contraparte (`walletPlataforma()`, `valor.js:42-46`); **no hay transferencia P2P directa de
  cripto** — entre socios la cripto solo se mueve a través de un Trueke (el flujo de trueque ya
  custodia/libera) (`valor.js:4-16`).

### 1.2 Roles y restricción

- `rolValor(req)` devuelve `'OWNER'` si la wallet es el dueño on-chain del `SociosRegistry`
  (detector `lib/es-owner.js`), si no el `tipo` del usuario (`valor.js:34-39`).
- **Gestión** (criptos y BRLT): solo `EMPRESA` / `SOCIO` / `OWNER` — `puedeCriptos`/`puedeBRLT`
  (`valor.js:48-49`); el backend responde 403 `solo_empresa_socio` / `solo_empresa_socio_owner`.
- VALOR es **visible para todo inscrito** (matriz de navegación), pero la UI muestra el contenido de
  gestión solo según rol (ver §5).
- Tasa interna de conversión ETH⇄BRLT: `TASA_ETH_BRLT` (env) o **3000** — 1 ETH ≈ 3000 BRLT
  (`valor.js:27`).

---

## 2. 4.1 Criptos del socio (Recargar / Retirar / Convertir)

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /valor/criptos/recargar` | La **plataforma acredita ETH** al socio (contraparte = plataforma); 403 `solo_empresa_socio`, 400 `monto_invalido`, 409 `saldo_insuficiente` | `valor.js:142-144` (helper `operarCripto` `:118-139`) |
| `POST /valor/criptos/retirar` | Retiro de ETH a la billetera del socio (lo envía la plataforma); mismo control | `valor.js:147-149` |
| `POST /valor/criptos/convertir` | Conversión `{ desde: 'ETH'|'BRLT', monto }` a `TASA_ETH_BRLT`; ETH→BRLT redondea a 2 decimales; BRLT→ETH a 1e-6; registra `CONVERSION` | `valor.js:152-177` |

- Cada operación ajusta el saldo con `almacen.moverSaldo` (`deltaCripto`/`deltaBrlt`) y registra la
  fila append-only en `movimientos_valor` (`registrarMovimientoValor`) con `contraparte = plataforma`
  (`valor.js:118-139`).

---

## 3. 4.2 Reputación y valoraciones pendientes

- `GET /valor/mi` (`valor.js:52-111`) devuelve el resumen completo:
  - `rol`, `saldos` (`criptos`, `brlt`, `fondoValor` — solo si el rol gestiona, si no `undefined`),
    `criptosHabilitado`, `brltHabilitado`, `tasaEthBrlt` (`valor.js:89-98`);
  - `reputacion`: `{ puntaje, nivel, medalla, reputacionMedia, truequesCompletados }` calculado con
    la **misma fórmula D12/D30** de `/reputacion/mi` (`calcularPuntaje`/`clasificarNivel`,
    `valor.js:58-87`; `lib/reputacion.js:23-45`);
  - `pendientesValoracion`: trueques `COMPLETADOS` donde soy parte y **aún no valoré** (≤20)
    (`valor.js:63-75`);
  - `ultimasValoraciones`: los últimos 10 trueques que valoré (media ★) (`valor.js:107`);
  - `movimientos`: últimas 20 filas de `movimientos_valor` (`valor.js:108`).
- La valoración inline desde VALOR llama a `POST /truekes/:id/valoracion` (persistencia en la tabla
  `valoraciones` — Manual 06 §17).
- Reglas del puntaje (Manual 06 §7): `0,5·reputación + 0,3·volumen + 0,2·(1−ratio apelaciones)`,
  normalizado 0–100; niveles INICIADO/COMUN/FRECUENTE/SOCIO con medallas BRONCE/PLATA/ORO.

---

## 4. 4.3 BRLT con Stripe Checkout (solo Empresa/SOCIO/Owner)

### 4.1 Compra con tarjeta: `POST /valor/brlt/checkout`

- Crea una **Stripe Checkout Session alojada** (NO pasarela propia): `line_items` con
  `price_data.currency = 'usd'` y metadata `{ wallet, montoBRLT }` (`valor.js:184-229`).
- Guarda el movimiento en `movimientos_brlt` como **`PENDIENTE`** con el `stripeSession` id
  (`valor.js:219-223`).
- **Sin `STRIPE_SECRET_KEY`** (dev/demo): registra el movimiento como demo y responde
  503 `stripe_no_configurado` con `movimientoId` (`valor.js:196-200`).
- Respuesta OK: `{ ok, url, sessionId, montoBRLT }` → la UI abre `url` en otra pestaña.

### 4.2 Confirmación: `POST /valor/brlt/webhook` (sin sesión)

- Stripe firma el evento; si hay `STRIPE_WEBHOOK_SECRET` se valida la firma
  (`webhooks.constructEvent`), si no (dev) se confía en el payload (`valor.js:233-247`).
- Al recibir `checkout.session.completed` (o `payment_status === 'paid'`): busca el movimiento
  `PENDIENTE` por sesión y lo **confirma** (`confirmarMovimientoBrlt` → acredita `finanzas.brlt`)
  (`valor.js:248-258`).

### 4.3 Retiro a fiat: `POST /valor/brlt/retirar`

- Debita BRLT del saldo y registra `RETIRO_BRLT`; el **desembolso fiat real se ejecutaría por
  Stripe Payouts** cuando la cuenta Stripe esté vinculada — en este entorno se registra la salida y
  se devuelve un aviso (`valor.js:267-288`).
- Conversión de BRLT comprado ⇄ ETH: se hace por `/valor/criptos/convertir` (`desde: 'BRLT'` o
  `'ETH'`), no hay endpoint separado.

---

## 5. La UI (`web/app/suite/valor/page.tsx`)

### 5.1 Vista general y restricción por rol en la página

- Cabecera con **3 tarjetas de saldo**: 🪙 ETH, 🏅 Reputación (puntaje·nivel·medalla), 💎 BRLT
  (`page.tsx:277-299`); el saldo se muestra como "—" y la gestión se oculta si el rol no
  gestiona (`gestiona = datos.criptosHabilitado`, `page.tsx:82-83`).
- La restricción de rol es **de UI + backend**: quien no es Empresa/SOCIO/Owner ve las notas
  "La gestión de criptos/BRLT es de Empresas, Socios y el Owner" y conserva su reputación
  (`page.tsx:314-319,488-492`).

### 5.2 Operaciones

- **4.1 Criptos** (`page.tsx:304-360`): monto + botones ⬆️ Recargar ETH / ⬇️ Retirar ETH /
  ⇄ ETH → BRLT / ⇄ BRLT → ETH (clientes `recargarCripto`/`retirarCripto`/`convertirCripto`,
  `web/lib/api.ts:267-290`); muestra la tasa (`datos.tasaEthBrlt`) y los saldos.
- **4.2 Reputación** (`page.tsx:365-478`): puntaje D12/D30, media y trueques completados; lista de
  **trueques sin valorar** con "⭐ Valorar 1–5" (selector inline de las 5 dimensiones:
  aceptación/honestidad/seguridad/confiabilidad/compromiso + firma de acción "valorar trueke");
  tabla de los últimos 10 valorados (promedio ★).
- **4.3 BRLT** (`page.tsx:483-531`): "💳 Comprar con Stripe" (abre Stripe Checkout o informa el
  movimiento demo) y "⬇️ Retirar BRLT"; nota de Stripe Payouts.
- **Movimientos recientes** (`page.tsx:534-548`): últimos 10 movimientos de `movimientos_valor`.

---

## 6. Persistencia (tablas)

| Tabla | Contenido | Ref. |
|---|---|---|
| `finanzas` | Saldos del socio: `criptos` JSONB (p. ej. `{ETH: n}`), `brlt`, `fondo_valor`, `porcentajes_config` | `backend/db/schema.sql:314-323` |
| `movimientos_valor` | Auditoría append-only de cripto/BRLT: `wallet`, `tipo`, `moneda`, `monto`, `contraparte` (la plataforma), `detalle`, `tx_hash` | `backend/db/migracion_valor.sql:23-34` |
| `movimientos_brlt` | Pagos fiat por Stripe: `monto_brlt`, `monto_fiat`, `fiat_moneda`, `stripe_session`, `stripe_payment`, `estado` (`PENDIENTE`/`PAGADO`/`FALLIDO`) | `backend/db/migracion_valor.sql:37-48` |
| `valoraciones` | Notas 1–5 persistidas (leídas para pendientes/últimos 10) | `schema.sql:154-166` |

- Métodos del almacén: `asegurarFinanzas`, `moverSaldo`, `registrarMovimientoValor`,
  `listarMovimientosValor`, `crearMovimientoBrlt`, `buscarMovimientoBrltPorSesion`,
  `confirmarMovimientoBrlt`, `listarValoracionesDe` (`backend/api/lib/almacen-pg.js:503-639`).

---

## 7. Pendientes de confirmar

1. **Retiro BRLT → fiat real**: requiere cuenta Stripe conectada y **Stripe Payouts**; hoy se
   registra la salida y se advierte (`valor.js:281-283`).
2. Sin `STRIPE_SECRET_KEY` el checkout queda en **modo demo** (503 `stripe_no_configurado`),
   pensado para desarrollo.
3. La relación entre `finanzas.brlt` y el contrato `BRLT` (emisión institucional con quórum) se
   documenta en **03-contratos-finanzas.md §8**: el flujo diario del socio es off-chain por VALOR.
4. El router `/finanzas` (legado) sigue montado en `app.js` pero quedó **fuera de la navegación**
   de la suite (Manual 06 §10).
