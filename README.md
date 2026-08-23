# Escrow DApp

A decentralized escrow application for secure ERC20 token swaps on Ethereum.

## Quick Start (Automated)

The easiest way to get started:

```bash
# Make sure you have Anvil installed (part of Foundry)
./start.sh
```

This script will:
- Check if Anvil is running (starts it if not)
- Deploy all contracts (Escrow + 2 mock tokens)
- Add tokens to the escrow contract
- Mint test tokens to Anvil accounts
- Update web configuration with contract addresses
- Create `.env.local` with all environment variables
- Start the web application

**Alternative: Manual setup only**
```bash
./setup.sh  # Deploy contracts without starting servers
```

**Stop all services:**
```bash
./stop.sh
```

**View available accounts:**
```bash
./accounts.sh  # Show all Anvil test accounts and private keys
source ./accounts.sh  # Load as environment variables
```

## 🔑 Test Accounts

After running `./setup.sh` or `./start.sh`, you'll have access to 3 pre-funded accounts.

See [ACCOUNTS.md](ACCOUNTS.md) for detailed information about accessing and using the test accounts.

Quick access:
- All accounts have 10,000 ETH for gas
- All accounts have 1,000 TKA and 1,000 TKB tokens
- Private keys are in `deployment-info.txt` and `web/.env.local`

## Project Structure

```
.
├── sc/           # Smart contracts (Foundry)
│   ├── src/      # Contract source files
│   ├── test/     # Contract tests
│   └── script/   # Deployment scripts
└── web/          # Frontend (Next.js)
    ├── app/      # Next.js pages
    ├── components/ # React components
    └── lib/      # Configuration and utilities
```

## Features

### Smart Contract Features

- **Multi-token Support**: Admin can add multiple ERC20 tokens (validated on-chain)
- **Create Operations**: Users can create escrow operations specifying:
  - Token A (offering), Token B (requesting), Amount A and Amount B
  - Optional **deadline** (expiration) after which the creator can recover funds
- **Complete Operations**: Other users can fulfill escrow operations (atomic swap)
- **Cancel Operations**: Creators can cancel their operations and retrieve tokens
- **Arbitration**: Owner can designate an arbiter; parties can open a dispute and
  the arbiter resolves it (refund to creator or payment to counterparty)
- **Pagination**: `getOperations(offset, limit)` + `getOperationsCount()`
- **Status enum**: `Active / Completed / Cancelled / Disputed` instead of a bool
- **Security**: Uses OpenZeppelin's ReentrancyGuard and Ownable

### Web Features

- **Wallet Connection**: Connect via MetaMask or other injected wallets
- **Admin Panel**: Add new tokens and designate the arbiter
- **Create Operations**: One-button flow (approve + tx chained) with deadline and type
- **View Operations**: Status badges, filters (Activa / Completada / Cancelada /
  En disputa / Vencida) and "My activity" filter
- **Arbitrator panel**: contextual actions to resolve disputes
- **Correct decimals**: amounts formatted with each token's real `decimals()`

## Getting Started

### Prerequisites

- Node.js 18+
- Foundry (for smart contracts)
- MetaMask or compatible Web3 wallet

### Smart Contracts Setup

1. Navigate to the smart contracts directory:
```bash
cd sc
```

2. Install dependencies (forge-std + OpenZeppelin). `setup.sh` does this
   automatically; manually you can run:
```bash
git clone --depth 1 --branch v1.11.0 https://github.com/foundry-rs/forge-std lib/forge-std
git clone --depth 1 --branch v5.4.0 https://github.com/OpenZeppelin/openzeppelin-contracts lib/openzeppelin-contracts
```

3. Compile contracts:
```bash
forge build
```

4. Run tests:
```bash
forge test
```

5. Start local blockchain (Anvil):
```bash
anvil
```

6. Deploy contracts (in another terminal):
```bash
forge script script/Escrow.s.sol:EscrowScript --rpc-url http://localhost:8545 --private-key <PRIVATE_KEY> --broadcast
```

7. Note the deployed contract address and update it in `web/lib/contracts.ts`

### Web Application Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Update the contract address in `lib/contracts.ts`:
```typescript
export const ESCROW_ADDRESS = '0xYourDeployedAddress' as const;
```

4. Run development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage Flow

### For Admin

1. Connect your wallet
2. Add supported ERC20 tokens using the "Add Token" form

### For User 1 (Creating Operation)

1. Connect your wallet
2. Use the "Create Operation" form:
   - Enter Token A address (token you're offering)
   - Enter Amount A
   - Enter Token B address (token you want)
   - Enter Amount B
   - Optional: deadline in days (0 = no expiration)
   - Select the operation type (SWAP or PAYMENT with escrow)
3. Click **"Create Operation"** — a single button chains
   `approve(tokenA)` + `createOperation()` and confirms both transactions
4. Your operation appears in the operations list as **Activa**

### For User 2 (Completing Operation)

1. Connect your wallet
2. Browse operations in the operations list
3. Find an active operation you want to complete
4. Click **"Complete Operation"** — a single button chains
   `approve(tokenB)` + `completeOperation()` and confirms both transactions
5. Tokens are swapped atomically in the same transaction:
   - You receive Token A
   - Creator receives Token B
   - Operation is marked as **Completada**

### Cancelling an Operation

If you created an operation and want to cancel it:
1. Find your operation in the list
2. Click "Cancel Operation"
3. Confirm the transaction
4. Your tokens are returned (operation **Cancelada**)

### Expiration, Disputes and Arbitration

- If an operation has a deadline and it expires without a counterparty, the
  creator sees **Reclamar fondos (venció)** → calls `refundAfterExpiry()`
- Any party can open a **dispute** while the operation is active
- The designated arbiter sees the **Panel de árbitro** and resolves the dispute
  (refund to creator, or payment to the counterparty)

## Testing with Mock Tokens

For local testing, you can deploy mock ERC20 tokens:

1. The `MockERC20.sol` contract is included in the `sc/src` directory
2. Deploy two mock tokens (constructor: name, symbol, decimals):
```bash
forge create src/MockERC20.sol:MockERC20 --constructor-args "Token A" "TKA" 18 --rpc-url http://localhost:8545 --private-key <PRIVATE_KEY>
forge create src/MockERC20.sol:MockERC20 --constructor-args "Token B" "TKB" 18 --rpc-url http://localhost:8545 --private-key <PRIVATE_KEY>
```
3. Add these token addresses to the escrow contract via the web interface
4. Use these addresses when creating operations

## Contract Addresses

After deployment, update these addresses in your configuration:

- **Escrow Contract**: set `NEXT_PUBLIC_ESCROW_ADDRESS` in `web/.env.local`
  (created automatically by `setup.sh`)
- **ERC20 Tokens**: Add via the admin interface in the web app

## Technology Stack

### Smart Contracts
- Solidity ^0.8.13
- Foundry
- OpenZeppelin Contracts

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- ethers.js v6
- Vitest + Testing Library (component tests)

## Security Considerations

- All token transfers use OpenZeppelin's IERC20 interface
- ReentrancyGuard protects against reentrancy attacks
- Ownable pattern restricts admin functions
- Users must approve tokens before operations
- Operations can only be completed by users other than the creator

## License

MIT
