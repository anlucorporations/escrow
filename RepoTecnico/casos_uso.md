# TrueKeate — Casos de Uso (v2 — criterio analista funcional)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** |
| Documento | `RepoTecnico/casos_uso.md` |
| Rol | Analista funcional |
| Estado | v2 — 31 casos de uso (CU-01…CU-31) con criterios de aceptación verificables (Gherkin para comportamiento de actor; EARS para restricciones del sistema) y trazabilidad a RF/RNF/R/D. Incluye decisiones D1–D40 |
| Alcance | **CU-01 a CU-31** (todos los módulos: Identidad/registro/clasificación, Catálogo y publicaciones, Campañas, Intercambios y escrow, Anulación/disputas/sanciones, Reputación y niveles, Gas/meta-tx/suscripciones, Subastas, Evidencia on-chain, Administración) |
| Fuente | `requerimientos.md` (RF-01…RF-19, RNF-01…RNF-08, R1–R13, D1–D40) · `diccionario_datos.md` · `casos_uso_uml.puml` (diagramas en `CDU/`) |

> Convenciones: se respetan los **IDs CU existentes** (CU-01…CU-31) y los actores
> AU-1…AU-9. Cada criterio de aceptación se etiqueta **[Gherkin]** (comportamiento accionable por el
> actor, en `Dado/Cuando/Entonces`) o **[EARS]** (restricción o capacidad permanente del sistema, con
> `Mientras/Cuando/Si <condición>, el sistema <respuesta>` o `El sistema deberá <capacidad>`). Ningún
> criterio queda sin posibilidad de test: todos usan números y umbrales concretos de
> `requerimientos.md` (quórum ≥2/3, ≤5 días, timelock 6 h, ventanas 10 min/10 min, ≤10 km, escala
> 1–5, límites 5/20/50, fórmula D12/D30, escalera D28, EIP-712 con 4 protecciones, ERC-4337).

---

## 1. Actores

| ID | Actor | Descripción funcional |
|---|---|---|
| **AU-1** | **Usuario Particular Inscrito** | Usuario cuya billetera se inscribió automáticamente como Particular y formalizó su inscripción (correo, teléfono, dirección). Nivel inicial **Iniciado (medalla Bronce)**. Puede **ver** ofertas de intercambio y catálogo (RF-14.3), pero **no completa trueques** (requiere estado Verificado — RF-01.2b, D28). |
| **AU-2** | **Usuario Particular Verificado** | Particular Inscrito que **confirmó los códigos en correo y teléfono** (etapa 1 de verificación — RF-01.5, D28). Su estado de verificación queda **certificado on-chain** en la Smart Account vía hash/merkle (RF-01.7). **Crea y completa trueques** con **máximo 3 intercambios activos a la vez** (RF-14.4, RF-01.2b). |
| **AU-3** | **Usuario Particular Certificado** | Particular Verificado que **completó el proceso KYC** (documento de identidad + selfie — etapa 2, RF-01.5, D28). Acceso a **todas las operaciones de intercambio** de la plataforma y la administración de sus actividades (RF-14.5): crear/completar intercambios, sección Intercambio (incluida disputas), Perfil (agregar dirección particular, ver reputación) e Historial (RF-14.6). **Requisito para pujar en subastas de empresa** (RF-17.2). |
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

- **Objetivo del actor:** El usuario particular conecta su billetera y formaliza su inscripción para obtener su Smart Account ERC-4337 (wallet de identidad) y su perfil base en la plataforma.
- **Actores:** Usuario Particular Inscrito (primario) · Relayer/Backend · Sistema · Owner (soporte).
- **Precondiciones:**
  - El usuario posee una wallet compatible (MetaMask; RF-16.1) con auto-reconexión al refrescar (RF-16.2).
  - La plataforma está operativa: relayer con ≥2 instancias y SLA ≥99% (D15).
  - El usuario no posee aún una Smart Account activa en la plataforma (salvo flujo A1).
- **Flujo principal:**
  1. El usuario conecta su wallet (MetaMask) y el Sistema la detecta (RF-16.1).
  2. El Sistema verifica si la billetera ya está inscrita (`GET /auth/estado`); si NO lo está, la deja en **modo observación**: puede ver el catálogo, pero no operar (decisión del director: conectar NO inscribe — la inscripción es formal, RF-01.2b/01.3).
  3. El usuario inicia el **proceso de inscripción** desde el menú de usuario (botón "Completar inscripción") y aporta **correo, teléfono y dirección de inscripción** (RF-01.3); la dirección es la base de la geolocalización para puntos de encuentro (RF-08.4).
  4. El Sistema solicita el **consentimiento explícito GDPR** para el tratamiento de datos, incluidos los biométricos (selfie + documento; RNF-01.7, D17); sin consentimiento no se continúa.
  5. El Sistema registra al usuario como **Inscrito** (estado INSCRITO, escalera D28) en `usuarios` con nivel **Iniciado** y medalla **Bronce** (RF-03.6/D19); los campos PII se almacenan **cifrados en reposo** (D17, RNF-01.4).
  6. (Posterior, vía KYC) el Sistema despliega la **Smart Account ERC-4337** como wallet de identidad (RF-02.1, D22) mediante **meta-transacción EIP-712** vía relayer: el usuario firma el intent sin costo y el Relayer envía la transacción asumiendo el gas (RF-02.3, RF-09.1–09.2, R1).
  7. El Sistema confirma la inscripción y habilita el acceso de Inscrito: puede ver ofertas/catálogo (RF-14.3) y el resto de la suite según escalera D28.
- **Flujos alternativos:**
  - **A1 — Wallet ya registrada:** el Sistema detecta la inscripción existente (`/auth/estado` → inscrito) y ofrece inicio de sesión (auto-reconexión, RF-16.2); el flujo continúa en actualización de datos.
  - **A2 — Consentimiento no otorgado:** no se crea la cuenta ni se completa la inscripción; se informa al usuario (RNF-01.7).
  - **A3 — Falla de despliegue del Smart Account / error de red:** el Relayer reintenta desde su cola de reintentos con health-check (D15); si persiste, se notifica al soporte (Owner/moderador, RF-18.3).
  - **A4 — Correo o teléfono inválidos o no confirmados:** la inscripción queda incompleta y el usuario conserva solo el estado de billetera conectada (modo observación).
  - **A5 — Público general sin billetera:** solo accede a la landing pública (RF-14.1); el resto de la plataforma exige billetera conectada (decisión del director).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Acceso del público sin billetera.
    ```gherkin
    Dado un visitante sin billetera conectada
    Cuando intenta acceder a la suite o a un área privada
    Entonces el sistema le muestra la pantalla "Conecta tu billetera para continuar"
    Y solo le permite navegar la landing pública (RF-14.1)
    ```
  - **[Gherkin]** CA-01b · Wallet conectada sin inscribir → solo catálogo.
    ```gherkin
    Dado un usuario con una billetera MetaMask conectada pero SIN inscripción formal
    Cuando intenta acceder a la suite
    Entonces el sistema le permite SOLO ver el catálogo de trueques ofrecidos (RF-14.3)
    Y le ofrece el botón "Completar inscripción" en el menú de usuario
    Y le impide crear trueques, usar inventario, perfil u otras áreas privadas
    ```
  - **[Gherkin]** CA-02 · Inscripción formal con datos, consentimiento y acceso.
    ```gherkin
    Dado un usuario con la billetera conectada y no inscrita
    Cuando aporta correo, teléfono y dirección de inscripción y otorga el consentimiento GDPR explícito
    Entonces el sistema lo registra como Usuario Particular con estado INSCRITO (escalera D28)
    Y habilita el acceso a la suite según el estado Inscrito (ver ofertas y catálogo; sin crear trueques)
    ```
  - **[EARS]** Si el usuario no otorga el consentimiento GDPR explícito (incluido el tratamiento biométrico de selfie y documento), entonces el sistema no creará la cuenta ni desplegará la Smart Account.
  - **[EARS]** El sistema deberá cifrar en reposo todos los campos PII (correo, teléfono, dirección) almacenados en PostgreSQL.
  - **[EARS]** Mientras el usuario sea Particular Inscrito sin verificar, el sistema permitirá ver ofertas y catálogo pero impedirá crear o completar trueques.
  - **[Gherkin]** CA-06 · Wallet ya registrada (A1).
    ```gherkin
    Dado un usuario cuya billetera ya tiene una Smart Account en la plataforma
    Cuando conecta esa billetera
    Entonces el sistema detecta la cuenta existente y ofrece el inicio de sesión
    Y no despliega una Smart Account nueva
    ```
  - **[EARS]** Cuando el relayer procese un intent de despliegue EIP-712, rechazará los intents con nonce repetido o con dominio/chainId incorrecto (anti-replay, protección 1 de D16).
- **Trazabilidad:** Cubre: RF-01.1, RF-01.3, RF-01.4, RF-02.1, RF-02.3, RF-09.1, RF-09.6, RF-14.3, RF-16.1, RF-16.2, R1, RNF-01.4, RNF-01.7; Decisiones D14, D15, D16, D17, D22, D25.

---

### CU-02 · Verificación del usuario en dos etapas: Verificado (correo + teléfono) y Certificado (KYC)

- **Objetivo del actor:** El usuario particular Inscrito asciende en la escalera de estados (D28): primero **Verificado** (confirma códigos de correo y teléfono — habilita crear/completar trueques) y luego **Certificado** (completa el proceso KYC con documento + selfie — habilita todas las operaciones y subastas).
- **Actores:** Usuario Particular Inscrito (primario) · Owner (autoridad KYC, revisión humana) · Sistema · Relayer/Backend · Servicio verificador KYC.
- **Precondiciones:**
  - El usuario está **Inscrito** (CU-01) y otorgó el consentimiento GDPR explícito (RNF-01.7).
  - El servicio verificador (documento + selfie) está disponible (RF-18.4).
- **Flujo principal — Etapa 1 (Verificado):**
  1. El usuario inicia la verificación desde su suite.
  2. El Sistema envía un **código al correo** y un **código al teléfono** del usuario; el usuario los ingresa y el Sistema confirma la posesión de ambos canales (RF-01.5, D28).
  3. El Sistema clasifica al usuario como **Verificado** (crea/completa trueques, máx. 3 activos — RF-14.4) y certifica el estado on-chain en la Smart Account (RF-01.7).
- **Flujo principal — Etapa 2 (Certificado, KYC):**
  4. El usuario Verificado inicia el **proceso KYC**: carga **documento de identidad** y **selfie** (RF-01.5); el Sistema los valida de forma **automática vía servicio verificador** con revisión humana del Owner (RF-18.4).
  5. El Sistema almacena la **metadata del KYC cifrada en reposo** en PostgreSQL (documento, selfie y demás PII; D17, RNF-01.4). La identidad real permanece **confidencial** (RF-01.6, R4).
  6. El Sistema actualiza el **hash/merkle root** en la Smart Account para certificar **on-chain** el estado Certificado sin revelar la identidad real (RF-01.7).
  7. El Sistema registra el evento; el indexador actualiza PostgreSQL (D25).
  8. El Sistema confirma el estado **Certificado**, habilitando **todas las operaciones** de intercambio (RF-14.5) y la **participación en subastas** (RF-17.2).
- **Flujos alternativos:**
  - **A1 — Código de correo/teléfono incorrecto o vencido:** el Sistema no asciende a Verificado, permite reintentar y, ante fallos reiterados, bloquea temporalmente el envío.
  - **A2 — Rechazo automático o por revisión humana del KYC:** si el verificador no valida el documento/selfie o el Owner rechaza, el usuario **se mantiene Verificado** (no Certificado), se le notifica el motivo y el caso queda gestionado por el Owner (RF-18.4).
  - **A3 — Apelación:** el usuario apela el rechazo del KYC; el Owner re-evalúa (RF-18.4) y puede aprobar (se reanuda en el paso 6) o mantener el rechazo.
  - **A4 — Autorización expresa de identidad:** el Sistema divulga la identidad real **solo** con autorización expresa y únicamente para emitir facturas o certificados (RF-01.6, RNF-01.3).
  - **A5 — Borrado/olvido:** por solicitud del usuario o tras **24 meses de inactividad**, el Sistema elimina los datos KYC/PII conforme a la política de retención (D17, RNF-01.7).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Etapa 1 exitosa (Verificado).
    ```gherkin
    Dado un usuario Particular Inscrito con consentimiento GDPR otorgado
    Cuando el usuario ingresa correctamente el código enviado a su correo y el código enviado a su teléfono
    Entonces el sistema lo clasifica como Particular Verificado
    Y le habilita crear y completar trueques con un máximo de 3 intercambios activos simultáneos
    Y certifica el estado on-chain en su Smart Account
    ```
  - **[Gherkin]** CA-02 · Etapa 2 exitosa (Certificado por KYC).
    ```gherkin
    Dado un usuario Particular Verificado
    Cuando el servicio verificador valida su documento de identidad y selfie y el Owner aprueba la revisión humana
    Entonces el sistema lo clasifica como Particular Certificado
    Y actualiza el hash/merkle root en su Smart Account
    Y le habilita todas las operaciones de intercambio y la participación en subastas
    ```
  - **[Gherkin]** CA-03 · Rechazo del KYC (A2).
    ```gherkin
    Dado un usuario Particular Verificado en proceso KYC
    Cuando el servicio verificador no valida el documento o la selfie, o el Owner rechaza la revisión humana
    Entonces el sistema mantiene al usuario en estado Verificado (sin Certificar)
    Y le notifica el motivo del rechazo y registra el caso para gestión de apelaciones del Owner
    ```
  - **[EARS]** Si el estado on-chain de una parte del trueque no es VERIFICADO, entonces el contrato bloqueará la operación de completar el intercambio.
  - **[EARS]** Si el estado on-chain de un usuario no es CERTIFICADO, entonces el sistema le impedirá participar en subastas de empresa.
  - **[EARS]** El sistema deberá almacenar cifrada en reposo la metadata del KYC (documento y selfie) y no divulgar la identidad real sin autorización expresa; con autorización, solo la divulgará para emitir facturas o certificados.
  - **[EARS]** Mientras el usuario sea Particular Verificado, el sistema permitirá como máximo 3 intercambios activos simultáneos; al alcanzar 3, rechazará la creación de un cuarto.
  - **[Gherkin]** CA-08 · Apelación de rechazo KYC (A3).
    ```gherkin
    Dado un usuario Verificado cuyo rechazo KYC fue notificado
    Cuando el usuario apela y el Owner re-evalúa el caso aprobando la verificación
    Entonces el sistema continúa el flujo desde la certificación on-chain del estado Certificado
    ```
  - **[EARS]** Cuando el usuario solicite el borrado de sus datos o acumule 24 meses de inactividad, el sistema eliminará sus datos KYC/PII conforme a la política de retención GDPR.
  - **[Gherkin]** CA-10 · Autorización expresa de identidad (A4).
    ```gherkin
    Dado un usuario Particular Verificado o Certificado cuya identidad real está registrada
    Cuando el sistema necesita emitir una factura o certificado
    Entonces solo divulga la identidad real si el usuario otorgó autorización expresa para ese fin
    Y sin dicha autorización la identidad permanece confidencial
    ```
