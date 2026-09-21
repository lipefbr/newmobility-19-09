'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeftRight,
  Banknote,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  UtensilsCrossed,
  Car,
  Pill,
  Gift,
  Receipt,
  Clock,
  Plus,
  ArrowDownToLine,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth, type MobileWallet } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/carteira — Full wallet view for the NewMobility client app.
// ----------------------------------------------------------------------------
// Sections:
//   1. Header azul (sticky) with "Carteira" title + back button.
//   2. Big total balance card with show/hide toggle.
//   3. Grid of 8 wallet categories (withdrawal, mobility, shopping, food,
//      pharmacy, gratification, free, pending) — each shows label + balance
//      + icon.
//   4. Quick actions: "Transferir entre carteiras" + "Solicitar saque".
//   5. Transaction history list with type filter chips + load-more button.
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'
const ERROR_RED = '#EF4444'

// ── Wallet category config (must match /api/financial/balances keys) ────────
interface WalletCategory {
  key: keyof MobileWallet
  label: string
  icon: typeof Wallet
  description: string
}

const CATEGORIES: WalletCategory[] = [
  {
    key: 'withdrawalCents',
    label: 'Saque',
    icon: Banknote,
    description: 'Disponível para sacar',
  },
  {
    key: 'mobilityCents',
    label: 'Mobilidade',
    icon: Car,
    description: 'Corridas e transporte',
  },
  {
    key: 'shoppingCents',
    label: 'Compras',
    icon: ShoppingCart,
    description: 'Marketplace',
  },
  {
    key: 'foodCents',
    label: 'Refeição',
    icon: UtensilsCrossed,
    description: 'Restaurantes',
  },
  {
    key: 'pharmacyCents',
    label: 'Farmácia',
    icon: Pill,
    description: 'MediDrop',
  },
  {
    key: 'gratificationCents',
    label: 'Gratificação',
    icon: Gift,
    description: 'Prêmios e bônus',
  },
  {
    key: 'freeCents',
    label: 'Livre',
    icon: Wallet,
    description: 'Uso geral',
  },
  {
    key: 'pendingCents',
    label: 'Pendente',
    icon: Clock,
    description: 'Em processamento',
  },
]

// ── Transaction filter chips ────────────────────────────────────────────────
type TxFilter = 'all' | 'in' | 'out' | 'withdrawal' | 'transfer'

const FILTERS: { key: TxFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'in', label: 'Entradas' },
  { key: 'out', label: 'Saídas' },
  { key: 'withdrawal', label: 'Saques' },
  { key: 'transfer', label: 'Transferências' },
]

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  category?: string | null
  description?: string | null
  createdAt: string
}

interface TransactionsResponse {
  transactions: Transaction[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// Map a tx type to a lucide icon (for the leading circle in the list row).
function txIcon(type: string): typeof Wallet {
  switch (type) {
    case 'withdrawal':
    case 'fee':
      return Banknote
    case 'transfer_in':
      return ArrowDownToLine
    case 'transfer_out':
      return ArrowLeftRight
    case 'marketplace_purchase':
      return ShoppingCart
    case 'cashback_sales':
    case 'cashback_entrada':
    case 'cashback':
      return TrendingUp
    case 'voucher_redeem':
      return Gift
    case 'gratification':
      return Gift
    case 'career':
      return TrendingUp
    case 'invoice_payment':
      return Receipt
    default:
      return Wallet
  }
}

// Decide if a transaction is an "in" or "out" line for color/filter purposes.
function txDirection(amount: number): 'in' | 'out' {
  return amount >= 0 ? 'in' : 'out'
}

function txFilterMatch(type: string, filter: TxFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'in') return type === 'transfer_in' || type === 'cashback' || type === 'cashback_sales' || type === 'cashback_entrada' || type === 'voucher_redeem' || type === 'gratification' || type === 'career' || type === 'deposit'
  if (filter === 'out') return !type.startsWith('transfer_in') && !['cashback', 'cashback_sales', 'cashback_entrada', 'voucher_redeem', 'gratification', 'career', 'deposit'].includes(type)
  if (filter === 'withdrawal') return type === 'withdrawal' || type === 'fee'
  if (filter === 'transfer') return type === 'transfer_in' || type === 'transfer_out'
  return true
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function statusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Pendente', color: '#F59E0B' }
    case 'approved':
      return { label: 'Aprovado', color: GREEN }
    case 'paid':
      return { label: 'Pago', color: GREEN }
    case 'rejected':
      return { label: 'Rejeitado', color: ERROR_RED }
    default:
      return { label: status, color: '#6B7280' }
  }
}

