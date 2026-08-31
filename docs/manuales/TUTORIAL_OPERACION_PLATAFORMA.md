# 📖 Tutorial Integral de Operación de la Plataforma — TrueKeat Web3

Este tutorial detalla paso a paso todas las operaciones del protocolo **TrueKeat**, incluyendo inscripción, publicación de activos físicos tokenizados (RWA), intercambio bilateral con custodia atómica, transacciones sin gas (EIP-712), coordinación de entregas presenciales por geolocalización, valoración en 5 dimensiones y gobernanza arbitral.

---

## 📑 Tabla de Contenidos
1. [Inscripción de Identidad y Georreferenciación On-Chain](#1-inscripción-de-identidad-y-georreferenciación-on-chain)
2. [Niveles de Identidad (Nivel 1, 2 y 3 SBT) y Cuotas](#2-niveles-de-identidad-y-cuotas-de-intercambio)
3. [Publicación de Bienes Físicos RWA y Vouchers de Servicios](#3-publicación-de-bienes-físicos-rwa-y-vouchers-de-servicios)
4. [Apertura de Trueques y Custodia Atómica](#4-apertura-de-trueques-y-custodia-atómica)
5. [Modalidad Gasless ⚡ (Meta-Transacciones EIP-712)](#5-modalidad-gasless--meta-transacciones-eip-712)
6. [Coordinación de Puntos de Encuentro Presenciales (≤ 10 km)](#6-coordinación-de-puntos-de-encuentro-presenciales--10-km)
7. [Liquidación Bilateral y Liberación de Fondos](#7-liquidación-bilateral-y-liberación-de-fondos)
8. [Sistema de Reputación Multidimensional (5D) y Rangos](#8-sistema-de-reputación-multidimensional-5d-y-rangos)
9. [Resolución de Disputas y Arbitraje Comunitario](#9-resolución-de-disputas-y-arbitraje-comunitario)

---

## 1. Inscripción de Identidad y Georreferenciación On-Chain

Toda billetera que interactúa con TrueKeat debe estar inscrita en el contrato inteligente [`UserRegistry.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/escrow/sc/src/UserRegistry.sol).

```
+-------------------------------------------------------------------------+
|                  FLUJO DE REGISTRO DE IDENTIDAD ON-CHAIN                |
|                                                                         |
|  [ Conectar Wallet ] ──> [ /register ]                                  |
|                                │                                        |
|      ┌─────────────────────────┴─────────────────────────┐              |
|      ▼                                                   ▼              |
|  [ Datos de Identidad ]                         [ GPS & UTM On-Chain ]  |
|   • @username único                              • Latitud / Longitud   |
|   • Email de contacto                            • Proyección UTM (X,Y) |
|   • Teléfono móvil (+58)                         • Zona Huso 19N        |
|                                │                                        |
|                                ▼                                        |
|      [ Transacción register() -> Nivel 1 Inscrito -> /dashboard ]       |
+-------------------------------------------------------------------------+
```

### Pasos para Inscribirte:
1. Conecta tu billetera MetaMask en la barra superior.
2. Si no estás registrado, la plataforma te redirigirá a [`/register`](http://localhost:3000/register).
3. Rellena los campos obligatorios:
   * **Nombre de Usuario (@username)**: Entre 3 y 20 caracteres (letras, números y `_`).
   * **Correo Electrónico**: Para notificaciones de trueques y acuerdos.
   * **Teléfono Móvil**: Con código internacional (ej. `+58 412 1234567`).
   * **Dirección Física / Referencia**: ej. *Calle Comercio, Frente a la Plaza Bolívar, Higuerote*.
4. Pulsa **📍 Detectar mi GPS**:
   * Tu navegador solicitará permiso de ubicación.
   * El sistema calcula automáticamente las **Coordenadas UTM** (Este X, Norte Y y Zona 19N) requeridas on-chain.
5. Acepta los términos y pulsa **🚀 Completar Inscripción On-Chain**.
6. Confirma la transacción en MetaMask. ¡Tu identidad quedará registrada de forma inmutable!

---

## 2. Niveles de Identidad y Cuotas de Intercambio

El protocolo implementa un modelo de confianza progresiva para prevenir el spam y garantizar la seguridad física:

| Nivel | Insignia | Requisitos | Límite de Truekes Activos | Privilegios |
| :---: | :---: | :--- | :---: | :--- |
| **Nivel 1** | `Inscrito` | Registro on-chain de `@username` y GPS | **1 intercambio** | Explorar catálogo y crear intercambios P2P básicos. |
| **Nivel 2** | `Verificado` | Verificación de contacto + 2FA activado | **3 intercambios** | Mayor visibilidad, cuota ampliada de negociación. |
| **Nivel 3** | `Certificado` | Soulbound Token (`TruekeSBT.sol`) | **Ilimitado** | Tokenizar bienes RWA, emitir vouchers y votar en gobernanza. |

---

## 3. Publicación de Bienes Físicos RWA y Vouchers de Servicios

Los usuarios con certificación **Nivel 3** o **Empresas** pueden tokenizar activos del mundo real:

```
+-------------------------------------------------------------------------+
|                  TOKENIZACIÓN DE BIENES FÍSICOS (RWA)                   |
|                                                                         |
|  [ Ficha Técnica del Bien ]                                             |
|   • Título & Descripción                                                |
|   • Marca, Modelo, Serial / IMEI                                        |
|   • Fotografías Multifocales HD ───> [ Anclaje en IPFS (CID Hash) ]     |
|   • Declaración de Condición    ───> [ SHA-256 State Commitment ]       |
|                                │                                        |
|                                ▼                                        |
|  [ Emisión NFT TruekeRWA.sol / TruekeService.sol -> Catálogo /items ]   |
+-------------------------------------------------------------------------+
```

### Pasos para Publicar:
1. Dirígete a [`/items/new`](http://localhost:3000/items/new) o a **Inventario Comercial** si eres Empresa.
2. Selecciona el tipo de activo:
   * **🛡️ Bien Físico RWA**: Herramientas, vehículos, cosechas, electrónica, inmuebles.
   * **🎫 Voucher de Servicio SBT**: Asesorías, fletes, soporte técnico, mano de obra.
3. Sube fotografías de alta resolución (mínimo 2). Las imágenes se anclan permanentemente en **IPFS**.
4. Define el token de pago o el bien solicitado a cambio (ej. *500 USDT*, *Lote de café*, o *Trueque abierto*).
5. Pulsa **Publicar Activo en Catálogo**. El activo aparecerá destacado con borde dorado `#D4AF37`.

---

## 4. Apertura de Trueques y Custodia Atómica

En TrueKeat ninguna parte entrega su activo sin que la contraprestación esté garantizada en el contrato inteligente [`Escrow.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/escrow/sc/src/Escrow.sol).

```
                    ┌──────────────────────────────┐
                    │    SALA DE TRUEQUE ATÓMICO   │
                    ├──────────────┬───────────────┤
                    │              │               │
            [ Tu Depósito (Token A) ]     [ Lo que Recibes (Token B) ]
            • 100 TKA en Custodia         • 200 TKB Solicitados
                    │              │               │
                    └──────────────┴───────────────┘
                                   │
                    [ Estado: 1. Creada -> 2. Aceptada ]
```

### Pasos para Iniciar un Trueque:
1. Desde el catálogo [`/items`](http://localhost:3000/items), pulsa **Proponer Trueke Atómico** sobre el bien deseado.
2. O bien, abre el modal **Crear Operación Escrow** (`+` en el menú).
3. Selecciona:
   * **Token A (lo que depositas)**: Tu activo o token de garantía (ej. 100 TKA o 250 USDT).
   * **Token B (lo que recibes)**: El activo o token que requieres de la contraparte.
   * **Plazo (Deadline en días)**: Tiempo máximo de validez (ej. 7 días). Si vence sin completarse, puedes retirar tus fondos inmediatamente.
4. Aprueba el acceso a los tokens (*Approve*) y confirma la creación de la custodia.

---

## 5. Modalidad Gasless ⚡ (Meta-Transacciones EIP-712)

Si no tienes saldo de ETH para pagar las comisiones de red, puedes activar la opción **⚡ Sin Gas**:

```
+-------------------------------------------------------------------------+
|                  FLUJO GASLESS EIP-712 (SIN SALDO ETH)                  |
|                                                                         |
|  [ Usuario ] ──(Firma Criptográfica Off-Chain EIP-712)──> [ Frontend ] |
|                                                                 │       |
|                                                                 ▼       |
|  [ Escrow.sol ] <──(Paga el Gas)── [ Relayer / Tesorería Comunitaria ]  |
+-------------------------------------------------------------------------+
```

1. En el formulario de creación o liquidación, marca la casilla **⚡ Sin gas (Meta-transacción EIP-712)**.
2. MetaMask te solicitará una **Firma de Datos Tipificados** (gratuita, sin consumo de gas).
3. El relayer de TrueKeat transmite la transacción a la blockchain y cubre la tarifa de red con los fondos de la Tesorería.

---

## 6. Coordinación de Puntos de Encuentro Presenciales (≤ 10 km)

Para intercambios de bienes físicos en Barlovento (Higuerote, Carenero, Tacarigua, Río Chico), el protocolo incluye coordinación georreferenciada de seguridad:

```
                    ┌──────────────────────────────┐
                    │  Punto de Encuentro Seguro   │
                    ├──────────────────────────────┤
                    │ Mapa: OpenStreetMap Leaflet  │
                    │ Distancia: 3.4 km (≤ 10 km)  │
                    │ Estado: 📍 Programado        │
                    │ Lugar: Plaza Bolívar         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    [ Tracker: 3. En Tránsito ]
```

1. En la tarjeta del trueque ([`/operations`](http://localhost:3000/operations)), pulsa **📍 Proponer Punto de Encuentro**.
2. Haz clic sobre el mapa para seleccionar un lugar público y seguro (ej. *Plaza Bolívar*, *Centro Comercial*).
3. O pulsa **📍 Usar mi ubicación** para tomar las coordenadas GPS actuales.
4. Define la fecha y hora de la cita.
5. El sistema valida con la fórmula de Haversine que la distancia entre ambas partes sea **$\le 10.0\text{ km}$**.
6. La contraparte recibe una notificación para confirmar el punto. El tracker de la operación avanza a **3. En Tránsito**.

---

## 7. Liquidación Bilateral y Liberación de Fondos

1. Ambas partes acuden al punto de encuentro y verifican el estado físico del producto.
2. Tras la inspección física conforme:
   * La contraparte pulsa **Completar Trueque** (o **Firmar sin Gas**).
3. El contrato inteligente ejecuta la liquidación atómica:
   * El `TokenA` (o bien RWA) se transfiere a la contraparte.
   * El `TokenB` se transfiere al creador.
4. La operación pasa al estado definitivo **✓ 4. Completada**.

---

## 8. Sistema de Reputación Multidimensional (5D) y Rangos

Al finalizar un intercambio, la plataforma abre el modal de calificación en **5 Dimensiones de Confianza**:

```
+-------------------------------------------------------------------------+
|                  EVALUACIÓN EN 5 DIMENSIONES (1 a 5 ⭐)                  |
|                                                                         |
|  1. Aceptación del Producto : ⭐⭐⭐⭐⭐ (Estado físico y funcionamiento)   |
|  2. Honestidad Publicitaria : ⭐⭐⭐⭐⭐ (Fidelidad a las fotos IPFS)       |
|  3. Seguridad & Garantía    : ⭐⭐⭐⭐⭐ (Documentos y legalidad)          |
|  4. Confiabilidad           : ⭐⭐⭐⭐⭐ (Trato y seriedad en el acuerdo)  |
|  5. Compromiso y Puntualidad: ⭐⭐⭐⭐⭐ (Puntualidad en punto de encuentro)|
|                                                                         |
|  [ Comentario de Experiencia ] ──> [ Registro en PostgreSQL & On-Chain ] |
+-------------------------------------------------------------------------+
```

### Rangos de Reputación:
* 🥉 **Rango Bronce**: Usuario recién inscrito o con menos de 3 intercambios.
* 🥈 **Rango Plata**: Al menos 3 intercambios completados y efectividad $\ge 80\%$.
* 👑 **Rango Oro**: Más de 5 intercambios exitosos, 0 disputas perdidas y efectividad $\ge 90\%$.

---

## 9. Resolución de Disputas y Arbitraje Comunitario

Si un producto no coincide con la descripción o una de las partes no se presenta al punto de encuentro:

1. El usuario afectado pulsa **⚖️ Abrir Disputa Arbitral**.
2. La custodia queda congelada bajo el estado **En Disputa**.
3. Un **Socio Árbitro** examina las evidencias fotográficas originales de IPFS y los registros GPS.
4. El árbitro ejecuta la resolución:
   * **A favor del creador**: Reembolsa el 100% de los fondos al creador.
   * **A favor de la contraparte**: Entrega los fondos a la contraparte si esta cumplió con su obligación.
5. Se actualiza el historial de disputas del usuario infractor en el contrato `UserRegistry.sol`.
