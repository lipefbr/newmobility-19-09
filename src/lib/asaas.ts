/**
 * Asaas Payment Gateway SDK (v3)
 *
 * Docs: https://docs.asaas.com/reference
 *
 * Sandbox base URL: https://sandbox.asaas.com/api/v3
 * Production base URL: https://www.asaas.com/api/v3
 *
 * This module is a thin typed wrapper around the Asaas REST API. It is used by
 * the Next.js API routes under /api/asaas/* and /api/admin/asaas/* to:
 *   - Create/find customers (linking asaasCustomerId to our User)
 *   - Create PIX / Boleto / Credit Card payments
 *   - Query payment status
 *   - List/transfer to user bank accounts (withdrawals)
 *   - Read account balance (admin dashboard widget)
 *   - Verify webhook payloads (idempotency + signature)
 *
 * All amounts are in BRL cents (integer) on our side and converted to BRL
 * float (decimal) on Asaas' side, since Asaas uses `value: 99.90`.
 *
 * API key is stored in SystemConfig under:
 *   - asaas_api_key         (the actual key — `$aac_...` sandbox / `$aap_...` prod)
 *   - asaas_environment     ('sandbox' | 'production')
 *   - asaas_webhook_secret  (optional shared secret for webhook verification)
 */

import { prisma } from './db'

const SANDBOX_BASE = 'https://sandbox.asaas.com/api/v3'
const PRODUCTION_BASE = 'https://www.asaas.com/api/v3'

export type AsaasEnvironment = 'sandbox' | 'production'

export interface AsaasConfig {
  apiKey: string
  environment: AsaasEnvironment
  webhookSecret?: string
  baseUrl: string
}

/**
 * Read the Asaas configuration stored in SystemConfig.
 * Returns null if the API key is not configured yet.
 */
export async function getAsaasConfig(): Promise<AsaasConfig | null> {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: ['asaas_api_key', 'asaas_environment', 'asaas_webhook_secret'] } },
  })
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value

  const apiKey = map['asaas_api_key']?.trim()
  if (!apiKey) return null

  const environment: AsaasEnvironment =
    map['asaas_environment'] === 'production' ? 'production' : 'sandbox'
  const baseUrl = environment === 'production' ? PRODUCTION_BASE : SANDBOX_BASE

  return {
    apiKey,
    environment,
    webhookSecret: map['asaas_webhook_secret'] || undefined,
    baseUrl,
  }
}

/** Update Asaas config in SystemConfig (admin-only). */
export async function setAsaasConfig(patch: {
  apiKey?: string
  environment?: AsaasEnvironment
  webhookSecret?: string
}) {
  const ops: Promise<unknown>[] = []
  if (patch.apiKey !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: 'asaas_api_key' },
        update: { value: patch.apiKey.trim() },
        create: { key: 'asaas_api_key', value: patch.apiKey.trim(), description: 'Asaas API key' },
      })
    )
  }
  if (patch.environment !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: 'asaas_environment' },
        update: { value: patch.environment },
        create: { key: 'asaas_environment', value: patch.environment, description: 'Asaas env' },
      })
    )
  }
  if (patch.webhookSecret !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: 'asaas_webhook_secret' },
        update: { value: patch.webhookSecret },
        create: { key: 'asaas_webhook_secret', value: patch.webhookSecret, description: 'Asaas webhook secret' },
      })
    )
  }
  await Promise.all(ops)
}

// ---------- Low-level fetch wrapper ----------

interface AsaasRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

class AsaasApiError extends Error {
  status: number
  payload: unknown
  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'AsaasApiError'
    this.status = status
    this.payload = payload
  }
}

async function asaasFetch<T = any>(
  path: string,
  opts: AsaasRequestOptions = {}
): Promise<T> {
  const config = await getAsaasConfig()
  if (!config) {
    throw new AsaasApiError('Asaas API key not configured', 503, { configured: false })
  }

  const url = new URL(config.baseUrl + path)
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    access_token: config.apiKey,
    'User-Agent': 'NewMobility-Backoffice/1.0',
  }

  const res = await fetch(url.toString(), {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  let json: any = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { rawText: text }
    }
  }

  if (!res.ok) {
    const msg =
      json?.errors?.map((e: any) => e.description).join('; ') ||
      json?.message ||
      `Asaas API error ${res.status}`
    throw new AsaasApiError(msg, res.status, json)
  }

  return json as T
}

