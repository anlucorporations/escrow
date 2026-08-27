# Manual de Usuario: Plataforma Escrow & TrueKeate DApp

---

## 1. ¿Qué es Escrow / TrueKeate?

**TrueKeate** es una plataforma descentralizada diseñada para permitir intercambios seguros de activos, bienes y servicios utilizando tecnología Blockchain.

A través de nuestro contrato inteligente de **Escrow (Custodia Segura)**, garantizamos que:
* **Ninguna parte entrega su activo sin recibir el acordado**: Los fondos quedan retenidos de forma segura en la blockchain hasta que ambas partes cumplen las condiciones del intercambio.
* **Tus fondos nunca quedan atrapados**: Si la otra persona no responde o expira el plazo acordado, puedes cancelar la operación o reclamar un reembolso automático.
* **Resolución neutral de conflictos**: Cuentas con la protección de mediadores (Árbitros) en caso de desacuerdos.

---

## 2. Requisitos y Configuración Inicial

### 2.1 Instalar una Billetera Web3
Para interactuar con la plataforma necesitas una billetera como **MetaMask** o cualquier billetera compatible con Ethereum instalada en tu navegador.

### 2.2 Conexión a la Red de Pruebas (Anvil / Localhost)
Si estás probando la plataforma en un entorno de desarrollo local:
* **Nombre de la red**: Localhost / Anvil
* **URL de RPC**: `http://127.0.0.1:8545`
* **ID de cadena (Chain ID)**: `31337`
* **Símbolo de moneda**: `ETH`

### 2.3 Cuentas y Tokens de Prueba
El sistema proporciona cuentas de prueba precargadas con ETH y tokens ERC20 de ejemplo:
* **Token A (TKA)**: Token de prueba A.
* **Token B (TKB)**: Token de prueba B.
* **BRLT**: Token para membresías y suscripciones.

Puedes verificar tus saldos y solicitar tokens de prueba directamente desde la sección **Balances** de la plataforma.

---

## 3. Registro de Usuario (Paso Obligatorio)

Para garantizar la seguridad de la comunidad, cada billetera debe registrarse con un nombre de usuario único antes de operar.

```text
[ Conectar Billetera ] ---> [ Ingresar Nombre de Usuario (3-20 caracteres) ] ---> [ Confirmar Registro On-Chain ]
```

1. Haz clic en **"Conectar billetera"** en la esquina superior derecha.
2. Si es tu primera vez, aparecerá la pantalla de **Acceso restringido**.
3. Haz clic en **"Inscribirme ahora"**.
4. Elige un nombre de usuario único (sin espacios ni caracteres especiales).
5. Confirma la transacción en tu billetera. ¡Listo! Tu perfil ya está habilitado.

---

## 4. Guía Paso a Paso: Operaciones de Escrow

### 4.1 Cómo Crear una Operación (Publicar Oferta de Intercambio)

```text
Paso 1: Ir a "Operaciones" -> Clic en "Nueva Operación"
Paso 2: Seleccionar Token a Entregar (Token A) y Monto
Paso 3: Seleccionar Token a Recibir (Token B) y Monto
Paso 4: (Opcional) Establecer Fecha Límite (Deadline)
Paso 5: Clic en "Crear Operación" (Firma aprobación + creación)
```

1. Dirígete a la pestaña **Operaciones**.
2. Presiona el botón **"Nueva Operación"**.
3. Completa los campos:
   * **Token que ofreces**: Selecciona el token que vas a entregar (ej. 100 TKA).
   * **Token que solicitas**: Selecciona el token que esperas recibir (ej. 50 TKB).
   * **Plazo de expiración (Días)**: Define cuántos días estará disponible la oferta. Si colocas `0`, la operación no vencerá automáticamente.
4. Presiona **"Crear Operación"**. El sistema guiará la aprobación del token y el depósito de custodia en una sola interacción fluida.

---

### 4.2 Cómo Aceptar y Completar una Operación (Contraparte)

1. En la lista de **Operaciones**, busca una que se encuentre en estado **Activa**.
2. Verifica los montos: el token que debes pagar y el token que recibirás.
3. Haz clic en el botón **"Completar Operación"**.
4. Confirma la transacción en tu billetera.
5. **Resultado atómico instantáneo**:
   * El creador recibe tus tokens.
   * Tú recibes los tokens que estaban en custodia.
   * La operación pasa automáticamente a estado **Completada**.

---

### 4.3 Cómo Cancelar una Operación o Solicitar Reembolso

* **Cancelación voluntaria**: Si creaste una operación activa y decides que ya no deseas realizar el intercambio, haz clic en **"Cancelar Operación"**. Tus tokens depositados regresarán inmediatamente a tu billetera.
* **Reembolso por Vencimiento (Expirada)**: Si fijaste un plazo límite y este transcurrió sin que nadie completara la oferta, el botón cambiará a **"Reclamar Reembolso"**. Al hacer clic, recuperarás el 100% de tus tokens.

---

### 4.4 Disputas y Arbitraje

Si surge algún desacuerdo durante una operación:
1. Cualquier parte puede presionar **"Abrir Disputa"** mientras la operación esté activa.
2. La operación pasará al estado **En Disputa**.
3. El **Árbitro** oficial de la plataforma evaluará la situación y ejecutará la resolución:
   * **A favor del creador**: Los fondos en custodia se devuelven al creador.
   * **A favor de la contraparte**: Los fondos se transfieren al destinatario legítimo.

---

## 5. Marketplace TrueKeate: Catálogo, Citas y Reputación

Además del intercambio directo de tokens, TrueKeate te permite coordinar trueques del mundo real:

### 5.1 Catálogo de Artículos y Servicios (`Items`)
* Publica los bienes o servicios que ofreces indicando categoría, descripción y precio de referencia.
* Explora publicaciones de otros miembros de la comunidad.

### 5.2 Citas Presenciales Seguras (`Meetups`)
* Al acordar un intercambio físico, puedes programar un **Punto de Encuentro** seguro con fecha, hora y ubicación acordadas.
* Ambas partes pueden confirmar la asistencia para mayor seguridad.

### 5.3 Sistema de Reputación y Avales (`Ratings & Vouches`)
* **Calificaciones**: Al finalizar una operación, califica a tu contraparte de 1 a 5 estrellas y deja un comentario.
* **Avales Comunitarios (Vouches)**: Los miembros de confianza pueden avalar a otros usuarios, fortaleciendo la confianza colectiva en la plataforma.

---

## 6. Membresías Comerciales y Gobernanza

* **Suscripción de Empresas**: Comercios y usuarios de alta frecuencia pueden activar membresías mensuales pagando en token `BRLT` desde la sección de perfil.
* **Panel de Gobernanza**: Los usuarios con rango de **Socio** participan en la votación de propuestas para moderar la plataforma, resolver apelaciones y sancionar conductas fraudulentas.

---

## 7. Preguntas Frecuentes (FAQ)

### ¿Qué ocurre si la otra persona no transfiere sus tokens?
Absolutamente nada: tus tokens permanecen en el contrato de custodia. El intercambio es atómico; es imposible que una parte cobre sin que la otra reciba su parte.

### ¿Puedo modificar una operación una vez creada?
No es posible modificar los montos de una operación ya desplegada. Si cometiste un error, simplemente haz clic en **"Cancelar Operación"** para recuperar tus fondos y crea una nueva con los valores correctos.

### ¿Por qué mi transacción fue rechazada?
Las causas más comunes son:
1. Saldo insuficiente del token para cubrir la operación.
2. Saldo insuficiente de ETH para la tarifa de red (gas).
3. No haber firmado la aprobación previa del token.
