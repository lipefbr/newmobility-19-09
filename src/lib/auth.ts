// Lightweight session helper used by the billing API routes.
//
// The NewMobility app keeps the logged-in user in a Zustand store on the
// client (see `src/lib/store.ts`). Every API call therefore needs to send
// the userId explicitly — either as a `?userId=` query param (GET) or as
// a `userId` field in the JSON body (POST/PUT/DELETE).
//
// `getSession()` centralises that lookup so individual routes can simply do:
//
//   const session = await getSession(request)
//   if (!session) return error('Unauthorized', 401)
//
// and trust that `session.userId` / `session.role` / `session.user` are
// populated (or null when no valid user was supplied).
//
// NOTE: this is NOT a cookie/JWT-based auth — it is the same pattern every
// other route in this project already uses (see /api/dashboard, /api/invoices,
// /api/cashback/*, etc.). Centralising it here just makes the billing code
// cleaner and gives us a single place to harden later if we add real
// server-side sessions.

import { db } from '@/lib/db'

export interface Session {
  userId: string
  role: string
  isActive: boolean
  plan: string
  /** Full user row (minus password). Useful when a route needs more fields. */
  user: Omit<Record<string, unknown>, 'password'>
}

/**
 * Resolve the current session from a Next.js Request.
 *
 * Looks for `userId` in:
 *   1. The URL query string (`?userId=...`) — used by GET requests.
 *   2. The JSON request body (`{ userId: '...' }`) — used by POST/PUT.
 *
 * Returns null when no userId is supplied or the user does not exist.
 */
export async function getSession(request: Request): Promise<Session | null> {
  let userId: string | undefined | null = null

  // 1. Query string
  try {
    const url = new URL(request.url)
    userId = url.searchParams.get('userId') || undefined
  } catch {
    // request.url may be unavailable in some edge runtimes — ignore.
  }

  // 2. JSON body (only if not already found in the query and the body looks
  //    like JSON). We clone the request so the caller can still read the
  //    body afterwards if it needs to.
  if (!userId) {
    try {
      const ct = request.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const clone = request.clone()
        const body = await clone.json().catch(() => null)
        if (body && typeof body === 'object' && typeof body.userId === 'string') {
          userId = body.userId
        }
      }
      // Tarefa (19/09): também extrai userId de multipart/form-data.
      // Antes, uploads de imagem (que usam FormData) não conseguiam
      // autenticar porque getSession não lia campos de FormData.
      if (!userId && ct.includes('multipart/form-data')) {
        const clone = request.clone()
        const formData = await clone.formData().catch(() => null)
        if (formData) {
          const fdUserId = formData.get('userId')
          if (typeof fdUserId === 'string') {
            userId = fdUserId
          }
        }
      }
    } catch {
      // Body already consumed or not JSON — ignore.
    }
  }

  if (!userId) return null

  const user = await db.findOne('User', '"id" = $1', [userId])
  if (!user) return null

  // Strip password before exposing.
  const { password: _pwd, ...safeUser } = user

  return {
    userId: user.id,
    role: user.role || 'user',
    isActive: !!user.isActive,
    plan: user.plan || 'free',
    user: safeUser,
  }
}
