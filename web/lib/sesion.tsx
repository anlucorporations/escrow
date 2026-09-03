"use client";

// =============================================================================
// TrueKeate — Contexto de sesión / control de acceso
// Combina la wallet conectada (useEthereum) con el estado de inscripción que
// devuelve el backend (GET /auth/estado). Decide qué puede ver el usuario:
//   - sinWallet: público general → solo landing
//   - conectadoNoInscrito: wallet conectada sin inscripción formal → solo catálogo
//   - inscrito: acceso a la suite según escalera D28
// =============================================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useEthereum } from "./ethereum";
import { consultarEstado, inscribirse, type UsuarioPublico } from "./api";

export type EstadoAcceso =
  | { fase: "sinWallet" }
  | { fase: "verificando" }
  | { fase: "conectadoNoInscrito" }
  | { fase: "inscrito"; usuario: UsuarioPublico };

export interface Sesion {
  acceso: EstadoAcceso;
  /** Fuerza una re-consulta del estado de inscripción de la wallet actual. */
  refrescar: () => Promise<void>;
  /** Ejecuta la inscripción formal y refresca el acceso. */
  inscribir: (datos: {
    correo: string;
    telefono: string;
    direccionInscripcion?: string;
    consentimientoGdpr: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const SesionContext = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const { account, conectado } = useEthereum();
  const [acceso, setAcceso] = useState<EstadoAcceso>({ fase: "sinWallet" });

  const refrescar = useCallback(async () => {
    if (!account) {
      setAcceso({ fase: "sinWallet" });
      return;
    }
    setAcceso({ fase: "verificando" });
    const estado = await consultarEstado(account);
    setAcceso(
      estado.inscrito && estado.usuario
        ? { fase: "inscrito", usuario: estado.usuario }
        : { fase: "conectadoNoInscrito" }
    );
  }, [account]);

  // Al conectar/desconectar o cambiar de cuenta, consulta el estado.
  useEffect(() => {
    void refrescar();
  }, [account, conectado, refrescar]);

  const inscribir = useCallback<Sesion["inscribir"]>(
    async (datos) => {
      if (!account) return { ok: false, error: "sin wallet conectada" };
      try {
        await inscribirse({ wallet: account, ...datos });
        await refrescar();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "error al inscribirse" };
      }
    },
    [account, refrescar]
  );

  const valor = useMemo<Sesion>(
    () => ({ acceso, refrescar, inscribir }),
    [acceso, refrescar, inscribir]
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return ctx;
}
