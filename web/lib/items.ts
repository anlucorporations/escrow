// Utilidades de cliente para el catálogo (M2) y reputación (M3).
// `itemPayload` es espejo EXACTO de web/server/lib.js (se firma con la wallet).

export interface ItemInput {
  owner: string
  title: string
  description: string
  category: string
  quantity: number
}

export interface Item extends ItemInput {
  id: string
  status: string
  images: Array<{ cid: string; sha256: string; signature: string }>
  signature: string
  created_at: number
}

export interface Reputation {
  total: number
  acceptance: number
  honesty: number
  security: number
  reliability: number
  commitment: number
  overall: number
}

export interface OwnerInfo {
  address: string
  username: string | null
  trustLevel: string
  levelLabel: string
  isBusiness: boolean
  kycStatus: string
}

export interface UserProfile {
  address: string
  username: string | null
  isBusiness: boolean
  kycStatus: string
  trustLevel: string
  levelLabel: string
  identificationLevel?: number
  sbtClaimed?: boolean
  sbtProvider?: string | null
  twoFactorEnabled?: boolean
  reputation: Reputation
  stats: { completed: number; active: number; items: number; vouches: number }
}

/** Payload canónico firmado al crear un artículo (espejo del servidor). */
export function itemPayload({ owner, title, description, category, quantity }: ItemInput): string {
  return JSON.stringify({
    owner: (owner || '').toLowerCase(),
    title: (title || '').trim(),
    description: (description || '').trim(),
    category: (category || 'general').trim(),
    quantity: Number(quantity || 1),
  })
}

export async function fetchItems(params?: {
  category?: string
  owner?: string
  q?: string
}): Promise<{ items: Item[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.owner) qs.set('owner', params.owner)
  if (params?.q) qs.set('q', params.q)
  const res = await fetch(`/api/items?${qs.toString()}`)
  if (!res.ok) throw new Error('Error al cargar el catálogo')
  return res.json()
}

export async function fetchItem(id: string): Promise<{ item: Item; owner: OwnerInfo | null; reputation: Reputation }> {
  const res = await fetch(`/api/items/${id}`)
  if (!res.ok) throw new Error('Artículo no encontrado')
  return res.json()
}

export async function fetchProfile(address: string): Promise<UserProfile> {
  const res = await fetch(`/api/users/${address}`)
  if (!res.ok) throw new Error('Perfil no disponible')
  return res.json()
}

export async function createItemSigned(
  signer: { signMessage: (msg: string) => Promise<string> },
  input: ItemInput,
  images: Array<{ sha256: string; signature: string }> = []
): Promise<Item> {
  const payload = itemPayload(input)
  const signature = await signer.signMessage(payload)
  const res = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, payload, signature, images }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al crear artículo')
  return data.item
}

/**
 * M8 — Certifica un archivo de imagen: calcula SHA-256 (Web Crypto) y lo firma
 * con la wallet. El servidor guarda hash + firma para auditoría inmutable.
 */
export async function certifyImage(
  file: File,
  signer: { signMessage: (msg: string) => Promise<string> }
): Promise<{ sha256: string; signature: string; fileName: string }> {
  const buf = await file.arrayBuffer()
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  const sha256 = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const signature = await signer.signMessage(sha256)
  return { sha256, signature, fileName: file.name }
}
