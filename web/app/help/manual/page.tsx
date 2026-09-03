// =============================================================================
// TrueKeate — Ayuda: Manuales (agente INTEGRADOR)
// Sección de ayuda navegable con el contenido literal de docs/Manuales/**:
//   grupos (temas) -> manuales (acordeones) -> secciones (##) ->
//   sub-secciones (###) con texto e imágenes /manual/imagenes/<nombre>.svg,
//   y bloque de descarga PDF (/manual/pdf/<carpeta>-<archivo>.pdf).
// Componente servidor: acordeones nativos <details> (sin JavaScript).
// =============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { gruposManuales, manuales } from "@/lib/manual-data";
import type { ManualAyuda, SeccionAyuda, SubseccionAyuda } from "@/lib/manual-data";

export const metadata: Metadata = {
  title: "Ayuda · Manuales TrueKeate",
  description:
    "Manuales de TrueKeate en lenguaje sencillo: qué es la plataforma, cómo funciona un trueque con escrow, la billetera, las finanzas y mucho más. Con diagramas y versión PDF descargable.",
};

const pdfDe = (m: ManualAyuda) => `/manual/pdf/${m.carpeta}-${m.id}.pdf`;
const imagenDe = (nombre: string) => `/manual/imagenes/${nombre}`;

function Parrafos({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-navy-800/80">
          {p}
        </p>
      ))}
    </div>
  );
}

function Figura({ nombre, titulo }: { nombre: string; titulo: string }) {
  return (
    <figure className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de los manuales */}
      <img
        src={imagenDe(nombre)}
        alt={`Diagrama: ${titulo}`}
        loading="lazy"
        className="mx-auto h-auto w-full max-w-md rounded-card border border-navy-800/10 bg-white p-3 shadow-sm"
      />
      <figcaption className="mt-1 text-center text-xs italic text-navy-800/50">
        {titulo} — {nombre}
      </figcaption>
    </figure>
  );
}

function SubseccionBloque({ sub, indice }: { sub: SubseccionAyuda; indice: number }) {
  return (
    <div className="border-l-2 border-teal-500/30 pl-3">
      {sub.titulo ? (
        <h5 className="mb-1 text-[13px] font-bold uppercase tracking-wide text-teal-500">
          {indice + 1}. {sub.titulo}
        </h5>
      ) : null}
      <Parrafos items={sub.parrafos} />
      {sub.imagen ? <Figura nombre={sub.imagen} titulo={sub.titulo || "Sub-sección"} /> : null}
    </div>
  );
}

