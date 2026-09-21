'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Gift, Check, Clock, Car, ShoppingBag, Heart, Shield, Phone, Stethoscope,
  Fuel, UtensilsCrossed, Wrench, Home, Bike, Banknote, Loader2,
  Plane, Calendar, Trophy, Award, Star, Target, ShieldAlert
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { gratificationsApi, apiFetch } from '@/lib/api'
import {
  isDriverQualification,
  isDeliveryQualification,
  isConductorQualification,
  resolveUserQualification,
} from '@/lib/qualifications'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Types
interface GratificationItem {
  id: string
  name: string
  amount: number
  type: string
  category?: string
  isClaimed: boolean
  claimedAt?: string
  description?: string
}

interface GratificationCategory {
  name: string
  icon: any
  color: string
  items: GratificationItem[]
}

// Fallback static data (used when API returns no gratifications).
// Per client spec (Índice.docx §5):
//   - Auxílio Combustível: R$ 2.600/mês (R$100/dia × 26 dias) — Ao fechar 5º nível
//   - Reembolso Vale Ducha: R$ 780/mês (R$30/dia × 26 dias) — Ao fechar 5º nível
//   - Férias 6 Meses: R$ 5.000 + 10 dias — 6 meses de cadastro ativo
//   - Férias 12 Meses: R$ 20.000 + 20 dias — 12 meses de cadastro ativo
//   - Meta Diária Motorista: 18 corridas/dia — Motorista/Entregador ativo
//   - Meta Mensal Motorista: 384 corridas/mês — Motorista/Entregador ativo
//   - Prêmio CashBack Gratificação: R$ 15.000 — Fechar equipe com 1.364 usuários
// "Pagamento de Faturas" is the ONLY recurring gratification. Others are one-time.
const fallbackCategories: GratificationCategory[] = [
  {
    name: 'Mobilidade — Metas Motorista',
    icon: Car,
    color: 'bg-blue-100 text-blue-600',
    items: [
      {
        id: 'meta_diaria_motorista',
        name: 'Meta Diária Motorista',
        amount: 0,
        type: 'driver_daily_goal',
        category: 'mobility',
        isClaimed: false,
        description: '18 corridas/dia — Motorista/Entregador ativo. Ao bater a meta no dia, o sistema envia notificação push avisando que aquele dia teve a meta batida.',
      },
      {
        id: 'meta_mensal_motorista',
        name: 'Meta Mensal Motorista',
        amount: 0,
        type: 'driver_monthly_goal',
        category: 'mobility',
        isClaimed: false,
        description: '384 corridas/mês (18 corridas × ~21 dias úteis). Bonificação extra mensal ao bater a meta — Motorista/Entregador ativo.',
      },
    ],
  },
  {
    name: 'Auxílios Mensais',
    icon: Fuel,
    color: 'bg-amber-100 text-amber-600',
    items: [
      {
        id: 'auxilio_combustivel',
        name: 'Auxílio Combustível',
        amount: 260000, // R$ 2.600 (R$100/dia × 26 dias)
        type: 'fuel_aid',
        category: 'mobility',
        isClaimed: false,
        description: 'R$ 2.600/mês (R$100/dia × 26 dias). Pago no fim do mês após pagamento da fatura. Qualificação: ao fechar o 5º nível.',
      },
      {
        id: 'reembolso_vale_ducha',
        name: 'Reembolso Vale Ducha (Lava-Carro)',
        amount: 78000, // R$ 780 (R$30/dia × 26 dias)
        type: 'car_wash',
        category: 'mobility',
        isClaimed: false,
        description: 'R$ 780/mês (R$30/dia × 26 dias). Pago diário ou no fim do mês após fatura. Qualificação: ao fechar o 5º nível.',
      },
    ],
  },
  {
    name: 'Férias',
    icon: Plane,
    color: 'bg-teal-100 text-teal-600',
    items: [
      {
        id: 'ferias_6_meses',
        name: 'Férias 6 Meses',
        amount: 500000, // R$ 5.000 + 10 dias de férias
        type: 'vacation_6mo',
        category: 'vacation',
        isClaimed: false,
        description: 'R$ 5.000 + 10 dias de férias. Único aos 6 meses de cadastro ativo.',
      },
      {
        id: 'ferias_12_meses',
        name: 'Férias 12 Meses',
        amount: 2000000, // R$ 20.000 + 20 dias de férias
        type: 'vacation_12mo',
        category: 'vacation',
        isClaimed: false,
        description: 'R$ 20.000 + 20 dias de férias. Único aos 12 meses de cadastro ativo.',
      },
    ],
  },
  {
    name: 'Prêmios Especiais',
    icon: Trophy,
    color: 'bg-rose-100 text-rose-600',
    items: [
      {
        id: 'premio_cashback_gratificacao',
        name: 'Prêmio CashBack Gratificação',
        amount: 1500000, // R$ 15.000
        type: 'cashback_bonus_prize',
        category: 'prize',
        isClaimed: false,
        description: 'R$ 15.000 — Único ao fechar equipe com 1.364 usuários.',
      },
    ],
  },
  {
    name: 'Compras',
    icon: ShoppingBag,
    color: 'bg-purple-100 text-purple-600',
    items: [
      { id: '3', name: 'CashBack Shopping', amount: 150000, type: 'shopping', isClaimed: true, claimedAt: '2025-01-08' },
    ],
  },
  {
    name: 'Liderança',
    icon: Heart,
    color: 'bg-rose-100 text-rose-600',
    items: [
      { id: '4', name: 'Gratificação Liderança', amount: 300000, type: 'leadership', isClaimed: false },
      { id: '5', name: 'Ativação Residual', amount: 100000, type: 'residual_activation', isClaimed: false },
    ],
  },
  {
    name: 'Seguros',
    icon: Shield,
    color: 'bg-amber-100 text-amber-600',
    items: [
      { id: '6', name: 'Seguro Auto', amount: 180000, type: 'insurance_car', isClaimed: true, claimedAt: '2024-12-20' },
      { id: '7', name: 'Seguro de Vida', amount: 250000, type: 'insurance_life', isClaimed: false },
      { id: '8', name: 'Seguro Celular', amount: 30000, type: 'insurance_phone', isClaimed: false },
    ],
  },
  {
    name: 'Saúde',
    icon: Stethoscope,
    color: 'bg-emerald-100 text-emerald-600',
    items: [
      { id: '9', name: 'Telemedicina', amount: 40000, type: 'telemedicine', isClaimed: true, claimedAt: '2025-01-05' },
      { id: '10', name: 'Plano Odontológico', amount: 60000, type: 'dental', isClaimed: false },
    ],
  },
  {
    name: 'Benefícios',
    icon: Gift,
    color: 'bg-teal-100 text-teal-600',
    items: [
      { id: '11', name: 'Kit Mimo', amount: 25000, type: 'mimo_kit', isClaimed: false },
      { id: '12', name: 'Vale Refeição', amount: 45000, type: 'food_ticket', isClaimed: false },
      { id: '13', name: 'Vale Alimentação', amount: 45000, type: 'food_voucher', isClaimed: false },
      { id: '14', name: 'Guincho', amount: 35000, type: 'tow_truck', isClaimed: false },
      { id: '15', name: 'Assistência Residencial', amount: 45000, type: 'home_assistance', isClaimed: false },
      { id: '16', name: 'Fundo Aposentadoria', amount: 500000, type: 'retirement_fund', isClaimed: false },
      { id: '17', name: 'Escolha da Moto', amount: 800000, type: 'motorcycle_choice', isClaimed: false },
    ],
  },
  {
    name: 'Prêmios Físicos',
    icon: Award,
    color: 'bg-yellow-100 text-yellow-700',
    items: [
      { id: '18', name: 'Prêmio Carro', amount: 0, type: 'prize_car', isClaimed: false, description: 'Prêmio físico desbloqueado a cada nível de pontuação. Sistema libera botão "Reivindicar".' },
      { id: '19', name: 'Prêmio Moto', amount: 0, type: 'prize_motorcycle', isClaimed: false, description: 'Prêmio físico desbloqueado a cada nível de pontuação. Sistema libera botão "Reivindicar".' },
      { id: '20', name: 'Prêmio Casa', amount: 0, type: 'prize_house', isClaimed: false, description: 'Prêmio físico desbloqueado a cada nível de pontuação. Sistema libera botão "Reivindicar".' },
      { id: '21', name: 'Prêmio Móveis', amount: 0, type: 'prize_furniture', isClaimed: false, description: 'Prêmio físico desbloqueado a cada nível de pontuação. Sistema libera botão "Reivindicar".' },
    ],
  },
]

