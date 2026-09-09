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
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useEthereum } from "./ethereum";
import { BrowserProvider } from "ethers";
import { firmarAccion as firmarConSigner, mensajeAccion, type FirmaAccion } from "./firma";
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
  /** La wallet conectada es el OWNER (dueño on-chain del SociosRegistry): es la
   *  única con acceso a la sección Sistemas (/suite/admin, RF-13.1). */
  esOwner: boolean;
  /** Autentica (firma EIP-191) y guarda el token global. */
  autenticar: () => Promise<boolean>;
  /** Cierra la sesión (borra el token). */
  cerrarSesion: () => void;
  /** Fuerza una re-consulta del estado de inscripción de la wallet actual.
   *  Devuelve el estado consultado para poder encadenar acciones (login único).
   *  `wallet` (opcional): wallet explícita recién conectada; evita depender de
   *  que el estado de React ya se haya propagado (reconexión con OTRA wallet). */
  refrescar: (wallet?: string) => Promise<EstadoAcceso>;
  /** Ejecuta la inscripción formal y refresca el acceso. */
  inscribir: (datos: {
    correo: string;
    telefono: string;
    direccionInscripcion?: string;
    consentimientoGdpr: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  autenticando: boolean;
  /** Firma una acción con la billetera (EIP-191 por operación — decisión del director). */
  firmarAccion: (accion: string) => Promise<FirmaAccion | null>;
}

const SesionContext = createContext<Sesion | null>(null);
const CLAVE_TOKEN = "truekeate.token";
/** Wallet asociada al token guardado (se descarta si cambió la cuenta). */
const CLAVE_TOKEN_WALLET = "truekeate.token.wallet";

export function SesionProvider({ children }: { children: ReactNode }) {
  const { account, conectado, signer } = useEthereum();
  const [acceso, setAcceso] = useState<EstadoAcceso>({ fase: "sinWallet" });
  // ¿La cuenta conectada es el Owner? (lo devuelve /auth/estado y /auth/session)
  const [esOwner, setEsOwner] = useState(false);
  // Token restaurado de forma síncrona desde localStorage (login persistente:
  // evita el parpadeo de "Iniciar sesión" y la re-firma en cada recarga/sección).
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CLAVE_TOKEN);
  });
  const [autenticando, setAutenticando] = useState(false);
  // Cuenta vigente en cada render: sirve para descartar respuestas ASYNC de una
  // wallet que ya no está conectada (desconexión o cambio a OTRA wallet).
  const cuentaRef = useRef<string | null>(null);
  useEffect(() => {
    cuentaRef.current = account;
  }, [account]);

  const refrescar = useCallback(
    async (wallet?: string): Promise<EstadoAcceso> => {
      // Wallet a consultar: la explícita (recién conectada) o la del estado.
      const cuentaConsultada = (wallet ?? account ?? "").toLowerCase();
      if (!cuentaConsultada) {
        setAcceso({ fase: "sinWallet" });
        return { fase: "sinWallet" };
      }
      // Refresco "en caliente": si ya tenemos una sesión inscrita (p. ej. tras
      // completar la verificación/KYC), actualizamos el usuario SIN pasar por la
      // fase "verificando" (que desmontaría el contenido del guard — remount).
      // La fase "verificando" solo aplica al inicio/cambio de cuenta.
      setAcceso((prev) =>
        prev.fase === "inscrito" ? prev : { fase: "verificando" }
      );
      const estado = await consultarEstado(cuentaConsultada);
      // Guardia anti-carrera SOLO en refrescos implícitos (sin wallet explícita):
      // si mientras consultábamos la cuenta cambió o se desconectó, descartar el
      // resultado de la wallet anterior. Con wallet explícita (la acaba de
      // conectar el botón en este mismo gesto) no aplica la carrera.
      if (!wallet && cuentaRef.current !== cuentaConsultada) {
        return { fase: "sinWallet" };
      }
      setEsOwner(Boolean(estado.esOwner));
      const nuevo: EstadoAcceso =
        estado.inscrito && estado.usuario
          ? { fase: "inscrito", usuario: estado.usuario }
          : { fase: "conectadoNoInscrito" };
      setAcceso(nuevo);
      return nuevo;
    },
    [account]
  );

  // Al conectar/desconectar o cambiar de cuenta, consulta el estado de inscripción
  // y reconcilia el token guardado con la cuenta activa (login persistente).
  // Regla: solo se conserva un token cuya wallet asociada COINCIDE con la cuenta
  // conectada. Los tokens huérfanos (guardados antes de existir la clave wallet)
  // o de otra cuenta se descartan → se pide la firma única de la cuenta actual.
  useEffect(() => {
    void refrescar();
    if (!account) return; // sin cuenta no aplica token (el guard bloquea la suite)
    const walletDelToken = localStorage.getItem(CLAVE_TOKEN_WALLET);
    const previo = localStorage.getItem(CLAVE_TOKEN);
    if (previo && walletDelToken === account) {
      setToken(previo); // restaura el token de ESTA cuenta (sin re-firma)
    } else if (previo) {
      // Token sin wallet asociada (versión anterior) o de OTRA cuenta → se
      // descarta para no operar con la identidad de un tercero.
      setToken(null);
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_TOKEN_WALLET);
    }
  }, [account, conectado, refrescar]);

  // Firma EIP-191 única → POST /auth/session → token global (login con wallet).
  const autenticar = useCallback(async (): Promise<boolean> => {
    setAutenticando(true);
    try {
      // Provider/signer FRESCOS en el momento de firmar: se firma con la wallet
      // ACTIVA ahora mismo en MetaMask (la que el usuario acaba de elegir), sin
      // depender del estado de React (que puede no haberse propagado aún tras
      // reconectar con OTRA wallet).
      if (typeof window === "undefined" || !window.ethereum) return false;
      const bp = new BrowserProvider(window.ethereum);
      const signerFresco = await bp.getSigner();
      const walletFirmante = (await signerFresco.getAddress()).toLowerCase();
      const firma = await signerFresco.signMessage("TrueKeate: iniciar sesión");
      const sesion = await iniciarSesion(firma);
      setToken(sesion.token);
      setEsOwner(Boolean(sesion.esOwner));
      localStorage.setItem(CLAVE_TOKEN, sesion.token);
      localStorage.setItem(CLAVE_TOKEN_WALLET, walletFirmante);
      return true;
    } catch (e) {
      console.error("[sesion] fallo de autenticación:", e);
      return false;
    } finally {
      setAutenticando(false);
    }
  }, []);

  // Firma por acción: usa el signer de la wallet conectada (EIP-191).
  const firmarAccion = useCallback(
    async (accion: string): Promise<FirmaAccion | null> => {
      return firmarConSigner(signer, accion);
    },
    [signer]
  );

  const cerrarSesion = useCallback(() => {
    setToken(null);
    setEsOwner(false);
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
    () => ({ acceso, token, esOwner, autenticar, cerrarSesion, refrescar, inscribir, autenticando, firmarAccion }),
    [acceso, token, esOwner, autenticar, cerrarSesion, refrescar, inscribir, autenticando, firmarAccion]
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return ctx;
}
