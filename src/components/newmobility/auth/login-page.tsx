'use client'

import { useState, useEffect } from 'react'
import { useStore, type UserData } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, Mail, Lock, ArrowRight, DollarSign, TrendingUp, Users, Smartphone, Apple, Shield, Fingerprint, Globe, Lock as LockIcon, Zap, ChevronRight, Car, Store, LayoutDashboard, User as UserIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'
import { ResetPasswordFlow } from './reset-password-flow'

function mapApiUserToUserData(apiUser: Record<string, unknown>, balances?: Record<string, number>): UserData {
  return {
    id: apiUser.id as string,
    name: (apiUser.name as string) || '',
    email: (apiUser.email as string) || '',
    phone: (apiUser.phone as string) || '',
    cpf: (apiUser.cpf as string) || '',
    plan: (apiUser.plan as string) || 'free',
    referralCode: (apiUser.referralCode as string) || '',
    referredById: (apiUser.referredById as string | null) || null,
    language: (apiUser.language as string) || 'pt',
    isActive: (apiUser.isActive as boolean) ?? true,
    balanceWithdrawal: balances?.withdrawal ?? (apiUser.balanceWithdrawal as number) ?? 0,
    balanceMobility: balances?.mobility ?? (apiUser.balanceMobility as number) ?? 0,
    balanceShopping: balances?.shopping ?? (apiUser.balanceShopping as number) ?? 0,
    balanceFood: balances?.food ?? (apiUser.balanceFood as number) ?? 0,
    balancePharmacy: balances?.pharmacy ?? (apiUser.balancePharmacy as number) ?? 0,
    balanceGratification: balances?.gratification ?? (apiUser.balanceGratification as number) ?? 0,
    balancePaymentInvoice: balances?.paymentInvoice ?? (apiUser.balancePaymentInvoice as number) ?? 0,
    balanceFree: balances?.free ?? (apiUser.balanceFree as number) ?? 0,
    balancePending: balances?.pending ?? (apiUser.balancePending as number) ?? 0,
    careerPoints: (apiUser.careerPoints as number) ?? 0,
    personalPoints: (apiUser.personalPoints as number) ?? 0,
    stars: (apiUser.stars as number) ?? 0,
    isDriver: (apiUser.isDriver as boolean) ?? false,
    isDelivery: (apiUser.isDelivery as boolean) ?? false,
    // ADM-USERTYPE — qualification code persisted on User.qualification.
    // Critical for the sidebar "trava de visualização" (view lock) so the
    // correct menus show up for each category (motorista/entregador see
    // Metas, lojista sees Portal do Lojista, etc.).
    qualification: (apiUser.qualification as string | null) ?? null,
    role: (apiUser.role as string) || 'user',
    userType: (apiUser.userType as 'usuario' | 'lojista' | 'motorista') ?? 'usuario',
    profileImage: (apiUser.profileImage as string | null) || null,
    createdAt: (apiUser.createdAt as string) || new Date().toISOString(),
    // Bank / PIX
    pixKey: (apiUser.pixKey as string | null) || null,
    pixEnabled: (apiUser.pixEnabled as boolean) ?? true,
    bankCode: (apiUser.bankCode as string | null) || null,
    bankAgency: (apiUser.bankAgency as string | null) || null,
    bankAccount: (apiUser.bankAccount as string | null) || null,
    bankType: (apiUser.bankType as string | null) || null,
    // Subscription (defaults to 'none' for free plan, 'active' otherwise)
    subscriptionStatus: (apiUser.subscriptionStatus as 'active' | 'pending' | 'overdue' | 'none') || (apiUser.plan === 'free' ? 'none' : 'active'),
    subscriptionDueDate: (apiUser.subscriptionDueDate as string | null) || null,
  }
}

