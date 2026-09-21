'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Users, Layers, Search, ChevronDown, ChevronRight, ChevronUp, Mail,
  Calendar, Award, UserCheck, UserX, Loader2,
  Grid3x3, List as ListIcon, Crown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatDate, getPlanName, getStatusLabel, getStatusVariant } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { referralsApi } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// MatrixPyramid
//
// Shows the logged-in user's referral network as a "pyramid" — each level
// (Nível 1, 2, 3, ...) rendered as a horizontal row of person cards, so the
// user can see WHO is in their matrix at each depth.
//
// Used on the "Meus Indicados" tab when the user selects one of the matrix
// view modes (entrada / residual / vendas).
//
// Data source: /api/referrals/tree?userId=...&depth={5|7|9} — returns the
// real nested referral tree with each person's name, email, plan, status,
// createdAt, and direct-referral count.
// ─────────────────────────────────────────────────────────────────────────────

type MatrixType = 'entrada' | 'residual' | 'vendas'

interface TreeNode {
  id: string
  name: string
  email?: string | null
  referralCode?: string | null
  plan: string
  isActive: boolean
  createdAt?: string | null
  level: number
  referralCount: number
  children: TreeNode[]
}

interface TreeApiResponse {
  rootUser: {
    id: string
    name: string
    email?: string | null
    plan: string
    referralCode?: string | null
    isActive: boolean
  }
  tree: TreeNode | null
  levelCounts?: { level: number; count: number }[]
  totalNodes?: number
  maxDepth?: number
}

const MATRIX_CONFIG: Record<MatrixType, { depth: number; title: string; width: number; description: string }> = {
  entrada: { depth: 5, title: 'Matriz de Entrada (4x5)', width: 4, description: '5 níveis de profundidade · 4 indicações por nível' },
  residual: { depth: 7, title: 'Matriz Residual (4x7)', width: 4, description: '7 níveis de profundidade · renda residual' },
  vendas: { depth: 9, title: 'Matriz de Vendas (4x9)', width: 4, description: '9 níveis de profundidade · comissões de vendas' },
}

