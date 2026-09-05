# TrueKeate — Requerimientos del Proyecto

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** |
| Fuente | `RepoTecnico/escrow-TrueKeate.md` (v1) |
| Tipo de sistema | DApp Web3 de intercambio (trueque) de Bienes, Productos, Servicios y Criptos (NFTs) |
| Fase | 1–2 — Concepto + Auditoría (documentación completa; estilo visual RNF-08/RF-19 incorporado) |
| Estado | Fase 2 completada — decisiones D1–D41; listo para Fase 3 |

---

## 1. Resumen del proyecto

Plataforma Web3 llamada **TrueKeate** donde usuarios (empresas o particulares) intercambian
Activos, Bienes y Servicios representados como NFTs/criptos, de forma segura y fiable. La
confianza y la honestidad se recompensan con reputación y beneficios para el entorno. Los
trueques se custodian mediante un contrato **escrow** hasta que ambas partes firman la
recepción correcta de lo negociado, y el cierre exige una **valoración** de la actividad y lo
negociado. La **blockchain es la única fuente de verdad** para los estados del escrow; una base
de datos PostgreSQL (off-chain, impulsada por eventos) alberga la información de gran volumen.

---

## 2. Requerimientos Funcionales (RF)

### RF-01 · Registro, identidad y verificación de usuarios
- RF-01.1 Los usuarios pueden ser **empresas** o **particulares**.
- RF-01.2 Solo los usuarios **inscritos y correctamente verificados** pueden hacer acuerdos de intercambio. **La verificación es requisito para completar un trueque** *(Decisión D14)*.
- RF-01.2b **Escalera de estados del usuario particular** *(Decisión D28)*:
  - **Inscrito**: billetera conectada + inscripción formal (correo, teléfono, dirección). Nivel Iniciado (Bronce). Puede **ver** ofertas/catálogo, pero **no completa trueques**.
  - **Verificado**: confirmó el **código en el correo y el código en el teléfono**. Habilitado para **crear y completar trueques** (máx. 3 activos a la vez).
  - **Certificado**: **completó el proceso KYC** (documento de identidad + selfie verificados). Acceso a **todas las operaciones** de intercambio, administración de actividades, historial y **participación en subastas** (RF-17.2).
- RF-01.5 La verificación del usuario es **en dos etapas** *(Decisión D28)*: (1) **Verificado** = comprobación de códigos en **correo y teléfono**; (2) **Certificado** = **proceso KYC completo** (documento de identidad + selfie).
- RF-01.3 Los usuarios particulares deben **formalizar su inscripción** para realizar operaciones en la plataforma.
- RF-01.4 La billetera conectada **no se inscribe automáticamente** *(decisión del director, post-entrega — ajusta la autoinscripción original)*: **conectar NO inscribe**. El acceso se controla por estados: **público sin billetera** → solo landing (RF-14.1); **billetera conectada sin inscripción** → solo puede **ver el catálogo** (RF-14.3) y se le ofrece el **proceso de inscripción** con un botón en el menú de usuario. La inscripción es **formal** (correo + teléfono + dirección + consentimiento GDPR → estado INSCRITO de la escalera D28; RF-01.2b/01.3).
- RF-01.6 La identidad real de los usuarios es **confidencial**, salvo autorización expresa para emitir facturas o certificados.
- RF-01.7 La metadata del KYC se almacena **cifrada** en PostgreSQL; un hash de validación (merkle root) se sube al Smart Account para certificar el estado de verificación de la **escalera D28** (INSCRITO, VERIFICADO, CERTIFICADO) sin revelar la identidad real.
- RF-01.8 Para optar a la clasificación como **Usuario Empresa** se debe estar certificado y con clasificación **Oro**.
- RF-01.9 Para optar a la clasificación como **Usuario Socio** se debe presentar una **solicitud formal** sometida a **votación por los demás Usuarios Socios**.

### RF-02 · Abstracción de Cuentas (ERC-4337) y recuperación
- RF-02.1 Implementar **Abstracción de Cuentas (ERC-4337)**: los usuarios se registran con correo/teléfono y el sistema despliega un **Smart Account** (contrato inteligente que actúa como wallet de **identidad**) *(Decisión D22)*.
- RF-02.2 La Smart Account debe permitir **recuperación social** o **recuperación vinculada al KYC** en caso de pérdida de acceso, manteniendo la descentralización de los fondos.
- RF-02.3 **Arquitectura de gas** *(Decisión D22)*: la Smart Account ERC-4337 es la wallet de identidad, y el **gas se gestiona con un relayer propio EIP-712** (sin bundler/paymaster externo; cumple RNF-05.1).

### RF-03 · Niveles de confianza y reputación
- RF-03.1 Existe **un único sistema de niveles unificado** que integra los **4 niveles de confianza** (**Iniciado, Común, Frecuente y Socio**) con las **medallas de reputación** (**Bronce → Oro**). No son dos esquemas separados *(Decisión D3)*.
- RF-03.2 El mapeo medalla↔nivel es: **Bronce = Iniciado**, **Plata = Común**, **Oro = Frecuente** (requisito para Empresa) y **Socio** por solicitud formal + votación *(Decisión D4)*.
- RF-03.3 **Fórmula de nivel aprobada** *(Decisión D12, normalización D30)*: `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)`, con umbrales:
  - **Iniciado**: puntaje 0–25 (medalla Bronce)
  - **Común**: puntaje 26–50 (medalla Plata)
  - **Frecuente**: puntaje 51–75 (medalla Oro; requisito para Empresa)
  - **Socio**: puntaje ≥ 76 + solicitud formal y votación de los demás Socios
  - **Normalización de insumos a escala 0–100** *(Decisión D30)*: reputación (media de valoraciones 1–5) ×20; volumen_efectivo = nº de trueques efectivos del usuario relativo al máximo del sistema ×100; ratio_apelaciones = 100×(1 − apelaciones/efectivos). **Recálculo del puntaje: mensual** *(Decisión D30)*.
- RF-03.4 **Definición operativa de "intercambio efectivo"** *(Decisión D12)*: trueque con estado `COMPLETADO`, firmas de recepción de **ambas partes** y **valoración registrada**; se excluyen los estados `ANULADO` y `EN_DISPUTA`/`RESOLUCION_SOCIOS` no resueltos (enum canónico de 9 estados). La medalla **Oro** requiere **+1000 intercambios efectivos** y **≥90% de ratio de efectividad** (período de cómputo: acumulativo histórico).
- RF-03.6 Nivel **Iniciado** (medalla **Bronce**):
  - Solo intercambia artículos del **mismo rubro** y de **alta disponibilidad**.
  - Debe tener lo equivalente al **3% del total de las transacciones en su rubro**.
  - Máximo **5 rubros** en sus artículos.
  - **No puede determinar lugares de intercambio**.
  - **Definiciones operativas aprobadas** *(Decisión D19)*: "alta disponibilidad" = rubro con **≥10 publicaciones activas de ≥5 usuarios distintos en los últimos 30 días**; "3% del rubro" = participación **≥3% del número de transacciones** del rubro en **90 días**. La medalla de reputación **Bronce** se obtiene al inscribirse (básico, recién inscrito).
