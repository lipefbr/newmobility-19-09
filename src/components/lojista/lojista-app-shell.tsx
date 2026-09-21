'use client'

import { ReactNode } from 'react'
import { LojistaBottomNav } from './lojista-bottom-nav'

// ─────────────────────────────────────────────────────────────────────────────
// LojistaAppShell
//
// Wraps every authenticated /lojista/* screen. Provides:
//   - White background
//   - Bottom padding so content isn't hidden behind the fixed bottom nav
//   - The <LojistaBottomNav /> with the active tab highlighted
//
// Login and block screens do NOT use this shell (no bottom nav until the
// lojista is authenticated).
// ─────────────────────────────────────────────────────────────────────────────

export function LojistaAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 pb-24">{children}</main>
      <LojistaBottomNav />
    </div>
  )
}
