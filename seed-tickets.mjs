import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
  const demoUser = await prisma.user.findFirst({ where: { email: 'carlos.silva@email.com' } })
  
  if (!demoUser) { console.log('No demo user'); return }
  
  // Check existing tickets
  const existingTickets = await prisma.ticket.count()
  if (existingTickets > 0) { console.log('Tickets already exist:', existingTickets); return }
  
  const ticketData = [
    { subject: 'Problema com saque', category: 'financial', priority: 'high', status: 'open' },
    { subject: 'CashBack não creditado', category: 'financial', priority: 'normal', status: 'in_progress' },
    { subject: 'Erro no aplicativo', category: 'technical', priority: 'urgent', status: 'open' },
    { subject: 'Dúvida sobre plano', category: 'account', priority: 'normal', status: 'resolved' },
    { subject: 'Alterar dados cadastrais', category: 'account', priority: 'low', status: 'closed' },
    { subject: 'Gratificação não apareceu', category: 'financial', priority: 'normal', status: 'open' },
    { subject: 'Como indicar amigos?', category: 'account', priority: 'low', status: 'resolved' },
  ]
  
  for (const t of ticketData) {
    const ticket = await prisma.ticket.create({
      data: { userId: demoUser.id, subject: t.subject, category: t.category, priority: t.priority, status: t.status }
    })
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, userId: demoUser.id, message: `Olá, preciso de ajuda com: ${t.subject}`, isAdmin: false }
    })
    if (t.status !== 'open') {
      const adminId = adminUser?.id || demoUser.id
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, userId: adminId, message: 'Estamos verificando sua solicitação. Em breve retornaremos.', isAdmin: true }
      })
    }
    if (t.status === 'resolved' || t.status === 'closed') {
      const adminId = adminUser?.id || demoUser.id
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, userId: adminId, message: 'Sua solicitação foi resolvida. Obrigado pelo contato!', isAdmin: true }
      })
    }
  }
  console.log('Created 7 test tickets')
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect() })
