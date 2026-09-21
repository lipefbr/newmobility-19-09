'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore, type PageKey } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Home,
  Smartphone,
  Building2,
  User,
  CreditCard,
  ShoppingCart,
  Store,
  Gamepad2,
  Trophy,
  Gift,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Wallet,
  Ticket,
  Headphones,
  Command,
  Network,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchItem {
  key: PageKey
  labelKey: string
  icon: React.ElementType
  groupKey: string
  keywords: string[]
}

const searchItems: SearchItem[] = [
  { key: 'dashboard', labelKey: 'sidebar.dashboard', icon: Home, groupKey: 'sidebar.group.main', keywords: ['início', 'home', 'dashboard', 'painel'] },
  { key: 'apps', labelKey: 'sidebar.apps', icon: Smartphone, groupKey: 'sidebar.group.main', keywords: ['apps', 'aplicativos', 'download'] },
  { key: 'bank', labelKey: 'sidebar.bank', icon: Building2, groupKey: 'sidebar.group.main', keywords: ['banco', 'bank', 'financeiro'] },
  { key: 'profile', labelKey: 'sidebar.profile', icon: User, groupKey: 'sidebar.group.main', keywords: ['perfil', 'dados', 'pessoal', 'profile'] },
  { key: 'myplan', labelKey: 'sidebar.myplan', icon: CreditCard, groupKey: 'sidebar.group.main', keywords: ['plano', 'plan', 'assinatura'] },
  { key: 'purchases', labelKey: 'sidebar.purchases', icon: ShoppingCart, groupKey: 'sidebar.group.main', keywords: ['compras', 'purchases', 'relatório'] },
  { key: 'portal-lojista', labelKey: 'sidebar.portal-lojista', icon: Store, groupKey: 'sidebar.group.portals', keywords: ['lojista', 'merchant', 'loja'] },
  { key: 'portal-gamer', labelKey: 'sidebar.portal-gamer', icon: Gamepad2, groupKey: 'sidebar.group.portals', keywords: ['gamer', 'jogos', 'games'] },
  { key: 'portal-sportbet', labelKey: 'sidebar.portal-sportbet', icon: Trophy, groupKey: 'sidebar.group.portals', keywords: ['sport', 'bet', 'esporte', 'aposta'] },
  { key: 'gratifications', labelKey: 'sidebar.gratifications', icon: Gift, groupKey: 'sidebar.group.financial', keywords: ['gratificações', 'gratuity', 'bônus'] },
  { key: 'points', labelKey: 'sidebar.points', icon: Star, groupKey: 'sidebar.group.financial', keywords: ['pontos', 'points', 'pontuação'] },
  { key: 'career', labelKey: 'sidebar.career', icon: TrendingUp, groupKey: 'sidebar.group.financial', keywords: ['carreira', 'career', 'rank', 'plano'] },
  { key: 'referrals', labelKey: 'sidebar.referrals', icon: Users, groupKey: 'sidebar.group.financial', keywords: ['indicações', 'referrals', 'rede', 'indicados'] },
  { key: 'minha-rede', labelKey: 'sidebar.minha-rede', icon: Network, groupKey: 'sidebar.group.financial', keywords: ['minha rede', 'network', 'árvore', 'pirâmide', 'matriz', 'direta', 'residual', 'vendas'] },
  { key: 'cashback', labelKey: 'sidebar.cashback', icon: DollarSign, groupKey: 'sidebar.group.financial', keywords: ['cashback', 'cb', 'dinheiro', 'ganho'] },
  { key: 'financial', labelKey: 'sidebar.financial', icon: Wallet, groupKey: 'sidebar.group.financial', keywords: ['financeiro', 'financial', 'saldo', 'saque', 'extrato'] },
  { key: 'voucher', labelKey: 'sidebar.voucher', icon: Ticket, groupKey: 'sidebar.group.financial', keywords: ['voucher', 'vale', 'cupom'] },
  { key: 'support', labelKey: 'sidebar.support', icon: Headphones, groupKey: 'sidebar.group.support', keywords: ['suporte', 'support', 'ajuda', 'help', 'ticket'] },
]

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { setActivePage } = useStore()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? searchItems.filter(item => {
        const label = t(item.labelKey).toLowerCase()
        const q = query.toLowerCase()
        return (
          label.includes(q) ||
          item.keywords.some(k => k.includes(q))
        )
      })
    : searchItems

  const handleSelect = useCallback((key: PageKey) => {
    setActivePage(key)
    setQuery('')
    onOpenChange(false)
  }, [setActivePage, onOpenChange])

  // Reset query when dialog closes
  const currentQuery = open ? query : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Buscar</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={currentQuery}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar páginas, funcionalidades..."
            className="border-0 focus-visible:ring-0 h-11 text-sm"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    onClick={() => handleSelect(item.key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-muted/80 transition-colors group"
                  >
                    <div className="p-1.5 rounded-md bg-muted group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <span className="font-medium text-foreground flex-1">{t(item.labelKey)}</span>
                    <Badge variant="outline" className="text-[9px] hidden sm:inline-flex">
                      {t(item.groupKey)}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="border-t border-border px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">↵</kbd>
              Selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono">↑↓</kbd>
              Navegar
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Sidebar search input
export function SidebarSearch() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { setActivePage } = useStore()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? searchItems.filter(item => {
        const label = t(item.labelKey).toLowerCase()
        const q = query.toLowerCase()
        return label.includes(q) || item.keywords.some(k => k.includes(q))
      })
    : []

  return (
    <>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('general.search') + '...'}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex pointer-events-none h-4 select-none items-center rounded border border-white/10 bg-white/5 px-1 font-mono text-[8px] font-medium text-gray-500">
            ⌘K
          </kbd>
        </div>
        {searchOpen && query.trim() && (
          <div className="absolute left-2 right-2 z-50 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto sidebar-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-gray-500 text-center">Nenhum resultado</div>
            ) : (
              filtered.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    onMouseDown={() => {
                      setActivePage(item.key)
                      setQuery('')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-white/10 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-white truncate">{t(item.labelKey)}</span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </>
  )
}
