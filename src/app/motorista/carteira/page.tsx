'use client'

import { Wallet } from 'lucide-react'
import { MotoristaComingSoon } from '@/components/motorista/motorista-coming-soon'

export default function CarteiraPage() {
  return (
    <MotoristaComingSoon
      title="Carteira"
      description="Seus ganhos, saldo disponível para saque, histórico de repasses e extrato de corridas."
      icon={Wallet}
    />
  )
}
