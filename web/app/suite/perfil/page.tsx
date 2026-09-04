"use client";

// =============================================================================
// TrueKeate — Suite: Mi Perfil (RF-14 / CU-20)
// Muestra la identidad del usuario (wallet, tipo, nivel, estado D28), la
// escalera de verificación D28 con el peldaño actual, y su reputación
// D12/D30 (GET /reputacion/mi) una vez autenticado con firma EIP-191.
// =============================================================================
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import { miReputacion, type ReputacionMi } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge, type BadgeTono } from "@/components/StatusBadge";

type EstadoD28 = "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
const pasosD28: EstadoD28[] = ["INSCRITO", "VERIFICADO", "CERTIFICADO"];

// Tonos de StatusBadge por tipo de usuario, nivel D12 y medalla.
const tonoTipo: Record<string, BadgeTono> = {
  PARTICULAR: "navy",
  EMPRESA: "gold",
  SOCIO: "teal",
};
const tonoNivel: Record<string, BadgeTono> = {
  INICIADO: "navy",
  COMUN: "teal",
  FRECUENTE: "cyan",
  SOCIO: "gold",
};
const tonoMedalla: Record<string, BadgeTono> = {
  BRONCE: "navy",
  PLATA: "smoke",
  ORO: "gold",
};
const iconoMedalla: Record<string, string> = {
  BRONCE: "🥉",
  PLATA: "🥈",
  ORO: "🥇",
};
const inicialTipo: Record<string, string> = {
  PARTICULAR: "P",
  EMPRESA: "E",
  SOCIO: "S",
};

function cortarWallet(wallet: string): string {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

/** Fila etiqueta → valor dentro de un <dl>. */
function Fila({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy-800/45">
        {etiqueta}
      </dt>
      <dd className="text-right">{valor}</dd>
    </div>
  );
}

/** Etiqueta de métrica de reputación. */
function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl bg-smoke/70 px-3 py-3 text-center">
      <p className="font-display text-2xl font-bold text-navy-800">{valor}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-navy-800/50">
        {etiqueta}
      </p>
    </div>
  );
}

