import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import {
  findOrCreateCustomer,
  sanitizeCpfCnpj,
  type AsaasCustomerInput,
} from '@/lib/asaas'

/**
 * POST /api/asaas/customer
 *
 * Ensures the given user has an Asaas customer linked. If the user already
 * has `asaasCustomerId` set on their row, returns it. Otherwise, calls
 * Asaas `findOrCreateCustomer` with the user's name + cpf + email + phone,
 * persists the returned Asaas customer id on the User row, and returns it.
 *
 * Body: { userId: string }
 * Returns: { customerId: string, customer: AsaasCustomer }
 *
 * Errors:
 *   400 'userId is required'
 *   400 'Cliente Asaas não encontrado' — when the user does not exist OR
 *        does not have a CPF on file (Asaas requires cpfCnpj for billing).
 *   503 'Asaas não configurado' — when the Asaas API key is not set in
 *        SystemConfig (admin must configure it first).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as any))
    const { userId } = body || {}

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('Cliente Asaas não encontrado')
    }

    const cpfCnpj = sanitizeCpfCnpj(user.cpf as string | null | undefined)
    if (!cpfCnpj) {
      // Asaas requires cpfCnpj for any billing customer.
      return error('Cliente Asaas não encontrado')
    }

    // Already linked — return the stored id (still re-fetch from Asaas so the
    // caller can trust the customer still exists there).
    if (user.asaasCustomerId) {
      return success({ customerId: user.asaasCustomerId })
    }

    const input: AsaasCustomerInput = {
      name: user.name || user.email || 'Cliente NewMobility',
      email: user.email || undefined,
      cpfCnpj,
      phone: user.phone || undefined,
      mobilePhone: user.phone || undefined,
      externalReference: user.id,
      notificationDisabled: false,
    }

    const customer = await findOrCreateCustomer(input)

    await db.update('User', '"id" = $1', {
      asaasCustomerId: customer.id,
    }, [userId])

    return success({ customerId: customer.id, customer }, 201)
  } catch (err: any) {
    console.error('Asaas customer ensure error:', err)
    const msg = err?.message || 'Internal server error'
    // AsaasApiError throws with status 503 when key is missing — surface that.
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500
    return error(msg, status >= 400 && status < 600 ? status : 500)
  }
}
