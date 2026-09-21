/**
 * Voucher generation helpers.
 *
 * Used at two trigger points (per Task 14-E spec):
 *   1. /api/auth/register — every newly-registered user gets a "signup_bonus"
 *      voucher (default user-type `gratuito` → R$5,00).
 *   2. /api/asaas/webhook + /api/billing/pay/[invoiceId] — when a plan-type
 *      invoice is paid, the user gets a fresh voucher sized to their
 *      `userType` (motorista → R$20, loja → R$50, empresa → R$100, etc.).
 *
 * Codes are 12 chars in the form `NM-XXXX-XXXX` using an unambiguous
 * alphabet (no O/0/I/1) so they can be safely transcribed by users.
 */

import { prisma } from '@/lib/db'

/** Voucher amount in BRL cents, keyed by User.userType. */
export const VOUCHER_AMOUNTS_BY_USER_TYPE: Record<string, number> = {
  gratuito: 500, // R$ 5,00
  usuario: 1000, // R$ 10,00
  motorista: 2000, // R$ 20,00
  entregador: 2000, // R$ 20,00
  loja: 5000, // R$ 50,00
  parceiro: 3000, // R$ 30,00
  empresa: 10000, // R$ 100,00
  afiliado: 1500, // R$ 15,00
}

/**
 * Default voucher amount (R$ 5,00) used when the user type is unknown or
 * missing from the table above.
 */
export const DEFAULT_VOUCHER_AMOUNT_CENTS = 500

/** Voucher type tag stored on the Voucher row for signup-bonus vouchers. */
export const VOUCHER_TYPE_SIGNUP_BONUS = 'signup_bonus'

/** Default voucher validity: 90 days from creation. */
export const VOUCHER_DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000

/**
 * Unambiguous alphabet — excludes 0/O and 1/I so users can't misread
 * transcribed codes.
 */
const VOUCHER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function block(n: number): string {
  let out = ''
  for (let i = 0; i < n; i++) {
    out += VOUCHER_ALPHABET[Math.floor(Math.random() * VOUCHER_ALPHABET.length)]
  }
  return out
}

/**
 * Generate a fresh `NM-XXXX-XXXX` code. The code is NOT guaranteed unique
 * — callers must verify uniqueness before persisting (see
 * `generateVoucherForUser`).
 */
export function generateVoucherCode(): string {
  return `NM-${block(4)}-${block(4)}`
}

/**
 * Resolve the voucher amount (in cents) for a given user type.
 * Falls back to DEFAULT_VOUCHER_AMOUNT_CENTS for unknown types.
 */
export function getVoucherAmountForUserType(userType: string | null | undefined): number {
  if (!userType) return DEFAULT_VOUCHER_AMOUNT_CENTS
  return VOUCHER_AMOUNTS_BY_USER_TYPE[userType] ?? DEFAULT_VOUCHER_AMOUNT_CENTS
}

/**
 * Persist a new signup-bonus voucher for a user, sized to their userType.
 *
 * - Generates a unique `NM-XXXX-XXXX` code (retries on collision).
 * - Sets expiry = now + 90 days (configurable via `ttlMs`).
 * - Voucher type defaults to 'signup_bonus' but can be overridden (e.g.
 *   'plan_bonus' for the second trigger point).
 *
 * Returns `{ code, amount }` on success. Throws only on persistent DB
 * errors — callers should wrap in try/catch so voucher failure doesn't
 * break registration or payment flows.
 */
export async function generateVoucherForUser(
  userId: string,
  userType: string,
  options?: { type?: string; ttlMs?: number }
): Promise<{ code: string; amount: number; voucherId: string }> {
  const amount = getVoucherAmountForUserType(userType)
  const type = options?.type ?? VOUCHER_TYPE_SIGNUP_BONUS
  const ttlMs = options?.ttlMs ?? VOUCHER_DEFAULT_TTL_MS

  // Generate a unique code (defensive: re-roll on collision up to 10 times).
  let finalCode = generateVoucherCode()
  for (let attempt = 0; attempt < 10; attempt++) {
    const exists = await prisma.voucher.findUnique({ where: { code: finalCode } })
    if (!exists) break
    finalCode = generateVoucherCode()
  }

  const created = await prisma.voucher.create({
    data: {
      userId,
      code: finalCode,
      amount,
      type,
      isUsed: false,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })

  return { code: finalCode, amount, voucherId: created.id }
}
