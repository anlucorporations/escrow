"use client";

// =============================================================================
// TrueKeate — Suite: Intercambio (/suite/intercambio, RF-14.4 / D28)
// El usuario crea trueques (trueke AtoA) y ve/avanza sus trueques activos:
//   - Crear exige VERIFICADO/CERTIFICADO (D14) y ≤3 trueques activos (RF-14.4).
//   - Cada trueque donde soy parte A o B se avanza: custodiar mi lado (CU-12),
//     firmar recepción (CU-14) y valoración 1–5 en 5 dimensiones (D18/D36).
// Solo usa lib/api.ts + lib/useSesionAutenticada.ts; el backend ya lo soporta.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  crearTrueke,
  custodiarTrueke,
  firmarRecepcion,
  misTruekes,
  obtenerCatalogo,
  valorarTrueke,
  type ArticuloCatalogo,
  type Trueke,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";

/** Estados que cuentan como trueque "activo" (RF-14.4, mismo criterio del backend). */
const ESTADOS_ACTIVOS = ["CREADO", "ACTIVO", "CUSTODIADO", "APERTURA"];
/** Estados en los que se ofrece valorar 1–5 (D18/D36). */
const ESTADOS_VALORABLES = ["CUSTODIADO", "APERTURA"];
const MAX_ACTIVOS_VERIFICADO = 3;

const DIMENSIONES = [
  { clave: "aceptacion", label: "Aceptación" },
  { clave: "honestidad", label: "Honestidad" },
  { clave: "seguridad", label: "Seguridad" },
  { clave: "confiabilidad", label: "Confiabilidad" },
  { clave: "compromiso", label: "Compromiso" },
] as const;

/** El catálogo puede llegar con `usuarioWallet` (pg) o `wallet` (memoria). */
interface ArticuloUi extends ArticuloCatalogo {
  wallet?: string;
}

const CLASE_CAMPO =
  "mt-1 w-full rounded-xl border border-navy-800/10 bg-smoke px-3 py-2 text-sm text-navy-800 " +
  "outline-none focus:border-teal-500 disabled:opacity-50";

function propietarioDe(a: ArticuloUi): string {
  return (a.usuarioWallet ?? a.wallet ?? "").toLowerCase();
}

function corta(wallet: string | null | undefined): string {
  if (!wallet) return "—";
  return wallet.length > 12
    ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
    : wallet;
}

function tituloDe(t: Trueke, lado: "A" | "B"): string {
  const titulo = lado === "A" ? t.tituloA : t.tituloB;
  const idArticulo = lado === "A" ? t.articuloAId : t.articuloBId;
  return titulo || (idArticulo != null ? `Artículo #${idArticulo}` : `Artículo ${lado}`);
}

