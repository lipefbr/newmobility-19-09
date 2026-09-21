'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Smartphone,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Star,
  Gift,
  ArrowRight,
  Wifi,
  Loader2,
  ExternalLink,
  User,
  MapPin,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { EmptyState } from '../ui/empty-states'

interface TalkMobiPlanDTO {
  id: string
  name: string
  dataAmount: string
  priceCents: number
  cashbackCents: number
  rewardPoints: number
  description: string | null
  features: string[]
  isPopular: boolean
  isRecommended: boolean
  sortOrder: number
  priceFormatted: string
  cashbackFormatted: string
}

interface ApiResponse {
  plans: TalkMobiPlanDTO[]
}

/**
 * Subscription request for a TalkMobi mobile plan. Created when the user
 * clicks "Assinar" on a plan card; the admin reviews it in the panel and
 * approves (attaching an activation link / ICCID) or rejects with a reason.
 */
interface TalkMobiSubscriptionDTO {
  id: string
  userId: string
  planId: string
  planName: string
  dataAmount: string
  priceCents: number
  cashbackCents: number
  rewardPoints: number
  fullName: string
  cpf: string
  birthDate: string | null
  phone: string
  email: string
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  adminNotes: string | null
  activationLink: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface TalkMobiSubscriptionResponse {
  request: TalkMobiSubscriptionDTO | null
  requests: TalkMobiSubscriptionDTO[]
}

/**
 * Hardcoded fallback catalogue shown if the API returns no plans (e.g.
 * the DB is unreachable, the table is empty, or the auto-seed in
 * /api/talkmobi/plans failed). Mirrors the four canonical plans in
 * src/lib/seed-talkmobi.ts so the user always sees something useful,
 * even on a totally broken backend. The `id` field uses the same slug
 * so React reconciliation stays stable when the API recovers.
 */
const FALLBACK_PLANS: TalkMobiPlanDTO[] = [
  {
    id: 'talkmobi-10gb',
    name: 'Plano 10 GB',
    dataAmount: '10 GB',
    priceCents: 2990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: null,
    features: [
      '10 GB de internet',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
    ],
    isPopular: false,
    isRecommended: false,
    sortOrder: 1,
    priceFormatted: 'R$ 29,90',
    cashbackFormatted: 'R$ 0,00',
  },
  {
    id: 'talkmobi-20gb',
    name: 'Plano 20 GB',
    dataAmount: '20 GB',
    priceCents: 3990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: null,
    features: [
      '20 GB de internet',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
      'Roaming nacional',
    ],
    isPopular: true,
    isRecommended: false,
    sortOrder: 2,
    priceFormatted: 'R$ 39,90',
    cashbackFormatted: 'R$ 0,00',
  },
  {
    id: 'talkmobi-50gb',
    name: 'Plano 50 GB',
    dataAmount: '50 GB',
    priceCents: 5990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: null,
    features: [
      '50 GB de internet',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
      'Roaming nacional',
      '5G prioritário',
    ],
    isPopular: false,
    isRecommended: true,
    sortOrder: 3,
    priceFormatted: 'R$ 59,90',
    cashbackFormatted: 'R$ 0,00',
  },
  {
    id: 'talkmobi-ilimitado',
    name: 'Plano Ilimitado',
    dataAmount: 'Ilimitado',
    priceCents: 9990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: null,
    features: [
      'Internet ilimitada',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
      'Roaming nacional/internacional',
      '5G prioritário',
      'Telemedicina inclusa',
    ],
    isPopular: false,
    isRecommended: false,
    sortOrder: 4,
    priceFormatted: 'R$ 99,90',
    cashbackFormatted: 'R$ 0,00',
  },
]

/**
 * TalkMobiPage — user-facing TalkMobi mobile plan catalogue + subscription
 * flow. Previously this page ALSO contained the Telemedicina activation
 * UI (mixed in the same view); that was extracted into its own module at
 * src/components/newmobility/telemedicina/telemedicina-page.tsx so each
 * service has its own sidebar entry and independent state/data (Task ID 2
 * — separate Telemedicina x TalkMobi).
 *
 * What lives here:
 *   - TalkMobi plans catalogue (loaded from /api/talkmobi/plans, with a
 *     hardcoded FALLBACK_PLANS list if the API is unreachable).
 *   - Subscription status banner (pending / approved / rejected) for the
 *     user's most recent TalkMobi subscription request.
 *   - Subscription form dialog (holder info + shipping address for the
 *     SIM chip) — POST /api/talkmobi/subscribe.
 */
export function TalkMobiPage() {
  const { user } = useStore()
  const [plans, setPlans] = useState<TalkMobiPlanDTO[]>([])
  const [loading, setLoading] = useState(true)

  // ===== TalkMobi subscription state =====
  // The user's most recent subscription request across all plans, plus the
  // full list (so we can show "you already have a pending request for X"
  // if they try to subscribe to a second plan while one is in flight).
  const [subRequest, setSubRequest] = useState<TalkMobiSubscriptionDTO | null>(null)
  const [subRequests, setSubRequests] = useState<TalkMobiSubscriptionDTO[]>([])
  const [subLoading, setSubLoading] = useState(true)
  const [subSubmitting, setSubSubmitting] = useState(false)
  // Subscribe dialog open/close + the plan the user is currently subscribing to
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [subscribePlan, setSubscribePlan] = useState<TalkMobiPlanDTO | null>(null)

  // TalkMobi subscription form state — holder + shipping address for the SIM chip
  const [subForm, setSubForm] = useState({
    fullName: '',
    cpf: '',
    birthDate: '',
    phone: '',
    email: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    notes: '',
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await apiFetch<ApiResponse>('/talkmobi/plans')
        if (cancelled || !data) return
        const apiPlans = Array.isArray(data.plans) ? data.plans : []
        if (apiPlans.length > 0) {
          setPlans(apiPlans)
        } else {
          // API responded but the table is empty / seed failed — fall
          // back to the hardcoded catalogue so the page is never blank.
          console.warn('TalkMobi API returned no plans — using hardcoded fallback.')
          setPlans(FALLBACK_PLANS)
        }
      } catch (err) {
        // Network / 500 error — also fall back to the hardcoded list so
        // the user still sees the four plans even if the backend is down.
        console.error('TalkMobi plans load failed — using hardcoded fallback:', err)
        setPlans(FALLBACK_PLANS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ===== Fetch the user's TalkMobi subscription request(s) =====
  // We pull the most recent one (for the status banner) plus all of them
  // (so we can detect an existing pending request for the same plan).
  useEffect(() => {
    let cancelled = false
    const loadSub = async () => {
      if (!user?.id) {
        setSubLoading(false)
        return
      }
      try {
        const data = await apiFetch<TalkMobiSubscriptionResponse>(`/talkmobi/subscribe?userId=${user.id}`)
        if (cancelled || !data) return
        setSubRequest(data.request ?? null)
        setSubRequests(data.requests ?? [])
      } catch (err) {
        console.error('TalkMobi subscription load failed:', err)
      } finally {
        if (!cancelled) setSubLoading(false)
      }
    }
    loadSub()
    return () => { cancelled = true }
  }, [user?.id])

  /**
   * Open the subscription dialog for a plan. Pre-fills the form with the
   * user's store data (name/phone/email/cpf) and, if they already have a
   * pending request for this same plan, restores their previously typed
   * values so they can edit and resubmit without retyping.
   */
  const handleSubscribe = (plan: TalkMobiPlanDTO) => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para assinar um plano.')
      return
    }
    // Block free-plan users right away with a helpful message — the backend
    // enforces this too, but doing it here avoids a frustrating round-trip.
    if (user.plan === 'free' && user.role !== 'admin') {
      toast.error('Você precisa assinar um plano da NewMobility antes de contratar o TalkMobi. Acesse "Meu Plano".')
      return
    }
    setSubscribePlan(plan)
    // Look for an existing PENDING request for the SAME plan to pre-fill
    const existing = subRequests.find(
      (r) => r.planId === plan.id && r.status === 'pending',
    )
    if (existing) {
      setSubForm({
        fullName: existing.fullName || '',
        cpf: existing.cpf || '',
        birthDate: existing.birthDate || '',
        phone: existing.phone || '',
        email: existing.email || '',
        zipCode: existing.zipCode || '',
        street: existing.street || '',
        number: existing.number || '',
        complement: existing.complement || '',
        district: existing.district || '',
        city: existing.city || '',
        state: existing.state || '',
        notes: existing.notes || '',
      })
    } else {
      // Pre-fill with the user's store data for convenience
      setSubForm({
        fullName: user.name || '',
        cpf: user.cpf || '',
        birthDate: '',
        phone: user.phone || '',
        email: user.email || '',
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        district: '',
        // city/state are not on the UserData interface — leave blank, the
        // user can type them once and the value is persisted in the request.
        city: '',
        state: '',
        notes: '',
      })
    }
    setSubscribeOpen(true)
  }

  /**
   * Submit the subscription request to /api/talkmobi/subscribe. The admin
   * will review it in the panel; we show a success toast and update the
   * local state so the status banner appears immediately.
   */
  const handleSubmitSubscribe = async () => {
    if (!user?.id || !subscribePlan) {
      toast.error('Usuário não autenticado ou plano inválido.')
      return
    }
    if (!subForm.fullName || !subForm.cpf || !subForm.phone || !subForm.email) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setSubSubmitting(true)
    try {
      const res = await apiFetch<{ request: TalkMobiSubscriptionDTO; message?: string }>('/talkmobi/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          planId: subscribePlan.id,
          fullName: subForm.fullName,
          cpf: subForm.cpf,
          birthDate: subForm.birthDate || undefined,
          phone: subForm.phone,
          email: subForm.email,
          zipCode: subForm.zipCode || undefined,
          street: subForm.street || undefined,
          number: subForm.number || undefined,
          complement: subForm.complement || undefined,
          district: subForm.district || undefined,
          city: subForm.city || undefined,
          state: subForm.state || undefined,
          notes: subForm.notes || undefined,
        }),
      })
      setSubRequest(res.request)
      // Refresh the full list so the "already pending" detection stays accurate
      try {
        const fresh = await apiFetch<TalkMobiSubscriptionResponse>(`/talkmobi/subscribe?userId=${user.id}`)
        if (fresh) {
          setSubRequest(fresh.request ?? null)
          setSubRequests(fresh.requests ?? [])
        }
      } catch {
        // non-fatal — the POST response already updated the primary request
      }
      setSubscribeOpen(false)
      toast.success(res.message || 'Pedido de assinatura enviado com sucesso!')
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao enviar pedido. Tente novamente.')
    } finally {
      setSubSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
          TalkMobi
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Planos de celular 4G/5G para você e sua família
        </p>
      </div>

      {/* ===== TalkMobi Plans Section ===== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Wifi className="h-4 w-4" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-foreground">
            Planos TalkMobi
          </h3>
          {subRequest && (
            <Badge
              variant="outline"
              className={
                subRequest.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[11px]'
                  : subRequest.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-[11px]'
                    : subRequest.status === 'rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 text-[11px]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800 text-[11px]'
              }
            >
              {subRequest.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {subRequest.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
              {subRequest.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
              {subRequest.status === 'approved'
                ? `${subRequest.planName} ativo`
                : subRequest.status === 'pending'
                  ? `${subRequest.planName} em análise`
                  : subRequest.status === 'rejected'
                    ? `${subRequest.planName} recusado`
                    : 'Cancelado'}
            </Badge>
          )}
        </div>

        {/* ===== SUBSCRIPTION STATUS BANNER =====
            Mirrors the Telemedicina status cards: pending → "in review",
            approved → activation link, rejected → reason + resubmit. */}
        {subRequest?.status === 'approved' && (
          <Card className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <h4 className="text-base md:text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    {subRequest.planName} ativado! 🎉
                  </h4>
                  <p className="text-xs md:text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    Seu plano TalkMobi <strong>{subRequest.dataAmount}</strong> foi aprovado.
                    {subRequest.activationLink
                      ? ' Use o link de ativação abaixo para começar a usar agora mesmo.'
                      : ' Abra o app TalkMobi ou aguarde o contato da equipe para finalizar a ativação.'}
                  </p>
                  {subRequest.activationLink && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-white/5 border border-emerald-200 dark:border-emerald-800">
                      <ExternalLink className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <a
                        href={subRequest.activationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs md:text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate flex-1 min-w-0"
                      >
                        {subRequest.activationLink}
                      </a>
                    </div>
                  )}
                  {subRequest.adminNotes && (
                    <p className="text-[11px] md:text-xs text-emerald-700/80 dark:text-emerald-400/80 italic mt-1">
                      Obs. do administrador: {subRequest.adminNotes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {subRequest?.status === 'pending' && (
          <Card className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
            <div className="h-1 bg-gradient-to-r from-amber-400 to-yellow-400" />
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="p-3 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
                  <Clock className="h-6 w-6 md:h-7 md:w-7 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <h4 className="text-base md:text-lg font-bold text-amber-800 dark:text-amber-300">
                    Pedido do {subRequest.planName} em análise
                  </h4>
                  <p className="text-xs md:text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                    Recebemos seu pedido de assinatura para o plano <strong>{subRequest.planName}</strong> ({subRequest.dataAmount}).
                    Nossa equipe está analisando e em breve você receberá o link de ativação aqui mesmo e nas notificações.
                  </p>
                </div>
                {/* Re-open the form pre-filled so the user can correct typos while waiting */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const plan = plans.find((p) => p.id === subRequest.planId)
                    if (plan) handleSubscribe(plan)
                  }}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40 w-full md:w-auto shrink-0"
                >
                  Editar Pedido
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {subRequest?.status === 'rejected' && (
          <Card className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 border-rose-200 dark:border-rose-800">
            <div className="h-1 bg-gradient-to-r from-rose-400 to-red-400" />
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="p-3 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shrink-0">
                  <XCircle className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <h4 className="text-base md:text-lg font-bold text-rose-800 dark:text-rose-300">
                    Pedido do {subRequest.planName} não aprovado
                  </h4>
                  <p className="text-xs md:text-sm text-rose-700 dark:text-rose-400 leading-relaxed">
                    {subRequest.adminNotes
                      ? `Motivo: ${subRequest.adminNotes}`
                      : 'Seu pedido de assinatura TalkMobi não foi aprovado. Entre em contato com o suporte se tiver dúvidas, ou ajuste as informações e solicite novamente.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const plan = plans.find((p) => p.id === subRequest.planId)
                    if (plan) handleSubscribe(plan)
                  }}
                  className="border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40 w-full md:w-auto shrink-0"
                >
                  Solicitar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="rounded-2xl shadow-sm">
                <CardContent className="p-4 md:p-6 space-y-3 animate-pulse">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-10 w-full bg-muted rounded" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-3/4 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <Card className="rounded-2xl shadow-sm bg-card">
            <CardContent className="p-6 md:p-10">
              <EmptyState
                icon={Smartphone}
                title="Nenhum plano TalkMobi disponível"
                description="Os planos de celular serão exibidos aqui assim que o time comercial publicá-los. Volte em breve!"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.3 }}
              >
                <Card
                  className={`rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full ${
                    plan.isPopular
                      ? 'ring-2 ring-emerald-500/40 dark:ring-emerald-500/30'
                      : ''
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                      <Star className="h-3 w-3 fill-white" />
                      POPULAR
                    </div>
                  )}
                  {plan.isRecommended && !plan.isPopular && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      RECOMENDADO
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg font-bold text-foreground">
                      {plan.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.dataAmount} de internet
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col gap-3">
                    {/* Price */}
                    <div>
                      <span className="text-2xl md:text-3xl font-bold text-foreground">
                        {plan.priceFormatted}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/mês</span>
                    </div>

                    {/* Cashback + Reward Points */}
                    <div className="flex flex-wrap gap-2">
                      {plan.cashbackCents > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[11px]"
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          {plan.cashbackFormatted} de cashback
                        </Badge>
                      )}
                      {plan.rewardPoints > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-[11px]"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          +{plan.rewardPoints} pontos
                        </Badge>
                      )}
                    </div>

                    {/* Features */}
                    {plan.features.length > 0 && (
                      <ul className="space-y-1.5 mt-1">
                        {plan.features.slice(0, 6).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs md:text-sm text-foreground/80">
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Subscribe button pinned to bottom */}
                    <div className="mt-auto pt-3">
                      <Button
                        type="button"
                        onClick={() => handleSubscribe(plan)}
                        className={`w-full gap-1.5 ${
                          plan.isPopular
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : ''
                        }`}
                      >
                        Assinar
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* While we're still loading the user's existing subscription
            request from the API, we have no banner to show — but the
            plans grid is already visible (separate fetch). This subtle
            placeholder keeps the section from collapsing while /subscribe
            resolves. */}
        {subLoading && subRequest === null && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/40">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-3/4 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ===== TalkMobi Subscription Form Dialog =====
          User fills in holder info + shipping address for the SIM chip.
          On submit, POST /api/talkmobi/subscribe creates/updates the
          subscription request. Admin reviews in the panel → approve (sends
          activationLink / ICCID) / reject. */}
      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent className="rounded-2xl shadow-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base md:text-lg">
                  {subRequest?.status === 'pending' && subscribePlan?.id === subRequest.planId
                    ? `Editar Pedido — ${subscribePlan?.name ?? ''}`
                    : `Assinar ${subscribePlan?.name ?? 'Plano TalkMobi'}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-foreground/70">
                  {subscribePlan
                    ? `${subscribePlan.dataAmount} · ${subscribePlan.priceFormatted}/mês. Preencha seus dados para que nossa equipe processe a ativação.`
                    : 'Preencha seus dados para que nossa equipe processe a ativação.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Holder info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-emerald-600" />
                Dados do Titular
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-fullName" className="text-xs">Nome completo *</Label>
                  <Input
                    id="sub-fullName"
                    value={subForm.fullName}
                    onChange={(e) => setSubForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-cpf" className="text-xs">CPF *</Label>
                  <Input
                    id="sub-cpf"
                    value={subForm.cpf}
                    onChange={(e) => setSubForm((f) => ({ ...f, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-birthDate" className="text-xs">Data de nascimento</Label>
                  <Input
                    id="sub-birthDate"
                    type="date"
                    value={subForm.birthDate}
                    onChange={(e) => setSubForm((f) => ({ ...f, birthDate: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-phone" className="text-xs">Telefone / WhatsApp *</Label>
                  <Input
                    id="sub-phone"
                    value={subForm.phone}
                    onChange={(e) => setSubForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-email" className="text-xs">E-mail *</Label>
                <Input
                  id="sub-email"
                  type="email"
                  value={subForm.email}
                  onChange={(e) => setSubForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="voce@email.com"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Shipping address for the SIM chip (optional) */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Endereço de Entrega do Chip
                <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="sub-zipCode" className="text-xs">CEP</Label>
                  <Input
                    id="sub-zipCode"
                    value={subForm.zipCode}
                    onChange={(e) => setSubForm((f) => ({ ...f, zipCode: e.target.value }))}
                    placeholder="00000-000"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="sub-street" className="text-xs">Rua / Avenida</Label>
                  <Input
                    id="sub-street"
                    value={subForm.street}
                    onChange={(e) => setSubForm((f) => ({ ...f, street: e.target.value }))}
                    placeholder="Rua Exemplo"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-number" className="text-xs">Número</Label>
                  <Input
                    id="sub-number"
                    value={subForm.number}
                    onChange={(e) => setSubForm((f) => ({ ...f, number: e.target.value }))}
                    placeholder="123"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="sub-complement" className="text-xs">Complemento</Label>
                  <Input
                    id="sub-complement"
                    value={subForm.complement}
                    onChange={(e) => setSubForm((f) => ({ ...f, complement: e.target.value }))}
                    placeholder="Apto 4"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="sub-district" className="text-xs">Bairro</Label>
                  <Input
                    id="sub-district"
                    value={subForm.district}
                    onChange={(e) => setSubForm((f) => ({ ...f, district: e.target.value }))}
                    placeholder="Centro"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="sub-city" className="text-xs">Cidade</Label>
                  <Input
                    id="sub-city"
                    value={subForm.city}
                    onChange={(e) => setSubForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="São Paulo"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-state" className="text-xs">UF</Label>
                  <Input
                    id="sub-state"
                    value={subForm.state}
                    onChange={(e) => setSubForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="SP"
                    maxLength={2}
                    className="text-sm uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <Label htmlFor="sub-notes" className="text-xs">Observações (opcional)</Label>
              <Textarea
                id="sub-notes"
                value={subForm.notes}
                onChange={(e) => setSubForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Ex: prefiro receber o chip à tarde / quero manter meu número atual..."
                className="text-sm min-h-[70px] resize-y"
              />
            </div>

            {/* Price summary */}
            {subscribePlan && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{subscribePlan.name} · {subscribePlan.dataAmount}</p>
                    <p className="text-[10px] text-muted-foreground">Pagamento processado pela equipe após ativação</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0">{subscribePlan.priceFormatted}<span className="text-[10px] text-muted-foreground font-normal">/mês</span></p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSubscribeOpen(false)} className="w-full sm:w-auto" disabled={subSubmitting}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto gap-2"
              onClick={handleSubmitSubscribe}
              disabled={subSubmitting}
            >
              {subSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {subRequest?.status === 'pending' && subscribePlan?.id === subRequest.planId
                    ? 'Atualizar Pedido'
                    : 'Enviar Pedido'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
