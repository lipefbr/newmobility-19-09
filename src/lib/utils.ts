import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Brazilian currency (R$ X.XXX,XX)
 * @param valueInCents - Value in cents (e.g., 3258000 = R$ 32.580,00)
 *
 * Safe: any non-numeric input (undefined, null, NaN, Infinity, strings)
 * renders as "R$ 0,00" instead of "R$ NaN". This matches the behaviour of
 * `formatBRL` in `@/lib/format` so vouchers, balances, withdrawals and
 * transactions never display "R$ NaN" to the user.
 */
export function formatCurrency(valueInCents: number): string {
  const safe =
    typeof valueInCents === 'number' &&
    !isNaN(valueInCents) &&
    isFinite(valueInCents)
      ? valueInCents
      : 0
  const value = safe / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Format a number with Brazilian locale (1.234.567)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

/**
 * Format a date in Brazilian format (DD/MM/YYYY)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Format a date with time in Brazilian format (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Calculate time since a date in Portuguese
 */
export function timeSince(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
  const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
  const days = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24))
  
  const parts: string[] = []
  if (years > 0) parts.push(`${years} ano${years > 1 ? 's' : ''}`)
  if (months > 0) parts.push(`${months} ${months > 1 ? 'meses' : 'mês'}`)
  if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`)
  
  return parts.join(', ') || '0 dias'
}

/**
 * Returns the total number of days since a given date (rounded down).
 * Example: a date 2 months and 5 days ago returns ~65 (total days).
 */
export function totalDaysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Get plan name in Portuguese
 */
export function getPlanName(plan: string): string {
  const plans: Record<string, string> = {
    free: 'Gratuito',
    blue3: 'Blue 3',
    blue5: 'Blue 5 Premium',
  }
  return plans[plan] || plan
}

/**
 * Get plan price in Brazilian format
 */
export function getPlanPrice(plan: string): string {
  const prices: Record<string, string> = {
    free: 'Grátis',
    blue3: 'R$ 149,00',
    blue5: 'R$ 999,90',
  }
  return prices[plan] || '-'
}

/**
 * Get status badge variant
 */
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    paid: 'default',
    approved: 'default',
    resolved: 'default',
    inactive: 'secondary',
    pending: 'outline',
    open: 'outline',
    in_progress: 'secondary',
    overdue: 'destructive',
    rejected: 'destructive',
    closed: 'secondary',
    cancelled: 'destructive',
  }
  return variants[status] || 'outline'
}

/**
 * Get status label in Portuguese
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente',
    paid: 'Pago',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    open: 'Aberto',
    in_progress: 'Em Andamento',
    resolved: 'Resolvido',
    closed: 'Fechado',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

/**
 * Portuguese labels for the Transaction.category / financial breakdown
 * category strings used across the platform (admin + user).
 *
 * Used by:
 *  - admin-page.tsx "Resumo por Categoria" / "Distribuição por Categoria" panels
 *  - admin-reports-panel.tsx "Por Categoria" card and transactions table
 *  - gratifications admin summary ("Distribuição por Categoria")
 *  - financial-page category badges (via local categoryLabels + getTransactionLabel)
 *
 * Task 2-c / Item 21 + Admin Item 1: covers every English key the backend
 * may store on Transaction.category so the admin/user summaries never show
 * raw English (cashback, withdrawal, plan_payment, marketplace_purchase,
 * bills, paymentInvoice, free, withdrawal_fee, plan_upgrade, deposit,
 * voucher, bonus, cashback_entry/residual/sales, gratification, …).
 * Falls back to the raw key if unknown so we never show empty strings.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  // Wallet / balance categories
  withdrawal: 'Saque',
  mobility: 'Mobilidade',
  shopping: 'Compras',
  food: 'Refeição',
  meal: 'Refeição',
  pharmacy: 'Farmácia',
  gratification: 'Gratificação',
  marketplace: 'Marketplace',
  marketplace_purchase: 'Marketplace',
  bills: 'Contas',
  paymentInvoice: 'Pagamento Fatura',
  payment_invoice: 'Pagamento Fatura',
  free: 'Saldo Livre',
  other: 'Outros',
  // Transaction type-style categories (also often stored on `category`)
  deposit: 'Depósito',
  transfer: 'Transferência',
  transfer_in: 'Transferência Recebida',
  transfer_out: 'Transferência Envio',
  payment: 'Pagamento',
  plan_payment: 'Pagamento de Plano',
  plan_upgrade: 'Upgrade de Plano',
  subscription: 'Assinatura',
  voucher: 'Voucher',
  bonus: 'Bônus',
  reward: 'Recompensa',
  referral: 'Indicação',
  purchase: 'Compra',
  sale: 'Venda',
  commission: 'Comissão',
  career_claim: 'Reivindicação de Carreira',
  // CashBack families
  cashback: 'CashBack',
  cashback_entry: 'CashBack Entrada',
  cashback_entrada: 'CashBack Entrada',
  cashback_residual: 'CashBack Residual',
  cashback_vendas: 'CashBack Vendas',
  cashback_sales: 'CashBack Vendas',
  // Fees / adjustments
  withdrawal_fee: 'Taxa de Saque',
  fee: 'Taxa',
  adjustment: 'Ajuste',
  // Catch-all for system-managed config rows
  system_config: 'Configuração do Sistema',
}

/**
 * Returns the Portuguese label for a category key.
 * Falls back to the original key (capitalised) when no mapping exists,
 * so unknown categories still render something readable.
 */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return 'Outros'
  return CATEGORY_LABELS[key] || key
}
