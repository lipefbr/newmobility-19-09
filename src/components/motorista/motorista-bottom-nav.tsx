'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Route, Wallet, LayoutGrid, Car } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// MotoristaBottomNav
//
// Fixed bottom navigation bar for the NewMobility motorista app. 5 items:
//   Início | Corridas | [central FAB car] | Carteira | Mais
//
// All links use absolute paths under /motorista/* so the app stays fully
// self-contained for future WebView wrapping. Inactive icons are grey
// (#9CA3AF), active icon + label are blue (#155EEF).
//
// The central FAB is a large elevated blue circle with a car icon (the
// "driving dashboard" tab — always active when on /motorista/inicio).
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'inicio', label: 'Início', href: '/motorista/inicio', icon: Home },
  { key: 'corridas', label: 'Corridas', href: '/motorista/corridas', icon: Route },
  // central FAB occupies slot 3 — handled separately below
  { key: 'carteira', label: 'Carteira', href: '/motorista/carteira', icon: Wallet },
  { key: 'mais', label: 'Mais', href: '/motorista/mais', icon: LayoutGrid },
] as const

const PRIMARY = '#155EEF'
const INACTIVE = '#9CA3AF'

export function MotoristaBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/motorista/inicio') return pathname === '/motorista/inicio'
    return pathname?.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação motorista"
    >
      <div className="relative flex items-end justify-around h-16 px-2 max-w-md mx-auto">
        {/* Left: Início + Corridas */}
        <div className="flex flex-1 justify-around">
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px] min-h-[44px] rounded-lg transition-colors"
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: active ? PRIMARY : INACTIVE }}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: active ? PRIMARY : INACTIVE }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Center: floating FAB (car) */}
        <Link
          href="/motorista/inicio"
          className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center"
          aria-label="Painel do motorista"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-xl ring-4 ring-white"
            style={{ backgroundColor: PRIMARY }}
          >
            <Car className="h-7 w-7 text-white" strokeWidth={2.5} />
          </span>
        </Link>

        {/* Right: Carteira + Mais */}
        <div className="flex flex-1 justify-around">
          {NAV_ITEMS.slice(2).map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px] min-h-[44px] rounded-lg transition-colors"
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: active ? PRIMARY : INACTIVE }}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: active ? PRIMARY : INACTIVE }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
