import { NextRequest } from 'next/server'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import { getAsaasConfig } from '@/lib/asaas'

/**
 * GET /api/asaas/status
 *
 * Lightweight public endpoint that returns whether the Asaas payment
 * gateway is configured (i.e. an admin has saved an API key in
 * SystemConfig under `asaas_api_key`).
 *
 * Used by the billing page (Task 2-e, Item 5) to decide what UI to show
 * when the user clicks "Pagar Fatura":
 *
 *   - configured === true  → open the AsaasPaymentDialog (real PIX/Boleto
 *                            payment through the Asaas gateway; status is
 *                            polled / updated via webhook).
 *   - configured === false → show a clear "Pagamento não disponível —
 *                            entre em contato com o suporte" message
 *                            instead of silently marking the invoice as
 *                            paid.
 *
 * Does NOT require admin — only the boolean `configured` flag is exposed
 * (no API key, no environment, no balance). Any authenticated user can
 * call it.
 *
 * Query: ?userId=<caller-id>  (required for session resolution)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return error('Unauthorized', 401)
    }

    // Best-effort: returns true when an Asaas API key is stored in the
    // SystemConfig table. We deliberately do NOT validate the key against
    // Asaas here (that would add a network round-trip on every billing
    // page load) — if the key is invalid, the AsaasPaymentDialog will
    // surface the error when the user actually tries to create a payment.
    let configured = false
    try {
      const cfg = await getAsaasConfig()
      configured = !!cfg?.apiKey
    } catch {
      configured = false
    }

    return success({ configured })
  } catch (err) {
    console.error('GET /api/asaas/status error:', err)
    return error('Internal server error', 500)
  }
}
