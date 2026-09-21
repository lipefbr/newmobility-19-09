'use client'

import { useStore, type PageKey } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { LayoutDashboard, DollarSign, Wallet, Users, User } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems: { page: PageKey; icon: React.ElementType; labelKey: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'mobileNav.dashboard' },
  { page: 'cashback', icon: DollarSign, labelKey: 'mobileNav.cashback' },
  { page: 'financial', icon: Wallet, labelKey: 'mobileNav.financial' },
  { page: 'referrals', icon: Users, labelKey: 'mobileNav.referrals' },
  { page: 'profile', icon: User, labelKey: 'mobileNav.profile' },
]

export function MobileNav() {
  const { activePage, setActivePage } = useStore()
  const { t } = useTranslation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = activePage === item.page
          const Icon = item.icon

          return (
            <button
              key={item.page}
              onClick={() => setActivePage(item.page)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active"
                  layout
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full"
                  transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                />
              )}
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  color: isActive ? '#059669' : undefined,
                }}
                transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                className={isActive ? 'text-emerald-600' : 'text-muted-foreground'}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <span className={`text-[10px] font-medium leading-tight ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              }`}>
                {t(item.labelKey)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
