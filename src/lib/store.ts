'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PageKey =
  | 'dashboard'
  | 'apps'
  | 'bank'
  | 'profile'
  | 'myplan'
  | 'purchases'
  | 'portal-lojista'
  | 'portal-gamer'
  | 'portal-sportbet'
  | 'gratifications'
  | 'points'
  | 'career'
  | 'referrals'
  | 'cashback'
  | 'financial'
  | 'voucher'
  | 'support'
  | 'admin'
  | 'reports'
  | 'gamification'
  | 'simulator'
  | 'events'
  | 'leaderboard'
  | 'marketplace'
  | 'services'
  | 'minha-rede'
  | 'billing'
  | 'kyc'
  | 'talkmobi'
  | 'telemedicina'

export type AuthView = 'login' | 'register'

export type AdminPageKey =
  | 'dashboard'
  | 'users'
  | 'user-types'
  | 'financial'
  | 'plans'
  | 'gratifications'
  | 'support'
  | 'announcements'
  | 'reports'
  | 'settings'
  | 'vouchers'
  | 'bets'
  | 'matrices'
  | 'cashback-config'
  | 'achievements'
  | 'career-plans'
  | 'driver-categories'
  | 'streak-rewards'
  | 'events'
  | 'faq'
  | 'withdrawals-asaas'
  | 'asaas'
  | 'kyc'
  | 'audit'
  | 'permissions'
  | 'challenges'
  | 'talkmobi'
  | 'talkmobi-subscriptions'
  | 'telemedicina'
  | 'service-types'
  | 'content-texts'
  | 'system-settings'

export interface UserData {
  id: string
  name: string
  email: string
  phone: string
  cpf: string
  plan: string
  referralCode: string
  referredById: string | null
  language: string
  isActive: boolean
  role?: string
  balanceWithdrawal: number
  balanceMobility: number
  balanceShopping: number
  balanceFood: number
  balancePharmacy: number
  balanceGratification: number
  balancePaymentInvoice: number
  balanceFree: number
  balancePending: number
  careerPoints: number
  personalPoints: number
  stars: number
  isDriver: boolean
  isDelivery?: boolean
  // ADM-USERTYPE — qualification code (matches UserType.code in the DB).
  // Set when the admin picks a UserType in the Create User dialog or when
  // the user self-registers with a qualification.
  qualification?: string | null
  userType?: 'usuario' | 'lojista' | 'motorista' | string
  profileImage: string | null
  createdAt: string
  // Bank / PIX
  pixKey?: string | null
  pixEnabled?: boolean
  bankCode?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
  bankType?: string | null
  // Subscription
  subscriptionStatus?: 'active' | 'pending' | 'overdue' | 'none'
  subscriptionDueDate?: string | null
  // Auto-debit opt-in for monthly fee (Task 13-B §4)
  autoDebitEnabled?: boolean
}

export interface Notification {
  id: string
  type: 'cashback' | 'referral' | 'career' | 'voucher' | 'system' | 'gratification'
  title: string
  description: string
  time: string
  read: boolean
  icon?: string
}

interface AppState {
  // Auth
  isAuthenticated: boolean
  authView: AuthView
  user: UserData | null

  // Navigation
  activePage: PageKey
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean

  // Admin navigation
  adminActivePage: AdminPageKey
  adminViewAsUser: boolean
  adminSidebarCollapsed: boolean
  adminMobileSidebarOpen: boolean

  // Theme
  darkMode: boolean

  // Notifications
  notifications: Notification[]

  // Impersonation (admin "Login as user" feature — Task 18-C)
  // isImpersonating is true while an admin is browsing as another user.
  // originalAdminId holds the admin's real user id so we can swap back.
  // These are NEVER persisted (see partialize below) — on a page refresh
  // we restore them from sessionStorage via the AppLayout mount effect.
  isImpersonating: boolean
  originalAdminId: string | null

  // Actions
  login: (user: UserData) => void
  logout: () => void
  setAuthView: (view: AuthView) => void
  setActivePage: (page: PageKey) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  setAdminActivePage: (page: AdminPageKey) => void
  setAdminViewAsUser: (viewAsUser: boolean) => void
  setAdminSidebarCollapsed: (collapsed: boolean) => void
  setAdminMobileSidebarOpen: (open: boolean) => void
  updateUser: (data: Partial<UserData>) => void
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  unreadCount: () => number
  setImpersonating: (isImpersonating: boolean, originalAdminId: string | null) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      authView: 'login',
      user: null,