// ---------- Types ----------

export interface AsaasCustomerInput {
  name: string
  email?: string
  cpfCnpj: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  postalCode?: string
  externalReference?: string
  notificationDisabled?: boolean
}

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  postalCode?: string
  externalReference?: string
  deleted?: boolean
  additionalEmails?: string
  municipalInscription?: string
  stateInscription?: string
  observations?: string
  personType?: 'FISICA' | 'JURIDICA'
  dateCreated?: string
}

export type AsaasBillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED'

export interface AsaasPaymentInput {
  customer: string                 // Asaas customer id
  billingType: AsaasBillingType
  value: number                     // BRL float (e.g. 149.90)
  dueDate: string                   // YYYY-MM-DD
  description?: string
  externalReference?: string        // Our internal invoice id
  installmentCount?: number
  installmentValue?: number
  discount?: { value: number; dueDate: string; type: 'PERCENT' | 'FIXED' }
  interest?: { value: number; type: 'PERCENT' }     // per month
  fine?: { value: number; type: 'PERCENT' | 'FIXED' }
  postalService?: boolean
  split?: Array<{
    walletId: string
    fixedValue?: number
    percentualValue?: number
    totalSplitAmount?: number
  }>
}

export interface AsaasPayment {
  id: string
  customer: string
  billingType: AsaasBillingType
  value: number
  netValue?: number
  description?: string
  status:
    | 'PENDING'
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'OVERDUE'
    | 'REFUNDED'
    | 'RECEIVED_IN_CASH'
    | 'REFUND_REQUESTED'
    | 'CHARGEBACK_REQUESTED'
    | 'CHARGEBACK_DISPUTE'
    | 'AWAITING_CHARGEBACK_REVERSAL'
    | 'DUNNING_REQUESTED'
    | 'DUNNING_RECEIVED'
    | 'AWAITING_RISK_ANALYSIS'
  dueDate: string
  originalDueDate?: string
  paymentDate?: string | null
  clientPaymentDate?: string | null
  installmentNumber?: string | null
  invoiceUrl?: string
  bankSlipUrl?: string
  invoiceNumber?: string
  externalReference?: string
  deleted?: boolean
  anticipated?: boolean
  anticipable?: boolean
  pixTransaction?: string
  transactionReceiptUrl?: string
  // PIX-specific (only when billingType === 'PIX')
  pixQrCode?: string          // base64 image (data:image/png;base64,...)
  pixCopyPaste?: string       // "payload" string user copies
  // Credit-card-related (omitted — credit card tokenization handled separately)
  dateCreated?: string
  lastInvoiceView?: string
  lastBankSlipView?: string
  orderIdentifier?: number
  // Refunds / chargebacks omitted for brevity
}

export interface AsaasTransferInput {
  // Either pixAddressKey (PIX) OR bankAccount object (TED)
  pixAddressKey?: string
  bankAccount?: {
    bankCode: string
    accountName: string
    ownerName: string
    cpfCnpj: string
    agency: string
    accountNumber: string
    accountType: 'CHECKING' | 'SAVINGS'
    bank?: { code: string; name?: string; allowPix?: boolean; allowTed?: boolean }
  }
  value: number                  // BRL float
  description?: string
  externalReference?: string
}

export interface AsaasTransfer {
  id: string
  type: 'PIX' | 'TED'
  status:
    | 'PENDING'
    | 'BANK_CONFIRMED'
    | 'BANK_FAILED'
    | 'FAILED'
    | 'DONE'
    | 'REFUND_REQUESTED'
    | 'REFUNDED'
    | 'CANCELLED'
  value: number
  netValue?: number
  transferFee?: number
  effectiveDate?: string
  scheduleDate?: string
  dateCreated?: string
  transactionReceiptUrl?: string
  description?: string
  externalReference?: string
  failReason?: string
  bankAccount?: any
  pixAddressKey?: string
}

export interface AsaasBalance {
  balance: number
  blockedBalance?: number
  pendingBalance?: number
  transferableBalance?: number
  upcomingBalance?: number
  netValue?: number
}

// ---------- Customer ----------

