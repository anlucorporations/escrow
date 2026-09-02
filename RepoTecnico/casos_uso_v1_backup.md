# TrueKeate — Casos de Uso (v1 — BACKUP HISTÓRICO)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** |
| Documento | `RepoTecnico/casos_uso_v1_backup.md` (**backup histórico de la v1**) |
| Rol | Analista funcional |
| Estado | **HISTÓRICO** — superado por `casos_uso.md` (v2, CU-01…CU-31 con Gherkin/EARS). Elaborado a partir de `RepoTecnico/requerimientos.md` (RF-01 a RF-18, decisiones D1–D25) y `RepoTecnico/diccionario_datos.md` |
| Fuente | Requerimientos funcionales RF-01…RF-18 · Restricciones R1–R13 · Decisiones D3, D5–D7, D12–D24 |

> Convenciones: **CU-XX** identifica cada caso de uso. La sección "Trazabilidad" referencia los
> RF (y decisiones) que cada caso cubre. Las reglas de negocio duras (límites 5/20/50,
> umbrales de nivel, quórum ≥2/3, plazos de 5 días y 6 h, ventanas de 10 min, distancia ≤10 km)
> provienen literalmente de `requerimientos.md` y no se modifican aquí.

---

## 1. Actores

| ID | Actor | Descripción funcional |
|---|---|---|
| **AU-1** | **Usuario Particular Inscrito** | Usuario cuya billetera se inscribió automáticamente como Particular y formalizó su inscripción (correo, teléfono, dirección). Nivel inicial **Iniciado (medalla Bronce)**. Puede **ver** ofertas de intercambio y catálogo (RF-14.3), pero **no puede completar un trueque** (RF-01.2, D14). |
| **AU-2** | **Usuario Particular Verificado** | Particular Inscrito que completó el **KYC** (correo + teléfono + documento de identidad + selfie, RF-01.5) aprobado automáticamente y con revisión humana del Owner (RF-18.4). Su estado de verificación queda **certificado on-chain** en la Smart Account vía hash/merkle (RF-01.7). **Requisito para completar un trueque** (RF-01.2, D14). Máximo **3 intercambios activos a la vez** (RF-14.4). |
| **AU-3** | **Usuario Particular Certificado** | Usuario Particular cuyo estado certificado (RF-01.7, RF-14.5) le habilita **todas las operaciones de intercambio** de la plataforma y la administración de sus actividades (RF-14.5): crear/completar intercambios, sección Intercambio (incluida disputas), Perfil (agregar dirección particular, ver reputación) e Historial (RF-14.6). **Requisito para pujar en subastas de empresa** (RF-17.2). |
| **AU-4** | **Usuario Empresa** | Usuario **certificado y con clasificación Oro** que optó por la clasificación Empresa (RF-01.8, RF-07.4). Paga **inscripción** (RF-09.4), **suscripción automática cada 30 días** (R2, RF-10) y el **gas de todas sus transacciones** (R1, RF-09.3). Acceso adicional a **inventario, direcciones de encuentro, finanzas de usuario y gestión de promociones** (RF-14.7, D5). Puede ofrecer **más de 5 artículos** y crear **subastas** (RF-04.4, RF-17.1). |
| **AU-5** | **Usuario Socio** | Usuario con puntaje **≥76** (RF-03.3) que fue **admitido por votación de los demás Socios** (quórum ≥2/3, un voto por Socio — D21). Mediador y juez en disputas (RF-06.2), evalúa sanciones (RF-06.3), administra la emisión/valor de **BRLT** (RF-12.3), aprueba establecimientos de retiro y campañas de venta masiva, crea campañas de recolecta (RF-03.9) y accede a **Disputas** y **Finanzas Globales** (RF-14.8). |
| **AU-6** | **Owner** | Administrador de la plataforma (EO owner, RF-15.1). Acceso **exclusivo al dashboard** (RF-13.1). Opera infraestructura (RF-18.1), ejerce **moderación y soporte** junto al moderador designado (RF-18.2, RF-18.3), actúa como **autoridad KYC** (revisión humana, RF-18.4) y es **custodio de claves** RELAYER/ADMIN en Secret Manager con rotación (RF-18.5). Configura los porcentajes del fondo de valor (D7). |
| **AU-7** | **Moderador** | Rol designado por el Owner que, junto a él, **detecta y ejecuta el bloqueo por violación de norma** (RF-05.8, RF-18.2) y **modera publicaciones y campañas** (RF-18.2); atiende soporte al usuario (RF-18.3). |
| **AU-8** | **Relayer / Backend (Operador de Infraestructura)** | Infraestructura de **meta-transacciones EIP-712 propias** (RF-09, RT-03.2, D22): recibe intents firmados, valida las 4 protecciones anti-abuso (D16) y envía la transacción a la blockchain **asumiendo el gas** (RF-09.2). Incluye el **indexador de eventos propio en Node.js** que actualiza PostgreSQL (D25). Mínimo **2 instancias**, cola de reintentos, health-check y SLA **≥99%** (D15); el fondo de valor financia el gas con alerta de saldo bajo (D15, RF-03.9). |
| **AU-9** | **Sistema** | Conjunto automatizado: **contratos inteligentes** (Escrow, SmartAccount ERC-4337, BRLT, Suscripción — única fuente de verdad de los estados, RNF-01.1), **backend + indexador → PostgreSQL** (lectura impulsada por eventos, RNF-03.2), **PostGIS + APIs de geolocalización** (RF-08.4), **IPFS con pinning propio** (D23) y **servicio verificador KYC** (RF-18.4). Aplica las **invariantes** de apertura (10 min/10 min) y distancia (10 km) (RNF-06.2) y los recálculos automáticos de nivel/medalla y penalizaciones. |

> Sistemas/roles de apoyo mencionados en flujos: servicio verificador KYC (externo, RF-18.4),
> servicio de mapas/ruta móvil (RF-08.2), auditoría externa y Socios como revisores del registro
> auditable (RF-18.6).

---

## 2. Módulo Identidad, registro y clasificación

### CU-01 · Registro / inscripción de Usuario Particular (ERC-4337)

- **Actores:** Usuario Particular Inscrito (primario) · Relayer/Backend · Sistema · Owner (soporte).
- **Precondiciones:**
  - El usuario posee una wallet compatible (MetaMask; RF-16.1) con auto-reconexión al refrescar (RF-16.2).
  - La plataforma está operativa (relayer con ≥2 instancias, SLA ≥99% — D15).
- **Disparador:** El usuario conecta su billetera y decide formalizar su inscripción en la plataforma.
- **Flujo principal:**
  1. El usuario conecta su wallet (MetaMask) y la plataforma la detecta (RF-16.1).
  2. El Sistema **inscribe automáticamente** la billetera como **Usuario Particular** (RF-01.4).
  3. El usuario **formaliza la inscripción** aportando correo, teléfono y dirección de inscripción (RF-01.3); la dirección es la base de la geolocalización para puntos de encuentro (RF-08.4).
  4. El Sistema solicita el **consentimiento explícito** (GDPR) para el tratamiento de datos, incluidos los biométricos (selfie + documento, categoría especial — RNF-01.7, D17); sin consentimiento no se continúa.
  5. El Sistema despliega la **Smart Account ERC-4337** del usuario como wallet de identidad (RF-02.1, D22). El despliegue se ejecuta como **meta-transacción EIP-712** vía relayer: el usuario firma el intent sin costo y el Relayer envía la transacción asumiendo el gas (RF-02.3, RF-09.1–09.2, R1).
  6. El Sistema crea el registro `usuarios` con nivel **Iniciado** y medalla **Bronce** (medalla básica del recién inscrito — RF-03.6/D19), estado de verificación pendiente; los campos PII se almacenan **cifrados en reposo** en PostgreSQL (D17, RNF-01.4).
  7. El Sistema confirma la inscripción y habilita el acceso restringido de Inscrito (ver ofertas; RF-14.3).
- **Flujos alternativos:**
  - **A1 — Wallet ya registrada:** el Sistema detecta la Smart Account existente y ofrece inicio de sesión (auto-reconexión, RF-16.2); el flujo continúa en el paso 6 (actualización de datos).
  - **A2 — Consentimiento no otorgado:** no se crea la cuenta ni se despliega la Smart Account; se informa al usuario (RNF-01.7).
  - **A3 — Falla de despliegue del Smart Account / error de red:** el Relayer reintenta desde su cola de reintentos y health-check (D15); si persiste, se notifica al soporte (Owner/moderador — RF-18.3).
  - **A4 — Datos de correo/teléfono inválidos o no confirmados:** la inscripción queda incompleta y el usuario conserva solo el estado de billetera conectada.
- **Postcondiciones:**
  - Usuario Particular Inscrito activo con Smart Account ERC-4337 desplegada (wallet de identidad).
  - Nivel Iniciado (Bronce), sin verificación: **puede ver ofertas pero no completar trueques** (RF-01.2, RF-14.3, D14).
  - Registro cifrado en PostgreSQL y estado inicial indexado desde los eventos on-chain (D25).
- **Trazabilidad:** Cubre: RF-01.1, RF-01.3, RF-01.4, RF-02.1, RF-02.3, RF-09.1, RF-14.3, RF-16.1, RF-16.2, R1; Decisiones D14, D15, D17, D22, D25.

---

### CU-02 · Verificación de usuario (KYC: correo, teléfono, documento y selfie)

- **Actores:** Usuario Particular Inscrito (primario) · Owner (autoridad KYC, revisión humana) · Sistema · Relayer/Backend.
- **Precondiciones:**
  - El usuario está **Inscrito** (CU-01) y otorgó consentimiento GDPR explícito (RNF-01.7).
  - El servicio verificador (documento + selfie) está disponible (RF-18.4).
- **Disparador:** El usuario Inscrito solicita la verificación para poder completar trueques (requisito de RF-01.2/D14) o cuando el sistema se lo pide para operar.
- **Flujo principal:**
  1. El usuario inicia la verificación desde su suite.
  2. El Sistema verifica el **correo** y el **teléfono** del usuario (posesión del canal).
  3. El usuario carga **documento de identidad** y **selfie** (RF-01.5); la verificación de documento + selfie es **automática vía servicio verificador** (RF-18.4).
  4. El Sistema almacena la **metadata del KYC cifrada en reposo** en PostgreSQL; todos los campos PII (documento, selfie, correo, teléfono, dirección) quedan cifrados (D17, RNF-01.4). La identidad real permanece **confidencial** (RF-01.6, R4).
  5. El Sistema calcula el **hash/merkle root** del estado de verificación y lo sube a la **Smart Account** del usuario para **certificar on-chain el estado de verificación** ("Iniciado", "Común", etc.) **sin revelar la identidad real** (RF-01.7).
  6. El Sistema registra el evento; el indexador actualiza PostgreSQL (D25).
  7. El sistema confirma al usuario su estado **Verificado**, habilitándolo para **completar trueques** (RF-01.2, RF-14.3, D14) con **máximo 3 intercambios activos a la vez** (RF-14.4).