- RF-03.7 Nivel **Común** (medalla **Plata**):
  - Puede **proponer lugares de intercambio** basado en la cercanía con la contraparte.
  - Solo acepta o propone **zonas ya registradas** por él o por la contraparte.
  - Hasta **20 rubros** para intercambio y máximo **50 artículos**.
  - Su cuenta puede ser **penalizada** ante un período prolongado de inactividad con más del **5% del volumen de artículos en el mercado**.
  - **Definición operativa aprobada** *(Decisión D19)*: "inactividad prolongada" = **180 días sin actividad**; penalización = **degradación de nivel a Iniciado + suspensión de nuevas publicaciones**; la base del 5% es sobre el volumen de artículos publicados en el mercado.
- RF-03.8 Nivel **Frecuente** (medalla **Oro**; mayormente para usuarios empresa):
  - Establecer **campañas de venta masiva** de artículos.
  - Tener **muchos rubros declarados**.
  - Tener **establecimiento para retiro de artículos**.
  - Opción de **envíos o delivery**.
  - Ofrecer intercambio de artículos por **stablecoin BorloTokens (BRLT)**.
- RF-03.9 Nivel **Socio** (control, auditoría y verificación de intercambios):
  - Servir como **mediadores y jueces** en conflictos de disputas.
  - Evaluar las **sanciones** aplicadas.
  - Administrar la **emisión y el valor de la stablecoin BorloTokens (BRLT)**.
  - **Aprobar la creación de establecimientos de retiro**.
  - Crear **campañas de recolecta por una causa** (intercambio de artículos por **puntos de reputación**).
  - **Aprobar las campañas de venta masiva**.
  - Conformar un **fondo de valor** para gastos de operación (hosting, gas, red de despliegue de contratos, etc.).
  - El fondo se nutre de una **combinación de fuentes** con un **porcentaje definido y modificable por el Owner** *(Decisión D7)*: comisión base del **1% del valor de cada trueque completado** + **10% de las suscripciones de empresas** + **5% de la emisión de BRLT**. Los tres porcentajes son **configurables por el Owner** desde el dashboard.
  - **Gobernanza de votación** *(Decisión D21)*: quórum de **2/3 de Socios** para resoluciones de disputas y para **admitir nuevos Socios**; **un voto por Socio** (sin ponderación por nivel).

### RF-04 · Publicaciones y catálogo
- RF-04.1 Las publicaciones son **Artículo por Artículo (AtoA)**, donde se especifica qué artículo se quiere recibir. *(El modo "Artículo por Rubro" se omite por decisión D2.)*
- RF-04.2 Los usuarios particulares pueden tener hasta **5 artículos** para su cambio (límite que el **nivel Común amplía a 50** — el nivel manda sobre el tipo de usuario) *(Decisión D14)*.
- RF-04.3 Los usuarios particulares pueden **solicitar artículos que no estén dentro del mercado** como **encargo**, ofreciendo algo a cambio.
- RF-04.4 Las empresas pueden ofrecer **más de 5 artículos** para intercambio y **propiciar subastas** por artículos considerados buscados.
- RF-04.5 En la creación de un nuevo intercambio se debe incluir **toda la información que genere confianza** en el intercambio.

### RF-05 · Intercambios (trueques) y escrow

> **Lógica maestra del Trueke (definida por el director, post-entrega):** ver `RepoTecnico/logica_trueke.md` — ciclo completo en 9 puntos (inventario→NFT, A publica oferta con "qué quiere recibir", Mercado con todos los tipos diferenciados visualmente, B acuerda, propuesta de encuentro por mayor nivel/reputación con favoritos + mapa, Activo en Intercambio, tarjeta Mis Truekes con ofertados/cerrados, cierre Recibido Conforme → valoración / No Conforme → disputa). Estatus: documentada, pendiente de validación e implementación.

- RF-05.1 Un trueque se ejecuta cuando el **Usuario A ofrece un NFT/cripto** y el **Usuario B completa el intercambio** ofreciendo el NFT/cripto requerido.
- RF-05.2 Al ofrecer o completar un trueque, los **NFTs pasan a custodia del contrato escrow** hasta que **ambos usuarios firmen la recepción correcta** de lo negociado.
- RF-05.2b **Liberación de fondos custodiados** *(Decisiones D13 + D26)*: solo se libera por **quórum de Socios** (≥2/3) tras la solicitud de anulación, con plazo máximo de **5 días** desde la solicitud. **Si vencen los 5 días sin alcanzar quórum, el escrow se resuelve ANULADO por defecto** con **devolución de los NFTs a ambas partes** (cierre en tiempo finito garantizado) *(Decisión D26)*.
- RF-05.3 El sistema debe permitir **crear, completar y cancelar** operaciones de swap. **Regla de cancelación** *(Decisión D31)*: la cancelación es **unilateral y sin penalización solo antes de custodiar activos** en el escrow; **una vez custodiados, la única salida es el flujo de anulación con quórum de Socios** (RF-06.1/CU-18).
- RF-05.4 Se debe llegar a un **acuerdo para el sitio de entrega** y se debe **certificar si se recibió o no** lo negociado.
- RF-05.5 El detalle de cada intercambio activo debe incluir **toda la información que dé confianza** en el intercambio.
- RF-05.6 Se debe **resaltar** qué elementos van **off-chain** (por volumen de información) y cuáles **on-chain** (para el menor consumo de gas).
- RF-05.7 El proceso de intercambio debe ser **aperturado por ambas partes a no más de 10 minutos de la hora pautada**, con un **máximo de 10 minutos de diferencia** entre la apertura de ambas partes.
- RF-05.8 Ante cualquier **violación de norma**, el intercambio se **bloquea** y se solicita a ambas partes la **autorización de cierre como irregular y no efectivo**.

### RF-06 · Anulación y disputas
- RF-06.1 Si la recepción es **insatisfecha o rechazada**, se puede solicitar la **anulación justificando el motivo**; los NFTs ofrecidos **vuelven a las billeteras** de los usuarios. La anulación se resuelve por **quórum de Socios (≥2/3) en un máximo de 5 días** desde la solicitud *(Decisión D13)*; **si vence el plazo sin quórum, el escrow se ANULA por defecto y los NFTs vuelven a ambas billeteras** *(Decisión D26)*.
- RF-06.2 Los **Socios** actúan como **mediadores y jueces** en los conflictos de disputas, con **quórum de 2/3 y un voto por Socio** *(Decisión D21)*.
- RF-06.3 Los Socios **evalúan las sanciones** aplicadas; las **sanciones se ejecutan on-chain por el contrato** tras la resolución, con **timelock de 6h** *(Decisión D21)*.
- RF-06.4 La reputación otorga **mayor peso en las disputas** a los usuarios con mejor nivel.