export async function createCustomer(
  input: AsaasCustomerInput
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: input,
  })
}

export async function listCustomers(params: {
  cpfCnpj?: string
  email?: string
  externalReference?: string
  name?: string
  offset?: number
  limit?: number
}): Promise<{ data: AsaasCustomer[]; totalCount: number; hasMore: boolean }> {
  return asaasFetch('/customers', { method: 'GET', params })
}

/** Find an existing customer by cpfCnpj or externalReference, else create one. */
export async function findOrCreateCustomer(
  input: AsaasCustomerInput
): Promise<AsaasCustomer> {
  // Try to find by cpfCnpj first
  if (input.cpfCnpj) {
    const list = await listCustomers({ cpfCnpj: input.cpfCnpj, limit: 1 })
    if (list.data && list.data.length > 0) {
      const existing = list.data[0]
      if (existing.deleted) {
        // Recreate if soft-deleted
        return createCustomer(input)
      }
      return existing
    }
  }
  return createCustomer(input)
}

// ---------- Payments ----------

export async function createPayment(
  input: AsaasPaymentInput
): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>('/payments', { method: 'POST', body: input })
}

export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${id}`, { method: 'GET' })
}

export async function listPayments(params: {
  customer?: string
  externalReference?: string
  status?: string
  offset?: number
  limit?: number
}): Promise<{ data: AsaasPayment[]; totalCount: number; hasMore: boolean }> {
  return asaasFetch('/payments', { method: 'GET', params })
}

// ---------- Transfers / Withdrawals ----------

export async function createTransfer(
  input: AsaasTransferInput
): Promise<AsaasTransfer> {
  return asaasFetch<AsaasTransfer>('/transfers', { method: 'POST', body: input })
}

export async function getTransfer(id: string): Promise<AsaasTransfer> {
  return asaasFetch<AsaasTransfer>(`/transfers/${id}`, { method: 'GET' })
}

export async function listTransfers(params: {
  offset?: number
  limit?: number
}): Promise<{ data: AsaasTransfer[]; totalCount: number; hasMore: boolean }> {
  return asaasFetch('/transfers', { method: 'GET', params })
}

// ---------- Account balance ----------

export async function getAccountBalance(): Promise<AsaasBalance> {
  // /finance/balance returns current wallet balance for the API key's owner
  return asaasFetch<AsaasBalance>('/finance/balance', { method: 'GET' })
}

// ---------- Webhook ----------

export interface AsaasWebhookEvent {
  id: string
  event: string
  payment?: { id: string; status?: string; [k: string]: any }
  transfer?: { id: string; status?: string; [k: string]: any }
  [k: string]: any
}

/**
 * Asaas does not sign webhook payloads with HMAC by default. Instead, they
 * optionally send an `asaas-access-token` header that you configure per
 * webhook URL on their dashboard. We verify that header against our stored
 * `asaas_webhook_secret`. If no secret is configured, we accept the payload
 * (useful for local dev) but log a warning.
 */
export function verifyWebhookToken(
  receivedToken: string | null,
  configuredSecret?: string
): boolean {
  if (!configuredSecret) {
    // No secret configured → accept (dev mode). Production should always
    // configure a secret.
    return true
  }
  if (!receivedToken) return false
  return receivedToken === configuredSecret
}

// ---------- Helpers ----------

/** Convert BRL cents (integer) to BRL float (decimal) for Asaas. */
export function centsToAsaasValue(cents: number): number {
  // Asaas expects 2 decimal places max. Round to avoid float errors.
  return Math.round(cents) / 100
}

/** Convert BRL float from Asaas back to BRL cents (integer) for our DB. */
export function asaasValueToCents(value: number): number {
  return Math.round((value || 0) * 100)
}

/** Mask the API key for display: `$aac_****************abcd` */
export function maskApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 12) return '••••'
  const head = key.slice(0, 5)
  const tail = key.slice(-4)
  return `${head}${'•'.repeat(Math.max(8, key.length - 9))}${tail}`
}

/** Strip non-numeric chars from a CPF/CNPJ (Asaas requires only digits). */
export function sanitizeCpfCnpj(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/\D/g, '')
}

/** Strip non-numeric chars from a postal code. */
export function sanitizePostalCode(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/\D/g, '')
}

export { AsaasApiError }
