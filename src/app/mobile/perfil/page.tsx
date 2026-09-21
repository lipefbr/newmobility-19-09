'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Camera,
  ChevronRight,
  KeyRound,
  Shield,
  ShieldCheck,
  FileText,
  Users,
  Bell,
  Ticket,
  LifeBuoy,
  LogOut,
  Check,
  Pencil,
  Save,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/perfil — User profile + settings hub.
// ----------------------------------------------------------------------------
// Sections:
//   1. Blue header with avatar + name + email (avatar is editable).
//   2. Editable personal data form (name, phone, address, city, state,
//      zipCode, pixKey) — Save → PUT /api/user/profile.
//   3. PIX key card (read-only display with edit shortcut to the form above).
//   4. Menu list:
//        - Segurança (change password) → /mobile/perfil/senha
//        - 2FA → /mobile/perfil/2fa
//        - KYC / Documentos → /mobile/perfil/kyc
//        - Indicações → /mobile/perfil/indicacoes (shows referral count + code)
//        - Notificações → /mobile/notificacoes
//        - Cupons/Vouchers → /mobile/perfil/cupons
//        - Suporte → /mobile/perfil/suporte
//   5. Sair button → logout() + redirect /mobile/login.
//
// Image upload: POST /api/user/profile/image (multipart/form-data with file
// field). On success we update the store via refresh().
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'
const ERROR_RED = '#EF4444'

interface ProfileUpdateResponse {
  id: string
  name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  pixKey?: string
  [k: string]: unknown
}

interface ImageUploadResponse {
  profileImage: string
  message: string
}

