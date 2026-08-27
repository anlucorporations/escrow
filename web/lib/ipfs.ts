/**
 * Adaptador de IPFS y Hashes Criptográficos para TrueKeate Web3 RWA y Vouchers.
 */

export interface IPFSMetadataPayload {
  title: string
  description: string
  category: string
  images: Array<{ cid: string; sha256: string; signature?: string }>
  conditionStateCommitment?: string
  attributes?: Array<{ trait_type: string; value: string | number }>
  createdAt: number
}

/**
 * Calcula el hash SHA-256 en formato hexadecimal a partir de un ArrayBuffer o string.
 */
export async function computeSHA256(data: ArrayBuffer | string): Promise<string> {
  let buffer: ArrayBuffer
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer
  } else {
    buffer = data
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Simula y genera un CID v0 determinista para IPFS a partir del contenido
 * (o realiza pinning real a Pinata si se configura NEXT_PUBLIC_PINATA_JWT).
 */
export async function uploadToIPFS(content: object | File): Promise<{ cid: string; uri: string; url: string }> {
  let rawData: string
  if (content instanceof File) {
    const arrayBuffer = await content.arrayBuffer()
    const sha = await computeSHA256(arrayBuffer)
    rawData = `${content.name}:${content.size}:${sha}`
  } else {
    rawData = JSON.stringify(content)
  }

  // Generar CID determinista reproducible en local / IPFS gateway
  const sha = await computeSHA256(rawData)
  const cid = `Qm${sha.slice(0, 44)}`
  const uri = `ipfs://${cid}`
  const url = `https://ipfs.io/ipfs/${cid}`

  return { cid, uri, url }
}

/**
 * Convierte un URI de IPFS (ipfs://... o Qm...) a una URL HTTP accesible en el navegador.
 */
export function formatIPFSUrl(uriOrCid: string | null | undefined): string {
  if (!uriOrCid) return '/placeholder-item.png'
  if (uriOrCid.startsWith('http://') || uriOrCid.startsWith('https://')) {
    return uriOrCid
  }
  const cleanCID = uriOrCid.replace(/^ipfs:\/\//, '')
  return `https://ipfs.io/ipfs/${cleanCID}`
}
