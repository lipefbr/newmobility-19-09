'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { accreditedNetworkApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
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
  MapPin,
  Phone,
  Fuel,
  Pill,
  ShoppingCart,
  UtensilsCrossed,
  Building2,
  Navigation,
  Percent,
  Gift,
  SearchX,
  ChevronDown,
  Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ---- Types ----

interface AccreditedItem {
  id: string
  name: string
  category: string
  brand?: string | null
  city: string
  state: string
  address?: string | null
  phone?: string | null
  discountText?: string | null
  cashbackPercent: number
  isActive: boolean
  sortOrder: number
}

interface AccreditedResponse {
  items: AccreditedItem[]
  states: string[]
  categories: string[]
  brands: string[]
}

// ---- Brand styling ----

const BRAND_COLORS: Record<string, { gradient: string; badge: string }> = {
  shell: {
    gradient: 'from-yellow-400 to-amber-500',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  },
  ipiranga: {
    gradient: 'from-green-500 to-emerald-600',
    badge: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  },
  br: {
    gradient: 'from-green-600 to-emerald-700',
    badge: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  },
  gulf: {
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  },
  ale: {
    gradient: 'from-red-500 to-rose-600',
    badge: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  },
}

function brandMeta(brand?: string | null) {
  const key = (brand || '').toLowerCase()
  return (
    BRAND_COLORS[key] ?? {
      gradient: 'from-slate-500 to-gray-600',
      badge:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    }
  )
}

// Category icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  posto: Fuel,
  farmacia: Pill,
  farmácia: Pill,
  mercado: ShoppingCart,
  restaurante: UtensilsCrossed,
}

function categoryIcon(cat: string): React.ElementType {
  return CATEGORY_ICONS[(cat || '').toLowerCase()] ?? Building2
}

function CategoryIcon({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  const key = (category || '').toLowerCase()
  const Icon = CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS] ?? Building2
  return <Icon className={className} />
}

// ---- Component ----

