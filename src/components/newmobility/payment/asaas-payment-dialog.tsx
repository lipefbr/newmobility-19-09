'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  QrCode, FileText, Copy, Check, Loader2, Clock, RefreshCw,
  ExternalLink, Download, AlertCircle, ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AsaasPayment } from '@/lib/asaas'

export interface AsaasPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing Invoice to pay (or view a linked payment for). */
  invoiceId: string
  /** Shown to the user as the invoice's purpose. */
  invoiceDescription?: string
  /** Amount in BRL cents — formatted as `R$ 999,90`. */
  invoiceAmountCents: number
  /**
   * Optional: existing Asaas payment id linked to this invoice. If provided,
   * the dialog opens directly in the "created" step showing the existing
   * payment (used by the "Ver Pagamento" button on invoices that already
   * have an asaasPaymentId).
   */
  initialAsaasPaymentId?: string
  /** Called after a payment is created (or its status changes) so the
   *  parent can refresh its own state. */
  onPaymentCreated?: () => void
}

type Step = 'choose' | 'created'

/**
 * AsaasPaymentDialog
 * ------------------
 * Reusable payment dialog for paying an Invoice via PIX or Boleto through
 * the Asaas gateway.
 *
 * Two-step flow:
 *   1. `choose` — shows the invoice description/amount and two big buttons
 *      "Pagar com PIX" (green) and "Pagar com Boleto" (gray).
 *   2. `created` — shows the generated payment details:
 *      - PIX: QR code image + copyable "copia e cola" code.
 *      - BOLETO: "Baixar Boleto (PDF)" button + "Ver Boleto Online" link.
 *      Plus a status badge, "Já paguei — verificar status" button, and a
 *      "Fechar" button.
 *
 * If `initialAsaasPaymentId` is provided, the dialog opens directly in the
 * `created` step by fetching the existing payment from
 * `GET /api/asaas/payment/{id}?userId=...`.
 */
