"use client";

// =============================================================================
// TrueKeate — Hook de sesión autenticada (firma EIP-191 → token Bearer)
// Comparte la lógica de autenticación del panel Owner (RF-16 + /auth/session)
// para que todas las páginas de la suite que necesitan el backend autenticado
// (truekes, finanzas, disputas, gobernanza…) usen el mismo mecanismo.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { iniciarSesion } from "@/lib/api";

export interface SesionAutenticada {
  token: string | null;
  autenticar: () => Promise<void>;
  cargando: boolean;   // firmando o pidiendo
  error: string | null;
}

export function useSesionAutenticada(): SesionAutenticada {
  const { account, signer, conectado } = useEthereum();
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autenticar = useCallback(async () => {
    if (!signer) {
      setError("Desbloquea tu billetera para firmar (RF-16).");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const firma = await signer.signMessage("TrueKeate: iniciar sesión");
      const sesion = await iniciarSesion(firma);
      setToken(sesion.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fallo de autenticación");
    } finally {
      setCargando(false);
    }
  }, [signer]);

  // Al cambiar de cuenta se invalida el token anterior.
  useEffect(() => {
    setToken(null);
    setError(null);
  }, [account]);

  return { token, autenticar, cargando, error };
}
