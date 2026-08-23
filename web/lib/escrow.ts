// Tipos y utilidades compartidas de la DApp Escrow.

/** Estados posibles de una operación (mismo orden que el enum de Escrow.sol). */
export enum OperationStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
  Disputed = 3,
}

export interface Operation {
  id: bigint
  user1: string
  tokenA: string
  tokenB: string
  amountA: bigint
  amountB: bigint
  status: OperationStatus
  createdAt: bigint
  deadline: bigint
  closedAt: bigint
}

export interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
}

/** Struct crudo devuelto por ethers (tupla nombrada de la operación). */
export interface RawOperation {
  id: bigint | string | number
  user1: string
  tokenA: string
  tokenB: string
  amountA: bigint | string | number
  amountB: bigint | string | number
  status: number | string | bigint
  createdAt: bigint | string | number
  deadline: bigint | string | number
  closedAt: bigint | string | number
}

/** Normaliza el struct que devuelve ethers a nuestro tipo Operation. */
export function toOperation(raw: RawOperation): Operation {
  return {
    id: BigInt(raw.id),
    user1: raw.user1 as string,
    tokenA: raw.tokenA as string,
    tokenB: raw.tokenB as string,
    amountA: BigInt(raw.amountA),
    amountB: BigInt(raw.amountB),
    status: Number(raw.status) as OperationStatus,
    createdAt: BigInt(raw.createdAt),
    deadline: BigInt(raw.deadline),
    closedAt: BigInt(raw.closedAt),
  }
}

/** ¿La operación está activa y su deadline ya venció? (estado derivado "Vencida"). */
export function isExpired(op: Operation, now: bigint = BigInt(Date.now())): boolean {
  return (
    op.status === OperationStatus.Active &&
    op.deadline !== 0n &&
    now > op.deadline * 1000n
  )
}

/** Formatea un monto en unidades crudas a su representación decimal. */
export function formatUnits(amount: bigint, decimals: number): string {
  const s = amount.toString()
  const neg = s.startsWith('-')
  const abs = neg ? s.slice(1) : s
  const padded = abs.padStart(decimals + 1, '0')
  const intPart = padded.slice(0, padded.length - decimals)
  const fracPart = padded.slice(padded.length - decimals).replace(/0+$/, '')
  const value = fracPart ? `${intPart}.${fracPart}` : intPart
  return neg ? `-${value}` : value
}

/** Convierte un input decimal del usuario a unidades crudas (con decimals del token). */
export function parseUnits(input: string, decimals: number): bigint {
  const cleaned = input.trim()
  if (!cleaned || Number.isNaN(Number(cleaned))) throw new Error('Invalid amount')
  const [intPart = '0', fracPart = ''] = cleaned.split('.')
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(intPart) * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

const REVERT_TRANSLATIONS: Record<string, string> = {
  'Token not allowed': 'El token no está autorizado en el contrato.',
  'Tokens must be different': 'Los tokens A y B deben ser distintos.',
  'Amounts must be greater than 0': 'Las cantidades deben ser mayores que 0.',
  'Deadline must be in the future': 'El plazo (deadline) debe estar en el futuro.',
  'Operation is not active': 'La operación ya no está activa.',
  'Cannot complete your own operation': 'No puedes completar tu propia operación.',
  'Operation expired': 'La operación venció y ya no se puede completar.',
  'Only creator can cancel': 'Solo el creador puede cancelar la operación.',
  'Only creator can refund': 'Solo el creador puede reclamar tras el vencimiento.',
  'Operation has no deadline': 'La operación no tiene fecha de vencimiento.',
  'Deadline not reached yet': 'El plazo de la operación aún no ha vencido.',
  'No arbiter set': 'El contrato no tiene un árbitro designado.',
  'Operation is not disputed': 'La operación no está en disputa.',
  'Only arbiter can call': 'Solo el árbitro puede realizar esta acción.',
  'Invalid recipient': 'Debes indicar un destinatario válido.',
  'Recipient must not be user1': 'El destinatario no puede ser el creador.',
  'Invalid token address': 'La dirección del token no es válida.',
  'Token already added': 'El token ya está autorizado.',
  'Token address is not a contract': 'La dirección no es un contrato.',
  'Address is not an ERC20 token': 'La dirección no es un token ERC20.',
  'ERC20: transfer amount exceeds balance': 'Saldo insuficiente del token.',
  'ERC20: insufficient allowance': 'Permiso (allowance) insuficiente. Aprueba primero el token.',
  'Already registered': 'Esta billetera ya está inscrita en la plataforma.',
  'Username already taken': 'Ese nombre de usuario ya está en uso.',
  'Username must be between 3 and 20 chars': 'El nombre de usuario debe tener entre 3 y 20 caracteres.',
  'Not registered': 'Esta billetera aún no está inscrita en la plataforma.',
}

/** Estructura mínima de un error de ethers (revert reason). */
interface EthersErrorShape {
  info?: { error?: { message?: string } }
  shortMessage?: string
  message?: string
}

/** Extrae el motivo de revert de un error de ethers y lo traduce a un mensaje amigable. */
export function getFriendlyError(err: unknown): string {
  const e = err as EthersErrorShape
  const raw = e?.info?.error?.message ?? e?.shortMessage ?? e?.message ?? 'Transaction failed'
  for (const [key, friendly] of Object.entries(REVERT_TRANSLATIONS)) {
    if (raw.includes(key)) return friendly
  }
  return raw
}
