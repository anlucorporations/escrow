"use client";

// =============================================================================
// TrueKeate — Certificación (KYC) (/suite/certificacion)
// Etapa 2 de la escalera D28 (CU-02) — lógica con SBT (decisión del director):
//   1. Al entrar, verifica si la wallet posee un SBT de certificación (on-chain):
//      el SBT nativo TrueKeateSBT del proyecto o uno externo reconocido.
//   2. Si posee SBT → botón "Certificarme con mi SBT": CERTIFICADO automático y
//      la plataforma mintea el SBT nativo TrueKeateSBT (credencial propia).
//   3. Si NO posee SBT → sube imagen real del documento (cédula/DNI) + selfie
//      → PENDIENTE de revisión humana del Owner (RF-18.4) → CERTIFICADO.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useSesion } from "@/lib/sesion";
import { estadoKyc, checkearSbt, autoCertificarSbt, enviarKyc, type InfoSbt } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

/** Lee un archivo como dataURL base64. */
function leerArchivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("no se pudo leer la imagen"));
    fr.readAsDataURL(file);
  });
}

export default function PaginaCertificacion() {
  const { token } = useSesion();
  const [estado, setEstado] = useState<string | null>(null);
  const [kycViaSbt, setKycViaSbt] = useState(false);
  const [sbt, setSbt] = useState<InfoSbt | null>(null);
  const [revisandoSbt, setRevisandoSbt] = useState(true);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [docData, setDocData] = useState<{ data: string; mime: string } | null>(null);
  const [selfieData, setSelfieData] = useState<{ data: string; mime: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const cargar = useCallback(async () => {
    if (!token) return;
    setRevisandoSbt(true);
    try {
      const st = await estadoKyc(token!);
      setEstado(st.estado);
      setKycViaSbt(Boolean(st.kyc?.viaSbt));
      // Punto 1: verificar si la wallet posee un SBT para certificar
      const info = await checkearSbt(token!);
      setSbt(info);
    } catch {
      /* sin token o red */
    } finally {
      setRevisandoSbt(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function onArchivo(tipo: "doc" | "selfie", file?: File) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("La imagen supera ~4 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Usa una imagen JPEG, PNG o WebP.");
      return;
    }
    const dataUrl = await leerArchivo(file);
    const b64 = dataUrl.split(",")[1] ?? "";
    if (tipo === "doc") {
      setDocPreview(dataUrl);
      setDocData({ data: b64, mime: file.type || "image/jpeg" });
    } else {
      setSelfiePreview(dataUrl);
      setSelfieData({ data: b64, mime: file.type || "image/jpeg" });
    }
    setError(null);
  }

  async function certificarConSbt() {
    setOcupado(true);
    setError(null);
    try {
      await autoCertificarSbt(token!);
      setEstado("CERTIFICADO");
      setEnviado(true);
      setKycViaSbt(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "no se pudo certificar");
      void cargar();
    } finally {
      setOcupado(false);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!docData || !selfieData) {
      setError("Sube ambas imágenes: documento (cédula/DNI) y selfie.");
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await enviarKyc(token!, { documento: docData, selfie: selfieData });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "no se pudo enviar el KYC");
    } finally {
      setOcupado(false);
    }
  }

  if (!token) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-3xl">🛡️</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">Certificación (KYC)</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Inicia sesión desde el menú superior con tu billetera (una sola firma).
        </p>
      </Card>
    );
  }

  if (estado === "CERTIFICADO") {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-4xl">🏆</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">¡Ya estás Certificado!</h1>
        {kycViaSbt ? (
          <p className="mx-auto mt-2 inline-flex items-center gap-1 rounded-pill bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700">
            🪪 Certificado automáticamente con tu SBT
          </p>
        ) : (
          <p className="mt-1 text-sm text-navy-800/60">
            Tienes acceso a todas las operaciones de la plataforma, historial y subastas (RF-14.5/17.2).
          </p>
        )}
        <p className="mt-4">
          <a href="/suite/dashboard" className="text-sm font-semibold text-teal-500 underline">
            Ir a Mi Trueke Central →
          </a>
        </p>
      </Card>
    );
  }

  if (estado === "INSCRITO") {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-3xl">🛡️</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">Primero verifica tu correo</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Para certificarte (KYC) primero debes estar <strong>Verificado</strong> (código de correo).
        </p>
        <p className="mt-4">
          <a href="/suite/verificacion" className="text-sm font-semibold text-teal-500 underline">
            Ir a Verificación →
          </a>
        </p>
      </Card>
    );
  }

  if (enviado && estado === "CERTIFICADO") {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-4xl">🪪</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">¡Certificado con tu SBT!</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Tu wallet poseía un SBT de certificación y TrueKeate te certificó al instante. Se registró tu
          credencial y, si no la tenías, la plataforma minteó tu <strong>SBT nativo TrueKeate</strong>.
        </p>
        <p className="mt-4">
          <a href="/suite/dashboard" className="text-sm font-semibold text-teal-500 underline">
            Ir a Mi Trueke Central →
          </a>
        </p>
      </Card>
    );
  }

  if (enviado) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-4xl">📋</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">KYC enviado</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Tu documentación (cédula/DNI + selfie) quedó <strong>pendiente de revisión humana del Owner</strong>{" "}
          (RF-18.4). Te notificaremos cuando se apruebe y pases a <strong>Certificado</strong>.
        </p>
        <p className="mt-4">
          <a href="/suite/dashboard" className="text-sm font-semibold text-teal-500 underline">
            Volver a Mi Trueke Central →
          </a>
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-800">🛡️ Certificación (KYC)</h1>
        <p className="text-sm text-navy-800/60">
          Paso 2 de la escalera D28. Comprobamos primero si tu wallet posee un{" "}
          <strong>SBT de certificación</strong> (credencial no transferible); si lo tiene, te certificas
          automáticamente. Si no, sube tu documento (cédula/DNI) y una selfie (RF-01.5 / RF-18.4).
        </p>
        <p className="mt-1 text-xs text-navy-800/40">
          Estado actual: <strong>{estado}</strong> · Tus imágenes se cifran en reposo (D17).
        </p>
      </div>

      {revisandoSbt && !sbt ? (
        <Card className="p-6 text-center text-sm text-navy-800/60">
          🔎 Verificando si tu wallet posee un SBT de certificación…
        </Card>
      ) : sbt?.tieneSbt ? (
        // ------------------------------------------------------------ con SBT
        <Card className="border-teal-500/40 p-6">
          <p className="text-lg font-bold text-teal-700">🪪 Tu wallet posee un SBT de certificación</p>
          <p className="mt-1 text-sm text-navy-800/70">
            Fuente:{" "}
            <strong>{sbt.fuente === "nativo" ? "SBT nativo TrueKeate" : "SBT externo reconocido"}</strong>
            {sbt.tokenId ? <> · tokenId #{sbt.tokenId}</> : null}
            {sbt.contrato ? (
              <span className="block break-all font-mono text-[10px] text-navy-800/40">{sbt.contrato}</span>
            ) : null}
          </p>
          <Button
            onClick={() => void certificarConSbt()}
            disabled={ocupado}
            className="mt-4 w-full"
          >
            {ocupado ? "Certificando…" : "✅ Certificarme automáticamente con mi SBT"}
          </Button>
          {error ? <p className="mt-2 text-xs text-crimson">{error}</p> : null}
        </Card>
      ) : (
        // ------------------------------------------------------------ sin SBT
        <>
          <Card className="border-gold-500/30 p-6">
            <p className="text-sm font-semibold text-navy-800">
              🪪 No detectamos un SBT de certificación en tu wallet.
            </p>
            <p className="mt-1 text-xs text-navy-800/60">
              Sube una foto de tu <strong>documento de identidad (cédula/DNI)</strong> y una{" "}
              <strong>selfie</strong>. Un revisor humano (Owner) aprobará tu certificación (RF-18.4).
            </p>
          </Card>

          <Card className="p-6">
            <form onSubmit={enviar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
                    Documento (cédula/DNI) *
                  </label>
                  <input
                    id="doc-img"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={inputCls}
                    onChange={(e) => void onArchivo("doc", e.target.files?.[0])}
                  />
                  {docPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={docPreview} alt="Documento" className="mt-2 h-28 w-full rounded-xl bg-smoke object-contain" />
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
                    Selfie *
                  </label>
                  <input
                    id="selfie-img"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={inputCls}
                    onChange={(e) => void onArchivo("selfie", e.target.files?.[0])}
                  />
                  {selfiePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selfiePreview} alt="Selfie" className="mt-2 h-28 w-full rounded-xl bg-smoke object-contain" />
                  ) : null}
                </div>
              </div>

              {error ? <p className="text-xs text-crimson">{error}</p> : null}

              <Button type="submit" disabled={ocupado || !docData || !selfieData} className="w-full">
                {ocupado ? "Enviando…" : "📤 Enviar KYC (DNI + selfie)"}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
