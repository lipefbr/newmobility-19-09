'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { Building2, Save, CreditCard, Shield, Loader2, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'

/**
 * "Acesso ao Banco" page (BACK-3 fix).
 *
 * Previously this page rendered hardcoded bank data (Banco do Brasil,
 * agência 1234-5, conta 67890-1) and the "Atualizar Dados Bancários" button
 * had no onClick handler. Now:
 *
 *   1. On mount we fetch the user's real profile (GET /api/user/profile) and
 *      hydrate the form with their saved bankCode / bankAgency / bankAccount /
 *      bankType / pixKey / pixEnabled values (falling back to the in-memory
 *      Zustand user when the network call fails).
 *   2. The fields are editable inputs bound to local state.
 *   3. The "Atualizar Dados Bancários" button PUTs the form to
 *      /api/user/profile (which already supports bankCode/bankAgency/
 *      bankAccount/bankType/pixKey/pixEnabled).
 *   4. Success / error toasts are shown via sonner.
 *   5. The Zustand user store is updated after a successful save so other
 *      pages reflect the new bank info immediately.
 *
 * bankType uses 'cc' (Conta Corrente) / 'cp' (Conta Poupança) to match the
 * profile API contract.
 */
export function BankPage() {
  const { user, updateUser } = useStore()

  const [bankCode, setBankCode] = useState('')
  const [bankAgency, setBankAgency] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankType, setBankType] = useState<'cc' | 'cp'>('cc')
  const [pixKey, setPixKey] = useState('')
  const [pixEnabled, setPixEnabled] = useState<boolean>(false)

  const [hydrating, setHydrating] = useState(true)
  const [saving, setSaving] = useState(false)

  /**
   * Populate the form from either the API response (canonical) or the
   * Zustand in-memory user (fallback when the API is unreachable).
   */
  const hydrateFrom = useCallback(
    (profile: {
      bankCode?: string | null
      bankAgency?: string | null
      bankAccount?: string | null
      bankType?: string | null
      pixKey?: string | null
      pixEnabled?: boolean | null
    }) => {
      setBankCode(profile.bankCode ?? '')
      setBankAgency(profile.bankAgency ?? '')
      setBankAccount(profile.bankAccount ?? '')
      setBankType(profile.bankType === 'cp' ? 'cp' : 'cc')
      setPixKey(profile.pixKey ?? '')
      setPixEnabled(Boolean(profile.pixEnabled))
    },
    []
  )

  useEffect(() => {
    if (!user?.id) {
      setHydrating(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const profile = await apiFetch<any>(`/user/profile?userId=${user.id}`)
        if (cancelled) return
        hydrateFrom(profile ?? {})
      } catch (err) {
        // Fall back to whatever the Zustand store already has so the form
        // is still editable (the user can save to overwrite the API).
        if (!cancelled) {
          hydrateFrom({
            bankCode: user.bankCode ?? null,
            bankAgency: user.bankAgency ?? null,
            bankAccount: user.bankAccount ?? null,
            bankType: user.bankType ?? null,
            pixKey: user.pixKey ?? null,
            pixEnabled: user.pixEnabled ?? null,
          })
        }
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, hydrateFrom])

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Usuário não identificado. Faça login novamente.')
      return
    }
    if (hydrating) {
      toast.warning('Aguarde o carregamento dos seus dados antes de salvar.')
      return
    }
    setSaving(true)
    try {
      const updated = await apiFetch<any>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user.id,
          bankCode: bankCode.trim() || null,
          bankAgency: bankAgency.trim() || null,
          bankAccount: bankAccount.trim() || null,
          bankType,
          pixKey: pixKey.trim() || null,
          pixEnabled,
        }),
      })
      // Sync local form state with the canonical API response so any
      // server-side normalisation (trimming, null-coercion) is reflected.
      hydrateFrom({
        bankCode: updated?.bankCode ?? null,
        bankAgency: updated?.bankAgency ?? null,
        bankAccount: updated?.bankAccount ?? null,
        bankType: updated?.bankType ?? null,
        pixKey: updated?.pixKey ?? null,
        pixEnabled: updated?.pixEnabled ?? null,
      })
      // Update the global Zustand store so other pages reflect the change.
      updateUser({
        bankCode: updated?.bankCode ?? (bankCode || null),
        bankAgency: updated?.bankAgency ?? (bankAgency || null),
        bankAccount: updated?.bankAccount ?? (bankAccount || null),
        bankType: updated?.bankType ?? bankType,
        pixKey: updated?.pixKey ?? (pixKey || null),
        pixEnabled: updated?.pixEnabled ?? pixEnabled,
      })
      toast.success('Dados bancários atualizados com sucesso!')
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Não foi possível salvar seus dados bancários. Tente novamente.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const inputDisabled = hydrating || saving

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Acesso ao Banco</h2>
        <p className="text-sm text-gray-500">Gerencie suas informações bancárias</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 shadow-lg">
          <CardContent className="p-6 text-white">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              <div>
                <h3 className="text-xl font-bold">NewMobility Bank</h3>
                <p className="text-emerald-200">Sua conta digital integrada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bank Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">SALDO PRINCIPAL</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(user?.balanceWithdrawal || 0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">SALDO MOBILIDADE</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(user?.balanceMobility || 0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">SALDO COMPRAS</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(user?.balanceShopping || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Details Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Dados Bancários para Recebimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankCode">Código do Banco</Label>
                <Input
                  id="bankCode"
                  placeholder="Ex.: 001 (Banco do Brasil)"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  disabled={inputDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAgency">Agência</Label>
                <Input
                  id="bankAgency"
                  placeholder="Ex.: 1234-5"
                  value={bankAgency}
                  onChange={(e) => setBankAgency(e.target.value)}
                  disabled={inputDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Conta</Label>
                <Input
                  id="bankAccount"
                  placeholder="Ex.: 67890-1"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  disabled={inputDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <div className="flex items-center gap-4 h-10">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="bankType"
                      value="cc"
                      checked={bankType === 'cc'}
                      onChange={() => setBankType('cc')}
                      disabled={inputDisabled}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    <span className="text-gray-700">Conta Corrente</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="bankType"
                      value="cp"
                      checked={bankType === 'cp'}
                      onChange={() => setBankType('cp')}
                      disabled={inputDisabled}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    <span className="text-gray-700">Conta Poupança</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cpf">CPF / Titular</Label>
                <Input
                  id="cpf"
                  value={user?.cpf || ''}
                  disabled
                  className="bg-gray-50"
                  placeholder="—"
                />
              </div>
            </div>

            {/* PIX section */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-800">Chave PIX</span>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-emerald-800">
                  <input
                    type="checkbox"
                    checked={pixEnabled}
                    onChange={(e) => setPixEnabled(e.target.checked)}
                    disabled={inputDisabled}
                    className="accent-emerald-600 h-4 w-4"
                  />
                  Receber via PIX
                </label>
              </div>
              <Input
                placeholder="E-mail, CPF, telefone ou chave aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                disabled={inputDisabled || !pixEnabled}
                className={!pixEnabled ? 'bg-gray-50' : ''}
              />
              {pixEnabled && pixKey && (
                <p className="text-[11px] text-emerald-700">
                  Esta chave será usada para futuros repasses via PIX.
                </p>
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-700">
                Seus dados bancários são protegidos com criptografia de ponta a ponta. Nunca compartilhe suas informações com terceiros.
              </p>
            </div>

            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleSave}
              disabled={inputDisabled}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Salvando...' : 'Atualizar Dados Bancários'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
