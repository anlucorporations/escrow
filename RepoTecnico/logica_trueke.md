# TrueKeate — Lógica maestra del Trueke / Intercambio

> Documento de referencia definido por el director (verificación de sugerencias, post-entrega).
> Captura **cómo debe funcionar** el ciclo de vida del Trueke de extremo a extremo.
> Estatus: **implementado en F1–F4** (contrato NFT real, BD, API y web) — ver `## 4` y la tabla de brechas actualizada al final.

## 1. El ciclo completo (9 puntos del director)

1. **Inventario = NFTs**: los usuarios cargan sus **Bienes, Servicios y Artículos** a su inventario. Cada ítem **se convierte en un NFT** (decisión: NFT on-chain real por ítem).
2. **A crea un trueke (ofertado)** desde la sección **Mi Trueke Central**:
   - carga el NFT de lo que ofrece (seleccionándolo de su inventario para mayor comodidad), y
   - **describe lo que quiere recibir**.
3. **Publicación en el Mercado**: el trueke creado se muestra en el **Mercado**. El Mercado alberga **todos los trueques y de todos los tipos**; los tipos de trueque **se diferencian visualmente**.
4. **Tipos de trueque**: son las combinaciones de **Artículos, Servicios, Bienes y Criptos** (p. ej. Artículo↔Servicio, Bien↔Cripto, Servicio↔Bien…).
5. **B acuerda**: el Usuario B **selecciona el trueke dentro del Mercado y acuerda el intercambio**.
   - 5.1 **Propuesta de encuentro**: según **nivel y reputación** de los usuarios, **el de mayor rango en ambos** propone el **punto de encuentro** (mostrando los **últimos usados como favoritos**), la **fecha** y la **hora**. Se usan widgets de **mapa**, **fecha** y **hora**.
   - 5.2 El trueke acordado **pasa a la sección Intercambio como Activo**.
6. **Intercambio**: la sección muestra el trueke **Activo** (y los que están **en disputa** — punto 8).
7. **Mi Trueke Central → tarjeta "Mis Truekes"**: muestra los trueques **en el mercado (Ofertados)** y los **Cerrados (completados)**, además de los **últimos puntos de encuentro usados** (reutilizables como favoritos).
8. **Intercambio**: muestra los truekes **Activos** y los que están **en disputa**.
9. **Cierre el día del acuerdo**: A y B **firman el intercambio** como:
   - **Recibido Conforme ✓** → abre el proceso de **valoración del intercambio** (evalúa el NFT recibido), o
   - **No Conforme ✗** → abre el proceso de **disputa**.

## 2. Flujo de estados propuesto (vista de negocio)

```
[A] Inventario ──(publica NFT + qué quiere recibir)──▶ Trueke OFERTADO ──▶ Mercado (todos los tipos, diferenciados visualmente)
                                                          │
[B] Mercado ──(selecciona y acuerda)──────────────────────┤
                                                          ▼
                                     Propuesta de encuentro (mayor nivel/reputación propone:
                                     punto favorito + fecha + hora con mapa) ──▶ Acuerdo
                                                          ▼
                                     Intercambio ── ACTIVO (+ los EN DISPUTA)
                                                          ▼
                                     Día del encuentro: firma de cada parte
                                          ├── Recibido Conforme ✓ ──▶ Valoración (1-5) del NFT recibido ──▶ Cerrado/Completado
                                          └── No Conforme ✗ ──▶ Disputa
```

## 3. Decisiones de diseño confirmadas por el director (ronda de verificación)

| Decisión | Detalle |
|---|---|
| **NFT on-chain real por ítem** | Cada Bien/Servicio/Artículo del inventario se mintea como NFT on-chain (contrato real, no mock); el trueque referencia tokens, no solo filas de BD. |
| **Bifurcación de cierre Conforme / No Conforme** | El día del encuentro, cada parte firma **Recibido Conforme** (abre valoración del NFT recibido) o **No Conforme** (abre disputa). Reemplaza la firma genérica actual. |
| **Modelo abierto-publicado** | A publica su NFT + descripción de lo que quiere recibir; B lo acepta en el Mercado (a diferencia del alta directa actual donde A fija el artículo B ajeno). |
| **Tipos de trueque: 4 categorías + combinaciones** | Categorías base: **Artículo, Servicio, Bien, Cripto**. El tipo del trueque = **par oferta/requerido** (p. ej. Artículo→Servicio, Bien→Cripto). Cada combinación se diferencia visualmente con **icono y color propios**. |
| **Desempate de la propuesta de encuentro** | Propone el punto/fecha/hora quien gane por: **1. nivel D12** (INICIADO→SOCIO), **2. reputación** si hay empate de nivel, **3. el que publicó el trueke (A)** si persiste el empate. |
| **Estado PROPUESTO off-chain hasta el acuerdo** | El trueke ofertado en el Mercado es una **fila BD en estado PROPUESTO sin espejo on-chain**; al acordar B pasa a CREADO y arranca el ciclo on-chain. Evita gas por ofertas no aceptadas. |

## 4. Brechas vs. implementación actual (auditoría sobre código)

