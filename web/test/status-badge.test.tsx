// =============================================================================
// StatusBadge — badges semánticos de estado (RNF-08.4)
// =============================================================================
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, tonoDeEstado } from "../components/StatusBadge";

describe("tonoDeEstado", () => {
  test("escalera D28", () => {
    expect(tonoDeEstado("INSCRITO")).toBe("navy");
    expect(tonoDeEstado("VERIFICADO")).toBe("teal");
    expect(tonoDeEstado("CERTIFICADO")).toBe("gold");
  });

  test("estados terminales negativos en rojo", () => {
    for (const e of ["RECHAZADO", "BLOQUEADO", "ANULADO"]) {
      expect(tonoDeEstado(e)).toBe("crimson");
    }
  });

  test("disputa y pendientes en coral", () => {
    for (const e of ["EN_DISPUTA", "RESOLUCION_SOCIOS", "APERTURA", "PENDIENTE"]) {
      expect(tonoDeEstado(e)).toBe("coral");
    }
  });

  test("oferta abierta del mercado (PROPUESTO) en dorado", () => {
    expect(tonoDeEstado("PROPUESTO")).toBe("gold");
  });

  test("un estado desconocido cae en gris, nunca revienta", () => {
    expect(tonoDeEstado("ESTADO_QUE_NO_EXISTE")).toBe("smoke");
  });
});

describe("StatusBadge", () => {
  test("muestra el estado recibido", () => {
    render(<StatusBadge estado="VERIFICADO" />);
    expect(screen.getByText("VERIFICADO")).toBeInTheDocument();
  });

  test("permite un texto propio manteniendo el estado", () => {
    render(<StatusBadge estado="CERTIFICADO">Nivel 3</StatusBadge>);
    expect(screen.getByText("Nivel 3")).toBeInTheDocument();
  });

  test("el tono se puede forzar por props", () => {
    render(<StatusBadge estado="VERIFICADO" tono="crimson" />);
    expect(screen.getByText("VERIFICADO").className).toContain("bg-crimson");
  });
});
