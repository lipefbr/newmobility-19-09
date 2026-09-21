'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { discountClubApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Star,
  ExternalLink,
  Phone,
  Sparkles,
  Store,
  Percent,
  Gift,
  SearchX,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// ---- Types ----

interface Partner {
  id: string
  name: string
  logoUrl?: string | null
  category: string
  discountText?: string | null
  cashbackPercent: number
  description?: string | null
  websiteUrl?: string | null
  phone?: string | null
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  createdAt: string
}

// ---- Category styling ----

const CATEGORY_META: Record<
  string,
  { label: string; gradient: string; badge: string; ring: string }
> = {
  pet: {
    label: 'Pet',
    gradient: 'from-pink-500 to-rose-500',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
    ring: 'ring-pink-200 dark:ring-pink-900/50',
  },
  food: {
    label: 'Alimentação',
    gradient: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-900/50',
  },
  health: {
    label: 'Saúde',
    gradient: 'from-red-500 to-rose-600',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    ring: 'ring-red-200 dark:ring-red-900/50',
  },
  auto: {
    label: 'Automotivo',
    gradient: 'from-sky-500 to-blue-600',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    ring: 'ring-sky-200 dark:ring-sky-900/50',
  },
  beauty: {
    label: 'Beleza',
    gradient: 'from-purple-500 to-violet-600',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    ring: 'ring-purple-200 dark:ring-purple-900/50',
  },
  services: {
    label: 'Serviços',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-900/50',
  },
}

function metaFor(category: string) {
  return (
    CATEGORY_META[category?.toLowerCase()] ?? {
      label: category || 'Outros',
      gradient: 'from-slate-500 to-gray-600',
      badge:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      ring: 'ring-slate-200 dark:ring-slate-700',
    }
  )
}

// ---- Component ----

export function ClubeDescontosPage() {
  const user = useStore((s) => s.user)

  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string>('all')

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const loadPartners = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await discountClubApi.getPartners({
        search: debouncedSearch || undefined,
        category,
        userId: user?.id,
      })
      setPartners(Array.isArray(res?.partners) ? res.partners : [])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Falha ao carregar parceiros.'
      setError(msg)
      setPartners([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, user?.id])

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  // Categories derived dynamically from loaded partners (for the Select options)
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    partners.forEach((p) => p.category && set.add(p.category.toLowerCase()))
    return Array.from(set)
  }, [partners])

  const stats = useMemo(() => {
    const total = partners.length
    const featured = partners.filter((p) => p.isFeatured).length
    const cashbackOps = partners.filter((p) => (p.cashbackPercent ?? 0) > 0).length
    return { total, featured, cashbackOps }
  }, [partners])

  const handleVerOferta = (p: Partner) => {
    if (p.websiteUrl) {
      window.open(p.websiteUrl, '_blank', 'noopener,noreferrer')
    } else {
      toast.error('Sem site cadastrado para este parceiro.')
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 p-6 text-white shadow-xl sm:p-10"
        aria-label="Clube de Descontos Power Cash"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4">
          <Badge className="w-fit gap-1.5 bg-white/20 text-white hover:bg-white/30">
            <Sparkles className="h-3.5 w-3.5" /> Power Cash
          </Badge>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Clube de Descontos Power Cash
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
              Descontos exclusivos e cashback em parceiros selecionados. Compre
              mais, pague menos e ainda receba parte do valor de volta.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-2 grid grid-cols-3 gap-3">
            <HeroStat
              icon={<Store className="h-4 w-4" />}
              value={stats.total}
              label="Parceiros"
            />
            <HeroStat
              icon={<Percent className="h-4 w-4" />}
              value={stats.cashbackOps}
              label="Opções CashBack"
            />
            <HeroStat
              icon={<Star className="h-4 w-4" />}
              value={stats.featured}
              label="Destaques"
            />
          </div>
        </div>
      </motion.section>

      {/* Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar parceiros por nome..."
                className="h-11 pl-9"
                aria-label="Buscar parceiros"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 w-full" aria-label="Filtrar por categoria">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {metaFor(c).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <PartnerGridSkeleton />
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar"
          description={error}
          icon={<SearchX className="h-8 w-8" />}
        />
      ) : partners.length === 0 ? (
        <EmptyState
          title="Nenhum parceiro encontrado"
          description="Tente ajustar a busca ou os filtros para encontrar ofertas."
          icon={<SearchX className="h-8 w-8" />}
        />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {partners.map((p, idx) => (
            <PartnerCard
              key={p.id}
              partner={p}
              index={idx}
              onVerOferta={handleVerOferta}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ---- Sub-components ----

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-tight">{value}</div>
        <div className="truncate text-[11px] uppercase tracking-wide text-white/80">
          {label}
        </div>
      </div>
    </div>
  )
}

function PartnerCard({
  partner,
  index,
  onVerOferta,
}: {
  partner: Partner
  index: number
  onVerOferta: (p: Partner) => void
}) {
  const meta = metaFor(partner.category)
  const initial = partner.name?.charAt(0)?.toUpperCase() || '?'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <Card
        className={cn(
          'group relative h-full overflow-hidden border-border/60 transition-shadow hover:shadow-lg',
          partner.isFeatured && 'ring-2 ring-amber-300 dark:ring-amber-700/60',
        )}
      >
        {partner.isFeatured && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow">
            <Star className="h-3 w-3 fill-amber-950" /> Destaque
          </div>
        )}

        <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
          {/* Logo / Initial */}
          <div className="flex items-center gap-3">
            {partner.logoUrl ? (
              <img
                src={partner.logoUrl}
                alt={`Logo ${partner.name}`}
                className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-border/60"
              />
            ) : (
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white shadow',
                  meta.gradient,
                )}
                aria-hidden
              >
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold leading-tight">
                {partner.name}
              </h3>
              <Badge
                variant="secondary"
                className={cn('mt-1 text-[11px]', meta.badge)}
              >
                {meta.label}
              </Badge>
            </div>
          </div>

          {/* Discount + Cashback */}
          <div className="flex flex-wrap items-center gap-2">
            {partner.discountText ? (
              <span className="rounded-lg bg-gradient-to-r from-rose-500 to-red-500 px-2.5 py-1 text-sm font-extrabold text-white shadow-sm">
                {partner.discountText}
              </span>
            ) : null}
            {partner.cashbackPercent > 0 && (
              <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-600">
                <Gift className="h-3 w-3" /> {partner.cashbackPercent}% CashBack
              </Badge>
            )}
          </div>

          {/* Description */}
          {partner.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {partner.description}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/70">
              Sem descrição disponível.
            </p>
          )}

          {/* Phone */}
          {partner.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span className="truncate">{partner.phone}</span>
            </div>
          )}

          {/* Action */}
          <Button
            onClick={() => onVerOferta(partner)}
            className="mt-auto h-11 w-full gap-1.5"
            size="default"
          >
            <ExternalLink className="h-4 w-4" /> Ver Oferta
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PartnerGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/30 px-6 py-16 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </motion.div>
  )
}
