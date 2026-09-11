// =============================================================================
// OperationsList — lista de operaciones con auto-refresh
// =============================================================================
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { OperationsList } from "../components/OperationsList";
import type { Trueke } from "../lib/api";

const truekes = [
  { id: 7, articuloAId: 3, tituloA: "Bicicleta", descripcionRequerida: "busco laptop", estado: "CUSTODIADO", usuarioA: "0xaaa1111111111111111111111111111111111111", usuarioB: "0xbbb2222222222222222222222222222222222222" },
  { id: 8, articuloAId: 4, tituloA: "Guitarra", descripcionRequerida: "busco amplificador", estado: "PROPUESTO", usuarioA: "0xaaa1111111111111111111111111111111111111", usuarioB: null },
] as unknown as Trueke[];

afterEach(() => {
  vi.useRealTimers();
});

describe("OperationsList", () => {
  test("muestra identificador, qué se ofrece, qué se pide y el estado", () => {
    render(<OperationsList truekes={truekes} />);
    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText(/Bicicleta/)).toBeInTheDocument();
    expect(screen.getByText(/busco laptop/)).toBeInTheDocument();
    expect(screen.getByText("CUSTODIADO")).toBeInTheDocument();
    expect(screen.getByText("PROPUESTO")).toBeInTheDocument();
  });

  test("abrevia la wallet de la contraparte", () => {
    render(<OperationsList truekes={truekes} />);
    expect(screen.getByText(/0xbbb2…2222/)).toBeInTheDocument();
  });

  test("con la lista vacía muestra el mensaje y no rompe", () => {
    render(<OperationsList truekes={[]} vacio="Nada por aquí" />);
    expect(screen.getByText("Nada por aquí")).toBeInTheDocument();
  });

  test("respeta el límite e indica cuántas quedan", () => {
    render(<OperationsList truekes={truekes} limite={1} />);
    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.queryByText("#8")).not.toBeInTheDocument();
    expect(screen.getByText(/y 1 más/)).toBeInTheDocument();
  });

  test("se refresca sola cada 5 s", async () => {
    vi.useFakeTimers();
    const onRefrescar = vi.fn();
    render(<OperationsList truekes={truekes} onRefrescar={onRefrescar} intervaloMs={5000} />);

    expect(onRefrescar).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(onRefrescar).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(onRefrescar).toHaveBeenCalledTimes(2);
  });

  test("con intervalo 0 no se refresca sola", async () => {
    vi.useFakeTimers();
    const onRefrescar = vi.fn();
    render(<OperationsList truekes={truekes} onRefrescar={onRefrescar} intervaloMs={0} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(onRefrescar).not.toHaveBeenCalled();
  });

  test("un fallo del refresco automático no rompe la lista", async () => {
    vi.useFakeTimers();
    const onRefrescar = vi.fn().mockRejectedValue(new Error("sin red"));
    render(<OperationsList truekes={truekes} onRefrescar={onRefrescar} intervaloMs={5000} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText("#7")).toBeInTheDocument();
  });

  test("el botón de refresco manual llama a onRefrescar", async () => {
    const onRefrescar = vi.fn();
    render(<OperationsList truekes={truekes} onRefrescar={onRefrescar} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "↻" }));
    });
    expect(onRefrescar).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Actualizado a las/)).toBeInTheDocument();
  });

  test("cada operación enlaza a su detalle", () => {
    render(<OperationsList truekes={truekes} detalleHref="/suite/intercambio" />);
    const enlaces = screen.getAllByRole("link", { name: "Abrir" });
    expect(enlaces).toHaveLength(2);
    expect(enlaces[0]).toHaveAttribute("href", "/suite/intercambio");
  });
});
