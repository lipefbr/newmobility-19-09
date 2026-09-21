'use client'

// API service for NewMobility frontend
const API_BASE = '/api'
const DEFAULT_TIMEOUT_MS = 10_000

export class ApiError extends Error {
  status: number
  
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class ApiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`A requisição expirou após ${Math.round(timeoutMs / 1000)}s. Tente novamente.`)
    this.name = 'ApiTimeoutError'
  }
}

export class ApiNetworkError extends Error {
  constructor() {
    super('Erro de conexão. Verifique sua internet e tente novamente.')
    this.name = 'ApiNetworkError'
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {}
  const url = `${API_BASE}${endpoint}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers,
      },
      ...fetchOptions,
      signal: controller.signal,
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new ApiError(
        errorData.error || `Erro ${res.status}`,
        res.status
      )
    }

    return res.json()
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiTimeoutError(timeoutMs)
    }
    if (err instanceof TypeError) {
      // fetch() throws TypeError on network failures (no server response at all)
      throw new ApiNetworkError()
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  register: (data: {
    name: string
    email: string
    phone: string
    cpf: string
    password: string
    referralCode?: string
    plan: string
    qualification: string
    sponsorId?: string
    birthDate?: string
    rg?: string
    maritalStatus?: string
    gender?: string
    education?: string
    zipCode?: string
    emergencyName?: string
    emergencyPhone?: string
    emergencyRelation?: string
  }) =>
    apiFetch<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string) =>
    apiFetch<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    apiFetch<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),
}

// Dashboard
export const dashboardApi = {
  getData: (userId: string) =>
    apiFetch<any>(`/dashboard?userId=${userId}`),
}

// Cashback
export const cashbackApi = {
  getEntrada: (userId: string) =>
    apiFetch<any>(`/cashback/entrada?userId=${userId}`),
  getResidual: (userId: string) =>
    apiFetch<any>(`/cashback/residual?userId=${userId}`),
  getVendas: (userId: string) =>
    apiFetch<any>(`/cashback/vendas?userId=${userId}`),
}

// Referrals
export const referralsApi = {
  getList: (userId: string) =>
    apiFetch<any>(`/referrals?userId=${userId}`, { timeoutMs: 30000 }),
  getTree: (userId: string, depth = 5) =>
    apiFetch<any>(`/referrals/tree?userId=${userId}&depth=${depth}`, { timeoutMs: 30000 }),
}

// Financial
export const financialApi = {
  getBalances: (userId: string) =>
    apiFetch<any>(`/financial/balances?userId=${userId}`),
  getTransactions: (userId: string, page = 1, limit = 20, type = 'all') =>
    apiFetch<any>(`/financial/transactions?userId=${userId}&page=${page}&limit=${limit}&type=${type}`),
  getWithdrawals: (userId: string) =>
    apiFetch<any>(`/financial/withdrawals?userId=${userId}`),
  withdraw: (userId: string, amount: number, category: string) =>
    apiFetch<any>('/financial/withdraw', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, category }),
    }),
  getExportUrl: (userId: string, format = 'csv', startDate?: string, endDate?: string, type = 'all') => {
    const params = new URLSearchParams({ userId, format, type })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    return `/api/financial/export?${params.toString()}`
  },
  getWithdrawals: (userId: string) =>
    apiFetch<any>(`/financial/withdrawals?userId=${userId}`),
}

// Career
export const careerApi = {
  getData: (userId: string) =>
    apiFetch<any>(`/career?userId=${userId}`),
}

// Gratifications
export const gratificationsApi = {
  getList: (userId: string) =>
    apiFetch<any>(`/gratifications?userId=${userId}`),
  claim: (userId: string, gratificationId: string, claimType: 'balance' | 'prize' = 'balance') =>
    apiFetch<any>('/gratifications/claim', {
      method: 'POST',
      body: JSON.stringify({ userId, gratificationId, claimType }),
    }),
}

// Points
export const pointsApi = {
  getData: (userId: string) =>
    apiFetch<any>(`/points?userId=${userId}`),
}

// Support
export const supportApi = {
  getTickets: (userId: string) =>
    apiFetch<any>(`/support/tickets?userId=${userId}`),
  getTicket: (ticketId: string, userId: string) =>
    apiFetch<any>(`/support/tickets/${ticketId}?userId=${userId}`),
  createTicket: (userId: string, subject: string, category: string, message: string) =>
    apiFetch<any>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ userId, subject, category, message }),
    }),
  replyTicket: (ticketId: string, userId: string, message: string) =>
    apiFetch<any>(`/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ userId, message }),
    }),
}

