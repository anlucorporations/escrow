'use client'

import Link from 'next/link'
import { Item } from '@/lib/items'
import { ReputationBadge } from '@/components/ReputationBadge'

interface AssetCardProps {
  item: Item
  className?: string
}

export function AssetCard({ item, className = '' }: AssetCardProps) {
  // Determinar tipo de activo (RWA, Servicio, Criptoactivo/P2P)
  const isService = item.category.toLowerCase().includes('servicio')
  const isCrypto = item.category.toLowerCase().includes('cripto') || item.category.toLowerCase().includes('token')
  const isRWA = !isService && !isCrypto

  const categoryLabel = isService ? 'Servicio SBT' : isCrypto ? 'Criptoactivo' : 'Bien RWA'
  const categoryBadgeClass = isService
    ? 'bg-teal-50 text-[#2A9D8F] border-[#2A9D8F]/30'
    : isCrypto
    ? 'bg-cyan-50 text-[#48CAE4] border-[#48CAE4]/30'
    : 'bg-amber-50 text-[#D4AF37] border-[#D4AF37]/30'

  const categoryIcon = isService ? '🎫' : isCrypto ? '🪙' : '🛡️'

  // Imagen destacada o placeholder limpio con isotipo
  const hasImage = item.images && item.images.length > 0
  const imageCid = hasImage ? item.images[0].cid : null

  return (
    <div
      className={`vault-card flex flex-col justify-between ${
        isRWA ? 'border-l-4 border-l-[#D4AF37]' : ''
      } ${className}`}
    >
      <div>
        {/* IMAGEN DEL ACTIVO / FOTOGRAFÍA RWA */}
        <div className="relative w-full h-48 sm:h-52 bg-slate-100 overflow-hidden">
          {imageCid ? (
            // eslint-disable-next-line @next/next/no-img-element -- imágenes IPFS externas sin optimización local
            <img
              src={`https://ipfs.io/ipfs/${imageCid}`}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200/70 relative">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-xs flex items-center justify-center text-2xl border border-slate-200">
                {categoryIcon}
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-2 font-heading">
                {item.category}
              </span>
            </div>
          )}

          {/* INSIGNIA DE CATEGORÍA (Top Right) */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border backdrop-blur-md shadow-xs flex items-center gap-1.5 ${categoryBadgeClass} bg-white/95`}
            >
              <span>{categoryIcon}</span>
              <span>{categoryLabel}</span>
            </span>
          </div>

          {/* CANTIDAD DISPONIBLE (Top Left) */}
          {item.quantity > 1 && (
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1A2B4C]/85 text-white backdrop-blur-md shadow-xs font-mono">
                Stock: {item.quantity}
              </span>
            </div>
          )}
        </div>

        {/* CUERPO DE LA TARJETA */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* TÍTULO */}
          <h3 className="font-heading font-bold text-base sm:text-lg text-[#1A2B4C] line-clamp-1 group-hover:text-[#2A9D8F] transition-colors">
            {item.title}
          </h3>

          {/* PROPIETARIO CON AVATAR HEXAGONAL */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              {/* Avatar Hexagonal */}
              <div className="w-8 h-8 bg-gradient-to-tr from-[#1A2B4C] to-[#2A9D8F] hexagon-badge flex items-center justify-center text-white text-xs font-bold shadow-xs">
                <span>{item.owner.slice(2, 4).toUpperCase()}</span>
              </div>

              <div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#1A2B4C] font-heading">
                  <span className="font-mono">{item.owner.slice(0, 6)}...{item.owner.slice(-4)}</span>
                  <span className="text-[#D4AF37] font-black" title="Billetera Verificada">✓</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Propietario del Activo
                </span>
              </div>
            </div>

            <ReputationBadge address={item.owner} />
          </div>

          {/* SECCIÓN "BUSCA A CAMBIO" */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2A9D8F] block flex items-center gap-1 font-heading">
              <span>⇄</span> Busca a cambio:
            </span>
            <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
              {item.description || 'Intercambio abierto por bienes de valor equivalente o tokens cripto (USDT/BRLT).'}
            </p>
          </div>
        </div>
      </div>

      {/* PIE DE LA TARJETA / BOTÓN PROPONER TRUEQUE */}
      <div className="p-5 sm:p-6 pt-0">
        <Link
          href={`/items/${item.id}`}
          className="w-full btn-truekeat-primary py-3 px-4 text-xs uppercase tracking-wider gap-2 group/btn"
        >
          <span className="group-hover/btn:rotate-180 transition-transform duration-300 font-mono">⇄</span>
          <span>Proponer Trueke Atómico</span>
        </Link>
      </div>
    </div>
  )
}