export function AsaasPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceDescription,
  invoiceAmountCents,
  initialAsaasPaymentId,
  onPaymentCreated,
}: AsaasPaymentDialogProps) {
  const { user } = useStore()

  const [step, setStep] = useState<Step>('choose')
  const [createdPayment, setCreatedPayment] = useState<AsaasPayment | null>(null)
  const [loadingPix, setLoadingPix] = useState(false)
  const [loadingBoleto, setLoadingBoleto] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Reset state when the dialog closes.
  useEffect(() => {
    if (!open) {
      // Small delay so the close animation doesn't show stale state.
      const t = setTimeout(() => {
        setStep('choose')
        setCreatedPayment(null)
        setLoadingPix(false)
        setLoadingBoleto(false)
        setCheckingStatus(false)
        setInitialLoading(false)
        setErrorMsg(null)
        setCopied(false)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // If opening with an `initialAsaasPaymentId`, fetch it directly from Asaas
  // and skip the "choose" step.
  const fetchExisting = useCallback(async () => {
    if (!user?.id || !initialAsaasPaymentId) return
    setInitialLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(
        `/api/asaas/payment/${encodeURIComponent(initialAsaasPaymentId)}?userId=${encodeURIComponent(user.id)}`,
        { method: 'GET' }
      )
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível carregar o pagamento')
      }
      if (data?.payment) {
        setCreatedPayment(data.payment as AsaasPayment)
        setStep('created')
      } else {
        // No existing payment — fall back to the choose step.
        setStep('choose')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao carregar pagamento')
      setStep('choose')
    } finally {
      setInitialLoading(false)
    }
  }, [user?.id, initialAsaasPaymentId])

  useEffect(() => {
    if (open && initialAsaasPaymentId && user?.id) {
      fetchExisting()
    }
  }, [open, initialAsaasPaymentId, user?.id])

  const startPayment = async (billingType: 'PIX' | 'BOLETO') => {
    if (!user?.id) {
      setErrorMsg('Usuário não autenticado')
      return
    }
    if (billingType === 'PIX') setLoadingPix(true)
    else setLoadingBoleto(true)
    setErrorMsg(null)

    try {
      // Step 1: ensure Asaas customer exists.
      const custRes = await fetch('/api/asaas/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const custData = await custRes.json().catch(() => ({} as any))
      if (!custRes.ok) {
        throw new Error(custData?.error || 'Falha ao validar cliente Asaas')
      }

      // Step 2: create the payment in Asaas.
      const payRes = await fetch('/api/asaas/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, invoiceId, billingType }),
      })
      const payData = await payRes.json().catch(() => ({} as any))
      if (!payRes.ok) {
        throw new Error(payData?.error || 'Falha ao criar pagamento')
      }

      const payment: AsaasPayment = payData.payment
      setCreatedPayment(payment)
      setStep('created')
      onPaymentCreated?.()
      toast.success(
        billingType === 'PIX'
          ? 'Código PIX gerado com sucesso!'
          : 'Boleto gerado com sucesso!'
      )
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar pagamento')
      toast.error(err?.message || 'Erro ao processar pagamento')
    } finally {
      setLoadingPix(false)
      setLoadingBoleto(false)
    }
  }

  const checkStatus = async () => {
    if (!user?.id || !createdPayment?.id) return
    setCheckingStatus(true)
    setErrorMsg(null)
    try {
      const res = await fetch(
        `/api/asaas/payment/${encodeURIComponent(createdPayment.id)}?userId=${encodeURIComponent(user.id)}`,
        { method: 'GET' }
      )
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível verificar o status')
      }
      if (data?.payment) {
        setCreatedPayment(data.payment as AsaasPayment)
      }
      onPaymentCreated?.()
      const status = (data?.payment?.status || '').toUpperCase()
      if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH') {
        toast.success('Pagamento confirmado!')
      } else if (status === 'OVERDUE') {
        toast.error('Boleto vencido. Gere um novo pagamento se necessário.')
      } else {
        toast.info('Pagamento ainda pendente. Tente novamente em alguns instantes.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao verificar status')
      toast.error(err?.message || 'Erro ao verificar status')
    } finally {
      setCheckingStatus(false)
    }
  }

  const copyPixCode = async () => {
    if (!createdPayment?.pixCopyPaste) return
    try {
      await navigator.clipboard.writeText(createdPayment.pixCopyPaste)
      setCopied(true)
      toast.success('Código PIX copiado!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Não foi possível copiar o código')
    }
  }

  // ----- Derived display values -----
  const amountLabel = formatCurrency(Number(invoiceAmountCents) || 0)
  const descriptionLabel = invoiceDescription || 'Fatura NewMobility'

  const status = (createdPayment?.status || '').toUpperCase()
  const statusBadge = renderStatusBadge(status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-600" />
            Pagamento de Fatura
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pague esta fatura via PIX ou Boleto através do Asaas.
          </DialogDescription>
        </DialogHeader>

        {/* Invoice summary — shown in both steps */}
        <Card className="bg-muted/40 border-border">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-muted-foreground">Fatura</span>
              <span className="text-xs font-mono text-foreground truncate max-w-[200px]">
                #{String(invoiceId).toUpperCase().slice(0, 12)}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {descriptionLabel}
            </p>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-muted-foreground">Valor</span>
              <span className="text-lg font-bold text-foreground">
                {amountLabel}
              </span>
            </div>
          </CardContent>
        </Card>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMsg}</p>
          </div>
        )}

        {initialLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">
              Carregando pagamento…
            </span>
          </div>
        )}

        {/* ─────────────────── Step: choose ─────────────────── */}
        {!initialLoading && step === 'choose' && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground text-center">
              Escolha o método de pagamento:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => startPayment('PIX')}
                disabled={loadingPix || loadingBoleto}
                className="h-auto py-4 flex flex-col items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loadingPix ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <QrCode className="h-7 w-7" />
                )}
                <span className="text-sm font-semibold">Pagar com PIX</span>
                <span className="text-[10px] font-normal opacity-90">
                  Aprovação imediata
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => startPayment('BOLETO')}
                disabled={loadingPix || loadingBoleto}
                className="h-auto py-4 flex flex-col items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                {loadingBoleto ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <FileText className="h-7 w-7" />
                )}
                <span className="text-sm font-semibold">Pagar com Boleto</span>
                <span className="text-[10px] font-normal opacity-90">
                  Vence em até 3 dias
                </span>
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-3">
              <Clock className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                Após o pagamento, o status da fatura será atualizado
                automaticamente. Você também pode verificar manualmente com o
                botão "Já paguei — verificar status".
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        )}

        {/* ─────────────────── Step: created ─────────────────── */}
        {!initialLoading && step === 'created' && createdPayment && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              {statusBadge}
            </div>

            {/* PIX view */}
            {createdPayment.billingType === 'PIX' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground text-center">
                  Aguardando pagamento via PIX
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Escaneie o QR Code abaixo no app do seu banco
                </p>

                {createdPayment.pixQrCode ? (
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
                      <img
                        src={createdPayment.pixQrCode}
                        alt="QR Code PIX"
                        className="w-56 h-56 mx-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center text-xs text-muted-foreground">
                    QR Code indisponível
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Ou copie e cole o código:
                  </p>
                  <textarea
                    readOnly
                    value={createdPayment.pixCopyPaste || ''}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    className="w-full h-20 text-[10px] font-mono p-2 rounded-lg bg-muted border border-border text-foreground resize-none break-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    onClick={copyPixCode}
                    disabled={!createdPayment.pixCopyPaste}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Código copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar código PIX
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Abra o app do seu banco e escaneie o QR Code ou cole o código
                </p>
              </div>
            )}

            {/* BOLETO view */}
            {createdPayment.billingType === 'BOLETO' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground text-center">
                  Boleto gerado
                </p>

                <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Vencimento
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {createdPayment.dueDate
                        ? formatDate(createdPayment.dueDate)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valor</span>
                    <span className="text-sm font-semibold text-foreground">
                      {amountLabel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {createdPayment.bankSlipUrl && (
                    <Button
                      type="button"
                      asChild
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <a
                        href={createdPayment.bankSlipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                        Baixar Boleto (PDF)
                      </a>
                    </Button>
                  )}
                  {createdPayment.invoiceUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="gap-2"
                    >
                      <a
                        href={createdPayment.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver Boleto Online
                      </a>
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  O pagamento do boleto pode levar até 2 dias úteis para ser
                  compensado.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={checkStatus}
                disabled={checkingStatus}
              >
                {checkingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Já paguei — verificar status
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 gap-1.5"
                  onClick={() => setStep('choose')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onOpenChange(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Map an Asaas payment status to a colored Badge.
 * - PENDING / AWAITING_RISK_ANALYSIS  → yellow "Pendente"
 * - RECEIVED / CONFIRMED / RECEIVED_IN_CASH → green "Recebido"
 * - OVERDUE                            → red "Vencido"
 * - REFUNDED / CHARGEBACK_* / DUNNING_* → gray "Cancelado"
 */
function renderStatusBadge(status: string) {
  const s = (status || '').toUpperCase()
  if (s === 'RECEIVED' || s === 'CONFIRMED' || s === 'RECEIVED_IN_CASH') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Check className="h-3 w-3 mr-1" />
        Pagamento confirmado
      </Badge>
    )
  }
  if (s === 'OVERDUE') {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        <AlertCircle className="h-3 w-3 mr-1" />
        Boleto vencido
      </Badge>
    )
  }
  if (
    s === 'REFUNDED' ||
    s === 'REFUND_REQUESTED' ||
    s === 'CHARGEBACK_REQUESTED' ||
    s === 'CHARGEBACK_DISPUTE' ||
    s === 'AWAITING_CHARGEBACK_REVERSAL' ||
    s === 'DUNNING_REQUESTED' ||
    s === 'DUNNING_RECEIVED'
  ) {
    return (
      <Badge className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Cancelado
      </Badge>
    )
  }
  // Default — pending
  return (
    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <Clock className="h-3 w-3 mr-1" />
      Aguardando pagamento
    </Badge>
  )
}
