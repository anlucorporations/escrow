"use client";

// =============================================================================
// TrueKeate — Subida de fotos (evidencia) con previsualización.
// Devuelve fotos [{ data: base64, mime }] listas para el backend (máx N, 4 MB c/u).
// =============================================================================
import { useRef, useState } from "react";

export interface FotoSubida {
  data: string;
  mime: string;
}

interface Props {
  fotos: FotoSubida[];
  onChange: (fotos: FotoSubida[]) => void;
  max?: number;
  etiqueta?: string;
}

/** Lee un archivo como dataURL base64. */
function leerArchivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("no se pudo leer la imagen"));
    fr.readAsDataURL(file);
  });
}

export function SubirFotos({ fotos, onChange, max = 5, etiqueta = "Fotos de evidencia" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onArchivos(archivos: FileList | null) {
    if (!archivos) return;
    setError(null);
    const disponibles = max - fotos.length;
    const lista = [...archivos].slice(0, disponibles);
    const nuevas: FotoSubida[] = [];
    for (const file of lista) {
      if (file.size > 4 * 1024 * 1024) {
        setError(`"${file.name}" supera ~4 MB.`);
        continue;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError(`"${file.name}" no es JPEG/PNG/WebP.`);
        continue;
      }
      const dataUrl = await leerArchivo(file);
      nuevas.push({ data: dataUrl.split(",")[1] ?? "", mime: file.type || "image/jpeg" });
    }
    onChange([...fotos, ...nuevas]);
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-navy-800/70">
        {etiqueta}{" "}
        <span className="font-normal text-navy-800/40">
          (máx. {max}; {fotos.length} cargada{fotos.length === 1 ? "" : "s"})
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {fotos.map((foto, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${foto.mime};base64,${foto.data}`}
              alt={`foto ${i + 1}`}
              className="h-20 w-20 rounded-xl border border-navy-800/10 object-cover"
            />
            <button
              type="button"
              aria-label={`quitar foto ${i + 1}`}
              onClick={() => onChange(fotos.filter((_, j) => j !== i))}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-crimson text-[10px] font-bold text-white shadow"
            >
              ✕
            </button>
          </div>
        ))}
        {fotos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy-800/20 text-navy-800/40 transition-colors hover:border-teal-500 hover:text-teal-600"
          >
            <span className="text-xl leading-none">＋</span>
            <span className="mt-0.5 text-[9px]">Agregar</span>
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-crimson">⚠️ {error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          void onArchivos(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
