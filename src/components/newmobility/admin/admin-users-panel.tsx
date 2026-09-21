'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Search,
  Eye,
  Edit,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Save,
  RefreshCw,
  Download,
  UserPlus,
  Info,
  KeyRound,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  QUALIFICATION_OPTIONS,
  qualificationLabel,
} from '@/lib/qualifications'

// ----- User types -----
// Synchronized with QUALIFICATION_OPTIONS from @/lib/qualifications so the
// "Tipo de Usuário" dropdown shows the same 10 categories as the
// "Qualificação" dropdown. Also kept as a const for the badge color map.
import { QUALIFICATION_OPTIONS as QUAL_TYPES } from '@/lib/qualifications'

export const USER_TYPES = [
  { value: 'usuario', label: 'Usuário', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'motorista', label: 'Motorista', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'entregador', label: 'Entregador', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  { value: 'cliente', label: 'Cliente', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'lojista', label: 'Lojista', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'mototaxista', label: 'Mototaxista', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  { value: 'motofretista', label: 'Motofretista', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'motorista_app', label: 'Motorista de App', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  { value: 'taxista', label: 'Taxista', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'caminhoneiro', label: 'Caminhoneiro', color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300' },
  { value: 'parceiro', label: 'Parceiro', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'empresa', label: 'Empresa', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  { value: 'afiliado', label: 'Afiliado', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
  { value: 'administrador', label: 'Administrador', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { value: 'gratuito', label: 'Gratuito', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'inativo', label: 'Inativo', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
] as const

// Also export a merged list that includes qualification options for the
// "Tipo de Usuário" dropdown — ensures all types from QUALIFICATION_OPTIONS
// appear even if USER_TYPES doesn't have them.
export const ALL_USER_TYPE_OPTIONS = [
  ...USER_TYPES,
  ...QUAL_TYPES.filter(q => !USER_TYPES.some(u => u.value === q.value)).map(q => ({
    value: q.value,
    label: q.label,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  })),
]

const PLAN_OPTIONS = [
  { value: 'free', label: 'Gratuito' },
  { value: 'blue3', label: 'Blue 3' },
  { value: 'blue5', label: 'Blue 5 Premium' },
]

// ADM-4 — Role options for the Edit User dialog and the Create User dialog.
// Mirrors the role concept used by the admin permissions panel:
//   - 'user'    => regular user, no admin panel access
//   - 'admin'   => full admin (wildcard '*')
//   - 'support' => default staff role (users + support + announcements)
// Custom roles created in admin-permissions-panel.tsx are appended at runtime
// (see roleOptions state in AdminUsersPanel).
const ROLE_OPTIONS_BASE = [
  { value: 'user', label: 'Usuário comum' },
  { value: 'admin', label: 'Administrador' },
  { value: 'support', label: 'Suporte' },
] as const

function roleLabel(value?: string | null): string {
  if (!value) return '—'
  const base = ROLE_OPTIONS_BASE.find((r) => r.value === value)
  if (base) return base.label
  // Custom role — capitalize the raw value.
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function roleBadgeClass(value?: string | null): string {
  switch (value) {
    case 'admin':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    case 'support':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
    case 'user':
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

// BACK-4 — qualification options. Task 2-e (Item 4) expanded the dropdown
// from 6 legacy options (motorista / passageiro / passageiro_60 /
// passageiro_pcd / comercio / entregador) to 10 business-relevant codes per
// the client spec. The constant is now imported from `@/lib/qualifications`
// so the admin form, the backoffice personal-data card, and the
// self-registration dropdown all share the same source of truth. Used in
// the "Editar Usuário" dialog so admins can set or correct a user's
// qualification after registration.
const QUALIFICATION_DROPDOWN_OPTIONS = QUALIFICATION_OPTIONS

function userTypeBadge(type?: string) {
  const t = USER_TYPES.find((x) => x.value === (type || 'usuario'))
  return t || USER_TYPES[2]
}

// BACK-4 — human-readable label for a qualification value (or '—' when unset).
// Delegates to the shared `qualificationLabel()` helper so legacy codes
// (passageiro / passageiro_60 / passageiro_pcd / comercio) also resolve
// correctly for users registered before Task 2-e expanded the dropdown.
function getQualificationLabel(value?: string | null): string {
  return qualificationLabel(value)
}

function planBadge(plan?: string) {
  switch (plan) {
    case 'blue5':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'blue3':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

function kycBadge(status?: string) {
  switch (status) {
    case 'approved':
      return { label: 'Aprovado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
    case 'pending':
      return { label: 'Pendente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
    case 'rejected':
      return { label: 'Rejeitado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
    default:
      return { label: 'Não enviado', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
  }
}

// ----- Types -----

interface AdminUser {
  id: string
  name: string
  email: string
  phone?: string | null
  cpf?: string | null
  plan: string
  isActive: boolean
  userType?: string
  // BACK-4 — qualification is one of: motorista | passageiro | passageiro_60 |
  // passageiro_pcd | comercio | entregador. Mirrors the registration dropdown.
  qualification?: string | null
  kycStatus?: string
  role?: string
  referralCode?: string
  isDriver?: boolean
  isDelivery?: boolean
  entradaLevel?: number
  residualLevel?: number
  vendasLevel?: number
  balanceWithdrawal: number
  balanceMobility: number
  balanceShopping: number
  balanceFood: number
  balancePharmacy: number
  balanceGratification: number
  balancePaymentInvoice: number
  balanceFree?: number
  balancePending?: number
  careerPoints?: number
  personalPoints?: number
  stars?: number
  city?: string | null
  state?: string | null
  country?: string | null
  createdAt?: string
  _count?: { referrals: number }
}

interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface EditFormData {
  name: string
  email: string
  phone: string
  cpf: string
  userType: string
  // BACK-4 — qualification field per the registration dropdown (6 options).
  qualification: string
  // ADM-4 — auth role (admin/support/user or any custom role). Drives
  // access to the admin panel via the permissions matrix.
  role: string
  plan: string
  isActive: boolean
  isDriver: boolean
  isDelivery: boolean
  entradaLevel: number
  residualLevel: number
  vendasLevel: number
  balanceWithdrawal: number
  balanceMobility: number
  balanceShopping: number
  balanceFood: number
  balancePharmacy: number
  balanceGratification: number
  balancePaymentInvoice: number
  careerPoints: number
  personalPoints: number
  stars: number
}

// ADM-4 — form data for the Create User dialog.
interface CreateFormData {
  name: string
  email: string
  password: string
  phone: string
  cpf: string
  userType: string
  role: string
  plan: string
  referredByCode: string
}

const EMPTY_CREATE: CreateFormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  cpf: '',
  userType: 'usuario',
  role: 'user',
  plan: 'free',
  referredByCode: '',
}

const EMPTY_EDIT: EditFormData = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  userType: 'usuario',
  qualification: '',
  role: 'user',
  plan: 'free',
  isActive: true,
  isDriver: false,
  isDelivery: false,
  entradaLevel: 0,
  residualLevel: 0,
  vendasLevel: 0,
  balanceWithdrawal: 0,
  balanceMobility: 0,
  balanceShopping: 0,
  balanceFood: 0,
  balancePharmacy: 0,
  balanceGratification: 0,
  balancePaymentInvoice: 0,
  careerPoints: 0,
  personalPoints: 0,
  stars: 0,
}

export function AdminUsersPanel() {
  const { user, login, setImpersonating: setStoreImpersonating } = useStore()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [data, setData] = useState<AdminUsersResponse | null>(null)

  const [search, setSearch] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 20

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<EditFormData>(EMPTY_EDIT)

  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<AdminUser | null>(null)

  // ADM-4 — Create User dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormData>(EMPTY_CREATE)
  const [creating, setCreating] = useState(false)

  // ADM-4 — Item 4 (Permissões login/password). After creating a user OR
  // resetting a password, the admin needs to see the resulting credentials
  // (email + plaintext password) so they can share them with the user
  // out-of-band (the password is never recoverable from the DB because we
  // store only a sha256 hash). This dialog shows them and offers a
  // copy-to-clipboard button.
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [credentialsData, setCredentialsData] = useState<{
    name: string
    email: string
    password: string
    title: string
    blurb: string
  } | null>(null)

  // ADM-4 — Reset Password dialog state. Opens when the admin clicks the
  // "Redefinir Senha" action on a user row. The admin can either type a
  // new password or click "Gerar senha" to auto-fill a random one.
  const [resetOpen, setResetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  // ADM-4 — custom roles loaded from /admin/permissions so the Role select
  // can offer roles the admin created in the Permissões tab (e.g. financeiro,
  // marketing). Falls back to ROLE_OPTIONS_BASE only if the request fails.
  const [customRoles, setCustomRoles] = useState<string[]>([])
  const roleOptions = useMemo(() => {
    const extras = customRoles
      .filter((r) => !ROLE_OPTIONS_BASE.some((b) => b.value === r))
      .map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))
    return [...ROLE_OPTIONS_BASE, ...extras]
  }, [customRoles])

  // PRIORIDADE 4 — Dynamic user types and plans loaded from the DB
  const [dbUserTypes, setDbUserTypes] = useState<Array<{ value: string; label: string }>>([])
  const [dbPlans, setDbPlans] = useState<Array<{ value: string; label: string }>>([])

  const allUserTypes = useMemo(() => {
    const merged = [...ALL_USER_TYPE_OPTIONS]
    for (const t of dbUserTypes) {
      if (!merged.some(m => m.value === t.value)) {
        merged.push({ value: t.value, label: t.label, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' })
      }
    }
    return merged
  }, [dbUserTypes])

  const allPlans = useMemo(() => {
    const merged = [...PLAN_OPTIONS]
    for (const p of dbPlans) {
      if (!merged.some(m => m.value === p.value)) {
        merged.push(p)
      }
    }
    return merged
  }, [dbPlans])

  useEffect(() => {
    apiFetch<{ types?: Array<{ code: string; label: string }> }>(`/admin/user-types?userId=${user?.id || ''}`)
      .then(data => {
        if (data?.types) setDbUserTypes(data.types.map(t => ({ value: t.code, label: t.label })))
      }).catch(() => {})
    apiFetch<{ plans?: Array<{ code: string; name: string }> }>(`/plans`)
      .then(data => {
        if (data?.plans) setDbPlans(data.plans.map(p => ({ value: p.code, label: p.name })))
      }).catch(() => {})
  }, [user?.id])

  const loadUsers = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        userId: user.id,
        page: String(page),
        limit: String(limit),
      })
      if (search) params.set('search', search)
      if (userTypeFilter !== 'all') params.set('userType', userTypeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await apiFetch<AdminUsersResponse>(`/admin/users?${params}`)
      setData(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [user?.id, page, search, userTypeFilter, statusFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // ADM-4 — load custom roles once so the Role Select in both the Create
  // and Edit dialogs can list them. Errors are swallowed silently because
  // the dialog still works with just ROLE_OPTIONS_BASE.
  useEffect(() => {
    if (!user?.id) return
    apiFetch<{ permissions: Record<string, string[]> }>(`/admin/permissions?userId=${user.id}`)
      .then((res) => {
        if (res?.permissions) {
          setCustomRoles(Object.keys(res.permissions))
        }
      })
      .catch(() => {
        /* no-op — fall back to base roles */
      })
  }, [user?.id])

  const stats = useMemo(() => {
    if (!data?.users) return { total: 0, active: 0, inactive: 0, drivers: 0 }
    const users = data.users
    return {
      total: data.total,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
      drivers: users.filter((u) => u.isDriver || u.isDelivery).length,
    }
  }, [data])

  const openEdit = (u: AdminUser) => {
    setEditing(u)
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      cpf: u.cpf || '',
      userType: u.userType || 'usuario',
      qualification: u.qualification || '',
      role: u.role || 'user',
      plan: u.plan || 'free',
      isActive: u.isActive,
      isDriver: u.isDriver || false,
      isDelivery: u.isDelivery || false,
      entradaLevel: u.entradaLevel || 0,
      residualLevel: u.residualLevel || 0,
      vendasLevel: u.vendasLevel || 0,
      balanceWithdrawal: u.balanceWithdrawal || 0,
      balanceMobility: u.balanceMobility || 0,
      balanceShopping: u.balanceShopping || 0,
      balanceFood: u.balanceFood || 0,
      balancePharmacy: u.balancePharmacy || 0,
      balanceGratification: u.balanceGratification || 0,
      balancePaymentInvoice: u.balancePaymentInvoice || 0,
      careerPoints: u.careerPoints || 0,
      personalPoints: u.personalPoints || 0,
      stars: u.stars || 0,
    })
    setEditOpen(true)
  }

  const openView = (u: AdminUser) => {
    setViewing(u)
    setViewOpen(true)
  }

  // ADM-4 — Item 4 (Permissões login/password). Generate a random 10-char
  // password locally (mirrors the server-side generator in
  // /api/admin/users/[id]/reset-password/route.ts). Used by the "Gerar
  // senha" button in both the Create User dialog and the Reset Password
  // dialog. The alphabet excludes ambiguous chars (O/0, l/1, I) so the
  // password is easy to read over the phone.
  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const length = 10
    const bytes = new Uint8Array(length)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes)
    } else {
      // Fallback (very rare path — crypto is available in all modern
      // browsers and Node ≥ 19). Keeps the function total.
      for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
    }
    let out = ''
    for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
    return out
  }

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        toast.success('Copiado para a área de transferência')
        return
      }
    } catch {
      /* fall through to legacy path */
    }
    // Legacy fallback for non-secure contexts (http). Creates a hidden
    // textarea and runs document.execCommand('copy').
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      toast.success('Copiado para a área de transferência')
    } catch {
      toast.error('Não foi possível copiar automaticamente — selecione e copie manualmente.')
    }
  }

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!user?.id) return
    if (!createForm.name.trim()) {
      toast.error('Informe o nome completo')
      return
    }
    if (!createForm.email.trim() || !/\S+@\S+\.\S+/.test(createForm.email)) {
      toast.error('Informe um email válido (será usado para login)')
      return
    }
    if (createForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setCreating(true)
    try {
      await apiFetch('/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          phone: createForm.phone || undefined,
          cpf: createForm.cpf || undefined,
          plan: createForm.plan,
          role: createForm.role,
          userType: createForm.userType,
          referredByCode: createForm.referredByCode || undefined,
        }),
      })
      // ADM-4 — Item 4: show the credentials in a success dialog so the
      // admin can copy them and share with the new user. We can't read
      // the password back from the server later (only sha256 is stored),
      // so this is the admin's only chance to capture it.
      setCredentialsData({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        title: 'Usuário criado com sucesso',
        blurb:
          'Compartilhe as credenciais abaixo com o usuário. A senha não será exibida novamente — guarde-a em local seguro.',
      })
      setCredentialsOpen(true)
      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE)
      // Jump back to page 1 so the new user shows up at the top of the list.
      setPage(1)
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setCreating(false)
    }
  }

  // ADM-4 — Item 4: open the Reset Password dialog for a specific user.
  // Pre-fills the password field with a freshly-generated random password
  // so the admin can just confirm — or type their own if they prefer.
  const openReset = (u: AdminUser) => {
    setResetTarget(u)
    setResetPassword(generatePassword())
    setResetOpen(true)
  }

  // ADM-4 — Item 4: send the new password to /api/admin/users/[id]/reset-password.
  // The server returns the plaintext password (so we can show it in the
  // credentials dialog) — important when the admin leaves the field empty
  // and lets the server generate one.
  const handleReset = async () => {
    if (!user?.id || !resetTarget) return
    if (resetPassword && resetPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setResetting(true)
    try {
      const res = await apiFetch<{
        password: string
        email: string
        name: string
        message: string
      }>(`/admin/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          // Send the typed password; if empty, the server generates one.
          newPassword: resetPassword || undefined,
        }),
      })
      setCredentialsData({
        name: res.name || resetTarget.name,
        email: res.email || resetTarget.email,
        password: res.password,
        title: 'Senha redefinida com sucesso',
        blurb:
          'Compartilhe as credenciais abaixo com o usuário. A nova senha não será exibida novamente — guarde-a em local seguro.',
      })
      setResetOpen(false)
      setCredentialsOpen(true)
      setResetTarget(null)
      setResetPassword('')
      toast.success(res.message || 'Senha redefinida')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setResetting(false)
    }
  }

  const handleSave = async () => {
    if (!editing || !user?.id) return
    setSaving(true)
    try {
      await apiFetch(`/admin/users/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, ...editForm }),
      })
      toast.success('Usuário atualizado com sucesso')
      setEditOpen(false)
      setEditing(null)
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleLoginAs = async (u: AdminUser) => {
    if (!user?.id) return
    setImpersonating(u.id)
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
      // Remember admin id in sessionStorage so the user can return to admin mode.
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('newmobility_admin_impersonating', res.adminId)
        sessionStorage.setItem('newmobility_admin_name', res.adminName)
      }
      // Mark the store as impersonating BEFORE calling login() so the
      // ImpersonationBanner (mounted in app-layout.tsx) renders immediately
      // when the new (impersonated) session boots. login() does a partial
      // Zustand set, so it does not clear these flags. The sessionStorage
      // values above act as a backup for the page-refresh case (handled by
      // the mount effect in app-layout.tsx).
      setStoreImpersonating(true, res.adminId)
      // Swap the current session in zustand to the impersonated user.
      login(res.user as never)
      // Hard navigate to the user backoffice root.
      window.location.href = res.redirectUrl || '/'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entrar como usuário')
    } finally {
      setImpersonating(null)
    }
  }

  const handleExportCSV = () => {
    if (!data?.users?.length) {
      toast.info('Nenhum usuário para exportar')
      return
    }
    const headers = ['Nome', 'Email', 'CPF', 'Tipo', 'Plano', 'Status', 'KYC', 'Saldo Saque']
    const rows = data.users.map((u) => [
      u.name,
      u.email,
      u.cpf || '',
      u.userType || 'usuario',
      u.plan,
      u.isActive ? 'Ativo' : 'Inativo',
      u.kycStatus || 'none',
      String(u.balanceWithdrawal || 0),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <UsersIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ativos (página)</p>
              <p className="text-xl font-bold text-foreground">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
              <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Inativos (página)</p>
              <p className="text-xl font-bold text-foreground">{stats.inactive}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Motoristas/Entregadores</p>
              <p className="text-xl font-bold text-foreground">{stats.drivers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou código..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={userTypeFilter} onValueChange={(v) => { setUserTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {allUserTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={openCreate}
            >
              <UserPlus className="h-3.5 w-3.5" /> Criar Usuário
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Usuário</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">CPF</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden sm:table-cell">Plano</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">Role</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">KYC</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Saldo Saque</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                        <span className="h-4 w-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                        Carregando usuários...
                      </div>
                    </td>
                  </tr>
                ) : data?.users && data.users.length > 0 ? (
                  data.users.map((u) => {
                    const typeBadge = userTypeBadge(u.userType)
                    const kyc = kycBadge(u.kycStatus)
                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{u.cpf || '—'}</span>
                        </td>
                        <td className="p-3">
                          <Badge className={typeBadge.color}>{typeBadge.label}</Badge>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <Badge className={planBadge(u.plan)}>{u.plan === 'blue5' ? 'Blue 5' : u.plan === 'blue3' ? 'Blue 3' : 'Gratuito'}</Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <Badge className={roleBadgeClass(u.role)} title={u.role ? `Role: ${u.role}` : undefined}>
                            <Shield className="h-2.5 w-2.5 mr-0.5" /> {roleLabel(u.role)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}>
                            {u.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <Badge className={kyc.cls}>{kyc.label}</Badge>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className="text-sm font-semibold text-foreground">{formatBRL(u.balanceWithdrawal)}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleLoginAs(u)}
                              disabled={impersonating === u.id || u.role === 'admin'}
                              title={u.role === 'admin' ? 'Não é possível entrar como admin' : 'Entrar no backoffice do usuário'}
                            >
                              {impersonating === u.id
                                ? <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <LogIn className="h-3.5 w-3.5" />}
                              <span className="hidden xl:inline">Entrar</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => openView(u)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Ver</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => openEdit(u)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Editar</span>
                            </Button>
                            {/* ADM-4 — Item 4: Reset Password action. Generates
                                a new password (or lets the admin type one) and
                                displays the new credentials in a follow-up
                                dialog so they can be shared with the user. */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => openReset(u)}
                              title="Redefinir senha do usuário"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Senha</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <UsersIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{data.total} usuários</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground">{page}/{data.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADM-4 — Create User dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                value={createForm.name}
                onChange={(e) => setCreateForm((d) => ({ ...d, name: e.target.value }))}
                placeholder="João da Silva"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((d) => ({ ...d, email: e.target.value }))}
                  placeholder="joao@exemplo.com"
                />
                <p className="text-[10px] text-muted-foreground">Será usado para login.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span>Senha *</span>
                  {/* ADM-4 — Item 4: "Gerar senha" button. Fills the password
                      field with a random 10-char password so the admin
                      doesn't have to invent one. The admin can still type
                      their own password if they prefer. */}
                  <button
                    type="button"
                    onClick={() => setCreateForm((d) => ({ ...d, password: generatePassword() }))}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1"
                    title="Gerar uma senha aleatória segura"
                  >
                    <RefreshCw className="h-3 w-3" /> Gerar senha
                  </button>
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((d) => ({ ...d, password: e.target.value }))}
                    placeholder="mínimo 6 caracteres"
                    className="pl-8 pr-8 font-mono"
                  />
                  {createForm.password && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createForm.password)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Copiar senha"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  A senha será exibida novamente na tela de confirmação após criar o usuário.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((d) => ({ ...d, phone: e.target.value }))}
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPF</Label>
                <Input
                  value={createForm.cpf}
                  onChange={(e) => setCreateForm((d) => ({ ...d, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Usuário</Label>
                <Select
                  value={createForm.userType}
                  onValueChange={(v) => setCreateForm((d) => ({ ...d, userType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allUserTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  Role
                </Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm((d) => ({ ...d, role: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
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
                  value={createForm.plan}
                  onValueChange={(v) => setCreateForm((d) => ({ ...d, plan: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allPlans.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Código de indicante</Label>
                <Input
                  value={createForm.referredByCode}
                  onChange={(e) => setCreateForm((d) => ({ ...d, referredByCode: e.target.value }))}
                  placeholder="opcional"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate} disabled={creating}>
              {creating ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-emerald-600" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              {editing?.name} ({editing?.email})
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="type">Tipo & Plano</TabsTrigger>
              <TabsTrigger value="balances">Saldos & Pontos</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm((d) => ({ ...d, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm((d) => ({ ...d, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm((d) => ({ ...d, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CPF</Label>
                  <Input value={editForm.cpf} onChange={(e) => setEditForm((d) => ({ ...d, cpf: e.target.value }))} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="type" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de Usuário</Label>
                  <Select value={editForm.userType} onValueChange={(v) => setEditForm((d) => ({ ...d, userType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allUserTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plano</Label>
                  <Select value={editForm.plan} onValueChange={(v) => setEditForm((d) => ({ ...d, plan: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allPlans.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* ADM-4 — Role Select: controls admin panel access. 'admin' or
                  'support' (or any custom role from the permissions panel)
                  grants panel access limited by the Permissões tab matrix. */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  Role (acesso ao painel)
                </Label>
                <Select
                  value={editForm.role || 'user'}
                  onValueChange={(v) => setEditForm((d) => ({ ...d, role: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Usuários com role <strong>admin</strong>, <strong>support</strong> ou qualquer role
                  customizado conseguem acessar o painel admin. As páginas permitidas são definidas na aba
                  <strong> Permissões</strong>.
                </p>
              </div>
              {/* BACK-4 — Qualification dropdown (10 types per Task 2-e,
                  mirrors the registration dropdown). Lets the admin set or
                  correct the user's qualification after registration. */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs">Qualificação</Label>
                <Select
                  value={editForm.qualification || undefined}
                  onValueChange={(v) => setEditForm((d) => ({ ...d, qualification: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a qualificação" /></SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_DROPDOWN_OPTIONS.map((q) => (
                      <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label className="text-xs">Ativo</Label>
                  <Switch checked={editForm.isActive} onCheckedChange={(v) => setEditForm((d) => ({ ...d, isActive: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label className="text-xs">Motorista (isDriver)</Label>
                  <Switch checked={editForm.isDriver} onCheckedChange={(v) => setEditForm((d) => ({ ...d, isDriver: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label className="text-xs">Entregador (isDelivery)</Label>
                  <Switch checked={editForm.isDelivery} onCheckedChange={(v) => setEditForm((d) => ({ ...d, isDelivery: v }))} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                Os switches Motorista/Entregador ativam flags booleanas no perfil do usuario (liberam metas e acesso a funcoes de condutor).
                Para definir o tipo principal do usuario, use o campo <strong>Qualificacao</strong> acima (10 opcoes) e/ou o campo <strong>Tipo de Usuario</strong> (17 opcoes).
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nível Entrada</Label>
                  <Input type="number" value={editForm.entradaLevel} onChange={(e) => setEditForm((d) => ({ ...d, entradaLevel: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nível Residual</Label>
                  <Input type="number" value={editForm.residualLevel} onChange={(e) => setEditForm((d) => ({ ...d, residualLevel: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nível Vendas</Label>
                  <Input type="number" value={editForm.vendasLevel} onChange={(e) => setEditForm((d) => ({ ...d, vendasLevel: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="balances" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Saque (cents)</Label>
                  <Input type="number" value={editForm.balanceWithdrawal} onChange={(e) => setEditForm((d) => ({ ...d, balanceWithdrawal: parseInt(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{formatBRL(editForm.balanceWithdrawal)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mobilidade</Label>
                  <Input type="number" value={editForm.balanceMobility} onChange={(e) => setEditForm((d) => ({ ...d, balanceMobility: parseInt(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{formatBRL(editForm.balanceMobility)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Compras</Label>
                  <Input type="number" value={editForm.balanceShopping} onChange={(e) => setEditForm((d) => ({ ...d, balanceShopping: parseInt(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{formatBRL(editForm.balanceShopping)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Refeição</Label>
                  <Input type="number" value={editForm.balanceFood} onChange={(e) => setEditForm((d) => ({ ...d, balanceFood: parseInt(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{formatBRL(editForm.balanceFood)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Farmácia</Label>
                  <Input type="number" value={editForm.balancePharmacy} onChange={(e) => setEditForm((d) => ({ ...d, balancePharmacy: parseInt(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{formatBRL(editForm.balancePharmacy)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gratificação</Label>
                  <Input type="number" value={editForm.balanceGratification} onChange={(e) => setEditForm((d) => ({ ...d, balanceGratification: parseInt(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{formatBRL(editForm.balanceGratification)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pag. Fatura</Label>
                  <Input type="number" value={editForm.balancePaymentInvoice} onChange={(e) => setEditForm((d) => ({ ...d, balancePaymentInvoice: parseInt(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{formatBRL(editForm.balancePaymentInvoice)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pontos Carreira</Label>
                  <Input type="number" value={editForm.careerPoints} onChange={(e) => setEditForm((d) => ({ ...d, careerPoints: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pontos Pessoais</Label>
                  <Input type="number" value={editForm.personalPoints} onChange={(e) => setEditForm((d) => ({ ...d, personalPoints: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estrelas</Label>
                  <Input type="number" value={editForm.stars} onChange={(e) => setEditForm((d) => ({ ...d, stars: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancelar</Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog (read-only) */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              Perfil do Usuário
            </DialogTitle>
            <DialogDescription>{viewing?.name}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Nome" value={viewing.name} />
                <Detail label="Email" value={viewing.email} />
                <Detail label="Telefone" value={viewing.phone || '—'} />
                <Detail label="CPF" value={viewing.cpf || '—'} />
                <Detail label="Tipo" value={userTypeBadge(viewing.userType).label} />
                <Detail label="Qualificação" value={getQualificationLabel(viewing.qualification)} />
                <Detail label="Plano" value={viewing.plan === 'blue5' ? 'Blue 5 Premium' : viewing.plan === 'blue3' ? 'Blue 3' : 'Gratuito'} />
                <Detail label="Role" value={roleLabel(viewing.role)} />
                <Detail label="Status" value={viewing.isActive ? 'Ativo' : 'Inativo'} />
                <Detail label="KYC" value={kycBadge(viewing.kycStatus).label} />
                <Detail label="Motorista" value={viewing.isDriver ? 'Sim' : 'Não'} />
                <Detail label="Entregador" value={viewing.isDelivery ? 'Sim' : 'Não'} />
                <Detail label="Indicações" value={String(viewing._count?.referrals ?? 0)} />
                <Detail label="Cidade" value={viewing.city ? `${viewing.city}${viewing.state ? '/' + viewing.state : ''}` : '—'} />
                <Detail label="Criado em" value={viewing.createdAt ? formatDate(viewing.createdAt) : '—'} />
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Saldos</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Detail label="Saque" value={formatBRL(viewing.balanceWithdrawal)} />
                  <Detail label="Mobilidade" value={formatBRL(viewing.balanceMobility)} />
                  <Detail label="Compras" value={formatBRL(viewing.balanceShopping)} />
                  <Detail label="Refeição" value={formatBRL(viewing.balanceFood)} />
                  <Detail label="Farmácia" value={formatBRL(viewing.balancePharmacy)} />
                  <Detail label="Gratificação" value={formatBRL(viewing.balanceGratification)} />
                  <Detail label="Pag. Fatura" value={formatBRL(viewing.balancePaymentInvoice)} />
                  <Detail label="Pontos Carreira" value={String(viewing.careerPoints ?? 0)} />
                </div>
              </div>
              {viewing.createdAt && (
                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
                  Atualizado em {formatDateTime(viewing.createdAt)}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
              if (viewing) {
                setViewOpen(false)
                openEdit(viewing)
              }
            }}>
              <Edit className="h-4 w-4" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADM-4 — Item 4: Reset Password dialog. Lets the admin type a new
          password or click "Gerar senha" to auto-fill a random one. The
          plaintext password is sent to /api/admin/users/[id]/reset-password
          which hashes it (sha256) and stores it. The server also returns
          the plaintext back so we can display it in the credentials dialog
          for the admin to share with the user. */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              Redefinir Senha
            </DialogTitle>
            <DialogDescription>
              {resetTarget?.name} ({resetTarget?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                A nova senha substitui a senha atual imediatamente. O usuário precisará usar a nova
                senha no próximo login. A senha atual <strong>não pode ser recuperada</strong> depois
                de redefinida.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center justify-between">
                <span>Nova senha *</span>
                <button
                  type="button"
                  onClick={() => setResetPassword(generatePassword())}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1"
                  title="Gerar uma senha aleatória segura"
                >
                  <RefreshCw className="h-3 w-3" /> Gerar senha
                </button>
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  className="pl-8 pr-8 font-mono"
                />
                {resetPassword && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resetPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Copiar senha"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Deixe vazio para o servidor gerar uma senha aleatória segura.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>Cancelar</Button>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <KeyRound className="h-4 w-4" />}
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADM-4 — Item 4: Credentials success dialog. Shown after creating a
          user OR after resetting a password. Displays the email + plaintext
          password so the admin can copy them and share with the user. The
          plaintext password is NOT recoverable from the DB (only sha256 is
          stored), so this is the admin's only chance to capture it. */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {credentialsData?.title || 'Credenciais'}
            </DialogTitle>
            <DialogDescription>
              {credentialsData?.blurb}
            </DialogDescription>
          </DialogHeader>
          {credentialsData && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Nome</p>
                  <p className="text-sm font-medium text-foreground break-words">{credentialsData.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                    <span>Email (login)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(credentialsData.email)}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 normal-case tracking-normal"
                    >
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  </p>
                  <p className="text-sm font-medium text-foreground break-all">{credentialsData.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                    <span>Senha</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(credentialsData.password)}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 normal-case tracking-normal"
                    >
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  </p>
                  <p className="text-sm font-mono font-bold text-foreground break-all bg-background px-2 py-1 rounded border border-border">
                    {credentialsData.password}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(`Email: ${credentialsData.email}\nSenha: ${credentialsData.password}`)}
                className="w-full text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar tudo (email + senha)
              </button>
              <p className="text-[10px] text-muted-foreground text-center">
                O usuário pode fazer login na página de acesso da plataforma com essas credenciais.
                Recomendamos que ele altere a senha após o primeiro login.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (credentialsData) {
                  copyToClipboard(`Email: ${credentialsData.email}\nSenha: ${credentialsData.password}`)
                }
              }}
            >
              <Copy className="h-4 w-4" /> Copiar Credenciais
            </Button>
            <Button variant="outline" onClick={() => setCredentialsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-foreground break-words">{value}</span>
    </div>
  )
}