      // Navigation
      activePage: 'dashboard',
      sidebarCollapsed: false,
      mobileSidebarOpen: false,

      // Admin navigation
      adminActivePage: 'dashboard',
      adminViewAsUser: false,
      adminSidebarCollapsed: false,
      adminMobileSidebarOpen: false,

      // Theme
      darkMode: false,

      // Notifications - start empty, will be loaded from API per user
      notifications: [],

      // Impersonation defaults — Task 18-C. Always starts false/null.
      // Restored from sessionStorage on mount in AppLayout (see app-layout.tsx).
      isImpersonating: false,
      originalAdminId: null,

      // Actions
      login: (user) => {
        // Clear ALL localStorage to prevent data leakage from previous sessions
        if (typeof window !== 'undefined') {
          const darkMode = localStorage.getItem('newmobility-auth')
            ? JSON.parse(localStorage.getItem('newmobility-auth') || '{}').state?.darkMode
            : false
          localStorage.removeItem('newmobility-auth')
          // Re-init with clean state
          if (darkMode !== undefined) {
            // preserve dark mode preference
            set({ darkMode })
          }
        }
        set({
          isAuthenticated: true,
          user,
          activePage: 'dashboard',
          mobileSidebarOpen: false,
          // Admin always starts in admin view (not view-as-user)
          adminViewAsUser: false,
          adminActivePage: 'dashboard',
          adminMobileSidebarOpen: false,
          notifications: [],
        })
      },

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          activePage: 'dashboard',
          authView: 'login',
          mobileSidebarOpen: false,
          adminViewAsUser: false,
          adminActivePage: 'dashboard',
          adminMobileSidebarOpen: false,
          notifications: [],
        }),

      setAuthView: (authView) => set({ authView }),

      setActivePage: (activePage) =>
        set({ activePage, mobileSidebarOpen: false }),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),

      setAdminActivePage: (adminActivePage) =>
        set({ adminActivePage, adminMobileSidebarOpen: false }),

      setAdminViewAsUser: (adminViewAsUser) =>
        set({ adminViewAsUser, adminMobileSidebarOpen: false, mobileSidebarOpen: false }),

      setAdminSidebarCollapsed: (adminSidebarCollapsed) => set({ adminSidebarCollapsed }),

      setAdminMobileSidebarOpen: (adminMobileSidebarOpen) => set({ adminMobileSidebarOpen }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      toggleDarkMode: () =>
        set((state) => {
          const newDarkMode = !state.darkMode
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', newDarkMode)
          }
          return { darkMode: newDarkMode }
        }),

      setDarkMode: (dark) =>
        set(() => {
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', dark)
          }
          return { darkMode: dark }
        }),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
        })),

      unreadCount: () => {
        return get().notifications.filter(n => !n.read).length
      },

      setImpersonating: (isImpersonating, originalAdminId) =>
        set({ isImpersonating, originalAdminId }),
    }),
    {
      name: 'newmobility-auth',
      // Only persist auth essentials - NEVER persist notifications or other
      // user-specific data that could leak between sessions
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated && !!state.user?.id,
        user: state.user,
        activePage: state.activePage,
        darkMode: state.darkMode,
        // Persist admin navigation so refresh keeps admin in current section
        adminActivePage: state.adminActivePage,
        adminViewAsUser: state.adminViewAsUser,
      }),
      // When rehydrating, validate the stored user ID matches to prevent stale data
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Always reset notifications on rehydration to prevent cross-user leakage
          state.notifications = []
          // Impersonation flags are never persisted — always reset on rehydrate.
          // The AppLayout mount effect re-applies them from sessionStorage if the
          // admin was mid-impersonation when the page refreshed.
          state.isImpersonating = false
          state.originalAdminId = null
        }
      },
    }
  )
)

// Empty default user for reference (all zeros - new user state)
export const emptyUser: UserData = {
  id: '',
  name: '',
  email: '',
  phone: '',
  cpf: '',
  plan: 'free',
  referralCode: '',
  referredById: null,
  language: 'pt',
  isActive: false,
  role: 'user',
  balanceWithdrawal: 0,
  balanceMobility: 0,
  balanceShopping: 0,
  balanceFood: 0,
  balancePharmacy: 0,
  balanceGratification: 0,
  balancePaymentInvoice: 0,
  balanceFree: 0,
  balancePending: 0,
  careerPoints: 0,
  personalPoints: 0,
  stars: 0,
  isDriver: false,
  userType: 'usuario',
  profileImage: null,
  createdAt: '',
}
