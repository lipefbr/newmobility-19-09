'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Wallet, LayoutGrid, Store } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// LojistaBottomNav
//
// Fixed bottom navigation bar for the NewMobility lojista app. 5 items:
//   Início | Pedidos | [central FAB store] | Financeiro | Mais
//
// All links use absolute paths under /lojista/* so the app stays fully
// self-contained for future WebView wrapping. Inactive icons are grey
// (#9CA3AF), active icon + label are blue (#155EEF).
//
// The central FAB is a large elevated blue circle with a storefront icon
// (the "painel da loja" tab — always active when on /lojista/inicio).
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'inicio', label: 'Início', href: '/lojista/inicio', icon: Home },
  { key: 'pedidos', label: 'Pedidos', href: '/lojista/pedidos', icon: ClipboardList },
  // central FAB occupies slot 3 — handled separately below
  { key: 'financeiro', label: 'Financeiro', href: '/lojista/financeiro', icon: Wallet },
  { key: 'mais', label: 'Mais', href: '/lojista/mais', icon: LayoutGrid },
] as const

const PRIMARY = '#155EEF'
const INACTIVE = '#9CA3AF'

export function LojistaBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/lojista/inicio') return pathname === '/lojista/inicio'
    return pathname?.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação lojista"
    >
      <div className="relative flex items-end justify-around h-16 px-2 max-w-md mx-auto">
        {/* Left: Início + Pedidos */}
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

        {/* Center: floating FAB (storefront) */}
        <Link
          href="/lojista/inicio"
          className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center"
          aria-label="Painel da loja"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-xl ring-4 ring-white"
            style={{ backgroundColor: PRIMARY }}
          >
            <Store className="h-7 w-7 text-white" strokeWidth={2.5} />
          </span>
        </Link>

        {/* Right: Financeiro + Mais */}
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
