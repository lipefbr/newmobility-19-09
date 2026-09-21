'use client'

import { ClipboardList } from 'lucide-react'
import { LojistaComingSoon } from '@/components/lojista/lojista-coming-soon'

export default function LojistaPedidosPage() {
  return (
    <LojistaComingSoon
      title="Pedidos"
      icon={ClipboardList}
      description="Acompanhe todos os pedidos da sua loja em tempo real: novos pedidos, em preparo, a caminho e entregues. Você poderá filtrar por status, data e cliente."
    />
  )
}
