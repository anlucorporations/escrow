'use client'

import Image from 'next/image'
import Link from 'next/link'

interface BrandLogoProps {
  variant?: 'full' | 'horizontal' | 'isotype'
  className?: string
  href?: string
  width?: number
  height?: number
  priority?: boolean
}

/**
 * Logotipo e Isotipo Oficial de TrueKeat.
 * Basado en la identidad visual de hexágono tridimensional con flechas de trueque orbitales.
 */
export function BrandLogo({
  variant = 'horizontal',
  className = '',
  href = '/',
  width,
  priority = false,
}: BrandLogoProps) {
  // Isotipo solo (Hexágono + flechas orbitales)
  if (variant === 'isotype') {
    const isize = width || 40
    return href ? (
      <Link href={href} className={`inline-flex items-center group ${className}`}>
        <div className="relative overflow-hidden rounded-xl border border-slate-200/60 shadow-xs" style={{ width: isize, height: isize }}>
          <Image
            src="/images/truekeate-logo.jpg"
            alt="TrueKeat Isotipo"
            fill
            sizes={`${isize}px`}
            priority={priority}
            className="object-cover object-top scale-[1.7] transform group-hover:scale-[1.85] transition-transform duration-300"
          />
        </div>
      </Link>
    ) : (
      <div className={`relative overflow-hidden rounded-xl inline-block border border-slate-200/60 shadow-xs ${className}`} style={{ width: isize, height: isize }}>
        <Image
          src="/images/truekeate-logo.jpg"
          alt="TrueKeat Isotipo"
          fill
          sizes={`${isize}px`}
          priority={priority}
          className="object-cover object-top scale-[1.7]"
        />
      </div>
    )
  }

  // Logotipo horizontal / completo
  const content = (
    <div className={`relative flex items-center gap-2.5 ${className}`}>
      {/* Isotipo gráfico */}
      <div className="relative w-10 h-10 overflow-hidden rounded-xl flex-shrink-0 shadow-sm border border-slate-200/80 bg-white">
        <Image
          src="/images/truekeate-logo.jpg"
          alt="TrueKeat Isotipo"
          fill
          sizes="40px"
          priority={priority}
          className="object-cover object-top scale-[1.75]"
        />
      </div>

      {/* Tipografía de Marca */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center tracking-tight font-extrabold text-xl text-[#1A2B4C] font-heading">
          <span>TrueKeat</span>
          <span className="text-[#2A9D8F] ml-0.5 font-black">☑</span>
        </div>
        {variant === 'full' && (
          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
            Productos · Servicios · RWA
          </span>
        )}
      </div>
    </div>
  )

  return href ? (
    <Link href={href} className="inline-flex items-center hover:opacity-90 transition-opacity">
      {content}
    </Link>
  ) : (
    content
  )
}
