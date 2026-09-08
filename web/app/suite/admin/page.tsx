"use client";

// =============================================================================
// TrueKeate — Suite 'Sistemas': Panel del Owner (/suite/admin, RF-13.1)
// Dashboard operativo REAL: usuarios, contratos, KPIs de disputas, estado de la
// BD off-chain e infraestructura (relayer/indexador) + BIBLIOTECA DE SISTEMAS
// (manuales técnicos de operación en PDF, solo Owner). Requiere sesión del
// Owner (tipo SOCIO): se firma el mensaje EIP-191 con la wallet para obtener el
// token.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import {
  adminContratos,
  adminDb,
  adminKpis,
  adminInfra,
  type AdminContratos,
  type AdminDb,
  type AdminKpis,
  type AdminInfra,
} from "@/lib/api";
import {
  topicosSistemas,
  pdfTecnico,
  imagenTecnica,
  type ManualTecnico,
  type TopicoSistemas,
} from "@/lib/sistemas-data";
import { Card } from "@/components/Card";
import { KycPendientesOwner } from "@/components/KycPendientesOwner";
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

/** Tarjeta de un manual técnico de la Biblioteca de Sistemas. */
function TarjetaManualSistemas({ manual }: { manual: ManualTecnico }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-navy-800/5 bg-white p-2.5">
      {manual.imagen ? (
        // eslint-disable-next-line @next/next/no-img-element -- SVG estático de los manuales técnicos
        <img
          src={imagenTecnica(manual)}
          alt={`Infografía: ${manual.titulo}`}
          loading="lazy"
          className="h-11 w-11 shrink-0 rounded-lg border border-navy-800/10 bg-smoke p-1"
        />
      ) : (
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-navy-800/10 bg-smoke text-xl">
          📄
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-navy-800">{manual.titulo}</p>
        <p className="line-clamp-2 text-[11px] leading-snug text-navy-800/60">{manual.descripcion}</p>
      </div>
      <a
        href={pdfTecnico(manual)}
        download
        title={`Descargar ${manual.titulo} (PDF)`}
        className="inline-flex shrink-0 items-center rounded-pill bg-navy-800 px-3 py-1.5 text-xs font-bold text-white transition-transform hover:bg-teal-500 active:scale-95"
      >
        PDF
      </a>
    </li>
  );
}

/** Bloque de un tópico técnico (grid de manuales) de la Biblioteca de Sistemas. */
function TopicoSistemasBloque({ topico }: { topico: TopicoSistemas }) {
  return (
    <div className="rounded-xl border border-navy-800/10 bg-smoke p-4">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-gold-600">
        {topico.carpeta}
      </p>
      <h3 className="mt-0.5 font-display text-[15px] font-bold text-navy-800">{topico.etiqueta}</h3>
      <p className="mt-1 text-xs leading-relaxed text-navy-800/60">{topico.descripcion}</p>
      <ul className="mt-3 space-y-2">
        {topico.manuales.map((m) => (
          <TarjetaManualSistemas key={m.id} manual={m} />
        ))}
      </ul>
    </div>
  );
}

/** 📚 Biblioteca de Sistemas: manuales técnicos de operación en PDF (solo Owner). */
function BibliotecaSistemas() {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold text-navy-800">📚 Biblioteca de Sistemas</h2>
        <span className="rounded-pill bg-gold-600/10 px-2 py-0.5 text-[11px] font-semibold text-gold-600">
          solo Owner
        </span>
      </div>
      <p className="mt-1 text-xs text-navy-800/60">
        Manuales técnicos de operación en PDF con sus imágenes: descarga el que necesites según el
        tópico (Implementación, Despliegue, Wallets y la propia Suite Sistemas).
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {topicosSistemas.map((t) => (
          <TopicoSistemasBloque key={t.carpeta} topico={t} />
        ))}
      </div>
    </Card>
  );
}

export default function PaginaAdmin() {
  const { account, conectado, conectar, conectando } = useEthereum();
  const { acceso, token } = useSesion();

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

  useEffect(() => {
    if (token) void cargar();
  }, [token, cargar]);

  const activo = contratos && db && kpis && infra;

  if (!conectado) {
    return (
      <Card className="p-8 text-center">
        <h1 className="font-display text-xl font-bold text-navy-800">🛠️ Sistemas · Panel del Owner</h1>
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
          <h1 className="font-display text-2xl font-bold text-navy-800">🛠️ Sistemas · Panel del Owner</h1>
          <p className="text-sm text-navy-800/60">
            Suite Sistemas · Dashboard operativo (RF-13.1) · wallet{" "}
            <span className="font-mono">
              {account?.slice(0, 6)}…{account?.slice(-4)}
            </span>
          </p>
        </div>
        <Button variante="outline-navy" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? "Cargando…" : "↻ Refrescar"}
        </Button>
      </div>

      {token && !esOwner && (
        <p className="rounded-xl bg-crimson/10 px-4 py-2 text-sm text-crimson">
          Tu usuario no tiene rol Owner/Socio: el backend rechazará las consultas.
        </p>
      )}
      {error && <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {error}</p>}

      {/* 📚 Biblioteca de Sistemas (solo Owner) — estática, no depende de la API */}
      {esOwner ? <BibliotecaSistemas /> : null}

      {activo && (
        <>
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaKpi icono="👥" label="Usuarios inscritos" valor={db.usuarios} tono="border-teal-500/30 bg-teal-500/5" />
            <TarjetaKpi icono="📦" label="Artículos publicados" valor={db.articulos} tono="border-cyan-400/30 bg-cyan-400/5" />
            <TarjetaKpi icono="⇄" label="Truekes (espejo)" valor={kpis.totalTruekes} tono="border-navy-800/10 bg-smoke" />
            <TarjetaKpi icono="⚖️" label="Disputas abiertas" valor={kpis.disputasAbiertas} tono="border-coral/40 bg-coral/10" />
          </div>

          {/* KYC pendientes: revisión humana del Owner (RF-18.4) */}
          {token ? <KycPendientesOwner token={token} /> : null}

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