### RF-07 · Valoraciones y esquema de reputación
- RF-07.1 Como requisito indispensable del cierre del trueque, se debe dar una **valoración de la actividad y de lo negociado**.
- RF-07.2 La reputación se compone de **5 renglones de valoración**, cada uno en **escala 1–5** *(Decisión D18)*:
  - **Aceptación del producto**: apariencia y estado del artículo.
  - **Honestidad publicitaria**: veracidad de la descripción en la publicación.
  - **Seguridad**: certificados y evidencias legales del artículo.
  - **Confiabilidad**: experiencia durante la actividad de intercambio.
  - **Compromiso**: tiempo y novedades transcurridas desde el acuerdo hasta la realización.
- RF-07.3 La reputación concede **beneficios o prioridades** en ciertos procesos (establecer puntos de encuentro, mayor peso en disputas, etc.).
- RF-07.4 La **medalla de reputación** (dimensión del sistema unificado, D3) va de **Bronce** (básico y recién inscrito) a **Oro** (más de 1000 intercambios y **90% de intercambios efectivos**). Mapeo: **Bronce = Iniciado, Plata = Común, Oro = Frecuente** *(D4)*. La clasificación **Oro** es requisito para optar a **Usuario Empresa**.

### RF-08 · Puntos de encuentro y geolocalización
- RF-08.1 El sistema debe incorporar **soporte de mapas** para establecer puntos de encuentro.
- RF-08.2 En la **versión móvil** se debe ofrecer la **ruta de cómo llegar** al punto de encuentro.
- RF-08.3 Los lugares de intercambio no deben tener **más de 10 km de distancia** entre las partes.
- RF-08.4 Esta lógica vive **estrictamente en la capa off-chain** (PostgreSQL con extensión **PostGIS**) mediante **APIs de geolocalización**, partiendo de la dirección suministrada en la inscripción.

### RF-09 · Gas, meta-transacciones y relayer
- RF-09.1 Las transacciones entre **usuarios particulares no deben generar costo de gas** (patrón de **Meta-Transacciones EIP-712**).
- RF-09.2 Implementar infraestructura de **Relayers**: los usuarios firman criptográficamente sus intenciones (sin costo) y el **backend envía la transacción a la blockchain asumiendo el gas**.
- RF-09.3 Los **usuarios Empresa pagan el gas** de todas sus transacciones.
- RF-09.4 Los usuarios empresa **pagan por su inscripción**.
- RF-09.5 **Operación del relayer** *(Decisión D15)*: rol **Operador de Infraestructura** (relayer + indexador + backend), **mínimo 2 instancias** con cola de reintentos y health-check; el **fondo de valor (RF-03.9/D7) financia el gas** con alerta de saldo bajo; SLA de disponibilidad **≥99% uptime**.
- RF-09.6 **Protecciones anti-abuso del relayer** *(Decisiones D16 + D29)*:
  - **Nonce único EIP-712 por cuenta** (anti-replay, dominio con chainId).
  - El relayer **solo acepta intents de Smart Accounts de particulares verificados** (chequeo on-chain del estado de verificación).
  - **Límite diario de meta-tx por usuario: 20 transacciones/día** *(Decisión D29)*.
  - **Falla reiterada**: **3 fallos en 10 minutos → bloqueo temporal del signer por 1 hora** *(Decisión D29)*.
  - Endpoints **autenticados con rate-limiting** y rotación de claves.

### RF-10 · Suscripciones de empresa (cobros automáticos)
- RF-10.1 El contrato inteligente implementa el **patrón de staking bloqueado** *(Decisión D33)*: la empresa **bloquea tokens (plan base 100 BRLT/mes, configurable por el Owner) por 30 días** y el contrato **cobra automáticamente al vencer el período**, sin firma manual (RF-10.1, R2, CU-24). *(Se descarta EIP-1337 por ser borrador — H-45.)*

### RF-11 · Certificación de imágenes
- RF-11.1 Todas las imágenes (de **publicación** o de **recepción**) deben generar un **hash con la metadata y la wallet del usuario conectado** para certificación.
- RF-11.2 Calcular **hash criptográfico SHA-256** de la imagen subida, almacenada en **IPFS con pinning propio** (servicio open source) *(Decisión D23)*.
- RF-11.3 La **wallet del usuario firma ese hash** (ECDSA).
- RF-11.4 La **firma y el hash** se almacenan en PostgreSQL, y además la **raíz merkle (acumulador) de las certificaciones se ancla on-chain en el contrato escrow**, garantizando **inmutabilidad y auditoría real** *(Decisión D23)*.

### RF-12 · Stablecoin BorloTokens (BRLT)
- RF-12.1 La stablecoin **BorloTokens (BRLT)** se **emite desde el inicio del proyecto**, controlada por el **contrato de Socios** *(Decisión D6)*.
- RF-12.2 El nivel **Frecuente** puede ofrecer intercambio de artículos por **BRLT**.
- RF-12.3 Los **Socios** administran la **emisión y el valor** de BRLT.
- RF-12.4 **Generar el contrato BRLT** como parte del desarrollo *(Decisión D6)*.

### RF-13 · Panel de administración (Owner)
- RF-13.1 Crear un **dashboard de acceso exclusivo del owner** para gestionar todas las secciones de la plataforma:
  - Contratos desplegados.
  - Finanzas generales.
  - Usuarios inscritos.
  - KPIs de disputas.
  - Base de datos off-chain.
  - Cualquier sub-módulo necesario para verificar el rendimiento de la plataforma.