function SeccionBloque({ seccion }: { seccion: SeccionAyuda }) {
  const tieneSub = seccion.subsecciones.length > 0;
  return (
    <div className="rounded-xl bg-smoke p-4">
      <h4 className="font-display text-base font-bold text-navy-800">{seccion.titulo}</h4>
      <div className="mt-2 space-y-3">
        <Parrafos items={seccion.parrafos} />
        {seccion.imagen ? <Figura nombre={seccion.imagen} titulo={seccion.titulo} /> : null}
        {tieneSub ? (
          <div className="space-y-3">
            {seccion.subsecciones.map((sub, i) => (
              <SubseccionBloque key={`${seccion.titulo}-${i}`} sub={sub} indice={i} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ManualAcordeon({ manual }: { manual: ManualAyuda }) {
  return (
    <details className="group overflow-hidden rounded-card border border-navy-800/10 bg-white shadow-sm transition-shadow open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="text-2xl">
            📖
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold text-navy-800">
              {manual.titulo}
            </span>
            <span className="block text-xs text-navy-800/60">
              {manual.secciones.length} secciones · {manual.resumen}
            </span>
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-navy-800/40 transition-transform duration-200 group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="space-y-3 border-t border-navy-800/10 px-5 py-4">
        {manual.secciones.map((sec, i) => (
          <SeccionBloque key={`${manual.id}-${i}`} seccion={sec} />
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <a
            href={pdfDe(manual)}
            download
            className="inline-flex items-center gap-2 rounded-pill bg-[linear-gradient(135deg,#1a2b4c_0%,#2a9d8f_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(42,157,143,0.35)] transition-transform active:scale-95"
          >
            📄 Descargar PDF de este manual
          </a>
          <Link
            href="/"
            className="text-xs font-medium text-navy-800/50 underline-offset-2 hover:text-teal-500 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </details>
  );
}

export default function AyudaManuales() {
  return (
    <main className="flex-1">
      {/* Cabecera */}
      <header className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-10 [background:radial-gradient(circle_at_20%_0%,#2a9d8f_0%,transparent_45%),radial-gradient(circle_at_85%_20%,#d4af37_0%,transparent_40%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-16">
          <nav aria-label="Migajas" className="mb-4 text-xs text-white/60">
            <Link href="/" className="hover:text-gold-300 hover:underline">
              Inicio
            </Link>
            {" · "}
            <Link href="/suite/dashboard" className="hover:text-gold-300 hover:underline">
              Mi Trueke Central
            </Link>
            {" · "}
            <span className="text-gold-300">Ayuda — Manuales</span>
          </nav>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-[44px]/[52px]">
            Ayuda — <span className="text-gradient-gold">Manuales TrueKeate</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/80">
            Guías en lenguaje sencillo de toda la plataforma: qué es TrueKeate, cómo se hace un
            trueque con escrow, la tecnología por dentro y el glosario. Despliega cada manual para
            leerlo con sus diagramas, o descarga la versión PDF.
          </p>
          <nav aria-label="Índice de temas" className="mt-6 flex flex-wrap gap-2">
            {gruposManuales.map((g) => (
              <a
                key={g.carpeta}
                href={`#grupo-${g.carpeta}`}
                className="rounded-pill border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur transition-colors hover:border-gold-300 hover:text-gold-300"
              >
                {g.etiqueta}
              </a>
            ))}
            <a
              href="#descargar-pdf"
              className="rounded-pill bg-[linear-gradient(135deg,#d4af37_0%,#c5a065_100%)] px-3 py-1.5 text-sm font-semibold text-navy-800 shadow transition-transform hover:brightness-105 active:scale-95"
            >
              📄 Descargar PDF
            </a>
          </nav>
        </div>
      </header>

      {/* Manuales por grupo */}
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        {gruposManuales.map((grupo) => {
          const manualesDelGrupo = manuales.filter((m) => m.carpeta === grupo.carpeta);
          if (manualesDelGrupo.length === 0) return null;
          return (
            <section key={grupo.carpeta} id={`grupo-${grupo.carpeta}`} className="scroll-mt-6">
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-600">
                  {grupo.carpeta}
                </span>
                <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-navy-800 md:text-[28px]">
                  {grupo.etiqueta}
                </h2>
              </div>
              <p className="mb-5 max-w-3xl text-sm text-navy-800/70">{grupo.descripcion}</p>
              <div className="space-y-4">
                {manualesDelGrupo.map((m) => (
                  <ManualAcordeon key={m.id} manual={m} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bloque de descarga PDF */}
      <section id="descargar-pdf" className="scroll-mt-6 border-t border-navy-800/10 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-navy-800">
            Descargar manual (PDF)
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-navy-800/70">
            Versión imprimible de cada manual con el mismo contenido, lista para leer sin conexión
            o compartir.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {manuales.map((m) => {
              const grupo = gruposManuales.find((g) => g.carpeta === m.carpeta);
              return (
                <a
                  key={`pdf-${m.id}`}
                  href={pdfDe(m)}
                  download
                  className="group flex items-center gap-3 rounded-card border border-navy-800/10 bg-smoke px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-teal-500/50 hover:shadow-md"
                >
                  <span aria-hidden className="text-2xl">
                    📄
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-navy-800 group-hover:text-teal-500">
                      {m.titulo}
                    </span>
                    <span className="block text-[11px] uppercase tracking-wide text-navy-800/50">
                      {grupo?.etiqueta ?? m.carpeta} · PDF
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-navy-800/50">
            ¿Necesitas más ayuda? Vuelve al <Link className="font-medium text-teal-500 underline-offset-2 hover:underline" href="/">inicio</Link> o
            entra a tu <Link className="font-medium text-teal-500 underline-offset-2 hover:underline" href="/suite/dashboard">Mi Trueke Central</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
