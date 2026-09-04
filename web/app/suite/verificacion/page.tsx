"use client";

// =============================================================================
// TrueKeate — Verificación de identidad (/suite/verificacion)
// Etapa 1 de la escalera D28 (CU-02): el sistema envía un código al CORREO del
// usuario inscrito; al confirmarlo pasa a estado VERIFICADO (RF-01.5).
// Sin SMTP configurado (KYC_EMAIL_USER/PASS) el código se muestra en pantalla
// en modo demo (campo codigoDemo) — ver propuesta de metodología en RepoTecnico.
// =============================================================================
import { useCallback, useEffect, useState } from "react";
import { useSesion } from "@/lib/sesion";
import { iniciarVerificacion, verificarCodigo, estadoKyc } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-center font-mono text-2xl tracking-[0.4em] text-navy-800 outline-none transition-colors focus:border-teal-500";

export default function PaginaVerificacion() {
  const { acceso, token, autenticar, autenticando } = useSesion();
  const [estado, setEstado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [codigoDemo, setCodigoDemo] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inscrito = acceso.fase === "inscrito" ? acceso.usuario : null;

  const cargarEstado = useCallback(async () => {
    if (!token) return;
    try {
      const st = await estadoKyc(token!);
      setEstado(st.estado);
    } catch {
      /* sin token válido */
    }
  }, [token]);

  useEffect(() => {
    void cargarEstado();
  }, [cargarEstado]);

  // No autenticado → pedir login único
  if (!token) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-3xl">🛡️</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">Verificación de identidad</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Inicia sesión con tu billetera (una sola firma) para verificar tu correo.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={() => void autenticar()} disabled={autenticando}>
            {autenticando ? "Firmando…" : "🔗 Iniciar sesión"}
          </Button>
        </div>
      </Card>
    );
  }

  // Ya verificado o certificado → no hace falta
  if (estado === "VERIFICADO" || estado === "CERTIFICADO") {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">¡Correo verificado!</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Tu estado actual es <strong>{estado}</strong>.{" "}
          {estado === "VERIFICADO"
            ? "Siguiente paso: completar la certificación (KYC)."
            : "Ya tienes todas las operaciones habilitadas."}
        </p>
        <p className="mt-4">
          {estado === "VERIFICADO" ? (
            <a href="/suite/certificacion" className="text-sm font-semibold text-teal-500 underline">
              Ir a Certificación (KYC) →
            </a>
          ) : (
            <a href="/suite/dashboard" className="text-sm font-semibold text-teal-500 underline">
              Ir a Mi Trueke Central →
            </a>
          )}
        </p>
      </Card>
    );
  }

  async function enviarCodigo() {
    setOcupado(true);
    setError(null);
    try {
      const r = await iniciarVerificacion(token!);
      setAviso(r.aviso);
      setCodigoDemo(r.codigoDemo ?? null);
      setEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "no se pudo enviar el código");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      const r = await verificarCodigo(token!, codigo);
      setEstado(r.usuario.estado);
      setAviso(null);
      await cargarEstado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "código inválido");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-800">🛡️ Verificación de identidad</h1>
        <p className="text-sm text-navy-800/60">
          Paso 1 de la escalera D28: confirma tu <strong>correo electrónico</strong> para pasar de
          Inscrito a <strong>Verificado</strong> (RF-01.5).
        </p>
        {inscrito && (
          <p className="mt-1 text-xs text-navy-800/40">
            Correo registrado: <span className="font-mono">{inscrito.correo ?? "(no visible)"}</span> · Estado
            actual: <strong>{inscrito.estado}</strong>
          </p>
        )}
      </div>

      {!enviado ? (
        <Card className="p-6 text-center">
          <p className="text-3xl">📧</p>
          <h2 className="mt-2 font-display text-lg font-semibold text-navy-800">
            Enviamos un código a tu correo
          </h2>
          <p className="mt-1 text-sm text-navy-800/60">
            Pulsa el botón para generar y enviar el código de 6 dígitos a tu correo electrónico.
          </p>
          <div className="mt-5 flex justify-center">
            <Button onClick={() => void enviarCodigo()} disabled={ocupado}>
              {ocupado ? "Enviando…" : "📧 Enviar código a mi correo"}
            </Button>
          </div>
          {error && <p className="mt-3 text-xs text-crimson">⚠️ {error}</p>}
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-navy-800">Introduce el código</h2>
          {aviso && <p className="mt-1 text-xs text-navy-800/50">{aviso}</p>}
          {codigoDemo && (
            <p className="mt-2 rounded-xl bg-gold-500/15 px-3 py-2 text-xs text-navy-800/70">
              <strong>Modo demo</strong> (SMTP no configurado): tu código es{" "}
              <span className="font-mono text-base font-bold tracking-widest text-navy-800">{codigoDemo}</span>
            </p>
          )}
          <form onSubmit={confirmar} className="mt-4 space-y-4">
            <input
              aria-label="Código de verificación del correo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              maxLength={6}
              required
              className={inputCls}
            />
            {error && <p className="text-xs text-crimson">⚠️ {error}</p>}
            <Button type="submit" disabled={ocupado || codigo.length < 6} className="w-full">
              {ocupado ? "Verificando…" : "✅ Confirmar código y pasar a Verificado"}
            </Button>
            <button
              type="button"
              onClick={() => void enviarCodigo()}
              className="w-full text-center text-xs text-navy-800/50 underline hover:text-teal-500"
            >
              Reenviar código
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
