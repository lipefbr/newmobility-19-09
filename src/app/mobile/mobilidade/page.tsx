'use client'

import { useState } from 'react'
import {
  Car,
  MapPin,
  Navigation,
  Clock,
  Star,
  Radio,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/mobilidade — Ride-hailing UI (NewMobility's "Uber").
// ----------------------------------------------------------------------------
// Shows a map placeholder, a "Solicitar corrida" CTA, and a list of recent
// rides (mock — no real ride endpoint yet).
// ============================================================================

const ACCENT = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'

interface Ride {
  id: string
  driver: string
  rating: number
  from: string
  to: string
  distance: string
  duration: string
  priceCents: number
  date: string
  status: 'completed' | 'cancelled'
}

const RECENT_RIDES: Ride[] = [
  {
    id: 'r1',
    driver: 'Carlos S.',
    rating: 4.9,
    from: 'Shopping Center',
    to: 'Rua das Acácias, 45',
    distance: '4,2 km',
    duration: '12 min',
    priceCents: 1890,
    date: '12/08 18:32',
    status: 'completed',
  },
  {
    id: 'r2',
    driver: 'Marcos L.',
    rating: 4.8,
    from: 'Aeroporto',
    to: 'Hotel Centro',
    distance: '9,8 km',
    duration: '22 min',
    priceCents: 4250,
    date: '10/08 14:05',
    status: 'completed',
  },
]

export default function MobilidadePage() {
  const [requesting, setRequesting] = useState(false)

  const onRide = () => {
    setRequesting(true)
    setTimeout(() => {
      setRequesting(false)
      toast.success('Corrida solicitada! Procurando motorista próximo...')
    }, 1000)
  }

  return (
    <MobileAppShell>
      {/* Header */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: `linear-gradient(160deg, ${ACCENT} 0%, #0B4FE0 100%)`,
        }}
      >
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="px-3 h-14 flex items-center gap-2">
          <h1 className="flex-1 text-base font-bold text-white text-center">
            Mobilidade
          </h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* Map placeholder (styled — no real maps lib) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden shadow-md mb-4 relative h-56"
          style={{
            background: `linear-gradient(135deg, #DBEAFE 0%, #EAF7EF 100%)`,
          }}
        >
          {/* Faux map grid lines */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(0deg, #93C5FD 1px, transparent 1px), linear-gradient(90deg, #93C5FD 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* Faux roads */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(45deg, transparent 40%, #FFFFFF 40%, #FFFFFF 42%, transparent 42%), linear-gradient(-30deg, transparent 60%, #FFFFFF 60%, #FFFFFF 62%, transparent 62%)',
              opacity: 0.6,
            }}
          />

          {/* Pickup pin */}
          <div className="absolute top-1/3 left-1/4 flex flex-col items-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-white shadow-lg"
              style={{ backgroundColor: GREEN }}
            >
              <Navigation className="h-4 w-4 text-white" />
            </span>
            <span className="mt-1 px-2 py-0.5 rounded bg-white text-[9px] font-bold text-gray-700 shadow">
              Você está aqui
            </span>
          </div>

          {/* Destination pin */}
          <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-white shadow-lg"
              style={{ backgroundColor: ACCENT }}
            >
              <MapPin className="h-4 w-4 text-white" />
            </span>
            <span className="mt-1 px-2 py-0.5 rounded bg-white text-[9px] font-bold text-gray-700 shadow">
              Destino
            </span>
          </div>

          {/* Status overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              <Radio className="h-3 w-3" />
              {requesting ? 'Procurando motorista...' : 'Pronto para solicitar'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white text-[10px] font-bold text-gray-700 shadow">
              <Zap className="h-3 w-3" style={{ color: GREEN }} />
              5 motoristas próximos
            </span>
          </div>
        </motion.div>

        {/* Destination input */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GREEN }} />
            <input
              type="text"
              defaultValue="Sua localização atual"
              className="flex-1 text-sm font-medium text-gray-900 bg-transparent focus:outline-none min-h-[44px]"
            />
          </div>
          <div className="border-t border-gray-100 my-1" />
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT }} />
            <input
              type="text"
              placeholder="Para onde vamos?"
              className="flex-1 text-sm font-medium text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400 min-h-[44px]"
            />
          </div>
        </div>

        {/* Ride options */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <RideOption label="Econômico" price="R$ 12,50" duration="15 min" active />
          <RideOption label="Comfort" price="R$ 18,90" duration="12 min" />
          <RideOption label="Moto" price="R$ 8,90" duration="10 min" />
        </div>

        {/* CTA */}
        <button
          onClick={onRide}
          disabled={requesting}
          className="w-full h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          style={{ backgroundColor: ACCENT }}
        >
          {requesting ? (
            <>
              <Radio className="h-4 w-4 animate-pulse" />
              Procurando motorista...
            </>
          ) : (
            <>
              <Car className="h-4 w-4" />
              Solicitar corrida
            </>
          )}
        </button>

        {/* Recent rides */}
        <section className="mt-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Corridas recentes</h2>
          {RECENT_RIDES.length === 0 ? (
            <div className="text-center py-8">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-2"
                style={{ backgroundColor: MINT_BG }}
              >
                <Car className="h-5 w-5" style={{ color: '#059669' }} />
              </div>
              <p className="text-xs text-gray-500">Nenhuma corrida ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {RECENT_RIDES.map((ride, idx) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0"
                        style={{ backgroundColor: MINT_BG }}
                      >
                        <Car className="h-4 w-4" style={{ color: '#059669' }} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {ride.driver}
                        </p>
                        <div className="flex items-center gap-1">
                          <Star className="h-2.5 w-2.5" fill="#F59E0B" style={{ color: '#F59E0B' }} />
                          <span className="text-[10px] text-gray-500">{ride.rating}</span>
                          <span className="text-[10px] text-gray-400">•</span>
                          <span className="text-[10px] text-gray-500">{ride.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                      R$ {formatBRL(ride.priceCents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600 pl-1">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GREEN }} />
                      <span className="truncate">{ride.from}</span>
                    </span>
                    <Clock className="h-2.5 w-2.5 text-gray-400" />
                    <span className="text-gray-500">{ride.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600 pl-1 mt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
                      <span className="truncate">{ride.to}</span>
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{ride.distance}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Info */}
        <div
          className="rounded-xl p-3 mt-4 flex items-start gap-2"
          style={{ backgroundColor: MINT_BG }}
        >
          <Car className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            Em breve: rastreamento em tempo real, pagamento via saldo
            NewMobility e cashback em cada corrida.
          </p>
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}

function RideOption({
  label,
  price,
  duration,
  active,
}: {
  label: string
  price: string
  duration: string
  active?: boolean
}) {
  return (
    <button
      className="p-2 rounded-xl border-2 text-center transition-colors min-h-[44px] flex flex-col justify-center"
      style={{
        borderColor: active ? ACCENT : '#E5E7EB',
        backgroundColor: active ? `${ACCENT}08` : 'white',
      }}
    >
      <p className="text-[11px] font-bold text-gray-900">{label}</p>
      <p className="text-[10px] font-semibold" style={{ color: active ? ACCENT : '#6B7280' }}>
        {price}
      </p>
      <p className="text-[9px] text-gray-500">{duration}</p>
    </button>
  )
}
