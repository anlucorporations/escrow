"use client";

// =============================================================================
// TrueKeate — Catálogo de trueques ofrecidos (/suite/mercado)
// Accesible con la billetera conectada AUNQUE no esté inscrita (decisión del
// director, RF-14.3): permite observar los intercambios ofrecidos. Publicar
// requiere estado Verificado/Certificado (RF-14.4).
// =============================================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { obtenerCatalogo, type ArticuloCatalogo } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";

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

export default function PaginaMercado() {
  const { account } = useEthereum();
  const { acceso } = useSesion();
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    obtenerCatalogo()
      .then((a) => {
        if (vivo) setArticulos(a);
      })
      .catch((e) => {
        if (vivo) setError(e instanceof Error ? e.message : "no se pudo cargar el catálogo");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const inscrito = acceso.fase === "inscrito";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-800">Mercado de trueques</h1>
          <p className="text-sm text-navy-800/60">
            Observa los intercambios AtoA ofrecidos por la comunidad.
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
            <strong>Modo observación:</strong> tu billetera no está inscrita; puedes ver ofertas,
            pero para <em>publicar o crear trueques</em> completa la inscripción.
          </p>
          <Link href="/suite/inscripcion">
            <Button className="!px-3 !py-1.5 !text-xs">📝 Inscribirme</Button>
          </Link>
        </div>
      )}

      {cargando && (
        <p className="py-10 text-center text-sm text-navy-800/50">Cargando catálogo…</p>
      )}

      {error && (
        <Card className="p-6 text-center">
          <p className="text-sm text-crimson">No se pudo cargar el catálogo.</p>
          <p className="mt-1 text-xs text-navy-800/50">{error}</p>
        </Card>
      )}

      {!cargando && !error && articulos.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-3xl">🫙</p>
          <h2 className="mt-2 font-display text-lg font-semibold text-navy-800">
            Aún no hay trueques publicados
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-navy-800/60">
            Cuando los usuarios verificados publiquen sus artículos AtoA, aparecerán aquí.
          </p>
          {inscrito && (
            <p className="mt-4 text-xs text-navy-800/50">
              ¿Tienes algo para ofrecer? La publicación se habilita desde tu inventario (Verificado/Certificado, RF-14.4).
            </p>
          )}
        </Card>
      )}

      {!cargando && articulos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {articulos.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-smoke text-xl">
                  {ICONO_RUBRO[a.rubro ?? ""] ?? "📦"}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-bold text-navy-800">{a.titulo}</h3>
                  <p className="line-clamp-2 text-xs text-navy-800/60">
                    {a.descripcion || "Sin descripción."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge estado={a.rubro ?? "Otros"} tono="teal" />
                    {a.usuarioNivel && (
                      <span className="rounded-pill bg-navy-800/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-navy-800/60">
                        Nivel {a.usuarioNivel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-navy-800/5 pt-2 text-right">
                <span className="text-[10px] text-navy-800/40">
                  Ofrecido por {a.usuarioWallet ? `${a.usuarioWallet.slice(0, 6)}…${a.usuarioWallet.slice(-4)}` : "usuario"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
