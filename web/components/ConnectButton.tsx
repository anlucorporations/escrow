"use client";

// =============================================================================
// TrueKeate — ConnectButton: conectar la billetera + login único
// (el enunciado lo pedía como components/ConnectButton.tsx)
//
// Flujo (decisión del director, 2026-09-13): al pulsar el botón se abre un
// POPUP con TODAS las billeteras detectadas en el navegador (MetaMask, Rabby,
// Backpack, TrueKeate Wallet, … vía EIP-6963 + la legacy de window.ethereum).
// El usuario elige UNA; esa elección (1) conecta la cuenta, (2) consulta el
// estado de inscripción y (3) si está inscrito, pide la ÚNICA firma EIP-191 que
// emite el token de sesión global. Después NO queda ningún selector en la
// página: todas las secciones y firmas usan la billetera conectada, sin tocar
// `window.ethereum` (cero interferencia con las demás wallets).
//
// Avisos al usuario: si cancela en la wallet (código 4001) se le informa, y si
// la wallet está en otra red se ofrece cambiarla.
// =============================================================================
import { useEffect, useState } from "react";
import { useEthereum, type WalletAnunciada } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { Button } from "@/components/Button";

/** Popup de selección de billetera: lista las detectadas en el navegador. */
function ModalBilleteras({
  wallets,
  ocupado,
  onElegir,
  onCerrar,
}: {
  wallets: WalletAnunciada[];
  ocupado: boolean;
  onElegir: (rdns: string) => void;
  onCerrar: () => void;
}) {
  // Cerrar con Escape (accesibilidad del modal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div
      role="presentation"
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-elegir-billetera"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-card border border-navy-800/10 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="titulo-elegir-billetera"
            className="font-display text-lg font-bold text-navy-800"
          >
            Elige tu billetera
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onCerrar}
            className="rounded-lg px-2 py-0.5 text-navy-800/50 transition-colors hover:bg-smoke hover:text-navy-800"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-navy-800/60">
          Billeteras detectadas en tu navegador. La que elijas se usará para
          iniciar sesión y firmar tus acciones; las demás no se tocan.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {wallets.map((w) => (
            <li key={w.rdns}>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => onElegir(w.rdns)}
                className="flex w-full items-center gap-3 rounded-xl border border-navy-800/10 px-3 py-2 text-left text-sm text-navy-800 transition-colors hover:border-teal-500 hover:bg-smoke disabled:opacity-60"
              >
                {w.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.icon} alt="" width={24} height={24} className="h-6 w-6 rounded" />
                ) : (
                  <span aria-hidden className="text-lg">
                    👛
                  </span>
                )}
                <span className="font-medium">{w.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {ocupado && (
          <p className="mt-3 text-center text-xs text-navy-800/60">Conectando…</p>
        )}
      </div>
    </div>
  );
}

export function ConnectButton({ className }: { className?: string }) {
  const { conectar, conectando, aviso, cambiarDeRed, redEsperada, wallets, elegirWallet } =
    useEthereum();
  const { autenticar, autenticando, refrescar } = useSesion();
  const [ocupado, setOcupado] = useState(false);
  const [cambiandoRed, setCambiandoRed] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargando = conectando || autenticando || ocupado;

  /** Conecta con la billetera elegida (rdns) y encadena el login único.
   *  `rdns=null` = camino directo cuando no hay ninguna billetera que elegir. */
  async function conectarCon(rdns: string | null) {
    setOcupado(true);
    setModalAbierto(false);
    try {
      if (rdns) elegirWallet(rdns);
      const cuenta = await conectar();
      if (!cuenta) return;
      // refrescar(wallet) consulta con la wallet EXPLÍCITA recién conectada.
      const estado = await refrescar(cuenta.toLowerCase());
      // Si la wallet ya está inscrita, se firma una vez (login único). Se le
      // pasa la cuenta recién conectada para que firme ESA (no la del render).
      if (estado.fase === "inscrito") await autenticar(cuenta);
    } finally {
      setOcupado(false);
    }
  }

  function onClick() {
    // Sin billeteras detectadas se intenta el camino directo (móvil / sin
    // extensión), que muestra el aviso correspondiente si no hay ninguna.
    if (wallets.length === 0) {
      void conectarCon(null);
      return;
    }
    setModalAbierto(true);
  }

  async function onCambiarRed() {
    setCambiandoRed(true);
    try {
      await cambiarDeRed();
    } finally {
      setCambiandoRed(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={onClick} disabled={cargando} className={className}>
        {cargando ? "Conectando…" : "🔗 Conectar billetera e iniciar sesión"}
      </Button>

      {aviso === "rechazado" && (
        <p role="alert" className="max-w-xs text-center text-sm text-crimson">
          Cancelaste la conexión en tu billetera. Puedes intentarlo de nuevo cuando quieras.
        </p>
      )}

      {aviso === "red_incorrecta" && (
        <div role="alert" className="flex max-w-xs flex-col items-center gap-2 text-center">
          <p className="text-sm text-coral">
            Tu billetera está en otra red. TrueKeate opera en la red {redEsperada}.
          </p>
          <Button variante="outline-navy" onClick={() => void onCambiarRed()} disabled={cambiandoRed}>
            {cambiandoRed ? "Cambiando…" : `Cambiar a la red ${redEsperada}`}
          </Button>
        </div>
      )}

      {modalAbierto && (
        <ModalBilleteras
          wallets={wallets}
          ocupado={cargando}
          onElegir={(rdns) => void conectarCon(rdns)}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
