"use client";

// =============================================================================
// TrueKeate — Context provider de Ethereum (RT-04.4, RF-16)
// Gestiona la conexión con MetaMask (provider/signer/account) y la
// auto-reconexión al refrescar la página (RF-16.2). En móvil la firma se
// delega a la wallet móvil (MetaMask mobile) en la PWA instalable (D40).
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

export interface EstadoEthereum {
  account: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  conectando: boolean;
  conectado: boolean;
  conectar: () => Promise<string | null>;
  desconectar: () => void;
}

const EthereumContext = createContext<EstadoEthereum | null>(null);

const CLAVE_ACCOUNT = "truekeate.account";

export function EthereumProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [conectando, setConectando] = useState(false);

  const alCambiarCuentas = useCallback(async (cuentas: unknown[]) => {
    const lista = (cuentas as string[]) ?? [];
    if (lista.length === 0) {
      setAccount(null);
      setSigner(null);
      localStorage.removeItem(CLAVE_ACCOUNT);
      return;
    }
    const cuenta = lista[0].toLowerCase();
    setAccount(cuenta);
    localStorage.setItem(CLAVE_ACCOUNT, cuenta);
    if (provider) setSigner(await provider.getSigner());
  }, [provider]);

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
    const handleAccounts = (cuentas: unknown[]) => void alCambiarCuentas(cuentas);
    window.ethereum.on("accountsChanged", handleAccounts);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
    };
  }, [alCambiarCuentas]);

  const conectar = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask no está instalado. Instálalo o usa una wallet compatible (RF-16.1).");
      return null;
    }
    setConectando(true);
    try {
      const bp = new BrowserProvider(window.ethereum);
      const cuentas = (await window.ethereum.request?.({
        method: "eth_requestAccounts",
      })) as string[];
      await alCambiarCuentas(cuentas);
      return cuentas[0]?.toLowerCase() ?? null;
    } catch (e) {
      console.error("[ethereum] error al conectar:", e);
      return null;
    } finally {
      setConectando(false);
    }
  }, [alCambiarCuentas]);

  const desconectar = useCallback(() => {
    setAccount(null);
    setSigner(null);
    localStorage.removeItem(CLAVE_ACCOUNT);
  }, []);

  const valor = useMemo<EstadoEthereum>(
    () => ({
      account,
      provider,
      signer,
      conectando,
      conectado: Boolean(account && signer),
      conectar,
      desconectar,
    }),
    [account, provider, signer, conectando, conectar, desconectar]
  );

  return <EthereumContext.Provider value={valor}>{children}</EthereumContext.Provider>;
}

export function useEthereum(): EstadoEthereum {
  const ctx = useContext(EthereumContext);
  if (!ctx) throw new Error("useEthereum debe usarse dentro de <EthereumProvider>");
  return ctx;
}