### RF-14 · Interfaces por rol (acceso según tipo y nivel de usuario)
- RF-14.1 **Landing page** de inicio con toda la información de la plataforma: cantidades de usuarios, volumen de transacciones, qué es un Trueke Digital, ventajas, beneficios, seguridad y filosofía del trueque.
- RF-14.2 **Suite (dashboard de usuario)** donde se accede a: funciones de intercambio, catálogo de productos ofrecidos, perfil de usuario, reputación y confianza, intercambio activo, etc., según tipo y nivel.
- RF-14.3 **Usuario Particular Inscrito**: acceso a las ofertas de intercambio (puede ver); **no completa trueques** (requiere estado Verificado — RF-01.2b, D28).
- RF-14.4 **Usuario Particular Verificado** (códigos correo + teléfono confirmados): acceso al panel de ofertas, **crea y completa trueques** con **máximo 3 intercambios activos a la vez** (RF-01.2b, D28).
- RF-14.5 **Usuario Particular Certificado** (KYC completo: documento + selfie): todas las operaciones de intercambio de la plataforma y administración de sus actividades (RF-01.2b, D28).
- RF-14.6 **Usuarios Certificados**: acceso a la sección **Intercambio** (crear intercambio, completar intercambio, intercambios en disputa), **Perfil** (agregar nueva dirección particular, ver reputación) e **Historial**.
- RF-14.7 **Usuarios Empresa**: acceso adicional a **gestión de inventario**, **direcciones de encuentro**, **finanzas de usuario** y **gestión de promociones**. *(D5)* Las **finanzas de cada usuario** se expresan en **NFTs en stock, Criptos y BRLT**; la empresa gestiona su saldo **BRLT/criptos solo cuando participa en intercambios de criptomonedas**. El saldo **BRLT** solo es visible/gestionable para **Socios y Owner**.
- RF-14.8 **Usuarios Socios**: acceso adicional a **Disputas** y **Finanzas Globales** (gastos de mantenimiento de la plataforma, gastos de gas, etc.).

### RF-15 · Entorno de pruebas (anvil)
- RF-15.1 La **cuenta 0** del anvil actúa como **EO owner** y despliega los contratos.
- RF-15.2 La **cuenta 1** del anvil actúa como **relayer** y **cuenta general de la plataforma** para pagos de gas y otros gastos.

### RF-16 · MetaMask / wallet
- RF-16.1 Conexión con **MetaMask** (provider, signer, account).
- RF-16.2 **Auto-reconexión** de la wallet al refrescar la página.
- RF-16.3 En la **versión móvil**, la firma/autorización con la wallet se delega a la **wallet móvil (MetaMask mobile)**; en la Fase 3 se adopta **PWA instalable** *(Decisión D40)*; la **APK nativa queda como mejora futura**.

### RF-17 · Subastas de empresa *(nuevo — D20/H-12)*
- RF-17.1 **Solo las Empresas** pueden **crear subastas** por artículos considerados buscados.
- RF-17.2 **Solo los usuarios Certificados** pueden **participar** en las subastas, con **prioridad según su nivel** (mayor nivel → mayor prioridad).
- RF-17.3 Una subasta incluye: artículo ofrecido (custodiado en escrow al crearse), **plazo de duración**, **puja inicial**, incremento mínimo de puja y artículo(s) que el subastador acepta recibir.
- RF-17.4 Los participantes pujan ofreciendo sus NFTs/criptos; al cierre, el ganador es el postor que ofrece **el mayor valor** (empate resuelto por **mayor nivel** del postor) y el trueque pasa al flujo estándar de escrow (RF-05) *(Decisión D27)*.
- RF-17.5 Al finalizar sin ganador o si la subasta se anula, los NFTs custodiados **vuelven a las billeteras** de sus dueños.

### RF-18 · Roles operativos de la plataforma *(nuevo — D24/H-21…H-26)*
- RF-18.1 **Operador de Infraestructura**: el **Owner/equipo técnico** opera, monitorea y financia relayer + indexador + backend (D15, D24).
- RF-18.2 **Moderación**: el **Owner + un moderador designado** detectan y ejecutan el bloqueo por violación de norma (RF-05.8) y moderan publicaciones/campañas.
- RF-18.3 **Soporte al usuario**: el **Owner + moderador** atienden pérdida de acceso, penalizaciones y cobros de empresas (canal y SLA por definir en operación).
- RF-18.4 **Autoridad KYC**: verificación **automática** (documento + selfie vía servicio verificador) con **revisión humana del Owner**; plazos, rechazos y apelaciones gestionados por el Owner.
- RF-18.5 **Custodio de claves**: el **Owner** custodia RELAYER/ADMIN_PRIVATE_KEY en Secret Manager con política de **rotación** y separación de funciones.
- RF-18.6 **Auditoría**: **externa** en Fase 4 (pruebas/seguridad) + **Socios como revisores del registro auditable** de acciones de la plataforma.
- RF-18.7 **Cumplimiento/legal**: revisión externa (abogado/compliance) para GDPR, BRLT y custodia — pendiente de contratación (se documenta como requisito).

### RF-19 · Activos de marca y recursos visuales *(nuevo — D41)*
- RF-19.1 **Logotipo**: `TrueKeate/TrueKeate_logo.svg` (vector, 983×881 pt — recoloreable vía CSS/currentColor), `TrueKeate_logo.png` (983×881), `TrueKeate_logo.ico` (favicon), `TrueKeate_logo.JPG` (preview 2816×1536).
- RF-19.2 **Título/logotipo con texto**: `TrueKeate/TrueKeate_titulo.svg` (vector 1399×684 pt), `TrueKeate_titulo.png` (1399×684), `TrueKeate_titulo.ico`.
- RF-19.3 **Imágenes conceptuales/hero** (banners): `Gemini_Generated_Image_{aa0kqcaa0kqcaa0k,g8iktjg8iktjg8ik,pwfd5jpwfd5jpwfd,saoquksaoquksaoq,s9l1g1s9l1g1s9l1}.jpg` (2816×1536 / 2814×1536) + duplicado `(1).jpg` — para landing/hero.
- RF-19.4 **Material de referencia**: `TrueKeate/Guía_sobre_Soulbound_Tokens_(SBT).png` (1536×2752) — insignias SBT/reputación.
- RF-19.5 Los assets se sirven desde `/public` (o CDN propia) en el frontend; los SVG se usan como fuente vectorial de marca. **Recoloreado**: el `fill="#000000"` está en el `<g>` raíz sin `currentColor`, por lo que la integración debe aplicar una regla CSS `svg * { fill: currentColor; }` (o transformar el fill del `<g>` a `currentColor`) para tintarlos con los tokens RNF-08.1.

---

## 3. Requerimientos No Funcionales (RNF)

### RNF-01 · Seguridad y privacidad
- RNF-01.1 La **blockchain es la única fuente de verdad** para los estados del escrow.
- RNF-01.2 **Protección de contratos**: usar librerías estándar (OpenZeppelin: Ownable, ReentrancyGuard, IERC20).
- RNF-01.3 La **identidad real** de los usuarios es confidencial; solo se divulga con autorización para facturas o certificados.
- RNF-01.4 La **metadata del KYC** se almacena **cifrada** en PostgreSQL (solo se sube un hash/merkle root al Smart Account). **Cifrado en reposo de TODOS los campos PII** (correo, teléfono, dirección, documento, selfie) *(Decisión D17)*.
- RNF-01.5 **Inmutabilidad y auditoría real** de imágenes mediante hash SHA-256 + firma ECDSA almacenados en PostgreSQL.
- RNF-01.6 Restringir el acceso a los servicios **no necesarios para uso público**.
- RNF-01.7 **Cumplimiento de privacidad (GDPR)** *(Decisión D17)*: **consentimiento explícito** al registrar para el tratamiento de datos biométricos (selfie + documento, categoría especial GDPR Art. 9); **retención** con **borrado a los 24 meses** de inactividad o a solicitud del usuario (derecho al olvido); política de acceso y notificación de brechas.

