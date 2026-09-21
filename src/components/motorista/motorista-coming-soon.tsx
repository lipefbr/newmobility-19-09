'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Sparkles, Wrench } from 'lucide-react'
import { MotoristaAppShell } from './motorista-app-shell'

// ─────────────────────────────────────────────────────────────────────────────
// MotoristaComingSoon
//
// Reusable placeholder screen for /motorista/* routes that haven't been built
// yet (corridas, carteira, mais). Keeps the user inside /motorista — the back
// button goes to /motorista/inicio, never outside.
// ─────────────────────────────────────────────────────────────────────────────

export function MotoristaComingSoon({
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
    <MotoristaAppShell>
      {/* Mini header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/motorista/inicio')}
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
          <IconCmp className="h-9 w-9" style={{ color: '#155EEF' }} strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Em breve</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {description ||
            `Estamos preparando esta área para você. A funcionalidade "${title}" estará disponível em uma próxima atualização do app do Motorista.`}
        </p>
        <div
          className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{ backgroundColor: '#EFF6FF', color: '#155EEF' }}
        >
          <Sparkles className="h-3 w-3" />
          Em desenvolvimento
        </div>
      </div>
    </MotoristaAppShell>
  )
}
