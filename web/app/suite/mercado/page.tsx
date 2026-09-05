"use client";

// =============================================================================
// TrueKeate — Mercado de trueques (/suite/mercado)
// Lógica maestra del director (RepoTecnico/logica_trueke.md):
//   - El Mercado alberga los TRUEKES OFERTADOS (estado PROPUESTO) de todos los tipos.
//   - Tipos = pares oferta/requerido de 4 categorías (Artículo/Servicio/Bien/Cripto),
//     diferenciados visualmente con icono y color (decisión del director).
//   - Cada ficha abre un modal de detalle (artículo ofrecido + oferente con nivel) con
//     el botón "Acordar intercambio" (solo VERIFICADO/CERTIFICADO — RF-14.4).
// Accesible con la billetera conectada aunque no esté inscrita (RF-14.3): observar.
// =============================================================================
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import {
  ofertasMercado,
  acordarOferta,
  obtenerCatalogo,
  type Trueke,
  type ArticuloCatalogo,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";

// ---------------------------------------------------------------------------
// Tipos de trueque (lógica maestra punto 4): 4 categorías + combinaciones.
// ---------------------------------------------------------------------------
const CATEGORIAS: Record<string, { icono: string; color: string; nombre: string }> = {
  ARTICULO: { icono: "📦", color: "bg-teal-500/15 text-teal-700", nombre: "Artículo" },
  SERVICIO: { icono: "🛠️", color: "bg-sky-500/15 text-sky-700", nombre: "Servicio" },
  BIEN: { icono: "🏠", color: "bg-amber-500/15 text-amber-700", nombre: "Bien" },
  CRIPTO: { icono: "🪙", color: "bg-violet-500/15 text-violet-700", nombre: "Cripto" },
};

const ICONO_RUBRO: Record<string, string> = {
  Electronica: "📱",
  Deportes: "⚽",
  Educacion: "📚",
  Vehiculos: "🚗",
  Hogar: "🏠",
  Moda: "👕",
  Servicios: "🛠️",
  Arte: "🎨",
  Otros: "📦",
};

function TipoBadge({ categoria, tipoRequerido }: { categoria?: string | null; tipoRequerido?: string | null }) {
  const c = CATEGORIAS[categoria ?? "ARTICULO"] ?? CATEGORIAS.ARTICULO;
  const r = CATEGORIAS[tipoRequerido ?? ""];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase ${c.color}`}>
        {c.icono} {c.nombre}
      </span>
      {r && (
        <span className="rounded-pill bg-navy-800/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-navy-800/60">
          ↔ busca {r.icono} {r.nombre}
        </span>
      )}
    </span>
  );
}

function corta(w: string | null | undefined): string {
  if (!w) return "";
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

/** Busca la categoría del artículo A (lo que ofrece A) en el catálogo cargado. */
function categoriaDeArticulo(articulos: ArticuloCatalogo[], id: number | null): string | null {
  if (!id) return null;
  return articulos.find((a) => a.id === id)?.categoria ?? null;
}

export default function PaginaMercado() {
  const { account } = useEthereum();
  const { acceso, token } = useSesion();
  const [ofertas, setOfertas] = useState<Trueke[]>([]);
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Trueke | null>(null);
  const [miArticulo, setMiArticulo] = useState("");
  const [acordando, setAcordando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([ofertasMercado(), obtenerCatalogo()])
      .then(([o, c]) => {
        if (!vivo) return;
        setOfertas(o.truekes);
        setArticulos(c);
      })
      .catch((e) => {
        if (vivo) setError(e instanceof Error ? e.message : "no se pudo cargar el mercado");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const inscrito = acceso.fase === "inscrito";
  const estadoUsuario = acceso.fase === "inscrito" ? acceso.usuario.estado : null;
  const puedeAcordar = ["VERIFICADO", "CERTIFICADO", "SOCIO", "EMPRESA"].includes(estadoUsuario ?? "");
  const misArticulosPublicados = useMemo(
    () =>
      articulos.filter(
        (a) => account && (a.usuarioWallet ?? "").toLowerCase() === account.toLowerCase() && a.disponible !== false
      ),
    [articulos, account]
  );
  // mis ofertas activas (para el cupo de 3 del Verificado)
  const misOfertasActivas = useMemo(
    () => ofertas.filter((t) => t.usuarioA.toLowerCase() === (account ?? "").toLowerCase()).length,
    [ofertas, account]
  );
  const limiteAlcanzado = estadoUsuario === "VERIFICADO" && misOfertasActivas >= 3;

  async function acordar(t: Trueke) {
    if (!token || !miArticulo) return;
    setAcordando(true);
    setMensaje(null);
    try {
      const r = await acordarOferta(token, t.id, Number(miArticulo));
      setMensaje({ tipo: "ok", texto: "Intercambio acordado. Pasa a tu sección Intercambio como Activo." });
      setSeleccion(null);
      setMiArticulo("");
      const o = await ofertasMercado();
      setOfertas(o.truekes);
      if (r.trueke) {
        // refresh de mis truekes no es necesario aquí; el dashboard/Intercambio lo recarga
      }
    } catch (e) {
      setMensaje({ tipo: "err", texto: e instanceof Error ? e.message : "no se pudo acordar" });
    } finally {
      setAcordando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">Mercado de trueques</h1>
          <p className="text-sm text-navy-800/60">
            Truekes ofertados por la comunidad: elige uno y acuerda el intercambio.
          </p>
        </div>
        {account && (
          <p className="font-mono text-[10px] text-navy-800/40">
            {account.slice(0, 6)}…{account.slice(-4)}
          </p>
        )}
      </div>

      {!inscrito && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3">
          <p className="text-xs text-navy-800/80">
            <strong>Modo observación:</strong> tu billetera no está inscrita; puedes ver las ofertas,
            pero para <em>acordar o publicar trueques</em> completa la inscripción.
          </p>
          <Link href="/suite/inscripcion">
            <Button className="!px-3 !py-1.5 !text-xs">📝 Inscribirme</Button>
          </Link>
        </div>
      )}

      {inscrito && !puedeAcordar && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3">
          <p className="text-xs text-navy-800/80">
            Para <strong>acordar intercambios</strong> necesitas el estado <em>Verificado</em> (códigos de
            correo y teléfono) — RF-14.4. Mientras tanto puedes observar las ofertas.
          </p>
          <Link href="/suite/verificacion">
            <Button className="!px-3 !py-1.5 !text-xs">🔐 Verificar</Button>
          </Link>
        </div>
      )}

      {cargando && <p className="py-10 text-center text-sm text-navy-800/50">Cargando mercado…</p>}
      {error && (
        <Card className="p-6 text-center">
          <p className="text-sm text-crimson">No se pudo cargar el mercado.</p>
          <p className="mt-1 text-xs text-navy-800/50">{error}</p>
        </Card>
      )}

      {!cargando && !error && ofertas.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-3xl">🫙</p>
          <h2 className="mt-2 font-display text-lg font-semibold text-navy-800">
            Aún no hay truekes ofertados
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-navy-800/60">
            Cuando los usuarios verificados publiquen sus ofertas (su NFT + lo que quieren recibir),
            aparecerán aquí.
          </p>
        </Card>
      )}

      {!cargando && ofertas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ofertas.map((t) => {
            const catA = categoriaDeArticulo(articulos, t.articuloAId) ?? "ARTICULO";
            const tipo = CATEGORIAS[catA] ?? CATEGORIAS.ARTICULO;
            return (
              <div
                key={t.id}
                className="cursor-pointer transition hover:opacity-95"
                onClick={() => { setSeleccion(t); setMensaje(null); setMiArticulo(""); }}
              >
                <Card className="flex h-full flex-col p-4 transition hover:shadow-md">
                <div className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${tipo.color}`}>
                    {tipo.icono}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-bold text-navy-800">
                      {t.tituloA || `Artículo #${t.articuloAId}`}
                    </h3>
                    <p className="line-clamp-2 text-xs text-navy-800/60">
                      {t.descripcionRequerida || "Sin descripción de lo que busca."}
                    </p>
                    <div className="mt-2">
                      <TipoBadge categoria={catA} tipoRequerido={t.tipoRequerido} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-navy-800/5 pt-2 text-right">
                  <span className="text-[10px] text-navy-800/40">
                    Ofrecido por {corta(t.usuarioA)}
                  </span>
                </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------- ficha de detalle (modal) */}
      {seleccion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSeleccion(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const catA = categoriaDeArticulo(articulos, seleccion.articuloAId) ?? "ARTICULO";
              const tipo = CATEGORIAS[catA] ?? CATEGORIAS.ARTICULO;
              return (
            <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${tipo.color}`}>
                  {tipo.icono}
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-navy-800">
                    {seleccion.tituloA || `Artículo #${seleccion.articuloAId}`}
                  </h2>
                  <StatusBadge estado="PROPUESTO" tono="gold" />
                </div>
              </div>
              <button className="rounded-lg p-1 text-navy-800/50 hover:bg-smoke" onClick={() => setSeleccion(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-navy-800/50">Qué ofrece (A)</p>
                <p className="text-navy-800">{seleccion.tituloA || `Artículo #${seleccion.articuloAId}`}</p>
                <div className="mt-1">
                  <TipoBadge categoria={catA} tipoRequerido={null} />
                </div>
              </div>
              <div className="rounded-xl bg-smoke p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-navy-800/50">Qué quiere recibir</p>
                <p className="mt-1 text-navy-800">{seleccion.descripcionRequerida || "Sin descripción."}</p>
                <div className="mt-2">
                  <TipoBadge categoria={seleccion.tipoRequerido} tipoRequerido={seleccion.tipoRequerido} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-navy-800/50">Oferente</p>
                <p className="font-mono text-xs text-navy-800/70">{corta(seleccion.usuarioA)}</p>
              </div>
            </div>
            </>
              );
            })()}

            {mensaje && (
              <p className={`mt-3 rounded-xl px-3 py-2 text-xs ${mensaje.tipo === "ok" ? "bg-teal-500/10 text-teal-700" : "bg-crimson/10 text-crimson"}`}>
                {mensaje.texto}
              </p>
            )}

            {puedeAcordar && (
              <div className="mt-4 space-y-3 border-t border-navy-800/10 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
                  Qué ofreces a cambio (elige de tu inventario publicado)
                  <select className="mt-1 w-full rounded-xl border border-navy-800/10 bg-white px-3 py-2 text-sm text-navy-800 outline-none focus:border-teal-500" value={miArticulo} onChange={(e) => setMiArticulo(e.target.value)}>
                    <option value="">Elige tu artículo…</option>
                    {misArticulosPublicados.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.titulo} {a.categoria ? `· ${CATEGORIAS[a.categoria]?.nombre ?? a.categoria}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {misArticulosPublicados.length === 0 && (
                  <p className="rounded-xl bg-gold-500/10 px-3 py-2 text-xs text-navy-800/80">
                    📦 Publica primero un artículo desde tu <Link className="font-semibold underline" href="/suite/inventario">Inventario</Link> para poder acordar.
                  </p>
                )}
                {limiteAlcanzado && (
                  <p className="rounded-xl bg-crimson/10 px-3 py-2 text-xs font-semibold text-crimson">
                    Máximo de 3 trueques activos alcanzado (RF-14.4).
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!miArticulo || acordando || limiteAlcanzado}
                    onClick={() => void acordar(seleccion)}
                  >
                    {acordando ? "Acordando…" : "🤝 Acordar intercambio"}
                  </Button>
                  <Button variante="outline-navy" onClick={() => setSeleccion(null)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            )}

            {!puedeAcordar && inscrito && (
              <div className="mt-4 border-t border-navy-800/10 pt-4">
                <Link href="/suite/verificacion" className="block">
                  <Button className="w-full">🔐 Verifica tu identidad para acordar trueques</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
