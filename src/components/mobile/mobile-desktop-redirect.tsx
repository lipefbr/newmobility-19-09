'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================================
// MobileDesktopRedirect — Client component that redirects /mobile/* pages
// to the web backoffice (/) when accessed on a desktop/notebook (>= 768px).
// ----------------------------------------------------------------------------
// Rendered inside MobileLayout (a server component). This separation is
// required by Next.js App Router — making the layout itself a client
// component causes "Application error: a client-side exception" in
// production builds.
//
// The redirect fires via useRouter().replace('/') in a useEffect (below).
// On mobile devices (< 768px), no redirect — the user stays in the mobile app.
//
// IMPORTANT: This component returns a loading spinner (renders nothing)
// while on desktop. This prevents the child page from rendering on desktop
// (which would cause race conditions and "Application error" in production).
// On mobile, it renders children.
// ============================================================================

// Check if the current device is mobile (screen width < 768px).
// Returns null on SSR (unknown) so we show a loading spinner until
// the client-side check runs.
function getIsMobile(): boolean | null {
  if (typeof window === 'undefined') return null // SSR
  return window.innerWidth < 768
}

export function MobileDesktopRedirect({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  // Lazy initializer: runs once on client mount. On SSR returns null.
  // This avoids the "set-state-in-effect" lint error by reading the
  // initial value from the function instead of setting it in useEffect.
  const [isMobile] = useState<boolean | null>(getIsMobile)

  // Redirect desktop users to the web backoffice. We use a microtask
  // (setTimeout 0) to avoid calling router.replace during render.
  // No setState here — isMobile is read-only from the lazy initializer.
  if (typeof window !== 'undefined' && isMobile === false) {
    setTimeout(() => router.replace('/'), 0)
  }

  // isMobile === null → SSR or not yet checked → show loading spinner
  // isMobile === false → desktop, redirecting → show loading spinner
  // isMobile === true → mobile → render children
  if (isMobile !== true) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Mobile device — render children normally
  return <>{children}</>
}
