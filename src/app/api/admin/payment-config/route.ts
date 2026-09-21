import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const DEFAULT_PAYMENT_CONFIGS: Record<string, string> = {
  payment_pix_enabled: 'true',
  payment_pix_api_key: '',
  payment_pix_endpoint: 'https://api.pagseguro.com/pix',
  payment_pix_partner_id: '',
  payment_boleto_enabled: 'true',
  payment_boleto_api_key: '',
  payment_boleto_endpoint: 'https://api.pagseguro.com/boleto',
  payment_credit_card_enabled: 'true',
  payment_credit_card_api_key: '',
  payment_credit_card_endpoint: 'https://api.pagseguro.com/credit-card',
  payment_credit_card_installments_max: '12',
  payment_general_fee_pct: '2.99',
  payment_general_min_amount: '1000',
  payment_webhook_url: '',
  payment_sandbox_mode: 'true',
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'payment_' } }
    })

    const configMap: Record<string, string> = {}
    for (const c of configs) {
      configMap[c.key] = c.value
    }

    for (const [key, value] of Object.entries(DEFAULT_PAYMENT_CONFIGS)) {
      if (!configMap[key]) {
        await prisma.systemConfig.upsert({
          where: { key },
          update: {},
          create: { key, value, description: `Payment config: ${key.replace('payment_', '')}` }
        })
        configMap[key] = value
      }
    }

    // Organize by gateway
    const pix = {
      enabled: configMap['payment_pix_enabled'] === 'true',
      apiKey: configMap['payment_pix_api_key'] || '',
      endpoint: configMap['payment_pix_endpoint'] || '',
      partnerId: configMap['payment_pix_partner_id'] || '',
    }
    const boleto = {
      enabled: configMap['payment_boleto_enabled'] === 'true',
      apiKey: configMap['payment_boleto_api_key'] || '',
      endpoint: configMap['payment_boleto_endpoint'] || '',
    }
    const creditCard = {
      enabled: configMap['payment_credit_card_enabled'] === 'true',
      apiKey: configMap['payment_credit_card_api_key'] || '',
      endpoint: configMap['payment_credit_card_endpoint'] || '',
      installmentsMax: parseInt(configMap['payment_credit_card_installments_max'] || '12'),
    }
    const general = {
      feePct: parseFloat(configMap['payment_general_fee_pct'] || '2.99'),
      minAmount: parseInt(configMap['payment_general_min_amount'] || '1000'),
      webhookUrl: configMap['payment_webhook_url'] || '',
      sandboxMode: configMap['payment_sandbox_mode'] === 'true',
    }

    return success({ pix, boleto, creditCard, general, raw: configMap })
  } catch (err) {
    return error('Failed to fetch payment config', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, configs } = body
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!configs || typeof configs !== 'object') return error('configs object is required', 400)

    const updates = Object.entries(configs).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: `Payment config: ${key.replace('payment_', '')}` },
      })
    )

    await Promise.all(updates)
    return success({ message: 'Payment config updated successfully' })
  } catch (err) {
    return error('Failed to update payment config', 500)
  }
}
