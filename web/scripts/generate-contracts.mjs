#!/usr/bin/env node
/**
 * Genera `web/lib/contracts.ts` con todos los ABIs reales compilados por Foundry
 * (Escrow, UserRegistry, Exchange, Governance, Subscription, SBTRegistry, etc.).
 *
 * Uso:
 *   node web/scripts/generate-contracts.mjs
 *
 * Debe ejecutarse después de `forge build` en sc/.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')

function loadArtifact(contractName) {
  const artifactPath = join(repoRoot, 'sc', 'out', `${contractName}.sol`, `${contractName}.json`)
  try {
    return JSON.parse(readFileSync(artifactPath, 'utf8'))
  } catch {
    return { abi: [] }
  }
}

const escrow = loadArtifact('Escrow')
const registry = loadArtifact('UserRegistry')
const exchange = loadArtifact('Exchange')
const governance = loadArtifact('Governance')
const subscription = loadArtifact('Subscription')
const sbtRegistry = loadArtifact('SBTRegistry')
const truekeSbt = loadArtifact('TruekeSBT')
const truekeRwa = loadArtifact('TruekeRWA')
const truekeService = loadArtifact('TruekeService')
const brlt = loadArtifact('BRLT')

const outPath = join(repoRoot, 'web', 'lib', 'contracts.ts')

const erc20Abi = `[
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonces",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DOMAIN_SEPARATOR",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bytes32" }],
    "stateMutability": "view"
  }
] as const;`

const content = `// GENERADO AUTOMÁTICAMENTE por web/scripts/generate-contracts.mjs — NO editar a mano.
// Se regenera con: node web/scripts/generate-contracts.mjs (tras forge build).

export const ESCROW_ABI = ${JSON.stringify(escrow.abi, null, 2)} as const;
export const USER_REGISTRY_ABI = ${JSON.stringify(registry.abi, null, 2)} as const;
export const EXCHANGE_ABI = ${JSON.stringify(exchange.abi, null, 2)} as const;
export const GOVERNANCE_ABI = ${JSON.stringify(governance.abi, null, 2)} as const;
export const SUBSCRIPTION_ABI = ${JSON.stringify(subscription.abi, null, 2)} as const;
export const SBT_REGISTRY_ABI = ${JSON.stringify(sbtRegistry.abi, null, 2)} as const;
export const TRUEKE_SBT_ABI = ${JSON.stringify(truekeSbt.abi, null, 2)} as const;
export const TRUEKE_RWA_ABI = ${JSON.stringify(truekeRwa.abi, null, 2)} as const;
export const TRUEKE_SERVICE_ABI = ${JSON.stringify(truekeService.abi, null, 2)} as const;
export const BRLT_ABI = ${JSON.stringify(brlt.abi, null, 2)} as const;

export const ERC20_ABI = ${erc20Abi}

// Direcciones de los contratos leídas de variables NEXT_PUBLIC_*
export const ESCROW_ADDRESS: string =
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export const USER_REGISTRY_ADDRESS: string =
  process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS ?? '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'

export const EXCHANGE_ADDRESS: string =
  process.env.NEXT_PUBLIC_EXCHANGE_ADDRESS ?? ''
// NOTA: sin NEXT_PUBLIC_EXCHANGE_ADDRESS la dirección queda vacía a propósito;
// los componentes del Exchange deben guardar el caso (no apuntar a otro contrato).

export const GOVERNANCE_ADDRESS: string =
  process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS ?? '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6'

export const SUBSCRIPTION_ADDRESS: string =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS ?? '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853'

export const SBT_REGISTRY_ADDRESS: string =
  process.env.NEXT_PUBLIC_SBT_REGISTRY_ADDRESS ?? '0x610178dA211FEF7D417bC0e6FeD39F05609AD788'

export const TRUEKE_SBT_ADDRESS: string =
  process.env.NEXT_PUBLIC_TRUEKE_SBT_ADDRESS ?? '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'

export const TRUEKE_RWA_ADDRESS: string =
  process.env.NEXT_PUBLIC_TRUEKE_RWA_ADDRESS ?? '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e'

export const TRUEKE_SERVICE_ADDRESS: string =
  process.env.NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS ?? '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0'

export const BRLT_ADDRESS: string =
  process.env.NEXT_PUBLIC_BRLT_ADDRESS ?? '0x0165878A594ca255338adfa4d48449f69242Eb8F'
`

writeFileSync(outPath, content, 'utf8')
console.log(`✔ ${outPath} generado con todos los contratos de TrueKeate`)

