# Escrow DApp - Setup Guide

## Quick Start

### 1. Start Anvil (Terminal 1)
```bash
anvil
```

Keep this terminal running.

### 2. Deploy Contracts (Terminal 2)
```bash
./setup.sh
```

This will:
- Deploy Escrow contract
- Deploy mock tokens: TKA, TKB, USDT (6 decimals) y DELIVERY
- Authorize all tokens in the escrow contract
- Designate an **arbiter** (account #3 by default)
- Mint test tokens to the Anvil accounts
- Create `web/.env.local` with `NEXT_PUBLIC_ESCROW_ADDRESS`
- Write `deployment-info.txt` with all addresses and keys

Verify everything works:
```bash
./verify-setup.sh
```

### 3. Configure MetaMask

#### Add Localhost Network
1. Open MetaMask
2. Click network dropdown (top left)
3. Click "Add Network" → "Add a network manually"
4. Fill in:
   - **Network Name**: Anvil Local
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
5. Click "Save"

#### Import Test Account
1. Click account icon (top right)
2. Select "Add account or hardware wallet" → "Import account"
3. Paste one of these private keys (without 0x prefix):
   ```
   ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Click "Import"

This account (Account #0, the owner/admin) will have:
- ~10,000 ETH (for gas)
- 1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY

### 4. Start Web App (Terminal 2)
```bash
cd web
npm run dev
```

Open http://localhost:3000

### 5. Connect Wallet
1. Click "Connect Wallet" button
2. Select MetaMask
3. Approve connection
4. Make sure you're on "Anvil Local" network

## Using the DApp

### Add Token (Admin Only - Account #0)
The first account (0xf39F...) is the owner and can add new tokens to the escrow.

1. Go to /add-token (visible only for the owner)
2. Enter token address (e.g., a new MockERC20 from deployment-info.txt)
3. Click "Añadir token"
4. Approve transaction in MetaMask
5. The contract validates that the address has code and implements `symbol()`

### Designate the Arbiter (Admin Only)
The same admin page lets you set the arbitration address. Only the arbiter can
resolve disputes.

### Create Operation (1 button)
1. Connect with Account #1 (or #2) in MetaMask
2. In "Operaciones", click "+ Nueva operación"
3. Select Token A, amount A, Token B, amount B
4. Optional: deadline in days (0 = no expiration)
5. Select type: **SWAP** or **PAGO con garantía**
6. Click **"Crear operación"** — a single button chains `approve(tokenA)` +
   `createOperation()` (confirm both transactions in MetaMask)

### Complete Operation (Second User)
1. Import second account to MetaMask:
   ```
   59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```
2. Switch to this account in MetaMask
3. Find an active operation in the list
4. Click **"Completar operación"** — a single button chains `approve(tokenB)` +
   `completeOperation()` (confirm both transactions in MetaMask)
5. Both users receive their tokens in the same atomic transaction

### Expiration / Dispute / Arbitration
- When an operation's deadline passes, the creator sees **"Reclamar fondos (venció)"**
- Any party can open a **dispute** with the "Disputar operación" button
- The arbiter (account #3 by default) sees the **Panel de árbitro** on disputed
  operations and can resolve them

## Test Accounts

All accounts have ETH + mock tokens (see deployment-info.txt):

```
Account #0 (Owner/Admin): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1 (User1): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2 (User2): 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

Account #3 (Arbiter): 0x90F79bf6EB2c4f870365E785982E1f101E93b906
Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
```

## Troubleshooting

### "Adding..." button stuck
- Check that MetaMask is connected to "Anvil Local" (Chain ID 31337)
- Make sure you approved the transaction in MetaMask popup
- Check browser console (F12) for errors
- Verify you're using Account #0 for admin functions

### Transaction fails
- Make sure you have enough tokens
- Check that tokens are approved (the app chains approve + tx automatically)
- Verify you're connected to the correct network
- If you see a friendly error in Spanish, it explains the revert reason

### Need to reset
```bash
# Stop Anvil (Ctrl+C in Terminal 1)
# Restart Anvil
anvil

# Re-run setup
./setup.sh

# In MetaMask:
# Settings → Advanced → Clear activity tab data
```

## Development

### Build contracts
```bash
cd sc
forge build
```

### Run tests
```bash
cd sc
forge test
```

### Build web
```bash
cd web
npm run build
```