function planBadgeColor(plan: string) {
  switch (plan) {
    case 'blue5':
    case 'premium5':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'blue3':
      return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
}

// Flatten the tree into a flat list of nodes (excluding the root user at
// level 0), so we can group them by level for the pyramid rows.
function flattenTree(root: TreeNode | null): TreeNode[] {
  if (!root) return []
  const result: TreeNode[] = []
  const walk = (node: TreeNode) => {
    for (const child of node.children) {
      result.push(child)
      walk(child)
    }
  }
  walk(root)
  return result
}

interface MatrixPyramidProps {
  type: MatrixType
}

export function MatrixPyramid({ type }: MatrixPyramidProps) {
  const { user } = useStore()
  const config = MATRIX_CONFIG[type]

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rootNode, setRootNode] = useState<TreeNode | null>(null)
  const [rootUser, setRootUser] = useState<TreeApiResponse['rootUser'] | null>(null)
  const [levelCounts, setLevelCounts] = useState<{ level: number; count: number }[]>([])
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedPerson, setSelectedPerson] = useState<TreeNode | null>(null)
  const [viewMode, setViewMode] = useState<'pyramid' | 'tree'>('pyramid')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set())

  const fetchTree = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data: TreeApiResponse = await referralsApi.getTree(user.id, config.depth)
      if (!data) {
        setError('Não foi possível carregar a rede.')
        setRootNode(null)
        return
      }
      setRootUser(data.rootUser)
      setRootNode(data.tree)
      setLevelCounts(Array.isArray(data.levelCounts) ? data.levelCounts : [])
      // Auto-expand root by default in tree view
      if (data.tree) {
        setExpandedNodes(new Set([data.tree.id]))
      }
    } catch (err) {
      console.error('Failed to load matrix pyramid:', err)
      setError('Erro ao carregar a matriz. Tente novamente.')
      setRootNode(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id, config.depth])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  // Flatten the tree into a list of all people (excluding root), grouped by level
  const allPeople = useMemo(() => flattenTree(rootNode), [rootNode])
  const peopleByLevel = useMemo(() => {
    const map = new Map<number, TreeNode[]>()
    for (const p of allPeople) {
      const arr = map.get(p.level) || []
      arr.push(p)
      map.set(p.level, arr)
    }
    return map
  }, [allPeople])

  const totalPeople = allPeople.length
  const activeCount = allPeople.filter((p) => p.isActive).length
  const maxLevelWithData = allPeople.length > 0 ? Math.max(...allPeople.map((p) => p.level)) : 0

  // Compute capacity per level (4^level for a 4-wide matrix)
  const levels = Array.from({ length: config.depth }, (_, i) => i + 1)
  const capacityByLevel = (lvl: number) => Math.pow(config.width, lvl)

  // Filtered people per level (applies search + plan + status filters)
  const filteredPeopleByLevel = useMemo(() => {
    const map = new Map<number, TreeNode[]>()
    for (const [lvl, people] of peopleByLevel.entries()) {
      const filtered = people.filter((p) => {
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.email || '').toLowerCase().includes(search.toLowerCase())
        const matchesPlan = planFilter === 'all' || p.plan === planFilter
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && p.isActive) ||
          (statusFilter === 'inactive' && !p.isActive)
        return matchesSearch && matchesPlan && matchesStatus
      })
      map.set(lvl, filtered)
    }
    return map
  }, [peopleByLevel, search, planFilter, statusFilter])

  const filteredTotal = useMemo(() => {
    let count = 0
    for (const people of filteredPeopleByLevel.values()) count += people.length
    return count
  }, [filteredPeopleByLevel])

  const toggleLevel = (lvl: number) => {
    setCollapsedLevels((prev) => {
      const next = new Set(prev)
      if (next.has(lvl)) next.delete(lvl)
      else next.add(lvl)
      return next
    })
  }

  const expandAllLevels = () => setCollapsedLevels(new Set())
  const collapseAllLevels = () =>
    setCollapsedLevels(new Set(levels.filter((l) => l > 1)))

  const toggleTreeNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAllTree = () => {
    if (!rootNode) return
    const allIds = new Set<string>()
    const collect = (n: TreeNode) => {
      allIds.add(n.id)
      n.children.forEach(collect)
    }
    collect(rootNode)
    setExpandedNodes(allIds)
  }

  const collapseAllTree = () => {
    if (!rootNode) {
      setExpandedNodes(new Set())
      return
    }
    setExpandedNodes(new Set([rootNode.id]))
  }

  // ─── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Error state ────────────────────────────────────────────────
  if (error) {
    return (
      <Card>
        <CardContent className="p-8 flex flex-col items-center justify-center gap-3 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTree} className="gap-1.5">
            <Loader2 className="h-3.5 w-3.5" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ─── Empty state (no referrals yet) ─────────────────────────────
  if (!rootNode || totalPeople === 0) {
    return (
      <Card>
        <CardContent className="p-8 flex flex-col items-center justify-center gap-3 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Nenhum indicado nesta matriz ainda</p>
          <p className="text-xs text-muted-foreground/70 max-w-md">
            Compartilhe seu link de indicação para começar a preencher sua matriz{' '}
            <span className="font-medium text-emerald-600">{config.title}</span>. As pessoas que se
            cadastrarem aparecerão aqui organizadas por nível.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header: Matrix title + total members */}
      <Card className="border-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
        <CardContent className="p-4 md:p-5 relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-emerald-200" />
              <p className="text-sm text-emerald-100 font-medium">{config.title}</p>
            </div>
            <p className="text-2xl font-bold text-white">{totalPeople.toLocaleString('pt-BR')} membros</p>
            <p className="text-xs text-emerald-100 mt-0.5">{config.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <p className="text-[10px] text-emerald-200 uppercase tracking-wide">Capacidade</p>
              <p className="text-lg font-bold text-white">
                {levels.reduce((acc, l) => acc + capacityByLevel(l), 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <p className="text-[10px] text-emerald-200 uppercase tracking-wide">Ativos</p>
              <p className="text-lg font-bold text-white">{activeCount.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <p className="text-[10px] text-emerald-200 uppercase tracking-wide">Níveis</p>
              <p className="text-lg font-bold text-white">{config.depth}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Root user banner */}
      {rootUser && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3 flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-emerald-300 dark:border-emerald-700">
              <AvatarFallback className="bg-emerald-200 text-emerald-800 text-sm font-bold dark:bg-emerald-900 dark:text-emerald-300">
                {getInitials(rootUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground">{rootUser.name}</span>
                <Badge variant="outline" className={cn('text-[10px]', planBadgeColor(rootUser.plan))}>
                  {getPlanName(rootUser.plan)}
                </Badge>
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Você (Topo da Pirâmide)
                </Badge>
              </div>
              {rootUser.email && (
                <p className="text-xs text-muted-foreground truncate">{rootUser.email}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{totalPeople}</p>
              <p className="text-[10px] text-muted-foreground">na sua rede</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls: Search + Filters + View toggle */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pessoa por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs min-w-[120px]"
        >
          <option value="all">Todos os Planos</option>
          <option value="free">Gratuito</option>
          <option value="blue3">Blue 3</option>
          <option value="blue5">Blue 5</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs min-w-[100px]"
        >
          <option value="all">Status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        {/* View mode toggle */}
        <div className="flex items-center gap-1 border rounded-md h-9 px-1">
          <button
            onClick={() => setViewMode('pyramid')}
            title="Visão Pirâmide (por nível)"
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'pyramid'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('tree')}
            title="Visão Árvore (hierárquica)"
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'tree'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ListIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filtered count + expand/collapse all */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          Mostrando <span className="font-bold text-foreground">{filteredTotal}</span> de{' '}
          <span className="font-bold text-foreground">{totalPeople}</span> pessoas
          {search || planFilter !== 'all' || statusFilter !== 'all' ? ' (filtrado)' : ''}
        </p>
        {viewMode === 'pyramid' ? (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={expandAllLevels}>
              <ChevronDown className="h-3 w-3" /> Expandir níveis
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={collapseAllLevels}>
              <ChevronUp className="h-3 w-3" /> Recolher níveis
            </Button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={expandAllTree}>
              <ChevronDown className="h-3 w-3" /> Expandir tudo
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={collapseAllTree}>
              <ChevronUp className="h-3 w-3" /> Recolher tudo
            </Button>
          </div>
        )}
      </div>

      {/* ─── PYRAMID VIEW (level-by-level rows) ─── */}
      {viewMode === 'pyramid' && (
        <div className="space-y-3">
          {levels.map((lvl) => {
            const people = filteredPeopleByLevel.get(lvl) || []
            const capacity = capacityByLevel(lvl)
            const isCollapsed = collapsedLevels.has(lvl)
            // Skip levels with no data when no filter is active
            if (
              people.length === 0 &&
              (peopleByLevel.get(lvl) || []).length === 0 &&
              !search &&
              planFilter === 'all' &&
              statusFilter === 'all'
            ) {
              return null
            }
            return (
              <Card key={lvl} className="overflow-hidden">
                {/* Level header bar */}
                <button
                  onClick={() => toggleLevel(lvl)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-emerald-600" />
                    )}
                    <div
                      className={cn(
                        'p-1.5 rounded-lg text-xs font-bold',
                        lvl <= 2
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : lvl <= 4
                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                            : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                      )}
                    >
                      N{lvl}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Nível {lvl}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'} · capacidade {capacity.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Fill ratio bar */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full bg-gradient-to-r',
                            lvl <= 2
                              ? 'from-emerald-400 to-emerald-600'
                              : lvl <= 4
                                ? 'from-teal-400 to-teal-600'
                                : 'from-cyan-400 to-cyan-600'
                          )}
                          style={{
                            width: `${Math.min((people.length / Math.max(capacity, 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                        {((people.length / Math.max(capacity, 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        people.length > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {people.length}/{capacity}
                    </Badge>
                  </div>
                </button>

                {/* Level people grid */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <CardContent className="p-3 pt-0">
                        {people.length === 0 ? (
                          <div className="py-6 text-center">
                            <p className="text-xs text-muted-foreground">
                              {(peopleByLevel.get(lvl) || []).length === 0
                                ? `Nenhuma pessoa no nível ${lvl} ainda`
                                : 'Nenhuma pessoa corresponde aos filtros'}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                            {people.map((person, idx) => (
                              <PersonCard
                                key={person.id}
                                person={person}
                                onClick={() => setSelectedPerson(person)}
                                index={idx}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}

          {filteredTotal === 0 && (search || planFilter !== 'all' || statusFilter !== 'all') && (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center gap-2 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma pessoa encontrada</p>
                <p className="text-xs text-muted-foreground/70">Tente ajustar os filtros de busca</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── TREE VIEW (nested hierarchy) ─── */}
      {viewMode === 'tree' && rootNode && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[700px] overflow-y-auto custom-scrollbar bg-muted/20 rounded-lg">
              <TreePersonRow
                node={rootNode}
                depth={0}
                expanded={expandedNodes}
                toggleExpand={toggleTreeNode}
                searchQuery={search}
                planFilter={planFilter}
                statusFilter={statusFilter}
                onSelect={setSelectedPerson}
                isRoot
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Person detail dialog */}
      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Detalhes da Pessoa
            </DialogTitle>
            <DialogDescription className="sr-only">
              Informações detalhadas sobre esta pessoa na sua rede
            </DialogDescription>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-emerald-200 dark:border-emerald-800">
                  <AvatarFallback
                    className={cn(
                      'text-lg font-bold',
                      selectedPerson.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {getInitials(selectedPerson.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-lg">{selectedPerson.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className={cn('text-[10px]', planBadgeColor(selectedPerson.plan))}>
                      {getPlanName(selectedPerson.plan)}
                    </Badge>
                    <Badge variant={getStatusVariant(selectedPerson.isActive ? 'active' : 'inactive')} className="text-[10px]">
                      {selectedPerson.isActive ? (
                        <><UserCheck className="h-3 w-3 mr-0.5" /> {getStatusLabel('active')}</>
                      ) : (
                        <><UserX className="h-3 w-3 mr-0.5" /> {getStatusLabel('inactive')}</>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                      Nível {selectedPerson.level}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedPerson.email && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Email</span>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{selectedPerson.email}</p>
                  </div>
                )}
                {selectedPerson.createdAt && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Entrou em</span>
                    </div>
                    <p className="text-xs font-medium text-foreground">{formatDate(selectedPerson.createdAt)}</p>
                  </div>
                )}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Indicações Diretas</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedPerson.referralCount}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Plano</span>
                  </div>
                  <p className="text-xs font-medium text-foreground">{getPlanName(selectedPerson.plan)}</p>
                </div>
              </div>

              {selectedPerson.children.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Indicações diretas ({selectedPerson.children.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPerson.children.slice(0, 8).map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedPerson(child)}
                        className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2 py-1 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center text-[8px] font-bold">
                          {getInitials(child.name)}
                        </div>
                        <span className="text-[10px] font-medium text-foreground truncate max-w-[100px]">
                          {child.name}
                        </span>
                      </button>
                    ))}
                    {selectedPerson.children.length > 8 && (
                      <span className="text-[10px] text-muted-foreground self-center px-1">
                        +{selectedPerson.children.length - 8} mais
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── PersonCard: compact card showing a single person in the pyramid ───
function PersonCard({
  person,
  onClick,
  index,
}: {
  person: TreeNode
  onClick: () => void
  index: number
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="text-left"
    >
      <Card
        className={cn(
          'shadow-sm hover:shadow-md transition-all h-full',
          person.isActive
            ? 'bg-card hover:border-emerald-300 dark:hover:border-emerald-700'
            : 'bg-card opacity-70 border-red-100 dark:border-red-900/30'
        )}
      >
        <CardContent className="p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="h-8 w-8 border border-border shrink-0">
              <AvatarFallback
                className={cn(
                  'text-[10px] font-bold',
                  person.isActive
                    ? person.plan === 'blue5' || person.plan === 'premium5'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : person.plan === 'blue3'
                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    : 'bg-red-50 text-red-400 dark:bg-red-950/30 dark:text-red-500'
                )}
              >
                {getInitials(person.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{person.name}</p>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    person.isActive ? 'bg-emerald-500' : 'bg-red-400'
                  )}
                  title={person.isActive ? 'Ativo' : 'Inativo'}
                />
                <span className="text-[9px] text-muted-foreground">
                  {person.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1">
            <Badge variant="outline" className={cn('text-[8px] px-1 py-0 h-4', planBadgeColor(person.plan))}>
              {getPlanName(person.plan)}
            </Badge>
            {person.referralCount > 0 ? (
              <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Users className="h-2.5 w-2.5" />
                {person.referralCount}
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground/50">sem indicações</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.button>
  )
}

// ─── TreePersonRow: nested tree row (for the "tree" view mode) ───
function TreePersonRow({
  node,
  depth,
  expanded,
  toggleExpand,
  searchQuery,
  planFilter,
  statusFilter,
  onSelect,
  isRoot = false,
}: {
  node: TreeNode
  depth: number
  expanded: Set<string>
  toggleExpand: (id: string) => void
  searchQuery: string
  planFilter: string
  statusFilter: string
  onSelect: (n: TreeNode) => void
  isRoot?: boolean
}) {
  const isExpanded = expanded.has(node.id)
  const hasChildren = node.children.length > 0

  const matchesSearch =
    !searchQuery ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  const matchesPlan = planFilter === 'all' || node.plan === planFilter
  const matchesStatus =
    statusFilter === 'all' ||
    (statusFilter === 'active' && node.isActive) ||
    (statusFilter === 'inactive' && !node.isActive)

  // For non-root nodes, hide if doesn't match filters (but still show if any descendant matches)
  const hasMatchingDescendant = (n: TreeNode): boolean => {
    for (const child of n.children) {
      const childMatches =
        child.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (planFilter === 'all' || child.plan === planFilter) &&
        (statusFilter === 'all' ||
          (statusFilter === 'active' && child.isActive) ||
          (statusFilter === 'inactive' && !child.isActive))
      if (childMatches || hasMatchingDescendant(child)) return true
    }
    return false
  }

  const showThisRow = isRoot || (matchesSearch && matchesPlan && matchesStatus) || hasMatchingDescendant(node)
  if (!showThisRow) return null

  const dimmed = !isRoot && !(matchesSearch && matchesPlan && matchesStatus)

  return (
    <div className={dimmed ? 'opacity-40' : ''}>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => !isRoot && onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand(node.id)
            }}
            className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Avatar className="h-7 w-7 border shrink-0">
          <AvatarFallback
            className={cn(
              'text-[9px] font-bold',
              isRoot
                ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                : node.isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'bg-red-50 text-red-400 dark:bg-red-950/30 dark:text-red-500'
            )}
          >
            {getInitials(node.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-foreground truncate block">
            {node.name}
            {isRoot && <span className="text-[9px] text-emerald-600 ml-1">(Você)</span>}
          </span>
          {node.email && !isRoot && (
            <span className="text-[9px] text-muted-foreground truncate block">{node.email}</span>
          )}
        </div>
        {!isRoot && (
          <Badge variant="outline" className={cn('text-[9px] shrink-0', planBadgeColor(node.plan))}>
            {getPlanName(node.plan)}
          </Badge>
        )}
        {!isRoot && (
          <span className="text-[9px] text-muted-foreground shrink-0">N{node.level}</span>
        )}
        {hasChildren && (
          <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            <Users className="h-2.5 w-2.5" />
            {node.children.length}
          </span>
        )}
      </div>
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreePersonRow
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                searchQuery={searchQuery}
                planFilter={planFilter}
                statusFilter={statusFilter}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
