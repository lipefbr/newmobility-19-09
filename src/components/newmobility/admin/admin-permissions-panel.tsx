'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Shield,
  Save,
  RefreshCw,
  Lock,
  CheckCircle2,
  Plus,
  Trash2,
  Info,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'

// ---------- Page metadata ----------

interface PageMeta {
  key: string
  label: string
  description: string
}

// All admin pages that can be allowed/denied per role. Mirrors the
// AdminPageKey union in src/lib/store.ts (minus 'audit' and 'permissions',
// which are admin-only and never exposed to other roles).
const ADMIN_PAGES: PageMeta[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Visão geral' },
  { key: 'users', label: 'Usuários', description: 'Gerenciar usuários' },
  { key: 'financial', label: 'Financeiro', description: 'Transações e cashback' },
  { key: 'withdrawals-asaas', label: 'Saques Asaas', description: 'Aprovar saques' },
  { key: 'plans', label: 'Planos & Preços', description: 'Planos e matrizes' },
  { key: 'gratifications', label: 'Gratificações', description: 'Saldos de gratificação' },
  { key: 'support', label: 'Tickets de Suporte', description: 'Atendimento' },
  { key: 'announcements', label: 'Anúncios', description: 'Comunicados' },
  { key: 'reports', label: 'Relatórios', description: 'Analytics' },
  { key: 'settings', label: 'Configurações', description: 'Sistema' },
  { key: 'vouchers', label: 'Vouchers', description: 'Cupons e vouchers' },
  { key: 'bets', label: 'Jogos & Apostas', description: 'Apostas' },
  { key: 'matrices', label: 'Matrizes MMN', description: 'Matriz de indicações' },
  { key: 'cashback-config', label: 'Config Cashback', description: 'Porcentagens' },
  { key: 'asaas', label: 'Asaas', description: 'Gateway de pagamento' },
  { key: 'achievements', label: 'Conquistas', description: 'Prêmios' },
  { key: 'career-plans', label: 'Plano de Carreira', description: 'Níveis e bônus' },
  { key: 'driver-categories', label: 'Categorias de Motorista', description: 'Categorias de veículo + meta + bônus' },
  { key: 'streak-rewards', label: 'Recompensas de Sequência', description: 'Sequências' },
  { key: 'events', label: 'Eventos', description: 'Eventos e promoções' },
  { key: 'faq', label: 'FAQ', description: 'Perguntas frequentes' },
  { key: 'talkmobi', label: 'Planos TalkMobi', description: 'Editar planos TalkMobi' },
  { key: 'telemedicina', label: 'Telemedicina', description: 'Aprovar ativações' },
]

// Default permission set for new roles (admin/support are always present).
const DEFAULT_ROLE_PAGES: Record<string, string[]> = {
  admin: ['*'],
  support: ['users', 'support', 'announcements'],
}

// ---------- Types ----------

interface PermissionsResponse {
  permissions: Record<string, string[]>
}

// ---------- Component ----------

