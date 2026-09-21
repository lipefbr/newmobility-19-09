'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Copy,
  Check,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  Webhook,
  Terminal,
  ExternalLink,
  KeyRound,
  Lock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { formatCurrency, cn } from '@/lib/utils'

// ---------------- Types ----------------

type Environment = 'sandbox' | 'production'

interface AsaasBalance {
  balance: number
  blockedBalance?: number
  pendingBalance?: number
  transferableBalance?: number
  upcomingBalance?: number
  netValue?: number
}

interface AsaasConfigStatus {
  configured: boolean
  environment: Environment | null
  apiKeyMasked: string
  webhookSecretConfigured: boolean
  webhookUrl: string
  balance: AsaasBalance | null
  balanceError: string | null
}

interface SaveResponse extends AsaasConfigStatus {
  message?: string
}

// ---------------- Component ----------------

export function AsaasConfigPanel() {
  const user = useStore((s) => s.user)
  const adminUserId = user?.id

  // Live config status (read from API on mount + after every save)
  const [status, setStatus] = useState<AsaasConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshingBalance, setRefreshingBalance] = useState(false)

  // Form state
  const [form, setForm] = useState<{
    apiKey: string
    environment: Environment
    webhookSecret: string
  }>({
    apiKey: '',
    environment: 'sandbox',
    webhookSecret: '',
  })
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  // ---------------- Fetch config ----------------

  const fetchConfig = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!adminUserId) return
      if (!opts?.silent) setLoading(true)
      try {
        const res = await fetch(
          `/api/asaas/config?userId=${encodeURIComponent(adminUserId)}`,
          { cache: 'no-store' }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        const data = (await res.json()) as AsaasConfigStatus
        setStatus(data)
        // Pre-fill the environment selector from the current config
        if (data.environment) {
          setForm((f) => ({ ...f, environment: data.environment! }))
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Erro ao carregar configuração'
        if (!opts?.silent) {
          toast.error(msg)
        }
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [adminUserId]
  )

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  // ---------------- Save handler ----------------

  const handleSave = async () => {
    if (!adminUserId) {
      toast.error('Usuário não autenticado')
      return
    }
    if (!form.apiKey.trim()) {
      toast.error('Informe a Chave de API')
      return
    }
    if (form.apiKey.trim().length < 8) {
      toast.error('Chave de API muito curta')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/asaas/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminUserId,
          apiKey: form.apiKey.trim(),
          environment: form.environment,
          webhookSecret: form.webhookSecret.trim(),
        }),
      })
      const data = (await res.json()) as SaveResponse & { error?: string }
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      toast.success(data.message || 'Configuração salva com sucesso!')
      // Clear the inputs (don't keep the raw key in component state)
      setForm((f) => ({ ...f, apiKey: '', webhookSecret: '' }))
      // Refresh status with the new masked key + balance
      await fetchConfig({ silent: true })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao salvar configuração'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleRefreshBalance = async () => {
    setRefreshingBalance(true)
    try {
      await fetchConfig({ silent: true })
      toast.success('Saldo atualizado')
    } finally {
      setRefreshingBalance(false)
    }
  }

  const handleCopyWebhook = async () => {
    if (!status?.webhookUrl) return
    // Build an absolute URL so the admin can copy-paste directly into Asaas dashboard
    const absolute =
      typeof window !== 'undefined'
        ? `${window.location.origin}${status.webhookUrl}`
        : status.webhookUrl
    try {
      await navigator.clipboard.writeText(absolute)
      setCopiedWebhook(true)
      toast.success('URL do webhook copiada!')
      setTimeout(() => setCopiedWebhook(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = absolute
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopiedWebhook(true)
        toast.success('URL do webhook copiada!')
        setTimeout(() => setCopiedWebhook(false), 2000)
      } catch {
        toast.error('Não foi possível copiar automaticamente')
      }
      document.body.removeChild(ta)
    }
  }

  // ---------------- Derived ----------------

  const placeholderKey =
    form.environment === 'production' ? '$aap_...' : '$aac_...'
  const webhookAbsoluteUrl =
    typeof window !== 'undefined' && status?.webhookUrl
      ? `${window.location.origin}${status.webhookUrl}`
      : status?.webhookUrl || '/api/asaas/webhook'

  // ---------------- Loading skeleton ----------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------------- Render ----------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Configuração Asaas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Integração com gateway de pagamentos (PIX, Boleto, Saques)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshBalance}
          disabled={refreshingBalance || !status?.configured}
          className="gap-1.5"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', refreshingBalance && 'animate-spin')}
          />
          Atualizar Saldo
        </Button>
      </motion.div>

      {/* ============ Card 1 — Status da Integração ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Status da Integração
          </CardTitle>
          <CardDescription>
            Resumo do estado atual da conexão com o Asaas
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Configured badge */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex-shrink-0">
              {status?.configured ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Status
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {status?.configured ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800 gap-1">
                    <XCircle className="h-3 w-3" />
                    Não Configurado
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Environment badge */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex-shrink-0">
              <Webhook className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Ambiente
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {status?.environment === 'production' ? (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Produção
                  </Badge>
                ) : status?.environment === 'sandbox' ? (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1">
                    <Terminal className="h-3 w-3" />
                    Sandbox
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* API Key masked */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border md:col-span-2">
            <div className="flex-shrink-0">
              <KeyRound className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Chave de API
              </p>
              <p className="text-sm font-mono mt-0.5 truncate text-foreground">
                {status?.configured
                  ? status.apiKeyMasked || '—'
                  : 'Nenhuma chave configurada'}
              </p>
            </div>
            {status?.webhookSecretConfigured && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" />
                Webhook protegido
              </Badge>
            )}
          </div>

          {/* Webhook URL (copyable) */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border md:col-span-2">
            <div className="flex-shrink-0">
              <Webhook className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                URL do Webhook
              </p>
              <p className="text-sm font-mono mt-0.5 truncate text-foreground">
                {webhookAbsoluteUrl}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyWebhook}
              className="gap-1.5 shrink-0"
            >
              {copiedWebhook ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          {/* Balance */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 md:col-span-2">
            <div className="flex-shrink-0">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Saldo Disponível
              </p>
              {status?.balanceError ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {status.balanceError}
                  </span>
                </p>
              ) : status?.balance ? (
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {formatCurrency(
                    Math.round((status.balance.balance || 0) * 100)
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">—</p>
              )}
              {status?.balance && !status.balanceError && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
                  {typeof status.balance.blockedBalance === 'number' && (
                    <span>
                      Bloqueado:{' '}
                      <strong className="text-foreground">
                        {formatCurrency(
                          Math.round((status.balance.blockedBalance || 0) * 100)
                        )}
                      </strong>
                    </span>
                  )}
                  {typeof status.balance.pendingBalance === 'number' && (
                    <span>
                      Pendente:{' '}
                      <strong className="text-foreground">
                        {formatCurrency(
                          Math.round((status.balance.pendingBalance || 0) * 100)
                        )}
                      </strong>
                    </span>
                  )}
                  {typeof status.balance.transferableBalance === 'number' && (
                    <span>
                      Transferível:{' '}
                      <strong className="text-foreground">
                        {formatCurrency(
                          Math.round(
                            (status.balance.transferableBalance || 0) * 100
                          )
                        )}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ Card 2 — Credenciais ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-600" />
            Credenciais
          </CardTitle>
          <CardDescription>
            Configure a chave de API e o ambiente do Asaas. As alterações entram
            em vigor imediatamente após salvar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment */}
          <div className="space-y-2">
            <Label htmlFor="asaas-env" className="text-sm font-medium">
              Ambiente
            </Label>
            <Select
              value={form.environment}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, environment: v as Environment }))
              }
            >
              <SelectTrigger id="asaas-env" className="w-full">
                <SelectValue placeholder="Selecione o ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">Sandbox</span>
                      <span className="text-[11px] text-muted-foreground">
                        Testes — sem cobrança real
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="production">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">Produção</span>
                      <span className="text-[11px] text-muted-foreground">
                        Transações reais
                      </span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Use <strong>Sandbox</strong> para testes (chaves iniciadas com{' '}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                $aac_
              </code>
              ) e <strong>Produção</strong> para cobranças reais (chaves com{' '}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                $aap_
              </code>
              ).
            </p>
          </div>

          <Separator />

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="asaas-key" className="text-sm font-medium">
              Chave de API
            </Label>
            <div className="relative">
              <Input
                id="asaas-key"
                type={showApiKey ? 'text' : 'password'}
                placeholder={placeholderKey}
                value={form.apiKey}
                onChange={(e) =>
                  setForm((f) => ({ ...f, apiKey: e.target.value }))
                }
                autoComplete="off"
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {status?.configured && (
              <p className="text-[11px] text-muted-foreground">
                Chave atual:{' '}
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">
                  {status.apiKeyMasked}
                </code>
                . Deixe o campo acima vazio para manter a chave atual ao salvar
                outras configurações — mas recomendamos informar a chave
                novamente para confirmação.
              </p>
            )}
          </div>

          <Separator />

          {/* Webhook Secret */}
          <div className="space-y-2">
            <Label
              htmlFor="asaas-webhook-secret"
              className="text-sm font-medium"
            >
              Secret do Webhook{' '}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <div className="relative">
              <Input
                id="asaas-webhook-secret"
                type={showSecret ? 'text' : 'password'}
                placeholder="Token de acesso do webhook"
                value={form.webhookSecret}
                onChange={(e) =>
                  setForm((f) => ({ ...f, webhookSecret: e.target.value }))
                }
                autoComplete="off"
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showSecret ? 'Ocultar secret' : 'Mostrar secret'}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Token enviado no header{' '}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                asaas-access-token
              </code>{' '}
              para validar o webhook. Recomendado para segurança em produção.
              {status?.webhookSecretConfigured && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] gap-1 align-middle"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Já configurado
                </Badge>
              )}
            </p>
          </div>

          <Separator />

          {/* Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-muted-foreground">
              As credenciais são armazenadas criptograficamente seguras na
              tabela de configurações do sistema.
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || !form.apiKey.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ============ Card 3 — Como configurar no Asaas ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-emerald-600" />
            Como configurar no Asaas
          </CardTitle>
          <CardDescription>
            Passo a passo para obter as credenciais e configurar o webhook no
            painel do Asaas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 max-h-96 overflow-y-auto admin-content-scrollbar pr-2">
            {[
              {
                title: 'Crie sua conta no Asaas',
                body: (
                  <>
                    Acesse{' '}
                    <a
                      href="https://www.asaas.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                    >
                      https://www.asaas.com
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    e cadastre-se. A aprovação da conta pode levar alguns
                    minutos.
                  </>
                ),
              },
              {
                title: 'Obtenha sua chave de API',
                body: (
                  <>
                    No painel do Asaas, acesse{' '}
                    <strong>Configurações → API</strong> e copie sua chave. Use
                    a chave de <strong>Sandbox</strong> (
                    <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">
                      $aac_...
                    </code>
                    ) para testes, ou a chave de <strong>Produção</strong> (
                    <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">
                      $aap_...
                    </code>
                    ) para cobranças reais.
                  </>
                ),
              },
              {
                title: 'Cadastre a chave aqui',
                body: (
                  <>
                    Cole a chave no campo <strong>Chave de API</strong> acima e
                    selecione o ambiente correspondente (
                    <strong>Sandbox</strong> ou <strong>Produção</strong>).
                    Clique em <strong>Salvar Configuração</strong>.
                  </>
                ),
              },
              {
                title: 'Configure o webhook',
                body: (
                  <>
                    No painel do Asaas, vá em{' '}
                    <strong>Configurações → Webhooks</strong> e adicione a URL:
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-md bg-muted border border-border">
                      <code className="text-[11px] font-mono text-foreground break-all flex-1">
                        {webhookAbsoluteUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={handleCopyWebhook}
                        aria-label="Copiar URL"
                      >
                        {copiedWebhook ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </>
                ),
              },
              {
                title: 'Defina um token de acesso (opcional, recomendado)',
                body: (
                  <>
                    No mesmo formulário de webhook no Asaas, configure um token
                    de acesso (qualquer string aleatória segura). Cole esse
                    token no campo <strong>Secret do Webhook</strong> acima e
                    salve. Isso valida que cada POST recebido vem realmente do
                    Asaas.
                  </>
                ),
              },
              {
                title: 'Selecione os eventos do webhook',
                body: (
                  <>
                    Marque os seguintes eventos no painel do Asaas:
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                      <li>Pagamento recebido</li>
                      <li>Pagamento confirmado</li>
                      <li>Pagamento vencido</li>
                      <li>Pagamento reembolsado</li>
                      <li>Transferência realizada</li>
                    </ul>
                  </>
                ),
              },
            ].map((step, idx) => (
              <li
                key={idx}
                className="flex gap-3 items-start p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                  <div className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    {step.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ============ Card 4 — Como testar o webhook ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-600" />
            Como testar o Webhook
          </CardTitle>
          <CardDescription>
            Envie um evento simulado para o endpoint do webhook para validar a
            configuração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-blue-800 dark:text-blue-300">
              Não há eventos recentes para exibir ainda. Use o comando{' '}
              <code className="text-[11px] bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded font-mono">
                curl
              </code>{' '}
              abaixo para simular um webhook do Asaas e verificar se o endpoint
              está respondendo corretamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Teste com curl (sem token — apenas sandbox/dev)
            </Label>
            <pre className="max-h-72 overflow-y-auto admin-content-scrollbar p-3 rounded-lg bg-gray-900 dark:bg-gray-950 border border-gray-800 text-gray-100 text-[11px] font-mono leading-relaxed">
{`curl -X POST ${webhookAbsoluteUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "evt_123456789",
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_abc123",
      "status": "RECEIVED",
      "value": 149.90,
      "billingType": "PIX"
    }
  }'`}
            </pre>
            <p className="text-[11px] text-muted-foreground">
              Resposta esperada:{' '}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                {`{ "received": true, "event": "PAYMENT_RECEIVED" }`}
              </code>
              . Verifique também o log do servidor para a mensagem{' '}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                [asaas/webhook] event received
              </code>
              .
            </p>
          </div>

          {status?.webhookSecretConfigured && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Teste com curl (incluindo o token do webhook)
              </Label>
              <pre className="max-h-72 overflow-y-auto admin-content-scrollbar p-3 rounded-lg bg-gray-900 dark:bg-gray-950 border border-gray-800 text-gray-100 text-[11px] font-mono leading-relaxed">
{`curl -X POST ${webhookAbsoluteUrl} \\
  -H "Content-Type: application/json" \\
  -H "asaas-access-token: SEU_TOKEN_AQUI" \\
  -d '{
    "id": "evt_123456789",
    "event": "PAYMENT_RECEIVED",
    "payment": { "id": "pay_abc123", "status": "RECEIVED" }
  }'`}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Sem o header{' '}
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                  asaas-access-token
                </code>{' '}
                correto, o webhook registra o evento como rejeitado
                (
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                  {`{ "received": false, "reason": "invalid token" }`}
                </code>
                ).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
