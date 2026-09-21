'use client'

import { Route } from 'lucide-react'
import { MotoristaComingSoon } from '@/components/motorista/motorista-coming-soon'

export default function CorridasPage() {
  return (
    <MotoristaComingSoon
      title="Minhas Corridas"
      description="Histórico completo de corridas e entregas realizadas, com ganhos, avaliações e detalhes de cada viagem."
      icon={Route}
    />
  )
}
