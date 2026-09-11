// =============================================================================
// web/lib/ethereum.tsx — capa de conexión con la wallet (RF-16)
// Es la pieza de la que depende todo el acceso: si la auto-reconexión o la
// desconexión fallan, la plataforma queda inutilizable (bug real ya corregido
// una vez: «no desconecta / queda la wallet anterior»).
// =============================================================================
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { EthereumProvider, useEthereum } from "../lib/ethereum";

const CUENTA = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const CUENTA_2 = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const CLAVE = "truekeate.account";

type Oyente = (args: unknown[]) => void;

/** Simula window.ethereum (EIP-1193) y permite emitir eventos de la wallet. */
function instalarWallet(cuentas: string[] = [CUENTA]) {
  const oyentes: Record<string, Oyente[]> = {};
  const metodos: string[] = [];
  const eth = {
    request: vi.fn(async ({ method }: { method: string }) => {
      metodos.push(method);
      if (method === "eth_requestAccounts" || method === "eth_accounts") return cuentas;
      if (method === "eth_chainId") return "0x7a69";
      return null;
    }),
    on: (ev: string, cb: Oyente) => {
      (oyentes[ev] ||= []).push(cb);
    },
    removeListener: (ev: string, cb: Oyente) => {
      oyentes[ev] = (oyentes[ev] ?? []).filter((f) => f !== cb);
    },
  };
  (window as unknown as { ethereum: unknown }).ethereum = eth;
  return {
    eth,
    metodos,
    emitir: (ev: string, args: unknown[]) => (oyentes[ev] ?? []).forEach((f) => f(args)),
    oyentesDe: (ev: string) => oyentes[ev] ?? [],
  };
}

/** Componente sonda: expone el estado del contexto y sus acciones. */
function Sonda() {
  const e = useEthereum();
  return (
    <div>
      <span data-testid="account">{e.account ?? "ninguna"}</span>
      <span data-testid="conectado">{String(e.conectado)}</span>
      <span data-testid="error">{e.errorConexion ?? "ninguno"}</span>
      <span data-testid="signer">{e.signer ? "si" : "no"}</span>
      <button onClick={() => void e.conectar()}>conectar</button>
      <button onClick={() => e.desconectar()}>desconectar</button>
    </div>
  );
}

const montar = () =>
  render(
    <EthereumProvider>
      <Sonda />
    </EthereumProvider>
  );

const leer = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  localStorage.clear();
});

describe("auto-reconexión al refrescar (RF-16.2)", () => {
  test("restaura la cuenta guardada sin pedir permiso a la wallet", async () => {
    localStorage.setItem(CLAVE, CUENTA);
    const wallet = instalarWallet();
    montar();
    await waitFor(() => expect(leer("account")).toBe(CUENTA));
    expect(leer("conectado")).toBe("true");
    expect(wallet.metodos).not.toContain("eth_requestAccounts");
  });

  test("sin cuenta guardada no conecta nada", async () => {
    instalarWallet();
    montar();
    await waitFor(() => expect(leer("conectado")).toBe("false"));
    expect(leer("account")).toBe("ninguna");
  });
});

describe("conectar", () => {
  test("conecta, normaliza a minúsculas y persiste la cuenta", async () => {
    const wallet = instalarWallet([CUENTA.toUpperCase()]);
    montar();
    await act(async () => {
      screen.getByText("conectar").click();
    });
    await waitFor(() => expect(leer("account")).toBe(CUENTA));
    expect(localStorage.getItem(CLAVE)).toBe(CUENTA);
    expect(wallet.metodos).toContain("eth_requestAccounts");
  });

  test("sin wallet y en escritorio marca «sin_wallet»", async () => {
    montar();
    await act(async () => {
      screen.getByText("conectar").click();
    });
    await waitFor(() => expect(leer("error")).toBe("sin_wallet"), { timeout: 4000 });
    expect(leer("conectado")).toBe("false");
  });

  test("adopta el provider anunciado por EIP-6963 si no hay window.ethereum", async () => {
    const cuentas = [CUENTA_2];
    const anunciado = {
      request: vi.fn(async ({ method }: { method: string }) =>
        method === "eth_requestAccounts" || method === "eth_accounts" ? cuentas : "0x7a69"
      ),
      on: () => {},
      removeListener: () => {},
    };
    // La wallet se anuncia en cuanto la app pregunta por ella.
    window.addEventListener("eip6963:requestProvider", () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", { detail: { provider: anunciado } })
      );
    });
    montar();
    await act(async () => {
      screen.getByText("conectar").click();
    });
    await waitFor(() => expect(leer("account")).toBe(CUENTA_2));
    expect(leer("error")).toBe("ninguno");
  });

  test("si el usuario rechaza en la wallet no se conecta ni revienta", async () => {
    const eth = {
      request: vi.fn(async () => {
        throw Object.assign(new Error("User rejected the request"), { code: 4001 });
      }),
      on: () => {},
      removeListener: () => {},
    };
    (window as unknown as { ethereum: unknown }).ethereum = eth;
    const errores = vi.spyOn(console, "error").mockImplementation(() => {});
    montar();
    await act(async () => {
      screen.getByText("conectar").click();
    });
    await waitFor(() => expect(leer("conectado")).toBe("false"));
    expect(errores).toHaveBeenCalled();
  });
});

describe("accountsChanged", () => {
  test("cambiar de cuenta en MetaMask actualiza el estado y el almacenamiento", async () => {
    const wallet = instalarWallet([CUENTA]);
    localStorage.setItem(CLAVE, CUENTA);
    montar();
    await waitFor(() => expect(leer("account")).toBe(CUENTA));

    await act(async () => {
      wallet.emitir("accountsChanged", [CUENTA_2]);
    });
    await waitFor(() => expect(leer("account")).toBe(CUENTA_2));
    expect(localStorage.getItem(CLAVE)).toBe(CUENTA_2);
  });

  test("quedarse sin cuentas limpia la sesión", async () => {
    const wallet = instalarWallet([CUENTA]);
    localStorage.setItem(CLAVE, CUENTA);
    montar();
    await waitFor(() => expect(leer("account")).toBe(CUENTA));

    await act(async () => {
      wallet.emitir("accountsChanged", []);
    });
    await waitFor(() => expect(leer("conectado")).toBe("false"));
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
});

describe("desconectar", () => {
  test("limpia el estado, el almacenamiento y revoca el permiso de la wallet", async () => {
    const wallet = instalarWallet([CUENTA]);
    localStorage.setItem(CLAVE, CUENTA);
    montar();
    await waitFor(() => expect(leer("account")).toBe(CUENTA));

    await act(async () => {
      screen.getByText("desconectar").click();
    });
    await waitFor(() => expect(leer("conectado")).toBe("false"));
    expect(localStorage.getItem(CLAVE)).toBeNull();
    expect(wallet.metodos).toContain("wallet_revokePermissions");
  });

  test("si la wallet no soporta la revocación, la desconexión local se completa igual", async () => {
    const eth = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === "wallet_revokePermissions") throw new Error("método no soportado");
        return [CUENTA];
      }),
      on: () => {},
      removeListener: () => {},
    };
    (window as unknown as { ethereum: unknown }).ethereum = eth;
    localStorage.setItem(CLAVE, CUENTA);
    montar();
    await waitFor(() => expect(leer("account")).toBe(CUENTA));

    await act(async () => {
      screen.getByText("desconectar").click();
    });
    await waitFor(() => expect(leer("conectado")).toBe("false"));
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
});