// Map API category to UI category
function mapApiCategoryToUi(category?: string): { name: string; icon: any; color: string } {
  const mapping: Record<string, { name: string; icon: any; color: string }> = {
    mobility: { name: 'Mobilidade', icon: Car, color: 'bg-blue-100 text-blue-600' },
    shopping: { name: 'Compras', icon: ShoppingBag, color: 'bg-purple-100 text-purple-600' },
    leadership: { name: 'Liderança', icon: Heart, color: 'bg-rose-100 text-rose-600' },
    insurance: { name: 'Seguros', icon: Shield, color: 'bg-amber-100 text-amber-600' },
    health: { name: 'Saúde', icon: Stethoscope, color: 'bg-emerald-100 text-emerald-600' },
    benefits: { name: 'Benefícios', icon: Gift, color: 'bg-teal-100 text-teal-600' },
    vacation: { name: 'Férias', icon: Plane, color: 'bg-teal-100 text-teal-600' },
    prize: { name: 'Prêmios Especiais', icon: Trophy, color: 'bg-rose-100 text-rose-600' },
    fuel: { name: 'Auxílios Mensais', icon: Fuel, color: 'bg-amber-100 text-amber-600' },
    car_wash: { name: 'Auxílios Mensais', icon: Fuel, color: 'bg-amber-100 text-amber-600' },
  }
  return mapping[category || 'benefits'] || mapping.benefits
}

