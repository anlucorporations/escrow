"use client";

// =============================================================================
// TrueKeate — Imagen protegida con sesión (Bearer) → <img> vía blob URL.
// Reutilizada para evidencias de disputas (fotos del reclamo y del justificativo),
// accesibles solo a las partes y a los Socios (mismo patrón que KYC del Owner).
// =============================================================================
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

interface Props {
  ruta: string; // p. ej. /disputas/3/evidencia/12
  token: string;
  alt?: string;
  className?: string;
}

export function ImagenProtegida({ ruta, token, alt = "evidencia", className }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let viva = true;
    setUrl(null);
    setError(false);
    (async () => {
      try {
        const res = await fetch(`${API_URL}${ruta}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("no autorizado");
        const blob = await res.blob();
        if (viva) setUrl(URL.createObjectURL(blob));
      } catch {
        if (viva) setError(true);
      }
    })();
    return () => {
      viva = false;
    };
  }, [ruta, token]);

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-smoke text-navy-800/40 ${className ?? "h-24"}`}>
        <span className="text-[11px]">🔒 sin acceso</span>
      </div>
    );
  }
  if (!url) {
    return <div className={`animate-pulse rounded-lg bg-smoke ${className ?? "h-24"}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={`rounded-lg object-cover ${className ?? "h-24 w-full"}`} />;
}
