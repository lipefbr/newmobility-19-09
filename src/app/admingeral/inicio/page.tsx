'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Tag, Store, Package, Image as ImageIcon, ClipboardList,
  Car, Users, Settings, LogOut, Menu, ShieldCheck, Loader2, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type Section } from '@/components/admingeral/types'
import { DashboardSection } from '@/components/admingeral/sections/dashboard'
import { CategoriasSection } from '@/components/admingeral/sections/categorias'
import { LojasSection } from '@/components/admingeral/sections/lojas'
import { ProdutosSection } from '@/components/admingeral/sections/produtos'
import { BannersSection } from '@/components/admingeral/sections/banners'
import { PedidosSection } from '@/components/admingeral/sections/pedidos'
import { MotoristasSection } from '@/components/admingeral/sections/motoristas'
import { UsuariosSection } from '@/components/admingeral/sections/usuarios'
import { ConfigSection } from '@/components/admingeral/sections/config'

// ============================================================================
// /admingeral/inicio — Painel Admin Geral do ecossistema de apps NewMobility.
// Single-page app with sidebar navigation + dynamic section content.
// Admin auth required (role='admin' OR userType='admin').

const PRIMARY = '#0F172A'

const NAV_ITEMS: Array<{ key: Section; label: string; icon: typeof LayoutDashboard; badgeKey?: 'drivers' | 'stores' | 'orders' }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'categorias', label: 'Categorias', icon: Tag },
  { key: 'lojas', label: 'Lojas', icon: Store, badgeKey: 'stores' },
  { key: 'produtos', label: 'Produtos', icon: Package },
  { key: 'banners', label: 'Banners', icon: ImageIcon },
  { key: 'pedidos', label: 'Pedidos', icon: ClipboardList, badgeKey: 'orders' },
  { key: 'motoristas', label: 'Motoristas', icon: Car, badgeKey: 'drivers' },
  { key: 'usuarios', label: 'Usuários', icon: Users },
  { key: 'config', label: 'Configurações', icon: Settings },
]

export default function AdmingeralInicioPage() {
  const router = useRouter()
  const { user, logout } = useStore()
  const [section, setSection] = useState<Section>('dashboard')
  const [loading, setLoading] = useState(true)
  const [pendingCounts, setPendingCounts] = useState({ drivers: 0, stores: 0, orders: 0 })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const checkAuth = useCallback(async () => {
    if (!user?.id) {
      router.replace('/admingeral/login')
      return
    }
    try {
      const me = await apiFetch<{
        isAppAdmin: boolean
        pendingCounts: { drivers: number; stores: number; orders: number }
      }>(`/admingeral/me?userId=${user.id}`)
      if (!me.isAppAdmin) {
        logout()
        router.replace('/admingeral/login')
        return
      }
      setPendingCounts(me.pendingCounts)
    } catch {
      toast.error('Sessão expirada')
      router.replace('/admingeral/login')
    } finally {
      setLoading(false)
    }
  }, [user?.id, router, logout])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
        <p className="text-sm text-slate-500 mt-2">Carregando painel...</p>
      </div>
    )
  }

  if (!user) return null

  const initials = user.name?.split(' ').slice(0, 2).map((n) => n.charAt(0).toUpperCase()).join('') || 'AD'

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <DashboardSection />
      case 'categorias': return <CategoriasSection />
      case 'lojas': return <LojasSection />
      case 'produtos': return <ProdutosSection />
      case 'banners': return <BannersSection />
      case 'pedidos': return <PedidosSection />
      case 'motoristas': return <MotoristasSection onApprove={() => checkAuth()} />
      case 'usuarios': return <UsuariosSection />
      case 'config': return <ConfigSection />
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Admin Geral</p>
            <p className="text-[10px] text-slate-400 mt-0.5">NewMobility Apps</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = section === item.key
          const badge = item.badgeKey ? pendingCounts[item.badgeKey] : 0
          return (
            <button
              key={item.key}
              onClick={() => {
                setSection(item.key)
                setMobileNavOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImage || undefined} alt={user.name} />
            <AvatarFallback className="bg-white/10 text-white text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout()
            router.replace('/admingeral/login')
          }}
          className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair do painel
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-30"
        style={{ backgroundColor: PRIMARY }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0" style={{ backgroundColor: PRIMARY }}>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 capitalize">
              {NAV_ITEMS.find((n) => n.key === section)?.label}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Painel Admin Geral — gestão do ecossistema de apps
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-3 w-3" />
            Ver site
          </a>
        </header>

        {/* Section content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
