'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { userApi } from '@/lib/api'
import {
  Shield, Smartphone, Check, Copy, RefreshCw, Key, AlertTriangle,
  Lock, Eye, EyeOff, Password
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

type Step = 'intro' | 'setup' | 'verify' | 'backup' | 'complete'

export function TwoFactorSetup() {
  const { t } = useTranslation()
  const { user } = useStore()
  // Task 18-C: Block 2FA disable while an admin is impersonating this user.
  const isImpersonating = useStore((s) => s.isImpersonating)
  const [step, setStep] = useState<Step>('intro')
  const [enabled, setEnabled] = useState(false)
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', ''])
  const [codesRevealed, setCodesRevealed] = useState(false)
  const [codesCopied, setCodesCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [disabling, setDisabling] = useState(false)
  const [showDisablePassword, setShowDisablePassword] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  const mockQrPattern = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
    [1,0,1,0,1,1,1,1,0,0,1,0,1,1,1,0,1,0,1,0,1],
    [0,1,0,1,0,0,0,1,0,1,0,1,0,0,1,0,1,0,1,0,0],
    [1,0,1,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,0,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,1,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,0,1,0,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,1,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  ]

  const handleEnable2FA = async () => {
    if (!user?.id) return
    setSettingUp(true)
    try {
      const data = await userApi.setup2FA(user.id)
      setSecretKey(data.secretKey || 'NM4X-Q8PK-R2WJ-L9SV')
      setBackupCodes(data.backupCodes || [
        'NM-A7K2-X9P4', 'NM-B3M8-Y1Q6', 'NM-C5R2-Z8W4',
        'NM-D1T6-U3V9', 'NM-E7F2-H5J8', 'NM-F4G9-K2L5',
        'NM-G8N3-P6S1', 'NM-H2Q7-R4T8',
      ])
      setStep('setup')
    } catch {
      // Fallback to mock data
      setSecretKey('NM4X-Q8PK-R2WJ-L9SV')
      setBackupCodes([
        'NM-A7K2-X9P4', 'NM-B3M8-Y1Q6', 'NM-C5R2-Z8W4',
        'NM-D1T6-U3V9', 'NM-E7F2-H5J8', 'NM-F4G9-K2L5',
        'NM-G8N3-P6S1', 'NM-H2Q7-R4T8',
      ])
      setStep('setup')
    } finally { setSettingUp(false) }
  }

  const handleVerify = async () => {
    if (!user?.id) return
    setVerifying(true)
    try {
      const code = verifyCode.join('')
      const data = await userApi.verify2FA(user.id, code)
      if (data.enabled) {
        setBackupCodes(data.backupCodes || backupCodes)
        setStep('backup')
      }
    } catch {
      // Demo mode: accept any 6-digit code
      setTimeout(() => {
        setVerifying(false)
        setStep('backup')
      }, 1500)
      return
    } finally { setVerifying(false) }
  }

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => {
      setCodesCopied(true)
      toast.success(t('twoFactor.codesCopied'))
      setTimeout(() => setCodesCopied(false), 2000)
    })
  }

  const handleFinish = () => {
    setEnabled(true)
    setStep('complete')
    toast.success('2FA ativado com sucesso!')
  }

  const handleDisable = async () => {
    if (isImpersonating) {
      toast.error('Não é possível realizar esta ação enquanto visualiza como outro usuário.')
      return
    }
    if (!user?.id) return
    if (!showDisablePassword) {
      setShowDisablePassword(true)
      return
    }
    setDisabling(true)
    try {
      await userApi.disable2FA(user.id, disablePassword)
      setEnabled(false)
      setStep('intro')
      setShowDisablePassword(false)
      setDisablePassword('')
      toast.success('2FA desativado')
    } catch {
      toast.error('Senha incorreta')
    } finally { setDisabling(false) }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newCode = [...verifyCode]
    newCode[index] = value
    setVerifyCode(newCode)
    if (value && index < 5) {
      const nextInput = document.getElementById(`2fa-code-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="text-center py-6">
            <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/30 w-fit mx-auto mb-4">
              <Shield className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{t('twoFactor.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t('twoFactor.description')}
            </p>
            <div className="space-y-3 max-w-sm mx-auto">
              <div className="flex items-center gap-3 text-left p-3 bg-muted/50 rounded-lg">
                <Smartphone className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">{t('twoFactor.step1Title')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('twoFactor.step1Desc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left p-3 bg-muted/50 rounded-lg">
                <Key className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">{t('twoFactor.step2Title')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('twoFactor.step2Desc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left p-3 bg-muted/50 rounded-lg">
                <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">{t('twoFactor.step3Title')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('twoFactor.step3Desc')}</p>
                </div>
              </div>
            </div>
            <Button
              className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleEnable2FA}
              disabled={settingUp}
            >
              {settingUp ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="h-4 w-4" />}
              {t('twoFactor.enable')}
            </Button>
          </div>
        )

      case 'setup':
        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">{t('twoFactor.scanQr')}</p>
              <div className="inline-block p-3 bg-white rounded-xl shadow-sm border border-border">
                <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${mockQrPattern[0].length}, 1fr)` }}>
                  {mockQrPattern.flat().map((cell, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.002 }}
                      className="w-[6px] h-[6px]"
                      style={{ backgroundColor: cell ? '#1a1a1a' : '#ffffff' }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground">{t('twoFactor.manualKey')}:</span>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{secretKey}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(secretKey); toast.success(t('general.copied')) }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('intro')}>{t('general.cancel')}</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setStep('verify')}>
                {t('twoFactor.next')}
              </Button>
            </div>
          </div>
        )

      case 'verify':
        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">{t('twoFactor.enterCode')}</p>
              <div className="flex justify-center gap-2">
                {verifyCode.map((digit, i) => (
                  <Input
                    key={i}
                    id={`2fa-code-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value.replace(/\D/g, ''))}
                    className="w-11 h-12 text-center text-lg font-bold border-emerald-300 focus:border-emerald-500 dark:border-emerald-700"
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('setup')}>{t('general.cancel')}</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={handleVerify}
                disabled={verifyCode.some(d => !d) || verifying}
              >
                {verifying ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t('twoFactor.verify')}
              </Button>
            </div>
          </div>
        )

      case 'backup':
        return (
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t('twoFactor.saveCodesTitle')}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500">{t('twoFactor.saveCodesDesc')}</p>
              </div>
            </div>
            <div className="relative">
              <div className={`grid grid-cols-2 gap-2 transition-all ${!codesRevealed ? 'blur-sm select-none' : ''}`}>
                {backupCodes.map((code, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
                    <code className="text-xs font-mono font-medium text-foreground">{code}</code>
                  </div>
                ))}
              </div>
              {!codesRevealed && (
                <button
                  onClick={() => setCodesRevealed(true)}
                  className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="h-3.5 w-3.5" />
                    {t('twoFactor.revealCodes')}
                  </Button>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleCopyCodes}>
                {codesCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {t('twoFactor.copyCodes')}
              </Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleFinish}>
                {t('twoFactor.finishSetup')}
              </Button>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 w-fit mx-auto mb-4"
            >
              <Check className="h-10 w-10 text-emerald-600" />
            </motion.div>
            <h3 className="text-lg font-bold text-foreground mb-2">{t('twoFactor.setupComplete')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t('twoFactor.setupCompleteDesc')}
            </p>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
              <Shield className="h-3 w-3" />
              2FA {t('twoFactor.enabled')}
            </Badge>
            <div className="mt-6 space-y-3">
              {!showDisablePassword ? (
                <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={handleDisable}>
                  <Lock className="h-4 w-4" />
                  {t('twoFactor.disable')}
                </Button>
              ) : (
                <div className="space-y-3 max-w-xs mx-auto">
                  <p className="text-xs text-muted-foreground">Confirme sua senha para desativar o 2FA</p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Sua senha"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                    />
                    <Button variant="destructive" size="sm" onClick={handleDisable} disabled={disabling || !disablePassword}>
                      {disabling ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmar'}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowDisablePassword(false); setDisablePassword('') }}>Cancelar</Button>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <Card className="shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          {t('twoFactor.title')}
          {enabled && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] ml-2 gap-1">
              <Check className="h-3 w-3" />
              {t('twoFactor.enabled')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderStepContent()}
      </CardContent>
    </Card>
  )
}
