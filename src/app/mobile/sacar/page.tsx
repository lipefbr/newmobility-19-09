'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Banknote,
  Info,
  AlertTriangle,
  ChevronRight,
  KeyRound,
  Check,
  Calendar,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/sacar — Request a withdrawal (PIX).
// ----------------------------------------------------------------------------
// Flow:
//   1. Show available withdrawal balance (wallet.withdrawalCents).
//   2. User enters an amount in REAIS.
//   3. Show fee info: 5% normally, FREE between days 5-8 of each month.
//   4. Show limits: min R$ 100, max R$ 5.000/dia, max R$ 200.000/mês.
//   5. PIX key is required — if missing, link to /mobile/perfil to register.
//   6. Submit → POST /api/financial/withdraw {userId, amount, category:'withdrawal'}
//      → on success: toast + redirect to /mobile/carteira.
//   7. Below: recent withdrawals (GET /api/financial/withdrawals?userId=X).
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'
const ERROR_RED = '#EF4444'
const WARNING = '#F59E0B'

interface WithdrawResponse {
  message: string
  transaction: { id: string }
  newBalance: number
  pixKey: string
  feeCents: number
  netCents: number
  isFreeWithdrawal: boolean
}

interface Withdrawal {
  id: string
  amount: number
  status: string
  description?: string | null
  createdAt: string
  estimatedDate?: string
  steps?: { status: string; label: string; completed: boolean }[]
}

interface WithdrawalsResponse {
  withdrawals: Withdrawal[]
  limits: { minWithdrawal: number; maxWithdrawal: number; withdrawalFee: number }
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

function isFreeDay(d = new Date()): boolean {
  const day = d.getDate()
  return day >= 5 && day <= 8
}

export default function SacarPage() {
  const router = useRouter()
  const { user, wallet, loading, refresh } = useMobileAuth()
  const [amountStr, setAmountStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])

  const pixKey = user?.pixKey || ''
  const hasPix = pixKey.trim().length > 0
  const available = wallet?.withdrawalCents ?? 0
  const freeDay = isFreeDay()

  const amountReais = parseFloat(amountStr.replace(',', '.')) || 0
  const amountCents = Math.round(amountReais * 100)
  const feeCents = freeDay ? 0 : Math.round((amountCents * 5) / 100)
  const netCents = amountCents - feeCents

  const meetsMin = amountCents >= 10000 // R$ 100
  const withinBalance = amountCents <= available
  const canSubmit =
    hasPix && meetsMin && withinBalance && amountCents > 0 && !submitting

  const loadWithdrawals = async () => {
    if (!user?.id) return
    try {
      const resp = await apiFetch<WithdrawalsResponse>(
        `/financial/withdrawals?userId=${user.id}`
      )
      setWithdrawals(resp.withdrawals)
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    loadWithdrawals()
     
  }, [user?.id])

