"use client";

// =============================================================================
// TrueKeate — Certificación (KYC) (/suite/certificacion)
// Etapa 2 de la escalera D28 (CU-02): el usuario Verificado envía documento de
// identidad + selfie. El KYC queda PENDIENTE de revisión humana del Owner
// (RF-18.4) → estado CERTIFICADO (RF-01.5).
// Nota: el servicio verificador automático de documentos es externo y está
// documentado en la propuesta de metodología (RepoTecnico).
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useSesion } from "@/lib/sesion";
import { estadoKyc, enviarKyc } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

export default function PaginaCertificacion() {
  const { acceso, token, autenticar, autenticando } = useSesion();
  const [estado, setEstado] = useState<string | null>(null);
  const [documentoRef, setDocumentoRef] = useState("");
  const [selfieRef, setSelfieRef] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const cargarEstado = useCallback(async () => {
    if (!token) return;
    try {
      const st = await estadoKyc(token!);
      setEstado(st.estado);
    } catch {
      /* sin token */
    }
  }, [token]);

  useEffect(() => {
    void cargarEstado();
  }, [cargarEstado]);

  if (!token) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-3xl">🛡️</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">Certificación (KYC)</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Inicia sesión con tu billetera (una sola firma) para enviar tu KYC.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={() => void autenticar()} disabled={autenticando}>
            {autenticando ? "Firmando…" : "🔗 Iniciar sesión"}
          </Button>
        </div>
      </Card>
    );
  }

  if (estado === "CERTIFICADO") {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-4xl">🏆</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">¡Ya estás Certificado!</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Tienes acceso a todas las operaciones de la plataforma, historial y subastas (RF-14.5/17.2).
        </p>
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

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      await enviarKyc(token!, { documentoRef: documentoRef.trim(), selfieRef: selfieRef.trim() });
      setEnviado(true);
      // Refresco local (no toca el contexto global para no remontar la página).
      void cargarEstado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "no se pudo enviar el KYC");
    } finally {
      setOcupado(false);
    }
  }

  if (enviado) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-4xl">📋</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">KYC enviado</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Tu documentación quedó <strong>pendiente de revisión humana del Owner</strong> (RF-18.4).
          Te notificaremos cuando se apruebe y pases a <strong>Certificado</strong>.
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
          Paso 2 de la escalera D28: envía tu <strong>documento de identidad</strong> y una{" "}
          <strong>selfie</strong> para pasar de Verificado a <strong>Certificado</strong> (RF-01.5).
        </p>
        <p className="mt-1 text-xs text-navy-800/40">
          Estado actual: <strong>{estado}</strong> · Tu documentación se cifra en reposo (D17); solo una
          huella (merkle root) se sube a la cadena (RF-01.7).
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label htmlFor="doc" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
              Referencia del documento de identidad *
            </label>
            <input
              id="doc"
              required
              value={documentoRef}
              onChange={(e) => setDocumentoRef(e.target.value)}
              placeholder="Ej: ipfs://CID-del-documento o referencia del verificador"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="selfie" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
              Referencia de la selfie *
            </label>
            <input
              id="selfie"
              required
              value={selfieRef}
              onChange={(e) => setSelfieRef(e.target.value)}
              placeholder="Ej: ipfs://CID-de-la-selfie"
              className={inputCls}
            />
          </div>
          <p className="rounded-xl bg-smoke px-3 py-2 text-[11px] text-navy-800/50">
            En producción, el documento y la selfie pasan por un <strong>servicio verificador</strong>{" "}
            automático y la revisión humana del Owner (RF-18.4) — ver propuesta de metodología en
            RepoTecnico. Aquí se registran las referencias cifradas.
          </p>
          {error && <p className="text-xs text-crimson">⚠️ {error}</p>}
          <Button type="submit" disabled={ocupado || !documentoRef || !selfieRef} className="w-full">
            {ocupado ? "Enviando…" : "📋 Enviar KYC para certificación"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
