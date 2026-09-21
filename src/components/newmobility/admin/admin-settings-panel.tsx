'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Image as ImageIcon,
  Save,
  Upload,
  Trash2,
  RefreshCw,
  Settings as SettingsIcon,
  Palette,
  Type,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'

// ---------- Types ----------

interface LogoResponse {
  logoUrl: string | null
}

interface ConfigMap {
  [key: string]: string
}

// ---------- Component ----------

export function AdminSettingsPanel() {
  const { user } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [savingLogo, setSavingLogo] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [pendingLogo, setPendingLogo] = useState<string | null>(null)
  const [appName, setAppName] = useState('NewMobility')
  const [primaryColor, setPrimaryColor] = useState('#10b981')

  const loadAll = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [logoRes, configRes] = await Promise.all([
        apiFetch<LogoResponse>(`/admin/config/logo?userId=${user.id}`),
        apiFetch<ConfigMap>(`/admin/config?userId=${user.id}`),
      ])
      setLogoUrl(logoRes.logoUrl || null)
      setPendingLogo(null)
      if (configRes.app_name) setAppName(configRes.app_name)
      if (configRes.primary_color) setPrimaryColor(configRes.primary_color)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido')
      return
    }
    if (file.size > 1_000_000) {
      toast.error('Imagem muito grande. Use um arquivo de até 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setPendingLogo(result)
      }
    }
    reader.onerror = () => toast.error('Falha ao ler o arquivo')
    reader.readAsDataURL(file)
  }

  const handleSaveLogo = async () => {
    if (!user?.id || !pendingLogo) return
    setSavingLogo(true)
    try {
      await apiFetch('/admin/config/logo', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, logoUrl: pendingLogo }),
      })
      setLogoUrl(pendingLogo)
      setPendingLogo(null)
      toast.success('Logo salva com sucesso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar logo')
    } finally {
      setSavingLogo(false)
    }
  }

  const handleClearLogo = async () => {
    if (!user?.id) return
    setSavingLogo(true)
    try {
      // Save empty data URL placeholder? Better: use the existing PUT /admin/config
      // to set the value to empty string (effectively clearing the logo).
      await apiFetch('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, configs: { app_logo_url: '' } }),
      })
      setLogoUrl(null)
      setPendingLogo(null)
      toast.success('Logo removida')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover logo')
    } finally {
      setSavingLogo(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!user?.id) return
    setSavingConfig(true)
    try {
      await apiFetch('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user.id,
          configs: {
            app_name: appName,
            primary_color: primaryColor,
          },
        }),
      })
      toast.success('Configurações salvas com sucesso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configurações')
    } finally {
      setSavingConfig(false)
    }
  }

  const previewSrc = pendingLogo || logoUrl

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SettingsIcon className="h-4 w-4 text-emerald-600" />
            Configurações do Sistema
          </CardTitle>
          <CardDescription className="text-xs">
            Personalize a identidade visual e os parâmetros globais da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 pt-0">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Recarregar
          </Button>
        </CardContent>
      </Card>

      {/* Logo upload */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-emerald-600" />
            Logo da Plataforma
          </CardTitle>
          <CardDescription className="text-xs">
            Faça upload de uma logo em PNG ou JPG (até 1 MB). Ela será exibida no backoffice do usuário
            e no painel administrativo. A imagem é armazenada como <code>data URL</code> em <code>SystemConfig.app_logo_url</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Preview */}
            <div className="flex items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 shrink-0 overflow-hidden">
              {previewSrc ? (
                <img src={previewSrc} alt="Logo preview" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground/50">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-[10px] mt-1">Sem logo</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileSelected}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={savingLogo}
                >
                  <Upload className="h-3.5 w-3.5" /> Escolher arquivo
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSaveLogo}
                  disabled={savingLogo || !pendingLogo}
                >
                  {savingLogo ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar logo
                </Button>
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={handleClearLogo}
                    disabled={savingLogo}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Resolução recomendada: 256×256 px ou superior. Formatos: PNG, JPG, WebP, SVG.
              </p>
              {pendingLogo && pendingLogo !== logoUrl && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Alteração não salva. Clique em "Salvar logo" para aplicar.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* App name + primary color */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Type className="h-4 w-4 text-emerald-600" />
            Identidade Visual
          </CardTitle>
          <CardDescription className="text-xs">
            Nome exibido no backoffice e cor primária do tema. (A cor primária é armazenada mas o tema ainda precisa
            ser regenerado para aplicá-la em produção.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="app-name" className="text-xs">Nome da aplicação</Label>
              <Input
                id="app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="NewMobility"
              />
              <p className="text-[10px] text-muted-foreground">Salvo em <code>SystemConfig.app_name</code>.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary-color" className="text-xs flex items-center gap-1.5">
                <Palette className="h-3 w-3" /> Cor primária
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 rounded-md border border-input bg-background cursor-pointer p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Salvo em <code>SystemConfig.primary_color</code>.</p>
            </div>
          </div>
          <div className="pt-2">
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSaveConfig}
              disabled={savingConfig}
            >
              {savingConfig ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Security note */}
      <Card className="rounded-2xl shadow-sm border-amber-200 dark:border-amber-800">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-foreground">Auditoria ativa</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Todas as alterações feitas nesta página são registradas na tabela <code>AuditLog</code> com a ação
              <code> config_change</code>. Consulte o painel <strong>Logs de Auditoria</strong> para o histórico completo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
