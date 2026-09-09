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
import dynamic from "next/dynamic";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  crearTrueke,
  custodiarTrueke,
  cerrarTrueke,
  firmarRecepcion,
  misTruekes,
  proponerEncuentro,
  rolEncuentro,
  puntosFavoritos,
  crearPuntoEncuentro,
  valorarTrueke,
  contactoTrueke,
  aceptarEncuentro,
  rechazarEncuentro,
  type ArticuloCatalogo,
  type Trueke,
  type PuntoFavorito,
  type PuntoEncuentro,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { SubirFotos, type FotoSubida } from "@/components/SubirFotos";

// Leaflet usa `window` al cargarse → solo cliente (evita romper el SSR).
const MapaWidget = dynamic(
  () => import("@/components/MapaWidget").then((m) => m.MapaWidget),
  { ssr: false, loading: () => null }
);

/** Estados que cuentan como trueque "activo" (en curso). */
const ESTADOS_ACTIVOS = ["CREADO", "ACTIVO", "CUSTODIADO", "APERTURA", "EN_DISPUTA", "RESOLUCION_SOCIOS"];
/** Estados terminales que van a la pestaña Histórico (director 2026-09-09). */
const ESTADOS_HISTORICO = ["COMPLETADO", "ANULADO", "BLOQUEADO"];
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

/** Widget flotante de mapa para la propuesta de encuentro (punto 4 del director). */
function PanelPropuestaEncuentro({ trueke, token }: { trueke: Trueke; token: string }) {
  const { firmarAccion } = useSesion();
  const [favoritos, setFavoritos] = useState<PuntoEncuentro[]>([]);
  const [hora, setHora] = useState("");
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [puntoNuevo, setPuntoNuevo] = useState<{ lat: number; lng: number; direccion: string } | null>(null);
  const [puntoIdElegido, setPuntoIdElegido] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await puntosFavoritos(token);
      setFavoritos((r.favoritos ?? []).map((x) => x.punto).filter(Boolean) as PuntoEncuentro[]);
    } catch {
      setFavoritos([]);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Al confirmar en el widget se incrustan los datos en el formulario (punto 4). */
  function alConfirmarMapa(r: { lat: number; lng: number; direccion: string }) {
    // Si coincide con un favorito ya guardado, se reutiliza su id (sin duplicar).
    const fav = favoritos.find(
      (x) => Math.abs(x.lat - r.lat) < 1e-5 && Math.abs(x.lng - r.lng) < 1e-5
    );
    setPuntoIdElegido(fav?.id ?? null);
    setPuntoNuevo(r);
    setMapaAbierto(false);
    setMensaje({
      tipo: "ok",
      texto: `Punto incrustado: ${r.direccion || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}${fav ? " (favorito)" : ""}. Fija la fecha/hora y propón.`,
    });
  }

  async function enviar() {
    if (!token) return;
    setEnviando(true);
    setMensaje(null);
    try {
      if (!puntoNuevo) {
        setMensaje({ tipo: "err", texto: "Abre el mapa e incrusta un punto de encuentro." });
        return;
      }
      if (!hora) {
        setMensaje({ tipo: "err", texto: "Indica la fecha y hora del encuentro." });
        return;
      }
      let puntoId = puntoIdElegido;
      if (!puntoId) {
        const creado = await crearPuntoEncuentro(token, {
          lat: puntoNuevo.lat,
          lng: puntoNuevo.lng,
          direccion: puntoNuevo.direccion || undefined,
        });
        puntoId = creado.punto.id;
      }
      const firmaProp = await firmarAccion("proponer encuentro");
      if (!firmaProp) throw new Error("Firma requerida: desbloquea tu billetera.");
      const r = await proponerEncuentro(token, trueke.id, {
        puntoEncuentroId: puntoId,
        horaPautada: new Date(hora).toISOString(),
      }, firmaProp);
      setMensaje({
        tipo: "ok",
        texto: `Encuentro propuesto${r.propone ? ` por ${corta(r.propone)}` : ""}. La otra parte lo confirmará.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "no se pudo proponer";
      setMensaje({ tipo: "err", texto: msg });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-navy-800/10 bg-smoke/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-navy-800/60">
        📍 Propuesta de encuentro (punto 5.1)
      </p>
      <p className="mt-1 text-[11px] text-navy-800/60">
        Propone la parte con **mayor nivel y mayor reputación** (desempate: quien publicó). La contraparte (menor nivel/reputación) solo aprueba o rechaza el punto.
      </p>

      {/* Botón que abre el widget flotante del mapa */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button className="!px-3 !py-1.5 !text-xs" onClick={() => setMapaAbierto(true)}>
          🗺️ Señalar en el mapa
        </Button>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-navy-800/60">
          Fecha y hora
          <input
            type="datetime-local"
            className="ml-2 rounded-lg border border-navy-800/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-teal-500"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </label>
        <Button className="!px-3 !py-1.5 !text-xs" disabled={enviando} onClick={() => void enviar()}>
          {enviando ? "Proponiendo…" : "🗓️ Proponer encuentro"}
        </Button>
      </div>

      {/* Punto incrustado por el widget */}
      {puntoNuevo && (
        <div className="mt-2 rounded-lg border border-teal-500/30 bg-teal-500/5 px-2 py-1.5 text-[11px] text-navy-800/80">
          📌 Punto: {puntoNuevo.direccion || `(${puntoNuevo.lat.toFixed(4)}, ${puntoNuevo.lng.toFixed(4)})`}
          <span className="ml-2 font-mono text-[10px] text-navy-800/50">
            {puntoNuevo.lat.toFixed(5)}, {puntoNuevo.lng.toFixed(5)}
          </span>
        </div>
      )}

      {mensaje && (
        <p className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] ${mensaje.tipo === "ok" ? "bg-teal-500/10 text-teal-700" : "bg-crimson/10 text-crimson"}`}>
          {mensaje.texto}
        </p>
      )}

      {/* Widget flotante del mapa */}
      <MapaWidget
        abierto={mapaAbierto}
        favoritos={favoritos}
        inicial={puntoNuevo}
        onCerrar={() => setMapaAbierto(false)}
        onConfirmar={alConfirmarMapa}
      />
    </div>
  );
}

