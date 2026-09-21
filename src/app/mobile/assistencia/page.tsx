'use client'

import { useState } from 'react'
import {
  LifeBuoy,
  Zap,
  Wrench,
  Car,
  Home,
  Droplet,
  Flame,
  Phone,
  ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'

// ============================================================================
// /mobile/assistencia — Assistance services (electrician, plumber, etc.).
// ----------------------------------------------------------------------------
// Shows a grid of service categories. Tapping one opens a "request" toast
// (no backend service-order endpoint yet — UI only for now).
// ============================================================================

const ACCENT = '#0891B2' // cyan

interface ServiceCategory {
  id: string
  label: string
  icon: typeof Zap
  description: string
}

const SERVICES: ServiceCategory[] = [
  { id: 'eletricista', label: 'Eletricista', icon: Zap, description: 'Instalações, reparos, emergências' },
  { id: 'encanador', label: 'Encanador', icon: Droplet, description: 'Vazamentos, desentupimento' },
  { id: 'mecanico', label: 'Mecânico', icon: Wrench, description: 'Assistência veicular 24h' },
  { id: 'chaveiro', label: 'Chaveiro', icon: Home, description: 'Abertura de portas, cópias' },
  { id: 'gas', label: 'Gás', icon: Flame, description: 'Entrega de botijão, instalação' },
  { id: 'guincho', label: 'Guincho', icon: Car, description: 'Reboque de veículos' },
]

export default function AssistenciaPage() {
  const [requesting, setRequesting] = useState<string | null>(null)

  const onRequest = (service: ServiceCategory) => {
    setRequesting(service.id)
    setTimeout(() => {
      setRequesting(null)
      toast.success(
        `Solicitação de ${service.label} enviada! Em breve um profissional entrará em contato.`
      )
    }, 800)
  }

  return (
    <MobileAppShell>
      {/* Header */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: `linear-gradient(160deg, ${ACCENT} 0%, #155E75 100%)`,
        }}
      >
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="px-3 h-14 flex items-center gap-2">
          <h1 className="flex-1 text-base font-bold text-white text-center">
            Assistência
          </h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* Hero */}
        <div
          className="rounded-2xl p-4 text-white shadow-md mb-4"
          style={{
            background: `linear-gradient(135deg, ${ACCENT} 0%, #155E75 100%)`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <LifeBuoy className="h-5 w-5" />
            <p className="text-sm font-bold">Assistência 24h</p>
          </div>
          <p className="text-[11px] text-white/80 leading-relaxed">
            Solicite profissionais qualificados onde estiver. Atendimento
            rápido e parceiros verificados NewMobility.
          </p>
        </div>

        {/* Service grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {SERVICES.map((service, idx) => {
            const Icon = service.icon
            const isRequesting = requesting === service.id
            return (
              <motion.button
                key={service.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => onRequest(service)}
                disabled={!!requesting}
                className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition-shadow text-left disabled:opacity-50 min-h-[44px]"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl mb-2"
                  style={{ backgroundColor: `${ACCENT}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: ACCENT }} />
                </span>
                <p className="text-sm font-bold text-gray-900">{service.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  {service.description}
                </p>
                <div
                  className="mt-2 inline-flex items-center gap-0.5 text-[10px] font-bold"
                  style={{ color: ACCENT }}
                >
                  {isRequesting ? 'Solicitando...' : 'Solicitar'}
                  {!isRequesting && <ChevronRight className="h-3 w-3" />}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Emergency CTA */}
        <button
          onClick={() => toast.info('Ligue para 0800-NEW-MOBI (em breve)')}
          className="w-full h-12 rounded-xl border-2 border-red-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors min-h-[44px]"
          style={{ color: '#EF4444' }}
        >
          <Phone className="h-4 w-4" />
          Emergência — Ligar agora
        </button>

        {/* Info */}
        <div
          className="rounded-xl p-3 mt-4 flex items-start gap-2"
          style={{ backgroundColor: '#EAF7EF' }}
        >
          <LifeBuoy className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            Todos os profissionais são parceiros verificados. Em breve:
            acompanhamento em tempo real e pagamento via saldo NewMobility.
          </p>
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
