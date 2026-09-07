"use client";

// =============================================================================
// TrueKeate — Widget flotante de mapa para la propuesta de encuentro (punto 4)
// Se abre como overlay flotante desde la ficha del trueke. Permite:
//   - señalar en el mapa con un PIN ARRASTRABLE (Leaflet + tiles OSM),
//   - buscar una dirección en un cuadro de texto (Nominatim de OSM),
//   - elegir entre los sitios favoritos (últimos puntos usados — punto 7).
// Al cerrar/confirmar, incrusta lat/lng/dirección en el formulario de la ficha.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PuntoEncuentro } from "@/lib/api";

export interface ResultadoMapa {
  lat: number;
  lng: number;
  direccion: string;
}

interface Props {
  abierto: boolean;
  /** Favoritos cargados (últimos usados). */
  favoritos: PuntoEncuentro[];
  /** Valor inicial (si ya hay uno incrustado). */
  inicial?: ResultadoMapa | null;
  onCerrar: () => void;
  /** Al confirmar se incrustan los datos en el formulario de la ficha. */
  onConfirmar: (r: ResultadoMapa) => void;
}

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

let iconoDefecto: L.DivIcon | null = null;

export function MapaWidget({ abierto, favoritos, inicial, onCerrar, onConfirmar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const pinRef = useRef<L.Marker | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [errorBusq, setErrorBusq] = useState<string | null>(null);
  const [dirActual, setDirActual] = useState<string>(inicial?.direccion ?? "");

  // Posición actual del pin (se incrusta al confirmar)
  const [pos, setPos] = useState<{ lat: number; lng: number }>(
    inicial ? { lat: inicial.lat, lng: inicial.lng } : { lat: 10.4806, lng: -66.9036 } // Caracas por defecto
  );

  useEffect(() => {
    if (!abierto || !contenedor.current) return;
    // icono pin por defecto de Leaflet (rutas de paquete)
    if (!iconoDefecto) {
      iconoDefecto = L.divIcon({
        className: "",
        html: '<div style="font-size:26px;line-height:1">📍</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
    }
    const mapa = L.map(contenedor.current).setView([pos.lat, pos.lng], 13);
    L.tileLayer(TILES, { attribution: ATRIB, maxZoom: 19 }).addTo(mapa);
    const pin = L.marker([pos.lat, pos.lng], { icon: iconoDefecto, draggable: true }).addTo(mapa);
    pin.on("dragend", () => {
      const p = pin.getLatLng();
      setPos({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });
    });
    mapa.on("click", (e: L.LeafletMouseEvent) => {
      pin.setLatLng(e.latlng);
      setPos({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) });
    });
    mapaRef.current = mapa;
    pinRef.current = pin;
    return () => {
      mapa.remove();
      mapaRef.current = null;
      pinRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Si el usuario elige un favorito, mover el pin
  function elegirFavorito(p: PuntoEncuentro) {
    setPos({ lat: p.lat, lng: p.lng });
    setDirActual(p.direccion ?? "");
    mapaRef.current?.setView([p.lat, p.lng], 15);
    pinRef.current?.setLatLng([p.lat, p.lng]);
  }

  // Búsqueda de dirección (Nominatim)
  async function buscar() {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setErrorBusq(null);
    try {
      const q = encodeURIComponent(busqueda.trim());
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`);
      const datos = (await r.json()) as { lat: string; lon: string; display_name: string }[];
      if (!datos || datos.length === 0) {
        setErrorBusq("No se encontró la dirección. Prueba con otra.");
        return;
      }
      const d = datos[0];
      const lat = Number(d.lat);
      const lng = Number(d.lon);
      setPos({ lat, lng });
      setDirActual(d.display_name);
      mapaRef.current?.setView([lat, lng], 15);
      pinRef.current?.setLatLng([lat, lng]);
    } catch {
      setErrorBusq("Error al buscar la dirección.");
    } finally {
      setBuscando(false);
    }
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-navy-800/10 px-4 py-3">
          <div>
            <h3 className="font-display text-base font-bold text-navy-800">📍 Punto de encuentro</h3>
            <p className="text-[11px] text-navy-800/50">Mueve el pin en el mapa, busca la dirección o elige un favorito.</p>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-navy-800/50 hover:bg-smoke" aria-label="Cerrar widget">
            ✕
          </button>
        </div>

        {/* Búsqueda */}
        <div className="flex gap-2 border-b border-navy-800/5 px-4 py-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void buscar()}
            placeholder="Buscar dirección… (p. ej. Plaza Bolívar, Caracas)"
            className="flex-1 rounded-xl border border-navy-800/15 bg-smoke px-3 py-1.5 text-sm outline-none focus:border-teal-500"
          />
          <button
            onClick={() => void buscar()}
            disabled={buscando}
            className="rounded-xl bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {buscando ? "…" : "🔍 Buscar"}
          </button>
        </div>
        {errorBusq && <p className="px-4 pt-1 text-[11px] text-crimson">⚠️ {errorBusq}</p>}

        {/* Favoritos (puntos ya guardados por el usuario) */}
        {favoritos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-navy-800/5 px-4 py-2">
            {favoritos.map((f) => (
              <button
                key={f.id}
                onClick={() => elegirFavorito(f)}
                className="shrink-0 rounded-pill border border-teal-500/30 bg-teal-500/5 px-2.5 py-1 text-[11px] font-semibold text-navy-800 hover:bg-teal-500/15"
                title={`${f.direccion ?? ""} (${f.lat.toFixed(4)}, ${f.lng.toFixed(4)})`}
              >
                ⭐ {f.direccion || `Punto #${f.id}`}
              </button>
            ))}
          </div>
        )}

        {/* Mapa */}
        <div ref={contenedor} className="h-64 w-full bg-smoke" />

        {/* Coordenadas + dirección actual */}
        <div className="border-t border-navy-800/10 px-4 py-3">
          <p className="text-[11px] text-navy-800/50">
            Lat <span className="font-mono">{pos.lat.toFixed(6)}</span> · Lng{" "}
            <span className="font-mono">{pos.lng.toFixed(6)}</span>
          </p>
          <input
            value={dirActual}
            onChange={(e) => setDirActual(e.target.value)}
            placeholder="Dirección o referencia del punto (opcional)"
            className="mt-1 w-full rounded-xl border border-navy-800/15 bg-smoke px-3 py-1.5 text-sm outline-none focus:border-teal-500"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={onCerrar}
              className="rounded-xl border-2 border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-smoke"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirmar({ lat: pos.lat, lng: pos.lng, direccion: dirActual })}
              className="rounded-xl bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] px-4 py-2 text-sm font-semibold text-white"
            >
              ✅ Incrustar en la ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
