// =============================================================================
// Dashboard "Mi Trueke Central" — tarjeta "Mis truekes"
// Regresión reportada por el director: el contenido de la ficha aparecía
// duplicado (una tarjeta dentro de otra, con el título repetido).
// =============================================================================
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "../app/suite/dashboard/page";

const CUENTA = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

vi.mock("@/lib/ethereum", () => ({
  useEthereum: () => ({
    account: CUENTA,
    conectado: true,
    conectar: vi.fn(),
    conectando: false,
    provider: null,
    signer: null,
  }),
}));

vi.mock("@/lib/sesion", () => ({
  useSesion: () => ({
    acceso: { fase: "inscrito", usuario: { wallet: CUENTA, tipo: "PARTICULAR", nivel: "COMUN", estado: "VERIFICADO" } },
    token: "tok",
    firmarAccion: vi.fn(),
  }),
}));

vi.mock("@/lib/useSesionAutenticada", () => ({
  useSesionAutenticada: () => ({ token: "tok" }),
}));

vi.mock("@/lib/api", () => ({
  API_URL: "http://127.0.0.1:4000",
  misTruekes: async () => ({
    truekes: [
      { id: 42, articuloAId: 1, tituloA: "Bicicleta", descripcionRequerida: "busco laptop", estado: "CUSTODIADO", usuarioA: CUENTA, usuarioB: "0xbbb" },
    ],
  }),
  ofertasMercado: async () => ({ truekes: [] }),
  obtenerCatalogo: async () => [],
  crearOfertaTrueke: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ficha "Mis truekes" del dashboard', () => {
  test("el título aparece una sola vez (no hay tarjeta anidada)", () => {
    render(<Dashboard />);
    expect(screen.getAllByText("Mis truekes")).toHaveLength(1);
  });

  test("los contadores aparecen una sola vez cada uno", () => {
    render(<Dashboard />);
    for (const etiqueta of ["Ofertados", "Activos", "Cerrados"]) {
      expect(screen.getAllByText(etiqueta)).toHaveLength(1);
    }
  });

  test("la descripción del módulo se muestra una sola vez", () => {
    render(<Dashboard />);
    expect(screen.getAllByText(/Crea y completa trueques/)).toHaveLength(1);
  });

  test("no anida una tarjeta dentro de otra", () => {
    const { container } = render(<Dashboard />);
    // Las tarjetas del sistema de diseño llevan la clase rounded-card.
    const tarjetas = container.querySelectorAll(".rounded-card");
    for (const t of tarjetas) {
      expect(t.querySelector(".rounded-card")).toBeNull();
    }
  });
});
