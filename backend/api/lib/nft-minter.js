// =============================================================================
// TrueKeate — Minteo de NFT al publicar un ítem (lógica maestra punto 1)
// "Los usuarios cargan sus Bienes/Servicios/Artículos al inventario; cada ítem
//  se convierte en un NFT" — el minteo lo ejecuta SOLO la plataforma (rol
// `minter` del contrato TrueKeateNFT, típicamente la cuenta operativa/relayer —
// RF-09): gas gestionado, sin fricción para el usuario.
//
// Robustez (decisión del director — GCP al final):
//   - Con red configurada (RPC_URL + contrato TrueKeateNFT + clave del minter)
//     se ejecuta el mint on-chain real y se persiste nft_token_id.
//   - Sin red (tests, dev sin anvil) el mint se SIMULA: se devuelve un tokenId
//     sintético negativo y la respuesta avisa; la BD no guarda el token on-chain.
// =============================================================================
import { ethers } from 'ethers';

export const ABI_TRUEEKEATENFT = [
  'function mint(address cuenta, string calldata categoria, string calldata uri) external returns (uint256 tokenId)',
  'function usar(uint256 tokenId) external',
  'function minter() view returns (address)',
  'function setMinter(address) external',
  'function siguienteTokenId() view returns (uint256)',
  'function categoriaDe(uint256) view returns (string)',
  'function tokenURI(uint256) view returns (string)',
  'event ArticuloMinteado(uint256 indexed tokenId, address cuenta, string categoria, string uri)',
  'event ArticuloUsado(uint256 indexed tokenId, address cuenta)',
];

/**
 * Crea el minteador de la plataforma.
 * @param {object} opts
 * @param {string|null} opts.rpcUrl        RPC de la red (null → simular)
 * @param {string|null} opts.nftAddress    dirección del TrueKeateNFT
 * @param {string|null} opts.minterPk      clave privada de la cuenta minter (plataforma)
 * @param {string|null} opts.cadena        nombre informativo de la red
 */
export function crearMinteador({ rpcUrl, nftAddress, minterPk, cadena = 'anvil' }) {
  const activo = Boolean(rpcUrl && nftAddress && minterPk);

  let proveedor = null;
  let wallet = null;
  let contrato = null;
  if (activo) {
    try {
      proveedor = new ethers.JsonRpcProvider(rpcUrl);
      wallet = new ethers.Wallet(minterPk, proveedor);
      contrato = new ethers.Contract(nftAddress, ABI_TRUEEKEATENFT, wallet);
    } catch {
      // si algo falla al construir, se degrada a simulado
    }
  }
  const real = Boolean(proveedor && wallet && contrato);

  return {
    activo: real,
    cadena,
    direccion: real ? nftAddress : null,
    minter: real ? wallet.address : null,
    /**
     * Mintea el ítem como NFT del usuario (punto 1).
     * @param {string} cuenta   wallet del usuario propietario
     * @param {string} categoria ARTICULO|SERVICIO|BIEN|CRIPTO
     * @param {string} uri      metadatos (ipfs://… o data URI)
     * @returns {Promise<{nftTokenId:number|null, simulado:boolean, txHash?:string}>}
     */
    async mintear(cuenta, categoria, uri) {
      const destino = (cuenta || '').toLowerCase();
      if (!real) {
        // Sin red: NO se persiste token (la BD queda limpia); el aviso indica que
        // el mint real ocurrirá en producción cuando haya red configurada.
        return { nftTokenId: null, simulado: true, txHash: null };
      }
      const tx = await contrato.mint(destino, categoria, uri || '');
      const recibo = await tx.wait();
      // el tokenId real: se lee del evento ArticuloMinteado
      let tokenId = null;
      if (recibo && recibo.logs) {
        for (const log of recibo.logs) {
          try {
            const parsed = contrato.interface.parseLog(log);
            if (parsed && parsed.name === 'ArticuloMinteado') {
              tokenId = Number(parsed.args[0]);
              break;
            }
          } catch { /* log no pertenece al contrato */ }
        }
      }
      if (tokenId === null) {
        // respaldo: siguienteTokenId() - 1
        const sig = await contrato.siguienteTokenId?.();
        tokenId = Number(sig) - 1;
      }
      return { nftTokenId: tokenId, simulado: false, txHash: recibo?.hash ?? tx.hash ?? null };
    },

    /**
     * Quema un NFT que su dueño USÓ (lógica post-trueke punto 2). Ejecuta
     * TrueKeateNFT.usar(tokenId) on-chain; sin red se simula (la BD marca usado_el).
     * @param {number} tokenId
     */
    async usar(tokenId) {
      if (!real) {
        return { simulado: true, txHash: null };
      }
      const tx = await contrato.usar(Number(tokenId));
      const recibo = await tx.wait();
      return { simulado: false, txHash: recibo?.hash ?? tx.hash ?? null };
    },
  };
}