function ContactoContraparte({ trueke, lado, token }: { trueke: Trueke; lado: "A" | "B" | null; token: string }) {
  const [info, setInfo] = useState<{ telefono: string | null; correo: string | null; wallet: string } | null>(null);
  const [oculto, setOculto] = useState(false);
  const [errorC, setErrorC] = useState(false);
  const activo = ["CREADO", "ACTIVO", "CUSTODIADO", "APERTURA", "EN_DISPUTA", "RESOLUCION_SOCIOS"].includes(trueke.estado);

  useEffect(() => {
    let vivo = true;
    setInfo(null);
    setOculto(false);
    setErrorC(false);
    if (!token || !lado || !activo) return;
    contactoTrueke(token, trueke.id)
      .then((r) => {
        if (!vivo) return;
        if (r.oculto) setOculto(true);
        else setInfo(r.contacto);
      })
      .catch(() => vivo && setErrorC(true));
    return () => { vivo = false; };
  }, [token, trueke.id, trueke.estado, lado, activo]);

  if (!activo || !lado || !token) return null;
  if (oculto) return null;
  if (errorC) return null;
  if (!info) return null;
  return (
    <div className="mt-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-xs text-navy-800/80">
      <p className="font-semibold text-navy-800">📞 Contacto de la contraparte</p>
      {info.telefono && <p>📱 {info.telefono}</p>}
      {info.correo && <p>✉️ {info.correo}</p>}
      {!info.telefono && !info.correo && <p className="text-navy-800/50">Sin teléfono/correo registrado.</p>}
      <p className="mt-0.5 text-[10px] text-navy-800/40">Visible mientras el trueque esté activo (se oculta al cerrar).</p>
    </div>
  );
}

