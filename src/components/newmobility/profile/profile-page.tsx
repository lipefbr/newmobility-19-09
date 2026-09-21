'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/lib/store'
import { getPlanName, timeSince, formatDate } from '@/lib/utils'
import { getCareerRank } from '@/lib/api-utils'
import { useTranslation } from '@/lib/i18n'
import {
  User, Building2, Lock, Save, Camera, Shield, Calendar,
  CreditCard, Users, DollarSign, Copy, Check as CheckIcon, Check, ArrowUpRight, Link2, Award,
  Verified, Mail, Phone, MapPin, Eye, EyeOff, Smartphone, Globe, Key,
  ShieldCheck, ShieldAlert, ShieldX, Chrome, Apple, Send, FileCheck, Hash,
  AlertTriangle, HelpCircle, Heart, Plus, Trash2, Edit3, X,
  Siren, Cake, Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { TwoFactorSetup } from './two-factor-setup'
import { PersonalDataSection } from './personal-data-section'
import { userApi, apiFetch, ApiError } from '@/lib/api'
import { toast as sonnerToast } from 'sonner'
import { cn } from '@/lib/utils'

// Always-visible Editable Field component.
//
// Task 19-A (deep-fix): The previous InlineField used an edit-on-click
// pattern (text + hidden pencil → click pencil → input appears → type →
// click check or blur → exits edit mode). This caused TWO real bugs:
//
//   1. UX confusion: on desktop the pencil icon was `opacity-0` until
//      `group-hover`, so users had no visual cue that fields were
//      editable. They would change a field's text mentally, click
//      "Salvar Alterações" without ever entering edit mode, and the
//      OLD value was sent to the API. From the user's perspective
//      "saving doesn't work" — even though the API was fine.
//
//   2. Race condition with the mount-time GET /api/user/profile: that
//      fetch (which can take 8+ s on first compile) resolves by calling
//      setPersonalInfo(...) and OVERWRITES whatever the user had typed
//      in the inline Input while the request was in flight. The user's
//      edits silently vanished, and the subsequent Save sent the stale
//      DB value. (Fixed separately below via personalDirtyRef etc.)
//
// Fix: the field is now an always-visible Input. No edit toggle, no
// hidden pencil, no blur-loses-edits footgun. Every keystroke still
// propagates to the parent's state via `onChange` (controlled input),
// so the Save button always reads the latest typed value. `disabled`
// fields (E-mail, CPF) render as a read-only Input so the layout is
// consistent and the user can see they are not editable.
function InlineField({ label, value, onChange, icon: Icon, type = 'text', disabled = false, placeholder }: {
  label: string
  value: string
  onChange: (val: string) => void
  icon?: React.ElementType
  type?: string
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </div>
  )
}

// Donut Chart component for beneficiary distribution
function BeneficiaryDonutChart({ beneficiaries }: { beneficiaries: { name: string; percentage: number; relationship: string }[] }) {
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
  const total = beneficiaries.reduce((sum, b) => sum + b.percentage, 0)
  const remaining = 100 - total

  const segments = beneficiaries.reduce<{ name: string; percent: number; startAngle: number; endAngle: number; color: string }[]>((acc, b, i) => {
    const prevEnd = acc.length > 0 ? acc[acc.length - 1].endAngle : 0
    const endAngle = prevEnd + (b.percentage / 100) * 360
    acc.push({
      name: b.name,
      percent: b.percentage,
      startAngle: prevEnd,
      endAngle,
      color: colors[i % colors.length],
    })
    return acc
  }, [])

  // Add remaining segment
  if (remaining > 0) {
    const prevEnd = segments.length > 0 ? segments[segments.length - 1].endAngle : 0
    segments.push({
      name: 'Disponível',
      percent: remaining,
      startAngle: prevEnd,
      endAngle: prevEnd + (remaining / 100) * 360,
      color: '#e5e7eb',
    })
  }

  const radius = 60
  const cx = 70
  const cy = 70
  const strokeWidth = 24

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    }
  }

  function describeArc(startAngle: number, endAngle: number) {
    if (endAngle - startAngle >= 359.99) {
      // Full circle - use two arcs
      const mid = startAngle + 180
      const s1 = polarToCartesian(cx, cy, radius, startAngle)
      const m1 = polarToCartesian(cx, cy, radius, mid)
      const e1 = polarToCartesian(cx, cy, radius, endAngle - 0.01)
      return `M ${s1.x} ${s1.y} A ${radius} ${radius} 0 0 1 ${m1.x} ${m1.y} A ${radius} ${radius} 0 0 1 ${e1.x} ${e1.y}`
    }
    const start = polarToCartesian(cx, cy, radius, startAngle)
    const end = polarToCartesian(cx, cy, radius, endAngle)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} className="dark:stroke-gray-700" />
          {/* Segments */}
          {segments.map((seg, i) => (
            <path
              key={i}
              d={describeArc(seg.startAngle, seg.endAngle)}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />
          ))}
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold fill-foreground" style={{ fontSize: '18px' }}>
            {total}%
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="text-xs fill-muted-foreground" style={{ fontSize: '10px' }}>
            Alocado
          </text>
        </svg>
      </div>
      <div className="flex flex-wrap gap-2">
        {beneficiaries.map((b, i) => (
          <div key={b.name} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[10px] text-muted-foreground">{b.name.split(' ')[0]} ({b.percentage}%)</span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
            <span className="text-[10px] text-muted-foreground">Disponível ({remaining}%)</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Security Score widget
function SecurityScore() {
  const [showPassword, setShowPassword] = useState(false)
  const checks = [
    { label: 'Senha forte', passed: true, icon: ShieldCheck },
    { label: '2FA ativado', passed: false, icon: ShieldAlert },
    { label: 'E-mail verificado', passed: true, icon: ShieldCheck },
    { label: 'Telefone verificado', passed: true, icon: ShieldCheck },
  ]
  const score = checks.filter(c => c.passed).length
  const total = checks.length
  const percentage = (score / total) * 100
  const level = percentage >= 75 ? 'Forte' : percentage >= 50 ? 'Médio' : 'Fraco'
  const levelColor = percentage >= 75 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600'
  const levelBg = percentage >= 75 ? 'bg-emerald-100 dark:bg-emerald-950/30' : percentage >= 50 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-red-100 dark:bg-red-950/30'

  return (
    <Card className="shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          Pontuação de Segurança
          <Badge className={`${levelBg} ${levelColor} text-[10px] border-0`}>{level}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
              <motion.circle
                cx="32" cy="32" r="28" fill="none" stroke={percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${28 * 2 * Math.PI}`}
                initial={{ strokeDashoffset: 28 * 2 * Math.PI }}
                animate={{ strokeDashoffset: 28 * 2 * Math.PI * (1 - percentage / 100) }}
                transition={{ duration: 1 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-foreground">{score}/{total}</span>
            </div>
          </div>
          <div className="flex-1">
            {checks.map((check) => {
              const Icon = check.icon
              return (
                <div key={check.label} className="flex items-center gap-2 py-1">
                  <Icon className={`h-3.5 w-3.5 ${check.passed ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span className="text-xs text-foreground">{check.label}</span>
                  {!check.passed && (
                    <Button variant="link" className="h-auto p-0 text-[10px] text-emerald-600">Ativar</Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Connected Accounts section
function ConnectedAccounts() {
  const accounts = [
    { name: 'Google', icon: Chrome, connected: true, color: 'text-red-500' },
    { name: 'Apple', icon: Apple, connected: false, color: 'text-gray-700 dark:text-gray-300' },
    { name: 'Facebook', icon: Globe, connected: false, color: 'text-blue-600' },
  ]
  return (
    <Card className="shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-emerald-600" />
          Contas Conectadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accounts.map((account) => {
            const Icon = account.icon
            return (
              <div key={account.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${account.color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{account.name}</p>
                    <p className="text-[10px] text-muted-foreground">{account.connected ? 'Conectado' : 'Não conectado'}</p>
                  </div>
                </div>
                <Badge variant={account.connected ? 'default' : 'outline'} className={`text-[10px] ${account.connected ? 'bg-emerald-600' : ''}`}>
                  {account.connected ? 'Conectado' : 'Conectar'}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Full set of editable personal information fields. The previous state
// only carried name/email/phone/cpf/address/city/state, which meant the
// "Salvar Alterações" button on the personal tab silently dropped every
// other personal field (birthDate, rg, maritalStatus, gender, education,
// zipCode, sponsorId, qualification). Task 13-D extends both the state
// shape and the save payload so the entire personal form is editable.
interface PersonalInfo {
  name: string
  email: string
  phone: string
  cpf: string
  address: string
  city: string
  state: string
  birthDate: string // ISO date string (or '')
  rg: string
  maritalStatus: string
  gender: string
  education: string
  zipCode: string
  sponsorId: string
  qualification: string
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useStore()
  // Task 18-C: Block password change while an admin is impersonating this
  // user — sensitive credential changes must never be performed on behalf
  // of another user.
  const isImpersonating = useStore((s) => s.isImpersonating)
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    address: '',
    city: '',
    state: '',
    birthDate: '',
    rg: '',
    maritalStatus: '',
    gender: '',
    education: '',
    zipCode: '',
    sponsorId: '',
    qualification: '',
  })

  // Emergency contact state
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    phone: '',
    relationship: '',
  })
  const [emergencySaving, setEmergencySaving] = useState(false)

  // Profile image upload state
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const profileImageInputRef = useRef<HTMLInputElement | null>(null)

  const [bankInfo, setBankInfo] = useState({
    bankCode: '',
    bankAgency: '',
    bankAccount: '',
    bankType: 'cc',
    pixKey: '',
    pixEnabled: true,
  })

  // Task 19-A (deep-fix): Dirty refs that track whether the user has
  // typed into any field of each section. The mount-time GET
  // /api/user/profile (which can take 8+ s on first compile) resolves
  // by calling setPersonalInfo / setBankInfo / setEmergencyContact
  // with the DB values — WITHOUT these guards, a late-arriving GET
  // response would OVERWRITE the user's unsaved edits, causing the
  // subsequent "Salvar Alterações" to silently send the stale DB value
  // instead of the typed value. This was the REAL root cause of the
  // "profile saving doesn't work in the browser" complaint: the API
  // itself worked fine via curl, but in the browser the GET response
  // arrived after the user typed and clobbered their edits.
  //
  // Each ref is set to true on the FIRST keystroke in any field of the
  // corresponding section, and the GET response handler below skips
  // the setState for any section already marked dirty. The refs are
  // reset to false only when the user id changes (new login).
  const personalDirtyRef = useRef(false)
  const bankDirtyRef = useRef(false)
  const emergencyDirtyRef = useRef(false)

  // Task 19-A (deep-fix, round 2): The mount-time GET /api/user/profile
  // uses the default 10s apiFetch timeout. On first-compile (or any slow
  // network) this can EXCEED 10s, causing an ApiTimeoutError — observed
  // in the browser console:
  //   "Failed to fetch profile for personal info hydration: ApiTimeoutError"
  // When that happens, personalInfo stays at the initial state which is
  // populated from the Zustand `user` store for name/phone/email/cpf
  // (those fields ARE on UserData), but address/city/state/birthDate/etc.
  // default to '' (because they're NOT on UserData). If the user then
  // clicks "Salvar Alterações", the PUT sends address='', city='',
  // state='' — silently WIPING any previously-saved DB values.
  //
  // Fix: track an explicit `profileHydrating` flag (true while the GET
  // is in-flight OR has failed). The Save buttons are disabled while
  // this is true, with a "Carregando dados..." label so the user knows
  // to wait. The flag is reset to false on success OR failure, with a
  // console.warn if it timed out so the issue is visible.
  const [profileHydrating, setProfileHydrating] = useState(true)

  // Wrapped setters that flip the dirty ref. Use these in the onChange
  // handlers below so we don't have to repeat the ref assignment.
  const updatePersonalField = <K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) => {
    personalDirtyRef.current = true
    setPersonalInfo((p) => ({ ...p, [key]: value }))
  }
  const updateBankField = <K extends keyof typeof bankInfo>(key: K, value: (typeof bankInfo)[K]) => {
    bankDirtyRef.current = true
    setBankInfo((p) => ({ ...p, [key]: value }))
  }
  const updateEmergencyField = <K extends keyof typeof emergencyContact>(key: K, value: (typeof emergencyContact)[K]) => {
    emergencyDirtyRef.current = true
    setEmergencyContact((p) => ({ ...p, [key]: value }))
  }

  // Sync bank info from user data on mount or when user changes
  useEffect(() => {
    // Reset dirty refs on user change so the new user's GET response
    // is allowed to hydrate the form fields.
    personalDirtyRef.current = false
    bankDirtyRef.current = false
    emergencyDirtyRef.current = false
    if (user) {
      setBankInfo({
        bankCode: user.bankCode || '',
        bankAgency: user.bankAgency || '',
        bankAccount: user.bankAccount || '',
        bankType: user.bankType || 'cc',
        pixKey: user.pixKey || '',
        pixEnabled: user.pixEnabled ?? true,
      })
      // Sync emergency contact from user data (user is Partial<UserData> plus
      // extra fields returned from /api/user/profile GET)
      const u = user as any
      setEmergencyContact({
        name: u.emergencyName || '',
        phone: u.emergencyPhone || '',
        relationship: u.emergencyRelation || '',
      })
      // Sync personal info — include ALL editable personal fields so that
      // handleSavePersonal can re-send them without wiping values that
      // were previously saved via the PersonalDataSection component.
      // birthDate arrives as an ISO string from the API; we keep it as-is.
      setPersonalInfo({
        name: u.name ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
        cpf: u.cpf ?? '',
        address: u.address ?? '',
        city: u.city ?? '',
        state: u.state ?? '',
        birthDate: u.birthDate ? String(u.birthDate) : '',
        rg: u.rg ?? '',
        maritalStatus: u.maritalStatus ?? '',
        gender: u.gender ?? '',
        education: u.education ?? '',
        zipCode: u.zipCode ?? '',
        sponsorId: u.sponsorId ?? '',
        qualification: u.qualification ?? '',
      })
    }
  }, [user?.id])

  // Bug #2 fix: The Zustand `user` store does not carry extended personal
  // fields (address/city/state/birthDate/rg/maritalStatus/gender/education/
  // zipCode/sponsorId/qualification) because they are not declared on the
  // UserData interface. The useEffect above only rehydrates from the
  // store, so those fields default to '' — and when handleSavePersonal
  // runs it sends those empty strings to PUT /api/user/profile, wiping
  // previously-saved data. This second effect fetches the authoritative
  // profile from the API (the response includes ALL User columns via
  // sanitizeUser) and overwrites the state with the real DB values so
  // that the "Salvar Alterações" button re-sends the actual stored
  // values instead of empty defaults. Mirrors the fetchProfile pattern
  // used in personal-data-section.tsx (lines 134-171).
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setProfileHydrating(true)
    // Task 19-A (deep-fix, round 2): Bump the timeout from the default
    // 10s to 30s. The /api/user/profile route can take 8-15s on the
    // first compile (the dev.log shows "GET /api/user/profile 200 in
    // 5.1s (compile: 2.7s, render: 2.4s)" — and that was after a
    // warm-ish cache). On a cold first-compile the GET can exceed 10s,
    // which previously caused an ApiTimeoutError and left the form
    // un-hydrated, which in turn caused the Save button to send empty
    // strings for address/city/state/birthDate and silently wipe the
    // DB. 30s matches the timeout already used by /api/referrals (see
    // referralsApi.getList in lib/api.ts line 139).
    apiFetch<any>(`/user/profile?userId=${user.id}`, { timeoutMs: 30_000 })
      .then((profile: any) => {
        if (cancelled || !profile) return
        // Task 19-A (deep-fix): Only apply the API response for sections
        // the user has NOT yet edited. This prevents a late-arriving GET
        // (e.g. 8s on first compile, or any slow network) from clobbering
        // the user's unsaved edits in any of the three sections.
        if (!personalDirtyRef.current) {
          setPersonalInfo({
            name: profile.name ?? '',
            email: profile.email ?? '',
            phone: profile.phone ?? '',
            cpf: profile.cpf ?? '',
            address: profile.address ?? '',
            city: profile.city ?? '',
            state: profile.state ?? '',
            birthDate: profile.birthDate ? String(profile.birthDate) : '',
            rg: profile.rg ?? '',
            maritalStatus: profile.maritalStatus ?? '',
            gender: profile.gender ?? '',
            education: profile.education ?? '',
            zipCode: profile.zipCode ?? '',
            sponsorId: profile.sponsorId ?? '',
            qualification: profile.qualification ?? '',
          })
        }
        if (!bankDirtyRef.current) {
          setBankInfo({
            bankCode: profile.bankCode ?? '',
            bankAgency: profile.bankAgency ?? '',
            bankAccount: profile.bankAccount ?? '',
            bankType: profile.bankType || 'cc',
            pixKey: profile.pixKey ?? '',
            pixEnabled: profile.pixEnabled ?? true,
          })
        }
        if (!emergencyDirtyRef.current) {
          setEmergencyContact({
            name: profile.emergencyName ?? '',
            phone: profile.emergencyPhone ?? '',
            relationship: profile.emergencyRelation ?? '',
          })
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch profile for personal info hydration:', err)
        // Task 19-A (deep-fix, round 2): Surface a user-visible toast on
        // hydration failure so the user knows the form may be stale and
        // that clicking Save could wipe un-hydrated fields. The Save
        // buttons are also disabled while `profileHydrating` is true
        // (set back to false below) to prevent the data-loss path.
        sonnerToast.error('Não foi possível carregar seus dados. Recarregue a página antes de salvar.')
      })
      .finally(() => {
        if (!cancelled) setProfileHydrating(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const [passwordInfo, setPasswordInfo] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Beneficiaries state - loaded from API
  const [beneficiaries, setBeneficiaries] = useState<{
    id: string
    name: string
    cpf: string
    relationship: string
    percentage: number
    age: number | null
  }[]>([])
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false)
  const [showBeneficiaryDialog, setShowBeneficiaryDialog] = useState(false)
  const [editingBeneficiary, setEditingBeneficiary] = useState<typeof beneficiaries[0] | null>(null)
  const [beneficiaryForm, setBeneficiaryForm] = useState({ name: '', cpf: '', relationship: 'spouse', percentage: 0, age: 0 })
  const [beneficiarySaving, setBeneficiarySaving] = useState(false)

  // Referral network stats (direct count + total network size).
  // Used to replace the previous "Total Ganho" (R$) card with a
  // privacy-friendly "Indicações Diretas" count — see task 4b.
  const [referralStats, setReferralStats] = useState<{
    totalDirect: number
    totalNetwork: number
    activeDirect: number
  }>({ totalDirect: 0, totalNetwork: 0, activeDirect: 0 })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetch(`/api/referrals?userId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.stats) return
        setReferralStats({
          totalDirect: data.stats.totalDirect ?? 0,
          totalNetwork: data.stats.totalNetwork ?? 0,
          activeDirect: data.stats.activeDirect ?? 0,
        })
      })
      .catch((err) => console.error('Failed to fetch referral stats:', err))
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + b.percentage, 0)
  const remainingBeneficiaryPercentage = 100 - totalBeneficiaryPercentage

  const relationshipLabels: Record<string, string> = {
    spouse: 'Cônjuge',
    child: 'Filho(a)',
    parent: 'Pai/Mãe',
    sibling: 'Irmão(ã)',
    other: 'Outro',
  }

  // Fetch beneficiaries from API
  const fetchBeneficiaries = useCallback(async () => {
    if (!user?.id) return
    try {
      setBeneficiariesLoading(true)
      // Ensure table exists via migrate
      await apiFetch<any>('/migrate', { method: 'POST' }).catch(() => {})
      const data = await apiFetch<any>(`/user/beneficiaries?userId=${user.id}`)
      if (data.beneficiaries && Array.isArray(data.beneficiaries)) {
        setBeneficiaries(data.beneficiaries.map((b: any) => ({
          id: b.id,
          name: b.name,
          cpf: b.cpf || '',
          relationship: b.relationship,
          percentage: b.percentage,
          age: b.age || null,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch beneficiaries:', err)
      // Fallback to mock data if API fails
      setBeneficiaries([
        { id: '1', name: 'Maria Silva', cpf: '987.654.321-00', relationship: 'spouse', percentage: 50, age: 35 },
        { id: '2', name: 'Pedro Silva', cpf: '456.789.123-00', relationship: 'child', percentage: 30, age: 12 },
      ])
    } finally {
      setBeneficiariesLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchBeneficiaries()
  }, [fetchBeneficiaries])

  const handleAddBeneficiary = async () => {
    if (!beneficiaryForm.name || beneficiaryForm.percentage <= 0) {
      sonnerToast.error('Preencha nome e percentual')
      return
    }
    if (totalBeneficiaryPercentage + beneficiaryForm.percentage > 100) {
      sonnerToast.error('Total de percentuais não pode exceder 100%')
      return
    }

    setBeneficiarySaving(true)
    try {
      const data = await apiFetch<any>('/user/beneficiaries', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          name: beneficiaryForm.name,
          cpf: beneficiaryForm.cpf || undefined,
          relationship: beneficiaryForm.relationship,
          percentage: beneficiaryForm.percentage,
          age: beneficiaryForm.age || undefined,
        }),
      })
      if (data.beneficiary) {
        await fetchBeneficiaries()
        setBeneficiaryForm({ name: '', cpf: '', relationship: 'spouse', percentage: 0, age: 0 })
        setShowBeneficiaryDialog(false)
        sonnerToast.success('Beneficiário adicionado com sucesso!')
      }
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao adicionar beneficiário')
    } finally {
      setBeneficiarySaving(false)
    }
  }

  const handleEditBeneficiary = async () => {
    if (!editingBeneficiary || !beneficiaryForm.name || beneficiaryForm.percentage <= 0) {
      sonnerToast.error('Preencha nome e percentual')
      return
    }
    const otherTotal = beneficiaries.filter(b => b.id !== editingBeneficiary.id).reduce((sum, b) => sum + b.percentage, 0)
    if (otherTotal + beneficiaryForm.percentage > 100) {
      sonnerToast.error('Total de percentuais não pode exceder 100%')
      return
    }

    setBeneficiarySaving(true)
    try {
      await apiFetch<any>('/user/beneficiaries', {
        method: 'PUT',
        body: JSON.stringify({
          id: editingBeneficiary.id,
          userId: user?.id,
          name: beneficiaryForm.name,
          cpf: beneficiaryForm.cpf || undefined,
          relationship: beneficiaryForm.relationship,
          percentage: beneficiaryForm.percentage,
          age: beneficiaryForm.age || undefined,
        }),
      })
      await fetchBeneficiaries()
      setEditingBeneficiary(null)
      setBeneficiaryForm({ name: '', cpf: '', relationship: 'spouse', percentage: 0, age: 0 })
      sonnerToast.success('Beneficiário atualizado com sucesso!')
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao atualizar beneficiário')
    } finally {
      setBeneficiarySaving(false)
    }
  }

  const handleDeleteBeneficiary = async (id: string) => {
    try {
      await apiFetch<any>(`/user/beneficiaries?id=${id}&userId=${user?.id}`, {
        method: 'DELETE',
      })
      setBeneficiaries(prev => prev.filter(b => b.id !== id))
      sonnerToast.success('Beneficiário removido')
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao remover beneficiário')
    }
  }

  const openEditBeneficiary = (b: typeof beneficiaries[0]) => {
    setEditingBeneficiary(b)
    setBeneficiaryForm({ name: b.name, cpf: b.cpf, relationship: b.relationship, percentage: b.percentage, age: b.age || 0 })
  }

  const openAddBeneficiary = () => {
    setEditingBeneficiary(null)
    setBeneficiaryForm({ name: '', cpf: '', relationship: 'spouse', percentage: 0, age: 0 })
    setShowBeneficiaryDialog(true)
  }

  const handleSavePersonal = async () => {
    if (!user?.id) return
    // Task 19-A (deep-fix, round 2): Refuse to save while the form is
    // still hydrating from the GET /api/user/profile. If we allowed the
    // save, the PUT would send address='', city='', state='' (the
    // initial empty defaults for fields not on the Zustand UserData
    // interface), silently WIPING any previously-saved DB values. The
    // Save button is also disabled in the UI, but this guard is the
    // safety net.
    if (profileHydrating) {
      sonnerToast.warning('Aguarde o carregamento dos seus dados antes de salvar.')
      return
    }
    setSaving(true)
    try {
      // Task 19-A: This handler ONLY sends the fields managed by the
      // InlineField section above (name, phone, address, city, state).
      // It deliberately does NOT send the extended personal fields
      // (birthDate, rg, maritalStatus, gender, education, zipCode,
      // sponsorId, qualification) because those are owned by the
      // <PersonalDataSection /> child component, which has its own
      // "Salvar Dados" button and its own draft state. Sending them
      // here would overwrite the child's edits with stale values
      // whenever the user clicks "Salvar Alterações" after editing
      // extended fields via PersonalDataSection. The PUT /api/user/profile
      // route only updates fields that are explicitly present in the
      // request body, so omitting them is safe — they are left untouched
      // in the DB.
      const updated = await apiFetch<any>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user.id,
          name: personalInfo.name,
          phone: personalInfo.phone,
          address: personalInfo.address,
          city: personalInfo.city,
          state: personalInfo.state,
        }),
      })
      // Task 19-A (deep-fix): Update the local personalInfo state from
      // the PUT response so the UI reflects exactly what the server
      // stored. Uses the raw setPersonalInfo (NOT updatePersonalField)
      // so we don't re-mark the section dirty — the user's edits have
      // already been persisted.
      setPersonalInfo((p) => ({
        ...p,
        name: updated.name ?? p.name,
        phone: updated.phone ?? p.phone,
        address: updated.address ?? p.address,
        city: updated.city ?? p.city,
        state: updated.state ?? p.state,
      }))
      // Update the local store with the latest data from the server.
      // Bug #5 fix: also sync address/city/state — previously these were
      // sent in the PUT body but not propagated back to the Zustand store,
      // so the useEffect above would rehydrate them as '' on next mount.
      updateUser({
        name: updated.name ?? personalInfo.name,
        phone: updated.phone ?? personalInfo.phone,
        address: updated.address ?? personalInfo.address,
        city: updated.city ?? personalInfo.city,
        state: updated.state ?? personalInfo.state,
      } as any)
      sonnerToast.success('Dados pessoais salvos com sucesso!')
      toast({
        title: 'Dados atualizados',
        description: 'Suas informações pessoais foram salvas com sucesso.',
      })
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao salvar dados pessoais.')
      toast({
        title: 'Erro ao salvar dados',
        description: err.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmergencyContact = async () => {
    if (!user?.id) return
    // Task 19-A (deep-fix, round 2): Block save while the form is
    // still hydrating (see handleSavePersonal for the full rationale).
    if (profileHydrating) {
      sonnerToast.warning('Aguarde o carregamento dos seus dados antes de salvar.')
      return
    }
    if (!emergencyContact.name || !emergencyContact.phone) {
      sonnerToast.error('Preencha pelo menos o nome e o telefone do contato de emergência.')
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha pelo menos o nome e o telefone do contato de emergência.',
        variant: 'destructive',
      })
      return
    }
    setEmergencySaving(true)
    try {
      const updated = await apiFetch<any>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user.id,
          emergencyName: emergencyContact.name,
          emergencyPhone: emergencyContact.phone,
          emergencyRelation: emergencyContact.relationship || null,
        }),
      })
      // Task 19-A (deep-fix): Sync local state from PUT response.
      setEmergencyContact({
        name: updated.emergencyName ?? emergencyContact.name,
        phone: updated.emergencyPhone ?? emergencyContact.phone,
        relationship: updated.emergencyRelation ?? emergencyContact.relationship,
      })
      // Sync to the user store so the data persists across navigation.
      // These fields are not declared on the UserData interface, so we
      // cast to any — updateUser merges them onto the user object via
      // spread, and the useEffect above reads them back through `as any`.
      updateUser({
        emergencyName: emergencyContact.name,
        emergencyPhone: emergencyContact.phone,
        emergencyRelation: emergencyContact.relationship || null,
      } as any)
      sonnerToast.success('Contato de emergência salvo com sucesso!')
      toast({
        title: 'Contato de emergência salvo',
        description: 'As informações do contato de emergência foram atualizadas com sucesso.',
      })
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao salvar contato de emergência.')
      toast({
        title: 'Erro ao salvar contato',
        description: err.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setEmergencySaving(false)
    }
  }

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) return
    const file = e.target.files?.[0]
    if (!file) return
    // Client-side validation: max 5 MB, must be an image
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5 MB.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Selecione um arquivo de imagem (JPEG, PNG, WebP ou GIF).',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }
    setProfileImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // userId enviado na query string para que getSession() consiga extrair
      // mesmo quando o Content-Type é multipart/form-data (getSession não
      // lê campos de FormData, só query string e JSON body).
      const res = await fetch(`/api/user/profile/image?userId=${user.id}`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erro ${res.status} ao fazer upload`)
      }
      const data = await res.json()
      if (data.profileImage) {
        updateUser({ profileImage: data.profileImage })
        sonnerToast.success('Foto de perfil atualizada com sucesso!')
        toast({
          title: 'Foto atualizada',
          description: 'Sua foto de perfil foi atualizada com sucesso.',
        })
      }
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao enviar foto.')
      toast({
        title: 'Erro ao enviar foto',
        description: err.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setProfileImageUploading(false)
      // Reset the input so the same file can be re-selected later
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = ''
      }
    }
  }

  const handleSaveBank = async () => {
    if (!user?.id) return
    // Task 19-A (deep-fix, round 2): Block save while the form is still
    // hydrating. Without this guard, a save during hydration would send
    // bankCode=null / bankAgency=null / bankAccount=null / pixKey=null
    // (because the form's initial state defaults all of these to '' and
    // the handler coerces '' to null), silently wiping any previously-
    // saved bank details. The Save button is also disabled in the UI
    // while `profileHydrating` is true.
    if (profileHydrating) {
      sonnerToast.warning('Aguarde o carregamento dos seus dados antes de salvar.')
      return
    }
    setSaving(true)
    try {
      const updated = await apiFetch<any>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user.id,
          bankCode: bankInfo.bankCode || null,
          bankAgency: bankInfo.bankAgency || null,
          bankAccount: bankInfo.bankAccount || null,
          bankType: bankInfo.bankType,
          pixKey: bankInfo.pixKey || null,
          pixEnabled: bankInfo.pixEnabled,
        }),
      })
      // Task 19-A (deep-fix): Sync local bankInfo state from PUT response.
      setBankInfo((p) => ({
        ...p,
        bankCode: updated.bankCode ?? p.bankCode,
        bankAgency: updated.bankAgency ?? p.bankAgency,
        bankAccount: updated.bankAccount ?? p.bankAccount,
        bankType: updated.bankType ?? p.bankType,
        pixKey: updated.pixKey ?? p.pixKey,
        pixEnabled: updated.pixEnabled ?? p.pixEnabled,
      }))
      // Update the store with new PIX/bank data
      updateUser({
        pixKey: updated.pixKey ?? bankInfo.pixKey,
        pixEnabled: updated.pixEnabled ?? bankInfo.pixEnabled,
        bankCode: updated.bankCode ?? bankInfo.bankCode,
        bankAgency: updated.bankAgency ?? bankInfo.bankAgency,
        bankAccount: updated.bankAccount ?? bankInfo.bankAccount,
        bankType: updated.bankType ?? bankInfo.bankType,
      })
      sonnerToast.success('Dados bancários salvos com sucesso!')
      toast({
        title: 'Dados bancários atualizados',
        description: 'Suas informações bancárias e chave PIX foram salvas com sucesso.',
      })
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao salvar dados bancários.')
      toast({
        title: 'Erro ao salvar dados',
        description: err.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Bug #4 fix: replace the previous fake `setTimeout` mock with a real
  // PUT /api/user/password call. The API route verifies currentPassword
  // against the stored sha256 hash and writes the new hash on success,
  // returning 401 for an incorrect current password or 500 for server
  // errors. userApi.changePassword throws ApiError on non-2xx so we can
  // surface a precise message to the user.
  const handleChangePassword = async () => {
    if (isImpersonating) {
      toast({
        title: 'Ação bloqueada',
        description: 'Não é possível realizar esta ação enquanto visualiza como outro usuário.',
        variant: 'destructive',
      })
      return
    }
    if (!user?.id) return
    if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      })
      return
    }
    if (passwordInfo.newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'Mínimo 6 caracteres.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      await userApi.changePassword(
        user.id,
        passwordInfo.currentPassword,
        passwordInfo.newPassword,
      )
      sonnerToast.success('Senha alterada com sucesso!')
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      })
      setPasswordInfo({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao alterar senha.'
      sonnerToast.error(msg)
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user?.referralCode || '').then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const memberSince = user?.createdAt ? timeSince(user.createdAt) : '0 dias'
  const memberSinceDate = user?.createdAt ? formatDate(user.createdAt) : ''
  // Career graduation rank (Safira / Rubi / Esmeralda / Diamante /
  // Imperial / Associado) computed from the user's careerPoints.
  // Previously this card showed the plan name (e.g. "Blue 5 Premium")
  // under a "Graduação" label, which was misleading — the plan name is
  // already shown next to the user's name in the header. Now the 4th
  // summary card shows the real career pin.
  const careerRank = getCareerRank(user?.careerPoints ?? 0)

  // Verification status
  const verificationItems = [
    { label: 'E-mail', verified: true, icon: Mail },
    { label: 'Telefone', verified: true, icon: Phone },
    { label: 'Documento', verified: false, icon: Hash },
  ]
  const verifiedCount = verificationItems.filter(v => v.verified).length
  const profileCompletion = Math.round((verifiedCount / verificationItems.length) * 100)

  // Security score for inline indicator
  const securityChecks = [
    { label: 'Senha forte', passed: true },
    { label: '2FA ativado', passed: false },
    { label: 'E-mail verificado', passed: true },
    { label: 'Telefone verificado', passed: true },
  ]
  const securityScore = securityChecks.filter(c => c.passed).length
  const securityTotal = securityChecks.length
  const securityPercentage = (securityScore / securityTotal) * 100
  const securityLevel = securityPercentage >= 75 ? 'secure' : securityPercentage >= 50 ? 'partial' : 'insecure'
  const securityColor = securityLevel === 'secure' ? 'text-emerald-500' : securityLevel === 'partial' ? 'text-amber-500' : 'text-red-500'
  const securityBg = securityLevel === 'secure' ? 'bg-emerald-100 dark:bg-emerald-950/30' : securityLevel === 'partial' ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-red-100 dark:bg-red-950/30'
  const SecurityIcon = securityLevel === 'secure' ? ShieldCheck : securityLevel === 'partial' ? ShieldAlert : ShieldX

  const tabs = [
    { value: 'personal', label: 'Informações Pessoais', shortLabel: 'Pessoal', icon: User },
    { value: 'bank', label: 'Dados Bancários', shortLabel: 'Bancário', icon: Building2 },
    { value: 'beneficiaries', label: 'Beneficiários', shortLabel: 'Beneficiários', icon: Heart },
    { value: 'password', label: 'Alterar Senha', shortLabel: 'Senha', icon: Lock },
    { value: 'security', label: 'Segurança', shortLabel: 'Segurança', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Profile Completion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dados Pessoais</h2>
            <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
          </div>
          {/* Inline Security Score Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${securityBg} border border-border`}>
            <SecurityIcon className={`h-4 w-4 ${securityColor}`} />
            <span className={`text-xs font-semibold ${securityColor}`}>{securityScore}/{securityTotal}</span>
            <span className="text-[10px] text-muted-foreground">Segurança</span>
          </div>
        </div>
        {/* Profile Completion Progress Bar */}
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-foreground">Perfil {profileCompletion}% completo</span>
            </div>
            <div className="flex items-center gap-2">
              {verificationItems.map((item) => {
                const VIcon = item.icon
                return (
                  <span key={item.label} className="flex items-center gap-1 text-[10px]">
                    <VIcon className={`h-3 w-3 ${item.verified ? 'text-emerald-500' : 'text-amber-500'}`} />
                    {item.verified ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <HelpCircle className="h-3 w-3 text-amber-500" />
                    )}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${profileCompletion}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full relative"
            >
              <div className="absolute inset-0 animate-shimmer" />
            </motion.div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {verificationItems.map((item) => (
              <div key={item.label} className={`verification-badge ${item.verified ? 'verified' : 'pending'}`}>
                {item.verified ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Overview Card with enhanced cover */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 animate-gradient-shift h-28 relative">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')\")"
            }} />
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <CardContent className="px-6 pb-6 -mt-14">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="relative group/avatar">
                <Avatar className="h-24 w-24 border-4 border-card shadow-xl">
                  {user?.profileImage ? (
                    <AvatarImage
                      // The `key` forces Radix Avatar to remount whenever
                      // the uploaded URL changes (the backend appends a
                      // `?t=<timestamp>` cache-buster), preventing the
                      // browser from showing a stale image after upload.
                      key={user.profileImage}
                      src={user.profileImage}
                      alt={user?.name || 'Avatar'}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-bold">
                    {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'CS'}
                  </AvatarFallback>
                </Avatar>
                {/* Hidden file input for photo upload */}
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
                <button
                  type="button"
                  onClick={() => profileImageInputRef.current?.click()}
                  disabled={profileImageUploading}
                  title="Alterar foto de perfil"
                  className="absolute inset-0 rounded-full bg-black/0 group-hover/avatar:bg-black/40 transition-colors flex items-center justify-center disabled:cursor-not-allowed"
                >
                  {profileImageUploading ? (
                    <span className="opacity-100 p-2 bg-emerald-600 rounded-full text-white shadow-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover/avatar:opacity-100 transition-opacity p-2 bg-emerald-600 rounded-full text-white shadow-lg hover:bg-emerald-700 flex items-center gap-1">
                      <Camera className="h-4 w-4" />
                    </span>
                  )}
                </button>
                <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5">
                  <div className="bg-emerald-500 rounded-full p-1" title="Conta verificada">
                    <Verified className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-foreground">{user?.name}</h3>
                  <span className="inline-flex items-center gap-0.5 text-emerald-500" title="E-mail verificado">
                    <Mail className="h-3.5 w-3.5" /><Check className="h-2.5 w-2.5" />
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-emerald-500" title="Telefone verificado">
                    <Phone className="h-3.5 w-3.5" /><Check className="h-2.5 w-2.5" />
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-amber-500" title="Documento não verificado">
                    <Hash className="h-3.5 w-3.5" /><HelpCircle className="h-2.5 w-2.5" />
                  </span>
                  <Badge className={user?.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                    <Shield className="h-3 w-3 mr-1" />
                    {user?.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full border border-border">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-medium">Membro desde</span>
                    <span className="text-xs font-bold text-foreground">{memberSinceDate}</span>
                    <span className="text-[10px] text-muted-foreground">({memberSince})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    {getPlanName(user?.plan || 'free')}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${securityBg}`}>
                    <SecurityIcon className={`h-3.5 w-3.5 ${securityColor}`} />
                    <span className={`text-[10px] font-semibold ${securityColor}`}>Segurança {securityScore}/{securityTotal}</span>
                  </span>
                </div>
              </div>
              {user?.plan === 'free' || user?.plan === 'blue3' ? (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  <ArrowUpRight className="h-4 w-4" />
                  Upgrade
                </Button>
              ) : null}
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
                <Users className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-foreground">{referralStats.totalDirect}</p>
                <p className="text-[10px] text-muted-foreground">Indicações Diretas</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5">{user?.careerPoints ?? 0} pontos</p>
              </div>
              <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 text-center border border-teal-100 dark:border-teal-900/50">
                <Award className="h-4 w-4 text-teal-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-foreground">{user?.careerPoints ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Pontos de Carreira</p>
                <p className="text-[9px] text-teal-600 dark:text-teal-400 mt-0.5">{user?.stars ?? 0} estrelas</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center border border-amber-100 dark:border-amber-900/50">
                <Users className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-foreground">{referralStats.totalNetwork}</p>
                <p className="text-[10px] text-muted-foreground">Rede Total</p>
                <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">{referralStats.activeDirect} ativos</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-900/50">
                <Award className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-foreground">{careerRank.name}</p>
                <p className="text-[10px] text-muted-foreground">Graduação</p>
                <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-0.5">
                  {careerRank.stars} ★ · {getPlanName(user?.plan || 'free')}
                </p>
              </div>
            </div>

            {/* Profile Completion Progress Bar */}
            <div className="mt-4 bg-muted/50 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">Completude do Perfil</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{profileCompletion}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full relative"
                >
                  <div className="absolute inset-0 animate-shimmer" />
                </motion.div>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="verification-badge verified">
                  <Check className="h-3 w-3" /> E-mail
                </div>
                <div className="verification-badge verified">
                  <Check className="h-3 w-3" /> Telefone
                </div>
                <div className="verification-badge pending">
                  <HelpCircle className="h-3 w-3" /> Documento
                </div>
              </div>
            </div>

            <div className="mt-4 bg-muted/50 rounded-lg p-3 flex items-center justify-between border border-border">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Código de Indicação:</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{user?.referralCode || 'USER2025'}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopyCode}>
                {copiedCode ? <CheckIcon className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copiedCode ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Score + Connected Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SecurityScore />
        <ConnectedAccounts />
      </div>

      {/* Tabs with sliding underline indicator */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="relative">
          {/* On mobile the TabsList becomes a horizontally-scrollable row
              so ALL 5 tabs (Informações Pessoais / Dados Bancários /
              Beneficiários / Alterar Senha / Segurança) stay accessible
              regardless of screen width. On sm+ it snaps back to a single
              inline row that fits without scrolling. */}
          <TabsList className="flex w-full sm:w-auto sm:inline-flex h-auto bg-transparent p-0 border-b border-border rounded-none overflow-x-auto sm:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 shrink-0 min-h-[44px] data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:font-semibold transition-all hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{tab.shortLabel}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Personal Info Tab with Inline Editable Fields + Emergency Contact */}
        <TabsContent value="personal" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InlineField label="Nome Completo" value={personalInfo.name} onChange={(v) => updatePersonalField('name', v)} icon={User} placeholder="Seu nome completo" />
                  {/* Bug #3 fix: email is editable but never sent in the
                      PUT body of handleSavePersonal (email changes require
                      a verification flow). Disable the field to prevent
                      users from editing a value that would silently be
                      dropped on save. */}
                  <InlineField label="E-mail" value={personalInfo.email} onChange={() => {}} icon={Mail} type="email" disabled />
                  <InlineField label="Telefone" value={personalInfo.phone} onChange={(v) => updatePersonalField('phone', v)} icon={Phone} placeholder="(11) 99999-9999" />
                  <InlineField label="CPF" value={personalInfo.cpf} onChange={() => {}} icon={Shield} disabled />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Para alterar o e-mail, entre em contato com o suporte.
                </p>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <InlineField label="Endereço" value={personalInfo.address} onChange={(v) => updatePersonalField('address', v)} icon={MapPin} placeholder="Rua, número, complemento" />
                  </div>
                  <InlineField label="Cidade" value={personalInfo.city} onChange={(v) => updatePersonalField('city', v)} placeholder="São Paulo" />
                  <InlineField label="Estado" value={personalInfo.state} onChange={(v) => updatePersonalField('state', v)} placeholder="SP" />
                </div>

                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleSavePersonal}
                  disabled={saving || profileHydrating}
                >
                  {saving || profileHydrating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {profileHydrating ? 'Carregando dados...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>

            {/* Emergency Contact Card */}
            <Card className="shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Siren className="h-4 w-4 text-red-500" />
                  Contato de Emergência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Este contato será utilizado em caso de emergência para fins de seguro e segurança.
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InlineField
                    label="Nome do Contato"
                    value={emergencyContact.name}
                    onChange={(v) => updateEmergencyField('name', v)}
                    icon={User}
                    placeholder="Nome completo"
                  />
                  <InlineField
                    label="Telefone"
                    value={emergencyContact.phone}
                    onChange={(v) => updateEmergencyField('phone', v)}
                    icon={Phone}
                    placeholder="(11) 99999-9999"
                  />
                  <InlineField
                    label="Relação"
                    value={emergencyContact.relationship}
                    onChange={(v) => updateEmergencyField('relationship', v)}
                    icon={Heart}
                    placeholder="Cônjuge, pai, irmão..."
                  />
                </div>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={handleSaveEmergencyContact}
                  disabled={emergencySaving || profileHydrating || !emergencyContact.name || !emergencyContact.phone}
                >
                  {emergencySaving || profileHydrating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {profileHydrating ? 'Carregando dados...' : 'Salvar Contato de Emergência'}
                </Button>
              </CardContent>
            </Card>

            {/* Additional Personal Data Section (birthDate, RG, marital status, etc.) */}
            <PersonalDataSection userId={user?.id || ''} />
          </motion.div>
        </TabsContent>

        {/* Bank Info Tab */}
        <TabsContent value="bank" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Dados Bancários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Os dados bancários são usados para saques. Certifique-se de que estão corretos.
                  </p>
                </div>

                {/* PIX Section - Highlighted */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-emerald-600" />
                      <h4 className="text-sm font-bold text-foreground">Chave PIX</h4>
                      {bankInfo.pixKey && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                          <Check className="h-3 w-3 mr-1" />Cadastrada
                        </Badge>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bankInfo.pixEnabled}
                        onChange={(e) => updateBankField('pixEnabled', e.target.checked)}
                        className="accent-emerald-600"
                      />
                      <span className="text-xs text-muted-foreground">PIX ativo</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Chave PIX (CPF, telefone, e-mail ou chave aleatória)</Label>
                    <Input
                      placeholder="Ex: 000.000.000-00, +5511999999999, seu@email.com"
                      value={bankInfo.pixKey}
                      onChange={(e) => updateBankField('pixKey', e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      ⚠️ A chave PIX é <strong>obrigatória</strong> para solicitar saques. Sem ela, você não poderá retirar seus ganhos.
                    </p>
                  </div>
                </div>

                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InlineField label="Banco" value={bankInfo.bankCode} onChange={(v) => updateBankField('bankCode', v)} placeholder="001" />
                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <div className="flex gap-3 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="bankType" value="cc" checked={bankInfo.bankType === 'cc'} onChange={(e) => updateBankField('bankType', e.target.value)} className="accent-emerald-600" />
                        <span className="text-sm">Conta Corrente</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="bankType" value="cp" checked={bankInfo.bankType === 'cp'} onChange={(e) => updateBankField('bankType', e.target.value)} className="accent-emerald-600" />
                        <span className="text-sm">Conta Poupança</span>
                      </label>
                    </div>
                  </div>
                  <InlineField label="Agência" value={bankInfo.bankAgency} onChange={(v) => updateBankField('bankAgency', v)} placeholder="1234" />
                  <InlineField label="Conta" value={bankInfo.bankAccount} onChange={(v) => updateBankField('bankAccount', v)} placeholder="56789-0" />
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleSaveBank} disabled={saving || profileHydrating}>
                  {saving || profileHydrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {profileHydrating ? 'Carregando dados...' : 'Salvar Dados Bancários e PIX'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Beneficiaries Tab - Enhanced with donut chart, age, API connected */}
        <TabsContent value="beneficiaries" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary Card with Donut Chart */}
            <Card className="shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Heart className="h-4 w-4 text-emerald-600" />
                  Beneficiários
                  {beneficiariesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
                    <Users className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-foreground">{beneficiaries.length}</p>
                    <p className="text-[10px] text-muted-foreground">Beneficiários</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
                    <DollarSign className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-foreground">{totalBeneficiaryPercentage}%</p>
                    <p className="text-[10px] text-muted-foreground">Alocado</p>
                  </div>
                  <div className={cn(
                    'rounded-lg p-3 text-center border',
                    remainingBeneficiaryPercentage > 0
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50'
                  )}>
                    <Award className={cn('h-4 w-4 mx-auto mb-1', remainingBeneficiaryPercentage > 0 ? 'text-amber-600' : 'text-emerald-600')} />
                    <p className={cn('text-sm font-bold', remainingBeneficiaryPercentage > 0 ? 'text-amber-600' : 'text-emerald-600')}>{remainingBeneficiaryPercentage}%</p>
                    <p className="text-[10px] text-muted-foreground">Disponível</p>
                  </div>
                </div>

                {/* Donut Chart */}
                {beneficiaries.length > 0 && (
                  <div className="bg-muted/30 rounded-xl p-4 border border-border mb-4">
                    <BeneficiaryDonutChart beneficiaries={beneficiaries} />
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Distribuição</span>
                    <span className="text-xs text-muted-foreground">{totalBeneficiaryPercentage}% de 100%</span>
                  </div>
                  {/* Multi-segment progress bar */}
                  <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                    {beneficiaries.map((b, i) => {
                      const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500']
                      return (
                        <div
                          key={b.id}
                          className={cn('h-full transition-all duration-500', colors[i % colors.length])}
                          style={{ width: `${b.percentage}%` }}
                          title={`${b.name}: ${b.percentage}%`}
                        />
                      )
                    })}
                    {remainingBeneficiaryPercentage > 0 && (
                      <div
                        className="h-full bg-muted-foreground/10"
                        style={{ width: `${remainingBeneficiaryPercentage}%` }}
                      />
                    )}
                  </div>
                </div>

                {remainingBeneficiaryPercentage > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Ainda restam {remainingBeneficiaryPercentage}% para distribuir entre os beneficiários.
                    </p>
                  </div>
                )}

                {totalBeneficiaryPercentage === 100 && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mb-4">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Distribuição completa! Todos os 100% foram alocados.
                    </p>
                  </div>
                )}

                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto"
                  onClick={openAddBeneficiary}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Beneficiário
                </Button>
              </CardContent>
            </Card>

            {/* Beneficiaries List */}
            {beneficiariesLoading ? (
              <Card className="shadow-sm bg-card">
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 text-emerald-600 mx-auto mb-3 animate-spin" />
                  <p className="text-muted-foreground text-sm">Carregando beneficiários...</p>
                </CardContent>
              </Card>
            ) : beneficiaries.length === 0 ? (
              <Card className="shadow-sm bg-card">
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum beneficiário cadastrado</p>
                  <p className="text-muted-foreground text-xs mt-1">Adicione beneficiários para distribuir seus benefícios</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {beneficiaries.map((b, i) => {
                  const relColors = ['bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400']
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                    >
                      <Card className="shadow-sm bg-card hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={cn(
                                'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                                relColors[i % relColors.length].split(' ').slice(0, 1).join(' ')
                              )}>
                                <User className={cn('h-5 w-5', relColors[i % relColors.length].split(' ').slice(1).join(' '))} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-foreground">{b.name}</p>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {relationshipLabels[b.relationship] || b.relationship}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  {b.cpf && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Shield className="h-3 w-3" />
                                      CPF: {b.cpf}
                                    </span>
                                  )}
                                  {b.age && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Cake className="h-3 w-3" />
                                      {b.age} anos
                                    </span>
                                  )}
                                  <Badge className={cn(
                                    'text-[10px] border-0',
                                    b.percentage >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                                  )}>
                                    {b.percentage}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                onClick={() => openEditBeneficiary(b)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDeleteBeneficiary(b.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input
                    type="password"
                    value={passwordInfo.currentPassword}
                    onChange={(e) => setPasswordInfo((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Digite sua senha atual"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nova Senha</Label>
                    <Input
                      type="password"
                      value={passwordInfo.newPassword}
                      onChange={(e) => setPasswordInfo((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Nova Senha</Label>
                    <Input
                      type="password"
                      value={passwordInfo.confirmPassword}
                      onChange={(e) => setPasswordInfo((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>
                {passwordInfo.newPassword && passwordInfo.confirmPassword && passwordInfo.newPassword !== passwordInfo.confirmPassword && (
                  <p className="text-xs text-red-500">As senhas não coincidem</p>
                )}
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleChangePassword} disabled={saving || !passwordInfo.currentPassword || !passwordInfo.newPassword}>
                  {saving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="h-4 w-4" />}
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Beneficiary Add/Edit Dialog - Enhanced with age field */}
      <Dialog open={showBeneficiaryDialog || !!editingBeneficiary} onOpenChange={(open) => { if (!open) { setShowBeneficiaryDialog(false); setEditingBeneficiary(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-emerald-500" />
              {editingBeneficiary ? 'Editar Beneficiário' : 'Novo Beneficiário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Nome do beneficiário"
                value={beneficiaryForm.name}
                onChange={(e) => setBeneficiaryForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={beneficiaryForm.cpf}
                  onChange={(e) => setBeneficiaryForm(p => ({ ...p, cpf: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Cake className="h-3 w-3" />
                  Idade
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="Para seguro"
                  value={beneficiaryForm.age || ''}
                  onChange={(e) => setBeneficiaryForm(p => ({ ...p, age: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-[9px] text-muted-foreground">Necessário para fins de seguro</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Relação</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(relationshipLabels).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBeneficiaryForm(p => ({ ...p, relationship: value }))}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                      beneficiaryForm.relationship === value
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700'
                        : 'border-border text-muted-foreground hover:border-emerald-300 dark:hover:border-emerald-700'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Percentual (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="Ex: 50"
                value={beneficiaryForm.percentage || ''}
                onChange={(e) => setBeneficiaryForm(p => ({ ...p, percentage: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Disponível: {editingBeneficiary
                  ? 100 - beneficiaries.filter(b => b.id !== editingBeneficiary.id).reduce((sum, b) => sum + b.percentage, 0)
                  : remainingBeneficiaryPercentage}%
              </p>
            </div>

            {beneficiaryForm.percentage > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total após salvar:</span>
                  <span className={cn(
                    'font-bold',
                    (editingBeneficiary
                      ? beneficiaries.filter(b => b.id !== editingBeneficiary.id).reduce((sum, b) => sum + b.percentage, 0) + beneficiaryForm.percentage
                      : totalBeneficiaryPercentage + beneficiaryForm.percentage
                    ) > 100 ? 'text-red-500' : 'text-emerald-600'
                  )}>
                    {editingBeneficiary
                      ? beneficiaries.filter(b => b.id !== editingBeneficiary.id).reduce((sum, b) => sum + b.percentage, 0) + beneficiaryForm.percentage
                      : totalBeneficiaryPercentage + beneficiaryForm.percentage
                    }%
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowBeneficiaryDialog(false); setEditingBeneficiary(null) }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={editingBeneficiary ? handleEditBeneficiary : handleAddBeneficiary}
                disabled={!beneficiaryForm.name || beneficiaryForm.percentage <= 0 || beneficiarySaving}
              >
                {beneficiarySaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingBeneficiary ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Tab Content */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Verificação de Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">Progresso de Verificação</span>
                    <span className="text-sm font-bold text-emerald-600">75%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
                      <Mail className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Verificação de E-mail</p>
                      <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                    <Check className="h-3 w-3" /> Verificado
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
                      <Phone className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Verificação de Telefone</p>
                      <p className="text-[10px] text-muted-foreground">{user?.phone || 'Não informado'}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                    <Check className="h-3 w-3" /> Verificado
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/30">
                      <Hash className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Verificação de CPF</p>
                      <p className="text-[10px] text-muted-foreground">{user?.cpf ? `${user.cpf.substring(0, 3)}.***.***-**` : 'Não informado'}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => sonnerToast.info('Verificação de CPF simulada - em produção enviaria para análise')}>
                    <Send className="h-3 w-3" /> Verificar
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
                  try { await userApi.verifyEmail(user?.id || ''); sonnerToast.success('Código de verificação enviado para seu e-mail!') } catch { sonnerToast.error('Erro ao enviar verificação') }
                }}>
                  <Mail className="h-3.5 w-3.5" /> Reenviar verificação e-mail
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
                  try { await userApi.verifyPhone(user?.id || ''); sonnerToast.success('Código SMS enviado para seu telefone!') } catch { sonnerToast.error('Erro ao enviar verificação') }
                }}>
                  <Phone className="h-3.5 w-3.5" /> Reenviar SMS
                </Button>
              </div>
            </CardContent>
          </Card>

          <TwoFactorSetup />
        </motion.div>
      )}
    </div>
  )
}
