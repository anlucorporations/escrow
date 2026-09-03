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

/** Direcciones del despliegue en GCP (anvil remoto MCC, chain 31337 — deploy 2026-09-03). */
export const DIRECCIONES: Record<string, string> = {
  Escrow: process.env.NEXT_PUBLIC_ESCROW ?? "0x8a93d247134d91e0de6f96547cb0204e5be8e5d8",
  SmartAccountFactory:
    process.env.NEXT_PUBLIC_FACTORY ?? "0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849",
  BRLT: process.env.NEXT_PUBLIC_BRLT ?? "0x6f6f570f45833e249e27022648a26f4076f48f78",
  SociosRegistry:
    process.env.NEXT_PUBLIC_REGISTRY ?? "0xb0f05d25e41fbc2b52013099ed9616f1206ae21b",
  SuscripcionEmpresa:
    process.env.NEXT_PUBLIC_SUSCRIPCION ?? "0x5feaebfb4439f3516c74939a9d04e95afe82c4ae",
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
