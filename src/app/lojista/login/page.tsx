'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ShieldAlert,
  Car,
  Store,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { UserData } from '@/lib/store'

// ============================================================================
// /lojista/login — Tela de login do Painel do Lojista NewMobility.
// ----------------------------------------------------------------------------
// REGRAS:
//   1. Autentica contra o MESMO backend da plataforma (/api/auth/login).
//      Nenhuma base de usuários paralela.
//   2. Após login bem-sucedido, valida tipo de conta via /api/lojista/me:
//        - userType === 'lojista' OU isDelivery === true → libera /lojista/inicio
//        - cliente / motorista → mostra TELA DE BLOQUEIO in-app
//          (não redireciona para fora; oferece link ao app correto).
//   3. "Criar conta" é a ÚNICA exceção permitida de navegação fora de
//      /lojista — leva ao cadastro do site principal.
//   4. Design: paleta azul #155EEF + branco, mobile-first, safe-area aware.
//      (Mesma identidade visual dos outros apps, com ícone de loja.)
// ============================================================================

const PRIMARY = '#155EEF'

export default function LojistaLoginPage() {
  const router = useRouter()
  const { login, user } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [blockInfo, setBlockInfo] = useState<{
    reason: 'cliente' | 'motorista' | 'outro'
    name: string
  } | null>(null)

  // If already logged in as a lojista, skip straight to home
  useEffect(() => {
    if (user?.id) {
      router.replace('/lojista/inicio')
    }
  }, [user?.id, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Informe e-mail/telefone e senha')
      return
    }
    setLoading(true)
    setBlockInfo(null)
    try {
      // 1. Authenticate against the existing platform backend
      const data = await apiFetch<{
        user: Record<string, unknown>
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!data?.user || !data.user.id) {
        toast.error('Resposta inválida do servidor')
        return
      }

      // 2. Validate lojista-type via /api/lojista/me BEFORE storing the session
      const meResp = await apiFetch<{
        isLojista: boolean
        blockReason: 'cliente' | 'motorista' | 'outro' | null
      }>(`/lojista/me?userId=${data.user.id}`)

      if (!meResp.isLojista) {
        // Non-lojista account → show in-app block screen (do NOT store session)
        setBlockInfo({
          reason: meResp.blockReason || 'outro',
          name: (data.user.name as string) || 'Usuário',
        })
        return
      }

      // 3. Lojista account → store session + go to home
      login(data.user as unknown as UserData)
      toast.success(`Bem-vindo, ${(data.user.name as string)?.split(' ')[0] || 'lojista'}!`)
      router.push('/lojista/inicio')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  // ── Block screen (cliente / motorista) ─────────────────────────────────────
  if (blockInfo) {
    return (
      <AccountBlockScreen
        reason={blockInfo.reason}
        name={blockInfo.name}
        onBack={() => setBlockInfo(null)}
      />
    )
  }

  // ── Login form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div style={{ height: 'env(safe-area-inset-top)' }} />

      {/* Blue header zone */}
      <div
        className="px-6 pt-12 pb-20 relative"
        style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, #0B4FE0 100%)` }}
      >
        <div className="flex flex-col items-center text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm mb-4 shadow-lg">
            <Store className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">NewMobility</h1>
          <p className="text-sm text-white/75 mt-1">Painel do Lojista</p>
        </div>
      </div>

      {/* Login card overlapping the header — needs relative z-10 to paint
          ABOVE the header (which has `relative`). Without this, the header
          covers the top of the card and clips the "Entrar" title. */}
      <div className="flex-1 px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Entrar</h2>
          <p className="text-xs text-gray-500 mb-5">
            Use sua conta de lojista NewMobility
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-gray-700">
                E-mail ou telefone
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent disabled:opacity-60"
                  style={{ caretColor: PRIMARY }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-gray-700">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full h-12 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent disabled:opacity-60"
                  style={{ caretColor: PRIMARY }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <a
                href="/lojista/login"
                className="text-xs font-medium hover:underline"
                style={{ color: PRIMARY }}
              >
                Esqueci minha senha
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-md hover:shadow-lg active:scale-[0.99]"
              style={{ backgroundColor: PRIMARY }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Create account — ONLY exception allowed outside /lojista */}
          <a
            href="/"
            className="w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <User className="h-4 w-4" />
            Criar conta
          </a>

          {/* Demo credentials — lojista */}
          <div className="mt-4 p-3 rounded-xl border border-amber-100 bg-amber-50/60">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-flex items-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Demo
              </span>
              <p className="text-[11px] font-semibold text-gray-700">
                Conta de lojista para teste
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <Mail className="h-3 w-3" />
              <span className="font-mono">lojista@newmobility.com</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-600">
              <Lock className="h-3 w-3" />
              <span className="font-mono">123456</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('lojista@newmobility.com')
                setPassword('123456')
              }}
              className="mt-2 w-full h-9 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
              style={{ backgroundColor: PRIMARY }}
            >
              Preencher automaticamente
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-6 px-4 leading-relaxed">
          Ao continuar você concorda com os Termos de Uso e a Política de
          Privacidade da NewMobility.
        </p>
      </div>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AccountBlockScreen — shown when a cliente/motorista tries to log in here.
// Stays 100% inside /lojista. Offers a link to the correct app (/mobile/login
// for clientes, /motorista/login for motoristas) so the user is never stranded.
// ─────────────────────────────────────────────────────────────────────────────
function AccountBlockScreen({
  reason,
  name,
  onBack,
}: {
  reason: 'cliente' | 'motorista' | 'outro'
  name: string
  onBack: () => void
}) {
  const router = useRouter()
  const PROFILE_MAP: Record<
    string,
    {
      title: string
      icon: typeof Store
      color: string
      description: string
      correctAppHref?: string
      correctAppLabel?: string
    }
  > = {
    cliente: {
      title: 'Conta de Cliente',
      icon: User,
      color: '#155EEF',
      description:
        'Este painel é exclusivo para lojistas parceiros. Use o app do Cliente NewMobility para fazer pedidos e acompanhar entregas.',
      correctAppHref: '/mobile/login',
      correctAppLabel: 'Ir para o app do Cliente',
    },
    motorista: {
      title: 'Conta de Motorista',
      icon: Car,
      color: '#F59E0B',
      description:
        'Este painel é exclusivo para lojistas parceiros. Use o app do Motorista NewMobility para aceitar corridas e entregas.',
      correctAppHref: '/motorista/login',
      correctAppLabel: 'Ir para o app do Motorista',
    },
    outro: {
      title: 'Tipo de conta não compatível',
      icon: ShieldAlert,
      color: '#EF4444',
      description:
        'Este painel é exclusivo para lojistas parceiros. Seu tipo de conta não tem permissão de acesso aqui. Contate o suporte para mais informações.',
    },
  }

  const info = PROFILE_MAP[reason] || PROFILE_MAP.outro
  const Icon = info.icon

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div style={{ height: 'env(safe-area-inset-top)' }} />

      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{ background: `linear-gradient(180deg, ${info.color}08 0%, #FFFFFF 60%)` }}
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full mb-6 shadow-sm"
          style={{ backgroundColor: info.color + '15' }}
        >
          <Icon className="h-11 w-11" style={{ color: info.color }} strokeWidth={2} />
        </div>

        <div className="text-center max-w-sm">
          <p className="text-sm text-gray-500 mb-1">Olá, {name.split(' ')[0]}</p>
          <h1 className="text-xl font-bold text-gray-900 mb-3">{info.title}</h1>
          <p className="text-sm text-gray-600 leading-relaxed">{info.description}</p>
        </div>

        <div
          className="mt-8 w-full max-w-sm rounded-xl border p-4 flex items-start gap-3"
          style={{ borderColor: info.color + '30', backgroundColor: info.color + '08' }}
        >
          <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: info.color }} />
          <div>
            <p className="text-xs font-semibold text-gray-900">Acesso bloqueado</p>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
              Você foi autenticado com sucesso, mas este perfil não pode usar
              o painel do Lojista.
            </p>
          </div>
        </div>

        {/* CTA to the correct app (if applicable) */}
        {info.correctAppHref && info.correctAppLabel && (
          <button
            onClick={() => router.push(info.correctAppHref!)}
            className="mt-4 w-full max-w-sm h-12 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
            style={{ backgroundColor: info.color }}
          >
            {info.correctAppLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Back to login */}
        <button
          onClick={onBack}
          className="mt-3 w-full max-w-sm h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          Voltar ao login
        </button>
      </div>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