export default function PaginaPerfil() {
  const { account } = useEthereum();
  const { acceso } = useSesion();
  const { token, autenticar, cargando: autenticando, error: errorAuth } = useSesionAutenticada();

  // Reputación D12/D30 (solo se pide una vez autenticado).
  const [reputacion, setReputacion] = useState<ReputacionMi | null>(null);
  const [cargandoRep, setCargandoRep] = useState(false);
  const [errorRep, setErrorRep] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!token) {
      setReputacion(null);
      setErrorRep(null);
      return;
    }
    let vivo = true;
    setCargandoRep(true);
    setErrorRep(null);
    miReputacion(token)
      .then((r) => {
        if (vivo) setReputacion(r);
      })
      .catch((e) => {
        if (vivo)
          setErrorRep(
            e instanceof Error ? e.message : "no se pudo cargar tu reputación"
          );
      })
      .finally(() => {
        if (vivo) setCargandoRep(false);
      });
    return () => {
      vivo = false;
    };
  }, [token, intento]);

  const usuario = acceso.fase === "inscrito" ? acceso.usuario : null;
  const inscrito = usuario !== null;

  // Cabecera común (también para la wallet sin inscribir).
  const cabecera = (
    <section className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-800">👤 Mi Perfil</h1>
        {account ? (
          <div className="mt-0.5">
            <p className="font-mono text-sm text-navy-800/70">{cortarWallet(account)}</p>
            <p className="font-mono text-[10px] text-navy-800/35">{account}</p>
          </div>
        ) : (
          <p className="text-sm text-navy-800/60">Wallet no conectada</p>
        )}
      </div>
    </section>
  );

  // Wallet conectada pero sin inscripción formal (aviso defensivo, el guard
  // normalmente ya bloquea /suite/perfil).
  if (!inscrito || !account) {
    return (
      <div className="space-y-5">
        {cabecera}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-navy-800">
                Completa tu inscripción para ver tu perfil completo
              </p>
              <p className="mt-1 text-xs text-navy-800/60">
                Necesitamos tu correo, teléfono y consentimiento GDPR para darte
                acceso a tu perfil, escalera D28 y reputación (D12/D30).
              </p>
            </div>
            <Link href="/suite/inscripcion">
              <Button className="!px-4 !py-2 !text-xs">📝 Ir a inscripción</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Escalera D28: peldaño actual (real, desde el backend).
  const estado: EstadoD28 = usuario.estado as EstadoD28;
  const idx = pasosD28.indexOf(estado);
  const medalla = reputacion?.medalla;

  return (
    <div className="space-y-6">
      {cabecera}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Identidad */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-navy-800">Identidad</h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] font-display text-xl font-bold text-white">
              {inicialTipo[usuario.tipo] ?? "U"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold text-navy-800">
                @{cortarWallet(account)}
              </p>
              <p className="truncate font-mono text-[10px] text-navy-800/40">{account}</p>
            </div>
          </div>
          <dl className="mt-4 divide-y divide-navy-800/5 border-t border-navy-800/10 text-sm">
            <Fila
              etiqueta="Tipo de usuario"
              valor={
                <StatusBadge estado={usuario.tipo} tono={tonoTipo[usuario.tipo] ?? "smoke"}>
                  {usuario.tipo}
                </StatusBadge>
              }
            />
            <Fila
              etiqueta="Estado D28"
              valor={<StatusBadge estado={estado} />}
            />
            <Fila
              etiqueta="Nivel (D12)"
              valor={
                <StatusBadge estado={usuario.nivel} tono={tonoNivel[usuario.nivel] ?? "smoke"}>
                  Nivel {usuario.nivel}
                </StatusBadge>
              }
            />
            {medalla && (
              <Fila
                etiqueta="Medalla"
                valor={
                  <StatusBadge estado={medalla} tono={tonoMedalla[medalla] ?? "smoke"}>
                    {iconoMedalla[medalla] ?? ""} {medalla}
                  </StatusBadge>
                }
              />
            )}
          </dl>
        </Card>

        {/* Escalera de verificación D28 */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-navy-800">Escalera de verificación D28</h2>
          <ol className="mt-5 flex items-center gap-2">
            {pasosD28.map((p, i) => (
              <li key={p} className="flex flex-1 flex-col items-center gap-1 text-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-pill text-xs font-bold ${
                    i <= idx
                      ? "bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] text-white"
                      : "bg-navy-800/10 text-navy-800/40"
                  }`}
                >
                  {i < idx ? "✓" : i + 1}
                </span>
                <span className={`text-[10px] font-semibold ${i <= idx ? "text-navy-800" : "text-navy-800/40"}`}>
                  {p}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <StatusBadge estado={estado} />
            <span className="text-[11px] font-semibold text-navy-800/60">
              Peldaño {idx + 1} de {pasosD28.length}
            </span>
          </div>
          {idx === 0 && (
            <p className="mt-2 text-xs text-navy-800/60">
              Verifica tu correo y teléfono para comenzar a truequear (RF-01.5, D28).
            </p>
          )}
          {idx === 1 && (
            <p className="mt-2 text-xs text-navy-800/60">
              Certifica tu identidad (KYC) para desbloquear tu reputación completa (D12/D30).
            </p>
          )}
        </Card>
      </div>

      {/* Reputación D12/D30 */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-navy-800">Reputación (D12/D30)</h2>
        <p className="mt-1 text-sm text-navy-800/60">
          Puntaje de confianza 0–100 calculado con la fórmula oficial y recálculo
          mensual (D30). Requiere autenticación con firma de tu wallet.
        </p>

        {!token && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => void autenticar()} disabled={autenticando}>
                {autenticando ? "✍️ Firmando…" : "🔏 Autenticar para ver mi reputación"}
              </Button>
              <p className="max-w-sm text-xs text-navy-800/50">
                Se firmará el mensaje <em>“TrueKeate: iniciar sesión”</em> (EIP-191)
                para emitir un token de acceso.
              </p>
            </div>
            {errorAuth && (
              <p className="mt-3 text-xs text-crimson">⚠️ {errorAuth}</p>
            )}
          </>
        )}

        {token && cargandoRep && (
          <p className="mt-4 animate-pulse text-sm text-navy-800/50">
            Calculando tu reputación (D12/D30)…
          </p>
        )}

        {token && !cargandoRep && errorRep && (
          <div className="mt-4 rounded-xl border border-crimson/30 bg-crimson/5 px-4 py-3">
            <p className="text-sm text-crimson">No se pudo cargar tu reputación.</p>
            <p className="mt-1 text-xs text-navy-800/50">{errorRep}</p>
            <Button
              variante="outline-navy"
              className="mt-3 !px-3 !py-1.5 !text-xs"
              onClick={() => setIntento((i) => i + 1)}
            >
              ↻ Reintentar
            </Button>
          </div>
        )}

        {token && !cargandoRep && !errorRep && reputacion && (
          <div className="mt-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navy-800/45">
                  Puntaje
                </p>
                <p className="font-display text-5xl font-bold text-navy-800">
                  {reputacion.puntaje}
                  <span className="ml-1 text-lg font-semibold text-navy-800/40">/100</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <StatusBadge
                  estado={reputacion.nivel}
                  tono={tonoNivel[reputacion.nivel] ?? "navy"}
                >
                  Nivel {reputacion.nivel}
                </StatusBadge>
                {reputacion.medalla && (
                  <StatusBadge
                    estado={reputacion.medalla}
                    tono={tonoMedalla[reputacion.medalla] ?? "gold"}
                  >
                    {iconoMedalla[reputacion.medalla] ?? ""} {reputacion.medalla}
                  </StatusBadge>
                )}
                <StatusBadge
                  estado={reputacion.oroHistorico ? "Oro histórico" : "Sin oro histórico"}
                  tono={reputacion.oroHistorico ? "gold" : "smoke"}
                >
                  {reputacion.oroHistorico ? "🏅 Oro histórico" : "Oro histórico: No"}
                </StatusBadge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Metrica etiqueta="Trueques efectivos" valor={String(reputacion.metricas.efectivos)} />
              <Metrica etiqueta="Apelaciones" valor={String(reputacion.metricas.apelaciones)} />
              <Metrica
                etiqueta="Reputación media"
                valor={`${reputacion.metricas.reputacionMedia.toLocaleString("es-AR", {
                  maximumFractionDigits: 2,
                })} / 5`}
              />
            </div>

            <p className="mt-4 rounded-xl bg-smoke/70 px-3 py-2 text-xs text-navy-800/60">
              <span className="font-bold uppercase tracking-[0.06em] text-navy-800/70">
                Fórmula (D12/D30):
              </span>{" "}
              {reputacion.formula}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
