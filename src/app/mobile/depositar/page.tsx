'use client'

import { useState } from 'react'
import {
  Loader2,
  Copy,
  Check,
  QrCode,
  Info,
  KeyRound,
  ShieldCheck,
  Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/depositar — PIX deposit UI.
// ----------------------------------------------------------------------------
// NOTE: There is NO backend deposit endpoint yet. For now we:
//   - Show the user's PIX key prominently so they can receive transfers
//     from any other bank.
//   - Allow the user to register / edit their PIX key inline (PUT
//     /api/user/profile with pixKey).
//   - Show a styled "QR code" placeholder (no real QR generation without a
//     lib — instead we show the key in a copy-friendly box).
//   - On "Gerar QR Code PIX" we just show a toast saying the integration is
//     in progress.
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'

interface ProfileUpdateResponse {
  id: string
  pixKey?: string | null
  [k: string]: unknown
}

export default function DepositarPage() {
  const { user, wallet, loading, refresh } = useMobileAuth()
  const [amountStr, setAmountStr] = useState('')
  const [copied, setCopied] = useState(false)
  const [pixInput, setPixInput] = useState('')
  const [savingPix, setSavingPix] = useState(false)
  const [generating, setGenerating] = useState(false)

  const pixKey = user?.pixKey || ''
  const hasPix = pixKey.trim().length > 0

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
      await refresh()
      toast.success('Chave PIX salva com sucesso!')
      setPixInput('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar chave PIX')
    } finally {
      setSavingPix(false)
    }
  }

  const onGeneratePix = () => {
    if (!hasPix) {
      toast.error('Cadastre sua chave PIX primeiro')
      return
    }
    if (!amountStr) {
      toast.error('Informe um valor para gerar o QR Code')
      return
    }
    setGenerating(true)
    // Simulate generation (no backend deposit endpoint yet)
    setTimeout(() => {
      setGenerating(false)
      toast.info('Depósito via PIX em implementação. Use a chave abaixo para transferir.')
    }, 800)
  }

  if (loading && !wallet) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Depositar via PIX" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <MobilePageHeader title="Depositar via PIX" />

      <div className="px-4 pt-4">
        {/* Current balance mini-card */}
        <div
          className="rounded-2xl p-4 mb-4 text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #0B4FE0 100%)`,
          }}
        >
          <p className="text-xs text-white/80 font-medium">Saldo atual</p>
          <p className="text-2xl font-bold mt-1">
            R$ {formatBRL(wallet?.totalCents ?? 0)}
          </p>
        </div>

        {/* PIX key section */}
        {hasPix ? (
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
                <p className="text-xs font-semibold text-gray-900">Sua chave PIX</p>
                <p className="text-[10px] text-gray-500">Use para receber depósitos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="flex-1 text-sm font-mono font-semibold text-gray-900 break-all">
                {pixKey}
              </p>
              <button
                onClick={onCopyPix}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors min-w-[44px] min-h-[44px]"
                style={{ backgroundColor: PRIMARY }}
                aria-label="Copiar chave PIX"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Copy className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
            <button
              onClick={() => setPixInput(pixKey)}
              className="mt-2 text-xs font-semibold flex items-center gap-1 min-h-[44px]"
              style={{ color: PRIMARY }}
            >
              <Plus className="h-3 w-3" />
              Editar chave PIX
            </button>
          </motion.div>
        ) : null}

        {/* PIX key registration / edit form (always available when no key or editing) */}
        {!hasPix || pixInput ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4"
          >
            <p className="text-xs font-semibold text-gray-900 mb-1">
              {hasPix ? 'Atualizar chave PIX' : 'Cadastre sua chave PIX'}
            </p>
            <p className="text-[11px] text-gray-500 mb-3">
              CPF, e-mail, telefone ou chave aleatória.
            </p>
            <input
              type="text"
              value={pixInput}
              onChange={(e) => setPixInput(e.target.value)}
              placeholder="Ex: 11987654321"
              className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
              style={{ borderColor: PRIMARY }}
            />
            <div className="flex gap-2 mt-2">
              {hasPix && (
                <button
                  onClick={() => setPixInput('')}
                  className="flex-1 h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
              )}
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
                    Salvar chave
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : null}

        {/* Amount input */}
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Quanto você quer depositar?
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

        {/* QR code placeholder (styled box — no real QR lib yet) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="h-4 w-4" style={{ color: PRIMARY }} />
            <p className="text-xs font-semibold text-gray-900">QR Code PIX</p>
          </div>
          <div
            className="aspect-square max-w-[200px] mx-auto rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: '#F9FAFB',
              backgroundImage:
                'repeating-linear-gradient(0deg, #E5E7EB 0 8px, transparent 8px 16px), repeating-linear-gradient(90deg, #E5E7EB 0 8px, transparent 8px 16px)',
            }}
          >
            <div className="px-4 py-2 rounded-lg bg-white shadow-sm flex flex-col items-center">
              <QrCode className="h-8 w-8 text-gray-400" />
              <p className="text-[10px] text-gray-500 mt-1">QR Code</p>
            </div>
          </div>
          <p className="text-center text-[11px] text-gray-500 mt-2">
            {hasPix
              ? 'Após gerar, escaneie ou copie a chave acima'
              : 'Cadastre sua chave PIX para gerar o QR Code'}
          </p>
        </div>

        {/* Generate button */}
        <button
          onClick={onGeneratePix}
          disabled={generating || !hasPix}
          className="w-full h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 min-h-[44px]"
          style={{ backgroundColor: PRIMARY }}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <QrCode className="h-4 w-4" />
              Gerar QR Code PIX
            </>
          )}
        </button>

        {/* Info box */}
        <div
          className="rounded-xl p-3 mt-4 flex items-start gap-2"
          style={{ backgroundColor: MINT_BG }}
        >
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <p className="text-[11px] text-gray-700 leading-relaxed">
            O saldo será creditado em <strong>até 30 minutos</strong> após o
            pagamento do PIX. Em breve: geração automática de QR Code e
            confirmação instantânea.
          </p>
        </div>

        {/* Security note */}
        <div className="rounded-xl p-3 mt-3 flex items-start gap-2 bg-gray-50">
          <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-500" />
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Transações PIX protegidas pelo sistema bancário. Nunca compartilhe
            sua chave com desconhecidos.
          </p>
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
