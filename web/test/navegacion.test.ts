// =============================================================================
// Matriz de navegación por rol (RF-14.3–14.8, D14, D28)
// Es la fuente única de qué ve cada usuario en la barra de PC y en la móvil:
// un error aquí deja a un rol sin acceso o le muestra secciones que no le tocan.
// =============================================================================
import { describe, expect, test } from "vitest";
import {
  ETIQUETA_ESTADO,
  seccionesPara,
  seccionesParaMovil,
  type ContextoNav,
} from "../lib/navegacion";

const hrefs = (c: ContextoNav) => seccionesPara(c).map((s) => s.href);

const PARTICULAR_INSCRITO: ContextoNav = { tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" };
const PARTICULAR_VERIFICADO: ContextoNav = { tipo: "PARTICULAR", nivel: "COMUN", estado: "VERIFICADO" };
const PARTICULAR_CERTIFICADO: ContextoNav = { tipo: "PARTICULAR", nivel: "FRECUENTE", estado: "CERTIFICADO" };
const EMPRESA: ContextoNav = { tipo: "EMPRESA", nivel: "COMUN", estado: "CERTIFICADO" };
const SOCIO: ContextoNav = { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" };
const OWNER: ContextoNav = { esOwner: true, tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" };

describe("seccionesPara", () => {
  test("todo inscrito ve al menos dashboard, mercado, valor y perfil", () => {
    expect(hrefs(PARTICULAR_INSCRITO)).toEqual(
      expect.arrayContaining(["/suite/dashboard", "/suite/mercado", "/suite/valor", "/suite/perfil"])
    );
  });

  test("un INSCRITO no ve intercambio, inventario ni subastas (requieren Verificado/Certificado)", () => {
    const h = hrefs(PARTICULAR_INSCRITO);
    expect(h).not.toContain("/suite/intercambio");
    expect(h).not.toContain("/suite/inventario");
    expect(h).not.toContain("/suite/subastas");
    expect(h).not.toContain("/suite/disputas");
  });

  test("un VERIFICADO sí ve intercambio e inventario, pero no subastas ni disputas", () => {
    const h = hrefs(PARTICULAR_VERIFICADO);
    expect(h).toContain("/suite/intercambio");
    expect(h).toContain("/suite/inventario");
    expect(h).not.toContain("/suite/subastas");
    expect(h).not.toContain("/suite/disputas");
  });

  test("un CERTIFICADO ve subastas y disputas (RF-17.2, RF-14.8)", () => {
    const h = hrefs(PARTICULAR_CERTIFICADO);
    expect(h).toContain("/suite/subastas");
    expect(h).toContain("/suite/disputas");
    expect(h).not.toContain("/suite/gobernanza");
  });

  test("la Empresa ve subastas aunque su estado no sea CERTIFICADO", () => {
    expect(hrefs({ tipo: "EMPRESA", estado: "VERIFICADO" })).toContain("/suite/subastas");
  });

  test("solo el Socio ve gobernanza (RF-14.8)", () => {
    expect(hrefs(SOCIO)).toContain("/suite/gobernanza");
    expect(hrefs(PARTICULAR_CERTIFICADO)).not.toContain("/suite/gobernanza");
  });

  test("Sistemas (/suite/admin) es SOLO del Owner on-chain, no del rol Socio", () => {
    expect(hrefs(OWNER)).toContain("/suite/admin");
    expect(hrefs(SOCIO)).not.toContain("/suite/admin");
    expect(hrefs(EMPRESA)).not.toContain("/suite/admin");
  });

  test("un Socio es tratado como Certificado aunque su estado venga sin certificar", () => {
    expect(hrefs({ tipo: "SOCIO", estado: "VERIFICADO" })).toContain("/suite/intercambio");
  });

  test("las secciones no exponen la función interna `visible`", () => {
    expect(seccionesPara(OWNER).every((s) => !("visible" in s))).toBe(true);
  });
});

describe("seccionesParaMovil", () => {
  test("respeta el máximo y conserva la sección central (Intercambio)", () => {
    const { visibles, mas } = seccionesParaMovil(PARTICULAR_CERTIFICADO, 5);
    expect(visibles.length).toBeLessThanOrEqual(5);
    const central = visibles.find((s) => s.central);
    expect(central?.href).toBe("/suite/intercambio");
    expect(mas.length).toBeGreaterThan(0);
  });

  test("lo que no cabe se agrupa en «Más» sin perder secciones", () => {
    const todas = seccionesPara(PARTICULAR_CERTIFICADO).length;
    const { visibles, mas } = seccionesParaMovil(PARTICULAR_CERTIFICADO, 5);
    expect(visibles.length + mas.length).toBe(todas);
  });

  test("sin sección central (INSCRITO) no inventa una", () => {
    const { visibles } = seccionesParaMovil(PARTICULAR_INSCRITO, 5);
    expect(visibles.some((s) => s.central)).toBe(false);
  });
});

describe("ETIQUETA_ESTADO", () => {
  test("etiqueta los tres estados de la escalera D28", () => {
    expect(ETIQUETA_ESTADO.INSCRITO).toBe("Inscrito");
    expect(ETIQUETA_ESTADO.VERIFICADO).toBe("Verificado");
    expect(ETIQUETA_ESTADO.CERTIFICADO).toBe("Certificado");
  });
});
