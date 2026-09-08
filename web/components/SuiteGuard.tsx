"use client";

// =============================================================================
// TrueKeate — Guard de acceso de la suite (/suite/**)
// Decisión del director:
//   1) Sin billetera conectada → el público NO accede a la suite: pantalla de
//      conexión (solo la landing es pública).
//   2) Wallet conectada pero NO inscrita → SOLO puede ver el catálogo
//      (/suite/mercado); el resto de la suite muestra el aviso de inscripción.
//   3) Inscrita → LOGIN ÚNICO: se pide UNA firma (token de sesión global) y
//      después se muestran las secciones según su perfil (RF-14) — las páginas
//      ya NO piden autenticación por separado.
// =============================================================================
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { seccionesPara } from "@/lib/navegacion";
import { Button } from "@/components/Button";
import { BotonConectarLogin } from "@/components/BotonConectarLogin";

const RUTA_CATALOGO = "/suite/mercado";
const RUTA_INSCRIPCION = "/suite/inscripcion";

/** Rutas accesibles con la wallet conectada aunque NO esté inscrita. */
const RUTAS_SIN_INSCRIPCION = [RUTA_CATALOGO, RUTA_INSCRIPCION];

function PantallaConectar() {
  const { errorConexion, abrirEnAppWallet } = useEthereum();
  const host = typeof window !== "undefined" ? window.location.host : "";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-card border border-navy-800/10 bg-white p-8 shadow-md">
        <p className="text-4xl">🔐</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-navy-800">
          Conecta tu billetera para continuar
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-navy-800/60">
          El área de la suite es privada. Conecta tu billetera (MetaMask) para
          iniciar sesión con tu cuenta (una sola firma). El público en general
          solo tiene acceso a la página de inicio.
        </p>
        <div className="mt-6 flex justify-center">
          <BotonConectarLogin />
        </div>

        {/* Ayuda contextual si no hay wallet inyectada (RF-16.1 / móvil) */}
        {errorConexion === "app_movil" && (
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-gold-500/40 bg-gold-500/5 p-4 text-left">
            <p className="text-sm font-bold text-navy-800">📱 Tu wallet está en la app del móvil</p>
            <p className="mt-1 text-xs text-navy-800/70">
              Los navegadores del móvil no tienen extensiones. Conecta de una de estas dos formas:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-navy-800/80">
              <li>
                Pulsa el botón y TrueKeate se abrirá dentro de <strong>MetaMask</strong> (app).{" "}
                <em>(Otras wallets: busca su navegador interno y entra a esta misma dirección.)</em>
              </li>
              <li>
                En MetaMask: menú ⋮ → <strong>Navegador</strong> → entra a <code className="break-all">{host}</code>
              </li>
            </ol>
            <Button onClick={() => abrirEnAppWallet()} className="mt-3 w-full !text-xs">
              📲 Abrir en la app de MetaMask
            </Button>
          </div>
        )}
        {errorConexion === "sin_wallet" && (
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-navy-800/10 bg-smoke p-4 text-left">
            <p className="text-sm font-bold text-navy-800">🦊 No se detectó una wallet en este navegador</p>
            <p className="mt-1 text-xs text-navy-800/70">
              Instala la <strong>extensión de MetaMask</strong> (u otra wallet compatible, RF-16.1),
              recarga la página y vuelve a pulsar “Conectar”. Si estás en el móvil, usa la app.
            </p>
          </div>
        )}

        <p className="mt-4 text-xs text-navy-800/40">
          <Link href="/" className="underline hover:text-teal-500">
            ← Volver a la página de inicio
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Login ÚNICO: la billetera ya está conectada e inscrita; falta la firma única
 *  que emite el token de sesión global. Una sola vez; luego todas las secciones. */
function PantallaIniciarSesion() {
  const { token, autenticar, autenticando } = useSesion();
  if (token) return null; // ya autenticado (el guard re-renderiza al cambiar token)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-card border border-navy-800/10 bg-white p-8 shadow-md">
        <p className="text-4xl">🔏</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-navy-800">
          Inicia sesión con tu billetera
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-navy-800/60">
          Tu billetera está conectada e inscrita. Confirma con <strong>una sola
          firma</strong> para acceder a tus secciones. No te la volveremos a pedir
          al navegar.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => void autenticar()} disabled={autenticando}>
            {autenticando ? "Firmando…" : "🔏 Iniciar sesión (una firma)"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PantallaRequiereInscripcion() {
  const { inscribir, refrescar } = useSesion();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full rounded-card border border-navy-800/10 bg-white p-8 text-left shadow-md">
        <p className="text-4xl">📝</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-navy-800">
          Completa tu inscripción para usar la suite
        </h1>
        <p className="mt-2 text-sm text-navy-800/60">
          Tu billetera está conectada pero todavía no está inscrita. Mientras
          tanto puedes <strong>observar el catálogo</strong> de trueques
          ofrecidos. Para operar (crear trueques, inventario, perfil…) completa
          la inscripción formal: correo, teléfono, dirección y consentimiento
          GDPR.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={RUTA_CATALOGO}>
            <Button variante="outline-navy">👀 Ver catálogo de trueques</Button>
          </Link>
          <a href="/suite/inscripcion">
            <Button>📝 Inscribirme ahora</Button>
          </a>
        </div>
        <button
          onClick={() => void refrescar()}
          className="mt-4 text-xs text-navy-800/40 underline hover:text-teal-500"
        >
          Ya me inscribí — refrescar estado
        </button>
      </div>
    </div>
  );
}

export function SuiteGuard({ children }: { children: ReactNode }) {
  const { conectado } = useEthereum();
  const { acceso, token } = useSesion();
  const pathname = usePathname() ?? "";

  // 1) Sin wallet conectada → no se accede al contenido de la suite.
  if (!conectado) return <PantallaConectar />;

  // 2) Verificando estado contra el backend.
  if (acceso.fase === "verificando") {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-navy-800/50">
        <span className="animate-pulse">Verificando inscripción…</span>
      </div>
    );
  }

  // 3) Conectada pero NO inscrita → solo catálogo e inscripción; el resto bloqueado.
  if (acceso.fase === "conectadoNoInscrito") {
    if (RUTAS_SIN_INSCRIPCION.some((r) => pathname.startsWith(r))) return <>{children}</>;
    return <PantallaRequiereInscripcion />;
  }

  // 4) Inscrita (INSCRITO/VERIFICADO/CERTIFICADO):
  //    LOGIN ÚNICO — sin token de sesión se pide UNA firma (nunca por página).
  if (acceso.fase === "inscrito") {
    if (!token) return <PantallaIniciarSesion />;

    // Protección por URL: si la sección no está permitida para este usuario
    // (RF-14/D14), se muestra un aviso en vez del contenido.
    const permitidas = seccionesPara({
      tipo: acceso.usuario.tipo,
      nivel: acceso.usuario.nivel,
      estado: acceso.usuario.estado,
    });
    // Rutas de proceso de la escalera D28 (Verificación/Certificación): accesibles
    // para cualquier usuario inscrito (el contenido valida el estado y redirige).
    const RUTAS_PROCESO = ["/suite/verificacion", "/suite/certificacion"];
    const coincide =
      RUTAS_PROCESO.some((r) => pathname.startsWith(r)) ||
      permitidas.some((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
    if (!coincide) return <PantallaSinPermiso />;
    return <>{children}</>;
  }

  return <>{children}</>;
}

function PantallaSinPermiso() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-card border border-navy-800/10 bg-white p-8 shadow-md">
        <p className="text-4xl">🚫</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-navy-800">
          No tienes acceso a esta sección
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-navy-800/60">
          Esta sección está reservada para tu Tipo de Usuario o estado de la escalera D28
          (RF-14). Si crees que es un error, verifica tu estado o contacta al soporte.
        </p>
        <p className="mt-4">
          <Link href="/suite/dashboard" className="text-sm font-semibold text-teal-500 underline">
            ← Volver a Mi Trueke Central
          </Link>
        </p>
      </div>
    </div>
  );
}
