"use client";

// =============================================================================
// TrueKeate — Revisión KYC del Owner (RF-18.4) dentro del Panel del Owner
// Muestra solicitudes PENDIENTES (sin SBT, con imágenes DNI/selfie) y permite
// aprobar (→ CERTIFICADO + SBT nativo) o rechazar.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { API_URL, kycPendientes, revisarKyc, type KycPendiente } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface ImagenCargada {
  url: string | null;
  nombre: string;
}

export function KycPendientesOwner({ token }: { token: string }) {
  const [pendientes, setPendientes] = useState<KycPendiente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [imagenes, setImagenes] = useState<Record<string, ImagenCargada[]>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { pendientes: lista } = await kycPendientes(token);
      setPendientes(lista);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudo listar KYC pendientes");
      setPendientes([]);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Las imágenes KYC requieren Authorization → se descargan con fetch + token. */
  async function cargarImagen(wallet: string, ruta: string | null | undefined, nombre: string) {
    if (!ruta) return;
    try {
      const res = await fetch(`${API_URL}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setImagenes((prev) => ({
        ...prev,
        [wallet]: [...(prev[wallet] ?? []), { url: objUrl, nombre }],
      }));
    } catch {
      /* imagen no disponible */
    }
  }

  useEffect(() => {
    for (const p of pendientes ?? []) {
      void cargarImagen(p.wallet, p.urlDocumento, "Documento (DNI/cédula)");
      void cargarImagen(p.wallet, p.urlSelfie, "Selfie");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendientes]);

  async function decidir(wallet: string, aprobar: boolean) {
    setOcupado(wallet);
    setError(null);
    setAviso(null);
    try {
      await revisarKyc(token, wallet, aprobar);
      setAviso(aprobar ? `✅ ${wallet.slice(0, 8)}… certificado (SBT nativo minteado).` : `❌ ${wallet.slice(0, 8)}… rechazado.`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error al revisar");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800/60">
        KYC pendientes de revisión (DNI + selfie)
      </h2>
      <p className="mt-1 text-xs text-navy-800/50">
        RF-18.4: al aprobar, la plataforma certifica al usuario y le mintea su SBT nativo TrueKeate.
      </p>

      {aviso ? <p className="mt-2 text-xs font-semibold text-teal-600">{aviso}</p> : null}
      {error ? <p className="mt-2 text-xs text-crimson">⚠️ {error}</p> : null}

      {pendientes === null ? (
        <p className="mt-3 text-sm text-navy-800/50">Cargando solicitudes…</p>
      ) : pendientes.length === 0 ? (
        <p className="mt-3 text-sm text-navy-800/40">Sin solicitudes pendientes 🎉</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pendientes.map((p) => (
            <li key={p.wallet} className="rounded-xl border border-navy-800/10 bg-smoke/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-semibold text-navy-800">{p.wallet}</p>
                  <p className="text-[11px] text-navy-800/60">
                    {p.tipo} · {p.nivel} · {p.medalla}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="!px-3 !py-1 !text-xs"
                    disabled={ocupado === p.wallet}
                    onClick={() => void decidir(p.wallet, true)}
                  >
                    {ocupado === p.wallet ? "Procesando…" : "✅ Aprobar"}
                  </Button>
                  <Button
                    variante="outline-navy"
                    className="!px-3 !py-1 !text-xs !text-crimson !border-crimson/40"
                    disabled={ocupado === p.wallet}
                    onClick={() => void decidir(p.wallet, false)}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(imagenes[p.wallet] ?? []).map((img, i) => (
                  <figure key={i} className="rounded-lg border border-navy-800/10 bg-white p-1">
                    {img.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt={img.nombre} className="h-24 w-full rounded-md object-contain" />
                    ) : null}
                    <figcaption className="py-1 text-center text-[10px] text-navy-800/50">{img.nombre}</figcaption>
                  </figure>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