- **Trazabilidad:** Cubre: RF-01.2, RF-01.2b, RF-01.5, RF-01.6, RF-01.7, RF-14.4, RF-14.5, RF-17.2, RF-18.4, R4, RNF-01.3, RNF-01.4, RNF-01.7; Decisiones D14, D17, D28.

---

### CU-03 · Solicitud y votación de clasificación como Usuario Socio

- **Objetivo del actor:** El usuario con puntaje ≥76 presenta su solicitud formal y obtiene la clasificación como **Usuario Socio** mediante la votación de los demás Socios.
- **Actores:** Usuario Particular Verificado/Certificado con puntaje ≥76 (primario) · Usuarios Socios (votantes) · Sistema.
- **Precondiciones:**
  - El solicitante cumple el umbral de puntaje **≥76** según la fórmula de nivel D12 (RF-03.3).
  - Existe un cuerpo de Socios activo habilitado para votar (D21).
- **Flujo principal:**
  1. El usuario presenta la **solicitud formal** de clasificación como Socio (RF-01.9).
  2. El Sistema valida que el solicitante alcance el puntaje **≥76** (RF-03.3) y que no tenga sanciones o disputas pendientes relevantes.
  3. El Sistema somete la solicitud a **votación de los demás Usuarios Socios** (RF-01.9).
  4. Cada Socio emite **un voto, sin ponderación por nivel** (D21).
  5. El Sistema contabiliza: la admisión se aprueba con **quórum de ≥2/3 de los Socios** (RF-01.9, RF-03.9, D21).
  6. Si se aprueba, el Sistema clasifica al usuario como **Usuario Socio** y le habilita las funciones del rol (mediador/juez en disputas, administración de BRLT, finanzas globales, etc.; RF-03.9, RF-14.8).
  7. El Sistema registra la resolución y actualiza el estado del usuario.
- **Flujos alternativos:**
  - **A1 — Quórum no alcanzado:** la solicitud se rechaza; el usuario conserva su nivel/medalla actuales y puede volver a postularse (sin restricción adicional en RF).
  - **A2 — Puntaje insuficiente:** la solicitud no se admite a votación hasta alcanzar puntaje ≥76 (RF-03.3).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Solicitud admitida a votación.
    ```gherkin
    Dado un usuario Verificado o Certificado con puntaje ≥76 según la fórmula D12
    Cuando presenta la solicitud formal de clasificación como Socio
    Entonces el sistema valida los requisitos y somete la solicitud a votación de los demás Socios
    ```
  - **[EARS]** Si el puntaje del solicitante es menor que 76, entonces el sistema rechazará la solicitud sin someterla a votación.
  - **[Gherkin]** CA-03 · Admisión por quórum.
    ```gherkin
    Dado una solicitud de Socio en votación
    Cuando al menos 2/3 de los Socios votan a favor
    Entonces el sistema clasifica al usuario como Usuario Socio
    Y habilita las funciones del rol (disputas, administración de BRLT, finanzas globales)
    ```
  - **[EARS]** El sistema deberá contabilizar exactamente un voto por Socio, sin ponderación por nivel, y declarar no aprobada la admisión si el quórum de 2/3 no se alcanza.
  - **[Gherkin]** CA-05 · Quórum no alcanzado (A1).
    ```gherkin
    Dado una solicitud de Socio en votación
    Cuando la aprobación no alcanza el quórum de 2/3 de los Socios
    Entonces el sistema rechaza la solicitud
    Y el usuario conserva su nivel y medalla actuales y puede volver a postularse
    ```
- **Trazabilidad:** Cubre: RF-01.9, RF-03.3, RF-03.9, RF-14.8; Decisiones D12, D21.

---

### CU-04 · Recuperación de Smart Account (social / KYC)

- **Objetivo del actor:** El usuario que perdió el acceso a su Smart Account lo recupera por vía social o vinculada al KYC, manteniendo intactos sus fondos y la descentralización.
- **Actores:** Usuario Particular Verificado (primario) · Owner / Moderador (soporte) · Sistema · Servicio verificador KYC.
- **Precondiciones:**
  - El usuario perdió el acceso a su Smart Account (clave privada/seed/wallet) y lo reporta.
  - La Smart Account ERC-4337 tiene configurados guardianes sociales o vínculo KYC (RF-02.2).
- **Flujo principal (recuperación social):**
  1. El usuario inicia la recuperación indicando su identidad/correo/teléfono.
  2. El Sistema verifica la identidad inicial por canal seguro (correo/teléfono).
  3. Los **guardianes sociales** designados (máx. 3 guardianes — D34) aprueban la recuperación (RF-02.2).
  4. La Smart Account **restablece el owner/acceso** sin mover los fondos custodiados, manteniendo la **descentralización de los fondos** (RF-02.2).
  5. El Sistema registra la recuperación y notifica al usuario.
- **Flujo principal (recuperación vinculada al KYC):**
  1. El usuario solicita la recuperación aportando **documento de identidad + selfie** (RF-02.2).
  2. El servicio verificador valida la identidad de forma automática y el Owner realiza la **revisión humana** (RF-18.4).
  3. Verificada la identidad, la Smart Account restablece el acceso manteniendo los fondos (RF-02.2).
  4. El Sistema registra la recuperación. *(Nota: la vía KYC **nunca es automática solo con datos** — exige revisión humana del Owner; no es el único mecanismo — D34/H-18.)*
- **Flujos alternativos:**
  - **A1 — Identidad no acreditada:** la recuperación se rechaza y el caso pasa a soporte al usuario (Owner + moderador, RF-18.3).
  - **A2 — Sin guardianes ni KYC previo:** el usuario no cumple ninguna vía; el soporte evalúa el caso y, de ser procedente, inicia un proceso asistido documentado (RF-18.3).
  - **A3 — Intento de recuperación fraudulenta:** se bloquea el intento, se notifica al titular y el hecho queda en el registro auditable (RF-18.6).
  - **A4 — Timelock de aviso en curso:** durante las **48 h de aviso** (D34) el titular legítimo puede **cancelar** la recuperación antes de que se ejecute el cambio de owner.
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Recuperación social aprobada.
    ```gherkin
    Dado un usuario que perdió el acceso y cuya Smart Account tiene guardianes sociales designados
    Cuando inicia la recuperación y al menos 2 de los 3 guardianes designados aprueban la solicitud (umbral 2/3 — D34)
    Entonces la Smart Account inicia el timelock de aviso de 48 horas
    Y transcurrido el timelock sin cancelación del titular, restablece el owner/acceso de la cuenta
    Y los fondos custodiados permanecen intactos en la misma Smart Account
    ```
  - **[Gherkin]** CA-02 · Recuperación vinculada al KYC.
    ```gherkin
    Dado un usuario que perdió el acceso y cuya Smart Account está vinculada a su KYC
    Cuando aporta documento de identidad y selfie que el servicio verificador valida y el Owner aprueba en revisión humana
    Entonces la Smart Account restablece el acceso del usuario tras el timelock de aviso de 48 horas
    Y los fondos custodiados permanecen intactos
    ```
  - **[EARS]** La recuperación social deberá requerir la aprobación de al menos 2 de los 3 guardianes designados (umbral 2/3 — D34).
  - **[EARS]** El sistema deberá ejecutar el cambio de owner de una Smart Account solo después de transcurridas 48 horas desde la aprobación de la recuperación (timelock de aviso — D34), permitiendo al titular legítimo cancelar el intento durante ese plazo.
  - **[EARS]** El sistema no deberá ejecutar la recuperación vinculada al KYC de forma automática solo con datos biométricos: exigirá revisión humana del Owner (D34, H-18).
  - **[EARS]** Mientras dure un proceso de recuperación, el sistema deberá mantener intactos los fondos custodiados en la Smart Account (la recuperación no mueve activos).
  - **[EARS]** Cuando la identidad no pueda acreditarse por ninguna vía (social ni KYC), el sistema rechazará la recuperación y derivará el caso al soporte (Owner + moderador).
  - **[EARS]** Si se detecta un intento de recuperación fraudulenta, el sistema bloqueará el intento, notificará al titular y registrará el evento en el registro auditable.
- **Trazabilidad:** Cubre: RF-02.2, RF-18.3, RF-18.4, RF-18.6; Decisiones D34.

---

### CU-05 · Clasificación como Usuario Empresa

- **Objetivo del actor:** El usuario Particular Certificado con clasificación Oro se clasifica como **Usuario Empresa**, pagando su inscripción y aceptando la suscripción automática.
- **Actores:** Usuario Particular Certificado con Oro (primario) · Owner (aprobación) · Sistema · Relayer/Backend (pago de inscripción).
- **Precondiciones:**
  - El solicitante está **certificado** y tiene clasificación **Oro**: nivel Frecuente con +1000 intercambios efectivos y ≥90% de ratio de efectividad (RF-01.8, RF-03.4, RF-07.4).
- **Flujo principal:**
  1. El usuario solicita la clasificación como Empresa (RF-01.8).
  2. El Sistema valida los requisitos: estado **certificado** y clasificación **Oro** (RF-01.8, RF-07.4).
  3. El usuario **paga la inscripción** de empresa (RF-09.4); el pago lo ejecuta la empresa con su propio gas (R1, RF-09.3).
  4. El usuario acepta la **suscripción automática cada 30 días** (R2, RF-10) que el contrato cobrará sin firma manual (RF-10.1).
  5. El Owner/el Sistema confirma la clasificación y habilita la suite de Empresa (RF-14.7, D5).
  6. El Sistema notifica al usuario y registra el evento.
- **Flujos alternativos:**
  - **A1 — No cumple Oro o no está certificado:** la solicitud se rechaza hasta cumplir los requisitos (RF-01.8).
  - **A2 — Pago de inscripción fallido:** no se clasifica como Empresa y se notifica al usuario (soporte, RF-18.3).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Clasificación exitosa.
    ```gherkin
    Dado un usuario Particular Certificado con clasificación Oro (+1000 intercambios efectivos y ratio de efectividad ≥90%)
    Cuando solicita la clasificación Empresa, paga la inscripción y acepta la suscripción automática de 30 días
    Entonces el sistema lo clasifica como Usuario Empresa
    Y habilita la suite de Empresa (inventario, direcciones de encuentro, finanzas, promociones y subastas)
    ```
  - **[EARS]** Si el solicitante no está Certificado o no tiene clasificación Oro, entonces el sistema rechazará la solicitud de clasificación como Empresa.
  - **[EARS]** El sistema deberá ejecutar el cobro automático de la suscripción de empresa cada 30 días mediante el contrato de suscripción, sin requerir una firma manual de la empresa en cada período.
  - **[EARS]** Cuando un Usuario Empresa ejecute transacciones en la plataforma, el gas será sufragado por la empresa (R1/RF-09.3) y no por el relayer.
  - **[Gherkin]** CA-05 · Pago de inscripción fallido (A2).
    ```gherkin
    Dado un usuario Certificado con Oro que inició la clasificación Empresa
    Cuando el pago de la inscripción falla o la suscripción no queda activa
    Entonces el sistema no clasifica al usuario como Empresa
    Y le notifica el estado para que lo resuelva con soporte
    ```
- **Trazabilidad:** Cubre: RF-01.1, RF-01.8, RF-04.4, RF-07.4, RF-09.3, RF-09.4, RF-10.1, RF-14.7, RF-17.1, R1, R2; Decisiones D5, D12.

---

## 3. Módulo Catálogo y publicaciones

### CU-06 · Publicar artículo (AtoA) con certificación de imagen

- **Objetivo del actor:** El usuario Verificado (o Empresa) publica un artículo para intercambio (AtoA, indicando qué quiere recibir) con su imagen certificada (hash + firma + IPFS + raíz merkle on-chain).
- **Actores:** Usuario Particular (Verificado/Certificado) o Empresa (primario) · Relayer/Backend · Sistema (IPFS + escrow + indexador) · Moderador/Owner (moderación).
- **Precondiciones:**
  - El usuario está **verificado** y su nivel habilita la publicación en el rubro elegido (el nivel manda sobre el tipo — D14).
  - Límites por nivel: Particular ≤5 artículos; nivel Común amplía a 50 (RF-04.2, D14); Empresa puede ofrecer más de 5 (RF-04.4). Rubros: Iniciado ≤5 rubros (RF-03.6); Común ≤20 rubros (RF-03.7).
  - Nivel Iniciado: solo publica en rubros de **alta disponibilidad** (≥10 publicaciones activas de ≥5 usuarios distintos en los últimos 30 días) y donde cumpla **≥3% de las transacciones del rubro en 90 días** (RF-03.6, D19).
- **Flujo principal:**
  1. El usuario crea la publicación **Artículo por Artículo (AtoA)** indicando el artículo que quiere recibir a cambio (RF-04.1) e incluye la información que genera confianza (descripción, estado, evidencias; RF-04.5).
  2. El Sistema valida el rubro y los límites del nivel (5/20/50 artículos y rubros según nivel; RF-03.6, RF-03.7, RF-04.2).
  3. El usuario sube la imagen de la publicación.
  4. El Sistema calcula el **hash SHA-256** de la imagen con su metadata y la wallet del usuario conectado (RF-11.1, RF-11.2) y la almacena en **IPFS con pinning propio** (RF-11.2, D23).
  5. La **wallet del usuario firma el hash (ECDSA)** (RF-11.3).
  6. El Sistema persiste **firma y hash en PostgreSQL** (`imagenes_certificadas`; RF-11.4).
  7. El Sistema agrega la certificación al **acumulador merkle** y **ancla la raíz on-chain en el contrato escrow** (RF-11.4, D23).
  8. El Sistema crea el artículo en el catálogo y lo publica como disponible.
- **Flujos alternativos:**
  - **A1 — Límite superado (5/20/50):** la publicación se rechaza hasta liberar cupo (RF-04.2, D14).
  - **A2 — Rubro no habilitado para el nivel:** para Iniciado, rubros sin alta disponibilidad o sin participación ≥3% (90 días) se rechazan (RF-03.6, D19); para Común, superar 20 rubros se rechaza (RF-03.7).
  - **A3 — Fallo de certificación (hash/IPFS/firma):** la imagen no queda certificada y la publicación no se habilita; el sistema lo informa (RF-11).
  - **A4 — Publicación que viola normas:** el Moderador/Owner la bloquea y notifica al autor (RF-18.2).
  - **A5 — Inactividad penalizada:** si el nivel Común fue penalizado, tiene suspendidas las nuevas publicaciones (D19).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Publicación exitosa con imagen certificada.
    ```gherkin
    Dado un usuario Verificado (o Empresa) cuyo nivel habilita el rubro elegido
    Cuando crea una publicación AtoA indicando el artículo que quiere recibir, sube la imagen y completa la información de confianza
    Entonces el sistema certifica la imagen con hash SHA-256 (imagen + metadata + wallet) almacenada en IPFS con pinning propio
    Y valida la firma ECDSA de la wallet, persiste hash y firma en PostgreSQL y ancla la raíz merkle en el contrato escrow
    Y publica el artículo como disponible en el catálogo
    ```
  - **[EARS]** Si un usuario Particular alcanzó el límite de 5 artículos publicados (o 50 si su nivel es Común), el sistema rechazará la nueva publicación hasta liberar cupo; el nivel manda sobre el tipo de usuario.
  - **[EARS]** Si el usuario es de nivel Iniciado, el sistema solo permitirá publicar en rubros con alta disponibilidad (≥10 publicaciones activas de ≥5 usuarios distintos en los últimos 30 días) y en los que cumpla una participación ≥3% de las transacciones del rubro en 90 días.
  - **[EARS]** Si el nivel Común del usuario ya declara 20 rubros, el sistema rechazará la publicación en un rubro nuevo (máximo 20 rubros).
  - **[EARS]** El sistema deberá exigir, antes de publicar, que la imagen tenga persistidos su hash SHA-256 y la firma ECDSA de la wallet y que la raíz merkle quede anclada on-chain en el contrato escrow.
  - **[Gherkin]** CA-06 · Fallo de certificación (A3).
    ```gherkin
    Dado una publicación en proceso de creación con imagen subida
    Cuando falla el cálculo del hash SHA-256, el almacenamiento en IPFS o la firma ECDSA
    Entonces el sistema no habilita la publicación
    Y informa al usuario del error de certificación
    ```
  - **[EARS]** Mientras un usuario tenga suspendidas las nuevas publicaciones por penalización de inactividad prolongada, el sistema bloqueará la creación de cualquier publicación nueva.