> Estado tras **F1–F4** (migración implementada y probada). Pendientes marcados en 🟡/🔴 siguen abiertos.

| Punto de la lógica | Estado real hoy | Brecha |
|---|---|---|
| 1. NFT por ítem | `sc/src/TrueKeateNFT.sol` real (producción): mint solo por la plataforma (rol minter), categorías ARTICULO/SERVICIO/BIEN/CRIPTO, metadatos por token; Escrow solo acepta el NFT oficial vinculado; 9 tests Foundry nuevos | 🟢 hecho — el minteo automático al publicar (backend→relayer) y la UI de "se mintea al publicar" quedan para F3/F4 siguientes |
| 2. Alta desde Mi Trueke Central con "qué quiero recibir" | `/suite/dashboard` con alta de trueke ofertado (artículo propio + descripción + tipo requerido) → `POST /truekes/ofertas` | 🟢 hecho |
| 3. Mercado = truekes de todos los tipos diferenciados | `/suite/mercado` lista ofertas PROPUESTO con icono/color por categoría + ficha modal | 🟢 hecho |
| 4. Tipos (Artículo/Servicio/Bien/Cripto) | Enum `categoria_item` en BD + `articulos.categoria` + selector en Inventario + badge de tipo en Mercado | 🟢 hecho |
| 5. B acuerda en el Mercado | Botón "Acordar intercambio" en la ficha (Verificado/Certificado) → `POST /truekes/:id/acordar` → CREADO | 🟢 hecho |
| 5.1 Propuesta punto/fecha/hora por mayor rango + favoritos + mapa | Regla nivel D12 → reputación → A implementada en `POST /:id/propuesta-encuentro` (persiste punto+fecha/hora); **UI de mapa, lista de puntos favoritos y widgets fecha/hora en la web quedan pendientes** (módulo de geolocalización sin endpoints propios) | 🟡 parcial |
| 6. Activo en Intercambio | El trueke acordado pasa a CREADO y aparece en `/suite/intercambio` con sus acciones | 🟢 hecho |
| 7. Mis Truekes (ofertados/cerrados) + favoritos en el dashboard | Tarjeta real con Ofertados/Activos/Cerrados en `/suite/dashboard` (tabla `puntos_favoritos` creada; UI de favoritos pendiente) | 🟢 hecho (favoritos: 🟡) |
| 8. Activos + en disputa en Intercambio | Intercambio marca los truekes EN_DISPUTA/RESOLUCION_SOCIOS con aviso; la gestión sigue en `/suite/disputas` | 🟢 hecho |
| 9. Conforme/No Conforme | `POST /:id/cierre` por lado: Recibido Conforme (ambos → COMPLETADO) / No Conforme (→ disputa EN_DISPUTA); botones en la ficha de Intercambio | 🟢 hecho |

## 5. Pendiente de confirmar (no inventar)

- Alcance de "valoración del NFT recibido": ¿dimensiones D18 (aceptación/honestidad/seguridad/confiabilidad/compromiso) sobre el NFT, o solo 1–5 global?
- Si la **firma Recibido Conforme/No Conforme** convive con el estado CUSTODIADO/APERTURA actual del escrow o sustituye la firma de recepción genérica (mapeo de estados al migrar).
- Impacto en RF-05/RF-14 existentes y en los 61 tests Foundry / 32 backend / E2E al migrar.
- **Minteo automático on-chain al publicar un ítem** (backend/relayer → `TrueKeateNFT.mint`) y la **UI del widget de mapa + favoritos de puntos de encuentro** (requiere módulo de geolocalización con endpoints propios; hoy la propuesta persiste punto+fecha/hora por id).

> ✅ **Resuelto por el director**: tipos = 4 categorías + combinaciones con icono/color; desempate = nivel → reputación → A; estado ofertado = PROPUESTO off-chain hasta el acuerdo.

### Implementado (F1–F4)

- **F1 (sc)**: `TrueKeateNFT.sol` real con mint por la plataforma + categorías; Escrow con `vincularTrueKeateNft` (solo NFT oficial); Deploy actualizado; 9 tests Foundry nuevos → suite 71/71.
- **F2 (bd)**: enum `estado_escrow` + `PROPUESTO`; enum `categoria_item`; `articulos.categoria`; `truekes.usuario_b` nullable + `descripcion_requerida`/`tipo_requerido`/`cierre_a`/`cierre_b`; tabla `puntos_favoritos`; migración idempotente validada en PG.
- **F3 (api)**: `POST /truekes/ofertas`, `GET /truekes/ofertas`, `POST /:id/acordar`, `POST /:id/propuesta-encuentro`, `POST /:id/cierre`; catálogo con categoría; almacenes memoria+pg; tests 2 nuevos → suite backend 34/34 + smoke pg OK.
- **F4 (web)**: Mercado con ofertas + ficha modal + Acordar; dashboard Mis Truekes (Ofertados/Activos/Cerrados) + alta de oferta; Intercambio con cierre Conforme/No Conforme; Inventario con categorías → E2E 43 passed / 3 skipped.
