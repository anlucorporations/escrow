"use client";

// =============================================================================
// TrueKeate — Finanzas (/suite/finanzas)
// Saldos del usuario según su rol (RF-14.7/14.8, D5):
//   - NFTs en stock, criptos y BRLT (BRLT y fondo SOLO para Socio/Owner).
//   - Empresa gestiona sus saldos al participar en criptomonedas.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import { finanzasMi, type FinanzasMi } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

function formatearMoneda(n: number | undefined): string {
  if (n === undefined) return "—";
  return new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(n);
}

export default function PaginaFinanzas() {
  const { account } = useEthereum();
  const { acceso } = useSesion();
  const { token, autenticar, cargando, error: errorSesion } = useSesionAutenticada();

  const [fin, setFin] = useState<FinanzasMi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;
  const rol = inscrito?.tipo ?? fin?.rol ?? "PARTICULAR";
  const esSocio = rol === "SOCIO";
  const esEmpresa = rol === "EMPRESA";

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargandoDatos(true);
    setError(null);
    try {
      const f = await finanzasMi(token);
      setFin(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudieron cargar las finanzas");
    } finally {
      setCargandoDatos(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void cargar();
  }, [token, cargar]);

  const nfts = fin?.nftsStock && Object.keys(fin.nftsStock).length > 0 ? fin.nftsStock : null;
  const criptos = fin?.criptos && Object.keys(fin.criptos).length > 0 ? fin.criptos : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-800">💰 Finanzas</h1>
        <p className="text-sm text-navy-800/60">
          Tus saldos en la plataforma (RF-14.7) · rol: <strong>{rol}</strong>
          {account && (
            <span className="font-mono"> · {account.slice(0, 6)}…{account.slice(-4)}</span>
          )}
        </p>
      </div>

      {errorSesion && <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {errorSesion}</p>}
      {error && <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {error}</p>}

      {!token && (
        <Card className="p-6 text-center">
          <p className="text-2xl">🔏</p>
          <p className="mt-2 text-sm text-navy-800/70">
            Autentícate con tu billetera para ver tus finanzas.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => void autenticar()} disabled={cargando}>
              {cargando ? "Firmando…" : "🔏 Autenticar"}
            </Button>
          </div>
        </Card>
      )}

      {esEmpresa && (
        <p className="rounded-xl bg-teal-500/10 px-4 py-2 text-xs text-navy-800/70">
          Como <strong>Empresa</strong> gestionas tu saldo de NFTs/criptos al participar en
          intercambios de criptomonedas (RF-14.7).
        </p>
      )}

      {token && cargandoDatos && <p className="py-6 text-center text-sm text-navy-800/50">Cargando…</p>}

      {token && !cargandoDatos && fin && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* NFTs en stock */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">🖼️ NFTs en stock</h2>
            {nfts ? (
              <ul className="mt-2 space-y-1">
                {Object.entries(nfts).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-sm text-navy-800/80">
                    <span>{k}</span>
                    <span className="font-mono">{String(v)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-navy-800/50">Sin NFTs en stock.</p>
            )}
          </Card>

          {/* Criptos */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">🪙 Criptos</h2>
            {criptos ? (
              <ul className="mt-2 space-y-1">
                {Object.entries(criptos).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-sm text-navy-800/80">
                    <span>{k}</span>
                    <span className="font-mono">{String(v)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-navy-800/50">Sin criptos.</p>
            )}
          </Card>

          {/* BRLT */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">🪙 BRLT</h2>
            {esSocio && fin.brlt !== undefined ? (
              <p className="mt-2 font-display text-3xl font-bold text-navy-800">
                {formatearMoneda(fin.brlt)} <span className="text-sm font-semibold text-navy-800/50">BRLT</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-navy-800/50">
                El saldo BRLT solo es visible y gestionable para <strong>Socios y Owner</strong> (RF-14.8).
              </p>
            )}
          </Card>

          {/* Fondo de valor */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">🏦 Fondo de valor</h2>
            {esSocio && fin.fondoValor !== undefined ? (
              <div>
                <p className="mt-2 font-display text-3xl font-bold text-navy-800">
                  {formatearMoneda(fin.fondoValor)} <span className="text-sm font-semibold text-navy-800/50">BRLT</span>
                </p>
                {fin.porcentajesConfig && (
                  <p className="mt-1 text-xs text-navy-800/50">
                    Config: {fin.porcentajesConfig.trueque}% trueques · {fin.porcentajesConfig.suscripciones}%
                    suscripciones · {fin.porcentajesConfig.brlt}% emisión (D7)
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-navy-800/50">
                El fondo de valor (gastos de mantenimiento y gas) es visible para{" "}
                <strong>Socios y Owner</strong> (RF-14.8, D7).
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