- **Flujos alternativos:**
  - **A1 — Rechazo automático o por revisión humana:** si el verificador no valida el documento/selfie o el Owner (revisión humana de la autoridad KYC) rechaza, el usuario queda sin verificar y es notificado del motivo; los rechazos y apelaciones los gestiona el Owner (RF-18.4).
  - **A2 — Apelación:** el usuario apela el rechazo; el Owner re-evalúa el caso (RF-18.4) y puede aprobar (se reanuda en paso 5) o mantener el rechazo.
  - **A3 — Autorización expresa de identidad:** si el usuario autoriza expresamente, el sistema puede divulgar su identidad **solo para emitir facturas o certificados** (RF-01.6, RNF-01.3); sin autorización, no se divulga.
  - **A4 — Borrado/olvido:** por solicitud del usuario (derecho al olvido) o tras **24 meses de inactividad**, el Sistema elimina los datos KYC/PII conforme a la política de retención (D17, RNF-01.7).
- **Postcondiciones:**
  - Usuario **Particular Verificado**, con estado de verificación **certificado on-chain** en la Smart Account (merkle root) y metadata KYC cifrada off-chain (RF-01.7).
  - Habilita completar trueques (D14) y mantener hasta 3 intercambios activos (RF-14.4).
- **Trazabilidad:** Cubre: RF-01.2, RF-01.5, RF-01.6, RF-01.7, RF-14.4, RF-18.4, RNF-01.3, RNF-01.4, RNF-01.7; Decisiones D14, D17.

---

### CU-03 · Solicitud y votación de clasificación como Usuario Socio

- **Actores:** Usuario Particular Verificado/Certificado con puntaje ≥76 (primario) · Usuarios Socios (votantes) · Sistema.
- **Precondiciones:**
  - El solicitante cumple el umbral de puntaje: **≥76** según la fórmula de nivel (RF-03.3/D12).
  - Existe un cuerpo de Socios activo que puede votar (D21).
- **Disparador:** El usuario presenta la **solicitud formal** para ser clasificado como Socio (RF-01.9).
- **Flujo principal:**
  1. El usuario presenta la solicitud formal de clasificación como Socio (RF-01.9).
  2. El Sistema valida que el solicitante alcance el puntaje **≥76** (RF-03.3) y que no tenga sanciones/disputas pendientes relevantes.
  3. El Sistema somete la solicitud a **votación de los demás Usuarios Socios** (RF-01.9).
  4. Cada Socio emite **un voto, sin ponderación por nivel** (D21).
  5. El Sistema contabiliza: la admisión se aprueba con **quórum de ≥2/3 de los Socios** (RF-01.9, RF-03.9, D21).
  6. Si se aprueba, el Sistema clasifica al usuario como **Usuario Socio** y le habilita las funciones del rol (mediador/juez en disputas, administración BRLT, finanzas globales, etc. — RF-03.9, RF-14.8).
  7. El Sistema registra la resolución y actualiza el estado del usuario.
- **Flujos alternativos:**
  - **A1 — Quórum no alcanzado:** la solicitud se rechaza; el usuario conserva su nivel/medalla actuales y puede volver a postularse en el futuro (RF no fija restricción adicional).
  - **A2 — Puntaje insuficiente:** la solicitud no se admite a votación hasta alcanzar puntaje ≥76 (RF-03.3).
- **Postcondiciones:**
  - Nuevo **Socio** admitido por votación (≥2/3, un voto por Socio) o solicitud rechazada sin cambios de rol.
  - El evento de admisión queda registrado on-chain/off-chain para auditoría (RF-18.6).
- **Trazabilidad:** Cubre: RF-01.9, RF-03.3, RF-03.9, RF-14.8; Decisiones D12, D21.

---

### CU-04 · Recuperación de Smart Account (social / KYC)

- **Actores:** Usuario Particular Verificado (primario) · Owner / Moderador (soporte, RF-18.3) · Sistema · Servicio verificador KYC (RF-18.4).
- **Precondiciones:**
  - El usuario perdió el acceso a su Smart Account (clave privada/seed, wallet) y necesita recuperarla.
  - La Smart Account ERC-4337 tiene configurados guardianes sociales o vínculo KYC (RF-02.2).
- **Disparador:** El usuario reporta la pérdida de acceso y solicita la recuperación.
- **Flujo principal (recuperación social):**
  1. El usuario inicia la recuperación indicando su identidad/correo/teléfono.
  2. El Sistema verifica la identidad inicial por canal seguro (correo/teléfono).
  3. Los **guardianes sociales** designados en la Smart Account aprueban la recuperación (`recuperacionSocial[]`, RF-02.2).
  4. La Smart Account **restablece el owner/acceso** sin mover los fondos custodiados, manteniendo la **descentralización de los fondos** (RF-02.2).
  5. El Sistema registra la recuperación y notifica al usuario.
- **Flujo principal (recuperación vinculada al KYC):**
  1. El usuario solicita recuperación por KYC aportando **documento de identidad + selfie** (RF-02.2).
  2. El servicio verificador valida la identidad de forma automática y el Owner realiza la **revisión humana** (RF-18.4).
  3. Verificada la identidad, la Smart Account restablece el acceso manteniendo los fondos (RF-02.2).
  4. El Sistema registra la recuperación.
- **Flujos alternativos:**
  - **A1 — Identidad no acreditada:** la recuperación se rechaza; el caso pasa a soporte al usuario (Owner + moderador — RF-18.3).
  - **A2 — Sin guardianes ni KYC previo:** el usuario no cumple ninguna vía; el soporte evalúa el caso y, de ser procedente, inicia un proceso asistido documentado (RF-18.3).
  - **A3 — Intento de recuperación fraudulenta:** se bloquea el intento, se notifica al titular y el hecho queda en el registro auditable (RF-18.6).
- **Postcondiciones:**
  - Acceso restaurado sobre la misma Smart Account, **fondos intactos** (descentralización preservada — RF-02.2).
  - Evento registrado para auditoría (RF-18.6).
- **Trazabilidad:** Cubre: RF-02.2, RF-18.3, RF-18.4, RF-18.6.

---

### CU-05 · Clasificación como Usuario Empresa

- **Actores:** Usuario Particular Certificado con Oro (primario) · Owner (aprobación) · Sistema · Relayer/Backend (pago de inscripción).
- **Precondiciones:**
  - El solicitante está **certificado y tiene clasificación Oro** (nivel Frecuente con medalla Oro: +1000 intercambios efectivos y ≥90 % de ratio de efectividad — RF-01.8, RF-03.4, RF-07.4).
- **Disparador:** Un usuario Particular Certificado (Oro) solicita la clasificación como **Usuario Empresa**.
- **Flujo principal:**
  1. El usuario solicita la clasificación como Empresa (RF-01.8).
  2. El Sistema valida los requisitos: estado **certificado** y clasificación **Oro** (RF-01.8, RF-07.4).
  3. El usuario **paga la inscripción** de empresa (RF-09.4); el pago lo ejecuta la empresa con su propio gas (R1, RF-09.3).
  4. El usuario acepta la **suscripción automática cada 30 días** (R2, RF-10) que el contrato cobrará sin firma manual (RF-10.1).
  5. El Owner/el Sistema confirma la clasificación y habilita la suite de Empresa (RF-14.7, D5).
  6. El Sistema notifica al usuario y registra el evento.
- **Flujos alternativos:**
  - **A1 — No cumple Oro o no está certificado:** la solicitud se rechaza hasta cumplir los requisitos (RF-01.8).
  - **A2 — Pago de inscripción fallido:** no se clasifica como Empresa; se notifica al usuario (soporte: RF-18.3).
- **Postcondiciones:**
  - Usuario **Empresa** activo: paga gas (RF-09.3), tiene suscripción automática (RF-10), puede ofrecer **más de 5 artículos**, propiciar **subastas** (RF-04.4, RF-17.1) y accede a inventario, direcciones de encuentro, finanzas y promociones (RF-14.7).
- **Trazabilidad:** Cubre: RF-01.1, RF-01.8, RF-04.4, RF-07.4, RF-09.3, RF-09.4, RF-10, RF-14.7, R1, R2; Decisiones D5, D12.

---

## 3. Módulo Catálogo y publicaciones

### CU-06 · Publicar artículo (AtoA) con certificación de imagen

- **Actores:** Usuario Particular (Verificado/Certificado) o Empresa (primario) · Relayer/Backend · Sistema (IPFS + escrow + indexador) · Moderador/Owner (moderación).
- **Precondiciones:**
  - El usuario está **verificado** y su nivel habilita la publicación en el rubro elegido: el nivel manda sobre el tipo (D14).
  - Límites de publicación por nivel: Particular **≤5 artículos**; nivel **Común amplía a 50** (RF-04.2, D14); Empresa puede ofrecer **más de 5** (RF-04.4). Rubros: Iniciado **≤5 rubros** (RF-03.6), Común **≤20 rubros** (RF-03.7), Frecuente "muchos rubros declarados" (RF-03.8).
  - Nivel Iniciado: solo puede publicar/intercambiar artículos de rubros de **alta disponibilidad** (≥10 publicaciones activas de ≥5 usuarios distintos en los últimos 30 días) y en los que cumpla la participación del **≥3 % de las transacciones del rubro en 90 días** (RF-03.6, D19).
- **Disparador:** El usuario decide publicar un artículo para intercambio.
- **Flujo principal:**
  1. El usuario crea la publicación **Artículo por Artículo (AtoA)** indicando qué artículo quiere recibir a cambio (RF-04.1) e incluyendo **toda la información que genere confianza** (descripción, estado, evidencias — RF-04.5).
  2. El Sistema valida que el rubro y los límites del nivel sean admisibles (5/20/50 artículos y rubros según nivel; RF-03.6, RF-03.7, RF-04.2).
  3. El usuario sube la imagen de la publicación.
  4. El Sistema calcula el **hash SHA-256** de la imagen junto con su metadata y la wallet del usuario conectado (RF-11.1, RF-11.2) y la almacena en **IPFS con pinning propio** (RF-11.2, D23).
  5. La **wallet del usuario firma el hash (ECDSA)** (RF-11.3).
  6. El Sistema persiste **firma y hash en PostgreSQL** (`imagenes_certificadas`, RF-11.4).
  7. El Sistema agrega la certificación al **acumulador merkle** y **ancla la raíz on-chain en el contrato escrow** (RF-11.4, D23).
  8. El Sistema crea el artículo en el catálogo (`articulos`, off-chain impulsado por eventos) y lo publica como disponible.
