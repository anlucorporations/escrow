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
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask no está instalado. Instálalo o usa una wallet compatible (RF-16.1).");
      return null;
    }
    setConectando(true);
    try {
      // Provider FRESCO: nunca reutilizar el de la cuenta anterior (el signer
      // debe corresponder a la wallet que el usuario elija ahora).
      const bp = new BrowserProvider(window.ethereum);
      const cuentas = (await window.ethereum.request?.({
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
