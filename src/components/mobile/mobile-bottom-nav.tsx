'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  ClipboardList,
  Search,
  Wallet,
  ShoppingBag,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// MobileBottomNav
//
// Fixed bottom navigation bar for the NewMobility mobile app. 5 items:
//   Início (active=blue) | Pedidos | [central FAB sacola] | Procurar | Carteira
//
// All links use absolute paths under /mobile/* so the app stays fully
// self-contained for future WebView wrapping. Inactive icons are grey
// (#6B7280), active icon + label are blue (#155EEF).
//
// The central FAB is elevated above the bar (negative margin + shadow) to
// match the design reference. It links to /mobile/procurar (the main
// "sacola/carrinho" action — will be replaced by a real cart route later).
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'inicio', label: 'Início', href: '/mobile/inicio', icon: Home },
  { key: 'pedidos', label: 'Pedidos', href: '/mobile/pedidos', icon: ClipboardList },
  // central FAB occupies slot 3 — handled separately below
  { key: 'procurar', label: 'Procurar', href: '/mobile/procurar', icon: Search },
  { key: 'carteira', label: 'Carteira', href: '/mobile/carteira', icon: Wallet },
] as const

const PRIMARY = '#155EEF'
const INACTIVE = '#9CA3AF'

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/mobile/inicio') return pathname === '/mobile/inicio'
    return pathname?.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
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

        {/* Center: floating FAB (sacola) */}
        <Link
          href="/mobile/procurar"
          className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center"
          aria-label="Sacola"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-4 ring-white"
            style={{ backgroundColor: PRIMARY }}
          >
            <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.5} />
          </span>
        </Link>

        {/* Right: Procurar + Carteira */}
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
