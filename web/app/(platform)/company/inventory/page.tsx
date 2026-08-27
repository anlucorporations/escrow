'use client'

import { useState, useEffect } from 'react'
import { useEthereum } from '@/lib/ethereum'
import { useUserRole } from '@/lib/hooks'
import Link from 'next/link'

interface Store {
  id: string
  name: string
  physical_address: string
  schedule: string
  phone: string
  utm_zone: number
  utm_easting: number
  utm_northing: number
}

export default function CompanyInventoryPage() {
  const { account } = useEthereum()
  const role = useUserRole()
  const [stores, setStores] = useState<Store[]>([
    {
      id: 'store-1',
      name: 'Sucursal Centro Comercial Barlovento',
      physical_address: 'Av. Intercomunal Local 14, Higuerote',
      schedule: 'Lunes a Sábado: 8:00 AM - 6:00 PM',
      phone: '+58 412-4445566',
      utm_zone: 19,
      utm_easting: 728900,
      utm_northing: 1158500,
    },
  ])

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [schedule, setSchedule] = useState('')
  const [phone, setPhone] = useState('')

  const handleAddStore = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !address) return
    const newStore: Store = {
      id: `store-${Date.now()}`,
      name,
      physical_address: address,
      schedule: schedule || 'Lunes a Viernes 9:00 AM - 5:00 PM',
      phone: phone || '+58 412-0000000',
      utm_zone: 19,
      utm_easting: 729000,
      utm_northing: 1159000,
    }
    setStores([...stores, newStore])
    setName('')
    setAddress('')
    setSchedule('')
    setPhone('')
  }

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
              Gestión de Inventario & Locales Fijos
            </h1>
            <p className="text-slate-500 font-light mt-1">
              Configura tus puntos de encuentro comerciales permanentes y catálogo empresarial.
            </p>
          </div>

          <Link
            href="/items/new"
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-semibold tracking-wider uppercase transition shadow-md shadow-amber-600/10"
          >
            + Publicar Ítem Empresarial
          </Link>
        </div>

        {/* TIENDAS Y SUCURSALES COMERCIALES */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-serif text-slate-900">
              Puntos de Entrega & Locales Comerciales ({stores.length})
            </h2>

            <div className="space-y-4">
              {stores.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🏪</span>
                      <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        Abierto
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">{s.physical_address}</p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 font-mono">
                      <span>🕒 {s.schedule}</span>
                      <span>📞 {s.phone}</span>
                      <span>📍 UTM {s.utm_zone}N {s.utm_easting}E, {s.utm_northing}N</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                    Punto Seguro ✓
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* FORMULARIO AGREGAR LOCAL */}
          <div>
            <div className="bg-amber-50/50 rounded-[2rem] border border-amber-200/70 p-6 shadow-sm">
              <h3 className="text-lg font-serif text-amber-950 mb-2">Registrar Sucursal / Local</h3>
              <p className="text-xs text-amber-900/70 mb-6 font-light">
                Los compradores podrán retirar productos en este punto fijo sin citas previas.
              </p>

              <form onSubmit={handleAddStore} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Local
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Tienda Central Barlovento"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, Edificio, Número de Local"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="Ej. Lun a Sáb 8:00 AM - 5:00 PM"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+58 412 1234567"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition shadow-sm"
                >
                  Guardar Local Comercial
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
