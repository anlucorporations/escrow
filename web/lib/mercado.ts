// =============================================================================
// TrueKeate — Filtros del Mercado (mejora "filtros y búsqueda")
// Lógica pura de búsqueda sobre las ofertas de trueque publicadas, para que la
// pantalla del Mercado permita buscar por texto y filtrar por categoría sin
// recargar ni pedir de nuevo al backend.
// =============================================================================
import type { ArticuloCatalogo, Trueke } from "./api";

export const CATEGORIAS_FILTRO = ["ARTICULO", "SERVICIO", "BIEN", "CRIPTO"] as const;
export type CategoriaFiltro = (typeof CATEGORIAS_FILTRO)[number] | "TODAS";

/** Normaliza para comparar: minúsculas y sin acentos (buscar "camara" halla "cámara"). */
export function normalizar(texto: unknown): string {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export interface FiltroMercado {
  /** Texto libre: se busca en el título ofrecido, lo que se pide y el rubro. */
  q?: string;
  categoria?: CategoriaFiltro;
}

/** Categoría del artículo ofrecido por la parte A. */
export function categoriaDeOferta(articulos: ArticuloCatalogo[], id: number | null): string | null {
  if (!id) return null;
  return articulos.find((a) => a.id === id)?.categoria ?? null;
}

/**
 * Aplica la búsqueda y el filtro de categoría a las ofertas del Mercado.
 * Sin filtros devuelve la lista intacta (mismo orden).
 */
export function filtrarOfertas(
  ofertas: Trueke[],
  articulos: ArticuloCatalogo[],
  filtro: FiltroMercado = {}
): Trueke[] {
  const q = normalizar(filtro.q);
  const categoria = filtro.categoria && filtro.categoria !== "TODAS" ? filtro.categoria : null;
  if (!q && !categoria) return ofertas;

  return ofertas.filter((t) => {
    if (categoria) {
      const cat = categoriaDeOferta(articulos, t.articuloAId);
      if (cat !== categoria) return false;
    }
    if (!q) return true;
    const art = articulos.find((a) => a.id === t.articuloAId);
    const heno = normalizar(
      [t.tituloA, t.descripcionRequerida, t.tipoRequerido, art?.rubro, art?.titulo, art?.descripcion]
        .filter(Boolean)
        .join(" ")
    );
    return heno.includes(q);
  });
}
