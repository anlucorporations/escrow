// =============================================================================
// BalanceDebug — panel de depuración de balances (lectura directa de la cadena)
// Lo importante: nunca debe romper la pantalla que lo hospeda. Si la cadena o un
// contrato no responden, muestra lo que pueda y sigue.
// =============================================================================
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { EthereumProvider } from "../lib/ethereum";
import { BalanceDebug } from "../components/BalanceDebug";

const CUENTA = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const ESCROW = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const TKA = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

/** Simula una wallet EIP-1193 con el RPC que se le indique. */
function instalarWallet(rpc: (method: string, params?: unknown[]) => unknown) {
  const metodos: string[] = [];
  const eth = {
    request: vi.fn(async ({ method, params }: { method: string; params?: unknown[] }) => {
      metodos.push(method);
      return rpc(method, params);
    }),
    on: () => {},
    removeListener: () => {},
  };
  (window as unknown as { ethereum: unknown }).ethereum = eth;
  return { eth, metodos };
}

const montar = () =>
  render(
    <EthereumProvider>
      <BalanceDebug />
    </EthereumProvider>
  );

beforeEach(() => {
  localStorage.setItem("truekeate.account", CUENTA);
  process.env.NEXT_PUBLIC_ESCROW = ESCROW;
  process.env.NEXT_PUBLIC_TOKEN_A = TKA;
  delete process.env.NEXT_PUBLIC_TOKEN_B;
  delete process.env.NEXT_PUBLIC_TRUEKE_SBT;
});

describe("BalanceDebug", () => {
  test("sin wallet conectada invita a conectar y no muestra tablas", async () => {
    montar();
    expect(await screen.findByText(/Conecta la billetera/i)).toBeInTheDocument();
    expect(screen.queryByText(/Contrato Escrow/i)).not.toBeInTheDocument();
  });

  test("lee el balance y lo muestra en ETH", async () => {
    const { metodos } = instalarWallet((method) => {
      if (method === "eth_chainId") return "0x7a69";
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [CUENTA];
      if (method === "eth_getBalance") return "0xde0b6b3a7640000"; // 1 ETH
      throw new Error("método no soportado");
    });
    montar();
    await waitFor(() => expect(screen.getByText("1.0 ETH")).toBeInTheDocument());
    expect(metodos).toContain("eth_getBalance");
    expect(screen.getByText(/Mi billetera/)).toBeInTheDocument();
  });

  test("si los contratos no responden, el panel sigue en pie y avisa", async () => {
    instalarWallet((method) => {
      if (method === "eth_chainId") return "0x7a69";
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [CUENTA];
      if (method === "eth_getBalance") return "0x0";
      if (method === "eth_call") return "0x"; // respuesta vacía: ethers no puede decodificar
      throw new Error("método no soportado");
    });
    montar();
    await waitFor(() => expect(screen.getByText(/Contrato Escrow/)).toBeInTheDocument());
    // Degrada a valores legibles en lugar de reventar la página.
    expect(screen.getByText("no responde")).toBeInTheDocument();
    // NFT oficial y padrón de socios: ambos sin vincular cuando el RPC no responde
    expect(screen.getAllByText("sin vincular").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Actualizado a las/)).toBeInTheDocument();
  });

  test("el botón de refresco vuelve a leer la cadena", async () => {
    const { metodos } = instalarWallet((method) => {
      if (method === "eth_chainId") return "0x7a69";
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [CUENTA];
      if (method === "eth_getBalance") return "0x0";
      throw new Error("método no soportado");
    });
    montar();
    // «Actualizado a las» solo aparece cuando la primera lectura terminó.
    await waitFor(() => expect(screen.getByText(/Actualizado a las/)).toBeInTheDocument());
    const antes = metodos.filter((m) => m === "eth_getBalance").length;
    expect(antes).toBeGreaterThan(0);

    await act(async () => {
      screen.getByRole("button", { name: /Refrescar/ }).click();
    });
    // La lectura es asíncrona: con la carga de jsdom puede superar el segundo
    // que waitFor espera por defecto (la prueba era intermitente).
    await waitFor(
      () => expect(metodos.filter((m) => m === "eth_getBalance").length).toBeGreaterThan(antes),
      { timeout: 5000 }
    );
  });
});