- **Trazabilidad:** Cubre: RF-03.6, RF-03.7, RF-04.1, RF-04.2, RF-04.5, RF-11.1, RF-11.2, RF-11.3, RF-11.4; Decisiones D14, D19, D23.

---

### CU-07 · Solicitar encargo de un artículo no disponible en el mercado

- **Objetivo del actor:** El usuario Verificado solicita como **encargo** un artículo que no está en el mercado, ofreciendo algo a cambio.
- **Actores:** Usuario Particular Verificado/Certificado (primario) · Sistema · (otros usuarios que puedan ofrecer el artículo).
- **Precondiciones:**
  - El usuario está verificado y puede operar (RF-01.2/D14).
  - El artículo deseado **no tiene publicación activa** en el mercado.
- **Flujo principal:**
  1. El usuario crea la solicitud de **encargo** del artículo no disponible, **ofreciendo algo a cambio** (RF-04.3).
  2. El Sistema valida la oferta a cambio (artículo propio, rubro y límites del nivel).
  3. El Sistema publica el encargo en el mercado como pedido activo.
  4. Otros usuarios pueden tomar el encargo ofreciendo el artículo pedido.
  5. Si un usuario lo toma, el Sistema deriva el caso a la creación de un intercambio (CU-11) entre ambos.
  6. El encargo permanece activo hasta que se materialice un intercambio o el solicitante lo cancele.
- **Flujos alternativos:**
  - **A1 — Nadie toma el encargo:** permanece publicado; el solicitante puede retirarlo o ajustar la oferta.
  - **A2 — El artículo aparece luego en el mercado:** el Sistema lo sugiere al solicitante para crear un intercambio directo (CU-11).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Creación de encargo.
    ```gherkin
    Dado un usuario Verificado que busca un artículo sin publicación activa en el mercado
    Cuando crea la solicitud de encargo ofreciendo un artículo propio a cambio
    Entonces el sistema valida la oferta (artículo, rubro y límites del nivel)
    Y publica el encargo como pedido activo en el mercado
    ```
  - **[Gherkin]** CA-02 · Encargo tomado.
    ```gherkin
    Dado un encargo activo publicado
    Cuando otro usuario ofrece el artículo solicitado
    Entonces el sistema deriva el caso a la creación de un intercambio (CU-11) entre el solicitante y el oferente
    ```
  - **[EARS]** Si el artículo solicitado ya existe como publicación activa en el mercado, el sistema no creará el encargo y sugerirá al solicitante el intercambio directo con el publicador.
  - **[EARS]** Mientras un encargo esté activo (no tomado ni cancelado por el solicitante), el sistema lo mantendrá visible como pedido activo en el mercado.
- **Trazabilidad:** Cubre: RF-04.3.

---

### CU-08 · Consultar catálogo y ofertas de intercambio (Usuario Particular Inscrito)

- **Objetivo del actor:** El Usuario Particular Inscrito explora el catálogo y las ofertas de intercambio con la información de confianza, sin necesidad de estar verificado para **ver**.
- **Actores:** Usuario Particular Inscrito (primario) · Sistema.
- **Precondiciones:** El usuario está Inscrito (CU-01); ver (no operar) no exige verificación (RF-14.3, D14).
- **Flujo principal:**
  1. El usuario accede al catálogo y a las **ofertas de intercambio** (RF-14.2, RF-14.3).
  2. El Sistema muestra los artículos, publicaciones e intercambios activos con **toda la información que da confianza** (RF-05.5) e indica qué es on-chain y qué off-chain (RF-05.6).
  3. El usuario revisa ofertas, perfiles/reputación pública y condiciones (RF-14.2).
- **Flujos alternativos:**
  - **A1 — Intento de completar o crear un trueque sin verificación:** el Sistema bloquea la operación e informa que **completar un intercambio exige estar Verificado** (RF-01.2, RF-14.3, D14), guiando al usuario al KYC (CU-02).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Consulta del catálogo.
    ```gherkin
    Dado un Usuario Particular Inscrito
    Cuando accede al catálogo y a las ofertas de intercambio
    Entonces el sistema muestra las publicaciones e intercambios activos con la información de confianza
    Y señala qué elementos del detalle son on-chain y cuáles off-chain
    ```
  - **[EARS]** Cuando un Usuario Particular Inscrito (sin verificar) intente crear o completar un trueque, el sistema bloqueará la operación y le ofrecerá el flujo de verificación KYC (CU-02); solo podrá ver las ofertas.
  - **[Gherkin]** CA-03 · Privacidad en la consulta de perfiles.
    ```gherkin
    Dado un Usuario Particular Inscrito navegando por el catálogo
    Cuando consulta el perfil o la reputación pública de otro usuario
    Entonces el sistema muestra solo información pública autorizada (nivel, medalla, reputación)
    Y no revela la identidad real del usuario consultado
    ```
- **Trazabilidad:** Cubre: RF-01.2, RF-05.5, RF-05.6, RF-14.1, RF-14.2, RF-14.3; Decisión D14.

---

## 4. Módulo Campañas (Frecuente/Socio)

### CU-09 · Crear y aprobar campaña de venta masiva

- **Objetivo del actor:** El usuario de nivel Frecuente (Oro) lanza una campaña de venta masiva de artículos, aprobada por los Socios, para ofrecer sus artículos en volumen.
- **Actores:** Usuario Frecuente (medalla Oro; mayormente empresa) (primario) · Usuarios Socios (aprobación) · Sistema · Moderador/Owner (moderación).
- **Precondiciones:**
  - El creador tiene nivel **Frecuente (Oro)** (RF-03.8); si es Empresa, con suscripción activa (RF-10).
  - Las campañas de venta masiva requieren **aprobación de los Socios** (RF-03.9).
- **Flujo principal:**
  1. El usuario Frecuente crea la campaña de venta masiva con sus artículos (muchos rubros declarados; RF-03.8).
  2. Opcionalmente define modalidad de **envíos/delivery** y **establecimiento para retiro** (RF-03.8; el establecimiento debe estar aprobado por los Socios — RF-03.9).
  3. El Sistema somete la campaña a **aprobación de los Socios** (RF-03.9).
  4. Los Socios aprueban la campaña (gobernanza de Socios, D21).
  5. Aprobada, la campaña se activa y los interesados participan; el nivel Frecuente puede ofrecer artículos por **BRLT** (RF-12.2).
  6. Al finalizar la campaña, el Sistema cierra los intercambios pendientes y calcula resultados/reputación.
- **Flujos alternativos:**
  - **A1 — Rechazo de los Socios:** la campaña no se publica y se notifica al creador con el motivo.
  - **A2 — Moderación:** si la campaña viola normas, el Moderador/Owner la bloquea (RF-18.2).
  - **A3 — Violación de norma durante la campaña:** los intercambios afectados se bloquean y derivan al flujo de bloqueo por violación (RF-05.8).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Campaña creada y aprobada.
    ```gherkin
    Dado un usuario de nivel Frecuente (Oro) con suscripción activa si es Empresa
    Cuando crea la campaña de venta masiva y los Socios la aprueban
    Entonces el sistema activa la campaña y los interesados pueden participar ofreciendo sus artículos
    Y el creador (nivel Frecuente) puede ofrecer artículos por BRLT en la campaña
    ```
  - **[EARS]** Si el creador no tiene nivel Frecuente, el sistema rechazará la creación de la campaña de venta masiva.
  - **[EARS]** El sistema deberá exigir la aprobación de los Socios antes de activar una campaña de venta masiva; sin dicha aprobación la campaña permanecerá inactiva.
  - **[Gherkin]** CA-04 · Rechazo o bloqueo de campaña (A1/A2).
    ```gherkin
    Dado una campaña de venta masiva sometida a aprobación
    Cuando los Socios la rechazan o el Moderador/Owner detecta una violación de normas
    Entonces el sistema no la publica ni la activa
    Y notifica al creador el motivo del rechazo o bloqueo
    ```
  - **[EARS]** Si el creador define envíos/delivery o un establecimiento de retiro en la campaña, el sistema deberá validar que el establecimiento de retiro haya sido aprobado por los Socios antes de activar la campaña.
- **Trazabilidad:** Cubre: RF-03.8, RF-03.9, RF-12.2, RF-18.2; Decisión D21.

---

### CU-10 · Crear campaña de recolecta por una causa

- **Objetivo del actor:** El Usuario Socio crea una campaña de recolecta por una causa en la que los participantes intercambian artículos por puntos de reputación.
- **Actores:** Usuario Socio (primario) · Usuarios participantes (donantes) · Sistema · Moderador/Owner (moderación).
- **Precondiciones:** El creador es **Usuario Socio** (RF-03.9).
- **Flujo principal:**
  1. El Socio crea la campaña de recolecta definiendo la causa y los artículos necesarios (RF-03.9).
  2. El Sistema valida y publica la campaña.
  3. Los usuarios participantes **intercambian sus artículos por puntos de reputación** a favor de la causa (RF-03.9).
  4. El Sistema acredita los puntos de reputación a los participantes y descuenta los artículos recibidos.
  5. Al alcanzar el objetivo o vencer el plazo, la campaña se cierra y se registra el resultado.
- **Flujos alternativos:**
  - **A1 — Moderación:** si la campaña viola normas, el Moderador/Owner la bloquea (RF-18.2).
  - **A2 — Recolecta sin completar:** al cierre sin alcanzar el objetivo, los artículos ya recibidos se gestionan conforme a la causa y se informa a los participantes.
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Creación de campaña de recolecta.
    ```gherkin
    Dado un Usuario Socio
    Cuando crea una campaña de recolecta por una causa definiendo los artículos necesarios
    Entonces el sistema valida y publica la campaña de recolecta
    ```
  - **[Gherkin]** CA-02 · Aporte de un participante.
    ```gherkin
    Dado una campaña de recolecta activa
    Cuando un participante intercambia un artículo a favor de la causa
    Entonces el sistema acredita puntos de reputación al participante
    Y registra el artículo recibido por la campaña
    ```
  - **[EARS]** Si el creador de la campaña no es Usuario Socio, el sistema rechazará la creación de la campaña de recolecta.
  - **[EARS]** Cuando la campaña alcance su objetivo o venza su plazo, el sistema la cerrará, gestionará los artículos recibidos conforme a la causa y notificará el resultado a los participantes.
- **Trazabilidad:** Cubre: RF-03.9, RF-18.2.

---

## 5. Módulo Intercambios (trueques) y escrow

### CU-11 · Crear un intercambio (trueque)

- **Objetivo del actor:** El usuario Verificado encuentra el artículo que desea y crea el trueque ofreciendo su NFT/cripto, que pasa a custodia del escrow.
- **Actores:** Usuario Particular Verificado/Certificado o Usuario Empresa (primario) · Sistema · Relayer/Backend (meta-tx) · Contrato Escrow.
- **Precondiciones:**
  - El usuario está **verificado** (requisito para acordar/completar — RF-01.2, D14).
  - Máximo **3 intercambios activos a la vez** para el Particular Verificado (RF-14.4).
  - Se cumplen las restricciones de nivel (rubros/límites de CU-06; el nivel manda sobre el tipo — D14).
- **Flujo principal:**
  1. El Usuario A crea el trueque seleccionando el artículo propio que ofrece (NFT/cripto) y el **artículo que quiere recibir** según la publicación AtoA del Usuario B (RF-05.1, RF-04.1).
  2. El Sistema valida: usuario verificado (D14), límite de 3 activos (RF-14.4), rubros/nivel y disponibilidad del artículo ofrecido.
  3. El Sistema agrega el detalle completo de confianza del acuerdo (RF-04.5, RF-05.5).
  4. Las partes pactan el **punto de encuentro** (CU-16) y la **hora pautada** (RF-05.4, RF-05.7).
  5. El Usuario A **ofrece** su NFT/cripto: pasa a **custodia del escrow** (RF-05.2 → CU-12).
  6. El trueque queda **ACTIVE** on-chain y visible para el Usuario B, quien puede **completarlo** ofreciendo el NFT/cripto requerido (RF-05.1 → CU-12).
- **Flujos alternativos:**
  - **A1 — Usuario no verificado:** no puede crear ni completar el trueque; solo ve ofertas (RF-01.2, RF-14.3, D14).
  - **A2 — Máximo de 3 activos alcanzado:** el Sistema rechaza la creación de un nuevo intercambio activo (RF-14.4).
  - **A3 — Artículo ofrecido ya comprometido/custodiado:** el Sistema impide la doble oferta.
  - **A4 — Sin acuerdo de punto de encuentro o nivel no habilitado:** el Iniciado no puede determinar lugares de intercambio (RF-03.6) y debe aceptar la zona registrada propuesta por la contraparte (Común o superior — RF-03.7); sin zona válida no se crea el trueque (RF-08.3).
  - **A5 — Cancelación del trueque (D31):** el usuario puede **cancelar unilateralmente y sin penalización solo antes de que los activos pasen a custodia** del escrow (RF-05.3, D31). **Una vez custodiados los activos, la cancelación no está disponible**: la única salida es la anulación con quórum de Socios (RF-06.1 → CU-18).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Creación exitosa del trueque.
    ```gherkin
    Dado un usuario A Verificado con menos de 3 intercambios activos y una publicación AtoA de B con punto de encuentro pactado (≤10 km) y hora pautada
    Cuando A crea el trueque ofreciendo su NFT/cripto por el artículo que quiere recibir
    Entonces el sistema valida la operación y custodia el activo de A en el contrato escrow
    Y deja el trueque en estado ACTIVE on-chain, visible para B
    ```
  - **[EARS]** Si alguna de las partes del trueque no está Verificada, el sistema bloqueará la creación y el completado del intercambio (la parte solo puede ver ofertas).
  - **[EARS]** Mientras un usuario Particular Verificado tenga 3 intercambios activos, el sistema rechazará la creación de un nuevo intercambio activo.
  - **[EARS]** Si el artículo ofrecido ya está comprometido o custodiado en otro escrow, el sistema impedirá su doble oferta.
  - **[EARS]** Si el nivel del usuario es Iniciado, el sistema no le permitirá determinar el lugar de intercambio; solo podrá aceptar una zona registrada propuesta por la contraparte (Común o superior).
  - **[Gherkin]** CA-06 · Cancelación pre-custodia (A5, D31).
    ```gherkin
    Dado un trueque creado cuyos activos aún no pasaron a custodia del escrow
    Cuando una de las partes cancela el intercambio
    Entonces el sistema cancela el trueque sin penalización para ninguna parte
    ```
  - **[EARS]** Si los activos de un trueque ya están custodiados en el escrow, el sistema no permitirá la cancelación unilateral: la única salida será el flujo de anulación con quórum de Socios (RF-06.1 → CU-18).
