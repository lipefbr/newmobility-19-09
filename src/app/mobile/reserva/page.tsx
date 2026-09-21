'use client'

import { useState } from 'react'
import { CalendarCheck, Calendar, Clock, Users, MapPin, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'

// ============================================================================
// /mobile/reserva — Reservations (restaurants, venues, services).
// ----------------------------------------------------------------------------
// Reservation form (date, time, people count) + a list of suggested venues
// (static mock — real venues will come from the /admingeral panel).
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'
const ACCENT = '#9333EA' // purple (NOT blue/indigo)

interface Venue {
  id: string
  name: string
  category: string
  rating: number
  address: string
  priceRange: string
}

const VENUES: Venue[] = [
  {
    id: 'v1',
    name: 'Restaurante Bella Italia',
    category: 'Italiana',
    rating: 4.8,
    address: 'Rua das Flores, 123 - Centro',
    priceRange: '$$',
  },
  {
    id: 'v2',
    name: 'Sushi Yamato',
    category: 'Japonesa',
    rating: 4.9,
    address: 'Av. Paulista, 500 - Bela Vista',
    priceRange: '$$$',
  },
  {
    id: 'v3',
    name: 'Churrascaria Gaúcha',
    category: 'Brasileira',
    rating: 4.7,
    address: 'Rod. BR-116, km 30',
    priceRange: '$$',
  },
  {
    id: 'v4',
    name: 'Café Central',
    category: 'Cafeteria',
    rating: 4.6,
    address: 'Praça Central, 10',
    priceRange: '$',
  },
]

export default function ReservaPage() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [people, setPeople] = useState('2')
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const onReserve = (venueName?: string) => {
    if (!date || !time) {
      toast.error('Selecione data e horário')
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success(
        `Reserva solicitada${venueName ? ` em ${venueName}` : ''}! Em breve confirmaremos por notificação.`
      )
    }, 700)
  }

  return (
    <MobileAppShell>
      {/* Header */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: `linear-gradient(160deg, ${ACCENT} 0%, #6B21A8 100%)`,
        }}
      >
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="px-3 h-14 flex items-center gap-2">
          <h1 className="flex-1 text-base font-bold text-white text-center">
            Reservas
          </h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* Reservation form */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="h-5 w-5" style={{ color: ACCENT }} />
            <p className="text-sm font-bold text-gray-900">Nova reserva</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Data
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Horário
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Pessoas
                </label>
                <select
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none min-h-[44px]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} {n === 1 ? 'pessoa' : 'pessoas'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Venues list */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Locais disponíveis</h2>
          <div className="space-y-3">
            {VENUES.map((venue, idx) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ backgroundColor: MINT_BG }}
                  >
                    <CalendarCheck className="h-5 w-5" style={{ color: '#059669' }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {venue.name}
                      </p>
                      <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">
                        {venue.priceRange}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-1">{venue.category}</p>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="h-3 w-3" fill="#F59E0B" style={{ color: '#F59E0B' }} />
                      <span className="text-[10px] font-semibold text-gray-700">
                        {venue.rating}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{venue.address}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onReserve(venue.name)}
                  disabled={submitting || !date || !time}
                  className="w-full mt-3 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 min-h-[44px]"
                  style={{ backgroundColor: ACCENT }}
                >
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Reservar
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Info */}
        <div
          className="rounded-xl p-3 mt-4 flex items-start gap-2"
          style={{ backgroundColor: MINT_BG }}
        >
          <CalendarCheck className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            Reservas são confirmadas pelo estabelecimento. Você receberá uma
            notificação no app. Em breve: integração com agenda real.
          </p>
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