### RNF-02 · Usabilidad y experiencia de usuario
- RNF-02.1 Interfaz **amigable, con colores vivos** y **navegación intuitiva** *(paleta y tokens según RNF-08)*.
- RNF-02.2 **Diseño responsive**: desplegar bien en diferentes dispositivos sin afectar la interfaz (PC, teléfono y tablet).
- RNF-02.3 La plataforma está **principalmente orientada a dispositivos móviles**; las interfaces deben diseñarse para móvil (con versión PC y tablet). En Fase 3 la versión móvil se entrega como **PWA instalable** (D40).

### RNF-03 · Rendimiento y disponibilidad
- RNF-03.1 Minimizar el **consumo de gas on-chain**: resaltar elementos off-chain (volumen) vs on-chain.
- RNF-03.2 PostgreSQL como **base de datos de lectura impulsada por eventos** para manejar gran cantidad de información off-chain.
- RNF-03.3 **Disponibilidad de la infraestructura de trueque (relayer + indexador + backend)**: SLA **≥99% uptime**, mínimo **2 instancias**, health-check y failover *(Decisión D15, H-02)*.

### RNF-04 · Mantenibilidad y calidad de código
- RNF-04.1 Incorporar pruebas de **fuzzing e invariantes** (`test_fuzzing_o_invariantes`) y pruebas de **cobertura** (`test_cobertura`) a toda la estructura de pruebas de Foundry.
- RNF-04.2 Código tipado (TypeScript) y stack estándar para facilitar mantenimiento.

### RNF-05 · Cumplimiento y licencias
- RNF-05.1 Todos los **elementos externos incorporados** deben ser estrictamente de **código abierto, uso público y gratuito**.

### RNF-06 · Confiabilidad
- RNF-06.1 La **valoración es requisito indispensable** del cierre de trueque (no se puede cerrar sin valorar).
- RNF-06.2 Reglas de distancia (10 km) y de apertura (10 min / 10 min) son **invariantes** del proceso de intercambio.

### RNF-07 · Backup y recuperación *(nuevo — D17/H-04)*
- RNF-07.1 **Backup diario** de PostgreSQL con **RPO ≤ 24h**.
- RNF-07.2 **RTO ≤ 48h** para restauración completa del entorno off-chain.
- RNF-07.3 **Pruebas de restauración** periódicas documentadas (al menos trimestrales).
- RNF-07.4 **Recuperación del indexador**: capacidad de reproceso desde un bloque N ante pérdida/corrupción, con reconciliación contra la cadena (única fuente de verdad).

---

### RNF-08 · Identidad visual y sistema de diseño *(nuevo — PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md)*

Fuente maestra: `RepoTecnico/PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md` (v2.1). Concepto: **"Bóveda Digital Moderna"** — custodia criptográfica sólida (azul marino/estructuras hexagonales) + fluidez Web3 (gradientes cian/teal) + valor y reputación (acento dorado SBT).

- RNF-08.1 **Paleta de colores (design tokens)**:
  - Base/Confianza: **Deep Navy `#1A2B4C`** (textos, headers, bordes hexagonales).
  - Superficie oscura: **Midnight Navy `#0A1128`** (navbar sticky, footer, modo oscuro).
  - Primario de acción: **Teal Energy `#2A9D8F`** (gradiente CTA inicio, iconos activos, focus inputs).
  - Secundario de fluidez: **Cyan Electric `#48CAE4`** (fin de gradiente, gráficos, enlaces).
  - Acento de valor: **Metallic Gold `#D4AF37`** (insignias SBT nivel 3, estrellas de reputación, check `TrueKeat☑`, bordes premium RWA).
  - Lienzo: **Smoke White `#F8F9FA`**; Tarjetas: **Pure White `#FFFFFF`**.
  - Error: **Crimson `#E63946`**; Advertencia: **Coral `#F4A261`** (alertas de ventana 10 min).
