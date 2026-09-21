'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { useAdminPermissions } from '@/lib/admin-permissions'
import { formatCurrency, categoryLabel, cn } from '@/lib/utils'
import { apiFetch, adminApi } from '@/lib/api'
import {
  Shield, Users, DollarSign, TrendingUp, Activity, Settings, Search,
  ChevronLeft, ChevronRight, ChevronDown, BarChart3, Clock, Mail, Check, X,
  ToggleLeft, ToggleRight, Save, RefreshCw, AlertTriangle, Info, Megaphone,
  Plus, Trash2, Edit, Eye, Wallet, CreditCard, FileText, Ban,
  MapPin, Phone, Star, Car, Bike, Banknote, UserCheck, UserX,
  ArrowUpDown, Receipt, PieChart, Filter, Download, Calendar,
  MessageSquare, Send, Gift, Ticket, Gamepad2, Network, Percent,
  TreePine, Coins, Trophy, AlertCircle, Heart, UsersRound, Layers,
  LogIn, Loader2, UserPlus, KeyRound, Wrench, Target, Type, Database, CheckCheck,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { AdminReportsPanel } from '@/components/newmobility/admin/admin-reports-panel'
import { AdminWithdrawalsPanel } from '@/components/newmobility/admin/admin-withdrawals-panel'
import { AsaasConfigPanel } from '@/components/newmobility/admin/asaas-config-panel'
import AdminKycPanel from '@/components/newmobility/admin/admin-kyc-panel'
import { AdminAuditPanel } from '@/components/newmobility/admin/admin-audit-panel'
import { AdminPermissionsPanel } from '@/components/newmobility/admin/admin-permissions-panel'
import { AdminChallengesPanel } from '@/components/newmobility/admin/admin-challenges-panel'
import { AdminUsersPanel } from '@/components/newmobility/admin/admin-users-panel'
import { AdminUserTypesPanel } from '@/components/newmobility/admin/admin-user-types-panel'
import { TalkMobiManager } from '@/components/newmobility/admin/talkmobi-manager'
import { AdminTelemedicinaPanel } from '@/components/newmobility/admin/admin-telemedicina-panel'
import { AdminTalkMobiSubscriptionsPanel } from '@/components/newmobility/admin/admin-talkmobi-subscriptions-panel'

// ---------- Interfaces ----------

interface AdminStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalTransactions: number
  totalRevenue: number
  totalWithdrawals: number
  totalCashback: number
  planDistribution: { plan: string; count: number }[]
  recentUsers: { id: string; name: string; email: string; plan: string; isActive: boolean; createdAt: string }[]
  growthRate: number
  monthlyRevenue: number
}

interface AdminUser {
  id: string; name: string; email: string; phone: string; cpf: string; plan: string;
  isActive: boolean; referralCode: string; referredById: string;
  balanceWithdrawal: number; balanceMobility: number; balanceShopping: number;
  balanceFood: number; balancePharmacy: number; balanceGratification: number;
  careerPoints: number; personalPoints: number; stars: number;
  city: string; state: string; country: string;
  bankCode: string; bankAgency: string; bankAccount: string; bankType: string;
  pixKey: string; pixEnabled: boolean;
  isDriver: boolean; isDelivery: boolean; role: string;
  qualification?: string | null;
  createdAt: string; _count: { referrals: number }
}

interface ViewUserData extends AdminUser {
  referrer?: { id: string; name: string; email: string } | null
}

interface SystemConfigs {
  cashback_entrada_pct?: string
  cashback_residual_pct?: string
  cashback_vendas_pct?: string
  min_withdrawal?: string
  max_withdrawal?: string
  withdrawal_fee_pct?: string
  [key: string]: string | undefined
}

interface AdminAnnouncement {
  id: string; title: string; message: string; type: string;
  priority: string; isActive: boolean; createdAt: string;
  actionLabel?: string; actionUrl?: string;
}

interface AdminPlan {
  id: string; name: string; price: number; features: string[] | string;
  matrixEntrada: string; matrixResidual: string; matrixVendas: string;
  matrixEntradaId?: string | null; matrixResidualId?: string | null; matrixVendasId?: string | null;
  description?: string; isActive: boolean; isDefault?: boolean; sortOrder?: number; userCount?: number;
}

interface AdminMatrixType {
  id: string; code: string; name: string; matrixKind: string;
  width: number; depth: number; description?: string | null;
  color?: string | null; isActive: boolean;
}

interface AdminWithdrawal {
  id: string; userId: string; userName?: string; userEmail?: string;
  amount: number; status: string; category?: string; createdAt: string;
}

interface WithdrawalStats {
  pendingCount: number; approvedCount: number; rejectedCount: number;
  pendingAmount: number; approvedAmount: number;
}

interface CashbackEntry {
  id: string; userId: string; fromUserId: string; amount: number;
  level: number; percentage: number; description: string;
  category: string; createdAt: string; cashbackType: string;
  userName: string; userEmail: string; fromUserName: string;
}

interface CashbackData {
  entries: CashbackEntry[]; total: number; page: number; totalPages: number;
  totals: { entrada: number; residual: number; vendas: number };
  perUserSummary: { userId: string; name: string; email: string; total: number; count: number }[];
}

interface MatrixOverviewUser {
  userId: string; userName: string; userEmail: string; plan: string;
  isActive: boolean; referralCode: string;
  entradaByLevel: Record<number, number>;
  residualByLevel: Record<number, number>;
  vendasByLevel: Record<number, number>;
  entradaTotal: number; residualTotal: number; vendasTotal: number; networkTotal: number;
}

interface MatrixOverviewData {
  userMatrices: MatrixOverviewUser[];
  platformTotals: {
    entrada: number; residual: number; vendas: number;
    totalUsers: number; totalNetwork: number;
  };
}

interface FinancialOverview {
  totalRevenue: number; totalPlatformBalance: number;
  pendingWithdrawals: number; approvedWithdrawals: number;
  totalCashback: number; totalInCirculation: number;
}

interface FinancialTransaction {
  id: string; userId: string; userName: string; userEmail: string;
  type: string; amount: number; status: string; category: string;
  description: string; createdAt: string;
}

interface FinancialData {
  overview: FinancialOverview;
  recentTransactions: FinancialTransaction[];
  monthlyRevenue: { month: string; revenue: number }[];
  categoryBreakdown: { category: string; amount: number }[];
}

interface AdminTicket {
  id: string; userId: string; userName: string; userEmail: string;
  subject: string; category: string; status: string; priority: string;
  createdAt: string; updatedAt: string;
  messages: { id: string; message: string; isAdmin: boolean; userId: string; createdAt: string }[];
}

// ---------- Vouchers ----------
interface AdminVoucher {
  id: string; code: string; type: string; amountInCents: number;
  userId: string; userName?: string; userEmail?: string;
  isUsed: boolean; usedAt: string | null; expiresAt: string | null;
  createdAt: string; status?: string; description?: string;
}

interface AdminVoucherData {
  vouchers: AdminVoucher[]; total: number; page: number; totalPages: number;
  stats?: { total: number; active: number; redeemed: number; expired: number; totalValue: number };
}

// ---------- Bets ----------
interface AdminBet {
  id: string; userId: string; userName?: string; userEmail?: string;
  eventId: string; eventLabel: string; selection: string; selectionLabel: string;
  odds: number; amountInCents: number; potentialWinInCents: number;
  potentialPayoutInCents?: number; status: string; createdAt: string;
}

interface AdminBetData {
  bets: AdminBet[]; total: number; page: number; totalPages: number;
  stats: { totalBets: number; pendingBets: number; wonBets: number; lostBets: number; totalStaked: number; totalPaid: number };
}

// ---------- Matrix ----------
interface MatrixNode {
  id: string; userId: string; userName: string; userEmail: string;
  level: number; position: number; isFilled: boolean; parentId: string | null;
  balance?: number; children: MatrixNode[];
}

interface MatrixData {
  tree: MatrixNode | null;
  stats: { totalPositions: number; filledPositions: number; emptyPositions: number; totalLevels: number; levelCounts: { level: number; count: number }[] };
}

interface ReferralTreeNode {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: string;
  isActive?: boolean;
  referralCode?: string | null;
  profileImage?: string | null;
  level?: number;
  referralCount?: number;
  children?: ReferralTreeNode[];
}

// ---------- Cashback / Points config ----------
interface CashbackConfigData {
  entrada: Record<string, number>;
  residual: Record<string, number>;
  vendas: Record<string, number>;
  raw?: Record<string, string>;
}

interface PointsConfigData {
  [key: string]: number;
  raw?: Record<string, string>;
}

// ---------- Game Config ----------
interface GameConfigItem {
  id: string;
  gameCode: string;
  name: string;
  description?: string | null;
  pointsPerWin: number;
  pointsPerPlay: number;
  cashbackPerWin: number;
  minBetCents: number;
  maxPlaysPerDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Service Types (Item 8 — admin CRUD for the Services module) ----------
interface AdminServiceType {
  id: string;
  name: string;
  icon?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Achievements ----------
interface AchievementItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  category: string;
  pointsReward: number;
  targetValue: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ADM-5 — Canonical list of achievement variables. Each entry maps a code
// (what the admin picks from the dropdown) to:
//   - label: human-readable label (PT-BR) shown in the dropdown
//   - description: short explanation of what triggers the achievement
//   - suggestedName: default Name to pre-fill when this variable is selected
//   - suggestedTarget: default targetValue (1 for one-shot, >1 for cumulative)
//   - suggestedCategory: default category for this variable
//
// The matching logic in /api/achievements/route.ts (progressForCode) recognizes
// these codes (and several legacy substring aliases) so the achievement
// progress is computed correctly on the user-facing /api/achievements GET.
//
// The "code" stored in the Achievement table is what progressForCode reads,
// so admins can still type a custom code (e.g. "ten_referrals") — the
// dropdown just makes the common cases one-click.
const ACHIEVEMENT_VARIABLES: Array<{
  code: string
  label: string
  description: string
  suggestedName: string
  suggestedTarget: number
  suggestedCategory: string
}> = [
  {
    code: 'first_referral',
    label: 'Primeira indicação',
    description: 'Dispara quando o usuário faz sua 1ª indicação ativa.',
    suggestedName: 'Primeira Indicação',
    suggestedTarget: 1,
    suggestedCategory: 'referral',
  },
  {
    code: 'first_purchase',
    label: 'Primeira compra',
    description: 'Dispara no 1º pedido do marketplace.',
    suggestedName: 'Primeira Compra',
    suggestedTarget: 1,
    suggestedCategory: 'financial',
  },
  {
    code: 'first_withdrawal',
    label: 'Primeiro saque',
    description: 'Dispara quando o usuário solicita o 1º saque.',
    suggestedName: 'Primeiro Saque',
    suggestedTarget: 1,
    suggestedCategory: 'financial',
  },
  {
    code: 'streak_30',
    label: 'Sequência de 30 dias',
    description: 'Dispara quando a maior sequência de logins atinge 30 dias.',
    suggestedName: 'Sequência de 30 Dias',
    suggestedTarget: 30,
    suggestedCategory: 'engagement',
  },
  {
    code: 'kyc_approved',
    label: 'KYC aprovado',
    description: 'Dispara quando o documento do usuário é aprovado no KYC.',
    suggestedName: 'KYC Aprovado',
    suggestedTarget: 1,
    suggestedCategory: 'milestone',
  },
  {
    code: 'plan_upgraded',
    label: 'Plano atualizado',
    description: 'Dispara quando o usuário faz upgrade de plano (Blue 3/5).',
    suggestedName: 'Upgrade de Plano',
    suggestedTarget: 1,
    suggestedCategory: 'milestone',
  },
  {
    code: 'career_bronze',
    label: 'Carreira Bronze',
    description: 'Dispara quando o usuário atinge o rank Bronze na carreira.',
    suggestedName: 'Carreira Bronze',
    suggestedTarget: 50,
    suggestedCategory: 'milestone',
  },
  {
    code: 'career_silver',
    label: 'Carreira Prata',
    description: 'Dispara quando o usuário atinge o rank Prata na carreira.',
    suggestedName: 'Carreira Prata',
    suggestedTarget: 200,
    suggestedCategory: 'milestone',
  },
  {
    code: 'career_gold',
    label: 'Carreira Ouro',
    description: 'Dispara quando o usuário atinge o rank Ouro na carreira.',
    suggestedName: 'Carreira Ouro',
    suggestedTarget: 500,
    suggestedCategory: 'milestone',
  },
  {
    code: 'career_diamond',
    label: 'Carreira Diamante',
    description: 'Dispara quando o usuário atinge o rank Diamante na carreira.',
    suggestedName: 'Carreira Diamante',
    suggestedTarget: 1000,
    suggestedCategory: 'milestone',
  },
  {
    code: 'marketplace_sale',
    label: 'Venda no marketplace',
    description: 'Dispara quando o usuário completa uma venda no marketplace.',
    suggestedName: 'Venda no Marketplace',
    suggestedTarget: 1,
    suggestedCategory: 'financial',
  },
  {
    code: 'profile_completed',
    label: 'Perfil completo',
    description: 'Dispara quando o usuário preenche nome, CPF, telefone, cidade e estado.',
    suggestedName: 'Perfil Completo',
    suggestedTarget: 1,
    suggestedCategory: 'engagement',
  },
  {
    code: 'bank_data_filled',
    label: 'Dados bancários preenchidos',
    description: 'Dispara quando o usuário informa banco, agência e conta.',
    suggestedName: 'Dados Bancários Preenchidos',
    suggestedTarget: 1,
    suggestedCategory: 'financial',
  },
  {
    code: 'social_connected',
    label: 'Rede social conectada',
    description: 'Dispara quando o usuário conecta uma rede social ao perfil.',
    suggestedName: 'Rede Social Conectada',
    suggestedTarget: 1,
    suggestedCategory: 'engagement',
  },
]

// ---------- Career Plans ----------
interface CareerPlanItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  minPoints: number;
  bonusCents: number;
  // 'real' = bonusCents is BRL (rendered as R$). 'points' = bonusCents is a
  // point count (rendered as "X pts"). Admin chooses per plan.
  rewardType: string;
  // BACK-9 — separate reward fields (stored as cents / integers).
  rewardWithdrawalCents?: number;
  rewardShoppingCents?: number;
  rewardPoints?: number;
  gratification?: string | null;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Driver Categories (Safira → Imperial) ----------
// Categoria de VEÍCULO do motorista. Não confundir com CareerPlan
// (que é graduação por careerPoints). DriverCategory é sobre a qualidade
// do veículo + meta mensal de corridas + bônus + regra de cancelamento.
interface AdminDriverCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  monthlyTripsTarget: number;
  bonusCents: number;
  maxCancellationPerMonth: number;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

// ---------- Streak Rewards ----------
interface StreakRewardItem {
  id: string;
  streakDays: number;
  rewardType: string;
  rewardAmount: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Events ----------
interface EventItem {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  eventDate: string;
  endDate?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  maxAttendees?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  registrationCount: number;
}

// ---------- FAQ ----------
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Full edit form data ----------
interface EditFormData {
  name: string; email: string; phone: string; cpf: string;
  plan: string; isActive: boolean;
  balanceWithdrawal: number; balanceMobility: number; balanceShopping: number;
  balanceFood: number; balancePharmacy: number; balanceGratification: number;
  careerPoints: number; personalPoints: number; stars: number;
  city: string; state: string; country: string;
  bankCode: string; bankAgency: string; bankAccount: string; bankType: string;
  pixKey: string; pixEnabled: boolean;
  isDriver: boolean; isDelivery: boolean; role: string;
  qualification: string;
}

const emptyEditForm: EditFormData = {
  name: '', email: '', phone: '', cpf: '',
  plan: 'free', isActive: true,
  balanceWithdrawal: 0, balanceMobility: 0, balanceShopping: 0,
  balanceFood: 0, balancePharmacy: 0, balanceGratification: 0,
  careerPoints: 0, personalPoints: 0, stars: 0,
  city: '', state: '', country: 'BR',
  bankCode: '', bankAgency: '', bankAccount: '', bankType: '',
  pixKey: '', pixEnabled: false,
  isDriver: false, isDelivery: false, role: 'user',
  qualification: '',
}

// Map admin sidebar pages to internal tab values
const adminPageToTab: Record<string, string> = {
  dashboard: 'stats',
  users: 'users',
  'user-types': 'user-types',
  financial: 'financial',
  'withdrawals-asaas': 'withdrawals-asaas',
  asaas: 'asaas',
  plans: 'plans',
  gratifications: 'gratifications',
  support: 'tickets',
  announcements: 'announcements',
  reports: 'reports',
  settings: 'config',
  vouchers: 'vouchers',
  bets: 'bets',
  matrices: 'matrices',
  'cashback-config': 'cashback-config',
  achievements: 'achievements',
  'career-plans': 'career-plans',
  'driver-categories': 'driver-categories',
  'streak-rewards': 'streak-rewards',
  events: 'events',
  faq: 'faq',
  kyc: 'kyc',
  audit: 'audit',
  permissions: 'permissions',
  challenges: 'challenges',
  talkmobi: 'talkmobi',
  'talkmobi-subscriptions': 'talkmobi-subscriptions',
  telemedicina: 'telemedicina',
  'service-types': 'service-types',
  'content-texts': 'content-texts',
  'system-settings': 'system-settings',
}

export function AdminPage() {
  const { t } = useTranslation()
  const { user, adminActivePage, setAdminActivePage, login, setImpersonating } = useStore()
  // Internal sub-tab for the financial admin page (overview / withdrawals / cashback)
  const [financialSubTab, setFinancialSubTab] = useState<'financial' | 'withdrawals' | 'cashback'>('financial')
  // Derive the active tab from the admin sidebar selection. The financial admin page
  // uses the internal sub-tab so admins can switch between overview, withdrawals, and cashback
  // without leaving the "Financeiro" sidebar item.
  const activeTab = adminActivePage === 'financial' ? financialSubTab : (adminPageToTab[adminActivePage] || 'stats')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<{ users: AdminUser[]; total: number; page: number; totalPages: number } | null>(null)
  const [configs, setConfigs] = useState<SystemConfigs>({})
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [withdrawals, setWithdrawals] = useState<{ withdrawals: AdminWithdrawal[]; total: number; page: number; totalPages: number; stats: WithdrawalStats } | null>(null)
  const [cashbackData, setCashbackData] = useState<CashbackData | null>(null)
  const [matrixOverview, setMatrixOverview] = useState<MatrixOverviewData | null>(null)
  const [matrixOverviewLoading, setMatrixOverviewLoading] = useState(false)
  const [expandedMatrixUser, setExpandedMatrixUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // Item 13 (sponsor validation): toggle to filter the Users tab to only
  // users with referredById=null AND role != 'admin' (i.e., users that the
  // admin needs to link to a sponsor). Mirrored on the API as `noSponsor`.
  const [noSponsorFilter, setNoSponsorFilter] = useState(false)
  const [userPage, setUserPage] = useState(1)
  const [savingConfig, setSavingConfig] = useState(false)
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info', priority: 'normal', actionLabel: '', actionUrl: '' })
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('all')

  // Cashback tab filters
  const [cashbackTypeFilter, setCashbackTypeFilter] = useState('all')
  const [cashbackUserFilter, setCashbackUserFilter] = useState('')

  // User edit dialog
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editUserData, setEditUserData] = useState<EditFormData>(emptyEditForm)
  const [savingUser, setSavingUser] = useState(false)

  // ADM-USERTYPE — Create User dialog state. The admin can create a new user with
  // login + password (and optional role) directly from the Users tab. Now also
  // supports setting qualification (UserType code) + matrix levels.
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false)
  const [creatingNewUser, setCreatingNewUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    name: '', email: '', password: '', phone: '', cpf: '',
    userType: 'usuario', role: 'user', plan: 'free', referredByCode: '',
    qualification: '' as string,
    entradaLevel: 0 as number,
    residualLevel: 0 as number,
    vendasLevel: 0 as number,
  })
  // ADM-USERTYPE — dynamic user types (qualifications) loaded from
  // /api/admin/user-types so the admin picks from the types they created
  // in the "Tipos de Usuário" tab (not a hardcoded list).
  const [availableUserTypes, setAvailableUserTypes] = useState<Array<{
    id: string; code: string; label: string; icon: string | null;
    defaultEntradaLevel: number; defaultResidualLevel: number; defaultVendasLevel: number;
  }>>([])
  // Custom roles loaded from /admin/permissions so the Role selects
  // (in both the Create and Edit dialogs) can list any role the admin
  // created in the Permissões tab.
  const [customRoles, setCustomRoles] = useState<string[]>([])
  const roleSelectOptions = useMemo(() => {
    const base = [
      { value: 'user', label: 'Usuário comum' },
      { value: 'admin', label: 'Administrador' },
      { value: 'support', label: 'Suporte' },
    ]
    const extras = customRoles
      .filter((r) => !base.some((b) => b.value === r))
      .map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))
    return [...base, ...extras]
  }, [customRoles])

  // User view dialog
  const [viewUserDialogOpen, setViewUserDialogOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<ViewUserData | null>(null)
  const [loadingViewUser, setLoadingViewUser] = useState(false)
  const [viewUserBeneficiaries, setViewUserBeneficiaries] = useState<any[]>([])

  // Item 13 (sponsor validation) — "Vincular patrocinador" dialog state.
  // Lets the admin assign a sponsor (referredById) to a user that was
  // created without one. The admin types an email or referral code; we
  // validate it client-side via /api/referrals/validate?code=... and then
  // PUT { referredById } to /api/admin/users/[id] (the route accepts an
  // email/referralCode/id string and resolves it server-side too).
  const [linkSponsorDialogOpen, setLinkSponsorDialogOpen] = useState(false)
  const [linkSponsorTarget, setLinkSponsorTarget] = useState<AdminUser | null>(null)
  const [linkSponsorQuery, setLinkSponsorQuery] = useState('')
  const [linkSponsorResolved, setLinkSponsorResolved] = useState<{ name: string } | null>(null)
  const [linkSponsorChecking, setLinkSponsorChecking] = useState(false)
  const [linkSponsorSaving, setLinkSponsorSaving] = useState(false)

  // Plan dialog
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null)
  const [planFormData, setPlanFormData] = useState({ name: '', price: 0, features: '', description: '', matrixEntradaId: '', matrixResidualId: '', matrixVendasId: '', isActive: true, sortOrder: 99, entradaLevels: 0, residualLevels: 0, vendasLevels: 0 })
  const [savingPlan, setSavingPlan] = useState(false)
  const [matrixTypes, setMatrixTypes] = useState<AdminMatrixType[]>([])

  // Seed / Sincronizar Dados Demo — admin can trigger the prisma seed
  // directly from the UI without SSH. Calls /api/admin/seed.
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedStep, setSeedStep] = useState<string>('all')
  const [seedResult, setSeedResult] = useState<{
    step: string; elapsedMs: number; counts: Record<string, number>; logTail: string[]
  } | null>(null)
  const [dbCounts, setDbCounts] = useState<Record<string, number> | null>(null)

  // Lote 1, Item 2 — etapas que podem executar o cleanup destrutivo (apaga
  // usuários reais fora da lista demo QUANDO ALLOW_DESTRUCTIVE_SEED=true no
  // ambiente). Exigem confirmação dupla (clique + modal) antes de rodar.
  const DESTRUCTIVE_SEED_STEPS = ['all', 'users']

  const handleRunSeed = async () => {
    if (!user?.id) return
    if (DESTRUCTIVE_SEED_STEPS.includes(seedStep)) {
      // Confirmação dupla (modal nativo — sem alteração de layout)
      const ok = window.confirm(
        `A etapa "${seedStep}" pode executar um cleanup destrutivo: com ALLOW_DESTRUCTIVE_SEED=true no ambiente, usuários reais fora da lista demo serão APAGADOS junto com seus dados (cashback, faturas, pedidos, KYC, saques). Um backup automático do banco será feito antes. Deseja continuar?`,
      )
      if (!ok) return
    }
    setSeedLoading(true)
    setSeedResult(null)
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, step: seedStep }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Falha ao rodar seed')
        return
      }
      setSeedResult(data)
      setDbCounts(data.counts)
      toast.success(`Seed "${seedStep}" concluído em ${data.elapsedMs}ms`)
    } catch (e) {
      toast.error('Erro de rede ao rodar seed')
    } finally {
      setSeedLoading(false)
    }
  }

  const handleLoadDbCounts = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/admin/seed?userId=${user.id}`)
      const data = await res.json()
      if (res.ok && data.counts) setDbCounts(data.counts)
    } catch { /* silent */ }
  }

  // Withdrawal action
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null)

  // Admin impersonation ("Entrar" button) — per-row loading spinner state.
  // Holds the user id of the row currently being impersonated, or null when idle.
  const [impersonatingTargetId, setImpersonatingTargetId] = useState<string | null>(null)

  // Manual cashback dialog
  const [addCashbackDialogOpen, setAddCashbackDialogOpen] = useState(false)
  const [savingCashback, setSavingCashback] = useState(false)
  const [cashbackFormData, setCashbackFormData] = useState({
    targetUserId: '', cashbackType: 'entrada', amount: 0, level: 1, percentage: 0, description: '', category: '',
  })

  // Financial tab
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [financialTypeFilter, setFinancialTypeFilter] = useState('all')
  const [financialStatusFilter, setFinancialStatusFilter] = useState('all')
  const [financialDateFrom, setFinancialDateFrom] = useState('')
  const [financialDateTo, setFinancialDateTo] = useState('')
  // Tarefa (22/09): saque do lucro da empresa (só admin/geral dono)
  const [companyWithdrawalAmount, setCompanyWithdrawalAmount] = useState('')
  const [companyWithdrawalPurpose, setCompanyWithdrawalPurpose] = useState('')
  const [companyWithdrawalLoading, setCompanyWithdrawalLoading] = useState(false)
  const [financialDatePreset, setFinancialDatePreset] = useState('')

  // Users bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [processingBulk, setProcessingBulk] = useState(false)

  // Announcement edit
  const [editAnnouncementDialogOpen, setEditAnnouncementDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<AdminAnnouncement | null>(null)
  const [editAnnouncementData, setEditAnnouncementData] = useState({ title: '', message: '', type: 'info', priority: 'normal', actionLabel: '', actionUrl: '' })
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)

  // Support/Tickets tab
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all')
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null)
  const [ticketReply, setTicketReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // Vouchers tab
  const [voucherData, setVoucherData] = useState<AdminVoucherData | null>(null)
  const [voucherStatusFilter, setVoucherStatusFilter] = useState('all')
  const [voucherPage, setVoucherPage] = useState(1)
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherCreateOpen, setVoucherCreateOpen] = useState(false)
  const [voucherSaving, setVoucherSaving] = useState(false)
  const [voucherForm, setVoucherForm] = useState({
    type: 'mobility', amountBrl: '', targetUserId: '', code: '', expiresAt: '', description: '',
  })

  // Bets tab
  const [betData, setBetData] = useState<AdminBetData | null>(null)
  const [betStatusFilter, setBetStatusFilter] = useState('all')
  const [betPage, setBetPage] = useState(1)
  const [betLoading, setBetLoading] = useState(false)
  const [betSettleOpen, setBetSettleOpen] = useState(false)
  const [betSettleTarget, setBetSettleTarget] = useState<AdminBet | null>(null)
  const [betSettling, setBetSettling] = useState(false)
  const [betCancelOpen, setBetCancelOpen] = useState(false)
  const [betCancelTarget, setBetCancelTarget] = useState<AdminBet | null>(null)
  const [betCancelReason, setBetCancelReason] = useState('')
  const [betCancelling, setBetCancelling] = useState(false)

  // Matrices tab
  const [matrixSearchQuery, setMatrixSearchQuery] = useState('')
  const [matrixSearchResults, setMatrixSearchResults] = useState<AdminUser[]>([])
  const [matrixSelectedUser, setMatrixSelectedUser] = useState<AdminUser | null>(null)
  const [matrixType, setMatrixType] = useState<'entrada' | 'residual' | 'vendas'>('entrada')
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null)
  const [referralTree, setReferralTree] = useState<ReferralTreeNode | null>(null)
  const [referralTreeLoading, setReferralTreeLoading] = useState(false)
  const [referralExpanded, setReferralExpanded] = useState<Set<string>>(new Set())
  const [matrixLoading, setMatrixLoading] = useState(false)
  const [matrixSearchLoading, setMatrixSearchLoading] = useState(false)

  // Tarefa 2 (19/09) — Limites financeiros das 3 matrizes em R$ (centavos).
  // Antes: só "salesLimit" em quantidade de vendas. Agora: 3 limites em R$.
  type MatrixLimitHistory = Array<{
    id: string
    adminName: string
    adminEmail: string
    previousValue: number | null
    newValue: number
    timestamp: string
  }>
  const [entradaLimit, setEntradaLimit] = useState<number>(9650000) // R$ 96.500,00
  const [entradaLimitInput, setEntradaLimitInput] = useState<string>('9650000')
  const [residualLimit, setResidualLimit] = useState<number>(75000000) // R$ 750.000,00
  const [residualLimitInput, setResidualLimitInput] = useState<string>('75000000')
  const [vendasLimit, setVendasLimit] = useState<number>(0) // "a definir"
  const [vendasLimitInput, setVendasLimitInput] = useState<string>('0')
  const [matrixLimitsLoading, setMatrixLimitsLoading] = useState(false)
  const [matrixLimitSaving, setMatrixLimitSaving] = useState<'entrada' | 'residual' | 'vendas' | null>(null)
  const [entradaHistory, setEntradaHistory] = useState<MatrixLimitHistory>([])
  const [residualHistory, setResidualHistory] = useState<MatrixLimitHistory>([])
  const [vendasHistory, setVendasHistory] = useState<MatrixLimitHistory>([])

  // Tarefa 2 — Carrega os 3 limites (entrada, residual, vendas) em centavos.
  const loadMatrixLimits = useCallback(async () => {
    if (!user?.id) return
    setMatrixLimitsLoading(true)
    try {
      const data = await apiFetch<{
        entradaLimitCents: number
        residualLimitCents: number
        vendasLimitCents: number
        history?: {
          entrada: MatrixLimitHistory
          residual: MatrixLimitHistory
          vendas: MatrixLimitHistory
        }
      }>(`/admin/matrix-config?userId=${user.id}`)
      if (data) {
        setEntradaLimit(data.entradaLimitCents)
        setEntradaLimitInput(String(data.entradaLimitCents))
        setResidualLimit(data.residualLimitCents)
        setResidualLimitInput(String(data.residualLimitCents))
        setVendasLimit(data.vendasLimitCents)
        setVendasLimitInput(String(data.vendasLimitCents))
        if (data.history) {
          setEntradaHistory(data.history.entrada || [])
          setResidualHistory(data.history.residual || [])
          setVendasHistory(data.history.vendas || [])
        }
      }
    } catch {
      // Silent fail — keep defaults
    } finally {
      setMatrixLimitsLoading(false)
    }
  }, [user?.id])

  // Salva um limite específico (entrada | residual | vendas)
  const saveMatrixLimit = async (matrix: 'entrada' | 'residual' | 'vendas') => {
    if (!user?.id) return
    setMatrixLimitSaving(matrix)
    try {
      let valueStr = ''
      if (matrix === 'entrada') valueStr = entradaLimitInput
      if (matrix === 'residual') valueStr = residualLimitInput
      if (matrix === 'vendas') valueStr = vendasLimitInput
      // Converte input de R$ (com vírgula/ponto) para centavos
      const brl = parseFloat(valueStr.replace(',', '.'))
      if (!Number.isFinite(brl) || brl < 0) {
        toast.error('Valor deve ser um número positivo em R$')
        return
      }
      const cents = Math.round(brl * 100)
      await apiFetch(`/admin/matrix-config`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, matrix, limitCents: cents }),
      })
      if (matrix === 'entrada') setEntradaLimit(cents)
      if (matrix === 'residual') setResidualLimit(cents)
      if (matrix === 'vendas') setVendasLimit(cents)
      toast.success(`Limite da matriz ${matrix} atualizado`)
      // Recarrega histórico
      await loadMatrixLimits()
    } catch (err) {
      console.error(`Failed to save ${matrix} limit:`, err)
      toast.error(`Erro ao salvar limite da matriz ${matrix}`)
    } finally {
      setMatrixLimitSaving(null)
    }
  }

  // Item 2 — Load sales limit config for the matrices tab.
  // Declared here (before the useEffect at line ~1280) to avoid the
  // "Cannot access 'loadSalesLimit' before initialization" TDZ error.
  // loadSalesLimit removido — substituído por loadMatrixLimits() que carrega
  // os 3 limites (entrada, residual, vendas) em centavos de R$.

  // Cashback config tab
  const [cashbackConfig, setCashbackConfig] = useState<CashbackConfigData | null>(null)
  const [pointsConfig, setPointsConfig] = useState<PointsConfigData | null>(null)
  const [cashbackConfigLoading, setCashbackConfigLoading] = useState(false)
  const [cashbackSaving, setCashbackSaving] = useState(false)
  const [pointsSaving, setPointsSaving] = useState(false)

  // Release balance dialog (used from user view)
  const [releaseBalanceOpen, setReleaseBalanceOpen] = useState(false)
  const [releaseBalanceTarget, setReleaseBalanceTarget] = useState<ViewUserData | null>(null)
  const [releaseBalanceForm, setReleaseBalanceForm] = useState({ wallet: 'balanceWithdrawal', amountBrl: '', description: '' })
  const [releaseBalanceSaving, setReleaseBalanceSaving] = useState(false)

  // Create gratification dialog (used from gratifications tab)
  // Task 2-c / Admin Item 2 — form includes the fields required by the spec:
  //   - targetUserId (admin selects which user gets the gratification)
  //   - name (human-readable label shown in the user's Metas list)
  //   - type (machine-readable category key, e.g. 'leadership')
  //   - category (wallet/balance bucket, e.g. 'gratification')
  //   - amountBrl (reward value in BRL reais, converted to cents on submit)
  //   - qualification (PT-BR free-text describing what the user must do to
  //     claim this gratification, e.g. 'Ao fechar o 5º nível')
  //   - description (admin-only note)
  const [gratificationCreateOpen, setGratificationCreateOpen] = useState(false)
  const [gratificationForm, setGratificationForm] = useState({
    targetUserId: '',
    name: '',
    type: 'leadership',
    amountBrl: '',
    category: 'gratification',
    qualification: '',
    description: '',
  })
  const [gratificationSaving, setGratificationSaving] = useState(false)
  const [gratificationUserSearch, setGratificationUserSearch] = useState('')
  const [gratificationUserResults, setGratificationUserResults] = useState<AdminUser[]>([])
  const [gratificationUserLoading, setGratificationUserLoading] = useState(false)
  const [gratificationUserSearched, setGratificationUserSearched] = useState(false)
  const gratificationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // BACK-7 + Task 2-c / Item 7 — driver-goals benefit target config
  // ('motorista' | 'entregador' | 'ambos').
  //
  // Stored as a Gratification row with type='driver_goals_config'. This is
  // the OVERALL module visibility — controls who can see the Metas menu item
  // in the sidebar AND who can access the gratifications page at all.
  const [driverGoalsTarget, setDriverGoalsTarget] = useState<string>('ambos')
  const [driverGoalsTargetLoading, setDriverGoalsTargetLoading] = useState(false)
  const [driverGoalsTargetSaving, setDriverGoalsTargetSaving] = useState(false)

  // Task 2-c / Item 7.3 — per-benefit target qualification config.
  // Stored as a JSON string on SystemConfig under the key 'metas_benefit_targets'.
  // Shape: { [benefitType]: 'motorista' | 'entregador' | 'ambos' }.
  // When a benefit type is NOT in the map, the gratifications page falls back
  // to the overall `driverGoalsTarget` for that benefit.
  const [benefitCatalog, setBenefitCatalog] = useState<Array<{
    type: string
    name: string
    category: string
    amount: number
    description: string
  }>>([])
  const [benefitTargets, setBenefitTargets] = useState<Record<string, string>>({})
  const [benefitTargetSavingKey, setBenefitTargetSavingKey] = useState<string | null>(null)
  // Tarefa (22/09): state para dialog de editar benefício
  const [benefitEditDialog, setBenefitEditDialog] = useState<{
    open: boolean
    benefitType: string
    benefitName: string
    benefitAmount: number
    benefitDescription: string
  }>({ open: false, benefitType: '', benefitName: '', benefitAmount: 0, benefitDescription: '' })

  // Task 2-c / Item 7.3 (admin form) — array-based `metas.allowedQualifications`.
  // Stored as a JSON string on SystemConfig under the key
  // `metas.allowedQualifications`. Shape: ["motorista","entregador"].
  // Preferred over the legacy single-value `driverGoalsTarget` (Gratification
  // row with type='driver_goals_config'). When the array is non-empty, this
  // is the authoritative gate; otherwise the legacy value is consulted.
  // Tarefa (22/09): ALLOWED_QUALIFICATION_OPTIONS agora carrega do banco
  // (availableUserTypes) em vez de ser hardcoded com só motorista/entregador.
  // Admin pode selecionar qualquer tipo de usuário cadastrado em "Tipos de Usuário".
  const ALLOWED_QUALIFICATION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = availableUserTypes.length > 0
    ? availableUserTypes.map(t => ({ value: t.code, label: `${t.icon || '👤'} ${t.label}` }))
    : [
        { value: 'motorista', label: '🚗 Motorista' },
        { value: 'entregador', label: '🛵 Entregador' },
      ]
  const [allowedQualifications, setAllowedQualifications] = useState<string[]>(['motorista', 'entregador'])
  const [allowedQualificationsLoading, setAllowedQualificationsLoading] = useState(false)
  const [allowedQualificationsSaving, setAllowedQualificationsSaving] = useState(false)

  // ---------- Goal Configs (admin CRUD — "motorista 20 viagens → R$ 5,00") ----------
  interface GoalConfigItem {
    id: string
    name: string
    description: string | null
    targetQualification: string
    metricCode: string
    metricLabel: string
    targetValue: number
    rewardCents: number
    rewardWallet: string
    frequency: string
    isActive: boolean
    sortOrder: number
    createdAt: string
  }
  const [goalConfigs, setGoalConfigs] = useState<GoalConfigItem[]>([])
  const [goalConfigsLoading, setGoalConfigsLoading] = useState(false)
  const [goalConfigDialogOpen, setGoalConfigDialogOpen] = useState(false)
  const [editingGoalConfig, setEditingGoalConfig] = useState<GoalConfigItem | null>(null)
  const [goalConfigForm, setGoalConfigForm] = useState({
    name: '',
    description: '',
    targetQualification: 'motorista',
    metricCode: 'trips_daily',
    metricLabel: 'viagens finalizadas',
    targetValue: 20,
    rewardBrl: '5,00',
    rewardWallet: 'gratification',
    frequency: 'daily',
    isActive: true,
    sortOrder: 99,
  })
  const [goalConfigSaving, setGoalConfigSaving] = useState(false)

  const loadGoalConfigs = useCallback(async () => {
    if (!user?.id) return
    setGoalConfigsLoading(true)
    try {
      const data = await apiFetch<{ configs: GoalConfigItem[] }>(
        `/admin/goal-configs?userId=${user.id}`
      )
      if (data?.configs) setGoalConfigs(data.configs)
    } catch (err) {
      console.error('Failed to load goal configs:', err)
    } finally {
      setGoalConfigsLoading(false)
    }
  }, [user?.id])

  // Parse BRL string ("5,00" or "5.00" or "5") to cents
  function parseBrlToCents(brl: string): number {
    const cleaned = brl.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')
    const value = parseFloat(cleaned)
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0
  }

  // Format cents to BRL string for input display
  function centsToBrlInput(cents: number): string {
    return (cents / 100).toFixed(2).replace('.', ',')
  }

  const openCreateGoalConfig = () => {
    setEditingGoalConfig(null)
    setGoalConfigForm({
      name: '',
      description: '',
      targetQualification: 'motorista',
      metricCode: 'trips_daily',
      metricLabel: 'viagens finalizadas',
      targetValue: 20,
      rewardBrl: '5,00',
      rewardWallet: 'gratification',
      frequency: 'daily',
      isActive: true,
      sortOrder: 99,
    })
    setGoalConfigDialogOpen(true)
  }

  const openEditGoalConfig = (item: GoalConfigItem) => {
    setEditingGoalConfig(item)
    setGoalConfigForm({
      name: item.name,
      description: item.description || '',
      targetQualification: item.targetQualification,
      metricCode: item.metricCode,
      metricLabel: item.metricLabel,
      targetValue: item.targetValue,
      rewardBrl: centsToBrlInput(item.rewardCents),
      rewardWallet: item.rewardWallet,
      frequency: item.frequency,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    })
    setGoalConfigDialogOpen(true)
  }

  const saveGoalConfig = async () => {
    if (!user?.id) return
    if (!goalConfigForm.name.trim()) {
      toast.error('Informe o nome da meta')
      return
    }
    if (goalConfigForm.targetValue < 1) {
      toast.error('O valor-alvo deve ser maior que zero')
      return
    }
    setGoalConfigSaving(true)
    try {
      const payload = {
        userId: user.id,
        name: goalConfigForm.name.trim(),
        description: goalConfigForm.description.trim() || null,
        targetQualification: goalConfigForm.targetQualification,
        metricCode: goalConfigForm.metricCode,
        metricLabel: goalConfigForm.metricLabel.trim() || 'viagens finalizadas',
        targetValue: Math.floor(goalConfigForm.targetValue),
        rewardCents: parseBrlToCents(goalConfigForm.rewardBrl),
        rewardWallet: goalConfigForm.rewardWallet,
        frequency: goalConfigForm.frequency,
        isActive: goalConfigForm.isActive,
        sortOrder: Math.floor(goalConfigForm.sortOrder || 99),
      }

      if (editingGoalConfig) {
        await apiFetch(`/admin/goal-configs/${editingGoalConfig.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        toast.success('Meta atualizada com sucesso!')
      } else {
        await apiFetch(`/admin/goal-configs`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Meta criada com sucesso!')
      }
      setGoalConfigDialogOpen(false)
      await loadGoalConfigs()
    } catch (err) {
      console.error('Failed to save goal config:', err)
      toast.error('Erro ao salvar meta')
    } finally {
      setGoalConfigSaving(false)
    }
  }

  const deleteGoalConfig = async (id: string) => {
    if (!user?.id) return
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return
    try {
      await apiFetch(`/admin/goal-configs/${id}?userId=${user.id}`, { method: 'DELETE' })
      toast.success('Meta excluída com sucesso!')
      await loadGoalConfigs()
    } catch (err) {
      console.error('Failed to delete goal config:', err)
      toast.error('Erro ao excluir meta')
    }
  }

  const toggleGoalConfigActive = async (item: GoalConfigItem) => {
    if (!user?.id) return
    try {
      await apiFetch(`/admin/goal-configs/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, isActive: !item.isActive }),
      })
      await loadGoalConfigs()
      toast.success(item.isActive ? 'Meta desativada' : 'Meta ativada')
    } catch (err) {
      console.error('Failed to toggle goal config:', err)
      toast.error('Erro ao alterar status')
    }
  }

  // ---------- Content Texts (admin CRUD — "Conteúdo e Textos") ----------
  // Item 1 — Admin control over ALL system texts/labels. Backed by the
  // SystemConfig table (filtered by category). Lets the admin edit labels
  // like platform_name, menu_dashboard, plan_free_name, etc. without
  // code changes or deploys. The frontend consumes them via the public
  // /api/content-texts endpoint and the src/lib/content-texts.ts helper.
  interface ContentTextItem {
    id: string
    key: string
    value: string
    description: string | null
    category: string
    updatedAt: string
  }
  const CONTENT_TEXT_CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'geral', label: 'Geral' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'menu', label: 'Menu / Sidebar' },
    { value: 'planos', label: 'Planos' },
    { value: 'motorista', label: 'Motorista' },
    { value: 'lojista', label: 'Lojista' },
    { value: 'matrizes', label: 'Matrizes' },
    { value: 'mobile', label: 'App Mobile' },
  ]
  const [contentTexts, setContentTexts] = useState<ContentTextItem[]>([])
  const [contentTextsLoading, setContentTextsLoading] = useState(false)
  const [contentTextSearch, setContentTextSearch] = useState('')
  const [contentTextCategoryFilter, setContentTextCategoryFilter] = useState('all')
  const [editingContentText, setEditingContentText] = useState<ContentTextItem | null>(null)
  const [contentTextDialogOpen, setContentTextDialogOpen] = useState(false)
  const [contentTextForm, setContentTextForm] = useState({
    key: '', value: '', description: '', category: 'geral',
  })
  const [contentTextSaving, setContentTextSaving] = useState(false)

  const loadContentTexts = useCallback(async () => {
    if (!user?.id) return
    setContentTextsLoading(true)
    try {
      const data = await apiFetch<{ items: ContentTextItem[] }>(
        `/admin/content-texts?userId=${user.id}`
      )
      if (data?.items) setContentTexts(data.items)
    } catch (err) {
      console.error('Failed to load content texts:', err)
    } finally {
      setContentTextsLoading(false)
    }
  }, [user?.id])

  const openCreateContentText = () => {
    setEditingContentText(null)
    setContentTextForm({ key: '', value: '', description: '', category: 'geral' })
    setContentTextDialogOpen(true)
  }

  const openEditContentText = (item: ContentTextItem) => {
    setEditingContentText(item)
    setContentTextForm({
      key: item.key,
      value: item.value,
      description: item.description || '',
      category: item.category || 'geral',
    })
    setContentTextDialogOpen(true)
  }

  const saveContentText = async () => {
    if (!user?.id) return
    if (!contentTextForm.key.trim()) {
      toast.error('Informe a chave (key)')
      return
    }
    if (!/^[a-z0-9_]+$/i.test(contentTextForm.key.trim())) {
      toast.error('Chave deve conter apenas letras, números e underline')
      return
    }
    if (!contentTextForm.value.trim()) {
      toast.error('Informe o valor do texto')
      return
    }
    setContentTextSaving(true)
    try {
      const payload = {
        userId: user.id,
        key: contentTextForm.key.trim(),
        value: contentTextForm.value,
        description: contentTextForm.description.trim() || null,
        category: contentTextForm.category || 'geral',
      }
      if (editingContentText) {
        await apiFetch(`/admin/content-texts/${editingContentText.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            userId: user.id,
            value: payload.value,
            description: payload.description,
            category: payload.category,
          }),
        })
        toast.success('Texto atualizado com sucesso!')
      } else {
        await apiFetch('/admin/content-texts', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Texto criado com sucesso!')
      }
      setContentTextDialogOpen(false)
      await loadContentTexts()
    } catch (err) {
      console.error('Failed to save content text:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar texto')
    } finally {
      setContentTextSaving(false)
    }
  }

  const deleteContentText = async (item: ContentTextItem) => {
    if (!user?.id) return
    if (!confirm(`Excluir o texto "${item.key}"?`)) return
    try {
      await apiFetch(`/admin/content-texts/${item.id}?userId=${user.id}`, { method: 'DELETE' })
      toast.success('Texto excluído com sucesso!')
      await loadContentTexts()
    } catch (err) {
      console.error('Failed to delete content text:', err)
      toast.error('Erro ao excluir texto')
    }
  }

  // Client-side filter for the content-texts table. Combines search (key/value)
  // with category filter. Avoids an extra round-trip for small datasets.
  const filteredContentTexts = useMemo(() => {
    const q = contentTextSearch.trim().toLowerCase()
    return contentTexts.filter((t) => {
      if (contentTextCategoryFilter !== 'all' && t.category !== contentTextCategoryFilter) return false
      if (!q) return true
      return (
        t.key.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      )
    })
  }, [contentTexts, contentTextSearch, contentTextCategoryFilter])

  // ---------- System Settings (SETTINGS-1 — comprehensive admin editor) ----------
  // Admin can edit EVERYTHING in the system: matrix values, cashback %, plan
  // prices, withdrawal limits, points config, vouchers, metas, platform
  // name/tagline, etc. Backed by the SystemConfig table; seeded on first
  // GET /api/admin/system-settings with the full default catalog.
  interface SystemSettingItem {
    id: string
    key: string
    value: string
    description: string | null
    category: string
    updatedAt: string
  }
  const SYSTEM_SETTING_CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'all', label: 'Todas as categorias' },
    { value: 'geral', label: 'Geral' },
    { value: 'matrizes', label: 'Matrizes' },
    { value: 'cashback', label: 'CashBack' },
    { value: 'planos', label: 'Planos' },
    { value: 'saques', label: 'Saques' },
    { value: 'pontos', label: 'Pontos' },
    { value: 'vouchers', label: 'Vouchers' },
    { value: 'metas', label: 'Metas' },
    { value: 'menu', label: 'Menu / Sidebar' },
    { value: 'dashboard', label: 'Dashboard' },
  ]
  // Human-readable labels for the inline category badge (PT-BR).
  const SYSTEM_SETTING_CATEGORY_LABEL: Record<string, string> = {
    geral: 'Geral',
    matrizes: 'Matrizes',
    cashback: 'CashBack',
    planos: 'Planos',
    saques: 'Saques',
    pontos: 'Pontos',
    vouchers: 'Vouchers',
    metas: 'Metas',
    menu: 'Menu',
    dashboard: 'Dashboard',
  }
  const [systemSettings, setSystemSettings] = useState<SystemSettingItem[]>([])
  const [systemSettingsLoading, setSystemSettingsLoading] = useState(false)
  const [systemSettingSearch, setSystemSettingSearch] = useState('')
  const [systemSettingCategoryFilter, setSystemSettingCategoryFilter] = useState('all')
  const [editingSystemSetting, setEditingSystemSetting] = useState<SystemSettingItem | null>(null)
  const [systemSettingDialogOpen, setSystemSettingDialogOpen] = useState(false)
  const [systemSettingForm, setSystemSettingForm] = useState({
    key: '', value: '', description: '', category: 'geral',
  })
  const [systemSettingSaving, setSystemSettingSaving] = useState(false)

  // ===== Matrix Advanced Editor (TASK MATRIX-EDITOR) =====
  // "Modo Avançado" inline-editable spreadsheet for MatrixType,
  // MatrixLevelEarning, and MatrixPosition records.
  const [matrixAdvancedMode, setMatrixAdvancedMode] = useState(false)
  const [matrixAdvancedTab, setMatrixAdvancedTab] = useState<'types' | 'positions'>('types')
  // matrixTypesData mirrors the existing matrixTypes state but typed as any[]
  // so the Advanced Editor can freely access the levelEarnings array (which
  // AdminMatrixType intentionally omits). Both are populated by the same
  // loadMatrixTypes() call to avoid duplicate API round-trips.
  const [matrixTypesData, setMatrixTypesData] = useState<any[]>([])
  const [matrixTypesLoading, setMatrixTypesLoading] = useState(false)
  const [matrixPositionsData, setMatrixPositionsData] = useState<any[]>([])
  const [matrixPositionsLoading, setMatrixPositionsLoading] = useState(false)
  const [matrixPositionsPage, setMatrixPositionsPage] = useState(1)
  const [matrixPositionsTotal, setMatrixPositionsTotal] = useState(0)
  const [editingMatrixType, setEditingMatrixType] = useState<any | null>(null)
  // Tarefa (22/09): state para editar largura/profundidade da matriz no dialog
  const [editingMatrixWidth, setEditingMatrixWidth] = useState<number>(4)
  const [editingMatrixDepth, setEditingMatrixDepth] = useState<number>(5)
  const [matrixLevelDialogOpen, setMatrixLevelDialogOpen] = useState(false)
  const [editingMatrixPosition, setEditingMatrixPosition] = useState<any | null>(null)
  const [matrixPositionDialogOpen, setMatrixPositionDialogOpen] = useState(false)
  const [matrixPosSearch, setMatrixPosSearch] = useState('')
  const [matrixPosFilterType, setMatrixPosFilterType] = useState('all')
  const [matrixPosFilterLevel, setMatrixPosFilterLevel] = useState('')
  // Local working copy of the levelEarnings array while editing a MatrixType
  // (add/remove rows, edit values in place; saved all at once on "Salvar").
  const [matrixLevelDraft, setMatrixLevelDraft] = useState<any[]>([])
  const [matrixLevelSaving, setMatrixLevelSaving] = useState(false)
  // Position-edit dialog form state (level / position / status).
  const [matrixPosForm, setMatrixPosForm] = useState({ level: 0, position: 0, status: 'filled' })
  const [matrixPosSaving, setMatrixPosSaving] = useState(false)

  // ---------- Matrix Positions (TASK MATRIX-EDITOR) ----------
  // Moved here (before the useEffect at line ~1556) to avoid the
  // "Cannot access 'loadMatrixPositions' before initialization" TDZ error.
  // useCallback is a const — it must be initialized before any code that
  // references it runs.
  const loadMatrixPositions = useCallback(async (opts?: { page?: number; search?: string; type?: string; level?: string }) => {
    if (!user?.id) return
    const page = opts?.page ?? 1
    const search = opts?.search ?? ''
    const type = opts?.type ?? 'all'
    const level = opts?.level ?? ''
    setMatrixPositionsLoading(true)
    try {
      const params = new URLSearchParams({ userId: user.id, page: String(page), limit: '50' })
      if (search) params.set('search', search)
      if (type && type !== 'all') params.set('matrixType', type)
      if (level) params.set('level', level)
      const data = await apiFetch<{ positions: any[]; total: number; page: number; totalPages: number }>(
        `/admin/matrix-positions?${params}`
      )
      setMatrixPositionsData(data.positions || [])
      setMatrixPositionsTotal(data.total ?? 0)
    } catch (err) {
      console.error('Failed to load matrix positions:', err)
      setMatrixPositionsData([])
      setMatrixPositionsTotal(0)
    } finally {
      setMatrixPositionsLoading(false)
    }
  }, [user?.id])

  const loadSystemSettings = useCallback(async () => {
    if (!user?.id) return
    setSystemSettingsLoading(true)
    try {
      const data = await apiFetch<{ items: SystemSettingItem[] }>(
        `/admin/system-settings?userId=${user.id}`
      )
      if (data?.items) setSystemSettings(data.items)
    } catch (err) {
      console.error('Failed to load system settings:', err)
      toast.error('Erro ao carregar configurações do sistema')
    } finally {
      setSystemSettingsLoading(false)
    }
  }, [user?.id])

  const openCreateSystemSetting = () => {
    setEditingSystemSetting(null)
    setSystemSettingForm({ key: '', value: '', description: '', category: 'geral' })
    setSystemSettingDialogOpen(true)
  }

  const openEditSystemSetting = (item: SystemSettingItem) => {
    setEditingSystemSetting(item)
    setSystemSettingForm({
      key: item.key,
      value: item.value,
      description: item.description || '',
      category: item.category || 'geral',
    })
    setSystemSettingDialogOpen(true)
  }

  const saveSystemSetting = async () => {
    if (!user?.id) return
    if (!systemSettingForm.key.trim()) {
      toast.error('Informe a chave (key)')
      return
    }
    // Allow dots, underscores, letters and digits so both snake_case
    // (menu_dashboard) and dotted (matrix.entrada.pct_level_1) keys work.
    if (!/^[a-z0-9_.]+$/i.test(systemSettingForm.key.trim())) {
      toast.error('Chave deve conter apenas letras, números, ponto e underline')
      return
    }
    if (!systemSettingForm.value.trim()) {
      toast.error('Informe o valor da configuração')
      return
    }
    setSystemSettingSaving(true)
    try {
      const payload = {
        userId: user.id,
        key: systemSettingForm.key.trim(),
        value: systemSettingForm.value,
        description: systemSettingForm.description.trim() || null,
        category: systemSettingForm.category || 'geral',
      }
      if (editingSystemSetting) {
        await apiFetch(`/admin/system-settings/${editingSystemSetting.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            userId: user.id,
            value: payload.value,
            description: payload.description,
            category: payload.category,
          }),
        })
        toast.success('Configuração atualizada com sucesso!')
      } else {
        await apiFetch('/admin/system-settings', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Configuração criada com sucesso!')
      }
      setSystemSettingDialogOpen(false)
      await loadSystemSettings()
    } catch (err) {
      console.error('Failed to save system setting:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração')
    } finally {
      setSystemSettingSaving(false)
    }
  }

  const deleteSystemSetting = async (item: SystemSettingItem) => {
    if (!user?.id) return
    if (!confirm(`Excluir a configuração "${item.key}"?`)) return
    try {
      await apiFetch(`/admin/system-settings/${item.id}?userId=${user.id}`, { method: 'DELETE' })
      toast.success('Configuração excluída com sucesso!')
      await loadSystemSettings()
    } catch (err) {
      console.error('Failed to delete system setting:', err)
      toast.error('Erro ao excluir configuração')
    }
  }

  // Detect if a setting is numeric (percentages, cents, levels, points, etc.)
  // so the edit dialog shows a numeric input. Anything else stays free text.
  const isNumericSetting = (key: string): boolean =>
    /(_cents|_pct|_pct_level_|levels|width|salesLimit|per_referral|per_purchase|per_cashback_claim|daily_login|per_star|_goal_rides|_bonus_cents|_levels_entrada|_levels_residual|_levels_vendas)$/i.test(key) ||
    /^matrix\..*\.(pct_level_|pct_per_level|levels|width|base_cents|salesLimit)/i.test(key) ||
    /^cashback\..*_pct$/i.test(key) ||
    /^saque\.(min_cents|max_cents|fee_pct)$/i.test(key) ||
    /^pontos\.(per_referral|per_purchase|per_cashback_claim|daily_login|per_star)$/i.test(key) ||
    /^metas\.(daily_goal_rides|monthly_goal_rides|daily_bonus_cents|monthly_bonus_cents)$/i.test(key) ||
    /^plan\..*\.(price_cents|cashback_levels_entrada|cashback_levels_residual|cashback_levels_vendas)$/i.test(key) ||
    /^plan\.mensalidade_cents$/i.test(key) ||
    /^voucher\..*_cents$/i.test(key)

  // Client-side filter for the system-settings table. Combines search
  // (key/value/description) with category filter.
  const filteredSystemSettings = useMemo(() => {
    const q = systemSettingSearch.trim().toLowerCase()
    return systemSettings.filter((t) => {
      if (
        systemSettingCategoryFilter !== 'all' &&
        t.category !== systemSettingCategoryFilter
      )
        return false
      if (!q) return true
      return (
        t.key.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      )
    })
  }, [systemSettings, systemSettingSearch, systemSettingCategoryFilter])

  // Group filtered settings by category for nicer display (each category
  // becomes a section with its own header). Preserves the search/filter
  // behavior — only filtered settings are grouped.
  const groupedSystemSettings = useMemo(() => {
    const groups: Record<string, SystemSettingItem[]> = {}
    for (const s of filteredSystemSettings) {
      const cat = s.category || 'geral'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(s)
    }
    // Sort categories in a fixed, human-friendly order (matrizes first,
    // since it's the most-used) then alphabetical for any custom ones.
    const order = [
      'matrizes', 'cashback', 'planos', 'saques', 'pontos',
      'vouchers', 'metas', 'geral', 'menu', 'dashboard',
    ]
    return Object.entries(groups).sort((a, b) => {
      const ia = order.indexOf(a[0])
      const ib = order.indexOf(b[0])
      if (ia === -1 && ib === -1) return a[0].localeCompare(b[0])
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  }, [filteredSystemSettings])

  // ---------- Service Types (Item 8 — admin CRUD) ----------
  const [serviceTypes, setServiceTypes] = useState<AdminServiceType[]>([])
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false)
  const [serviceTypeDialogOpen, setServiceTypeDialogOpen] = useState(false)
  const [editingServiceType, setEditingServiceType] = useState<AdminServiceType | null>(null)
  const [serviceTypeForm, setServiceTypeForm] = useState({
    name: '', icon: '', isActive: true, sortOrder: 99,
  })
  const [serviceTypeSaving, setServiceTypeSaving] = useState(false)

  // ---------- Game Config (inside Bets tab) ----------
  const [gameConfigs, setGameConfigs] = useState<GameConfigItem[]>([])
  const [gameConfigLoading, setGameConfigLoading] = useState(false)
  const [gameConfigDialogOpen, setGameConfigDialogOpen] = useState(false)
  const [editingGameConfig, setEditingGameConfig] = useState<GameConfigItem | null>(null)
  const [gameConfigForm, setGameConfigForm] = useState({
    gameCode: '', name: '', description: '', pointsPerWin: 10, pointsPerPlay: 1,
    cashbackPerWin: 0, minBetCents: 0, maxPlaysPerDay: 10, isActive: true,
  })
  const [gameConfigSaving, setGameConfigSaving] = useState(false)

  // ---------- Achievements ----------
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [achievementLoading, setAchievementLoading] = useState(false)
  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<AchievementItem | null>(null)
  const [achievementForm, setAchievementForm] = useState({
    code: '', name: '', description: '', icon: '', category: 'general',
    pointsReward: 0, targetValue: 1, isActive: true, sortOrder: 99,
  })
  const [achievementSaving, setAchievementSaving] = useState(false)

  // ---------- Career Plans ----------
  const [careerPlans, setCareerPlans] = useState<CareerPlanItem[]>([])
  const [careerPlanLoading, setCareerPlanLoading] = useState(false)
  const [careerPlanDialogOpen, setCareerPlanDialogOpen] = useState(false)
  const [editingCareerPlan, setEditingCareerPlan] = useState<CareerPlanItem | null>(null)
  // BACK-9 — careerPlanForm now has SEPARATE reward fields instead of one
  // combined "Tipo de Recompensa + Bônus" field. The legacy bonusCents /
  // rewardType fields are kept for backward compatibility with the API but
  // are derived from rewardWithdrawalCents on save.
  const [careerPlanForm, setCareerPlanForm] = useState({
    code: '', name: '', description: '', minPoints: 0,
    rewardWithdrawalCents: 0, // 9.1 — Carteira Saque (R$ cents)
    rewardShoppingCents: 0,   // 9.2 — Carteira Compras (R$ cents)
    rewardPoints: 0,          // 9.3 — Pontos (integer)
    gratification: '',        // 9.4 — free-text bonus description
    // Legacy fields — derived from rewardWithdrawalCents on save.
    bonusCents: 0,
    rewardType: 'real' as 'real' | 'points',
    color: '#6b7280', icon: '🏅', isActive: true, sortOrder: 99,
  })
  const [careerPlanSaving, setCareerPlanSaving] = useState(false)

  // ---------- Driver Categories (Safira → Imperial) ----------
  // Categoria de VEÍCULO do motorista. NÃO é o CareerPlan (que é por
  // careerPoints). Aqui é: meta mensal de corridas + bônus se bater +
  // limite de cancelamentos (0 = tolerância zero / idoso).
  const [driverCategories, setDriverCategories] = useState<AdminDriverCategory[]>([])
  const [driverCategoriesLoading, setDriverCategoriesLoading] = useState(false)
  const [editingDriverCategory, setEditingDriverCategory] = useState<AdminDriverCategory | null>(null)
  const [driverCategoryDialogOpen, setDriverCategoryDialogOpen] = useState(false)
  const [driverCategoryFormData, setDriverCategoryFormData] = useState({
    code: '',
    name: '',
    description: '',
    sortOrder: 0,
    monthlyTripsTarget: 0,
    bonusCents: 0,
    maxCancellationPerMonth: 2,
    color: '#06b6d4',
    icon: '🔷',
    isActive: true,
  })
  const [savingDriverCategory, setSavingDriverCategory] = useState(false)

  // ---------- Streak Rewards ----------
  const [streakRewards, setStreakRewards] = useState<StreakRewardItem[]>([])
  const [streakRewardLoading, setStreakRewardLoading] = useState(false)
  const [streakRewardDialogOpen, setStreakRewardDialogOpen] = useState(false)
  const [editingStreakReward, setEditingStreakReward] = useState<StreakRewardItem | null>(null)
  const [streakRewardForm, setStreakRewardForm] = useState({
    streakDays: 7, rewardType: 'points', rewardAmount: 0, description: '', isActive: true,
  })
  const [streakRewardSaving, setStreakRewardSaving] = useState(false)

  // ---------- Events ----------
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventLoading, setEventLoading] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '', description: '', type: 'webinar', status: 'upcoming',
    eventDate: '', endDate: '', location: '', meetingUrl: '',
    maxAttendees: 0, imageUrl: '', isActive: true,
  })
  const [eventSaving, setEventSaving] = useState(false)

  // ---------- FAQ ----------
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [faqLoading, setFaqLoading] = useState(false)
  const [faqDialogOpen, setFaqDialogOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null)
  const [faqForm, setFaqForm] = useState({
    question: '', answer: '', category: 'geral', isActive: true, sortOrder: 99,
  })
  const [faqSaving, setFaqSaving] = useState(false)

  const isAdmin = user?.role === 'admin'

  // Per-role page permissions (Task 16-B). Super admins bypass the fetch
  // and always see everything. Sub-admin roles are filtered by the
  // per-role allow-list stored in the database.
  const { canAccess, loading: permissionsLoading } = useAdminPermissions(user)

  useEffect(() => {
    loadStats()
  }, [])

  // ADM-4 — load custom roles once so the Role Selects in both the Create
  // and Edit user dialogs can list roles the admin created in the
  // Permissões tab (e.g. financeiro, marketing). Errors are swallowed
  // silently — the selects still work with just the base roles.
  useEffect(() => {
    if (!user?.id) return
    apiFetch<{ permissions: Record<string, string[]> }>(`/admin/permissions?userId=${user.id}`)
      .then((res) => {
        if (res?.permissions) setCustomRoles(Object.keys(res.permissions))
      })
      .catch(() => { /* no-op */ })
    // Pré-carrega planos para os dropdowns de Criar/Editar Usuário e filtro
    // da listagem — não depende mais da aba Plans estar aberta.
    loadPlans()
  }, [user?.id])

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'config') loadConfigs()
    if (activeTab === 'announcements') loadAnnouncements()
    if (activeTab === 'plans') { loadPlans(); loadMatrixTypes() }
    if (activeTab === 'withdrawals') loadWithdrawals()
    if (activeTab === 'cashback') loadCashback()
    if (activeTab === 'financial') loadFinancial()
    if (activeTab === 'tickets') loadTickets()
    // Also load financial data for the gratifications admin page (which shows summary)
    if (activeTab === 'gratifications') {
      loadFinancial()
      loadDriverGoalsTarget()
      loadGoalConfigs()
      // Tarefa (22/09): carrega tipos de usuário do banco para preencher
      // as Qualificações Permitidas e os selects de Benefícios
      if (availableUserTypes.length === 0 && user?.id) {
        apiFetch<{ types: Array<{ id: string; code: string; label: string; icon: string | null }> }>(
          `/admin/user-types?userId=${user.id}`,
        )
          .then((data) => setAvailableUserTypes(data?.types || []))
          .catch(() => {})
      }
    }
    // New tabs
    if (activeTab === 'vouchers') loadVouchers()
    if (activeTab === 'bets') { loadBets(); loadGameConfigs() }
    if (activeTab === 'cashback-config') {
      loadCashbackConfig()
      loadPointsConfig()
    }
    if (activeTab === 'achievements') loadAchievements()
    if (activeTab === 'career-plans') loadCareerPlans()
    if (activeTab === 'driver-categories') loadDriverCategories()
    if (activeTab === 'streak-rewards') loadStreakRewards()
    if (activeTab === 'events') loadEvents()
    if (activeTab === 'faq') loadFAQs()
    if (activeTab === 'service-types') loadServiceTypes()
    if (activeTab === 'content-texts') loadContentTexts()
    if (activeTab === 'system-settings') loadSystemSettings()
    if (activeTab === 'matrices') {
      loadMatrixLimits()
      // TASK MATRIX-EDITOR: load MatrixType + MatrixPosition data for the
      // "Modo Avançado" inline editor. loadMatrixTypes also refreshes the
      // existing matrixTypes state used by the Plans tab.
      loadMatrixTypes()
      loadMatrixPositions()
    }
  }, [activeTab, searchQuery, planFilter, statusFilter, noSponsorFilter, userPage, withdrawalStatusFilter, cashbackTypeFilter, cashbackUserFilter, ticketStatusFilter, ticketPriorityFilter, voucherStatusFilter, voucherPage, betStatusFilter, betPage, matrixSelectedUser, matrixType, loadContentTexts, loadSystemSettings, loadMatrixLimits, loadMatrixPositions])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await apiFetch<AdminStats>(`/admin/stats?userId=${user?.id}`)
      setStats(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({ userId: user?.id || '', search: searchQuery, plan: planFilter, status: statusFilter, page: String(userPage) })
      // Item 13: forward the "Sem patrocinador" toggle to the API so the
      // server filters by referredById=null AND role != 'admin'.
      if (noSponsorFilter) params.set('noSponsor', 'true')
      const data = await apiFetch<{ users: AdminUser[]; total: number; page: number; totalPages: number }>(`/admin/users?${params}`)
      setUsers(data)
    } catch { /* ignore */ }
  }

  const loadConfigs = async () => {
    try {
      const data = await apiFetch<SystemConfigs>(`/admin/config?userId=${user?.id}`)
      setConfigs(data)
    } catch { /* ignore */ }
  }

  const loadAnnouncements = async () => {
    try {
      const data = await apiFetch<AdminAnnouncement[]>(`/admin/announcements?userId=${user?.id}`)
      setAnnouncements(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  const loadPlans = async () => {
    try {
      const data = await apiFetch<{ plans: AdminPlan[] }>(`/admin/plans?userId=${user?.id}`)
      setPlans(data.plans || [])
    } catch { /* ignore */ }
  }

  const loadWithdrawals = async () => {
    try {
      const params = new URLSearchParams({ userId: user?.id || '', status: withdrawalStatusFilter })
      const data = await apiFetch<{ withdrawals: AdminWithdrawal[]; total: number; page: number; totalPages: number; stats: WithdrawalStats }>(`/admin/withdrawals?${params}`)
      setWithdrawals(data)
    } catch { /* ignore */ }
  }

  const loadCashback = async () => {
    try {
      const params = new URLSearchParams({
        userId: user?.id || '',
        type: cashbackTypeFilter,
        filterUserId: cashbackUserFilter,
      })
      const data = await apiFetch<CashbackData>(`/admin/cashback?${params}`)
      setCashbackData(data)
    } catch { /* ignore */ }

    // Also fetch the matrix overview (independent of cashback entries —
    // shows the real network structure even when no cashback has been paid yet)
    try {
      setMatrixOverviewLoading(true)
      const mo = await apiFetch<MatrixOverviewData>(`/admin/cashback/matrix-overview?userId=${user?.id || ''}`)
      setMatrixOverview(mo)
    } catch { /* ignore */ } finally {
      setMatrixOverviewLoading(false)
    }
  }

  const loadFinancial = async () => {
    try {
      const data = await apiFetch<FinancialData>(`/admin/financial?userId=${user?.id}`)
      setFinancialData(data)
    } catch { /* ignore */ }
  }

  // Tarefa (22/09): Saque do lucro da empresa (só admin/geral dono)
  const handleCompanyWithdrawal = async () => {
    if (!user?.id) return
    const amount = parseFloat(companyWithdrawalAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Valor inválido')
      return
    }
    if (!companyWithdrawalPurpose.trim()) {
      toast.error('Informe a finalidade do saque')
      return
    }
    if (!confirm(`Confirmar saque do lucro da empresa no valor de R$ ${amount.toFixed(2)}?\nFinalidade: ${companyWithdrawalPurpose.trim()}`)) {
      return
    }
    setCompanyWithdrawalLoading(true)
    try {
      const cents = Math.round(amount * 100)
      await apiFetch('/admin/financial/company-withdrawal', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          amountCents: cents,
          purpose: companyWithdrawalPurpose.trim(),
        }),
      })
      toast.success('Saque do lucro da empresa realizado com sucesso')
      setCompanyWithdrawalAmount('')
      setCompanyWithdrawalPurpose('')
      await loadFinancial()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao sacar lucro da empresa')
    } finally {
      setCompanyWithdrawalLoading(false)
    }
  }

  // Item 2 — saveSalesLimit removido. Substituído por saveMatrixLimit(matrix)
  // que aceita 'entrada' | 'residual' | 'vendas' e salva em R$ (centavos).

  // BACK-7 + Task 2-c / Item 7 — load the driver-goals benefit target config
  // (overall module visibility) AND the per-benefit targets from the API.
  // Also loads the new array-based `allowedQualifications` (Item 7.3) which
  // is the preferred gate for the Metas module.
  const loadDriverGoalsTarget = async () => {
    if (!user?.id) return
    setDriverGoalsTargetLoading(true)
    setAllowedQualificationsLoading(true)
    try {
      const data = await apiFetch<{
        targetQualification: string
        allowedQualifications?: string[]
        benefitTargets?: Record<string, string>
        benefits?: Array<{ type: string; name: string; category: string; amount: number; description: string }>
      }>(`/admin/gratifications-config?userId=${user.id}`)
      if (data?.targetQualification) {
        setDriverGoalsTarget(data.targetQualification)
      }
      if (data?.benefitTargets) {
        setBenefitTargets(data.benefitTargets as Record<string, string>)
      }
      if (data?.benefits && data.benefits.length > 0) {
        setBenefitCatalog(data.benefits)
      }
      // Task 2-c / Item 7.3 — preferred array-based allowed qualifications.
      // Falls back to the default ['motorista','entregador'] when missing.
      if (Array.isArray(data?.allowedQualifications)) {
        setAllowedQualifications(data.allowedQualifications as string[])
      }
    } catch {
      // Ignore — keep defaults ('ambos', empty benefitTargets, default array).
    } finally {
      setDriverGoalsTargetLoading(false)
      setAllowedQualificationsLoading(false)
    }
  }

  // BACK-7 + Task 2-c / Item 7 — save the OVERALL module visibility config.
  const saveDriverGoalsTarget = async (target: string) => {
    if (!user?.id) return
    setDriverGoalsTargetSaving(true)
    try {
      await apiFetch(`/admin/gratifications-config`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, targetQualification: target }),
      })
      setDriverGoalsTarget(target)
      toast.success('Visibilidade do módulo Metas atualizada com sucesso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração de metas')
    } finally {
      setDriverGoalsTargetSaving(false)
    }
  }

  // Task 2-c / Item 7.3 (admin form) — toggle a single qualification code in
  // the `allowedQualifications` array and persist the full new array. The
  // backend stores it as a JSON string on SystemConfig under the key
  // `metas.allowedQualifications`.
  const toggleAllowedQualification = async (code: string) => {
    if (!user?.id) return
    const lower = code.toLowerCase()
    // Compute the next array locally first so the UI updates immediately
    // (optimistic). The PUT replaces the whole array atomically.
    const next = allowedQualifications.includes(lower)
      ? allowedQualifications.filter((c) => c !== lower)
      : [...allowedQualifications, lower]
    setAllowedQualifications(next)
    setAllowedQualificationsSaving(true)
    try {
      await apiFetch(`/admin/gratifications-config`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, allowedQualifications: next }),
      })
      toast.success(
        next.length === 0
          ? 'Módulo Metas oculto para todos os usuários (lista vazia).'
          : `Módulo Metas visível para: ${next.map((c) => c === 'motorista' ? 'Motorista' : 'Entregador').join(', ')}`
      )
    } catch (err) {
      // Revert on error
      setAllowedQualifications(allowedQualifications)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar qualificações permitidas')
    } finally {
      setAllowedQualificationsSaving(false)
    }
  }

  // Task 2-c / Item 7.3 — save the per-benefit target qualification.
  // Sends the FULL benefitTargets object (with the updated key) so the API
  // can upsert it as a single JSON blob in SystemConfig.
  const saveBenefitTarget = async (benefitType: string, target: string) => {
    if (!user?.id) return
    setBenefitTargetSavingKey(benefitType)
    try {
      const nextTargets = { ...benefitTargets, [benefitType]: target }
      await apiFetch(`/admin/gratifications-config`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, benefitTargets: nextTargets }),
      })
      setBenefitTargets(nextTargets)
      toast.success(`Benefício '${benefitType}' atualizado para: ${target === 'motorista' ? 'Motorista' : target === 'entregador' ? 'Entregador' : 'Ambos'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar benefício')
    } finally {
      setBenefitTargetSavingKey(null)
    }
  }

  const loadTickets = async () => {
    try {
      const params = new URLSearchParams({ userId: user?.id || '', status: ticketStatusFilter, priority: ticketPriorityFilter })
      const data = await apiFetch<{ tickets: AdminTicket[] }>(`/admin/support/tickets?${params}`)
      setTickets(data.tickets || [])
    } catch { /* ignore */ }
  }

  // ---------- Vouchers ----------
  const loadVouchers = async () => {
    setVoucherLoading(true)
    try {
      const data = await adminApi.getVouchers(user?.id || '', voucherPage, 20)
      setVoucherData(data)
    } catch { /* ignore */ } finally { setVoucherLoading(false) }
  }

  const handleCreateVoucher = async () => {
    const amountBrl = parseFloat(voucherForm.amountBrl.replace(',', '.'))
    if (isNaN(amountBrl) || amountBrl <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    const amountInCents = Math.round(amountBrl * 100)
    setVoucherSaving(true)
    try {
      await adminApi.createVoucher(user?.id || '', {
        type: voucherForm.type,
        amount: amountInCents,
        targetUserId: voucherForm.targetUserId || undefined,
        code: voucherForm.code || undefined,
        expiresAt: voucherForm.expiresAt ? new Date(voucherForm.expiresAt).toISOString() : undefined,
        description: voucherForm.description || undefined,
      })
      toast.success('Voucher criado com sucesso!')
      setVoucherCreateOpen(false)
      setVoucherForm({ type: 'mobility', amountBrl: '', targetUserId: '', code: '', expiresAt: '', description: '' })
      loadVouchers()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar voucher')
    } finally { setVoucherSaving(false) }
  }

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!confirm('Excluir este voucher? Esta ação não pode ser desfeita.')) return
    try {
      await adminApi.deleteVoucher(user?.id || '', voucherId)
      toast.success('Voucher excluído')
      loadVouchers()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir voucher')
    }
  }

  const handleUpdateVoucherStatus = async (voucherId: string, status: string) => {
    try {
      await adminApi.updateVoucher(user?.id || '', voucherId, status)
      toast.success(`Status atualizado: ${status}`)
      loadVouchers()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar voucher')
    }
  }

  // ---------- Bets ----------
  const loadBets = async () => {
    setBetLoading(true)
    try {
      const data = await adminApi.getBets(user?.id || '', betStatusFilter, betPage, 20)
      setBetData(data)
    } catch { /* ignore */ } finally { setBetLoading(false) }
  }

  const handleSettleBet = async (result: 'won' | 'lost') => {
    if (!betSettleTarget) return
    setBetSettling(true)
    try {
      await adminApi.settleBet(user?.id || '', betSettleTarget.id, result)
      toast.success(`Aposta finalizada como ${result === 'won' ? 'Ganha' : 'Perdida'}`)
      setBetSettleOpen(false)
      setBetSettleTarget(null)
      loadBets()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao finalizar aposta')
    } finally { setBetSettling(false) }
  }

  const handleCancelBet = async () => {
    if (!betCancelTarget) return
    setBetCancelling(true)
    try {
      await adminApi.cancelBet(user?.id || '', betCancelTarget.id, betCancelReason || undefined)
      toast.success('Aposta cancelada e valor estornado')
      setBetCancelOpen(false)
      setBetCancelTarget(null)
      setBetCancelReason('')
      loadBets()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cancelar aposta')
    } finally { setBetCancelling(false) }
  }

  // ---------- Matrices ----------
  const searchUsersForMatrix = async () => {
    if (!matrixSearchQuery.trim()) return
    setMatrixSearchLoading(true)
    try {
      const data = await adminApi.getUsers(user?.id || '', { search: matrixSearchQuery, page: 1 })
      setMatrixSearchResults(data.users || [])
    } catch { /* ignore */ } finally { setMatrixSearchLoading(false) }
  }

  const selectUserForMatrix = async (u: AdminUser) => {
    setMatrixSelectedUser(u)
    setMatrixSearchResults([])
    setMatrixSearchQuery('')
    setMatrixLoading(true)
    setReferralTreeLoading(true)
    // Auto-expand the root node so its direct referrals are visible
    setReferralExpanded(new Set([u.id]))
    // Matrix tree will be loaded by the useEffect watching [matrixType, matrixSelectedUser]
    // We just need to fetch the referral tree here.
    // The admin user tree API returns { tree, levelCounts, ... } — we only want
    // the root node (with nested children) for rendering.
    try {
      const resp = await adminApi.getUserTree(user?.id || '', u.id).catch(() => null)
      const rootNode = (resp && (resp as any).tree) ? (resp as any).tree : null
      setReferralTree(rootNode)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar árvore de indicações')
      setReferralTree(null)
    } finally {
      setReferralTreeLoading(false)
      // matrixLoading will be reset by the useEffect when matrix fetch completes
    }
  }

  const toggleReferralNode = (id: string) => {
    setReferralExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAllReferralNodes = () => {
    const all = new Set<string>()
    const collect = (n: ReferralTreeNode | null) => {
      if (!n) return
      all.add(n.id)
      n.children?.forEach(collect)
    }
    collect(referralTree)
    setReferralExpanded(all)
  }

  const collapseAllReferralNodes = () => {
    setReferralExpanded(referralTree ? new Set([referralTree.id]) : new Set())
  }

  // Re-fetch matrix when matrixType or selected user changes
  useEffect(() => {
    if (!matrixSelectedUser) return
    let cancelled = false
    setMatrixLoading(true)
    adminApi.getUserMatrix(user?.id || '', matrixSelectedUser.id, matrixType)
      .then((data) => { if (!cancelled) setMatrixData(data) })
      .catch(() => { if (!cancelled) setMatrixData(null) })
      .finally(() => { if (!cancelled) setMatrixLoading(false) })
    return () => { cancelled = true }
  }, [matrixType, matrixSelectedUser, user?.id])

  // ---------- Cashback / Points Config ----------
  const loadCashbackConfig = async () => {
    setCashbackConfigLoading(true)
    try {
      const data = await adminApi.getCashbackConfig(user?.id || '')
      setCashbackConfig(data)
    } catch { /* ignore */ } finally { setCashbackConfigLoading(false) }
  }

  const loadPointsConfig = async () => {
    try {
      const data = await adminApi.getPointsConfig(user?.id || '')
      setPointsConfig(data)
    } catch { /* ignore */ }
  }

  const handleSaveCashbackConfig = async (type: 'entrada' | 'residual' | 'vendas') => {
    if (!cashbackConfig) return
    setCashbackSaving(true)
    try {
      const configs = { [type]: cashbackConfig[type] }
      await adminApi.updateCashbackConfig(user?.id || '', configs)
      toast.success(`Configuração de cashback ${type} salva!`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar cashback')
    } finally { setCashbackSaving(false) }
  }

  const handleSavePointsConfig = async () => {
    if (!pointsConfig) return
    setPointsSaving(true)
    try {
      const { raw, ...configs } = pointsConfig
      await adminApi.updatePointsConfig(user?.id || '', configs)
      toast.success('Configuração de pontos salva!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar pontos')
    } finally { setPointsSaving(false) }
  }

  // ---------- Release Balance ----------
  const handleOpenReleaseBalance = (u: ViewUserData) => {
    setReleaseBalanceTarget(u)
    setReleaseBalanceForm({ wallet: 'balanceWithdrawal', amountBrl: '', description: '' })
    setReleaseBalanceOpen(true)
  }

  const handleReleaseBalance = async () => {
    if (!releaseBalanceTarget) return
    const amountBrl = parseFloat(releaseBalanceForm.amountBrl.replace(',', '.'))
    if (isNaN(amountBrl) || amountBrl <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!releaseBalanceForm.description.trim()) {
      toast.error('Informe uma descrição')
      return
    }
    const amountInCents = Math.round(amountBrl * 100)
    setReleaseBalanceSaving(true)
    try {
      await adminApi.releaseBalance(user?.id || '', releaseBalanceTarget.id, releaseBalanceForm.wallet, amountInCents, releaseBalanceForm.description)
      toast.success(`Saldo liberado: ${formatCurrency(amountInCents)} para ${releaseBalanceTarget.name}`)
      setReleaseBalanceOpen(false)
      setReleaseBalanceTarget(null)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao liberar saldo')
    } finally { setReleaseBalanceSaving(false) }
  }

  // ---------- Create Gratification ----------
  // ADM-2: robust user search with debounce, loading spinner, empty state and
  // error toast. The previous version required the admin to press Enter/click
  // and silently swallowed errors, which made the dialog look "stuck".
  const searchUsersForGratification = useCallback(async (query?: string) => {
    const term = (query ?? gratificationUserSearch).trim()
    setGratificationUserSearched(true)
    setGratificationUserLoading(true)
    try {
      const params: { search?: string; page: number } = { page: 1 }
      if (term) params.search = term
      const data = await adminApi.getUsers(user?.id || '', params)
      setGratificationUserResults((data.users || []).slice(0, 10))
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao buscar usuários')
      setGratificationUserResults([])
    } finally {
      setGratificationUserLoading(false)
    }
  }, [gratificationUserSearch, user?.id])

  // Debounced auto-search (300ms) — runs whenever the search input changes.
  // Clear the timer on cleanup to avoid duplicate calls.
  useEffect(() => {
    if (!gratificationCreateOpen) return
    if (gratificationSearchTimer.current) clearTimeout(gratificationSearchTimer.current)
    gratificationSearchTimer.current = setTimeout(() => {
      searchUsersForGratification()
    }, 300)
    return () => {
      if (gratificationSearchTimer.current) clearTimeout(gratificationSearchTimer.current)
    }
  }, [gratificationUserSearch, gratificationCreateOpen, searchUsersForGratification])

  // Pre-populate the search with the first 10 users when the dialog opens, so
  // the admin sees options immediately without having to type anything.
  useEffect(() => {
    if (!gratificationCreateOpen) return
    setGratificationUserSearched(false)
    setGratificationUserSearch('')
    setGratificationUserResults([])
    searchUsersForGratification('')
  }, [gratificationCreateOpen, searchUsersForGratification])

  const handleCreateGratification = async () => {
    if (!gratificationForm.targetUserId) {
      toast.error('Selecione um usuário')
      return
    }
    if (!gratificationForm.name.trim()) {
      toast.error('Informe um nome para a gratificação')
      return
    }
    const amountBrl = parseFloat(gratificationForm.amountBrl.replace(',', '.'))
    if (isNaN(amountBrl) || amountBrl <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    const amountInCents = Math.round(amountBrl * 100)
    setGratificationSaving(true)
    try {
      await apiFetch('/admin/gratifications/assign', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          targetUserId: gratificationForm.targetUserId,
          name: gratificationForm.name.trim(),
          type: gratificationForm.type,
          amount: amountInCents,
          category: gratificationForm.category,
          // qualification = PT-BR human-readable text describing the requirement
          // to claim this gratification (e.g. "Ao fechar o 5º nível"). Persisted
          // onto the Gratification.qualification column on the backend.
          qualification: gratificationForm.qualification.trim() || null,
          description: gratificationForm.description.trim()
            ? gratificationForm.description.trim()
            : gratificationForm.name.trim(),
        }),
      })
      toast.success('Gratificação criada com sucesso!')
      setGratificationCreateOpen(false)
      setGratificationForm({
        targetUserId: '',
        name: '',
        type: 'leadership',
        amountBrl: '',
        category: 'gratification',
        qualification: '',
        description: '',
      })
      setGratificationUserSearch('')
      setGratificationUserResults([])
      // Refresh the financial summary so the new gratification shows up in the
      // admin "Distribuição por Categoria" panel without a manual reload.
      loadFinancial()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar gratificação')
    } finally { setGratificationSaving(false) }
  }

  // ---------- Game Config ----------
  const loadGameConfigs = async () => {
    setGameConfigLoading(true)
    try {
      const data = await apiFetch<{ configs: GameConfigItem[] }>(`/admin/game-config?userId=${user?.id}`)
      setGameConfigs(data.configs || [])
    } catch { /* ignore */ } finally { setGameConfigLoading(false) }
  }

  const handleOpenCreateGameConfig = () => {
    setEditingGameConfig(null)
    setGameConfigForm({
      gameCode: '', name: '', description: '', pointsPerWin: 10, pointsPerPlay: 1,
      cashbackPerWin: 0, minBetCents: 0, maxPlaysPerDay: 10, isActive: true,
    })
    setGameConfigDialogOpen(true)
  }

  const handleOpenEditGameConfig = (g: GameConfigItem) => {
    setEditingGameConfig(g)
    setGameConfigForm({
      gameCode: g.gameCode,
      name: g.name,
      description: g.description || '',
      pointsPerWin: g.pointsPerWin,
      pointsPerPlay: g.pointsPerPlay,
      cashbackPerWin: g.cashbackPerWin,
      minBetCents: g.minBetCents,
      maxPlaysPerDay: g.maxPlaysPerDay,
      isActive: g.isActive,
    })
    setGameConfigDialogOpen(true)
  }

  const handleSaveGameConfig = async () => {
    if (!gameConfigForm.gameCode || !gameConfigForm.name) {
      toast.error('Preencha código e nome do jogo')
      return
    }
    setGameConfigSaving(true)
    try {
      const payload: Record<string, unknown> = {
        userId: user?.id,
        gameCode: gameConfigForm.gameCode,
        name: gameConfigForm.name,
        description: gameConfigForm.description || undefined,
        pointsPerWin: Number(gameConfigForm.pointsPerWin) || 0,
        pointsPerPlay: Number(gameConfigForm.pointsPerPlay) || 0,
        cashbackPerWin: Number(gameConfigForm.cashbackPerWin) || 0,
        minBetCents: Number(gameConfigForm.minBetCents) || 0,
        maxPlaysPerDay: Number(gameConfigForm.maxPlaysPerDay) || 0,
        isActive: Boolean(gameConfigForm.isActive),
      }
      if (editingGameConfig) {
        await apiFetch(`/admin/game-config/${editingGameConfig.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        })
        toast.success('Configuração de jogo atualizada!')
      } else {
        await apiFetch('/admin/game-config', {
          method: 'POST', body: JSON.stringify(payload),
        })
        toast.success('Configuração de jogo criada!')
      }
      setGameConfigDialogOpen(false)
      loadGameConfigs()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar configuração')
    } finally { setGameConfigSaving(false) }
  }

  const handleDeleteGameConfig = async (id: string) => {
    if (!confirm('Excluir esta configuração de jogo?')) return
    try {
      await apiFetch(`/admin/game-config/${id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Configuração excluída')
      loadGameConfigs()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  // ---------- Service Types (Item 8 — admin CRUD) ----------
  const loadServiceTypes = async () => {
    setServiceTypesLoading(true)
    try {
      const data = await apiFetch<{ types: AdminServiceType[] }>(`/admin/service-types?userId=${user?.id}`)
      setServiceTypes(data.types || [])
    } catch { /* ignore */ } finally { setServiceTypesLoading(false) }
  }

  const handleOpenCreateServiceType = () => {
    setEditingServiceType(null)
    setServiceTypeForm({ name: '', icon: '', isActive: true, sortOrder: 99 })
    setServiceTypeDialogOpen(true)
  }

  const handleOpenEditServiceType = (t: AdminServiceType) => {
    setEditingServiceType(t)
    setServiceTypeForm({
      name: t.name,
      icon: t.icon || '',
      isActive: t.isActive,
      sortOrder: t.sortOrder,
    })
    setServiceTypeDialogOpen(true)
  }

  const handleSaveServiceType = async () => {
    if (!serviceTypeForm.name.trim()) {
      toast.error('Informe o nome do tipo de serviço')
      return
    }
    setServiceTypeSaving(true)
    try {
      const payload: Record<string, unknown> = {
        userId: user?.id,
        name: serviceTypeForm.name.trim(),
        icon: serviceTypeForm.icon.trim() || null,
        isActive: Boolean(serviceTypeForm.isActive),
        sortOrder: Number(serviceTypeForm.sortOrder) || 99,
      }
      if (editingServiceType) {
        await apiFetch(`/admin/service-types/${editingServiceType.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        })
        toast.success('Tipo de serviço atualizado!')
      } else {
        await apiFetch('/admin/service-types', {
          method: 'POST', body: JSON.stringify(payload),
        })
        toast.success('Tipo de serviço criado!')
      }
      setServiceTypeDialogOpen(false)
      loadServiceTypes()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar tipo de serviço')
    } finally { setServiceTypeSaving(false) }
  }

  const handleToggleServiceTypeActive = async (t: AdminServiceType) => {
    try {
      await apiFetch(`/admin/service-types/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, isActive: !t.isActive }),
      })
      toast.success(t.isActive ? 'Tipo desativado' : 'Tipo ativado')
      loadServiceTypes()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alternar status')
    }
  }

  const handleDeleteServiceType = async (t: AdminServiceType) => {
    if (!confirm(`Excluir o tipo "${t.name}"?`)) return
    try {
      await apiFetch(`/admin/service-types/${t.id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Tipo excluído')
      loadServiceTypes()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir tipo')
    }
  }

  // ---------- Achievements ----------
  const loadAchievements = async () => {
    setAchievementLoading(true)
    try {
      const data = await apiFetch<{ achievements: AchievementItem[] }>(`/admin/achievements?userId=${user?.id}`)
      setAchievements(data.achievements || [])
    } catch { /* ignore */ } finally { setAchievementLoading(false) }
  }

  const handleOpenCreateAchievement = () => {
    setEditingAchievement(null)
    setAchievementForm({
      code: '', name: '', description: '', icon: '', category: 'general',
      pointsReward: 0, targetValue: 1, isActive: true, sortOrder: 99,
    })
    setAchievementDialogOpen(true)
  }

  const handleOpenEditAchievement = (a: AchievementItem) => {
    setEditingAchievement(a)
    setAchievementForm({
      code: a.code,
      name: a.name,
      description: a.description || '',
      icon: a.icon || '',
      category: a.category,
      pointsReward: a.pointsReward,
      targetValue: a.targetValue,
      isActive: a.isActive,
      sortOrder: a.sortOrder,
    })
    setAchievementDialogOpen(true)
  }

  const handleSaveAchievement = async () => {
    if (!achievementForm.code || !achievementForm.name) {
      toast.error('Preencha código e nome')
      return
    }
    setAchievementSaving(true)
    try {
      const payload: Record<string, unknown> = {
        userId: user?.id,
        code: achievementForm.code,
        name: achievementForm.name,
        description: achievementForm.description || undefined,
        icon: achievementForm.icon || undefined,
        category: achievementForm.category,
        pointsReward: Number(achievementForm.pointsReward) || 0,
        targetValue: Number(achievementForm.targetValue) || 1,
        isActive: Boolean(achievementForm.isActive),
        sortOrder: Number(achievementForm.sortOrder) || 0,
      }
      if (editingAchievement) {
        await apiFetch(`/admin/achievements/${editingAchievement.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        })
        toast.success('Conquista atualizada!')
      } else {
        await apiFetch('/admin/achievements', {
          method: 'POST', body: JSON.stringify(payload),
        })
        toast.success('Conquista criada!')
      }
      setAchievementDialogOpen(false)
      loadAchievements()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar conquista')
    } finally { setAchievementSaving(false) }
  }

  const handleDeleteAchievement = async (id: string) => {
    if (!confirm('Excluir esta conquista?')) return
    try {
      await apiFetch(`/admin/achievements/${id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Conquista excluída')
      loadAchievements()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  // ---------- Career Plans ----------
  const loadCareerPlans = async () => {
    setCareerPlanLoading(true)
    try {
      const data = await apiFetch<{ plans: CareerPlanItem[] }>(`/admin/career-plans?userId=${user?.id}`)
      setCareerPlans(data.plans || [])
    } catch { /* ignore */ } finally { setCareerPlanLoading(false) }
  }

  const handleOpenCreateCareerPlan = () => {
    setEditingCareerPlan(null)
    setCareerPlanForm({
      code: '', name: '', description: '', minPoints: 0,
      rewardWithdrawalCents: 0,
      rewardShoppingCents: 0,
      rewardPoints: 0,
      gratification: '',
      bonusCents: 0,
      rewardType: 'real',
      color: '#6b7280', icon: '🏅', isActive: true, sortOrder: 99,
    })
    setCareerPlanDialogOpen(true)
  }

  const handleOpenEditCareerPlan = (c: CareerPlanItem) => {
    setEditingCareerPlan(c)
    setCareerPlanForm({
      code: c.code,
      name: c.name,
      description: c.description || '',
      minPoints: c.minPoints,
      // BACK-9 — populate the separate reward fields from the API response.
      rewardWithdrawalCents: c.rewardWithdrawalCents ?? 0,
      rewardShoppingCents: c.rewardShoppingCents ?? 0,
      rewardPoints: c.rewardPoints ?? 0,
      gratification: c.gratification || '',
      bonusCents: c.bonusCents,
      rewardType: c.rewardType === 'points' ? 'points' : 'real',
      color: c.color || '#6b7280',
      icon: c.icon || '🏅',
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    })
    setCareerPlanDialogOpen(true)
  }

  const handleSaveCareerPlan = async () => {
    if (!careerPlanForm.code || !careerPlanForm.name) {
      toast.error('Preencha código e nome')
      return
    }
    setCareerPlanSaving(true)
    try {
      // BACK-9 — send all 4 new reward fields. The API mirrors
      // rewardWithdrawalCents into the legacy bonusCents/rewardType columns
      // for backward compatibility.
      const payload: Record<string, unknown> = {
        userId: user?.id,
        code: careerPlanForm.code,
        name: careerPlanForm.name,
        description: careerPlanForm.description || undefined,
        minPoints: Number(careerPlanForm.minPoints) || 0,
        rewardWithdrawalCents: Number(careerPlanForm.rewardWithdrawalCents) || 0,
        rewardShoppingCents: Number(careerPlanForm.rewardShoppingCents) || 0,
        rewardPoints: Number(careerPlanForm.rewardPoints) || 0,
        gratification: careerPlanForm.gratification || undefined,
        // Legacy fields — sent for backward compat with older API routes.
        bonusCents: Number(careerPlanForm.rewardWithdrawalCents) || Number(careerPlanForm.bonusCents) || 0,
        rewardType: careerPlanForm.rewardType,
        color: careerPlanForm.color || undefined,
        icon: careerPlanForm.icon || undefined,
        isActive: Boolean(careerPlanForm.isActive),
        sortOrder: Number(careerPlanForm.sortOrder) || 0,
      }
      if (editingCareerPlan) {
        await apiFetch(`/admin/career-plans/${editingCareerPlan.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        })
        toast.success('Plano de carreira atualizado!')
      } else {
        await apiFetch('/admin/career-plans', {
          method: 'POST', body: JSON.stringify(payload),
        })
        toast.success('Plano de carreira criado!')
      }
      setCareerPlanDialogOpen(false)
      loadCareerPlans()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar plano de carreira')
    } finally { setCareerPlanSaving(false) }
  }

  const handleDeleteCareerPlan = async (id: string) => {
    if (!confirm('Excluir este plano de carreira?')) return
    try {
      await apiFetch(`/admin/career-plans/${id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Plano de carreira excluído')
      loadCareerPlans()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  // ---------- Driver Categories (Safira → Imperial) ----------
  // Lista categorias de VEÍCULO do motorista. Cada uma tem meta mensal de
  // corridas, bônus em centavos (só pago se bater a meta), e limite de
  // cancelamentos por mês (0 = tolerância zero para categoria idoso).
  const loadDriverCategories = async () => {
    setDriverCategoriesLoading(true)
    try {
      const data = await apiFetch<{ categories: AdminDriverCategory[] }>(`/admin/driver-categories?userId=${user?.id}`)
      setDriverCategories(data.categories || [])
    } catch { /* ignore */ } finally { setDriverCategoriesLoading(false) }
  }

  const handleOpenCreateDriverCategory = () => {
    setEditingDriverCategory(null)
    setDriverCategoryFormData({
      code: '',
      name: '',
      description: '',
      sortOrder: 0,
      monthlyTripsTarget: 0,
      bonusCents: 0,
      maxCancellationPerMonth: 2,
      color: '#06b6d4',
      icon: '🔷',
      isActive: true,
    })
    setDriverCategoryDialogOpen(true)
  }

  const handleOpenEditDriverCategory = (c: AdminDriverCategory) => {
    setEditingDriverCategory(c)
    setDriverCategoryFormData({
      code: c.code,
      name: c.name,
      description: c.description || '',
      sortOrder: c.sortOrder,
      monthlyTripsTarget: c.monthlyTripsTarget,
      bonusCents: c.bonusCents,
      maxCancellationPerMonth: c.maxCancellationPerMonth,
      color: c.color || '#06b6d4',
      icon: c.icon || '🔷',
      isActive: c.isActive,
    })
    setDriverCategoryDialogOpen(true)
  }

  const handleSaveDriverCategory = async () => {
    if (!driverCategoryFormData.code || !driverCategoryFormData.name) {
      toast.error('Preencha código e nome')
      return
    }
    setSavingDriverCategory(true)
    try {
      const payload: Record<string, unknown> = {
        userId: user?.id,
        code: driverCategoryFormData.code,
        name: driverCategoryFormData.name,
        description: driverCategoryFormData.description || undefined,
        sortOrder: Number(driverCategoryFormData.sortOrder) || 0,
        monthlyTripsTarget: Number(driverCategoryFormData.monthlyTripsTarget) || 0,
        bonusCents: Number(driverCategoryFormData.bonusCents) || 0,
        maxCancellationPerMonth: Number(driverCategoryFormData.maxCancellationPerMonth) || 0,
        color: driverCategoryFormData.color || undefined,
        icon: driverCategoryFormData.icon || undefined,
        isActive: Boolean(driverCategoryFormData.isActive),
      }
      if (editingDriverCategory) {
        // PUT não permite alterar o code (campo unique).
        const { code: _omit, ...updatePayload } = payload
        await apiFetch(`/admin/driver-categories/${editingDriverCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        })
        toast.success('Categoria de motorista atualizada!')
      } else {
        await apiFetch('/admin/driver-categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Categoria de motorista criada!')
      }
      setDriverCategoryDialogOpen(false)
      loadDriverCategories()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar categoria de motorista')
    } finally { setSavingDriverCategory(false) }
  }

  const handleDeleteDriverCategory = async (id: string) => {
    if (!confirm('Excluir esta categoria de motorista? Se houver motoristas vinculados, será preciso reatribuí-los antes.')) return
    try {
      await apiFetch(`/admin/driver-categories/${id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Categoria de motorista excluída')
      loadDriverCategories()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir categoria')
    }
  }

  const handleToggleDriverCategoryActive = async (c: AdminDriverCategory) => {
    try {
      await apiFetch(`/admin/driver-categories/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, isActive: !c.isActive }),
      })
      toast.success(`Categoria ${!c.isActive ? 'ativada' : 'desativada'}`)
      loadDriverCategories()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alternar status')
    }
  }

  // ---------- Streak Rewards ----------
  const loadStreakRewards = async () => {
    setStreakRewardLoading(true)
    try {
      const data = await apiFetch<{ rewards: StreakRewardItem[] }>(`/admin/streak-rewards?userId=${user?.id}`)
      setStreakRewards(data.rewards || [])
    } catch { /* ignore */ } finally { setStreakRewardLoading(false) }
  }

  const handleOpenCreateStreakReward = () => {
    setEditingStreakReward(null)
    setStreakRewardForm({
      streakDays: 7, rewardType: 'points', rewardAmount: 0, description: '', isActive: true,
    })
    setStreakRewardDialogOpen(true)
  }

  const handleOpenEditStreakReward = (s: StreakRewardItem) => {
    setEditingStreakReward(s)
    setStreakRewardForm({
      streakDays: s.streakDays,
      rewardType: s.rewardType,
      rewardAmount: s.rewardAmount,
      description: s.description || '',
      isActive: s.isActive,
    })
    setStreakRewardDialogOpen(true)
  }

  const handleSaveStreakReward = async () => {
    if (!streakRewardForm.streakDays || Number(streakRewardForm.streakDays) <= 0) {
      toast.error('Informe uma quantidade de dias válida')
      return
    }
    setStreakRewardSaving(true)
    try {
      const payload: Record<string, unknown> = {
        userId: user?.id,
        streakDays: Number(streakRewardForm.streakDays),
        rewardType: streakRewardForm.rewardType,
        rewardAmount: Number(streakRewardForm.rewardAmount) || 0,
        description: streakRewardForm.description || undefined,
        isActive: Boolean(streakRewardForm.isActive),
      }
      if (editingStreakReward) {
        await apiFetch(`/admin/streak-rewards/${editingStreakReward.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        })
        toast.success('Recompensa atualizada!')
      } else {
        await apiFetch('/admin/streak-rewards', {
          method: 'POST', body: JSON.stringify(payload),
        })
        toast.success('Recompensa criada!')
      }
      setStreakRewardDialogOpen(false)
      loadStreakRewards()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar recompensa')
    } finally { setStreakRewardSaving(false) }
  }

  const handleDeleteStreakReward = async (id: string) => {
    if (!confirm('Excluir esta recompensa de sequência?')) return
    try {
      await apiFetch(`/admin/streak-rewards/${id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Recompensa excluída')
      loadStreakRewards()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  // ---------- Events ----------
  const loadEvents = async () => {
    setEventLoading(true)
    try {
      const data = await apiFetch<{ events: EventItem[] }>(`/admin/events?userId=${user?.id}`)
      setEvents(data.events || [])
    } catch { /* ignore */ } finally { setEventLoading(false) }
  }

  const handleOpenCreateEvent = () => {
    setEditingEvent(null)
    setEventForm({
      title: '', description: '', type: 'webinar', status: 'upcoming',
      eventDate: '', endDate: '', location: '', meetingUrl: '',
      maxAttendees: 0, imageUrl: '', isActive: true,
    })
    setEventDialogOpen(true)
  }

  const handleOpenEditEvent = (e: EventItem) => {
    setEditingEvent(e)
    setEventForm({
      title: e.title,
      description: e.description,
      type: e.type,
      status: e.status,
      eventDate: e.eventDate ? new Date(e.eventDate).toISOString().slice(0, 16) : '',
      endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 16) : '',
      location: e.location || '',
      meetingUrl: e.meetingUrl || '',
      maxAttendees: e.maxAttendees || 0,
      imageUrl: e.imageUrl || '',
      isActive: e.isActive,
    })
    setEventDialogOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.description || !eventForm.eventDate) {
      toast.error('Preencha título, descrição e data')
      return
    }
    setEventSaving(true)
    try {
      const payload: Record<string, unknown> = {
        userId: user?.id,
        title: eventForm.title,
        description: eventForm.description,
        type: eventForm.type,
        status: eventForm.status,
        eventDate: new Date(eventForm.eventDate).toISOString(),
        endDate: eventForm.endDate ? new Date(eventForm.endDate).toISOString() : undefined,
        location: eventForm.location || undefined,
        meetingUrl: eventForm.meetingUrl || undefined,
        maxAttendees: Number(eventForm.maxAttendees) || undefined,
        imageUrl: eventForm.imageUrl || undefined,
        isActive: Boolean(eventForm.isActive),
      }
      if (editingEvent) {
        await apiFetch(`/admin/events/${editingEvent.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        })
        toast.success('Evento atualizado!')
      } else {
        await apiFetch('/admin/events', {
          method: 'POST', body: JSON.stringify(payload),
        })
        toast.success('Evento criado!')
      }
      setEventDialogOpen(false)
      loadEvents()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar evento')
    } finally { setEventSaving(false) }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Excluir este evento? Todos os registros serão removidos.')) return
    try {
      await apiFetch(`/admin/events/${id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Evento excluído')
      loadEvents()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  // ---------- FAQ ----------
  const loadFAQs = async () => {
    setFaqLoading(true)
    try {
      const data = await apiFetch<{ faqs: FAQItem[] }>(`/admin/faq?userId=${user?.id}`)
      setFaqs(data.faqs || [])
    } catch { /* ignore */ } finally { setFaqLoading(false) }
  }

  const handleOpenCreateFaq = () => {
    setEditingFaq(null)
    setFaqForm({
      question: '', answer: '', category: 'geral', isActive: true, sortOrder: 99,
    })
    setFaqDialogOpen(true)
  }

  const handleOpenEditFaq = (f: FAQItem) => {
    setEditingFaq(f)
    setFaqForm({
      question: f.question,
      answer: f.answer,
      category: f.category,
      isActive: f.isActive,
      sortOrder: f.sortOrder,
    })
    setFaqDialogOpen(true)
  }

  const handleSaveFaq = async () => {
    if (!faqForm.question || !faqForm.answer) {
      toast.error('Preencha pergunta e resposta')
      return
    }
    setFaqSaving(true)
    try {
      const payload: Record<string, unknown> = {
        userId: user?.id,
        question: faqForm.question,
        answer: faqForm.answer,
        category: faqForm.category,
        isActive: Boolean(faqForm.isActive),
        sortOrder: Number(faqForm.sortOrder) || 0,
      }
      if (editingFaq) {
        await apiFetch(`/admin/faq/${editingFaq.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        })
        toast.success('FAQ atualizado!')
      } else {
        await apiFetch('/admin/faq', {
          method: 'POST', body: JSON.stringify(payload),
        })
        toast.success('FAQ criado!')
      }
      setFaqDialogOpen(false)
      loadFAQs()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar FAQ')
    } finally { setFaqSaving(false) }
  }

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Excluir esta pergunta frequente?')) return
    try {
      await apiFetch(`/admin/faq/${id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('FAQ excluído')
      loadFAQs()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  // ---------- Matrix view shortcut from Users tab ----------
  const handleViewUserMatrix = (u: AdminUser) => {
    setViewUserDialogOpen(false)
    setAdminActivePage('matrices')
    selectUserForMatrix(u)
  }

  const handleReplyTicket = async () => {
    if (!selectedTicket || !ticketReply.trim()) return
    setSendingReply(true)
    try {
      await apiFetch(`/admin/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, message: ticketReply }),
      })
      setTicketReply('')
      const data = await apiFetch<{ ticket: AdminTicket }>(`/admin/support/tickets/${selectedTicket.id}?userId=${user?.id}`)
      setSelectedTicket(data.ticket || data as unknown as AdminTicket)
      loadTickets()
      toast.success('Resposta enviada com sucesso!')
    } catch {
      toast.error('Erro ao enviar resposta')
    } finally {
      setSendingReply(false)
    }
  }

  const handleChangeTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      await apiFetch(`/admin/support/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, status: newStatus }),
      })
      loadTickets()
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null)
      }
      toast.success('Status atualizado!')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  // ---------- ADM-4 — Create User ----------
  // Opens the Create User dialog with the form reset to empty defaults.
  const handleOpenCreateUser = () => {
    setNewUserForm({
      name: '', email: '', password: '', phone: '', cpf: '',
      userType: 'usuario', role: 'user', plan: 'free', referredByCode: '',
      qualification: '',
      entradaLevel: 0,
      residualLevel: 0,
      vendasLevel: 0,
    })
    setCreateUserDialogOpen(true)
    // Lazy-load user types if not already loaded.
    if (availableUserTypes.length === 0 && user?.id) {
      apiFetch<{ types: Array<{ id: string; code: string; label: string; icon: string | null; defaultEntradaLevel: number; defaultResidualLevel: number; defaultVendasLevel: number }> }>(
        `/admin/user-types?userId=${user.id}`,
      )
        .then((data) => setAvailableUserTypes(data?.types || []))
        .catch(() => { /* silent — admin can still type without the dropdown */ })
    }
  }

  // When the admin selects a qualification in the create-user dialog, auto-fill
  // the matrix levels from the UserType defaults (admin can still override).
  const handleQualificationChange = (code: string) => {
    const t = availableUserTypes.find((x) => x.code === code)
    setNewUserForm((f) => ({
      ...f,
      qualification: code,
      entradaLevel: t?.defaultEntradaLevel ?? f.entradaLevel,
      residualLevel: t?.defaultResidualLevel ?? f.residualLevel,
      vendasLevel: t?.defaultVendasLevel ?? f.vendasLevel,
    }))
  }

  // Submits the Create User form to /api/admin/users/create. The created
  // user can immediately log in with the email + password defined here.
  const handleCreateUser = async () => {
    if (!user?.id) return
    if (!newUserForm.name.trim()) {
      toast.error('Informe o nome completo')
      return
    }
    if (!newUserForm.email.trim() || !/\S+@\S+\.\S+/.test(newUserForm.email)) {
      toast.error('Informe um email válido (será usado para login)')
      return
    }
    if (newUserForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setCreatingNewUser(true)
    try {
      await apiFetch('/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          name: newUserForm.name.trim(),
          email: newUserForm.email.trim(),
          password: newUserForm.password,
          phone: newUserForm.phone || undefined,
          cpf: newUserForm.cpf || undefined,
          plan: newUserForm.plan,
          role: newUserForm.role,
          userType: newUserForm.userType,
          referredByCode: newUserForm.referredByCode || undefined,
          qualification: newUserForm.qualification || undefined,
          entradaLevel: Number(newUserForm.entradaLevel) || 0,
          residualLevel: Number(newUserForm.residualLevel) || 0,
          vendasLevel: Number(newUserForm.vendasLevel) || 0,
        }),
      })
      toast.success('Usuário criado! Ele pode fazer login com email + senha.')
      setCreateUserDialogOpen(false)
      // Jump back to page 1 so the new user shows up at the top.
      setUserPage(1)
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setCreatingNewUser(false)
    }
  }

  // ---------- Config ----------
  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      await apiFetch('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, configs }),
      })
      toast.success('Configurações salvas com sucesso!')
    } catch { toast.error('Erro ao salvar configurações') } finally { setSavingConfig(false) }
  }

  // ---------- Announcements ----------
  const handleCreateAnnouncement = async () => {
    try {
      await apiFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, ...newAnnouncement }),
      })
      setShowNewAnnouncement(false)
      setNewAnnouncement({ title: '', message: '', type: 'info', priority: 'normal', actionLabel: '', actionUrl: '' })
      loadAnnouncements()
      toast.success('Anúncio criado com sucesso!')
    } catch { toast.error('Erro ao criar anúncio') }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await apiFetch(`/admin/announcements/${id}?userId=${user?.id}`, { method: 'DELETE' })
      loadAnnouncements()
      toast.success('Anúncio removido!')
    } catch { toast.error('Erro ao remover anúncio') }
  }

  const handleToggleAnnouncement = async (id: string, isActive: boolean) => {
    try {
      await apiFetch(`/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, isActive: !isActive }),
      })
      loadAnnouncements()
    } catch { /* ignore */ }
  }

  // ---------- User Edit ----------
  const handleOpenEditUser = (u: AdminUser) => {
    setEditingUser(u)
    setEditUserData({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      cpf: u.cpf || '',
      plan: u.plan || 'free',
      isActive: u.isActive,
      balanceWithdrawal: u.balanceWithdrawal || 0,
      balanceMobility: u.balanceMobility || 0,
      balanceShopping: u.balanceShopping || 0,
      balanceFood: u.balanceFood || 0,
      balancePharmacy: u.balancePharmacy || 0,
      balanceGratification: u.balanceGratification || 0,
      careerPoints: u.careerPoints || 0,
      personalPoints: u.personalPoints || 0,
      stars: u.stars || 0,
      city: u.city || '',
      state: u.state || '',
      country: u.country || 'BR',
      bankCode: u.bankCode || '',
      bankAgency: u.bankAgency || '',
      bankAccount: u.bankAccount || '',
      bankType: u.bankType || '',
      pixKey: u.pixKey || '',
      pixEnabled: u.pixEnabled || false,
      isDriver: u.isDriver || false,
      isDelivery: u.isDelivery || false,
      role: u.role || 'user',
      qualification: (u as AdminUser).qualification || '',
    })
    setEditUserDialogOpen(true)
    // Lazy-load user types so the Qualificação dropdown in the Edit dialog
    // is populated (same fetch as the Create dialog).
    if (availableUserTypes.length === 0 && user?.id) {
      apiFetch<{ types: Array<{ id: string; code: string; label: string; icon: string | null; defaultEntradaLevel: number; defaultResidualLevel: number; defaultVendasLevel: number }> }>(
        `/admin/user-types?userId=${user.id}`,
      )
        .then((data) => setAvailableUserTypes(data?.types || []))
        .catch(() => { /* silent — admin can still type without the dropdown */ })
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    setSavingUser(true)
    try {
      await apiFetch(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, ...editUserData }),
      })
      setEditUserDialogOpen(false)
      setEditingUser(null)
      loadUsers()
      toast.success('Usuário atualizado com sucesso!')
    } catch {
      toast.error('Erro ao atualizar usuário')
    } finally {
      setSavingUser(false)
    }
  }

  // ---------- Item 13: Vincular patrocinador ----------
  // Opens a dialog to assign a sponsor (referredById) to a user that was
  // created without one. The admin types the sponsor's email or referral
  // code; we resolve it via /api/referrals/validate (only validates codes)
  // and via /api/admin/users?search=... (resolves emails). The PUT itself
  // accepts id/email/referralCode and resolves server-side, so this
  // client-side lookup is purely a UX affordance.
  const handleOpenLinkSponsor = (u: AdminUser) => {
    setLinkSponsorTarget(u)
    setLinkSponsorQuery('')
    setLinkSponsorResolved(null)
    setLinkSponsorDialogOpen(true)
  }

  // Live-check the typed sponsor (debounced by the user's typing cadence —
  // we only check on blur and on Enter to avoid spamming the API on every
  // keystroke).
  const checkSponsorQuery = async (raw: string) => {
    const q = raw.trim()
    if (!q) {
      setLinkSponsorResolved(null)
      return
    }
    setLinkSponsorChecking(true)
    try {
      // First try the referral code validator (works for codes only).
      const codeRes = await fetch(`/api/referrals/validate?code=${encodeURIComponent(q.toUpperCase())}`)
      const codeData = await codeRes.json().catch(() => null)
      if (codeData?.valid && codeData?.referrerName) {
        setLinkSponsorResolved({ name: codeData.referrerName })
        return
      }
      // Fall back to the admin users search — this handles email matches.
      const searchRes = await fetch(`/api/admin/users?userId=${user?.id || ''}&search=${encodeURIComponent(q)}&limit=1`)
      const searchData = await searchRes.json().catch(() => null)
      const found = searchData?.users?.[0]
      if (found && (found.email?.toLowerCase() === q.toLowerCase() || found.referralCode?.toUpperCase() === q.toUpperCase())) {
        setLinkSponsorResolved({ name: `${found.name} (${found.email})` })
        return
      }
      setLinkSponsorResolved(null)
    } catch {
      setLinkSponsorResolved(null)
    } finally {
      setLinkSponsorChecking(false)
    }
  }

  const handleLinkSponsor = async () => {
    if (!linkSponsorTarget || !linkSponsorQuery.trim()) return
    if (!linkSponsorResolved) {
      toast.error('Patrocinador não encontrado. Verifique o email ou código informado.')
      return
    }
    setLinkSponsorSaving(true)
    try {
      // The PUT route resolves the sponsor by id/email/referralCode
      // server-side (with a cycle check), so we just forward the raw query.
      await apiFetch(`/admin/users/${linkSponsorTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          userId: user?.id,
          referredById: linkSponsorQuery.trim(),
        }),
      })
      toast.success(`Patrocinador vinculado a ${linkSponsorTarget.name}.`)
      setLinkSponsorDialogOpen(false)
      setLinkSponsorTarget(null)
      setLinkSponsorQuery('')
      setLinkSponsorResolved(null)
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao vincular patrocinador')
    } finally {
      setLinkSponsorSaving(false)
    }
  }

  // ---------- User Impersonation ("Entrar") ----------
  // Mirrors the handleLoginAs flow in admin-users-panel.tsx: calls POST /api/admin/users/[id]/login-as,
  // writes the admin id to sessionStorage (so app-layout.tsx can restore the isImpersonating flag
  // after a page refresh), flips the store's isImpersonating flag BEFORE calling login() so the
  // ImpersonationBanner renders immediately, then swaps the session in zustand to the impersonated
  // user and hard-navigates to their backoffice root.
  const handleLoginAs = async (u: AdminUser) => {
    if (!user?.id) return
    if (u.role === 'admin') {
      toast.error('Não é possível acessar como outro administrador.')
      return
    }
    setImpersonatingTargetId(u.id)
    try {
      const res = await apiFetch<{
        user: Record<string, unknown>
        adminId: string
        adminName: string
        redirectUrl: string
        message: string
      }>(`/admin/users/${u.id}/login-as`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      })
      toast.success(res.message || `Agora acessando como ${u.name}`)
      // Remember admin id in sessionStorage so the user can return to admin mode
      // (also restored on page refresh by the mount effect in app-layout.tsx).
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('newmobility_admin_impersonating', res.adminId)
        sessionStorage.setItem('newmobility_admin_name', res.adminName)
      }
      // Mark the store as impersonating BEFORE calling login() so the
      // ImpersonationBanner (mounted in app-layout.tsx) renders immediately
      // when the new (impersonated) session boots. login() does a partial
      // Zustand set, so it does not clear these flags.
      setImpersonating(true, res.adminId)
      // Swap the current session in zustand to the impersonated user.
      login(res.user as never)
      // Hard navigate to the user backoffice root.
      window.location.href = res.redirectUrl || '/'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entrar como usuário')
    } finally {
      setImpersonatingTargetId(null)
    }
  }

  // ---------- User View ----------
  const handleOpenViewUser = async (u: AdminUser) => {
    setViewUserDialogOpen(true)
    setLoadingViewUser(true)
    setViewUserBeneficiaries([])
    try {
      const data = await apiFetch<ViewUserData>(`/admin/users/${u.id}?userId=${user?.id}`)
      setViewingUser(data)
    } catch {
      // Fallback to list data
      setViewingUser(u as unknown as ViewUserData)
    } finally {
      setLoadingViewUser(false)
    }
    // Fetch beneficiaries in parallel (non-blocking)
    try {
      const beneData = await apiFetch<{ beneficiaries: any[] }>(`/user/beneficiaries?userId=${u.id}`)
      setViewUserBeneficiaries(beneData.beneficiaries || [])
    } catch {
      setViewUserBeneficiaries([])
    }
  }

  // ---------- Matrix Types ----------
  // NOTE (TASK MATRIX-EDITOR): This single function now populates BOTH the
  // existing `matrixTypes` state (typed as AdminMatrixType[], used by the
  // Plans tab) AND the new `matrixTypesData` state (typed as any[], used by
  // the Advanced Editor — needs the levelEarnings array which
  // AdminMatrixType intentionally omits). This avoids duplicate GET
  // round-trips to /api/admin/matrix-types.
  const loadMatrixTypes = async () => {
    setMatrixTypesLoading(true)
    try {
      const data = await apiFetch<{ matrixTypes: any[] }>(`/admin/matrix-types?userId=${user?.id}`)
      const types = data.matrixTypes || []
      setMatrixTypes(types)
      setMatrixTypesData(types)
    } catch {
      setMatrixTypes([])
      setMatrixTypesData([])
    } finally {
      setMatrixTypesLoading(false)
    }
  }

  // Open the MatrixLevelEarning inline editor dialog for a given MatrixType.
  // Seeds the local draft from the type's current levelEarnings array.
  const openEditMatrixLevels = (mt: any) => {
    setEditingMatrixType(mt)
    setEditingMatrixWidth(mt.width || 4)
    setEditingMatrixDepth(mt.depth || 5)
    const seed = (mt.levelEarnings || []).map((le: any) => ({
      id: le.id,
      level: le.level,
      percentage: le.percentage,
      fixedBonusCents: le.fixedBonusCents,
    }))
    setMatrixLevelDraft(seed)
    setMatrixLevelDialogOpen(true)
  }

  // Persist the locally-edited MatrixLevelEarning draft back to the server.
  // The PUT replaces the entire set of levels atomically (deleteMany +
  // recreate inside the same Prisma update). Financial impact — always
  // asks for confirmation first.
  const saveMatrixLevels = async () => {
    if (!editingMatrixType) return
    const affected = await (async () => {
      // Best-effort count of how many users hold a position in this matrix
      // (used in the confirmation message). Failure is non-fatal — we just
      // show a generic message.
      try {
        const count = await apiFetch<{ count?: number }>(
          `/admin/users?userId=${user?.id}&search=&matrixType=${encodeURIComponent(editingMatrixType.matrixKind)}&countOnly=true`
        ).catch(() => null)
        return count?.count ?? null
      } catch { return null }
    })()

    const msg = affected !== null && affected > 0
      ? `Tem certeza? Esta ação afeta o cálculo de cashback de ${affected} usuários.`
      : 'Tem certeza? Esta ação afeta o cálculo de cashback dos usuários vinculados a esta matriz.'
    if (!confirm(msg)) return

    setMatrixLevelSaving(true)
    try {
      // Normalize levels before sending: drop rows without a valid level
      // number, clamp percentage to [0,100], floor fixedBonusCents.
      const normalized = matrixLevelDraft
        .filter((l) => Number.isInteger(Number(l.level)) && Number(l.level) >= 1 && Number(l.level) <= (editingMatrixType.depth || 20))
        .map((l) => ({
          level: Number(l.level),
          percentage: Math.max(0, Math.min(100, Number(l.percentage) || 0)),
          fixedBonusCents: Math.max(0, Math.floor(Number(l.fixedBonusCents) || 0)),
        }))
        .sort((a, b) => a.level - b.level)

      await apiFetch(`/admin/matrix-types/${editingMatrixType.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          userId: user?.id,
          width: editingMatrixWidth,
          depth: editingMatrixDepth,
          levels: normalized,
        }),
      })
      toast.success('Níveis atualizados com sucesso!')
      setMatrixLevelDialogOpen(false)
      await loadMatrixTypes()
    } catch (err) {
      console.error('Failed to save matrix levels:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar níveis')
    } finally {
      setMatrixLevelSaving(false)
    }
  }

  // MatrixPosition edit dialog opener — seeds the form from the row.
  const openEditMatrixPosition = (pos: any) => {
    setEditingMatrixPosition(pos)
    setMatrixPosForm({
      level: pos.level ?? 0,
      position: pos.position ?? 0,
      status: pos.isFilled ? 'filled' : 'reserved',
    })
    setMatrixPositionDialogOpen(true)
  }

  const saveMatrixPosition = async () => {
    if (!editingMatrixPosition) return
    if (!confirm('Tem certeza? Esta alteração é auditada e pode afetar o cálculo de cashback.')) return
    setMatrixPosSaving(true)
    try {
      await apiFetch(`/admin/matrix-positions/${editingMatrixPosition.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          userId: user?.id,
          level: Number(matrixPosForm.level),
          position: Number(matrixPosForm.position),
          status: matrixPosForm.status,
        }),
      })
      toast.success('Posição atualizada com sucesso!')
      setMatrixPositionDialogOpen(false)
      await loadMatrixPositions({ page: matrixPositionsPage, search: matrixPosSearch, type: matrixPosFilterType, level: matrixPosFilterLevel })
    } catch (err) {
      console.error('Failed to save matrix position:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar posição')
    } finally {
      setMatrixPosSaving(false)
    }
  }

  const deleteMatrixPosition = async (pos: any) => {
    if (!confirm(`Excluir a posição #${pos.id.slice(-6)} de ${pos.userName || pos.userId}? Esta ação é permanente e auditada.`)) return
    try {
      await apiFetch(`/admin/matrix-positions/${pos.id}?userId=${user?.id}`, { method: 'DELETE' })
      toast.success('Posição excluída com sucesso!')
      await loadMatrixPositions({ page: matrixPositionsPage, search: matrixPosSearch, type: matrixPosFilterType, level: matrixPosFilterLevel })
    } catch (err) {
      console.error('Failed to delete matrix position:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir posição')
    }
  }

  // ---------- Plans CRUD ----------
  const handleOpenNewPlan = () => {
    setEditingPlan(null)
    setPlanFormData({ name: '', price: 0, features: '', description: '', matrixEntradaId: '', matrixResidualId: '', matrixVendasId: '', isActive: true, sortOrder: 99, entradaLevels: 0, residualLevels: 0, vendasLevels: 0 })
    setPlanDialogOpen(true)
  }

  const handleOpenEditPlan = async (plan: AdminPlan) => {
    setEditingPlan(plan)
    // Tarefa (22/09): carrega níveis liberados do SystemConfig para este plano
    let entradaLevels = 0, residualLevels = 0, vendasLevels = 0
    try {
      const planCode = plan.code || plan.id
      const [eCfg, rCfg, vCfg] = await Promise.all([
        apiFetch<{ value?: string }>(`/admin/system-settings/single?key=plan.${planCode}.cashback_levels_entrada&userId=${user?.id}`).catch(() => null),
        apiFetch<{ value?: string }>(`/admin/system-settings/single?key=plan.${planCode}.cashback_levels_residual&userId=${user?.id}`).catch(() => null),
        apiFetch<{ value?: string }>(`/admin/system-settings/single?key=plan.${planCode}.cashback_levels_vendas&userId=${user?.id}`).catch(() => null),
      ])
      entradaLevels = eCfg?.value ? parseInt(eCfg.value, 10) || 0 : 0
      residualLevels = rCfg?.value ? parseInt(rCfg.value, 10) || 0 : 0
      vendasLevels = vCfg?.value ? parseInt(vCfg.value, 10) || 0 : 0
    } catch { /* defaults to 0 */ }
    const featuresList = typeof plan.features === 'string'
      ? (() => { try { return JSON.parse(plan.features || '[]').join(', ') } catch { return plan.features || '' } })()
      : (plan.features || []).join(', ')
    setPlanFormData({
      name: plan.name,
      price: plan.price,
      features: featuresList,
      description: plan.description || '',
      matrixEntradaId: plan.matrixEntradaId || '',
      matrixResidualId: plan.matrixResidualId || '',
      matrixVendasId: plan.matrixVendasId || '',
      isActive: plan.isActive,
      sortOrder: plan.sortOrder ?? 99,
      entradaLevels,
      residualLevels,
      vendasLevels,
    })
    setPlanDialogOpen(true)
  }

  const handleSavePlan = async () => {
    setSavingPlan(true)
    try {
      const featuresArray = planFormData.features
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0)

      if (editingPlan) {
        await apiFetch(`/admin/plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            userId: user?.id,
            name: planFormData.name,
            price: planFormData.price,
            features: featuresArray,
            description: planFormData.description,
            matrixEntradaId: planFormData.matrixEntradaId || null,
            matrixResidualId: planFormData.matrixResidualId || null,
            matrixVendasId: planFormData.matrixVendasId || null,
            isActive: planFormData.isActive,
            sortOrder: planFormData.sortOrder,
          }),
        })
        // Tarefa (22/09): salvar quantos níveis de cada matriz o plano libera
        const planCode = editingPlan.code || editingPlan.id
        await Promise.all([
          apiFetch('/admin/system-settings', { method: 'PUT', body: JSON.stringify({ userId: user?.id, key: `plan.${planCode}.cashback_levels_entrada`, value: String(planFormData.entradaLevels) }) }).catch(() => {}),
          apiFetch('/admin/system-settings', { method: 'PUT', body: JSON.stringify({ userId: user?.id, key: `plan.${planCode}.cashback_levels_residual`, value: String(planFormData.residualLevels) }) }).catch(() => {}),
          apiFetch('/admin/system-settings', { method: 'PUT', body: JSON.stringify({ userId: user?.id, key: `plan.${planCode}.cashback_levels_vendas`, value: String(planFormData.vendasLevels) }) }).catch(() => {}),
        ])
        toast.success('Plano atualizado com sucesso!')
      } else {
        const created = await apiFetch<any>('/admin/plans', {
          method: 'POST',
          body: JSON.stringify({
            userId: user?.id,
            name: planFormData.name,
            price: planFormData.price,
            features: featuresArray,
            description: planFormData.description,
            matrixEntradaId: planFormData.matrixEntradaId || null,
            matrixResidualId: planFormData.matrixResidualId || null,
            matrixVendasId: planFormData.matrixVendasId || null,
            isActive: planFormData.isActive,
            sortOrder: planFormData.sortOrder,
          }),
        })
        // Tarefa (22/09): salvar níveis liberados para o novo plano
        const newPlanCode = created?.code || created?.id || planFormData.name.toLowerCase().replace(/\s+/g, '_')
        await Promise.all([
          apiFetch('/admin/system-settings', { method: 'PUT', body: JSON.stringify({ userId: user?.id, key: `plan.${newPlanCode}.cashback_levels_entrada`, value: String(planFormData.entradaLevels) }) }).catch(() => {}),
          apiFetch('/admin/system-settings', { method: 'PUT', body: JSON.stringify({ userId: user?.id, key: `plan.${newPlanCode}.cashback_levels_residual`, value: String(planFormData.residualLevels) }) }).catch(() => {}),
          apiFetch('/admin/system-settings', { method: 'PUT', body: JSON.stringify({ userId: user?.id, key: `plan.${newPlanCode}.cashback_levels_vendas`, value: String(planFormData.vendasLevels) }) }).catch(() => {}),
        ])
        toast.success('Plano criado com sucesso!')
      }
      setPlanDialogOpen(false)
      setEditingPlan(null)
      loadPlans()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar plano')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (plan?.isDefault || ['free', 'blue3', 'blue5'].includes(plan?.code || '')) {
      toast.error('Não é possível excluir planos padrão')
      return
    }
    if (!confirm(`Tem certeza que deseja excluir o plano "${plan?.name}"?`)) return
    try {
      await apiFetch(`/admin/plans/${planId}?userId=${user?.id}`, { method: 'DELETE' })
      loadPlans()
      toast.success('Plano excluído!')
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir plano')
    }
  }

  // ---------- Withdrawals ----------
  // Tarefa (22/09): state para popup de confirmação de saque no Financeiro
  const [financialApproveDialog, setFinancialApproveDialog] = useState<{
    open: boolean
    withdrawalId: string | null
    withdrawalAmount: number
    userName: string
    isBatch: boolean
    batchIds: string[]
  }>({ open: false, withdrawalId: null, withdrawalAmount: 0, userName: '', isBatch: false, batchIds: [] })

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      // Tarefa (22/09): abre popup de confirmação antes de aprovar
      const w = withdrawals?.withdrawals?.find(x => x.id === withdrawalId) || financialData?.recentTransactions.find(t => t.id === withdrawalId)
      setFinancialApproveDialog({
        open: true,
        withdrawalId,
        withdrawalAmount: w ? Math.abs(w.amount) : 0,
        userName: (w as any)?.userName || (w as any)?.user?.name || 'usuário',
        isBatch: false,
        batchIds: [],
      })
      return
    }
    // Rejeitar direto
    setProcessingWithdrawal(withdrawalId)
    try {
      await apiFetch(`/admin/withdrawals/${withdrawalId}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, action: 'reject' }),
      })
      loadWithdrawals()
      loadFinancial()
      toast.success('Saque rejeitado!')
    } catch {
      toast.error('Erro ao processar saque')
    } finally {
      setProcessingWithdrawal(null)
    }
  }

  // Confirma aprovação individual após popup
  const confirmFinancialApprove = async () => {
    const { withdrawalId } = financialApproveDialog
    if (!withdrawalId) return
    setFinancialApproveDialog(d => ({ ...d, open: false }))
    setProcessingWithdrawal(withdrawalId)
    try {
      await apiFetch(`/admin/withdrawals/${withdrawalId}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, action: 'approve' }),
      })
      loadWithdrawals()
      loadFinancial()
      toast.success('Saque aprovado!')
    } catch {
      toast.error('Erro ao aprovar saque')
    } finally {
      setProcessingWithdrawal(null)
    }
  }

  // Tarefa (22/09): Aprovar Todos os saques pendentes no Financeiro
  const handleFinancialBatchApprove = () => {
    const pending = (withdrawals?.withdrawals || financialData?.recentTransactions || []).filter((w: any) => w.status === 'pending')
    if (pending.length === 0) {
      toast.info('Não há saques pendentes para aprovar.')
      return
    }
    const totalAmount = pending.reduce((sum, w) => sum + Math.abs(w.amount), 0)
    setFinancialApproveDialog({
      open: true,
      withdrawalId: null,
      withdrawalAmount: totalAmount,
      userName: '',
      isBatch: true,
      batchIds: pending.map(w => w.id),
    })
  }

  // Confirma aprovação em lote após popup
  const confirmFinancialBatchApprove = async () => {
    const { batchIds } = financialApproveDialog
    if (batchIds.length === 0) return
    setFinancialApproveDialog(d => ({ ...d, open: false }))
    setProcessingWithdrawal('batch')
    try {
      await apiFetch('/admin/withdrawals/batch', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, withdrawalIds: batchIds, action: 'approve' }),
      })
      loadWithdrawals()
      loadFinancial()
      toast.success(`${batchIds.length} saque(s) aprovado(s)!`)
    } catch {
      toast.error('Erro ao aprovar saques em lote')
    } finally {
      setProcessingWithdrawal(null)
    }
  }

  // ---------- Manual Cashback ----------
  const handleAddCashback = async () => {
    setSavingCashback(true)
    try {
      await apiFetch('/admin/cashback', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          targetUserId: cashbackFormData.targetUserId,
          cashbackType: cashbackFormData.cashbackType,
          amount: cashbackFormData.amount,
          level: cashbackFormData.level,
          percentage: cashbackFormData.percentage,
          description: cashbackFormData.description,
          category: cashbackFormData.category,
        }),
      })
      setAddCashbackDialogOpen(false)
      setCashbackFormData({ targetUserId: '', cashbackType: 'entrada', amount: 0, level: 1, percentage: 0, description: '', category: '' })
      loadCashback()
      toast.success('Cashback adicionado com sucesso!')
    } catch {
      toast.error('Erro ao adicionar cashback')
    } finally {
      setSavingCashback(false)
    }
  }

  // ---------- Announcement Edit ----------
  const handleOpenEditAnnouncement = (a: AdminAnnouncement) => {
    setEditingAnnouncement(a)
    setEditAnnouncementData({
      title: a.title || '',
      message: a.message || '',
      type: a.type || 'info',
      priority: a.priority || 'normal',
      actionLabel: a.actionLabel || '',
      actionUrl: a.actionUrl || '',
    })
    setEditAnnouncementDialogOpen(true)
  }

  const handleSaveAnnouncement = async () => {
    if (!editingAnnouncement) return
    setSavingAnnouncement(true)
    try {
      await apiFetch(`/admin/announcements/${editingAnnouncement.id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, ...editAnnouncementData }),
      })
      setEditAnnouncementDialogOpen(false)
      setEditingAnnouncement(null)
      loadAnnouncements()
      toast.success('Anúncio atualizado com sucesso!')
    } catch {
      toast.error('Erro ao atualizar anúncio')
    } finally {
      setSavingAnnouncement(false)
    }
  }

  // ---------- Bulk User Actions ----------
  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    if (selectedUserIds.size === 0) return
    setProcessingBulk(true)
    try {
      await apiFetch('/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, userIds: Array.from(selectedUserIds), action }),
      })
      setSelectedUserIds(new Set())
      loadUsers()
      toast.success(action === 'activate' ? 'Usuários ativados com sucesso!' : 'Usuários desativados com sucesso!')
    } catch {
      toast.error('Erro ao processar ação em massa')
    } finally {
      setProcessingBulk(false)
    }
  }

  const handleExportCSV = () => {
    if (!users?.users?.length) {
      toast.error('Nenhum usuário para exportar')
      return
    }
    const headers = ['Nome', 'Email', 'Telefone', 'CPF', 'Plano', 'Status', 'Saldo Saque', 'Saldo Mobilidade', 'Saldo Compras', 'Cidade', 'Estado', 'Data Cadastro']
    const rows = users.users.map(u => [
      u.name, u.email, u.phone, u.cpf, getPlanName(u.plan),
      u.isActive ? 'Ativo' : 'Inativo',
      (u.balanceWithdrawal / 100).toFixed(2),
      (u.balanceMobility / 100).toFixed(2),
      (u.balanceShopping / 100).toFixed(2),
      u.city, u.state,
      new Date(u.createdAt).toLocaleDateString('pt-BR'),
    ])
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `usuarios_newmobility_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('CSV exportado com sucesso!')
  }

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllUsers = () => {
    if (!users?.users) return
    if (selectedUserIds.size === users.users.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(users.users.map(u => u.id)))
    }
  }

  // ---------- Financial Date Presets ----------
  const applyDatePreset = (preset: string) => {
    setFinancialDatePreset(preset)
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    if (preset === 'this_month') {
      setFinancialDateFrom(fmt(new Date(y, m, 1)))
      setFinancialDateTo(fmt(now))
    } else if (preset === 'last_month') {
      setFinancialDateFrom(fmt(new Date(y, m - 1, 1)))
      setFinancialDateTo(fmt(new Date(y, m, 0)))
    } else if (preset === 'last_3_months') {
      setFinancialDateFrom(fmt(new Date(y, m - 2, 1)))
      setFinancialDateTo(fmt(now))
    } else {
      setFinancialDateFrom('')
      setFinancialDateTo('')
    }
  }

  // ---------- Helpers ----------
  const getPlanBadge = (plan: string) => {
    // Tarefa (19/09): busca cor do plano no array plans[] (carregado do banco).
    // Antes era hardcoded com só free/blue3/blue5. Agora funciona com qualquer
    // plano criado pelo admin na aba "Planos & Preços".
    const colors: Record<string, string> = { free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', blue3: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', blue5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
    // Tenta achar o plano no array dinâmico pelo code ou id
    const found = plans.find(p => p.code === plan || p.id === plan)
    if (found) {
      // Cores baseadas no sortOrder/price
      if (found.price === 0) return colors.free
      if (found.price <= 50000) return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
      if (found.price <= 100000) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    }
    return colors[plan] || colors.free
  }

  const getPlanName = (plan: string) => {
    // Tarefa (19/09): busca nome do plano no array plans[] (carregado do banco).
    // Antes era hardcoded com só free/blue3/blue5.
    const names: Record<string, string> = { free: 'Gratuito', blue3: 'Blue 3', blue5: 'Blue 5 Premium' }
    const found = plans.find(p => p.code === plan || p.id === plan)
    return found?.name || names[plan] || plan
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { info: 'bg-blue-100 text-blue-700', warning: 'bg-amber-100 text-amber-700', success: 'bg-emerald-100 text-emerald-700', promo: 'bg-emerald-100 text-emerald-700', maintenance: 'bg-amber-100 text-amber-700', feature: 'bg-purple-100 text-purple-700', urgent: 'bg-red-100 text-red-700' }
    return colors[type] || colors.info
  }

  const getWithdrawalStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
    return map[status] || 'bg-gray-100 text-gray-700'
  }

  const getWithdrawalStatusLabel = (status: string) => {
    const map: Record<string, string> = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', paid: 'Pago' }
    return map[status] || status
  }

  const getCashbackTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      entrada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      residual: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      vendas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
    return map[type] || 'bg-gray-100 text-gray-700'
  }

  const getCashbackTypeLabel = (type: string) => {
    const map: Record<string, string> = { entrada: 'Entrada', residual: 'Residual', vendas: 'Vendas' }
    return map[type] || type
  }

  const updateEditField = <K extends keyof EditFormData>(key: K, value: EditFormData[K]) => {
    setEditUserData(d => ({ ...d, [key]: value }))
  }

  // ---------- New helpers for vouchers / bets / matrix ----------
  const getVoucherTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      mobility: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      food: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      pharmacy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      shopping: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      gratification: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      withdrawal: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    }
    return map[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  const getVoucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      mobility: 'Mobilidade', food: 'Refeição', pharmacy: 'Farmácia',
      shopping: 'Compras', gratification: 'Gratificação', withdrawal: 'Saque',
    }
    return map[type] || type
  }

  const getVoucherStatusBadge = (v: AdminVoucher) => {
    const status = (v.status || (v.isUsed ? 'redeemed' : (v.expiresAt && new Date(v.expiresAt) < new Date() ? 'expired' : 'active')))
    const map: Record<string, { badge: string; label: string }> = {
      active: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Ativo' },
      redeemed: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Resgatado' },
      expired: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Expirado' },
      disabled: { badge: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Desativado' },
    }
    return map[status] || map.active
  }

  const getBetStatusBadge = (status: string) => {
    const map: Record<string, { badge: string; label: string }> = {
      pending: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Pendente' },
      won: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Ganha' },
      lost: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Perdida' },
      cancelled: { badge: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Cancelada' },
    }
    return map[status] || { badge: 'bg-gray-100 text-gray-700', label: status }
  }

  // Recursive matrix node renderer
  const renderMatrixNode = (node: MatrixNode, depth = 0): React.ReactNode => {
    if (!node) return null
    return (
      <div key={node.id || `${node.userId}-${depth}-${node.position}`} style={{ marginLeft: depth > 0 ? 20 : 0 }}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg mb-1 border ${
            node.isFilled
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50'
              : 'bg-muted/30 border-dashed border-muted-foreground/30'
          }`}
        >
          <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">L{node.level}·P{node.position}</span>
          <div className="flex-1 min-w-0">
            {node.isFilled ? (
              <>
                <p className="text-xs font-medium text-foreground truncate">{node.userName || node.userId}</p>
                <p className="text-[10px] text-muted-foreground truncate">{node.userEmail}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Posição vazia</p>
            )}
          </div>
          {node.isFilled && (
            <Badge variant="outline" className="text-[9px] gap-1">
              <Check className="h-2.5 w-2.5 text-emerald-500" />
              Preenchida
            </Badge>
          )}
        </div>
        {node.children && node.children.length > 0 && (
          <div className="border-l border-muted-foreground/20 ml-4 pl-1">
            {node.children.map((child) => renderMatrixNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Recursive referral tree renderer — collapsible, click chevron to toggle
  const renderReferralNode = (node: ReferralTreeNode, depth = 0): React.ReactNode => {
    if (!node) return null
    const hasChildren = (node.children?.length ?? 0) > 0
    const isExpanded = referralExpanded.has(node.id)
    const isActive = node.isActive !== false
    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg mb-1 transition-colors ${
            depth === 0
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
              : 'bg-muted/30 hover:bg-muted/60'
          } ${!isActive ? 'opacity-60' : ''}`}
          style={{ marginLeft: depth > 0 ? 16 : 0 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleReferralNode(node.id)}
              className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
            {node.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{node.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {node.email}{node.referralCode ? ` · ${node.referralCode}` : ''}
            </p>
          </div>
          {typeof node.referralCount === 'number' && node.referralCount > 0 && (
            <Badge variant="outline" className="text-[9px] gap-0.5">
              <UsersRound className="h-2.5 w-2.5" /> {node.referralCount}
            </Badge>
          )}
          <Badge variant="outline" className="text-[9px]">{node.plan}</Badge>
          {typeof node.level === 'number' && node.level > 0 && (
            <span className="text-[9px] text-muted-foreground shrink-0">N{node.level}</span>
          )}
        </div>
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-l border-emerald-200/50 dark:border-emerald-800/40 ml-3 pl-1"
            >
              {node.children!.map((child) => renderReferralNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Admin access guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-center text-red-700 dark:text-red-400">Acesso Restrito</h2>
          <p className="text-sm text-center text-red-600 dark:text-red-300 mt-2">Apenas administradores podem acessar este painel.</p>
        </div>
      </div>
    )
  }

  // Per-page permission guard (Task 16-B). Hides the panel entirely and
  // shows "Acesso negado" if the current admin role is not allowed to
  // view the active page. Super admins (isAdmin === true) always pass.
  // While permissions are still loading for a sub-admin, render a spinner
  // instead of flashing the denied state.
  if (!canAccess(adminActivePage)) {
    if (permissionsLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Verificando permissões...</span>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-center text-amber-700 dark:text-amber-400">Acesso negado</h2>
          <p className="text-sm text-center text-amber-600 dark:text-amber-300 mt-2">
            Seu perfil não tem permissão para acessar esta página do painel administrativo.
          </p>
          <p className="text-xs text-center text-amber-500/80 dark:text-amber-400/70 mt-1">
            Solicite acesso ao administrador principal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Painel Administrativo
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie o sistema, usuários e configurações</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
          <Shield className="h-3 w-3" />
          Admin Geral
        </Badge>
      </div>

      {/* Financial sub-tab navigation (only shown on the financial admin page) */}
      {adminActivePage === 'financial' && (
        <Card className="mb-4 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Seção:</span>
              {([
                { key: 'financial' as const, label: 'Visão Geral', icon: PieChart },
                { key: 'withdrawals' as const, label: 'Saques', icon: Wallet },
                { key: 'cashback' as const, label: 'CashBack', icon: Receipt },
              ]).map((sub) => {
                const SubIcon = sub.icon
                const isActive = financialSubTab === sub.key
                return (
                  <button
                    key={sub.key}
                    onClick={() => setFinancialSubTab(sub.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-white/60 dark:bg-gray-900/40 text-muted-foreground hover:bg-white dark:hover:bg-gray-900/70 hover:text-foreground'
                    }`}
                  >
                    <SubIcon className="h-3.5 w-3.5" />
                    {sub.label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs (navigation now comes from the admin sidebar) */}
      <Tabs value={activeTab}>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-4 space-y-4">
          {loading && !stats && (
            <div className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando estatísticas...</span>
            </div>
          )}
          {!loading && !stats && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Erro ao carregar estatísticas</p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">Verifique sua conexão e tente novamente.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={loadStats}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          )}
          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'Total de Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                  { label: 'Usuários Ativos', value: stats.activeUsers, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                  { label: 'Receita Total', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                  { label: 'CashBack Total', value: formatCurrency(stats.totalCashback), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                ].map((card, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className={`${card.bg} border-0 overflow-hidden`}>
                      <CardContent className="p-2 sm:p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2">
                          <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color} shrink-0`} />
                          <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px]">+{stats.growthRate}%</Badge>
                        </div>
                        <p className="text-xs xs:text-sm sm:text-lg font-bold text-foreground break-all leading-tight">{card.value}</p>
                        <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight mt-0.5">{card.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" /> Distribuição de Planos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Tarefa (19/09): mescla planDistribution (usuários por plano) com
                          plans[] (todos os planos do banco). Planos com 0 usuários também
                          aparecem (count=0). Antes só mostrava planos que tinham usuários. */}
                      {(() => {
                        const distMap: Record<string, number> = {}
                        for (const p of stats.planDistribution) distMap[p.plan] = p.count
                        // Todos os planos do banco + qualquer plano que apareceu nos
                        // usuários mas não está no banco (legacy)
                        const allPlans = [
                          ...plans.map(p => p.code || p.id),
                          ...Object.keys(distMap),
                        ].filter((v, i, arr) => v && arr.indexOf(v) === i)
                        // Ordena: free primeiro, depois por sortOrder
                        allPlans.sort((a, b) => {
                          const pa = plans.find(p => (p.code || p.id) === a)
                          const pb = plans.find(p => (p.code || p.id) === b)
                          return (pa?.sortOrder ?? 99) - (pb?.sortOrder ?? 99)
                        })
                        return allPlans.map(planCode => {
                          const count = distMap[planCode] || 0
                          return (
                            <div key={planCode} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 shrink-0">
                                <Badge className={getPlanBadge(planCode)}>{getPlanName(planCode)}</Badge>
                              </div>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[40px]">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0}%` }} />
                                </div>
                                <span className="text-sm font-medium text-foreground w-8 text-right shrink-0">{count}</span>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600" /> Usuários Recentes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.recentUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'} shrink-0`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                          <Badge className={`${getPlanBadge(u.plan)} shrink-0 text-[10px]`}>{getPlanName(u.plan)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-600" /> Resumo de Atividade</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 xs:gap-2 sm:gap-4">
                    <div className="text-center p-1.5 xs:p-2 sm:p-3 bg-muted/50 rounded-lg overflow-hidden">
                      <p className="text-xs xs:text-sm sm:text-lg font-bold text-foreground">{stats.totalTransactions}</p>
                      <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">Total de Transações</p>
                    </div>
                    <div className="text-center p-1.5 xs:p-2 sm:p-3 bg-muted/50 rounded-lg overflow-hidden">
                      <p className="text-xs xs:text-sm sm:text-lg font-bold text-foreground break-all">{formatCurrency(stats.totalWithdrawals)}</p>
                      <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">Total de Saques</p>
                    </div>
                    <div className="text-center p-1.5 xs:p-2 sm:p-3 bg-muted/50 rounded-lg overflow-hidden">
                      <p className="text-xs xs:text-sm sm:text-lg font-bold text-foreground">{stats.inactiveUsers}</p>
                      <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">Usuários Inativos</p>
                    </div>
                    <div className="text-center p-1.5 xs:p-2 sm:p-3 bg-muted/50 rounded-lg overflow-hidden">
                      <p className="text-xs xs:text-sm sm:text-lg font-bold text-foreground break-all">{formatCurrency(stats.monthlyRevenue)}</p>
                      <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">Receita Mensal</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou código..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setUserPage(1) }}
                    className="pl-9"
                  />
                </div>
                <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setUserPage(1) }} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="all">Todos os planos</option>
                  {plans.length > 0 ? (
                    plans.map(p => (
                      <option key={p.id} value={p.code || p.id}>{p.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="free">Gratuito</option>
                      <option value="blue3">Blue 3</option>
                      <option value="blue5">Blue 5</option>
                    </>
                  )}
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setUserPage(1) }} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
                {/* Item 13 (sponsor validation) — toggle filter to show only
                    users without a sponsor (referredById=null AND role != admin). */}
                <Button
                  variant={noSponsorFilter ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 gap-1.5 text-xs shrink-0 ${noSponsorFilter ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                  onClick={() => { setNoSponsorFilter(v => !v); setUserPage(1) }}
                  title="Mostrar apenas usuários sem patrocinador (exceto administradores)"
                >
                  <Network className="h-3.5 w-3.5" />
                  {noSponsorFilter ? 'Filtro ativo: Sem patrocinador' : 'Sem patrocinador'}
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportCSV}>
                  <Download className="h-3.5 w-3.5" /> Exportar CSV
                </Button>
                {/* ADM-4 — Create new user (login + password). Wired to the
                    /api/admin/users/create endpoint via handleCreateUser. */}
                <Button
                  size="sm"
                  className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  onClick={handleOpenCreateUser}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Criar Usuário
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions Bar */}
          {selectedUserIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium text-foreground">{selectedUserIds.size} usuário(s) selecionado(s)</span>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={processingBulk} onClick={() => handleBulkAction('activate')}>
                      {processingBulk ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Ativar
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" disabled={processingBulk} onClick={() => handleBulkAction('deactivate')}>
                      <UserX className="h-3.5 w-3.5" />
                      Desativar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedUserIds(new Set())}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 w-10">
                        <input type="checkbox" checked={users?.users?.length ? selectedUserIds.size === users.users.length : false} onChange={toggleAllUsers} className="rounded border-input" />
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Usuário</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Plano</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Indicados</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Saldo</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.users.map(u => (
                      <tr key={u.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedUserIds.has(u.id) ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                        <td className="p-3">
                          <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleUserSelection(u.id)} className="rounded border-input" />
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">{u.email}</p>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell"><Badge className={getPlanBadge(u.plan)}>{getPlanName(u.plan)}</Badge></td>
                        <td className="p-3 hidden md:table-cell"><span className="text-sm text-foreground">{u._count.referrals}</span></td>
                        <td className="p-3 hidden md:table-cell"><span className="text-sm text-foreground">{formatCurrency(u.balanceWithdrawal)}</span></td>
                        <td className="p-3">
                          <Badge className={u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                            {u.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Item 13 (sponsor validation) — show a "Vincular
                                patrocinador" action only for users that have no
                                sponsor AND are not admins (the seed admin is the
                                only user allowed to have no sponsor). */}
                            {!u.referredById && u.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-amber-600 hover:text-amber-700"
                                onClick={() => handleOpenLinkSponsor(u)}
                                title="Vincular um patrocinador a este usuário"
                              >
                                <Network className="h-3.5 w-3.5" />
                                <span className="hidden xl:inline">Vincular</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-amber-600 hover:text-amber-700 disabled:opacity-50"
                              disabled={u.role === 'admin' || impersonatingTargetId === u.id}
                              onClick={() => handleLoginAs(u)}
                              title={u.role === 'admin' ? 'Não é possível entrar como administrador' : 'Entrar como este usuário'}
                            >
                              {impersonatingTargetId === u.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <LogIn className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">Entrar</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-blue-600 hover:text-blue-700" onClick={() => handleOpenViewUser(u)}>
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Ver</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-emerald-600 hover:text-emerald-700" onClick={() => handleOpenEditUser(u)}>
                              <Edit className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users && users.totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{users.total} usuários</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
                    <span className="text-xs text-muted-foreground">{userPage}/{users.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={userPage >= users.totalPages} onClick={() => setUserPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Types Tab — CRUD for UserType (qualifications + mobile permissions) */}
        <TabsContent value="user-types" className="mt-4 space-y-4">
          <AdminUserTypesPanel adminUserId={user?.id || ''} />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{plans.length} planos cadastrados</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleOpenNewPlan}>
              <Plus className="h-4 w-4" /> Novo Plano
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan, i) => {
              const features = typeof plan.features === 'string'
                ? (() => { try { return JSON.parse(plan.features || '[]') } catch { return [] } })()
                : plan.features || []
              const isDefault = plan.isDefault || ['free', 'blue3', 'blue5'].includes(plan.code || plan.id)

              return (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`shadow-sm hover:shadow-md transition-shadow ${plan.code === 'blue5' ? 'border-2 border-emerald-300 dark:border-emerald-700' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-foreground">{plan.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          {plan.userCount !== undefined && (
                            <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">{plan.userCount} usuários</Badge>
                          )}
                          {isDefault && <Badge variant="outline" className="text-[9px]">Padrão</Badge>}
                          {!plan.isActive && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">Inativo</Badge>}
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {plan.price === 0 ? 'Grátis' : formatCurrency(plan.price)}
                      </p>
                      {plan.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{plan.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                        {features.map((f: string, fi: number) => (
                          <div key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Entrada: {plan.matrixEntrada}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-500" />Residual: {plan.matrixResidual}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Vendas: {plan.matrixVendas}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => handleOpenEditPlan(plan)}>
                          <Edit className="h-3 w-3" /> Editar
                        </Button>
                        {!isDefault && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDeletePlan(plan.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* Cashback Tab */}
        <TabsContent value="cashback" className="mt-4 space-y-4">
          {/* Matriz de Compras - Visão Geral (Real network structure, independent of paid cashback) */}
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-600" />
                  Matriz de Compras - Visão Geral
                </CardTitle>
                {matrixOverviewLoading && (
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Carregando...
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Estrutura real da rede de indicações — quantos usuários cada membro possui em cada nível (1 a 9).
                Independente de cashback já pago (mostra a matriz mesmo antes de pagamentos serem processados).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform-wide summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Usuários com Rede', value: matrixOverview?.platformTotals.totalUsers ?? 0, icon: Users, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
                  { label: 'Entrada (4x5)', value: matrixOverview?.platformTotals.entrada ?? 0, icon: ArrowUpDown, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-950/40' },
                  { label: 'Residual (4x7)', value: matrixOverview?.platformTotals.residual ?? 0, icon: TrendingUp, color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-950/40' },
                  { label: 'Vendas (4x9)', value: matrixOverview?.platformTotals.vendas ?? 0, icon: Network, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
                ].map((card, i) => (
                  <div key={i} className={`rounded-lg ${card.bg} p-3`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                      <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{card.value.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>

              {/* Users matrix table */}
              {matrixOverview && matrixOverview.userMatrices.length > 0 ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold text-muted-foreground p-2.5">Usuário</th>
                          <th className="text-center font-semibold text-muted-foreground p-2.5 hidden sm:table-cell">Plano</th>
                          <th className="text-center font-semibold text-muted-foreground p-2.5">
                            <span className="inline-flex flex-col items-center leading-tight">
                              <span>Entrada</span>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400">L1-L5</span>
                            </span>
                          </th>
                          <th className="text-center font-semibold text-muted-foreground p-2.5">
                            <span className="inline-flex flex-col items-center leading-tight">
                              <span>Residual</span>
                              <span className="text-[9px] text-teal-600 dark:text-teal-400">L1-L7</span>
                            </span>
                          </th>
                          <th className="text-center font-semibold text-muted-foreground p-2.5">
                            <span className="inline-flex flex-col items-center leading-tight">
                              <span>Vendas</span>
                              <span className="text-[9px] text-cyan-600 dark:text-cyan-400">L1-L9</span>
                            </span>
                          </th>
                          <th className="text-center font-semibold text-muted-foreground p-2.5">Total Rede</th>
                          <th className="text-center font-semibold text-muted-foreground p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrixOverview.userMatrices.map((u, idx) => {
                          const isExpanded = expandedMatrixUser === u.userId
                          return (
                            <Fragment key={u.userId}>
                              <tr
                                onClick={() => setExpandedMatrixUser(isExpanded ? null : u.userId)}
                                className={`border-b border-border/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                              >
                                <td className="p-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${u.isActive ? 'bg-emerald-600' : 'bg-gray-400'}`}>
                                      {u.userName?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-foreground truncate">{u.userName}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{u.userEmail}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center hidden sm:table-cell">
                                  <Badge variant="outline" className="text-[10px]">{getPlanName(u.plan)}</Badge>
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">{u.entradaTotal}</span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">{u.residualTotal}</span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{u.vendasTotal}</span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                                    {u.networkTotal}
                                  </Badge>
                                </td>
                                <td className="p-2.5 text-center">
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-emerald-50/40 dark:bg-emerald-950/10 border-b border-border/50">
                                  <td colSpan={7} className="p-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      {/* Entrada breakdown */}
                                      <div className="rounded-md bg-teal-50 dark:bg-teal-950/20 p-2.5">
                                        <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 mb-1.5 flex items-center gap-1">
                                          <ArrowUpDown className="h-3 w-3" /> Entrada (4x5) — {u.entradaTotal}
                                        </p>
                                        <div className="grid grid-cols-5 gap-1">
                                          {[1, 2, 3, 4, 5].map(lvl => (
                                            <div key={lvl} className="text-center bg-background/60 rounded p-1">
                                              <p className="text-[9px] text-muted-foreground">L{lvl}</p>
                                              <p className="text-xs font-bold text-teal-700 dark:text-teal-400">{u.entradaByLevel[lvl] || 0}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      {/* Residual breakdown */}
                                      <div className="rounded-md bg-cyan-50 dark:bg-cyan-950/20 p-2.5">
                                        <p className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 mb-1.5 flex items-center gap-1">
                                          <TrendingUp className="h-3 w-3" /> Residual (4x7) — {u.residualTotal}
                                        </p>
                                        <div className="grid grid-cols-7 gap-1">
                                          {[1, 2, 3, 4, 5, 6, 7].map(lvl => (
                                            <div key={lvl} className="text-center bg-background/60 rounded p-1">
                                              <p className="text-[9px] text-muted-foreground">L{lvl}</p>
                                              <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400">{u.residualByLevel[lvl] || 0}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      {/* Vendas breakdown */}
                                      <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 p-2.5 md:col-span-1">
                                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                                          <Network className="h-3 w-3" /> Vendas (4x9) — {u.vendasTotal}
                                        </p>
                                        <div className="grid grid-cols-9 gap-1">
                                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                                            <div key={lvl} className="text-center bg-background/60 rounded p-1">
                                              <p className="text-[8px] text-muted-foreground">L{lvl}</p>
                                              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{u.vendasByLevel[lvl] || 0}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                                      <span>Código: <span className="font-mono text-foreground">{u.referralCode || '—'}</span></span>
                                      <span>Status: {u.isActive ? <span className="text-emerald-600">Ativo</span> : <span className="text-gray-500">Inativo</span>}</span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-emerald-200 dark:border-emerald-800 p-8 text-center">
                  {matrixOverviewLoading ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                      <p className="text-xs">Carregando matriz de compras...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Layers className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm">Nenhum usuário com rede de indicações encontrado</p>
                      <p className="text-[10px]">A matriz de compras aparecerá aqui assim que usuários começarem a indicar novos membros.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cashback Totals */}
          {cashbackData?.totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Entrada Total', value: formatCurrency(cashbackData.totals.entrada), icon: ArrowUpDown, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { label: 'Residual Total', value: formatCurrency(cashbackData.totals.residual), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                { label: 'Vendas Total', value: formatCurrency(cashbackData.totals.vendas), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Total Geral', value: formatCurrency(cashbackData.totals.entrada + cashbackData.totals.residual + cashbackData.totals.vendas), icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
              ].map((card, i) => (
                <Card key={i} className={`${card.bg} border-0`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Filters & Add button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-1">
              {(['all', 'entrada', 'residual', 'vendas'] as const).map((type) => {
                const labels: Record<string, string> = { all: 'Todos', entrada: 'Entrada', residual: 'Residual', vendas: 'Vendas' }
                return (
                  <button
                    key={type}
                    onClick={() => setCashbackTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      cashbackTypeFilter === type ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {labels[type]}
                  </button>
                )
              })}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por ID do usuário..."
                value={cashbackUserFilter}
                onChange={(e) => setCashbackUserFilter(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 text-xs" onClick={() => setAddCashbackDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Adicionar Cashback
            </Button>
          </div>

          {/* Per-User Summary */}
          {cashbackData?.perUserSummary && cashbackData.perUserSummary.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-emerald-600" /> Top Usuários por Cashback</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cashbackData.perUserSummary.slice(0, 10).map((u, i) => (
                    <div key={u.userId} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(u.total)}</p>
                        <p className="text-[10px] text-muted-foreground">{u.count} entradas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cashback Entries Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Usuário</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Tipo</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">De</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Valor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Nível</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">Descrição</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashbackData?.entries.map(e => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{e.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{e.userEmail}</p>
                          </div>
                        </td>
                        <td className="p-3"><Badge className={getCashbackTypeBadge(e.cashbackType)}>{getCashbackTypeLabel(e.cashbackType)}</Badge></td>
                        <td className="p-3 hidden sm:table-cell"><span className="text-xs text-muted-foreground">{e.fromUserName || '—'}</span></td>
                        <td className="p-3"><span className="text-sm font-semibold text-foreground">{formatCurrency(e.amount)}</span></td>
                        <td className="p-3 hidden md:table-cell"><span className="text-xs text-muted-foreground">{e.level} ({e.percentage}%)</span></td>
                        <td className="p-3 hidden lg:table-cell"><span className="text-xs text-muted-foreground truncate max-w-[200px] block">{e.description}</span></td>
                        <td className="p-3 hidden sm:table-cell"><span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleDateString('pt-BR')}</span></td>
                      </tr>
                    ))}
                    {(!cashbackData?.entries || cashbackData.entries.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Receipt className="h-8 w-8 text-muted-foreground/50" />
                            <p>Nenhum cashback encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="mt-4 space-y-4">
          {financialData && (
            <>
              {/* Financial Health Dashboard */}
              <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-600" /> Saúde Financeira
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {financialData.overview.totalRevenue > 0 && financialData.overview.pendingWithdrawals < financialData.overview.totalRevenue * 0.3 ? 'Saudável' : 'Atenção'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Receita / Saques Pend.</p>
                      <p className="text-lg font-bold text-foreground">
                        {financialData.overview.pendingWithdrawals > 0
                          ? (financialData.overview.totalRevenue / financialData.overview.pendingWithdrawals).toFixed(1)
                          : '∞'}x
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">CashBack / Receita</p>
                      <p className="text-lg font-bold text-foreground">
                        {financialData.overview.totalRevenue > 0
                          ? ((financialData.overview.totalCashback / financialData.overview.totalRevenue) * 100).toFixed(1)
                          : '0'}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Em Circulação / Total</p>
                      <p className="text-lg font-bold text-foreground">
                        {financialData.overview.totalPlatformBalance > 0
                          ? ((financialData.overview.totalInCirculation / financialData.overview.totalPlatformBalance) * 100).toFixed(1)
                          : '0'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Dashboard - Big Number Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Receita Total', value: formatCurrency(financialData.overview.totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-4 border-emerald-500', sub: financialData.monthlyRevenue.length > 0 ? `Média: ${formatCurrency(financialData.monthlyRevenue.reduce((s, m) => s + m.revenue, 0) / financialData.monthlyRevenue.length)}` : undefined },
                  { label: 'Saldo Plataforma', value: formatCurrency(financialData.overview.totalPlatformBalance), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-l-4 border-amber-500', sub: financialData.overview.totalPlatformBalance > financialData.overview.pendingWithdrawals ? 'Cobertura OK' : 'Verificar saldo' },
                  { label: 'Saques Pendentes', value: formatCurrency(financialData.overview.pendingWithdrawals), icon: Clock, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-l-4 border-red-500', sub: financialData.overview.pendingWithdrawals > 0 ? 'Aguardando aprovação' : undefined },
                  { label: 'Saques Aprovados', value: formatCurrency(financialData.overview.approvedWithdrawals), icon: Check, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-4 border-blue-500', sub: financialData.overview.approvedWithdrawals > 0 && financialData.overview.pendingWithdrawals > 0 ? `${((financialData.overview.approvedWithdrawals / (financialData.overview.approvedWithdrawals + financialData.overview.pendingWithdrawals)) * 100).toFixed(0)}% taxa aprovação` : undefined },
                  { label: 'CashBack Distribuído', value: formatCurrency(financialData.overview.totalCashback), icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-l-4 border-purple-500', sub: financialData.overview.totalRevenue > 0 ? `${((financialData.overview.totalCashback / financialData.overview.totalRevenue) * 100).toFixed(1)}% da receita` : undefined },
                  { label: 'Saldo em Circulação', value: formatCurrency(financialData.overview.totalInCirculation), icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-l-4 border-orange-500', sub: financialData.overview.totalPlatformBalance > 0 ? `${((financialData.overview.totalInCirculation / financialData.overview.totalPlatformBalance) * 100).toFixed(1)}% do total` : undefined },
                  // Tarefa 3 (22/09): Lucro Admin Geral = Receita - CashBack - Saques Aprovados
                  { label: 'Lucro Admin Geral', value: formatCurrency(financialData.overview.totalRevenue - financialData.overview.totalCashback - financialData.overview.approvedWithdrawals), icon: DollarSign, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40', border: 'border-l-4 border-emerald-700', sub: financialData.overview.totalRevenue > 0 ? `${(((financialData.overview.totalRevenue - financialData.overview.totalCashback - financialData.overview.approvedWithdrawals) / financialData.overview.totalRevenue) * 100).toFixed(1)}% margem` : 'Receita - CashBack - Saques' },
                ].map((card, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className={`${card.bg} border-0 ${card.border}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <card.icon className={`h-5 w-5 ${card.color}`} />
                          <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{card.value}</p>
                        {card.sub && <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Transaction Filters */}
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4 text-emerald-600" /> Filtros de Transação</CardTitle></CardHeader>
                <CardContent>
                  {/* Date Range Presets */}
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Período Rápido</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: '', label: 'Todos' },
                        { value: 'this_month', label: 'Este mês' },
                        { value: 'last_month', label: 'Último mês' },
                        { value: 'last_3_months', label: 'Últimos 3 meses' },
                      ].map(p => (
                        <button key={p.value} onClick={() => applyDatePreset(p.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${financialDatePreset === p.value ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1">Data Início</Label>
                      <Input type="date" value={financialDateFrom} onChange={e => { setFinancialDateFrom(e.target.value); setFinancialDatePreset('') }} className="h-9" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1">Data Fim</Label>
                      <Input type="date" value={financialDateTo} onChange={e => { setFinancialDateTo(e.target.value); setFinancialDatePreset('') }} className="h-9" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1">Tipo</Label>
                      <select value={financialTypeFilter} onChange={e => setFinancialTypeFilter(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="all">Todos</option>
                        <option value="deposit">Depósito</option>
                        <option value="withdrawal">Saque</option>
                        <option value="cashback">CashBack</option>
                        <option value="gratification">Gratificação</option>
                        <option value="marketplace_purchase">Marketplace</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1">Status</Label>
                      <select value={financialStatusFilter} onChange={e => setFinancialStatusFilter(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="all">Todos</option>
                        <option value="pending">Pendente</option>
                        <option value="approved">Aprovado</option>
                        <option value="rejected">Rejeitado</option>
                        <option value="paid">Pago</option>
                      </select>
                    </div>
                  </div>
                  {/* Tarefa (22/09): botão "Buscar" que recarrega os dados */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground">
                      Filtros aplicados em tempo real nas transações carregadas.
                    </p>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={() => loadFinancial()}
                    >
                      <Search className="h-3.5 w-3.5" />
                      Recarregar Dados
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tarefa (22/09): Saque do Lucro da Empresa — só admin/geral dono */}
              {user?.role === 'admin' && (
                <Card className="border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Saque do Lucro da Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Como administrador/dono da plataforma, você pode sacar o lucro da empresa diretamente.
                      O valor será debitado do saldo da plataforma e registrado como transação administrativa.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Valor do Saque (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={companyWithdrawalAmount}
                          onChange={(e) => setCompanyWithdrawalAmount(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Finalidade do Saque</Label>
                        <Input
                          type="text"
                          placeholder="Ex: Pagamento de fornecedor, investimento, etc."
                          value={companyWithdrawalPurpose}
                          onChange={(e) => setCompanyWithdrawalPurpose(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={handleCompanyWithdrawal}
                      disabled={companyWithdrawalLoading || !companyWithdrawalAmount || parseFloat(companyWithdrawalAmount) <= 0}
                    >
                      {companyWithdrawalLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <DollarSign className="h-4 w-4" />
                      )}
                      Sacar Lucro da Empresa
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly Revenue Chart - Enhanced */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" /> Receita Mensal</CardTitle>
                      <Badge variant="outline" className="text-[9px]">Últimos 6 meses</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {financialData.monthlyRevenue.length > 0 ? (
                      <div className="space-y-2">
                        {financialData.monthlyRevenue.map(m => {
                          const maxRevenue = Math.max(...financialData.monthlyRevenue.map(r => r.revenue), 1)
                          const pct = (m.revenue / maxRevenue) * 100
                          const [year, month] = m.month.split('-')
                          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                          return (
                            <div key={m.month} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-muted-foreground">{monthNames[parseInt(month) - 1]}/{year}</span>
                                <span className="font-semibold text-foreground">{formatCurrency(m.revenue)}</span>
                              </div>
                              <div className="w-full h-8 bg-muted/50 rounded-lg overflow-hidden relative">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 rounded-lg flex items-center justify-end pr-3"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(pct, 3)}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                >
                                  {pct > 15 && <span className="text-[10px] font-bold text-white drop-shadow-sm">{Math.round(pct)}%</span>}
                                </motion.div>
                                {pct <= 15 && pct > 0 && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">{Math.round(pct)}%</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma receita registrada</div>
                    )}
                  </CardContent>
                </Card>

                {/* Category Breakdown - Enhanced with bars */}
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-emerald-600" /> Resumo por Categoria</CardTitle></CardHeader>
                  <CardContent>
                    {financialData.categoryBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {/* Pie chart visual */}
                        <div className="flex items-center justify-center">
                          <div className="flex w-40 h-40 rounded-full overflow-hidden border-4 border-background shadow-inner">
                            {(() => {
                              const total = financialData.categoryBreakdown.reduce((s, c) => s + c.amount, 0) || 1
                              const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-red-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
                              return financialData.categoryBreakdown.map((c, i) => {
                                const pct = (c.amount / total) * 100
                                return (
                                  <div
                                    key={c.category}
                                    className={`${colors[i % colors.length]}`}
                                    style={{ width: `${pct}%` }}
                                    title={`${categoryLabel(c.category)}: ${formatCurrency(c.amount)}`}
                                  />
                                )
                              })
                            })()}
                          </div>
                        </div>
                        {/* Legend with visual bars */}
                        <div className="space-y-2">
                          {(() => {
                            const total = financialData.categoryBreakdown.reduce((s, c) => s + c.amount, 0) || 1
                            const maxAmount = Math.max(...financialData.categoryBreakdown.map(c => c.amount), 1)
                            const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-red-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
                            return financialData.categoryBreakdown.map((c, i) => {
                              const pct = (c.amount / total) * 100
                              const barPct = (c.amount / maxAmount) * 100
                              return (
                                <div key={c.category} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`h-3 w-3 rounded-sm ${colors[i % colors.length]}`} />
                                      <span className="text-xs text-foreground">{categoryLabel(c.category)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-foreground">{formatCurrency(c.amount)}</span>
                                      <span className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                  <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`h-full ${colors[i % colors.length]} rounded-full`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${barPct}%` }}
                                      transition={{ duration: 0.6, ease: 'easeOut' }}
                                    />
                                  </div>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma categoria registrada</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Revenue Summary with Trend */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Resumo de Receita Mensal</CardTitle>
                    <div className="flex items-center gap-2">
                      {financialData.monthlyRevenue.length >= 2 && (() => {
                        const sorted = [...financialData.monthlyRevenue].sort((a, b) => a.month.localeCompare(b.month))
                        const last = sorted[sorted.length - 1]
                        const prev = sorted[sorted.length - 2]
                        const change = prev.revenue > 0 ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0
                        const isPositive = change >= 0
                        return (
                          <Badge className={`${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'} text-[10px] gap-1`}>
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                            {isPositive ? '+' : ''}{change.toFixed(1)}%
                          </Badge>
                        )
                      })()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {financialData.monthlyRevenue.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {financialData.monthlyRevenue.map(m => {
                        const [year, month] = m.month.split('-')
                        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                        const maxRev = Math.max(...financialData.monthlyRevenue.map(r => r.revenue), 1)
                        const pct = (m.revenue / maxRev) * 100
                        return (
                          <div key={m.month} className="text-center p-3 bg-muted/30 rounded-lg">
                            <p className="text-[10px] text-muted-foreground font-medium">{monthNames[parseInt(month) - 1]}/{year.slice(2)}</p>
                            <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(m.revenue)}</p>
                            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                              <motion.div
                                className="h-full bg-emerald-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma receita registrada</div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Withdrawals - Approve/Reject */}
              {financialData.recentTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length > 0 && (
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Saques Pendentes ({financialData.recentTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length})
                      </CardTitle>
                      {/* Tarefa (22/09): botão "Aprovar Todos" no Financeiro */}
                      {financialData.recentTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length > 0 && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                          onClick={handleFinancialBatchApprove}
                          disabled={processingWithdrawal === 'batch'}
                        >
                          {processingWithdrawal === 'batch' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="h-3.5 w-3.5" />
                          )}
                          Aprovar Todos
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-amber-50/50 dark:bg-amber-950/20">
                            <th className="text-left text-xs font-semibold text-muted-foreground p-3">Usuário</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground p-3">Valor</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Data</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Descrição</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground p-3">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialData.recentTransactions
                            .filter(t => t.type === 'withdrawal' && t.status === 'pending')
                            .map(t => (
                              <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                <td className="p-3">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{t.userName}</p>
                                    <p className="text-[10px] text-muted-foreground">{t.userEmail}</p>
                                  </div>
                                </td>
                                <td className="p-3"><span className="text-sm font-semibold text-red-600">{formatCurrency(t.amount)}</span></td>
                                <td className="p-3 hidden sm:table-cell"><span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span></td>
                                <td className="p-3 hidden md:table-cell"><span className="text-xs text-muted-foreground line-clamp-1">{t.description || '—'}</span></td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" disabled={processingWithdrawal === t.id} onClick={() => handleWithdrawalAction(t.id, 'approve')}>
                                      {processingWithdrawal === t.id ? <span className="h-3.5 w-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                      <span className="hidden sm:inline">Aprovar</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" disabled={processingWithdrawal === t.id} onClick={() => handleWithdrawalAction(t.id, 'reject')}>
                                      <Ban className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Rejeitar</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Health Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" /> Métricas de Saúde Financeira
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
                      <p className="text-lg font-bold text-foreground">
                        {financialData.overview.approvedWithdrawals + financialData.overview.pendingWithdrawals > 0
                          ? ((financialData.overview.approvedWithdrawals / (financialData.overview.approvedWithdrawals + financialData.overview.pendingWithdrawals)) * 100).toFixed(0)
                          : '0'}%
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">CB / Receita</p>
                      <p className="text-lg font-bold text-foreground">
                        {financialData.overview.totalRevenue > 0
                          ? ((financialData.overview.totalCashback / financialData.overview.totalRevenue) * 100).toFixed(1)
                          : '0'}%
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                      <p className={`text-lg font-bold ${financialData.overview.totalRevenue - financialData.overview.totalCashback - financialData.overview.approvedWithdrawals >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(financialData.overview.totalRevenue - financialData.overview.totalCashback - financialData.overview.approvedWithdrawals)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Em Circulação</p>
                      <p className="text-lg font-bold text-foreground">
                        {financialData.overview.totalPlatformBalance > 0
                          ? ((financialData.overview.totalInCirculation / financialData.overview.totalPlatformBalance) * 100).toFixed(1)
                          : '0'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transactions Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-600" /> Transações Recentes</CardTitle>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                      if (!financialData?.recentTransactions?.length) { toast.error('Nenhuma transação para exportar'); return }
                      const headers = ['Data', 'Usuário', 'Email', 'Tipo', 'Valor', 'Status', 'Descrição']
                      const typeLabels: Record<string, string> = {
                        deposit: 'Depósito', withdrawal: 'Saque',
                        cashback_entry: 'CashBack Entrada', cashback_residual: 'CashBack Residual',
                        cashback_sales: 'CashBack Vendas', cashback: 'CashBack',
                        gratification: 'Gratificação', plan_payment: 'Pagamento de Plano',
                        plan_upgrade: 'Upgrade de Plano', marketplace_purchase: 'Marketplace',
                        marketplace: 'Marketplace', voucher: 'Voucher', bonus: 'Bônus',
                        reward: 'Recompensa', referral: 'Indicação', commission: 'Comissão',
                        purchase: 'Compra', sale: 'Venda', payment: 'Pagamento',
                        payment_invoice: 'Pagamento Fatura', subscription: 'Assinatura',
                        transfer: 'Transferência', transfer_in: 'Transferência Recebida',
                        transfer_out: 'Transferência Envio', fee: 'Taxa',
                        withdrawal_fee: 'Taxa de Saque', career_claim: 'Reivindicação de Carreira',
                      }
                      const statusLabels: Record<string, string> = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', paid: 'Pago' }
                      const rows = financialData.recentTransactions.map(t => [new Date(t.createdAt).toLocaleString('pt-BR'), t.userName, t.userEmail, typeLabels[t.type] || t.type, (t.amount / 100).toFixed(2), statusLabels[t.status] || t.status, t.description || ''])
                      const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
                      const link = document.createElement('a')
                      link.href = URL.createObjectURL(blob)
                      link.download = `financeiro_newmobility_${new Date().toISOString().split('T')[0]}.csv`
                      link.click()
                      URL.revokeObjectURL(link.href)
                      toast.success('Relatório financeiro exportado!')
                    }}>
                      <Download className="h-3 w-3" /> Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-semibold text-muted-foreground p-3">Data</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground p-3">Usuário</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Tipo</th>
                          <th className="text-right text-xs font-semibold text-muted-foreground p-3">Valor</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Status</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialData.recentTransactions
                          .filter(t => {
                            if (financialTypeFilter !== 'all') {
                              if (financialTypeFilter === 'cashback' && !t.type.startsWith('cashback')) return false
                              if (financialTypeFilter !== 'cashback' && t.type !== financialTypeFilter) return false
                            }
                            if (financialStatusFilter !== 'all' && t.status !== financialStatusFilter) return false
                            if (financialDateFrom && new Date(t.createdAt) < new Date(financialDateFrom)) return false
                            if (financialDateTo && new Date(t.createdAt) > new Date(financialDateTo + 'T23:59:59')) return false
                            return true
                          })
                          .slice(0, 50)
                          .map(t => {
                            const typeLabels: Record<string, string> = {
                              deposit: 'Depósito', withdrawal: 'Saque',
                              cashback_entry: 'CashBack Entrada', cashback_residual: 'CashBack Residual',
                              cashback_sales: 'CashBack Vendas', cashback: 'CashBack',
                              gratification: 'Gratificação', voucher: 'Voucher', bonus: 'Bônus',
                              marketplace_purchase: 'Marketplace', marketplace: 'Marketplace',
                              plan_payment: 'Pagamento de Plano', plan_upgrade: 'Upgrade de Plano',
                              payment: 'Pagamento', payment_invoice: 'Pagamento Fatura',
                              subscription: 'Assinatura', reward: 'Recompensa',
                              referral: 'Indicação', commission: 'Comissão',
                              purchase: 'Compra', sale: 'Venda',
                              transfer: 'Transferência', transfer_in: 'Transferência Recebida',
                              transfer_out: 'Transferência Envio', fee: 'Taxa',
                              withdrawal_fee: 'Taxa de Saque', career_claim: 'Reivindicação de Carreira',
                            }
                            const typeBadge: Record<string, string> = {
                              deposit: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                              withdrawal: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              cashback_entry: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                              cashback_residual: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                              cashback_sales: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
                              gratification: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              voucher: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
                              bonus: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
                              marketplace_purchase: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                              plan_payment: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                            }
                            const statusBadge: Record<string, string> = {
                              pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                              rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                            }
                            const statusLabels: Record<string, string> = {
                              pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', paid: 'Pago',
                            }
                            const dateStr = new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                            return (
                              <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                                <td className="p-3">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{t.userName}</p>
                                    <p className="text-[10px] text-muted-foreground">{t.userEmail}</p>
                                  </div>
                                </td>
                                <td className="p-3 hidden sm:table-cell"><Badge className={typeBadge[t.type] || 'bg-gray-100 text-gray-700'}>{typeLabels[t.type] || t.type}</Badge></td>
                                <td className="p-3 text-right">
                                  <span className={`text-sm font-medium ${t.type === 'withdrawal' || t.type === 'marketplace_purchase' ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {t.type === 'withdrawal' || t.type === 'marketplace_purchase' ? '-' : '+'}{formatCurrency(t.amount)}
                                  </span>
                                </td>
                                <td className="p-3 hidden md:table-cell"><Badge className={statusBadge[t.status] || 'bg-gray-100 text-gray-700'}>{statusLabels[t.status] || t.status}</Badge></td>
                                <td className="p-3 hidden lg:table-cell"><span className="text-xs text-muted-foreground line-clamp-1">{t.description || '—'}</span></td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                  {financialData.recentTransactions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma transação encontrada</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          {!financialData && (
            <div className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          )}
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="mt-4 space-y-4">
          {withdrawals?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Pendentes', value: withdrawals.stats.pendingCount, amount: formatCurrency(withdrawals.stats.pendingAmount), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Aprovados', value: withdrawals.stats.approvedCount, amount: formatCurrency(withdrawals.stats.approvedAmount), icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Rejeitados', value: withdrawals.stats.rejectedCount, amount: '', icon: X, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
                { label: 'Total Solicitado', value: '', amount: formatCurrency(withdrawals.stats.pendingAmount + withdrawals.stats.approvedAmount), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`${stat.bg} border-0`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                      </div>
                      {typeof stat.value === 'number' && stat.value > 0 && <p className="text-xl font-bold text-foreground">{stat.value}</p>}
                      {stat.amount && <p className="text-sm font-semibold text-foreground">{stat.amount}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => {
              const labels: Record<string, string> = { all: 'Todos', pending: 'Pendentes', approved: 'Aprovados', rejected: 'Rejeitados' }
              return (
                <button key={s} onClick={() => setWithdrawalStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${withdrawalStatusFilter === s ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {labels[s]}
                </button>
              )
            })}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Usuário</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Valor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Data</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals?.withdrawals.map(w => (
                      <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{w.userName || 'Usuário'}</p>
                            <p className="text-[10px] text-muted-foreground">{w.userEmail || w.userId}</p>
                          </div>
                        </td>
                        <td className="p-3"><span className="text-sm font-semibold text-foreground">{formatCurrency(w.amount)}</span></td>
                        <td className="p-3 hidden sm:table-cell"><span className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString('pt-BR')}</span></td>
                        <td className="p-3"><Badge className={getWithdrawalStatusBadge(w.status)}>{getWithdrawalStatusLabel(w.status)}</Badge></td>
                        <td className="p-3 text-right">
                          {w.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" disabled={processingWithdrawal === w.id} onClick={() => handleWithdrawalAction(w.id, 'approve')}>
                                {processingWithdrawal === w.id ? <span className="h-3.5 w-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                <span className="hidden sm:inline">Aprovar</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" disabled={processingWithdrawal === w.id} onClick={() => handleWithdrawalAction(w.id, 'reject')}>
                                {processingWithdrawal === w.id ? <span className="h-3.5 w-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                                <span className="hidden sm:inline">Rejeitar</span>
                              </Button>
                            </div>
                          )}
                          {w.status !== 'pending' && <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                    {(!withdrawals?.withdrawals || withdrawals.withdrawals.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Wallet className="h-8 w-8 text-muted-foreground/50" />
                            <p>Nenhum saque encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets / Suporte Tab */}
        <TabsContent value="tickets" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Tickets de Suporte
              </h3>
              <p className="text-xs text-muted-foreground">{tickets.length} ticket(s) encontrado(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={ticketStatusFilter} onChange={(e) => setTicketStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">Todos os Status</option>
                <option value="open">Aberto</option>
                <option value="in_progress">Em Andamento</option>
                <option value="resolved">Resolvido</option>
                <option value="closed">Fechado</option>
              </select>
              <select value={ticketPriorityFilter} onChange={(e) => setTicketPriorityFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">Todas Prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
                <option value="low">Baixa</option>
              </select>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={loadTickets}>
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={async () => {
                try {
                  await apiFetch('/seed-tickets', { method: 'POST' })
                  loadTickets()
                  toast.success('Tickets de teste criados!')
                } catch {
                  toast.error('Erro ao criar tickets de teste')
                }
              }}>
                <Plus className="h-3.5 w-3.5" /> Criar Teste
              </Button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Abertos', count: tickets.filter(t => t.status === 'open').length, color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
              { label: 'Em Andamento', count: tickets.filter(t => t.status === 'in_progress').length, color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
              { label: 'Resolvidos', count: tickets.filter(t => t.status === 'resolved').length, color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
              { label: 'Fechados', count: tickets.filter(t => t.status === 'closed').length, color: 'bg-gray-50 dark:bg-gray-950/30', iconColor: 'text-gray-600' },
            ].map((s, i) => (
              <Card key={i} className={`${s.color} border-0`}>
                <CardContent className="p-3">
                  <p className="text-lg font-bold text-foreground">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Ticket List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader><CardTitle className="text-sm">Lista de Tickets</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    {tickets.length > 0 ? tickets.map(ticket => {
                      const statusBadge: Record<string, string> = {
                        open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                        closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                      }
                      const statusLabel: Record<string, string> = { open: 'Aberto', in_progress: 'Em Andamento', resolved: 'Resolvido', closed: 'Fechado' }
                      const priorityBadge: Record<string, string> = {
                        low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                        medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      }
                      const priorityLabel: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' }
                      const categoryLabel: Record<string, string> = { technical: 'Técnico', financial: 'Financeiro', account: 'Conta', general: 'Geral', bug: 'Bug', feature: 'Sugestão' }
                      const isSelected = selectedTicket?.id === ticket.id
                      return (
                        <button
                          key={ticket.id}
                          className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500' : ''}`}
                          onClick={async () => {
                            try {
                              const data = await apiFetch<{ ticket: AdminTicket }>(`/admin/support/tickets/${ticket.id}?userId=${user?.id}`)
                              setSelectedTicket(data.ticket || data as unknown as AdminTicket)
                            } catch {
                              setSelectedTicket(ticket)
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{ticket.userName} • {ticket.userEmail}</p>
                            </div>
                            <Badge className={`${statusBadge[ticket.status] || 'bg-gray-100 text-gray-700'} text-[9px] whitespace-nowrap`}>
                              {statusLabel[ticket.status] || ticket.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className={`${priorityBadge[ticket.priority] || 'bg-gray-100 text-gray-700'} text-[9px]`}>
                              {priorityLabel[ticket.priority] || ticket.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{categoryLabel[ticket.category] || ticket.category}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{ticket.messages?.length || 0} msg(s)</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </button>
                      )
                    }) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum ticket encontrado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ticket Detail */}
            <div className="lg:col-span-3">
              {selectedTicket ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          {selectedTicket.subject}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedTicket.userName} ({selectedTicket.userEmail}) • Criado em {new Date(selectedTicket.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${
                            selectedTicket.status === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            selectedTicket.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            selectedTicket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          } text-[10px]`}>
                            {selectedTicket.status === 'open' ? 'Aberto' : selectedTicket.status === 'in_progress' ? 'Em Andamento' : selectedTicket.status === 'resolved' ? 'Resolvido' : selectedTicket.status === 'closed' ? 'Fechado' : selectedTicket.status}
                          </Badge>
                          <Badge className={`${
                            selectedTicket.priority === 'low' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                            selectedTicket.priority === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            selectedTicket.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          } text-[10px]`}>
                            {selectedTicket.priority === 'low' ? 'Baixa' : selectedTicket.priority === 'normal' ? 'Normal' : selectedTicket.priority === 'high' ? 'Alta' : selectedTicket.priority === 'urgent' ? 'Urgente' : selectedTicket.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {selectedTicket.category === 'technical' ? 'Técnico' : selectedTicket.category === 'financial' ? 'Financeiro' : selectedTicket.category === 'account' ? 'Conta' : selectedTicket.category === 'other' ? 'Outro' : selectedTicket.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleChangeTicketStatus(selectedTicket.id, e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="open">Aberto</option>
                          <option value="in_progress">Em Andamento</option>
                          <option value="resolved">Resolvido</option>
                          <option value="closed">Fechado</option>
                        </select>
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={async () => {
                          try {
                            const data = await apiFetch<{ ticket: AdminTicket }>(`/admin/support/tickets/${selectedTicket.id}?userId=${user?.id}`)
                            setSelectedTicket(data.ticket || data as unknown as AdminTicket)
                          } catch { /* ignore */ }
                        }}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Messages */}
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                      {selectedTicket.messages?.map(msg => (
                        <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] rounded-lg p-3 ${msg.isAdmin ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' : 'bg-muted/50 border border-border'}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              {msg.isAdmin && <Shield className="h-3 w-3 text-emerald-600" />}
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {msg.isAdmin ? 'Admin' : selectedTicket.userName}
                              </span>
                              <span className="text-[9px] text-muted-foreground/60">
                                {new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                        <div className="text-center py-4 text-muted-foreground text-xs">Nenhuma mensagem neste ticket</div>
                      )}
                    </div>

                    <Separator />

                    {/* Reply */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Responder como Admin</Label>
                      <textarea
                        value={ticketReply}
                        onChange={(e) => setTicketReply(e.target.value)}
                        placeholder="Escreva sua resposta..."
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) handleReplyTicket()
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Ctrl+Enter para enviar</span>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-8 text-xs"
                          onClick={handleReplyTicket}
                          disabled={sendingReply || !ticketReply.trim()}
                        >
                          {sendingReply ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Enviar Resposta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Selecione um ticket para ver os detalhes</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Config Tab → Configurações */}
        <TabsContent value="config" className="mt-4 space-y-4">
          {/* Platform Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-600" />
                Configurações da Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-600" /> Informações Gerais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Nome da Plataforma</Label>
                    <Input value={configs.platform_name || ''} onChange={(e) => setConfigs(c => ({ ...c, platform_name: e.target.value }))} placeholder="NewMobility" />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ToggleLeft className="h-4 w-4 text-amber-600" /> Controles do Sistema
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">Modo Manutenção</p>
                      <p className="text-xs text-muted-foreground">Desabilita o acesso para usuários comuns</p>
                    </div>
                    <button
                      onClick={() => setConfigs(c => ({ ...c, maintenance_mode: c.maintenance_mode === 'true' ? 'false' : 'true' }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${configs.maintenance_mode === 'true' ? 'bg-amber-500' : 'bg-muted'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${configs.maintenance_mode === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">Novos Cadastros</p>
                      <p className="text-xs text-muted-foreground">Permitir registro de novos usuários</p>
                    </div>
                    <button
                      onClick={() => setConfigs(c => ({ ...c, registration_enabled: c.registration_enabled === 'false' ? 'true' : 'false' }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${configs.registration_enabled !== 'false' ? 'bg-emerald-500' : 'bg-muted'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${configs.registration_enabled !== 'false' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> CashBack Padrão
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">CashBack Entrada (%)</Label>
                    <Input value={configs.cashback_entrada_pct || ''} onChange={(e) => setConfigs(c => ({ ...c, cashback_entrada_pct: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CashBack Residual (%)</Label>
                    <Input value={configs.cashback_residual_pct || ''} onChange={(e) => setConfigs(c => ({ ...c, cashback_residual_pct: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CashBack Vendas (%)</Label>
                    <Input value={configs.cashback_vendas_pct || ''} onChange={(e) => setConfigs(c => ({ ...c, cashback_vendas_pct: e.target.value }))} />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-600" /> Saques
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Saque Mínimo (centavos)</Label>
                    <Input value={configs.min_withdrawal || ''} onChange={(e) => setConfigs(c => ({ ...c, min_withdrawal: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground">Ex: 5000 = R$ 50,00</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Saque Máximo (centavos)</Label>
                    <Input value={configs.max_withdrawal || ''} onChange={(e) => setConfigs(c => ({ ...c, max_withdrawal: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Taxa de Saque (%)</Label>
                    <Input value={configs.withdrawal_fee_pct || ''} onChange={(e) => setConfigs(c => ({ ...c, withdrawal_fee_pct: e.target.value }))} />
                  </div>
                </div>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveConfig} disabled={savingConfig}>
                {savingConfig ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{announcements.length} anúncios</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => setShowNewAnnouncement(true)}>
              <Plus className="h-4 w-4" /> Novo Anúncio
            </Button>
          </div>

          <AnimatePresence>
            {showNewAnnouncement && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card className="border-emerald-200 dark:border-emerald-800">
                  <CardHeader><CardTitle className="text-sm">Criar Novo Anúncio</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Título" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(a => ({ ...a, title: e.target.value }))} />
                      <div className="flex gap-2">
                        <select value={newAnnouncement.type} onChange={(e) => setNewAnnouncement(a => ({ ...a, type: e.target.value }))} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm">
                          <option value="info">Info</option>
                          <option value="warning">Aviso</option>
                          <option value="success">Sucesso</option>
                          <option value="promo">Promo</option>
                          <option value="maintenance">Manutenção</option>
                          <option value="feature">Feature</option>
                          <option value="urgent">Urgente</option>
                        </select>
                        <select value={newAnnouncement.priority} onChange={(e) => setNewAnnouncement(a => ({ ...a, priority: e.target.value }))} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm">
                          <option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option>
                        </select>
                      </div>
                    </div>
                    <Input placeholder="Mensagem" value={newAnnouncement.message} onChange={(e) => setNewAnnouncement(a => ({ ...a, message: e.target.value }))} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Botão de ação (opcional)" value={newAnnouncement.actionLabel} onChange={(e) => setNewAnnouncement(a => ({ ...a, actionLabel: e.target.value }))} />
                      <Input placeholder="URL do botão (opcional)" value={newAnnouncement.actionUrl} onChange={(e) => setNewAnnouncement(a => ({ ...a, actionUrl: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateAnnouncement} disabled={!newAnnouncement.title || !newAnnouncement.message}>Criar</Button>
                      <Button variant="outline" onClick={() => setShowNewAnnouncement(false)}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {announcements.map(a => (
              <Card key={a.id} className={!a.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{a.title}</span>
                        <Badge className={getTypeColor(a.type)}>{a.type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{a.priority}</Badge>
                        {!a.isActive && <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px]">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleAnnouncement(a.id, a.isActive)} title={a.isActive ? 'Desativar' : 'Ativar'}>
                        {a.isActive ? <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => handleOpenEditAnnouncement(a)} title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDeleteAnnouncement(a.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {announcements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhum anúncio cadastrado
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab — admin-specific platform-wide reports panel (client spec §19) */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          <AdminReportsPanel />
        </TabsContent>

        {/* Gratifications Tab — summary of gratification balances across users */}
        <TabsContent value="gratifications" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Gratificações — Resumo Geral</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Visão consolidada das gratificações distribuídas na plataforma (cashback e saldo de gratificação).
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={() => setGratificationCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Criar Gratificação
              </Button>
            </CardContent>
          </Card>

          {/* BACK-7 + Task 2-c / Item 7 — overall Metas module visibility config.
              Controls who can see the Metas menu item in the sidebar AND who
              can access the gratifications page at all. Per-benefit overrides
              are configured in the card below. */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shrink-0">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">Visibilidade do módulo Metas</h4>
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">BACK-7</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Item 7</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Define qual tipo de usuário enxerga o item <strong>Metas</strong> no menu lateral
                    e pode acessar a página de gratificações. Usuários fora deste alvo veem uma tela
                    de "acesso restrito" e o item some do menu.
                  </p>
                </div>
              </div>
              {/* Tarefa (22/09): trocado dropdown por checkboxes (igual Qualificações permitidas) */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {driverGoalsTargetLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
                {ALLOWED_QUALIFICATION_OPTIONS.map(opt => {
                  const checked = driverGoalsTarget === opt.value || driverGoalsTarget === 'ambos'
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => saveDriverGoalsTarget(opt.value)}
                      disabled={driverGoalsTargetLoading || driverGoalsTargetSaving}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <input type="checkbox" checked={checked} readOnly className="h-3 w-3 accent-emerald-600" />
                      {opt.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => saveDriverGoalsTarget('ambos')}
                  disabled={driverGoalsTargetLoading || driverGoalsTargetSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    driverGoalsTarget === 'ambos'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <input type="checkbox" checked={driverGoalsTarget === 'ambos'} readOnly className="h-3 w-3 accent-emerald-600" />
                  Todos os tipos
                </button>
                {driverGoalsTargetSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 shrink-0" />}
              </div>
            </CardContent>
          </Card>

          {/* Task 2-c / Item 7.3 (admin form) — array-based `metas.allowedQualifications`.
              Preferred over the legacy single-value `targetQualification` above.
              Stored as a JSON array on SystemConfig under the key
              `metas.allowedQualifications` (e.g. ["motorista","entregador"]).
              The sidebar and gratifications-page both consult this array first;
              when it is non-empty, it is the authoritative gate. An empty array
              hides the module from everyone (useful for staging). When the
              array is absent/invalid, the legacy targetQualification above is
              consulted as a fallback. */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">Qualificações permitidas</h4>
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Item 7.3</Badge>
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px]">Preferencial</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-2xl">
                      Marque quais qualificações podem acessar o módulo <strong>Metas</strong>.
                      Esta configuração é armazenada no <code className="text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">SystemConfig</code> sob a
                      chave <code className="text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">metas.allowedQualifications</code> como um
                      array JSON (ex.: <code className="text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">["motorista","entregador"]</code>).
                      Quando o array está vazio, o módulo fica oculto para todos.
                    </p>
                  </div>
                </div>
                {allowedQualificationsSaving && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ALLOWED_QUALIFICATION_OPTIONS.map((opt) => {
                  const checked = allowedQualifications.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAllowedQualification(opt.value)}
                      disabled={allowedQualificationsLoading || allowedQualificationsSaving}
                      aria-pressed={checked}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150',
                        checked
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        (allowedQualificationsLoading || allowedQualificationsSaving) && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center h-4 w-4 rounded border transition-colors',
                          checked
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-muted-foreground/40 bg-background'
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
                {allowedQualifications.length === 0 && (
                  <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                    Lista vazia — módulo oculto para todos
                  </Badge>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>
                  Configuração atual: <code className="text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">
                    {JSON.stringify(allowedQualifications)}
                  </code>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Task 2-c / Item 7.3 — per-benefit target qualification.
              For each benefit in the catalog, the admin can pick which user
              type (motorista / entregador / ambos) should see it. Benefits
              whose target equals the overall module visibility can be left as
              "Padrão do módulo" (empty). */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-sm">Benefícios — alvo por qualificação</CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Item 7</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para cada benefício do catálogo de Metas, escolha se ele deve ser exibido
                    apenas para <strong>Motorista</strong>, apenas para <strong>Entregador</strong>,
                    ou para <strong>Ambos</strong>. Quando "Padrão do módulo" está selecionado,
                    o benefício herda a configuração global acima.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {benefitCatalog.length === 0 ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Carregando benefícios...</span>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-96 overflow-y-auto custom-scrollbar">
                  {benefitCatalog.map((b) => {
                    const currentValue = benefitTargets[b.type] || ''
                    const isSaving = benefitTargetSavingKey === b.type
                    return (
                      <div
                        key={b.type}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-foreground truncate">{b.name}</p>
                            <Badge variant="outline" className="text-[9px]">{b.type}</Badge>
                            {b.amount > 0 && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px]">
                                {formatCurrency(b.amount)}
                              </Badge>
                            )}
                          </div>
                          {b.description && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{b.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Label className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                            Benefício para:
                          </Label>
                          <Select
                            value={currentValue}
                            onValueChange={(v) => saveBenefitTarget(b.type, v)}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs">
                              <SelectValue placeholder="Padrão do módulo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ambos">Todos os tipos acima</SelectItem>
                              {ALLOWED_QUALIFICATION_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 shrink-0" />}
                          {/* Tarefa (22/09): botão Editar benefício */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs gap-1 shrink-0"
                            onClick={() => {
                              setBenefitEditDialog({
                                open: true,
                                benefitType: b.type,
                                benefitName: b.name,
                                benefitAmount: b.amount,
                                benefitDescription: b.description || '',
                              })
                            }}
                            title="Editar benefício"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== Goal Configs CRUD — "motorista 20 viagens → R$ 5,00" ===== */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">Metas por Tipo de Usuário</h4>
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">CONFIGURÁVEL</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Crie metas customizadas por tipo de usuário (ex: Motorista — 20 viagens finalizadas/dia → R$ 5,00).
                      As metas ativas aparecem para o usuário na aba <strong>Metas</strong> do backoffice.
                    </p>
                  </div>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
                  onClick={openCreateGoalConfig}
                >
                  <Plus className="h-4 w-4" /> Nova Meta
                </Button>
              </div>

              {goalConfigsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando metas...</span>
                </div>
              ) : goalConfigs.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <Target className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-foreground mb-1">Nenhuma meta configurada ainda</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Crie metas como "Motorista: 20 viagens/dia → R$ 5,00" para motivar seus usuários.
                  </p>
                  <Button size="sm" variant="outline" className="gap-2" onClick={openCreateGoalConfig}>
                    <Plus className="h-3.5 w-3.5" /> Criar primeira meta
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b border-border">
                        <th className="text-left font-semibold text-muted-foreground px-3 py-2.5">Meta</th>
                        <th className="text-left font-semibold text-muted-foreground px-3 py-2.5">Tipo de Usuário</th>
                        <th className="text-left font-semibold text-muted-foreground px-3 py-2.5 hidden sm:table-cell">Critério</th>
                        <th className="text-right font-semibold text-muted-foreground px-3 py-2.5">Recompensa</th>
                        <th className="text-left font-semibold text-muted-foreground px-3 py-2.5 hidden md:table-cell">Carteira</th>
                        <th className="text-left font-semibold text-muted-foreground px-3 py-2.5 hidden lg:table-cell">Periodicidade</th>
                        <th className="text-center font-semibold text-muted-foreground px-3 py-2.5">Status</th>
                        <th className="text-right font-semibold text-muted-foreground px-3 py-2.5">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goalConfigs.map((item) => (
                        <tr key={item.id} className={`border-b border-border last:border-0 ${!item.isActive ? 'bg-muted/20 opacity-70' : ''}`}>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-foreground">{item.name}</div>
                            {item.description && (
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className={
                              item.targetQualification === 'ambos' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                              'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                            }>
                              {item.targetQualification === 'ambos' ? 'Todos os tipos' :
                               ALLOWED_QUALIFICATION_OPTIONS.find(o => o.value === item.targetQualification)?.label || item.targetQualification}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 hidden sm:table-cell">
                            <span className="font-medium text-foreground">{item.targetValue}</span>
                            <span className="text-muted-foreground"> {item.metricLabel}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(item.rewardCents)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground capitalize">{item.rewardWallet}</td>
                          <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground capitalize">{item.frequency}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => toggleGoalConfigActive(item)}
                              className="inline-flex items-center justify-center"
                              title={item.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {item.isActive ? (
                                <ToggleRight className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditGoalConfig(item)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => deleteGoalConfig(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goal Config Create/Edit Dialog */}
          <Dialog open={goalConfigDialogOpen} onOpenChange={setGoalConfigDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  {editingGoalConfig ? 'Editar Meta' : 'Nova Meta'}
                </DialogTitle>
                <DialogDescription>
                  Configure uma meta para um tipo de usuário específico. Ex: Motorista — 20 viagens finalizadas/dia → R$ 5,00.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nome da Meta *</Label>
                  <Input
                    placeholder="Ex: Meta Diária Motorista"
                    value={goalConfigForm.name}
                    onChange={(e) => setGoalConfigForm({ ...goalConfigForm, name: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Bata 20 corridas por dia e ganhe R$ 5,00"
                    value={goalConfigForm.description}
                    onChange={(e) => setGoalConfigForm({ ...goalConfigForm, description: e.target.value })}
                  />
                </div>

                {/* Target Qualification + Frequency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tipo de Usuário *</Label>
                    <Select
                      value={goalConfigForm.targetQualification}
                      onValueChange={(v) => setGoalConfigForm({ ...goalConfigForm, targetQualification: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambos">Todos os tipos</SelectItem>
                        {ALLOWED_QUALIFICATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Periodicidade *</Label>
                    <Select
                      value={goalConfigForm.frequency}
                      onValueChange={(v) => setGoalConfigForm({ ...goalConfigForm, frequency: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="one_time">Única (uma vez)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Metric + Target Value */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-medium">Métrica *</Label>
                    <Select
                      value={goalConfigForm.metricCode}
                      onValueChange={(v) => {
                        // Auto-fill metric label based on metricCode
                        const labels: Record<string, string> = {
                          trips_daily: 'viagens finalizadas',
                          trips_monthly: 'viagens no mês',
                          deliveries_daily: 'entregas realizadas',
                          deliveries_monthly: 'entregas no mês',
                          trips_total: 'viagens totais',
                          sales_total: 'vendas realizadas',
                          referrals_total: 'indicações realizadas',
                          kyc_approved: 'documentos aprovados',
                          custom: 'pontos',
                        }
                        setGoalConfigForm({ ...goalConfigForm, metricCode: v, metricLabel: labels[v] || 'pontos' })
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trips_daily">Viagens por dia</SelectItem>
                        <SelectItem value="trips_monthly">Viagens por mês</SelectItem>
                        <SelectItem value="deliveries_daily">Entregas por dia</SelectItem>
                        <SelectItem value="deliveries_monthly">Entregas por mês</SelectItem>
                        <SelectItem value="trips_total">Viagens totais</SelectItem>
                        <SelectItem value="sales_total">Vendas totais</SelectItem>
                        <SelectItem value="referrals_total">Indicações totais</SelectItem>
                        <SelectItem value="kyc_approved">Documentos KYC aprovados</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-medium">Rótulo da Métrica</Label>
                    <Input
                      placeholder="viagens finalizadas"
                      value={goalConfigForm.metricLabel}
                      onChange={(e) => setGoalConfigForm({ ...goalConfigForm, metricLabel: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-medium">Valor-Alvo *</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="20"
                      value={goalConfigForm.targetValue}
                      onChange={(e) => setGoalConfigForm({ ...goalConfigForm, targetValue: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Reward + Wallet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Recompensa (R$) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input
                        placeholder="5,00"
                        value={goalConfigForm.rewardBrl}
                        onChange={(e) => setGoalConfigForm({ ...goalConfigForm, rewardBrl: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Valor creditado quando o usuário bater a meta.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Carteira de Destino *</Label>
                    <Select
                      value={goalConfigForm.rewardWallet}
                      onValueChange={(v) => setGoalConfigForm({ ...goalConfigForm, rewardWallet: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gratification">Gratificação</SelectItem>
                        <SelectItem value="withdrawal">Saque</SelectItem>
                        <SelectItem value="shopping">Compras</SelectItem>
                        <SelectItem value="mobility">Mobilidade</SelectItem>
                        <SelectItem value="food">Refeição</SelectItem>
                        <SelectItem value="pharmacy">Farmácia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/10 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold mb-1">Pré-visualização</p>
                  <p className="text-sm text-foreground">
                    <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                      {goalConfigForm.targetQualification === 'ambos' ? 'Todos os tipos' :
                       ALLOWED_QUALIFICATION_OPTIONS.find(o => o.value === goalConfigForm.targetQualification)?.label || goalConfigForm.targetQualification}
                    </Badge>
                    <span className="font-medium">{goalConfigForm.targetValue || '—'}</span>
                    <span className="text-muted-foreground"> {goalConfigForm.metricLabel || 'viagens finalizadas'}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {(parseBrlToCents(goalConfigForm.rewardBrl) / 100).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-muted-foreground ml-1">na carteira de {goalConfigForm.rewardWallet}</span>
                  </p>
                </div>

                {/* Active + Sort Order */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="goal-active"
                      checked={goalConfigForm.isActive}
                      onChange={(e) => setGoalConfigForm({ ...goalConfigForm, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="goal-active" className="text-xs font-medium cursor-pointer">Meta ativa</Label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Ordem</Label>
                    <Input
                      type="number"
                      min={0}
                      value={goalConfigForm.sortOrder}
                      onChange={(e) => setGoalConfigForm({ ...goalConfigForm, sortOrder: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setGoalConfigDialogOpen(false)} disabled={goalConfigSaving}>
                  Cancelar
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={saveGoalConfig} disabled={goalConfigSaving}>
                  {goalConfigSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingGoalConfig ? 'Salvar Alterações' : 'Criar Meta'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {financialData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'CashBack Total', value: formatCurrency(financialData.overview.totalCashback), icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                  { label: 'Receita Total', value: formatCurrency(financialData.overview.totalRevenue), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                  { label: 'Em Circulação', value: formatCurrency(financialData.overview.totalInCirculation), icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                  { label: 'Saldo Plataforma', value: formatCurrency(financialData.overview.totalPlatformBalance), icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                ].map((card, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className={`${card.bg} border-0 shadow-sm`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <card.icon className={`h-4 w-4 ${card.color}`} />
                          <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">{card.value}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-emerald-600" /> Distribuição por Categoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financialData.categoryBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {financialData.categoryBreakdown.map((cat, i) => {
                          const max = Math.max(...financialData.categoryBreakdown.map(c => c.amount), 1)
                          return (
                            <div key={i} className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-foreground">{categoryLabel(cat.category)}</span>
                              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(cat.amount / max) * 100}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-foreground w-20 text-right">{formatCurrency(cat.amount)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Receita Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financialData.monthlyRevenue.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {financialData.monthlyRevenue.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <span className="text-xs font-medium text-foreground">{m.month}</span>
                            <span className="text-sm font-bold text-emerald-600">{formatCurrency(m.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando dados de gratificações...</span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== SERVICE TYPES TAB (Item 8) ===== */}
        <TabsContent value="service-types" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Tipos de Serviço</h3>
                  <Badge variant="secondary" className="text-[10px]">{serviceTypes.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gerencie as categorias disponíveis no módulo de Serviços. Tipos desativados não aparecem no dropdown público, mas registros históricos continuam legíveis.
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
                onClick={handleOpenCreateServiceType}
              >
                <Plus className="h-4 w-4" /> Novo Tipo
              </Button>
            </CardContent>
          </Card>

          {serviceTypesLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando tipos...</span>
              </CardContent>
            </Card>
          ) : serviceTypes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Nenhum tipo cadastrado</p>
                <p className="text-sm text-muted-foreground mt-1">Crie o primeiro tipo de serviço para aparecer no módulo de Serviços.</p>
                <Button
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={handleOpenCreateServiceType}
                >
                  <Plus className="h-4 w-4" /> Criar Tipo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Ordem</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Ícone</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Nome</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceTypes.map(t => (
                        <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                          <td className="p-3 text-xs text-muted-foreground">{t.sortOrder}</td>
                          <td className="p-3 text-lg">{t.icon || '🛠️'}</td>
                          <td className="p-3 font-medium text-foreground">{t.name}</td>
                          <td className="p-3">
                            <Badge
                              className={
                                t.isActive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 text-[10px]'
                              }
                            >
                              {t.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleToggleServiceTypeActive(t)}
                                title={t.isActive ? 'Desativar' : 'Ativar'}
                              >
                                {t.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleOpenEditServiceType(t)}
                                title="Editar"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs hover:text-red-500"
                                onClick={() => handleDeleteServiceType(t)}
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== VOUCHERS TAB ===== */}
        <TabsContent value="vouchers" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Ticket className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Vouchers & Cupons</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Crie e gerencie vouchers promocionais para os usuários. Valores em reais (R$).
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={() => setVoucherCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Criar Voucher
              </Button>
            </CardContent>
          </Card>

          {/* Stats cards */}
          {voucherData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: voucherData.stats.total, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { label: 'Ativos', value: voucherData.stats.active, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Resgatados', value: voucherData.stats.redeemed, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Valor Total', value: formatCurrency(voucherData.stats.totalValue), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
              ].map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`${card.bg} border-0`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                        <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{card.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Filtrar:</span>
                {(['all', 'active', 'redeemed', 'expired', 'disabled'] as const).map((status) => {
                  const labels: Record<string, string> = { all: 'Todos', active: 'Ativos', redeemed: 'Resgatados', expired: 'Expirados', disabled: 'Desativados' }
                  return (
                    <button
                      key={status}
                      onClick={() => { setVoucherStatusFilter(status); setVoucherPage(1) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        voucherStatusFilter === status ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {labels[status]}
                    </button>
                  )
                })}
                <span className="text-xs text-muted-foreground ml-auto">{voucherData?.total ?? 0} vouchers</span>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {voucherLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-muted-foreground">Carregando vouchers...</span>
                </div>
              ) : voucherData?.vouchers && voucherData.vouchers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Código</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Usuário</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Tipo</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Valor</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Validade</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voucherData.vouchers.map(v => {
                        const statusInfo = getVoucherStatusBadge(v)
                        return (
                          <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <p className="text-sm font-mono font-semibold text-foreground">{v.code}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(v.createdAt).toLocaleDateString('pt-BR')}</p>
                            </td>
                            <td className="p-3 hidden sm:table-cell">
                              <p className="text-sm text-foreground">{v.userName || '—'}</p>
                              <p className="text-[10px] text-muted-foreground">{v.userEmail || ''}</p>
                            </td>
                            <td className="p-3"><Badge className={getVoucherTypeBadge(v.type)}>{getVoucherTypeLabel(v.type)}</Badge></td>
                            <td className="p-3"><span className="text-sm font-semibold text-foreground">{formatCurrency(Number(v.amount ?? v.amountInCents ?? 0))}</span></td>
                            <td className="p-3"><Badge className={statusInfo.badge}>{statusInfo.label}</Badge></td>
                            <td className="p-3 hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('pt-BR') : '—'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {v.status !== 'redeemed' && v.status !== 'disabled' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-amber-600 hover:text-amber-700 text-xs"
                                    onClick={() => handleUpdateVoucherStatus(v.id, 'disabled')}
                                    title="Desativar voucher"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-red-500 hover:text-red-600 text-xs"
                                  onClick={() => handleDeleteVoucher(v.id)}
                                  title="Excluir voucher"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Ticket className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhum voucher encontrado</p>
                  <p className="text-xs text-muted-foreground/70">Clique em "Criar Voucher" para adicionar o primeiro.</p>
                </div>
              )}
              {voucherData && voucherData.totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{voucherData.total} vouchers</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={voucherPage <= 1} onClick={() => setVoucherPage(p => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
                    <span className="text-xs text-muted-foreground">{voucherPage}/{voucherData.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={voucherPage >= voucherData.totalPages} onClick={() => setVoucherPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BETS TAB ===== */}
        <TabsContent value="bets" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gamepad2 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Jogos & Apostas</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Gerencie as apostas dos usuários. Finalize apostas pendentes ou cancele com estorno do valor.
              </p>
            </CardContent>
          </Card>

          {/* Stats cards */}
          {betData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Apostas', value: betData.stats.totalBets, icon: Gamepad2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { label: 'Pendentes', value: betData.stats.pendingBets, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Ganhas', value: betData.stats.wonBets, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Perdidas', value: betData.stats.lostBets, icon: X, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
                { label: 'Total Apostado', value: formatCurrency(betData.stats.totalStaked), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                { label: 'Total Pago', value: formatCurrency(betData.stats.totalPaid), icon: Wallet, color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              ].map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`${card.bg} border-0`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                        <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
                      </div>
                      <p className="text-base font-bold text-foreground">{card.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Status:</span>
                {(['all', 'pending', 'won', 'lost', 'cancelled'] as const).map((status) => {
                  const labels: Record<string, string> = { all: 'Todas', pending: 'Pendentes', won: 'Ganhas', lost: 'Perdidas', cancelled: 'Canceladas' }
                  return (
                    <button
                      key={status}
                      onClick={() => { setBetStatusFilter(status); setBetPage(1) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        betStatusFilter === status ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {labels[status]}
                    </button>
                  )
                })}
                <span className="text-xs text-muted-foreground ml-auto">{betData?.total ?? 0} apostas</span>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {betLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-muted-foreground">Carregando apostas...</span>
                </div>
              ) : betData?.bets && betData.bets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Usuário</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Evento</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Seleção</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Odds</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Aposta</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Potencial</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">Data</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {betData.bets.map(b => {
                        const statusInfo = getBetStatusBadge(b.status)
                        return (
                          <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <p className="text-sm font-medium text-foreground">{b.userName || b.userId.slice(-8)}</p>
                              <p className="text-[10px] text-muted-foreground">{b.userEmail || ''}</p>
                            </td>
                            <td className="p-3"><span className="text-xs text-foreground">{b.eventLabel}</span></td>
                            <td className="p-3 hidden md:table-cell"><span className="text-xs text-foreground">{b.selectionLabel || b.selection}</span></td>
                            <td className="p-3"><span className="text-xs font-mono text-foreground">{b.odds.toFixed(2)}</span></td>
                            <td className="p-3"><span className="text-sm font-semibold text-foreground">{formatCurrency(b.amountInCents)}</span></td>
                            <td className="p-3 hidden sm:table-cell"><span className="text-sm text-emerald-600">{formatCurrency(b.potentialWinInCents)}</span></td>
                            <td className="p-3"><Badge className={statusInfo.badge}>{statusInfo.label}</Badge></td>
                            <td className="p-3 hidden lg:table-cell"><span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString('pt-BR')}</span></td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {b.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 gap-1 text-emerald-600 hover:text-emerald-700 text-xs"
                                      onClick={() => { setBetSettleTarget(b); setBetSettleOpen(true) }}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Finalizar</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 gap-1 text-red-500 hover:text-red-600 text-xs"
                                      onClick={() => { setBetCancelTarget(b); setBetCancelOpen(true) }}
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Cancelar</span>
                                    </Button>
                                  </>
                                )}
                                {b.status !== 'pending' && (
                                  <span className="text-[10px] text-muted-foreground italic">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Gamepad2 className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma aposta encontrada</p>
                </div>
              )}
              {betData && betData.totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{betData.total} apostas</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={betPage <= 1} onClick={() => setBetPage(p => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
                    <span className="text-xs text-muted-foreground">{betPage}/{betData.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={betPage >= betData.totalPages} onClick={() => setBetPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== GAME CONFIG SECTION (inside Bets tab) ===== */}
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Configuração de Jogos — Métricas</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Defina pontos por vitória, pontos por participação, cashback por vitória, aposta mínima e limite de jogadas diárias para cada jogo.
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={handleOpenCreateGameConfig}>
                <Plus className="h-4 w-4" /> Novo Jogo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {gameConfigLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-muted-foreground">Carregando configurações de jogos...</span>
                </div>
              ) : gameConfigs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Jogo</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Código</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Pts/Vitória</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Pts/Partida</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Cashback/Vitória</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">Aposta Mín.</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">Máx/Dia</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameConfigs.map(g => (
                        <tr key={g.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <p className="text-sm font-medium text-foreground">{g.name}</p>
                            <p className="text-[10px] text-muted-foreground">{g.description || '—'}</p>
                          </td>
                          <td className="p-3 hidden sm:table-cell"><span className="text-xs font-mono text-muted-foreground">{g.gameCode}</span></td>
                          <td className="p-3"><span className="text-sm font-semibold text-foreground">{g.pointsPerWin}</span></td>
                          <td className="p-3 hidden md:table-cell"><span className="text-sm text-foreground">{g.pointsPerPlay}</span></td>
                          <td className="p-3 hidden md:table-cell"><span className="text-sm text-emerald-600">{g.cashbackPerWin}</span></td>
                          <td className="p-3 hidden lg:table-cell"><span className="text-xs text-foreground">{formatCurrency(g.minBetCents)}</span></td>
                          <td className="p-3 hidden lg:table-cell"><span className="text-xs text-foreground">{g.maxPlaysPerDay}</span></td>
                          <td className="p-3"><Badge className={g.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}>{g.isActive ? 'Ativo' : 'Inativo'}</Badge></td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 text-xs" onClick={() => handleOpenEditGameConfig(g)} title="Editar">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 text-xs" onClick={() => handleDeleteGameConfig(g.id)} title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Gamepad2 className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhum jogo configurado</p>
                  <p className="text-xs text-muted-foreground/70">Clique em "Novo Jogo" para adicionar uma configuração.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MATRICES TAB ===== */}
        <TabsContent value="matrices" className="mt-4 space-y-4">
          {/* Tarefa 2 (19/09) — Limites financeiros das 3 matrizes em R$.
              Antes: só "Limite de Vendas" em quantidade (1000 vendas).
              Agora: 3 cards editáveis em R$ (centavos). */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ENTRADA — R$ 96.500,00 (default mantido) */}
            <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Matriz Entrada</h4>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[9px] ml-auto">R$</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Teto financeiro da matriz de entrada (compras no app).</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Limite (R$)</Label>
                    <Input
                      type="number" min={0} step={0.01}
                      placeholder="96500.00"
                      value={entradaLimitInput}
                      onChange={(e) => setEntradaLimitInput(e.target.value)}
                      disabled={matrixLimitsLoading || matrixLimitSaving === 'entrada'}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0"
                    onClick={() => saveMatrixLimit('entrada')}
                    disabled={matrixLimitsLoading || matrixLimitSaving === 'entrada'}
                  >
                    {matrixLimitSaving === 'entrada' ? (
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar
                  </Button>
                </div>
                {!matrixLimitsLoading && (
                  <p className="text-[10px] text-muted-foreground">
                    Atual: <span className="font-bold text-emerald-700">{(entradaLimit / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* RESIDUAL — R$ 750.000,00 (default mantido) */}
            <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Matriz Residual</h4>
                  <Badge className="bg-teal-100 text-teal-700 text-[9px] ml-auto">R$</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Teto da matriz residual (pagamento mensal do plano).</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Limite (R$)</Label>
                    <Input
                      type="number" min={0} step={0.01}
                      placeholder="750000.00"
                      value={residualLimitInput}
                      onChange={(e) => setResidualLimitInput(e.target.value)}
                      disabled={matrixLimitsLoading || matrixLimitSaving === 'residual'}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shrink-0"
                    onClick={() => saveMatrixLimit('residual')}
                    disabled={matrixLimitsLoading || matrixLimitSaving === 'residual'}
                  >
                    {matrixLimitSaving === 'residual' ? (
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar
                  </Button>
                </div>
                {!matrixLimitsLoading && (
                  <p className="text-[10px] text-muted-foreground">
                    Atual: <span className="font-bold text-teal-700">{(residualLimit / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* VENDAS — "a definir" (default 0, editável quando cliente enviar) */}
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Matriz Vendas</h4>
                  <Badge className="bg-amber-100 text-amber-700 text-[9px] ml-auto">A definir</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Teto da matriz de vendas. Cliente ainda vai definir o valor — campo travado em 0 enquanto não enviado.
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Limite (R$)</Label>
                    <Input
                      type="number" min={0} step={0.01}
                      placeholder="0.00"
                      value={vendasLimitInput}
                      onChange={(e) => setVendasLimitInput(e.target.value)}
                      disabled={matrixLimitsLoading || matrixLimitSaving === 'vendas'}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shrink-0"
                    onClick={() => saveMatrixLimit('vendas')}
                    disabled={matrixLimitsLoading || matrixLimitSaving === 'vendas'}
                  >
                    {matrixLimitSaving === 'vendas' ? (
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar
                  </Button>
                </div>
                {!matrixLimitsLoading && (
                  <p className="text-[10px] text-muted-foreground">
                    Atual: <span className="font-bold text-amber-700">{vendasLimit === 0 ? 'A definir' : (vendasLimit / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Histórico consolidado de alterações dos 3 limites */}
          {(entradaHistory.length > 0 || residualHistory.length > 0 || vendasHistory.length > 0) && (
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico de alterações</p>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {[...entradaHistory.map(h => ({ ...h, matrix: 'Entrada' })),
                    ...residualHistory.map(h => ({ ...h, matrix: 'Residual' })),
                    ...vendasHistory.map(h => ({ ...h, matrix: 'Vendas' }))]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 20)
                    .map((h, i) => (
                      <div key={`${h.id}-${i}`} className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{h.matrix}</Badge>
                        <span className="font-medium text-foreground">{h.adminName}</span>
                        <span>alterou de</span>
                        <span className="font-mono text-red-500">{h.previousValue != null ? (h.previousValue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</span>
                        <span>para</span>
                        <span className="font-mono text-emerald-600 font-bold">{(h.newValue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="ml-auto text-[10px]">{new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card antigo "Limite de Vendas" removido — substituído pelos 3 cards acima */}

          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Network className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Matrizes MMN — Visualização</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Busque um usuário para visualizar suas matrizes de indicação (Entrada, Residual e Vendas) e a árvore de referências.
              </p>
            </CardContent>
          </Card>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou código de indicação..."
                    value={matrixSearchQuery}
                    onChange={(e) => setMatrixSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') searchUsersForMatrix() }}
                    className="pl-9"
                  />
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={searchUsersForMatrix} disabled={matrixSearchLoading}>
                  {matrixSearchLoading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
                </Button>
              </div>
              {matrixSearchResults.length > 0 && (
                <div className="mt-3 max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
                  {matrixSearchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectUserForMatrix(u)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge className={getPlanBadge(u.plan)}>{getPlanName(u.plan)}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected user + matrix */}
          {!matrixSelectedUser ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
                <TreePine className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Selecione um usuário para visualizar suas matrizes</p>
                <p className="text-xs text-muted-foreground/70">Use a busca acima para encontrar usuários</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selected user header */}
              <Card className="border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center">
                      {matrixSelectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{matrixSelectedUser.name}</p>
                      <p className="text-xs text-muted-foreground">{matrixSelectedUser.email}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">Código: {matrixSelectedUser.referralCode}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setMatrixSelectedUser(null); setMatrixData(null); setReferralTree(null) }}>
                    Trocar Usuário
                  </Button>
                </CardContent>
              </Card>

              {/* Matrix type selector */}
              <div className="flex gap-2 flex-wrap">
                {(['entrada', 'residual', 'vendas'] as const).map((mt) => {
                  const labels: Record<string, string> = { entrada: 'Entrada', residual: 'Residual', vendas: 'Vendas' }
                  return (
                    <button
                      key={mt}
                      onClick={() => setMatrixType(mt)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        matrixType === mt ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {labels[mt]}
                    </button>
                  )
                })}
              </div>

              {/* Stats */}
              {matrixData?.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Posições', value: matrixData.stats.totalPositions, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                    { label: 'Preenchidas', value: matrixData.stats.filledPositions, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                    { label: 'Vazias', value: matrixData.stats.emptyPositions, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                    { label: 'Níveis', value: matrixData.stats.totalLevels, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
                  ].map((card, i) => (
                    <Card key={i} className={`${card.bg} border-0`}>
                      <CardContent className="p-4">
                        <p className="text-lg font-bold text-foreground">{card.value}</p>
                        <p className={`text-xs ${card.color} font-medium`}>{card.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Level distribution */}
              {matrixData?.stats?.levelCounts && matrixData.stats.levelCounts.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-xs flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5 text-emerald-600" /> Distribuição por Nível</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {matrixData.stats.levelCounts.map(lc => (
                        <Badge key={lc.level} variant="outline" className="text-xs">Nível {lc.level}: {lc.count}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Matrix tree */}
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Network className="h-4 w-4 text-emerald-600" /> Árvore da Matriz ({matrixType})</CardTitle></CardHeader>
                <CardContent>
                  {matrixLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                      <span className="ml-3 text-sm text-muted-foreground">Carregando matriz...</span>
                    </div>
                  ) : matrixData?.tree ? (
                    <div className="max-h-[480px] overflow-y-auto pr-2">
                      {renderMatrixNode(matrixData.tree)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Usuário não possui posição nesta matriz</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Referral tree */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm flex items-center gap-2"><TreePine className="h-4 w-4 text-emerald-600" /> Árvore de Indicações</CardTitle>
                  {referralTree && (referralTree.children?.length ?? 0) > 0 && (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={expandAllReferralNodes}>Expandir tudo</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={collapseAllReferralNodes}>Recolher tudo</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {referralTreeLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="h-5 w-5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                      <span className="ml-3 text-sm text-muted-foreground">Carregando árvore...</span>
                    </div>
                  ) : referralTree ? (
                    <div className="max-h-[400px] overflow-y-auto pr-2">
                      {renderReferralNode(referralTree)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem indicações</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== TASK MATRIX-EDITOR: MODO AVANÇADO ===== */}
          {/* Toggle button — collapses/expands the inline spreadsheet editor. */}
          <Card className="border-dashed border-2 border-muted-foreground/30 dark:border-muted-foreground/40 bg-muted/20">
            <CardContent className="p-4">
              <button
                onClick={() => setMatrixAdvancedMode((v) => !v)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                    <Edit className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">Modo Avançado</h4>
                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                        EDIÇÃO DIRETA
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Editor inline de Tipos de Matriz, Níveis de Comissão (MatrixLevelEarning) e Posições
                      (MatrixPosition). Use com cautela — todas as alterações são auditadas e afetam o cálculo
                      de cashback dos usuários vinculados.
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {matrixAdvancedMode ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CardContent>
          </Card>

          {matrixAdvancedMode && (
            <>
              {/* Sub-tabs (Tipos de Matriz / Posições de Matriz) */}
              <div className="flex gap-2 flex-wrap">
                {(['types', 'positions'] as const).map((t) => {
                  const labels: Record<string, string> = { types: 'Tipos de Matriz', positions: 'Posições de Matriz' }
                  return (
                    <button
                      key={t}
                      onClick={() => setMatrixAdvancedTab(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        matrixAdvancedTab === t
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {labels[t]}
                    </button>
                  )
                })}
              </div>

              {/* ===== TAB 1: TIPOS DE MATRIZ ===== */}
              {matrixAdvancedTab === 'types' && (
                <Card>
                  <CardHeader className="pb-2 px-4 pt-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-foreground">Tipos de Matriz</h4>
                      <Badge variant="secondary" className="text-[10px]">{matrixTypesData.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cada linha representa um tipo de matriz (Entrada, Residual, Vendas ou Mista). Edite os
                      níveis de comissão clicando em <strong>Editar Níveis</strong>.
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {matrixTypesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                        <span className="ml-3 text-sm text-muted-foreground">Carregando tipos...</span>
                      </div>
                    ) : matrixTypesData.length === 0 ? (
                      <div className="p-12 text-center">
                        <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhum tipo de matriz cadastrado.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-muted/50">
                            <tr className="text-left">
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Nome</th>
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Código</th>
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Tipo</th>
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Largura</th>
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Profundidade</th>
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Ativo</th>
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Níveis</th>
                              <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matrixTypesData.map((mt: any) => {
                              const kindLabels: Record<string, string> = { entrada: 'Entrada', residual: 'Residual', vendas: 'Vendas', mixed: 'Mista' }
                              const kindColors: Record<string, string> = {
                                entrada: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                                residual: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
                                vendas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                                mixed: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                              }
                              const levelCount = (mt.levelEarnings || []).length
                              return (
                                <tr key={mt.id} className="border-t border-border hover:bg-muted/30">
                                  <td className="p-3 align-top">
                                    <p className="text-sm font-medium text-foreground">{mt.name}</p>
                                    {mt.description && (
                                      <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">{mt.description}</p>
                                    )}
                                  </td>
                                  <td className="p-3 align-top">
                                    <code className="text-xs font-mono text-emerald-700 dark:text-emerald-400">{mt.code}</code>
                                  </td>
                                  <td className="p-3 align-top">
                                    <Badge className={`text-[10px] ${kindColors[mt.matrixKind] || 'bg-muted text-muted-foreground'}`}>
                                      {kindLabels[mt.matrixKind] || mt.matrixKind}
                                    </Badge>
                                  </td>
                                  <td className="p-3 align-top text-sm text-foreground font-mono">{mt.width}</td>
                                  <td className="p-3 align-top text-sm text-foreground font-mono">{mt.depth}</td>
                                  <td className="p-3 align-top">
                                    {mt.isActive ? (
                                      <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                                        <Check className="h-3 w-3 mr-1" /> Ativo
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">
                                        <X className="h-3 w-3 mr-1" /> Inativo
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="p-3 align-top">
                                    <Badge variant="secondary" className="text-[10px] font-mono">{levelCount}</Badge>
                                  </td>
                                  <td className="p-3 align-top">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1.5"
                                        onClick={() => openEditMatrixLevels(mt)}
                                        title="Editar níveis de comissão"
                                      >
                                        <Edit className="h-3.5 w-3.5" /> Editar Níveis
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ===== TAB 2: POSIÇÕES DE MATRIZ ===== */}
              {matrixAdvancedTab === 'positions' && (
                <>
                  {/* Filters */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nome ou email do usuário..."
                            value={matrixPosSearch}
                            onChange={(e) => setMatrixPosSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setMatrixPositionsPage(1)
                                loadMatrixPositions({ page: 1, search: e.currentTarget.value, type: matrixPosFilterType, level: matrixPosFilterLevel })
                              }
                            }}
                            className="pl-9"
                          />
                        </div>
                        <select
                          value={matrixPosFilterType}
                          onChange={(e) => {
                            const v = e.target.value
                            setMatrixPosFilterType(v)
                            setMatrixPositionsPage(1)
                            loadMatrixPositions({ page: 1, search: matrixPosSearch, type: v, level: matrixPosFilterLevel })
                          }}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
                        >
                          <option value="all">Todos os tipos</option>
                          <option value="entrada">Entrada</option>
                          <option value="residual">Residual</option>
                          <option value="vendas">Vendas</option>
                        </select>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Nível"
                          value={matrixPosFilterLevel}
                          onChange={(e) => setMatrixPosFilterLevel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setMatrixPositionsPage(1)
                              loadMatrixPositions({ page: 1, search: matrixPosSearch, type: matrixPosFilterType, level: e.currentTarget.value })
                            }
                          }}
                          className="w-full sm:w-24"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 gap-1.5"
                          onClick={() => {
                            setMatrixPositionsPage(1)
                            loadMatrixPositions({ page: 1, search: matrixPosSearch, type: matrixPosFilterType, level: matrixPosFilterLevel })
                          }}
                        >
                          <Filter className="h-3.5 w-3.5" /> Aplicar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {matrixPositionsLoading ? 'Carregando...' : `${matrixPositionsTotal} posiç${matrixPositionsTotal === 1 ? 'ão' : 'ões'} encontrada${matrixPositionsTotal === 1 ? '' : 's'}`}
                        </span>
                        {matrixPositionsTotal > 50 && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              disabled={matrixPositionsPage <= 1 || matrixPositionsLoading}
                              onClick={() => {
                                const newPage = Math.max(1, matrixPositionsPage - 1)
                                setMatrixPositionsPage(newPage)
                                loadMatrixPositions({ page: newPage, search: matrixPosSearch, type: matrixPosFilterType, level: matrixPosFilterLevel })
                              }}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                            </Button>
                            <span className="font-mono">Pág {matrixPositionsPage}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              disabled={matrixPositionsPage * 50 >= matrixPositionsTotal || matrixPositionsLoading}
                              onClick={() => {
                                const newPage = matrixPositionsPage + 1
                                setMatrixPositionsPage(newPage)
                                loadMatrixPositions({ page: newPage, search: matrixPosSearch, type: matrixPosFilterType, level: matrixPosFilterLevel })
                              }}
                            >
                              Próxima <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Positions table */}
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-3">
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm font-semibold text-foreground">Posições de Matriz</h4>
                        <Badge variant="secondary" className="text-[10px]">{matrixPositionsData.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {matrixPositionsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                          <span className="ml-3 text-sm text-muted-foreground">Carregando posições...</span>
                        </div>
                      ) : matrixPositionsData.length === 0 ? (
                        <div className="p-12 text-center">
                          <Network className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">Nenhuma posição encontrada com os filtros aplicados.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[560px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-muted/50 sticky top-0 z-10">
                              <tr className="text-left">
                                <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Usuário</th>
                                <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Tipo de Matriz</th>
                                <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Nível</th>
                                <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Posição</th>
                                <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                                <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Data</th>
                                <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matrixPositionsData.map((pos: any) => {
                                const kindColors: Record<string, string> = {
                                  entrada: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                                  residual: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
                                  vendas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                                }
                                const kindLabels: Record<string, string> = { entrada: 'Entrada', residual: 'Residual', vendas: 'Vendas' }
                                return (
                                  <tr key={pos.id} className="border-t border-border hover:bg-muted/30">
                                    <td className="p-3 align-top">
                                      <p className="text-sm font-medium text-foreground">{pos.userName || '—'}</p>
                                      <p className="text-[10px] text-muted-foreground">{pos.userEmail || pos.userId}</p>
                                    </td>
                                    <td className="p-3 align-top">
                                      <Badge className={`text-[10px] ${kindColors[pos.matrixType] || 'bg-muted text-muted-foreground'}`}>
                                        {kindLabels[pos.matrixType] || pos.matrixType}
                                      </Badge>
                                    </td>
                                    <td className="p-3 align-top text-sm text-foreground font-mono">{pos.level}</td>
                                    <td className="p-3 align-top text-sm text-foreground font-mono">{pos.position}</td>
                                    <td className="p-3 align-top">
                                      {pos.isFilled ? (
                                        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                                          <Check className="h-3 w-3 mr-1" /> Preenchida
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                          <Clock className="h-3 w-3 mr-1" /> Reservada
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="p-3 align-top hidden md:table-cell text-xs text-muted-foreground">
                                      {new Date(pos.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="p-3 align-top">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-xs"
                                          onClick={() => openEditMatrixPosition(pos)}
                                          title="Editar"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                          onClick={() => deleteMatrixPosition(pos)}
                                          title="Excluir"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ===== DIALOG: EDIT MATRIX LEVEL EARNINGS (inline table) ===== */}
              <Dialog open={matrixLevelDialogOpen} onOpenChange={setMatrixLevelDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-600" />
                      Editar Níveis — {editingMatrixType?.name}
                    </DialogTitle>
                    <DialogDescription>
                      Edite inline os níveis de comissão. <strong>Salvar</strong> substitui todos os níveis
                      de uma vez (operação atômica auditada). Porcentagens entre 0 e 100; bônus fixo em
                      centavos (R$ 1,00 = 100).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    {/* Tarefa (22/09): editar largura e profundidade da matriz */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Largura (indicados por nível)</Label>
                        <Input
                          type="number" min={1} max={20} step={1}
                          value={editingMatrixWidth}
                          onChange={(e) => setEditingMatrixWidth(Number(e.target.value) || 4)}
                          className="h-9 text-sm font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">Ex: 4 = matriz 4-wide</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Profundidade (níveis)</Label>
                        <Input
                          type="number" min={1} max={20} step={1}
                          value={editingMatrixDepth}
                          onChange={(e) => setEditingMatrixDepth(Number(e.target.value) || 5)}
                          className="h-9 text-sm font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">Ex: 5 = 5 níveis de profundidade ({editingMatrixWidth}x{editingMatrixDepth})</p>
                      </div>
                    </div>

                    {matrixLevelDraft.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-border rounded-lg">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum nível configurado. Clique em <strong>Adicionar Nível</strong>.</p>
                      </div>
                    ) : (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-muted/50 sticky top-0 z-10">
                              <tr className="text-left">
                                <th className="p-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">Level #</th>
                                <th className="p-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">Percentage (%)</th>
                                <th className="p-2 font-medium text-xs text-muted-foreground uppercase tracking-wide">Fixed Bonus (cents)</th>
                                <th className="p-2 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matrixLevelDraft.map((le, idx) => (
                                <tr key={idx} className="border-t border-border">
                                  <td className="p-2 align-middle">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={editingMatrixType?.depth || 20}
                                      step={1}
                                      value={le.level}
                                      onChange={(e) => {
                                        const v = e.target.value
                                        setMatrixLevelDraft((prev) => prev.map((row, i) => i === idx ? { ...row, level: v === '' ? '' : Number(v) } : row))
                                      }}
                                      className="h-8 w-16 text-sm font-mono"
                                    />
                                  </td>
                                  <td className="p-2 align-middle">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min={0}
                                      max={100}
                                      value={le.percentage}
                                      onChange={(e) => {
                                        const v = e.target.value
                                        setMatrixLevelDraft((prev) => prev.map((row, i) => i === idx ? { ...row, percentage: v === '' ? 0 : Number(v) } : row))
                                      }}
                                      className="h-8 w-24 text-sm font-mono"
                                    />
                                  </td>
                                  <td className="p-2 align-middle">
                                    <Input
                                      type="number"
                                      step={1}
                                      min={0}
                                      value={le.fixedBonusCents}
                                      onChange={(e) => {
                                        const v = e.target.value
                                        setMatrixLevelDraft((prev) => prev.map((row, i) => i === idx ? { ...row, fixedBonusCents: v === '' ? 0 : Number(v) } : row))
                                      }}
                                      className="h-8 w-32 text-sm font-mono"
                                    />
                                  </td>
                                  <td className="p-2 align-middle text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      onClick={() => setMatrixLevelDraft((prev) => prev.filter((_, i) => i !== idx))}
                                      title="Remover nível"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => {
                          const nextLevel = matrixLevelDraft.length + 1
                          setMatrixLevelDraft((prev) => [...prev, { id: '', level: nextLevel, percentage: 0, fixedBonusCents: 0 }])
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar Nível
                      </Button>
                      <p className="text-[10px] text-muted-foreground ml-auto">
                        Profundidade máxima: <span className="font-mono font-bold text-foreground">{editingMatrixType?.depth ?? '—'}</span> níveis
                      </p>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Esta operação <strong>substitui completamente</strong> os níveis atuais. Salvar
                        apaga e recria todos os registros MatrixLevelEarning vinculados a este tipo de
                        matriz, com auditoria. As alterações afetam o cálculo de cashback dos usuários
                        vinculados.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setMatrixLevelDialogOpen(false)}
                      disabled={matrixLevelSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={saveMatrixLevels}
                      disabled={matrixLevelSaving}
                    >
                      {matrixLevelSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Save className="h-4 w-4" /> Salvar Níveis
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* ===== DIALOG: EDIT MATRIX POSITION ===== */}
              <Dialog open={matrixPositionDialogOpen} onOpenChange={setMatrixPositionDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-emerald-600" />
                      Editar Posição
                    </DialogTitle>
                    <DialogDescription>
                      Altere o nível, a posição ou o status da posição. A operação é auditada.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                        {(editingMatrixPosition?.userName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{editingMatrixPosition?.userName || '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{editingMatrixPosition?.userEmail || editingMatrixPosition?.userId}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{editingMatrixPosition?.matrixType}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Nível</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={matrixPosForm.level}
                          onChange={(e) => setMatrixPosForm((f) => ({ ...f, level: Number(e.target.value) }))}
                          className="text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Posição</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={matrixPosForm.position}
                          onChange={(e) => setMatrixPosForm((f) => ({ ...f, position: Number(e.target.value) }))}
                          className="text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Status</Label>
                      <Select
                        value={matrixPosForm.status}
                        onValueChange={(v) => setMatrixPosForm((f) => ({ ...f, status: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="filled">Preenchida (isFilled = true)</SelectItem>
                          <SelectItem value="reserved">Reservada (isFilled = false)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        <strong>Preenchida</strong> = posição ocupada por um usuário real.
                        <strong> Reservada</strong> = posição alocada mas sem usuário vinculado.
                      </p>
                    </div>

                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Alterações em nível/posição podem afetar o cálculo de cashback e a estrutura da árvore.
                        Auditada em <code className="font-mono">matrix_position.update</code>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setMatrixPositionDialogOpen(false)}
                      disabled={matrixPosSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={saveMatrixPosition}
                      disabled={matrixPosSaving}
                    >
                      {matrixPosSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Save className="h-4 w-4" /> Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </TabsContent>

        {/* ===== CASHBACK CONFIG TAB ===== */}
        <TabsContent value="cashback-config" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Configuração de Cashback & Pontos</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Defina as porcentagens de cashback por nível para cada matriz e os pontos atribuídos por ação.
              </p>
            </CardContent>
          </Card>

          {cashbackConfigLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando configurações...</span>
              </CardContent>
            </Card>
          ) : cashbackConfig ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(['entrada', 'residual', 'vendas'] as const).map((mtype) => {
                  const levelCount = mtype === 'entrada' ? 5 : mtype === 'residual' ? 7 : 9
                  const labels: Record<string, string> = { entrada: 'Entrada', residual: 'Residual', vendas: 'Vendas' }
                  return (
                    <Card key={mtype}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Receipt className={`h-4 w-4 ${mtype === 'entrada' ? 'text-blue-600' : mtype === 'residual' ? 'text-purple-600' : 'text-emerald-600'}`} />
                          Cashback {labels[mtype]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Array.from({ length: levelCount }, (_, i) => {
                          const levelKey = `level${i + 1}` as keyof typeof cashbackConfig[typeof mtype]
                          const value = cashbackConfig[mtype]?.[levelKey as string] ?? 0
                          return (
                            <div key={levelKey} className="flex items-center gap-2">
                              <Label className="text-xs w-16 shrink-0">Nível {i + 1}</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={value}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0
                                  setCashbackConfig(prev => prev ? {
                                    ...prev,
                                    [mtype]: { ...(prev[mtype] || {}), [`level${i + 1}`]: newValue },
                                  } : prev)
                                }}
                                className="h-8 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          )
                        })}
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-8 text-xs"
                          onClick={() => handleSaveCashbackConfig(mtype)}
                          disabled={cashbackSaving}
                        >
                          {cashbackSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Salvar {labels[mtype]}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Points config */}
              {pointsConfig && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-emerald-600" />
                      Configuração de Pontos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(pointsConfig)
                        .filter(([k]) => k !== 'raw')
                        .map(([key, value]) => {
                          const labels: Record<string, string> = {
                            referralPoints: 'Indicação',
                            planUpgradePoints: 'Upgrade de Plano',
                            dailyLoginPoints: 'Login Diário',
                            betPlacedPoints: 'Aposta Realizada',
                            betWonPoints: 'Aposta Ganha',
                            marketplacePurchasePoints: 'Compra no Marketplace',
                            ticketResolvedPoints: 'Ticket Resolvido',
                            rideCompletedPoints: 'Corrida Concluída',
                            challengeCompletedPoints: 'Desafio Concluído',
                          }
                          return (
                            <div key={key} className="space-y-1.5">
                              <Label className="text-xs">{labels[key] || key}</Label>
                              <Input
                                type="number"
                                value={value}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 0
                                  setPointsConfig(prev => prev ? { ...prev, [key]: newValue } : prev)
                                }}
                                className="h-8 text-sm"
                              />
                              <p className="text-[10px] text-muted-foreground">pontos por ação</p>
                            </div>
                          )
                        })}
                    </div>
                    <Button
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 text-xs"
                      onClick={handleSavePointsConfig}
                      disabled={pointsSaving}
                    >
                      {pointsSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Salvar Pontos
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Falha ao carregar configurações.</CardContent></Card>
          )}
        </TabsContent>

        {/* ===== ACHIEVEMENTS TAB ===== */}
        <TabsContent value="achievements" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Conquistas</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure as conquistas que os usuários podem desbloquear ao realizar ações específicas. Cada conquista concede pontos para o plano de carreira.
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={handleOpenCreateAchievement}>
                <Plus className="h-4 w-4" /> Nova Conquista
              </Button>
            </CardContent>
          </Card>

          {achievementLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando conquistas...</span>
            </CardContent></Card>
          ) : achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievements.map(a => (
                <Card key={a.id} className={!a.isActive ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-2xl shrink-0">{a.icon || '🏆'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{a.code}</p>
                        </div>
                      </div>
                      <Badge className={a.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}>{a.isActive ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.description || '—'}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] gap-1">
                        <Star className="h-2.5 w-2.5" /> {a.pointsReward} pts
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">Meta: {a.targetValue}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-3 border-t border-border pt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 text-xs" onClick={() => handleOpenEditAchievement(a)} title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 text-xs" onClick={() => handleDeleteAchievement(a.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <Trophy className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma conquista cadastrada</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ===== CAREER PLANS TAB ===== */}
        <TabsContent value="career-plans" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Plano de Carreira</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure os níveis do plano de carreira. Cada nível exige uma pontuação mínima e concede um bônus mensal em centavos.
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={handleOpenCreateCareerPlan}>
                <Plus className="h-4 w-4" /> Novo Nível
              </Button>
            </CardContent>
          </Card>

          {careerPlanLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando planos...</span>
            </CardContent></Card>
          ) : careerPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {careerPlans.map(c => (
                <Card key={c.id} className={!c.isActive ? 'opacity-60' : ''} style={{ borderTopColor: c.color || undefined, borderTopWidth: c.color ? 4 : undefined }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{c.icon || '🏅'}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.code}</p>
                        </div>
                      </div>
                      <Badge className={c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}>{c.isActive ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description || '—'}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">Pontos Mínimos</p>
                        <p className="text-sm font-bold text-foreground">{c.minPoints}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">9.1 Carteira Saque</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {(c.rewardWithdrawalCents ?? 0) > 0
                            ? formatCurrency(c.rewardWithdrawalCents ?? 0)
                            : '—'}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">9.2 Carteira Compras</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {(c.rewardShoppingCents ?? 0) > 0
                            ? formatCurrency(c.rewardShoppingCents ?? 0)
                            : '—'}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">9.3 Recompensa Pontos</p>
                        <p className="text-sm font-bold text-amber-600">
                          {(c.rewardPoints ?? 0) > 0
                            ? `${Number(c.rewardPoints).toLocaleString('pt-BR')} pts`
                            : '—'}
                        </p>
                      </div>
                    </div>
                    {(c.gratification && c.gratification.trim().length > 0) && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900/50">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">9.4 Gratificação</p>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 line-clamp-2">{c.gratification}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-3 border-t border-border pt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 text-xs" onClick={() => handleOpenEditCareerPlan(c)} title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 text-xs" onClick={() => handleDeleteCareerPlan(c.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <Trophy className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum plano de carreira cadastrado</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ===== DRIVER CATEGORIES TAB ===== */}
        <TabsContent value="driver-categories" className="mt-4 space-y-4">
          {/* Caixa explicativa azul no topo — explica as regras das categorias
              de veículo (NÃO é o mesmo que CareerPlan). */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Como funcionam as Categorias de Motorista
              </p>
            </div>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5 pl-6 list-disc">
              <li>
                <strong>Categorias de veículo NÃO são plano de carreira.</strong>{' '}
                Plano de Carreira (Safira→Imperial por <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-[10px]">careerPoints</code>) é separado.
              </li>
              <li>
                <strong>Bônus só é pago</strong> se o motorista bater a meta de corridas no mês.
              </li>
              <li>
                <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-[10px]">maxCancellationPerMonth = 0</code> significa{' '}
                <strong>tolerância zero</strong> (categoria idoso/preferencial). Cancelar 1 corrida já desqualifica do bônus.
              </li>
              <li>
                Demais categorias toleram até <strong>2 cancelamentos</strong> (configurável por categoria).
              </li>
            </ul>
          </div>

          {/* Header card com botão "Nova Categoria" — padrão visual igual aos outros TabsContent */}
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Car className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-foreground">Categorias de Motorista</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure as categorias de veículo (Safira → Imperial). Cada categoria tem meta mensal de corridas, bônus e regra de cancelamento.
                </p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0" onClick={handleOpenCreateDriverCategory}>
                <Plus className="h-4 w-4" /> Nova Categoria
              </Button>
            </CardContent>
          </Card>

          {driverCategoriesLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando categorias...</span>
            </CardContent></Card>
          ) : driverCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {driverCategories.map(c => (
                <Card key={c.id} className={!c.isActive ? 'opacity-60' : ''} style={{ borderTopColor: c.color || undefined, borderTopWidth: c.color ? 4 : undefined }}>
                  <CardContent className="p-4">
                    {/* Header: ícone + nome + código + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{c.icon || '🚗'}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.code}</p>
                        </div>
                      </div>
                      <Badge className={c.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}>
                        {c.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    {/* Descrição */}
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description || '—'}</p>

                    {/* Grid de métricas */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">Meta mensal</p>
                        <p className="text-sm font-bold text-foreground">
                          {c.monthlyTripsTarget} <span className="text-[10px] font-normal text-muted-foreground">corridas/mês</span>
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">Bônus (se bater)</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {c.bonusCents > 0 ? formatCurrency(c.bonusCents) : '—'}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">Cancelamento/mês</p>
                        {c.maxCancellationPerMonth === 0 ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
                            Tolerância ZERO
                          </Badge>
                        ) : (
                          <p className="text-sm font-bold text-foreground">
                            {c.maxCancellationPerMonth} <span className="text-[10px] font-normal text-muted-foreground">max</span>
                          </p>
                        )}
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground">Motoristas</p>
                        <p className="text-sm font-bold text-blue-600">
                          {c.userCount}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-between gap-1 mt-3 border-t border-border pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleToggleDriverCategoryActive(c)}
                        title={c.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {c.isActive ? (
                          <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="ml-1 hidden sm:inline">{c.isActive ? 'Desativar' : 'Ativar'}</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 text-xs" onClick={() => handleOpenEditDriverCategory(c)} title="Editar">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 text-xs" onClick={() => handleDeleteDriverCategory(c.id)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <Car className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma categoria de motorista cadastrada</p>
              <p className="text-[10px] text-muted-foreground">Crie categorias como Safira, Rubi, Esmeralda, Diamante e Imperial.</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ===== STREAK REWARDS TAB ===== */}
        <TabsContent value="streak-rewards" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Recompensas de Sequência</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure recompensas para usuários que acessam a plataforma por dias consecutivos. Prêmios por streak de 7, 14, 30, 60 ou 90 dias.
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={handleOpenCreateStreakReward}>
                <Plus className="h-4 w-4" /> Nova Recompensa
              </Button>
            </CardContent>
          </Card>

          {streakRewardLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando recompensas...</span>
            </CardContent></Card>
          ) : streakRewards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {streakRewards.map(s => {
                // ADM-6 — derive the human-readable reward label and amount
                // string for the card. Cashback amounts are stored as cents
                // (so we format as R$ via formatCurrency); points are raw
                // integers (so we just append "pts").
                const isCashback = s.rewardType === 'cashback'
                const rewardTypeLabel = isCashback ? 'CashBack' : 'Pontos'
                const rewardAmountStr = isCashback
                  ? formatCurrency(s.rewardAmount)
                  : `${s.rewardAmount} pts`
                return (
                <Card key={s.id} className={!s.isActive ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-lg">
                          {s.streakDays}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{s.streakDays} dias</p>
                          {/* ADM-6 — show a friendly type label (Cashback / Pontos)
                              instead of the raw rewardType string. */}
                          <Badge
                            variant="outline"
                            className={
                              isCashback
                                ? 'mt-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px]'
                                : 'mt-0.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-[10px]'
                            }
                          >
                            {isCashback ? <Wallet className="h-2.5 w-2.5 mr-0.5" /> : <Star className="h-2.5 w-2.5 mr-0.5" />}
                            {rewardTypeLabel}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={s.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}>{s.isActive ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{s.description || '—'}</p>
                    {/* ADM-6 — clearly show "Recompensa: R$ X,XX (Cashback)"
                        or "Recompensa: 500 pts (Pontos)" so the admin can
                        tell at a glance which type each reward grants. */}
                    <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                        Recompensa: {rewardAmountStr} ({rewardTypeLabel})
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-3 border-t border-border pt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 text-xs" onClick={() => handleOpenEditStreakReward(s)} title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 text-xs" onClick={() => handleDeleteStreakReward(s.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <Heart className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma recompensa de sequência cadastrada</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ===== EVENTS TAB ===== */}
        <TabsContent value="events" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Eventos</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gerencie webinars, encontros presenciais, lançamentos e promoções da plataforma.
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={handleOpenCreateEvent}>
                <Plus className="h-4 w-4" /> Novo Evento
              </Button>
            </CardContent>
          </Card>

          {eventLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando eventos...</span>
            </CardContent></Card>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              {events.map(e => {
                const typeColors: Record<string, string> = {
                  webinar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  promo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  launch: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  meetup: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                }
                const statusColors: Record<string, string> = {
                  upcoming: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  ongoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                }
                return (
                  <Card key={e.id} className={!e.isActive ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{e.title}</span>
                            <Badge className={typeColors[e.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>{e.type}</Badge>
                            <Badge className={statusColors[e.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>{e.status}</Badge>
                            {!e.isActive && <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px]">Inativo</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                          <div className="flex items-center flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(e.eventDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                            {e.meetingUrl && <span className="flex items-center gap-1 truncate max-w-[200px]">🔗 {e.meetingUrl}</span>}
                            {e.maxAttendees && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {e.registrationCount}/{e.maxAttendees}</span>}
                            {!e.maxAttendees && e.registrationCount > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {e.registrationCount} inscritos</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 text-xs" onClick={() => handleOpenEditEvent(e)} title="Editar">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 text-xs" onClick={() => handleDeleteEvent(e.id)} title="Excluir">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <Calendar className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum evento cadastrado</p>
              <p className="text-xs text-muted-foreground/70">Clique em "Novo Evento" para criar o primeiro.</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ===== FAQ TAB ===== */}
        <TabsContent value="faq" className="mt-4 space-y-4">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Perguntas Frequentes (FAQ)</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gerencie as perguntas frequentes exibidas para os usuários sobre cashback, saques, indicações, carreira e mais.
                </p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0" onClick={handleOpenCreateFaq}>
                <Plus className="h-4 w-4" /> Nova Pergunta
              </Button>
            </CardContent>
          </Card>

          {faqLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando FAQs...</span>
            </CardContent></Card>
          ) : faqs.length > 0 ? (
            <div className="space-y-3">
              {faqs.map(f => (
                <Card key={f.id} className={!f.isActive ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">Ordem: {f.sortOrder}</span>
                          {!f.isActive && <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px]">Inativo</Badge>}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{f.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">{f.answer}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 text-blue-600 hover:text-blue-700 text-xs" onClick={() => handleOpenEditFaq(f)} title="Editar">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 text-xs" onClick={() => handleDeleteFaq(f.id)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <Info className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma pergunta frequente cadastrada</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Withdrawals Asaas Tab — admin approval panel for Asaas-tracked withdrawals (Task 12-D) */}
        <TabsContent value="withdrawals-asaas" className="mt-4 space-y-4">
          <AdminWithdrawalsPanel />
        </TabsContent>

        {/* Asaas Config Tab — gateway configuration (Task 12-B) */}
        <TabsContent value="asaas" className="mt-4 space-y-4">
          <AsaasConfigPanel />
        </TabsContent>

        {/* KYC Approval Tab — Task 14-A */}
        <TabsContent value="kyc" className="mt-4 space-y-4">
          <AdminKycPanel />
        </TabsContent>

        {/* Audit Log Tab — Task 14-D */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <AdminAuditPanel />
        </TabsContent>

        {/* Permissions Matrix Tab — Task 14-D */}
        <TabsContent value="permissions" className="mt-4 space-y-4">
          <AdminPermissionsPanel />
        </TabsContent>

        {/* Challenges Tab — Task 14-G */}
        <TabsContent value="challenges" className="mt-4 space-y-4">
          <AdminChallengesPanel />
        </TabsContent>

        {/* TalkMobi Plans Tab — admin editor for the TalkMobi plan catalogue */}
        <TabsContent value="talkmobi" className="mt-4 space-y-4">
          <TalkMobiManager />
        </TabsContent>

        {/* TalkMobi Subscriptions Tab — admin approval panel for subscription requests */}
        <TabsContent value="talkmobi-subscriptions" className="mt-4 space-y-4">
          <AdminTalkMobiSubscriptionsPanel />
        </TabsContent>

        {/* Telemedicina Tab — admin approval panel for activation requests */}
        <TabsContent value="telemedicina" className="mt-4 space-y-4">
          <AdminTelemedicinaPanel />
        </TabsContent>

        {/* ===== CONTENT TEXTS TAB (Item 1) =====
            Admin control over ALL system texts/labels. Backed by the
            SystemConfig table (filtered by category). */}
        <TabsContent value="content-texts" className="mt-4 space-y-4">
          {/* Header card */}
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Type className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Conteúdo e Textos</h3>
                  <Badge variant="secondary" className="text-[10px]">{contentTexts.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Edite todos os textos e rótulos do sistema (Cliente, Motorista, Lojista, App Mobile, etc.)
                  sem precisar de deploy. Use categorias para agrupar textos por módulo.
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
                onClick={openCreateContentText}
              >
                <Plus className="h-4 w-4" /> Novo Texto
              </Button>
            </CardContent>
          </Card>

          {/* Search + category filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por chave, valor ou descrição..."
                    value={contentTextSearch}
                    onChange={(e) => setContentTextSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={contentTextCategoryFilter}
                  onChange={(e) => setContentTextCategoryFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
                >
                  <option value="all">Todas as categorias</option>
                  {CONTENT_TEXT_CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {contentTextsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando textos...</span>
              </CardContent>
            </Card>
          ) : filteredContentTexts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Type className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Nenhum texto encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {contentTexts.length === 0
                    ? 'Nenhum texto cadastrado ainda. Clique em "Novo Texto" para criar o primeiro.'
                    : 'Nenhum texto corresponde aos filtros aplicados.'}
                </p>
                {contentTexts.length === 0 && (
                  <Button
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={openCreateContentText}
                  >
                    <Plus className="h-4 w-4" /> Criar Texto
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Chave</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Valor</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Categoria</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Atualizado em</th>
                        <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContentTexts.map((t) => (
                        <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                          <td className="p-3">
                            <code className="text-xs font-mono text-emerald-700 dark:text-emerald-400 break-all">
                              {t.key}
                            </code>
                            {t.description && (
                              <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                {t.description}
                              </div>
                            )}
                          </td>
                          <td className="p-3 max-w-md">
                            <span className="text-foreground line-clamp-2">{t.value}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px]">
                              {t.category || 'geral'}
                            </Badge>
                          </td>
                          <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                            {new Date(t.updatedAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => openEditContentText(t)}
                                title="Editar"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => deleteContentText(t)}
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create / Edit Dialog */}
          <Dialog open={contentTextDialogOpen} onOpenChange={setContentTextDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-emerald-600" />
                  {editingContentText ? 'Editar Texto' : 'Novo Texto'}
                </DialogTitle>
                <DialogDescription>
                  {editingContentText
                    ? 'Edite o valor, a descrição ou a categoria deste texto. A chave não pode ser alterada.'
                    : 'Crie um novo texto editável. A chave é o identificador único usado no código (ex: menu_dashboard).'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Key */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Chave (key) *</Label>
                  <Input
                    placeholder="ex: menu_dashboard"
                    value={contentTextForm.key}
                    onChange={(e) => setContentTextForm((f) => ({ ...f, key: e.target.value }))}
                    disabled={!!editingContentText}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Apenas letras minúsculas, números e underline. Ex: <code>menu_cashback</code>.
                  </p>
                </div>

                {/* Value */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Valor *</Label>
                  <Textarea
                    placeholder="Texto que será exibido no sistema"
                    value={contentTextForm.value}
                    onChange={(e) => setContentTextForm((f) => ({ ...f, value: e.target.value }))}
                    rows={3}
                    className="text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Saudação exibida pela manhã no dashboard"
                    value={contentTextForm.description}
                    onChange={(e) => setContentTextForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Categoria *</Label>
                  <Select
                    value={contentTextForm.category}
                    onValueChange={(v) => setContentTextForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTENT_TEXT_CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setContentTextDialogOpen(false)}
                  disabled={contentTextSaving}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={saveContentText}
                  disabled={contentTextSaving}
                >
                  {contentTextSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingContentText ? 'Salvar Alterações' : 'Criar Texto'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== SYSTEM SETTINGS TAB (SETTINGS-1) =====
            Comprehensive admin editor for EVERYTHING in the system:
            matrix values, cashback %, plan prices, withdrawal limits,
            points config, vouchers, metas, platform name, etc. */}
        <TabsContent value="system-settings" className="mt-4 space-y-4">
          {/* Header card */}
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Configurações do Sistema</h3>
                  <Badge variant="secondary" className="text-[10px]">{systemSettings.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Edite todos os valores, nomes, porcentagens e configurações do sistema —
                  matrizes (4x5, 4x7, 4x9), cashback, planos, saques, pontos, vouchers, metas e mais.
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
                onClick={openCreateSystemSetting}
              >
                <Plus className="h-4 w-4" /> Nova Configuração
              </Button>
            </CardContent>
          </Card>

          {/* Sincronizar Dados Demo (rodar seed via UI, sem SSH) */}
          <Card className="border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-foreground">Sincronizar Dados Demo (Seed)</h3>
                    <Badge variant="secondary" className="text-[10px]">sem SSH</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Roda o <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-[10px]">prisma/seed.ts</code> direto daqui
                    — cria 32 usuários demo, 14 tipos, planos, matrizes, cashback demo, FAQs, etc. Atenção: com ALLOW_DESTRUCTIVE_SEED ativo no ambiente, usuários reais fora da lista demo serão apagados junto com seus dados (cashback, faturas, pedidos, KYC, saques). Sem a flag, o cleanup é ignorado por segurança. Um backup automático do banco é feito antes de cada seed.
                  </p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0"
                  onClick={handleRunSeed}
                  disabled={seedLoading || !user?.id}
                >
                  {seedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {seedLoading ? 'Rodando...' : 'Rodar Seed'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-blue-600" /> Etapa do Seed
                  </Label>
                  <select
                    value={seedStep}
                    onChange={(e) => setSeedStep(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">⚡ Tudo (recomendado)</option>
                    <option value="users">👥 Usuários (32 demo + cleanup)</option>
                    <option value="user-types">👤 Tipos de Usuário (14)</option>
                    <option value="configs">⚙️ Configs do Sistema (12)</option>
                    <option value="plans">💼 Planos (free/blue3/blue5)</option>
                    <option value="career-plans">🏆 Planos de Carreira (5)</option>
                    <option value="goal-configs">🎯 Metas (driver/delivery)</option>
                    <option value="streak-rewards">🔥 Recompensas de Streak</option>
                    <option value="service-types">🔧 Tipos de Serviço (15)</option>
                    <option value="events">📅 Eventos (3)</option>
                    <option value="categories">🛍️ Categorias (8)</option>
                    <option value="faqs">❓ FAQs (6)</option>
                    <option value="cashback">💰 Cashback Demo (9 entries)</option>
                    <option value="announcements">📢 Anúncios (5)</option>
                    <option value="audit-logs">📜 Logs de Auditoria (10)</option>
                    <option value="challenges">🎯 Desafios (7)</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-blue-600" /> Estado atual do banco
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 px-2 ml-1 text-[10px]"
                      onClick={handleLoadDbCounts}
                      disabled={!user?.id}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
                    </Button>
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      ['users', 'Usuários'],
                      ['userTypes', 'Tipos'],
                      ['plans', 'Planos'],
                      ['careerPlans', 'Carreiras'],
                      ['cashbackEntries', 'CB Entrada'],
                      ['cashbackResidual', 'CB Residual'],
                      ['cashbackSales', 'CB Vendas'],
                      ['serviceTypes', 'Serviços'],
                      ['events', 'Eventos'],
                      ['faqs', 'FAQs'],
                      ['systemConfigs', 'Configs'],
                      ['announcements', 'Anúncios'],
                      ['auditLogs', 'Logs Audit'],
                      ['challenges', 'Desafios'],
                    ].map(([key, label]) => (
                      <div key={key} className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-1.5 text-center">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
                        <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {dbCounts?.[key] ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {seedResult && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Seed "{seedResult.step}" concluído em {seedResult.elapsedMs}ms
                    </span>
                  </div>
                  <details className="text-[10px]">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Ver log do seed ({seedResult.logTail.length} linhas)
                    </summary>
                    <pre className="mt-2 p-2 bg-background rounded text-[9px] overflow-x-auto max-h-48 overflow-y-auto">
{seedResult.logTail.join('\n')}
                    </pre>
                  </details>
                </div>
              )}

              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2 text-[10px] text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                <strong>Atenção:</strong> "Tudo" remove usuários antigos de teste (not in seed list) e recria dados demo.
                Em produção, faça backup do banco antes. O seed é idempotente mas pode resetar saldo de cashback demo.
              </div>
            </CardContent>
          </Card>

          {/* Search + category filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por chave, valor ou descrição..."
                    value={systemSettingSearch}
                    onChange={(e) => setSystemSettingSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={systemSettingCategoryFilter}
                  onChange={(e) => setSystemSettingCategoryFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
                >
                  {SYSTEM_SETTING_CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Grouped list */}
          {systemSettingsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando configurações...</span>
              </CardContent>
            </Card>
          ) : groupedSystemSettings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Nenhuma configuração encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {systemSettings.length === 0
                    ? 'Nenhuma configuração cadastrada ainda. Clique em "Nova Configuração" para criar a primeira.'
                    : 'Nenhuma configuração corresponde aos filtros aplicados.'}
                </p>
                {systemSettings.length === 0 && (
                  <Button
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={openCreateSystemSetting}
                  >
                    <Plus className="h-4 w-4" /> Criar Configuração
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedSystemSettings.map(([cat, items]) => (
                <Card key={cat}>
                  <CardHeader className="pb-2 px-4 pt-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400">
                        {SYSTEM_SETTING_CATEGORY_LABEL[cat] || cat}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{items.length} configuraç{items.length === 1 ? 'ão' : 'ões'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-muted/50">
                          <tr className="text-left">
                            <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Chave</th>
                            <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Valor</th>
                            <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Atualizado em</th>
                            <th className="p-3 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((s) => {
                            const numeric = isNumericSetting(s.key)
                            return (
                              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                                <td className="p-3 align-top">
                                  <code className="text-xs font-mono text-emerald-700 dark:text-emerald-400 break-all">
                                    {s.key}
                                  </code>
                                  {s.description && (
                                    <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 max-w-xs">
                                      {s.description}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 align-top max-w-md">
                                  {numeric ? (
                                    <Badge variant="secondary" className="font-mono text-xs">
                                      {s.value}
                                    </Badge>
                                  ) : (
                                    <span className="text-foreground line-clamp-2">{s.value}</span>
                                  )}
                                </td>
                                <td className="p-3 hidden md:table-cell text-xs text-muted-foreground align-top">
                                  {new Date(s.updatedAt).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="p-3 align-top">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => openEditSystemSetting(s)}
                                      title="Editar"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      onClick={() => deleteSystemSetting(s)}
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create / Edit Dialog */}
          <Dialog open={systemSettingDialogOpen} onOpenChange={setSystemSettingDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-emerald-600" />
                  {editingSystemSetting ? 'Editar Configuração' : 'Nova Configuração'}
                </DialogTitle>
                <DialogDescription>
                  {editingSystemSetting
                    ? 'Edite o valor, a descrição ou a categoria desta configuração. A chave não pode ser alterada.'
                    : 'Crie uma nova configuração editável. A chave é o identificador único (ex: matrix.entrada.base_cents, cashback.entrada_pct).'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Key */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Chave (key) *</Label>
                  <Input
                    placeholder="ex: matrix.entrada.base_cents"
                    value={systemSettingForm.key}
                    onChange={(e) => setSystemSettingForm((f) => ({ ...f, key: e.target.value }))}
                    disabled={!!editingSystemSetting}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Letras minúsculas, números, ponto e underline. Ex: <code>matrix.residual.pct_level_3</code>.
                  </p>
                </div>

                {/* Value */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Valor *</Label>
                  {editingSystemSetting && isNumericSetting(editingSystemSetting.key) ? (
                    <Input
                      type="number"
                      step="any"
                      placeholder="Valor numérico"
                      value={systemSettingForm.value}
                      onChange={(e) => setSystemSettingForm((f) => ({ ...f, value: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <Textarea
                      placeholder="Valor da configuração"
                      value={systemSettingForm.value}
                      onChange={(e) => setSystemSettingForm((f) => ({ ...f, value: e.target.value }))}
                      rows={3}
                      className="text-sm"
                    />
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Para valores em centavos use inteiros (R$ 999,90 = 99990). Para porcentagens use o número direto (35% = 35).
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: % de comissão no nível 3 da Matriz Residual"
                    value={systemSettingForm.description}
                    onChange={(e) => setSystemSettingForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Categoria *</Label>
                  <Select
                    value={systemSettingForm.category}
                    onValueChange={(v) => setSystemSettingForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SYSTEM_SETTING_CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSystemSettingDialogOpen(false)}
                  disabled={systemSettingSaving}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={saveSystemSetting}
                  disabled={systemSettingSaving}
                >
                  {systemSettingSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingSystemSetting ? 'Salvar Alterações' : 'Criar Configuração'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Tarefa (22/09): Dialog de confirmação de saque no Financeiro — fora do Tabs para funcionar em todas as sub-abas */}
      <Dialog open={financialApproveDialog.open} onOpenChange={(open) => !open && setFinancialApproveDialog(d => ({ ...d, open: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmar Aprovação de Saque
            </DialogTitle>
            <DialogDescription>
              {financialApproveDialog.isBatch ? (
                <>
                  Você deseja realmente aprovar <strong>{financialApproveDialog.batchIds.length} saque(s)</strong> no valor total de{' '}
                  <strong className="text-emerald-600">R$ {(financialApproveDialog.withdrawalAmount / 100).toFixed(2)}</strong>?
                </>
              ) : (
                <>
                  Você deseja realmente aprovar o saque de{' '}
                  <strong className="text-emerald-600">R$ {(financialApproveDialog.withdrawalAmount / 100).toFixed(2)}</strong>
                  {' '}de <strong>{financialApproveDialog.userName}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
            Esta ação não pode ser desfeita. O valor será liberado para o usuário.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinancialApproveDialog(d => ({ ...d, open: false }))}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={financialApproveDialog.isBatch ? confirmFinancialBatchApprove : confirmFinancialApprove}
            >
              <Check className="h-4 w-4" />
              Sim, aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== BENEFIT EDIT DIALOG (22/09) ===== */}
      <Dialog open={benefitEditDialog.open} onOpenChange={(open) => !open && setBenefitEditDialog(d => ({ ...d, open: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-emerald-600" />
              Editar Benefício
            </DialogTitle>
            <DialogDescription>
              Edite o nome, valor e descrição do benefício <strong>{benefitEditDialog.benefitType}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do benefício</Label>
              <Input
                value={benefitEditDialog.benefitName}
                onChange={(e) => setBenefitEditDialog(d => ({ ...d, benefitName: e.target.value }))}
                placeholder="Ex: Auxílio Combustível"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor em centavos (R$)</Label>
              <Input
                type="number"
                value={benefitEditDialog.benefitAmount}
                onChange={(e) => setBenefitEditDialog(d => ({ ...d, benefitAmount: Number(e.target.value) || 0 }))}
                placeholder="0"
                className="h-9 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">{formatCurrency(benefitEditDialog.benefitAmount)}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={benefitEditDialog.benefitDescription}
                onChange={(e) => setBenefitEditDialog(d => ({ ...d, benefitDescription: e.target.value }))}
                placeholder="Ex: R$ 2.600/mês (R$100/dia × 26 dias)"
                className="text-sm"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitEditDialog(d => ({ ...d, open: false }))}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={async () => {
                if (!user?.id) return
                try {
                  await apiFetch('/admin/gratifications-config/benefit', {
                    method: 'PUT',
                    body: JSON.stringify({
                      userId: user.id,
                      benefitType: benefitEditDialog.benefitType,
                      name: benefitEditDialog.benefitName,
                      amount: benefitEditDialog.benefitAmount,
                      description: benefitEditDialog.benefitDescription,
                    }),
                  })
                  toast.success('Benefício atualizado com sucesso!')
                  setBenefitEditDialog(d => ({ ...d, open: false }))
                  loadDriverGoalsTarget()
                } catch {
                  toast.error('Erro ao atualizar benefício')
                }
              }}
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SERVICE TYPE DIALOG (Item 8) ===== */}
      <Dialog open={serviceTypeDialogOpen} onOpenChange={setServiceTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" />
              {editingServiceType ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}
            </DialogTitle>
            <DialogDescription>
              {editingServiceType
                ? 'Atualize o nome, ícone ou status deste tipo.'
                : 'Crie uma nova categoria que aparecerá no dropdown do módulo de Serviços.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input
                value={serviceTypeForm.name}
                onChange={(e) => setServiceTypeForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Bem-estar, Pet, Beleza..."
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Ícone (emoji)</Label>
              <Input
                value={serviceTypeForm.icon}
                onChange={(e) => setServiceTypeForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="Ex: 🐾, 💅, 🎓"
                className="h-9 text-sm"
                maxLength={4}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Use um emoji curto (opcional).</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input
                  type="number"
                  value={serviceTypeForm.sortOrder}
                  onChange={(e) => setServiceTypeForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceTypeForm.isActive}
                    onChange={(e) => setServiceTypeForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-input"
                  />
                  <Label className="text-xs cursor-pointer">Ativo</Label>
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setServiceTypeDialogOpen(false)}
              disabled={serviceTypeSaving}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSaveServiceType}
              disabled={serviceTypeSaving}
            >
              {serviceTypeSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : editingServiceType ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== GAME CONFIG DIALOG ===== */}
      <Dialog open={gameConfigDialogOpen} onOpenChange={setGameConfigDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-emerald-600" />
              {editingGameConfig ? 'Editar Configuração de Jogo' : 'Nova Configuração de Jogo'}
            </DialogTitle>
            <DialogDescription>Defina as métricas de pontuação e limites do jogo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código do Jogo *</Label>
                <Input value={gameConfigForm.gameCode} disabled={!!editingGameConfig} onChange={(e) => setGameConfigForm(f => ({ ...f, gameCode: e.target.value }))} placeholder="ex: tictactoe" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={gameConfigForm.name} onChange={(e) => setGameConfigForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Jogo da Velha" className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={gameConfigForm.description} onChange={(e) => setGameConfigForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do jogo" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pontos por Vitória</Label>
                <Input type="number" value={gameConfigForm.pointsPerWin} onChange={(e) => setGameConfigForm(f => ({ ...f, pointsPerWin: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Pontos por Partida</Label>
                <Input type="number" value={gameConfigForm.pointsPerPlay} onChange={(e) => setGameConfigForm(f => ({ ...f, pointsPerPlay: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Cashback por Vitória (pts)</Label>
                <Input type="number" value={gameConfigForm.cashbackPerWin} onChange={(e) => setGameConfigForm(f => ({ ...f, cashbackPerWin: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Aposta Mínima (R$)</Label>
                <Input type="number" step="0.01" value={gameConfigForm.minBetCents / 100} onChange={(e) => setGameConfigForm(f => ({ ...f, minBetCents: Math.round((Number(e.target.value) || 0) * 100) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Máx. Jogadas/Dia</Label>
                <Input type="number" value={gameConfigForm.maxPlaysPerDay} onChange={(e) => setGameConfigForm(f => ({ ...f, maxPlaysPerDay: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="gc-active" checked={gameConfigForm.isActive} onChange={(e) => setGameConfigForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="gc-active" className="text-xs cursor-pointer">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGameConfigDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveGameConfig} disabled={gameConfigSaving}>
              {gameConfigSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ACHIEVEMENT DIALOG ===== */}
      <Dialog open={achievementDialogOpen} onOpenChange={setAchievementDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-600" />
              {editingAchievement ? 'Editar Conquista' : 'Nova Conquista'}
            </DialogTitle>
            <DialogDescription>Cadastre uma conquista que os usuários podem desbloquear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* ADM-5 — Variables help section (always visible, above the
                code field per spec). Lists every canonical variable the
                progressForCode() function in /api/achievements/route.ts
                recognizes, with a short PT-BR description of what triggers
                each one. The admin can pick any of these from the
                "Variável" dropdown below — or type a custom code by
                selecting "Outro (customizado)". */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Info className="h-3 w-3" />
                Variáveis disponíveis para o código da conquista
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                O sistema detecta automaticamente a estatística a partir do código. Use uma das
                variáveis abaixo (recomendado) ou digite um código customizado.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-snug">
                {ACHIEVEMENT_VARIABLES.map((v) => (
                  <li key={v.code} className="flex flex-col">
                    <span className="flex items-center gap-1">
                      <code className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">{v.code}</code>
                      <span className="font-medium text-foreground">{v.label}</span>
                    </span>
                    <span className="text-muted-foreground pl-0.5">{v.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Variável *</Label>
                {/* ADM-5 — Dropdown of canonical variables. When the admin
                    picks one, we pre-fill code/name/description/category/
                    targetValue with the variable's suggested values so they
                    can review and tweak. Selecting "Outro (customizado)"
                    reveals the raw code Input below so the admin can type a
                    legacy code (e.g. "ten_referrals", "cashback_1000"). */}
                <Select
                  value={
                    achievementForm.code &&
                    ACHIEVEMENT_VARIABLES.some((v) => v.code === achievementForm.code)
                      ? achievementForm.code
                      : '__custom'
                  }
                  onValueChange={(v) => {
                    if (v === '__custom') {
                      // Switch to custom mode — clear the code so the admin
                      // can type, but keep name/description/etc as-is so
                      // they don't lose what they already typed.
                      setAchievementForm((f) => ({ ...f, code: '' }))
                      return
                    }
                    const picked = ACHIEVEMENT_VARIABLES.find((x) => x.code === v)
                    if (!picked) return
                    // Pre-fill suggested fields ONLY when they're empty or
                    // when we're creating a new achievement (editingAchievement
                    // === null). For an existing achievement we only update
                    // the code (admin already customized name/description).
                    setAchievementForm((f) => ({
                      ...f,
                      code: picked.code,
                      name: editingAchievement ? f.name : (f.name || picked.suggestedName),
                      description: editingAchievement ? f.description : (f.description || picked.description),
                      category: editingAchievement ? f.category : picked.suggestedCategory,
                      targetValue: editingAchievement ? f.targetValue : (f.targetValue && f.targetValue !== 1 ? f.targetValue : picked.suggestedTarget),
                    }))
                  }}
                  disabled={!!editingAchievement}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione uma variável" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACHIEVEMENT_VARIABLES.map((v) => (
                      <SelectItem key={v.code} value={v.code}>
                        <span className="font-mono text-[10px] mr-1.5">{v.code}</span>
                        <span className="text-xs">{v.label}</span>
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom">
                      <span className="text-xs text-muted-foreground italic">Outro (código customizado)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Código *</Label>
                {/* ADM-5 — Code field. Disabled when editing an existing
                    achievement (the code is the unique key — changing it
                    would break the user-achievement linkage). When creating
                    a new achievement and a canonical variable is selected,
                    the field is read-only (filled by the dropdown). When
                    "Outro (customizado)" is selected, the field is editable
                    so the admin can type a legacy/advanced code. */}
                <Input
                  value={achievementForm.code}
                  disabled={
                    !!editingAchievement ||
                    (!!achievementForm.code &&
                      ACHIEVEMENT_VARIABLES.some((v) => v.code === achievementForm.code))
                  }
                  onChange={(e) => setAchievementForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="ex: first_referral ou digite um código customizado"
                  className="h-9 text-sm font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {editingAchievement
                    ? 'O código não pode ser alterado após a criação (é a chave única).'
                    : 'Escolha uma variável no dropdown acima ou digite um código customizado.'}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={achievementForm.name} onChange={(e) => setAchievementForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Primeira Indicação" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={achievementForm.description} onChange={(e) => setAchievementForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da conquista" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Ícone (emoji)</Label>
                <Input value={achievementForm.icon} onChange={(e) => setAchievementForm(f => ({ ...f, icon: e.target.value }))} placeholder="🎯" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <select value={achievementForm.category} onChange={(e) => setAchievementForm(f => ({ ...f, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="general">Geral</option>
                  <option value="referral">Indicação</option>
                  <option value="financial">Financeiro</option>
                  <option value="plan">Plano</option>
                  <option value="gaming">Jogos</option>
                  <option value="engagement">Engajamento</option>
                  <option value="career">Carreira</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={achievementForm.sortOrder} onChange={(e) => setAchievementForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Pontos</Label>
                <Input type="number" value={achievementForm.pointsReward} onChange={(e) => setAchievementForm(f => ({ ...f, pointsReward: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Meta (valor)</Label>
                <Input type="number" value={achievementForm.targetValue} onChange={(e) => setAchievementForm(f => ({ ...f, targetValue: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="ach-active" checked={achievementForm.isActive} onChange={(e) => setAchievementForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="ach-active" className="text-xs cursor-pointer">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAchievementDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveAchievement} disabled={achievementSaving}>
              {achievementSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CAREER PLAN DIALOG ===== */}
      <Dialog open={careerPlanDialogOpen} onOpenChange={setCareerPlanDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-600" />
              {editingCareerPlan ? 'Editar Nível de Carreira' : 'Novo Nível de Carreira'}
            </DialogTitle>
            <DialogDescription>Configure um nível (rank) do plano de carreira.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código *</Label>
                <Input value={careerPlanForm.code} disabled={!!editingCareerPlan} onChange={(e) => setCareerPlanForm(f => ({ ...f, code: e.target.value }))} placeholder="ex: bronze" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={careerPlanForm.name} onChange={(e) => setCareerPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Bronze" className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={careerPlanForm.description} onChange={(e) => setCareerPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do nível" className="h-9 text-sm" />
            </div>
            {/* BACK-9 — separate reward fields. Replaces the old combined
                "Tipo de Recompensa + Bônus Mensal/Quantidade de Pontos"
                single field with 4 distinct inputs. */}
            <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-3">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Recompensas (separadas)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pontos Mínimos</Label>
                  <Input type="number" value={careerPlanForm.minPoints} onChange={(e) => setCareerPlanForm(f => ({ ...f, minPoints: Number(e.target.value) }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">9.1 Carteira Saque (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(careerPlanForm.rewardWithdrawalCents || 0) / 100}
                    onChange={(e) => setCareerPlanForm(f => ({ ...f, rewardWithdrawalCents: Math.round((Number(e.target.value) || 0) * 100) }))}
                    placeholder="0,00"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">9.2 Carteira Compras (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(careerPlanForm.rewardShoppingCents || 0) / 100}
                    onChange={(e) => setCareerPlanForm(f => ({ ...f, rewardShoppingCents: Math.round((Number(e.target.value) || 0) * 100) }))}
                    placeholder="0,00"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">9.3 Recompensa Pontos</Label>
                  <Input
                    type="number"
                    step="1"
                    value={careerPlanForm.rewardPoints || 0}
                    onChange={(e) => setCareerPlanForm(f => ({ ...f, rewardPoints: Math.round(Number(e.target.value) || 0) }))}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">9.4 Gratificação (texto do bônus)</Label>
                <textarea
                  value={careerPlanForm.gratification || ''}
                  onChange={(e) => setCareerPlanForm(f => ({ ...f, gratification: e.target.value }))}
                  placeholder="Ex.: Bônus de Safira ao atingir 100 pontos"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ícone (emoji)</Label>
                <Input value={careerPlanForm.icon} onChange={(e) => setCareerPlanForm(f => ({ ...f, icon: e.target.value }))} placeholder="🥉" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Cor (hex)</Label>
                <div className="flex gap-2">
                  <Input type="color" value={careerPlanForm.color || '#6b7280'} onChange={(e) => setCareerPlanForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 p-1" />
                  <Input value={careerPlanForm.color || ''} onChange={(e) => setCareerPlanForm(f => ({ ...f, color: e.target.value }))} placeholder="#cd7f32" className="h-9 text-sm flex-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={careerPlanForm.sortOrder} onChange={(e) => setCareerPlanForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="cp-active" checked={careerPlanForm.isActive} onChange={(e) => setCareerPlanForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="cp-active" className="text-xs cursor-pointer">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCareerPlanDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveCareerPlan} disabled={careerPlanSaving}>
              {careerPlanSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DRIVER CATEGORY DIALOG ===== */}
      <Dialog open={driverCategoryDialogOpen} onOpenChange={setDriverCategoryDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              {editingDriverCategory ? 'Editar Categoria de Motorista' : 'Nova Categoria de Motorista'}
            </DialogTitle>
            <DialogDescription>
              Categoria de veículo (Safira → Imperial). Bônus só é pago se o motorista bater a meta mensal de corridas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código *</Label>
                <Input
                  value={driverCategoryFormData.code}
                  disabled={!!editingDriverCategory}
                  onChange={(e) => setDriverCategoryFormData(f => ({ ...f, code: e.target.value }))}
                  placeholder="ex: safira"
                  className="h-9 text-sm"
                />
                {editingDriverCategory && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Código não pode ser alterado.</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={driverCategoryFormData.name}
                  onChange={(e) => setDriverCategoryFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex: Safira"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={driverCategoryFormData.description}
                onChange={(e) => setDriverCategoryFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição da categoria (ex: veículo básico, aceita idoso)"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-3">
              <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                Meta &amp; Bônus &amp; Cancelamento
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ordem</Label>
                  <Input
                    type="number"
                    value={driverCategoryFormData.sortOrder}
                    onChange={(e) => setDriverCategoryFormData(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Meta mensal de corridas</Label>
                  <Input
                    type="number"
                    value={driverCategoryFormData.monthlyTripsTarget}
                    onChange={(e) => setDriverCategoryFormData(f => ({ ...f, monthlyTripsTarget: Number(e.target.value) }))}
                    placeholder="ex: 500"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bônus mensal (centavos)</Label>
                  <Input
                    type="number"
                    value={driverCategoryFormData.bonusCents}
                    onChange={(e) => setDriverCategoryFormData(f => ({ ...f, bonusCents: Number(e.target.value) }))}
                    placeholder="ex: 50000 = R$ 500,00"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {driverCategoryFormData.bonusCents > 0
                      ? `Preview: ${formatCurrency(driverCategoryFormData.bonusCents)}`
                      : 'Sem bônus'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Limite de cancelamentos/mês</Label>
                  <Input
                    type="number"
                    min={0}
                    value={driverCategoryFormData.maxCancellationPerMonth}
                    onChange={(e) => setDriverCategoryFormData(f => ({ ...f, maxCancellationPerMonth: Number(e.target.value) }))}
                    placeholder="ex: 2"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    0 = tolerância zero (idoso) · 2 = padrão
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ícone (emoji)</Label>
                <Input
                  value={driverCategoryFormData.icon}
                  onChange={(e) => setDriverCategoryFormData(f => ({ ...f, icon: e.target.value }))}
                  placeholder="🔷"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Cor (hex)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={driverCategoryFormData.color || '#06b6d4'}
                    onChange={(e) => setDriverCategoryFormData(f => ({ ...f, color: e.target.value }))}
                    className="h-9 w-12 p-1"
                  />
                  <Input
                    value={driverCategoryFormData.color || ''}
                    onChange={(e) => setDriverCategoryFormData(f => ({ ...f, color: e.target.value }))}
                    placeholder="#06b6d4"
                    className="h-9 text-sm flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-5 col-span-2">
                <input
                  type="checkbox"
                  id="dc-active"
                  checked={driverCategoryFormData.isActive}
                  onChange={(e) => setDriverCategoryFormData(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="dc-active" className="text-xs cursor-pointer">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriverCategoryDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={handleSaveDriverCategory}
              disabled={savingDriverCategory || !driverCategoryFormData.code || !driverCategoryFormData.name}
            >
              {savingDriverCategory ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {editingDriverCategory ? 'Salvar' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== STREAK REWARD DIALOG ===== */}
      <Dialog open={streakRewardDialogOpen} onOpenChange={setStreakRewardDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-emerald-600" />
              {editingStreakReward ? 'Editar Recompensa de Sequência' : 'Nova Recompensa de Sequência'}
            </DialogTitle>
            <DialogDescription>Defina a recompensa para um streak de dias consecutivos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Dias Consecutivos *</Label>
                <Input type="number" value={streakRewardForm.streakDays} onChange={(e) => setStreakRewardForm(f => ({ ...f, streakDays: Number(e.target.value) }))} placeholder="ex: 7" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Tipo de Recompensa</Label>
                <select value={streakRewardForm.rewardType} onChange={(e) => setStreakRewardForm(f => ({ ...f, rewardType: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="points">Pontos</option>
                  <option value="cashback">Cashback (cents)</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">{streakRewardForm.rewardType === 'points' ? 'Quantidade de Pontos' : 'Valor em Reais (R$)'}</Label>
              <Input
                type="number"
                step={streakRewardForm.rewardType === 'cashback' ? '0.01' : '1'}
                value={streakRewardForm.rewardType === 'cashback' ? streakRewardForm.rewardAmount / 100 : streakRewardForm.rewardAmount}
                onChange={(e) => setStreakRewardForm(f => ({
                  ...f,
                  rewardAmount: f.rewardType === 'cashback'
                    ? Math.round((Number(e.target.value) || 0) * 100)
                    : Number(e.target.value) || 0,
                }))}
                className="h-9 text-sm"
              />
              {/* ADM-6 — preview label so the admin knows exactly how the
                  amount will be rendered in the backoffice cards and on the
                  user-facing gamification page. Cashback amounts are stored
                  as cents and rendered as R$; points are raw integers. */}
              <p className="text-[10px] text-muted-foreground mt-1">
                Será exibido no backoffice como:{' '}
                <span className="font-semibold text-foreground">
                  {streakRewardForm.rewardType === 'cashback'
                    ? `[${formatCurrency(streakRewardForm.rewardAmount)}]`
                    : `[${streakRewardForm.rewardAmount} pts]`}
                </span>
              </p>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={streakRewardForm.description} onChange={(e) => setStreakRewardForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da recompensa" className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="sr-active" checked={streakRewardForm.isActive} onChange={(e) => setStreakRewardForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
              <Label htmlFor="sr-active" className="text-xs cursor-pointer">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStreakRewardDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveStreakReward} disabled={streakRewardSaving}>
              {streakRewardSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EVENT DIALOG ===== */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </DialogTitle>
            <DialogDescription>Crie ou edite um evento da plataforma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Título *</Label>
                <Input value={eventForm.title} onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do evento" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <select value={eventForm.type} onChange={(e) => setEventForm(f => ({ ...f, type: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="webinar">Webinar</option>
                  <option value="promo">Promoção</option>
                  <option value="launch">Lançamento</option>
                  <option value="meetup">Encontro Presencial</option>
                  <option value="maintenance">Manutenção</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select value={eventForm.status} onChange={(e) => setEventForm(f => ({ ...f, status: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="upcoming">Próximo</option>
                  <option value="ongoing">Em Andamento</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Descrição *</Label>
                <Input value={eventForm.description} onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do evento" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Data de Início *</Label>
                <Input type="datetime-local" value={eventForm.eventDate} onChange={(e) => setEventForm(f => ({ ...f, eventDate: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Data de Fim</Label>
                <Input type="datetime-local" value={eventForm.endDate} onChange={(e) => setEventForm(f => ({ ...f, endDate: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Local</Label>
                <Input value={eventForm.location} onChange={(e) => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Local (presencial)" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">URL da Reunião</Label>
                <Input value={eventForm.meetingUrl} onChange={(e) => setEventForm(f => ({ ...f, meetingUrl: e.target.value }))} placeholder="https://meet..." className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Máx. Participantes</Label>
                <Input type="number" value={eventForm.maxAttendees} onChange={(e) => setEventForm(f => ({ ...f, maxAttendees: Number(e.target.value) }))} placeholder="0 = ilimitado" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">URL da Imagem</Label>
                <Input value={eventForm.imageUrl} onChange={(e) => setEventForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="h-9 text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-5 sm:col-span-2">
                <input type="checkbox" id="evt-active" checked={eventForm.isActive} onChange={(e) => setEventForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="evt-active" className="text-xs cursor-pointer">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveEvent} disabled={eventSaving}>
              {eventSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== FAQ DIALOG ===== */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-600" />
              {editingFaq ? 'Editar Pergunta Frequente' : 'Nova Pergunta Frequente'}
            </DialogTitle>
            <DialogDescription>Cadastre uma pergunta e resposta para o FAQ da plataforma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Pergunta *</Label>
              <Input value={faqForm.question} onChange={(e) => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder="Ex: Como funciona o cashback?" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Resposta *</Label>
              <textarea
                value={faqForm.answer}
                onChange={(e) => setFaqForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="Resposta detalhada..."
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <select value={faqForm.category} onChange={(e) => setFaqForm(f => ({ ...f, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="geral">Geral</option>
                  <option value="cashback">CashBack</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="indicacoes">Indicações</option>
                  <option value="carreira">Carreira</option>
                  <option value="gratificacoes">Gratificações</option>
                  <option value="eventos">Eventos</option>
                  <option value="jogos">Jogos</option>
                  <option value="suporte">Suporte</option>
                  <option value="planos">Planos</option>
                  <option value="seguranca">Segurança</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={faqForm.sortOrder} onChange={(e) => setFaqForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="faq-active" checked={faqForm.isActive} onChange={(e) => setFaqForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
              <Label htmlFor="faq-active" className="text-xs cursor-pointer">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaqDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveFaq} disabled={faqSaving}>
              {faqSaving ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ===== VIEW USER DIALOG ===== */}
      <Dialog open={viewUserDialogOpen} onOpenChange={setViewUserDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              Visualizar Usuário
            </DialogTitle>
            <DialogDescription>Detalhes completos do usuário</DialogDescription>
          </DialogHeader>
          {loadingViewUser ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-6 w-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : viewingUser ? (
            <div className="space-y-5">
              {/* Personal Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Dados Pessoais</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Nome</span><p className="font-medium text-foreground">{viewingUser.name}</p></div>
                  <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium text-foreground">{viewingUser.email}</p></div>
                  <div><span className="text-muted-foreground text-xs">Telefone</span><p className="font-medium text-foreground">{viewingUser.phone || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">CPF</span><p className="font-medium text-foreground">{viewingUser.cpf || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Cidade/Estado</span><p className="font-medium text-foreground">{viewingUser.city || '—'}{viewingUser.state ? ` - ${viewingUser.state}` : ''}</p></div>
                  <div><span className="text-muted-foreground text-xs">País</span><p className="font-medium text-foreground">{viewingUser.country || '—'}</p></div>
                </div>
              </div>

              <Separator />

              {/* Plan & Status */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Plano & Status</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Plano</span><p><Badge className={getPlanBadge(viewingUser.plan)}>{getPlanName(viewingUser.plan)}</Badge></p></div>
                  <div><span className="text-muted-foreground text-xs">Status</span><p><Badge className={viewingUser.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>{viewingUser.isActive ? 'Ativo' : 'Inativo'}</Badge></p></div>
                  <div><span className="text-muted-foreground text-xs">Role</span><p><Badge variant="outline">{viewingUser.role === 'admin' ? 'Admin' : 'Usuário'}</Badge></p></div>
                  <div className="flex gap-2">
                    {viewingUser.isDriver && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1"><Car className="h-3 w-3" />Motorista</Badge>}
                    {viewingUser.isDelivery && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1"><Bike className="h-3 w-3" />Entregador</Badge>}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Balances */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Saldos</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Saque', value: viewingUser.balanceWithdrawal },
                    { label: 'Mobilidade', value: viewingUser.balanceMobility },
                    { label: 'Compras', value: viewingUser.balanceShopping },
                    { label: 'Refeição', value: viewingUser.balanceFood },
                    { label: 'Farmácia', value: viewingUser.balancePharmacy },
                    { label: 'Gratificação', value: viewingUser.balanceGratification },
                  ].map(b => (
                    <div key={b.label} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">{b.label}</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(b.value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Career */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Carreira</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Pontos Carreira</p>
                    <p className="text-sm font-bold text-foreground">{viewingUser.careerPoints}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Pontos Pessoais</p>
                    <p className="text-sm font-bold text-foreground">{viewingUser.personalPoints}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Estrelas</p>
                    <p className="text-sm font-bold text-foreground">{'★'.repeat(Math.max(0, Math.min(viewingUser.stars || 0, 5)))}{'☆'.repeat(Math.max(0, 5 - Math.min(viewingUser.stars || 0, 5)))}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bank Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Dados Bancários</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Banco</span><p className="font-medium text-foreground">{viewingUser.bankCode || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Agência</span><p className="font-medium text-foreground">{viewingUser.bankAgency || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Conta</span><p className="font-medium text-foreground">{viewingUser.bankAccount || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tipo</span><p className="font-medium text-foreground">{viewingUser.bankType === 'cc' ? 'Conta Corrente' : viewingUser.bankType === 'cp' ? 'Conta Poupança' : viewingUser.bankType || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Chave PIX</span><p className="font-medium text-foreground">{viewingUser.pixKey || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">PIX Ativo</span><p><Badge className={viewingUser.pixEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}>{viewingUser.pixEnabled ? 'Sim' : 'Não'}</Badge></p></div>
                </div>
              </div>

              <Separator />

              {/* Referral Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Indicações</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Código de Indicação</span><p className="font-bold text-emerald-600 font-mono">{viewingUser.referralCode}</p></div>
                  <div><span className="text-muted-foreground text-xs">Total de Indicados</span><p className="font-bold text-foreground">{viewingUser._count?.referrals ?? 0}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">Indicado por</span><p className="font-medium text-foreground">{(viewingUser as ViewUserData).referrer ? `${(viewingUser as ViewUserData).referrer!.name} (${(viewingUser as ViewUserData).referrer!.email})` : 'Nenhum'}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">Data de Cadastro</span><p className="font-medium text-foreground">{new Date(viewingUser.createdAt).toLocaleString('pt-BR')}</p></div>
                </div>
              </div>

              {/* Admin quick actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
                  onClick={() => handleViewUserMatrix(viewingUser as unknown as AdminUser)}
                >
                  <Network className="h-3.5 w-3.5" />
                  Ver Matriz
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                  onClick={() => handleOpenReleaseBalance(viewingUser)}
                >
                  <Coins className="h-3.5 w-3.5" />
                  Liberar Saldo
                </Button>
              </div>

              <Separator />

              {/* Beneficiaries */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" /> Beneficiários
                </h4>
                {viewUserBeneficiaries.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs bg-muted/30 rounded-lg">
                    <Heart className="h-6 w-6 mx-auto mb-1 opacity-30" />
                    Nenhum beneficiário cadastrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Total percentage bar */}
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Total alocado</span>
                        <span className="font-bold text-foreground">
                          {viewUserBeneficiaries.reduce((sum: number, b: any) => sum + (b.percentage || 0), 0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, viewUserBeneficiaries.reduce((sum: number, b: any) => sum + (b.percentage || 0), 0))}%` }}
                        />
                      </div>
                    </div>
                    {/* List of beneficiaries */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {viewUserBeneficiaries.map((b: any) => {
                        const relMap: Record<string, string> = {
                          spouse: 'Cônjuge', child: 'Filho(a)', parent: 'Pais',
                          sibling: 'Irmão(ã)', other: 'Outro',
                        }
                        return (
                          <div key={b.id} className="p-3 bg-muted/40 rounded-lg border border-border/50">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-medium text-foreground text-sm">{b.name}</p>
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                                {b.percentage}%
                              </Badge>
                            </div>
                            <div className="space-y-0.5 text-[11px] text-muted-foreground">
                              {b.cpf && <p>CPF: <span className="font-mono">{b.cpf}</span></p>}
                              <p>Relação: <span className="text-foreground">{relMap[b.relationship] || b.relationship}</span></p>
                              {b.age !== null && b.age !== undefined && <p>Idade: <span className="text-foreground">{b.age} anos</span></p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ===== ADM-4 — CREATE USER DIALOG ===== */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              Criar Usuário
            </DialogTitle>
            <DialogDescription>
              Crie um novo usuário com login e senha. O usuário poderá acessar a plataforma imediatamente.
            </DialogDescription>
          </DialogHeader>

          {/* Info box — explains the login flow */}
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              O usuário criado poderá fazer login na plataforma usando o <strong>email</strong> e a{' '}
              <strong>senha</strong> definidos aqui. Para acessar o painel admin, defina o Role como{' '}
              <strong>&apos;admin&apos;</strong> ou <strong>&apos;support&apos;</strong> e configure as permissões
              na aba <strong>Permissões</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo *</Label>
              <Input
                value={newUserForm.name}
                onChange={(e) => setNewUserForm((d) => ({ ...d, name: e.target.value }))}
                placeholder="João da Silva"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm((d) => ({ ...d, email: e.target.value }))}
                  placeholder="joao@exemplo.com"
                />
                <p className="text-[10px] text-muted-foreground">Será usado para login.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha *</Label>
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm((d) => ({ ...d, password: e.target.value }))}
                    placeholder="mínimo 6 caracteres"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm((d) => ({ ...d, phone: e.target.value }))}
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPF</Label>
                <Input
                  value={newUserForm.cpf}
                  onChange={(e) => setNewUserForm((d) => ({ ...d, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  Role
                </Label>
                <Select
                  value={newUserForm.role}
                  onValueChange={(v) => setNewUserForm((d) => ({ ...d, role: v }))}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleSelectOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Plano</Label>
                <Select
                  value={newUserForm.plan}
                  onValueChange={(v) => setNewUserForm((d) => ({ ...d, plan: v }))}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.length > 0 ? (
                      plans.filter(p => p.isActive).map(p => (
                        <SelectItem key={p.id} value={p.code || p.id}>
                          {p.name} {p.price ? `— R$ ${(p.price / 100).toFixed(2)}` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="free">Gratuito</SelectItem>
                        <SelectItem value="blue3">Blue 3</SelectItem>
                        <SelectItem value="blue5">Blue 5</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Lista carregada da tabela Plan (aba "Planos &amp; Preços").
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Código de indicante</Label>
                <Input
                  value={newUserForm.referredByCode}
                  onChange={(e) => setNewUserForm((d) => ({ ...d, referredByCode: e.target.value }))}
                  placeholder="opcional"
                />
              </div>
            </div>

            {/* ADM-USERTYPE — Qualification (from dynamic UserType table) + matrix levels.
                When the admin picks a qualification, the default levels from that
                UserType are auto-filled (but can be overridden below). */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/10 p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Tipo de Usuário & Níveis de Cashback (Matriz)
                </span>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 p-2 text-[10px] text-blue-800 dark:text-blue-200 leading-relaxed">
                <strong>Como funciona:</strong> Ao selecionar um tipo, o sistema preenche automaticamente
                quantos <strong>níveis de cashback</strong> esse usuário vai receber nas 3 matrizes do MMN.
                Você pode ajustar manualmente abaixo. Ex.: Motorista ganha 3 níveis de Entrada, 0 Residual, 0 Vendas.
                Lojista ganha 3 Entrada + 5 Vendas (porque participa de vendas). <strong>Blue 5</strong> desbloqueia
                até 5 Entrada + 7 Residual + 9 Vendas (máximo).
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Usuário</Label>
                <select
                  value={newUserForm.qualification}
                  onChange={(e) => handleQualificationChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Selecione o tipo —</option>
                  {availableUserTypes.map((t) => (
                    <option key={t.id} value={t.code}>
                      {t.icon || '👤'} {t.label} ({t.code}) — Entrada:{t.defaultEntradaLevel} / Residual:{t.defaultResidualLevel} / Vendas:{t.defaultVendasLevel}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Lista carregada da tabela UserType. Edite os tipos e níveis padrão em "Tipos de Usuário" no menu lateral.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Níveis Entrada (até 5)</Label>
                  <Input
                    type="number" min={0} max={5}
                    value={newUserForm.entradaLevel}
                    onChange={(e) => setNewUserForm((d) => ({ ...d, entradaLevel: Number(e.target.value) }))}
                    className="h-9 text-sm"
                  />
                  <p className="text-[9px] text-muted-foreground">Compras no app</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Níveis Residual (até 7)</Label>
                  <Input
                    type="number" min={0} max={7}
                    value={newUserForm.residualLevel}
                    onChange={(e) => setNewUserForm((d) => ({ ...d, residualLevel: Number(e.target.value) }))}
                    className="h-9 text-sm"
                  />
                  <p className="text-[9px] text-muted-foreground">Pgto mensal do plano</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Níveis Vendas (até 9)</Label>
                  <Input
                    type="number" min={0} max={9}
                    value={newUserForm.vendasLevel}
                    onChange={(e) => setNewUserForm((d) => ({ ...d, vendasLevel: Number(e.target.value) }))}
                    className="h-9 text-sm"
                  />
                  <p className="text-[9px] text-muted-foreground">Vendas (comida/entrega/mob)</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)} disabled={creatingNewUser}>Cancelar</Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateUser} disabled={creatingNewUser}>
              {creatingNewUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT USER DIALOG ===== */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-emerald-600" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize os dados do usuário. As alterações serão salvas imediatamente.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-5">
              {/* Personal Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Dados Pessoais</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input value={editUserData.name} onChange={(e) => updateEditField('name', e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input value={editUserData.email} onChange={(e) => updateEditField('email', e.target.value)} placeholder="email@exemplo.com" type="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefone</Label>
                    <Input value={editUserData.phone} onChange={(e) => updateEditField('phone', e.target.value)} placeholder="(11) 99999-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CPF</Label>
                    <Input value={editUserData.cpf} onChange={(e) => updateEditField('cpf', e.target.value)} placeholder="000.000.000-00" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Plan & Status */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Plano & Status</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plano</Label>
                    <Select value={editUserData.plan} onValueChange={(v) => updateEditField('plan', v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {plans.length > 0 ? (
                          plans.map(p => (
                            <SelectItem key={p.id} value={p.code || p.id}>
                              {p.name} {p.price ? `— R$ ${(p.price / 100).toFixed(2)}` : ''}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="free">Gratuito</SelectItem>
                            <SelectItem value="blue3">Blue 3</SelectItem>
                            <SelectItem value="blue5">Blue 5</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={String(editUserData.isActive)} onValueChange={(v) => updateEditField('isActive', v === 'true')}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Ativo</SelectItem>
                        <SelectItem value="false">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Role</Label>
                    <Select value={editUserData.role} onValueChange={(v) => updateEditField('role', v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleSelectOptions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Tarefa (21/09): removidos os checkboxes de Motorista e Entregador.
                    Esses flags (isDriver/isDelivery) agora são controlados AUTOMATICAMENTE
                    pelo campo "Tipo de Usuário" — quando o admin seleciona "Motorista" no
                    dropdown acima, o backend deriva isDriver=true automaticamente. O usuário
                    final não pode trocar seu próprio tipo — só o admin pode. */}
                {/* Qualificação (UserType code) — dinâmico, carregado da tabela
                    UserType. Antes o admin só conseguia definir o tipo na criação;
                    agora pode mudar depois também (backend PUT já aceitava). */}
                <div className="space-y-1.5 mt-3">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-emerald-600" />
                    Tipo de Usuário
                  </Label>
                  <select
                    value={editUserData.qualification}
                    onChange={(e) => updateEditField('qualification', e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— Nenhuma —</option>
                    {availableUserTypes.map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.icon || '👤'} {t.label} ({t.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Carrega dinamicamente da tabela UserType. Gerencie em "Tipos de Usuário" no menu lateral. Mudar a qualificação não altera os níveis de matriz já definidos — edite-os manualmente abaixo se necessário.
                  </p>
                </div>
              </div>

              <Separator />

              {/* All Balances */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Saldos (centavos)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ['balanceWithdrawal', 'Saque'],
                    ['balanceMobility', 'Mobilidade'],
                    ['balanceShopping', 'Compras'],
                    ['balanceFood', 'Refeição'],
                    ['balancePharmacy', 'Farmácia'],
                    ['balanceGratification', 'Gratificação'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={editUserData[key]}
                        onChange={(e) => updateEditField(key, parseInt(e.target.value) || 0)}
                        type="number"
                        placeholder="0"
                      />
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(editUserData[key])}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Career Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Carreira</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pontos Carreira</Label>
                    <Input value={editUserData.careerPoints} onChange={(e) => updateEditField('careerPoints', parseInt(e.target.value) || 0)} type="number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pontos Pessoais</Label>
                    <Input value={editUserData.personalPoints} onChange={(e) => updateEditField('personalPoints', parseInt(e.target.value) || 0)} type="number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estrelas</Label>
                    <Input value={editUserData.stars} onChange={(e) => updateEditField('stars', parseInt(e.target.value) || 0)} type="number" min={0} max={5} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Location */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Localização</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cidade</Label>
                    <Input value={editUserData.city} onChange={(e) => updateEditField('city', e.target.value)} placeholder="São Paulo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado</Label>
                    <Input value={editUserData.state} onChange={(e) => updateEditField('state', e.target.value)} placeholder="SP" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">País</Label>
                    <Input value={editUserData.country} onChange={(e) => updateEditField('country', e.target.value)} placeholder="BR" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bank Details */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Dados Bancários</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Código Banco</Label>
                    <Input value={editUserData.bankCode} onChange={(e) => updateEditField('bankCode', e.target.value)} placeholder="001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Agência</Label>
                    <Input value={editUserData.bankAgency} onChange={(e) => updateEditField('bankAgency', e.target.value)} placeholder="1234" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Conta</Label>
                    <Input value={editUserData.bankAccount} onChange={(e) => updateEditField('bankAccount', e.target.value)} placeholder="56789-0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de Conta</Label>
                    <Select value={editUserData.bankType || 'none'} onValueChange={(v) => updateEditField('bankType', v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não definido</SelectItem>
                        <SelectItem value="cc">Conta Corrente</SelectItem>
                        <SelectItem value="cp">Conta Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chave PIX</Label>
                    <Input value={editUserData.pixKey} onChange={(e) => updateEditField('pixKey', e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-1.5 flex items-end">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={editUserData.pixEnabled} onChange={(e) => updateEditField('pixEnabled', e.target.checked)} className="rounded border-input" />
                      PIX Ativo
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditUserDialogOpen(false)} disabled={savingUser}>
                  Cancelar
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveUser} disabled={savingUser}>
                  {savingUser ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== ADD CASHBACK DIALOG ===== */}
      <Dialog open={addCashbackDialogOpen} onOpenChange={setAddCashbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              Adicionar Cashback Manual
            </DialogTitle>
            <DialogDescription>Adicione uma entrada de cashback para um usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ID do Usuário</Label>
              <Input
                value={cashbackFormData.targetUserId}
                onChange={(e) => setCashbackFormData(d => ({ ...d, targetUserId: e.target.value }))}
                placeholder="usr_xxxx..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={cashbackFormData.cashbackType} onValueChange={(v) => setCashbackFormData(d => ({ ...d, cashbackType: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="residual">Residual</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Valor (centavos)</Label>
                <Input
                  value={cashbackFormData.amount}
                  onChange={(e) => setCashbackFormData(d => ({ ...d, amount: parseInt(e.target.value) || 0 }))}
                  type="number"
                  placeholder="50000"
                />
                <p className="text-[10px] text-muted-foreground">{cashbackFormData.amount > 0 ? formatCurrency(cashbackFormData.amount) : ''}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nível</Label>
                <Input
                  value={cashbackFormData.level}
                  onChange={(e) => setCashbackFormData(d => ({ ...d, level: parseInt(e.target.value) || 1 }))}
                  type="number"
                  min={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Percentual (%)</Label>
                <Input
                  value={cashbackFormData.percentage}
                  onChange={(e) => setCashbackFormData(d => ({ ...d, percentage: parseFloat(e.target.value) || 0 }))}
                  type="number"
                  step="0.1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição</Label>
              <Input
                value={cashbackFormData.description}
                onChange={(e) => setCashbackFormData(d => ({ ...d, description: e.target.value }))}
                placeholder="Cashback manual..."
              />
            </div>
            {cashbackFormData.cashbackType === 'vendas' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoria</Label>
                <Select value={cashbackFormData.category || 'mobility'} onValueChange={(v) => setCashbackFormData(d => ({ ...d, category: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobility">Mobilidade</SelectItem>
                    <SelectItem value="food">Refeição</SelectItem>
                    <SelectItem value="pharmacy">Farmácia</SelectItem>
                    <SelectItem value="pet">Pet</SelectItem>
                    <SelectItem value="shopping">Compras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddCashbackDialogOpen(false)} disabled={savingCashback}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleAddCashback} disabled={savingCashback || !cashbackFormData.targetUserId || cashbackFormData.amount <= 0}>
                {savingCashback ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== PLAN CREATE/EDIT DIALOG ===== */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Atualize os dados do plano.' : 'Preencha os dados do novo plano.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome do Plano *</Label>
              <Input value={planFormData.name} onChange={(e) => setPlanFormData(d => ({ ...d, name: e.target.value }))} placeholder="Ex: Blue 7" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Preço (centavos)</Label>
                <Input value={planFormData.price} onChange={(e) => setPlanFormData(d => ({ ...d, price: parseInt(e.target.value) || 0 }))} type="number" placeholder="9700" />
                <p className="text-[10px] text-muted-foreground">{planFormData.price > 0 ? formatCurrency(planFormData.price) : 'Grátis'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Ordem</Label>
                <Input value={planFormData.sortOrder} onChange={(e) => setPlanFormData(d => ({ ...d, sortOrder: parseInt(e.target.value) || 0 }))} type="number" placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Descrição</Label>
              <Input value={planFormData.description} onChange={(e) => setPlanFormData(d => ({ ...d, description: e.target.value }))} placeholder="Descrição curta do plano" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Features (separadas por vírgula)</Label>
              <textarea
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={planFormData.features}
                onChange={(e) => setPlanFormData(d => ({ ...d, features: e.target.value }))}
                placeholder="CashBack Entrada, App Mobilidade, Telemedicina"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Matriz de Entrada
              </Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={planFormData.matrixEntradaId}
                onChange={(e) => setPlanFormData(d => ({ ...d, matrixEntradaId: e.target.value }))}
              >
                <option value="">— Sem matriz —</option>
                {matrixTypes.filter(m => m.matrixKind === 'entrada' || m.matrixKind === 'mixed').map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.width}x{m.depth})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Matriz Residual
              </Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={planFormData.matrixResidualId}
                onChange={(e) => setPlanFormData(d => ({ ...d, matrixResidualId: e.target.value }))}
              >
                <option value="">— Sem matriz —</option>
                {matrixTypes.filter(m => m.matrixKind === 'residual' || m.matrixKind === 'mixed').map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.width}x{m.depth})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Matriz de Vendas
              </Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={planFormData.matrixVendasId}
                onChange={(e) => setPlanFormData(d => ({ ...d, matrixVendasId: e.target.value }))}
              >
                <option value="">— Sem matriz —</option>
                {matrixTypes.filter(m => m.matrixKind === 'vendas' || m.matrixKind === 'mixed').map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.width}x{m.depth})</option>
                ))}
              </select>
            </div>

            {/* Tarefa (22/09): Níveis liberados por matriz para este plano */}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Níveis de Cashback Liberados por Matriz
              </p>
              <p className="text-[10px] text-muted-foreground">
                Escolha até qual nível cada matriz o plano libera. Ex: Blue 3 libera 3 níveis de Entrada (4x3), Blue 5 libera 5 níveis (4x5).
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Níveis Entrada (0-5)</Label>
                  <Input
                    type="number" min={0} max={5} step={1}
                    value={planFormData.entradaLevels}
                    onChange={(e) => setPlanFormData(d => ({ ...d, entradaLevels: Number(e.target.value) || 0 }))}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Níveis Residual (0-7)</Label>
                  <Input
                    type="number" min={0} max={7} step={1}
                    value={planFormData.residualLevels}
                    onChange={(e) => setPlanFormData(d => ({ ...d, residualLevels: Number(e.target.value) || 0 }))}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Níveis Vendas (0-9)</Label>
                  <Input
                    type="number" min={0} max={9} step={1}
                    value={planFormData.vendasLevels}
                    onChange={(e) => setPlanFormData(d => ({ ...d, vendasLevels: Number(e.target.value) || 0 }))}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={planFormData.isActive} onChange={(e) => setPlanFormData(d => ({ ...d, isActive: e.target.checked }))} className="rounded" />
              Plano ativo (visível para usuários)
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)} disabled={savingPlan}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSavePlan} disabled={savingPlan || !planFormData.name}>
                {savingPlan ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                {editingPlan ? 'Salvar' : 'Criar Plano'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT ANNOUNCEMENT DIALOG ===== */}
      <Dialog open={editAnnouncementDialogOpen} onOpenChange={setEditAnnouncementDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-emerald-600" />
              Editar Anúncio
            </DialogTitle>
            <DialogDescription>Atualize os dados do anúncio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Título</Label>
              <Input value={editAnnouncementData.title} onChange={(e) => setEditAnnouncementData(d => ({ ...d, title: e.target.value }))} placeholder="Título do anúncio" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Mensagem</Label>
              <Input value={editAnnouncementData.message} onChange={(e) => setEditAnnouncementData(d => ({ ...d, message: e.target.value }))} placeholder="Mensagem do anúncio" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={editAnnouncementData.type} onValueChange={(v) => setEditAnnouncementData(d => ({ ...d, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Prioridade</Label>
                <Select value={editAnnouncementData.priority} onValueChange={(v) => setEditAnnouncementData(d => ({ ...d, priority: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Botão de ação</Label>
                <Input value={editAnnouncementData.actionLabel} onChange={(e) => setEditAnnouncementData(d => ({ ...d, actionLabel: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">URL do botão</Label>
                <Input value={editAnnouncementData.actionUrl} onChange={(e) => setEditAnnouncementData(d => ({ ...d, actionUrl: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAnnouncementDialogOpen(false)} disabled={savingAnnouncement}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveAnnouncement} disabled={savingAnnouncement || !editAnnouncementData.title || !editAnnouncementData.message}>
                {savingAnnouncement ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE VOUCHER DIALOG ===== */}
      <Dialog open={voucherCreateOpen} onOpenChange={setVoucherCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-emerald-600" />
              Criar Voucher
            </DialogTitle>
            <DialogDescription>Preencha os dados do novo voucher. O código será gerado automaticamente se não informado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={voucherForm.type} onValueChange={(v) => setVoucherForm(d => ({ ...d, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobility">Mobilidade</SelectItem>
                    <SelectItem value="food">Refeição</SelectItem>
                    <SelectItem value="pharmacy">Farmácia</SelectItem>
                    <SelectItem value="shopping">Compras</SelectItem>
                    <SelectItem value="gratification">Gratificação</SelectItem>
                    <SelectItem value="withdrawal">Saque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Valor (R$)</Label>
                <Input
                  value={voucherForm.amountBrl}
                  onChange={(e) => setVoucherForm(d => ({ ...d, amountBrl: e.target.value }))}
                  placeholder="50,00"
                  inputMode="decimal"
                />
                <p className="text-[10px] text-muted-foreground">
                  {voucherForm.amountBrl && !isNaN(parseFloat(voucherForm.amountBrl.replace(',', '.')))
                    ? formatCurrency(Math.round(parseFloat(voucherForm.amountBrl.replace(',', '.')) * 100))
                    : 'Informe o valor em reais'}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ID do Usuário (opcional)</Label>
              <Input
                value={voucherForm.targetUserId}
                onChange={(e) => setVoucherForm(d => ({ ...d, targetUserId: e.target.value }))}
                placeholder="Deixe vazio para voucher genérico"
              />
              <p className="text-[10px] text-muted-foreground">Se informado, o voucher ficará vinculado a este usuário.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Código (opcional)</Label>
                <Input
                  value={voucherForm.code}
                  onChange={(e) => setVoucherForm(d => ({ ...d, code: e.target.value }))}
                  placeholder="Auto-gerado"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Validade (opcional)</Label>
                <Input
                  type="date"
                  value={voucherForm.expiresAt}
                  onChange={(e) => setVoucherForm(d => ({ ...d, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição (opcional)</Label>
              <Input
                value={voucherForm.description}
                onChange={(e) => setVoucherForm(d => ({ ...d, description: e.target.value }))}
                placeholder="Descrição do voucher..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoucherCreateOpen(false)} disabled={voucherSaving}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleCreateVoucher} disabled={voucherSaving || !voucherForm.amountBrl}>
                {voucherSaving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Voucher
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== SETTLE BET DIALOG ===== */}
      <Dialog open={betSettleOpen} onOpenChange={setBetSettleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-600" />
              Finalizar Aposta
            </DialogTitle>
            <DialogDescription>
              {betSettleTarget ? `Evento: ${betSettleTarget.eventLabel} • Aposta: ${formatCurrency(betSettleTarget.amountInCents)} • Potencial: ${formatCurrency(betSettleTarget.potentialWinInCents)}` : 'Selecione o resultado da aposta.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione o resultado. Se <strong>Ganha</strong>, o valor potencial será creditado na carteira de saque do usuário. Se <strong>Perdida</strong>, a aposta será apenas marcada como perdida.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-16 flex flex-col gap-1 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                onClick={() => handleSettleBet('won')}
                disabled={betSettling}
              >
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-semibold">Ganha</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 flex flex-col gap-1 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400"
                onClick={() => handleSettleBet('lost')}
                disabled={betSettling}
              >
                <X className="h-5 w-5" />
                <span className="text-sm font-semibold">Perdida</span>
              </Button>
            </div>
            {betSettling && (
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
                <span className="h-3 w-3 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                Processando...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== CANCEL BET DIALOG ===== */}
      <Dialog open={betCancelOpen} onOpenChange={setBetCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              Cancelar Aposta
            </DialogTitle>
            <DialogDescription>
              {betCancelTarget ? `Estornar ${formatCurrency(betCancelTarget.amountInCents)} para a carteira de saque de ${betCancelTarget.userName || betCancelTarget.userId.slice(-8)}.` : 'Confirma o cancelamento da aposta?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  Esta ação é irreversível. O valor apostado será devolvido à carteira de saque do usuário e a aposta marcada como cancelada.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Motivo (opcional)</Label>
              <Input
                value={betCancelReason}
                onChange={(e) => setBetCancelReason(e.target.value)}
                placeholder="Ex: erro de sistema, solicitação do usuário..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBetCancelOpen(false)} disabled={betCancelling}>Voltar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleCancelBet} disabled={betCancelling}>
                {betCancelling ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Ban className="h-4 w-4" />}
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== RELEASE BALANCE DIALOG ===== */}
      <Dialog open={releaseBalanceOpen} onOpenChange={setReleaseBalanceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-600" />
              Liberar Saldo
            </DialogTitle>
            <DialogDescription>
              {releaseBalanceTarget ? `Creditar saldo manualmente para ${releaseBalanceTarget.name}.` : 'Crédito manual de saldo para o usuário.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Carteira de Destino</Label>
              <Select value={releaseBalanceForm.wallet} onValueChange={(v) => setReleaseBalanceForm(d => ({ ...d, wallet: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanceWithdrawal">Saque</SelectItem>
                  <SelectItem value="balanceMobility">Mobilidade</SelectItem>
                  <SelectItem value="balanceShopping">Compras</SelectItem>
                  <SelectItem value="balanceFood">Refeição</SelectItem>
                  <SelectItem value="balancePharmacy">Farmácia</SelectItem>
                  <SelectItem value="balanceGratification">Gratificação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valor (R$)</Label>
              <Input
                value={releaseBalanceForm.amountBrl}
                onChange={(e) => setReleaseBalanceForm(d => ({ ...d, amountBrl: e.target.value }))}
                placeholder="100,00"
                inputMode="decimal"
              />
              <p className="text-[10px] text-muted-foreground">
                {releaseBalanceForm.amountBrl && !isNaN(parseFloat(releaseBalanceForm.amountBrl.replace(',', '.')))
                  ? `Será creditado: ${formatCurrency(Math.round(parseFloat(releaseBalanceForm.amountBrl.replace(',', '.')) * 100))}`
                  : 'Informe o valor em reais'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição (obrigatória)</Label>
              <Input
                value={releaseBalanceForm.description}
                onChange={(e) => setReleaseBalanceForm(d => ({ ...d, description: e.target.value }))}
                placeholder="Ex: Bônus de boas-vindas, ajuste manual..."
              />
              <p className="text-[10px] text-muted-foreground">O prefixo "[Admin Liberação]" será adicionado automaticamente.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReleaseBalanceOpen(false)} disabled={releaseBalanceSaving}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleReleaseBalance} disabled={releaseBalanceSaving || !releaseBalanceForm.amountBrl || !releaseBalanceForm.description.trim()}>
                {releaseBalanceSaving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Coins className="h-4 w-4" />}
                Liberar Saldo
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE GRATIFICATION DIALOG =====
          Task 2-c / Admin Item 2 — the form now collects every field required
          by the spec: name, type/category, reward value, qualification
          requirement, and an admin-only description. Submitting calls
          handleCreateGratification, which POSTs to /api/admin/gratifications/assign. */}
      <Dialog open={gratificationCreateOpen} onOpenChange={setGratificationCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-emerald-600" />
              Criar Gratificação
            </DialogTitle>
            <DialogDescription>Atribua uma gratificação manualmente a um usuário específico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* User search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Buscar Usuário</Label>
              <div className="flex gap-2">
                <Input
                  value={gratificationUserSearch}
                  onChange={(e) => setGratificationUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchUsersForGratification() }}
                  placeholder="Digite nome, email ou código (busca automática)..."
                />
                <Button type="button" variant="outline" size="sm" onClick={() => searchUsersForGratification()} disabled={gratificationUserLoading}>
                  {gratificationUserLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {gratificationForm.targetUserId && (
                <p className="text-[10px] text-emerald-600 font-medium">
                  ✓ Usuário selecionado: {gratificationForm.targetUserId.slice(-8)}
                </p>
              )}
              {gratificationUserLoading && (
                <div className="flex items-center justify-center gap-2 py-3 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Buscando usuários...</span>
                </div>
              )}
              {!gratificationUserLoading && gratificationUserSearched && gratificationUserResults.length === 0 && !gratificationForm.targetUserId && (
                <div className="text-center py-3 text-[10px] text-muted-foreground border border-dashed border-border rounded-lg">
                  Nenhum usuário encontrado
                </div>
              )}
              {!gratificationUserLoading && gratificationUserResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
                  {gratificationUserResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setGratificationForm(d => ({ ...d, targetUserId: u.id }))
                        setGratificationUserSearch(`${u.name} (${u.email})`)
                        setGratificationUserResults([])
                      }}
                      className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge className={getPlanBadge(u.plan)}>{getPlanName(u.plan)}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Name — required, human-readable label shown on the user's Metas list */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome <span className="text-rose-500">*</span></Label>
              <Input
                value={gratificationForm.name}
                onChange={(e) => setGratificationForm(d => ({ ...d, name: e.target.value }))}
                placeholder="Ex: Bônus de liderança, Auxílio combustível..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={gratificationForm.type} onValueChange={(v) => setGratificationForm(d => ({ ...d, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leadership">Liderança</SelectItem>
                    <SelectItem value="retirement_fund">Fundo Aposentadoria</SelectItem>
                    <SelectItem value="telemedicine">Telemedicina</SelectItem>
                    <SelectItem value="tow_truck">Guincho</SelectItem>
                    <SelectItem value="fuel_aid">Auxílio Combustível</SelectItem>
                    <SelectItem value="car_wash">Vale Ducha</SelectItem>
                    <SelectItem value="vacation_6mo">Férias 6 Meses</SelectItem>
                    <SelectItem value="vacation_12mo">Férias 12 Meses</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoria</Label>
                <Select value={gratificationForm.category} onValueChange={(v) => setGratificationForm(d => ({ ...d, category: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratification">Gratificação</SelectItem>
                    <SelectItem value="withdrawal">Saque</SelectItem>
                    <SelectItem value="mobility">Mobilidade</SelectItem>
                    <SelectItem value="food">Refeição</SelectItem>
                    <SelectItem value="pharmacy">Farmácia</SelectItem>
                    <SelectItem value="shopping">Compras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valor (R$)</Label>
              <Input
                value={gratificationForm.amountBrl}
                onChange={(e) => setGratificationForm(d => ({ ...d, amountBrl: e.target.value }))}
                placeholder="100,00"
                inputMode="decimal"
              />
              <p className="text-[10px] text-muted-foreground">
                {gratificationForm.amountBrl && !isNaN(parseFloat(gratificationForm.amountBrl.replace(',', '.')))
                  ? formatCurrency(Math.round(parseFloat(gratificationForm.amountBrl.replace(',', '.')) * 100))
                  : 'Valor em reais'}
              </p>
            </div>
            {/* Qualification requirement — PT-BR human-readable text describing
                what the user must do to claim this gratification. Mirrors the
                "qualification" column on the Gratification model. */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Qualificação necessária</Label>
              <Input
                value={gratificationForm.qualification}
                onChange={(e) => setGratificationForm(d => ({ ...d, qualification: e.target.value }))}
                placeholder="Ex: Ao fechar o 5º nível · 6 meses de cadastro ativo..."
              />
              <p className="text-[10px] text-muted-foreground">
                Condição que o usuário deve cumprir para reivindicar esta gratificação.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descrição</Label>
              <Input
                value={gratificationForm.description}
                onChange={(e) => setGratificationForm(d => ({ ...d, description: e.target.value }))}
                placeholder="Descrição da gratificação..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGratificationCreateOpen(false)} disabled={gratificationSaving}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleCreateGratification} disabled={gratificationSaving || !gratificationForm.targetUserId || !gratificationForm.name.trim() || !gratificationForm.amountBrl}>
                {gratificationSaving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Gift className="h-4 w-4" />}
                Criar Gratificação
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Item 13 — VINCULAR PATROCINADOR DIALOG =====
          Lets the admin assign a sponsor (referredById) to a user created
          without one. The dialog accepts an email OR referral code, runs a
          live check via /api/referrals/validate + /api/admin/users?search=,
          and PUTs the result to /api/admin/users/[id] (which resolves the
          sponsor server-side and validates against cycles). */}
      <Dialog open={linkSponsorDialogOpen} onOpenChange={setLinkSponsorDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-4 w-4 text-amber-600" />
              Vincular Patrocinador
            </DialogTitle>
            <DialogDescription>
              Atribua um patrocinador a este usuário. Informe o email ou código de indicação.
            </DialogDescription>
          </DialogHeader>

          {linkSponsorTarget && (
            <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
              <p className="text-muted-foreground">Usuário selecionado:</p>
              <p className="font-medium text-foreground">{linkSponsorTarget.name}</p>
              <p className="text-muted-foreground">{linkSponsorTarget.email}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="link-sponsor-query" className="text-xs">
              Email ou código de indicação do patrocinador *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="link-sponsor-query"
                placeholder="ex: cliente@newmobility.com ou CLIENTE001"
                value={linkSponsorQuery}
                onChange={(e) => {
                  setLinkSponsorQuery(e.target.value)
                  setLinkSponsorResolved(null)
                }}
                onBlur={(e) => checkSponsorQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    checkSponsorQuery(linkSponsorQuery)
                  }
                }}
                className="pl-9"
              />
              {linkSponsorChecking && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
              )}
              {!linkSponsorChecking && linkSponsorResolved && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
              )}
            </div>
            {linkSponsorQuery && !linkSponsorChecking && linkSponsorResolved && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Patrocinador: <span className="font-medium">{linkSponsorResolved.name}</span>
              </p>
            )}
            {linkSponsorQuery && !linkSponsorChecking && !linkSponsorResolved && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Patrocinador não encontrado. Verifique o email ou código informado.
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              O sistema valida se o patrocinador existe e se a vinculação não cria um ciclo na rede.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkSponsorDialogOpen(false)} disabled={linkSponsorSaving}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              onClick={handleLinkSponsor}
              disabled={linkSponsorSaving || !linkSponsorQuery.trim() || !linkSponsorResolved}
            >
              {linkSponsorSaving ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Network className="h-4 w-4" />
              )}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
