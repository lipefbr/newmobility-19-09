'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { referralsApi } from '@/lib/api'
import { formatCurrency, formatDate, getPlanName } from '@/lib/utils'
import {
  Search, Users, DollarSign, TrendingUp, ChevronDown, ChevronRight,
  ZoomIn, ZoomOut, Maximize2, UserCheck, Award, Mail, Calendar, Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TreeNode {
  id: string
  name: string
  email?: string | null
  referralCode?: string | null
  plan: string
  status: 'active' | 'inactive'
  isActive?: boolean
  level: number
  cashback: number
  createdAt?: string | null
  children: TreeNode[]
}

interface TreeApiResponse {
  rootUser: {
    id: string
    name: string
    email?: string | null
    referralCode?: string | null
    plan: string
    isActive?: boolean
  }
  tree: TreeNode | null
  levelCounts?: { level: number; count: number }[]
  totalNodes?: number
  maxDepth?: number
}

// Normalize a raw API node into our internal TreeNode shape with a `status`
// string and the `level` already populated. The API returns `level` on each
// node directly, but we reassign defensively in case it is missing.
function normalizeNode(raw: any, fallbackLevel: number): TreeNode {
  const level = typeof raw?.level === 'number' ? raw.level : fallbackLevel
  const children = Array.isArray(raw?.children)
    ? raw.children.map((c: any, idx: number) => normalizeNode(c, level + 1 + idx * 0))
    : []
  return {
    id: raw?.id || String(Math.random()),
    name: raw?.name || '—',
    email: raw?.email ?? null,
    referralCode: raw?.referralCode ?? null,
    plan: raw?.plan || 'free',
    status: raw?.isActive === false ? 'inactive' : 'active',
    isActive: raw?.isActive,
    level,
    cashback: 0,
    createdAt: raw?.createdAt ?? null,
    children,
  }
}

function countNodes(node: TreeNode): number {
  let count = 1
  for (const child of node.children) {
    count += countNodes(child)
  }
  return count
}

function getLevelStats(node: TreeNode, levelMap: Map<number, { users: number; earnings: number }> = new Map()) {
  const existing = levelMap.get(node.level) || { users: 0, earnings: 0 }
  levelMap.set(node.level, {
    users: existing.users + 1,
    earnings: existing.earnings + node.cashback,
  })
  for (const child of node.children) {
    getLevelStats(child, levelMap)
  }
  return levelMap
}

function searchTree(node: TreeNode, query: string): boolean {
  if (node.name.toLowerCase().includes(query.toLowerCase())) return true
  if (node.email && node.email.toLowerCase().includes(query.toLowerCase())) return true
  if (node.referralCode && node.referralCode.toLowerCase().includes(query.toLowerCase())) return true
  return node.children.some(child => searchTree(child, query))
}

function collectAllIds(node: TreeNode, ids: Set<string>) {
  ids.add(node.id)
  for (const child of node.children) {
    collectAllIds(child, ids)
  }
}

function planBadgeColor(plan: string) {
  switch (plan) {
    case 'blue5': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'blue3': return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400'
    default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
  }
}

function TreeNodeView({
  node,
  depth,
  expanded,
  toggleExpand,
  searchQuery,
  selectedId,
  onSelect,
}: {
  node: TreeNode
  depth: number
  expanded: Set<string>
  toggleExpand: (id: string) => void
  searchQuery: string
  selectedId: string | null
  onSelect: (node: TreeNode) => void
}) {
  const isExpanded = expanded.has(node.id)
  const hasChildren = node.children.length > 0
  const matchesSearch = searchQuery ? searchTree(node, searchQuery) : true
  const isDirectMatch =
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.referralCode || '').toLowerCase().includes(searchQuery.toLowerCase())

  if (!matchesSearch) return null

  const statusColor = node.status === 'active'
    ? 'border-emerald-300 dark:border-emerald-700'
    : 'border-red-200 dark:border-red-800 opacity-60'

  return (
    <div className="ml-0">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${isDirectMatch && searchQuery ? 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300' : ''} ${selectedId === node.id ? 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300' : ''}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
            className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Avatar className="h-7 w-7 border shrink-0">
          <AvatarFallback className={`text-[9px] font-medium ${statusColor}`}>
            {node.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-foreground truncate block">{node.name}</span>
          {node.email && (
            <span className="text-[9px] text-muted-foreground truncate block flex items-center gap-0.5">
              <Mail className="h-2.5 w-2.5 inline shrink-0" />
              <span className="truncate">{node.email}</span>
            </span>
          )}
        </div>
        {node.referralCode && (
          <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 shrink-0 hidden sm:inline">
            {node.referralCode}
          </span>
        )}
        <Badge variant="outline" className={`text-[9px] shrink-0 ${planBadgeColor(node.plan)}`}>{getPlanName(node.plan)}</Badge>
        {node.level > 0 && (
          <span className="text-[9px] text-muted-foreground shrink-0">N{node.level}</span>
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
            {node.children.map(child => (
              <TreeNodeView
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                searchQuery={searchQuery}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface NetworkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NetworkModal({ open, onOpenChange }: NetworkModalProps) {
  const { t } = useTranslation()
  const { user } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [zoom, setZoom] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rootNode, setRootNode] = useState<TreeNode | null>(null)
  const [levelCounts, setLevelCounts] = useState<{ level: number; count: number }[]>([])
  const [maxDepth, setMaxDepth] = useState(5)

  // Fetch the real referral tree from /api/referrals/tree?userId=...&depth=5
  const fetchTree = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data: TreeApiResponse = await referralsApi.getTree(user.id, 5)
      if (!data) {
        setError('Não foi possível carregar a rede.')
        setRootNode(null)
        return
      }
      // The API returns `tree` as the root user object with nested children.
      // Normalize it into our internal TreeNode shape.
      const rawTree = data.tree as any
      if (rawTree && typeof rawTree === 'object' && rawTree.id) {
        const normalized = normalizeNode(rawTree, 0)
        setRootNode(normalized)
        // Auto-expand the root by default so users see their direct referrals
        setExpanded(new Set([normalized.id]))
      } else {
        setRootNode(null)
      }
      setLevelCounts(Array.isArray(data.levelCounts) ? data.levelCounts : [])
      setMaxDepth(typeof data.maxDepth === 'number' ? data.maxDepth : 5)
    } catch (err) {
      console.error('Failed to load referral tree:', err)
      setError('Erro ao carregar a rede. Tente novamente.')
      setRootNode(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (open) {
      fetchTree()
      // Reset UI state every time the modal opens
      setSearchQuery('')
      setSelectedNode(null)
      setZoom(100)
    }
  }, [open, fetchTree])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    if (!rootNode) return
    const allIds = new Set<string>()
    collectAllIds(rootNode, allIds)
    setExpanded(allIds)
  }

  const collapseAll = () => {
    if (!rootNode) {
      setExpanded(new Set())
      return
    }
    setExpanded(new Set([rootNode.id]))
    setSelectedNode(null)
  }

  // The API returns levelCounts directly, but we also derive them from the
  // tree as a fallback so the UI works even if the API omits the field.
  const computedLevelStats = useMemo(() => {
    if (!rootNode) return []
    const stats = getLevelStats(rootNode)
    stats.delete(0) // Remove root level
    return Array.from(stats.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, data]) => ({ level, ...data }))
  }, [rootNode])

  // Prefer the API-provided levelCounts; fall back to the computed ones.
  const levelStats = levelCounts.length > 0
    ? levelCounts.map((lc) => ({
        level: lc.level,
        users: lc.count,
        earnings: computedLevelStats.find((c) => c.level === lc.level)?.earnings || 0,
      }))
    : computedLevelStats

  const totalNetwork = rootNode ? countNodes(rootNode) - 1 : 0 // Exclude root
  const totalEarnings = levelStats.reduce((acc, l) => acc + l.earnings, 0)
  // Count active members across all levels (excluding root)
  const activeMembers = useMemo(() => {
    if (!rootNode) return 0
    let count = 0
    const walk = (n: TreeNode) => {
      if (n.level > 0 && n.status === 'active') count++
      n.children.forEach(walk)
    }
    walk(rootNode)
    return count
  }, [rootNode])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            {t('network.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">Full network tree visualization with level statistics</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search + Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('network.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="text-xs h-9" onClick={expandAll} disabled={!rootNode}>
                {t('network.expandAll')}
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-9" onClick={collapseAll} disabled={!rootNode}>
                {t('network.collapseAll')}
              </Button>
              <div className="flex items-center gap-1 border rounded-md px-2 h-9">
                <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="text-muted-foreground hover:text-foreground" aria-label="Diminuir zoom">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-medium w-8 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="text-muted-foreground hover:text-foreground" aria-label="Aumentar zoom">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Level Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="shadow-none">
              <CardContent className="p-2.5 text-center">
                <Users className="h-4 w-4 text-emerald-600 mx-auto mb-0.5" />
                <p className="text-lg font-bold text-foreground">{totalNetwork}</p>
                <p className="text-[9px] text-muted-foreground">{t('network.totalMembers')}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-2.5 text-center">
                <UserCheck className="h-4 w-4 text-teal-600 mx-auto mb-0.5" />
                <p className="text-lg font-bold text-foreground">{activeMembers}</p>
                <p className="text-[9px] text-muted-foreground">{t('network.activeMembers')}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-2.5 text-center">
                <DollarSign className="h-4 w-4 text-amber-600 mx-auto mb-0.5" />
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalEarnings)}</p>
                <p className="text-[9px] text-muted-foreground">{t('network.totalEarnings')}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-2.5 text-center">
                <Award className="h-4 w-4 text-purple-600 mx-auto mb-0.5" />
                <p className="text-lg font-bold text-foreground">{Math.max(maxDepth, levelStats.length)}</p>
                <p className="text-[9px] text-muted-foreground">{t('network.levels')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Level Breakdown — always show 5 levels for entrada matrix */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((lvl) => {
              const found = levelStats.find((l) => l.level === lvl)
              const users = found?.users || 0
              const earnings = found?.earnings || 0
              return (
                <div
                  key={lvl}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-center border border-border ${users > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/50'}`}
                >
                  <p className="text-[9px] text-muted-foreground">{t('network.level')} {lvl}</p>
                  <p className="text-sm font-bold text-foreground">{users}</p>
                  <p className="text-[9px] text-emerald-600">{formatCurrency(earnings)}</p>
                </div>
              )
            })}
          </div>

          {/* Tree View */}
          <div className="flex-1 border border-border rounded-xl overflow-y-auto custom-scrollbar bg-muted/20" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            {loading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <span className="text-sm">Carregando rede...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchTree}>Tentar novamente</Button>
              </div>
            ) : !rootNode || totalNetwork === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <Users className="h-8 w-8 opacity-50" />
                <p className="text-sm">Você ainda não possui indicados na rede.</p>
                <p className="text-xs">Compartilhe seu link de indicação para começar a construir sua rede.</p>
              </div>
            ) : (
              <TreeNodeView
                node={rootNode}
                depth={0}
                expanded={expanded}
                toggleExpand={toggleExpand}
                searchQuery={searchQuery}
                selectedId={selectedNode?.id || null}
                onSelect={setSelectedNode}
              />
            )}
          </div>

          {/* Selected Node Details */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                  <Avatar className="h-10 w-10 border-2 border-emerald-200 dark:border-emerald-700 shrink-0">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm dark:bg-emerald-900/40 dark:text-emerald-400">
                      {selectedNode.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{selectedNode.name}</span>
                      <Badge variant="outline" className={`text-[9px] ${planBadgeColor(selectedNode.plan)}`}>{getPlanName(selectedNode.plan)}</Badge>
                      {selectedNode.status === 'active' ? (
                        <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Ativo</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[9px]">Inativo</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1.5">
                      {selectedNode.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{selectedNode.email}</span>
                        </div>
                      )}
                      {selectedNode.referralCode && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 truncate">{selectedNode.referralCode}</span>
                        </div>
                      )}
                      {selectedNode.createdAt && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Entrou em {formatDate(selectedNode.createdAt)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Award className="h-3 w-3" />
                        <span>{t('network.level')} {selectedNode.level}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{selectedNode.children.length} {t('network.directReferrals')}</span>
                      </div>
                      {selectedNode.cashback > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <DollarSign className="h-3 w-3" />
                          <span>{formatCurrency(selectedNode.cashback)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