- **Flujos alternativos:**
  - **A1 — Límite superado (5/20/50):** la publicación se rechaza hasta liberar cupo (RF-04.2, D14).
  - **A2 — Rubro no habilitado para el nivel:** para Iniciado, rubros sin alta disponibilidad o sin participación ≥3 % (90 días) se rechazan (RF-03.6, D19); para Común, más de 20 rubros se rechazan (RF-03.7).
  - **A3 — Fallo de certificación (hash/IPFS/firma):** la imagen no queda certificada y la publicación no se habilita; el sistema lo informa (RF-11).
  - **A4 — Publicación que viola normas:** el Moderador/Owner la bloquea y notifica al autor (RF-18.2; ver CU-29).
  - **A5 — Inactividad penalizada:** si el nivel Común fue penalizado (CU-21), tiene **suspendidas las nuevas publicaciones** (D19).
- **Postcondiciones:**
  - Artículo publicado (AtoA) con **imagen certificada**: hash SHA-256 + firma ECDSA en PostgreSQL y raíz merkle anclada on-chain (RF-11.4, D23).
  - El artículo queda disponible para crear intercambios (CU-11) o subastas de empresa (CU-25).
- **Trazabilidad:** Cubre: RF-03.6, RF-03.7, RF-04.1, RF-04.2, RF-04.5, RF-11.1, RF-11.2, RF-11.3, RF-11.4; Decisiones D14, D19, D23.

---

### CU-07 · Solicitar encargo de un artículo no disponible en el mercado

- **Actores:** Usuario Particular Verificado/Certificado (primario) · Sistema · (otros usuarios que puedan ofrecer el artículo).
- **Precondiciones:**
  - El usuario está verificado y puede operar (RF-01.2/D14).
  - El artículo deseado **no está disponible en el mercado** (no existe publicación activa que lo ofrezca).
- **Disparador:** El usuario busca un artículo y no lo encuentra en el catálogo.
- **Flujo principal:**
  1. El usuario crea una solicitud de **encargo** del artículo no disponible, **ofreciendo algo a cambio** (RF-04.3).
  2. El Sistema valida la oferta a cambio (artículo propio, rubro y límites del nivel).
  3. El Sistema publica el encargo en el mercado como pedido activo.
  4. Otros usuarios pueden tomar el encargo ofreciendo el artículo pedido.
  5. Si un usuario lo toma, el Sistema deriva el caso a la creación de un intercambio (CU-11) entre ambos.
  6. El encargo permanece activo hasta que se materialice un intercambio o el solicitante lo cancele.
- **Flujos alternativos:**
  - **A1 — Nadie toma el encargo:** permanece publicado; el solicitante puede retirarlo o ajustar la oferta.
  - **A2 — El artículo aparece luego en el mercado:** el Sistema lo sugiere al solicitante para crear un intercambio directo (CU-11).
- **Postcondiciones:** Encargo registrado y visible; si es tomado, se abre el flujo de intercambio estándar (RF-05).
- **Trazabilidad:** Cubre: RF-04.3.

---

### CU-08 · Consultar catálogo y ofertas de intercambio (Usuario Particular Inscrito)

- **Actores:** Usuario Particular Inscrito (primario) · Sistema.
- **Precondiciones:** El usuario está inscrito (CU-01) — no requiere verificación para **ver**.
- **Disparador:** El usuario Inscrito accede a la suite/landing para explorar la plataforma (RF-14.1, RF-14.2).
- **Flujo principal:**
  1. El usuario accede al catálogo y a las **ofertas de intercambio** (RF-14.2, RF-14.3).
  2. El Sistema muestra los artículos, publicaciones e intercambios activos con **toda la información que da confianza** (RF-05.5) e indica qué es on-chain y qué off-chain (RF-05.6).
  3. El usuario revisa ofertas, perfiles/reputación pública y condiciones (RF-14.2).
- **Flujos alternativos:**
  - **A1 — Intento de completar un trueque sin verificación:** el Sistema bloquea la operación e informa que **completar un intercambio exige estar Verificado** (RF-01.2, RF-14.3, D14), guiando al usuario al KYC (CU-02).
- **Postcondiciones:** El usuario Inscrito visualiza las ofertas; para operar debe pasar a Verificado/Certificado (RF-14.3–14.5).
- **Trazabilidad:** Cubre: RF-14.1, RF-14.2, RF-14.3, RF-01.2, RF-05.5, RF-05.6; Decisión D14.

---

## 4. Módulo Campañas (Frecuente/Socio)

### CU-09 · Crear y aprobar campaña de venta masiva

- **Actores:** Usuario Frecuente (medalla Oro; mayormente empresa) (primario) · Usuarios Socios (aprobación) · Sistema · Moderador/Owner (moderación).
- **Precondiciones:**
  - El creador tiene nivel **Frecuente (Oro)** (RF-03.8); si es empresa, con suscripción activa (RF-10).
  - Las campañas de venta masiva requieren **aprobación de los Socios** (RF-03.9).
- **Disparador:** El usuario Frecuente desea lanzar una **campaña de venta masiva** de artículos.
- **Flujo principal:**
  1. El usuario Frecuente crea la campaña de venta masiva con sus artículos (muchos rubros declarados — RF-03.8).
  2. Opcionalmente define modalidad de **envíos/delivery** y **establecimiento para retiro** (RF-03.8; el establecimiento debe estar aprobado — RF-03.9/CU-22).
  3. El Sistema somete la campaña a **aprobación de los Socios** (RF-03.9).
  4. Los Socios aprueban la campaña (gobernanza de Socios, D21).
  5. Aprobada, la campaña se activa y los interesados participan; el nivel Frecuente puede ofrecer artículos por **BRLT** (RF-12.2).
  6. Al finalizar la campaña, el Sistema cierra los intercambios pendientes y calcula resultados/reputación.
- **Flujos alternativos:**
  - **A1 — Rechazo de los Socios:** la campaña no se publica y se notifica al creador con el motivo.
  - **A2 — Moderación:** si la campaña viola normas, el Moderador/Owner la bloquea (RF-18.2; ver CU-29).
  - **A3 — Violación de norma durante la campaña:** los intercambios afectados se bloquean y derivan al flujo de CU-17 (RF-05.8).
- **Postcondiciones:** Campaña de venta masiva activa (aprobada por Socios) o rechazada/bloqueada; eventos registrados.
- **Trazabilidad:** Cubre: RF-03.8, RF-03.9, RF-12.2, RF-18.2; Decisión D21.

---

### CU-10 · Crear campaña de recolecta por una causa

- **Actores:** Usuario Socio (primario) · Usuarios participantes (donantes) · Sistema · Moderador/Owner (moderación).
- **Precondiciones:** El creador es **Usuario Socio** (RF-03.9).
- **Disparador:** Un Socio desea lanzar una campaña de **recolecta por una causa**.
- **Flujo principal:**
  1. El Socio crea la campaña de recolecta definiendo la causa y los artículos necesarios (RF-03.9).
  2. El Sistema valida y publica la campaña.
  3. Los usuarios participantes **intercambian sus artículos por puntos de reputación** a favor de la causa (RF-03.9).
  4. El Sistema acredita los puntos de reputación a los participantes y descuenta los artículos recibidos.
  5. Al alcanzar el objetivo o vencer el plazo, la campaña se cierra y se registra el resultado.
- **Flujos alternativos:**
  - **A1 — Moderación:** si la campaña viola normas, el Moderador/Owner la bloquea (RF-18.2; ver CU-29).
  - **A2 — Recolecta sin completar:** al cierre sin objetivo, los artículos ya recibidos se gestionan conforme a la causa y se informa a los participantes.
- **Postcondiciones:** Campaña de recolecta creada por un Socio y ejecutada; puntos de reputación acreditados (RF-03.9).
- **Trazabilidad:** Cubre: RF-03.9, RF-18.2.

---

## 5. Módulo Intercambios (trueques) y escrow

### CU-11 · Crear un intercambio (trueque)

- **Actores:** Usuario Particular Verificado/Certificado o Usuario Empresa (primario) · Sistema · Relayer/Backend (meta-tx) · Contrato Escrow.
- **Precondiciones:**
  - El usuario está **verificado** (requisito para acordar/completar — RF-01.2, D14) y, según RF-14.6, los Certificados acceden a crear y completar intercambios y a la gestión de disputas (RF-14.5/14.6).
  - Máximo **3 intercambios activos a la vez** para el Particular Verificado (RF-14.4).
  - Las restricciones de nivel se cumplen (rubros/límites de CU-06; el nivel manda sobre el tipo — D14).
- **Disparador:** El Usuario A encuentra el artículo que desea (publicación AtoA de Usuario B) y decide ofrecer su artículo.
- **Flujo principal:**
  1. El Usuario A crea el trueque seleccionando el artículo propio que ofrece (NFT/cripto) y el **artículo que quiere recibir** según la publicación AtoA del Usuario B (RF-05.1, RF-04.1).
  2. El Sistema valida: usuario verificado (D14), límite de 3 activos (RF-14.4), rubros/nivel y que el artículo ofrecido está disponible.
  3. El Usuario A define la información de confianza del intercambio y el Sistema agrega el detalle completo del acuerdo (RF-04.5, RF-05.5).
  4. Las partes pactan el **punto de encuentro** (CU-16) y la **hora pautada** (RF-05.4, RF-05.7).
  5. El Usuario A **ofrece** su NFT/cripto: pasa a **custodia del escrow** (RF-05.2 → CU-12).
  6. El trueque queda **ACTIVE** on-chain y visible para el Usuario B, quien puede **completarlo** ofreciendo el NFT/cripto requerido (RF-05.1 → CU-12).
- **Flujos alternativos:**
  - **A1 — Usuario no verificado:** no puede crear ni completar el trueque; solo ve ofertas (RF-01.2, RF-14.3, D14).
  - **A2 — Máximo de 3 activos alcanzado:** el Sistema rechaza la creación de un nuevo intercambio activo (RF-14.4).
  - **A3 — Artículo ofrecido ya comprometido/custodiado:** el Sistema impide la doble oferta.
  - **A4 — Sin acuerdo de punto de encuentro o nivel no habilitado:** el Iniciado **no puede determinar lugares de intercambio** (RF-03.6) y debe acordar la zona registrada por la contraparte (Común o superior — RF-03.7); sin zona válida no se crea el trueque (RF-08.3).
