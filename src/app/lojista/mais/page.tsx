'use client'

import { LayoutGrid } from 'lucide-react'
import { LojistaComingSoon } from '@/components/lojista/lojista-coming-soon'

export default function LojistaMaisPage() {
  return (
    <LojistaComingSoon
      title="Mais opções"
      icon={LayoutGrid}
      description="Configurações da loja, dados bancários, documentos, equipe, horários de funcionamento e suporte."
    />
  )
}
