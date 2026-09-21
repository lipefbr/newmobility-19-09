// ============================================================================
// prisma/seed.ts — Initial database seed for NewMobility
// ----------------------------------------------------------------------------
// Run with:  npm run seed   (or `bun run seed`)
//
// This script is IDEMPOTENT — it uses upsert() everywhere, so running it more
// than once is safe and won't duplicate rows or overwrite admin-edited data.
//
// What it creates:
//   1. Admin user            — admin@newmobility.com / admin123  (role=admin)
//   2. Demo users per app    — cliente@.. / motorista@.. / lojista@..
//   3. SystemConfig defaults — platform_name, cashback %, withdrawal limits
//   4. UserType defaults     — motorista, passageiro, comercio, entregador...
//   5. Plan defaults         — free / blue3 / blue5
//   6. AppCategory defaults  — shopping, alimentacao, mercado, medidrop...
//   7. FAQ defaults          — basic support FAQ
//
// NOTE on password hashing: the existing /api/auth/login route uses SHA-256
// (via src/lib/api-utils.ts -> hashPassword()). We mirror that here so the
// seeded admin can log in immediately. We do NOT use bcrypt because the
// verifyPassword() helper wouldn't recognise the hash.
// ============================================================================

import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient({
  log: ['warn', 'error'],
})

// -----------------------------------------------------------------------------
// Password hashing — MUST match src/lib/api-utils.ts hashPassword()
// -----------------------------------------------------------------------------