export default function CarteiraPage() {
  const router = useRouter()
  const { user, wallet, loading: walletLoading, refresh } = useMobileAuth()
  const [showBalance, setShowBalance] = useState(true)
  const [filter, setFilter] = useState<TxFilter>('all')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadTransactions = useCallback(
    async (resetPage = false) => {
      if (!user?.id) return
      const targetPage = resetPage ? 1 : page
      setTxLoading(true)
      try {
        const resp = await apiFetch<TransactionsResponse>(
          `/financial/transactions?userId=${user.id}&page=${targetPage}&limit=20&type=all`
        )
        if (resetPage) {
          setTransactions(resp.transactions)
        } else {
          setTransactions((prev) => [...prev, ...resp.transactions])
        }
        setTotalPages(resp.pagination.totalPages)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar transações')
      } finally {
        setTxLoading(false)
      }
    },
    [user?.id, page]
  )

  useEffect(() => {
    if (user?.id) loadTransactions(true)
     
  }, [user?.id])

  const onLoadMore = () => {
    setPage((p) => p + 1)
    setTimeout(() => loadTransactions(false), 0)
  }

  const onRefresh = async () => {
    await refresh()
    setPage(1)
    await loadTransactions(true)
    toast.success('Carteira atualizada')
  }

  if (walletLoading && !wallet) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Carteira" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando carteira...</p>
        </div>
      </MobileAppShell>
    )
  }

  if (!wallet) return null

  return (
    <MobileAppShell>
      <MobilePageHeader title="Carteira" />

      {/* ════════════════ 1. SALDO TOTAL ════════════════ */}
      <section className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #0B4FE0 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/80 font-medium">Saldo total disponível</p>
            <button
              onClick={() => setShowBalance((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
              aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
            >
              {showBalance ? (
                <EyeOff className="h-4 w-4 text-white" />
              ) : (
                <Eye className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
          <p className="text-3xl font-bold mt-1.5">
            {showBalance ? `R$ ${formatBRL(wallet.totalCents)}` : 'R$ ••••'}
          </p>
          <p className="text-xs text-white/70 mt-1.5">
            Atualizado agora • Toque para gerenciar
          </p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => router.push('/mobile/enviar')}
              className="flex-1 h-10 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transferir
            </button>
            <button
              onClick={() => router.push('/mobile/sacar')}
              className="flex-1 h-10 rounded-xl bg-white text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
              style={{ color: PRIMARY }}
            >
              <Banknote className="h-3.5 w-3.5" />
              Sacar
            </button>
          </div>
        </motion.div>
      </section>

      {/* ════════════════ 2. CATEGORIAS DE SALDO ════════════════ */}
      <section className="px-4 mt-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Saldos por categoria</h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const value = (wallet[cat.key] as number) ?? 0
            return (
              <div
                key={cat.key}
                className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: MINT_BG }}
                  >
                    <Icon className="h-4 w-4" style={{ color: '#059669' }} strokeWidth={2} />
                  </span>
                  <p className="text-xs font-semibold text-gray-700">{cat.label}</p>
                </div>
                <p className="text-base font-bold text-gray-900">
                  {showBalance ? `R$ ${formatBRL(value)}` : 'R$ ••••'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{cat.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ════════════════ 3. AÇÕES RÁPIDAS ════════════════ */}
      <section className="px-4 mt-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/mobile/enviar')}
            className="flex flex-col items-start p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow min-h-[44px]"
          >
            <ArrowLeftRight className="h-5 w-5 mb-1" style={{ color: PRIMARY }} />
            <p className="text-xs font-semibold text-gray-900">Transferir entre carteiras</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Mova saldo entre categorias</p>
          </button>
          <button
            onClick={() => router.push('/mobile/sacar')}
            className="flex flex-col items-start p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow min-h-[44px]"
          >
            <Banknote className="h-5 w-5 mb-1" style={{ color: GREEN }} />
            <p className="text-xs font-semibold text-gray-900">Solicitar saque</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Saque via PIX (taxa 5%)</p>
          </button>
        </div>
      </section>

      {/* ════════════════ 4. HISTÓRICO DE TRANSAÇÕES ════════════════ */}
      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Histórico</h2>
          <button
            onClick={onRefresh}
            className="text-xs font-semibold flex items-center gap-0.5 min-h-[44px]"
            style={{ color: PRIMARY }}
          >
            Atualizar
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-all min-h-[44px] flex items-center"
                style={{
                  backgroundColor: active ? PRIMARY : '#F3F4F6',
                  color: active ? 'white' : '#6B7280',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Transaction list */}
        <div className="mt-3 space-y-2">
          {txLoading && transactions.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: PRIMARY }} />
            </div>
          ) : transactions.filter((t) => txFilterMatch(t.type, filter)).length === 0 ? (
            <div className="text-center py-10">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-3"
                style={{ backgroundColor: MINT_BG }}
              >
                <Wallet className="h-6 w-6" style={{ color: '#059669' }} />
              </div>
              <p className="text-sm font-medium text-gray-900">Nenhuma transação</p>
              <p className="text-xs text-gray-500 mt-1">
                Suas movimentações aparecerão aqui.
              </p>
            </div>
          ) : (
            <>
              {transactions
                .filter((t) => txFilterMatch(t.type, filter))
                .map((tx) => {
                  const Icon = txIcon(tx.type)
                  const dir = txDirection(tx.amount)
                  const st = statusLabel(tx.status)
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm"
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: dir === 'in' ? MINT_BG : '#FEF2F2',
                        }}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{
                            color: dir === 'in' ? '#059669' : ERROR_RED,
                          }}
                          strokeWidth={2}
                        />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {tx.description || tx.type}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="inline-flex items-center px-1.5 h-4 rounded text-[9px] font-bold"
                            style={{
                              backgroundColor: `${st.color}20`,
                              color: st.color,
                            }}
                          >
                            {st.label}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {formatDate(tx.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p
                        className="text-sm font-bold whitespace-nowrap"
                        style={{ color: dir === 'in' ? GREEN : ERROR_RED }}
                      >
                        {tx.amount >= 0 ? '+' : '−'} R$ {formatBRL(Math.abs(tx.amount))}
                      </p>
                    </div>
                  )
                })}
              {page < totalPages && (
                <button
                  onClick={onLoadMore}
                  disabled={txLoading}
                  className="w-full h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {txLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Carregar mais
                      <ChevronRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <div className="h-4" />
    </MobileAppShell>
  )
}
