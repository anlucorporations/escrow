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
import { misTruekes, ofertasMercado, obtenerCatalogo, crearOfertaTrueke, type Trueke, type ArticuloCatalogo } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";

type EstadoD28 = "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
const pasosD28: EstadoD28[] = ["INSCRITO", "VERIFICADO", "CERTIFICADO"];

const CATEGORIAS = [
  { valor: "ARTICULO", icono: "📦", nombre: "Artículo" },
  { valor: "SERVICIO", icono: "🛠️", nombre: "Servicio" },
  { valor: "BIEN", icono: "🏠", nombre: "Bien" },
  { valor: "CRIPTO", icono: "🪙", nombre: "Cripto" },
];

/** Alta de trueke ofertado desde Mi Trueke Central (lógica maestra punto 2). */
function PublicarOferta() {
  const { token } = useSesionAutenticada();
  const { account } = useEthereum();
  const { firmarAccion } = useSesion();
  const [misArticulos, setMisArticulos] = useState<ArticuloCatalogo[]>([]);
  const [articuloAId, setArticuloAId] = useState("");
  const [descripcionRequerida, setDescripcionRequerida] = useState("");
  const [tipoRequerido, setTipoRequerido] = useState("ARTICULO");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!account) return;
    obtenerCatalogo()
      .then((todos) =>
        setMisArticulos(
          todos.filter((a) => (a.usuarioWallet ?? "").toLowerCase() === account.toLowerCase() && a.disponible !== false)
        )
      )
      .catch(() => setMisArticulos([]));
  }, [account]);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !articuloAId || !descripcionRequerida.trim()) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const firma = await firmarAccion("publicar oferta de trueque");
      if (!firma) throw new Error("Firma requerida: desbloquea tu billetera.");
      await crearOfertaTrueke(token, {
        articuloAId: Number(articuloAId),
        descripcionRequerida: descripcionRequerida.trim(),
        tipoRequerido,
      }, firma);
      setMensaje({ tipo: "ok", texto: "Trueke publicado en el Mercado. Espera a que alguien lo acuerde." });
      setArticuloAId("");
      setDescripcionRequerida("");
      setAbierto(false);
    } catch (e) {
      setMensaje({ tipo: "err", texto: e instanceof Error ? e.message : "no se pudo publicar" });
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <Button className="mt-3 w-full !py-2 !text-sm" onClick={() => setAbierto(true)}>
        ➕ Publicar trueke en el Mercado
      </Button>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

  return (
    <form onSubmit={(e) => void publicar(e)} className="mt-3 space-y-3 rounded-xl border border-navy-800/10 bg-smoke/60 p-3">
      <p className="text-xs font-semibold text-navy-800">Publicar un trueke (oferta abierta)</p>
      <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
        Lo que ofreces (de tu inventario)
        <select className={inputCls} value={articuloAId} onChange={(e) => setArticuloAId(e.target.value)}>
          <option value="">Elige un ítem publicado…</option>
          {misArticulos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.titulo} · {a.categoria ?? "ARTICULO"}
            </option>
          ))}
        </select>
      </label>
      {misArticulos.length === 0 && (
        <p className="text-[11px] text-navy-800/60">
          📦 Publica primero un ítem desde <Link className="font-semibold underline" href="/suite/inventario">Mi Inventario</Link>.
        </p>
      )}
      <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
        Qué quieres recibir (descripción)
        <textarea
          className={inputCls}
          rows={2}
          value={descripcionRequerida}
          onChange={(e) => setDescripcionRequerida(e.target.value)}
          placeholder="Ej: busco un servicio de clases de cocina…"
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
        Tipo de ítem que quieres recibir
        <select className={inputCls} value={tipoRequerido} onChange={(e) => setTipoRequerido(e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.icono} {c.nombre}
            </option>
          ))}
        </select>
      </label>
      {mensaje && (
        <p className={`rounded-xl px-3 py-2 text-xs ${mensaje.tipo === "ok" ? "bg-teal-500/10 text-teal-700" : "bg-crimson/10 text-crimson"}`}>
          {mensaje.texto}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando || misArticulos.length === 0} className="flex-1 !py-2 !text-sm">
          {enviando ? "Publicando…" : "🚀 Publicar en el Mercado"}
        </Button>
        <Button variante="outline-navy" className="!py-2 !text-sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

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

  return (
    <Link href="/suite/intercambio" className="block">
      <Card className="h-full p-5 transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-navy-800">Mis truekes</h3>
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
        <p className="mt-3 text-xs text-navy-800/60">
          {!cargado
            ? "Cargando tus trueques…"
            : ofertados.length > 0
              ? `${ofertados.length} oferta${ofertados.length === 1 ? "" : "s"} en el Mercado esperando acuerdo.`
              : activos.length > 0
                ? `${activos.length} trueque${activos.length === 1 ? "" : "s"} activo${activos.length === 1 ? "" : "s"} en Intercambio.`
                : "Publica un trueke en el Mercado y sigue los activos aquí."}
        </p>
      </Card>
    </Link>
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
          <h3 className="font-semibold text-navy-800">Mis truekes</h3>
          <p className="mt-1 text-sm text-navy-800/70">
            {idx >= 1 ? "Crea y completa trueques (máx. 3 activos — RF-14.4)." : "Requiere estado Verificado."}
          </p>
          {idx >= 1 && (
            <>
              <MisTruekesResumen />
              <PublicarOferta />
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
