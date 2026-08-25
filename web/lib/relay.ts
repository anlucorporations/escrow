// M5 — Meta-transacciones EIP-712: helpers de firma del cliente.
// El usuario firma su intención (create/complete) + un permit EIP-2612 del
// token; el relayer (POST /api/relay) ejecuta la transacción pagando el gas.
import { ethers } from 'ethers'
import { ESCROW_ADDRESS, ESCROW_ABI, ERC20_ABI } from '@/lib/contracts'

export const META_DOMAIN_NAME = 'Escrow'
export const META_DOMAIN_VERSION = '1'

export const CREATE_TYPES = {
  MetaCreateOperation: [
    { name: 'user', type: 'address' },
    { name: 'tokenA', type: 'address' },
    { name: 'tokenB', type: 'address' },
    { name: 'amountA', type: 'uint256' },
    { name: 'amountB', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
}

export const COMPLETE_TYPES = {
  MetaCompleteOperation: [
    { name: 'user', type: 'address' },
    { name: 'operationId', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
}

export const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}

export interface PermitData {
  deadline: bigint
  v: number
  r: string
  s: string
}

export interface MetaCreateRequest {
  kind: 'create'
  user: string
  tokenA: string
  tokenB: string
  amountA: string
  amountB: string
  deadline: string
  nonce: string
  signature: string
  permit: PermitData
}

export interface MetaCompleteRequest {
  kind: 'complete'
  user: string
  operationId: string
  nonce: string
  signature: string
  permit: PermitData
}

async function getChainId(provider: ethers.BrowserProvider): Promise<number> {
  const network = await provider.getNetwork()
  return Number(network.chainId)
}

/** Firma un permit EIP-2612 del token (aprobación sin gas). */
export async function signPermit(
  signer: ethers.Signer,
  provider: ethers.BrowserProvider,
  tokenAddress: string,
  owner: string,
  value: bigint,
  deadline: bigint
): Promise<PermitData> {
  const chainId = await getChainId(provider)
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const [name, nonce] = await Promise.all([token.name(), token.nonces(owner)])
  const domain = { name, version: META_DOMAIN_VERSION, chainId, verifyingContract: tokenAddress }
  const signature = await signer.signTypedData(domain, PERMIT_TYPES, {
    owner,
    spender: ESCROW_ADDRESS,
    value,
    nonce,
    deadline,
  })
  const sig = ethers.Signature.from(signature)
  return { deadline, v: sig.v, r: sig.r, s: sig.s }
}

/** Construye la solicitud "crear operación sin gas" (intención + permit). */
export async function buildMetaCreate(
  signer: ethers.Signer,
  provider: ethers.BrowserProvider,
  params: { tokenA: string; tokenB: string; amountA: bigint; amountB: bigint; deadline: bigint }
): Promise<MetaCreateRequest> {
  const account = await signer.getAddress()
  const chainId = await getChainId(provider)
  const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
  const nonce = await escrow.metaNonces(account)

  const domain = { name: META_DOMAIN_NAME, version: META_DOMAIN_VERSION, chainId, verifyingContract: ESCROW_ADDRESS }
  const signature = await signer.signTypedData(domain, CREATE_TYPES, {
    user: account,
    tokenA: params.tokenA,
    tokenB: params.tokenB,
    amountA: params.amountA,
    amountB: params.amountB,
    deadline: params.deadline,
    nonce,
  })

  const permitDeadline = BigInt(Math.floor(Date.now() / 1000)) + 3600n
  const permit = await signPermit(signer, provider, params.tokenA, account, params.amountA, permitDeadline)

  return {
    kind: 'create',
    user: account,
    tokenA: params.tokenA,
    tokenB: params.tokenB,
    amountA: params.amountA.toString(),
    amountB: params.amountB.toString(),
    deadline: params.deadline.toString(),
    nonce: nonce.toString(),
    signature,
    permit,
  }
}

/** Construye la solicitud "completar operación sin gas" (intención + permit). */
export async function buildMetaComplete(
  signer: ethers.Signer,
  provider: ethers.BrowserProvider,
  operationId: bigint,
  tokenB: string,
  amountB: bigint
): Promise<MetaCompleteRequest> {
  const account = await signer.getAddress()
  const chainId = await getChainId(provider)
  const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider)
  const nonce = await escrow.metaNonces(account)

  const domain = { name: META_DOMAIN_NAME, version: META_DOMAIN_VERSION, chainId, verifyingContract: ESCROW_ADDRESS }
  const signature = await signer.signTypedData(domain, COMPLETE_TYPES, {
    user: account,
    operationId,
    nonce,
  })

  const permitDeadline = BigInt(Math.floor(Date.now() / 1000)) + 3600n
  const permit = await signPermit(signer, provider, tokenB, account, amountB, permitDeadline)

  return {
    kind: 'complete',
    user: account,
    operationId: operationId.toString(),
    nonce: nonce.toString(),
    signature,
    permit,
  }
}

/** Envía la solicitud firmada al relayer (paga el gas con su clave). */
export async function relayRequest(req: MetaCreateRequest | MetaCompleteRequest): Promise<{ txHash: string }> {
  const res = await fetch('/api/relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error en el relayer')
  return data
}
