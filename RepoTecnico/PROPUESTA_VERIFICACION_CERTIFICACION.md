# Propuesta de metodología · Verificación por correo (SMTP) y Certificación KYC

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** |
| Archivo | `RepoTecnico/PROPUESTA_VERIFICACION_CERTIFICACION.md` |
| Estado | **Propuesta** (los procesos requieren servicios externos no desplegados aún) |
| Fecha | 2026-09-04 |
| Alcance | Escalera D28 (CU-02): etapa 1 Verificación (código por correo) y etapa 2 Certificación (KYC con documentos) |

---

## 1. Estado actual (verificado en código)

- El backend **ya genera un código de 6 dígitos** (`/kyc/init`) y lo valida (`/kyc/verify-codes`)
  → estado `VERIFICADO` (`backend/api/routes/kyc.js`). Sin SMTP configurado devuelve el código en
  `codigoDemo` para poder operar en demo.
- La **UI ya existe**: `/suite/verificacion` (enviar y confirmar código) y `/suite/certificacion`
  (enviar documento + selfie → PENDIENTE de revisión del Owner → CERTIFICADO).
- **Lo que NO existe aún** (servicios externos):
  1. Envío real del código por **correo electrónico** (requiere SMTP + credenciales; D37 previó
     Nodemailer+SMTP).
  2. **Verificación automática de documentos** (KYC) con un servicio verificador externo
     (documento + selfie); hoy la revisión es 100 % humana del Owner (RF-18.4).

---

## 2. Propuesta de metodología — Etapa 1: envío de código por correo (SMTP)

### 2.1 Objetivo
Que `/kyc/init` envíe de verdad el código al correo del usuario y que la plataforma **no** lo
muestre en pantalla en producción (el `codigoDemo` solo existe en modo demo/sin SMTP).

### 2.2 Diseño
1. **Credenciales**: secretos en Secret Manager (`KYC_EMAIL_USER`, `KYC_EMAIL_PASS`,
   `KYC_EMAIL_HOST`, `KYC_EMAIL_PORT`) montados en Cloud Run (`truekeate-api`). El código ya lee
   `KYC_EMAIL_USER/PASS` (`kyc.js` → `enviarCodigoCorreo`).
2. **Proveedor**: **Nodemailer** sobre SMTP (Gmail app password o un servicio transaccional
   recomendado: SendGrid/Resend/Amazon SES para producción — mayor entregabilidad).
3. **Flujo** (ya implementado en `kyc.js`):
   - `POST /kyc/init` → genera código 6 dígitos (TTL 10 min) → `enviarCodigoCorreo()` → en
     producción NO se devuelve `codigoDemo`.
   - `POST /kyc/verify-codes` → compara y pasa a `VERIFICADO`.
4. **Persistencia del código**: hoy vive en un `Map` en memoria del proceso (válido en una
   instancia). En producción multi-instancia se debe persistir (tabla `codigos_verificacion`:
   wallet, código **hasheado** (bcrypt/sha256+sal), expiración, intentos) — **pendiente de
   implementar**.
5. **Seguridad**: intentos máximos (5) + bloqueo 10 min; código de un solo uso; reenvío con
   cooldown 60 s.
6. **Alternativa sin SMTP (móvil/demo)**: mostrar el código in-app (como hoy `codigoDemo`) —
   aceptable en desarrollo, **no** en producción.

### 2.3 Tareas necesarias
| # | Tarea | Estado |
|---|---|---|
| 1 | Secretos `KYC_EMAIL_*` en Secret Manager + montar en Cloud Run | pendiente |
| 2 | Persistir códigos (hash + TTL) en PostgreSQL (tabla nueva) | pendiente |
| 3 | Rate-limit de envío y reintentos | pendiente |
| 4 | Plantilla de correo con la marca TrueKeate | pendiente |
| 5 | Retirar `codigoDemo` cuando SMTP esté activo | automático (ya condicionado) |

---

## 3. Propuesta de metodología — Etapa 2: Certificación KYC con documentos

