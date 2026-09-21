'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pill, Upload, FileText, Truck, Clock, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { MobileCategoryLayout } from '@/components/mobile/mobile-category-layout'

// ============================================================================
// /mobile/medidrop — Pharmacy category (MediDrop).
// ----------------------------------------------------------------------------
// Adds an "Upload de receita" button at the top (toast for now — no backend
// endpoint yet), plus pharmacy products grid below.
// ============================================================================

const ACCENT = '#0D9488' // teal

export default function MediDropPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  const onUpload = () => {
    setUploading(true)
    setTimeout(() => {
      setUploading(false)
      toast.success('Receita enviada! Em breve nossa equipe confirmará o pedido.')
    }, 800)
  }

  return (
    <MobileCategoryLayout
      title="MediDrop"
      accentColor={ACCENT}
      searchPlaceholder="Buscar medicamentos..."
      category="pharmacy"
      emptyHint="Em breve, medicamentos e produtos de farmácia com entrega expressa."
      hero={
        <div>
          {/* Hero */}
          <div
            className="rounded-2xl p-4 text-white shadow-md mb-3"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, #115E59 100%)`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Pill className="h-5 w-5" />
              <p className="text-sm font-bold">MediDrop Farmácia</p>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed">
              Medicamentos e produtos de farmácia com entrega expressa e
              descontos exclusivos.
            </p>
          </div>

          {/* Upload receita CTA */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onUpload}
            disabled={uploading}
            className="w-full rounded-xl border-2 border-dashed p-4 mb-3 flex items-center gap-3 transition-colors hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
            style={{ borderColor: `${ACCENT}40`, backgroundColor: `${ACCENT}08` }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
              style={{ backgroundColor: ACCENT }}
            >
              <Upload className="h-4 w-4 text-white" />
            </span>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-gray-900">Enviar receita médica</p>
              <p className="text-[10px] text-gray-500">
                Anexe sua receita e nosso farmacêutico confirmará o pedido
              </p>
            </div>
            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </motion.button>

          {/* Benefits row */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <Benefit icon={Truck} label="Entrega 24h" />
            <Benefit icon={Clock} label="Aberto 24/7" />
            <Benefit icon={ShieldCheck} label="Farmacêutico" />
          </div>
        </div>
      }
    />
  )
}

function Benefit({ icon: Icon, label }: { icon: typeof Truck; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-gray-100">
      <Icon className="h-4 w-4" style={{ color: ACCENT }} />
      <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight">
        {label}
      </span>
    </div>
  )
}
