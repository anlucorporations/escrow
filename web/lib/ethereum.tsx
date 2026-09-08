"use client";

// =============================================================================
// TrueKeate — Context provider de Ethereum (RT-04.4, RF-16)
// Gestiona la conexión con MetaMask (provider/signer/account) y la
// auto-reconexión al refrescar la página (RF-16.2). En móvil la firma se
// delega a la wallet móvil (MetaMask mobile) en la PWA instalable (D40).
//
// Desconexión (fix reporte del director): además de limpiar el estado local se
// revoca el permiso eth_accounts en MetaMask (wallet_revokePermissions). Sin
// esa revocación, el siguiente eth_requestAccounts devuelve la cuenta ANTERIOR
// sin mostrar el selector de cuentas → imposible conectarse con OTRA wallet.
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
import { BrowserProvider, type Eip1193Provider, type JsonRpcSigner } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on?: (ev: string, cb: (args: unknown[]) => void) => void;
      removeListener?: (ev: string, cb: (args: unknown[]) => void) => void;
    };
  }
}

export type MotivoSinProveedor = "sin_wallet" | "app_movil" | null;

export interface EstadoEthereum {
  account: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  conectando: boolean;
  conectado: boolean;
  conectar: () => Promise<string | null>;
  desconectar: () => void;
  /** Por qué no hay provider (móvil sin extensión / escritorio sin extensión). */
  errorConexion: MotivoSinProveedor;
  /** Abre la dApp en la app de MetaMask (deep link) desde el navegador móvil. */
  abrirEnAppWallet: () => void;
  /** true si el dispositivo parece un móvil/tableta (sin extensiones de wallet). */
  esMovil: boolean;
}

/** Detección simple de móvil/tableta por user-agent. */
function esDispositivoMovil(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(window.navigator.userAgent);
}

/** Espera breve a que una wallet se anuncie vía EIP-6963 (algunas apps inyectan
 *  el provider tras cargar). Devuelve el provider anunciado o null. */
function aguardarProveedor6963(ms: number): Promise<Eip1193Provider | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(null); return; }
    const t = setTimeout(() => { cleanup(); resolve(null); }, ms);
    const aceptar = (e: Event) => {
      const detalle = (e as CustomEvent<{ provider: Eip1193Provider }>).detail;
      if (detalle?.provider) { cleanup(); resolve(detalle.provider); }
    };
    const cleanup = () => {
      clearTimeout(t);
      window.removeEventListener("eip6963:announceProvider", aceptar);
    };
    window.addEventListener("eip6963:announceProvider", aceptar);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  });
}

const EthereumContext = createContext<EstadoEthereum | null>(null);

const CLAVE_ACCOUNT = "truekeate.account";

