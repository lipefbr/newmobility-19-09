'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore, type UserData } from '@/lib/store'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Eye, EyeOff, Mail, Lock, User, Phone, CreditCard, Users, ArrowLeft, ArrowRight, Check,
  Shield, Sparkles, Gift, Crown, Star, Zap, MessageSquare, ShoppingCart, Gamepad2, Dices, LockKeyhole,
  IdCard,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Phone mask
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

// CPF mask
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

// Password strength
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 20, label: 'Muito fraca', color: 'bg-red-500' }
  if (score === 2) return { score: 40, label: 'Fraca', color: 'bg-orange-500' }
  if (score === 3) return { score: 60, label: 'Razoável', color: 'bg-yellow-500' }
  if (score === 4) return { score: 80, label: 'Boa', color: 'bg-emerald-400' }
  return { score: 100, label: 'Forte', color: 'bg-emerald-600' }
}

const plans = [
  {
    id: 'blue3',
    name: 'Blue 3',
    price: 'R$ 200,00',
    priceValue: 200,
    icon: Star,
    features: [
      { text: 'CashBack Entrada', icon: Shield },
      { text: 'CashBack Residual', icon: Sparkles },
      { text: 'App Mobilidade', icon: Zap },
      { text: 'CashBack Farmácia', icon: Gift },
      { text: 'CashBack Refeição', icon: Gift },
    ],
    color: 'from-emerald-500 to-emerald-600',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    bgSelected: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    id: 'blue5',
    name: 'Blue 5 Premium',
    price: 'R$ 999,00',
    priceValue: 999,
    icon: Crown,
    popular: true,
    features: [
      { text: 'Tudo do Blue 3', icon: Check },
      { text: 'CashBack Vendas', icon: ShoppingCart },
      { text: 'CashBack Shopping', icon: Gift },
      { text: 'Portal Gamer', icon: Gamepad2 },
      { text: 'Portal Sport Bet', icon: Dices },
      { text: 'Gratificações Premium', icon: Sparkles },
    ],
    color: 'from-emerald-600 to-teal-700',
    borderColor: 'border-emerald-400 dark:border-emerald-600',
    bgSelected: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
]

const steps = [
  { key: 'personal', label: 'Dados Pessoais', icon: User },
  { key: 'plan', label: 'Escolha do Plano', icon: Crown },
  { key: 'review', label: 'Revisão', icon: Check },
]

// Qualification options (required field at registration).
// Task 2-e (Item 4): now imported from `@/lib/qualifications` so the
// self-registration dropdown stays in sync with the admin "Editar Usuário"
// dialog and the backoffice "Dados Pessoais" card. The shared constant
// covers the 10 business-relevant qualifications per the client spec:
// Motorista, Entregador, Cliente, Lojista, Mototaxista, Motofretista,
// Motorista de App, Taxista, Caminhoneiro, Outros.
import {
  QUALIFICATION_OPTIONS as qualificationOptions,
  qualificationLabel as getQualificationLabelShared,
} from '@/lib/qualifications'

function getQualificationLabel(value: string): string {
  // Delegate to the shared helper so legacy codes also resolve.
  const label = getQualificationLabelShared(value)
  return label === '—' ? value : label
}

export function RegisterPage() {
  const { setAuthView, login } = useStore()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    plan: 'blue5',
    terms: false,
    qualification: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasReferral, setHasReferral] = useState(false)
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [checkingReferral, setCheckingReferral] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') || params.get('referralCode')
    if (ref) {
      const upper = ref.toUpperCase()
      setFormData(prev => ({ ...prev, referralCode: upper }))
      setHasReferral(true)
      // Item 13: auto-validate the referral code from the URL so the user
      // can advance past step 0 without manually blurring the (disabled)
      // input field. Without this, canGoNext() would block step 0 because
      // referralValid stays null.
      if (upper.length >= 3) {
        // Fire-and-forget; checkReferralCode updates the state.
        fetch(`/api/referrals/validate?code=${encodeURIComponent(upper)}`)
          .then(r => r.json())
          .then(d => setReferralValid(!!d?.valid))
          .catch(() => setReferralValid(null))
      }
    }
  }, [])

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhoneChange = useCallback((value: string) => {
    handleChange('phone', formatPhone(value))
  }, [])

  const handleCPFChange = useCallback((value: string) => {
    handleChange('cpf', formatCPF(value))
  }, [])

  const canGoNext = () => {
    if (step === 0) {
      return (
        formData.name.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.password.length >= 6 &&
        formData.password === formData.confirmPassword &&
        formData.qualification.trim() !== '' &&
        // Item 13 (sponsor validation): a valid sponsor code is required to
        // advance past step 0. Backend (/api/auth/register) also enforces this.
        formData.referralCode.trim().length >= 3 &&
        referralValid === true
      )
    }
    if (step === 1) {
      return formData.plan !== ''
    }
    return formData.terms
  }

  const checkReferralCode = useCallback(async (code: string) => {
    if (!code || code.length < 3) {
      setReferralValid(null)
      return
    }
    setCheckingReferral(true)
    try {
      const res = await fetch(`/api/referrals/validate?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      setReferralValid(!!data.valid)
    } catch {
      setReferralValid(null)
    } finally {
      setCheckingReferral(false)
    }
  }, [])

  const handleSubmit = async () => {
    if (!formData.terms) return
    setLoading(true)

    // Safety timeout: ensure loading is always reset even if the API call never resolves
    const safetyTimer = setTimeout(() => {
      setLoading(false)
      toast.error('A requisição demorou demais. Tente novamente.')
    }, 15_000)

    try {
      const data = await authApi.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cpf: formData.cpf,
        password: formData.password,
        referralCode: formData.referralCode || undefined,
        plan: formData.plan,
        qualification: formData.qualification,
      })
      clearTimeout(safetyTimer)
      if (data.user) {
        // Map API user to UserData with proper zeroed defaults for new accounts
        const userData: UserData = {
          id: data.user.id || '',
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          cpf: data.user.cpf || '',
          plan: data.user.plan || 'free',
          referralCode: data.user.referralCode || '',
          referredById: data.user.referredById || null,
          language: data.user.language || 'pt',
          isActive: data.user.isActive ?? false,
          role: data.user.role || 'user',
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
          isDelivery: false,
          // Persist the qualification code so the sidebar "trava de
          // visualização" (view lock) works immediately after register
          // (without needing a re-login).
          qualification: data.user.qualification || null,
          userType: data.user.userType || 'usuario',
          profileImage: data.user.profileImage || null,
          createdAt: data.user.createdAt || new Date().toISOString(),
          pixKey: null,
          pixEnabled: true,
          bankCode: null,
          bankAgency: null,
          bankAccount: null,
          bankType: null,
          subscriptionStatus: 'none',
          subscriptionDueDate: null,
        }
        setSuccess(true)
        setTimeout(() => {
          login(userData)
          toast.success('Conta criada com sucesso! Bem-vindo(a)!')
        }, 2000)
      }
    } catch (err: unknown) {
      clearTimeout(safetyTimer)
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.'
      toast.error(errorMsg)
    } finally {
      clearTimeout(safetyTimer)
      setLoading(false)
    }
  }

  const pwStrength = getPasswordStrength(formData.password)

  // Success animation
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            >
              <Check className="h-12 w-12 text-emerald-600" />
            </motion.div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            Conta Criada!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground"
          >
            Bem-vindo(a) à NewMobility! Redirecionando...
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6"
          >
            <div className="h-1.5 w-48 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ delay: 1, duration: 1.5, ease: 'easeInOut' }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white font-bold text-xl mb-3 shadow-lg shadow-emerald-600/25">
            NM
          </div>
          <h1 className="text-2xl font-bold text-foreground">NewMobility</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie sua conta e comece agora</p>
        </div>

        {/* Referral welcome banner */}
        <AnimatePresence>
          {hasReferral && step === 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50">
                  <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Você foi convidado!</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Código de indicação: <span className="font-bold">{formData.referralCode}</span></p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="shadow-xl border-0 shadow-emerald-100/50 dark:shadow-emerald-900/20 bg-card">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-xl font-bold text-center">Cadastro</CardTitle>
            <CardDescription className="text-center">
              Preencha seus dados para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-6">
              {steps.map((s, i) => {
                const Icon = s.icon
                const isActive = i === step
                const isCompleted = i < step
                return (
                  <div key={s.key} className="flex-1 flex items-center gap-1">
                    <div className="flex items-center gap-1.5 flex-1">
                      <motion.div
                        animate={{
                          scale: isActive ? 1.1 : 1,
                          backgroundColor: isCompleted ? '#059669' : isActive ? '#10b981' : '#e5e7eb',
                        }}
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                          !isCompleted && !isActive && 'dark:bg-gray-700'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5 text-white" />
                        ) : (
                          <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400')} />
                        )}
                      </motion.div>
                      <div className="hidden sm:block min-w-0">
                        <p className={cn('text-[10px] font-semibold truncate', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                          {s.label}
                        </p>
                      </div>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn('h-px flex-1 min-w-[8px]', i < step ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700')} />
                    )}
                  </div>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Personal Data */}
              {step === 0 && (
                <motion.div
                  key="step-personal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Seu nome completo"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="(11) 99999-9999"
                          value={formData.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="cpf"
                          placeholder="000.000.000-00"
                          value={formData.cpf}
                          onChange={(e) => handleCPFChange(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qualification" className="flex items-center gap-1.5">
                      <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                      Qualificação
                      <span className="text-[10px] text-red-500 font-normal">*</span>
                    </Label>
                    <Select
                      value={formData.qualification}
                      onValueChange={(value) => handleChange('qualification', value)}
                    >
                      <SelectTrigger id="qualification" className="w-full">
                        <SelectValue placeholder="Selecione sua qualificação" />
                      </SelectTrigger>
                      <SelectContent>
                        {qualificationOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!formData.qualification && (
                      <p className="text-[10px] text-muted-foreground">
                        Campo obrigatório. Selecione uma opção para continuar.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Progress value={pwStrength.score} className="h-1.5 flex-1" />
                          <span className={cn(
                            'text-[10px] font-semibold',
                            pwStrength.score <= 40 ? 'text-red-500' : pwStrength.score <= 60 ? 'text-yellow-500' : 'text-emerald-600'
                          )}>
                            {pwStrength.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {[
                            { label: '6+ caracteres', ok: formData.password.length >= 6 },
                            { label: 'Maiúscula', ok: /[A-Z]/.test(formData.password) },
                            { label: 'Número', ok: /[0-9]/.test(formData.password) },
                            { label: 'Especial', ok: /[^A-Za-z0-9]/.test(formData.password) },
                          ].map(req => (
                            <span key={req.label} className={cn('text-[10px]', req.ok ? 'text-emerald-600' : 'text-muted-foreground')}>
                              {req.ok ? '✓' : '○'} {req.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-[10px] text-red-500">As senhas não coincidem</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referral" className="flex items-center gap-1.5">
                      Código de Indicação
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">(obrigatório)</span>
                      {hasReferral && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                          <LockKeyhole className="h-3 w-3" />
                          definido pelo indicador
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="referral"
                        placeholder="Ex: CARLOS2025 ou ADMIN2025"
                        value={formData.referralCode}
                        onChange={(e) => {
                          handleChange('referralCode', e.target.value.toUpperCase())
                          setReferralValid(null)
                        }}
                        onBlur={() => {
                          if (formData.referralCode && formData.referralCode.length >= 3) {
                            checkReferralCode(formData.referralCode)
                          }
                        }}
                        className={cn(
                          "pl-10 uppercase",
                          referralValid === true && "border-emerald-500",
                          referralValid === false && "border-rose-500"
                        )}
                        disabled={hasReferral}
                      />
                      {hasReferral && (
                        <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                      )}
                      {checkingReferral && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                      )}
                      {!checkingReferral && referralValid === true && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    {referralValid === false && !hasReferral && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Código não encontrado. Informe um código de indicação válido para se cadastrar.
                      </p>
                    )}
                    {!formData.referralCode && (
                      <p className="text-[10px] text-muted-foreground">
                        É obrigatório informar quem convidou você. Sem patrocinador, o cadastro não é permitido.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={!canGoNext()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      Próximo
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Plan Selection */}
              {step === 1 && (
                <motion.div
                  key="step-plan"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Escolha seu Plano</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {plans.map((plan) => {
                        const PlanIcon = plan.icon
                        const isSelected = formData.plan === plan.id
                        return (
                          <motion.button
                            key={plan.id}
                            type="button"
                            onClick={() => handleChange('plan', plan.id)}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "relative p-4 rounded-xl border-2 text-left transition-all",
                              isSelected
                                ? `${plan.borderColor} ${plan.bgSelected} shadow-md`
                                : "border-gray-200 dark:border-gray-700 bg-card hover:border-emerald-300 dark:hover:border-emerald-700"
                            )}
                          >
                            {plan.popular && (
                              <span className="absolute -top-2.5 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                POPULAR
                              </span>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={cn('p-1.5 rounded-md bg-gradient-to-br text-white', plan.color)}>
                                  <PlanIcon className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-bold text-sm text-foreground">{plan.name}</span>
                              </div>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                isSelected ? "border-emerald-500 bg-emerald-500" : "border-gray-300 dark:border-gray-600"
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                            <div className="mb-3">
                              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{plan.price}</span>
                              <span className="text-xs text-muted-foreground block">/taxa de uso</span>
                            </div>
                            <ul className="space-y-1.5">
                              {plan.features.map((f, i) => {
                                const FeatureIcon = f.icon
                                return (
                                  <li key={i} className="text-xs text-foreground/80 flex items-center gap-1.5">
                                    <FeatureIcon className="h-3 w-3 text-emerald-500 shrink-0" />
                                    {f.text}
                                  </li>
                                )
                              })}
                            </ul>
                          </motion.button>
                        )
                      })}
                    </div>

                    {/* Comparison hint */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Blue 5 Premium</span> inclui tudo do Blue 3 + CashBack Vendas, Portais Gamer e Sport Bet, e Gratificações Premium.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(0)} className="gap-1.5">
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!canGoNext()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      Próximo
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review */}
              {step === 2 && (
                <motion.div
                  key="step-review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Revise seus Dados</Label>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Nome</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{formData.name}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">E-mail</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{formData.email}</span>
                      </div>
                      {formData.phone && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Telefone</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{formData.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2">
                          <IdCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Qualificação</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {getQualificationLabel(formData.qualification)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Plano</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {plans.find(p => p.id === formData.plan)?.name}
                        </span>
                      </div>
                      {formData.referralCode && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Indicação</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{formData.referralCode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.terms}
                      onCheckedChange={(checked) => handleChange('terms', !!checked)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                      Aceito os <span className="text-emerald-600 font-medium">Termos de Uso</span> e{' '}
                      <span className="text-emerald-600 font-medium">Política de Privacidade</span>
                    </label>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !formData.terms}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Criando conta...
                        </span>
                      ) : (
                        'Criar Conta'
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <button
                  onClick={() => setAuthView('login')}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Entrar
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
