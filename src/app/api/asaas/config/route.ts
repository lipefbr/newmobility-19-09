import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import {
  getAsaasConfig,
  setAsaasConfig,
  getAccountBalance,
  maskApiKey,
  type AsaasEnvironment,
  type AsaasBalance,
} from '@/lib/asaas'

/**
 * GET /api/asaas/config?userId=<admin-user-id>
 *
 * Returns the current Asaas integration status, masked API key, environment,
 * webhook URL, and — if the key is configured — the live account balance from
 * the Asaas REST API (/finance/balance). Admin-only.
 *
 * Response shape:
 *   {
 *     configured: boolean,
 *     environment: 'sandbox' | 'production' | null,
 *     apiKeyMasked: string,         // e.g. "$aac_••••••••abcd" or ""
 *     webhookSecretConfigured: boolean,
 *     webhookUrl: string,           // "/api/asaas/webhook"
 *     balance: { balance, blockedBalance, pendingBalance, transferableBalance } | null,
 *     balanceError: string | null,  // populated when balance fetch fails
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const config = await getAsaasConfig()

    if (!config) {
      return success({
        configured: false,
        environment: null,
        apiKeyMasked: '',
        webhookSecretConfigured: false,
        webhookUrl: '/api/asaas/webhook',
        balance: null,
        balanceError: null,
      })
    }

    // Try to fetch live balance from Asaas. Don't fail the whole request if
    // Asaas is unreachable / key invalid — just surface the error to the UI.
    let balance: AsaasBalance | null = null
    let balanceError: string | null = null
    try {
      balance = await getAccountBalance()
    } catch (err: unknown) {
      balanceError =
        err instanceof Error ? err.message : 'Falha ao consultar saldo no Asaas'
    }

    return success({
      configured: true,
      environment: config.environment,
      apiKeyMasked: maskApiKey(config.apiKey),
      webhookSecretConfigured: !!config.webhookSecret,
      webhookUrl: '/api/asaas/webhook',
      balance,
      balanceError,
    })
  } catch (err) {
    console.error('Asaas config GET error:', err)
    return error('Failed to fetch Asaas configuration', 500)
  }
}

/**
 * PUT /api/asaas/config
 * Body: { userId, apiKey, environment, webhookSecret }
 *
 * Admin-only. Persists the Asaas credentials to SystemConfig. After saving,
 * re-fetches the live balance so the UI can show the updated state without a
 * separate reload.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, apiKey, environment, webhookSecret } = body as {
      userId?: string
      apiKey?: string
      environment?: AsaasEnvironment
      webhookSecret?: string
    }

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
      return error('API Key inválida', 400)
    }
    if (environment !== 'sandbox' && environment !== 'production') {
      return error('Ambiente deve ser "sandbox" ou "production"', 400)
    }

    const patch: {
      apiKey: string
      environment: AsaasEnvironment
      webhookSecret?: string
    } = {
      apiKey: apiKey.trim(),
      environment,
    }
    // Allow clearing the secret by sending an empty string
    if (webhookSecret !== undefined) {
      patch.webhookSecret = webhookSecret.trim()
    }

    await setAsaasConfig(patch)

    // Re-read so we can return the masked key + balance back to the UI
    const config = await getAsaasConfig()
    let balance: AsaasBalance | null = null
    let balanceError: string | null = null
    if (config) {
      try {
        balance = await getAccountBalance()
      } catch (err: unknown) {
        balanceError =
          err instanceof Error
            ? err.message
            : 'Falha ao consultar saldo no Asaas'
      }
    }

    return success({
      message: 'Configuração Asaas salva com sucesso',
      configured: !!config,
      environment: config?.environment ?? null,
      apiKeyMasked: config ? maskApiKey(config.apiKey) : '',
      webhookSecretConfigured: !!config?.webhookSecret,
      webhookUrl: '/api/asaas/webhook',
      balance,
      balanceError,
    })
  } catch (err) {
    console.error('Asaas config PUT error:', err)
    return error('Failed to save Asaas configuration', 500)
  }
}
