"use client";

// =============================================================================
// TrueKeate — Instalar la wallet nativa (M7 · RF-WN-26/27)
// Muestra un botón en la navegación que:
//   - DETECTA si la extensión está instalada (anuncio EIP-6963 io.codecrypto.wallet).
//   - Si no está, abre un popup con la descarga del paquete desempaquetado y los
//     pasos de instalación.
// La descarga la sirve la propia plataforma desde /wallet/TrueKeateWallet.zip.
// =============================================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { useEthereum } from "@/lib/ethereum";
import { Button } from "@/components/Button";

/** rdns EIP-6963 de la wallet de la plataforma. */
const RDNS_WALLET = "io.codecrypto.wallet";
const URL_DESCARGA = "/wallet/TrueKeateWallet.zip";

type Variante = "gold-accent" | "outline-navy" | "pill-primary";

export function InstalarWallet({
  variante = "outline-navy",
  className,
}: {
  variante?: Variante;
  className?: string;
}) {
  const { wallets } = useEthereum();
  const instalada = wallets.some((w) => w.rdns === RDNS_WALLET);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  return (
    <>
      <Button variante={variante} className={className} onClick={() => setAbierto(true)}>
        {instalada ? "✅ Wallet nativa instalada" : "🧩 Instalar wallet nativa"}
      </Button>

      {abierto && (
        <div
          role="presentation"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/70 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-instalar-wallet"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-card border border-navy-800/10 bg-white p-5 text-navy-800 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="titulo-instalar-wallet" className="font-display text-lg font-bold">
                Wallet nativa de TrueKeate
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setAbierto(false)}
                className="rounded-lg px-2 py-0.5 text-navy-800/50 hover:bg-smoke hover:text-navy-800"
              >
                ✕
              </button>
            </div>

            {instalada ? (
              <>
                <p className="mt-2 text-sm text-teal-600">
                  ✅ La extensión <strong>TrueKeate Wallet</strong> está instalada en este
                  navegador.
                </p>
                <p className="mt-2 text-xs text-navy-800/60">
                  Ya puedes elegirla como billetera al conectar en la plataforma. Si acabas de
                  instalarla, recarga esta página.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-navy-800/70">
                  Es la wallet propia de la plataforma: te permite conectar, firmar y operar sin
                  depender de terceros.
                </p>

                <a href={URL_DESCARGA} download>
                  <Button variante="pill-primary" className="mt-4 w-full">
                    ⬇️ Descargar wallet (.zip)
                  </Button>
                </a>

                <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-navy-800/70">
                  <li>Descarga y descomprime el archivo .zip.</li>
                  <li>
                    Abre <code>chrome://extensions</code> y activa el{" "}
                    <strong>Modo de desarrollador</strong>.
                  </li>
                  <li>
                    Pulsa <strong>Cargar descomprimida</strong> y elige la carpeta descomprimida.
                  </li>
                  <li>Recarga la plataforma y elige la wallet al conectar.</li>
                </ol>
                <p className="mt-3 text-[11px] text-navy-800/50">
                  La publicación en Chrome Web Store está prevista; por ahora la instalación es
                  local (paquete desempaquetado).
                </p>
              </>
            )}

            <p className="mt-4 text-center text-xs">
              <Link
                href="/instalar-wallet"
                className="text-teal-600 underline hover:text-navy-800"
                onClick={() => setAbierto(false)}
              >
                Ver la guía completa de instalación
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
