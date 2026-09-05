# TrueKeate — Lógica maestra del Trueke / Intercambio

> Documento de referencia definido por el director (verificación de sugerencias, post-entrega).
> Captura **cómo debe funcionar** el ciclo de vida del Trueke de extremo a extremo.
> Estatus: **documentado — pendiente de validación e implementación** (no refleja aún el código construido; ver tabla de brechas al final).

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

| Punto de la lógica | Estado real hoy | Brecha |
|---|---|---|
| 1. NFT por ítem | `articulos` (BD) con `rubro`; `TrueKeateNFT` es mock en `sc/src/mocks/`; sin mint por artículo | 🔴 |
| 2. Alta desde Mi Trueke Central con "qué quiero recibir" | Alta en `/suite/intercambio`; exige fijar artículo B del catálogo | 🔴 |
| 3. Mercado = truekes de todos los tipos diferenciados | Mercado = catálogo de artículos sueltos; sin tipos ni diferenciación visual | 🔴 |
| 4. Tipos (Artículo/Servicio/Bien/Cripto) | Solo `rubro` de artículo; sin concepto de tipo de trueke | 🔴 |
| 5. B acuerda en el Mercado | Sin botón de acuerdo en la ficha (sugerencia 2 verificada: correcta) | 🔴 |
| 5.1 Propuesta punto/fecha/hora por mayor rango + favoritos + mapa | `hora_pautada` opcional (la fija el creador); `punto_encuentro_id` existe en BD pero sin uso en el flujo; sin favoritos ni regla de rango | 🔴 |
| 6. Activo en Intercambio | Truekes entran en CREADO y se listan en Intercambio | 🟡 |
| 7. Mis Truekes (ofertados/cerrados) + favoritos en el dashboard | Tarjeta estática "Mis truekes" que enlaza a Intercambio | 🔴 |
| 8. Activos + en disputa en Intercambio | Disputas en sección separada `/suite/disputas` | 🟡 |
| 9. Conforme/No Conforme | Firma genérica `firma-recepcion` (A/B); valoración y disputa son pasos separados | 🔴 |

## 5. Pendiente de confirmar (no inventar)

- Alcance de "valoración del NFT recibido": ¿dimensiones D18 (aceptación/honestidad/seguridad/confiabilidad/compromiso) sobre el NFT, o solo 1–5 global?
- Si la **firma Recibido Conforme/No Conforme** convive con el estado CUSTODIADO/APERTURA actual del escrow o sustituye la firma de recepción genérica (mapeo de estados al migrar).
- Impacto en RF-05/RF-14 existentes y en los 61 tests Foundry / 32 backend / E2E al migrar.
- Plan de migración por fases (orden de tocar BD → contrato NFT → backend → web → pruebas) pendiente de aprobación del director.

> ✅ **Resuelto por el director**: tipos = 4 categorías + combinaciones con icono/color; desempate = nivel → reputación → A; estado ofertado = PROPUESTO off-chain hasta el acuerdo.