- **Trazabilidad:** Cubre: RF-01.2, RF-03.6, RF-03.7, RF-04.1, RF-04.5, RF-05.1, RF-05.3, RF-05.5, RF-14.4, RF-14.6; Decisiones D14, D31.

---

### CU-12 · Custodia en escrow al ofrecer o completar el trueque

- **Objetivo del actor:** Las partes del trueque depositan sus NFTs/criptos en el contrato escrow, que los custodia de forma inmutable hasta la firma dual de recepción o la resolución aprobada.
- **Actores:** Usuario A / Usuario B (partes del trueque) · Contrato Escrow · Sistema (indexador → PostgreSQL).
- **Precondiciones:**
  - Existe un intercambio creado (CU-11) referenciado por su `escrowId`.
  - Las partes están verificadas (D14) y sus Smart Accounts activas.
- **Flujo principal:**
  1. La parte deposita su NFT/cripto; el contrato **Escrow** recibe el activo en custodia (RF-05.2).
  2. El Sistema verifica que el depósito proviene de la Smart Account de una parte verificada (D14/D16).
  3. Al depositar el Usuario A y luego el Usuario B, ambos activos quedan **custodiados por el contrato escrow** (estado ACTIVE), única **fuente de verdad** de ese estado (RNF-01.1).
  4. El contrato emite el evento de custodia; el **indexador propio** lo escucha y actualiza PostgreSQL (D25, RNF-03.2).
  5. Los activos permanecen en custodia **hasta que ambas partes firmen la recepción correcta** (RF-05.2 → CU-14) o se resuelva una anulación/disputa (RF-05.2b, RF-06).
- **Flujos alternativos:**
  - **A1 — Depósito fallido (token no aprobado, error):** la custodia no se registra; el Sistema lo informa y el usuario reintenta.
  - **A2 — Anulación aprobada por Socios:** la liberación de los fondos custodiados solo procede por **quórum de Socios (≥2/3)** tras la solicitud de anulación, con plazo máximo de **5 días** desde la solicitud (RF-05.2b, D13).
  - **A3 — Subasta de empresa:** el artículo subastado queda custodiado en el escrow **al crearse la subasta** y vuelve a su billetera si no hay ganador o se anula (RF-17.3, RF-17.5).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Custodia dual de los activos.
    ```gherkin
    Dado un trueque creado con su escrowId
    Cuando el Usuario A deposita su NFT/cripto y el Usuario B completa el intercambio depositando el NFT/cripto requerido
    Entonces el contrato escrow custodia ambos activos
    Y registra el estado ACTIVE del escrow on-chain
    ```
  - **[EARS]** La blockchain será la única fuente de verdad para el estado del escrow: el sistema no permitirá que ninguna actualización off-chain (PostgreSQL) altere el estado del escrow.
  - **[EARS]** Mientras los activos estén custodiados y no exista una resolución (firmas de recepción de ambas partes, anulación aprobada o resolución de disputa), el contrato impedirá el retiro unilateral por cualquiera de las partes.
  - **[EARS]** Cuando una solicitud de anulación sea aprobada por quórum de ≥2/3 de Socios dentro de los 5 días desde la solicitud, el contrato liberará los fondos custodiados devolviéndolos a las billeteras de sus dueños.
  - **[Gherkin]** CA-05 · Indexación del evento de custodia.
    ```gherkin
    Dado un evento de custodia emitido por el contrato escrow
    Cuando el indexador propio lo escucha
    Entonces el sistema actualiza PostgreSQL con el estado del trueque
    Y la cadena se mantiene como única fuente de verdad del estado
    ```
  - **[EARS]** Cuando se cree una subasta de empresa con su artículo ofrecido, el sistema lo custodiará en el escrow desde la creación de la subasta y, si la subasta finaliza sin ganador o se anula, lo devolverá a la billetera de su dueño.
- **Trazabilidad:** Cubre: RF-05.1, RF-05.2, RF-05.2b, RF-17.3, RF-17.5, RNF-01.1, RNF-03.2; Decisiones D13, D25.

---

### CU-13 · Apertura dual del intercambio (ventanas de 10 minutos)

- **Objetivo del actor:** Las partes presentes en el punto de encuentro aperturan el intercambio dentro de las ventanas de 10 minutos para habilitar la entrega y la certificación de recepción.
- **Actores:** Usuario A / Usuario B (partes) · Contrato Escrow · Sistema.
- **Precondiciones:**
  - El intercambio está ACTIVE con los activos en custodia (CU-12) y **hora pautada** acordada.
  - Ambas partes concurren al punto de encuentro acordado (CU-16).
- **Flujo principal:**
  1. Cada parte apertura el intercambio en su dispositivo en el punto de encuentro.
  2. El Sistema/contrato valida la primera invariante: cada apertura ocurre **a no más de 10 minutos de la hora pautada** (RF-05.7, R5, RNF-06.2).
  3. El Sistema/contrato valida la segunda invariante: **no más de 10 minutos de diferencia entre la apertura de ambas partes** (RF-05.7, R5, RNF-06.2).
  4. Con ambas aperturas válidas (`aperturaA`, `aperturaB` registradas on-chain), el intercambio queda habilitado para la entrega y la certificación de recepción (RF-05.4 → CU-14).
  5. El evento se indexa y PostgreSQL actualiza el estado (D25).
- **Flujos alternativos:**
  - **A1 — Apertura fuera de ventana (±10 min de la hora pautada):** el contrato rechaza la apertura tardía y registra la inasistencia/incumplimiento.
  - **A2 — Diferencia entre aperturas > 10 min:** la segunda apertura se rechaza y el proceso no avanza; el caso queda pendiente y las partes pueden recurrir a la anulación justificada o a la disputa (RF-06).
  - **A3 — Una parte no apertura:** no hay apertura dual; la parte cumplidora puede iniciar el flujo de anulación/disputa (RF-06).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Apertura dual válida.
    ```gherkin
    Dado un trueque ACTIVE con activos en custodia y una hora pautada acordada
    Cuando ambas partes aperturan el intercambio, cada una a no más de 10 minutos de la hora pautada y con una diferencia entre aperturas de 10 minutos o menos
    Entonces el contrato registra aperturaA y aperturaB on-chain
    Y habilita la entrega y la certificación de recepción
    ```
  - **[EARS]** Cuando una parte aperture más de 10 minutos después de la hora pautada, el contrato rechazará la apertura y registrará la inasistencia/incumplimiento.
  - **[EARS]** Cuando la segunda apertura ocurra con más de 10 minutos de diferencia respecto de la primera, el contrato rechazará la segunda apertura y el proceso no avanzará (habilita anulación justificada o disputa).
  - **[EARS]** Si una de las partes no apertura dentro de la ventana válida, el sistema no registrará la apertura dual y la parte cumplidora podrá iniciar el flujo de anulación justificada o disputa.
  - **[Gherkin]** CA-05 · Registro de la apertura dual.
    ```gherkin
    Dado un par de aperturas válidas registradas on-chain
    Cuando el evento de apertura dual se indexa
    Entonces el sistema actualiza PostgreSQL con el estado de apertura del trueque
    ```
- **Trazabilidad:** Cubre: RF-05.7, R5, RNF-06.2.

---

### CU-14 · Completar el intercambio: verificación del usuario, certificación y firma de recepción

- **Objetivo del actor:** Las partes verificadas certifican la recepción de lo negociado con imagen firmada y firman la recepción para que el escrow libere los activos.
- **Actores:** Usuario A / Usuario B (partes Verificadas/Certificadas) · Contrato Escrow · Sistema (IPFS + indexador) · Relayer/Backend.
- **Precondiciones:**
  - Apertura dual válida realizada (CU-13).
  - **Ambas partes están verificadas**: completar un trueque exige estar Verificado (RF-01.2, RF-14.3, D14).
  - Los activos están custodiados en el escrow (CU-12).
- **Flujo principal:**
  1. Cada parte **certifica si recibió o no** lo negociado (RF-05.4).
  2. Para certificar la recepción, cada parte sube la **imagen de recepción**, que se certifica como en la publicación: hash SHA-256 con metadata + wallet, IPFS con pinning propio y **firma ECDSA de la wallet** (RF-11.1, RF-11.3); firma + hash se guardan en PostgreSQL y se agregan al acumulador merkle anclado on-chain (RF-11.4, D23).
  3. Si ambas partes confirman la **recepción correcta**, cada parte **firma la recepción** de lo negociado (RF-05.2).
  4. El Sistema verifica on-chain el estado de verificación de ambas partes (D14).
  5. Con las **firmas de recepción de ambas partes**, el contrato escrow **libera los activos custodiados** en favor de cada parte (transferencia cruzada; RF-05.2).
  6. El contrato marca la recepción como certificada; el evento se indexa y PostgreSQL se actualiza (D25).
  7. El trueque queda pendiente del **cierre con valoración obligatoria** (RF-07.1, RNF-06.1 → CU-15): el estado **COMPLETADO** (y su carácter de intercambio efectivo) exige firmas de ambas partes **y** valoración registrada (RF-03.4, D12).
- **Flujos alternativos:**
  - **A1 — Parte no verificada:** el contrato impide completar el intercambio; la parte solo puede ver (RF-01.2, RF-14.3, D14).
  - **A2 — Recepción insatisfecha o rechazada:** la parte afectada declara no haber recibido correctamente; no se firma la recepción y se habilita la **solicitud de anulación justificada** (RF-06.1) o el flujo de disputa (RF-06).
  - **A3 — Evidencia de recepción inválida:** si la imagen/firma no valida contra el acumulador merkle, la certificación se rechaza y la recepción no se registra (RF-11.4).
  - **A4 — Violación de norma detectada en el acto:** el intercambio se **bloquea** y se solicita a ambas partes la autorización de cierre como irregular y no efectivo (RF-05.8).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Completado exitoso con liberación de activos.
    ```gherkin
    Dado un trueque con apertura dual válida y ambas partes Verificadas
    Cuando cada parte certifica la recepción con imagen (hash SHA-256 + firma ECDSA ancladas al acumulador merkle) y ambas partes firman la recepción correcta de lo negociado
    Entonces el contrato escrow libera los activos custodiados en favor de cada parte
    Y el trueque queda pendiente únicamente de la valoración obligatoria para cerrar como COMPLETADO
    ```
  - **[EARS]** Si una de las partes no está Verificada on-chain, el contrato impedirá completar el intercambio (esa parte solo puede ver).
  - **[EARS]** Mientras no existan las firmas de recepción de ambas partes, el contrato no liberará los activos custodiados en el escrow.
  - **[EARS]** Si la imagen o la firma ECDSA de la recepción no validan contra el acumulador merkle anclado on-chain, el sistema rechazará la certificación y la recepción no se registrará.
  - **[Gherkin]** CA-05 · Recepción insatisfecha (A2).
    ```gherkin
    Dado un intercambio entregado entre las partes
    Cuando una parte declara la recepción insatisfecha o rechazada
    Entonces el sistema no registra la firma de recepción de esa parte
    Y habilita la solicitud de anulación justificada o el flujo de disputa
    ```
  - **[EARS]** Cuando se detecte una violación de norma durante el intercambio, el sistema bloqueará el trueque y solicitará a ambas partes la autorización de cierre como irregular y no efectivo.
  - **[EARS]** Cuando un trueque tenga las firmas de recepción de ambas partes pero falte la valoración, el sistema no lo marcará como COMPLETADO ni lo contabilizará como intercambio efectivo.
- **Trazabilidad:** Cubre: RF-01.2, RF-03.4, RF-05.2, RF-05.3, RF-05.4, RF-05.8, RF-07.1, RF-11.1, RF-11.3, RF-11.4, R6, RNF-01.1, RNF-06.1; Decisiones D12, D14, D23.

---

### CU-15 · Valoración mutua al cierre del trueque (escala 1–5)

- **Objetivo del actor:** Las partes valoran mutuamente la actividad y lo negociado en los 5 renglones (escala 1–5), requisito indispensable para que el trueque cierre como COMPLETADO y efectivo.
- **Actores:** Usuario A / Usuario B (partes) · Sistema · Contrato Escrow.
- **Precondiciones:**
  - Ambas partes firmaron la recepción correcta (CU-14).
  - La valoración es **requisito indispensable del cierre**: no se puede cerrar un trueque sin valorar (RF-07.1, RNF-06.1, R8).
- **Flujo principal:**
  1. Cada parte valora **a la contraparte y a la actividad/lo negociado** en los **5 renglones** de reputación (RF-07.1, RF-07.2), cada uno en **escala 1–5** (D18): aceptación del producto, honestidad publicitaria, seguridad, confiabilidad y compromiso.
  2. El Sistema valida que cada renglón esté en el rango 1–5 y que ambas valoraciones existan (RNF-06.1).
  3. El contrato escrow cierra el trueque como **COMPLETADO** (firmas de ambas partes + valoración registrada; RF-03.4, D12).
  4. El Sistema actualiza la **reputación** de cada usuario y dispara el **recálculo de nivel/medalla** (RF-03.3, D12).
  5. El Sistema aplica la **comisión base del 1% del valor del trueque completado** al fondo de valor (D7, RF-03.9).
  6. El cierre se indexa y PostgreSQL registra la valoración (D25).
- **Flujos alternativos:**
  - **A1 — Valoración incompleta o fuera de rango:** el cierre no procede; el Sistema solicita completar los 5 renglones en escala 1–5 (RNF-06.1, D18).
  - **A2 — Una parte no valora:** el trueque no se cierra como COMPLETADO (no cuenta como intercambio efectivo — RF-03.4/D12); el Sistema lo recuerda a la parte pendiente.
  - **A3 — Valoración negativa por incumplimiento:** la baja valoración impacta la reputación y puede motivar la revisión por Socios/soporte si hubo infracción (RF-06.3, RF-18.3).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Cierre valorado como COMPLETADO.
    ```gherkin
    Dado un trueque con firmas de recepción de ambas partes
    Cuando cada parte registra la valoración de los 5 renglones (aceptación del producto, honestidad publicitaria, seguridad, confiabilidad y compromiso) en escala 1–5
    Entonces el contrato cierra el trueque como COMPLETADO
    Y el sistema actualiza la reputación, recalcula nivel/medalla y deduce la comisión base del 1% del valor al fondo de valor
    ```
  - **[EARS]** Si alguno de los 5 renglones de valoración falta o está fuera de la escala 1–5, el sistema no cerrará el trueque como COMPLETADO y solicitará completar la valoración.
  - **[EARS]** Mientras una de las partes no haya registrado su valoración, el trueque no podrá cerrarse como COMPLETADO ni contará como intercambio efectivo.
  - **[EARS]** El sistema deberá contabilizar como intercambio efectivo únicamente los trueques COMPLETADO con firmas de recepción de ambas partes y valoración registrada; excluirá los trueques ANULADO y los EN_DISPUTA/RESOLUCION_SOCIOS no resueltos (enum canónico).
  - **[EARS]** Cuando un trueque se cierre como COMPLETADO, el sistema deducirá el 1% de su valor y lo acreditará al fondo de valor.
  - **[Gherkin]** CA-06 · Valoración negativa por incumplimiento (A3).
    ```gherkin
    Dado un cierre de trueque con valoraciones registradas
    Cuando una parte valora con baja puntuación (1–2) por incumplimiento de la contraparte
    Entonces el sistema actualiza la reputación afectada conforme a la valoración
    Y deja el caso disponible para revisión de los Socios o soporte si hubo infracción
    ```