  const handleSubmit = async () => {
    if (!user?.id) return
    if (!hasPix) {
      toast.error('Cadastre sua chave PIX antes de sacar')
      return
    }
    if (!meetsMin) {
      toast.error('Valor mínimo para saque é R$ 100,00')
      return
    }
    if (!withinBalance) {
      toast.error('Saldo insuficiente')
      return
    }
    setSubmitting(true)
    try {
      const resp = await apiFetch<WithdrawResponse>('/financial/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          amount: amountReais,
          category: 'withdrawal',
        }),
      })
      toast.success(resp.message || 'Saque solicitado com sucesso!')
      await refresh()
      router.push('/mobile/carteira')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao solicitar saque')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !wallet) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Solicitar Saque" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <MobilePageHeader title="Solicitar Saque" />

      <div className="px-4 pt-4">
        {/* Available balance hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-white shadow-lg mb-4"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #0B4FE0 100%)`,
          }}
        >
          <p className="text-xs text-white/80 font-medium">Saldo disponível para saque</p>
          <p className="text-3xl font-bold mt-1">R$ {formatBRL(available)}</p>
          <p className="text-xs text-white/70 mt-1.5">
            Saque via PIX em até 1-3 dias úteis após aprovação.
          </p>
        </motion.div>

        {/* Free-day banner */}
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-2"
          style={{
            backgroundColor: freeDay ? MINT_BG : '#FEF3C7',
          }}
        >
          {freeDay ? (
            <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          ) : (
            <Calendar className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: WARNING }} />
          )}
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: freeDay ? '#065F46' : '#92400E' }}
          >
            {freeDay ? (
              <>
                <strong>SAQUE GRÁTIS hoje!</strong> Estamos na janela gratuita
                (dias 5 a 8 de cada mês). Sem taxa.
              </>
            ) : (
              <>
                <strong>Taxa de 5%</strong> para saques.{' '}
                <strong>SAQUE GRÁTIS</strong> entre os dias 5 e 8 de cada mês.
              </>
            )}
          </p>
        </div>

        {/* PIX key status */}
        {!hasPix ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4 flex items-start gap-2">
            <AlertTriangle
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              style={{ color: WARNING }}
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-900">
                Chave PIX necessária
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Cadastre sua chave PIX para sacar.
              </p>
              <button
                onClick={() => router.push('/mobile/perfil')}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-900 min-h-[44px]"
              >
                Cadastrar agora
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-3 mb-4 flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
              style={{ backgroundColor: MINT_BG }}
            >
              <KeyRound className="h-4 w-4" style={{ color: '#059669' }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 font-medium">Chave PIX para crédito</p>
              <p className="text-xs font-mono font-semibold text-gray-900 truncate">
                {pixKey}
              </p>
            </div>
            <button
              onClick={() => router.push('/mobile/perfil')}
              className="text-xs font-semibold min-h-[44px] min-w-[44px] flex items-center"
              style={{ color: PRIMARY }}
            >
              Editar
            </button>
          </div>
        )}

        {/* Amount input */}
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Quanto você quer sacar?
        </label>
        <div className="relative mb-2">
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

        {/* Quick amount buttons */}
        <div className="flex gap-2 mb-3">
          {[100, 500, 1000, 5000].map((v) => (
            <button
              key={v}
              onClick={() => setAmountStr(String(v))}
              disabled={v * 100 > available}
              className="flex-1 h-9 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 min-h-[44px] flex items-center justify-center"
            >
              R$ {v}
            </button>
          ))}
        </div>

        {/* Summary */}
        {amountReais > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl bg-gray-50 p-3 mb-3 space-y-1"
          >
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Valor solicitado</span>
              <span className="font-semibold text-gray-900">
                R$ {formatBRL(amountCents)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Taxa (5%)</span>
              <span
                className="font-semibold"
                style={{ color: feeCents > 0 ? ERROR_RED : GREEN }}
              >
                {feeCents > 0 ? `− R$ ${formatBRL(feeCents)}` : 'Grátis'}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Você recebe</span>
              <span className="font-bold" style={{ color: GREEN }}>
                R$ {formatBRL(netCents)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Validation errors */}
        {amountReais > 0 && !meetsMin && (
          <p className="text-[11px] text-red-600 mb-2">
            Valor mínimo para saque é R$ 100,00.
          </p>
        )}
        {amountReais > 0 && !withinBalance && (
          <p className="text-[11px] text-red-600 mb-2">Saldo insuficiente.</p>
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
              <Banknote className="h-4 w-4" />
              Solicitar saque
            </>
          )}
        </button>

        {/* Limits info */}
        <div className="rounded-xl border border-gray-100 bg-white p-3 mt-4">
          <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" style={{ color: PRIMARY }} />
            Limites e regras
          </p>
          <ul className="text-[11px] text-gray-600 space-y-1">
            <li>• Mínimo por saque: <strong>R$ 100,00</strong></li>
            <li>• Máximo por dia: <strong>R$ 5.000,00</strong></li>
            <li>• Máximo por mês: <strong>R$ 200.000,00</strong></li>
            <li>• Taxa: <strong>5%</strong> (grátis dias 5-8 de cada mês)</li>
            <li>• Processamento: <strong>1-3 dias úteis</strong> após aprovação</li>
          </ul>
        </div>

        {/* Recent withdrawals */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Saques recentes</h2>
          {withdrawals.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-2"
                style={{ backgroundColor: MINT_BG }}
              >
                <Banknote className="h-5 w-5" style={{ color: '#059669' }} />
              </div>
              <p className="text-xs text-gray-500">Nenhum saque solicitado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => {
                const st =
                  w.status === 'pending'
                    ? { label: 'Pendente', color: WARNING }
                    : w.status === 'approved' || w.status === 'paid'
                      ? { label: 'Aprovado', color: GREEN }
                      : w.status === 'rejected'
                        ? { label: 'Rejeitado', color: ERROR_RED }
                        : { label: w.status, color: '#6B7280' }
                return (
                  <div
                    key={w.id}
                    className="rounded-xl border border-gray-100 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {w.description || 'Solicitação de saque'}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatDate(w.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          R$ {formatBRL(Math.abs(w.amount))}
                        </p>
                        <span
                          className="inline-flex items-center px-1.5 h-4 rounded text-[9px] font-bold mt-0.5"
                          style={{ backgroundColor: `${st.color}20`, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
