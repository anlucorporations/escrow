"use client";

// =============================================================================
// TrueKeate — Contexto de sesión / control de acceso + LOGIN ÚNICO con wallet
// Combina la wallet conectada (useEthereum) con la inscripción (GET /auth/estado)
// y con el TOKEN de sesión global (firma EIP-191 única al conectar → login).
//
// Flujo (decisión del director):
//   1) Al conectar la billetera (botón "Conectar MetaMask") se pide UNA firma
//      EIP-191 ("TrueKeate: iniciar sesión") que emite el token Bearer global.
//   2) Ese token da acceso a TODAS las secciones según el tipo/estado del
//      usuario (las páginas ya no piden autenticación propia).
//   3) Al cambiar de cuenta o cerrar sesión se invalida el token local.
//
// Estados de acceso:
//   - sinWallet: público general → solo landing
//   - conectadoNoInscrito: wallet sin inscripción formal → solo catálogo + login
//   - inscrito: acceso a la suite según escalera D28 (con token si firmó)
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
import {
  consultarEstado,
  inscribirse,
  iniciarSesion,
  type UsuarioPublico,
} from "./api";

export type EstadoAcceso =
  | { fase: "sinWallet" }
  | { fase: "verificando" }
  | { fase: "conectadoNoInscrito" }
  | { fase: "inscrito"; usuario: UsuarioPublico };

export interface Sesion {
  acceso: EstadoAcceso;
  /** Token Bearer global (login único con la billetera); null si aún no firmó. */
  token: string | null;
  /** Autentica (firma EIP-191) y guarda el token global. */
  autenticar: () => Promise<boolean>;
  /** Cierra la sesión (borra el token). */
  cerrarSesion: () => void;
  /** Fuerza una re-consulta del estado de inscripción de la wallet actual.
   *  Devuelve el estado consultado para poder encadenar acciones (login único). */
  refrescar: () => Promise<EstadoAcceso>;
  /** Ejecuta la inscripción formal y refresca el acceso. */
  inscribir: (datos: {
    correo: string;
    telefono: string;
    direccionInscripcion?: string;
    consentimientoGdpr: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  autenticando: boolean;
}

const SesionContext = createContext<Sesion | null>(null);
const CLAVE_TOKEN = "truekeate.token";
/** Wallet asociada al token guardado (se descarta si cambió la cuenta). */
const CLAVE_TOKEN_WALLET = "truekeate.token.wallet";

export function SesionProvider({ children }: { children: ReactNode }) {
  const { account, conectado, signer } = useEthereum();
  const [acceso, setAcceso] = useState<EstadoAcceso>({ fase: "sinWallet" });
  // Token restaurado de forma síncrona desde localStorage (login persistente:
  // evita el parpadeo de "Iniciar sesión" y la re-firma en cada recarga/sección).
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CLAVE_TOKEN);
  });
  const [autenticando, setAutenticando] = useState(false);

  const refrescar = useCallback(async (): Promise<EstadoAcceso> => {
    if (!account) {
      setAcceso({ fase: "sinWallet" });
      return { fase: "sinWallet" };
    }
    setAcceso({ fase: "verificando" });
    const estado = await consultarEstado(account);
    const nuevo: EstadoAcceso =
      estado.inscrito && estado.usuario
        ? { fase: "inscrito", usuario: estado.usuario }
        : { fase: "conectadoNoInscrito" };
    setAcceso(nuevo);
    return nuevo;
  }, [account]);

  // Al conectar/desconectar o cambiar de cuenta, consulta el estado de inscripción
  // y reconcilia el token guardado con la cuenta activa (login persistente).
  useEffect(() => {
    void refrescar();
    if (!account) return; // sin cuenta no aplica token (el guard bloquea la suite)
    const walletDelToken = localStorage.getItem(CLAVE_TOKEN_WALLET);
    const previo = localStorage.getItem(CLAVE_TOKEN);
    if (previo && walletDelToken === account) {
      setToken(previo); // restaura el token de ESTA cuenta (sin re-firma)
    } else if (walletDelToken && walletDelToken !== account) {
      // cuenta distinta → token ajeno: se borra para no heredar sesión ajena
      setToken(null);
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_TOKEN_WALLET);
    }
  }, [account, conectado, refrescar]);

  // Firma EIP-191 única → POST /auth/session → token global (login con wallet).
  const autenticar = useCallback(async (): Promise<boolean> => {
    if (!signer || !account) return false;
    setAutenticando(true);
    try {
      const firma = await signer.signMessage("TrueKeate: iniciar sesión");
      const sesion = await iniciarSesion(firma);
      setToken(sesion.token);
      localStorage.setItem(CLAVE_TOKEN, sesion.token);
      localStorage.setItem(CLAVE_TOKEN_WALLET, account);
      return true;
    } catch (e) {
      console.error("[sesion] fallo de autenticación:", e);
      return false;
    } finally {
      setAutenticando(false);
    }
  }, [signer, account]);

  const cerrarSesion = useCallback(() => {
    setToken(null);
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_TOKEN_WALLET);
  }, []);

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
    () => ({ acceso, token, autenticar, cerrarSesion, refrescar, inscribir, autenticando }),
    [acceso, token, autenticar, cerrarSesion, refrescar, inscribir, autenticando]
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return ctx;
}
