'use client'

import { LayoutGrid } from 'lucide-react'
import { MotoristaComingSoon } from '@/components/motorista/motorista-coming-soon'

export default function MaisPage() {
  return (
    <MotoristaComingSoon
      title="Mais Opções"
      description="Documentos do veículo, dados pessoais, suporte, configurações e demais funcionalidades do app do Motorista."
      icon={LayoutGrid}
    />
  )
}
