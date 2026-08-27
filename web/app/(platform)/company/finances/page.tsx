'use client'

import { useState } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useAllowedTokens } from '@/lib/hooks'
import Link from 'next/link'

export default function CompanyFinancesPage() {
  const { account } = useEthereum()
  const { tokens, loading } = useAllowedTokens()

  const [sales] = useState([
    {
      id: 'tx-101',
      date: '2026-08-26 14:30',
      client: '@particular_alice',
      item: 'Kit Sensores IoT Agro',
      amount: '350.00',
      token: 'USDT',
      status: 'Completado',
    },
    {
      id: 'tx-102',
      date: '2026-08-25 11:15',
      client: '@particular_bob',
      item: 'Servicio Mantenimiento Maquinaria',
      amount: '500.00',
      token: 'BRLT',
      status: 'Completado',
    },
    {
      id: 'tx-103',
      date: '2026-08-24 16:45',
      client: '@particular_carol',
      item: 'Lote Semillas Cacao Certificado',
      amount: '120.00',
      token: 'TKA',
      status: 'Completado',
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
              <span className="text-xs tracking-wider uppercase text-amber-700 font-semibold">
                Suite Empresa
              </span>
            </div>
            <h1 className="text-4xl font-serif text-slate-900 leading-tight">
              Finanzas Comerciales & Flujo de Caja
            </h1>
            <p className="text-slate-500 font-light mt-1">
              Registro contable de ventas procesadas mediante custodia bilateral Web3.
            </p>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-2">
              Ingresos Totales (Mes)
            </span>
            <div className="text-3xl font-serif text-emerald-600 font-bold mb-1">
              $970.00 <span className="text-sm font-sans text-slate-500">USDT eq.</span>
            </div>
            <p className="text-xs text-slate-500 font-light">+18% respecto al mes anterior</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-2">
              Saldos en Custodia
            </span>
            <div className="text-3xl font-serif text-amber-600 font-bold mb-1">
              $0.00 <span className="text-sm font-sans text-slate-500">USDT</span>
            </div>
            <p className="text-xs text-slate-500 font-light">Todas las operaciones cerradas</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <span className="text-xs tracking-wider uppercase text-slate-400 font-medium block mb-2">
              Membresía BRLT Activa
            </span>
            <div className="text-3xl font-serif text-indigo-600 font-bold mb-1">
              12 Meses
            </div>
            <p className="text-xs text-slate-500 font-light">Comisiones reducidas (0.5%)</p>
          </div>
        </div>

        {/* TABLA DE HISTORIAL DE VENTAS */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <h2 className="text-2xl font-serif text-slate-900 mb-6">Registro de Ventas & Cobros Cripto</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Ref / Fecha</th>
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Concepto / Ítem</th>
                  <th className="pb-3 font-semibold">Monto</th>
                  <th className="pb-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 font-mono text-slate-500">
                      <div>{tx.id}</div>
                      <div className="text-[10px] text-slate-400">{tx.date}</div>
                    </td>
                    <td className="py-4 font-semibold text-slate-800">{tx.client}</td>
                    <td className="py-4 text-slate-600">{tx.item}</td>
                    <td className="py-4 font-bold text-slate-900">
                      {tx.amount} {tx.token}
                    </td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tx.status} ✓
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
