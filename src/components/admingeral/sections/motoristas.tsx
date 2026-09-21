'use client'

import { useState, useEffect } from 'react'
import { Car, Loader2, CheckCircle2, XCircle, Phone, Mail, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'

interface DriverApp {
  id: string
  userId: string
  vehicleType: string
  vehicleModel: string | null
  vehiclePlate: string | null
  vehicleColor: string | null
  vehicleYear: number | null
  cnhNumber: string | null
  cnhCategory: string | null
  status: string
  createdAt: string
  user: { id: string; name: string; email: string; phone: string | null; profileImage: string | null; cpf: string | null }
}

export function MotoristasSection({ onApprove }: { onApprove?: () => void }) {
  const { user } = useStore()
  const [apps, setApps] = useState<DriverApp[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const r = await apiFetch<{ applications: DriverApp[] }>(`/admingeral/drivers?userId=${user.id}&status=${filter}`)
      setApps(r.applications)
    } catch { toast.error('Erro ao carregar motoristas') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id, filter])

  const handleApprove = async (app: DriverApp) => {
    if (!confirm(`Aprovar ${app.user.name} como motorista? Isso vai ativar a flag isDriver na conta dele.`)) return
    try {
      await apiFetch(`/admingeral/drivers/${app.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id }),
      })
      toast.success(`${app.user.name} aprovado como motorista`)
      load()
      onApprove?.()
    } catch { toast.error('Erro ao aprovar') }
  }

  const handleReject = async (app: DriverApp) => {
    try {
      await apiFetch(`/admingeral/drivers/${app.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, reason: rejectReason }),
      })
      toast.success(`Inscrição de ${app.user.name} rejeitada`)
      setRejecting(null)
      setRejectReason('')
      load()
    } catch { toast.error('Erro ao rejeitar') }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : f === 'rejected' ? 'Rejeitados' : 'Todos'}
          </Button>
        ))}
      </div>

      {apps.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-10 text-center">
            <Car className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhuma inscrição {filter !== 'all' ? filter : ''}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const initials = app.user.name?.split(' ').slice(0, 2).map((n) => n.charAt(0).toUpperCase()).join('') || 'MO'
            return (
              <Card key={app.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.user.profileImage || undefined} alt={app.user.name} />
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">{app.user.name}</p>
                        <Badge variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {app.status === 'approved' ? 'Aprovado' : app.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {app.user.email}</span>
                        {app.user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {app.user.phone}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(app.createdAt).toLocaleDateString('pt-BR')}</span>
                        {app.user.cpf && <span>CPF: {app.user.cpf}</span>}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-slate-400">Veículo:</span> <span className="text-slate-700 font-medium">{app.vehicleModel || '—'}</span></div>
                        <div><span className="text-slate-400">Placa:</span> <span className="text-slate-700 font-medium uppercase">{app.vehiclePlate || '—'}</span></div>
                        <div><span className="text-slate-400">Tipo:</span> <span className="text-slate-700 font-medium capitalize">{app.vehicleType}</span></div>
                        <div><span className="text-slate-400">CNH:</span> <span className="text-slate-700 font-medium">{app.cnhCategory || '—'}</span></div>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="h-8" onClick={() => handleApprove(app)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-red-600 hover:bg-red-50" onClick={() => setRejecting(app.id)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                          </Button>
                        </div>
                      )}

                      {rejecting === app.id && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-2">
                          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da rejeição (opcional)" className="text-xs" rows={2} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReject(app)}>Confirmar rejeição</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setRejecting(null); setRejectReason('') }}>Cancelar</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
