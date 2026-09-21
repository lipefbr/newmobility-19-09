'use client'

import { ShoppingCart, Truck, Apple } from 'lucide-react'
import { MobileCategoryLayout } from '@/components/mobile/mobile-category-layout'

// ============================================================================
// /mobile/mercado — Grocery / supermarket category.
// ============================================================================

const ACCENT = '#16A34A' // green

export default function MercadoPage() {
  return (
    <MobileCategoryLayout
      title="Mercado"
      accentColor={ACCENT}
      searchPlaceholder="Buscar produtos de mercado..."
      category="mercado"
      emptyHint="Em breve, mercados parceiros com entrega em casa. Por enquanto, veja os produtos em destaque."
      hero={
        <div>
          <div
            className="rounded-2xl p-4 text-white shadow-md mb-3"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, #15803D 100%)`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-5 w-5" />
              <p className="text-sm font-bold">Mercado em casa</p>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed">
              Faça suas compras de mercado sem sair de casa. Entrega em até 2h.
            </p>
          </div>

          {/* Quick categories */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <QuickCat icon={Apple} label="Frutas" />
            <QuickCat icon={Apple} label="Legumes" />
            <QuickCat icon={Apple} label="Carnes" />
            <QuickCat icon={Apple} label="Bebidas" />
          </div>
        </div>
      }
    />
  )
}

function QuickCat({
  icon: Icon,
  label,
}: {
  icon: typeof Apple
  label: string
}) {
  return (
    <button
      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-gray-100 hover:shadow-sm transition-shadow min-h-[44px]"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: '#EAF7EF' }}
      >
        <Icon className="h-4 w-4" style={{ color: '#059669' }} />
      </span>
      <span className="text-[10px] font-semibold text-gray-700">{label}</span>
    </button>
  )
}
