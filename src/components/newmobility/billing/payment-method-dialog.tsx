'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CreditCard, Receipt, Loader2, CheckCircle2, Calendar, Wallet } from 'lucide-react'

// ----------------------------------------------------------------------------
// Types & constants
// ----------------------------------------------------------------------------

export type PaymentMethod = 'pix' | 'boleto' | 'credit_card'

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod
  label: string
  description: string
  icon: typeof CreditCard
}[] = [
  { value: 'pix', label: 'PIX', description: 'Aprovação imediata após pagamento', icon: Wallet },
  { value: 'boleto', label: 'Boleto', description: 'Vence em 3 dias úteis', icon: Receipt },
  { value: 'credit_card', label: 'Cartão de Crédito', description: 'Cobrança automática mensal', icon: CreditCard },
]

export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null
  const opt = PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)
  return opt?.label ?? method
}

export function formatBRLFromCents(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export interface PaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Invoice being paid — needs at least amount + dueDate + description. */
  invoice: {
    id: string
    amount: number
    dueDate: string
    description: string | null
    type?: string | null
  } | null
  /** Bucket label (e.g. "Plano Mensal", "Telemedicina") shown as the title. */
  bucketLabel?: string
  /** Called with the chosen payment method when the user confirms. */
  onConfirm: (method: PaymentMethod) => Promise<void> | void
  /** Disables the confirm button (e.g. parent is already calling the API). */
  loading?: boolean
}

/**
 * PaymentMethodDialog
 * --------------------
 * Pre-payment confirmation step. Per BACK-5, clicking "Pagar" on an invoice
 * that has no `asaasPaymentId` no longer marks it as paid instantly —
 * instead we open this dialog so the user picks PIX / Boleto / Cartão and
 * reviews the amount + due date before confirming.
 *
 * Until the Asaas gateway is fully integrated, the parent still calls the
 * existing `POST /api/billing/pay/[invoiceId]` endpoint (now with the
 * `paymentMethod` in the body) which marks the invoice as paid AND records
 * the chosen method on the Invoice record.
 */
export function PaymentMethodDialog({
  open,
  onOpenChange,
  invoice,
  bucketLabel,
  onConfirm,
  loading = false,
}: PaymentMethodDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('pix')

  // Reset the selection whenever the dialog opens for a different invoice.
  // We track the invoice id we're rendering for; if it changes, the next
  // render uses a fresh 'pix' default. This avoids calling setState inside
  // an effect (which would trigger a cascading render per the lint rule
  // react-hooks/set-state-in-effect).
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null)
  const currentInvoiceId = invoice?.id ?? null
  if (currentInvoiceId !== lastInvoiceId) {
    setLastInvoiceId(currentInvoiceId)
    if (open) setMethod('pix')
  }

  const amountCents = Math.abs(Number(invoice?.amount) || 0)
  const amountStr = formatBRLFromCents(amountCents)
  const dueStr = invoice?.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('pt-BR')
    : '—'
  const description = invoice?.description || invoice?.type || bucketLabel || 'Fatura NewMobility'

  const handleConfirm = async () => {
    await onConfirm(method)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl shadow-lg sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base flex items-center gap-2">
                Marcar como pago (admin)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ação administrativa — registra a forma de pagamento e marca a
                fatura como paga sem passar pelo gateway Asaas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice summary */}
          <div className="rounded-xl border border-border bg-muted/40 dark:bg-muted/20 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {bucketLabel ? bucketLabel : 'Fatura'}
                </p>
                <p className="text-xs font-medium text-foreground truncate">{description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Valor</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{amountStr}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Vencimento: <span className="font-medium text-foreground">{dueStr}</span></span>
            </div>
          </div>

          {/* Payment method selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Forma de Pagamento *</Label>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Task 2-e (Item 5): esta ação é administrativa e NÃO processa um
              pagamento real — apenas registra a forma de pagamento informada e
              marca a fatura como paga. Para pagamentos reais via gateway,
              configure o Asaas em <strong>Admin → Asaas</strong>.
            </p>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
              className="grid gap-2"
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const checked = method === opt.value
                return (
                  <Label
                    key={opt.value}
                    htmlFor={`pay-method-${opt.value}`}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      checked
                        ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <RadioGroupItem
                      id={`pay-method-${opt.value}`}
                      value={opt.value}
                      className="mt-0.5 data-[state=checked]:border-emerald-600 data-[state=checked]:text-emerald-600"
                    />
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </Label>
                )
              })}
            </RadioGroup>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-300">
              Resumo
            </p>
            <p className="text-xs text-foreground">
              <span className="font-semibold">{amountStr}</span>
              <span className="mx-1.5 text-muted-foreground">·</span>
              <span>Pagamento via <span className="font-semibold">{paymentMethodLabel(method)}</span></span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto gap-2"
            onClick={handleConfirm}
            disabled={loading || !invoice}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Marcar como Pago
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
