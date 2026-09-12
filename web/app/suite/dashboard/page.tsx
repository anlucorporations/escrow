"use client";

// =============================================================================
// TrueKeate — Suite: Dashboard "Mi Trueke Central" (RF-14.2)
// Muestra el estado del usuario según la escalera D28 (real, desde el backend)
// y los módulos a los que tiene acceso según tipo/nivel (RF-14.3–14.8).
// Tarjeta "Mis Truekes" (lógica maestra punto 7): trueques Ofertados (en el
// Mercado, PROPUESTO) y Cerrados (COMPLETADO) del usuario.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import { misTruekes, ofertasMercado, type Trueke } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateOperation } from "@/components/CreateOperation";
import { OperationsList } from "@/components/OperationsList";

type EstadoD28 = "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
const pasosD28: EstadoD28[] = ["INSCRITO", "VERIFICADO", "CERTIFICADO"];


/** Mini-resumen de truekes del usuario (punto 7): Ofertados y Cerrados. */
function MisTruekesResumen() {
  const { token } = useSesionAutenticada();
  const { account } = useEthereum();
  const { firmarAccion } = useSesion();
  const [misTruekesLista, setMisTruekesLista] = useState<Trueke[]>([]);
  const [ofertas, setOfertas] = useState<Trueke[]>([]);
  const [cargado, setCargado] = useState(false);

  const cargar = useCallback(async () => {
    if (!token || !account) return;
    try {
      const [m, o] = await Promise.all([misTruekes(token), ofertasMercado()]);
      setMisTruekesLista(m.truekes ?? []);
      setOfertas(o.truekes ?? []);
    } catch {
      /* el módulo sigue visible aunque falle la carga */
    } finally {
      setCargado(true);
    }
  }, [token, account]);

  useEffect(() => {
    if (token && account && !cargado) void cargar();
  }, [token, account, cargado, cargar]);

  const mios = misTruekesLista.filter(
    (t) => (t.usuarioA ?? "").toLowerCase() === (account ?? "").toLowerCase()
  );
  const ofertados = ofertas.filter(
    (t) => t.estado === "PROPUESTO" && (t.usuarioA ?? "").toLowerCase() === (account ?? "").toLowerCase()
  );
  const activos = mios.filter((t) =>
    ["CREADO", "ACTIVO", "CUSTODIADO", "APERTURA"].includes(t.estado)
  );
  const cerrados = mios.filter((t) => t.estado === "COMPLETADO");

  // Sin tarjeta ni título propios: el módulo del dashboard ya los aporta.
  return (
    <>
      <div className="mt-2">
        <StatusBadge estado={activos.length > 0 ? "Activo" : "Sin activos"} tono={activos.length > 0 ? "teal" : "gold"} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gold-500/10 px-2 py-2">
          <p className="font-display text-xl font-bold text-gold-600">{ofertados.length}</p>
          <p className="text-[10px] font-semibold uppercase text-navy-800/60">Ofertados</p>
        </div>
        <div className="rounded-xl bg-teal-500/10 px-2 py-2">
          <p className="font-display text-xl font-bold text-teal-600">{activos.length}</p>
          <p className="text-[10px] font-semibold uppercase text-navy-800/60">Activos</p>
        </div>
        <div className="rounded-xl bg-navy-800/5 px-2 py-2">
          <p className="font-display text-xl font-bold text-navy-800">{cerrados.length}</p>
          <p className="text-[10px] font-semibold uppercase text-navy-800/60">Cerrados</p>
        </div>
      </div>
      <div className="mt-3">
        <OperationsList
          truekes={[...ofertados, ...activos, ...cerrados]}
          onRefrescar={cargar}
          intervaloMs={5000}
          limite={4}
          cargando={!cargado}
          vacio="Publica un trueke en el Mercado y sigue aquí tus operaciones."
        />
      </div>
    </>
  );
}

export default function Dashboard() {
  const { account, conectado, conectar, conectando } = useEthereum();
  const { acceso } = useSesion();

  // Estado real de la escalera D28 (el guard ya garantiza que está inscrito).
  const estado: EstadoD28 =
    acceso.fase === "inscrito" ? (acceso.usuario.estado as EstadoD28) : "INSCRITO";
  const idx = pasosD28.indexOf(estado);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">Mi Trueke Central</h1>
          <p className="text-sm text-navy-800/60">
            {conectado && account
              ? `Wallet: ${account.slice(0, 6)}…${account.slice(-4)}`
              : "Wallet no conectada"}
          </p>
        </div>
        {!conectado && (
          <Button onClick={() => void conectar()} disabled={conectando}>
            {conectando ? "Conectando…" : "Conectar MetaMask"}
          </Button>
        )}
      </section>

      {/* Escalera de verificación D28 (CU-01/02) */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-navy-800">Escalera de verificación</h2>
        <ol className="mt-4 flex items-center gap-2">
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
        <div className="mt-4 flex items-center gap-2">
          <StatusBadge estado={estado} />
          {idx === 0 && (
            <p className="text-xs text-navy-800/60">
              Verifica tu correo y teléfono para comenzar a truequear (RF-01.5, D28).
            </p>
          )}
        </div>
      </Card>

      {/* Módulos por estado (RF-14.3–14.5) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/suite/mercado" className="block">
          <Card className="h-full p-5">
            <h3 className="font-semibold text-navy-800">Explorar ofertas</h3>
            <p className="mt-1 text-sm text-navy-800/70">
              Catálogo de artículos AtoA disponibles para intercambio.
            </p>
            <StatusBadge estado="Activo" tono="teal" />
          </Card>
        </Link>
        <Card className={`p-5 ${idx >= 1 ? "" : "opacity-50"}`}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-navy-800">Mis truekes</h3>
            {idx >= 1 && (
              <Link href="/suite/intercambio" className="text-[11px] font-semibold text-teal-600 underline">
                Ver todos →
              </Link>
            )}
          </div>
          <p className="mt-1 text-sm text-navy-800/70">
            {idx >= 1 ? "Crea y completa trueques (máx. 3 activos — RF-14.4)." : "Requiere estado Verificado."}
          </p>
          {idx >= 1 && (
            <>
              <MisTruekesResumen />
              <CreateOperation />
            </>
          )}
        </Card>
        <Card className={`p-5 ${idx >= 2 ? "" : "opacity-50"}`}>
          <h3 className="font-semibold text-navy-800">Reputación</h3>
          <p className="mt-1 text-sm text-navy-800/70">
            {idx >= 2 ? "Tus 5 dimensiones de valoración y tu nivel/medalla." : "Disponible al certificar tu identidad (KYC)."}
          </p>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-navy-800">Punto de encuentro</h3>
          <p className="mt-1 text-sm text-navy-800/70">Acuerda el sitio de entrega (≤ 10 km) con mapa y ruta móvil.</p>
        </Card>
      </div>
    </div>
  );
}
