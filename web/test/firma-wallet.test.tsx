// =============================================================================
// web/lib/sesion.tsx — la firma debe usar la wallet ELEGIDA (no window.ethereum)
// Regresión del reporte: con MetaMask + CodeCrypto instaladas, el login y la
// firma por acción abrían MetaMask aunque el usuario hubiera elegido la otra.
// =============================================================================
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import { EthereumProvider, useEthereum } from "../lib/ethereum";
import { SesionProvider, useSesion } from "../lib/sesion";
import { ConnectButton } from "../components/ConnectButton";

vi.mock("@/lib/api", () => ({
  MENSAJE_SESION: "TrueKeate: iniciar sesión",
  consultarEstado: vi.fn(async (wallet: string) => ({
    inscrito: true,
    esOwner: false,
    usuario: { wallet, tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" },
  })),
  iniciarSesion: vi.fn(async () => ({
    token: "tok",
    esOwner: false,
    usuario: {
      wallet: "0x2222222222222222222222222222222222222222",
      tipo: "PARTICULAR",
      nivel: "INICIADO",
      estado: "INSCRITO",
    },
  })),
  inscribirse: vi.fn(async () => ({})),
}));

/** Wallet simulada que registra los métodos RPC que recibe. */
function walletFalsa(cuenta: string) {
  const metodos: string[] = [];
  const provider = {
    request: vi.fn(async ({ method }: { method: string }) => {
      metodos.push(method);
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [cuenta];
      if (method === "eth_chainId") return "0x7a69";
      if (method === "personal_sign") return "0xfirma-simulada";
      if (method === "wallet_revokePermissions") return null;
      return null;
    }),
    on: () => {},
    removeListener: () => {},
  };
  return { provider, metodos };
}

function anunciar(meta: unknown, code: unknown) {
  window.addEventListener("eip6963:requestProvider", () => {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: { info: { uuid: "u1", name: "MetaMask", icon: "", rdns: "io.metamask" }, provider: meta },
      })
    );
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: {
          info: { uuid: "u2", name: "CodeCrypto Wallet", icon: "", rdns: "io.codecrypto.wallet" },
          provider: code,
        },
      })
    );
  });
}

function Sonda() {
  const e = useEthereum();
  const s = useSesion();
  return (
    <div>
      <span data-testid="account">{e.account ?? "ninguna"}</span>
      <span data-testid="activo">{e.proveedorActivo ? "si" : "no"}</span>
      <button onClick={() => e.elegirWallet("io.codecrypto.wallet")}>elegir-codecrypto</button>
      <button onClick={() => void s.autenticar()}>autenticar</button>
      <button onClick={() => void s.firmarAccion("publicar artículo")}>firmar-accion</button>
    </div>
  );
}

const montar = () =>
  render(
    <EthereumProvider>
      <SesionProvider>
        <Sonda />
      </SesionProvider>
    </EthereumProvider>
  );

beforeEach(() => localStorage.clear());

describe("firma con la wallet elegida (no window.ethereum)", () => {
  test("el login y la firma por acción usan CodeCrypto cuando se elige, no MetaMask", async () => {
    const meta = walletFalsa("0x1111111111111111111111111111111111111111");
    const code = walletFalsa("0x2222222222222222222222222222222222222222");
    (window as unknown as { ethereum: unknown }).ethereum = meta.provider;
    anunciar(meta.provider, code.provider);

    montar();
    await act(async () => {}); // deja procesar los anuncios EIP-6963

    // El usuario elige explícitamente CodeCrypto Wallet (la app no adopta
    // ninguna sola cuando hay varias).
    await act(async () => {
      screen.getByText("elegir-codecrypto").click();
    });
    await waitFor(() => expect(screen.getByTestId("activo").textContent).toBe("si"));

    // Login único: la firma EIP-191 debe ir a la wallet elegida.
    await act(async () => {
      screen.getByText("autenticar").click();
    });
    await waitFor(() => expect(code.metodos).toContain("personal_sign"));
    expect(meta.metodos).not.toContain("personal_sign");

    // Firma por acción: también a la wallet elegida.
    await act(async () => {
      screen.getByText("firmar-accion").click();
    });
    await waitFor(() =>
      expect(code.metodos.filter((m) => m === "personal_sign").length).toBeGreaterThanOrEqual(2)
    );
    expect(meta.metodos).not.toContain("personal_sign");
  });
});

describe("popup de selección de billetera al conectar", () => {
  test("no deja un selector permanente; el popup lista las billeteras y conecta con la elegida", async () => {
    const meta = walletFalsa("0x1111111111111111111111111111111111111111");
    const code = walletFalsa("0x2222222222222222222222222222222222222222");
    (window as unknown as { ethereum: unknown }).ethereum = meta.provider;
    anunciar(meta.provider, code.provider);

    render(
      <EthereumProvider>
        <SesionProvider>
          <ConnectButton />
        </SesionProvider>
      </EthereumProvider>
    );
    await act(async () => {}); // deja procesar los anuncios EIP-6963

    // No debe existir un selector permanente en la página.
    expect(document.querySelector('select[aria-label="Elegir billetera"]')).toBeNull();

    await act(async () => {
      screen.getByRole("button", { name: /Conectar billetera e iniciar sesión/ }).click();
    });
    const dialog = await screen.findByRole("dialog", { name: "Elige tu billetera" });
    expect(within(dialog).getByText("MetaMask")).toBeInTheDocument();
    expect(within(dialog).getByText("CodeCrypto Wallet")).toBeInTheDocument();

    await act(async () => {
      within(dialog).getByRole("button", { name: /CodeCrypto Wallet/ }).click();
    });
    await waitFor(() => expect(code.metodos).toContain("eth_requestAccounts"));
    expect(meta.metodos).not.toContain("eth_requestAccounts");
    // El login único automático tras conectar debe firmar con la billetera
    // elegida (regresión: antes firmaba con la closure obsoleta / window.ethereum).
    await waitFor(() => expect(code.metodos).toContain("personal_sign"));
    expect(meta.metodos).not.toContain("personal_sign");
  });
});
