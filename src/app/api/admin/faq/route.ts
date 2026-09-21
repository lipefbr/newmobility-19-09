import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const DEFAULT_FAQS = [
  {
    question: 'Como funciona o Cashback da NewMobility?',
    answer: 'O Cashback NewMobility é dividido em três matrizes: Entrada (4x5), Residual (4x7) e Vendas (4x9). Cada compra ou indicação qualificada gera cashback que é creditado na sua carteira correspondente (Saque, Mobilidade, Compras, Refeição, Farmácia ou Gratificação).',
    category: 'cashback',
    sortOrder: 1,
  },
  {
    question: 'Como faço para sacar meus ganhos?',
    answer: 'Para sacar, acesse a aba "Financeiro" e clique em "Solicitar Saque". O valor mínimo de saque é R$ 50,00. Você deve ter uma chave PIX cadastrada e verificada. Saques são processados em até 48 horas úteis.',
    category: 'financeiro',
    sortOrder: 2,
  },
  {
    question: 'Como funciona o sistema de indicações?',
    answer: 'Ao se cadastrar, você recebe um código de indicação único. Compartilhe este código; quando alguém se cadastrar usando ele, será vinculado à sua rede. Você recebe cashback e pontos por cada indicação ativa.',
    category: 'indicacoes',
    sortOrder: 3,
  },
  {
    question: 'Como funciona o Plano de Carreira?',
    answer: 'O Plano de Carreira recompensa usuários ativos com base nos pontos acumulados. Existem 5 níveis: Bronze, Prata, Ouro, Diamante e Black. Cada nível possui um bônus mensal crescente. Suba de nível acumulando pontos através de indicações, compras e atividades.',
    category: 'carreira',
    sortOrder: 4,
  },
  {
    question: 'O que são Gratificações?',
    answer: 'Gratificações são valores creditados em carteira específica (gratificação) que podem ser usados em produtos e serviços parceiros. Elas são distribuídas conforme suas atividades e conquistas na plataforma.',
    category: 'gratificacoes',
    sortOrder: 5,
  },
  {
    question: 'Como participar dos eventos da plataforma?',
    answer: 'Acesse a aba "Eventos" no app. Você verá webinars, encontros presenciais, lançamentos e promoções. Clique em "Inscrever-se" para confirmar sua participação. Eventos online terão link de reunião; presenciais terão local.',
    category: 'eventos',
    sortOrder: 6,
  },
  {
    question: 'Os jogos e apostas são permitidos?',
    answer: 'Sim! Oferecemos mini jogos (Jogo da Velha, Memória, Adivinhação, Cobra) e apostas esportivas. Ao vencer jogos, você acumula pontos que contribuem para seu plano de carreira. Apostas esportivas exigem saldo em carteira.',
    category: 'jogos',
    sortOrder: 7,
  },
  {
    question: 'Como posso obter suporte?',
    answer: 'Acesse a aba "Suporte" e abra um ticket. Nossa equipe responde em até 24 horas em dias úteis. Para urgências, marque o ticket como prioridade alta.',
    category: 'suporte',
    sortOrder: 8,
  },
  {
    question: 'Como alterar meu plano?',
    answer: 'Acesse "Planos" no menu. Você pode fazer upgrade a qualquer momento pagando apenas a diferença proporcional. Downgrade só é permitido no final do ciclo contratado.',
    category: 'planos',
    sortOrder: 9,
  },
  {
    question: 'Como funciona a verificação em duas etapas (2FA)?',
    answer: 'A 2FA adiciona uma camada extra de segurança à sua conta. Acesse "Perfil > Segurança" para ativar usando Google Authenticator ou código por SMS. Recomendamos fortemente a ativação para proteger seus saldos.',
    category: 'seguranca',
    sortOrder: 10,
  },
]

async function seedDefaultFAQsIfEmpty() {
  const count = await prisma.fAQ.count()
  if (count > 0) return
  for (const f of DEFAULT_FAQS) {
    await prisma.fAQ.create({ data: f })
  }
}

// GET — list all FAQs
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    await seedDefaultFAQsIfEmpty()

    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return success({ faqs })
  } catch (err) {
    console.error('Admin faq GET error:', err)
    return error('Failed to fetch FAQs', 500)
  }
}

// POST — create a new FAQ
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      question,
      answer,
      category = 'geral',
      isActive = true,
      sortOrder = 99,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!question || !answer) return error('question and answer are required', 400)

    const created = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category: category || 'geral',
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 0,
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin faq POST error:', err)
    return error('Failed to create FAQ', 500)
  }
}
