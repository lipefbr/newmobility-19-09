'use client'

import { useState, useEffect } from 'react'
import { Users, Loader2, Search, Car, Store, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface AppUser {
  id: string
  name: string
  email: string
  phone: string | null
  profileImage: string | null
  userType: string
  isDriver: boolean
  isDelivery: boolean
  isActive: boolean
  plan: string
  city: string | null
  state: string | null
  createdAt: string
  balanceWithdrawal: number
  balanceFood: number
  stars: number
  totalRides: number
  _count: { appStores: number; appOrders: number; driverApplications: number }
}

const TYPE_LABELS: Record<string, string> = {
  usuario: 'Cliente', cliente: 'Cliente', motorista: 'Motorista', lojista: 'Lojista', admin: 'Admin',
}

export function UsuariosSection() {
  const { user } = useStore()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'clientes' | 'motoristas' | 'lojistas' | 'entregadores'>('all')
  const [q, setQ] = useState('')

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const r = await apiFetch<{ users: AppUser[] }>(`/admingeral/users?userId=${user.id}&type=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      setUsers(r.users)
    } catch { toast.error('Erro ao carregar usuários') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id, filter])

  const formatBRL = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'clientes', 'motoristas', 'lojistas', 'entregadores'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'clientes' ? 'Clientes' : f === 'motoristas' ? 'Motoristas' : f === 'lojistas' ? 'Lojistas' : 'Entregadores'}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); load() }} placeholder="Buscar por nome, email..." className="pl-9 w-full sm:w-64" />
        </div>
      </div>

      {users.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-10 text-center">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum usuário encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => {
            const initials = u.name?.split(' ').slice(0, 2).map((n) => n.charAt(0).toUpperCase()).join('') || 'US'
            return (
              <Card key={u.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={u.profileImage || undefined} alt={u.name} />
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                        {!u.isActive && <Badge variant="secondary" className="text-[9px]">Inativo</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{TYPE_LABELS[u.userType] || u.userType}</Badge>
                        {u.isDriver && <Badge className="text-[9px] bg-amber-100 text-amber-700 hover:bg-amber-100"><Car className="h-2.5 w-2.5 mr-0.5" />Motorista</Badge>}
                        {u.isDelivery && <Badge className="text-[9px] bg-orange-100 text-orange-700 hover:bg-orange-100"><Car className="h-2.5 w-2.5 mr-0.5" />Entregador</Badge>}
                        {u.plan && u.plan !== 'free' && <Badge className="text-[9px] bg-blue-100 text-blue-700 hover:bg-blue-100">Plano {u.plan}</Badge>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px]">
                        <div>
                          <p className="text-slate-400">Saldo</p>
                          <p className="text-slate-700 font-semibold">{formatBRL(u.balanceWithdrawal)}</p>
                        </div>
                        {u.isDriver ? (
                          <div>
                            <p className="text-slate-400">Corridas</p>
                            <p className="text-slate-700 font-semibold">{u.totalRides} · {u.stars}★</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-slate-400">Pedidos</p>
                            <p className="text-slate-700 font-semibold">{u._count.appOrders}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-400">Cadastro</p>
                          <p className="text-slate-700 font-semibold">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
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