- **Postcondiciones:** Intercambio creado con su escrow; el NFT del oferente queda custodiado (RF-05.2); estado ACTIVE on-chain e indexado en PostgreSQL.
- **Trazabilidad:** Cubre: RF-01.2, RF-04.1, RF-04.5, RF-05.1, RF-05.3, RF-05.5, RF-14.4, RF-14.6; Decisiones D14.

---

### CU-12 · Custodia en escrow al ofrecer o completar el trueque

- **Actores:** Usuario A / Usuario B (partes del trueque) · Contrato Escrow · Sistema (indexador → PostgreSQL).
- **Precondiciones:**
  - Existe un intercambio creado (CU-11) referenciado por su `escrowId`.
  - Las partes están verificadas (D14) y sus Smart Accounts activas.
- **Disparador:** Una parte **ofrece** su NFT/cripto (Usuario A al crear) o la contraparte **completa** el intercambio ofreciendo el NFT/cripto requerido (Usuario B — RF-05.1).
- **Flujo principal:**
  1. La parte deposita su NFT/cripto; el contrato **Escrow** recibe el activo en custodia (RF-05.2).
  2. El Sistema verifica que el depósito proviene de la Smart Account de una parte verificada (D16/D14).
  3. Al depositar el Usuario A y luego el Usuario B, ambos activos quedan **custodiados por el contrato escrow** (estado ACTIVE), que es la **única fuente de verdad** de ese estado (RNF-01.1).
  4. El contrato emite el evento de custodia; el **indexador propio** lo escucha y actualiza PostgreSQL (D25, RNF-03.2).
  5. Los activos permanecen en custodia **hasta que ambas partes firmen la recepción correcta** de lo negociado (RF-05.2 → CU-14) o se resuelva una anulación/disputa (RF-05.2b, RF-06 → CU-18/CU-19).
- **Flujos alternativos:**
  - **A1 — Depósito fallido (token no aprobado, error):** la custodia no se registra; el Sistema lo informa y el usuario reintenta.
  - **A2 — Anulación aprobada por Socios:** la liberación de los fondos custodiados **solo procede por quórum de Socios (≥2/3)** tras la solicitud de anulación, con plazo máximo de **5 días** desde la solicitud (RF-05.2b, D13 → CU-18).
  - **A3 — Subasta de empresa:** el artículo subastado queda custodiado en el escrow **al crearse la subasta** y vuelve a su billetera si no hay ganador o se anula (RF-17.3, RF-17.5 → CU-25).
- **Postcondiciones:** NFT/criptos de ambas partes custodiados en el escrow; ninguna parte puede retirarlos unilateralmente (RF-05.2); estados sincronizados on-chain → PostgreSQL.
- **Trazabilidad:** Cubre: RF-05.1, RF-05.2, RF-05.2b, RF-17.3, RF-17.5, RNF-01.1, RNF-03.2; Decisiones D13, D25.

---

### CU-13 · Apertura dual del intercambio (ventanas de 10 minutos)

- **Actores:** Usuario A / Usuario B (partes) · Contrato Escrow · Sistema.
- **Precondiciones:**
  - El intercambio está ACTIVE con los activos en custodia (CU-12) y **hora pautada** acordada.
  - Ambas partes concurren al punto de encuentro acordado (CU-16).
- **Disparador:** Llega la hora pautada del intercambio y las partes deben **aperturar** el proceso.
- **Flujo principal:**
  1. Cada parte apertura el intercambio en su dispositivo en el punto de encuentro.
  2. El Sistema/contrato valida la primera invariante: cada apertura ocurre **a no más de 10 minutos de la hora pautada** (RF-05.7, R5, RNF-06.2).
  3. El Sistema/contrato valida la segunda invariante: **no más de 10 minutos de diferencia entre la apertura de ambas partes** (RF-05.7, R5, RNF-06.2).
  4. Con ambas aperturas válidas (`aperturaA`, `aperturaB` registradas on-chain), el intercambio queda habilitado para la entrega y la certificación de recepción (RF-05.4 → CU-14).
  5. El evento se indexa y PostgreSQL actualiza el estado (D25).
- **Flujos alternativos:**
  - **A1 — Apertura fuera de ventana (±10 min de la hora pautada):** el contrato rechaza la apertura tardía; se registra la inasistencia/incumplimiento.
  - **A2 — Diferencia entre aperturas > 10 min:** la segunda apertura se rechaza y el proceso no avanza; el caso queda pendiente y las partes pueden recurrir al flujo de anulación justificada o disputa (RF-06, CU-18/CU-19).
  - **A3 — Una parte no apertura:** no hay apertura dual; la parte cumplidora puede iniciar el flujo de anulación/disputa (RF-06).
- **Postcondiciones:** Apertura dual registrada on-chain (invariantes 10 min/10 min cumplidas — RNF-06.2) o incumplimiento registrado que habilita anulación/disputa.
- **Trazabilidad:** Cubre: RF-05.7, RNF-06.2, R5.

---

### CU-14 · Completar el intercambio: verificación del usuario, certificación y firma de recepción

- **Actores:** Usuario A / Usuario B (partes Verificadas/Certificadas) · Contrato Escrow · Sistema (IPFS + indexador) · Relayer/Backend.
- **Precondiciones:**
  - Apertura dual válida realizada (CU-13).
  - **Ambas partes están verificadas**: completar un trueque exige estar Verificado (RF-01.2, RF-14.3, D14).
  - Los activos están custodiados en el escrow (CU-12).
- **Disparador:** Las partes se encuentran y entregan/reciben lo negociado en el punto de encuentro.
- **Flujo principal:**
  1. Cada parte **certifica si recibió o no** lo negociado (RF-05.4).
  2. Para certificar la recepción, cada parte sube la **imagen de recepción**, que se certifica como en la publicación: hash SHA-256 con metadata + wallet, almacenamiento en IPFS con pinning propio y **firma ECDSA de la wallet** (RF-11.1, RF-11.3); firma + hash se guardan en PostgreSQL y se agregan al acumulador merkle anclado on-chain (RF-11.4, D23).
  3. Si ambas partes confirman la **recepción correcta**, cada parte **firma la recepción** de lo negociado (RF-05.2).
  4. El Sistema verifica on-chain el estado de verificación de ambas partes (la operación de completar exige usuarios verificados — D14).
  5. Con las **firmas de recepción de ambas partes**, el contrato escrow **libera los activos custodiados** en favor de cada parte (transferencia cruzada) (RF-05.2).
  6. El contrato marca la recepción como certificada; el evento se indexa y PostgreSQL se actualiza (D25).
  7. El trueque queda pendiente del **cierre con valoración obligatoria** (RF-07.1, RNF-06.1 → CU-15): el estado **COMPLETED** (y su carácter de "intercambio efectivo") exige firmas de ambas partes **y valoración registrada** (RF-03.4, D12).
- **Flujos alternativos:**
  - **A1 — Parte no verificada:** el contrato impide completar el intercambio; la parte solo puede ver (RF-01.2, RF-14.3, D14).
  - **A2 — Recepción insatisfecha o rechazada:** la parte afectada declara no haber recibido correctamente; no se firma la recepción y se habilita la **solicitud de anulación justificada** (RF-06.1 → CU-18) o el flujo de disputa (RF-06 → CU-19).
  - **A3 — Evidencia de recepción inválida:** si la imagen/firma no valida contra el acumulador merkle, la certificación se rechaza y la recepción no se registra (RF-11.4 → CU-27).
  - **A4 — Violación de norma detectada en el acto:** el intercambio se **bloquea** y se solicita a ambas partes la autorización de cierre irregular (RF-05.8 → CU-17).
- **Postcondiciones:**
  - Recepción certificada con imagen (hash + firma ECDSA) y **firmas de recepción de ambas partes** on-chain; activos liberados por el escrow (RF-05.2).
  - El trueque queda listo para la **valoración obligatoria** que lo cierra como COMPLETED/efectivo (RF-07.1, RNF-06.1, RF-03.4/D12).
- **Trazabilidad:** Cubre: RF-01.2, RF-05.2, RF-05.3, RF-05.4, RF-07.1, RF-11.1, RF-11.3, RF-11.4, RNF-06.1, RNF-01.1; Decisiones D14, D23.

---

### CU-15 · Valoración mutua al cierre del trueque (escala 1–5)

- **Actores:** Usuario A / Usuario B (partes) · Sistema · Contrato Escrow.
- **Precondiciones:**
  - Ambas partes firmaron la recepción correcta (CU-14).
  - La valoración es **requisito indispensable del cierre**: no se puede cerrar un trueque sin valorar (RF-07.1, RNF-06.1, R8).
- **Disparador:** Las partes completan la entrega y el Sistema solicita las valoraciones para cerrar el trueque.
- **Flujo principal:**
  1. Cada parte valora **a la contraparte y a la actividad/lo negociado** en los **5 renglones** de reputación (RF-07.1, RF-07.2), cada uno en **escala 1–5** (D18):
     1. **Aceptación del producto** — apariencia y estado del artículo.
     2. **Honestidad publicitaria** — veracidad de la descripción en la publicación.
     3. **Seguridad** — certificados y evidencias legales del artículo.
     4. **Confiabilidad** — experiencia durante la actividad de intercambio.
     5. **Compromiso** — tiempo y novedades desde el acuerdo hasta la realización.
  2. El Sistema valida que cada renglón esté en el rango 1–5 y que ambas valoraciones existan (RNF-06.1).
  3. El contrato escrow cierra el trueque como **COMPLETED** (firmas de ambas partes + valoración registrada — RF-03.4, D12).
  4. El Sistema actualiza la **reputación** de cada usuario y dispara el **recálculo de nivel/medalla** (RF-03.3, D12 → CU-20).
  5. El Sistema aplica la **comisión base del 1 % del valor del trueque completado** al fondo de valor (D7, RF-03.9).
  6. El cierre se indexa y PostgreSQL registra la valoración (`valoraciones`) (D25).
