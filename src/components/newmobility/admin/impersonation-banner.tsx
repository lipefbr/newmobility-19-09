'use client'

/**
 * ImpersonationBanner — Task 18-C
 *
 * Sticky top banner shown while an admin is impersonating another user via
 * the "Login as user" feature (admin-users-panel.tsx → handleLoginAs).
 *
 * Requirements:
 *  - Reads `isImpersonating`, `user`, and `originalAdminId` from the Zustand store.
 *  - Renders null when `isImpersonating` is false.
 *  - Renders an amber banner ABOVE the navbar (must be visible at all times
 *    while impersonating — NOT dismissible, per the safety requirement).
 *  - "Voltar para Admin" button calls POST /api/admin/users/[adminId]/restore-session
 *    to audit-log the restore, swaps the store back to the admin user, clears
 *    the sessionStorage backup flags, and hard-navigates to /?admin=1.
 *  - Subtle slide-down Framer Motion animation on mount.
 *
 * The sessionStorage check is performed separately in app-layout.tsx (on mount)
 * so that the banner re-appears after a page refresh while impersonating.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface RestoreSessionResponse {
  user: Record<string, unknown>
  adminId: string
  adminName: string
  message: string
}

export function ImpersonationBanner() {
  const isImpersonating = useStore((s) => s.isImpersonating)
  const user = useStore((s) => s.user)
  const originalAdminId = useStore((s) => s.originalAdminId)
  const login = useStore((s) => s.login)
  const setImpersonating = useStore((s) => s.setImpersonating)

  const [restoring, setRestoring] = useState(false)

  const handleReturnToAdmin = async () => {
    if (!originalAdminId || !user?.id) return
    setRestoring(true)
    try {
      const res = await apiFetch<RestoreSessionResponse>(
        `/admin/users/${originalAdminId}/restore-session`,
        {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }), // the impersonated user id, for audit
        }
      )
      // Clear impersonation state in BOTH sessionStorage and the store.
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('newmobility_admin_impersonating')
        sessionStorage.removeItem('newmobility_admin_name')
      }
      setImpersonating(false, null)
      // Swap back to the admin user.
      login(res.user as never)
      // Hard-reload to ensure clean state on the admin backoffice root.
      window.location.href = '/?admin=1'
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao restaurar sessão admin'
      )
    } finally {
      setRestoring(false)
    }
  }

  return (
    <AnimatePresence>
      {isImpersonating && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20"
        >
          <div className="px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">
                Você está visualizando como{' '}
                <strong className="font-bold">{user?.name || 'usuário'}</strong>.
                Ações sensíveis estão bloqueadas.
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleReturnToAdmin}
              disabled={restoring || !originalAdminId}
              className="h-7 gap-1.5 text-xs bg-amber-950 text-amber-50 hover:bg-amber-900 border-0 shadow-none disabled:opacity-60"
            >
              {restoring ? (
                <span className="h-3 w-3 border-2 border-amber-100/40 border-t-amber-100 rounded-full animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>Voltar para Admin</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