export default function PaginaIntercambio() {
  const { account } = useEthereum();
  const { acceso, firmarAccion } = useSesion();
  const { token, error: errorSesion } = useSesionAutenticada();

  const usuario = acceso.fase === "inscrito" ? acceso.usuario : null;
  const estadoD28 = usuario?.estado ?? "INSCRITO";

  // ---------------------------------------------------------------- datos
  const [truekes, setTruekes] = useState<Trueke[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const mis = await misTruekes(token);
      setTruekes(mis.truekes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudieron cargar tus trueques");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void cargar();
  }, [token, cargar]);

  // Consulta el rol (propone/aprueba) de los trueques activos que esperan encuentro
  useEffect(() => {
    if (!token || !account) return;
    const candidatos = truekes.filter(
      (t) => t.usuarioB && (t.estado === "CREADO" || t.estado === "ACTIVO")
    );
    let activo = true;
    (async () => {
      const mapa: Record<number, "propone" | "aprueba"> = {};
      for (const t of candidatos) {
        try {
          const r = await rolEncuentro(token!, t.id);
          if (activo) mapa[t.id] = r.rol;
        } catch { /* sin rol todavía */ }
      }
      if (activo) setRolEncuentroMap(mapa);
    })();
    return () => { activo = false; };
  }, [token, account, truekes]);

  const activos = truekes.filter((t) => ESTADOS_ACTIVOS.includes(t.estado)).length;
  const historicos = truekes.filter((t) => ESTADOS_HISTORICO.includes(t.estado)).length;

  // Pestaña activa: "activos" (en curso) | "historico" (cerrados/completados) — director
  const [pestana, setPestana] = useState<"activos" | "historico">("activos");
  const truekesVisibles = pestana === "activos"
    ? truekes.filter((t) => ESTADOS_ACTIVOS.includes(t.estado))
    : truekes.filter((t) => ESTADOS_HISTORICO.includes(t.estado));

  // ---------------------------------------------------------------- acciones por trueke
  const [ocupado, setOcupado] = useState<{ id: number; accion: string } | null>(null);
  const [firmados, setFirmados] = useState<ReadonlySet<number>>(new Set());
  const [valorados, setValorados] = useState<ReadonlySet<number>>(new Set());
  // rol del usuario actual en cada trueque para el encuentro (director)
  const [rolEncuentroMap, setRolEncuentroMap] = useState<Record<number, "propone" | "aprueba">>({});

  function miLado(t: Trueke): "A" | "B" | null {
    if (!account) return null;
    const miWallet = account.toLowerCase();
    if ((t.usuarioA ?? "").toLowerCase() === miWallet) return "A";
    if ((t.usuarioB ?? "").toLowerCase() === miWallet) return "B";
    return null;
  }

  function contraparteDe(t: Trueke, lado: "A" | "B"): string {
    return lado === "A" ? (t.usuarioB ?? "") : t.usuarioA;
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
        const firmaCust = await firmarAccion("custodiar trueque");
        if (!firmaCust) throw new Error("Firma requerida: desbloquea tu billetera.");
        await custodiarTrueke(token, id, lado, firmaCust);
      } else {
        const firmaRec = await firmarAccion("firmar recepción");
        if (!firmaRec) throw new Error("Firma requerida: desbloquea tu billetera.");
        await firmarRecepcion(token, id, lado, firmaRec);
        setFirmados((prev) => new Set(prev).add(id));
      }
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : `fallo al ${accion === "custodiar" ? "custodiar" : "firmar"}`);
    } finally {
      setOcupado(null);
    }
  }

  // ---------------------------------------------------------------- cierre conforme/no conforme (punto 9)
  const [cerrando, setCerrando] = useState<number | null>(null);
  const [cerradoOk, setCerradoOk] = useState<ReadonlySet<number>>(new Set());
  // Formulario de disputa (✗ No Conforme): motivo + fotos de evidencia
  const [disputaDe, setDisputaDe] = useState<{ trueke: Trueke; lado: "A" | "B" } | null>(null);
  const [motivoDisputa, setMotivoDisputa] = useState("");
  const [fotosDisputa, setFotosDisputa] = useState<FotoSubida[]>([]);
  const [errorDisputa, setErrorDisputa] = useState<string | null>(null);
  const [enviandoDisputa, setEnviandoDisputa] = useState(false);
  const [disputaOk, setDisputaOk] = useState<string | null>(null);

  /** Mi cierre registrado en el espejo (CONFORME/NO_CONFORME) o null. */
  function miCierre(t: Trueke, lado: "A" | "B" | null): string | null {
    if (!lado) return null;
    return lado === "A" ? (t.cierreA ?? null) : (t.cierreB ?? null);
  }

  async function firmarCierre(t: Trueke, lado: "A" | "B", conforme: boolean) {
    if (!token) return;
    // ✗ No Conforme → abre el formulario de disputa (decisión del director:
    // la disputa nace con motivo + fotos de evidencia, no con un clic seco)
    if (!conforme) {
      setDisputaDe({ trueke: t, lado });
      setMotivoDisputa("");
      setFotosDisputa([]);
      setErrorDisputa(null);
      setDisputaOk(null);
      return;
    }
    setCerrando(t.id);
    setError(null);
    try {
      const firmaCierre = await firmarAccion("cerrar trueque");
      if (!firmaCierre) throw new Error("Firma requerida: desbloquea tu billetera.");
      const r = await cerrarTrueke(token, t.id, lado, true, firmaCierre);
      setCerradoOk((prev) => new Set(prev).add(t.id));
      if (r.disputa) setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudo registrar el cierre");
    } finally {
      setCerrando(null);
    }
  }

  /** Envía el formulario de disputa (✗ No Conforme con motivo + fotos). */
  async function enviarDisputa() {
    if (!token || !disputaDe) return;
    setEnviandoDisputa(true);
    setErrorDisputa(null);
    try {
      if (!motivoDisputa.trim()) throw new Error("Describí el motivo de tu No Conforme.");
      if (fotosDisputa.length === 0) throw new Error("Subí al menos una foto de evidencia.");
      const firmaCierre = await firmarAccion("cerrar trueque");
      if (!firmaCierre) throw new Error("Firma requerida: desbloquea tu billetera.");
      const r = await cerrarTrueke(token, disputaDe.trueke.id, disputaDe.lado, false, firmaCierre, {
        motivo: motivoDisputa.trim(),
        fotos: fotosDisputa,
      });
      const disp = r.disputa;
      const msg =
        disp?.estado === "ESPERA_JUSTIFICATIVO"
          ? "Disputa reportada: la contraparte está conforme y debe cargar su justificativo (3 días)."
          : disp?.estado === "EN_VOTACION"
            ? "Disputa reportada: ambas partes declararon No Conforme → votación de Socios abierta."
            : "Disputa reportada (#" + (disp?.id ?? "") + "): esperando la postura de la contraparte.";
      setDisputaOk(msg);
      setCerradoOk((prev) => new Set(prev).add(disputaDe.trueke.id));
      setDisputaDe(null);
      setMotivoDisputa("");
      setFotosDisputa([]);
      await cargar();
    } catch (e) {
      setErrorDisputa(e instanceof Error ? e.message : "no se pudo registrar la disputa");
    } finally {
      setEnviandoDisputa(false);
    }
  }

  /** Punto 6: la contraparte acepta o rechaza la propuesta de encuentro. */
  async function responderEncuentro(t: Trueke, accion: "aceptar" | "rechazar") {
    if (!token) return;
    setOcupado({ id: t.id, accion });
    setError(null);
    try {
      const firmaResp = await firmarAccion(accion === "aceptar" ? "aceptar encuentro" : "rechazar encuentro");
      if (!firmaResp) throw new Error("Firma requerida: desbloquea tu billetera.");
      if (accion === "aceptar") await aceptarEncuentro(token, t.id, firmaResp);
      else await rechazarEncuentro(token, t.id, firmaResp);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : `no se pudo ${accion === "aceptar" ? "aceptar" : "rechazar"} el encuentro`);
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
      const firmaVal = await firmarAccion("valorar trueque");
      if (!firmaVal) throw new Error("Firma requerida: desbloquea tu billetera.");
      await valorarTrueke(token, t.id, {
        valorado: contraparteDe(t, lado),
        aceptacion: Number(valores.aceptacion),
        honestidad: Number(valores.honestidad),
        seguridad: Number(valores.seguridad),
        confiabilidad: Number(valores.confiabilidad),
        compromiso: Number(valores.compromiso),
      }, firmaVal);
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
  const bloqueante = null; // el alta de trueques vive en Mi Trueke Central (decisión del director)

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
          <Button variante="outline-navy" onClick={() => void cargar()} disabled={cargando}>
            {cargando ? "Cargando…" : "↻ Refrescar"}
          </Button>
        </div>
      </div>

      {bloqueante}

      {(error || errorSesion) && (
        <p className="rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">
          ⚠️ {error ?? errorSesion}
        </p>
      )}

      {/* Lista: mis trueques — pestañas Activos / Histórico (decisión del director) */}
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

        {/* Pestañas: solo los activos en curso; los completados/cerrados van a Histórico */}
        {token && truekes.length > 0 && (
          <div className="mb-3 flex gap-1 rounded-pill bg-smoke p-1" role="tablist" aria-label="Filtro de trueques">
            <button
              role="tab"
              aria-selected={pestana === "activos"}
              onClick={() => setPestana("activos")}
              className={`flex-1 rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
                pestana === "activos" ? "bg-navy-800 text-white shadow" : "text-navy-800/60 hover:bg-white/60"
              }`}
            >
              🔄 Activos ({activos})
            </button>
            <button
              role="tab"
              aria-selected={pestana === "historico"}
              onClick={() => setPestana("historico")}
              className={`flex-1 rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
                pestana === "historico" ? "bg-navy-800 text-white shadow" : "text-navy-800/60 hover:bg-white/60"
              }`}
            >
              🕘 Histórico ({historicos})
            </button>
          </div>
        )}

        {cargando && (
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

        {token && !cargando && truekes.length > 0 && truekesVisibles.length === 0 && (
          <Card className="p-6 text-center text-sm text-navy-800/50">
            {pestana === "activos"
              ? "No tenés trueques activos en este momento."
              : "Todavía no tenés trueques en el histórico."}
          </Card>
        )}

        {token && !cargando && truekesVisibles.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {truekesVisibles.map((t) => {
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

                  <ContactoContraparte trueke={t} lado={lado} token={token} />

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
                    {/* Punto 6: propuesta de encuentro pendiente → la contraparte solo acepta/rechaza */}
                    {t.encuentroEstado === "PROPUESTO" &&
                      t.encuentroPropuestoPor &&
                      lado &&
                      (t.encuentroPropuestoPor.toLowerCase() !== (account ?? "").toLowerCase()) && (
                      <>
                        <Button
                          className="!px-3 !py-1.5 !text-xs !bg-[linear-gradient(135deg,#2a9d8f,#2a9d8f)]"
                          disabled={ocupado?.id === t.id || !token}
                          onClick={() => void responderEncuentro(t, "aceptar")}
                        >
                          {ocupado?.id === t.id && ocupado?.accion === "aceptar" ? "Custodiando…" : "🤝 Aceptar encuentro (custodia ambos NFTs)"}
                        </Button>
                        <Button
                          variante="outline-navy"
                          className="!px-3 !py-1.5 !text-xs !border-crimson !text-crimson hover:!bg-crimson/5"
                          disabled={ocupado?.id === t.id || !token}
                          onClick={() => void responderEncuentro(t, "rechazar")}
                        >
                          ✗ Rechazar
                        </Button>
                      </>
                    )}
                    {lado && (t.estado === "CREADO" || t.estado === "ACTIVO") && t.encuentroEstado !== "ACEPTADO" && (
                      <Button
                        className="!px-3 !py-1.5 !text-xs"
                        disabled={ocupando || !token}
                        onClick={() => void ejecutar(t.id, "custodiar", lado)}
                      >
                        {ocupando && ocupado?.accion === "custodiar" ? "Custodiando…" : "🛡️ Custodiar mi lado"}
                      </Button>
                    )}
                    {t.encuentroEstado === "ACEPTADO" && (
                      <span className="self-center text-[11px] font-semibold text-teal-600">
                        🛡️ NFTs custodiados en el escrow (acuerdo del encuentro)
                      </span>
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

                    {/* Cierre del acuerdo (punto 9): Recibido Conforme / No Conforme */}
                    {(t.estado === "CUSTODIADO" || t.estado === "APERTURA") &&
                      lado &&
                      !miCierre(t, lado) &&
                      !cerradoOk.has(t.id) && (
                        <>
                          <Button
                            className="!px-3 !py-1.5 !text-xs !bg-[linear-gradient(135deg,#2a9d8f,#2a9d8f)]"
                            disabled={cerrando === t.id || !token}
                            onClick={() => void firmarCierre(t, lado, true)}
                          >
                            {cerrando === t.id ? "Registrando…" : "✓ Recibido Conforme"}
                          </Button>
                          <Button
                            variante="outline-navy"
                            className="!px-3 !py-1.5 !text-xs !border-crimson !text-crimson hover:!bg-crimson/5"
                            disabled={cerrando === t.id || !token}
                            onClick={() => void firmarCierre(t, lado, false)}
                          >
                            ✗ No Conforme
                          </Button>
                        </>
                      )}
                    {lado && miCierre(t, lado) && (
                      <span className="self-center text-[11px] font-semibold text-navy-800/60">
                        Cierre: {miCierre(t, lado) === "CONFORME" ? "✓ Recibido Conforme" : "✗ No Conforme"}
                      </span>
                    )}
                    {(t.estado === "EN_DISPUTA" || t.estado === "RESOLUCION_SOCIOS") && (
                      <span className="self-center text-[11px] font-semibold text-crimson">
                        ⚖️ En disputa — seguí el flujo en <em>Disputas</em> (justificativo → votación de Socios)
                      </span>
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

                  {/* Encuentro (punto 5.1, regla del director): propone el de MAYOR nivel y
                      reputación; la contraparte (menor) solo aprueba/rechaza */}
                  {t.estado === "CREADO" || t.estado === "ACTIVO"
                    ? t.encuentroEstado === "PROPUESTO" ? (
                        t.encuentroPropuestoPor?.toLowerCase() === (account ?? "").toLowerCase() ? (
                          <div className="mt-3 rounded-xl border border-gold-500/40 bg-gold-500/5 px-3 py-2 text-[11px] text-navy-800/80">
                            📍 Propuesta de encuentro enviada — esperando que la contraparte la apruebe (o la rechace).
                          </div>
                        ) : null
                      ) : t.encuentroEstado === "ACEPTADO" ? null : (
                        <>
                          {lado && token && rolEncuentroMap[t.id] === "propone" && (
                            <PanelPropuestaEncuentro trueke={t} token={token} />
                          )}
                          {lado && token && rolEncuentroMap[t.id] === "aprueba" && (
                            <div className="mt-3 rounded-xl border border-navy-800/10 bg-smoke/70 px-3 py-2 text-[11px] text-navy-800/70">
                              📍 Cuando la otra parte (mayor nivel/reputación) proponga el punto de
                              encuentro, podrás <strong>aprobarlo o rechazarlo</strong> aquí.
                            </div>
                          )}
                        </>
                      )
                    : null}

                  {/* Resultado del histórico (estados terminales) */}
                  {ESTADOS_HISTORICO.includes(t.estado) && (
                    <div
                      className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold ${
                        t.estado === "COMPLETADO"
                          ? "border border-teal-500/30 bg-teal-500/5 text-teal-700"
                          : "border border-navy-800/10 bg-smoke text-navy-800/60"
                      }`}
                    >
                      {t.estado === "COMPLETADO"
                        ? "✅ Trueque completado: cada parte recibió su objeto (liberación en cruz)."
                        : t.estado === "ANULADO"
                          ? "⛔ Trueque anulado: devolución de los NFTs a sus dueños."
                          : "🚫 Trueque bloqueado (sanción): pendiente de resolución del Owner."}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: formulario de disputa (✗ No Conforme — motivo + fotos) */}
      {disputaDe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-navy-800">
              ⚖️ Declarar No Conforme — disputa
            </h3>
            <p className="mt-1 text-sm text-navy-800/60">
              Trueque #{disputaDe.trueke.id} · Declarás que lo recibido{" "}
              <strong>no es conforme</strong>. Describí el motivo y subí las fotos de
              evidencia: con esto se abre la disputa y los Socios resolverán viendo
              las pruebas de ambas partes.
            </p>

            {disputaOk && (
              <p className="mt-3 rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-xs text-navy-800/80">
                ✅ {disputaOk}
              </p>
            )}
            {errorDisputa && (
              <p className="mt-3 rounded-xl bg-crimson/10 px-4 py-2 text-xs text-crimson">
                ⚠️ {errorDisputa}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="motivo-disputa-nc"
                  className="mb-1 block text-xs font-semibold text-navy-800/70"
                >
                  Motivo del reclamo{" "}
                  <span className="font-normal text-navy-800/40">(obligatorio)</span>
                </label>
                <textarea
                  id="motivo-disputa-nc"
                  value={motivoDisputa}
                  onChange={(e) => setMotivoDisputa(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ej.: el artículo llegó dañado / no coincide con lo publicado…"
                  className="w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500"
                  disabled={enviandoDisputa}
                />
              </div>
              <SubirFotos
                fotos={fotosDisputa}
                onChange={setFotosDisputa}
                max={5}
                etiqueta="Fotos de evidencia de tu reclamo"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  className="!border-crimson !text-crimson hover:!bg-crimson/5"
                  variante="outline-navy"
                  disabled={enviandoDisputa || !motivoDisputa.trim() || fotosDisputa.length === 0}
                  onClick={() => void enviarDisputa()}
                >
                  {enviandoDisputa ? "Reportando…" : "✗ Reportar No Conforme"}
                </Button>
                <Button
                  variante="outline-navy"
                  disabled={enviandoDisputa}
                  onClick={() => {
                    setDisputaDe(null);
                    setDisputaOk(null);
                    setErrorDisputa(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