- **Flujos alternativos:**
  - **A1 — Valoración incompleta o fuera de rango:** el cierre no procede; el Sistema solicita completar los 5 renglones en escala 1–5 (RNF-06.1, D18).
  - **A2 — Una parte no valora:** el trueque **no se cierra como COMPLETED** (no cuenta como "intercambio efectivo" — RF-03.4/D12); el Sistema lo recuerda a la parte pendiente.
  - **A3 — Valoración negativa por incumplimiento:** la baja valoración impacta la reputación y puede motivar la revisión por Socios/soporte si hubo infracción (RF-06.3, RF-18.3).
- **Postcondiciones:** Trueque **COMPLETED y efectivo** (firmas + valoración registrada, RF-03.4/D12); reputación actualizada por renglón; comisión 1 % al fondo (D7); medallas/niveles recalculados (CU-20).
- **Trazabilidad:** Cubre: RF-03.3, RF-03.4, RF-07.1, RF-07.2, RF-07.3, RNF-06.1, R8; Decisiones D7, D12, D18.

---

### CU-16 · Establecer punto de encuentro con mapa (≤10 km)

- **Actores:** Usuarios A/B (partes; proponente con nivel Común o superior) · Sistema (PostGIS + API de geolocalización + mapas) · Relayer/Backend.
- **Precondiciones:**
  - El proponente tiene nivel **Común o superior**: el nivel **Iniciado no puede determinar lugares de intercambio** (RF-03.6, R10).
  - El nivel **Común solo acepta o propone zonas ya registradas** por él o por la contraparte (RF-03.7, R11); el registro de direcciones particulares lo gestiona el usuario en su Perfil (RF-14.6).
  - La lógica de geolocalización vive **estrictamente off-chain** (PostgreSQL con PostGIS) partiendo de la dirección suministrada en la inscripción (RF-08.4, R3).
- **Disparador:** Las partes de un trueque deben acordar el **sitio de entrega** (RF-05.4).
- **Flujo principal:**
  1. El proponente elige en el **mapa** una zona registrada (propia o de la contraparte) como punto de encuentro (RF-03.7, RF-08.1).
  2. El Sistema calcula con **PostGIS** la distancia entre las direcciones de inscripción de ambas partes (RF-08.3, RF-08.4).
  3. El Sistema valida la invariante: la distancia entre las partes **no debe superar los 10 km** (RF-08.3, R3, RNF-06.2).
  4. La contraparte acepta el punto propuesto y se fija la **hora pautada** del encuentro (RF-05.4, RF-05.7).
  5. El punto de encuentro acordado se asocia al trueque (`puntoEncuentroId`).
  6. En la **versión móvil**, el Sistema ofrece la **ruta de cómo llegar** al punto de encuentro (RF-08.2).
- **Flujos alternativos:**
  - **A1 — Distancia > 10 km:** el Sistema rechaza el punto y sugiere zonas dentro del radio; el flujo vuelve al paso 1 (RF-08.3, R3).
  - **A2 — Proponente Iniciado:** no puede proponer; debe aceptar la zona registrada que proponga la contraparte (Común o superior — RF-03.6, RF-03.7).
  - **A3 — Zona no registrada:** el Sistema rechaza la propuesta hasta registrar la zona/dirección (RF-03.7, R11; registro de dirección en Perfil — RF-14.6).
  - **A4 — Sin acuerdo de punto:** no se crea/avanza el trueque (CU-11); las partes pueden disolver el acuerdo por los flujos de cancelación/anulación (RF-05.3, RF-06).
- **Postcondiciones:** Punto de encuentro acordado ≤10 km (invariante off-chain PostGIS — RF-08.3/08.4); ruta disponible en móvil (RF-08.2); asociado al trueque para la apertura dual (CU-13).
- **Trazabilidad:** Cubre: RF-03.6, RF-03.7, RF-05.4, RF-08.1, RF-08.2, RF-08.3, RF-08.4, R3, R10, R11, RNF-06.2.

---

### CU-17 · Bloqueo del intercambio por violación de norma

- **Actores:** Moderador / Owner (detección y ejecución — RF-18.2) · Usuarios A/B (partes) · Sistema (contrato escrow + alertas) · Usuarios Socios (si deriva a sanción).
- **Precondiciones:**
  - Existe un intercambio ACTIVE con activos en custodia (CU-12).
  - Se detecta una **violación de norma** (por alerta del Sistema, reporte de una parte o revisión de moderación — RF-18.2).
