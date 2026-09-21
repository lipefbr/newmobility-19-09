'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Ticket,
  Check,
  Clock,
  XCircle,
  Plus,
  Gift,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/perfil/cupons — Vouchers / Coupons.
// ----------------------------------------------------------------------------
// Fetches GET /api/vouchers?userId=X (returns active/used/expired partitions).
// Shows a redeem input + button → POST /api/vouchers/redeem {userId, code}.
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'
const ERROR_RED = '#EF4444'
const WARNING = '#F59E0B'

interface Voucher {
  id: string
  code: string
  amount: number
  type: string
  isUsed: boolean
  usedAt?: string | null
  expiresAt?: string | null
  createdAt: string
}

interface VouchersResponse {
  active: Voucher[]
  used: Voucher[]
  expired: Voucher[]
  totalActive: number
  totalUsed: number
  totalExpired: number
}

interface RedeemResponse {
  voucher: { id: string; code: string; amount: number; type: string }
  creditedAmount: number
  balanceName: string
  message?: string
}

const TYPE_LABELS: Record<string, string> = {
  mobility: 'Mobilidade',
  food: 'Refeição',
  pharmacy: 'Farmácia',
  shopping: 'Compras',
  gratification: 'Gratificação',
  paymentInvoice: 'Pagamento Fatura',
  signup_bonus: 'Bônus de cadastro',
  plan_bonus: 'Bônus de plano',
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function CuponsPage() {
  const router = useRouter()
  const { user, loading } = useMobileAuth()
  const [vouchers, setVouchers] = useState<VouchersResponse | null>(null)
  const [fetching, setFetching] = useState(true)
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setFetching(true)
    try {
      const resp = await apiFetch<VouchersResponse>(`/vouchers?userId=${user.id}`)
      setVouchers(resp)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar cupons')
    } finally {
      setFetching(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const onRedeem = async () => {
    if (!user?.id) return
    if (!code.trim()) {
      toast.error('Digite o código do cupom')
      return
    }
    setRedeeming(true)
    try {
      const resp = await apiFetch<RedeemResponse>('/vouchers/redeem', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, code: code.trim() }),
      })
      toast.success(
        `Cupom resgatado! R$ ${formatBRL(resp.creditedAmount)} creditado em ${resp.balanceName}.`
      )
      setCode('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resgatar cupom')
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Meus Cupons" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <MobilePageHeader title="Meus Cupons" />

      <div className="px-4 pt-4">
        {/* Redeem form */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4">
          <p className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
            <Plus className="h-4 w-4" style={{ color: PRIMARY }} />
            Resgatar cupom
          </p>
          <p className="text-[11px] text-gray-500 mb-3">
            Digite o código do voucher para creditar o valor na carteira
            correspondente.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EX: NM-XXXX-XXXX"
              className="flex-1 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
              style={{ borderColor: PRIMARY }}
            />
            <button
              onClick={onRedeem}
              disabled={redeeming || !code.trim()}
              className="px-4 h-11 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 min-h-[44px]"
              style={{ backgroundColor: PRIMARY }}
            >
              {redeeming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Resgatar
                </>
              )}
            </button>
          </div>
        </section>

        {/* Active vouchers */}
        <section className="mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
            <Ticket className="h-4 w-4" style={{ color: GREEN }} />
            Disponíveis ({vouchers?.active.length ?? 0})
          </h2>
          {fetching ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: PRIMARY }} />
            </div>
          ) : !vouchers || vouchers.active.length === 0 ? (
            <div className="text-center py-8">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-2"
                style={{ backgroundColor: MINT_BG }}
              >
                <Ticket className="h-6 w-6" style={{ color: '#059669' }} />
              </div>
              <p className="text-xs text-gray-500">
                Nenhum cupom disponível no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {vouchers.active.map((v, idx) => (
                <VoucherCard key={v.id} voucher={v} status="active" index={idx} />
              ))}
            </div>
          )}
        </section>

        {/* Used vouchers */}
        {vouchers && vouchers.used.length > 0 && (
          <section className="mb-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Check className="h-4 w-4 text-gray-500" />
              Utilizados ({vouchers.used.length})
            </h2>
            <div className="space-y-2">
              {vouchers.used.map((v, idx) => (
                <VoucherCard key={v.id} voucher={v} status="used" index={idx} />
              ))}
            </div>
          </section>
        )}

        {/* Expired vouchers */}
        {vouchers && vouchers.expired.length > 0 && (
          <section className="mb-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-500" />
              Expirados ({vouchers.expired.length})
            </h2>
            <div className="space-y-2">
              {vouchers.expired.map((v, idx) => (
                <VoucherCard key={v.id} voucher={v} status="expired" index={idx} />
              ))}
            </div>
          </section>
        )}

        {/* Info */}
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-2"
          style={{ backgroundColor: MINT_BG }}
        >
          <Gift className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            Cupons resgatados são creditados como saldo de uso (não sacável).
            Use no marketplace, restaurantes e serviços parceiros.
          </p>
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VoucherCard — single voucher display row.
// ─────────────────────────────────────────────────────────────────────────────
function VoucherCard({
  voucher,
  status,
  index,
}: {
  voucher: Voucher
  status: 'active' | 'used' | 'expired'
  index: number
}) {
  const accentColor =
    status === 'active' ? GREEN : status === 'used' ? '#6B7280' : ERROR_RED
  const statusLabel =
    status === 'active' ? 'Disponível' : status === 'used' ? 'Usado' : 'Expirado'
  const statusIcon =
    status === 'active' ? Ticket : status === 'used' ? Check : XCircle

  const Icon = statusIcon

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="rounded-xl border border-gray-100 bg-white p-3 flex items-center gap-3 shadow-sm"
      style={{ opacity: status === 'active' ? 1 : 0.7 }}
    >
      <div
        className="flex flex-col items-center justify-center h-14 w-14 rounded-lg flex-shrink-0"
        style={{ backgroundColor: `${accentColor}15` }}
      >
        <Icon className="h-5 w-5" style={{ color: accentColor }} />
        <p className="text-[9px] font-bold mt-0.5" style={{ color: accentColor }}>
          {statusLabel}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-bold text-gray-900 truncate">
          {voucher.code}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {TYPE_LABELS[voucher.type] || voucher.type} • R$ {formatBRL(voucher.amount)}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {status === 'used'
            ? `Usado em ${formatDate(voucher.usedAt)}`
            : `Expira em ${formatDate(voucher.expiresAt)}`}
        </p>
      </div>
      <p className="text-sm font-bold text-gray-900 flex-shrink-0">
        R$ {formatBRL(voucher.amount)}
      </p>
    </motion.div>
  )
}
