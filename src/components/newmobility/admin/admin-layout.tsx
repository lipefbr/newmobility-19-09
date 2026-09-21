'use client'

import {
  Shield,
  LayoutDashboard,
  Users,
  Wallet,
  CreditCard,
  Gift,
  Headphones,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  ArrowLeftRight,
  Bell,
  Moon,
  Sun,
  RefreshCw,
  Ticket,
  Gamepad2,
  Network,
  Percent,
  Trophy,
  Crown,
  Flame,
  Calendar,
  HelpCircle,
  Banknote,
  Landmark,
  ShieldCheck,
  ScrollText,
  Lock,
  Target,
  Smartphone,
  HeartPulse,
  ClipboardCheck,
  UserCog,
  Wrench,
  Type,
  Car,
} from 'lucide-react'
import { useStore, type AdminPageKey } from '@/lib/store'
import { useAdminPermissions } from '@/lib/admin-permissions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'

interface AdminNavItem {
  key: AdminPageKey
  label: string
  icon: React.ElementType
  description: string
  group: 'main' | 'system'
}

const adminNavItems: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Visão geral e estatísticas', group: 'main' },
  { key: 'users', label: 'Usuários', icon: Users, description: 'Gerenciamento de usuários', group: 'main' },
  { key: 'user-types', label: 'Tipos de Usuário', icon: UserCog, description: 'Criar e gerenciar tipos de conta (Motorista, Lojista, etc.) + permissões mobile', group: 'main' },
  { key: 'financial', label: 'Financeiro', icon: Wallet, description: 'Transações, saques e cashback', group: 'main' },
  { key: 'withdrawals-asaas', label: 'Saques Asaas', icon: Banknote, description: 'Aprovar saques via Asaas (PIX/TED)', group: 'main' },
  { key: 'plans', label: 'Planos & Preços', icon: CreditCard, description: 'Planos e matrizes', group: 'main' },
  { key: 'gratifications', label: 'Gratificações', icon: Gift, description: 'Saldos de gratificação', group: 'main' },
  { key: 'service-types', label: 'Tipos de Serviço', icon: Wrench, description: 'Categorias do módulo de Serviços (CRUD + ativar/desativar)', group: 'main' },
  { key: 'vouchers', label: 'Vouchers', icon: Ticket, description: 'Gerenciar vouchers e cupons', group: 'main' },
  { key: 'bets', label: 'Jogos & Apostas', icon: Gamepad2, description: 'Gerenciar apostas e jogos', group: 'main' },
  { key: 'matrices', label: 'Matrizes MMN', icon: Network, description: 'Visualizar matrizes de indicações', group: 'main' },
  { key: 'support', label: 'Tickets de Suporte', icon: Headphones, description: 'Atendimento ao cliente', group: 'main' },
  { key: 'kyc', label: 'Aprovação KYC', icon: ShieldCheck, description: 'Validar documentos de usuários', group: 'main' },
  { key: 'talkmobi', label: 'Planos TalkMobi', icon: Smartphone, description: 'Editar planos de celular TalkMobi', group: 'main' },
  { key: 'talkmobi-subscriptions', label: 'Assinaturas TalkMobi', icon: ClipboardCheck, description: 'Receber e aprovar pedidos de assinatura', group: 'main' },
  { key: 'telemedicina', label: 'Telemedicina', icon: HeartPulse, description: 'Aprovar pedidos de ativação', group: 'main' },
  { key: 'challenges', label: 'Desafios', icon: Target, description: 'Criar desafios semanais e mensais', group: 'main' },
  { key: 'announcements', label: 'Anúncios', icon: Megaphone, description: 'Comunicados da plataforma', group: 'system' },
  { key: 'reports', label: 'Relatórios', icon: BarChart3, description: 'Analytics e relatórios', group: 'system' },
  { key: 'audit', label: 'Logs de Auditoria', icon: ScrollText, description: 'Histórico de ações dos admins', group: 'system' },
  { key: 'permissions', label: 'Permissões', icon: Lock, description: 'Matriz de permissões por papel', group: 'system' },
  { key: 'achievements', label: 'Conquistas', icon: Trophy, description: 'Gerenciar conquistas e prêmios', group: 'system' },
  { key: 'career-plans', label: 'Plano de Carreira', icon: Crown, description: 'Níveis e bônus de carreira', group: 'system' },
  { key: 'driver-categories', label: 'Categorias de Motorista', icon: Car, description: 'Categorias de veículo (Safira→Imperial) + meta mensal + bônus + cancelamento', group: 'system' },
  { key: 'streak-rewards', label: 'Recompensas de Sequência', icon: Flame, description: 'Prêmios por dias consecutivos', group: 'system' },
  { key: 'events', label: 'Eventos', icon: Calendar, description: 'Eventos, webinars e promoções', group: 'system' },
  { key: 'faq', label: 'Perguntas Frequentes', icon: HelpCircle, description: 'FAQ da plataforma', group: 'system' },
  { key: 'cashback-config', label: 'Config Cashback', icon: Percent, description: 'Configurar porcentagens e pontos', group: 'system' },
  { key: 'content-texts', label: 'Conteúdo e Textos', icon: Type, description: 'Editar todos os textos e rótulos do sistema', group: 'system' },
  { key: 'system-settings', label: 'Configurações do Sistema', icon: Settings, description: 'Editar valores, porcentagens, matrizes, planos, saques e demais configurações', group: 'system' },
  { key: 'asaas', label: 'Asaas', icon: Landmark, description: 'Configuração do gateway de pagamentos', group: 'system' },
  { key: 'settings', label: 'Configurações', icon: Settings, description: 'Configurações do sistema', group: 'system' },
]

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const {
    user,
    adminActivePage,
    setAdminActivePage,
    adminSidebarCollapsed,
    setAdminSidebarCollapsed,
    adminMobileSidebarOpen,
    setAdminMobileSidebarOpen,
    setAdminViewAsUser,
    logout,
    darkMode,
    toggleDarkMode,
  } = useStore()

  // Permissions enforcement — super admins always see everything; sub-admin
  // roles are filtered by the per-role allow-list stored in the database.
  const { canAccess } = useAdminPermissions(user)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleItemClick = (key: AdminPageKey) => {
    setAdminActivePage(key)
    setAdminMobileSidebarOpen(false)
  }

  const handleSwitchToUser = () => {
    setAdminViewAsUser(true)
    toast.success('Modo usuário ativado. Use "Voltar para Admin" para retornar.')
  }

  const handleLogout = () => {
    if (!showLogoutConfirm) {
      setShowLogoutConfirm(true)
      setTimeout(() => setShowLogoutConfirm(false), 3000)
      return
    }
    logout()
  }

  const groupedItems: { group: 'main' | 'system'; label: string; items: AdminNavItem[] }[] = [
    { group: 'main', label: 'Gerenciamento', items: adminNavItems.filter(i => i.group === 'main' && canAccess(i.key)) },
    { group: 'system', label: 'Sistema', items: adminNavItems.filter(i => i.group === 'system' && canAccess(i.key)) },
  ]

  const sidebarContent = (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full bg-gray-900 text-gray-300">
        {/* Logo / Branding */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shrink-0 shadow-lg shadow-emerald-500/30">
            <Shield className="h-5 w-5" />
          </div>
          {!adminSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-white font-bold text-base truncate">NewMobility</span>
              <span className="text-emerald-400 text-xs truncate font-semibold">Admin Panel</span>
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex ml-auto text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8"
            onClick={() => setAdminSidebarCollapsed(!adminSidebarCollapsed)}
            aria-label="Recolher sidebar"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', adminSidebarCollapsed && 'rotate-180')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8"
            onClick={() => setAdminMobileSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User info */}
        {!adminSidebarCollapsed && user && (
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/60">
              <div className="relative">
                <Avatar className="h-9 w-9 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
                  <AvatarFallback className="bg-emerald-700 text-white text-sm">
                    {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-gray-900 animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-medium truncate">{user.name}</span>
                <span className="text-emerald-400 text-xs truncate">{user.email}</span>
              </div>
            </div>
          </div>
        )}

        {adminSidebarCollapsed && user && (
          <div className="px-2 py-3 border-b border-gray-800 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-9 w-9 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
                    <AvatarFallback className="bg-emerald-700 text-white text-sm">
                      {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-gray-900" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <p className="font-medium">{user.name}</p>
                <p className="text-muted-foreground">{user.email}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto admin-sidebar-scrollbar px-2 py-3">
          <div className="space-y-1">
            {groupedItems.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && !adminSidebarCollapsed && (
                  <div className="mx-3 my-3 relative h-px">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                  </div>
                )}
                {!adminSidebarCollapsed && (
                  <div className="px-3 pt-2 pb-1 first:pt-0">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                      {group.label}
                    </span>
                  </div>
                )}
                {adminSidebarCollapsed && gi > 0 && (
                  <div className="mx-3 my-3 relative h-px">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = adminActivePage === item.key

                  const menuItem = (
                    <motion.button
                      key={item.key}
                      onClick={() => handleItemClick(item.key)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group/item',
                        isActive
                          ? 'text-white shadow-lg overflow-hidden'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/60',
                      )}
                      whileHover={{ x: adminSidebarCollapsed ? 0 : 2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="adminActiveBg"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg"
                          layout
                          transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                        />
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="adminActiveIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-300 rounded-r-full z-10"
                          layout
                          transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                        />
                      )}
                      <Icon className={cn(
                        'h-4.5 w-4.5 shrink-0 transition-colors relative z-10',
                        isActive ? 'text-white' : 'text-emerald-400 group-hover/item:text-emerald-300',
                      )} />
                      {!adminSidebarCollapsed && (
                        <span className="truncate relative z-10">{item.label}</span>
                      )}
                      {!adminSidebarCollapsed && isActive && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300 relative z-10 animate-pulse" />
                      )}
                    </motion.button>
                  )

                  if (adminSidebarCollapsed) {
                    return (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>
                          {menuItem}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground text-[10px]">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return menuItem
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* Switch to user view */}
        <div className="px-2 pt-2 border-t border-gray-800">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSwitchToUser}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative overflow-hidden group/switch text-gray-300 hover:text-white hover:bg-gray-800/60"
              >
                <div className="absolute inset-0 rounded-lg bg-gray-800/0 group-hover/switch:bg-gray-800/60 transition-colors" />
                <ArrowLeftRight className="h-4.5 w-4.5 shrink-0 relative z-10 text-amber-400 group-hover/switch:text-amber-300" />
                {!adminSidebarCollapsed && (
                  <span className="relative z-10">Voltar para Usuário</span>
                )}
              </button>
            </TooltipTrigger>
            {adminSidebarCollapsed && (
              <TooltipContent side="right" className="text-xs">
                Voltar para Usuário
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Logout */}
        <div className="px-2 pb-3 pt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative overflow-hidden group/logout"
                style={{ color: showLogoutConfirm ? '#f87171' : undefined }}
                onMouseLeave={() => setShowLogoutConfirm(false)}
              >
                <div className={cn(
                  'absolute inset-0 rounded-lg transition-colors',
                  showLogoutConfirm ? 'bg-red-500/15' : 'group-hover/logout:bg-red-500/10',
                )} />
                <LogOut className={cn(
                  'h-4.5 w-4.5 shrink-0 relative z-10 transition-colors',
                  showLogoutConfirm ? 'text-red-400' : 'text-red-400/70 group-hover/logout:text-red-400',
                )} />
                {!adminSidebarCollapsed && (
                  <span className="relative z-10 transition-colors text-red-400/70 group-hover/logout:text-red-400">
                    {showLogoutConfirm ? 'Confirmar saída?' : 'Sair'}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {!showLogoutConfirm && !adminSidebarCollapsed && (
              <TooltipContent side="right" className="text-xs">
                Clique duas vezes para sair
              </TooltipContent>
            )}
          </Tooltip>
          {!adminSidebarCollapsed && (
            <p className="text-[10px] text-gray-600 text-center mt-2">Admin Panel v1.0.0</p>
          )}
        </div>
      </div>
    </TooltipProvider>
  )

  const activeItem = adminNavItems.find(i => i.key === adminActivePage)
  const pageTitle = activeItem?.label || 'Dashboard'

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-30 border-r border-gray-800',
            adminSidebarCollapsed ? 'w-[68px]' : 'w-64',
          )}
        >
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-emerald-500/40" />
          {sidebarContent}
        </aside>
        <div className={cn('hidden lg:block shrink-0', adminSidebarCollapsed ? 'w-[68px]' : 'w-64')} />

        {/* Mobile Overlay */}
        <AnimatePresence>
          {adminMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
              onClick={() => setAdminMobileSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {adminMobileSidebarOpen && (
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-72 z-50 lg:hidden"
            >
              <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-emerald-500/40" />
              {sidebarContent}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-gray-900 border-b border-gray-800 shrink-0">
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />
            <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-800 shrink-0"
                    onClick={() => setAdminMobileSidebarOpen(true)}
                    aria-label="Abrir menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </motion.div>

                <div className="flex items-center gap-2 lg:hidden min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/20 shrink-0">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <span className="font-bold text-white text-xs sm:text-sm sm:text-base truncate">NewMobility Admin</span>
                </div>

                <div className="hidden lg:flex items-center gap-2 min-w-0">
                  <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-semibold text-white truncate">{pageTitle}</span>
                  <ChevronLeft className="h-3 w-3 text-gray-500 rotate-180 shrink-0" />
                  <span className="text-xs text-gray-400 truncate">
                    {activeItem?.description}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 sm:gap-2 shrink-0">
                <Badge className="hidden md:inline-flex bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] gap-1 uppercase tracking-wider font-bold">
                  <Shield className="h-3 w-3" />
                  Painel Administrativo
                </Badge>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:text-white hover:bg-gray-800 relative shrink-0"
                  aria-label="Notificações"
                >
                  <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:text-white hover:bg-gray-800 shrink-0"
                  onClick={toggleDarkMode}
                  aria-label="Alternar tema"
                >
                  <motion.div
                    key={darkMode ? 'dark' : 'light'}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {darkMode ? <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5" /> : <Moon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
                  </motion.div>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex gap-1.5 text-xs h-8 bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:text-white shrink-0"
                  onClick={handleSwitchToUser}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Voltar para Usuário</span>
                  <span className="md:hidden">Usuário</span>
                </Button>

                {user && (
                  <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-800 shrink-0">
                    <Avatar className="h-8 w-8 border-2 border-emerald-500 shrink-0">
                      <AvatarFallback className="bg-emerald-700 text-white text-xs">
                        {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col min-w-0">
                      <span className="text-xs font-medium text-white max-w-[120px] truncate">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-emerald-400 max-w-[120px] truncate">
                        Administrador
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto admin-content-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={adminActivePage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="p-3 sm:p-4 md:p-6 pb-36 md:pb-6"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="bg-gray-900 border-t border-gray-800 px-4 py-3 shrink-0 hidden md:block">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-gray-500 text-center">
                © {new Date().getFullYear()} NewMobility Admin Panel · Todos os direitos reservados
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Sistema operacional
                </span>
                <span className="text-xs text-gray-600">v1.0.0</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile bottom bar with quick switch */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-gray-900 border-t border-gray-800 safe-area-inset-bottom">
        <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
          {[
            { key: 'dashboard' as AdminPageKey, icon: LayoutDashboard, label: 'Início' },
            { key: 'users' as AdminPageKey, icon: Users, label: 'Usuários' },
            { key: 'financial' as AdminPageKey, icon: Wallet, label: 'Financeiro' },
            { key: 'settings' as AdminPageKey, icon: Settings, label: 'Config' },
          ].filter((item) => canAccess(item.key)).map((item) => {
            const Icon = item.icon
            const isActive = adminActivePage === item.key
            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item.key)}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all duration-200',
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50',
                )}
              >
                <Icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110')} />
                <span className={cn('text-[9px] font-medium leading-none', isActive && 'font-bold')}>{item.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
