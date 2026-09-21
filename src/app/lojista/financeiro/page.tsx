'use client'

import { Wallet } from 'lucide-react'
import { LojistaComingSoon } from '@/components/lojista/lojista-coming-soon'

export default function LojistaFinanceiroPage() {
  return (
    <LojistaComingSoon
      title="Financeiro"
      icon={Wallet}
      description="Veja o resumo financeiro da sua loja: vendas por período, taxas, saques via PIX e extrato completo de transações."
    />
  )
}
