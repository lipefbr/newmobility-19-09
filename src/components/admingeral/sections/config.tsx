'use client'

import { useState, useEffect } from 'react'
import { Settings, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export function ConfigSection() {
  const { user } = useStore()
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!user?.id) return
    try {
      const r = await apiFetch<{ config: Record<string, string> }>(`/admingeral/config?userId=${user.id}`)
      setConfig(r.config)
    } catch { toast.error('Erro ao carregar config') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/admingeral/config', {
        method: 'PUT',
        body: JSON.stringify({ userId: user?.id, config }),
      })
      toast.success('Configurações salvas')
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const update = (key: string, value: string) => setConfig({ ...config, [key]: value })

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  const formatBRL = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-4 max-w-3xl">
      {/* App toggles */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" /> Apps ativos</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          {[
            { key: 'app_enable_mobile_app', label: 'App do Cliente (/mobile)' },
            { key: 'app_enable_motorista_app', label: 'App do Motorista (/motorista)' },
            { key: 'app_enable_lojista_app', label: 'Painel do Lojista (/lojista)' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{item.label}</span>
              <Switch checked={config[item.key] === 'true'} onCheckedChange={(v) => update(item.key, String(v))} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cashback rates */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Taxas de cashback por categoria (%)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-0">
          {[
            { key: 'app_default_cashback_percent', label: 'Padrão' },
            { key: 'app_food_cashback_percent', label: 'Alimentação' },
            { key: 'app_shopping_cashback_percent', label: 'Shopping' },
            { key: 'app_market_cashback_percent', label: 'Mercado' },
            { key: 'app_pharmacy_cashback_percent', label: 'Farmácia' },
            { key: 'app_mobilidade_cashback_percent', label: 'Mobilidade' },
          ].map((item) => (
            <div key={item.key}>
              <label className="text-xs font-semibold text-slate-700">{item.label}</label>
              <div className="relative mt-1">
                <Input type="number" step="0.1" value={config[item.key] || '0'} onChange={(e) => update(item.key, e.target.value)} className="pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delivery defaults */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configurações de entrega</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
          <div>
            <label className="text-xs font-semibold text-slate-700">Taxa de entrega padrão (centavos)</label>
            <Input type="number" value={config.app_default_delivery_fee_cents || '0'} onChange={(e) => update('app_default_delivery_fee_cents', e.target.value)} className="mt-1" />
            <p className="text-[10px] text-slate-400 mt-0.5">{formatBRL(Number(config.app_default_delivery_fee_cents || 0))}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Pedido mínimo (centavos)</label>
            <Input type="number" value={config.app_default_min_order_cents || '0'} onChange={(e) => update('app_default_min_order_cents', e.target.value)} className="mt-1" />
            <p className="text-[10px] text-slate-400 mt-0.5">{formatBRL(Number(config.app_default_min_order_cents || 0))}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Tempo estimado de entrega (min)</label>
            <Input type="number" value={config.app_default_estimated_delivery_min || '30'} onChange={(e) => update('app_default_estimated_delivery_min', e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Raio máximo de entrega (km)</label>
            <Input type="number" value={config.app_max_delivery_radius_km || '10'} onChange={(e) => update('app_max_delivery_radius_km', e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Support contact */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Contato de suporte</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
          <div>
            <label className="text-xs font-semibold text-slate-700">Telefone</label>
            <Input value={config.app_support_phone || ''} onChange={(e) => update('app_support_phone', e.target.value)} placeholder="(11) 99999-9999" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">E-mail</label>
            <Input value={config.app_support_email || ''} onChange={(e) => update('app_support_email', e.target.value)} placeholder="suporte@newmobility.com" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  )
}
