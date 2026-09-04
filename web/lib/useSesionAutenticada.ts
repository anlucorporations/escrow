"use client";

// =============================================================================
// TrueKeate — Hook de sesión autenticada (login ÚNICO con la billetera)
// Ya NO firma por página: lee el token global del SesionProvider (emitido al
// conectar la wallet, decisión del director). Las páginas de la suite que
// necesitan el backend autenticado usan token/autenticar de la sesión global.
// =============================================================================
import { useSesion } from "@/lib/sesion";

export interface SesionAutenticada {
  token: string | null;
  /** Dispara el login único (firma EIP-191) si aún no hay token. */
  autenticar: () => Promise<void>;
  cargando: boolean;
  error: string | null;
}

export function useSesionAutenticada(): SesionAutenticada {
  const { token, autenticar, autenticando } = useSesion();

  return {
    token,
    autenticar: async () => {
      await autenticar();
    },
    cargando: autenticando,
    error: null,
  };
}
