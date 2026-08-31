'use client'

/**
 * Loader Hexagonal Orbital Dual (Design System 2.0 — prototipo §5.2).
 * Aros concéntricos teal/cyan y dorado girando en sentidos opuestos con
 * hexágono central ⇄. Sustituye a los spinners genéricos.
 */
export function HexLoader({ label, size = 'md' }: { label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'lg' ? 1.4 : size === 'sm' ? 0.75 : 1
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4" role="status" aria-label={label || 'Cargando'}>
      <div className="tk-loader" style={{ transform: `scale(${scale})` }}>
        <div className="ring-outer"></div>
        <div className="ring-inner"></div>
        <div className="core">⇄</div>
      </div>
      {label && (
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-heading">
          {label}
        </span>
      )}
    </div>
  )
}