export function AdminPermissionsPanel() {
  const { user } = useStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, string[]>>(DEFAULT_ROLE_PAGES)
  const [newRoleName, setNewRoleName] = useState('')

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await apiFetch<PermissionsResponse>(`/admin/permissions?userId=${user.id}`)
      setPermissions(res.permissions || DEFAULT_ROLE_PAGES)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const togglePage = (role: string, pageKey: string) => {
    setPermissions((prev) => {
      const current = prev[role] || []
      // Admin role always keeps the wildcard — never let the user remove it.
      if (role === 'admin') return prev
      const next = current.includes(pageKey)
        ? current.filter((p) => p !== pageKey)
        : [...current, pageKey]
      return { ...prev, [role]: next }
    })
  }

  const toggleAllForRole = (role: string, allOn: boolean) => {
    setPermissions((prev) => {
      if (role === 'admin') return prev
      return {
        ...prev,
        [role]: allOn ? ADMIN_PAGES.map((p) => p.key) : [],
      }
    })
  }

  const addRole = () => {
    const name = newRoleName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!name) {
      toast.error('Informe um nome válido (apenas letras e números)')
      return
    }
    if (permissions[name]) {
      toast.error('Este papel já existe')
      return
    }
    setPermissions((prev) => ({ ...prev, [name]: [] }))
    setNewRoleName('')
    toast.success(`Papel "${name}" adicionado`)
  }

  const removeRole = (role: string) => {
    if (role === 'admin' || role === 'support') {
      toast.error('Não é possível remover os papéis padrão (admin/support)')
      return
    }
    setPermissions((prev) => {
      const next = { ...prev }
      delete next[role]
      return next
    })
    toast.success(`Papel "${role}" removido`)
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await apiFetch('/admin/permissions', {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, permissions }),
      })
      toast.success('Permissões salvas com sucesso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar permissões')
    } finally {
      setSaving(false)
    }
  }

  const roles = Object.keys(permissions)

  return (
    <div className="space-y-4">
      {/* ADM-4 — Info box: explains how login + roles + permissions work together */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
                Como funciona o login
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Cada usuário criado no sistema tem seu próprio <strong>email</strong> e <strong>senha</strong>.
                Usuários com role <code className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">admin</code> ou{' '}
                <code className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">support</code>{' '}
                (ou roles customizados) podem acessar o painel admin, limitado às páginas permitidas abaixo. Para criar
                um novo usuário com acesso ao painel, vá na aba <strong>Usuários</strong> e clique em{' '}
                <strong>&quot;Criar Usuário&quot;</strong>.
              </p>
              {/* ADM-4 — Item 4: short hint about the password reset action
                  available on each user row in the Users tab. */}
              <p className="text-xs text-foreground/80 leading-relaxed pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                <KeyRound className="h-3 w-3 inline -mt-0.5 mr-1 text-emerald-600" />
                Esqueceu a senha de um usuário? Na aba <strong>Usuários</strong>, clique no botão{' '}
                <strong>&quot;Senha&quot;</strong> na coluna de ações da linha correspondente para redefinir
                a senha. Você pode digitar uma nova senha ou clicar em <strong>&quot;Gerar senha&quot;</strong>{' '}
                para criar uma aleatória. As credenciais (email + nova senha) serão exibidas em seguida para
                você compartilhar com o usuário.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-emerald-600" />
            Permissões por Papel
          </CardTitle>
          <CardDescription className="text-xs">
            Defina quais páginas do painel administrativo cada papel pode acessar. O papel <strong>admin</strong> sempre
            tem acesso total (<code>*</code>) e não pode ser restrito. Papéis não-listados aqui não conseguem fazer login no admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 pt-0">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving || loading}>
            {saving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Permissões
          </Button>
          <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Recarregar
          </Button>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 sticky left-0 bg-muted/30 z-10 min-w-[200px]">
                    Papel
                  </th>
                  {ADMIN_PAGES.map((p) => (
                    <th key={p.key} className="p-2 text-center min-w-[110px]" title={p.description}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground leading-tight">{p.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-center min-w-[80px]">
                    <span className="text-[10px] font-semibold text-muted-foreground">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => {
                  const allowed = permissions[role] || []
                  const isWildcard = allowed.includes('*')
                  const isDefault = role === 'admin' || role === 'support'
                  return (
                    <tr key={role} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          {role === 'admin' && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                          <div>
                            <p className="text-sm font-semibold text-foreground capitalize">{role}</p>
                            {isWildcard ? (
                              <Badge className="mt-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Todas
                              </Badge>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">{allowed.length} página(s)</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {ADMIN_PAGES.map((p) => {
                        const checked = isWildcard || allowed.includes(p.key)
                        return (
                          <td key={p.key} className="p-2 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => togglePage(role, p.key)}
                                disabled={role === 'admin'}
                                aria-label={`${role} pode acessar ${p.label}`}
                              />
                            </div>
                          </td>
                        )
                      })}
                      <td className="p-2 text-center">
                        {isDefault ? (
                          <span className="text-[10px] text-muted-foreground">Padrão</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-red-500 hover:text-red-600 text-xs"
                            onClick={() => removeRole(role)}
                            title="Remover papel"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions per role (mobile-friendly shortcuts) */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Atalhos por papel</CardTitle>
          <CardDescription className="text-xs">Marcar ou desmarcar todas as páginas de uma vez.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role) => {
            const allowed = permissions[role] || []
            const isWildcard = allowed.includes('*')
            const isDefault = role === 'admin' || role === 'support'
            return (
              <div key={role} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold capitalize">{role}</p>
                  {isWildcard && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">Todas</Badge>}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={() => toggleAllForRole(role, true)}
                    disabled={isDefault}
                  >
                    Marcar todas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={() => toggleAllForRole(role, false)}
                    disabled={isDefault}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Add new role */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4 text-emerald-600" />
            Adicionar novo papel
          </CardTitle>
          <CardDescription className="text-xs">
            Crie papéis personalizados (ex.: <code>financeiro</code>, <code>marketing</code>) e marque abaixo as páginas que cada um pode acessar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-role" className="text-xs">Nome do papel</Label>
            <Input
              id="new-role"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="ex.: financeiro"
              className="max-w-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') addRole() }}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addRole} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
