"use client";

// =============================================================================
// TrueKeate — CreateOperation: alta de una operación (trueke ofertado)
// El enunciado lo pedía como components/CreateOperation.tsx: formulario para
// crear la operación de intercambio en un solo paso (elegir qué ofreces, qué
// pides y de qué tipo) que deja la oferta publicada en el Mercado.
//
// Extraído del dashboard para poder reutilizarlo; la firma de la acción y el
// envío al backend viven aquí, no en la pantalla que lo hospeda.
// =============================================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { useSesionAutenticada } from "@/lib/useSesionAutenticada";
import {
  crearOfertaTrueke,
  obtenerCatalogo,
  type ArticuloCatalogo,
} from "@/lib/api";
import { Button } from "@/components/Button";

/** Categorías de la lógica maestra (punto 4). */
export const CATEGORIAS = [
  { valor: "ARTICULO", icono: "📦", nombre: "Artículo" },
  { valor: "SERVICIO", icono: "🛠️", nombre: "Servicio" },
  { valor: "BIEN", icono: "🏠", nombre: "Bien" },
  { valor: "CRIPTO", icono: "🪙", nombre: "Cripto" },
];

export interface CreateOperationProps {
  /** Se invoca tras publicar con éxito (para refrescar listados). */
  onCreada?: () => void | Promise<void>;
  className?: string;
}

export function CreateOperation({ onCreada, className }: CreateOperationProps) {
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
          todos.filter(
            (a) => (a.usuarioWallet ?? "").toLowerCase() === account.toLowerCase() && a.disponible !== false
          )
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
      await crearOfertaTrueke(
        token,
        {
          articuloAId: Number(articuloAId),
          descripcionRequerida: descripcionRequerida.trim(),
          tipoRequerido,
        },
        firma
      );
      setMensaje({ tipo: "ok", texto: "Trueke publicado en el Mercado. Espera a que alguien lo acuerde." });
      setArticuloAId("");
      setDescripcionRequerida("");
      setAbierto(false);
      await onCreada?.();
    } catch (e) {
      setMensaje({ tipo: "err", texto: e instanceof Error ? e.message : "no se pudo publicar" });
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <Button className={`mt-3 w-full !py-2 !text-sm ${className ?? ""}`} onClick={() => setAbierto(true)}>
        ➕ Publicar trueke en el Mercado
      </Button>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

  return (
    <form
      onSubmit={(e) => void publicar(e)}
      className={`mt-3 space-y-3 rounded-xl border border-navy-800/10 bg-smoke/60 p-3 ${className ?? ""}`}
    >
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
          📦 Publica primero un ítem desde{" "}
          <Link className="font-semibold underline" href="/suite/inventario">
            Mi Inventario
          </Link>
          .
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
        <p
          className={`rounded-xl px-3 py-2 text-xs ${
            mensaje.tipo === "ok" ? "bg-teal-500/10 text-teal-700" : "bg-crimson/10 text-crimson"
          }`}
        >
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
