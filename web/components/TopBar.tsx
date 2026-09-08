"use client";

// =============================================================================
// TrueKeate — Barra superior ÚNICA de la suite (PC ≥lg) / compacta (móvil)
// Ajuste del director (2026-09):
//   1. En PC se UNIFICAN la barra de secciones (antes TopNavPc) y el menú de
//      usuario en una sola barra: [marca] · [secciones por rol] · [usuario].
//   2. El menú de usuario muestra el USERNAME (@handle) en lugar de la
//      dirección de la wallet (la dirección completa queda en Mi Perfil).
// Móvil (<lg): marca + escudo + botón de usuario; la navegación inferior la
// cubre BottomNav (RF-14 / PROPUESTA_NAVEGACION_PC_MOVIL).
// =============================================================================
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { seccionesPara } from "@/lib/navegacion";
import { Button } from "@/components/Button";
import { EscudoEstado } from "@/components/EscudoEstado";
import { BotonConectarLogin } from "@/components/BotonConectarLogin";

const ETIQUETA_ESTADO: Record<string, string> = {
  INSCRITO: "Inscrito",
  VERIFICADO: "Verificado",
  CERTIFICADO: "Certificado",
};

function walletCorta(account: string) {
  return `${account.slice(0, 6)}…${account.slice(-4)}`;
}