export function LoginPage() {
  const { setAuthView, login, setActivePage } = useStore()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  const handleLogin = async (emailArg: string, passwordArg: string, isAdmin = false) => {
    setLoading(true)

    // Safety timeout: ensure loading is always reset even if the API call never resolves
    const safetyTimer = setTimeout(() => {
      setLoading(false)
      toast.error('A requisição demorou demais. Tente novamente.')
    }, 15_000)

    try {
      const data = await authApi.login(emailArg, passwordArg)
      clearTimeout(safetyTimer)
      if (data.user) {
        const userData = mapApiUserToUserData(data.user, data.balances)
        // Login na pagina principal (/) SEMPRE fica no backoffice web.
        // Nao redireciona para /mobile/inicio (isso so acontece quando
        // o login e feito pelo /mobile/login). Nao redireciona para
        // /admingeral/inicio (o admin usa o painel admin integrado em /).
        // Apos o login, o componente page.tsx detecta user.role === 'admin'
        // e renderiza o AdminLayout automaticamente.
        login(userData)
        if (isAdmin) {
          setTimeout(() => {
            useStore.getState().setActivePage('admin')
          }, 100)
        }
        toast.success(t('auth.login.success'))
      }
    } catch (err: unknown) {
      clearTimeout(safetyTimer)
      const errorMsg = err instanceof Error ? err.message : t('auth.login.error')
      toast.error(errorMsg)
    } finally {
      clearTimeout(safetyTimer)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    await handleLogin(email, password)
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gray-50">
      {/* LEFT PANEL - Desktop only - Green accent */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative bg-emerald-700">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900" />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')]" />

        <div className="w-full flex flex-col justify-center items-center px-12 xl:px-20 relative z-10">
          <div className="relative z-10 max-w-md">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-10"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white text-emerald-700 font-bold text-3xl mb-6 shadow-xl">
                NM
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">NewMobility</h1>
              <p className="text-emerald-200 text-lg font-light">
                Conectando pessoas, transformando vidas
              </p>
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-4 mb-10"
            >
              {[
                { icon: DollarSign, title: 'CashBack Multi-Nível', desc: 'Ganhe em até 9 níveis da sua rede' },
                { icon: TrendingUp, title: 'Plano de Carreira', desc: 'Evolua e desbloqueie gratificações exclusivas' },
                { icon: Users, title: 'Rede de Indicações', desc: 'Compartilhe e construa sua renda residual' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.15 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="p-3 rounded-xl bg-white/20 border border-white/20 group-hover:bg-white/30 transition-colors shrink-0">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{feature.title}</h3>
                    <p className="text-emerald-200 text-xs mt-0.5">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* App download links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex gap-3"
            >
              <button className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 hover:bg-white/25 transition-colors">
                <Smartphone className="h-5 w-5 text-white" />
                <div className="text-left">
                  <p className="text-[9px] text-emerald-200 uppercase">Download na</p>
                  <p className="text-xs text-white font-semibold -mt-0.5">Google Play</p>
                </div>
              </button>
              <button className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 hover:bg-white/25 transition-colors">
                <Apple className="h-5 w-5 text-white" />
                <div className="text-left">
                  <p className="text-[9px] text-emerald-200 uppercase">Download na</p>
                  <p className="text-xs text-white font-semibold -mt-0.5">App Store</p>
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Login form - White/Light background */}
      <div className="w-full lg:w-[55%] xl:w-[50%] flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Logo on mobile */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white font-bold text-2xl mb-4 shadow-lg"
            >
              NM
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">NewMobility</h1>
            <p className="text-sm text-gray-500 mt-1">BackOffice - Área do Membro</p>
          </div>

        {showResetPassword ? (
          <ResetPasswordFlow onBack={() => setShowResetPassword(false)} />
        ) : (
          <Card className="shadow-lg border border-gray-200 bg-white">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-center text-gray-900">{t('auth.login.title')}</CardTitle>
              <CardDescription className="text-center text-gray-500">
                {t('auth.login.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.login.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/30"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">{t('auth.login.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                      {t('auth.login.remember')}
                    </label>
                  </div>
                  <button type="button" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium" onClick={() => setShowResetPassword(true)}>
                    {t('auth.login.forgot')}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('auth.login.entering')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t('auth.login.submit')}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Social login buttons */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">ou continue com</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 h-10 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => toast.info('Login com Google em breve!')}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="text-sm">Google</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 h-10 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => toast.info('Login com Apple em breve!')}
                  >
                    <Apple className="h-4 w-4" />
                    <span className="text-sm">Apple</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 h-10 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                    onClick={() => toast.info('Login com biometria em breve!')}
                  >
                    <Fingerprint className="h-4 w-4" />
                    <span className="text-sm">Biometria</span>
                  </Button>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {t('auth.login.noAccount')}{' '}
                  <button
                    onClick={() => setAuthView('register')}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    {t('auth.login.register')}
                  </button>
                </p>
              </div>

              {/* Demo credentials */}
              <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 border-0">DEMO</Badge>
                    <p className="text-sm text-gray-800 font-semibold">🔑 Acesso de Demonstração</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span className="font-mono">cliente@newmobility.com</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                  <Lock className="h-3 w-3" />
                  <span className="font-mono">123456</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  onClick={() => handleLogin('cliente@newmobility.com', '123456')}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      Acesso Rápido Demo
                    </span>
                  )}
                </Button>
              </div>

              {/* Admin demo credentials */}
              <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600 text-white text-[10px] px-2 py-0.5 border-0">ADMIN</Badge>
                    <p className="text-sm text-gray-800 font-semibold flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-amber-600" />
                      Acesso Administrador
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span className="font-mono">admin@newmobility.com</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                  <Lock className="h-3 w-3" />
                  <span className="font-mono">admin123</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  onClick={() => handleLogin('admin@newmobility.com', 'admin123', true)}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Entrar como Admin
                    </span>
                  )}
                </Button>
              </div>

              {/* Quick access to ecosystem apps */}
              <div className="mt-5 pt-5 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 text-center">
                  Acessar outros painéis
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/mobile/login"
                    className="group flex items-center gap-2 p-3 rounded-lg border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50 transition-all"
                  >
                    <div className="p-1.5 rounded-md bg-sky-100 text-sky-600 group-hover:scale-110 transition-transform">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">App Cliente</p>
                      <p className="text-[10px] text-gray-500 truncate">Passageiro / usuário</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-sky-600" />
                  </Link>
                  <Link
                    href="/motorista/login"
                    className="group flex items-center gap-2 p-3 rounded-lg border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                  >
                    <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                      <Car className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">App Motorista</p>
                      <p className="text-[10px] text-gray-500 truncate">Condutor parceiro</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-emerald-600" />
                  </Link>
                  <Link
                    href="/lojista/login"
                    className="group flex items-center gap-2 p-3 rounded-lg border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all"
                  >
                    <div className="p-1.5 rounded-md bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">Painel Lojista</p>
                      <p className="text-[10px] text-gray-500 truncate">Comerciante</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-amber-600" />
                  </Link>
                  <Link
                    href="/admingeral/login"
                    className="group flex items-center gap-2 p-3 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all"
                  >
                    <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 group-hover:scale-110 transition-transform">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">Admin Geral</p>
                      <p className="text-[10px] text-gray-500 truncate">Gestão do app</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-slate-700" />
                  </Link>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1.5 border border-gray-200">
                  <LockIcon className="h-3 w-3 text-emerald-600" />
                  <span className="text-[10px] font-medium text-gray-700">Dados Seguros</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1.5 border border-gray-200">
                  <Globe className="h-3 w-3 text-emerald-600" />
                  <span className="text-[10px] font-medium text-gray-700">Criptografia 128-bit</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1.5 border border-gray-200">
                  <Users className="h-3 w-3 text-emerald-600" />
                  <span className="text-[10px] font-medium text-gray-700">+10.000 Membros</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

          <p className="text-center text-xs text-gray-400 mt-6">
            {t('footer.copyright').replace('2025', String(new Date().getFullYear()))}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
