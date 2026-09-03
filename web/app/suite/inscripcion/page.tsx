"use client";

// =============================================================================
// TrueKeate — Inscripción formal (/suite/inscripcion)
// La wallet conectada pero NO inscrita completa: correo + teléfono + dirección
// + consentimiento GDPR → estado INSCRITO (RF-01.2b/01.3, decisión del director).
// Si ya está inscrita, redirige al dashboard.
// =============================================================================
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const inputCls =
  "w-full rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-sm text-navy-800 outline-none transition-colors focus:border-teal-500";

export default function PaginaInscripcion() {
  const { account, conectado } = useEthereum();
  const { acceso, inscribir } = useSesion();
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Si llega aquí YA inscrito (p. ej. enlace directo), muestra aviso con salida.
  if (acceso.fase === "inscrito" && !ok) {
    return (
      <Card className="p-8 text-center">
        <p className="text-3xl">✅</p>
        <h1 className="mt-2 font-display text-xl font-bold text-navy-800">Ya estás inscrito</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Tu billetera ya completó la inscripción. Puedes entrar a tu panel.
        </p>
        <p className="mt-4">
          <Link href="/suite/dashboard" className="text-sm font-semibold text-teal-500 underline">
            Ir a Mi Trueke Central →
          </Link>
        </p>
      </Card>
    );
  }

  if (!conectado) {
    return (
      <Card className="p-8 text-center">
        <p className="text-3xl">🔐</p>
        <h1 className="mt-2 font-display text-xl font-bold text-navy-800">Conecta tu billetera</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Para inscribirte primero conecta tu billetera desde el inicio.
        </p>
        <p className="mt-4">
          <Link href="/" className="text-sm text-teal-500 underline">
            ← Volver al inicio
          </Link>
        </p>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!correo || !telefono) {
      setError("Correo y teléfono son obligatorios (RF-01.2b).");
      return;
    }
    if (!consentimiento) {
      setError("Debes aceptar el consentimiento GDPR para inscribirte.");
      return;
    }
    setEnviando(true);
    const r = await inscribir({
      correo,
      telefono,
      direccionInscripcion: direccion || undefined,
      consentimientoGdpr: consentimiento,
    });
    setEnviando(false);
    if (r.ok) {
      setOk(true);
      setTimeout(() => router.replace("/suite/dashboard"), 900);
    } else {
      setError(r.error ?? "Error al inscribirte.");
    }
  }

  if (ok) {
    return (
      <Card className="p-10 text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-2 font-display text-xl font-bold text-navy-800">¡Inscripción completada!</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Ya eres un usuario <strong>Inscrito</strong>. Te llevamos a tu panel…
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card className="p-6 sm:p-8">
        <p className="text-3xl">📝</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">Inscripción en TrueKeate</h1>
        <p className="mt-1 text-sm text-navy-800/60">
          Completa tus datos para inscribirte como Usuario Particular (escalera D28 →
          estado <strong>Inscrito</strong>). Tus datos personales se guardan cifrados y solo con
          tu consentimiento (GDPR, D17).
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
              Billetera
            </label>
            <p className="rounded-xl bg-smoke px-3 py-2 font-mono text-xs text-navy-800/70 break-all">
              {account}
            </p>
          </div>

          <div>
            <label htmlFor="correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
              Correo electrónico *
            </label>
            <input
              id="correo"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="telefono" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
              Teléfono *
            </label>
            <input
              id="telefono"
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+58 412 000 0000"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="direccion" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-800/60">
              Dirección de inscripción (opcional)
            </label>
            <input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ciudad, estado (se usa para el radio de 10 km)"
              className={inputCls}
            />
          </div>

          <label className="flex items-start gap-2 rounded-xl bg-smoke p-3 text-xs text-navy-800/70">
            <input
              type="checkbox"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Autorizo a TrueKeate a tratar mis datos personales conforme al GDPR (D17):
              almacenamiento cifrado, uso para verificación y contacto, retención máxima 24
              meses. <em>Obligatorio para inscribirse.</em>
            </span>
          </label>

          {error && (
            <p className="rounded-xl bg-crimson/10 px-3 py-2 text-xs font-medium text-crimson">{error}</p>
          )}

          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? "Inscribiendo…" : "📝 Completar inscripción"}
          </Button>

          <p className="text-center text-xs text-navy-800/50">
            ¿Solo quieres mirar? Puedes{" "}
            <Link href="/suite/mercado" className="text-teal-500 underline">
              ver el catálogo
            </Link>{" "}
            sin inscribirte.
          </p>
        </form>
      </Card>
    </div>
  );
}
