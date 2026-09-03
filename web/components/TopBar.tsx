"use client";

// =============================================================================
// TrueKeate — Barra superior de la suite (menú de usuario)
// Muestra la wallet conectada, el estado real de la escalera D28 (o "No
// inscrito") y un botón de inscripción en el menú de usuario cuando la wallet
// no está inscrita (decisión del director).
// =============================================================================
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { Button } from "@/components/Button";

const ETIQUETA_ESTADO: Record<string, string> = {
  INSCRITO: "Inscrito",
  VERIFICADO: "Verificado",
  CERTIFICADO: "Certificado",
};

function walletCorta(account: string) {
  return `${account.slice(0, 6)}…${account.slice(-4)}`;
}

export function TopBar() {
  const { account, conectado, desconectar } = useEthereum();
  const { acceso } = useSesion();
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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-2 text-white shadow">
      <Link href="/suite/dashboard" className="flex items-center gap-2" aria-label="Inicio de la suite">
        <span className="text-xl">⇄</span>
        <span className="font-display font-bold">TrueKeat☑</span>
      </Link>

      {!conectado ? (
        <span className="rounded-pill border border-white/20 px-2 py-0.5 text-[11px] text-white/60">
          Sin billetera
        </span>
      ) : (
        <div className="relative" ref={menuRef}>
          {/* Botón del menú de usuario */}
          <button
            onClick={() => setAbierto((v) => !v)}
            aria-label="Menú de usuario"
            className="flex items-center gap-2 rounded-pill border border-gold-500/60 px-2.5 py-1 text-[11px] font-semibold text-gold-300 transition-colors hover:bg-white/10"
          >
            <span aria-hidden>👤</span>
            <span className="hidden sm:inline">{account ? walletCorta(account) : ""}</span>
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
                <p className="text-[10px] uppercase tracking-wide text-navy-800/50">Billetera</p>
                <p className="font-mono text-xs font-semibold break-all">{account}</p>
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
                      <Link href="/suite/mercado" className="underline" onClick={() => setAbierto(false)}>
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
      )}
    </header>
  );
}
