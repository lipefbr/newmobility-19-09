'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  ArrowDownToLine,
  Loader2,
  Banknote,
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

// ---------- Types ----------

interface WithdrawalRequest {
  id: string
  userId: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'failed'
  paymentMethod: 'pix' | 'bank_transfer'
  pixKey?: string | null
  bankCode?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
  bankType?: string | null
  asaasTransferId?: string | null
  asaasStatus?: string | null
  rejectedReason?: string | null
  processedById?: string | null
  processedAt?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt: string
}

interface WithdrawalFormState {
  amount: string
  paymentMethod: 'pix' | 'bank_transfer'
  pixKey: string
  bankCode: string
  bankAgency: string
  bankAccount: string
  bankType: 'CHECKING' | 'SAVINGS'
}

const initialForm: WithdrawalFormState = {
  amount: '',
  paymentMethod: 'pix',
  pixKey: '',
  bankCode: '',
  bankAgency: '',
  bankAccount: '',
  bankType: 'CHECKING',
}

const MIN_AMOUNT_BRL = 50

function formatBRL(reais: number): string {
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatAmountCents(cents: number): string {
  return formatCurrency(cents)
}

function formatDateTimePtBR(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: WithdrawalRequest['status']) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 gap-1">
          <Clock className="h-3 w-3" /> Pendente
        </Badge>
      )
    case 'approved':
      return (
        <Badge className="bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Aprovado
        </Badge>
      )
    case 'paid':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Pago
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 gap-1">
          <XCircle className="h-3 w-3" /> Rejeitado
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 gap-1">
          <AlertCircle className="h-3 w-3" /> Falhou
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function methodBadge(method: WithdrawalRequest['paymentMethod']) {
  if (method === 'pix') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 gap-1">
        <Smartphone className="h-3 w-3" /> PIX
      </Badge>
    )
  }
  return (
    <Badge className="bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 gap-1">
      <Banknote className="h-3 w-3" /> TED
    </Badge>
  )
}

// ---------- Component ----------

