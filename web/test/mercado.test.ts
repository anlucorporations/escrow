// =============================================================================
// Filtros del Mercado (mejora "filtros y búsqueda")
// =============================================================================
import { describe, expect, test } from "vitest";
import { CATEGORIAS_FILTRO, filtrarOfertas, normalizar } from "../lib/mercado";
import type { ArticuloCatalogo, Trueke } from "../lib/api";

const articulos = [
  { id: 1, titulo: "Cámara Canon", rubro: "Fotografía", categoria: "ARTICULO" },
  { id: 2, titulo: "Clases de guitarra", rubro: "Música", categoria: "SERVICIO" },
  { id: 3, titulo: "100 USDT", rubro: "Cripto", categoria: "CRIPTO" },
] as unknown as ArticuloCatalogo[];

const ofertas = [
  { id: 10, articuloAId: 1, tituloA: "Cámara Canon", descripcionRequerida: "Busco una bicicleta", tipoRequerido: "BIEN" },
  { id: 11, articuloAId: 2, tituloA: "Clases de guitarra", descripcionRequerida: "Busco amplificador", tipoRequerido: "ARTICULO" },
  { id: 12, articuloAId: 3, tituloA: "100 USDT", descripcionRequerida: "Busco laptop", tipoRequerido: "ARTICULO" },
] as unknown as Trueke[];

describe("normalizar", () => {
  test("ignora mayúsculas y acentos", () => {
    expect(normalizar("Cámara")).toBe("camara");
    expect(normalizar("GUITARRA")).toBe("guitarra");
  });

  test("tolera null y undefined sin romper", () => {
    expect(normalizar(null)).toBe("");
    expect(normalizar(undefined)).toBe("");
  });
});

describe("filtrarOfertas", () => {
  test("sin filtros devuelve la misma lista y en el mismo orden", () => {
    const r = filtrarOfertas(ofertas, articulos);
    expect(r).toHaveLength(3);
    expect(r[0].id).toBe(10);
  });

  test("busca por título aunque el usuario escriba sin acentos", () => {
    const r = filtrarOfertas(ofertas, articulos, { q: "camara" });
    expect(r.map((t) => t.id)).toEqual([10]);
  });

  test("busca también en lo que se pide (descripción requerida)", () => {
    const r = filtrarOfertas(ofertas, articulos, { q: "amplificador" });
    expect(r.map((t) => t.id)).toEqual([11]);
  });

  test("busca en el rubro del artículo del catálogo", () => {
    const r = filtrarOfertas(ofertas, articulos, { q: "musica" });
    expect(r.map((t) => t.id)).toEqual([11]);
  });

  test("filtra por categoría del artículo ofrecido", () => {
    expect(filtrarOfertas(ofertas, articulos, { categoria: "CRIPTO" }).map((t) => t.id)).toEqual([12]);
    expect(filtrarOfertas(ofertas, articulos, { categoria: "SERVICIO" }).map((t) => t.id)).toEqual([11]);
  });

  test("«TODAS» equivale a no filtrar por categoría", () => {
    expect(filtrarOfertas(ofertas, articulos, { categoria: "TODAS" })).toHaveLength(3);
  });

  test("combina texto y categoría", () => {
    expect(filtrarOfertas(ofertas, articulos, { q: "busco", categoria: "CRIPTO" }).map((t) => t.id)).toEqual([12]);
    expect(filtrarOfertas(ofertas, articulos, { q: "bicicleta", categoria: "CRIPTO" })).toHaveLength(0);
  });

  test("una búsqueda sin coincidencias devuelve vacío, no todo", () => {
    expect(filtrarOfertas(ofertas, articulos, { q: "zzzz" })).toHaveLength(0);
  });

  test("las cuatro categorías de la lógica maestra están disponibles como filtro", () => {
    expect([...CATEGORIAS_FILTRO]).toEqual(["ARTICULO", "SERVICIO", "BIEN", "CRIPTO"]);
  });
});
