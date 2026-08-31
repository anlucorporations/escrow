# 🔧 Guía de Solución de Problemas (Troubleshooting) — TrueKeat

Esta guía contiene soluciones directas y diagnósticos para los errores más frecuentes en el entorno local y en producción.

---

## 1. Problemas de Conectividad Web3 & Billeteras

### ❌ Error: *"Chain mismatch / Red incorrecta"*
* **Causa**: MetaMask o tu billetera está conectada a Ethereum Mainnet o Sepolia en lugar de Anvil Local.
* **Solución**:
  - Cambiar de red a **Anvil Local**.
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Símbolo de moneda: `ETH`

### ❌ Error: *"Nonce too low / Transaction replaced"*
* **Causa**: Anvil fue reiniciado y la billetera conserva un historial de nonces más alto en su caché.
* **Solución**:
  - En MetaMask: Ir a **Ajustes** -> **Avanzado** -> **Restablecer datos de la cuenta (Clear Activity & Nonce History)**.

---

## 2. Problemas con la Base de Datos PostgreSQL

### ❌ Error: *"Connection refused to 127.0.0.1:5432"*
* **Causa**: El servicio PostgreSQL local está detenido.
* **Solución**:
  - En Windows PowerShell (como Administrador):
    ```powershell
    Start-Service postgresql-x64-18
    ```
  - Verificar conectividad:
    ```bash
    node web/scripts/test-local-db.mjs
    ```

### ❌ Error: *"DATABASE_URL missing or invalid schema"*
* **Solución**:
  - Verificar que el archivo `web/.env.local` contenga la cadena de conexión completa:
    ```env
    DATABASE_URL="postgresql://postgres:anlu1234@127.0.0.1:5432/TrueKeate"
    ```
  - Ejecutar el script de inicialización y migración:
    ```bash
    node web/scripts/seed-platform-data.mjs
    ```

---

## 3. Problemas de Cuotas y Creación de Operaciones

### ❌ Error: *"Inscrito limit: max 1 active trade"*
* **Causa**: Tu cuenta está en **Nivel 1 (Inscrito)** y ya posee un intercambio activo en curso.
* **Solución**:
  - Completa o cancela la operación activa en `/operations`.
  - O bien, asciende a **Nivel 2 (Verificado)** en `/identity` mediante 2FA para desbloquear hasta 3 intercambios simultáneos.

### ❌ Error: *"Distance exceeds maximum limit of 10.0 km"*
* **Causa**: El punto de encuentro propuesto está a más de 10 kilómetros de distancia entre las partes.
* **Solución**:
  - Seleccionar un punto geográfico céntrico en Barlovento (ej. Plaza Bolívar de Higuerote o centro comercial comunitario) que cumpla con el radio de seguridad.
