# InyectaDatos — Estado de la Inyección

| Campo | Valor |
|---|---|
| Proyecto | TrueKeate (DApp Web3 de trueques con Escrow) |
| Archivo | `RepoTecnico/BaseOperaciones/estado_inyeccion.md` |
| Última actualización | 2026-09-08 — script generado, validado e idempotente (NO ejecutado en producción) |
| Entorno objetivo | Cloud SQL `truekeate-db-dev` (vía proxy `127.0.0.1:5433`) + anvil GCP (RPC de `gcp-env.sh`) |
| Decisión del usuario | **Generar el script sin ejecutarlo** · BRLT on-chain real (emisión con quórum) · NFT mint real |

---

## Objetivo de la inyección (requerido por el director)

| # | Cuentas anvil | Perfil | Detalle |
|---|---|---|---|
| 1 | **2 y 3** | 2 **SOCIOS** · medalla **ORO** · CERTIFICADO | 2000 BRLT c/u · datos coherentes con su perfil |
| 2 | **4 y 5** | 2 **EMPRESAS** · medalla **PLATA** · CERTIFICADO | 2000 BRLT c/u · 2 Artículos + 2 Bienes + 2 Servicios tokenizados c/u |
| 3 | **6 y 7** | 2 **COMUNES** · medalla **BRONCE** · VERIFICADO | 1000 BRLT c/u · 3 Artículos tokenizados c/u |
| 4 | todas | **10 intercambios realizados c/u** (permutados con el resto) | valoración variada y coherente al perfil |

## Personas asignadas (perfiles coherentes)

| Cuenta | Persona | Tipo/Nivel/Medalla/Estado | Rubro | Artículos |
|---|---|---|---|---|
| 2 | **Ana López** | SOCIO / SOCIO / ORO / CERTIFICADO | coleccionismo y tecnología | Cámara Olympus OM-1 · Vinilos jazz Blue Note · MacBook Pro M1 Pro |
| 3 | **Bruno Fernández** | SOCIO / SOCIO / ORO / CERTIFICADO | audio y diseño | Guitarra Taylor 214ce · Monitores Adam T7V · Librería de roble |
| 4 | **EcoTech Solutions** | EMPRESA / FRECUENTE / PLATA / CERTIFICADO | energía limpia y agro | 2 Art (paneles 450W, dron DJI) · 2 Bienes (inversor 10kW, riego LoRaWAN) · 2 Servicios (auditoría energética, instalación solar) |
| 5 | **ServiPro Digital** | EMPRESA / FRECUENTE / PLATA / CERTIFICADO | tecnología y servicios TI | 2 Art (Workstation Dell, routers MikroTik) · 2 Bienes (servidor 2U, SAN 24TB) · 2 Servicios (auditoría de contratos, cloud/DevOps) |
| 6 | **Carlos Mendoza** | PARTICULAR / COMUN / BRONCE / VERIFICADO | fitness y gaming | Bici Trek Marlin 7 · Steam Deck OLED · Mancuernas Bowflex |
| 7 | **Diana Rojas** | PARTICULAR / COMUN / BRONCE / VERIFICADO | fotografía y diseño | Canon EF 85mm f/1.8 · Flash Godox AD200 · Wacom Intuos Pro M |

Correos/ubicaciones realistas por perfil; consentimiento GDPR activo; KYC `APROBADO` para CERTIFICADO (2–5) y `PENDIENTE` para VERIFICADO (6–7).

## Historial de truekes (matriz permutada)

- **30 truekes `COMPLETADO`** · cada usuario **10** (5 como oferente A + 5 como contraparte B).
- Cada pareja de los 6 usuarios intercambia **1 vez en cada sentido** (15 pares × 2) → red completa.
- Cada trueque referencia un artículo real del catálogo de cada parte (descripción "Busco: …" y `tipo_requerido` coherente).
- `escrow_id` sintético negativo (patrón del backend, sin colisión con on-chain).
- Fechas escalonadas en los últimos ~90 días.
- **60 valoraciones** (2 por trueke, 5 dimensiones 1–5) con variación por perfil:
  - ORO: 4–5 (media ≈ 4.6) · PLATA: 3–5 (media ≈ 4.2) · BRONCE: 2–5 (media ≈ 3.5).

## Mecánica on-chain del script (opcional con red)

1. **Mint real de los 24 NFT** (TrueKeateNFT en anvil GCP, `0x6C2d…7892`): cada artículo/bien/servicio → NFT del dueño (minter = relayer cuenta 1). Sin red → tokenId simulado.
2. **Emisión real de BRLT** (D32): `admitirSocioDirecto` de cuentas 2–3 → propuesta única `EMITIR_BRLT` (tipo 0) por el Owner → votos de Owner + socios 2 y 3 (quórum ≥2/3 = 2 de 3, ejecución inmediata) → Owner distribuye 2000/2000/2000/2000/1000/1000 BRLT. El 5 % de la emisión va al FondoDeValor (D7).
3. `finanzas.brlt` se ajusta al saldo on-chain real (o al monto pedido si no hay red).

## Script generado

**Ruta**: `scripts/inyectar_datos_operativos.mjs`

| Opción | Efecto |
|---|---|
| (sin flags) | Pide confirmación interactiva antes de tocar nada |
| `--yes` | Ejecuta sin preguntar |
| `--dry-run` | Solo valida la matriz y muestra el plan (no escribe nada) |
| `--solo-bd` | Omite todo lo on-chain (solo escribe la BD) |

**Entorno requerido**: `DATABASE_URL` (Cloud SQL vía proxy `127.0.0.1:5433`, o socket `/cloudsql/…`), `RPC_URL` (anvil GCP), claves del Owner (cuenta 0) y del minter/relayer (cuenta 1) — por defecto usa las claves estándar de anvil y las direcciones de `backend/contratos.json`.

## Validación realizada (entorno de pruebas local PostgreSQL 16)

Ejecutado 2 veces contra una BD de prueba con el esquema real (`backend/db/schema.sql` + `migracion_trueke_abierto.sql`):

| Tabla | Tras 1ª ejecución | Tras 2ª ejecución (idempotencia) |
|---|---|---|
| usuarios | 6 | 6 |
| articulos | 24 | 24 |
| truekes | 30 (COMPLETADO) | 30 |
| valoraciones | 60 | 60 |
| finanzas | 6 | 6 |
| kyc | 6 | 6 |

Comprobado: cada usuario 5+5 = 10 truekes · sin pares repetidos · 0 truekes con artículo nulo · 0 truekes sin valoraciones · saldos finanzas 2000/2000/2000/2000/1000/1000 · categorías por perfil correctas (ORO 6 ART, PLATA 4 ART + 4 BIEN + 4 SERV, BRONCE 6 ART).

## Pendiente

- [ ] **Ejecutar en producción bajo orden explícita del director** (con confirmación del script y respaldo previo de la BD: `backend/scripts/reiniciar-plataforma.sh --respaldo`).
- [ ] Revisar si `imagenes_certificadas` exige `firma_ecdsa` NOT NULL (el router actual no la persiste → las imágenes se omiten en la inyección; pendiente de confirmar en producción).
