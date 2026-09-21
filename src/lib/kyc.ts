/**
 * KYC blocking helper.
 *
 * A user is "blocked" (cannot withdraw, graduate plan, or release cashback)
 * until an admin approves their KYC documents. The user.kycStatus field has
 * four states: 'none' | 'pending' | 'approved' | 'rejected'.
 *
 * Only 'approved' unblocks the account.
 */

export interface KycAwareUser {
  kycStatus: string
  kycRejectedReason?: string | null
  name?: string | null
}

/**
 * Returns true if the user's KYC is NOT approved (i.e. account is blocked
 * from withdrawals, plan graduation, and cashback release).
 */
export function isUserKycBlocked(user: KycAwareUser | null | undefined): boolean {
  if (!user) return true
  return user.kycStatus !== 'approved'
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side KYC approval check (used by API routes to gate state-changing
// operations: withdrawals, transfers, cashback/gratification claims, plan
// upgrades).
//
// We keep an in-memory cache per userId so that rapid successive requests
// from the same user (e.g. a double-click on "Sacar") don't all hit the DB.
// Cache TTL is 60 seconds; after that the next call re-queries the DB so an
// admin approval propagates within a minute.
//
// `prisma` is imported dynamically so that this file stays client-safe — the
// pure constants/types above (KYC_DOC_TYPES, KycAwareUser, isUserKycBlocked)
// can still be imported from client components without pulling the Prisma
// client into the browser bundle.
// ─────────────────────────────────────────────────────────────────────────────

const KYC_CACHE_TTL_MS = 60_000
const kycApprovalCache = new Map<string, { result: boolean; ts: number }>()

function isAdminUser(role: string | null | undefined, userType: string | null | undefined): boolean {
  if (role === 'admin') return true
  if (userType === 'admin' || userType === 'ADMIN') return true
  return false
}

/**
 * Returns true if the user is allowed to perform KYC-gated actions
 * (withdrawals, transfers, cashback/gratification claims, plan upgrades).
 *
 * Returns true when:
 *   - The user is an admin (role === 'admin' OR userType === 'admin'/'ADMIN')
 *   - The user's kycStatus === 'approved'
 * Returns false otherwise (including 'pending', 'rejected', 'none', or if
 * the user can't be found / DB errors out — fail-closed).
 *
 * Result is cached in-memory for 60 seconds per userId.
 */
export async function isKycApproved(userId: string): Promise<boolean> {
  if (!userId) return false

  // 1. Check in-memory cache
  const cached = kycApprovalCache.get(userId)
  if (cached && Date.now() - cached.ts < KYC_CACHE_TTL_MS) {
    return cached.result
  }

  // 2. Load user from DB (dynamic import keeps this file client-safe)
  let result = false
  try {
    const { prisma } = await import('@/lib/db')
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, role: true, userType: true },
    })
    if (!user) {
      result = false
    } else if (isAdminUser(user.role, user.userType)) {
      result = true // admin bypass
    } else {
      result = user.kycStatus === 'approved'
    }
  } catch (err) {
    // Fail-closed: if we can't verify KYC, block the action.
    console.error('[isKycApproved] error checking KYC for user', userId, err)
    result = false
  }

  // 3. Cache and return
  kycApprovalCache.set(userId, { result, ts: Date.now() })
  return result
}

/**
 * Invalidate the cached KYC approval result for a user. Call this from admin
 * approve/reject endpoints so that the new status is reflected immediately
 * (rather than waiting up to 60s for the cache to expire).
 */
export function invalidateKycCache(userId: string): void {
  kycApprovalCache.delete(userId)
}

/**
 * Friendly PT-BR message explaining what's blocked and (if rejected) why.
 * Use this on withdrawal / graduation / cashback screens to tell the user
 * what they need to do.
 */
export function getKycBlockMessage(user: KycAwareUser | null | undefined): string {
  if (!user) {
    return 'Você precisa estar autenticado para realizar esta operação.'
  }

  switch (user.kycStatus) {
    case 'approved':
      return 'Seus documentos foram verificados. Você pode realizar saques, liberar cashback e evoluir de plano.'
    case 'pending':
      return 'Seus documentos estão em análise pela nossa equipe (geralmente 24h). Saques, liberação de cashback e evolução de plano ficarão bloqueados até a aprovação.'
    case 'rejected': {
      const reason = user.kycRejectedReason?.trim()
      if (reason) {
        return `Seus documentos foram rejeitados: ${reason}. Reenvie os documentos na aba KYC para liberar saques, cashback e evolução de plano.`
      }
      return 'Seus documentos foram rejeitados. Reenvie os documentos na aba KYC para liberar saques, cashback e evolução de plano.'
    }
    case 'none':
    default:
      return 'Envie seus documentos na aba KYC para liberar saques, cashback e evolução de plano.'
  }
}

/**
 * The 6 document types the user must upload (per the NewMobility spec).
 * Order matters: CNH frente → CNH verso → RG frente → RG verso → comprovante → selfie.
 * The selfie (user holding the document) was added per BACK-4 to fix the
 * "Tipo de documento inválido" error when uploading the selfie step.
 */
export const KYC_DOC_TYPES = [
  'cnh_front',
  'cnh_back',
  'rg_front',
  'rg_back',
  'proof_address',
  'selfie_document',
] as const

export type KycDocType = (typeof KYC_DOC_TYPES)[number]

export const KYC_DOC_LABELS: Record<KycDocType, string> = {
  cnh_front: 'CNH Frente',
  cnh_back: 'CNH Verso',
  rg_front: 'RG Frente',
  rg_back: 'RG Verso',
  proof_address: 'Comprovante de Endereço',
  selfie_document: 'Selfie com Documento',
}