### 3.1 Objetivo
Que `/kyc/submit` valide el **documento de identidad** y la **selfie** con un servicio verificador
automático y deje el resultado para la revisión humana del Owner (RF-18.4), subiendo a la cadena
solo la huella (merkle root) del KYC (RF-01.7, D28).

### 3.2 Diseño propuesto (3 opciones)

| Opción | Descripción | Ventajas | Desventajas |
|---|---|---|---|
| **A. Verificador SaaS** (Recomendado) | Integrar un proveedor KYC (p. ej. **Sumsub**, **Onfido**, **Persona**, **Veriff**) vía API: el usuario sube documento+selfie desde el frontend, el proveedor hace OCR + liveness, devuelve un veredicto | Cumplimiento real (GDPR/RF-18.7), anti-fraude, listo para producción | Costo por verificación; integración externa |
| **B. Servicio interno** | Pipeline propio: OCR (Tesseract/Google Vision) + comparación facial (cálculo de similitud) | Sin dependencia de pago por verificación | Mantenimiento, precisión menor, riesgo regulatorio |
| **C. Revisión humana asistida** (hoy) | El Owner revisa manualmente documento+selfie (RF-18.4) | Ya operativo, cero costo | No escala; sin verificación automática de autenticidad |

**Recomendación**: **Opción A** (Sumsub/Onfido/Persona) con:
- Cifrado en reposo de documento y selfie (D17) — solo se guardan refs cifradas y hashes.
- Cálculo de un **merkle root** del KYC (hash del documento + selfie + wallet) que se sube al
  Smart Account vía `cambiarEstadoVerificacion` (estado CERTIFICADO on-chain — D28/RF-01.7).
- Regla de negocio: el veredicto del proveedor **y** la revisión humana del Owner → CERTIFICADO.

### 3.3 Flujo objetivo (etapa 2)
1. Usuario **Verificado** entra a `/suite/certificacion`.
2. Sube documento y selfie (captura guiada por el proveedor SaaS).
3. El backend llama al proveedor → veredicto (APROBADO/RECHAZADO/REVISION).
4. Si aprobado por el proveedor → queda `PENDIENTE` de la revisión humana del Owner (RF-18.4).
5. El Owner aprueba → estado `CERTIFICADO`; se calcula el merkle root y se actualiza la escalera
   on-chain del Smart Account (D28) y la BD.
6. Acceso completo: todas las operaciones + subastas (RF-17.2).

### 3.4 Tareas necesarias
| # | Tarea | Estado |
|---|---|---|
| 1 | Elegir proveedor SaaS (Sumsub/Onfido/Persona) y contrato de servicio | pendiente (RF-18.7) |
| 2 | Secretos de API del proveedor en Secret Manager | pendiente |
| 3 | Servicio backend `/kyc/verify-documento` (proxy al proveedor) | pendiente |
| 4 | Persistir veredicto y refs cifradas (D17) en tabla `kyc` | parcial (refs) |
| 5 | Cálculo de merkle root + `cambiarEstadoVerificacion` on-chain | pendiente (D28) |
| 6 | Revisión humana Owner (RF-18.4) — ya existe `/kyc/review` | ✅ |

---

## 4. Impacto y riesgos

- **Privacidad (D17/GDPR)**: el documento nunca debe subirse a la cadena; solo hashes/merkle root.
  El proveedor SaaS procesa datos personales → requiere DPA (acuerdo de protección de datos).
- **Costo**: las verificaciones SaaS tienen costo por usuario; evaluar en RF-18.7.
- **Disponibilidad**: fallback manual del Owner si el proveedor está caído (RF-18.4).

---

## 5. Resumen

- **Verificación (etapa 1)**: el flujo con código ya funciona en demo; para producción real solo
  falta conectar SMTP (Secret Manager + persistencia de códigos). La UI ya está lista.
- **Certificación (etapa 2)**: la UI y la revisión del Owner existen; la verificación automática
  de documentos requiere un proveedor externo (recomendado Opción A) + merkle root on-chain.
- Ambas pendientes quedan **a decisión del director** (proveedor, presupuesto, plazos).
