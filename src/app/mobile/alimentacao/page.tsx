'use client'

import { UtensilsCrossed, Flame, Clock, Star } from 'lucide-react'
import { MobileCategoryLayout } from '@/components/mobile/mobile-category-layout'

// ============================================================================
// /mobile/alimentacao — Restaurants / food category.
// ============================================================================

const ACCENT = '#F97316' // orange (NOT blue/indigo)

export default function AlimentacaoPage() {
  return (
    <MobileCategoryLayout
      title="Alimentação"
      accentColor={ACCENT}
      searchPlaceholder="Buscar restaurantes, pratos..."
      category="alimentacao"
      emptyHint="Em breve, restaurantes reais disponíveis na sua região. Use a tela inicial para ver produtos em destaque."
      hero={
        <div>
          {/* Hero banner */}
          <div
            className="rounded-2xl p-4 text-white shadow-md mb-3"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, #C2410C 100%)`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="h-5 w-5" />
              <p className="text-sm font-bold">Comida que chega quentinha</p>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed">
              Restaurantes parceiros com entrega rápida e cashback em cada
              pedido.
            </p>
          </div>

          {/* Quick filter chips */}
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
            <FilterChip icon={Flame} label="Em alta" />
            <FilterChip icon={Clock} label="Entrega rápida" />
            <FilterChip icon={Star} label="Melhor avaliados" />
            <FilterChip icon={Flame} label="Promoções" />
          </div>
        </div>
      }
    />
  )
}

function FilterChip({
  icon: Icon,
  label,
}: {
  icon: typeof Flame
  label: string
}) {
  return (
    <button
      className="flex-shrink-0 px-3 h-8 rounded-full bg-white border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 min-h-[44px]"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}
