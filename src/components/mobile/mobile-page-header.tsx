'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// MobilePageHeader
//
// Reusable sticky blue header for authenticated /mobile/* screens (carteira,
// enviar, depositar, receber, sacar, pedidos, perfil, notificacoes, etc.).
//
// Layout:
//   - Sticky at top, blue gradient background (primary #155EEF → darker)
//   - Safe-area inset spacer at top for notched phones
//   - Row with: back button (→ /mobile/inicio by default, or `backHref`) +
//     centered title + optional right-side action slot
//
// Touch targets are 44x44 minimum (back button is h-10 w-10 inside h-12 row).
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY = '#155EEF'

interface MobilePageHeaderProps {
  title: string
  /** Where the back arrow goes. Defaults to /mobile/inicio. */
  backHref?: string
  /** Optional right-side node (e.g. a button or icon). */
  right?: ReactNode
  /** Override the back behavior with a custom handler (e.g. router.back()). */
  onBack?: () => void
}

export function MobilePageHeader({
  title,
  backHref = '/mobile/inicio',
  right,
  onBack,
}: MobilePageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push(backHref)
    }
  }

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: `linear-gradient(160deg, ${PRIMARY} 0%, #0B4FE0 100%)`,
      }}
    >
      <div style={{ height: 'env(safe-area-inset-top)' }} />
      <div className="px-3 h-14 flex items-center gap-2">
        <button
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5 text-white" strokeWidth={2.5} />
        </button>
        <h1
          className="flex-1 text-base font-bold text-white truncate text-center"
          style={{ maxWidth: 'calc(100% - 120px)' }}
        >
          {title}
        </h1>
        {/* right slot — keep its width consistent even when empty so the title stays centered */}
        <div className="w-10 flex justify-end">{right}</div>
      </div>
    </header>
  )
}
