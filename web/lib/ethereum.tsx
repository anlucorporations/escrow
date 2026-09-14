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

/** Proveedor EIP-1193 con los métodos de eventos opcionales de EIP-1193. */
type ProveedorConEventos = Eip1193Provider & {
  on?: (ev: string, cb: (args: unknown[]) => void) => void;
  removeListener?: (ev: string, cb: (args: unknown[]) => void) => void;
};

export type MotivoSinProveedor = "sin_wallet" | "app_movil" | null;

/** Avisos accionables que dependen de la wallet, no de su ausencia. */
export type AvisoConexion = "rechazado" | "red_incorrecta" | null;

/** Red en la que opera la plataforma (31337 = Anvil por defecto). */
export const RED_ESPERADA = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);

export interface EstadoEthereum {
  account: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  /** Proveedor EIP-1193 de la wallet ELEGIDA (MetaMask, TrueKeate Wallet, …).
   *  Es la fuente de verdad para firmar, escuchar eventos y cambiar de red;
   *  window.ethereum solo se usa como último recurso. */
  proveedorActivo: Eip1193Provider | null;
  /** Devuelve, EN EL MOMENTO DE LA LLAMADA, el proveedor de la billetera
   *  elegida (o la única disponible). Evita closures obsoletos al firmar: la
   *  elección se lee del almacenamiento, no del render anterior. */
  obtenerProveedorActivo: () => Eip1193Provider | null;
  conectando: boolean;
  conectado: boolean;
  conectar: () => Promise<string | null>;
  desconectar: () => void;
  /** Por qué no hay provider (móvil sin extensión / escritorio sin extensión). */
  errorConexion: MotivoSinProveedor;
  /** Aviso mostrable al usuario: rechazo del usuario o red equivocada. */
  aviso: AvisoConexion;
  /** chainId actual de la wallet (null si no se pudo leer). */
  redActual: number | null;
  /** Wallets anunciadas por EIP-6963 (MetaMask también se anuncia así). */
  wallets: WalletAnunciada[];
  /** rdns de la wallet elegida por el usuario, si eligió alguna. */
  walletElegida: string | null;
  /** Fija con qué wallet se conectará; se recuerda entre sesiones. */
  elegirWallet: (rdns: string) => void;
  /** Red que espera la plataforma. */
  redEsperada: number;
  /** Pide a la wallet cambiar a la red esperada (la agrega si no la conoce). */
  cambiarDeRed: () => Promise<boolean>;
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
/** Wallet elegida por el usuario (se identifica por su rdns EIP-6963). */
const CLAVE_WALLET = "truekeate.wallet";

/** Datos públicos de una wallet anunciada por EIP-6963. */
export interface WalletAnunciada {
  rdns: string;
  name: string;
  icon: string;
}

/** Proveedores anunciados por EIP-6963, indexados por rdns. */
const anunciados = new Map<string, { info: WalletAnunciada; provider: Eip1193Provider }>();

/** rdns sintético para una wallet que solo expone window.ethereum (legacy). */
const RDNS_INYECTADA = "__inyectada__";

export function EthereumProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [conectando, setConectando] = useState(false);
  const [errorConexion, setErrorConexion] = useState<MotivoSinProveedor>(null);
  const [wallets, setWallets] = useState<WalletAnunciada[]>(() =>
    [...anunciados.values()].map((w) => w.info)
  );
  const [walletElegida, setWalletElegida] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CLAVE_WALLET);
  });

  /**
   * Resuelve el proveedor EIP-1193 activo: la wallet elegida por su rdns; si no
   * hay elección y solo hay UNA anunciada, esa. Con VARIAS wallets y sin
   * elección devuelve null: la app no adopta ninguna ni toca `window.ethereum`
   * (el usuario debe elegir en el popup). Es la pieza que hace que la firma de
   * sesión y la firma por acción usen la MISMA wallet que se conectó.
   */
  const resolverActivo = useCallback((): Eip1193Provider | null => {
    if (typeof window === "undefined") return null;
    const rdns = localStorage.getItem(CLAVE_WALLET);
    const elegido = rdns ? anunciados.get(rdns)?.provider : null;
    if (elegido) return elegido;
    if (anunciados.size === 1) return [...anunciados.values()][0].provider;
    return null;
  }, []);
  /** Proveedor EIP-1193 de la wallet activa (se mantiene sincronizado). */
  const [proveedorActivo, setProveedorActivo] = useState<Eip1193Provider | null>(null);

  /** Aplica una elección: persiste el rdns y activa ese proveedor. NO se toca
   *  `window.ethereum` para no interferir con las demás wallets del navegador;
   *  toda la app usa el proveedor activo de forma explícita. */
  const activarProveedor = useCallback((rdns: string | null, provider: Eip1193Provider | null) => {
    if (rdns) localStorage.setItem(CLAVE_WALLET, rdns);
    setWalletElegida(rdns);
    setProveedorActivo(provider);
  }, []);

  /**
   * Fija la wallet con la que se conectará la app. Sin elección, el
   * comportamiento es el de siempre (window.ethereum): así la convivencia no
   * cambia nada para quien solo tiene MetaMask.
   */
  const elegirWallet = useCallback((rdns: string) => {
    if (typeof window === "undefined") return;
    activarProveedor(rdns, anunciados.get(rdns)?.provider ?? null);
    setErrorConexion(null);
  }, [activarProveedor]);
  const [aviso, setAviso] = useState<AvisoConexion>(null);
  const [redActual, setRedActual] = useState<number | null>(null);

  /** Lee el chainId de la wallet y marca aviso si no es la red esperada. */
  const revisarRed = useCallback(async (eth?: Eip1193Provider | null): Promise<number | null> => {
    const w = eth ?? proveedorActivo ?? (typeof window !== "undefined" ? window.ethereum : null);
    if (!w?.request) return null;
    try {
      const hex = (await w.request({ method: "eth_chainId" })) as string;
      const id = Number.parseInt(String(hex), 16);
      setRedActual(id);
      // Un rechazo del usuario no se pisa con el resultado de esta comprobación.
      setAviso((prev) => (prev === "rechazado" ? prev : id === RED_ESPERADA ? null : "red_incorrecta"));
      return id;
    } catch {
      return null;
    }
  }, [proveedorActivo]);

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
      if (!prov) {
        const eth = proveedorActivo ?? (typeof window !== "undefined" ? window.ethereum : null);
        if (eth) prov = new BrowserProvider(eth);
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
    [provider, proveedorActivo]
  );

  // EIP-6963: se escuchan TODAS las wallets anunciadas (MetaMask también se
  // anuncia por este estándar). Se listan todas para que el usuario elija y la
  // elección se mantiene durante toda la sesión: la firma de login y la firma
  // por acción usan el proveedor activo, no window.ethereum.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Estado limpio en cada montaje: las wallets se re-anuncian al pedirlo, así
    // no quedan proveedores obsoletos de una carga anterior (ni entre pruebas).
    anunciados.clear();

    const sincronizar = () => {
      // Wallet legacy: si hay window.ethereum y ninguna wallet anunciada es ESE
      // mismo proveedor, se añade como opción (wallets antiguas sin EIP-6963).
      const ethInyectado = window.ethereum;
      const yaAnunciado =
        ethInyectado && [...anunciados.values()].some((w) => w.provider === ethInyectado);
      if (ethInyectado && !yaAnunciado && !anunciados.has(RDNS_INYECTADA)) {
        anunciados.set(RDNS_INYECTADA, {
          info: { rdns: RDNS_INYECTADA, name: "Billetera del navegador", icon: "" },
          provider: ethInyectado,
        });
      }
      setWallets([...anunciados.values()].map((w) => w.info));
      const activo = resolverActivo();
      setProveedorActivo(activo);
      if (activo) setErrorConexion(null);
    };

    const aceptar = (e: Event) => {
      const detalle = (e as CustomEvent<{ info?: WalletAnunciada; provider?: Eip1193Provider }>).detail;
      if (!detalle?.provider || !detalle.info?.rdns) return;
      // Si la recién anunciada es la misma que la legacy sintética, se retira el
      // duplicado para no listar dos veces la misma billetera.
      const sintetica = anunciados.get(RDNS_INYECTADA);
      if (sintetica && sintetica.provider === detalle.provider) anunciados.delete(RDNS_INYECTADA);
      anunciados.set(detalle.info.rdns, { info: detalle.info, provider: detalle.provider });
      sincronizar();
    };

    window.addEventListener("eip6963:announceProvider", aceptar);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    // Resolución inmediata: las wallets que anuncian al pedirlo ya están, y la
    // legacy (window.ethereum) debe listarse YA (si no, el popup no la mostraría
    // si el usuario pulsa Conectar nada más cargar).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sincronizar();
    // Los anuncios tardíos se recogen igualmente; este segundo pase incorpora la
    // legacy si apareció después del primero.
    const t = setTimeout(sincronizar, 250);
    return () => {
      clearTimeout(t);
      window.removeEventListener("eip6963:announceProvider", aceptar);
    };
  }, [resolverActivo]);

  // Auto-reconexión al refrescar (RF-16.2) con la wallet ACTIVA (la elegida).
  // Si hay varias wallets y ninguna elegida, NO se toca ninguna: la app espera
  // a que el usuario elija en el popup.
  useEffect(() => {
    const previa = localStorage.getItem(CLAVE_ACCOUNT);
    const eth = proveedorActivo;
    if (!eth) return;
    // Detectar de entrada si la wallet está en otra red (aviso temprano).
    void revisarRed(eth);
    if (previa) {
      const bp = new BrowserProvider(eth);
      setProvider(bp);
      bp.getSigner().then((s) => {
        setSigner(s);
        setAccount(previa);
      }).catch(() => {
        // wallet no desbloqueada: se mantiene la cuenta almacenada pero sin signer
        setAccount(previa);
      });
    }
  }, [proveedorActivo, revisarRed]);

  // Escuchar cambios de cuenta/red de la wallet ACTIVA (no de window.ethereum).
  useEffect(() => {
    const eth = (proveedorActivo ??
      (typeof window !== "undefined" ? window.ethereum : null)) as ProveedorConEventos | null;
    if (typeof window === "undefined" || !eth?.on) return;
    const handleAccounts = (cuentas: unknown[]) => void fijarCuenta(cuentas as string[]);
    eth.on("accountsChanged", handleAccounts);
    return () => {
      eth.removeListener?.("accountsChanged", handleAccounts);
    };
  }, [proveedorActivo, fijarCuenta]);

  // Cambio de red en la wallet: el provider anterior queda inservible, así que
  // se reconstruye y se avisa si la red no es la de la plataforma.
  useEffect(() => {
    const eth = (proveedorActivo ??
      (typeof window !== "undefined" ? window.ethereum : null)) as ProveedorConEventos | null;
    if (typeof window === "undefined" || !eth?.on) return;
    const handleChain = (hex: unknown) => {
      const id = Number.parseInt(String(hex), 16);
      setRedActual(id);
      setAviso(id === RED_ESPERADA ? null : "red_incorrecta");
      const bp = new BrowserProvider(eth);
      setProvider(bp);
      setSigner(null);
      void bp.getSigner().then(setSigner).catch(() => setSigner(null));
      if (account) void fijarCuenta([account], bp);
    };
    eth.on("chainChanged", handleChain);
    return () => {
      eth.removeListener?.("chainChanged", handleChain);
    };
  }, [proveedorActivo, account, fijarCuenta]);

  const conectar = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    // Si el usuario eligió una wallet concreta, se usa esa; si no, la activa
    // (una sola anunciada) o window.ethereum.
    const rdnsElegido = localStorage.getItem(CLAVE_WALLET);
    const elegido = rdnsElegido ? anunciados.get(rdnsElegido)?.provider : null;
    let eth = elegido ?? proveedorActivo ?? window.ethereum;
    if (!eth) {
      // Sin extensión ni navegador interno: esperamos un provider EIP-6963
      // (algunas wallets móviles lo anuncian al cargar) antes de rendirnos.
      const anunciado = await aguardarProveedor6963(1200);
      if (anunciado) {
        eth = anunciado;
        setProveedorActivo(anunciado);
      } else {
        // Móvil: no hay extensiones → se abre/guía hacia la app de la wallet.
        setErrorConexion(esDispositivoMovil() ? "app_movil" : "sin_wallet");
        return null;
      }
    }
    setConectando(true);
    setAviso(null);
    try {
      // Provider FRESCO: nunca reutilizar el de la cuenta anterior (el signer
      // debe corresponder a la wallet que el usuario elija ahora).
      const bp = new BrowserProvider(eth);
      const cuentas = (await eth.request?.({
        method: "eth_requestAccounts",
      })) as string[];
      if (!cuentas || cuentas.length === 0) return null;
      await fijarCuenta(cuentas, bp);
      await revisarRed(eth);
      return cuentas[0]?.toLowerCase() ?? null;
    } catch (e) {
      // 4001 = el usuario canceló el popup de la wallet: es una acción legítima,
      // no un fallo; se le informa sin ruido en consola.
      if ((e as { code?: number })?.code === 4001) {
        setAviso("rechazado");
        return null;
      }
      console.error("[ethereum] error al conectar:", e);
      setAviso(null);
      return null;
    } finally {
      setConectando(false);
    }
  }, [fijarCuenta, revisarRed, proveedorActivo]);

  /** Pide a la wallet cambiar a la red esperada; si no la conoce, la agrega. */
  const cambiarDeRed = useCallback(async (): Promise<boolean> => {
    const eth = proveedorActivo ?? (typeof window !== "undefined" ? window.ethereum : null);
    if (!eth?.request) return false;
    const hex = `0x${RED_ESPERADA.toString(16)}`;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      await revisarRed(eth);
      return true;
    } catch (e) {
      const code = (e as { code?: number })?.code;
      // 4902 = la wallet no conoce esa red: se agrega y se reintenta.
      if (code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: hex,
              chainName: RED_ESPERADA === 31337 ? "Anvil (TrueKeate local)" : `Red ${RED_ESPERADA}`,
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545"],
            }],
          });
          await revisarRed(eth);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, [revisarRed, proveedorActivo]);

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
    // Revoca el permiso eth_accounts en la wallet ACTIVA: sin esta llamada el
    // próximo eth_requestAccounts devolvería la cuenta ANTERIOR sin mostrar el
    // selector de cuentas (bug reportado: "no desconecta / queda la anterior").
    try {
      const activo = proveedorActivo ?? (typeof window !== "undefined" ? window.ethereum : null);
      const p = activo?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      }) as Promise<unknown> | undefined;
      // Algunas wallets no soportan la revocación o la cancelan: se ignora,
      // la desconexión local (estado + almacenamiento) ya se completó.
      if (p) void p.catch(() => undefined);
    } catch {
      // error síncrono de la wallet: se ignora
    }
  }, [proveedorActivo]);

  const valor = useMemo<EstadoEthereum>(
    () => ({
      account,
      provider,
      signer,
      proveedorActivo,
      obtenerProveedorActivo: resolverActivo,
      conectando,
      // Control de acceso: "billetera conectada" = hay cuenta (la auto-reconexión
      // RF-16.2 restaura la cuenta al refrescar). El signer solo se necesita
      // para firmar transacciones on-chain.
      conectado: Boolean(account),
      conectar,
      desconectar,
      errorConexion,
      aviso,
      redActual,
      redEsperada: RED_ESPERADA,
      cambiarDeRed,
      wallets,
      walletElegida,
      elegirWallet,
      abrirEnAppWallet,
      esMovil: esDispositivoMovil(),
    }),
    [account, provider, signer, proveedorActivo, resolverActivo, conectando, conectar, desconectar, errorConexion, aviso, redActual, cambiarDeRed, abrirEnAppWallet, wallets, walletElegida, elegirWallet]
  );

  return <EthereumContext.Provider value={valor}>{children}</EthereumContext.Provider>;
}

export function useEthereum(): EstadoEthereum {
  const ctx = useContext(EthereumContext);
  if (!ctx) throw new Error("useEthereum debe usarse dentro de <EthereumProvider>");
  return ctx;
}