- **Trazabilidad:** Cubre: RF-03.3, RF-03.4, RF-06.3, RF-07.1, RF-07.2, RF-07.3, R8, RNF-06.1; Decisiones D7, D12, D18.

---

### CU-16 · Establecer punto de encuentro con mapa (≤10 km)

- **Objetivo del actor:** Las partes de un trueque acuerdan el sitio de entrega dentro de un radio de 10 km, con soporte de mapa y ruta en móvil.
- **Actores:** Usuarios A/B (partes; proponente con nivel Común o superior) · Sistema (PostGIS + API de geolocalización + mapas) · Relayer/Backend.
- **Precondiciones:**
  - El proponente tiene nivel **Común o superior**: el nivel **Iniciado no puede determinar lugares de intercambio** (RF-03.6, R10).
  - El nivel **Común solo acepta o propone zonas ya registradas** por él o por la contraparte (RF-03.7, R11); el registro de direcciones particulares lo gestiona el usuario en su Perfil (RF-14.6).
  - La lógica de geolocalización vive **estrictamente off-chain** (PostgreSQL con PostGIS), partiendo de la dirección suministrada en la inscripción (RF-08.4, R3).
- **Flujo principal:**
  1. El proponente elige en el **mapa** una zona registrada (propia o de la contraparte) como punto de encuentro (RF-03.7, RF-08.1).
  2. El Sistema calcula con **PostGIS** la distancia entre las direcciones de inscripción de ambas partes (RF-08.3, RF-08.4).
  3. El Sistema valida la invariante: la distancia entre las partes **no debe superar los 10 km** (RF-08.3, R3, RNF-06.2).
  4. La contraparte acepta el punto propuesto y se fija la **hora pautada** del encuentro (RF-05.4, RF-05.7).
  5. El punto de encuentro acordado se asocia al trueque (`puntoEncuentroId`).
  6. En la **versión móvil**, el Sistema ofrece la **ruta de cómo llegar** al punto de encuentro (RF-08.2).
- **Flujos alternativos:**
  - **A1 — Distancia > 10 km:** el Sistema rechaza el punto y sugiere zonas dentro del radio; el flujo vuelve al paso 1 (RF-08.3, R3).
  - **A2 — Proponente Iniciado:** no puede proponer; debe aceptar la zona registrada que proponga la contraparte (Común o superior; RF-03.6, RF-03.7).
  - **A3 — Zona no registrada:** el Sistema rechaza la propuesta hasta registrar la zona/dirección (RF-03.7, R11).
  - **A4 — Sin acuerdo de punto:** no se crea/avanza el trueque (CU-11); las partes pueden disolver el acuerdo por los flujos de cancelación/anulación (RF-05.3, RF-06).
- **Criterios de aceptación:**
  - **[Gherkin]** CA-01 · Punto de encuentro acordado.
    ```gherkin
    Dado un trueque en acuerdo entre una parte proponente de nivel Común o superior y su contraparte
    Cuando el proponente elige en el mapa una zona registrada (propia o de la contraparte) y la contraparte la acepta
    Entonces el sistema valida que la distancia entre las partes sea de 10 km o menos
    Y fija la hora pautada y asocia el punto de encuentro al trueque
    ```
  - **[EARS]** Si la distancia entre las direcciones de inscripción de las partes supera los 10 km, el sistema rechazará el punto propuesto y sugerirá zonas dentro del radio permitido.
  - **[EARS]** Si el proponente es de nivel Iniciado, el sistema no le permitirá proponer lugares de intercambio; solo podrá aceptar una zona registrada propuesta por la contraparte de nivel Común o superior.
  - **[EARS]** Si la zona propuesta no está registrada por ninguna de las partes, el sistema rechazará la propuesta hasta que la dirección/zona quede registrada.
  - **[EARS]** El sistema deberá calcular la distancia entre las partes mediante PostGIS en la capa off-chain (PostgreSQL), a partir de las direcciones de inscripción; esta lógica de geolocalización no se ejecutará on-chain.
  - **[Gherkin]** CA-06 · Ruta de llegada en móvil.
    ```gherkin
    Dado un punto de encuentro acordado y asociado al trueque
    Cuando el usuario accede desde la versión móvil
    Entonces el sistema ofrece la ruta de cómo llegar al punto de encuentro
    ```
- **Trazabilidad:** Cubre: RF-03.6, RF-03.7, RF-05.4, RF-08.1, RF-08.2, RF-08.3, RF-08.4, R3, R10, R11, RNF-06.2.

---
### CU-17 · Bloqueo del intercambio por violación de norma

- **Objetivo del actor:** El Moderador/Owner quiere congelar de inmediato un trueque que viola las normas —impidiendo retiros unilaterales de los activos custodiados— y encauzarlo hacia un cierre irregular consentido por ambas partes o hacia la disputa/sanción de los Socios.
- **Actores:** Moderador / Owner (primario) · Sistema (contrato escrow + alertas automáticas) · Usuarios A/B (partes) · Usuarios Socios (si deriva a disputa/sanción).
- **Precondiciones:**
  1. Existe un intercambio en estado `ACTIVE` con activos custodiados en el escrow (CU-12).
  2. El Moderador u Owner está autenticado con rol de moderación (RF-18.2), o el Sistema genera una alerta automática de violación.
  3. Existe evidencia de la violación de norma (RF-05.8): reporte de una parte, alerta del Sistema o hallazgo de moderación.
