// =============================================================================
// TrueKeate — Landing pública (RF-14.1)
// Objetivo: mostrar beneficios y seguridad del Trueke Digital y su filosofía,
// con cantidades de usuarios, volumen, qué es un TrueKe Digital, ventajas.
// Estilo: sistema de diseño "Bóveda Digital Moderna" (RNF-08).
// =============================================================================
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const ventajas = [
  { icono: "🛡️", titulo: "Custodia atómica", texto: "Los activos quedan en custodia del escrow hasta que ambas partes firmen la recepción correcta." },
  { icono: "⚡", titulo: "Trueke sin gas", texto: "Meta-transacciones EIP-712: los particulares firman sin costo y la plataforma asume el gas." },
  { icono: "👑", titulo: "Reputación real", texto: "Valoración en 5 dimensiones que recompensa la honestidad con niveles y medallas." },
  { icono: "🌍", titulo: "Economía circular", texto: "Intercambia bienes, servicios, NFTs y criptos directamente, sin intermediarios." },
];

export default function Landing() {
  return (
    <main className="flex-1">
      {/* Hero con assets de marca (RF-19) */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <Image src="/hero/hero-1.jpg" alt="" fill priority className="object-cover" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-20 text-center md:flex-row md:py-28 md:text-left">
          <div className="flex-1">
            <Image
              src="/brand/TrueKeate_logo.svg"
              alt="TrueKeate logo"
              width={120}
              height={108}
              className="mb-6 h-auto drop-shadow-lg"
              priority
            />
            <h1 className="font-display text-[32px]/[38px] font-extrabold tracking-[-0.03em] md:text-[44px]/[52px]">
              El Universo del <span className="text-gradient-gold">Intercambio Descentralizado</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base/relaxed text-white/80 md:mx-0">
              TrueKeate conecta personas y empresas para intercambiar bienes, servicios y
              criptos con la seguridad de un escrow on-chain y la confianza que da una
              reputación verdaderamente construida.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link href="/suite/dashboard">
                <Button variante="gold-accent">Comenzar a truequear</Button>
              </Link>
              <Link href="#filosofia">
                <Button variante="outline-navy" className="border-white text-white hover:bg-white/10">
                  Conocer la filosofía
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <Card destacada className="p-6 text-navy-800">
              <Image
                src="/brand/TrueKeate_titulo.svg"
                alt="TrueKeate"
                width={260}
                height={127}
                className="h-auto w-56"
              />
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy-800/60">Usuarios</dt>
                  <dd className="text-2xl font-extrabold text-teal-500">+2,4k</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy-800/60">Truekes</dt>
                  <dd className="text-2xl font-extrabold text-teal-500">+18k</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy-800/60">Volumen</dt>
                  <dd className="text-2xl font-extrabold text-teal-500">$1,2M</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy-800/60">Sin gas</dt>
                  <dd className="text-2xl font-extrabold text-gold-500">100%</dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </section>

      {/* Qué es un Trueke Digital */}
      <section id="filosofia" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-navy-800 md:text-3xl">
          ¿Qué es un <span className="text-teal-500">Trueke Digital</span>?
        </h2>
        <p className="mt-3 max-w-3xl text-navy-800/70">
          Un trueque atómico y verificable: dos partes acuerdan intercambiar activos (NFTs,
          criptos, bienes o servicios). Los activos quedan custodiados por un contrato escrow
          y solo se liberan cuando ambos certifican haber recibido lo negociado — con valoración
          obligatoria que alimenta la reputación de cada usuario.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {ventajas.map((v) => (
            <Card key={v.titulo} className="p-5">
              <div className="text-3xl">{v.icono}</div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-navy-800">{v.titulo}</h3>
              <p className="mt-1 text-sm text-navy-800/70">{v.texto}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Filosofía */}
      <section className="bg-navy-800 py-14 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-bold text-gold-500">Confianza recompensada</h3>
              <p className="mt-2 text-white/80">
                La honestidad construye reputación: niveles Iniciado → Común → Frecuente →
                Socio y medallas Bronce → Oro premian a quienes truequean con integridad.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-teal-500">Seguridad por diseño</h3>
              <p className="mt-2 text-white/80">
                Fondos custodiados on-chain con no-liberación sin firmas duales, anulación por
                quórum de Socios y evidencia certificada con hash + firma.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-cyan-400">Sin barreras</h3>
              <p className="mt-2 text-white/80">
                Los particulares truequean sin pagar gas gracias a las meta-transacciones;
                las empresas acceden a herramientas avanzadas de inventario y subastas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-navy-800">Listo para tu primer Trueke</h2>
        <p className="mx-auto mt-2 max-w-xl text-navy-800/70">
          Conecta tu wallet con MetaMask y descubre el mercado descentralizado de TrueKeate.
        </p>
        <div className="mt-6">
          <Link href="/suite/dashboard">
            <Button>Entrar a la suite</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
