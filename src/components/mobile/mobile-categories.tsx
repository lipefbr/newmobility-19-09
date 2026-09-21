'use client'

import Link from 'next/link'
import {
  ShoppingBag,
  UtensilsCrossed,
  ShoppingCart,
  Pill,
  CalendarCheck,
  LifeBuoy,
  Send,
  Car,
  type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Mobile categories
//
// The 8 fixed categories shown on /mobile/inicio. Each maps to a placeholder
// route /mobile/<slug>. The icon + color follow the design system: light
// mint-green background (#EAF7EF) with a dark-green line-art illustration.
//
// These are fixed for now — in the future the admin (/admingeral) will be
// able to toggle visibility/order, but the slugs must stay stable so deep
// links from the home screen don't break.
// ─────────────────────────────────────────────────────────────────────────────

export interface MobileCategory {
  slug: string
  label: string
  icon: LucideIcon
}

export const MOBILE_CATEGORIES: MobileCategory[] = [
  { slug: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { slug: 'alimentacao', label: 'Alimentação', icon: UtensilsCrossed },
  { slug: 'mercado', label: 'Mercado', icon: ShoppingCart },
  { slug: 'medidrop', label: 'MediDrop', icon: Pill },
  { slug: 'reserva', label: 'Reserva', icon: CalendarCheck },
  { slug: 'assistencia', label: 'Assistência', icon: LifeBuoy },
  { slug: 'enviar', label: 'Enviar', icon: Send },
  { slug: 'mobilidade', label: 'Mobilidade', icon: Car },
]

// Quick-link pills below the products section (4 items with "Ver mais")
export const MOBILE_QUICK_LINKS: MobileCategory[] = [
  { slug: 'alimentacao', label: 'Restaurantes', icon: UtensilsCrossed },
  { slug: 'mercado', label: 'Mercado', icon: ShoppingCart },
  { slug: 'medidrop', label: 'Farmácia', icon: Pill },
  { slug: 'shopping', label: 'Eletrônicos', icon: ShoppingBag },
]

// Helper: format cents to BRL string
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Re-export for convenience
export { Link }
