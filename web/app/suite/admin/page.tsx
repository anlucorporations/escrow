"use client";

// =============================================================================
// TrueKeate — Panel del Owner (/suite/admin, RF-13.1)
// Dashboard operativo REAL: usuarios, contratos, KPIs de disputas, estado de la
// BD off-chain e infraestructura (relayer/indexador). Requiere sesión del Owner
// (tipo SOCIO): se firma el mensaje EIP-191 con la wallet para obtener el token.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import {
  iniciarSesion,
  adminContratos,
  adminDb,
  adminKpis,
  adminInfra,
  type AdminContratos,
  type AdminDb,
  type AdminKpis,
  type AdminInfra,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

function TarjetaKpi({ icono, label, valor, tono }: { icono: string; label: string; valor: string | number; tono: string }) {
  return (
    <div className={`rounded-xl border p-4 ${tono}`}>
      <p className="text-2xl">{icono}</p>
      <p className="mt-1 font-display text-2xl font-bold text-navy-800">{valor}</p>
      <p className="text-xs text-navy-800/60">{label}</p>
    </div>
  );
}

export default function PaginaAdmin() {
  const { account, signer, conectado, conectar, conectando } = useEthereum();
  const { acceso } = useSesion();

  const [token, setToken] = useState<string | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [contratos, setContratos] = useState<AdminContratos["contratos"] | null>(null);
  const [db, setDb] = useState<AdminDb | null>(null);
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [infra, setInfra] = useState<AdminInfra | null>(null);

  const esOwner =
    acceso.fase === "inscrito" && acceso.usuario.tipo === "SOCIO";

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [c, d, k, i] = await Promise.all([
        adminContratos(token),
        adminDb(token),
        adminKpis(token),
        adminInfra(token),
      ]);
      setContratos(c.contratos);
      setDb(d);
      setKpis(k);
      setInfra(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error al cargar el panel");
    } finally {
      setCargando(false);
    }
  }, [token]);

  // Autentica al Owner (firma EIP-191) y carga el panel.
  const autenticar = useCallback(async () => {
    if (!signer) {
      setError("Desbloquea tu billetera para firmar (RF-16).");
      return;
    }
    setFirmando(true);
    setError(null);
    try {
      const firma = await signer.signMessage("TrueKeate: iniciar sesión");
      const sesion = await iniciarSesion(firma);
      setToken(sesion.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fallo de autenticación");
    } finally {
      setFirmando(false);
    }
  }, [signer]);

  useEffect(() => {
    if (token) void cargar();
  }, [token, cargar]);

  const activo = contratos && db && kpis && infra;

  if (!conectado) {
    return (
      <Card className="p-8 text-center">
        <p className="text-3xl">🛠️</p>
        <h1 className="mt-2 font-display text-xl font-bold text-navy-800">Panel del Owner</h1>
        <p className="mt-1 text-sm text-navy-800/60">Conecta la billetera del Owner para continuar.</p>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => void conectar()} disabled={conectando}>
            {conectando ? "Conectando…" : "Conectar MetaMask"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">🛠️ Panel del Owner</h1>
          <p className="text-sm text-navy-800/60">
            Dashboard operativo (RF-13.1) · wallet{" "}
            <span className="font-mono">
              {account?.slice(0, 6)}…{account?.slice(-4)}
            </span>
          </p>
        </div>
        {!token ? (
          <Button onClick={() => void autenticar()} disabled={firmando || !signer}>
            {firmando ? "Firmando…" : !signer ? "Desbloquea tu wallet para firmar" : "🔏 Autenticar como Owner"}
          </Button>
        ) : (
          <Button variante="outline-navy" onClick={() => void cargar()} disabled={cargando}>
            {cargando ? "Cargando…" : "↻ Refrescar"}
          </Button>
        )}
      </div>

      {token && !esOwner && (
        <p className="rounded-xl bg-crimson/10 px-4 py-2 text-sm text-crimson">
          Tu usuario no tiene rol Owner/Socio: el backend rechazará las consultas.
        </p>
      )}
      {error && <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {error}</p>}

      {!token && (
        <Card className="p-6 text-center">
          <p className="text-sm text-navy-800/70">
            Para ver los datos operativos debes <strong>autenticarte con la wallet del Owner</strong>:
            se firmará el mensaje <em>“TrueKeate: iniciar sesión”</em> (EIP-191) y se emitirá un token de
            sesión.
          </p>
        </Card>
      )}

      {activo && (
        <>
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaKpi icono="👥" label="Usuarios inscritos" valor={db.usuarios} tono="border-teal-500/30 bg-teal-500/5" />
            <TarjetaKpi icono="📦" label="Artículos publicados" valor={db.articulos} tono="border-cyan-400/30 bg-cyan-400/5" />
            <TarjetaKpi icono="⇄" label="Truekes (espejo)" valor={kpis.totalTruekes} tono="border-navy-800/10 bg-smoke" />
            <TarjetaKpi icono="⚖️" label="Disputas abiertas" valor={kpis.disputasAbiertas} tono="border-coral/40 bg-coral/10" />
          </div>

          {/* BD */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">Base de datos off-chain</h2>
            <p className="mt-1 text-xs text-navy-800/50">
              PostgreSQL (Cloud SQL) · espejo impulsado por eventos (RNF-01.1).
            </p>
            <p className="mt-2 text-sm text-navy-800/80">
              {db.usuarios} usuarios · {db.articulos} artículos · {db.truekes} trueques en el espejo.
            </p>
          </Card>

          {/* Contratos */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">Contratos desplegados</h2>
            <ul className="mt-2 divide-y divide-navy-800/5">
              {Object.entries(contratos ?? {})
                .filter(
                  ([, v]) => v?.direccion && v.direccion !== "0x0000000000000000000000000000000000000000"
                )
                .map(([nombre, v]) => (
                  <li key={nombre} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-sm font-semibold text-navy-800">{nombre}</span>
                    <code className="rounded bg-smoke px-2 py-0.5 font-mono text-[11px] text-navy-800/70">
                      {v.direccion}
                    </code>
                  </li>
                ))}
            </ul>
          </Card>

          {/* Infraestructura */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">
              Infraestructura (relayer / indexador)
            </h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-smoke p-3">
                <p className="text-xs font-semibold text-navy-800">🤖 Relayer EIP-712</p>
                {infra.relayer ? (
                  <div className="mt-1 space-y-0.5 text-xs text-navy-800/70">
                    <p>
                      Estado:{" "}
                      <span className={infra.relayer.ok ? "font-semibold text-teal-500" : "font-semibold text-crimson"}>
                        {infra.relayer.ok ? "OK" : "caído"}
                      </span>
                    </p>
                    <p>Wallet: {infra.relayer.wallet?.slice(0, 10)}…</p>
                    {infra.relayer.saldoBajo !== undefined && (
                      <p className={infra.relayer.saldoBajo ? "text-coral" : ""}>
                        Saldo bajo: {infra.relayer.saldoBajo ? "SÍ (recargar)" : "no"}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-navy-800/50">No configurado en este despliegue.</p>
                )}
              </div>
              <div className="rounded-xl bg-smoke p-3">
                <p className="text-xs font-semibold text-navy-800">👁️ Indexador</p>
                {infra.indexador ? (
                  <div className="mt-1 space-y-0.5 text-xs text-navy-800/70">
                    <p>Cabeza: bloque {infra.indexador.cabeza ?? "—"}</p>
                    <p>Procesados: {infra.indexador.procesados ?? 0} · Fallidos: {infra.indexador.fallidos ?? 0}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-navy-800/50">No configurado en este despliegue.</p>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