- **Flujo principal:**
  1. El Moderador/Owner (o una alerta del Sistema) identifica la violación de norma en el trueque (RF-05.8, RF-18.2).
  2. El contrato escrow **bloquea el intercambio** (estado `BLOCKED`) y **congela los activos custodiados** (RF-05.8).
  3. El Sistema solicita a **ambas partes la autorización de cierre como irregular y no efectivo** (RF-05.8).
  4. Si ambas partes autorizan, el contrato cierra el trueque como **irregular/no efectivo** (excluido del cómputo de "intercambios efectivos" — RF-03.4/D12) y libera los activos conforme a lo resuelto.
  5. Si alguna parte no autoriza o hay desacuerdo, el caso se **eleva a disputa de los Socios** (RF-06.2 → CU-19), que puede concluir en sanción.
  6. El Sistema registra el bloqueo, sus evidencias y la resolución en el registro auditable (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Parte disconforme con el cierre irregular:** el caso deriva a disputa de los Socios (CU-19).
  - **A2 — Sanción determinada por los Socios:** el contrato ejecuta la sanción on-chain tras la resolución, **solo después del timelock de 6 h** (RF-06.3, D21).
  - **A3 — Bloqueo indebido:** la parte afectada apela a soporte (Owner + moderador — RF-18.3) y los Socios evalúan la sanción aplicada (RF-06.3); si procede, se revierte o ajusta.
- **Criterios de aceptación:**
  - **Criterio 1 [Gherkin]:**
    ```gherkin
    Dado un intercambio ACTIVE con activos custodiados en el escrow
    Cuando el Moderador/Owner ejecuta el bloqueo por violación de norma
    Entonces el contrato escrow pasa el intercambio a estado BLOCKED y los activos custodiados quedan congelados
    ```
  - **Criterio 2 [EARS]:** Mientras un escrow esté en estado `BLOCKED`, el sistema deberá impedir a cualquiera de las partes retirar o transferir los activos custodiados y toda nueva transacción del trueque.
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado un intercambio BLOCKED
    Cuando ambas partes autorizan el cierre como irregular y no efectivo
    Entonces el trueque se cierra como irregular/no efectivo y no incrementa el contador de intercambios efectivos del usuario
    ```
  - **Criterio 4 [EARS]:** Si un escrow está `BLOCKED` y no se obtiene la autorización de ambas partes, entonces el sistema deberá elevar el caso a disputa de los Socios con quórum de resolución de ≥2/3.
  - **Criterio 5 [EARS]:** Cuando los Socios resuelven aplicar una sanción tras un bloqueo, el sistema deberá ejecutarla on-chain recién transcurrido el timelock de 6 horas desde la resolución.
  - **Criterio 6 [Gherkin]:**
    ```gherkin
    Dado un bloqueo ejecutado por el Moderador/Owner
    Cuando se registra la resolución del caso
    Entonces el sistema almacena en el registro auditable el motivo, las evidencias y la resolución con su sello de tiempo
    ```
- **Trazabilidad:** Cubre: RF-03.4, RF-05.8, RF-06.3, RF-18.2, RF-18.3, RF-18.6, R6; Decisiones D12, D21.

---

## 6. Módulo Anulación, disputas y sanciones

### CU-18 · Solicitar anulación justificada (quórum de Socios ≥2/3, máx. 5 días)

- **Objetivo del actor:** La parte insatisfecha quiere anular el trueque justificando el motivo para recuperar su NFT/cripto custodiado, mediante una votación de los Socios que debe resolverse en un máximo de 5 días.
- **Actores:** Usuario A/B insatisfecho (solicitante, primario) · Usuarios Socios (votación) · Contrato Escrow · Sistema.
- **Precondiciones:**
  1. La recepción fue **insatisfecha o rechazada** por una de las partes (RF-06.1).
  2. Los activos están custodiados en el escrow (CU-12).
  3. El trueque no se encuentra ya en resolución de disputa ni cerrado.
- **Flujo principal:**
  1. El usuario solicita la anulación del trueque **justificando el motivo** (RF-06.1).
  2. El contrato registra la `solicitudAnulacion` y el `solicitanteAnulacion`, fijando el **plazo máximo de resolución de 5 días** desde la solicitud (RF-05.2b, RF-06.1, D13).
  3. El Sistema somete la solicitud a **votación de los Socios** (RF-06.1).
  4. Cada Socio emite un voto; la anulación (y la consecuente liberación de fondos) se aprueba con **quórum de ≥2/3 de los Socios** (RF-05.2b, RF-06.2, D21).
  5. Si se aprueba, el contrato escrow libera los activos y los **NFTs ofrecidos vuelven a las billeteras** de sus dueños (RF-06.1).
  6. El Sistema registra la resolución; el trueque queda `ANULADO` (no cuenta como "intercambio efectivo" — RF-03.4/D12).
- **Flujos alternativos:**
  - **A1 — Vencimiento del plazo sin quórum (ANULADO por defecto):** si vencen los **5 días** sin alcanzar el quórum de ≥2/3, el escrow **se ANULA por defecto** y los **NFTs vuelven a las billeteras de ambas partes** (cierre en tiempo finito — RF-05.2b, RF-06.1, D26). **No existe vía de continuación tras el vencimiento.**
  - **A2 — Rechazo por quórum negativo dentro del plazo:** si antes de vencer el plazo la votación alcanza ≥2/3 en contra de la anulación, la solicitud se rechaza y el trueque **continúa hacia el completado normal** (CU-14) o, si existe otra controversia (recepción rechazada, bloqueo), ingresa a disputa formal (CU-19). *(Nota: el vencimiento del plazo sin quórum siempre es ANULADO por defecto — D26; el rechazo solo puede darse por quórum negativo explícito.)*
  - **A3 — Solicitante retira la solicitud:** si la recepción se regulariza, la solicitud se cancela y el trueque puede completarse (CU-14).
- **Criterios de aceptación:**
  - **Criterio 1 [Gherkin]:**
    ```gherkin
    Dado un trueque con recepción insatisfecha o rechazada y activos custodiados en el escrow
    Cuando la parte afectada solicita la anulación justificando el motivo
    Entonces el contrato registra la solicitud con su solicitante y fija el plazo máximo de resolución en 5 días desde la solicitud
    ```
  - **Criterio 2 [EARS]:** Si una solicitud de anulación se aprueba con votos de al menos 2/3 de los Socios, entonces el sistema deberá liberar los activos custodiados y devolver los NFTs ofrecidos a las billeteras de sus dueños.
  - **Criterio 3 [EARS]:** El sistema deberá resolver toda solicitud de anulación dentro de un plazo máximo de 5 días desde la solicitud.
  - **Criterio 4 [EARS]:** Si transcurren 5 días desde la solicitud de anulación sin alcanzar el quórum de ≥2/3, el sistema deberá anular el escrow por defecto y devolver los NFTs custodiados a las billeteras de ambas partes.
  - **Criterio 5 [Gherkin]:**
    ```gherkin
    Dado un trueque anulado aprobado por los Socios
    Cuando se ejecuta la resolución on-chain
    Entonces el trueque queda ANULADO y no cuenta como intercambio efectivo en el puntaje del usuario
    ```
  - **Criterio 6 [Gherkin]:**
    ```gherkin
    Dado un trueque con solicitud de anulación en curso sin quórum alcanzado
    Cuando vencen los 5 días desde la solicitud
    Entonces el escrow se anula por defecto y los NFTs vuelven a las billeteras de ambas partes
    ```
  - **Criterio 7 [Gherkin]:**
    ```gherkin
    Dado una solicitud de anulación en curso
    Cuando la recepción se regulariza y el solicitante retira la solicitud
    Entonces la solicitud se cancela y el trueque permanece habilitado para completarse por el flujo estándar
    ```
- **Trazabilidad:** Cubre: RF-03.4, RF-05.2b, RF-06.1, RF-06.2; Decisiones D12, D13, D21, D26.

---

### CU-19 · Resolución de disputa por los Socios (timelock 6 h)

- **Objetivo del actor:** Los Socios, como mediadores y jueces, quieren resolver el conflicto con quórum de ≥2/3 y ejecutar on-chain la liberación, anulación o sanción (con timelock de 6 h), dando mayor peso a la evidencia de los usuarios de mejor nivel.
- **Actores:** Usuarios A/B (partes en conflicto) · Usuarios Socios (mediadores y jueces, primarios) · Contrato Escrow / contrato de sanciones · Sistema.
- **Precondiciones:**
  1. Existe un conflicto no resuelto distinto de una anulación vencida (la anulación vencida sin quórum se resuelve SIEMPRE ANULADO por defecto — D26, CU-18 A1): recepción rechazada, bloqueo (CU-17), quórum negativo de anulación con otra controversia u otra disputa del trueque (RF-06).
  2. Los Socios tienen rol activo y pueden votar (un voto por Socio — D21).
- **Flujo principal:**
  1. El caso ingresa a disputa con sus evidencias (certificaciones de imagen hash + firma — RF-11.4, mensajes, valoraciones).
  2. Los **Socios actúan como mediadores y jueces** (RF-06.2) y revisan la evidencia.
  3. En la deliberación, la evidencia aportada por usuarios de **mejor nivel tiene mayor peso** (RF-06.4); el voto de cada Socio es **único, sin ponderación por nivel** (D21).
  4. La resolución se aprueba con **quórum de ≥2/3 de los Socios** (RF-06.2, D21).
  5. Según la resolución, el contrato ejecuta on-chain: liberación a favor de una parte, anulación con devolución de activos (RF-06.1) y/o **sanción**.
  6. Las **sanciones se ejecutan on-chain por el contrato tras la resolución, con timelock de 6 h** (RF-06.3, D21), dando margen de evaluación a los Socios.
  7. El Sistema registra la resolución y actualiza el estado del trueque (COMPLETADO o ANULADO según el caso — enum canónico) y la reputación de los implicados.
- **Flujos alternativos:**
  - **A1 — Evaluación de sanciones por los Socios:** los Socios evalúan las sanciones aplicadas (RF-06.3) y pueden ajustarlas antes de que venza el timelock de 6 h (D21).
  - **A2 — Quórum no alcanzado:** la disputa permanece abierta con seguimiento de moderación/soporte (RF-18.3).
  - **A3 — Apelación:** la parte sancionada apela; el caso es revisado por los Socios (RF-06.3, RF-18.3).
- **Criterios de aceptación:**
  - **Criterio 1 [Gherkin]:**
    ```gherkin
    Dado un conflicto de trueque ingresado a disputa con sus evidencias
    Cuando los Socios emiten sus votos
    Entonces la resolución se aprueba solo si votaron a favor al menos 2/3 de los Socios
    ```
  - **Criterio 2 [EARS]:** Si la resolución de una disputa determina una sanción, el sistema deberá ejecutarla on-chain recién después de transcurrido el timelock de 6 horas desde la resolución.
  - **Criterio 3 [EARS]:** En la deliberación de disputas, el sistema deberá ponderar la evidencia de un usuario según su nivel (mayor nivel → mayor peso), manteniendo el voto de cada Socio en uno, sin ponderación por nivel.
  - **Criterio 4 [Gherkin]:**
    ```gherkin
    Dado una disputa resuelta con quórum de ≥2/3 a favor de la anulación
    Cuando el contrato ejecuta la resolución
    Entonces los activos custodiados se devuelven a las billeteras de sus dueños y el trueque pasa a ANULADO
    ```
  - **Criterio 5 [Gherkin]:**
    ```gherkin
    Dado una sanción aprobada por los Socios
    Cuando transcurren menos de 6 horas desde la resolución y los Socios deciden ajustarla o revocarla
    Entonces el contrato ejecuta la sanción ajustada o revocada según la nueva resolución
    ```
  - **Criterio 6 [EARS]:** Si una disputa no alcanza quórum de ≥2/3, el sistema deberá mantenerla abierta con seguimiento de moderación/soporte sin ejecutar liberación, anulación ni sanción.
- **Trazabilidad:** Cubre: RF-06.1, RF-06.2, RF-06.3, RF-06.4, RF-18.6; Decisiones D13, D21.

---

## 7. Módulo Reputación y niveles

### CU-20 · Calcular nivel y medalla por fórmula (D12)

- **Objetivo del actor:** El Sistema quiere mantener el nivel/medalla de cada usuario coherente con su reputación, volumen efectivo y ratio de apelaciones, aplicando la fórmula aprobada y sus umbrales tras cada evento que altere esos insumos.
- **Actores:** Sistema (cálculo automático, primario) · Usuarios (destinatarios) · Contratos (NivelesReputacion).
- **Precondiciones:**
  1. Existe información suficiente de reputación, volumen efectivo e intercambios efectivos del usuario (tras CU-15, CU-18, CU-19, etc.).
  2. Ocurre un evento que altera reputación, volumen efectivo o ratio de apelaciones (cierre de trueque, valoración, resolución de disputa/anulación).
- **Flujo principal:**
  1. El Sistema identifica el evento de reputación (valoración registrada, resolución de anulación/disputa — RF-07, RF-06).
  2. El Sistema recalcula el puntaje con la **fórmula aprobada (D12)**: `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)` (RF-03.3).
  3. El Sistema **normaliza cada insumo a escala 0–100** (D30): reputación (media de valoraciones 1–5) ×20; volumen_efectivo = trueques efectivos del usuario relativos al máximo del sistema ×100; ratio_apelaciones = 100×(1 − apelaciones/efectivos) (RF-03.3, D30).
  4. El Sistema clasifica según los **umbrales**: Iniciado 0–25 (Bronce) · Común 26–50 (Plata) · Frecuente 51–75 (Oro) · Socio ≥76 + solicitud formal y votación (RF-03.3 → CU-03).
  5. El Sistema aplica la definición operativa de "intercambio efectivo": trueque `COMPLETADO` con firmas de ambas partes y valoración registrada; excluye los estados `ANULADO` y `EN_DISPUTA`/`RESOLUCION_SOCIOS` no resueltos (RF-03.4, D12).
  6. El Sistema evalúa la medalla **Oro**: +1000 intercambios efectivos y ≥90 % de ratio de efectividad (cómputo acumulativo histórico — RF-03.4, RF-07.4).
  7. El Sistema ejecuta el **recálculo mensual** de todos los usuarios (lote programado) además del recálculo por evento (RF-03.3, D30).
  8. El Sistema actualiza nivel y medalla (sistema unificado D3/D4) y ajusta las capacidades del usuario (rubros, lugares, campañas — RF-03.6 a RF-03.9).
- **Flujos alternativos:**
  - **A1 — Descenso de nivel:** si el puntaje baja de umbral (p. ej. alto ratio de apelaciones), el Sistema degrada el nivel y revoca las capacidades superiores, manteniendo el mapeo medalla↔nivel (D3, D4).
  - **A2 — Ajustes por penalización:** la degradación por inactividad (CU-21) y las sanciones de los Socios (CU-19) se reflejan en el nivel/medalla.
  - **A3 — Sin histórico suficiente:** si el usuario no tiene datos para normalizar (p. ej. sin volumen en el sistema), el Sistema lo mantiene en el nivel mínimo calculable y no lo promueve.
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** El sistema deberá recalcular el puntaje de cada usuario con la fórmula `0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)` tras cada evento de reputación registrado.
  - **Criterio 2 [EARS]:** El sistema deberá normalizar cada insumo de la fórmula a la escala 0–100 antes de ponderar: reputación (media 1–5) ×20; volumen efectivo relativo al máximo del sistema ×100; apelaciones = 100×(1 − apelaciones/efectivos).
  - **Criterio 3 [EARS]:** El sistema deberá ejecutar el recálculo mensual de nivel/medalla de todos los usuarios como lote programado, además del recálculo por evento.
  - **Criterio 4 [EARS]:** Si el puntaje recalculado está entre 0 y 25, el sistema asignará nivel Iniciado y medalla Bronce; entre 26 y 50, nivel Común y medalla Plata; entre 51 y 75, nivel Frecuente y medalla Oro.
  - **Criterio 5 [EARS]:** El sistema deberá contabilizar como "intercambio efectivo" solo los trueques con estado COMPLETADO, firmas de recepción de ambas partes y valoración registrada, excluyendo los estados ANULADO y los EN_DISPUTA/RESOLUCION_SOCIOS no resueltos.
  - **Criterio 6 [EARS]:** Si un usuario acumula más de 1000 intercambios efectivos y un ratio de efectividad ≥90 % (acumulativo histórico), el sistema deberá otorgarle la medalla Oro, requisito para la clasificación Empresa.
  - **Criterio 7 [Gherkin]:**
    ```gherkin
    Dado un usuario con nivel Frecuente y medalla Oro
    Cuando su ratio de apelaciones sube y su puntaje recalculado baja de 51
    Entonces el sistema lo degrada a nivel Común (Plata) y revoca las capacidades superiores del nivel anterior
    ```
  - **Criterio 8 [EARS]:** Si un usuario alcanza puntaje ≥76 pero no fue admitido por votación de los Socios, el sistema no deberá clasificarlo como Socio (exige solicitud formal y votación con quórum de ≥2/3 — CU-03).
- **Trazabilidad:** Cubre: RF-01.8, RF-03.1, RF-03.2, RF-03.3, RF-03.4, RF-07.3, RF-07.4; Decisiones D3, D4, D12, D30.

---

### CU-21 · Penalización automática por inactividad prolongada (nivel Común)

- **Objetivo del actor:** El Sistema quiere degradar y suspender las publicaciones de los usuarios de nivel Común que permanecen inactivos 180 días manteniendo una participación de mercado excesiva, protegiendo la salud del mercado.
- **Actores:** Sistema (detección y ejecución automática, primario) · Usuario Particular nivel Común (afectado) · Usuarios Socios / soporte (apelación).
- **Precondiciones:**
  1. El usuario tiene nivel **Común (Plata)** (RF-03.7).
  2. Existe un histórico de actividad y de publicaciones del usuario en el mercado para el cómputo.
- **Flujo principal:**
  1. El Sistema monitorea la actividad del usuario Común.
  2. El Sistema verifica las condiciones de penalización (D19): **180 días sin actividad** y participación de **más del 5 % del volumen de artículos publicados en el mercado** (RF-03.7, D19).
  3. El Sistema ejecuta la penalización: **degradación a nivel Iniciado** y **suspensión de nuevas publicaciones** (RF-03.7, D19).
  4. El Sistema notifica al usuario y registra la penalización en el registro auditable (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Apelación/evaluación:** el usuario apela a soporte (RF-18.3) o los **Socios evalúan la sanción aplicada** (RF-06.3); si procede, se revierte o ajusta.
  - **A2 — Condiciones no cumplidas:** sin 180 días de inactividad o sin superar el 5 % del volumen del mercado, no se aplica penalización.
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** Si un usuario de nivel Común acumula 180 días consecutivos sin actividad y mantiene más del 5 % del volumen de artículos publicados en el mercado, el sistema deberá degradarlo a nivel Iniciado y suspenderle las nuevas publicaciones.
  - **Criterio 2 [Gherkin]:**
    ```gherkin
    Dado un usuario Común con 179 días de inactividad o con participación igual o inferior al 5 % del mercado
    Cuando se ejecuta el barrido de penalización
    Entonces el sistema no aplica penalización y el usuario conserva su nivel y capacidad de publicar
    ```
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado un usuario Común penalizado por inactividad
    Cuando el usuario apela ante soporte o los Socios evalúan la sanción
    Entonces el sistema revierte o ajusta la penalización solo si la apelación o evaluación resulta procedente
    ```
  - **Criterio 4 [Gherkin]:**
    ```gherkin
    Dado un usuario Común penalizado
    Cuando el usuario intenta crear una nueva publicación
    Entonces el sistema rechaza la publicación por suspensión vigente
    ```
  - **Criterio 5 [EARS]:** El sistema deberá registrar toda penalización automática por inactividad en el registro auditable con su fecha, condiciones verificadas y resultado.
- **Trazabilidad:** Cubre: RF-03.7, RF-06.3, RF-18.3, RF-18.6; Decisión D19.

---

### CU-22 · Registrar establecimiento de retiro (aprobación de Socios)

- **Objetivo del actor:** El usuario Frecuente (Oro) / Empresa quiere habilitar un establecimiento para retiro de artículos —y con ello ofrecer envíos/delivery— previa aprobación de los Socios.
- **Actores:** Usuario Frecuente (Oro; mayormente empresa) (primario) · Usuarios Socios (aprobación) · Sistema.
- **Precondiciones:**
  1. El solicitante tiene nivel **Frecuente (Oro)** (RF-03.8) o es Empresa con suscripción activa (RF-10).
  2. La creación de establecimientos de retiro exige **aprobación de los Socios** (RF-03.9).
- **Flujo principal:**
  1. El usuario registra el establecimiento (dirección y geolocalización).
  2. El Sistema valida los datos y somete el establecimiento a **aprobación de los Socios** (RF-03.9).
  3. Aprobado, el establecimiento queda disponible como punto de retiro/entrega para sus intercambios (RF-03.8).
  4. El usuario puede ofrecer la modalidad de **envíos o delivery** desde ese establecimiento (RF-03.8).
