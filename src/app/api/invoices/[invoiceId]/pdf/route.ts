import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const invoice = await db.findOne('Invoice', '"id" = $1 AND "userId" = $2', [invoiceId, userId])

    if (!invoice) {
      // Generate mock invoice if not found in DB
      const mockInvoiceHtml = generateMockInvoiceHtml(invoiceId, userId)
      return new NextResponse(mockInvoiceHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="invoice-${invoiceId}.html"`,
        },
      })
    }

    const html = generateInvoiceHtml(invoice)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${invoiceId}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatCurrencyCents(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function generateInvoiceHtml(invoice: any): string {
  const statusMap: Record<string, string> = {
    paid: 'PAGO',
    pending: 'PENDENTE',
    overdue: 'VENCIDO',
    cancelled: 'CANCELADO',
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Fatura ${invoice.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #059669; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 800; color: #059669; }
    .logo span { color: #1a1a1a; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { font-size: 20px; color: #059669; margin-bottom: 4px; }
    .invoice-info p { font-size: 12px; color: #666; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 8px; }
    .status-paid { background: #d1fae5; color: #059669; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .detail-box { background: #f8fafc; border-radius: 8px; padding: 16px; }
    .detail-box h3 { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
    .detail-box p { font-size: 13px; font-weight: 500; }
    .items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items th { background: #059669; color: white; padding: 10px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
    .items th:last-child { text-align: right; }
    .items td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .items td:last-child { text-align: right; font-weight: 600; }
    .items tr:nth-child(even) { background: #f8fafc; }
    .total-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .total-box { background: #059669; color: white; padding: 20px; border-radius: 8px; text-align: right; min-width: 250px; }
    .total-box .label { font-size: 12px; opacity: 0.8; }
    .total-box .value { font-size: 28px; font-weight: 800; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; }
    .footer p { font-size: 11px; color: #999; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">New<span>Mobility</span></div>
      <p style="font-size: 11px; color: #666; margin-top: 4px;">BackOffice - Sistema de Gestão</p>
    </div>
    <div class="invoice-info">
      <h2>FATURA #${invoice.id.slice(-6).toUpperCase()}</h2>
      <p>Emissão: ${new Date(invoice.createdAt).toLocaleDateString('pt-BR')}</p>
      <p>Vencimento: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('pt-BR') : '—'}</p>
      <div class="status-badge status-${invoice.status}">${statusMap[invoice.status] || invoice.status.toUpperCase()}</div>
    </div>
  </div>
  <div class="details">
    <div class="detail-box">
      <h3>Cliente</h3>
      <p>${invoice.userId}</p>
      <p style="font-size: 11px; color: #666; margin-top: 2px;">Plano NewMobility</p>
    </div>
    <div class="detail-box">
      <h3>Pagamento</h3>
      <p>PIX / Cartão de Crédito</p>
      <p style="font-size: 11px; color: #666; margin-top: 2px;">Processado via NewMobility</p>
    </div>
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Ref.</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Assinatura Mensal - Plano</td>
        <td>${new Date(invoice.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</td>
        <td>${formatCurrencyCents(invoice.amount)}</td>
      </tr>
    </tbody>
  </table>
  <div class="total-section">
    <div class="total-box">
      <div class="label">TOTAL</div>
      <div class="value">${formatCurrencyCents(invoice.amount)}</div>
    </div>
  </div>
  <div class="footer">
    <p>NewMobility Tecnologia Ltda - CNPJ: 00.000.000/0001-00</p>
    <p>Esta fatura é um documento não fiscal, de caráter informativo.</p>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`
}

function generateMockInvoiceHtml(invoiceId: string, userId: string): string {
  const amount = 99900
  const status = 'paid'
  const createdAt = new Date().toISOString()
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  return generateInvoiceHtml({
    id: invoiceId,
    userId,
    amount,
    status,
    createdAt,
    dueDate,
  })
}
