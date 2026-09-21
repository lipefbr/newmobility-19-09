'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  ChevronDown,
  ArrowLeftRight,
  Check,
  Info,
  ArrowRight,
  Banknote,
  Car,
  ShoppingCart,
  UtensilsCrossed,
  Pill,
  Gift,
  Wallet,
  Receipt,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth, type MobileWallet } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/enviar — Transfer money between own wallets.
// ----------------------------------------------------------------------------
// Flow:
//   1. User picks a SOURCE wallet (any of the 8 categories).
//   2. User picks a DESTINATION wallet (any except `withdrawal` — backend
//      rejects transfers TO withdrawal by design).
//   3. User enters an amount in REAIS (R$).
//   4. Show fee info: transfers FROM withdrawal are FREE, all others have 5%.
//   5. Submit → POST /api/financial/transfer {userId, source, destination,
//      amount(in reais)} → on success: toast + redirect to /mobile/carteira.
//   6. Below the form, show recent transfer transactions.
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'
const ERROR_RED = '#EF4444'

// Wallet key → label + icon mapping (matches /api/financial/transfer keys).
interface WalletOption {
  key: string
  cents: number
  label: string
  icon: typeof Wallet
}

function buildOptions(wallet: MobileWallet): WalletOption[] {
  return [
    { key: 'withdrawal', cents: wallet.withdrawalCents, label: 'Saque', icon: Banknote },
    { key: 'mobility', cents: wallet.mobilityCents, label: 'Mobilidade', icon: Car },
    { key: 'shopping', cents: wallet.shoppingCents, label: 'Compras', icon: ShoppingCart },
    { key: 'food', cents: wallet.foodCents, label: 'Refeição', icon: UtensilsCrossed },
    { key: 'pharmacy', cents: wallet.pharmacyCents, label: 'Farmácia', icon: Pill },
    { key: 'gratification', cents: wallet.gratificationCents, label: 'Gratificação', icon: Gift },
    { key: 'free', cents: wallet.freeCents, label: 'Livre', icon: Wallet },
    { key: 'bills', cents: wallet.pendingCents, label: 'Faturas', icon: Receipt },
  ]
}

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

