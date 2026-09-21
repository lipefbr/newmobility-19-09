'use client'

import { useRouter } from 'next/navigation'
import { Compass, ChevronLeft } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// /lojista/not-found
//
// Custom 404 for the lojista app. Keeps the user inside /lojista — the
// button goes to /lojista/inicio (or /lojista/login if not authenticated),
// NEVER to the main site root.
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY = '#155EEF'

export default function LojistaNotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div style={{ height: 'env(safe-area-inset-top)' }} />

      <div
        className="flex h-24 w-24 items-center justify-center rounded-full mb-6"
        style={{ backgroundColor: '#EFF6FF' }}
      >
        <Compass className="h-11 w-11" style={{ color: PRIMARY }} strokeWidth={2} />
      </div>

      <p className="text-5xl font-bold text-gray-900 mb-2">404</p>
      <h1 className="text-lg font-semibold text-gray-900 mb-2">Página não encontrada</h1>
      <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed mb-8">
        A tela que você procura não existe ou ainda não foi implementada no
        painel do Lojista NewMobility.
      </p>

      <button
        onClick={() => router.replace('/lojista/inicio')}
        className="h-12 px-8 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
        style={{ backgroundColor: PRIMARY }}
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar ao início
      </button>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
