#!/usr/bin/env node
/**
 * Genera `web/lib/contracts.ts` con los ABIs reales compilados por Foundry
 * (Escrow + UserRegistry).
 *
 * Uso:
 *   node web/scripts/generate-contracts.mjs
 *
 * Debe ejecutarse después de `forge build` en sc/.
 * Las direcciones se leen de las variables NEXT_PUBLIC_* (fallback local).
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
    console.error(`No se encontró el artefacto en ${artifactPath}. Ejecuta: cd sc && forge build`)
    process.exit(1)
  }
}

const escrow = loadArtifact('Escrow')
const registry = loadArtifact('UserRegistry')
const outPath = join(repoRoot, 'web', 'lib', 'contracts.ts')

const escrowAbi = JSON.stringify(escrow.abi, null, 2)
const registryAbi = JSON.stringify(registry.abi, null, 2)

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
export const ESCROW_ABI = ${escrowAbi} as const;

export const USER_REGISTRY_ABI = ${registryAbi} as const;

export const ERC20_ABI = ${erc20Abi}

// Direcciones de los contratos. Configúralas en web/.env.local:
//   NEXT_PUBLIC_ESCROW_ADDRESS=0x...
//   NEXT_PUBLIC_USER_REGISTRY_ADDRESS=0x...
export const ESCROW_ADDRESS: string =
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  '0x0000000000000000000000000000000000000000'

export const USER_REGISTRY_ADDRESS: string =
  process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS ??
  '0x0000000000000000000000000000000000000000'
`

writeFileSync(outPath, content, 'utf8')
console.log(
  `✔ ${outPath} generado (Escrow: ${escrow.abi.length} entradas, UserRegistry: ${registry.abi.length} entradas)`
)