// Group API gratifications into categories
function groupByCategories(items: GratificationItem[]): GratificationCategory[] {
  const groups: Record<string, GratificationCategory> = {}

  for (const item of items) {
    const cat = mapApiCategoryToUi(item.category)
    if (!groups[cat.name]) {
      groups[cat.name] = { ...cat, items: [] }
    }
    groups[cat.name].items.push(item)
  }

  return Object.values(groups)
}

export function GratificationsPage() {
  const { user, updateUser } = useStore()
  const [categories, setCategories] = useState<GratificationCategory[]>(fallbackCategories)
  const [isLoading, setIsLoading] = useState(true)
  const [isUsingFallback, setIsUsingFallback] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const [selectedGratification, setSelectedGratification] = useState<GratificationItem | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [driverGoals, setDriverGoals] = useState<{
    dailyGoal: number
    monthlyGoal: number
    dailyRides: number
    monthlyRides: number
    dailyGoalReached: boolean
    monthlyGoalReached: boolean
  } | null>(null)

  // Task 2-c / Item 7 — admin-configured Metas module visibility.
  // Loaded from the public /api/gratifications-config endpoint. While null
  // (loading or fetch error) we keep `accessAllowed = true` so the page
  // renders normally for motorista/entregador users on first run.
  //
  // Two layers are supported:
  //   1. `allowedQualifications` (preferred, Task 2-c / Item 7.3) — JSON array
  //      stored on SystemConfig under `metas.allowedQualifications`.
  //      Example: ["motorista","entregador"]. When present and non-empty,
  //      this is authoritative.
  //   2. `targetQualification` (legacy) — single value stored on a
  //      Gratification row with type='driver_goals_config'. Used only as a
  //      fallback when allowedQualifications is missing.
  const [metasConfig, setMetasConfig] = useState<{
    targetQualification?: 'motorista' | 'entregador' | 'ambos'
    allowedQualifications?: string[]
    benefitTargets?: Record<string, 'motorista' | 'entregador' | 'ambos'>
  } | null>(null)
  const [accessChecking, setAccessChecking] = useState(true)

  // Resolve the per-benefit target for a given benefit `type`. Falls back to
  // the overall `targetQualification` when no per-benefit override exists.
  const resolveBenefitTarget = useCallback(
    (benefitType: string): 'motorista' | 'entregador' | 'ambos' => {
      const overall = metasConfig?.targetQualification || 'ambos'
      const perBenefit = metasConfig?.benefitTargets?.[benefitType]
      return perBenefit || overall
    },
    [metasConfig]
  )

  // Whether a given benefit should be visible to the current user, based on
  // its per-benefit target qualification.
  const benefitVisibleToUser = useCallback(
    (benefitType: string): boolean => {
      const u = user as any
      // Resolve the qualification code from any of the possible fields
      // (qualification / userType / legacy isDriver/isDelivery flags) and
      // check if the user is a "driver" or "delivery" conductor.
      const qual = resolveUserQualification({
        qualification: u?.qualification,
        userType: u?.userType,
        isDriver: u?.isDriver,
        isDelivery: u?.isDelivery,
      })
      const isMotorista = isDriverQualification(qual) || u?.isDriver === true
      const isEntregador = isDeliveryQualification(qual) || u?.isDelivery === true

      const allowed = metasConfig?.allowedQualifications
      if (Array.isArray(allowed) && allowed.length > 0) {
        const moduleAllowed = allowed.some((code) => {
          const c = String(code || '').toLowerCase()
          if (c === 'motorista') return isMotorista
          if (c === 'entregador') return isEntregador
          return false
        })
        if (!moduleAllowed) return false
      }

      const target = resolveBenefitTarget(benefitType)
      if (target === 'motorista') return isMotorista
      if (target === 'entregador') return isEntregador
      return isMotorista || isEntregador
    },
    [user, resolveBenefitTarget, metasConfig]
  )

  // Load the public Metas config (no admin role required). Done in parallel
  // with the gratifications fetch so the page renders fast.
  useEffect(() => {
    let cancelled = false
    async function loadConfig() {
      try {
        const data = await apiFetch<{
          targetQualification?: 'motorista' | 'entregador' | 'ambos'
          allowedQualifications?: string[]
          benefitTargets?: Record<string, 'motorista' | 'entregador' | 'ambos'>
        }>('/gratifications-config')
        if (!cancelled && data && (data.allowedQualifications || data.targetQualification)) {
          setMetasConfig(data)
        }
      } catch {
        // Silent fail — keep null so the page falls back to default behaviour.
      } finally {
        if (!cancelled) setAccessChecking(false)
      }
    }
    loadConfig()
    return () => { cancelled = true }
  }, [])

  // ===== Admin-configured goal configs (per user type) =====
  interface AdminGoalConfig {
    id: string
    name: string
    description: string | null
    targetQualification: string
    metricCode: string
    metricLabel: string
    targetValue: number
    currentValue: number
    rewardCents: number
    rewardWallet: string
    frequency: string
    progressPct: number
    isAchieved: boolean
    isClaimed: boolean
  }
  const [adminGoals, setAdminGoals] = useState<AdminGoalConfig[]>([])
  const [adminGoalsLoading, setAdminGoalsLoading] = useState(false)
  const [claimingGoalId, setClaimingGoalId] = useState<string | null>(null)

  // Fetch gratifications from API
  const fetchGratifications = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const data = await gratificationsApi.getList(user.id)

      // Capture driver goal-tracking info (per client spec §6)
      if (data?.driverGoals) {
        setDriverGoals(data.driverGoals)
      }

      // Map the per-user DB rows (available + claimed) into the UI shape.
      const apiGratifications: GratificationItem[] = [
        ...(data.available || []).map((g: any) => ({
          id: g.id,
          // Prefer a friendly name (from description or type-to-name mapping)
          // over the raw type slug for catalog display.
          name: g.name || g.description?.split('—')[0]?.trim() || g.type || 'Gratificação',
          amount: g.amount || 0,
          type: g.type || '',
          category: g.category || 'benefits',
          isClaimed: false,
          description: g.description,
        })),
        ...(data.claimed || []).map((g: any) => ({
          id: g.id,
          name: g.name || g.description?.split('—')[0]?.trim() || g.type || 'Gratificação',
          amount: g.amount || 0,
          type: g.type || '',
          category: g.category || 'benefits',
          isClaimed: true,
          claimedAt: g.claimedAt,
          description: g.description,
        })),
      ]

      // Also include catalog items (always-available gratifications per
      // client spec §5: fuel voucher, car wash, vacations, driver goals,
      // cashback prize) — only those not already present as per-user DB rows
      // (matched by `type`) so we don't double-list.
      //
      // Task 2-c / Item 7 — catalog items are also filtered by the per-benefit
      // `targetQualification` set by the admin. A benefit whose target is
      // 'motorista' is hidden from entregadores and vice-versa; 'ambos' is
      // visible to both. Per-user DB rows (already-claimed gratifications)
      // are NOT filtered — once a user has been credited, they should always
      // see the row, even if the admin later tightens the per-benefit target.
      const existingTypes = new Set(apiGratifications.map((g) => g.type))
      const catalogItems: GratificationItem[] = (data.catalog || [])
        .filter((c: any) => !existingTypes.has(c.type))
        .filter((c: any) => benefitVisibleToUser(c.type))
        .map((c: any, idx: number) => ({
          id: `catalog_${c.type}_${idx}`,
          name: c.name || c.type || 'Gratificação',
          amount: c.amount || 0,
          type: c.type || '',
          category: c.category || 'benefits',
          isClaimed: false,
          description: c.description,
        }))

      const merged = [...apiGratifications, ...catalogItems]

      if (merged.length > 0) {
        const grouped = groupByCategories(merged)
        setCategories(grouped)
        setIsUsingFallback(false)
      } else {
        // API returned empty - use fallback. Apply the same per-benefit filter
        // so a non-motorista/entregador user doesn't see driver-only benefits.
        const filteredFallback = fallbackCategories
          .map((cat) => ({
            ...cat,
            items: cat.items.filter((item) => benefitVisibleToUser(item.type)),
          }))
          .filter((cat) => cat.items.length > 0)
        setCategories(filteredFallback.length > 0 ? filteredFallback : fallbackCategories)
        setIsUsingFallback(true)
      }
    } catch (err) {
      console.error('[Gratifications] Error fetching gratifications:', err)
      // On error, use fallback data — also filtered by per-benefit config.
      const filteredFallback = fallbackCategories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((item) => benefitVisibleToUser(item.type)),
        }))
        .filter((cat) => cat.items.length > 0)
      setCategories(filteredFallback.length > 0 ? filteredFallback : fallbackCategories)
      setIsUsingFallback(true)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, benefitVisibleToUser])

  useEffect(() => {
    fetchGratifications()
  }, [fetchGratifications])

  // Fetch admin-configured goals for this user's qualification
  const fetchAdminGoals = useCallback(async () => {
    if (!user?.id) return
    setAdminGoalsLoading(true)
    try {
      const res = await fetch(`/api/goal-configs?userId=${user.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data?.goals && Array.isArray(data.goals)) {
        setAdminGoals(data.goals)
      }
    } catch {
      // Silently ignore — admin goals are optional
    } finally {
      setAdminGoalsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAdminGoals()
  }, [fetchAdminGoals])

  // Claim an admin-configured goal reward
  const handleClaimAdminGoal = async (goalId: string) => {
    if (!user?.id) return
    setClaimingGoalId(goalId)
    try {
      const res = await fetch('/api/goal-configs/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, goalConfigId: goalId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao reivindicar meta')
        return
      }
      toast.success(data?.message || 'Recompensa creditada com sucesso!')
      // Refresh goals to update isClaimed state
      await fetchAdminGoals()
      // Also refresh user balance in store
      if (data?.rewardWallet && data?.rewardCents) {
        const balanceField = `balance${data.rewardWallet.charAt(0).toUpperCase()}${data.rewardWallet.slice(1)}`
        updateUser({ [balanceField]: (user as any)[balanceField] + data.rewardCents } as any)
      }
    } catch {
      toast.error('Erro ao reivindicar meta')
    } finally {
      setClaimingGoalId(null)
    }
  }

  // Open claim dialog
  const handleClaimClick = (item: GratificationItem) => {
    setSelectedGratification(item)
    setClaimDialogOpen(true)
  }

  // Claim gratification
  const handleClaim = async (claimType: 'balance' | 'prize') => {
    if (!selectedGratification || !user?.id) return

    setIsClaiming(true)
    setClaimingId(selectedGratification.id)

    try {
      const result = await gratificationsApi.claim(user.id, selectedGratification.id, claimType)

      // Update local state - mark as claimed
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === selectedGratification.id
              ? { ...item, isClaimed: true, claimedAt: new Date().toISOString() }
              : item
          ),
        }))
      )

      // Update user balance in store if claimed as balance
      if (claimType === 'balance' && result.balanceField && result.newBalance !== undefined) {
        updateUser({ [result.balanceField]: result.newBalance } as any)
      }

      // Show success toast
      if (claimType === 'balance') {
        toast.success('Gratificação adicionada ao saldo!', {
          description: `${selectedGratification.name}: ${formatCurrency(selectedGratification.amount)} creditados.`,
        })
      } else {
        toast.success('Solicitação de prêmio enviada!', {
          description: `Acompanhe o status pelo suporte. Ticket #${result.ticketId || ''}`,
        })
      }

      setClaimDialogOpen(false)
      setSelectedGratification(null)
    } catch (err: any) {
      console.error('[Gratifications] Error claiming gratification:', err)
      toast.error('Erro ao reivindicar gratificação', {
        description: err?.message || 'Tente novamente mais tarde.',
      })
    } finally {
      setIsClaiming(false)
      setClaimingId(null)
    }
  }

  // Compute summary stats
  const allItems = categories.flatMap((c) => c.items)
  const claimedCount = allItems.filter((i) => i.isClaimed).length
  const totalAvailable = allItems.filter((i) => !i.isClaimed).reduce((acc, i) => acc + i.amount, 0)

  // BACK-7 + Item 9 — the "Metas Motorista / Entregador" card is gated to
  // users who are actually motorista/entregador (or the new conductor
  // categories: mototaxista, motofretista, motorista_app, taxista,
  // caminhoneiro). The check covers every signal the platform records:
  //   - user.qualification (set during onboarding/register)
  //   - user.userType (UserType.code assigned by the admin)
  //   - user.isDriver / user.isDelivery (boolean flags toggled by the admin
  //     or by the DriverApplication approval flow)
  // Any non-conductor profile (cliente, lojista, outros, etc.) gets the
  // card hidden — they should not see driver-only goal tracking.
  const u = user as any
  const userQual = resolveUserQualification({
    qualification: u?.qualification,
    userType: u?.userType,
    isDriver: u?.isDriver,
    isDelivery: u?.isDelivery,
  })
  const showDriverGoals =
    isConductorQualification(userQual) ||
    u?.isDriver === true ||
    u?.isDelivery === true

  // Task 2-c / Item 7 — overall Metas module access control.
  // The admin sets EITHER:
  //   - `allowedQualifications` (preferred, Item 7.3): JSON array stored on
  //     SystemConfig under `metas.allowedQualifications`, e.g.
  //     ["motorista","entregador"]. When present and non-empty, this is the
  //     authoritative gate.
  //   - `targetQualification` (legacy): single value stored on a Gratification
  //     row with type='driver_goals_config' ('motorista' | 'entregador' |
  //     'ambos'). Used only as a fallback.
  // The sidebar already uses the same config to hide the menu item; here we
  // ALSO check on the page itself so that a non-authorized user who navigates
  // directly to the URL sees an access-denied card instead of the full
  // gratifications content. Admins always pass. While the config is loading
  // we render normally (fail-open) so motorista/entregador users aren't
  // blocked on slow networks.
  const moduleAccessAllowed = (() => {
    if (u?.role === 'admin') return true
    if (accessChecking || !metasConfig) return true
    // `benefitVisibleToUser` resolves the per-benefit target; for the special
    // '__module__' key it falls back to the overall targetQualification.
    // It also consults `allowedQualifications` as a hard module-level gate.
    return benefitVisibleToUser('__module__')
  })()

  if (!moduleAccessAllowed) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Metas</h2>
          <p className="text-sm text-gray-500">Acompanhe suas metas, benefícios e gratificações disponíveis</p>
        </div>
        <Card className="shadow-sm border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-amber-800 dark:text-amber-300">
              Acesso restrito
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md">
              O módulo <strong>Metas</strong> está disponível apenas para usuários
              com qualificação de <strong>Motorista</strong> ou <strong>Entregador</strong>.
              Se você é motorista ou entregador e ainda não vê o conteúdo,
              contate o suporte para atualizar seu tipo de usuário.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Metas</h2>
        <p className="text-sm text-gray-500">Acompanhe suas metas, benefícios e gratificações disponíveis</p>
      </div>

      {/* Driver Goals Card (per client spec §6 — motorista/entregador) */}
      {showDriverGoals && driverGoals && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 animate-gradient-shift" />
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shrink-0">
                  <Target className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">
                    Metas Motorista / Entregador
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                    Ao bater a meta diária, o sistema envia uma notificação push avisando que aquele dia teve a meta batida.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white/60 dark:bg-blue-950/40 rounded-md p-3 border border-blue-100 dark:border-blue-900/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta Diária</p>
                        {driverGoals.dailyGoalReached && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Batida hoje</Badge>
                        )}
                      </div>
                      <p className="text-base font-bold text-blue-700 dark:text-blue-300">
                        {driverGoals.dailyRides}/{driverGoals.dailyGoal} <span className="text-xs font-normal text-muted-foreground">corridas</span>
                      </p>
                      <div className="mt-2 h-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.min((driverGoals.dailyRides / driverGoals.dailyGoal) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-blue-950/40 rounded-md p-3 border border-blue-100 dark:border-blue-900/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta Mensal</p>
                        {driverGoals.monthlyGoalReached && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Batida</Badge>
                        )}
                      </div>
                      <p className="text-base font-bold text-blue-700 dark:text-blue-300">
                        {driverGoals.monthlyRides}/{driverGoals.monthlyGoal} <span className="text-xs font-normal text-muted-foreground">corridas</span>
                      </p>
                      <div className="mt-2 h-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.min((driverGoals.monthlyRides / driverGoals.monthlyGoal) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== Admin-configured Goals (per user type) ===== */}
      {showDriverGoals && (adminGoalsLoading || adminGoals.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400" />
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                    Suas Metas Configuradas
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Bata as metas abaixo para ganhar recompensas automáticas. O progresso é calculado em tempo real.
                  </p>
                </div>
              </div>

              {adminGoalsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-xs text-muted-foreground">Carregando metas...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {adminGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className={`bg-white/70 dark:bg-emerald-950/40 rounded-lg p-3 border ${
                        goal.isAchieved
                          ? 'border-emerald-300 dark:border-emerald-700'
                          : 'border-emerald-100 dark:border-emerald-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-foreground">{goal.name}</p>
                            <Badge className={
                              goal.targetQualification === 'motorista'
                                ? 'bg-blue-100 text-blue-700 text-[9px]'
                                : goal.targetQualification === 'entregador'
                                  ? 'bg-amber-100 text-amber-700 text-[9px]'
                                  : 'bg-emerald-100 text-emerald-700 text-[9px]'
                            }>
                              {goal.targetQualification === 'motorista' ? 'Motorista' :
                               goal.targetQualification === 'entregador' ? 'Entregador' :
                               goal.targetQualification === 'ambos' ? 'Ambos' : goal.targetQualification}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] capitalize">
                              {goal.frequency === 'daily' ? 'Diária' :
                               goal.frequency === 'weekly' ? 'Semanal' :
                               goal.frequency === 'monthly' ? 'Mensal' :
                               goal.frequency === 'one_time' ? 'Única' : goal.frequency}
                            </Badge>
                          </div>
                          {goal.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground uppercase">Recompensa</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(goal.rewardCents)}
                          </p>
                          <p className="text-[9px] text-muted-foreground capitalize">{goal.rewardWallet}</p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Progresso: {goal.currentValue}/{goal.targetValue} {goal.metricLabel}
                          </span>
                          <span className={`text-[10px] font-bold ${
                            goal.isAchieved ? 'text-emerald-600' : 'text-muted-foreground'
                          }`}>
                            {goal.progressPct}%
                          </span>
                        </div>
                        <div className="h-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              goal.isAchieved
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : 'bg-gradient-to-r from-emerald-400 to-teal-400'
                            }`}
                            style={{ width: `${goal.progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Claim button */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {goal.isAchieved ? (
                          goal.isClaimed ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-1">
                              <Check className="h-3 w-3" /> Recompensa resgatada
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8"
                              onClick={() => handleClaimAdminGoal(goal.id)}
                              disabled={claimingGoalId === goal.id}
                            >
                              {claimingGoalId === goal.id ? (
                                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Award className="h-3.5 w-3.5" />
                              )}
                              Resgatar Recompensa
                            </Button>
                          )
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            Faltam <span className="font-bold text-foreground">{Math.max(0, goal.targetValue - goal.currentValue)}</span> {goal.metricLabel}
                          </p>
                        )}
                        {goal.isAchieved && !goal.isClaimed && (
                          <Badge className="bg-amber-100 text-amber-700 text-[9px] animate-pulse">
                            Meta atingida!
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">DISPONÍVEIS</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAvailable)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">REIVINDICADAS</p>
                <p className="text-lg font-bold text-gray-900">{claimedCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">PENDENTES</p>
                <p className="text-lg font-bold text-gray-900">{allItems.length - claimedCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Carregando gratificações...</span>
        </div>
      )}

      {/* Fallback Notice */}
      {!isLoading && isUsingFallback && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="shadow-sm border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Gratificações de demonstração</p>
                <p className="text-xs text-amber-600">As gratificações serão carregadas da sua conta quando disponíveis.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Gratification Categories */}
      {!isLoading && categories.map((category, ci) => (
        <motion.div
          key={category.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ci * 0.08 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${category.color}`}>
                  <category.icon className="h-4 w-4" />
                </div>
                {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {category.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.isClaimed ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        {item.isClaimed && item.claimedAt && (
                          <p className="text-xs text-gray-500">Reivindicado em {formatDate(item.claimedAt)}</p>
                        )}
                        {!item.isClaimed && item.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {item.amount > 0 ? (
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(item.amount)}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide text-blue-600 font-semibold">
                          Meta
                        </span>
                      )}
                      {item.isClaimed ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Reivindicado</Badge>
                      ) : item.amount > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleClaimClick(item)}
                          disabled={claimingId === item.id}
                        >
                          {claimingId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Reivindicar'
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Claim Type Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reivindicar Gratificação</DialogTitle>
            <DialogDescription>
              Como você deseja receber{' '}
              <span className="font-semibold text-emerald-700">
                {selectedGratification ? formatCurrency(selectedGratification.amount) : ''}
              </span>
              {selectedGratification ? ` — ${selectedGratification.name}` : ''}?
            </DialogDescription>
            {/* Tarefa 3 — mostrar descrição no popup (estava faltando) */}
            {selectedGratification?.description && (
              <p className="text-xs text-muted-foreground mt-2 leading-snug">
                {selectedGratification.description}
              </p>
            )}
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto py-4 px-4 flex items-center gap-4 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 transition-all"
              onClick={() => handleClaim('balance')}
              disabled={isClaiming}
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-gray-900">Adicionar ao Saldo</p>
                <p className="text-xs text-gray-500">O valor será creditado na sua carteira</p>
              </div>
              {isClaiming && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 px-4 flex items-center gap-4 border-amber-200 hover:bg-amber-50 hover:border-amber-400 transition-all"
              onClick={() => handleClaim('prize')}
              disabled={isClaiming}
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Gift className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-gray-900">Solicitar Prêmio</p>
                <p className="text-xs text-gray-500">Solicite o prêmio físico/digital da plataforma</p>
              </div>
              {isClaiming && <Loader2 className="h-4 w-4 animate-spin text-amber-600" />}
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setClaimDialogOpen(false)
                setSelectedGratification(null)
              }}
              disabled={isClaiming}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
