#!/usr/bin/env node
/**
 * Genera `web/lib/contracts.ts` con el ABI real de Escrow compilado por Foundry.
 *
 * Uso:
 *   node web/scripts/generate-contracts.mjs
 *
 * Debe ejecutarse después de `forge build` en sc/.
 * La dirección del contrato se lee de NEXT_PUBLIC_ESCROW_ADDRESS (fallback local).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')

const artifactPath = join(repoRoot, 'sc', 'out', 'Escrow.sol', 'Escrow.json')
const outPath = join(repoRoot, 'web', 'lib', 'contracts.ts')

let artifact
try {
  artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
} catch {
  console.error(`No se encontró el artefacto en ${artifactPath}. Ejecuta: cd sc && forge build`)
  process.exit(1)
}

const abi = JSON.stringify(artifact.abi, null, 2)

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
  }
] as const;`

const content = `// GENERADO AUTOMÁTICAMENTE por web/scripts/generate-contracts.mjs — NO editar a mano.
// Se regenera con: node web/scripts/generate-contracts.mjs (tras forge build).
export const ESCROW_ABI = ${abi} as const;

export const ERC20_ABI = ${erc20Abi}

// Dirección del contrato Escrow. Configúrala en web/.env.local:
//   NEXT_PUBLIC_ESCROW_ADDRESS=0x...
export const ESCROW_ADDRESS: string =
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  '0x0000000000000000000000000000000000000000'
`

writeFileSync(outPath, content, 'utf8')
console.log(`✔ ${outPath} generado (${artifact.abi.length} entradas de ABI)`)
