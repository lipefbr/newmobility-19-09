import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * Telemedicina activation request API.
 *
 *   POST /api/telemedicina/request        — user submits/updates their activation request
 *   GET  /api/telemedicina/request?userId=X — fetches the user's most recent request
 *
 * A user may have at most ONE active (status !== 'cancelled') request at a
 * time. If they submit again while a pending request exists, we update it
 * in place (so they can correct typos). If a previous request was approved
 * or rejected, a new submission creates a new row.
 *
 * The TelemedicinaRequest model has no `paymentMethod` column (we cannot
 * modify the schema), so the chosen payment method is stored as a prefix
 * on the `notes` field in the format `[Pagamento: PIX] <user-notes>`.
 * `serializePaymentMethod()` parses it back out so the admin panel and the
 * user's own page can display it cleanly.
 */

interface Dependent {
  name?: string
  kinship?: string
  birthDate?: string
  cpf?: string
}

export const TELEMEDICINA_PRICE_CENTS = 4990

/**
 * Accepted payment-method identifiers (lowercase, matching Invoice's
 * `paymentMethod` column convention). The label map is shared with the
 * frontend for consistent display.
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de Crédito',
}

export function normalizePaymentMethod(input: unknown): string | null {
  if (!input || typeof input !== 'string') return null
  const v = input.trim().toLowerCase()
  if (v === 'pix') return 'pix'
  if (v === 'boleto' || v === 'bank_slip') return 'boleto'
  if (v === 'credit_card' || v === 'creditcard' || v === 'cartao' || v === 'cartão') return 'credit_card'
  return null
}

export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null
  return PAYMENT_METHOD_LABELS[method] ?? method
}

/**
 * Parse the `[Pagamento: PIX] ` prefix from a notes string.
 * Returns `{ method, notes }` where `notes` is the user's original text
 * without the prefix.
 */
export function parsePaymentFromNotes(raw: string | null): {
  method: string | null
  notes: string | null
} {
  if (!raw) return { method: null, notes: null }
  // Match `[Pagamento: <method>] <rest>` at the start of the string. Use
  // [\s\S] instead of the `s` (dotAll) flag because the project's
  // tsconfig targets ES2017 and the `s` flag requires ES2018+.
  const match = raw.match(/^\[Pagamento:\s*([^\]]+)\]\s*([\s\S]*)$/i)
  if (!match) return { method: null, notes: raw }
  const method = normalizePaymentMethod(match[1]) ?? match[1].trim()
  const rest = match[2].trim()
  return { method, notes: rest || null }
}

export function buildNotesWithPayment(method: string | null, userNotes: string | null): string | null {
  if (!method) return userNotes ? String(userNotes) : null
  const label = paymentMethodLabel(method) ?? method
  const rest = userNotes ? String(userNotes).trim() : ''
  return rest ? `[Pagamento: ${label}] ${rest}` : `[Pagamento: ${label}]`
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const req_row = await prisma.telemedicinaRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    if (!req_row) {
      return success({ request: null })
    }

    return success({ request: serialize(req_row) })
  } catch (err) {
    console.error('Telemedicina GET my-request error:', err)
    return error('Failed to fetch Telemedicina request', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      fullName,
      cpf,
      birthDate,
      phone,
      email,
      dependents = [],
      notes,
      paymentMethod,
    } = body ?? {}

    if (!userId) return error('userId is required', 400)
    if (!fullName || !cpf || !phone || !email) {
      return error('fullName, cpf, phone e email são obrigatórios', 400)
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return error('Usuário não encontrado', 404)

    // Normalize dependents to a JSON string
    const dependentsStr = Array.isArray(dependents)
      ? JSON.stringify(dependents.filter((d: Dependent) => d && d.name))
      : '[]'

    // Validate + normalize the chosen payment method. The schema has no
    // dedicated column, so we persist it as a `[Pagamento: PIX]` prefix on
    // the notes field (see buildNotesWithPayment / parsePaymentFromNotes).
    const method = normalizePaymentMethod(paymentMethod)
    if (paymentMethod && !method) {
      return error('Forma de pagamento inválida. Use: pix, boleto ou credit_card', 400)
    }
    const notesWithPayment = buildNotesWithPayment(method, notes ?? null)

    // Check for an existing PENDING request — update in place instead of
    // creating duplicates. (Approved/rejected requests stay archived; a
    // new submission creates a fresh row in those cases.)
    const existing = await prisma.telemedicinaRequest.findFirst({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      const updated = await prisma.telemedicinaRequest.update({
        where: { id: existing.id },
        data: {
          fullName: String(fullName),
          cpf: String(cpf),
          birthDate: birthDate ? String(birthDate) : null,
          phone: String(phone),
          email: String(email),
          dependents: dependentsStr,
          notes: notesWithPayment,
        },
      })
      return success({ request: serialize(updated), message: 'Pedido atualizado com sucesso.' })
    }

    const created = await prisma.telemedicinaRequest.create({
      data: {
        userId,
        fullName: String(fullName),
        cpf: String(cpf),
        birthDate: birthDate ? String(birthDate) : null,
        phone: String(phone),
        email: String(email),
        dependents: dependentsStr,
        notes: notesWithPayment,
        status: 'pending',
      },
    })

    return success({ request: serialize(created), message: 'Pedido enviado com sucesso! Equipe irá analisar.' }, 201)
  } catch (err) {
    console.error('Telemedicina POST request error:', err)
    return error('Failed to submit Telemedicina request', 500)
  }
}

function serialize(r: any) {
  let dependents: any[] = []
  try {
    const parsed = JSON.parse(r.dependents || '[]')
    if (Array.isArray(parsed)) dependents = parsed
  } catch {
    dependents = []
  }
  // Surface the payment method + clean notes separately so the client
  // doesn't need to re-parse the `[Pagamento: …]` prefix.
  const { method, notes: cleanNotes } = parsePaymentFromNotes(r.notes ?? null)
  return {
    id: r.id,
    userId: r.userId,
    fullName: r.fullName,
    cpf: r.cpf,
    birthDate: r.birthDate ?? null,
    phone: r.phone,
    email: r.email,
    dependents,
    notes: cleanNotes,
    paymentMethod: method,
    paymentMethodLabel: paymentMethodLabel(method),
    status: r.status,
    adminNotes: r.adminNotes ?? null,
    activationLink: r.activationLink ?? null,
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    rejectedAt: r.rejectedAt ? r.rejectedAt.toISOString() : null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
  }
}