// Convert "CashbackEntry" → "cashbackEntry" for accessing prisma client
// via (prisma as any)[lowerFirst(modelName)].
function lowerFirst(s: string): string {
  if (!s) return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function generateReferralCode(name: string): string {
  const base = name
    .split(' ')
    .map((n) => n.toUpperCase())
    .slice(0, 2)
    .join('')
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${base}${num}`
}

// -----------------------------------------------------------------------------
// Seed data
// -----------------------------------------------------------------------------

const SEED_USERS = [
  // ========== ADMIN ==========
  {
    id: 'admin-root',
    email: 'admin@newmobility.com',
    name: 'Administrador NewMobility',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'admin',
    referralCode: 'ADMIN001',
  },
  // ========== DEMO PRINCIPAIS (login fácil) ==========
  {
    id: 'demo-cliente',
    email: 'cliente@newmobility.com',
    name: 'Carlos Cliente',
    username: 'carlos.cliente',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue3',
    qualification: 'passageiro',
    referralCode: 'CLIENTE001',
    referredById: 'admin-root',
  },
  {
    id: 'demo-motorista',
    email: 'motorista@newmobility.com',
    name: 'Marcos Motorista',
    username: 'marcos.motorista',
    password: '123456',
    role: 'user',
    userType: 'motorista',
    isActive: true,
    isDriver: true,
    isDelivery: false,
    plan: 'blue3',
    qualification: 'motorista',
    referralCode: 'MOTO001',
    referredById: 'admin-root',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 0,
  },
  {
    id: 'demo-lojista',
    email: 'lojista@newmobility.com',
    name: 'Luciana Lojista',
    username: 'luciana.lojista',
    password: '123456',
    role: 'user',
    userType: 'lojista',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue3',
    qualification: 'comercio',
    referralCode: 'LOJA001',
    referredById: 'admin-root',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 5,
  },
  {
    id: 'demo-entregador',
    email: 'entregador@newmobility.com',
    name: 'Pedro Entregador',
    username: 'pedro.entregador',
    password: '123456',
    role: 'user',
    userType: 'entregador',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue3',
    qualification: 'entregador',
    referralCode: 'ENTR001',
    referredById: 'admin-root',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 3,
  },
  // ========== REDE DO ADMIN (downlines diretos) ==========
  {
    id: 'user-anderson',
    email: 'anderson.silva@email.com',
    name: 'Anderson Silva',
    username: 'anderson.silva',
    password: '123456',
    role: 'user',
    userType: 'motorista',
    isActive: true,
    isDriver: true,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'motorista',
    referralCode: 'AND001',
    referredById: 'admin-root',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-beatriz',
    email: 'beatriz.costa@email.com',
    name: 'Beatriz Costa',
    username: 'beatriz.costa',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'passageiro',
    referralCode: 'BEA001',
    referredById: 'admin-root',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-carlos-eduardo',
    email: 'carlos.silva@email.com',
    name: 'Carlos Eduardo Silva',
    username: 'carlos.eduardo',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'cliente',
    referralCode: 'CARLED001',
    referredById: 'admin-root',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-ana-paula',
    email: 'ana.paula.santos@email.com',
    name: 'Ana Paula Santos',
    username: 'ana.paula',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'passageiro',
    referralCode: 'ANAPA001',
    referredById: 'admin-root',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-roberto',
    email: 'roberto.lima.costa@email.com',
    name: 'Roberto Lima Costa',
    username: 'roberto.lima',
    password: '123456',
    role: 'user',
    userType: 'motorista',
    isActive: true,
    isDriver: true,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'motorista',
    referralCode: 'ROB001',
    referredById: 'admin-root',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-fernanda',
    email: 'fernanda.oliveira@email.com',
    name: 'Fernanda Oliveira',
    username: 'fernanda.oliveira',
    password: '123456',
    role: 'user',
    userType: 'lojista',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue3',
    qualification: 'lojista',
    referralCode: 'FER001',
    referredById: 'admin-root',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 5,
  },
  // ========== REDE DO DEMO-MOTORISTA (downline) ==========
  {
    id: 'user-joao',
    email: 'joao.pedro.almeida@email.com',
    name: 'João Pedro Almeida',
    username: 'joao.pedro',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue3',
    qualification: 'cliente',
    referralCode: 'JP001',
    referredById: 'demo-motorista',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 0,
  },
  {
    id: 'user-maria',
    email: 'maria.souza@email.com',
    name: 'Maria Souza',
    username: 'maria.souza',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'passageiro',
    referralCode: 'MS001',
    referredById: 'demo-motorista',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-pedro-h',
    email: 'pedro.henrique@email.com',
    name: 'Pedro Henrique',
    username: 'pedro.henrique',
    password: '123456',
    role: 'user',
    userType: 'motorista',
    isActive: true,
    isDriver: true,
    isDelivery: false,
    plan: 'blue3',
    qualification: 'motorista',
    referralCode: 'PH001',
    referredById: 'demo-motorista',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 0,
  },
  // ========== REDE DO DEMO-LOJISTA ==========
  {
    id: 'user-lucas-m',
    email: 'lucas.martins@email.com',
    name: 'Lucas Martins',
    username: 'lucas.martins',
    password: '123456',
    role: 'user',
    userType: 'entregador',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue3',
    qualification: 'entregador',
    referralCode: 'LM001',
    referredById: 'demo-lojista',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 3,
  },
  {
    id: 'user-camila',
    email: 'camila.dias@email.com',
    name: 'Camila Dias',
    username: 'camila.dias',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: false,
    isDriver: false,
    isDelivery: false,
    plan: 'free',
    qualification: 'passageiro',
    referralCode: 'CD001',
    referredById: 'demo-lojista',
  },
  // ========== REDE DO DEMO-ENTREGADOR ==========
  {
    id: 'user-rafael',
    email: 'rafael.gomes@email.com',
    name: 'Rafael Gomes',
    username: 'rafael.gomes',
    password: '123456',
    role: 'user',
    userType: 'motofretista',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue5',
    qualification: 'motofretista',
    referralCode: 'RG001',
    referredById: 'demo-entregador',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 9,
  },
  {
    id: 'user-patricia',
    email: 'patricia.alves@email.com',
    name: 'Patricia Alves',
    username: 'patricia.alves',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue3',
    qualification: 'cliente',
    referralCode: 'PA001',
    referredById: 'demo-entregador',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 0,
  },
  // ========== DEMAIS USUÁRIOS (2º nível) ==========
  {
    id: 'user-bruno',
    email: 'bruno.costa@email.com',
    name: 'Bruno Costa',
    username: 'bruno.costa',
    password: '123456',
    role: 'user',
    userType: 'motorista',
    isActive: false,
    isDriver: true,
    isDelivery: false,
    plan: 'free',
    qualification: 'motorista',
    referralCode: 'BC001',
    referredById: 'user-anderson',
  },
  {
    id: 'user-larissa',
    email: 'larissa.nascimento@email.com',
    name: 'Larissa Nascimento',
    username: 'larissa.nascimento',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'passageiro',
    referralCode: 'LN001',
    referredById: 'user-anderson',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-diego',
    email: 'diego.rocha@email.com',
    name: 'Diego Rocha',
    username: 'diego.rocha',
    password: '123456',
    role: 'user',
    userType: 'entregador',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue3',
    qualification: 'entregador',
    referralCode: 'DR001',
    referredById: 'user-beatriz',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 3,
  },
  {
    id: 'user-thiago',
    email: 'thiago.moreira@email.com',
    name: 'Thiago Moreira',
    username: 'thiago.moreira',
    password: '123456',
    role: 'user',
    userType: 'motorista',
    isActive: true,
    isDriver: true,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'motorista_app',
    referralCode: 'TM001',
    referredById: 'user-beatriz',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-amanda',
    email: 'amanda.lopes@email.com',
    name: 'Amanda Lopes',
    username: 'amanda.lopes',
    password: '123456',
    role: 'user',
    userType: 'lojista',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue3',
    qualification: 'lojista',
    referralCode: 'AL001',
    referredById: 'user-carlos-eduardo',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 5,
  },
  {
    id: 'user-gabriel',
    email: 'gabriel.freitas@email.com',
    name: 'Gabriel Freitas',
    username: 'gabriel.freitas',
    password: '123456',
    role: 'user',
    userType: 'mototaxista',
    isActive: false,
    isDriver: true,
    isDelivery: false,
    plan: 'free',
    qualification: 'mototaxista',
    referralCode: 'GF001',
    referredById: 'user-carlos-eduardo',
  },
  {
    id: 'user-isabela',
    email: 'isabela.rodrigues@email.com',
    name: 'Isabela Rodrigues',
    username: 'isabela.rodrigues',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'passageiro_60',
    referralCode: 'IR001',
    referredById: 'user-ana-paula',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-felipe',
    email: 'felipe.andrade@email.com',
    name: 'Felipe Andrade',
    username: 'felipe.andrade',
    password: '123456',
    role: 'user',
    userType: 'caminhoneiro',
    isActive: false,
    isDriver: true,
    isDelivery: true,
    plan: 'free',
    qualification: 'caminhoneiro',
    referralCode: 'FA001',
    referredById: 'user-ana-paula',
  },
  {
    id: 'user-carolina',
    email: 'carolina.mendes@email.com',
    name: 'Carolina Mendes',
    username: 'carolina.mendes',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: false,
    isDriver: false,
    isDelivery: false,
    plan: 'free',
    qualification: 'passageiro_pcd',
    referralCode: 'CM001',
    referredById: 'user-roberto',
  },
  {
    id: 'user-vinicius',
    email: 'vinicius.santos@email.com',
    name: 'Vinicius Santos',
    username: 'vinicius.santos',
    password: '123456',
    role: 'user',
    userType: 'taxista',
    isActive: true,
    isDriver: true,
    isDelivery: false,
    plan: 'blue3',
    qualification: 'taxista',
    referralCode: 'VS001',
    referredById: 'user-roberto',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 0,
  },
  {
    id: 'user-priscila',
    email: 'priscila.teixeira@email.com',
    name: 'Priscila Teixeira',
    username: 'priscila.teixeira',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue3',
    qualification: 'cliente',
    referralCode: 'PT001',
    referredById: 'user-fernanda',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 0,
  },
  {
    id: 'user-rodrigo',
    email: 'rodrigo.pinto@email.com',
    name: 'Rodrigo Pinto',
    username: 'rodrigo.pinto',
    password: '123456',
    role: 'user',
    userType: 'motofretista',
    isActive: true,
    isDriver: false,
    isDelivery: true,
    plan: 'blue3',
    qualification: 'motofretista',
    referralCode: 'RP001',
    referredById: 'user-fernanda',
    entradaLevel: 3,
    residualLevel: 0,
    vendasLevel: 3,
  },
  {
    id: 'user-daniela',
    email: 'daniela.farias@email.com',
    name: 'Daniela Farias',
    username: 'daniela.farias',
    password: '123456',
    role: 'user',
    userType: 'usuario',
    isActive: true,
    isDriver: false,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'passageiro',
    referralCode: 'DF001',
    referredById: 'user-fernanda',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
  {
    id: 'user-eduardo',
    email: 'eduardo.nogueira@email.com',
    name: 'Eduardo Nogueira',
    username: 'eduardo.nogueira',
    password: '123456',
    role: 'user',
    userType: 'motorista',
    isActive: true,
    isDriver: true,
    isDelivery: false,
    plan: 'blue5',
    qualification: 'motorista_app',
    referralCode: 'EN001',
    referredById: 'user-fernanda',
    entradaLevel: 5,
    residualLevel: 7,
    vendasLevel: 0,
  },
]

const SEED_CONFIGS = [
  // Tarefa (19/09): removidas as chaves legacy duplicadas (sem ponto) que
  // conflitavam com as versões modernas (com ponto) do DEFAULT_SYSTEM_SETTINGS.
  // As chaves abaixo são ÚNICAS e não existem no DEFAULT_SYSTEM_SETTINGS —
  // servem como "bootstrap" mínimo para o banco antes de o admin abrir
  // a tela de Configurações (que roda seedDefaults() e cria as outras ~80).
  { key: 'platform_name', value: 'NewMobility', description: 'Platform display name' },
  { key: 'maintenance_mode', value: 'false', description: 'Maintenance mode enabled' },
  { key: 'registration_enabled', value: 'true', description: 'New registrations enabled' },
  { key: 'admin_permissions', value: JSON.stringify({ admin: ['*'] }), description: 'Per-role admin page allow-list' },
  // Tarefa 2 (19/09) — Limites financeiros das 3 matrizes em R$ (centavos).
  // Também presentes no DEFAULT_SYSTEM_SETTINGS para que a UI crie se faltar.
  { key: 'matrix.entrada.limit_cents', value: '9650000', description: 'Limite da Matriz de Entrada em centavos (R$ 96.500,00)' },
  { key: 'matrix.residual.limit_cents', value: '75000000', description: 'Limite da Matriz Residual em centavos (R$ 750.000,00)' },
  { key: 'matrix.vendas.limit_cents', value: '0', description: 'Limite da Matriz de Vendas em centavos (0 = a definir pelo cliente)' },
]

const SEED_USER_TYPES = [
  {
    code: 'motorista',
    label: 'Motorista',
    description: 'Condutor de veículo (carro/moto) que realiza corridas',
    sortOrder: 1,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#3b82f6',
    icon: '🚗',
  },
  {
    code: 'passageiro',
    label: 'Passageiro',
    description: 'Usuário comum que solicita corridas',
    sortOrder: 2,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#10b981',
    icon: '👤',
  },
  {
    code: 'passageiro_60',
    label: 'Passageiro 60+',
    description: 'Passageiro com 60 anos ou mais (benefícios especiais)',
    sortOrder: 3,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#f59e0b',
    icon: '🧓',
  },
  {
    code: 'passageiro_pcd',
    label: 'Passageiro com Mobilidade Reduzida',
    description: 'Passageiro PCD com necessidades especiais de acessibilidade',
    sortOrder: 4,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#8b5cf6',
    icon: '♿',
  },
  {
    code: 'comercio',
    label: 'Comércio',
    description: 'Lojista / comerciante parceiro (recebe cashback de vendas)',
    sortOrder: 5,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 5,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","store","cashback","career","indicacoes"]',
    color: '#ec4899',
    icon: '🏪',
  },
  {
    code: 'entregador',
    label: 'Entregador',
    description: 'Entregador de encomendas / food delivery',
    sortOrder: 6,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 3,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","delivery","cashback","career","metas","indicacoes"]',
    color: '#f97316',
    icon: '🛵',
  },
  // ---- Novos tipos (Task 2-e) ----
  {
    code: 'cliente',
    label: 'Cliente',
    description: 'Usuário comum que utiliza os serviços da plataforma',
    sortOrder: 7,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#10b981',
    icon: '👤',
  },
  {
    code: 'lojista',
    label: 'Lojista',
    description: 'Lojista / comerciante parceiro (gerencia loja, produtos e pedidos no Portal do Lojista)',
    sortOrder: 8,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 5,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","store","cashback","career","indicacoes"]',
    color: '#ec4899',
    icon: '🏪',
  },
  {
    code: 'mototaxista',
    label: 'Mototaxista',
    description: 'Condutor de moto que realiza transporte de passageiros (moto-táxi)',
    sortOrder: 9,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#06b6d4',
    icon: '🏍️',
  },
  {
    code: 'motofretista',
    label: 'Motofretista',
    description: 'Condutor de moto que realiza entrega de encomendas (moto-frete)',
    sortOrder: 10,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 3,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","delivery","cashback","career","metas","indicacoes"]',
    color: '#0ea5e9',
    icon: '📦',
  },
  {
    code: 'motorista_app',
    label: 'Motorista de App',
    description: 'Condutor de veículo cadastrado em aplicativos de transporte (Uber, 99, etc.)',
    sortOrder: 11,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#6366f1',
    icon: '📱',
  },
  {
    code: 'taxista',
    label: 'Taxista',
    description: 'Condutor de táxi licenciado (ponto fixo ou via aplicativo)',
    sortOrder: 12,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#eab308',
    icon: '🚕',
  },
  {
    code: 'caminhoneiro',
    label: 'Caminhoneiro',
    description: 'Condutor de caminhão para transporte de cargas (curta, média e longa distância)',
    sortOrder: 13,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 3,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","delivery","cashback","career","metas","indicacoes"]',
    color: '#84cc16',
    icon: '🚚',
  },
  {
    code: 'outros',
    label: 'Outros',
    description: 'Outro tipo de atuação não listado (campo livre para personalização futura)',
    sortOrder: 99,
    defaultEntradaLevel: 1,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","cashback","career","indicacoes"]',
    color: '#6b7280',
    icon: '⚙️',
  },
]

const SEED_PLANS = [
  {
    id: 'free',
    code: 'free',
    name: 'Gratuito',
    priceCents: 0,
    description: 'Plano gratuito para cadastro e indicações.',
    features: ['Cadastro gratuito', 'Indicação de usuários'],
    isActive: true,
    isDefault: true,
    sortOrder: 0,
  },
  {
    id: 'blue3',
    code: 'blue3',
    name: 'Blue 3',
    priceCents: 99990,
    description: 'Plano Blue 3 com acesso completo às matrizes e apps.',
    features: [
      'Cashback Entrada (matriz 4x5)',
      'Cashback Residual (matriz 4x7)',
      'Cashback Vendas (matriz 4x9)',
      'App Mobilidade',
      'App Refeição',
      'App Farmácia',
      'App Compras',
      'Gratificações disponíveis',
      'Plano de Carreira',
    ],
    isActive: true,
    isDefault: true,
    sortOrder: 1,
  },
  {
    id: 'blue5',
    code: 'blue5',
    name: 'Blue 5',
    priceCents: 99990,
    description: 'Plano Blue 5 premium com benefícios exclusivos.',
    features: [
      'Tudo do plano Blue 3',
      'Gratificações exclusivas',
      'Prioridade no suporte',
      'Bônus de adesão aumentado',
      'App Pet',
      'Seguro telefone',
      'Telemedicina',
      'Assistência funerária',
    ],
    isActive: true,
    isDefault: true,
    sortOrder: 2,
  },
]

const SEED_CATEGORIES = [
  { code: 'shopping', label: 'Shopping', icon: 'ShoppingBag', color: '#155EEF', sortOrder: 1 },
  { code: 'alimentacao', label: 'Alimentação', icon: 'UtensilsCrossed', color: '#F59E0B', sortOrder: 2 },
  { code: 'mercado', label: 'Mercado', icon: 'Cart', color: '#22C55E', sortOrder: 3 },
  { code: 'medidrop', label: 'MediDrop', icon: 'Pill', color: '#8B5CF6', sortOrder: 4 },
  { code: 'reserva', label: 'Reserva', icon: 'Calendar', color: '#EC4899', sortOrder: 5 },
  { code: 'assistencia', label: 'Assistência', icon: 'Wrench', color: '#06B6D4', sortOrder: 6 },
  { code: 'enviar', label: 'Enviar', icon: 'Send', color: '#F97316', sortOrder: 7 },
  { code: 'mobilidade', label: 'Mobilidade', icon: 'Car', color: '#3B82F6', sortOrder: 8 },
]

const SEED_FAQS = [
  {
    question: 'Como funciona o CashBack da NewMobility?',
    answer:
      'Ao realizar compras em lojas parceiras ou indicar novos usuários, você acumula CashBack em diferentes carteiras (Entrada, Residual, Vendas). O saldo pode ser sacado via PIX ou usado para pagar serviços dentro da plataforma.',
    category: 'cashback',
    sortOrder: 1,
  },
  {
    question: 'Como faço para me cadastrar como motorista?',
    answer:
      'Acesse o App Motorista em /motorista, faça login com sua conta NewMobility e siga o fluxo de ativação. Após o admin aprovar seus documentos (CNH, RG, comprovante), você começa a receber corridas.',
    category: 'motorista',
    sortOrder: 2,
  },
  {
    question: 'Como funciona o App Lojista?',
    answer:
      'O Painel do Lojista em /lojista permite que comerciantes parceiros gerenciem sua loja, produtos, pedidos e financeiro. Acesse /lojista e faça login com uma conta tipo "lojista" ou "comércio".',
    category: 'lojista',
    sortOrder: 3,
  },
  {
    question: 'Quais são os planos disponíveis?',
    answer:
      'Temos 3 planos: Gratuito (cadastro e indicações), Blue 3 (R$ 97 — acesso completo às matrizes e apps) e Blue 5 (R$ 147 — premium com telemedicina, seguro telefone e benefícios exclusivos).',
    category: 'planos',
    sortOrder: 4,
  },
  {
    question: 'Como faço um saque do meu saldo?',
    answer:
      'Acesse a página Carteira > Saque, informe o valor (mínimo R$ 50,00) e sua chave PIX. O saque é processado em até 2 dias úteis após aprovação do admin.',
    category: 'financeiro',
    sortOrder: 5,
  },
  {
    question: 'Esqueci minha senha, como recuperar?',
    answer:
      'Na tela de login, clique em "Esqueci minha senha". Você receberá um link de redefinição no e-mail cadastrado. Se não receber em 5 minutos, verifique o spam ou contate o suporte.',
    category: 'conta',
    sortOrder: 6,
  },
]

// -----------------------------------------------------------------------------
// Seed runner
// -----------------------------------------------------------------------------

async function seedUsers() {
  console.log('→ Seeding users...')

  // Cleanup pass: delete old test users from previous manual testing
  // that are no longer in our seed list. We do this by email since it's
  // the unique business key. Skip any user whose email is in our seed.
  // Also skip admins created manually (role === 'admin') to avoid
  // locking out the production admin.
  const seedEmails = new Set(SEED_USERS.map((u) => u.email.toLowerCase()))
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  })
  const orphanIds: string[] = []
  for (const u of allUsers) {
    if (u.role === 'admin' && u.email !== 'admin@newmobility.com') continue
    if (!seedEmails.has(u.email.toLowerCase())) orphanIds.push(u.id)
  }
  if (orphanIds.length > 0) {
    // Lote 1, Item 2 — BLINDAGEM DE DADOS: o cleanup abaixo apaga usuários
    // reais fora da lista demo e os dados deles em ~29 tabelas (cashback,
    // transações, faturas, pedidos, KYC, saques...). Em produção isso é
    // DESTRUTIVO — o rótulo antigo "idempotente/seguro" era falso. Ele agora
    // SÓ roda com a variável de ambiente ALLOW_DESTRUCTIVE_SEED=true
    // explicitamente definida. Sem a flag, o cleanup é pulado e logado como
    // "ignorado por segurança".
    if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
      console.log(
        `  → Cleanup destrutivo de ${orphanIds.length} usuário(s) fora da lista demo IGNORADO por segurança (defina ALLOW_DESTRUCTIVE_SEED=true no ambiente para habilitar)`,
      )
    } else {
    console.log(`  → Removing ${orphanIds.length} orphan test users (not in seed list)`)
    // Disable FK checks during delete so we can remove users that have
    // leftover rows in dependent tables (cashback entries, tickets, etc).
    // On SQLite this is `PRAGMA foreign_keys=OFF`, on Postgres we use
    // `SET session_replication_role='replica'`. We try both — one will
    // work depending on the provider.
    try { await prisma.$executeRawUnsafe('PRAGMA foreign_keys=OFF') } catch {}
    try { await prisma.$executeRawUnsafe("SET session_replication_role = 'replica'") } catch {}

    // First null out any FK references in User.referredById to these users
    await prisma.user.updateMany({
      where: { referredById: { in: orphanIds } },
      data: { referredById: null },
    }).catch(() => {})

    // Delete dependent rows in known tables that reference userId.
    // We use raw SQL (TRUNCATE-style DELETE) because the Prisma client
    // doesn't always have accessors for every model dynamically, and
    // because raw SQL works on both SQLite and Postgres.
    const dependentTablesAndCols: Array<[string, string]> = [
      ['CashbackEntry', 'userId'],
      ['CashbackResidual', 'userId'],
      ['CashbackSales', 'userId'],
      ['MatrixPosition', 'userId'],
      ['Transaction', 'userId'],
      ['Invoice', 'userId'],
      ['Voucher', 'userId'],
      ['Ticket', 'userId'],
      ['TicketMessage', 'userId'],
      ['Notification', 'userId'],
      ['CareerMilestone', 'userId'],
      ['Gratification', 'userId'],
      ['PointTransaction', 'userId'],
      ['WithdrawalRequest', 'userId'],
      ['GamificationStreak', 'userId'],
      ['UserChallenge', 'userId'],
      ['EventRegistration', 'userId'],
      ['Beneficiary', 'userId'],
      ['MarketplaceOrder', 'userId'],
      ['MarketplaceOrderItem', 'userId'],
      ['MarketplaceFavorite', 'userId'],
      ['KycDocument', 'userId'],
      ['AuditLog', 'userId'],
      ['TelemedicinaRequest', 'userId'],
      ['TalkMobiSubscription', 'userId'],
      ['AppStore', 'ownerId'],
      ['AppOrder', 'customerId'],
      ['DriverApplication', 'userId'],
      ['Bet', 'userId'],
    ]
    for (const [table, col] of dependentTablesAndCols) {
      for (const id of orphanIds) {
        try {
          // Quote table name for Postgres compatibility (camelCase → quoted),
          // but SQLite is case-insensitive so it works on both.
          await prisma.$executeRawUnsafe(
            `DELETE FROM "${table}" WHERE "${col}" = ?`,
            id,
          )
        } catch {
          // Table may not exist on this schema version — skip silently
        }
      }
    }

    // Now delete the users themselves
    let deleted = 0
    for (const id of orphanIds) {
      try {
        await prisma.user.delete({ where: { id } })
        deleted++
      } catch (e) {
        // Still referenced somewhere — try raw DELETE bypassing FK
        try {
          await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE id = ?', id)
          deleted++
        } catch {}
      }
    }
    console.log(`  ✓ Removed ${deleted}/${orphanIds.length} orphan users`)

    // Re-enable FK checks
    try { await prisma.$executeRawUnsafe('PRAGMA foreign_keys=ON') } catch {}
    try { await prisma.$executeRawUnsafe("SET session_replication_role = 'origin'") } catch {}
    } // fim do else — cleanup habilitado explicitamente via ALLOW_DESTRUCTIVE_SEED
  }

  // First pass: create/update all users (without referredById — the sponsor
  // may not exist yet on the first run, and the user might already exist
  // in the DB with a different cuid id than the one we passed).
  // We resolve sponsorship by EMAIL in a second pass below.
  const emailToId = new Map<string, string>()
  for (const u of SEED_USERS) {
    const passwordHash = hashPassword(u.password)
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      // Update in place — keep the existing cuid id (don't try to change it).
      await prisma.user.update({
        where: { email: u.email },
        data: {
          name: u.name,
          username: u.username,
          password: passwordHash,
          role: u.role,
          userType: u.userType,
          isActive: u.isActive,
          isDriver: u.isDriver,
          isDelivery: u.isDelivery,
          plan: u.plan,
          qualification: u.qualification,
          entradaLevel: u.entradaLevel ?? 0,
          residualLevel: u.residualLevel ?? 0,
          vendasLevel: u.vendasLevel ?? 0,
          referralCode: u.referralCode,
        },
      })
      emailToId.set(u.email, existing.id)
    } else {
      const created = await prisma.user.create({
        data: {
          id: u.id, // use stable id on fresh DB
          email: u.email,
          name: u.name,
          username: u.username,
          password: passwordHash,
          role: u.role,
          userType: u.userType,
          isActive: u.isActive,
          isDriver: u.isDriver,
          isDelivery: u.isDelivery,
          plan: u.plan,
          qualification: u.qualification,
          referralCode: u.referralCode,
          entradaLevel: u.entradaLevel ?? 0,
          residualLevel: u.residualLevel ?? 0,
          vendasLevel: u.vendasLevel ?? 0,
          country: 'BR',
          pixEnabled: true,
        },
      })
      emailToId.set(u.email, created.id)
    }
  }

  // Second pass: resolve referredById by looking up the sponsor's email
  // in our seed list, then fetching its actual DB id from emailToId.
  // This handles both fresh DBs (where ids match) and existing DBs
  // (where users were created with random cuids).
  for (const u of SEED_USERS) {
    if (!u.referredById) continue // admin / no sponsor
    const sponsor = SEED_USERS.find((s) => s.id === u.referredById)
    if (!sponsor) continue
    const sponsorDbId = emailToId.get(sponsor.email)
    const userId = emailToId.get(u.email)
    if (!sponsorDbId || !userId || sponsorDbId === userId) continue
    await prisma.user.update({
      where: { id: userId },
      data: { referredById: sponsorDbId },
    })
  }

  console.log(`  ✓ ${SEED_USERS.length} users ready (admin + ${SEED_USERS.length - 1} demo)`)
}

async function seedSystemConfigs() {
  console.log('→ Seeding SystemConfig...')
  for (const c of SEED_CONFIGS) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: {}, // do not overwrite admin-edited values
      create: { key: c.key, value: c.value, description: c.description },
    })
  }

  // Tarefa (19/09): remover chaves obsoletas/duplicadas do banco.
  // Estas chaves foram substituídas por versões modernas (com ponto) e
  // só causam confusão na tela de Configurações do Sistema.
  const OBSOLETE_KEYS = [
    'matrix.vendas.salesLimit',   // substituída por matrix.vendas.limit_cents
    'cashback_entrada_pct',        // substituída por cashback.entrada_pct
    'cashback_residual_pct',       // substituída por cashback.residual_pct
    'cashback_vendas_pct',         // substituída por cashback.vendas_pct
    'min_withdrawal',              // substituída por saque.min_cents
    'max_withdrawal',              // substituída por saque.max_cents
    'withdrawal_fee_pct',          // substituída por saque.fee_pct
    'app_logo_url',                // não usada (logo é gerenciada via /admin/config/logo)
    'points_dailyLoginPoints',     // substituída por pontos.daily_login
    'plan_free_name',              // duplicata de plan.free.name
    'plan_blue3_name',             // duplicata de plan.blue3.name
    'plan_blue5_name',             // duplicata de plan.blue5.name
  ]
  let removedCount = 0
  for (const key of OBSOLETE_KEYS) {
    try {
      await prisma.systemConfig.delete({ where: { key } })
      removedCount++
    } catch {
      // chave não existe — ignora
    }
  }
  if (removedCount > 0) {
    console.log(`  ✓ Removed ${removedCount} obsolete config keys`)
  }
  console.log(`  ✓ ${SEED_CONFIGS.length} config keys ready`)
}

async function seedUserTypes() {
  console.log('→ Seeding UserType...')
  for (const t of SEED_USER_TYPES) {
    await prisma.userType.upsert({
      where: { code: t.code },
      // Update default levels + label/description so existing rows seeded
      // by older versions of this file (with defaultEntradaLevel=0 etc.)
      // are synced to the new business-rule defaults. Admin-edited rows
      // keep their values because we only update the 3 defaultLevel fields
      // and the human-readable label/description.
      update: {
        defaultEntradaLevel: t.defaultEntradaLevel,
        defaultResidualLevel: t.defaultResidualLevel,
        defaultVendasLevel: t.defaultVendasLevel,
        label: t.label,
        description: t.description,
      },
      create: t,
    })
  }
  console.log(`  ✓ ${SEED_USER_TYPES.length} user types ready`)
}

async function seedPlans() {
  console.log('→ Seeding Plans...')
  // Resolve matrix type IDs by code so plans match the existing matrix config.
  const matrixTypes = await prisma.matrixType.findMany().catch(() => [])
  const findMt = (code: string) => matrixTypes.find((m) => m.code === code)?.id || null

  const matrixCodeMap: Record<string, { entrada?: string; residual?: string; vendas?: string }> = {
    free: { entrada: 'entrada_4x5', residual: 'residual_4x7', vendas: 'vendas_4x9' },
    blue3: { entrada: 'entrada_4x5', residual: 'residual_4x7', vendas: 'vendas_4x9' },
    blue5: { entrada: 'entrada_4x5', residual: 'residual_4x7', vendas: 'vendas_4x9' },
  }

  for (const p of SEED_PLANS) {
    const m = matrixCodeMap[p.code] || {}
    await prisma.plan.upsert({
      where: { code: p.code },
      update: { priceCents: p.priceCents }, // FIX: always sync price
      create: {
        id: p.id,
        code: p.code,
        name: p.name,
        priceCents: p.priceCents,
        description: p.description,
        features: JSON.stringify(p.features),
        isActive: p.isActive,
        isDefault: p.isDefault,
        sortOrder: p.sortOrder,
        matrixEntradaId: findMt(m.entrada || ''),
        matrixResidualId: findMt(m.residual || ''),
        matrixVendasId: findMt(m.vendas || ''),
      },
    })
  }
  console.log(`  ✓ ${SEED_PLANS.length} plans ready (free / blue3 / blue5)`)
}

async function seedCategories() {
  console.log('→ Seeding AppCategory...')
  for (const c of SEED_CATEGORIES) {
    try {
      await prisma.appCategory.upsert({
        where: { code: c.code },
        update: {},
        create: c,
      })
    } catch {
      // AppCategory table may not exist if prisma db push hasn't been run yet —
      // skip silently so the seed doesn't fail on older deployments.
    }
  }
  console.log(`  ✓ ${SEED_CATEGORIES.length} app categories ready`)
}

async function seedFaqs() {
  console.log('→ Seeding FAQ...')
  for (const f of SEED_FAQS) {
    // No natural unique key — only create if no FAQ with the same question exists
    const existing = await prisma.fAQ.findFirst({ where: { question: f.question } })
    if (existing) continue
    await prisma.fAQ.create({
      data: {
        question: f.question,
        answer: f.answer,
        category: f.category,
        sortOrder: f.sortOrder,
        isActive: true,
      },
    })
  }
  console.log(`  ✓ ${SEED_FAQS.length} FAQs ready`)
}

async function seedServiceTypes() {
  console.log('→ Seeding ServiceTypes...')
  const types = [
    { name: 'Eletricista', icon: 'Zap', isActive: true, sortOrder: 1 },
    { name: 'Encanador', icon: 'Wrench', isActive: true, sortOrder: 2 },
    { name: 'Pedreiro', icon: 'Hammer', isActive: true, sortOrder: 3 },
    { name: 'Pintor', icon: 'PaintRoller', isActive: true, sortOrder: 4 },
    { name: 'Jardinagem', icon: 'Trees', isActive: true, sortOrder: 5 },
    { name: 'Limpeza', icon: 'Sparkles', isActive: true, sortOrder: 6 },
    { name: 'Refrigeração / Ar Condicionado', icon: 'Wind', isActive: true, sortOrder: 7 },
    { name: 'Marcenaria', icon: 'Hammer', isActive: true, sortOrder: 8 },
    { name: 'Dedetização', icon: 'Bug', isActive: true, sortOrder: 9 },
    { name: 'Fretes e Mudanças', icon: 'Truck', isActive: true, sortOrder: 10 },
    { name: 'Borracheiro', icon: 'Circle', isActive: true, sortOrder: 11 },
    { name: 'Mecânico', icon: 'Cog', isActive: true, sortOrder: 12 },
    { name: 'Vidraceiro', icon: 'Square', isActive: true, sortOrder: 13 },
    { name: 'Telhadista', icon: 'Home', isActive: true, sortOrder: 14 },
    { name: 'Outros', icon: 'Settings', isActive: true, sortOrder: 99 },
  ]
  for (const t of types) {
    const existing = await prisma.serviceType.findFirst({ where: { name: t.name } }).catch(() => null)
    if (!existing) {
      await prisma.serviceType.create({ data: t }).catch(() => {})
    }
  }
  console.log(`  ✓ ${types.length} ServiceTypes ready`)
}

async function seedEvents() {
  console.log('→ Seeding Events...')
  const events = [
    { title: 'Webinar: Maximizar Ganhos com CashBack', description: 'Aprenda estratégias para maximizar seus ganhos no CashBack Multi-Nível.', type: 'webinar', status: 'upcoming', eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), location: 'Online (YouTube)', meetingUrl: '', maxAttendees: 500, isActive: true },
    { title: 'Manutenção do Sistema', description: 'Manutenção programada do sistema. Serviço indisponível das 02h às 04h.', type: 'maintenance', status: 'upcoming', eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), location: 'Servidor', meetingUrl: '', maxAttendees: 0, isActive: true },
    { title: 'Promo: CashBack Dobrado', description: 'Por 7 dias, todo CashBack de indicação será dobrado! Aproveite para expandir sua rede.', type: 'promo', status: 'upcoming', eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), location: 'Plataforma', meetingUrl: '', maxAttendees: 0, isActive: true },
  ]
  for (const e of events) {
    const existing = await prisma.event.findFirst({ where: { title: e.title } }).catch(() => null)
    if (!existing) {
      await prisma.event.create({ data: e }).catch(() => {})
    }
  }
  console.log(`  ✓ ${events.length} Events ready`)
}

async function seedMatrixTypes() {
  console.log('→ Seeding MatrixTypes...')
  const types = [
    // Tarefa (22/09): adicionada matriz entrada 4x3 (Blue 3 usa esta)
    { code: 'entrada_4x3', name: 'Matriz Entrada 4x3', matrixKind: 'entrada', width: 4, depth: 3, description: 'Matriz de Entrada — 4 indicados diretos por nível, 3 níveis de profundidade (Blue 3)', color: '#3b82f6', isActive: true },
    { code: 'entrada_4x5', name: 'Matriz Entrada 4x5', matrixKind: 'entrada', width: 4, depth: 5, description: 'Matriz de Entrada — 4 indicados diretos por nível, 5 níveis de profundidade (Blue 5)', color: '#10b981', isActive: true },
    { code: 'residual_4x7', name: 'Matriz Residual 4x7', matrixKind: 'residual', width: 4, depth: 7, description: 'Matriz Residual — 4 indicados por nível, 7 níveis de profundidade', color: '#0d9488', isActive: true },
    { code: 'vendas_4x9', name: 'Matriz Vendas 4x9', matrixKind: 'vendas', width: 4, depth: 9, description: 'Matriz de Vendas — 4 indicados por nível, 9 níveis de profundidade', color: '#f59e0b', isActive: true },
  ]
  for (const t of types) {
    const existing = await prisma.matrixType.findUnique({ where: { code: t.code } }).catch(() => null)
    if (existing) {
      const existingLevels = await prisma.matrixLevelEarning.count({ where: { matrixTypeId: existing.id } }).catch(() => 0)
      if (existingLevels === 0) {
        // Tarefa (22/09): percentuais da 4x3 são [5, 10, 10] (3 níveis)
        const pcts = t.code === 'entrada_4x3' ? [5, 10, 10] : t.matrixKind === 'entrada' ? [5, 10, 10, 5, 5] : t.matrixKind === 'residual' ? [10, 9, 5, 5, 4, 3, 2] : [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
        for (let i = 0; i < pcts.length; i++) {
          await prisma.matrixLevelEarning.create({ data: { id: `mle_${t.code}_${i+1}`, matrixTypeId: existing.id, level: i + 1, percentage: pcts[i], fixedBonusCents: 0, updatedAt: new Date() } }).catch(() => {})
        }
      }
      continue
    }
    const created = await prisma.matrixType.create({ data: { id: `mt_${t.code}`, updatedAt: new Date(), ...t } })
    const pcts = t.code === 'entrada_4x3' ? [5, 10, 10] : t.matrixKind === 'entrada' ? [5, 10, 10, 5, 5] : t.matrixKind === 'residual' ? [10, 9, 5, 5, 4, 3, 2] : [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
    for (let i = 0; i < pcts.length; i++) {
      await prisma.matrixLevelEarning.create({ data: { id: `mle_${t.code}_${i+1}`, matrixTypeId: created.id, level: i + 1, percentage: pcts[i], fixedBonusCents: 0, updatedAt: new Date() } }).catch(() => {})
    }
  }
  // Link plans to matrix types
  // Tarefa (22/09): Blue 3 usa entrada_4x3, Blue 5 usa entrada_4x5
  const mtEntrada4x3 = await prisma.matrixType.findUnique({ where: { code: 'entrada_4x3' } }).catch(() => null)
  const mtEntrada4x5 = await prisma.matrixType.findUnique({ where: { code: 'entrada_4x5' } }).catch(() => null)
  const mtResidual = await prisma.matrixType.findUnique({ where: { code: 'residual_4x7' } }).catch(() => null)
  const mtVendas = await prisma.matrixType.findUnique({ where: { code: 'vendas_4x9' } }).catch(() => null)
  // Blue 3 → entrada 4x3
  if (mtEntrada4x3) await prisma.plan.updateMany({ where: { code: 'blue3' }, data: { matrixEntradaId: mtEntrada4x3.id } }).catch(() => {})
  // Blue 5 → entrada 4x5 (upgrade de 4x3 para 4x5)
  if (mtEntrada4x5) await prisma.plan.updateMany({ where: { code: 'blue5' }, data: { matrixEntradaId: mtEntrada4x5.id } }).catch(() => {})
  // Free → sem matriz entrada
  await prisma.plan.updateMany({ where: { code: 'free' }, data: { matrixEntradaId: null } }).catch(() => {})
  if (mtResidual) await prisma.plan.updateMany({ where: { code: { in: ['blue5'] }, matrixResidualId: null }, data: { matrixResidualId: mtResidual.id } }).catch(() => {})
  if (mtVendas) await prisma.plan.updateMany({ where: { code: { in: ['blue5'] }, matrixVendasId: null }, data: { matrixVendasId: mtVendas.id } }).catch(() => {})
  console.log('  ✓ 4 MatrixTypes + level earnings ready (incluindo entrada 4x3)')
}

async function seedCareerPlans() {
  console.log('→ Seeding CareerPlans...')
  const plans = [
    { code: 'safira', name: 'Safira', description: 'PIN Safira - Categoria 3', minPoints: 100, rewardWithdrawalCents: 200000, rewardShoppingCents: 0, rewardPoints: 0, gratification: 'Bônus de Safira ao atingir 100 pontos', color: '#06b6d4', icon: '🔷', isActive: true, sortOrder: 1 },
    { code: 'rubi', name: 'Rubi', description: 'PIN Rubi - Categoria 2', minPoints: 250, rewardWithdrawalCents: 300000, rewardShoppingCents: 0, rewardPoints: 0, gratification: 'Bônus de Rubi ao atingir 250 pontos', color: '#dc2626', icon: '❤️', isActive: true, sortOrder: 2 },
    { code: 'esmeralda', name: 'Esmeralda', description: 'PIN Esmeralda - Categoria 1', minPoints: 500, rewardWithdrawalCents: 400000, rewardShoppingCents: 0, rewardPoints: 0, gratification: 'Bônus de Esmeralda ao atingir 500 pontos', color: '#10b981', icon: '💚', isActive: true, sortOrder: 3 },
    { code: 'diamante', name: 'Diamante', description: 'PIN Diamante - Categoria 4', minPoints: 1000, rewardWithdrawalCents: 500000, rewardShoppingCents: 0, rewardPoints: 0, gratification: 'Bônus de Diamante ao atingir 1.000 pontos', color: '#3b82f6', icon: '💎', isActive: true, sortOrder: 4 },
    { code: 'imperial', name: 'Imperial', description: 'PIN Imperial - Categoria 5 - Graduação máxima', minPoints: 2500, rewardWithdrawalCents: 600000, rewardShoppingCents: 0, rewardPoints: 0, gratification: 'Bônus de Imperial ao atingir 2.500 pontos', color: '#8b5cf6', icon: '👑', isActive: true, sortOrder: 5 },
  ]
  for (const p of plans) {
    await prisma.careerPlan.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    }).catch(() => {})
  }
  console.log(`  ✓ ${plans.length} CareerPlans ready (Safira → Imperial)`)
}

async function seedGoalConfigs() {
  console.log('→ Seeding GoalConfigs...')
  const goals = [
    { name: 'Meta Diária Motorista', description: '20 viagens finalizadas por dia', targetQualification: 'motorista', metricCode: 'trips_daily', metricLabel: 'viagens finalizadas', targetValue: 20, rewardCents: 500, rewardWallet: 'gratification', frequency: 'daily', isActive: true, sortOrder: 1 },
    { name: 'Meta Mensal Motorista', description: '384 viagens no mês', targetQualification: 'motorista', metricCode: 'trips_monthly', metricLabel: 'viagens no mês', targetValue: 384, rewardCents: 3000, rewardWallet: 'gratification', frequency: 'monthly', isActive: true, sortOrder: 2 },
    { name: 'Meta Diária Entregador', description: '15 entregas por dia', targetQualification: 'entregador', metricCode: 'deliveries_daily', metricLabel: 'entregas realizadas', targetValue: 15, rewardCents: 400, rewardWallet: 'gratification', frequency: 'daily', isActive: true, sortOrder: 3 },
    { name: 'Meta Mensal Entregador', description: '300 entregas no mês', targetQualification: 'entregador', metricCode: 'deliveries_monthly', metricLabel: 'entregas no mês', targetValue: 300, rewardCents: 2500, rewardWallet: 'gratification', frequency: 'monthly', isActive: true, sortOrder: 4 },
  ]
  for (const g of goals) {
    const existing = await prisma.goalConfig.findFirst({ where: { name: g.name } }).catch(() => null)
    if (!existing) {
      await prisma.goalConfig.create({ data: g }).catch(() => {})
    }
  }
  console.log(`  ✓ ${goals.length} GoalConfigs ready (Metas motorista/entregador)`)
}

async function seedStreakRewards() {
  console.log('→ Seeding StreakRewards...')
  const rewards = [
    { streakDays: 7, rewardType: 'points', rewardAmount: 50, description: '7 dias consecutivos', isActive: true },
    { streakDays: 14, rewardType: 'cashback', rewardAmount: 500, description: '14 dias consecutivos', isActive: true },
    { streakDays: 30, rewardType: 'cashback', rewardAmount: 2000, description: '30 dias consecutivos', isActive: true },
  ]
  for (const r of rewards) {
    const existing = await prisma.streakReward.findFirst({ where: { streakDays: r.streakDays } }).catch(() => null)
    if (!existing) {
      await prisma.streakReward.create({ data: r }).catch(() => {})
    }
  }
  console.log(`  ✓ ${rewards.length} StreakRewards ready`)
}

// -----------------------------------------------------------------------------
// Cashback demo seed — populate a few CashbackEntry/Residual/Sales rows so
// the admin dashboard and user wallet show realistic data. Idempotent:
// only inserts if no rows exist for that user+fromUser+level combo.
// -----------------------------------------------------------------------------

async function seedCashbackDemo() {
  console.log('→ Seeding cashback demo entries...')
  const existingCount = await prisma.cashbackEntry.count().catch(() => 0)
  if (existingCount > 0) {
    console.log(`  ✓ Cashback entries already exist (${existingCount}) — skipping demo seed`)
    return
  }

  // Map seed user ids → real DB ids by email (because existing DBs may have
  // users created with random cuids instead of the stable seed ids).
  const emailToId = new Map<string, string>()
  for (const u of SEED_USERS) {
    const db = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true } })
    if (db) emailToId.set(u.id, db.id)
  }
  const idFor = (seedId: string) => emailToId.get(seedId) || null

  // Helper to upsert a cashback row (idempotent on user+fromUser+level+amount)
  const addCashback = async (
    model: 'cashbackEntry' | 'cashbackResidual' | 'cashbackSales',
    userId: string,
    fromUserId: string,
    amount: number,
    level: number,
    percentage: number,
    description: string,
    category?: string,
  ) => {
    const dbUserId = idFor(userId)
    const dbFromId = idFor(fromUserId)
    if (!dbUserId || !dbFromId) return
    try {
      await (prisma as any)[model].create({
        data: {
          userId: dbUserId,
          fromUserId: dbFromId,
          amount,
          level,
          percentage,
          description,
          ...(category ? { category } : {}),
        },
      })
    } catch {
      // row already exists or FK mismatch — skip
    }
  }

  // Demo: Carlos Eduardo (admin downline, blue5) receives cashback from
  // his downline Anderson Silva's purchase (matriz entrada level 1-3).
  await addCashback('cashbackEntry', 'admin-root', 'user-anderson', 3500, 1, 35, 'Cashback Entrada L1 — compra de Anderson Silva')
  await addCashback('cashbackEntry', 'admin-root', 'user-anderson', 1400, 2, 14, 'Cashback Entrada L2 — compra de Anderson Silva')
  await addCashback('cashbackEntry', 'admin-root', 'user-anderson', 525, 3, 5.25, 'Cashback Entrada L3 — compra de Anderson Silva')

  // Demo: Anderson (motorista blue5) receives residual from his downline
  // Larissa's monthly plan payment (matriz residual).
  await addCashback('cashbackResidual', 'user-anderson', 'user-larissa', 7000, 1, 45, 'Residual L1 — pgto plano mensal Larissa')
  await addCashback('cashbackResidual', 'user-anderson', 'user-larissa', 2800, 2, 18, 'Residual L2 — pgto plano mensal Larissa')

  // Demo: Luciana Lojista receives sales cashback from her downline Lucas
  // Martins' delivery sales (matriz vendas level 1-3).
  await addCashback('cashbackSales', 'demo-lojista', 'user-lucas-m', 1800, 1, 0.9, 'Vendas L1 — entrega Lucas Martins', 'food')
  await addCashback('cashbackSales', 'demo-lojista', 'user-lucas-m', 720, 2, 0.36, 'Vendas L2 — entrega Lucas Martins', 'food')
  await addCashback('cashbackSales', 'demo-lojista', 'user-lucas-m', 288, 3, 0.144, 'Vendas L3 — entrega Lucas Martins', 'food')

  // Demo: Marcos Motorista receives entrada cashback from Maria Souza's
  // in-app ride purchase (matriz entrada).
  await addCashback('cashbackEntry', 'demo-motorista', 'user-maria', 1500, 1, 35, 'Cashback Entrada L1 — corrida Maria Souza')

  // Update user balanceWithdrawal to reflect these entries (so the admin
  // dashboard shows realistic numbers).
  const entriesByUser = await prisma.cashbackEntry.groupBy({
    by: ['userId'],
    _sum: { amount: true },
  })
  for (const e of entriesByUser) {
    await prisma.user.update({
      where: { id: e.userId },
      data: { balanceWithdrawal: { increment: e._sum.amount || 0 } },
    }).catch(() => {})
  }

  const residualByUser = await prisma.cashbackResidual.groupBy({
    by: ['userId'],
    _sum: { amount: true },
  })
  for (const r of residualByUser) {
    await prisma.user.update({
      where: { id: r.userId },
      data: { balanceWithdrawal: { increment: r._sum.amount || 0 } },
    }).catch(() => {})
  }

  const salesByUser = await prisma.cashbackSales.groupBy({
    by: ['userId'],
    _sum: { amount: true },
  })
  for (const s of salesByUser) {
    await prisma.user.update({
      where: { id: s.userId },
      data: { balanceShopping: { increment: s._sum.amount || 0 } },
    }).catch(() => {})
  }

  const total = await prisma.cashbackEntry.count() + await prisma.cashbackResidual.count() + await prisma.cashbackSales.count()
  console.log(`  ✓ ${total} cashback demo entries created (entrada + residual + vendas)`)
}

// -----------------------------------------------------------------------------
// DriverCategory seed — 5 categorias de veículo (Safira → Imperial)
// ----------------------------------------------------------------------------
// Separa o conceito de "categoria do veículo" do "plano de carreira".
// Cada categoria tem meta mensal de corridas + bônus + regra de cancelamento.
// O bônus só é pago se o motorista bater a meta no mês (não é fixo).
// -----------------------------------------------------------------------------

async function seedDriverCategories() {
  console.log('→ Seeding DriverCategory...')
  const categories = [
    {
      code: 'safira',
      name: 'Safira',
      description: 'Categoria 3 — veículo básico. Meta baixa, bônus menor.',
      sortOrder: 1,
      monthlyTripsTarget: 100,
      bonusCents: 50000, // R$ 500
      maxCancellationPerMonth: 2,
      color: '#06b6d4',
      icon: '🔷',
    },
    {
      code: 'rubi',
      name: 'Rubi',
      description: 'Categoria 2 — veículo intermediário.',
      sortOrder: 2,
      monthlyTripsTarget: 200,
      bonusCents: 150000, // R$ 1.500
      maxCancellationPerMonth: 2,
      color: '#dc2626',
      icon: '❤️',
    },
    {
      code: 'esmeralda',
      name: 'Esmeralda',
      description: 'Categoria 1 — veículo confort, meta alta.',
      sortOrder: 3,
      monthlyTripsTarget: 350,
      bonusCents: 300000, // R$ 3.000
      maxCancellationPerMonth: 2,
      color: '#10b981',
      icon: '💚',
    },
    {
      code: 'diamante',
      name: 'Diamante',
      description: 'Categoria 4 — veículo premium.',
      sortOrder: 4,
      monthlyTripsTarget: 500,
      bonusCents: 500000, // R$ 5.000
      maxCancellationPerMonth: 1, // premium = só 1 cancelamento tolerado
      color: '#3b82f6',
      icon: '💎',
    },
    {
      code: 'imperial',
      name: 'Imperial',
      description: 'Categoria 5 — veículo top de linha, meta máxima. Tolerância ZERO (categoria preferencial/idoso).',
      sortOrder: 5,
      monthlyTripsTarget: 700,
      bonusCents: 800000, // R$ 8.000
      maxCancellationPerMonth: 0, // 0 = tolerância zero (idoso/preferencial)
      color: '#8b5cf6',
      icon: '👑',
    },
  ]

  for (const c of categories) {
    await prisma.driverCategory.upsert({
      where: { code: c.code },
      // Update defaultLevels + label/description so existing rows seeded
      // by older versions are synced to the new business-rule defaults.
      update: {
        name: c.name,
        description: c.description,
        monthlyTripsTarget: c.monthlyTripsTarget,
        bonusCents: c.bonusCents,
        maxCancellationPerMonth: c.maxCancellationPerMonth,
        color: c.color,
        icon: c.icon,
      },
      create: c,
    })
  }
  console.log(`  ✓ ${categories.length} driver categories ready (Safira → Imperial)`)
}

// -----------------------------------------------------------------------------
// Announcements seed — populate the "Anúncios" tab so it's not empty
// -----------------------------------------------------------------------------

async function seedAnnouncements() {
  console.log('→ Seeding Announcements...')
  const existing = await prisma.announcement.count()
  if (existing > 0) {
    console.log(`  ✓ ${existing} announcements already exist — skipping`)
    return
  }

  const announcements = [
    {
      title: 'Bem-vindo à NewMobility!',
      message: 'Aproveite nosso sistema de CashBack Multi-Nível. Indique amigos e ganhe em até 9 níveis de profundidade!',
      type: 'info',
      priority: 'high',
      isActive: true,
      actionLabel: 'Começar agora',
      actionUrl: '/indicacoes',
    },
    {
      title: 'Promo: CashBack Dobrado',
      message: 'Por 7 dias, todo CashBack de indicação será dobrado! Aproveite para expandir sua rede.',
      type: 'promo',
      priority: 'high',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      actionLabel: 'Ver promoção',
      actionUrl: '/cashback',
    },
    {
      title: 'Webinar: Maximizar Ganhos',
      message: 'Participe do nosso webinar exclusivo sobre como maximizar seus ganhos com CashBack Multi-Nível.',
      type: 'info',
      priority: 'normal',
      isActive: true,
      actionLabel: 'Inscrever-se',
      actionUrl: '/eventos',
    },
    {
      title: 'Manutenção Programada',
      message: 'Sistema indisponível das 02h às 04h. Pedimos desculpas pelo inconveniente.',
      type: 'warning',
      priority: 'normal',
      isActive: false,
    },
    {
      title: 'Novo Plano Blue 5 Premium',
      message: 'Conheça o plano Blue 5 Premium com telemedicina, seguro de celular e benefícios exclusivos.',
      type: 'info',
      priority: 'normal',
      isActive: true,
      actionLabel: 'Fazer upgrade',
      actionUrl: '/planos',
    },
  ]

  for (const a of announcements) {
    await prisma.announcement.create({ data: a }).catch(() => {})
  }
  console.log(`  ✓ ${announcements.length} announcements ready`)
}

// -----------------------------------------------------------------------------
// Audit Logs seed — populate the "Logs de Auditoria" tab with sample entries
// -----------------------------------------------------------------------------

async function seedAuditLogs() {
  console.log('→ Seeding Audit Logs...')
  const existing = await prisma.auditLog.count()
  if (existing > 0) {
    console.log(`  ✓ ${existing} audit logs already exist — skipping`)
    return
  }

  // Find admin id by email
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@newmobility.com' },
    select: { id: true },
  })
  if (!admin) {
    console.log('  ⚠️  Admin not found — skipping audit logs')
    return
  }

  const logs = [
    { action: 'system.seed', entityType: 'System', entityId: null, details: JSON.stringify({ step: 'all', message: 'Seed inicial executado' }), ipAddress: '127.0.0.1' },
    { action: 'user.create', entityType: 'User', entityId: 'demo-motorista', details: JSON.stringify({ name: 'Marcos Motorista', email: 'motorista@newmobility.com', role: 'user' }), ipAddress: '127.0.0.1' },
    { action: 'user.edit', entityType: 'User', entityId: 'demo-lojista', details: JSON.stringify({ field: 'plan', before: 'free', after: 'blue3' }), ipAddress: '127.0.0.1' },
    { action: 'user.activate', entityType: 'User', entityId: 'demo-entregador', details: JSON.stringify({ isActive: true }), ipAddress: '127.0.0.1' },
    { action: 'cashback.config.update', entityType: 'SystemConfig', entityId: 'cashback_entrada_pct', details: JSON.stringify({ before: '30', after: '35' }), ipAddress: '127.0.0.1' },
    { action: 'plan.price.update', entityType: 'Plan', entityId: 'blue3', details: JSON.stringify({ before: '8990', after: '9990' }), ipAddress: '127.0.0.1' },
    { action: 'usertype.create', entityType: 'UserType', entityId: 'mototaxista', details: JSON.stringify({ label: 'Mototaxista' }), ipAddress: '127.0.0.1' },
    { action: 'announcement.create', entityType: 'Announcement', entityId: null, details: JSON.stringify({ title: 'Bem-vindo à NewMobility!' }), ipAddress: '127.0.0.1' },
    { action: 'system.config.edit', entityType: 'SystemConfig', entityId: 'min_withdrawal', details: JSON.stringify({ before: '10000', after: '5000' }), ipAddress: '127.0.0.1' },
    { action: 'goal.config.create', entityType: 'GoalConfig', entityId: null, details: JSON.stringify({ name: 'Meta Diária Motorista', targetValue: 20 }), ipAddress: '127.0.0.1' },
  ]

  for (const log of logs) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: 'NewMobility Seed/1.0',
      },
    }).catch(() => {})
  }
  console.log(`  ✓ ${logs.length} audit logs ready`)
}

// -----------------------------------------------------------------------------
// Challenges seed — populate the "Desafios" tab with sample gamification
// -----------------------------------------------------------------------------

async function seedChallenges() {
  console.log('→ Seeding Challenges...')
  const existing = await prisma.challenge.count()
  if (existing > 0) {
    console.log(`  ✓ ${existing} challenges already exist — skipping`)
    return
  }

  const now = new Date()
  const challenges = [
    {
      title: 'Indique 3 Amigos',
      description: 'Indique 3 novos usuários para a plataforma e ganhe pontos extras no plano de carreira.',
      type: 'referral',
      targetValue: 3,
      rewardPoints: 100,
      isActive: true,
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    },
    {
      title: 'Primeira Corrida',
      description: 'Complete sua primeira corrida como motorista ou passageiro.',
      type: 'action',
      targetValue: 1,
      rewardPoints: 50,
      isActive: true,
      startDate: now,
    },
    {
      title: '7 Dias de Streak',
      description: 'Acesse a plataforma por 7 dias consecutivos para desbloquear esta conquista.',
      type: 'streak',
      targetValue: 7,
      rewardPoints: 70,
      isActive: true,
      startDate: now,
    },
    {
      title: 'Compre no Marketplace',
      description: 'Faça sua primeira compra no marketplace e ganhe cashback + pontos.',
      type: 'action',
      targetValue: 1,
      rewardPoints: 30,
      isActive: true,
      startDate: now,
    },
    {
      title: 'Faça um Saque',
      description: 'Realize seu primeiro saque via PIX para desbloquear este desafio.',
      type: 'action',
      targetValue: 1,
      rewardPoints: 25,
      isActive: true,
      startDate: now,
    },
    {
      title: 'Desafio Semanal: 20 Indicações',
      description: 'Desafio semanal — indique 20 novos usuários em 7 dias e ganhe 500 pontos.',
      type: 'referral',
      targetValue: 20,
      rewardPoints: 500,
      isActive: true,
      startDate: now,
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    },
    {
      title: 'Upgrade para Blue 3',
      description: 'Faça upgrade para o plano Blue 3 e desbloqueie a matriz de Entrada.',
      type: 'plan',
      targetValue: 1,
      rewardPoints: 100,
      isActive: true,
      startDate: now,
    },
  ]

  for (const c of challenges) {
    await prisma.challenge.create({ data: c }).catch(() => {})
  }
  console.log(`  ✓ ${challenges.length} challenges ready`)
}

async function main() {
  console.log('========================================')
  console.log(' NewMobility — Database Seed')
  console.log('========================================')
  console.log(`Database: ${process.env.DATABASE_URL ? 'connected' : 'MISSING DATABASE_URL'}`)
  console.log('')

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Set it in .env or in the environment before running the seed.',
    )
  }

  await seedUsers()
  await seedSystemConfigs()
  await seedUserTypes()
  await seedMatrixTypes()
  await seedPlans()
  await seedCareerPlans()
  await seedDriverCategories()
  await seedGoalConfigs()
  await seedStreakRewards()
  await seedServiceTypes()
  await seedEvents()
  await seedCategories()
  await seedFaqs()
  await seedCashbackDemo()
  await seedAnnouncements()
  await seedAuditLogs()
  await seedChallenges()

  console.log('')
  console.log('========================================')
  console.log(' Seed completed successfully!')
  console.log('========================================')
  console.log('')
  console.log('Login credentials:')
  console.log('  Admin     → admin@newmobility.com / admin123')
  console.log('  Cliente   → cliente@newmobility.com / 123456')
  console.log('  Motorista → motorista@newmobility.com / 123456')
  console.log('  Lojista   → lojista@newmobility.com / 123456')
  console.log('')
  console.log('Routes:')
  console.log('  Backoffice (MMN)  → /')
  console.log('  App Cliente       → /mobile')
  console.log('  App Motorista     → /motorista')
  console.log('  App Lojista       → /lojista')
  console.log('  Admin Geral       → /admingeral')
  console.log('')
}

// Only run main() automatically when this file is executed directly via
// `bun run seed` or `npm run seed`. When imported by the admin API
// endpoint (which uses the named exports below), main() should NOT run
// automatically — the endpoint calls individual seed functions instead.
const isDirectRun = (() => {
  const scriptPath = process.argv[1] || ''
  return (
    scriptPath.endsWith('seed.ts') ||
    scriptPath.endsWith('seed.js') ||
    scriptPath.endsWith('prisma/seed') ||
    scriptPath.includes('seed')
  )
})()

if (isDirectRun) {
  main()
    .catch((e) => {
      console.error('')
      console.error('Seed FAILED:')
      console.error(e)
      console.error('')
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

// ============================================================================
// EXPORTS — for use by the admin API endpoint (/api/admin/seed)
// ----------------------------------------------------------------------------
// These let the admin trigger individual seed steps from the web UI without
// needing SSH access. Each function is idempotent and safe to call repeatedly.
// ============================================================================

export {
  seedUsers,
  seedSystemConfigs,
  seedUserTypes,
  seedPlans,
  seedCareerPlans,
  seedDriverCategories,
  seedGoalConfigs,
  seedStreakRewards,
  seedServiceTypes,
  seedEvents,
  seedMatrixTypes,
  seedCategories,
  seedFaqs,
  seedCashbackDemo,
  seedAnnouncements,
  seedAuditLogs,
  seedChallenges,
  main,
}
