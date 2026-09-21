'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// useMobileAuth
//
// Shared auth + wallet hook for every authenticated /mobile/* screen.
//
// Replaces the inline `if (!user?.id) router.replace('/mobile/login')` pattern
// that every page used before. Now each page just does:
//
//   const { user, wallet, loading, refresh, logout } = useMobileAuth()
//
// What it does on mount:
//   1. Reads `user` from the Zustand store (persisted in localStorage).
//   2. If there is no `user.id`, redirects to /mobile/login (no fetch).
//   3. Otherwise, calls GET /api/mobile/me?userId=<id> to refresh the wallet.
//      The response's wallet object is stored in local state AND synced back
//      into the Zustand store (via updateUser) so the store never holds stale
//      balances.
//   4. If the API says isClient is false, the account is a motorista/lojista/
//      entregador and shouldn't be in this app — we log out and redirect to
//      /mobile/login.
//
// Exposed return:
//   - user:    the current UserData (from store, possibly patched with me data)
//   - wallet:  the consolidated MobileWallet (or null while loading)
//   - loading: true while we're either redirecting or fetching /me
//   - error:   last error message (or null)
//   - refresh(): re-fetches /api/mobile/me and updates state
//   - logout(): clears the store and redirects to /mobile/login
// ─────────────────────────────────────────────────────────────────────────────

export interface MobileWallet {
  totalCents: number
  withdrawalCents: number
  mobilityCents: number
  shoppingCents: number
  foodCents: number
  pharmacyCents: number
  gratificationCents: number
  freeCents: number
  pendingCents: number
  paymentInvoiceCents?: number
  careerPoints?: number
  personalPoints?: number
  entradaLevel?: number
  residualLevel?: number
  vendasLevel?: number
}

interface MobileMe {
  user: Record<string, unknown>
  wallet: MobileWallet
  isClient: boolean
  blockReason: string | null
}

export interface UseMobileAuthResult {
  user: ReturnType<typeof useStore.getState>['user']
  wallet: MobileWallet | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  logout: () => void
}

export function useMobileAuth(): UseMobileAuthResult {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const logoutStore = useStore((s) => s.logout)
  const updateUser = useStore((s) => s.updateUser)

  const [wallet, setWallet] = useState<MobileWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      router.replace('/mobile/login')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resp = await apiFetch<MobileMe>(`/mobile/me?userId=${user.id}`)
      if (!resp.isClient) {
        // Not a client account (motorista / lojista / entregador) — kick out.
        logoutStore()
        router.replace('/mobile/login')
        return
      }
      setWallet(resp.wallet)
      // Sync balances back to the Zustand store so any component that reads
      // `user.balanceXxx` gets the fresh values without an extra fetch.
      updateUser({
        balanceWithdrawal: resp.wallet.withdrawalCents,
        balanceMobility: resp.wallet.mobilityCents,
        balanceShopping: resp.wallet.shoppingCents,
        balanceFood: resp.wallet.foodCents,
        balancePharmacy: resp.wallet.pharmacyCents,
        balanceGratification: resp.wallet.gratificationCents,
        balanceFree: resp.wallet.freeCents,
        balancePending: resp.wallet.pendingCents,
        ...(resp.wallet.paymentInvoiceCents !== undefined
          ? { balancePaymentInvoice: resp.wallet.paymentInvoiceCents }
          : {}),
        ...(resp.wallet.careerPoints !== undefined
          ? { careerPoints: resp.wallet.careerPoints }
          : {}),
        ...(resp.wallet.personalPoints !== undefined
          ? { personalPoints: resp.wallet.personalPoints }
          : {}),
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao carregar dados da conta.'
      setError(msg)
      // If the server says the user doesn't exist or session is invalid, kick
      // back to login so the user isn't stuck on a broken page.
      if (
        err instanceof Error &&
        (err.message.includes('não encontrado') ||
          err.message.toLowerCase().includes('unauthorized'))
      ) {
        logoutStore()
        router.replace('/mobile/login')
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id, router, logoutStore, updateUser])

  useEffect(() => {
    refresh()
    // We intentionally only run this once on mount. Pages that need a fresh
    // wallet (e.g. after a transfer) can call refresh() explicitly.
     
  }, [user?.id])

  const logout = useCallback(() => {
    logoutStore()
    router.replace('/mobile/login')
  }, [logoutStore, router])

  return { user, wallet, loading, error, refresh, logout }
}
