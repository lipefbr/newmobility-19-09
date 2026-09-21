'use client'

/**
 * Admin permissions enforcement layer.
 *
 * The admin panel ships with a per-role page allow-list stored in the
 * `admin_permissions` SystemConfig row (see
 * src/app/api/admin/permissions/route.ts). This module exposes a
 * `useAdminPermissions()` hook that fetches that map once per session and
 * provides a `canAccess(pageKey)` helper used by the admin sidebar and
 * admin page router to hide / block pages the current admin role is not
 * allowed to see.
 *
 * Rules:
 *  - Super admins (User.role === 'admin' OR User.userType === 'admin') always
 *    see everything. They never even hit the API.
 *  - Sub-admin roles are filtered by the allow-list stored for their
 *    `User.role` key. A `['*']` entry means "all pages".
 *  - If the permissions fail to load, sub-admins are fail-safe to
 *    "dashboard only". Super admins stay fail-open (everything).
 *  - The `dashboard` page is always visible to any logged-in admin so they
 *    never get stranded.
 *
 * Caching strategy:
 *  - A module-level `moduleCache` survives React re-renders and component
 *    unmount/remount cycles within a session.
 *  - A small dedicated Zustand store (`useAdminPermissionsStore`) mirrors
 *    the cache into React state so components re-render when permissions
 *    resolve. Components should consume the hook, not the store directly.
 */

import { useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { apiFetch } from '@/lib/api'
import type { UserData } from '@/lib/store'

// ---------- Types ----------

export type PermissionsMap = Record<string, string[]>

interface AdminPermissionsStoreState {
  permissions: PermissionsMap | null
  loadedForUserId: string | null
  loading: boolean
  error: string | null
  load: (userId: string) => Promise<void>
  reset: () => void
}

export interface UseAdminPermissionsResult {
  /** Returns true if the current admin may view the given page key. */
  canAccess: (pageKey: string) => boolean
  /** True while the permissions map is being fetched. */
  loading: boolean
  /** Error message if the fetch failed, else null. */
  error: string | null
  /** True if the current user is a super admin (sees everything). */
  isSuperAdmin: boolean
}

// ---------- Module-level cache ----------

interface ModuleCache {
  userId: string | null
  permissions: PermissionsMap | null
  error: string | null
  promise: Promise<PermissionsMap | null> | null
}

let moduleCache: ModuleCache = {
  userId: null,
  permissions: null,
  error: null,
  promise: null,
}

// ---------- Helpers ----------

/**
 * Super admin detection. Mirrors the API route check
 * (`admin.role !== 'admin'` → 403) and also accepts the legacy
 * `userType === 'admin'` flag for backwards compatibility.
 */
export function isSuperAdmin(user: UserData | null | undefined): boolean {
  if (!user) return false
  return user.role === 'admin' || user.userType === 'admin'
}

/**
 * Maps a user to the role key used in the permissions map. The
 * permissions map is keyed by role name (e.g. "admin", "support",
 * "financeiro"). We fall back to 'user' for safety.
 */
function getRoleKey(user: UserData | null | undefined): string {
  if (!user) return 'user'
  return user.role || 'user'
}

// ---------- Zustand store (session cache mirror) ----------

export const useAdminPermissionsStore = create<AdminPermissionsStoreState>((set) => ({
  permissions: moduleCache.permissions,
  loadedForUserId: moduleCache.userId,
  loading: false,
  error: moduleCache.error,
  load: async (userId: string) => {
    if (!userId) return

    // Cache hit — same user, already loaded (success or known error).
    if (
      moduleCache.userId === userId &&
      (moduleCache.permissions !== null || moduleCache.error !== null) &&
      moduleCache.promise === null
    ) {
      set({
        permissions: moduleCache.permissions,
        loadedForUserId: userId,
        loading: false,
        error: moduleCache.error,
      })
      return
    }

    // If a fetch is already in flight for this user, await it.
    if (moduleCache.userId === userId && moduleCache.promise) {
      set({ loading: true })
      try {
        const perms = await moduleCache.promise
        set({
          permissions: perms,
          loadedForUserId: userId,
          loading: false,
          error: moduleCache.error,
        })
      } catch {
        set({ loading: false, error: moduleCache.error })
      }
      return
    }

    // Start a fresh fetch.
    moduleCache.userId = userId
    moduleCache.error = null
    moduleCache.promise = (async () => {
      try {
        const res = await apiFetch<{ permissions: PermissionsMap }>(
          `/admin/permissions?userId=${encodeURIComponent(userId)}`,
        )
        const perms: PermissionsMap = res?.permissions || {}
        moduleCache.permissions = perms
        moduleCache.error = null
        return perms
      } catch (err) {
        moduleCache.permissions = null
        moduleCache.error =
          err instanceof Error ? err.message : 'Erro ao carregar permissões'
        return null
      } finally {
        moduleCache.promise = null
      }
    })()

    set({ loading: true })
    try {
      const perms = await moduleCache.promise
      set({
        permissions: perms,
        loadedForUserId: userId,
        loading: false,
        error: moduleCache.error,
      })
    } catch {
      set({ loading: false, error: moduleCache.error })
    }
  },
  reset: () => {
    moduleCache = { userId: null, permissions: null, error: null, promise: null }
    set({
      permissions: null,
      loadedForUserId: null,
      loading: false,
      error: null,
    })
  },
}))

// ---------- Hook ----------

/**
 * Fetches the current admin's permissions and exposes a `canAccess`
 * helper. Safe to call from multiple components — the underlying fetch
 * is deduplicated via the module-level cache and Zustand store.
 */
export function useAdminPermissions(
  user: UserData | null | undefined,
): UseAdminPermissionsResult {
  const permissions = useAdminPermissionsStore((s) => s.permissions)
  const loading = useAdminPermissionsStore((s) => s.loading)
  const error = useAdminPermissionsStore((s) => s.error)
  const load = useAdminPermissionsStore((s) => s.load)

  const superAdmin = isSuperAdmin(user)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) return
    // Super admins bypass the fetch entirely.
    if (superAdmin) return
    void load(userId)
  }, [userId, superAdmin, load])

  const canAccess = useCallback(
    (pageKey: string): boolean => {
      // Super admin always sees everything.
      if (superAdmin) return true
      // Dashboard is the safe landing page — always allow.
      if (pageKey === 'dashboard') return true
      // Until permissions resolve (loading) or if they failed to load,
      // fail-safe to dashboard-only for sub-admins.
      if (!permissions) return false
      const roleKey = getRoleKey(user)
      const allowed = permissions[roleKey] || []
      if (allowed.includes('*')) return true
      return allowed.includes(pageKey)
    },
    [permissions, superAdmin, user],
  )

  return { canAccess, loading, error, isSuperAdmin: superAdmin }
}

// ---------- Convenience: non-hook imperative accessor ----------

/**
 * Synchronous accessor for the currently cached permissions. Useful in
 * places where a hook cannot be used (e.g. outside React). Returns null
 * if no permissions have been loaded yet for the given user.
 */
export function getCachedPermissionsFor(
  userId: string,
): PermissionsMap | null {
  if (moduleCache.userId !== userId) return null
  return moduleCache.permissions
}
