"use client";

// =============================================================================
// TrueKeate — BalanceDebug (panel de depuración de balances)
// Lee el estado REAL de la cadena con ethers: no usa datos del backend.
//   · Mi billetera: ETH, tokens de prueba (TKA/TKB) y credencial SBT.
//   · Contrato Escrow: su ETH, los tokens que custodia y su estado (owner,
//     NFT oficial vinculado, padrón de socios y truekes creados).
// El enunciado lo pedía como "panel de debug para ver balances y operaciones
// activas": aquí se muestra lo observable on-chain, con botón de refresco.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { useEthereum } from "@/lib/ethereum";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const ESCROW_ABI = [
  "function owner() view returns (address)",
  "function siguienteId() view returns (uint256)",
  "function trueKeateNft() view returns (address)",
  "function sociosRegistry() view returns (address)",
];

const SBT_ABI = ["function balanceOf(address) view returns (uint256)"];

const CERO = "0x0000000000000000000000000000000000000000";

function dir(v: string | undefined | null): string | null {
  if (!v || v.toLowerCase() === CERO) return null;
  return v;
}

interface Fila {
  etiqueta: string;
  valor: string;
  detalle?: string;
}

interface Datos {
  cuenta: Fila[];
  escrow: Fila[];
}

/** Lee un contrato sin romper el panel si el contrato o el método no existen. */
async function leer<T>(fn: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return porDefecto;
  }
}

export function BalanceDebug({ className }: { className?: string }) {
  const { provider, account } = useEthereum();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<string | null>(null);

  const escrowDir = dir(process.env.NEXT_PUBLIC_ESCROW);
  const tkaDir = dir(process.env.NEXT_PUBLIC_TOKEN_A);
  const tkbDir = dir(process.env.NEXT_PUBLIC_TOKEN_B);
  const sbtDir = dir(process.env.NEXT_PUBLIC_TRUEKE_SBT);

  const cargar = useCallback(async () => {
    if (!provider) return;
    setCargando(true);
    setError(null);
    try {
      const cuenta: Fila[] = [];
      const escrow: Fila[] = [];

      // --- Mi billetera -----------------------------------------------------
      if (account) {
        const eth = await leer(() => provider.getBalance(account), BigInt(0));
        cuenta.push({ etiqueta: "ETH", valor: `${formatEther(eth)} ETH` });

        const tokens: [string, string | null][] = [
          ["TKA", tkaDir],
          ["TKB", tkbDir],
        ];
        for (const [nombre, dirToken] of tokens) {
          if (!dirToken) continue;
          const c = new Contract(dirToken, ERC20_ABI, provider);
          const saldo = await leer(() => c.balanceOf(account) as Promise<bigint>, BigInt(0));
          cuenta.push({ etiqueta: nombre, valor: saldo.toString(), detalle: dirToken });
        }

        if (sbtDir) {
          const sbt = new Contract(sbtDir, SBT_ABI, provider);
          const tiene = await leer(() => sbt.balanceOf(account) as Promise<bigint>, BigInt(0));
          cuenta.push({
            etiqueta: "Credencial SBT",
            valor: tiene > BigInt(0) ? "certificado" : "sin certificar",
            detalle: sbtDir,
          });
        }
      }

      // --- Contrato Escrow --------------------------------------------------
      if (escrowDir) {
        const esc = new Contract(escrowDir, ESCROW_ABI, provider);
        const ethEscrow = await leer(() => provider.getBalance(escrowDir), BigInt(0));
        const owner = await leer(() => esc.owner() as Promise<string>, "");
        const siguienteId = await leer(() => esc.siguienteId() as Promise<bigint>, BigInt(0));
        const nft = await leer(() => esc.trueKeateNft() as Promise<string>, "");
        const registro = await leer(() => esc.sociosRegistry() as Promise<string>, "");

        escrow.push({ etiqueta: "ETH", valor: `${formatEther(ethEscrow)} ETH` });
        escrow.push({ etiqueta: "Owner", valor: owner || "—", detalle: owner ? undefined : "no responde" });
        escrow.push({ etiqueta: "Truekes creados", valor: siguienteId.toString() });
        escrow.push({
          etiqueta: "NFT oficial",
          valor: dir(nft) ? "vinculado" : "sin vincular",
          detalle: dir(nft) ?? undefined,
        });
        escrow.push({
          etiqueta: "Padrón de socios",
          valor: dir(registro) ? "vinculado" : "sin vincular",
          detalle: dir(registro) ?? undefined,
        });

        for (const [nombre, dirToken] of [["TKA", tkaDir], ["TKB", tkbDir]] as [string, string | null][]) {
          if (!dirToken) continue;
          const c = new Contract(dirToken, ERC20_ABI, provider);
          const saldo = await leer(() => c.balanceOf(escrowDir) as Promise<bigint>, BigInt(0));
          escrow.push({ etiqueta: `${nombre} en custodia`, valor: saldo.toString() });
        }
      }

      setDatos({ cuenta, escrow });
      setActualizado(new Date().toLocaleTimeString("es"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudieron leer los balances");
    } finally {
      setCargando(false);
    }
  }, [provider, account, escrowDir, tkaDir, tkbDir, sbtDir]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function Tabla({ titulo, filas, icono }: { titulo: string; filas: Fila[]; icono: string }) {
    return (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-navy-800/60">
          {icono} {titulo}
        </h3>
        {filas.length === 0 ? (
          <p className="mt-2 text-xs text-navy-800/50">Sin datos que mostrar todavía.</p>
        ) : (
          <ul className="mt-2 divide-y divide-navy-800/5">
            {filas.map((f) => (
              <li key={f.etiqueta} className="flex items-start justify-between gap-3 py-1.5">
                <span className="text-xs font-semibold text-navy-800/80">{f.etiqueta}</span>
                <span className="text-right">
                  <code className="block font-mono text-[11px] text-navy-800">{f.valor}</code>
                  {f.detalle && (
                    <code className="block font-mono text-[10px] text-navy-800/45">{f.detalle}</code>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">
          Balances on-chain (depuración)
        </h2>
        <Button
          variante="outline-navy"
          className="!px-3 !py-1.5 text-xs"
          onClick={() => void cargar()}
          disabled={cargando || !provider}
        >
          {cargando ? "Leyendo…" : "↻ Refrescar"}
        </Button>
      </div>

      {!provider && (
        <p className="mt-3 text-xs text-navy-800/60">
          Conecta la billetera para leer los balances.
        </p>
      )}

      {error && <p className="mt-3 text-xs text-crimson">{error}</p>}

      {datos && (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Tabla titulo="Mi billetera" icono="👤" filas={datos.cuenta} />
          <Tabla titulo="Contrato Escrow" icono="🔐" filas={datos.escrow} />
        </div>
      )}

      {actualizado && (
        <p className="mt-3 text-right text-[10px] text-navy-800/40">
          Actualizado a las {actualizado} · lectura directa de la cadena (sin backend)
        </p>
      )}
    </Card>
  );
}
