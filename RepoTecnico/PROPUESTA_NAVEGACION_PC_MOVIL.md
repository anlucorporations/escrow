# Propuesta · Navegación por versión: PC (barra superior) y Móvil (barra inferior)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Archivo | `RepoTecnico/PROPUESTA_NAVEGACION_PC_MOVIL.md` |
| Estado | **Propuesta para revisión del director** (no implementada) |
| Fecha | 2026-09-03 |
| Alcance | RF-14 (interfaces por rol), RNF-02.3 (móvil-first), RNF-08.4 (componentes de navegación), D40 (PWA) |

---

## 1. Situación actual (verificada en código)

- Existe **una sola suite** bajo `/suite/**` con un layout único (`web/app/suite/layout.tsx`) que
  muestra **siempre** la misma navegación: `TopBar` superior (logo + menú de usuario) y
  `BottomNav` inferior flotante con botón central hexagonal (RNF-08.4), **en cualquier tamaño
  de pantalla** (no hay variante PC).
- Las secciones son estáticas para todos: Mercado, Inventario, Trueke (central), Socios, Perfil
  (`web/components/BottomNav.tsx`) — **no se filtran por Tipo de Usuario** (RF-14.6/14.7/14.8).
- El control de acceso actual (`SuiteGuard`) ya distingue fases: `sinWallet`,
  `conectadoNoInscrito`, `inscrito` (con `tipo`/`nivel`/`estado` del usuario real — D28).
- La escalera D28 y los tipos (PARTICULAR / EMPRESA / SOCIO) ya viajan en el estado de sesión
  (`web/lib/sesion.tsx`), listos para condicionar la navegación.
- RNF-02.3 declara la plataforma **móvil-first con versión PC/tablet**; RNF-08.4 define la
  **navegación inferior flotante** (móvil) y la **barra superior con @username** — pero no hay
  especificación de una barra de navegación superior de secciones para PC.

---

## 2. Objetivo de la propuesta

1. **Versión PC**: barra de navegación **superior** con las secciones permitidas **según el
   Tipo de Usuario** (Particular por estado D28 · Empresa · Socio/Owner).
2. **Versión móvil**: **barra de navegación inferior** (la actual, RNF-08.4), también filtrada
   por Tipo de Usuario, con la sección central destacada.
3. **Evaluar**: ¿conviene tener **dos suites separadas** (una PC y una móvil) o **una sola suite
   con doble presentación** responsive?

---

## 3. Evaluación: ¿dos suites separadas o una suite con dos presentaciones?

### Opción A — Dos suites separadas (`/suite-pc` y `/suite-movil`)

| A favor | En contra |
|---|---|
| Cada versión optimizada "a medida" de su dispositivo | **Duplica** rutas, layouts, guards, lógica de sesión y estilos |
| | La sesión/inscripción/estado es **única** (wallet + backend): tener dos árboles obliga a sincronizarlos o duplica código de control de acceso |
| | Riesgo de **deriva**: una sección se corrige en PC y se olvida en móvil |
| | Contenido/estado compartido (dashboard, trueques, catálogo) se renderiza 2 veces → más mantenimiento y más superficie de bug |
| | El dispositivo **no define permisos**: el rol/estado es el mismo en ambos; separar por dispositivo no aporta valor de negocio |
| | PWA instalable (D40) es **una** app: no encaja con dos suites |

**Veredicto Opción A: NO recomendada.** El criterio que separa acceso no es el dispositivo sino el
rol/estado (RF-14). Dos suites duplicarían sin beneficio el guard, la sesión y cada pantalla.

### Opción B — Una sola suite con doble presentación responsive (recomendada)

- **Una única ruta de suite** `/suite/**`, un único `SuiteGuard`, un único estado de sesión.
- El **layout** elige la navegación por breakpoint (Tailwind `md:`/`lg:`):
  - **PC (≥ `lg` 1024px)**: barra de navegación **superior horizontal** con las secciones
    visibles según `tipo`/`nivel`/`estado` del usuario (RF-14).
  - **Móvil (< `lg`)**: `BottomNav` inferior flotante con central hexagonal (RNF-08.4), filtrada
    por el mismo criterio de rol; las secciones que no caben en 5 ranuras van a un menú
    desplegable "Más".
- **Misma data**: `lib/navegacion.ts` (nuevo) define las secciones y sus visibilidades por
  tipo/estado; ambos componentes (`TopNavPc` y `BottomNav`) consumen esa única fuente → cero
  duplicación de reglas de negocio.

| A favor | En contra |
|---|---|
| Un solo código, un solo guard, una sola sesión | Requiere un componente `TopNavPc` nuevo y refactor de `BottomNav` para filtrar por rol |
| El filtrado por rol vive en **un** módulo (`lib/navegacion.ts`) | El diseño PC aún no está definido visualmente (se propone en §5) |
| PWA/D40 y móvil-first intactos; PC es el mismo producto ampliado | — |
| Alineado con RF-14 (el acceso depende del rol, no del dispositivo) | — |