- **Disparador:** El Moderador/Owner (o una alerta del Sistema) identifica una violación de norma en el trueque.
- **Flujo principal:**
  1. El Sistema/Moderador detecta la violación de norma en el intercambio (RF-05.8, RF-18.2).
  2. El contrato escrow **bloquea el intercambio** (estado BLOCKED), congelando los activos custodiados (RF-05.8).
  3. El Sistema solicita a **ambas partes la autorización de cierre como irregular y no efectivo** (RF-05.8).
  4. Si ambas partes autorizan, el intercambio se cierra como **irregular/no efectivo** (no cuenta como intercambio efectivo — RF-03.4/D12) y los activos vuelven según lo resuelto.
  5. Si no hay acuerdo entre las partes, el caso deriva al flujo de **disputa/sanción con los Socios** (RF-06.2, RF-06.3 → CU-19).
  6. El Sistema registra el bloqueo y sus evidencias en el registro auditable (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Parte disconforme con el cierre irregular:** deriva a disputa de Socios (RF-06 → CU-19).
  - **A2 — Sanción:** si los Socios determinan sanción, el contrato la **ejecuta on-chain tras la resolución con timelock de 6 h** (RF-06.3, D21 → CU-19).
  - **A3 — Bloqueo indebido:** la parte afectada apela ante soporte (Owner + moderador — RF-18.3) y los Socios evalúan la sanción aplicada (RF-06.3).
- **Postcondiciones:** Intercambio bloqueado; cierre irregular autorizado por ambas partes **o** caso elevado a disputa de Socios; activos custodiados hasta la resolución (RF-05.2b).
- **Trazabilidad:** Cubre: RF-05.8, RF-03.4, RF-06.3, RF-18.2, RF-18.3, RF-18.6, R6; Decisiones D12, D21.

---

## 6. Módulo Anulación, disputas y sanciones

### CU-18 · Solicitar anulación justificada (quórum de Socios ≥2/3, máx. 5 días)

- **Actores:** Usuario A/B insatisfecho (solicitante) · Usuarios Socios (votación) · Contrato Escrow · Sistema.
- **Precondiciones:**
  - La recepción fue **insatisfecha o rechazada** por una de las partes (RF-06.1).
  - Los activos están custodiados en el escrow (CU-12).
- **Disparador:** La parte afectada solicita la **anulación justificando el motivo** (RF-06.1).
- **Flujo principal:**
  1. El usuario solicita la anulación del trueque **justificando el motivo** (RF-06.1).
  2. El contrato registra la `solicitudAnulacion` y el `solicitanteAnulacion`, fijando el **plazo máximo de resolución de 5 días** desde la solicitud (RF-05.2b, RF-06.1, D13).
  3. El Sistema somete la solicitud a **votación de los Socios** (RF-06.1).
  4. Los Socios votan con **quórum de ≥2/3** para aprobar la anulación y la consecuente liberación de fondos custodiados; **un voto por Socio** (RF-05.2b, RF-06.2, D21).
  5. Si se aprueba, el contrato escrow libera los activos y los **NFTs ofrecidos vuelven a las billeteras** de sus dueños (RF-06.1).
  6. El Sistema registra la resolución; el trueque queda CANCELLED/ANULADO (no cuenta como efectivo — RF-03.4/D12).
- **Flujos alternativos:**
  - **A1 — Quórum no alcanzado en el plazo:** si vence el plazo de **5 días** sin resolución, la solicitud **se resuelve por defecto según lo establecido en el flujo de disputas** (RF-05.2b → CU-19).
  - **A2 — Anulación rechazada:** los Socios rechazan (no alcanza 2/3); el trueque continúa su curso o deriva a disputa formal (RF-06 → CU-19).
  - **A3 — Solicitante retira la solicitud:** si la recepción se regulariza, la solicitud se cancela y el trueque puede completarse (CU-14).
- **Postcondiciones:** Anulación aprobada → devolución de activos a las billeteras (RF-06.1); o rechazo/vencimiento → resolución por defecto según flujo de disputas (RF-05.2b). Resolución dentro de los **5 días** (D13).
- **Trazabilidad:** Cubre: RF-05.2b, RF-06.1, RF-06.2, RF-03.4; Decisiones D12, D13, D21.

---

### CU-19 · Resolución de disputa por los Socios (timelock 6 h)

- **Actores:** Usuarios A/B (partes en conflicto) · Usuarios Socios (mediadores y jueces) · Contrato Escrow/contrato de sanciones · Sistema.
- **Precondiciones:**
  - Existe un conflicto no resuelto: recepción rechazada, bloqueo (CU-17), anulación vencida (CU-18) u otra controversia del trueque (RF-06).
- **Disparador:** Una parte (o el sistema tras un bloqueo/vencimiento) eleva el caso a disputa.
- **Flujo principal:**
  1. El caso ingresa a disputa con sus evidencias (certificaciones de imagen con hash + firma — RF-11.4, mensajes, valoraciones).
  2. Los **Socios actúan como mediadores y jueces** (RF-06.2), revisando la evidencia.
  3. En la deliberación, la evidencia aportada por usuarios de **mejor nivel tiene mayor peso** (RF-06.4); el voto de cada Socio es **único, sin ponderación por nivel** (D21).
  4. La resolución se aprueba con **quórum de ≥2/3 de los Socios** (RF-06.2, D21).
  5. Según la resolución, el contrato ejecuta on-chain: liberación a favor de una parte, anulación con devolución de activos (RF-06.1) y/o **sanción**.
  6. Las **sanciones se ejecutan on-chain por el contrato tras la resolución, con timelock de 6 h** (RF-06.3, D21), dando margen de revisión/evaluación a los Socios.
  7. El Sistema registra la resolución y actualiza el estado del trueque (COMPLETED/CANCELLED según el caso) y la reputación de los implicados.
- **Flujos alternativos:**
  - **A1 — Evaluación de sanciones por los Socios:** los Socios evalúan las sanciones aplicadas (RF-06.3); si procede, la ajustan antes de que venza el timelock de 6 h (D21).
  - **A2 — Disputa no resuelta por quórum:** la disputa permanece abierta con seguimiento de moderación/soporte (RF-18.3).
  - **A3 — Apelación:** la parte sancionada apela; el caso es revisado por los Socios (RF-06.3, RF-18.3).
- **Postcondiciones:** Disputa resuelta por **≥2/3 de los Socios** con ejecución on-chain (incluida sanción con **timelock de 6 h** — D21); registro auditable actualizado (RF-18.6).
- **Trazabilidad:** Cubre: RF-06.1, RF-06.2, RF-06.3, RF-06.4, RF-18.6; Decisiones D13, D21.

---

## 7. Módulo Reputación y niveles

### CU-20 · Calcular nivel y medalla por fórmula (D12)

- **Actores:** Sistema (cálculo automático) · Usuarios (destinatarios) · Contratos (NivelesReputacion).
- **Precondiciones:** Existe información suficiente de reputación, volumen e intercambios efectivos del usuario (tras valoraciones CU-15, anulaciones CU-18, disputas CU-19, etc.).
- **Disparador:** Eventos que alteran la reputación, el volumen efectivo o el ratio de apelaciones de un usuario (cierre de trueque, valoración, resolución de disputa/anulación).
- **Flujo principal:**
  1. El Sistema identifica el evento de reputación (valoración registrada, resolución de anulación/disputa — RF-07, RF-06).
  2. El Sistema recalcula el puntaje con la **fórmula aprobada (D12)**:
     `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)` (RF-03.3).
  3. El Sistema clasifica según los **umbrales** (RF-03.3):
     - **Iniciado**: puntaje 0–25 (medalla **Bronce**).
     - **Común**: puntaje 26–50 (medalla **Plata**).
     - **Frecuente**: puntaje 51–75 (medalla **Oro**; requisito para Empresa — RF-01.8).
     - **Socio**: puntaje ≥76 **+ solicitud formal y votación de los Socios** (RF-03.3 → CU-03).
  4. El Sistema aplica la **definición operativa de "intercambio efectivo" (D12)**: trueque con estado **COMPLETED**, **firmas de recepción de ambas partes** y **valoración registrada**; se **excluyen** los CANCELLED y los DISPUTED no resueltos (RF-03.4).
  5. El Sistema evalúa la medalla **Oro**: requiere **+1000 intercambios efectivos** y **≥90 % de ratio de efectividad** (cómputo acumulativo histórico — RF-03.4, RF-07.4).
  6. El Sistema actualiza nivel y medalla (sistema unificado D3: Bronce = Iniciado, Plata = Común, Oro = Frecuente — D4) y ajusta las **capacidades** del usuario (rubros/lugares/campañas según RF-03.6 a RF-03.9).
- **Flujos alternativos:**
  - **A1 — Descenso de nivel:** si el puntaje baja de umbral (p. ej., ratio de apelaciones alto), el Sistema degrada el nivel y revoca las capacidades superiores; el mapeo medalla↔nivel se mantiene (D3, D4).
  - **A2 — Ajustes por penalización:** la degradación por inactividad (CU-21) y las sanciones de Socios (CU-19) se reflejan en el nivel/medalla.
- **Postcondiciones:** Nivel y medalla actualizados según fórmula y umbrales (D12); capacidades del usuario coherentes con su nivel; eventos registrados para auditoría.
- **Trazabilidad:** Cubre: RF-01.8, RF-03.1, RF-03.2, RF-03.3, RF-03.4, RF-07.3, RF-07.4; Decisiones D3, D4, D12.

---

### CU-21 · Penalización automática por inactividad prolongada (nivel Común)

- **Actores:** Sistema (detección y ejecución automática) · Usuario Particular nivel Común (afectado) · Usuarios Socios / soporte (apelación).
- **Precondiciones:** El usuario tiene nivel **Común (Plata)** (RF-03.7).
- **Disparador:** El Sistema detecta **inactividad prolongada** combinada con alta presencia de artículos en el mercado.
- **Flujo principal:**
  1. El Sistema monitorea la actividad del usuario Común.
  2. El Sistema verifica las condiciones de la **penalización (D19)**: **inactividad prolongada = 180 días sin actividad** y el usuario mantiene **más del 5 % del volumen de artículos publicados en el mercado** (la base del 5 % es sobre el volumen de artículos publicados en el mercado — RF-03.7, D19).
  3. El Sistema ejecuta la penalización: **degradación de nivel a Iniciado** y **suspensión de nuevas publicaciones** (RF-03.7, D19).
  4. El Sistema notifica al usuario y registra la penalización en el registro auditable (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Apelación/evaluación:** el usuario apela ante soporte (RF-18.3) o los **Socios evalúan la sanción aplicada** (RF-06.3); si procede, se revierte o ajusta.
  - **A2 — Condiciones no cumplidas:** sin 180 días de inactividad o sin superar el 5 % del volumen, no hay penalización.
- **Postcondiciones:** Nivel degradado a Iniciado y publicaciones suspendidas (RF-03.7, D19), o sanción revertida/ajustada por los Socios (RF-06.3).
- **Trazabilidad:** Cubre: RF-03.7, RF-06.3, RF-18.3, RF-18.6; Decisión D19.

---

### CU-22 · Registrar establecimiento de retiro (aprobación de Socios)

- **Actores:** Usuario Frecuente (Oro; mayormente empresa) (primario) · Usuarios Socios (aprobación) · Sistema.
- **Precondiciones:**
  - El solicitante tiene nivel **Frecuente (Oro)** (RF-03.8) o es Empresa con suscripción activa (RF-10).
  - La **creación de establecimientos de retiro debe ser aprobada por los Socios** (RF-03.9).
- **Disparador:** El usuario Frecuente/Empresa desea habilitar un **establecimiento para retiro de artículos** y opción de **envíos/delivery** (RF-03.8).
- **Flujo principal:**
  1. El usuario registra el establecimiento (dirección y geolocalización).
  2. El Sistema valida los datos y somete el establecimiento a **aprobación de los Socios** (RF-03.9).
  3. Aprobado, el establecimiento queda disponible como punto de retiro/entrega para sus intercambios (RF-03.8).
  4. El usuario puede ofrecer la modalidad de **envíos o delivery** desde ese establecimiento (RF-03.8).
- **Flujos alternativos:**
  - **A1 — Rechazo de los Socios:** el establecimiento no se habilita y se notifica el motivo (RF-03.9).
  - **A2 — No cumple nivel Frecuente:** el registro se rechaza (RF-03.8).
- **Postcondiciones:** Establecimiento de retiro aprobado por Socios y operativo (RF-03.9); habilita delivery (RF-03.8).
- **Trazabilidad:** Cubre: RF-03.8, RF-03.9.

---

## 8. Módulo Gas, meta-transacciones y suscripciones

### CU-23 · Pago de gas de particulares: meta-transacción EIP-712 vía relayer

- **Actores:** Usuario Particular Verificado (firmante sin costo) · Relayer/Backend (envía y paga el gas) · Sistema (contratos + indexador) · Owner (operador/custodio de claves).
- **Precondiciones:**
  - El usuario es un **Particular Verificado** con Smart Account ERC-4337 (RF-02.1).
  - El relayer está operativo: **mínimo 2 instancias**, cola de reintentos, health-check y SLA ≥99 % (D15); el **fondo de valor financia el gas** con alerta de saldo bajo (D15, RF-03.9).
  - Las transacciones entre **particulares no deben generar costo de gas** (R1, RF-09.1).
- **Disparador:** El Particular Verificado ejecuta una operación on-chain (crear/completar trueque, custodiar NFT, anclar verificación, etc.) sin pagar gas.
- **Flujo principal:**
  1. El usuario firma criptográficamente su **intent** (Meta-Transacción **EIP-712**) con tipo de dato tipado y dominio con `chainId`, indicando la operación deseada (RF-09.1, RF-09.2, RT-03.1).
  2. El backend recibe el intent firmado por **endpoint autenticado con rate-limiting** y claves rotadas (RF-09.6, D16).
  3. El Relayer valida la **protección anti-replay**: **nonce único EIP-712 por cuenta** con dominio por `chainId` (RF-09.6, D16).
  4. El Relayer valida que la cuenta es una **Smart Account de un particular verificado** mediante **chequeo on-chain del estado de verificación** (RF-09.6, D16).
  5. El Relayer valida que no se excede el **límite diario de meta-transacciones por usuario** (RF-09.6, D16).
  6. El backend **envía la transacción a la blockchain asumiendo el gas** desde la cuenta relayer/cuenta general de la plataforma (RF-09.2; en anvil, cuenta 1 — RF-15.2).
  7. El contrato verifica la firma y el nonce y ejecuta la operación; el **indexador propio** escucha el evento y actualiza PostgreSQL (D25).
- **Flujos alternativos:**
  - **A1 — Nonce duplicado/replay:** el relayer rechaza el intent (protección anti-replay, D16).
  - **A2 — Cuenta no verificada o no particular:** el relayer rechaza: solo acepta intents de **Smart Accounts de particulares verificados** (RF-09.6, D16).
  - **A3 — Límite diario excedido:** el intent se rechaza hasta el día siguiente (RF-09.6, D16).
  - **A4 — Rate-limiting/autenticación:** peticiones sin credenciales o que exceden la tasa se rechazan (RF-09.6, D16).
  - **A5 — Falla de infraestructura:** la cola de reintentos y la segunda instancia absorben el fallo (health-check, D15); el **fondo de valor** financia el gas y alerta saldo bajo (D15, RF-03.9).
  - **A6 — Empresa:** las **empresas pagan el gas** de todas sus transacciones y no usan este flujo (R1, RF-09.3 → CU-24).
- **Postcondiciones:** Operación ejecutada on-chain **sin costo de gas para el particular** (R1); nonce consumido; evento indexado en PostgreSQL (D25).
- **Trazabilidad:** Cubre: RF-09.1, RF-09.2, RF-09.5, RF-09.6, RF-15.2, R1, RT-03.1; Decisiones D15, D16, D22, D25.

---

### CU-24 · Suscripción de empresa con cobro automático (cada 30 días)

- **Actores:** Usuario Empresa (primario) · Contrato de Suscripción (EIP-1337/staking) · Sistema · Owner (soporte de cobros) · Relayer/Backend.
- **Precondiciones:**
  - El usuario está clasificado como **Empresa** (CU-05) y pagó su inscripción (RF-09.4).
  - La empresa **paga el gas de sus transacciones** (R1, RF-09.3).
- **Disparador:** Se cumple el período de **30 días** desde el alta (o último cobro) de la suscripción.
- **Flujo principal:**
  1. El contrato inteligente implementa el **patrón de suscripción** (ej. **EIP-1337** o modelo de **staking bloqueado**) (RF-10.1, RT-03.4).
  2. El contrato **automatiza el cobro cada 30 días sin requerir que la empresa firme una transacción manual** (RF-10.1, R2).
  3. El Sistema registra el cobro (`suscripciones`: fecha, monto, txHash).
  4. El contrato aplica la distribución: **10 % de las suscripciones de empresas** alimenta el fondo de valor (D7, RF-03.9).
  5. Si el cobro falla, el Sistema lo reintenta y notifica; el soporte al usuario (Owner + moderador — RF-18.3) atiende los cobros de empresas.
- **Flujos alternativos:**
  - **A1 — Cobro fallido reiterado:** la suscripción queda en estado irregular y el soporte contacta a la empresa; mientras tanto se evalúan las funciones premium de la cuenta (RF-18.3).
  - **A2 — Baja de suscripción:** la empresa solicita la baja; se gestiona conforme a las condiciones y el contrato detiene el cobro automático.
- **Postcondiciones:** Suscripción activa con **cobro automático cada 30 días** (R2, RF-10.1); 10 % al fondo de valor (D7); empresa operativa pagando su gas (RF-09.3).
- **Trazabilidad:** Cubre: RF-09.3, RF-09.4, RF-10, RF-10.1, RF-18.3, R2, RT-03.4; Decisión D7.

---

## 9. Módulo Subastas de empresa (RF-17)

### CU-25 · Crear subasta de empresa (artículo custodiado en escrow)

- **Actores:** Usuario Empresa (primario) · Contrato Escrow · Sistema · Moderador/Owner (moderación).
- **Precondiciones:**
  - El creador es una **Empresa** (RF-17.1).
  - **Solo las Empresas pueden crear subastas** por artículos considerados buscados (RF-04.4, RF-17.1).
  - La empresa tiene suscripción activa y paga su propio gas (RF-10, RF-09.3).
- **Disparador:** La Empresa decide subastar un artículo buscado.
- **Flujo principal:**
  1. La Empresa crea la subasta definiendo: **artículo ofrecido**, **plazo de duración**, **puja inicial**, **incremento mínimo de puja** y los **artículo(s) que acepta recibir** (RF-17.3).
  2. El artículo ofrecido se **custodia en el contrato escrow al crearse la subasta** (RF-17.3 → CU-12).
  3. El Sistema valida la subasta y la publica en estado ABIERTA.
  4. Durante el plazo, los usuarios Certificados pujan (CU-26).
  5. Al cierre del plazo, la subasta se cierra y se determina el ganador (CU-26); si no hay ganador o la subasta se anula, los NFTs custodiados **vuelven a las billeteras** de sus dueños (RF-17.5).
- **Flujos alternativos:**
  - **A1 — Creador no Empresa:** la creación se rechaza (RF-17.1).
  - **A2 — Anulación de la subasta:** sin ganador o anulada por el subastador, los NFTs custodiados vuelven a la billetera del dueño (RF-17.5).
  - **A3 — Moderación:** si la subasta viola normas, el Moderador/Owner la bloquea (RF-18.2).
- **Postcondiciones:** Subasta ABIERTA con artículo custodiado en escrow (RF-17.3); al cierre, el ganador entra al flujo estándar de escrow (RF-17.4 → CU-26/CU-11).
- **Trazabilidad:** Cubre: RF-04.4, RF-17.1, RF-17.3, RF-17.5, RF-18.2.

---

### CU-26 · Pujar y adjudicar una subasta de empresa (prioridad por nivel)

- **Actores:** Usuarios Certificados (postores) · Usuario Empresa (subastadora) · Contrato Escrow · Sistema.
- **Precondiciones:**
  - Existe una subasta ABIERTA creada por una Empresa (CU-25).
  - **Solo los usuarios Certificados** pueden participar en subastas (RF-17.2).
  - Los postores ofrecen sus NFTs/criptos conforme a los **artículos que el subastador acepta recibir** (RF-17.3).
- **Disparador:** Un Usuario Certificado desea pujar por el artículo subastado.
- **Flujo principal:**
  1. El postor (Usuario Certificado — RF-17.2) registra su puja ofreciendo sus NFTs/criptos, respetando la **puja inicial** y el **incremento mínimo** (RF-17.3).
  2. El Sistema valida que el postor es Certificado y aplica la **prioridad según su nivel**: mayor nivel → mayor prioridad (RF-17.2).
  3. Las pujas se registran hasta el **plazo de duración** de la subasta.
  4. Al cierre, el Sistema determina el **mejor postor según prioridad de nivel y valor** (RF-17.4).
  5. El ganador pasa al **flujo estándar de escrow (RF-05)** para completar el trueque con la Empresa (RF-17.4 → CU-11/CU-12).
  6. Los NFTs de los postores no ganadores se liberan de la subasta.
- **Flujos alternativos:**
  - **A1 — Postor no Certificado:** la puja se rechaza (RF-17.2).
  - **A2 — Puja por debajo del mínimo/incremento:** la puja se rechaza (RF-17.3).
  - **A3 — Sin ganador o subasta anulada:** los NFTs custodiados (incluido el del subastador) **vuelven a las billeteras** de sus dueños (RF-17.5).
  - **A4 — Empate de valor:** prevalece el postor de **mayor nivel** (prioridad por nivel — RF-17.2, RF-17.4).
- **Postcondiciones:** Subasta adjudicada al **mejor postor por prioridad de nivel y valor** (RF-17.4); el trueque resultante continúa por el flujo estándar de escrow (RF-05) y, si no hay ganador, se devuelven los activos (RF-17.5).
- **Trazabilidad:** Cubre: RF-17.2, RF-17.3, RF-17.4, RF-17.5, RF-05.

---

## 10. Módulo Evidencia e imágenes (on-chain)

### CU-27 · Verificar evidencia de imagen on-chain (acumulador merkle)

- **Actores:** Sistema (verificación automática) · Auditor (Owner/auditoría externa/Socios revisores — RF-18.6) · Usuarios (aportan evidencia) · Contrato Escrow (raíz merkle anclada).
- **Precondiciones:**
  - Las imágenes de publicación y de recepción fueron certificadas (hash SHA-256 + firma ECDSA, IPFS con pinning propio — RF-11.1 a RF-11.3, D23).
  - La **raíz merkle (acumulador) de las certificaciones está anclada on-chain en el contrato escrow** (RF-11.4, D23).
- **Disparador:** Se requiere auditar/validar la autenticidad de una imagen certificada (disputa CU-19, bloqueo CU-17, auditoría RF-18.6 o verificación automática).
- **Flujo principal:**
  1. El auditor/sistema toma la imagen y su metadata (refId, wallet, tipo PUBLICACION/RECEPCION).
  2. El Sistema recupera el archivo desde **IPFS** y recalcula el **hash SHA-256** con la metadata y la wallet declaradas (RF-11.2).
  3. El Sistema verifica la **firma ECDSA** del hash contra la wallet del usuario (RF-11.3).
  4. El Sistema verifica la inclusión del hash en la **raíz merkle anclada on-chain** en el contrato escrow (prueba de inclusión — RF-11.4, D23).
  5. Si las tres comprobaciones son válidas, la evidencia queda **certificada como inmutable y auditable** (RNF-01.5).
  6. El resultado se registra y, en disputas, se incorpora a la deliberación de los Socios (RF-06.2, RF-06.4).
- **Flujos alternativos:**
  - **A1 — Hash/firma/raíz no coinciden:** la evidencia **no es válida** (posible manipulación); el caso se reporta a moderación/soporte (RF-18.2, RF-18.3) y puede motivar sanción de los Socios (RF-06.3).
  - **A2 — Archivo IPFS indisponible:** no se puede recomputar el hash; la evidencia queda pendiente de verificación y se notifica.
- **Postcondiciones:** Evidencia verificada contra **hash + firma + raíz merkle on-chain** (RF-11.4, D23); inmutabilidad y auditoría real garantizadas (RNF-01.5, RF-18.6).
- **Trazabilidad:** Cubre: RF-11.1, RF-11.2, RF-11.3, RF-11.4, RF-18.6, RNF-01.5; Decisión D23.

---

## 11. Módulo Administración (Owner, Moderador, Socios)

### CU-28 · Dashboard de administración del Owner

- **Actores:** Owner (primario, acceso exclusivo) · Sistema · Moderador (consulta/colaboración opcional).
- **Precondiciones:**
  - El usuario autenticado es el **Owner** (EO owner que despliega los contratos — RF-15.1).
  - El acceso a los servicios no públicos está **restringido** (RNF-01.6, RT-05.4).
- **Disparador:** El Owner accede al dashboard de administración de la plataforma.
- **Flujo principal:**
  1. El Owner se autentica e ingresa al **dashboard de acceso exclusivo del owner** (RF-13.1).
  2. El Owner gestiona las secciones de la plataforma (RF-13.1):
     - **Contratos desplegados**.
     - **Finanzas generales** (incluye configuración de porcentajes del fondo de valor — D7 → CU-30).
     - **Usuarios inscritos**.
     - **KPIs de disputas**.
     - **Base de datos off-chain**.
     - Cualquier **sub-módulo** necesario para verificar el rendimiento de la plataforma.
  3. El Owner opera/monitorea relayer + indexador + backend (Operador de Infraestructura — RF-18.1, D15) y revisa health-checks, cola de reintentos y saldo del fondo de gas (D15).
  4. El Owner custodia las claves **RELAYER/ADMIN_PRIVATE_KEY en Secret Manager** con política de **rotación** y separación de funciones (RF-18.5).
  5. Las acciones relevantes quedan en el registro auditable (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Acceso no autorizado:** un usuario distinto del Owner no puede ingresar (acceso restringido — RNF-01.6, RT-05.4).
  - **A2 — Rotación de claves:** ante sospecha de compromiso, el Owner rota las claves del Secret Manager (RF-18.5).
- **Postcondiciones:** Owner con visibilidad y control de todas las secciones (RF-13.1); infraestructura monitoreada (D15); claves custodiadas y rotadas (RF-18.5).
- **Trazabilidad:** Cubre: RF-13.1, RF-15.1, RF-18.1, RF-18.5, RF-18.6, RNF-01.6, RT-05.4; Decisiones D15, D25.

---

### CU-29 · Moderación de publicaciones y campañas

- **Actores:** Moderador / Owner (moderación — RF-18.2) · Usuarios autores · Sistema.
- **Precondiciones:** Existen publicaciones (CU-06), encargos (CU-07), campañas (CU-09/CU-10) o subastas (CU-25) activas sujetas a moderación (RF-18.2).
- **Disparador:** Un reporte de usuarios, una alerta automática o la revisión del Moderador/Owner detecta contenido que infringe las normas.
- **Flujo principal:**
  1. El Moderador/Owner revisa el contenido reportado o alertado (publicación, campaña, subasta — RF-18.2).
  2. El Moderador/Owner **bloquea la publicación/campaña** que viola las normas (RF-18.2).
  3. El Sistema notifica al autor con el motivo y registra la acción en el registro auditable (RF-18.6).
  4. El autor puede apelar vía soporte al usuario (Owner + moderador — RF-18.3).
- **Flujos alternativos:**
  - **A1 — Contenido válido:** el reporte se descarta y el contenido continúa activo.
  - **A2 — Violación de norma en un trueque activo:** se aplica el bloqueo de intercambio (RF-05.8 → CU-17).
  - **A3 — Apelación aceptada:** el Moderador/Owner restaura el contenido (RF-18.3).
- **Postcondiciones:** Contenido infractor bloqueado (RF-18.2); acciones de moderación auditables (RF-18.6).
- **Trazabilidad:** Cubre: RF-05.8, RF-18.2, RF-18.3, RF-18.6.

---

### CU-30 · Finanzas globales y fondo de valor (Owner + Socios)

- **Actores:** Owner (configuración) · Usuarios Socios (acceso Finanzas Globales) · Sistema (contratos + indexador).
- **Precondiciones:** El Owner está autenticado (RF-13.1); los Socios tienen rol activo (RF-14.8); el saldo BRLT solo es visible/gestionable para **Socios y Owner** (D5, RF-14.7).
- **Disparador:** El Owner configura los porcentajes del fondo o los Socios consultan las finanzas globales.
- **Flujo principal:**
  1. El Owner configura desde su dashboard los **porcentajes del fondo de valor** (D7): **comisión base del 1 % del valor de cada trueque completado**, **10 % de las suscripciones de empresas** y **5 % de la emisión de BRLT** — los tres **configurables por el Owner** (RF-03.9, D7).
  2. El Sistema aplica automáticamente las contribuciones en cada evento: trueque COMPLETED (1 % — RF-03.9/D7 → CU-15), cobro de suscripción (10 % → CU-24) y emisión de BRLT (5 % → CU-31).
  3. El fondo cubre los **gastos de operación** (hosting, gas, red de despliegue de contratos, etc.) (RF-03.9) y **financia el gas del relayer**, alertando saldo bajo (D15).
  4. Los **Socios acceden a Finanzas Globales**: gastos de mantenimiento de la plataforma, gastos de gas, etc. (RF-14.8).
  5. El registro financiero se mantiene auditado (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Saldo bajo del fondo de gas:** el Sistema alerta al Owner (Operador — D15) para recargar desde el fondo.
  - **A2 — Acceso no autorizado a saldos BRLT:** solo Socios y Owner gestionan/ven el saldo BRLT (D5, RF-14.7).
- **Postcondiciones:** Fondo de valor nutrido con 1 % + 10 % + 5 % configurable (D7); gastos operativos cubiertos (RF-03.9); finanzas globales visibles a Socios (RF-14.8).
- **Trazabilidad:** Cubre: RF-03.9, RF-13.1, RF-14.7, RF-14.8; Decisiones D5, D7, D15.

---

### CU-31 · Emisión y administración de la stablecoin BorloTokens (BRLT)

- **Actores:** Usuarios Socios (administración — RF-12.3) · Contrato BRLT (ERC-20 controlado por el contrato de Socios) · Sistema · Owner (supervisión).
- **Precondiciones:**
  - El contrato **BRLT** (ERC-20) está desplegado y es **controlado por el contrato de Socios** desde el inicio del proyecto (RF-12.1, RF-12.4, D6).
  - Solo los Socios administran la **emisión y el valor** de BRLT (RF-12.3).
- **Disparador:** Los Socios deciden una emisión o un ajuste de valor de BRLT.
- **Flujo principal:**
  1. Los Socios proponen la operación (emisión o ajuste de valor) sobre BRLT (RF-12.3).
  2. El contrato de Socios valida la autorización y ejecuta la emisión/ajuste en el contrato BRLT (RF-12.1, D6).
  3. El Sistema aplica la contribución del **5 % de la emisión de BRLT** al fondo de valor (D7, RF-03.9).
  4. El nivel **Frecuente** puede ofrecer artículos a cambio de **BRLT** (RF-12.2), liquidando en el intercambio correspondiente.
  5. El saldo BRLT es visible/gestionable **solo para Socios y Owner** (D5, RF-14.7).
  6. El registro se mantiene auditado (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Operación no autorizada por Socios:** el contrato de Socios rechaza la emisión/ajuste (control por el contrato de Socios — RF-12.1, D6).
- **Postcondiciones:** BRLT emitida/ajustada por los Socios desde el inicio (RF-12.1, D6); 5 % de la emisión al fondo (D7); Frecuente puede intercambiar por BRLT (RF-12.2).
- **Trazabilidad:** Cubre: RF-12.1, RF-12.2, RF-12.3, RF-12.4, RF-14.7; Decisiones D5, D6, D7.

---

## 12. Resumen de trazabilidad CU → RF

| Caso de uso | RF / Decisiones que cubre |
|---|---|
| **CU-01** · Registro/inscripción de Particular (ERC-4337) | RF-01.1, RF-01.3, RF-01.4, RF-02.1, RF-02.3, RF-09.1, RF-14.3, RF-16.1–16.2, R1 · D14, D15, D17, D22, D25 |
| **CU-02** · Verificación KYC (correo/teléfono/DNI/selfie) | RF-01.2, RF-01.5–01.7, RF-14.4, RF-18.4, RNF-01.3–01.4, RNF-01.7 · D14, D17 |
| **CU-03** · Solicitud y votación de Socio | RF-01.9, RF-03.3, RF-03.9, RF-14.8 · D12, D21 |
| **CU-04** · Recuperación de Smart Account (social/KYC) | RF-02.2, RF-18.3, RF-18.4, RF-18.6 |
| **CU-05** · Clasificación como Empresa | RF-01.1, RF-01.8, RF-04.4, RF-07.4, RF-09.3–09.4, RF-10, RF-14.7, R1, R2 · D5, D12 |
| **CU-06** · Publicar artículo AtoA con imagen certificada | RF-03.6–03.7, RF-04.1–04.2, RF-04.5, RF-11.1–11.4 · D14, D19, D23 |
| **CU-07** · Encargo de artículo no disponible | RF-04.3 |
| **CU-08** · Consultar catálogo/ofertas (Inscrito) | RF-14.1–14.3, RF-01.2, RF-05.5–05.6 · D14 |
| **CU-09** · Campaña de venta masiva | RF-03.8, RF-03.9, RF-12.2, RF-18.2 · D21 |
| **CU-10** · Campaña de recolecta por una causa | RF-03.9, RF-18.2 |
| **CU-11** · Crear intercambio (trueque) | RF-01.2, RF-04.1, RF-04.5, RF-05.1, RF-05.3, RF-05.5, RF-14.4, RF-14.6 · D14 |
| **CU-12** · Custodia en escrow | RF-05.1–05.2, RF-05.2b, RF-17.3, RF-17.5, RNF-01.1, RNF-03.2 · D13, D25 |
| **CU-13** · Apertura dual (ventanas 10 min) | RF-05.7, RNF-06.2, R5 |
| **CU-14** · Completar intercambio (verificación + firma de recepción) | RF-01.2, RF-05.2–05.4, RF-07.1, RF-11.1, RF-11.3–11.4, RNF-06.1, RNF-01.1 · D14, D23 |
| **CU-15** · Valoración mutua al cierre (1–5, 5 renglones) | RF-03.3–03.4, RF-07.1–07.3, RNF-06.1, R8 · D7, D12, D18 |
| **CU-16** · Punto de encuentro con mapa (≤10 km) | RF-03.6–03.7, RF-05.4, RF-08.1–08.4, R3, R10, R11, RNF-06.2 |
| **CU-17** · Bloqueo por violación de norma | RF-05.8, RF-03.4, RF-06.3, RF-18.2–18.3, RF-18.6, R6 · D12, D21 |
| **CU-18** · Anulación justificada (quórum 2/3, ≤5 días) | RF-05.2b, RF-06.1–06.2, RF-03.4 · D12, D13, D21 |
| **CU-19** · Disputa resuelta por Socios (timelock 6 h) | RF-06.1–06.4, RF-18.6 · D13, D21 |
| **CU-20** · Calcular nivel/medalla (fórmula D12) | RF-01.8, RF-03.1–03.4, RF-07.3–07.4 · D3, D4, D12 |
| **CU-21** · Penalización por inactividad (nivel Común) | RF-03.7, RF-06.3, RF-18.3, RF-18.6 · D19 |
| **CU-22** · Establecimiento de retiro (aprobación Socios) | RF-03.8, RF-03.9 |
| **CU-23** · Meta-transacción EIP-712 vía relayer | RF-09.1–09.2, RF-09.5–09.6, RF-15.2, R1, RT-03.1 · D15, D16, D22, D25 |
| **CU-24** · Suscripción de empresa (cobro automático) | RF-09.3–09.4, RF-10, RF-10.1, RF-18.3, R2, RT-03.4 · D7 |
| **CU-25** · Crear subasta de empresa | RF-04.4, RF-17.1, RF-17.3, RF-17.5, RF-18.2 |
| **CU-26** · Pujar/adjudicar subasta (prioridad por nivel) | RF-17.2–17.5, RF-05 |
| **CU-27** · Verificación de evidencia de imagen on-chain (merkle) | RF-11.1–11.4, RF-18.6, RNF-01.5 · D23 |
| **CU-28** · Dashboard del Owner | RF-13.1, RF-15.1, RF-18.1, RF-18.5–18.6, RNF-01.6, RT-05.4 · D15, D25 |
| **CU-29** · Moderación de publicaciones y campañas | RF-05.8, RF-18.2–18.3, RF-18.6 |
| **CU-30** · Finanzas globales y fondo de valor | RF-03.9, RF-13.1, RF-14.7–14.8 · D5, D7, D15 |
| **CU-31** · Emisión y administración de BRLT | RF-12.1–12.4, RF-14.7 · D5, D6, D7 |

**Total de casos de uso documentados: 31** (CU-01 a CU-31), cubriendo todos los módulos funcionales
de `requerimientos.md` (identidad/KYC, catálogo, campañas, trueques y escrow, anulación/disputas,
reputación, geolocalización, gas/relayer, suscripciones, subastas, evidencia on-chain y administración
Owner/Moderador/Socios) y a los 9 actores definidos en la sección 1.
