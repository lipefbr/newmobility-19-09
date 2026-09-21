'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  Copy,
  Check,
  QrCode,
  Info,
  KeyRound,
  Share2,
  ArrowDownToLine,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/receber — Show the user's PIX key so they can receive transfers.
// ----------------------------------------------------------------------------
// Sections:
//   1. Blue header "Receber" + back button.
//   2. Big PIX key card with copy + share buttons.
//   3. QR code placeholder (styled box — we don't ship a QR lib yet).
//   4. Inline form to register/edit the PIX key if the user doesn't have one.
//   5. Recent incoming transfers list (filter transactions type=transfer_in).
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'

interface ProfileUpdateResponse {
  id: string
  pixKey?: string | null
  [k: string]: unknown
}

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  description?: string | null
  createdAt: string
}

interface TransactionsResponse {
  transactions: Transaction[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
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

export default function ReceberPage() {
  const { user, loading } = useMobileAuth()
  const [copied, setCopied] = useState(false)
  const [pixInput, setPixInput] = useState('')
  const [savingPix, setSavingPix] = useState(false)
  const [recent, setRecent] = useState<Transaction[]>([])

  const pixKey = user?.pixKey || ''
  const hasPix = pixKey.trim().length > 0

  // Load recent incoming transfers (transfer_in type)
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      try {
        const resp = await apiFetch<TransactionsResponse>(
          `/financial/transactions?userId=${user.id}&page=1&limit=10&type=transfer_in`
        )
        if (!cancelled) setRecent(resp.transactions)
      } catch {
        // ignore — recent list is non-critical
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const onCopyPix = async () => {
    if (!pixKey) return
    try {
      await navigator.clipboard.writeText(pixKey)
      setCopied(true)
      toast.success('Chave PIX copiada!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  const onShare = async () => {
    if (!pixKey) return
    const text = `Minha chave PIX NewMobility: ${pixKey}`
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'Chave PIX', text })
      } catch {
        // user dismissed share sheet
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Chave copiada para compartilhar!')
      } catch {
        toast.error('Não foi possível compartilhar')
      }
    }
  }

  const onSavePix = async () => {
    if (!user?.id) return
    if (!pixInput.trim()) {
      toast.error('Informe uma chave PIX')
      return
    }
    setSavingPix(true)
    try {
      await apiFetch<ProfileUpdateResponse>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, pixKey: pixInput.trim() }),
      })
      toast.success('Chave PIX salva com sucesso!')
      setPixInput('')
      // Force page reload to refresh user from store — simple and effective.
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar chave PIX')
    } finally {
      setSavingPix(false)
    }
  }

  if (loading && !user) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Receber" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <MobilePageHeader title="Receber" />

      <div className="px-4 pt-4">
        {/* Hero card with PIX key */}
        {hasPix ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 text-white shadow-lg mb-4"
            style={{
              background: `linear-gradient(135deg, ${PRIMARY} 0%, #0B4FE0 100%)`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                <KeyRound className="h-4 w-4 text-white" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Sua chave PIX</p>
                <p className="text-[10px] text-white/70">Para receber transferências</p>
              </div>
            </div>
            <p className="text-base font-mono font-bold break-all bg-white/10 rounded-lg px-3 py-2.5">
              {pixKey}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onCopyPix}
                className="flex-1 h-10 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copiada!' : 'Copiar'}
              </button>
              <button
                onClick={onShare}
                className="flex-1 h-10 rounded-xl bg-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
                style={{ color: PRIMARY }}
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: MINT_BG }}
              >
                <KeyRound className="h-4 w-4" style={{ color: '#059669' }} />
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-900">Cadastre sua chave PIX</p>
                <p className="text-[10px] text-gray-500">Necessária para receber valores</p>
              </div>
            </div>
            <input
              type="text"
              value={pixInput}
              onChange={(e) => setPixInput(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
              style={{ borderColor: PRIMARY }}
            />
            <button
              onClick={onSavePix}
              disabled={savingPix}
              className="w-full mt-2 h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              style={{ backgroundColor: PRIMARY }}
            >
              {savingPix ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Salvar chave PIX
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* QR code placeholder */}
        {hasPix && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="h-4 w-4" style={{ color: PRIMARY }} />
              <p className="text-xs font-semibold text-gray-900">QR Code</p>
            </div>
            <div
              className="aspect-square max-w-[220px] mx-auto rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: '#F9FAFB',
                backgroundImage:
                  'repeating-linear-gradient(0deg, #E5E7EB 0 8px, transparent 8px 16px), repeating-linear-gradient(90deg, #E5E7EB 0 8px, transparent 8px 16px)',
              }}
            >
              <div className="px-4 py-2 rounded-lg bg-white shadow-sm flex flex-col items-center">
                <QrCode className="h-10 w-10 text-gray-400" />
                <p className="text-[10px] text-gray-500 mt-1 text-center break-all max-w-[160px]">
                  {pixKey}
                </p>
              </div>
            </div>
            <p className="text-center text-[11px] text-gray-500 mt-2">
              Peça para a pessoa escanear ou copiar sua chave
            </p>
          </div>
        )}

        {/* Edit PIX button if already has one */}
        {hasPix && !pixInput && (
          <button
            onClick={() => setPixInput(pixKey)}
            className="w-full h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors mb-4 min-h-[44px]"
          >
            Editar chave PIX
          </button>
        )}

        {/* Edit form (when editing) */}
        {hasPix && pixInput && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4"
          >
            <p className="text-xs font-semibold text-gray-900 mb-2">Atualizar chave PIX</p>
            <input
              type="text"
              value={pixInput}
              onChange={(e) => setPixInput(e.target.value)}
              placeholder="Nova chave PIX"
              className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
              style={{ borderColor: PRIMARY }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setPixInput('')}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={onSavePix}
                disabled={savingPix}
                className="flex-1 h-11 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                style={{ backgroundColor: PRIMARY }}
              >
                {savingPix ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Info box */}
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-2"
          style={{ backgroundColor: MINT_BG }}
        >
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            Compartilhe sua chave PIX para receber valores de qualquer banco.
            O saldo entra direto na sua carteira NewMobility.
          </p>
        </div>

        {/* Recent incoming transfers */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2">
            Transferências recebidas
          </h2>
          {recent.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-2"
                style={{ backgroundColor: MINT_BG }}
              >
                <ArrowDownToLine className="h-5 w-5" style={{ color: '#059669' }} />
              </div>
              <p className="text-xs text-gray-500">Nenhuma transferência recebida ainda.</p>
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
                    style={{ backgroundColor: MINT_BG }}
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" style={{ color: '#059669' }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {tx.description || 'Transferência recebida'}
                    </p>
                    <p className="text-[10px] text-gray-500">{formatDate(tx.createdAt)}</p>
                  </div>
                  <p
                    className="text-xs font-bold whitespace-nowrap"
                    style={{ color: GREEN }}
                  >
                    + R$ {formatBRL(Math.abs(tx.amount))}
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
