'use client'

import { ReactNode } from 'react'
import { MotoristaBottomNav } from './motorista-bottom-nav'

// ─────────────────────────────────────────────────────────────────────────────
// MotoristaAppShell
//
// Wraps every authenticated /motorista/* screen. Provides:
//   - White background
//   - Bottom padding so content isn't hidden behind the fixed bottom nav
//   - The <MotoristaBottomNav /> with the active tab highlighted
//
// Login and block screens do NOT use this shell (no bottom nav until the
// driver is authenticated).
// ─────────────────────────────────────────────────────────────────────────────

export function MotoristaAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 pb-24">{children}</main>
      <MotoristaBottomNav />
    </div>
  )
}