export default function PerfilPage() {
  const router = useRouter()
  const { user, wallet, loading, logout, refresh } = useMobileAuth()

  // Editable form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    pixKey: '',
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync form from user once it's loaded
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        address: (user as any).address || '',
        city: (user as any).city || '',
        state: (user as any).state || '',
        zipCode: (user as any).zipCode || '',
        pixKey: user.pixKey || '',
      })
    }
  }, [user])

  const onSave = async () => {
    if (!user?.id) return
    if (!form.name.trim()) {
      toast.error('Informe seu nome')
      return
    }
    setSaving(true)
    try {
      await apiFetch<ProfileUpdateResponse>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user.id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: form.zipCode.trim(),
          pixKey: form.pixKey.trim(),
        }),
      })
      await refresh()
      toast.success('Perfil atualizado!')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const onPickImage = () => fileInputRef.current?.click()

  const onUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5 MB)')
      return
    }
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('userId', user.id)
      fd.append('file', file)
      // apiFetch sets JSON content-type — for multipart we use raw fetch.
      const res = await fetch('/api/user/profile/image', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro no upload' }))
        throw new Error(err.error || 'Erro no upload')
      }
      const data = (await res.json()) as ImageUploadResponse
      await refresh()
      toast.success('Foto atualizada!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro no upload')
    } finally {
      setUploadingImg(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading && !user) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Perfil" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  if (!user) return null

  const firstName = (user.name || 'usuário').split(' ')[0]
  const referralCount = ((user as any).referrals as unknown[] | undefined)?.length ?? 0

  return (
    <MobileAppShell>
      {/* ════════════════ HEADER WITH AVATAR + NAME ════════════════ */}
      <header
        className="sticky top-0 z-30 pb-12"
        style={{
          background: `linear-gradient(160deg, ${PRIMARY} 0%, #0B4FE0 100%)`,
        }}
      >
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="px-3 h-14 flex items-center gap-2">
          <button
            onClick={() => router.push('/mobile/inicio')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
            aria-label="Voltar"
          >
            <ChevronRight className="h-5 w-5 text-white rotate-180" strokeWidth={2.5} />
          </button>
          <h1 className="flex-1 text-base font-bold text-white text-center">Perfil</h1>
          <div className="w-10" />
        </div>

        {/* Avatar + name */}
        <div className="px-4 pt-2 flex flex-col items-center">
          <div className="relative">
            <button
              onClick={onPickImage}
              disabled={uploadingImg}
              className="h-20 w-20 rounded-full bg-white/20 ring-4 ring-white/30 overflow-hidden flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Alterar foto"
            >
              {user.profileImage ? (
                 
                <img
                  src={user.profileImage}
                  alt={firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <span
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white"
              style={{ backgroundColor: PRIMARY }}
            >
              {uploadingImg ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-white" />
              )}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onUploadImage}
              className="hidden"
            />
          </div>
          <p className="text-base font-bold text-white mt-2">{user.name}</p>
          <p className="text-xs text-white/80">{user.email}</p>
          {user.plan && (
            <span className="mt-1.5 inline-flex items-center px-2 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase">
              Plano {user.plan}
            </span>
          )}
        </div>
      </header>

      {/* Wallet mini-summary */}
      <div className="px-4 -mt-6 relative z-10">
        <div className="rounded-2xl bg-white shadow-lg border border-gray-50 p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-gray-500">Saldo total</p>
              <p className="text-sm font-bold text-gray-900">
                R$ {formatBRL(wallet?.totalCents ?? 0)}
              </p>
            </div>
            <div className="border-l border-r border-gray-100">
              <p className="text-[10px] text-gray-500">Saque</p>
              <p className="text-sm font-bold text-gray-900">
                R$ {formatBRL(wallet?.withdrawalCents ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Indicações</p>
              <p className="text-sm font-bold text-gray-900">{referralCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* ════════════════ PERSONAL DATA ════════════════ */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Dados pessoais</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-semibold flex items-center gap-1 min-h-[44px] min-w-[44px]"
                style={{ color: PRIMARY }}
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="text-xs font-semibold text-gray-500 min-h-[44px] min-w-[44px]"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="space-y-3">
            <Field
              label="Nome completo"
              icon={Users}
              value={form.name}
              editing={editing}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Seu nome"
            />
            <Field
              label="Telefone"
              icon={Phone}
              value={form.phone}
              editing={editing}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="(11) 99999-9999"
            />
            <Field
              label="Endereço"
              icon={MapPin}
              value={form.address}
              editing={editing}
              onChange={(v) => setForm({ ...form, address: v })}
              placeholder="Rua, número, bairro"
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Cidade"
                icon={MapPin}
                value={form.city}
                editing={editing}
                onChange={(v) => setForm({ ...form, city: v })}
                placeholder="Cidade"
              />
              <Field
                label="UF"
                icon={MapPin}
                value={form.state}
                editing={editing}
                onChange={(v) => setForm({ ...form, state: v })}
                placeholder="SP"
              />
            </div>
            <Field
              label="CEP"
              icon={MapPin}
              value={form.zipCode}
              editing={editing}
              onChange={(v) => setForm({ ...form, zipCode: v })}
              placeholder="00000-000"
            />
            <Field
              label="Chave PIX"
              icon={KeyRound}
              value={form.pixKey}
              editing={editing}
              onChange={(v) => setForm({ ...form, pixKey: v })}
              placeholder="CPF, e-mail, telefone ou aleatória"
            />
            <Field
              label="E-mail"
              icon={Mail}
              value={user.email}
              editing={false}
              onChange={() => {}}
              placeholder=""
            />
          </div>

          {editing && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onSave}
              disabled={saving}
              className="w-full mt-4 h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              style={{ backgroundColor: PRIMARY }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </motion.button>
          )}
        </section>

        {/* ════════════════ MENU LIST ════════════════ */}
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm mb-4 overflow-hidden">
          <MenuItem
            icon={Shield}
            label="Alterar senha"
            description="Atualize sua senha de acesso"
            onClick={() => toast.info('Em breve: alterar senha no app')}
          />
          <MenuItem
            icon={ShieldCheck}
            label="Autenticação 2FA"
            description="Proteja sua conta com verificação em 2 etapas"
            onClick={() => toast.info('Em breve: configurar 2FA no app')}
          />
          <MenuItem
            icon={FileText}
            label="KYC / Documentos"
            description="Verifique sua identidade para saques"
            onClick={() => toast.info('Em breve: KYC no app')}
          />
          <MenuItem
            icon={Users}
            label="Minhas indicações"
            description={`${referralCount} pessoa(s) indicada(s) • Código: ${user.referralCode || '—'}`}
            onClick={() => toast.info(`Seu código de indicação: ${user.referralCode || '—'}`)}
          />
          <MenuItem
            icon={Bell}
            label="Notificações"
            description="Gerencie seus avisos"
            onClick={() => router.push('/mobile/notificacoes')}
          />
          <MenuItem
            icon={Ticket}
            label="Cupons e vouchers"
            description="Resgate e visualize seus cupons"
            onClick={() => router.push('/mobile/perfil/cupons')}
          />
          <MenuItem
            icon={LifeBuoy}
            label="Suporte"
            description="Tire dúvidas com nossa equipe"
            onClick={() => toast.info('Em breve: central de suporte no app')}
            last
          />
        </section>

        {/* ════════════════ LOGOUT ════════════════ */}
        <button
          onClick={() => {
            logout()
          }}
          className="w-full h-12 rounded-xl border border-red-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors min-h-[44px]"
          style={{ color: ERROR_RED }}
        >
          <LogOut className="h-4 w-4" />
          Sair do app
        </button>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Field — read-only display OR editable input row.
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  label,
  icon: Icon,
  value,
  editing,
  onChange,
  placeholder,
}: {
  label: string
  icon: typeof Users
  value: string
  editing: boolean
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 mb-1">{label}</label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
          style={{ borderColor: PRIMARY }}
        />
      ) : (
        <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-gray-50">
          <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm font-medium text-gray-900 truncate">
            {value || '—'}
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuItem — single row in the settings menu list.
// ─────────────────────────────────────────────────────────────────────────────
function MenuItem({
  icon: Icon,
  label,
  description,
  onClick,
  last,
}: {
  icon: typeof Shield
  label: string
  description?: string
  onClick: () => void
  last?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 text-left hover:bg-gray-50 transition-colors min-h-[44px] ${
        last ? '' : 'border-b border-gray-100'
      }`}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
        style={{ backgroundColor: MINT_BG }}
      >
        <Icon className="h-4 w-4" style={{ color: '#059669' }} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
        {description && (
          <p className="text-[10px] text-gray-500 truncate">{description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </button>
  )
}
