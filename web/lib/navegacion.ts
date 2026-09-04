// =============================================================================
// TrueKeate — Matriz única de navegación por Tipo de Usuario (RF-14)
// Fuente única de qué secciones ve cada usuario en PC (barra superior) y en
// móvil (barra inferior). Reglas: RF-14.3–14.8 + D14 (el nivel manda sobre el
// tipo) + D28 (escalera INSCRITO→VERIFICADO→CERTIFICADO).
// =============================================================================
import type { UsuarioPublico } from "./api";

export interface Seccion {
  href: string;
  label: string;
  icono: string;
  /** Si es true es el botón central hexagonal (solo móvil). */
  central?: boolean;
  descripcion?: string;
}

type Tipo = UsuarioPublico["tipo"];
type Estado = UsuarioPublico["estado"];

/** Contexto del usuario para decidir visibilidad. */
export interface ContextoNav {
  tipo?: Tipo;
  nivel?: UsuarioPublico["nivel"];
  estado?: Estado;
}

const ES_EMPRESA = (c: ContextoNav) => c.tipo === "EMPRESA";
const ES_SOCIO = (c: ContextoNav) => c.tipo === "SOCIO";
const ES_CERTIFICADO = (c: ContextoNav) => c.estado === "CERTIFICADO" || ES_SOCIO(c);
const ES_VERIFICADO = (c: ContextoNav) =>
  c.estado === "VERIFICADO" || c.estado === "CERTIFICADO" || ES_SOCIO(c) || ES_EMPRESA(c);

/** Definición declarativa: cada sección declara su regla de visibilidad. */
const SECCIONES: (Seccion & { visible: (c: ContextoNav) => boolean })[] = [
  {
    href: "/suite/dashboard",
    label: "Mi Trueke Central",
    icono: "🏠",
    descripcion: "Panel principal con la escalera D28 y accesos rápidos",
    visible: () => true, // guard ya exige wallet + inscripción
  },
  {
    href: "/suite/mercado",
    label: "Mercado",
    icono: "🛒",
    descripcion: "Catálogo de trueques ofrecidos (observable con wallet)",
    visible: () => true,
  },
  {
    href: "/suite/intercambio",
    label: "Intercambio",
    icono: "⇄",
    central: true,
    descripcion: "Crear y completar trueques (requiere Verificado/Certificado)",
    visible: ES_VERIFICADO,
  },
  {
    href: "/suite/inventario",
    label: "Inventario",
    icono: "💼",
    descripcion: "Tus artículos AtoA; gestión para Empresa (RF-14.7)",
    visible: (c) => ES_VERIFICADO(c) || ES_EMPRESA(c),
  },
  {
    href: "/suite/gobernanza",
    label: "Socios",
    icono: "🏛️",
    descripcion: "Votación y gobernanza (Socio/Owner, RF-14.8)",
    visible: ES_SOCIO,
  },
  {
    href: "/suite/disputas",
    label: "Disputas",
    icono: "⚖️",
    descripcion: "Trueques en disputa (Certificado ve; Socio resuelve, RF-14.8)",
    visible: (c) => ES_CERTIFICADO(c) || ES_SOCIO(c),
  },
  {
    href: "/suite/finanzas",
    label: "Finanzas",
    icono: "💰",
    descripcion: "Saldos propios (Empresa) y finanzas globales (Socio/Owner, RF-14.7/14.8)",
    visible: (c) => ES_EMPRESA(c) || ES_SOCIO(c),
  },
  {
    href: "/suite/admin",
    label: "Admin",
    icono: "🛠️",
    descripcion: "Panel del Owner (RF-13.1)",
    visible: ES_SOCIO,
  },
  {
    href: "/suite/perfil",
    label: "Perfil",
    icono: "👤",
    descripcion: "Tu perfil, reputación y @username",
    visible: () => true,
  },
];

/** Devuelve las secciones visibles para un contexto de usuario, en orden. */
export function seccionesPara(c: ContextoNav): Seccion[] {
  return SECCIONES.filter((s) => s.visible(c)).map(({ visible: _v, ...rest }) => rest);
}

/**
 * Devuelve hasta `max` secciones para la barra inferior móvil, garantizando la
 * sección central (Intercambio) cuando aplica; el excedente se agrupa en "Más".
 */
export function seccionesParaMovil(c: ContextoNav, max = 5): { visibles: Seccion[]; mas: Seccion[] } {
  const todas = seccionesPara(c);
  const central = todas.find((s) => s.central);
  const resto = todas.filter((s) => !s.central);

  // Preserva la central si existe y cabe; si no, entra en "resto".
  const caben = Math.max(1, max - (central ? 1 : 0));
  const primeras = resto.slice(0, caben);
  const mas = resto.slice(caben);
  const visibles = central ? [...primeras, central] : primeras;
  // Máximo total = max (primeras + central). Si sobran, van a "Más".
  const sobrantes = visibles.length > max ? visibles.slice(max - 1) : [];
  return {
    visibles: visibles.slice(0, max),
    mas: [...mas, ...sobrantes],
  };
}

/** Etiqueta legible del estado D28 (para TopBar/badges). */
export const ETIQUETA_ESTADO: Record<string, string> = {
  INSCRITO: "Inscrito",
  VERIFICADO: "Verificado",
  CERTIFICADO: "Certificado",
};
