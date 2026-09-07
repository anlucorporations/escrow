// =============================================================================
// TrueKeate — Firma por acción con la billetera (decisión del director)
// Cada operación sensible (inventario, trueques, intercambios) se firma con la
// billetera (EIP-191) con un mensaje canónico + timestamp anti-replay que el
// backend valida (auth.js: validarFirmaAccion / requiereFirmaAccion).
// =============================================================================
import type { JsonRpcSigner } from "ethers";

/** Construye el mensaje canónico de una acción (mismo formato que el backend). */
export function mensajeAccion(accion: string, ts: number = Date.now()): string {
  return `TrueKeate: ${accion} (ts=${Math.floor(ts)})`;
}

export interface FirmaAccion {
  mensaje: string;
  firma: string;
}

/**
 * Firma una acción con la billetera conectada.
 * @returns {mensaje, firma} para incluir en el body de la petición, o null si no hay signer.
 */
export async function firmarAccion(
  signer: JsonRpcSigner | null,
  accion: string
): Promise<FirmaAccion | null> {
  if (!signer) return null;
  const mensaje = mensajeAccion(accion);
  const firma = await signer.signMessage(mensaje);
  return { mensaje, firma };
}
