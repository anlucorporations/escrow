// =============================================================================
// TrueKeate — Contratos (RT-04.5)
// ABIs y direcciones de los contratos desplegados (Ciclos 1-3). Las direcciones
// corresponden al despliegue de desarrollo en anvil (chain 31337); en producción
// se cargan desde el entorno (backend /admin/contratos — RF-13.1).
// =============================================================================
import { Interface } from "ethers";

// ABIs importados como JSON (se generan con forge build en sc/out)
// Nota: en un build real estos JSON se copian a lib/abis/. Aquí se referencian
// los nombres para tipado; los ABIs completos se inyectan en tiempo de ejecución.
import type { ContractInfo } from "./tipos";

export interface ContratoInfo {
  direccion: string;
  abi: unknown[];
  iface?: Interface;
}

/** Direcciones del despliegue de desarrollo (anvil, chain 31337). */
export const DIRECCIONES: Record<string, string> = {
  Escrow: process.env.NEXT_PUBLIC_ESCROW ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  SmartAccountFactory:
    process.env.NEXT_PUBLIC_FACTORY ?? "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  BRLT: process.env.NEXT_PUBLIC_BRLT ?? "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  SociosRegistry:
    process.env.NEXT_PUBLIC_REGISTRY ?? "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  SuscripcionEmpresa:
    process.env.NEXT_PUBLIC_SUSCRIPCION ?? "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
};

/**
 * Registro de contratos con ABIs (cargados desde los artefactos de forge).
 * `cargarAbis()` se invoca una vez al arrancar la app (ver layout).
 */
export const contratos: Record<string, ContratoInfo> = {};

/** Importa los ABIs desde los artefactos JSON generados por forge. */
export async function cargarAbis(): Promise<void> {
  const nombres = Object.keys(DIRECCIONES);
  const modulos = await Promise.all(
    nombres.map((n) =>
      import(`./abis/${n}.json`).catch(() => null)
    )
  );
  nombres.forEach((n, i) => {
    const abi = modulos[i]?.default ?? null;
    if (abi) {
      contratos[n] = { direccion: DIRECCIONES[n], abi, iface: new Interface(abi) };
    }
  });
}

/** Contrato por nombre con su interface lista. */
export function getContrato(nombre: string): ContratoInfo | null {
  return contratos[nombre] ?? null;
}

export type { ContractInfo };