**Veredicto Opción B: RECOMENDADA.**

---

## 4. Mapa de secciones por Tipo de Usuario (fuente única)

Matriz propuesta para `lib/navegacion.ts` (visible = sección en barra superior PC / en bottom móvil):

| Sección (ruta) | Público | Inscrito | Verificado | Certificado | Empresa | Socio | Owner |
|---|---|---|---|---|---|---|---|
| Landing `/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mercado / Catálogo `/suite/mercado` | — (requiere wallet) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mi Trueke Central `/suite/dashboard` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Intercambio / Truekes `/suite/intercambio` | — | 🔒 | ✅ (≤3 activos) | ✅ | ✅ | ✅ | ✅ |
| Inventario `/suite/inventario` | — | 🔒 | ✅ | ✅ | ✅ (gestión) | ✅ | ✅ |
| Reputación / Perfil `/suite/perfil` | — | ✅ básico | ✅ | ✅ | ✅ | ✅ | ✅ |
| Disputas `/suite/gobernanza` (o `disputas`) | — | 🔒 | 🔒 | ✅ ver | — | ✅ resolver | ✅ |
| Finanzas globales (Socio/Owner) | — | 🔒 | 🔒 | 🔒 | parcial (propias) | ✅ | ✅ |
| Panel Admin `/suite/admin` | — | — | — | — | — | — | ✅ (RF-13) |
| Ayuda `/help/manual` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Leyenda: ✅ visible · 🔒 bloqueada (se muestra atenuada con motivo) · — oculta.
> La regla "el nivel manda sobre el tipo" (D14) se aplica igual en la matriz.

---

## 5. Diseño propuesto

### 5.1 PC (barra superior, `TopNavPc`)

- Barra superior fija con 2 niveles:
  1. **Fila de marca**: `TrueKeat☑` (logo) a la izquierda · buscador/catálogo (opcional) ·
     @username + estado D28 + campana + avatar (menú de usuario actual).
  2. **Fila de secciones** (solo visible cuando hay sesión inscrita): enlaces de la matriz §4
     según rol; la sección activa se marca con subrayado dorado/teal (RNF-08).
- PC sin wallet: la fila de secciones **no aparece**; solo marca + "Conectar MetaMask" (el
  `SuiteGuard` ya bloquea el contenido).
- PC con wallet no inscrita: fila de secciones muestra solo **Mercado** + botón "Inscribirme".

### 5.2 Móvil (barra inferior, `BottomNav` mejorada)

- Conserva el patrón RNF-08.4: 5 ranuras con **botón central hexagonal** destacado.
- Las 5 ranuras se **rellenan dinámicamente** desde la misma matriz: p. ej.
  - Inscrito/Verificado: Mercado · Mis truekes (central) · Perfil · + "Más" (inventario, socios…)
  - Empresa: Mercado · Trueke · Inventario · Finanzas · Más
  - Socio/Owner: Mercado · Trueke · Disputas · Finanzas · Más
- "Más" abre un panel desplegable con el resto de secciones permitidas.

### 5.3 Implementación (cambios concretos)

| Archivo | Cambio |
|---|---|
| `web/lib/navegacion.ts` (nuevo) | Matriz de secciones + `seccionesPara({tipo,nivel,estado})` |
| `web/components/TopNavPc.tsx` (nuevo) | Barra superior de secciones para ≥lg |
| `web/components/BottomNav.tsx` | Filtrar por rol desde `lib/navegacion.ts` + ranura "Más" |
| `web/app/suite/layout.tsx` | `hidden lg:flex` → `TopNavPc` · `lg:hidden` → `BottomNav` |
| `web/components/SuiteGuard.tsx` | Reutiliza la matriz para mostrar solo lo permitido |
| `web/app/suite/{admin,finanzas,disputas}` | Rutas nuevas según matriz (placeholders → integración) |
| E2E | Casos nuevos: PC muestra barra superior por rol; móvil muestra bottom filtrado |

Sin cambios en backend: la sesión ya expone `tipo`, `nivel`, `estado`.

---

## 6. Preguntas para decidir (pendientes del director)

1. ¿Se aprueba la **Opción B** (una sola suite con TopNavPc ≥1024px + BottomNav móvil)?
2. ¿La fila de secciones de PC se muestra como **barra horizontal bajo la marca** (propuesto) o
   como **menú lateral izquierdo** (sidebar) en pantallas grandes?
3. ¿Las rutas nuevas (Admin, Finanzas globales, Disputas) se crean **ya** como placeholders
   visibles por rol, o solo se prepara la matriz y se integran cuando exista la funcionalidad?

---

## 7. Resumen

- **No** a dos suites separadas (duplican guard/sesión/pantallas sin aportar; el acceso depende
  del rol, no del dispositivo).
- **Sí** a una suite con doble presentación responsive: PC con barra de navegación superior por
  Tipo de Usuario y móvil con la barra inferior flotante actual, ambas alimentadas por una única
  matriz `lib/navegacion.ts` alineada con RF-14/D14/D28.
