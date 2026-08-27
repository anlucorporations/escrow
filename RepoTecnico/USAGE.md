# Escrow DApp - Guía de Uso Rápido

## Inicio Automático (Recomendado)

```bash
./start.sh
```

Este script hace todo automáticamente:
1. ✓ Verifica si Anvil está corriendo (lo inicia si no)
2. ✓ Despliega el contrato Escrow
3. ✓ Despliega 2 tokens de prueba (TKA y TKB)
4. ✓ Agrega los tokens al contrato Escrow
5. ✓ Mintea 1000 tokens a 3 cuentas de Anvil
6. ✓ Actualiza la configuración web
7. ✓ Inicia el servidor web en localhost:3000

## Detener Servicios

```bash
./stop.sh
```

## Solo Desplegar Contratos

Si solo quieres desplegar los contratos sin iniciar servidores:

```bash
./setup.sh
```

## Configurar MetaMask

### 1. Agregar Red Local

- **Network Name:** Localhost 8545
- **RPC URL:** http://localhost:8545
- **Chain ID:** 31337
- **Currency Symbol:** ETH

### 2. Importar Cuenta de Prueba

Después de ejecutar `./start.sh`, encontrarás las claves privadas en `deployment-info.txt`

**Cuentas de prueba (Anvil por defecto):**

**Cuenta #0** (Administrador)
```
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Cuenta #1** (Usuario 1)
```
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Cuenta #2** (Usuario 2)
```
Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

Todas las cuentas tienen 10,000 ETH y 1,000 de cada token (TKA y TKB).

## Flujo de Trabajo Típico

### Escenario 1: Usuario 1 quiere cambiar TKA por TKB

1. **Usuario 1 - Crear Operación**
   - Conectar wallet (Cuenta #1)
   - Ir a "Create Operation"
   - Token A: [dirección de TKA] (del deployment-info.txt)
   - Amount A: 100
   - Token B: [dirección de TKB]
   - Amount B: 200
   - (Opcional) Deadline: 7 días
   - Click "Create Operation" → **1 solo botón encadena approve + createOperation**
   - Confirmar ambas transacciones en MetaMask

2. **Usuario 2 - Completar Operación**
   - Desconectar y conectar con Cuenta #2
   - Ver la operación en la lista (estado **Activa**)
   - Click "Complete Operation" → **1 solo botón encadena approve + completeOperation**
   - Confirmar ambas transacciones en MetaMask
   - ✓ Usuario 2 recibe 100 TKA
   - ✓ Usuario 1 recibe 200 TKB
   - Estado: **Completada**

### Escenario 2: Usuario 1 cancela su operación

1. **Usuario 1 - Crear Operación** (mismo proceso anterior)

2. **Usuario 1 - Cancelar**
   - Ver su operación en la lista
   - Click "Cancel Operation" → Confirmar transacción
   - ✓ Recupera sus 100 TKA
   - Estado: **Cancelada**

### Escenario 3: Expiración sin contraparte

1. **Usuario 1** crea una operación con deadline (ej. 1 día)
2. Nadie la completa antes de vencer
3. **Usuario 1** ve el botón "Reclamar fondos (venció)"
4. Click → `refundAfterExpiry()` → ✓ Recupera su tokenA

### Escenario 4: Disputa y arbitraje

1. **Usuario 1** crea una operación (ej. 1.000 USDT ↔ 1 DELIVERY)
2. Una parte hace click en "Disputar operación" → estado **En disputa**
3. **Árbitro** (cuenta designada por el admin) ve el "Panel de árbitro"
4. Resuelve a favor del creador (refund) o de la contraparte (pago liberado)

### Escenario 5: Admin agrega un nuevo token

1. **Admin - Agregar Token**
   - Conectar wallet (Cuenta #0)
   - Ir a "Add Token (Admin Only)"
   - Token Address: [dirección del nuevo token]
   - Click "Add Token" → Confirmar transacción
   - ✓ Token agregado (validado on-chain: contrato + symbol()) y disponible

## Comandos Útiles

### Ver información de deployment
```bash
cat deployment-info.txt
```

### Ver logs de Anvil
```bash
tail -f anvil.log
```

### Recompilar contratos
```bash
cd sc && forge build
```

### Ejecutar tests
```bash
cd sc && forge test
```

### Recompilar web
```bash
cd web && npm run build
```

## Troubleshooting

### "Anvil is not running"
```bash
# En una terminal separada:
anvil
```

### "Port already in use"
```bash
./stop.sh
./start.sh
```

### "Transaction failed" en MetaMask
- Verifica que estés en la red correcta (Localhost 8545)
- Resetea la cuenta en MetaMask: Settings → Advanced → Clear activity tab data
- Reinicia Anvil: `./stop.sh && ./start.sh`

### Los tokens no aparecen en MetaMask
MetaMask no muestra automáticamente los tokens. Para verlos:
1. Ve a "Assets" → "Import tokens"
2. Pega la dirección del token (de deployment-info.txt)
3. El símbolo y decimales se detectarán automáticamente

### "Insufficient allowance" error
- Asegúrate de hacer click en "Approve" antes de crear/completar operaciones
- Si ya aprobaste, puedes ir directo al segundo paso

## Archivos Importantes

- `deployment-info.txt` - Direcciones de contratos y cuentas
- `anvil.log` - Logs de Anvil (si fue iniciado por start.sh)
- `web/lib/contracts.ts` - Configuración de contratos (actualizado por setup.sh)

## URLs

- **Web App:** http://localhost:3000
- **Anvil RPC:** http://localhost:8545
- **Anvil Chain ID:** 31337