- **Flujos alternativos:**
  - **A1 — Rechazo de los Socios:** el establecimiento no se habilita y se notifica el motivo (RF-03.9).
  - **A2 — No cumple nivel Frecuente:** el registro se rechaza (RF-03.8).
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** Si el solicitante de un establecimiento de retiro no tiene nivel Frecuente (Oro), el sistema deberá rechazar el registro.
  - **Criterio 2 [EARS]:** El sistema deberá habilitar un establecimiento de retiro solo después de la aprobación de los Socios (RF-03.9).
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado un establecimiento de retiro aprobado por los Socios
    Cuando el usuario Frecuente/Empresa lo utiliza en un intercambio o activa delivery
    Entonces el establecimiento queda disponible como punto de retiro/entrega y la modalidad envíos/delivery queda operativa
    ```
  - **Criterio 4 [Gherkin]:**
    ```gherkin
    Dado un establecimiento sometido a aprobación
    Cuando los Socios lo rechazan
    Entonces el sistema no lo habilita y notifica el motivo al solicitante
    ```
- **Trazabilidad:** Cubre: RF-03.8, RF-03.9.

---

## 8. Módulo Gas, meta-transacciones y suscripciones

### CU-23 · Pago de gas de particulares: meta-transacción EIP-712 vía relayer

- **Objetivo del actor:** El Particular Verificado quiere ejecutar operaciones on-chain sin pagar gas, firmando un intent EIP-712 que el Relayer valida (anti-abuso) y envía asumiendo el costo.
- **Actores:** Usuario Particular Verificado (firmante sin costo, primario) · Relayer/Backend (envía y paga el gas) · Sistema (contratos + indexador) · Owner (operador/custodio de claves).
- **Precondiciones:**
  1. El usuario es un **Particular Verificado** con Smart Account ERC-4337 (RF-02.1).
  2. El relayer está operativo: mínimo 2 instancias, cola de reintentos, health-check y SLA ≥99 % (D15); el fondo de valor financia el gas con alerta de saldo bajo (D15, RF-03.9).
  3. La regla de negocio: transacciones entre particulares sin costo de gas (R1, RF-09.1).
- **Flujo principal:**
  1. El usuario firma criptográficamente su **intent** (meta-transacción **EIP-712**) con dominio `chainId` y nonce (RF-09.1, RF-09.2, RT-03.1).
  2. El backend recibe el intent por **endpoint autenticado con rate-limiting** y claves rotadas (RF-09.6, D16).
  3. El Relayer valida el **nonce único EIP-712 por cuenta** (anti-replay — RF-09.6, D16).
  4. El Relayer valida on-chain que la cuenta es una **Smart Account de un particular verificado** (RF-09.6, D16).
  5. El Relayer valida el **límite diario de meta-transacciones por usuario** (RF-09.6, D16).
  6. El backend **envía la transacción a la blockchain asumiendo el gas** desde la cuenta relayer/cuenta general (RF-09.2; cuenta 1 de anvil — RF-15.2).
  7. El contrato verifica firma y nonce, ejecuta la operación y el **indexador propio** actualiza PostgreSQL (D25).
- **Flujos alternativos:**
  - **A1 — Nonce duplicado/replay:** el relayer rechaza el intent (D16).
  - **A2 — Cuenta no verificada o no particular:** el relayer rechaza el intent (D16).
  - **A3 — Límite diario excedido (20/día):** el intent se rechaza hasta el siguiente día (D16, D29).
  - **A4 — Autenticación/rate-limiting:** peticiones sin credenciales o sobre la tasa se rechazan (D16).
  - **A5 — Falla de infraestructura:** la cola de reintentos y la segunda instancia absorben el fallo; el fondo de valor financia el gas y alerta saldo bajo (D15).
  - **A6 — Empresa:** las empresas pagan el gas de sus transacciones y no usan este flujo (R1, RF-09.3 → CU-24).
  - **A7 — Falla reiterada del signer:** **3 fallos en 10 minutos → bloqueo temporal del signer por 1 hora** (D29).
  - **A8 — Indisponibilidad prolongada del relayer (>1 h):** se activa el **modo degradado** *(Decisión D39)*: el usuario puede **enviar la transacción pagando el gas directamente** con su wallet; si la caída fue **responsabilidad del operador**, la plataforma **reembolsa el gas en BRLT**.
- **Criterios de aceptación:**
  - **Criterio 1 [Gherkin]:**
    ```gherkin
    Dado un Particular Verificado con Smart Account ERC-4337
    Cuando firma un intent EIP-712 válido para una operación on-chain
    Entonces el relayer envía la transacción asumiendo el gas y la operación se ejecuta sin costo de gas para el particular
    ```
  - **Criterio 2 [EARS]:** El sistema deberá rechazar todo intent de meta-transacción cuyo nonce EIP-712 ya haya sido consumido (anti-replay, dominio con chainId).
  - **Criterio 3 [EARS]:** El relayer deberá aceptar intents únicamente de Smart Accounts de particulares verificados, comprobado on-chain contra el estado de verificación.
  - **Criterio 4 [EARS]:** El sistema deberá rechazar los intents de un usuario que excedan su límite diario de **20 meta-transacciones** (D29).
  - **Criterio 5 [EARS]:** El sistema deberá rechazar las peticiones a endpoints del relayer sin autenticación válida o que excedan la tasa permitida.
  - **Criterio 6 [EARS]:** Si la cuenta emisora es de una Empresa, el sistema deberá exigir que la empresa pague el gas de sus transacciones y no procesarla por el flujo de meta-transacciones gratuitas.
  - **Criterio 7 [EARS]:** Si un signer acumula 3 fallos en 10 minutos, el sistema deberá bloquear temporalmente sus meta-transacciones durante 1 hora.
  - **Criterio 8 [Gherkin]:** Modo degradado por indisponibilidad del relayer (D39).
    ```gherkin
    Dado una indisponibilidad del relayer superior a 1 hora
    Cuando un particular necesita ejecutar una operación on-chain
    Entonces el sistema habilita el envío de la transacción con el gas pagado directamente por el usuario
    Y si la caída fue responsabilidad del operador, el sistema reembolsa el gas consumido en BRLT
    ```
- **Trazabilidad:** Cubre: RF-09.1, RF-09.2, RF-09.5, RF-09.6, RF-15.2, R1, RT-03.1; Decisiones D15, D16, D22, D25, D29, D39.

---

### CU-24 · Suscripción de empresa con cobro automático (staking bloqueado, cada 30 días)

- **Objetivo del actor:** La Empresa quiere mantener su suscripción operativa con cobros automáticos cada 30 días mediante **staking bloqueado** (D33), sin firmar una transacción manual por período.
- **Actores:** Usuario Empresa (primario) · Contrato de Suscripción (staking bloqueado — D33) · Sistema · Owner (soporte de cobros) · Relayer/Backend.
- **Precondiciones:**
  1. El usuario está clasificado como **Empresa** (CU-05) y pagó su inscripción (RF-09.4).
  2. La empresa paga el gas de sus transacciones (R1, RF-09.3).
- **Flujo principal:**
  1. El contrato implementa el **staking bloqueado** (D33): la empresa **bloquea el plan base (100 BRLT/mes, configurable por el Owner — D33)** con aprobación ERC-20 por período de 30 días.
  2. El contrato **automatiza el cobro cada 30 días sin requerir firma manual** de la empresa (RF-10.1, R2); una función `recolectarCiclo(empresa)` (keeper/relayer/backend) transfiere el monto al vencer el período.
  3. El Sistema registra el cobro (`suscripciones`: fecha, monto, txHash).
  4. El contrato aplica la distribución: **10 % de las suscripciones de empresas** alimenta el fondo de valor (D7, RF-03.9).
  5. Si el cobro falla, el Sistema lo reintenta y notifica; el soporte (Owner + moderador — RF-18.3) atiende los cobros de empresas.
- **Flujos alternativos:**
  - **A1 — Cobro fallido reiterado:** la suscripción pasa a estado irregular y el soporte contacta a la empresa; se evalúan las funciones premium de la cuenta (RF-18.3).
  - **A2 — Baja de suscripción:** la empresa solicita la baja; se gestiona conforme a las condiciones y el contrato detiene el cobro automático.
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** El contrato de suscripción deberá implementar el **staking bloqueado** (D33) y ejecutar el cobro automático cada 30 días sin requerir una transacción firmada manualmente por la empresa en cada período; el plan base es de **100 BRLT/mes, configurable por el Owner**.
  - **Criterio 2 [Gherkin]:**
    ```gherkin
    Dado una Empresa con suscripción activa mediante staking bloqueado
    Cuando se cumplen 30 días desde el último cobro
    Entonces el contrato cobra el monto del plan (100 BRLT/mes o el configurado por el Owner), registra fecha, monto y txHash, y transfiere el 10 % del cobro al fondo de valor
    ```
  - **Criterio 3 [EARS]:** Si un cobro de suscripción falla de forma reiterada, el sistema deberá marcar la suscripción como irregular y escalar el caso al soporte de empresas (Owner + moderador).
  - **Criterio 4 [Gherkin]:**
    ```gherkin
    Dado una Empresa que solicita la baja de su suscripción
    Cuando el contrato procesa la baja conforme a las condiciones
    Entonces el contrato detiene los cobros automáticos siguientes y la cuenta pierde las funciones premium asociadas
    ```
- **Trazabilidad:** Cubre: RF-09.3, RF-09.4, RF-10, RF-10.1, RF-18.3, R2, RT-03.4; Decisiones D7, D33.

---

## 9. Módulo Subastas de empresa (RF-17)

### CU-25 · Crear subasta de empresa (artículo custodiado en escrow)

- **Objetivo del actor:** La Empresa quiere subastar un artículo buscado custodiándolo en el escrow al crear la subasta, definiendo plazo, puja inicial, incremento mínimo y los artículos que acepta recibir.
- **Actores:** Usuario Empresa (primario) · Contrato Escrow · Sistema · Moderador/Owner (moderación).
- **Precondiciones:**
  1. El creador es una **Empresa** con suscripción activa y paga su propio gas (RF-17.1, RF-10, RF-09.3).
  2. El artículo a subastar está disponible y puede custodiarse en el escrow.
- **Flujo principal:**
  1. La Empresa crea la subasta definiendo: **artículo ofrecido**, **plazo de duración**, **puja inicial**, **incremento mínimo de puja** y los **artículo(s) que acepta recibir** (RF-17.3).
  2. El artículo ofrecido se **custodia en el contrato escrow al crearse la subasta** (RF-17.3 → CU-12).
  3. El Sistema valida la subasta y la publica en estado `ABIERTA`.
  4. Durante el plazo, los usuarios Certificados pujan (CU-26).
  5. Al cierre del plazo, se determina el ganador (CU-26); si no hay ganador o la subasta se anula, los NFTs custodiados **vuelven a las billeteras** de sus dueños (RF-17.5).
- **Flujos alternativos:**
  - **A1 — Creador no Empresa:** la creación se rechaza (RF-17.1).
  - **A2 — Anulación de la subasta:** sin ganador o anulada por el subastador, los NFTs custodiados vuelven a la billetera del dueño (RF-17.5).
  - **A3 — Moderación:** si la subasta viola normas, el Moderador/Owner la bloquea (RF-18.2).
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** El sistema deberá permitir crear subastas únicamente a cuentas clasificadas como Empresa (RF-17.1).
  - **Criterio 2 [Gherkin]:**
    ```gherkin
    Dado una Empresa con artículo disponible
    Cuando crea una subasta con artículo ofrecido, plazo, puja inicial, incremento mínimo y artículos aceptados
    Entonces el artículo ofrecido se custodia en el escrow al crearse y la subasta se publica en estado ABIERTA
    ```
  - **Criterio 3 [EARS]:** El sistema deberá rechazar la creación de una subasta por un usuario que no sea Empresa, sin custodiar activos.
  - **Criterio 4 [EARS]:** Si una subasta termina sin ganador o es anulada, el sistema deberá devolver a las billeteras de sus dueños los NFTs custodiados en el escrow.
  - **Criterio 5 [Gherkin]:**
    ```gherkin
    Dado una subasta ABIERTA creada por una Empresa
    Cuando el plazo de duración vence con al menos una puja válida de un usuario Certificado
    Entonces la subasta se cierra, se determina el ganador según CU-26 y el trueque resultante pasa al flujo estándar de escrow (RF-05)
    ```
- **Trazabilidad:** Cubre: RF-04.4, RF-17.1, RF-17.3, RF-17.5, RF-18.2.

---

### CU-26 · Pujar y adjudicar una subasta de empresa (prioridad por nivel)

- **Objetivo del actor:** El Usuario Certificado quiere pujar por el artículo subastado ofreciendo sus NFTs/criptos, y el Sistema quiere adjudicar al mejor postor según prioridad de nivel y valor al cierre.
- **Actores:** Usuarios Certificados (postores) · Usuario Empresa (subastadora) · Contrato Escrow · Sistema.
- **Precondiciones:**
  1. Existe una subasta ABIERTA creada por una Empresa (CU-25).
  2. Solo los usuarios Certificados pueden participar en subastas (RF-17.2).
  3. El postor ofrece NFTs/criptos conforme a los artículos que el subastador acepta recibir (RF-17.3).
- **Flujo principal:**
  1. El postor (Certificado — RF-17.2) registra su puja respetando la **puja inicial** y el **incremento mínimo** (RF-17.3).
  2. El Sistema valida que el postor es Certificado (RF-17.2).
  3. Las pujas se registran hasta el **plazo de duración** de la subasta.
  4. Al cierre, el Sistema determina el ganador: el postor que ofrece el **mayor valor**; en caso de **empate de valor**, prevalece el de **mayor nivel** (RF-17.4, D27).
  5. El ganador pasa al **flujo estándar de escrow (RF-05)** para completar el trueque con la Empresa (RF-17.4 → CU-11/CU-12).
  6. Los NFTs de los postores no ganadores se liberan de la subasta.
- **Flujos alternativos:**
  - **A1 — Postor no Certificado:** la puja se rechaza (RF-17.2).
  - **A2 — Puja por debajo del mínimo/incremento:** la puja se rechaza (RF-17.3).
  - **A3 — Sin ganador o subasta anulada:** los NFTs custodiados (incluido el del subastador) vuelven a las billeteras de sus dueños (RF-17.5).
  - **A4 — Empate de valor:** prevalece el postor de **mayor nivel** (desempate — RF-17.4, D27).
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** El sistema deberá aceptar pujas únicamente de usuarios Certificados (RF-17.2).
  - **Criterio 2 [EARS]:** El sistema deberá rechazar toda puja inferior a la puja inicial o que no respete el incremento mínimo definido en la subasta.
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado una subasta ABIERTA de una Empresa con pujas válidas de usuarios Certificados
    Cuando vence el plazo de duración
    Entonces el sistema adjudica al postor que ofrece el mayor valor
    Y el trueque pasa al flujo estándar de escrow (RF-05)
    ```
  - **Criterio 4 [EARS]:** Si dos pujas tienen el mismo valor al cierre, el sistema deberá adjudicar al postor de mayor nivel (desempate por nivel — D27).
  - **Criterio 5 [EARS]:** Si la subasta termina sin ganador o se anula, el sistema deberá liberar y devolver a sus dueños los NFTs custodiados, incluido el del subastador.
  - **Criterio 6 [Gherkin]:**
    ```gherkin
    Dado una subasta adjudicada a un postor ganador
    Cuando se cierra la subasta
    Entonces los NFTs de los postores no ganadores se liberan de la subasta y el ganador continúa por el flujo estándar de escrow con la Empresa
    ```
- **Trazabilidad:** Cubre: RF-17.2, RF-17.3, RF-17.4, RF-17.5, RF-05; Decisión D27.

---

## 10. Módulo Evidencia e imágenes (on-chain)

### CU-27 · Verificar evidencia de imagen on-chain (acumulador merkle)

- **Objetivo del actor:** El auditor (Owner/auditoría externa/Socios revisores) quiere comprobar la autenticidad e inmutabilidad de una imagen certificada validando hash SHA-256, firma ECDSA e inclusión en la raíz merkle anclada on-chain.
- **Actores:** Sistema (verificación automática) · Auditor (Owner/auditoría externa/Socios revisores — RF-18.6) · Usuarios (aportan evidencia) · Contrato Escrow (raíz merkle anclada).
- **Precondiciones:**
  1. Las imágenes de publicación y recepción fueron certificadas (hash SHA-256 + firma ECDSA, IPFS con pinning propio — RF-11.1 a RF-11.3, D23).
  2. La **raíz merkle (acumulador)** de las certificaciones está **anclada on-chain** en el contrato escrow (RF-11.4, D23).
- **Flujo principal:**
  1. El auditor/sistema toma la imagen y su metadata (refId, wallet, tipo PUBLICACION/RECEPCION).
  2. El Sistema recupera el archivo desde **IPFS** y recalcula el **hash SHA-256** con metadata y wallet declaradas (RF-11.2).
  3. El Sistema verifica la **firma ECDSA** del hash contra la wallet del usuario (RF-11.3).
  4. El Sistema verifica la inclusión del hash en la **raíz merkle anclada on-chain** (prueba de inclusión — RF-11.4, D23).
  5. Si las tres comprobaciones son válidas, la evidencia queda **certificada como inmutable y auditable** (RNF-01.5).
  6. El resultado se registra y, en disputas, se incorpora a la deliberación de los Socios (RF-06.2, RF-06.4).
- **Flujos alternativos:**
  - **A1 — Hash/firma/raíz no coinciden:** la evidencia **no es válida** (posible manipulación); el caso se reporta a moderación/soporte (RF-18.2, RF-18.3) y puede motivar sanción de los Socios (RF-06.3).
  - **A2 — Archivo IPFS indisponible:** no se puede recomputar el hash; la evidencia queda pendiente de verificación y se notifica.