// Vouchers
export const vouchersApi = {
  getList: (userId: string) =>
    apiFetch<any>(`/vouchers?userId=${userId}`),
  redeem: (userId: string, code: string) =>
    apiFetch<any>('/vouchers/redeem', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    }),
  // Task 14-E: redeem an already-owned voucher by its database ID. Credits
  // the voucher amount to balanceShopping (non-withdrawable per spec §7).
  redeemById: (userId: string, voucherId: string) =>
    apiFetch<any>(`/vouchers/${voucherId}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
}

// Invoices
export const invoicesApi = {
  getList: (userId: string) =>
    apiFetch<any>(`/invoices?userId=${userId}`),
}

// Plans
export const plansApi = {
  getList: () =>
    apiFetch<any>('/plans'),
  upgrade: (userId: string, plan: string, paymentMethod: string = 'pix') =>
    apiFetch<any>('/plans/upgrade', {
      method: 'POST',
      body: JSON.stringify({ userId, plan, paymentMethod }),
    }),
  calculateUpgrade: (userId: string, targetPlan: string) =>
    apiFetch<any>('/plans/calculate-upgrade', {
      method: 'POST',
      body: JSON.stringify({ userId, targetPlan }),
    }),
  confirmPixPayment: (userId: string, invoiceId: string) =>
    apiFetch<any>('/plans/confirm-pix', {
      method: 'POST',
      body: JSON.stringify({ userId, invoiceId }),
    }),
}

// User
export const userApi = {
  getProfile: (userId: string) =>
    apiFetch<any>(`/user/profile?userId=${userId}`),
  updateProfile: (userId: string, data: any) =>
    apiFetch<any>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ userId, ...data }),
    }),
  changePassword: (userId: string, currentPassword: string, newPassword: string) =>
    apiFetch<any>('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    }),
  updateLanguage: (userId: string, language: string) =>
    apiFetch<any>('/user/language', {
      method: 'PUT',
      body: JSON.stringify({ userId, language }),
    }),
  setup2FA: (userId: string) =>
    apiFetch<any>('/user/2fa/setup', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  verify2FA: (userId: string, code: string) =>
    apiFetch<any>('/user/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    }),
  disable2FA: (userId: string, password: string) =>
    apiFetch<any>('/user/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    }),
  verifyEmail: (userId: string) =>
    apiFetch<any>('/user/verify-email', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  verifyPhone: (userId: string) =>
    apiFetch<any>('/user/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
}

// Admin
export const adminApi = {
  getStats: (userId: string) =>
    apiFetch<any>(`/admin/stats?userId=${userId}`),
  getUsers: (userId: string, params?: { search?: string; plan?: string; status?: string; page?: number; includeMatrix?: boolean; includeBets?: boolean }) => {
    const p = new URLSearchParams({ userId })
    if (params?.search) p.set('search', params.search)
    if (params?.plan) p.set('plan', params.plan)
    if (params?.status) p.set('status', params.status)
    if (params?.page) p.set('page', String(params.page))
    if (params?.includeMatrix) p.set('includeMatrix', 'true')
    if (params?.includeBets) p.set('includeBets', 'true')
    return apiFetch<any>(`/admin/users?${p}`)
  },
  getConfig: (userId: string) =>
    apiFetch<any>(`/admin/config?userId=${userId}`),
  updateConfig: (userId: string, configs: Record<string, string>) =>
    apiFetch<any>('/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ userId, configs }),
    }),

  // Vouchers
  getVouchers: (userId: string, page = 1, limit = 20) =>
    apiFetch<any>(`/admin/vouchers?userId=${userId}&page=${page}&limit=${limit}`),
  createVoucher: (userId: string, data: { targetUserId?: string; code?: string; type: string; amount: number; description?: string; expiresAt?: string }) =>
    apiFetch<any>('/admin/vouchers', { method: 'POST', body: JSON.stringify({ userId, ...data }) }),
  deleteVoucher: (userId: string, voucherId: string) =>
    apiFetch<any>(`/admin/vouchers/${voucherId}?userId=${userId}`, { method: 'DELETE' }),
  updateVoucher: (userId: string, voucherId: string, status: string) =>
    apiFetch<any>(`/admin/vouchers/${voucherId}`, { method: 'PUT', body: JSON.stringify({ userId, status }) }),

  // Bets
  getBets: (userId: string, status = 'all', page = 1, limit = 20) =>
    apiFetch<any>(`/admin/bets?userId=${userId}&status=${status}&page=${page}&limit=${limit}`),
  settleBet: (userId: string, betId: string, result: 'won' | 'lost') =>
    apiFetch<any>(`/admin/bets/${betId}`, { method: 'PUT', body: JSON.stringify({ userId, result }) }),
  cancelBet: (userId: string, betId: string, reason?: string) =>
    apiFetch<any>(`/admin/bets/${betId}/cancel`, { method: 'POST', body: JSON.stringify({ userId, reason }) }),

  // Matrix
  getUserMatrix: (userId: string, targetUserId: string, matrixType: 'entrada' | 'residual' | 'vendas') =>
    apiFetch<any>(`/admin/users/${targetUserId}/matrix?userId=${userId}&matrixType=${matrixType}`),

  // Cashback config
  getCashbackConfig: (userId: string) =>
    apiFetch<any>(`/admin/cashback-config?userId=${userId}`),
  updateCashbackConfig: (userId: string, configs: any) =>
    apiFetch<any>('/admin/cashback-config', { method: 'PUT', body: JSON.stringify({ userId, configs }) }),

  // Points config
  getPointsConfig: (userId: string) =>
    apiFetch<any>(`/admin/points-config?userId=${userId}`),
  updatePointsConfig: (userId: string, configs: any) =>
    apiFetch<any>('/admin/points-config', { method: 'PUT', body: JSON.stringify({ userId, configs }) }),

  // Release balance (Liberar saldo)
  releaseBalance: (userId: string, targetUserId: string, wallet: string, amount: number, description: string) =>
    apiFetch<any>(`/admin/users/${targetUserId}/release-balance`, { method: 'POST', body: JSON.stringify({ userId, wallet, amount, description }) }),

  // User tree (referral tree)
  getUserTree: (userId: string, targetUserId: string) =>
    apiFetch<any>(`/admin/users/${targetUserId}/tree?userId=${userId}`),

  // ADM-4 — Create a new user with email + password. The created user can
  // immediately log in via /api/auth/login. Optional `role` ('admin' |
  // 'support' | any custom role) grants admin panel access limited by the
  // Permissões tab matrix.
  createUser: (userId: string, data: {
    name: string
    email: string
    password: string
    phone?: string
    cpf?: string
    plan?: string
    role?: string
    userType?: string
    referredByCode?: string
  }) =>
    apiFetch<any>('/admin/users/create', {
      method: 'POST',
      body: JSON.stringify({ userId, ...data }),
    }),
}

// Notifications
export const notificationApi = {
  getNotifications: (userId: string) =>
    apiFetch<any>(`/notifications?userId=${userId}`),
  markAsRead: (notificationId: string) =>
    apiFetch<any>('/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ notificationId }),
    }),
  markAllAsRead: (userId: string) =>
    apiFetch<any>('/notifications/read-all', {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    }),
}

// Simulator
export const simulatorApi = {
  calculate: (plan: string, directReferrals: number) =>
    apiFetch<any>('/simulator/calculate', {
      method: 'POST',
      body: JSON.stringify({ plan, directReferrals }),
    }),
}

// Gamification
export const gamificationApi = {
  getStreak: (userId: string) =>
    apiFetch<any>(`/gamification/streak?userId=${userId}`),
  getLeaderboard: (period?: string) =>
    apiFetch<any>(`/gamification/leaderboard${period ? `?period=${period}` : ''}`),
  getChallenges: (userId: string) =>
    apiFetch<any>(`/gamification/challenges?userId=${userId}`),
}

// Reports
export const reportsApi = {
  getAnalytics: (userId: string, period?: string) =>
    apiFetch<any>(`/reports/analytics?userId=${userId}${period ? `&period=${period}` : ''}`),
}

// Announcements
export const announcementApi = {
  getActive: (userId?: string) =>
    apiFetch<any>(`/announcements${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
}

// Lote 1, Item 3: export morto `seedApi` REMOVIDO — apontava para a rota
// /api/seed que não existe mais. Nenhum arquivo importava este export.

// Transfer
export const transferApi = {
  transfer: (userId: string, source: string, destination: string, amount: number) =>
    apiFetch<any>('/financial/transfer', {
      method: 'POST',
      body: JSON.stringify({ userId, source, destination, amount }),
    }),
}

// Events
export const eventsApi = {
  getEvents: (userId: string, status?: string, limit?: number) => {
    const params = new URLSearchParams({ userId })
    if (status) params.set('status', status)
    if (limit) params.set('limit', String(limit))
    return apiFetch<any>(`/events?${params}`)
  },
  register: (userId: string, eventId: string) =>
    apiFetch<any>('/events/register', {
      method: 'POST',
      body: JSON.stringify({ userId, eventId }),
    }),
}

// Leaderboard
export const leaderboardApi = {
  getData: (userId: string, type?: string, period?: string) => {
    const params = new URLSearchParams({ userId })
    if (type) params.set('type', type)
    if (period) params.set('period', period)
    return apiFetch<any>(`/leaderboard?${params}`)
  },
}

// Sports & Bets
export const betApi = {
  getOdds: () =>
    apiFetch<any>('/sports/odds'),
  placeBet: (userId: string, eventId: string, eventLabel: string, selection: string, selectionLabel: string, odds: number, amountInCents: number) =>
    apiFetch<any>('/bets', {
      method: 'POST',
      body: JSON.stringify({ userId, eventId, eventLabel, selection, selectionLabel, odds, amountInCents }),
    }),
  getBets: (userId: string, status?: string, limit?: number) => {
    const params = new URLSearchParams({ userId })
    if (status && status !== 'all') params.set('status', status)
    if (limit) params.set('limit', String(limit))
    return apiFetch<any>(`/bets?${params}`)
  },
  settleBet: (betId: string, result: 'won' | 'lost', userId?: string) =>
    apiFetch<any>(`/bets/${betId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ result, userId }),
    }),
}

// Marketplace
export const marketplaceApi = {
  getProducts: (params?: { search?: string; category?: string; page?: number; featured?: boolean }) => {
    const p = new URLSearchParams()
    if (params?.search) p.set('search', params.search)
    if (params?.category && params.category !== 'all') p.set('category', params.category)
    if (params?.page) p.set('page', String(params.page))
    if (params?.featured) p.set('featured', 'true')
    return apiFetch<any>(`/marketplace/products?${p}`)
  },
  getProduct: (productId: string) =>
    apiFetch<any>(`/marketplace/products/${productId}`),
  createProduct: (userId: string, data: any) =>
    apiFetch<any>('/marketplace/products', {
      method: 'POST',
      body: JSON.stringify({ userId, ...data }),
    }),
  updateProduct: (userId: string, productId: string, data: any) =>
    apiFetch<any>(`/marketplace/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...data }),
    }),
  deleteProduct: (userId: string, productId: string) =>
    apiFetch<any>(`/marketplace/products/${productId}?userId=${userId}`, {
      method: 'DELETE',
    }),
  getOrders: (userId: string, status?: string) => {
    const p = new URLSearchParams({ userId })
    if (status) p.set('status', status)
    return apiFetch<any>(`/marketplace/orders?${p}`)
  },
  createOrder: (userId: string, items: any[], shippingAddress?: string, paymentMethod?: string) =>
    apiFetch<any>('/marketplace/orders', {
      method: 'POST',
      body: JSON.stringify({ userId, items, shippingAddress, paymentMethod }),
    }),
}