export function RedeCredenciadaPage() {
  const user = useStore((s) => s.user)

  const [items, setItems] = useState<AccreditedItem[]>([])
  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')

  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await accreditedNetworkApi.getItems({
        search: debouncedSearch || undefined,
        state: stateFilter,
        category: categoryFilter,
        brand: brandFilter,
        userId: user?.id,
      })
      const data = res as AccreditedResponse
      setItems(Array.isArray(data?.items) ? data.items : [])
      setAvailableStates(Array.isArray(data?.states) ? data.states : [])
      setAvailableCategories(Array.isArray(data?.categories) ? data.categories : [])
      setAvailableBrands(Array.isArray(data?.brands) ? data.brands : [])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Falha ao carregar rede credenciada.'
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, stateFilter, categoryFilter, brandFilter, user?.id])

  useEffect(() => {
    load()
  }, [load])

  // Group by state
  const grouped = useMemo(() => {
    const map = new Map<string, AccreditedItem[]>()
    for (const it of items) {
      const key = it.state || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    }
    // Sort items inside each state by name
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.name.localeCompare(b.name))
      map.set(k, arr)
    }
    // Sort states alphabetically
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  const stats = useMemo(() => {
    const uniqueBrands = new Set(
      items.map((i) => i.brand).filter(Boolean) as string[]
    )
    return {
      total: items.length,
      states: new Set(items.map((i) => i.state).filter(Boolean)).size,
      brands: uniqueBrands.size,
    }
  }, [items])

  const toggleState = (s: string) =>
    setCollapsedStates((prev) => ({ ...prev, [s]: !prev[s] }))

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-sky-500 to-orange-500 p-6 text-white shadow-xl sm:p-10"
        aria-label="Rede Credenciada"
      >
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-12 h-72 w-72 rounded-full bg-orange-400/30 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4">
          <Badge className="w-fit gap-1.5 bg-white/20 text-white hover:bg-white/30">
            <Navigation className="h-3.5 w-3.5" /> Cobertura Nacional
          </Badge>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Rede Credenciada
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
              Postos, farmácias, supermercados e restaurantes credenciados em
              todo o Brasil. Descontos e cashback na hora, perto de você.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-2 grid grid-cols-3 gap-3">
            <HeroStat
              icon={<Building2 className="h-4 w-4" />}
              value={stats.total}
              label="Estabelecimentos"
            />
            <HeroStat
              icon={<MapPin className="h-4 w-4" />}
              value={stats.states}
              label="Estados"
            />
            <HeroStat
              icon={<Layers className="h-4 w-4" />}
              value={stats.brands}
              label="Marcas"
            />
          </div>
        </div>
      </motion.section>

      {/* Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, cidade ou endereço..."
                className="h-11 pl-9"
                aria-label="Buscar estabelecimentos"
              />
            </div>
            <FilterSelect
              value={stateFilter}
              onChange={setStateFilter}
              placeholder="Estado"
              options={availableStates}
              allLabel="Todos os estados"
            />
            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="Categoria"
              options={availableCategories}
              allLabel="Todas as categorias"
            />
            <FilterSelect
              value={brandFilter}
              onChange={setBrandFilter}
              placeholder="Marca"
              options={availableBrands}
              allLabel="Todas as marcas"
              className="lg:col-span-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <StateListSkeleton />
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar"
          description={error}
          icon={<SearchX className="h-8 w-8" />}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum estabelecimento encontrado"
          description="Buscar estabelecimento: ajuste os filtros para encontrar credenciados."
          icon={<SearchX className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([state, list]) => (
            <StateSection
              key={state}
              state={state}
              items={list}
              collapsed={!!collapsedStates[state]}
              onToggle={() => toggleState(state)}
            />
          ))}
        </div>
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: string[]
  allLabel: string
  className?: string
}) {
  return (
    <div className={cn('w-full', className)}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full" aria-label={placeholder}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function StateSection({
  state,
  items,
  collapsed,
  onToggle,
}: {
  state: string
  items: AccreditedItem[]
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden border-border/60">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 text-left transition-colors hover:from-slate-100 hover:to-slate-200 dark:from-slate-900 dark:to-slate-800 dark:hover:from-slate-800 dark:hover:to-slate-700"
          aria-expanded={!collapsed}
          aria-label={`Alternar seção ${state}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-orange-500 text-sm font-bold text-white shadow">
              {state}
            </div>
            <div>
              <h3 className="text-base font-semibold">{state}</h3>
              <p className="text-xs text-muted-foreground">
                {items.length}{' '}
                {items.length === 1 ? 'estabelecimento' : 'estabelecimentos'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              collapsed && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it) => (
                  <EstablishmentCard key={it.id} item={it} />
                ))}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

function EstablishmentCard({ item }: { item: AccreditedItem }) {
  const brand = brandMeta(item.brand)
  const brandInitial = (item.brand || item.name).charAt(0).toUpperCase()

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {/* Brand initial */}
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base font-bold text-white shadow',
            brand.gradient,
          )}
          aria-hidden
        >
          {brandInitial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CategoryIcon
              category={item.category}
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            />
            <span className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
              {item.category}
            </span>
          </div>
          <h4 className="truncate text-sm font-semibold leading-tight">
            {item.name}
          </h4>
          {item.brand && (
            <Badge variant="secondary" className={cn('mt-1 text-[10px]', brand.badge)}>
              {item.brand}
            </Badge>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {item.city ? `${item.city} — ${item.state}` : item.state}
          </span>
        </div>
        {item.address && (
          <div className="flex items-start gap-1.5">
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{item.address}</span>
          </div>
        )}
        {item.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.phone}</span>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {item.discountText && (
          <Badge className="gap-1 bg-orange-500 text-white hover:bg-orange-600">
            <Percent className="h-3 w-3" /> {item.discountText}
          </Badge>
        )}
        {item.cashbackPercent > 0 && (
          <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-600">
            <Gift className="h-3 w-3" /> {item.cashbackPercent}% CashBack
          </Badge>
        )}
      </div>
    </motion.div>
  )
}

function StateListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-2 rounded-2xl border border-border/40 p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))}
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