function horaBonita(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaginaIntercambio() {
  const { account } = useEthereum();
  const { acceso } = useSesion();
  const { token, autenticar, cargando: autenticando, error: errorSesion } = useSesionAutenticada();

  const usuario = acceso.fase === "inscrito" ? acceso.usuario : null;
  const estadoD28 = usuario?.estado ?? "INSCRITO";
  const puedeCrear = estadoD28 === "VERIFICADO" || estadoD28 === "CERTIFICADO";

  // ---------------------------------------------------------------- datos
  const [catalogo, setCatalogo] = useState<ArticuloUi[]>([]);
  const [truekes, setTruekes] = useState<Trueke[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [mis, catalogoResp] = await Promise.all([misTruekes(token), obtenerCatalogo()]);
      setTruekes(mis.truekes ?? []);
      setCatalogo(catalogoResp as ArticuloUi[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudieron cargar tus trueques");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void cargar();
  }, [token, cargar]);

  const misArticulos = useMemo(
    () =>
      catalogo.filter(
        (a) => account && propietarioDe(a) === account.toLowerCase()
      ),
    [catalogo, account]
  );
  const otrosArticulos = useMemo(
    () =>
      catalogo.filter(
        (a) => !account || (propietarioDe(a) !== account.toLowerCase() && propietarioDe(a) !== "")
      ),
    [catalogo, account]
  );

  const activos = truekes.filter((t) => ESTADOS_ACTIVOS.includes(t.estado)).length;
  const limiteAlcanzado = estadoD28 === "VERIFICADO" && activos >= MAX_ACTIVOS_VERIFICADO;

  // ---------------------------------------------------------------- formulario
  const [articuloAId, setArticuloAId] = useState("");
  const [articuloBId, setArticuloBId] = useState("");
  const [horaPautada, setHoraPautada] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const artB = useMemo(
    () => otrosArticulos.find((a) => String(a.id) === articuloBId) ?? null,
    [otrosArticulos, articuloBId]
  );
  const parteB = artB ? propietarioDe(artB) : "";

  async function crear() {
    if (!token || !articuloAId || !artB || !parteB) return;
    setCreando(true);
    setErrorForm(null);
    try {
      await crearTrueke(token, {
        articuloAId: Number(articuloAId),
        articuloBId: artB.id,
        parteB,
        horaPautada: horaPautada ? new Date(horaPautada).toISOString() : undefined,
      });
      setArticuloAId("");
      setArticuloBId("");
      setHoraPautada("");
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : "no se pudo crear el trueque");
    } finally {
      setCreando(false);
    }
  }

  // ---------------------------------------------------------------- acciones por trueke
  const [ocupado, setOcupado] = useState<{ id: number; accion: string } | null>(null);
  const [firmados, setFirmados] = useState<ReadonlySet<number>>(new Set());
  const [valorados, setValorados] = useState<ReadonlySet<number>>(new Set());

  function miLado(t: Trueke): "A" | "B" | null {
    if (!account) return null;
    const miWallet = account.toLowerCase();
    if ((t.usuarioA ?? "").toLowerCase() === miWallet) return "A";
    if ((t.usuarioB ?? "").toLowerCase() === miWallet) return "B";
    return null;
  }

  function contraparteDe(t: Trueke, lado: "A" | "B"): string {
    return lado === "A" ? t.usuarioB : t.usuarioA;
  }

  function yaFirme(t: Trueke, _lado: "A" | "B"): boolean {
    // El modelo del espejo no expone firmaA/firmaB por separado; se usa el
    // estado local tras firmar (el backend confirma el avance del trueque).
    return firmados.has(t.id);
  }

  function yaValore(t: Trueke): boolean {
    return valorados.has(t.id);
  }

  async function ejecutar(id: number, accion: "custodiar" | "firmar", lado: "A" | "B") {
    if (!token) return;
    setOcupado({ id, accion });
    setError(null);
    try {
      if (accion === "custodiar") {
        await custodiarTrueke(token, id, lado);
      } else {
        await firmarRecepcion(token, id, lado);
        setFirmados((prev) => new Set(prev).add(id));
      }
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : `fallo al ${accion === "custodiar" ? "custodiar" : "firmar"}`);
    } finally {
      setOcupado(null);
    }
  }

  // ---------------------------------------------------------------- valoración inline
  const [valorandoId, setValorandoId] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorVal, setErrorVal] = useState<string | null>(null);

  function abrirValoracion(id: number) {
    setValores({});
    setErrorVal(null);
    setValorandoId((prev) => (prev === id ? null : id));
  }

  async function enviarValoracion(t: Trueke) {
    if (!token || !valores) return;
    const completos = DIMENSIONES.every((d) => valores[d.clave] !== undefined && valores[d.clave] !== "");
    if (!completos) {
      setErrorVal("Completa las 5 valoraciones (1–5).");
      return;
    }
    const lado = miLado(t);
    if (!lado) return;
    setEnviando(true);
    setErrorVal(null);
    try {
      await valorarTrueke(token, t.id, {
        valorado: contraparteDe(t, lado),
        aceptacion: Number(valores.aceptacion),
        honestidad: Number(valores.honestidad),
        seguridad: Number(valores.seguridad),
        confiabilidad: Number(valores.confiabilidad),
        compromiso: Number(valores.compromiso),
      });
      setValorados((prev) => new Set(prev).add(t.id));
      setValorandoId(null);
      setValores({});
      await cargar();
    } catch (e) {
      setErrorVal(e instanceof Error ? e.message : "no se pudo enviar la valoración");
    } finally {
      setEnviando(false);
    }
  }

  // ---------------------------------------------------------------- render
  const bloqueante = !puedeCrear && (
    <div className="rounded-xl border border-crimson/30 bg-crimson/5 px-4 py-3">
      <p className="text-sm font-semibold text-crimson">
        🔒 Crear trueques bloqueado: tu estado es {estadoD28} (RF-14.4, D28).
      </p>
      <p className="mt-0.5 text-xs text-navy-800/60">
        Para crear trueques necesitas el estado <strong>Verificado</strong> (correo y
        teléfono confirmados) o <strong>Certificado</strong> (identidad verificada).
        Completa la verificación desde el dashboard / Mi Perfil.
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">⇄ Intercambio</h1>
          <p className="text-sm text-navy-800/60">
            Mis truekes: crea trueques con tus artículos y avanza los activos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {account && (
            <span className="font-mono text-[10px] text-navy-800/40">
              {corta(account)}
            </span>
          )}
          {!token ? (
            <Button onClick={() => void autenticar()} disabled={autenticando || !account}>
              {autenticando ? "Firmando…" : "🔏 Iniciar sesión para operar"}
            </Button>
          ) : (
            <Button variante="outline-navy" onClick={() => void cargar()} disabled={cargando}>
              {cargando ? "Cargando…" : "↻ Refrescar"}
            </Button>
          )}
        </div>
      </div>

      {bloqueante}

      {(error || errorSesion) && (
        <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">
          ⚠️ {error ?? errorSesion}
        </p>
      )}

      {/* Formulario: nuevo trueque */}
      {puedeCrear && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-navy-800">Nuevo trueque</h2>
              <p className="text-xs text-navy-800/60">
                Ofreces uno de tus artículos (A) a cambio de un artículo de otro usuario (B).
              </p>
            </div>
            <span
              className={`rounded-pill px-3 py-1 text-[11px] font-bold ${
                limiteAlcanzado ? "bg-crimson/15 text-crimson" : "bg-navy-800/5 text-navy-800/70"
              }`}
            >
              {activos} de {MAX_ACTIVOS_VERIFICADO} trueques activos
            </span>
          </div>

          {!token ? (
            <p className="mt-4 rounded-xl bg-smoke px-4 py-3 text-sm text-navy-800/70">
              Autentícate con el botón superior para crear trueques (firma EIP-191 de tu wallet).
            </p>
          ) : misArticulos.length === 0 ? (
            <p className="mt-4 rounded-xl bg-gold-500/10 px-4 py-3 text-sm text-navy-800/80">
              📦 <strong>Publica primero un artículo desde Mi Inventario</strong> (requiere
              estado Verificado) para poder ofrecerlo en un trueque.
            </p>
          ) : otrosArticulos.length === 0 ? (
            <p className="mt-4 rounded-xl bg-smoke px-4 py-3 text-sm text-navy-800/80">
              Aún no hay artículos de <strong>otros usuarios</strong> disponibles en el catálogo
              para elegir como contraparte. Vuelve más tarde o comparte tu oferta en el mercado.
            </p>
          ) : (
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void crear();
              }}
            >
              <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
                Mi artículo (A) — ofrezco
                <select
                  className={CLASE_CAMPO}
                  value={articuloAId}
                  onChange={(e) => setArticuloAId(e.target.value)}
                >
                  <option value="">Elige tu artículo…</option>
                  {misArticulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.titulo}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
                Artículo de contraparte (B) — recibo
                <select
                  className={CLASE_CAMPO}
                  value={articuloBId}
                  onChange={(e) => setArticuloBId(e.target.value)}
                >
                  <option value="">Elige un artículo de otro usuario…</option>
                  {otrosArticulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.titulo} · {corta(propietarioDe(a))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
                Wallet de la otra parte (B)
                <input
                  className={CLASE_CAMPO}
                  value={parteB}
                  readOnly
                  placeholder="Se autocompleta al elegir la contraparte"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
                Hora pautada (opcional)
                <input
                  type="datetime-local"
                  className={CLASE_CAMPO}
                  value={horaPautada}
                  onChange={(e) => setHoraPautada(e.target.value)}
                />
              </label>

              {errorForm && (
                <p className="rounded-xl bg-crimson/10 px-3 py-2 text-xs text-crimson sm:col-span-2">
                  ⚠️ {errorForm}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <Button type="submit" disabled={!articuloAId || !artB || !parteB || limiteAlcanzado || creando}>
                  {creando ? "Creando…" : "Crear trueque"}
                </Button>
                {limiteAlcanzado && (
                  <span className="text-xs font-semibold text-crimson">
                    Máximo de {MAX_ACTIVOS_VERIFICADO} trueques activos alcanzado (RF-14.4).
                  </span>
                )}
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Lista: mis trueques */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-navy-800">Mis trueques</h2>
          {token && !cargando && (
            <span className="text-xs text-navy-800/50">
              {truekes.length} trueque{truekes.length === 1 ? "" : "s"} ·{" "}
              {estadoD28 === "VERIFICADO"
                ? `${activos} de ${MAX_ACTIVOS_VERIFICADO} activos`
                : `${activos} activos${estadoD28 === "CERTIFICADO" ? " (Certificado: sin tope)" : ""}`}
            </span>
          )}
        </div>

        {!token && (
          <Card className="p-6 text-center">
            <p className="text-sm text-navy-800/70">
              Inicia sesión con tu wallet para ver y avanzar tus trueques.
            </p>
          </Card>
        )}

        {token && cargando && (
          <p className="py-8 text-center text-sm text-navy-800/50">Cargando tus trueques…</p>
        )}

        {token && !cargando && !error && truekes.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-3xl">⇄</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-navy-800">
              Todavía no participas en ningún trueque
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-navy-800/60">
              Publica tus artículos en <strong>Mi Inventario</strong> (requiere Verificado) y
              ofrece el primero desde el formulario de arriba.
            </p>
          </Card>
        )}

        {token && !cargando && truekes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {truekes.map((t) => {
              const lado = miLado(t);
              const contraparte = lado ? contraparteDe(t, lado) : null;
              const hora = horaBonita(t.horaPautada);
              const ocupando = ocupado?.id === t.id;
              const valorando = valorandoId === t.id;
              return (
                <Card key={t.id} className="flex flex-col p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-pill bg-navy-800/5 px-2 py-0.5 text-[10px] font-bold uppercase text-navy-800/50">
                      Trueke #{t.id}
                    </span>
                    <StatusBadge estado={t.estado} />
                  </div>

                  <p className="mt-3 font-display text-base font-bold leading-snug text-navy-800">
                    {tituloDe(t, "A")}{" "}
                    <span className="text-teal-500">⇄</span> {tituloDe(t, "B")}
                  </p>

                  <p className="mt-1 text-xs text-navy-800/60">
                    {lado ? (
                      <>
                        Eres <strong>parte {lado}</strong> · contraparte{" "}
                        <span className="font-mono">{corta(contraparte)}</span>
                      </>
                    ) : (
                      "No eres parte de este trueque"
                    )}
                  </p>

                  {(hora || t.updatedAt) && (
                    <p className="mt-1 text-[11px] text-navy-800/40">
                      {hora ? `📅 Pautado: ${hora}` : ""}
                      {hora && t.updatedAt ? " · " : ""}
                      {t.updatedAt ? `Actualizado: ${horaBonita(t.updatedAt)}` : ""}
                    </p>
                  )}

                  {/* Valoración inline */}
                  {valorando && (
                    <div className="mt-3 rounded-xl border border-navy-800/10 bg-smoke p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-navy-800/60">
                        Valorar a {corta(contraparte)} (1–5)
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {DIMENSIONES.map((d) => (
                          <label key={d.clave} className="block text-[11px] font-semibold text-navy-800/70">
                            {d.label}
                            <select
                              className="mt-0.5 w-full rounded-lg border border-navy-800/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-teal-500"
                              value={valores[d.clave] ?? ""}
                              onChange={(e) =>
                                setValores((prev) => ({ ...prev, [d.clave]: e.target.value }))
                              }
                            >
                              <option value="">–</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                      {errorVal && <p className="mt-2 text-[11px] text-crimson">⚠️ {errorVal}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          className="!px-3 !py-1.5 !text-xs"
                          disabled={enviando}
                          onClick={() => void enviarValoracion(t)}
                        >
                          {enviando ? "Enviando…" : "Enviar valoración"}
                        </Button>
                        <Button
                          variante="outline-navy"
                          className="!px-3 !py-1.5 !text-xs"
                          onClick={() => abrirValoracion(t.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-800/5 pt-3">
                    {lado && (t.estado === "CREADO" || t.estado === "ACTIVO") && (
                      <Button
                        className="!px-3 !py-1.5 !text-xs"
                        disabled={ocupando || !token}
                        onClick={() => void ejecutar(t.id, "custodiar", lado)}
                      >
                        {ocupando && ocupado?.accion === "custodiar" ? "Custodiando…" : "🛡️ Custodiar mi lado"}
                      </Button>
                    )}

                    {lado && t.estado === "CUSTODIADO" && !yaFirme(t, lado) && (
                      <Button
                        className="!px-3 !py-1.5 !text-xs"
                        disabled={ocupando || !token}
                        onClick={() => void ejecutar(t.id, "firmar", lado)}
                      >
                        {ocupando && ocupado?.accion === "firmar" ? "Firmando…" : "✍️ Firmar recepción"}
                      </Button>
                    )}

                    {ESTADOS_VALORABLES.includes(t.estado) && !yaValore(t) && (
                      <Button
                        variante="outline-navy"
                        className="!px-3 !py-1.5 !text-xs"
                        disabled={ocupando || !token}
                        onClick={() => abrirValoracion(t.id)}
                      >
                        ⭐ Valorar 1–5
                      </Button>
                    )}

                    {yaValore(t) && (
                      <span className="self-center text-[11px] font-semibold text-teal-500">
                        ✓ Valoración enviada
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