export function EthereumProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [conectando, setConectando] = useState(false);
  const [errorConexion, setErrorConexion] = useState<MotivoSinProveedor>(null);

  /** Fija la cuenta activa con un provider/signer SIEMPRE frescos.
   *  - Desde conectar(): se pasa el BrowserProvider recién creado (bp).
   *  - Desde el evento accountsChanged: se usa el provider del estado; si no
   *    existe (primer arranque), se crea desde window.ethereum. */
  const fijarCuenta = useCallback(
    async (cuentas: string[], bp?: BrowserProvider) => {
      if (!cuentas || cuentas.length === 0) {
        setAccount(null);
        setSigner(null);
        localStorage.removeItem(CLAVE_ACCOUNT);
        return;
      }
      const cuenta = cuentas[0].toLowerCase();
      let prov = bp ?? provider;
      if (!prov && typeof window !== "undefined" && window.ethereum) {
        prov = new BrowserProvider(window.ethereum);
      }
      setProvider(prov);
      setAccount(cuenta);
      setErrorConexion(null);
      localStorage.setItem(CLAVE_ACCOUNT, cuenta);
      if (prov) {
        try {
          setSigner(await prov.getSigner());
        } catch {
          // wallet bloqueada: la cuenta queda visible pero sin signer
          // (firmar mostrará el aviso de desbloqueo).
          setSigner(null);
        }
      } else {
        setSigner(null);
      }
    },
    [provider]
  );

  // EIP-6963: algunas wallets (apps móviles en navegador interno, Rabby, etc.)
  // anuncian su provider por evento; si aún no hay window.ethereum se adopta.
  useEffect(() => {
    if (typeof window === "undefined" || window.ethereum) return;
    const aceptar = (e: Event) => {
      const detalle = (e as CustomEvent<{ provider: Eip1193Provider }>).detail;
      if (detalle?.provider && !window.ethereum) {
        window.ethereum = detalle.provider as unknown as Window["ethereum"];
        setErrorConexion(null);
      }
    };
    window.addEventListener("eip6963:announceProvider", aceptar);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", aceptar);
  }, []);

  // Auto-reconexión al refrescar (RF-16.2)
  useEffect(() => {
    const previa = localStorage.getItem(CLAVE_ACCOUNT);
    if (previa && typeof window !== "undefined" && window.ethereum) {
      const bp = new BrowserProvider(window.ethereum);
      setProvider(bp);
      bp.getSigner().then((s) => {
        setSigner(s);
        setAccount(previa);
      }).catch(() => {
        // wallet no desbloqueada: se mantiene la cuenta almacenada pero sin signer
        setAccount(previa);
      });
    }
  }, []);

  // Escuchar cambios de cuenta/red de MetaMask
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum?.on) return;
    const handleAccounts = (cuentas: unknown[]) => void fijarCuenta(cuentas as string[]);
    window.ethereum.on("accountsChanged", handleAccounts);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
    };
  }, [fijarCuenta]);

  const conectar = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    let eth = window.ethereum;
    if (!eth) {
      // Sin extensión ni navegador interno: esperamos un provider EIP-6963
      // (algunas wallets móviles lo anuncian al cargar) antes de rendirnos.
      const anunciado = await aguardarProveedor6963(1200);
      if (anunciado) {
        eth = anunciado;
        window.ethereum = anunciado as unknown as Window["ethereum"];
      } else {
        // Móvil: no hay extensiones → se abre/guía hacia la app de la wallet.
        setErrorConexion(esDispositivoMovil() ? "app_movil" : "sin_wallet");
        return null;
      }
    }
    setConectando(true);
    try {
      // Provider FRESCO: nunca reutilizar el de la cuenta anterior (el signer
      // debe corresponder a la wallet que el usuario elija ahora).
      const bp = new BrowserProvider(eth);
      const cuentas = (await eth.request?.({
        method: "eth_requestAccounts",
      })) as string[];
      if (!cuentas || cuentas.length === 0) return null;
      await fijarCuenta(cuentas, bp);
      return cuentas[0]?.toLowerCase() ?? null;
    } catch (e) {
      console.error("[ethereum] error al conectar:", e);
      return null;
    } finally {
      setConectando(false);
    }
  }, [fijarCuenta]);

  /** Deep link a la app de MetaMask (móvil): abre esta misma dApp en su navegador interno. */
  const abrirEnAppWallet = useCallback(() => {
    if (typeof window === "undefined") return;
    const host = window.location.host || "truekeate-web-593453426217.europe-west1.run.app";
    window.location.href = `https://metamask.app.link/dapp/${host}`;
  }, []);

  const desconectar = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    localStorage.removeItem(CLAVE_ACCOUNT);
    // Revoca el permiso eth_accounts en MetaMask: sin esta llamada el próximo
    // eth_requestAccounts devolvería la cuenta ANTERIOR sin mostrar el selector
    // de cuentas (bug reportado: "no desconecta / queda la wallet anterior").
    try {
      const p = window.ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      }) as Promise<unknown> | undefined;
      // Algunas wallets no soportan la revocación o la cancelan: se ignora,
      // la desconexión local (estado + almacenamiento) ya se completó.
      if (p) void p.catch(() => undefined);
    } catch {
      // error síncrono de la wallet: se ignora
    }
  }, []);

  const valor = useMemo<EstadoEthereum>(
    () => ({
      account,
      provider,
      signer,
      conectando,
      // Control de acceso: "billetera conectada" = hay cuenta (la auto-reconexión
      // RF-16.2 restaura la cuenta al refrescar). El signer solo se necesita
      // para firmar transacciones on-chain.
      conectado: Boolean(account),
      conectar,
      desconectar,
      errorConexion,
      abrirEnAppWallet,
      esMovil: esDispositivoMovil(),
    }),
    [account, provider, signer, conectando, conectar, desconectar, errorConexion, abrirEnAppWallet]
  );

  return <EthereumContext.Provider value={valor}>{children}</EthereumContext.Provider>;
}

export function useEthereum(): EstadoEthereum {
  const ctx = useContext(EthereumContext);
  if (!ctx) throw new Error("useEthereum debe usarse dentro de <EthereumProvider>");
  return ctx;
}