export function TopBar() {
  const pathname = usePathname() ?? "";
  const { account, conectado, desconectar } = useEthereum();
  const { acceso, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic fuera
  useEffect(() => {
    function alClicFuera(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, []);

  const noInscrito = conectado && acceso.fase === "conectadoNoInscrito";
  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;

  // Nombre visible en el menú: USERNAME cuando existe (ajuste del director);
  // si aún no hay usuario (no inscrito) o falta el handle, se muestra la wallet.
  const nombreVisible = inscrito?.username
    ? `@${inscrito.username}`
    : account
      ? walletCorta(account)
      : "";

  // Secciones permitidas (PC) según tipo/nivel/estado (matriz única navegacion.ts)
  const secciones = seccionesPara({
    tipo: inscrito?.tipo,
    nivel: inscrito?.nivel,
    estado: inscrito?.estado,
  });
  const seccionActiva = (href: string) =>
    href === "/suite/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <header className="bg-navy-900 px-4 py-2 text-white shadow">
      {/* Fila única: marca | secciones (PC) | usuario */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        {/* Marca: icono TrueKeate_logo + TrueKeate_titulo (ajuste del director) */}
        <Link
          href="/suite/dashboard"
          className="flex shrink-0 items-center gap-2"
          aria-label="Inicio de la suite — TrueKeate"
        >
          {/* TrueKeate_logo.svg + TrueKeate_titulo.svg son monocromos negros →
              se invierten a blanco sobre la barra navy (marca = logo + titulo) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/TrueKeate_logo.svg"
            alt=""
            aria-hidden
            className="h-7 w-auto brightness-0 invert"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/TrueKeate_titulo.svg"
            alt="TrueKeate"
            className="hidden h-[18px] w-auto brightness-0 invert sm:block lg:h-[22px]"
          />
        </Link>

        {/* ---- Secciones de la suite: SOLO PC (≥lg) — unidas a la barra ---- */}
        <nav
          aria-label="Secciones de la suite"
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
        >
          {!conectado ? (
            <p className="truncate text-xs text-white/50">
              Conecta tu billetera e inicia sesión (una firma) para acceder a tus secciones.
            </p>
          ) : noInscrito ? (
            <>
              <Link
                href="/suite/mercado"
                className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-semibold ${
                  seccionActiva("/suite/mercado")
                    ? "bg-gold-500 text-navy-900"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                🛒 Mercado
              </Link>
              <span className="ml-2 truncate text-xs text-white/45">
                Wallet conectada sin inscribir — solo catálogo.
              </span>
            </>
          ) : (
            secciones.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                title={s.descripcion}
                className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors ${
                  seccionActiva(s.href)
                    ? "bg-gold-500 text-navy-900"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span aria-hidden className="mr-1">
                  {s.icono}
                </span>
                {s.label}
              </Link>
            ))
          )}
        </nav>

        {/* ---- Zona derecha: estado D28 + sesión/usuario ---- */}
        <div className="flex shrink-0 items-center gap-2">
          {!conectado ? (
            <>
              <span className="rounded-pill border border-white/20 px-2 py-0.5 text-[11px] text-white/60 lg:hidden">
                Sin billetera
              </span>
              <div className="hidden lg:block">
                <BotonConectarLogin className="!px-3 !py-1.5 !text-xs" />
              </div>
            </>
          ) : (
            <>
              {/* Escudo de estado D28 → acceso rápido a Verificar/Certificar */}
              <EscudoEstado />
              <div className="relative" ref={menuRef}>
                {/* Botón del menú de usuario: muestra el USERNAME (ajuste del director) */}
                <button
                  onClick={() => setAbierto((v) => !v)}
                  aria-label="Menú de usuario"
                  className="flex items-center gap-2 rounded-pill border border-gold-500/60 px-2.5 py-1 text-[11px] font-semibold text-gold-300 transition-colors hover:bg-white/10"
                >
                  <span aria-hidden>👤</span>
                  <span className="hidden max-w-40 truncate sm:inline" title={nombreVisible}>
                    {nombreVisible}
                  </span>
                  <span
                    className={`rounded-pill px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      noInscrito ? "bg-crimson/90 text-white" : "bg-gold-500 text-navy-800"
                    }`}
                  >
                    {noInscrito ? "No inscrito" : inscrito ? ETIQUETA_ESTADO[inscrito.estado] ?? inscrito.estado : "…"}
                  </span>
                  <span aria-hidden className="text-[8px]">
                    {abierto ? "▲" : "▼"}
                  </span>
                </button>

                {/* Desplegable del menú de usuario */}
                {abierto && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-modal border border-navy-800/10 bg-white text-navy-800 shadow-xl">
                    <div className="border-b border-navy-800/10 bg-smoke px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-navy-800/50">
                        {inscrito ? "Usuario" : "Billetera"}
                      </p>
                      {/* USERNAME en lugar de la dirección (ajuste del director) */}
                      <p className="truncate text-base font-bold">{nombreVisible}</p>
                      {inscrito && (
                        <p className="mt-1 text-[11px] text-navy-800/60">
                          Estado: <strong>{ETIQUETA_ESTADO[inscrito.estado] ?? inscrito.estado}</strong> ·{" "}
                          {inscrito.nivel} · {inscrito.tipo}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 p-2">
                      {noInscrito && (
                        <div className="rounded-xl bg-crimson/5 px-3 py-2">
                          <p className="text-xs font-semibold text-crimson">
                            Aún no estás inscrito en TrueKeate.
                          </p>
                          <Link
                            href="/suite/inscripcion"
                            onClick={() => setAbierto(false)}
                            className="mt-2 inline-block"
                          >
                            <Button className="w-full text-center !px-3 !py-1.5 !text-xs">
                              📝 Completar inscripción
                            </Button>
                          </Link>
                          <p className="mt-1 text-[10px] text-navy-800/50">
                            Mientras tanto puedes ver el{" "}
                            <Link
                              href="/suite/mercado"
                              className="underline"
                              onClick={() => setAbierto(false)}
                            >
                              catálogo
                            </Link>
                            .
                          </p>
                        </div>
                      )}

                      <Link
                        href="/suite/perfil"
                        onClick={() => setAbierto(false)}
                        className="block rounded-pill px-3 py-2 text-sm hover:bg-smoke"
                      >
                        👤 Mi perfil
                      </Link>
                      <Link
                        href="/suite/gobernanza"
                        onClick={() => setAbierto(false)}
                        className="block rounded-pill px-3 py-2 text-sm hover:bg-smoke"
                      >
                        🏛️ Gobernanza / Socios
                      </Link>
                      <Link
                        href="/help/manual"
                        onClick={() => setAbierto(false)}
                        className="block rounded-pill px-3 py-2 text-sm hover:bg-smoke"
                      >
                        📖 Ayuda / Manuales
                      </Link>

                      <button
                        onClick={() => {
                          desconectar();
                          cerrarSesion();
                          setAbierto(false);
                        }}
                        className="block w-full rounded-pill px-3 py-2 text-left text-sm text-crimson hover:bg-crimson/5"
                      >
                        ⏻ Desconectar billetera
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