- **Criterios de aceptación:**
  - **Criterio 1 [Gherkin]:**
    ```gherkin
    Dado una imagen certificada con su metadata, wallet y firma ECDSA
    Cuando el sistema recupera el archivo desde IPFS y recalcula el hash SHA-256 con la metadata y la wallet declaradas
    Entonces la evidencia es válida solo si el hash recalculado coincide, la firma ECDSA se verifica contra la wallet y el hash está incluido en la raíz merkle anclada on-chain
    ```
  - **Criterio 2 [EARS]:** El sistema deberá anclar en el contrato escrow la raíz merkle (acumulador) de las certificaciones de imágenes y exponer prueba de inclusión para cada hash certificado.
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado una evidencia cuyas tres comprobaciones (hash, firma, raíz merkle) son válidas
    Cuando se solicita su verificación en una disputa o auditoría
    Entonces la evidencia queda certificada como inmutable y auditable y puede incorporarse a la deliberación de los Socios
    ```
  - **Criterio 4 [Gherkin]:**
    ```gherkin
    Dado una evidencia cuyo hash, firma o inclusión en la raíz merkle no coinciden
    Cuando se ejecuta la verificación
    Entonces la evidencia se marca como no válida y el caso se reporta a moderación/soporte para posible sanción
    ```
  - **Criterio 5 [Gherkin]:**
    ```gherkin
    Dado un archivo IPFS indisponible durante la verificación
    Cuando no puede recomputarse el hash SHA-256
    Entonces la evidencia queda pendiente de verificación y se notifica al solicitante
    ```
- **Trazabilidad:** Cubre: RF-11.1, RF-11.2, RF-11.3, RF-11.4, RF-18.6, RNF-01.5; Decisión D23.

---

## 11. Módulo Administración (Owner, Moderador, Socios)

### CU-28 · Dashboard de administración del Owner

- **Objetivo del actor:** El Owner quiere gestionar desde un dashboard de acceso exclusivo todas las secciones de la plataforma (contratos, finanzas, usuarios, KPIs de disputas, base de datos y sub-módulos) y operar/monitorear la infraestructura y las claves.
- **Actores:** Owner (primario, acceso exclusivo) · Sistema · Moderador (consulta/colaboración opcional).
- **Precondiciones:**
  1. El usuario autenticado es el **Owner** (EO owner que despliega los contratos — RF-15.1).
  2. El acceso a los servicios no públicos está **restringido** (RNF-01.6, RT-05.4).
- **Flujo principal:**
  1. El Owner se autentica e ingresa al **dashboard de acceso exclusivo del owner** (RF-13.1).
  2. El Owner gestiona las secciones de la plataforma (RF-13.1): contratos desplegados, finanzas generales (incluye configuración de porcentajes del fondo — D7 → CU-30), usuarios inscritos, KPIs de disputas, base de datos off-chain y cualquier sub-módulo de rendimiento.
  3. El Owner opera/monitorea relayer + indexador + backend (Operador de Infraestructura — RF-18.1, D15) y revisa health-checks, cola de reintentos y saldo del fondo de gas (D15).
  4. El Owner custodia las claves **RELAYER/ADMIN_PRIVATE_KEY en Secret Manager** con política de **rotación** y separación de funciones (RF-18.5).
  5. Las acciones relevantes quedan en el registro auditable (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Acceso no autorizado:** un usuario distinto del Owner no puede ingresar (acceso restringido — RNF-01.6, RT-05.4).
  - **A2 — Rotación de claves:** ante sospecha de compromiso, el Owner rota las claves del Secret Manager (RF-18.5).
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** El sistema deberá otorgar acceso al dashboard de administración únicamente a la cuenta Owner (EO owner) y denegarlo a cualquier otro usuario.
  - **Criterio 2 [Gherkin]:**
    ```gherkin
    Dado el Owner autenticado en el dashboard
    Cuando navega por las secciones de contratos desplegados, finanzas generales, usuarios inscritos, KPIs de disputas y base de datos off-chain
    Entonces cada sección muestra los datos vigentes y permite las acciones de gestión correspondientes al rol
    ```
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado el panel de Operador de Infraestructura del Owner
    Cuando el relayer o indexador reporta un health-check fallido o el saldo del fondo de gas es bajo
    Entonces el dashboard muestra la alerta con la instancia afectada y el saldo, y registra la acción de monitoreo
    ```
  - **Criterio 4 [EARS]:** El sistema deberá custodiar las claves RELAYER/ADMIN_PRIVATE_KEY en Secret Manager con política de rotación y separación de funciones, registrando cada rotación en el registro auditable.
- **Trazabilidad:** Cubre: RF-13.1, RF-15.1, RF-18.1, RF-18.5, RF-18.6, RNF-01.6, RT-05.4; Decisiones D15, D25.

---

### CU-29 · Moderación de publicaciones y campañas

- **Objetivo del actor:** El Moderador/Owner quiere detectar y bloquear contenido que infringe las normas (publicaciones, encargos, campañas, subastas), notificar al autor y mantener el registro auditable.
- **Actores:** Moderador / Owner (primario) · Usuarios autores · Sistema.
- **Precondiciones:**
  1. Existen publicaciones (CU-06), encargos (CU-07), campañas (CU-09/CU-10) o subastas (CU-25) activas sujetas a moderación (RF-18.2).
  2. El Moderador/Owner tiene rol de moderación autenticado.
- **Flujo principal:**
  1. El Moderador/Owner revisa el contenido reportado o alertado (publicación, campaña, subasta — RF-18.2).
  2. El Moderador/Owner **bloquea el contenido** que viola las normas (RF-18.2).
  3. El Sistema notifica al autor con el motivo y registra la acción en el registro auditable (RF-18.6).
  4. El autor puede apelar vía soporte al usuario (Owner + moderador — RF-18.3).
- **Flujos alternativos:**
  - **A1 — Contenido válido:** el reporte se descarta y el contenido continúa activo.
  - **A2 — Violación de norma en un trueque activo:** se aplica el bloqueo de intercambio (RF-05.8 → CU-17).
  - **A3 — Apelación aceptada:** el Moderador/Owner restaura el contenido (RF-18.3).
- **Criterios de aceptación:**
  - **Criterio 1 [Gherkin]:**
    ```gherkin
    Dado un contenido reportado o alertado (publicación, encargo, campaña o subasta)
    Cuando el Moderador/Owner verifica que viola las normas y lo bloquea
    Entonces el contenido deja de ser visible/operativo y se notifica al autor con el motivo
    ```
  - **Criterio 2 [Gherkin]:**
    ```gherkin
    Dado un contenido revisado sin infracción
    Cuando el Moderador/Owner descarta el reporte
    Entonces el contenido permanece activo y no se aplica ninguna acción
    ```
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado un contenido bloqueado cuyo autor apela
    Cuando el Moderador/Owner acepta la apelación
    Entonces el contenido se restaura a su estado activo previo
    ```
  - **Criterio 4 [EARS]:** Si la violación de norma ocurre dentro de un trueque activo con activos custodiados, el sistema deberá aplicar el bloqueo del intercambio (estado BLOCKED) conforme a CU-17, no solo la moderación del contenido.
  - **Criterio 5 [Gherkin]:**
    ```gherkin
    Dado un bloqueo de contenido ejecutado por el Moderador/Owner
    Cuando se registra la acción
    Entonces el registro auditable contiene el contenido, el motivo, el moderador actuante y la fecha/hora
    ```
- **Trazabilidad:** Cubre: RF-05.8, RF-18.2, RF-18.3, RF-18.6.

---

### CU-30 · Finanzas globales y fondo de valor (Owner + Socios)

- **Objetivo del actor:** El Owner quiere configurar los porcentajes del fondo de valor y los Socios quieren consultar las finanzas globales, asegurando que el fondo se nutra de las tres fuentes y financie la operación.
- **Actores:** Owner (configuración) · Usuarios Socios (acceso Finanzas Globales) · Sistema (contratos + indexador).
- **Precondiciones:**
  1. El Owner está autenticado (RF-13.1); los Socios tienen rol activo (RF-14.8).
  2. El saldo BRLT solo es visible/gestionable para **Socios y Owner** (D5, RF-14.7).
- **Flujo principal:**
  1. El Owner configura desde su dashboard los **porcentajes del fondo de valor** (D7): comisión base del **1 % del valor de cada trueque completado**, **10 % de las suscripciones de empresas** y **5 % de la emisión de BRLT** — los tres **configurables por el Owner** (RF-03.9, D7).
  2. El Sistema aplica automáticamente las contribuciones en cada evento: trueque COMPLETADO (1 % — CU-15), cobro de suscripción (10 % — CU-24) y emisión de BRLT (5 % — CU-31).
  3. El fondo cubre los **gastos de operación** (hosting, gas, red de despliegue — RF-03.9) y **financia el gas del relayer**, alertando saldo bajo (D15).
  4. Los **Socios acceden a Finanzas Globales**: gastos de mantenimiento, gastos de gas, etc. (RF-14.8).
  5. El registro financiero se mantiene auditado (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Saldo bajo del fondo de gas:** el Sistema alerta al Owner (Operador — D15) para recargar desde el fondo.
  - **A2 — Acceso no autorizado a saldos BRLT:** solo Socios y Owner gestionan/ven el saldo BRLT (D5, RF-14.7).
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** El sistema deberá aplicar al fondo de valor el 1 % del valor de cada trueque completado, el 10 % de cada suscripción de empresa y el 5 % de cada emisión de BRLT.
  - **Criterio 2 [EARS]:** Si el Owner modifica los porcentajes del fondo desde su dashboard, el sistema deberá aplicar los nuevos porcentajes a los eventos posteriores a la modificación y registrar el cambio.
  - **Criterio 3 [EARS]:** El sistema deberá permitir ver y gestionar el saldo BRLT únicamente a usuarios con rol Socio o a la cuenta Owner.
  - **Criterio 4 [EARS]:** El sistema deberá otorgar acceso a la sección Finanzas Globales (gastos de mantenimiento, gastos de gas, contribuciones al fondo) solo a los usuarios Socios y al Owner.
  - **Criterio 5 [Gherkin]:**
    ```gherkin
    Dado el fondo de valor financiando el gas del relayer
    Cuando el saldo del fondo cae por debajo del umbral configurado de alerta
    Entonces el sistema notifica al Owner para la recarga desde el fondo
    ```
- **Trazabilidad:** Cubre: RF-03.9, RF-13.1, RF-14.7, RF-14.8; Decisiones D5, D7, D15.

---

### CU-31 · Emisión y administración de la stablecoin BorloTokens (BRLT)

- **Objetivo del actor:** Los Socios quieren emitir y ajustar el valor de la stablecoin BRLT —desde el inicio del proyecto, bajo control del contrato de Socios— y habilitar que el nivel Frecuente ofrezca artículos por BRLT.
- **Actores:** Usuarios Socios (administración — RF-12.3, primarios) · Contrato BRLT (ERC-20 controlado por el contrato de Socios) · Sistema · Owner (supervisión).
- **Precondiciones:**
  1. El contrato **BRLT** (ERC-20) está desplegado y es **controlado por el contrato de Socios** desde el inicio del proyecto (RF-12.1, RF-12.4, D6).
  2. Solo los Socios administran la **emisión y el valor** de BRLT (RF-12.3).
  3. La emisión está sujeta al **tope inicial de 1.000.000 BRLT** (D32); aumentar el tope exige votación de ≥2/3 de Socios.
- **Flujo principal:**
  1. Los Socios proponen la operación (emisión o ajuste de valor) sobre BRLT (RF-12.3), **registrando el propósito** de cada emisión (D32).
  2. El contrato de Socios valida la autorización con **quórum ≥2/3** y que la emisión **no supere el tope vigente** (D32), y ejecuta la emisión/ajuste en el contrato BRLT (RF-12.1, D6).
  3. El Sistema aplica la contribución del **5 % de la emisión de BRLT** al fondo de valor (D7, RF-03.9).
  4. El nivel **Frecuente** puede ofrecer artículos a cambio de **BRLT** (RF-12.2), liquidando en el intercambio correspondiente.
  5. El saldo BRLT es visible/gestionable **solo para Socios y Owner** (D5, RF-14.7); el Frecuente recibe/usar BRLT dentro del trueque (finanza de usuario off-chain) pero la administración de emisión/valor y el saldo consolidado global restan a Socios/Owner.
  6. El registro se mantiene auditado (RF-18.6).
- **Flujos alternativos:**
  - **A1 — Operación no autorizada por Socios:** el contrato de Socios rechaza la emisión/ajuste (control por el contrato de Socios — RF-12.1, D6).
  - **A2 — Emisión que excede el tope:** se rechaza salvo que una votación de **≥2/3 de Socios apruebe el aumento del tope** (D32).
- **Criterios de aceptación:**
  - **Criterio 1 [EARS]:** El sistema deberá permitir ejecutar emisiones y ajustes de valor de BRLT únicamente a través del contrato de Socios con **quórum de ≥2/3** (RF-12.1, D32), sin autorización de otras cuentas.
  - **Criterio 1b [EARS]:** El sistema deberá rechazar toda emisión que supere el **tope vigente de 1.000.000 BRLT** a menos que una votación de ≥2/3 de Socios apruebe previamente el aumento del tope (D32).
  - **Criterio 1c [EARS]:** El sistema deberá **registrar el propósito de cada emisión** de BRLT en el registro auditable (D32).
  - **Criterio 2 [Gherkin]:**
    ```gherkin
    Dado una operación de emisión o ajuste de valor de BRLT propuesta por los Socios y aprobada con quórum de 2/3 sin exceder el tope vigente
    Cuando el contrato de Socios valida la autorización y la ejecuta
    Entonces el contrato BRLT actualiza totalSupply/valor y el sistema aplica el 5 % de la emisión al fondo de valor
    ```
  - **Criterio 3 [Gherkin]:**
    ```gherkin
    Dado una operación de emisión o ajuste intentada por una cuenta sin rol Socio
    Cuando el contrato de Socios evalúa la autorización
    Entonces la operación se rechaza y no se modifica el contrato BRLT
    ```
  - **Criterio 4 [EARS]:** El sistema deberá permitir que un usuario de nivel Frecuente ofrezca artículos a cambio de BRLT en sus intercambios y liquide el saldo correspondiente dentro del trueque (finanza de usuario).
  - **Criterio 5 [EARS]:** El sistema deberá restringir la visibilidad y la administración del saldo BRLT consolidado global y de la emisión/valor a los usuarios con rol Socio y a la cuenta Owner.
  - **Criterio 6 [EARS]:** El sistema deberá registrar en el registro auditable toda emisión y ajuste de valor de BRLT con su monto, propósito, autorización y sello de tiempo.
- **Trazabilidad:** Cubre: RF-12.1, RF-12.2, RF-12.3, RF-12.4, RF-14.7; Decisiones D5, D6, D7, D32.

---

## Resumen de cobertura (CU-01…CU-31)

| Rango | Casos incluidos | Módulos |
|---|---|---|
| CU-01…CU-16 | 16 casos de uso (identidad, catálogo, campañas, intercambios/escrow) | Identidad/registro/clasificación (CU-01…05), Catálogo y publicaciones (CU-06…08), Campañas (CU-09…10), Intercambios y escrow (CU-11…16) |
| CU-17…CU-31 | 15 casos de uso (bloqueo, disputas, reputación, gas, subastas, evidencia, administración) | Anulación/disputas/sanciones, Reputación y niveles, Gas/meta-transacciones/suscripciones, Subastas de empresa, Evidencia on-chain e imágenes, Administración (Owner/Moderador/Socios) |

> Cada criterio de aceptación es verificable (UI, contrato, API o BD) y las reglas duras (quórum
> ≥2/3, plazo ≤5 días, ANULADO por defecto D26, timelock 6 h, escalera D28, subastas solo Empresa
> crea / solo Certificado puja con mayor valor D27, campañas aprobadas por Socios, BRLT solo
> Socios/Owner con tope D32, recuperación social 3/2-3/48h D34) se respetan literalmente de
> `requerimientos.md`. Diagramas disponibles en `RepoTecnico/CDU/`.
