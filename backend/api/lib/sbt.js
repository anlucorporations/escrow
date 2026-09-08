// =============================================================================
// TrueKeate — Helper SBT (certificación D28 / decisión del director 2026-09)
// Chequeo on-chain de credenciales no transferibles (SBT) de una wallet:
//   1) TrueKeateSBT nativo del proyecto (mapeo 1:1 sbtDe[wallet] → tokenId).
//   2) Allowlist configurable de contratos SBT/ERC-721 externos reconocidos
//      (env SBT_ALLOWLIST, direcciones separadas por coma).
// Minteo del SBT nativo por la plataforma (rol minter = relayer/operador).
// =============================================================================
import { ethers } from 'ethers';

export const ABI_SBT_NATIVO = [
  'function sbtDe(address) view returns (uint256)',
  'function mint(address,string) returns (uint256)',
  'function minter() view returns (address)',
  'function tokenURI(uint256) view returns (string)',
  'event SbtMinteado(uint256 indexed tokenId, address cuenta, string uri)',
];
export const ABI_ERC721_MIN = [
  'function balanceOf(address) view returns (uint256)',
];

export function leerAllowlist() {
  return (process.env.SBT_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^0x[0-9a-f]{40}$/.test(s));
}

/**
 * Detecta si `wallet` posee un SBT de certificación (nativo TrueKeateSBT y/o
 * externo de la allowlist). Devuelve la primera credencial encontrada.
 */
export async function detectarSbt({ provider, nativoDir, wallet }) {
  const dir = (wallet || '').toLowerCase();
  const allowlist = leerAllowlist();
  // 1) SBT nativo del proyecto
  if (nativoDir && /^0x[0-9a-fA-F]{40}$/.test(nativoDir)) {
    try {
      const c = new ethers.Contract(nativoDir, ABI_SBT_NATIVO, provider);
      const tokenId = Number(await c.sbtDe(dir));
      if (tokenId > 0) {
        return { tieneSbt: true, fuente: 'nativo', contrato: nativoDir.toLowerCase(), tokenId };
      }
    } catch { /* sin red o contrato no disponible */ }
  }
  // 2) SBTs externos reconocidos (allowlist)
  for (const addr of allowlist) {
    if (addr === (nativoDir || '').toLowerCase()) continue;
    try {
      const c = new ethers.Contract(addr, ABI_ERC721_MIN, provider);
      const saldo = Number(await c.balanceOf(dir));
      if (saldo > 0) {
        return { tieneSbt: true, fuente: 'externa', contrato: addr, tokenId: null };
      }
    } catch { /* contrato externo no responde: se ignora */ }
  }
  return { tieneSbt: false, fuente: null, contrato: null, tokenId: null };
}

/**
 * Mintea el SBT nativo de certificación para `wallet` (solo plataforma/minter).
 * @returns {Promise<{tokenId:number|null, txHash:string|null, simulado:boolean}>}
 */
export async function mintSbtNativo({ provider, nativoDir, pkMinter, wallet, uri }) {
  if (!nativoDir || !pkMinter) {
    return { tokenId: null, txHash: null, simulado: true };
  }
  try {
    const signer = new ethers.Wallet(pkMinter, provider);
    const c = new ethers.Contract(nativoDir, ABI_SBT_NATIVO, signer);
    const ya = Number(await c.sbtDe(wallet.toLowerCase()));
    if (ya > 0) return { tokenId: ya, txHash: null, simulado: false, yaExistia: true };
    const tx = await c.mint(wallet.toLowerCase(), uri || '');
    const recibo = await tx.wait();
    let tokenId = null;
    for (const log of recibo.logs || []) {
      try {
        const parsed = c.interface.parseLog(log);
        if (parsed && parsed.name === 'SbtMinteado') { tokenId = Number(parsed.args[0]); break; }
      } catch { /* log ajeno */ }
    }
    return { tokenId, txHash: recibo?.hash ?? tx.hash ?? null, simulado: false };
  } catch (e) {
    console.error('[sbt] mint nativo falló:', (e.shortMessage || e.message || '').slice(0, 140));
    return { tokenId: null, txHash: null, simulado: true, error: (e.shortMessage || e.message || '').slice(0, 140) };
  }
}

/** URI de metadatos (data URI) de la credencial de certificación. */
export function uriCertificacion(wallet, fuente, tokenId) {
  return `data:application/json,${encodeURIComponent(JSON.stringify({
    name: 'TrueKeate · Certificación de identidad (KYC)',
    description: `Usuario certificado en TrueKeate (D28 · ${fuente === 'externa' ? 'SBT externo verificado' : 'SBT nativo'}).`,
    wallet,
    sbt: tokenId ? `tokenId=${tokenId}` : undefined,
    esquema: 'D28-CERTIFICADO',
  }))}`;
}
