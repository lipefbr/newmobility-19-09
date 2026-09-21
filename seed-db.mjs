import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()
const hashPassword = (pw) => createHash('sha256').update(pw).digest('hex')

async function main() {
  // Create lojista user
  let lojista = await prisma.user.findUnique({ where: { email: 'ricardo.lojista@email.com' } })
  if (!lojista) {
    lojista = await prisma.user.create({
      data: {
        name: 'Ricardo Mendes',
        email: 'ricardo.lojista@email.com',
        password: hashPassword('123456'),
        userType: 'lojista',
        role: 'user',
        referralCode: 'RICARDO2025',
        plan: 'blue5',
        isActive: true,
        balanceFree: 500000,
        phone: '(11) 99999-0001',
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
      }
    })
    console.log('Created lojista:', lojista.id)
  } else {
    console.log('Lojista already exists:', lojista.id)
  }

  // Check if products exist
  const existing = await prisma.marketplaceProduct.count({ where: { sellerName: 'Ricardo Mendes' } })
  if (existing > 0) {
    console.log('Products already seeded:', existing)
    return
  }

  const products = [
    { name: 'Fone Bluetooth Premium', price: 8990, originalPrice: 12990, category: 'electronics', cashbackPercent: 8, rating: 4.7, reviewCount: 156, stock: 200, isFeatured: true },
    { name: 'Smartwatch Fitness', price: 24990, originalPrice: 29990, category: 'electronics', cashbackPercent: 6, rating: 4.5, reviewCount: 89, stock: 150, isFeatured: false },
    { name: 'Carregador Solar Portátil', price: 12990, originalPrice: 15990, category: 'electronics', cashbackPercent: 10, rating: 4.3, reviewCount: 67, stock: 300, isFeatured: false },
    { name: 'Camiseta Dry-Fit Esportiva', price: 5990, originalPrice: 7990, category: 'fashion', cashbackPercent: 5, rating: 4.6, reviewCount: 203, stock: 999, isFeatured: false },
    { name: 'Bolsa Elegante Couro', price: 15990, originalPrice: 19990, category: 'fashion', cashbackPercent: 7, rating: 4.4, reviewCount: 45, stock: 80, isFeatured: false },
    { name: 'Luminária LED Inteligente', price: 7990, originalPrice: 9990, category: 'home', cashbackPercent: 6, rating: 4.8, reviewCount: 134, stock: 250, isFeatured: true },
    { name: 'Organizador Multiuso', price: 3490, originalPrice: 4990, category: 'home', cashbackPercent: 4, rating: 4.2, reviewCount: 78, stock: 500, isFeatured: false },
    { name: 'Kit Vitaminas D+C', price: 4990, originalPrice: 6990, category: 'health', cashbackPercent: 12, rating: 4.9, reviewCount: 189, stock: 400, isFeatured: true },
    { name: 'Pulseira Monitor Sono', price: 6990, originalPrice: 9990, category: 'health', cashbackPercent: 8, rating: 4.1, reviewCount: 34, stock: 180, isFeatured: false },
    { name: 'Set Skincare Natural', price: 12990, originalPrice: 16990, category: 'beauty', cashbackPercent: 9, rating: 4.6, reviewCount: 112, stock: 120, isFeatured: false },
    { name: 'Perfume Premium 50ml', price: 18990, originalPrice: 24990, category: 'beauty', cashbackPercent: 7, rating: 4.8, reviewCount: 87, stock: 60, isFeatured: true },
    { name: 'Café Gourmet 500g', price: 3490, originalPrice: 4490, category: 'food', cashbackPercent: 5, rating: 4.7, reviewCount: 198, stock: 350, isFeatured: false },
    { name: 'Chocolate Artesanal Box', price: 5990, originalPrice: 7490, category: 'food', cashbackPercent: 4, rating: 4.9, reviewCount: 56, stock: 100, isFeatured: false },
    { name: 'Consultoria Nutricional', price: 19990, originalPrice: 29990, category: 'services', cashbackPercent: 15, rating: 4.5, reviewCount: 23, stock: 50, isFeatured: false },
    { name: 'Aula Personalizada Fitness', price: 15990, originalPrice: 19990, category: 'services', cashbackPercent: 10, rating: 4.6, reviewCount: 41, stock: 50, isFeatured: false },
    { name: 'Passe Mensal Transporte', price: 18990, originalPrice: 22000, category: 'mobility', cashbackPercent: 3, rating: 4.0, reviewCount: 10, stock: 999, isFeatured: false },
    { name: 'Voucher Uber R$100', price: 10000, originalPrice: 10000, category: 'mobility', cashbackPercent: 5, rating: 4.3, reviewCount: 67, stock: 500, isFeatured: false },
    { name: 'Curso Marketing Digital', price: 4990, originalPrice: 19990, category: 'digital', cashbackPercent: 12, rating: 4.4, reviewCount: 145, stock: 999, isFeatured: false },
    { name: 'E-book Investimentos', price: 2990, originalPrice: 4990, category: 'digital', cashbackPercent: 8, rating: 4.2, reviewCount: 89, stock: 999, isFeatured: false },
  ]

  for (const p of products) {
    await prisma.marketplaceProduct.create({
      data: { ...p, sellerName: 'Ricardo Mendes', description: p.name, isActive: true }
    })
  }
  console.log('Created', products.length, 'products')

  // Create test tickets
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
  const demoUser = await prisma.user.findFirst({ where: { email: 'carlos.silva@email.com' } })
  
  if (demoUser) {
    const ticketData = [
      { subject: 'Problema com saque', category: 'financial', priority: 'high', status: 'open' },
      { subject: 'CashBack não creditado', category: 'financial', priority: 'normal', status: 'in_progress' },
      { subject: 'Erro no aplicativo', category: 'technical', priority: 'urgent', status: 'open' },
      { subject: 'Dúvida sobre plano', category: 'account', priority: 'normal', status: 'resolved' },
      { subject: 'Alterar dados cadastrais', category: 'account', priority: 'low', status: 'closed' },
    ]
    
    for (const t of ticketData) {
      const ticket = await prisma.ticket.create({
        data: { userId: demoUser.id, subject: t.subject, category: t.category, priority: t.priority, status: t.status }
      })
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, userId: demoUser.id, message: `Olá, preciso de ajuda com: ${t.subject}`, isAdmin: false }
      })
      if (t.status !== 'open') {
        await prisma.ticketMessage.create({
          data: { ticketId: ticket.id, userId: adminUser?.id || demoUser.id, message: 'Estamos verificando sua solicitação. Em breve retornaremos.', isAdmin: true }
        })
      }
      if (t.status === 'resolved' || t.status === 'closed') {
        await prisma.ticketMessage.create({
          data: { ticketId: ticket.id, userId: adminUser?.id || demoUser.id, message: 'Sua solicitação foi resolvida. Obrigado pelo contato!', isAdmin: true }
        })
      }
    }
    console.log('Created test tickets')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
