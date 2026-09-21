'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Sparkles, Wrench, Store } from 'lucide-react'
import { LojistaAppShell } from './lojista-app-shell'

// ─────────────────────────────────────────────────────────────────────────────
// LojistaComingSoon
//
// Reusable placeholder screen for /lojista/* routes that haven't been built
// yet (pedidos, financeiro, mais). Keeps the user inside /lojista — the back
// button goes to /lojista/inicio, never outside.
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY = '#155EEF'

export function LojistaComingSoon({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description?: string
  icon?: typeof Sparkles
}) {
  const router = useRouter()
  const IconCmp = Icon || Wrench

  return (
    <LojistaAppShell>
      {/* Mini header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/lojista/inicio')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px]"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full mb-5"
          style={{ backgroundColor: '#EFF6FF' }}
        >
          <IconCmp className="h-9 w-9" style={{ color: PRIMARY }} strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Em breve</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {description ||
            `Estamos preparando esta área para você. A funcionalidade "${title}" estará disponível em uma próxima atualização do painel da loja.`}
        </p>
        <div
          className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{ backgroundColor: '#EFF6FF', color: PRIMARY }}
        >
          <Sparkles className="h-3 w-3" />
          Em desenvolvimento
        </div>
      </div>
    </LojistaAppShell>
  )
}

// Export Store icon so callers can pass it as `icon={Store}` without a second
// import. Convenience only.
export { Store as StoreIcon }
