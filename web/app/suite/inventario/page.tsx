"use client";

// =============================================================================
// TrueKeate — Mi Inventario (/suite/inventario)
// El usuario (Verificado/Certificado) publica sus artículos AtoA y gestiona su
// catálogo (despublicar). Los artículos se persisten en el backend (RF-04/D14).
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import { obtenerCatalogo, publicarArticulo, despublicarArticulo, type ArticuloCatalogo } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";

const RUBROS = ["Electronica", "Deportes", "Educacion", "Vehiculos", "Hogar", "Moda", "Servicios", "Arte", "Otros"];

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

export default function PaginaInventario() {
  const { account } = useEthereum();
  const { acceso } = useSesion();
  const { token, autenticar, cargando, error: errorSesion } = useSesionAutenticada();

  const [mios, setMios] = useState<ArticuloCatalogo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [rubro, setRubro] = useState(RUBROS[0]);
  const [descripcion, setDescripcion] = useState("");
  const [publicando, setPublicando] = useState(false);

  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;
  const puedePublicar = inscrito && (inscrito.estado === "VERIFICADO" || inscrito.estado === "CERTIFICADO");

  const cargar = useCallback(async () => {
    setCargandoLista(true);
    setError(null);
    try {
      const todos = await obtenerCatalogo();
      setMios(todos.filter((a) => (a.usuarioWallet ?? "").toLowerCase() === (account ?? "").toLowerCase()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudo cargar el inventario");
    } finally {
      setCargandoLista(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) void cargar();
  }, [account, cargar]);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPublicando(true);
    setError(null);
    try {
      await publicarArticulo(token, { titulo, rubro, descripcion: descripcion || undefined });
      setTitulo("");
      setDescripcion("");
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error al publicar");
    } finally {
      setPublicando(false);
    }
  }

  async function despublicar(id: number) {
    if (!token) return;
    setError(null);
    try {
      await despublicarArticulo(token, id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error al despublicar");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-800">💼 Mi Inventario</h1>
        <p className="text-sm text-navy-800/60">
          Tus artículos AtoA publicados en el mercado (RF-04). Publicar requiere estado
          Verificado o Certificado (RF-14.4).
        </p>
      </div>

      {errorSesion && <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {errorSesion}</p>}
      {error && <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">⚠️ {error}</p>}

      {!token && (
        <Card className="p-6 text-center">
          <p className="text-2xl">🔏</p>
          <p className="mt-2 text-sm text-navy-800/70">
            Autentícate con tu billetera (firma EIP-191) para gestionar tu inventario.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => void autenticar()} disabled={cargando}>
              {cargando ? "Firmando…" : "🔏 Autenticar"}
            </Button>
          </div>
        </Card>
      )}

      {token && !puedePublicar && inscrito && (
        <p className="rounded-xl bg-gold-500/15 px-4 py-3 text-sm text-navy-800/80">
          Tu estado es <strong>{inscrito.estado}</strong>. Para <strong>publicar artículos</strong>{" "}
          necesitas estar <strong>Verificado</strong> (códigos de correo y teléfono) o{" "}
          <strong>Certificado</strong> (KYC). Puedes ver el catálogo desde Mercado.
        </p>
      )}

      {token && puedePublicar && (
        <Card className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">
            Publicar artículo AtoA
          </h2>
          <form onSubmit={publicar} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="titulo" className="mb-1 block text-xs font-semibold text-navy-800/60">
                  Título *
                </label>
                <input
                  id="titulo"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Bicicleta de montaña"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="rubro" className="mb-1 block text-xs font-semibold text-navy-800/60">
                  Rubro *
                </label>
                <select id="rubro" value={rubro} onChange={(e) => setRubro(e.target.value)} className={inputCls}>
                  {RUBROS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="descripcion" className="mb-1 block text-xs font-semibold text-navy-800/60">
                Descripción
              </label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                placeholder="Estado, detalles, qué buscas a cambio…"
                className={inputCls}
              />
            </div>
            <Button type="submit" disabled={publicando}>
              {publicando ? "Publicando…" : "📦 Publicar artículo"}
            </Button>
          </form>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">
          Mis artículos ({mios.length})
        </h2>
        {cargandoLista && <p className="py-6 text-center text-sm text-navy-800/50">Cargando…</p>}
        {!cargandoLista && mios.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-3xl">🫙</p>
            <p className="mt-2 text-sm text-navy-800/60">
              Aún no has publicado artículos. Publica uno arriba (requiere Verificado).
            </p>
          </Card>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {mios.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-smoke text-lg">
                  📦
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-bold text-navy-800">{a.titulo}</h3>
                  <p className="text-xs text-navy-800/50">{a.rubro}</p>
                </div>
                <StatusBadge estado={a.disponible === false ? "Retirado" : "Activo"} tono={a.disponible === false ? "crimson" : "teal"} />
              </div>
              {a.descripcion && <p className="mt-2 line-clamp-2 text-xs text-navy-800/60">{a.descripcion}</p>}
              {token && a.disponible !== false && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => void despublicar(Number(a.id))}
                    className="rounded-pill border border-crimson/40 px-3 py-1 text-xs font-semibold text-crimson hover:bg-crimson/5"
                  >
                    Retirar del mercado
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