export function WithdrawalCard() {
  const { user } = useStore()

  const [form, setForm] = useState<WithdrawalFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailWithdrawal, setDetailWithdrawal] = useState<WithdrawalRequest | null>(null)

  const availableBalanceCents = user?.balanceWithdrawal || 0

  const refreshWithdrawals = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/asaas/withdrawals?userId=${encodeURIComponent(user.id)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao carregar histórico de saques')
      }
      setWithdrawals(Array.isArray(data?.withdrawals) ? data.withdrawals : [])
    } catch (err: any) {
      // Silent best-effort: show empty state but do not block the form
      console.error('Failed to load withdrawals', err)
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    refreshWithdrawals()
  }, [refreshWithdrawals])

  // Pre-fill PIX key from the user's profile for convenience
  useEffect(() => {
    if (user?.pixKey && !form.pixKey && form.paymentMethod === 'pix') {
      setForm((f) => ({ ...f, pixKey: user.pixKey as string }))
    }
  }, [user?.pixKey, form.pixKey, form.paymentMethod])

  // Pre-fill bank details from the user's profile
  useEffect(() => {
    if (form.paymentMethod === 'bank_transfer') {
      setForm((f) => ({
        ...f,
        bankCode: f.bankCode || (user?.bankCode as string) || '',
        bankAgency: f.bankAgency || (user?.bankAgency as string) || '',
        bankAccount: f.bankAccount || (user?.bankAccount as string) || '',
        bankType:
          (f.bankType as 'CHECKING' | 'SAVINGS') ||
          ((user?.bankType as 'CHECKING' | 'SAVINGS') || 'CHECKING'),
      }))
    }
  }, [form.paymentMethod, user?.bankCode, user?.bankAgency, user?.bankAccount, user?.bankType])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    const amountNum = Number(form.amount.replace(',', '.'))
    if (!form.amount || isNaN(amountNum) || amountNum <= 0) {
      errs.amount = 'Informe um valor válido.'
    } else if (amountNum < MIN_AMOUNT_BRL) {
      errs.amount = `Valor mínimo: ${formatBRL(MIN_AMOUNT_BRL)}.`
    } else {
      const amountCents = Math.round(amountNum * 100)
      if (amountCents > availableBalanceCents) {
        errs.amount = 'Saldo insuficiente para saque.'
      }
    }

    if (form.paymentMethod === 'pix') {
      if (!form.pixKey || form.pixKey.trim().length < 3) {
        errs.pixKey = 'Informe a chave PIX.'
      }
    } else {
      if (!form.bankCode || form.bankCode.trim().length < 2) {
        errs.bankCode = 'Informe o código do banco.'
      }
      if (!form.bankAgency || form.bankAgency.trim().length < 2) {
        errs.bankAgency = 'Informe a agência.'
      }
      if (!form.bankAccount || form.bankAccount.trim().length < 3) {
        errs.bankAccount = 'Informe o número da conta.'
      }
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    setError(null)
    if (!user?.id) {
      setError('Usuário não autenticado.')
      return
    }
    if (!validate()) return

    setSubmitting(true)
    try {
      const amountNum = Number(form.amount.replace(',', '.'))
      const amountCents = Math.round(amountNum * 100)
      const body: Record<string, unknown> = {
        userId: user.id,
        amountCents,
        paymentMethod: form.paymentMethod,
      }
      if (form.paymentMethod === 'pix') {
        body.pixKey = form.pixKey.trim()
      } else {
        body.bankCode = form.bankCode.trim()
        body.bankAgency = form.bankAgency.trim()
        body.bankAccount = form.bankAccount.trim()
        body.bankType = form.bankType
      }

      const res = await fetch('/api/asaas/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao criar solicitação de saque')
      }

      toast.success('Solicitação de saque criada! Aguarde aprovação do administrador.')
      setForm({
        ...initialForm,
        pixKey: user?.pixKey || '',
      })
      setFormErrors({})
      await refreshWithdrawals()
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar solicitação de saque')
      toast.error(err?.message || 'Erro ao criar solicitação de saque')
    } finally {
      setSubmitting(false)
    }
  }

  const amountNum = Number(form.amount.replace(',', '.')) || 0
  const amountCents = Math.round(amountNum * 100)

  function renderWithdrawalDetails(w: WithdrawalRequest): string {
    if (w.paymentMethod === 'pix') {
      return `PIX: ${w.pixKey || '—'}`
    }
    const bankTypeLabel =
      w.bankType === 'SAVINGS' ? 'Poupança' : w.bankType === 'CHECKING' ? 'Corrente' : w.bankType || ''
    return `Banco ${w.bankCode || '—'} · Ag ${w.bankAgency || '—'} · C/C ${w.bankAccount || '—'}${bankTypeLabel ? ` · ${bankTypeLabel}` : ''}`
  }

  return (
    <Card className="shadow-sm bg-card border-emerald-200/60 dark:border-emerald-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
          Solicitar Saque
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Saques processados via Asaas (PIX/TED)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available balance display */}
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            Saldo disponível para saque
          </p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
            {formatAmountCents(availableBalanceCents)}
          </p>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="wd-amount" className="text-xs flex items-center gap-1">
              <Banknote className="h-3 w-3" /> Valor (R$)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                R$
              </span>
              <Input
                id="wd-amount"
                type="number"
                inputMode="decimal"
                min={MIN_AMOUNT_BRL}
                step="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={`pl-10 ${formErrors.amount ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Valor mínimo: {formatBRL(MIN_AMOUNT_BRL)}
            </p>
            {formErrors.amount && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                {formErrors.amount}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <ArrowDownToLine className="h-3 w-3" /> Método de pagamento
            </Label>
            <Select
              value={form.paymentMethod}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  paymentMethod: v as 'pix' | 'bank_transfer',
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="bank_transfer">Transferência Bancária (TED)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PIX fields */}
          {form.paymentMethod === 'pix' && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wd-pix-key" className="text-xs flex items-center gap-1">
                <Smartphone className="h-3 w-3" /> Chave PIX
              </Label>
              <Input
                id="wd-pix-key"
                type="text"
                placeholder="chave@exemplo.com / +5511999999999 / CPF / aleatória"
                value={form.pixKey}
                onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))}
                className={formErrors.pixKey ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {formErrors.pixKey && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                  {formErrors.pixKey}
                </p>
              )}
            </div>
          )}

          {/* TED fields */}
          {form.paymentMethod === 'bank_transfer' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="wd-bank-code" className="text-xs">Código do Banco</Label>
                <Input
                  id="wd-bank-code"
                  type="text"
                  placeholder="001"
                  value={form.bankCode}
                  onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
                  className={formErrors.bankCode ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                {formErrors.bankCode && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {formErrors.bankCode}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-bank-agency" className="text-xs">Agência</Label>
                <Input
                  id="wd-bank-agency"
                  type="text"
                  placeholder="1234"
                  value={form.bankAgency}
                  onChange={(e) => setForm((f) => ({ ...f, bankAgency: e.target.value }))}
                  className={formErrors.bankAgency ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                {formErrors.bankAgency && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {formErrors.bankAgency}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-bank-account" className="text-xs">Conta</Label>
                <Input
                  id="wd-bank-account"
                  type="text"
                  placeholder="12345-6"
                  value={form.bankAccount}
                  onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
                  className={formErrors.bankAccount ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                {formErrors.bankAccount && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {formErrors.bankAccount}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tipo de Conta</Label>
                <Select
                  value={form.bankType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, bankType: v as 'CHECKING' | 'SAVINGS' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                    <SelectItem value="SAVINGS">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        {amountNum > 0 && (
          <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Valor solicitado</span>
              <span className="font-medium text-foreground">{formatAmountCents(amountCents)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Método</span>
              <span className="font-medium text-foreground">
                {form.paymentMethod === 'pix' ? 'PIX' : 'Transferência Bancária (TED)'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Saldo após saque</span>
              <span
                className={`font-medium ${
                  availableBalanceCents - amountCents >= 0
                    ? 'text-foreground'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatAmountCents(availableBalanceCents - amountCents)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
            <p className="text-xs text-red-700 dark:text-red-400 font-medium flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </p>
          </div>
        )}

        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <ArrowDownToLine className="h-4 w-4" />
              Confirmar Solicitação de Saque
            </>
          )}
        </Button>

        <Separator />

        {/* History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-600" />
              Histórico de Saques
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={refreshWithdrawals}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-3 w-3" />
              )}
              Atualizar
            </Button>
          </div>

          {loading && withdrawals.length === 0 ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-md bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <ArrowDownToLine className="h-7 w-7 mx-auto mb-1 opacity-40" />
              Nenhuma solicitação de saque encontrada.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-md border border-border divide-y divide-border">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {statusBadge(w.status)}
                      {methodBadge(w.paymentMethod)}
                      <span className="text-sm font-bold text-foreground">
                        {formatAmountCents(Number(w.amount) || 0)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {renderWithdrawalDetails(w)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Solicitado em {formatDateTimePtBR(w.createdAt)}
                      {w.paidAt ? ` · Pago em ${formatDate(w.paidAt)}` : ''}
                    </p>
                    {w.status === 'rejected' && w.rejectedReason && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                        Motivo da rejeição: {w.rejectedReason}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 shrink-0"
                    onClick={() => {
                      setDetailWithdrawal(w)
                      setDetailDialogOpen(true)
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    Detalhes
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Details dialog */}
      {detailDialogOpen && detailWithdrawal && (
        <DetailDialog
          withdrawal={detailWithdrawal}
          onClose={() => {
            setDetailDialogOpen(false)
            setDetailWithdrawal(null)
          }}
        />
      )}
    </Card>
  )
}

// ---------- Detail Dialog (inline) ----------

function DetailDialog({
  withdrawal,
  onClose,
}: {
  withdrawal: WithdrawalRequest
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-600" />
            Detalhes do Saque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Status">{statusBadge(withdrawal.status)}</Row>
          <Row label="Método">{methodBadge(withdrawal.paymentMethod)}</Row>
          <Row label="Valor">{formatAmountCents(Number(withdrawal.amount) || 0)}</Row>
          <Row label="Solicitado em">{formatDateTimePtBR(withdrawal.createdAt)}</Row>
          {withdrawal.processedAt && (
            <Row label="Processado em">{formatDateTimePtBR(withdrawal.processedAt)}</Row>
          )}
          {withdrawal.paidAt && <Row label="Pago em">{formatDate(withdrawal.paidAt)}</Row>}
          {withdrawal.paymentMethod === 'pix' ? (
            <Row label="Chave PIX">{withdrawal.pixKey || '—'}</Row>
          ) : (
            <>
              <Row label="Banco">{withdrawal.bankCode || '—'}</Row>
              <Row label="Agência">{withdrawal.bankAgency || '—'}</Row>
              <Row label="Conta">{withdrawal.bankAccount || '—'}</Row>
              <Row label="Tipo de Conta">
                {withdrawal.bankType === 'SAVINGS'
                  ? 'Conta Poupança'
                  : withdrawal.bankType === 'CHECKING'
                  ? 'Conta Corrente'
                  : withdrawal.bankType || '—'}
              </Row>
            </>
          )}
          {withdrawal.asaasTransferId && (
            <Row label="ID transferência Asaas">
              <span className="font-mono text-[11px] break-all">{withdrawal.asaasTransferId}</span>
            </Row>
          )}
          {withdrawal.asaasStatus && (
            <Row label="Status Asaas">{withdrawal.asaasStatus}</Row>
          )}
          {withdrawal.rejectedReason && (
            <Row label="Motivo da rejeição">
              <span className="text-red-600 dark:text-red-400">{withdrawal.rejectedReason}</span>
            </Row>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium text-right">{children}</span>
    </div>
  )
}
