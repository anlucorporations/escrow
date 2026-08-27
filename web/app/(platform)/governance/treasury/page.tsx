'use client'

import { useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useUserRole } from '@/lib/hooks'
import Link from 'next/link'

export default function TreasuryPage() {
  const { account } = useEthereum()
  const role = useUserRole()

  const [logs] = useState([
    {
      id: 'log-1',
      date: '2026-08-27 15:00',
      type: 'Ingreso · Depósito Socio Aprobado',
      token: 'BRLT',
      amount: '+500.00',
      actor: '@socio_juez_alpha',
      desc: 'Cuota de admisión transferida a tesorería',
    },
    {
      id: 'log-2',
      date: '2026-08-26 18:30',
      type: 'Ingreso · Suscripción Empresa',
      token: 'BRLT',
      amount: '+1,200.00',
      actor: '@tienda_tech',
      desc: 'Membresía comercial 12 meses',
    },
    {
      id: 'log-3',
      date: '2026-08-25 09:00',
      type: 'Gasto Operativo · Gas Relayer EIP-712',
      token: 'ETH',
      amount: '-0.045',
      actor: 'Relayer Daemon',
      desc: 'Reembolso de gas para meta-transacciones gratuitas',
    },
    {
      id: 'log-4',
      date: '2026-08-24 12:00',
      type: 'Gasto Operativo · Infraestructura & Nodos',
      token: 'USDT',
      amount: '-45.00',
      actor: 'GCP Server Hosting',
      desc: 'Mantenimiento de servidor indexador PostgreSQL',
    },
  ])

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard" className="text-xs text-indigo-600 hover:underline">
                ← Volver al Panel
              </Link>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs tracking-wider uppercase text-purple-700 font-semibold">
                Suite de Gobernanza
              </span>
            </div>
            <h1 className="text-4xl font-serif text-slate-900 leading-tight">
              Finanzas Globales & Fondo Operativo
            </h1>
            <p className="text-slate-500 font-light mt-1">
              Transparencia total sobre los fondos de tesorería, costos de gas asumidos y sostenimiento de nodos.
            </p>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-2">
              Fondo de Tesorería BRLT
            </span>
            <div className="text-3xl font-serif text-purple-700 font-bold mb-1">
              34,500 <span className="text-sm font-sans text-slate-500">BRLT</span>
            </div>
            <p className="text-xs text-slate-500 font-light">Fondos comunitarios de gobernanza</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-2">
              Fondo de Gas Relayer
            </span>
            <div className="text-3xl font-serif text-indigo-600 font-bold mb-1">
              2.45 <span className="text-sm font-sans text-slate-500">ETH</span>
            </div>
            <p className="text-xs text-slate-500 font-light">Meta-transacciones sin costo al usuario</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-2">
              Reserva de Contingencia
            </span>
            <div className="text-3xl font-serif text-emerald-600 font-bold mb-1">
              $15,000 <span className="text-sm font-sans text-slate-500">USDT</span>
            </div>
            <p className="text-xs text-slate-500 font-light">Respaldo ante disputas complejas</p>
          </div>
        </div>

        {/* TABLA DE AUDITORÍA GLOBAL */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <h2 className="text-2xl font-serif text-slate-900 mb-6">
            Auditoría de Movimientos & Gastos de Operación
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Ref / Fecha</th>
                  <th className="pb-3 font-semibold">Rubro / Tipo</th>
                  <th className="pb-3 font-semibold">Actor / Responsable</th>
                  <th className="pb-3 font-semibold">Descripción</th>
                  <th className="pb-3 font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((item) => {
                  const isIncome = item.amount.startsWith('+')
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 font-mono text-slate-500">
                        <div>{item.id}</div>
                        <div className="text-[10px] text-slate-400">{item.date}</div>
                      </td>
                      <td className="py-4 font-semibold text-slate-800">{item.type}</td>
                      <td className="py-4 font-mono text-slate-600">{item.actor}</td>
                      <td className="py-4 text-slate-600">{item.desc}</td>
                      <td className="py-4 font-mono font-bold">
                        <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                          {item.amount} {item.token}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
