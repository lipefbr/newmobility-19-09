'use client'

import { ReactNode } from 'react'
import { MobileBottomNav } from './mobile-bottom-nav'

// ─────────────────────────────────────────────────────────────────────────────
// MobileAppShell
//
// Wraps every authenticated /mobile/* screen. Provides:
//   - White background
//   - Bottom padding so content isn't hidden behind the fixed bottom nav
//   - The <MobileBottomNav /> with the active tab highlighted
//
// Login and block screens do NOT use this shell (no bottom nav until the user
// is authenticated as a client).
// ─────────────────────────────────────────────────────────────────────────────

export function MobileAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 pb-28">{children}</main>
      <MobileBottomNav />
    </div>
  )
}
