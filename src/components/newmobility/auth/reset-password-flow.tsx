'use client'

import { useState } from 'react'
import { authApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock, ArrowLeft, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface ResetPasswordFlowProps {
  onBack: () => void
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: 'Muito fraca', color: 'bg-red-500' }
  if (score === 2) return { level: 2, label: 'Fraca', color: 'bg-orange-500' }
  if (score === 3) return { level: 3, label: 'Razoável', color: 'bg-yellow-500' }
  if (score === 4) return { level: 4, label: 'Forte', color: 'bg-emerald-400' }
  return { level: 5, label: 'Muito forte', color: 'bg-emerald-600' }
}

export function ResetPasswordFlow({ onBack }: ResetPasswordFlowProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'email' | 'code' | 'newPassword' | 'success'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)

  const passwordStrength = getPasswordStrength(newPassword)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const data = await authApi.forgotPassword(email)
      // In development, the API returns the code for testing
      if (data._code) {
        setDevCode(data._code)
      }
      toast.success('Código enviado! Verifique seu email.')
      setStep('code')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar código'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return

    // Just move to the next step - we verify the code when resetting
    setStep('newPassword')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(email, code, newPassword)
      toast.success('Senha redefinida com sucesso!')
      setStep('success')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao redefinir senha'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {step === 'email' && (
          <Card className="shadow-xl border-0 shadow-emerald-100/50 dark:shadow-emerald-900/20 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-center text-foreground">
                Esqueceu a Senha?
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Digite seu email para receber um código de verificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground">{t('auth.login.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : 'Enviar Código'}
                </Button>
              </form>
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-4 mx-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('auth.login.title')}
              </button>
            </CardContent>
          </Card>
        )}

        {step === 'code' && (
          <Card className="shadow-xl border-0 shadow-emerald-100/50 dark:shadow-emerald-900/20 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-center text-foreground flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-600" />
                Verificar Código
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Digite o código de 6 dígitos enviado para {email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devCode && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    🔑 Código (demo): <strong>{devCode}</strong>
                  </p>
                </div>
              )}
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-code" className="text-foreground">Código de Verificação</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                    maxLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={code.length < 6}
                >
                  Verificar
                </Button>
              </form>
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setStep('email')}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar
                </button>
                <button
                  onClick={handleSendCode}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Reenviar código
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'newPassword' && (
          <Card className="shadow-xl border-0 shadow-emerald-100/50 dark:shadow-emerald-900/20 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-center text-foreground">
                Nova Senha
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Crie uma nova senha para sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  {/* Password strength indicator */}
                  {newPassword && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              i < passwordStrength.level ? passwordStrength.color : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        passwordStrength.level <= 2 ? 'text-red-500' :
                        passwordStrength.level <= 3 ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-foreground">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">As senhas não coincidem</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Redefinindo...
                    </span>
                  ) : 'Redefinir Senha'}
                </Button>
              </form>
              <button
                onClick={() => setStep('code')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-4"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="shadow-xl border-0 shadow-emerald-100/50 dark:shadow-emerald-900/20 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-2">Senha Redefinida!</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Sua senha foi alterada com sucesso. Faça login com sua nova senha.
              </p>
              <Button
                onClick={onBack}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Ir para Login
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
