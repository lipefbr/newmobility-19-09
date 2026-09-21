'use client'

import { ShoppingBag, Sparkles } from 'lucide-react'
import { MobileCategoryLayout } from '@/components/mobile/mobile-category-layout'

// ============================================================================
// /mobile/shopping — Shopping category page.
// ----------------------------------------------------------------------------
// Shows featured shopping products in a grid (fetched from
// /api/marketplace/products?category=shopping).
// ============================================================================

const ACCENT = '#155EEF'

export default function ShoppingPage() {
  return (
    <MobileCategoryLayout
      title="Shopping"
      accentColor={ACCENT}
      searchPlaceholder="Buscar produtos..."
      category="shopping"
      emptyHint="Em breve, lojas e produtos reais nesta categoria. Por enquanto, explore os produtos em destaque na tela inicial."
      hero={
        <div
          className="rounded-2xl p-4 text-white shadow-md"
          style={{
            background: `linear-gradient(135deg, ${ACCENT} 0%, #0B4FE0 100%)`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="h-5 w-5" />
            <p className="text-sm font-bold">Shopping NewMobility</p>
          </div>
          <p className="text-[11px] text-white/80 leading-relaxed">
            Compre produtos das melhores lojas parceiras. Cashback em cada
            compra, direto na sua carteira.
          </p>
          <div
            className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Sparkles className="h-3 w-3" />
            Até 15% de cashback
          </div>
        </div>
      }
    />
  )
}