interface TransferResponse {
  message: string
  source: string
  destination: string
  grossAmount: number
  fee: number
  feePercent: number
  netAmount: number
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function EnviarPage() {
  const router = useRouter()
  const { user, wallet, loading: walletLoading, refresh } = useMobileAuth()
  const [source, setSource] = useState<string>('')
  const [destination, setDestination] = useState<string>('')
  const [amountStr, setAmountStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recent, setRecent] = useState<Transaction[]>([])

  // Source dropdown open/close (we use simple native select-like buttons).
  const [srcOpen, setSrcOpen] = useState(false)
  const [dstOpen, setDstOpen] = useState(false)

  const options = useMemo(() => (wallet ? buildOptions(wallet) : []), [wallet])

  // Default source = withdrawal (highest priority), default destination = shopping.
  useEffect(() => {
    if (options.length && !source) setSource('withdrawal')
    if (options.length && !destination) setDestination('shopping')
  }, [options, source, destination])

  const loadRecent = useCallback(async () => {
    if (!user?.id) return
    try {
      const resp = await apiFetch<TransactionsResponse>(
        `/financial/transactions?userId=${user.id}&page=1&limit=10&type=transfer_out`
      )
      setRecent(resp.transactions)
    } catch {
      // silently ignore — recent list is non-critical
    }
  }, [user?.id])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  const amountReais = parseFloat(amountStr.replace(',', '.')) || 0
  const sourceOpt = options.find((o) => o.key === source)
  const destOpt = options.find((o) => o.key === destination)

  // Fee rule: withdrawal → any = 0%. Otherwise 5%.
  const feePercent = source === 'withdrawal' ? 0 : 5
  const feeCents = Math.round((amountReais * 100 * feePercent) / 100)
  const netCents = Math.round(amountReais * 100) - feeCents

  const canSubmit =
    !!source &&
    !!destination &&
    source !== destination &&
    amountReais > 0 &&
    sourceOpt &&
    amountReais * 100 <= sourceOpt.cents &&
    !submitting

  const handleSubmit = async () => {
    if (!user?.id) return
    if (!canSubmit) {
      if (sourceOpt && amountReais * 100 > sourceOpt.cents) {
        toast.error('Saldo insuficiente na carteira de origem')
      } else if (source === destination) {
        toast.error('Origem e destino não podem ser iguais')
      } else if (amountReais <= 0) {
        toast.error('Informe um valor válido')
      }
      return
    }
    setSubmitting(true)
    try {
      const resp = await apiFetch<TransferResponse>('/financial/transfer', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          source,
          destination,
          amount: amountReais,
        }),
      })
      toast.success(
        `Transferência realizada!${resp.feePercent > 0 ? ` Taxa: R$ ${resp.fee.replace('.', ',')}.` : ' Sem taxa.'}`
      )
      await refresh()
      router.push('/mobile/carteira')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao transferir')
    } finally {
      setSubmitting(false)
    }
  }

  if (walletLoading && !wallet) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Transferir" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  if (!wallet) return null

  return (
    <MobileAppShell>
      <MobilePageHeader title="Transferir" />

      <div className="px-4 pt-4">
        {/* Fee info banner */}
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-2"
          style={{ backgroundColor: MINT_BG }}
        >
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            <strong>Gratuito</strong> saindo da carteira <strong>Saque</strong>.
            Demais carteiras têm <strong>5% de taxa</strong>.
          </p>
        </div>

        {/* Source wallet selector */}
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          De (carteira de origem)
        </label>
        <div className="relative mb-4">
          <button
            type="button"
            onClick={() => {
              setSrcOpen((v) => !v)
              setDstOpen(false)
            }}
            className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between gap-2 min-h-[44px]"
          >
            {sourceOpt ? (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                  style={{ backgroundColor: MINT_BG }}
                >
                  <sourceOpt.icon className="h-4 w-4" style={{ color: '#059669' }} />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {sourceOpt.label}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    R$ {formatBRL(sourceOpt.cents)} disponível
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Selecione a origem</span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${srcOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {srcOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-72 overflow-y-auto">
              {options.map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSource(opt.key)
                      setSrcOpen(false)
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: MINT_BG }}
                    >
                      <Icon className="h-4 w-4" style={{ color: '#059669' }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{opt.label}</p>
                      <p className="text-[10px] text-gray-500">
                        R$ {formatBRL(opt.cents)}
                      </p>
                    </div>
                    {source === opt.key && (
                      <Check className="h-4 w-4" style={{ color: PRIMARY }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Swap arrow */}
        <div className="flex justify-center -my-2 mb-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm z-10"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
          </span>
        </div>

        {/* Destination wallet selector (excludes `withdrawal`) */}
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Para (carteira de destino)
        </label>
        <div className="relative mb-4">
          <button
            type="button"
            onClick={() => {
              setDstOpen((v) => !v)
              setSrcOpen(false)
            }}
            className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between gap-2 min-h-[44px]"
          >
            {destOpt ? (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                  style={{ backgroundColor: MINT_BG }}
                >
                  <destOpt.icon className="h-4 w-4" style={{ color: '#059669' }} />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {destOpt.label}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Saldo atual: R$ {formatBRL(destOpt.cents)}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Selecione o destino</span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${dstOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {dstOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-72 overflow-y-auto">
              {options
                .filter((o) => o.key !== 'withdrawal')
                .map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setDestination(opt.key)
                        setDstOpen(false)
                      }}
                      className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                    >
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                        style={{ backgroundColor: MINT_BG }}
                      >
                        <Icon className="h-4 w-4" style={{ color: '#059669' }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{opt.label}</p>
                        <p className="text-[10px] text-gray-500">
                          R$ {formatBRL(opt.cents)}
                        </p>
                      </div>
                      {destination === opt.key && (
                        <Check className="h-4 w-4" style={{ color: PRIMARY }} />
                      )}
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        {/* Amount input */}
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Valor (R$)
        </label>
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-gray-500">
            R$
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.,]/g, ''))}
            className="w-full h-12 pl-11 pr-3 rounded-xl border border-gray-200 bg-white text-base font-bold text-gray-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
            style={{ borderColor: PRIMARY }}
          />
        </div>

        {/* Summary */}
        {amountReais > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl bg-gray-50 p-3 mb-4 space-y-1"
          >
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Valor enviado</span>
              <span className="font-semibold text-gray-900">
                R$ {formatBRL(Math.round(amountReais * 100))}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Taxa ({feePercent}%)</span>
              <span
                className="font-semibold"
                style={{ color: feeCents > 0 ? ERROR_RED : GREEN }}
              >
                {feeCents > 0 ? `− R$ ${formatBRL(feeCents)}` : 'Grátis'}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Recebido pelo destino</span>
              <span className="font-bold" style={{ color: GREEN }}>
                R$ {formatBRL(netCents)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 min-h-[44px]"
          style={{ backgroundColor: PRIMARY }}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ArrowLeftRight className="h-4 w-4" />
              Transferir R$ {amountReais > 0 ? formatBRL(Math.round(amountReais * 100)) : '0,00'}
            </>
          )}
        </button>

        {/* Recent transfers */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Transferências recentes</h2>
          {recent.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-2"
                style={{ backgroundColor: MINT_BG }}
              >
                <ArrowLeftRight className="h-5 w-5" style={{ color: '#059669' }} />
              </div>
              <p className="text-xs text-gray-500">Nenhuma transferência ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-white"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#FEF2F2' }}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" style={{ color: ERROR_RED }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {tx.description || 'Transferência'}
                    </p>
                    <p className="text-[10px] text-gray-500">{formatDate(tx.createdAt)}</p>
                  </div>
                  <p
                    className="text-xs font-bold whitespace-nowrap"
                    style={{ color: ERROR_RED }}
                  >
                    − R$ {formatBRL(Math.abs(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