- RNF-08.2 **Gradientes**: CTA principal `linear-gradient(135deg,#1A2B4C,#2A9D8F)`; cyan glow `linear-gradient(90deg,#2A9D8F,#48CAE4)`; gold badge `linear-gradient(135deg,#D4AF37,#F3E5AB,#C5A065)`; borde de tarjeta destacada navy→teal→gold.
- RNF-08.3 **Tipografía**: títulos **Montserrat/Poppins** (Bold 700/ExtraBold 800; tracking por nivel: H1 −0.03em, H2 −0.02em, H3 −0.01em); cuerpo **Inter/Roboto** (400/500/600); **etiquetas/metadatos** en mayúsculas con tracking 0.08em a 11px; **Caption (identidad @username)** 12px/16px Bold 700 con tracking +0.02em. Escala: H1 32/38px móvil · 44/52px desktop; H2 24/30px; H3 18/24px; Body 15/22px.
- RNF-08.4 **Componentes clave (móvil-first)**: barra superior con `@username` + check dorado + campana; botón CTA cápsula (`border-radius:9999px`, gradiente navy-teal, sombra teal, scale 0.96 al tap); botón outline navy (radio 12px); botón acento dorado; inputs 56px de altura táctil con estados focus/success/error animados; toggle 56×32px con thumb dorado; **tarjeta de activo** con borde superior dorado para RWA certificado y avatar hexagonal; **navegación inferior flotante** (blur 12px, radio 24px) con botón central hexagonal dorado "Trueke Central".
- RNF-08.5 **Animaciones**: curvas `cubic-bezier` natural/bounce/out con duraciones 150/300/400/600 ms; loader hexagonal doble giro (**teal #2A9D8F ↔ dorado #D4AF37**); checkmark vectorial dibujado (`TrueKeat☑`) en éxitos; elevación háptica de tarjetas (−6px al hover/tap).
- RNF-08.6 **Blueprint UI**: la "Sala de Intercambio Atómico" (móvil) muestra aporte propio vs contraparte, estado del escrow en 3 pasos, punto de encuentro, ventana de 10 min y botón "Firmar y completar (EIP-712 sin gas)" — acorde al §6 de la propuesta visual.
- RNF-08.7 **Aplicación**: tokens en `tailwind.config`/`@theme` (navy 900/800, teal 500, cyan 400, gold 500; radios pill/card/modal) y componentes base `Button` (variantes pill-primary/outline-navy/gold-accent), `Card`, `BottomNav`, `StatusBadge` (§7 de la propuesta). *(En Tailwind v4 los tokens se declaran en CSS `@theme` — ver arquitectura §8.)*

## 4. Requerimientos Técnicos (RT)

### RT-01 · Stack de desarrollo
- RT-01.1 **Solidity**: lenguaje de smart contracts.
- RT-01.2 **Foundry**: framework para desarrollo y testing de contratos.
- RT-01.3 **OpenZeppelin**: librerías estándar (Ownable, ReentrancyGuard, IERC20).
- RT-01.4 **Next.js 16** (App Router) con **TypeScript** para el frontend *(Decisión D1)*.
- RT-01.5 **Ethers.js** (v6) para interactuar con Ethereum.
- RT-01.6 **Tailwind CSS** (v4) para estilos.
- RT-01.7 **MetaMask** como wallet de navegador; en móvil, firma vía **wallet móvil (MetaMask mobile)** con **PWA instalable** en Fase 3 (D40); APK nativa como mejora futura.

### RT-02 · Arquitectura on-chain / off-chain
- RT-02.1 **Smart contracts** (escrow + módulos) desplegados en la red de pruebas.
- RT-02.2 **PostgreSQL** para almacenar la gran cantidad de información que no debería estar on-chain.
- RT-02.3 PostgreSQL debe comportarse como una **base de datos de lectura impulsada por eventos**.
- RT-02.4 **Indexador de Eventos**: **listener en la API de Node.js (propio)** que escuche los eventos de la blockchain y actualice PostgreSQL en consecuencia *(Decisión D25)*.
- RT-02.5 **PostGIS** (extensión de PostgreSQL) para la lógica de geolocalización de puntos de encuentro.
- RT-02.6 **IPFS con pinning propio** (servicio open source) para el almacenamiento de imágenes certificadas *(Decisión D23)*.
- RT-02.7 **Acumulador on-chain**: la raíz merkle de certificaciones de imágenes se ancla en el contrato escrow *(Decisión D23)*.
- RT-02.8 **PostgreSQL**: se **reutiliza el servicio `mcc-postgres`** existente (patrón vía pgadmin + Secret Manager) *(Decisión D25)*.

### RT-03 · Estandares y patrones blockchain
- RT-03.1 **EIP-712** (Meta-Transacciones).
- RT-03.2 Infraestructura de **Relayers propios** *(Decisión D22)*: relayer EIP-712 propio gestiona el gas; sin dependencia de SaaS (Biconomy/OpenZeppelin Defender), cumpliendo RNF-05.1.
- RT-03.3 **EIP-4337 / ERC-4337** (Abstracción de Cuentas, Smart Accounts como wallet de identidad) *(Decisión D22)*.
- RT-03.4 **Staking bloqueado** para suscripciones de empresa *(Decisión D33)*: se descarta EIP-1337 (borrador — H-45); bloqueo de tokens 30 días + cobro automático.
- RT-03.5 **SHA-256 + ECDSA** para certificación de imágenes.
- RT-03.6 **ERC-20** (IERC20) para la stablecoin BorloTokens (BRLT).

### RT-04 · Setup base del frontend
- RT-04.1 Configurar **Next.js 16 con TypeScript**.
- RT-04.2 Instalar **ethers.js v6**.
- RT-04.3 Configurar **Tailwind CSS v4**.
- RT-04.4 Crear el **context provider de Ethereum** en `lib/ethereum.tsx` que:
  - Gestione la conexión con MetaMask.
  - Provea `provider`, `signer`, `account`.
  - Auto-reconecte al refrescar la página.
- RT-04.5 Crear `lib/contracts.ts` con los **ABIs**.

### RT-05 · Entornos de despliegue
- RT-05.1 **Entorno remoto** de pruebas de desarrollo estilo **preview** usando las cuentas desplegadas en **anvil** (nodo de pruebas interno).
- RT-05.2 Entorno de trabajo remoto con la cuenta **Google Cloud** donde están desplegados los servicios globales (**Foundry** y **PostgreSQL**). Proyecto GCP del proyecto: **`truekeate-main`** ("TrueKeate", reutilizado) *(Decisiones D9–D10)*.
- RT-05.3 Usar las **herramientas de manejo de identidad y manejo de claves/datos esenciales** de GCP (Secret Manager, cuentas de servicio).
- RT-05.4 **Restringir el acceso** a los servicios que no sean necesarios para su uso público.
- RT-05.5 Solicitar **autorización** para la creación o despliegue de servicios globales de la cuenta o servicios específicos del proyecto.

---

## 5. Restricciones y limitaciones (Reglas de negocio duras)

- R1. Transacciones entre **particulares sin costo de gas**; las **empresas pagan gas**.
- R2. Las empresas pagan **inscripción** y **suscripción automática cada 30 días**.
- R3. Los puntos de encuentro **≤ 10 km** de distancia entre las partes (lógica off-chain con PostGIS).
- R4. Identidad real **confidencial** salvo autorización (facturas/certificados).
- R5. Apertura del intercambio: **≤ 10 min** de la hora pautada y **≤ 10 min** de diferencia entre aperturas.
- R6. Violación de norma → **bloqueo del intercambio** y solicitud de cierre irregular a ambas partes.
- R7. Solo usuarios **inscritos y verificados** pueden acordar intercambios.
- R8. Valoración **obligatoria** al cierre del trueque.
- R9. Elementos externos: **solo código abierto, público y gratuito**.
- R10. Nivel Iniciado: **sin** determinación de lugares de intercambio; restricciones de rubros (5) y % del rubro (3%).
- R11. Nivel Común: solo zonas **registradas**; máx. 20 rubros y 50 artículos; penalización por inactividad (>5% del volumen de artículos en mercado).
- R12. Empresa certificada: requiere clasificación **Oro**.
- R13. Socio: solicitud formal + **votación** de los demás Socios.

---

## 6. Ambigüedades y preguntas pendientes (de la fuente)

> **Sin pendientes funcionales.** Las 6 ambigüedades de la fuente fueron resueltas en las rondas de decisión (D1–D41). Pendiente operativo: **acceso SSH a `gitlab.codecrypto.academy`** (publickey denegado; se resolverá luego — D11).

> **Resueltas**: Next.js **16** (D1) · "Artículo por Rubro" **omitido** (D2) · Niveles + medallas = **un solo sistema** (D3) · Mapeo **Bronce=Iniciado, Plata=Común, Oro=Frecuente, Socio=votación** (D4) · Finanzas de usuario en **NFTs/Criptos/BRLT** (D5) · BRLT **emitida desde el inicio** (D6) · Fondo de valor con **porcentajes configurables por Owner** (D7) · Fórmula de niveles aprobada (D12) · Escrow por **quórum de Socios ≤5 días** (D13) · **Verificado para truequear** + límites por nivel (D14) · Relayer con **operador, 2 instancias y SLA 99%** (D15) · **4 protecciones anti-abuso** del relayer (D16) · **GDPR/backup** aprobados (D17) · Valoración **escala 1–5** (D18) · Definiciones operativas aprobadas (D19) · Módulo **Subastas** creado (D20) · **Gobernanza 2/3 + timelock 6h** (D21) · **ERC-4337 + relayer propio** (D22) · **Acumulador on-chain de imágenes** (D23) · **Roles operativos** asignados (D24) · **Listener Node.js propio + reusar mcc-postgres** (D25) · **Escrow ANULADO por defecto sin quórum** (D26) · **Subastas: mayor valor gana** (D27) · **Escalera Inscrito/Verificado/Certificado** (D28) · **Meta-tx: 20/día y bloqueo 1h** (D29) · **Fórmula normalizada 0–100, recálculo mensual** (D30) · **Cancelación solo pre-custodia** (D31) · **BRLT con quórum 2/3 y tope 1M** (D32) · **Suscripción por staking bloqueado** (D33) · **Recuperación social 3 guardianes/2-3/48h** (D34) · **Sin EntryPoint oficial, relayer propio** (D35) · **Valoraciones off-chain + marcador on-chain** (D36) · **Proveedores open source** (D37) · **Cobertura ≥80% forge** (D38) · **Fallback relayer con reembolso BRLT** (D39) · **PWA instalable** (D40).

---

## 7. Trazabilidad con la fuente

| Sección de `escrow-TrueKeate.md` | Requerimientos derivados |
|---|---|
| [OBJETIVO] | RF-01.1, RF-04.2, RF-04.3, RF-04.4, RF-03.x (reputación) |
| [CONTEXTO] | RF-05.x, RF-06.x, RF-07.x, RF-08.x, RT-02.x |
| [LIMITACIONES] | RF-09.x, RF-10.x, RF-11.x, R1–R8, RT-03.x |
| [entorno remoto] | RT-05.x |
| [entorno de sistema] | RF-13, RF-14, RF-15, RF-16, RT-04, RT-01 |
| `PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md` | **RNF-08** (identidad visual/sistema de diseño), **RF-19** (activos de marca) |
| `TrueKeate/` (assets) | **RF-19** (logo, título, iconos, imágenes hero, guía SBT) |

---

## 8. Decisiones registradas (D1–D41)

*Origen: entrevista Fase 1 (D1–D11) · auditoría y casos de uso Fase 2 (D12–D31) · arquitectura (D32–D41).*

| ID | Pregunta | Decisión |
|---|---|---|
| **D1** | ¿Next.js 14 o 16? | **Next.js 16** — versión oficial del proyecto (aplica a RT-01.4 y RT-04.1). |
| **D2** | ¿Qué es "Artículo por Rubro"? | **Se omite** ese modo de publicación: solo **Artículo por Artículo (AtoA)** (RF-04.1). |
| **D3** | ¿Dos esquemas de niveles o uno? | **Sistema unificado**: niveles de confianza + medallas de reputación forman un único esquema (RF-03.1, RF-07.4). |
| **D4** | ¿Mapeo medalla↔nivel? | **Bronce = Iniciado · Plata = Común · Oro = Frecuente · Socio = solicitud + votación** (RF-03.2, RF-07.4). |
| **D5** | ¿Alcance de "finanzas particulares"? | Finanzas de cada usuario expresadas en **NFTs en stock, Criptos y BRLT**; la empresa gestiona su saldo BRLT/criptos solo al participar en intercambios de criptomonedas; saldo BRLT visible/gestionable solo para **Socios y Owner** (RF-14.7). |
| **D6** | ¿Emisión de BRLT? | **Desde el inicio del proyecto**, controlada por el **contrato de Socios**; generar el contrato BRLT (RF-12.1, RF-12.4). |
| **D7** | ¿Origen del fondo de valor? | **Combinación de fuentes** con porcentajes **definidos y modificables por el Owner**: **1% del valor de cada trueque completado + 10% de suscripciones de empresas + 5% de la emisión de BRLT** (RF-03.9). |
| **D8** | ¿Repositorios? | Rama **`escrow-dsh-GCP`** sobre `main` (`c9dc2d5`) en **GitHub** `anlucorporations/escrow` (ya existente) y **GitLab.com** `anlucorporations/escrow`; tercer repo `gitlab.codecrypto.academy` pendiente de acceso SSH. |
| **D9** | ¿Proyecto GCP? | Crear proyecto **TrueKeate-DSH** → creado como **`truekeate-dsh`** (ID en minúsculas por norma GCP). |
| **D10** | ¿Billing/proyecto GCP final? | **Reutilizar `truekeate-main`** ("TrueKeate", ya existente con billing y servicios activos); **`truekeate-dsh` eliminado** (RT-05.2). |
| **D11** | ¿Acceso `gitlab.codecrypto.academy`? | **Se resuelve luego**; mientras tanto se trabaja con GitHub + GitLab.com. |
| **D12** | ¿Fórmula de niveles y "intercambio efectivo"? (H-01) | **Aprobada**: `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)`; umbrales Iniciado 0–25 / Común 26–50 / Frecuente 51–75 / Socio ≥76 + votación; "efectivo" = COMPLETADO + firmas de ambas partes + valoración (RF-03.3, RF-03.4). |
| **D13** | ¿Liberación/anulación del escrow? (H-05) | **Quórum de Socios (≥2/3)** con **máximo 5 días** desde la solicitud de anulación (RF-05.2b, RF-06.1). |
| **D14** | ¿Acceso y límites? (H-09, H-10) | **Completar un trueque exige usuario verificado** (RF-01.2, RF-14.3); límites: **5 artículos Particular / 50 nivel Común** — el nivel manda sobre el tipo (RF-04.2). |
| **D15** | ¿Operación y gas del relayer? (H-02) | **Aprobado**: rol **Operador de Infraestructura** (relayer + indexador + backend), **mínimo 2 instancias** con cola de reintentos y health-check, **fondo de valor financia el gas** con alerta de saldo bajo, SLA de disponibilidad **≥99% uptime** (RF-09, RNF-03). |
| **D16** | ¿Protección anti-abuso del relayer? (H-03) | **Aprobadas las 4 protecciones**: nonce único EIP-712 por cuenta; relayer solo acepta intents de **Smart Accounts de particulares verificados** (chequeo on-chain); **límite diario de meta-tx por usuario**; endpoints **autenticados con rate-limiting** (RF-09, RNF-01). |
| **D17** | ¿KYC/GDPR y backup? (H-04) | **Aprobado**: **consentimiento explícito** al registrar + retención con **borrado a los 24 meses** de inactividad o a solicitud; **cifrado en reposo de TODOS los campos PII** (no solo KYC); RNF de **backup diario RPO ≤24h / RTO ≤48h** con pruebas de restauración (RNF-01.7, RNF-07). |
| **D18** | ¿Escala de valoraciones? (H-06) | **Escala 1–5** para los 5 renglones de reputación (RF-07.2). |
| **D19** | ¿Definiciones operativas? (H-07, H-08) | **Aprobadas**: "alta disponibilidad" = rubro con ≥10 publicaciones activas de ≥5 usuarios en 30 días; "3% del rubro" = ≥3% de transacciones del rubro en 90 días; "inactividad prolongada" = 180 días sin actividad, penalización = degradación a Iniciado + suspensión de publicaciones (RF-03.6, RF-03.7). |
| **D20** | ¿Subastas de empresa? (H-12) | **Crear módulo RF-17**: solo **Empresas** crean subastas; solo **usuarios Certificados** participan con **prioridad según su nivel**. |
| **D21** | ¿Gobernanza de Socios y sanciones? (H-20) | **Votación**: quórum **2/3 de Socios** para resoluciones de disputas y para **admitir nuevos Socios**; **un voto por Socio** (sin ponderación); **sanciones ejecutadas on-chain por el contrato** tras la resolución, con **timelock de 6h**. |
| **D22** | ¿Arquitectura del gas? (H-29) | **Aprobada**: **Smart Account ERC-4337 como wallet de identidad** + **relayer propio EIP-712 para el gas** (sin bundler/paymaster externo; cumple RNF-05.1). |
| **D23** | ¿Evidencia de imágenes? (H-27) | **Aprobado**: **anclar la raíz merkle (acumulador) de certificaciones de imágenes en el contrato escrow** on-chain + **IPFS con pinning propio** (servicio open source, sin Pinata). |
| **D24** | ¿Roles operativos? (H-21…H-26) | **Aprobado**: Operador de Infraestructura = Owner/equipo técnico; Moderación + Soporte = Owner + moderador designado; Autoridad KYC = automático + revisión humana del Owner; Custodio de claves = Owner con Secret Manager + rotación; Auditoría = externa (Fase 4) + Socios revisores. |
| **D25** | ¿Indexador y PostgreSQL? (H-16, H-44) | **Indexador: listener en Node.js propio** (no The Graph). **PostgreSQL: reusar `mcc-postgres`** (patrón existente vía pgadmin + Secret Manager). |
| **D26** | ¿Escrow sin quórum a los 5 días? (U-01 CRÍTICA) | **ANULADO por defecto** con **devolución de NFTs a ambas partes** al vencer los 5 días sin quórum de 2/3 (cierre en tiempo finito) (RF-05.2b, RF-06.1). |
| **D27** | ¿Adjudicación de subastas? (U-02) | Gana el postor de **mayor valor ofrecido**; empate resuelto por **mayor nivel** (RF-17.4). |
| **D28** | ¿Escalera de estados del usuario? (U-03) | **Inscrito** = billetera + inscripción (ve ofertas); **Verificado** = códigos confirmados en correo y teléfono (crea/completa trueques, máx 3 activos); **Certificado** = proceso KYC completo (documento + selfie): todas las operaciones y subastas (RF-01.2b, RF-01.5, RF-14.3/14.4/14.5). |
| **D29** | ¿Límite diario meta-tx y falla reiterada? (U-07) | **20 meta-tx por usuario/día**; **3 fallos en 10 minutos → bloqueo temporal del signer por 1 hora** (RF-09.6). |
| **D30** | ¿Normalización de la fórmula de nivel? (U-11…U-13) | Insumos **normalizados a 0–100** (reputación ×20; volumen relativo al máximo ×100; apelaciones 100×(1−ratio)); **recálculo mensual** (RF-03.3). |
| **D31** | ¿Regla de cancelación de swap? (U-05) | **Cancelación unilateral sin penalización solo antes de custodiar**; después de custodiar, única salida = anulación con quórum (RF-05.3). |
| **D32** | ¿Emisión de BRLT? (arquitectura) | Emisión de BRLT requiere **quórum 2/3 de Socios**; **tope inicial 1.000.000 BRLT** (aumento solo por votación 2/3); cada emisión **registrada con su propósito** (RF-12). |
| **D33** | ¿Patrón de suscripción empresa? (H-45) | **Staking bloqueado** en lugar de EIP-1337 (borrador): la empresa **bloquea tokens 30 días** y el contrato cobra automáticamente; plan base **100 BRLT/mes configurable por el Owner** (RF-10). |
| **D34** | ¿Recuperación social? (arquitectura) | **3 guardianes**, **umbral 2 de 3** para autorizar recuperación, **timelock de aviso 48 h** antes de ejecutar el cambio de owner (RF-02.2; no usar KYC como único mecanismo — H-18). |
| **D35** | ¿EntryPoint ERC-4337 oficial? (arquitectura) | **NO se usa el EntryPoint oficial**: Smart Account **inspirada en ERC-4337** (misma seguridad/recuperación) operada por el **relayer propio EIP-712** (RF-02, D22). |
| **D36** | ¿Valoraciones on-chain u off-chain? (arquitectura) | **Off-chain en PostgreSQL**: los 5 renglones (Aceptación del producto, Honestidad publicitaria, Seguridad, Confiabilidad, Compromiso — escala 1–5, RF-07.2/D18) se registran off-chain + **marcador on-chain "ambas partes valoraron"** como requisito de COMPLETADO (RNF-06.1). |
| **D37** | ¿Proveedores open source? (arquitectura) | **OpenStreetMap + Nominatim** (geocodificación), **OSRM** (rutas), **Nodemailer + SMTP propio** (email), **códigos por email + notificación in-app** (SMS como mejora futura), **IPFS con nodo Kubo propio** (RNF-05.1). |
| **D38** | ¿Cobertura mínima de pruebas? (arquitectura) | **≥80% de cobertura de líneas** con `forge coverage` como gate obligatorio de cada ciclo de la Fase 3 (RNF-04.1). |
| **D39** | ¿Fallback del relayer? (arquitectura) | **Modo degradado**: ante indisponibilidad prolongada (>1 h), el usuario puede **pagar el gas directamente**; la plataforma **reembolsa en BRLT** si la caída fue responsabilidad del operador (RF-09, D15). |
| **D40** | ¿PWA o APK nativa? (RF-16.3) | **PWA instalable** para la Fase 3 (firma móvil delegada a MetaMask mobile/wallet); **APK nativa como mejora futura** (RNF-02.3). |
| **D41** | ¿Aprobación del entorno visual? (RNF-08/RF-19) | **Aprobado por el usuario**: se incorpora `PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md` como sistema de diseño oficial (**RNF-08**) y la carpeta `TrueKeate/` como activos de marca (**RF-19**) — aprobación explícita en entrevista (ronda de sincronía Fase 2). |
