'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Mail, Lock, ShieldCheck, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { UserData } from '@/lib/store'

// /admingeral/login — Painel Admin Geral (app-side admin).
// Authenticates against the same /api/auth/login, then validates that the
// user has role='admin' OR userType='admin' via /api/admingeral/me.

const PRIMARY = '#0F172A' // slate-900 — distinct from the blue app palette

export default function AdmingeralLoginPage() {
  const router = useRouter()
  const { login, user } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.id) {
      // Validate admin status before redirecting
      apiFetch<{ isAppAdmin: boolean }>(`/admingeral/me?userId=${user.id}`)
        .then((r) => {
          if (r.isAppAdmin) router.replace('/admingeral/inicio')
        })
        .catch(() => {})
    }
  }, [user?.id, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Informe e-mail e senha')
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch<{ user: Record<string, unknown> }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!data?.user?.id) {
        toast.error('Resposta inválida do servidor')
        return
      }
      // Validate admin via /api/admingeral/me BEFORE storing session
      const meResp = await apiFetch<{ isAppAdmin: boolean }>(`/admingeral/me?userId=${data.user.id}`)
      if (!meResp.isAppAdmin) {
        toast.error('Acesso negado. Esta conta não tem permissão de administrador.')
        return
      }
      login(data.user as unknown as UserData)
      toast.success('Bem-vindo ao painel Admin Geral')
      router.push('/admingeral/inicio')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4 shadow-lg"
              style={{ backgroundColor: PRIMARY }}
            >
              <ShieldCheck className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Geral</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestão do ecossistema de apps NewMobility
            </p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@newmobility.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full h-12 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 focus:border-transparent disabled:opacity-60"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full h-12 pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 focus:border-transparent disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
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
                  <>
                    Acessar painel
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials — admin */}
            <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="inline-flex items-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Admin
                </span>
                <p className="text-[11px] font-semibold text-slate-700">
                  Conta de administrador para teste
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <Mail className="h-3 w-3" />
                <span className="font-mono">admin@newmobility.com</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                <Lock className="h-3 w-3" />
                <span className="font-mono">admin123</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@newmobility.com')
                  setPassword('admin123')
                }}
                className="mt-2 w-full h-9 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
                style={{ backgroundColor: PRIMARY }}
              >
                Preencher automaticamente
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-6 px-4 leading-relaxed">
            Acesso restrito a administradores. Contas de cliente, motorista e
            lojista não podem acessar este painel.
          </p>
        </div>
      </div>
    </div>
  )
}
