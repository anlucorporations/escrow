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
 * Logotipo e Isotipo Oficial de TrueKeate.
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
        <div className="relative overflow-hidden rounded-xl" style={{ width: isize, height: isize }}>
          <Image
            src="/images/truekeate-logo.jpg"
            alt="TrueKeate Isotipo"
            fill
            sizes={`${isize}px`}
            priority={priority}
            className="object-cover object-top scale-[1.7] transform group-hover:scale-[1.85] transition-transform duration-300"
          />
        </div>
      </Link>
    ) : (
      <div className={`relative overflow-hidden rounded-xl inline-block ${className}`} style={{ width: isize, height: isize }}>
        <Image
          src="/images/truekeate-logo.jpg"
          alt="TrueKeate Isotipo"
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
      <div className="relative w-10 h-10 overflow-hidden rounded-xl flex-shrink-0 shadow-sm shadow-[#00E5FF]/20 border border-slate-200/50">
        <Image
          src="/images/truekeate-logo.jpg"
          alt="TrueKeate Isotipo"
          fill
          sizes="40px"
          priority={priority}
          className="object-cover object-top scale-[1.75]"
        />
      </div>

      {/* Tipografía de Marca */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center tracking-tight font-extrabold text-xl text-[#0A1128] dark:text-white">
          <span>TrueKeat</span>
          <span className="text-[#00E5FF] ml-0.5">☑</span>
        </div>
        {variant === 'full' && (
          <span className="text-[7.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            Productos · Servicios · Cripto
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
