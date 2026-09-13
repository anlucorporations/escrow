// =============================================================================
// TrueKeate — Guía de instalación de la wallet nativa (M7 · RF-WN-26)
// Página pública con la descarga y los pasos, enlazada desde la navegación.
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { InstalarWallet } from "@/components/InstalarWallet";

export const metadata: Metadata = {
  title: "Instalar la wallet nativa — TrueKeate",
  description:
    "Descarga e instala la wallet nativa de TrueKeate (extensión de Chrome) para conectar y firmar en la plataforma.",
};

const PASOS = [
  { n: 1, titulo: "Descarga el paquete", texto: "Pulsa «Descargar wallet (.zip)» y guarda el archivo." },
  { n: 2, titulo: "Descomprime", texto: "Extrae el contenido en una carpeta que puedas recordar." },
  {
    n: 3,
    titulo: "Carga la extensión",
    texto: "Abre chrome://extensions, activa el Modo de desarrollador y pulsa «Cargar descomprimida»; elige la carpeta.",
  },
  { n: 4, titulo: "Conecta", texto: "Recarga TrueKeate, pulsa Conectar y elige «CodeCrypto Wallet»." },
];

export default function InstalarWalletPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center gap-3">
        <Image
          src="/brand/TrueKeate_logo.svg"
          alt="TrueKeate"
          width={56}
          height={50}
          className="h-auto"
        />
        <h1 className="font-display text-2xl font-bold text-navy-800">
          Instalar la wallet nativa
        </h1>
      </div>

      <p className="mt-4 text-sm text-navy-800/70">
        La wallet de TrueKeate es una extensión de Chrome que se integra con la plataforma:
        con ella puedes conectar, iniciar sesión y firmar tus acciones sin depender de terceros.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href="/wallet/TrueKeateWallet.zip"
          download
          className="rounded-pill bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          ⬇️ Descargar wallet (.zip)
        </a>
        <InstalarWallet />
      </div>

      <ol className="mt-8 space-y-4">
        {PASOS.map((p) => (
          <li key={p.n} className="flex gap-3 rounded-card border border-navy-800/10 bg-white p-4">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-pill bg-[linear-gradient(135deg,#1a2b4c,#2a9d8f)] text-sm font-bold text-white">
              {p.n}
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-navy-800">{p.titulo}</h2>
              <p className="mt-1 text-sm text-navy-800/70">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-card border border-gold-500/40 bg-gold-500/5 p-4 text-sm text-navy-800/80">
        <strong>Nota:</strong> por ahora la instalación es local (paquete desempaquetado). La
        publicación en Chrome Web Store está prevista en un ciclo posterior.
      </div>

      <p className="mt-8 text-sm">
        <Link href="/" className="text-teal-600 underline hover:text-navy-800">
          ← Volver al inicio
        </Link>
      </p>
    </main>
  );
}