// Marketplace — reviews (bidirectional, post-purchase) and favorites
export const marketplaceReviewsApi = {
  // Public: list real buyer_to_seller reviews for a product.
  listForProduct: (productId: string) =>
    apiFetch<{ reviews: any[] }>(`/marketplace/reviews?productId=${encodeURIComponent(productId)}`),
  // Seller reputation (avg rating + count + distribution + recent).
  sellerReputation: (userId: string) =>
    apiFetch<any>(`/marketplace/reviews/seller?userId=${encodeURIComponent(userId)}`),
  // Create a review (buyer → seller OR seller → buyer).
  create: (data: {
    orderId: string
    productId: string
    reviewerId: string
    direction: 'buyer_to_seller' | 'seller_to_buyer'
    rating: number
    comment?: string
  }) =>
    apiFetch<any>('/marketplace/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const marketplaceFavoritesApi = {
  list: (userId: string) =>
    apiFetch<{ favorites: any[] }>(`/marketplace/favorites?userId=${encodeURIComponent(userId)}`),
  toggle: (userId: string, productId: string) =>
    apiFetch<{ favorited: boolean; favorite?: any }>(`/marketplace/favorites`, {
      method: 'POST',
      body: JSON.stringify({ userId, productId }),
    }),
}

// TalkMobi plans admin CRUD. The GET endpoint is public (no userId needed),
// but POST/PUT/DELETE require an admin userId in the body/query.
export const talkMobiApi = {
  getPlans: (_userId?: string) =>
    apiFetch<{ plans: any[] }>('/talkmobi/plans'),

  createPlan: (userId: string, plan: Record<string, unknown>) =>
    apiFetch<any>('/talkmobi/plans', {
      method: 'POST',
      body: JSON.stringify({ userId, ...plan }),
    }),

  updatePlan: (userId: string, planId: string, updates: Record<string, unknown>) =>
    apiFetch<any>(`/talkmobi/plans?id=${encodeURIComponent(planId)}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...updates }),
    }),

  deletePlan: (userId: string, planId: string) =>
    apiFetch<any>(`/talkmobi/plans?id=${encodeURIComponent(planId)}&userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),
}
