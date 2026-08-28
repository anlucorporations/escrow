'use client'

import Link from 'next/link'
import { Item } from '@/lib/items'
import { ReputationBadge } from '@/components/ReputationBadge'

interface AssetCardProps {
  item: Item
  className?: string
}

export function AssetCard({ item, className = '' }: AssetCardProps) {
  // Determinar color de badge según categoría
  const isService = item.category.toLowerCase().includes('servicio')
  const isCrypto = item.category.toLowerCase().includes('cripto') || item.category.toLowerCase().includes('token')

  const categoryLabel = isService ? 'Servicio SBT' : isCrypto ? 'Criptoactivo' : 'Producto RWA'
  const categoryBadgeClass = isService
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    : isCrypto
    ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30'
    : 'bg-blue-500/10 text-blue-600 border-blue-500/30'

  const categoryIcon = isService ? '🔶' : isCrypto ? '🪙' : '🔷'

  // Imagen destacada o placeholder limpio con isotipo
  const hasImage = item.images && item.images.length > 0
  const imageCid = hasImage ? item.images[0].cid : null

  return (
    <div
      className={`bg-white rounded-[2rem] border border-slate-200/80 shadow-md hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden group ${className}`}
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/80 relative">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl border border-slate-200">
                {categoryIcon}
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-2 font-mono">
                {item.category}
              </span>
            </div>
          )}

          {/* INSIGNIA DE CATEGORÍA (Top Right) */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border backdrop-blur-md shadow-xs flex items-center gap-1 ${categoryBadgeClass} bg-white/90`}
            >
              <span>{categoryIcon}</span>
              <span>{categoryLabel}</span>
            </span>
          </div>

          {/* CANTIDAD DISPONIBLE (Top Left) */}
          {item.quantity > 1 && (
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0A1128]/80 text-white backdrop-blur-md shadow-xs font-mono">
                Stock: {item.quantity}
              </span>
            </div>
          )}
        </div>

        {/* CUERPO DE LA TARJETA */}
        <div className="p-6 space-y-4">
          {/* TÍTULO */}
          <h3 className="font-serif font-bold text-lg text-[#0A1128] line-clamp-1 group-hover:text-cyan-600 transition-colors">
            {item.title}
          </h3>

          {/* PROPIETARIO CON AVATAR HEXAGONAL */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              {/* Avatar Hexagonal */}
              <div className="w-8 h-8 bg-gradient-to-tr from-[#0A1128] to-cyan-500 clip-hexagon flex items-center justify-center text-white text-xs font-bold shadow-xs">
                <span>{item.owner.slice(2, 4).toUpperCase()}</span>
              </div>

              <div>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                  <span className="font-mono">{item.owner.slice(0, 6)}...{item.owner.slice(-4)}</span>
                  <span className="text-[#00E5FF] font-bold" title="Billetera Verificada">☑</span>
                </div>
                <span className="text-[10px] text-slate-400 font-light block">
                  Propietario del Activo
                </span>
              </div>
            </div>

            <ReputationBadge address={item.owner} />
          </div>

          {/* SECCIÓN "BUSCA A CAMBIO" */}
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
              <span>⇄</span> Busca a cambio:
            </span>
            <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
              {item.description || 'Intercambio abierto por bienes de valor equivalente o tokens cripto (USDT/BRLT).'}
            </p>
          </div>
        </div>
      </div>

      {/* PIE DE LA TARJETA / BOTÓN PROPONER TRUEQUE */}
      <div className="p-6 pt-0">
        <Link
          href={`/items/${item.id}`}
          className="w-full py-3.5 px-4 bg-[#0A1128] hover:bg-[#1C2541] active:bg-[#070D1E] text-white hover:text-[#00E5FF] font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-[#0A1128]/10 flex items-center justify-center gap-2 group/btn"
        >
          <span className="group-hover/btn:rotate-180 transition-transform duration-300">⇄</span>
          <span>Proponer Trueque (Custodiado)</span>
        </Link>
      </div>
    </div>
  )
}
