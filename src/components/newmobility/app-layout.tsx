'use client'

import { Menu, Globe, ChevronRight, Home, Moon, Sun, Search, Users, Wallet, DollarSign, TrendingUp, UserCircle, Shield } from 'lucide-react'
import { useStore, type PageKey } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { languageNames, type Language } from '@/lib/i18n'
import { Sidebar } from './sidebar'
import { NotificationPanel } from './notifications/notification-panel'
import { WelcomeModal } from './onboarding/welcome-modal'
import { SubscriptionBlocker } from './onboarding/subscription-blocker'
import { BackToTopButton, LastUpdated } from './ui/global-enhancements'
import { ImpersonationBanner } from './admin/impersonation-banner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const languages: { code: Language; label: string; name: string }[] = [
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'it', label: 'IT', name: 'Italiano' },
]

const sidebarLabelKeys: Record<PageKey, string> = {
  'dashboard': 'sidebar.dashboard',
  'apps': 'sidebar.apps',
  'bank': 'sidebar.bank',
  'profile': 'sidebar.profile',
  'myplan': 'sidebar.myplan',
  'purchases': 'sidebar.purchases',
  'marketplace': 'sidebar.marketplace',
  'services': 'sidebar.services',
  'portal-lojista': 'sidebar.portal-lojista',
  'portal-gamer': 'sidebar.portal-gamer',
  'portal-sportbet': 'sidebar.portal-sportbet',
  'gratifications': 'sidebar.gratifications',
  'points': 'sidebar.points',
  'career': 'sidebar.career',
  'referrals': 'sidebar.referrals',
  'minha-rede': 'sidebar.minha-rede',
  'cashback': 'sidebar.cashback',
  'financial': 'sidebar.financial',
  'voucher': 'sidebar.voucher',
  'simulator': 'sidebar.simulator',
  'leaderboard': 'sidebar.leaderboard',
  'gamification': 'sidebar.gamification',
  'events': 'sidebar.events',
  'reports': 'sidebar.reports',
  'support': 'sidebar.support',
  'admin': 'sidebar.admin',
  'billing': 'sidebar.billing',
  'kyc': 'sidebar.kyc',
  'talkmobi': 'sidebar.talkmobi',
  'telemedicina': 'sidebar.telemedicina',
}

// Mobile bottom navigation items
const mobileNavItems: { key: PageKey; icon: React.ElementType; label: string }[] = [
  { key: 'dashboard', icon: Home, label: 'Início' },
  { key: 'cashback', icon: DollarSign, label: 'CashBack' },
  { key: 'financial', icon: Wallet, label: 'Financeiro' },
  { key: 'referrals', icon: Users, label: 'Rede' },
  { key: 'profile', icon: UserCircle, label: 'Perfil' },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, setMobileSidebarOpen, updateUser, activePage, darkMode, toggleDarkMode, setActivePage, setAdminViewAsUser } = useStore()
  const { t } = useTranslation()
  // searchOpen state removed — header search lupa was removed per user request

  const isAdmin = user?.role === 'admin'

  // Task 18-C: Restore impersonation flag on mount (page-refresh case).
  // The `isImpersonating`/`originalAdminId` store fields are intentionally
  // NOT persisted to localStorage (see partialize in store.ts), so a page
  // refresh resets them. The handleLoginAs handler writes the admin id to
  // sessionStorage as a backup — if we see it on mount, we know the admin
  // was mid-impersonation and we re-apply the flag so the
  // ImpersonationBanner continues to render.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedAdminId = sessionStorage.getItem('newmobility_admin_impersonating')
    if (storedAdminId) {
      useStore.getState().setImpersonating(true, storedAdminId)
    }
  }, [])

  const handleBackToAdmin = () => {
    setAdminViewAsUser(false)
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <WelcomeModal />
      {/* Impersonation banner — sticky at the very top, above the navbar.
          Renders null when isImpersonating is false. */}
      <ImpersonationBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shrink-0">
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-gradient-shift" />
            <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-9 w-9 sm:h-11 sm:w-11 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => setMobileSidebarOpen(true)}
                    aria-label="Abrir menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </motion.div>

                <div className="flex items-center gap-2 lg:hidden">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20">
                    NM
                  </div>
                  <span className="font-bold text-foreground">NewMobility</span>
                </div>

                <div className="hidden lg:flex items-center gap-1.5 text-sm min-w-0">
                  <Home className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <span className="text-muted-foreground truncate">{t('header.backoffice')}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <span className="font-medium text-foreground truncate">{t(sidebarLabelKeys[activePage]) || 'Dashboard'}</span>
                </div>

                {/* Search lupa removed per user request — sidebar search is sufficient */}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Admin "Back to Admin" button - shown when admin is in view-as-user mode */}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shrink-0"
                    onClick={handleBackToAdmin}
                    title="Voltar para o painel administrativo"
                  >
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden md:inline">Voltar para Admin</span>
                    <span className="md:hidden">Admin</span>
                  </Button>
                )}

                <NotificationPanel />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground relative shrink-0"
                  onClick={toggleDarkMode}
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 shrink-0 hidden xs:inline-flex sm:inline-flex">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="uppercase font-semibold">{user?.language || 'pt'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {languages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => updateUser({ language: lang.code })}
                        className="gap-2"
                      >
                        <span className="font-semibold text-xs uppercase w-6">{lang.label}</span>
                        <span>{lang.name}</span>
                        {user?.language === lang.code && (
                          <span className="ml-auto text-emerald-600 text-xs">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {user && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Avatar className="h-8 w-8 border-2 border-emerald-200 dark:border-emerald-800 shrink-0">
                      <AvatarFallback className="bg-emerald-600 text-white text-xs">
                        {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium text-foreground max-w-[140px] truncate">
                      {user.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content with page transition */}
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="p-3 sm:p-4 md:p-6 pb-36 md:pb-6"
              >
                {/* Subscription blocker banner (shown for free users) */}
                <SubscriptionBlocker />
                {children}
              </motion.div>
            </AnimatePresence>

            {/* Last Updated timestamp */}
            <div className="px-4 md:px-6 pb-24 md:pb-2">
              <LastUpdated />
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-card border-t border-border px-4 py-3 shrink-0 hidden md:block">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground text-center">
                {t('footer.copyright').replace('2025', String(new Date().getFullYear()))}
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-xs text-muted-foreground/70 hover:text-emerald-600 transition-colors">{t('footer.terms')}</a>
                <a href="#" className="text-xs text-muted-foreground/70 hover:text-emerald-600 transition-colors">{t('footer.privacy')}</a>
                <span className="text-xs text-muted-foreground/50">v1.0.0</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
        <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActivePage(item.key)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''}`}>
                  <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                </div>
                <span className={`text-[9px] font-medium leading-none transition-all duration-200 ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Back to Top */}
      <BackToTopButton />
    </div>
  )
}
